// src/pages/monitor/branches/pos 11/POS11ReportsViewLayout.jsx
// POS 11 — View Tabs (FTR1-style).
// يعرض ملفات الـ View لكل نموذج في تبويبات منظمة (بدون تبويب الشحنات).

import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";

/* =============== Local Views (نفس المجلد) =============== */
const POS11PersonalHygieneView = lazy(() =>
  import("./POS11PersonalHygieneView").then((m) => ({
    default: m.default || m.POS11PersonalHygieneView,
  }))
);

const POS11DailyCleaningView = lazy(() =>
  import("./POS11DailyCleaningView").then((m) => ({
    default: m.default || m.POS11DailyCleaningView,
  }))
);

const POS11TemperatureView = lazy(() =>
  import("./POS11TemperatureView").then((m) => ({
    default: m.default || m.POS11TemperatureView,
  }))
);

const POS11TraceabilityLogView = lazy(() =>
  import("./POS11TraceabilityLogView").then((m) => ({
    default: m.default || m.POS11TraceabilityLogView,
  }))
);

const POS11ReceivingLogView = lazy(() =>
  import("./POS11ReceivingLogView").then((m) => ({
    default: m.default || m.POS11ReceivingLogView,
  }))
);

const POS11PestControlView = lazy(() =>
  import("./POS11PestControlView").then((m) => ({
    default: m.default || m.POS11PestControlView,
  }))
);

const POS11CalibrationView = lazy(() =>
  import("./POS11CalibrationView").then((m) => ({
    default: m.default || m.POS11CalibrationView,
  }))
);

export default function POS11ReportsViewLayout() {
  // الافتراضي أصبح أول تبويب عرض محلي
  const [activeTab, setActiveTab] = useState("personal-view");

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (!qs.get("branch")) { qs.set("branch", "POS 11"); changed = true; }
    if (!qs.get("source")) { qs.set("source", "pos11-views"); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { key: "personal-view",  label: "🧑‍🔬 Personal Hygiene (View)" },
    { key: "daily-view",     label: "🧹 Daily Cleaning (View)" },
    { key: "temp-view",      label: "🌡️ Temperature (View)" },
    { key: "trace-view",     label: "🧬 Traceability Log (View)" },
    { key: "recv-view",      label: "📥 Receiving Log (View)" },
    { key: "pest-view",      label: "🪲 Pest Control (View)" },
    { key: "calib-view",     label: "🧰 Calibration (View)" },
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
      case "personal-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Personal Hygiene view…</div>}>
              <POS11PersonalHygieneView />
            </Suspense>
          </Card>
        );
      case "daily-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Daily Cleaning view…</div>}>
              <POS11DailyCleaningView />
            </Suspense>
          </Card>
        );
      case "temp-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Temperature view…</div>}>
              <POS11TemperatureView />
            </Suspense>
          </Card>
        );
      case "trace-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Traceability Log view…</div>}>
              <POS11TraceabilityLogView />
            </Suspense>
          </Card>
        );
      case "recv-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Receiving Log view…</div>}>
              <POS11ReceivingLogView />
            </Suspense>
          </Card>
        );
      case "pest-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Pest Control view…</div>}>
              <POS11PestControlView />
            </Suspense>
          </Card>
        );
      case "calib-view":
        return (
          <Card>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>Loading Calibration view…</div>}>
              <POS11CalibrationView />
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
        background: "linear-gradient(135deg, #1CB5E0 0%, #000851 100%)",
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
            🗂️ POS 11 — Reports Viewer (Al Ain Butchery)
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            Browse all reports (Personal Hygiene, Daily Cleaning, Temperature, Traceability, Receiving, Pest Control, Calibration).
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
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: "1",
                minWidth: "220px",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: "600",
                cursor: "pointer",
                border: "1.5px solid #d1d5db",
                background: activeTab === tab.key ? "#10b981" : "#f3f4f6",
                color: activeTab === tab.key ? "#fff" : "#111827",
                boxShadow:
                  activeTab === tab.key
                    ? "0 4px 12px rgba(16,185,129,0.25)"
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
