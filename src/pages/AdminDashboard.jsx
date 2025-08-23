// src/pages/AdminDashboard.js

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReportsTab from "./admin/ReportsTab";
import DailyReportsTab from "./admin/DailyReportsTab";
import QCSDailyView from "./admin/QCSDailyView";
import POS19DailyView from "./admin/POS19DailyView";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard from "./KPIDashboard";
import FTR2ReportView from "./monitor/branches/ftr2/FTR2ReportView";

/* وهمي مؤقت لـ FTR1 */
function FTR1DailyView() {
  return <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>📄 FTR1 Report View</div>;
}

/* ====== API BASE (server-only, no localStorage) ====== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* Generic fetcher for arrays returned as raw [] or { ok, data: [] } */
async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch ${type}: ${res.status}`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? [];
}

/* Upsert a single entry to server under a type */
async function upsertOne(type, payload) {
  const body = JSON.stringify({
    reporter: "admin",
    type,
    payload: { ...payload, _clientSavedAt: Date.now() },
  });
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`PUT /api/reports -> ${res.status} ${t}`);
  }
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [activeView, setActiveView] = useState("kpi"); // KPI default
  const [loading, setLoading] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  async function reloadFromServer() {
    setLoading(true);
    setOpMsg("");
    try {
      const [r, d] = await Promise.all([
        fetchByType("reports"),
        fetchByType("dailyReports"),
      ]);
      setReports(r);
      setDailyReports(d);
    } catch (e) {
      console.error(e);
      setOpMsg("Failed to load data from server.");
    } finally {
      setLoading(false);
      setTimeout(() => setOpMsg(""), 3500);
    }
  }

  useEffect(() => {
    reloadFromServer();
  }, []);

  const handleLogout = () => {
    navigate("/");
  };

  const THEME = {
    pageGradient:
      "linear-gradient(130deg, #6d28d9 0%, #6840e0 18%, #4865e0 38%, #2f89db 63%, #2cb4e8 88%)",
    pageOverlay:
      "radial-gradient(1200px 300px at 20% 0%, rgba(255,255,255,.16), rgba(255,255,255,0))",
    card: "rgba(255,255,255,0.88)",
    glass: "rgba(255,255,255,0.75)",
    border: "rgba(255,255,255,0.35)",
    purple: "#6d28d9",
    lilac: "#8e44ad",
    success: "#10b981",
    danger: "#dc2626",
    shadow: "0 14px 38px rgba(16,24,40,.16), 0 2px 6px rgba(16,24,40,.08)",
  };

  function tabButtonStyle(view) {
    const isActive = activeView === view;
    return {
      padding: "12px 22px",
      borderRadius: "14px",
      border: "1.5px solid " + THEME.border,
      cursor: "pointer",
      background: isActive
        ? "linear-gradient(90deg, #6d28d9 0%, #8e44ad 70%)"
        : "rgba(255,255,255,0.70)",
      color: isActive ? "#fff" : "#0f172a",
      fontWeight: 900,
      fontSize: "0.98rem",
      boxShadow: isActive ? "0 12px 24px rgba(109,40,217,.28)" : "0 6px 16px rgba(17,24,39,.12)",
      transform: isActive ? "translateY(-1px)" : "none",
      transition: "all .18s ease",
      backdropFilter: "blur(8px)",
      outline: "none",
    };
  }

  /* ===== Export: Dump current server-loaded arrays ===== */
  function exportToJson(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ===== Import: Upload array to server (UPSERT per item) ===== */
  async function handleServerImport(file, type) {
    const text = await file.text();
    let data = JSON.parse(text);
    if (!Array.isArray(data)) throw new Error("Invalid JSON: expected an array");
    setOpMsg(`Uploading ${data.length} item(s) to ${type}…`);
    for (const item of data) {
      await upsertOne(type, item);
    }
    await reloadFromServer();
    setOpMsg(`✅ Imported ${data.length} item(s) to ${type}.`);
    setTimeout(() => setOpMsg(""), 3500);
  }

  function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const currentType =
      activeView === "reports"
        ? "reports"
        : activeView === "dailyReports"
        ? "dailyReports"
        : null;
    if (!currentType) {
      alert("Import is only available in Reports or Daily Reports tabs.");
      e.target.value = "";
      return;
    }
    handleServerImport(file, currentType).catch((err) => {
      console.error(err);
      setOpMsg("❌ Import failed. Check file format and try again.");
      setTimeout(() => setOpMsg(""), 4000);
    });
    e.target.value = "";
  }

  return (
    <div
      style={{
        background: `${THEME.pageOverlay}, ${THEME.pageGradient}`,
        minHeight: "100vh",
        padding: "22px 20px 24px",
        direction: "ltr",
        fontFamily: "Inter, Arial, sans-serif",
        color: "#0f172a",
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: THEME.card,
          border: "1.5px solid " + THEME.border,
          borderRadius: 18,
          padding: "12px 16px",
          marginBottom: 14,
          boxShadow: THEME.shadow,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: "1.5rem", color: "#0f172a" }}>
          📊 Admin Dashboard
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {loading && (
            <span style={{ fontWeight: 800, color: THEME.purple }}>⏳ Loading…</span>
          )}
          {opMsg && (
            <span
              style={{
                fontWeight: 800,
                color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
              }}
            >
              {opMsg}
            </span>
          )}
          <button
            onClick={reloadFromServer}
            style={{
              background: "linear-gradient(180deg,#3b82f6,#2563eb)",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(59,130,246,.28)",
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: "linear-gradient(180deg,#ef4444, #dc2626)",
              color: "#fff",
              border: "none",
              padding: "10px 16px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              boxShadow: "0 10px 24px rgba(220,38,38,.28)",
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <button style={tabButtonStyle("reports")} onClick={() => setActiveView("reports")}>
          📑 Reports
        </button>
        <button style={tabButtonStyle("dailyReports")} onClick={() => setActiveView("dailyReports")}>
          🗓️ Daily Reports
        </button>
        <button style={tabButtonStyle("qcsShipment")} onClick={() => setActiveView("qcsShipment")}>
          📦 QCS Shipments
        </button>
        <button style={tabButtonStyle("kpi")} onClick={() => setActiveView("kpi")}>
          📈 KPI
        </button>
      </div>

      {/* Import/Export */}
      {["reports", "dailyReports"].includes(activeView) && (
        <div
          style={{
            background: THEME.glass,
            border: "1.5px solid " + THEME.border,
            borderRadius: 16,
            padding: "10px",
            marginBottom: 12,
            backdropFilter: "blur(8px)",
            boxShadow: THEME.shadow,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            onClick={() => {
              const data =
                activeView === "reports" ? reports : dailyReports;
              const name =
                activeView === "reports"
                  ? "reports_server_export.json"
                  : "daily_reports_server_export.json";
              exportToJson(data, name);
            }}
            style={{
              background: "linear-gradient(180deg,#6d28d9,#8e44ad)",
              color: "#fff",
              border: "none",
              padding: "9px 16px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              boxShadow: "0 10px 20px rgba(141,73,170,.28)",
            }}
          >
            ⬇️ Export JSON (from Server)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "linear-gradient(180deg,#10b981,#059669)",
              color: "#fff",
              border: "none",
              padding: "9px 16px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 900,
              boxShadow: "0 10px 20px rgba(16,185,129,.28)",
            }}
          >
            ⬆️ Import JSON (to Server)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          background: THEME.card,
          border: "1.5px solid " + THEME.border,
          borderRadius: 18,
          padding: "16px 14px",
          minHeight: "66vh",
          boxShadow: THEME.shadow,
          backdropFilter: "blur(6px)",
        }}
      >
        {activeView === "reports" ? (
          <ReportsTab reports={reports} setReports={setReports} language="en" />
        ) : activeView === "dailyReports" ? (
          <DailyReportsTab
            dailyReports={dailyReports}
            setDailyReports={setDailyReports}
            onOpenQCSReport={() => setActiveView("qcs")}
            onOpenPOS19Report={() => setActiveView("pos19")}
            onOpenQCSShipmentReport={() => setActiveView("qcsShipment")}
            onOpenFTR1Report={() => setActiveView("ftr1")}
            onOpenFTR2Report={() => setActiveView("ftr2")}
            language="en"
          />
        ) : activeView === "qcsShipment" ? (
          <QCSRawMaterialView language="en" />
        ) : activeView === "kpi" ? (
          <KPIDashboard />
        ) : activeView === "qcs" ? (
          <QCSDailyView language="en" />
        ) : activeView === "pos19" ? (
          <POS19DailyView language="en" />
        ) : activeView === "ftr1" ? (
          <FTR1DailyView />
        ) : activeView === "ftr2" ? (
          <FTR2ReportView language="en" />
        ) : null}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: 18,
          textAlign: "center",
          color: "rgba(255,255,255,.9)",
          fontSize: ".95rem",
          fontWeight: 800,
          textShadow: "0 1px 2px rgba(0,0,0,.15)",
        }}
      >
        All rights reserved © Quality Management System
      </div>
    </div>
  );
}
