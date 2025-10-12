// src/pages/monitor/branches/pos19/pos19_inputs/OilQualityMonitoringInput.jsx
import React, { useMemo, useState } from "react";
import unionLogo from "../../../../../assets/unioncoop-logo.png";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE   = "pos19_oil_quality_monitoring";
const BRANCH = "POS 19";

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #c7d2fe", borderRadius: 6,
  padding: "4px 6px", display: "block", minWidth: 0,
};
const thCell = {
  border: "1px solid #1f3b70",
  padding: "6px 4px",
  textAlign: "center",
  whiteSpace: "pre-line",
  fontWeight: 700,
  background: "#f5f8ff",
  color: "#0b1f4d",
};
const tdCell = {
  border: "1px solid #1f3b70",
  padding: "6px 4px",
  textAlign: "center",
  verticalAlign: "middle",
};

export default function OilQualityMonitoringInput() {
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  // سطر واحد فقط (بسيط)
  const [row, setRow] = useState({ date: "", result: "", action: "", checkedBy: "" });

  // الهيدر/الفوتر
  const [section, setSection]       = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [revDate, setRevDate]       = useState("");
  const [revNo, setRevNo]           = useState("");
  const [saving, setSaving]         = useState(false);

  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);

  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 160 }} />,
    <col key="res"  style={{ width: 420 }} />,
    <col key="act"  style={{ width: 360 }} />,
    <col key="chk"  style={{ width: 180 }} />,
  ]), []);

  function updateRow(key, val) {
    setRow((p) => ({ ...p, [key]: val }));
  }

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ أعلى الصفحة"); return; }

    setSaving(true);

    const entry = {
      date:       row.date || "",
      result:     row.result || "",
      action:     row.action || "",
      checkedBy:  row.checkedBy || "",
    };

    const payload = {
      branch: BRANCH,
      formRef: "UC/HACCP/BR/F15",
      classification: "Official",
      section: section || "",
      reportDate,
      entries: [entry],    // سطر واحد فقط
      verifiedBy,
      revDate,
      revNo,
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
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Union Coop</div>
          <div style={{ fontWeight:800, fontSize:16 }}>Oil Quality Monitoring Form</div>
        </div>

        {/* بيانات الهيدر اليمنى */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 190px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>UC/HACCP/BR/F15</div>
          <div>Section :</div><input value={section} onChange={(e)=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Classification :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>Official</div>
          <div>Date :</div><input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
        </div>
      </div>

      {/* Table */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>RECORD</div>
      </div>

      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Evaluation Results</th>
              <th style={thCell}>Corrective Action</th>
              <th style={thCell}>Checked by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}>
                <input
                  type="date"
                  value={row.date}
                  onChange={(e)=>updateRow("date", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="text"
                  placeholder="Evaluation results"
                  value={row.result}
                  onChange={(e)=>updateRow("result", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="text"
                  placeholder="Corrective action"
                  value={row.action}
                  onChange={(e)=>updateRow("action", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  type="text"
                  placeholder="Checked by"
                  value={row.checkedBy}
                  onChange={(e)=>updateRow("checkedBy", e.target.value)}
                  style={inputStyle}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Oil Quality"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
        <div />
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. Date:</span>
          <input value={revDate} onChange={(e)=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. No:</span>
          <input value={revNo} onChange={(e)=>setRevNo(e.target.value)} style={inputStyle} />
        </div>
      </div>
    </div>
  );
}
