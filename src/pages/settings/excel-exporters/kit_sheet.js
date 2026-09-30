// src/pages/settings/excel-exporters/kit_sheet.js
// One day's log sheet of a kit company (restaurant / supermarket / warehouse /
// factory) — one worksheet per sheet, laid out like the kit View page
// (pages/industry-kit/log/LogSheet.jsx): the date + header fields, the
// rows / non-compliant / to-review counts, then every table with its # column,
// the report's own columns (limit under the title) and the Status column,
// then the notes.
//
// Every kit report is described by a schema (industries/<id>/reports.js), so
// ONE exporter covers all of them: a new kit report exports correctly with no
// extra file. The status of each row is recomputed from the schema's check(),
// exactly as the screen does.

import { kitSchemaByType } from "../../../industries/_kit/kitRegistry";
import { fmtDate, isRowEmpty, listText, statusOf, summarize } from "../../industry-kit/log/rows";
import {
  addDocHeader, addFooter, pageSetupLandscape, sanitizeSheetName,
  BORDER_BLACK, COLORS, center, left, fillSolid,
} from "./_lib";

const MARK = { ok: "✓", warn: "!", fail: "✕" };
const TONE = {
  ok: { fg: COLORS.GREEN, bg: COLORS.GREEN_BG },
  warn: { fg: COLORS.AMBER, bg: COLORS.AMBER_BG },
  fail: { fg: COLORS.RED, bg: COLORS.RED_BG },
};

function cellText(col, v) {
  if (col.type === "list") return listText(col, v).join("\n");
  if (col.type === "date") return v ? fmtDate(v) : "";
  return v == null ? "" : v;
}

function band(ws, r, NC, text, fill, font = {}) {
  ws.mergeCells(r, 1, r, NC);
  const c = ws.getCell(r, 1);
  c.value = text;
  c.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
  c.font = { bold: true, size: 11, ...font };
  c.fill = fillSolid(fill);
  c.border = BORDER_BLACK;
  return r + 1;
}

/** Label/value pairs across one row, spread over NC columns. */
function pairRow(ws, r, NC, pairs) {
  const per = Math.max(2, Math.floor(NC / pairs.length));
  pairs.forEach(([label, value, tone], i) => {
    const c1 = i * per + 1;
    const c2 = i === pairs.length - 1 ? NC : (i + 1) * per;
    const l = ws.getCell(r, c1);
    l.value = label;
    l.font = { bold: true };
    l.fill = fillSolid(COLORS.SKY);
    l.alignment = left;
    l.border = BORDER_BLACK;
    if (c2 > c1) ws.mergeCells(r, c1 + 1, r, c2);
    const v = ws.getCell(r, c1 + 1);
    v.value = value;
    v.alignment = left;
    v.border = BORDER_BLACK;
    if (tone) v.font = { bold: true, color: { argb: tone } };
  });
  ws.getRow(r).height = 20;
  return r + 1;
}

export default async function kitSheet(wb, record, ctx = {}) {
  const schema = kitSchemaByType(ctx.typeKey || record?.type);
  const p = record?.payload || {};
  const blank = !!ctx.blankForm;
  const date = String(p.reportDate || "").slice(0, 10);
  const header = { ...(p.header || {}), reportDate: date };

  const ws = wb.addWorksheet(sanitizeSheetName(ctx.sheetName || ctx.typeLabel || "Sheet"), { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  if (!schema) {
    ws.getCell("A1").value = `Unknown report type: ${ctx.typeKey || record?.type || ""}`;
    return;
  }

  // Widest table decides the sheet width: # + columns + Status.
  const NC = Math.max(8, ...schema.tables.map((t) => t.columns.length + 2));
  const widths = Array.from({ length: NC }, (_, i) => (i === 0 ? 6 : 16));
  schema.tables.forEach((t) => t.columns.forEach((c, i) => {
    const w = Math.round((c.width || 110) / 7);
    widths[i + 1] = Math.max(widths[i + 1], Math.min(40, w));
  }));
  widths[NC - 1] = Math.max(widths[NC - 1], 26);
  ws.columns = widths.map((width) => ({ width }));

  addDocHeader(ws, {
    documentTitle: schema.title,
    area: "QA",
    reportTitle: `${schema.icon || ""} ${schema.title}`.trim(),
    reportDate: blank ? "" : fmtDate(date),
    totalCols: NC,
  });

  let r = ws.lastRow.number + 1;
  const fields = schema.header.map((f) => [f.label, blank ? "" : header[f.key] || "—"]);
  r = pairRow(ws, r, NC, [["Date", blank ? "" : fmtDate(date)], ...fields.slice(0, 2)]);
  if (fields.length > 2) r = pairRow(ws, r, NC, fields.slice(2, 5));
  if (!blank) {
    const s = summarize(schema, p);
    r = pairRow(ws, r, NC, [
      ["Rows", s.rows],
      ["Non-compliant", s.fails, s.fails ? COLORS.RED : COLORS.GREEN],
      ["To review", s.warns, s.warns ? COLORS.AMBER : COLORS.GREEN],
    ]);
  }

  schema.tables.forEach((t) => {
    r += 1;
    r = band(ws, r, NC, t.title, COLORS.GRAY_BAND_2, { size: 12 });

    // Head: # · columns (limit under the title) · Status
    const heads = ["#", ...t.columns.map((c) => (c.hint ? `${c.label}\n(${c.hint})` : c.label)), "Status"];
    heads.forEach((h, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = h;
      c.font = { bold: true, color: { argb: COLORS.NAVY } };
      c.fill = fillSolid(COLORS.SKY);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = t.columns.some((c) => c.hint) ? 34 : 24;
    r += 1;

    const saved = (p[t.key] || []).filter((row) => !isRowEmpty(t, row));
    const rows = blank ? Array.from({ length: Math.max(saved.length, 12) }, () => ({})) : saved;
    if (!rows.length) {
      ws.mergeCells(r, 1, r, heads.length);
      const c = ws.getCell(r, 1);
      c.value = "No rows.";
      c.alignment = center;
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.border = BORDER_BLACK;
      r += 1;
      return;
    }

    rows.forEach((row, i) => {
      const st = blank ? null : statusOf(t, row, header);
      const tone = st && st.level !== "ok" ? TONE[st.level] : null;
      const values = [
        blank ? "" : i + 1,
        ...t.columns.map((c) => (blank ? "" : cellText(c, row[c.key]))),
        st ? `${MARK[st.level]} ${st.text}` : "",
      ];
      values.forEach((v, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = v;
        c.alignment = ci === values.length - 1 ? left : center;
        c.border = BORDER_BLACK;
        if (tone) c.fill = fillSolid(tone.bg);
        if (ci === values.length - 1 && st) c.font = { bold: true, color: { argb: TONE[st.level].fg } };
      });
      const lines = Math.max(1, ...values.map((v) => String(v ?? "").split("\n").length));
      ws.getRow(r).height = Math.max(20, lines * 15);
      r += 1;
    });
  });

  if (blank || String(p.notes || "").trim()) {
    r += 1;
    ws.mergeCells(r, 1, r, 2);
    const l = ws.getCell(r, 1);
    l.value = "Notes";
    l.font = { bold: true };
    l.fill = fillSolid(COLORS.SKY);
    l.alignment = left;
    l.border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = blank ? "" : p.notes;
    v.alignment = left;
    v.border = BORDER_BLACK;
    ws.getRow(r).height = blank ? 48 : Math.max(22, String(p.notes).split("\n").length * 15);
  }

  addFooter(ws, {
    checkedBy: blank ? "" : header.checkedBy || "",
    verifiedBy: blank ? "" : header.verifiedBy || "",
  }, NC);
}
