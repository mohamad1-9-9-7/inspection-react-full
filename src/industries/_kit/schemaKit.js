// src/industries/_kit/schemaKit.js
// Building blocks for the log-sheet schemas every kit industry is made of.
//
// A schema describes ONE report type = ONE sheet per day: a header, one or more
// tables of rows, and a check(row, header) per table that returns the row's
// compliance status. pages/industry-kit/log renders entry, view, edit and the
// exports from the schema alone — a new report is a new object, not a new page.
//
// Column types: text · number · time · date · select · computed · list
//   options  — select choices (or datalist suggestions for a text column)
//   autoNow  — time column stamped with the current time when the row starts
//   autoDate — date column stamped with the sheet's date when the row starts
//   compute  — computed column: (row) => display value (stored on save)
//   hint     — the limit, printed under the column title
//   fill     — (value, row) => patch applied when the cell changes
//   lookup   — { from: <type>, days, pick(row) → { value, label, patch } }
// table.carry     — keys copied by «Copy from last sheet» (lists repeated daily)
// table.openItems — { days, isOpen(row), label(row) } rows still open earlier
//
// Report types are always `<industry>_<key>` (see sheet() below): the prefix is
// what keeps one industry's data from ever being read by another, on top of the
// server's company_id scoping that separates two companies of the same industry.
//
// Limits follow the Dubai Municipality Food Code / Codex HACCP defaults.

export const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const minutesBetween = (a, b) => {
  if (!a || !b) return null;
  const [ah, am] = String(a).split(":").map(Number);
  const [bh, bm] = String(b).split(":").map(Number);
  if ([ah, am, bh, bm].some((x) => !Number.isFinite(x))) return null;
  let d = bh * 60 + bm - (ah * 60 + am);
  if (d < 0) d += 24 * 60; // crossed midnight
  return d;
};

/** Whole days from `fromISO` to `toISO` (negative = already past). */
export const daysBetween = (fromISO, toISO) => {
  if (!fromISO || !toISO) return null;
  const a = Date.parse(`${String(fromISO).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(toISO).slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(a) && Number.isFinite(b) ? Math.round((b - a) / 864e5) : null;
};

export const ok = (text = "OK") => ({ level: "ok", text });
export const warn = (text) => ({ level: "warn", text });
export const fail = (text) => ({ level: "fail", text });

export const firstIssue = (issues) =>
  issues.find((i) => i.level === "fail") || issues.find((i) => i.level === "warn") || ok();

/** A failure that already has a corrective action becomes "to review". */
export const withAction = (worst, action) =>
  worst.level === "fail" && String(action || "").trim() ? warn(`${worst.text} — action taken`) : worst;

export const YES_NO = ["Yes", "No"];
export const YES_NO_NA = ["Yes", "No", "N/A"];
export const PASS_FAIL = ["Pass", "Fail"];
export const OPEN_CLOSED = ["Open", "In Progress", "Closed"];
export const UNITS = ["kg", "g", "L", "pcs", "box", "tray", "carton", "pallet"];

export const COMMON_HEADER = [
  { key: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] },
  { key: "checkedBy", label: "Checked By" },
  { key: "verifiedBy", label: "Verified By (QA)" },
];

/** A "No" on any of these keys is a failure named by its label. */
export function failOnNo(r, pairs) {
  return pairs.filter(([k]) => r[k] === "No").map(([, label]) => fail(label));
}

/**
 * One schema = one report type. `ns` is the industry id; the stored type is
 * `${ns}_${key}` so no two industries can ever share a slug.
 */
export function sheet(ns, key, def) {
  if (!/^[a-z]+$/.test(ns)) throw new Error(`[industry kit] bad industry id "${ns}"`);
  return {
    header: COMMON_HEADER,
    ...def,
    key,
    type: `${ns}_${key}`,
    reporter: ns,
    title: def.title || `${def.label} Log`,
  };
}
