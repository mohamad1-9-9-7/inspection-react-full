// src/pages/settings/excel-exporters/qcs_raw_material.js
// Mirrors src/pages/admin/QCSRawMaterialView/ReportDetails.jsx

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const ATTRIBUTES = [
  { key: "temperature",       label: "Product Temperature" },
  { key: "ph",                label: "Product PH" },
  { key: "slaughterDate",     label: "Slaughter Date" },
  { key: "expiryDate",        label: "Expiry Date" },
  { key: "broken",            label: "Broken / Cut Pieces" },
  { key: "appearance",        label: "Appearance" },
  { key: "bloodClots",        label: "Blood Clots" },
  { key: "colour",            label: "Colour" },
  { key: "fatDiscoloration",  label: "Fat Discoloration" },
  { key: "meatDamage",        label: "Meat Damage" },
  { key: "foreignMatter",     label: "Hair / Foreign Matter" },
  { key: "texture",           label: "Texture" },
  { key: "testicles",         label: "Testicles" },
  { key: "smell",             label: "Smell" },
];

const KEY_LABELS = {
  reportOn:            "Report On",
  receivedOn:          "Sample Received On",
  inspectionDate:      "Inspection Date",
  temperature:         "Temperature",
  brand:               "Brand",
  invoiceNo:           "Invoice No",
  supplierName:        "Supplier Name",
  ph:                  "PH",
  origin:              "Origin",
  airwayBill:          "Air Way Bill No",
  localLogger:         "Local Logger",
  internationalLogger: "International Logger",
};

const GENERAL_FIELDS_ORDER = [
  "reportOn","receivedOn","inspectionDate","temperature","brand",
  "invoiceNo","supplierName","ph","origin","airwayBill",
  "localLogger","internationalLogger",
];

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const docMeta = p.docMeta || {};
  const gen     = p.generalInfo || {};
  const samples = Array.isArray(p.samples) ? p.samples : [];
  const lines   = Array.isArray(p.productLines) ? p.productLines
                : Array.isArray(p.lines) ? p.lines : [];

  // Number of columns: 1 attribute col + N samples (min 4 wide for header)
  const sampleCount = Math.max(samples.length, 1);
  const NC = Math.max(1 + sampleCount, 6);

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = Array.from({ length: NC }, (_, i) => ({ width: i === 0 ? 22 : 16 }));

  /* ─── Document header ─── */
  addDocHeader(ws, {
    documentTitle: docMeta.documentTitle || "Raw Material Inspection Report - Chilled Lamb",
    documentNo:    docMeta.documentNo    || "FS-QM/REC/RMB",
    issueDate:     docMeta.issueDate     || "2020-02-10",
    revisionNo:    docMeta.revisionNo    || "0",
    area:          docMeta.area          || "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   "RAW MATERIAL INSPECTION REPORT",
    reportDate:    formatDMY(gen.inspectionDate || gen.receivedOn || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ─── Quality alert (if smell is bad or status is critical) ─── */
  const smellVal = samples.find((s) => /bad|off/i.test(String(s?.smell || "")));
  const status = p.status;
  const isCritical = /critical|reject|unaccept/i.test(String(status || ""));
  if (smellVal || isCritical) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = `⚠️ QUALITY ALERT  ·  ${[
      smellVal && "Bad / Off odour detected",
      isCritical && "Critical / Reject shipment",
    ].filter(Boolean).join("    |    ")}`;
    c.font = { bold: true, size: 11, color: { argb: "7F1D1D" } };
    c.fill = fillSolid("FEE2E2");
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 24;
    r++;
  }

  /* ─── General Info (4-col grid: label|value|label|value) ─── */
  ws.mergeCells(r, 1, r, NC);
  const gh = ws.getCell(r, 1);
  gh.value = "General Information";
  gh.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
  gh.fill = fillSolid(COLORS.NAVY);
  gh.alignment = center;
  gh.border = BORDER_BLACK;
  ws.getRow(r).height = 22; r++;

  const gFields = [...GENERAL_FIELDS_ORDER, "receivingAddress"]
    .filter((k) => k in gen);
  const HALF = Math.floor(NC / 2);
  for (let i = 0; i < gFields.length; i += 2) {
    const k1 = gFields[i], k2 = gFields[i + 1];
    // Left label/value
    ws.getCell(r, 1).value = KEY_LABELS[k1] || k1;
    ws.getCell(r, 1).font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    ws.getCell(r, 1).fill = fillSolid(COLORS.GRAY_LIGHT);
    ws.getCell(r, 1).alignment = left;
    ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, HALF);
    ws.getCell(r, 2).value = display(gen[k1]);
    ws.getCell(r, 2).font = { size: 10 };
    ws.getCell(r, 2).alignment = left;
    ws.getCell(r, 2).border = BORDER_BLACK;
    if (k2) {
      ws.getCell(r, HALF + 1).value = KEY_LABELS[k2] || k2;
      ws.getCell(r, HALF + 1).font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      ws.getCell(r, HALF + 1).fill = fillSolid(COLORS.GRAY_LIGHT);
      ws.getCell(r, HALF + 1).alignment = left;
      ws.getCell(r, HALF + 1).border = BORDER_BLACK;
      ws.mergeCells(r, HALF + 2, r, NC);
      ws.getCell(r, HALF + 2).value = display(gen[k2]);
      ws.getCell(r, HALF + 2).font = { size: 10 };
      ws.getCell(r, HALF + 2).alignment = left;
      ws.getCell(r, HALF + 2).border = BORDER_BLACK;
    } else {
      ws.mergeCells(r, HALF + 1, r, NC);
      const c = ws.getCell(r, HALF + 1);
      c.value = "";
      c.border = BORDER_BLACK;
    }
    ws.getRow(r).height = 20;
    r++;
  }

  /* ─── Shipment Type / Status / Totals ─── */
  const sumQty = lines.reduce((s, l) => s + toNum(l?.qty ?? l?.quantity ?? l?.pcs), 0);
  const sumWgt = lines.reduce((s, l) => s + toNum(l?.weight ?? l?.wt ?? l?.kg), 0);
  const totalQty = p.totalQuantity ?? sumQty;
  const totalWgt = p.totalWeight ?? sumWgt;
  const avgWgt   = p.averageWeight ?? (totalQty ? totalWgt / totalQty : 0);

  function row4(pairs) {
    pairs.forEach(([label, val], idx) => {
      const col = idx * 2 + 1;
      if (col + 1 > NC) return;
      const l = ws.getCell(r, col);
      l.value = label;
      l.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      l.fill = fillSolid(COLORS.GRAY_LIGHT);
      l.alignment = left;
      l.border = BORDER_BLACK;
      const v = ws.getCell(r, col + 1);
      v.value = val ?? "";
      v.font = { size: 10 };
      v.alignment = left;
      v.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20;
    r++;
  }
  row4([
    ["Shipment Type", p.shipmentType || "—"],
    ["Status",        p.status || "—"],
  ]);
  if (p.uniqueKey) {
    ws.mergeCells(r, 1, r, 2);
    const l = ws.getCell(r, 1);
    l.value = "Unique Key";
    l.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    l.fill = fillSolid(COLORS.GRAY_LIGHT);
    l.alignment = left;
    l.border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    ws.getCell(r, 3).value = p.uniqueKey;
    ws.getCell(r, 3).font = { size: 9 };
    ws.getCell(r, 3).alignment = left;
    ws.getCell(r, 3).border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;
  }
  row4([
    ["Total Quantity (pcs)", totalQty],
    ["Total Weight (kg)",    Number(totalWgt).toFixed(2)],
  ]);
  row4([
    ["Average Weight (kg)",  Number(avgWgt).toFixed(2)],
    ["",                     ""],
  ]);

  /* ─── Test Samples table ─── */
  r += 1;
  ws.mergeCells(r, 1, r, NC);
  const sh = ws.getCell(r, 1);
  sh.value = "Test Samples";
  sh.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
  sh.fill = fillSolid(COLORS.NAVY);
  sh.alignment = center;
  sh.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r++;

  // Header row 1: Attribute + Sample N
  ws.getCell(r, 1).value = "Attribute";
  ws.getCell(r, 1).font = { bold: true, color: { argb: COLORS.NAVY } };
  ws.getCell(r, 1).fill = fillSolid(COLORS.GRAY_HEAD);
  ws.getCell(r, 1).alignment = left;
  ws.getCell(r, 1).border = BORDER_BLACK;
  samples.forEach((_, i) => {
    const c = ws.getCell(r, i + 2);
    c.value = `Sample ${i + 1}`;
    c.font = { bold: true, color: { argb: COLORS.NAVY } };
    c.fill = fillSolid(COLORS.GRAY_HEAD);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 22;
  r++;

  // Header row 2: Product Names
  ws.getCell(r, 1).value = "PRODUCT NAME";
  ws.getCell(r, 1).font = { bold: true, color: { argb: COLORS.NAVY } };
  ws.getCell(r, 1).fill = fillSolid("FAFAFA");
  ws.getCell(r, 1).alignment = left;
  ws.getCell(r, 1).border = BORDER_BLACK;
  samples.forEach((s, i) => {
    const c = ws.getCell(r, i + 2);
    c.value = s?.productName || "—";
    c.font = { bold: true };
    c.fill = fillSolid("FAFAFA");
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 22;
  r++;

  // Attribute rows
  ATTRIBUTES.forEach((attr) => {
    const isPrimary = ["temperature","ph","slaughterDate","expiryDate"].includes(attr.key);
    const baseBg = isPrimary ? "F9FAFB" : "FFFFFF";
    const ac = ws.getCell(r, 1);
    ac.value = attr.label;
    ac.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    ac.fill = fillSolid(baseBg);
    ac.alignment = left;
    ac.border = BORDER_BLACK;
    samples.forEach((s, i) => {
      const v = s?.[attr.key] ?? "—";
      const c = ws.getCell(r, i + 2);
      c.value = display(v);
      c.font = { size: 10 };
      c.fill = fillSolid(baseBg);
      c.alignment = center;
      c.border = BORDER_BLACK;
      // smell warning
      if (attr.key === "smell" && /bad|off/i.test(String(v))) {
        c.font = { bold: true, color: { argb: "7F1D1D" } };
        c.fill = fillSolid("FECACA");
      }
      // temperature warning
      if (attr.key === "temperature") {
        const n = parseFloat(v);
        if (!isNaN(n) && n >= 5) {
          c.font = { bold: true, color: { argb: "7F1D1D" } };
          c.fill = fillSolid("FEE2E2");
        }
      }
    });
    ws.getRow(r).height = 18;
    r++;
  });

  /* ─── Product Lines table ─── */
  r += 1;
  ws.mergeCells(r, 1, r, NC);
  const ph = ws.getCell(r, 1);
  ph.value = "Product Lines";
  ph.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
  ph.fill = fillSolid(COLORS.NAVY);
  ph.alignment = center;
  ph.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r++;

  const plHeaders = ["Product Name", "Qty (pcs)", "Weight (kg)"];
  const plWidths  = [Math.floor(NC / 2), Math.floor(NC / 4), NC - Math.floor(NC / 2) - Math.floor(NC / 4)];
  let cursor = 1;
  plHeaders.forEach((h, i) => {
    const c1 = cursor;
    const c2 = cursor + plWidths[i] - 1;
    ws.mergeCells(r, c1, r, c2);
    const c = ws.getCell(r, c1);
    c.value = h;
    c.font = { bold: true, color: { argb: COLORS.NAVY } };
    c.fill = fillSolid(COLORS.GRAY_HEAD);
    c.alignment = center;
    c.border = BORDER_BLACK;
    cursor = c2 + 1;
  });
  ws.getRow(r).height = 22;
  r++;

  if (lines.length === 0) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "لا توجد أسطر منتجات مسجلة.";
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.alignment = center;
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;
  } else {
    lines.forEach((line, idx) => {
      const bg = idx % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      let c1Idx = 1;
      [
        line?.name || line?.productName || "—",
        Number(line?.qty ?? line?.quantity ?? line?.pcs ?? 0),
        Number(line?.weight ?? line?.wt ?? line?.kg ?? 0).toFixed(2),
      ].forEach((val, i) => {
        const c1 = c1Idx;
        const c2 = c1Idx + plWidths[i] - 1;
        if (c2 > c1) ws.mergeCells(r, c1, r, c2);
        const c = ws.getCell(r, c1);
        c.value = val;
        c.font = { size: 10 };
        c.fill = fillSolid(bg);
        c.alignment = i === 0 ? left : center;
        c.border = BORDER_BLACK;
        c1Idx = c2 + 1;
      });
      ws.getRow(r).height = 20;
      r++;
    });
    // Totals row
    let c1Idx = 1;
    [`الإجمالي:`, totalQty, Number(totalWgt).toFixed(2)].forEach((val, i) => {
      const c1 = c1Idx;
      const c2 = c1Idx + plWidths[i] - 1;
      if (c2 > c1) ws.mergeCells(r, c1, r, c2);
      const c = ws.getCell(r, c1);
      c.value = val;
      c.font = { bold: true, color: { argb: COLORS.NAVY } };
      c.fill = fillSolid("FAFAFA");
      c.alignment = i === 0 ? { horizontal: "right", vertical: "middle" } : center;
      c.border = BORDER_BLACK;
      c1Idx = c2 + 1;
    });
    ws.getRow(r).height = 22;
    r++;
  }

  /* ─── Attachments (URLs) ─── */
  const images = Array.isArray(p.images) ? p.images : [];
  if (images.length || p.certificateUrl) {
    r += 1;
    ws.mergeCells(r, 1, r, NC);
    const ah = ws.getCell(r, 1);
    ah.value = "Attachments";
    ah.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    ah.fill = fillSolid(COLORS.NAVY);
    ah.alignment = center;
    ah.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;

    if (p.certificateUrl) {
      ws.mergeCells(r, 1, r, 2);
      ws.getCell(r, 1).value = "Certificate";
      ws.getCell(r, 1).font = { bold: true, size: 10 };
      ws.getCell(r, 1).alignment = left;
      ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 3, r, NC);
      const c = ws.getCell(r, 3);
      c.value = { text: p.certificateUrl, hyperlink: p.certificateUrl };
      c.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      c.alignment = left;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 18;
      r++;
    }
    images.forEach((url, i) => {
      ws.mergeCells(r, 1, r, 2);
      ws.getCell(r, 1).value = `Image ${i + 1}`;
      ws.getCell(r, 1).font = { bold: true, size: 10 };
      ws.getCell(r, 1).alignment = left;
      ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 3, r, NC);
      const c = ws.getCell(r, 3);
      const u = typeof url === "string" ? url : (url?.url || "");
      c.value = u ? { text: u, hyperlink: u } : "";
      c.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
      c.alignment = left;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 18;
      r++;
    });
  }

  addFooter(ws, {
    verifiedBy: p?.qaVerification?.verifiedByQA || "",
    checkedBy:  p?.inspectedBy || record?.reporter || "",
  }, NC);

  return ws;
}
