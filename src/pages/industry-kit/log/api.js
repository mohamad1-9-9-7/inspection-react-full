// src/pages/industry-kit/log/api.js
// Server calls of the log-sheet engine. Reads go through the shared
// reportApi helpers (targeted per-day and per-period reads, never the whole
// history); writes are here so every one of them passes assertOwnType first.
//
// One sheet per (company, type, day): the server keeps a unique reportDate per
// type, so saving a day that already has a sheet updates it by id (PUT) —
// and a 409 (someone filed that day meanwhile) re-targets their sheet.

import API_BASE from "../../../config/api";
import { reportDateOf, reportId } from "../../monitor/branches/_shared/reportApi";
import { assertOwnType } from "../kitType";

const REPORTS_URL = `${String(API_BASE).replace(/\/$/, "")}/api/reports`;
const credentials = (() => {
  try { return new URL(API_BASE).origin === window.location.origin ? "include" : "omit"; } catch { return "omit"; }
})();

const readJson = async (res) => {
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || json?.items || [];
};

/** The sheet of one day, or null — ONE targeted request. Kit sheets always
 *  store a plain YYYY-MM-DD reportDate, so the server's matcher never misses
 *  and there is no whole-history fallback scan (unlike the legacy helper). */
export async function getSheetByDate(type, date, { signal } = {}) {
  assertOwnType(type);
  const qs = new URLSearchParams({ type, reportDate: String(date).slice(0, 10) });
  const res = await fetch(`${REPORTS_URL}?${qs}`, { cache: "no-store", credentials, headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const want = String(date).slice(0, 10);
  return (await readJson(res)).find((r) => reportDateOf(r) === want) || null;
}

/** Every sheet of a type between two days (inclusive) — ONE ranged request. */
export async function listSheets(type, { from, to, signal } = {}) {
  assertOwnType(type);
  const qs = new URLSearchParams({ type });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await fetch(`${REPORTS_URL}?${qs}`, { cache: "no-store", credentials, headers: { Accept: "application/json" }, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await readJson(res))
    .filter((r) => { const d = reportDateOf(r); return (!from || d >= from) && (!to || d <= to); })
    .sort((a, b) => reportDateOf(b).localeCompare(reportDateOf(a)));
}

/** Create or update the sheet of `payload.reportDate`; returns the saved row. */
export async function saveSheet(schema, payload, existingId) {
  assertOwnType(schema.type);
  const body = JSON.stringify({ reporter: schema.reporter, type: schema.type, payload });
  const send = (id) => fetch(id ? `${REPORTS_URL}/${encodeURIComponent(id)}` : REPORTS_URL, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    credentials,
    body,
  });

  let id = existingId;
  let res = await send(id);
  if (res.status === 409) {
    const row = await getSheetByDate(schema.type, payload.reportDate);
    id = row ? reportId(row) : null;
    if (!id) throw new Error("Sheet exists but could not be found");
    res = await send(id);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => null);
  return { saved: json?.report || null, id };
}

export async function deleteSheet(schema, record) {
  assertOwnType(schema.type);
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(reportId(record))}`, { method: "DELETE", credentials });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
