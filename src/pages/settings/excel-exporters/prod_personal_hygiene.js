// src/pages/settings/excel-exporters/prod_personal_hygiene.js
//
// Production Personal Hygiene backup — mirrors PersonalHygienePRDView.jsx.
//
// It used to borrow the FTR builder, which writes the FTR sheet (4 checks plus
// "fit for food handling" columns Production never fills). Production has its
// own six checks, and — since the sheet was linked to the Staff Directory —
// an employee number and a job title. Those two columns appear only when the
// saved report carries them, exactly like the View, so older backups keep the
// layout they always had.

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
  "Communicable Disease",
  "Open wounds/sores & cut",
];

const empNoOf = (e) => String(e?.empNo ?? e?.employeeNo ?? "").trim();
const jobOf   = (e) => String(e?.job ?? "").trim();
const nameOf  = (e) => String(e?.name ?? e?.employeeName ?? e?.employName ?? "").trim();

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const rows = Array.isArray(p.entries) ? p.entries : [];

  const hasEmpNo = rows.some((e) => empNoOf(e));
  const hasJob   = rows.some((e) => jobOf(e));

  const HEAD = [
    { label: "S.No", width: 7 },
    ...(hasEmpNo ? [{ label: "Employee No", width: 13 }] : []),
    { label: "Employee Name", width: 24 },
    ...(hasJob ? [{ label: "Job Title", width: 20 }] : []),
    ...HYGIENE_COLUMNS.map((c, i) => ({ label: c, width: i === 3 ? 30 : 13 })),
    { label: "Remarks and Corrective Actions", width: 30 },
  ];
  const NC = HEAD.length;
  const nameCol = hasEmpNo ? 2 : 1; // zero-based index of the name column

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = HEAD.map((h) => ({ width: h.width }));

  addDocHeader(ws, {
    documentTitle: "Personal Hygiene Checklist",
    documentNo:    "FS-QM/REC/PH",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "Production",
    issuedBy:      "QA",
    controllingOfficer: "Quality Controller",
    company:       "TRANS EMIRATES LIVESTOCK TRADING LLC",
    reportTitle:   "PRODUCTION — PERSONAL HYGIENE CHECKLIST",
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  HEAD.forEach((h, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = h.label;
    c.font = { bold: true, size: 10, color: { argb: COLORS.TEXT } };
    c.fill = fillSolid(COLORS.GRAY_HEAD);
    c.alignment = { ...center, wrapText: true };
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
        ...(hasEmpNo ? [empNoOf(entry)] : []),
        nameOf(entry),
        ...(hasJob ? [jobOf(entry)] : []),
        ...HYGIENE_COLUMNS.map((c) => entry?.[c] || ""),
        entry?.remarks || "",
      ];
      values.forEach((v, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = v ?? "";
        c.font = { size: 10 };
        c.fill = fillSolid(bg);
        const isName = ci === nameCol || (hasJob && ci === nameCol + 1);
        c.alignment = ci === values.length - 1
          ? { ...left, wrapText: true }
          : (isName ? left : center);
        c.border = BORDER_BLACK;
        const s = String(v ?? "").trim().toUpperCase();
        if (s === "C") {
          c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
          c.fill = fillSolid(COLORS.GREEN_BG);
        } else if (s === "NC" || s === "N/C") {
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
}
