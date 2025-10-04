// src/pages/monitor/branches/QCSReport.jsx
import React, { useState } from "react";
import QCSRawMaterialInspection from "./shipment_recc/QCSRawMaterialInspection";
import PersonalHygieneTab from "./qcs/PersonalHygieneTab";
import DailyCleanlinessTab from "./qcs/DailyCleanlinessTab";
import CoolersTab from "./qcs/CoolersTab";

// ✅ استيراد الصفحة الجديدة من نفس مسار التبويبات القديمة (داخل مجلد qcs)
import FreshChickenInter from "./qcs/FreshChickenInter";

export default function QCSReport() {
  const [activeTab, setActiveTab] = useState("shipment");

  const COLORS = {
    ink: "#0f172a",
    sub: "#475569",
    bg: "#f1f5f9",
    white: "#ffffff",
    primary: "#2563eb",
    primarySoft: "#e0e7ff",
    border: "#e2e8f0",
    shadow: "0 8px 20px rgba(2,6,23,.06)",
  };

  const page = {
    padding: "1rem",
    direction: "ltr",
    background: COLORS.bg,
    color: COLORS.ink,
    fontFamily:
      "Cairo, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    minHeight: "100vh",
    fontSize: "16px",
    lineHeight: 1.6,
  };

  const card = {
    background: COLORS.white,
    padding: "1.25rem",
    marginBottom: "1rem",
    borderRadius: 16,
    boxShadow: COLORS.shadow,
    border: `1px solid ${COLORS.border}`,
  };

  const tabBar = {
    ...card,
    padding: "0.75rem 0.75rem",
    display: "flex",
    gap: 16,
    alignItems: "center",
    justifyContent: "flex-start",
    overflowX: "auto",
    scrollbarWidth: "thin",
    flexWrap: "wrap",
  };

  const tabBtn = (active) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 999,
    border: `2px solid ${active ? COLORS.primary : COLORS.border}`,
    background: active ? COLORS.primary : COLORS.white,
    color: active ? "#fff" : COLORS.sub,
    fontWeight: 900,
    fontSize: "1rem",
    letterSpacing: ".2px",
    cursor: "pointer",
    boxShadow: active ? "0 8px 18px rgba(37,99,235,.25)" : "none",
    transition: "transform .08s ease, background .15s ease, border-color .15s ease",
    whiteSpace: "nowrap",
  });

  const titleWrap = {
    ...card,
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
  };

  const title = {
    margin: 0,
    fontSize: "1.4rem",
    fontWeight: 900,
    letterSpacing: ".2px",
  };

  const subtitle = {
    color: COLORS.sub,
    fontWeight: 700,
    fontSize: ".95rem",
  };

  const tabs = [
    { id: "shipment", label: "📦 Raw Material Receipt" },
    { id: "coolers", label: "🧊 Coolers Temperatures" },
    { id: "personalHygiene", label: "🧼 Personal Hygiene" },
    { id: "dailyCleanliness", label: "🧹 Daily Cleanliness" },
    // 🆕 تبويب القصيص
    { id: "qusaisFreshChicken", label: "🍗 Al Qusais • Fresh Chicken" },
  ];

  return (
    <div style={page}>
      <div style={titleWrap}>
        <h2 style={title}>📋 QCS Branch Daily Report</h2>
        <span style={subtitle}>Quality Control • Daily Operations</span>
      </div>

      <div style={tabBar} role="tablist" aria-label="QCS sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={tabBtn(activeTab === t.id)}
            role="tab"
            aria-selected={activeTab === t.id}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "shipment" && (
          <div style={card}>
            <h3 style={{ marginTop: 0, fontSize: "1.15rem", fontWeight: 900 }}>
              Raw Material Receipt
            </h3>
            <QCSRawMaterialInspection />
          </div>
        )}

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

        {/* تبويب القصيص — صفحة الإدخال الجديدة */}
        {activeTab === "qusaisFreshChicken" && (
          <div style={card}>
            <FreshChickenInter />
          </div>
        )}
      </div>
    </div>
  );
}
// ✅ استيراد الصفحة الجديدة من نفس مسار التبويبات القديمة (داخل مجلد qcs)  