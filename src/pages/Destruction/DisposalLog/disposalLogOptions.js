// src/pages/Destruction/DisposalLog/disposalLogOptions.js
//
// سجل الإعدام الشهري من أودو — Odoo Monthly Disposal Log.
//
// This register is deliberately SEPARATE from `destruction_record`:
//   • `destruction_record`  = what QA condemned (our own system, with evidence)
//   • `odoo_disposal_log`   = what the store team exported from Odoo and printed
// The whole point of this module is to reconcile the two, so the two data sets
// must never be merged into one report type.
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
        recordId: rec?.id || rec?._id || "",
        date,
        branch,
        code,
        product: name,
        uom: normalizeUom(resolveOption(it?.qtyType, it?.customQtyType)),
        qty,
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
   The reconciliation engine
   ============================================================ */

export const STATUS = {
  MATCH: "match",
  QTY_DIFF: "qty_diff",
  ODOO_ONLY: "odoo_only", // in the store file, missing from our condemnation register
  MINE_ONLY: "mine_only", // we condemned it, the store file does not show it
};

export const STATUS_META = {
  [STATUS.MATCH]:     { label: "Matched",            ar: "مطابق",              color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", icon: "✓" },
  [STATUS.QTY_DIFF]:  { label: "Quantity differs",   ar: "فرق في الكمية",      color: "#b45309", bg: "#fffbeb", border: "#fde68a", icon: "≠" },
  [STATUS.ODOO_ONLY]: { label: "Only in Odoo file",  ar: "في ملف أودو فقط",    color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", icon: "!" },
  [STATUS.MINE_ONLY]: { label: "Only in my records", ar: "في سجلي فقط",        color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: "★" },
};

function entryKeys(e, mode) {
  const bk = branchKeyOf(e.branch);
  const ck = productCodeKey(e.code, e.product);
  const nk = normKey(e.product);
  const bucket = mode === "day" ? String(e.date || "").slice(0, 10) : "";
  return {
    bucket,
    branchKey: bk,
    codeKey: ck || nk || "?",
    nameKey: nk,
    key: `${bk}||${bucket}||${ck || nk || "?"}`,
    nameLookup: `${bk}||${bucket}||#${nk}`,
  };
}

function aggregate(entries, mode, side) {
  const map = new Map();
  const byName = new Map();
  for (const e of safeArr(entries)) {
    const k = entryKeys(e, mode);
    let g = map.get(k.key);
    if (!g) {
      g = {
        key: k.key,
        bucket: k.bucket,
        branch: e.branch || "—",
        branchKey: k.branchKey,
        code: e.code || "",
        codeKey: k.codeKey,
        product: e.product || "",
        category: e.category || "",
        qty: 0,
        lines: 0,
        units: new Map(),
        details: [],
        nameKeys: new Set(),
      };
      map.set(k.key, g);
    }
    g.qty += num(e.qty);
    g.lines += 1;
    g.units.set(e.uom, num(g.units.get(e.uom)) + num(e.qty));
    g.nameKeys.add(k.nameKey);
    if (!g.product && e.product) g.product = e.product;
    if (!g.code && e.code) g.code = e.code;
    if (!g.category && e.category) g.category = e.category;
    g.details.push(
      side === "odoo"
        ? { date: e.date, ref: e.reference, qty: num(e.qty), uom: e.uom, category: e.category, remarks: e.remarks }
        : { date: e.date, qty: num(e.qty), uom: e.uom, reason: e.reason, method: e.method, batchNo: e.batchNo, expiry: e.expiry, images: e.images, recordId: e.recordId }
    );
    if (k.nameKey) byName.set(k.nameLookup, k.key);
  }
  return { map, byName };
}

function unitRows(odooUnits, mineUnits) {
  const units = new Set([...(odooUnits?.keys() || []), ...(mineUnits?.keys() || [])]);
  return Array.from(units).sort().map((u) => {
    const o = num(odooUnits?.get(u));
    const m = num(mineUnits?.get(u));
    return { unit: u, odoo: o, mine: m, diff: m - o };
  });
}

/**
 * Reconcile one imported Odoo month against our own condemnation records.
 *
 * @param {Array}  odooRows   normalized rows from `buildRows()` (already month-scoped)
 * @param {Array}  mineRows   entries from `flattenDestructionRecords()`
 * @param {Object} opts       { mode: "month"|"day", tolerance: number }
 */
export function buildComparison(odooRows, mineRows, opts = {}) {
  const mode = opts.mode === "day" ? "day" : "month";
  const tolerance = Number.isFinite(Number(opts.tolerance)) ? Number(opts.tolerance) : 0.005;

  const odoo = aggregate(odooRows, mode, "odoo");
  const mine = aggregate(mineRows, mode, "mine");

  /* Pair up by key, then rescue leftovers by product name. */
  const pairs = new Map(); // key → { o, m, matchedBy }
  for (const [key, o] of odoo.map) pairs.set(key, { o, m: null, matchedBy: "code" });
  for (const [key, m] of mine.map) {
    const p = pairs.get(key);
    if (p) {
      p.m = m;
      continue;
    }
    let rescued = null;
    for (const nk of m.nameKeys) {
      const cand = odoo.byName.get(`${m.branchKey}||${m.bucket}||#${nk}`);
      if (cand && pairs.get(cand) && !pairs.get(cand).m) {
        rescued = cand;
        break;
      }
    }
    if (rescued) {
      const p2 = pairs.get(rescued);
      p2.m = m;
      p2.matchedBy = "name";
    } else {
      pairs.set(key, { o: null, m, matchedBy: "code" });
    }
  }

  const rows = [];
  for (const [key, { o, m, matchedBy }] of pairs) {
    const units = unitRows(o?.units, m?.units);
    const odooQty = num(o?.qty);
    const mineQty = num(m?.qty);
    const diff = mineQty - odooQty;
    const unitMismatch = !!o && !!m && units.some((u) => (u.odoo === 0) !== (u.mine === 0));

    let status;
    if (o && !m) status = STATUS.ODOO_ONLY;
    else if (!o && m) status = STATUS.MINE_ONLY;
    else if (Math.abs(diff) <= tolerance && !unitMismatch) status = STATUS.MATCH;
    else status = STATUS.QTY_DIFF;

    rows.push({
      key,
      bucket: o?.bucket || m?.bucket || "",
      branch: o?.branch || m?.branch || "—",
      branchKey: o?.branchKey || m?.branchKey || "",
      code: o?.code || m?.code || "",
      codeKey: o?.codeKey || m?.codeKey || "",
      product: o?.product || m?.product || "",
      category: o?.category || m?.category || "",
      units,
      odooQty,
      mineQty,
      diff,
      absDiff: Math.abs(diff),
      odooLines: num(o?.lines),
      mineLines: num(m?.lines),
      odooDetails: safeArr(o?.details),
      mineDetails: safeArr(m?.details),
      unitMismatch,
      matchedBy: o && m ? matchedBy : "",
      status,
    });
  }

  rows.sort((a, b) => {
    const order = { [STATUS.ODOO_ONLY]: 0, [STATUS.QTY_DIFF]: 1, [STATUS.MINE_ONLY]: 2, [STATUS.MATCH]: 3 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (b.absDiff !== a.absDiff) return b.absDiff - a.absDiff;
    return String(a.branch).localeCompare(String(b.branch));
  });

  /* ── per-branch roll-up ── */
  const bMap = new Map();
  for (const r of rows) {
    const b = r.branch || "—";
    let g = bMap.get(b);
    if (!g) {
      g = {
        branch: b, odooQty: 0, mineQty: 0, lines: 0,
        match: 0, qtyDiff: 0, odooOnly: 0, mineOnly: 0,
        odooLines: 0, mineLines: 0,
      };
      bMap.set(b, g);
    }
    g.lines += 1;
    g.odooQty += r.odooQty;
    g.mineQty += r.mineQty;
    g.odooLines += r.odooLines;
    g.mineLines += r.mineLines;
    if (r.status === STATUS.MATCH) g.match += 1;
    else if (r.status === STATUS.QTY_DIFF) g.qtyDiff += 1;
    else if (r.status === STATUS.ODOO_ONLY) g.odooOnly += 1;
    else g.mineOnly += 1;
  }
  const branches = Array.from(bMap.values())
    .map((g) => ({
      ...g,
      diff: g.mineQty - g.odooQty,
      coverage: g.lines ? Math.round(((g.match + g.qtyDiff) / g.lines) * 100) : 0,
    }))
    .sort((a, b) => b.odooQty - a.odooQty);

  const totals = {
    rows: rows.length,
    match: rows.filter((r) => r.status === STATUS.MATCH).length,
    qtyDiff: rows.filter((r) => r.status === STATUS.QTY_DIFF).length,
    odooOnly: rows.filter((r) => r.status === STATUS.ODOO_ONLY).length,
    mineOnly: rows.filter((r) => r.status === STATUS.MINE_ONLY).length,
    odooQty: rows.reduce((s, r) => s + r.odooQty, 0),
    mineQty: rows.reduce((s, r) => s + r.mineQty, 0),
    odooLines: safeArr(odooRows).length,
    mineLines: safeArr(mineRows).length,
  };
  totals.diff = totals.mineQty - totals.odooQty;
  totals.matchRate = totals.rows ? Math.round((totals.match / totals.rows) * 100) : 0;
  totals.coverage = totals.rows
    ? Math.round(((totals.match + totals.qtyDiff) / Math.max(1, totals.match + totals.qtyDiff + totals.odooOnly)) * 100)
    : 0;

  return { mode, tolerance, rows, branches, totals };
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
