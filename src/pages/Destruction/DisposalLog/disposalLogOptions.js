// src/pages/Destruction/DisposalLog/disposalLogOptions.js
//
// سجل الإعدام الشهري من أودو — Odoo Monthly Disposal Log.
//
// The imported file is kept in its own report type and never merged into
// ours — it is the OTHER side of the reconciliation:
//   • `odoo_disposal_log`   = what the store team exported from Odoo
//   • `returns`             = what the branches returned for destruction
//   • `returns_customers`   = what customers sent back for destruction
//   • `destruction_record`  = what QA wrote up itself, with evidence
// `/disposal-log/compare` reads the file against the other three, day by day
// and product by product.
//
// Server is the source of truth (POST / PUT /api/reports, type=odoo_disposal_log).
// One saved record = one month of the Odoo export.

import {
  BRANCHES,
  OTHER_BRANCH,
  resolveOption,
  safeArr as _safeArr,
} from "../destructionOptions";

export const TYPE = "odoo_disposal_log";
export const DESTRUCTION_TYPE = "destruction_record";

export const safeArr = _safeArr;

/* ============================================================
   Small helpers
   ============================================================ */
export function num(v) {
  const n = Number(String(v ?? "").replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
export function fmt2(v) {
  return num(v).toFixed(2);
}
export function fmt3(v) {
  const n = num(v);
  return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(3);
}
export function getToday() {
  return new Date().toISOString().slice(0, 10);
}

/** Loose key: lowercase, no spaces, no punctuation. */
export function normKey(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_()/\\.,'"[\]]/g, "");
}

/* ============================================================
   Dates
   ============================================================ */
/** Excel serial → ISO date (no timezone drift — pure calendar math). */
export function serialToISO(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n <= 0) return "";
  // Excel epoch 1899-12-30 (accounts for the 1900 leap-year bug).
  const ms = Math.round(n) * 86400000;
  const d = new Date(Date.UTC(1899, 11, 30) + ms);
  return d.toISOString().slice(0, 10);
}

/**
 * Normalize any cell value into an ISO date.
 * `dayFirst` only matters for ambiguous slash/dot dates (Odoo exports M/D/YY).
 */
export function toISODate(v, dayFirst = false) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number") return serialToISO(v);

  const s = String(v).trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(s)) return serialToISO(s);

  const m = s.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    let y = Number(m[3]);
    if (String(m[1]).length === 4) {
      // YYYY-M-D
      return `${m[1]}-${String(b).padStart(2, "0")}-${String(y).padStart(2, "0")}`;
    }
    if (y < 100) y += y >= 70 ? 1900 : 2000;
    let day = dayFirst ? a : b;
    let mon = dayFirst ? b : a;
    if (mon > 12 && day <= 12) [day, mon] = [mon, day]; // obvious swap
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return "";
    return `${y}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return "";
}

export function monthKeyOf(iso) {
  return String(iso || "").slice(0, 7);
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_NAMES_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export function monthLabel(periodKey) {
  const m = String(periodKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(periodKey || "");
  return `${MONTH_NAMES[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}
export function monthLabelAr(periodKey) {
  const m = String(periodKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return String(periodKey || "");
  return `${MONTH_NAMES_AR[Number(m[2]) - 1] || m[2]} ${m[1]}`;
}
export function formatDMY(iso) {
  const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso || "");
}

/* ============================================================
   Odoo → internal vocabulary
   ============================================================ */

/** `[010] Abu Dhabi Butchery POS10` → { code: "010", rest: "Abu Dhabi Butchery POS10" } */
export function splitBracketCode(raw) {
  const s = String(raw ?? "").trim();
  const m = s.match(/^\[\s*([^\]]+?)\s*\]\s*(.*)$/);
  if (m) return { code: m[1].trim(), rest: m[2].trim() };
  return { code: "", rest: s };
}

/**
 * `[10211] FRESH BEEF LIVER LOCAL - KG` → { code:"10211", name:"FRESH BEEF LIVER LOCAL - KG" }
 * Also copes with `[97107- PLATE] ROCCA SALAD- PLATE` (code carries a suffix).
 */
export function parseProduct(raw) {
  const { code, rest } = splitBracketCode(raw);
  if (code) return { code, name: rest || code };
  // No brackets — try a leading numeric code ("10211 FRESH BEEF ...")
  const m = String(raw ?? "").trim().match(/^(\d{3,8})\s*[-–—:]?\s+(.*)$/);
  if (m) return { code: m[1], name: m[2] };
  return { code: "", name: String(raw ?? "").trim() };
}

/** Primary matching key for a product code — the leading digits when present. */
export function productCodeKey(code, name) {
  const digits = String(code ?? "").match(/\d{2,}/);
  if (digits) return digits[0].replace(/^0+(?=\d)/, "");
  const k = normKey(code);
  if (k && k !== "nil" && k !== "na" && k !== "none") return k;
  return "";
}

/** Non-numeric branch codes used by Odoo that map onto our branch list. */
export const ODOO_BRANCH_CODES = {
  QCS: "QCS",
  WAR: "W K C",
  WKC: "W K C",
  KMC: "KMC",
  KPS: "KPS",
  FTR1: "FTR 1",
  FTR2: "FTR 2",
};

/**
 * `[010] Abu Dhabi Butchery POS10` → "POS 10"
 * `[QCS] Quasis warehouse`         → "QCS"
 * `[WAR] Warqa Kitchen`            → "W K C"
 * Falls back to the raw Odoo name when nothing matches, so no row is lost.
 */
export function resolveOdooBranch(rawLocation, overrides = {}) {
  const raw = String(rawLocation ?? "").trim();
  if (!raw) return "";
  if (overrides && overrides[raw]) return overrides[raw];

  const { code, rest } = splitBracketCode(raw);

  if (code) {
    const upper = code.toUpperCase().replace(/\s+/g, "");
    if (ODOO_BRANCH_CODES[upper]) return ODOO_BRANCH_CODES[upper];
    if (/^\d+$/.test(code)) {
      const guess = `POS ${Number(code)}`;
      if (BRANCHES.includes(guess)) return guess;
      return guess; // keep it readable even if it is not in our list yet
    }
  }

  // Secondary signal — "…POS10" inside the location name
  const posInName = rest.match(/POS\s*0*(\d{1,3})/i);
  if (posInName) return `POS ${Number(posInName[1])}`;

  const known = BRANCHES.find(
    (b) => b !== OTHER_BRANCH && normKey(b) && normKey(raw).includes(normKey(b))
  );
  return known || rest || raw;
}

/** Our own records sometimes hold a bare number or a custom branch. */
export function branchKeyOf(branch) {
  const s = String(branch ?? "").trim();
  if (!s) return "";
  if (/^\d{1,3}$/.test(s)) return `POS${Number(s)}`;
  const m = s.match(/^POS\s*0*(\d{1,3})$/i);
  if (m) return `POS${Number(m[1])}`;
  return normKey(s).toUpperCase();
}

/** KG / PIECES / PLATE / PCS / CTN … → a stable unit token. */
export function normalizeUom(u) {
  const s = String(u ?? "").trim().toUpperCase().replace(/\./g, "");
  if (!s) return "—";
  if (["KG", "KGS", "KILO", "KILOGRAM", "KILOGRAMS"].includes(s)) return "KG";
  if (["PC", "PCS", "PIECE", "PIECES", "EA", "EACH", "UNIT", "UNITS", "NOS", "NO"].includes(s)) return "PCS";
  if (["PLATE", "PLATES"].includes(s)) return "PLATE";
  if (["CTN", "CARTON", "CARTONS", "BOX", "BOXES"].includes(s)) return "CTN";
  if (["L", "LTR", "LITRE", "LITER", "LITRES", "LITERS"].includes(s)) return "LTR";
  if (["G", "GM", "GRAM", "GRAMS"].includes(s)) return "G";
  return s;
}

/* ============================================================
   Workbook parsing
   ============================================================ */

/** Logical fields we try to find in the sheet header row. */
export const FIELDS = [
  { id: "date",     label: "Date",             ar: "التاريخ",       required: true,
    aliases: ["date", "valuationdate", "dateofdisposal", "disposaldate", "transactiondate", "createdon"] },
  { id: "location", label: "Location / From",  ar: "الموقع / الفرع", required: true,
    aliases: ["from", "location", "stockmoveanalyticalaccount", "analyticalaccount", "branch", "warehouse", "sourcelocation"] },
  { id: "reference", label: "Reference",       ar: "المرجع",        required: false,
    aliases: ["reference", "stockmovesourcedocument", "sourcedocument", "document", "voucher", "ref", "picking"] },
  { id: "product",  label: "Product",          ar: "الصنف",         required: true,
    aliases: ["product", "productname", "item", "description", "productproduct"] },
  { id: "category", label: "Product Category", ar: "التصنيف",       required: false,
    aliases: ["productcategory", "productproductcategory", "category", "categ"] },
  { id: "uom",      label: "Unit",             ar: "الوحدة",        required: false,
    aliases: ["uom", "unitofmeasure", "unit", "uomname"] },
  { id: "qty",      label: "Quantity",         ar: "الكمية",        required: true,
    aliases: ["qty", "quantity", "done", "quantitydone", "qtydone", "weight", "kg"] },
  { id: "remarks",  label: "Remarks",          ar: "ملاحظات",       required: false,
    aliases: ["remarks", "remark", "note", "notes", "comment", "reason"] },
];

const ALIAS_INDEX = (() => {
  const m = new Map();
  FIELDS.forEach((f) => f.aliases.forEach((a) => m.set(a, f.id)));
  return m;
})();

/** Score a matrix row on how much it looks like a header row. */
function headerScore(row) {
  let hits = 0;
  for (const cell of safeArr(row)) {
    const k = normKey(cell);
    if (k && ALIAS_INDEX.has(k)) hits += 1;
  }
  return hits;
}

/** Find the header row inside the first `scan` rows of a matrix. */
export function detectHeaderRow(matrix, scan = 12) {
  let best = -1;
  let bestScore = 0;
  const limit = Math.min(safeArr(matrix).length, scan);
  for (let i = 0; i < limit; i++) {
    const s = headerScore(matrix[i]);
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  }
  return bestScore >= 3 ? best : (safeArr(matrix).length ? 0 : -1);
}

/** headers[] → { fieldId: columnIndex } */
export function autoMapColumns(headers) {
  const map = {};
  safeArr(headers).forEach((h, idx) => {
    const id = ALIAS_INDEX.get(normKey(h));
    if (id && map[id] == null) map[id] = idx;
  });
  return map;
}

/** True when every required field is mapped. */
export function mappingIsComplete(map) {
  return FIELDS.filter((f) => f.required).every((f) => map?.[f.id] != null && map[f.id] !== "");
}

/**
 * Turn a raw sheet matrix into normalized disposal rows.
 * Rows with no product AND no quantity are dropped (blank spacer rows).
 */
export function buildRows(matrix, headerRowIdx, map, opts = {}) {
  const { dayFirst = false, branchOverrides = {} } = opts;
  const out = [];
  const at = (row, id) => {
    const i = map?.[id];
    return i == null || i === "" ? "" : row?.[Number(i)];
  };

  for (let i = Number(headerRowIdx) + 1; i < safeArr(matrix).length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row) || row.every((c) => c == null || String(c).trim() === "")) continue;

    const productRaw = String(at(row, "product") ?? "").trim();
    const qty = num(at(row, "qty"));
    if (!productRaw && !qty) continue;
    // Skip repeated header lines and Odoo "Total" footers
    if (normKey(productRaw) === "product" || /^total/i.test(productRaw)) continue;

    const locationRaw = String(at(row, "location") ?? "").trim();
    const loc = splitBracketCode(locationRaw);
    const prod = parseProduct(productRaw);

    out.push({
      srcRow: i + 1,
      date: toISODate(at(row, "date"), dayFirst),
      locationRaw,
      locCode: loc.code,
      locName: loc.rest,
      branch: resolveOdooBranch(locationRaw, branchOverrides),
      reference: String(at(row, "reference") ?? "").trim(),
      productRaw,
      code: prod.code,
      product: prod.name,
      category: String(at(row, "category") ?? "").trim().replace(/\s+$/, ""),
      uom: normalizeUom(at(row, "uom")),
      qty,
      remarks: String(at(row, "remarks") ?? "").trim(),
    });
  }
  return out;
}

/** Headline figures for a set of imported rows. */
export function summarizeRows(rows) {
  const list = safeArr(rows);
  const byUnit = new Map();
  const branches = new Map();
  const categories = new Map();
  const dates = [];

  for (const r of list) {
    byUnit.set(r.uom, num(byUnit.get(r.uom)) + num(r.qty));
    const b = r.branch || "—";
    const bg = branches.get(b) || { branch: b, lines: 0, qty: 0, units: new Map() };
    bg.lines += 1;
    bg.qty += num(r.qty);
    bg.units.set(r.uom, num(bg.units.get(r.uom)) + num(r.qty));
    branches.set(b, bg);
    if (r.category) categories.set(r.category, (categories.get(r.category) || 0) + num(r.qty));
    if (r.date) dates.push(r.date);
  }
  dates.sort();

  const months = new Map();
  dates.forEach((d) => {
    const k = monthKeyOf(d);
    months.set(k, (months.get(k) || 0) + 1);
  });
  const period = Array.from(months.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

  return {
    lines: list.length,
    totalQty: list.reduce((s, r) => s + num(r.qty), 0),
    byUnit: Array.from(byUnit.entries()).sort((a, b) => b[1] - a[1]),
    branches: Array.from(branches.values())
      .map((b) => ({ ...b, units: Array.from(b.units.entries()).sort((x, y) => y[1] - x[1]) }))
      .sort((a, b) => b.qty - a.qty),
    categories: Array.from(categories.entries()).sort((a, b) => b[1] - a[1]),
    dateFrom: dates[0] || "",
    dateTo: dates[dates.length - 1] || "",
    period,
    months: Array.from(months.keys()).sort(),
  };
}

/* ============================================================
   Our own condemnation records → comparable entries
   ============================================================ */

/** Flatten `destruction_record` API rows into per-item entries. */
export function flattenDestructionRecords(records, opts = {}) {
  const { period = "" } = opts;
  const out = [];
  for (const rec of safeArr(records)) {
    const p = rec?.payload || {};
    const h = p.header || {};
    const date = String(h.destructionDate || p.reportDate || rec?.reportDate || "").slice(0, 10);
    if (period && monthKeyOf(date) !== period) continue;
    const branch = resolveOption(h.branch, h.customBranch) || "";
    for (const it of safeArr(p.items)) {
      const qty = num(it?.quantity);
      const name = String(it?.productName || "").trim();
      const code = String(it?.itemCode || "").trim();
      if (!qty && !name && !code) continue;
      out.push({
        /* Same shape as the two returns registers, so all three can be
           reconciled side by side; `action` carries the reason it was
           condemned, which is the closest thing this register has to one. */
        source: "condemnation",
        recordId: rec?.id || rec?._id || "",
        date,
        branch,
        code,
        product: name,
        uom: normalizeUom(resolveOption(it?.qtyType, it?.customQtyType)),
        qty,
        action: resolveOption(it?.reason, it?.customReason) || "Condemnation",
        reason: resolveOption(it?.reason, it?.customReason),
        method: resolveOption(it?.method, it?.customMethod),
        batchNo: String(it?.batchNo || "").trim(),
        expiry: String(it?.expiry || "").trim(),
        images: safeArr(it?.images).length,
      });
    }
  }
  return out;
}


/* ============================================================
   Record shape helpers (server payload)
   ============================================================ */
export function blankMeta() {
  return {
    period: monthKeyOf(getToday()),
    fileName: "",
    sheetName: "",
    notes: "",
    importedBy: "",
  };
}

export function getRecordId(rec) {
  return rec?.id || rec?._id || rec?.payload?.id || rec?.payload?._id || "";
}

export function recordPeriod(rec) {
  return (
    rec?.payload?.meta?.period ||
    rec?.payload?.period ||
    monthKeyOf(rec?.payload?.reportDate || rec?.reportDate || "")
  );
}

/* ============================================================
   The returns register — the other half of the reconciliation
   ============================================================
   `destruction_record` holds only the handful of condemnations QA writes up
   with evidence; the register that actually carries the branches' destroyed
   stock is the daily RETURNS report, where every line already says what was
   done with the product. So the Odoo file is reconciled against the returns
   rows whose action means "this was destroyed", and the condemnation register
   stays available as a second, separate source. */

export const RETURNS_TYPE = "returns";
export const CUSTOMER_RETURNS_TYPE = "returns_customers";

/* The three registers that can carry a destroyed product. They are read
   together because Odoo posts one voucher whichever door the product came
   back through: a branch transfer, a customer collection, or a QA write-up.
   Keeping them apart on the line is what lets a gap be explained instead of
   only counted. */
export const SOURCES = ["branch", "customer", "condemnation"];
export const SOURCE_META = {
  branch:       { label: "Branch returns",      ar: "مرتجعات الفروع",  mark: "\ud83c\udfea", tone: "teal" },
  customer:     { label: "Customer returns",    ar: "مرتجعات العملاء", mark: "\ud83e\uddfe", tone: "violet" },
  condemnation: { label: "Condemnation record", ar: "سجل الإعدام",     mark: "\ud83d\udcdd", tone: "amber" },
};

/** The returns actions that end in destruction. */
export const DISPOSAL_ACTIONS = ["Condemnation", "Condemnation / Cooking", "Disposed"];

export const ACTION_META = {
  "Condemnation":           { ar: "إعدام",        color: "#991b1b", bg: "#fef2f2", border: "#fecaca", mark: "⛔" },
  "Condemnation / Cooking": { ar: "إعدام / طبخ",  color: "#9a3412", bg: "#fff7ed", border: "#fed7aa", mark: "🔥" },
  "Disposed":               { ar: "تخلّص",        color: "#334155", bg: "#f1f5f9", border: "#cbd5e1", mark: "🗑️" },
};

/* A branch that types its own action still means destruction when it says so.
   Both languages, because the free-text box is filled in either. */
const CUSTOM_DISPOSAL_RE =
  /(condemn|destro|dispos|discard|waste|إعدام|اعدام|إتلاف|اتلاف|تخلص|تلف|إدانة|ادانة)/i;

/** Does this returns line mean the product was destroyed? */
export function isDisposalAction(action, customAction = "") {
  const a = String(action || "").trim();
  if (DISPOSAL_ACTIONS.some((x) => x.toLowerCase() === a.toLowerCase())) return true;
  if (a === "Other..." || !a) return CUSTOM_DISPOSAL_RE.test(String(customAction || ""));
  return CUSTOM_DISPOSAL_RE.test(a);
}

/** The label a returns line is counted under. */
export function actionLabel(action, customAction = "") {
  const a = String(action || "").trim();
  if (a === "Other...") return String(customAction || "").trim() || "Other";
  return a || "—";
}

/**
 * KG and grams weigh; pieces, plates, boxes count. Odoo says PLATE where the
 * branch says PCS for the very same salad, so the two have to land in one
 * family or every plate in the month reads as a missing product.
 */
export function unitFamily(uom) {
  const u = normalizeUom(uom);
  if (u === "KG" || u === "G") return "KG";
  if (u === "LTR") return "LTR";
  if (u === "PCS" || u === "PLATE" || u === "CTN" || u === "BOX") return "COUNT";
  return u || "—";
}

export const UNIT_FAMILY_LABEL = { KG: "Weight (KG)", COUNT: "Count (PCS / PLATE)", LTR: "Litres" };

/** Flatten `returns` API records into comparable disposal entries. */
export function flattenReturnsRecords(records, opts = {}) {
  const { period = "", from = "", to = "", actions = null, changeIndex = null, useChangeDates = true } = opts;
  const allow = actions && actions.length ? new Set(actions.map((a) => String(a).toLowerCase())) : null;
  const out = [];

  for (const rec of safeArr(records)) {
    const p = rec?.payload || {};
    const reportDate = String(p.reportDate || rec?.reportDate || "").slice(0, 10);
    if (!reportDate) continue;

    for (const it of safeArr(p.items)) {
      const action = String(it?.action || "").trim();
      const custom = String(it?.customAction || "").trim();
      if (!isDisposalAction(action, custom)) continue;
      const label = actionLabel(action, custom);
      if (allow && !allow.has(label.toLowerCase()) && !allow.has(action.toLowerCase())) continue;

      const qty = num(it?.quantity);
      const code = String(it?.itemCode || "").trim();
      const name = String(it?.productName || "").trim();
      if (!qty && !code && !name) continue;

      /* The period is applied to the DISPOSAL date, not the report date: a
         line written in July and condemned in August belongs to August's
         Odoo file, and one written in August and condemned in September has
         left it. */
      const eff = disposalDateOf(it, reportDate, changeIndex, "branch", useChangeDates);
      const date = eff.date;
      if (period && monthKeyOf(date) !== period) continue;
      if (from && date < from) continue;
      if (to && date > to) continue;

      out.push({
        source: "branch",
        recordId: rec?.id || rec?._id || "",
        date,
        reportDate,
        dateFrom: eff.from,
        changedAt: eff.changedAt,
        dateShifted: date !== reportDate,
        branch: resolveOption(it?.butchery, it?.customButchery) || "",
        code,
        product: name,
        origin: String(it?.origin || "").trim(),
        uom: normalizeUom(resolveOption(it?.qtyType, it?.customQtyType)),
        qty,
        action: label,
        rawAction: action,
        remarks: String(it?.remarks || "").trim(),
        transferNo: String(it?.transferNo || "").trim(),
        expiry: String(it?.expiry || "").trim(),
        images: safeArr(it?.images).length,
      });
    }
  }
  return out;
}


/* ============================================================
   When was it actually destroyed?
   ============================================================
   A branch writes a return on the day the product came back and often
   decides its fate days later — the line is edited from "Use in production"
   to "Condemnation" on, say, the 3rd, while the report still sits under the
   1st. Odoo posts the voucher on the 3rd, so comparing on the report date
   makes the very same event look like two failures at once: destroyed in
   Odoo and not destroyed by us on one day, and the reverse two days later.

   Every such edit is already recorded. `ReturnView` appends to
   `returns_changes` (and the customer page to `returns_customers_changes`) a
   line carrying the item key, the old and new action, and `at` — the moment
   the action was changed. Reading that log gives the disposal date for free,
   for rows that were changed long before this page existed.

   Order of preference for a line's disposal date:
     1. `actionDate` stamped on the item when the action was changed
     2. the change log, when its latest entry moved this line TO the action
        it now carries
     3. the report date
   ============================================================ */

export const RETURNS_CHANGES_TYPE = "returns_changes";
export const CUSTOMER_RETURNS_CHANGES_TYPE = "returns_customers_changes";

/** Calendar date in Dubai — the day the business says it happened. */
export function businessDateOf(value) {
  if (!value) return "";
  const t = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(t)) return String(value).slice(0, 10);
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(t));
  } catch {
    return new Date(t).toISOString().slice(0, 10);
  }
}

const lower = (v) => String(v ?? "").trim().toLowerCase();

/** Exactly the key `ReturnView` / `CustomerReturnView` write into the log. */
export function returnsItemKey(it, kind = "branch") {
  const who =
    kind === "customer"
      ? it?.customerName
      : (String(it?.butchery || "").includes("Other") || String(it?.butchery || "").includes("آخر"))
        ? it?.customButchery
        : (/^\d+$/.test(String(it?.butchery || "").trim())
            ? `POS ${String(it.butchery).trim()}`
            : it?.butchery);
  return [lower(it?.itemCode), lower(it?.productName), lower(it?.origin), lower(who), lower(it?.expiry)].join("|");
}

/**
 * Index a change log: `${reportDate}||${itemKey}` → the LATEST change on it.
 * Only the latest matters — a line moved to Condemnation and then away from
 * it must not keep the condemnation date.
 */
export function buildChangeIndex(records) {
  const map = new Map();
  for (const rec of safeArr(records)) {
    const d = String(rec?.payload?.reportDate || rec?.reportDate || "").slice(0, 10);
    if (!d) continue;
    for (const ch of safeArr(rec?.payload?.items)) {
      const k = ch?.key;
      if (!k) continue;
      const ts = Date.parse(ch?.at) || 0;
      const id = `${d}||${k}`;
      const prev = map.get(id);
      if (!prev || ts > prev.ts) {
        map.set(id, { to: ch.to || "", from: ch.from || "", at: ch.at || "", ts, partial: !!ch.partial });
      }
    }
  }
  return map;
}

/**
 * The date a returns line should be compared on.
 * @returns {{date: string, from: "stamp"|"log"|"report", changedAt: string}}
 */
export function disposalDateOf(it, reportDate, changeIndex, kind = "branch", useChangeDates = true) {
  const stamped = String(it?.actionDate || it?.disposalDate || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(stamped)) {
    return { date: stamped, from: "stamp", changedAt: stamped };
  }
  if (useChangeDates && changeIndex) {
    const hit = changeIndex.get(`${reportDate}||${returnsItemKey(it, kind)}`);
    const now = actionLabel(it?.action, it?.customAction);
    if (hit && hit.at && lower(hit.to) === lower(now)) {
      const d = businessDateOf(hit.at);
      if (d) return { date: d, from: "log", changedAt: hit.at };
    }
  }
  return { date: reportDate, from: "report", changedAt: "" };
}

/**
 * Flatten `returns_customers` records into the same comparable entries.
 *
 * A customer return has no branch on it — it has the customer who sent it
 * back. That is left in `customer` and the branch stays empty on purpose: the
 * product still shows up in Odoo under whichever site cleared it, so forcing a
 * branch here would only invent a mismatch. With "Day × branch × product"
 * grouping these lines therefore stand on their own, which is the honest
 * answer — the branch is genuinely not recorded on them.
 */
export function flattenCustomerReturns(records, opts = {}) {
  const { period = "", from = "", to = "", actions = null, changeIndex = null, useChangeDates = true } = opts;
  const allow = actions && actions.length ? new Set(actions.map((a) => String(a).toLowerCase())) : null;
  const out = [];

  for (const rec of safeArr(records)) {
    const p = rec?.payload || {};
    const reportDate = String(p.reportDate || rec?.reportDate || "").slice(0, 10);
    if (!reportDate) continue;

    for (const it of safeArr(p.items)) {
      const action = String(it?.action || "").trim();
      const custom = String(it?.customAction || "").trim();
      if (!isDisposalAction(action, custom)) continue;
      const label = actionLabel(action, custom);
      if (allow && !allow.has(label.toLowerCase()) && !allow.has(action.toLowerCase())) continue;

      const qty = num(it?.quantity);
      const code = String(it?.itemCode || "").trim();
      const name = String(it?.productName || "").trim();
      if (!qty && !code && !name) continue;

      const eff = disposalDateOf(it, reportDate, changeIndex, "customer", useChangeDates);
      const date = eff.date;
      if (period && monthKeyOf(date) !== period) continue;
      if (from && date < from) continue;
      if (to && date > to) continue;

      out.push({
        source: "customer",
        recordId: rec?.id || rec?._id || "",
        date,
        reportDate,
        dateFrom: eff.from,
        changedAt: eff.changedAt,
        dateShifted: date !== reportDate,
        branch: "",
        customer: String(it?.customerName || "").trim(),
        code,
        product: name,
        origin: String(it?.origin || "").trim(),
        uom: normalizeUom(resolveOption(it?.qtyType, it?.customQtyType)),
        qty,
        action: label,
        rawAction: action,
        remarks: String(it?.remarks || "").trim(),
        carNumber: String(it?.carNumber || "").trim(),
        driverName: String(it?.driverName || "").trim(),
        expiry: String(it?.expiry || "").trim(),
        images: safeArr(it?.images).length,
      });
    }
  }
  return out;
}

/* ============================================================
   Day × product reconciliation
   ============================================================
   One row per day, per product, per unit family - the shape the question is
   actually asked in: "on the 3rd of August, how much HUMMUS did Odoo destroy
   and how much did the branches return for destruction?". Branch is a
   dimension you can switch on; with it off, a product destroyed in three
   branches on one day is one line, which is how the monthly figure is read.

   `dayWindow` exists because the two systems date the same event differently:
   the branch writes the return on the day it came back, Odoo posts the
   voucher when the store clears it, often a day or two later. Pairing inside
   a window turns those from "missing on both sides" into one line that says
   how many days apart the two entries are. */

const dayShift = (iso, delta) => {
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + Number(delta || 0));
  return d.toISOString().slice(0, 10);
};

export const DAY_STATUS = {
  MATCH: "match",
  QTY_DIFF: "qty_diff",
  ODOO_ONLY: "odoo_only",
  RETURNS_ONLY: "returns_only",
};

export const DAY_STATUS_META = {
  [DAY_STATUS.MATCH]:        { label: "Matched",           ar: "مطابق",            color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", icon: "✓" },
  [DAY_STATUS.QTY_DIFF]:     { label: "Quantity differs",  ar: "فرق بالكمية",      color: "#b45309", bg: "#fffbeb", border: "#fde68a", icon: "≠" },
  [DAY_STATUS.ODOO_ONLY]:    { label: "Only in Odoo",      ar: "في أودو فقط",      color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", icon: "!" },
  [DAY_STATUS.RETURNS_ONLY]: { label: "Only in returns", ar: "في المرتجعات فقط", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: "★" },
};

/* `unitMode`:
     "family" — a product returned in KG and a product returned in PLATE are
                two lines, which is the correct default: adding them is
                meaningless and the split exposes the disagreement.
     "merge"  — one line per product per day whatever the unit. Needed here
                because branches and customers routinely type KG for a salad
                Odoo posts in PLATE; merging turns two half-lines that both
                look wrong into one line that says "25 against 25, units
                disagree". The row keeps every unit it saw either way. */
function groupEntries(entries, splitByBranch, side, unitMode) {
  const map = new Map(); // groupKey -> Map(date -> bucket)
  for (const e of safeArr(entries)) {
    const fam = unitFamily(e.uom);
    const codeKey = productCodeKey(e.code, e.product) || normKey(e.product) || "?";
    const bKey = splitByBranch ? branchKeyOf(e.branch) : "";
    const groupKey = `${bKey}||${codeKey}||${unitMode === "merge" ? "*" : fam}`;
    const date = String(e.date || "").slice(0, 10);
    if (!date) continue;

    let byDate = map.get(groupKey);
    if (!byDate) { byDate = new Map(); map.set(groupKey, byDate); }
    let b = byDate.get(date);
    if (!b) {
      b = {
        groupKey, date, fam, codeKey,
        code: e.code || "", product: e.product || "", category: e.category || "",
        branches: new Set(), units: new Set(), fams: new Set(), sources: new Set(), customers: new Set(),
        qty: 0, lines: [],
      };
      byDate.set(date, b);
    }
    b.qty += num(e.qty);
    if (e.dateShifted) b.shiftedLines = (b.shiftedLines || 0) + 1;
    if (e.branch) b.branches.add(e.branch);
    if (e.source) b.sources.add(e.source);
    if (e.customer) b.customers.add(e.customer);
    b.units.add(normalizeUom(e.uom));
    b.fams.add(fam);
    if (!b.code && e.code) b.code = e.code;
    if (!b.product && e.product) b.product = e.product;
    if (!b.category && e.category) b.category = e.category;
    b.lines.push(side === "odoo"
      ? { date: e.date, branch: e.branch, ref: e.reference, qty: num(e.qty), uom: normalizeUom(e.uom), category: e.category, remarks: e.remarks, srcRow: e.srcRow }
      : {
          date: e.date, reportDate: e.reportDate || e.date, dateFrom: e.dateFrom || "report",
          changedAt: e.changedAt || "", source: e.source || "branch", branch: e.branch, customer: e.customer || "",
          qty: num(e.qty), uom: normalizeUom(e.uom), action: e.action, remarks: e.remarks,
          transferNo: e.transferNo, expiry: e.expiry, images: e.images, recordId: e.recordId,
        });
  }
  return map;
}

/**
 * Reconcile the Odoo disposal file against the returns register.
 *
 * @param {Array}  odooRows  rows from `buildRows()`
 * @param {Array}  mineRows  entries from `flattenReturnsRecords()`
 * @param {Object} opts      { splitByBranch, dayWindow, tolerance }
 */
/** Product codes the comparison should ignore, as a lookup set. */
export function excludeSet(list) {
  const s = new Set();
  for (const e of safeArr(list)) {
    const code = productCodeKey(typeof e === "string" ? e : e?.code, typeof e === "string" ? "" : e?.product);
    if (code) s.add(code);
  }
  return s;
}

export function buildDailyComparison(odooRows, mineRows, opts = {}) {
  const splitByBranch = !!opts.splitByBranch;
  const dayWindow = Math.max(0, Math.min(7, Number(opts.dayWindow) || 0));
  const tolerance = Number.isFinite(Number(opts.tolerance)) ? Number(opts.tolerance) : 0.005;
  const unitMode = opts.unitMode === "merge" ? "merge" : "family";

  /* Excluded products leave BOTH sides, so an item somebody decided not to
     reconcile (a consumable, a sachet, a line Odoo posts under a rule of its
     own) stops distorting the counts instead of merely being hidden. */
  const skip = opts.exclude instanceof Set ? opts.exclude : excludeSet(opts.exclude);
  const keep = (r) => !skip.size || !skip.has(productCodeKey(r.code, r.product) || normKey(r.product));
  const odooKept = safeArr(odooRows).filter(keep);
  const mineKept = safeArr(mineRows).filter(keep);
  const excludedLines = safeArr(odooRows).length - odooKept.length + safeArr(mineRows).length - mineKept.length;

  const A = groupEntries(odooKept, splitByBranch, "odoo", unitMode);
  const B = groupEntries(mineKept, splitByBranch, "mine", unitMode);

  const usedMine = new Set(); // `${groupKey}||${date}`
  const rows = [];

  const pushRow = (o, m, shift) => {
    const odooQty = num(o?.qty);
    const mineQty = num(m?.qty);
    const diff = mineQty - odooQty;
    let status;
    if (o && !m) status = DAY_STATUS.ODOO_ONLY;
    else if (!o && m) status = DAY_STATUS.RETURNS_ONLY;
    else if (Math.abs(diff) <= tolerance) status = DAY_STATUS.MATCH;
    else status = DAY_STATUS.QTY_DIFF;

    const branches = new Set([...(o?.branches || []), ...(m?.branches || [])]);
    const units = new Set([...(o?.units || []), ...(m?.units || [])]);
    const sources = new Set(m?.sources || []);
    const customers = new Set(m?.customers || []);
    /* With units merged a line can hold both weights and counts; it is then
       reported under its own combined family so no total ever adds them. */
    const fams = [...new Set([...(o?.fams || []), ...(m?.fams || [])])].sort();

    rows.push({
      key: `${o?.groupKey || m?.groupKey}||${o?.date || m?.date}||${m?.date || ""}`,
      date: o?.date || m?.date || "",
      odooDate: o?.date || "",
      mineDate: m?.date || "",
      shiftDays: Number(shift || 0),
      code: o?.code || m?.code || "",
      codeKey: o?.codeKey || m?.codeKey || "",
      product: o?.product || m?.product || "",
      category: o?.category || m?.category || "",
      branch: branches.size === 1 ? [...branches][0] : (branches.size ? `${branches.size} branches` : "—"),
      branches: [...branches].sort(),
      sources: SOURCES.filter((x) => sources.has(x)),
      customers: [...customers].sort(),
      datedByChange: num(m?.shiftedLines),
      fam: fams.length ? fams.join(" + ") : (o?.fam || m?.fam || "—"),
      fams,
      units: [...units].sort(),
      unitMismatch: units.size > 1,
      odooQty,
      mineQty,
      diff,
      absDiff: Math.abs(diff),
      odooLines: safeArr(o?.lines),
      mineLines: safeArr(m?.lines),
      actions: Array.from(new Set(safeArr(m?.lines).map((l) => l.action).filter(Boolean))),
      status,
    });
  };

  /* 1 — same product, same day. */
  for (const [groupKey, byDate] of A) {
    const mineDates = B.get(groupKey);
    for (const [date, o] of byDate) {
      const m = mineDates?.get(date);
      if (m) {
        usedMine.add(`${groupKey}||${date}`);
        pushRow(o, m, 0);
      }
    }
  }

  /* 2 — same product, a day or two apart (nearest first). */
  for (const [groupKey, byDate] of A) {
    const mineDates = B.get(groupKey);
    for (const [date, o] of byDate) {
      if (mineDates?.get(date)) continue; // already paired above
      let paired = null;
      if (dayWindow && mineDates) {
        for (let step = 1; step <= dayWindow && !paired; step++) {
          for (const delta of [-step, step]) {
            const d2 = dayShift(date, delta);
            const cand = mineDates.get(d2);
            if (cand && !usedMine.has(`${groupKey}||${d2}`)) {
              usedMine.add(`${groupKey}||${d2}`);
              paired = { m: cand, shift: delta };
              break;
            }
          }
        }
      }
      pushRow(o, paired?.m || null, paired?.shift || 0);
    }
  }

  /* 3 — whatever the returns register still holds alone. */
  for (const [groupKey, byDate] of B) {
    for (const [date, m] of byDate) {
      if (usedMine.has(`${groupKey}||${date}`)) continue;
      pushRow(null, m, 0);
    }
  }

  /* ── per-day roll-up, the spine of the date tree ── */
  const dayMap = new Map();
  for (const r of rows) {
    let g = dayMap.get(r.date);
    if (!g) {
      g = {
        date: r.date, rows: 0, match: 0, qtyDiff: 0, odooOnly: 0, returnsOnly: 0,
        byFam: new Map(), products: new Set(),
      };
      dayMap.set(r.date, g);
    }
    g.rows += 1;
    g.products.add(r.codeKey);
    if (r.status === DAY_STATUS.MATCH) g.match += 1;
    else if (r.status === DAY_STATUS.QTY_DIFF) g.qtyDiff += 1;
    else if (r.status === DAY_STATUS.ODOO_ONLY) g.odooOnly += 1;
    else g.returnsOnly += 1;

    const f = g.byFam.get(r.fam) || { fam: r.fam, odoo: 0, mine: 0 };
    f.odoo += r.odooQty;
    f.mine += r.mineQty;
    g.byFam.set(r.fam, f);
  }
  const days = Array.from(dayMap.values())
    .map((g) => ({
      ...g,
      products: g.products.size,
      clean: g.qtyDiff + g.odooOnly + g.returnsOnly === 0,
      issues: g.qtyDiff + g.odooOnly + g.returnsOnly,
      byFam: Array.from(g.byFam.values())
        .map((f) => ({ ...f, diff: f.mine - f.odoo }))
        .sort((a, b) => String(a.fam).localeCompare(String(b.fam))),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  /* ── per-branch roll-up ── */
  const bMap = new Map();
  for (const r of rows) {
    for (const b of r.branches.length ? r.branches : ["—"]) {
      let g = bMap.get(b);
      if (!g) g = { branch: b, rows: 0, match: 0, qtyDiff: 0, odooOnly: 0, returnsOnly: 0, odooQty: 0, mineQty: 0 };
      g.rows += 1;
      if (r.status === DAY_STATUS.MATCH) g.match += 1;
      else if (r.status === DAY_STATUS.QTY_DIFF) g.qtyDiff += 1;
      else if (r.status === DAY_STATUS.ODOO_ONLY) g.odooOnly += 1;
      else g.returnsOnly += 1;
      g.odooQty += r.odooQty;
      g.mineQty += r.mineQty;
      bMap.set(b, g);
    }
  }
  const branches = Array.from(bMap.values())
    .map((g) => ({ ...g, diff: g.mineQty - g.odooQty, matchRate: g.rows ? Math.round((g.match / g.rows) * 100) : 0 }))
    .sort((a, b) => b.rows - a.rows);

  /* ── per-product roll-up ── */
  const pMap = new Map();
  for (const r of rows) {
    const k = `${r.codeKey}||${r.fam}`;
    let g = pMap.get(k);
    if (!g) g = { key: k, code: r.code, product: r.product, fam: r.fam, days: 0, odooQty: 0, mineQty: 0, match: 0, issues: 0 };
    g.days += 1;
    g.odooQty += r.odooQty;
    g.mineQty += r.mineQty;
    if (r.status === DAY_STATUS.MATCH) g.match += 1; else g.issues += 1;
    if (!g.product && r.product) g.product = r.product;
    pMap.set(k, g);
  }
  const products = Array.from(pMap.values())
    .map((g) => ({ ...g, diff: g.mineQty - g.odooQty, absDiff: Math.abs(g.mineQty - g.odooQty) }))
    .sort((a, b) => b.absDiff - a.absDiff);

  const famTotals = new Map();
  for (const r of rows) {
    const f = famTotals.get(r.fam) || { fam: r.fam, odoo: 0, mine: 0 };
    f.odoo += r.odooQty;
    f.mine += r.mineQty;
    famTotals.set(r.fam, f);
  }

  const totals = {
    rows: rows.length,
    days: days.length,
    match: rows.filter((r) => r.status === DAY_STATUS.MATCH).length,
    qtyDiff: rows.filter((r) => r.status === DAY_STATUS.QTY_DIFF).length,
    odooOnly: rows.filter((r) => r.status === DAY_STATUS.ODOO_ONLY).length,
    returnsOnly: rows.filter((r) => r.status === DAY_STATUS.RETURNS_ONLY).length,
    shifted: rows.filter((r) => r.shiftDays).length,
    odooLines: odooKept.length,
    mineLines: mineKept.length,
    excludedLines,
    datedByChange: rows.filter((r) => r.datedByChange).length,
    byFam: Array.from(famTotals.values()).map((f) => ({ ...f, diff: f.mine - f.odoo })),
  };
  totals.matchRate = totals.rows ? Math.round((totals.match / totals.rows) * 100) : 0;

  return { rows, days, branches, products, totals, splitByBranch, dayWindow, tolerance, unitMode };
}
