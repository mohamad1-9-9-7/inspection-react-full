// src/pages/Destruction/destructionOptions.js
//
// Shared domain constants + helpers for the Material Destruction register
// (سجل إعدام المواد). Imported by the Input page, the Browse page and the
// Excel backup exporter so all three stay in sync.

export const TYPE = "destruction_record";

export const OTHER = "Other...";
export const OTHER_BRANCH = "فرع آخر... / Other branch";

/* Same branch list used by the Returns register */
export const BRANCHES = [
  "QCS",
  "POS 6",
  "POS 7",
  "POS 10",
  "POS 11",
  "POS 14",
  "POS 15",
  "POS 16",
  "POS 17",
  "POS 18",
  "POS 19",
  "POS 21",
  "POS 24",
  "POS 25",
  "POS 26",
  "POS 31",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37",
  "POS 38",
  "POS 41",
  "POS 42",
  "FTR 1",
  "FTR 2",
  "KMC",
  "KPS",
  "W K C",
  "POS 43",
  "POS 44",
  "POS 45",
  "POS 47",
  "POS 48",
  OTHER_BRANCH,
];

/* Why the material was condemned */
export const REASONS = [
  "Expired / منتهي الصلاحية",
  "Near expiry – not saleable / قارب الانتهاء",
  "Damaged packaging / تلف العبوة",
  "Temperature abuse / خلل في سلسلة التبريد",
  "Contamination / تلوث",
  "Foreign body / جسم غريب",
  "Spoilage – organoleptic / فساد حسي",
  "Lab result out of spec / نتيجة مخبرية خارج المواصفة",
  "Product recall / سحب منتج",
  "Customer return – unfit / مرتجع عميل غير صالح",
  "Production reject / مرفوض إنتاج",
  OTHER,
];

/* How it was destroyed */
export const METHODS = [
  "Municipality landfill / مكب البلدية",
  "Incineration / حرق",
  "Denaturing (dye / disinfectant) / تشويه بمادة صابغة",
  "Approved waste contractor / متعهد نفايات معتمد",
  "Rendering / تدوير",
  "Returned to supplier / إعادة إلى المورد",
  OTHER,
];

export const QTY_TYPES = ["KG", "PCS", "CTN", "LTR", OTHER];

/* Units that represent weight — used for the KG totals */
export const WEIGHT_UNITS = new Set(["KG"]);

/* ───────── helpers ───────── */

export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

/** Resolve a dropdown value against its "Other..." free-text twin. */
export function resolveOption(value, custom) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (v === OTHER || v === OTHER_BRANCH) return String(custom ?? "").trim() || "Other";
  return v;
}

/* ───────── reasons (one line may carry more than one) ─────────
   `reasons` is the canonical list: catalog values from REASONS plus, at most,
   one free-text entry stored verbatim (anything not in REASONS is the custom
   one). `reason` / `customReason` stay in sync so records written before
   multi-reason support — and any reader still expecting one value — keep working. */
export const REASON_SEP = " + ";

const REASON_SET = new Set(REASONS);

/** True when the value is a free-typed reason rather than a catalog one. */
export function isCustomReason(v) {
  const s = String(v ?? "").trim();
  return !!s && !REASON_SET.has(s);
}

/** Every reason on a line, de-duplicated. Falls back to the legacy single field. */
export function itemReasons(it) {
  const out = [];
  const push = (v) => {
    const s = String(v ?? "").trim();
    if (s && s !== OTHER && !out.includes(s)) out.push(s);
  };
  const list = safeArr(it?.reasons);
  if (list.length) {
    list.forEach(push);
    return out;
  }
  push(resolveOption(it?.reason, it?.customReason));
  return out;
}

/** Display string for a line's reasons — "Expired + Contamination". */
export function reasonsText(it) {
  return itemReasons(it).join(REASON_SEP);
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function fmt2(v) {
  return num(v).toFixed(2);
}

/** Line value = quantity × unit cost. */
export function lineValue(item) {
  return num(item?.quantity) * num(item?.unitCost);
}

export function blankItem() {
  return {
    itemCode: "",
    productName: "",
    batchNo: "",
    productionDate: "",
    expiry: "",
    quantity: "",
    qtyType: "KG",
    customQtyType: "",
    unitCost: "",
    reasons: [],
    reason: "",
    customReason: "",
    method: "",
    customMethod: "",
    remarks: "",
    images: [],
  };
}

export function blankHeader() {
  return {
    branch: "",
    customBranch: "",
    destructionDate: getToday(),
    location: "",
    method: "",
    customMethod: "",
    disposalCompany: "",
    municipalityRef: "",
    performedBy: "",
    witnessedBy: "",
    approvedBy: "",
    notes: "",
  };
}

/** Aggregate figures shown on the input footer, the browse KPIs and Excel. */
export function computeTotals(items) {
  const list = safeArr(items);
  const byUnit = new Map();
  let totalValue = 0;
  let totalWeight = 0;

  for (const it of list) {
    const unit = resolveOption(it?.qtyType, it?.customQtyType) || "—";
    const qty = num(it?.quantity);
    byUnit.set(unit, num(byUnit.get(unit)) + qty);
    if (WEIGHT_UNITS.has(String(it?.qtyType || "").toUpperCase())) totalWeight += qty;
    totalValue += lineValue(it);
  }

  return {
    lines: list.length,
    totalValue,
    totalWeight,
    byUnit: Array.from(byUnit.entries()).sort((a, b) => b[1] - a[1]),
  };
}

/** Count reasons across a set of items — feeds the "Top Reasons" KPI card. */
export function countReasons(items) {
  const map = new Map();
  for (const it of safeArr(items)) {
    for (const r of itemReasons(it)) map.set(r, (map.get(r) || 0) + 1);
  }
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

/** Normalize one row before it goes to the server. */
export function prepareItem(r) {
  const q = Number(r?.quantity);
  const c = Number(r?.unitCost);
  const reasons = itemReasons(r);
  const first = reasons[0] || "";
  const firstIsCustom = isCustomReason(first);
  return {
    itemCode: String(r?.itemCode || "").trim(),
    productName: String(r?.productName || "").trim(),
    batchNo: String(r?.batchNo || "").trim(),
    productionDate: String(r?.productionDate || "").trim(),
    expiry: String(r?.expiry || "").trim(),
    quantity: Number.isFinite(q) ? q : "",
    qtyType: String(r?.qtyType || "").trim(),
    customQtyType: String(r?.customQtyType || "").trim(),
    unitCost: Number.isFinite(c) ? c : "",
    reasons,
    /* legacy single-reason mirror — the first reason wins */
    reason: firstIsCustom ? OTHER : first,
    customReason: firstIsCustom ? first : "",
    method: String(r?.method || "").trim(),
    customMethod: String(r?.customMethod || "").trim(),
    remarks: String(r?.remarks || "").trim(),
    images: safeArr(r?.images),
  };
}

/** True when the row carries anything worth saving. */
export function rowHasData(r) {
  return !!(
    r?.itemCode ||
    r?.productName ||
    r?.batchNo ||
    r?.productionDate ||
    r?.expiry ||
    r?.remarks ||
    r?.reason ||
    (r?.reasons?.length || 0) > 0 ||
    r?.method ||
    (r?.images?.length || 0) > 0 ||
    (r?.quantity !== "" && r?.quantity != null) ||
    (r?.unitCost !== "" && r?.unitCost != null)
  );
}
