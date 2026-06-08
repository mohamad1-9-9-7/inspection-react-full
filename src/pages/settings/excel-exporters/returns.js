// src/pages/settings/excel-exporters/returns.js
// Mirrors BrowseReturns.jsx — record = one day of branch returns
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { key: "itemCode",    label: "Item Code",    width: 13 },
  { key: "productName", label: "Product Name", width: 28 },
  { key: "origin",      label: "Origin",       width: 14 },
  { key: "butchery",    label: "POS / Branch", width: 18 },
  { key: "quantity",    label: "Qty",          width: 10 },
  { key: "qtyType",     label: "Qty Type",     width: 10 },
  { key: "expiry",      label: "Expiry Date",  width: 14 },
  { key: "action",      label: "Action",       width: 24 },
  { key: "remarks",     label: "Remarks",      width: 30 },
];
const NC = COLS.length;

function safeButchery(row) {
  const b = row?.butchery || "";
  if (/other branch|فرع آخر/i.test(b)) return row?.customButchery || b;
  // Old data sometimes stored the branch as a bare number (e.g. "47" / "48").
  const s = String(b).trim();
  if (/^\d+$/.test(s)) return `POS ${s}`;
  return b;
}
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
    documentTitle: "Returns Report",
    documentNo:    "RTN-QM/REC/001",
    area:          "QA / Logistics",
    reportTitle:   "BRANCH RETURNS REPORT",
    reportDate:    date,
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Summary band ── */
  const totalKg  = items.filter((i) => /kg|كيلو/i.test(i?.qtyType || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const totalPcs = items.filter((i) => !/kg|كيلو/i.test(i?.qtyType || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value     = `Items: ${items.length}  |  Total KG: ${totalKg.toFixed(2)}  |  Total PCS: ${totalPcs}`;
  sc.alignment = center;
  sc.font      = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
  sc.fill      = fillSolid(COLORS.SKY);
  sc.border    = BORDER_BLACK;
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
        item?.itemCode    || "",
        item?.productName || "",
        item?.origin      || "",
        safeButchery(item),
        item?.quantity    ?? "",
        item?.qtyType     || "",
        item?.expiry      || "",
        action,
        item?.remarks     || "",
      ];
      vals.forEach((val, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value     = val;
        c.font      = { size: 10 };
        c.fill      = fillSolid(bg);
        c.alignment = ci === NC - 1 ? { ...left, wrapText: true } : center;
        c.border    = BORDER_BLACK;
        /* action column coloring */
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
