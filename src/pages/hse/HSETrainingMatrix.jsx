// src/pages/hse/HSETrainingMatrix.jsx — bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, apiDelete,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

const TYPE = "training_records";

const T = {
  title:    { ar: "🎓 مصفوفة التدريب — Training Matrix", en: "🎓 Training Matrix" },
  subtitle: { ar: "المستهدف: ≥ 95% من العاملين مدربون · الميزانية: 1,200 – 1,800 درهم/موظف",
              en: "Target: ≥ 95% trained · Budget: 1,200 – 1,800 AED/employee" },
  pageIntro: {
    ar: "التدريب ليس رفاهية بل متطلب قانوني صريح في تشريعات دولة الإمارات (المرسوم الاتحادي 33/2021). تحدد مصفوفة التدريب الحد الأدنى من الدورات المطلوبة لكل فئة وظيفية. جميع الدورات يجب أن تكون من مراكز معتمدة من بلدية دبي أو الدفاع المدني حسب الموضوع. لا يُسمح لأي موظف بمباشرة عمله قبل اجتياز التدريب التعريفي، ويتم تقييم الفهم بامتحان قبل التصديق. تُوزَّع الدورات على مدار السنة لتجنّب إغلاق الموقع. ميزانية التدريب السنوية المُقدَّرة: 1,200 – 1,800 درهم لكل موظف.",
    en: "Training is not a luxury — it's an explicit legal requirement under UAE legislation (Federal Decree 33/2021). The matrix defines the minimum required courses per job category. All courses must come from centers approved by Dubai Municipality or Civil Defence depending on the topic. No employee may start work before passing induction training, and understanding is assessed by exam before certification. Courses are spread across the year to avoid site shutdown. Estimated annual training budget: AED 1,200 – 1,800 per employee.",
  },
  back: { ar: "← HSE", en: "← HSE" },
  matrix: { ar: "📋 المصفوفة", en: "📋 Matrix" },
  records:{ ar: "📊 السجلات", en: "📊 Records" },
  newSession: { ar: "+ جلسة جديدة", en: "+ New Session" },
  course: { ar: "الدورة التدريبية", en: "Training Course" },
  sessionsRun: { ar: "جلسات مُنفّذة", en: "Sessions Run" },
  legend: { ar: "✓ = إلزامي · ○ = اختياري · — = غير مطلوب", en: "✓ = Mandatory · ○ = Optional · — = Not required" },
  date: { ar: "التاريخ", en: "Date" },
  trainer: { ar: "المدرب", en: "Trainer" },
  provider: { ar: "الجهة المُقدّمة", en: "Provider" },
  providerPh: { ar: "معتمدة من البلدية / الدفاع المدني", en: "Approved by DM / Civil Defence" },
  hours: { ar: "عدد ساعات التدريب", en: "Training hours" },
  attendees: { ar: "عدد المتدربين", en: "Number of attendees" },
  validUntil: { ar: "صلاحية الشهادة حتى", en: "Certificate valid until" },
  certNo: { ar: "رقم الشهادة", en: "Certificate No." },
  attendeeNames: { ar: "أسماء المتدربين (مفصولة بفاصلة أو سطر)", en: "Attendee names (comma or line separated)" },
  notes: { ar: "ملاحظات", en: "Notes" },
  saveBtn: { ar: "💾 حفظ الجلسة", en: "💾 Save Session" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  needAtt: { ar: "أدخل أسماء المتدربين", en: "Enter attendee names" },
  saved: { ar: "✅ تم تسجيل الجلسة التدريبية", en: "✅ Training session saved" },
  confirmDel: { ar: "حذف؟", en: "Delete?" },
  noRecords: { ar: "لا توجد سجلات تدريب", en: "No training records" },
  cols: {
    date: { ar: "التاريخ", en: "Date" },
    course: { ar: "الدورة", en: "Course" },
    trainer: { ar: "المدرب / الجهة", en: "Trainer / Provider" },
    hours: { ar: "الساعات", en: "Hours" },
    attendees: { ar: "عدد المتدربين", en: "Attendees" },
    validUntil: { ar: "صالحة حتى", en: "Valid Until" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  optMandatory: { ar: "✓ إلزامي", en: "✓ Mandatory" },
  optOptional:  { ar: "○ اختياري", en: "○ Optional" },
  del: { ar: "حذف", en: "Delete" },
  edit: { ar: "✏️ تعديل", en: "✏️ Edit" },
};

const COURSES = [
  { ar: "التدريب التعريفي HSE",         en: "HSE Induction Training" },
  { ar: "الإسعافات الأولية",              en: "First Aid" },
  { ar: "الإطفاء والإخلاء",                en: "Fire & Evacuation" },
  { ar: "HACCP - أساسيات",                en: "HACCP — Basics" },
  { ar: "HACCP - متقدم",                   en: "HACCP — Advanced" },
  { ar: "البطاقة الصحية (PIC)",           en: "Health Card (PIC)" },
  { ar: "النظافة الشخصية والتعقيم",       en: "Personal Hygiene & Sanitation" },
  { ar: "سلسلة التبريد ودرجات الحرارة",   en: "Cold Chain & Temperature" },
  { ar: "العمل في البيئات الباردة",        en: "Working in Cold Environments" },
  { ar: "رخصة رافعة شوكية",                en: "Forklift License" },
  { ar: "الرفع اليدوي الآمن",               en: "Safe Manual Lifting" },
  { ar: "الاستجابة لتسرب الأمونيا",        en: "Ammonia Leak Response" },
  { ar: "NEBOSH IGC",                      en: "NEBOSH IGC" },
  { ar: "IOSH Managing Safely",            en: "IOSH Managing Safely" },
  { ar: "التحقيق في الحوادث",              en: "Incident Investigation" },
  { ar: "تدقيق داخلي HSE",                 en: "Internal HSE Audit" },
];

const ROLES = [
  { id: "hseManager",  ar: "مدير HSE",      en: "HSE Manager" },
  { id: "hseOfficer",  ar: "ضابط HSE",      en: "HSE Officer" },
  { id: "warehouse",   ar: "عامل مستودع",    en: "Warehouse Worker" },
  { id: "production",  ar: "عامل تصنيع",     en: "Production Worker" },
  { id: "forklift",    ar: "سائق رافعة",     en: "Forklift Driver" },
  { id: "operations",  ar: "مدير تشغيل",     en: "Operations Manager" },
];

// matrix indexed by English course label (canonical key)
const MATRIX = {
  "HSE Induction Training":           { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "✓", operations: "✓" },
  "First Aid":                         { hseManager: "✓", hseOfficer: "✓", warehouse: "○", production: "○", forklift: "○", operations: "✓" },
  "Fire & Evacuation":                 { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "✓", operations: "✓" },
  "HACCP — Basics":                    { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "—", operations: "✓" },
  "HACCP — Advanced":                  { hseManager: "✓", hseOfficer: "✓", warehouse: "—", production: "—", forklift: "—", operations: "—" },
  "Health Card (PIC)":                 { hseManager: "✓", hseOfficer: "✓", warehouse: "—", production: "—", forklift: "—", operations: "✓" },
  "Personal Hygiene & Sanitation":     { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "✓", operations: "—" },
  "Cold Chain & Temperature":          { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "—", operations: "✓" },
  "Working in Cold Environments":      { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "✓", operations: "—" },
  "Forklift License":                  { hseManager: "—", hseOfficer: "—", warehouse: "○", production: "—", forklift: "✓", operations: "—" },
  "Safe Manual Lifting":                { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "✓", forklift: "—", operations: "—" },
  "Ammonia Leak Response":             { hseManager: "✓", hseOfficer: "✓", warehouse: "✓", production: "—", forklift: "—", operations: "—" },
  "NEBOSH IGC":                        { hseManager: "✓", hseOfficer: "✓", warehouse: "—", production: "—", forklift: "—", operations: "—" },
  "IOSH Managing Safely":              { hseManager: "✓", hseOfficer: "✓", warehouse: "—", production: "—", forklift: "—", operations: "—" },
  "Incident Investigation":            { hseManager: "✓", hseOfficer: "✓", warehouse: "—", production: "—", forklift: "—", operations: "✓" },
  "Internal HSE Audit":                { hseManager: "✓", hseOfficer: "✓", warehouse: "—", production: "—", forklift: "—", operations: "—" },
};

const blank = () => ({
  date: todayISO(), course: COURSES[0].en,
  trainerName: "", provider: "", durationHours: "",
  attendees: "", attendeeCount: 1, validUntil: "", certificateNo: "", notes: "",
});

export default function HSETrainingMatrix() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("matrix");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setTab("new");
  }

  async function save() {
    if (!draft.attendees.trim()) { alert(pick(T.needAtt)); return; }
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.trainer || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.trainer || "HSE");
      }
      await reload();
      alert(pick(T.saved));
      setDraft(blank()); setEditingId(null); setTab("records");
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

  const courseCount = useMemo(() => {
    const map = {};
    items.forEach((rec) => { map[rec.course] = (map[rec.course] || 0) + 1; });
    return map;
  }, [items]);

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
            <button style={tab === "matrix" ? buttonPrimary : buttonGhost} onClick={() => setTab("matrix")}>{pick(T.matrix)}</button>
            <button style={tab === "records" ? buttonPrimary : buttonGhost} onClick={() => setTab("records")}>{pick(T.records)} ({items.length})</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newSession)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "matrix" && (
          <>
          <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
            <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.course)}</th>
                  {ROLES.map((r) => <th key={r.id} style={thStyle}>{r[lang]}</th>)}
                  <th style={thStyle}>{pick(T.sessionsRun)}</th>
                </tr>
              </thead>
              <tbody>
                {COURSES.map((c) => (
                  <tr key={c.en}>
                    <td style={{ ...tdStyle, fontWeight: 800 }}>{c[lang]}</td>
                    {ROLES.map((r) => {
                      const v = MATRIX[c.en]?.[r.id];
                      return (
                        <td key={r.id} style={{
                          ...tdStyle, textAlign: "center", fontWeight: 900,
                          color: v === "✓" ? "#166534" : v === "○" ? "#854d0e" : "#94a3b8",
                          background: v === "✓" ? "#dcfce7" : v === "○" ? "#fef9c3" : "transparent",
                        }}>
                          {v === "✓" ? pick(T.optMandatory) : v === "○" ? pick(T.optOptional) : "—"}
                        </td>
                      );
                    })}
                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 900, color: HSE_COLORS.primary }}>
                      {courseCount[c.en] || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 12, padding: 10, background: "#fff7ed", borderRadius: 10, border: "1px dashed rgba(120,53,15,0.18)", fontSize: 12, color: HSE_COLORS.primaryDark }}>
              {pick(T.legend)}
            </div>
          </div>
          </>
        )}

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.course)}</label>
                <select value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} style={inputStyle}>
                  {COURSES.map((c) => <option key={c.en} value={c.en}>{c[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.trainer)}</label><input type="text" value={draft.trainerName} onChange={(e) => setDraft({ ...draft, trainerName: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.provider)}</label><input type="text" value={draft.provider} onChange={(e) => setDraft({ ...draft, provider: e.target.value })} placeholder={pick(T.providerPh)} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.hours)}</label><input type="number" value={draft.durationHours} onChange={(e) => setDraft({ ...draft, durationHours: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.attendees)}</label><input type="number" value={draft.attendeeCount} onChange={(e) => setDraft({ ...draft, attendeeCount: Number(e.target.value) || 1 })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.validUntil)}</label><input type="date" value={draft.validUntil} onChange={(e) => setDraft({ ...draft, validUntil: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.certNo)}</label><input type="text" value={draft.certificateNo} onChange={(e) => setDraft({ ...draft, certificateNo: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.attendeeNames)}</label>
              <textarea value={draft.attendees} onChange={(e) => setDraft({ ...draft, attendees: e.target.value })} style={{ ...inputStyle, minHeight: 90 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.notes)}</label>
              <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.saveBtn)}
              </button>
              <button style={buttonGhost} onClick={() => { setTab("matrix"); setEditingId(null); setDraft(blank()); }} disabled={saving}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {tab === "records" && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.course)}</th>
                  <th style={thStyle}>{pick(T.cols.trainer)}</th>
                  <th style={thStyle}>{pick(T.cols.hours)}</th>
                  <th style={thStyle}>{pick(T.cols.attendees)}</th>
                  <th style={thStyle}>{pick(T.cols.validUntil)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((rec) => {
                  const c = COURSES.find((x) => x.en === rec.course);
                  return (
                    <tr key={rec.id}>
                      <td style={tdStyle}>{rec.date}</td>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{c ? c[lang] : rec.course}</td>
                      <td style={tdStyle}>{rec.trainerName}<br /><small>{rec.provider}</small></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>{rec.durationHours}h</td>
                      <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800 }}>{rec.attendeeCount}</td>
                      <td style={tdStyle}>{rec.validUntil || "—"}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#1e40af" }} onClick={() => startEdit(rec)}>{pick(T.edit)}</button>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c" }} onClick={() => remove(rec.id)}>{pick(T.del)}</button>
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
      </div>
    </main>
  );
}
