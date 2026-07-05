// src/pages/settings/excel-exporters/real_recall.js
// Real Product Recall record (ISO 22000:2018 §8.9.5).
// Mirrors src/pages/haccp and iso/RealRecall/RealRecallView.jsx — identification,
// affected product, quantities/recovery, authority-notification matrix (with SLA
// timestamps), public communication, disposition, cost, root-cause & closure.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

const AUTHORITIES = [
  ["DM", "Dubai Municipality"],
  ["ADAFSA", "ADAFSA"],
  ["MOCCAE", "MOCCAE"],
  ["MOH", "Ministry of Health"],
  ["Customer", "Customer(s)"],
];

function recoveryRate(dist, rec) {
  const d = parseFloat(dist);
  const r = parseFloat(rec);
  if (isNaN(d) || isNaN(r) || d === 0) return "";
  return `${Math.min(100, (r / d) * 100).toFixed(1)}%`;
}

/* Show ISO datetime as DD/MM/YYYY HH:MM */
function fmtDateTime(iso) {
  if (!iso) return "";
  const s = String(iso);
  const [d, t] = s.split("T");
  const day = formatDMY(d);
  const time = t ? t.slice(0, 5) : "";
  return time ? `${day} ${time}` : day;
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const auth = p.authorities || {};
  const authAt = p.authoritiesNotifiedAt || {};

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 26 }, { width: 24 }, { width: 22 }, { width: 24 }];

  addDocHeader(ws, {
    documentTitle: "Product Recall Record",
    documentNo:    "FS-HACCP/REC/RR",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "QA / FSMS",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "FSMS Team Leader",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "PRODUCT RECALL RECORD — ISO 22000:2018 §8.9.5",
    reportDate:    formatDMY(p.initDate || extractDate(record)),
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
  const pair = (l1, v1, l2, v2) => {
    [[1, 2, l1, v1], [3, 4, l2, v2]].forEach(([lc, vc, lbl, v]) => {
      if (lbl == null) { ws.getCell(r, lc).border = BORDER_BLACK; ws.getCell(r, vc).border = BORDER_BLACK; return; }
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
    ws.getCell(r, 1).alignment = { ...left, wrapText: true }; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };

  section("Recall Identification");
  pair("Recall No.",  p.recallNumber, "Initiation Date", formatDMY(p.initDate));
  pair("Initiated By", p.initiatedBy, "Recall Class",   `Class ${p.recallClass || ""}`);
  pair("Reason",       p.reason,      "Status",         p.status);
  if (p.reasonDetail) wide("Reason Detail", p.reasonDetail);

  section("Affected Product");
  wide("Product",          p.affectedProduct);
  wide("Affected Batches", p.affectedBatches);
  pair("Production Dates", p.productionDates, "Expiry Range", p.expiryRange);

  section("Quantities & Recovery");
  pair("Qty Distributed", `${display(p.qtyDistributed)} ${p.unit || ""}`.trim(),
       "Qty Recovered",   `${display(p.qtyRecovered)} ${p.unit || ""}`.trim());
  pair("Recovery Rate",   recoveryRate(p.qtyDistributed, p.qtyRecovered), null, null);

  section("Authority Notification");
  // matrix header
  ["Authority", "Notified", "Notified At (Date / Time)"].forEach((h, i) => {
    const col = i === 0 ? 1 : i === 1 ? 2 : 3;
    if (i === 2) ws.mergeCells(r, 3, r, 4);
    const c = ws.getCell(r, col);
    c.value = h; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 20; r++;
  AUTHORITIES.forEach(([k, label]) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { size: 10 }; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.getCell(r, 2).value = auth[k] ? "✓" : "—";
    ws.getCell(r, 2).font = { size: 10, bold: true, color: { argb: auth[k] ? COLORS.GREEN : COLORS.TEXT_MUTED } };
    ws.getCell(r, 2).alignment = center; ws.getCell(r, 2).border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, 4);
    ws.getCell(r, 3).value = fmtDateTime(authAt[k]);
    ws.getCell(r, 3).font = { size: 10 }; ws.getCell(r, 3).alignment = center; ws.getCell(r, 3).border = BORDER_BLACK;
    ws.getRow(r).height = 18; r++;
  });
  if (p.authorityOther) wide("Other Authority", p.authorityOther);

  section("Public Communication");
  pair("Public Notice", p.publicNotice, null, null);
  if (p.mediaUsed)        wide("Media Used", p.mediaUsed);
  if (p.customersNotified) wide("Customers Notified", p.customersNotified);

  section("Disposition");
  pair("Disposition", p.disposition, null, null);
  if (p.dispositionDetails) wide("Disposition Details", p.dispositionDetails);

  section("Cost");
  pair("Total Cost", p.cost, null, null);
  if (p.costBreakdown) wide("Cost Breakdown", p.costBreakdown);

  section("Root Cause & Actions");
  wide("Root Cause",         p.rootCause);
  wide("Corrective Actions", p.correctiveActions);
  wide("Preventive Actions", p.preventiveActions);

  section("Closure");
  pair("Status", p.status, "Closure Date", formatDMY(p.closureDate));

  addFooter(ws, {
    checkedBy:  p.initiatedBy || "",
    verifiedBy: p.signedBy || "",
  }, NC);
  return ws;
}
