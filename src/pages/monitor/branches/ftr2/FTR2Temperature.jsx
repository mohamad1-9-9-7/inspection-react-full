// src/pages/monitor/branches/ftr2/FTR2Temperature.jsx
import React, { useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// === الأوقات الثابتة + خانة الإجراء التصحيحي ===
const times = [
  "8:00 AM",
  "11:00 AM",
  "2:00 PM",
  "5:00 PM",
  "8:00 PM",
  "10:00 PM",
  "Corrective Action",
];

// === KPI Helper ===
function calculateKPI(coolers) {
  let allTemps = [];
  let outOfRange = 0;
  coolers.forEach((cooler) => {
    Object.entries(cooler.temps).forEach(([time, v]) => {
      if (time === "Corrective Action") return; // نتجاهل خانة الإجراء من KPI
      const t = Number(v);
      if (v !== "" && !isNaN(t)) {
        allTemps.push(t);
        if (t < 0 || t > 5) outOfRange += 1;
      }
    });
  });
  const avg = allTemps.length
    ? (allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(2)
    : "—";
  const min = allTemps.length ? Math.min(...allTemps) : "—";
  const max = allTemps.length ? Math.max(...allTemps) : "—";
  return { avg, outOfRange, min, max };
}

export default function FTR2Temperature() {
  // 9 برادات
  const [coolers, setCoolers] = useState(
    Array.from({ length: 9 }, () => ({ temps: {} }))
  );
  const [reportDate, setReportDate] = useState(""); 
  const [checkedBy, setCheckedBy] = useState(""); 
  const [verifiedBy, setVerifiedBy] = useState(""); 
  const [opMsg, setOpMsg] = useState("");

  const inputStyle = {
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

  function tempInputStyle(temp) {
    let t = Number(temp);
    if (isNaN(t) || temp === "") return inputStyle;
    if (t > 5 || t < 0)
      return {
        ...inputStyle,
        background: "#fdecea",
        borderColor: "#e74c3c",
        color: "#c0392b",
        fontWeight: 700,
      };
    if (t >= 3)
      return {
        ...inputStyle,
        background: "#eaf6fb",
        borderColor: "#3498db",
        color: "#2471a3",
      };
    return inputStyle;
  }

  const handleCoolerChange = (index, time, value) => {
    const updated = [...coolers];
    updated[index].temps[time] = value;
    setCoolers(updated);
  };

  // حفظ البيانات على السيرفر
  const handleSave = async () => {
    if (!reportDate) {
      alert("⚠️ الرجاء اختيار تاريخ التقرير أولاً");
      return;
    }

    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "FTR 2",
        coolers,
        times,
        date: reportDate,
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "ftr2",
          type: "ftr2_temperature",
          payload,
        }),
      });

      const text = await res.text();
      console.log("Server response:", text);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved successfully!");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ Failed to save.");
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  const kpi = calculateKPI(coolers);

  return (
    <div
      style={{
        background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
        padding: "2.2rem 1.2rem",
        borderRadius: "14px",
        boxShadow: "0 4px 18px #d2b4de44",
        marginBottom: 32,
      }}
    >
      <h3 style={{ color: "#2980b9", marginBottom: "1.4rem", textAlign: "center" }}>
        🌡️ FTR 2 — Cooler Temperatures
      </h3>

      {/* اختيار التاريخ */}
      <div style={{ marginBottom: "1.2rem", textAlign: "center" }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>📅 Report Date:</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
        />
      </div>

      {coolers.map((cooler, i) => (
        <div
          key={i}
          style={{
            marginBottom: "1.7rem",
            padding: "1.2rem 0.6rem",
            background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa",
            borderRadius: "12px",
            boxShadow: "inset 0 0 7px #d6eaf8aa",
          }}
        >
          <div
            style={{
              marginBottom: "0.9rem",
              fontWeight: "bold",
              fontSize: "1.16em",
              color: "#4c5e34ff",
            }}
          >
            🌡️ Cooler {i + 1}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.65rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            {times.map((time) => (
              <label
                key={time}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: "0.98em",
                  color: "#3b5e34ff",
                  minWidth: "77px",
                }}
              >
                <span
                  style={{
                    marginBottom: "7px",
                    fontWeight: "600",
                  }}
                >
                  {time}
                </span>
                {time === "Corrective Action" ? (
                  <input
                    type="text"
                    value={cooler.temps[time] || ""}
                    onChange={(e) => handleCoolerChange(i, time, e.target.value)}
                    placeholder="Write action"
                    style={{
                      border: "1.7px solid #29b97dff",
                      borderRadius: "8px",
                      padding: "6px 8px",
                      minWidth: "350px",
                      fontWeight: "600",
                    }}
                  />
                ) : (
                  <input
                    type="number"
                    value={cooler.temps[time] || ""}
                    onChange={(e) => handleCoolerChange(i, time, e.target.value)}
                    style={tempInputStyle(cooler.temps[time])}
                    placeholder="°C"
                    min="-10"
                    max="50"
                    step="0.1"
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* ✅ Remarks + Checked/Verified */}
      <div
        style={{
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "1rem",
          marginTop: "2rem",
          background: "#fff",
        }}
      >
        <div style={{ marginBottom: "1rem", fontWeight: "600" }}>
          REMARKS:-
          <span style={{ marginLeft: "1rem", fontWeight: "400" }}>
            If the temp is 5°C or More, check product temperature and corrective action should be taken
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "2rem",
            fontWeight: "600",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Checked By:-</span>
            <input
              type="text"
              value={checkedBy}
              onChange={(e) => setCheckedBy(e.target.value)}
              placeholder="Enter name"
              style={{
                border: "1px solid #aaa",
                borderRadius: "6px",
                padding: "4px 8px",
                minWidth: "160px",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Verified By:-</span>
            <input
              type="text"
              value={verifiedBy}
              onChange={(e) => setVerifiedBy(e.target.value)}
              placeholder="Enter name"
              style={{
                border: "1px solid #aaa",
                borderRadius: "6px",
                padding: "4px 8px",
                minWidth: "160px",
              }}
            />
          </div>
        </div>
      </div>

      {/* زر الحفظ */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button
          onClick={handleSave}
          style={{
            background: "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            padding: "12px 22px",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "1rem",
            boxShadow: "0 6px 14px rgba(16,185,129,.3)",
          }}
        >
          💾 Save to Server
        </button>
        {opMsg && (
          <div
            style={{
              marginTop: 10,
              fontWeight: 700,
              color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
            }}
          >
            {opMsg}
          </div>
        )}
      </div>
    </div>
  );
}
