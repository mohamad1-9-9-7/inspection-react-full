// src/pages/settings/excel-exporters/_auto_register.js
// Register exporter for types that store ONE ROW PER RECORD and have no
// hand-written column spec.
//
// Why this exists: HSE (23 types), the SOP/document/supplier registers, the
// change logs and the lookup lists all persist a single register row as one
// `/api/reports` record. Run those through the per-record `_generic` exporter
// and a year of toolbox meetings becomes ~250 worksheets in one workbook —
// unreadable, unsortable, and slow to write. The register shape is the one the
// screen shows anyway: a table, one row per entry.
//
// Columns are derived from the data rather than declared, so a type gains new
// fields without anyone editing this file. `makeRegisterExporter` in
// `_register.js` stays the right tool whenever the exact columns and their
// order matter (the FSMS registers); this is the automatic sibling.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, pageSetupLandscape, display,
  sanitizeSheetName, prettifyKey,
} from "./_lib";

/* Keys that describe the record rather than the entry. They are either shown
   elsewhere on the sheet or pure plumbing, so they never earn a column. */
const NOISE_KEYS = new Set([
  "savedAt", "updatedAt", "createdBy", "updatedBy",
  "tmpHeader", "headers", "__v",
]);

/* A single row must not explode the sheet sideways. Anything past this lands
   in the overflow column so the data is still in the file, just not spread
   across 200 columns. */
const MAX_COLS = 36;

/** Pull English out of a bilingual { ar, en } value; leave anything else be. */
function unwrapBilingual(v) {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    const keys = Object.keys(v);
    if (keys.length && keys.every((k) => k === "ar" || k === "en" || k === "v")) {
      return v.en ?? v.ar ?? v.v ?? "";
    }
  }
  return v;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_STAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Decide what actually goes into the cell.
 * Dates become real Excel dates so a column can be sorted and filtered —
 * `display()` alone leaves everything as text, which is why the older sheets
 * cannot be sorted. Numbers stay numbers. Everything else is text.
 */
function cellValue(raw) {
  const v = unwrapBilingual(raw);
  if (v == null || v === "") return { value: "" };
  if (typeof v === "number" && Number.isFinite(v)) {
    return { value: v, numFmt: Number.isInteger(v) ? "0" : "0.00" };
  }
  if (typeof v === "string") {
    if (ISO_DAY.test(v)) {
      const d = new Date(`${v}T00:00:00Z`);
      if (!Number.isNaN(d.getTime())) return { value: d, numFmt: "dd/mm/yyyy" };
    }
    if (ISO_STAMP.test(v)) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return { value: d, numFmt: "dd/mm/yyyy hh:mm" };
    }
    return { value: v };
  }
  return { value: display(v) };
}

/** Flatten one level: `{ temps: { "4:00 AM": 2 } }` → `temps.4:00 AM`. */
function flattenRow(payload) {
  const flat = {};
  for (const [k, v] of Object.entries(payload || {})) {
    if (NOISE_KEYS.has(k)) continue;
    const uv = unwrapBilingual(v);
    if (uv && typeof uv === "object" && !Array.isArray(uv)) {
      const subKeys = Object.keys(uv);
      if (!subKeys.length) continue;
      for (const sk of subKeys) flat[`${k}.${sk}`] = uv[sk];
    } else {
      flat[k] = uv;
    }
  }
  return flat;
}

/**
 * Build an automatic register exporter.
 *
 * @param {object} [spec]
 * @param {string} [spec.documentNo]  Header "Document No"
 * @param {string[]} [spec.lead]      Keys to pin to the left, in this order
 * @returns {function} exporter(wb, records, ctx) carrying `.collection = true`
 */
export function makeAutoRegister(spec = {}) {
  const { documentNo = "", lead = ["id", "refNo", "date", "reportDate"] } = spec;

  async function exporter(wb, records, ctx) {
    const { branchLabel, typeLabel } = ctx || {};
    const rows = (records || []).map((r) => ({
      __rowId: r?.id ?? r?._id ?? "",
      __reporter: r?.reporter || "",
      __created: r?.created_at || r?.createdAt || "",
      ...flattenRow(r?.payload || {}),
    }));

    /* Column discovery: first-appearance order, dropping any column that is
       empty across every single row — a declared-but-unused field would
       otherwise add a blank column to every register.
       A blank form is all-empty by definition, so the pruning is skipped
       there or the sheet would come out with no columns at all. */
    const seen = [];
    const nonEmpty = new Set();
    for (const row of rows) {
      for (const k of Object.keys(row)) {
        if (k.startsWith("__")) continue;
        if (!seen.includes(k)) seen.push(k);
        if (String(display(row[k]) ?? "").trim() !== "") nonEmpty.add(k);
      }
    }
    let keys = ctx?.blankForm ? seen.slice() : seen.filter((k) => nonEmpty.has(k));
    keys.sort((a, b) => {
      const ia = lead.indexOf(a), ib = lead.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return seen.indexOf(a) - seen.indexOf(b);
    });

    const overflow = keys.slice(MAX_COLS);
    keys = keys.slice(0, MAX_COLS);

    const cols = [
      { key: "__rowId", label: "#", width: 8 },
      ...keys.map((k) => ({ key: k, label: prettifyKey(k.replace(/\./g, " · ")), width: 18 })),
      ...(overflow.length ? [{ key: "__overflow", label: "Other fields", width: 40 }] : []),
      { key: "__reporter", label: "Entered by", width: 18 },
    ];
    const NC = cols.length;

    const ws = wb.addWorksheet(sanitizeSheetName(typeLabel || "Register"), {
      views: [{ showGridLines: false }],
    });
    pageSetupLandscape(ws);
    ws.columns = cols.map((c) => ({ width: c.width }));

    addDocHeader(ws, {
      documentTitle: typeLabel || "Register",
      documentNo,
      area: "QA",
      reportTitle: `${branchLabel || ""}  ·  ${typeLabel || ""}`.trim(),
      totalCols: NC,
    });

    let r = ws.lastRow.number + 1;
    ws.mergeCells(r, 1, r, NC);
    const cnt = ws.getCell(r, 1);
    cnt.value = ctx?.blankForm ? "Total entries:" : `Total entries: ${rows.length}`;
    cnt.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    cnt.font = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
    cnt.fill = fillSolid(COLORS.GRAY_LIGHT);
    cnt.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;

    const headRow = r;
    cols.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = col.label;
      c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
      c.fill = fillSolid(COLORS.NAVY);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 26;
    r++;

    if (!rows.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "— No entries —";
      c.alignment = center;
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;
    } else {
      rows.forEach((row, ri) => {
        const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        const overflowText = overflow.length
          ? overflow
              .map((k) => `${prettifyKey(k)}: ${display(row[k]) ?? ""}`)
              .filter((s) => !/:\s*$/.test(s))
              .join("\n")
          : "";
        let maxLines = 1;
        cols.forEach((col, ci) => {
          const c = ws.getCell(r, ci + 1);
          const raw = col.key === "__overflow" ? overflowText : row[col.key];
          const { value, numFmt } = cellValue(raw);
          c.value = value;
          if (numFmt) c.numFmt = numFmt;
          c.font = { size: 10, color: { argb: COLORS.TEXT } };
          c.fill = fillSolid(bg);
          c.alignment = typeof value === "string" && value.length > 24
            ? { ...left, wrapText: true }
            : { ...center };
          c.border = BORDER_BLACK;
          if (typeof value === "string") maxLines = Math.max(maxLines, value.split("\n").length);
        });
        ws.getRow(r).height = Math.max(20, Math.min(maxLines, 8) * 14);
        r++;
      });

      /* Freeze the header and switch on the filter row: these registers are
         read by filtering and sorting, which a plain grid cannot do. */
      ws.views = [{ state: "frozen", ySplit: headRow, showGridLines: false }];
      ws.autoFilter = {
        from: { row: headRow, column: 1 },
        to:   { row: r - 1,   column: NC },
      };
    }

    addFooter(ws, { verifiedBy: "", checkedBy: "" }, NC);
    return ws;
  }

  exporter.collection = true;
  return exporter;
}

/** Ready-made instance for types that need no tuning. */
export default makeAutoRegister();
