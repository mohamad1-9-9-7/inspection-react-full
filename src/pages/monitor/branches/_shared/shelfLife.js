// shelfLife.js
//
// ⏳ مدة الصلاحية — Shelf life: how many days a product keeps.
//
// Why it exists: on the Raw Material Receipt sheet the inspector was typing the
// expiry date by hand for every sample, although for almost every product the
// shelf life is a FIXED number of days — only the production / slaughter date
// changes from one shipment to the next. So the days are configured once here
// and the expiry date is calculated.
//
// ── What a rule looks like ──────────────────────────────────────────────────
//   { id, scope: "code" | "category", match: "22000" | "Lamb-Local", days: 90 }
// plus one `defaultDays` for everything with no rule of its own.
//
// Resolution is most-specific-first: the product code, then the catalog
// category it belongs to, then the default. A rule of 0 days means "no shelf
// life" and switches the calculation off for that product — an explicit way to
// exclude one item from the category rule it sits under.
//
// ── Storage ─────────────────────────────────────────────────────────────────
// One config record on the server, the same shape as `staff_directory`:
//   type = shelf_life_config , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate), so there is always one row.
// localStorage is a first-paint cache only — never a standalone store.

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../../config/api";
import { fetchBaseItems, normalizeCode } from "./ProductPicker";
import { addDaysIso, isoToDMY, splitDateTokens, DATE_SEP } from "./dateTokens";

export const SHELF_TYPE = "shelf_life_config";
const SHELF_KEY = "config";
export const SHELF_CACHE_KEY = "shelf_life_config_cache_v1";
export const SHELF_EVENT = "shelf_life_changed";

const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `sl_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

/* ══════════════════════════════════════ Normalisation */

export const normalizeCategory = (v) =>
  String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function normalizeRule(raw) {
  if (!raw) return null;
  const scope = raw.scope === "category" ? "category" : "code";
  const match = String(raw.match ?? raw.code ?? raw.category ?? "").trim();
  const days = Math.round(Number(raw.days));
  if (!match || !Number.isFinite(days) || days < 0 || days > 3650) return null;
  return {
    id: String(raw.id || uid()),
    scope,
    match,
    days,
    note: String(raw.note ?? "").trim(),
  };
}

const ruleKey = (r) =>
  r.scope === "category" ? `cat:${normalizeCategory(r.match)}` : `code:${normalizeCode(r.match)}`;

/** Last write wins on the same target, so a list can never hold two answers. */
export function dedupeRules(list) {
  const map = new Map();
  (Array.isArray(list) ? list : []).forEach((raw) => {
    const r = normalizeRule(raw);
    if (r) map.set(ruleKey(r), r);
  });
  return [...map.values()].sort(
    (a, b) =>
      a.scope.localeCompare(b.scope) ||
      a.match.localeCompare(b.match, undefined, { numeric: true })
  );
}

export function normalizeConfig(raw) {
  const days = Math.round(Number(raw?.defaultDays));
  return {
    defaultDays: Number.isFinite(days) && days > 0 && days <= 3650 ? days : 0,
    rules: dedupeRules(raw?.rules),
    updatedAt: String(raw?.updatedAt || ""),
    updatedBy: String(raw?.updatedBy || ""),
  };
}

export const EMPTY_CONFIG = { defaultDays: 0, rules: [], updatedAt: "", updatedBy: "" };

/* ══════════════════════════════════════ Cache */

function loadCache() {
  try {
    return normalizeConfig(JSON.parse(localStorage.getItem(SHELF_CACHE_KEY) || "null"));
  } catch {
    return { ...EMPTY_CONFIG };
  }
}

function saveCache(cfg) {
  try {
    localStorage.setItem(SHELF_CACHE_KEY, JSON.stringify(cfg));
  } catch {
    /* quota / private mode — the server copy is the real one */
  }
  try {
    window.dispatchEvent(new Event(SHELF_EVENT));
  } catch {
    /* non-browser */
  }
}

/* ══════════════════════════════════════ Server layer */

/** The saved config, or null when the server could not be reached. */
export async function fetchShelfConfig(signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(SHELF_TYPE)}&limit=5`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row =
      rows.find((r) => String(r?.payload?.reportDate || "") === SHELF_KEY) || rows[0] || null;
    return normalizeConfig(row?.payload);
  } catch {
    return null;
  }
}

/** Writes the whole config back. PUT upserts on (type, reportDate) — one row. */
export async function saveShelfConfig(cfg, user = "") {
  const clean = normalizeConfig(cfg);
  const payload = {
    reportDate: SHELF_KEY,
    defaultDays: clean.defaultDays,
    rules: clean.rules,
    updatedAt: new Date().toISOString(),
    updatedBy: user || "",
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "shelf-life", type: SHELF_TYPE, payload }),
  });
  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  }
  const saved = normalizeConfig(payload);
  saveCache(saved);
  return saved;
}

/* ══════════════════════════════════════ Catalog index (code → category)

   The catalog hook in ProductPicker keeps only code + name, but a category rule
   needs the category column — so the raw catalog rows are read here. */

let catalogPromise = null;

export function loadCatalogIndex() {
  if (!catalogPromise) {
    catalogPromise = fetchBaseItems()
      .then((rows) => {
        const byCode = new Map();
        const byName = new Map();
        (Array.isArray(rows) ? rows : []).forEach((it) => {
          const code = String(it?.item_code ?? it?.itemCode ?? it?.code ?? "").trim();
          const name = String(it?.description ?? it?.name ?? "").trim();
          const category = String(it?.category ?? "").trim();
          if (!code && !name) return;
          const rec = { code, name, category, origin: String(it?.origin ?? "").trim() };
          if (code) byCode.set(normalizeCode(code), rec);
          if (name) byName.set(name.toLowerCase().replace(/\s+/g, " "), rec);
        });
        return { byCode, byName };
      })
      .catch(() => ({ byCode: new Map(), byName: new Map() }));
  }
  return catalogPromise;
}

/* ══════════════════════════════════════ Resolution */

/** The catalog row behind a typed code / name, or null. */
export function catalogItem(catalog, { code = "", name = "" } = {}) {
  const cat = catalog || null;
  if (!cat) return null;
  const codeKey = normalizeCode(code);
  return (
    (codeKey && cat.byCode.get(codeKey)) ||
    cat.byName.get(String(name || "").toLowerCase().replace(/\s+/g, " ")) ||
    null
  );
}

/**
 * How long this product keeps.
 * Returns null when nothing applies, so the expiry cell is simply left alone.
 */
export function resolveShelfLife(cfg, catalog, product = {}) {
  const conf = cfg || EMPTY_CONFIG;
  const codeKey = normalizeCode(product.code);
  const item = catalogItem(catalog, product);

  const byCode = conf.rules.find(
    (r) => r.scope === "code" && codeKey && normalizeCode(r.match) === codeKey
  );
  if (byCode) return { days: byCode.days, source: "code", label: byCode.match };

  const category = item?.category || "";
  if (category) {
    const byCat = conf.rules.find(
      (r) => r.scope === "category" && normalizeCategory(r.match) === normalizeCategory(category)
    );
    if (byCat) return { days: byCat.days, source: "category", label: byCat.match };
  }

  if (conf.defaultDays > 0) {
    return { days: conf.defaultDays, source: "default", label: "default" };
  }
  return null;
}

/**
 * Production cell + shelf life → expiry cell.
 * Every production date gets its own expiry, in the same order, so a shipment
 * carrying three lots ends up with three expiry dates. Non-date text in the
 * production cell is skipped rather than turned into a wrong date.
 */
export function expiryFromProduction(productionValue, days) {
  const n = Number(days);
  if (!Number.isFinite(n) || n <= 0) return "";
  const out = splitDateTokens(productionValue)
    .filter((t) => t.iso)
    .map((t) => isoToDMY(addDaysIso(t.iso, n)))
    .filter(Boolean);
  return [...new Set(out)].join(DATE_SEP);
}

/* ══════════════════════════════════════ React hook */

export function useShelfLife() {
  const [config, setConfig] = useState(loadCache);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  const reload = useCallback(async (signal) => {
    setLoading(true);
    const server = await fetchShelfConfig(signal);
    if (signal?.aborted) return;
    if (server) {
      setConfig(server);
      saveCache(server);
      setOnline(true);
    } else {
      setConfig(loadCache());
      setOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    reload(ctrl.signal);
    let alive = true;
    loadCatalogIndex().then((idx) => { if (alive) setCatalog(idx); });
    return () => { alive = false; ctrl.abort(); };
  }, [reload]);

  // Stay in sync when the editor saves, here or in another tab.
  useEffect(() => {
    const onChange = () => setConfig(loadCache());
    window.addEventListener(SHELF_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(SHELF_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const save = useCallback(async (next, user) => {
    const saved = await saveShelfConfig(next, user);
    setConfig(saved);
    return saved;
  }, []);

  const resolve = useCallback(
    (product) => resolveShelfLife(config, catalog, product || {}),
    [config, catalog]
  );

  return { config, setConfig, catalog, loading, online, reload, save, resolve };
}
