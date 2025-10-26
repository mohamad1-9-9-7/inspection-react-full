// src/pages/monitor/branches/POS 11/POS11ReceivingLogInput.jsx
// Receiving Log (Butchery) — POS 11 (Al Ain Butchery)
// نفس أسلوب POS11PersonalHygiene: ترويسة موحّدة، فرع من URL، حفظ عبر /api/reports

import React, { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

// ثوابت التقرير والفرع
const TYPE = "pos11_receiving_log_butchery"; // ✅ نوع التقرير

// C / NC
const TICK_COLS = [
  { key: "vehicleClean",     label: "Vehicle clean" },
  { key: "handlerHygiene",   label: "Food handler hygiene" },
  { key: "appearanceOK",     label: "Appearance" },
  { key: "firmnessOK",       label: "Firmness" },
  { key: "smellOK",          label: "Smell" },
  { key: "packagingGood",    label: "Packaging of food is good / undamaged / clean / no pests" },
];

function emptyRow() {
  return {
    supplier: "", foodItem: "",
    vehicleTemp: "", foodTemp: "",
    weightKg: "", // ✅ العمود الجديد
    vehicleClean: "", handlerHygiene: "", appearanceOK: "", firmnessOK: "", smellOK: "", packagingGood: "",
    countryOfOrigin: "", productionDate: "", expiryDate: "",
    remarks: "",
  };
}

export default function POS11ReceivingLogInput() {
  const [searchParams] = useSearchParams();
  const branchFromURL = searchParams.get("branch");
  const branch = branchFromURL || "POS 11"; // ✅ كما في ملف POS11PersonalHygiene

  // تاريخ التقرير (خارج الترويسة)
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  // 🧾 رقم الفاتورة إلزامي (مثل POS10)
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const invoiceRef = useRef(null);

  // عدد الصفوف
  const ROW_COUNT = 15;
  const [rows, setRows] = useState(() => Array.from({ length: ROW_COUNT }, () => emptyRow()));

  // فوتر
  const [verifiedBy, setVerifiedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // month text
  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const gridStyle = useMemo(() => ({
    width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12,
  }), []);
  const thCell = {
    border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center",
    whiteSpace: "pre-line", fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%", boxSizing: "border-box", border: "1px solid #c7d2fe", borderRadius: 6,
    padding: "4px 6px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
  };
  const btn = (bg) => ({
    background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px",
    fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  // ===== ترويسة موحّدة (نفس POS11PersonalHygiene) بدون تاريخ داخلها =====
  const tdHeader2 = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
  const topTable = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "0.5rem",
    fontSize: "0.9rem",
    border: "1px solid #9aa4ae",
    background: "#f8fbff",
  };

  // ✅ تعريف الأعمدة (أضفنا عمود الوزن بعد Food Temp)
  const colDefs = useMemo(() => ([
    <col key="supplier" style={{ width: 170 }} />,
    <col key="food" style={{ width: 160 }} />,
    <col key="vehT" style={{ width: 90 }} />,
    <col key="foodT" style={{ width: 90 }} />,
    <col key="weight" style={{ width: 110 }} />, // ✅ Weight (kg)
    <col key="vehClean" style={{ width: 120 }} />,
    <col key="handler" style={{ width: 140 }} />,
    <col key="appearanceOK" style={{ width: 120 }} />,
    <col key="firmnessOK" style={{ width: 110 }} />,
    <col key="smellOK" style={{ width: 110 }} />,
    <col key="pack" style={{ width: 220 }} />,
    <col key="origin" style={{ width: 120 }} />,
    <col key="prod" style={{ width: 120 }} />,
    <col key="exp" style={{ width: 120 }} />,
    <col key="remarks" style={{ width: 200 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  async function handleSave() {
    setSaveMsg("");

    if (!reportDate) {
      setSaveMsg("⚠️ Please select a date.");
      return;
    }

    // ✅ التحقق: رقم الفاتورة إلزامي
    if (!String(invoiceNo || "").trim()) {
      setInvoiceError("Invoice No is required.");
      if (invoiceRef.current) {
        invoiceRef.current.focus();
        invoiceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    } else {
      setInvoiceError("");
    }

    const entries = rows.filter((r) => Object.values(r).some((v) => String(v || "").trim() !== ""));
    if (entries.length === 0) {
      setSaveMsg("⚠️ لا يوجد بيانات للحفظ.");
      return;
    }

    const payload = {
      branch,              // ✅ POS 11 أو من URL
      reportDate,
      month: monthText,
      invoiceNo,
      entries,             // ✅ يتضمن weightKg داخل كل صف
      verifiedBy,
      receivedBy,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos11", type: TYPE, payload }), // ✅ تمييز الفرع
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveMsg("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3500);
    }
  }

  const invoiceBorder = String(invoiceNo || "").trim() ? "#1f3b70" : (invoiceError ? "#b91c1c" : "#1f3b70");

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* === ترويسة AL MAWASHI (ثابتة) === */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ border: "1px solid #9aa4ae", padding: 8, width:120, textAlign:"center" }}>
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                AL<br/>MAWASHI
              </div>
            </td>
            <td style={tdHeader2}><b>Document Title:</b> Receiving Log (Butchery)</td>
            <td style={tdHeader2}><b>Document No:</b> FS-QM/REC/RLB</td>
          </tr>
          <tr>
            <td style={tdHeader2}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader2}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader2} colSpan={2}><b>Area:</b> {branch}</td>
          </tr>
          <tr>
            <td style={tdHeader2}><b>Controlling Officer:</b> Quality Controller</td>
            <td style={tdHeader2}><b>Approved By:</b> Hussam O.Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div style={{ textAlign:"center", background:"#dde3e9", fontWeight:700, padding:"6px 4px", border:"1px solid #9aa4ae", borderTop:"none", marginBottom:"0.75rem" }}>
        RECEIVING LOG — {branch}
      </div>

      {/* ✅ Date + Invoice خارج الترويسة */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(2, minmax(220px, 1fr))", gap:12, alignItems:"center", marginBottom:12 }}>
        <label style={{ fontWeight:700 }}>Date:
          <input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ marginLeft:8, padding:"4px 8px", borderRadius:6, border:"1px solid #ccc" }} />
        </label>
        <div style={{ display:"grid", gap:4 }}>
          <div style={{ fontWeight:700, color:"#0b1f4d" }}>Invoice No <span style={{color:"#b91c1c"}}>*</span> :</div>
          <input
            ref={invoiceRef}
            type="text"
            value={invoiceNo}
            onChange={(e)=>{ setInvoiceNo(e.target.value); if (invoiceError) setInvoiceError(""); }}
            placeholder="Enter invoice number (required)"
            aria-invalid={!!invoiceError}
            aria-describedby={invoiceError ? "invoice-error" : undefined}
            style={{ ...inputStyle, borderColor: invoiceBorder, minWidth: 220 }}
          />
          {invoiceError && (
            <div id="invoice-error" style={{ color:"#b91c1c", fontWeight:700, fontSize:12 }}>
              {invoiceError}
            </div>
          )}
        </div>
      </div>

      {/* Legend strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          LEGEND: (C) – Conform &nbsp;&nbsp; / &nbsp;&nbsp; (NC) – Non-Conform
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Name of the Supplier</th>
              <th style={thCell}>Food Item</th>
              <th style={thCell}>Vehicle Temp (°C)</th>
              <th style={thCell}>Food Temp (°C)</th>
              <th style={thCell}>Weight (kg)</th>{/* ✅ العمود الجديد */}
              <th style={thCell}>Vehicle clean</th>
              <th style={thCell}>Food handler hygiene</th>
              <th style={thCell}>Appearance</th>
              <th style={thCell}>Firmness</th>
              <th style={thCell}>Smell</th>
              <th style={thCell}>Packaging of food is good and undamaged, clean and no signs of pest infestation</th>
              <th style={thCell}>Country of origin</th>
              <th style={thCell}>Production Date</th>
              <th style={thCell}>Expiry Date</th>
              <th style={thCell}>Remarks (if any)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}>
                  <input type="text" value={r.supplier} onChange={(e)=>updateRow(idx, "supplier", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.foodItem} onChange={(e)=>updateRow(idx, "foodItem", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="number" step="0.1" value={r.vehicleTemp} onChange={(e)=>updateRow(idx, "vehicleTemp", e.target.value)} style={inputStyle} placeholder="°C" />
                </td>
                <td style={tdCell}>
                  <input type="number" step="0.1" value={r.foodTemp} onChange={(e)=>updateRow(idx, "foodTemp", e.target.value)} style={inputStyle} placeholder="°C" />
                </td>

                {/* ✅ Weight (kg) */}
                <td style={tdCell}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.weightKg}
                    onChange={(e)=>updateRow(idx, "weightKg", e.target.value)}
                    style={inputStyle}
                    placeholder="kg"
                  />
                </td>

                {/* C / NC */}
                {TICK_COLS.map((c) => (
                  <td key={c.key} style={tdCell}>
                    <select
                      value={r[c.key]}
                      onChange={(e)=>updateRow(idx, c.key, e.target.value)}
                      style={inputStyle}
                      title="C = Conform, NC = Non-Conform"
                    >
                      <option value=""></option>
                      <option value="C">C</option>
                      <option value="NC">NC</option>
                    </select>
                  </td>
                ))}

                <td style={tdCell}>
                  <input type="text" value={r.countryOfOrigin} onChange={(e)=>updateRow(idx, "countryOfOrigin", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="date" value={r.productionDate} onChange={(e)=>updateRow(idx, "productionDate", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="date" value={r.expiryDate} onChange={(e)=>updateRow(idx, "expiryDate", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.remarks} onChange={(e)=>updateRow(idx, "remarks", e.target.value)} style={inputStyle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ملاحظات */}
      <div style={{ marginTop:10, fontSize:11, color:"#0b1f4d" }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>Organoleptic Checks*</div>
        <div>Appearance: Normal colour (Free from discoloration)</div>
        <div>Firmness: Firm rather than soft.</div>
        <div>Smell: Normal smell (No rancid or strange smell)</div>
        <div style={{ marginTop:8 }}>
          <strong>Note:</strong> For Chilled Food: Target ≤ 5°C (Critical Limit: 5°C; short deviations up to 15 minutes during transfer). 
          For Frozen Food: Target ≤ -18°C (Critical limits: RTE Frozen ≤ -18°C, Raw Frozen ≤ -10°C). 
          For Hot Food: Target ≥ 60°C (Critical Limit: 60°C). 
          Dry food, Low Risk: Receive at cool, dry condition or ≤ 25°C, or as per product requirement.
        </div>
      </div>

      {/* Footer controls */}
      <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginTop:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Verified by:</strong>
          <input
            value={verifiedBy}
            onChange={(e)=>setVerifiedBy(e.target.value)}
            placeholder=""
            style={{
              flex: "0 1 300px",
              border: "none",
              borderBottom: "2px solid #1f3b70",
              padding: "4px 6px",
              outline: "none",
              fontSize: 12,
              color: "#0b1f4d",
            }}
          />
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Received by:</strong>
          <input
            value={receivedBy}
            onChange={(e)=>setReceivedBy(e.target.value)}
            placeholder=""
            style={{
              flex: "0 1 300px",
              border: "none",
              borderBottom: "2px solid #1f3b70",
              padding: "4px 6px",
              outline: "none",
              fontSize: 12,
              color: "#0b1f4d",
            }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:16, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Receiving Log"}
        </button>

        {saveMsg && (
          <div style={{
            fontWeight: 800,
            color: saveMsg.startsWith("✅") ? "#065f46" : saveMsg.startsWith("❌") ? "#b91c1c" : "#92400e"
          }}>
            {saveMsg}
          </div>
        )}
      </div>
    </div>
  );
}
