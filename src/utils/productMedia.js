// src/utils/productMedia.js
//
// 🖼 What the Products Catalog knows about a product beyond code + name —
// keyed by our item code.
//
// The catalog record on the server keeps only code + name (left like that
// on purpose for now), so the rest sits in one config record of its own
// (same shape as barcode_map):
//   type = product_media , payload.reportDate = "media"
//   payload.map = { "96303": {
//     images:    ["https://res.cloudinary.com/…"],   // first = main photo
//     storage:   { mode: "chilled"|"frozen"|"ambient", min: 0, max: 4 },  // °C
//     allergens: ["milk", "gluten"],                 // ALLERGENS ids
//     active:    false,                             // only stored when stopped
//     by, at } }                                    // the last change
// The photo files are on Cloudinary (utils/imageUpload) — never base64.
// Saving re-reads the record and changes only its own code.
// The record name stays "product_media" (it started with photos only).

import API_BASE from "../config/api";

export const MEDIA_TYPE = "product_media";
export const MEDIA_EVENT = "product_media_changed";
const KEY = "media";
const CACHE = "product_media_cache_v1";

/* The 14 allergens food labels must declare (EU 1169/2011 — also the UAE / GSO list). */
export const ALLERGENS = [
  { id: "gluten", label: "Gluten", icon: "🌾" },
  { id: "crustaceans", label: "Crustaceans", icon: "🦐" },
  { id: "eggs", label: "Eggs", icon: "🥚" },
  { id: "fish", label: "Fish", icon: "🐟" },
  { id: "peanuts", label: "Peanuts", icon: "🥜" },
  { id: "soy", label: "Soy", icon: "🫘" },
  { id: "milk", label: "Milk", icon: "🥛" },
  { id: "nuts", label: "Tree nuts", icon: "🌰" },
  { id: "celery", label: "Celery", icon: "🥬" },
  { id: "mustard", label: "Mustard", icon: "🟡" },
  { id: "sesame", label: "Sesame", icon: "⚪" },
  { id: "sulphites", label: "Sulphites", icon: "🧪" },
  { id: "lupin", label: "Lupin", icon: "🌼" },
  { id: "molluscs", label: "Molluscs", icon: "🐚" },
];
export const allergenOf = (id) => ALLERGENS.find((a) => a.id === id) || { id, label: id, icon: "⚠️" };

/* Storage modes and the usual range a new choice starts with (°C, editable). */
export const STORAGE = {
  chilled: { label: "Chilled", icon: "❄️", min: 0, max: 4 },
  frozen: { label: "Frozen", icon: "🧊", min: -25, max: -18 },
  ambient: { label: "Ambient", icon: "🌡", min: 15, max: 25 },
};

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "null") || {}; } catch { return {}; } };
const writeCache = (map) => {
  try { localStorage.setItem(CACHE, JSON.stringify(map)); } catch { /* cache only */ }
  try { window.dispatchEvent(new Event(MEDIA_EVENT)); } catch { /* non-browser */ }
};

async function readRecord() {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(MEDIA_TYPE)}&limit=5`, {
    cache: "no-store", headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Product data read failed (${res.status})`);
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
  const row = rows.find((r) => String(r?.payload?.reportDate || "") === KEY) || null;
  const map = row?.payload?.map;
  return map && typeof map === "object" ? map : {};
}

async function writeMap(map, user) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "product-media", type: MEDIA_TYPE, payload: { reportDate: KEY, map } }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  writeCache(map);
  return map;
}

/** The whole map — from the server, or this device's copy when it can't be reached. */
export async function fetchProductMedia() {
  try {
    const map = await readRecord();
    writeCache(map);
    return map;
  } catch {
    return readCache();
  }
}

/** This device's copy, without a request (first paint / dropdown filtering). */
export const cachedProductMedia = () => readCache();

const entryOf = (map, code) => map?.[String(code || "").trim()] || null;

export const imagesOf = (map, code) => {
  const v = entryOf(map, code);
  return Array.isArray(v?.images) ? v.images.filter(Boolean) : [];
};
export const storageOf = (map, code) => {
  const s = entryOf(map, code)?.storage;
  return s && STORAGE[s.mode] ? s : null;
};
export const allergensOf = (map, code) => {
  const a = entryOf(map, code)?.allergens;
  return Array.isArray(a) ? a.filter(Boolean) : [];
};
/** Active unless it was stopped on purpose. */
export const isActive = (map, code) => entryOf(map, code)?.active !== false;
export const changeOf = (map, code) => {
  const v = entryOf(map, code);
  return v?.at ? { at: v.at, by: v.by || "" } : null;
};

const isEmpty = (v) => !v || (
  !(v.images && v.images.length) && !v.storage && !(v.allergens && v.allergens.length) && v.active !== false
);

/**
 * Changes a product's extra data: `patch` holds only the fields to change
 * ({ images?, storage?, allergens?, active? }; storage null = cleared).
 * oldCode (when the code changed) hands its entry over and loses it.
 */
export async function setProductExtras(code, patch, user = "", oldCode = "") {
  const c = String(code || "").trim();
  const map = await readRecord();
  const from = String(oldCode || "").trim();
  const prev = { ...(map[c] || {}), ...(from && from !== c ? map[from] || {} : {}) };
  if (from && from !== c) delete map[from];
  if (!c) return writeMap(map, user);
  const next = { ...prev };
  if ("images" in patch) next.images = (patch.images || []).filter(Boolean);
  if ("allergens" in patch) next.allergens = (patch.allergens || []).filter(Boolean);
  if ("storage" in patch) {
    if (patch.storage && STORAGE[patch.storage.mode]) next.storage = patch.storage;
    else delete next.storage;
  }
  if ("active" in patch) {
    if (patch.active === false) next.active = false;
    else delete next.active;
  }
  if (next.images && !next.images.length) delete next.images;
  if (next.allergens && !next.allergens.length) delete next.allergens;
  next.by = user || "";
  next.at = new Date().toISOString();
  if (isEmpty(next)) delete map[c];
  else map[c] = next;
  return writeMap(map, user);
}

/** Photos only — kept for callers that change nothing else. */
export const setProductImages = (code, images, user = "", oldCode = "") =>
  setProductExtras(code, { images }, user, oldCode);
