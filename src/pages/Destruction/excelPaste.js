// src/pages/Destruction/excelPaste.js
//
// Excel → table paste support for the Condemnation & Disposal register.
//
// The store teams keep their condemnation lists in Excel and used to retype
// every line here. Two entry points cover that:
//   • a single column of item codes pasted straight into the ITEM CODE cell
//     (fill-down, see parseClipboard / matrixIsSingleColumn)
//   • a whole block pasted into the import modal, where each column is mapped
//     to a field and previewed before it touches the table
//
// Nothing here talks to the server or to React — it is pure text → row work so
// the input page keeps one place for state.

import {
  METHODS,
  OTHER,
  REASONS,
  blankItem,
  isCustomReason,
} from "./destructionOptions";

/* ───────── unit of measure ─────────
   The catalog carries the ERP unit; this register offers KG / PCS / CTN / LTR
   and keeps anything else verbatim in the "Other..." field. */
export const UOM_TO_QTY = {
  KG: "KG",
  KGS: "KG",
  KILO: "KG",
  KILOS: "KG",
  KILOGRAM: "KG",
  KILOGRAMS: "KG",
  PIECES: "PCS",
  PIECE: "PCS",
  PCS: "PCS",
  PC: "PCS",
  EA: "PCS",
  EACH: "PCS",
  UNITS: "PCS",
  UNIT: "PCS",
  CTN: "CTN",
  CARTON: "CTN",
  CARTONS: "CTN",
  BOX: "CTN",
  BOXES: "CTN",
  LTR: "LTR",
  LITRE: "LTR",
  LITRES: "LTR",
  LITER: "LTR",
  LITERS: "LTR",
  L: "LTR",
};

export function qtyTypeFromUom(uom) {
  const u = String(uom || "").trim().toUpperCase();
  if (!u) return null;
  if (UOM_TO_QTY[u]) return { qtyType: UOM_TO_QTY[u], customQtyType: "" };
  return { qtyType: OTHER, customQtyType: u };
}

/* ───────── clipboard → matrix ───────── */

/** Split one delimited line, honouring Excel's "quoted cell" convention. */
function splitLine(line, sep) {
  const out = [];
  let cur = "";
  let quoted = false;
  const QUOTE = String.fromCharCode(34);
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quoted) {
      if (ch === QUOTE) {
        if (line[i + 1] === QUOTE) {
          cur += QUOTE;
          i += 1;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === QUOTE) quoted = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Tab when Excel put one there, otherwise a comma when the source is a CSV. */
function detectSeparator(lines) {
  if (lines.some((l) => l.includes("\t"))) return "\t";
  const withComma = lines.filter((l) => l.includes(","));
  if (withComma.length && withComma.length >= lines.length - 1) return ",";
  return null;
}

/**
 * Clipboard text → a rectangular matrix of trimmed strings.
 * Empty lines are dropped and short lines are padded: a mapping is per column,
 * so a ragged row would shift every field after the gap.
 */
export function parseClipboard(text) {
  const raw = String(text ?? "").replace(/\r\n?/g, "\n");
  const lines = raw.split("\n").filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const sep = detectSeparator(lines);
  const rows = lines.map((l) => (sep ? splitLine(l, sep) : [l.trim()]));
  const width = rows.reduce((w, r) => Math.max(w, r.length), 0);
  return rows
    .map((r) => {
      const padded = r.slice(0, width);
      while (padded.length < width) padded.push("");
      return padded;
    })
    .filter((r) => r.some((c) => c !== ""));
}

export function matrixIsSingleColumn(matrix) {
  return matrix.length > 0 && matrix.every((r) => r.filter((c) => c !== "").length <= 1);
}

/** The first non-empty cell of every line — the "just the codes column" case. */
export function firstColumn(matrix) {
  return matrix.map((r) => r.find((c) => c !== "") || "").filter((v) => v !== "");
}

/* ───────── values ───────── */

/** "1,250.50 AED" → 1250.5 ; anything unreadable → "". */
export function parseNumber(v) {
  const s = String(v ?? "")
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");
  if (!s || s === "-" || s === ".") return "";
  const n = Number(s);
  return Number.isFinite(n) ? n : "";
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Excel date cell → "YYYY-MM-DD" for the native date inputs.
 * Day-first is assumed (the region writes 05/09/2026 for 5 September); a first
 * number above 12 says it was month-first after all. "5-Sep-26" and the plain
 * Excel serial number are read too.
 */
export function parseDate(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";

  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`;

  const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmy) {
    let d = dmy[1];
    let m = dmy[2];
    const y = dmy[3];
    if (Number(m) > 12 && Number(d) <= 12) {
      const swap = d;
      d = m;
      m = swap;
    }
    if (Number(m) > 12 || Number(d) > 31) return "";
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    return `${year}-${pad(m)}-${pad(d)}`;
  }

  const named = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,4})[-/ ](\d{2,4})/);
  if (named) {
    const m = MONTHS[named[2].toLowerCase()];
    if (m) {
      const year = named[3].length === 2 ? 2000 + Number(named[3]) : Number(named[3]);
      return `${year}-${pad(m)}-${pad(named[1])}`;
    }
  }

  /* Excel serial (days since 1899-12-30) — what a raw cell copy sometimes
     gives. Kept inside 2000–2050 so a five-digit item code is not read as a
     date. */
  if (/^\d{5}$/.test(s) && Number(s) >= 36526 && Number(s) <= 54789) {
    const d = new Date((Number(s) - 25569) * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return "";
}

/** Match free text against a bilingual option list ("English / عربي"). */
function matchOption(list, value) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const low = s.toLowerCase();
  const exact = list.find((o) => o.toLowerCase() === low);
  if (exact) return exact;
  if (low.length < 3) return s;
  const partial = list.find((o) => {
    if (o === OTHER) return false;
    const en = o.split("/")[0].trim().toLowerCase();
    return en === low || en.includes(low) || low.includes(en) || o.toLowerCase().includes(low);
  });
  return partial || s; // unmatched text is kept verbatim (free-text reason / method)
}

/* ───────── column mapping ───────── */

export const FIELDS = [
  { key: "ignore", label: "— ignore —" },
  { key: "itemCode", label: "Item code" },
  { key: "productName", label: "Product name" },
  { key: "batchNo", label: "Batch / lot" },
  { key: "productionDate", label: "Production date" },
  { key: "expiry", label: "Expiry date" },
  { key: "quantity", label: "Quantity" },
  { key: "qtyType", label: "Unit" },
  { key: "unitCost", label: "Unit cost" },
  { key: "reason", label: "Reason" },
  { key: "method", label: "Method" },
  { key: "remarks", label: "Remarks" },
];

const HEADER_HINTS = [
  ["itemCode", ["item code", "itemcode", "item no", "code", "sku", "product code", "كود", "الكود", "رمز"]],
  ["productName", ["product", "description", "item name", "material", "اسم", "الصنف", "المنتج", "الوصف"]],
  ["batchNo", ["batch", "lot", "دفعة", "التشغيلة"]],
  ["productionDate", ["prod", "production", "manufactur", "mfg", "انتاج", "الإنتاج"]],
  ["expiry", ["expiry", "expire", "exp date", "best before", "انتهاء", "الصلاحية"]],
  ["quantity", ["qty", "quantity", "weight", "kg", "الكمية", "كمية", "الوزن"]],
  ["qtyType", ["uom", "unit of measure", "unit", "الوحدة"]],
  ["unitCost", ["cost", "price", "rate", "value", "amount", "السعر", "التكلفة", "القيمة"]],
  ["reason", ["reason", "cause", "السبب", "سبب"]],
  ["method", ["method", "disposal", "الطريقة", "طريقة"]],
  ["remarks", ["remark", "note", "comment", "ملاحظ"]],
];

function headerField(cell) {
  const s = String(cell ?? "").trim().toLowerCase();
  if (!s) return "";
  for (const pair of HEADER_HINTS) {
    if (pair[1].some((w) => s.includes(w))) return pair[0];
  }
  return "";
}

/** A first line that names its columns rather than carrying data. */
export function looksLikeHeader(cells, isKnownCode) {
  const filled = (cells || []).filter((c) => c !== "");
  if (!filled.length) return false;
  const named = filled.filter((c) => headerField(c)).length;
  const codes = filled.filter((c) => isKnownCode && isKnownCode(c)).length;
  const numbers = filled.filter((c) => parseNumber(c) !== "").length;
  return codes === 0 && numbers === 0 && named >= Math.max(1, Math.ceil(filled.length / 2));
}

/**
 * Guess what each column holds.
 * Header words win; a column with no usable header is judged by its content —
 * how many of its cells are real catalog codes, dates, units or numbers.
 */
export function guessMapping(matrix, opts) {
  const headerRow = !!(opts && opts.headerRow);
  const isKnownCode = opts && opts.isKnownCode;
  const width = (matrix[0] && matrix[0].length) || 0;
  const body = headerRow ? matrix.slice(1) : matrix;
  const mapping = new Array(width).fill("ignore");
  const taken = new Set();

  const assign = (col, field) => {
    if (!field || field === "ignore" || taken.has(field)) return false;
    mapping[col] = field;
    taken.add(field);
    return true;
  };

  if (headerRow) {
    for (let c = 0; c < width; c += 1) assign(c, headerField(matrix[0][c]));
  }

  const share = (col, test) => {
    let hits = 0;
    let seen = 0;
    for (const r of body) {
      const v = r[col];
      if (!v) continue;
      seen += 1;
      if (test(v)) hits += 1;
    }
    return seen ? hits / seen : 0;
  };

  // strongest signal first: the column that really is in the catalog
  if (!taken.has("itemCode")) {
    let best = -1;
    let bestScore = 0.5;
    for (let c = 0; c < width; c += 1) {
      if (mapping[c] !== "ignore") continue;
      const score = share(c, (v) => !!(isKnownCode && isKnownCode(v)));
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (best >= 0) assign(best, "itemCode");
  }

  for (let c = 0; c < width; c += 1) {
    if (mapping[c] !== "ignore") continue;
    /* a date is only guessed from a written date — a bare number stays a
       number, so a column of unknown item codes is never read as dates */
    if (share(c, (v) => /[-/.]|[A-Za-z]/.test(v) && parseDate(v) !== "") > 0.6) {
      if (!assign(c, "expiry")) assign(c, "productionDate");
      continue;
    }
    if (share(c, (v) => {
      const q = qtyTypeFromUom(v);
      return !!q && q.qtyType !== OTHER;
    }) > 0.6) {
      assign(c, "qtyType");
      continue;
    }
    if (share(c, (v) => parseNumber(v) !== "") > 0.7) {
      if (!assign(c, "quantity")) assign(c, "unitCost");
      continue;
    }
    if (!taken.has("itemCode") && share(c, (v) => /^[\w-]{3,20}$/.test(v)) > 0.7) {
      assign(c, "itemCode");
      continue;
    }
    assign(c, "productName");
  }

  return mapping;
}

/* ───────── matrix → table rows ───────── */

/**
 * Build one register row out of one pasted line.
 * `lookupCode` returns the catalog item, so the product name and the unit come
 * from the same source the typed field uses. A code with no catalog match keeps
 * whatever name was pasted and is flagged for the preview.
 */
export function buildRow(cells, mapping, ctx) {
  const lookupCode = ctx && ctx.lookupCode;
  const lookupName = ctx && ctx.lookupName;
  const row = blankItem();
  /* Which fields the pasted line actually carried — a fill-down over existing
     rows must not blank out what the block never mentioned. */
  const given = new Set();
  const get = (field) => {
    const col = mapping.indexOf(field);
    const v = col >= 0 ? String(cells[col] ?? "").trim() : "";
    if (v) given.add(field);
    return v;
  };

  const code = get("itemCode");
  const pastedName = get("productName");
  const hit =
    (code && lookupCode && lookupCode(code)) ||
    (pastedName && lookupName && lookupName(pastedName)) ||
    null;

  row.itemCode = hit ? hit.item_code : code;
  row.productName = hit ? hit.description : pastedName;

  row.batchNo = get("batchNo");
  row.productionDate = parseDate(get("productionDate"));
  row.expiry = parseDate(get("expiry"));

  const qty = parseNumber(get("quantity"));
  row.quantity = qty === "" ? "" : String(qty);
  const cost = parseNumber(get("unitCost"));
  row.unitCost = cost === "" ? "" : String(cost);

  const unit = qtyTypeFromUom(get("qtyType")) || (hit ? qtyTypeFromUom(hit.uom) : null);
  if (unit) {
    row.qtyType = unit.qtyType;
    row.customQtyType = unit.customQtyType;
  }

  const reason = matchOption(REASONS, get("reason"));
  if (reason) {
    row.reasons = [reason];
    row.reason = isCustomReason(reason) ? OTHER : reason;
    row.customReason = isCustomReason(reason) ? reason : "";
  }

  const method = matchOption(METHODS, get("method"));
  if (method) {
    if (METHODS.includes(method)) row.method = method;
    else {
      row.method = OTHER;
      row.customMethod = method;
    }
  }

  row.remarks = get("remarks");

  /* The item code owns the product name, blank included; everything else is
     patched only when the pasted line said something about it. */
  const patch = { itemCode: row.itemCode, productName: row.productName };
  const carry = ["batchNo", "productionDate", "expiry", "quantity", "unitCost", "remarks"];
  for (const f of carry) if (given.has(f) && row[f] !== "") patch[f] = row[f];
  if (given.has("qtyType") || hit) {
    patch.qtyType = row.qtyType;
    patch.customQtyType = row.customQtyType;
  }
  if (given.has("reason")) {
    patch.reasons = row.reasons;
    patch.reason = row.reason;
    patch.customReason = row.customReason;
  }
  if (given.has("method")) {
    patch.method = row.method;
    patch.customMethod = row.customMethod;
  }

  return { row, patch, matched: !!hit, hasCode: !!code };
}

export function buildRows(matrix, mapping, ctx) {
  return matrix.map((cells) => buildRow(cells, mapping, ctx));
}
