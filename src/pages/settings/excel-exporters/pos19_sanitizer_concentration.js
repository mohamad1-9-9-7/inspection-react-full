import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",             label: "Date",                 width: 12 },
  { key: "time",             label: "Time",                 width: 10 },
  { key: "sanitizerType",    label: "Sanitizer Type",       width: 18 },
  { key: "location",         label: "Location / Area",      width: 22 },
  { key: "targetConc",       label: "Target Conc. (ppm)",   width: 14 },
  { key: "actualConc",       label: "Actual Conc. (ppm)",   width: 14 },
  { key: "result",           label: "Result",               width: 14 },
  { key: "correctiveAction", label: "Corrective Action",    width: 22 },
  { key: "checkedBy",        label: "Checked by",           width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Sanitizer Concentration Log",
    formRef: "FS-HACCP/POS19/SAN/08",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "result") return;
      const s = String(value || "").toLowerCase();
      if (/pass|ok/.test(s))   return "green";
      if (/fail|reject/.test(s)) return "red";
    },
  });
}
