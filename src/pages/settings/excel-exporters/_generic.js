// src/pages/settings/excel-exporters/_generic.js
// Fallback exporter — captures EVERY field of the payload faithfully,
// no summarizing, no skipping. Used when a per-type exporter isn't defined yet.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, prettifyKey, display, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

const META_KEYS_TO_HIDE = new Set([
  "tmpHeader", "headers", "header",
  "verifiedByManager", "verifiedBy", "checkedBy",
  "company", "companyName",
]);

const HEADER_DEFAULTS = {
  documentTitle: "Inspection Record",
  documentNo:    "",
  issueDate:     "",
  revisionNo:    "",
  area:          "QA",
};

/* ─── Find the most-array-like field to render as a horizontal table ─── */
function findMainTable(payload) {
  if (!payload || typeof payload !== "object") return null;
  let best = null, bestLen = 0;
  for (const [key, val] of Object.entries(payload)) {
    if (META_KEYS_TO_HIDE.has(key)) continue;
    if (!Array.isArray(val) || val.length === 0) continue;
    if (typeof val[0] !== "object" || val[0] === null) continue;
    if (val.length > bestLen) { best = { key, arr: val }; bestLen = val.length; }
  }
  if (!best) return null;

  // Flatten nested one-level objects (e.g. temps: { "AM 4:00": 1.2 } → columns)
  const cols = [];
  const flatRows = best.arr.map((item) => {
    const flat = {};
    for (const [k, v] of Object.entries(item)) {
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        for (const [sk, sv] of Object.entries(v)) {
          const colKey = `${k}.${sk}`;
          const colLabel = sk;
          if (!cols.find((c) => c.key === colKey)) cols.push({ key: colKey, label: colLabel });
          flat[colKey] = sv;
        }
      } else {
        if (!cols.find((c) => c.key === k)) cols.push({ key: k, label: prettifyKey(k) });
        flat[k] = v;
      }
    }
    return flat;
  });
  return { key: best.key, cols, flatRows };
}

/* ─── Two-column key/value rendering of the rest of the payload ─── */
function addKeyValueSection(ws, obj, totalCols, indent = 0) {
  let r = ws.lastRow ? ws.lastRow.number + 1 : 1;
  const NC = Math.max(totalCols, 2);
  const VAL_END = NC;

  function emit(label, value, isHeader = false) {
    const c1 = 1, c2 = 2, c3 = VAL_END;
    const indentTxt = "  ".repeat(indent);
    const lab = ws.getCell(r, c1);
    lab.value = indentTxt + label;
    lab.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    lab.fill = fillSolid(isHeader ? COLORS.SKY : COLORS.GRAY_LIGHT);
    lab.border = BORDER_BLACK;
    lab.alignment = left;

    if (c3 > c2) ws.mergeCells(r, c2, r, c3);
    const val = ws.getCell(r, c2);
    val.value = display(value);
    val.font = { size: 10, color: { argb: COLORS.TEXT } };
    val.border = BORDER_BLACK;
    val.alignment = { ...left, wrapText: true };

    const lineCount = typeof val.value === "string" ? Math.min(val.value.split("\n").length, 10) : 1;
    ws.getRow(r).height = Math.max(18, lineCount * 14);
    r++;
  }

  function walk(o, depth) {
    if (!o || typeof o !== "object") return;
    for (const [key, v] of Object.entries(o)) {
      if (META_KEYS_TO_HIDE.has(key)) continue;
      const label = prettifyKey(key);
      if (Array.isArray(v)) {
        if (v.length === 0) { emit(label, "—"); continue; }
        if (typeof v[0] === "object" && v[0] !== null) {
          emit(label + `  (${v.length} item${v.length === 1 ? "" : "s"})`, "", true);
          v.forEach((item, i) => {
            emit(`  ↳ Item ${i + 1}`, "", true);
            walk(item, depth + 2);
          });
        } else {
          emit(label, v.map((x, i) => `${i + 1}. ${x ?? ""}`).join("\n"));
        }
      } else if (typeof v === "object" && v !== null) {
        if (Object.keys(v).length === 0) { emit(label, "—"); continue; }
        emit(label, "", true);
        walk(v, depth + 1);
      } else {
        emit(label, v);
      }
    }
  }

  walk(obj, indent);
  return r;
}

/* ─── Main: build one sheet for one record ─── */
export default async function buildGenericSheet(wb, record, ctx) {
  const { branchLabel, typeLabel, sheetName } = ctx;
  const payload = record?.payload || {};
  const hdr = payload?.headers?.tmpHeader || payload?.tmpHeader || {};

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);

  // Detect main table to size columns
  const tbl = findMainTable(payload);
  const NC = Math.max(tbl ? tbl.cols.length : 0, 6);

  // Column widths: equal medium width
  ws.columns = Array.from({ length: NC }, (_, i) => ({
    width: i === 0 ? 22 : 16,
  }));

  // Document header
  addDocHeader(ws, {
    documentTitle: hdr.documentTitle || typeLabel,
    documentNo:    hdr.documentNo    || HEADER_DEFAULTS.documentNo,
    issueDate:     hdr.issueDate     || HEADER_DEFAULTS.issueDate,
    revisionNo:    hdr.revisionNo    || HEADER_DEFAULTS.revisionNo,
    area:          hdr.area          || HEADER_DEFAULTS.area,
    issuedBy:      hdr.issuedBy,
    controllingOfficer: hdr.controllingOfficer,
    approvedBy:    hdr.approvedBy,
    reportTitle:   `${branchLabel}  ·  ${typeLabel}`,
    reportDate:    formatDMY(extractDate(record)),
    totalCols:     NC,
  });

  // If we detected a horizontal table, render it; otherwise full key/value
  if (tbl) {
    let r = ws.lastRow.number + 2;
    // Section title for the table
    ws.mergeCells(r, 1, r, NC);
    const tHead = ws.getCell(r, 1);
    tHead.value = prettifyKey(tbl.key);
    tHead.font = { bold: true, size: 12, color: { argb: COLORS.NAVY } };
    tHead.fill = fillSolid(COLORS.SKY);
    tHead.alignment = center;
    tHead.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;

    // Headers
    tbl.cols.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = col.label;
      c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
      c.fill = fillSolid(COLORS.NAVY);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 26;
    r++;

    // Data rows
    tbl.flatRows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      tbl.cols.forEach((col, ci) => {
        const v = row[col.key];
        const c = ws.getCell(r, ci + 1);
        c.value = display(v);
        c.font = { size: 10 };
        c.fill = fillSolid(bg);
        c.alignment = { ...center, wrapText: true };
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20;
      r++;
    });

    // Other top-level fields (those not the main table) as a key/value section
    const otherKeys = Object.keys(payload).filter(
      (k) => k !== tbl.key && !META_KEYS_TO_HIDE.has(k)
    );
    if (otherKeys.length) {
      const other = {};
      otherKeys.forEach((k) => (other[k] = payload[k]));
      r = ws.lastRow.number + 2;
      ws.mergeCells(r, 1, r, NC);
      const oHead = ws.getCell(r, 1);
      oHead.value = "Additional Information";
      oHead.font = { bold: true, size: 12, color: { argb: COLORS.NAVY } };
      oHead.fill = fillSolid(COLORS.SKY);
      oHead.alignment = center;
      oHead.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      addKeyValueSection(ws, other, NC);
    }
  } else {
    // Pure key/value mode
    addKeyValueSection(ws, payload, NC);
  }

  // Footer
  addFooter(ws, {
    verifiedBy: payload.verifiedByManager || payload.verifiedBy || "",
    checkedBy:  payload.checkedBy || record?.reporter || "",
    revDate:    hdr.issueDate || "",
    revNo:      hdr.revisionNo || "",
  }, NC);

  return ws;
}
