// src/pages/settings/excel-exporters/mrm_record.js
// Management Review Meeting record (ISO 22000:2018 §9.3).
// Mirrors src/pages/haccp and iso/MRM/MRMView.jsx — header, attendees,
// Review Inputs (§9.3.2) and Review Outputs (§9.3.3) sections.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

/* Ordered §9.3.2 review inputs with their ISO-worded labels */
const INPUT_FIELDS = [
  ["previousActionsStatus", "Status of Actions from Previous Reviews"],
  ["customerFeedback",      "Customer Feedback & Complaints"],
  ["audits",                "Results of Audits (Internal / External)"],
  ["monitoringResults",     "Monitoring & Measurement Results"],
  ["nonConformities",       "Non-Conformities & Corrections"],
  ["correctiveActions",     "Corrective Actions Status"],
  ["supplierPerformance",   "External Provider (Supplier) Performance"],
  ["resourcesAdequacy",     "Adequacy of Resources"],
  ["emergencyIncidents",    "Emergency Situations / Incidents / Withdrawals"],
  ["changesAffectingFSMS",  "Changes Affecting the FSMS"],
];

/* Ordered §9.3.3 review outputs */
const OUTPUT_FIELDS = [
  ["decisions",     "Decisions & Continual Improvement Opportunities"],
  ["actions",       "Actions (Changes / Improvements to the FSMS)"],
  ["resourceNeeds", "Resource Needs"],
  ["policyUpdates", "Updates to Policy / Objectives"],
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const inputs = p.inputs || {};
  const outputs = p.outputs || {};

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 30 }, { width: 22 }, { width: 22 }, { width: 24 }];

  addDocHeader(ws, {
    documentTitle: "Management Review Meeting Minutes",
    documentNo:    "FS-FSMS/REC/MRM",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "FSMS",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "FSMS Team Leader",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "MANAGEMENT REVIEW MEETING (MRM) — ISO 22000:2018 §9.3",
    reportDate:    formatDMY(p.meetingDate || extractDate(record)),
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
    v.alignment = { ...left, wrapText: true };
    v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(24, lines * 15);
    r++;
  };

  section("Meeting Details");
  pair("Meeting No.",  p.meetingNumber, "Meeting Date", formatDMY(p.meetingDate));
  pair("Location",     p.location,      "Chairperson",  p.chairperson);
  wide("Attendees",    p.attendees);

  section("Review Inputs (§9.3.2)");
  INPUT_FIELDS.forEach(([k, lbl]) => wide(lbl, inputs[k]));

  section("Review Outputs (§9.3.3)");
  OUTPUT_FIELDS.forEach(([k, lbl]) => wide(lbl, outputs[k]));

  addFooter(ws, {
    checkedBy:  p.chairperson || "",
    verifiedBy: p.signedBy || "",
  }, NC);
  return ws;
}
