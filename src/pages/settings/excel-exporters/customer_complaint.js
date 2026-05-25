// src/pages/settings/excel-exporters/customer_complaint.js
// Mirrors src/pages/haccp and iso/CustomerComplaints/CustomerComplaintView.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 22 }, { width: 26 }, { width: 22 }, { width: 26 }];

  addDocHeader(ws, {
    documentTitle: "Customer Complaint Record",
    documentNo:    "FS-HACCP/REC/CC",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Manager",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "CUSTOMER COMPLAINT RECORD",
    reportDate:    formatDMY(p.complaintDate || p.reportDate || extractDate(record)),
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
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;
  };
  const pair = (l1, v1, l2, v2) => {
    [[1, 2, l1, v1], [3, 4, l2, v2]].forEach(([lc, vc, lbl, v]) => {
      if (lbl == null) return;
      ws.getCell(r, lc).value = lbl;
      ws.getCell(r, lc).font = lblFont; ws.getCell(r, lc).fill = lblFill;
      ws.getCell(r, lc).alignment = left; ws.getCell(r, lc).border = BORDER_BLACK;
      ws.getCell(r, vc).value = display(v);
      ws.getCell(r, vc).font = { size: 10 }; ws.getCell(r, vc).alignment = left;
      ws.getCell(r, vc).border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
  };
  const wide = (label, val) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
    ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true };
    v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(24, lines * 16);
    r++;
  };

  section("Complaint Details");
  pair("Complaint No",   p.complaintNumber,           "Complaint Date", formatDMY(p.complaintDate));
  pair("Complainant",    p.complainant,               "Channel",        p.channel);
  pair("Type",           p.type,                      "Severity",       p.severity);
  pair("Product",        p.product,                   "Batch",          p.batch);
  pair("Status",         p.status,                    "Customer Satisfied", p.customerSatisfied);

  if (p.description)    { section("Description");        wide("Description", p.description); }
  if (p.investigation)  { section("Investigation");      wide("Investigation", p.investigation); }
  if (p.rootCause)      { section("Root Cause");         wide("Root Cause", p.rootCause); }
  if (p.capa)           { section("CAPA");               wide("CAPA", p.capa); }

  section("Closure");
  pair("Closure Date", formatDMY(p.closureDate), "Closed By", p.closedBy);
  if (p.closureRemarks) wide("Closure Remarks", p.closureRemarks);

  if (Array.isArray(p.attachments) && p.attachments.length) {
    section("Attachments");
    p.attachments.forEach((a, i) => {
      ws.getCell(r, 1).value = `Attachment ${i + 1}`;
      ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
      ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 2, r, NC);
      const url = typeof a === "string" ? a : a?.url;
      const v = ws.getCell(r, 2);
      v.value = url ? { text: url, hyperlink: url } : "";
      v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      v.alignment = left;
      v.border = BORDER_BLACK;
      ws.getRow(r).height = 18;
      r++;
    });
  }

  addFooter(ws, {
    checkedBy:  p.investigatedBy || "",
    verifiedBy: p.closedBy || "",
  }, NC);
  return ws;
}
