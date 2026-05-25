import { buildPos19Sheet } from "./_pos19_base";

const SLOTS = [
  { key: "p1", label: "Product 1" },
  { key: "p2", label: "Product 2" },
  { key: "p3", label: "Product 3" },
];

const columns = [
  { key: "date", label: "Date", width: 14 },
  ...SLOTS.flatMap((s) => [
    { key: `${s.key}_name`, label: `${s.label} Name`,      width: 18 },
    { key: `${s.key}_time`, label: `${s.label} Time`,      width: 10 },
    { key: `${s.key}_temp`, label: `${s.label} °C`,        width: 11 },
  ]),
  { key: "comment",     label: "Comment",      width: 22 },
  { key: "monitoredBy", label: "Monitored By", width: 16 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Cooking Temperature Monitoring Record",
    formRef: "FSM-QM/REC/CR",
    subtitle: (p) => `Branch: POS 19  |  Area: ${p.area || ""}  |  Date: ${p.reportDate || ""}  |  Restaurant: Al Mawashi – Braai Restaurant LLC`,
    columns,
    cellWarn: ({ value, key }) => {
      if (/_temp$/.test(key)) {
        const n = parseFloat(value);
        if (!isNaN(n) && n < 75) return "red";
      }
    },
  });
}
