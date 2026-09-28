// src/pages/monitor/branches/qcs/coolersSave.js
// Saving the QCS coolers sheet: one record per date. Used by CoolersTab when
// online, and by the offline outbox when a save made without a connection is
// sent later — so this file stays small and is imported at app start
// (the tab itself is lazy-loaded).
//
// Safe to run twice: it looks the date up and UPDATEs that record, and
// creates one only when the date has none. A save that did reach the server
// before the connection dropped therefore never turns into a duplicate.

import API_BASE from "../../../../config/api";
import { getReportRowByDate, reportId } from "../_shared/reportApi";
import { registerOutboxHandler } from "../../../../utils/offlineOutbox";

export const COOLERS_TYPE = "qcs-coolers";
export const COOLERS_OUTBOX_KIND = "qcs-coolers";

const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; }
})();

/** Sends one coolers sheet. Throws an Error carrying `.status` on an HTTP
    failure, and the fetch's own error (TypeError / AbortError) when the
    server was not reached. */
export async function saveCoolersRecord(body, { signal } = {}) {
  const date = body?.payload?.reportDate;
  if (!date) throw new Error("Missing report date");
  // Throws when the lookup cannot complete — never answers "no record" on a
  // failed read, which would create a second record for the date.
  const row = await getReportRowByDate(COOLERS_TYPE, date, { signal });
  const id = row ? reportId(row) : null;
  const res = await fetch(id ? `${API_BASE}/api/reports/${encodeURIComponent(id)}` : `${API_BASE}/api/reports`, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = new Error((await res.text().catch(() => "")) || `Failed to save coolers report (${res.status})`);
    err.status = res.status;
    throw err;
  }
}

registerOutboxHandler(COOLERS_OUTBOX_KIND, (body) => saveCoolersRecord(body));
