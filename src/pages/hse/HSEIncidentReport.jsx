// src/pages/hse/HSEIncidentReport.jsx
// F-01: تقرير حادث / إصابة — Incident Report (input + view) — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle,
  useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "incident_reports";

const T = {
  pageTitle:    { ar: "🚨 تقرير حادث (F-01) — Incident Report", en: "🚨 Incident Report (F-01)" },
  pageSubtitle: { ar: "تسجيل إصابات العمل، الحرائق، التسربات، الحوادث البيئية، تلوث الغذاء",
                  en: "Record work injuries, fires, leaks, environmental incidents, food contamination" },
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
  reportingSec: { ar: "الإبلاغ للجهات", en: "Reporting to Authorities" },
  toHse:        { ar: "تم إبلاغ HSE Manager", en: "Reported to HSE Manager" },
  toHseDate:    { ar: "تاريخ الإبلاغ", en: "Date Reported" },
  toMohre:      { ar: "إبلاغ MOHRE", en: "Report to MOHRE" },
  toMun:        { ar: "إبلاغ بلدية دبي", en: "Report to Dubai Municipality" },
  optChoose:    { ar: "— اختر —", en: "— Select —" },
  optNot:       { ar: "غير مطلوب", en: "Not required" },
  optPending:   { ar: "قيد الإبلاغ", en: "Pending" },
  optReported:  { ar: "تم الإبلاغ", en: "Reported" },
  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  clearBtn:     { ar: "🔄 مسح", en: "🔄 Clear" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  search:       { ar: "🔍 بحث…", en: "🔍 Search…" },
  fAll:         { ar: "كل الأنواع", en: "All Types" },
  cols: {
    report:   { ar: "التقرير", en: "Report" },
    date:     { ar: "التاريخ", en: "Date" },
    type:     { ar: "النوع", en: "Type" },
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
  // statuses
  stOpen:   { ar: "🔴 مفتوح", en: "🔴 Open" },
  stInv:    { ar: "🟡 قيد التحقيق", en: "🟡 Investigating" },
  stAct:    { ar: "🔵 إجراءات تصحيحية", en: "🔵 Corrective Actions" },
  stClosed: { ar: "✅ مغلق", en: "✅ Closed" },
  stOpenS:  { ar: "🔴 مفتوح", en: "🔴 Open" },
  stInvS:   { ar: "🟡 تحقيق", en: "🟡 Investig." },
  stActS:   { ar: "🔵 تصحيح", en: "🔵 Action" },
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
  { v: "minor",    ar: "بسيط",   en: "Minor",     color: "#166534", bg: "#dcfce7" },
  { v: "moderate", ar: "متوسط",  en: "Moderate",  color: "#854d0e", bg: "#fef9c3" },
  { v: "major",    ar: "شديد",   en: "Major",     color: "#9a3412", bg: "#fed7aa" },
  { v: "fatal",    ar: "وفاة",   en: "Fatal",     color: "#7f1d1d", bg: "#fee2e2" },
];

const blank = () => ({
  reportNo: `INC-${Date.now().toString().slice(-6)}`,
  reportDate: todayISO(), reportTime: nowHHMM(),
  reporter: "", reporterRole: "",
  type: "lost_time_injury", severity: "minor",
  location: SITE_LOCATIONS[0].v, area: "",
  injuredName: "", injuredAge: "", injuredNationality: "", injuredJob: "", injuredExp: "",
  description: "", injuriesType: "", bodyPart: "", treatment: "", damageDescription: "", estimatedCost: "",
  witnesses: "", immediateActions: "",
  rootCause: "", correctiveActions: "", responsibility: "", deadline: "",
  reportedToHSE: "", reportedToHSEDate: "",
  reportedToMOHRE: "", reportedToMunicipality: "",
  status: "open",
});

export default function HSEIncidentReport() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function set(k, v) { setDraft((d) => ({ ...d, [k]: v })); }

  function save() {
    if (!draft.description.trim()) { alert(pick(T.needDesc)); return; }
    if (!draft.reporter.trim()) { alert(pick(T.needReporter)); return; }
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

  const filtered = useMemo(() => items.filter((it) => {
    if (filter !== "all" && it.type !== filter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      if (!(`${it.reportNo} ${it.injuredName} ${it.location} ${it.description}`.toLowerCase().includes(s))) return false;
    }
    return true;
  }), [items, filter, search]);

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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newReport)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.reportDate} onChange={(e) => set("reportDate", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.reportTime} onChange={(e) => set("reportTime", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.reporter)}</label><input type="text" value={draft.reporter} onChange={(e) => set("reporter", e.target.value)} placeholder={pick(T.reporterPh)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.reporterRole)}</label><input type="text" value={draft.reporterRole} onChange={(e) => set("reporterRole", e.target.value)} style={inputStyle} /></div>
            </div>

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

            <div style={{ marginTop: 14 }}>
              <label style={labelStyle}>{pick(T.desc)}</label>
              <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} style={{ ...inputStyle, minHeight: 110 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.injuryType)}</label><input type="text" value={draft.injuriesType} onChange={(e) => set("injuriesType", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.bodyPart)}</label><input type="text" value={draft.bodyPart} onChange={(e) => set("bodyPart", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.treatment)}</label><input type="text" value={draft.treatment} onChange={(e) => set("treatment", e.target.value)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.cost)}</label><input type="number" value={draft.estimatedCost} onChange={(e) => set("estimatedCost", e.target.value)} style={inputStyle} /></div>
            </div>

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
                <div>
                  <label style={labelStyle}>{pick(T.toMohre)}</label>
                  <select value={draft.reportedToMOHRE} onChange={(e) => set("reportedToMOHRE", e.target.value)} style={inputStyle}>
                    <option value="">{pick(T.optChoose)}</option>
                    <option value="not_required">{pick(T.optNot)}</option>
                    <option value="pending">{pick(T.optPending)}</option>
                    <option value="reported">{pick(T.optReported)}</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{pick(T.toMun)}</label>
                  <select value={draft.reportedToMunicipality} onChange={(e) => set("reportedToMunicipality", e.target.value)} style={inputStyle}>
                    <option value="">{pick(T.optChoose)}</option>
                    <option value="not_required">{pick(T.optNot)}</option>
                    <option value="pending">{pick(T.optPending)}</option>
                    <option value="reported">{pick(T.optReported)}</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
              <button style={buttonGhost} onClick={() => setDraft(blank())}>{pick(T.clearBtn)}</button>
              <button style={buttonGhost} onClick={() => setTab("list")}>{pick(T.cancel)}</button>
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
                    <th style={thStyle}>{pick(T.cols.location)}</th>
                    <th style={thStyle}>{pick(T.cols.reporter)}</th>
                    <th style={thStyle}>{pick(T.cols.status)}</th>
                    <th style={thStyle}>{pick(T.cols.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const t = INCIDENT_TYPES.find((x) => x.v === it.type);
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
                        <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                        <td style={tdStyle}>{it.reporter}</td>
                        <td style={tdStyle}>
                          {it.status === "open" && pick(T.stOpenS)}
                          {it.status === "investigating" && pick(T.stInvS)}
                          {it.status === "action" && pick(T.stActS)}
                          {it.status === "closed" && pick(T.stClosed)}
                        </td>
                        <td style={tdStyle}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="7" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
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
