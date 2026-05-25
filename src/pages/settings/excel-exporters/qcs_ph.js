// src/pages/settings/excel-exporters/qcs_ph.js
// Mirrors src/pages/monitor/branches/qcs/PersonalHygieneView.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const HEAD_COLS = [
  { key: "sno",                  label: "S. No",                                     width: 7 },
  { key: "employeeName",         label: "Employee Name",                             width: 22 },
  { key: "nails",                label: "Nails",                                     width: 10 },
  { key: "hair",                 label: "Hair",                                      width: 10 },
  { key: "notWearingJewelries",  label: "No jewelry",                                width: 11 },
  { key: "wearingCleanCloth",    label: "Wearing clean clothes / hair net / gloves\n/ face mask / shoes", width: 26 },
  { key: "communicableDisease",  label: "Communicable disease(s)",                   width: 16 },
  { key: "openWounds",           label: "Open wounds / sores / cuts",                width: 16 },
  { key: "remarks",              label: "Remarks & Corrective Actions",              width: 28 },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p   = record?.payload || {};
  const hdr = p.header || p?.headers?.phHeader || {};
  const ftr = p.footer || p?.headers?.phFooter || {};

  const rowsRaw = Array.isArray(p.personalHygiene) ? p.personalHygiene
                : (Array.isArray(p.rows) ? p.rows : []);
  const rows = rowsRaw.map((x) => ({
    employeeName:        x?.employeeName ?? x?.employName ?? "",
    nails:               x?.nails ?? "",
    hair:                x?.hair ?? "",
    notWearingJewelries: x?.notWearingJewelries ?? x?.noJewelry ?? "",
    wearingCleanCloth:   x?.wearingCleanCloth ?? x?.cleanClothes ?? "",
    communicableDisease: x?.communicableDisease ?? "",
    openWounds:          x?.openWounds ?? "",
    remarks:             x?.remarks ?? "",
  }));

  const NC = HEAD_COLS.length;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = HEAD_COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: hdr.documentTitle || "Personal Hygiene Checklist",
    documentNo:    hdr.documentNo    || "FS-QM/REC/PH",
    issueDate:     hdr.issueDate     || "05/02/2020",
    revisionNo:    hdr.revisionNo    || "0",
    area:          hdr.area          || "QA",
    issuedBy:      hdr.issuedBy      || "MOHAMAD ABDULLAH QC",
    controllingOfficer: hdr.controllingOfficer || "Quality Controller",
    approvedBy:    hdr.approvedBy    || "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC — AL QUSAIS",
    reportTitle:   "PERSONAL HYGIENE CHECKLIST",
    reportDate:    formatDMY(extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  // Table header
  HEAD_COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, size: 10, color: { argb: COLORS.TEXT } };
    c.fill = fillSolid(COLORS.GRAY_HEAD);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 36;
  r++;

  if (!rows.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "No rows.";
    c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;
  } else {
    rows.forEach((row, i) => {
      const c1 = ws.getCell(r, 1);
      c1.value = i + 1;
      c1.alignment = center;
      c1.font = { size: 10 };
      c1.border = BORDER_BLACK;
      HEAD_COLS.slice(1).forEach((col, ci) => {
        const cell = ws.getCell(r, ci + 2);
        const v = row[col.key];
        cell.value = v ?? "";
        cell.font = { size: 10 };
        cell.alignment = col.key === "remarks"
          ? { horizontal: "left", vertical: "middle", wrapText: true }
          : center;
        cell.border = BORDER_BLACK;
        // Status coloring
        const s = String(v ?? "").trim();
        if (s === "√" || /^(pass|ok|yes|good|satisfactory)$/i.test(s)) {
          cell.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
          cell.fill = fillSolid(COLORS.GREEN_BG);
        } else if (s === "✗" || /^(fail|no|bad|unsatisfactory|reject)$/i.test(s)) {
          cell.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
          cell.fill = fillSolid(COLORS.RED_BG);
        }
      });
      ws.getRow(r).height = 20;
      r++;
    });
  }

  addFooter(ws, {
    checkedBy:  ftr.checkedBy  || "",
    verifiedBy: ftr.verifiedBy || "",
  }, NC);

  return ws;
}
