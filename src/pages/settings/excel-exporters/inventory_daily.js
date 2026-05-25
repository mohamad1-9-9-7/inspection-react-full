// src/pages/settings/excel-exporters/inventory_daily.js
// Mirrors InventoryDailyBrowse.jsx — record = one day grouped inventory check
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

/* Status labels — mirrors STATUS_LABELS in InventoryDailyBrowse.jsx */
const STATUS_LABELS = {
  OK:          "OK",
  NEAR_EXPIRY: "Near Expiry (≤7 days)",
  EXPIRED:     "Expired",
  DAMAGED:     "Damaged/Returned",
};
function statusLabel(s) { return STATUS_LABELS[s] || s || "Unknown"; }

/* Color by status code */
function statusColor(s) {
  if (s === "OK") return { fg: COLORS.GREEN, bg: COLORS.GREEN_BG };
  if (s === "NEAR_EXPIRY") return { fg: COLORS.AMBER, bg: COLORS.AMBER_BG };
  if (s === "EXPIRED") return { fg: COLORS.RED, bg: COLORS.RED_BG };
  if (s === "DAMAGED") return { fg: COLORS.RED, bg: COLORS.RED_BG };
  return null;
}

const COLS = [
  { label: "#",           width: 6  },
  { label: "Code",        width: 13 },
  { label: "Product Name", width: 28 },
  { label: "Supplier",    width: 20 },
  { label: "Qty PCS",     width: 10 },
  { label: "Qty KG",      width: 10 },
  { label: "Prod Date",   width: 13 },
  { label: "Exp Date",    width: 13 },
  { label: "AWB No.",     width: 14 },
  { label: "SIF No.",     width: 14 },
  { label: "Status",      width: 22 },
  { label: "Remarks",     width: 28 },
];
const NC = COLS.length;

/* Extract sections from a raw server record */
function extractSections(record) {
  const p = record?.payload || {};
  let sections = p.sections || record?.sections;
  if (Array.isArray(sections) && sections.length) return sections;
  /* legacy: rows at root level */
  const rows = p.rows || record?.rows;
  if (Array.isArray(rows) && rows.length) {
    return [{ title: "Inventory", rows }];
  }
  return [];
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p        = record?.payload || {};
  const rawDate  = p.date || p.reportDate || extractDate(record);
  const date     = formatDMY(rawDate);
  const sections = extractSections(record);

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Inventory Daily Report",
    documentNo:    "INV-QM/REC/001",
    area:          "Store / Warehouse",
    reportTitle:   "DAILY INVENTORY GROUPED REPORT",
    reportDate:    date,
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Overall summary band ── */
  const allRows  = sections.flatMap((s) => Array.isArray(s.rows) ? s.rows : []);
  const totalPcs = allRows.reduce((s, r) => s + (Number(r?.qtyPcs) || 0), 0);
  const totalKg  = allRows.reduce((s, r) => s + (Number(r?.qtyKg)  || 0), 0);
  const issueCount = allRows.filter(
    (row) => row?.status === "EXPIRED" || row?.status === "NEAR_EXPIRY" || row?.status === "DAMAGED"
  ).length;

  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value = `Sections: ${sections.length}  |  Total Items: ${allRows.length}  |  Total PCS: ${totalPcs}  |  Total KG: ${totalKg.toFixed(2)}  |  Issues: ${issueCount}`;
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

  if (!sections.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value     = "No inventory data recorded.";
    c.alignment = center;
    c.font      = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border    = BORDER_BLACK;
    ws.getRow(r).height = 20;
  } else {
    let globalSeq = 0;
    sections.forEach((sec) => {
      const rows = Array.isArray(sec.rows) ? sec.rows : [];

      /* ── Section header band ── */
      const secPcs = rows.reduce((s, x) => s + (Number(x?.qtyPcs) || 0), 0);
      const secKg  = rows.reduce((s, x) => s + (Number(x?.qtyKg)  || 0), 0);
      ws.mergeCells(r, 1, r, NC);
      const hc = ws.getCell(r, 1);
      hc.value = `${sec.title || "Section"}  ·  Items: ${rows.length}  |  PCS: ${secPcs}  |  KG: ${secKg.toFixed(2)}`;
      hc.alignment = { ...left, indent: 1 };
      hc.font   = { bold: true, size: 11, color: { argb: COLORS.NAVY } };
      hc.fill   = fillSolid(COLORS.SKY);
      hc.border = BORDER_BLACK;
      ws.getRow(r).height = 22; r++;

      if (!rows.length) {
        ws.mergeCells(r, 1, r, NC);
        const ec = ws.getCell(r, 1);
        ec.value     = "No items in this section.";
        ec.alignment = center;
        ec.font      = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
        ec.border    = BORDER_BLACK;
        ws.getRow(r).height = 18; r++;
        return;
      }

      rows.forEach((row) => {
        globalSeq++;
        const bg   = (globalSeq % 2 === 1) ? COLORS.WHITE : COLORS.GRAY_ALT;
        const sCol = statusColor(row?.status);
        const vals = [
          globalSeq,
          row?.code         || "",
          row?.name         || "",
          row?.supplierName || "",
          row?.qtyPcs       ?? "",
          row?.qtyKg        ?? "",
          formatDMY(row?.prodDate) || row?.prodDate || "",
          formatDMY(row?.expDate)  || row?.expDate  || "",
          row?.awbNo        || "",
          row?.sifNo        || "",
          statusLabel(row?.status),
          row?.remarks      || "",
        ];
        vals.forEach((val, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value     = val;
          c.font      = { size: 10 };
          c.fill      = fillSolid(bg);
          c.alignment = (ci === NC - 1) ? { ...left, wrapText: true } : center;
          c.border    = BORDER_BLACK;
          /* Status column (ci === 10) */
          if (ci === 10 && sCol) {
            c.font = { bold: true, color: { argb: sCol.fg }, size: 10 };
            c.fill = fillSolid(sCol.bg);
          }
        });
        ws.getRow(r).height = 20; r++;
      });
    });
  }

  addFooter(ws, {}, NC);
  return ws;
}
