// src/utils/barcodeMap.js
//
// 🔗 Barcode → our item code, learned once.
//
// A carton's barcode (GTIN) says which product it is in the world's numbering;
// our item code (items.json, e.g. 96303) is ours alone, so no outside
// database can tell one from the other. The first time a barcode is scanned
// the user picks our product once; from then on every phone of the company
// knows it.
//
// One config record for the company:
//   type = barcode_map , payload.reportDate = "map"
//   payload.map = { "07891515408688": { code, product, uom, by, at } }
// Saving re-reads the record and adds/replaces only its own barcode;
// unlinkBarcode removes a wrong link (the barcode is "new" again).
// localStorage holds a copy for a fast / offline lookup (cache only).
//
// offHint(gtin): the product's name from Open Food Facts when it is listed —
// a hint for the person linking it, never the link itself.

import API_BASE from "../config/api";
import { toGtin14 } from "./gs1Barcode";

export const BARCODE_TYPE = "barcode_map";
const KEY = "map";
const CACHE = "barcode_map_cache_v1";

const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE) || "null") || {}; } catch { return {}; } };
const writeCache = (map) => { try { localStorage.setItem(CACHE, JSON.stringify(map)); } catch { /* cache only */ } };

async function readRecord(signal) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(BARCODE_TYPE)}&limit=5`, {
    cache: "no-store", signal, headers: { Accept: "application/json" },
  });
  if (!res.ok) { const e = new Error(`Barcode list read failed (${res.status})`); e.status = res.status; throw e; }
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
  const row = rows.find((r) => String(r?.payload?.reportDate || "") === KEY) || null;
  const map = row?.payload?.map;
  return map && typeof map === "object" ? map : {};
}

/** The whole map — from the server, or the phone's copy when it can't be reached. */
export async function fetchBarcodeMap(signal) {
  try {
    const map = await readRecord(signal);
    writeCache(map);
    return map;
  } catch {
    return readCache();
  }
}

/** Links one barcode to one of our products, for the whole company. */
export async function linkBarcode(gtin, item, user = "") {
  const g = toGtin14(gtin);
  const map = await readRecord();
  map[g] = {
    code: String(item.code || "").trim(),
    product: String(item.product || "").trim(),
    uom: String(item.uom || "").trim(),
    by: user || "",
    at: new Date().toISOString(),
  };
  return writeMap(map, user);
}

/** Removes a wrong link: the barcode is "new" again on every phone. */
export async function unlinkBarcode(gtin, user = "") {
  const map = await readRecord();
  delete map[toGtin14(gtin)];
  return writeMap(map, user);
}

async function writeMap(map, user) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "barcode-map", type: BARCODE_TYPE, payload: { reportDate: KEY, map } }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  writeCache(map);
  return map;
}

/** "Brand · name" from Open Food Facts, or "" (not listed / no connection). */
export async function offHint(gtin) {
  const g = String(gtin || "").replace(/^0+(?=\d{8,13}$)/, "");
  if (!/^\d{8,14}$/.test(g)) return "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${g}.json?fields=product_name,brands,quantity`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return "";
    const j = await res.json();
    if (j?.status !== 1 || !j.product) return "";
    return [j.product.brands, j.product.product_name, j.product.quantity].filter(Boolean).join(" · ");
  } catch {
    return "";
  }
}
