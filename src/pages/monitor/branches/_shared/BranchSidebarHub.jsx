// src/pages/monitor/branches/_shared/BranchSidebarHub.jsx
//
// The Production hub's sidebar layout, made reusable so a new branch gets the
// same screen without another 320-line copy of the stylesheet. Presentation
// only: every string arrives already translated, and each tab supplies its own
// element, so lazy-loading and i18n stay with the caller.
//
// ProductionHub still carries its own copy of this markup; it can drop onto
// this component later with no visual change (same class names, same CSS).

import React, { Suspense, useState } from "react";

export default function BranchSidebarHub({
  brandTitle,
  brandSubtitle,
  BrandIcon,
  todayText = "",
  breadcrumb = [],
  tabs = [],
  activeKey,
  onSelect,
  labels = {},
  dir = "ltr",
  isAr = false,
  onToggleLang,
  contentKey,
  loadingFallback,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const active = tabs.find((tb) => tb.key === activeKey) || tabs[0];
  if (!active) return null;

  const sepChar = isAr ? "‹" : "›";
  const ActiveIcon = active.Icon;

  return (
    <div className="prd-hub" dir={dir}>
      <style>{STYLES}</style>

      {/* ── Sidebar ── */}
      <aside className={`prd-sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="prd-brand">
          <div className="prd-brand-icon">{BrandIcon ? <BrandIcon size={22} /> : null}</div>
          {!collapsed && (
            <div className="prd-brand-text">
              <div className="prd-brand-title">{brandTitle}</div>
              <div className="prd-brand-sub">{brandSubtitle}</div>
            </div>
          )}
        </div>

        <button
          className="prd-collapse-btn"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (isAr ? "‹" : "›") : (isAr ? "›" : "‹")}
        </button>

        {!collapsed && <div className="prd-nav-heading">{labels.forms}</div>}
        <nav className="prd-nav">
          {tabs.map((tab) => {
            const isActive = tab.key === active.key;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.key}
                className={`prd-nav-item ${isActive ? "active" : ""}`}
                onClick={() => onSelect(tab.key)}
                title={collapsed ? tab.title : ""}
                style={isActive ? { "--accent": tab.accent } : undefined}
              >
                <span className="prd-nav-icon" style={{ color: tab.accent }}>
                  <TabIcon size={20} />
                </span>
                {!collapsed && (
                  <span className="prd-nav-text">
                    <span className="prd-nav-title">{tab.title}</span>
                    {tab.subtitle && <span className="prd-nav-sub">{tab.subtitle}</span>}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="prd-sidebar-footer">
            <div className="prd-footer-pill">
              <span className="prd-pulse" />
              {labels.footer}
            </div>
            <div className="prd-footer-sub">{labels.footerSub}</div>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main className="prd-main">
        <header className="prd-topbar">
          <div className="prd-topbar-left">
            <div
              className="prd-topbar-icon"
              style={{ background: `${active.accent}15`, color: active.accent }}
            >
              <ActiveIcon size={22} />
            </div>
            <div>
              <div className="prd-topbar-title">{active.title}</div>
              {active.subtitle && <div className="prd-topbar-sub">{active.subtitle}</div>}
            </div>
          </div>
          <div className="prd-topbar-right">
            {onToggleLang && (
              <button
                className="prd-lang-btn"
                onClick={onToggleLang}
                title={isAr ? "Switch to English" : "التبديل إلى العربية"}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
                </svg>
                <span>{labels.langToggle}</span>
              </button>
            )}
            {todayText && (
              <div className="prd-date-chip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {todayText}
              </div>
            )}
          </div>
        </header>

        <div className="prd-breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={i}>
              <span>{crumb}</span>
              <span className="prd-sep">{sepChar}</span>
            </React.Fragment>
          ))}
          <span className="prd-current" style={{ color: active.accent }}>{active.title}</span>
        </div>

        <section className="prd-panel">
          <Suspense
            fallback={
              loadingFallback || (
                <div className="prd-loading">
                  <div className="prd-spinner" />
                  <span>{labels.loading}</span>
                </div>
              )
            }
          >
            <React.Fragment key={`${active.key}-${contentKey}`}>{active.render()}</React.Fragment>
          </Suspense>
        </section>
      </main>
    </div>
  );
}

/* Lifted verbatim from ProductionHub so the two screens stay pixel-identical.
   The Inter @import lives here once for every branch that adopts this hub. */
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
    /* Wide enough that a form name wraps rather than being cut. */
    width: 300px;
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
    padding: 12px;
    min-height: 56px;
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
  .prd-nav-item:focus-visible,
  .prd-collapse-btn:focus-visible,
  .prd-lang-btn:focus-visible {
    outline: 2px solid var(--teal-2);
    outline-offset: 2px;
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
    width: 38px; height: 38px;
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
    font-size: 13.5px; font-weight: 700;
    line-height: 1.35;
    white-space: normal;
    overflow-wrap: anywhere;
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
    .prd-nav-item { flex-shrink: 0; padding: 10px 12px; min-height: 52px; max-width: 240px; }
    .prd-nav-sub { display: none; }
    .prd-nav-heading { display: none; }
    .prd-sidebar-footer { display: none; }
    .prd-topbar { padding: 12px 16px; flex-wrap: wrap; gap: 10px; }
    .prd-panel { margin: 10px 12px 14px; border-radius: 12px; }
    .prd-breadcrumb { padding: 10px 16px 0; }
  }
`;
