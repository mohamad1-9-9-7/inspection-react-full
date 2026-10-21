// src/pages/coldrooms/coldRoomsStock.js
//
// 📦 What is inside each cold room — the same four columns as the stock
// export the user works from:
//   code · Product · Unit of Measure · Available Quantity
//
// One record on the server for all eight rooms (separate from the rooms'
// config, so editing a room's limits never touches its stock):
//   type = cold_rooms_stock , payload.reportDate = "stock"
//   payload.rooms = { "7": { items: [{ code, product, uom, qty }], updatedAt, updatedBy } }
// Products go in and out ONLY from the cooler QR page, through the locked
// server route POST /api/reports/cold-rooms-stock/move (applyStockMove);
// the 3D screen just shows them. Full history: cold_rooms_moves, one record
// per month.
//
// The code is ours: typing a known code fills the product and its unit from
// the items catalogue (public/data/items.json).

import API_BASE from "../../config/api";
import { STOCK_MOVE_KIND, newOutboxId, postStockMove } from "../../utils/reportOutbox";
import { enqueue, isTransient } from "../../utils/offlineOutbox";

export const STOCK_TYPE = "cold_rooms_stock";
const STOCK_KEY = "stock";

const toNum = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

/* A lot added from the QR page also carries supplier · production date ·
   expiry date (yyyy-mm-dd) · batch (from the carton barcode when scanned)
   and, when known, the number of pieces and the carton's GTIN. Older rows
   simply have none of them. */
const LOT_FIELDS = ["supplier", "prodDate", "expDate", "batch"];

/* What one counted "piece" is — a box, a plate, a tray… Empty = a single
   piece. The server keeps the same list (PCS_UNITS in reportRoutes.cjs). */
export const PCS_UNITS = [
  { k: "piece", en: ["piece", "pieces"], ar: "حبة" },
  { k: "box", en: ["box", "boxes"], ar: "بوكس" },
  { k: "carton", en: ["carton", "cartons"], ar: "كرتونة" },
  { k: "plate", en: ["plate", "plates"], ar: "صحن" },
  { k: "tray", en: ["tray", "trays"], ar: "صينية" },
  { k: "bag", en: ["bag", "bags"], ar: "كيس" },
  { k: "pack", en: ["pack", "packs"], ar: "باكيت" },
  { k: "head", en: ["head", "heads"], ar: "رأس" },
];
/** Unit name for a count: "12 boxes" / "12 بوكس" (no unit = pieces). */
export const pcsUnitLabel = (unit, n, ar) => {
  const u = PCS_UNITS.find((x) => x.k === unit) || PCS_UNITS[0];
  return ar ? u.ar : u.en[Number(n) === 1 ? 0 : 1];
};
export const pcsText = (n, unit, ar) => `${Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 3 })} ${pcsUnitLabel(unit, n, ar)}`;

export function normalizeItem(raw) {
  const it = {
    code: String(raw?.code ?? "").trim(),
    product: String(raw?.product ?? "").trim(),
    uom: String(raw?.uom ?? "").trim(),
    qty: toNum(raw?.qty),
  };
  LOT_FIELDS.forEach((k) => {
    const v = String(raw?.[k] ?? "").trim();
    if (v) it[k] = v;
  });
  if (raw?.pcs !== "" && raw?.pcs != null && toNum(raw.pcs) > 0) {
    it.pcs = toNum(raw.pcs);
    if (PCS_UNITS.some((u) => u.k === raw.pcsUnit)) it.pcsUnit = raw.pcsUnit;
  }
  const gtin = String(raw?.gtin ?? "").replace(/[^0-9]/g, "");
  if (gtin.length === 14) it.gtin = gtin; // the carton barcode, information only
  return it;
}

/** Same product AND same lot (supplier + both dates + batch). */
export const sameLot = (a, b) =>
  (a.code ? a.code === b.code : a.product === b.product) &&
  LOT_FIELDS.every((k) => String(a[k] || "") === String(b[k] || ""));

const normalizeList = (list) =>
  (Array.isArray(list) ? list : []).map(normalizeItem).filter((it) => it.code || it.product);

/* ══════════════════════════════════════ Server */

async function readRecord(signal) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(STOCK_TYPE)}&limit=5`, {
    cache: "no-store", signal, headers: { Accept: "application/json" },
  });
  if (!res.ok) { const e = new Error(`Stock read failed (${res.status})`); e.status = res.status; throw e; }
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
  const row = rows.find((r) => String(r?.payload?.reportDate || "") === STOCK_KEY) || rows[0] || null;
  return row?.payload?.rooms && typeof row.payload.rooms === "object" ? row.payload.rooms : {};
}

/** { [roomIndex]: { items, updatedAt, updatedBy } } — {} when nothing saved. */
export async function fetchStock(signal) {
  try {
    const rooms = await readRecord(signal);
    const out = {};
    Object.keys(rooms).forEach((k) => {
      out[k] = { ...rooms[k], items: normalizeList(rooms[k]?.items) };
    });
    return out;
  } catch {
    return {};
  }
}

/* ══════════════════════════════════════ Products in / out (QR page)
   The stock key of a QR unit: the cold room linked to it (same index the 3D
   screen uses), else its own key "unit:<branch>:<unit>" in the same record.
   Moves go through POST /api/reports/cold-rooms-stock/move — the server
   applies them under a row lock and keeps the month's full log. With no
   connection a move waits on the phone (offline outbox) and the screen
   shows the list as it will be once it is sent. */

const MOVES_KEPT = 200;
const CACHE_PREFIX = "cold_rooms_stock_cache_v1:";

export async function stockKeyForUnit(branch, unit) {
  try {
    const { fetchRooms, loadCache } = await import("./coldRoomsConfig");
    const rooms = (await fetchRooms())?.rooms || loadCache() || [];
    const i = rooms.findIndex((r) => r?.link && r.link.branch === branch && r.link.key === unit);
    if (i >= 0) return { key: String(i), room: i, name: rooms[i].name };
  } catch { /* no rooms config — the unit keeps its own list */ }
  return { key: `unit:${branch}:${unit}`, room: null, name: "" };
}

const shapeRoom = (r) => ({ ...(r || {}), items: normalizeList(r?.items), moves: Array.isArray(r?.moves) ? r.moves : [] });
// first-paint / no-connection copy only — the server record is the truth
const readCache = (key) => { try { const v = localStorage.getItem(CACHE_PREFIX + key); return v ? shapeRoom(JSON.parse(v)) : null; } catch { return null; } };
const writeCache = (key, room) => { try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(room)); } catch { /* cache only */ } };

/** One room/unit's { items, moves, updatedAt, updatedBy, offline? } — fresh
    from the server, or the copy kept on this phone when there is no connection. */
export async function fetchUnitStock(key, signal) {
  try {
    const room = shapeRoom((await readRecord(signal))[key]);
    writeCache(key, room);
    return room;
  } catch (e) {
    const kept = readCache(key);
    if (kept && isTransient(e)) return { ...kept, offline: true };
    throw e;
  }
}

/* The same rules as the server, for the screen while a move waits offline. */
function applyLocal(room, move) {
  const items = normalizeList(room?.items);
  const lot = normalizeItem(move);
  const at = items.findIndex((it) => sameLot(it, lot));
  const round = (n) => Math.round(n * 1000) / 1000;
  if (move.dir === "out") {
    if (at >= 0) {
      const left = round(items[at].qty - lot.qty);
      if (left <= 0) items.splice(at, 1);
      else {
        const r = { ...items[at], qty: left };
        if (r.pcs && move.pcs > 0) r.pcs = Math.max(0, r.pcs - move.pcs);
        if (!r.pcs) { delete r.pcs; delete r.pcsUnit; }
        items[at] = r;
      }
    }
  } else if (at >= 0) {
    const r = { ...items[at], qty: round(items[at].qty + lot.qty) };
    if (move.pcs > 0) {
      if (move.pcsUnit && (!r.pcs || !r.pcsUnit)) r.pcsUnit = move.pcsUnit;
      r.pcs = (r.pcs || 0) + move.pcs;
    }
    items[at] = r;
  } else {
    items.unshift(lot);
  }
  const m = { ...move, product: lot.product || (at >= 0 ? room.items?.[at]?.product : "") || "", pending: true };
  return { ...room, items, moves: [...(room?.moves || []), m].slice(-MOVES_KEPT), updatedAt: move.at };
}

/**
 * One product in (dir "in") or out (dir "out") of a room/unit.
 * move = { dir, code, product, uom, qty, pcs?, pcsUnit?, supplier?, prodDate?, expDate?,
 *          keeper, destType?, destination? }; `current` = the room as shown.
 * Returns { queued, room }. Throws err.code TOO_MUCH / NOT_HERE (409) and
 * the server's message for a refused move.
 */
export async function applyStockMove(key, move, current, user = "") {
  const body = {
    ...move,
    key,
    qty: toNum(move.qty),
    pcs: toNum(move.pcs) > 0 ? toNum(move.pcs) : 0,
    moveId: newOutboxId(),
    at: new Date().toISOString(),
    by: user || "",
  };
  if (!(body.qty > 0)) throw new Error("QTY");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const json = await postStockMove(body, ctrl.signal);
    const room = shapeRoom(json.room);
    writeCache(key, room);
    return { queued: false, room };
  } catch (err) {
    if (!isTransient(err)) throw err;
    await enqueue(STOCK_MOVE_KIND, body.moveId, body, `Cold room ${body.dir} ${body.product || body.code}`);
    const room = applyLocal(current, body);
    writeCache(key, room);
    return { queued: true, room };
  } finally {
    clearTimeout(t);
  }
}

/* ══════════════════════════════════════ Items catalogue */

let catalogPromise = null;
/** Map code → { product, uom } from public/data/items.json (loaded once). */
export function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch("/data/items.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        const map = new Map();
        (Array.isArray(list) ? list : []).forEach((it) => {
          const code = String(it?.item_code ?? "").trim();
          if (code) map.set(code, { product: String(it.description || "").trim(), uom: String(it.uom || "").trim() });
        });
        return map;
      })
      .catch(() => new Map());
  }
  return catalogPromise;
}

export const totalQty = (items) => (items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
