// src/pages/hse/HSEPestControl.jsx — F-12 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const VISIT_TYPES = [
  { v: "monthly",   ar: "🗓️ شهري دوري",     en: "🗓️ Monthly routine" },
  { v: "emergency", ar: "🚨 طارئ (Infestation)", en: "🚨 Emergency (Infestation)" },
  { v: "followup",  ar: "🔁 متابعة",         en: "🔁 Follow-up" },
  { v: "audit",     ar: "🔍 تدقيق",          en: "🔍 Audit" },
];

export default function HSEPestControl() {
  return (
    <HSEGenericLog
      storageKey="pest_control_log"
      formCode="F-12"
      icon="🪳"
      title={{ ar: "سجل مكافحة الحشرات والقوارض", en: "Pest & Rodent Control Log" }}
      subtitle={{ ar: "زيارة شهرية إلزامية من شركة معتمدة من بلدية دبي + تفقّد المصائد",
                  en: "Mandatory monthly visit by DM-approved company + trap inspection" }}
      fields={[
        { key: "date",         label: { ar: "تاريخ الزيارة", en: "Visit date" }, type: "date", default: todayISO(), required: true },
        { key: "company",      label: { ar: "شركة المكافحة", en: "Pest control company" }, type: "text", required: true, placeholder: { ar: "Rentokil / شركة معتمدة…", en: "Rentokil / approved company…" } },
        { key: "licenseNo",    label: { ar: "رقم ترخيص الشركة (DM)", en: "Company license No. (DM)" }, type: "text" },
        { key: "technicianName",label:{ ar: "اسم الفني", en: "Technician name" }, type: "text", required: true },
        { key: "visitType",    label: { ar: "نوع الزيارة", en: "Visit type" }, type: "select", options: VISIT_TYPES, default: "monthly" },
        { key: "areasInspected",label:{ ar: "المناطق المفحوصة", en: "Areas inspected" }, type: "textarea" },
        { key: "trapsChecked", label: { ar: "عدد المصائد المفحوصة", en: "Traps inspected" }, type: "number" },
        { key: "trapsActive",  label: { ar: "مصائد نشطة (سليمة)", en: "Active traps (intact)" }, type: "number" },
        { key: "trapsTriggered",label:{ ar: "مصائد التُقِطت بها قوارض/حشرات", en: "Traps triggered (catches)" }, type: "number" },
        { key: "pestsFound",   label: { ar: "الحشرات/القوارض المكتشفة", en: "Pests/rodents found" }, type: "textarea", fullWidth: true, placeholder: { ar: "نوع، عدد، موقع", en: "Type, count, location" } },
        { key: "treatmentApplied",label:{ ar: "العلاج المُطبَّق", en: "Treatment applied" }, type: "textarea", fullWidth: true, placeholder: { ar: "نوع المبيد، التركيز، الكمية", en: "Pesticide, concentration, amount" } },
        { key: "chemicalUsed", label: { ar: "المبيد المستخدم", en: "Pesticide used" }, type: "text" },
        { key: "msdsAttached", label: { ar: "✅ شهادة MSDS متوفرة", en: "✅ MSDS available" }, type: "checkbox" },
        { key: "approvedByDM", label: { ar: "✅ المبيد مُعتمد من بلدية دبي", en: "✅ Pesticide DM-approved" }, type: "checkbox" },
        { key: "recommendations",label:{ ar: "توصيات الفني للشركة", en: "Technician recommendations" }, type: "textarea", fullWidth: true },
        { key: "nextVisitDate",label: { ar: "موعد الزيارة القادمة", en: "Next visit date" }, type: "date" },
        { key: "receivedBy",   label: { ar: "استلم التقرير (HSE Officer)", en: "Report received by (HSE Officer)" }, type: "text" },
        { key: "notes",        label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",         label: { ar: "التاريخ", en: "Date" } },
        { key: "company",      label: { ar: "الشركة", en: "Company" } },
        { key: "technicianName",label:{ ar: "الفني", en: "Technician" } },
        { key: "visitType",    label: { ar: "النوع", en: "Type" }, options: VISIT_TYPES },
        { key: "trapsChecked", label: { ar: "مصائد مفحوصة", en: "Traps inspected" } },
        { key: "trapsTriggered",label:{ ar: "إصابات", en: "Catches" } },
        { key: "nextVisitDate",label: { ar: "الزيارة القادمة", en: "Next visit" } },
      ]}
    />
  );
}
