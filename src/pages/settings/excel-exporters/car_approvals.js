// src/pages/settings/excel-exporters/car_approvals.js
// Vehicle / Transport Permit Approvals — one report holds ALL approval items
// (upserted under a fixed date). Renders items[] as one table.
// Mirrors src/pages/car/pages/ApprovalsView.jsx.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const COLS = [
  { key: "vehicleNo",    label: "Vehicle No.",   width: 14 },
  { key: "company",      label: "Company",       width: 26, align: "left" },
  { key: "emirate",      label: "Emirate",       width: 12 },
  { key: "tradeLicense", label: "Trade License", width: 16 },
  { key: "permitType",   label: "Permit Type",   width: 16 },
  { key: "foodType",     label: "Food Type",     width: 16 },
  { key: "issueDate",    label: "Issue Date",    width: 13 },
  { key: "expiryDate",   label: "Expiry Date",   width: 13 },
  { key: "remarks",      label: "Remarks",       width: 24, align: "left" },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const items = Array.isArray(p.items) ? p.items : [];

  const NC = COLS.length; // 9
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Vehicle Permit Approvals Register",
    documentNo:    "FSM-QM/REC/VPA",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "LOGISTIC",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Logistic Manager",
    approvedBy:    "ALTAF KHAN",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "VEHICLE PERMIT APPROVALS",
    reportDate:    formatDMY(extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  // count band
  ws.mergeCells(r, 1, r, NC);
  const cnt = ws.getCell(r, 1);
  cnt.value = `Total approvals: ${items.length}`;
  cnt.font = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
  cnt.fill = fillSolid(COLORS.GRAY_LIGHT);
  cnt.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  cnt.border = BORDER_BLACK;
  ws.getRow(r).height = 20; r++;

  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 24; r++;

  if (!items.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No approvals —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    items.forEach((it, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        let v = it[col.key];
        if (col.key === "issueDate" || col.key === "expiryDate") v = formatDMY(v);
        c.value = display(v);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 18; r++;
    });
  }

  addFooter(ws, { verifiedBy: "", checkedBy: "" }, NC);
  return ws;
}
