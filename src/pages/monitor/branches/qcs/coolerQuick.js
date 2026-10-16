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

/** The slot nearest to `now` (clamped to the first/last slot of the day). */
export function slotForNow(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  let best = COOLER_TIMES[0];
  let bestDiff = Infinity;
  SLOT_HOURS.forEach((h, i) => {
    const d = Math.abs(h * 60 - mins);
    if (d < bestDiff) { bestDiff = d; best = COOLER_TIMES[i]; }
  });
  return best;
}

/** Local calendar date, YYYY-MM-DD (never toISOString — that is UTC). */
export function localDate(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const timeLabel = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
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
  const mins = now.getHours() * 60 + now.getMinutes();
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
   Before it is saved, readings taken from phones since the draft was opened
   are pulled in, so a sheet save never wipes them:
     • an empty local cell takes the server's value;
     • a quick-entry remark line missing locally is appended;
     • quickReadings travel with the record unchanged. */
export function mergeServerDay({ coolers, loadingArea }, serverPayload) {
  const sp = serverPayload || {};
  let changed = 0;
  const mergeBlock = (local, server) => {
    const l = { temps: {}, remarks: "", ...(local || {}) };
    l.temps = { ...(l.temps || {}) };
    const st = server?.temps || {};
    Object.keys(st).forEach((slot) => {
      if (filled(st[slot]) && !filled(l.temps[slot])) { l.temps[slot] = st[slot]; changed += 1; }
    });
    const sr = String(server?.remarks || "");
    const lr = String(l.remarks || "");
    const extra = sr.split(" | ").filter((line) => line && line.startsWith("📱") && !lr.includes(line));
    if (extra.length) {
      l.remarks = [lr, ...extra].filter(Boolean).join(" | ");
      changed += extra.length;
    }
    return l;
  };
  const outCoolers = (coolers || []).map((c, i) => mergeBlock(c, (sp.coolers || [])[i]));
  const outLoading = mergeBlock(loadingArea, sp.loadingArea);
  return {
    coolers: outCoolers,
    loadingArea: outLoading,
    quickReadings: Array.isArray(sp.quickReadings) ? sp.quickReadings : undefined,
    changed,
  };
}
