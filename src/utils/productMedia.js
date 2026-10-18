// src/utils/productMedia.js
//
// 🖼 Product photos for the Products Catalog — keyed by our item code.
//
// The catalog record on the server keeps only code + name, so the photos sit
// in one config record of their own (same shape as barcode_map):
//   type = product_media , payload.reportDate = "media"
//   payload.map = { "96303": { images: ["https://res.cloudinary.com/…"], by, at } }
// The files themselves are on Cloudinary (utils/imageUpload) — never base64.
// Saving re-reads the record and changes only its own code.

import API_BASE from "../config/api";

export const MEDIA_TYPE = "product_media";
const KEY = "media";
const CACHE = "product_media_cache_v1";

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "null") || {}; } catch { return {}; } };
const writeCache = (map) => { try { localStorage.setItem(CACHE, JSON.stringify(map)); } catch { /* cache only */ } };

async function readRecord() {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(MEDIA_TYPE)}&limit=5`, {
    cache: "no-store", headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Product photos read failed (${res.status})`);
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

export const imagesOf = (map, code) => {
  const v = map?.[String(code || "").trim()];
  return Array.isArray(v?.images) ? v.images.filter(Boolean) : [];
};

/**
 * A product's photos are now `images`. oldCode (when the code changed) loses
 * its entry; an empty list removes the entry.
 */
export async function setProductImages(code, images, user = "", oldCode = "") {
  const c = String(code || "").trim();
  const map = await readRecord();
  const from = String(oldCode || "").trim();
  if (from && from !== c) delete map[from];
  const list = (images || []).filter(Boolean);
  if (c) {
    if (list.length) map[c] = { images: list, by: user || "", at: new Date().toISOString() };
    else delete map[c];
  }
  return writeMap(map, user);
}
