// src/pages/monitor/branches/pos19/pos19_inputs/FoodTemperatureVerificationInput.jsx
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

const TYPE     = "pos19_food_temperature_verification";
const BRANCH   = "WARQA KITCHEN";
const FORM_REF = "FS-HACCP/KITCH/FTV/13";

const PROCESS_TYPES = [
  { value: "cooking",   label: "Cooking",   limit: "≥ 75°C" },
  { value: "cooling",   label: "Cooling",   limit: "≤ 5°C in 4h" },
  { value: "reheating", label: "Reheating", limit: "≥ 75°C" },
  { value: "chilled",   label: "Chilled",   limit: "≤ 5°C" },
  { value: "frozen",    label: "Frozen",    limit: "≤ -18°C" },
];

function emptyRow() {
  return {
    date: "", time: "", foodItem: "",
    processType: "cooking", targetTemp: "≥ 75°C",
    actualTemp: "", result: "",
    correctiveAction: "", checkedBy: "",
  };
}

/* ── الخارق 1 Design Tokens ── */
const C = {
  navy:      "#1e3a5f",
  navyLight: "#2d5a8e",
  accent:    "#3b82f6",
  accentBg:  "#eff6ff",
  teal:      "#0d9488",
  tealBg:    "#f0fdfa",
  red:       "#dc2626",
  green:     "#16a34a",
  gray50:    "#f9fafb",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray700:   "#374151",
  white:     "#ffffff",
  border:    "#dbeafe",
};

const thCell = {
  border: `1px solid ${C.navy}`, padding: "12px 8px",
  textAlign: "center", whiteSpace: "pre-line",
  fontWeight: 700, fontSize: 14,
  background: "#dbeafe", color: C.navy, lineHeight: 1.5,
};
const tdCell = {
  border: `1px solid #bfdbfe`, padding: "10px 8px",
  textAlign: "center", verticalAlign: "middle",
  fontSize: 14, background: C.white,
};
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "8px 10px", display: "block", minWidth: 0, fontSize: 14,
};
const actionBtn = (bg) => ({
  background: bg, color: C.white, border: "none",
  borderRadius: 8, padding: "8px 14px", fontWeight: 700,
  fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
});

export default function FoodTemperatureVerificationInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [section, setSection]       = useState("");
  const [rows, setRows]             = useState(() => Array.from({ length: 2 }, () => emptyRow()));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [checkedBy, setCheckedBy]   = useState("");
  const [saving, setSaving]         = useState(false);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const colDefs = useMemo(() => ([
    <col key="date"    style={{ width: 110 }} />,
    <col key="time"    style={{ width: 90  }} />,
    <col key="food"    style={{ width: 180 }} />,
    <col key="process" style={{ width: 130 }} />,
    <col key="target"  style={{ width: 120 }} />,
    <col key="actual"  style={{ width: 110 }} />,
    <col key="result"  style={{ width: 90  }} />,
    <col key="ca"      style={{ width: 200 }} />,
    <col key="chk"     style={{ width: 130 }} />,
    <col key="del"     style={{ width: 50  }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows(prev => {
      const next = [...prev];
      if (key === "processType") {
        const found = PROCESS_TYPES.find(p => p.value === val);
        next[idx] = { ...next[idx], [key]: val, targetTemp: found ? found.limit : "" };
      } else {
        next[idx] = { ...next[idx], [key]: val };
      }
      return next;
    });
  }
  const addRow    = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (i) => setRows(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r => Object.values(r).some(v => String(v || "").trim() !== ""));
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }
    for (const r of entries) {
      if (r.result === "Fail" && !r.correctiveAction.trim()) {
        alert("يوجد صف نتيجته Fail بدون Corrective Action. الرجاء التعبئة.");
        return;
      }
    }
    setSaving(true);
    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      section, reportDate, month: monthText,
      entries, checkedBy, verifiedBy,
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
    <div style={{ background:C.gray50, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.gray700, direction:"ltr", borderRadius:12, overflow:"hidden", padding:"14px 16px 0" }}>

      <ReportHeader
        title="Food Temperature Verification Log"
        subtitle={BRANCH}
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* ── Action buttons ── */}
      <div style={{ display:"flex", gap:8, padding:"0 0 10px", justifyContent:"flex-end" }}>
        <button onClick={addRow} style={actionBtn("#0ea5e9")}>+ Add Row</button>
        <button onClick={handleSave} disabled={saving} style={actionBtn(saving?"#6b7280":"#10b981")}>
          {saving ? "Saving…" : "💾 Save"}
        </button>
      </div>

      {/* ── Critical limits band ── */}
      <div style={{ margin:"0 0", background:`linear-gradient(90deg,${C.navy},${C.navyLight})`, borderRadius:"8px 8px 0 0", padding:"9px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
        <span style={{ color:C.white, fontWeight:800, fontSize:12 }}>Critical Limits</span>
        <span style={{ color:"#93c5fd", fontSize:11 }}>
          Cooking / Reheating ≥ 75°C &nbsp;|&nbsp; Chilled ≤ 5°C &nbsp;|&nbsp; Frozen ≤ -18°C &nbsp;|&nbsp; Cooling ≤ 5°C within 4 hrs
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX:"auto", border:`1px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 8px 8px" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Time</th>
              <th style={thCell}>Food Item</th>
              <th style={thCell}>Process{"\n"}Type</th>
              <th style={thCell}>Target{"\n"}Temp</th>
              <th style={thCell}>Actual{"\n"}Temp (°C)</th>
              <th style={thCell}>Result{"\n"}(Pass/Fail)</th>
              <th style={thCell}>Corrective{"\n"}Action</th>
              <th style={thCell}>Checked{"\n"}by</th>
              <th style={thCell}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const isFail = r.result === "Fail";
              const isPass = r.result === "Pass";
              const rowBg  = i % 2 === 0 ? C.white : "#f8faff";
              return (
                <tr key={i}>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input type="date" value={r.date} onChange={e=>updateRow(i,"date",e.target.value)} style={inputStyle} />
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input type="time" value={r.time} onChange={e=>updateRow(i,"time",e.target.value)} style={inputStyle} />
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input type="text" value={r.foodItem} onChange={e=>updateRow(i,"foodItem",e.target.value)} style={inputStyle} placeholder="Food item" />
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <select value={r.processType} onChange={e=>updateRow(i,"processType",e.target.value)} style={inputStyle}>
                      {PROCESS_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input type="text" value={r.targetTemp} onChange={e=>updateRow(i,"targetTemp",e.target.value)} style={inputStyle} />
                  </td>
                  <td style={{ ...tdCell, background: isFail ? "#fee2e2" : rowBg }}>
                    <input type="number" step="0.1" value={r.actualTemp} onChange={e=>updateRow(i,"actualTemp",e.target.value)}
                      style={{ ...inputStyle, background: isFail ? "#fee2e2" : C.white }} placeholder="°C" />
                  </td>
                  <td style={{ ...tdCell, background: isPass ? "#dcfce7" : isFail ? "#fee2e2" : rowBg,
                    color: isPass ? C.green : isFail ? C.red : C.gray700, fontWeight: r.result ? 700 : 400 }}>
                    <select value={r.result} onChange={e=>updateRow(i,"result",e.target.value)}
                      style={{ ...inputStyle, background: isPass ? "#dcfce7" : isFail ? "#fee2e2" : C.white,
                        color: isPass ? C.green : isFail ? C.red : C.gray700, fontWeight: r.result ? 700 : 400 }}>
                      <option value=""></option>
                      <option value="Pass">Pass</option>
                      <option value="Fail">Fail</option>
                    </select>
                  </td>
                  <td style={{ ...tdCell, background: isFail ? "#fff7ed" : rowBg }}>
                    <input type="text" value={r.correctiveAction} onChange={e=>updateRow(i,"correctiveAction",e.target.value)}
                      style={{ ...inputStyle, background: isFail ? "#fff7ed" : C.white }}
                      placeholder={isFail ? "⚠️ Required" : "If any"} />
                  </td>
                  <td style={{ ...tdCell, background:rowBg }}>
                    <input type="text" value={r.checkedBy} onChange={e=>updateRow(i,"checkedBy",e.target.value)} style={inputStyle} />
                  </td>
                  <td style={{ ...tdCell, background:rowBg, padding:4 }}>
                    <button onClick={()=>removeRow(i)} disabled={rows.length===1}
                      style={{ background:rows.length===1?"#e5e7eb":"#fee2e2", color:rows.length===1?C.gray400:C.red,
                        border:"none", borderRadius:6, width:38, height:36, cursor:rows.length===1?"not-allowed":"pointer",
                        fontWeight:700, fontSize:18 }}>
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Add Row button ── */}
      <div style={{ padding:"10px 0 0" }}>
        <button onClick={addRow}
          style={{ background:C.accentBg, color:C.accent, border:`1px dashed ${C.accent}`,
            borderRadius:8, padding:"7px 18px", fontWeight:700, cursor:"pointer", fontSize:13 }}>
          + إضافة سطر
        </button>
      </div>

      {/* ── Footer cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, padding:"14px 0 16px" }}>
        {[
          ["👤 Checked by", checkedBy,  setCheckedBy],
          ["✅ Verified by", verifiedBy, setVerifiedBy],
        ].map(([label, val, setter]) => (
          <div key={label} style={{ background:C.tealBg, border:`1px solid #99f6e4`, borderRadius:8, padding:"9px 14px" }}>
            <div style={{ fontSize:11, color:C.teal, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", marginBottom:4 }}>{label}</div>
            <input value={val} onChange={e=>setter(e.target.value)}
              style={{ ...inputStyle, border:`1px solid #5eead4`, background:C.white, fontWeight:600, fontSize:15 }} />
          </div>
        ))}
      </div>

    </div>
  );
}