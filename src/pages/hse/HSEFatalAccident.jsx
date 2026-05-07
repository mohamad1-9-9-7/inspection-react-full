// src/pages/hse/HSEFatalAccident.jsx
// F-24: تقرير الحادث المميت — Fatal Accident Report (SBG-HSE-005) · MOHRE Reportable

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "fatal_accident_reports";

const T = {
  title:        { ar: "💀 تقرير حادث مميت (F-24) — Fatal Accident Report", en: "💀 Fatal Accident Report (F-24)" },
  subtitle:     { ar: "تقرير الحوادث المميتة (مطابق SBG-HSE-005) — إبلاغ MOHRE خلال 24 ساعة إلزامي",
                  en: "Fatal accidents (per SBG-HSE-005) — MOHRE reporting within 24 hours mandatory" },
  notice:       { ar: "🚨 إبلاغ فوري لـ MOHRE / الدفاع المدني / النيابة العامة + إخطار الأسرة",
                  en: "🚨 Immediate notification to MOHRE / Civil Defence / Public Prosecution + Family" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ تقرير جديد", en: "+ New Report" },
  reportNo:     { ar: "رقم التقرير", en: "Report No." },

  // Section 1 — Deceased
  s1Title:      { ar: "🪦 بيانات المتوفى", en: "🪦 Deceased Information" },
  fullName:     { ar: "الاسم الكامل", en: "Full Name" },
  age:          { ar: "العمر", en: "Age" },
  gender:       { ar: "الجنس", en: "Gender" },
  male:         { ar: "ذكر", en: "Male" },
  female:       { ar: "أنثى", en: "Female" },
  nationality:  { ar: "الجنسية", en: "Nationality" },
  iqama:        { ar: "رقم الإقامة / الهوية", en: "Iqama / ID No." },
  badgeNo:      { ar: "رقم الشارة", en: "Badge No." },
  jobTitle:     { ar: "المسمى الوظيفي", en: "Job Title" },
  yrsExp:       { ar: "سنوات الخبرة", en: "Years of Experience" },
  hireDate:     { ar: "تاريخ التعيين", en: "Hire Date" },
  emergencyCT:  { ar: "اتصال الطوارئ (الأسرة)", en: "Emergency Contact (Family)" },

  // Section 2 — Incident
  s2Title:      { ar: "🕐 تفاصيل الحادث", en: "🕐 Incident Details" },
  date:         { ar: "تاريخ الحادث", en: "Date of Incident" },
  time:         { ar: "وقت الحادث", en: "Time of Incident" },
  deathDate:    { ar: "تاريخ الوفاة", en: "Date of Death" },
  deathTime:    { ar: "وقت الوفاة", en: "Time of Death" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  cause:        { ar: "سبب الوفاة المُحدَّد طبياً", en: "Medical Cause of Death" },
  description:  { ar: "وصف تفصيلي للحادث (تسلسل زمني)", en: "Detailed Description (Chronological)" },
  witnesses:    { ar: "الشهود (الأسماء/الوظائف/البيانات)", en: "Witnesses (Names/Jobs/Contacts)" },

  // Section 3 — Investigation
  s3Title:      { ar: "🔍 التحقيق والأسباب", en: "🔍 Investigation & Causes" },
  rootCauses:   { ar: "الأسباب الجذرية", en: "Root Causes" },
  unsafeActs:   { ar: "أفعال غير آمنة (Unsafe Acts)", en: "Unsafe Acts" },
  unsafeCond:   { ar: "ظروف غير آمنة (Unsafe Conditions)", en: "Unsafe Conditions" },
  capa:         { ar: "الإجراءات التصحيحية والوقائية", en: "Corrective & Preventive Actions" },
  capaResp:     { ar: "المسؤول عن التنفيذ", en: "Responsible Party" },
  capaDeadline: { ar: "الموعد النهائي", en: "Deadline" },

  // Section 4 — Reporting
  s4Title:      { ar: "📞 الإبلاغ للجهات الرسمية", en: "📞 Reporting to Authorities" },
  notMOHRE:     { ar: "إبلاغ MOHRE", en: "MOHRE Notified" },
  notCD:        { ar: "إبلاغ الدفاع المدني", en: "Civil Defence Notified" },
  notProsec:    { ar: "إبلاغ النيابة العامة", en: "Public Prosecution Notified" },
  notMun:       { ar: "إبلاغ بلدية دبي", en: "Dubai Municipality Notified" },
  notFamily:    { ar: "إبلاغ الأسرة", en: "Family Notified" },
  notInsurance: { ar: "إبلاغ شركة التأمين", en: "Insurance Notified" },
  notEmbassy:   { ar: "إبلاغ السفارة (إن لزم)", en: "Embassy Notified (if applicable)" },
  notDate:      { ar: "تاريخ الإبلاغ", en: "Notification Date" },
  refNo:        { ar: "رقم المرجع", en: "Reference No." },
  contactPer:   { ar: "الشخص المسؤول", en: "Contact Person" },

  // Section 5 — Approvals
  s5Title:      { ar: "✍️ التوقيعات والاعتماد", en: "✍️ Signatures & Approvals" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },
  hseManager:   { ar: "مدير HSE", en: "HSE Manager" },
  siteManager:  { ar: "مدير الموقع", en: "Site Manager" },
  generalMgr:   { ar: "المدير العام", en: "General Manager" },

  saveBtn:      { ar: "💾 حفظ التقرير", en: "💾 Save Report" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needName:     { ar: "أدخل اسم المتوفى", en: "Enter deceased name" },
  saved:        { ar: "✅ تم حفظ التقرير", en: "✅ Report saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد تقارير", en: "No reports" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "تاريخ الحادث", en: "Date" },
    name:      { ar: "المتوفى", en: "Deceased" },
    location:  { ar: "الموقع", en: "Location" },
    mohre:     { ar: "MOHRE", en: "MOHRE" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  yes:          { ar: "نعم", en: "Yes" },
  no:           { ar: "لا", en: "No" },
  pending:      { ar: "قيد الإبلاغ", en: "Pending" },
  formFooter:   { ar: "Form F-24 · Fatal Accident Report · CONFIDENTIAL · AL MAWASHI HSE",
                  en: "Form F-24 · Fatal Accident Report · CONFIDENTIAL · AL MAWASHI HSE" },
};

const NOTIF_FIELDS = [
  { v: "mohre",     key: "notMOHRE" },
  { v: "cd",        key: "notCD" },
  { v: "prosec",    key: "notProsec" },
  { v: "mun",       key: "notMun" },
  { v: "family",    key: "notFamily" },
  { v: "insurance", key: "notInsurance" },
  { v: "embassy",   key: "notEmbassy" },
];

const blank = () => ({
  reportNo: `FAT-${Date.now().toString().slice(-6)}`,
  // Deceased
  fullName: "", age: "", gender: "male", nationality: "", iqama: "",
  badgeNo: "", jobTitle: "", yrsExp: "", hireDate: "", emergencyContact: "",
  // Incident
  date: todayISO(), time: nowHHMM(),
  deathDate: todayISO(), deathTime: nowHHMM(),
  location: SITE_LOCATIONS[0].v, area: "",
  medicalCause: "", description: "", witnesses: "",
  // Investigation
  rootCauses: "", unsafeActs: "", unsafeConditions: "",
  capa: "", capaResponsible: "", capaDeadline: "",
  // Notifications
  notifications: Object.fromEntries(NOTIF_FIELDS.map((n) => [n.v, { status: "pending", date: "", refNo: "", contact: "" }])),
  // Signatures
  preparedBy: "", hseManager: "", siteManager: "", generalManager: "",
});

export default function HSEFatalAccident() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

  function setNotif(key, field, val) {
    setDraft((d) => ({
      ...d,
      notifications: { ...d.notifications, [key]: { ...d.notifications[key], [field]: val } },
    }));
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
            <div style={{ padding: 12, background: "#fee2e2", border: "2px solid #b91c1c", borderRadius: 10, fontSize: 13, fontWeight: 800, color: "#7f1d1d", marginBottom: 14 }}>
              {pick(T.notice)}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.reportNo)}</label><input type="text" value={draft.reportNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.fullName)}</label><input type="text" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.age)}</label><input type="number" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.gender)}</label>
                <select value={draft.gender} onChange={(e) => setDraft({ ...draft, gender: e.target.value })} style={inputStyle}>
                  <option value="male">{pick(T.male)}</option>
                  <option value="female">{pick(T.female)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.nationality)}</label><input type="text" value={draft.nationality} onChange={(e) => setDraft({ ...draft, nationality: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.iqama)}</label><input type="text" value={draft.iqama} onChange={(e) => setDraft({ ...draft, iqama: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.badgeNo)}</label><input type="text" value={draft.badgeNo} onChange={(e) => setDraft({ ...draft, badgeNo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.jobTitle)}</label><input type="text" value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.yrsExp)}</label><input type="number" value={draft.yrsExp} onChange={(e) => setDraft({ ...draft, yrsExp: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hireDate)}</label><input type="date" value={draft.hireDate} onChange={(e) => setDraft({ ...draft, hireDate: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.emergencyCT)}</label><input type="text" value={draft.emergencyContact} onChange={(e) => setDraft({ ...draft, emergencyContact: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s2Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.deathDate)}</label><input type="date" value={draft.deathDate} onChange={(e) => setDraft({ ...draft, deathDate: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.deathTime)}</label><input type="time" value={draft.deathTime} onChange={(e) => setDraft({ ...draft, deathTime: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.cause)}</label>
              <input type="text" value={draft.medicalCause} onChange={(e) => setDraft({ ...draft, medicalCause: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.description)}</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...inputStyle, minHeight: 100 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.witnesses)}</label>
              <textarea value={draft.witnesses} onChange={(e) => setDraft({ ...draft, witnesses: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>

            <SectionHeader title={pick(T.s3Title)} />
            <div>
              <label style={labelStyle}>{pick(T.rootCauses)}</label>
              <textarea value={draft.rootCauses} onChange={(e) => setDraft({ ...draft, rootCauses: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.unsafeActs)}</label><textarea value={draft.unsafeActs} onChange={(e) => setDraft({ ...draft, unsafeActs: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
              <div><label style={labelStyle}>{pick(T.unsafeCond)}</label><textarea value={draft.unsafeConditions} onChange={(e) => setDraft({ ...draft, unsafeConditions: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.capa)}</label>
              <textarea value={draft.capa} onChange={(e) => setDraft({ ...draft, capa: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.capaResp)}</label><input type="text" value={draft.capaResponsible} onChange={(e) => setDraft({ ...draft, capaResponsible: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.capaDeadline)}</label><input type="date" value={draft.capaDeadline} onChange={(e) => setDraft({ ...draft, capaDeadline: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s4Title)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{lang === "ar" ? "الجهة" : "Authority"}</th>
                    <th style={thStyle}>{lang === "ar" ? "الحالة" : "Status"}</th>
                    <th style={thStyle}>{pick(T.notDate)}</th>
                    <th style={thStyle}>{pick(T.refNo)}</th>
                    <th style={thStyle}>{pick(T.contactPer)}</th>
                  </tr>
                </thead>
                <tbody>
                  {NOTIF_FIELDS.map((n) => {
                    const v = draft.notifications[n.v];
                    return (
                      <tr key={n.v}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{pick(T[n.key])}</td>
                        <td style={tdStyle}>
                          <select value={v.status} onChange={(e) => setNotif(n.v, "status", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }}>
                            <option value="pending">{pick(T.pending)}</option>
                            <option value="yes">{pick(T.yes)}</option>
                            <option value="no">{pick(T.no)}</option>
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <input type="date" value={v.date} onChange={(e) => setNotif(n.v, "date", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                        </td>
                        <td style={tdStyle}>
                          <input type="text" value={v.refNo} onChange={(e) => setNotif(n.v, "refNo", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                        </td>
                        <td style={tdStyle}>
                          <input type="text" value={v.contact} onChange={(e) => setNotif(n.v, "contact", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <SectionHeader title={pick(T.s5Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hseManager)}</label><input type="text" value={draft.hseManager} onChange={(e) => setDraft({ ...draft, hseManager: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.siteManager)}</label><input type="text" value={draft.siteManager} onChange={(e) => setDraft({ ...draft, siteManager: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.generalMgr)}</label><input type="text" value={draft.generalManager} onChange={(e) => setDraft({ ...draft, generalManager: e.target.value })} style={inputStyle} /></div>
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
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.mohre)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const mohreStatus = it.notifications?.mohre?.status || "pending";
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{it.fullName}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800,
                          background: mohreStatus === "yes" ? "#dcfce7" : mohreStatus === "no" ? "#fee2e2" : "#fef9c3",
                          color: mohreStatus === "yes" ? "#166534" : mohreStatus === "no" ? "#7f1d1d" : "#854d0e",
                        }}>
                          {mohreStatus === "yes" ? pick(T.yes) : mohreStatus === "no" ? pick(T.no) : pick(T.pending)}
                        </span>
                      </td>
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
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE · CONFIDENTIAL</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.closeModal)}</button>
                </div>
              </div>

              <ViewBlock title={pick(T.s1Title)} grid>
                {[
                  ["fullName", T.fullName], ["age", T.age], ["gender", T.gender],
                  ["nationality", T.nationality], ["iqama", T.iqama], ["badgeNo", T.badgeNo],
                  ["jobTitle", T.jobTitle], ["yrsExp", T.yrsExp], ["hireDate", T.hireDate],
                  ["emergencyContact", T.emergencyCT],
                ].map(([k, lbl]) => (
                  <div key={k} style={{ fontSize: 13 }}><b>{pick(lbl)}: </b>{viewing[k] || "—"}</div>
                ))}
              </ViewBlock>

              <ViewBlock title={pick(T.s2Title)} grid>
                <div style={{ fontSize: 13 }}><b>{pick(T.date)}: </b>{viewing.date} · {viewing.time}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.deathDate)}: </b>{viewing.deathDate} · {viewing.deathTime}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.area)}: </b>{viewing.area || "—"}</div>
                <div style={{ fontSize: 13, gridColumn: "1/-1" }}><b>{pick(T.cause)}: </b>{viewing.medicalCause || "—"}</div>
              </ViewBlock>
              {viewing.description && <ViewBlock title={pick(T.description)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.description}</div></ViewBlock>}
              {viewing.witnesses && <ViewBlock title={pick(T.witnesses)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.witnesses}</div></ViewBlock>}

              <ViewBlock title={pick(T.s3Title)}>
                {viewing.rootCauses && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.rootCauses)}: </b>{viewing.rootCauses}</div>}
                {viewing.unsafeActs && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.unsafeActs)}: </b>{viewing.unsafeActs}</div>}
                {viewing.unsafeConditions && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.unsafeCond)}: </b>{viewing.unsafeConditions}</div>}
                {viewing.capa && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.capa)}: </b>{viewing.capa}</div>}
                {viewing.capaResponsible && <div style={{ fontSize: 13 }}><b>{pick(T.capaResp)}: </b>{viewing.capaResponsible} ({viewing.capaDeadline || "—"})</div>}
              </ViewBlock>

              <ViewBlock title={pick(T.s4Title)}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ ...tableStyle, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{lang === "ar" ? "الجهة" : "Authority"}</th>
                        <th style={thStyle}>{lang === "ar" ? "الحالة" : "Status"}</th>
                        <th style={thStyle}>{pick(T.notDate)}</th>
                        <th style={thStyle}>{pick(T.refNo)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIF_FIELDS.map((n) => {
                        const v = viewing.notifications?.[n.v] || {};
                        return (
                          <tr key={n.v}>
                            <td style={{ ...tdStyle, fontWeight: 800 }}>{pick(T[n.key])}</td>
                            <td style={tdStyle}>{v.status === "yes" ? pick(T.yes) : v.status === "no" ? pick(T.no) : pick(T.pending)}</td>
                            <td style={tdStyle}>{v.date || "—"}</td>
                            <td style={tdStyle}>{v.refNo || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ViewBlock>

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14,
              }}>
                {[["preparedBy", T.preparedBy], ["hseManager", T.hseManager], ["siteManager", T.siteManager], ["generalManager", T.generalMgr]].map(([k, lbl]) => (
                  <div key={k}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{pick(lbl)}</div>
                    <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing[k] || "_______________"}</div>
                  </div>
                ))}
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

function ViewBlock({ title, children, grid }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{title}</div>
      {grid ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 }}>{children}</div>
      ) : children}
    </div>
  );
}
