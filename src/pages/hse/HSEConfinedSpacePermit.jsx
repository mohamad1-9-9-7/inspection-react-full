// src/pages/hse/HSEConfinedSpacePermit.jsx
// F-07a: تصريح دخول الأماكن المغلقة — Confined Space Entry Permit (SBG-HSE-032)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, updateLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "confined_space_permits";

const T = {
  title:        { ar: "🕳️ تصريح الأماكن المغلقة (F-07a) — Confined Space Entry", en: "🕳️ Confined Space Entry Permit (F-07a)" },
  subtitle:     { ar: "تصريح دخول للأماكن المضيقة (خزانات، غرف معدات، أنابيب) — مع قياس غازات",
                  en: "Entry permit for confined spaces (tanks, plant rooms, ducts) — with gas monitoring" },
  active:       { ar: "نشطة الآن:", en: "Active now:" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newPermit:    { ar: "+ تصريح جديد", en: "+ New Permit" },
  permitNo:     { ar: "رقم التصريح", en: "Permit No." },
  date:         { ar: "التاريخ", en: "Date" },

  // Section 1
  s1Title:      { ar: "🧾 القسم 1 — جهة العمل (Performing Authority)", en: "🧾 Section 1 — Performing Authority" },
  initiator:    { ar: "اسم مُصدر التصريح", en: "Initiator's Name" },
  supervisor:   { ar: "اسم المشرف", en: "Supervisor's Name" },
  workDesc:     { ar: "وصف العمل", en: "Work Description" },
  department:   { ar: "القسم / الإدارة", en: "Department" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  equipment:    { ar: "رقم/وصف المعدّة", en: "Equipment No. & Description" },
  workforce:    { ar: "عدد العمال", en: "No. of Workforce" },
  duration:     { ar: "مدة العمل", en: "Task Duration" },
  validFrom:    { ar: "صالح من", en: "Valid From" },
  validTo:      { ar: "صالح إلى", en: "Valid To" },

  // Section 2
  s2Title:      { ar: "🛡️ القسم 2 — متطلبات السلامة", en: "🛡️ Section 2 — Safety Requirements" },
  s2Hint:       { ar: "علّم على البنود المُطبَّقة (يجب اكتمال البنود الجوهرية)",
                  en: "Tick all applicable items (essential items must be checked)" },

  // Section 3
  s3Title:      { ar: "💨 القسم 3 — جدول قياس الغازات", en: "💨 Section 3 — Gas Monitoring Table" },
  s3Hint:       { ar: "قياسات إلزامية قبل الدخول وكل ساعتين أثناء العمل",
                  en: "Mandatory readings before entry and every 2 hours during work" },
  gasName:      { ar: "الغاز", en: "Gas" },
  gasLimit:     { ar: "الحد المسموح", en: "Permissible Limit" },
  reading:      { ar: "القراءة", en: "Reading" },
  readTime:     { ar: "الوقت", en: "Time" },
  readValue:    { ar: "القيمة", en: "Value" },

  // Section 4
  s4Title:      { ar: "👷 القسم 4 — العمال المُصرَّح لهم", en: "👷 Section 4 — Authorized Workers" },
  workerName:   { ar: "الاسم", en: "Name" },
  badgeNo:      { ar: "رقم الشارة", en: "Badge No." },
  entryTime:    { ar: "وقت الدخول", en: "Entry Time" },
  exitTime:     { ar: "وقت الخروج", en: "Exit Time" },
  addWorker:    { ar: "+ إضافة عامل", en: "+ Add Worker" },
  removeWorker: { ar: "حذف", en: "Remove" },

  // Section 5
  s5Title:      { ar: "💬 ملاحظات إضافية", en: "💬 Additional Precautions" },
  additional:   { ar: "احتياطات إضافية / ملاحظات", en: "Additional safety precautions / notes" },

  // Section 6
  s6Title:      { ar: "✍️ القسم 6 — الاعتماد والتوقيعات", en: "✍️ Section 6 — Approvals & Signatures" },
  issuedBy:     { ar: "أصدر التصريح", en: "Issued By" },
  approvedBy:   { ar: "اعتمد التصريح (مهندس/مشرف السلامة)", en: "Approved By (Safety Engineer/Supervisor)" },
  rescuePlan:   { ar: "خطة الإنقاذ موضوعة وموثَّقة", en: "Rescue plan in place and documented" },

  saveBtn:      { ar: "💾 إصدار التصريح", en: "💾 Issue Permit" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needDesc:     { ar: "اكتب وصف العمل", en: "Enter work description" },
  needInitiator:{ ar: "أدخل اسم مُصدر التصريح", en: "Enter initiator name" },
  saved:        { ar: "✅ تم إصدار التصريح", en: "✅ Permit issued" },
  closer:       { ar: "اسم من يُغلق التصريح:", en: "Name of person closing the permit:" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  closeBtn:     { ar: "إغلاق", en: "Close" },
  del:          { ar: "حذف", en: "Delete" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد تصاريح", en: "No permits" },
  cols: {
    no:       { ar: "الرقم", en: "No." },
    date:     { ar: "التاريخ", en: "Date" },
    location: { ar: "الموقع", en: "Location" },
    initiator:{ ar: "مُصدر التصريح", en: "Initiator" },
    workers:  { ar: "العمال", en: "Workers" },
    status:   { ar: "الحالة", en: "Status" },
    actions:  { ar: "إجراءات", en: "Actions" },
  },
  stActive:     { ar: "🟢 نشط", en: "🟢 Active" },
  stClosed:     { ar: "⚫ مغلق", en: "⚫ Closed" },
  signSafety:   { ar: "توقيع مهندس السلامة", en: "Safety Engineer Signature" },
  signIssuer:   { ar: "توقيع مُصدر التصريح", en: "Issuer Signature" },
  formFooter:   { ar: "Form F-07a · Confined Space Entry Permit · AL MAWASHI HSE Department",
                  en: "Form F-07a · Confined Space Entry Permit · AL MAWASHI HSE Department" },
};

const SAFETY_REQUIREMENTS = [
  { v: "ppe",        ar: "معدات الوقاية الشخصية (PPE) كاملة",          en: "Full Personal Protective Equipment (PPE)" },
  { v: "rescue",     ar: "معدات الإنقاذ في حالات الطوارئ",                en: "Emergency Rescue Equipment" },
  { v: "harness",    ar: "حزام الأمان الكامل (Full Body Harness)",        en: "Full Body Harness" },
  { v: "watchman",   ar: "مراقب خارجي (Stand-By Watchman)",                en: "Stand-By Watchman outside" },
  { v: "loto",       ar: "مصادر الطاقة مفصولة ومُقفلة (LOTO)",            en: "All energy sources isolated & locked (LOTO)" },
  { v: "tools",      ar: "أدوات غير مولِّدة للشرر / أدوات خاصة",          en: "Non-Sparking / Special Tools" },
  { v: "access",     ar: "وسائل دخول وخروج آمنة",                          en: "Safe Means of Access & Egress" },
  { v: "vent",       ar: "تهوية ميكانيكية مستمرة",                          en: "Continuous Mechanical Ventilation" },
  { v: "lighting",   ar: "إضاءة كافية (مقاومة للانفجار حسب اللزوم)",       en: "Adequate Lighting (Explosion-proof if required)" },
  { v: "gasmon",     ar: "كاشف غازات مُعايَر ويعمل",                        en: "Calibrated, Operating Gas Monitor" },
  { v: "barricade",  ar: "حواجز ولافتات تحذير حول مدخل الفتحة",            en: "Barricade & Warning Signs around Entry" },
  { v: "comm",       ar: "وسيلة اتصال مع المراقب الخارجي",                 en: "Communication with Outside Watchman" },
  { v: "rescuePlan", ar: "خطة إنقاذ مكتوبة ومُتدرَّب عليها",                en: "Documented & Practiced Rescue Plan" },
];

const GAS_LIMITS = [
  { v: "o2",   ar: "الأكسجين (O₂)",                en: "Oxygen (O₂)",                limit: "19.5% – 23.5%", unit: "%" },
  { v: "h2s",  ar: "كبريتيد الهيدروجين (H₂S)",     en: "Hydrogen Sulfide (H₂S)",     limit: "Max 10 ppm",   unit: "ppm" },
  { v: "lel",  ar: "الغازات القابلة للاشتعال",      en: "Flammable Gases (LEL)",      limit: "Max 10% LEL",  unit: "% LEL" },
  { v: "co",   ar: "أول أكسيد الكربون (CO)",        en: "Carbon Monoxide (CO)",       limit: "Max 35 ppm",   unit: "ppm" },
  { v: "nh3",  ar: "الأمونيا (NH₃) — لمستودعات التبريد", en: "Ammonia (NH₃) — for cold-store rooms", limit: "Max 25 ppm", unit: "ppm" },
];

const blank = () => ({
  permitNo: `CSP-${Date.now().toString().slice(-6)}`,
  date: todayISO(), validFrom: `${todayISO()}T${nowHHMM()}`, validTo: "",
  location: SITE_LOCATIONS[0].v, area: "",
  initiator: "", supervisor: "", workDescription: "",
  department: "", equipment: "", workforce: 1, duration: "",
  safetyChecks: {}, additionalPrecautions: "",
  // gas readings: { o2: [{time,value}, ...], h2s: [...], ... }
  gasReadings: {},
  workers: [{ name: "", badge: "", entry: "", exit: "" }],
  issuedBy: "", approvedBy: "",
  status: "active", closedDate: "", closedBy: "",
});

export default function HSEConfinedSpacePermit() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function setCheck(key, val) {
    setDraft((d) => ({ ...d, safetyChecks: { ...d.safetyChecks, [key]: val } }));
  }
  function setGasReading(gasV, idx, field, val) {
    setDraft((d) => {
      const cur = { ...(d.gasReadings || {}) };
      const arr = [...(cur[gasV] || [{ time: "", value: "" }, { time: "", value: "" }, { time: "", value: "" }])];
      arr[idx] = { ...(arr[idx] || {}), [field]: val };
      cur[gasV] = arr;
      return { ...d, gasReadings: cur };
    });
  }
  function setWorker(idx, field, val) {
    setDraft((d) => {
      const arr = [...(d.workers || [])];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...d, workers: arr };
    });
  }
  function addWorker() {
    setDraft((d) => ({ ...d, workers: [...(d.workers || []), { name: "", badge: "", entry: "", exit: "" }] }));
  }
  function removeWorker(idx) {
    setDraft((d) => ({ ...d, workers: d.workers.filter((_, i) => i !== idx) }));
  }

  function save() {
    if (!draft.initiator.trim()) { alert(pick(T.needInitiator)); return; }
    if (!draft.workDescription.trim()) { alert(pick(T.needDesc)); return; }
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
            {/* Section 1 — Performing Authority */}
            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.permitNo)}</label><input type="text" value={draft.permitNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.validFrom)}</label><input type="datetime-local" value={draft.validFrom} onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.validTo)}</label><input type="datetime-local" value={draft.validTo} onChange={(e) => setDraft({ ...draft, validTo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.initiator)}</label><input type="text" value={draft.initiator} onChange={(e) => setDraft({ ...draft, initiator: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.supervisor)}</label><input type="text" value={draft.supervisor} onChange={(e) => setDraft({ ...draft, supervisor: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.department)}</label><input type="text" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.equipment)}</label><input type="text" value={draft.equipment} onChange={(e) => setDraft({ ...draft, equipment: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.workforce)}</label><input type="number" value={draft.workforce} onChange={(e) => setDraft({ ...draft, workforce: Number(e.target.value) || 1 })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.duration)}</label><input type="text" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} placeholder={lang === "ar" ? "مثلاً: 4 ساعات" : "e.g., 4 hours"} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.workDesc)}</label>
              <textarea value={draft.workDescription} onChange={(e) => setDraft({ ...draft, workDescription: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            {/* Section 2 — Safety Requirements */}
            <SectionHeader title={pick(T.s2Title)} note={pick(T.s2Hint)} />
            <div style={{ padding: 12, background: "#fee2e2", borderRadius: 10, border: "1px solid #fca5a5" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
                {SAFETY_REQUIREMENTS.map((req) => (
                  <label key={req.v} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 8,
                    background: draft.safetyChecks[req.v] ? "#dcfce7" : "#fff",
                    cursor: "pointer", border: `1px solid ${draft.safetyChecks[req.v] ? "#166534" : "rgba(120,53,15,0.18)"}`,
                  }}>
                    <input type="checkbox" checked={!!draft.safetyChecks[req.v]} onChange={(e) => setCheck(req.v, e.target.checked)} />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{req[lang]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.additional)}</label>
              <textarea value={draft.additionalPrecautions} onChange={(e) => setDraft({ ...draft, additionalPrecautions: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            {/* Section 3 — Gas Monitoring */}
            <SectionHeader title={pick(T.s3Title)} note={pick(T.s3Hint)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.gasName)}</th>
                    <th style={thStyle}>{pick(T.gasLimit)}</th>
                    {[1, 2, 3].map((n) => (
                      <th key={n} style={thStyle} colSpan="2">{pick(T.reading)} {n}</th>
                    ))}
                  </tr>
                  <tr>
                    <th style={thStyle}></th>
                    <th style={thStyle}></th>
                    {[0, 1, 2].map((i) => (
                      <React.Fragment key={i}>
                        <th style={{ ...thStyle, fontSize: 11 }}>{pick(T.readTime)}</th>
                        <th style={{ ...thStyle, fontSize: 11 }}>{pick(T.readValue)}</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {GAS_LIMITS.map((g) => (
                    <tr key={g.v}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{g[lang]}</td>
                      <td style={{ ...tdStyle, color: "#b91c1c", fontWeight: 700, fontSize: 12 }}>{g.limit}</td>
                      {[0, 1, 2].map((idx) => (
                        <React.Fragment key={idx}>
                          <td style={tdStyle}>
                            <input
                              type="time"
                              value={(draft.gasReadings[g.v]?.[idx]?.time) || ""}
                              onChange={(e) => setGasReading(g.v, idx, "time", e.target.value)}
                              style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, minWidth: 90 }}
                            />
                          </td>
                          <td style={tdStyle}>
                            <input
                              type="text"
                              value={(draft.gasReadings[g.v]?.[idx]?.value) || ""}
                              onChange={(e) => setGasReading(g.v, idx, "value", e.target.value)}
                              placeholder={g.unit}
                              style={{ ...inputStyle, padding: "4px 6px", fontSize: 12, minWidth: 70 }}
                            />
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Section 4 — Workers */}
            <SectionHeader title={pick(T.s4Title)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>{pick(T.workerName)}</th>
                    <th style={thStyle}>{pick(T.badgeNo)}</th>
                    <th style={thStyle}>{pick(T.entryTime)}</th>
                    <th style={thStyle}>{pick(T.exitTime)}</th>
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.workers || []).map((w, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                      <td style={tdStyle}>
                        <input type="text" value={w.name || ""} onChange={(e) => setWorker(i, "name", e.target.value)}
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                      </td>
                      <td style={tdStyle}>
                        <input type="text" value={w.badge || ""} onChange={(e) => setWorker(i, "badge", e.target.value)}
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                      </td>
                      <td style={tdStyle}>
                        <input type="time" value={w.entry || ""} onChange={(e) => setWorker(i, "entry", e.target.value)}
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                      </td>
                      <td style={tdStyle}>
                        <input type="time" value={w.exit || ""} onChange={(e) => setWorker(i, "exit", e.target.value)}
                          style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                      </td>
                      <td style={tdStyle}>
                        {(draft.workers || []).length > 1 && (
                          <button type="button" onClick={() => removeWorker(i)}
                            style={{ ...buttonGhost, padding: "3px 8px", fontSize: 11, color: "#b91c1c" }}>
                            {pick(T.removeWorker)}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addWorker} style={{ ...buttonGhost, marginTop: 8, fontSize: 12 }}>
              {pick(T.addWorker)}
            </button>

            {/* Section 6 — Approvals */}
            <SectionHeader title={pick(T.s6Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.issuedBy)}</label><input type="text" value={draft.issuedBy} onChange={(e) => setDraft({ ...draft, issuedBy: e.target.value })} style={inputStyle} /></div>
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
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.initiator)}</th>
                  <th style={thStyle}>{pick(T.cols.workers)}</th>
                  <th style={thStyle}>{pick(T.cols.status)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.permitNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}<br /><small>{it.area}</small></td>
                      <td style={tdStyle}>{it.initiator}</td>
                      <td style={tdStyle}>{(it.workers || []).length}</td>
                      <td style={tdStyle}>
                        {it.status === "active" && pick(T.stActive)}
                        {it.status === "closed" && pick(T.stClosed)}
                      </td>
                      <td style={tdStyle}>
                        <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                        {it.status === "active" && (
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineEnd: 4 }} onClick={() => closePermit(it.id)}>{pick(T.closeBtn)}</button>
                        )}
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
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE · Trans Emirates Livestock Trading L.L.C.</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.closeModal)}</button>
                </div>
              </div>

              <ViewBlock title={pick(T.s1Title)}>
                <KV label={pick(T.permitNo)} value={viewing.permitNo} />
                <KV label={pick(T.date)} value={viewing.date} />
                <KV label={pick(T.validFrom)} value={viewing.validFrom} />
                <KV label={pick(T.validTo)} value={viewing.validTo} />
                <KV label={pick(T.initiator)} value={viewing.initiator} />
                <KV label={pick(T.supervisor)} value={viewing.supervisor} />
                <KV label={pick(T.department)} value={viewing.department} />
                <KV label={pick(T.location)} value={(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]} />
                <KV label={pick(T.area)} value={viewing.area} />
                <KV label={pick(T.equipment)} value={viewing.equipment} />
                <KV label={pick(T.workforce)} value={viewing.workforce} />
                <KV label={pick(T.duration)} value={viewing.duration} />
              </ViewBlock>
              {viewing.workDescription && (
                <ViewBlock title={pick(T.workDesc)} oneCol>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.workDescription}</div>
                </ViewBlock>
              )}

              <ViewBlock title={pick(T.s2Title)}>
                {SAFETY_REQUIREMENTS.map((req) => {
                  const checked = viewing.safetyChecks?.[req.v];
                  return (
                    <div key={req.v} style={{ fontSize: 13 }}>
                      <span style={{ color: checked ? "#166534" : "#b91c1c", fontWeight: 800, marginInlineEnd: 6 }}>
                        {checked ? "✓" : "✗"}
                      </span>
                      {req[lang]}
                    </div>
                  );
                })}
              </ViewBlock>

              <ViewBlock title={pick(T.s3Title)} oneCol>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ ...tableStyle, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{pick(T.gasName)}</th>
                        <th style={thStyle}>{pick(T.gasLimit)}</th>
                        {[1, 2, 3].map((n) => <th key={n} style={thStyle}>{pick(T.reading)} {n}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {GAS_LIMITS.map((g) => (
                        <tr key={g.v}>
                          <td style={{ ...tdStyle, fontWeight: 800 }}>{g[lang]}</td>
                          <td style={{ ...tdStyle, color: "#b91c1c" }}>{g.limit}</td>
                          {[0, 1, 2].map((idx) => {
                            const r = viewing.gasReadings?.[g.v]?.[idx];
                            return (
                              <td key={idx} style={tdStyle}>
                                {r?.time || "—"} <span style={{ color: "#64748b" }}>·</span> <b>{r?.value || "—"}</b>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ViewBlock>

              <ViewBlock title={pick(T.s4Title)} oneCol>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ ...tableStyle, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>#</th>
                        <th style={thStyle}>{pick(T.workerName)}</th>
                        <th style={thStyle}>{pick(T.badgeNo)}</th>
                        <th style={thStyle}>{pick(T.entryTime)}</th>
                        <th style={thStyle}>{pick(T.exitTime)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewing.workers || []).map((w, i) => (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                          <td style={tdStyle}>{w.name || "—"}</td>
                          <td style={tdStyle}>{w.badge || "—"}</td>
                          <td style={tdStyle}>{w.entry || "—"}</td>
                          <td style={tdStyle}>{w.exit || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ViewBlock>

              {viewing.additionalPrecautions && (
                <ViewBlock title={pick(T.additional)} oneCol>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.additionalPrecautions}</div>
                </ViewBlock>
              )}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signIssuer)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.issuedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.signSafety)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.approvedBy || "_______________"}</div>
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

function SectionHeader({ title, note }) {
  return (
    <div style={{ marginTop: 18, marginBottom: 10 }}>
      <div style={{
        fontSize: 14, fontWeight: 950, color: HSE_COLORS.primaryDark,
        padding: "8px 12px", borderRadius: 10,
        background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
      }}>{title}</div>
      {note && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, paddingInlineStart: 4 }}>{note}</div>}
    </div>
  );
}

function ViewBlock({ title, children, oneCol }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{title}</div>
      <div style={{
        display: oneCol ? "block" : "grid",
        gridTemplateColumns: oneCol ? "auto" : "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 8,
      }}>
        {children}
      </div>
    </div>
  );
}

function KV({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ fontSize: 13 }}>
      <b>{label}: </b>{value}
    </div>
  );
}
