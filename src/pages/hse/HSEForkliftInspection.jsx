// src/pages/hse/HSEForkliftInspection.jsx
// F-35: فحص الرافعة الشوكية اليومي — Forklift Inspection (SBG-HSE-023/01)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "forklift_inspections";

const T = {
  title:        { ar: "🚜 فحص الرافعة الشوكية (F-35) — Forklift Inspection", en: "🚜 Forklift Inspection (F-35)" },
  subtitle:     { ar: "فحص يومي إلزامي قبل التشغيل (مطابق SBG-HSE-023/01) — Pre-Shift Mandatory",
                  en: "Mandatory daily pre-shift inspection (per SBG-HSE-023/01)" },
  notice:       { ar: "⚠️ يجب تنفيذ هذا الفحص في بداية كل وردية قبل تشغيل الرافعة. أي بند \"غير صالح\" يستدعي إيقاف التشغيل فوراً وإبلاغ الصيانة.",
                  en: "⚠️ This check must be done at the start of each shift before operation. Any \"Not OK\" item requires immediate stop and maintenance notification." },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ فحص جديد", en: "+ New Inspection" },

  // Section 1
  s1Title:      { ar: "1️⃣ معلومات الرافعة والمشغّل", en: "1️⃣ Forklift & Operator Info" },
  reportNo:     { ar: "رقم الفحص", en: "Inspection No." },
  date:         { ar: "التاريخ", en: "Date" },
  shiftStart:   { ar: "بدء الوردية", en: "Shift Start" },
  shift:        { ar: "الوردية", en: "Shift" },
  shiftMorning: { ar: "صباحية", en: "Morning" },
  shiftEvening: { ar: "مسائية", en: "Evening" },
  shiftNight:   { ar: "ليلية", en: "Night" },
  forkliftId:   { ar: "رقم الرافعة", en: "Forklift ID/No." },
  forkliftIdPh: { ar: "مثلاً: FL-001", en: "e.g. FL-001" },
  makeModel:    { ar: "الصانع/الموديل", en: "Make / Model" },
  capacity:     { ar: "السعة (طن)", en: "Capacity (Ton)" },
  fuelType:     { ar: "نوع الوقود", en: "Fuel Type" },
  fuelDiesel:   { ar: "ديزل", en: "Diesel" },
  fuelLPG:      { ar: "غاز (LPG)", en: "LPG" },
  fuelElec:     { ar: "كهرباء", en: "Electric" },
  hourMeter:    { ar: "ساعات التشغيل", en: "Hour Meter Reading" },
  fuelLevel:    { ar: "مستوى الوقود/البطارية (%)", en: "Fuel/Battery Level (%)" },
  location:     { ar: "موقع التشغيل", en: "Operating Location" },
  operatorName: { ar: "اسم المشغّل", en: "Operator Name" },
  operatorBadge:{ ar: "رقم شارة المشغّل", en: "Operator Badge No." },
  licenseNo:    { ar: "رقم الرخصة", en: "License No." },
  licenseExp:   { ar: "انتهاء الرخصة", en: "License Expiry" },

  // Sections 2-9 — Inspection
  s2Title:      { ar: "2️⃣ فحص بصري عام", en: "2️⃣ Visual Pre-Op Check" },
  s3Title:      { ar: "3️⃣ الشوكتان والصاري", en: "3️⃣ Forks & Mast" },
  s4Title:      { ar: "4️⃣ النظام الهيدروليكي", en: "4️⃣ Hydraulic System" },
  s5Title:      { ar: "5️⃣ المحرك / البطارية", en: "5️⃣ Engine / Battery" },
  s6Title:      { ar: "6️⃣ المكابح والتوجيه", en: "6️⃣ Brakes & Steering" },
  s7Title:      { ar: "7️⃣ اختبار التشغيل", en: "7️⃣ Operational Test" },
  s8Title:      { ar: "8️⃣ أنظمة السلامة", en: "8️⃣ Safety Systems" },
  s9Title:      { ar: "9️⃣ المشغّل", en: "9️⃣ Operator Verification" },

  // Final
  s10Title:     { ar: "🔚 نهاية الوردية", en: "🔚 End of Shift" },
  endHourMeter: { ar: "ساعات التشغيل (نهاية الوردية)", en: "Hour Meter (End of Shift)" },
  hoursWorked:  { ar: "ساعات التشغيل خلال الوردية", en: "Hours Worked During Shift" },

  s11Title:     { ar: "📝 العيوب والإجراءات", en: "📝 Defects & Actions" },
  defectsFound: { ar: "العيوب المكتشفة", en: "Defects Found" },
  defectsList:  { ar: "قائمة العيوب التفصيلية", en: "Detailed Defect List" },
  immediateAction:{ ar: "الإجراء المتخذ", en: "Action Taken" },
  actionContinue:{ ar: "🟢 صالح للتشغيل", en: "🟢 OK to Operate" },
  actionRestrict:{ ar: "🟡 تشغيل مقيّد", en: "🟡 Restricted Use" },
  actionLockout:{ ar: "🔴 إيقاف فوري", en: "🔴 Immediate Lockout" },

  s12Title:     { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  operatorSign: { ar: "توقيع المشغّل", en: "Operator Signature" },
  supervisorSign:{ ar: "توقيع المشرف", en: "Supervisor Signature" },
  maintSign:    { ar: "توقيع فني الصيانة (إن لزم)", en: "Maintenance Tech Signature (if applicable)" },

  saveBtn:      { ar: "💾 حفظ الفحص", en: "💾 Save Inspection" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needForklift: { ar: "أدخل رقم الرافعة", en: "Enter forklift ID" },
  needOperator: { ar: "أدخل اسم المشغّل", en: "Enter operator name" },
  saved:        { ar: "✅ تم حفظ الفحص", en: "✅ Inspection saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  edit:         { ar: "✏️ تعديل", en: "✏️ Edit" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا يوجد فحوصات", en: "No inspections" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    forklift:  { ar: "الرافعة", en: "Forklift" },
    operator:  { ar: "المشغّل", en: "Operator" },
    result:    { ar: "النتيجة", en: "Result" },
    decision:  { ar: "القرار", en: "Decision" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-35 · Forklift Inspection · AL MAWASHI HSE",
                  en: "Form F-35 · Forklift Inspection · AL MAWASHI HSE" },
  liveStatsOk:  { ar: "✅ صالح:", en: "✅ OK:" },
  liveStatsFail:{ ar: "❌ غير صالح:", en: "❌ Not OK:" },
  liveStatsNa:  { ar: "⊘ غير مطبق:", en: "⊘ N/A:" },
};

const CHECKLIST = [
  {
    id: "visual",
    titleKey: "s2Title",
    items: [
      { ar: "لا توجد تسربات (زيت/هيدروليك/وقود/مياه) تحت الرافعة", en: "No leaks (oil/hydraulic/fuel/water) under truck" },
      { ar: "الإطارات سليمة (لا انتفاخات/قطوع/تآكل غير منتظم)", en: "Tires intact (no bulges/cuts/uneven wear)" },
      { ar: "ضغط الإطارات سليم", en: "Tire pressure correct" },
      { ar: "الأضواء الأمامية تعمل", en: "Headlights working" },
      { ar: "الأضواء الخلفية وأضواء الفرملة تعمل", en: "Tail/brake lights working" },
      { ar: "المرايا الجانبية والخلفية سليمة ونظيفة", en: "Mirrors intact and clean" },
      { ar: "حماية السقف (FOPS/ROPS) سليمة", en: "Overhead guard (FOPS/ROPS) intact" },
      { ar: "حزام الأمان موجود ويعمل", en: "Seat belt present and functional" },
      { ar: "المقعد سليم وثابت", en: "Seat sound and secure" },
      { ar: "لافتة الحمولة موجودة وواضحة", en: "Load capacity plate present and clear" },
    ],
  },
  {
    id: "forks",
    titleKey: "s3Title",
    items: [
      { ar: "الشوكتان متماثلتان وغير مكسورتين", en: "Forks even and not cracked" },
      { ar: "كعب الشوكة غير مهترئ بأكثر من 10%", en: "Fork heel not worn more than 10%" },
      { ar: "أقفال الشوكتين موجودة وتعمل", en: "Fork lock pins present and functional" },
      { ar: "سلسلة الصاري سليمة (لا صدأ، لا تشققات)", en: "Mast chain intact (no rust/cracks)" },
      { ar: "بكرات الصاري تعمل بسلاسة", en: "Mast rollers operate smoothly" },
      { ar: "نقاط التشحيم محشّمة", en: "Lubrication points greased" },
      { ar: "Backrest (المسند الخلفي) سليم", en: "Load backrest intact" },
    ],
  },
  {
    id: "hydraulic",
    titleKey: "s4Title",
    items: [
      { ar: "مستوى زيت الهيدروليك ضمن المعدّل", en: "Hydraulic oil level within range" },
      { ar: "لا توجد تسربات هيدروليكية", en: "No hydraulic leaks" },
      { ar: "أسطوانات الرفع سليمة", en: "Lift cylinders intact" },
      { ar: "أسطوانة الميل سليمة", en: "Tilt cylinder intact" },
      { ar: "الخراطيم الهيدروليكية غير متشققة", en: "Hydraulic hoses not cracked" },
    ],
  },
  {
    id: "engine",
    titleKey: "s5Title",
    items: [
      { ar: "مستوى زيت المحرك سليم (للديزل/LPG)", en: "Engine oil level OK (for diesel/LPG)" },
      { ar: "مستوى مياه الرادياتير سليم (للديزل)", en: "Radiator coolant level OK (for diesel)" },
      { ar: "البطارية مشحونة (للكهربائية)", en: "Battery charged (for electric)" },
      { ar: "أطراف البطارية نظيفة وغير متآكلة", en: "Battery terminals clean and not corroded" },
      { ar: "غطاء البطارية مُثبَّت", en: "Battery cover secured" },
      { ar: "كابلات البطارية سليمة", en: "Battery cables intact" },
      { ar: "فلتر الهواء نظيف", en: "Air filter clean" },
    ],
  },
  {
    id: "brakes",
    titleKey: "s6Title",
    items: [
      { ar: "مكابح الخدمة تعمل بفعالية", en: "Service brakes operate effectively" },
      { ar: "مكابح اليد تمسك الرافعة", en: "Park brake holds truck firmly" },
      { ar: "دواسة الفرامل لها مسافة حرة طبيعية", en: "Brake pedal has normal free travel" },
      { ar: "نظام التوجيه يعمل بسلاسة", en: "Steering operates smoothly" },
      { ar: "لا يوجد لعب زائد في عجلة القيادة", en: "No excessive play in steering wheel" },
    ],
  },
  {
    id: "operation",
    titleKey: "s7Title",
    items: [
      { ar: "المحرك يبدأ بشكل سلس", en: "Engine starts smoothly" },
      { ar: "لا توجد أصوات أو اهتزازات غير عادية", en: "No abnormal noises or vibrations" },
      { ar: "التحكم في السرعة يعمل بسلاسة", en: "Accelerator operates smoothly" },
      { ar: "التروس / الانتقال يعمل", en: "Gear / direction selector works (Forward/Reverse)" },
      { ar: "وظيفة الرفع تعمل عبر النطاق الكامل", en: "Lift function works full range" },
      { ar: "وظيفة الخفض تعمل بسلاسة وبتحكم", en: "Lower function works smoothly and controlled" },
      { ar: "وظيفة الميل تعمل أماماً وخلفاً", en: "Tilt function works forward & backward" },
      { ar: "Side-shift يعمل (إن وجد)", en: "Side-shift works (if equipped)" },
    ],
  },
  {
    id: "safety",
    titleKey: "s8Title",
    items: [
      { ar: "البوق يعمل", en: "Horn works" },
      { ar: "إنذار الرجوع يعمل", en: "Reverse alarm works" },
      { ar: "ضوء الستروب يعمل", en: "Strobe / flashing light works" },
      { ar: "طفاية الحريق موجودة وسارية", en: "Fire extinguisher present and in date" },
      { ar: "صندوق الإسعافات الأولية متوفر (إن لزم)", en: "First aid kit available (if required)" },
      { ar: "كابح الطوارئ يعمل (للكهربائية)", en: "Emergency stop works (for electric)" },
      { ar: "أزرار التحكم موسومة بوضوح", en: "Controls clearly labeled" },
    ],
  },
  {
    id: "operator",
    titleKey: "s9Title",
    items: [
      { ar: "المشغّل لديه رخصة سارية وموثَّقة", en: "Operator has valid documented license" },
      { ar: "المشغّل مدرَّب على هذا النوع من الرافعات", en: "Operator trained on this forklift type" },
      { ar: "المشغّل يرتدي PPE الكامل (أحذية/صدرية عاكسة/خوذة عند اللزوم)", en: "Operator wears full PPE (boots/hi-vis/helmet if required)" },
      { ar: "المشغّل في حالة صحية جيدة (ليس متعباً/مريضاً)", en: "Operator in good health (not fatigued/ill)" },
      { ar: "المشغّل ليس تحت تأثير أي مواد", en: "Operator not under any influence" },
    ],
  },
];

const blank = () => ({
  reportNo: `FLI-${Date.now().toString().slice(-6)}`,
  date: todayISO(), shiftStart: nowHHMM(), shift: "morning",
  forkliftId: "", makeModel: "", capacity: "", fuelType: "diesel",
  hourMeterStart: "", fuelLevel: "",
  location: SITE_LOCATIONS[0].v,
  operatorName: "", operatorBadge: "", licenseNo: "", licenseExp: "",
  results: {},
  hourMeterEnd: "",
  defectsFound: false, defectsList: "", immediateAction: "ok",
  observations: "",
  operatorSign: "", supervisorSign: "", maintSign: "",
});

/* ── Rules: the forklift may not be released for a shift unless every item
   is answered, the operator's licence is valid on the day, and any failed
   item leads to a written defect list, a restrict/lock-out decision and a
   maintenance sign-off. ── */
const FL_TOTAL = CHECKLIST.reduce((acc, s) => acc + s.items.length, 0);
const FL_FAILED = (d) => Object.values(d.results || {}).includes("fail");
const FL_DEFECT = (d) => !!d.defectsFound || FL_FAILED(d);

const FORKLIFT_RULES = [
  { key: "date", label: T.date, type: "date", required: true, notFuture: true, maxPastDays: 2 },
  { key: "shiftStart", label: T.shiftStart, type: "time", required: true },
  { key: "shift", label: T.shift, required: true, oneOf: ["morning", "evening", "night"] },
  { key: "forkliftId", label: T.forkliftId, required: true, maxLength: 30,
    pattern: /^[A-Za-z0-9\-/_ ]+$/, patternMsg: { ar: "أحرف إنجليزية وأرقام وشرطة فقط (مثل FL-001)", en: "Letters, digits and dashes only (e.g. FL-001)" } },
  { key: "makeModel", label: T.makeModel, maxLength: 80 },
  { key: "capacity", label: T.capacity, type: "number", required: true, min: 0.5, max: 50 },
  { key: "fuelType", label: T.fuelType, required: true, oneOf: ["diesel", "lpg", "electric"] },
  { key: "hourMeterStart", label: T.hourMeter, type: "number", required: true, min: 0, max: 100000 },
  { key: "fuelLevel", label: T.fuelLevel, type: "int", required: true, min: 0, max: 100,
    custom: (v) => Number(v) < 10 ? { ar: "الوقود/الشحن أقل من 10% — اشحن أو زوّد قبل التشغيل", en: "Fuel/charge below 10 % — refuel or recharge before operating" } : null },
  { key: "location", label: T.location, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
  { key: "operatorName", label: T.operatorName, required: true, minLength: 2, maxLength: 80 },
  { key: "operatorBadge", label: T.operatorBadge, maxLength: 30 },
  { key: "licenseNo", label: T.licenseNo, required: true, maxLength: 40 },
  { key: "licenseExp", label: T.licenseExp, type: "date", required: true, afterOrEqual: "date",
    requiredMsg: { ar: "تاريخ انتهاء رخصة المشغّل إلزامي", en: "The operator licence expiry is required" } },
  { key: "results", label: { ar: "بنود الفحص", en: "Checklist items" },
    custom: (v) => {
      const answered = Object.values(v || {}).filter(Boolean).length;
      return answered < FL_TOTAL
        ? { ar: `أجب على كل البنود قبل التشغيل (${answered} من ${FL_TOTAL})`, en: `Answer every item before operating (${answered} of ${FL_TOTAL})` } : null;
    } },
  { key: "hourMeterEnd", label: T.endHourMeter, type: "number", min: 0, max: 100000,
    custom: (v, d) => {
      if (v === "" || v == null || d.hourMeterStart === "" || d.hourMeterStart == null) return null;
      const diff = Number(v) - Number(d.hourMeterStart);
      if (diff < 0) return { ar: "عدّاد نهاية الوردية أقل من بدايتها", en: "End hour meter is below the start reading" };
      if (diff > 24) return { ar: "أكثر من 24 ساعة في وردية واحدة — تحقق من القراءة", en: "More than 24 h in one shift — check the reading" };
      return null;
    } },
  { key: "defectsFound", label: T.defectsFound,
    custom: (v, d) => FL_FAILED(d) && !v
      ? { ar: "يوجد بند «غير صالح» — أشّر على وجود عيوب", en: "An item is “Not OK” — tick that defects were found" } : null },
  { key: "defectsList", label: T.defectsList, requiredIf: FL_DEFECT, maxLength: 2000 },
  { key: "immediateAction", label: T.immediateAction, required: true, oneOf: ["ok", "restrict", "lockout"],
    custom: (v, d) => FL_DEFECT(d) && v === "ok"
      ? { ar: "توجد عيوب — لا يمكن «الاستمرار بالتشغيل»؛ اختر تقييد الاستخدام أو الإيقاف", en: "Defects found — “Continue” is not allowed; choose restrict or lock-out" } : null },
  { key: "observations", label: { ar: "ملاحظات", en: "Notes" }, maxLength: 2000 },
  { key: "operatorSign", label: T.operatorSign, required: true, maxLength: 80 },
  { key: "supervisorSign", label: T.supervisorSign, required: true, maxLength: 80,
    custom: (v, d) => v && d.operatorSign && v.trim().toLowerCase() === d.operatorSign.trim().toLowerCase()
      ? { ar: "المشرف يجب أن يكون غير المشغّل", en: "The supervisor must differ from the operator" } : null },
  { key: "maintSign", label: T.maintSign, requiredIf: (d) => d.immediateAction === "lockout", maxLength: 80,
    requiredMsg: { ar: "الإيقاف يحتاج توقيع قسم الصيانة", en: "A lock-out needs the maintenance sign-off" } },
];

const FORKLIFT_STEPS = [
  { ar: "نفّذ الفحص في بداية كل وردية وقبل تشغيل الرافعة — التاريخ اليوم أو أمس كحد أقصى.", en: "Do the check at the start of every shift, before operating — dated today or at most yesterday." },
  { ar: "سجّل رقم الرافعة، السعة (0.5–50 طن)، قراءة العدّاد، ونسبة الوقود/الشحن (0–100%، لا تشغيل تحت 10%).", en: "Enter the forklift ID, capacity (0.5–50 t), hour meter, and fuel/charge level (0–100 %, no operation below 10 %)." },
  { ar: "اكتب بيانات المشغّل ورخصته — الرخصة يجب أن تكون سارية في يوم الفحص.", en: "Enter the operator and licence — the licence must be valid on the inspection day." },
  { ar: "أجب على كل بند: صالح / غير صالح / لا ينطبق.", en: "Answer every item: OK / Not OK / N/A." },
  { ar: "أي بند غير صالح: أشّر على وجود عيوب، اكتبها، واختر تقييد الاستخدام أو الإيقاف (Lock-out) مع توقيع الصيانة.", en: "Any Not-OK item: tick defects found, list them, and choose restrict or lock-out (with the maintenance sign-off)." },
  { ar: "في نهاية الوردية سجّل قراءة العدّاد (أكبر من البداية وبفارق لا يتجاوز 24 ساعة).", en: "At end of shift record the hour meter (above the start, no more than 24 h apart)." },
];

const FORKLIFT_GUIDANCE = [
  { kind: "warn", ar: "لا يُشغَّل أي رافعة فيها عيب في المكابح أو التوجيه أو حزام الأمان — إيقاف فوري.", en: "Never operate a forklift with a brake, steering or seat-belt defect — lock it out at once." },
  { kind: "tip",  ar: "رافعات الغاز (LPG): افحص الأسطوانة والوصلات بالماء والصابون لا باللهب.", en: "LPG forklifts: leak-test the cylinder and fittings with soapy water, never a flame." },
];

export default function HSEForkliftInspection() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(FORKLIFT_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function printReport() { window.print(); }

  function setResult(itemKey, val) {
    setDraft((d) => ({ ...d, results: { ...d.results, [itemKey]: val } }));
  }

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setViewing(null);
    validation.reset();
    setTab("new");
  }

  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.operatorName || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.operatorName || "HSE");
      }
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setEditingId(null); validation.reset(); setTab("list");
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }
  async function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  const stats = useMemo(() => {
    const all = Object.values(draft.results);
    return {
      ok: all.filter((v) => v === "ok").length,
      fail: all.filter((v) => v === "fail").length,
      na: all.filter((v) => v === "na").length,
      total: all.length,
    };
  }, [draft.results]);

  const totalItems = CHECKLIST.reduce((acc, s) => acc + s.items.length, 0);
  const hoursWorked = (draft.hourMeterEnd && draft.hourMeterStart)
    ? (Number(draft.hourMeterEnd) - Number(draft.hourMeterStart)).toFixed(1)
    : "";

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.subtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.newReport)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const ANSWERS = [
            { v: "ok", label: lang === "ar" ? "✅ صالح" : "✅ OK", cls: "ph-select-ok" },
            { v: "fail", label: lang === "ar" ? "❌ غير صالح" : "❌ Not OK", cls: "ph-select-bad" },
            { v: "na", label: lang === "ar" ? "⊘ لا ينطبق" : "⊘ N/A", cls: "hk-na" },
          ];
          let n = 0;
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "فحص الرافعة الشوكية", en: "Forklift Inspection" }}
              subtitle={T.subtitle}
              docNo="F-35"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.reportNo), value: draft.reportNo }]}
              steps={FORKLIFT_STEPS}
              guidance={FORKLIFT_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(blank()); validation.reset(); }}
            >
              <div className="ph-hint ph-hint-warn">{pick(T.notice)}</div>

              <HSEPanel title={pick(T.s1Title)}>
                <HSEField {...f("date")} type="date" label={pick(T.date)} />
                <HSEField {...f("shiftStart")} type="time" label={pick(T.shiftStart)} />
                <HSEField {...f("shift")} type="select" label={pick(T.shift)} options={[
                  { v: "morning", label: pick(T.shiftMorning) },
                  { v: "evening", label: pick(T.shiftEvening) },
                  { v: "night", label: pick(T.shiftNight) },
                ]} />
                <HSEField {...f("forkliftId")} label={pick(T.forkliftId)} placeholder={pick(T.forkliftIdPh)} />
                <HSEField {...f("makeModel")} label={pick(T.makeModel)} />
                <HSEField {...f("capacity")} type="number" label={pick(T.capacity)} hint="0.5 – 50" />
                <HSEField {...f("fuelType")} type="select" label={pick(T.fuelType)} options={[
                  { v: "diesel", label: pick(T.fuelDiesel) },
                  { v: "lpg", label: pick(T.fuelLPG) },
                  { v: "electric", label: pick(T.fuelElec) },
                ]} />
                <HSEField {...f("hourMeterStart")} type="number" label={pick(T.hourMeter)} />
                <HSEField {...f("fuelLevel")} type="int" label={pick(T.fuelLevel)} placeholder="0-100" hint="0 – 100 %" />
                <HSEField {...f("location")} type="select" label={pick(T.location)}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
              </HSEPanel>

              <HSEPanel title={lang === "ar" ? "المشغّل والرخصة" : "Operator & licence"}>
                <HSEField {...f("operatorName")} label={pick(T.operatorName)} />
                <HSEField {...f("operatorBadge")} label={pick(T.operatorBadge)} />
                <HSEField {...f("licenseNo")} label={pick(T.licenseNo)} />
                <HSEField {...f("licenseExp")} type="date" label={pick(T.licenseExp)} />
              </HSEPanel>

              <div className="ph-stats">
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "صالح" : "OK"}</div><div className="ph-stat-value" style={{ color: "#166534" }}>{stats.ok}</div></div>
                <div className={`ph-stat${stats.fail ? " ph-stat-bad" : ""}`}><div className="ph-stat-label">{lang === "ar" ? "غير صالح" : "Not OK"}</div><div className="ph-stat-value">{stats.fail}</div></div>
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "لا ينطبق" : "N/A"}</div><div className="ph-stat-value" style={{ color: "#64748b" }}>{stats.na}</div></div>
                <div className="ph-stat"><div className="ph-stat-label">{lang === "ar" ? "تمت الإجابة" : "Answered"}</div><div className="ph-stat-value">{stats.total}/{totalItems}</div></div>
              </div>

              <div className="ph-table-wrap" data-hk-field="results"
                style={{ marginBottom: 14, borderColor: validation.errors.results ? "#dc2626" : undefined }}>
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th style={{ textAlign: "start" }}>{lang === "ar" ? "البند" : "Item"}</th>
                      <th style={{ width: 360 }}>{lang === "ar" ? "النتيجة" : "Result"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CHECKLIST.map((sec) => (
                      <React.Fragment key={sec.id}>
                        <tr className="ph-section-row"><td colSpan={3}>{pick(T[sec.titleKey])}</td></tr>
                        {sec.items.map((it, idx) => {
                          const key = `${sec.id}-${idx}`;
                          const val = draft.results[key];
                          n += 1;
                          return (
                            <tr key={key} style={!val && validation.errors.results ? { background: "#fef2f2" } : undefined}>
                              <td className="ph-num">{n}</td>
                              <td style={{ fontWeight: 600 }}>{pick(it)}</td>
                              <td>
                                <div style={{ display: "flex", gap: 6 }}>
                                  {ANSWERS.map((opt) => (
                                    <button key={opt.v} type="button" onClick={() => setResult(key, opt.v)}
                                      className={`ph-select ${val === opt.v ? opt.cls : "ph-select-empty"}`}
                                      style={{ flex: 1, minHeight: 40, padding: "6px 8px" }}>
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              {validation.errors.results && <div className="hk-err" style={{ margin: "-6px 0 14px" }}>{validation.errors.results}</div>}

              <HSEPanel title={pick(T.s10Title)}>
                <HSEField {...f("hourMeterEnd")} type="number" label={pick(T.endHourMeter)} />
                <HSEField k="hoursWorked" label={pick(T.hoursWorked)} value={hoursWorked} readOnly lang={lang} />
              </HSEPanel>

              <HSEPanel title={pick(T.s11Title)}>
                <HSEField {...f("defectsFound")} type="checkbox" full label={pick(T.defectsFound)} />
                {(draft.defectsFound || stats.fail > 0) && (
                  <HSEField {...f("defectsList")} type="textarea" full label={pick(T.defectsList)} />
                )}
                <div className="ph-field hk-full" data-hk-field="immediateAction">
                  <span className="ph-field-label">{pick(T.immediateAction)} <span className="ph-req">*</span></span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    {[
                      { v: "ok", key: "actionContinue", cls: "ph-select-ok" },
                      { v: "restrict", key: "actionRestrict", cls: "hk-warn" },
                      { v: "lockout", key: "actionLockout", cls: "ph-select-bad" },
                    ].map((act) => (
                      <button key={act.v} type="button" onClick={() => set("immediateAction", act.v)}
                        className={`ph-select ${draft.immediateAction === act.v ? act.cls : "ph-select-empty"}`}>
                        {pick(T[act.key])}
                      </button>
                    ))}
                  </div>
                  {validation.errors.immediateAction && <span className="hk-err">{validation.errors.immediateAction}</span>}
                </div>
                <HSEField {...f("observations")} type="textarea" full label={lang === "ar" ? "ملاحظات" : "Notes"} />
              </HSEPanel>

              <HSEPanel title={pick(T.s12Title)}>
                <HSEField {...f("operatorSign")} label={pick(T.operatorSign)} />
                <HSEField {...f("supervisorSign")} label={pick(T.supervisorSign)} />
                <HSEField {...f("maintSign")} label={pick(T.maintSign)} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

        {tab === "list" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.cols.no)}</th>
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.forklift)}</th>
                  <th style={thStyle}>{pick(T.cols.operator)}</th>
                  <th style={thStyle}>{pick(T.cols.result)}</th>
                  <th style={thStyle}>{pick(T.cols.decision)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const all = Object.values(it.results || {});
                  const ok = all.filter((v) => v === "ok").length;
                  const fail = all.filter((v) => v === "fail").length;
                  const total = all.length;
                  const rate = total ? Math.round((ok / total) * 100) : 0;
                  const dec = it.immediateAction || "ok";
                  const decKey = { ok: T.actionContinue, restrict: T.actionRestrict, lockout: T.actionLockout }[dec] || T.actionContinue;
                  const decBg = { ok: "#dcfce7", restrict: "#fef9c3", lockout: "#fee2e2" }[dec];
                  const decColor = { ok: "#166534", restrict: "#854d0e", lockout: "#7f1d1d" }[dec];
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{it.forkliftId}<br /><small>{it.makeModel}</small></td>
                      <td style={tdStyle}>{it.operatorName}<br /><small>{it.operatorBadge}</small></td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 800, color: rate >= 95 ? "#166534" : rate >= 80 ? "#854d0e" : "#b91c1c" }}>{rate}%</span>
                        {fail > 0 && <small style={{ color: "#b91c1c", marginInlineStart: 6 }}>· {fail} ❌</small>}
                      </td>
                      <td style={tdStyle}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: decBg, color: decColor }}>{pick(decKey)}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="7" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {viewing && (
          <div className="hse-modal-backdrop" style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 9999, padding: 20,
          }} onClick={() => setViewing(null)}>
            <div onClick={(e) => e.stopPropagation()} className="hse-print-area" style={{
              background: "#fff", borderRadius: 14, padding: 30,
              maxWidth: 900, width: "100%", maxHeight: "92vh", overflow: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.30)", direction: dir,
            }}>
              <div style={{
                borderBottom: `3px solid ${HSE_COLORS.primary}`, paddingBottom: 12, marginBottom: 20,
                display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(T.title)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.closeModal)}</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
                <div><b>{pick(T.reportNo)}: </b>{viewing.reportNo}</div>
                <div><b>{pick(T.date)}: </b>{viewing.date}</div>
                <div><b>{pick(T.shift)}: </b>{viewing.shift === "morning" ? pick(T.shiftMorning) : viewing.shift === "evening" ? pick(T.shiftEvening) : pick(T.shiftNight)}</div>
                <div><b>{pick(T.forkliftId)}: </b>{viewing.forkliftId}</div>
                <div><b>{pick(T.makeModel)}: </b>{viewing.makeModel || "—"}</div>
                <div><b>{pick(T.capacity)}: </b>{viewing.capacity || "—"}</div>
                <div><b>{pick(T.fuelType)}: </b>{({ diesel: pick(T.fuelDiesel), lpg: pick(T.fuelLPG), electric: pick(T.fuelElec) }[viewing.fuelType] || viewing.fuelType)}</div>
                <div><b>{pick(T.hourMeter)}: </b>{viewing.hourMeterStart || "—"}</div>
                <div><b>{pick(T.fuelLevel)}: </b>{viewing.fuelLevel ? `${viewing.fuelLevel}%` : "—"}</div>
                <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div><b>{pick(T.operatorName)}: </b>{viewing.operatorName} ({viewing.operatorBadge})</div>
                <div><b>{pick(T.licenseNo)}: </b>{viewing.licenseNo || "—"} · {viewing.licenseExp}</div>
              </div>

              {(() => {
                const all = Object.values(viewing.results || {});
                const ok = all.filter((v) => v === "ok").length;
                const fail = all.filter((v) => v === "fail").length;
                const na = all.filter((v) => v === "na").length;
                const rate = all.length ? Math.round((ok / all.length) * 100) : 0;
                const bg = rate >= 95 ? "#dcfce7" : rate >= 80 ? "#fef9c3" : "#fee2e2";
                const cl = rate >= 95 ? "#166534" : rate >= 80 ? "#854d0e" : "#b91c1c";
                return (
                  <div style={{ padding: 14, marginBottom: 16, borderRadius: 10, background: bg, color: cl, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      ✅ <b>{ok}</b> · ❌ <b>{fail}</b> · ⊘ <b>{na}</b>
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 950 }}>{rate}%</div>
                  </div>
                );
              })()}

              {CHECKLIST.map((sec) => (
                <div key={sec.id} style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                  <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{pick(T[sec.titleKey])}</div>
                  {sec.items.map((it, i) => {
                    const key = `${sec.id}-${i}`;
                    const val = viewing.results?.[key];
                    const sym = val === "ok" ? "✅" : val === "fail" ? "❌" : val === "na" ? "⊘" : "—";
                    const cl = val === "ok" ? "#166534" : val === "fail" ? "#b91c1c" : "#64748b";
                    const rowBg = val === "fail" ? "#fee2e2" : "transparent";
                    return (
                      <div key={key} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "6px 8px", borderBottom: "1px solid rgba(120,53,15,0.08)",
                        fontSize: 12, background: rowBg, borderRadius: 6,
                      }}>
                        <div style={{ flex: 1 }}>{pick(it)}</div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: cl, minWidth: 30, textAlign: "center" }}>{sym}</div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {viewing.defectsFound && viewing.defectsList && (
                <div style={{ padding: 12, marginBottom: 12, borderRadius: 10, background: "#fee2e2" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 6, color: "#7f1d1d" }}>⚠️ {pick(T.defectsList)}</div>
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{viewing.defectsList}</div>
                </div>
              )}

              <div style={{ padding: 12, marginBottom: 14, borderRadius: 10, background: "#fff7ed" }}>
                <div style={{ fontSize: 13 }}>
                  <b>{pick(T.immediateAction)}: </b>
                  <span style={{ fontWeight: 800 }}>
                    {pick({ ok: T.actionContinue, restrict: T.actionRestrict, lockout: T.actionLockout }[viewing.immediateAction] || T.actionContinue)}
                  </span>
                </div>
                {viewing.hourMeterEnd && (
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <b>{pick(T.endHourMeter)}: </b>{viewing.hourMeterEnd}
                    {viewing.hourMeterStart && (
                      <span> · <b>{pick(T.hoursWorked)}: </b>{(Number(viewing.hourMeterEnd) - Number(viewing.hourMeterStart)).toFixed(1)}</span>
                    )}
                  </div>
                )}
                {viewing.observations && <div style={{ marginTop: 8, fontSize: 13, whiteSpace: "pre-wrap" }}>{viewing.observations}</div>}
              </div>

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.operatorSign)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.operatorSign || viewing.operatorName || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.supervisorSign)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.supervisorSign || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.maintSign)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.maintSign || "_______________"}</div>
                </div>
              </div>
              <div style={{ marginTop: 18, fontSize: 10, color: "#64748b", textAlign: "center" }}>{pick(T.formFooter)}</div>
            </div>
          </div>
        )}

        <style>{`
          @media print {
            body * { visibility: hidden; }
            .hse-print-area, .hse-print-area * { visibility: visible; }
            .hse-print-area {
              position: absolute !important;
              left: 0; top: 0;
              width: 100% !important;
              max-width: none !important;
              max-height: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .hse-modal-backdrop { background: white !important; padding: 0 !important; }
            .no-print { display: none !important; }
          }
        `}</style>
      </div>
    </main>
  );
}

function SectionHeader({ title }) {
  return (
    <div style={{
      marginTop: 18, marginBottom: 10,
      fontSize: 14, fontWeight: 950, color: HSE_COLORS.primaryDark,
      padding: "8px 12px", borderRadius: 10,
      background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
    }}>{title}</div>
  );
}
