// src/pages/monitor/branches/ftr1/FTR1ReportView.jsx
import React, { useState } from "react";
import FTR1DailyCleanlinessView from "./FTR1DailyCleanlinessView";
import FTR1OilCalibrationView from "./FTR1OilCalibrationView";
import FTR1PersonalHygieneView from "./FTR1PersonalHygieneView";
import FTR1TemperatureView from "./FTR1TemperatureView";

// ✅ التبويب الجديد (عرض سجل الاستلام)
import FTR1ReceivingLogView from "./FTR1ReceivingLogView";

export default function FTR1ReportView() {
  const [activeTab, setActiveTab] = useState("temperature");

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
        📊 FTR 1 Reports
      </h2>

      {/* Tabs Buttons */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <button style={tabButtonStyle("temperature")} onClick={() => setActiveTab("temperature")}>
          🌡️ Temperature
        </button>
        <button style={tabButtonStyle("cleanliness")} onClick={() => setActiveTab("cleanliness")}>
          🧹 Daily Cleanliness
        </button>
        <button style={tabButtonStyle("oil")} onClick={() => setActiveTab("oil")}>
          🛢️ Oil Calibration
        </button>
        <button style={tabButtonStyle("hygiene")} onClick={() => setActiveTab("hygiene")}>
          🧑‍🔬 Personal Hygiene
        </button>
        {/* ✅ زر التبويب الجديد */}
        <button style={tabButtonStyle("receiving")} onClick={() => setActiveTab("receiving")}>
          🚚 Receiving Log
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
        {activeTab === "temperature" && <FTR1TemperatureView />}
        {activeTab === "cleanliness" && <FTR1DailyCleanlinessView />}
        {activeTab === "oil" && <FTR1OilCalibrationView />}
        {activeTab === "hygiene" && <FTR1PersonalHygieneView />}
        {/* ✅ ربط التبويب بالملف الجديد */}
        {activeTab === "receiving" && <FTR1ReceivingLogView />}
      </div>
    </div>
  );
}
