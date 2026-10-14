// src/pages/hse/HSEMonthlySafetyReport.jsx
// F-21: التقرير الشهري/الأسبوعي للسلامة — Monthly/Weekly Safety Report (SBG-HSE-001)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
  canDeleteHSE, HSE_DELETE_DENIED,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "monthly_safety_reports";

const T = {
  title:        { ar: "📊 التقرير الشهري/الأسبوعي للسلامة (F-21) — Monthly Safety Report", en: "📊 Monthly/Weekly Safety Report (F-21)" },
  subtitle:     { ar: "تقرير KPI تجميعي شامل (مطابق SBG-HSE-001) — ساعات عمل، حوادث، تدريب، تدقيق",
                  en: "Comprehensive KPI consolidated report (per SBG-HSE-001) — Man-hours, Incidents, Training, Audits" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },
  period:       { ar: "الفترة", en: "Period" },
  weekly:       { ar: "أسبوعي", en: "Weekly" },
  monthly:      { ar: "شهري", en: "Monthly" },
  month:        { ar: "الشهر / الفترة", en: "Month / Period" },
  monthPh:      { ar: "مثلاً: مايو 2026", en: "e.g. May 2026" },
  dateFrom:     { ar: "من تاريخ", en: "From" },
  dateTo:       { ar: "إلى تاريخ", en: "To" },

  // Section 1
  s1Title:      { ar: "1️⃣ بيانات المشروع / المنشأة", en: "1️⃣ Project / Facility Information" },
  projectTitle: { ar: "اسم المشروع / المنشأة", en: "Project / Facility Name" },
  contractor:   { ar: "المُنفِّذ / الشركة", en: "Contractor / Company" },
  contractNo:   { ar: "رقم العقد", en: "Contract No." },
  location:     { ar: "الموقع", en: "Location" },

  // Section 2 — KPI metrics
  s2Title:      { ar: "2️⃣ مؤشرات المشروع", en: "2️⃣ Project KPIs" },
  thisMonth:    { ar: "هذا الشهر", en: "This Period" },
  cumulative:   { ar: "تراكمي", en: "Cumulative" },
  metric:       { ar: "المؤشر", en: "Indicator" },

  // Section 3
  s3Title:      { ar: "3️⃣ الصحة والسلامة", en: "3️⃣ Health & Safety" },

  // Section 4
  s4Title:      { ar: "4️⃣ التدريب والتوعية", en: "4️⃣ Training & Awareness" },

  // Section 5
  s5Title:      { ar: "5️⃣ الرقابة والتدقيق", en: "5️⃣ Monitoring & Audits" },

  // Section 6
  s6Title:      { ar: "6️⃣ نتائج SPI ومواضيع اجتماعات Toolbox", en: "6️⃣ SPI Results & Toolbox Topics" },
  spiResults:   { ar: "نتائج مؤشرات الأداء (SPI)", en: "SPI Results Summary" },
  toolboxTopics:{ ar: "المواضيع التي نُوقشت في Toolbox", en: "Topics Discussed at Toolbox Meetings" },
  notes:        { ar: "ملاحظات إضافية", en: "Additional Notes" },

  // Section 7
  s7Title:      { ar: "✍️ التوقيعات والاعتماد", en: "✍️ Signatures & Approvals" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },
  reviewedBy:   { ar: "راجع التقرير", en: "Reviewed By" },
  approvedBy:   { ar: "اعتمد التقرير", en: "Approved By" },

  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needMonth:    { ar: "أدخل الشهر/الفترة", en: "Enter month/period" },
  saved:        { ar: "✅ تم حفظ التقرير", en: "✅ Report saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  edit:         { ar: "✏️ تعديل", en: "✏️ Edit" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد تقارير", en: "No reports" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    period:    { ar: "النوع", en: "Type" },
    month:     { ar: "الفترة", en: "Period" },
    location:  { ar: "الموقع", en: "Location" },
    manHours:  { ar: "ساعات العمل", en: "Man-hours" },
    incidents: { ar: "حوادث", en: "Incidents" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-21 · Monthly/Weekly Safety Report · AL MAWASHI HSE",
                  en: "Form F-21 · Monthly/Weekly Safety Report · AL MAWASHI HSE" },
};

const PROJECT_METRICS = [
  { v: "manHours",    ar: "إجمالي ساعات العمل",                    en: "Total Man-hours Worked" },
  { v: "employees",   ar: "عدد الموظفين (آخر يوم)",                 en: "No. of Employees (Last Day)" },
  { v: "safetyOffs",  ar: "عدد ضباط/مهندسي السلامة في الموقع",       en: "No. of Safety Engineers/Officers" },
  { v: "equipment",   ar: "عدد المعدات في الموقع",                   en: "No. of Equipment at Site" },
];

const HEALTH_METRICS = [
  { v: "fatalities", ar: "الوفيات (FAT)",                          en: "Fatalities (FAT)" },
  { v: "lta",        ar: "حوادث فقد وقت (LTA)",                    en: "Lost Time Accidents (LTA)" },
  { v: "nearMiss",   ar: "شبه حوادث",                en: "Near Misses (NM)" },
  { v: "majorAcc",       ar: "حوادث كبرى",                              en: "Major Accidents" },
  { v: "occIllness", ar: "حالات أمراض مهنية",                      en: "Occupational Illness Cases" },
  { v: "tri",        ar: "إجمالي الحوادث المُسجَّلة (TRI)",         en: "Total Recordable Incidents (TRI)" },
  { v: "fac",        ar: "حالات إسعاف أولي (FAC)",                  en: "First Aid Cases (FAC)" },
  { v: "violations", ar: "مخالفات السلامة",                          en: "Safety Violations Raised" },
  { v: "fire",       ar: "حوادث حريق",                                en: "Fire Accidents" },
  { v: "assetDmg",   ar: "أضرار الأصول (AD)",                        en: "Asset Damages (AD)" },
  { v: "rta",        ar: "حوادث طرق (RTA)",                          en: "Road Traffic Accidents (RTA)" },
  { v: "termination",ar: "حالات إنهاء خدمة (لأسباب سلامة)",          en: "Terminations (safety-related)" },
];

const TRAINING_METRICS = [
  { v: "toolbox",     ar: "اجتماعات Toolbox للسلامة",              en: "Toolbox Talks (Health & Safety topics)" },
  { v: "induction",   ar: "تأهيل سلامة",                en: "Safety Induction" },
  { v: "tsa",         ar: "إحاطات تحليل سلامة المهام (TSA)",         en: "Task Safety Analysis (TSA) Briefings" },
  { v: "repMeetings", ar: "اجتماعات ممثلي السلامة",                  en: "Safety Representatives Meetings" },
  { v: "internalTr",  ar: "تدريب داخلي على إجراءات IMS",            en: "Internal Training on IMS Procedures" },
  { v: "externalTr",  ar: "دورات تدريب خارجية",                       en: "External Training Courses" },
];

const AUDIT_METRICS = [
  { v: "intAudits",     ar: "عدد التدقيقات الداخلية",                en: "No. of Internal Audits" },
  { v: "siteInsp",      ar: "عدد تفتيشات الموقع",                     en: "No. of Site HSE Inspections" },
  { v: "mgmtTours",     ar: "جولات الإدارة للسلامة",                   en: "Project Management Safety Tours" },
  { v: "consultantTrs", ar: "جولات مستشار السلامة",                   en: "Consultant Safety Tours" },
  { v: "consultObs",    ar: "ملاحظات المستشار (مغلقة/مفتوحة)",         en: "Consultant Observations (Closed/Open)" },
  { v: "kpiRate",       ar: "معدلات KPI (٪)",                          en: "KPI Rates (%)" },
];

const blank = () => {
  const init = (arr) => Object.fromEntries(arr.map((m) => [m.v, { thisP: "", cum: "" }]));
  return {
    reportNo: `MSR-${Date.now().toString().slice(-6)}`,
    periodType: "monthly", month: "", dateFrom: todayISO(), dateTo: todayISO(),
    projectTitle: "", contractor: "", contractNo: "",
    location: SITE_LOCATIONS[0].v,
    project: init(PROJECT_METRICS),
    health: init(HEALTH_METRICS),
    training: init(TRAINING_METRICS),
    audit: init(AUDIT_METRICS),
    spiResults: "", toolboxTopics: "", notes: "",
    preparedBy: "", reviewedBy: "", approvedBy: "",
  };
};

/* ── Rules: every KPI cell is a count — a whole number, never negative —
   except man-hours (any number) and KPI rate (0–100 %); the cumulative
   column can never be below this period; recordable incidents include the
   fatalities and lost-time ones; the period itself fits its type. ── */
const METRIC_GROUPS = { project: PROJECT_METRICS, health: HEALTH_METRICS, training: TRAINING_METRICS, audit: AUDIT_METRICS };

/** Message for one KPI cell, or null. Shared by the rules and the table. */
function metricCellError(metricKey, field, cur) {
  const raw = cur?.[field];
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return { ar: "رقم موجب فقط", en: "Positive numbers only" };
  if (metricKey === "kpiRate") { if (n > 100) return { ar: "النسبة من 0 إلى 100", en: "Rate is 0 to 100" }; return null; }
  if (metricKey !== "manHours" && !Number.isInteger(n)) return { ar: "رقم صحيح فقط", en: "Whole numbers only" };
  if (n > (metricKey === "manHours" ? 10000000 : 100000)) return { ar: "قيمة غير منطقية", en: "Value is not plausible" };
  if (field === "cum" && metricKey !== "kpiRate" && cur.thisP !== "" && cur.thisP != null && n < Number(cur.thisP))
    return { ar: "التراكمي أقل من هذه الفترة", en: "Cumulative is below this period" };
  return null;
}

const metricRule = (group, label) => ({
  key: group, label,
  custom: (v, d) => {
    for (const m of METRIC_GROUPS[group]) {
      for (const field of ["thisP", "cum"]) {
        const e = metricCellError(m.v, field, v?.[m.v]);
        if (e) return { ar: `${m.ar}: ${e.ar}`, en: `${m.en}: ${e.en}` };
      }
    }
    if (group === "health") {
      const val = (k, f) => Number(v?.[k]?.[f]) || 0;
      for (const f of ["thisP", "cum"]) {
        if (v?.tri?.[f] !== "" && v?.tri?.[f] != null && val("tri", f) < val("fatalities", f) + val("lta", f))
          return { ar: "إجمالي الحوادث المسجّلة (TRI) يشمل الوفيات وحوادث فقد الوقت — لا يكون أقل منها", en: "TRI includes fatalities and LTAs — it cannot be lower than their sum" };
      }
    }
    if (group === "project" && Number(v?.employees?.thisP) > 0 && v?.manHours?.thisP !== "" && v?.manHours?.thisP != null) {
      const days = d.dateFrom && d.dateTo ? Math.max(1, (new Date(d.dateTo) - new Date(d.dateFrom)) / 86400000 + 1) : 31;
      if (Number(v.manHours.thisP) > Number(v.employees.thisP) * 24 * days)
        return { ar: "ساعات العمل أكثر من عدد الموظفين × 24 ساعة × أيام الفترة", en: "Man-hours exceed employees × 24 h × days in the period" };
    }
    return null;
  },
});

const MSR_RULES = [
  { key: "periodType", label: T.period, required: true, oneOf: ["weekly", "monthly"] },
  { key: "month", label: T.month, required: true, maxLength: 40 },
  { key: "dateFrom", label: T.dateFrom, type: "date", required: true, notFuture: true },
  { key: "dateTo", label: T.dateTo, type: "date", required: true, afterOrEqual: "dateFrom",
    custom: (v, d) => {
      if (!v || !d.dateFrom) return null;
      const days = (new Date(v) - new Date(d.dateFrom)) / 86400000 + 1;
      const max = d.periodType === "weekly" ? 7 : 31;
      return days > max
        ? { ar: `الفترة ${d.periodType === "weekly" ? "الأسبوعية" : "الشهرية"} لا تتجاوز ${max} يوماً`, en: `A ${d.periodType} period cannot exceed ${max} days` } : null;
    } },
  { key: "projectTitle", label: T.projectTitle, required: true, maxLength: 120 },
  { key: "contractor", label: T.contractor, maxLength: 120 },
  { key: "contractNo", label: T.contractNo, maxLength: 40 },
  { key: "location", label: T.location, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
  metricRule("project", T.s2Title),
  metricRule("health", T.s3Title),
  metricRule("training", T.s4Title),
  metricRule("audit", T.s5Title),
  { key: "spiResults", label: T.spiResults, maxLength: 3000 },
  { key: "toolboxTopics", label: T.toolboxTopics, maxLength: 3000 },
  { key: "notes", label: T.notes, maxLength: 3000 },
  { key: "preparedBy", label: T.preparedBy, required: true, maxLength: 80 },
  { key: "reviewedBy", label: T.reviewedBy, maxLength: 80,
    custom: (v, d) => v && d.preparedBy && v.trim().toLowerCase() === d.preparedBy.trim().toLowerCase()
      ? { ar: "المراجِع يجب أن يكون غير المُعِد", en: "The reviewer must differ from the preparer" } : null },
  { key: "approvedBy", label: T.approvedBy, maxLength: 80 },
];
const MSR_STEPS = [
  { ar: "اختر نوع الفترة (أسبوعي/شهري) واكتب اسمها، ثم تاريخ البداية والنهاية — أسبوعي ≤ 7 أيام، شهري ≤ 31 يوماً.", en: "Choose the period type (weekly/monthly) and name it, then the start and end date — weekly ≤ 7 days, monthly ≤ 31." },
  { ar: "اكتب اسم المنشأة والموقع.", en: "Enter the facility name and location." },
  { ar: "املأ كل مؤشر: «هذه الفترة» و«التراكمي» — أرقام صحيحة موجبة، والتراكمي لا يقل عن الفترة.", en: "Fill each indicator: “This period” and “Cumulative” — whole positive numbers, cumulative never below the period." },
  { ar: "استخدم أرقام الحوادث المحسوبة تلقائياً من تقارير F-01 أعلاه للمقارنة.", en: "Use the incident figures calculated from the F-01 reports above to cross-check." },
  { ar: "اكتب نتائج SPI ومواضيع Toolbox، ثم يوقّع المُعِد ويراجع شخص آخر.", en: "Write the SPI results and toolbox topics; the preparer signs and someone else reviews." },
];
const MSR_GUIDANCE = [
  { kind: "tip", ar: "TRI = الوفيات + LTA + الحالات الطبية المسجّلة — لا يكون أقل من مجموع الوفيات و LTA.", en: "TRI = fatalities + LTAs + recordable medical cases — never lower than fatalities + LTAs." },
];

export default function HSEMonthlySafetyReport() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Live KPIs auto-pulled from F-01 (incident_reports)
  const [incidents, setIncidents] = useState([]);
  useEffect(() => {
    apiList("incident_reports").then(setIncidents).catch(() => setIncidents([]));
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const liveKPIs = useMemo(() => {
    const inMonth = (it) => (it.reportDate || "").startsWith(selectedMonth);
    const all = incidents.filter(inMonth);
    const nearMiss = all.filter((it) => it.severity === "near_miss").length;
    const firstAid = all.filter((it) => it.severity === "first_aid").length;
    const lti      = all.filter((it) => it.severity === "lti").length;
    const major    = all.filter((it) => it.severity === "major").length;
    const fatal    = all.filter((it) => it.severity === "fatal").length;
    const closed   = all.filter((it) => it.status === "closed").length;
    const closureRate = all.length ? Math.round((closed / all.length) * 100) : 0;
    // Days without injury — from latest LTI/Major/Fatal across all time
    const lastSerious = incidents
      .filter((it) => ["lti", "major", "fatal"].includes(it.severity))
      .map((it) => it.reportDate)
      .filter(Boolean)
      .sort()
      .pop();
    const daysWithoutInjury = lastSerious
      ? Math.floor((Date.now() - new Date(lastSerious).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    return { total: all.length, nearMiss, firstAid, lti, major, fatal, closureRate, daysWithoutInjury };
  }, [incidents, selectedMonth]);

  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(MSR_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function printReport() { window.print(); }

  function setMetric(group, key, field, val) {
    setDraft((d) => ({
      ...d,
      [group]: { ...d[group], [key]: { ...d[group][key], [field]: val } },
    }));
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
        await apiUpdate(TYPE, editingId, draft, draft.preparedBy || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.preparedBy || "HSE");
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
    if (!canDeleteHSE()) { alert(pick(HSE_DELETE_DENIED)); return; }
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

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

        {/* ⚡ Live KPI Dashboard (auto-pulled from F-01) — replaces standalone KPI Dashboard */}
        <div style={{ ...cardStyle, marginBottom: 14, padding: 18, background: "linear-gradient(135deg, #fff, #fff7ed)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 950, color: HSE_COLORS.primaryDark }}>
                ⚡ {lang === "ar" ? "مؤشرات الأداء المباشرة" : "Live KPI Dashboard"}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                {lang === "ar" ? "مُستخرجة تلقائياً من F-01 (تقارير الحوادث)" : "Auto-pulled from F-01 (Incident Reports)"}
              </div>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ ...inputStyle, maxWidth: 180, fontWeight: 800 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
            <KpiTile color="#1e40af" bg="#dbeafe" icon="👁️" value={liveKPIs.nearMiss}
                     label={lang === "ar" ? "شبه حوادث" : "Near-Miss"} />
            <KpiTile color="#0e7490" bg="#cffafe" icon="🏥" value={liveKPIs.firstAid}
                     label={lang === "ar" ? "إسعاف أولي" : "First Aid"} />
            <KpiTile color="#854d0e" bg="#fef9c3" icon="⚠️" value={liveKPIs.lti}
                     label={lang === "ar" ? "LTI" : "LTI"} />
            <KpiTile color="#9a3412" bg="#fed7aa" icon="🚨" value={liveKPIs.major}
                     label={lang === "ar" ? "شديد" : "Major"} />
            <KpiTile color="#7f1d1d" bg="#fee2e2" icon="💀" value={liveKPIs.fatal}
                     label={lang === "ar" ? "وفاة" : "Fatal"} />
            <KpiTile color="#166534" bg="#dcfce7" icon="✅" value={`${liveKPIs.closureRate}%`}
                     label={lang === "ar" ? "نسبة الإغلاق" : "Closure %"} />
            <KpiTile color="#7c3aed" bg="#ede9fe" icon="📅"
                     value={liveKPIs.daysWithoutInjury == null ? "—" : liveKPIs.daysWithoutInjury}
                     label={lang === "ar" ? "يوم بدون إصابة" : "Days w/o Injury"} />
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          const section = (group, title, metrics) => (
            <div data-hk-field={group}>
              <MetricSection title={title} metrics={metrics} group={group} lang={lang} pick={pick} t={T} draft={draft} setMetric={setMetric} />
              {validation.errors[group] && <div className="hk-err" style={{ margin: "6px 0 10px" }}>{validation.errors[group]}</div>}
            </div>
          );
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "التقرير الشهري / الأسبوعي للسلامة", en: "Monthly / Weekly Safety Report" }}
              subtitle={T.subtitle}
              docNo="F-21"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.reportNo), value: draft.reportNo }]}
              steps={MSR_STEPS}
              guidance={MSR_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(blank()); validation.reset(); }}
            >
              <HSEPanel title={pick(T.s1Title)}>
                <HSEField {...f("periodType")} type="select" label={pick(T.period)} options={[
                  { v: "weekly", label: pick(T.weekly) },
                  { v: "monthly", label: pick(T.monthly) },
                ]} />
                <HSEField {...f("month")} label={pick(T.month)} placeholder={pick(T.monthPh)} />
                <HSEField {...f("dateFrom")} type="date" label={pick(T.dateFrom)} />
                <HSEField {...f("dateTo")} type="date" label={pick(T.dateTo)} />
                <HSEField {...f("projectTitle")} label={pick(T.projectTitle)} />
                <HSEField {...f("contractor")} label={pick(T.contractor)} />
                <HSEField {...f("contractNo")} label={pick(T.contractNo)} />
                <HSEField {...f("location")} type="select" label={pick(T.location)}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
              </HSEPanel>

              {section("project", pick(T.s2Title), PROJECT_METRICS)}
              {section("health", pick(T.s3Title), HEALTH_METRICS)}
              {section("training", pick(T.s4Title), TRAINING_METRICS)}
              {section("audit", pick(T.s5Title), AUDIT_METRICS)}

              <HSEPanel title={pick(T.s6Title)}>
                <HSEField {...f("spiResults")} type="textarea" full label={pick(T.spiResults)} />
                <HSEField {...f("toolboxTopics")} type="textarea" full label={pick(T.toolboxTopics)} />
                <HSEField {...f("notes")} type="textarea" full label={pick(T.notes)} />
              </HSEPanel>

              <HSEPanel title={pick(T.s7Title)}>
                <HSEField {...f("preparedBy")} label={pick(T.preparedBy)} />
                <HSEField {...f("reviewedBy")} label={pick(T.reviewedBy)} />
                <HSEField {...f("approvedBy")} label={pick(T.approvedBy)} />
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
                  <th style={thStyle}>{pick(T.cols.period)}</th>
                  <th style={thStyle}>{pick(T.cols.month)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.manHours)}</th>
                  <th style={thStyle}>{pick(T.cols.incidents)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const incidents = ["fatalities", "lta", "nearMiss", "fac"].reduce((acc, k) => {
                    return acc + (Number(it.health?.[k]?.thisP) || 0);
                  }, 0);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.periodType === "monthly" ? pick(T.monthly) : pick(T.weekly)}</td>
                      <td style={tdStyle}>{it.month || `${it.dateFrom} → ${it.dateTo}`}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{it.project?.manHours?.thisP || "—"}</td>
                      <td style={tdStyle}>{incidents}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
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

        {viewing && (
          <ViewModal viewing={viewing} setViewing={setViewing} dir={dir} lang={lang} pick={pick} t={T} printReport={printReport} />
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

function MetricSection({ title, metrics, group, lang, pick, t, draft, setMetric }) {
  return (
    <>
      <SectionHeader title={title} />
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle}>{pick(t.metric)}</th>
              <th style={thStyle}>{pick(t.thisMonth)}</th>
              <th style={thStyle}>{pick(t.cumulative)}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => {
              const cur = draft[group]?.[m.v] || { thisP: "", cum: "" };
              return (
                <tr key={m.v}>
                  <td style={{ ...tdStyle, fontWeight: 700 }}>{m[lang]}</td>
                  <td style={tdStyle}>
                    <input type="number" min="0" max={m.v === "kpiRate" ? 100 : undefined} step={m.v === "manHours" || m.v === "kpiRate" ? "any" : 1}
                      value={cur.thisP} onChange={(e) => setMetric(group, m.v, "thisP", e.target.value)}
                      onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                      style={{ ...inputStyle, padding: "6px 10px", minHeight: 38, ...(metricCellError(m.v, "thisP", cur) ? { borderColor: "#dc2626", background: "#fef2f2" } : null) }} placeholder="0" />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" min="0" max={m.v === "kpiRate" ? 100 : undefined} step={m.v === "manHours" || m.v === "kpiRate" ? "any" : 1}
                      value={cur.cum} onChange={(e) => setMetric(group, m.v, "cum", e.target.value)}
                      onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault(); }}
                      style={{ ...inputStyle, padding: "6px 10px", minHeight: 38, ...(metricCellError(m.v, "cum", cur) ? { borderColor: "#dc2626", background: "#fef2f2" } : null) }} placeholder="0" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ViewModal({ viewing, setViewing, dir, lang, pick, t, printReport }) {
  const blocks = [
    { title: pick(t.s2Title), metrics: PROJECT_METRICS, group: "project" },
    { title: pick(t.s3Title), metrics: HEALTH_METRICS,  group: "health" },
    { title: pick(t.s4Title), metrics: TRAINING_METRICS, group: "training" },
    { title: pick(t.s5Title), metrics: AUDIT_METRICS,    group: "audit" },
  ];
  return (
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
            <div style={{ fontSize: 22, fontWeight: 950, color: HSE_COLORS.primaryDark }}>{pick(t.title)}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE · Trans Emirates Livestock Trading L.L.C.</div>
          </div>
          <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
            <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(t.print)}</button>
            <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(t.closeModal)}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, padding: 12, background: "#fff7ed", borderRadius: 10, marginBottom: 16 }}>
          <div><b>{pick(t.reportNo)}: </b>{viewing.reportNo}</div>
          <div><b>{pick(t.period)}: </b>{viewing.periodType === "monthly" ? pick(t.monthly) : pick(t.weekly)}</div>
          <div><b>{pick(t.month)}: </b>{viewing.month || `${viewing.dateFrom} → ${viewing.dateTo}`}</div>
          <div><b>{pick(t.projectTitle)}: </b>{viewing.projectTitle}</div>
          <div><b>{pick(t.contractor)}: </b>{viewing.contractor}</div>
          <div><b>{pick(t.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
        </div>

        {blocks.map((bk) => (
          <div key={bk.group} style={{ marginBottom: 14 }}>
            <SectionHeader title={bk.title} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(t.metric)}</th>
                    <th style={thStyle}>{pick(t.thisMonth)}</th>
                    <th style={thStyle}>{pick(t.cumulative)}</th>
                  </tr>
                </thead>
                <tbody>
                  {bk.metrics.map((m) => {
                    const cur = viewing[bk.group]?.[m.v] || { thisP: "", cum: "" };
                    return (
                      <tr key={m.v}>
                        <td style={{ ...tdStyle, fontWeight: 700 }}>{m[lang]}</td>
                        <td style={tdStyle}>{cur.thisP || "—"}</td>
                        <td style={tdStyle}>{cur.cum || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {viewing.spiResults && (
          <ViewBlock title={pick(t.spiResults)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.spiResults}</div></ViewBlock>
        )}
        {viewing.toolboxTopics && (
          <ViewBlock title={pick(t.toolboxTopics)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.toolboxTopics}</div></ViewBlock>
        )}
        {viewing.notes && (
          <ViewBlock title={pick(t.notes)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.notes}</div></ViewBlock>
        )}

        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14,
        }}>
          {[["preparedBy", t.preparedBy], ["reviewedBy", t.reviewedBy], ["approvedBy", t.approvedBy]].map(([k, lbl]) => (
            <div key={k}>
              <div style={{ fontSize: 11, color: "#64748b" }}>{pick(lbl)}</div>
              <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing[k] || "_______________"}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, fontSize: 10, color: "#64748b", textAlign: "center" }}>{pick(t.formFooter)}</div>
      </div>
    </div>
  );
}

function ViewBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{title}</div>
      {children}
    </div>
  );
}

/* Live KPI tile (used in dashboard at top) */
function KpiTile({ color, bg, icon, value, label }) {
  return (
    <div style={{
      padding: "12px 14px",
      borderRadius: 12,
      background: bg,
      border: `1px solid ${color}33`,
      borderInlineStart: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 950, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color, marginTop: 4, opacity: 0.85 }}>{label}</div>
    </div>
  );
}
