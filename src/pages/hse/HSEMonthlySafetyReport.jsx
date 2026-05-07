// src/pages/hse/HSEMonthlySafetyReport.jsx
// F-21: التقرير الشهري/الأسبوعي للسلامة — Monthly/Weekly Safety Report (SBG-HSE-001)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

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
  s2Title:      { ar: "2️⃣ مؤشرات المشروع (Project KPIs)", en: "2️⃣ Project KPIs" },
  thisMonth:    { ar: "هذا الشهر", en: "This Period" },
  cumulative:   { ar: "تراكمي", en: "Cumulative" },
  metric:       { ar: "المؤشر", en: "Indicator" },

  // Section 3
  s3Title:      { ar: "3️⃣ الصحة والسلامة (Health & Safety)", en: "3️⃣ Health & Safety" },

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
  { v: "nearMiss",   ar: "شبه حوادث (Near Misses)",                en: "Near Misses (NM)" },
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
  { v: "induction",   ar: "تأهيل سلامة (Induction)",                en: "Safety Induction" },
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

export default function HSEMonthlySafetyReport() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function setMetric(group, key, field, val) {
    setDraft((d) => ({
      ...d,
      [group]: { ...d[group], [key]: { ...d[group][key], [field]: val } },
    }));
  }

  function save() {
    if (!draft.month.trim() && !draft.dateFrom) { alert(pick(T.needMonth)); return; }
    appendLocal(TYPE, draft);
    setItems(loadLocal(TYPE));
    alert(pick(T.saved));
    setDraft(blank()); setTab("list");
  }
  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    deleteLocal(TYPE, id);
    setItems(loadLocal(TYPE));
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newReport)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            {/* Section 1 */}
            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div>
                <label style={labelStyle}>{pick(T.period)}</label>
                <select value={draft.periodType} onChange={(e) => setDraft({ ...draft, periodType: e.target.value })} style={inputStyle}>
                  <option value="weekly">{pick(T.weekly)}</option>
                  <option value="monthly">{pick(T.monthly)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.month)}</label><input type="text" value={draft.month} placeholder={pick(T.monthPh)} onChange={(e) => setDraft({ ...draft, month: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.dateFrom)}</label><input type="date" value={draft.dateFrom} onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.dateTo)}</label><input type="date" value={draft.dateTo} onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.projectTitle)}</label><input type="text" value={draft.projectTitle} onChange={(e) => setDraft({ ...draft, projectTitle: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.contractor)}</label><input type="text" value={draft.contractor} onChange={(e) => setDraft({ ...draft, contractor: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.contractNo)}</label><input type="text" value={draft.contractNo} onChange={(e) => setDraft({ ...draft, contractNo: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
            </div>

            <MetricSection title={pick(T.s2Title)} metrics={PROJECT_METRICS} group="project" lang={lang} pick={pick} t={T} draft={draft} setMetric={setMetric} />
            <MetricSection title={pick(T.s3Title)} metrics={HEALTH_METRICS} group="health" lang={lang} pick={pick} t={T} draft={draft} setMetric={setMetric} />
            <MetricSection title={pick(T.s4Title)} metrics={TRAINING_METRICS} group="training" lang={lang} pick={pick} t={T} draft={draft} setMetric={setMetric} />
            <MetricSection title={pick(T.s5Title)} metrics={AUDIT_METRICS} group="audit" lang={lang} pick={pick} t={T} draft={draft} setMetric={setMetric} />

            {/* Section 6 */}
            <SectionHeader title={pick(T.s6Title)} />
            <div>
              <label style={labelStyle}>{pick(T.spiResults)}</label>
              <textarea value={draft.spiResults} onChange={(e) => setDraft({ ...draft, spiResults: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.toolboxTopics)}</label>
              <textarea value={draft.toolboxTopics} onChange={(e) => setDraft({ ...draft, toolboxTopics: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.notes)}</label>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            {/* Section 7 */}
            <SectionHeader title={pick(T.s7Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.reviewedBy)}</label><input type="text" value={draft.reviewedBy} onChange={(e) => setDraft({ ...draft, reviewedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.approvedBy)}</label><input type="text" value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
              <button style={buttonGhost} onClick={() => setTab("list")}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

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
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
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
                    <input type="number" value={cur.thisP} onChange={(e) => setMetric(group, m.v, "thisP", e.target.value)}
                      style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} placeholder="0" />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={cur.cum} onChange={(e) => setMetric(group, m.v, "cum", e.target.value)}
                      style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} placeholder="0" />
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
