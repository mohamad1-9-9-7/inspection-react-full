// src/pages/settings/excel-exporters/truck_daily_cleaning.js
// Truck Daily Cleaning Checklist — one report = one sheet.
// Mirrors src/pages/car/pages/CleaningReports.jsx (header + per-truck rows).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const COLS = [
  { key: "_sl",         label: "SL",          width: 5  },
  { key: "truckNo",     label: "Truck No.",   width: 14, align: "left" },
  { key: "truckFloor",  label: "Floor",       width: 9  },
  { key: "airCurtain",  label: "Air Curtain", width: 11 },
  { key: "truckBody",   label: "Body",        width: 9  },
  { key: "truckDoor",   label: "Door",        width: 9  },
  { key: "railHook",    label: "Rail / Hook", width: 11 },
  { key: "truckPallets", label: "Pallets",    width: 10 },
  { key: "truckCrates", label: "Crates",      width: 10 },
  { key: "informedTo",  label: "Informed To", width: 16, align: "left" },
  { key: "remarks",     label: "Remarks",     width: 26, align: "left" },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.meta || {};
  const rows = Array.isArray(p.rows) ? p.rows : [];

  const NC = COLS.length; // 11
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "Truck Daily Cleaning Checklist",
    documentNo:    h.documentNo    || "TELT/SAN/TDCL/1",
    issueDate:     h.issueDate     || "2025-04-12",
    revisionNo:    h.revisionNo    || "1",
    area:          h.area          || "QA",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: h.controllingOfficer || "Online Quality Controller",
    approvedBy:    h.approvedBy     || "ALTAF KHAN",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "TRUCK DAILY CLEANING CHECKLIST",
    reportDate:    formatDMY(p.date || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 24; r++;

  if (!rows.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No trucks cleaned —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      let maxLines = 1;
      COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        const v = col.key === "_sl" ? ri + 1 : row[col.key];
        c.value = display(v);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
        const lines = String(v ?? "").split("\n").length;
        if (lines > maxLines) maxLines = lines;
      });
      ws.getRow(r).height = Math.max(18, Math.min(maxLines, 4) * 14); r++;
    });
  }

  addFooter(ws, { verifiedBy: "", checkedBy: "" }, NC);
  return ws;
}
