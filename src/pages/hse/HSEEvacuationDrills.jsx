// src/pages/hse/HSEEvacuationDrills.jsx — F-16 · Mock Drill / Fire Drill Report
// Custom form layout matching the controlled paper template (FS-QM/REC/TR/MD/01)
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  inputStyle, HSE_COLORS,
  apiList, apiSave, apiUpdate, apiDelete,
  useHSELang, HSELangToggle,
  canDeleteHSE, HSE_DELETE_DENIED,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const STORAGE_KEY = "evacuation_drills";

const T = {
  pageTitle:    { ar: "F-16 · تجربة الإخلاء", en: "F-16 · Mock Drill / Fire Drill Report" },
  list:         { ar: "📋 السجل",   en: "📋 Records" },
  add:          { ar: "+ تعبئة نموذج جديد", en: "+ New Drill Report" },
  back:         { ar: "← HSE",       en: "← HSE" },
  save:         { ar: "💾 حفظ",      en: "💾 Save" },
  saved:        { ar: "✅ تم الحفظ", en: "✅ Saved" },
  cancel:       { ar: "إلغاء",         en: "Cancel" },
  delete:       { ar: "حذف",           en: "Delete" },
  confirmDelete:{ ar: "حذف هذا التقرير؟", en: "Delete this report?" },
  noRecords:    { ar: "لا توجد تقارير محفوظة بعد", en: "No reports saved yet" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  edit:         { ar: "✏️ تعديل", en: "✏️ Edit" },

  // Document control header
  docTitle:     { ar: "عنوان الوثيقة",  en: "Document Title" },
  docTitleVal:  { ar: "Mock drill",       en: "Mock drill" },
  docNumber:    { ar: "رقم الوثيقة",      en: "Document Number" },
  issueDate:    { ar: "تاريخ الإصدار",   en: "Issue date" },
  revision:     { ar: "رقم المراجعة",    en: "Revision No" },
  area:         { ar: "المنطقة",            en: "Area" },
  issuedBy:     { ar: "أصدره",                en: "Issued By" },
  controllingOfficer: { ar: "ضابط الضبط", en: "Controlling Officer" },
  approvedBy:   { ar: "اعتمده",               en: "Approved By" },

  // Form labels
  reportTitle:  { ar: "تقرير تجربة الإطفاء", en: "FIRE DRILL REPORT" },
  dateOfDrill:  { ar: "تاريخ التجربة",        en: "Date of drill" },
  timeStarted:  { ar: "وقت البداية",            en: "Time started" },
  timeCompleted:{ ar: "وقت الانتهاء",           en: "Time completed" },
  floorNo:      { ar: "الدور / المنطقة",       en: "Floor NO" },
  totalPeople:  { ar: "إجمالي عدد الأشخاص في الدور", en: "Total number of people on the floor" },
  deptParticipating: { ar: "الأقسام المشاركة",  en: "Department Participating" },
  alarmSounded: { ar: "وقت إطلاق صفارة الإنذار", en: "Time alarm sounded" },
  evacStarted:  { ar: "وقت بداية الإخلاء",       en: "Time evacuation started" },
  totalEvacTime:{ ar: "إجمالي وقت إخلاء المبنى بالكامل", en: "Total time for complete building evacuation" },
  twoPeopleHeader: { ar: "اختر شخصين من الدور وسجّل البيانات التالية:", en: "Select two people from your floor and record the following data:" },
  firstPerson:  { ar: "الشخص الأول",           en: "First Person" },
  secondPerson: { ar: "الشخص الثاني",          en: "Second Person" },
  startedToEvacuate: { ar: "وقت بدء الإخلاء",   en: "Time he/she started to evacuate" },
  reachedFinalExit:  { ar: "وقت الوصول للمخرج النهائي", en: "Time he/she reached the final exit" },
  respondHeader:{ ar: "يرجى الإجابة على ما يلي:", en: "Respond to the following:" },
  effectiveness:{ ar: "فعالية التجربة",        en: "Effectiveness of the drill" },
  satisfactory: { ar: "مُرضٍ",                    en: "Satisfactory" },
  unsatisfactory:{ ar: "غير مُرضٍ",              en: "Unsatisfactory" },
  personnelResponse: { ar: "استجابة الموظفين",  en: "Personnel response" },
  egressFamiliarity: { ar: "معرفة طرق الإخلاء",  en: "Personal familiarity with egress routes" },
  communication: { ar: "التواصل أثناء التجربة", en: "Communication during drill" },
  speedEvac:    { ar: "سرعة الإخلاء",            en: "Speed of evacuation" },
  emergencyCoordinator: { ar: "منسّق طوارئ الشركة", en: "Company Emergency coordinator" },

  colDate:      { ar: "التاريخ",       en: "Date" },
  colFloor:     { ar: "المنطقة",       en: "Floor / Area" },
  colTotal:     { ar: "العدد",            en: "People" },
  colCoord:     { ar: "المنسّق",        en: "Coordinator" },
};

/* ---------------- Document Control (read-only constants) ---------------- */
const DOC_CONTROL = {
  docNumber:          "FS-QM/REC/TR/MD/01",
  issueDate:          "03/04/24",
  revision:           "0",
  area:               "HSE",
  issuedBy:           "Jaseem p",
  controllingOfficer: "HSE Manager",
  approvedBy:         "Hussam O. Sarhan",
};

/* ---------------- Effectiveness rows ---------------- */
const EFFECTIVENESS_ITEMS = [
  { key: "personnelResponse", labelKey: "personnelResponse" },
  { key: "egressFamiliarity", labelKey: "egressFamiliarity" },
  { key: "communication",     labelKey: "communication" },
  { key: "speedEvac",         labelKey: "speedEvac" },
];

const EMPTY_DRAFT = {
  date: "",
  timeStarted: "",
  timeCompleted: "",
  floorNo: "",
  totalPeople: "",
  departments: "Warehouse, Quality, Maintenance, Logistics",
  timeAlarmSounded: "",
  timeEvacStarted: "",
  totalEvacTime: "",
  firstPersonName: "",
  firstPersonStarted: "",
  firstPersonReached: "",
  secondPersonName: "",
  secondPersonStarted: "",
  secondPersonReached: "",
  effectivenessOverall: "",
  personnelResponse: "",
  egressFamiliarity: "",
  communication: "",
  speedEvac: "",
  emergencyCoordinator: "",
};

/* ---------------- Modern Styles ---------------- */
const formCardStyle = {
  background: "#fff",
  border: "1px solid rgba(120, 53, 15, 0.10)",
  borderRadius: 18,
  padding: 22,
  marginBottom: 14,
  boxShadow: "0 10px 30px rgba(234, 88, 12, 0.08)",
};
const docHeaderCard = {
  ...formCardStyle,
  padding: "16px 20px",
  display: "grid",
  gridTemplateColumns: "auto 1fr",
  gap: 18,
  alignItems: "center",
};
const docFieldGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
};
const docField = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 12px",
  borderRadius: 10,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
};
const docFieldLabel = { fontSize: 10, fontWeight: 800, color: "#9a3412", textTransform: "uppercase", letterSpacing: "0.05em" };
const docFieldValue = { fontSize: 13, fontWeight: 700, color: "#1f0f00" };

const reportBigTitle = {
  fontSize: 22,
  fontWeight: 950,
  color: "#7c2d12",
  textAlign: "center",
  letterSpacing: "0.06em",
  margin: "0 0 18px",
  paddingBottom: 12,
  borderBottom: "2px dashed #fed7aa",
};
const fieldGroup = (cols = 1) => ({
  display: "grid",
  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
  gap: 12,
  marginBottom: 12,
});
const fieldBox = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};
const fieldLabel = {
  fontSize: 12,
  fontWeight: 800,
  color: "#7c2d12",
  letterSpacing: "0.02em",
};
const modernInput = {
  ...inputStyle,
  width: "100%",
  border: "1.5px solid #fed7aa",
  background: "#fffbf5",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: "#1f0f00",
  outline: "none",
  transition: "border-color .15s, box-shadow .15s, background .15s",
};
const sectionBand = {
  background: "linear-gradient(90deg, #c98a39, #b97320)",
  color: "#fff",
  fontWeight: 900,
  fontSize: 13,
  padding: "10px 14px",
  borderRadius: 10,
  margin: "16px 0 12px",
  letterSpacing: "0.02em",
  boxShadow: "0 4px 10px rgba(185, 115, 32, 0.20)",
};
const personBlock = {
  border: "1px solid #d1fae5",
  background: "linear-gradient(180deg, #f0fdf4, #fff)",
  borderRadius: 14,
  padding: 14,
  marginBottom: 10,
};
const personTag = {
  display: "inline-block",
  background: "#bbf7d0",
  color: "#14532d",
  fontWeight: 900,
  fontSize: 12,
  padding: "5px 12px",
  borderRadius: 999,
  marginBottom: 10,
  letterSpacing: "0.04em",
};
const effectivenessTableWrap = {
  border: "1px solid #fed7aa",
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: 12,
};
const effRow = (isHeader, isLast) => ({
  display: "grid",
  gridTemplateColumns: "2fr 1fr 1fr",
  alignItems: "center",
  background: isHeader ? "#fff7ed" : "#fff",
  borderBottom: isLast ? "none" : "1px solid #fed7aa",
});
const effCell = (isHeader) => ({
  padding: "12px 14px",
  fontSize: 13,
  fontWeight: isHeader ? 900 : 600,
  color: isHeader ? "#7c2d12" : "#1f0f00",
});
const effCellCenter = (isHeader) => ({
  ...effCell(isHeader),
  textAlign: "center",
  borderInlineStart: "1px solid #fed7aa",
});
const radioBtn = (active) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 22,
  height: 22,
  borderRadius: "50%",
  border: `2px solid ${active ? "#16a34a" : "#cbd5e1"}`,
  background: active ? "#16a34a" : "#fff",
  cursor: "pointer",
  transition: "all .15s",
});
const radioInner = (active) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: active ? "#fff" : "transparent",
});

/* ---------------- Document Control Header (modern card) ---------------- */
function DocControlHeader({ pick }) {
  const fields = [
    { l: pick(T.docTitle),            v: pick(T.docTitleVal) },
    { l: pick(T.docNumber),           v: DOC_CONTROL.docNumber },
    { l: pick(T.issueDate),           v: DOC_CONTROL.issueDate },
    { l: pick(T.revision),            v: DOC_CONTROL.revision },
    { l: pick(T.area),                v: DOC_CONTROL.area },
    { l: pick(T.issuedBy),            v: DOC_CONTROL.issuedBy },
    { l: pick(T.controllingOfficer),  v: DOC_CONTROL.controllingOfficer },
    { l: pick(T.approvedBy),          v: DOC_CONTROL.approvedBy },
  ];
  return (
    <div style={docHeaderCard}>
      <img src={mawashiLogo} alt="AL MAWASHI" style={{ width: 80, height: 80, borderRadius: 12, objectFit: "cover", border: "1px solid #fed7aa" }} />
      <div style={docFieldGrid}>
        {fields.map((f, i) => (
          <div key={i} style={docField}>
            <div style={docFieldLabel}>{f.l}</div>
            <div style={docFieldValue}>{f.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Modern Field component ---------------- */
function Field({ label, k, type = "text", draft, setDraft, readOnly, fullWidth }) {
  const [focused, setFocused] = useState(false);
  const set = (v) => setDraft({ ...draft, [k]: v });
  const isTime = type === "time";
  return (
    <div style={{ ...fieldBox, gridColumn: fullWidth ? "1 / -1" : undefined }}>
      <label style={fieldLabel}>
        {label}
        {isTime && <span style={{ fontSize: 10, color: "#9a3412", fontWeight: 700, marginInlineStart: 6 }}>(HH:MM:SS)</span>}
      </label>
      <input
        type={type}
        value={draft[k] || ""}
        onChange={(e) => set(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        step={isTime ? 1 : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...modernInput,
          borderColor: focused ? "#ea580c" : "#fed7aa",
          background: readOnly ? "#f9fafb" : (focused ? "#fff" : "#fffbf5"),
          boxShadow: focused ? "0 0 0 3px rgba(234, 88, 12, 0.15)" : "none",
        }}
      />
    </div>
  );
}

/* ---------------- Drill Form (modern card layout) ---------------- */
function DrillForm({ pick, draft, setDraft, readOnly = false }) {
  const fp = { draft, setDraft, readOnly };

  const RadioCircle = ({ name, value }) => {
    const active = draft[name] === value;
    return (
      <button
        type="button"
        onClick={() => !readOnly && setDraft({ ...draft, [name]: value })}
        disabled={readOnly}
        style={{
          ...radioBtn(active),
          opacity: readOnly && !active ? 0.5 : 1,
          cursor: readOnly ? "default" : "pointer",
        }}
        aria-label={value}
      >
        <span style={radioInner(active)} />
      </button>
    );
  };

  return (
    <div style={formCardStyle}>
      <div style={reportBigTitle}>🚨 {pick(T.reportTitle)}</div>

      {/* Date / Time started / Time completed */}
      <div style={fieldGroup(3)}>
        <Field label={pick(T.dateOfDrill)}   k="date"          type="date" {...fp} />
        <Field label={pick(T.timeStarted)}   k="timeStarted"   type="time" {...fp} />
        <Field label={pick(T.timeCompleted)} k="timeCompleted" type="time" {...fp} />
      </div>

      {/* Floor + total people */}
      <div style={fieldGroup(2)}>
        <Field label={pick(T.floorNo)}     k="floorNo"     {...fp} />
        <Field label={pick(T.totalPeople)} k="totalPeople" type="number" {...fp} />
      </div>

      {/* Department Participating (full width) */}
      <div style={fieldGroup(1)}>
        <Field label={pick(T.deptParticipating)} k="departments" {...fp} />
      </div>

      {/* Alarm + Evac started */}
      <div style={fieldGroup(2)}>
        <Field label={pick(T.alarmSounded)} k="timeAlarmSounded" type="time" {...fp} />
        <Field label={pick(T.evacStarted)}  k="timeEvacStarted"  type="time" {...fp} />
      </div>

      {/* Total evacuation time */}
      <div style={fieldGroup(1)}>
        <Field label={pick(T.totalEvacTime)} k="totalEvacTime" type="time" {...fp} />
      </div>

      {/* Two-people band */}
      <div style={sectionBand}>👥 {pick(T.twoPeopleHeader)}</div>

      {/* First Person */}
      <div style={personBlock}>
        <span style={personTag}>① {pick(T.firstPerson)}</span>
        <div style={fieldGroup(1)}>
          <Field label={lang2(pick) === "ar" ? "الاسم / الموقع" : "Name / Office location"} k="firstPersonName" {...fp} />
        </div>
        <div style={fieldGroup(2)}>
          <Field label={pick(T.startedToEvacuate)} k="firstPersonStarted" type="time" {...fp} />
          <Field label={pick(T.reachedFinalExit)}  k="firstPersonReached" type="time" {...fp} />
        </div>
      </div>

      {/* Second Person */}
      <div style={personBlock}>
        <span style={personTag}>② {pick(T.secondPerson)}</span>
        <div style={fieldGroup(1)}>
          <Field label={lang2(pick) === "ar" ? "الاسم / الموقع" : "Name / Office location"} k="secondPersonName" {...fp} />
        </div>
        <div style={fieldGroup(2)}>
          <Field label={pick(T.startedToEvacuate)} k="secondPersonStarted" type="time" {...fp} />
          <Field label={pick(T.reachedFinalExit)}  k="secondPersonReached" type="time" {...fp} />
        </div>
      </div>

      {/* Respond band */}
      <div style={sectionBand}>✅ {pick(T.respondHeader)}</div>

      {/* Effectiveness panel */}
      <div style={effectivenessTableWrap}>
        <div style={effRow(true, false)}>
          <div style={effCell(true)}>{pick(T.effectiveness)}</div>
          <div style={effCellCenter(true)}>{pick(T.satisfactory)}</div>
          <div style={effCellCenter(true)}>{pick(T.unsatisfactory)}</div>
        </div>
        {EFFECTIVENESS_ITEMS.map((it, idx) => (
          <div key={it.key} style={effRow(false, idx === EFFECTIVENESS_ITEMS.length - 1)}>
            <div style={effCell(false)}>{pick(T[it.labelKey])}</div>
            <div style={effCellCenter(false)}>
              <RadioCircle name={it.key} value="sat" />
            </div>
            <div style={effCellCenter(false)}>
              <RadioCircle name={it.key} value="unsat" />
            </div>
          </div>
        ))}
      </div>

      {/* Coordinator */}
      <div style={fieldGroup(1)}>
        {draft.correctiveActions && (
          <Field label={lang2(pick) === "ar" ? "الإجراءات التصحيحية" : "Corrective actions"} k="correctiveActions" {...fp} />
        )}
        <Field label={pick(T.emergencyCoordinator)} k="emergencyCoordinator" {...fp} />
      </div>
    </div>
  );
}

/* tiny helper to detect ar pick vs en — picks the same way useHSELang.pick does */
function lang2(pick) {
  return pick({ ar: "ar", en: "en" });
}

/* ============================================================ */
/* ── Rules: a drill's clock must run forward — start ≤ alarm ≤ evacuation
   start, each timed person exits after they set off, nobody is timed past
   the drill's own end, and the total evacuation time fits inside the drill.
   Every effectiveness line is rated; an unsatisfactory one needs an action. ── */
const secs = (t) => {
  if (!t) return null;
  const [h, m, s] = String(t).split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
};
const EVAC_UNSAT = (d) => EFFECTIVENESS_ITEMS.some((it) => d[it.key] === "unsat");
const notAfterEnd = (v, d) => d.timeCompleted && secs(v) > secs(d.timeCompleted)
  ? { ar: "بعد وقت انتهاء التجربة", en: "Later than the drill's end time" } : null;
const T_RULE = (key, label, extra = {}) => ({ key, label, type: "time", seconds: true, required: true, ...extra });

const EVAC_RULES = [
  { key: "date", label: T.dateOfDrill, type: "date", required: true, notFuture: true },
  T_RULE("timeStarted", T.timeStarted),
  T_RULE("timeCompleted", T.timeCompleted, { after: "timeStarted" }),
  { key: "floorNo", label: T.floorNo, required: true, maxLength: 40 },
  { key: "totalPeople", label: T.totalPeople, type: "int", required: true, min: 1, max: 2000 },
  { key: "departments", label: T.deptParticipating, required: true, maxLength: 300 },
  T_RULE("timeAlarmSounded", T.alarmSounded, { afterOrEqual: "timeStarted", custom: notAfterEnd }),
  T_RULE("timeEvacStarted", T.evacStarted, { afterOrEqual: "timeAlarmSounded", custom: notAfterEnd }),
  T_RULE("totalEvacTime", T.totalEvacTime, {
    hint: { ar: "المدة بصيغة س:د:ث (مثلاً 00:03:30)", en: "A duration as h:m:s (e.g. 00:03:30)" },
    custom: (v, d) => {
      const dur = secs(v);
      if (!dur) return { ar: "مدة الإخلاء يجب أن تكون أكبر من صفر", en: "Evacuation time must be greater than zero" };
      const span = d.timeStarted && d.timeCompleted ? secs(d.timeCompleted) - secs(d.timeStarted) : null;
      return span != null && span > 0 && dur > span
        ? { ar: "مدة الإخلاء أطول من مدة التجربة كلها", en: "Evacuation time is longer than the whole drill" } : null;
    } }),
  { key: "firstPersonName", label: T.firstPerson, required: true, maxLength: 80 },
  T_RULE("firstPersonStarted", T.startedToEvacuate, { afterOrEqual: "timeAlarmSounded", custom: notAfterEnd }),
  T_RULE("firstPersonReached", T.reachedFinalExit, { after: "firstPersonStarted", custom: notAfterEnd }),
  { key: "secondPersonName", label: T.secondPerson, required: true, maxLength: 80,
    custom: (v, d) => v && d.firstPersonName && v.trim().toLowerCase() === d.firstPersonName.trim().toLowerCase()
      ? { ar: "اختر شخصين مختلفين", en: "Pick two different people" } : null },
  T_RULE("secondPersonStarted", T.startedToEvacuate, { afterOrEqual: "timeAlarmSounded", custom: notAfterEnd }),
  T_RULE("secondPersonReached", T.reachedFinalExit, { after: "secondPersonStarted", custom: notAfterEnd }),
  ...EFFECTIVENESS_ITEMS.map((it) => ({ key: it.key, label: T[it.labelKey], required: true, oneOf: ["sat", "unsat"],
    requiredMsg: { ar: "قيّم هذا البند", en: "Rate this item" } })),
  { key: "correctiveActions", label: { ar: "الإجراءات التصحيحية", en: "Corrective actions" }, maxLength: 2000,
    requiredIf: EVAC_UNSAT, requiredMsg: { ar: "يوجد بند غير مُرضٍ — اكتب الإجراء التصحيحي", en: "An item is unsatisfactory — write the corrective action" } },
  { key: "emergencyCoordinator", label: T.emergencyCoordinator, required: true, maxLength: 80 },
];

const EVAC_STEPS = [
  { ar: "سجّل تاريخ التجربة ووقت بدايتها وانتهائها بالثواني (لا يُقبل تاريخ مستقبلي).", en: "Record the drill date and its start and end time to the second (no future dates)." },
  { ar: "اكتب الدور/المنطقة، عدد الأشخاص (1–2000) والأقسام المشاركة.", en: "Enter the floor/area, the number of people (1–2000) and the departments taking part." },
  { ar: "سجّل وقت إطلاق الإنذار ثم بدء الإخلاء — كلاهما بعد بداية التجربة وقبل نهايتها.", en: "Record when the alarm sounded and when evacuation started — both after the drill start and before its end." },
  { ar: "اختر شخصين مختلفين وسجّل متى بدأ كلٌّ منهما الإخلاء ومتى وصل للمخرج النهائي.", en: "Pick two different people and record when each set off and reached the final exit." },
  { ar: "قيّم البنود الأربعة؛ أي بند «غير مُرضٍ» يحتاج إجراءً تصحيحياً مكتوباً.", en: "Rate the four items; any “Unsatisfactory” needs a written corrective action." },
];
const EVAC_GUIDANCE = [
  { kind: "warn", ar: "تجربة الإخلاء إلزامية كل ربع سنة على الأقل حسب الدفاع المدني.", en: "Civil Defence requires a drill at least every quarter." },
  { kind: "tip",  ar: "الهدف المعتاد إخلاء المبنى بالكامل خلال 3 دقائق — قارن مع التجارب السابقة.", en: "The usual target is full evacuation within 3 minutes — compare with past drills." },
];

export default function HSEEvacuationDrills() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [viewing, setViewing] = useState(null); // record being viewed read-only
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(EVAC_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(STORAGE_KEY);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(it) {
    setDraft({ ...EMPTY_DRAFT, ...it });
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
        await apiUpdate(STORAGE_KEY, editingId, draft, draft.coordinator || "HSE");
      } else {
        await apiSave(STORAGE_KEY, draft, draft.coordinator || "HSE");
      }
      await reload();
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
      validation.reset();
      setTab("list");
      alert(pick(T.saved));
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!canDeleteHSE()) { alert(pick(HSE_DELETE_DENIED)); return; }
    if (!window.confirm(pick(T.confirmDelete))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  const [hoverId, setHoverId] = useState(null);
  const recordsGrid = { display: "grid", gap: 12 };
  const recordCard = (isHover) => ({
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    gap: 18,
    alignItems: "center",
    padding: "16px 20px",
    background: "#fff",
    border: "1px solid rgba(120, 53, 15, 0.10)",
    borderRadius: 16,
    boxShadow: isHover
      ? "0 14px 32px rgba(234,88,12,0.18)"
      : "0 6px 16px rgba(234,88,12,0.06)",
    transform: isHover ? "translateY(-2px)" : "translateY(0)",
    transition: "all .18s ease",
    cursor: "default",
  });
  const dateBadge = {
    minWidth: 86,
    padding: "10px 12px",
    borderRadius: 14,
    background: "linear-gradient(135deg, #ffedd5, #fed7aa)",
    color: "#7c2d12",
    fontWeight: 900,
    fontSize: 13,
    textAlign: "center",
    border: "1px solid #fdba74",
    lineHeight: 1.3,
  };
  const recordTitleStyle = { fontSize: 15, fontWeight: 900, color: "#1f0f00", marginBottom: 6 };
  const metaRow = { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, color: "#475569", fontWeight: 600 };
  const metaPill = { display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#fff7ed", borderRadius: 999, border: "1px solid #fed7aa" };
  const coordLine = { fontSize: 12.5, color: "#7c2d12", marginTop: 6, fontWeight: 700 };
  const actionGroup = { display: "flex", gap: 8, alignItems: "center" };
  const emptyState = {
    padding: "60px 20px",
    textAlign: "center",
    background: "#fff",
    borderRadius: 16,
    border: "1px dashed #fed7aa",
    color: "#9a3412",
  };

  function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>
              🚨 {pick(T.pageTitle)}
            </div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>
              FS-QM/REC/TR/MD/01 · Rev 0 · {DOC_CONTROL.issueDate}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => { setTab("list"); setViewing(null); }}>
              {pick(T.list)} ({items.length})
            </button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setTab("new"); setViewing(null); setDraft(EMPTY_DRAFT); setEditingId(null); validation.reset(); }}>
              {pick(T.add)}
            </button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Document Control Header — always visible */}
        {tab !== "new" && <DocControlHeader pick={pick} />}

        {/* New form */}
        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const nameLabel = lang === "ar" ? "الاسم / الموقع" : "Name / Office location";
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "تقرير تجربة الإخلاء", en: "Fire / Mock Drill Report" }}
              docNo={DOC_CONTROL.docNumber}
              revision={DOC_CONTROL.revision}
              accent={HSE_COLORS.primary}
              headerFields={[
                { label: pick(T.controllingOfficer), value: DOC_CONTROL.controllingOfficer },
                { label: pick(T.approvedBy), value: DOC_CONTROL.approvedBy },
              ]}
              steps={EVAC_STEPS}
              guidance={EVAC_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setDraft(EMPTY_DRAFT); setEditingId(null); validation.reset(); setTab("list"); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات التجربة" : "Drill details"}>
                <HSEField {...f("date")} type="date" label={pick(T.dateOfDrill)} />
                <HSEField {...f("timeStarted")} type="time" label={pick(T.timeStarted)} />
                <HSEField {...f("timeCompleted")} type="time" label={pick(T.timeCompleted)} />
                <HSEField {...f("floorNo")} label={pick(T.floorNo)} />
                <HSEField {...f("totalPeople")} type="int" label={pick(T.totalPeople)} />
                <HSEField {...f("departments")} full label={pick(T.deptParticipating)} />
              </HSEPanel>

              <HSEPanel title={lang === "ar" ? "توقيت الإخلاء" : "Evacuation timing"}>
                <HSEField {...f("timeAlarmSounded")} type="time" label={pick(T.alarmSounded)} />
                <HSEField {...f("timeEvacStarted")} type="time" label={pick(T.evacStarted)} />
                <HSEField {...f("totalEvacTime")} type="time" label={pick(T.totalEvacTime)} />
              </HSEPanel>

              <HSEPanel title={pick(T.twoPeopleHeader)}>
                <HSEField {...f("firstPersonName")} label={`① ${pick(T.firstPerson)} — ${nameLabel}`} />
                <HSEField {...f("firstPersonStarted")} type="time" label={pick(T.startedToEvacuate)} />
                <HSEField {...f("firstPersonReached")} type="time" label={pick(T.reachedFinalExit)} />
                <HSEField {...f("secondPersonName")} label={`② ${pick(T.secondPerson)} — ${nameLabel}`} />
                <HSEField {...f("secondPersonStarted")} type="time" label={pick(T.startedToEvacuate)} />
                <HSEField {...f("secondPersonReached")} type="time" label={pick(T.reachedFinalExit)} />
              </HSEPanel>

              <div className="ph-table-wrap" style={{ marginBottom: 14 }}>
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: "start" }}>{pick(T.effectiveness)}</th>
                      <th style={{ width: 170 }}>{pick(T.satisfactory)}</th>
                      <th style={{ width: 170 }}>{pick(T.unsatisfactory)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EFFECTIVENESS_ITEMS.map((it) => {
                      const v = draft[it.key];
                      const err = validation.errors[it.key];
                      return (
                        <tr key={it.key} data-hk-field={it.key} style={err ? { background: "#fef2f2" } : undefined}>
                          <td style={{ fontWeight: 700 }}>
                            {pick(T[it.labelKey])}
                            {err && <div className="hk-err">{err}</div>}
                          </td>
                          <td>
                            <button type="button" onClick={() => set(it.key, "sat")}
                              className={`ph-select ${v === "sat" ? "ph-select-ok" : "ph-select-empty"}`}>✓ {pick(T.satisfactory)}</button>
                          </td>
                          <td>
                            <button type="button" onClick={() => set(it.key, "unsat")}
                              className={`ph-select ${v === "unsat" ? "ph-select-bad" : "ph-select-empty"}`}>✗ {pick(T.unsatisfactory)}</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <HSEPanel title={lang === "ar" ? "الإجراءات والاعتماد" : "Actions & sign-off"}>
                <HSEField {...f("correctiveActions")} type="textarea" full label={lang === "ar" ? "الإجراءات التصحيحية" : "Corrective actions"} />
                <HSEField {...f("emergencyCoordinator")} label={pick(T.emergencyCoordinator)} />
              </HSEPanel>
            </HSEReportForm>
          );
        })()}

        {/* Viewing existing record */}
        {tab === "list" && viewing && (
          <>
            <div style={{ marginBottom: 8, fontSize: 13, color: HSE_COLORS.primaryDark, fontWeight: 800 }}>
              {lang === "ar" ? "عرض تقرير سابق (للقراءة فقط)" : "Viewing past report (read-only)"}
            </div>
            <DrillForm pick={pick} draft={viewing} setDraft={() => {}} readOnly />
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button style={buttonGhost} onClick={() => setViewing(null)}>
                {lang === "ar" ? "↩ رجوع للقائمة" : "↩ Back to list"}
              </button>
              <button
                style={{ ...buttonGhost, color: "#b91c1c", borderColor: "#fecaca" }}
                onClick={() => { remove(viewing.id); setViewing(null); }}
              >
                {pick(T.delete)}
              </button>
            </div>
          </>
        )}

        {/* List of saved drills — modern card grid */}
        {tab === "list" && !viewing && (
          items.length === 0 ? (
            <div style={emptyState}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 15, fontWeight: 900 }}>{pick(T.noRecords)}</div>
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.75 }}>
                {lang === "ar" ? "اضغط \"+ تعبئة نموذج جديد\" لإنشاء أول تقرير" : "Click \"+ New Drill Report\" to create your first record"}
              </div>
            </div>
          ) : (
            <div style={recordsGrid}>
              {items.map((it) => {
                const isHover = hoverId === it.id;
                return (
                  <div
                    key={it.id}
                    style={recordCard(isHover)}
                    onMouseEnter={() => setHoverId(it.id)}
                    onMouseLeave={() => setHoverId(null)}
                  >
                    <div style={dateBadge}>
                      🚨<br />
                      {fmtDate(it.date)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={recordTitleStyle}>{it.floorNo || (lang === "ar" ? "بدون منطقة محدّدة" : "No area specified")}</div>
                      <div style={metaRow}>
                        <span style={metaPill}>⏱ {it.timeStarted || "—"} → {it.timeCompleted || "—"}</span>
                        <span style={metaPill}>👥 {it.totalPeople || "—"}</span>
                        {it.totalEvacTime && <span style={metaPill}>🏁 {it.totalEvacTime}</span>}
                      </div>
                      {it.emergencyCoordinator && (
                        <div style={coordLine}>👤 {it.emergencyCoordinator}</div>
                      )}
                    </div>
                    <div style={actionGroup}>
                      <button
                        style={{ ...buttonGhost, padding: "8px 14px", fontSize: 12 }}
                        onClick={() => setViewing(it)}
                      >
                        {pick(T.view)}
                      </button>
                      <button
                        style={{ ...buttonGhost, padding: "8px 14px", fontSize: 12, color: "#1e40af", borderColor: "#bfdbfe", background: "#eff6ff" }}
                        onClick={() => startEdit(it)}
                      >
                        {pick(T.edit)}
                      </button>
                      {canDeleteHSE() && (
                        <button
                          data-delete-action="true"
                          style={{ ...buttonGhost, padding: "8px 14px", fontSize: 12, color: "#b91c1c", borderColor: "#fecaca", background: "#fff5f5" }}
                          onClick={() => remove(it.id)}
                        >
                          {pick(T.delete)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </main>
  );
}
