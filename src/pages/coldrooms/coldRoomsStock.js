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
// Products go in and out ONLY from the cooler QR page (applyStockMove); the
// 3D screen just shows them. A move re-reads the record and replaces only
// its own room.
//
// The code is ours: typing a known code fills the product and its unit from
// the items catalogue (public/data/items.json).

import API_BASE from "../../config/api";

export const STOCK_TYPE = "cold_rooms_stock";
const STOCK_KEY = "stock";

const toNum = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
};

/* A lot added from the QR page also carries supplier · production date ·
   expiry date (yyyy-mm-dd) and, when known, the number of pieces. Rows from
   the Excel import / 3D editor simply have none of them. */
const LOT_FIELDS = ["supplier", "prodDate", "expDate"];

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
  if (raw?.pcs !== "" && raw?.pcs != null && toNum(raw.pcs) > 0) it.pcs = toNum(raw.pcs);
  return it;
}

/** Same product AND same lot (supplier + both dates). */
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
  if (!res.ok) throw new Error(`Stock read failed (${res.status})`);
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

async function writeRooms(rooms, user) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "cold-rooms-stock", type: STOCK_TYPE, payload: { reportDate: STOCK_KEY, rooms } }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
}

/* ══════════════════════════════════════ Goods in / out (QR page)
   The stock key of a QR unit: the cold room linked to it (same index the 3D
   screen uses), else its own key "unit:<branch>:<unit>" in the same record. */

const MOVES_KEPT = 200;

export async function stockKeyForUnit(branch, unit) {
  try {
    const { fetchRooms, loadCache } = await import("./coldRoomsConfig");
    const rooms = (await fetchRooms())?.rooms || loadCache() || [];
    const i = rooms.findIndex((r) => r?.link && r.link.branch === branch && r.link.key === unit);
    if (i >= 0) return { key: String(i), room: i, name: rooms[i].name };
  } catch { /* no rooms config — the unit keeps its own list */ }
  return { key: `unit:${branch}:${unit}`, room: null, name: "" };
}

/** One room/unit's { items, moves, updatedAt, updatedBy } — fresh from the server. */
export async function fetchUnitStock(key, signal) {
  const rooms = await readRecord(signal);
  const r = rooms[key] || {};
  return { ...r, items: normalizeList(r.items), moves: Array.isArray(r.moves) ? r.moves : [] };
}

/**
 * Goods in (dir "in") or out (dir "out") of one room/unit, applied to the
 * list as it is on the server now. In adds to the row of the same lot (same
 * code + supplier + production + expiry) or opens a new row; out takes off
 * the row of that lot and drops it at zero. pcs (pieces) is optional on both.
 */
export async function applyStockMove(key, { dir, code, product, uom, qty, supplier, prodDate, expDate, pcs, ...extra }, user = "") {
  const amount = toNum(qty);
  if (!(amount > 0)) throw new Error("QTY");
  const pieces = toNum(pcs) > 0 ? toNum(pcs) : 0;
  const rooms = await readRecord();
  const cur = rooms[key] || {};
  const items = normalizeList(cur.items);
  const lot = normalizeItem({ code, product, uom, qty: amount, supplier, prodDate, expDate, pcs: pieces });
  const at = items.findIndex((it) => sameLot(it, lot));
  const name = lot.product || items[at]?.product || "";
  const unitOf = lot.uom || items[at]?.uom || "";
  const round = (n) => Math.round(n * 1000) / 1000;
  if (dir === "out") {
    if (at < 0) throw new Error("NOT_HERE");
    if (amount > items[at].qty + 1e-9) throw new Error("TOO_MUCH");
    const left = round(items[at].qty - amount);
    if (left <= 0) items.splice(at, 1);
    else {
      const row = { ...items[at], qty: left };
      if (row.pcs && pieces) row.pcs = Math.max(0, row.pcs - pieces);
      if (!row.pcs) delete row.pcs;
      items[at] = row;
    }
  } else if (at >= 0) {
    const row = { ...items[at], qty: round(items[at].qty + amount) };
    if (pieces) row.pcs = (row.pcs || 0) + pieces;
    items[at] = row;
  } else {
    items.unshift(lot);
  }
  const now = new Date().toISOString();
  // extra: keeper = storekeeper's name; goods out: destType customer|branch, destination
  const move = {
    ...extra, at: now, by: user || "", dir: dir === "out" ? "out" : "in",
    code: lot.code, product: name, uom: unitOf, qty: amount,
    ...(lot.supplier ? { supplier: lot.supplier } : {}),
    ...(lot.prodDate ? { prodDate: lot.prodDate } : {}),
    ...(lot.expDate ? { expDate: lot.expDate } : {}),
    ...(pieces ? { pcs: pieces } : {}),
  };
  const moves = [...(Array.isArray(cur.moves) ? cur.moves : []), move].slice(-MOVES_KEPT);
  const next = { ...rooms, [key]: { ...cur, items, moves, updatedAt: now, updatedBy: user || "" } };
  await writeRooms(next, user);
  return { ...next[key], items: normalizeList(items), moves };
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
