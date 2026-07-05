// src/pages/settings/excel-exporters/qcs_stock_rotation.js
// Mirrors src/pages/monitor/branches/qcs/StockRotationView.jsx (each record = one sheet).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const COLS = [
  { key: "productCode",     label: "Product Code",    width: 14 },
  { key: "productName",     label: "Product Name",    width: 26, align: "left" },
  { key: "batchNo",         label: "Batch No.",       width: 14 },
  { key: "productionDate",  label: "Production Date",  width: 14 },
  { key: "expiryDate",      label: "Expiry Date",     width: 14 },
  { key: "daysToExpiry",    label: "Days to Expiry",  width: 10 },
  { key: "quantity",        label: "Quantity",        width: 12 },
  { key: "positionCorrect", label: "Position OK",     width: 10 },
  { key: "remarks",         label: "Remarks",         width: 24, align: "left" },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const items = Array.isArray(p.items) ? p.items : [];
  const summary = p.summary || {};
  const extras = Array.isArray(p.images?.extras) ? p.images.extras : [];

  const NC = COLS.length; // 9
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Stock Rotation (FIFO / FEFO) Audit",
    documentNo:    "FF-QM/REC/SR",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "STOCK ROTATION AUDIT",
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
  // two label/value pairs across 9 cols: [1]l1 [2-4]v1 [5]l2 [6-9]v2
  const kv2 = (l1, v1, l2, v2) => {
    ws.getCell(r, 1).value = l1;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = display(v1); ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = left; ws.getCell(r, 2).border = BORDER_BLACK;
    if (l2 != null) {
      ws.getCell(r, 5).value = l2;
      ws.getCell(r, 5).font = lblFont; ws.getCell(r, 5).fill = lblFill; ws.getCell(r, 5).alignment = left; ws.getCell(r, 5).border = BORDER_BLACK;
      ws.mergeCells(r, 6, r, 9);
      ws.getCell(r, 6).value = display(v2); ws.getCell(r, 6).font = { size: 10 }; ws.getCell(r, 6).alignment = left; ws.getCell(r, 6).border = BORDER_BLACK;
    } else {
      ws.mergeCells(r, 5, r, 9);
      ws.getCell(r, 5).border = BORDER_BLACK;
    }
    ws.getRow(r).height = 20; r++;
  };
  const wide = (label, val) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 }; v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };

  section("Audit Details");
  kv2("Report Date", formatDMY(p.reportDate), "Audit Time", p.auditTime);
  kv2("Location", p.location, "Storage Area", p.storageArea);
  kv2("Rotation Method", p.rotationMethod, null, null);

  section(`Audited Items (${items.length})`);
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 24; r++;

  if (!items.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No items —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    items.forEach((it, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      const row = {
        ...it,
        productionDate: formatDMY(it.productionDate),
        expiryDate: formatDMY(it.expiryDate),
        quantity: `${display(it.quantity)} ${it.unit || ""}`.trim(),
        positionCorrect: it.positionCorrect ? "✓" : "✗",
      };
      let maxLines = 1;
      COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = display(row[col.key]);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
        const lines = String(row[col.key] ?? "").split("\n").length;
        if (lines > maxLines) maxLines = lines;
      });
      ws.getRow(r).height = Math.max(20, Math.min(maxLines, 6) * 14); r++;
    });
  }

  section("Summary");
  kv2("Overall Compliance", summary.overallCompliance, "Near-Expiry Qty", summary.nearExpiryQty);
  kv2("Expired Qty", summary.expiredQty, null, null);

  if (p.findings)          { section("Findings"); wide("Findings", p.findings); }
  if (p.correctiveActions) { section("Corrective Actions"); wide("Corrective Actions", p.correctiveActions); }

  if (extras.length) {
    section("Attachments");
    extras.forEach((u, i) => {
      const url = typeof u === "string" ? u : u?.url;
      ws.getCell(r, 1).value = `Image ${i + 1}`;
      ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 2, r, NC);
      const v = ws.getCell(r, 2);
      v.value = url ? { text: url, hyperlink: url } : "";
      v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      v.alignment = left; v.border = BORDER_BLACK;
      ws.getRow(r).height = 18; r++;
    });
  }

  addFooter(ws, {
    checkedBy:  p.auditedBy || "",
    verifiedBy: p.verifiedBy || "",
  }, NC);
  return ws;
}
