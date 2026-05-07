// src/pages/hse/HSEWelfare.jsx
// F-34: قائمة فحص مرافق رعاية العمال — Welfare Checklist (SBG-HSE-024)

import React from "react";
import HSEChecklist from "./HSEChecklistShared";

const SECTIONS = [
  {
    id: "drinking_water",
    titleAr: "1. مياه الشرب (Drinking Water)",
    titleEn: "1. Drinking Water",
    items: [
      { ar: "مياه شرب باردة متوفرة لجميع العمال", en: "Cool drinking water available for all workers" },
      { ar: "أكواب فردية أو نوافير مياه نظيفة", en: "Individual cups or clean water fountains" },
      { ar: "مصدر المياه نظيف ومحمي من التلوث", en: "Water source clean and protected from contamination" },
      { ar: "موزعات المياه قريبة من مناطق العمل (≤ 50م)", en: "Water dispensers near work areas (≤50 m)" },
      { ar: "كمية كافية في الأيام الحارة (≥ 1 لتر/ساعة/عامل)", en: "Sufficient quantity in hot days (≥1 L/hour/worker)" },
    ],
  },
  {
    id: "toilets",
    titleAr: "2. دورات المياه (Toilets)",
    titleEn: "2. Toilets",
    items: [
      { ar: "عدد كافٍ من دورات المياه (1 لكل 25 عامل)", en: "Sufficient toilets (1 per 25 workers)" },
      { ar: "دورات منفصلة للذكور والإناث", en: "Separate toilets for male/female" },
      { ar: "دورات المياه نظيفة ومُعقَّمة يومياً", en: "Toilets clean and sanitized daily" },
      { ar: "ورق تواليت/مناديل متوفرة", en: "Toilet paper/tissues available" },
      { ar: "تهوية كافية ولا تنبعث منها روائح", en: "Adequate ventilation, no odors" },
      { ar: "إنارة كافية", en: "Adequate lighting" },
      { ar: "أحواض غسل اليدين قريبة من دورات المياه", en: "Hand-wash basins near toilets" },
    ],
  },
  {
    id: "handwash",
    titleAr: "3. غسيل اليدين (Hand Washing)",
    titleEn: "3. Hand Washing",
    items: [
      { ar: "أحواض غسل يدين بمياه ساخنة وباردة", en: "Hand-wash basins with hot and cold water" },
      { ar: "صابون متوفر دائماً", en: "Soap always available" },
      { ar: "مجففات يدين أو مناديل ورقية", en: "Hand dryers or paper towels" },
      { ar: "محطات تعقيم (Hand sanitizer) في نقاط الدخول", en: "Hand sanitizer stations at entry points" },
      { ar: "لافتات غسيل اليدين معروضة (خاصة لعاملي الأغذية)", en: "Hand-washing posters displayed (esp. for food handlers)" },
    ],
  },
  {
    id: "rest_area",
    titleAr: "4. مناطق الاستراحة (Rest Areas)",
    titleEn: "4. Rest Areas",
    items: [
      { ar: "منطقة استراحة مخصصة منفصلة عن العمل", en: "Dedicated rest area separate from work area" },
      { ar: "مكيفة في الصيف ومدفأة في الشتاء", en: "Air-conditioned in summer, heated in winter" },
      { ar: "كراسي وطاولات كافية", en: "Sufficient chairs and tables" },
      { ar: "نظيفة ومرتبة", en: "Clean and tidy" },
      { ar: "ميكروويف/ثلاجة متوفرة (إن أمكن)", en: "Microwave/fridge available (if applicable)" },
    ],
  },
  {
    id: "first_aid",
    titleAr: "5. الإسعافات الأولية (First Aid)",
    titleEn: "5. First Aid",
    items: [
      { ar: "صناديق إسعاف أولي متاحة وقابلة للوصول", en: "First aid kits available and accessible" },
      { ar: "محتويات الصناديق كاملة وغير منتهية الصلاحية", en: "Kit contents complete and not expired" },
      { ar: "مسعف مدرَّب متواجد بالموقع", en: "Trained first-aider on site" },
      { ar: "أرقام الطوارئ معلَّقة في مكان واضح", en: "Emergency numbers posted in visible location" },
      { ar: "غسّالة عيون / دش طوارئ متاحة (للمناطق الكيميائية)", en: "Eyewash / emergency shower (for chemical areas)" },
    ],
  },
  {
    id: "ppe_storage",
    titleAr: "6. تخزين معدات الوقاية (PPE Storage)",
    titleEn: "6. PPE Storage",
    items: [
      { ar: "خزائن منفصلة لكل عامل (للملابس الشخصية)", en: "Separate lockers for each worker (personal clothing)" },
      { ar: "خزائن لمعدات الوقاية (PPE)", en: "PPE storage cabinets" },
      { ar: "PPE يُغسَل ويُعقَّم بشكل منتظم", en: "PPE laundered and sanitized regularly" },
      { ar: "PPE التالف يُستبدل فوراً", en: "Damaged PPE replaced immediately" },
    ],
  },
  {
    id: "general",
    titleAr: "7. مرافق عامة (General Facilities)",
    titleEn: "7. General Facilities",
    items: [
      { ar: "إنارة كافية في جميع المرافق", en: "Adequate lighting in all facilities" },
      { ar: "تهوية كافية وجودة هواء جيدة", en: "Adequate ventilation and air quality" },
      { ar: "حاويات قمامة كافية ومُغطاة", en: "Sufficient covered waste containers" },
      { ar: "مكافحة الحشرات/القوارض فعّالة", en: "Effective pest/rodent control" },
      { ar: "لا توجد مياه راكدة", en: "No standing water" },
      { ar: "مكان منفصل للوضوء/الصلاة", en: "Separate area for ablution/prayer" },
      { ar: "لافتات السلامة معروضة بلغات العمال", en: "Safety signs in workers' languages" },
    ],
  },
];

export default function HSEWelfare() {
  return (
    <HSEChecklist
      storageKey="welfare_checks"
      formCode="F-34"
      titleAr="قائمة فحص رعاية العمال (F-34)"
      titleEn="Worker Welfare Checklist (F-34)"
      subtitleAr="فحص شامل لمرافق العمال (مطابق SBG-HSE-024) — مياه/دورات/استراحة/إسعافات"
      subtitleEn="Comprehensive welfare facilities check (per SBG-HSE-024) — Water/Toilets/Rest/First Aid"
      icon="🏠"
      sourceCode="SBG-HSE-024"
      sections={SECTIONS}
      extraFields={[
        { v: "workerCount", ar: "عدد العمال في الموقع", en: "Total Workers on Site", type: "number" },
      ]}
    />
  );
}
