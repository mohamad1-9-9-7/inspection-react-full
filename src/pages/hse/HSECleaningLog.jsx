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
  { v: "receiving",   ar: "منطقة الاستلام (Receiving Bay)", en: "Receiving Bay" },
  { v: "dispatch",    ar: "منطقة الشحن (Dispatch Bay)",     en: "Dispatch Bay" },
  { v: "handwash",    ar: "أحواض غسل اليدين", en: "Hand-washing sinks" },
  { v: "toilets",     ar: "دورات المياه",     en: "Toilets" },
  { v: "lockers",     ar: "غرف تغيير الملابس", en: "Locker rooms" },
  { v: "knives",      ar: "السكاكين والأدوات", en: "Knives and tools" },
  { v: "boards",      ar: "ألواح التقطيع",     en: "Cutting boards" },
  { v: "mixers",      ar: "خلاطات اللحوم",     en: "Meat mixers" },
  { v: "floors",      ar: "أرضيات المستودع",   en: "Warehouse floors" },
  { v: "drains",      ar: "مصارف المياه (Drains)", en: "Drains" },
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
      fields={[
        { key: "date",          label: { ar: "التاريخ", en: "Date" }, type: "date", default: todayISO(), required: true },
        { key: "time",          label: { ar: "الوقت", en: "Time" }, type: "time", default: nowHHMM() },
        { key: "frequency",     label: { ar: "نوع التنظيف", en: "Cleaning Type" }, type: "select", options: FREQUENCY, default: "daily", required: true },
        { key: "area",          label: { ar: "المنطقة / المعدة", en: "Area / Equipment" }, type: "select", options: AREAS, required: true },
        { key: "shift",         label: { ar: "الورديّة", en: "Shift" }, type: "select", options: SHIFTS, default: "morning" },
        { key: "cleanedBy",     label: { ar: "نُفّذ بواسطة", en: "Performed by" }, type: "text", required: true },
        { key: "sanitizerUsed", label: { ar: "المعقّم المستخدم", en: "Sanitizer used" }, type: "select", options: SANITIZERS },
        { key: "concentration", label: { ar: "التركيز / الكمية", en: "Concentration / Amount" }, type: "text", placeholder: { ar: "مثلاً: 200ppm, 50ml/لتر", en: "e.g., 200ppm, 50ml/L" } },
        { key: "contactTime",   label: { ar: "وقت التلامس (دقائق)", en: "Contact time (min)" }, type: "number" },
        { key: "rinseDone",     label: { ar: "✅ تم الشطف بالماء النظيف", en: "✅ Rinsed with clean water" }, type: "checkbox" },
        { key: "visualCheck",   label: { ar: "✅ فحص بصري بعد التنظيف ناجح", en: "✅ Post-cleaning visual check passed" }, type: "checkbox" },
        { key: "verifiedBy",    label: { ar: "تحقّق بواسطة (Food Safety Officer)", en: "Verified by (Food Safety Officer)" }, type: "text" },
        { key: "notes",         label: { ar: "ملاحظات / مشاكل لُوحظت", en: "Notes / issues observed" }, type: "textarea", fullWidth: true },
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
