// src/pages/hse/HSELadderSafety.jsx
// F-33: قائمة فحص سلامة السلالم — Ladder Safety Checklist (SBG-HSE-021)

import React from "react";
import HSEChecklist from "./HSEChecklistShared";

const SECTIONS = [
  {
    id: "condition",
    titleAr: "1. حالة السلم (Ladder Condition)",
    titleEn: "1. Ladder Condition",
    items: [
      { ar: "كل الدرجات/العتبات بحالة جيدة", en: "All rungs/cleats/steps in good condition" },
      { ar: "السواري الجانبية سليمة (لا تشققات/انحناءات/كسور)", en: "Side rails intact (no cracks/bends/breaks)" },
      { ar: "الدرجات مُثبَّتة بإحكام في السواري الجانبية", en: "Rungs fit tightly into side rails" },
      { ar: "السلم خالٍ من الصدأ (للمعدنية)", en: "Ladder free of corrosion (for metal ladders)" },
      { ar: "العدد والملحقات سليمة وغير تالفة", en: "Hardware and fittings secure and undamaged" },
      { ar: "الأجزاء المتحركة تعمل بسلاسة (دون لعب زائد)", en: "Movable parts operate smoothly (no excess play)" },
      { ar: "السلالم التالفة موسومة \"لا تستخدم\" ومنزوعة من الخدمة", en: "Damaged ladders tagged \"Do not use\" and removed" },
    ],
  },
  {
    id: "suitability",
    titleAr: "2. ملاءمة الاستخدام (Suitability for Use)",
    titleEn: "2. Suitability for Use",
    items: [
      { ar: "السلم مناسب للعمل المراد تنفيذه", en: "Ladder suitable for the work being carried out" },
      { ar: "تحمّل السلم أكبر من وزن العامل + الأدوات", en: "Ladder rating exceeds worker + tools weight" },
      { ar: "طول السلم كافٍ للوصول الآمن", en: "Ladder length adequate for safe reach" },
      { ar: "لا يصل خصر العامل أعلى من قمة السلم/الحاجز", en: "Worker's waist doesn't rise above top step/handrail" },
      { ar: "السلم له أقدام مضادة للانزلاق سليمة", en: "Ladder has non-slip safety feet in good condition" },
    ],
  },
  {
    id: "placement",
    titleAr: "3. وضع السلم (Placement)",
    titleEn: "3. Ladder Placement",
    items: [
      { ar: "السلم على سطح مستوٍ وثابت", en: "Ladder placed on flat, stable surface" },
      { ar: "السلم بزاوية 75° (نسبة 4:1)", en: "Ladder set at 75° angle (4:1 ratio)" },
      { ar: "السلم الممتد يتجاوز نقطة الهبوط بمقدار 90 سم", en: "Extension ladder extends ≥90 cm beyond landing" },
      { ar: "السلم القابل للطي مفتوح بالكامل ومُقفل", en: "Stepladder fully open and locked" },
      { ar: "بعيد عن الأبواب غير المُقفلة (أو موضوع لافتات)", en: "Away from unlocked doors (or warning signs posted)" },
      { ar: "بعيد عن خطوط الكهرباء (للمعدنية)", en: "Clear of power lines (for metal ladders)" },
    ],
  },
  {
    id: "use",
    titleAr: "4. الاستخدام الآمن (Safe Use)",
    titleEn: "4. Safe Use",
    items: [
      { ar: "العمال يحملون الأدوات بحزام/كيس (وليس باليد)", en: "Workers carry tools by belt/bag (not in hand)" },
      { ar: "ينتقل السلم باستمرار بدلاً من المط (Overstretching)", en: "Ladder moved frequently instead of overstretching" },
      { ar: "شخص واحد فقط على السلم في الوقت الواحد", en: "Only one person on ladder at a time" },
      { ar: "العامل يواجه السلم دائماً (وجهاً لوجه)", en: "Worker always faces ladder" },
      { ar: "ثلاث نقاط تماس دائماً (3-point contact)", en: "3-point contact maintained always" },
      { ar: "لا يوجد خطر صدمة كهربائية (سلم رطب أو معدني قرب كهرباء)", en: "No risk of electric shock (wet/metal ladder near electricity)" },
    ],
  },
  {
    id: "inspection",
    titleAr: "5. الفحص والتدريب (Inspection & Training)",
    titleEn: "5. Inspection & Training",
    items: [
      { ar: "بطاقات/علامات لتحديد السلالم غير الآمنة متاحة", en: "Tags/labels available to identify unsafe ladders" },
      { ar: "السلالم تخضع لفحص يومي قبل الاستخدام", en: "Ladders subject to daily pre-use check" },
      { ar: "التفتيشات الموثقة تُجرى دورياً", en: "Documented inspections at regular intervals" },
      { ar: "العمال مدربون على الاستخدام الآمن للسلالم", en: "Workers instructed on safe ladder use" },
    ],
  },
];

export default function HSELadderSafety() {
  return (
    <HSEChecklist
      storageKey="ladder_safety_checks"
      formCode="F-33"
      titleAr="قائمة فحص سلامة السلالم (F-33)"
      titleEn="Ladder Safety Checklist (F-33)"
      subtitleAr={`22 بنداً لفحص السلالم (مطابق SBG-HSE-021) — كل "لا" يستدعي إجراء تصحيحي فوري`}
      subtitleEn={`22-item ladder safety checklist (per SBG-HSE-021) — each "No" requires immediate corrective action`}
      icon="🪜"
      sourceCode="SBG-HSE-021"
      sections={SECTIONS}
      extraFields={[
        { v: "ladderId", ar: "رقم/كود السلم", en: "Ladder ID/Code", type: "text" },
        { v: "ladderType", ar: "نوع السلم", en: "Ladder Type", type: "text" },
      ]}
    />
  );
}
