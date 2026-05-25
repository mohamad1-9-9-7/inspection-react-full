// src/pages/settings/excel-exporters/qcs_non_conformance.js
// Mirrors src/pages/monitor/branches/qcs/NonConformanceReportsView.jsx (exportXlsx)

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const hdr = p.headerTop || {};
  const evidenceImgs = p?.correctiveActionExtras?.evidence?.images || [];

  const NC = 8;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = Array.from({ length: NC }, () => ({ width: 16 }));

  /* ─── Document header ─── */
  addDocHeader(ws, {
    documentTitle: hdr.documentTitle || "Non-Conformance Report",
    documentNo:    hdr.documentNo    || "FS-QM/REC/NC",
    issueDate:     hdr.issueDate     || "05/02/2020",
    revisionNo:    hdr.revisionNo    || "0",
    area:          hdr.area          || "QA",
    issuedBy:      hdr.issuedBy      || "MOHAMAD ABDULLAH",
    controllingOfficer: hdr.controllingOfficer || "Quality Controller",
    approvedBy:    hdr.approvedBy    || "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "NON-CONFORMANCE REPORT",
    reportDate:    formatDMY(p?.headRow?.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ─── Header data: 4-col label/value pairs ─── */
  function pair(label1, val1, label2, val2) {
    const cells = [
      [1, 2, label1, val1],
      [5, 6, label2, val2],
    ];
    cells.forEach(([lc, vc, lbl, v]) => {
      if (lbl == null) return;
      ws.mergeCells(r, lc, r, vc - 1);
      const l = ws.getCell(r, lc);
      l.value = lbl;
      l.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      l.fill = fillSolid(COLORS.GRAY_LIGHT);
      l.alignment = left;
      l.border = BORDER_BLACK;

      const valEnd = lc === 1 ? 4 : NC;
      ws.mergeCells(r, vc, r, valEnd);
      const value = ws.getCell(r, vc);
      value.value = v ?? "";
      value.font = { size: 10 };
      value.alignment = { ...left, wrapText: true };
      value.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22;
    r++;
  }

  function wide(label, val) {
    ws.mergeCells(r, 1, r, 2);
    const l = ws.getCell(r, 1);
    l.value = label;
    l.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    l.fill = fillSolid(COLORS.GRAY_LIGHT);
    l.alignment = left;
    l.border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = val ?? "";
    v.font = { size: 10 };
    v.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(24, lines * 16);
    r++;
  }

  function section(title) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;
  }

  section("Identification");
  wide("Location", p.location);
  pair("Date", formatDMY(p?.headRow?.reportDate), "NC No.", p?.headRow?.ncNo);
  pair("Issued to", p?.headRow?.issuedTo, "Issued by", p?.headRow?.issuedBy);

  const refTxt = [
    p?.reference?.inhouseQC && "In-house QC",
    p?.reference?.customerComplaint && "Customer Complaint",
    p?.reference?.internalAudit && "Internal Audit",
    p?.reference?.externalAudit && "External Audit",
  ].filter(Boolean).join("; ");
  wide("Reference", refTxt);

  section("Details");
  wide("Nonconformance / Report Details", p.detailsBlock);
  wide("Corrective Action", p.correctiveAction);

  section("Corrective Action — Owner & Status");
  pair("Implementation Owner", p?.correctiveActionExtras?.implementationOwner,
       "Target Completion Date", formatDMY(p?.correctiveActionExtras?.targetCompletionDateISO));
  wide("Status", p?.correctiveActionExtras?.status);

  if (evidenceImgs.length) {
    section("Evidence Images");
    evidenceImgs.forEach((url, i) => {
      ws.mergeCells(r, 1, r, 2);
      ws.getCell(r, 1).value = `Image ${i + 1}`;
      ws.getCell(r, 1).font = { bold: true, size: 10 };
      ws.getCell(r, 1).alignment = left;
      ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 3, r, NC);
      const v = ws.getCell(r, 3);
      v.value = { text: url, hyperlink: url };
      v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      v.alignment = left;
      v.border = BORDER_BLACK;
      ws.getRow(r).height = 18;
      r++;
    });
  }

  section("Implementation & QA Verification");
  pair("Performed by", p.performedBy, "Department", p.department);
  wide("Verification of Corrective Action", p.verificationOfCorrectiveAction);
  pair("QA Verified By", p?.qaVerification?.verifiedByQA, "QA Date", formatDMY(p?.qaVerification?.dateISO));
  pair("QA Result", p?.qaVerification?.result, "Closure Date", formatDMY(p?.qaVerification?.closureDateISO));
  wide("Follow-up Actions Required", p?.qaVerification?.followupActionsRequired);
  pair("Follow-up Responsible", p?.qaVerification?.followupResponsible,
       "Follow-up Target", formatDMY(p?.qaVerification?.followupTargetDateISO));

  section("Final QA Closure");
  pair("Final QA Name", p?.finalQaClosure?.name, "Final QA Date", formatDMY(p?.finalQaClosure?.dateISO));
  wide("Final QA Approved", p?.finalQaClosure?.approved ? "YES" : "NO");

  section("Signatures");
  pair("Signature", p?.signature?.signature, "Date", formatDMY(p?.signature?.date));
  pair("Responsible Person", p?.signature?.responsiblePerson, "Signature", p?.signature?.responsibleSignature);

  addFooter(ws, { checkedBy: p.performedBy, verifiedBy: p?.qaVerification?.verifiedByQA }, NC);
  return ws;
}
