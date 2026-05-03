// src/pages/hse/HSEEvacuationDrills.jsx — F-16 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO, nowHHMM, SITE_LOCATIONS } from "./hseShared";

const SCENARIOS = [
  { v: "fire",            ar: "🔥 حريق", en: "🔥 Fire" },
  { v: "ammonia",         ar: "💨 تسرب أمونيا", en: "💨 Ammonia leak" },
  { v: "freon",           ar: "❄️ تسرب فريون", en: "❄️ Freon leak" },
  { v: "powerCut",        ar: "🔌 انقطاع كهرباء مطوّل", en: "🔌 Extended power outage" },
  { v: "earthquake",      ar: "🌍 زلزال / كارثة", en: "🌍 Earthquake / Disaster" },
  { v: "medicalEmergency",ar: "🩺 إصابات جماعية", en: "🩺 Mass casualties" },
  { v: "spill",           ar: "🧪 انسكاب كيماوي", en: "🧪 Chemical spill" },
  { v: "lockedFreezer",   ar: "🧊 احتجاز شخص في غرفة التجميد", en: "🧊 Person trapped in freezer" },
  { v: "other",           ar: "أخرى", en: "Other" },
];

const DRILL_TYPES = [
  { v: "announced",   ar: "📢 معلنة (Announced)",   en: "📢 Announced" },
  { v: "unannounced", ar: "🔕 مفاجئة (Unannounced)",en: "🔕 Unannounced" },
  { v: "tabletop",    ar: "📋 ورقية (Tabletop)",    en: "📋 Tabletop" },
];

export default function HSEEvacuationDrills() {
  return (
    <HSEGenericLog
      storageKey="evacuation_drills"
      formCode="F-16"
      icon="🚨"
      title={{ ar: "سجل تجارب الإخلاء والإطفاء", en: "Evacuation & Fire Drill Log" }}
      subtitle={{ ar: "ربع سنوي إلزامي · سيناريوهات: حريق - تسرب أمونيا - انقطاع كهرباء - زلزال",
                  en: "Quarterly mandatory · Scenarios: fire / ammonia / power outage / earthquake" }}
      fields={[
        { key: "date",            label: { ar: "تاريخ التجربة", en: "Drill date" }, type: "date", default: todayISO(), required: true },
        { key: "startTime",       label: { ar: "وقت بدء التجربة", en: "Drill start time" }, type: "time", default: nowHHMM() },
        { key: "scenario",        label: { ar: "السيناريو", en: "Scenario" }, type: "select", options: SCENARIOS, required: true },
        { key: "location",        label: { ar: "الموقع", en: "Location" }, type: "select", options: SITE_LOCATIONS, required: true },
        { key: "drillType",       label: { ar: "نوع التجربة", en: "Drill type" }, type: "select", options: DRILL_TYPES, default: "unannounced" },
        { key: "totalParticipants",label:{ ar: "إجمالي المشاركين", en: "Total participants" }, type: "number", required: true },
        { key: "evacuationTimeSeconds",label:{ ar: "زمن الإخلاء (ثانية)", en: "Evacuation time (sec)" }, type: "number" },
        { key: "fireWardenName",  label: { ar: "اسم رئيس فريق الإطفاء", en: "Fire warden name" }, type: "text" },
        { key: "wardensPresent",  label: { ar: "عدد رؤساء الفرق الحاضرين", en: "Wardens present" }, type: "number" },
        { key: "alarmHeard",      label: { ar: "✅ نظام الإنذار سُمع في كل المناطق", en: "✅ Alarm heard in all areas" }, type: "checkbox" },
        { key: "exitsClear",      label: { ar: "✅ مخارج الطوارئ نظيفة وغير مغلقة", en: "✅ Emergency exits clear" }, type: "checkbox" },
        { key: "assemblyPointsUsed",label:{ ar: "✅ نقاط التجمع استُخدمت بشكل صحيح", en: "✅ Assembly points used correctly" }, type: "checkbox" },
        { key: "rollCallDone",    label: { ar: "✅ تم نداء الأسماء (Roll Call) في نقطة التجمع", en: "✅ Roll call done at assembly point" }, type: "checkbox" },
        { key: "missingEmployees",label: { ar: "✅ لا يوجد موظفون مفقودون", en: "✅ No missing employees" }, type: "checkbox" },
        { key: "civilDefenseInformed",label:{ ar: "✅ تم إبلاغ الدفاع المدني (في السيناريوهات الحقيقية)", en: "✅ Civil Defence informed (in real scenarios)" }, type: "checkbox" },
        { key: "issuesObserved",  label: { ar: "المشاكل والملاحظات", en: "Issues & observations" }, type: "textarea", fullWidth: true },
        { key: "improvementActions",label:{ ar: "إجراءات التحسين المطلوبة", en: "Improvement actions required" }, type: "textarea", fullWidth: true },
        { key: "nextDrillDate",   label: { ar: "موعد التجربة القادمة", en: "Next drill date" }, type: "date" },
        { key: "evaluatedBy",     label: { ar: "تم التقييم بواسطة (HSE Manager)", en: "Evaluated by (HSE Manager)" }, type: "text" },
        { key: "notes",           label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",            label: { ar: "التاريخ", en: "Date" } },
        { key: "scenario",        label: { ar: "السيناريو", en: "Scenario" }, options: SCENARIOS },
        { key: "location",        label: { ar: "الموقع", en: "Location" }, options: SITE_LOCATIONS },
        { key: "drillType",       label: { ar: "النوع", en: "Type" }, options: DRILL_TYPES },
        { key: "totalParticipants",label:{ ar: "المشاركون", en: "Participants" } },
        { key: "evacuationTimeSeconds",label:{ ar: "زمن الإخلاء (ث)", en: "Evac. time (s)" } },
        { key: "evaluatedBy",     label: { ar: "المُقيّم", en: "Evaluator" } },
      ]}
    />
  );
}
