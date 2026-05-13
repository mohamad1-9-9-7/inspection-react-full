// src/pages/hse/HSENCR.jsx
// F-26: تقرير عدم المطابقة — Non-Conformance Report (NCR) (SBG-HSE-008)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  apiList, apiSave, apiDelete, apiUpdate, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "ncr_reports";

const T = {
  title:        { ar: "🚫 تقرير عدم المطابقة (F-26) — Non-Conformance Report (NCR)", en: "🚫 Non-Conformance Report (F-26)" },
  subtitle:     { ar: "بلاغ عدم مطابقة قياسي (مطابق SBG-HSE-008) — يستدعي إجراء تصحيحي (CAPA)",
                  en: "Standard non-conformance report (per SBG-HSE-008) — triggers CAPA" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newReport:    { ar: "+ NCR جديد", en: "+ New NCR" },
  reportNo:     { ar: "رقم الـ NCR", en: "NCR No." },

  // Section 1
  s1Title:      { ar: "🏷️ نوع عدم المطابقة", en: "🏷️ Non-Conformance Type" },
  typeMVA:      { ar: "مركبة", en: "Motor Vehicle" },
  typePersonal: { ar: "شخصي", en: "Personal" },
  typeEquip:    { ar: "معدات", en: "Equipment" },
  typeProp:     { ar: "ممتلكات", en: "Property" },
  typeProcess:  { ar: "إجراء/Process", en: "Process" },
  typeQuality:  { ar: "جودة", en: "Quality" },
  typeFood:     { ar: "سلامة غذاء", en: "Food Safety" },
  typeEnv:      { ar: "بيئي", en: "Environmental" },
  typeOther:    { ar: "أخرى", en: "Others" },

  // Section 2
  s2Title:      { ar: "📋 تفاصيل البلاغ", en: "📋 Report Details" },
  date:         { ar: "التاريخ", en: "Date" },
  time:         { ar: "الوقت", en: "Time" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة المحددة", en: "Specific Area" },
  issuedTo:     { ar: "صدر إلى (الجهة المسؤولة)", en: "Issued To (Responsible Party)" },
  finishDate:   { ar: "الموعد النهائي للإغلاق", en: "Required Finish Date" },
  severity:     { ar: "درجة الخطورة", en: "Severity" },
  sevMinor:     { ar: "بسيط", en: "Minor" },
  sevMajor:     { ar: "جسيم", en: "Major" },
  sevCritical:  { ar: "حرج", en: "Critical" },
  category:     { ar: "الفئة", en: "Category" },
  catRefs: {
    iso45001:   { ar: "ISO 45001 — السلامة المهنية", en: "ISO 45001 — OH&S" },
    iso14001:   { ar: "ISO 14001 — البيئة", en: "ISO 14001 — Environment" },
    iso22000:   { ar: "ISO 22000 — سلامة الغذاء", en: "ISO 22000 — Food Safety" },
    haccp:      { ar: "HACCP", en: "HACCP" },
    municipal:  { ar: "بلدية دبي", en: "Dubai Municipality" },
    civdef:     { ar: "الدفاع المدني", en: "Civil Defence" },
    mohre:      { ar: "MOHRE", en: "MOHRE" },
    internal:   { ar: "إجراءات داخلية", en: "Internal Procedures" },
  },

  // Section 3
  s3Title:      { ar: "📝 وصف عدم المطابقة", en: "📝 Description of Non-Conformity" },
  description:  { ar: "الوصف التفصيلي (مع الأدلة/الصور إن وجدت)", en: "Detailed Description (with evidence/photos if any)" },
  reqClause:    { ar: "البند/المتطلب المُخالَف", en: "Requirement / Clause Violated" },
  evidence:     { ar: "الأدلة المرجعية (مرفقات/صور/شهود)", en: "Reference Evidence (attachments/photos/witnesses)" },

  // Section 4
  s4Title:      { ar: "🛠️ الإجراء التصحيحي المقترح", en: "🛠️ Proposed Corrective Action" },
  rootCause:    { ar: "تحليل السبب الجذري", en: "Root Cause Analysis" },
  immediate:    { ar: "إجراء فوري (Containment)", en: "Immediate Containment Action" },
  corrective:   { ar: "إجراء تصحيحي (Corrective)", en: "Corrective Action" },
  preventive:   { ar: "إجراء وقائي (Preventive)", en: "Preventive Action" },

  // Section 5 — Status
  s5Title:      { ar: "📊 الحالة والمتابعة", en: "📊 Status & Follow-up" },
  status:       { ar: "الحالة", en: "Status" },
  stOpen:       { ar: "مفتوح", en: "Open" },
  stProgress:   { ar: "قيد التنفيذ", en: "In Progress" },
  stClosed:     { ar: "مُغلق", en: "Closed" },
  stRejected:   { ar: "مرفوض", en: "Rejected" },
  closedDate:   { ar: "تاريخ الإغلاق", en: "Closed Date" },
  verifBy:      { ar: "تم التحقق بواسطة", en: "Verified By" },
  effectiveness:{ ar: "فحص الفاعلية", en: "Effectiveness Check" },
  effYes:       { ar: "فعّال", en: "Effective" },
  effNo:        { ar: "غير فعّال", en: "Not Effective" },
  effPending:   { ar: "بانتظار التحقق", en: "Pending Verification" },

  // Section 6
  s6Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  preparedBy:   { ar: "أعدّ التقرير", en: "Prepared By" },
  preparedPos:  { ar: "الوظيفة (المُعِد)", en: "Position (Preparer)" },
  approvedBy:   { ar: "وافق عليه", en: "Approved By" },
  approvedPos:  { ar: "الوظيفة (المعتمد)", en: "Position (Approver)" },

  comments:     { ar: "ملاحظات", en: "Comments" },

  saveBtn:      { ar: "💾 حفظ NCR", en: "💾 Save NCR" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needDesc:     { ar: "اكتب وصف عدم المطابقة", en: "Enter non-conformance description" },
  saved:        { ar: "✅ تم حفظ NCR", en: "✅ NCR saved" },
  closeNCR:     { ar: "إغلاق NCR", en: "Close NCR" },
  closer:       { ar: "اسم من يُغلق NCR:", en: "Name of person closing NCR:" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  edit:         { ar: "✏️ تعديل", en: "✏️ Edit" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد NCRs", en: "No NCRs" },
  cols: {
    no:       { ar: "الرقم", en: "No." },
    date:     { ar: "التاريخ", en: "Date" },
    type:     { ar: "النوع", en: "Type" },
    location: { ar: "الموقع", en: "Location" },
    severity: { ar: "الخطورة", en: "Severity" },
    status:   { ar: "الحالة", en: "Status" },
    actions:  { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-26 · NCR · AL MAWASHI HSE",
                  en: "Form F-26 · NCR · AL MAWASHI HSE" },
};

const NCR_TYPES = [
  { v: "mva",      key: "typeMVA" },
  { v: "personal", key: "typePersonal" },
  { v: "equip",    key: "typeEquip" },
  { v: "prop",     key: "typeProp" },
  { v: "process",  key: "typeProcess" },
  { v: "quality",  key: "typeQuality" },
  { v: "food",     key: "typeFood" },
  { v: "env",      key: "typeEnv" },
  { v: "other",    key: "typeOther" },
];

const blank = () => ({
  reportNo: `NCR-${Date.now().toString().slice(-6)}`,
  date: todayISO(), time: nowHHMM(),
  location: SITE_LOCATIONS[0].v, area: "",
  issuedTo: "", finishDate: "", severity: "minor",
  category: "", types: {},
  description: "", reqClause: "", evidence: "",
  rootCause: "", immediate: "", corrective: "", preventive: "",
  status: "open", closedDate: "", closedBy: "", verifBy: "", effectiveness: "pending",
  comments: "",
  preparedBy: "", preparedPos: "", approvedBy: "", approvedPos: "",
});

export default function HSENCR() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function printReport() { window.print(); }

  function toggleType(v) {
    setDraft((d) => ({ ...d, types: { ...d.types, [v]: !d.types[v] } }));
  }

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setViewing(null);
    setTab("new");
  }

  async function save() {
    if (!draft.description.trim()) { alert(pick(T.needDesc)); return; }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.reportedBy || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.reportedBy || "HSE");
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
  async function closeNCR(id) {
    const closer = prompt(pick(T.closer));
    if (!closer) return;
    try {
      await apiUpdate(TYPE, id, { status: "closed", closedDate: todayISO(), closedBy: closer }, closer);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالإغلاق: ", en: "❌ Close error: " })) + (e?.message || e));
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
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.time)}</label><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s1Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
              {NCR_TYPES.map((tt) => (
                <label key={tt.v} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 10px", borderRadius: 8,
                  background: draft.types[tt.v] ? "#fed7aa" : "#fff",
                  cursor: "pointer", border: `1px solid ${draft.types[tt.v] ? "#9a3412" : "rgba(120,53,15,0.18)"}`,
                  fontSize: 13, fontWeight: 700,
                }}>
                  <input type="checkbox" checked={!!draft.types[tt.v]} onChange={() => toggleType(tt.v)} />
                  {pick(T[tt.key])}
                </label>
              ))}
            </div>

            <SectionHeader title={pick(T.s2Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.issuedTo)}</label><input type="text" value={draft.issuedTo} onChange={(e) => setDraft({ ...draft, issuedTo: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.finishDate)}</label><input type="date" value={draft.finishDate} onChange={(e) => setDraft({ ...draft, finishDate: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.severity)}</label>
                <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value })} style={inputStyle}>
                  <option value="minor">{pick(T.sevMinor)}</option>
                  <option value="major">{pick(T.sevMajor)}</option>
                  <option value="critical">{pick(T.sevCritical)}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.category)}</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={inputStyle}>
                  <option value="">—</option>
                  {Object.entries(T.catRefs).map(([k, v]) => <option key={k} value={k}>{v[lang]}</option>)}
                </select>
              </div>
            </div>

            <SectionHeader title={pick(T.s3Title)} />
            <div>
              <label style={labelStyle}>{pick(T.description)}</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...inputStyle, minHeight: 90 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.reqClause)}</label>
              <input type="text" value={draft.reqClause} onChange={(e) => setDraft({ ...draft, reqClause: e.target.value })} style={inputStyle} placeholder={lang === "ar" ? "مثلاً: ISO 22000 §7.5.3.1" : "e.g. ISO 22000 §7.5.3.1"} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.evidence)}</label>
              <textarea value={draft.evidence} onChange={(e) => setDraft({ ...draft, evidence: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <SectionHeader title={pick(T.s4Title)} />
            <div>
              <label style={labelStyle}>{pick(T.rootCause)}</label>
              <textarea value={draft.rootCause} onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.immediate)}</label><textarea value={draft.immediate} onChange={(e) => setDraft({ ...draft, immediate: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
              <div><label style={labelStyle}>{pick(T.corrective)}</label><textarea value={draft.corrective} onChange={(e) => setDraft({ ...draft, corrective: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
              <div><label style={labelStyle}>{pick(T.preventive)}</label><textarea value={draft.preventive} onChange={(e) => setDraft({ ...draft, preventive: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
            </div>

            <SectionHeader title={pick(T.s5Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div>
                <label style={labelStyle}>{pick(T.status)}</label>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={inputStyle}>
                  <option value="open">{pick(T.stOpen)}</option>
                  <option value="progress">{pick(T.stProgress)}</option>
                  <option value="closed">{pick(T.stClosed)}</option>
                  <option value="rejected">{pick(T.stRejected)}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.effectiveness)}</label>
                <select value={draft.effectiveness} onChange={(e) => setDraft({ ...draft, effectiveness: e.target.value })} style={inputStyle}>
                  <option value="pending">{pick(T.effPending)}</option>
                  <option value="yes">{pick(T.effYes)}</option>
                  <option value="no">{pick(T.effNo)}</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.comments)}</label>
              <textarea value={draft.comments} onChange={(e) => setDraft({ ...draft, comments: e.target.value })} style={{ ...inputStyle, minHeight: 50 }} />
            </div>

            <SectionHeader title={pick(T.s6Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.preparedPos)}</label><input type="text" value={draft.preparedPos} onChange={(e) => setDraft({ ...draft, preparedPos: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.approvedBy)}</label><input type="text" value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.approvedPos)}</label><input type="text" value={draft.approvedPos} onChange={(e) => setDraft({ ...draft, approvedPos: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.saveBtn)}
              </button>
              <button style={buttonGhost} onClick={() => { setTab("list"); setEditingId(null); setDraft(blank()); }} disabled={saving}>{pick(T.cancel)}</button>
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
                  <th style={thStyle}>{pick(T.cols.severity)}</th>
                  <th style={thStyle}>{pick(T.cols.status)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const types = NCR_TYPES.filter((tt) => it.types?.[tt.v]).map((tt) => pick(T[tt.key])).join(", ") || "—";
                  const sevLabels = { minor: T.sevMinor, major: T.sevMajor, critical: T.sevCritical };
                  const stLabels = { open: T.stOpen, progress: T.stProgress, closed: T.stClosed, rejected: T.stRejected };
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.reportNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{types}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{pick(sevLabels[it.severity] || { ar: it.severity, en: it.severity })}</td>
                      <td style={tdStyle}>{pick(stLabels[it.status] || { ar: it.status, en: it.status })}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => setViewing(it)}>{pick(T.view)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                          {it.status !== "closed" && (
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => closeNCR(it.id)}>{pick(T.closeNCR)}</button>
                          )}
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
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
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>AL MAWASHI · HSE</div>
                </div>
                <div style={{ textAlign: dir === "rtl" ? "left" : "right" }} className="no-print">
                  <button style={{ ...buttonPrimary, marginInlineEnd: 6 }} onClick={printReport}>{pick(T.print)}</button>
                  <button style={buttonGhost} onClick={() => setViewing(null)}>{pick(T.closeModal)}</button>
                </div>
              </div>

              <ViewBlock title={pick(T.s2Title)} grid>
                <div style={{ fontSize: 13 }}><b>{pick(T.reportNo)}: </b>{viewing.reportNo}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.date)}: </b>{viewing.date} · {viewing.time}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.area)}: </b>{viewing.area || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.issuedTo)}: </b>{viewing.issuedTo || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.finishDate)}: </b>{viewing.finishDate || "—"}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.severity)}: </b>{({ minor: pick(T.sevMinor), major: pick(T.sevMajor), critical: pick(T.sevCritical) }[viewing.severity] || viewing.severity)}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.category)}: </b>{viewing.category && T.catRefs[viewing.category] ? T.catRefs[viewing.category][lang] : "—"}</div>
              </ViewBlock>

              <ViewBlock title={pick(T.s1Title)}>
                {NCR_TYPES.filter((tt) => viewing.types?.[tt.v]).map((tt) => (
                  <span key={tt.v} style={{
                    display: "inline-block", padding: "3px 10px", borderRadius: 6,
                    background: "#fed7aa", color: "#9a3412", fontSize: 12, fontWeight: 800, marginInlineEnd: 6, marginBottom: 4,
                  }}>{pick(T[tt.key])}</span>
                ))}
              </ViewBlock>

              {viewing.description && <ViewBlock title={pick(T.description)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.description}</div></ViewBlock>}
              {viewing.reqClause && <ViewBlock title={pick(T.reqClause)}><div style={{ fontSize: 13 }}>{viewing.reqClause}</div></ViewBlock>}
              {viewing.evidence && <ViewBlock title={pick(T.evidence)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.evidence}</div></ViewBlock>}

              {(viewing.rootCause || viewing.immediate || viewing.corrective || viewing.preventive) && (
                <ViewBlock title={pick(T.s4Title)}>
                  {viewing.rootCause && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.rootCause)}: </b>{viewing.rootCause}</div>}
                  {viewing.immediate && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.immediate)}: </b>{viewing.immediate}</div>}
                  {viewing.corrective && <div style={{ fontSize: 13, marginBottom: 6 }}><b>{pick(T.corrective)}: </b>{viewing.corrective}</div>}
                  {viewing.preventive && <div style={{ fontSize: 13 }}><b>{pick(T.preventive)}: </b>{viewing.preventive}</div>}
                </ViewBlock>
              )}

              <ViewBlock title={pick(T.s5Title)} grid>
                <div style={{ fontSize: 13 }}><b>{pick(T.status)}: </b>{({ open: pick(T.stOpen), progress: pick(T.stProgress), closed: pick(T.stClosed), rejected: pick(T.stRejected) }[viewing.status] || viewing.status)}</div>
                <div style={{ fontSize: 13 }}><b>{pick(T.effectiveness)}: </b>{({ yes: pick(T.effYes), no: pick(T.effNo), pending: pick(T.effPending) }[viewing.effectiveness] || viewing.effectiveness)}</div>
                {viewing.closedDate && <div style={{ fontSize: 13 }}><b>{pick(T.closedDate)}: </b>{viewing.closedDate}</div>}
                {viewing.closedBy && <div style={{ fontSize: 13 }}><b>{pick(T.verifBy)}: </b>{viewing.closedBy}</div>}
              </ViewBlock>

              {viewing.comments && <ViewBlock title={pick(T.comments)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.comments}</div></ViewBlock>}

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.preparedBy)} ({viewing.preparedPos || "—"})</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.approvedBy)} ({viewing.approvedPos || "—"})</div>
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
      {grid ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 6 }}>{children}</div> : children}
    </div>
  );
}
