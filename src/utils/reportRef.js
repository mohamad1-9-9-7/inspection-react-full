// src/utils/reportRef.js
// 🔖 Human-readable reference numbers for saved reports — AM-CND-000142.
//
// The number itself is allocated by the SERVER (routes/reports.cjs) from an
// atomic per-type counter and stored as `payload.refNo`, so it is immutable
// and unique for all time. This module is the read side: one place that knows
// how to pull a reference off a record and how to format one.
//
// Records saved before the feature existed have no stored refNo. Rather than
// render a blank cell, `getRefNo()` falls back to a deterministic derived
// reference marked with "~" so it is never mistaken for an allocated one.
// Running the backfill tool in Settings replaces those with real numbers.

/** Report types that carry a reference. Must match REF_PREFIX on the server. */
export const REF_PREFIX = {
  destruction_record: "CND",
  returns: "RET",
  returns_customers: "CRT",
};

export const REF_PAD = 6;

/** Build a reference from a prefix and a counter value. */
export function formatRef(prefix, n) {
  return `AM-${prefix}-${String(n).padStart(REF_PAD, "0")}`;
}

/** Is this a real, server-allocated reference (vs a derived placeholder)? */
export function isAllocatedRef(ref) {
  return typeof ref === "string" && /^AM-[A-Z]{3}-\d+$/.test(ref.trim());
}

/** Pull the counter out of a reference, or null. Used for sorting. */
export function refSeq(ref) {
  const m = String(ref || "").match(/^AM-[A-Z]{3}-(\d+)$/);
  return m ? Number(m[1]) : null;
}

/** Placeholder for records that predate reference numbers. */
function derivedRef(type, reportDate) {
  const prefix = REF_PREFIX[type] || "REP";
  const d = String(reportDate || "").slice(0, 10);
  return d ? `~${prefix}-${d}` : "";
}

/**
 * The reference to display for an API record.
 *
 * @param {object} record  Raw API record, or anything carrying { payload }.
 * @param {string} [type]  Report type, when the record doesn't carry one
 *                         (browse pages normalize records down to the payload).
 */
export function getRefNo(record, type) {
  if (!record) return "";

  const payload = record.payload || record;
  const stored = payload?.refNo;
  if (typeof stored === "string" && stored.trim()) return stored.trim();

  const t = type || record.type || record.reportType || "";
  return derivedRef(t, payload?.reportDate || record.reportDate);
}

/** True when the reference is a derived placeholder awaiting backfill. */
export function isPendingRef(ref) {
  return typeof ref === "string" && ref.startsWith("~");
}

/* ── Backfill (Settings admin tool) ───────────────────────────────────────── */

/**
 * Ask the server to assign references to a type's existing records.
 * Pass dryRun to preview the assignments without writing anything.
 *
 * @returns {Promise<{ok, type, dryRun, total, alreadyHadRef, assigned, preview}>}
 */
export async function backfillRefs(apiBase, type, { dryRun = true } = {}) {
  const url =
    `${String(apiBase).replace(/\/$/, "")}/api/reports/backfill-refs` +
    `?type=${encodeURIComponent(type)}${dryRun ? "&dryRun=1" : ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: "{}",
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.message || data?.error || `Backfill failed (${res.status})`);
  }
  return data;
}
