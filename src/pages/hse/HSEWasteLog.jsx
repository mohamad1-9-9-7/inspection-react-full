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
      steps={[
        { ar: "اختر نوع النفايات، واكتب الكمية (أكبر من صفر) ووحدتها.", en: "Choose the waste type and enter the quantity (greater than zero) and its unit." },
        { ar: "حدّد طريقة التخلص والشركة الناقلة ورقم ترخيصها من بلدية دبي.", en: "Set the disposal method, the carrier company and its Dubai Municipality licence no." },
        { ar: "للنفايات الخطرة (كيماويات، غازات تبريد، طبية): رقم وثيقة النقل والفصل إلزاميان، والطريقة تخلص خاص أو حرق أو شركة معتمدة.", en: "For hazardous waste (chemicals, refrigerants, medical): a manifest no. and segregation are mandatory, and the method must be special disposal, incineration or a licensed company." },
        { ar: "يوقّع من سلّم النفايات، ومن استلمها من شركة النقل.", en: "The person handing over signs, together with the carrier who received it." },
      ]}
      guidance={[
        { kind: "warn", ar: "لا تُسلَّم نفايات اللحوم إلا لشركة معتمدة من البلدية — وتُحفظ شهادة التخلص الآمن.", en: "Meat waste goes only to a municipality-approved company — keep the safe-disposal certificate." },
        { kind: "tip",  ar: "الحاويات تبقى مغطاة ومحكمة حتى لحظة التسليم لمنع الحشرات والروائح.", en: "Keep containers covered and sealed until hand-over to prevent pests and odour." },
      ]}
      fields={[
        { key: "date",            label: { ar: "تاريخ التخلص", en: "Disposal date" }, type: "date", default: todayISO(), required: true, notFuture: true },
        { key: "wasteType",       label: { ar: "نوع النفايات", en: "Waste type" }, type: "select", options: WASTE_TYPES, required: true },
        { key: "quantity",        label: { ar: "الكمية", en: "Quantity" }, type: "number", required: true, min: 0.01, max: 100000, hint: { ar: "أكبر من صفر", en: "Greater than zero" } },
        { key: "unit",            label: { ar: "الوحدة", en: "Unit" }, type: "select", options: UNITS, default: "kg", required: true },
        { key: "originLocation",  label: { ar: "موقع المصدر", en: "Origin location" }, type: "text" },
        { key: "disposalMethod",  label: { ar: "طريقة التخلص", en: "Disposal method" }, type: "select", options: METHODS, required: true, validate: (v, d) => ["chemical","refrigerant","medical"].includes(d.wasteType) && v && !["specialDisposal","incineration","licensedCompany"].includes(v) ? { ar: "النفايات الخطرة تُسلَّم لتخلص خاص أو حرق أو شركة معتمدة فقط", en: "Hazardous waste may only go to special disposal, incineration or a licensed company" } : null },
        { key: "disposalCompany", label: { ar: "شركة التخلص", en: "Disposal company" }, type: "text", required: true, minLength: 2, maxLength: 120 },
        { key: "dmLicenseNo",     label: { ar: "رقم ترخيص الشركة (DM)", en: "Company license No. (DM)" }, type: "text", requiredIf: (d) => d.disposalMethod === "licensedCompany" || ["chemical","refrigerant","medical"].includes(d.wasteType), maxLength: 40 },
        { key: "manifestNo",      label: { ar: "رقم وثيقة النقل (Manifest)", en: "Manifest No." }, type: "text", requiredIf: (d) => ["chemical","refrigerant","medical"].includes(d.wasteType), maxLength: 40, requiredMsg: { ar: "النفايات الخطرة تحتاج رقم وثيقة نقل", en: "Hazardous waste needs a manifest number" } },
        { key: "vehiclePlate",    label: { ar: "رقم شاحنة النقل", en: "Truck plate No." }, type: "text", maxLength: 20 },
        { key: "driverName",      label: { ar: "اسم السائق", en: "Driver name" }, type: "text", maxLength: 80 },
        { key: "cost",            label: { ar: "التكلفة (درهم)", en: "Cost (AED)" }, type: "number", min: 0, max: 1000000 },
        { key: "segregated",      label: { ar: "✅ تم الفصل قبل التسليم", en: "✅ Segregated before handover" }, type: "checkbox", requiredIf: (d) => ["chemical","refrigerant","medical"].includes(d.wasteType), requiredMsg: { ar: "النفايات الخطرة يجب فصلها قبل التسليم", en: "Hazardous waste must be segregated before hand-over" } },
        { key: "containerSealed", label: { ar: "✅ الحاويات مغطاة ومُحكمة", en: "✅ Containers covered and sealed" }, type: "checkbox" },
        { key: "weightVerified",  label: { ar: "✅ الوزن تم التحقق منه", en: "✅ Weight verified" }, type: "checkbox" },
        { key: "certificateReceived",label:{ ar: "✅ شهادة التخلص الآمن مُستلمة", en: "✅ Safe disposal certificate received" }, type: "checkbox" },
        { key: "handedOverBy",    label: { ar: "سُلّمت بواسطة", en: "Handed over by" }, type: "text", required: true, maxLength: 80 },
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
