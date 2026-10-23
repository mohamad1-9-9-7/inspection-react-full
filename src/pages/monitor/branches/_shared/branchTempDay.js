// src/pages/monitor/branches/_shared/branchTempDay.js
//
// The branch temperature sheets (POS 10/11/15 "coolers" grid, POS 19
// "entries") and the phone QR entry write to the SAME day record. Before the
// QR entry the sheets refused a date that already had a record; now a phone
// reading usually creates that record first, so a sheet:
//   • opens the day's saved record when its date is picked (loadDay*), and
//   • saves by UPDATING it (saveBranchDay), after pulling in the phone
//     readings it has not seen yet — so a sheet save never wipes them, and a
//     reading the user cleared on the sheet does not come back
//     (same rule as the QCS sheet, see qcs/coolerQuick.js mergeServerDay).

import { getReportRowByDate, payloadOf, reportId } from "./reportApi";
import { saveReport } from "../../../../utils/reportOutbox";
import { quickIdsOf } from "../qcs/coolerQuick";
import { isTransient } from "../../../../utils/offlineOutbox";

export { quickIdsOf };

const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const filled = (v) => v !== "" && v != null && String(v).trim() !== "";
const hasAnyGrid = (rows) => (rows || []).some((r) => Object.entries(r?.temps || {}).some(([k, v]) => k !== "Corrective Action" && filled(v)));
const hasAnyPos19 = (rows) => (rows || []).some((r) => ["am", "pm", "ev"].some((k) => filled(r?.[`${k}_temp`])));

/* ── phone readings → sheet rows (only ids not in `seen`) ─────────────── */
export function mergePhone(shape, rows, server, seen = new Set()) {
  const log = Array.isArray(server?.quickReadings) ? server.quickReadings : [];
  const out = (rows || []).map((r) => (shape === "grid" ? { ...r, temps: { ...(r?.temps || {}) } } : { ...r }));
  let changed = 0;
  log.forEach((q) => {
    if (!q || !q.id || seen.has(q.id)) return;
    const nameKey = shape === "grid" ? "name" : "equipment";
    let row = out.find((r) => sameName(r[nameKey], q.unit));
    if (!row) {
      // A unit the phone added: copy the server's row (it has the right shape).
      const list = shape === "grid" ? server?.coolers : server?.entries;
      const src = (Array.isArray(list) ? list : []).find((r) => sameName(r?.[nameKey], q.unit));
      if (!src) return;
      row = shape === "grid" ? { ...src, temps: {} , remarks: "" } : { ...src, am_temp: "", pm_temp: "", ev_temp: "", correctiveAction: "" };
      out.push(row);
    }
    if (q.kind !== "recheck") {
      if (shape === "grid") {
        if (!filled(row.temps[q.slot])) { row.temps[q.slot] = String(q.value); changed += 1; }
      } else if (!filled(row[`${q.slot}_temp`])) {
        row[`${q.slot}_temp`] = String(q.value);
        if (q.timeHM) row[`${q.slot}_time`] = q.timeHM;
        changed += 1;
      }
    }
    if (q.remarkLine) {
      const field = shape === "grid" ? "remarks" : "correctiveAction";
      if (!String(row[field] || "").includes(q.remarkLine)) {
        row[field] = [row[field], q.remarkLine].filter(Boolean).join(" | ");
        if (shape === "grid") row.temps["Corrective Action"] = row.remarks;
        changed += 1;
      }
    }
  });
  return { rows: out, changed, seenIds: new Set([...seen, ...quickIdsOf(server)]) };
}

/**
 * What the sheet should show once its date has a saved record.
 * Rows typed on screen before the date was picked are kept and the saved
 * values fill the gaps; with nothing typed the saved rows are used as-is.
 * Returns { rows, fields } — fields = the saved top-level values (checkedBy…).
 */
export function loadDay(shape, localRows, server) {
  const savedRows = (shape === "grid" ? server?.coolers : server?.entries) || [];
  const typed = shape === "grid" ? hasAnyGrid(localRows) : hasAnyPos19(localRows);
  if (!typed) return { rows: savedRows, typed };
  const nameKey = shape === "grid" ? "name" : "equipment";
  const out = (localRows || []).map((r) => {
    const s = savedRows.find((x) => sameName(x?.[nameKey], r?.[nameKey]));
    if (!s) return r;
    if (shape === "grid") {
      const temps = { ...(s.temps || {}) };
      Object.entries(r.temps || {}).forEach(([k, v]) => { if (filled(v)) temps[k] = v; });
      return { ...s, ...r, temps, remarks: filled(r.remarks) ? r.remarks : s.remarks || "" };
    }
    const merged = { ...s };
    Object.entries(r).forEach(([k, v]) => { if (filled(v)) merged[k] = v; });
    return merged;
  });
  savedRows.forEach((s) => { if (!out.some((r) => sameName(r?.[nameKey], s?.[nameKey]))) out.push(s); });
  return { rows: out, typed };
}

/** True once the SHEET was saved for the day. The first phone reading creates
    the day's record, so the record existing proves nothing — a sheet save
    stamps payload.savedAt, a phone reading never does. A record without
    quickReadings predates the QR entry and was always a sheet save. Same rule
    as the server's KPI count (routes/reports.cjs, kpi-days). */
export const isSheetFiled = (p) => !Array.isArray(p?.quickReadings) || !!p?.savedAt;

/* ── keeping the saved day out of the sheet's own work ──────────────────
   Once a date's saved record is opened, its readings sit on the sheet beside
   what the user typed — but they are the SERVER's. Switching the date carried
   them onto the next day (an empty day looked already filled in, and a save
   wrote them under the wrong date), and the localStorage draft kept them, so
   they came back on the next visit. These drop every value still equal to the
   saved one. The rows stay (unit names; POS 19 type and target) — only the
   readings go. */
const same = (a, b) => String(a ?? "").trim() === String(b ?? "").trim();
const POS19_READING_KEYS = ["am", "pm", "ev"]
  .flatMap((k) => [`${k}_temp`, `${k}_time`])
  .concat(["correctiveAction", "checkedBy"]);

export function stripSavedRows(shape, rows, saved) {
  const savedRows = (shape === "grid" ? saved?.coolers : saved?.entries) || [];
  if (!savedRows.length) return rows;
  const nameKey = shape === "grid" ? "name" : "equipment";
  return (rows || []).map((r) => {
    const s = savedRows.find((x) => sameName(x?.[nameKey], r?.[nameKey]));
    if (!s) return r;
    if (shape === "grid") {
      const temps = {};
      Object.entries(r.temps || {}).forEach(([k, v]) => { if (!same(v, s.temps?.[k])) temps[k] = v; });
      return { ...r, temps, remarks: same(r.remarks, s.remarks) ? "" : r.remarks };
    }
    const out = { ...r };
    POS19_READING_KEYS.forEach((k) => { if (same(r[k], s[k])) out[k] = ""; });
    return out;
  });
}

/** A top-level value (checkedBy, section…) the saved record supplied → "". */
export const stripSavedValue = (value, savedValue) => (filled(savedValue) && same(value, savedValue) ? "" : value);

/** List entries (product matching rows) identical to a saved one are dropped. */
export function stripSavedList(list, savedList) {
  const saved = (Array.isArray(savedList) ? savedList : []).map((x) => JSON.stringify(x));
  if (!saved.length) return list;
  return (list || []).filter((x) => !saved.includes(JSON.stringify(x)));
}

/**
 * Saves the sheet for its date: updates the day's record when one exists
 * (phone readings it has not seen merged in first), creates it otherwise.
 * `payload[rowsKey]` holds the sheet rows. Returns
 * { queued, rows, seenIds, updated } — `rows` = what was saved (show it).
 */
export async function saveBranchDay({ shape, type, reporter, reportDate, payload, seenIds, label }) {
  const rowsKey = shape === "grid" ? "coolers" : "entries";
  let row = null;
  try {
    row = await getReportRowByDate(type, reportDate);
  } catch (e) {
    if (!isTransient(e)) throw e;
    // Offline: the outbox finds the day's record again when it sends.
    const r = await saveReport({ body: { reporter, type, payload }, byDate: { type, date: reportDate }, label });
    return { ...r, rows: payload[rowsKey], seenIds, updated: false };
  }
  if (!row) {
    const r = await saveReport({ body: { reporter, type, payload }, label });
    return { ...r, rows: payload[rowsKey], seenIds, updated: false };
  }
  const server = payloadOf(row) || {};
  const m = mergePhone(shape, payload[rowsKey], server, seenIds);
  const merged = {
    ...server,
    ...payload,
    [rowsKey]: m.rows,
    ...(Array.isArray(server.quickReadings) ? { quickReadings: server.quickReadings } : {}),
  };
  const r = await saveReport({ body: { reporter, type, payload: merged }, id: reportId(row), label });
  return { ...r, rows: m.rows, seenIds: m.seenIds, updated: true };
}
