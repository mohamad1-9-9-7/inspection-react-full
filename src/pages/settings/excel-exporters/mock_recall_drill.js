// src/pages/settings/excel-exporters/mock_recall_drill.js
// Mock Recall / Traceability Drill record (ISO 22000:2018 §8.9.5).
// Mirrors src/pages/haccp and iso/MockRecall/MockRecallView.jsx — drill header,
// product info, backward-trace table, forward-trace table, timing, results, sign-off.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const BACKWARD_COLS = [
  { key: "material",     label: "Material / Ingredient", width: 26, align: "left" },
  { key: "supplier",     label: "Supplier",              width: 22, align: "left" },
  { key: "supplierLot",  label: "Supplier Lot",          width: 16 },
  { key: "dateReceived", label: "Date Received",         width: 14 },
  { key: "qtyUsed",      label: "Qty Used",              width: 12 },
  { key: "grnRef",       label: "GRN Ref",               width: 14 },
];

const FORWARD_COLS = [
  { key: "customer",       label: "Customer",        width: 26, align: "left" },
  { key: "dateDispatched", label: "Date Dispatched", width: 14 },
  { key: "qtyShipped",     label: "Qty Shipped",     width: 12 },
  { key: "vehicle",        label: "Vehicle",         width: 14 },
  { key: "driver",         label: "Driver",          width: 18, align: "left" },
  { key: "podConfirmed",   label: "POD Confirmed",   width: 12 },
];

function computeDuration(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = String(start).split(":").map(Number);
  const [eh, em] = String(end).split(":").map(Number);
  if ([sh, sm, eh, em].some((x) => Number.isNaN(x))) return "";
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const product = p.product || {};
  const timing = p.timing || {};
  const results = p.results || {};
  const signoff = p.signoff || {};
  const backward = Array.isArray(p.backwardTrace) ? p.backwardTrace : [];
  const forward = Array.isArray(p.forwardTrace) ? p.forwardTrace : [];

  const NC = 6;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = BACKWARD_COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Mock Recall / Traceability Drill",
    documentNo:    "FS-HACCP/REC/MR",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "QA / FSMS",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "FSMS Team Leader",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "MOCK RECALL / TRACEABILITY DRILL — ISO 22000:2018 §8.9.5",
    reportDate:    formatDMY(p.drillDate || extractDate(record)),
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
    c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };
  // two label/value pairs across 6 cols: [1]l1 [2-3]v1 [4]l2 [5-6]v2
  const kv2 = (l1, v1, l2, v2) => {
    ws.getCell(r, 1).value = l1;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
    ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, 3);
    ws.getCell(r, 2).value = display(v1);
    ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = left; ws.getCell(r, 2).border = BORDER_BLACK;
    ws.getCell(r, 3).border = BORDER_BLACK;
    if (l2 != null) {
      ws.getCell(r, 4).value = l2;
      ws.getCell(r, 4).font = lblFont; ws.getCell(r, 4).fill = lblFill;
      ws.getCell(r, 4).alignment = left; ws.getCell(r, 4).border = BORDER_BLACK;
      ws.mergeCells(r, 5, r, 6);
      ws.getCell(r, 5).value = display(v2);
      ws.getCell(r, 5).font = { size: 10 }; ws.getCell(r, 5).alignment = left; ws.getCell(r, 5).border = BORDER_BLACK;
      ws.getCell(r, 6).border = BORDER_BLACK;
    } else {
      ws.mergeCells(r, 4, r, 6);
      ws.getCell(r, 4).border = BORDER_BLACK;
    }
    ws.getRow(r).height = 20; r++;
  };
  const wide = (label, val) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
    ws.getCell(r, 1).alignment = { ...left, wrapText: true }; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };
  const renderTable = (cols, rows, emptyMsg) => {
    cols.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = col.label;
      c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
      c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22; r++;
    if (!rows.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = emptyMsg; c.alignment = center;
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
      ws.getRow(r).height = 20; r++;
      return;
    }
    rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      cols.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = display(row[col.key]);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20; r++;
    });
  };

  section("Drill Details");
  kv2("Drill Date", formatDMY(p.drillDate), "Drill Type", p.drillType);
  kv2("Drill Name", p.drillName,            "Drill Ref",  p.drillRef);
  kv2("Triggered By", p.triggeredBy, null, null);

  section("Product Under Trace");
  kv2("Product",  product.name,  "Batch / Lot", product.batch);
  kv2("Production Date", formatDMY(product.productionDate), "Expiry Date", formatDMY(product.expiryDate));
  kv2("Qty Produced", `${display(product.qtyProduced)} ${product.qtyUnit || ""}`.trim(), "Product Temp", product.temp);
  kv2("Branch", product.branch, null, null);

  section("Backward Traceability — Raw Materials In");
  renderTable(
    BACKWARD_COLS,
    backward.map((b) => ({ ...b, qtyUsed: `${display(b.qtyUsed)} ${b.qtyUnit || ""}`.trim(), dateReceived: formatDMY(b.dateReceived) })),
    "— No backward-trace rows —"
  );

  section("Forward Traceability — Finished Product Out");
  renderTable(
    FORWARD_COLS,
    forward.map((f) => ({ ...f, qtyShipped: `${display(f.qtyShipped)} ${f.qtyUnit || ""}`.trim(), dateDispatched: formatDMY(f.dateDispatched), podConfirmed: f.podConfirmed ? "✓" : "✗" })),
    "— No forward-trace rows —"
  );

  section("Timing & Results");
  kv2("Start Time", timing.startTime, "End Time", timing.endTime);
  kv2("Duration", computeDuration(timing.startTime, timing.endTime), "Qty Traced", results.qtyTraced);
  if (results.gaps)              wide("Gaps Identified", results.gaps);
  if (results.correctiveActions) wide("Corrective Actions", results.correctiveActions);

  addFooter(ws, {
    checkedBy:  signoff.conductedBy || "",
    verifiedBy: signoff.verifiedBy || "",
  }, NC);
  return ws;
}
