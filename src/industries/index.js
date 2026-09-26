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
    { id: "meat", label: "Meat manufacturing (Al Mawashi system)" },
    ...Object.values(TEMPLATES).map((t) => ({ id: t.id, label: t.labelEn || t.label })),
  ];
}

/** مفتاح صلاحية بطاقة داخل نشاط عام: "sweets:daily". مسبوق باسم النشاط كي
 *  لا يختلط أبداً بأقسام المواشي ذات الأسماء نفسها (daily, ohc, cars...). */
export const cardPermKey = (industry, cardId) => `${industry}:${cardId}`;

/** صفوف جدول الصلاحيات لحساب تابع لهذا النشاط: صف لكل بطاقة في قالبه.
 *  null لـ 'meat' (له قائمة SECTIONS الخاصة في AccountsManagementTab).
 *  بطاقات adminOnly لا تظهر — هي للأدمن فقط ولا تُمنح لموظف. */
export function permissionSectionsFor(id) {
  const t = isGenericIndustry(id) ? TEMPLATES[id] : null;
  if (!t) return null;
  return (t.cards || [])
    .filter((c) => !c.adminOnly)
    .map((c) => ({ id: cardPermKey(id, c.id), icon: c.icon, label: c.label, labelAr: c.labelAr }));
}

/** هل يرى هذا الحساب هذه البطاقة؟ أدمن الشركة / السوبر أدمن / "*" = الكل.
 *  غير ذلك: فقط البطاقات الممنوحة صراحةً — حساب بلا صلاحيات لهذا النشاط لا
 *  يرى أي بطاقة (قرار المالك: تُقفل حتى تُمنح). */
export function canSeeCard(user, industry, card) {
  const isAdmin = !!user?.isAdmin || !!user?.isSuperAdmin;
  if (card.adminOnly) return isAdmin;
  if (isAdmin) return true;
  const perms = Array.isArray(user?.permissions) ? user.permissions : [];
  return perms.includes("*") || perms.includes(cardPermKey(industry, card.id));
}

/** يبحث عن تعريف نوع تقرير داخل قالب (عبر كل البطاقات). */
export function findReportType(template, type) {
  if (!template) return null;
  for (const card of template.cards || []) {
    const report = (card.reports || []).find((r) => r.type === type);
    if (report) return { card, report };
  }
  return null;
}
