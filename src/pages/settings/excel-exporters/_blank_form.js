// src/pages/settings/excel-exporters/_blank_form.js
// 📄 Blank (unfilled) twin of any input report — the printable sheet a
//    supervisor takes to the floor before anything has been recorded.
//
// The hard part is that most exporters derive their columns from the data they
// are given: hand an exporter an empty payload and you get a document header
// over an empty page. So a blank form is not built from nothing — it is built
// from ONE real record of that type with every *answer* wiped out and every
// *label* left standing:
//
//   kept    → the checklist questions, cooler names, time-slot headings,
//             units, limits, document-control header (title, doc no, revision)
//   cleared → temperatures, readings, ticks, names of people, signatures,
//             remarks, dates, quantities, statuses
//
// That is exactly the difference between a form and a filled form, and it means
// a new field added to a screen shows up on the blank sheet with no extra work.
//
// When a type has no records at all, there is nothing to learn the shape from,
// so we fall back to a skeleton payload carrying the array keys the exporters
// look for. Exporters whose columns are hard-coded (most of the per-branch
// sheets) still render a complete, correct blank form from it.

/* ═══════════════════════════════════════════════════════════════
   WHAT COUNTS AS A LABEL
   ═══════════════════════════════════════════════════════════════
   A key whose value names the row or the column rather than answering it.
   Wiping these would leave an anonymous grid, which is not a form. */
const LABEL_KEYS = new Set([
  // row identity
  "name", "label", "title", "item", "itemname", "itemlabel", "question", "q",
  "description", "desc", "activity", "task", "step", "area", "zone", "section",
  "parameter", "criteria", "requirement", "standard", "checkpoint", "point",
  "category", "group", "heading", "subject", "topic", "aspect", "element",
  "clause", "control", "hazard", "stage", "process", "station", "equipment",
  // measurement framing
  "unit", "uom", "limit", "limits", "spec", "target", "range", "min", "max",
  "criticallimit", "acceptancecriteria", "frequency", "method", "tolerance",
  // document control header — this is the "ترويسة" the blank sheet must carry
  "documenttitle", "documentno", "docno", "issuedate", "revisionno", "revno",
  "issuedby", "controllingofficer", "approvedby", "company", "companyname",
  "reporttitle", "formno", "formtitle",
  // structural keys the exporters read to lay the grid out
  "times", "slots", "columns", "cols", "headers", "options", "choices",
  "type", "kind", "role", "order", "index", "seq", "no",
]);

const normKey = (k) => String(k || "").toLowerCase().replace(/[\s_-]/g, "");

function isLabelKey(key) {
  return LABEL_KEYS.has(normKey(key));
}

/** The blank counterpart of a scalar. Booleans go false, everything else "". */
function emptyScalar(v) {
  if (typeof v === "boolean") return false;
  return "";
}

/** True when an array is a list of headings/options rather than data rows. */
function isScalarList(arr) {
  return arr.length > 0 && !arr.some((v) => v && typeof v === "object");
}

/** True when a row object carries its own printed label — a checklist line. */
function hasOwnLabel(row) {
  if (!row || typeof row !== "object") return false;
  return Object.entries(row).some(
    ([k, v]) => isLabelKey(k) && typeof v === "string" && v.trim() !== ""
  );
}

/**
 * Recursively strip the answers out of a payload node.
 * Objects keep every key (a key is a column); only leaf values are cleared.
 */
function blankTree(node) {
  if (Array.isArray(node)) {
    if (isScalarList(node)) return node.slice();   // time slots, option lists
    return node.map(blankTree);
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (isLabelKey(k) && (typeof v !== "object" || v === null)) { out[k] = v; continue; }
      if (v && typeof v === "object") { out[k] = blankTree(v); continue; }
      out[k] = emptyScalar(v);
    }
    return out;
  }
  return emptyScalar(node);
}

/**
 * Give free-entry logs enough empty lines to write on.
 * A checklist is left exactly as it is — its rows ARE the form. A log whose
 * rows carry no printed label (a temperature line, a receiving line) is padded
 * up to `rowCount`, and never truncated: losing a line loses a column heading
 * on some sheets.
 */
function padRows(node, rowCount) {
  if (Array.isArray(node)) {
    if (isScalarList(node)) return node;
    const rows = node.map((r) => padRows(r, rowCount));
    if (!rows.length) return rows;
    if (rows.some(hasOwnLabel)) return rows;        // checklist — leave alone
    while (rows.length < rowCount) {
      rows.push(JSON.parse(JSON.stringify(rows[rows.length - 1])));
    }
    return rows;
  }
  if (node && typeof node === "object") {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = padRows(v, rowCount);
    return out;
  }
  return node;
}

/* ═══════════════════════════════════════════════════════════════
   SKELETON — used only when the type has no records to learn from
   ═══════════════════════════════════════════════════════════════
   The array keys below are the ones the exporters actually read (grepped out
   of this folder). An exporter picks up the key it wants and ignores the rest,
   so one skeleton serves every hard-coded-column sheet. Evidence lists
   (images, photos, attachments) are deliberately absent — a blank form has no
   evidence to show. */
const SKELETON_ROW_KEYS = [
  "rows", "entries", "items", "coolers", "units", "stations", "samples",
  "lines", "locations", "products", "productLines", "checklist",
  "cleanlinessRows", "personalHygiene", "findings", "participants",
  "productVerifications", "slots",
];

function makeSkeleton(rowCount) {
  const payload = {
    reportDate: "",
    date: "",
    branch: "",
    checkedBy: "",
    verifiedBy: "",
    remarks: "",
  };
  const blankRow = { name: "", value: "", remarks: "" };
  for (const key of SKELETON_ROW_KEYS) {
    payload[key] = Array.from({ length: rowCount }, () => ({ ...blankRow }));
  }
  return payload;
}

/* ═══════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════ */

/**
 * Pick the record a blank form should be modelled on: the newest one, because
 * it reflects the current shape of the screen. Older records can be missing
 * fields that were added later.
 */
export function pickTemplateRecord(records) {
  const list = (records || []).filter((r) => r && r.payload && typeof r.payload === "object");
  if (!list.length) return null;
  const stamp = (r) => {
    const p = r.payload || {};
    return String(p.reportDate || p.date || r.created_at || r.createdAt || "");
  };
  return [...list].sort((a, b) => (stamp(a) < stamp(b) ? 1 : -1))[0];
}

/**
 * Build the record a blank-form export is rendered from.
 *
 * @param {object|null} template  A real record of this type, or null.
 * @param {number} rowCount       How many writable lines free-entry logs get.
 * @returns {{ payload: object, reporter: string }}
 */
export function makeBlankRecord(template, rowCount = 12) {
  const n = Math.max(1, Math.min(200, Number(rowCount) || 12));
  const base = template?.payload
    ? blankTree(JSON.parse(JSON.stringify(template.payload)))
    : makeSkeleton(n);
  return { payload: padRows(base, n), reporter: "" };
}

/**
 * A register (collection) exporter is called once with an array. A blank
 * register is that same array, `rowCount` empty lines long.
 */
export function makeBlankRecordList(template, rowCount = 12) {
  const n = Math.max(1, Math.min(200, Number(rowCount) || 12));
  const one = makeBlankRecord(template, n);
  return Array.from({ length: n }, () => JSON.parse(JSON.stringify(one)));
}
