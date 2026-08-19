// src/utils/reportWindow.js
// 🕰️ Report visibility window — non-admins only see recent reports.
//
// Business rule (requested 2026-08-19):
//   • POS 10 / 11 / 15 / 19 branch reports → only the last 30 days by default.
//   • Returns reports (Browse Returns / Customer Returns / ENOC) → last 2 months.
//   • Admins, Full-Access accounts, and anyone granted the "history" operation
//     on that section see the FULL archive with no window at all.
//
// Enforcement is centralized in utils/authFetch.js: every `/api/reports?type=…`
// list read funnels through the global fetch wrapper, so trimming the returned
// rows here covers the Date Tree, the search index, exports and everything else
// in one place — no per-view edits, and non-matching report types are untouched.

import { can } from "./perms";

/* Which report types fall under a window, and how wide the window is.
   `section` is the crudPerms section whose "history" op lifts the window. */
const RULES = [
  {
    // POS 10 / 11 / 15 / 19 daily branch reports (pos10_*, pos11_*, pos15_*, pos19_*)
    test: (t) => /^pos(10|11|15|19)_/.test(t),
    section: "daily",
    days: 30,
  },
  {
    // Returns reports only (Browse Returns, Customer Returns, ENOC Returns)
    test: (t) =>
      t === "returns" ||
      t === "returns_changes" ||
      t === "returns_customers" ||
      t === "returns_customers_changes" ||
      t === "enoc_returns",
    section: "returns",
    months: 2,
  },
];

/** Returns the window rule for a report type, or null when the type is unwindowed. */
export function windowRuleForType(type) {
  const t = String(type || "");
  if (!t) return null;
  return RULES.find((r) => r.test(t)) || null;
}

/**
 * Can this user see the FULL history for a section (no window)?
 * `can()` already returns true for admins and Full-Access accounts, so this is
 * simply the "history" operation on the section.
 */
export function canSeeFullHistory(section) {
  return can(section, "history");
}

/* Today in the branch timezone (Asia/Dubai), as YYYY-MM-DD. */
function dubaiTodayISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** The earliest date a windowed report may have. Rows older than this are hidden. */
export function cutoffISOForRule(rule) {
  const today = dubaiTodayISO();
  const [y, m, d] = today.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  if (rule.months) base.setUTCMonth(base.getUTCMonth() - rule.months);
  else base.setUTCDate(base.getUTCDate() - (rule.days || 30));
  return base.toISOString().slice(0, 10);
}

/* Pull a comparable YYYY-MM-DD out of whatever date shape a row carries.
   Handles ISO (2026-08-19…), DMY (19/08/2026 or 19-08-2026), and finally a
   loose Date parse. Empty string means "no date found". */
function toISO(raw) {
  if (!raw) return "";
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})[/\-](\d{2})[/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function rowDateRaw(row) {
  const p = (row && row.payload) || row || {};
  return (
    p.reportDate ||
    p.date ||
    p.header?.reportDate ||
    p.header?.reportEntryDate ||
    p.meta?.entryDate ||
    row?.createdAt ||
    row?.created_at ||
    p.createdAt ||
    ""
  );
}

/** Keep only rows within the window (rows with no resolvable date are kept). */
export function filterRowsByWindow(type, rows) {
  if (!Array.isArray(rows)) return rows;
  const rule = windowRuleForType(type);
  if (!rule || canSeeFullHistory(rule.section)) return rows;
  const cutoff = cutoffISOForRule(rule);
  return rows.filter((row) => {
    const d = toISO(rowDateRaw(row));
    return !d || d >= cutoff;
  });
}
