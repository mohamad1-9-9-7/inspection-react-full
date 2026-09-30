// src/companies/exaltis/reports/coolers/coolersModel.js
// Cooler temperatures — defaults, times, matches, draft and KPIs.
// (Split out of CoolersTab.js — the code is unchanged.)
import { companyScopedKey } from "../sweetsRecord";
import API_BASE from "../../../../config/api";
import { COOLER_COUNT, normalizeCoolerDefs, inRange } from "../coolerDefs";
import { getReportRowByDate, reportId, payloadOf } from "../../../../pages/monitor/branches/_shared/reportApi";

export function todayDubaiISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

/* Product matching rule — at least MIN_MATCHES products with a numeric
   temperature. Kept local so this sheet depends on no other company's module. */
export const MIN_MATCHES = 2;

export const isValidMatch = (r) =>
  !!String(r?.productName || "").trim() &&
  r?.productTemp !== "" &&
  r?.productTemp != null &&
  !Number.isNaN(Number(r.productTemp));

export const countValidMatches = (pvs) => (Array.isArray(pvs) ? pvs.filter(isValidMatch).length : 0);

/* Product suggestions are the sweets company's own — never the other company's catalog. */
export const SWEETS_PRODUCTS = [
  "Fresh cream cake", "Cheesecake", "Chocolate cake", "Tiramisu", "Mousse cake", "Eclairs",
  "Cream puffs", "Fruit tart", "Kunafa (cream)", "Muhallabia", "Umm Ali", "Fresh cream",
  "Whipping cream", "Butter", "Cream cheese", "Milk", "Eggs", "Custard filling",
];

/* ===== Draft (localStorage) ===== */
/* Per company: the platform owner can open two sweets companies on the same
   browser, and an unsaved sheet from one must never prefill the other's. */
export const DRAFT_KEY_BASE = "sweets_coolers_draft_v1";

export const draftKey = () => companyScopedKey(DRAFT_KEY_BASE);

/* A draft left over from an earlier, unsaved session is only useful for
   TODAY's sheet. Reusing an older one would silently load a stale date +
   partial readings under what looks like today's tab, and saving could
   PUT-overwrite a different day's already-submitted report. */
export const loadDraft = () => {
  try {
    const raw = localStorage.getItem(draftKey());
    if (!raw) return {};
    const draft = JSON.parse(raw);
    if (draft && draft.date && draft.date !== todayDubaiISO()) {
      try { localStorage.removeItem(draftKey()); } catch {}
      return {};
    }
    return draft || {};
  } catch {
    return {};
  }
};

/* =========================
   API base → src/config/api.js (one source of truth)
========================= */

export const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ---- Config ---- */
export const LOGO_FALLBACK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

/* Report type stored on the server */
export const COOLERS_TYPE = "sweets-coolers";

/* ---- Time helpers (4AM -> 8PM, every 2 hours) ---- */
export function formatHour(h) {
  const suffix = h < 12 ? "AM" : "PM";
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${suffix}`;
}

export function generateTimes(startHour = 4, endHour = 20, step = 2) {
  const out = [];
  for (let h = startHour; h <= endHour; h += step) out.push(formatHour(h));
  return out;
}

export const TIMES = generateTimes();

export const DEFAULT_MATCH_TIME = TIMES[Math.floor(TIMES.length / 2)] || TIMES[0];

/* ---- Defaults ---- */
export const defaultTMPHeader = {
  documentTitle: "",
  documentNo: "",
  issueDate: "",
  revisionNo: "",
  area: "",
  issuedBy: "",
  controllingOfficer: "",
  approvedBy: "",
};

export const makeDefaultCoolers = () =>
  Array(COOLER_COUNT)
    .fill(null)
    .map(() => ({
      temps: TIMES.reduce((acc, t) => {
        acc[t] = "";
        return acc;
      }, {}),
      remarks: "",
    }));

/* Default Loading Area object */
export const makeDefaultLoadingArea = () => ({
  temps: TIMES.reduce((acc, t) => { acc[t] = ""; return acc; }, {}),
  remarks: "",
});

export const makeProductVerificationRow = (overrides = {}) => ({
  time: overrides.time || DEFAULT_MATCH_TIME,
  storageKey: overrides.storageKey || "cooler-0",
  itemCode: overrides.itemCode || "",
  productName: overrides.productName || "",
  productTemp: overrides.productTemp || "",
  country: overrides.country || overrides.batchNo || "",
  remarks: overrides.remarks || "",
});

export const makeDefaultProductVerifications = () => [
  makeProductVerificationRow({ time: "4:00 AM", storageKey: "cooler-0" }),
  makeProductVerificationRow({ time: "12:00 PM", storageKey: "cooler-4" }),
  makeProductVerificationRow({ time: "6:00 PM", storageKey: "cooler-7" }),
];

/* ---- KPI ----
   Ranges are no longer a function of the row INDEX: each unit carries its own
   band (see coolerDefs.js), so the KPI has to be told which definitions the
   readings are being judged against. */
export function calcCoolersKPI(coolers, coolerDefs) {
  const defs = normalizeCoolerDefs(coolerDefs);
  const all = [];
  let outOfRange = 0;
  (coolers || []).forEach((c, ci) => {
    TIMES.forEach((t) => {
      const v = c?.temps?.[t];
      const n = Number(v);
      if (v !== "" && !Number.isNaN(n)) {
        all.push(n);
        if (!inRange(defs[ci], n)) outOfRange += 1;
      }
    });
  });
  const avgNum = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  return {
    avg: avgNum === null ? "—" : avgNum.toFixed(2),
    min: all.length ? Math.min(...all) : "—",
    max: all.length ? Math.max(...all) : "—",
    outOfRange,
  };
}

/* ===== Date formatting (DD/MM/YYYY) ===== */
export function formatDMYSmart(value) {
  if (!value) return "";
  const s = String(value).trim();

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return s;

  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return s;
}

/* =========================
   Server helpers (COOLERS only)
========================= */
/* Targeted read — this used to download every coolers report ever saved just
   to find out whether one date already had a record. */
export async function fetchExistingByDate(dateStr) {
  const row = await getReportRowByDate(COOLERS_TYPE, dateStr);
  return row ? { id: reportId(row), payload: payloadOf(row) } : null;
}

/* Blanks every reading in a temperature block while keeping its shape. */
export function clearTemps(block) {
  const temps = {};
  TIMES.forEach((t) => { temps[t] = ""; });
  return { ...(block || {}), temps, remarks: "" };
}
