import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",             label: "Date",             width: 12 },
  { key: "itemName",         label: "Glass Item",       width: 22 },
  { key: "section",          label: "Section",          width: 16 },
  { key: "condition",        label: "Condition",        width: 14 },
  { key: "broken",           label: "Broken?",          width: 10 },
  { key: "action",           label: "Action Taken",     width: 22 },
  { key: "checkedBy",        label: "Checked by",       width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Glass Items Condition Monitoring",
    formRef: "FS-HACCP/POS19/GLS/16",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "broken") return;
      if (/yes|broken/i.test(String(value))) return "red";
    },
  });
}
