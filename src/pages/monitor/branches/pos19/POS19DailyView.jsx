// src/pages/monitor/branches/pos19/POS19DailyView.jsx
import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";

/* ─────────────────────────────────────────────
   POS19DailyView — Viewer Hub  (Re-Designed)
   13 ملفات مربوطة / 0 placeholders ✅
───────────────────────────────────────────── */

// ✅ Personal Hygiene View
const PHView   = lazy(() => import("./view pos 19/PersonalHygieneChecklistView"));
// ✅ Daily Cleaning (Butchery) View
const DCView   = lazy(() => import("./view pos 19/DailyCleaningChecklistView"));
// ✅ Equipment Inspection & Sanitizing Log View
const EIView   = lazy(() => import("./view pos 19/EquipmentInspectionSanitizingLogView"));
// ✅ Glass Items Condition Monitoring Checklist View
const GlassView = lazy(() => import("./view pos 19/GlassItemsConditionChecklistView"));
// ✅ Receiving Log (Butchery) View
const RLView   = lazy(() => import("./view pos 19/ReceivingLogView"));
// ✅ Oil Quality Monitoring View
const OilView  = lazy(() => import("./view pos 19/OilQualityMonitoringView"));
// ✅ Food Temperature Verification Log View
const FTView   = lazy(() => import("./view pos 19/FoodTemperatureVerificationView"));
// ✅ Cleaning Programme Schedule View
const CPSView  = lazy(() => import("./view pos 19/CleaningProgrammeScheduleView"));
// ✅ Hot Holding Temperature Log View
const HHTView  = lazy(() => import("./view pos 19/HotHoldingTemperatureLogView"));
// ✅ Sanitizer Concentration Verification View
const SCVView  = lazy(() => import("./view pos 19/SanitizerConcentrationVerificationView"));
// ✅ Temperature Monitoring Log View
const TMLView  = lazy(() => import("./view pos 19/TemperatureMonitoringLogView"));
// ✅ Traceability Log View
const TRLView  = lazy(() => import("./view pos 19/TraceabilityLogView"));
// ✅ Wooden Items Condition Checklist View
const WICView  = lazy(() => import("./view pos 19/WoodenItemsConditionChecklistView"));

/* ─── Global Styles injected once ─── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Tajawal:wght@400;500;700;800&display=swap');

  .pos19-root {
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
    height: 100vh;
    min-height: 600px;
    background: var(--canvas);
    overflow: hidden;
  }

  /* ── Sidebar ── */
  .pos19-sidebar {
    width: 280px;
    min-width: 280px;
    background: var(--ink);
    display: flex;
    flex-direction: column;
    border-left: 3px solid var(--amber);
    overflow: hidden;
  }

  .pos19-sidebar-header {
    padding: 24px 20px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .pos19-branch-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--amber);
    color: var(--ink);
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 700;
    font-size: 11px;
    letter-spacing: .12em;
    padding: 4px 10px;
    border-radius: 4px;
    margin-bottom: 10px;
  }

  .pos19-sidebar-title {
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    margin: 0 0 2px;
    line-height: 1.3;
  }

  .pos19-sidebar-sub {
    color: var(--muted);
    font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .pos19-nav {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
    scrollbar-width: thin;
    scrollbar-color: var(--ink-low) transparent;
  }

  .pos19-nav-group {
    padding: 0 12px;
    margin-bottom: 4px;
  }

  .pos19-nav-btn {
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

  .pos19-nav-btn:hover {
    background: var(--glass);
    color: #e2e8f0;
  }

  .pos19-nav-btn.active {
    background: linear-gradient(90deg, rgba(245,158,11,.18) 0%, rgba(245,158,11,.06) 100%);
    color: var(--amber-l);
    font-weight: 700;
  }

  .pos19-nav-btn.active::before {
    content: '';
    position: absolute;
    right: 0; top: 20%; bottom: 20%;
    width: 3px;
    background: var(--amber);
    border-radius: 3px 0 0 3px;
  }

  .pos19-nav-icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 22px;
    text-align: center;
  }

  .pos19-nav-label {
    flex: 1;
    line-height: 1.3;
  }

  .pos19-status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .pos19-status-dot.live  { background: var(--ok);    box-shadow: 0 0 6px var(--ok); }
  .pos19-status-dot.soon  { background: var(--muted); }

  .pos19-sidebar-footer {
    padding: 14px 20px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .pos19-connected-count {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--muted);
    font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .pos19-count-pill {
    background: var(--ok);
    color: #fff;
    font-weight: 700;
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 20px;
  }

  /* ── Main area ── */
  .pos19-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--canvas);
  }

  .pos19-topbar {
    background: #fff;
    border-bottom: 1px solid #e2e8f0;
    padding: 14px 28px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  }

  .pos19-topbar-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--ink);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .pos19-topbar-date {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--muted);
    background: #f1f5f9;
    padding: 4px 12px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
  }

  .pos19-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
  }

  /* ── Panel shell ── */
  .pos19-panel {
    background: #fff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    padding: 24px;
    min-height: 300px;
  }

  .pos19-panel-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f1f5f9;
  }

  .pos19-panel-icon {
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

  .pos19-panel-name {
    font-size: 18px;
    font-weight: 800;
    color: var(--ink);
    margin: 0 0 2px;
  }

  .pos19-panel-meta {
    font-size: 12px;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
  }

  .pos19-connected-badge {
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

  .pos19-coming-badge {
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

  /* ── Placeholder ── */
  .pos19-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 60px 0;
    color: var(--muted);
    text-align: center;
  }

  .pos19-placeholder-icon {
    font-size: 48px;
    opacity: .35;
  }

  .pos19-placeholder-text {
    font-size: 15px;
    font-weight: 600;
    color: #94a3b8;
  }

  .pos19-placeholder-sub {
    font-size: 12px;
    font-family: 'IBM Plex Mono', monospace;
    color: #cbd5e1;
  }

  /* ── Suspense loader ── */
  .pos19-loader {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 60px 0;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
  }

  @keyframes pos19-spin {
    to { transform: rotate(360deg); }
  }

  .pos19-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e2e8f0;
    border-top-color: var(--amber);
    border-radius: 50%;
    animation: pos19-spin .7s linear infinite;
  }

  /* ── Overview ── */
  .pos19-ov-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px,1fr));
    gap: 14px;
    margin-bottom: 24px;
  }

  .pos19-ov-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
  }

  .pos19-ov-card-title {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--muted);
    margin-bottom: 6px;
    font-family: 'IBM Plex Mono', monospace;
  }

  .pos19-ov-card-value {
    font-size: 26px;
    font-weight: 800;
    color: var(--ink);
    font-family: 'IBM Plex Mono', monospace;
  }

  .pos19-ov-card-unit {
    font-size: 12px;
    color: var(--muted);
  }

  .pos19-check-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .pos19-check-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--ink);
  }

  .pos19-check-ok   { color: var(--ok);   font-size: 18px; }
  .pos19-check-fail { color: #ef4444;     font-size: 18px; }

  .pos19-date-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }

  .pos19-date-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--ink);
    white-space: nowrap;
  }

  .pos19-date-input {
    padding: 8px 14px;
    border-radius: 8px;
    border: 1.5px solid #e2e8f0;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--ink);
    outline: none;
    transition: border .18s;
    background: #f8fafc;
  }

  .pos19-date-input:focus { border-color: var(--amber); }

  .pos19-section-title {
    font-size: 14px;
    font-weight: 800;
    color: var(--ink-mid);
    margin: 20px 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pos19-no-report {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px;
    color: var(--muted);
    font-size: 14px;
  }

  /* scrollbar */
  .pos19-nav::-webkit-scrollbar { width: 4px; }
  .pos19-nav::-webkit-scrollbar-thumb { background: var(--ink-low); border-radius: 4px; }
`;

/* ─── Tab config ─── */
const TABS = [
  { key: "overview",               icon: "📊", label: "Overview — POS 19",                      live: false },
  { key: "cleaningProgramme",      icon: "🧼", label: "Cleaning Programme Schedule",             live: true  },
  { key: "dailyCleaningButchery",  icon: "🧹", label: "Daily Cleaning – Butchery",              live: true  },
  { key: "equipmentInspection",    icon: "🧪", label: "Equipment Inspection & Sanitizing",      live: true  },
  { key: "foodTempVerification",   icon: "🌡️", label: "Food Temperature Verification",          live: true  },
  { key: "glassItemsCondition",    icon: "🧯", label: "Glass Items Condition Monitoring",        live: true  },
  { key: "hotHoldingTemp",         icon: "🔥", label: "Hot Holding Temperature Log",            live: true  },
  { key: "oilQuality",             icon: "🛢️", label: "Oil Quality Monitoring",                 live: true  },
  { key: "personalHygiene",        icon: "🧑‍🔬", label: "Personal Hygiene Checklist",           live: true  },
  { key: "receivingLog",           icon: "📦", label: "Receiving Log",                          live: true  },
  { key: "sanitizerConcentration", icon: "🧴", label: "Sanitizer Concentration Log",            live: true  },
  { key: "temperatureMonitoring",  icon: "🌡️", label: "Temperature Monitoring Log",             live: true  },
  { key: "traceability",           icon: "🔗", label: "Traceability Log",                       live: true  },
  { key: "woodenItemsCondition",   icon: "🪵", label: "Wooden Items Condition Monitoring",      live: true  },
];

const LIVE_COUNT = TABS.filter(t => t.live && t.key !== "overview").length; // 13

/* ─── Sub-components ─── */
const Loader = ({ label }) => (
  <div className="pos19-loader">
    <div className="pos19-spinner" />
    جاري تحميل {label}…
  </div>
);

const PlaceholderPanel = ({ icon, label }) => (
  <div className="pos19-placeholder">
    <div className="pos19-placeholder-icon">{icon}</div>
    <div className="pos19-placeholder-text">{label}</div>
    <div className="pos19-placeholder-sub">سيتم الربط قريباً — Coming Soon</div>
  </div>
);

const PanelShell = ({ tab, children, isLive }) => (
  <div className="pos19-panel">
    <div className="pos19-panel-header">
      <div className="pos19-panel-icon">{tab.icon}</div>
      <div>
        <div className="pos19-panel-name">{tab.label}</div>
        <div className="pos19-panel-meta">POS-19 · {new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" })}</div>
      </div>
      {isLive ? (
        <div className="pos19-connected-badge">
          <span style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
          LIVE
        </div>
      ) : (
        <div className="pos19-coming-badge">⏳ SOON</div>
      )}
    </div>
    {children}
  </div>
);

/* ─── Main component ─── */
export default function POS19DailyView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reports, setReports]     = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  useEffect(() => {
    let saved; try { saved = JSON.parse(localStorage.getItem("pos19_reports") || "[]") || []; } catch { saved = []; }
    saved.sort((a,b) => String(a?.date||"").localeCompare(String(b?.date||"")));
    setReports(saved);
    const todayRep = saved.find(r => r?.date === todayDubai);
    if (todayRep) setSelectedDate(todayDubai);
    else if (saved.length > 0) setSelectedDate(saved[saved.length-1]?.date || "");
  }, [todayDubai]);

  const selectedReport = useMemo(
    () => reports.find(r => r?.date === selectedDate) || null,
    [reports, selectedDate]
  );

  /* ── Overview content ── */
  const OverviewContent = () => {
    if (!reports.length) return (
      <div className="pos19-no-report">
        <span style={{fontSize:40}}>📭</span>
        لا توجد تقارير محفوظة حتى الآن لفرع POS 19
      </div>
    );

    const temps   = selectedReport?.temperatures || {};
    const clean   = selectedReport?.cleanliness  || {};
    const uniform = !!selectedReport?.uniform;
    const notes   = selectedReport?.notes || "—";

    return (
      <>
        <div className="pos19-date-row">
          <span className="pos19-date-label">اختر التاريخ:</span>
          <input type="date" className="pos19-date-input"
            value={selectedDate||""}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>

        {selectedReport ? (
          <>
            <div className="pos19-ov-grid">
              <div className="pos19-ov-card">
                <div className="pos19-ov-card-title">براد 1</div>
                <div className="pos19-ov-card-value">{temps.fridge1 ?? "—"}<span className="pos19-ov-card-unit"> °C</span></div>
              </div>
              <div className="pos19-ov-card">
                <div className="pos19-ov-card-title">براد 2</div>
                <div className="pos19-ov-card-value">{temps.fridge2 ?? "—"}<span className="pos19-ov-card-unit"> °C</span></div>
              </div>
              <div className="pos19-ov-card">
                <div className="pos19-ov-card-title">براد 3</div>
                <div className="pos19-ov-card-value">{temps.fridge3 ?? "—"}<span className="pos19-ov-card-unit"> °C</span></div>
              </div>
            </div>

            <div className="pos19-section-title">🧼 نظافة الموقع</div>
            <div className="pos19-check-list">
              {[["الأرضيات",clean.floors],["الرفوف",clean.shelves],["الثلاجات",clean.fridges]].map(([lbl,val]) => (
                <div className="pos19-check-row" key={lbl}>
                  <span className={val ? "pos19-check-ok" : "pos19-check-fail"}>{val ? "✅" : "❌"}</span>
                  {lbl}
                </div>
              ))}
            </div>

            <div className="pos19-section-title">👔 الزي الرسمي</div>
            <div className="pos19-check-row">
              <span className={uniform ? "pos19-check-ok" : "pos19-check-fail"}>{uniform ? "✅" : "❌"}</span>
              {uniform ? "الموظف ملتزم بالزي" : "الموظف غير ملتزم بالزي"}
            </div>

            <div className="pos19-section-title">📝 ملاحظات المفتش</div>
            <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:8,padding:'12px 16px',fontSize:14,color:'#334155',lineHeight:1.7}}>
              {notes}
            </div>
          </>
        ) : (
          <div className="pos19-no-report">
            <span style={{fontSize:36}}>❌</span>
            لا يوجد تقرير لهذا التاريخ
          </div>
        )}
      </>
    );
  };

  /* ── Tab content router ── */
  const renderContent = () => {
    const tab = TABS.find(t => t.key === activeTab) || TABS[0];

    const wrap = (component, loaderLabel) => (
      <PanelShell tab={tab} isLive>
        <Suspense fallback={<Loader label={loaderLabel} />}>
          {component}
        </Suspense>
      </PanelShell>
    );

    switch (activeTab) {
      case "overview":              return <PanelShell tab={tab} isLive={false}><OverviewContent /></PanelShell>;
      case "cleaningProgramme":     return wrap(<CPSView />,    "Cleaning Programme");
      case "dailyCleaningButchery": return wrap(<DCView />,     "Daily Cleaning");
      case "equipmentInspection":   return wrap(<EIView />,     "Equipment Inspection");
      case "foodTempVerification":  return wrap(<FTView />,     "Food Temperature");
      case "glassItemsCondition":   return wrap(<GlassView />,  "Glass Items");
      case "oilQuality":            return wrap(<OilView />,    "Oil Quality");
      case "personalHygiene":       return wrap(<PHView />,     "Personal Hygiene");
      case "receivingLog":          return wrap(<RLView />,     "Receiving Log");
      case "hotHoldingTemp":        return wrap(<HHTView />,    "Hot Holding Temperature");
      case "sanitizerConcentration":return wrap(<SCVView />,    "Sanitizer Concentration");
      case "temperatureMonitoring": return wrap(<TMLView />,    "Temperature Monitoring");
      case "traceability":          return wrap(<TRLView />,    "Traceability Log");
      case "woodenItemsCondition":  return wrap(<WICView />,    "Wooden Items Condition");
      default:
        return <div className="pos19-panel" />;
    }
  };

  const activeTabObj = TABS.find(t => t.key === activeTab);

  return (
    <>
      <style>{STYLES}</style>
      <div className="pos19-root">

        {/* ── Sidebar ── */}
        <aside className="pos19-sidebar">
          <div className="pos19-sidebar-header">
            <div className="pos19-branch-badge">● POS-19</div>
            <h2 className="pos19-sidebar-title">عرض تقارير<br />الفرع</h2>
            <div className="pos19-sidebar-sub">Daily Viewer Hub</div>
          </div>

          <nav className="pos19-nav">
            {TABS.map(tab => (
              <div className="pos19-nav-group" key={tab.key}>
                <button
                  className={`pos19-nav-btn ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                  title={tab.label}
                >
                  <span className="pos19-nav-icon">{tab.icon}</span>
                  <span className="pos19-nav-label">{tab.label}</span>
                  <span className={`pos19-status-dot ${tab.live ? "live" : "soon"}`} />
                </button>
              </div>
            ))}
          </nav>

          <div className="pos19-sidebar-footer">
            <div className="pos19-connected-count">
              <span className="pos19-count-pill">{LIVE_COUNT}</span>
              ملفات مربوطة
              <span style={{marginRight:'auto', color:'#22c55e', fontWeight:700}}>✅ مكتمل</span>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="pos19-main">
          <div className="pos19-topbar">
            <div className="pos19-topbar-title">
              {activeTabObj?.icon} {activeTabObj?.label}
            </div>
            <div className="pos19-topbar-date">
              {new Date().toLocaleDateString("ar-AE", { timeZone:"Asia/Dubai", weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            </div>
          </div>

          <div className="pos19-content">
            {renderContent()}
          </div>
        </main>

      </div>
    </>
  );
}