// src/pages/monitor/branches/_shared/BranchDailyView.jsx
// Unified Daily View Hub — shared design adopted from POS19DailyView.
// كل الأفرع بتستخدم هالـ component حتى يكون التصميم موحّد.
import React, { Suspense, useMemo, useState } from "react";

/* ─── Global Styles (scoped by root class + CSS variables) ─── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Tajawal:wght@400;500;700;800&display=swap');

  .bdv-root {
    --ink:     #0d1117;
    --ink-mid: #1c2330;
    --ink-low: #263040;
    --rail:    #1e2d40;
    --amber:   #f59e0b;
    --amber-l: #fcd34d;
    --teal:    #14b8a6;
    --ok:      #22c55e;
    --muted:   #64748b;
    --border:  rgba(255,255,255,0.07);
    --glass:   rgba(255,255,255,0.04);
    --canvas:  #f0f2f5;

    font-family: 'Tajawal', sans-serif;
    direction: rtl;
    display: flex;
    flex-direction: row-reverse;
    height: 100vh;
    min-height: 600px;
    background: var(--canvas);
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .bdv-sidebar {
    width: 280px;
    min-width: 280px;
    background: var(--ink);
    display: flex;
    flex-direction: column;
    border-right: 3px solid var(--accent, var(--amber));
    overflow: hidden;
  }

  .bdv-sidebar-header {
    padding: 24px 20px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .bdv-branch-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--accent, var(--amber));
    color: var(--ink);
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: .12em;
    padding: 4px 10px;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .bdv-sidebar-title {
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    margin: 0 0 2px;
    line-height: 1.3;
  }

  .bdv-sidebar-sub {
    color: var(--muted);
    font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .bdv-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--ink-low) transparent;
  }

  .bdv-nav-group {
    padding: 0 12px;
    margin-bottom: 4px;
  }

  .bdv-nav-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-family: 'Tajawal', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    text-align: right;
    transition: all .18s ease;
    position: relative;
    overflow: hidden;
  }

  .bdv-nav-btn:hover {
    background: var(--glass);
    color: #e2e8f0;
  }

  .bdv-nav-btn.active {
    background: linear-gradient(90deg, var(--accent-soft, rgba(245,158,11,.18)) 0%, var(--accent-soft-2, rgba(245,158,11,.06)) 100%);
    color: var(--accent-l, var(--amber-l));
    font-weight: 700;
  }

  .bdv-nav-btn.active::before {
    content: '';
    position: absolute;
    right: 0; top: 20%; bottom: 20%;
    width: 3px;
    background: var(--accent, var(--amber));
    border-radius: 3px 0 0 3px;
  }

  .bdv-nav-icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 22px;
    text-align: center;
  }

  .bdv-nav-label {
    flex: 1;
    line-height: 1.3;
  }

  .bdv-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .bdv-status-dot.live  { background: var(--ok);    box-shadow: 0 0 6px var(--ok); }
  .bdv-status-dot.soon  { background: var(--muted); }

  .bdv-sidebar-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .bdv-connected-count {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .bdv-count-pill {
    background: var(--ok);
    color: #fff;
    font-weight: 700;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 20px;
  }

  /* ── Main area ── */
  .bdv-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--canvas);
  }

  .bdv-topbar {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .bdv-topbar-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bdv-topbar-date {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    background: #f1f5f9;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
  }

  .bdv-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
  }

  /* ── Panel shell ── */
  .bdv-panel {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    padding: 24px;
    min-height: 300px;
  }

  .bdv-panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
  }

  .bdv-panel-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .bdv-panel-name {
    font-size: 18px;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 2px;
  }

  .bdv-panel-meta {
    font-size: 12px;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
  }

  .bdv-connected-badge {
    margin-right: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #15803d;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .bdv-coming-badge {
    margin-right: auto;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #fafafa;
    border: 1px solid #e2e8f0;
    color: var(--muted);
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 20px;
    font-family: 'IBM Plex Mono', monospace;
  }

  /* ── Loader ── */
  .bdv-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 60px 0;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }

  @keyframes bdv-spin { to { transform: rotate(360deg); } }

  .bdv-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: var(--accent, var(--amber));
    border-radius: 50%;
    animation: bdv-spin .7s linear infinite;
  }

  /* ── Placeholder ── */
  .bdv-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 60px 0;
    color: var(--muted);
    text-align: center;
  }
  .bdv-placeholder-icon { font-size: 48px; opacity: .35; }
  .bdv-placeholder-text { font-size: 15px; font-weight: 600; color: #94a3b8; }
  .bdv-placeholder-sub { font-size: 12px; font-family: 'IBM Plex Mono', monospace; color: #cbd5e1; }

  /* scrollbar */
  .bdv-nav::-webkit-scrollbar { width: 4px; }
  .bdv-nav::-webkit-scrollbar-thumb { background: var(--ink-low); border-radius: 4px; }
`;

const Loader = ({ label }) => (
  <div className="bdv-loader">
    <div className="bdv-spinner" />
    جاري تحميل {label}…
  </div>
);

const PanelShell = ({ tab, children }) => (
  <div className="bdv-panel">
    <div className="bdv-panel-header">
      <div className="bdv-panel-icon">{tab.icon}</div>
      <div>
        <div className="bdv-panel-name">{tab.label}</div>
        <div className="bdv-panel-meta">
          {tab.branchCode} · {new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" })}
        </div>
      </div>
      {tab.live === false ? (
        <div className="bdv-coming-badge">⏳ SOON</div>
      ) : (
        <div className="bdv-connected-badge">
          <span style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
          LIVE
        </div>
      )}
    </div>
    {children}
  </div>
);

/**
 * Shared Branch Daily View.
 *
 * Props:
 *  - branchCode: string  e.g. "POS-10"
 *  - title:      string  sidebar header title (Arabic). Defaults to "عرض تقارير الفرع".
 *  - subtitle:   string  small mono subtitle. Defaults to "Daily Viewer Hub".
 *  - accent:     { color, light, soft, soft2 } — optional color theme (defaults to amber).
 *  - tabs: Array<{
 *        key: string,
 *        icon: string,
 *        label: string,
 *        live?: boolean (default true),
 *        element: ReactElement,        // wrapped in <Suspense>
 *        loaderLabel?: string,         // shown while Suspense pending
 *     }>
 *  - defaultTabKey?: string (defaults to tabs[0].key)
 */
export default function BranchDailyView({
  branchCode,
  title = "عرض تقارير الفرع",
  subtitle = "Daily Viewer Hub",
  accent,
  tabs = [],
  defaultTabKey,
}) {
  const [activeKey, setActiveKey] = useState(defaultTabKey || tabs[0]?.key);

  const activeTab = useMemo(
    () => tabs.find((t) => t.key === activeKey) || tabs[0],
    [tabs, activeKey]
  );

  const liveCount = tabs.filter((t) => t.live !== false).length;

  const rootStyle = accent
    ? {
        "--accent":       accent.color,
        "--accent-l":     accent.light,
        "--accent-soft":  accent.soft,
        "--accent-soft-2":accent.soft2,
      }
    : undefined;

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString("ar-AE", {
        timeZone: "Asia/Dubai",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "";
    }
  }, []);

  return (
    <>
      <style>{STYLES}</style>
      <div className="bdv-root" style={rootStyle}>

        {/* ── Sidebar ── */}
        <aside className="bdv-sidebar">
          <div className="bdv-sidebar-header">
            <div className="bdv-branch-badge">● {branchCode}</div>
            <h2 className="bdv-sidebar-title" dangerouslySetInnerHTML={{ __html: title }} />
            <div className="bdv-sidebar-sub">{subtitle}</div>
          </div>

          <nav className="bdv-nav">
            {tabs.map((tab) => (
              <div className="bdv-nav-group" key={tab.key}>
                <button
                  className={`bdv-nav-btn ${activeKey === tab.key ? "active" : ""}`}
                  onClick={() => setActiveKey(tab.key)}
                  title={tab.label}
                >
                  <span className="bdv-nav-icon">{tab.icon}</span>
                  <span className="bdv-nav-label">{tab.label}</span>
                  <span className={`bdv-status-dot ${tab.live === false ? "soon" : "live"}`} />
                </button>
              </div>
            ))}
          </nav>

          <div className="bdv-sidebar-footer">
            <div className="bdv-connected-count">
              <span className="bdv-count-pill">{liveCount}</span>
              ملفات مربوطة
              <span style={{ marginRight: "auto", color: "#22c55e", fontWeight: 700 }}>✅ مكتمل</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="bdv-main">
          <div className="bdv-topbar">
            <div className="bdv-topbar-title">
              {activeTab?.icon} {activeTab?.label}
            </div>
            <div className="bdv-topbar-date">{todayLabel}</div>
          </div>

          <div className="bdv-content">
            {activeTab ? (
              <PanelShell tab={{ ...activeTab, branchCode }}>
                <Suspense fallback={<Loader label={activeTab.loaderLabel || activeTab.label} />}>
                  {activeTab.element}
                </Suspense>
              </PanelShell>
            ) : (
              <div className="bdv-placeholder">
                <div className="bdv-placeholder-icon">📭</div>
                <div className="bdv-placeholder-text">لا توجد تقارير مربوطة</div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
