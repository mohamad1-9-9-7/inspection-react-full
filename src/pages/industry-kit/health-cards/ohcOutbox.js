// src/pages/industry-kit/health-cards/ohcOutbox.js
// Saving a kit OHC card with or without a connection.
//
// An OHC card must not repeat an employee number, and that check needs the
// server. So a card saved offline waits in the outbox under its OWN kind
// ("kit-ohc", registered in ../log/outboxReplay.js) whose replay runs the
// duplicate check first: a duplicate is set aside as "failed" with a clear
// message in the outbox bar instead of being filed twice. A photo taken
// offline travels as a blob: URL and is uploaded just before the card is sent
// (utils/reportOutbox.sendReportSpec).

import API_BASE from "../../../config/api";
import { enqueue, isTransient } from "../../../utils/offlineOutbox";
import { newOutboxId, sendReportSpec } from "../../../utils/reportOutbox";

export const OHC_OUTBOX_KIND = "kit-ohc";
const SAVE_TIMEOUT_MS = 25_000;

async function listJson(url, signal) {
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json().catch(() => null);
  const arr = Array.isArray(data) ? data
    : Array.isArray(data?.items) ? data.items
      : Array.isArray(data?.data?.items) ? data.data.items
        : Array.isArray(data?.data) ? data.data
          : Array.isArray(data?.rows) ? data.rows : [];
  return arr;
}

/**
 * The saved card holding this employee number, or null. Throws when the
 * server cannot be reached (the caller decides what "unknown" means).
 */
export async function findOhcByAppNo(type, appNo, { signal } = {}) {
  const want = String(appNo || "").trim();
  const rows = await listJson(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=1000&sort=-createdAt`,
    signal,
  );
  return rows
    .filter((x) => !x?.type || x.type === type)
    .find((x) => String((x.payload || x)?.appNo || "").trim() === want) || null;
}

function duplicateError(appNo) {
  const e = new Error(`Duplicate Employee Number "${appNo}" — a card with this number already exists. · الرقم الوظيفي مكرر.`);
  e.status = 409;
  return e;
}

/** The replay of a card kept offline: duplicate check, then the send. */
export async function replayOhc(spec) {
  const p = spec.body.payload;
  const hit = await findOhcByAppNo(spec.body.type, p.appNo);
  if (hit) {
    // The first send landed but its answer was lost: it is already saved.
    if ((hit.payload || hit)?._outboxId === p._outboxId) return hit;
    throw duplicateError(p.appNo);
  }
  return sendReportSpec(spec);
}

/**
 * Saves the card now, or keeps it on this device.
 *   → { queued: false, report }   the server has it
 *   → { queued: true }            no connection: sent later
 * Non-connection failures throw (err.status = the HTTP status).
 */
export async function saveOhc({ reporter, type, payload }) {
  const spec = { body: { reporter, type, payload: { ...payload, _outboxId: payload._outboxId || newOutboxId() } } };
  try {
    const report = await sendReportSpec(spec, SAVE_TIMEOUT_MS);
    return { queued: false, report };
  } catch (err) {
    if (!isTransient(err)) throw err;
    try {
      await enqueue(OHC_OUTBOX_KIND, `new:${spec.body.payload._outboxId}`, spec, `OHC — ${payload.name || payload.appNo}`);
    } catch {
      const e = new Error("No connection, and this device could not keep the card. It is still on screen — save again when you are back online.");
      e.status = 0;
      throw e;
    }
    return { queued: true };
  }
}
