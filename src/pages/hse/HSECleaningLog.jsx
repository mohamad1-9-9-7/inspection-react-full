// src/pages/hse/HSECleaningLog.jsx — F-10 bilingual via HSEGenericLog
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO, nowHHMM } from "./hseShared";

const FREQUENCY = [
  { v: "daily",   ar: "🗓️ يومي",       en: "🗓️ Daily" },
  { v: "weekly",  ar: "📅 أسبوعي",      en: "📅 Weekly" },
  { v: "monthly", ar: "📆 شهري",        en: "📆 Monthly" },
  { v: "deep",    ar: "🧽 تنظيف عميق",  en: "🧽 Deep clean" },
];

const AREAS = [
  { v: "production",  ar: "خط التصنيع — Production Line", en: "Production Line" },
  { v: "chiller-1",   ar: "غرفة التبريد #1", en: "Chiller Room #1" },
  { v: "chiller-2",   ar: "غرفة التبريد #2", en: "Chiller Room #2" },
  { v: "chiller-3",   ar: "غرفة التبريد #3", en: "Chiller Room #3" },
  { v: "freezer-1",   ar: "غرفة التجميد #1", en: "Freezer Room #1" },
  { v: "freezer-2",   ar: "غرفة التجميد #2", en: "Freezer Room #2" },
  { v: "freezer-3",   ar: "غرفة التجميد #3", en: "Freezer Room #3" },
  { v: "receiving",   ar: "منطقة الاستلام", en: "Receiving Bay" },
  { v: "dispatch",    ar: "منطقة الشحن",     en: "Dispatch Bay" },
  { v: "handwash",    ar: "أحواض غسل اليدين", en: "Hand-washing sinks" },
  { v: "toilets",     ar: "دورات المياه",     en: "Toilets" },
  { v: "lockers",     ar: "غرف تغيير الملابس", en: "Locker rooms" },
  { v: "knives",      ar: "السكاكين والأدوات", en: "Knives and tools" },
  { v: "boards",      ar: "ألواح التقطيع",     en: "Cutting boards" },
  { v: "mixers",      ar: "خلاطات اللحوم",     en: "Meat mixers" },
  { v: "floors",      ar: "أرضيات المستودع",   en: "Warehouse floors" },
  { v: "drains",      ar: "مصارف المياه", en: "Drains" },
];

const SANITIZERS = [
  { v: "quat200",     ar: "Quaternary Ammonium (Quat) 200ppm", en: "Quaternary Ammonium (Quat) 200ppm" },
  { v: "chlorine",    ar: "Chlorine 100-200ppm",                en: "Chlorine 100-200ppm" },
  { v: "hotwater",    ar: "ماء ساخن (82°م+)",                  en: "Hot water (82°C+)" },
  { v: "peracetic",   ar: "Peracetic Acid",                     en: "Peracetic Acid" },
  { v: "alcohol",     ar: "كحول 70%",                           en: "Alcohol 70%" },
  { v: "other",       ar: "أخرى",                                en: "Other" },
];

const SHIFTS = [
  { v: "morning", ar: "صباحية", en: "Morning" },
  { v: "evening", ar: "مسائية", en: "Evening" },
  { v: "night",   ar: "ليلية",  en: "Night" },
];

export default function HSECleaningLog() {
  return (
    <HSEGenericLog
      storageKey="cleaning_log"
      formCode="F-10"
      icon="🧼"
      title={{ ar: "سجل التنظيف والتعقيم", en: "Cleaning & Sanitation Log" }}
      subtitle={{ ar: "مطلوب يومياً للمناطق الحرجة (HACCP) + أسبوعي + شهري للتنظيف العميق",
                  en: "Daily for critical areas (HACCP) + weekly + monthly deep cleaning" }}
      steps={[
        { ar: "اختر نوع التنظيف والمنطقة أو المعدّة التي نُظِّفت، والورديّة.", en: "Choose the cleaning type, the area or equipment cleaned, and the shift." },
        { ar: "سجّل التاريخ والوقت الفعلي لانتهاء التنظيف — لا يُقبل تاريخ مستقبلي ولا أقدم من 7 أيام.", en: "Record the actual date and time the cleaning finished — no future dates and nothing older than 7 days." },
        { ar: "إذا استُخدم معقّم كيميائي: اكتب التركيز ووقت التلامس (1–60 دقيقة).", en: "If a chemical sanitizer was used: enter its concentration and contact time (1–60 min)." },
        { ar: "أكّد الشطف والفحص البصري، وإن لم يتحقّقا اكتب المشكلة في الملاحظات.", en: "Confirm the rinse and the visual check; if either failed, describe the problem in the notes." },
        { ar: "يوقّع مسؤول سلامة الغذاء كمتحقِّق — ولا يكون هو نفسه منفّذ التنظيف.", en: "The Food Safety Officer signs as verifier — and must not be the person who did the cleaning." },
      ]}
      guidance={[
        { kind: "warn", ar: "لا تخلط الكلور مع منتجات الأمونيوم الرباعي أو الأحماض — ينتج غازاً سامّاً.", en: "Never mix chlorine with quaternary ammonium or acid products — it releases toxic gas." },
        { kind: "tip",  ar: "Quat 200ppm و Chlorine 100–200ppm هي التراكيز المعتمدة لأسطح ملامسة الغذاء؛ استخدم شرائط الاختبار للتأكد.", en: "Quat 200 ppm and chlorine 100–200 ppm are the approved food-contact concentrations; confirm with test strips." },
        { kind: "tip",  ar: "الماء الساخن للتعقيم يجب أن يكون 82°م أو أعلى.", en: "Hot-water sanitizing must be at 82 °C or above." },
      ]}
      fields={[
        { key: "date",          label: { ar: "التاريخ", en: "Date" }, type: "date", default: todayISO(), required: true, notFuture: true, maxPastDays: 7 },
        { key: "time",          label: { ar: "الوقت", en: "Time" }, type: "time", default: nowHHMM(), hint: { ar: "وقت انتهاء التنظيف", en: "Time the cleaning finished" } },
        { key: "frequency",     label: { ar: "نوع التنظيف", en: "Cleaning Type" }, type: "select", options: FREQUENCY, default: "daily", required: true },
        { key: "area",          label: { ar: "المنطقة / المعدة", en: "Area / Equipment" }, type: "select", options: AREAS, required: true },
        { key: "shift",         label: { ar: "الورديّة", en: "Shift" }, type: "select", options: SHIFTS, default: "morning" },
        { key: "cleanedBy",     label: { ar: "نُفّذ بواسطة", en: "Performed by" }, type: "text", required: true, minLength: 2, maxLength: 80 },
        { key: "sanitizerUsed", label: { ar: "المعقّم المستخدم", en: "Sanitizer used" }, type: "select", options: SANITIZERS },
        { key: "concentration", label: { ar: "التركيز / الكمية", en: "Concentration / Amount" }, type: "text", placeholder: { ar: "مثلاً: 200ppm, 50ml/لتر", en: "e.g., 200ppm, 50ml/L" }, requiredIf: (d) => !!d.sanitizerUsed && d.sanitizerUsed !== "hotwater", maxLength: 40 },
        { key: "contactTime",   label: { ar: "وقت التلامس (دقائق)", en: "Contact time (min)" }, type: "number", int: true, min: 1, max: 60, requiredIf: (d) => !!d.sanitizerUsed && d.sanitizerUsed !== "hotwater", hint: { ar: "من 1 إلى 60 دقيقة", en: "1 to 60 minutes" } },
        { key: "rinseDone",     label: { ar: "✅ تم الشطف بالماء النظيف", en: "✅ Rinsed with clean water" }, type: "checkbox" },
        { key: "visualCheck",   label: { ar: "✅ فحص بصري بعد التنظيف ناجح", en: "✅ Post-cleaning visual check passed" }, type: "checkbox" },
        { key: "verifiedBy",    label: { ar: "تحقّق بواسطة (مسؤول سلامة الغذاء)", en: "Verified by (Food Safety Officer)" }, type: "text", maxLength: 80, validate: (v, d) => v && d.cleanedBy && v.trim().toLowerCase() === d.cleanedBy.trim().toLowerCase() ? { ar: "المتحقِّق يجب أن يكون شخصاً غير المنفِّذ", en: "The verifier must be a different person from the performer" } : null },
        { key: "notes",         label: { ar: "ملاحظات / مشاكل لُوحظت", en: "Notes / issues observed" }, type: "textarea", fullWidth: true, requiredIf: (d) => !d.visualCheck || !d.rinseDone, requiredMsg: { ar: "الفحص البصري أو الشطف غير مؤكَّد — اكتب المشكلة والإجراء المتَّخذ", en: "Visual check or rinse not confirmed — describe the issue and the action taken" } },
      ]}
      listColumns={[
        { key: "date",          label: { ar: "التاريخ", en: "Date" } },
        { key: "frequency",     label: { ar: "النوع", en: "Type" }, options: FREQUENCY },
        { key: "area",          label: { ar: "المنطقة", en: "Area" }, options: AREAS },
        { key: "cleanedBy",     label: { ar: "المُنفّذ", en: "Performer" } },
        { key: "sanitizerUsed", label: { ar: "المعقّم", en: "Sanitizer" }, options: SANITIZERS },
        { key: "concentration", label: { ar: "التركيز", en: "Concentration" } },
        { key: "verifiedBy",    label: { ar: "التحقق", en: "Verified" } },
      ]}
    />
  );
}
