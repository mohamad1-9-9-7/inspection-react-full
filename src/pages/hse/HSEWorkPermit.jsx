// src/pages/hse/HSEWorkPermit.jsx
// F-07: تصاريح العمل — bilingual

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, updateLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

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
  approved:    { ar: "اعتمد التصريح (HSE Manager)", en: "Approved by (HSE Manager)" },
  saveBtn:     { ar: "💾 إصدار التصريح", en: "💾 Issue Permit" },
  cancel:      { ar: "إلغاء", en: "Cancel" },
  needDesc:    { ar: "اكتب وصف العمل", en: "Enter work description" },
  needWorker:  { ar: "أدخل اسم العامل", en: "Enter worker name" },
  saved:       { ar: "✅ تم إصدار التصريح", en: "✅ Permit issued" },
  closer:      { ar: "اسم من يُغلق التصريح:", en: "Name of person closing the permit:" },
  confirmDel:  { ar: "حذف؟", en: "Delete?" },
  close:       { ar: "إغلاق", en: "Close" },
  del:         { ar: "حذف", en: "Delete" },
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
  { v: "hot_work",       ar: "🔥 أعمال ساخنة (Hot Work) — لحام، قطع، طحن", en: "🔥 Hot Work — Welding, cutting, grinding", color: "#7f1d1d", bg: "#fee2e2" },
  { v: "confined_space", ar: "🕳️ أماكن مغلقة (Confined Space) — خزانات، غرف ضيقة", en: "🕳️ Confined Space — Tanks, tight rooms", color: "#9a3412", bg: "#fed7aa" },
  { v: "height",         ar: "🪜 العمل على ارتفاع (Working at Height)",       en: "🪜 Working at Height", color: "#854d0e", bg: "#fef9c3" },
  { v: "electrical",     ar: "⚡ أعمال كهربائية (Electrical Work) — LOTO",     en: "⚡ Electrical Work — LOTO", color: "#5b21b6", bg: "#e9d5ff" },
  { v: "excavation",     ar: "⛏️ حفريات (Excavation)",                          en: "⛏️ Excavation", color: "#374151", bg: "#e5e7eb" },
  { v: "lifting",        ar: "🏗️ رفع ثقيل بالكرين (Lifting Operations)",       en: "🏗️ Crane Lifting Operations", color: "#1e40af", bg: "#dbeafe" },
  { v: "chemical",       ar: "🧪 تداول كيماويات / غازات تبريد",                 en: "🧪 Chemical / Refrigerant Handling", color: "#166534", bg: "#dcfce7" },
];

const SAFETY_CHECKS = {
  hot_work: [
    { ar: "إيقاف نظام رش الحريق المؤقت", en: "Sprinkler system temporarily isolated" },
    { ar: "تنظيف المنطقة من المواد القابلة للاشتعال (3 أمتار)", en: "Area cleared of combustibles (3 m radius)" },
    { ar: "وجود طفاية حريق", en: "Fire extinguisher present" },
    { ar: "مراقب حريق (Fire Watch) موجود", en: "Fire watch in place" },
    { ar: "غطاء واقي للأرض", en: "Floor protective cover" },
  ],
  confined_space: [
    { ar: "قياس الأكسجين والغازات السامة قبل الدخول", en: "Oxygen and toxic gas measurement before entry" },
    { ar: "نظام تهوية نشط", en: "Active ventilation system" },
    { ar: "مراقب خارجي (Watchman)", en: "Outside watchman" },
    { ar: "حبل أمان وحزام", en: "Safety line and harness" },
    { ar: "خطة إنقاذ جاهزة", en: "Rescue plan ready" },
  ],
  height: [
    { ar: "استخدام حزام السلامة (Full Body Harness)", en: "Full-body harness used" },
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
  status: "active", closedDate: "", closedBy: "", closedNotes: "",
});

export default function HSEWorkPermit() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);

  function setCheck(key, val) {
    setDraft((d) => ({ ...d, safetyChecks: { ...d.safetyChecks, [key]: val } }));
  }
  function save() {
    if (!draft.workDescription.trim()) { alert(pick(T.needDesc)); return; }
    if (!draft.workerName.trim()) { alert(pick(T.needWorker)); return; }
    appendLocal(TYPE, draft);
    setItems(loadLocal(TYPE));
    alert(pick(T.saved));
    setDraft(blank()); setTab("list");
  }
  function closePermit(id) {
    const closer = prompt(pick(T.closer));
    if (!closer) return;
    updateLocal(TYPE, id, { status: "closed", closedDate: todayISO(), closedBy: closer });
    setItems(loadLocal(TYPE));
  }
  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    deleteLocal(TYPE, id);
    setItems(loadLocal(TYPE));
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newPermit)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.permitNo)}</label><input type="text" value={draft.permitNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div>
                <label style={labelStyle}>{pick(T.type)}</label>
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value, safetyChecks: {} })} style={inputStyle}>
                  {PERMIT_TYPES.map((t) => <option key={t.v} value={t.v}>{t[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.startTime)}</label><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.endTime)}</label><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.workDesc)}</label>
              <textarea value={draft.workDescription} onChange={(e) => setDraft({ ...draft, workDescription: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#fff7ed", borderRadius: 10 }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark }}>{pick(T.workerSec)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <div><label style={labelStyle}>{pick(T.name)}</label><input type="text" value={draft.workerName} onChange={(e) => setDraft({ ...draft, workerName: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.company)}</label><input type="text" value={draft.workerCompany} onChange={(e) => setDraft({ ...draft, workerCompany: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.count)}</label><input type="number" value={draft.workerCount} onChange={(e) => setDraft({ ...draft, workerCount: Number(e.target.value) || 1 })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.supervisor)}</label><input type="text" value={draft.supervisor} onChange={(e) => setDraft({ ...draft, supervisor: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>{pick(T.supPhone)}</label><input type="tel" value={draft.supervisorContact} onChange={(e) => setDraft({ ...draft, supervisorContact: e.target.value })} style={inputStyle} /></div>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: 12, background: "#fee2e2", borderRadius: 10, border: "1px solid #fca5a5" }}>
              <div style={{ fontWeight: 950, marginBottom: 10, color: "#7f1d1d" }}>{pick(T.safetySec)} ({checks.length})</div>
              {checks.map((chk, i) => {
                const k = `chk-${i}`;
                return (
                  <label key={k} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8, marginBottom: 4,
                    background: draft.safetyChecks[k] ? "#dcfce7" : "#fff",
                    cursor: "pointer", border: `1px solid ${draft.safetyChecks[k] ? "#166534" : "rgba(120,53,15,0.18)"}`,
                  }}>
                    <input type="checkbox" checked={draft.safetyChecks[k] || false} onChange={(e) => setCheck(k, e.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{pick(chk)}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.ppeReq)}</label>
              <input type="text" value={draft.ppeRequired} onChange={(e) => setDraft({ ...draft, ppeRequired: e.target.value })} placeholder={pick(T.ppePh)} style={inputStyle} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.hazards)}</label>
              <textarea value={draft.hazardsIdentified} onChange={(e) => setDraft({ ...draft, hazardsIdentified: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.emergency)}</label>
              <textarea value={draft.emergencyPlan} onChange={(e) => setDraft({ ...draft, emergencyPlan: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.issued)}</label><input type="text" value={draft.issuedBy} onChange={(e) => setDraft({ ...draft, issuedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.approved)}</label><input type="text" value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} /></div>
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
                        {it.status === "active" && (
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => closePermit(it.id)}>{pick(T.close)}</button>
                        )}
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c", marginInlineStart: 4 }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
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
