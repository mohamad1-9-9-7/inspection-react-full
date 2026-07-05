// src/pages/settings/excel-exporters/qcs_product_rejection.js
// Mirrors src/pages/monitor/branches/qcs/ProductRejectionView.jsx (each record = one sheet).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const photos = Array.isArray(p.photos) ? p.photos : [];

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 24 }, { width: 26 }, { width: 24 }, { width: 26 }];

  addDocHeader(ws, {
    documentTitle: "Product Rejection Record",
    documentNo:    "FF-QM/REC/PRJ",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "PRODUCT REJECTION RECORD",
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
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
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 16); r++;
  };

  section("Rejection Details");
  pair("Report Date", formatDMY(p.reportDate), "Product Name", p.productName);
  pair("Category",    p.category,              "Batch No.",    p.batchNo);
  pair("Supplier",    p.supplier,              "Quantity",     p.quantity ? `${p.quantity} ${p.unit || ""}` : "");

  section("Decision");
  wide("Reason for Rejection", p.reason);
  pair("Disposition", p.disposition, null, null);
  pair("Inspected By", p.inspectedBy, "Approved By", p.approvedBy);

  if (p.notes) { section("Notes"); wide("Notes", p.notes); }

  if (photos.length) {
    section("Attachments");
    photos.forEach((u, i) => {
      const url = typeof u === "string" ? u : u?.url;
      ws.getCell(r, 1).value = `Photo ${i + 1}`;
      ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
      ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 2, r, NC);
      const v = ws.getCell(r, 2);
      v.value = url ? { text: url, hyperlink: url } : "";
      v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      v.alignment = left; v.border = BORDER_BLACK;
      ws.getRow(r).height = 18; r++;
    });
  }

  addFooter(ws, {
    checkedBy:  p.inspectedBy || "",
    verifiedBy: p.approvedBy || "",
  }, NC);
  return ws;
}
