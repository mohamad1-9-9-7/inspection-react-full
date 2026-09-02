// src/utils/filedDates.js
// ---------------------------------------------------------------------------
// "Does this day already have a report?" - for the input screens whose save
// REPLACES the record for a date rather than adding to it.
//
// Entering a day's sheet is normally a once-a-day job, so the answer is almost
// always no; the danger is a mistyped date landing on a day that was already
// filed and quietly wiping it. Warning about that must not cost anything, so:
//
//   * ONE `lite=1` read per report type per session - id + business date per
//     record, no payload. A few KB for an entire history.
//   * Every date the user then picks is answered from memory. No further
//     traffic, and nothing is downloaded from the day itself.
//
// listReportDates is the app's own helper: it resolves each row's date the way
// the server's BUSINESS_DATE expression does and falls back to created_at, so
// records written before `reportDate` existed still count as filed.
// ---------------------------------------------------------------------------

import { listReportDates } from "../pages/monitor/branches/_shared/reportApi";

const TTL_MS = 10 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const cacheKey = (type) => `filed_dates_v1:${type}`;

function readCache(type) {
  try {
    const raw = sessionStorage.getItem(cacheKey(type));
    if (!raw) return null;
    const { at, dates } = JSON.parse(raw);
    if (!Array.isArray(dates) || Date.now() - at >= TTL_MS) return null;
    return dates;
  } catch {
    return null; // unreadable cache - just refetch
  }
}

function writeCache(type, dates) {
  try {
    sessionStorage.setItem(cacheKey(type), JSON.stringify({ at: Date.now(), dates }));
  } catch {
    /* quota full - running without the cache is fine */
  }
}

/**
 * Every date that already carries a saved report of this type.
 * @param {string} type  the report type, e.g. "returns"
 * @returns {Promise<string[]>} YYYY-MM-DD, unique
 */
export async function fetchFiledDates(type) {
  const cached = readCache(type);
  if (cached) return cached;

  const rows = await listReportDates(type);
  const dates = Array.from(
    new Set(
      (Array.isArray(rows) ? rows : [])
        .map((r) => String(r?.reportDate || "").slice(0, 10))
        .filter((d) => ISO_DAY.test(d))
    )
  );
  writeCache(type, dates);
  return dates;
}

/**
 * Record a date this session just saved, so leaving the page and coming back
 * inside the cache window does not report the day as unfiled.
 */
export function rememberFiledDate(type, date) {
  const d = String(date || "").slice(0, 10);
  if (!ISO_DAY.test(d)) return;
  const cached = readCache(type);
  if (!cached || cached.includes(d)) return;
  writeCache(type, [...cached, d]);
}
