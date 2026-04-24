// src/pages/monitor/branches/pos19/pos19_inputs/CookingTemperatureMonitoringInput.jsx
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

const TYPE     = "pos19_cooking_temperature";
const BRANCH   = "POS 19";
const FORM_REF = "FSM-QM/REC/CR";

// 3 منتجات في كل صف (كما في النموذج الورقي)
const PRODUCT_SLOTS = [
  { key: "p1", label: "Product 1" },
  { key: "p2", label: "Product 2" },
  { key: "p3", label: "Product 3" },
];

function emptyRow() {
  const base = {
    date: "",
    comment: "",
    monitoredBy: "",
  };
  PRODUCT_SLOTS.forEach(s => {
    base[`${s.key}_name`] = "";
    base[`${s.key}_time`] = "";
    base[`${s.key}_temp`] = "";
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

export default function CookingTemperatureMonitoringInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [area, setArea]             = useState("Central Kitchen");
  const [issuedBy, setIssuedBy]     = useState("MOHAMAD ABDULLAH");
  const [controllingOfficer, setControllingOfficer] = useState("Chef");
  const [approvedBy, setApprovedBy] = useState("Hussam O Sarhan");
  const [issueDate, setIssueDate]   = useState("08/11/2023");
  const [revisionNo, setRevisionNo] = useState("01");
  const [rows, setRows]             = useState(() => Array.from({ length: 5 }, () => emptyRow()));
  const [verifiedBy, setVerifiedBy] = useState("");
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

  const colDefs = useMemo(() => {
    const arr = [<col key="date" style={{ width: 110 }} />];
    PRODUCT_SLOTS.forEach((_, i) => {
      arr.push(<col key={`p${i}name`} style={{ width: 150 }} />);
      arr.push(<col key={`p${i}time`} style={{ width: 80 }} />);
      arr.push(<col key={`p${i}temp`} style={{ width: 80 }} />);
    });
    arr.push(<col key="cmt" style={{ width: 160 }} />);
    arr.push(<col key="mon" style={{ width: 130 }} />);
    arr.push(<col key="del" style={{ width: 70 }} />);
    return arr;
  }, []);

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r =>
      PRODUCT_SLOTS.some(s => String(r[`${s.key}_name`] || "").trim() !== "")
    );
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }
    setSaving(true);
    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      documentTitle: "Cooking Record",
      area, issuedBy, controllingOfficer, approvedBy,
      issueDate, revisionNo,
      reportDate, entries, verifiedBy,
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
        title="Cooking Record — Cooking Temperature Monitoring Record"
        subtitle="Restaurant: Al Mawashi – Braai Restaurant LLC"
        titleAr="سجل مراقبة درجة حرارة الطبخ"
        fields={[
          { label: "Document Title", value: "Cooking Record" },
          { label: "Document No",   value: FORM_REF },
          { label: "Issue Date",    value: issueDate, onChange: setIssueDate },
          { label: "Revision No",   value: revisionNo, onChange: setRevisionNo },
          { label: "Branch",        value: BRANCH },
          { label: "Area",          value: area, onChange: setArea },
          { label: "Issued By",     value: issuedBy, onChange: setIssuedBy },
          { label: "Controlling Officer", value: controllingOfficer, onChange: setControllingOfficer },
          { label: "Approved By",   value: approvedBy, onChange: setApprovedBy },
          { label: "Report Date",   type: "date", value: reportDate, onChange: setReportDate },
        ]}
      />

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell} rowSpan={2}>Date{"\n"}تاريخ</th>
              {PRODUCT_SLOTS.map(s => (
                <th key={s.key} style={thCell} colSpan={3}>{s.label}</th>
              ))}
              <th style={thCell} rowSpan={2}>Comment{"\n"}تعليق</th>
              <th style={thCell} rowSpan={2}>Monitored By{"\n"}مراقب بواسطة</th>
              <th style={thCell} rowSpan={2}>—</th>
            </tr>
            <tr>
              {PRODUCT_SLOTS.map(s => (
                <React.Fragment key={s.key}>
                  <th style={thCell}>Product Name{"\n"}اسم الطعام</th>
                  <th style={thCell}>Time{"\n"}وقت</th>
                  <th style={thCell}>Temp °C{"\n"}درجة حرارة</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <input type="date" value={r.date} onChange={e=>updateRow(i,"date",e.target.value)} style={inputStyle} />
                </td>
                {PRODUCT_SLOTS.map(s => {
                  const tempVal = r[`${s.key}_temp`];
                  const isLow = tempVal && parseFloat(tempVal) < 75;
                  return (
                    <React.Fragment key={s.key}>
                      <td style={tdCell}>
                        <input type="text" value={r[`${s.key}_name`]} onChange={e=>updateRow(i,`${s.key}_name`,e.target.value)} style={inputStyle} placeholder="Product" />
                      </td>
                      <td style={tdCell}>
                        <input type="time" value={r[`${s.key}_time`]} onChange={e=>updateRow(i,`${s.key}_time`,e.target.value)} style={inputStyle} />
                      </td>
                      <td style={{ ...tdCell, background: isLow ? "#fde8e8" : "" }}>
                        <input
                          type="number" step="0.1"
                          value={tempVal}
                          onChange={e=>updateRow(i,`${s.key}_temp`,e.target.value)}
                          style={{ ...inputStyle, background: isLow ? "#fde8e8" : "#fff" }}
                          placeholder="°C"
                        />
                      </td>
                    </React.Fragment>
                  );
                })}
                <td style={tdCell}><input type="text" value={r.comment} onChange={e=>updateRow(i,"comment",e.target.value)} style={inputStyle} placeholder="Comment" /></td>
                <td style={tdCell}><input type="text" value={r.monitoredBy} onChange={e=>updateRow(i,"monitoredBy",e.target.value)} style={inputStyle} /></td>
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
          {saving ? "Saving…" : "Save Cooking Record"}
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginTop:16, border:"1px solid #1f3b70", borderRadius:8, padding:"10px 14px", background:"#f8fafc", fontSize:12, color:"#0b1f4d" }}>
        <div style={{ fontWeight:800, marginBottom:6 }}>NOTES:</div>
        <ol style={{ margin:0, paddingInlineStart:20, lineHeight:1.7 }}>
          <li>Food Must be first cooked until core temp reached &lt; 75°C or reheated core temp above 75°C</li>
          <li>Transfer to hot holding equipment immediately after cooking or reheating</li>
          <li>Maintain product at 60 Deg C (140 Deg F) or hotter at all times</li>
          <li>Take temperature of food at least once per shift</li>
        </ol>
      </div>

      {/* Footer */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:16, fontSize:12 }}>
        <span style={{ fontWeight:700 }}>Verified By :</span>
        <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} style={{ ...inputStyle, maxWidth:260 }} />
      </div>
    </div>
  );
}
