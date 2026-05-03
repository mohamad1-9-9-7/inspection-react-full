// src/pages/hse/HSEMedicalChecks.jsx — F-14 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const CHECK_TYPES = [
  { v: "preEmployment",  ar: "🆕 قبل التوظيف",            en: "🆕 Pre-employment" },
  { v: "annual",         ar: "🗓️ سنوي دوري",              en: "🗓️ Annual" },
  { v: "halfyear",       ar: "📅 نصف سنوي (Cold environment)", en: "📅 Half-yearly (Cold environment)" },
  { v: "postIncident",   ar: "🚨 بعد حادث",               en: "🚨 Post-incident" },
  { v: "fitnessReturn",  ar: "🔁 العودة للعمل (Fit-to-work)", en: "🔁 Return-to-work (Fitness)" },
];

const RESULTS = [
  { v: "fit",                  ar: "✅ لائق",            en: "✅ Fit" },
  { v: "fitWithRestrictions",  ar: "🟡 لائق مع قيود",    en: "🟡 Fit with restrictions" },
  { v: "unfit",                ar: "🔴 غير لائق",         en: "🔴 Unfit" },
  { v: "pending",              ar: "⏳ قيد الانتظار",     en: "⏳ Pending" },
];

export default function HSEMedicalChecks() {
  return (
    <HSEGenericLog
      storageKey="medical_checks"
      formCode="F-14"
      icon="🩺"
      title={{ ar: "سجل الفحص الطبي للعاملين", en: "Employee Medical Check Log" }}
      subtitle={{ ar: "إلزامي سنوياً + بطاقة صحية لمتعاملي الغذاء + متابعة العمل في البيئات الباردة",
                  en: "Annual + Health Card for food handlers + Cold-environment fitness tracking" }}
      fields={[
        { key: "date",             label: { ar: "تاريخ الفحص", en: "Check date" }, type: "date", default: todayISO(), required: true },
        { key: "employeeName",     label: { ar: "اسم الموظف", en: "Employee name" }, type: "text", required: true },
        { key: "employeeId",       label: { ar: "رقم الموظف", en: "Employee ID" }, type: "text" },
        { key: "department",       label: { ar: "القسم", en: "Department" }, type: "text" },
        { key: "jobRole",          label: { ar: "الوظيفة", en: "Job role" }, type: "text" },
        { key: "checkType",        label: { ar: "نوع الفحص", en: "Check type" }, type: "select", options: CHECK_TYPES, required: true },
        { key: "clinic",           label: { ar: "المركز الطبي / العيادة", en: "Clinic / Medical center" }, type: "text" },
        { key: "doctorName",       label: { ar: "اسم الطبيب", en: "Doctor's name" }, type: "text" },
        { key: "healthCardNo",     label: { ar: "رقم البطاقة الصحية (DM)", en: "Health Card No. (DM)" }, type: "text" },
        { key: "healthCardExpiry",label:{ ar: "انتهاء البطاقة الصحية", en: "Health card expiry" }, type: "date" },
        { key: "result",           label: { ar: "نتيجة اللياقة الطبية", en: "Fitness result" }, type: "select", options: RESULTS, default: "fit" },
        { key: "restrictions",     label: { ar: "القيود (إن وجدت)", en: "Restrictions (if any)" }, type: "textarea" },
        { key: "tbScreening",      label: { ar: "✅ فحص السل (TB Screening)", en: "✅ TB Screening" }, type: "checkbox" },
        { key: "stoolCulture",     label: { ar: "✅ زراعة براز (Stool Culture)", en: "✅ Stool Culture" }, type: "checkbox" },
        { key: "hepatitisAB",      label: { ar: "✅ التهاب الكبد A/B", en: "✅ Hepatitis A/B" }, type: "checkbox" },
        { key: "vision",           label: { ar: "✅ فحص النظر", en: "✅ Vision check" }, type: "checkbox" },
        { key: "hearing",          label: { ar: "✅ فحص السمع", en: "✅ Hearing check" }, type: "checkbox" },
        { key: "bloodTest",        label: { ar: "✅ تحاليل دم (CBC)", en: "✅ Blood test (CBC)" }, type: "checkbox" },
        { key: "vaccinations",     label: { ar: "التطعيمات الحالية", en: "Current vaccinations" }, type: "textarea" },
        { key: "nextCheckDate",    label: { ar: "موعد الفحص القادم", en: "Next check date" }, type: "date" },
        { key: "notes",            label: { ar: "ملاحظات الطبيب", en: "Doctor's notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",          label: { ar: "التاريخ", en: "Date" } },
        { key: "employeeName",  label: { ar: "الموظف", en: "Employee" } },
        { key: "department",    label: { ar: "القسم", en: "Dept." } },
        { key: "checkType",     label: { ar: "النوع", en: "Type" }, options: CHECK_TYPES },
        { key: "result",        label: { ar: "النتيجة", en: "Result" }, options: RESULTS },
        { key: "healthCardExpiry",label:{ ar: "البطاقة تنتهي", en: "Card expires" } },
        { key: "nextCheckDate", label: { ar: "الفحص القادم", en: "Next check" } },
      ]}
    />
  );
}
