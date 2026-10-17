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
// A save re-reads the record and replaces only its own room.
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

export function normalizeItem(raw) {
  return {
    code: String(raw?.code ?? "").trim(),
    product: String(raw?.product ?? "").trim(),
    uom: String(raw?.uom ?? "").trim(),
    qty: toNum(raw?.qty),
  };
}

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

/** Saves one room's list; the other rooms are re-read so they are kept as they are. */
export async function saveRoomStock(index, items, user = "") {
  const rooms = await readRecord();
  const next = {
    ...rooms,
    // keep the room's movement log (QR page in/out) when the list is edited
    [String(index)]: { ...(rooms[String(index)] || {}), items: normalizeList(items), updatedAt: new Date().toISOString(), updatedBy: user || "" },
  };
  await writeRooms(next, user);
  return next[String(index)];
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
 * list as it is on the server now: in adds to the same code (or a new row),
 * out takes off the available quantity and drops the row at zero.
 */
export async function applyStockMove(key, { dir, code, product, uom, qty, ...extra }, user = "") {
  const amount = toNum(qty);
  if (!(amount > 0)) throw new Error("QTY");
  const rooms = await readRecord();
  const cur = rooms[key] || {};
  const items = normalizeList(cur.items);
  const c = String(code || "").trim();
  const p = String(product || "").trim();
  const at = items.findIndex((it) => (c ? it.code === c : it.product === p));
  const name = p || items[at]?.product || "";
  const unitOf = uom || items[at]?.uom || "";
  if (dir === "out") {
    if (at < 0) throw new Error("NOT_HERE");
    if (amount > items[at].qty + 1e-9) throw new Error("TOO_MUCH");
    const left = Math.round((items[at].qty - amount) * 1000) / 1000;
    if (left <= 0) items.splice(at, 1);
    else items[at] = { ...items[at], qty: left };
  } else if (at >= 0) {
    items[at] = { ...items[at], qty: Math.round((items[at].qty + amount) * 1000) / 1000 };
  } else {
    items.unshift(normalizeItem({ code: c, product: p, uom, qty: amount }));
  }
  const now = new Date().toISOString();
  // extra (goods out): keeper = storekeeper's name, destType customer|branch, destination
  const move = { ...extra, at: now, by: user || "", dir: dir === "out" ? "out" : "in", code: c, product: name, uom: unitOf, qty: amount };
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

/* ══════════════════════════════════════ Excel / CSV import */

const HEADS = {
  code: [/^code$/, /^item ?code$/, /^internal reference$/, /^الكود$/, /^كود$/],
  product: [/^product$/, /^product name$/, /^name$/, /^description$/, /^المنتج$/, /^الصنف$/],
  uom: [/^unit of measure$/, /^uom$/, /^unit$/, /^وحدة القياس$/, /^الوحدة$/],
  qty: [/^available quantity$/, /^quantity$/, /^qty$/, /^on hand$/, /^الكمية المتوفرة$/, /^الكمية$/],
};
const headKey = (cell) => {
  const h = String(cell ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return Object.keys(HEADS).find((k) => HEADS[k].some((re) => re.test(h))) || null;
};

/**
 * Reads the first sheet of an .xlsx / .xls / .csv file laid out like the
 * stock export: a header row with code · Product · Unit of Measure ·
 * Available Quantity (the header may sit below a title). Returns the items.
 */
export async function parseStockFile(file) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true });
  let headRow = -1;
  let cols = null;
  for (let r = 0; r < Math.min(matrix.length, 30); r += 1) {
    const map = {};
    (matrix[r] || []).forEach((cell, c) => {
      const k = headKey(cell);
      if (k && map[k] == null) map[k] = c;
    });
    if (map.code != null && map.product != null) { headRow = r; cols = map; break; }
  }
  if (headRow < 0) throw new Error("NO_HEADER");
  return matrix.slice(headRow + 1)
    .map((row) => normalizeItem({
      code: row[cols.code],
      product: row[cols.product],
      uom: cols.uom != null ? row[cols.uom] : "",
      qty: cols.qty != null ? row[cols.qty] : 0,
    }))
    .filter((it) => it.code || it.product);
}

/** Imported rows over the current list: same code → replaced, new code → added. */
export function mergeItems(current, incoming) {
  const out = current.map((it) => ({ ...it }));
  const at = new Map(out.map((it, i) => [it.code, i]));
  incoming.forEach((it) => {
    if (it.code && at.has(it.code)) out[at.get(it.code)] = { ...it };
    else { at.set(it.code, out.length); out.push({ ...it }); }
  });
  return out;
}

export const totalQty = (items) => (items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0);
