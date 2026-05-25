// src/pages/settings/excel-exporters/returns_customers.js
// Mirrors BrowseCustomerReturns.jsx — record = one day of customer returns
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { key: "sl",           label: "#",             width: 6  },
  { key: "productName",  label: "Product Name",  width: 26 },
  { key: "origin",       label: "Origin",        width: 14 },
  { key: "customerName", label: "Customer",      width: 22 },
  { key: "quantity",     label: "Qty",           width: 10 },
  { key: "qtyType",      label: "Qty Type",      width: 10 },
  { key: "expiry",       label: "Expiry Date",   width: 14 },
  { key: "action",       label: "Action",        width: 24 },
  { key: "remarks",      label: "Remarks",       width: 30 },
];
const NC = COLS.length;

function safeAction(row) {
  const a = row?.action || "";
  if (/other\.\.\.|إجراء آخر/i.test(a)) return row?.customAction || a;
  return a;
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p     = record?.payload || {};
  const date  = formatDMY(p.reportDate || extractDate(record));
  const items = Array.isArray(p.items) ? p.items : [];

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Customer Returns",
    documentNo:    "CRN-QM/REC/001",
    area:          "QA / Logistics",
    reportTitle:   "CUSTOMER RETURNS REPORT",
    reportDate:    date,
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Summary band ── */
  const totalKg  = items.filter((i) => /kg|كيلو/i.test(i?.qtyType || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const totalPcs = items.filter((i) => !/kg|كيلو/i.test(i?.qtyType || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const customers = new Set(items.map((i) => (i?.customerName || "").trim()).filter(Boolean));

  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value = `Items: ${items.length}  |  Total KG: ${totalKg.toFixed(2)}  |  Total PCS: ${totalPcs}  |  Customers: ${customers.size}`;
  sc.alignment = center;
  sc.font   = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
  sc.fill   = fillSolid(COLORS.SKY);
  sc.border = BORDER_BLACK;
  ws.getRow(r).height = 22; r++;

  /* ── Column headers ── */
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value     = col.label;
    c.font      = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill      = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border    = BORDER_BLACK;
  });
  ws.getRow(r).height = 28; r++;

  /* ── Data rows ── */
  if (!items.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value     = "No items recorded.";
    c.alignment = center;
    c.font      = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border    = BORDER_BLACK;
    ws.getRow(r).height = 20;
  } else {
    items.forEach((item, ri) => {
      const bg     = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      const action = safeAction(item);
      const vals   = [
        ri + 1,
        item?.productName  || "",
        item?.origin       || "",
        item?.customerName || "",
        item?.quantity     ?? "",
        item?.qtyType      || "",
        item?.expiry       || "",
        action,
        item?.remarks      || "",
      ];
      vals.forEach((val, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value     = val;
        c.font      = { size: 10 };
        c.fill      = fillSolid(bg);
        c.alignment = (ci === NC - 1) ? { ...left, wrapText: true } : center;
        c.border    = BORDER_BLACK;

        /* Action column (col index 7) coloring */
        if (ci === 7) {
          if (/condemn/i.test(action)) {
            c.font = { bold: true, color: { argb: COLORS.RED },   size: 10 };
            c.fill = fillSolid(COLORS.RED_BG);
          } else if (/send to market/i.test(action)) {
            c.font = { bold: true, color: { argb: COLORS.AMBER }, size: 10 };
            c.fill = fillSolid(COLORS.AMBER_BG);
          } else if (/production|kitchen|use in/i.test(action)) {
            c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
            c.fill = fillSolid(COLORS.GREEN_BG);
          }
        }
      });
      ws.getRow(r).height = 20; r++;
    });
  }

  addFooter(ws, {}, NC);
  return ws;
}
