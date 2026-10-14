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
      steps={[
        { ar: "حدّد المعدّة ورقمها/موقعها ونوع الصيانة ومن نفّذها.", en: "Identify the equipment, its ID/location, the maintenance type and who performed it." },
        { ar: "إذا كان العمل يولّد شظايا (قطع، ثقب، جلخ، لحام): خذ موافقة مسؤول الإنتاج وقيّم المخاطر قبل البدء.", en: "If the work generates debris (cutting, drilling, grinding, welding): get Production In-charge approval and assess the risk before starting." },
        { ar: "بعد الانتهاء: طبّق الاختبار، تحقّق من النظافة، ثم يوقّع الإنتاج والصيانة على التسليم.", en: "When finished: test, verify cleanliness, then Production and Maintenance sign the hand-over." },
        { ar: "لا تؤشّر «أُفرج للإنتاج» إلا بعد الاختبار والتوقيعين، ولا لآلة خارج الخدمة أو تحت الحجز.", en: "Tick “Released to production” only after testing and both signatures — never for a machine out of service or on hold." },
        { ar: "سجّل ساعات التوقف (0–720) والتكلفة، وموعد الصيانة القادمة بعد تاريخ هذه الصيانة.", en: "Record downtime (0–720 h), cost, and a next service date after this one." },
      ]}
      guidance={[
        { kind: "warn", ar: "LOTO (عزل الطاقة وقفلها) إلزامي قبل أي صيانة على آلة كهربائية أو ميكانيكية.", en: "LOTO (lock-out/tag-out) is mandatory before any work on electrical or mechanical machinery." },
        { kind: "warn", ar: "صيانة أنظمة التبريد (أمونيا/فريون) لا ينفّذها إلا فني معتمد.", en: "Refrigeration (ammonia/freon) work may only be done by a certified technician." },
      ]}
      fields={[
        { key: "date",            label: { ar: "تاريخ الصيانة", en: "Maintenance date" }, type: "date", default: todayISO(), required: true, notFuture: true },
        { key: "equipmentType",   label: { ar: "نوع المعدة", en: "Equipment type" }, type: "select", options: EQUIPMENT, required: true },
        { key: "equipmentId",     label: { ar: "رقم المعدة / الموقع", en: "Equipment ID / Location" }, type: "text", required: true, maxLength: 60 },
        { key: "maintenanceType", label: { ar: "نوع الصيانة", en: "Maintenance type" }, type: "select", options: MAINT_TYPES, required: true },
        { key: "performedBy",     label: { ar: "نُفّذت بواسطة (Technician/Company)", en: "Performed by (Technician/Company)" }, type: "text", required: true, minLength: 2, maxLength: 120 },
        { key: "certifiedTechnician",label:{ ar: "✅ فني معتمد (تبريد - يلزم لغازات الأمونيا/الفريون)", en: "✅ Certified technician (refrigeration - required for ammonia/freon)" }, type: "checkbox" },
        { key: "workDescription", label: { ar: "وصف العمل المُنفّذ", en: "Work description" }, type: "textarea", fullWidth: true, required: true, minLength: 10 },
        { key: "partsReplaced",   label: { ar: "قطع غيار مستبدلة", en: "Parts replaced" }, type: "textarea" },
        { key: "lotoApplied",     label: { ar: "✅ تم تطبيق LOTO أثناء الصيانة", en: "✅ LOTO applied during maintenance" }, type: "checkbox" },
        { key: "testingDone",     label: { ar: "✅ تم الاختبار بعد الصيانة", en: "✅ Post-maintenance testing done" }, type: "checkbox" },

        /* ── إذن العمل داخل منطقة الإنتاج (قطع/ثقب/جلخ/لحام) ── */
        { key: "debrisWork",      label: { ar: "⚠️ العمل يولّد نفايات/شظايا (قطع، ثقب، جلخ، لحام)", en: "⚠️ Work generates debris (cutting, drilling, grinding, welding)" }, type: "checkbox" },
        { key: "prodApprovalBy",  label: { ar: "موافقة مسؤول الإنتاج قبل بدء العمل (الاسم)", en: "Production In-charge approval before work (name)" }, type: "text", requiredIf: (d) => !!d.debrisWork, maxLength: 80, requiredMsg: { ar: "عمل يولّد شظايا — موافقة مسؤول الإنتاج إلزامية قبل البدء", en: "Debris-generating work — Production In-charge approval is required first" } },
        { key: "riskAssessed",    label: { ar: "✅ تم تقييم المخاطر ووضع ضوابط التحكم قبل الموافقة", en: "✅ Risk assessed and control measures in place before approval" }, type: "checkbox", requiredIf: (d) => !!d.debrisWork, requiredMsg: { ar: "يجب تقييم المخاطر قبل الموافقة على عمل يولّد شظايا", en: "Risk must be assessed before approving debris-generating work" } },

        /* ── تسليم الآلة والإفراج للإنتاج (MNT004) ── */
        { key: "postCleaningVerified", label: { ar: "✅ التحقق من النظافة بعد الصيانة (لا شظايا/زيوت/أدوات متروكة)", en: "✅ Post-cleaning verification (no debris/oil/tools left behind)" }, type: "checkbox", requiredIf: (d) => !!d.releasedToProd && !!d.debrisWork, requiredMsg: { ar: "لا يُفرج عن الآلة قبل التحقق من النظافة بعد الصيانة", en: "The machine cannot be released before post-cleaning verification" } },
        { key: "handoverProdBy",  label: { ar: "تقرير التسليم — توقيع مسؤول الإنتاج", en: "Hand-over report — Production In-charge sign-off" }, type: "text", requiredIf: (d) => !!d.releasedToProd, maxLength: 80 },
        { key: "handoverMaintBy", label: { ar: "تقرير التسليم — الاعتماد النهائي من قسم الصيانة", en: "Hand-over report — Maintenance Dept final approval" }, type: "text", requiredIf: (d) => !!d.releasedToProd, maxLength: 80 },
        { key: "releasedToProd",  label: { ar: "✅ تم الإفراج عن الآلة للإنتاج (قبل بدء التشغيل)", en: "✅ Machine released to production (before production commences)" }, type: "checkbox", validate: (v, d) => v && d.result === "outOfService" ? { ar: "لا يمكن الإفراج عن آلة نتيجتها «خارج الخدمة»", en: "A machine marked “Out of service” cannot be released" } : v && !d.testingDone ? { ar: "لا يُفرج عن الآلة قبل الاختبار بعد الصيانة", en: "Cannot release before post-maintenance testing" } : v && d.holdPlaced ? { ar: "الآلة تحت الحجز — ألغِ الحجز أولاً", en: "The machine is on hold — lift the hold first" } : null },

        { key: "result",          label: { ar: "نتيجة الفحص بعد الصيانة", en: "Post-maintenance result" }, type: "select", options: RESULTS, default: "ok" },

        /* ── إجراء تصحيحي: حجز الآلة ── */
        { key: "holdPlaced",      label: { ar: "🚫 وُضعت الآلة تحت الحجز من قسم الإنتاج وأُخرجت من الموقع", en: "🚫 Machine placed on HOLD by Production and removed from site" }, type: "checkbox" },
        { key: "holdReason",      label: { ar: "سبب الحجز والإجراء التصحيحي المطلوب", en: "Hold reason and corrective action required" }, type: "textarea", fullWidth: true, requiredIf: (d) => !!d.holdPlaced || d.result === "outOfService" || d.result === "needsAttention", requiredMsg: { ar: "اكتب سبب الحجز / المتابعة والإجراء المطلوب", en: "Write the hold / follow-up reason and the required action" } },
        { key: "downtimeHours",   label: { ar: "ساعات التوقف", en: "Downtime (hours)" }, type: "number", min: 0, max: 720, hint: { ar: "0 – 720 ساعة", en: "0 – 720 hours" } },
        { key: "cost",            label: { ar: "التكلفة (درهم)", en: "Cost (AED)" }, type: "number", min: 0, max: 1000000 },
        { key: "nextScheduledDate",label:{ ar: "موعد الصيانة القادم", en: "Next scheduled date" }, type: "date", after: "date" },
        { key: "notes",           label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",            label: { ar: "التاريخ", en: "Date" } },
        { key: "equipmentType",   label: { ar: "المعدة", en: "Equipment" }, options: EQUIPMENT },
        { key: "equipmentId",     label: { ar: "رقم/موقع", en: "ID/Location" } },
        { key: "maintenanceType", label: { ar: "النوع", en: "Type" }, options: MAINT_TYPES },
        { key: "performedBy",     label: { ar: "بواسطة", en: "By" } },
        { key: "result",          label: { ar: "النتيجة", en: "Result" }, options: RESULTS },
        { key: "releasedToProd",  label: { ar: "أُفرج للإنتاج", en: "Released" } },
        { key: "nextScheduledDate",label:{ ar: "القادم", en: "Next" } },
      ]}
    />
  );
}
