// src/pages/settings/excel-exporters/cars_loading_inspection.js
// Outbound Loading / Truck Inspection checklist — one report = one sheet.
// Mirrors src/pages/car/pages/LoadingReports.jsx (header + per-vehicle rows).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const COLS = [
  { key: "_sl",                   label: "SL",             width: 5  },
  { key: "vehicleNo",             label: "Vehicle No.",    width: 13, align: "left" },
  { key: "driverName",            label: "Driver",         width: 16, align: "left" },
  { key: "timeStart",             label: "Start",          width: 9  },
  { key: "timeEnd",               label: "End",            width: 9  },
  { key: "tempCheck",             label: "Temp",           width: 9  },
  { key: "trafficControlSpotter", label: "Spotter",        width: 9  },
  { key: "vehicleSecured",        label: "Veh. Secured",   width: 11 },
  { key: "loadSecured",           label: "Load Secured",   width: 11 },
  { key: "areaSafe",              label: "Area Safe",      width: 10 },
  { key: "manualHandlingControls",label: "Manual Handling", width: 12 },
  { key: "floorSealingIntact",    label: "Floor Sealing",  width: 11 },
  { key: "floorCleaning",         label: "Floor Clean",    width: 11 },
  { key: "pestActivites",         label: "Pest",           width: 8  },
  { key: "plasticCurtain",        label: "Curtain",        width: 10 },
  { key: "badOdour",              label: "Bad Odour",      width: 10 },
  { key: "ppeAvailable",          label: "PPE",            width: 8  },
  { key: "informedTo",            label: "Informed To",    width: 14, align: "left" },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.header || {};
  const rows = Array.isArray(p.rows) ? p.rows : [];

  const NC = COLS.length; // 18
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "Outbound Checklist",
    documentNo:    h.documentNo    || "FSM-QM/REC/OCL",
    issueDate:     h.issueDate     || "24/04/2025",
    revisionNo:    h.revisionNo    || "1",
    area:          h.area          || "LOGISTIC",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: h.controllingOfficer || "Logistic Manager",
    approvedBy:    h.approvedBy     || "ALTAF KHAN",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "OUTBOUND LOADING CHECKLIST",
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 9 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 30; r++;

  if (!rows.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No vehicles inspected —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        const v = col.key === "_sl" ? ri + 1 : row[col.key];
        c.value = display(v);
        c.font = { size: 9, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 18; r++;
    });
  }

  addFooter(ws, {
    checkedBy:  p.inspectedBy || "",
    verifiedBy: p.verifiedBy || "",
  }, NC);
  return ws;
}
