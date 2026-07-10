import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "foodItem",         label: "Food Item",        width: 20 },
  { key: "batchNo",          label: "Batch No",         width: 12 },
  { key: "cookedTime",       label: "Cooked Time",      width: 12 },
  { key: "cookedTemp",       label: "Cooked °C (≥60)",  width: 13 },
  { key: "check2hTime",      label: "2h Time",          width: 12 },
  { key: "check2hTemp",      label: "2h °C (≤21)",      width: 13 },
  { key: "check6hTime",      label: "6h Time",          width: 12 },
  { key: "check6hTemp",      label: "6h °C (≤5)",       width: 13 },
  { key: "destination",      label: "Destination",      width: 16 },
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Cooling Temperature Log",
    formRef: "FS-HACCP/POS19/CL/10",
    columns,
    cellWarn: ({ value, key }) => {
      const n = parseFloat(value);
      if (isNaN(n)) return;
      if (key === "cookedTemp"  && n < 60) return "red";
      if (key === "check2hTemp" && n > 21) return "red";
      if (key === "check6hTemp" && n > 5)  return "red";
    },
  });
}
