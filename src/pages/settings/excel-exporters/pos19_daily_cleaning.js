import { buildPos19Sheet } from "./_pos19_base";

const AREAS = [
  { key: "floorWallsDrains",   label: "Floor/Walls/Drains" },
  { key: "chillersFreezer",    label: "Chillers/Freezer" },
  { key: "cookingArea",        label: "Cooking Area" },
  { key: "preparationArea",    label: "Preparation Area" },
  { key: "packingArea",        label: "Packing Area" },
  { key: "frontUnderCounters", label: "Front & Under Counters" },
  { key: "handWashingStation", label: "Hand Washing Station" },
  { key: "equipments",         label: "Equipments" },
  { key: "utensils",           label: "Utensils" },
  { key: "worktopTables",      label: "Worktop Tables" },
  { key: "kitchenHoodFilters", label: "Kitchen Hood Filters" },
];

const columns = [
  { key: "cleanerName", label: "Cleaner Name", width: 18 },
  { key: "time",        label: "Time",         width: 10 },
  ...AREAS.map((a) => ({ key: a.key, label: a.label, width: 16 })),
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Daily Cleaning Checklist (Butchery)",
    formRef: "FS-HACCP/POS19/CLN/01",
    subtitle: (p) => `Branch: POS 19  |  Date: ${p.reportDate || ""}  |  LEGEND: (√) Satisfactory  ·  (✗) Needs Improvement`,
    columns,
    cellWarn: ({ value, key }) => {
      if (key === "cleanerName" || key === "time" || key === "correctiveAction") return;
      const s = String(value || "").trim();
      if (s === "√") return "green";
      if (s === "✗") return "red";
    },
  });
}
