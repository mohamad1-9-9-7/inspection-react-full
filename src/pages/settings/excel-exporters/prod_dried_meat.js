// src/pages/settings/excel-exporters/prod_dried_meat.js
// Mirrors src/pages/monitor/branches/production/DriedMeatProcessView.jsx.
// One batch = one sheet: raw material, curing, dehydrator setup, drying log,
// cooling, final parameters, sensory, packaging, metrics.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const DRYING_COLS = [
  { key: "elapsedHrs",  label: "Elapsed Hrs", width: 10 },
  { key: "date",        label: "Date",        width: 13 },
  { key: "time",        label: "Time",        width: 9  },
  { key: "temperature", label: "Temp °C",     width: 10 },
  { key: "humidity",    label: "Humidity %",  width: 11 },
  { key: "position",    label: "Position",    width: 12 },
  { key: "weight",      label: "Weight",      width: 12 },
  { key: "notes",       label: "Notes",       width: 28, align: "left" },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.header || {};
  const f = p.form || {};
  const m = p.metrics || {};
  const dryingLog = Array.isArray(f.dryingLog) ? f.dryingLog : [];

  const NC = 8;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = DRYING_COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "Dried Meat Process Record",
    documentNo:    h.documentNo    || "TELT /QA/DM/1",
    issueDate:     h.issueDate     || "",
    revisionNo:    h.revisionNo    || "0",
    area:          h.area          || "QA",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: h.controllingOfficer || "QC Assistant",
    approvedBy:    h.approvedBy     || "Hussam O. Sarhan — Director",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   `DRIED MEAT PROCESS RECORD${f.batchId ? `  ·  Batch ${f.batchId}` : ""}`,
    reportDate:    formatDMY(p.reportDate || f.startDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  const section = (title, fill = COLORS.NAVY) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(fill); c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };
  // 2 label/value pairs across 8 cols: [1]l1 [2-4]v1 [5]l2 [6-8]v2
  const kv2 = (l1, v1, l2, v2) => {
    ws.getCell(r, 1).value = l1;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = display(v1); ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = left; ws.getCell(r, 2).border = BORDER_BLACK;
    if (l2 != null) {
      ws.getCell(r, 5).value = l2;
      ws.getCell(r, 5).font = lblFont; ws.getCell(r, 5).fill = lblFill; ws.getCell(r, 5).alignment = left; ws.getCell(r, 5).border = BORDER_BLACK;
      ws.mergeCells(r, 6, r, 8);
      ws.getCell(r, 6).value = display(v2); ws.getCell(r, 6).font = { size: 10 }; ws.getCell(r, 6).alignment = left; ws.getCell(r, 6).border = BORDER_BLACK;
    } else {
      ws.mergeCells(r, 5, r, 8);
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

  section("Batch & Raw Material");
  kv2("Batch ID", f.batchId, "Product Type", f.productType);
  kv2("Product Name", f.productName, "Raw Meat Type", f.rawMeatType);
  kv2("Raw Source", f.rawSource, "Raw Lot No.", f.rawLotNo);
  kv2("Raw Prod. Date", formatDMY(f.rawProdDate), "Raw Exp. Date", formatDMY(f.rawExpDate));
  kv2("Initial Weight", f.initialWeight, "Received Date", formatDMY(f.receivedDate));
  kv2("Start Date", formatDMY(f.startDate), "Expected End", formatDMY(f.expectedEndDate));

  section("Curing", COLORS.NAVY_LIGHT);
  kv2("Salt %", f.saltPct, "Nitrite ppm", f.nitritePpm);
  kv2("Curing Temp", f.curingTemp, "Curing Hours", f.curingHours);
  kv2("Curing Start", f.curingStart, "Curing End", f.curingEnd);
  if (f.spices)      wide("Spices", f.spices);
  if (f.curingNotes) wide("Curing Notes", f.curingNotes);

  section("Dehydrator Setup", COLORS.NAVY_LIGHT);
  kv2("Batch Capacity", f.batchCapacity, "Hanging Pieces", f.hangingPieces);
  kv2("Hanging Levels", f.hangingLevels, "Target Temp", f.targetTemp);
  kv2("Target Humidity", f.targetHumidity, "Fan Speed", f.fanSpeed);
  kv2("Program Mode", f.programMode, "Cycle Hours", f.cycleHours);

  section(`Drying Log (${dryingLog.length})`, COLORS.NAVY_LIGHT);
  DRYING_COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 22; r++;
  if (!dryingLog.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No drying-log rows —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    dryingLog.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      DRYING_COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        let v = row[col.key];
        if (col.key === "date") v = formatDMY(v);
        c.value = display(v);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 18; r++;
    });
  }

  section("Post-Drying & Cooling", COLORS.NAVY_LIGHT);
  kv2("Cooling Time", f.coolingTime, "Cooling Temp", f.coolingTemp);
  kv2("Rotation Count", f.rotationCount, null, null);
  if (f.rotationNote) wide("Rotation Note", f.rotationNote);

  section("Final Parameters", COLORS.NAVY_LIGHT);
  kv2("Water Activity (aw)", f.waterActivity, "pH", f.ph);
  kv2("Final Moisture", f.finalMoisture, "Salt Content", f.saltContent);
  kv2("Final Weight", f.finalWeight, "Yield %", f.yieldPct);

  section("Sensory Evaluation (C / NC)", COLORS.NAVY_LIGHT);
  kv2("Color", f.senColor, "Texture", f.senTexture);
  kv2("Odor", f.senOdor, "Appearance", f.senAppearance);

  section("Packaging & Storage", COLORS.NAVY_LIGHT);
  kv2("Packaging Type", f.packagingType, "Storage Temp", f.storageTemp);
  kv2("Best Before", formatDMY(f.bestBefore), "Output Count", f.outputCount);

  section("Computed Metrics", COLORS.NAVY_LIGHT);
  kv2("Weight Loss %", m.weightLossPct, "Yield %", m.yieldPct);
  kv2("aw Pass", m.awPass ? "✓" : "✗", "pH Pass", m.phPass ? "✓" : "✗");

  addFooter(ws, {
    checkedBy:  f.checkedBy || "",
    verifiedBy: f.verifiedBy || "",
  }, NC);
  return ws;
}
