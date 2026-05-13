// src/pages/hse/HSEPestControl.jsx — F-12 bilingual (simplified + file upload)
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const VISIT_TYPES = [
  { v: "monthly",   ar: "🗓️ شهري دوري",     en: "🗓️ Monthly routine" },
  { v: "emergency", ar: "🚨 طارئ (Infestation)", en: "🚨 Emergency (Infestation)" },
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
      fields={[
        { key: "date",          label: { ar: "تاريخ الزيارة", en: "Visit date" }, type: "date", default: todayISO(), required: true },
        { key: "company",       label: { ar: "شركة المكافحة", en: "Pest control company" }, type: "text", required: true, placeholder: { ar: "Rentokil / شركة معتمدة…", en: "Rentokil / approved company…" } },
        { key: "technicianName",label: { ar: "اسم الفني", en: "Technician name" }, type: "text" },
        { key: "visitType",     label: { ar: "نوع الزيارة", en: "Visit type" }, type: "select", options: VISIT_TYPES, default: "monthly" },
        { key: "pestsFound",    label: { ar: "الحشرات/القوارض المكتشفة", en: "Pests/rodents found" }, type: "textarea", fullWidth: true, placeholder: { ar: "نوع، عدد، موقع — أو اتركه فارغاً إذا لا شيء", en: "Type, count, location — leave blank if none" } },
        { key: "treatment",     label: { ar: "الإجراء المُتَّخذ", en: "Action taken" }, type: "textarea", fullWidth: true, placeholder: { ar: "نوع المبيد / فخاخ / تنظيف…", en: "Pesticide / traps / cleaning…" } },
        { key: "attachments",   label: { ar: "📎 تقرير الشركة / صور (PDF أو صورة)", en: "📎 Company report / photos (PDF or image)" }, type: "file", fullWidth: true },
        { key: "nextVisitDate", label: { ar: "موعد الزيارة القادمة", en: "Next visit date" }, type: "date" },
        { key: "receivedBy",    label: { ar: "استلم التقرير (HSE Officer)", en: "Report received by (HSE Officer)" }, type: "text" },
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
