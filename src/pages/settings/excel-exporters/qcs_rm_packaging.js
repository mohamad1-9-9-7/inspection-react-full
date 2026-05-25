// src/pages/settings/excel-exporters/qcs_rm_packaging.js
// Mirrors RMInspectionReportPackagingView.jsx (RM Packaging Inspection)

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const FIXED_COLUMNS = [
  { label: "S. No",                 width: 7,  isSerial: true },
  { label: "Item Name",             width: 22, aliases: ["itemName","item_name","item","product","productName","product_name"] },
  { label: "Supplier Details",      width: 22, aliases: ["supplier","supplierName","supplier_name","supplierDetails","supplier_details","supplierInfo"] },
  { label: "Specifications",        width: 22, aliases: ["specifications","specs","spec","spec_detail","specification"] },
  { label: "Invoice No",            width: 14, aliases: ["invoiceNo","invoice","inv","invoice_no","bill","bill_no","ref","reference"] },
  { label: "Pest Activity",         width: 13, aliases: ["pestActivity","pest_activity","pest"] },
  { label: "Broken / Damaged",      width: 13, aliases: ["brokenDamaged","broken_damaged","broken","damaged"] },
  { label: "Physical Contamination",width: 16, aliases: ["physicalContamination","physical_contamination","physical"] },
  { label: "Remarks",               width: 22, aliases: ["remarks","remark","comment","comments","note","notes"] },
];

function findKey(row, aliases) {
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, "").replace(/[_-]+/g, "");
  const keys = Object.keys(row || {});
  const map = new Map(keys.map((k) => [norm(k), k]));
  for (const a of (aliases || [])) {
    const hit = map.get(norm(a));
    if (hit) return hit;
  }
  return null;
}

function buildPackagingLike(title, docNo) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : [];

    const NC = FIXED_COLUMNS.length;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = FIXED_COLUMNS.map((c) => ({ width: c.width }));

    addDocHeader(ws, {
      documentTitle: title,
      documentNo:    docNo,
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
      reportTitle:   title.toUpperCase(),
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    // Table header
    FIXED_COLUMNS.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = col.label;
      c.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 28;
    r++;

    if (!entries.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No entries available.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      entries.forEach((row, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        FIXED_COLUMNS.forEach((col, ci) => {
          let val;
          if (col.isSerial) val = i + 1;
          else {
            const k = findKey(row, col.aliases);
            val = k ? row[k] : "";
          }
          const c = ws.getCell(r, ci + 1);
          c.value = val ?? "";
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = col.label === "Remarks"
            ? { horizontal: "left", vertical: "top", wrapText: true }
            : center;
          c.border = BORDER_BLACK;
        });
        ws.getRow(r).height = 22;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  p?.footer?.checkedBy  || p?.checkedBy  || "",
      verifiedBy: p?.footer?.verifiedBy || p?.verifiedBy || "",
    }, NC);
    return ws;
  };
}

export default buildPackagingLike("RM Packaging Inspection", "FF-QM/RMR/PKG");
export const ingredientsBuilder = buildPackagingLike("RM Ingredients Inspection", "FF-QM/RMR/ING");
