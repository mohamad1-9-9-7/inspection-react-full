// src/pages/monitor/branches/pos19/pos19_inputs/DailyCleaningChecklistInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/AlMawashiHeader";
import useReportDateStatus from "../_shared/useReportDateStatus";
import { useStaffDirectory } from "../../_shared/staffRegistry";
import {
  usePos19Day, savePos19Report, DayStatus, todayDubai,
  useCheckedBy, CheckedByField, TickCell, tickAll, AllTickButton,
} from "../_shared/pos19EntryKit";


const TYPE = "pos19_daily_cleaning";
const BRANCH = "POS 19";
const FORM_REF = "FS-HACCP/KITC/CLN/01";

const COLS = [
  { key: "floorWallsDrains",   label: "FLOOR / WALLS / DRAINS\nالأرضيات / الجدران / المصارف" },
  { key: "chillersFreezer",    label: "CHILLERS / FREEZER\nالثلاجات / الفريزر" },
  { key: "cookingArea",        label: "COOKING AREA\nمنطقة الطبخ" },
  { key: "preparationArea",    label: "PREPARATION AREA\nمنطقة التحضير" },
  { key: "packingArea",        label: "PACKING AREA\nمنطقة التعبئة" },
  { key: "frontUnderCounters", label: "FRONT & UNDER COUNTERS\nأمام وتحت الكاونترات" },
  { key: "handWashingStation", label: "HAND WASHING STATION\nمحطة غسل اليدين" },
  { key: "equipments",         label: "EQUIPMENT\nالمعدات" },
  { key: "utensils",           label: "UTENSILS\nالأدوات" },
  { key: "worktopTables",      label: "WORKTOP TABLES\nطاولات العمل" },
  { key: "kitchenHoodFilters", label: "KITCHEN HOOD FILTERS\nفلاتر شفاط المطبخ" },
];

function emptyRow() {
  const base = { cleanerName: "", time: "", correctiveAction: "" };
  COLS.forEach((c) => (base[c.key] = ""));
  return base;
}

export default function DailyCleaningChecklistInput() {
  const [date, setDate] = useState(todayDubai);
  const [rows, setRows]             = useState([emptyRow()]);
  const [verifiedBy, setVerifiedBy] = useState("");

  const [saving, setSaving]         = useState(false);
  const [monthText, setMonthText]   = useState(() => {
    try { return new Date().toLocaleString("en-GB", { month: "long", timeZone: "Asia/Dubai" }); }
    catch { return ""; }
  });

  const directory = useStaffDirectory();
  const sig = useCheckedBy(directory);
  const day = usePos19Day(TYPE, date, {
    onLoad: (p) => {
      const list = Array.isArray(p.entries) ? p.entries.map((e) => ({ ...emptyRow(), ...e })) : [];
      setRows(list.length ? list : [emptyRow()]);
      if (p.month) setMonthText(p.month);
      setVerifiedBy(p.verifiedBy || "");
      sig.load(p);
    },
    onBlank: () => {
      setRows([emptyRow()]);
      setVerifiedBy("");
      sig.reset();
    },
  });
  const dateStatus = useReportDateStatus(TYPE, date, { editing: day.editing });
  const markAll = () => setRows((r) => tickAll(r, COLS.map((c) => c.key)));

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
    if (sig.errors.length) { alert("⚠️ " + sig.errors.join("\n")); return; }
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
    try {
      await savePos19Report({
        type: TYPE,
        day,
        dateStatus,
        label: `POS 19 Daily Cleaning ${date}`,
        payload: {
          branch: BRANCH,
          formRef: FORM_REF,
          classification: "Official",
          reportDate: date,
          month: monthText || "",
          entries,
          ...sig.fields(),
          verifiedBy,
        },
      });
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
          { label: "Report Date", type: "date", value: date, onChange: setDate, note: dateStatus.note },
          { label: "Month", value: monthText, onChange: setMonthText },
        ]}
      />

      {/* Important info banner */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", background:"#eff6ff", border:"1px solid #bfdbfe", borderLeft:"4px solid #3b82f6", borderRadius:8, color:"#1e40af", fontSize:13, lineHeight:1.5, marginBottom:12 }}>
        <div style={{ fontSize:18, lineHeight:1 }}>ℹ️</div>
        <div><strong>Important (PRP):</strong> Clean and sanitize all areas, surfaces, and equipment at the <b>end of each shift</b> (or more frequently as needed). Apply sanitizer at the correct concentration with the required contact time. Mark each item ✓ when satisfactory or ✗ when needing corrective action.</div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
        <AllTickButton onClick={markAll} />
        <div style={{ flex:1 }} />
        <DayStatus day={day} />
      </div>

      <datalist id="pos19-dc-staff">
        {directory.staff.map((s) => <option key={s.empNo} value={s.name}>{s.empNo}</option>)}
      </datalist>

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
              <th style={thCell}>Cleaner Name{"\n"}اسم عامل التنظيف</th>
              <th style={thCell}>Time{"\n"}الوقت</th>
              {COLS.map((c) => <th key={c.key} style={thCell}>{c.label}</th>)}
              <th style={thCell}>CORRECTIVE ACTION{"\n"}الإجراء التصحيحي</th>
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
                    list="pos19-dc-staff"
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
                    <TickCell value={row[c.key]} onChange={(v) => updateRow(index, c.key, v)} />
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
                    }}>
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
        <button onClick={handleSave} disabled={saving || day.loading || dateStatus.blocked} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : day.editing ? "Update Daily Cleaning" : "Save Daily Cleaning"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <CheckedByField sig={sig} />
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
