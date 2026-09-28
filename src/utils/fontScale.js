// src/utils/fontScale.js
// App-wide text size (accessibility). A per-browser UI preference like
// ui_theme, so it lives in localStorage under FONT_SCALE_KEY and survives
// logout (authFetch.js PRESERVE_KEYS).
//
// How it applies: one CSS variable `--app-fs` on <html>. globals.css builds
// its forced base sizes from it (calc(14px * var(--app-fs))), and html's own
// font-size scales too, so every rem-based page follows.

export const FONT_SCALE_KEY = "ui_font_scale";

// Five stops, like a phone's text-size slider. Index 1 = normal (100%).
export const FONT_STEPS = [0.9, 1, 1.15, 1.3, 1.45];
export const DEFAULT_STEP = 1;

const clampStep = (i) => Math.min(FONT_STEPS.length - 1, Math.max(0, Math.round(i)));

export function getFontStep() {
  try {
    const raw = localStorage.getItem(FONT_SCALE_KEY);
    if (raw == null) return DEFAULT_STEP;
    const i = FONT_STEPS.indexOf(parseFloat(raw));
    return i === -1 ? DEFAULT_STEP : i;
  } catch {
    return DEFAULT_STEP;
  }
}

export function applyFontStep(step = getFontStep()) {
  try {
    document.documentElement.style.setProperty("--app-fs", String(FONT_STEPS[clampStep(step)]));
  } catch { /* no DOM */ }
}

export function setFontStep(step) {
  const i = clampStep(step);
  try {
    if (i === DEFAULT_STEP) localStorage.removeItem(FONT_SCALE_KEY);
    else localStorage.setItem(FONT_SCALE_KEY, String(FONT_STEPS[i]));
  } catch { /* storage blocked — still applies for this visit */ }
  applyFontStep(i);
  try { window.dispatchEvent(new CustomEvent("app:font-scale-changed", { detail: i })); } catch { /* ignore */ }
}
