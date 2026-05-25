// src/pages/settings/excel-exporters/ccp_monitoring_record.js
// Mirrors src/pages/haccp and iso/CCPMonitoring/CCPView.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const snap = p.ccpSnapshot || {};
  const within = p?.autoEval?.withinLimit;
  const statusLabel = within === true ? "COMPLIANT" : within === false ? "DEVIATION" : "PENDING";

  const NC = 4;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 22 }, { width: 26 }, { width: 22 }, { width: 26 }];

  addDocHeader(ws, {
    documentTitle: "CCP Monitoring Record",
    documentNo:    "FS-HACCP/REC/CCP",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "HACCP Team Leader",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "CCP MONITORING RECORD",
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
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
    ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true };
    v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 16);
    r++;
  };

  // Status banner
  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value = `Status: ${statusLabel}`;
  sc.font = { bold: true, size: 14, color: { argb: within === true ? COLORS.GREEN : within === false ? COLORS.RED : COLORS.AMBER } };
  sc.fill = fillSolid(within === true ? COLORS.GREEN_BG : within === false ? COLORS.RED_BG : COLORS.AMBER_BG);
  sc.alignment = center;
  sc.border = BORDER_BLACK;
  ws.getRow(r).height = 28;
  r++;

  section("CCP Identification");
  pair("CCP ID",      p.ccpId,                        "Hazard",       snap.hazardEn || snap.hazardAr);
  pair("CCP Name EN", snap.nameEn,                    "CCP Name AR",  snap.nameAr);
  pair("Date",        formatDMY(p.reportDate),        "Time",         p.timeRecorded);

  section("Product");
  pair("Product Name", p?.product?.name,              "Batch No",     p?.product?.batch);
  pair("Branch",       p?.product?.branch,            "Supplier",     p?.product?.supplier);

  section("Reading");
  pair("Reading Value", `${p?.reading?.value ?? "—"} ${snap?.criticalLimit?.unit || ""}`, "Critical Limit", snap?.criticalLimit?.descEn);
  if (p?.reading?.notes) wide("Notes", p.reading.notes);

  if (within === false) {
    section("Deviation");
    wide("Corrective Action", p?.deviation?.correctiveAction);
    pair("Product Status", p?.deviation?.productStatus,  "Final Reading", `${p?.deviation?.finalReading ?? "—"} ${snap?.criticalLimit?.unit || ""}`);
    if (p?.deviation?.notes) wide("Deviation Notes", p.deviation.notes);
  }

  if (Array.isArray(p.attachments) && p.attachments.length) {
    section(`Attachments (${p.attachments.length})`);
    p.attachments.forEach((a, i) => {
      ws.getCell(r, 1).value = `Attachment ${i + 1}`;
      ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
      ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 2, r, NC);
      const url = typeof a === "string" ? a : a?.url;
      const v = ws.getCell(r, 2);
      v.value = url ? { text: url, hyperlink: url } : "";
      v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      v.alignment = left;
      v.border = BORDER_BLACK;
      ws.getRow(r).height = 18;
      r++;
    });
  }

  section("Sign-off");
  pair("Monitored By", p?.signoff?.monitoredBy,  "Verified By", p?.signoff?.verifiedBy);

  addFooter(ws, {
    checkedBy:  p?.signoff?.monitoredBy || "",
    verifiedBy: p?.signoff?.verifiedBy  || "",
  }, NC);
  return ws;
}
