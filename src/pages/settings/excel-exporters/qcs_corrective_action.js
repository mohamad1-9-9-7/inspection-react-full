// src/pages/settings/excel-exporters/qcs_corrective_action.js
// Mirrors src/pages/monitor/branches/qcs/CorrectiveActionReportsView.jsx (exportXlsx)

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.header || {};
  const b = p.body   || {};
  const f = p.footer || {};

  const NC = 6;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = Array.from({ length: NC }, () => ({ width: 18 }));

  addDocHeader(ws, {
    documentTitle: "Corrective Action Report",
    documentNo:    "FS-QM/REC/CAR",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "CORRECTIVE ACTION REPORT",
    reportDate:    formatDMY(h.dateIssued || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  function pair(label, value) {
    ws.mergeCells(r, 1, r, 2);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.font = lblFont; l.fill = lblFill; l.alignment = left; l.border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = value ?? "";
    v.font = { size: 10 }; v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(value ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(20, lines * 16);
    r++;
  }

  function section(title) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;
  }

  section("Header");
  pair("Report Date",              formatDMY(h.dateIssued));
  pair("Department Involved",      h.departmentInvolved);
  pair("Initiated By",             h.initiatedBy);
  pair("Origin of Non-Conformity", h.originOfNonConformity);
  pair("CAR Completed Date",       formatDMY(h.carCompletedDate));

  section("Body");
  pair("Details of Non-Conformity",       b.detailsOfNC);
  pair("Root Cause(s) of Non-Conformance", b.rootCause);
  pair("Corrective Action",                b.correctiveAction);
  pair("Action Taken to Prevent Recurrence", b.preventiveAction);

  section("Footer");
  // Two-column footer row
  ws.mergeCells(r, 1, r, 2);
  ws.getCell(r, 1).value = "Signed QA";
  ws.getCell(r, 1).font = lblFont;
  ws.getCell(r, 1).fill = lblFill;
  ws.getCell(r, 1).alignment = left;
  ws.getCell(r, 1).border = BORDER_BLACK;
  ws.getCell(r, 3).value = f.signedQA ?? "";
  ws.getCell(r, 3).font = { size: 10 };
  ws.getCell(r, 3).alignment = left;
  ws.getCell(r, 3).border = BORDER_BLACK;
  ws.getCell(r, 4).value = "Date Closed Out";
  ws.getCell(r, 4).font = lblFont;
  ws.getCell(r, 4).fill = lblFill;
  ws.getCell(r, 4).alignment = left;
  ws.getCell(r, 4).border = BORDER_BLACK;
  ws.mergeCells(r, 5, r, NC);
  ws.getCell(r, 5).value = formatDMY(f.dateClosedOut);
  ws.getCell(r, 5).font = { size: 10 };
  ws.getCell(r, 5).alignment = left;
  ws.getCell(r, 5).border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r++;

  addFooter(ws, { verifiedBy: f.signedQA, checkedBy: h.initiatedBy }, NC);
  return ws;
}
