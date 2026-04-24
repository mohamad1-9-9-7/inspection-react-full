// src/pages/monitor/branches/pos19/pos19_inputs/WoodenItemsConditionChecklistInput.jsx
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

const TYPE     = "pos19_wooden_items_condition";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/WOD/11";

const CHECK_COLS = [
  { key: "noSplinters",    label: "Free from splinters / cracks" },
  { key: "noDiscolouration", label: "No discolouration / mould" },
  { key: "cleanDry",       label: "Visibly clean and dry" },
  { key: "structurallyOK", label: "Structurally sound" },
];

function emptyRow() {
  return {
    date: "",
    woodenItem: "",
    section: "",
    noSplinters: "",
    noDiscolouration: "",
    cleanDry: "",
    structurallyOK: "",
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

export default function WoodenItemsConditionChecklistInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [headerSection, setHeaderSection] = useState("");
  const [rows, setRows]                   = useState(() => Array.from({ length: 5 }, () => emptyRow()));
  const [verifiedBy, setVerifiedBy]       = useState("");
  const [revDate, setRevDate]             = useState("");
  const [revNo, setRevNo]                 = useState("");
  const [saving, setSaving]               = useState(false);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

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
    padding: "4px 6px", display: "block",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
  };

  const colDefs = useMemo(() => ([
    <col key="date"   style={{ width: 120 }} />,
    <col key="item"   style={{ width: 210 }} />,
    <col key="sec"    style={{ width: 160 }} />,
    ...CHECK_COLS.map((_, i) => <col key={`ck${i}`} style={{ width: 160 }} />),
    <col key="ca"     style={{ width: 220 }} />,
    <col key="chk"    style={{ width: 140 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  async function handleSave() {
    const entries = rows.filter(r =>
      Object.values(r).some(v => String(v || "").trim() !== "")
    );
    if (!entries.length) { alert("لا يوجد بيانات للحفظ."); return; }

    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      reportDate, month: monthText, section: headerSection,
      entries, verifiedBy, revDate, revNo,
      savedAt: Date.now(),
    };
    try {
      setSaving(true);
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
        title="Wooden Items Condition Monitoring Checklist (Weekly)"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
          { label: "Section", value: headerSection, onChange: setHeaderSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Legend */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          LEGEND: (√) – Satisfactory & (✗) – Needs Improvement
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Wooden Item</th>
              <th style={thCell}>Section</th>
              {CHECK_COLS.map(c => <th key={c.key} style={thCell}>{c.label}</th>)}
              <th style={thCell}>Corrective Action{"\n"}(if any)</th>
              <th style={thCell}>Checked by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}><input type="date" value={r.date} onChange={e=>updateRow(idx,"date",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.woodenItem} onChange={e=>updateRow(idx,"woodenItem",e.target.value)} style={inputStyle} placeholder="e.g., Cutting board" /></td>
                <td style={tdCell}><input type="text" value={r.section} onChange={e=>updateRow(idx,"section",e.target.value)} style={inputStyle} placeholder="Area/zone" /></td>
                {CHECK_COLS.map(c => (
                  <td style={tdCell} key={c.key}>
                    <select value={r[c.key]} onChange={e=>updateRow(idx,c.key,e.target.value)} style={inputStyle} title="√ = Satisfactory, ✗ = Needs Improvement">
                      <option value=""></option>
                      <option value="√">√</option>
                      <option value="✗">✗</option>
                    </select>
                  </td>
                ))}
                <td style={tdCell}><input type="text" value={r.correctiveAction} onChange={e=>updateRow(idx,"correctiveAction",e.target.value)} style={inputStyle} placeholder="Action (if any)" /></td>
                <td style={tdCell}><input type="text" value={r.checkedBy} onChange={e=>updateRow(idx,"checkedBy",e.target.value)} style={inputStyle} placeholder="Name" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Wooden Items Checklist"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ marginTop:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Verified by:</strong>
          <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} style={{ flex:"0 1 360px", border:"none", borderBottom:"2px solid #1f3b70", padding:"4px 6px", outline:"none", fontSize:12, color:"#0b1f4d" }} />
        </div>
        <div style={{ marginTop:8, fontSize:11, color:"#0b1f4d" }}>
          <strong>NOTE:</strong> Any wooden items found defective, cracked, or not within the standards should be removed from the section immediately.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12, alignItems:"center", fontSize:12 }}>
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
    </div>
  );
}
