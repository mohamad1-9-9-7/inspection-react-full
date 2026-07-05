// src/pages/settings/excel-exporters/prod_online_cutting.js
// Mirrors src/pages/monitor/branches/production/OnlineCuttingRecordView.jsx.
// One report = one sheet; renders each product block with weights, 5-sample log
// and 9 quality parameters.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

const QUALITY = [
  ["shape", "Shape"], ["color", "Color"], ["fat", "Fat"],
  ["bloodSpot", "Blood Spot"], ["whitePatches", "White Patches"], ["badOdor", "Bad Odor"],
  ["foreign", "Foreign Matter"], ["cartilage", "Cartilage"], ["overall", "Overall"],
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const h = p.header || {};
  const products = Array.isArray(p.products) ? p.products : [];

  const NC = 6;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupPortrait(ws);
  ws.columns = [{ width: 20 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 14 }, { width: 16 }];

  addDocHeader(ws, {
    documentTitle: h.documentTitle || "On-Line Cutting Record",
    documentNo:    h.documentNo    || "TELT /QA/CCB/1",
    issueDate:     h.issueDate     || "05/05/2022",
    revisionNo:    h.revisionNo    || "0",
    area:          h.area          || "QA",
    issuedBy:      h.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: h.controllingOfficer || "QC Assistant",
    approvedBy:    h.approvedBy     || "Hussam O. Sarhan — Director",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   `ON-LINE CUTTING RECORD${p.batchCode ? `  ·  Batch ${p.batchCode}` : ""}`,
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  const section = (title, fill = COLORS.NAVY) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(fill); c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };
  // 2 label/value pairs across 6 cols: [1]l1 [2-3]v1 [4]l2 [5-6]v2
  const kv2 = (l1, v1, l2, v2) => {
    ws.getCell(r, 1).value = l1;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, 3);
    ws.getCell(r, 2).value = display(v1); ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = left; ws.getCell(r, 2).border = BORDER_BLACK;
    if (l2 != null) {
      ws.getCell(r, 4).value = l2;
      ws.getCell(r, 4).font = lblFont; ws.getCell(r, 4).fill = lblFill; ws.getCell(r, 4).alignment = left; ws.getCell(r, 4).border = BORDER_BLACK;
      ws.mergeCells(r, 5, r, 6);
      ws.getCell(r, 5).value = display(v2); ws.getCell(r, 5).font = { size: 10 }; ws.getCell(r, 5).alignment = left; ws.getCell(r, 5).border = BORDER_BLACK;
    } else {
      ws.mergeCells(r, 4, r, 6);
      ws.getCell(r, 4).border = BORDER_BLACK;
    }
    ws.getRow(r).height = 20; r++;
  };
  const wide = (label, val) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 }; v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };
  // weight row: label(+spec) in col1-2, 4 measurements in cols 3..6
  const weightRow = (label, spec, values) => {
    ws.mergeCells(r, 1, r, 2);
    const lc = ws.getCell(r, 1);
    lc.value = spec ? `${label} (${spec})` : label;
    lc.font = lblFont; lc.fill = lblFill; lc.alignment = left; lc.border = BORDER_BLACK;
    ws.getCell(r, 2).border = BORDER_BLACK;
    const vals = Array.isArray(values) ? values : [];
    for (let i = 0; i < 4; i++) {
      const c = ws.getCell(r, 3 + i);
      c.value = display(vals[i]); c.font = { size: 10 }; c.alignment = center; c.border = BORDER_BLACK;
    }
    ws.getRow(r).height = 20; r++;
  };

  if (!products.length) {
    section("No products recorded");
  }

  products.forEach((prod, pi) => {
    section(`Product ${pi + 1} — ${prod.productName || ""}`);
    kv2("Customer", prod.customerName, "Brand", prod.brand);
    kv2("Batch No.", prod.batchNo, "PDT Temp", prod.pdtTemp);
    kv2("Production Date", formatDMY(prod.prodDate), "Expiry Date", formatDMY(prod.expDate));

    section("Weight Check (g)", COLORS.NAVY_LIGHT);
    weightRow("Cutting Weight",   prod.cuttingWeightSpec,   prod.cuttingWeights);
    weightRow("Marinated Weight", prod.marinatedWeightSpec, prod.marinatedWeights);

    // Samples table
    section("Temperature Samples", COLORS.NAVY_LIGHT);
    ["Sample No", "Time", "PDT Temp"].forEach((label, i) => {
      const a = i * 2 + 1;
      ws.mergeCells(r, a, r, a + 1);
      const c = ws.getCell(r, a);
      c.value = label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
      c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
    const samples = Array.isArray(prod.samples) ? prod.samples : [];
    samples.forEach((s, si) => {
      const bg = si % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      [s.sampleNo, s.time, s.pdtTemp].forEach((val, i) => {
        const a = i * 2 + 1;
        ws.mergeCells(r, a, r, a + 1);
        const c = ws.getCell(r, a);
        c.value = display(val); c.font = { size: 10 }; c.alignment = center;
        c.fill = fillSolid(bg); c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 18; r++;
    });

    // Quality parameters — 3 per row
    section("Quality Parameters", COLORS.NAVY_LIGHT);
    for (let i = 0; i < QUALITY.length; i += 3) {
      const trio = QUALITY.slice(i, i + 3);
      for (let j = 0; j < trio.length; j++) {
        const [key, label] = trio[j];
        const lc = ws.getCell(r, j * 2 + 1);
        lc.value = label; lc.font = lblFont; lc.fill = lblFill; lc.alignment = left; lc.border = BORDER_BLACK;
        const vc = ws.getCell(r, j * 2 + 2);
        vc.value = display(prod.quality?.[key]); vc.font = { size: 10 }; vc.alignment = center; vc.border = BORDER_BLACK;
      }
      ws.getRow(r).height = 18; r++;
    }
  });

  if (p.remarks) { section("Remarks"); wide("Remarks", p.remarks); }

  addFooter(ws, {
    checkedBy:  p.recordedBy || "",
    verifiedBy: p.verifiedBy || "",
  }, NC);
  return ws;
}
