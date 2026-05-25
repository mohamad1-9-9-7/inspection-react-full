// src/pages/settings/excel-exporters/meat_daily.js
// Mirrors BrowseMeatDaily.jsx — record = one day of meat daily checks
import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COLS = [
  { key: "sl",          label: "#",            width: 6  },
  { key: "productName", label: "Product Name", width: 30 },
  { key: "pos",         label: "POS",          width: 12 },
  { key: "quantity",    label: "Qty",          width: 10 },
  { key: "qtyType",     label: "Qty Type",     width: 10 },
  { key: "expiry",      label: "Expiry Date",  width: 14 },
  { key: "status",      label: "Status",       width: 22 },
  { key: "remarks",     label: "Remarks",      width: 32 },
];
const NC = COLS.length;

function parsePos(remarks) {
  const m = /pos\s*(\d+)/i.exec(remarks || "");
  return m ? `POS ${m[1]}` : "";
}
function statusSeverity(s) {
  const v = (s || "").toLowerCase();
  if (!v) return "none";
  if (v === "ok" || v === "good" || v === "جيد" || v === "سليم") return "ok";
  if (v.includes("near expiry") || v.includes("قارب")) return "warn";
  if (v.includes("expired") || v.includes("منتهي") ||
      v.includes("color") || v.includes("لون") ||
      v.includes("smell") || v.includes("رائحة") || v.includes("ريحة")) return "bad";
  return "other";
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
    documentTitle: "Meat Daily Inspection",
    documentNo:    "MTD-QM/REC/001",
    area:          "QA / Operations",
    reportTitle:   "MEAT DAILY INSPECTION REPORT",
    reportDate:    date,
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ── Summary band ── */
  const totalKg  = items.filter((i) => /kg|كيلو/i.test(i?.qtyType || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const totalPcs = items.filter((i) => !/kg|كيلو/i.test(i?.qtyType || ""))
                        .reduce((s, i) => s + (Number(i?.quantity) || 0), 0);
  const issueCount = items.filter((i) => {
    const sev = statusSeverity(i?.status);
    return sev === "bad" || sev === "warn";
  }).length;

  ws.mergeCells(r, 1, r, NC);
  const sc = ws.getCell(r, 1);
  sc.value = `Items: ${items.length}  |  Total KG: ${totalKg.toFixed(2)}  |  Total PCS: ${totalPcs}  |  Issues: ${issueCount}`;
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
      const status = item?.status || "";
      const sev    = statusSeverity(status);
      const vals   = [
        ri + 1,
        item?.productName || "",
        parsePos(item?.remarks) || "—",
        item?.quantity ?? "",
        item?.qtyType  || "",
        item?.expiry   || "",
        status,
        item?.remarks  || "",
      ];
      vals.forEach((val, ci) => {
        const c = ws.getCell(r, ci + 1);
        c.value     = val;
        c.font      = { size: 10 };
        c.fill      = fillSolid(bg);
        c.alignment = (ci === NC - 1)
          ? { ...left, wrapText: true }
          : (ci === 0 ? center : center);
        c.border    = BORDER_BLACK;

        /* Status column (col index 6) coloring */
        if (ci === 6 && sev !== "none") {
          if (sev === "ok") {
            c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
            c.fill = fillSolid(COLORS.GREEN_BG);
          } else if (sev === "warn") {
            c.font = { bold: true, color: { argb: COLORS.AMBER }, size: 10 };
            c.fill = fillSolid(COLORS.AMBER_BG);
          } else if (sev === "bad") {
            c.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
            c.fill = fillSolid(COLORS.RED_BG);
          }
        }
      });
      ws.getRow(r).height = 20; r++;
    });
  }

  addFooter(ws, {}, NC);
  return ws;
}
