// src/pages/haccp and iso/OpportunityRegister/OpportunityRegisterView.jsx
// FSMS Opportunity Register — ISO 22000:2018 Clause 6.1 (actions to address risks AND opportunities)
// Companion register to Risk Register. Sourced from FSMS-RA-01 (TELT controlled document).
// Distinct from the Risk Register: Risks = what can hurt FSMS; Opportunities = positive actions arising
// from external or internal factors that we can leverage to strengthen FSMS performance.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "fsms_opportunity_register_item";

/* ─────────────────────────────────────────────────────────────
   Factor source — External vs Internal (per FSMS-RA-01 structure)
   ───────────────────────────────────────────────────────────── */
const SOURCES = [
  { v: "external", ar: "عامل خارجي", en: "External Factor" },
  { v: "internal", ar: "عامل داخلي", en: "Internal Factor" },
];

/* ─────────────────────────────────────────────────────────────
   Seed data — 7 external + 11 internal opportunities transcribed
   verbatim from FSMS-RA-01 Risk Assessment & Opportunity Register
   ───────────────────────────────────────────────────────────── */
const SEED_OPPORTUNITIES = [
  /* ─────── EXTERNAL FACTORS (7) ─────── */
  {
    id: "opp-ext-1", source: "external",
    factor:        { ar: "جودة المورد",                                     en: "Supplier quality" },
    impact:        { ar: "مواد خام ملوّثة",                                  en: "Contaminated raw materials" },
    opportunity:   { ar: "تدقيق الموردين، برنامج الموردين المعتمدين",       en: "Supplier audits, approved supplier program" },
    actions:       { ar: "تقييم الموردين، فحص المواد الواردة",                en: "Supplier evaluation, incoming material inspection" },
    responsibility:{ ar: "QA / المشتريات",                                    en: "QA / Procurement" },
    monitoring:    { ar: "تقارير تدقيق الموردين، سجلات الفحص",                en: "Supplier audit reports, inspection logs" },
    status: "active",
  },
  {
    id: "opp-ext-2", source: "external",
    factor:        { ar: "تغيّر المناخ / أحوال جوية قاسية",                      en: "Climate change / extreme weather" },
    impact:        { ar: "تأخير في التوصيل، فساد المنتج",                       en: "Delays in delivery, product spoilage" },
    opportunity:   { ar: "التخطيط للطوارئ، موردون بدلاء",                      en: "Contingency planning, alternative suppliers" },
    actions:       { ar: "نقل بدرجة حرارة مضبوطة، تخزين احتياطي",               en: "Temperature-controlled transport, backup storage" },
    responsibility:{ ar: "المخازن / اللوجستيات",                                  en: "Warehouse / Logistics" },
    monitoring:    { ar: "سجلات النقل والتخزين",                                en: "Transport and storage logs" },
    status: "active",
  },
  {
    id: "opp-ext-3", source: "external",
    factor:        { ar: "مخاطر مرتبطة بالموقع (نقل، مواقع جديدة)",                                en: "Location-specific risks (relocation, new sites)" },
    impact:        { ar: "تلوث بيئي، إصابة بالحشرات",                                              en: "Environmental contamination, pest infestation" },
    opportunity:   { ar: "تحسين تصميم المنشأة، تجهيز موقع جديد",                                  en: "Improved facility design, new site setup" },
    actions:       { ar: "تقييم المخاطر، مكافحة الآفات، تحديث SOP",                                en: "Risk assessment, pest control, SOP updates" },
    responsibility:{ ar: "QA / العمليات",                                                            en: "QA / Operations" },
    monitoring:    { ar: "تقارير تفتيش الموقع",                                                      en: "Site inspection reports" },
    status: "active",
  },
  {
    id: "opp-ext-4", source: "external",
    factor:        { ar: "تلوث بيئي",                                                              en: "Environmental pollution" },
    impact:        { ar: "تلوث الهواء، الغبار، المواد الكيميائية",                                  en: "Air, dust, chemical contamination" },
    opportunity:   { ar: "تحسين السيطرة على المنشأة، فلترة الهواء",                                en: "Better facility control, air filtration" },
    actions:       { ar: "تركيب فلاتر، تحكم في الوصول",                                            en: "Install filters, controlled access" },
    responsibility:{ ar: "QA / الصيانة",                                                            en: "QA / Maintenance" },
    monitoring:    { ar: "سجلات المراقبة البيئية",                                                  en: "Environmental monitoring logs" },
    status: "active",
  },
  {
    id: "opp-ext-5", source: "external",
    factor:        { ar: "تغيّرات تنظيمية",                                                        en: "Regulatory changes" },
    impact:        { ar: "غرامات عدم الامتثال",                                                    en: "Non-compliance fines" },
    opportunity:   { ar: "تحديث FSMS، تدريب",                                                       en: "Update FSMS, training" },
    actions:       { ar: "مراجعة منتظمة للوائح المحلية",                                            en: "Regular review of local regulations" },
    responsibility:{ ar: "QA / مسؤول الامتثال",                                                     en: "QA / Compliance Officer" },
    monitoring:    { ar: "سجلات مراقبة الالتزام التنظيمي",                                          en: "Regulatory monitoring records" },
    status: "active",
  },
  {
    id: "opp-ext-6", source: "external",
    factor:        { ar: "عدم استقرار السوق",                                                      en: "Market instability" },
    impact:        { ar: "تذبذب الأسعار، نقص في المواد الخام",                                       en: "Price fluctuation, shortage of raw material" },
    opportunity:   { ar: "تنويع مصادر التوريد",                                                     en: "Diversify sourcing" },
    actions:       { ar: "خطة تنويع الموردين",                                                      en: "Supplier diversification plan" },
    responsibility:{ ar: "المشتريات",                                                                en: "Procurement" },
    monitoring:    { ar: "تقرير الموردين",                                                          en: "Supplier report" },
    status: "active",
  },
  {
    id: "opp-ext-7", source: "external",
    factor:        { ar: "مخاطر النقل",                                                              en: "Transportation risk" },
    impact:        { ar: "تعطل المركبات",                                                          en: "Vehicle breakdown" },
    opportunity:   { ar: "تحسين التخطيط اللوجستي",                                                 en: "Improved logistic planning" },
    actions:       { ar: "صيانة المركبات، سجل الحرارة",                                              en: "Vehicle maintenance, temperature log" },
    responsibility:{ ar: "اللوجستيات",                                                                en: "Logistics" },
    monitoring:    { ar: "سجلات مراقبة النقل",                                                      en: "Transport monitoring records" },
    status: "active",
  },

  /* ─────── INTERNAL FACTORS (11) ─────── */
  {
    id: "opp-int-1", source: "internal",
    factor:        { ar: "تغيير في فريق سلامة الغذاء",                                              en: "Change in Food Safety Team members" },
    impact:        { ar: "نقص الكفاءة وفجوة في التواصل",                                            en: "Lack of competence and communication gap" },
    opportunity:   { ar: "معرفة جديدة ووجهات نظر",                                                   en: "New knowledge and perspectives" },
    actions:       { ar: "تنفيذ تدريب FSMS وتدريب الكفاءات",                                        en: "Conduct FSMS and competency training" },
    responsibility:{ ar: "QA / الإدارة",                                                              en: "QA / Management" },
    monitoring:    { ar: "سجلات التدريب، محاضر الاجتماعات",                                          en: "Training records, meeting minutes" },
    status: "active",
  },
  {
    id: "opp-int-2", source: "internal",
    factor:        { ar: "نقل منطقة الإنتاج إلى مستودع القصيص",                                     en: "Shift of production area to Qusais warehouse" },
    impact:        { ar: "تعطّل العمليات، تلوث متبادل",                                              en: "Disruption in operations, cross-contamination" },
    opportunity:   { ar: "تحسين تخطيط المنشأة وتقسيم النظافة",                                        en: "Improved facility layout and hygiene zoning" },
    actions:       { ar: "التحقق من التخطيط، تحديث PRP و HACCP",                                    en: "Layout validation, PRP and HACCP need to update" },
    responsibility:{ ar: "الإنتاج / QA",                                                              en: "Production / QA" },
    monitoring:    { ar: "تفتيش الموقع والتحقق",                                                     en: "Site inspection and validation" },
    status: "active",
  },
  {
    id: "opp-int-3", source: "internal",
    factor:        { ar: "فريق تشغيل المستودع الجديد",                                              en: "New warehouse operation team" },
    impact:        { ar: "نقص الوعي بـ FSMS",                                                        en: "Lack of FSMS awareness" },
    opportunity:   { ar: "فرصة لتطوير مهارات جديدة",                                                en: "Opportunity for new skill development" },
    actions:       { ar: "تنفيذ تدريب توعوي وتنشيطي",                                                en: "Conduct awareness and refresher training" },
    responsibility:{ ar: "الموارد البشرية / QA",                                                     en: "HR / QA" },
    monitoring:    { ar: "سجلات حضور التدريب",                                                       en: "Training attendance records" },
    status: "active",
  },
  {
    id: "opp-int-4", source: "internal",
    factor:        { ar: "ترقية نظام تقنية المعلومات / التوثيق",                                     en: "IT / documentation system upgrade" },
    impact:        { ar: "فقد بيانات أو ارتباك خلال الانتقال",                                       en: "Data loss or confusion during transition" },
    opportunity:   { ar: "إدارة وتحكم أفضل بالبيانات",                                                en: "Better data management and control" },
    actions:       { ar: "نسخ احتياطي للبيانات، التحكم في وصول المستخدم",                              en: "Data backup, user access control" },
    responsibility:{ ar: "تقنية المعلومات / QA",                                                     en: "IT / QA" },
    monitoring:    { ar: "تدقيق داخلي للوثائق",                                                      en: "Internal audit of documentation" },
    status: "active",
  },
  {
    id: "opp-int-5", source: "internal",
    factor:        { ar: "تغيير في مزود خدمة المعايرة",                                              en: "Change in calibration service provider" },
    impact:        { ar: "نتائج قياس غير دقيقة",                                                    en: "Inaccurate measurement results" },
    opportunity:   { ar: "خدمة معايرة موثوقة وتم التحقق منها",                                       en: "Reliable and verified calibration service" },
    actions:       { ar: "التحقق من المورد المعتمد",                                                 en: "Approved supplier verification" },
    responsibility:{ ar: "QA / الصيانة",                                                              en: "QA / Maintenance" },
    monitoring:    { ar: "شهادات وسجلات المعايرة",                                                  en: "Calibration certificates and logs" },
    status: "active",
  },
  {
    id: "opp-int-6", source: "internal",
    factor:        { ar: "تحديث قائمة الموردين",                                                    en: "Supplier list updated" },
    impact:        { ar: "تباين جودة المواد الخام",                                                 en: "Raw material quality variation" },
    opportunity:   { ar: "مصادر أفضل وخيارات موردين أفضل",                                            en: "Better sourcing and supplier options" },
    actions:       { ar: "تقييم المورد ومراقبة الأداء",                                              en: "Supplier evaluation and performance monitoring" },
    responsibility:{ ar: "QA / المشتريات",                                                            en: "QA / Procurement" },
    monitoring:    { ar: "سجلات اعتماد الموردين",                                                    en: "Supplier approval records" },
    status: "active",
  },
  {
    id: "opp-int-7", source: "internal",
    factor:        { ar: "دوران الموظفين",                                                          en: "Employee turnover" },
    impact:        { ar: "فقد المعرفة، عدم اتساق الأداء",                                            en: "Knowledge loss, performance inconsistency" },
    opportunity:   { ar: "أفكار جديدة وتطوير الكوادر",                                               en: "New ideas and staff development" },
    actions:       { ar: "تدريب متعدد المهام، استراتيجية الاحتفاظ بالمواهب",                            en: "Cross-training, retention strategy" },
    responsibility:{ ar: "الموارد البشرية / QA",                                                     en: "HR / QA" },
    monitoring:    { ar: "مصفوفة التدريب",                                                          en: "Training matrix" },
    status: "active",
  },
  {
    id: "opp-int-8", source: "internal",
    factor:        { ar: "أعطال المعدات",                                                           en: "Equipment breakdowns" },
    impact:        { ar: "تأخير الإنتاج، تلوث",                                                     en: "Production delay, contamination" },
    opportunity:   { ar: "تحسين نظام الصيانة",                                                       en: "Improved maintenance system" },
    actions:       { ar: "جدول صيانة وقائية",                                                       en: "Preventive maintenance schedule" },
    responsibility:{ ar: "الصيانة",                                                                  en: "Maintenance" },
    monitoring:    { ar: "سجلات الصيانة",                                                            en: "Maintenance records" },
    status: "active",
  },
  {
    id: "opp-int-9", source: "internal",
    factor:        { ar: "عدم اتساق التنظيف والتعقيم",                                                en: "Cleaning & sanitation inconsistency" },
    impact:        { ar: "خطر التلوث",                                                              en: "Contamination risk" },
    opportunity:   { ar: "تحكم أفضل بالنظافة",                                                       en: "Better hygiene control" },
    actions:       { ar: "التحقق ومراقبة التنظيف",                                                  en: "Cleaning verification and monitoring" },
    responsibility:{ ar: "QA / النظافة",                                                              en: "QA / Housekeeping" },
    monitoring:    { ar: "سجلات التعقيم",                                                            en: "Sanitation records" },
    status: "active",
  },
  {
    id: "opp-int-10", source: "internal",
    factor:        { ar: "مشاكل فصل التخزين البارد",                                                 en: "Cold storage segregation issues" },
    impact:        { ar: "تلوث متبادل بين المنتجات",                                                 en: "Cross-contamination between products" },
    opportunity:   { ar: "ممارسات تخزين أفضل",                                                       en: "Improved storage practices" },
    actions:       { ar: "نظام فصل بألوان مرمّزة",                                                    en: "Color-coded segregation system" },
    responsibility:{ ar: "المخازن / QA",                                                              en: "Warehouse / QA" },
    monitoring:    { ar: "تقارير تدقيق التخزين",                                                    en: "Storage audit reports" },
    status: "active",
  },
  {
    id: "opp-int-11", source: "internal",
    factor:        { ar: "مكافحة آفات غير كافية",                                                    en: "Inadequate pest control" },
    impact:        { ar: "تلوث المنتج",                                                             en: "Product contamination" },
    opportunity:   { ar: "برنامج محسّن لإدارة الآفات",                                               en: "Enhanced pest management program" },
    actions:       { ar: "مكافحة آفات مجدولة وتحليل الاتجاهات",                                       en: "Scheduled pest control and trending" },
    responsibility:{ ar: "QA / المقاول",                                                              en: "QA / Contractor" },
    monitoring:    { ar: "سجل مكافحة الآفات",                                                       en: "Pest control log" },
    status: "active",
  },
  {
    id: "opp-int-12", source: "internal",
    factor:        { ar: "ضعف النظافة العامة أو الصحة",                                              en: "Poor housekeeping or hygiene" },
    impact:        { ar: "التلوث، صورة سيئة",                                                       en: "Contamination, poor image" },
    opportunity:   { ar: "ثقافة نظافة أقوى",                                                         en: "Stronger hygiene culture" },
    actions:       { ar: "تفتيش يومي للنظافة",                                                       en: "Daily hygiene inspection" },
    responsibility:{ ar: "النظافة / QA",                                                              en: "Housekeeping / QA" },
    monitoring:    { ar: "قائمة فحص النظافة",                                                        en: "Housekeeping checklist" },
    status: "active",
  },
  {
    id: "opp-int-13", source: "internal",
    factor:        { ar: "ضعف التأهب للطوارئ",                                                      en: "Lack of emergency preparedness" },
    impact:        { ar: "استجابة غير كافية للحوادث",                                                en: "Inadequate response to incidents" },
    opportunity:   { ar: "تأهب وسلامة محسّنة",                                                       en: "Enhanced preparedness and safety" },
    actions:       { ar: "تدريبات الطوارئ وتدريب الموظفين",                                          en: "Emergency drills and staff training" },
    responsibility:{ ar: "QA / الإدارة",                                                              en: "QA / Management" },
    monitoring:    { ar: "سجلات تدريبات الطوارئ",                                                    en: "Emergency drill records" },
    status: "active",
  },
  {
    id: "opp-int-14", source: "internal",
    factor:        { ar: "إدارة نفايات غير كافية",                                                   en: "Inadequate waste management" },
    impact:        { ar: "جذب الآفات، الروائح، التلوث",                                              en: "Pest attraction, odor, contamination" },
    opportunity:   { ar: "تحسين النظافة البيئية",                                                    en: "Improved environmental hygiene" },
    actions:       { ar: "إجراء فصل النفايات والتخلص منها",                                          en: "Waste segregation and disposal procedure" },
    responsibility:{ ar: "QA / المخازن",                                                              en: "QA / Warehouse" },
    monitoring:    { ar: "سجلات التخلص من النفايات",                                                 en: "Waste disposal logs" },
    status: "active",
  },
  {
    id: "opp-int-15", source: "internal",
    factor:        { ar: "نقص التدقيق الداخلي أو ضعف المتابعة",                                       en: "Lack of internal audits or weak follow-up" },
    impact:        { ar: "تفويت حالات عدم المطابقة",                                                en: "Missed non-conformities" },
    opportunity:   { ar: "تحسين مستمر لـ FSMS",                                                       en: "Continuous FSMS improvement" },
    actions:       { ar: "الحفاظ على جدول التدقيق وعملية CAPA",                                       en: "Maintain audit schedule and CAPA process" },
    responsibility:{ ar: "QA / الإدارة",                                                              en: "QA / Management" },
    monitoring:    { ar: "تقارير التدقيق الداخلي",                                                   en: "Internal audit reports" },
    status: "active",
  },
];

/* ─────────────────────────────────────────────────────────────
   UI strings (bilingual)
   ───────────────────────────────────────────────────────────── */
const T = {
  pageTitle:    { ar: "💡 سجل الفرص — FSMS-RA-01", en: "💡 Opportunity Register — FSMS-RA-01" },
  pageSubtitle: { ar: "ISO 22000:2018 §6.1 — الفرص المرتبطة بالمخاطر الاستراتيجية",
                  en: "ISO 22000:2018 §6.1 — Opportunities derived from strategic risks" },
  pageIntro: {
    ar: "البند 6.1 من ISO 22000:2018 يطلب صراحة معالجة المخاطر **والفرص**. هذا السجل المُكَمِّل لسجل المخاطر يوثّق الفرص الناشئة من العوامل الخارجية والداخلية التي تواجه TELT/Al Mawashi، بحيث يحوّل كل تحدٍ إلى فرصة لتقوية النظام (تنوّع الموردين، تحديث المنشآت، رفع الكفاءة، تطوير الكوادر…). يحتوي السجل 18 فرصة جاهزة (7 خارجية + 11 داخلية) مأخوذة حرفياً من الوثيقة المضبوطة FSMS-RA-01.",
    en: "ISO 22000:2018 Clause 6.1 explicitly requires addressing risks **and opportunities**. This register complements the Risk Register by documenting opportunities arising from external and internal factors faced by TELT/Al Mawashi — converting each challenge into a chance to strengthen the system (supplier diversification, facility upgrades, competency growth, career development…). It contains 18 pre-loaded opportunities (7 external + 11 internal) transcribed verbatim from the controlled document FSMS-RA-01.",
  },
  back:           { ar: "← الرئيسية",          en: "← Hub" },
  add:            { ar: "+ إضافة فرصة",        en: "+ Add Opportunity" },
  newTitle:       { ar: "➕ إضافة فرصة جديدة", en: "➕ Add new opportunity" },
  editTitle:      { ar: "✏️ تعديل الفرصة",     en: "✏️ Edit opportunity" },
  search:         { ar: "🔍 بحث…",             en: "🔍 Search…" },
  shown:          { ar: "المعروض:",            en: "Showing:" },
  total:          { ar: "الإجمالي",            en: "Total" },
  external:       { ar: "خارجية",              en: "External" },
  internal:       { ar: "داخلية",              en: "Internal" },
  source:         { ar: "نوع العامل",          en: "Factor source" },
  factor:         { ar: "العامل",              en: "Factor" },
  factorPh:       { ar: "صف العامل…",          en: "Describe the factor…" },
  impact:         { ar: "الخطر / الأثر",        en: "Risk / Impact" },
  impactPh:       { ar: "الأثر السلبي إن لم يُعالَج…", en: "Negative impact if not addressed…" },
  opportunity:    { ar: "الفرصة",              en: "Opportunity" },
  oppPh:          { ar: "الفرصة الناتجة…",     en: "Resulting opportunity…" },
  actions:        { ar: "إجراءات وقائية / مخفِّفة", en: "Preventive / Mitigation Actions" },
  actionsPh:      { ar: "ما الذي ستفعله؟…",    en: "What will you do?…" },
  responsibility: { ar: "المسؤولية",           en: "Responsibility" },
  respPh:         { ar: "QA / Procurement…",   en: "QA / Procurement…" },
  monitoring:     { ar: "المراقبة / التحقق",   en: "Monitoring / Verification" },
  monPh:          { ar: "كيف يتم التحقق؟…",    en: "How is it verified?…" },
  fAll:           { ar: "كل العوامل",          en: "All factors" },
  save:           { ar: "💾 حفظ",              en: "💾 Save" },
  cancel:         { ar: "إلغاء",               en: "Cancel" },
  edit:           { ar: "تعديل",               en: "Edit" },
  del:            { ar: "حذف",                 en: "Delete" },
  noResults:      { ar: "لا توجد فرص مطابقة",  en: "No opportunities match" },
  enterFactor:    { ar: "اكتب العامل أولاً",   en: "Enter the factor first" },
  confirmDel:     { ar: "حذف هذه الفرصة؟",     en: "Delete this opportunity?" },
  cols: {
    source:         { ar: "النوع",         en: "Type" },
    factor:         { ar: "العامل",        en: "Factor" },
    impact:         { ar: "الأثر",         en: "Impact" },
    opportunity:    { ar: "الفرصة",        en: "Opportunity" },
    actions:        { ar: "إجراءات",       en: "Actions" },
    responsibility: { ar: "المسؤولية",     en: "Responsibility" },
    monitoring:     { ar: "المراقبة",      en: "Monitoring" },
    rowActions:     { ar: "أدوات",         en: "Tools" },
  },
};

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v[lang] ?? v.ar ?? v.en ?? "";
  return String(v);
}

function blank() {
  return {
    source: "external",
    factor: "",
    impact: "",
    opportunity: "",
    actions: "",
    responsibility: "",
    monitoring: "",
    status: "active",
  };
}

/* ─────────────────────────────────────────────────────────────
   Styles — green/teal palette to distinguish from Risk (cyan)
   ───────────────────────────────────────────────────────────── */
const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 60%, #f8fafc 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #a7f3d0",
    boxShadow: "0 8px 24px rgba(16,185,129,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#065f46", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#047857", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #a7f3d0", boxShadow: "0 6px 16px rgba(16,185,129,0.06)" },
  intro: { background: "linear-gradient(135deg,#d1fae5,#fff)", borderRadius: 14, padding: 16, marginBottom: 14, borderInlineStart: "5px solid #10b981", fontSize: 14, lineHeight: 1.85, color: "#0f172a" },
  sectionTitle: { fontSize: 16, fontWeight: 950, color: "#065f46", marginBottom: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 12px", textAlign: "start", background: "#065f46", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #ecfdf5", verticalAlign: "top" },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #a7f3d0", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#065f46", marginBottom: 4, marginTop: 8 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (bg, color) => ({
    padding: "12px 14px", borderRadius: 12, background: bg, color,
    border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 12px rgba(16,185,129,0.06)",
  }),

  badge: (kind) => {
    const map = {
      external: { bg: "#dbeafe", color: "#1e40af" },
      internal: { bg: "#d1fae5", color: "#065f46" },
    };
    const c = map[kind] || map.external;
    return { padding: "3px 10px", borderRadius: 999, background: c.bg, color: c.color, fontWeight: 900, fontSize: 11, whiteSpace: "nowrap" };
  },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #10b981, #059669)", color: "#fff", border: "#047857" },
      secondary: { bg: "#fff", color: "#065f46", border: "#a7f3d0" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "transparent", color: "#065f46", border: "#10b981" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 14px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap",
    };
  },
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function OpportunityRegisterView() {
  const navigate = useNavigate();
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const pick = (obj) => (obj?.[lang] ?? obj?.ar ?? obj?.en ?? "");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);

  const seededRef = useRef(false);

  /* Load from API. If the DB is empty on first load, persist the 18 seeds
     once (so they become editable real records). After that, just render
     whatever's in the DB. */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const fetched = arr
        .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
        .filter((x) => x.id);

      if (fetched.length === 0 && !seededRef.current) {
        seededRef.current = true;
        for (const seed of SEED_OPPORTUNITIES) {
          try { await persistItem({ ...seed }); } catch {}
        }
        const res2 = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json2 = await res2.json().catch(() => null);
        const arr2 = Array.isArray(json2) ? json2 : json2?.data || json2?.items || [];
        const seededItems = arr2
          .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
          .filter((x) => x.id);
        setItems(seededItems.length ? seededItems : SEED_OPPORTUNITIES);
      } else {
        setItems(fetched);
      }
    } catch {
      setItems(SEED_OPPORTUNITIES);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function persistItem(item) {
    const url = item._recordId
      ? `${API_BASE}/api/reports/${encodeURIComponent(item._recordId)}`
      : `${API_BASE}/api/reports`;
    const method = item._recordId ? "PUT" : "POST";
    const { _recordId, ...payload } = item;
    payload.savedAt = Date.now();
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reporter: payload.responsibility || "admin", type: TYPE, payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  async function deleteItem(recordId) {
    if (!recordId) return;
    await fetch(`${API_BASE}/api/reports/${encodeURIComponent(recordId)}`, { method: "DELETE" });
  }

  function startNew() { setDraft(blank()); setEditingId("__new__"); setShowForm(true); }
  function startEdit(it) {
    setDraft({
      ...it,
      factor:         typeof it.factor         === "object" ? (it.factor[lang]         ?? it.factor.ar         ?? "") : it.factor,
      impact:         typeof it.impact         === "object" ? (it.impact[lang]         ?? it.impact.ar         ?? "") : it.impact,
      opportunity:    typeof it.opportunity    === "object" ? (it.opportunity[lang]    ?? it.opportunity.ar    ?? "") : it.opportunity,
      actions:        typeof it.actions        === "object" ? (it.actions[lang]        ?? it.actions.ar        ?? "") : it.actions,
      responsibility: typeof it.responsibility === "object" ? (it.responsibility[lang] ?? it.responsibility.ar ?? "") : it.responsibility,
      monitoring:     typeof it.monitoring     === "object" ? (it.monitoring[lang]     ?? it.monitoring.ar     ?? "") : it.monitoring,
    });
    setEditingId(it.id);
    setShowForm(true);
  }

  async function save() {
    if (!String(draft.factor).trim()) { alert(pick(T.enterFactor)); return; }
    try {
      if (editingId === "__new__") {
        const id = `opp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await persistItem({ ...draft, id });
      } else {
        const existing = items.find((r) => r.id === editingId);
        await persistItem({ ...existing, ...draft, id: editingId });
      }
      await load();
      setShowForm(false);
      setEditingId(null);
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    }
  }

  async function remove(it) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await deleteItem(it._recordId);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
    } catch (e) {
      alert("Delete error: " + (e?.message || e));
    }
  }

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filter !== "all" && r.source !== filter) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = [r.factor, r.impact, r.opportunity, r.actions, r.responsibility, r.monitoring]
          .map((v) => txt(v, lang)).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [items, filter, search, lang]);

  const stats = useMemo(() => {
    const out = { total: items.length, external: 0, internal: 0 };
    items.forEach((r) => {
      if (r.source === "external") out.external++;
      else if (r.source === "internal") out.internal++;
    });
    return out;
  }, [items]);

  const localizeSource = (val) => SOURCES.find((s) => s.v === val)?.[lang] || val;

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        {/* Top bar */}
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{pick(T.pageTitle)}</div>
            <div style={S.subtitle}>{pick(T.pageSubtitle)}</div>
            <HaccpLinkBadge clauses={["6.1"]} label={isAr ? "إجراءات معالجة المخاطر والفرص" : "Actions to address risks & opportunities"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("primary")} onClick={startNew}>{pick(T.add)}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Intro */}
        <div style={S.intro}>{pick(T.pageIntro)}</div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#e0e7ff", "#3730a3")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{pick(T.total)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.total}</div>
          </div>
          <div style={S.kpi("#dbeafe", "#1e40af")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🌐 {pick(T.external)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.external}</div>
          </div>
          <div style={S.kpi("#d1fae5", "#065f46")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🏢 {pick(T.internal)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.internal}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ ...S.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...S.input, maxWidth: 260 }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...S.input, maxWidth: 200 }}>
            <option value="all">{pick(T.fAll)}</option>
            <option value="external">{pick(T.external)}</option>
            <option value="internal">{pick(T.internal)}</option>
          </select>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginInlineStart: "auto" }}>{pick(T.shown)} {filtered.length} / {items.length}</span>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ ...S.card, border: "2px solid #10b981" }}>
            <div style={{ ...S.sectionTitle, color: "#065f46" }}>
              {editingId === "__new__" ? pick(T.newTitle) : pick(T.editTitle)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div>
                <label style={S.label}>{pick(T.source)}</label>
                <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} style={S.input}>
                  {SOURCES.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.responsibility)}</label>
                <input type="text" value={draft.responsibility} onChange={(e) => setDraft({ ...draft, responsibility: e.target.value })} placeholder={pick(T.respPh)} style={S.input} />
              </div>
            </div>

            <label style={S.label}>{pick(T.factor)}</label>
            <input type="text" value={draft.factor} onChange={(e) => setDraft({ ...draft, factor: e.target.value })} placeholder={pick(T.factorPh)} style={S.input} />

            <label style={S.label}>{pick(T.impact)}</label>
            <textarea value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value })} placeholder={pick(T.impactPh)} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.opportunity)}</label>
            <textarea value={draft.opportunity} onChange={(e) => setDraft({ ...draft, opportunity: e.target.value })} placeholder={pick(T.oppPh)} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.actions)}</label>
            <textarea value={draft.actions} onChange={(e) => setDraft({ ...draft, actions: e.target.value })} placeholder={pick(T.actionsPh)} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.monitoring)}</label>
            <textarea value={draft.monitoring} onChange={(e) => setDraft({ ...draft, monitoring: e.target.value })} placeholder={pick(T.monPh)} style={{ ...S.input, minHeight: 60 }} />

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={S.btn("success")} onClick={save}>{pick(T.save)}</button>
              <button style={S.btn("secondary")} onClick={() => { setShowForm(false); setEditingId(null); }}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{pick(T.cols.source)}</th>
                  <th style={S.th}>{pick(T.cols.factor)}</th>
                  <th style={S.th}>{pick(T.cols.impact)}</th>
                  <th style={S.th}>{pick(T.cols.opportunity)}</th>
                  <th style={S.th}>{pick(T.cols.actions)}</th>
                  <th style={S.th}>{pick(T.cols.responsibility)}</th>
                  <th style={S.th}>{pick(T.cols.monitoring)}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{pick(T.cols.rowActions)}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="8" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>⏳</td></tr>
                )}
                {!loading && filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={S.td}><span style={S.badge(r.source)}>{localizeSource(r.source)}</span></td>
                    <td style={{ ...S.td, fontWeight: 800, maxWidth: 200 }}>{txt(r.factor, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 200, color: "#475569" }}>{txt(r.impact, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 220, color: "#065f46", fontWeight: 700 }}>{txt(r.opportunity, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 220 }}>{txt(r.actions, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, fontWeight: 700 }}>{txt(r.responsibility, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 200, color: "#475569" }}>{txt(r.monitoring, lang)}</td>
                    <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                      <button style={{ ...S.btn("secondary"), padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(r)}>{pick(T.edit)}</button>
                      <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11, marginInlineStart: 4 }} onClick={() => remove(r)}>{pick(T.del)}</button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="8" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noResults)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 700 }}>
          ISO 22000:2018 §6.1 · Companion to FSMS Risk Register · Source: FSMS-RA-01 controlled document · Reviewed annually during MRM
        </div>
      </div>
    </main>
  );
}
