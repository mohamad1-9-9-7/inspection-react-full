// src/pages/hse/HSEHandPowerTools.jsx
// F-32: فحص أدوات يدوية وكهربائية — Hand & Power Tools Safety Checklist (SBG-HSE-020)

import React from "react";
import HSEChecklist from "./HSEChecklistShared";

const SECTIONS = [
  {
    id: "general",
    titleAr: "1. عام (General)",
    titleEn: "1. General",
    items: [
      { ar: "الأدوات مفحوصة قبل الاستخدام (Pre-use check)", en: "Tools inspected before use (Pre-use check)" },
      { ar: "الأدوات مناسبة للمهمة المنفذة", en: "Tools suitable for the task" },
      { ar: "العمال مدربون على استخدام الأدوات", en: "Workers trained on tool use" },
      { ar: "الأدوات التالفة موسومة \"لا تستخدم\" ومنزوعة", en: "Damaged tools tagged \"Do not use\" and removed" },
      { ar: "الأدوات تُحفظ في صناديق/خزائن مناسبة", en: "Tools stored in proper boxes/cabinets" },
    ],
  },
  {
    id: "hand_tools",
    titleAr: "2. الأدوات اليدوية (Hand Tools)",
    titleEn: "2. Hand Tools",
    items: [
      { ar: "المقابض سليمة وغير متشققة", en: "Handles sound and not cracked" },
      { ar: "رؤوس المطارق/الكماشات بحالة جيدة", en: "Hammer/plier heads in good condition" },
      { ar: "السكاكين حادة ولها أغلفة عند عدم الاستخدام", en: "Knives sharp with sheaths when not in use" },
      { ar: "المفاتيح بأحجام صحيحة للصواميل", en: "Wrenches correctly sized for nuts" },
      { ar: "الأزاميل/المفاكات لا توجد بها رؤوس مشدوخة (Mushroom heads)", en: "Chisels/screwdrivers free of mushroom heads" },
    ],
  },
  {
    id: "power_tools",
    titleAr: "3. الأدوات الكهربائية (Power Tools)",
    titleEn: "3. Power Tools",
    items: [
      { ar: "الأسلاك سليمة وغير مكشوفة", en: "Cords intact, no exposed wires" },
      { ar: "القوابس ثلاثية الأطراف (مع تأريض)", en: "Three-prong plugs (with grounding)" },
      { ar: "ELCB/RCD مُفعّل", en: "ELCB/RCD active" },
      { ar: "الجرّاخات مزوّدة بأغطية الأمان", en: "Grinders with safety guards" },
      { ar: "المناشير الدائرية بأغطية واقية", en: "Circular saws with protective covers" },
      { ar: "الأدوات معزولة مزدوجاً أو مؤرَّضة", en: "Tools double-insulated or grounded" },
      { ar: "زر التشغيل/الإيقاف يعمل بشكل سليم", en: "On/off switch operates properly" },
      { ar: "لا تُستخدم في مناطق رطبة بدون حماية", en: "Not used in wet areas without protection" },
    ],
  },
  {
    id: "pneumatic",
    titleAr: "4. الأدوات الهوائية (Pneumatic Tools)",
    titleEn: "4. Pneumatic Tools",
    items: [
      { ar: "خراطيم الهواء مُثبَّتة بمشابك أمان", en: "Air hoses secured with safety clips" },
      { ar: "أدوات الـ Impact لها مَشابك احتجاز (Retainers)", en: "Impact tools have retaining clips" },
      { ar: "الضغط ضمن الحدود الموصى بها", en: "Pressure within recommended limits" },
      { ar: "صمامات إغلاق سريع متاحة", en: "Quick-shutoff valves available" },
    ],
  },
  {
    id: "ppe",
    titleAr: "5. معدات الوقاية (PPE)",
    titleEn: "5. PPE",
    items: [
      { ar: "نظارات السلامة مرتداة", en: "Safety glasses worn" },
      { ar: "قفازات مناسبة للأداة", en: "Gloves appropriate for the tool" },
      { ar: "حماية السمع في المناطق المرتفعة الضوضاء", en: "Hearing protection in noisy areas" },
      { ar: "أحذية السلامة مرتداة", en: "Safety boots worn" },
      { ar: "أقنعة/فلاتر للأدوات المُولِّدة للغبار", en: "Masks/filters for dust-generating tools" },
    ],
  },
];

export default function HSEHandPowerTools() {
  return (
    <HSEChecklist
      storageKey="hand_power_tools_checks"
      formCode="F-32"
      titleAr="فحص الأدوات اليدوية والكهربائية (F-32)"
      titleEn="Hand & Power Tools Safety Checklist (F-32)"
      subtitleAr="فحص شامل للأدوات (مطابق SBG-HSE-020)"
      subtitleEn="Comprehensive tool inspection (per SBG-HSE-020)"
      icon="🔧"
      sourceCode="SBG-HSE-020"
      sections={SECTIONS}
    />
  );
}
