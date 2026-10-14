// src/pages/hse/HSEToolboxMeeting.jsx
// F-29: محضر اجتماع Toolbox للسلامة — Tool Box Meeting Minutes (SBG-HSE-011)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  apiList, apiSave, apiUpdate, apiDelete, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
  canDeleteHSE, HSE_DELETE_DENIED,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation } from "./hseFormKit";

const TYPE = "toolbox_meetings";

const T = {
  title:        { ar: "🗣️ محضر اجتماع Toolbox (F-29) — Tool Box Meeting Minutes", en: "🗣️ Toolbox Meeting Minutes (F-29)" },
  subtitle:     { ar: "اجتماعات السلامة اليومية القصيرة (5-15 دقيقة) — مطابق SBG-HSE-011",
                  en: "Daily short safety meetings (5-15 min) — per SBG-HSE-011" },
  back:         { ar: "← HSE", en: "← HSE" },
  list:         { ar: "📋 السجل", en: "📋 Records" },
  newMeeting:   { ar: "+ اجتماع جديد", en: "+ New Meeting" },
  meetingNo:    { ar: "رقم الاجتماع", en: "Meeting No." },

  s1Title:      { ar: "📋 معلومات الاجتماع", en: "📋 Meeting Information" },
  topic:        { ar: "الموضوع", en: "Topic" },
  topicPh:      { ar: "مثلاً: استخدام PPE في الغرف الباردة", en: "e.g. PPE use in cold rooms" },
  date:         { ar: "التاريخ", en: "Date" },
  startTime:    { ar: "وقت البدء", en: "Start Time" },
  endTime:      { ar: "وقت الانتهاء", en: "End Time" },
  duration:     { ar: "المدة (دقيقة)", en: "Duration (min)" },
  location:     { ar: "الموقع", en: "Location" },
  area:         { ar: "المنطقة", en: "Specific Area" },
  conductor:    { ar: "أدار الاجتماع", en: "Conducted By" },
  conductorRole:{ ar: "وظيفة المُحاضر", en: "Conductor's Role" },

  s2Title:      { ar: "📝 محضر الاجتماع", en: "📝 Meeting Minutes" },
  minutes:      { ar: "محضر النقاش", en: "Discussion Notes" },
  safetyReminder:{ ar: "رسالة السلامة الرئيسية", en: "Key Safety Reminder" },
  hazardsCovered:{ ar: "المخاطر التي تم تغطيتها", en: "Hazards Covered" },
  ppeRequired:  { ar: "PPE المطلوب", en: "PPE Required" },
  qa:           { ar: "أسئلة وأجوبة (Q&A)", en: "Questions & Answers" },

  s3Title:      { ar: "👥 سجل الحضور", en: "👥 Attendance Record" },
  attendees:    { ar: "الحاضرون", en: "Attendees" },
  attName:      { ar: "الاسم", en: "Name" },
  attBadge:     { ar: "الشارة", en: "Badge No." },
  attDept:      { ar: "القسم/المهنة", en: "Dept / Trade" },
  attSign:      { ar: "وقَّع؟", en: "Signed?" },
  totalAtt:     { ar: "إجمالي الحاضرين", en: "Total Attendees" },
  addAtt:       { ar: "+ إضافة حاضر", en: "+ Add Attendee" },
  removeAtt:    { ar: "حذف", en: "Remove" },

  s4Title:      { ar: "✍️ التوقيعات", en: "✍️ Signatures" },
  preparedBy:   { ar: "أعدّ المحضر", en: "Prepared By" },
  safetySupervisor:{ ar: "مشرف السلامة", en: "Safety Supervisor" },

  saveBtn:      { ar: "💾 حفظ المحضر", en: "💾 Save Minutes" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  needTopic:    { ar: "أدخل موضوع الاجتماع", en: "Enter meeting topic" },
  saved:        { ar: "✅ تم حفظ المحضر", en: "✅ Minutes saved" },
  confirmDel:   { ar: "حذف؟", en: "Delete?" },
  view:         { ar: "👁️ عرض", en: "👁️ View" },
  edit:         { ar: "✏️ تعديل", en: "✏️ Edit" },
  del:          { ar: "حذف", en: "Delete" },
  print:        { ar: "🖨️ طباعة / PDF", en: "🖨️ Print / PDF" },
  closeModal:   { ar: "✖ إغلاق", en: "✖ Close" },
  noRecords:    { ar: "لا توجد محاضر", en: "No minutes" },
  cols: {
    no:        { ar: "الرقم", en: "No." },
    date:      { ar: "التاريخ", en: "Date" },
    topic:     { ar: "الموضوع", en: "Topic" },
    location:  { ar: "الموقع", en: "Location" },
    attendees: { ar: "الحضور", en: "Att." },
    duration:  { ar: "المدة", en: "Duration" },
    actions:   { ar: "إجراءات", en: "Actions" },
  },
  formFooter:   { ar: "Form F-29 · Toolbox Meeting Minutes · AL MAWASHI HSE",
                  en: "Form F-29 · Toolbox Meeting Minutes · AL MAWASHI HSE" },
};

const blankAtt = () => ({ name: "", badge: "", dept: "", signed: false });

const blank = () => ({
  meetingNo: `TBM-${Date.now().toString().slice(-6)}`,
  topic: "", date: todayISO(), startTime: nowHHMM(), endTime: "",
  location: SITE_LOCATIONS[0].v, area: "",
  conductor: "", conductorRole: "",
  minutes: "", safetyReminder: "", hazardsCovered: "", ppeRequired: "", qa: "",
  attendees: [blankAtt(), blankAtt(), blankAtt()],
  preparedBy: "", safetySupervisor: "",
});

/* ── Rules: a toolbox talk is short (5–60 min), names its topic and the key
   safety message, and its attendance sheet only counts people who are named
   and signed — no blank lines carrying a badge, no duplicates. ── */
const tbMinutes = (s, e) => {
  if (!s || !e) return null;
  const [sH, sM] = s.split(":").map(Number);
  const [eH, eM] = e.split(":").map(Number);
  return (eH * 60 + eM) - (sH * 60 + sM);
};
const TOOLBOX_RULES = [
  { key: "topic", label: T.topic, required: true, minLength: 5, maxLength: 150 },
  { key: "date", label: T.date, type: "date", required: true, notFuture: true },
  { key: "startTime", label: T.startTime, type: "time", required: true },
  { key: "endTime", label: T.endTime, type: "time", required: true, after: "startTime",
    custom: (v, d) => {
      const m = tbMinutes(d.startTime, v);
      if (m == null || m <= 0) return null;
      if (m < 5) return { ar: "مدة الاجتماع أقل من 5 دقائق", en: "The meeting is shorter than 5 minutes" };
      if (m > 60) return { ar: "مدة اجتماع Toolbox لا تتجاوز 60 دقيقة", en: "A toolbox meeting cannot exceed 60 minutes" };
      return null;
    } },
  { key: "location", label: T.location, required: true, oneOf: SITE_LOCATIONS.map((x) => x.v) },
  { key: "area", label: T.area, maxLength: 120 },
  { key: "conductor", label: T.conductor, required: true, maxLength: 80 },
  { key: "conductorRole", label: T.conductorRole, maxLength: 80 },
  { key: "minutes", label: T.minutes, required: true, minLength: 20, maxLength: 4000 },
  { key: "safetyReminder", label: T.safetyReminder, required: true, minLength: 5, maxLength: 1000 },
  { key: "hazardsCovered", label: T.hazardsCovered, maxLength: 1000 },
  { key: "ppeRequired", label: T.ppeRequired, maxLength: 1000 },
  { key: "qa", label: T.qa, maxLength: 2000 },
  { key: "attendees", label: T.s3Title,
    custom: (v) => {
      const rows = v || [];
      if (rows.some((a) => !String(a.name || "").trim() && (String(a.badge || "").trim() || String(a.dept || "").trim() || a.signed)))
        return { ar: "يوجد سطر حضور بدون اسم", en: "An attendance line has no name" };
      const named = rows.filter((a) => String(a.name || "").trim());
      if (!named.length) return { ar: "سجّل حاضراً واحداً على الأقل", en: "Record at least one attendee" };
      if (named.some((a) => !a.signed)) return { ar: "كل حاضر مسجّل يجب أن يوقّع", en: "Every listed attendee must sign" };
      const badges = named.map((a) => String(a.badge || "").trim().toLowerCase()).filter(Boolean);
      if (new Set(badges).size !== badges.length) return { ar: "رقم شارة مكرّر في سجل الحضور", en: "A badge number appears twice" };
      return null;
    } },
  { key: "preparedBy", label: T.preparedBy, required: true, maxLength: 80 },
  { key: "safetySupervisor", label: T.safetySupervisor, required: true, maxLength: 80 },
];
const TOOLBOX_STEPS = [
  { ar: "اكتب موضوع الاجتماع، التاريخ، ووقت البدء والانتهاء — المدة بين 5 و 60 دقيقة.", en: "Enter the topic, the date, and the start and end time — between 5 and 60 minutes." },
  { ar: "سجّل من أدار الاجتماع والموقع.", en: "Record who conducted it and where." },
  { ar: "اكتب محضر النقاش ورسالة السلامة الرئيسية، والمخاطر و PPE التي غُطّيت.", en: "Write the discussion notes and the key safety message, plus the hazards and PPE covered." },
  { ar: "سجّل كل حاضر باسمه وشارته وقسمه، وأشّر على توقيعه — السطور الفارغة تُتجاهل.", en: "List every attendee with name, badge and department, and tick their signature — empty lines are ignored." },
  { ar: "يوقّع مُعِد المحضر ومشرف السلامة.", en: "The preparer and the safety supervisor sign." },
];
const TOOLBOX_GUIDANCE = [
  { kind: "tip", ar: "اربط الموضوع بحادث أو شبه حادث حديث — أكثر فائدة من موضوع عام.", en: "Tie the topic to a recent incident or near-miss — more useful than a generic subject." },
];

export default function HSEToolboxMeeting() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(TOOLBOX_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);
  function printReport() { window.print(); }

  function startEdit(it) {
    setDraft({ ...blank(), ...it });
    setEditingId(it.id);
    setViewing(null);
    validation.reset();
    setTab("new");
  }

  function setAtt(idx, field, val) {
    setDraft((d) => {
      const arr = [...d.attendees];
      arr[idx] = { ...arr[idx], [field]: val };
      return { ...d, attendees: arr };
    });
  }
  function addAtt() { setDraft((d) => ({ ...d, attendees: [...d.attendees, blankAtt()] })); }
  function removeAtt(idx) { setDraft((d) => ({ ...d, attendees: d.attendees.filter((_, i) => i !== idx) })); }

  // Auto-calc duration
  function calcDuration(start, end) {
    if (!start || !end) return "";
    const [sH, sM] = start.split(":").map(Number);
    const [eH, eM] = end.split(":").map(Number);
    const mins = (eH * 60 + eM) - (sH * 60 + sM);
    return mins > 0 ? mins : "";
  }

  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiUpdate(TYPE, editingId, draft, draft.conductedBy || "HSE");
      } else {
        await apiSave(TYPE, draft, draft.conductedBy || "HSE");
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

  const duration = calcDuration(draft.startTime, draft.endTime);
  const attCount = (draft.attendees || []).filter((a) => a.name?.trim()).length;

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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.newMeeting)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "محضر اجتماع Toolbox", en: "Toolbox Meeting Minutes" }}
              subtitle={T.subtitle}
              docNo="F-29"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.meetingNo), value: draft.meetingNo }]}
              steps={TOOLBOX_STEPS}
              guidance={TOOLBOX_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); setDraft(blank()); validation.reset(); }}
            >
              <HSEPanel title={pick(T.s1Title)}>
                <HSEField {...f("topic")} full label={pick(T.topic)} placeholder={pick(T.topicPh)} />
                <HSEField {...f("date")} type="date" label={pick(T.date)} />
                <HSEField {...f("startTime")} type="time" label={pick(T.startTime)} />
                <HSEField {...f("endTime")} type="time" label={pick(T.endTime)} />
                <HSEField k="duration" label={pick(T.duration)} value={duration ? `${duration} min` : ""} readOnly lang={lang} />
                <HSEField {...f("location")} type="select" label={pick(T.location)}
                  options={SITE_LOCATIONS.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("area")} label={pick(T.area)} />
                <HSEField {...f("conductor")} label={pick(T.conductor)} />
                <HSEField {...f("conductorRole")} label={pick(T.conductorRole)} />
              </HSEPanel>

              <HSEPanel title={pick(T.s2Title)}>
                <HSEField {...f("minutes")} type="textarea" rows={4} full label={pick(T.minutes)} />
                <HSEField {...f("safetyReminder")} type="textarea" full label={pick(T.safetyReminder)} />
                <HSEField {...f("hazardsCovered")} type="textarea" label={pick(T.hazardsCovered)} />
                <HSEField {...f("ppeRequired")} type="textarea" label={pick(T.ppeRequired)} />
                <HSEField {...f("qa")} type="textarea" full label={pick(T.qa)} />
              </HSEPanel>

              <div className="ph-toolbar">
                <div className="ph-fieldbar-title" style={{ margin: 0 }}>{pick(T.s3Title)} · {pick(T.totalAtt)}: {attCount}</div>
                <button type="button" onClick={addAtt} className="ph-btn ph-btn-ghost">{pick(T.addAtt)}</button>
              </div>
              <div className="ph-table-wrap" data-hk-field="attendees"
                style={{ marginBottom: 8, borderColor: validation.errors.attendees ? "#dc2626" : undefined }}>
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}>#</th>
                      <th>{pick(T.attName)}</th>
                      <th>{pick(T.attBadge)}</th>
                      <th>{pick(T.attDept)}</th>
                      <th style={{ width: 90 }}>{pick(T.attSign)}</th>
                      <th style={{ width: 52 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {(draft.attendees || []).map((a, i) => (
                      <tr key={i}>
                        <td className="ph-num">{i + 1}</td>
                        <td><input className="ph-input" maxLength={80} value={a.name} onChange={(e) => setAtt(i, "name", e.target.value)} /></td>
                        <td><input className="ph-input" maxLength={20} value={a.badge} onChange={(e) => setAtt(i, "badge", e.target.value)} /></td>
                        <td><input className="ph-input" maxLength={60} value={a.dept} onChange={(e) => setAtt(i, "dept", e.target.value)} /></td>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" style={{ width: 20, height: 20, accentColor: "#0f766e" }}
                            checked={!!a.signed} onChange={(e) => setAtt(i, "signed", e.target.checked)} />
                        </td>
                        <td>
                          <button type="button" className="ph-btn-icon ph-btn-danger" title={pick(T.removeAtt)}
                            disabled={(draft.attendees || []).length === 1} onClick={() => removeAtt(i)}>×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {validation.errors.attendees && <div className="hk-err" style={{ marginBottom: 14 }}>{validation.errors.attendees}</div>}

              <HSEPanel title={pick(T.s4Title)}>
                <HSEField {...f("preparedBy")} label={pick(T.preparedBy)} />
                <HSEField {...f("safetySupervisor")} label={pick(T.safetySupervisor)} />
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
                  <th style={thStyle}>{pick(T.cols.date)}</th>
                  <th style={thStyle}>{pick(T.cols.topic)}</th>
                  <th style={thStyle}>{pick(T.cols.location)}</th>
                  <th style={thStyle}>{pick(T.cols.attendees)}</th>
                  <th style={thStyle}>{pick(T.cols.duration)}</th>
                  <th style={thStyle}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const loc = SITE_LOCATIONS.find((s) => s.v === it.location);
                  const att = (it.attendees || []).filter((a) => a.name?.trim()).length;
                  const dur = calcDuration(it.startTime, it.endTime);
                  return (
                    <tr key={it.id}>
                      <td style={{ ...tdStyle, fontWeight: 800 }}>{it.meetingNo}</td>
                      <td style={tdStyle}>{it.date}</td>
                      <td style={tdStyle}>{it.topic}</td>
                      <td style={tdStyle}>{loc ? loc[lang] : it.location}</td>
                      <td style={tdStyle}>{att}</td>
                      <td style={tdStyle}>{dur ? `${dur} min` : "—"}</td>
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

              <div style={{ padding: 14, background: "#fff7ed", borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontSize: 18, fontWeight: 950, color: HSE_COLORS.primaryDark, marginBottom: 8 }}>{viewing.topic}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 6, fontSize: 13 }}>
                  <div><b>{pick(T.meetingNo)}: </b>{viewing.meetingNo}</div>
                  <div><b>{pick(T.date)}: </b>{viewing.date}</div>
                  <div><b>{pick(T.startTime)}: </b>{viewing.startTime} - {viewing.endTime}</div>
                  <div><b>{pick(T.location)}: </b>{(SITE_LOCATIONS.find(s => s.v === viewing.location) || { [lang]: viewing.location })[lang]}</div>
                  <div><b>{pick(T.conductor)}: </b>{viewing.conductor}</div>
                  <div><b>{pick(T.conductorRole)}: </b>{viewing.conductorRole}</div>
                </div>
              </div>

              {viewing.minutes && <ViewBlock title={pick(T.minutes)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.minutes}</div></ViewBlock>}
              {viewing.safetyReminder && <ViewBlock title={pick(T.safetyReminder)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13, fontWeight: 700 }}>{viewing.safetyReminder}</div></ViewBlock>}
              {viewing.hazardsCovered && <ViewBlock title={pick(T.hazardsCovered)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.hazardsCovered}</div></ViewBlock>}
              {viewing.ppeRequired && <ViewBlock title={pick(T.ppeRequired)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.ppeRequired}</div></ViewBlock>}
              {viewing.qa && <ViewBlock title={pick(T.qa)}><div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{viewing.qa}</div></ViewBlock>}

              <SectionHeader title={pick(T.s3Title)} />
              <div style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>{pick(T.attName)}</th>
                      <th style={thStyle}>{pick(T.attBadge)}</th>
                      <th style={thStyle}>{pick(T.attDept)}</th>
                      <th style={thStyle}>{pick(T.attSign)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewing.attendees || []).map((a, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                        <td style={tdStyle}>{a.name || "—"}</td>
                        <td style={tdStyle}>{a.badge || "—"}</td>
                        <td style={tdStyle}>{a.dept || "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "center", fontSize: 16, fontWeight: 800, color: a.signed ? "#166534" : "#b91c1c" }}>{a.signed ? "✓" : "✗"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{
                marginTop: 24, paddingTop: 16, borderTop: `2px dashed ${HSE_COLORS.border}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14,
              }}>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.preparedBy)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.preparedBy || "_______________"}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{pick(T.safetySupervisor)}</div>
                  <div style={{ borderTop: "1px solid #94a3b8", marginTop: 30, paddingTop: 4, fontSize: 13, fontWeight: 800 }}>{viewing.safetySupervisor || "_______________"}</div>
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

function ViewBlock({ title, children }) {
  return (
    <div style={{ marginBottom: 14, padding: 12, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
      <div style={{ fontWeight: 950, marginBottom: 10, color: HSE_COLORS.primaryDark, fontSize: 14 }}>{title}</div>
      {children}
    </div>
  );
}
