// src/pages/monitor/branches/qcs/coolerQuick.js
//
// 📱 Quick entry from the phone — one reading of one storage unit, reached by
// scanning the QR sticker on that unit.
//
// The daily QCS sheet (type `qcs-coolers`) stays the record of truth. A quick
// reading is merged into that day's record by the server
// (POST /api/reports/qcs-coolers/reading, inside a transaction), so two people
// scanning two coolers at the same moment never overwrite each other. Every
// reading is also kept in `payload.quickReadings` with who/when/corrective
// action — the audit trail paper never had.
//
// Late readings are computed here from the same record: a slot whose time has
// passed (plus a grace period) with an empty cell is late, and an out-of-range
// reading whose recheck time passed without a recheck is an overdue recheck.

import { buildPublicUrl } from "../../../../config/publicOrigin";
import { getReportRowByDate, payloadOf } from "../_shared/reportApi";
import { COOLER_READING_KIND, newOutboxId, postCoolerReading } from "../../../../utils/reportOutbox";
import { enqueue, isTransient } from "../../../../utils/offlineOutbox";
import { COOLER_COUNT, inRange, normalizeCoolerDefs, normalizeLoadingDef } from "./coolerDefs";

export const COOLERS_TYPE = "qcs-coolers";

/* ══════════════════════════════════════ Time slots
   Same slots as the paper sheet: 4 AM → 8 PM, every 2 hours. */
function formatHour(h) {
  const suffix = h < 12 ? "AM" : "PM";
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${suffix}`;
}
export const SLOT_HOURS = [4, 6, 8, 10, 12, 14, 16, 18, 20];
export const COOLER_TIMES = SLOT_HOURS.map(formatHour);

/** A reading is late this many minutes after its slot. */
export const LATE_GRACE_MIN = 30;
/** An out-of-range reading must be re-checked within this many minutes. */
export const RECHECK_AFTER_MIN = 30;

export const slotHour = (slot) => SLOT_HOURS[COOLER_TIMES.indexOf(slot)];

/* ══════════════════════════════════════ UAE time
   Every site runs on UAE time (Asia/Dubai, UTC+4, no daylight saving). The
   date and the slot must not depend on the timezone set on the phone or the
   PC: a device left on another zone would file the reading under the wrong
   day or slot. A fixed offset is used (not Intl time-zone data), so it also
   holds on old phones without that data. */
const UAE_OFFSET_MS = 4 * 60 * 60 * 1000;
const uae = (d) => new Date(d.getTime() + UAE_OFFSET_MS); // read with getUTC*

/** Minutes since midnight, UAE time. */
export const uaeMinutes = (now = new Date()) => {
  const u = uae(now);
  return u.getUTCHours() * 60 + u.getUTCMinutes();
};

/** The slot nearest to `now` (clamped to the first/last slot of the day). */
export function slotForNow(now = new Date()) {
  const mins = uaeMinutes(now);
  let best = COOLER_TIMES[0];
  let bestDiff = Infinity;
  SLOT_HOURS.forEach((h, i) => {
    const d = Math.abs(h * 60 - mins);
    if (d < bestDiff) { bestDiff = d; best = COOLER_TIMES[i]; }
  });
  return best;
}

/** Today's date in the UAE, YYYY-MM-DD. */
export function localDate(d = new Date()) {
  const u = uae(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${u.getUTCFullYear()}-${p(u.getUTCMonth() + 1)}-${p(u.getUTCDate())}`;
}

/** "9:42 AM", UAE time. */
export const timeLabel = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const u = uae(d);
  const h = u.getUTCHours();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(u.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/* ══════════════════════════════════════ Units */

export const UNIT_KEYS = [
  ...Array.from({ length: COOLER_COUNT }, (_, i) => `cooler-${i}`),
  "loading-area",
];

export function unitDef(unit, coolerDefs, loadingDef) {
  if (unit === "loading-area") return normalizeLoadingDef(loadingDef);
  const m = String(unit || "").match(/^cooler-(\d+)$/);
  if (!m) return null;
  return normalizeCoolerDefs(coolerDefs)[Number(m[1])] || null;
}

export function unitBlock(payload, unit) {
  const p = payload || {};
  if (unit === "loading-area") return p.loadingArea || null;
  const m = String(unit || "").match(/^cooler-(\d+)$/);
  return m && Array.isArray(p.coolers) ? p.coolers[Number(m[1])] || null : null;
}

export const quickUrl = (unit) => buildPublicUrl(`/monitor/qcs/coolers/quick/${unit}`);
export const QUICK_HUB_PATH = "/monitor/qcs/coolers/quick";

/* ══════════════════════════════════════ Corrective actions */

export const CORRECTIVE_ACTIONS = [
  { key: "door", en: "Door was open — closed it", ar: "الباب كان مفتوح — تم إغلاقه" },
  { key: "thermostat", en: "Adjusted the thermostat", ar: "تم تعديل الثرموستات" },
  { key: "defrost", en: "Unit in defrost cycle", ar: "البراد في دورة إذابة الثلج" },
  { key: "loading", en: "Just loaded / unloaded", ar: "تحميل أو تنزيل بضاعة للتو" },
  { key: "moved", en: "Moved product to another unit", ar: "تم نقل المنتج لوحدة أخرى" },
  { key: "maintenance", en: "Maintenance called", ar: "تم طلب الصيانة" },
  { key: "other", en: "Other", ar: "أخرى" },
];

/* ══════════════════════════════════════ Day status */

const filled = (v) => v !== "" && v != null && !Number.isNaN(Number(v));

/**
 * Status of every unit for one day's payload.
 * Returns [{ unit, def, readings: {slot: value}, late: [slot], out: [slot],
 *            recheck: null | { due, value, slot, overdue } }]
 * `now` = null for a past day: every slot counts as due.
 */
export function dayStatus(payload, coolerDefs, loadingDef, now = new Date(), isToday = true) {
  const p = payload || {};
  const log = Array.isArray(p.quickReadings) ? p.quickReadings : [];
  const mins = uaeMinutes(now);
  return UNIT_KEYS.map((unit) => {
    const def = unitDef(unit, coolerDefs, loadingDef);
    const temps = unitBlock(p, unit)?.temps || {};
    const late = [];
    const out = [];
    COOLER_TIMES.forEach((slot, i) => {
      const v = temps[slot];
      if (filled(v)) {
        if (!inRange(def, v)) out.push(slot);
      } else if (!isToday || SLOT_HOURS[i] * 60 + LATE_GRACE_MIN <= mins) {
        late.push(slot);
      }
    });

    // The newest out-of-range reading of this unit still waiting for a recheck.
    let recheck = null;
    const mine = log.filter((r) => r && r.unit === unit);
    for (let i = mine.length - 1; i >= 0; i -= 1) {
      const r = mine[i];
      // A newer in-range reading of the unit (recheck or not) closes it.
      if (!r.outOfRange || !r.recheckDue) break;
      const due = new Date(r.recheckDue);
      recheck = { due: r.recheckDue, value: r.value, slot: r.slot, overdue: due.getTime() <= now.getTime() };
      break;
    }
    return { unit, def, readings: temps, late, out, recheck };
  });
}

/* ══════════════════════════════════════ Server */

export async function fetchDay(date, signal) {
  const row = await getReportRowByDate(COOLERS_TYPE, date, { signal });
  return row ? payloadOf(row) : null;
}

/**
 * Saves one reading. Returns { queued } — queued = no connection, kept on the
 * device and sent automatically later. Throws on SLOT_FILLED (err.code) and
 * other server errors.
 */
export async function saveQuickReading(body) {
  const full = { ...body, readingId: body.readingId || newOutboxId() };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25_000);
  try {
    await postCoolerReading(full, ctrl.signal);
    return { queued: false };
  } catch (err) {
    if (!isTransient(err)) throw err;
    // The offline outbox replays it through the handler in utils/reportOutbox.js.
    await enqueue(COOLER_READING_KIND, full.readingId, full, `Cooler reading ${full.unit} ${full.slot}`);
    return { queued: true };
  } finally {
    clearTimeout(t);
  }
}

/* ══════════════════════════════════════ Sheet merge
   The full sheet (CoolersTab) is edited from a local draft and saved whole.
   Before it is saved, readings taken from phones SINCE THE SHEET LAST SAW
   THE SERVER are pulled in, so a sheet save never wipes them.

   Only NEW phone readings (log entries whose id is not in `seenIds`) are
   merged. Merging every server value instead brought back a reading the
   user had just cleared on the sheet: the cell was empty locally, the old
   value was still on the server, so it was "filled in" again on save.
     • a new phone reading fills its cell only if the sheet's cell is empty;
     • its remark line is appended once;
     • quickReadings travel with the record unchanged. */
function remarkLineOf(r) {
  if (r.remarkLine) return r.remarkLine;
  const by = r.byName || r.by ? ` (${r.byName || r.by})` : "";
  const ca = r.correctiveAction ? ` → ${r.correctiveAction}` : "";
  if (r.kind === "recheck") return `📱 ${timeLabel(r.at)} recheck ${r.value}°C ${r.outOfRange ? "✗" : "✓"}${ca}${by}`;
  if (r.outOfRange) return `📱 ${r.slot} ${r.value}°C ✗${ca}${by}`;
  return "";
}

export function mergeServerDay({ coolers, loadingArea }, serverPayload, seenIds = new Set()) {
  const sp = serverPayload || {};
  const log = Array.isArray(sp.quickReadings) ? sp.quickReadings : [];
  let changed = 0;
  const outCoolers = (coolers || []).map((c) => {
    const l = { temps: {}, remarks: "", ...(c || {}) };
    l.temps = { ...(l.temps || {}) };
    return l;
  });
  const outLoading = { temps: {}, remarks: "", ...(loadingArea || {}) };
  outLoading.temps = { ...(outLoading.temps || {}) };

  log.forEach((r) => {
    if (!r || !r.id || seenIds.has(r.id)) return;
    let block = null;
    if (r.unit === "loading-area") block = outLoading;
    else {
      const m = String(r.unit || "").match(/^cooler-(d+)$/);
      if (m) block = outCoolers[Number(m[1])] || null;
    }
    if (!block) return;
    if (r.kind !== "recheck" && r.slot && !filled(block.temps[r.slot])) {
      block.temps[r.slot] = String(r.value);
      changed += 1;
    }
    const line = remarkLineOf(r);
    if (line && !String(block.remarks || "").includes(line)) {
      block.remarks = [block.remarks, line].filter(Boolean).join(" | ");
      changed += 1;
    }
  });

  return {
    coolers: outCoolers,
    loadingArea: outLoading,
    quickReadings: log.length ? log : undefined,
    seenIds: new Set([...seenIds, ...log.map((r) => r && r.id).filter(Boolean)]),
    changed,
  };
}

/** Ids of every phone reading in a day's record — what a freshly loaded sheet has "seen". */
export const quickIdsOf = (payload) =>
  new Set((Array.isArray(payload?.quickReadings) ? payload.quickReadings : []).map((r) => r && r.id).filter(Boolean));
