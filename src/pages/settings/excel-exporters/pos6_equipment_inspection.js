// POS 6 equipment inspection & sanitizing log.
import { buildPos6Sheet, numbered, verdictWarn, S_NO } from "./_pos6";

const columns = [
  S_NO,
  { key: "equipment",            label: "Equipment / Utensils",   width: 30, align: "left" },
  { key: "freeFromDamage",       label: "Free from damage",       width: 13 },
  { key: "freeFromBrokenPieces", label: "Free from broken pieces", width: 15 },
  { key: "s_8_9_AM",             label: "8–9 AM",                 width: 10 },
  { key: "s_12_1_PM",            label: "12–1 PM",                width: 10 },
  { key: "s_4_5_PM",             label: "4–5 PM",                 width: 10 },
  { key: "s_8_9_PM",             label: "8–9 PM",                 width: 10 },
  { key: "s_12_1_AM",            label: "12–1 AM",                width: 10 },
  { key: "correctiveAction",     label: "Corrective Action",      width: 26, align: "left" },
  { key: "checkedByRow",         label: "Checked by",             width: 16, align: "left" },
];

export default async function build(wb, record, ctx) {
  return buildPos6Sheet(wb, record, ctx, {
    title: "Equipment Inspection & Sanitizing Log",
    formRef: "FSMS/BR/F17",
    subtitle: (p) => (p.section ? `Section: ${p.section}` : ""),
    columns,
    getRows: (p) => numbered(p.entries || []),
    cellWarn: verdictWarn,
  });
}
