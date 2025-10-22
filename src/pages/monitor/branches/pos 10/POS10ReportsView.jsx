// src/pages/monitor/branches/pos 10/POS10ReportsView.jsx
import React, { useState } from "react";

// 👇 استيراد ملفات العرض الخاصة بفرع POS 10 (من نفس المجلّد)
import POS10DailyCleaningView from "./POS10DailyCleaningView";
import POS10PersonalHygieneView from "./POS10PersonalHygieneView";
// 🌡️ درجة الحرارة
import POS10TemperatureView from "./POS10TemperatureView";
// 📥 Receiving Log (View)
import POS10ReceivingLogView from "./POS10ReceivingLogView";
// 🧬 Traceability Log (View) — NEW
import POS10TraceabilityLogView from "./POS10TraceabilityLogView";

export default function POS10ReportsView() {
  // الافتراضي: النظافة اليومية
  const [activeTab, setActiveTab] = useState("cleanliness");

  const tabButtonStyle = (tab) => ({
    padding: "10px 18px",
    borderRadius: "8px",
    border: "none",
    marginRight: "8px",
    cursor: "pointer",
    fontWeight: 600,
    background: activeTab === tab ? "#2980b9" : "#ecf0f1",
    color: activeTab === tab ? "#fff" : "#2c3e50",
    boxShadow: activeTab === tab ? "0 3px 10px rgba(0,0,0,0.2)" : "none",
    transition: "all .2s",
  });

  return (
    <div style={{ padding: "2rem" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1.5rem", color: "#34495e" }}>
        📊 POS 10 — Reports
      </h2>

      {/* Tabs Buttons */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <button
          type="button"
          style={tabButtonStyle("cleanliness")}
          onClick={() => setActiveTab("cleanliness")}
        >
          🧹 Daily Cleaning
        </button>

        <button
          type="button"
          style={tabButtonStyle("hygiene")}
          onClick={() => setActiveTab("hygiene")}
        >
          🧑‍🔬 Personal Hygiene
        </button>

        <button
          type="button"
          style={tabButtonStyle("temperature")}
          onClick={() => setActiveTab("temperature")}
        >
          🌡️ Temperature
        </button>

        <button
          type="button"
          style={tabButtonStyle("receiving")}
          onClick={() => setActiveTab("receiving")}
        >
          📥 Receiving Log
        </button>

        {/* NEW: Traceability */}
        <button
          type="button"
          style={tabButtonStyle("traceability")}
          onClick={() => setActiveTab("traceability")}
        >
          🧬 Traceability Log
        </button>
      </div>

      {/* Tabs Content */}
      <div
        style={{
          background: "#fdfdfd",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {activeTab === "cleanliness" && <POS10DailyCleaningView />}
        {activeTab === "hygiene" && <POS10PersonalHygieneView />}
        {activeTab === "temperature" && <POS10TemperatureView />}
        {activeTab === "receiving" && <POS10ReceivingLogView />}
        {activeTab === "traceability" && <POS10TraceabilityLogView />}{/* NEW */}
      </div>
    </div>
  );
}
