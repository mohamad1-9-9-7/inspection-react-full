// src/pages/coldrooms/coldRoomsConfig.js
//
// 🧊 Cold Rooms 3D — the eight rooms of the 3D screen (four facing four).
//
// Each room has a kind (chiller / dry store / freezer / general store), the
// allowed temperature band the user sets, and an optional link to one unit of
// a temperature log (QCS slot "cooler-0..7" or a POS sheet row name). Through
// that link the screen shows the unit's latest reading of today and the
// calibration in force for it (calibrationLink.js — same matching as the
// sheets and the QR page).
//
// One config record on the server, same shape as qcs_coolers_config:
//   type = cold_rooms_config , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate). localStorage is a
// first-paint cache only.

import API_BASE from "../../config/api";
import { CALIB_LOGS, QCS_BRANCH } from "../haccp and iso/Calibration/calibrationLink";

export const COLD_ROOMS_TYPE = "cold_rooms_config";
const CONFIG_KEY = "config";
const CACHE_KEY = "cold_rooms_config_cache_v1";
export const ROOM_COUNT = 8;

/* The four kinds the user picks from. min/max = starting band only. */
export const ROOM_KINDS = [
  { key: "chiller", en: "Chiller", ar: "مبرد", emoji: "🧊", color: "#2563eb", min: 0, max: 5, warn: 1 },
  { key: "freezer", en: "Freezer", ar: "مجمد", emoji: "❄️", color: "#0891b2", min: -25, max: -18, warn: 1 },
  { key: "dry", en: "Dry Store", ar: "تخزين جاف", emoji: "📦", color: "#b45309", min: 15, max: 25, warn: 2 },
  { key: "store", en: "General Store", ar: "ستور عادي", emoji: "🏬", color: "#64748b", min: 10, max: 30, warn: 2 },
];
const KIND = new Map(ROOM_KINDS.map((k) => [k.key, k]));
export const kindOf = (key) => KIND.get(key) || KIND.get("chiller");

/* QCS storage type → room kind, used once to seed the rooms from QCS. */
const FROM_QCS = { chilled: "chiller", frozen: "freezer", dry: "dry", production: "chiller", ambient: "store" };

const num = (v, d) => {
  const n = Number(v);
  return v !== "" && v != null && Number.isFinite(n) ? n : d;
};

export function normalizeRoom(raw, i) {
  const k = kindOf(raw?.kind);
  const min = num(raw?.min, k.min);
  const max = num(raw?.max, k.max);
  const link = raw?.link && raw.link.branch && raw.link.key
    ? { branch: String(raw.link.branch), key: String(raw.link.key), label: String(raw.link.label || raw.link.key) }
    : null;
  return {
    name: String(raw?.name ?? "").trim() || `Room ${i + 1}`,
    kind: k.key,
    min: Math.min(min, max),
    max: Math.max(min, max),
    link,
  };
}

export const normalizeRooms = (list) =>
  Array.from({ length: ROOM_COUNT }, (_, i) => normalizeRoom(Array.isArray(list) ? list[i] : null, i));

/** First run: the eight QCS units, with their names, kinds and limits. */
export async function seedFromQcs() {
  let defs = null;
  try {
    const m = await import("../monitor/branches/qcs/coolerDefs");
    const cfg = (await m.fetchCoolerConfig()) || m.loadDefsCache();
    defs = cfg ? cfg.coolerDefs : m.makeDefaultCoolerDefs();
  } catch {
    defs = null;
  }
  return normalizeRooms(
    Array.from({ length: ROOM_COUNT }, (_, i) => {
      const d = defs?.[i];
      return {
        name: d?.label || `Room ${i + 1}`,
        // Room 8 is the freezer whatever the QCS sheet calls it.
        kind: i === 7 ? "freezer" : FROM_QCS[d?.type] || "chiller",
        min: i === 7 && d?.type !== "frozen" ? undefined : d?.min,
        max: i === 7 && d?.type !== "frozen" ? undefined : d?.max,
        link: { branch: QCS_BRANCH, key: `cooler-${i}`, label: d?.label || `Cooler ${i + 1}` },
      };
    })
  );
}

export function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? normalizeRooms(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
function saveCache(rooms) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(rooms)); } catch { /* cache only */ }
}

/** { rooms, meta } from the server, or null when none saved / unreachable. */
export async function fetchRooms(signal) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(COLD_ROOMS_TYPE)}&limit=5`, {
      cache: "no-store", signal, headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row = rows.find((r) => String(r?.payload?.reportDate || "") === CONFIG_KEY) || rows[0] || null;
    if (!row?.payload?.rooms) return null;
    const rooms = normalizeRooms(row.payload.rooms);
    saveCache(rooms);
    return { rooms, meta: { updatedAt: row.payload.updatedAt || "", updatedBy: row.payload.updatedBy || "" } };
  } catch {
    return null;
  }
}

export async function saveRooms(rooms, user = "") {
  const clean = normalizeRooms(rooms);
  const body = {
    reporter: user || "cold-rooms-config",
    type: COLD_ROOMS_TYPE,
    payload: { reportDate: CONFIG_KEY, rooms: clean, updatedAt: new Date().toISOString(), updatedBy: user || "" },
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  saveCache(clean);
  return clean;
}

/* ══════════════════════════════════════ Verdict */

/** ok | warn | out | none for one reading against the room's band. */
export function verdict(room, value) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isFinite(n)) return "none";
  if (n < room.min || n > room.max) return "out";
  const w = kindOf(room.kind).warn;
  return n - room.min < w || room.max - n < w ? "warn" : "ok";
}

/* ══════════════════════════════════════ Live readings
   One read per linked log for today (UAE date), through the same adapters
   the QR phone page uses, so a room shows exactly what the sheet holds. */

const filled = (v) => v !== "" && v != null && Number.isFinite(Number(v));

async function readerFor(branch, date) {
  const L = CALIB_LOGS[branch];
  if (!L) return null;
  if (L.code === "qcs") {
    const q = await import("../monitor/branches/qcs/coolerQuick");
    const payload = await q.fetchDay(date);
    return {
      payload,
      slots: q.COOLER_TIMES.map((s) => ({ key: s, label: s })),
      readingsOf: (key) => q.unitBlock(payload, key)?.temps || {},
      sameUnit: (a, b) => a === b,
      sheetPath: "/monitor/qcs?tab=coolers",
      log: L.log,
    };
  }
  const { makeBranchTempAdapter } = await import("../monitor/branches/qcs/BranchTempQuick");
  const A = makeBranchTempAdapter(L.code);
  const { payload } = await A.load(date);
  return {
    payload,
    slots: A.slots,
    readingsOf: (key) => A.readingsOf(payload, key),
    sameUnit: A.sameUnit,
    sheetPath: A.sheetPath,
    log: L.log,
  };
}

/**
 * For every room: { value, slot, at, kind, readings: [{slot,label,value}], sheetPath, log }
 * or null when the room has no link. A failed log read gives { error: true }.
 */
export async function loadLive(rooms, date) {
  const branches = [...new Set(rooms.map((r) => r.link?.branch).filter(Boolean))];
  const readers = {};
  await Promise.all(branches.map(async (b) => {
    try { readers[b] = await readerFor(b, date); } catch { readers[b] = { error: true }; }
  }));
  return rooms.map((room) => {
    if (!room.link) return null;
    const R = readers[room.link.branch];
    if (!R || R.error) return { error: true };
    const temps = R.readingsOf(room.link.key) || {};
    const readings = R.slots.map((s) => ({ slot: s.key, label: s.label, value: temps[s.key] }));
    const lastSlot = [...readings].reverse().find((r) => filled(r.value)) || null;
    let live = lastSlot ? { value: Number(lastSlot.value), slot: lastSlot.label, at: "", kind: "slot" } : null;
    // A phone recheck taken after the last slot reading is the newer value.
    const log = Array.isArray(R.payload?.quickReadings) ? R.payload.quickReadings : [];
    const mine = log.filter((q) => q && R.sameUnit(q.unit, room.link.key) && filled(q.value));
    const newest = mine[mine.length - 1];
    if (newest) {
      const sameSlot = lastSlot && newest.slot === lastSlot.slot;
      if (newest.kind === "recheck" || sameSlot) {
        live = { value: Number(newest.value), slot: lastSlot?.label || newest.slot || "", at: newest.at || "", kind: newest.kind || "slot", by: newest.byName || newest.by || "" };
      }
    }
    return { ...(live || { value: null }), readings: readings.filter((r) => filled(r.value)), sheetPath: R.sheetPath, log: R.log };
  });
}
