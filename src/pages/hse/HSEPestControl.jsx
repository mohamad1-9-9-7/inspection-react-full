// src/pages/hse/HSEPestControl.jsx — F-12 bilingual (simplified + file upload)
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const VISIT_TYPES = [
  { v: "monthly",   ar: "🗓️ شهري دوري",     en: "🗓️ Monthly routine" },
  { v: "emergency", ar: "🚨 طارئ (انتشار آفات)", en: "🚨 Emergency (Infestation)" },
  { v: "followup",  ar: "🔁 متابعة",         en: "🔁 Follow-up" },
];

export default function HSEPestControl() {
  return (
    <HSEGenericLog
      storageKey="pest_control_log"
      formCode="F-12"
      icon="🪳"
      title={{ ar: "سجل مكافحة الحشرات والقوارض", en: "Pest & Rodent Control Log" }}
      subtitle={{ ar: "زيارة شهرية إلزامية من شركة معتمدة من بلدية دبي",
                  en: "Mandatory monthly visit by DM-approved company" }}
      steps={[
        { ar: "سجّل تاريخ الزيارة واسم الشركة المعتمدة والفني ونوع الزيارة.", en: "Record the visit date, the approved company, the technician and the visit type." },
        { ar: "اكتب الآفات المرصودة (أو اتركها فارغة إذا لا شيء)، وإذا وُجدت فاكتب الإجراء المتَّخذ.", en: "List the pests found (or leave blank if none); if any were found, describe the action taken." },
        { ar: "أرفق تقرير الشركة أو الصور.", en: "Attach the company's report or photos." },
        { ar: "حدّد موعد الزيارة القادمة — للزيارات الشهرية خلال 35 يوماً كحد أقصى.", en: "Set the next visit date — for monthly visits, within 35 days at most." },
        { ar: "يوقّع مسؤول HSE على استلام التقرير.", en: "The HSE Officer signs for receiving the report." },
      ]}
      guidance={[
        { kind: "warn", ar: "المبيدات لا تُستخدم فوق أسطح ملامسة الغذاء ولا بوجود منتج مكشوف.", en: "No pesticide over food-contact surfaces or near exposed product." },
        { kind: "tip",  ar: "احتفظ بخريطة مواقع الطُّعوم وراجعها مع الفني في كل زيارة.", en: "Keep the bait-station map and review it with the technician at every visit." },
      ]}
      fields={[
        { key: "date",          label: { ar: "تاريخ الزيارة", en: "Visit date" }, type: "date", default: todayISO(), required: true, notFuture: true },
        { key: "company",       label: { ar: "شركة المكافحة", en: "Pest control company" }, type: "text", required: true, placeholder: { ar: "Rentokil / شركة معتمدة…", en: "Rentokil / approved company…" }, minLength: 2, maxLength: 120 },
        { key: "technicianName",label: { ar: "اسم الفني", en: "Technician name" }, type: "text", required: true, maxLength: 80 },
        { key: "visitType",     label: { ar: "نوع الزيارة", en: "Visit type" }, type: "select", options: VISIT_TYPES, default: "monthly", required: true },
        { key: "pestsFound",    label: { ar: "الحشرات/القوارض المكتشفة", en: "Pests/rodents found" }, type: "textarea", fullWidth: true, placeholder: { ar: "نوع، عدد، موقع — أو اتركه فارغاً إذا لا شيء", en: "Type, count, location — leave blank if none" } },
        { key: "treatment",     label: { ar: "الإجراء المُتَّخذ", en: "Action taken" }, type: "textarea", fullWidth: true, placeholder: { ar: "نوع المبيد / فخاخ / تنظيف…", en: "Pesticide / traps / cleaning…" }, requiredIf: (d) => !!String(d.pestsFound || "").trim() || d.visitType === "emergency", requiredMsg: { ar: "تم رصد آفات / زيارة طارئة — اكتب الإجراء المتَّخذ", en: "Pests found / emergency visit — describe the action taken" } },
        { key: "attachments",   label: { ar: "📎 تقرير الشركة / صور (PDF أو صورة)", en: "📎 Company report / photos (PDF or image)" }, type: "file", fullWidth: true },
        { key: "nextVisitDate", label: { ar: "موعد الزيارة القادمة", en: "Next visit date" }, type: "date", after: "date", requiredIf: (d) => d.visitType === "monthly", validate: (v, d) => { if (!v || !d.date || d.visitType !== "monthly") return null; const days = (new Date(v) - new Date(d.date)) / 86400000; return days > 35 ? { ar: "الزيارة الشهرية القادمة يجب ألا تتجاوز 35 يوماً", en: "The next monthly visit must be within 35 days" } : null; } },
        { key: "receivedBy",    label: { ar: "استلم التقرير", en: "Report received by (HSE Officer)" }, type: "text", required: true, maxLength: 80 },
      ]}
      listColumns={[
        { key: "date",          label: { ar: "التاريخ", en: "Date" } },
        { key: "company",       label: { ar: "الشركة", en: "Company" } },
        { key: "visitType",     label: { ar: "النوع", en: "Type" }, options: VISIT_TYPES },
        { key: "pestsFound",    label: { ar: "الحشرات/القوارض", en: "Pests/Rodents" } },
        { key: "attachments",   label: { ar: "المرفقات", en: "Attachments" }, type: "file" },
        { key: "nextVisitDate", label: { ar: "الزيارة القادمة", en: "Next visit" } },
      ]}
    />
  );
}
