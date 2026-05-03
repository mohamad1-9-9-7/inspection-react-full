// src/pages/hse/HSEContractorsVisitors.jsx — F-17 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO, nowHHMM, SITE_LOCATIONS } from "./hseShared";

const TYPES = [
  { v: "visitor",     ar: "👤 زائر", en: "👤 Visitor" },
  { v: "auditor",     ar: "🔍 مدقّق / مفتش حكومي", en: "🔍 Auditor / Govt Inspector" },
  { v: "contractor",  ar: "👷 مقاول", en: "👷 Contractor" },
  { v: "maintenance", ar: "🔧 فني صيانة", en: "🔧 Maintenance technician" },
  { v: "pestControl", ar: "🪳 شركة مكافحة", en: "🪳 Pest control" },
  { v: "supplier",    ar: "🚚 مورد", en: "🚚 Supplier" },
  { v: "customer",    ar: "💼 عميل", en: "💼 Customer" },
];

export default function HSEContractorsVisitors() {
  return (
    <HSEGenericLog
      storageKey="contractors_visitors"
      formCode="F-17"
      icon="👥"
      title={{ ar: "سجل المقاولين والزوار", en: "Contractors & Visitors Log" }}
      subtitle={{ ar: "تدريب تعريفي + معدات وقاية + متابعة الدخول والخروج",
                  en: "Induction + PPE + Entry/exit tracking" }}
      fields={[
        { key: "date",       label: { ar: "التاريخ", en: "Date" }, type: "date", default: todayISO(), required: true },
        { key: "type",       label: { ar: "النوع", en: "Type" }, type: "select", options: TYPES, required: true },
        { key: "fullName",   label: { ar: "الاسم الكامل", en: "Full name" }, type: "text", required: true },
        { key: "company",    label: { ar: "الشركة / الجهة", en: "Company / Entity" }, type: "text" },
        { key: "idNumber",   label: { ar: "رقم الهوية / الجواز", en: "ID / Passport No." }, type: "text" },
        { key: "phone",      label: { ar: "الهاتف", en: "Phone" }, type: "tel" },
        { key: "purpose",    label: { ar: "الغرض من الزيارة", en: "Purpose of visit" }, type: "textarea" },
        { key: "areaToVisit",label: { ar: "المنطقة المسموح زيارتها", en: "Permitted area" }, type: "select", options: SITE_LOCATIONS },
        { key: "escort",     label: { ar: "المرافق (موظف الشركة)", en: "Escort (employee)" }, type: "text" },
        { key: "checkInTime",label: { ar: "وقت الدخول", en: "Check-in time" }, type: "time", default: nowHHMM() },
        { key: "checkOutTime",label:{ ar: "وقت الخروج", en: "Check-out time" }, type: "time" },
        { key: "ppeProvided",label: { ar: "✅ تم توفير PPE", en: "✅ PPE provided" }, type: "checkbox" },
        { key: "inductionDone",label:{ ar: "✅ تم التدريب التعريفي (Induction)", en: "✅ Induction training done" }, type: "checkbox" },
        { key: "healthCardChecked",label:{ ar: "✅ بطاقة صحية فُحصت (إن لزم)", en: "✅ Health card verified (if needed)" }, type: "checkbox" },
        { key: "ndaSigned",  label: { ar: "✅ توقيع اتفاقية السرية (NDA)", en: "✅ NDA signed" }, type: "checkbox" },
        { key: "vehiclePlate",label:{ ar: "رقم المركبة (إن وجدت)", en: "Vehicle plate (if any)" }, type: "text" },
        { key: "itemsCarried",label:{ ar: "العناصر المحمولة (للفحص)", en: "Items carried (for inspection)" }, type: "textarea" },
        { key: "notes",      label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",        label: { ar: "التاريخ", en: "Date" } },
        { key: "type",        label: { ar: "النوع", en: "Type" }, options: TYPES },
        { key: "fullName",    label: { ar: "الاسم", en: "Name" } },
        { key: "company",     label: { ar: "الشركة", en: "Company" } },
        { key: "areaToVisit", label: { ar: "المنطقة", en: "Area" }, options: SITE_LOCATIONS },
        { key: "checkInTime", label: { ar: "دخول", en: "In" } },
        { key: "checkOutTime",label: { ar: "خروج", en: "Out" } },
      ]}
    />
  );
}
