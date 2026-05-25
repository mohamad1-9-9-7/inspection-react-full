// src/pages/settings/excel-exporters/qcs_fresh_chicken.js
// Mirrors src/pages/monitor/branches/qcs/FreshChickenReportsView.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const VARIANT_LABEL = {
  mixed_parts: "Mixed Parts",
  griller:     "Griller",
  liver:       "Liver",
};
function variantLabel(id) { return VARIANT_LABEL[id] || id || "—"; }

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const hdr = p.header || {};
  const ftr = p.footer || {};
  const samples = p.samplesTable;
  const breakup = Array.isArray(p.breakup) ? p.breakup : [];

  const NC = 10; // wide layout for samples
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = Array.from({ length: NC }, () => ({ width: 18 }));

  /* ─── Document header ─── */
  addDocHeader(ws, {
    documentTitle: "Raw Material Inspection Report [Fresh Chicken]",
    documentNo:    "FS-QM/REC/FC-001",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Online Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   `RAW MATERIAL INSPECTION — FRESH CHICKEN  (${variantLabel(p.reportVariant)})`,
    reportDate:    formatDMY(hdr.reportEntryDate || p?.meta?.entryDate),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ─── Inline meta info row: variant, branch ─── */
  ws.mergeCells(r, 1, r, NC);
  const meta = ws.getCell(r, 1);
  meta.value = `Variant: ${variantLabel(p.reportVariant)}    |    Branch: ${p.branchCode || "—"}    |    Inspection Date: ${formatDMY(hdr.inspectionDate)}`;
  meta.alignment = { horizontal: "center", vertical: "middle" };
  meta.font = { italic: true, size: 10, color: { argb: COLORS.NAVY } };
  meta.fill = fillSolid(COLORS.SKY_LIGHT);
  meta.border = BORDER_BLACK;
  ws.getRow(r).height = 20;
  r++;

  /* ─── Header data grid (5 columns × 2 rows) ─── */
  function headerSection(rowsArr) {
    // Each row has up to 5 [label, value] pairs
    rowsArr.forEach((entries) => {
      entries.forEach(([label, value], i) => {
        const c1 = i * 2 + 1;
        const c2 = c1 + 1;
        const lab = ws.getCell(r, c1);
        lab.value = label;
        lab.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
        lab.fill = fillSolid(COLORS.GRAY_LIGHT);
        lab.alignment = left;
        lab.border = BORDER_BLACK;
        const val = ws.getCell(r, c2);
        val.value = display(value);
        val.font = { size: 10 };
        val.alignment = left;
        val.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20;
      r++;
    });
  }

  // Section title: Header
  ws.mergeCells(r, 1, r, NC);
  const h1 = ws.getCell(r, 1);
  h1.value = "Header";
  h1.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
  h1.fill = fillSolid(COLORS.NAVY);
  h1.alignment = center;
  h1.border = BORDER_BLACK;
  ws.getRow(r).height = 22; r++;

  headerSection([
    [["Report No", hdr.reportNo], ["Sample Received On", formatDMY(hdr.sampleReceivedOn)], ["Inspection Date", formatDMY(hdr.inspectionDate)], ["Truck/Product Temp (°C)", hdr.truckTemperature], ["Brand", hdr.brand]],
    [["Invoice Number", hdr.invoiceNumber], ["Origin", hdr.origin], ["Supplier", hdr.supplier], ["Product Name", hdr.productName], ["Report Entry Date", formatDMY(hdr.reportEntryDate)]],
  ]);

  if (p.remarks) {
    ws.mergeCells(r, 1, r, 2);
    const lbl = ws.getCell(r, 1);
    lbl.value = "Remarks:";
    lbl.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    lbl.fill = fillSolid(COLORS.GRAY_LIGHT);
    lbl.alignment = left;
    lbl.border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const val = ws.getCell(r, 3);
    val.value = p.remarks;
    val.font = { size: 10 };
    val.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    val.border = BORDER_BLACK;
    ws.getRow(r).height = 30;
    r++;
  }

  /* ─── Samples table ─── */
  if (samples && Array.isArray(samples.columns) && Array.isArray(samples.rows)) {
    r += 1;
    ws.mergeCells(r, 1, r, NC);
    const sh = ws.getCell(r, 1);
    sh.value = "Samples";
    sh.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    sh.fill = fillSolid(COLORS.NAVY);
    sh.alignment = center;
    sh.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;

    const sampleCols = samples.columns;
    const nCols = 1 + sampleCols.length; // attribute col + N samples

    // Headers
    ws.getCell(r, 1).value = "Attribute";
    ws.getCell(r, 1).font = { bold: true, color: { argb: COLORS.WHITE } };
    ws.getCell(r, 1).fill = fillSolid(COLORS.NAVY_LIGHT);
    ws.getCell(r, 1).alignment = center;
    ws.getCell(r, 1).border = BORDER_BLACK;
    sampleCols.forEach((sc, i) => {
      const c = ws.getCell(r, i + 2);
      c.value = `Sample ${sc?.sampleId || (i + 1)}`;
      c.font = { bold: true, color: { argb: COLORS.WHITE } };
      c.fill = fillSolid(COLORS.NAVY_LIGHT);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22;
    r++;

    samples.rows.forEach((row, ri) => {
      const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      const c1 = ws.getCell(r, 1);
      c1.value = row.label || row.key;
      c1.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      c1.fill = fillSolid(bg);
      c1.alignment = left;
      c1.border = BORDER_BLACK;
      sampleCols.forEach((sc, i) => {
        const c = ws.getCell(r, i + 2);
        c.value = display(sc?.[row.key]);
        c.font = { size: 10 };
        c.fill = fillSolid(bg);
        c.alignment = center;
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20;
      r++;
    });
  }

  /* ─── Break Up table ─── */
  r += 1;
  ws.mergeCells(r, 1, r, NC);
  const bh = ws.getCell(r, 1);
  bh.value = "Break Up";
  bh.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
  bh.fill = fillSolid(COLORS.NAVY);
  bh.alignment = center;
  bh.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r++;

  ws.getCell(r, 1).value = "Product Name";
  ws.getCell(r, 4).value = "Packing";
  ws.getCell(r, 8).value = "Total Qty";
  ws.mergeCells(r, 1, r, 3);
  ws.mergeCells(r, 4, r, 7);
  ws.mergeCells(r, 8, r, NC);
  [1, 4, 8].forEach((cc) => {
    const c = ws.getCell(r, cc);
    c.font = { bold: true, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY_LIGHT);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 22;
  r++;

  if (!breakup.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "No breakup rows.";
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;
  } else {
    breakup.forEach((br, i) => {
      const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      ws.mergeCells(r, 1, r, 3);
      ws.mergeCells(r, 4, r, 7);
      ws.mergeCells(r, 8, r, NC);
      const c1 = ws.getCell(r, 1); c1.value = br?.productName || "";
      const c2 = ws.getCell(r, 4); c2.value = br?.packing || "";
      const c3 = ws.getCell(r, 8); c3.value = br?.totalQty || "";
      [c1, c2, c3].forEach((c) => {
        c.font = { size: 10 };
        c.fill = fillSolid(bg);
        c.alignment = c === c1 ? left : center;
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20;
      r++;
    });
  }

  /* ─── Attachments URLs ─── */
  const images = Array.isArray(p.images) ? p.images : [];
  const certs  = Array.isArray(p.certificates) ? p.certificates : [];
  if (images.length || certs.length) {
    r += 1;
    ws.mergeCells(r, 1, r, NC);
    const ah = ws.getCell(r, 1);
    ah.value = "Attachments (URLs)";
    ah.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    ah.fill = fillSolid(COLORS.NAVY);
    ah.alignment = center;
    ah.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;

    const renderItem = (label, item, i) => {
      const c1 = ws.getCell(r, 1);
      c1.value = `${label} ${i + 1}: ${item?.name || ""}`;
      c1.font = { bold: true, size: 10 };
      c1.alignment = left;
      c1.border = BORDER_BLACK;
      ws.mergeCells(r, 1, r, 3);

      const c2 = ws.getCell(r, 4);
      c2.value = { text: item?.url || "", hyperlink: item?.url || "" };
      c2.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      c2.alignment = left;
      c2.border = BORDER_BLACK;
      ws.mergeCells(r, 4, r, NC);
      ws.getRow(r).height = 18;
      r++;
    };
    images.forEach((it, i) => renderItem("Image",       it, i));
    certs.forEach((it, i) => renderItem("Certificate", it, i));
  }

  /* ─── Approval ─── */
  addFooter(ws, {
    checkedBy:  ftr.checkedBy || "",
    verifiedBy: ftr.verifiedBy || "",
  }, NC);

  return ws;
}
