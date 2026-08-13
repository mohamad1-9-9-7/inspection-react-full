// src/pages/settings/excel-exporters/odoo_disposal_log.js
// Odoo Monthly Disposal Log — one API record = one imported month.
// Mirrors the import/preview screen: meta band → per-branch summary → every row.
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";
import { monthLabel, safeArr, num } from "../../Destruction/DisposalLog/disposalLogOptions";

const COLS = [
  { label: "SL",             width: 6  },
  { label: "Date",           width: 12 },
  { label: "Odoo Location",  width: 30 },
  { label: "Branch",         width: 11 },
  { label: "Reference",      width: 22 },
  { label: "Item Code",      width: 12 },
  { label: "Product",        width: 34 },
  { label: "Category",       width: 18 },
  { label: "Qty",            width: 10 },
  { label: "Unit",           width: 9  },
  { label: "Remarks",        width: 22 },
];
const NC = COLS.length;

function metaPairs(meta, stats) {
  const units = safeArr(stats?.byUnit).map(([u, q]) => `${Number(q).toFixed(2)} ${u}`).join("  ·  ");
  return [
    ["Month",            monthLabel(meta?.period) || meta?.period || ""],
    ["Source system",    meta?.source || "Odoo"],
    ["Imported file",    meta?.fileName || ""],
    ["Sheet",            meta?.sheetName || ""],
    ["Imported by",      meta?.importedBy || ""],
    ["Imported at",      String(meta?.importedAt || "").slice(0, 19).replace("T", " ")],
    ["Date range",       stats?.dateFrom ? `${formatDMY(stats.dateFrom)} → ${formatDMY(stats.dateTo)}` : ""],
    ["Total lines",      String(stats?.lines ?? "")],
    ["Total quantity",   units],
    ["Notes",            meta?.notes || ""],
  ];
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p     = record?.payload || {};
  const meta  = p.meta || {};
  const stats = p.stats || {};
  const rows  = safeArr(p.rows);

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Odoo Monthly Disposal Log",
    documentNo:    "AM-QM/REC/CND-02",
    area:          "QA / Operations",
    reportTitle:   "ODOO MONTHLY DISPOSAL LOG — سجل الإعدام الشهري (أودو)",
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Meta band (label / value pairs, 2 per row) ── */
  const pairs = metaPairs(meta, stats);
  const HALF = Math.ceil(NC / 2);
  for (let i = 0; i < pairs.length; i += 2) {
    const row = r;
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

    if (chunk.length === 1) {
      ws.mergeCells(row, HALF + 1, row, NC);
      ws.getCell(row, HALF + 1).border = BORDER_BLACK;
    }

    ws.getRow(row).height = 19;
    r++;
  }

  r++; // spacer

  /* ── Per-branch summary ── */
  const branches = safeArr(stats.branches);
  if (branches.length) {
    ws.mergeCells(r, 1, r, NC);
    const bh = ws.getCell(r, 1);
    bh.value     = "SUMMARY BY BRANCH — ملخص حسب الفرع";
    bh.alignment = center;
    bh.font      = { bold: true, size: 11, color: { argb: COLORS.TEXT } };
    bh.fill      = fillSolid(COLORS.GRAY_HEAD);
    bh.border    = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;

    const bCols = ["Branch", "Lines", "Quantity", "By unit"];
    const spans = [[1, 2], [3, 3], [4, 4], [5, NC]];
    bCols.forEach((lbl, i) => {
      const [s, e] = spans[i];
      if (e > s) ws.mergeCells(r, s, r, e);
      const c = ws.getCell(r, s);
      c.value     = lbl;
      c.font      = { bold: true, size: 10, color: { argb: COLORS.WHITE } };
      c.fill      = fillSolid(COLORS.NAVY);
      c.alignment = center;
      c.border    = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;

    branches.forEach((b, i) => {
      const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      const vals = [
        b?.branch || "—",
        num(b?.lines),
        num(b?.qty),
        safeArr(b?.units).map(([u, q]) => `${u}: ${Number(q).toFixed(2)}`).join("  ·  "),
      ];
      vals.forEach((val, i2) => {
        const [s, e] = spans[i2];
        if (e > s) ws.mergeCells(r, s, r, e);
        const c = ws.getCell(r, s);
        c.value     = val;
        c.font      = { size: 10 };
        c.fill      = fillSolid(bg);
        c.alignment = i2 === 0 || i2 === 3 ? { ...left, indent: 1 } : center;
        c.border    = BORDER_BLACK;
        if (i2 === 2) c.numFmt = "#,##0.00";
      });
      ws.getRow(r).height = 18; r++;
    });

    r++; // spacer
  }

  /* ── Detail table ── */
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value     = col.label;
    c.font      = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill      = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border    = BORDER_BLACK;
  });
  ws.getRow(r).height = 26; r++;

  if (!rows.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value     = "No rows imported.";
    c.alignment = center;
    c.font      = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border    = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    rows.forEach((it, i) => {
      const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      const vals = [
        i + 1,
        formatDMY(it?.date),
        it?.locationRaw || "",
        it?.branch || "",
        it?.reference || "",
        it?.code || "",
        it?.product || "",
        it?.category || "",
        num(it?.qty),
        it?.uom || "",
        it?.remarks || "",
      ];
      vals.forEach((val, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value     = val;
        c.font      = { size: 10 };
        c.fill      = fillSolid(bg);
        c.alignment = ci === 2 || ci === 6 || ci === 7 || ci === 10
          ? { ...left, wrapText: true }
          : center;
        c.border    = BORDER_BLACK;
        if (ci === 8) c.numFmt = "#,##0.000";
      });
      ws.getRow(r).height = 18; r++;
    });

    /* ── Totals row ── */
    ws.mergeCells(r, 1, r, 8);
    const tl = ws.getCell(r, 1);
    tl.value     = "TOTAL";
    tl.font      = { bold: true, size: 10, color: { argb: COLORS.WHITE } };
    tl.fill      = fillSolid(COLORS.NAVY_LIGHT);
    tl.alignment = { ...left, indent: 1 };
    tl.border    = BORDER_BLACK;

    const total = rows.reduce((s, it) => s + num(it?.qty), 0);
    [[9, total], [10, ""], [11, ""]].forEach(([col, val]) => {
      const c = ws.getCell(r, col);
      c.value     = val;
      c.font      = { bold: true, size: 10, color: { argb: COLORS.RED } };
      c.fill      = fillSolid(COLORS.RED_BG);
      c.alignment = center;
      c.border    = BORDER_BLACK;
      if (col === 9) c.numFmt = "#,##0.000";
    });
    ws.getRow(r).height = 20; r++;
  }

  addFooter(ws, { checkedBy: meta?.importedBy || "", verifiedBy: "" }, NC);
  return ws;
}
