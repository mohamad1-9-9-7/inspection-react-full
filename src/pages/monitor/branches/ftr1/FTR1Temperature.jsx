// src/pages/monitor/branches/ftr1/FTR1Temperature.jsx
import React, { useState, useMemo } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// الأوقات (نرسل "Corrective Action" في الـpayload للتوافق مع العرض، لكن لا نعرضه كعمود)
const times = [
  "8:00 AM",
  "11:00 AM",
  "2:00 PM",
  "5:00 PM",
  "8:00 PM",
  "10:00 PM",
  "Corrective Action",
];
const gridTimes = times.filter((t) => t !== "Corrective Action");

// 8 برادات فقط
const defaultRows = [
  "Cooler 1",
  "Cooler 2",
  "Cooler 3",
  "Cooler 4",
  "Cooler 5",
  "Cooler 6",
  "Cooler 7",
  "Cooler 8",
];

// KPI Helper
function calculateKPI(coolers) {
  const all = [];
  let out = 0;
  for (const c of coolers) {
    for (const [key, v] of Object.entries(c.temps || {})) {
      if (key === "Corrective Action") continue;
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) out += 1;
      }
    }
  }
  const avg = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  return { avg, min, max, out };
}

export default function FTR1Temperature() {
  const [coolers, setCoolers] = useState(
    Array.from({ length: 8 }, (_, i) => ({ name: defaultRows[i], temps: {}, remarks: "" }))
  );
  const [reportDate, setReportDate] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [opMsg, setOpMsg] = useState("");

  const kpi = useMemo(() => calculateKPI(coolers), [coolers]);

  const baseInput = {
    width: "63px",
    padding: "6px 8px",
    borderRadius: "8px",
    border: "1.7px solid #2980b9",
    textAlign: "center",
    fontWeight: "600",
    color: "#2c3e50",
    fontSize: "1em",
    background: "#fafbff",
    transition: "all .18s",
  };
  const tempInputStyle = (val) => {
    const t = Number(val);
    if (val === "" || isNaN(t)) return baseInput;
    if (t > 5 || t < 0)
      return { ...baseInput, background: "#fdecea", borderColor: "#e74c3c", color: "#c0392b", fontWeight: 700 };
    if (t >= 3)
      return { ...baseInput, background: "#eaf6fb", borderColor: "#3498db", color: "#2471a3" };
    return baseInput;
  };

  const setTemp = (rowIdx, time, value) => {
    setCoolers((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], temps: { ...next[rowIdx].temps, [time]: value } };
      return next;
    });
  };
  const setRemarks = (rowIdx, value) => {
    setCoolers((prev) => {
      const next = [...prev];
      next[rowIdx] = {
        ...next[rowIdx],
        remarks: value,
        temps: { ...next[rowIdx].temps, ["Corrective Action"]: value },
      };
      return next;
    });
  };

  const handleSave = async () => {
    if (!reportDate) return alert("⚠️ الرجاء اختيار تاريخ التقرير أولًا");
    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "FTR 1",
        coolers,
        times, // نرسل القائمة الكاملة للتوافق مع صفحة العرض
        date: reportDate,
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
      };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr1", type: "ftr1_temperature", payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved successfully!");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to save.");
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  return (
    <div style={{ background: "#eef3f8", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 18px #d2b4de44" }}>
      {/* ترويسة المستند (مطابقة للعرض) */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                AL<br />MAWASHI
              </div>
            </td>
            <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
            <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Area:</b> QA</td>
            <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
            <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
      <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP)</div>

      {/* تاريخ التقرير */}
      <div style={{ margin: "8px 0 10px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <label style={{ fontWeight: 600 }}>📅 Date:</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #9aa4ae", background: "#fff" }}
        />
      </div>

      {/* تعليمات */}
      <div style={rulesBox}>
        <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
        <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
        <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
        <div style={{ marginTop: 6 }}>
          <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
        </div>
      </div>

      {/* جدول الإدخال */}
      <table style={gridTable}>
        <thead>
          <tr>
            <th style={thCell}>Cooler</th>
            {gridTimes.map((t) => (
              <th key={t} style={thCell}>{t}</th>
            ))}
            <th style={thCell}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {coolers.map((c, row) => (
            <tr key={row}>
              <td style={tdCellLeft}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
              </td>

              {gridTimes.map((t) => (
                <td key={t} style={tdCellCenter}>
                  <input
                    type="number"
                    value={c.temps?.[t] ?? ""}
                    onChange={(e) => setTemp(row, t, e.target.value)}
                    style={tempInputStyle(c.temps?.[t])}
                    placeholder="°C"
                    min="-10"
                    max="50"
                    step="0.1"
                  />
                </td>
              ))}

              <td style={tdCellLeft}>
                <input
                  type="text"
                  value={c.remarks}
                  onChange={(e) => setRemarks(row, e.target.value)}
                  placeholder="Write action / notes"
                  style={{ border: "1px solid #29b97dff", borderRadius: 8, padding: "6px 8px", minWidth: 220, fontWeight: 600 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* KPI + Checked/Verified + Save */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>
          KPI — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Checked By:-</span>
            <input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)}
                   placeholder="Enter name" style={miniInput} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Verified By:-</span>
            <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)}
                   placeholder="Enter name" style={miniInput} />
          </div>
          <button onClick={handleSave} style={saveBtn}>💾 Save to Server</button>
        </div>
      </div>

      {opMsg && (
        <div style={{ marginTop: 10, fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>
          {opMsg}
        </div>
      )}
    </div>
  );
}

/* ===== Styles (مطابقة للعرض) ===== */
const topTable = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "8px",
  fontSize: "0.9rem",
  border: "1px solid #9aa4ae",
  background: "#f8fbff",
};
const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
const band1 = {
  width: "100%",
  textAlign: "center",
  background: "#bfc7cf",
  color: "#2c3e50",
  fontWeight: 700,
  padding: "6px 4px",
  border: "1px solid #9aa4ae",
  borderTop: "none",
};
const band2 = {
  width: "100%",
  textAlign: "center",
  background: "#dde3e9",
  color: "#2c3e50",
  fontWeight: 700,
  padding: "6px 4px",
  border: "1px solid #9aa4ae",
  borderTop: "none",
  marginBottom: "8px",
};
const rulesBox = { border: "1px solid #9aa4ae", background: "#f1f5f9", padding: "8px 10px", fontSize: "0.92rem", marginBottom: "10px" };

const gridTable = { width: "100%", borderCollapse: "collapse", border: "1px solid #9aa4ae", background: "#ffffff" };
const thCell = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center", background: "#e0e6ed", fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" };
const tdCellCenter = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center" };
const tdCellLeft = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "left" };

const miniInput = { border: "1px solid #aaa", borderRadius: 6, padding: "4px 8px", minWidth: 160, background: "#fff" };
const saveBtn = {
  background: "linear-gradient(180deg,#10b981,#059669)",
  color: "#fff",
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "0.95rem",
  boxShadow: "0 6px 14px rgba(16,185,129,.3)",
};
