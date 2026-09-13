// src/pages/monitor/branches/pos6/pos6CoolerRanges.js
//
// The accepted temperature range per unit kind, in one place.
//
// It used to be written three times — in the input screen, in the Excel
// exporter, and nowhere at all in the viewer, which is why a reading the branch
// saw flagged in red came back as plain black text on the report. Three copies
// of a food-safety limit is three chances to disagree about whether a chiller
// passed, so the input, the viewer and the backup all read this file now.

/** `min: null` / `max: null` means that side is unbounded. */
export const RANGES = {
  chiller: { min: 0, max: 5, label: "0 °C … +5 °C" },
  freezer: { min: null, max: -18, label: "≤ −18 °C" },
};

/** A reading outside its unit's range. Blank and non-numeric are not failures. */
export function isOutOfRange(kind, value) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || Number.isNaN(n)) return false;
  const r = RANGES[kind] || RANGES.chiller;
  if (r.min !== null && n < r.min) return true;
  if (r.max !== null && n > r.max) return true;
  return false;
}

/** true / false / null — the shape the viewer's `Reading` chip expects. */
export function readingVerdict(kind, value) {
  if (value === "" || value === null || value === undefined) return null;
  if (Number.isNaN(Number(value))) return null;
  return !isOutOfRange(kind, value);
}
