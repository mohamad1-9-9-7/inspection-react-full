// src/pages/monitor/branches/pos15/POS15ReportsView.jsx
import React, { useState } from "react";

// 👇 استيراد ملفات العرض الخاصة بفرع POS 15 (نفس المجلّد)
import POS15DailyCleaningView from "./POS15DailyCleaningView";
import POS15OilCalibrationView from "./POS15OilCalibrationView";
import POS15PersonalHygieneView from "./POS15PersonalHygieneView";
import POS15DetergentCalibrationView from "./POS15DetergentCalibrationView";
// 🆕 🌡️ درجة الحرارة
import POS15TemperatureView from "./POS15TemperatureView";

export default function POS15ReportsView() {
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
        📊 POS 15 — Reports
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
          style={tabButtonStyle("oil")}
          onClick={() => setActiveTab("oil")}
        >
          🛢️ Oil Calibration
        </button>

        <button
          type="button"
          style={tabButtonStyle("hygiene")}
          onClick={() => setActiveTab("hygiene")}
        >
          🧑‍🔬 Personal Hygiene
        </button>

        {/* 🆕 تبويب الحرارة */}
        <button
          type="button"
          style={tabButtonStyle("temperature")}
          onClick={() => setActiveTab("temperature")}
        >
          🌡️ Temperature
        </button>

        <button
          type="button"
          style={tabButtonStyle("detergent")}
          onClick={() => setActiveTab("detergent")}
        >
          🧴 Detergent Calibration
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
        {activeTab === "cleanliness" && <POS15DailyCleaningView />}
        {activeTab === "oil" && <POS15OilCalibrationView />}
        {activeTab === "hygiene" && <POS15PersonalHygieneView />}
        {/* 🆕 محتوى الحرارة */}
        {activeTab === "temperature" && <POS15TemperatureView />}
        {activeTab === "detergent" && <POS15DetergentCalibrationView />}
      </div>
    </div>
  );
}
