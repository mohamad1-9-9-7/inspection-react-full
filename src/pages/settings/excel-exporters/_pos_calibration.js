import {
  COLORS, BORDER_BLACK, fillSolid, center,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { key: "date",              label: "Date",              width: 12 },
  { key: "thermometerId",     label: "Thermometer ID",    width: 16 },
  { key: "type",              label: "Type",              width: 14 },
  { key: "testMethod",        label: "Test Method",       width: 16 },
  { key: "refTemp",           label: "Ref. °C",           width: 10 },
  { key: "readingTemp",       label: "Reading °C",        width: 12 },
  { key: "status",            label: "Status",            width: 10 },
  { key: "correctiveAction",  label: "Corrective Action", width: 22 },
  { key: "calibratedBy",      label: "Calibrated by",     width: 16 },
  { key: "nextDue",           label: "Next Due",          width: 14 },
];

export function makePosCalibrationBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : (Array.isArray(p.rows) ? p.rows : []);

    const NC = COLS.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = COLS.map((c) => ({ width: c.width }));

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Thermometer Calibration Log`,
      documentNo:    "FS-QM/REC/CAL",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — THERMOMETER CALIBRATION LOG`,
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    COLS.forEach((c, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = c.label;
      cell.font = { bold: true, size: 10, color: { argb: COLORS.TEXT } };
      cell.fill = fillSolid(COLORS.GRAY_HEAD);
      cell.alignment = center;
      cell.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22;
    r++;

    if (!entries.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No entries.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      entries.forEach((row, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        COLS.forEach((col, ci) => {
          let v = row[col.key];
          if (col.key === "date" || col.key === "nextDue") v = formatDMY(v);
          const c = ws.getCell(r, ci + 1);
          c.value = v ?? "";
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = col.key === "correctiveAction"
            ? { horizontal: "left", vertical: "middle", wrapText: true }
            : center;
          c.border = BORDER_BLACK;
          if (col.key === "status") {
            const s = String(v || "").toLowerCase();
            if (/pass|ok|good/.test(s)) {
              c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
              c.fill = fillSolid(COLORS.GREEN_BG);
            } else if (/fail|bad/.test(s)) {
              c.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
              c.fill = fillSolid(COLORS.RED_BG);
            }
          }
        });
        ws.getRow(r).height = 20;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  p?.footer?.checkedBy || "",
      verifiedBy: p?.footer?.verifiedBy || "",
    }, NC);
    return ws;
  };
}
