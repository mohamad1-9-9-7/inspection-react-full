// src/pages/AdminDashboard.jsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import ReportsTab from "./admin/ReportsTab";
import DailyReportsTab from "./admin/DailyReportsTab";
// ❌ أزلنا: import QCSDailyView from "./admin/QCSDailyView";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard from "./KPIDashboard";

// ✅ FTR1/FTR2
import FTR1ReportView from "./monitor/branches/ftr1/FTR1ReportView";
import FTR2ReportView from "./monitor/branches/ftr2/FTR2ReportView";

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
  FTR1: [
    "ftr1_temperature",
    "ftr1_daily_cleanliness",
    "ftr1_oil_calibration",
    "ftr1_personal_hygiene",
  ],
  FTR2: [
    "ftr2_temperature",
    "ftr2_daily_cleanliness",
    "ftr2_oil_calibration",
    "ftr2_personal_hygiene",
  ],
  PRODUCTION: [
    "prod_cleaning_checklist",
    "prod_personal_hygiene",
    "prod_defrosting_record",
  ],
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

/* تنسيق الوقت للعرض في الهيدر */
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [activeView, setActiveView] = useState("dailyReports"); // الافتراضي
  const [loading, setLoading] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [stats, setStats] = useState({
    daily: 0,
    master: 0,
    total: 0,
  });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  async function reloadFromServer() {
    setLoading(true);
    setOpMsg("");
    try {
      // 1) تحميل reports + dailyReports كما كان
      const [r, d, allTypes] = await Promise.all([
        fetchByType("reports"),
        fetchByType("dailyReports"),
        fetchAllTypes(),
      ]);

      setReports(r);
      setDailyReports(d);
      setLastSync(new Date().toISOString());

      // 2) حساب الإحصائيات من كل الأنواع
      const { counts, groups } = allTypes || { counts: {}, groups: {} };

      // مجموع كل الأنواع داخل المجموعات (QCS, FTR1, FTR2, PRODUCTION)
      let dailyFromGroups = 0;
      Object.values(groups).forEach((typeList) => {
        typeList.forEach((t) => {
          dailyFromGroups += counts[t] || 0;
        });
      });

      const masterReports = Array.isArray(r) ? r.length : 0; // تقارير تجميعية
      const metaDaily = Array.isArray(d) ? d.length : 0; // dailyReports meta
      const dailyTotal = dailyFromGroups + metaDaily;
      const totalAll = dailyTotal + masterReports;

      setStats({
        daily: dailyTotal,
        master: masterReports,
        total: totalAll,
      });
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
    card: "rgba(255,255,255,0.95)",
    glass: "rgba(255,255,255,0.80)",
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
      padding: "10px 18px",
      borderRadius: "999px",
      border: "1px solid " + THEME.border,
      cursor: "pointer",
      background: isActive
        ? "linear-gradient(90deg, #6d28d9 0%, #8e44ad 70%)"
        : "rgba(255,255,255,0.65)",
      color: isActive ? "#fff" : "#0f172a",
      fontWeight: 800,
      fontSize: "0.95rem",
      boxShadow: isActive
        ? "0 10px 22px rgba(109,40,217,.30)"
        : "0 4px 10px rgba(17,24,39,.10)",
      transform: isActive ? "translateY(-1px)" : "none",
      transition: "all .18s ease",
      backdropFilter: "blur(10px)",
      outline: "none",
      display: "flex",
      alignItems: "center",
      gap: 6,
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
      downloadJson(
        out,
        `qms_all_reports_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
      );
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

    const confirmed = window.confirm(
      `Are you sure you want to import:\n\n"${file.name}"?\n\n` +
        "This may overwrite existing records with the same keys/types."
    );
    if (!confirmed) {
      if (e?.target) e.target.value = "";
      return;
    }

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
      {/* ✅ جعل المحتوى بعرض كامل الشاشة */}
      <div style={{ width: "100%" }}>
        {/* Header */}
        <div
          style={{
            background: THEME.card,
            border: "1.5px solid " + THEME.border,
            borderRadius: 22,
            padding: "14px 18px",
            marginBottom: 16,
            boxShadow: THEME.shadow,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backdropFilter: "blur(10px)",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 900,
                fontSize: "1.6rem",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>📊 Admin Dashboard</span>
            </div>
            <div
              style={{
                marginTop: 3,
                fontSize: "0.85rem",
                color: "#6b7280",
                fontWeight: 500,
              }}
            >
              Central control for all QMS & daily inspection reports.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                textAlign: "right",
                fontSize: "0.78rem",
                color: "#4b5563",
                lineHeight: 1.3,
              }}
            >
              <div>
                <strong>Last sync:</strong> {formatDateTime(lastSync)}
              </div>
              {loading && (
                <div style={{ color: THEME.purple, fontWeight: 700 }}>
                  ⏳ Loading…
                </div>
              )}
              {opMsg && (
                <div
                  style={{
                    marginTop: 2,
                    fontWeight: 700,
                    color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
                  }}
                >
                  {opMsg}
                </div>
              )}
            </div>

            <button
              onClick={reloadFromServer}
              style={{
                background: "linear-gradient(180deg,#3b82f6,#2563eb)",
                color: "#fff",
                border: "none",
                padding: "9px 13px",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "0.86rem",
                boxShadow: "0 10px 24px rgba(59,130,246,.28)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: "linear-gradient(180deg,#ef4444, #dc2626)",
                color: "#fff",
                border: "none",
                padding: "9px 15px",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "0.86rem",
                boxShadow: "0 10px 24px rgba(220,38,38,.28)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              flex: "1 1 160px",
              minWidth: 160,
              background: THEME.glass,
              borderRadius: 16,
              border: "1px solid " + THEME.border,
              padding: "10px 12px",
              boxShadow: "0 10px 24px rgba(15,23,42,.20)",
            }}
          >
            <div
              style={{
                fontSize: "0.80rem",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "#6b7280",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Daily Reports
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 900,
                color: "#111827",
                marginBottom: 2,
              }}
            >
              {stats.daily}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              POS / QCS / FTR / Production daily checklists
            </div>
          </div>

          <div
            style={{
              flex: "1 1 160px",
              minWidth: 160,
              background: THEME.glass,
              borderRadius: 16,
              border: "1px solid " + THEME.border,
              padding: "10px 12px",
              boxShadow: "0 10px 24px rgba(15,23,42,.15)",
            }}
          >
            <div
              style={{
                fontSize: "0.80rem",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                color: "#6b7280",
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Master Reports
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 900,
                color: "#111827",
                marginBottom: 2,
              }}
            >
              {stats.master}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>
              Consolidated / summary types
            </div>
          </div>

          <div
            style={{
              flex: "1 1 160px",
              minWidth: 160,
              background:
                "linear-gradient(135deg, rgba(16,185,129,.96), rgba(5,150,105,.96))",
              borderRadius: 16,
              border: "1px solid rgba(16,185,129,.6)",
              padding: "10px 12px",
              boxShadow: "0 10px 30px rgba(5,150,105,.45)",
              color: "#ecfdf5",
            }}
          >
            <div
              style={{
                fontSize: "0.80rem",
                textTransform: "uppercase",
                letterSpacing: ".06em",
                opacity: 0.9,
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Total Records
            </div>
            <div
              style={{
                fontSize: "1.4rem",
                fontWeight: 900,
                marginBottom: 2,
              }}
            >
              {stats.total}
            </div>
            <div style={{ fontSize: "0.78rem", opacity: 0.9 }}>
              All records currently loaded
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
            flexDirection: "row-reverse",
          }}
        >
          <button
            style={tabButtonStyle("dailyReports")}
            onClick={() => setActiveView("dailyReports")}
          >
            <span>🗓️</span>
            <span>Daily Reports</span>
          </button>
          <button
            style={tabButtonStyle("reports")}
            onClick={() => setActiveView("reports")}
          >
            <span>📑</span>
            <span>Reports</span>
          </button>
          <button
            style={tabButtonStyle("qcsShipment")}
            onClick={() => setActiveView("qcsShipment")}
          >
            <span>📦</span>
            <span>QCS Shipments</span>
          </button>
          <button
            style={tabButtonStyle("kpi")}
            onClick={() => setActiveView("kpi")}
          >
            <span>📈</span>
            <span>KPI</span>
          </button>
        </div>

        {/* Import/Export Tools */}
        <div
          style={{
            background: THEME.glass,
            border: "1.5px solid " + THEME.border,
            borderRadius: 18,
            padding: "10px 12px",
            marginBottom: 14,
            backdropFilter: "blur(10px)",
            boxShadow: THEME.shadow,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleExportAll}
              style={{
                background: "linear-gradient(180deg,#6d28d9,#8e44ad)",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "0.86rem",
                boxShadow: "0 10px 20px rgba(141,73,170,.28)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⬇️</span>
              <span>Export JSON (All)</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: "linear-gradient(180deg,#10b981,#059669)",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "0.86rem",
                boxShadow: "0 10px 20px rgba(16,185,129,.28)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⬆️</span>
              <span>Import JSON</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </div>

          <div
            style={{
              fontSize: "0.8rem",
              color: "#4b5563",
              maxWidth: 360,
              lineHeight: 1.4,
            }}
          >
            Use <strong>Export</strong> for full backups and{" "}
            <strong>Import</strong> to restore or migrate data between servers.
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            background: THEME.card,
            border: "1.5px solid " + THEME.border,
            borderRadius: 20,
            padding: "16px 14px",
            minHeight: "66vh",
            boxShadow: THEME.shadow,
            backdropFilter: "blur(8px)",
          }}
        >
          {activeView === "reports" ? (
            <ReportsTab reports={reports} setReports={setReports} language="en" />
          ) : activeView === "dailyReports" ? (
            <DailyReportsTab
              dailyReports={dailyReports}
              setDailyReports={setDailyReports}
              // QCS viewer
              onOpenQCSReport={() =>
                navigate("/admin/monitor/branches/qcs/reports")
              }
              // POS 19 viewer
              onOpenPOS19Report={() => navigate("/admin/pos19")}
              // POS 10 viewer
              onOpenPOS10Report={() => navigate("/admin/pos10")}
              // باقي التبويبات
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
            color: "rgba(255,255,255,.94)",
            fontSize: ".92rem",
            fontWeight: 800,
            textShadow: "0 1px 3px rgba(0,0,0,.25)",
          }}
        >
          All rights reserved © Quality Management System
        </div>
      </div>
    </div>
  );
}
