// POS 24 — Input Tabs (FTR1-style). "Shipments" renders the real form inline.
import React, { useState, useEffect, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";

// Inline the original shipments form
const QCSRawMaterialInspection = lazy(() =>
  import("../shipment_recc/QCSRawMaterialInspection")
);

export default function POS24Layout() {
  const [activeTab, setActiveTab] = useState("shipments");

  // Ensure URL carries the same query the old flow relied on
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (!qs.get("branch")) { qs.set("branch", "POS 24"); changed = true; }
    if (!qs.get("source")) { qs.set("source", "pos24-tabs"); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
  }, [searchParams, setSearchParams]);

  const tabs = [
    { key: "shipments", label: "📦 Shipments" },
    { key: "personal",  label: "🧑‍🔬 Personal Hygiene" },
    { key: "daily",     label: "🧹 Daily Cleaning" },
    { key: "oil",       label: "🛢️ Oil Calibration" },
    { key: "detergent", label: "🧴 Detergent Calibration" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "shipments":
        return (
          <div style={{
            background:"#fafafa", border:"1.5px solid #e5e7eb", borderRadius:12,
            padding:"1.25rem", boxShadow:"inset 0 0 6px rgba(0,0,0,0.05)", minHeight:280
          }}>
            <Suspense fallback={<div style={{ fontWeight:800, color:"#6b7280" }}>Loading Shipments form…</div>}>
              <QCSRawMaterialInspection />
            </Suspense>
          </div>
        );
      default:
        return (
          <div style={{
            background:"#fafafa", border:"1.5px solid #e5e7eb", borderRadius:12,
            padding:"1.25rem", boxShadow:"inset 0 0 6px rgba(0,0,0,0.05)", minHeight:280,
            color:"#6b7280", fontWeight:700
          }}>
            This tab is empty for now. Tell me if you want it embedded here or linked to an existing screen.
          </div>
        );
    }
  };

  return (
    <div style={{
      minHeight:"100vh", padding:"2rem",
      background:"linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
      direction:"ltr", fontFamily:"Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    }}>
      <div style={{ background:"#fff", borderRadius:16, padding:"2rem",
        boxShadow:"0 8px 20px rgba(0,0,0,0.15)", maxWidth:"95%", margin:"0 auto" }}>
        <div style={{ marginBottom:"1.5rem" }}>
          <h2 style={{ fontSize:"1.9rem", marginBottom:".5rem", color:"#1f2937" }}>📋 POS 24 — Operations Inputs</h2>
          <p style={{ color:"#6b7280", fontSize:"1rem" }}>
            All input tabs (Shipments, Personal Hygiene, Daily Cleaning, Oil Calibration, and Detergent Calibration) in one place.
          </p>
        </div>

        <div style={{ display:"flex", gap:"1rem", marginBottom:"1.5rem", flexWrap:"wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex:"1", minWidth:"200px", padding:"12px 20px", borderRadius:"10px",
                fontWeight:600, cursor:"pointer", border:"1.5px solid #d1d5db",
                background: activeTab === tab.key ? "#2563eb" : "#f3f4f6",
                color: activeTab === tab.key ? "#fff" : "#111827",
                boxShadow: activeTab === tab.key ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                transition:"all 0.2s", textAlign:"center"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {renderContent()}
      </div>
    </div>
  );
}
