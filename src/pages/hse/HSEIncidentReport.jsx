// src/pages/hse/HSEIncidentReport.jsx
// F-01: تقرير حادث / إصابة — Incident Report (input + view) — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "incident_reports";

const T = {
  pageTitle:    { ar: "🚨 تقرير حادث / شبه حادث (F-01)", en: "🚨 Incident / Near-Miss Report (F-01)" },
  pageSubtitle: { ar: "نموذج موحّد: شبه حادث / إصابة / حريق / تسرب / تلوث + تحقيق + CAPA + إبلاغ الجهات",
                  en: "Unified report: near-miss / injury / fire / leak / contamination + investigation + CAPA + authorities" },
  anonymous:    { ar: "🕵️ بلاغ مجهول الهوية (Anonymous Report)", en: "🕵️ Anonymous Report" },
  anonymousHint:{ ar: "اخفاء اسم المُبلِّغ — لتشجيع البلاغات المبكرة", en: "Hides reporter name — encourages early reporting" },
  monthlyCount: { ar: "شبه حادث هذا الشهر", en: "near-miss this month" },
  monthlyTarget:{ ar: "المستهدف ≥ 10", en: "Target ≥ 10" },
  quickMode:    { ar: "⚡ نموذج سريع (Quick Entry)", en: "⚡ Quick Entry mode" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },
  date:         { ar: "التاريخ", en: "Date" },
  time:         { ar: "الوقت", en: "Time" },
  reporter:     { ar: "المُبلِّغ", en: "Reporter" },
  reporterPh:   { ar: "الاسم", en: "Name" },
  reporterRole: { ar: "وظيفة المُبلِّغ", en: "Reporter's Job Title" },
  classify:     { ar: "تصنيف الحادث", en: "Incident Classification" },
  type:         { ar: "نوع الحادث", en: "Incident Type" },
  severity:     { ar: "درجة الخطورة", en: "Severity" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  areaPh:       { ar: "مثلاً: الرف رقم 4", en: "e.g., Rack #4" },
  injuredPerson:{ ar: "الشخص المصاب (إن وجد)", en: "Injured Person (if any)" },
  name:         { ar: "الاسم", en: "Name" },
  age:          { ar: "العمر", en: "Age" },
  nationality:  { ar: "الجنسية", en: "Nationality" },
  job:          { ar: "الوظيفة", en: "Job" },
  exp:          { ar: "سنوات الخبرة", en: "Years of Experience" },
  desc:         { ar: "وصف الحادث (تسلسل زمني بدءاً من 30 دقيقة قبل الحادث)",
                  en: "Description (chronological from 30 min before the incident)" },
  injuryType:   { ar: "نوع الإصابة", en: "Type of Injury" },
  bodyPart:     { ar: "العضو المصاب", en: "Body Part" },
  treatment:    { ar: "العلاج المقدّم", en: "Treatment Given" },
  cost:         { ar: "تكلفة تقديرية للأضرار (درهم)", en: "Estimated damage cost (AED)" },
  damage:       { ar: "الأضرار المادية", en: "Material Damage" },
  witnesses:    { ar: "الشهود (الأسماء والوظائف وبيانات الاتصال)", en: "Witnesses (names, jobs, contacts)" },
  immediate:    { ar: "الإجراءات الفورية المتخذة", en: "Immediate Actions Taken" },
  investSec:    { ar: "التحقيق والإجراءات التصحيحية", en: "Investigation & Corrective Actions" },
  rootCause:    { ar: "الأسباب الجذرية (5 Whys / Fishbone)", en: "Root Causes (5 Whys / Fishbone)" },
  capa:         { ar: "الإجراءات التصحيحية المطلوبة", en: "Required Corrective Actions" },
  responsibility: { ar: "المسؤول عن التنفيذ", en: "Responsibility" },
  deadline:     { ar: "الموعد النهائي", en: "Deadline" },
  status:       { ar: "الحالة", en: "Status" },
  // Closure section (replaces F-25 Final Accident)
  closureSec:   { ar: "إغلاق التقرير (Lessons Learned)", en: "Report Closure (Lessons Learned)" },
  lessonsLearned:{ ar: "الدروس المستفادة", en: "Lessons Learned" },
  effectivenessCheck: { ar: "تم التحقق من فعالية الإجراءات؟", en: "CAPA effectiveness verified?" },
  effectivenessDate: { ar: "تاريخ التحقق", en: "Verification Date" },
  closedBy:     { ar: "مغلق بواسطة", en: "Closed By" },
  // Reporting (expanded — replaces F-23/F-24)
  reportingSec: { ar: "الإبلاغ للجهات", en: "Reporting to Authorities" },
  toHse:        { ar: "تم إبلاغ HSE Manager", en: "Reported to HSE Manager" },
  toHseDate:    { ar: "تاريخ الإبلاغ", en: "Date Reported" },
  toMohre:      { ar: "إبلاغ MOHRE", en: "Report to MOHRE" },
  toMun:        { ar: "إبلاغ بلدية دبي", en: "Report to Dubai Municipality" },
  toCD:         { ar: "إبلاغ الدفاع المدني", en: "Report to Civil Defence" },
  toPolice:     { ar: "إبلاغ الشرطة / النيابة", en: "Report to Police / Prosecution" },
  toFamily:     { ar: "إبلاغ الأسرة (وفاة)", en: "Family Notified (Fatal)" },
  toInsurance:  { ar: "إبلاغ التأمين", en: "Insurance Notified" },
  optChoose:    { ar: "— اختر —", en: "— Select —" },
  optNot:       { ar: "غير مطلوب", en: "Not required" },
  optPending:   { ar: "قيد الإبلاغ", en: "Pending" },
  optReported:  { ar: "تم الإبلاغ", en: "Reported" },
  optYes:       { ar: "نعم", en: "Yes" },
  optNo:        { ar: "لا (بعد)", en: "Not yet" },
  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  clearBtn:     { ar: "🔄 مسح", en: "🔄 Clear" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  search:       { ar: "🔍 بحث…", en: "🔍 Search…" },
  fAll:         { ar: "كل الأنواع", en: "All Types" },
  cols: {
    report:   { ar: "التقرير", en: "Report" },
    date:     { ar: "التاريخ", en: "Date" },
    type:     { ar: "النوع", en: "Type" },
    sev:      { ar: "الخطورة", en: "Severity" },
    location: { ar: "الموقع", en: "Location" },
    reporter: { ar: "المُبلِّغ", en: "Reporter" },
    status:   { ar: "الحالة", en: "Status" },
    actions:  { ar: "إجراءات", en: "Actions" },
  },
  noRecords: { ar: "لا توجد تقارير", en: "No reports" },
  needDesc:  { ar: "اكتب وصف الحادث", en: "Enter the incident description" },
  needReporter: { ar: "أدخل اسم المُبلِّغ", en: "Enter the reporter's name" },
  saved:    { ar: "✅ تم حفظ تقرير الحادث", en: "✅ Incident report saved" },
  confirmDel: { ar: "حذف هذا التقرير؟", en: "Delete this report?" },
  del:      { ar: "حذف", en: "Delete" },
  edit:     { ar: "✏️ تعديل", en: "✏️ Edit" },
  // statuses
  stOpen:   { ar: "🔴 مفتوح", en: "🔴 Open" },
  stInv:    { ar: "🟡 قيد التحقيق", en: "🟡 Investigating" },
  stAct:    { ar: "🔵 إجراءات تصحيحية", en: "🔵 Corrective Actions" },
  stClosed: { ar: "✅ مغلق", en: "✅ Closed" },
  stOpenS:  { ar: "🔴 مفتوح", en: "🔴 Open" },
  stInvS:   { ar: "🟡 تحقيق", en: "🟡 Investig." },
  stActS:   { ar: "🔵 تصحيح", en: "🔵 Action" },
  // smart banner labels
  alertTitle: { ar: "🚨 إجراءات الإبلاغ الإلزامية", en: "🚨 Required Notifications" },
};

const INCIDENT_TYPES = [
  { v: "lost_time_injury",  ar: "🩹 إصابة عمل (LTI)", en: "🩹 Lost-Time Injury (LTI)", c: "#7f1d1d", bg: "#fee2e2" },
  { v: "first_aid",         ar: "🏥 إسعاف أولي (FAC)", en: "🏥 First Aid Case (FAC)",  c: "#854d0e", bg: "#fef9c3" },
  { v: "near_miss",         ar: "👁️ شبه حادث",        en: "👁️ Near-miss",            c: "#1e40af", bg: "#dbeafe" },
  { v: "fire",              ar: "🔥 حريق",            en: "🔥 Fire",                 c: "#b91c1c", bg: "#fee2e2" },
  { v: "leak",              ar: "💨 تسرب غاز/سائل",    en: "💨 Gas/Liquid Leak",       c: "#7c2d12", bg: "#fed7aa" },
  { v: "property_damage",   ar: "🏚️ تلف ممتلكات",      en: "🏚️ Property Damage",       c: "#374151", bg: "#e5e7eb" },
  { v: "environmental",     ar: "🌱 حادث بيئي",        en: "🌱 Environmental Incident",c: "#166534", bg: "#dcfce7" },
  { v: "food_contamination",ar: "🦠 تلوث غذائي",       en: "🦠 Food Contamination",     c: "#5b21b6", bg: "#e9d5ff" },
];

const SEVERITY = [
  { v: "near_miss", ar: "👁️ شبه حادث (بدون إصابة)",      en: "👁️ Near-miss (no injury)",       color: "#1e40af", bg: "#dbeafe" },
  { v: "first_aid", ar: "🏥 إسعاف أولي (FAC)",            en: "🏥 First-aid (FAC)",              color: "#0e7490", bg: "#cffafe" },
  { v: "minor",     ar: "🩹 طفيف (علاج طبي بدون فقد أيام)", en: "🩹 Minor (medical, no lost time)", color: "#166534", bg: "#dcfce7" },
  { v: "lti",       ar: "⚠️ إصابة بفقد أيام عمل (LTI)",    en: "⚠️ Lost-Time Injury (LTI)",      color: "#854d0e", bg: "#fef9c3" },
  { v: "major",     ar: "🚨 شديد (دخول مستشفى)",          en: "🚨 Major (hospitalization)",      color: "#9a3412", bg: "#fed7aa" },
  { v: "fatal",     ar: "💀 وفاة",                         en: "💀 Fatal",                         color: "#7f1d1d", bg: "#fee2e2" },
];

/** Required notifications based on severity (UAE MOHRE 33/2021 + Civil Defence) */
function getRequiredNotifications(severity, lang) {
  const ar = lang === "ar";
  switch (severity) {
    case "near_miss":
    case "first_aid":
    case "minor":
      return null; // no external authority needed
    case "lti":
      return {
        level: "warn",
        title: ar ? "⚠️ إبلاغ MOHRE خلال 48 ساعة (إذا الغياب ≥ 3 أيام)" : "⚠️ MOHRE notification within 48h (if absence ≥ 3 days)",
        items: [ar ? "📞 MOHRE — 80060" : "📞 MOHRE — 80060",
                ar ? "📋 تقرير طبي رسمي مطلوب" : "📋 Official medical report required"],
      };
    case "major":
      return {
        level: "danger",
        title: ar ? "🚨 إبلاغ فوري مطلوب — حادث شديد" : "🚨 Immediate notification — Major incident",
        items: [ar ? "📞 MOHRE خلال 48 ساعة (80060)" : "📞 MOHRE within 48h (80060)",
                ar ? "🚒 الدفاع المدني (لو حريق/تسرب) — 997" : "🚒 Civil Defence (fire/leak) — 997",
                ar ? "🏥 إبلاغ التأمين الطبي" : "🏥 Medical insurance notification"],
      };
    case "fatal":
      return {
        level: "fatal",
        title: ar ? "💀 إبلاغ فوري إلزامي — حادث وفاة" : "💀 IMMEDIATE notification — Fatal incident",
        items: [ar ? "🚓 الشرطة فوراً — 999" : "🚓 Police IMMEDIATELY — 999",
                ar ? "📞 MOHRE فوراً — 80060" : "📞 MOHRE IMMEDIATELY — 80060",
                ar ? "🚒 الدفاع المدني — 997" : "🚒 Civil Defence — 997",
                ar ? "⚖️ النيابة العامة" : "⚖️ Public Prosecution",
                ar ? "👨‍👩‍👧 إبلاغ الأسرة" : "👨‍👩‍👧 Notify Family",
                ar ? "🏥 شركة التأمين" : "🏥 Insurance Company",
                ar ? "📸 توثيق المسرح بالصور قبل أي تدخل" : "📸 Photograph scene before any intervention"],
      };
    default:
      return null;
  }
}

const blank = () => ({
  reportNo: `INC-${Date.now().toString().slice(-6)}`,
  reportDate: todayISO(), reportTime: nowHHMM(),
  reporter: "", reporterRole: "", anonymous: false,
  type: "near_miss", severity: "near_miss",
  location: SITE_LOCATIONS[0].v, area: "",
  injuredName: "", injuredAge: "", injuredNationality: "", injuredJob: "", injuredExp: "",
  description: "", injuriesType: "", bodyPart: "", treatment: "", damageDescription: "", estimatedCost: "",
  witnesses: "", immediateActions: "",
  rootCause: "", correctiveActions: "", responsibility: "", deadline: "",
  reportedToHSE: "", reportedToHSEDate: "",
  reportedToMOHRE: "", reportedToMunicipality: "",
  reportedToCivilDefence: "", reportedToPolice: "",
  familyNotified: "", insuranceNotified: "",
  lessonsLearned: "", effectivenessVerified: "", effectivenessDate: "", closedBy: "",
  status: "open",
});

export default function HSEIncidentReport() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function set(k, v) { setDraft((d) => ({ ...d, [k]: v })); }

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setTab("new");
  }

  async function save() {
    if (!draft.description.trim()) { alert(pick(T.needDesc)); return; }
    if (!draft.anonymous && !draft.reporter.trim()) { alert(pick(T.needReporter)); return; }
    const toSave = draft.anonymous ? { ...draft, reporter: "🕵️ Anonymous", reporterRole: "" } : draft;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, toSave, toSave.reporter || "HSE");
      } else {
        await apiSave(TYPE, toSave, toSave.reporter || "HSE");
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

  const filtered = useMemo(() => items.filter((it) => {
    if (filter !== "all" && it.type !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(`${it.reportNo} ${it.injuredName} ${it.location} ${it.description}`.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [items, filter, search]);

  // Monthly near-miss counter
  const nearMissThisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return items.filter((it) => it.severity === "near_miss" && (it.reportDate || "").startsWith(ym)).length;
  }, [items]);

  const isQuickMode = draft.severity === "near_miss"; // hide injury/medical fields when near-miss

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.pageSubtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => setTab("list")}>{pick(T.list)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setEditingId(null); setDraft(blank()); setTab("new"); }}>{editingId ? (pick({ ar: "✏️ تعديل تقرير", en: "✏️ Editing Report" })) : pick(T.newReport)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Monthly near-miss counter (replaces F-02) */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
          gap: 12, padding: "14px 18px", marginBottom: 14, borderRadius: 14,
          background: nearMissThisMonth >= 10
            ? "linear-gradient(135deg, #dcfce7, #f0fdf4)"
            : "linear-gradient(135deg, #fef3c7, #fffbeb)",
          border: `2px solid ${nearMissThisMonth >= 10 ? "#86efac" : "#fcd34d"}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ fontSize: 32 }}>👁️</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 950, color: nearMissThisMonth >= 10 ? "#166534" : "#92400e", lineHeight: 1 }}>
                {nearMissThisMonth} <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>/ 10</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, color: nearMissThisMonth >= 10 ? "#166534" : "#92400e", marginTop: 2 }}>
                {pick(T.monthlyCount)} · {pick(T.monthlyTarget)}
              </div>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140, marginInlineStart: 18 }}>
            <div style={{ height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(100, (nearMissThisMonth / 10) * 100)}%`,
                background: nearMissThisMonth >= 10 ? "linear-gradient(90deg, #16a34a, #22c55e)" : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                transition: "width .4s ease",
              }} />
            </div>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.reportDate} onChange={(e) => set("reportDate", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.reportTime} onChange={(e) => set("reportTime", e.target.value)} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.reporter)}</label>
                <input
                  type="text"
                  value={draft.anonymous ? "" : draft.reporter}
                  onChange={(e) => set("reporter", e.target.value)}
                  placeholder={draft.anonymous ? "🕵️ Anonymous" : pick(T.reporterPh)}
                  disabled={draft.anonymous}
                  style={{ ...inputStyle, background: draft.anonymous ? "#f1f5f9" : "#fffbf5", color: draft.anonymous ? "#64748b" : "inherit" }}
                />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.reporterRole)}</label>
                <input
                  type="text"
                  value={draft.anonymous ? "" : draft.reporterRole}
                  onChange={(e) => set("reporterRole", e.target.value)}
                  disabled={draft.anonymous}
                  style={{ ...inputStyle, background: draft.anonymous ? "#f1f5f9" : "#fffbf5", color: draft.anonymous ? "#64748b" : "inherit" }}
                />
              </div>
            </div>

            {/* Anonymous toggle (encourages near-miss reporting) */}
            <label style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 14px", marginTop: 10, borderRadius: 12,
              background: draft.anonymous ? "linear-gradient(135deg, #ddd6fe, #ede9fe)" : "#fffbf5",
              border: `1.5px solid ${draft.anonymous ? "#a78bfa" : "#fed7aa"}`,
              cursor: "pointer",
            }}>
              <input type="checkbox" checked={draft.anonymous} onChange={(e) => set("anonymous", e.target.checked)} style={{ width: 18, height: 18, accentColor: "#7c3aed" }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: draft.anonymous ? "#5b21b6" : "#1f0f00" }}>{pick(T.anonymous)}</div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{pick(T.anonymousHint)}</div>
              </div>
            </label>

            <div style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px dashed rgba(120,53,15,0.18)" }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(T.classify)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div>
                  <label style={labelStyle}>{pick(T.type)}</label>
                  <select value={draft.type} onChange={(e) => set("type", e.target.value)} style={inputStyle}>
                    {INCIDENT_TYPES.map((t) => <option key={t.v} value={t.v}>{t[lang]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.severity)}</label>
                  <select value={draft.severity} onChange={(e) => set("severity", e.target.value)} style={inputStyle}>
                    {SEVERITY.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.location)}</label>
                  <select value={draft.location} onChange={(e) => set("location", e.target.value)} style={inputStyle}>
                    {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.area)}</label>
                  <input type="text" value={draft.area} onChange={(e) => set("area", e.target.value)} placeholder={pick(T.areaPh)} style={inputStyle} />
                </div>
              </div>
            </div>

            <SeverityAlertBanner severity={draft.severity} lang={lang} />


            {!isQuickMode && (
              <div style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px dashed rgba(120,53,15,0.18)" }}>
                <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(T.injuredPerson)}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                  <div><label style={labelStyle}>{pick(T.name)}</label><input type="text" value={draft.injuredName} onChange={(e) => set("injuredName", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.age)}</label><input type="number" value={draft.injuredAge} onChange={(e) => set("injuredAge", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.nationality)}</label><input type="text" value={draft.injuredNationality} onChange={(e) => set("injuredNationality", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.job)}</label><input type="text" value={draft.injuredJob} onChange={(e) => set("injuredJob", e.target.value)} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.exp)}</label><input type="number" value={draft.injuredExp} onChange={(e) => set("injuredExp", e.target.value)} style={inputStyle} /></div>
                </div>
              </div>
            )}

            {isQuickMode && (
              <div style={{
                marginTop: 14, padding: "10px 14px", borderRadius: 10,
                background: "linear-gradient(135deg, #dbeafe, #f0f9ff)",
                border: "1px solid #93c5fd", fontSize: 12.5, color: "#1e40af", fontWeight: 700,
              }}>
                {pick(T.quickMode)} — {lang === "ar" ? "حقول الإصابة الطبية مخفيّة (شبه حادث = بدون إصابة)" : "Medical injury fields hidden (Near-miss = no injury)"}
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{pick(T.desc)}</label>
              <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} style={{ ...inputStyle, minHeight: 110 }} />
            </div>

            {!isQuickMode && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
                <div><label style={labelStyle}>{pick(T.injuryType)}</label><input type="text" value={draft.injuriesType} onChange={(e) => set("injuriesType", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.bodyPart)}</label><input type="text" value={draft.bodyPart} onChange={(e) => set("bodyPart", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.treatment)}</label><input type="text" value={draft.treatment} onChange={(e) => set("treatment", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.cost)}</label><input type="number" value={draft.estimatedCost} onChange={(e) => set("estimatedCost", e.target.value)} style={inputStyle} /></div>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.damage)}</label>
              <textarea value={draft.damageDescription} onChange={(e) => set("damageDescription", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.witnesses)}</label>
              <textarea value={draft.witnesses} onChange={(e) => set("witnesses", e.target.value)} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.immediate)}</label>
              <textarea value={draft.immediateActions} onChange={(e) => set("immediateActions", e.target.value)} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#fee2e2", borderRadius: 10, border: "1px solid #fca5a5" }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#7f1d1d" }}>{pick(T.investSec)}</div>
              <div>
                <label style={labelStyle}>{pick(T.rootCause)}</label>
                <textarea value={draft.rootCause} onChange={(e) => set("rootCause", e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={labelStyle}>{pick(T.capa)}</label>
                <textarea value={draft.correctiveActions} onChange={(e) => set("correctiveActions", e.target.value)} style={{ ...inputStyle, minHeight: 80 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 8 }}>
                <div><label style={labelStyle}>{pick(T.responsibility)}</label><input type="text" value={draft.responsibility} onChange={(e) => set("responsibility", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.deadline)}</label><input type="date" value={draft.deadline} onChange={(e) => set("deadline", e.target.value)} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>{pick(T.status)}</label>
                  <select value={draft.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
                    <option value="open">{pick(T.stOpen)}</option>
                    <option value="investigating">{pick(T.stInv)}</option>
                    <option value="action">{pick(T.stAct)}</option>
                    <option value="closed">{pick(T.stClosed)}</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#dbeafe", borderRadius: 10, border: "1px solid #93c5fd" }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#1e40af" }}>{pick(T.reportingSec)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                <div><label style={labelStyle}>{pick(T.toHse)}</label><input type="text" value={draft.reportedToHSE} onChange={(e) => set("reportedToHSE", e.target.value)} placeholder={pick(T.reporterPh)} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.toHseDate)}</label><input type="date" value={draft.reportedToHSEDate} onChange={(e) => set("reportedToHSEDate", e.target.value)} style={inputStyle} /></div>
                <NotifySelect label={pick(T.toMohre)}    value={draft.reportedToMOHRE}          onChange={(v) => set("reportedToMOHRE", v)}          T={T} pick={pick} />
                <NotifySelect label={pick(T.toMun)}      value={draft.reportedToMunicipality}   onChange={(v) => set("reportedToMunicipality", v)}   T={T} pick={pick} />
                <NotifySelect label={pick(T.toCD)}       value={draft.reportedToCivilDefence}   onChange={(v) => set("reportedToCivilDefence", v)}   T={T} pick={pick} />
                <NotifySelect label={pick(T.toPolice)}   value={draft.reportedToPolice}         onChange={(v) => set("reportedToPolice", v)}         T={T} pick={pick} />
                <NotifySelect label={pick(T.toFamily)}   value={draft.familyNotified}           onChange={(v) => set("familyNotified", v)}           T={T} pick={pick} yesNo />
                <NotifySelect label={pick(T.toInsurance)} value={draft.insuranceNotified}       onChange={(v) => set("insuranceNotified", v)}        T={T} pick={pick} yesNo />
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#dcfce7", borderRadius: 10, border: "1px solid #86efac" }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#166534" }}>{pick(T.closureSec)}</div>
              <div>
                <label style={labelStyle}>{pick(T.lessonsLearned)}</label>
                <textarea value={draft.lessonsLearned} onChange={(e) => set("lessonsLearned", e.target.value)} style={{ ...inputStyle, minHeight: 70 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>{pick(T.effectivenessCheck)}</label>
                  <select value={draft.effectivenessVerified} onChange={(e) => set("effectivenessVerified", e.target.value)} style={inputStyle}>
                    <option value="">{pick(T.optChoose)}</option>
                    <option value="yes">{pick(T.optYes)}</option>
                    <option value="no">{pick(T.optNo)}</option>
                  </select>
                </div>
                <div><label style={labelStyle}>{pick(T.effectivenessDate)}</label><input type="date" value={draft.effectivenessDate} onChange={(e) => set("effectivenessDate", e.target.value)} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.closedBy)}</label><input type="text" value={draft.closedBy} onChange={(e) => set("closedBy", e.target.value)} style={inputStyle} /></div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.saveBtn)}
              </button>
              <button style={buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); }} disabled={saving}>{pick(T.clearBtn)}</button>
              <button style={buttonGhost} onClick={() => { setTab("list"); setEditingId(null); }} disabled={saving}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {tab === "list" && (
          <>
            <div style={{ ...cardStyle, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 260 }} />
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 220 }}>
                <option value="all">{pick(T.fAll)}</option>
                {INCIDENT_TYPES.map((t) => <option key={t.v} value={t.v}>{t[lang]}</option>)}
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.cols.report)}</th>
                    <th style={thStyle}>{pick(T.cols.date)}</th>
                    <th style={thStyle}>{pick(T.cols.type)}</th>
                    <th style={thStyle}>{pick(T.cols.sev)}</th>
                    <th style={thStyle}>{pick(T.cols.location)}</th>
                    <th style={thStyle}>{pick(T.cols.reporter)}</th>
                    <th style={thStyle}>{pick(T.cols.status)}</th>
                    <th style={thStyle}>{pick(T.cols.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const t = INCIDENT_TYPES.find((x) => x.v === it.type);
                    const sev = SEVERITY.find((x) => x.v === it.severity);
                    const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                    return (
                      <tr key={it.id}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                        <td style={tdStyle}>{it.reportDate} · {it.reportTime}</td>
                        <td style={tdStyle}>
                          <span style={{ padding: "3px 8px", borderRadius: 6, background: t?.bg, color: t?.c, fontWeight: 800, fontSize: 12 }}>
                            {t ? t[lang] : it.type}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {sev && (
                            <span style={{ padding: "3px 8px", borderRadius: 6, background: sev.bg, color: sev.color, fontWeight: 800, fontSize: 12 }}>
                              {sev[lang]}
                            </span>
                          )}
                        </td>
                        <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                        <td style={tdStyle}>{it.reporter}</td>
                        <td style={tdStyle}>
                          {it.status === "open" && pick(T.stOpenS)}
                          {it.status === "investigating" && pick(T.stInvS)}
                          {it.status === "action" && pick(T.stActS)}
                          {it.status === "closed" && pick(T.stClosed)}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="8" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

/* ============================================================
   Smart banner — shows required notifications based on severity
   ============================================================ */
function SeverityAlertBanner({ severity, lang }) {
  const info = getRequiredNotifications(severity, lang);
  if (!info) return null;

  const styles = {
    warn:   { bg: "linear-gradient(135deg, #fef3c7, #fde68a)", border: "#f59e0b", text: "#78350f", titleColor: "#92400e" },
    danger: { bg: "linear-gradient(135deg, #fed7aa, #fdba74)", border: "#ea580c", text: "#7c2d12", titleColor: "#9a3412" },
    fatal:  { bg: "linear-gradient(135deg, #fee2e2, #fecaca)", border: "#dc2626", text: "#7f1d1d", titleColor: "#991b1b" },
  };
  const s = styles[info.level] || styles.warn;

  return (
    <div style={{
      marginTop: 14,
      padding: 14,
      background: s.bg,
      border: `2px solid ${s.border}`,
      borderRadius: 12,
      boxShadow: `0 6px 18px ${s.border}33`,
      animation: info.level === "fatal" ? "pulse 1.5s ease-in-out infinite" : "none",
    }}>
      <div style={{ fontSize: 14, fontWeight: 950, color: s.titleColor, marginBottom: 8 }}>
        {info.title}
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
        {info.items.map((item, i) => (
          <li key={i} style={{ fontSize: 12.5, color: s.text, fontWeight: 700, padding: "3px 0" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Reusable 3-state authority notification dropdown
   ============================================================ */
function NotifySelect({ label, value, onChange, T, pick, yesNo = false }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
        <option value="">{pick(T.optChoose)}</option>
        {yesNo ? (
          <>
            <option value="yes">{pick(T.optYes)}</option>
            <option value="no">{pick(T.optNo)}</option>
            <option value="not_required">{pick(T.optNot)}</option>
          </>
        ) : (
          <>
            <option value="not_required">{pick(T.optNot)}</option>
            <option value="pending">{pick(T.optPending)}</option>
            <option value="reported">{pick(T.optReported)}</option>
          </>
        )}
      </select>
    </div>
  );
}
