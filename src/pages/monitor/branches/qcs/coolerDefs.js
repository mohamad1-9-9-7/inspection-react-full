// src/pages/monitor/branches/qcs/coolerDefs.js
//
// 🧊 تعريف وحدات التخزين في QCS — الاسم · النوع · الحد الأدنى/الأعلى.
// Storage-unit definitions for the QCS Temperature Control record: what each
// unit is called, what KIND of storage it is (chiller / freezer / production
// room / dry store) and the acceptable temperature band for it.
//
// Why it exists: the eight units used to be hardcoded by INDEX in three
// separate files — `i === 7 ? "FREEZER" : (i === 2 || i === 3) ? "Production
// Room" : ...` in CoolersTab, again in CoolersView, and a third time in the
// Excel exporter. So the day cooler 1 and cooler 5 stopped being chillers and
// became dry stores (مواد), the sheet kept flagging every ambient reading as
// out of range and there was no way to fix it without a code change.
//
// ── Where a report gets its definitions ─────────────────────────────────────
//   1. `payload.coolerDefs` / `payload.loadingDef` — the definitions IN FORCE
//      on the day the readings were taken. Always embedded when the record is
//      saved, so an old report keeps rendering against the limits it was
//      judged by; changing a limit today never rewrites yesterday's verdict.
//   2. Nothing stored → the legacy layout below (freezer at 8, production
//      rooms at 3 & 4). Every record filed before this module existed.
//
// ── Where the live setup lives ──────────────────────────────────────────────
// One config record on the server, same shape as `staff_directory`:
//   type = qcs_coolers_config , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate), so there is always one row.
// localStorage is a first-paint cache only — never a standalone store.

import API_BASE from "../../../../config/api";

export const COOLERS_CONFIG_TYPE = "qcs_coolers_config";
const CONFIG_KEY = "config";
export const COOLERS_CONFIG_CACHE_KEY = "qcs_coolers_config_cache_v1";

/** How many storage units the sheet has. The paper form has eight rows. */
export const COOLER_COUNT = 8;

/* ══════════════════════════════════════ أنواع التخزين
   Storage kinds. `min`/`max` are the STARTING band for a unit of that kind —
   every unit keeps its own copy and may be tuned away from it. */
export const STORAGE_TYPES = [
  {
    key: "chilled",
    en: "Chiller",
    ar: "مبرد",
    emoji: "🧊",
    accent: "#2563eb",
    min: 0,
    max: 5,
    warnBand: 2,
  },
  {
    key: "frozen",
    en: "Freezer",
    ar: "فريزر",
    emoji: "❄️",
    accent: "#0ea5e9",
    min: -19,
    max: -14,
    warnBand: 1,
  },
  {
    key: "production",
    en: "Production Room",
    ar: "غرفة إنتاج",
    emoji: "🏭",
    accent: "#7c3aed",
    min: 8,
    max: 12,
    warnBand: 1,
  },
  {
    key: "dry",
    en: "Dry Store",
    ar: "تخزين عادي / مواد",
    emoji: "📦",
    accent: "#a16207",
    min: 15,
    max: 25,
    warnBand: 2,
  },
  {
    key: "ambient",
    en: "Loading / Ambient",
    ar: "منطقة تحميل",
    emoji: "🚚",
    accent: "#d97706",
    min: 0,
    max: 16,
    warnBand: 1,
  },
];

const TYPE_BY_KEY = new Map(STORAGE_TYPES.map((t) => [t.key, t]));
export const storageType = (key) => TYPE_BY_KEY.get(key) || TYPE_BY_KEY.get("chilled");

/* ══════════════════════════════════════ التعريفات الافتراضية (legacy)
   Exactly what the three files hardcoded before this module. Any record saved
   without definitions must keep rendering through these, unchanged. */
export function defaultCoolerDef(index) {
  if (index === 7) return { type: "frozen", label: "FREEZER", min: -19, max: -14 };
  if (index === 2 || index === 3) return { type: "production", label: "Production Room", min: 8, max: 12 };
  return { type: "chilled", label: `Cooler ${index + 1}`, min: 0, max: 5 };
}

export const makeDefaultCoolerDefs = () =>
  Array.from({ length: COOLER_COUNT }, (_, i) => defaultCoolerDef(i));

export const defaultLoadingDef = () => ({
  type: "ambient",
  label: "Loading Area",
  min: 0,
  max: 16,
});

/* ══════════════════════════════════════ Normalisation */

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/** Accepts a partial/foreign shape and returns a complete, ordered definition. */
export function normalizeDef(raw, fallback) {
  const base = fallback || { type: "chilled", label: "", min: 0, max: 5 };
  const t = storageType(raw?.type || base.type);
  const min = num(raw?.min, num(base.min, t.min));
  const max = num(raw?.max, num(base.max, t.max));
  return {
    type: t.key,
    label: String(raw?.label ?? base.label ?? t.en).trim() || t.en,
    // A band entered backwards would mark every reading out of range.
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

/** The eight unit definitions, padded/trimmed to COOLER_COUNT. */
export function normalizeCoolerDefs(raw) {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: COOLER_COUNT }, (_, i) =>
    normalizeDef(list[i], defaultCoolerDef(i))
  );
}

export function normalizeLoadingDef(raw) {
  return normalizeDef(raw, defaultLoadingDef());
}

/** Pulls the definitions a saved report was judged by, legacy-safe. */
export function defsFromPayload(payload) {
  const p = payload || {};
  return {
    coolerDefs: normalizeCoolerDefs(p.coolerDefs),
    loadingDef: normalizeLoadingDef(p.loadingDef),
  };
}

/* ══════════════════════════════════════ Reading a definition */

export const rangeOf = (def) => {
  const d = normalizeDef(def);
  return { min: d.min, max: d.max };
};

export const inRange = (def, t) => {
  const { min, max } = rangeOf(def);
  const n = Number(t);
  return Number.isFinite(n) && n >= min && n <= max;
};

export const accentOf = (def) => storageType(def?.type).accent;
export const emojiOf = (def) => storageType(def?.type).emoji;
export const warnBandOf = (def) => storageType(def?.type).warnBand;

/** "0°C to 5°C", or "≤ 16°C" for a band that only has an upper bound in practice. */
export function rangeLabel(def) {
  const { min, max } = rangeOf(def);
  if (def?.type === "ambient" && min <= 0) return `≤ ${max}°C`;
  return `${min}°C to ${max}°C`;
}

/**
 * The limit a PRODUCT taken out of this unit is judged against.
 *
 * A dry store holds ambient goods, so the product is judged against the room's
 * own band — the old blanket "0 to 5°C" would fail every legitimate reading.
 * Chilled and production rooms keep the cold-chain limit for the meat inside
 * them, which is not the same as the room's air temperature.
 */
export function productLimitFor(def) {
  const d = normalizeDef(def);
  if (d.type === "frozen") return { label: "≤ -18°C", pass: (n) => n <= -18 };
  if (d.type === "dry" || d.type === "ambient") {
    return { label: `${d.min} to ${d.max}°C`, pass: (n) => n >= d.min && n <= d.max };
  }
  return { label: "0 to 5°C", pass: (n) => n >= 0 && n <= 5 };
}

/** `cooler-3` / `loading-area` → the definition behind that storage key. */
export function defForStorageKey(storageKey, coolerDefs, loadingDef) {
  if (storageKey === "loading-area") return normalizeLoadingDef(loadingDef);
  const m = String(storageKey || "").match(/^cooler-(\d+)$/);
  if (!m) return null;
  const i = Number(m[1]);
  return normalizeCoolerDefs(coolerDefs)[i] || null;
}

export function labelForStorageKey(storageKey, coolerDefs, loadingDef) {
  const def = defForStorageKey(storageKey, coolerDefs, loadingDef);
  return def ? def.label : String(storageKey || "");
}

/** The dropdown of places a product check can be attached to. */
export function storageOptions(coolerDefs, loadingDef) {
  const defs = normalizeCoolerDefs(coolerDefs);
  const load = normalizeLoadingDef(loadingDef);
  return [
    ...defs.map((def, i) => ({ key: `cooler-${i}`, coolerIndex: i, def, label: def.label })),
    { key: "loading-area", coolerIndex: null, def: load, label: load.label },
  ];
}

/* ══════════════════════════════════════ Cache layer */

export function loadDefsCache() {
  try {
    const raw = localStorage.getItem(COOLERS_CONFIG_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed) return null;
    return {
      coolerDefs: normalizeCoolerDefs(parsed.coolerDefs),
      loadingDef: normalizeLoadingDef(parsed.loadingDef),
    };
  } catch {
    return null;
  }
}

export function saveDefsCache(coolerDefs, loadingDef) {
  try {
    localStorage.setItem(
      COOLERS_CONFIG_CACHE_KEY,
      JSON.stringify({
        coolerDefs: normalizeCoolerDefs(coolerDefs),
        loadingDef: normalizeLoadingDef(loadingDef),
      })
    );
  } catch {
    /* quota / private mode — the server copy stays authoritative */
  }
}

/* ══════════════════════════════════════ Server layer */

/** The saved setup, or null when the server could not be reached / none saved. */
export async function fetchCoolerConfig(signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(COOLERS_CONFIG_TYPE)}&limit=5`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row =
      rows.find((r) => String(r?.payload?.reportDate || "") === CONFIG_KEY) || rows[0] || null;
    if (!row?.payload) return null;
    const out = {
      coolerDefs: normalizeCoolerDefs(row.payload.coolerDefs),
      loadingDef: normalizeLoadingDef(row.payload.loadingDef),
    };
    saveDefsCache(out.coolerDefs, out.loadingDef);
    return out;
  } catch {
    return null;
  }
}

/** Writes the whole setup back. PUT upserts on (type, reportDate) — one row. */
export async function saveCoolerConfig(coolerDefs, loadingDef, user = "") {
  const body = {
    reporter: user || "qcs-coolers-config",
    type: COOLERS_CONFIG_TYPE,
    payload: {
      reportDate: CONFIG_KEY,
      coolerDefs: normalizeCoolerDefs(coolerDefs),
      loadingDef: normalizeLoadingDef(loadingDef),
      updatedAt: new Date().toISOString(),
      updatedBy: user || "",
    },
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  }
  saveDefsCache(body.payload.coolerDefs, body.payload.loadingDef);
  return { coolerDefs: body.payload.coolerDefs, loadingDef: body.payload.loadingDef };
}
