// src/pages/industry-kit/log/rows.js
// Pure helpers of the log-sheet engine: dates, blank rows, "is this row
// filled", computed columns and the per-row / per-sheet compliance status.
// No React here — the form, the sheet and the browser all share these.

const pad2 = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayISO = () => isoOf(new Date());

export const nowHHMM = () => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export const fmtDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return y && m && day ? `${day}/${m}/${y}` : d;
};

export const shiftISO = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoOf(d);
};

/** First day of the "last N months" window, or null for all time. */
export function periodStart(months) {
  if (!months) return null;
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return isoOf(d);
}

/* ───────── rows ───────── */
export const blankRow = (table) => Object.fromEntries(table.columns.map((c) => [c.key, c.type === "list" ? [] : ""]));
export const blankItem = (col) => Object.fromEntries(col.fields.map((f) => [f.key, f.type === "select" ? f.options[0] : ""]));

// A list item counts only when a TYPED field holds something (a pre-selected
// unit alone is not data).
export const itemFilled = (col, it) => col.fields.some((f) => f.type !== "select" && String(it?.[f.key] ?? "").trim());
export const listOf = (col, v) => (Array.isArray(v) ? v : []);

const cellFilled = (col, v) =>
  col.type === "list" ? listOf(col, v).some((it) => itemFilled(col, it)) : !!String(v ?? "").trim();

/** Auto-stamped and computed cells do not make a row "filled". */
export const isRowEmpty = (table, row) =>
  table.columns.every((c) => c.type === "computed" || c.autoNow || c.autoDate || !cellFilled(c, row?.[c.key]));

/** The row as it is saved: computed columns filled, empty list lines dropped. */
export const withComputed = (table, row) => {
  const out = { ...row };
  table.columns.forEach((c) => {
    if (c.type === "computed") out[c.key] = c.compute(row);
    if (c.type === "list") out[c.key] = listOf(c, row?.[c.key]).filter((it) => itemFilled(c, it));
  });
  return out;
};

export const listText = (col, v) =>
  listOf(col, v)
    .filter((it) => itemFilled(col, it))
    .map((it) => col.fields
      .map((f) => (f.type === "date" ? (it[f.key] ? fmtDate(it[f.key]) : "") : it[f.key]))
      .filter((x) => String(x ?? "").trim())
      .join(" · "));

export const statusOf = (table, row, header) =>
  isRowEmpty(table, row) ? null : table.check ? table.check(withComputed(table, row), header) : null;

/** Row count + how many rows fail / need review, for the list and the sheet. */
export function summarize(schema, payload) {
  let rows = 0;
  let fails = 0;
  let warns = 0;
  const header = { ...(payload.header || {}), reportDate: payload.reportDate };
  schema.tables.forEach((t) => (payload[t.key] || []).forEach((r) => {
    rows += 1;
    const s = statusOf(t, r, header);
    if (s?.level === "fail") fails += 1;
    else if (s?.level === "warn") warns += 1;
  }));
  return { rows, fails, warns };
}
