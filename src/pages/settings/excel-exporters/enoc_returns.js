// src/pages/settings/excel-exporters/enoc_returns.js
// Mirrors ENOCReturnsInput.jsx browse — record = one day of ENOC returns
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { label: "Box Code",     width: 11 },
  { label: "Box Name",     width: 20 },
  { label: "Box Qty",      width: 10 },
  { label: "Product Name", width: 26 },
  { label: "Location",     width: 18 },
  { label: "Qty",          width: 10 },
  { label: "Qty Type",     width: 12 },
  { label: "Expiry Date",  width: 13 },
  { label: "Action",       width: 24 },
  { label: "Remarks",      width: 28 },
];
const NC = COLS.length;

function safeButchery(row) {
  const b = row?.butchery || "";
  if (/other branch|فرع آخر/i.test(b)) return row?.customButchery || b;
  return b;
}
function safeQtyType(row) {
  const q = row?.qtyType || "";
  if (/other|أخرى/i.test(q)) return row?.customQtyType || q;
  return q;
}
function safeAction(row) {
  const a = row?.action || "";
  if (/other\.\.\.|إجراء آخر/i.test(a)) return row?.customAction || a;
  return a;
}

/* Group items by boxGroupId (preserving insertion order) */
function groupByBox(items) {
  const groups = new Map();
  for (const item of items) {
    const gid = item?.boxGroupId || "__no_group__";
    if (!groups.has(gid)) {
      groups.set(gid, {
        boxCode: item?.boxCode || "",
        boxName: item?.boxName || "",
        boxQty:  item?.boxQty  ?? "",
        items:   [],
      });
    }
    groups.get(gid).items.push(item);
  }
  return Array.from(groups.values());
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
    documentTitle: "ENOC Returns",
    documentNo:    "ENC-QM/REC/001",
    area:          "ENOC / Logistics",
    reportTitle:   "ENOC RETURNS REPORT",
    reportDate:    date,
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Summary band ── */
  const totalKg  = items.filter((i) => /kg|كيلو/i.test(safeQtyType(i) || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const totalPcs = items.filter((i) => !/kg|كيلو/i.test(safeQtyType(i) || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const groups = groupByBox(items);

  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value = `Boxes: ${groups.length}  |  Items: ${items.length}  |  Total KG: ${totalKg.toFixed(2)}  |  Total PCS: ${totalPcs}`;
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
    let globalSeq = 0;
    groups.forEach((grp) => {
      /* Box header band */
      ws.mergeCells(r, 1, r, NC);
      const bh = ws.getCell(r, 1);
      bh.value = `Box ${grp.boxCode || "—"}  ·  ${grp.boxName || "—"}  ·  Box Qty: ${grp.boxQty ?? "—"}  ·  Items: ${grp.items.length}`;
      bh.alignment = { ...left, indent: 1 };
      bh.font   = { bold: true, size: 10, color: { argb: COLORS.WHITE } };
      bh.fill   = fillSolid(COLORS.NAVY_LIGHT);
      bh.border = BORDER_BLACK;
      ws.getRow(r).height = 20; r++;

      grp.items.forEach((item) => {
        globalSeq++;
        const bg     = (globalSeq % 2 === 1) ? COLORS.WHITE : COLORS.GRAY_ALT;
        const action = safeAction(item);
        const vals   = [
          grp.boxCode || "",
          grp.boxName || "",
          grp.boxQty  ?? "",
          item?.productName || "",
          safeButchery(item),
          item?.quantity   ?? "",
          safeQtyType(item),
          item?.expiry     || "",
          action,
          item?.remarks    || "",
        ];
        vals.forEach((val, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value     = val;
          c.font      = { size: 10 };
          c.fill      = fillSolid(bg);
          c.alignment = (ci === NC - 1) ? { ...left, wrapText: true } : center;
          c.border    = BORDER_BLACK;

          /* Action column (ci === 8) coloring */
          if (ci === 8) {
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
    });
  }

  addFooter(ws, {}, NC);
  return ws;
}
