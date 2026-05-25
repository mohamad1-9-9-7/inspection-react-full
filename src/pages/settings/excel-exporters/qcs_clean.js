// src/pages/settings/excel-exporters/qcs_clean.js
// Mirrors src/pages/monitor/branches/qcs/DailyCleanlinessView.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

const HEAD = [
  { label: "SI-No",                       width: 8 },
  { label: "General Cleaning",            width: 40 },
  { label: "Observation (C / N / C)",     width: 18 },
  { label: "Informed to",                 width: 16 },
  { label: "Remarks & CA",                width: 28 },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p   = record?.payload || {};
  const hdr = p.header || p?.headers?.dcHeader || {};
  const ftr = p.footer || p?.headers?.dcFooter || {};

  const raw = p.cleanlinessRows || p.entries || p.rows || [];
  const rows = Array.isArray(raw) ? raw : [];

  const NC = HEAD.length;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = HEAD.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: hdr.documentTitle || "QCS — Daily Cleanliness",
    documentNo:    hdr.documentNo    || "FS-QM/REC/CLN",
    issueDate:     hdr.issueDate     || "",
    revisionNo:    hdr.revisionNo    || "01",
    area:          hdr.area          || "QCS Warehouse",
    issuedBy:      hdr.issuedBy      || "QA Manager",
    controllingOfficer: hdr.controllingOfficer || "QC Team",
    approvedBy:    hdr.approvedBy    || "Food Safety Team Leader",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC — AL QUSAIS",
    reportTitle:   "DAILY CLEANLINESS CHECKLIST",
    reportDate:    formatDMY(extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  // Table header
  HEAD.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, size: 11, color: { argb: COLORS.TEXT } };
    c.fill = fillSolid(COLORS.GRAY_HEAD);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 24;
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
      const isSection = !!row?.isSection;
      const letter      = row?.letter || row?.secNo || row?.slNo || (i + 1);
      const general     = row?.general || row?.section || row?.item || row?.itemEn || row?.itemAr || row?.groupEn || row?.groupAr || "";
      const observation = row?.observation || row?.result || row?.status || "";
      const informedTo  = row?.informedTo || row?.informed || "";
      const remarks     = row?.remarks || "";

      const values = [
        isSection ? "—" : letter,
        general,
        isSection ? "—" : observation,
        isSection ? "—" : informedTo,
        isSection ? "—" : remarks,
      ];

      values.forEach((v, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = v ?? "";
        c.font = isSection
          ? { bold: true, size: 10, color: { argb: COLORS.NAVY } }
          : { size: 10 };
        c.fill = isSection ? fillSolid(COLORS.SKY_LIGHT) : fillSolid(COLORS.WHITE);
        c.alignment = ci === 1 || ci === 4
          ? { horizontal: "left", vertical: "middle", wrapText: true }
          : center;
        c.border = BORDER_BLACK;
        const s = String(v ?? "").trim().toLowerCase();
        if (s === "c" || s === "√" || s === "ok") {
          c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
          c.fill = fillSolid(COLORS.GREEN_BG);
        } else if (s === "nc" || s === "n/c" || s === "✗") {
          c.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
          c.fill = fillSolid(COLORS.RED_BG);
        }
      });
      ws.getRow(r).height = isSection ? 22 : 20;
      r++;
    });
  }

  addFooter(ws, {
    checkedBy:  ftr.checkedBy  || "",
    verifiedBy: ftr.verifiedBy || "",
  }, NC);

  return ws;
}
