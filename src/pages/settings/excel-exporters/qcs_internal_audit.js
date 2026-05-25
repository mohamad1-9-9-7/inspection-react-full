// src/pages/settings/excel-exporters/qcs_internal_audit.js
// Mirrors src/pages/monitor/branches/qcs/InternalAuditView.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

function calcScore(checklist) {
  if (!Array.isArray(checklist)) return null;
  let yes = 0, no = 0, ok = 0, na = 0, total = 0;
  checklist.forEach((g) =>
    (g.items || []).forEach((it) => {
      total++;
      if (it.status === "Yes") yes++;
      else if (it.status === "No") no++;
      else if (it.status === "OK") ok++;
      else if (it.status === "NA") na++;
    })
  );
  const answered = yes + no + ok;
  const score = answered > 0 ? Math.round(((yes + ok) / answered) * 100) : null;
  return { yes, no, ok, na, total, score };
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h    = p.headRow   || {};
  const hTop = p.headerTop || {};
  const ft   = p.footer    || {};
  const checklist = Array.isArray(p.checklist) ? p.checklist : [];
  const sc = calcScore(checklist);
  const recs = Array.isArray(p.auditRecommendation) ? p.auditRecommendation : [];

  const NC = 6;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [
    { width: 6 },   // # / Code
    { width: 30 },  // Question / Area
    { width: 30 },
    { width: 12 },  // Status
    { width: 12 },
    { width: 26 },  // Remarks
  ];

  addDocHeader(ws, {
    documentTitle: hTop.documentTitle || "Internal Audit — QCS",
    documentNo:    hTop.documentNo    || "FS-QM/REC/IA",
    issueDate:     hTop.issueDate     || "01/11/2025",
    revisionNo:    hTop.revisionNo    || "0",
    area:          h.area             || "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "INTERNAL AUDIT REPORT — QCS",
    reportDate:    formatDMY(h.dateOfAudit || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ─── Meta info ─── */
  const meta = [
    ["Conducted By",  h.conductedBy,        "Verified By",   h.verifiedBy],
    ["Date of Audit", formatDMY(h.dateOfAudit), "Area",       h.area],
    ["Auditor Name",  ft.auditorName,       "Auditor Date",  formatDMY(ft.auditorSignDate)],
  ];
  meta.forEach((row) => {
    const cells = [
      [1, 2, row[0], row[1]],
      [4, 5, row[2], row[3]],
    ];
    cells.forEach(([lc, vc, lbl, v]) => {
      ws.getCell(r, lc).value = lbl;
      ws.getCell(r, lc).font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      ws.getCell(r, lc).fill = fillSolid(COLORS.GRAY_LIGHT);
      ws.getCell(r, lc).alignment = left;
      ws.getCell(r, lc).border = BORDER_BLACK;
      const valEnd = lc === 1 ? 3 : NC;
      if (valEnd > vc) ws.mergeCells(r, vc, r, valEnd);
      ws.getCell(r, vc).value = v ?? "";
      ws.getCell(r, vc).font = { size: 10 };
      ws.getCell(r, vc).alignment = left;
      ws.getCell(r, vc).border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20;
    r++;
  });

  /* ─── Score summary ─── */
  if (sc && sc.score != null) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = `Compliance Score: ${sc.score}%   |   Yes: ${sc.yes}  ·  No: ${sc.no}  ·  OK: ${sc.ok}  ·  N/A: ${sc.na}  ·  Total: ${sc.total}`;
    c.font = { bold: true, size: 12, color: { argb: sc.score >= 80 ? COLORS.GREEN : sc.score >= 60 ? COLORS.AMBER : COLORS.RED } };
    c.fill = fillSolid(sc.score >= 80 ? COLORS.GREEN_BG : sc.score >= 60 ? COLORS.AMBER_BG : COLORS.RED_BG);
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 26;
    r++;
  }

  /* ─── Checklist groups ─── */
  checklist.forEach((group) => {
    // Group header
    ws.mergeCells(r, 1, r, NC);
    const gh = ws.getCell(r, 1);
    gh.value = group.title || "";
    gh.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    gh.fill = fillSolid(COLORS.NAVY);
    gh.alignment = left;
    gh.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;

    // Column headers
    const hdr = ["#", "Area / Question", "", "Status", "", "Remarks"];
    hdr.forEach((label, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = label;
      c.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.mergeCells(r, 2, r, 3);
    ws.mergeCells(r, 4, r, 5);
    ws.getRow(r).height = 22;
    r++;

    (group.items || []).forEach((it, ii) => {
      const bg = ii % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      ws.getCell(r, 1).value = it.code || (ii + 1);
      ws.getCell(r, 1).font = { bold: true, size: 9, color: { argb: COLORS.NAVY } };
      ws.getCell(r, 1).fill = fillSolid(bg);
      ws.getCell(r, 1).alignment = center;
      ws.getCell(r, 1).border = BORDER_BLACK;

      ws.mergeCells(r, 2, r, 3);
      const q = ws.getCell(r, 2);
      q.value = it.text || "";
      q.font = { size: 10 };
      q.fill = fillSolid(bg);
      q.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      q.border = BORDER_BLACK;

      ws.mergeCells(r, 4, r, 5);
      const s = ws.getCell(r, 4);
      s.value = it.status || "—";
      s.font = { bold: true, size: 10 };
      s.alignment = center;
      s.border = BORDER_BLACK;
      // Color by status
      if (it.status === "Yes" || it.status === "OK") {
        s.font.color = { argb: COLORS.GREEN };
        s.fill = fillSolid(COLORS.GREEN_BG);
      } else if (it.status === "No") {
        s.font.color = { argb: COLORS.RED };
        s.fill = fillSolid(COLORS.RED_BG);
      } else {
        s.fill = fillSolid(bg);
      }

      const rm = ws.getCell(r, 6);
      rm.value = it.remarks || "";
      rm.font = { size: 10 };
      rm.fill = fillSolid(bg);
      rm.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      rm.border = BORDER_BLACK;

      const lines = String(it.text || "").split("\n").length;
      ws.getRow(r).height = Math.max(20, lines * 14);
      r++;
    });
  });

  /* ─── Recommendations ─── */
  if (recs.length) {
    ws.mergeCells(r, 1, r, NC);
    const rh = ws.getCell(r, 1);
    rh.value = "Audit Recommendations";
    rh.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    rh.fill = fillSolid(COLORS.NAVY);
    rh.alignment = center;
    rh.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;

    recs.forEach((rc, i) => {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = `${i + 1}. ${display(rc)}`;
      c.font = { size: 10 };
      c.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;
    });
  }

  addFooter(ws, {
    checkedBy:  ft.auditorName || h.conductedBy,
    verifiedBy: h.verifiedBy,
  }, NC);
  return ws;
}
