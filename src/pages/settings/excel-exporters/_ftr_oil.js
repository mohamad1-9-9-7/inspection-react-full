import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

export function makeFtrOilBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : [];

    const HEAD = [
      { label: "Date",                width: 14 },
      { label: "Evaluation Results", width: 26 },
      { label: "Corrective Action",  width: 26 },
      { label: "Checked By",         width: 16 },
      { label: "Verified By",        width: 16 },
    ];
    const NC = HEAD.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupPortrait(ws);
    ws.columns = HEAD.map((h) => ({ width: h.width }));

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Oil Calibration Log`,
      documentNo:    "FS-QM/REC/OIL",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — OIL QUALITY CALIBRATION LOG`,
      reportDate:    formatDMY(entries[0]?.date || p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    HEAD.forEach((h, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = h.label;
      c.font = { bold: true, size: 10, color: { argb: COLORS.TEXT } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 24;
    r++;

    if (!entries.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "— No entries —";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      entries.forEach((e, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        const values = [
          formatDMY(e.date),
          e.evaluationResults || e.results || "",
          e.correctiveAction || "",
          e.checkedBy || "",
          e.verifiedBy || "",
        ];
        values.forEach((v, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value = v ?? "";
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = ci === 1 || ci === 2
            ? { ...left, wrapText: true }
            : center;
          c.border = BORDER_BLACK;
        });
        ws.getRow(r).height = 22;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  entries[0]?.checkedBy || "",
      verifiedBy: entries[0]?.verifiedBy || "",
    }, NC);
    return ws;
  };
}
