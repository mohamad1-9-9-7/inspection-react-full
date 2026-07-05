// src/pages/settings/excel-exporters/qcs_visitor_checklist.js
// Mirrors src/pages/monitor/branches/qcs/VisitorChecklistView.jsx (each record = one sheet).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.headerTop || {};
  const visitor = p.visitor || {};
  const hq = p.healthQuestions || {};
  const questions = [
    ...(Array.isArray(hq.q1) ? hq.q1 : []),
    ...(Array.isArray(hq.additional) ? hq.additional : []),
  ];
  const decl = p.declaration || {};
  const sig = p.signatures || {};
  const mgmt = p.management || {};

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 8 }, { width: 40 }, { width: 24 }, { width: 20 }];

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "Visitor Health & Hygiene Checklist",
    documentNo:    h.documentNo    || "FF-QM/REC/VC",
    issueDate:     h.issueDate     || "05/02/2020",
    revisionNo:    h.revisionNo    || "0",
    area:          h.area          || "QA",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: h.controllingOfficer || "Quality Controller",
    approvedBy:    h.approvedBy     || "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "VISITOR HEALTH & HYGIENE CHECKLIST",
    reportDate:    formatDMY(visitor.visitDate || extractDate(record)),
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
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };
  const pair = (l1, v1, l2, v2) => {
    [[1, 2, l1, v1], [3, 4, l2, v2]].forEach(([lc, vc, lbl, v]) => {
      if (lbl == null) return;
      ws.getCell(r, lc).value = lbl;
      ws.getCell(r, lc).font = lblFont; ws.getCell(r, lc).fill = lblFill;
      ws.getCell(r, lc).alignment = left; ws.getCell(r, lc).border = BORDER_BLACK;
      ws.getCell(r, vc).value = display(v);
      ws.getCell(r, vc).font = { size: 10 }; ws.getCell(r, vc).alignment = left;
      ws.getCell(r, vc).border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
  };
  const wide = (label, val) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
    ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };

  section("Visitor Information");
  pair("Visitor Name", visitor.visitorName, "Visit Date", formatDMY(visitor.visitDate));
  pair("Company",      visitor.companyName, "Mobile",     visitor.mobileNumber);
  wide("Purpose of Visit", visitor.purposeOfVisit);

  section("Health & Hygiene Screening");
  // Q/A table header: #, Question, Answer (Answer merged 3-4)
  ["#", "Question", "Answer"].forEach((label, i) => {
    const col = i === 0 ? 1 : i === 1 ? 2 : 3;
    if (i === 2) ws.mergeCells(r, 3, r, 4);
    const c = ws.getCell(r, col);
    c.value = label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 20; r++;
  if (!questions.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No screening questions recorded —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    questions.forEach((q, i) => {
      const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      ws.getCell(r, 1).value = q.code || i + 1;
      ws.getCell(r, 1).font = { size: 10 }; ws.getCell(r, 1).alignment = center; ws.getCell(r, 1).fill = fillSolid(bg); ws.getCell(r, 1).border = BORDER_BLACK;
      ws.getCell(r, 2).value = display(q.text);
      ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = { ...left, wrapText: true }; ws.getCell(r, 2).fill = fillSolid(bg); ws.getCell(r, 2).border = BORDER_BLACK;
      ws.mergeCells(r, 3, r, 4);
      ws.getCell(r, 3).value = display(q.answer);
      ws.getCell(r, 3).font = { size: 10, bold: true }; ws.getCell(r, 3).alignment = center; ws.getCell(r, 3).fill = fillSolid(bg); ws.getCell(r, 3).border = BORDER_BLACK;
      const lines = String(q.text ?? "").split("\n").length;
      ws.getRow(r).height = Math.max(18, Math.min(lines, 4) * 14); r++;
    });
  }

  section("Declaration");
  if (decl.text) wide("Declaration", decl.text);
  pair("Accepted", decl.accepted ? "Yes" : "No", null, null);

  section("Management Decision");
  pair("Decision", mgmt.decision, null, null);
  if (mgmt.remarks) wide("Remarks", mgmt.remarks);

  addFooter(ws, {
    checkedBy:  sig.visitorSignature || "",
    verifiedBy: sig.managerSignature || "",
  }, NC);
  return ws;
}
