// src/utils/appLang.js
// ONE interface language per account, for Al Mawashi (company 1).
//
// Before this, every section kept its own language under its own
// localStorage key with its own EN/AR button (Settings, HACCP, HSE, Cars,
// OHC, Training, Inspection, production…), so switching one page left the
// rest behind. Now, inside Al Mawashi:
//   - the language belongs to the ACCOUNT: saved on the server
//     (app_users.ui_lang, PUT /api/auth/me/lang), returned by the login and
//     cached in currentUser.uiLang — another account on the same browser
//     keeps its own;
//   - one always-visible switcher (components/LanguageSwitcher.jsx) changes it;
//   - every section hook reads getAppLang() and follows APP_LANG_EVENT live,
//     and its own per-page button hides itself (isUnifiedLang()).
// Every other company keeps its per-section buttons exactly as before.
//
// The old section keys are still written on every change, so any screen that
// only reads its key on mount (and was not wired to the event) opens in the
// right language too.

import { useState, useEffect, useCallback } from "react";

export const APP_LANG_EVENT = "app:lang-changed";

/** Al Mawashi's company id (the primary tenant). */
const UNIFIED_COMPANY_IDS = [1];

/** Every per-section key the app has ever used for its language. */
export const LEGACY_LANG_KEYS = [
  "settings_lang",
  "hse_lang",
  "haccp_modules_lang_v1",
  "ccp_lang_v1",
  "fsms_lang_v1",
  "mr_lang_v1",
  "prd_lang",
  "cars_hub_lang",
  "fleet_kpi_lang",
  "ohc_hub_lang",
  "tc_hub_lang",
  "qcs_training_lang",
  "internal_audit_lang",
  "qcs_results_lang",
  "qcs_supplier_lang",
  "returnsReportLang",
  "ai_assistant_lang",
  "cold_rooms_lang",
];

/* The custom events the section hooks already listened to — fired too, so a
   hook keeps working even through its own old listener. */
const LEGACY_EVENTS = ["settings_lang_changed", "hse-lang", "prd:lang-change"];

const norm = (v) => (v === "ar" ? "ar" : v === "en" ? "en" : null);

function readUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}") || {}; } catch { return {}; }
}

/** The company the screen is working in: the account's own, or the
 *  super-admin's picked one. */
function activeCompanyId() {
  const cu = readUser();
  if (cu.isSuperAdmin) {
    try { return Number(JSON.parse(localStorage.getItem("activeCompany") || "null")?.id) || null; } catch { return null; }
  }
  return Number(cu.companyId) || null;
}

/** True when the signed-in session runs the one-language mode (Al Mawashi). */
export function isUnifiedLang() {
  const cu = readUser();
  if (!cu.username) return false;
  return UNIFIED_COMPANY_IDS.includes(activeCompanyId());
}

/** The account's language. Not chosen yet → the old Settings language, else English. */
export function getAppLang() {
  const own = norm(readUser().uiLang);
  if (own) return own;
  try { return norm(localStorage.getItem("settings_lang")) || "en"; } catch { return "en"; }
}

function writeLegacyKeys(lang) {
  for (const k of LEGACY_LANG_KEYS) {
    try { localStorage.setItem(k, lang); } catch { /* storage blocked */ }
  }
}

function broadcast(lang) {
  try { window.dispatchEvent(new CustomEvent(APP_LANG_EVENT, { detail: lang })); } catch { /* no DOM */ }
  for (const name of LEGACY_EVENTS) {
    try { window.dispatchEvent(new CustomEvent(name, { detail: lang })); } catch { /* no DOM */ }
  }
}

/** Change the account's language everywhere, and save it on the server. */
export function setAppLang(next) {
  const lang = norm(next);
  if (!lang) return;
  const cu = readUser();
  if (cu.username) {
    try { localStorage.setItem("currentUser", JSON.stringify({ ...cu, uiLang: lang })); } catch { /* ignore */ }
  }
  writeLegacyKeys(lang);
  broadcast(lang);
  if (cu.username) {
    // fetch is wrapped by authFetch.js, which attaches the session token.
    // config/api is loaded lazily: this module is imported by many section
    // helpers, and a static import would drag import.meta into their tests.
    import("../config/api")
      .then(({ default: API_BASE }) => fetch(`${API_BASE}/api/auth/me/lang`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      }))
      .catch(() => { /* offline: the local choice stands; saved next change */ });
  }
}

/** After login: spread the account's saved language over every section key. */
export function applyAccountLang() {
  if (!isUnifiedLang()) return;
  const own = norm(readUser().uiLang);
  if (own) writeLegacyKeys(own);
}

/** Subscribe to language changes; returns the unsubscribe function. */
export function onAppLang(fn) {
  const h = (e) => fn(norm(e?.detail) || getAppLang());
  window.addEventListener(APP_LANG_EVENT, h);
  return () => window.removeEventListener(APP_LANG_EVENT, h);
}

/** Drop-in for a section's own `useState(<read its key>)`.
 *  Al Mawashi: the state IS the account language — it starts from it,
 *  follows every change live, and setting it changes it everywhere.
 *  Any other company: exactly the old local state.
 *  Accepts a value or an updater function, like a useState setter. */
export function useLangState(initial) {
  const unified = isUnifiedLang();
  const [lang, setLocal] = useState(() =>
    unified ? getAppLang() : typeof initial === "function" ? initial() : initial
  );
  useEffect(() => (unified ? onAppLang(setLocal) : undefined), [unified]);
  const setLang = useCallback((v) => {
    if (!unified) { setLocal(v); return; }
    const next = norm(typeof v === "function" ? v(getAppLang()) : v);
    if (!next) return;
    // Already the account language (e.g. a section echoing the broadcast
    // through its old listener): just follow, don't broadcast again.
    if (next === getAppLang()) { setLocal(next); return; }
    setAppLang(next);
  }, [unified]);
  return [lang, setLang];
}

/** A section's own EN/AR button hides in the one-language mode. */
export function hideSectionLangToggle() {
  return isUnifiedLang();
}
