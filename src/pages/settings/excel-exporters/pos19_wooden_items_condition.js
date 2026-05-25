import { buildPos19Sheet } from "./_pos19_base";

const CHECK_COLS = [
  { key: "intact",      label: "Intact" },
  { key: "noSplinters", label: "No Splinters" },
  { key: "noMold",      label: "No Mold" },
  { key: "clean",       label: "Clean" },
];

const columns = [
  { key: "date",       label: "Date",       width: 12 },
  { key: "itemName",   label: "Wooden Item", width: 20 },
  { key: "section",    label: "Section",    width: 16 },
  ...CHECK_COLS.map((c) => ({ key: c.key, label: c.label, width: 12 })),
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
  { key: "checkedBy",        label: "Checked by",        width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Wooden Items Condition Monitoring",
    formRef: "FS-HACCP/POS19/WD/17",
    columns,
    cellWarn: ({ value, key }) => {
      const check = CHECK_COLS.find((c) => c.key === key);
      if (!check) return;
      const s = String(value || "").trim();
      if (s === "√" || /yes|ok/i.test(s))  return "green";
      if (s === "✗" || /no|bad/i.test(s))  return "red";
    },
  });
}
