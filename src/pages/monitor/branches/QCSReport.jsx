// src/pages/monitor/branches/QCSReport.jsx
import React, { useState } from "react";
import QCSRawMaterialInspection from "./shipment_recc/QCSRawMaterialInspection";
import PersonalHygieneTab from "./qcs/PersonalHygieneTab";
import DailyCleanlinessTab from "./qcs/DailyCleanlinessTab";
import CoolersTab from "./qcs/CoolersTab";

export default function QCSReport() {
  const [activeTab, setActiveTab] = useState("coolers");

  const card = {
    background: "#fff",
    padding: "1rem",
    marginBottom: "1rem",
    borderRadius: 12,
    boxShadow: "0 0 8px rgba(0,0,0,.10)",
  };
  const tabBtn = (active) => ({
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: active ? 700 : 500,
    backgroundColor: active ? "#2980b9" : "#e5e7eb",
    color: active ? "#fff" : "#374151",
  });

  const tabs = [
    { id: "coolers", label: "🧊 Coolers Temperatures" },
    { id: "personalHygiene", label: "🧼 Personal Hygiene" },
    { id: "dailyCleanliness", label: "🧹 Daily Cleanliness" },
    { id: "shipment", label: "📦 Raw Material Receipt" },
  ];

  return (
    <div
      style={{
        padding: "1rem",
        direction: "ltr",
        background: "#f8fafc",
        color: "#111827",
        fontFamily: "Cairo, sans-serif",
        minHeight: "100vh",
      }}
    >
      {/* عنوان الصفحة فقط */}
      <div
        style={{
          ...card,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ margin: 0 }}>📋 QCS Branch Daily Report</h2>
      </div>

      {/* أزرار التبويبات */}
      <div style={{ ...card, display: "flex", gap: 8, justifyContent: "center" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabBtn(activeTab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويبات (كل تبويب مسؤول عن التاريخ والحفظ بنفسه) */}
      <div>
        {activeTab === "coolers" && (
          <div style={card}>
            <CoolersTab />
          </div>
        )}

        {activeTab === "personalHygiene" && (
          <div style={card}>
            <PersonalHygieneTab />
          </div>
        )}

        {activeTab === "dailyCleanliness" && (
          <div style={card}>
            <DailyCleanlinessTab />
          </div>
        )}

        {activeTab === "shipment" && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Raw Material Receipt</h3>
            <QCSRawMaterialInspection />
          </div>
        )}
      </div>
    </div>
  );
}
