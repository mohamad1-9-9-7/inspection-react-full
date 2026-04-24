// src/pages/monitor/branches/pos19/pos19_inputs/TemperatureMonitoringLogInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_temperature_monitoring";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/TMP/09";

// قراءات يومية — صباح / ظهر / مساء
const READINGS = [
  { key: "am", label: "Morning" },
  { key: "pm", label: "Midday" },
  { key: "ev", label: "Evening" },
];

const UNIT_TYPES = [
  { value: "chiller",  label: "Chiller",  limit: "≤ 5°C" },
  { value: "freezer",  label: "Freezer",  limit: "≤ -18°C" },
  { value: "ambient",  label: "Ambient",  limit: "≤ 25°C" },
];

function emptyRow() {
  const base = {
    equipment: "",
    unitType: "chiller",
    targetTemp: "≤ 5°C",
    correctiveAction: "",
    checkedBy: "",
  };
  READINGS.forEach(r => {
    base[`${r.key}_time`] = "";
    base[`${r.key}_temp`] = "";
  });
  return base;
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

function isBreach(unitType, temp) {
  if (temp === "" || temp === undefined || temp === null) return false;
  const v = parseFloat(temp);
  if (isNaN(v)) return false;
  if (unitType === "chiller")  return v > 5;
  if (unitType === "freezer")  return v > -18;
  if (unitType === "ambient")  return v > 25;
  return false;
}

export default function TemperatureMonitoringLogInput() {
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
      // إذا تغيّر unitType، حدّث targetTemp تلقائيًا
      if (key === "unitType") {
        const found = UNIT_TYPES.find(u => u.value === val);
        next[idx] = { ...next[idx], [key]: val, targetTemp: found ? found.limit : "" };
      } else {
        next[idx] = { ...next[idx], [key]: val };
      }
      return next;
    });
  }
  function addRow()    { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(i){ setRows(prev => prev.filter((_, idx) => idx !== i)); }

  const colDefs = useMemo(() => {
    const arr = [
      <col key="equip"  style={{ width: 180 }} />,
      <col key="type"   style={{ width: 110 }} />,
      <col key="target" style={{ width: 100 }} />,
    ];
    READINGS.forEach((_, i) => {
      arr.push(<col key={`r${i}time`} style={{ width: 90 }} />);
      arr.push(<col key={`r${i}temp`} style={{ width: 90 }} />);
    });
    arr.push(<col key="ca"  style={{ width: 200 }} />);
    arr.push(<col key="chk" style={{ width: 120 }} />);
    arr.push(<col key="del" style={{ width: 70 }} />);
    return arr;
  }, []);

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r => r.equipment.trim() !== "");
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }

    for (const r of entries) {
      const hasBreach = READINGS.some(rd => isBreach(r.unitType, r[`${rd.key}_temp`]));
      if (hasBreach && !r.correctiveAction.trim()) {
        alert("يوجد صف تجاوز درجة الحرارة المحددة بدون Corrective Action.");
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
      <ReportHeader
        title="Temperature Monitoring Log"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Limits strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          Critical Limits: Chiller ≤ 5°C &nbsp;|&nbsp; Freezer ≤ -18°C &nbsp;|&nbsp; Ambient ≤ 25°C
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell} rowSpan={2}>Equipment /{ "\n"}Location</th>
              <th style={thCell} rowSpan={2}>Unit{"\n"}Type</th>
              <th style={thCell} rowSpan={2}>Target{"\n"}Temp</th>
              {READINGS.map(r => <th key={r.key} style={thCell} colSpan={2}>{r.label}</th>)}
              <th style={thCell} rowSpan={2}>Corrective{"\n"}Action</th>
              <th style={thCell} rowSpan={2}>Checked{"\n"}by</th>
              <th style={thCell} rowSpan={2}>—</th>
            </tr>
            <tr>
              {READINGS.map(r => (
                <React.Fragment key={r.key}>
                  <th style={thCell}>Time</th>
                  <th style={thCell}>Temp (°C)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}><input type="text" value={r.equipment} onChange={e=>updateRow(i,"equipment",e.target.value)} style={inputStyle} placeholder="e.g., Chiller 1" /></td>
                <td style={tdCell}>
                  <select value={r.unitType} onChange={e=>updateRow(i,"unitType",e.target.value)} style={inputStyle}>
                    {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </td>
                <td style={tdCell}><input type="text" value={r.targetTemp} onChange={e=>updateRow(i,"targetTemp",e.target.value)} style={inputStyle} /></td>
                {READINGS.map(rd => {
                  const breach = isBreach(r.unitType, r[`${rd.key}_temp`]);
                  return (
                    <React.Fragment key={rd.key}>
                      <td style={tdCell}><input type="time" value={r[`${rd.key}_time`]} onChange={e=>updateRow(i,`${rd.key}_time`,e.target.value)} style={inputStyle} /></td>
                      <td style={{ ...tdCell, background: breach ? "#fde8e8" : "" }}>
                        <input type="number" step="0.1" value={r[`${rd.key}_temp`]} onChange={e=>updateRow(i,`${rd.key}_temp`,e.target.value)} style={{ ...inputStyle, background: breach ? "#fde8e8" : "#fff" }} placeholder="°C" />
                      </td>
                    </React.Fragment>
                  );
                })}
                <td style={tdCell}><input type="text" value={r.correctiveAction} onChange={e=>updateRow(i,"correctiveAction",e.target.value)} style={inputStyle} placeholder="Action (if any)" /></td>
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
          {saving ? "Saving…" : "Save Temperature Log"}
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
