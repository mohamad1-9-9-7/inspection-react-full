// src/pages/monitor/branches/production/ProductionDashboard.jsx
// Overview dashboard showing today's status + recent activity for all Production reports.

import React, { useEffect, useMemo, useState } from "react";
import { useLang } from "./_shared/i18n";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
      process.env.VITE_API_URL ||
      process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ─── Report types with metadata ─── */
const REPORT_TYPES = [
  {
    type: "prod_personal_hygiene",
    key: "hygiene",
    titleKey: "tab_hygiene",
    accent: "#0ea5e9",
    icon: "🧑‍🍳",
  },
  {
    type: "prod_cleaning_checklist",
    key: "cleaning",
    titleKey: "tab_cleaning",
    accent: "#22c55e",
    icon: "🧽",
  },
  {
    type: "prod_defrosting_record",
    key: "defrost",
    titleKey: "tab_defrost",
    accent: "#3b82f6",
    icon: "❄️",
  },
  {
    type: "prd_traceability_log",
    key: "trace",
    titleKey: "tab_trace",
    accent: "#a855f7",
    icon: "🔗",
  },
  {
    type: "prod_online_cutting",
    key: "cutting",
    titleKey: "tab_cutting",
    accent: "#e11d48",
    icon: "✂️",
  },
  {
    type: "prod_dried_meat",
    key: "dried",
    titleKey: "tab_dried",
    accent: "#b45309",
    icon: "🥓",
  },
];

/* ─── Helpers ─── */
const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
};

const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 7) % 7; // back to Sunday (can customize to Monday)
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

function switchToTab(tabKey) {
  try {
    window.dispatchEvent(new CustomEvent("prd:switch-tab", { detail: tabKey }));
  } catch (e) { /* noop */ }
}

export default function ProductionDashboard() {
  const { t, dir, isAr } = useLang();
  const [data, setData]       = useState({}); // { [type]: array }
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      REPORT_TYPES.map(async (rt) => {
        try {
          const res = await fetch(`${API_BASE}/api/reports?type=${rt.type}`, { cache: "no-store" });
          if (!res.ok) return [rt.type, []];
          const json = await res.json();
          const arr = Array.isArray(json) ? json : json?.data ?? [];
          return [rt.type, arr];
        } catch { return [rt.type, []]; }
      })
    ).then((results) => {
      if (cancelled) return;
      const map = {};
      results.forEach(([type, arr]) => { map[type] = arr; });
      setData(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const todayIso  = today();
  const weekStart = startOfWeek().getTime();
  const monthStart = startOfMonth().getTime();

  const stats = useMemo(() => {
    const out = {};
    REPORT_TYPES.forEach((rt) => {
      const list = data[rt.type] || [];
      let lastDate = null;
      let todayCount = 0, weekCount = 0, monthCount = 0;
      list.forEach((r) => {
        const p = r?.payload || {};
        const rd = p.reportDate || p.header?.reportDate || "";
        if (!rd) return;
        if (rd === todayIso) todayCount++;
        const t = Date.parse(rd);
        if (!Number.isNaN(t)) {
          if (t >= weekStart)  weekCount++;
          if (t >= monthStart) monthCount++;
        }
        if (!lastDate || rd > lastDate) lastDate = rd;
      });
      out[rt.type] = {
        total: list.length,
        today: todayCount,
        week: weekCount,
        month: monthCount,
        lastDate,
      };
    });
    return out;
  }, [data, todayIso, weekStart, monthStart]);

  const weekTotal = useMemo(
    () => REPORT_TYPES.reduce((a, rt) => a + (stats[rt.type]?.week || 0), 0),
    [stats]
  );
  const monthTotal = useMemo(
    () => REPORT_TYPES.reduce((a, rt) => a + (stats[rt.type]?.month || 0), 0),
    [stats]
  );
  const todayDone = useMemo(
    () => REPORT_TYPES.filter((rt) => (stats[rt.type]?.today || 0) > 0).length,
    [stats]
  );

  const dateLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });
    } catch { return ""; }
  }, [isAr]);

  return (
    <div className="pdb-wrap" dir={dir}>
      <style>{STYLES}</style>

      {/* ── Hero banner ── */}
      <div className="pdb-hero">
        <div>
          <h1 className="pdb-title">📊 {t("db_title")}</h1>
          <p className="pdb-subtitle">{t("db_subtitle")}</p>
          <div className="pdb-date">{dateLabel}</div>
        </div>
        <button
          className="pdb-refresh"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          title={t("db_refresh")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? "pdb-spin" : ""}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {t("db_refresh")}
        </button>
      </div>

      {/* ── Top stats ── */}
      <div className="pdb-kpis">
        <div className="pdb-kpi">
          <div className="pdb-kpi-label">✅ {t("db_today")}</div>
          <div className="pdb-kpi-value">{todayDone} / {REPORT_TYPES.length}</div>
          <div className="pdb-kpi-sub">
            {todayDone === REPORT_TYPES.length ? (isAr ? "مكتمل 🎉" : "All complete 🎉")
            : `${REPORT_TYPES.length - todayDone} ${isAr ? "متبقّي" : "pending"}`}
          </div>
        </div>
        <div className="pdb-kpi">
          <div className="pdb-kpi-label">📅 {t("db_this_week")}</div>
          <div className="pdb-kpi-value">{weekTotal}</div>
          <div className="pdb-kpi-sub">{isAr ? "تقرير" : "reports"}</div>
        </div>
        <div className="pdb-kpi">
          <div className="pdb-kpi-label">🗓️ {t("db_this_month")}</div>
          <div className="pdb-kpi-value">{monthTotal}</div>
          <div className="pdb-kpi-sub">{isAr ? "تقرير" : "reports"}</div>
        </div>
        <div className="pdb-kpi">
          <div className="pdb-kpi-label">📦 {t("db_total_reports")}</div>
          <div className="pdb-kpi-value">
            {REPORT_TYPES.reduce((a, rt) => a + (stats[rt.type]?.total || 0), 0)}
          </div>
          <div className="pdb-kpi-sub">{isAr ? "كل الفترات" : "all time"}</div>
        </div>
      </div>

      {/* ── Report cards grid ── */}
      <div className="pdb-grid">
        {REPORT_TYPES.map((rt) => {
          const s = stats[rt.type] || { total: 0, today: 0, week: 0, month: 0, lastDate: null };
          const isToday = s.today > 0;
          const daysSince = s.lastDate ? diffDays(todayIso, s.lastDate) : null;
          return (
            <div
              key={rt.type}
              className={`pdb-card ${isToday ? "pdb-card-ok" : s.lastDate ? "pdb-card-warn" : "pdb-card-empty"}`}
              style={{ "--accent": rt.accent }}
            >
              <div className="pdb-card-header">
                <div className="pdb-card-icon" style={{ background: `${rt.accent}20`, color: rt.accent }}>
                  {rt.icon}
                </div>
                <div className="pdb-card-title">{t(rt.titleKey)}</div>
                {loading && <div className="pdb-card-loader" />}
              </div>

              <div className={`pdb-card-status ${isToday ? "pdb-status-ok" : s.lastDate ? "pdb-status-warn" : "pdb-status-empty"}`}>
                {isToday ? `✅ ${t("db_submitted")}` :
                 s.lastDate ? `⏰ ${t("db_not_submitted")}` :
                 `— ${t("db_no_data")}`}
              </div>

              <div className="pdb-card-metrics">
                <div>
                  <div className="pdb-card-metric-label">{t("db_this_week")}</div>
                  <div className="pdb-card-metric-value">{s.week}</div>
                </div>
                <div>
                  <div className="pdb-card-metric-label">{t("db_this_month")}</div>
                  <div className="pdb-card-metric-value">{s.month}</div>
                </div>
                <div>
                  <div className="pdb-card-metric-label">{t("db_total_reports")}</div>
                  <div className="pdb-card-metric-value">{s.total}</div>
                </div>
              </div>

              <div className="pdb-card-footer">
                <div className="pdb-card-last">
                  <span className="pdb-card-last-label">{t("db_last_submission")}:</span>
                  <span className="pdb-card-last-value">
                    {s.lastDate
                      ? `${s.lastDate}${daysSince !== null && daysSince > 0 ? ` (${daysSince}d ${isAr ? "سابق" : "ago"})` : ""}`
                      : "—"}
                  </span>
                </div>
                <button
                  className="pdb-card-btn"
                  style={{ background: rt.accent }}
                  onClick={() => switchToTab(rt.key)}
                >
                  {t("db_view_report")} →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function diffDays(todayIso, otherIso) {
  const a = new Date(todayIso);
  const b = new Date(otherIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

const STYLES = `
  .pdb-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  /* ── Hero ── */
  .pdb-hero {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #fff;
    padding: 22px 24px;
    border-radius: 14px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    position: relative;
    overflow: hidden;
  }
  .pdb-hero::before {
    content: '';
    position: absolute;
    top: -50%; right: -10%;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(20,184,166,.2), transparent 70%);
  }
  .pdb-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -.01em;
  }
  .pdb-subtitle {
    margin: 4px 0 0;
    color: #cbd5e1;
    font-size: 13px;
  }
  .pdb-date {
    margin-top: 6px;
    display: inline-block;
    background: rgba(255,255,255,.1);
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(255,255,255,.15);
  }
  .pdb-refresh {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 9px 16px;
    border-radius: 8px;
    background: rgba(255,255,255,.12);
    border: 1px solid rgba(255,255,255,.25);
    color: #fff;
    font-family: inherit;
    font-size: 13px; font-weight: 700;
    cursor: pointer;
    z-index: 1;
    transition: all .15s ease;
  }
  .pdb-refresh:hover:not(:disabled) {
    background: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .pdb-refresh:disabled { opacity: .6; cursor: not-allowed; }
  .pdb-spin { animation: pdb-spin 1s linear infinite; }
  @keyframes pdb-spin { to { transform: rotate(360deg); } }

  /* ── KPIs ── */
  .pdb-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .pdb-kpi {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .pdb-kpi-label {
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 6px;
  }
  .pdb-kpi-value {
    font-size: 28px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .pdb-kpi-sub {
    margin-top: 4px;
    font-size: 12px;
    color: #94a3b8;
    font-weight: 600;
  }

  /* ── Cards grid ── */
  .pdb-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 14px;
  }
  .pdb-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid var(--accent);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform .15s ease, box-shadow .2s ease;
  }
  .pdb-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15,23,42,.1);
  }
  .pdb-card-ok   { background: #f0fdf4; }
  .pdb-card-warn { background: #fffbeb; }
  .pdb-card-empty { background: #f8fafc; }

  .pdb-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pdb-card-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
  }
  .pdb-card-title {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    flex: 1;
  }
  .pdb-card-loader {
    width: 14px; height: 14px;
    border: 2px solid #e2e8f0;
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: pdb-spin .8s linear infinite;
  }

  .pdb-card-status {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
  }
  .pdb-status-ok    { background: #dcfce7; color: #166534; }
  .pdb-status-warn  { background: #fef3c7; color: #92400e; }
  .pdb-status-empty { background: #f1f5f9; color: #64748b; }

  .pdb-card-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }
  .pdb-card-metric-label {
    font-size: 10px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .pdb-card-metric-value {
    margin-top: 2px;
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
  }

  .pdb-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
  }
  .pdb-card-last {
    font-size: 11px;
    line-height: 1.4;
  }
  .pdb-card-last-label {
    font-weight: 700;
    color: #64748b;
    display: block;
  }
  .pdb-card-last-value {
    font-weight: 700;
    color: #0f172a;
  }
  .pdb-card-btn {
    padding: 7px 14px;
    border-radius: 8px;
    border: none;
    color: #fff;
    font-family: inherit;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    transition: all .15s ease;
    white-space: nowrap;
  }
  .pdb-card-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }

  @media (max-width: 900px) {
    .pdb-wrap { padding: 14px; }
    .pdb-kpis { grid-template-columns: repeat(2, 1fr); }
    .pdb-hero { flex-direction: column; align-items: flex-start; }
  }
`;
