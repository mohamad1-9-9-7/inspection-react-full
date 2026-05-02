// src/pages/monitor/branches/_shared/BranchInputLayout.jsx
// مكوّن موحّد لصفحات الإدخال متعدّدة التبويبات (POS 10/11/15/24/26 ...)
// يستبدل التكرار في POS{10,11,15,24,26}Layout.jsx
//
// الاستخدام:
//   <BranchInputLayout config={{
//     branch: "POS 11",
//     source: "pos11-tabs",
//     title: "📋 POS 11 — Operations Inputs (Al Ain Butchery)",
//     description: "All input tabs ... in one place.",
//     defaultTab: "shipments",
//     tabs: [
//       { key: "shipments", label: "📦 Shipments", Component: SomeLazy, loadingText: "Loading..." },
//       { key: "personal",  label: "🧑‍🔬 Personal Hygiene", Component: AnotherLazy },
//       // tab بدون Component يعرض placeholder
//     ],
//   }} />
//
// يحافظ تماماً على نفس السلوك القديم: نفس الـ URL params, نفس الستايل, نفس الـ Card wrapper.

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "react-router-dom";

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

const PlaceholderCard = () => (
  <div
    style={{
      background: "#fafafa",
      border: "1.5px solid #e5e7eb",
      borderRadius: 12,
      padding: "1.25rem",
      boxShadow: "inset 0 0 6px rgba(0,0,0,0.05)",
      minHeight: 280,
      color: "#6b7280",
      fontWeight: 700,
    }}
  >
    This tab is empty for now. Tell me if you want it embedded here or linked to an existing screen.
  </div>
);

export default function BranchInputLayout({ config }) {
  const {
    branch,
    source,
    title,
    description,
    defaultTab,
    tabs = [],
  } = config || {};

  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || "");

  // الحفاظ على بارامترات الـ URL (نفس سلوك الكود القديم)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (branch && !qs.get("branch")) { qs.set("branch", branch); changed = true; }
    if (source && !qs.get("source")) { qs.set("source", source); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = tabs.find((t) => t.key === activeTab);

  const renderActive = () => {
    if (!active) return null;
    if (!active.Component) return <PlaceholderCard />;
    const Cmp = active.Component;
    const fallback = (
      <div style={{ fontWeight: 800, color: "#6b7280" }}>
        {active.loadingText || `Loading ${active.label}…`}
      </div>
    );
    return (
      <Card>
        <Suspense fallback={fallback}>
          <Cmp />
        </Suspense>
      </Card>
    );
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
        {(title || description) && (
          <div style={{ marginBottom: "1.5rem" }}>
            {title && (
              <h2 style={{ fontSize: "1.9rem", marginBottom: "0.5rem", color: "#1f2937" }}>
                {title}
              </h2>
            )}
            {description && (
              <p style={{ color: "#6b7280", fontSize: "1rem" }}>
                {description}
              </p>
            )}
          </div>
        )}

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
                minWidth: "200px",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: 600,
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

        {/* Active tab content */}
        {renderActive()}
      </div>
    </div>
  );
}
