// src/pages/monitor/branches/ftr1/ftr1TempUnits.js
// FTR 1 temperature log — storage units and their limits, shared by the input
// sheet and the viewer so both colour a reading the same way.
//
// A unit is a row of payload.coolers: { name, type?, temps, remarks }.
// `type` ("chiller" | "freezer") was added with the unit editor; older records
// have none, so the type falls back to the name ("FREEZER 1" → freezer) and,
// for the original 8-row sheet, to rows 7 and 8.

export const TYPE = "ftr1_temperature";

/* Time slots printed on the sheet ("Corrective Action" kept for the old viewer). */
export const GRID_TIMES = ["8:00 AM", "11:00 AM", "2:00 PM", "5:00 PM", "8:00 PM", "10:00 PM"];
export const TIMES = [...GRID_TIMES, "Corrective Action"];

export const UNIT_TYPES = {
  chiller: { label: "Chiller", range: { min: 0, max: 5 }, limitType: "chilled", accent: "#2563eb", icon: "🧊" },
  freezer: { label: "Freezer", range: { min: -20, max: -16 }, limitType: "frozen", accent: "#0ea5e9", icon: "❄️" },
};

export const DEFAULT_UNITS = [
  { name: "Cooler 1", type: "chiller" },
  { name: "Cooler 2", type: "chiller" },
  { name: "Cooler 3", type: "chiller" },
  { name: "Cooler 4", type: "chiller" },
  { name: "Cooler 5", type: "chiller" },
  { name: "Cooler 6", type: "chiller" },
  { name: "FREEZER 1", type: "freezer" },
  { name: "FREEZER 2", type: "freezer" },
];

export const blankUnit = (name = "", type = "chiller") => ({ name, type, temps: {}, remarks: "" });

/** "chiller" | "freezer" for a unit (explicit type → name → legacy row index). */
export function unitTypeOf(unit, index, total) {
  if (unit?.type && UNIT_TYPES[unit.type]) return unit.type;
  if (/freez/i.test(String(unit?.name || ""))) return "freezer";
  if (total === 8 && (index === 6 || index === 7)) return "freezer";
  return "chiller";
}

/** classify() for TemperatureMatchingReport, bound to the unit list. */
export const makeClassify = (units) => (_name, i) => {
  const t = unitTypeOf(units[i], i, units.length);
  return { kind: t, ...UNIT_TYPES[t] };
};

const filled = (v) => v !== "" && v != null && !Number.isNaN(Number(v));

/** Readings outside their unit's range: [{ unit, index, time, value, range }]. */
export function outOfRange(units) {
  const out = [];
  (units || []).forEach((u, i) => {
    const { range } = UNIT_TYPES[unitTypeOf(u, i, units.length)];
    GRID_TIMES.forEach((t) => {
      const v = u?.temps?.[t];
      if (!filled(v)) return;
      const n = Number(v);
      if (n < range.min || n > range.max) out.push({ unit: u, index: i, time: t, value: n, range });
    });
  });
  return out;
}

/** KPI across every unit, each judged by its own range. */
export function calcKPI(units) {
  const all = [];
  (units || []).forEach((u) => {
    GRID_TIMES.forEach((t) => {
      const v = u?.temps?.[t];
      if (filled(v)) all.push(Number(v));
    });
  });
  const out = outOfRange(units).length;
  const filledSlots = all.length;
  const totalSlots = (units || []).length * GRID_TIMES.length;
  return {
    readings: filledSlots,
    total: totalSlots,
    out,
    compliance: filledSlots ? Math.round(((filledSlots - out) / filledSlots) * 100) : null,
    min: filledSlots ? Math.min(...all) : null,
    max: filledSlots ? Math.max(...all) : null,
  };
}
