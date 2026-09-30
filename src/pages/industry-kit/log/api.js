// src/pages/industry-kit/log/api.js
// Server calls of the log-sheet engine. Reads go through the shared
// reportApi helpers (targeted per-day and per-period reads, never the whole
// history); writes are here so every one of them passes assertOwnType first.
//
// One sheet per (company, type, day): the server keeps a unique reportDate per
// type, so saving a day that already has a sheet updates it by id (PUT) —
// and a 409 (someone filed that day meanwhile) adds the rows to their sheet.
// Without a connection a save waits in the offline outbox (utils/offlineOutbox)
// and is sent when the connection is back.

import API_BASE from "../../../config/api";
import { reportDateOf, reportId } from "../../monitor/branches/_shared/reportApi";
import { assertOwnType } from "../kitType";
import { kitSchemaByType } from "../../../industries/_kit/kitRegistry";
import { enqueue, isTransient, registerOutboxHandler } from "../../../utils/offlineOutbox";
import { newOutboxId } from "../../../utils/reportOutbox";
import { summarize } from "./rows";

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

/* ── saving (online now, or later from the offline outbox) ──────────────── */

const OUTBOX_KIND = "kit-sheet";
const SAVE_TIMEOUT_MS = 25_000;   // still hanging after this = no connection
const REPLAY_TIMEOUT_MS = 60_000;

async function request(url, method, body, signal) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json().catch(() => null);
  return json?.report || null;
}

/* A sheet saved WITHOUT knowing the day's server copy (a new day, or a day
   that could not be loaded offline) that finds one at send time is ADDED to
   it instead of replacing it: another device may have filed rows meanwhile.
   `_merged` remembers which saves are already in, so a replay that runs twice
   (the first PUT landed but its answer was lost) never adds the rows again. */
function mergeInto(row, payload) {
  const old = row?.payload || {};
  const done = Array.isArray(old._merged) ? old._merged : [];
  if (payload._outboxId && done.includes(payload._outboxId)) return null;
  const schema = kitSchemaByType(row.type) || null;
  const keys = schema ? schema.tables.map((t) => t.key) : Object.keys(payload).filter((k) => Array.isArray(payload[k]));
  const header = { ...(old.header || {}) };
  Object.entries(payload.header || {}).forEach(([k, v]) => { if (String(v ?? "").trim()) header[k] = v; });
  const out = {
    ...old,
    header,
    notes: [old.notes, payload.notes].filter((n) => String(n || "").trim()).join("\n"),
    savedAt: payload.savedAt,
    _merged: [...done, payload._outboxId].filter(Boolean).slice(-50),
  };
  keys.forEach((k) => { out[k] = [...(old[k] || []), ...(payload[k] || [])]; });
  if (schema) out.summary = summarize(schema, out);
  return out;
}

/** spec = { type, reporter, payload, id } — the one send, used live and on replay. */
async function sendSheet(spec, signal) {
  assertOwnType(spec.type);
  const body = { reporter: spec.reporter, type: spec.type, payload: spec.payload };
  if (spec.id) return { saved: await request(`${REPORTS_URL}/${encodeURIComponent(spec.id)}`, "PUT", body, signal), id: spec.id };
  try {
    const saved = await request(REPORTS_URL, "POST", body, signal);
    return { saved, id: saved ? reportId(saved) : null };
  } catch (e) {
    if (e.status !== 409) throw e;
    // Someone filed that day meanwhile: add these rows to their sheet.
    const row = await getSheetByDate(spec.type, spec.payload.reportDate, { signal });
    const id = row ? reportId(row) : null;
    if (!id) throw new Error("Sheet exists but could not be found");
    const merged = mergeInto(row, spec.payload);
    if (!merged) return { saved: row, id };
    return { saved: await request(`${REPORTS_URL}/${encodeURIComponent(id)}`, "PUT", { ...body, payload: merged }, signal), id };
  }
}

async function withTimeout(ms, fn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); } finally { clearTimeout(t); }
}

/** Sends one sheet kept offline — called by ./outboxReplay.js, which App.jsx
 *  registers at start-up so a waiting sheet goes out even if its page is
 *  never opened again. */
export const replaySheet = (spec) => withTimeout(REPLAY_TIMEOUT_MS, (signal) => sendSheet(spec, signal));
registerOutboxHandler(OUTBOX_KIND, replaySheet);

/**
 * Create or update the sheet of `payload.reportDate`.
 *   → { saved, id }        the server has it
 *   → { queued: true }     no connection: kept on this device, sent later
 * `outboxId` is the form's own id for a NEW sheet; passing the same one on
 * every save of that sheet keeps it one record however often it is sent.
 */
export async function saveSheet(schema, payload, existingId, outboxId = null) {
  assertOwnType(schema.type);
  const spec = {
    type: schema.type,
    reporter: schema.reporter,
    id: existingId || null,
    payload: existingId ? payload : { ...payload, _outboxId: outboxId || newOutboxId() },
  };
  try {
    return await withTimeout(SAVE_TIMEOUT_MS, (signal) => sendSheet(spec, signal));
  } catch (err) {
    if (!isTransient(err)) throw err;
    const key = spec.id ? `put:${spec.id}` : `date:${spec.type}:${payload.reportDate}`;
    try {
      await enqueue(OUTBOX_KIND, key, spec, `${schema.label} — ${payload.reportDate}`);
    } catch {
      throw new Error("No connection, and this device could not keep the sheet. It is still on screen — save again when you are back online.");
    }
    return { queued: true };
  }
}

export async function deleteSheet(schema, record) {
  assertOwnType(schema.type);
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(reportId(record))}`, { method: "DELETE", credentials });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
