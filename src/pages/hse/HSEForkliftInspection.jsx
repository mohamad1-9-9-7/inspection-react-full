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
  hourMeter:    { ar: "ساعات التشغيل (Hour Meter)", en: "Hour Meter Reading" },
  fuelLevel:    { ar: "مستوى الوقود/البطارية (%)", en: "Fuel/Battery Level (%)" },
  location:     { ar: "موقع التشغيل", en: "Operating Location" },
  operatorName: { ar: "اسم المشغّل", en: "Operator Name" },
  operatorBadge:{ ar: "رقم شارة المشغّل", en: "Operator Badge No." },
  licenseNo:    { ar: "رقم الرخصة", en: "License No." },
  licenseExp:   { ar: "انتهاء الرخصة", en: "License Expiry" },

  // Sections 2-9 — Inspection
  s2Title:      { ar: "2️⃣ فحص بصري عام (Visual Pre-Op)", en: "2️⃣ Visual Pre-Op Check" },
  s3Title:      { ar: "3️⃣ الشوكتان والصاري (Forks & Mast)", en: "3️⃣ Forks & Mast" },
  s4Title:      { ar: "4️⃣ النظام الهيدروليكي", en: "4️⃣ Hydraulic System" },
  s5Title:      { ar: "5️⃣ المحرك / البطارية", en: "5️⃣ Engine / Battery" },
  s6Title:      { ar: "6️⃣ المكابح والتوجيه", en: "6️⃣ Brakes & Steering" },
  s7Title:      { ar: "7️⃣ اختبار التشغيل (Operational Test)", en: "7️⃣ Operational Test" },
  s8Title:      { ar: "8️⃣ أنظمة السلامة", en: "8️⃣ Safety Systems" },
  s9Title:      { ar: "9️⃣ المشغّل (Operator)", en: "9️⃣ Operator Verification" },

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
  actionLockout:{ ar: "🔴 إيقاف فوري (Lockout)", en: "🔴 Immediate Lockout" },

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
      { ar: "لافتة الحمولة (Load Capacity Plate) موجودة وواضحة", en: "Load capacity plate present and clear" },
    ],
  },
  {
    id: "forks",
    titleKey: "s3Title",
    items: [
      { ar: "الشوكتان متماثلتان وغير مكسورتين", en: "Forks even and not cracked" },
      { ar: "كعب الشوكة (Heel) غير مهترئ بأكثر من 10%", en: "Fork heel not worn more than 10%" },
      { ar: "أقفال الشوكتين (Lock pins) موجودة وتعمل", en: "Fork lock pins present and functional" },
      { ar: "سلسلة الصاري (Mast chain) سليمة (لا صدأ، لا تشققات)", en: "Mast chain intact (no rust/cracks)" },
      { ar: "بكرات الصاري (Mast rollers) تعمل بسلاسة", en: "Mast rollers operate smoothly" },
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
      { ar: "أسطوانات الرفع (Lift cylinders) سليمة", en: "Lift cylinders intact" },
      { ar: "أسطوانة الميل (Tilt cylinder) سليمة", en: "Tilt cylinder intact" },
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
      { ar: "مكابح الخدمة (Service brakes) تعمل بفعالية", en: "Service brakes operate effectively" },
      { ar: "مكابح اليد (Park brake) تمسك الرافعة", en: "Park brake holds truck firmly" },
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
      { ar: "التحكم في السرعة (Accelerator) يعمل بسلاسة", en: "Accelerator operates smoothly" },
      { ar: "التروس / الانتقال (Forward/Reverse) يعمل", en: "Gear / direction selector works (Forward/Reverse)" },
      { ar: "وظيفة الرفع (Lift) تعمل عبر النطاق الكامل", en: "Lift function works full range" },
      { ar: "وظيفة الخفض (Lower) تعمل بسلاسة وبتحكم", en: "Lower function works smoothly and controlled" },
      { ar: "وظيفة الميل (Tilt) تعمل أماماً وخلفاً", en: "Tilt function works forward & backward" },
      { ar: "Side-shift يعمل (إن وجد)", en: "Side-shift works (if equipped)" },
    ],
  },
  {
    id: "safety",
    titleKey: "s8Title",
    items: [
      { ar: "البوق (Horn) يعمل", en: "Horn works" },
      { ar: "إنذار الرجوع (Reverse alarm) يعمل", en: "Reverse alarm works" },
      { ar: "ضوء الستروب (Strobe/Flashing light) يعمل", en: "Strobe / flashing light works" },
      { ar: "طفاية الحريق موجودة وسارية", en: "Fire extinguisher present and in date" },
      { ar: "صندوق الإسعافات الأولية متوفر (إن لزم)", en: "First aid kit available (if required)" },
      { ar: "كابح الطوارئ (Emergency stop) يعمل (للكهربائية)", en: "Emergency stop works (for electric)" },
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

export default function HSEForkliftInspection() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

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
    setTab("new");
  }

  async function save() {
    if (!draft.forkliftId.trim()) { alert(pick(T.needForklift)); return; }
    if (!draft.operatorName.trim()) { alert(pick(T.needOperator)); return; }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.operatorName || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.operatorName || "HSE");
      }
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setEditingId(null); setTab("list");
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newReport)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ padding: 12, background: "#fef9c3", border: "2px solid #fde047", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#854d0e", marginBottom: 14 }}>
              {pick(T.notice)}
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.shiftStart)}</label><input type="time" value={draft.shiftStart} onChange={(e) => setDraft({ ...draft, shiftStart: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.shift)}</label>
                <select value={draft.shift} onChange={(e) => setDraft({ ...draft, shift: e.target.value })} style={inputStyle}>
                  <option value="morning">{pick(T.shiftMorning)}</option>
                  <option value="evening">{pick(T.shiftEvening)}</option>
                  <option value="night">{pick(T.shiftNight)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.forkliftId)}</label><input type="text" value={draft.forkliftId} placeholder={pick(T.forkliftIdPh)} onChange={(e) => setDraft({ ...draft, forkliftId: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.makeModel)}</label><input type="text" value={draft.makeModel} onChange={(e) => setDraft({ ...draft, makeModel: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.capacity)}</label><input type="number" step="0.1" value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.fuelType)}</label>
                <select value={draft.fuelType} onChange={(e) => setDraft({ ...draft, fuelType: e.target.value })} style={inputStyle}>
                  <option value="diesel">{pick(T.fuelDiesel)}</option>
                  <option value="lpg">{pick(T.fuelLPG)}</option>
                  <option value="electric">{pick(T.fuelElec)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.hourMeter)}</label><input type="number" step="0.1" value={draft.hourMeterStart} onChange={(e) => setDraft({ ...draft, hourMeterStart: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.fuelLevel)}</label><input type="number" min="0" max="100" value={draft.fuelLevel} onChange={(e) => setDraft({ ...draft, fuelLevel: e.target.value })} style={inputStyle} placeholder="0-100" /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.operatorName)}</label><input type="text" value={draft.operatorName} onChange={(e) => setDraft({ ...draft, operatorName: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.operatorBadge)}</label><input type="text" value={draft.operatorBadge} onChange={(e) => setDraft({ ...draft, operatorBadge: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.licenseNo)}</label><input type="text" value={draft.licenseNo} onChange={(e) => setDraft({ ...draft, licenseNo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.licenseExp)}</label><input type="date" value={draft.licenseExp} onChange={(e) => setDraft({ ...draft, licenseExp: e.target.value })} style={inputStyle} /></div>
            </div>

            {/* Live stats */}
            <div style={{
              marginTop: 14, padding: 12, borderRadius: 10,
              background: "#fff7ed", border: "1px dashed rgba(120,53,15,0.18)",
              display: "flex", gap: 14, fontSize: 13, fontWeight: 800, flexWrap: "wrap",
            }}>
              <span style={{ color: "#166534" }}>{pick(T.liveStatsOk)} {stats.ok}</span>
              <span style={{ color: "#b91c1c" }}>{pick(T.liveStatsFail)} {stats.fail}</span>
              <span style={{ color: "#64748b" }}>{pick(T.liveStatsNa)} {stats.na}</span>
              <span>{stats.total}/{totalItems}</span>
            </div>

            {/* Sections 2-9 */}
            {CHECKLIST.map((sec) => (
              <div key={sec.id} style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(T[sec.titleKey])}</div>
                {sec.items.map((it, idx) => {
                  const key = `${sec.id}-${idx}`;
                  const val = draft.results[key];
                  return (
                    <div key={key} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(120,53,15,0.08)", flexWrap: "wrap",
                    }}>
                      <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>{pick(it)}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { v: "ok", label: "✅", color: "#dcfce7", border: "#166534" },
                          { v: "fail", label: "❌", color: "#fee2e2", border: "#b91c1c" },
                          { v: "na", label: "⊘", color: "#f1f5f9", border: "#64748b" },
                        ].map((opt) => (
                          <button key={opt.v} type="button" onClick={() => setResult(key, opt.v)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            background: val === opt.v ? opt.color : "#fff",
                            border: `2px solid ${val === opt.v ? opt.border : "rgba(120,53,15,0.18)"}`,
                            cursor: "pointer", fontWeight: 800, fontSize: 13,
                          }}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {/* End of shift */}
            <SectionHeader title={pick(T.s10Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.endHourMeter)}</label><input type="number" step="0.1" value={draft.hourMeterEnd} onChange={(e) => setDraft({ ...draft, hourMeterEnd: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hoursWorked)}</label><input type="text" value={hoursWorked} readOnly style={{ ...inputStyle, background: "#f1f5f9" }} /></div>
            </div>

            {/* Defects & decision */}
            <SectionHeader title={pick(T.s11Title)} />
            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: draft.defectsFound ? "#fee2e2" : "#dcfce7", border: `1px solid ${draft.defectsFound ? "#b91c1c" : "#166534"}`, cursor: "pointer", marginBottom: 10 }}>
              <input type="checkbox" checked={draft.defectsFound} onChange={(e) => setDraft({ ...draft, defectsFound: e.target.checked })} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>{pick(T.defectsFound)}</span>
            </label>
            {draft.defectsFound && (
              <div>
                <label style={labelStyle}>{pick(T.defectsList)}</label>
                <textarea value={draft.defectsList} onChange={(e) => setDraft({ ...draft, defectsList: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.immediateAction)}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                {[
                  { v: "ok",       key: "actionContinue", bg: "#dcfce7", color: "#166534" },
                  { v: "restrict", key: "actionRestrict", bg: "#fef9c3", color: "#854d0e" },
                  { v: "lockout",  key: "actionLockout",  bg: "#fee2e2", color: "#7f1d1d" },
                ].map((act) => (
                  <button key={act.v} type="button" onClick={() => setDraft({ ...draft, immediateAction: act.v })} style={{
                    padding: 10, borderRadius: 8,
                    background: draft.immediateAction === act.v ? act.bg : "#fff",
                    border: `2px solid ${draft.immediateAction === act.v ? act.color : "rgba(120,53,15,0.18)"}`,
                    color: act.color,
                    cursor: "pointer", fontWeight: 800, fontSize: 13,
                  }}>{pick(T[act.key])}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{lang === "ar" ? "ملاحظات" : "Notes"}</label>
              <textarea value={draft.observations} onChange={(e) => setDraft({ ...draft, observations: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <SectionHeader title={pick(T.s12Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.operatorSign)}</label><input type="text" value={draft.operatorSign} onChange={(e) => setDraft({ ...draft, operatorSign: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.supervisorSign)}</label><input type="text" value={draft.supervisorSign} onChange={(e) => setDraft({ ...draft, supervisorSign: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.maintSign)}</label><input type="text" value={draft.maintSign} onChange={(e) => setDraft({ ...draft, maintSign: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.saveBtn)}
              </button>
              <button style={buttonGhost} onClick={() => { setTab("list"); setEditingId(null); setDraft(blank()); }} disabled={saving}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

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
