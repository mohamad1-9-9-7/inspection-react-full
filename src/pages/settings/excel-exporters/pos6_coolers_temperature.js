// POS 6 coolers temperature log.
//
// The branch decides how many chillers and freezers it has and at what times it
// reads them, so the column list is built from the record rather than declared
// here — a sheet with four reading times must not be exported with six empty
// ones, and a branch that adds a 7 PM round must get that column.

import { buildPos6Sheet } from "./_pos6";

/* Accepted range per unit kind — kept in step with the input screen. */
const RANGES = {
  chiller: { min: 0, max: 5 },
  freezer: { min: null, max: -18 },
};

function outOfRange(kind, value) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || Number.isNaN(n)) return false;
  const r = RANGES[kind] || RANGES.chiller;
  if (r.min !== null && n < r.min) return true;
  if (r.max !== null && n > r.max) return true;
  return false;
}

const columnsFor = (p) => [
  { key: "sNo",       label: "S.No",   width: 7 },
  { key: "kindLabel", label: "Type",   width: 11 },
  { key: "name",      label: "Unit",   width: 22, align: "left" },
  ...(p.slots || []).map((s) => ({ key: `slot_${s}`, label: s, width: 10 })),
  { key: "remarks",   label: "Remarks / Corrective Action", width: 30, align: "left" },
];

const rowsFor = (p) =>
  (p.units || []).map((u, i) => {
    const row = {
      sNo: i + 1,
      kind: u.kind,
      kindLabel: u.kind === "freezer" ? "Freezer" : "Chiller",
      name: u.name,
      remarks: u.remarks,
    };
    (p.slots || []).forEach((s) => { row[`slot_${s}`] = u.temps?.[s] ?? ""; });
    return row;
  });

export default async function build(wb, record, ctx) {
  const p = record?.payload || {};
  const s = p.summary || {};

  return buildPos6Sheet(wb, record, ctx, {
    title: "Coolers Temperatures",
    formRef: "FSMS/BR/F04",
    subtitle: () =>
      `Chillers 0 °C to +5 °C  ·  Freezers −18 °C or colder` +
      (s.readings != null ? `   —   ${s.readings} readings, ${s.out || 0} out of range, average ${s.avg ?? "—"} °C` : ""),
    columns: columnsFor(p),
    getRows: rowsFor,
    // Only the reading cells are judged, and each against its own unit's range.
    cellWarn: ({ value, key, row }) => {
      if (!String(key).startsWith("slot_")) return undefined;
      if (value === "" || value === undefined) return undefined;
      return outOfRange(row.kind, value) ? "red" : "green";
    },
  });
}
