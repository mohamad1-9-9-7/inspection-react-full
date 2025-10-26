// src/pages/monitor/branches/ftr1/FTR1Report.jsx
import React, { useState } from "react";
import FTR1PersonalHygiene from "./FTR1PersonalHygiene";
import FTR1DailyCleanliness from "./FTR1DailyCleanliness";
import FTR1Temperature from "./FTR1Temperature";
import FTR1OilCalibration from "./FTR1OilCalibration";
import FTR1ReceivingLog from "./FTR1ReceivingLog";

/* ✅ التبويب/الملف الجديد: Cooking Temperature Log */
import FTR1CookingTemperatureLogInput from "./FTR1CookingTemperatureLogInput";

export default function FTR1Report() {
  const [activeTab, setActiveTab] = useState("personal");

  const tabs = [
    { key: "personal",  label: "🧑‍🔬 Personal Hygiene" },
    { key: "daily",     label: "🧹 Daily Cleanliness" },
    { key: "temp",      label: "🌡️ Temperature" },
    { key: "oil",       label: "🛢️ Oil Calibration" },
    { key: "receiving", label: "🚚 Receiving Log (FTR-1)" },
    /* ✅ التبويب المضاف */
    { key: "cook",      label: "🍳 Cooking Temp Log" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "personal":
        return <FTR1PersonalHygiene />;
      case "daily":
        return <FTR1DailyCleanliness />;
      case "temp":
        return <FTR1Temperature />;
      case "oil":
        return <FTR1OilCalibration />;
      case "receiving":
        return <FTR1ReceivingLog />;
      /* ✅ محتوى التبويب الجديد */
      case "cook":
        return <FTR1CookingTemperatureLogInput />;
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem",
        background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          maxWidth: "95%",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2
            style={{
              fontSize: "1.9rem",
              marginBottom: "0.5rem",
              color: "#1f2937",
            }}
          >
            📋 FTR 1 Reports
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            All tabs for hygiene, cleanliness, temperature, oil calibration, cooking temp, and receiving in one place
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: "1",
                minWidth: "200px",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "600",
                cursor: "pointer",
                border: "1.5px solid #d1d5db",
                background: activeTab === tab.key ? "#2563eb" : "#f3f4f6",
                color: activeTab === tab.key ? "#fff" : "#111827",
                boxShadow:
                  activeTab === tab.key
                    ? "0 4px 12px rgba(37,99,235,0.25)"
                    : "none",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tabs Content */}
        <div
          style={{
            background: "#fafafa",
            border: "1.5px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            boxShadow: "inset 0 0 6px rgba(0,0,0,0.05)",
            minHeight: "400px",
          }}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
