// src/pages/settings/excel-exporters/qcs_staff_sickness.js
// Mirrors src/pages/monitor/branches/qcs/StaffSicknessView.jsx (each record = one sheet).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const COLS = [
  { key: "sNo",          label: "S.No",          width: 6  },
  { key: "staffName",    label: "Staff Name",    width: 24, align: "left" },
  { key: "details",      label: "Details of Sickness", width: 34, align: "left" },
  { key: "action",       label: "Action Taken",  width: 28, align: "left" },
  { key: "dateFrom",     label: "Date From",     width: 14 },
  { key: "dateReturned", label: "Date Returned", width: 14 },
  { key: "comments",     label: "Comments",      width: 26, align: "left" },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.headerTop || {};
  const foot = p.footer || {};
  const rows = Array.isArray(p.rows) ? p.rows : [];

  const NC = COLS.length; // 7
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "Staff Sickness Record",
    documentNo:    h.documentNo    || "FF-QM/REC/SS",
    issueDate:     h.issueDate     || "05/02/2020",
    revisionNo:    h.revisionNo    || "0",
    area:          h.area          || "QA",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: h.controllingOfficer || "Quality Controller",
    approvedBy:    h.approvedBy     || "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "STAFF SICKNESS RECORD",
    reportDate:    formatDMY(p.date || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  const section = (title) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };
  const wide = (label, val) => {
    ws.mergeCells(r, 1, r, 2);
    const lc = ws.getCell(r, 1);
    lc.value = label; lc.font = lblFont; lc.fill = lblFill; lc.alignment = left; lc.border = BORDER_BLACK;
    ws.getCell(r, 2).border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(20, lines * 15); r++;
  };

  section(`Sickness Log (${rows.length})`);
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 24; r++;

  if (!rows.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No entries —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      let maxLines = 1;
      COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        let v = row[col.key];
        if (col.key === "dateFrom" || col.key === "dateReturned") v = formatDMY(v);
        c.value = display(v);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
        const lines = String(v ?? "").split("\n").length;
        if (lines > maxLines) maxLines = lines;
      });
      ws.getRow(r).height = Math.max(20, Math.min(maxLines, 6) * 14); r++;
    });
  }

  if (p.remarks) { section("Remarks"); wide("Remarks", p.remarks); }

  addFooter(ws, {
    checkedBy:  foot.checkedBy?.name  || "",
    verifiedBy: foot.verifiedBy?.name || "",
    revDate:    foot.checkedBy?.date  || "",
  }, NC);
  return ws;
}
