// src/pages/hse/HSEFinalAccident.jsx
// F-25: التقرير النهائي للحادث — Final Accident Report (SBG-HSE-007)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "final_accident_reports";

const T = {
  title:        { ar: "📕 التقرير النهائي للحادث (F-25) — Final Accident Report", en: "📕 Final Accident Report (F-25)" },
  subtitle:     { ar: "تقرير شامل بعد التحقيق (مطابق SBG-HSE-007) — مكمل لـ F-23",
                  en: "Comprehensive post-investigation report (per SBG-HSE-007) — follows F-23" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },
  prelimRef:    { ar: "رقم التقرير الأوّلي (F-23)", en: "Preliminary Report Ref. (F-23)" },

  // Section 1
  s1Title:      { ar: "📋 معلومات أساسية", en: "📋 Basic Information" },
  date:         { ar: "تاريخ الحادث", en: "Accident Date" },
  time:         { ar: "وقت الحادث", en: "Accident Time" },
  reportDate:   { ar: "تاريخ هذا التقرير", en: "Report Date" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  classification:{ ar: "تصنيف الحادث", en: "Accident Classification" },
  severity:     { ar: "درجة الخطورة", en: "Severity" },
  sevMinor:     { ar: "بسيط", en: "Minor" },
  sevModerate:  { ar: "متوسط", en: "Moderate" },
  sevSerious:   { ar: "جسيم", en: "Serious" },
  sevCritical:  { ar: "حرج", en: "Critical" },
  sevFatal:     { ar: "مميت", en: "Fatal" },

  // Section 2
  s2Title:      { ar: "👤 المصاب", en: "👤 Injured Person" },
  fullName:     { ar: "الاسم الكامل", en: "Full Name" },
  age:          { ar: "العمر", en: "Age" },
  nationality:  { ar: "الجنسية", en: "Nationality" },
  jobTitle:     { ar: "المسمى الوظيفي", en: "Job Title" },
  badgeNo:      { ar: "رقم الشارة", en: "Badge No." },
  yrsExp:       { ar: "سنوات الخبرة", en: "Years of Experience" },
  injuryType:   { ar: "نوع الإصابة", en: "Type of Injury" },
  bodyPart:     { ar: "العضو/الأعضاء المصابة", en: "Body Part(s) Affected" },
  treatment:    { ar: "العلاج المُقدَّم", en: "Treatment Provided" },
  daysLost:     { ar: "أيام الفقد المتوقعة", en: "Expected Days Lost" },
  hospital:     { ar: "المستشفى/المستوصف", en: "Hospital / Clinic" },

  // Section 3 — Investigation
  s3Title:      { ar: "🔍 نتائج التحقيق", en: "🔍 Investigation Findings" },
  investTeam:   { ar: "فريق التحقيق (الأسماء/الوظائف)", en: "Investigation Team (Names/Roles)" },
  description:  { ar: "وصف الحادث الكامل", en: "Full Description of Accident" },
  sequence:     { ar: "تسلسل الأحداث (Timeline)", en: "Sequence of Events (Timeline)" },
  immediate:    { ar: "الأسباب المباشرة", en: "Immediate Causes" },
  underlying:   { ar: "الأسباب الكامنة", en: "Underlying Causes" },
  rootCause:    { ar: "الأسباب الجذرية (5 Whys / Fishbone)", en: "Root Causes (5 Whys / Fishbone)" },

  // Section 4 — Damages
  s4Title:      { ar: "💰 الأضرار والتكاليف", en: "💰 Damages & Costs" },
  propDamage:   { ar: "أضرار مادية", en: "Property Damage" },
  envImpact:    { ar: "أثر بيئي", en: "Environmental Impact" },
  productivity: { ar: "أثر على الإنتاج", en: "Productivity Impact" },
  totalCost:    { ar: "التكلفة الإجمالية المُقدَّرة (درهم)", en: "Total Estimated Cost (AED)" },

  // Section 5 — CAPA
  s5Title:      { ar: "🛠️ الإجراءات التصحيحية والوقائية", en: "🛠️ Corrective & Preventive Actions" },
  capaShort:    { ar: "إجراءات قصيرة المدى", en: "Short-term Actions" },
  capaLong:     { ar: "إجراءات طويلة المدى", en: "Long-term Actions" },
  responsible:  { ar: "المسؤول", en: "Responsible" },
  deadline:     { ar: "الموعد النهائي", en: "Deadline" },
  status:       { ar: "الحالة", en: "Status" },
  stOpen:       { ar: "مفتوح", en: "Open" },
  stProgress:   { ar: "قيد التنفيذ", en: "In Progress" },
  stClosed:     { ar: "مُغلق", en: "Closed" },
  addAction:    { ar: "+ إضافة إجراء", en: "+ Add Action" },
  removeAction: { ar: "حذف", en: "Remove" },

  // Section 6 — Lessons
  s6Title:      { ar: "📚 الدروس المستفادة", en: "📚 Lessons Learned" },
  lessons:      { ar: "الدروس المستفادة (للمشاركة بين المواقع)", en: "Lessons Learned (for cross-site sharing)" },
  recommendations:{ ar: "التوصيات", en: "Recommendations" },

  // Section 7 — Approvals
  s7Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },
  hseManager:   { ar: "مدير HSE", en: "HSE Manager" },
  siteManager:  { ar: "مدير الموقع", en: "Site Manager" },

  // Description text
  actionDesc:   { ar: "وصف الإجراء", en: "Action Description" },

  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needName:     { ar: "أدخل اسم المصاب", en: "Enter injured name" },
  saved:        { ar: "✅ تم حفظ التقرير", en: "✅ Report saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد تقارير", en: "No reports" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    name:      { ar: "المصاب", en: "Injured" },
    severity:  { ar: "الخطورة", en: "Severity" },
    location:  { ar: "الموقع", en: "Location" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  classFields: {
    fall:    { ar: "سقوط", en: "Fall" },
    cut:     { ar: "قطع/جرح", en: "Cut/Laceration" },
    burn:    { ar: "حرق", en: "Burn" },
    chem:    { ar: "تعرض كيميائي", en: "Chemical Exposure" },
    elec:    { ar: "صدمة كهربائية", en: "Electric Shock" },
    crush:   { ar: "سحق/انضغاط", en: "Crush" },
    strain:  { ar: "إجهاد عضلي", en: "Strain/Sprain" },
    cold:    { ar: "تعرض للبرودة", en: "Cold Exposure" },
    other:   { ar: "أخرى", en: "Other" },
  },
  formFooter:   { ar: "Form F-25 · Final Accident Report · AL MAWASHI HSE",
                  en: "Form F-25 · Final Accident Report · AL MAWASHI HSE" },
};

const blankAction = () => ({ desc: "", responsible: "", deadline: "", status: "open" });

const blank = () => ({
  reportNo: `FAR-${Date.now().toString().slice(-6)}`,
  prelimRef: "",
  date: todayISO(), time: nowHHMM(), reportDate: todayISO(),
  location: SITE_LOCATIONS[0].v, area: "",
  classification: "", severity: "moderate",
  fullName: "", age: "", nationality: "", jobTitle: "", badgeNo: "",
  yrsExp: "", injuryType: "", bodyPart: "", treatment: "",
  daysLost: "", hospital: "",
  investTeam: "", description: "", sequence: "",
  immediateCauses: "", underlyingCauses: "", rootCauses: "",
  propertyDamage: "", environmentalImpact: "", productivityImpact: "", totalCost: "",
  shortActions: [blankAction()], longActions: [blankAction()],
  lessons: "", recommendations: "",
  preparedBy: "", hseManager: "", siteManager: "",
});

export default function HSEFinalAccident() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function setAction(field, idx, key, val) {
    setDraft((d) => {
      const arr = [...(d[field] || [])];
      arr[idx] = { ...arr[idx], [key]: val };
      return { ...d, [field]: arr };
    });
  }
  function addAction(field) {
    setDraft((d) => ({ ...d, [field]: [...(d[field] || []), blankAction()] }));
  }
  function removeAction(field, idx) {
    setDraft((d) => ({ ...d, [field]: d[field].filter((_, i) => i !== idx) }));
  }

  function save() {
    if (!draft.fullName.trim()) { alert(pick(T.needName)); return; }
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.prelimRef)}</label><input type="text" value={draft.prelimRef} placeholder="PAR-XXXXXX" onChange={(e) => setDraft({ ...draft, prelimRef: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.reportDate)}</label><input type="date" value={draft.reportDate} onChange={(e) => setDraft({ ...draft, reportDate: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.classification)}</label>
                <select value={draft.classification} onChange={(e) => setDraft({ ...draft, classification: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  {Object.entries(T.classFields).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.severity)}</label>
                <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })} style={inputStyle}>
                  <option value="minor">{pick(T.sevMinor)}</option>
                  <option value="moderate">{pick(T.sevModerate)}</option>
                  <option value="serious">{pick(T.sevSerious)}</option>
                  <option value="critical">{pick(T.sevCritical)}</option>
                  <option value="fatal">{pick(T.sevFatal)}</option>
                </select>
              </div>
            </div>

            <SectionHeader title={pick(T.s2Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.fullName)}</label><input type="text" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.age)}</label><input type="number" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.nationality)}</label><input type="text" value={draft.nationality} onChange={(e) => setDraft({ ...draft, nationality: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.jobTitle)}</label><input type="text" value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.badgeNo)}</label><input type="text" value={draft.badgeNo} onChange={(e) => setDraft({ ...draft, badgeNo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.yrsExp)}</label><input type="number" value={draft.yrsExp} onChange={(e) => setDraft({ ...draft, yrsExp: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.injuryType)}</label><input type="text" value={draft.injuryType} onChange={(e) => setDraft({ ...draft, injuryType: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.bodyPart)}</label><input type="text" value={draft.bodyPart} onChange={(e) => setDraft({ ...draft, bodyPart: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.treatment)}</label><input type="text" value={draft.treatment} onChange={(e) => setDraft({ ...draft, treatment: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.daysLost)}</label><input type="number" value={draft.daysLost} onChange={(e) => setDraft({ ...draft, daysLost: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hospital)}</label><input type="text" value={draft.hospital} onChange={(e) => setDraft({ ...draft, hospital: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s3Title)} />
            <div>
              <label style={labelStyle}>{pick(T.investTeam)}</label>
              <textarea value={draft.investTeam} onChange={(e) => setDraft({ ...draft, investTeam: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.description)}</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...inputStyle, minHeight: 100 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.sequence)}</label>
              <textarea value={draft.sequence} onChange={(e) => setDraft({ ...draft, sequence: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.immediate)}</label><textarea value={draft.immediateCauses} onChange={(e) => setDraft({ ...draft, immediateCauses: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
              <div><label style={labelStyle}>{pick(T.underlying)}</label><textarea value={draft.underlyingCauses} onChange={(e) => setDraft({ ...draft, underlyingCauses: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.rootCause)}</label>
              <textarea value={draft.rootCauses} onChange={(e) => setDraft({ ...draft, rootCauses: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            <SectionHeader title={pick(T.s4Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.propDamage)}</label><input type="text" value={draft.propertyDamage} onChange={(e) => setDraft({ ...draft, propertyDamage: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.envImpact)}</label><input type="text" value={draft.environmentalImpact} onChange={(e) => setDraft({ ...draft, environmentalImpact: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.productivity)}</label><input type="text" value={draft.productivityImpact} onChange={(e) => setDraft({ ...draft, productivityImpact: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.totalCost)}</label><input type="number" value={draft.totalCost} onChange={(e) => setDraft({ ...draft, totalCost: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s5Title)} />
            <ActionTable
              title={pick(T.capaShort)} field="shortActions"
              rows={draft.shortActions} setAction={setAction} addAction={addAction} removeAction={removeAction}
              pick={pick} t={T} lang={lang}
            />
            <ActionTable
              title={pick(T.capaLong)} field="longActions"
              rows={draft.longActions} setAction={setAction} addAction={addAction} removeAction={removeAction}
              pick={pick} t={T} lang={lang}
            />

            <SectionHeader title={pick(T.s6Title)} />
            <div>
              <label style={labelStyle}>{pick(T.lessons)}</label>
              <textarea value={draft.lessons} onChange={(e) => setDraft({ ...draft, lessons: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.recommendations)}</label>
              <textarea value={draft.recommendations} onChange={(e) => setDraft({ ...draft, recommendations: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            <SectionHeader title={pick(T.s7Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hseManager)}</label><input type="text" value={draft.hseManager} onChange={(e) => setDraft({ ...draft, hseManager: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.siteManager)}</label><input type="text" value={draft.siteManager} onChange={(e) => setDraft({ ...draft, siteManager: e.target.value })} style={inputStyle} /></div>
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
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.name)}</th>
                  <th style={thStyle}>{pick(T.cols.severity)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const sevLabels = { minor: T.sevMinor, moderate: T.sevModerate, serious: T.sevSerious, critical: T.sevCritical, fatal: T.sevFatal };
                  const sevColors = { minor: "#dcfce7", moderate: "#fef9c3", serious: "#fed7aa", critical: "#fecaca", fatal: "#7f1d1d" };
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{it.fullName}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, background: sevColors[it.severity] || "#f1f5f9", color: it.severity === "fatal" ? "#fff" : "#1f0f00" }}>
                          {pick(sevLabels[it.severity] || { ar: it.severity, en: it.severity })}
                        </span>
                      </td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr><td colSpan="6" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noRecords)}</td></tr>
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

function ActionTable({ title, field, rows, setAction, addAction, removeAction, pick, t, lang }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: HSE_COLORS.primaryDark, marginBottom: 6 }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ ...tableStyle, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>{pick(t.actionDesc)}</th>
              <th style={thStyle}>{pick(t.responsible)}</th>
              <th style={thStyle}>{pick(t.deadline)}</th>
              <th style={thStyle}>{pick(t.status)}</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((r, i) => (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                <td style={tdStyle}>
                  <textarea rows="2" value={r.desc} onChange={(e) => setAction(field, i, "desc", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12, minHeight: 32 }} />
                </td>
                <td style={tdStyle}>
                  <input type="text" value={r.responsible} onChange={(e) => setAction(field, i, "responsible", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                </td>
                <td style={tdStyle}>
                  <input type="date" value={r.deadline} onChange={(e) => setAction(field, i, "deadline", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                </td>
                <td style={tdStyle}>
                  <select value={r.status} onChange={(e) => setAction(field, i, "status", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}>
                    <option value="open">{pick(t.stOpen)}</option>
                    <option value="progress">{pick(t.stProgress)}</option>
                    <option value="closed">{pick(t.stClosed)}</option>
                  </select>
                </td>
                <td style={tdStyle}>
                  {(rows || []).length > 1 && (
                    <button type="button" onClick={() => removeAction(field, i)} style={{ ...buttonGhost, padding: "3px 8px", fontSize: 11, color: "#b91c1c" }}>{pick(t.removeAction)}</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" onClick={() => addAction(field)} style={{ ...buttonGhost, marginTop: 6, fontSize: 12 }}>{pick(t.addAction)}</button>
    </div>
  );
}

function ViewModal({ viewing, setViewing, dir, lang, pick, t, printReport }) {
  const sevLabels = { minor: t.sevMinor, moderate: t.sevModerate, serious: t.sevSerious, critical: t.sevCritical, fatal: t.sevFatal };
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
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE</div>
          </div>
          <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
            <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(t.print)}</button>
            <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(t.closeModal)}</button>
          </div>
        </div>

        <ViewBlock title={pick(t.s1Title)} grid>
          <div style={{ fontSize: 13 }}><b>{pick(t.reportNo)}: </b>{viewing.reportNo}</div>
          <div style={{ fontSize: 13 }}><b>{pick(t.prelimRef)}: </b>{viewing.prelimRef || "—"}</div>
          <div style={{ fontSize: 13 }}><b>{pick(t.date)}: </b>{viewing.date} · {viewing.time}</div>
          <div style={{ fontSize: 13 }}><b>{pick(t.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
          <div style={{ fontSize: 13 }}><b>{pick(t.severity)}: </b>{pick(sevLabels[viewing.severity] || { ar: viewing.severity, en: viewing.severity })}</div>
          <div style={{ fontSize: 13 }}><b>{pick(t.classification)}: </b>{viewing.classification ? (t.classFields[viewing.classification] || { [lang]: viewing.classification })[lang] : "—"}</div>
        </ViewBlock>

        <ViewBlock title={pick(t.s2Title)} grid>
          {[
            ["fullName", t.fullName], ["age", t.age], ["nationality", t.nationality],
            ["jobTitle", t.jobTitle], ["badgeNo", t.badgeNo], ["yrsExp", t.yrsExp],
            ["injuryType", t.injuryType], ["bodyPart", t.bodyPart], ["treatment", t.treatment],
            ["daysLost", t.daysLost], ["hospital", t.hospital],
          ].map(([k, lbl]) => (
            <div key={k} style={{ fontSize: 13 }}><b>{pick(lbl)}: </b>{viewing[k] || "—"}</div>
          ))}
        </ViewBlock>

        {viewing.investTeam && <ViewBlock title={pick(t.investTeam)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.investTeam}</div></ViewBlock>}
        {viewing.description && <ViewBlock title={pick(t.description)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.description}</div></ViewBlock>}
        {viewing.sequence && <ViewBlock title={pick(t.sequence)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.sequence}</div></ViewBlock>}
        {(viewing.immediateCauses || viewing.underlyingCauses || viewing.rootCauses) && (
          <ViewBlock title={pick(t.s3Title)}>
            {viewing.immediateCauses && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(t.immediate)}: </b>{viewing.immediateCauses}</div>}
            {viewing.underlyingCauses && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(t.underlying)}: </b>{viewing.underlyingCauses}</div>}
            {viewing.rootCauses && <div style={{ fontSize: 13 }}><b>{pick(t.rootCause)}: </b>{viewing.rootCauses}</div>}
          </ViewBlock>
        )}

        {(viewing.propertyDamage || viewing.totalCost) && (
          <ViewBlock title={pick(t.s4Title)} grid>
            <div style={{ fontSize: 13 }}><b>{pick(t.propDamage)}: </b>{viewing.propertyDamage || "—"}</div>
            <div style={{ fontSize: 13 }}><b>{pick(t.envImpact)}: </b>{viewing.environmentalImpact || "—"}</div>
            <div style={{ fontSize: 13 }}><b>{pick(t.productivity)}: </b>{viewing.productivityImpact || "—"}</div>
            <div style={{ fontSize: 13 }}><b>{pick(t.totalCost)}: </b>{viewing.totalCost || "—"}</div>
          </ViewBlock>
        )}

        {[["shortActions", t.capaShort], ["longActions", t.capaLong]].map(([f, lbl]) => {
          const rows = viewing[f] || [];
          if (!rows.length || !rows.some((r) => r.desc)) return null;
          return (
            <ViewBlock key={f} title={pick(lbl)}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>{pick(t.actionDesc)}</th>
                      <th style={thStyle}>{pick(t.responsible)}</th>
                      <th style={thStyle}>{pick(t.deadline)}</th>
                      <th style={thStyle}>{pick(t.status)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                        <td style={tdStyle}>{r.desc || "—"}</td>
                        <td style={tdStyle}>{r.responsible || "—"}</td>
                        <td style={tdStyle}>{r.deadline || "—"}</td>
                        <td style={tdStyle}>{r.status === "open" ? pick(t.stOpen) : r.status === "progress" ? pick(t.stProgress) : pick(t.stClosed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ViewBlock>
          );
        })}

        {viewing.lessons && <ViewBlock title={pick(t.lessons)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.lessons}</div></ViewBlock>}
        {viewing.recommendations && <ViewBlock title={pick(t.recommendations)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.recommendations}</div></ViewBlock>}

        <div style={{
          marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
        }}>
          {[["preparedBy", t.preparedBy], ["hseManager", t.hseManager], ["siteManager", t.siteManager]].map(([k, lbl]) => (
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

function ViewBlock({ title, children, grid }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{title}</div>
      {grid ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 }}>{children}</div> : children}
    </div>
  );
}
