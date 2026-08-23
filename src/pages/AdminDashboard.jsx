// src/pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

import DailyReportsTab    from "./admin/DailyReportsTab";
import FTR1ReportView     from "./monitor/branches/ftr1/FTR1ReportView";
import FTR2ReportView     from "./monitor/branches/ftr2/FTR2ReportView";

const TABS = [
  { key: "dailyReports", label: "Daily Reports", icon: "🗓️" },
];

// ── التبويب الافتراضي الذي يُفتح تلقائياً عند تحميل الصفحة ──
const DEFAULT_TAB = { key: "dailyReports", label: "Daily Reports", icon: "🗓️" };

export default function AdminDashboard() {
  const navigate     = useNavigate();

  const [activeView, setActiveView]     = useState(DEFAULT_TAB.key);
  const [openTab, setOpenTab]           = useState(DEFAULT_TAB); // ← يفتح تلقائياً
  const [dateStr, setDateStr]           = useState("");

  useEffect(() => {
    const fmt = () => setDateStr(new Date().toLocaleString("en-AE",{timeZone:"Asia/Dubai",weekday:"long",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}));
    fmt(); const t=setInterval(fmt,30_000); return ()=>clearInterval(t);
  }, []);

  /* Nothing on this page reads the API any more: it is a navigation shell.
     It used to pull two report types nothing in the app writes ("reports" /
     "dailyReports"), 14 more with full payloads for a counter, and a branch
     health panel that swept every type ever recorded. The branch tiles below
     open the report views, and those fetch what they need themselves. */

  function openTabView(tab) {
    setActiveView(tab.key);
    setOpenTab(tab);
  }

  const tabContent = (
    <>
      {activeView === "dailyReports" && (
        <DailyReportsTab
          dateStr={dateStr}
          onOpenQCSReport={()          => navigate("/admin/monitor/branches/qcs/reports")}
          onOpenPOS19Report={()        => navigate("/admin/pos19")}
          onOpenPOS10Report={()        => navigate("/admin/pos10")}
          onOpenFTR1Report={()         => openTabView({ key:"ftr1", label:"FTR1 Report", icon:"🏭" })}
          onOpenFTR2Report={()         => openTabView({ key:"ftr2", label:"FTR2 Report", icon:"🏭" })}
          onOpenProductionReport={()   => navigate("/admin/production")}
          language="en"
        />
      )}
      {activeView === "ftr1" && <FTR1ReportView/>}
      {activeView === "ftr2"         && <FTR2ReportView language="en"/>}
    </>
  );

  return (
    <div className="ad2-shell">
      <aside className="ad2-sidebar">
        <div className="ad2-brand">
          <div className="ad2-brand-mark">Q</div>
          <div>
            <strong>QMS Admin</strong>
            <span>Control Center</span>
          </div>
        </div>

        <div className="ad2-nav-label">Workspace</div>
        <nav className="ad2-nav" aria-label="Admin workspace">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ad2-nav-item ${activeView === tab.key ? "active" : ""}`}
              onClick={() => openTabView(tab)}
            >
              <span className="ad2-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="ad2-nav-arrow">›</span>
            </button>
          ))}
        </nav>

        <div className="ad2-sidebar-foot">
          <span className="ad2-status-dot" />
          <div><strong>System online</strong><span>Quality Management System</span></div>
        </div>
      </aside>

      <main className="ad2-main">
        <header className="ad2-topbar">
          <div className="ad2-page-copy">
            <span className="ad2-eyebrow">ADMINISTRATION</span>
            <h1>{openTab?.label || "Admin Dashboard"}</h1>
            <p>{dateStr} · Central QMS Control Panel</p>
          </div>
          <div className="ad2-top-actions">
            <button className="ad2-action ai" onClick={() => navigate("/ai-assistant")}>🤖 AI Assistant</button>
            <button className="ad2-action logout" onClick={() => navigate("/")}>Logout</button>
          </div>
        </header>

        <section className="ad2-workspace">
          <div className="ad2-workspace-head">
            <div>
              <span>ACTIVE WORKSPACE</span>
              <h2>{openTab?.icon} {openTab?.label || "Daily Reports"}</h2>
            </div>
            {(activeView === "ftr1" || activeView === "ftr2") && (
              <button onClick={() => openTabView(DEFAULT_TAB)}>← Back to Daily Reports</button>
            )}
          </div>
          <div className="ad2-workspace-body">{tabContent}</div>
        </section>

        <footer className="ad2-footer">Quality Management System · Admin Control Center</footer>
      </main>
    </div>
  );
}
