// src/pages/monitor/branches/_shared/originCountries.js
// "Country of origin" on the receiving logs is a dropdown of the countries we
// actually receive from, plus "Local". The list follows the product catalog's
// origin tags (public/data/items.json + server catalog), so a new source
// country shows up here once it appears in the catalog.

/** Catalog origin tag → the name shown and saved. */
const TAG_TO_COUNTRY = {
  LOCAL: "Local",
  UAE: "Local",
  AUS: "Australia",
  "S.A": "South Africa",
  SA: "South Africa",
  BRZ: "Brazil",
  PAK: "Pakistan",
  NEZ: "New Zealand",
  NZ: "New Zealand",
  IND: "India",
  IRAN: "Iran",
  KAZ: "Kazakhstan",
};

/** The countries we receive from today (catalog Nov 2026), Local first. */
export const BASE_ORIGIN_COUNTRIES = [
  "Local",
  "Australia",
  "Brazil",
  "India",
  "Iran",
  "Kazakhstan",
  "New Zealand",
  "Pakistan",
  "South Africa",
];

/** "AUS" → "Australia"; an unknown tag is returned as typed. */
export function countryFromTag(tag) {
  const t = String(tag ?? "").trim();
  if (!t) return "";
  return TAG_TO_COUNTRY[t.toUpperCase()] || t;
}

/**
 * Dropdown options: the base list + any other origin found in the catalog,
 * Local first and the rest A→Z.
 */
export function originOptions(catalogItems = []) {
  const set = new Set(BASE_ORIGIN_COUNTRIES);
  (catalogItems || []).forEach((it) => {
    const c = countryFromTag(it?.origin);
    if (c) set.add(c);
  });
  const rest = [...set].filter((c) => c !== "Local").sort((a, b) => a.localeCompare(b));
  return ["Local", ...rest];
}
