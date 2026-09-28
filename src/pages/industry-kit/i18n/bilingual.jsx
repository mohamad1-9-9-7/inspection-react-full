// src/pages/industry-kit/i18n/bilingual.jsx
//
// Combined English + Arabic labels for every kit INPUT page and the company-app
// sidebar (same convention as the sweets company, its own copy so the two can
// never break each other):
//
//   <Bi en="Date" />         → "Date  التاريخ"  (Arabic smaller, muted, RTL-isolated)
//   <Bi en="Date" stack />   → English over Arabic — table headers stay narrow
//   bi("Yes")                → "Yes · نعم" — plain string for <option>, placeholder
//
// Only the LABEL is bilingual; stored values stay English, so checks, exports
// and PDFs are untouched (views and exports are English-only on purpose).
// The Arabic comes from the dictionaries in this folder, keyed by the English.

import React from "react";
import { AR_COMMON } from "./arCommon";
import { AR_REPORTS } from "./arReports";

const AR = { ...AR_COMMON, ...AR_REPORTS };
let LC = null; // lower-cased index, built on first miss

const lookup = (k) => {
  if (AR[k]) return AR[k];
  if (!LC) LC = Object.fromEntries(Object.entries(AR).map(([a, b]) => [a.toLowerCase(), b]));
  return LC[k.toLowerCase()] || "";
};

/** Arabic twin of an English label, or "" when the dictionary has none. */
export function arOf(en) {
  if (typeof en !== "string") return "";
  const k = en.trim();
  if (!k) return "";
  const direct = lookup(k);
  if (direct) return direct;
  // "Date:" / "Date *" → twin of "Date" with the same mark.
  const m = k.match(/^(.*?)\s*(:?\s*\*|:)$/);
  if (m && m[1]) {
    const base = lookup(m[1]);
    if (base) return `${base}${m[2].replace(/\s+/g, " ")}`;
  }
  return "";
}

/** "English · عربي" as ONE string — for <option>, placeholder, title. */
export function bi(en, ar) {
  const a = ar ?? arOf(en);
  return a && a !== en ? `${en} · ${a}` : String(en ?? "");
}

const CSS = `
.kbi{display:inline-flex;flex-wrap:wrap;align-items:baseline;column-gap:.45em;row-gap:0;max-width:100%;vertical-align:baseline}
.kbi-ar{font-family:var(--font-arabic,'Cairo','Tajawal',sans-serif);font-weight:700;opacity:.7;unicode-bidi:isolate;direction:rtl;min-width:0;max-width:100%}
.kbi-stack{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1.2;row-gap:1px}
.kbi-stack .kbi-ar{white-space:normal}
.kbi-center.kbi-stack{align-items:center;text-align:center}
.kbi-nowrap{flex-wrap:nowrap;overflow:hidden;text-overflow:ellipsis}
.kbi-nowrap .kbi-ar{white-space:nowrap}
#root .kbi-ar.kbi-ar{font-size:calc(12px * var(--app-fs, 1)) !important}
#root table .kbi-ar.kbi-ar,#root th .kbi-ar.kbi-ar{font-size:calc(10.5px * var(--app-fs, 1)) !important}
`;
let injected = false;
function ensureCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-industry-kit-bilingual", "");
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * English label with its Arabic twin.
 * @param {string} en        English text (dictionary key)
 * @param {string} [ar]      explicit Arabic (overrides the dictionary)
 * @param {boolean} [stack]  Arabic under the English (table headers)
 * @param {boolean} [center] centre a stacked label
 * @param {boolean} [nowrap] keep both on one line
 */
export function Bi({ en, ar, stack = false, center = false, nowrap = false, style }) {
  ensureCss();
  const a = ar ?? arOf(en);
  if (!a || a === en) return <>{en}</>;
  return (
    <span className={`kbi${stack ? " kbi-stack" : ""}${center ? " kbi-center" : ""}${nowrap ? " kbi-nowrap" : ""}`} style={style}>
      <span className="kbi-en">{en}</span>
      <span className="kbi-ar" lang="ar" dir="rtl">{a}</span>
    </span>
  );
}
