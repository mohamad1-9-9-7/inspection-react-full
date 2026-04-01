// src/pages/monitor/branches/pos19/pos19_inputs/CleaningProgrammeScheduleInput.jsx
import React, { useMemo, useState } from "react";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_cleaning_programme_schedule";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/CPS/12";

const FREQUENCIES = ["Daily", "Weekly", "Monthly", "As needed"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function emptyRow() {
  const base = {
    area: "",
    equipment: "",
    cleaningMethod: "",
    cleaningAgent: "",
    concentration: "",
    frequency: "Daily",
    responsiblePerson: "",
    remarks: "",
  };
  DAYS.forEach(d => (base[`day_${d}`] = ""));
  return base;
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

export default function CleaningProgrammeScheduleInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [section, setSection]       = useState("");
  const [weekNo, setWeekNo]         = useState("");
  const [rows, setRows]             = useState(() => Array.from({ length: 5 }, () => emptyRow()));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [checkedBy, setCheckedBy]   = useState("");
  const [revDate, setRevDate]       = useState("");
  const [revNo, setRevNo]           = useState("");
  const [saving, setSaving]         = useState(false);

  const thCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", whiteSpace: "pre-line",
    fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #c7d2fe", borderRadius: 6,
    padding: "4px 6px", display: "block", minWidth: 0,
  };

  function updateRow(idx, key, val) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }
  function addRow()    { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(i){ setRows(prev => prev.filter((_, idx) => idx !== i)); }

  const colDefs = useMemo(() => ([
    <col key="area"   style={{ width: 140 }} />,
    <col key="equip"  style={{ width: 160 }} />,
    <col key="method" style={{ width: 150 }} />,
    <col key="agent"  style={{ width: 140 }} />,
    <col key="conc"   style={{ width: 100 }} />,
    <col key="freq"   style={{ width: 110 }} />,
    ...DAYS.map(d => <col key={`d_${d}`} style={{ width: 60 }} />),
    <col key="resp"   style={{ width: 140 }} />,
    <col key="rem"    style={{ width: 140 }} />,
    <col key="del"    style={{ width: 70 }} />,
  ]), []);

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r =>
      Object.values(r).some(v => String(v || "").trim() !== "")
    );
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }
    setSaving(true);
    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      section, weekNo, reportDate, entries, checkedBy, verifiedBy, revDate, revNo,
      savedAt: Date.now(),
    };
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:16 }}>Cleaning Programme Schedule</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"auto 190px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{FORM_REF}</div>
          <div>Section :</div><input value={section} onChange={e=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Week No. :</div><input value={weekNo} onChange={e=>setWeekNo(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} placeholder="e.g., W01" />
          <div>Classification :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>Official</div>
          <div>Date :</div><input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Branch :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{BRANCH}</div>
        </div>
      </div>

      {/* Legend strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          LEGEND: (√) – Completed & (✗) – Not Completed / Missed
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Area</th>
              <th style={thCell}>Equipment /{ "\n"}Surface</th>
              <th style={thCell}>Cleaning{"\n"}Method</th>
              <th style={thCell}>Cleaning{"\n"}Agent</th>
              <th style={thCell}>Conc. /{ "\n"}Dilution</th>
              <th style={thCell}>Frequency</th>
              {DAYS.map(d => <th key={d} style={thCell}>{d}</th>)}
              <th style={thCell}>Responsible{"\n"}Person</th>
              <th style={thCell}>Remarks</th>
              <th style={thCell}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}><input type="text" value={r.area} onChange={e=>updateRow(i,"area",e.target.value)} style={inputStyle} placeholder="e.g., Floor" /></td>
                <td style={tdCell}><input type="text" value={r.equipment} onChange={e=>updateRow(i,"equipment",e.target.value)} style={inputStyle} placeholder="e.g., Slicer" /></td>
                <td style={tdCell}><input type="text" value={r.cleaningMethod} onChange={e=>updateRow(i,"cleaningMethod",e.target.value)} style={inputStyle} placeholder="e.g., Scrub & rinse" /></td>
                <td style={tdCell}><input type="text" value={r.cleaningAgent} onChange={e=>updateRow(i,"cleaningAgent",e.target.value)} style={inputStyle} placeholder="e.g., Sanitizer" /></td>
                <td style={tdCell}><input type="text" value={r.concentration} onChange={e=>updateRow(i,"concentration",e.target.value)} style={inputStyle} placeholder="e.g., 200ppm" /></td>
                <td style={tdCell}>
                  <select value={r.frequency} onChange={e=>updateRow(i,"frequency",e.target.value)} style={inputStyle}>
                    {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </td>
                {DAYS.map(d => (
                  <td key={d} style={{ ...tdCell, background: r[`day_${d}`]==="√" ? "#e7f7ec" : r[`day_${d}`]==="✗" ? "#fde8e8" : "" }}>
                    <select value={r[`day_${d}`]} onChange={e=>updateRow(i,`day_${d}`,e.target.value)} style={inputStyle}>
                      <option value=""></option>
                      <option value="√">√</option>
                      <option value="✗">✗</option>
                    </select>
                  </td>
                ))}
                <td style={tdCell}><input type="text" value={r.responsiblePerson} onChange={e=>updateRow(i,"responsiblePerson",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.remarks} onChange={e=>updateRow(i,"remarks",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><button onClick={()=>removeRow(i)} style={btnStyle("#dc2626")}>Del</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addRow}      style={btnStyle("#0ea5e9")}>+ Add Row</button>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Cleaning Schedule"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Checked by:</span>
          <input value={checkedBy} onChange={e=>setCheckedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. Date:</span>
          <input value={revDate} onChange={e=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. No:</span>
          <input value={revNo} onChange={e=>setRevNo(e.target.value)} style={inputStyle} />
        </div>
      </div>
    </div>
  );
}
