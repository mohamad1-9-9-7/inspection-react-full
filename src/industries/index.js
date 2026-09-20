// src/industries/index.js
// سجلّ قوالب الأنشطة (الصناعات).
//
// 'meat' = نظام المواشي الكامل المكتوب يدوياً (فروع POS، QCS، HACCP...) — ليس
// له قالب هنا لأنه ليس مبنياً على المحرّك العام؛ الشركة نوعها 'meat' تكمل على
// نظامها الحالي بلا أي تغيير.
//
// أي نوع آخر = قالب ملف يقوده المحرّك العام (pages/generic). أضف نشاطاً جديداً
// باستيراد ملف قالبه وتسجيله هنا — لا شيء آخر يتغيّر.

import sweets from "./sweets";

const TEMPLATES = {
  sweets,
  // مستقبلاً: import bakery from "./bakery"; ... bakery,
};

/** قالب النشاط، أو null إن لم يوجد (يشمل 'meat' الذي لا قالب له عمداً). */
export function getIndustryTemplate(id) {
  return (id && TEMPLATES[id]) || null;
}

/** هل هذا النشاط يعمل على المحرّك العام (أي ليس 'meat' وله قالب مسجّل)؟ */
export function isGenericIndustry(id) {
  return !!id && id !== "meat" && !!TEMPLATES[id];
}

/** كل الأنواع المسجّلة (لقوائم الاختيار في مركز الشركات). meat مضاف يدوياً
 *  لأنه ليس في TEMPLATES لكنه خيار صالح (النظام الافتراضي). */
export function industryOptions() {
  return [
    { id: "meat", label: "تصنيع لحوم (نظام المواشي)" },
    ...Object.values(TEMPLATES).map((t) => ({ id: t.id, label: t.label })),
  ];
}

/** يبحث عن تعريف نوع تقرير داخل قالب، مع قسمه. */
export function findReportType(template, type) {
  if (!template) return null;
  for (const section of template.sections || []) {
    const report = (section.reports || []).find((r) => r.type === type);
    if (report) return { section, report };
  }
  return null;
}
