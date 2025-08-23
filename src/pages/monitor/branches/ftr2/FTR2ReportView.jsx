// src/pages/monitor/branches/ftr2/FTR2ReportView.jsx
import React, { useState } from "react";
import FTR2DailyCleanlinessView from "./FTR2DailyCleanlinessView";
import FTR2OilCalibrationView from "./FTR2OilCalibrationView";
import FTR2PersonalHygieneView from "./FTR2PersonalHygieneView";
import FTR2TemperatureView from "./FTR2TemperatureView";

export default function FTR2ReportView() {
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
        📊 FTR2 Reports
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
        {activeTab === "temperature" && <FTR2TemperatureView />}
        {activeTab === "cleanliness" && <FTR2DailyCleanlinessView />}
        {activeTab === "oil" && <FTR2OilCalibrationView />}
        {activeTab === "hygiene" && <FTR2PersonalHygieneView />}
      </div>
    </div>
  );
}
