import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

export function makeFtrCookingLogBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : [];

    const HEAD = [
      { label: "Date",                    width: 13 },
      { label: "Time of Cooking",         width: 14 },
      { label: "Name of the Food",        width: 22 },
      { label: "Core Temp (°C)",          width: 13 },
      { label: "Time",                    width: 12 },
      { label: "Corrective Action (if any)", width: 22 },
      { label: "Checked by",              width: 14 },
    ];
    const NC = HEAD.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupPortrait(ws);
    ws.columns = HEAD.map((h) => ({ width: h.width }));

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Cooking Temperature Log`,
      documentNo:    "FS-QM/REC/CTL",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — COOKING TEMPERATURE LOG`,
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
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
      c.value = "No entries.";
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
          e.cookingTime || "",
          e.foodName || "",
          e.coreTemp ?? "",
          e.time || "",
          e.correctiveAction || "",
          e.checkedBy || "",
        ];
        values.forEach((v, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value = v ?? "";
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = ci === 2 || ci === 5
            ? { ...left, wrapText: true }
            : center;
          c.border = BORDER_BLACK;
          if (ci === 3) {
            const n = parseFloat(v);
            if (!isNaN(n) && n < 75) {
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
