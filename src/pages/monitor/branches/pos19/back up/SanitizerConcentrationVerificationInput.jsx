// src/pages/monitor/branches/pos19/pos19_inputs/SanitizerConcentrationVerificationInput.jsx
import React, { useMemo, useState } from "react";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_sanitizer_concentration";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/SAN/08";

function emptyRow() {
  return {
    date: "",
    time: "",
    sanitizerType: "",
    location: "",
    targetConc: "200 ppm",
    actualConc: "",
    result: "",        // Pass / Fail
    correctiveAction: "",
    checkedBy: "",
  };
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

export default function SanitizerConcentrationVerificationInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [section, setSection]       = useState("");
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
    <col key="date"    style={{ width: 110 }} />,
    <col key="time"    style={{ width: 90 }} />,
    <col key="type"    style={{ width: 160 }} />,
    <col key="loc"     style={{ width: 160 }} />,
    <col key="target"  style={{ width: 110 }} />,
    <col key="actual"  style={{ width: 110 }} />,
    <col key="result"  style={{ width: 90 }} />,
    <col key="ca"      style={{ width: 200 }} />,
    <col key="chk"     style={{ width: 130 }} />,
    <col key="del"     style={{ width: 70 }} />,
  ]), []);

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r => r.sanitizerType.trim() !== "" || r.location.trim() !== "");
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }

    // تحقق: Fail يستلزم corrective action
    for (const r of entries) {
      if (r.result === "Fail" && !r.correctiveAction.trim()) {
        alert("يوجد صف نتيجته Fail بدون Corrective Action. الرجاء التعبئة.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      section, reportDate, entries, checkedBy, verifiedBy, revDate, revNo,
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
          <div style={{ fontWeight:800, fontSize:16 }}>Sanitizer Concentration Verification Log</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"auto 190px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{FORM_REF}</div>
          <div>Section :</div><input value={section} onChange={e=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Classification :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>Official</div>
          <div>Date :</div><input type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Branch :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{BRANCH}</div>
        </div>
      </div>

      {/* Note strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          Target Concentration: 200 ppm — Acceptable Range: 100–400 ppm
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Time</th>
              <th style={thCell}>Sanitizer{"\n"}Type</th>
              <th style={thCell}>Location /{ "\n"}Area</th>
              <th style={thCell}>Target{"\n"}Conc. (ppm)</th>
              <th style={thCell}>Actual{"\n"}Conc. (ppm)</th>
              <th style={thCell}>Result{"\n"}(Pass/Fail)</th>
              <th style={thCell}>Corrective{"\n"}Action</th>
              <th style={thCell}>Checked{"\n"}by</th>
              <th style={thCell}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}><input type="date" value={r.date} onChange={e=>updateRow(i,"date",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="time" value={r.time} onChange={e=>updateRow(i,"time",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.sanitizerType} onChange={e=>updateRow(i,"sanitizerType",e.target.value)} style={inputStyle} placeholder="e.g., Chlorine" /></td>
                <td style={tdCell}><input type="text" value={r.location} onChange={e=>updateRow(i,"location",e.target.value)} style={inputStyle} placeholder="Area" /></td>
                <td style={tdCell}><input type="text" value={r.targetConc} onChange={e=>updateRow(i,"targetConc",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}>
                  <input
                    type="number" step="1"
                    value={r.actualConc}
                    onChange={e=>updateRow(i,"actualConc",e.target.value)}
                    style={{ ...inputStyle, background: r.result==="Fail" ? "#fde8e8" : "#fff" }}
                    placeholder="ppm"
                  />
                </td>
                <td style={{ ...tdCell, background: r.result==="Pass" ? "#e7f7ec" : r.result==="Fail" ? "#fde8e8" : "" }}>
                  <select value={r.result} onChange={e=>updateRow(i,"result",e.target.value)} style={inputStyle}>
                    <option value=""></option>
                    <option value="Pass">Pass</option>
                    <option value="Fail">Fail</option>
                  </select>
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.correctiveAction} onChange={e=>updateRow(i,"correctiveAction",e.target.value)} style={{ ...inputStyle, background: r.result==="Fail" ? "#fff7ed" : "#fff" }} placeholder={r.result==="Fail" ? "Required" : "If any"} />
                </td>
                <td style={tdCell}><input type="text" value={r.checkedBy} onChange={e=>updateRow(i,"checkedBy",e.target.value)} style={inputStyle} /></td>
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
          {saving ? "Saving…" : "Save Sanitizer Log"}
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
