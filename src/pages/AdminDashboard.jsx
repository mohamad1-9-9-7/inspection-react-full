// src/pages/AdminDashboard.jsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import ReportsTab from "./admin/ReportsTab";
import DailyReportsTab from "./admin/DailyReportsTab";
import QCSDailyView from "./admin/QCSDailyView";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard from "./KPIDashboard";

// ✅ POS19
import POS19DailyView from "./monitor/branches/pos19/POS19DailyView";

// ✅ FTR1/FTR2
import FTR1ReportView from "./monitor/branches/ftr1/FTR1ReportView";
import FTR2ReportView from "./monitor/branches/ftr2/FTR2ReportView";

// ✅ POS 10 (المجلد باسم: pos 10)
import POS10ReportsView from "./monitor/branches/pos 10/POS10ReportsView";

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

/* ========== غلاف لإخفاء أزرار Delete داخل نطاق محدد فقط ========== */
function HideDeleteScope({ children }) {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const hide = () => {
      const btns = root.querySelectorAll("button, [role='button']");
      btns.forEach((b) => {
        const txt = (b.textContent || "").trim().toLowerCase();
        const title = (b.getAttribute("title") || "").toLowerCase();
        if (txt === "delete" || txt.includes("delete") || title.includes("delete")) {
          b.style.display = "none";
        }
      });
    };

    hide();
    const mo = new MutationObserver(hide);
    mo.observe(root, { childList: true, subtree: true, characterData: true });

    return () => mo.disconnect();
  }, []);

  return <div ref={ref}>{children}</div>;
}

/* ========== الأنواع التي نصدّرها/نستوردها ========== */
const TYPES_BY_GROUP = {
  QCS: ["qcs-coolers", "qcs-ph", "qcs-clean"],
  FTR1: ["ftr1_temperature", "ftr1_daily_cleanliness", "ftr1_oil_calibration", "ftr1_personal_hygiene"],
  FTR2: ["ftr2_temperature", "ftr2_daily_cleanliness", "ftr2_oil_calibration", "ftr2_personal_hygiene"],
  PRODUCTION: ["prod_cleaning_checklist", "prod_personal_hygiene", "prod_defrosting_record"],
};
// مستثنى: الشحنات/الخام

/* === تحميل كل الأنواع ومعرفة الأعداد === */
async function fetchAllTypes() {
  const data = {};
  const counts = {};
  const groups = {};

  for (const [group, typeList] of Object.entries(TYPES_BY_GROUP)) {
    groups[group] = [...typeList];
    for (const type of typeList) {
      try {
        const arr = await fetchByType(type);
        data[type] = arr;
        counts[type] = Array.isArray(arr) ? arr.length : 0;
      } catch (e) {
        console.warn("Fetch failed for type:", type, e);
        data[type] = [];
        counts[type] = 0;
      }
    }
  }

  return { data, counts, groups };
}

/* ===== Export helper ===== */
function downloadJson(data, filename) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [activeView, setActiveView] = useState("dailyReports"); // الافتراضي
  const [loading, setLoading] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  async function reloadFromServer() {
    setLoading(true);
    setOpMsg("");
    try {
      const [r, d] = await Promise.all([fetchByType("reports"), fetchByType("dailyReports")]);
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

  const handleLogout = () => navigate("/");

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

  /* ========== Export All ========== */
  async function handleExportAll() {
    try {
      setOpMsg("Preparing full export…");
      setLoading(true);
      const { data, counts, groups } = await fetchAllTypes();
      const total = Object.values(counts).reduce((a, b) => a + b, 0);

      const out = {
        meta: {
          version: 1,
          exportedAt: new Date().toISOString(),
          apiBase: API_BASE,
          totals: { ...counts, __grandTotal: total },
          groups,
        },
        data,
      };
      downloadJson(out, `qms_all_reports_${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      setOpMsg(`✅ Exported ${total} record(s) from all types.`);
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Export failed.");
    } finally {
      setLoading(false);
      setTimeout(() => setOpMsg(""), 4000);
    }
  }

  /* ========== Import (multi-type) ========== */
  async function multiTypeImport(parsed) {
    let queue = [];

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      if (parsed.data && typeof parsed.data === "object") {
        for (const [type, arr] of Object.entries(parsed.data)) {
          if (!Array.isArray(arr)) continue;
          for (const item of arr) {
            if (item && item.type && item.payload) {
              queue.push({ type: item.type, payload: item.payload });
            } else {
              queue.push({ type, payload: item });
            }
          }
        }
      } else if (parsed.type && Array.isArray(parsed.items)) {
        const defaultType = parsed.type;
        for (const item of parsed.items) {
          if (item && item.type && item.payload) {
            queue.push({ type: item.type, payload: item.payload });
          } else if (item && item.payload) {
            queue.push({ type: defaultType, payload: item.payload });
          } else {
            queue.push({ type: defaultType, payload: item });
          }
        }
      } else {
        throw new Error("Unsupported JSON structure for import.");
      }
    } else if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (item && item.type && item.payload) {
          queue.push({ type: item.type, payload: item.payload });
        } else {
          throw new Error("Array import requires items like {type, payload}.");
        }
      }
    } else {
      throw new Error("Invalid JSON for import.");
    }

    let ok = 0;
    for (const rec of queue) {
      await upsertOne(rec.type, rec.payload);
      ok++;
    }
    return ok;
  }

  async function handleImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      setOpMsg("Reading import file…");
      const text = await file.text();
      const parsed = JSON.parse(text);
      setOpMsg("Uploading to server…");
      const count = await multiTypeImport(parsed);
      await reloadFromServer();
      setOpMsg(`✅ Imported ${count} item(s) across types.`);
    } catch (err) {
      console.error(err);
      setOpMsg("❌ Import failed. Check file format and try again.");
    } finally {
      setLoading(false);
      setTimeout(() => setOpMsg(""), 4000);
      if (e?.target) e.target.value = "";
    }
  }

  return (
    <div
      style={{
        // استخدم خلفيتين معًا بشكل صحيح
        backgroundImage: `${THEME.pageOverlay}, ${THEME.pageGradient}`,
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundSize: "cover, cover",
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
          {loading && <span style={{ fontWeight: 800, color: THEME.purple }}>⏳ Loading…</span>}
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
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 14,
          flexDirection: "row-reverse", // أول زر يمينًا
        }}
      >
        <button style={tabButtonStyle("dailyReports")} onClick={() => setActiveView("dailyReports")}>
          🗓️ Daily Reports
        </button>
        <button style={tabButtonStyle("reports")} onClick={() => setActiveView("reports")}>
          📑 Reports
        </button>
        <button style={tabButtonStyle("qcsShipment")} onClick={() => setActiveView("qcsShipment")}>
          📦 QCS Shipments
        </button>
        <button style={tabButtonStyle("kpi")} onClick={() => setActiveView("kpi")}>
          📈 KPI
        </button>

        {/* ✅ حذفت تبويبات POS 10 و POS 19 لمنع التكرار في الشريط العلوي */}
        {/*
        <button
          style={tabButtonStyle("pos10")}
          onClick={() => setActiveView("pos10")}
        >
          🏷️ POS 10 Reports
        </button>
        <button
          style={tabButtonStyle("pos19")}
          onClick={() => setActiveView("pos19")}
        >
          🏷️ POS 19 Reports
        </button>
        */}
      </div>

      {/* Import/Export */}
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
          onClick={handleExportAll}
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
          ⬇️ Export JSON (All Reports)
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
          ⬆️ Import JSON (Multi-Type)
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          style={{ display: "none" }}
        />
      </div>

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
            onOpenPOS10Report={() => setActiveView("pos10")}
            onOpenQCSShipmentReport={() => setActiveView("qcsShipment")}
            onOpenFTR1Report={() => setActiveView("ftr1")}
            onOpenFTR2Report={() => setActiveView("ftr2")}
            onOpenProductionReport={() => navigate("/admin/production")}
            language="en"
          />
        ) : activeView === "qcsShipment" ? (
          <HideDeleteScope>
            <QCSRawMaterialView language="en" />
          </HideDeleteScope>
        ) : activeView === "kpi" ? (
          <KPIDashboard />
        ) : activeView === "qcs" ? (
          <QCSDailyView language="en" />
        ) : activeView === "pos19" ? (
          <POS19DailyView language="en" />
        ) : activeView === "pos10" ? (
          <POS10ReportsView />
        ) : activeView === "ftr1" ? (
          <FTR1ReportView />
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
