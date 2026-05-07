// src/pages/hse/HSEExcavationPermit.jsx
// F-07b: تصريح أعمال الحفريات — Excavation Work Permit (SBG-HSE-033)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, updateLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "excavation_permits";

const T = {
  title:        { ar: "⛏️ تصريح الحفريات (F-07b) — Excavation Work Permit", en: "⛏️ Excavation Work Permit (F-07b)" },
  subtitle:     { ar: "تصريح حفر مع التحقق من الخدمات تحت الأرض (كهرباء/ميكانيكي/اتصالات)",
                  en: "Excavation permit with verification of underground services" },
  active:       { ar: "نشطة الآن:", en: "Active now:" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newPermit:    { ar: "+ تصريح جديد", en: "+ New Permit" },
  permitNo:     { ar: "رقم التصريح", en: "Permit No." },
  date:         { ar: "التاريخ", en: "Date" },
  validFrom:    { ar: "صالح من", en: "Valid From" },
  validTo:      { ar: "صالح إلى", en: "Valid To" },

  // Section 1
  s1Title:      { ar: "🧾 القسم 1 — جهة العمل (Performing Authority)", en: "🧾 Section 1 — Performing Authority" },
  initiator:    { ar: "اسم مُصدر التصريح", en: "Initiator's Name" },
  function:     { ar: "الوظيفة", en: "Function" },
  company:      { ar: "الشركة / القسم", en: "Company / Department" },
  jobName:      { ar: "اسم منفّذ العمل", en: "Job Performance Name" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة (Exact Area)", en: "Exact Location Area" },
  workDesc:     { ar: "وصف العمل", en: "Work Description" },
  depth:        { ar: "العمق (متر)", en: "Depth (m)" },
  width:        { ar: "العرض (متر)", en: "Width (m)" },
  length:       { ar: "الطول (متر)", en: "Length (m)" },
  drawing:      { ar: "هل يوجد رسم/مخطط مرفق؟", en: "Drawing / Sketch Attached?" },
  drawingYes:   { ar: "نعم", en: "Yes" },
  drawingNo:    { ar: "لا", en: "No" },

  // Section 2 — Verification
  s2Title:      { ar: "🔍 القسم 2 — التحقق من الخدمات تحت الأرض", en: "🔍 Section 2 — Underground Services Verification" },
  s2Hint:       { ar: "يشهد بأن منطقة الحفر خالية من الخدمات تحت الأرض ويمكن تنفيذ العمل بأمان",
                  en: "Certifies that the excavation area is clear from underground services and work can proceed safely" },
  verifElec:    { ar: "قسم الكهرباء / الأجهزة", en: "Electrical / Instrumentation Section" },
  verifMech:    { ar: "قسم الميكانيكا / المدني", en: "Mechanical / Civil Section" },
  verifTel:     { ar: "قسم الاتصالات", en: "Telecommunications Section" },
  verifierName: { ar: "اسم المُتحقِّق", en: "Verifier Name" },
  verifierDate: { ar: "تاريخ التحقق", en: "Verification Date" },
  verifierSign: { ar: "موقَّع؟", en: "Signed?" },

  // Section 3 — Safety Precautions
  s3Title:      { ar: "🛡️ القسم 3 — احتياطات السلامة والمتطلبات", en: "🛡️ Section 3 — Safety Precautions & Requirements" },
  s3Hint:       { ar: "علّم على البنود المُطبَّقة (يجب توفر الجوهرية)",
                  en: "Tick all applicable items (essential ones must be present)" },
  additional:   { ar: "احتياطات إضافية / ملاحظات", en: "Additional Precautions / Notes" },

  // Section 4
  s4Title:      { ar: "✍️ القسم 4 — الاعتماد والتوقيعات", en: "✍️ Section 4 — Approvals & Signatures" },
  issuedBy:     { ar: "أصدر التصريح", en: "Issued By" },
  approvedBy:   { ar: "اعتمد التصريح (مهندس/مشرف السلامة)", en: "Approved By (Safety Engineer/Supervisor)" },

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
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    location:  { ar: "الموقع", en: "Location" },
    initiator: { ar: "مُصدر التصريح", en: "Initiator" },
    dims:      { ar: "الأبعاد (ع×ض×ط)", en: "Dim. (D×W×L)" },
    status:    { ar: "الحالة", en: "Status" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  stActive:     { ar: "🟢 نشط", en: "🟢 Active" },
  stClosed:     { ar: "⚫ مغلق", en: "⚫ Closed" },
  signSafety:   { ar: "توقيع مهندس السلامة", en: "Safety Engineer Signature" },
  signIssuer:   { ar: "توقيع مُصدر التصريح", en: "Issuer Signature" },
  formFooter:   { ar: "Form F-07b · Excavation Work Permit · AL MAWASHI HSE Department",
                  en: "Form F-07b · Excavation Work Permit · AL MAWASHI HSE Department" },
};

const SAFETY_REQUIREMENTS = [
  { v: "access",     ar: "وسائل دخول/خروج آمنة (سلم خروج)",                en: "Safe means of access / egress (exit ladder)" },
  { v: "shoring",    ar: "دعم داخلي / تثبيت جوانب الحفر",                  en: "Internal shoring / support for trench sides" },
  { v: "barriers",   ar: "حواجز حول الحفرة",                                en: "Barriers around excavation" },
  { v: "signs",      ar: "لافتات تحذير عاكسة",                              en: "Reflective warning signs" },
  { v: "lights",     ar: "أضواء وامضة (ليلاً)",                              en: "Flashing lights (night)" },
  { v: "ppe",        ar: "معدات الوقاية الشخصية كاملة",                     en: "Full Personal Protective Equipment" },
  { v: "roadclose",  ar: "إغلاق الطرق المجاورة (إذا لزم)",                  en: "Adjacent road closure (if needed)" },
  { v: "handtools",  ar: "أدوات يدوية مناسبة",                               en: "Appropriate hand tools" },
  { v: "powertools", ar: "أدوات كهربائية مفحوصة",                            en: "Inspected power tools" },
  { v: "watchman",   ar: "مراقب أرضي (Standby)",                             en: "Standby watchman" },
  { v: "gasfree",    ar: "خالية من الغازات (إذا قرب خطوط غاز)",             en: "Gas freeing (if near gas lines)" },
  { v: "spoil",      ar: "تخزين التراب على بعد ≥ 60 سم من الحافة",           en: "Spoil pile stored ≥60 cm from edge" },
  { v: "ladder",     ar: "سلم خروج لكل 7.5 متر طولياً (للحفر العميقة)",       en: "Exit ladder every 7.5 m (for deep excavations)" },
  { v: "watercheck", ar: "فحص تجمعات المياه قبل الدخول",                     en: "Check water accumulation before entry" },
];

const blank = () => ({
  permitNo: `EXP-${Date.now().toString().slice(-6)}`,
  date: todayISO(), validFrom: `${todayISO()}T${nowHHMM()}`, validTo: "",
  location: SITE_LOCATIONS[0].v, area: "",
  initiator: "", function: "", company: "", jobName: "",
  workDescription: "",
  depth: "", width: "", length: "",
  drawingAttached: "no",
  verifications: {
    elec: { name: "", date: "", signed: false },
    mech: { name: "", date: "", signed: false },
    tel:  { name: "", date: "", signed: false },
  },
  safetyChecks: {}, additionalPrecautions: "",
  issuedBy: "", approvedBy: "",
  status: "active", closedDate: "", closedBy: "",
});

export default function HSEExcavationPermit() {
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
  function setVerif(section, field, val) {
    setDraft((d) => ({
      ...d,
      verifications: { ...d.verifications, [section]: { ...d.verifications[section], [field]: val } },
    }));
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

  const VERIF_ROWS = [
    { v: "elec", label: pick(T.verifElec) },
    { v: "mech", label: pick(T.verifMech) },
    { v: "tel",  label: pick(T.verifTel) },
  ];

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
            {/* Section 1 */}
            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.permitNo)}</label><input type="text" value={draft.permitNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.validFrom)}</label><input type="datetime-local" value={draft.validFrom} onChange={(e) => setDraft({ ...draft, validFrom: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.validTo)}</label><input type="datetime-local" value={draft.validTo} onChange={(e) => setDraft({ ...draft, validTo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.initiator)}</label><input type="text" value={draft.initiator} onChange={(e) => setDraft({ ...draft, initiator: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.function)}</label><input type="text" value={draft.function} onChange={(e) => setDraft({ ...draft, function: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.company)}</label><input type="text" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.jobName)}</label><input type="text" value={draft.jobName} onChange={(e) => setDraft({ ...draft, jobName: e.target.value })} style={inputStyle} /></div>
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

            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.depth)}</label><input type="number" step="0.1" value={draft.depth} onChange={(e) => setDraft({ ...draft, depth: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.width)}</label><input type="number" step="0.1" value={draft.width} onChange={(e) => setDraft({ ...draft, width: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.length)}</label><input type="number" step="0.1" value={draft.length} onChange={(e) => setDraft({ ...draft, length: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.drawing)}</label>
                <select value={draft.drawingAttached} onChange={(e) => setDraft({ ...draft, drawingAttached: e.target.value })} style={inputStyle}>
                  <option value="yes">{pick(T.drawingYes)}</option>
                  <option value="no">{pick(T.drawingNo)}</option>
                </select>
              </div>
            </div>

            {/* Section 2 — Verification */}
            <SectionHeader title={pick(T.s2Title)} note={pick(T.s2Hint)} />
            <div style={{ overflowX: "auto" }}>
              <table style={{ ...tableStyle, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>{lang === "ar" ? "القسم" : "Section"}</th>
                    <th style={thStyle}>{pick(T.verifierName)}</th>
                    <th style={thStyle}>{pick(T.verifierDate)}</th>
                    <th style={thStyle}>{pick(T.verifierSign)}</th>
                  </tr>
                </thead>
                <tbody>
                  {VERIF_ROWS.map((row) => {
                    const v = draft.verifications[row.v];
                    return (
                      <tr key={row.v}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{row.label}</td>
                        <td style={tdStyle}>
                          <input type="text" value={v.name} onChange={(e) => setVerif(row.v, "name", e.target.value)}
                            style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                        </td>
                        <td style={tdStyle}>
                          <input type="date" value={v.date} onChange={(e) => setVerif(row.v, "date", e.target.value)}
                            style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <input type="checkbox" checked={!!v.signed} onChange={(e) => setVerif(row.v, "signed", e.target.checked)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Section 3 — Safety Precautions */}
            <SectionHeader title={pick(T.s3Title)} note={pick(T.s3Hint)} />
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

            {/* Section 4 — Approvals */}
            <SectionHeader title={pick(T.s4Title)} />
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
                  <th style={thStyle}>{pick(T.cols.dims)}</th>
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
                      <td style={tdStyle}>{it.depth || "—"} × {it.width || "—"} × {it.length || "—"} m</td>
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
                <KV label={pick(T.function)} value={viewing.function} />
                <KV label={pick(T.company)} value={viewing.company} />
                <KV label={pick(T.jobName)} value={viewing.jobName} />
                <KV label={pick(T.location)} value={(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]} />
                <KV label={pick(T.area)} value={viewing.area} />
                <KV label={pick(T.depth)} value={viewing.depth} />
                <KV label={pick(T.width)} value={viewing.width} />
                <KV label={pick(T.length)} value={viewing.length} />
                <KV label={pick(T.drawing)} value={viewing.drawingAttached === "yes" ? pick(T.drawingYes) : pick(T.drawingNo)} />
              </ViewBlock>

              {viewing.workDescription && (
                <ViewBlock title={pick(T.workDesc)} oneCol>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.workDescription}</div>
                </ViewBlock>
              )}

              <ViewBlock title={pick(T.s2Title)} oneCol>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ ...tableStyle, fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>{lang === "ar" ? "القسم" : "Section"}</th>
                        <th style={thStyle}>{pick(T.verifierName)}</th>
                        <th style={thStyle}>{pick(T.verifierDate)}</th>
                        <th style={thStyle}>{pick(T.verifierSign)}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {VERIF_ROWS.map((row) => {
                        const v = viewing.verifications?.[row.v] || {};
                        return (
                          <tr key={row.v}>
                            <td style={{ ...tdStyle, fontWeight: 800 }}>{row.label}</td>
                            <td style={tdStyle}>{v.name || "—"}</td>
                            <td style={tdStyle}>{v.date || "—"}</td>
                            <td style={{ ...tdStyle, textAlign: "center", color: v.signed ? "#166534" : "#b91c1c", fontWeight: 800 }}>
                              {v.signed ? "✓" : "✗"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </ViewBlock>

              <ViewBlock title={pick(T.s3Title)}>
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
