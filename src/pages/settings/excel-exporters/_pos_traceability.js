import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { key: "date",             label: "Date",             width: 12 },
  { key: "rawName",          label: "Raw Material",     width: 22 },
  { key: "supplier",         label: "Supplier",         width: 18 },
  { key: "productionDate",   label: "Production Date",  width: 14 },
  { key: "expiryDate",       label: "Expiry Date",      width: 14 },
  { key: "finalProduct",     label: "Final Product",    width: 22 },
  { key: "finalProdDate",    label: "Final Prod. Date", width: 14 },
  { key: "finalExpDate",     label: "Final Exp. Date",  width: 14 },
  { key: "storageLocation",  label: "Storage Location", width: 16 },
  { key: "disposalReason",   label: "Disposal Reason",  width: 18 },
  { key: "checkedBy",        label: "Checked by",       width: 14 },
];

export function makePosTraceabilityBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : (Array.isArray(p.rows) ? p.rows : []);

    const NC = COLS.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = COLS.map((c) => ({ width: c.width }));

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Traceability Log`,
      documentNo:    "FS-QM/REC/TRC",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — TRACEABILITY LOG`,
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    COLS.forEach((c, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = c.label;
      cell.font = { bold: true, size: 10, color: { argb: COLORS.TEXT } };
      cell.fill = fillSolid(COLORS.GRAY_HEAD);
      cell.alignment = { ...center, wrapText: true };
      cell.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 28;
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
          if (/date/i.test(col.key)) v = formatDMY(v);
          const c = ws.getCell(r, ci + 1);
          c.value = v ?? "";
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = { ...center, wrapText: true };
          c.border = BORDER_BLACK;
        });
        ws.getRow(r).height = 22;
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
