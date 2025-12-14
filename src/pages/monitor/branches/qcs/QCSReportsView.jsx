// src/pages/monitor/branches/qcs/QCSReportsView.jsx
import React, { useEffect, useMemo, useState } from "react";
import CoolersView from "./CoolersView";
import DailyCleanlinessView from "./DailyCleanlinessView";
import PersonalHygieneView from "./PersonalHygieneView";
import FreshChickenReportsView from "./FreshChickenReportsView";

// ما قبل التحميل
import FTR1PreloadingViewer from "./FTR1PreloadingViewer";
import FTR2PreloadingViewer from "./FTR2PreloadingViewer";

// تقارير المواد الخام
import RMInspectionReportIngredientsView from "./RMInspectionReportIngredientsView";
import RMInspectionReportPackagingView from "./RMInspectionReportPackagingView";

// عدم المطابقة
import NonConformanceReportsView from "./NonConformanceReportsView";

// Corrective Action
import CorrectiveActionReportsView from "./CorrectiveActionReportsView";

export default function QCSReportsView() {
  const [tab, setTab] = useState("coolers");
  const [q, setQ] = useState("");

  // ✅ responsive صحيح (يتحدث عند تغيير حجم الشاشة)
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 980 : false
  );
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 980);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // قيم افتراضية آمنة (كما هي)
  const ccHeader = {
    documentTitle: "QCS — Daily Cleanliness",
    documentNo: "FS-QM/REC/CLN",
    revisionNo: "01",
    area: "QCS Warehouse",
    issuedBy: "QA Manager",
    approvedBy: "Food Safety Team Leader",
    issueDate: "",
    controllingOfficer: "",
  };
  const selectedCleanDate = "";
  const cleanlinessRows = [];
  const ccFooter = { checkedBy: "", verifiedBy: "" };

  const TABS = useMemo(
    () => [
      { id: "coolers", label: "Coolers", icon: "🧊", hint: "Temperature / Cooler checks" },
      { id: "ph", label: "Personal Hygiene", icon: "🧼", hint: "Hygiene checklist reports" },
      { id: "clean", label: "Daily Cleanliness", icon: "🧹", hint: "Daily cleaning verifications" },
      { id: "fresh", label: "Fresh Chicken", icon: "🍗", hint: "Fresh chicken reports" },
      { id: "ftr1_preload", label: "FTR 1 • Preloading", icon: "🚚", hint: "Mushrif preloading inspections" },
      { id: "ftr2_preload", label: "FTR 2 • Preloading", icon: "🚚", hint: "Mamzar preloading inspections" },
      { id: "rm_ing", label: "RM — Ingredients", icon: "🧪", hint: "Raw Material Inspection (Ingredients)" },
      { id: "rm_pack", label: "RM — Packaging", icon: "📦", hint: "Raw Material Inspection (Packaging)" },
      { id: "nc_reports", label: "Non-Conformance", icon: "🚫", hint: "NCR list & follow-up" },
      { id: "car_reports", label: "Corrective Action", icon: "🛠️", hint: "Corrective action reports" },
    ],
    []
  );

  const filteredTabs = useMemo(() => {
    const needle = String(q || "").trim().toLowerCase();
    if (!needle) return TABS;
    return TABS.filter((t) => {
      const txt = `${t.label} ${t.hint} ${t.id}`.toLowerCase();
      return txt.includes(needle);
    });
  }, [q, TABS]);

  const activeTabMeta = useMemo(
    () => TABS.find((t) => t.id === tab) || TABS[0],
    [tab, TABS]
  );

  /* =================== Styles =================== */
  const COLORS = {
    ink: "#0b1f4d",
    sub: "#64748b",
    line: "rgba(30,41,59,0.22)",
    glass: "rgba(255,255,255,0.72)",
    glass2: "rgba(255,255,255,0.88)",
  };

  // ✅ Full width
  const shell = {
    minHeight: "100vh",
    padding: "0px",
    background:
      "radial-gradient(circle at 10% 10%, rgba(99,102,241,.16) 0, rgba(255,255,255,0) 48%)," +
      "radial-gradient(circle at 92% 12%, rgba(16,185,129,.14) 0, rgba(255,255,255,0) 45%)," +
      "radial-gradient(circle at 30% 100%, rgba(59,130,246,.14) 0, rgba(255,255,255,0) 55%)," +
      "linear-gradient(180deg, #f8fafc 0%, #eef2ff 55%, #f1f5f9 100%)",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    color: COLORS.ink,
  };

  // ✅ Full width container
  const layout = {
    width: "100%",
    maxWidth: "100%",
    margin: "0",
    padding: "12px",
    boxSizing: "border-box",
  };

  const topGlass = {
    position: "sticky",
    top: 0,
    zIndex: 9999,
    paddingBottom: 12,
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
  };

  const headerCard = {
    background: COLORS.glass,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 18,
    boxShadow: "0 18px 48px rgba(15,23,42,.10)",
    padding: "14px 14px",
  };

  const headerGrid = {
    display: "grid",
    gridTemplateColumns: isNarrow ? "1fr" : "1fr 360px",
    gap: 12,
    alignItems: "center",
  };

  const titleRow = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const titleLeft = { display: "flex", alignItems: "center", gap: 12, minWidth: 0 };

  const badge = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid rgba(99,102,241,.28)`,
    background: "rgba(99,102,241,.10)",
    color: "#3730a3",
    fontWeight: 950,
    fontSize: 12,
    whiteSpace: "nowrap",
  };

  const searchWrap = {
    background: COLORS.glass2,
    border: `1px solid ${COLORS.line}`,
    borderRadius: 16,
    padding: 10,
    boxShadow: "0 10px 28px rgba(15,23,42,.08)",
  };

  const searchInput = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 14,
    border: `1px solid rgba(30,41,59,0.22)`,
    padding: "10px 12px",
    fontSize: 13,
    fontWeight: 800,
    outline: "none",
    background: "rgba(255,255,255,.96)",
    color: COLORS.ink,
  };

  // ✅ tabs horizontal scroll
  const tabsWrap = {
    marginTop: 12,
    display: "flex",
    gap: 8,
    justifyContent: "flex-start",
    overflowX: "auto",
    padding: "6px 4px",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
  };

  const tabBtn = (active) => ({
    flex: "0 0 auto",
    border: active ? "1px solid rgba(99,102,241,.45)" : `1px solid ${COLORS.line}`,
    background: active
      ? "linear-gradient(180deg, rgba(99,102,241,.18), rgba(99,102,241,.08))"
      : "rgba(255,255,255,.70)",
    boxShadow: active ? "0 10px 24px rgba(99,102,241,.18)" : "0 8px 18px rgba(15,23,42,.06)",
    color: active ? "#1e1b4b" : COLORS.ink,
    borderRadius: 999,
    padding: "10px 12px",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
    transition: "transform 0.08s ease",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  const pillIcon = (active) => ({
    width: 30,
    height: 30,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: active ? "rgba(99,102,241,.16)" : "rgba(15,23,42,.06)",
    border: active ? "1px solid rgba(99,102,241,.25)" : "1px solid rgba(15,23,42,.10)",
    fontSize: 14,
  });

  const mainPanel = {
    marginTop: 14,
    background: "rgba(255,255,255,.88)",
    border: `1px solid ${COLORS.line}`,
    borderRadius: 18,
    boxShadow: "0 18px 48px rgba(15,23,42,.10)",
    overflow: "visible",
    padding: 14,
    minWidth: 0,
  };

  const hintLine = {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 800,
    color: COLORS.sub,
  };

  return (
    <div style={shell}>
      <div style={layout}>
        {/* ===== Sticky Header ===== */}
        <div style={topGlass}>
          <div style={headerCard}>
            <div style={headerGrid}>
              <div style={{ minWidth: 0 }}>
                <div style={titleRow}>
                  <div style={titleLeft}>
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 16,
                        background: "linear-gradient(135deg, rgba(99,102,241,.22), rgba(16,185,129,.18))",
                        border: `1px solid ${COLORS.line}`,
                        boxShadow: "0 10px 26px rgba(15,23,42,.10)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 20,
                        fontWeight: 900,
                      }}
                      title="QCS"
                    >
                      📊
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 18, fontWeight: 1000, lineHeight: 1.1 }}>
                        QCS — Reports (View)
                      </div>
                      <div style={hintLine}>
                        Active:{" "}
                        <b style={{ color: COLORS.ink }}>
                          {activeTabMeta.icon} {activeTabMeta.label}
                        </b>
                      </div>
                    </div>
                  </div>

                  <div style={badge} title="Available sections">
                    Sections: {TABS.length}
                  </div>
                </div>
              </div>

              <div style={searchWrap}>
                <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 8, color: COLORS.ink }}>
                  Search Tabs
                </div>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={searchInput}
                  placeholder="Type: RM, preload, non, hygiene..."
                />
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: COLORS.sub }}>
                  Showing: <b style={{ color: COLORS.ink }}>{filteredTabs.length}</b>
                </div>
              </div>
            </div>

            {/* Pills (horizontal scroll) */}
            <div style={tabsWrap}>
              {filteredTabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    style={tabBtn(active)}
                    onClick={() => setTab(t.id)}
                    title={t.hint}
                    onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                    onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                    type="button"
                  >
                    <span style={pillIcon(active)}>{t.icon}</span>
                    <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== Main Panel ===== */}
        <section style={mainPanel}>
          {/* Top mini header inside content */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              paddingBottom: 12,
              borderBottom: `1px solid ${COLORS.line}`,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, rgba(59,130,246,.16), rgba(16,185,129,.12))",
                  border: `1px solid ${COLORS.line}`,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 18,
                }}
              >
                {activeTabMeta.icon}
              </div>
              <div>
                <div style={{ fontWeight: 1000, fontSize: 16, color: COLORS.ink }}>
                  {activeTabMeta.label}
                </div>
                <div style={{ fontSize: 12, fontWeight: 800, color: COLORS.sub }}>
                  {activeTabMeta.hint}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 950,
                color: "#0b1f4d",
                padding: "8px 10px",
                borderRadius: 999,
                border: `1px solid ${COLORS.line}`,
                background: "rgba(255,255,255,.75)",
              }}
            >
              QCS • Viewer Mode
            </div>
          </div>

          {/* Actual viewers */}
          {tab === "coolers" && <CoolersView />}
          {tab === "ph" && <PersonalHygieneView />}
          {tab === "clean" && (
            <DailyCleanlinessView
              ccHeader={ccHeader}
              selectedCleanDate={selectedCleanDate}
              cleanlinessRows={cleanlinessRows}
              ccFooter={ccFooter}
            />
          )}
          {tab === "fresh" && (
            <div style={{ position: "relative", maxWidth: "100%", overflow: "visible" }}>
              <FreshChickenReportsView />
            </div>
          )}
          {tab === "ftr1_preload" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <FTR1PreloadingViewer />
            </div>
          )}
          {tab === "ftr2_preload" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <FTR2PreloadingViewer />
            </div>
          )}
          {tab === "rm_ing" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <RMInspectionReportIngredientsView />
            </div>
          )}
          {tab === "rm_pack" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <RMInspectionReportPackagingView />
            </div>
          )}
          {tab === "nc_reports" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <NonConformanceReportsView />
            </div>
          )}
          {tab === "car_reports" && (
            <div style={{ position: "relative", overflow: "auto" }}>
              <CorrectiveActionReportsView />
            </div>
          )}
        </section>

        {/* Footer */}
        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            color: "#64748b",
            fontSize: 12,
            fontWeight: 800,
            opacity: 0.95,
          }}
        >
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </div>
  );
}
