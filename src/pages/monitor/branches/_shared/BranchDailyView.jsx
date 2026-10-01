// src/pages/monitor/branches/_shared/BranchDailyView.jsx
// Unified Daily View Hub — shared by every branch's "view reports" page.
//
// Layout: a light top bar, a searchable list of the branch's reports down the
// side, and the selected report full-height beside it. It replaced a dark
// header + a single horizontal tab strip that, on a branch with 26 reports
// (POS 19), hid most of them off-screen behind a sideways scroll.
//
// The selected report is kept in the URL (?rtab=key) so reloading, the back
// button and a pasted link all land on the same report.
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PrintStyles from "./PrintStyles";
import PrintButton from "./PrintButton";
import { BRANCHES } from "../../../../config/branches";

const NAV_KEY = "bdv:navCollapsed";

/* globals.css forces `#root * { font-size: 14px !important }`, so every size
   here goes through a doubled class + !important (see project notes). */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;

const STYLES = `
  .bdv-root {
    --sky-50:  #f0f9ff;
    --sky-100: #e0f2fe;
    --sky-200: #bae6fd;
    --sky-500: #0ea5e9;
    --sky-600: #0284c7;
    --sky-700: #0369a1;
    --ink:     #0f172a;
    --ink-2:   #334155;
    --muted:   #64748b;
    --line:    #e2e8f0;
    --accent:  var(--bdv-accent, #0ea5e9);

    font-family: 'Tajawal', 'Segoe UI', system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    height: 100vh;
    min-height: 600px;
    background: radial-gradient(1200px 600px at 100% -10%, #e0f2fe 0%, transparent 60%),
                radial-gradient(900px 500px at -10% 110%, #ecfdf5 0%, transparent 55%),
                #f6fafd;
    color: var(--ink);
    overflow: hidden;
  }

  /* ── Top bar ── */
  .bdv-header {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    flex-shrink: 0;
    padding: 12px 20px;
    background: rgba(255,255,255,.92);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
    box-shadow: 0 1px 0 rgba(15,23,42,.02), 0 6px 18px rgba(15,23,42,.04);
  }
  .bdv-burger {
    width: 38px; height: 38px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: #fff;
    color: var(--ink-2);
    cursor: pointer;
    display: inline-grid; place-items: center;
    flex-shrink: 0;
  }
  .bdv-burger:hover { background: var(--sky-50); border-color: var(--sky-200); }
  .bdv-branch {
    display: flex; flex-direction: column; gap: 2px;
    padding: 6px 12px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--sky-50), #ecfeff);
    border: 1px solid var(--sky-200);
    flex-shrink: 0;
  }
  .bdv-branch-code { font-weight: 900; color: var(--sky-700); letter-spacing: .04em; }
  .bdv-branch-name { font-weight: 700; color: var(--muted); }
  .bdv-titles { min-width: 0; }
  .bdv-header-title { margin: 0; font-weight: 900; color: var(--ink); line-height: 1.25; }
  .bdv-header-sub { color: var(--muted); font-weight: 600; }
  .bdv-header-actions {
    margin-inline-start: auto;
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }
  .bdv-date-chip {
    padding: 7px 14px;
    border-radius: 999px;
    background: #fff;
    border: 1px solid var(--line);
    color: var(--ink-2);
    font-weight: 700;
    white-space: nowrap;
  }

  /* ── Body: side list + content ── */
  .bdv-main {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 290px minmax(0, 1fr);
  }
  .bdv-root.is-collapsed .bdv-main { grid-template-columns: minmax(0, 1fr); }
  .bdv-root.is-collapsed .bdv-nav { display: none; }

  .bdv-nav {
    display: flex; flex-direction: column;
    min-height: 0;
    background: rgba(255,255,255,.75);
    border-inline-end: 1px solid var(--line);
  }
  .bdv-nav-head { padding: 14px 14px 10px; border-bottom: 1px solid #f1f5f9; }
  .bdv-nav-count { color: var(--muted); font-weight: 700; margin-bottom: 8px; display: flex; justify-content: space-between; }
  .bdv-search {
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid var(--line);
    background: #fff;
    outline: none;
  }
  .bdv-search:focus { border-color: var(--sky-500); box-shadow: 0 0 0 3px rgba(14,165,233,.15); }
  .bdv-nav-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 3px; }
  .bdv-nav-empty { padding: 18px 10px; color: var(--muted); text-align: center; }

  .bdv-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%;
    padding: 9px 10px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
    text-align: start;
    position: relative;
    transition: background .15s, border-color .15s;
  }
  .bdv-item:hover { background: var(--sky-50); }
  .bdv-item.active {
    background: #fff;
    border-color: var(--sky-200);
    box-shadow: 0 4px 14px rgba(14,165,233,.12);
    color: var(--ink);
  }
  .bdv-item.active::before {
    content: "";
    position: absolute;
    inset-block: 8px;
    inset-inline-start: -1px;
    width: 4px;
    border-radius: 4px;
    background: var(--accent);
  }
  .bdv-item-icon {
    width: 34px; height: 34px;
    flex-shrink: 0;
    border-radius: 10px;
    display: grid; place-items: center;
    background: #f1f5f9;
  }
  .bdv-item.active .bdv-item-icon { background: var(--sky-100); }
  .bdv-item-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
  /* Latin label inside an RTL list: lay it out LTR so the ellipsis cuts the
     END of the name, not its first word */
  .bdv-item-en { font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; direction: ltr; unicode-bidi: plaintext; max-width: 100%; }
  .bdv-root[dir="rtl"] .bdv-item-en { text-align: right; }
  .bdv-item-ar { font-weight: 600; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bdv-item.is-overview { margin-bottom: 6px; }
  .bdv-nav-sep { height: 1px; background: #f1f5f9; margin: 2px 6px 6px; }

  /* phone / narrow: the side list becomes a picker above the report */
  .bdv-picker { display: none; }

  .bdv-content { min-width: 0; overflow-y: auto; padding: 18px 20px 28px; }

  .bdv-panel {
    background: #fff;
    border-radius: 16px;
    border: 1px solid var(--line);
    box-shadow: 0 8px 30px rgba(15,23,42,.05);
    padding: 18px 20px 22px;
    min-height: 300px;
  }
  .bdv-panel-header {
    display: flex; align-items: center; gap: 12px;
    margin: -2px 0 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f1f5f9;
  }
  .bdv-panel-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--sky-100), #dcfce7);
    display: grid; place-items: center;
    flex-shrink: 0;
  }
  .bdv-panel-name { font-weight: 900; color: var(--ink); margin: 0; }
  .bdv-panel-name-ar { font-weight: 700; color: var(--muted); margin: 1px 0 0; }

  .bdv-loader {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 60px 0; color: var(--muted); font-weight: 700;
  }
  @keyframes bdv-spin { to { transform: rotate(360deg); } }
  .bdv-spinner {
    width: 22px; height: 22px;
    border: 3px solid var(--sky-100);
    border-top-color: var(--sky-500);
    border-radius: 50%;
    animation: bdv-spin .7s linear infinite;
  }
  .bdv-placeholder { padding: 60px 0; color: var(--muted); text-align: center; font-weight: 700; }

  /* globals.css squeezes every fixed-layout table to 100% and lets text break
     ANYWHERE, so headers rendered as "FLOO R/ WALL S" and "Tim e". Inside the
     view hub a word stays whole; a table wider than the panel scrolls
     (.bdv-content / the views' own overflow wrappers) instead of crushing. */
  #root .bdv-content.bdv-content table td,
  #root .bdv-content.bdv-content table th { word-break: normal; overflow-wrap: break-word; }
  #root .bdv-content.bdv-content table[style*="table-layout"],
  #root .bdv-content.bdv-content table[style*="tableLayout"] { max-width: none !important; }

  /* every view inside shares these quiet defaults */
  .bdv-content button:disabled,
  .bdv-content label[aria-disabled="true"] { opacity: .45; cursor: not-allowed; filter: grayscale(.4); }

  /* sizes — doubled class to beat globals.css' #root * { font-size: !important } */
  #root .bdv-root.bdv-root .bdv-header-title { font-size: ${fs(19)}; }
  #root .bdv-root.bdv-root .bdv-header-sub,
  #root .bdv-root.bdv-root .bdv-branch-name,
  #root .bdv-root.bdv-root .bdv-item-ar,
  #root .bdv-root.bdv-root .bdv-nav-count { font-size: ${fs(12)}; }
  #root .bdv-root.bdv-root .bdv-branch-code { font-size: ${fs(15)}; }
  #root .bdv-root.bdv-root .bdv-item-en { font-size: ${fs(13.5)}; }
  #root .bdv-root.bdv-root .bdv-item-icon { font-size: ${fs(17)}; }
  #root .bdv-root.bdv-root .bdv-panel-icon { font-size: ${fs(22)}; }
  #root .bdv-root.bdv-root .bdv-panel-name { font-size: ${fs(18)}; }
  #root .bdv-root.bdv-root .bdv-panel-name-ar { font-size: ${fs(13.5)}; }
  #root .bdv-root.bdv-root .bdv-date-chip { font-size: ${fs(12.5)}; }

  @media (max-width: 900px) {
    .bdv-root { height: auto; min-height: 100vh; overflow: visible; }
    .bdv-main { display: block; }
    .bdv-nav, .bdv-burger { display: none; }
    .bdv-picker {
      display: block;
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid var(--sky-200);
      background: #fff;
      font-weight: 800;
      margin-bottom: 12px;
    }
    .bdv-content { overflow: visible; padding: 12px; }
    /* The views lay out "date tree | report" as an inline 260–300px + 1fr
       grid; on a phone that left the report a 40px column of vertical
       letters. Stack them instead. */
    #root .bdv-content [style*="grid-template-columns"][style*="px minmax(0"],
    #root .bdv-content [style*="grid-template-columns"][style*="px 1fr"] {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    .bdv-header { padding: 10px 12px; }
    .bdv-header-actions { margin-inline-start: 0; width: 100%; }
    .bdv-panel { padding: 14px 12px; }
  }
`;

const Loader = ({ label }) => (
  <div className="bdv-loader">
    <div className="bdv-spinner" />
    <span>{label}…</span>
  </div>
);

/* "POS-19" → "POS 19" → the registry label ("Al Warqa Kitchen"). */
function branchLabelOf(code) {
  const id = String(code || "").replace(/-/g, " ").trim().toUpperCase();
  const hit = BRANCHES.find((b) => b.id.toUpperCase() === id);
  return hit && hit.label.toUpperCase() !== hit.id.toUpperCase() ? hit.label : "";
}

function readCollapsed() {
  try { return localStorage.getItem(NAV_KEY) === "1"; } catch { return false; }
}

/**
 * Shared Branch Daily View.
 *
 * Props:
 *  - branchCode: string  e.g. "POS-10"
 *  - title:      string  header title. Defaults to "عرض تقارير الفرع".
 *  - subtitle:   string  small subtitle. Defaults to "Daily Viewer Hub".
 *  - accent:     { color } — optional accent for the active item.
 *  - tabs: Array<{ key, icon, label, labelAr?, live?, element, loaderLabel? }>
 *  - defaultTabKey?: string (defaults to tabs[0].key)
 *  - direction?: "rtl" | "ltr"
 *  - showPrint?: boolean — the generic print button (off when panels print
 *    their own record, e.g. POS 6).
 */
export default function BranchDailyView({
  branchCode,
  title = "عرض تقارير الفرع",
  subtitle = "Daily Viewer Hub",
  accent,
  tabs = [],
  defaultTabKey,
  direction = "rtl",
  showPrint = true,
}) {
  const [params, setParams] = useSearchParams();
  const urlKey = params.get("rtab");
  const initialKey = tabs.some((t) => t.key === urlKey) ? urlKey : (defaultTabKey || tabs[0]?.key);
  const [activeKey, setActiveKeyState] = useState(initialKey);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const setActiveKey = (key) => {
    setActiveKeyState(key);
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set("rtab", key);
      return n;
    }, { replace: true });
  };

  // Allow external components (e.g. the Overview dashboard) to switch tabs.
  useEffect(() => {
    const handler = (e) => {
      const key = e?.detail;
      if (key && tabs.some((t) => t.key === key)) setActiveKey(key);
    };
    window.addEventListener("prd:switch-tab", handler);
    window.addEventListener("branch:switch-tab", handler);
    return () => {
      window.removeEventListener("prd:switch-tab", handler);
      window.removeEventListener("branch:switch-tab", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem(NAV_KEY, c ? "0" : "1"); } catch {}
      return !c;
    });
  };

  const activeTab = useMemo(
    () => tabs.find((t) => t.key === activeKey) || tabs[0],
    [tabs, activeKey]
  );

  const q = query.trim().toLowerCase();
  const visibleTabs = useMemo(
    () => (q
      ? tabs.filter((t) => `${t.label} ${t.labelAr || ""} ${t.key}`.toLowerCase().includes(q))
      : tabs),
    [tabs, q]
  );
  const reportCount = tabs.filter((t) => t.key !== "overview").length;

  const isAr = direction === "rtl";
  const rootStyle = accent?.color ? { "--bdv-accent": accent.color } : undefined;

  // Some branches pass the title with a literal <br/> — clean it up.
  const cleanTitle = String(title || "").replace(/<br\s*\/?>/gi, " ");
  const branchName = branchLabelOf(branchCode);

  const todayLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
        timeZone: "Asia/Dubai", weekday: "long", year: "numeric", month: "long", day: "numeric",
      });
    } catch { return ""; }
  }, [isAr]);

  const renderItem = (tab) => (
    <button
      key={tab.key}
      type="button"
      className={`bdv-item ${activeKey === tab.key ? "active" : ""} ${tab.key === "overview" ? "is-overview" : ""}`}
      onClick={() => setActiveKey(tab.key)}
      title={tab.labelAr ? `${tab.label} — ${tab.labelAr}` : tab.label}
      aria-current={activeKey === tab.key ? "page" : undefined}
    >
      <span className="bdv-item-icon" aria-hidden="true">{tab.icon}</span>
      <span className="bdv-item-text">
        <span className="bdv-item-en" dir="ltr">{tab.label}</span>
        {tab.labelAr ? <span className="bdv-item-ar" dir="rtl">{tab.labelAr}</span> : null}
      </span>
    </button>
  );

  const overviewTab = visibleTabs.find((t) => t.key === "overview");
  const otherTabs = visibleTabs.filter((t) => t.key !== "overview");

  return (
    <>
      <style>{STYLES}</style>
      <PrintStyles />
      <div
        className={`bdv-root ${collapsed ? "is-collapsed" : ""}`}
        style={rootStyle}
        dir={direction}
      >
        {/* ── Top bar ── */}
        <header className="bdv-header no-print">
          <button
            type="button"
            className="bdv-burger"
            onClick={toggleCollapsed}
            title={collapsed ? (isAr ? "إظهار قائمة التقارير" : "Show report list") : (isAr ? "إخفاء قائمة التقارير" : "Hide report list")}
            aria-label="Toggle report list"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="bdv-branch">
            <span className="bdv-branch-code">{String(branchCode || "").replace(/-/g, " ")}</span>
            {branchName ? <span className="bdv-branch-name">{branchName}</span> : null}
          </div>
          <div className="bdv-titles">
            <h2 className="bdv-header-title">{cleanTitle}</h2>
            <div className="bdv-header-sub">{subtitle}</div>
          </div>

          <div className="bdv-header-actions">
            {showPrint && activeTab?.key !== "overview" && (
              <PrintButton
                title={activeTab?.label || branchCode}
                documentNo=""
                reportDate={new Date().toLocaleDateString("en-CA")}
                lang={isAr ? "ar" : "en"}
              />
            )}
            <div className="bdv-date-chip">{todayLabel}</div>
          </div>
        </header>

        <div className="bdv-main">
          {/* ── Report list ── */}
          <aside className="bdv-nav no-print" aria-label="Reports">
            <div className="bdv-nav-head">
              <div className="bdv-nav-count">
                <span>{isAr ? "التقارير" : "Reports"}</span>
                <span>{reportCount}</span>
              </div>
              <input
                className="bdv-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isAr ? "ابحث عن تقرير…" : "Find a report…"}
              />
            </div>
            <div className="bdv-nav-list">
              {overviewTab ? renderItem(overviewTab) : null}
              {overviewTab && otherTabs.length ? <div className="bdv-nav-sep" /> : null}
              {otherTabs.map(renderItem)}
              {!visibleTabs.length && (
                <div className="bdv-nav-empty">{isAr ? "لا يوجد تقرير بهذا الاسم" : "No report matches"}</div>
              )}
            </div>
          </aside>

          {/* ── Content ── */}
          <main className="bdv-content">
            <select
              className="bdv-picker no-print"
              value={activeTab?.key || ""}
              onChange={(e) => setActiveKey(e.target.value)}
              aria-label="Report"
            >
              {tabs.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}{t.labelAr ? ` — ${t.labelAr}` : ""}
                </option>
              ))}
            </select>

            {activeTab ? (
              <div className="bdv-panel">
                <div className="bdv-panel-header no-print">
                  <div className="bdv-panel-icon" aria-hidden="true">{activeTab.icon}</div>
                  <div>
                    <div className="bdv-panel-name">{activeTab.label}</div>
                    {activeTab.labelAr ? <div className="bdv-panel-name-ar" dir="rtl">{activeTab.labelAr}</div> : null}
                  </div>
                </div>
                {/* Keyed by tab: a hub whose tabs share one component (POS 6
                    drives five sheets through a single POS6ReportView) must
                    remount per tab, or the previous tab's report and date tree
                    carry over into the next one. */}
                <Suspense key={activeTab.key} fallback={<Loader label={activeTab.loaderLabel || activeTab.label} />}>
                  {activeTab.element}
                </Suspense>
              </div>
            ) : (
              <div className="bdv-placeholder">{isAr ? "لا توجد تقارير مربوطة" : "No reports linked"}</div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
