// src/pages/monitor/branches/sweets/TrainingRecordInput.jsx
// A single focused Internal Training record for the sweets company: one
// training session = one report (topic, trainer, date, attendees + signatures).
// Isolated under the sweets_training_record report type. Self-contained: posts
// straight to /api/reports, no router needed, so it renders inside the
// company-app shell like the other sweets reports.

import React, { useState } from "react";
import API_BASE from "../../../../config/api";
import { eventReportDate } from "./sweetsRecord";
import { Bi, bi } from "./bilingual";

const TYPE = "sweets_training_record";
const CATEGORIES = ["Induction", "Food Safety", "HACCP", "Personal Hygiene", "BFS", "PIC", "EFST", "Health & Safety", "Other"];

const wrap = { minHeight: "100%", padding: "1.4rem clamp(1rem,3vw,2.5rem)", background: "#f6f7fb", fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif', color: "#0f172a" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1.25rem", marginBottom: 16, boxShadow: "0 8px 24px rgba(15,23,42,.05)" };
const label = { display: "block", fontWeight: 800, fontSize: 12.5, color: "#334155", marginBottom: 5 };
const input = { width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "9px 11px", fontSize: 14, outline: "none", background: "#f8fafc" };
const th = { border: "1px solid #cbd5e1", background: "#f1f5f9", padding: "8px", fontSize: 12.5, fontWeight: 800, textAlign: "left" };
const td = { border: "1px solid #e2e8f0", padding: 6 };
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer" });

const blankAttendee = () => ({ name: "", empNo: "", department: "", signature: "" });

export default function TrainingRecordInput() {
  const [meta, setMeta] = useState({
    title: "",
    category: "",
    trainer: "",
    date: "",
    location: "",
    durationHours: "",
    objective: "",
    notes: "",
  });
  const [attendees, setAttendees] = useState([blankAttendee(), blankAttendee(), blankAttendee()]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const setField = (k, v) => { setMeta((p) => ({ ...p, [k]: v })); setMsg({ type: "", text: "" }); };
  const setAtt = (i, k, v) => setAttendees((p) => p.map((a, idx) => (idx === i ? { ...a, [k]: v } : a)));
  const addRow = () => setAttendees((p) => [...p, blankAttendee()]);
  const removeRow = (i) => setAttendees((p) => p.filter((_, idx) => idx !== i));

  async function handleSave() {
    if (!meta.title.trim()) return setMsg({ type: "error", text: "Please enter the training title. · أدخل عنوان التدريب." });
    if (!meta.date) return setMsg({ type: "error", text: "Please enter the training date. · أدخل تاريخ التدريب." });
    const present = attendees.filter((a) => a.name.trim());
    if (!present.length) return setMsg({ type: "error", text: "Please add at least one attendee. · أضف حاضراً واحداً على الأقل." });

    setSaving(true);
    setMsg({ type: "", text: "" });
    try {
      const payload = {
        ...meta,
        // Several sessions can run on one day: unique key, plain day in `date`.
        reportDate: eventReportDate(meta.date),
        attendees: present,
        attendeeCount: present.length,
        savedAt: new Date().toISOString(),
      };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMsg({ type: "ok", text: "✅ Training record saved successfully. · تم حفظ سجل التدريب بنجاح." });
      setMeta({ title: "", category: "", trainer: "", date: "", location: "", durationHours: "", objective: "", notes: "" });
      setAttendees([blankAttendee(), blankAttendee(), blankAttendee()]);
    } catch (e) {
      setMsg({ type: "error", text: "Failed to save. Please try again. · فشل الحفظ، حاول مجدداً." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 900 }}>🎓 <Bi en="Internal Training — New Record" ar="التدريب الداخلي — سجل جديد" /></h2>
        <p style={{ margin: "0 0 16px", color: "#64748b", fontWeight: 600, fontSize: 13.5 }}>
          <Bi en="Record a training session, its trainer, and the attendees who signed in." ar="سجّل جلسة التدريب والمدرب والحضور الموقّعين." />
        </p>

        {msg.text && (
          <div style={{ ...card, padding: "11px 14px", background: msg.type === "ok" ? "#ecfdf5" : "#fef2f2", border: `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}`, color: msg.type === "ok" ? "#065f46" : "#991b1b", fontWeight: 700 }}>
            {msg.text}
          </div>
        )}

        {/* Session details */}
        <div style={card}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={label}><Bi en="Training Title *" /></span>
              <input style={input} value={meta.title} onChange={(e) => setField("title", e.target.value)} />
            </div>
            <div>
              <span style={label}><Bi en="Category" /></span>
              <select style={input} value={meta.category} onChange={(e) => setField("category", e.target.value)}>
                <option value="">{bi("-- Select --", "-- اختر --")}</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{bi(c)}</option>)}
              </select>
            </div>
            <div>
              <span style={label}><Bi en="Trainer" /></span>
              <input style={input} value={meta.trainer} onChange={(e) => setField("trainer", e.target.value)} />
            </div>
            <div>
              <span style={label}><Bi en="Date *" /></span>
              <input type="date" style={input} value={meta.date} onChange={(e) => setField("date", e.target.value)} />
            </div>
            <div>
              <span style={label}><Bi en="Location" /></span>
              <input style={input} value={meta.location} onChange={(e) => setField("location", e.target.value)} />
            </div>
            <div>
              <span style={label}><Bi en="Duration (hours)" /></span>
              <input type="number" min="0" step="0.5" style={input} value={meta.durationHours} onChange={(e) => setField("durationHours", e.target.value)} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={label}><Bi en="Objective" /></span>
              <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} value={meta.objective} onChange={(e) => setField("objective", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Attendees */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}><Bi en="Attendees" ar="الحضور" /></h3>
            <button onClick={addRow} style={btn("#0f766e")}><Bi en="+ Add Row" /></button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 620 }}>
              <thead>
                <tr>
                  <th style={{ ...th, width: 40 }}>#</th>
                  <th style={th}><Bi en="Name" stack /></th>
                  <th style={th}><Bi en="Emp No" ar="الرقم الوظيفي" stack /></th>
                  <th style={th}><Bi en="Department" stack /></th>
                  <th style={th}><Bi en="Signature" stack /></th>
                  <th style={{ ...th, width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a, i) => (
                  <tr key={i}>
                    <td style={{ ...td, textAlign: "center", color: "#64748b" }}>{i + 1}</td>
                    <td style={td}><input style={{ ...input, border: "1px solid #e2e8f0" }} value={a.name} onChange={(e) => setAtt(i, "name", e.target.value)} /></td>
                    <td style={td}><input style={{ ...input, border: "1px solid #e2e8f0" }} value={a.empNo} onChange={(e) => setAtt(i, "empNo", e.target.value)} /></td>
                    <td style={td}><input style={{ ...input, border: "1px solid #e2e8f0" }} value={a.department} onChange={(e) => setAtt(i, "department", e.target.value)} /></td>
                    <td style={td}><input style={{ ...input, border: "1px solid #e2e8f0" }} value={a.signature} onChange={(e) => setAtt(i, "signature", e.target.value)} placeholder="Signed / name · التوقيع / الاسم" /></td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {attendees.length > 1 && (
                        <button onClick={() => removeRow(i)} style={{ ...btn("#ef4444"), padding: "6px 10px" }}>✕</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Notes + save */}
        <div style={card}>
          <span style={label}><Bi en="Notes" /></span>
          <textarea style={{ ...input, minHeight: 70, resize: "vertical" }} value={meta.notes} onChange={(e) => setField("notes", e.target.value)} />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <button onClick={handleSave} disabled={saving} style={{ ...btn("#be185d"), opacity: saving ? 0.8 : 1 }}>
              {saving ? <Bi en="Saving…" /> : <>💾 <Bi en="Save Training Record" ar="حفظ سجل التدريب" /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
