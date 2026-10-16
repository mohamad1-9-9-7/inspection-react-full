// src/pages/haccp and iso/Calibration/calibrationLink.js
// Links a calibration record to a storage unit of a temperature log, so the
// log can show when that unit's calibration expires.
//
// The link is stored on the calibration record:
//   payload.linkedUnit = { log: "qcs-coolers", key: "cooler-3", label: "Cooler 4" }
// `key` is the unit's stable slot (cooler-0..7 | loading-area), so renaming a
// unit keeps the link. Records filed before the link existed still match when
// their equipment name equals the unit's name in the same branch.

import API_BASE from "../../../config/api";

export const CALIBRATION_TYPE = "calibration_record";
export const QCS_COOLERS_LOG = "qcs-coolers";
export const QCS_BRANCH = "Al Qusais Warehouse";
export const DUE_SOON_DAYS = 30;

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

function parseDay(s) {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s));
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function fmtDay(s) {
  const d = parseDay(s);
  if (!d) return "—";
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** All calibration records ([] when the server can't be reached or refuses). */
export async function fetchCalibrations(signal) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(CALIBRATION_TYPE)}`, { cache: "no-store", signal });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json?.data || json?.items || [];
  } catch {
    return [];
  }
}

/**
 * The calibration in force for one unit: among the records linked to it (or,
 * for old records, named like it in the same branch) the newest calibration.
 */
export function calibrationForUnit(records, { branch, log, unitKey, label }) {
  const hits = (records || []).filter((r) => {
    const p = r?.payload || {};
    if (norm(p.branch) !== norm(branch)) return false;
    const link = p.linkedUnit;
    if (link?.key) return link.key === unitKey && (!link.log || link.log === log);
    return !!label && norm(p.equipmentName) === norm(label);
  });
  if (!hits.length) return null;
  const at = (r) => parseDay(r.payload?.lastCalibrationDate)?.getTime() ?? 0;
  return hits.reduce((best, r) => (at(r) > at(best) ? r : best));
}

/** expired | soon | ok | none — plus days left to the expiry date. */
export function expiryStatus(rec) {
  const p = rec?.payload || {};
  if (!rec) return { state: "none", days: null, date: "" };
  const d = parseDay(p.nextDueDate);
  if (!d) return { state: "none", days: null, date: "" };
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const days = Math.round((d - t) / 86400000);
  const state = p.result === "FAIL" || days < 0 ? "expired" : days <= DUE_SOON_DAYS ? "soon" : "ok";
  return { state, days, date: p.nextDueDate, failed: p.result === "FAIL" };
}
