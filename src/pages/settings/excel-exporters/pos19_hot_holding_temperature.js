import { buildPos19Sheet } from "./_pos19_base";

const TIME_SLOTS = [
  { key: "lunch",   label: "Lunch (12:00)" },
  { key: "evening", label: "Evening (17:00)" },
  { key: "closing", label: "Closing (22:00)" },
];

const columns = [
  { key: "foodItem",   label: "Food Item",   width: 20 },
  { key: "targetTemp", label: "Target Temp", width: 12 },
  ...TIME_SLOTS.flatMap((s) => [
    { key: `${s.key}_time`, label: `${s.label} Time`, width: 12 },
    { key: `${s.key}_temp`, label: `${s.label} °C`,   width: 12 },
  ]),
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
  { key: "checkedBy",        label: "Checked by",        width: 16 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Hot Holding Temperature Log",
    formRef: "FS-HACCP/POS19/HH/06",
    columns,
    cellWarn: ({ value, key }) => {
      if (!/_temp$/.test(key)) return;
      const n = parseFloat(value);
      if (!isNaN(n) && n < 60) return "red";
    },
  });
}
