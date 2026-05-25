import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

export function makeFtrCleanBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : (Array.isArray(p.cleanlinessRows) ? p.cleanlinessRows : []);

    const HEAD = [
      { label: "Sl-No",            width: 8  },
      { label: "General Cleaning", width: 36 },
      { label: "C / NC",           width: 10 },
      { label: "Observation",      width: 22 },
      { label: "Informed To",      width: 14 },
      { label: "Remarks & CA",     width: 26 },
    ];
    const NC = HEAD.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupPortrait(ws);
    ws.columns = HEAD.map((h) => ({ width: h.width }));

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Daily Cleanliness`,
      documentNo:    "FS-QM/REC/CLN",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — DAILY CLEANLINESS CHECKLIST`,
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    HEAD.forEach((h, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = h.label;
      c.font = { bold: true, size: 11, color: { argb: COLORS.TEXT } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22;
    r++;

    if (!entries.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No rows.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      entries.forEach((row, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        const isSection = !!row?.isSection;
        const values = [
          isSection ? "—" : (row?.slNo || row?.letter || i + 1),
          row?.general || row?.item || row?.section || "",
          isSection ? "—" : (row?.cncStatus || row?.status || ""),
          isSection ? "—" : (row?.observation || ""),
          isSection ? "—" : (row?.informedTo || ""),
          isSection ? "—" : (row?.remarks || ""),
        ];
        values.forEach((v, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value = v ?? "";
          c.font = isSection
            ? { bold: true, size: 10, color: { argb: COLORS.NAVY } }
            : { size: 10 };
          c.fill = fillSolid(isSection ? COLORS.SKY_LIGHT : bg);
          c.alignment = ci === 1 || ci === 5
            ? { ...left, wrapText: true }
            : center;
          c.border = BORDER_BLACK;
          const s = String(v ?? "").trim().toLowerCase();
          if (ci === 2 && (s === "c" || s === "ok" || s === "√")) {
            c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
            c.fill = fillSolid(COLORS.GREEN_BG);
          } else if (ci === 2 && (s === "nc" || s === "n/c" || s === "✗")) {
            c.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
            c.fill = fillSolid(COLORS.RED_BG);
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
