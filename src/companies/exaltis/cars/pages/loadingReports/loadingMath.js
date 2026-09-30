// src/companies/exaltis/cars/pages/loadingReports/loadingMath.js
// Loading reports — dates, yes/no labels and the day KPIs.
// (Split out of LoadingReports.jsx — the code is unchanged.)

/* ===================== Visual Inspection Params (English only) ===================== */
/* NEW safety controls + existing hygiene controls (same ids as input page) */
export const VI_PARAMS = [
  // NEW safety controls
  { id: "trafficControlSpotter",  en: "TRAFFIC CONTROL / SPOTTER USED" },
  { id: "vehicleSecured",         en: "VEHICLE SECURED (HANDBRAKE + CHOCKS)" },
  { id: "loadSecured",            en: "LOAD SECURED (STRAPS + INSPECTION)" },
  { id: "areaSafe",               en: "AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR)" },
  { id: "manualHandlingControls", en: "MANUAL HANDLING CONTROLS APPLIED" },

  // Existing hygiene controls
  { id: "floorSealingIntact", en: "FLOOR SEALING INTACT" },
  { id: "floorCleaning",      en: "FLOOR CLEANING" },
  { id: "pestActivites",      en: "PEST ACTIVITIES" }, // id as in input form
  { id: "plasticCurtain",     en: "PLASTIC CURTAIN AVAILABLE/ CLEANING" },
  { id: "badOdour",           en: "BAD ODOUR" },
  { id: "ppeAvailable",       en: "PPE AVAILABLE" },
];

/* ===================== Date helpers (English) ===================== */
export const pad = (n) => String(n).padStart(2, "0");

export const localTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const todayISO = localTodayISO();

export const parseToISO = (s) => {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    return { y: String(y), m: pad(m), d: pad(d), iso: `${y}-${pad(m)}-${pad(d)}`, raw: s };
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
    const [dd, mm, yyyy] = t.split("/").map(Number);
    return { y: String(yyyy), m: pad(mm), d: pad(dd), iso: `${yyyy}-${pad(mm)}-${pad(dd)}`, raw: s };
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(t)) {
    const [yyyy, mm, dd] = t.split("/").map(Number);
    return { y: String(yyyy), m: pad(mm), d: pad(dd), iso: `${yyyy}-${pad(mm)}-${pad(dd)}`, raw: s };
  }
  return null;
};

export const displayDate = (iso, { weekday = true } = {}) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const opts = { year: "numeric", month: "long", day: "2-digit", ...(weekday && { weekday: "short" }) };
  const locale = "en-GB";
  return new Intl.DateTimeFormat(locale, opts).format(dt);
};

export const relativeLabel = (iso) => {
  if (!iso) return "";
  if (iso === todayISO) return " (Today)";
  const t = new Date(todayISO);
  const y = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  const yISO = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  return iso === yISO ? " (Yesterday)" : "";
};

/* ===================== YES/NO Normalizer (FIX) ===================== */
export const normYesNo = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true" || s === "1") return "yes";
  if (s === "no" || s === "n" || s === "false" || s === "0") return "no";
  return null;
};

export const yesNoLabel = (v) => {
  const n = normYesNo(v);
  return n === "yes" ? "YES" : n === "no" ? "NO" : "—";
};

/* ====================== KPIs helpers ====================== */
export const toNum = (x) => {
  const n = Number(String(x ?? "").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
};

export const parseTimeToMinutes = (t) => {
  if (!t || typeof t !== "string") return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
};

export const formatMinutes = (mins) => {
  if (mins == null || isNaN(mins)) return "—";
  const m = Math.max(0, Math.round(mins));
  return `${m}`;
};

export function computeDayKPIs(vehicles) {
  const count = vehicles.length;

  const temps = vehicles.map((v) => toNum(v.tempCheck)).filter((n) => n != null);
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length) : null;

  const durations = vehicles
    .map((v) => {
      const s = parseTimeToMinutes(v.timeStart);
      const e = parseTimeToMinutes(v.timeEnd);
      if (s == null || e == null) return null;
      const d = e - s;
      return isNaN(d) ? null : Math.max(0, d);
    })
    .filter((n) => n != null);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  // ✅ FIX: normalize yes/no values
  let totalChecks = 0;
  let yesChecks = 0;
  vehicles.forEach((v) => {
    VI_PARAMS.forEach((p) => {
      const val = normYesNo(v[p.id]);
      if (val === "yes" || val === "no") {
        totalChecks += 1;
        if (val === "yes") yesChecks += 1;
      }
    });
  });
  const yesRate = totalChecks ? (yesChecks / totalChecks) * 100 : null;

  return { count, avgTemp, avgDuration, yesRate };
}
