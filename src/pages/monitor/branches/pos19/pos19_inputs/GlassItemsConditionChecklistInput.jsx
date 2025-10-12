// src/pages/monitor/branches/pos19/pos19_inputs/GlassItemsConditionChecklistInput.jsx
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

const TYPE   = "pos19_glass_items_condition";
const BRANCH = "POS 19";

const LEGEND_COLS = [
  { key: "inGoodRepair", label: "In good repair and condition" },
  { key: "noBreakage",   label: "No signs of glass breakage" },
  { key: "cleanDry",     label: "Visibly clean and dry" },
];

function emptyRow() {
  return {
    date: "",
    glassItem: "",
    section: "",
    inGoodRepair: "",
    noBreakage: "",
    cleanDry: "",
    correctiveAction: "",
    checkedBy: "",
  };
}

export default function GlassItemsConditionChecklistInput() {
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  // 5 أسطر ثابتة
  const [rows, setRows] = useState(() => Array.from({ length: 5 }, () => emptyRow()));

  const [formRef, setFormRef] = useState("UC/HACCP/BR/F29");
  const [headerSection, setHeaderSection] = useState(""); // Section في الهيدر
  const [classification] = useState("Official");
  const [revDate, setRevDate] = useState("");
  const [revNo, setRevNo] = useState("");

  // ✅ الحقل المطلوب: Verified by (فوتر)
  const [verifiedBy, setVerifiedBy] = useState("");

  const [saving, setSaving] = useState(false);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  // ستايل
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);
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
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "4px 6px",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };
  const btnStyle = (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 120 }} />,
    <col key="glass" style={{ width: 210 }} />,
    <col key="section" style={{ width: 160 }} />,
    ...LEGEND_COLS.map((_, i) => <col key={`lg${i}`} style={{ width: 160 }} />),
    <col key="ca" style={{ width: 220 }} />,
    <col key="checked" style={{ width: 140 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  async function handleSave() {
    const entries = rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
    if (entries.length === 0) { alert("لا يوجد بيانات للحفظ."); return; }

    const payload = {
      branch: BRANCH,
      formRef,
      classification,
      reportDate,      // ISO
      month: monthText, 
      section: headerSection,
      entries,         // حتى 5 أسطر
      verifiedBy,      // ✅ الفوتر
      revDate,
      revNo,
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
          <div style={{ fontWeight:800, fontSize:16 }}>
            Glass Items Condition Monitoring Checklist <span style={{ fontWeight:600 }}>(Weekly)</span>
          </div>
        </div>

        {/* Header data (right) */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 170px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div>
          <input value={formRef} onChange={(e)=>setFormRef(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />

          <div>Section :</div>
          <input value={headerSection} onChange={(e)=>setHeaderSection(e.target.value)} style={inputStyle} />

          <div>Classification :</div>
          <div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>{classification}</div>

          <div>Date :</div>
          <input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          LEGEND: (√) – Satisfactory & (✗) – Needs Improvement
        </div>
      </div>

      {/* Table (5 rows) */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Glass Item</th>
              <th style={thCell}>Section</th>
              {LEGEND_COLS.map((c) => (
                <th key={c.key} style={thCell}>{c.label}</th>
              ))}
              <th style={thCell}>Corrective Action{"\n"}(if any)</th>
              <th style={thCell}>Checked by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}>
                  <input type="date" value={r.date} onChange={(e)=>updateRow(idx, "date", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.glassItem} onChange={(e)=>updateRow(idx, "glassItem", e.target.value)} style={inputStyle} placeholder="e.g., Chiller door glass" />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.section} onChange={(e)=>updateRow(idx, "section", e.target.value)} style={inputStyle} placeholder="Area/zone" />
                </td>

                {LEGEND_COLS.map((c) => (
                  <td style={tdCell} key={c.key}>
                    <select
                      value={r[c.key]}
                      onChange={(e)=>updateRow(idx, c.key, e.target.value)}
                      style={inputStyle}
                      title="√ = Satisfactory, ✗ = Needs Improvement"
                    >
                      <option value=""></option>
                      <option value="√">√</option>
                      <option value="✗">✗</option>
                    </select>
                  </td>
                ))}

                <td style={tdCell}>
                  <input type="text" value={r.correctiveAction} onChange={(e)=>updateRow(idx, "correctiveAction", e.target.value)} style={inputStyle} placeholder="Action (if any)" />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.checkedBy} onChange={(e)=>updateRow(idx, "checkedBy", e.target.value)} style={inputStyle} placeholder="Name" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Glass Items Checklist"}
        </button>
      </div>

      {/* Footer line: Verified by + Note + Rev fields */}
      <div style={{ marginTop:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Verified by:</strong>
          {/* خط سفلي فقط ليشبه الخط في الفورم */}
          <input
            value={verifiedBy}
            onChange={(e)=>setVerifiedBy(e.target.value)}
            placeholder=""
            style={{
              flex: "0 1 360px",
              border: "none",
              borderBottom: "2px solid #1f3b70",
              padding: "4px 6px",
              outline: "none",
              fontSize: 12,
              color: "#0b1f4d",
            }}
          />
        </div>

        <div style={{ marginTop:8, fontSize:11, color:"#0b1f4d" }}>
          <strong>NOTE:</strong> Any glass items found defective or not within the standards should be removed from the section.
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12, alignItems:"center", fontSize:12 }}>
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
    </div>
  );
}
