// src/pages/monitor/branches/_shared/BranchDashboard.jsx
// Generic branch-level dashboard showing today's status + recent activity
// for any list of report types.
//
// Usage:
//   <BranchDashboard
//     branchName="QCS"
//     reportTypes={[
//       { type: "qcs_non_conformance", key: "nc", icon: "⚠️", titleEn: "Non-Conformance", titleAr: "عدم المطابقة", accent: "#dc2626" },
//       ...
//     ]}
//   />

import React, { useEffect, useMemo, useState } from "react";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
      process.env.VITE_API_URL ||
      process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ─── Helpers ─── */
const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
};
const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  d.setDate(d.getDate() - ((day + 7) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/* Detect language from document direction */
function detectLang() {
  if (typeof document === "undefined") return "en";
  return document.dir === "rtl" ? "ar" : "en";
}

/* Simple translator */
function tr(key, lang) {
  const D = {
    title:        { en: "Dashboard Overview",           ar: "نظرة عامة" },
    subtitle:     { en: "Today's status & recent activity across all reports", ar: "الحالة اليومية والنشاط الأخير لكل التقارير" },
    today:        { en: "Today",                         ar: "اليوم" },
    week:         { en: "This Week",                     ar: "هذا الأسبوع" },
    month:        { en: "This Month",                    ar: "هذا الشهر" },
    total:        { en: "Total Reports",                 ar: "مجموع التقارير" },
    last:         { en: "Last Submission",               ar: "آخر إدخال" },
    submitted:    { en: "Submitted today",               ar: "تم التسجيل اليوم" },
    notSubmitted: { en: "Not submitted today",           ar: "لم يُسجّل اليوم" },
    noData:       { en: "No reports yet",                ar: "لا توجد تقارير بعد" },
    view:         { en: "View",                          ar: "عرض" },
    refresh:      { en: "Refresh",                       ar: "تحديث" },
    allComplete:  { en: "All complete 🎉",               ar: "مكتمل 🎉" },
    pending:      { en: "pending",                       ar: "متبقّي" },
    reports:      { en: "reports",                       ar: "تقرير" },
    allTime:      { en: "all time",                      ar: "كل الفترات" },
    daysAgo:      { en: "d ago",                         ar: "يوم سابق" },
  };
  return D[key]?.[lang] || D[key]?.en || key;
}

function switchToTab(tabKey) {
  try {
    window.dispatchEvent(new CustomEvent("prd:switch-tab", { detail: tabKey }));
    window.dispatchEvent(new CustomEvent("branch:switch-tab", { detail: tabKey }));
  } catch (e) { /* noop */ }
}

export default function BranchDashboard({
  branchName = "Branch",
  branchNameAr = "",
  reportTypes = [],
  accent = "#0f766e",
}) {
  const lang = detectLang();
  const isAr = lang === "ar";
  const t = (k) => tr(k, lang);

  const [data, setData]       = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all(
      reportTypes.map(async (rt) => {
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
  }, [refreshKey]); // eslint-disable-line

  const todayIso   = today();
  const weekStart  = startOfWeek().getTime();
  const monthStart = startOfMonth().getTime();

  const stats = useMemo(() => {
    const out = {};
    reportTypes.forEach((rt) => {
      const list = data[rt.type] || [];
      let lastDate = null;
      let todayCount = 0, weekCount = 0, monthCount = 0;
      list.forEach((r) => {
        const p = r?.payload || {};
        const rd =
          p.reportDate ||
          p.header?.reportDate ||
          p.date ||
          r?.createdAt?.slice?.(0, 10) ||
          "";
        if (!rd) return;
        if (rd === todayIso) todayCount++;
        const ts = Date.parse(rd);
        if (!Number.isNaN(ts)) {
          if (ts >= weekStart)  weekCount++;
          if (ts >= monthStart) monthCount++;
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
  }, [data, todayIso, weekStart, monthStart, reportTypes]);

  const weekTotal  = useMemo(() => reportTypes.reduce((a, rt) => a + (stats[rt.type]?.week || 0), 0), [stats, reportTypes]);
  const monthTotal = useMemo(() => reportTypes.reduce((a, rt) => a + (stats[rt.type]?.month || 0), 0), [stats, reportTypes]);
  const totalAll   = useMemo(() => reportTypes.reduce((a, rt) => a + (stats[rt.type]?.total || 0), 0), [stats, reportTypes]);
  const todayDone  = useMemo(() => reportTypes.filter((rt) => (stats[rt.type]?.today || 0) > 0).length, [stats, reportTypes]);

  const dateLabel = useMemo(() => {
    try {
      return new Date().toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });
    } catch { return ""; }
  }, [isAr]);

  return (
    <div className="bdash-wrap" dir={isAr ? "rtl" : "ltr"}>
      <style>{STYLES}</style>

      {/* ── Hero ── */}
      <div className="bdash-hero" style={{ "--accent": accent }}>
        <div>
          <h1 className="bdash-title">
            📊 {t("title")}
            <span className="bdash-branch-pill">{isAr && branchNameAr ? branchNameAr : branchName}</span>
          </h1>
          <p className="bdash-subtitle">{t("subtitle")}</p>
          <div className="bdash-date">{dateLabel}</div>
        </div>
        <button
          className="bdash-refresh"
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={loading ? "bdash-spin" : ""}>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {t("refresh")}
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="bdash-kpis">
        <div className="bdash-kpi">
          <div className="bdash-kpi-label">✅ {t("today")}</div>
          <div className="bdash-kpi-value">{todayDone} / {reportTypes.length}</div>
          <div className="bdash-kpi-sub">
            {reportTypes.length > 0 && todayDone === reportTypes.length
              ? t("allComplete")
              : `${reportTypes.length - todayDone} ${t("pending")}`}
          </div>
        </div>
        <div className="bdash-kpi">
          <div className="bdash-kpi-label">📅 {t("week")}</div>
          <div className="bdash-kpi-value">{weekTotal}</div>
          <div className="bdash-kpi-sub">{t("reports")}</div>
        </div>
        <div className="bdash-kpi">
          <div className="bdash-kpi-label">🗓️ {t("month")}</div>
          <div className="bdash-kpi-value">{monthTotal}</div>
          <div className="bdash-kpi-sub">{t("reports")}</div>
        </div>
        <div className="bdash-kpi">
          <div className="bdash-kpi-label">📦 {t("total")}</div>
          <div className="bdash-kpi-value">{totalAll}</div>
          <div className="bdash-kpi-sub">{t("allTime")}</div>
        </div>
      </div>

      {/* ── Cards grid ── */}
      <div className="bdash-grid">
        {reportTypes.map((rt) => {
          const s = stats[rt.type] || { total: 0, today: 0, week: 0, month: 0, lastDate: null };
          const isToday = s.today > 0;
          const daysSince = s.lastDate ? diffDays(todayIso, s.lastDate) : null;
          const cardTitle = isAr && rt.titleAr ? rt.titleAr : (rt.titleEn || rt.title || rt.key);
          return (
            <div
              key={rt.type}
              className={`bdash-card ${isToday ? "bdash-card-ok" : s.lastDate ? "bdash-card-warn" : "bdash-card-empty"}`}
              style={{ "--card-accent": rt.accent || accent }}
            >
              <div className="bdash-card-header">
                <div className="bdash-card-icon" style={{ background: `${rt.accent || accent}20`, color: rt.accent || accent }}>
                  {rt.icon || "📄"}
                </div>
                <div className="bdash-card-title">{cardTitle}</div>
                {loading && <div className="bdash-card-loader" />}
              </div>

              <div className={`bdash-card-status ${isToday ? "bdash-status-ok" : s.lastDate ? "bdash-status-warn" : "bdash-status-empty"}`}>
                {isToday ? `✅ ${t("submitted")}` :
                 s.lastDate ? `⏰ ${t("notSubmitted")}` :
                 `— ${t("noData")}`}
              </div>

              <div className="bdash-card-metrics">
                <div>
                  <div className="bdash-card-metric-label">{t("week")}</div>
                  <div className="bdash-card-metric-value">{s.week}</div>
                </div>
                <div>
                  <div className="bdash-card-metric-label">{t("month")}</div>
                  <div className="bdash-card-metric-value">{s.month}</div>
                </div>
                <div>
                  <div className="bdash-card-metric-label">{t("total")}</div>
                  <div className="bdash-card-metric-value">{s.total}</div>
                </div>
              </div>

              <div className="bdash-card-footer">
                <div className="bdash-card-last">
                  <span className="bdash-card-last-label">{t("last")}:</span>
                  <span className="bdash-card-last-value">
                    {s.lastDate
                      ? `${s.lastDate}${daysSince !== null && daysSince > 0 ? ` (${daysSince}${t("daysAgo")})` : ""}`
                      : "—"}
                  </span>
                </div>
                <button
                  className="bdash-card-btn"
                  style={{ background: rt.accent || accent }}
                  onClick={() => switchToTab(rt.key)}
                >
                  {t("view")} →
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
  .bdash-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
    font-family: 'Inter', 'Tajawal', system-ui, sans-serif;
  }

  .bdash-hero {
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
  .bdash-hero::before {
    content: '';
    position: absolute;
    top: -50%; right: -10%;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%);
  }
  .bdash-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -.01em;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .bdash-branch-pill {
    display: inline-flex;
    align-items: center;
    padding: 3px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    background: var(--accent);
    color: #fff;
    letter-spacing: .02em;
  }
  .bdash-subtitle {
    margin: 4px 0 0;
    color: #cbd5e1;
    font-size: 13px;
  }
  .bdash-date {
    margin-top: 6px;
    display: inline-block;
    background: rgba(255,255,255,.1);
    padding: 4px 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid rgba(255,255,255,.15);
  }
  .bdash-refresh {
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
  .bdash-refresh:hover:not(:disabled) {
    background: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .bdash-refresh:disabled { opacity: .6; cursor: not-allowed; }
  .bdash-spin { animation: bdash-spin 1s linear infinite; }
  @keyframes bdash-spin { to { transform: rotate(360deg); } }

  .bdash-kpis {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
  }
  .bdash-kpi {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .bdash-kpi-label {
    font-size: 11px; font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .05em;
    margin-bottom: 6px;
  }
  .bdash-kpi-value {
    font-size: 28px; font-weight: 800;
    color: #0f172a;
    line-height: 1.1;
  }
  .bdash-kpi-sub {
    margin-top: 4px;
    font-size: 12px; color: #94a3b8;
    font-weight: 600;
  }

  .bdash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 14px;
  }
  .bdash-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid var(--card-accent);
    border-radius: 12px;
    padding: 14px 16px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform .15s ease, box-shadow .2s ease;
  }
  .bdash-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(15,23,42,.1);
  }
  .bdash-card-ok    { background: #f0fdf4; }
  .bdash-card-warn  { background: #fffbeb; }
  .bdash-card-empty { background: #f8fafc; }

  .bdash-card-header {
    display: flex; align-items: center; gap: 10px;
  }
  .bdash-card-icon {
    width: 40px; height: 40px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
  }
  .bdash-card-title {
    font-size: 14px; font-weight: 800;
    color: #0f172a;
    flex: 1;
  }
  .bdash-card-loader {
    width: 14px; height: 14px;
    border: 2px solid #e2e8f0;
    border-top-color: #0f172a;
    border-radius: 50%;
    animation: bdash-spin .8s linear infinite;
  }

  .bdash-card-status {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    text-align: center;
  }
  .bdash-status-ok    { background: #dcfce7; color: #166534; }
  .bdash-status-warn  { background: #fef3c7; color: #92400e; }
  .bdash-status-empty { background: #f1f5f9; color: #64748b; }

  .bdash-card-metrics {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 10px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
  }
  .bdash-card-metric-label {
    font-size: 10px; font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .04em;
  }
  .bdash-card-metric-value {
    margin-top: 2px;
    font-size: 18px; font-weight: 800;
    color: #0f172a;
  }

  .bdash-card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;
  }
  .bdash-card-last {
    font-size: 11px; line-height: 1.4;
  }
  .bdash-card-last-label {
    font-weight: 700;
    color: #64748b;
    display: block;
  }
  .bdash-card-last-value {
    font-weight: 700;
    color: #0f172a;
  }
  .bdash-card-btn {
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
  .bdash-card-btn:hover {
    transform: translateY(-1px);
    filter: brightness(1.05);
  }

  @media (max-width: 900px) {
    .bdash-wrap { padding: 14px; }
    .bdash-kpis { grid-template-columns: repeat(2, 1fr); }
    .bdash-hero { flex-direction: column; align-items: flex-start; }
  }
`;
