// src/pages/settings/excel-exporters/_register.js
// Shared builder for "register / log" report types — those where each API
// record is ONE ROW of a single register table (e.g. FSMS Risk Register,
// Opportunity Register, Glass Register, Change Management Log, Objectives).
//
// Unlike the per-record exporters, a register exporter renders ALL records
// of the type into ONE worksheet that mirrors the on-screen register table.
// It is invoked once with the full records array; the backup builder detects
// this via the `.collection = true` flag set on the returned function.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, pageSetupLandscape, display,
  sanitizeSheetName,
} from "./_lib";

/* Pick localized text from a bilingual { ar, en } value (English primary,
   matching the rest of the Excel backup which is English-headed). */
export function txtEN(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v.en ?? v.ar ?? "";
  return String(v);
}

/* Dedupe by payload.id keeping the most-recent (highest savedAt) — the same
   rule the register Views apply so the sheet mirrors what the user sees.
   Records without an id are all kept (older data that predates id stamping). */
function dedupById(records) {
  const items = (records || []).map((r) => ({ _rid: r?.id, ...(r?.payload || {}) }));
  const byId = new Map();
  const noId = [];
  for (const it of items) {
    if (it.id == null || it.id === "") { noId.push(it); continue; }
    const ex = byId.get(it.id);
    if (!ex || (Number(it.savedAt) || 0) >= (Number(ex.savedAt) || 0)) byId.set(it.id, it);
  }
  return [...byId.values(), ...noId];
}

/**
 * Build a register exporter.
 *
 * @param {object}   spec
 * @param {string}   spec.documentTitle  Header "Document Title" (defaults to typeLabel)
 * @param {string}   [spec.documentNo]   Header "Document No"
 * @param {Array}    spec.cols           [{ label, width?, align?, get(item) }]
 * @param {function} [spec.sort]         Optional comparator applied after dedupe
 * @returns {function} exporter(wb, records, ctx) with `.collection = true`
 */
export function makeRegisterExporter(spec) {
  const { documentTitle, documentNo = "", cols, sort } = spec;

  async function exporter(wb, records, ctx) {
    const { branchLabel, typeLabel } = ctx || {};
    let items = dedupById(records);
    if (typeof sort === "function") items = [...items].sort(sort);

    const NC = cols.length;
    const ws = wb.addWorksheet(sanitizeSheetName(typeLabel || "Register"), {
      views: [{ showGridLines: false }],
    });
    pageSetupLandscape(ws);
    ws.columns = cols.map((c) => ({ width: c.width || 18 }));

    /* Al Mawashi document header band */
    addDocHeader(ws, {
      documentTitle: documentTitle || typeLabel,
      documentNo,
      area: "QA",
      reportTitle: `${branchLabel}  ·  ${typeLabel}`,
      totalCols: NC,
    });

    /* Count band (register size) */
    let r = ws.lastRow.number + 1;
    ws.mergeCells(r, 1, r, NC);
    const cnt = ws.getCell(r, 1);
    cnt.value = `Total entries: ${items.length}`;
    cnt.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    cnt.font = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
    cnt.fill = fillSolid(COLORS.GRAY_LIGHT);
    cnt.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;

    /* Table header */
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

    /* Data rows */
    if (!items.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "— No entries —";
      c.alignment = center;
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;
    } else {
      items.forEach((item, ri) => {
        const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        cols.forEach((col, ci) => {
          const c = ws.getCell(r, ci + 1);
          let v;
          try { v = col.get(item); } catch { v = ""; }
          c.value = display(v);
          c.font = { size: 10, color: { argb: COLORS.TEXT } };
          c.fill = fillSolid(bg);
          c.alignment = col.align === "left"
            ? { ...left }
            : { ...center };
          c.border = BORDER_BLACK;
        });
        // Row height grows with the tallest wrapped cell (rough estimate)
        const maxLines = cols.reduce((m, col) => {
          let v = "";
          try { v = display(col.get(item)); } catch { /* noop */ }
          const lines = typeof v === "string" ? v.split("\n").length : 1;
          return Math.max(m, lines);
        }, 1);
        ws.getRow(r).height = Math.max(20, Math.min(maxLines, 8) * 14);
        r++;
      });
    }

    addFooter(ws, { verifiedBy: "", checkedBy: "" }, NC);
    return ws;
  }

  exporter.collection = true;
  return exporter;
}
