// src/pages/haccp and iso/FSMSManual/flowDiagrams.js
// FSMS Manual — Annex B: Process Flow Diagrams as structured, bilingual data.
//
// These objects replace the old scanned PNG flow charts. Everything the
// on-screen diagram shows is derived from this data, so adding a new product
// flow = adding one object, and adding a step = adding one line. CCP steps,
// temperature chips and side branches (e.g. waste → disposal) are all data.
//
// Shape:
//   {
//     id, title, titleAr,
//     category: "chilled" | "frozen" | "processed" | "combined",
//     site,               // optional site name (butcheries)
//     steps: [
//       { label, labelAr, ccp?, temp?, branch? }
//     ]
//   }
//   branch: { label, labelAr, steps: [ { label, labelAr }, ... ] }

/* Shared step sequence for the multi-line butchery flow (Chilled / Frozen /
   Dry Meat / Sausage) — reused across the three branches. */
const COMBINED_STEPS = [
  { label: "Receiving — Chilled / Frozen / Dry Meat / Sausage", labelAr: "الاستلام — مبرّد / مجمّد / لحم مجفّف / نقانق", ccp: "CCP-1" },
  { label: "Storage", labelAr: "التخزين", ccp: "CCP-2", temp: "−18°C frozen · 0–4°C chilled" },
  { label: "Cutting / Deboning", labelAr: "التقطيع / نزع العظم" },
  { label: "Marination / Mixing process", labelAr: "التتبيل / الخلط" },
  { label: "Packing (vacuum if needed)", labelAr: "التعبئة (تفريغ الهواء عند الحاجة)" },
  { label: "Labeling (product name, date, expiry, storage conditions)", labelAr: "وضع الملصقات (اسم المنتج، التاريخ، الصلاحية، ظروف التخزين)" },
  { label: "Display", labelAr: "العرض", ccp: "CCP-3" },
  { label: "Sale", labelAr: "البيع" },
];

export const FSMS_PROCESS_FLOWS = [
  {
    id: "chilled-lamb-carcass",
    title: "Chilled Lamb Carcass",
    titleAr: "ذبيحة الضأن المبرّدة",
    category: "chilled",
    steps: [
      { label: "Receiving chilled meat", labelAr: "استلام اللحم المبرّد", ccp: "CCP-1" },
      { label: "Chilled storage", labelAr: "التخزين المبرّد", ccp: "CCP-2", temp: "≤ 5°C" },
      { label: "Preparation (weighing)", labelAr: "التحضير (الوزن)" },
      { label: "Dispatching", labelAr: "الإرسال" },
    ],
  },
  {
    id: "chilled-meat-production",
    title: "Chilled Meat (For Production)",
    titleAr: "اللحم المبرّد (للإنتاج)",
    category: "chilled",
    steps: [
      { label: "Receiving chilled meat", labelAr: "استلام اللحم المبرّد", ccp: "CCP-1" },
      { label: "Chilled storage", labelAr: "التخزين المبرّد", ccp: "CCP-2", temp: "≤ 5°C" },
      {
        label: "Preparation (cutting / weighing / deboning)",
        labelAr: "التحضير (التقطيع / الوزن / نزع العظم)",
        branch: {
          label: "Waste Collection", labelAr: "جمع المخلفات",
          steps: [{ label: "Disposal", labelAr: "التخلّص من المخلفات" }],
        },
      },
      { label: "Packing & labeling", labelAr: "التعبئة ووضع الملصقات" },
      { label: "Dispatching", labelAr: "الإرسال" },
    ],
  },
  {
    id: "frozen-lamb",
    title: "Frozen Lamb",
    titleAr: "الضأن المجمّد",
    category: "frozen",
    steps: [
      { label: "Receiving frozen meat", labelAr: "استلام اللحم المجمّد", ccp: "CCP-1" },
      { label: "Frozen storage", labelAr: "التخزين المجمّد", ccp: "CCP-2", temp: "−18°C" },
      { label: "Dispatching", labelAr: "الإرسال" },
    ],
  },
  {
    id: "frozen-chicken",
    title: "Frozen Chicken",
    titleAr: "الدجاج المجمّد",
    category: "frozen",
    steps: [
      { label: "Receiving of frozen chicken", labelAr: "استلام الدجاج المجمّد", ccp: "CCP-1" },
      { label: "Frozen storage", labelAr: "التخزين المجمّد", ccp: "CCP-2", temp: "≤ −18°C" },
      { label: "Thawing", labelAr: "إذابة التجميد", temp: "0–4°C" },
      { label: "Cutting / Deboning", labelAr: "التقطيع / نزع العظم" },
      { label: "Marination / Mixing process", labelAr: "التتبيل / الخلط" },
      { label: "Packing (vacuum if needed)", labelAr: "التعبئة (تفريغ الهواء عند الحاجة)" },
      { label: "Labeling (product name, date, expiry, storage conditions)", labelAr: "وضع الملصقات (اسم المنتج، التاريخ، الصلاحية، ظروف التخزين)" },
      { label: "Dispatching", labelAr: "الإرسال" },
    ],
  },
  {
    id: "processed-sausage",
    title: "Processed Product / Sausage",
    titleAr: "المنتج المُعالَج / النقانق",
    category: "processed",
    steps: [
      { label: "Receiving / Raw meat materials", labelAr: "الاستلام / المواد الخام من اللحوم" },
      { label: "Chilled storage", labelAr: "التخزين المبرّد", ccp: "CCP-1", temp: "≤ 5°C" },
      { label: "Cutting / Deboning / Trimming", labelAr: "التقطيع / نزع العظم / التشذيب" },
      { label: "Mincing / Grinding", labelAr: "الفرم / الطحن" },
      { label: "Mixing with ingredients & spices", labelAr: "الخلط مع المكوّنات والتوابل" },
      { label: "Stuffing into casings (filler)", labelAr: "الحشو في الأغلفة (آلة الحشو)" },
      { label: "Packing", labelAr: "التعبئة" },
      { label: "Labeling (product name, prod date, expiry, storage condition)", labelAr: "وضع الملصقات (اسم المنتج، تاريخ الإنتاج، الصلاحية، ظروف التخزين)" },
      { label: "Dispatching", labelAr: "الإرسال" },
    ],
  },
  {
    id: "butchery-albarsha",
    title: "Al Barsha Butchery — Chilled / Frozen / Sausages / Dry Meat",
    titleAr: "ملحمة البرشاء — مبرّد / مجمّد / نقانق / لحم مجفّف",
    category: "combined",
    site: "Al Barsha",
    steps: COMBINED_STEPS,
  },
  {
    id: "butchery-abudhabi",
    title: "Abu Dhabi Butchery — Chilled / Frozen / Sausages / Dry Meat",
    titleAr: "ملحمة أبوظبي — مبرّد / مجمّد / نقانق / لحم مجفّف",
    category: "combined",
    site: "Abu Dhabi",
    steps: COMBINED_STEPS,
  },
  {
    id: "butchery-alain",
    title: "Al Ain Butchery — Chilled / Frozen / Sausages / Dry Meat",
    titleAr: "ملحمة العين — مبرّد / مجمّد / نقانق / لحم مجفّف",
    category: "combined",
    site: "Al Ain",
    steps: COMBINED_STEPS,
  },
];

/* Category theming — colors + icon per product family. Consumed by the
   diagram renderer so a new category only needs one entry here. */
export const FLOW_THEMES = {
  chilled:   { grad: "linear-gradient(135deg,#0891b2,#06b6d4)", soft: "#ecfeff", ring: "#a5f3fc", ink: "#0e7490", icon: "❄️", label: "Chilled",   labelAr: "مبرّد" },
  frozen:    { grad: "linear-gradient(135deg,#1d4ed8,#3b82f6)", soft: "#eff6ff", ring: "#bfdbfe", ink: "#1e40af", icon: "🧊", label: "Frozen",    labelAr: "مجمّد" },
  processed: { grad: "linear-gradient(135deg,#b45309,#f59e0b)", soft: "#fffbeb", ring: "#fde68a", ink: "#b45309", icon: "🌭", label: "Processed", labelAr: "مُعالَج" },
  combined:  { grad: "linear-gradient(135deg,#0f766e,#14b8a6)", soft: "#f0fdfa", ring: "#99f6e4", ink: "#0f766e", icon: "🏭", label: "Multi-line", labelAr: "متعدّد الخطوط" },
};

/* Count CCP steps in a flow (incl. any inside side-branches). */
export function countCCPs(flow) {
  if (!flow?.steps) return 0;
  return flow.steps.reduce((n, s) => n + (s.ccp ? 1 : 0), 0);
}
