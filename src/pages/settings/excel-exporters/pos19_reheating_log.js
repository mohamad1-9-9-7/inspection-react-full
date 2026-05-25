import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "foodItem",         label: "Food Item",        width: 20 },
  { key: "batchNo",          label: "Batch No",         width: 12 },
  { key: "method",           label: "Method",           width: 14 },
  { key: "startTime",        label: "Start Time",       width: 12 },
  { key: "initialTemp",      label: "Initial °C",       width: 12 },
  { key: "endTime",          label: "End Time",         width: 12 },
  { key: "finalTemp",        label: "Final °C (≥75)",   width: 14 },
  { key: "destination",      label: "Destination",      width: 16 },
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Reheating Temperature Log",
    formRef: "FS-HACCP/POS19/RH/11",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "finalTemp") return;
      const n = parseFloat(value);
      if (!isNaN(n) && n < 75) return "red";
    },
  });
}
