// src/pages/monitor/branches/pos19/_shared/reportsApi.js
// ───────────────────────────────────────────────────────────────────────────
// Single access point for POS 19 report reads/writes.
//
// Why this exists: every view used to call `GET /api/reports?type=X` two or
// three times per open, each call dragging the whole table (payloads included)
// across the wire just to pick one row out of it — and the server's default
// `LIMIT 200` silently hid anything older than the last 200 records.
//
// Instead we fetch a lightweight index once — { id, reportDate } per record,
// no payload — and then pull only the record the user actually opens, by id.
//
// The index request sends `dates=1&lite=1&limit=5000` together on purpose:
//   • a server with the `dates=1` branch answers unbounded, ideal
//   • an older server ignores `dates` but honours `lite=1`, which returns the
//     very same { id, reportDate } columns (capped at `limit`)
//   • a server that honours neither returns full rows, and we derive the index
//     from `payload.reportDate`
// All three shapes normalise to the same thing, so views work either way.
//
// Reads are keyed by DATE, never by a remembered id: ids change whenever a
// record is re-created, so the index is rebuilt on every load and the row we
// hand back is always re-checked against the date that was asked for.
// ───────────────────────────────────────────────────────────────────────────

import API_BASE from "../../../../../config/api";

const REPORTER = "pos19";
const INDEX_TTL_MS = 60_000;
const MAX_ROWS = 5000; // the server clamps `limit` to this

/** type → { at, entries: [{ reportDate, id }], byDate: Map } */
const indexCache = new Map();

const unwrap = (data) => (Array.isArray(data) ? data : data?.data ?? []);

async function getJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Row id, tolerating both the Postgres (`id`) and legacy Mongo (`_id`) shapes. */
export const reportId = (r) => r?.id ?? r?._id ?? null;

const rowDate = (r) => r?.reportDate ?? r?.payload?.reportDate ?? null;

/** Drop the memoised index for a type — call after any write. */
export function invalidateReportDates(type) {
  indexCache.delete(type);
}

/**
 * `[{ reportDate, id }]` for every saved record of this type, newest first.
 * One small request; memoised for INDEX_TTL_MS.
 */
async function loadIndex(type, { force = false } = {}) {
  const hit = indexCache.get(type);
  if (!force && hit && Date.now() - hit.at < INDEX_TTL_MS) return hit;

  const data = await getJSON(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}` +
      `&dates=1&lite=1&limit=${MAX_ROWS}`
  );

  const byDate = new Map();
  for (const row of unwrap(data)) {
    const reportDate = typeof row === "string" ? row : rowDate(row);
    if (!reportDate) continue;
    // Rows arrive newest-first; the first sighting of a date wins.
    if (!byDate.has(reportDate)) byDate.set(reportDate, reportId(row));
  }

  const entries = [...byDate.entries()]
    .map(([reportDate, id]) => ({ reportDate, id }))
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  const built = { at: Date.now(), entries, byDate };
  indexCache.set(type, built);
  return built;
}

/** Every reportDate that has a saved record of this type, newest first. */
export async function listReportDates(type, { force = false } = {}) {
  const { entries } = await loadIndex(type, { force });
  return entries.map((e) => e.reportDate);
}

/** The single record stored for this (type, reportDate), or null. */
export async function getReportByDate(type, reportDate) {
  if (!reportDate) return null;

  const { byDate } = await loadIndex(type);
  if (!byDate.has(reportDate)) return null;

  const id = byDate.get(reportDate);
  if (id != null) {
    const body = await getJSON(`${API_BASE}/api/reports/${encodeURIComponent(id)}`);
    const row = body?.report ?? (Array.isArray(body) ? body[0] : body);
    // Never trust the row blindly: a stale id could resolve to another date.
    if (row && rowDate(row) === reportDate) return row;
  }

  // No id in the index, or the id pointed elsewhere — ask by date and verify.
  const data = await getJSON(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}` +
      `&reportDate=${encodeURIComponent(reportDate)}&limit=${MAX_ROWS}`
  );
  return unwrap(data).find((r) => rowDate(r) === reportDate) ?? null;
}

/** Cheap "is this date already used?" — answered from the cached index. */
export async function isDateTaken(type, reportDate, { force = false } = {}) {
  if (!reportDate) return false;
  const { byDate } = await loadIndex(type, { force });
  return byDate.has(reportDate);
}

export class DuplicateReportDateError extends Error {
  constructor(reportDate) {
    super(`A report already exists for ${reportDate}`);
    this.name = "DuplicateReportDateError";
    this.code = 409;
    this.reportDate = reportDate;
  }
}

/**
 * Create (POST) or update (PUT /:id) — never DELETE-then-POST, which loses the
 * record outright if the POST leg fails. Returns the saved row's id.
 */
export async function saveReport({ type, id, payload, reporter = REPORTER }) {
  const res = await fetch(
    id
      ? `${API_BASE}/api/reports/${encodeURIComponent(id)}`
      : `${API_BASE}/api/reports`,
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reporter, type, payload }),
    }
  );

  if (res.status === 409) throw new DuplicateReportDateError(payload?.reportDate);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const body = await res.json().catch(() => null);
  // POST/PUT answer `{ ok, report: {…} }`; older handlers answered the row itself.
  const row = body?.report ?? body;

  invalidateReportDates(type);
  return { id: reportId(row) ?? id ?? null, row };
}

export async function deleteReport(type, id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  invalidateReportDates(type);
}
