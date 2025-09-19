// src/pages/monitor/branches/pos15/POS15Layout.jsx
// POS 15 — Input Tabs (FTR1-style).
// "Shipments" renders the real form inline; other tabs load from their own files (same folder).

import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";

// Inline the original shipments form
const QCSRawMaterialInspection = lazy(() =>
  import("../shipment_recc/QCSRawMaterialInspection").then((m) => ({
    default: m.default || m.QCSRawMaterialInspection,
  }))
);

// 🔧 تبويبات بنفس المجلّد — نلتقط default أو named
const POS15PersonalHygiene = lazy(() =>
  import("./POS15PersonalHygiene").then((m) => ({
    default: m.default || m.POS15PersonalHygiene,
  }))
);
const POS15DailyCleaning = lazy(() =>
  import("./POS15DailyCleaning").then((m) => ({
    default: m.default || m.POS15DailyCleaning,
  }))
);

// 🆕 🌡️ Temperature (Input)
const POS15TemperatureInput = lazy(() =>
  import("./POS15TemperatureInput").then((m) => ({
    default: m.default || m.POS15TemperatureInput,
  }))
);

export default function POS15Layout() {
  const [activeTab, setActiveTab] = useState("shipments");

  // Ensure URL params match the old flow (if the form reads branch/source from query)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (!qs.get("branch")) { qs.set("branch", "POS 15"); changed = true; }
    if (!qs.get("source")) { qs.set("source", "pos15-tabs"); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { key: "shipments",   label: "📦 Shipments" },
    { key: "personal",    label: "🧑‍🔬 Personal Hygiene" },
    { key: "daily",       label: "🧹 Daily Cleaning" },
    { key: "temperature", label: "🌡️ Temperature" },
  ];

  const Card = ({ children }) => (
    <div
      style={{
        background: "#fafafa",
        border: "1.5px solid #e5e7eb",
        borderRadius: "12px",
        padding: "1.25rem",
        boxShadow: "inset 0 0 6px rgba(0,0,0,0.05)",
        minHeight: 280,
      }}
    >
      {children}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "shipments":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Shipments form…</div>}>
              <QCSRawMaterialInspection />
            </Suspense>
          </Card>
        );
      case "personal":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Personal Hygiene…</div>}>
              <POS15PersonalHygiene />
            </Suspense>
          </Card>
        );
      case "daily":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Daily Cleaning…</div>}>
              <POS15DailyCleaning />
            </Suspense>
          </Card>
        );
      case "temperature":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Temperature…</div>}>
              <POS15TemperatureInput />
            </Suspense>
          </Card>
        );
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
        direction: "ltr",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
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
          <h2 style={{ fontSize: "1.9rem", marginBottom: "0.5rem", color: "#1f2937" }}>
            📋 POS 15 — Operations Inputs
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            All input tabs (Shipments, Personal Hygiene, Daily Cleaning, and Temperature) in one place.
          </p>
        </div>

        {/* Tabs (FTR1-style) */}
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
              type="button"
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
                textAlign: "center",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {renderContent()}
      </div>
    </div>
  );
}
