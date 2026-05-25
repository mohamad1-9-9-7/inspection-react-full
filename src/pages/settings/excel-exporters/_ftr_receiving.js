import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { key: "supplier",        label: "Name of the Supplier",   width: 22, align: "left" },
  { key: "foodItem",        label: "Food Item",              width: 18, align: "left" },
  { key: "dmApprovalNo",    label: "DM approval No. of vehicle", width: 18, align: "left" },
  { key: "vehicleTemp",     label: "Vehicle Temp (°C)",      width: 12 },
  { key: "foodTemp",        label: "Food Temp (°C)",         width: 12 },
  { key: "vehicleClean",    label: "Vehicle clean",          width: 12 },
  { key: "handlerHygiene",  label: "Handler hygiene",        width: 12 },
  { key: "appearanceOK",    label: "Appearance",             width: 12 },
  { key: "smellOK",         label: "Smell",                  width: 10 },
  { key: "packagingGood",   label: "Packaging OK",           width: 14 },
  { key: "countryOfOrigin", label: "Country of origin",      width: 14 },
  { key: "productionDate",  label: "Production Date",        width: 13 },
  { key: "expiryDate",      label: "Expiry Date",            width: 13 },
  { key: "remarks",         label: "Remarks (if any)",       width: 22, align: "left" },
  { key: "receivedBy",      label: "Received by",            width: 14 },
];

export function makeFtrReceivingBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : [];

    const NC = 1 + COLS.length; // + S.No
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = [{ width: 6 }, ...COLS.map((c) => ({ width: c.width }))];

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Receiving Log`,
      documentNo:    "FS-QM/REC/REL",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — RECEIVING LOG`,
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    const head = ["S.No", ...COLS.map((c) => c.label)];
    head.forEach((h, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = h;
      c.font = { bold: true, size: 9, color: { argb: COLORS.TEXT } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = { ...center, wrapText: true };
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 32;
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
        const bg = i % 2 === 0 ? COLORS.WHITE : "FAFBFF";
        const c0 = ws.getCell(r, 1);
        c0.value = i + 1;
        c0.font = { bold: true, size: 9 };
        c0.fill = fillSolid(bg);
        c0.alignment = center;
        c0.border = BORDER_BLACK;
        COLS.forEach((col, ci) => {
          let v = row[col.key];
          if (col.key === "productionDate" || col.key === "expiryDate") v = formatDMY(v);
          const cell = ws.getCell(r, ci + 2);
          cell.value = v ?? "";
          cell.font = { size: 9 };
          cell.fill = fillSolid(bg);
          cell.alignment = col.align === "left"
            ? { ...left, wrapText: true }
            : { ...center, wrapText: true };
          cell.border = BORDER_BLACK;
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
