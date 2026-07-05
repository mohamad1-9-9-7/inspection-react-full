// src/pages/settings/excel-exporters/internal_audit_record.js
// Internal Audit Report (ISO 22000:2018 §9.2).
// Mirrors src/pages/haccp and iso/InternalAudit/InternalAuditView.jsx —
// audit header, findings table (OBS / Minor / Major NC), and conclusion.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const FINDING_COLS = [
  { key: "n",                 label: "#",                width: 5  },
  { key: "type",              label: "Type",             width: 10 },
  { key: "clause",            label: "Clause",           width: 10 },
  { key: "description",       label: "Finding / Description", width: 34, align: "left" },
  { key: "rootCause",         label: "Root Cause",       width: 24, align: "left" },
  { key: "correctiveAction",  label: "Corrective Action", width: 28, align: "left" },
  { key: "responsiblePerson", label: "Responsible",      width: 16, align: "left" },
  { key: "dueDate",           label: "Due Date",         width: 12 },
  { key: "closed",            label: "Closed",           width: 8  },
];

/* Findings type → colour band (matches the view's OBS/Minor/Major styling) */
function typeStyle(type) {
  const t = String(type || "").toUpperCase();
  if (t.includes("MAJOR")) return { color: COLORS.RED,   bg: COLORS.RED_BG };
  if (t.includes("MINOR")) return { color: COLORS.AMBER, bg: COLORS.AMBER_BG };
  return null; // OBS / other → default
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const findings = Array.isArray(p.findings) ? p.findings : [];

  const NC = FINDING_COLS.length; // 9
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = FINDING_COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Internal Audit Report",
    documentNo:    "FS-FSMS/REC/IA",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "FSMS",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "FSMS Team Leader",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "INTERNAL AUDIT REPORT — ISO 22000:2018 §9.2",
    reportDate:    formatDMY(p.auditDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  const section = (title) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;
  };
  // label in col1..2, value across the remaining columns
  const wide = (label, val) => {
    ws.mergeCells(r, 1, r, 2);
    const lc = ws.getCell(r, 1);
    lc.value = label; lc.font = lblFont; lc.fill = lblFill;
    lc.alignment = left; lc.border = BORDER_BLACK;
    ws.getCell(r, 2).border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true };
    v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(20, lines * 15);
    r++;
  };

  section("Audit Details");
  wide("Audit No.",        p.auditNumber);
  wide("Audit Date",       formatDMY(p.auditDate));
  wide("Scope",            p.scope);
  wide("Audited Dept.",    p.auditedDept);
  wide("Auditor(s)",       p.auditor);
  wide("Auditee Manager",  p.auditeeManager);
  wide("Audit Criteria",   p.criteria);

  section(`Findings (${findings.length})`);
  // Table header
  FINDING_COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 24;
  r++;

  if (!findings.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No findings recorded —";
    c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;
  } else {
    findings.forEach((f, i) => {
      const ts = typeStyle(f.type);
      const bg = ts ? ts.bg : (i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT);
      const row = {
        n: i + 1,
        type: f.type || "",
        clause: f.clause || "",
        description: f.description || "",
        rootCause: f.rootCause || "",
        correctiveAction: f.correctiveAction || "",
        responsiblePerson: f.responsiblePerson || "",
        dueDate: formatDMY(f.dueDate),
        closed: f.closed ? "✓" : "✗",
      };
      let maxLines = 1;
      FINDING_COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value = display(row[col.key]);
        c.font = { size: 10, color: { argb: ts ? ts.color : COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
        const lines = String(row[col.key] ?? "").split("\n").length;
        if (lines > maxLines) maxLines = lines;
      });
      ws.getRow(r).height = Math.max(20, Math.min(maxLines, 8) * 14);
      r++;
    });
  }

  section("Conclusion");
  wide("Overall Conclusion", p.conclusion);

  addFooter(ws, {
    checkedBy:  p.auditor || "",
    verifiedBy: p.auditeeManager || "",
  }, NC);
  return ws;
}
