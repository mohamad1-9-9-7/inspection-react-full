// POS 6 coolers temperature log.
//
// The branch decides how many chillers and freezers it has and at what times it
// reads them, so the column list is built from the record rather than declared
// here — a sheet with four reading times must not be exported with six empty
// ones, and a branch that adds a 7 PM round must get that column.

import { buildPos6Sheet } from "./_pos6";
// The single definition of what a passing reading is — the input screen and the
// viewer read the same file, so a backup can never grade a chiller differently
// from the sheet the branch filled in.
import { RANGES, isOutOfRange } from "../../monitor/branches/pos6/pos6CoolerRanges";
import { rowsOf } from "./_lib";

const columnsFor = (p) => [
  { key: "sNo",       label: "S.No",   width: 7 },
  { key: "kindLabel", label: "Type",   width: 11 },
  { key: "name",      label: "Unit",   width: 22, align: "left" },
  ...rowsOf(p.slots).map((s) => ({ key: `slot_${s}`, label: s, width: 10 })),
  { key: "remarks",   label: "Remarks / Corrective Action", width: 30, align: "left" },
];

const rowsFor = (p) =>
  rowsOf(p.units).map((u, i) => {
    const row = {
      sNo: i + 1,
      kind: u.kind,
      kindLabel: u.kind === "freezer" ? "Freezer" : "Chiller",
      name: u.name,
      remarks: u.remarks,
    };
    rowsOf(p.slots).forEach((s) => { row[`slot_${s}`] = u.temps?.[s] ?? ""; });
    return row;
  });

export default async function build(wb, record, ctx) {
  const p = record?.payload || {};
  const s = p.summary || {};

  return buildPos6Sheet(wb, record, ctx, {
    title: "Coolers Temperatures",
    formRef: "FSMS/BR/F04",
    subtitle: () =>
      `Chillers ${RANGES.chiller.label}  ·  Freezers ${RANGES.freezer.label}` +
      (s.readings != null ? `   —   ${s.readings} readings, ${s.out || 0} out of range, average ${s.avg ?? "—"} °C` : ""),
    columns: columnsFor(p),
    getRows: rowsFor,
    // Only the reading cells are judged, and each against its own unit's range.
    cellWarn: ({ value, key, row }) => {
      if (!String(key).startsWith("slot_")) return undefined;
      if (value === "" || value === undefined) return undefined;
      return isOutOfRange(row.kind, value) ? "red" : "green";
    },
  });
}
