// src/pages/settings/excel-exporters/returns_extras.js
// Extra sheets for the returns backup (branch + customer returns).
//
// The per-day sheets mirror BrowseReturns exactly and stay untouched. On top
// of them every MONTH file opens with:
//   • "Summary"   — totals by branch/customer, by action, by day, top items.
//   • "All Items" — every returned line of the month in ONE filterable table
//                   (date + ref on each line), which is how QA actually reads
//                   a month: filter by item, by branch, by condemnation.
// and every YEAR folder gets a "00 Year Summary" workbook: month × branch and
// month × action matrices in KG and PCS.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left, rowsOf, extractDate,
} from "./_lib";
import { getRefNo } from "../../../utils/reportRef";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const isKg = (t) => /kg|كيلو|كغ/i.test(String(t || ""));
const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function partyOf(item, kind) {
  if (kind === "customer") return String(item?.customerName || "").trim() || "—";
  const b = String(item?.butchery || "").trim();
  if (/other branch|فرع آخر/i.test(b)) return item?.customButchery || b || "—";
  if (/^\d+$/.test(b)) return `POS ${b}`;
  return b || "—";
}
function actionOf(item) {
  const a = String(item?.action || "").trim();
  if (/other\.\.\.|إجراء آخر/i.test(a)) return item?.customAction || a || "—";
  return a || "—";
}
function isoDay(rec) {
  const s = String(rec?.payload?.reportDate || extractDate(rec) || "");
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  return d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : "";
}
const utcDay = (iso) => (iso ? new Date(`${iso}T00:00:00Z`) : "");

/** Every line of every record, flattened with its date and reference. */
export function flattenReturnLines(records, kind) {
  const typeKey = kind === "customer" ? "returns_customers" : "returns";
  const out = [];
  for (const rec of records || []) {
    const day = isoDay(rec);
    const ref = getRefNo(rec, typeKey) || "";
    for (const it of rowsOf(rec?.payload?.items)) {
      if (!Object.values(it).some((v) => String(v ?? "").trim() !== "")) continue;
      out.push({
        day,
        ref,
        itemCode: it.itemCode || "",
        productName: it.productName || "",
        origin: it.origin || "",
        party: partyOf(it, kind),
        transferNo: it.transferNo || "",
        qty: num(it.quantity),
        qtyType: it.qtyType || "",
        kg: isKg(it.qtyType),
        expiry: it.expiry || "",
        action: actionOf(it),
        remarks: it.remarks || "",
      });
    }
  }
  return out;
}

/* ─── tiny table writer (own styling, filter + frozen header) ─── */
function title(ws, r, text, nc) {
  ws.mergeCells(r, 1, r, nc);
  const c = ws.getCell(r, 1);
  c.value = text;
  c.font = { bold: true, size: 12, color: { argb: COLORS.WHITE } };
  c.fill = fillSolid(COLORS.NAVY);
  c.alignment = { ...left, indent: 1 };
  ws.getRow(r).height = 22;
  return r + 1;
}
function table(ws, r, heads, rows, fmts = []) {
  heads.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { bold: true, color: { argb: COLORS.NAVY }, size: 10 };
    c.fill = fillSolid(COLORS.SKY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  r++;
  rows.forEach((vals, ri) => {
    vals.forEach((v, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = v;
      if (fmts[ci]) c.numFmt = fmts[ci];
      c.font = { size: 10, bold: ri === rows.length - 1 && String(vals[0]).startsWith("TOTAL") };
      c.fill = fillSolid(ri % 2 ? COLORS.GRAY_ALT : COLORS.WHITE);
      c.alignment = ci === 0 ? { ...left, indent: 1 } : center;
      c.border = BORDER_BLACK;
    });
    r++;
  });
  return r + 1;
}

function groupTotals(lines, keyFn) {
  const m = new Map();
  for (const l of lines) {
    const k = keyFn(l);
    const g = m.get(k) || { lines: 0, kg: 0, pcs: 0, condemnKg: 0, condemnPcs: 0 };
    g.lines++;
    if (l.kg) g.kg += l.qty; else g.pcs += l.qty;
    if (/condemn|إتلاف|اتلاف/i.test(l.action)) { if (l.kg) g.condemnKg += l.qty; else g.condemnPcs += l.qty; }
    m.set(k, g);
  }
  return m;
}
function totalsRows(map, sortBy = "kg") {
  const rows = [...map.entries()].sort((a, b) => b[1][sortBy] - a[1][sortBy] || String(a[0]).localeCompare(String(b[0])));
  const all = rows.reduce((s, [, g]) => ({
    lines: s.lines + g.lines, kg: s.kg + g.kg, pcs: s.pcs + g.pcs,
    condemnKg: s.condemnKg + g.condemnKg, condemnPcs: s.condemnPcs + g.condemnPcs,
  }), { lines: 0, kg: 0, pcs: 0, condemnKg: 0, condemnPcs: 0 });
  return [
    ...rows.map(([k, g]) => [k, g.lines, g.kg, g.pcs, g.condemnKg, g.condemnPcs]),
    ["TOTAL", all.lines, all.kg, all.pcs, all.condemnKg, all.condemnPcs],
  ];
}
const TOT_HEADS = (first) => [first, "Lines", "KG", "PCS", "Condemned KG", "Condemned PCS"];
const TOT_FMTS = [null, "0", "0.00", "0", "0.00", "0"];

/**
 * "Summary" + "All Items" sheets for one month of returns. Call on the fresh
 * workbook BEFORE the per-day sheets so they open first.
 */
export function addReturnsMonthSheets(wb, records, { kind = "branch", monthLabel = "" } = {}) {
  const lines = flattenReturnLines(records, kind);
  const partyHead = kind === "customer" ? "Customer" : "Branch / POS";

  /* Summary */
  const ws = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 34 }, { width: 10 }, { width: 12 }, { width: 10 }, { width: 15 }, { width: 15 }];
  let r = 1;
  ws.mergeCells(r, 1, r, 6);
  const h = ws.getCell(r, 1);
  h.value = `${kind === "customer" ? "CUSTOMER RETURNS" : "BRANCH RETURNS"} — ${monthLabel}`;
  h.font = { bold: true, size: 14, color: { argb: COLORS.NAVY } };
  h.fill = fillSolid(COLORS.SKY_LIGHT);
  h.alignment = center;
  ws.getRow(r).height = 28;
  r += 2;

  const days = new Set(lines.map((l) => l.day).filter(Boolean));
  r = title(ws, r, "Month at a glance", 6);
  r = table(ws, r, ["Reports (days)", "Lines", "KG", "PCS", "Days with returns", ""], [[
    records.length, lines.length,
    lines.filter((l) => l.kg).reduce((s, l) => s + l.qty, 0),
    lines.filter((l) => !l.kg).reduce((s, l) => s + l.qty, 0),
    days.size, "",
  ]], ["0", "0", "0.00", "0", "0", null]);

  r = title(ws, r, `By ${partyHead}`, 6);
  r = table(ws, r, TOT_HEADS(partyHead), totalsRows(groupTotals(lines, (l) => l.party)), TOT_FMTS);

  r = title(ws, r, "By action", 6);
  r = table(ws, r, TOT_HEADS("Action"), totalsRows(groupTotals(lines, (l) => l.action)), TOT_FMTS);

  r = title(ws, r, "Top 20 items (by KG)", 6);
  const items = groupTotals(lines, (l) => `${l.itemCode ? `${l.itemCode} — ` : ""}${l.productName || "—"}`);
  const top = totalsRows(items).slice(0, -1).slice(0, 20);
  r = table(ws, r, TOT_HEADS("Item"), top, TOT_FMTS);

  r = title(ws, r, "By day", 6);
  const byDay = groupTotals(lines, (l) => l.day || "—");
  const dayRows = [...byDay.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([d, g]) => [d === "—" ? d : utcDay(d), g.lines, g.kg, g.pcs, g.condemnKg, g.condemnPcs]);
  table(ws, r, TOT_HEADS("Date"), dayRows, ["dd/mm/yyyy", "0", "0.00", "0", "0.00", "0"]);

  /* All Items */
  const wa = wb.addWorksheet("All Items", { views: [{ state: "frozen", ySplit: 1, showGridLines: false }] });
  const cols = [
    ["Date", 12, "dd/mm/yyyy"], ["Ref", 16], ["Item Code", 12], ["Product Name", 30], ["Origin", 13],
    [partyHead, 20], ...(kind === "customer" ? [] : [["Transfer No", 13]]),
    ["Qty", 10, "0.00"], ["Qty Type", 10], ["Expiry", 13], ["Action", 24], ["Remarks", 30],
  ];
  wa.columns = cols.map(([, w]) => ({ width: w }));
  cols.forEach(([hd], i) => {
    const c = wa.getCell(1, i + 1);
    c.value = hd;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  wa.getRow(1).height = 24;
  lines
    .slice()
    .sort((a, b) => String(a.day).localeCompare(String(b.day)))
    .forEach((l, i) => {
      const vals = [
        utcDay(l.day), l.ref, l.itemCode, l.productName, l.origin, l.party,
        ...(kind === "customer" ? [] : [l.transferNo]),
        l.qty, l.qtyType, l.expiry, l.action, l.remarks,
      ];
      vals.forEach((v, ci) => {
        const c = wa.getCell(i + 2, ci + 1);
        c.value = v;
        if (cols[ci][2]) c.numFmt = cols[ci][2];
        c.font = { size: 10 };
        c.border = BORDER_BLACK;
        c.alignment = ci === vals.length - 1 || ci === 3 ? { ...left, wrapText: true } : center;
        if (cols[ci][0] === "Action") {
          if (/condemn/i.test(l.action)) { c.font = { bold: true, size: 10, color: { argb: COLORS.RED } }; c.fill = fillSolid(COLORS.RED_BG); }
          else if (/send to market/i.test(l.action)) { c.font = { bold: true, size: 10, color: { argb: COLORS.AMBER } }; c.fill = fillSolid(COLORS.AMBER_BG); }
        }
      });
    });
  wa.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, lines.length + 1), column: cols.length } };
}

/**
 * The "00 Year Summary" workbook for one year folder.
 * @param {object} wb  fresh ExcelJS workbook
 * @param {object[]} records  every record of that year
 */
export function buildReturnsYearSummary(wb, records, { kind = "branch", year = "" } = {}) {
  const lines = flattenReturnLines(records, kind);
  const partyHead = kind === "customer" ? "Customer" : "Branch / POS";
  const monthOf = (l) => Number(String(l.day).slice(5, 7)) || 0;

  const matrix = (name, keyFn, unitKg) => {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 2, xSplit: 1, showGridLines: false }] });
    ws.columns = [{ width: 30 }, ...MONTHS.map(() => ({ width: 10 })), { width: 12 }];
    ws.mergeCells(1, 1, 1, 14);
    const t = ws.getCell(1, 1);
    t.value = `${kind === "customer" ? "Customer" : "Branch"} returns ${year} — ${name}`;
    t.font = { bold: true, size: 13, color: { argb: COLORS.NAVY } };
    t.fill = fillSolid(COLORS.SKY_LIGHT);
    t.alignment = center;
    ws.getRow(1).height = 26;

    const m = new Map();
    for (const l of lines) {
      if (l.kg !== unitKg) continue;
      const k = keyFn(l);
      const row = m.get(k) || new Array(12).fill(0);
      const mi = monthOf(l);
      if (mi) row[mi - 1] += l.qty;
      m.set(k, row);
    }
    const keys = [...m.keys()].sort((a, b) =>
      m.get(b).reduce((s, x) => s + x, 0) - m.get(a).reduce((s, x) => s + x, 0));
    const fmt = unitKg ? "0.00" : "0";
    const heads = [name.split(" ")[0] === "Action" ? "Action" : partyHead, ...MONTHS, "Year"];
    const rows = keys.map((k) => { const v = m.get(k); return [k, ...v, v.reduce((s, x) => s + x, 0)]; });
    const tot = new Array(12).fill(0);
    rows.forEach((rw) => rw.slice(1, 13).forEach((x, i) => { tot[i] += x; }));
    rows.push(["TOTAL", ...tot, tot.reduce((s, x) => s + x, 0)]);
    table(ws, 2, heads, rows, [null, ...MONTHS.map(() => fmt), fmt]);
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: rows.length + 1, column: 14 } };
  };

  matrix(`${kind === "customer" ? "Customer" : "Branch"} KG`, (l) => l.party, true);
  matrix(`${kind === "customer" ? "Customer" : "Branch"} PCS`, (l) => l.party, false);
  matrix("Action KG", (l) => l.action, true);
  matrix("Action PCS", (l) => l.action, false);
}

/** Which returns flavour a type is, or "" when it is not a returns-day type. */
export function returnsKindOf(typeKey) {
  if (typeKey === "returns") return "branch";
  if (typeKey === "returns_customers") return "customer";
  return "";
}
