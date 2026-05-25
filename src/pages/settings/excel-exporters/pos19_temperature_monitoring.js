import { buildPos19Sheet } from "./_pos19_base";

const READINGS = [
  { key: "am", label: "Morning" },
  { key: "pm", label: "Midday" },
  { key: "ev", label: "Evening" },
];

const columns = [
  { key: "equipment",       label: "Equipment / Location", width: 22 },
  { key: "unitType",        label: "Unit Type",            width: 12 },
  { key: "targetTemp",      label: "Target Temp",          width: 12 },
  ...READINGS.flatMap((r) => [
    { key: `${r.key}_time`, label: `${r.label} Time`,      width: 10 },
    { key: `${r.key}_temp`, label: `${r.label} °C`,        width: 11 },
  ]),
  { key: "correctiveAction", label: "Corrective Action",   width: 26 },
  { key: "checkedBy",        label: "Checked by",           width: 16 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Temperature Monitoring Log",
    formRef: "FS-HACCP/POS19/TMP/09",
    subtitle: (p) => `Branch: POS 19  |  Date: ${p.reportDate || ""}  |  Critical Limits: Chiller ≤5°C | Freezer ≤-18°C | Ambient ≤25°C`,
    columns,
    cellWarn: ({ value, key, row }) => {
      if (/_temp$/.test(key)) {
        const n = parseFloat(value);
        if (isNaN(n)) return;
        const unit = String(row.unitType || "").toLowerCase();
        if (unit === "chiller" && n > 5)   return "red";
        if (unit === "freezer" && n > -18) return "red";
        if (unit === "ambient" && n > 25)  return "red";
      }
    },
  });
}
