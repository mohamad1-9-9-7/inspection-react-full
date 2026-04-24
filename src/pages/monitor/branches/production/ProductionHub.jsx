// src/pages/monitor/branches/production/ProductionHub.jsx
// Redesigned — Professional sidebar layout for Production inputs
// Bilingual (EN/AR) support

import React, { useState, Suspense, lazy } from "react";
import { useLang } from "./_shared/i18n";

/* ===== Lazy Inputs ===== */
const PersonalHygienePRDInput    = lazy(() => import("./PersonalHygienePRDInput"));
const CleaningChecklistPRDInput  = lazy(() => import("./CleaningChecklistPRDInput"));
const PRDDefrostingRecordInput   = lazy(() => import("./PRDDefrostingRecordInput"));
const PRDTraceabilityLogInput    = lazy(() => import("./PRDTraceabilityLogInput"));
const OnlineCuttingRecordInput   = lazy(() => import("./OnlineCuttingRecordInput"));
const DriedMeatProcessInput      = lazy(() => import("./DriedMeatProcessInput"));

/* ===== Icons (modern stroke icons) ===== */
const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconHygiene    = (p) => <Icon {...p}><circle cx="12" cy="7" r="4" /><path d="M5 22v-2a7 7 0 0 1 14 0v2" /><path d="M12 11v2" /></Icon>;
const IconCleaning   = (p) => <Icon {...p}><path d="M3 21h18" /><rect x="7" y="13" width="10" height="8" rx="1" /><path d="M12 13V3" /><path d="M9 6h6" /></Icon>;
const IconDefrost    = (p) => <Icon {...p}><path d="M12 2v20" /><path d="M4.2 4.2l15.6 15.6" /><path d="M19.8 4.2L4.2 19.8" /><circle cx="12" cy="12" r="2" /></Icon>;
const IconTrace      = (p) => <Icon {...p}><path d="M7 3h10l4 4v10l-4 4H7l-4-4V7z" /><path d="M12 8v8" /><path d="M8 12h8" /></Icon>;
const IconFactory    = (p) => <Icon {...p}><path d="M2 21V9l7 4V9l7 4V5l5 3v13z" /><path d="M7 17h2" /><path d="M12 17h2" /><path d="M17 17h2" /></Icon>;
const IconScissors   = (p) => <Icon {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88" /><path d="M14.47 14.48L20 20" /><path d="M8.12 8.12L12 12" /></Icon>;
const IconDried      = (p) => <Icon {...p}><path d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3a6 6 0 0 1-2 4.47V17a5 5 0 0 1-10 0v-4.53A6 6 0 0 1 4 8z" /><path d="M9 17v2" /><path d="M15 17v2" /></Icon>;

const TABS = [
  {
    key: "personal",
    titleKey: "tab_hygiene",
    subtitleKey: "tab_hygiene_sub",
    Icon: IconHygiene,
    accent: "#0ea5e9",
    Comp: PersonalHygienePRDInput,
  },
  {
    key: "cleaning",
    titleKey: "tab_cleaning",
    subtitleKey: "tab_cleaning_sub",
    Icon: IconCleaning,
    accent: "#22c55e",
    Comp: CleaningChecklistPRDInput,
  },
  {
    key: "defrost",
    titleKey: "tab_defrost",
    subtitleKey: "tab_defrost_sub",
    Icon: IconDefrost,
    accent: "#3b82f6",
    Comp: PRDDefrostingRecordInput,
  },
  {
    key: "traceability",
    titleKey: "tab_trace",
    subtitleKey: "tab_trace_sub",
    Icon: IconTrace,
    accent: "#a855f7",
    Comp: PRDTraceabilityLogInput,
  },
  {
    key: "cutting",
    titleKey: "tab_cutting",
    subtitleKey: "tab_cutting_sub",
    Icon: IconScissors,
    accent: "#e11d48",
    Comp: OnlineCuttingRecordInput,
  },
  {
    key: "dried",
    titleKey: "tab_dried",
    subtitleKey: "tab_dried_sub",
    Icon: IconDried,
    accent: "#b45309",
    Comp: DriedMeatProcessInput,
  },
];

export default function ProductionHub() {
  const { t, lang, toggle, dir, isAr } = useLang();

  const [active, setActive] = useState(TABS[0].key);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeTab = TABS.find((tb) => tb.key === active) || TABS[0];
  const ActiveComp = activeTab.Comp;

  const today = new Date().toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  const activeTitle    = t(activeTab.titleKey);
  const activeSubtitle = t(activeTab.subtitleKey);
  const sepChar = isAr ? "‹" : "›";

  return (
    <div className="prd-hub" dir={dir}>
      <style>{STYLES}</style>

      {/* ── Sidebar ── */}
      <aside className={`prd-sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        {/* Brand */}
        <div className="prd-brand">
          <div className="prd-brand-icon">
            <IconFactory size={22} />
          </div>
          {!sidebarCollapsed && (
            <div className="prd-brand-text">
              <div className="prd-brand-title">{t("hub_title")}</div>
              <div className="prd-brand-sub">{t("hub_subtitle")}</div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          className="prd-collapse-btn"
          onClick={() => setSidebarCollapsed((v) => !v)}
          title={sidebarCollapsed ? "Expand" : "Collapse"}
        >
          {sidebarCollapsed ? (isAr ? "‹" : "›") : (isAr ? "›" : "‹")}
        </button>

        {/* Nav sections */}
        {!sidebarCollapsed && (
          <div className="prd-nav-heading">{t("nav_forms")}</div>
        )}
        <nav className="prd-nav">
          {TABS.map((tab) => {
            const isActive = tab.key === active;
            const tabTitle = t(tab.titleKey);
            const tabSub   = t(tab.subtitleKey);
            return (
              <button
                key={tab.key}
                className={`prd-nav-item ${isActive ? "active" : ""}`}
                onClick={() => setActive(tab.key)}
                title={sidebarCollapsed ? tabTitle : ""}
                style={isActive ? { "--accent": tab.accent } : undefined}
              >
                <span className="prd-nav-icon" style={{ color: tab.accent }}>
                  <tab.Icon size={20} />
                </span>
                {!sidebarCollapsed && (
                  <span className="prd-nav-text">
                    <span className="prd-nav-title">{tabTitle}</span>
                    <span className="prd-nav-sub">{tabSub}</span>
                  </span>
                )}
                {isActive && <span className="prd-nav-indicator" />}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="prd-sidebar-footer">
            <div className="prd-footer-pill">
              <span className="prd-pulse" />
              {t("sidebar_footer")}
            </div>
            <div className="prd-footer-sub">{t("sidebar_footer_sub")}</div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="prd-main">
        {/* Top bar */}
        <header className="prd-topbar">
          <div className="prd-topbar-left">
            <div
              className="prd-topbar-icon"
              style={{ background: `${activeTab.accent}15`, color: activeTab.accent }}
            >
              <activeTab.Icon size={22} />
            </div>
            <div>
              <div className="prd-topbar-title">{activeTitle}</div>
              <div className="prd-topbar-sub">{activeSubtitle}</div>
            </div>
          </div>
          <div className="prd-topbar-right">
            <button
              className="prd-lang-btn"
              onClick={toggle}
              title={isAr ? "Switch to English" : "التبديل إلى العربية"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
              </svg>
              <span>{t("lang_toggle")}</span>
            </button>
            <div className="prd-date-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              {today}
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div className="prd-breadcrumb">
          <span>{t("breadcrumb_prod")}</span>
          <span className="prd-sep">{sepChar}</span>
          <span>{t("breadcrumb_inputs")}</span>
          <span className="prd-sep">{sepChar}</span>
          <span className="prd-current" style={{ color: activeTab.accent }}>{activeTitle}</span>
        </div>

        {/* Content panel */}
        <section className="prd-panel">
          <Suspense fallback={
            <div className="prd-loading">
              <div className="prd-spinner" />
              <span>{t("status_loading")}</span>
            </div>
          }>
            <ActiveComp key={lang} />
          </Suspense>
        </section>
      </main>
    </div>
  );
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

  .prd-hub {
    --teal:     #0f766e;
    --teal-2:   #14b8a6;
    --ink:      #0f172a;
    --ink-mid:  #1e293b;
    --muted:    #64748b;
    --border:   #e2e8f0;
    --canvas:   #f8fafc;
    --surface:  #ffffff;

    display: flex;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--canvas);
    color: var(--ink);
    direction: ltr;
  }

  /* ── Sidebar ── */
  .prd-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 18px 12px;
    gap: 4px;
    position: relative;
    transition: width .2s ease;
  }
  .prd-sidebar.collapsed { width: 76px; padding: 18px 8px; }

  .prd-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 8px 18px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    margin-bottom: 10px;
  }
  .prd-brand-icon {
    width: 42px; height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--teal) 0%, var(--teal-2) 100%);
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    box-shadow: 0 8px 20px rgba(20,184,166,.3);
    flex-shrink: 0;
  }
  .prd-brand-text { overflow: hidden; }
  .prd-brand-title {
    font-size: 15px; font-weight: 800;
    letter-spacing: -.01em;
    white-space: nowrap;
  }
  .prd-brand-sub {
    font-size: 11px; color: #94a3b8;
    margin-top: 2px; white-space: nowrap;
    text-transform: uppercase; letter-spacing: .08em;
    font-weight: 600;
  }

  .prd-collapse-btn {
    position: absolute;
    top: 22px; right: -12px;
    width: 24px; height: 24px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: #fff;
    color: var(--muted);
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,.08);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
    z-index: 10;
  }
  .prd-collapse-btn:hover { color: var(--teal); border-color: var(--teal-2); }

  .prd-nav-heading {
    font-size: 10px; font-weight: 800;
    color: #64748b;
    letter-spacing: .12em;
    text-transform: uppercase;
    padding: 8px 12px 4px;
  }

  .prd-nav {
    display: flex; flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  .prd-nav-item {
    position: relative;
    display: flex; align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #cbd5e1;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: all .15s ease;
    overflow: hidden;
  }
  .prd-nav-item:hover {
    background: rgba(255,255,255,.05);
    color: #fff;
  }
  .prd-nav-item.active {
    background: rgba(255,255,255,.08);
    color: #fff;
  }
  .prd-nav-item.active .prd-nav-icon {
    background: rgba(255,255,255,.08);
  }
  .prd-nav-item.active::before {
    content: '';
    position: absolute; left: 0; top: 18%; bottom: 18%;
    width: 3px;
    background: var(--accent, var(--teal-2));
    border-radius: 0 3px 3px 0;
  }

  .prd-nav-icon {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: rgba(255,255,255,.04);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s;
  }

  .prd-nav-text {
    display: flex; flex-direction: column;
    min-width: 0; flex: 1;
  }
  .prd-nav-title {
    font-size: 13px; font-weight: 700;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .prd-nav-sub {
    font-size: 11px; font-weight: 500;
    color: #94a3b8;
    margin-top: 1px;
    white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }

  .prd-sidebar-footer {
    padding: 12px 8px 4px;
    border-top: 1px solid rgba(255,255,255,.08);
    margin-top: 10px;
  }
  .prd-footer-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(20,184,166,.15);
    color: #5eead4;
    font-size: 11px; font-weight: 800;
    letter-spacing: .05em;
  }
  .prd-pulse {
    width: 6px; height: 6px;
    background: #22c55e;
    border-radius: 50%;
    box-shadow: 0 0 0 0 rgba(34,197,94,.7);
    animation: prd-pulse 2s infinite;
  }
  @keyframes prd-pulse {
    70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
    100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  }
  .prd-footer-sub {
    font-size: 10px;
    color: #94a3b8;
    margin-top: 6px;
    padding: 0 2px;
  }

  /* ── Main ── */
  .prd-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow-x: hidden;
  }

  .prd-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .prd-topbar-left { display: flex; align-items: center; gap: 14px; }
  .prd-topbar-icon {
    width: 46px; height: 46px;
    border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .prd-topbar-title {
    font-size: 18px; font-weight: 800;
    letter-spacing: -.01em;
  }
  .prd-topbar-sub {
    font-size: 12px; color: var(--muted);
    margin-top: 2px;
    font-weight: 500;
  }

  .prd-date-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: var(--canvas);
    border: 1px solid var(--border);
    font-size: 12px; font-weight: 700;
    color: var(--muted);
    letter-spacing: .01em;
  }

  .prd-topbar-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .prd-lang-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--teal) 0%, var(--teal-2) 100%);
    color: #fff;
    border: none;
    font-family: inherit;
    font-size: 12px; font-weight: 800;
    letter-spacing: .02em;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(20,184,166,.25);
    transition: transform .12s ease, box-shadow .2s ease;
  }
  .prd-lang-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 5px 14px rgba(20,184,166,.35);
  }

  /* RTL tweaks */
  .prd-hub[dir="rtl"] .prd-collapse-btn {
    right: auto; left: -12px;
  }
  .prd-hub[dir="rtl"] .prd-nav-item { text-align: right; }
  .prd-hub[dir="rtl"] .prd-nav-item.active::before {
    left: auto; right: 0;
    border-radius: 3px 0 0 3px;
  }

  .prd-breadcrumb {
    padding: 14px 24px 0;
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600;
    color: var(--muted);
  }
  .prd-sep { color: #cbd5e1; }
  .prd-current { font-weight: 800; }

  /* ── Panel ── */
  .prd-panel {
    margin: 14px 24px 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    min-height: 60vh;
    overflow: hidden;
  }

  .prd-loading {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 14px;
    padding: 80px 20px;
    color: var(--muted);
    font-weight: 700;
  }
  .prd-spinner {
    width: 36px; height: 36px;
    border: 3px solid var(--border);
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: prd-spin .8s linear infinite;
  }
  @keyframes prd-spin { to { transform: rotate(360deg); } }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .prd-hub { flex-direction: column; }
    .prd-sidebar { width: 100% !important; padding: 14px; }
    .prd-sidebar.collapsed { width: 100% !important; }
    .prd-collapse-btn { display: none; }
    .prd-brand { padding-bottom: 12px; margin-bottom: 8px; }
    .prd-nav { flex-direction: row; overflow-x: auto; gap: 8px; }
    .prd-nav-item { flex-shrink: 0; padding: 8px 12px; }
    .prd-nav-text { display: none; }
    .prd-nav-heading { display: none; }
    .prd-sidebar-footer { display: none; }
    .prd-topbar { padding: 12px 16px; flex-wrap: wrap; gap: 10px; }
    .prd-panel { margin: 10px 12px 14px; border-radius: 12px; }
    .prd-breadcrumb { padding: 10px 16px 0; }
  }
`;
