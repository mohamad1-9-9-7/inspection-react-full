// src/pages/hse/HSESwabsLog.jsx — F-11 bilingual
import React from "react";
import HSEGenericLog from "./HSEGenericLog";
import { todayISO } from "./hseShared";

const SURFACES = [
  { v: "boards",   ar: "ألواح التقطيع", en: "Cutting boards" },
  { v: "knives",   ar: "السكاكين والمناشير", en: "Knives & saws" },
  { v: "mixers",   ar: "خلاطات اللحوم", en: "Meat mixers" },
  { v: "slicers",  ar: "آلات التقطيع", en: "Slicers" },
  { v: "sinks",    ar: "أحواض غسل الأيدي", en: "Hand-wash sinks" },
  { v: "hands",    ar: "أيدي العاملين", en: "Workers' hands" },
  { v: "aprons",   ar: "ملابس العاملين", en: "Workers' apparel" },
  { v: "scales",   ar: "الميزان", en: "Scales" },
  { v: "floors",   ar: "أرضيات الإنتاج", en: "Production floors" },
  { v: "walls",    ar: "جدران الغرف الباردة", en: "Cold-room walls" },
  { v: "drawers",  ar: "الأدراج والأبواب", en: "Drawers & doors" },
  { v: "water",    ar: "مياه الشطف", en: "Rinse water" },
  { v: "other",    ar: "أخرى", en: "Other" },
];

const TESTS = [
  { v: "tpc",       ar: "Total Plate Count (TPC)",      en: "Total Plate Count (TPC)" },
  { v: "ecoli",     ar: "E. coli",                       en: "E. coli" },
  { v: "salmonella",ar: "Salmonella",                    en: "Salmonella" },
  { v: "listeria",  ar: "Listeria monocytogenes",        en: "Listeria monocytogenes" },
  { v: "staph",     ar: "Staphylococcus aureus",         en: "Staphylococcus aureus" },
  { v: "coliform",  ar: "Coliforms",                      en: "Coliforms" },
  { v: "yeast",     ar: "Yeast & Mould",                  en: "Yeast & Mould" },
  { v: "atp",       ar: "ATP swab (Hygiene check)",       en: "ATP swab (Hygiene check)" },
];

const RESULTS = [
  { v: "pass",    ar: "✅ مطابق",      en: "✅ Pass" },
  { v: "fail",    ar: "❌ غير مطابق",   en: "❌ Fail" },
  { v: "pending", ar: "⏳ قيد الفحص",   en: "⏳ Pending" },
];

const PRE = [
  { v: "before", ar: "قبل التعقيم", en: "Before sanitation" },
  { v: "after",  ar: "بعد التعقيم", en: "After sanitation" },
];

export default function HSESwabsLog() {
  return (
    <HSEGenericLog
      storageKey="microbiological_swabs"
      formCode="F-11"
      icon="🧫"
      title={{ ar: "سجل المسحات الميكروبية", en: "Microbiological Swabs Log" }}
      subtitle={{ ar: "فحص ميكروبي شهري للأسطح + أيدي العمال — المستهدف ≥ 95% نتائج سليمة",
                  en: "Monthly microbiological surface + hand-swab tests — target ≥ 95% pass" }}
      steps={[
        { ar: "عند أخذ العينة: سجّل التاريخ، رقم العينة، السطح، نوع الفحص، وهل أُخذت قبل التعقيم أو بعده، واترك النتيجة «قيد الفحص».", en: "When sampling: record the date, sample no., surface, test type and whether it was taken before or after sanitation, and leave the result as “Pending”." },
        { ar: "عند وصول نتيجة المختبر: افتح السجل بزر «تعديل» وأدخل المختبر والقيمة والحد المسموح وتاريخ النتيجة.", en: "When the lab result arrives: open the record with “Edit” and enter the lab, the value, the allowable limit and the result date." },
        { ar: "القيمة والحد أرقام فقط بوحدة CFU/cm²؛ إذا تجاوزت القيمة الحد لا يمكن اختيار «مطابق».", en: "Value and limit are numbers only in CFU/cm²; if the value exceeds the limit, “Pass” cannot be selected." },
        { ar: "النتيجة غير المطابقة تحتاج إجراءً تصحيحياً مكتوباً وإعادة أخذ عيّنة بعد التعقيم.", en: "A failed result needs a written corrective action and a re-swab after sanitation." },
      ]}
      guidance={[
        { kind: "warn", ar: "تاريخ النتيجة لا يكون قبل تاريخ أخذ العينة ولا في المستقبل.", en: "The result date cannot be before the sampling date or in the future." },
        { kind: "tip",  ar: "خذ عينة بعد التعقيم من نفس النقطة للتحقّق من فعالية التنظيف.", en: "Take an after-sanitation swab from the same spot to verify the cleaning worked." },
      ]}
      fields={[
        { key: "date",     label: { ar: "تاريخ أخذ العينة", en: "Sampling date" }, type: "date", default: todayISO(), required: true, notFuture: true },
        { key: "sampleNo", label: { ar: "رقم العينة", en: "Sample No." }, type: "text", required: true, placeholder: "SW-001", maxLength: 30, pattern: /^[A-Za-z0-9\-\/_ ]+$/, patternMsg: { ar: "أحرف إنجليزية وأرقام وشرطة فقط (مثل SW-001)", en: "Letters, digits and dashes only (e.g. SW-001)" } },
        { key: "surface",  label: { ar: "السطح / المنطقة", en: "Surface / Area" }, type: "select", options: SURFACES, required: true },
        { key: "specificLocation", label: { ar: "الموقع المحدد", en: "Specific Location" }, type: "text", placeholder: { ar: "مثلاً: الطاولة الأولى", en: "e.g., Table #1" } },
        { key: "test",     label: { ar: "نوع الفحص", en: "Test Type" }, type: "select", options: TESTS, required: true },
        { key: "preTest",  label: { ar: "قبل التعقيم؟", en: "Before sanitation?" }, type: "select", options: PRE },
        { key: "labName",  label: { ar: "المختبر", en: "Lab Name" }, type: "text", requiredIf: (d) => d.result && d.result !== "pending", maxLength: 100 },
        { key: "result",   label: { ar: "النتيجة", en: "Result" }, type: "select", options: RESULTS, default: "pending", required: true },
        { key: "value",    label: { ar: "القيمة (CFU/cm²)", en: "Value (CFU/cm²)" }, type: "number", min: 0, max: 100000000, requiredIf: (d) => d.result && d.result !== "pending", hint: { ar: "رقم فقط بوحدة CFU/cm²", en: "Number only, in CFU/cm²" }, validate: (v, d) => { const n = Number(v), lim = Number(d.limit); if (d.limit !== "" && d.limit != null && Number.isFinite(lim) && Number.isFinite(n) && n > lim && d.result === "pass") return { ar: "القيمة أعلى من الحد المسموح — لا يمكن أن تكون النتيجة «مطابق»", en: "Value is above the allowable limit — the result cannot be “Pass”" }; return null; } },
        { key: "limit",    label: { ar: "الحد المسموح", en: "Allowable limit" }, type: "number", min: 0, max: 100000000, requiredIf: (d) => d.result && d.result !== "pending" },
        { key: "resultDate",label:{ ar: "تاريخ النتيجة", en: "Result date" }, type: "date", notFuture: true, afterOrEqual: "date", requiredIf: (d) => d.result && d.result !== "pending" },
        { key: "sampledBy",label: { ar: "أخذ العينة", en: "Sampled by" }, type: "text", required: true, maxLength: 80 },
        { key: "correctiveAction", label: { ar: "إجراء تصحيحي (إن لزم)", en: "Corrective action (if needed)" }, type: "textarea", fullWidth: true, requiredIf: (d) => d.result === "fail", requiredMsg: { ar: "النتيجة غير مطابقة — الإجراء التصحيحي إلزامي", en: "Result failed — a corrective action is required" } },
        { key: "notes",    label: { ar: "ملاحظات", en: "Notes" }, type: "textarea", fullWidth: true },
      ]}
      listColumns={[
        { key: "date",     label: { ar: "التاريخ", en: "Date" } },
        { key: "sampleNo", label: { ar: "رقم العينة", en: "Sample No." } },
        { key: "surface",  label: { ar: "السطح", en: "Surface" }, options: SURFACES },
        { key: "test",     label: { ar: "الفحص", en: "Test" }, options: TESTS },
        { key: "result",   label: { ar: "النتيجة", en: "Result" }, options: RESULTS },
        { key: "value",    label: { ar: "القيمة", en: "Value" } },
        { key: "labName",  label: { ar: "المختبر", en: "Lab" } },
      ]}
    />
  );
}
