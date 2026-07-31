// src/pages/settings/excel-exporters/destruction_record.js
// Condemnation & Disposal Record — one API record = one day of condemned items.
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";
import {
  computeTotals, fmt2, lineValue, num, resolveOption, safeArr,
} from "../../Destruction/destructionOptions";
import { getRefNo } from "../../../utils/reportRef";

const COLS = [
  { label: "SL",           width: 6  },
  { label: "Item Code",    width: 12 },
  { label: "Product",      width: 30 },
  { label: "Batch / Lot",  width: 14 },
  { label: "Prod. Date",   width: 12 },
  { label: "Expiry",       width: 12 },
  { label: "Qty",          width: 10 },
  { label: "Unit",         width: 9  },
  { label: "Unit Cost",    width: 11 },
  { label: "Value (AED)",  width: 12 },
  { label: "Reason",       width: 28 },
  { label: "Method",       width: 26 },
  { label: "Remarks",      width: 26 },
];
const NC = COLS.length;

/* Header fields printed above the item table, two per row */
function headerPairs(h, dateStr, refNo) {
  return [
    ["Reference No.",     refNo || ""],
    ["Branch / Location", resolveOption(h?.branch, h?.customBranch)],
    ["Disposal Date",     formatDMY(h?.destructionDate) || dateStr],
    ["Disposal Site",     h?.location || ""],
    ["Method",            resolveOption(h?.method, h?.customMethod)],
    ["Disposal Company",  h?.disposalCompany || ""],
    ["Municipality Ref.", h?.municipalityRef || ""],
    ["Destroyed By",      h?.performedBy || ""],
    ["Witnessed By",      h?.witnessedBy || ""],
    ["Approved By (QA)",  h?.approvedBy || ""],
    ["Notes",             h?.notes || ""],
  ];
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p      = record?.payload || {};
  const date   = formatDMY(p.reportDate || extractDate(record));
  const header = p.header || {};
  const items  = safeArr(p.items);
  const totals = computeTotals(items);

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Condemnation & Disposal Record",
    documentNo:    "AM-QM/REC/CND-01",
    area:          "QA / Operations",
    reportTitle:   "CONDEMNATION & DISPOSAL RECORD — سجل الإعدام والتخلص",
    reportDate:    date,
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Destruction details band (label / value pairs, 2 per row) ── */
  const pairs = headerPairs(header, date, getRefNo(record, "destruction_record"));
  const HALF = Math.ceil(NC / 2);
  for (let i = 0; i < pairs.length; i += 2) {
    const row   = r;
    const chunk = [pairs[i], pairs[i + 1]].filter(Boolean);

    chunk.forEach(([label, value], side) => {
      const startCol = side === 0 ? 1 : HALF + 1;
      const endCol   = side === 0 ? HALF : NC;

      const lc = ws.getCell(row, startCol);
      lc.value     = label;
      lc.font      = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
      lc.fill      = fillSolid(COLORS.SKY);
      lc.alignment = { ...left, indent: 1 };
      lc.border    = BORDER_BLACK;

      ws.mergeCells(row, startCol + 1, row, endCol);
      const vc = ws.getCell(row, startCol + 1);
      vc.value     = value || "—";
      vc.font      = { size: 10 };
      vc.alignment = { ...left, indent: 1 };
      vc.border    = BORDER_BLACK;
    });

    /* When only one pair is on the row, blank-fill the right half. */
    if (chunk.length === 1) {
      ws.mergeCells(row, HALF + 1, row, NC);
      ws.getCell(row, HALF + 1).border = BORDER_BLACK;
    }

    ws.getRow(row).height = 19;
    r++;
  }

  r++; // spacer

  /* ── Summary band ── */
  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value = `Lines: ${totals.lines}  |  Total Weight: ${fmt2(totals.totalWeight)} KG  |  Estimated Loss: ${fmt2(totals.totalValue)} AED` +
    (totals.byUnit.length ? `  |  ${totals.byUnit.map(([u, q]) => `${u}: ${fmt2(q)}`).join("  ·  ")}` : "");
  sc.alignment = center;
  sc.font   = { bold: true, size: 11, color: { argb: COLORS.RED } };
  sc.fill   = fillSolid(COLORS.RED_BG);
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
    ws.getRow(r).height = 20; r++;
  } else {
    const defaultMethod = resolveOption(header?.method, header?.customMethod);

    items.forEach((it, i) => {
      const bg   = (i % 2 === 0) ? COLORS.WHITE : COLORS.GRAY_ALT;
      const vals = [
        i + 1,
        it?.itemCode || "",
        it?.productName || "",
        it?.batchNo || "",
        formatDMY(it?.productionDate) || "",
        formatDMY(it?.expiry) || "",
        num(it?.quantity),
        resolveOption(it?.qtyType, it?.customQtyType),
        num(it?.unitCost),
        num(lineValue(it)),
        resolveOption(it?.reason, it?.customReason),
        resolveOption(it?.method, it?.customMethod) || defaultMethod,
        it?.remarks || "",
      ];

      vals.forEach((val, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value     = val;
        c.font      = { size: 10 };
        c.fill      = fillSolid(bg);
        c.alignment = (ci === 2 || ci === 10 || ci === 11 || ci === 12)
          ? { ...left, wrapText: true }
          : center;
        c.border    = BORDER_BLACK;

        if (ci === 8 || ci === 9) c.numFmt = "#,##0.00";
        if (ci === 6) c.numFmt = "#,##0.00";

        /* Value column highlighted — this is the money lost */
        if (ci === 9) c.font = { bold: true, size: 10, color: { argb: COLORS.RED } };
      });

      ws.getRow(r).height = 20; r++;
    });

    /* ── Totals row ── */
    ws.mergeCells(r, 1, r, 6);
    const tl = ws.getCell(r, 1);
    tl.value     = "TOTAL";
    tl.font      = { bold: true, size: 10, color: { argb: COLORS.WHITE } };
    tl.fill      = fillSolid(COLORS.NAVY_LIGHT);
    tl.alignment = { ...left, indent: 1 };
    tl.border    = BORDER_BLACK;

    const totalCells = [
      [7,  totals.totalWeight],
      [8,  "KG"],
      [9,  ""],
      [10, totals.totalValue],
    ];
    totalCells.forEach(([col, val]) => {
      const c = ws.getCell(r, col);
      c.value     = val;
      c.font      = { bold: true, size: 10, color: { argb: COLORS.RED } };
      c.fill      = fillSolid(COLORS.RED_BG);
      c.alignment = center;
      c.border    = BORDER_BLACK;
      if (col === 7 || col === 10) c.numFmt = "#,##0.00";
    });

    ws.mergeCells(r, 11, r, NC);
    const tr = ws.getCell(r, 11);
    tr.value     = totals.byUnit.map(([u, q]) => `${u}: ${fmt2(q)}`).join("   ·   ");
    tr.font      = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    tr.fill      = fillSolid(COLORS.RED_BG);
    tr.alignment = { ...left, indent: 1 };
    tr.border    = BORDER_BLACK;

    ws.getRow(r).height = 22; r++;
  }

  addFooter(ws, {
    checkedBy:  header?.witnessedBy || "",
    verifiedBy: header?.approvedBy || "",
  }, NC);

  return ws;
}
