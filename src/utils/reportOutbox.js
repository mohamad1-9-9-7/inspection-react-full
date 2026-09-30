// src/utils/reportOutbox.js
// One save for report forms that keeps working without a connection.
//
//   const r = await saveReport({ body, label })                 create (POST)
//   const r = await saveReport({ body, id, label })             update record `id` (PUT)
//   const r = await saveReport({ body, byDate: { type, date }, label })
//                                         the date's record: update it, or create it
//   r = { queued: false, report }   the server has it
//   r = { queued: true }            no connection: kept on this device and sent
//                                   later by the outbox (utils/offlineOutbox.js)
//
// Other failures throw as before (err.status = the HTTP status), so a form's
// existing error messages keep working.
//
// Every replay is safe to run twice:
//  • PUT :id overwrites the same record;
//  • byDate looks the date up again at send time;
//  • a create carries payload._outboxId, and the server turns a second POST
//    with the same id into an update of the record the first one made.
// Photos taken offline (blob: URLs, see keepPhotoOrUpload) are uploaded
// before the report is sent, online or on replay.

import API_BASE from "../config/api";
import { getReportRowByDate, payloadOf, reportId } from "../pages/monitor/branches/_shared/reportApi";
import { uploadImage } from "./imageUpload";
import {
  enqueue, getKeptPhoto, isKeptPhoto, isTransient, markKeptPhotoUploaded, registerOutboxHandler,
} from "./offlineOutbox";

const KIND = "report";
const SAVE_TIMEOUT_MS = 25_000;   // a request still hanging after this is treated as "no connection"
const REPLAY_TIMEOUT_MS = 60_000;

const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; }
})();

/** A form that stays open after saving a NEW record passes the same id on
    every save of that sheet (body.payload._outboxId), so saving it twice
    offline, or again after the first save landed, keeps it one record. */
export const newOutboxId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* ── photos kept offline → hosted URLs ─────────────────────── */
async function resolveKeptPhotos(value) {
  if (isKeptPhoto(value)) {
    const rec = await getKeptPhoto(value).catch(() => null);
    if (!rec) return undefined; // gone from this device (cleared): the report goes without it
    if (rec.uploadedUrl) return rec.uploadedUrl;
    const url = await uploadImage(rec.blob);
    await markKeptPhotoUploaded(value, url).catch(() => {});
    return url;
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const v of value) {
      const r = await resolveKeptPhotos(v);
      if (r !== undefined) out.push(r);
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const r = await resolveKeptPhotos(v);
      out[k] = r === undefined ? "" : r;
    }
    return out;
  }
  return value;
}

/* ── one send ──────────────────────────────────────────────── */
async function request(url, method, body, signal) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = text;
    try { const j = JSON.parse(text); msg = j.message || j.error || text; } catch { /* plain text */ }
    const err = new Error(msg || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json().catch(() => null);
  return json?.report || json?.data || json || null;
}

/** spec = { body, id?, byDate?: { type, date, merge? } } */
async function send(spec, signal) {
  const body = await resolveKeptPhotos(spec.body);
  let report;
  if (spec.id) {
    report = await request(`${API_BASE}/api/reports/${encodeURIComponent(spec.id)}`, "PUT", body, signal);
  } else if (spec.byDate) {
    const { type, date, merge } = spec.byDate;
    // Throws when the lookup cannot finish, never answers "none" on a failed
    // read — that would create a second record for the date.
    const row = await getReportRowByDate(type, date, { signal });
    const id = row ? reportId(row) : null;
    let out = body;
    if (row && merge) {
      // The form only owns some fields of the day's record: keep the rest.
      const old = payloadOf(row) || {};
      out = { ...body, payload: { ...old, ...body.payload, headers: { ...(old.headers || {}), ...(body.payload?.headers || {}) } } };
    }
    report = id
      ? await request(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, "PUT", out, signal)
      : await request(`${API_BASE}/api/reports`, "POST", out, signal);
  } else {
    report = await request(`${API_BASE}/api/reports`, "POST", body, signal);
  }
  return report;
}

async function withTimeout(ms, fn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); } finally { clearTimeout(t); }
}

/** One send of a spec ({ body, id?, byDate? }) with kept photos uploaded
    first — for a page that queues under its OWN outbox kind because its replay
    must check something before sending (e.g. a duplicate employee number). */
export const sendReportSpec = (spec, timeoutMs = REPLAY_TIMEOUT_MS) =>
  withTimeout(timeoutMs, (signal) => send(spec, signal));

registerOutboxHandler(KIND, (spec) => withTimeout(REPLAY_TIMEOUT_MS, (signal) => send(spec, signal)));
// Coolers sheets queued by the first version (qcs-coolers only) replay the same way.
registerOutboxHandler("qcs-coolers", (body) =>
  withTimeout(REPLAY_TIMEOUT_MS, (signal) => send({ body, byDate: { type: "qcs-coolers", date: body?.payload?.reportDate } }, signal)));

/** Saves a report now, or keeps it on this device when there is no connection. */
export async function saveReport({ body, id = null, byDate = null, label = "" }) {
  let spec = { body, id, byDate };
  if (!id && !byDate) {
    const payload = { ...(body?.payload || {}) };
    if (!payload._outboxId) payload._outboxId = newOutboxId();
    spec = { ...spec, body: { ...body, payload } };
  }
  try {
    const report = await withTimeout(SAVE_TIMEOUT_MS, (signal) => send(spec, signal));
    return { queued: false, report };
  } catch (err) {
    if (!isTransient(err)) throw err;
    const key = id
      ? `put:${id}`
      : byDate
        ? `date:${byDate.type}:${byDate.date}`
        : `new:${spec.body.payload._outboxId}`;
    try {
      await enqueue(KIND, key, spec, label || spec.body?.type || "Report");
    } catch {
      const e = new Error("No connection, and this device could not keep the report. It is still on screen — save again when you are back online.");
      e.status = 0;
      throw e;
    }
    return { queued: true };
  }
}

/** The message a form shows when its save was kept on the device. */
export function queuedMessage(lang = "en") {
  return lang === "ar"
    ? "📴 لا يوجد اتصال — حُفظ التقرير على هذا الجهاز وسيُرسل تلقائيًا عند عودة الاتصال."
    : "📴 No connection — the report is kept on this device and will be sent automatically when the connection is back.";
}
