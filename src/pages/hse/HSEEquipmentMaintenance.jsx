// src/pages/hse/HSEEquipmentMaintenance.jsx — F-13/F-18 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const EQUIPMENT = [
  { v: "forklift",   ar: "🚜 رافعة شوكية (Forklift)", en: "🚜 Forklift" },
  { v: "slicer",     ar: "🔪 آلة تقطيع (Slicer)",     en: "🔪 Slicer" },
  { v: "mixer",      ar: "🥩 خلاطة لحوم (Mixer)",     en: "🥩 Meat Mixer" },
  { v: "compressor", ar: "❄️ ضاغط تبريد (Compressor)", en: "❄️ Refrigeration Compressor" },
  { v: "refunit",    ar: "🌡️ نظام تبريد كامل (Refrigeration Unit)", en: "🌡️ Refrigeration Unit" },
  { v: "gasdetector",ar: "💨 كاشف غاز أمونيا/CO",     en: "💨 Ammonia/CO Gas Detector" },
  { v: "coldroom",   ar: "🧊 غرفة تبريد",              en: "🧊 Cold Room" },
  { v: "fire",       ar: "🔥 نظام إطفاء (Sprinkler / Alarm)", en: "🔥 Fire Suppression (Sprinkler / Alarm)" },
  { v: "door",       ar: "🚪 باب تبريد / Strip Curtains", en: "🚪 Cold-room Door / Strip Curtains" },
  { v: "datalogger", ar: "📊 جهاز تسجيل حرارة (Data Logger)", en: "📊 Data Logger" },
  { v: "generator",  ar: "🏭 مولد كهرباء احتياطي",     en: "🏭 Backup Generator" },
  { v: "other",      ar: "أخرى",                       en: "Other" },
];

const MAINT_TYPES = [
  { v: "preventive",  ar: "🛡️ وقائية (Preventive)",   en: "🛡️ Preventive" },
  { v: "corrective",  ar: "🔧 تصحيحية (Corrective)",   en: "🔧 Corrective" },
  { v: "calibration", ar: "📐 معايرة (Calibration)",   en: "📐 Calibration" },
  { v: "inspection",  ar: "🔍 فحص دوري",               en: "🔍 Periodic Inspection" },
  { v: "emergency",   ar: "🚨 طارئة",                  en: "🚨 Emergency" },
];

const RESULTS = [
  { v: "ok",             ar: "✅ سليمة وجاهزة", en: "✅ OK / Ready" },
  { v: "needsAttention", ar: "⚠️ تحتاج متابعة", en: "⚠️ Needs follow-up" },
  { v: "outOfService",   ar: "🚫 خارج الخدمة",  en: "🚫 Out of service" },
];

export default function HSEEquipmentMaintenance() {
  return (
    <HSEGenericLog
      storageKey="equipment_maintenance"
      formCode="F-13 / F-18"
      icon="🔧"
      title={{ ar: "سجل صيانة المعدات وأنظمة التبريد", en: "Equipment & Refrigeration Maintenance Log" }}
      subtitle={{ ar: "رافعات شوكية، آلات تقطيع، ضواغط التبريد، كواشف الغازات، أنظمة الإطفاء",
                  en: "Forklifts, slicers, refrigeration compressors, gas detectors, fire systems" }}
      fields={[
        { key: "date",            label: { ar: "تاريخ الصيانة", en: "Maintenance date" }, type: "date", default: todayISO(), required: true },
        { key: "equipmentType",   label: { ar: "نوع المعدة", en: "Equipment type" }, type: "select", options: EQUIPMENT, required: true },
        { key: "equipmentId",     label: { ar: "رقم المعدة / الموقع", en: "Equipment ID / Location" }, type: "text", required: true },
        { key: "maintenanceType", label: { ar: "نوع الصيانة", en: "Maintenance type" }, type: "select", options: MAINT_TYPES, required: true },
        { key: "performedBy",     label: { ar: "نُفّذت بواسطة (Technician/Company)", en: "Performed by (Technician/Company)" }, type: "text", required: true },
        { key: "certifiedTechnician",label:{ ar: "✅ فني معتمد (تبريد - يلزم لغازات الأمونيا/الفريون)", en: "✅ Certified technician (refrigeration - required for ammonia/freon)" }, type: "checkbox" },
        { key: "workDescription", label: { ar: "وصف العمل المُنفّذ", en: "Work description" }, type: "textarea", fullWidth: true, required: true },
        { key: "partsReplaced",   label: { ar: "قطع غيار مستبدلة", en: "Parts replaced" }, type: "textarea" },
        { key: "lotoApplied",     label: { ar: "✅ تم تطبيق LOTO أثناء الصيانة", en: "✅ LOTO applied during maintenance" }, type: "checkbox" },
        { key: "testingDone",     label: { ar: "✅ تم الاختبار بعد الصيانة", en: "✅ Post-maintenance testing done" }, type: "checkbox" },
        { key: "result",          label: { ar: "نتيجة الفحص بعد الصيانة", en: "Post-maintenance result" }, type: "select", options: RESULTS, default: "ok" },
        { key: "downtimeHours",   label: { ar: "ساعات التوقف", en: "Downtime (hours)" }, type: "number" },
        { key: "cost",            label: { ar: "التكلفة (درهم)", en: "Cost (AED)" }, type: "number" },
        { key: "nextScheduledDate",label:{ ar: "موعد الصيانة القادم", en: "Next scheduled date" }, type: "date" },
        { key: "notes",           label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",            label: { ar: "التاريخ", en: "Date" } },
        { key: "equipmentType",   label: { ar: "المعدة", en: "Equipment" }, options: EQUIPMENT },
        { key: "equipmentId",     label: { ar: "رقم/موقع", en: "ID/Location" } },
        { key: "maintenanceType", label: { ar: "النوع", en: "Type" }, options: MAINT_TYPES },
        { key: "performedBy",     label: { ar: "بواسطة", en: "By" } },
        { key: "result",          label: { ar: "النتيجة", en: "Result" }, options: RESULTS },
        { key: "nextScheduledDate",label:{ ar: "القادم", en: "Next" } },
      ]}
    />
  );
}
