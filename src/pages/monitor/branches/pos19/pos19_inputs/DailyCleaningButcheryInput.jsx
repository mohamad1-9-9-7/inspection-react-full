// src/pages/monitor/branches/pos19/pos19_inputs/DailyCleaningChecklistInput.jsx
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

const TYPE = "pos19_daily_cleaning";
const BRANCH = "POS 19";
const FORM_REF = "FS-HACCP/KITC/CLN/01";

const COLS = [
  { key: "floorWallsDrains",   label: "FLOOR/\nWALLS /\nDRAINS" },
  { key: "chillersFreezer",    label: "CHILLERS /\nFREEZER" },
  { key: "cookingArea",        label: "COOKING\nAREA" },
  { key: "preparationArea",    label: "PREPARATION\nAREA" },
  { key: "packingArea",        label: "PACKING\nAREA" },
  { key: "frontUnderCounters", label: "FRONT\n&UNDER\nCOUNTERS" },
  { key: "handWashingStation", label: "HAND\nWASHING\nSTATION" },
  { key: "equipments",         label: "EQUIPMENT\nS" },
  { key: "utensils",           label: "UTENSILS" },
  { key: "worktopTables",      label: "WORKTOP\nTABLES" },
  { key: "kitchenHoodFilters", label: "KITCHEN\nHOOD\nFILTERS" },
];

function emptyRow() {
  const base = { cleanerName: "", time: "", correctiveAction: "" };
  COLS.forEach((c) => (base[c.key] = ""));
  return base;
}

export default function DailyCleaningChecklistInput() {
  const [date, setDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });
  const [rows, setRows]             = useState([emptyRow()]);
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const [saving, setSaving]         = useState(false);
  const [monthText, setMonthText]   = useState(() => {
    try { return new Date().toLocaleString("en-GB", { month: "long", timeZone: "Asia/Dubai" }); }
    catch { return ""; }
  });

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

  const legendBox = (
    <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
      <strong>(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)</strong>
    </div>
  );

  function updateRow(index, key, val) {
    setRows((prev) => prev.map((r, i) => i === index ? { ...r, [key]: val } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  function removeRow(index) {
    setRows((prev) => prev.length === 1 ? prev : prev.filter((_, i) => i !== index));
  }

  const colDefs = useMemo(() => {
    const arr = [
      <col key="name" style={{ width: 170 }} />,
      <col key="time" style={{ width: 120 }} />,
    ];
    COLS.forEach((_, i) => arr.push(<col key={`c${i}`} style={{ width: 110 }} />));
    arr.push(<col key="action" style={{ width: 210 }} />);
    arr.push(<col key="del"    style={{ width: 40  }} />);
    return arr;
  }, []);

  async function handleSave() {
    if (!date) { alert("الرجاء تحديد التاريخ"); return; }
    setSaving(true);
    const entries = rows.map((row) => ({
      cleanerName:        row.cleanerName        || "",
      time:               row.time               || "",
      floorWallsDrains:   row.floorWallsDrains   || "",
      chillersFreezer:    row.chillersFreezer    || "",
      cookingArea:        row.cookingArea        || "",
      preparationArea:    row.preparationArea    || "",
      packingArea:        row.packingArea        || "",
      frontUnderCounters: row.frontUnderCounters || "",
      handWashingStation: row.handWashingStation || "",
      equipments:         row.equipments        || "",
      utensils:           row.utensils          || "",
      worktopTables:      row.worktopTables     || "",
      kitchenHoodFilters: row.kitchenHoodFilters || "",
      correctiveAction:   row.correctiveAction  || "",
    }));
    const payload = {
      branch: BRANCH,
      formRef: FORM_REF,
      classification: "Official",
      reportDate: date,
      month: monthText || "",
      entries,
      checkedBy,
      verifiedBy,
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
      <ReportHeader
        title="Daily Cleaning Checklist (Butchery)"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: date, onChange: setDate },
          { label: "Month", value: monthText, onChange: setMonthText },
        ]}
      />

      {/* Title + Legend */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>AREA</div>
        {legendBox}
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Cleaner Name</th>
              <th style={thCell}>Time</th>
              {COLS.map((c) => <th key={c.key} style={thCell}>{c.label}</th>)}
              <th style={thCell}>CORRECTIVE{"\n"}ACTION</th>
              <th style={thCell}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td style={tdCell}>
                  <input
                    type="text"
                    placeholder="Name"
                    value={row.cleanerName}
                    onChange={(e) => updateRow(index, "cleanerName", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="time"
                    value={row.time}
                    onChange={(e) => updateRow(index, "time", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                {COLS.map((c) => (
                  <td style={tdCell} key={c.key}>
                    <select
                      value={row[c.key]}
                      onChange={(e) => updateRow(index, c.key, e.target.value)}
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
                  <input
                    type="text"
                    placeholder="Action"
                    value={row.correctiveAction}
                    onChange={(e) => updateRow(index, "correctiveAction", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={{ ...tdCell, padding: 4 }}>
                  <button
                    onClick={() => removeRow(index)}
                    disabled={rows.length === 1}
                    title="حذف السطر"
                    style={{
                      background: rows.length === 1 ? "#e5e7eb" : "#fee2e2",
                      color: rows.length === 1 ? "#9ca3af" : "#dc2626",
                      border: "none",
                      borderRadius: 6,
                      width: 28,
                      height: 28,
                      cursor: rows.length === 1 ? "not-allowed" : "pointer",
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row */}
      <div style={{ marginTop: 8 }}>
        <button
          onClick={addRow}
          style={{
            background: "#eff6ff",
            color: "#2563eb",
            border: "1px dashed #93c5fd",
            borderRadius: 8,
            padding: "7px 18px",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          + إضافة سطر
        </button>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Daily Cleaning"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Checked by:</span>
          <input value={checkedBy} onChange={(e)=>setCheckedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
      </div>
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}