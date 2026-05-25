import { buildPos19Sheet } from "./_pos19_base";

// The PH checklist for POS 19 — same general columns as QCS PH but POS 19 style.
const columns = [
  { key: "no",                  label: "S. No",          width: 7  },
  { key: "employeeName",        label: "Employee Name",  width: 22 },
  { key: "nails",               label: "Nails",          width: 10 },
  { key: "hair",                label: "Hair",           width: 10 },
  { key: "notWearingJewelries", label: "No jewelry",     width: 11 },
  { key: "wearingCleanCloth",   label: "Clean clothes / hair net / gloves", width: 26 },
  { key: "communicableDisease", label: "Communicable disease", width: 16 },
  { key: "openWounds",          label: "Open wounds/cuts", width: 14 },
  { key: "remarks",             label: "Remarks",        width: 22 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Personal Hygiene Checklist",
    formRef: "FS-HACCP/POS19/PH/02",
    columns: columns.map((c, i) => ({ ...c, get: i === 0 ? (_row, _p, idx) => idx + 1 : undefined })),
    getRows: (p) => Array.isArray(p.personalHygiene) ? p.personalHygiene : (p.entries || []),
  });
}
