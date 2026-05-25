import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "time",             label: "Time",             width: 12 },
  { key: "unitType",         label: "Unit",             width: 10 },
  { key: "foodItem",         label: "Food Item",        width: 22 },
  { key: "actualTemp",       label: "Actual °C",        width: 14 },
  { key: "criticalLimit",    label: "Critical Limit",   width: 14 },
  { key: "result",           label: "Result",           width: 14 },
  { key: "by",               label: "By",               width: 10 },
  { key: "correctiveAction", label: "Corrective Action", width: 26 },
  { key: "verifiedBy",       label: "Verified by",      width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Food Temperature Verification",
    formRef: "FS-HACCP/POS19/FTV/05",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "result") return;
      const s = String(value || "").toLowerCase();
      if (/pass|ok|good/.test(s))     return "green";
      if (/fail|reject|bad/.test(s))  return "red";
    },
  });
}
