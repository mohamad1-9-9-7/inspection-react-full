// src/pages/labels/labelLog.js
//
// Reading the label print log from other screens (Product Traceability, the
// Mock Recall auto-trace) without loading the label page's barcode code.
// Record shape: type `label_print_log`, one record per day, payload.jobs[].

import API_BASE from "../../config/api";

export const LOG_TYPE = "label_print_log";

const ymd = (v) => String(v || "").slice(0, 10);

/**
 * Every print job of one item code between two days (inclusive, YYYY-MM-DD;
 * either may be empty = open). Newest first, each with its `day`.
 * Throws when the log can't be read — "not read" must never look like "none printed".
 */
export async function fetchLabelJobs({ code, from = "", to = "", signal } = {}) {
  const want = String(code || "").trim();
  if (!want) return [];
  const qs = new URLSearchParams({ type: LOG_TYPE, limit: "5000" });
  if (/^\d{4}-\d{2}-\d{2}$/.test(from)) qs.set("from", from);
  if (/^\d{4}-\d{2}-\d{2}$/.test(to)) qs.set("to", to);
  const res = await fetch(`${API_BASE}/api/reports?${qs}`, { signal, cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Label log read failed (${res.status})`);
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
  const out = [];
  rows.forEach((r) => {
    const day = ymd(r?.payload?.reportDate);
    (Array.isArray(r?.payload?.jobs) ? r.payload.jobs : []).forEach((j) => {
      if (String(j?.code || "").trim() === want) out.push({ ...j, day });
    });
  });
  return out.sort((a, b) => String(b.at || b.day).localeCompare(String(a.at || a.day)));
}

/** Jobs inside a window [from, until] (until empty = open), summed. */
export function summarizeLabelJobs(jobs, { from = "", until = "" } = {}) {
  const kept = (jobs || []).filter((j) => (!from || j.day >= from) && (!until || j.day <= until));
  const sites = new Set();
  const lots = new Set();
  let copies = 0;
  kept.forEach((j) => {
    copies += Number(j.copies) || 0;
    if (j.branch) sites.add(j.branch);
    if (j.lot) lots.add(j.lot);
  });
  return { jobs: kept, count: kept.length, copies, sites: [...sites], lots: [...lots] };
}
