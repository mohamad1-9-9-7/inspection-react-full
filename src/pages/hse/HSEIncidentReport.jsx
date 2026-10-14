// src/pages/hse/HSEIncidentReport.jsx
// F-01: تقرير حادث / إصابة — Incident Report (input + view) — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "incident_reports";

const T = {
  pageTitle:    { ar: "🚨 تقرير حادث / شبه حادث (F-01)", en: "🚨 Incident / Near-Miss Report (F-01)" },
  pageSubtitle: { ar: "نموذج موحّد: شبه حادث / إصابة / حريق / تسرب / تلوث + تحقيق + CAPA + إبلاغ الجهات",
                  en: "Unified report: near-miss / injury / fire / leak / contamination + investigation + CAPA + authorities" },
  anonymous:    { ar: "🕵️ بلاغ مجهول الهوية", en: "🕵️ Anonymous Report" },
  anonymousHint:{ ar: "اخفاء اسم المُبلِّغ — لتشجيع البلاغات المبكرة", en: "Hides reporter name — encourages early reporting" },
  monthlyCount: { ar: "شبه حادث هذا الشهر", en: "near-miss this month" },
  monthlyTarget:{ ar: "المستهدف ≥ 10", en: "Target ≥ 10" },
  quickMode:    { ar: "⚡ نموذج سريع", en: "⚡ Quick Entry mode" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },
  date:         { ar: "التاريخ", en: "Date" },
  time:         { ar: "الوقت", en: "Time" },
  reporter:     { ar: "المُبلِّغ", en: "Reporter" },
  reporterPh:   { ar: "الاسم", en: "Name" },
  reporterRole: { ar: "وظيفة المُبلِّغ", en: "Reporter's Job Title" },
  classify:     { ar: "تصنيف الحادث", en: "Incident Classification" },
  type:         { ar: "نوع الحادث", en: "Incident Type" },
  severity:     { ar: "درجة الخطورة", en: "Severity" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  areaPh:       { ar: "مثلاً: الرف رقم 4", en: "e.g., Rack #4" },
  injuredPerson:{ ar: "الشخص المصاب (إن وجد)", en: "Injured Person (if any)" },
  name:         { ar: "الاسم", en: "Name" },
  age:          { ar: "العمر", en: "Age" },
  nationality:  { ar: "الجنسية", en: "Nationality" },
  job:          { ar: "الوظيفة", en: "Job" },
  exp:          { ar: "سنوات الخبرة", en: "Years of Experience" },
  desc:         { ar: "وصف الحادث (تسلسل زمني بدءاً من 30 دقيقة قبل الحادث)",
                  en: "Description (chronological from 30 min before the incident)" },
  injuryType:   { ar: "نوع الإصابة", en: "Type of Injury" },
  bodyPart:     { ar: "العضو المصاب", en: "Body Part" },
  treatment:    { ar: "العلاج المقدّم", en: "Treatment Given" },
  cost:         { ar: "تكلفة تقديرية للأضرار (درهم)", en: "Estimated damage cost (AED)" },
  damage:       { ar: "الأضرار المادية", en: "Material Damage" },
  witnesses:    { ar: "الشهود (الأسماء والوظائف وبيانات الاتصال)", en: "Witnesses (names, jobs, contacts)" },
  immediate:    { ar: "الإجراءات الفورية المتخذة", en: "Immediate Actions Taken" },
  investSec:    { ar: "التحقيق والإجراءات التصحيحية", en: "Investigation & Corrective Actions" },
  rootCause:    { ar: "الأسباب الجذرية (5 Whys / Fishbone)", en: "Root Causes (5 Whys / Fishbone)" },
  capa:         { ar: "الإجراءات التصحيحية المطلوبة", en: "Required Corrective Actions" },
  responsibility: { ar: "المسؤول عن التنفيذ", en: "Responsibility" },
  deadline:     { ar: "الموعد النهائي", en: "Deadline" },
  status:       { ar: "الحالة", en: "Status" },
  // Closure section (replaces F-25 Final Accident)
  closureSec:   { ar: "إغلاق التقرير", en: "Report Closure (Lessons Learned)" },
  lessonsLearned:{ ar: "الدروس المستفادة", en: "Lessons Learned" },
  effectivenessCheck: { ar: "تم التحقق من فعالية الإجراءات؟", en: "CAPA effectiveness verified?" },
  effectivenessDate: { ar: "تاريخ التحقق", en: "Verification Date" },
  closedBy:     { ar: "مغلق بواسطة", en: "Closed By" },
  // Reporting (expanded — replaces F-23/F-24)
  reportingSec: { ar: "الإبلاغ للجهات", en: "Reporting to Authorities" },
  toHse:        { ar: "تم إبلاغ HSE Manager", en: "Reported to HSE Manager" },
  toHseDate:    { ar: "تاريخ الإبلاغ", en: "Date Reported" },
  toMohre:      { ar: "إبلاغ MOHRE", en: "Report to MOHRE" },
  toMun:        { ar: "إبلاغ بلدية دبي", en: "Report to Dubai Municipality" },
  toCD:         { ar: "إبلاغ الدفاع المدني", en: "Report to Civil Defence" },
  toPolice:     { ar: "إبلاغ الشرطة / النيابة", en: "Report to Police / Prosecution" },
  toFamily:     { ar: "إبلاغ الأسرة (وفاة)", en: "Family Notified (Fatal)" },
  toInsurance:  { ar: "إبلاغ التأمين", en: "Insurance Notified" },
  optChoose:    { ar: "— اختر —", en: "— Select —" },
  optNot:       { ar: "غير مطلوب", en: "Not required" },
  optPending:   { ar: "قيد الإبلاغ", en: "Pending" },
  optReported:  { ar: "تم الإبلاغ", en: "Reported" },
  optYes:       { ar: "نعم", en: "Yes" },
  optNo:        { ar: "لا (بعد)", en: "Not yet" },
  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  clearBtn:     { ar: "🔄 مسح", en: "🔄 Clear" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  search:       { ar: "🔍 بحث…", en: "🔍 Search…" },
  fAll:         { ar: "كل الأنواع", en: "All Types" },
  cols: {
    report:   { ar: "التقرير", en: "Report" },
    date:     { ar: "التاريخ", en: "Date" },
    type:     { ar: "النوع", en: "Type" },
    sev:      { ar: "الخطورة", en: "Severity" },
    location: { ar: "الموقع", en: "Location" },
    reporter: { ar: "المُبلِّغ", en: "Reporter" },
    status:   { ar: "الحالة", en: "Status" },
    actions:  { ar: "إجراءات", en: "Actions" },
  },
  noRecords: { ar: "لا توجد تقارير", en: "No reports" },
  needDesc:  { ar: "اكتب وصف الحادث", en: "Enter the incident description" },
  needReporter: { ar: "أدخل اسم المُبلِّغ", en: "Enter the reporter's name" },
  saved:    { ar: "✅ تم حفظ تقرير الحادث", en: "✅ Incident report saved" },
  confirmDel: { ar: "حذف هذا التقرير؟", en: "Delete this report?" },
  del:      { ar: "حذف", en: "Delete" },
  edit:     { ar: "✏️ تعديل", en: "✏️ Edit" },
  // statuses
  stOpen:   { ar: "🔴 مفتوح", en: "🔴 Open" },
  stInv:    { ar: "🟡 قيد التحقيق", en: "🟡 Investigating" },
  stAct:    { ar: "🔵 إجراءات تصحيحية", en: "🔵 Corrective Actions" },
  stClosed: { ar: "✅ مغلق", en: "✅ Closed" },
  stOpenS:  { ar: "🔴 مفتوح", en: "🔴 Open" },
  stInvS:   { ar: "🟡 تحقيق", en: "🟡 Investig." },
  stActS:   { ar: "🔵 تصحيح", en: "🔵 Action" },
  // smart banner labels
  alertTitle: { ar: "🚨 إجراءات الإبلاغ الإلزامية", en: "🚨 Required Notifications" },
};

const INCIDENT_TYPES = [
  { v: "lost_time_injury",  ar: "🩹 إصابة عمل (LTI)", en: "🩹 Lost-Time Injury (LTI)", c: "#7f1d1d", bg: "#fee2e2" },
  { v: "first_aid",         ar: "🏥 إسعاف أولي (FAC)", en: "🏥 First Aid Case (FAC)",  c: "#854d0e", bg: "#fef9c3" },
  { v: "near_miss",         ar: "👁️ شبه حادث",        en: "👁️ Near-miss",            c: "#1e40af", bg: "#dbeafe" },
  { v: "fire",              ar: "🔥 حريق",            en: "🔥 Fire",                 c: "#b91c1c", bg: "#fee2e2" },
  { v: "leak",              ar: "💨 تسرب غاز/سائل",    en: "💨 Gas/Liquid Leak",       c: "#7c2d12", bg: "#fed7aa" },
  { v: "property_damage",   ar: "🏚️ تلف ممتلكات",      en: "🏚️ Property Damage",       c: "#374151", bg: "#e5e7eb" },
  { v: "environmental",     ar: "🌱 حادث بيئي",        en: "🌱 Environmental Incident",c: "#166534", bg: "#dcfce7" },
  { v: "food_contamination",ar: "🦠 تلوث غذائي",       en: "🦠 Food Contamination",     c: "#5b21b6", bg: "#e9d5ff" },
];

const SEVERITY = [
  { v: "near_miss", ar: "👁️ شبه حادث (بدون إصابة)",      en: "👁️ Near-miss (no injury)",       color: "#1e40af", bg: "#dbeafe" },
  { v: "first_aid", ar: "🏥 إسعاف أولي (FAC)",            en: "🏥 First-aid (FAC)",              color: "#0e7490", bg: "#cffafe" },
  { v: "minor",     ar: "🩹 طفيف (علاج طبي بدون فقد أيام)", en: "🩹 Minor (medical, no lost time)", color: "#166534", bg: "#dcfce7" },
  { v: "lti",       ar: "⚠️ إصابة بفقد أيام عمل (LTI)",    en: "⚠️ Lost-Time Injury (LTI)",      color: "#854d0e", bg: "#fef9c3" },
  { v: "major",     ar: "🚨 شديد (دخول مستشفى)",          en: "🚨 Major (hospitalization)",      color: "#9a3412", bg: "#fed7aa" },
  { v: "fatal",     ar: "💀 وفاة",                         en: "💀 Fatal",                         color: "#7f1d1d", bg: "#fee2e2" },
];

/** Required notifications based on severity (UAE MOHRE 33/2021 + Civil Defence) */
function getRequiredNotifications(severity, lang) {
  const ar = lang === "ar";
  switch (severity) {
    case "near_miss":
    case "first_aid":
    case "minor":
      return null; // no external authority needed
    case "lti":
      return {
        level: "warn",
        title: ar ? "⚠️ إبلاغ MOHRE خلال 48 ساعة (إذا الغياب ≥ 3 أيام)" : "⚠️ MOHRE notification within 48h (if absence ≥ 3 days)",
        items: [ar ? "📞 MOHRE — 80060" : "📞 MOHRE — 80060",
                ar ? "📋 تقرير طبي رسمي مطلوب" : "📋 Official medical report required"],
      };
    case "major":
      return {
        level: "danger",
        title: ar ? "🚨 إبلاغ فوري مطلوب — حادث شديد" : "🚨 Immediate notification — Major incident",
        items: [ar ? "📞 MOHRE خلال 48 ساعة (80060)" : "📞 MOHRE within 48h (80060)",
                ar ? "🚒 الدفاع المدني (لو حريق/تسرب) — 997" : "🚒 Civil Defence (fire/leak) — 997",
                ar ? "🏥 إبلاغ التأمين الطبي" : "🏥 Medical insurance notification"],
      };
    case "fatal":
      return {
        level: "fatal",
        title: ar ? "💀 إبلاغ فوري إلزامي — حادث وفاة" : "💀 IMMEDIATE notification — Fatal incident",
        items: [ar ? "🚓 الشرطة فوراً — 999" : "🚓 Police IMMEDIATELY — 999",
                ar ? "📞 MOHRE فوراً — 80060" : "📞 MOHRE IMMEDIATELY — 80060",
                ar ? "🚒 الدفاع المدني — 997" : "🚒 Civil Defence — 997",
                ar ? "⚖️ النيابة العامة" : "⚖️ Public Prosecution",
                ar ? "👨‍👩‍👧 إبلاغ الأسرة" : "👨‍👩‍👧 Notify Family",
                ar ? "🏥 شركة التأمين" : "🏥 Insurance Company",
                ar ? "📸 توثيق المسرح بالصور قبل أي تدخل" : "📸 Photograph scene before any intervention"],
      };
    default:
      return null;
  }
}

const blank = () => ({
  reportNo: `INC-${Date.now().toString().slice(-6)}`,
  reportDate: todayISO(), reportTime: nowHHMM(),
  reporter: "", reporterRole: "", anonymous: false,
  type: "near_miss", severity: "near_miss",
  location: SITE_LOCATIONS[0].v, area: "",
  injuredName: "", injuredAge: "", injuredNationality: "", injuredJob: "", injuredExp: "",
  description: "", injuriesType: "", bodyPart: "", treatment: "", damageDescription: "", estimatedCost: "",
  witnesses: "", immediateActions: "",
  rootCause: "", correctiveActions: "", responsibility: "", deadline: "",
  reportedToHSE: "", reportedToHSEDate: "",
  reportedToMOHRE: "", reportedToMunicipality: "",
  reportedToCivilDefence: "", reportedToPolice: "",
  familyNotified: "", insuranceNotified: "",
  lessonsLearned: "", effectivenessVerified: "", effectivenessDate: "", closedBy: "",
  status: "open",
});

/* ── Rules: what a saved F-01 must satisfy ──
   Severity drives the rest: anything beyond a near-miss needs the injured
   person and immediate actions; LTI / major / fatal must show the authority
   notifications; a report can only be closed once its CAPA is verified. */
const INJURY = (d) => d.severity && d.severity !== "near_miss";
const SERIOUS = (d) => ["lti", "major", "fatal"].includes(d.severity);
const HAS_CAPA = (d) => !!String(d.correctiveActions || "").trim();
const CLOSED = (d) => d.status === "closed";
const pendingNotify = { ar: "حادث خطير — يجب تحديد حالة الإبلاغ", en: "Serious incident — the notification status must be set" };

const INCIDENT_RULES = [
  { key: "reportDate", label: T.date, type: "date", required: true, notFuture: true },
  { key: "reportTime", label: T.time, type: "time", required: true },
  { key: "reporter", label: T.reporter, requiredIf: (d) => !d.anonymous, minLength: 2, maxLength: 80 },
  { key: "reporterRole", label: T.reporterRole, maxLength: 80 },
  { key: "type", label: T.type, required: true, oneOf: INCIDENT_TYPES.map((x) => x.v) },
  { key: "severity", label: T.severity, required: true, oneOf: SEVERITY.map((x) => x.v),
    custom: (v, d) => v === "near_miss" && ["lost_time_injury", "first_aid"].includes(d.type)
      ? { ar: "نوع الحادث إصابة — لا يمكن أن تكون الشدة «شبه حادث»", en: "The type is an injury — severity cannot be “Near-miss”" } : null },
  { key: "location", label: T.location, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
  { key: "area", label: T.area, maxLength: 120 },
  { key: "injuredName", label: T.name, requiredIf: INJURY, maxLength: 80 },
  { key: "injuredAge", label: T.age, type: "int", min: 15, max: 75, requiredIf: INJURY },
  { key: "injuredNationality", label: T.nationality, maxLength: 40 },
  { key: "injuredJob", label: T.job, maxLength: 80 },
  { key: "injuredExp", label: T.exp, type: "number", min: 0, max: 50,
    custom: (v, d) => d.injuredAge && Number(v) > Number(d.injuredAge) - 14
      ? { ar: "سنوات الخبرة لا تتناسب مع العمر", en: "Years of experience do not fit the age" } : null },
  { key: "description", label: T.desc, required: true, minLength: 20, maxLength: 4000 },
  { key: "injuriesType", label: T.injuryType, requiredIf: (d) => INJURY(d) && d.severity !== "first_aid", maxLength: 120 },
  { key: "bodyPart", label: T.bodyPart, requiredIf: INJURY, maxLength: 80 },
  { key: "treatment", label: T.treatment, maxLength: 200 },
  { key: "estimatedCost", label: T.cost, type: "number", min: 0, max: 10000000 },
  { key: "damageDescription", label: T.damage, maxLength: 2000,
    requiredIf: (d) => d.type === "property_damage" || d.type === "fire" },
  { key: "witnesses", label: T.witnesses, maxLength: 1000 },
  { key: "immediateActions", label: T.immediate, requiredIf: (d) => d.severity !== "near_miss" || d.type === "fire" || d.type === "leak", maxLength: 2000 },
  { key: "rootCause", label: T.rootCause, requiredIf: (d) => ["action", "closed"].includes(d.status), maxLength: 2000 },
  { key: "correctiveActions", label: T.capa, requiredIf: (d) => ["action", "closed"].includes(d.status), maxLength: 2000 },
  { key: "responsibility", label: T.responsibility, requiredIf: HAS_CAPA, maxLength: 80 },
  { key: "deadline", label: T.deadline, type: "date", requiredIf: HAS_CAPA, afterOrEqual: "reportDate" },
  { key: "status", label: T.status, required: true, oneOf: ["open", "investigating", "action", "closed"] },
  { key: "reportedToHSE", label: T.toHse, maxLength: 80 },
  { key: "reportedToHSEDate", label: T.toHseDate, type: "date", notFuture: true, afterOrEqual: "reportDate",
    requiredIf: (d) => !!String(d.reportedToHSE || "").trim() },
  { key: "reportedToMOHRE", label: T.toMohre, requiredIf: SERIOUS, requiredMsg: pendingNotify,
    custom: (v, d) => CLOSED(d) && SERIOUS(d) && v === "pending"
      ? { ar: "لا يُغلق التقرير قبل إبلاغ وزارة الموارد البشرية", en: "Cannot close before MOHRE has been notified" } : null },
  { key: "reportedToPolice", label: T.toPolice, requiredIf: (d) => d.severity === "fatal", requiredMsg: pendingNotify,
    custom: (v, d) => d.severity === "fatal" && v === "not_required"
      ? { ar: "حادث الوفاة يُبلَّغ للشرطة دائماً", en: "A fatality must always be reported to the police" } : null },
  { key: "reportedToCivilDefence", label: T.toCD, requiredIf: (d) => (d.type === "fire" || d.type === "leak") && SERIOUS(d), requiredMsg: pendingNotify },
  { key: "reportedToMunicipality", label: T.toMun, requiredIf: (d) => d.type === "food_contamination" || d.type === "environmental", requiredMsg: pendingNotify },
  { key: "familyNotified", label: T.toFamily, requiredIf: (d) => d.severity === "fatal" || d.severity === "major", requiredMsg: pendingNotify },
  { key: "insuranceNotified", label: T.toInsurance, requiredIf: SERIOUS, requiredMsg: pendingNotify },
  { key: "lessonsLearned", label: T.lessonsLearned, requiredIf: CLOSED, maxLength: 2000 },
  { key: "effectivenessVerified", label: T.effectivenessCheck, requiredIf: CLOSED,
    custom: (v, d) => CLOSED(d) && v !== "yes"
      ? { ar: "لا يُغلق التقرير قبل التحقق من فعالية الإجراء التصحيحي", en: "Cannot close until the corrective action is verified effective" } : null },
  { key: "effectivenessDate", label: T.effectivenessDate, type: "date", notFuture: true, afterOrEqual: "reportDate",
    requiredIf: (d) => d.effectivenessVerified === "yes" },
  { key: "closedBy", label: T.closedBy, requiredIf: CLOSED, maxLength: 80,
    custom: (v, d) => v && !d.anonymous && d.reporter && v.trim().toLowerCase() === d.reporter.trim().toLowerCase()
      ? { ar: "من يُغلق التقرير يجب أن يكون غير المُبلِّغ", en: "The person closing must not be the reporter" } : null },
];

const INCIDENT_STEPS = [
  { ar: "سجّل تاريخ ووقت وقوع الحادث (لا يُقبل تاريخ مستقبلي)، واسم المُبلِّغ — أو فعّل «بلاغ مجهول» لشبه الحادث.", en: "Record the date and time it happened (no future dates) and the reporter — or tick “Anonymous” for a near-miss." },
  { ar: "صنّف الحادث: النوع، الشدة، الموقع والمنطقة. الشدة تحدّد الحقول الإلزامية المتبقية.", en: "Classify it: type, severity, location and area. Severity decides which remaining fields are mandatory." },
  { ar: "أي شدة فوق «شبه حادث» تتطلب بيانات المصاب (العمر 15–75)، الجزء المصاب، والإجراءات الفورية.", en: "Anything above “Near-miss” needs the injured person (age 15–75), the body part and the immediate actions." },
  { ar: "اكتب وصفاً واضحاً لا يقل عن 20 حرفاً: ماذا حدث، أين، وكيف.", en: "Write a clear description of at least 20 characters: what happened, where and how." },
  { ar: "عند الانتقال لحالة «إجراء تصحيحي» أو «مغلق»: السبب الجذري والإجراء والمسؤول وموعد التنفيذ إلزامية.", en: "Moving to “Corrective action” or “Closed” requires the root cause, the action, an owner and a deadline." },
  { ar: "LTI / شديد / وفاة: حدّد حالة الإبلاغ لكل جهة. لا يُغلق التقرير قبل التحقق من فعالية الإجراء.", en: "LTI / major / fatal: set the notification status for each authority. The report cannot close until the action is verified effective." },
];

const INCIDENT_GUIDANCE = [
  { kind: "warn", ar: "في حالة الوفاة: لا تحرّك أي شيء في موقع الحادث قبل وصول الشرطة، ووثّقه بالصور.", en: "For a fatality: do not move anything at the scene before the police arrive, and photograph it." },
  { kind: "warn", ar: "الإصابات الشديدة تُبلَّغ لوزارة الموارد البشرية خلال 48 ساعة.", en: "Major injuries are reported to MOHRE within 48 hours." },
  { kind: "tip",  ar: "بلاغات شبه الحادث مؤشّر وقائي — المستهدف 10 بلاغات شهرياً على الأقل.", en: "Near-miss reports are a leading indicator — the target is at least 10 a month." },
];

export default function HSEIncidentReport() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(INCIDENT_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function set(k, v) { setDraft((d) => ({ ...d, [k]: v })); }

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    validation.reset();
    setTab("new");
  }

  async function save() {
    if (!validation.attempt()) return;
    const toSave = draft.anonymous ? { ...draft, reporter: "🕵️ Anonymous", reporterRole: "" } : draft;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, toSave, toSave.reporter || "HSE");
      } else {
        await apiSave(TYPE, toSave, toSave.reporter || "HSE");
      }
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setEditingId(null); validation.reset(); setTab("list");
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }
  async function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  const filtered = useMemo(() => items.filter((it) => {
    if (filter !== "all" && it.type !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(`${it.reportNo} ${it.injuredName} ${it.location} ${it.description}`.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [items, filter, search]);

  // Monthly near-miss counter
  const nearMissThisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return items.filter((it) => it.severity === "near_miss" && (it.reportDate || "").startsWith(ym)).length;
  }, [items]);

  const isQuickMode = draft.severity === "near_miss"; // hide injury/medical fields when near-miss

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.pageSubtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setEditingId(null); setDraft(blank()); validation.reset(); setTab("new"); }}>{editingId ? (pick({ ar: "✏️ تعديل تقرير", en: "✏️ Editing Report" })) : pick(T.newReport)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Monthly near-miss counter (replaces F-02) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
          gap: 12, padding: "14px 18px", marginBottom: 14, borderRadius: 14,
          background: nearMissThisMonth >= 10
            ? "linear-gradient(135deg, #dcfce7, #f0fdf4)"
            : "linear-gradient(135deg, #fef3c7, #fffbeb)",
          border: `2px solid ${nearMissThisMonth >= 10 ? "#86efac" : "#fcd34d"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 32 }}>👁️</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 950, color: nearMissThisMonth >= 10 ? "#166534" : "#92400e", lineHeight: 1 }}>
                {nearMissThisMonth} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>/ 10</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: nearMissThisMonth >= 10 ? "#166534" : "#92400e", marginTop: 2 }}>
                {pick(T.monthlyCount)} · {pick(T.monthlyTarget)}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140, marginInlineStart: 18 }}>
            <div style={{ height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (nearMissThisMonth / 10) * 100)}%`,
                background: nearMissThisMonth >= 10 ? "linear-gradient(90deg, #16a34a, #22c55e)" : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                transition: "width .4s ease",
              }} />
            </div>
          </div>
        </div>

        {tab === "new" && (() => {
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const NOTIFY = [
            { v: "not_required", label: pick(T.optNot) },
            { v: "pending", label: pick(T.optPending) },
            { v: "reported", label: pick(T.optReported) },
          ];
          const YESNO = [
            { v: "yes", label: pick(T.optYes) },
            { v: "no", label: pick(T.optNo) },
            { v: "not_required", label: pick(T.optNot) },
          ];
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "تقرير حادث / شبه حادث", en: "Incident / Near-Miss Report" }}
              subtitle={T.pageSubtitle}
              docNo="F-01"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.reportNo), value: draft.reportNo }]}
              steps={INCIDENT_STEPS}
              guidance={INCIDENT_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); validation.reset(); }}
              extraActions={
                <button type="button" className="ph-btn ph-btn-ghost" disabled={saving}
                  onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); }}>
                  {pick(T.clearBtn)}
                </button>
              }
            >
              <HSEPanel title={lang === "ar" ? "بيانات البلاغ" : "Report details"}>
                <HSEField {...f("reportDate")} type="date" label={pick(T.date)} />
                <HSEField {...f("reportTime")} type="time" label={pick(T.time)} />
                <HSEField {...f("reporter")} label={pick(T.reporter)}
                  value={draft.anonymous ? "" : draft.reporter}
                  placeholder={draft.anonymous ? "🕵️ Anonymous" : pick(T.reporterPh)}
                  disabled={draft.anonymous} />
                <HSEField {...f("reporterRole")} label={pick(T.reporterRole)}
                  value={draft.anonymous ? "" : draft.reporterRole} disabled={draft.anonymous} />
                <HSEField {...f("anonymous")} type="checkbox" full
                  label={`${pick(T.anonymous)} — ${pick(T.anonymousHint)}`} />
              </HSEPanel>

              <HSEPanel title={pick(T.classify)}>
                <HSEField {...f("type")} type="select" label={pick(T.type)}
                  options={INCIDENT_TYPES.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("severity")} type="select" label={pick(T.severity)}
                  options={SEVERITY.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("location")} type="select" label={pick(T.location)}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("area")} label={pick(T.area)} placeholder={pick(T.areaPh)} />
              </HSEPanel>

              <SeverityAlertBanner severity={draft.severity} lang={lang} />

              {!isQuickMode ? (
                <HSEPanel title={pick(T.injuredPerson)}>
                  <HSEField {...f("injuredName")} label={pick(T.name)} />
                  <HSEField {...f("injuredAge")} type="int" label={pick(T.age)} hint={lang === "ar" ? "15 – 75" : "15 – 75"} />
                  <HSEField {...f("injuredNationality")} label={pick(T.nationality)} />
                  <HSEField {...f("injuredJob")} label={pick(T.job)} />
                  <HSEField {...f("injuredExp")} type="number" label={pick(T.exp)} hint={lang === "ar" ? "0 – 50 سنة" : "0 – 50 years"} />
                </HSEPanel>
              ) : (
                <div className="ph-hint">
                  {pick(T.quickMode)} — {lang === "ar" ? "حقول الإصابة الطبية مخفيّة (شبه حادث = بدون إصابة)" : "Medical injury fields hidden (Near-miss = no injury)"}
                </div>
              )}

              <HSEPanel title={lang === "ar" ? "وصف الحادث" : "What happened"}>
                <HSEField {...f("description")} type="textarea" rows={5} full label={pick(T.desc)} />
                {!isQuickMode && (
                  <>
                    <HSEField {...f("injuriesType")} label={pick(T.injuryType)} />
                    <HSEField {...f("bodyPart")} label={pick(T.bodyPart)} />
                    <HSEField {...f("treatment")} label={pick(T.treatment)} />
                    <HSEField {...f("estimatedCost")} type="number" label={pick(T.cost)} />
                  </>
                )}
                <HSEField {...f("damageDescription")} type="textarea" full label={pick(T.damage)} />
                <HSEField {...f("witnesses")} type="textarea" full label={pick(T.witnesses)} />
                <HSEField {...f("immediateActions")} type="textarea" full label={pick(T.immediate)} />
              </HSEPanel>

              <HSEPanel title={pick(T.investSec)}>
                <HSEField {...f("rootCause")} type="textarea" full label={pick(T.rootCause)} />
                <HSEField {...f("correctiveActions")} type="textarea" full label={pick(T.capa)} />
                <HSEField {...f("responsibility")} label={pick(T.responsibility)} />
                <HSEField {...f("deadline")} type="date" label={pick(T.deadline)} />
                <HSEField {...f("status")} type="select" label={pick(T.status)} options={[
                  { v: "open", label: pick(T.stOpen) },
                  { v: "investigating", label: pick(T.stInv) },
                  { v: "action", label: pick(T.stAct) },
                  { v: "closed", label: pick(T.stClosed) },
                ]} />
              </HSEPanel>

              <HSEPanel title={pick(T.reportingSec)}>
                <HSEField {...f("reportedToHSE")} label={pick(T.toHse)} placeholder={pick(T.reporterPh)} />
                <HSEField {...f("reportedToHSEDate")} type="date" label={pick(T.toHseDate)} />
                <HSEField {...f("reportedToMOHRE")} type="select" label={pick(T.toMohre)} options={NOTIFY} />
                <HSEField {...f("reportedToMunicipality")} type="select" label={pick(T.toMun)} options={NOTIFY} />
                <HSEField {...f("reportedToCivilDefence")} type="select" label={pick(T.toCD)} options={NOTIFY} />
                <HSEField {...f("reportedToPolice")} type="select" label={pick(T.toPolice)} options={NOTIFY} />
                <HSEField {...f("familyNotified")} type="select" label={pick(T.toFamily)} options={YESNO} />
                <HSEField {...f("insuranceNotified")} type="select" label={pick(T.toInsurance)} options={YESNO} />
              </HSEPanel>

              <HSEPanel title={pick(T.closureSec)}>
                <HSEField {...f("lessonsLearned")} type="textarea" full label={pick(T.lessonsLearned)} />
                <HSEField {...f("effectivenessVerified")} type="select" label={pick(T.effectivenessCheck)} options={[
                  { v: "yes", label: pick(T.optYes) },
                  { v: "no", label: pick(T.optNo) },
                ]} />
                <HSEField {...f("effectivenessDate")} type="date" label={pick(T.effectivenessDate)} />
                <HSEField {...f("closedBy")} label={pick(T.closedBy)} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

        {tab === "list" && (
          <>
            <div style={{ ...cardStyle, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value="all">{pick(T.fAll)}</option>
                {INCIDENT_TYPES.map((t) => <option key={t.v} value={t.v}>{t[lang]}</option>)}
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.cols.report)}</th>
                    <th style={thStyle}>{pick(T.cols.date)}</th>
                    <th style={thStyle}>{pick(T.cols.type)}</th>
                    <th style={thStyle}>{pick(T.cols.sev)}</th>
                    <th style={thStyle}>{pick(T.cols.location)}</th>
                    <th style={thStyle}>{pick(T.cols.reporter)}</th>
                    <th style={thStyle}>{pick(T.cols.status)}</th>
                    <th style={thStyle}>{pick(T.cols.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const t = INCIDENT_TYPES.find((x) => x.v === it.type);
                    const sev = SEVERITY.find((x) => x.v === it.severity);
                    const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                    return (
                      <tr key={it.id}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                        <td style={tdStyle}>{it.reportDate} · {it.reportTime}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: "3px 8px", borderRadius: 6, background: t?.bg, color: t?.c, fontWeight: 800, fontSize: 12 }}>
                            {t ? t[lang] : it.type}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {sev && (
                            <span style={{ padding: "3px 8px", borderRadius: 6, background: sev.bg, color: sev.color, fontWeight: 800, fontSize: 12 }}>
                              {sev[lang]}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                        <td style={tdStyle}>{it.reporter}</td>
                        <td style={tdStyle}>
                          {it.status === "open" && pick(T.stOpenS)}
                          {it.status === "investigating" && pick(T.stInvS)}
                          {it.status === "action" && pick(T.stActS)}
                          {it.status === "closed" && pick(T.stClosed)}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="8" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   Smart banner — shows required notifications based on severity
   ============================================================ */
function SeverityAlertBanner({ severity, lang }) {
  const info = getRequiredNotifications(severity, lang);
  if (!info) return null;

  const styles = {
    warn:   { bg: "linear-gradient(135deg, #fef3c7, #fde68a)", border: "#f59e0b", text: "#78350f", titleColor: "#92400e" },
    danger: { bg: "linear-gradient(135deg, #fed7aa, #fdba74)", border: "#ea580c", text: "#7c2d12", titleColor: "#9a3412" },
    fatal:  { bg: "linear-gradient(135deg, #fee2e2, #fecaca)", border: "#dc2626", text: "#7f1d1d", titleColor: "#991b1b" },
  };
  const s = styles[info.level] || styles.warn;

  return (
    <div style={{
      marginTop: 14,
      padding: 14,
      background: s.bg,
      border: `2px solid ${s.border}`,
      borderRadius: 12,
      boxShadow: `0 6px 18px ${s.border}33`,
      animation: info.level === "fatal" ? "pulse 1.5s ease-in-out infinite" : "none",
    }}>
      <div style={{ fontSize: 14, fontWeight: 950, color: s.titleColor, marginBottom: 8 }}>
        {info.title}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {info.items.map((item, i) => (
          <li key={i} style={{ fontSize: 12.5, color: s.text, fontWeight: 700, padding: "3px 0" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Reusable 3-state authority notification dropdown
   ============================================================ */
function NotifySelect({ label, value, onChange, T, pick, yesNo = false }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">{pick(T.optChoose)}</option>
        {yesNo ? (
          <>
            <option value="yes">{pick(T.optYes)}</option>
            <option value="no">{pick(T.optNo)}</option>
            <option value="not_required">{pick(T.optNot)}</option>
          </>
        ) : (
          <>
            <option value="not_required">{pick(T.optNot)}</option>
            <option value="pending">{pick(T.optPending)}</option>
            <option value="reported">{pick(T.optReported)}</option>
          </>
        )}
      </select>
    </div>
  );
}
