// src/pages/monitor/branches/sweets/sweetsRecord.js
//
// Record-key helpers for sweets reports that can happen SEVERAL times a day
// (a rejected product, a pest-control visit, a training session…).
//
// The server keeps one row per (company, type, payload.reportDate). A form that
// writes the plain day into reportDate therefore gets 409 on the second record
// of the day. Event-style forms instead store:
//   payload.date       = "YYYY-MM-DD"               ← the business day (shown, filtered)
//   payload.reportDate = "YYYY-MM-DDTHH:mm:ss.sssZ" ← unique key for the index
// The server's business-date expression reads payload.date first, so calendars
// and ?from/&to ranges keep working on the plain day.
//
// Daily sheets (one per day: hygiene, cleanliness, coolers, daily logs) keep a
// plain-day reportDate on purpose — re-opening the day's sheet is the feature.

import { getActiveCompany } from "../../../../utils/companyContext";

/** Unique reportDate for an event on `day` (YYYY-MM-DD). */
export function eventReportDate(day) {
  const d = String(day || "").slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `${d}T${new Date().toISOString().slice(11)}`;
}

/** The business day of any sweets payload, old or new shape. */
export function businessDateOf(p) {
  return String(p?.date || p?.reportDate || "").slice(0, 10);
}

/** English half of a legacy bilingual option ("Destroyed / إتلاف" → "Destroyed").
 *  Early sweets forms stored both languages in one value; screens are
 *  single-language, so they show only this part. */
export function enLabel(v) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  const i = s.indexOf(" / ");
  return i > 0 && /[؀-ۿ]/.test(s.slice(i + 3)) ? s.slice(0, i).trim() : s;
}

/** localStorage key scoped to the active company. Every sweets cache must go
 *  through this: a super-admin switching companies must never be served the
 *  previous company's cached names, units or settings. */
export function companyScopedKey(base) {
  let id = "";
  try { id = getActiveCompany()?.id ?? ""; } catch { /* no company picked */ }
  return `${base}:${id || "own"}`;
}
