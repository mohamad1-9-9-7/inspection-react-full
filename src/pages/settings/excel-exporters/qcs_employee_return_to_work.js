// src/pages/settings/excel-exporters/qcs_employee_return_to_work.js
// Mirrors src/pages/monitor/branches/qcs/EmployeeReturnToWorkView.jsx (each record = one sheet).

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.headerTop || {};
  const emp = p.employeeInfo || {};
  const abs = p.absenceDetails || {};
  const absHist = abs.absenceHistory || {};
  const questionnaire = Array.isArray(p.questionnaire) ? p.questionnaire : [];
  const curSymptoms = Array.isArray(p.currentSymptoms) ? p.currentSymptoms : [];
  const conSymptoms = Array.isArray(p.contactSymptoms) ? p.contactSymptoms : [];
  const diseases = Array.isArray(p.communicableDiseases) ? p.communicableDiseases : [];
  const vac = p.vacation || {};
  const addAction = p.additionalAction || {};
  const empSig = p.employeeSignature || {};
  const mgr = p.manager || {};

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 8 }, { width: 40 }, { width: 24 }, { width: 20 }];

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "Employee Return-to-Work Assessment",
    documentNo:    h.documentNo    || "FF-QM/REC/RTW",
    issueDate:     h.issueDate     || "05/02/2020",
    revisionNo:    h.issueNo       || "0",
    area:          "QA",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    h.approvedBy     || "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "EMPLOYEE RETURN-TO-WORK ASSESSMENT",
    reportDate:    formatDMY(emp.returnFromLeaveDate || extractDate(record)),
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
    ws.getCell(r, 1).alignment = { ...left, wrapText: true }; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };
  // two-column Q/A table: left (col1-2), right (col3-4)
  const twoColTable = (hdrL, hdrR, rows) => {
    [[1, 2, hdrL], [3, 4, hdrR]].forEach(([a, b, label]) => {
      ws.mergeCells(r, a, r, b);
      const c = ws.getCell(r, a);
      c.value = label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
      c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
    if (!rows.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "— None recorded —"; c.alignment = center;
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
      ws.getRow(r).height = 18; r++;
      return;
    }
    rows.forEach(([lv, rv], i) => {
      const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      ws.mergeCells(r, 1, r, 2);
      ws.getCell(r, 1).value = display(lv);
      ws.getCell(r, 1).font = { size: 10 }; ws.getCell(r, 1).alignment = { ...left, wrapText: true };
      ws.getCell(r, 1).fill = fillSolid(bg); ws.getCell(r, 1).border = BORDER_BLACK;
      ws.getCell(r, 2).border = BORDER_BLACK;
      ws.mergeCells(r, 3, r, 4);
      ws.getCell(r, 3).value = display(rv);
      ws.getCell(r, 3).font = { size: 10, bold: true }; ws.getCell(r, 3).alignment = center;
      ws.getCell(r, 3).fill = fillSolid(bg); ws.getCell(r, 3).border = BORDER_BLACK;
      const lines = String(lv ?? "").split("\n").length;
      ws.getRow(r).height = Math.max(18, Math.min(lines, 4) * 14); r++;
    });
  };

  section("Employee Information");
  pair("Name",          emp.name,          "Employee No.",       emp.employeeNo);
  pair("Restaurant",    emp.restaurantName, "Country Visited",    emp.countryVisited);
  pair("Leave Start",   formatDMY(emp.leaveStartDate), "Return From Leave", formatDMY(emp.returnFromLeaveDate));
  wide("Dates of Vacation", emp.datesOfVacation);

  section("Absence Details");
  pair("Absence History %", absHist.percent, "Occasions", absHist.occasions);
  pair("Medical Certificate", abs.medicalCertificate, "Previous Counselling", abs.previousCounselling);
  pair("Previous Disciplinary", abs.previousDisciplinary, null, null);
  if (abs.reason)             wide("Reason for Absence", abs.reason);
  if (abs.liveWarningDetails) wide("Live Warning Details", abs.liveWarningDetails);

  section("Health Questionnaire");
  twoColTable("Question", "Response", questionnaire.map((q) => [q.text || q.code, q.checked ? "✓" : "✗"]));

  section("Current Symptoms");
  twoColTable("Symptom", "Answer", curSymptoms.map((s) => [s.symptom, s.answer]));

  section("Contact / Household Symptoms");
  twoColTable("Symptom", "Answer", conSymptoms.map((s) => [s.symptom, s.answer]));

  section("Communicable Diseases");
  twoColTable("Condition", "Answer", diseases.map((d) => [d.condition, d.answer]));

  section("Vacation & Actions");
  pair("Sick on Vacation", vac.sick, null, null);
  if (vac.details) wide("Vacation Sickness Details", vac.details);
  pair("Counselling", addAction.counselling, "Disciplinary Hearing", addAction.disciplinaryHearing);
  if (p.summary) wide("Summary / Assessment", p.summary);

  section("Authorization");
  pair("Employee Signature", empSig.signature, "Date", formatDMY(empSig.date));
  pair("Manager", mgr.name, "Authorize", mgr.authorize);

  addFooter(ws, {
    checkedBy:  empSig.signature || "",
    verifiedBy: mgr.name || "",
    revDate:    mgr.date || "",
  }, NC);
  return ws;
}
