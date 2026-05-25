// src/pages/settings/excel-exporters/_ftr_ph.js
// Shared FTR Personal Hygiene exporter

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

export function makeFtrPhBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const rows = Array.isArray(p.entries) ? p.entries : (Array.isArray(p.personalHygiene) ? p.personalHygiene : []);

    const HEAD = [
      { label: "S.No",  width: 7 },
      { label: "Employee Name", width: 22 },
      ...HYGIENE_COLUMNS.map((c, i) => ({ label: c, width: i === 3 ? 30 : 12 })),
      { label: "Fit for Food Handling?", width: 14 },
      { label: "If No: Communicable disease", width: 18 },
      { label: "If No: Open wound", width: 14 },
      { label: "If No: Other", width: 16 },
      { label: "Remarks & Corrective Actions", width: 26 },
    ];
    const NC = HEAD.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = HEAD.map((h) => ({ width: h.width }));

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Personal Hygiene Checklist`,
      documentNo:    "FS-QM/REC/PH",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — PERSONAL HYGIENE CHECKLIST`,
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
    ws.getRow(r).height = 30;
    r++;

    if (!rows.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No rows.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      rows.forEach((entry, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        const values = [
          i + 1,
          entry?.name || entry?.employeeName || "",
          ...HYGIENE_COLUMNS.map((c) => entry?.[c] || ""),
          entry?.fitForFoodHandling || "",
          entry?.reasonCommunicableDisease || "",
          entry?.reasonOpenWound || "",
          entry?.reasonOther || "",
          entry?.remarks || "",
        ];
        values.forEach((v, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value = v ?? "";
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = ci === values.length - 1
            ? { ...left, wrapText: true }
            : (ci === 1 ? left : center);
          c.border = BORDER_BLACK;
          const s = String(v ?? "").trim().toLowerCase();
          if (s === "yes" || s === "√" || s === "ok") {
            c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
            c.fill = fillSolid(COLORS.GREEN_BG);
          } else if (s === "no" || s === "✗") {
            c.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
            c.fill = fillSolid(COLORS.RED_BG);
          }
        });
        ws.getRow(r).height = 20;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  p?.footer?.checkedBy || p.checkedBy || "",
      verifiedBy: p?.footer?.verifiedBy || p.verifiedBy || "",
    }, NC);
    return ws;
  };
}
