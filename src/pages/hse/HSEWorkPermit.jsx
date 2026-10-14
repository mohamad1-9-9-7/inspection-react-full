// src/pages/hse/HSEWorkPermit.jsx
// F-07: تصاريح العمل — bilingual

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  apiList, apiSave, apiDelete, apiUpdate, SITE_LOCATIONS, /* edit-mode reuse apiUpdate */
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
  canDeleteHSE, HSE_DELETE_DENIED,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "work_permits";

const T = {
  title:       { ar: "📋 تصاريح العمل (F-07) — Work Permits", en: "📋 Work Permits (F-07)" },
  subtitle:    { ar: "تصاريح للأعمال الخطرة: ساخنة، أماكن مغلقة، ارتفاعات، كهرباء، كيماويات",
                 en: "Permits for hazardous work: hot, confined, heights, electrical, chemicals" },
  active:      { ar: "نشطة الآن:", en: "Active now:" },
  back:        { ar: "← HSE", en: "← HSE" },
  list:        { ar: "📋 السجل", en: "📋 Records" },
  newPermit:   { ar: "+ تصريح جديد", en: "+ New Permit" },
  permitNo:    { ar: "رقم التصريح", en: "Permit No." },
  type:        { ar: "نوع العمل", en: "Work Type" },
  date:        { ar: "التاريخ", en: "Date" },
  startTime:   { ar: "وقت البدء", en: "Start Time" },
  endTime:     { ar: "وقت الانتهاء المتوقع", en: "Expected End Time" },
  location:    { ar: "الموقع", en: "Location" },
  area:        { ar: "المنطقة المحددة", en: "Specific Area" },
  workDesc:    { ar: "وصف العمل", en: "Work Description" },
  workerSec:   { ar: "👷 العامل / المقاول", en: "👷 Worker / Contractor" },
  name:        { ar: "الاسم", en: "Name" },
  company:     { ar: "الشركة", en: "Company" },
  count:       { ar: "عدد العمال", en: "Number of Workers" },
  supervisor:  { ar: "المشرف", en: "Supervisor" },
  supPhone:    { ar: "هاتف المشرف", en: "Supervisor Phone" },
  safetySec:   { ar: "🛡️ الفحوصات الأمنية الإلزامية", en: "🛡️ Mandatory Safety Checks" },
  ppeReq:      { ar: "PPE المطلوب", en: "Required PPE" },
  ppePh:       { ar: "خوذة، قفازات، حزام أمان، قناع تنفسي…", en: "Helmet, gloves, harness, respirator…" },
  hazards:     { ar: "المخاطر المحددة", en: "Identified Hazards" },
  emergency:   { ar: "خطة الطوارئ", en: "Emergency Plan" },
  issued:      { ar: "أصدر التصريح", en: "Issued by" },
  approved:    { ar: "اعتمد التصريح (مدير HSE)", en: "Approved by (HSE Manager)" },
  // Confined Space specifics
  csSec:       { ar: "🕳️ تفاصيل الأماكن المغلقة", en: "🕳️ Confined Space Details" },
  csGases:     { ar: "🧪 قياس الغازات قبل الدخول", en: "🧪 Gas Monitoring Before Entry" },
  csO2:        { ar: "O₂ الأكسجين (19.5–23.5%)", en: "O₂ Oxygen (19.5–23.5%)" },
  csH2S:       { ar: "H₂S كبريتيد الهيدروجين (< 10 ppm)", en: "H₂S (< 10 ppm)" },
  csLEL:       { ar: "LEL الحد الأدنى للانفجار (< 10%)", en: "LEL (< 10%)" },
  csCO:        { ar: "CO أول أكسيد الكربون (< 35 ppm)", en: "CO (< 35 ppm)" },
  csNH3:       { ar: "NH₃ الأمونيا (< 25 ppm)", en: "NH₃ Ammonia (< 25 ppm)" },
  csStandby:   { ar: "👮 المراقب الخارجي", en: "👮 Standby Attendant" },
  csStandbyPh: { ar: "اسم المراقب", en: "Watchman name" },
  csEntries:   { ar: "🚪 سجل دخول/خروج", en: "🚪 Entry / Exit Log" },
  csEntryName: { ar: "اسم الداخل", en: "Entrant" },
  csEntryIn:   { ar: "وقت الدخول", en: "Time In" },
  csEntryOut:  { ar: "وقت الخروج", en: "Time Out" },
  csAddEntry:  { ar: "+ إضافة دخول", en: "+ Add Entry" },
  saveBtn:     { ar: "💾 إصدار التصريح", en: "💾 Issue Permit" },
  cancel:      { ar: "إلغاء", en: "Cancel" },
  needDesc:    { ar: "اكتب وصف العمل", en: "Enter work description" },
  needWorker:  { ar: "أدخل اسم العامل", en: "Enter worker name" },
  saved:       { ar: "✅ تم إصدار التصريح", en: "✅ Permit issued" },
  closer:      { ar: "اسم من يُغلق التصريح:", en: "Name of person closing the permit:" },
  confirmDel:  { ar: "حذف؟", en: "Delete?" },
  close:       { ar: "إغلاق", en: "Close" },
  del:         { ar: "حذف", en: "Delete" },
  edit:        { ar: "✏️ تعديل", en: "✏️ Edit" },
  noRecords:   { ar: "لا توجد تصاريح", en: "No permits" },
  cols: {
    no:      { ar: "الرقم", en: "No." },
    date:    { ar: "التاريخ", en: "Date" },
    type:    { ar: "النوع", en: "Type" },
    location:{ ar: "الموقع", en: "Location" },
    worker:  { ar: "العامل", en: "Worker" },
    status:  { ar: "الحالة", en: "Status" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  stActive:    { ar: "🟢 نشط", en: "🟢 Active" },
  stClosed:    { ar: "⚫ مغلق", en: "⚫ Closed" },
};

const PERMIT_TYPES = [
  { v: "hot_work",       ar: "🔥 أعمال ساخنة — لحام، قطع، طحن", en: "🔥 Hot Work — Welding, cutting, grinding", color: "#7f1d1d", bg: "#fee2e2" },
  { v: "confined_space", ar: "🕳️ أماكن مغلقة — خزانات، غرف ضيقة", en: "🕳️ Confined Space — Tanks, tight rooms", color: "#9a3412", bg: "#fed7aa" },
  { v: "height",         ar: "🪜 العمل على ارتفاع",       en: "🪜 Working at Height", color: "#854d0e", bg: "#fef9c3" },
  { v: "electrical",     ar: "⚡ أعمال كهربائية — LOTO",     en: "⚡ Electrical Work — LOTO", color: "#5b21b6", bg: "#e9d5ff" },
  { v: "excavation",     ar: "⛏️ حفريات",                          en: "⛏️ Excavation", color: "#374151", bg: "#e5e7eb" },
  { v: "lifting",        ar: "🏗️ رفع ثقيل بالكرين",       en: "🏗️ Crane Lifting Operations", color: "#1e40af", bg: "#dbeafe" },
  { v: "chemical",       ar: "🧪 تداول كيماويات / غازات تبريد",                 en: "🧪 Chemical / Refrigerant Handling", color: "#166534", bg: "#dcfce7" },
];

const SAFETY_CHECKS = {
  hot_work: [
    { ar: "إيقاف نظام رش الحريق المؤقت", en: "Sprinkler system temporarily isolated" },
    { ar: "تنظيف المنطقة من المواد القابلة للاشتعال (3 أمتار)", en: "Area cleared of combustibles (3 m radius)" },
    { ar: "وجود طفاية حريق", en: "Fire extinguisher present" },
    { ar: "مراقب حريق موجود", en: "Fire watch in place" },
    { ar: "غطاء واقي للأرض", en: "Floor protective cover" },
  ],
  confined_space: [
    { ar: "قياس الأكسجين والغازات السامة قبل الدخول", en: "Oxygen and toxic gas measurement before entry" },
    { ar: "نظام تهوية نشط", en: "Active ventilation system" },
    { ar: "مراقب خارجي", en: "Outside watchman" },
    { ar: "حبل أمان وحزام", en: "Safety line and harness" },
    { ar: "خطة إنقاذ جاهزة", en: "Rescue plan ready" },
  ],
  height: [
    { ar: "استخدام حزام السلامة", en: "Full-body harness used" },
    { ar: "نقطة تثبيت معتمدة", en: "Certified anchor point" },
    { ar: "السلم بحالة جيدة وثابت", en: "Ladder in good condition and secured" },
    { ar: "منطقة العمل مغلقة من الأسفل", en: "Work area cordoned off below" },
    { ar: "لا يوجد عمل بارتفاع منفرد", en: "No solo working at height" },
  ],
  electrical: [
    { ar: "قفل ووسم المعدات (LOTO)", en: "Equipment locked out / tagged out (LOTO)" },
    { ar: "اختبار العزل قبل البدء", en: "Isolation tested before start" },
    { ar: "عدم وجود رطوبة", en: "No moisture present" },
    { ar: "أدوات معزولة", en: "Insulated tools" },
    { ar: "فني مرخّص حصرياً", en: "Licensed technician only" },
  ],
  excavation: [
    { ar: "تحديد الخدمات تحت الأرض", en: "Underground services identified" },
    { ar: "تثبيت جوانب الحفر", en: "Trench sides shored" },
    { ar: "حواجز ولافتات تحذير", en: "Barriers and warning signs" },
    { ar: "سلم للخروج", en: "Access ladder available" },
    { ar: "كاشف غازات", en: "Gas detector available" },
  ],
  lifting: [
    { ar: "فحص الأوناش والحبال يومياً", en: "Daily inspection of hoists and slings" },
    { ar: "السائق مرخّص ومعتمد", en: "Operator licensed and certified" },
    { ar: "حساب الحمل ومركز الثقل", en: "Load calculation and center of gravity verified" },
    { ar: "إخلاء منطقة الرفع", en: "Lifting zone evacuated" },
    { ar: "مراقب أرضي", en: "Ground spotter" },
  ],
  chemical: [
    { ar: "MSDS متوفرة في الموقع", en: "MSDS available on site" },
    { ar: "PPE الكامل (قفازات/أقنعة/نظارات)", en: "Full PPE (gloves/respirator/goggles)" },
    { ar: "تهوية كافية", en: "Adequate ventilation" },
    { ar: "Spill Kit في المتناول", en: "Spill kit within reach" },
    { ar: "رقم طوارئ مكتوب", en: "Emergency number posted" },
  ],
};

const blank = () => ({
  permitNo: `WP-${Date.now().toString().slice(-6)}`,
  type: "hot_work", date: todayISO(), startTime: nowHHMM(), endTime: "",
  location: SITE_LOCATIONS[0].v, area: "",
  workDescription: "", workerName: "", workerCompany: "", workerCount: 1,
  supervisor: "", supervisorContact: "",
  safetyChecks: {}, ppeRequired: "", hazardsIdentified: "", emergencyPlan: "",
  issuedBy: "", approvedBy: "",
  // Confined Space (only used when type = confined_space)
  csO2: "", csH2S: "", csLEL: "", csCO: "", csNH3: "",
  csStandbyAttendant: "", csEntries: [],
  status: "active", closedDate: "", closedBy: "", closedNotes: "",
});

/* ── Rules: a permit is a licence to do dangerous work, so it may not be
   issued while any control is missing or a gas reading is outside the safe
   entry window. Backdating applies to new permits only — an old permit can
   still be edited and closed. ── */
const IS_NEW = (d) => !d.id;
const CS = (d) => d.type === "confined_space";
const sameName = (a, b) => a && b && a.trim().toLowerCase() === b.trim().toLowerCase();
const gasRule = (key, label, min, max, unit) => ({
  key, label, type: "number", min, max, requiredIf: CS, when: CS,
  hint: { ar: `المسموح للدخول: ${min} – ${max} ${unit}`, en: `Safe for entry: ${min} – ${max} ${unit}` },
});

const PERMIT_RULES = [
  { key: "type", label: T.type, required: true, oneOf: PERMIT_TYPES.map((x) => x.v) },
  { key: "date", label: T.date, type: "date", required: true },
  { key: "date", label: T.date, type: "date", notPast: true, when: IS_NEW },
  { key: "startTime", label: T.startTime, type: "time", required: true },
  { key: "endTime", label: T.endTime, type: "time", required: true, after: "startTime" },
  { key: "location", label: T.location, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
  { key: "area", label: T.area, maxLength: 120 },
  { key: "workDescription", label: T.workDesc, required: true, minLength: 15, maxLength: 2000 },
  { key: "workerName", label: T.name, required: true, minLength: 2, maxLength: 80 },
  { key: "workerCompany", label: T.company, maxLength: 120 },
  { key: "workerCount", label: T.count, type: "int", required: true, min: 1, max: 50 },
  { key: "supervisor", label: T.supervisor, required: true, maxLength: 80 },
  { key: "supervisorContact", label: T.supPhone, type: "phone", required: true },
  { key: "safetyChecks", label: T.safetySec,
    custom: (v, d) => {
      const need = (SAFETY_CHECKS[d.type] || []).length;
      const done = Object.values(v || {}).filter(Boolean).length;
      return done < need
        ? { ar: `كل ضوابط السلامة يجب أن تتحقّق قبل إصدار التصريح (${done} من ${need})`, en: `Every safety control must be in place before issuing (${done} of ${need})` }
        : null;
    } },
  gasRule("csO2", T.csO2, 19.5, 23.5, "%"),
  gasRule("csH2S", T.csH2S, 0, 10, "ppm"),
  gasRule("csLEL", T.csLEL, 0, 10, "% LEL"),
  gasRule("csCO", T.csCO, 0, 25, "ppm"),
  gasRule("csNH3", T.csNH3, 0, 25, "ppm"),
  { key: "csStandbyAttendant", label: T.csStandby, requiredIf: CS, when: CS, maxLength: 80,
    custom: (v, d) => (d.csEntries || []).some((e) => sameName(e.name, v))
      ? { ar: "المراقب الخارجي لا يدخل المكان المغلق", en: "The standby attendant must not enter the space" } : null },
  { key: "csEntries", label: T.csEntries, when: CS,
    custom: (v) => {
      const rows = v || [];
      if (rows.some((e) => !String(e.name || "").trim())) return { ar: "كل سطر دخول يحتاج اسم الشخص", en: "Every entry line needs the person's name" };
      if (rows.some((e) => e.out && e.in && e.out <= e.in)) return { ar: "وقت الخروج يجب أن يكون بعد وقت الدخول", en: "Exit time must be after entry time" };
      return null;
    } },
  { key: "ppeRequired", label: T.ppeReq, required: true, maxLength: 300 },
  { key: "hazardsIdentified", label: T.hazards, required: true, minLength: 10, maxLength: 2000 },
  { key: "emergencyPlan", label: T.emergency, required: true, minLength: 10, maxLength: 2000 },
  { key: "issuedBy", label: T.issued, required: true, maxLength: 80 },
  { key: "approvedBy", label: T.approved, required: true, maxLength: 80,
    custom: (v, d) => sameName(v, d.issuedBy) || sameName(v, d.workerName)
      ? { ar: "المعتمِد يجب أن يكون غير المُصدِر وغير المنفّذ", en: "The approver must differ from the issuer and the worker" } : null },
];

const PERMIT_STEPS = [
  { ar: "اختر نوع العمل أولاً — قائمة ضوابط السلامة تتغيّر حسب النوع.", en: "Choose the work type first — the safety-control list changes with it." },
  { ar: "حدّد التاريخ (لا يُصدَر تصريح بتاريخ سابق) ووقت البدء والانتهاء في نفس اليوم.", en: "Set the date (a permit cannot be backdated) and the start and end time on the same day." },
  { ar: "اكتب وصف العمل، المنفّذ وشركته، عدد العمال (1–50)، والمشرف ورقم هاتفه.", en: "Describe the work, the worker and company, the crew size (1–50), and the supervisor with a phone number." },
  { ar: "أشّر على كل ضوابط السلامة — لا يُحفظ التصريح وأي ضابط ناقص.", en: "Tick every safety control — the permit will not save with any control missing." },
  { ar: "للأماكن المغلقة: قِس الغازات قبل الدخول؛ أي قراءة خارج الحد الآمن تمنع الإصدار، وسجّل الداخلين والمراقب الخارجي.", en: "Confined space: measure the gases before entry; any reading outside the safe limit blocks the permit. Log every entrant and the standby attendant." },
  { ar: "يصدر التصريح شخص ويعتمده شخص آخر غير المنفّذ.", en: "One person issues the permit and a different person — not the worker — approves it." },
];

const PERMIT_GUIDANCE = [
  { kind: "warn", ar: "الأكسجين الآمن للدخول بين 19.5% و 23.5%؛ والغازات القابلة للاشتعال أقل من 10% LEL.", en: "Safe oxygen for entry is 19.5–23.5 %; flammable gas must be below 10 % LEL." },
  { kind: "warn", ar: "التصريح صالح لوردية واحدة فقط ويُغلق عند انتهاء العمل.", en: "A permit is valid for one shift only and is closed when the work ends." },
  { kind: "tip",  ar: "أعمال اللحام: مراقب الحريق يبقى 30 دقيقة بعد انتهاء العمل.", en: "Hot work: the fire watch stays 30 minutes after the work ends." },
];

export default function HSEWorkPermit() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(PERMIT_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function setCheck(key, val) {
    setDraft((d) => ({ ...d, safetyChecks: { ...d.safetyChecks, [key]: val } }));
  }
  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    validation.reset();
    setTab("new");
  }
  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.issuedBy || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.issuedBy || "HSE");
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
  async function closePermit(id) {
    const closer = prompt(pick(T.closer));
    if (!closer) return;
    try {
      await apiUpdate(TYPE, id, { status: "closed", closedDate: todayISO(), closedBy: closer }, closer);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالإغلاق: ", en: "❌ Close error: " })) + (e?.message || e));
    }
  }
  async function remove(id) {
    if (!canDeleteHSE()) { alert(pick(HSE_DELETE_DENIED)); return; }
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  const checks = SAFETY_CHECKS[draft.type] || [];
  const activeCount = items.filter((it) => it.status === "active").length;

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>
              {pick(T.subtitle)} · {pick(T.active)} <b>{activeCount}</b>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.newPermit)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const setEntry = (idx, patch) => setDraft((d) => {
            const arr = [...(d.csEntries || [])];
            arr[idx] = { ...arr[idx], ...patch };
            return { ...d, csEntries: arr };
          });
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "تصريح عمل", en: "Permit to Work" }}
              subtitle={T.subtitle}
              docNo="F-07"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.permitNo), value: draft.permitNo }]}
              steps={PERMIT_STEPS}
              guidance={PERMIT_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(blank()); validation.reset(); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات التصريح" : "Permit details"}>
                <HSEField {...f("type")} type="select" label={pick(T.type)}
                  onChange={(v) => setDraft((d) => ({ ...d, type: v, safetyChecks: {} }))}
                  options={PERMIT_TYPES.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("date")} type="date" label={pick(T.date)} />
                <HSEField {...f("startTime")} type="time" label={pick(T.startTime)} />
                <HSEField {...f("endTime")} type="time" label={pick(T.endTime)} />
                <HSEField {...f("location")} type="select" label={pick(T.location)}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("area")} label={pick(T.area)} />
                <HSEField {...f("workDescription")} type="textarea" full label={pick(T.workDesc)} />
              </HSEPanel>

              <HSEPanel title={pick(T.workerSec)}>
                <HSEField {...f("workerName")} label={pick(T.name)} />
                <HSEField {...f("workerCompany")} label={pick(T.company)} />
                <HSEField {...f("workerCount")} type="int" label={pick(T.count)} hint="1 – 50" />
                <HSEField {...f("supervisor")} label={pick(T.supervisor)} />
                <HSEField {...f("supervisorContact")} type="phone" label={pick(T.supPhone)} placeholder="05XXXXXXXX" />
              </HSEPanel>

              <div className="ph-fieldbar" data-hk-field="safetyChecks"
                style={validation.errors.safetyChecks ? { borderColor: "#dc2626" } : undefined}>
                <div className="ph-fieldbar-title">{pick(T.safetySec)} ({checks.length}) <span className="ph-req">*</span></div>
                <div style={{ display: "grid", gap: 6 }}>
                  {checks.map((chk, i) => {
                    const k = `chk-${i}`;
                    return (
                      <label key={k} className={`hk-check${draft.safetyChecks[k] ? " on" : ""}`}>
                        <input type="checkbox" checked={draft.safetyChecks[k] || false} onChange={(e) => setCheck(k, e.target.checked)} />
                        <span>{pick(chk)}</span>
                      </label>
                    );
                  })}
                </div>
                {validation.errors.safetyChecks && <div className="hk-err" style={{ marginTop: 8 }}>{validation.errors.safetyChecks}</div>}
              </div>

              {draft.type === "confined_space" && (
                <HSEPanel title={pick(T.csSec)} note={pick(T.csGases)}>
                  <HSEField {...f("csO2")} type="number" label={pick(T.csO2)} placeholder="20.9" />
                  <HSEField {...f("csH2S")} type="number" label={pick(T.csH2S)} placeholder="0" />
                  <HSEField {...f("csLEL")} type="number" label={pick(T.csLEL)} placeholder="0" />
                  <HSEField {...f("csCO")} type="number" label={pick(T.csCO)} placeholder="0" />
                  <HSEField {...f("csNH3")} type="number" label={pick(T.csNH3)} placeholder="0" />
                  <HSEField {...f("csStandbyAttendant")} label={pick(T.csStandby)} placeholder={pick(T.csStandbyPh)} />
                  <div className="ph-field hk-full" data-hk-field="csEntries">
                    <span className="ph-field-label">{pick(T.csEntries)}</span>
                    {(draft.csEntries || []).map((entry, idx) => (
                      <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px auto", gap: 8, alignItems: "center" }}>
                        <input className="ph-input" type="text" placeholder={pick(T.csEntryName)} value={entry.name} maxLength={80}
                          onChange={(e) => setEntry(idx, { name: e.target.value })} />
                        <input className="ph-input" type="time" step={1} value={entry.in}
                          onChange={(e) => setEntry(idx, { in: e.target.value })} />
                        <input className="ph-input" type="time" step={1} value={entry.out}
                          onChange={(e) => setEntry(idx, { out: e.target.value })} />
                        <button type="button" className="ph-btn-icon ph-btn-danger" title={lang === "ar" ? "إزالة" : "Remove"}
                          onClick={() => setDraft((d) => ({ ...d, csEntries: d.csEntries.filter((_, i) => i !== idx) }))}>×</button>
                      </div>
                    ))}
                    {(!draft.csEntries || draft.csEntries.length === 0) && (
                      <div className="hk-hint">{lang === "ar" ? "لا يوجد سجلات دخول بعد" : "No entries logged yet"}</div>
                    )}
                    <div>
                      <button type="button" className="ph-btn ph-btn-ghost"
                        onClick={() => setDraft((d) => ({ ...d, csEntries: [...(d.csEntries || []), { name: "", in: nowHHMM(), out: "" }] }))}>
                        {pick(T.csAddEntry)}
                      </button>
                    </div>
                    {validation.errors.csEntries && <span className="hk-err">{validation.errors.csEntries}</span>}
                  </div>
                </HSEPanel>
              )}

              <HSEPanel title={lang === "ar" ? "المخاطر والطوارئ" : "Hazards & emergency"}>
                <HSEField {...f("ppeRequired")} full label={pick(T.ppeReq)} placeholder={pick(T.ppePh)} />
                <HSEField {...f("hazardsIdentified")} type="textarea" full label={pick(T.hazards)} />
                <HSEField {...f("emergencyPlan")} type="textarea" full label={pick(T.emergency)} />
              </HSEPanel>

              <HSEPanel title={lang === "ar" ? "الإصدار والاعتماد" : "Issue & approval"}>
                <HSEField {...f("issuedBy")} label={pick(T.issued)} />
                <HSEField {...f("approvedBy")} label={pick(T.approved)} />
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
                  <th style={thStyle}>{pick(T.cols.type)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.worker)}</th>
                  <th style={thStyle}>{pick(T.cols.status)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const t = PERMIT_TYPES.find((x) => x.v === it.type);
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.permitNo}</td>
                      <td style={tdStyle}>{it.date}<br /><small>{it.startTime}-{it.endTime}</small></td>
                      <td style={tdStyle}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, background: t?.bg, color: t?.color, fontWeight: 800, fontSize: 11 }}>
                          {t ? t[lang] : it.type}
                        </span>
                      </td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}<br /><small>{it.area}</small></td>
                      <td style={tdStyle}>{it.workerName}<br /><small>{it.workerCompany}</small></td>
                      <td style={tdStyle}>
                        {it.status === "active" && pick(T.stActive)}
                        {it.status === "closed" && pick(T.stClosed)}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                          {it.status === "active" && (
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => closePermit(it.id)}>{pick(T.close)}</button>
                          )}
                          {canDeleteHSE() && <button data-delete-action="true" style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>}
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
      </div>
    </main>
  );
}
