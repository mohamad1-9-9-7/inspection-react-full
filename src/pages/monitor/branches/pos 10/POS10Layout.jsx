// src/pages/monitor/branches/pos 10/POS10Layout.jsx
// POS 10 — Input Tabs (FTR1-style).
// "Shipments" renders the real form inline; other tabs load from their own files (same folder).

import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";

/* ================== Shared Shipments Form (inline) ================== */
const QCSRawMaterialInspection = lazy(() =>
  import("../shipment_recc/QCSRawMaterialInspection").then((m) => ({
    default: m.default || m.QCSRawMaterialInspection,
  }))
);

/* ================== Local Tabs (same folder) ================== */
// 🧑‍🔬 Personal Hygiene (Input)
const POS10PersonalHygiene = lazy(() =>
  import("./POS10PersonalHygiene").then((m) => ({
    default: m.default || m.POS10PersonalHygiene,
  }))
);

// 🧹 Daily Cleaning (Input)
const POS10DailyCleaning = lazy(() =>
  import("./POS10DailyCleaning").then((m) => ({
    default: m.default || m.POS10DailyCleaning,
  }))
);

// 🌡️ Temperature (Input)
const POS10TemperatureInput = lazy(() =>
  import("./POS10TemperatureInput").then((m) => ({
    default: m.default || m.POS10TemperatureInput,
  }))
);

// 📥 Receiving Log (Input)
const POS10ReceivingLogInput = lazy(() =>
  import("./POS10ReceivingLogInput").then((m) => ({
    default: m.default || m.POS10ReceivingLogInput,
  }))
);

// 🧬 Traceability Log (NEW)
const POS10TraceabilityLogInput = lazy(() =>
  import("./TraceabilityLogInput").then((m) => ({
    default: m.default || m.POS10TraceabilityLogInput || m.TraceabilityLogInput,
  }))
);

// 🪲 Pest Control (NEW INPUT)
const POS10PestControlInput = lazy(() =>
  import("./POS10PestControlInput").then((m) => ({
    default: m.default || m.POS10PestControlInput,
  }))
);

// 🧰 Calibration (NEW INPUT)
const POS10CalibrationInput = lazy(() =>
  import("./POS10CalibrationInput").then((m) => ({
    default: m.default || m.POS10CalibrationInput,
  }))
);

export default function POS10Layout() {
  const [activeTab, setActiveTab] = useState("shipments");

  // Ensure URL params match the expected flow (branch/source used by forms)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (!qs.get("branch")) { qs.set("branch", "POS 10"); changed = true; }
    if (!qs.get("source")) { qs.set("source", "pos10-tabs"); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { key: "shipments",    label: "📦 Shipments" },
    { key: "personal",     label: "🧑‍🔬 Personal Hygiene" },
    { key: "daily",        label: "🧹 Daily Cleaning" },
    { key: "temperature",  label: "🌡️ Temperature" },
    { key: "traceability", label: "🧬 Traceability Log" },
    { key: "receiving",    label: "📥 Receiving Log" },
    // NEW:
    { key: "pest",         label: "🪲 Pest Control" },
    { key: "calibration",  label: "🧰 Calibration" },
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
              <POS10PersonalHygiene />
            </Suspense>
          </Card>
        );
      case "daily":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Daily Cleaning…</div>}>
              <POS10DailyCleaning />
            </Suspense>
          </Card>
        );
      case "temperature":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Temperature…</div>}>
              <POS10TemperatureInput />
            </Suspense>
          </Card>
        );
      case "traceability":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Traceability Log…</div>}>
              <POS10TraceabilityLogInput />
            </Suspense>
          </Card>
        );
      case "receiving":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Receiving Log…</div>}>
              <POS10ReceivingLogInput />
            </Suspense>
          </Card>
        );
      case "pest":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Pest Control…</div>}>
              <POS10PestControlInput />
            </Suspense>
          </Card>
        );
      case "calibration":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Calibration…</div>}>
              <POS10CalibrationInput />
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
            📋 POS 10 — Operations Inputs
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            All input tabs (Shipments, Personal Hygiene, Daily Cleaning, Temperature, Traceability Log, Receiving Log, Pest Control, and Calibration) in one place.
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
