// src/pages/settings/excel-exporters/_ftr_temp.js
// Shared FTR 1 / FTR 2 Temperature log builder — mirrors FTR1TemperatureView.jsx style.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const DEFAULT_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM",
  "2:00 PM","4:00 PM","6:00 PM","8:00 PM",
];

export function makeFtrTempBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const times = (p.times || DEFAULT_TIMES).filter(
      (t) => String(t).toLowerCase() !== "corrective action"
    );
    const coolersRaw = (p.coolers || []).map((c, idx) => ({
      ...c,
      __idx: idx,
      __name: String(c?.name || c?.label || `Cooler ${idx + 1}`),
    }));

    const NC = times.length + 2;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = [
      { width: 16 },
      ...times.map(() => ({ width: 11 })),
      { width: 28 },
    ];

    addDocHeader(ws, {
      documentTitle: `Temperature Control Record — ${branchLabel}`,
      documentNo:    "FS-QM/REC/TMP",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — TEMPERATURE CONTROL CHECKLIST (CCP)`,
      reportDate:    formatDMY(p.date || p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    // Table header
    const head = ["Cooler", ...times, "Remarks"];
    head.forEach((h, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = h;
      c.font = { bold: true, size: 11, color: { argb: COLORS.TEXT } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22;
    r++;

    if (!coolersRaw.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No coolers data.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      coolersRaw.forEach((c) => {
        ws.getCell(r, 1).value = c.__name;
        ws.getCell(r, 1).font = { bold: true, size: 10 };
        ws.getCell(r, 1).alignment = left;
        ws.getCell(r, 1).border = BORDER_BLACK;
        times.forEach((t, ti) => {
          const raw = c?.temps?.[t];
          const cell = ws.getCell(r, ti + 2);
          if (raw === undefined || raw === null || raw === "") {
            cell.value = "—";
            cell.font = { color: { argb: COLORS.TEXT_MUTED }, size: 10 };
          } else {
            cell.value = `${String(raw).trim()}°C`;
            cell.font = { size: 10 };
            const n = parseFloat(raw);
            if (!isNaN(n) && n >= 5) {
              cell.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
              cell.fill = fillSolid(COLORS.RED_BG);
            }
          }
          cell.alignment = center;
          cell.border = BORDER_BLACK;
        });
        const rm = ws.getCell(r, NC);
        rm.value = c?.remarks || "";
        rm.font = { size: 10 };
        rm.alignment = { ...left, wrapText: true };
        rm.border = BORDER_BLACK;
        ws.getRow(r).height = 20;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  p.checkedBy || "",
      verifiedBy: p.verifiedByManager || p.verifiedBy || "",
    }, NC);
    return ws;
  };
}
