// pos15 equipment inspection — the same FSMS/BR/F17 slot sheet as POS 6:
// damage / broken-piece checks plus five time-slot ticks per equipment row.
// Column order matches POS15EquipmentInspectionSanitizingLogView.

import { buildPos19Sheet } from "./_pos19_base";
import { numbered, verdictWarn, S_NO } from "./_pos6";
import { rowsOf } from "./_lib";

const columns = [
  S_NO,
  { key: "equipment",            label: "Equipment / Utensils",    width: 30, align: "left" },
  { key: "freeFromDamage",       label: "Free from damage",        width: 13 },
  { key: "freeFromBrokenPieces", label: "Free from broken pieces", width: 15 },
  { key: "s_8_9_AM",             label: "8–9 AM",                  width: 10 },
  { key: "s_12_1_PM",            label: "12–1 PM",                 width: 10 },
  { key: "s_4_5_PM",             label: "4–5 PM",                  width: 10 },
  { key: "s_8_9_PM",             label: "8–9 PM",                  width: 10 },
  { key: "s_12_1_AM",            label: "12–1 AM",                 width: 10 },
  { key: "correctiveAction",     label: "Corrective Action",       width: 26, align: "left" },
  { key: "checkedByRow",         label: "Checked by",              width: 16, align: "left" },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    branchLabel: "POS 15",
    company: "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    title: "Equipment Inspection & Sanitizing Log",
    formRef: "FSMS/BR/F17",
    subtitle: (p) => (p.section ? `Section: ${p.section}` : ""),
    columns,
    getRows: (p) => numbered(rowsOf(p.entries)),
    cellWarn: verdictWarn,
  });
}
