// src/companies/index.js
// ---------------------------------------------------------------------------
// The company registry — ONE line per company system.
//
// One site, one kitchen: the shared engine lives in core/ (and, until it is
// moved there, utils/ + components/). Every customer company has its own
// table — a code MODULE, its own folder under src/companies/<module>/ — that
// is loaded only for that company's people.
//
// companies.module (server) names the module a company runs; its industry
// only says what kind of business it is (and keys the permission list,
// "<industry>:<card>", which accounts already store).
//
// Rules (checked by `npm run check`, scripts/check-imports.js):
//   • a module folder never imports another module's folder;
//   • core/ never imports a module;
//   • this file is the only place that knows every module.
//
// Add a company: create src/companies/<module>/ with a manifest, add ONE
// entry below, pick it in Platform Center → Companies → System.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";

export const MODULES = {
  /* The meat system: still the classic dashboard (App.jsx routes), moving
     into src/companies/almawashi/ in the last phase. */
  almawashi: {
    id: "almawashi",
    label: "Al Mawashi — meat system",
    labelAr: "المواشي — نظام اللحوم",
    industry: "meat",
    legacy: true,
  },
  exaltis: {
    id: "exaltis",
    label: "EXALTIS — confectionery system",
    labelAr: "EXALTIS — نظام الحلويات",
    industry: "sweets",
    load: () => import("./exaltis/manifest"),
  },
  /* Starters: a new customer of these kinds opens on the shared kit until its
     own module is programmed (then it gets its own entry here). */
  restaurant: { id: "restaurant", label: "Restaurant starter", labelAr: "نقطة بداية — مطعم", industry: "restaurant", starter: true, load: () => import("../industries/restaurant") },
  retail:     { id: "retail",     label: "Supermarket starter", labelAr: "نقطة بداية — سوبرماركت", industry: "retail", starter: true, load: () => import("../industries/retail") },
  warehouse:  { id: "warehouse",  label: "Warehouse starter", labelAr: "نقطة بداية — مستودع", industry: "warehouse", starter: true, load: () => import("../industries/warehouse") },
  factory:    { id: "factory",    label: "Manufacturing starter", labelAr: "نقطة بداية — تصنيع", industry: "factory", starter: true, load: () => import("../industries/factory") },
};

/** Same rule as the server backfill (routes/billing.cjs defaultModuleFor). */
export function defaultModuleFor(industry) {
  if (!industry || industry === "meat") return "almawashi";
  if (industry === "sweets") return "exaltis";
  return String(industry);
}

/** The registry entry a company runs (its module, else its industry's default). */
export function moduleOf(moduleKey, industry) {
  return MODULES[moduleKey] || MODULES[defaultModuleFor(industry)] || null;
}

/** Choices for the Platform Center "System" field. */
export function moduleOptions() {
  return Object.values(MODULES).map((m) => ({ id: m.id, label: m.label, labelAr: m.labelAr, industry: m.industry, starter: !!m.starter }));
}

const cache = new Map(); // module id → manifest (loaded once per session)

/** Loads a module's manifest (its cards and reports). null for the legacy meat system. */
export async function loadManifest(moduleKey, industry) {
  const m = moduleOf(moduleKey, industry);
  if (!m || !m.load) return null;
  if (!cache.has(m.id)) {
    const mod = await m.load();
    cache.set(m.id, mod.default || mod);
  }
  return cache.get(m.id);
}

/** React hook: { manifest, loading, error } for a company's module. */
export function useCompanyManifest(moduleKey, industry) {
  const m = moduleOf(moduleKey, industry);
  const key = m?.id || "";
  const [state, setState] = useState(() => ({
    manifest: key && cache.has(key) ? cache.get(key) : null,
    loading: !!(m && m.load && !cache.has(key)),
    error: null,
  }));
  useEffect(() => {
    let alive = true;
    if (!m || !m.load) { setState({ manifest: null, loading: false, error: null }); return undefined; }
    if (cache.has(key)) { setState({ manifest: cache.get(key), loading: false, error: null }); return undefined; }
    setState((s) => ({ ...s, loading: true }));
    loadManifest(moduleKey, industry)
      .then((manifest) => alive && setState({ manifest, loading: false, error: null }))
      .catch((error) => alive && setState({ manifest: null, loading: false, error }));
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}

/** Permission rows for an account of a company running this manifest:
 *  one per card, keyed "<industry>:<card>". adminOnly cards are never granted. */
export function permissionSectionsOf(manifest, industry) {
  if (!manifest) return null;
  return (manifest.cards || [])
    .filter((c) => !c.adminOnly)
    .map((c) => ({ id: `${industry}:${c.id}`, icon: c.icon, label: c.label, labelAr: c.labelAr }));
}
