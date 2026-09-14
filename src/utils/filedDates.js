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
//
// The cache lives in localStorage, not sessionStorage, because the view screen
// that deletes a day or moves it to another date is usually a SECOND TAB: a
// per-tab cache would leave the input screen warning about a day that no
// longer exists (and silent about the day it became). Writing it also fires a
// `storage` event in the other tabs, which is how they notice - see
// subscribeFiledDates.
// ---------------------------------------------------------------------------

import { listReportDates } from "../pages/monitor/branches/_shared/reportApi";

const TTL_MS = 10 * 60 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const cacheKey = (type) => `filed_dates_v2:${type}`;

function readCache(type) {
  try {
    const raw = localStorage.getItem(cacheKey(type));
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
    localStorage.setItem(cacheKey(type), JSON.stringify({ at: Date.now(), dates }));
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

/**
 * Drop a date the user just deleted, so the input screen stops claiming the
 * day is filed for the rest of the cache window.
 */
export function forgetFiledDate(type, date) {
  const d = String(date || "").slice(0, 10);
  if (!ISO_DAY.test(d)) return;
  const cached = readCache(type);
  if (!cached || !cached.includes(d)) return;
  writeCache(type, cached.filter((x) => x !== d));
}

/**
 * A report that changed its date: the old day is free again and the new one
 * is taken. Both halves matter - forgetting only one leaves the warning lying
 * in the opposite direction.
 */
export function moveFiledDate(type, fromDate, toDate) {
  const from = String(fromDate || "").slice(0, 10);
  const to = String(toDate || "").slice(0, 10);
  const cached = readCache(type);
  if (!cached) return; // nothing cached - the next read fetches the truth anyway
  let next = cached;
  if (ISO_DAY.test(from)) next = next.filter((x) => x !== from);
  if (ISO_DAY.test(to) && !next.includes(to)) next = [...next, to];
  writeCache(type, next);
}

/**
 * Call back whenever another tab changes this type's filed dates (a day
 * deleted or moved in the view screen while the input screen stays open).
 * Returns an unsubscribe function.
 */
export function subscribeFiledDates(type, onChange) {
  const key = cacheKey(type);
  const handler = (e) => {
    if (e.key !== null && e.key !== key) return; // a clear() sends key = null
    onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
