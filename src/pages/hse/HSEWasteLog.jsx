// src/pages/hse/HSEWasteLog.jsx — F-19 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const WASTE_TYPES = [
  { v: "organicMeat",      ar: "🥩 مخلفات لحوم عضوية", en: "🥩 Organic meat waste" },
  { v: "expiredProduct",   ar: "❌ منتجات منتهية الصلاحية", en: "❌ Expired products" },
  { v: "rejectedShipment", ar: "🚫 شحنات مرفوضة", en: "🚫 Rejected shipments" },
  { v: "blood",            ar: "🩸 دماء وسوائل عضوية", en: "🩸 Blood & organic fluids" },
  { v: "fat",              ar: "🛢️ شحوم ودهون", en: "🛢️ Fat & grease" },
  { v: "packaging",        ar: "📦 مواد تغليف (كرتون/بلاستيك)", en: "📦 Packaging (cardboard/plastic)" },
  { v: "general",          ar: "🗑️ نفايات عامة", en: "🗑️ General waste" },
  { v: "chemical",         ar: "🧪 كيماويات (تنظيف/تعقيم)", en: "🧪 Chemicals (cleaning/sanitation)" },
  { v: "refrigerant",      ar: "❄️ غازات تبريد (Ammonia/Freon)", en: "❄️ Refrigerant gases (Ammonia/Freon)" },
  { v: "medical",          ar: "🩹 نفايات طبية (PPE ملوث)", en: "🩹 Medical waste (contaminated PPE)" },
  { v: "wastewater",       ar: "💧 مياه صرف", en: "💧 Wastewater" },
];

const METHODS = [
  { v: "licensedCompany", ar: "🚛 شركة معتمدة (DM)", en: "🚛 DM-approved company" },
  { v: "incineration",    ar: "🔥 حرق", en: "🔥 Incineration" },
  { v: "rendering",       ar: "♻️ إعادة تدوير (Rendering)", en: "♻️ Rendering" },
  { v: "landfill",        ar: "🏭 طمر صحي", en: "🏭 Sanitary landfill" },
  { v: "composting",      ar: "🌱 تحويل لسماد", en: "🌱 Composting" },
  { v: "specialDisposal", ar: "⚠️ تخلص خاص (خطر)", en: "⚠️ Special disposal (hazardous)" },
];

const UNITS = [
  { v: "kg",         ar: "كجم", en: "kg" },
  { v: "tons",       ar: "طن",  en: "tons" },
  { v: "liters",     ar: "لتر", en: "liters" },
  { v: "m3",         ar: "م³",  en: "m³" },
  { v: "bags",       ar: "أكياس", en: "bags" },
  { v: "containers", ar: "حاويات", en: "containers" },
];

export default function HSEWasteLog() {
  return (
    <HSEGenericLog
      storageKey="waste_disposal_log"
      formCode="F-19"
      icon="🗑️"
      title={{ ar: "سجل النفايات والتخلص منها", en: "Waste Disposal Log" }}
      subtitle={{ ar: "إدارة النفايات العضوية + الزيوت + الكرتون + غازات التبريد · شركة معتمدة من بلدية دبي",
                  en: "Organic + oils + cardboard + refrigerant gases · DM-approved waste carrier" }}
      fields={[
        { key: "date",            label: { ar: "تاريخ التخلص", en: "Disposal date" }, type: "date", default: todayISO(), required: true },
        { key: "wasteType",       label: { ar: "نوع النفايات", en: "Waste type" }, type: "select", options: WASTE_TYPES, required: true },
        { key: "quantity",        label: { ar: "الكمية", en: "Quantity" }, type: "number", required: true },
        { key: "unit",            label: { ar: "الوحدة", en: "Unit" }, type: "select", options: UNITS, default: "kg" },
        { key: "originLocation",  label: { ar: "موقع المصدر", en: "Origin location" }, type: "text" },
        { key: "disposalMethod",  label: { ar: "طريقة التخلص", en: "Disposal method" }, type: "select", options: METHODS, required: true },
        { key: "disposalCompany", label: { ar: "شركة التخلص", en: "Disposal company" }, type: "text", required: true },
        { key: "dmLicenseNo",     label: { ar: "رقم ترخيص الشركة (DM)", en: "Company license No. (DM)" }, type: "text" },
        { key: "manifestNo",      label: { ar: "رقم وثيقة النقل (Manifest)", en: "Manifest No." }, type: "text" },
        { key: "vehiclePlate",    label: { ar: "رقم شاحنة النقل", en: "Truck plate No." }, type: "text" },
        { key: "driverName",      label: { ar: "اسم السائق", en: "Driver name" }, type: "text" },
        { key: "cost",            label: { ar: "التكلفة (درهم)", en: "Cost (AED)" }, type: "number" },
        { key: "segregated",      label: { ar: "✅ تم الفصل قبل التسليم", en: "✅ Segregated before handover" }, type: "checkbox" },
        { key: "containerSealed", label: { ar: "✅ الحاويات مغطاة ومُحكمة", en: "✅ Containers covered and sealed" }, type: "checkbox" },
        { key: "weightVerified",  label: { ar: "✅ الوزن تم التحقق منه", en: "✅ Weight verified" }, type: "checkbox" },
        { key: "certificateReceived",label:{ ar: "✅ شهادة التخلص الآمن مُستلمة", en: "✅ Safe disposal certificate received" }, type: "checkbox" },
        { key: "handedOverBy",    label: { ar: "سُلّمت بواسطة", en: "Handed over by" }, type: "text" },
        { key: "receivedBy",      label: { ar: "استلمها (شركة النقل)", en: "Received by (carrier)" }, type: "text" },
        { key: "notes",           label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",            label: { ar: "التاريخ", en: "Date" } },
        { key: "wasteType",       label: { ar: "نوع النفايات", en: "Waste type" }, options: WASTE_TYPES },
        { key: "quantity",        label: { ar: "الكمية", en: "Qty" } },
        { key: "unit",            label: { ar: "الوحدة", en: "Unit" }, options: UNITS },
        { key: "disposalCompany", label: { ar: "الشركة", en: "Company" } },
        { key: "manifestNo",      label: { ar: "Manifest", en: "Manifest" } },
        { key: "cost",            label: { ar: "التكلفة", en: "Cost" } },
      ]}
    />
  );
}
