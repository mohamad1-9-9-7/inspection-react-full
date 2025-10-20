// src/pages/monitor/branches/pos15/POS15ReceivingLogInput.jsx
import React, { useMemo, useState } from "react";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

// نوع التقرير و الفرع (مكيّف لـ POS 15) — بدون أي ذكر لجهة خارجية
const TYPE   = "pos15_receiving_log_butchery";
const BRANCH = "POS 15";

// أعمدة C / NC
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
    date: "", time: "", supplier: "", foodItem: "", dmApprovalNo: "",
    vehicleTemp: "", foodTemp: "",
    vehicleClean: "", handlerHygiene: "", appearanceOK: "", firmnessOK: "", smellOK: "", packagingGood: "",
    countryOfOrigin: "", productionDate: "", expiryDate: "", invoiceNo: "", remarks: "", receivedBy: "",
  };
}

export default function POS15ReceivingLogInput() {
  // تاريخ التقرير الهيدر
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  // عدد الصفوف
  const ROW_COUNT = 15;
  const [rows, setRows] = useState(() => Array.from({ length: ROW_COUNT }, () => emptyRow()));

  // هيدر (أسماء عامة)
  const [formRef, setFormRef] = useState("FSMS/BR/F01A");
  const [classification] = useState("Official");

  // فوتر
  const [verifiedBy, setVerifiedBy] = useState("");

  const [saving, setSaving] = useState(false);

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

  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 100 }} />,   <col key="time" style={{ width: 84 }} />,
    <col key="supplier" style={{ width: 170 }} />, <col key="food" style={{ width: 160 }} />,
    <col key="dm" style={{ width: 140 }} />, <col key="vehT" style={{ width: 90 }} />, <col key="foodT" style={{ width: 90 }} />,
    <col key="vehClean" style={{ width: 120 }} />, <col key="handler" style={{ width: 140 }} />,
    <col key="appearanceOK" style={{ width: 120 }} />, <col key="firmnessOK" style={{ width: 110 }} />, <col key="smellOK" style={{ width: 110 }} />,
    <col key="pack" style={{ width: 220 }} />,
    <col key="origin" style={{ width: 120 }} />, <col key="prod" style={{ width: 120 }} />, <col key="exp" style={{ width: 120 }} />,
    <col key="inv" style={{ width: 120 }} />, <col key="remarks" style={{ width: 180 }} />, <col key="received" style={{ width: 120 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  async function handleSave() {
    const entries = rows.filter((r) => Object.values(r).some((v) => String(v || "").trim() !== ""));
    if (entries.length === 0) { alert("لا يوجد بيانات للحفظ."); return; }

    const payload = {
      branch: BRANCH, formRef, classification, reportDate, month: monthText,
      entries, verifiedBy, savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos15", type: TYPE, payload }),
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
      {/* Header — بدون شعار أو اسم جهة */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Receiving Log</div>
          <div style={{ fontWeight:800, fontSize:16 }}>
            Butchery — {BRANCH}
          </div>
        </div>

        {/* Right meta */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 170px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div>
          <input value={formRef} onChange={(e)=>setFormRef(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />

          <div>Classification :</div>
          <div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>Official</div>

          <div>Date :</div>
          <input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
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
              <th style={thCell}>Date</th>
              <th style={thCell}>Time</th>
              <th style={thCell}>Name of the Supplier</th>
              <th style={thCell}>Food Item</th>
              <th style={thCell}>DM approval number of the delivery vehicle</th>
              <th style={thCell}>Vehicle Temp (°C)</th>
              <th style={thCell}>Food Temp (°C)</th>
              <th style={thCell}>Vehicle clean</th>
              <th style={thCell}>Food handler hygiene</th>
              <th style={thCell}>Appearance</th>
              <th style={thCell}>Firmness</th>
              <th style={thCell}>Smell</th>
              <th style={thCell}>Packaging of food is good and undamaged, clean and no signs of pest infestation</th>
              <th style={thCell}>Country of origin</th>
              <th style={thCell}>Production Date</th>
              <th style={thCell}>Expiry Date</th>
              <th style={thCell}>Invoice No:</th>
              <th style={thCell}>Remarks (if any)</th>
              <th style={thCell}>Received by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}>
                  <input type="date" value={r.date} onChange={(e)=>updateRow(idx, "date", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="time" value={r.time} onChange={(e)=>updateRow(idx, "time", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.supplier} onChange={(e)=>updateRow(idx, "supplier", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.foodItem} onChange={(e)=>updateRow(idx, "foodItem", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.dmApprovalNo} onChange={(e)=>updateRow(idx, "dmApprovalNo", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="number" step="0.1" value={r.vehicleTemp} onChange={(e)=>updateRow(idx, "vehicleTemp", e.target.value)} style={inputStyle} placeholder="°C" />
                </td>
                <td style={tdCell}>
                  <input type="number" step="0.1" value={r.foodTemp} onChange={(e)=>updateRow(idx, "foodTemp", e.target.value)} style={inputStyle} placeholder="°C" />
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
                  <input type="text" value={r.invoiceNo} onChange={(e)=>updateRow(idx, "invoiceNo", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.remarks} onChange={(e)=>updateRow(idx, "remarks", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.receivedBy} onChange={(e)=>updateRow(idx, "receivedBy", e.target.value)} style={inputStyle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div style={{ marginTop:10, fontSize:11, color:"#0b1f4d" }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>Organoleptic Checks*</div>
        <div>Appearance: Normal colour (Free from discoloration)</div>
        <div>Firmness: Firm rather than soft.</div>
        <div>Smell: Normal smell (No rancid or strange smell)</div>
        <div style={{ marginTop:8 }}>
          <strong>Note:</strong> For Chilled Food: Target ≤ 5°C (Critical Limit: 5°C; short deviations up to 15 minutes during transfer).&nbsp;
          For Frozen Food: Target ≤ -18°C (Critical limits: RTE Frozen ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp;
          For Hot Food: Target ≥ 60°C (Critical Limit: 60°C).&nbsp;
          Dry food, Low Risk: Receive at cool, dry condition or ≤ 25°C, or as per product requirement.
        </div>
      </div>

      {/* Footer controls + Verified by */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Receiving Log"}
        </button>
      </div>

      <div style={{ marginTop:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Verified by:</strong>
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
      </div>
    </div>
  );
}
