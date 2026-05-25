import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",             label: "Date",             width: 12 },
  { key: "fryerId",          label: "Fryer ID",         width: 12 },
  { key: "oilType",          label: "Oil Type",         width: 16 },
  { key: "appearance",       label: "Appearance",       width: 14 },
  { key: "color",            label: "Color",            width: 12 },
  { key: "tpm",              label: "TPM %",            width: 10 },
  { key: "result",           label: "Result",           width: 12 },
  { key: "action",           label: "Action",           width: 20 },
  { key: "checkedBy",        label: "Checked by",       width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Oil Quality Monitoring",
    formRef: "FS-HACCP/POS19/OIL/07",
    columns,
    cellWarn: ({ value, key }) => {
      if (key === "tpm") {
        const n = parseFloat(value);
        if (!isNaN(n) && n > 24) return "red";
      }
      if (key === "result") {
        const s = String(value || "").toLowerCase();
        if (/pass|ok/.test(s))   return "green";
        if (/fail|reject/.test(s)) return "red";
      }
    },
  });
}
