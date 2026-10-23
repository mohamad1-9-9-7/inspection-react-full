// src/pages/labels/labelLink.js
//
// A link that opens the label page already filled in — from the Products
// Catalog, the cooler goods-in screen, the trace screen. Kept apart from
// labelsApi so those pages don't pull the barcode encoders into their bundle.
//
//   /inventory/labels?code=30024&prod=2026-10-23&exp=2026-10-30&lot=A1&kg=1.25&site=POS%2010

import { hasSection } from "../../utils/perms";

export const LABELS_PATH = "/inventory/labels";

/** The URL; empty values are left out. */
export function labelLink({ code, prod, exp, lot, kg, site } = {}) {
  const qs = new URLSearchParams();
  const put = (k, v) => { const t = String(v ?? "").trim(); if (t) qs.set(k, t); };
  put("code", code);
  put("prod", prod);
  put("exp", exp);
  put("lot", lot);
  if (Number(kg) > 0) put("kg", kg);
  put("site", site);
  const q = qs.toString();
  return q ? `${LABELS_PATH}?${q}` : LABELS_PATH;
}

/** Same gate as the route (section "labels") — a button the user cannot use is not drawn. */
export const canPrintLabels = () => hasSection("labels");
