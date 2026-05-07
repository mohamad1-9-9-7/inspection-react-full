// src/pages/hse/HSEToolboxMeeting.jsx
// F-29: محضر اجتماع Toolbox للسلامة — Tool Box Meeting Minutes (SBG-HSE-011)

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO, nowHHMM,
  loadLocal, appendLocal, deleteLocal, SITE_LOCATIONS,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

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

export default function HSEToolboxMeeting() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [viewing, setViewing] = useState(null);

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);
  function printReport() { window.print(); }

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

  function save() {
    if (!draft.topic.trim()) { alert(pick(T.needTopic)); return; }
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => setTab("new")}>{pick(T.newMeeting)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        {tab === "new" && (
          <div style={cardStyle}>
            <SectionHeader title={pick(T.s1Title)} />
            <div>
              <label style={labelStyle}>{pick(T.topic)}</label>
              <input type="text" value={draft.topic} placeholder={pick(T.topicPh)} onChange={(e) => setDraft({ ...draft, topic: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.meetingNo)}</label><input type="text" value={draft.meetingNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.date)}</label><input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.startTime)}</label><input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.endTime)}</label><input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.duration)}</label><input type="text" value={duration ? `${duration} min` : ""} readOnly style={{ ...inputStyle, background: "#f1f5f9" }} /></div>
              <div>
                <label style={labelStyle}>{pick(T.location)}</label>
                <select value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.area)}</label><input type="text" value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.conductor)}</label><input type="text" value={draft.conductor} onChange={(e) => setDraft({ ...draft, conductor: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.conductorRole)}</label><input type="text" value={draft.conductorRole} onChange={(e) => setDraft({ ...draft, conductorRole: e.target.value })} style={inputStyle} /></div>
            </div>

            <SectionHeader title={pick(T.s2Title)} />
            <div>
              <label style={labelStyle}>{pick(T.minutes)}</label>
              <textarea value={draft.minutes} onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} style={{ ...inputStyle, minHeight: 100 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.safetyReminder)}</label>
              <textarea value={draft.safetyReminder} onChange={(e) => setDraft({ ...draft, safetyReminder: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginTop: 10 }}>
              <div><label style={labelStyle}>{pick(T.hazardsCovered)}</label><textarea value={draft.hazardsCovered} onChange={(e) => setDraft({ ...draft, hazardsCovered: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
              <div><label style={labelStyle}>{pick(T.ppeRequired)}</label><textarea value={draft.ppeRequired} onChange={(e) => setDraft({ ...draft, ppeRequired: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} /></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.qa)}</label>
              <textarea value={draft.qa} onChange={(e) => setDraft({ ...draft, qa: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>

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
                    <th style={thStyle}></th>
                  </tr>
                </thead>
                <tbody>
                  {(draft.attendees || []).map((a, i) => (
                    <tr key={i}>
                      <td style={{ ...tdStyle, fontWeight: 800, textAlign: "center" }}>{i + 1}</td>
                      <td style={tdStyle}><input type="text" value={a.name} onChange={(e) => setAtt(i, "name", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><input type="text" value={a.badge} onChange={(e) => setAtt(i, "badge", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                      <td style={tdStyle}><input type="text" value={a.dept} onChange={(e) => setAtt(i, "dept", e.target.value)} style={{ ...inputStyle, padding: "4px 8px", fontSize: 12 }} /></td>
                      <td style={{ ...tdStyle, textAlign: "center" }}><input type="checkbox" checked={!!a.signed} onChange={(e) => setAtt(i, "signed", e.target.checked)} /></td>
                      <td style={tdStyle}>
                        {(draft.attendees || []).length > 1 && (
                          <button type="button" onClick={() => removeAtt(i)} style={{ ...buttonGhost, padding: "3px 8px", fontSize: 11, color: "#b91c1c" }}>{pick(T.removeAtt)}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addAtt} style={{ ...buttonGhost, marginTop: 8, fontSize: 12 }}>{pick(T.addAtt)}</button>
            <div style={{ marginTop: 8, padding: 8, background: "#fff7ed", borderRadius: 8, fontSize: 13, fontWeight: 800 }}>
              {pick(T.totalAtt)}: <b>{attCount}</b>
            </div>

            <SectionHeader title={pick(T.s4Title)} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.preparedBy)}</label><input type="text" value={draft.preparedBy} onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.safetySupervisor)}</label><input type="text" value={draft.safetySupervisor} onChange={(e) => setDraft({ ...draft, safetySupervisor: e.target.value })} style={inputStyle} /></div>
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
