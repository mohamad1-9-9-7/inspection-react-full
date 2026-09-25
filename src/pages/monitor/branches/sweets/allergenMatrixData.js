// src/pages/monitor/branches/sweets/allergenMatrixData.js
// The confectionery Allergen Matrix: one product per row, one allergen per
// column, each cell "C" (contains), "M" (may contain — cross-contact) or ""
// (free). Stored as ONE record (type sweets_haccp_allergen_matrix,
// reportDate "matrix"); PUT /api/reports upserts on (type, reportDate), so the
// matrix is always a single row. The production log reads it to pre-fill a
// batch's allergens from the product name.

import API_BASE from "../../../../config/api";
import { getReportRowByDate } from "../_shared/reportApi";

export const MATRIX_TYPE = "sweets_haccp_allergen_matrix";
export const MATRIX_KEY = "matrix";

// UAE / GSO 9 declarable allergens relevant to a sweets factory.
export const ALLERGEN_COLS = [
  { key: "treeNuts", en: "Tree nuts", ar: "مكسرات", icon: "🌰" },
  { key: "peanuts", en: "Peanuts", ar: "فول سوداني", icon: "🥜" },
  { key: "gluten", en: "Gluten (wheat)", ar: "غلوتين (قمح)", icon: "🌾" },
  { key: "milk", en: "Milk", ar: "حليب", icon: "🥛" },
  { key: "eggs", en: "Eggs", ar: "بيض", icon: "🥚" },
  { key: "sesame", en: "Sesame", ar: "سمسم", icon: "⚪" },
  { key: "soy", en: "Soy", ar: "صويا", icon: "🫘" },
  { key: "sulphites", en: "Sulphites", ar: "كبريتيت", icon: "🍇" },
];

export const NUT_TYPES = ["Almond", "Walnut", "Pistachio", "Cashew", "Hazelnut", "Pecan", "Coconut"];

export const blankProduct = () => ({
  id: `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  code: "",
  category: "",
  nutTypes: "",
  cells: {},
  notes: "",
});

const colName = (c, p) =>
  c.key === "treeNuts" && String(p.nutTypes || "").trim() ? `${c.en} (${p.nutTypes})` : c.en;

export const containsOf = (p) => ALLERGEN_COLS.filter((c) => p.cells?.[c.key] === "C");
export const mayContainOf = (p) => ALLERGEN_COLS.filter((c) => p.cells?.[c.key] === "M");

/** The allergen line for the label: "Contains: … · May contain: …". */
export function labelStatement(p) {
  const c = containsOf(p).map((x) => colName(x, p));
  const m = mayContainOf(p).map((x) => colName(x, p));
  if (!c.length && !m.length) return "No declarable allergens";
  return [c.length && `Contains: ${c.join(", ")}`, m.length && `May contain: ${m.join(", ")}`].filter(Boolean).join(" · ");
}

export const hasNuts = (p) => ["treeNuts", "peanuts"].some((k) => p.cells?.[k] === "C");

/** Production run order: allergen-free first, nut products last. */
export function runOrder(products) {
  const weight = (p) => (hasNuts(p) ? 100 : 0) + containsOf(p).length * 10 + mayContainOf(p).length;
  return [...products].filter((p) => p.name.trim()).sort((a, b) => weight(a) - weight(b) || a.name.localeCompare(b.name));
}

export async function loadAllergenMatrix(signal) {
  const row = await getReportRowByDate(MATRIX_TYPE, MATRIX_KEY, { signal });
  return row?.payload || null;
}

export async function saveAllergenMatrix(payload) {
  const res = await fetch(`${String(API_BASE).replace(/\/$/, "")}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "sweets", type: MATRIX_TYPE, payload: { ...payload, reportDate: MATRIX_KEY } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => null);
}
