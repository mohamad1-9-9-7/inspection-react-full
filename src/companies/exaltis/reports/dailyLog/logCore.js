// src/companies/exaltis/reports/dailyLog/logCore.js
// Daily log engine — pure helpers: dates, rows, computed cells, status, periods.
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)
import API_BASE from "../../../../config/api";
import { containsOf, mayContainOf } from "../allergenMatrixData";

export const REPORTS_URL = `${String(API_BASE).replace(/\/$/, "")}/api/reports`;

export const credentials = (() => {
  try { return new URL(API_BASE).origin === window.location.origin ? "include" : "omit"; } catch { return "omit"; }
})();

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
};

/* ───────── row helpers ───────── */
export const blankRow = (table) => Object.fromEntries(table.columns.map((c) => [c.key, c.type === "list" ? [] : ""]));

export const blankItem = (col) => Object.fromEntries(col.fields.map((f) => [f.key, f.type === "select" ? f.options[0] : ""]));

// A list item counts only when a TYPED field holds something (a pre-selected
// unit alone is not data).
export const itemFilled = (col, it) => col.fields.some((f) => f.type !== "select" && String(it?.[f.key] ?? "").trim());

export const listOf = (col, v) => (Array.isArray(v) ? v : v && col.parseText ? col.parseText(v) : []);

export const cellFilled = (col, v) =>
  col.type === "list" ? listOf(col, v).some((it) => itemFilled(col, it)) : !!String(v ?? "").trim();

export const isRowEmpty = (table, row) =>
  table.columns.every((c) => c.type === "computed" || c.autoNow || c.autoDate || !cellFilled(c, row?.[c.key]));

export const withComputed = (table, row) => {
  const out = { ...row };
  table.columns.forEach((c) => {
    if (c.type === "computed") out[c.key] = c.compute(row);
    if (c.type === "list") out[c.key] = listOf(c, row?.[c.key]).filter((it) => itemFilled(c, it));
  });
  return out;
};

export const listText = (col, v) =>
  listOf(col, v).filter((it) => itemFilled(col, it))
    .map((it) => col.fields.map((f) => (f.type === "date" ? (it[f.key] ? fmtDate(it[f.key]) : "") : it[f.key])).filter((x) => String(x ?? "").trim()).join(" · "));

export const statusOf = (table, row, header) => (isRowEmpty(table, row) ? null : table.check ? table.check(withComputed(table, row), header) : null);

export function summarize(schema, payload) {
  let rows = 0, fails = 0, warns = 0;
  const header = { ...(payload.header || {}), reportDate: payload.reportDate };
  schema.tables.forEach((t) => (payload[t.key] || []).forEach((r) => {
    rows += 1;
    const s = statusOf(t, r, header);
    if (s?.level === "fail") fails += 1;
    else if (s?.level === "warn") warns += 1;
  }));
  return { rows, fails, warns };
}

/* ───────── rows still open on earlier sheets (e.g. a thaw over night) ─────────
   `openItems: { days, isOpen(row), label(row) }` on a table. Reads the sheets
   of the previous `days` days one by one (targeted, not a full list). */
export const shiftISO = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function matrixPatch(col, value, products) {
  if (!col?.matrix) return {};
  const hit = products.find((p) => p.name.trim().toLowerCase() === String(value || "").trim().toLowerCase());
  if (!hit) return {};
  const name = (c) => (c.key === "treeNuts" && hit.nutTypes ? `${c.en} (${hit.nutTypes})` : c.en);
  const c = containsOf(hit).map(name).join(", ");
  const m = mayContainOf(hit).map(name).join(", ");
  return { [col.matrix]: [c || "None", m && `may contain: ${m}`].filter(Boolean).join(" · ") };
}

/* ═════════════════════════ Saved sheets browser ═════════════════════════ */
/* The list loads one period, not the whole history: a daily log gains a sheet
   a day, and every sheet carries its full payload, so "load everything" grows
   without bound. Search, the month filter and "only with issues" work on the
   loaded period — widening the period is one click. */
export const PERIODS = [
  { months: 3, label: "Last 3 months" },
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
  { months: 0, label: "All time" },
];

export function periodStart(months) {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
