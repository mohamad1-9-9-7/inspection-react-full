// src/pages/monitor/branches/pos19/pos19_inputs/FoodTemperatureVerificationInput.jsx
import React, { useEffect, useMemo, useState } from "react";
import unionLogo from "../../../../../assets/unioncoop-logo.png";

/* ===== API base (aligned) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants ===== */
const TYPE   = "pos19_food_temperature_verification";
const BRANCH = "POS 19";
const STORAGE_KEY = `${TYPE}_daily_single_ref_draft`;

const DEFAULT_NOTES = [
  "Record temperatures every 4 hours.",
  "Chiller: Target ≤ 5°C; Critical > 5°C for 4 hours.",
  "Freezer: Target ≤ −18°C; Critical > −18°C for 4 hours.",
  "If exceeded, take corrective action immediately."
];

/* Helpers (styles copied from DailyCleaning design language) */
const gridStyle = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  fontSize: 12,
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
function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

/* One daily row (binds to header date) */
function emptyRowFor(dateStr) {
  return {
    date: dateStr,
    food_am: "", temp_am: "", sign_am: "",
    food_pm: "", temp_pm: "", sign_pm: "",
    correctiveAction: "",
  };
}

export default function FoodTemperatureVerificationInput() {
  /* Today (Asia/Dubai) */
  const todayDubai = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }, []);

  /* Header meta */
  const [monthText, setMonthText] = useState(() => {
    try { return new Date().toLocaleString("en-GB",{month:"long", timeZone:"Asia/Dubai"}); }
    catch { return ""; }
  });
  const [date, setDate] = useState(todayDubai); // ✅ قابل للتعديل لأي تاريخ
  const [classification, setClassification] = useState("Official");
  const [refCode, setRefCode] = useState("");    // Reference Unit Code
  const [section, setSection] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  /* Single row only (bound to `date`) */
  const [rows, setRows] = useState(() => [emptyRowFor(todayDubai)]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  /* Save modal state */
  const [saveStage, setSaveStage] = useState("idle"); // idle | saving | done | error
  const [saveError, setSaveError] = useState("");

  /* Load/Auto-save draft */
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (d && d.type === TYPE) {
        setMonthText(d.monthText || monthText);
        setClassification(d.classification || "Official");
        setRefCode(d.refCode || "");
        setSection(d.section || "");
        setVerifiedBy(d.verifiedBy || "");
        const row0 = (Array.isArray(d.rows) && d.rows[0]) ? d.rows[0] : emptyRowFor(date);
        setRows([{ ...row0, date: d.date || date }]);
        if (d.date) setDate(d.date);
      }
    } catch {}
    // eslint-disable-next-line
  }, []);

  /* Keep localStorage synced */
  useEffect(() => {
    const payload = { type: TYPE, monthText, classification, refCode, section, verifiedBy, rows, date };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [monthText, classification, refCode, section, verifiedBy, rows, date]);

  /* Keep the only row's date in sync with header date */
  useEffect(() => {
    setRows((prev) => [{ ...(prev[0] || emptyRowFor(date)), date }]);
  }, [date]);

  /* uniqueKey per day/branch/type (single report) */
  const uniqueKey = useMemo(() => {
    const keyDate = (rows[0]?.date || date || "unknown");
    return `${TYPE}__${BRANCH}__${keyDate}`;
  }, [rows, date]);

  function updateRow(field, value) {
    setRows((prev) => [{ ...(prev[0] || emptyRowFor(date)), [field]: value, date }]);
  }

  /* ===== Duplicate check (same date & branch) ===== */
  async function hasDuplicateForDate(d) {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      // نطابق التاريخ إما في payload.header.reportDate أو payload.reportDate
      // ونطابق الفرع في payload.branch أو record.branch للاحتياط
      return list.some((r) => {
        const p = r?.payload || {};
        const recBranch = p?.branch || r?.branch;
        const recDate = p?.header?.reportDate || p?.reportDate;
        return String(recBranch) === BRANCH && String(recDate) === String(d);
      });
    } catch (e) {
      console.warn("Duplicate check failed:", e);
      return false;
    }
  }

  async function handleSave() {
    setMsg("");
    setSaveError("");
    setSaveStage("saving");
    setSaving(true);

    const row = rows[0] || emptyRowFor(date);

    // ✅ منع التكرار لنفس اليوم والفرع
    if (!date) {
      setSaveStage("error");
      setSaveError("يرجى اختيار التاريخ.");
      setSaving(false);
      setTimeout(() => setSaveStage("idle"), 1800); // يغلق تلقائياً
      return;
    }
    const exists = await hasDuplicateForDate(date);
    if (exists) {
      setMsg("⚠️ تقرير هذا التاريخ موجود مسبقًا.");
      setSaveError("يوجد تقرير محفوظ لنفس التاريخ. لا يمكن حفظ تقرير ثانٍ.");
      setSaveStage("error");
      setSaving(false);
      setTimeout(() => setSaveStage("idle"), 1800); // يغلق تلقائياً
      return;
    }

    const payload = {
      uniqueKey,
      branch: BRANCH,
      header: {
        formRef: "UC/HACCP/BR/F04A",
        section,
        month: monthText,
        classification,
        referenceUnitCode: refCode,
        verifiedBy,
        reportDate: date, // ✅ التاريخ المختار (ممكن يكون قديم)
      },
      dayReports: [row], // سطر واحد فقط
      legend: "AM: 10:00–10:30 • PM: 10:00–10:30",
      notes: DEFAULT_NOTES,
      createdAtClient: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "pos19",
          type: TYPE,
          payload,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Save failed (HTTP ${res.status})`);

      setMsg("✅ Saved successfully.");
      setSaveStage("done");
      setTimeout(() => setSaveStage("idle"), 1200);
    } catch (e) {
      setMsg(`❌ ${e.message || "Save failed."}`);
      setSaveError(e.message || "Save failed.");
      setSaveStage("error");
      setTimeout(() => setSaveStage("idle"), 1800); // يغلق تلقائياً
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    if (!window.confirm("Clear all fields for this date?")) return;
    setRows([emptyRowFor(date)]);
    setSection(""); setClassification("Official");
    setRefCode(""); setVerifiedBy("");
    setMsg("Cleared.");
  }

  /* Table column widths (no Delete column) */
  const colDefs = useMemo(() => {
    const arr = [
      <col key="date" style={{ width: 140 }} />,
      <col key="food_am" style={{ width: 220 }} />,
      <col key="temp_am" style={{ width: 90 }} />,
      <col key="sign_am" style={{ width: 90 }} />,
      <col key="food_pm" style={{ width: 220 }} />,
      <col key="temp_pm" style={{ width: 90 }} />,
      <col key="sign_pm" style={{ width: 90 }} />,
      <col key="action" style={{ width: 260 }} />,
    ];
    return arr;
  }, []);

  const legendBox = (
    <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
      <strong>Time Windows:</strong> 10:00–10:30 <span style={{textTransform:"uppercase"}}>am</span> &nbsp;/&nbsp;
      10:00–10:30 <span style={{textTransform:"uppercase"}}>pm</span>
    </div>
  );

  /* Simple modal (closable) */
  const Modal = ({ stage, error, onClose }) => {
    if (stage === "idle") return null;
    const isSaving = stage === "saving";
    const isDone   = stage === "done";
    const isErr    = stage === "error";
    return (
      <div
        onClick={onClose} // إغلاق عند النقر على الخلفية
        style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.25)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999
        }}
      >
        <div
          onClick={(e)=>e.stopPropagation()}
          style={{
            background:"#fff", borderRadius:12, padding:"18px 20px", minWidth:280,
            boxShadow:"0 12px 30px rgba(0,0,0,.2)", textAlign:"center", position:"relative"
          }}
        >
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position:"absolute", right:8, top:6, border:"none", background:"transparent",
              fontSize:18, cursor:"pointer", lineHeight:1
            }}
          >
            ×
          </button>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:8 }}>
            {isSaving ? "جاري الحفظ…" : isDone ? "تم الحفظ ✅" : "فشل الحفظ ❌"}
          </div>
          <div style={{ color:"#4b5563", fontSize:13 }}>
            {isSaving && "الرجاء الانتظار لحظات"}
            {isDone && "تم تسجيل التقرير للتاريخ المحدد."}
            {isErr  && (error || "حاول مرة أخرى.")}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", position:"relative" }}>
      <Modal stage={saveStage} error={saveError} onClose={() => setSaveStage("idle")} />

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Union Coop</div>
          <div style={{ fontWeight:800, fontSize:16 }}>Food Temperature Verification Log</div>
        </div>

        {/* Meta grid box */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 180px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div><div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>UC/HACCP/BR/F04A</div>
          <div>Month :</div><input value={monthText} onChange={(e)=>setMonthText(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Classification :</div><input value={classification} onChange={(e)=>setClassification(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          {/* ✅ التاريخ قابل للتعديل */}
          <div>Date :</div>
          <input
            type="date"
            value={date}
            onChange={(e)=>setDate(e.target.value)}
            style={{ ...inputStyle, borderColor:"#1f3b70" }}
          />
          <div>Reference Unit Code :</div><input value={refCode} onChange={(e)=>setRefCode(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} placeholder="e.g., CH-01" />
        </div>
      </div>

      {/* Section title + legend */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>DAILY READINGS (Single Reference Unit)</div>
        {legendBox}
      </div>

      {/* Table (single row, date bound to header `date`) */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Name of the Food (AM)</th>
              <th style={thCell}>TEMP</th>
              <th style={thCell}>SIGN</th>
              <th style={thCell}>Name of the Food (PM)</th>
              <th style={thCell}>TEMP</th>
              <th style={thCell}>SIGN</th>
              <th style={thCell}>CORRECTIVE ACTION</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {/* ✅ خلية التاريخ مربوطة بنفس state تبع الهيدر */}
              <td style={tdCell}>
                <input
                  type="date"
                  value={date}
                  onChange={(e)=>setDate(e.target.value)}
                  style={inputStyle}
                />
              </td>

              {/* AM */}
              <td style={tdCell}>
                <input
                  value={rows[0]?.food_am || ""}
                  onChange={(e)=>updateRow("food_am", e.target.value)}
                  placeholder="Food name"
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  value={rows[0]?.temp_am || ""}
                  onChange={(e)=>updateRow("temp_am", e.target.value)}
                  placeholder="°C"
                  style={{...inputStyle, textAlign:"center"}}
                />
              </td>
              <td style={tdCell}>
                <input
                  value={rows[0]?.sign_am || ""}
                  onChange={(e)=>updateRow("sign_am", e.target.value)}
                  placeholder="Sign"
                  style={{...inputStyle, textAlign:"center"}}
                />
              </td>

              {/* PM */}
              <td style={tdCell}>
                <input
                  value={rows[0]?.food_pm || ""}
                  onChange={(e)=>updateRow("food_pm", e.target.value)}
                  placeholder="Food name"
                  style={inputStyle}
                />
              </td>
              <td style={tdCell}>
                <input
                  value={rows[0]?.temp_pm || ""}
                  onChange={(e)=>updateRow("temp_pm", e.target.value)}
                  placeholder="°C"
                  style={{...inputStyle, textAlign:"center"}}
                />
              </td>
              <td style={tdCell}>
                <input
                  value={rows[0]?.sign_pm || ""}
                  onChange={(e)=>updateRow("sign_pm", e.target.value)}
                  placeholder="Sign"
                  style={{...inputStyle, textAlign:"center"}}
                />
              </td>

              {/* Corrective Action */}
              <td style={tdCell}>
                <input
                  value={rows[0]?.correctiveAction || ""}
                  onChange={(e)=>updateRow("correctiveAction", e.target.value)}
                  placeholder="Action if limits exceeded"
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
          {saving ? "Saving…" : "Save Log"}
        </button>
        <button onClick={handleClear} style={btnStyle("#6b7280")}>Clear</button>
        {msg && <span style={{ fontSize:13, fontWeight:700, padding:"8px 6px" }}>{msg}</span>}
      </div>

      {/* Notes */}
      <div style={{ fontSize: 11, color: "#0b1f4d", marginTop: 12, lineHeight: 1.5 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Notes:</div>
        {DEFAULT_NOTES.map((n, i) => (<div key={i}>{i + 1}) {n}</div>))}
      </div>

      {/* Footer meta */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Section:</span>
          <input value={section} onChange={(e)=>setSection(e.target.value)} style={inputStyle} placeholder="e.g., Chiller Area" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} placeholder="Name / Signature" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Ref.Unit:</span>
          <input value={refCode} onChange={(e)=>setRefCode(e.target.value)} style={inputStyle} placeholder="CH-01" />
        </div>
      </div>
    </div>
  );
}
