// src/pages/settings/excel-exporters/qcs_meat_waste_disposal.js
// Mirrors MeatWasteDisposalView (ISO layout): doc header → record meta →
// entries table → total → general notes → photo links → signatures.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, addTable, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const NC = 10; // # · Meat Type · Qty · Reason · Details · Method · Code · Batch · Notes · Photos

const COLS = [
  { key: "idx",     label: "#",                width: 6,  align: "center" },
  { key: "meat",    label: "Meat Type",        width: 16 },
  { key: "qty",     label: "Qty (kg)",         width: 11, align: "center" },
  { key: "reason",  label: "Reason",           width: 18 },
  { key: "details", label: "Reason Details",   width: 28, align: "left" },
  { key: "method",  label: "Disposal Method",  width: 22 },
  { key: "code",    label: "Product Code",     width: 16 },
  { key: "batch",   label: "Batch No",         width: 16 },
  { key: "notes",   label: "Notes",            width: 24, align: "left" },
  { key: "photos",  label: "Photos",           width: 10, align: "center" },
];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const entries = Array.isArray(p.entries) ? p.entries : [];
  const totalKg = num(p.totals?.totalKg) || entries.reduce((s, e) => s + num(e.quantityKg), 0);

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Meat Waste Disposal Record",
    documentNo:    "FF-QM/REC/MWD",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "MEAT WASTE DISPOSAL RECORD",
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  /* ── Record meta (same badges shown above the table in the view) ── */
  function metaRow(pairs) {
    // pairs: [[label, value] × 2] → label|value|label|value across NC columns
    const blockW = Math.floor(NC / pairs.length); // columns per pair
    pairs.forEach(([label, value], i) => {
      const lc = i * blockW + 1;
      const vc = lc + 1;
      const vEnd = i === pairs.length - 1 ? NC : (i + 1) * blockW;
      ws.getCell(r, lc).value = label;
      ws.getCell(r, lc).font = lblFont;
      ws.getCell(r, lc).fill = lblFill;
      ws.getCell(r, lc).alignment = left;
      ws.getCell(r, lc).border = BORDER_BLACK;
      if (vEnd > vc) ws.mergeCells(r, vc, r, vEnd);
      const cell = ws.getCell(r, vc);
      cell.value = display(value);
      cell.font = { size: 10 };
      cell.alignment = left;
      cell.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20;
    r += 1;
  }

  metaRow([["Report Date", formatDMY(p.reportDate)], ["Location", p.location]]);
  metaRow([["Disposed By", p.disposedBy], ["Witness", p.witness]]);
  metaRow([["Supervisor", p.supervisor], ["Total Quantity", `${totalKg.toFixed(2)} kg`]]);
  metaRow([["Entries", String(entries.length)], ["Saved At", p.savedAt ? new Date(p.savedAt).toLocaleString("en-GB") : ""]]);

  /* ── Entries table ── */
  ws.mergeCells(r, 1, r, NC);
  const band = ws.getCell(r, 1);
  band.value = "DISPOSAL ENTRIES";
  band.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
  band.fill = fillSolid(COLORS.NAVY);
  band.alignment = center;
  band.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r += 1;

  addTable(
    ws,
    COLS,
    entries.map((e, i) => ({
      idx: i + 1,
      meat: display(e.meatType),
      qty: Number(num(e.quantityKg).toFixed(2)),
      reason: display(e.reason),
      details: display(e.reasonDetails),
      method: display(e.disposalMethod),
      code: display(e.productCode),
      batch: display(e.batchNo),
      notes: display(e.notes),
      photos: (e.images || []).filter(Boolean).length || "",
    })),
    { rowHeight: 22 }
  );

  r = ws.lastRow.number + 1;

  /* Total row */
  ws.mergeCells(r, 1, r, 2);
  const tl = ws.getCell(r, 1);
  tl.value = "TOTAL";
  tl.font = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
  tl.fill = fillSolid(COLORS.GRAY_LIGHT);
  tl.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  tl.border = BORDER_BLACK;
  const tv = ws.getCell(r, 3);
  tv.value = Number(totalKg.toFixed(2));
  tv.font = { bold: true, size: 11, color: { argb: COLORS.RED } };
  tv.fill = fillSolid(COLORS.GRAY_LIGHT);
  tv.alignment = center;
  tv.border = BORDER_BLACK;
  ws.mergeCells(r, 4, r, NC);
  const tr = ws.getCell(r, 4);
  tr.value = `${entries.length} entry(ies)`;
  tr.font = { size: 10, color: { argb: COLORS.TEXT_MUTED } };
  tr.fill = fillSolid(COLORS.GRAY_LIGHT);
  tr.alignment = left;
  tr.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r += 1;

  /* ── General notes ── */
  if (p.generalNotes) {
    ws.getCell(r, 1).value = "General Notes";
    ws.getCell(r, 1).font = lblFont;
    ws.getCell(r, 1).fill = lblFill;
    ws.getCell(r, 1).alignment = left;
    ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const n = ws.getCell(r, 2);
    n.value = display(p.generalNotes);
    n.font = { size: 10 };
    n.alignment = { ...left, wrapText: true };
    n.border = BORDER_BLACK;
    ws.getRow(r).height = Math.max(22, String(p.generalNotes).split("\n").length * 16);
    r += 1;
  }

  /* ── Attachment links (per entry) ── */
  const photoRows = entries.flatMap((e, i) =>
    (e.images || []).filter(Boolean).map((url, j) => ({ label: `Entry ${i + 1} — Photo ${j + 1}`, url }))
  );
  if (photoRows.length) {
    ws.mergeCells(r, 1, r, NC);
    const ab = ws.getCell(r, 1);
    ab.value = "ATTACHMENTS";
    ab.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    ab.fill = fillSolid(COLORS.NAVY);
    ab.alignment = center;
    ab.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r += 1;

    photoRows.forEach(({ label, url }) => {
      ws.mergeCells(r, 1, r, 2);
      ws.getCell(r, 1).value = label;
      ws.getCell(r, 1).font = lblFont;
      ws.getCell(r, 1).fill = lblFill;
      ws.getCell(r, 1).alignment = left;
      ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 3, r, NC);
      const link = ws.getCell(r, 3);
      link.value = { text: url, hyperlink: url };
      link.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      link.alignment = left;
      link.border = BORDER_BLACK;
      ws.getRow(r).height = 18;
      r += 1;
    });
  }

  addFooter(ws, {
    checkedBy:  p.disposedBy || "",
    verifiedBy: p.supervisor || p.witness || "",
  }, NC);

  return ws;
}
