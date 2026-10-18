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
// One barcode → ONE product code (the map key guarantees it); one product
// may carry many barcodes (carton, piece, another supplier…). The Products
// Catalog edits them with addBarcode / removeBarcode / replaceBarcode, which
// refuse a barcode already linked to another code (unless told to move it).
// Keys: a real GTIN is stored as 14 digits; any other code (an internal
// Code-128 label…) as typed, upper-case, without spaces.
// localStorage holds a copy for a fast / offline lookup (cache only).
//
// offHint(gtin): the product's name from Open Food Facts when it is listed —
// a hint for the person linking it, never the link itself.

import API_BASE from "../config/api";
import { isValidGtin, toGtin14 } from "./gs1Barcode";

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

/** The map key of anything a reader typed / a person entered ("" = nothing). */
export function normBarcode(raw) {
  const s = String(raw || "").replace(/\s+/g, "").trim();
  if (!s) return "";
  if (/^\d{8}$|^\d{12,14}$/.test(s) && isValidGtin(s)) return toGtin14(s);
  return s.toUpperCase();
}

/** A key as people read it (a GTIN without its padding zero). */
export const showBarcode = (key) => String(key || "").replace(/^0(?=\d{13}$)/, "");

/** { code: [barcode keys…] } — every product's barcodes. */
export function barcodesByCode(map) {
  const out = {};
  Object.entries(map || {}).forEach(([bc, v]) => {
    const c = String(v?.code || "").trim();
    if (c) (out[c] = out[c] || []).push(bc);
  });
  return out;
}

const entry = (item, user) => ({
  code: String(item.code || "").trim(),
  product: String(item.product || "").trim(),
  uom: String(item.uom || "").trim(),
  by: user || "",
  at: new Date().toISOString(),
});

function conflictError(key, hit) {
  const e = new Error(`Barcode ${showBarcode(key)} already belongs to ${hit.code}${hit.product ? ` · ${hit.product}` : ""}.`);
  e.conflict = { barcode: key, code: hit.code, product: hit.product || "" };
  return e;
}

/** Adds a barcode to a product. Taken by another code → throws (err.conflict) unless move. */
export async function addBarcode(raw, item, user = "", { move = false } = {}) {
  const key = normBarcode(raw);
  if (!key) throw new Error("Type or scan a barcode.");
  const map = await readRecord();
  const hit = map[key];
  if (hit && hit.code && hit.code !== String(item.code || "").trim() && !move) throw conflictError(key, hit);
  map[key] = entry(item, user);
  return writeMap(map, user);
}

/** Removes one barcode (whatever product it was on). */
export async function removeBarcode(raw, user = "") {
  const map = await readRecord();
  delete map[normBarcode(raw)];
  delete map[raw];
  return writeMap(map, user);
}

/** Edits a barcode: the old one goes, the new one comes, in one save. */
export async function replaceBarcode(oldRaw, newRaw, item, user = "", { move = false } = {}) {
  const key = normBarcode(newRaw);
  if (!key) throw new Error("Type or scan a barcode.");
  const map = await readRecord();
  const hit = map[key];
  if (hit && hit.code && hit.code !== String(item.code || "").trim() && !move) throw conflictError(key, hit);
  delete map[oldRaw];
  map[key] = entry(item, user);
  return writeMap(map, user);
}

/** A product's code changed (item = new code) or it was removed (item = null):
    its barcodes follow it, or go with it. Writes only when something changed. */
export async function recodeBarcodes(oldCode, item, user = "") {
  const from = String(oldCode || "").trim();
  if (!from) return null;
  const map = await readRecord();
  let changed = false;
  Object.keys(map).forEach((bc) => {
    if (String(map[bc]?.code || "").trim() !== from) return;
    changed = true;
    if (item) map[bc] = entry(item, user);
    else delete map[bc];
  });
  return changed ? writeMap(map, user) : map;
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
  delete map[gtin]; // one of our own (non-GTIN) barcodes
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
