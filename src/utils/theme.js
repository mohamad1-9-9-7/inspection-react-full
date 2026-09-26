// src/utils/theme.js
// Day / night mode for the whole app. The choice is a per-browser UI
// preference (like settings_lang), so it lives in localStorage under
// THEME_KEY and survives logout (authFetch.js PRESERVE_KEYS).
//
// How the night look is made: see styles/theme-dark.css — one filter on
// <html data-theme="dark">, because the app's colours are inline styles on
// hundreds of pages and could never be restyled one by one.

export const THEME_KEY = "ui_theme"; // "light" | "dark"

export function getTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(theme = getTheme()) {
  try {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
  } catch { /* no DOM */ }
}

export function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  try { localStorage.setItem(THEME_KEY, t); } catch { /* storage blocked — still applies for this visit */ }
  applyTheme(t);
  try { window.dispatchEvent(new CustomEvent("app:theme-changed", { detail: t })); } catch { /* ignore */ }
}
