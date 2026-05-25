// pos15 equipment inspection — adapts the POS 19 equipment inspection shape

import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",              label: "Date",              width: 12 },
  { key: "equipment",         label: "Equipment",         width: 22 },
  { key: "location",          label: "Location",          width: 16 },
  { key: "condition",         label: "Condition",         width: 12 },
  { key: "cleanliness",       label: "Cleanliness",       width: 12 },
  { key: "sanitized",         label: "Sanitized",         width: 12 },
  { key: "sanitizerType",     label: "Sanitizer Type",    width: 16 },
  { key: "concentration",     label: "Concentration",     width: 12 },
  { key: "result",            label: "Result",            width: 12 },
  { key: "correctiveAction",  label: "Corrective Action", width: 22 },
  { key: "checkedBy",         label: "Checked by",        width: 14 },
];

export default async function build(wb, record, ctx) {
  // Override ctx label so the header reads "POS 15"
  return buildPos19Sheet(wb, record, { ...ctx }, {
    title: "Equipment Inspection & Sanitizing Log",
    formRef: "FS-HACCP/POS15/EQP/14",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "result") return;
      const s = String(value || "").toLowerCase();
      if (/pass|ok/.test(s))   return "green";
      if (/fail|reject/.test(s)) return "red";
    },
  });
}
