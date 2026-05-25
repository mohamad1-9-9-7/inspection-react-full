// src/pages/settings/excel-exporters/preloading.js
// Mirrors FTR1/FTR2 Preloading Inspection viewers — both share the same shape.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const ROWS_DEF = [
  { key: "no",                 label: "SAMPLE NO",         width: 8  },
  { key: "productName",        label: "PRODUCT NAME",      width: 20 },
  { key: "area",               label: "AREA",              width: 14 },
  { key: "truckTemp",          label: "TRUCK TEMP",        width: 10 },
  { key: "proDate",            label: "PRO DATE",          width: 12 },
  { key: "expDate",            label: "EXP DATE",          width: 12 },
  { key: "deliveryDate",       label: "DELIVERY DATE",     width: 12 },
  { key: "quantity",           label: "QUANTITY",          width: 10 },
  { key: "colorCode",          label: "COLOR CODE",        width: 10 },
  { key: "productTemp",        label: "PRODUCT TEMP °C",   width: 11 },
  { key: "labelling",          label: "LABELLING",         width: 12 },
  { key: "appearance",         label: "APPEARANCE",        width: 12 },
  { key: "color",              label: "COLOR",             width: 10 },
  { key: "brokenDamage",       label: "BROKEN/DAMAGE",     width: 12 },
  { key: "badSmell",           label: "BAD SMELL",         width: 10 },
  { key: "overallCondition",   label: "OVERALL CONDITION", width: 14 },
  { key: "remarks",            label: "REMARKS",           width: 20 },
];

function makeBuilder(branchTitle, siteLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const header = p.header || {};
    const samples = Array.isArray(p.samples) ? p.samples : (Array.isArray(p.rows) ? p.rows : []);
    const signoff = p.signoff || {};

    const NC = ROWS_DEF.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = ROWS_DEF.map((c) => ({ width: c.width }));

    addDocHeader(ws, {
      documentTitle: `Preloading Inspection — ${branchTitle}`,
      documentNo:    "FF-QM/REC/PRELOAD",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
      reportTitle:   `${branchTitle.toUpperCase()} — PRELOADING INSPECTION  (${siteLabel})`,
      reportDate:    formatDMY(header.reportEntryDate || header.date || p?.meta?.entryDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    // Table header
    ROWS_DEF.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = col.label;
      c.font = { bold: true, size: 9, color: { argb: COLORS.NAVY } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 28;
    r++;

    if (!samples.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No samples recorded.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      samples.forEach((row, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        ROWS_DEF.forEach((col, ci) => {
          let val = row?.[col.key];
          if (col.key === "no" && (val === undefined || val === "")) val = i + 1;
          if (col.key === "proDate" || col.key === "expDate" || col.key === "deliveryDate") val = formatDMY(val);
          const c = ws.getCell(r, ci + 1);
          c.value = val ?? "";
          c.font = { size: 9 };
          c.fill = fillSolid(bg);
          c.alignment = col.key === "remarks"
            ? { ...left, wrapText: true }
            : center;
          c.border = BORDER_BLACK;
          // Highlight bad
          if (col.key === "badSmell" && /yes|bad/i.test(String(val))) {
            c.font = { bold: true, color: { argb: COLORS.RED } };
            c.fill = fillSolid(COLORS.RED_BG);
          }
          if (col.key === "overallCondition") {
            if (/reject|fail|bad/i.test(String(val))) {
              c.font = { bold: true, color: { argb: COLORS.RED } };
              c.fill = fillSolid(COLORS.RED_BG);
            } else if (/pass|good|ok|accept/i.test(String(val))) {
              c.font = { bold: true, color: { argb: COLORS.GREEN } };
              c.fill = fillSolid(COLORS.GREEN_BG);
            }
          }
          // Temperature
          if (col.key === "productTemp" || col.key === "truckTemp") {
            const n = parseFloat(val);
            if (!isNaN(n) && n >= 5 && col.key === "productTemp") {
              c.font = { bold: true, color: { argb: COLORS.RED } };
              c.fill = fillSolid(COLORS.RED_BG);
            }
          }
        });
        ws.getRow(r).height = 22;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  signoff.checkedBy || signoff.matchedBy || "",
      verifiedBy: signoff.verifiedBy || "",
    }, NC);
    return ws;
  };
}

export const ftr1PreloadingBuilder = makeBuilder("FTR 1 Food Truck", "MUSHRIF PARK");
export const ftr2PreloadingBuilder = makeBuilder("FTR 2 Food Truck", "MUSHRIF PARK");
export default ftr1PreloadingBuilder;
