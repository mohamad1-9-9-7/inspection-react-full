// src/pages/monitor/branches/_shared/BranchDailyView.jsx
// Unified Daily View Hub — التبويبات أفقية أعلى الصفحة (بدل القائمة الجانبية)
// والمحتوى يأخذ كامل العرض. كل الأفرع بتستخدم هالـ component حتى يكون التصميم موحّد.
import React, { Suspense, useEffect, useMemo, useState } from "react";
import PrintStyles from "./PrintStyles";
import PrintButton from "./PrintButton";

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
    --glass:   rgba(255,255,255,0.05);
    --canvas:  #f0f2f5;

    font-family: 'Tajawal', sans-serif;
    font-size: 16px;
    direction: rtl;
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 600px;
    background: var(--canvas);
    overflow: hidden;
  }

  /* ── Header (dark) ── */
  .bdv-header {
    background: var(--ink);
    padding: 14px 24px 10px;
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    flex-shrink: 0;
    border-bottom: 1px solid var(--border);
  }

  .bdv-branch-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--accent, var(--amber));
    color: var(--ink);
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: .12em;
    padding: 5px 12px;
    border-radius: 6px;
  }

  .bdv-header-title {
    color: #fff;
    font-size: 20px;
    font-weight: 800;
    margin: 0;
    line-height: 1.3;
  }

  .bdv-header-sub {
    color: var(--muted);
    font-size: 13px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .bdv-header-actions {
    margin-inline-start: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .bdv-topbar-date {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: #cbd5e1;
    background: var(--glass);
    padding: 5px 14px;
    border-radius: 20px;
    border: 1px solid var(--border);
  }

  .bdv-count-pill {
    background: var(--ok);
    color: #fff;
    font-weight: 700;
    font-size: 13px;
    padding: 3px 10px;
    border-radius: 20px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .bdv-connected-count {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 13px;
    font-family: 'IBM Plex Mono', monospace;
  }

  /* ── Tab strip (horizontal, top, LTR: تبدأ من اليسار) ── */
  .bdv-tabs {
    background: var(--ink);
    display: flex;
    align-items: stretch;
    gap: 5px;
    padding: 0 16px;
    overflow-x: auto;
    flex-shrink: 0;
    border-bottom: 3px solid var(--accent, var(--amber));
    scrollbar-width: thin;
    scrollbar-color: var(--ink-low) transparent;
    direction: ltr;
    justify-content: flex-start;
  }

  .bdv-tab {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 15px 26px 14px;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-family: 'Tajawal', sans-serif;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
    transition: all .18s ease;
    border-radius: 12px 12px 0 0;
    position: relative;
  }

  .bdv-tab:hover {
    background: var(--glass);
    color: #e2e8f0;
  }

  .bdv-tab.active {
    background: linear-gradient(180deg, var(--accent-soft, rgba(245,158,11,.20)) 0%, var(--accent-soft-2, rgba(245,158,11,.08)) 100%);
    color: var(--accent-l, var(--amber-l));
    font-weight: 800;
  }

  .bdv-tab.active::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0; right: 0;
    height: 3px;
    background: var(--accent-l, var(--amber-l));
    border-radius: 3px 3px 0 0;
  }

  .bdv-tab-icon { font-size: 21px; }

  .bdv-status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .bdv-status-dot.live  { background: var(--ok);    box-shadow: 0 0 6px var(--ok); }
  .bdv-status-dot.soon  { background: var(--muted); }

  /* ── Content ── */
  .bdv-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
  }

  /* ── Panel shell ── */
  .bdv-panel {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    padding: 24px;
    min-height: 300px;
    font-size: 15px;
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
    width: 46px;
    height: 46px;
    border-radius: 10px;
    background: var(--ink);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .bdv-panel-name {
    font-size: 20px;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 2px;
  }

  .bdv-panel-meta {
    font-size: 13.5px;
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
    font-size: 12.5px;
    font-weight: 700;
    padding: 5px 12px;
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
    font-size: 12.5px;
    font-weight: 700;
    padding: 5px 12px;
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
    font-size: 14.5px;
  }

  @keyframes bdv-spin { to { transform: rotate(360deg); } }

  .bdv-spinner {
    width: 22px;
    height: 22px;
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
  .bdv-placeholder-text { font-size: 16px; font-weight: 600; color: #94a3b8; }
  .bdv-placeholder-sub { font-size: 13px; font-family: 'IBM Plex Mono', monospace; color: #cbd5e1; }

  /* scrollbar */
  .bdv-tabs::-webkit-scrollbar { height: 5px; }
  .bdv-tabs::-webkit-scrollbar-thumb { background: var(--ink-low); border-radius: 4px; }
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
 * Shared Branch Daily View — tabs on top, full-width content.
 *
 * Props:
 *  - branchCode: string  e.g. "POS-10"
 *  - title:      string  header title (Arabic). Defaults to "عرض تقارير الفرع".
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

  // ✅ Allow external components (e.g. Dashboard) to switch tabs via CustomEvent
  useEffect(() => {
    const handler = (e) => {
      const key = e?.detail;
      if (key && tabs.some((t) => t.key === key)) {
        setActiveKey(key);
      }
    };
    window.addEventListener("prd:switch-tab", handler);
    window.addEventListener("branch:switch-tab", handler);
    return () => {
      window.removeEventListener("prd:switch-tab", handler);
      window.removeEventListener("branch:switch-tab", handler);
    };
  }, [tabs]);

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

  // بعض الأفرع تمرّر العنوان مع <br/> نصيّاً — ننظّفه لأنه يُعرض حرفياً
  const cleanTitle = String(title || "").replace(/<br\s*\/?>/gi, " ");

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
      <PrintStyles />
      <div className="bdv-root" style={rootStyle}>

        {/* ── Header (dark) ── */}
        <header className="bdv-header">
          <div className="bdv-branch-badge">● {branchCode}</div>
          <div>
            <h2 className="bdv-header-title">{cleanTitle}</h2>
            <div className="bdv-header-sub">{subtitle}</div>
          </div>

          <div className="bdv-header-actions no-print">
            <div className="bdv-connected-count">
              <span className="bdv-count-pill">{liveCount}</span>
              ملفات مربوطة
            </div>
            {activeTab?.key !== "overview" && (
              <PrintButton
                title={activeTab?.label || branchCode}
                documentNo=""
                reportDate={new Date().toLocaleDateString("en-CA")}
                lang={typeof document !== "undefined" && document.dir === "rtl" ? "ar" : "en"}
              />
            )}
            <div className="bdv-topbar-date">{todayLabel}</div>
          </div>
        </header>

        {/* ── Tabs (horizontal, top) ── */}
        <nav className="bdv-tabs no-print">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`bdv-tab ${activeKey === tab.key ? "active" : ""}`}
              onClick={() => setActiveKey(tab.key)}
              title={tab.label}
            >
              <span className="bdv-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className={`bdv-status-dot ${tab.live === false ? "soon" : "live"}`} />
            </button>
          ))}
        </nav>

        {/* ── Content (full width) ── */}
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
      </div>
    </>
  );
}
