// src/pages/car/CarsHub.jsx
// 🚚 Fleet Management Hub — landing page that separates Data Entry from Reports.

import React from "react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    id: "entry",
    title: { ar: "📥 إدخال البيانات", en: "📥 Data Entry" },
    subtitle: { ar: "نماذج التسجيل اليومية للتشغيل", en: "Daily operational entry forms" },
    accent: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    cards: [
      {
        id: "loading",
        icon: "🕐",
        title: { ar: "أوقات التحميل", en: "Loading Time" },
        subtitle: { ar: "تسجيل أوقات تحميل الشاحنات يومياً", en: "Record daily truck loading times" },
        route: "/car/loading",
        color: "#2563eb",
        bg: "linear-gradient(135deg,#dbeafe,#eff6ff)",
      },
      {
        id: "cleaning",
        icon: "🧼",
        title: { ar: "تنظيف السيارات", en: "Truck Cleaning" },
        subtitle: { ar: "سجل التنظيف اليومي للسيارات المبردة", en: "Daily cleaning log for refrigerated trucks" },
        route: "/car/cleaning",
        color: "#0891b2",
        bg: "linear-gradient(135deg,#cffafe,#ecfeff)",
      },
      {
        id: "approvals-input",
        icon: "✅",
        title: { ar: "موافقات/تراخيص جديدة", en: "New Approvals / Permits" },
        subtitle: { ar: "تسجيل تراخيص جديدة للمركبات", en: "Register new vehicle permits" },
        route: "/car/approvals",
        color: "#16a34a",
        bg: "linear-gradient(135deg,#dcfce7,#f0fdf4)",
      },
    ],
  },
  {
    id: "reports",
    title: { ar: "📊 التقارير والتحليلات", en: "📊 Reports & Analytics" },
    subtitle: { ar: "عرض وتصدير البيانات المُسجَّلة", en: "View and export recorded data" },
    accent: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    cards: [
      {
        id: "loading-reports",
        icon: "📄",
        title: { ar: "تقارير أوقات التحميل", en: "Loading Reports" },
        subtitle: { ar: "استعراض وتصدير تقارير التحميل", en: "Browse and export loading reports" },
        route: "/car/loading-reports",
        color: "#7c3aed",
        bg: "linear-gradient(135deg,#e9d5ff,#faf5ff)",
      },
      {
        id: "cleaning-reports",
        icon: "🧾",
        title: { ar: "تقارير التنظيف", en: "Cleaning Reports" },
        subtitle: { ar: "استعراض وتصدير سجلات التنظيف", en: "Browse and export cleaning logs" },
        route: "/car/cleaning-reports",
        color: "#9333ea",
        bg: "linear-gradient(135deg,#f3e8ff,#faf5ff)",
      },
      {
        id: "approvals-view",
        icon: "📋",
        title: { ar: "استعراض الموافقات", en: "Approvals Browser" },
        subtitle: { ar: "كل التراخيص + تنبيهات الانتهاء", en: "All permits + expiry alerts" },
        route: "/car/approvals-view",
        color: "#0e7490",
        bg: "linear-gradient(135deg,#cffafe,#f0fdfa)",
      },
      {
        id: "fleet-kpi",
        icon: "📈",
        title: { ar: "لوحة مؤشرات الأسطول", en: "Fleet KPI Dashboard" },
        subtitle: { ar: "نظرة عامة على الأداء والتراخيص والتنظيف", en: "Overview of performance, permits, cleaning" },
        route: "/car/fleet-kpi",
        color: "#dc2626",
        bg: "linear-gradient(135deg,#fee2e2,#fef2f2)",
        badge: { ar: "جديد", en: "NEW" },
      },
    ],
  },
];

export default function CarsHub() {
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(null);
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem("cars_hub_lang") || "en"; } catch { return "en"; }
  });
  const dir = lang === "ar" ? "rtl" : "ltr";
  const pick = (d) => d[lang] || d.ar || d.en || "";
  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("cars_hub_lang", next); } catch {}
  };

  return (
    <main style={s.shell} dir={dir}>
      {/* Aurora background */}
      <div style={s.aurora} aria-hidden="true" />

      <div style={s.layout}>
        {/* Top bar */}
        <header style={s.header}>
          <div style={s.brand}>
            <div style={s.brandIcon}>🚚</div>
            <div>
              <div style={s.brandTop}>AL MAWASHI</div>
              <div style={s.brandSub}>{pick({ ar: "إدارة الأسطول", en: "Fleet Management" })}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={toggleLang} style={s.langBtn} title="Toggle language">
            🌐 {lang === "ar" ? "EN" : "AR"}
          </button>
          <button type="button" onClick={() => window.history.back()} style={s.backBtn}>
            ← {pick({ ar: "رجوع", en: "Back" })}
          </button>
        </header>

        {/* Hero title */}
        <section style={s.hero}>
          <h1 style={s.heroTitle}>{pick({ ar: "🚚 مركز إدارة الأسطول", en: "🚚 Fleet Management Hub" })}</h1>
          <p style={s.heroSub}>
            {pick({
              ar: "نقطة الوصول الموحّدة لكل أنشطة السيارات والشاحنات — إدخال البيانات، استعراض التقارير، ومتابعة مؤشرات الأداء",
              en: "Unified access point for all vehicle activities — data entry, reporting, and performance tracking",
            })}
          </p>
        </section>

        {/* Sections */}
        {sections.map((sec) => (
          <section key={sec.id} style={s.section}>
            <div style={s.sectionHeader}>
              <div style={{ ...s.sectionTitlePill, background: sec.accent }}>
                {pick(sec.title)}
              </div>
              <div style={s.sectionSub}>{pick(sec.subtitle)}</div>
            </div>

            <div style={s.cardsGrid}>
              {sec.cards.map((c) => {
                const isHover = hover === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    style={s.card(isHover, c.color, c.bg, dir)}
                    onMouseEnter={() => setHover(c.id)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(c.id)}
                    onBlur={() => setHover(null)}
                    onClick={() => navigate(c.route)}
                  >
                    <div style={s.cardIcon(c.color)}>{c.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.cardTitle(c.color)}>
                        {pick(c.title)}
                        {c.badge && <span style={s.badgeNew}>{pick(c.badge)}</span>}
                      </div>
                      <div style={s.cardSub}>{pick(c.subtitle)}</div>
                    </div>
                    <div style={s.cardArrow(c.color, dir)}>{dir === "rtl" ? "‹" : "›"}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <footer style={s.footer}>
          {pick({
            ar: "© Al Mawashi — منظومة إدارة الأسطول · مدعومة بـ React + REST API",
            en: "© Al Mawashi — Fleet Management System · Powered by React + REST API",
          })}
        </footer>
      </div>
    </main>
  );
}

const s = {
  shell: {
    position: "relative",
    minHeight: "100vh",
    padding: "0 0 60px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji"',
    color: "#0f172a",
    overflowX: "hidden",
  },
  aurora: {
    position: "fixed", inset: "-20vmax", zIndex: 0, pointerEvents: "none",
    background:
      "radial-gradient(40vmax 40vmax at 12% 18%, rgba(124,58,237,.20), transparent 60%)," +
      "radial-gradient(45vmax 35vmax at 85% 12%, rgba(37,99,235,.20), transparent 60%)," +
      "radial-gradient(40vmax 35vmax at 20% 90%, rgba(16,185,129,.20), transparent 60%)",
    filter: "saturate(1.05)",
  },
  layout: {
    position: "relative", zIndex: 1,
    maxWidth: 1180, margin: "0 auto",
    padding: "16px 18px 0",
  },
  header: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(226,232,240,0.95)",
    borderRadius: 18,
    boxShadow: "0 14px 36px rgba(2,6,23,.10)",
    backdropFilter: "blur(10px)",
    marginBottom: 22,
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff", display: "grid", placeItems: "center",
    fontSize: 22, boxShadow: "0 12px 24px rgba(37,99,235,.30)",
  },
  brandTop: { fontWeight: 1000, letterSpacing: ".8px", fontSize: 14, lineHeight: 1.1 },
  brandSub: { fontWeight: 800, fontSize: 11, color: "#64748b", marginTop: 2 },
  langBtn: {
    padding: "8px 14px", borderRadius: 999,
    background: "linear-gradient(135deg, #e0e7ff, #f0f9ff)",
    color: "#3730a3", border: "1px solid #c7d2fe",
    fontWeight: 900, fontSize: 12, cursor: "pointer",
  },
  backBtn: {
    padding: "8px 14px", borderRadius: 999,
    background: "linear-gradient(180deg, #fff, #f8fafc)",
    color: "#0f172a", border: "1px solid rgba(148,163,184,.55)",
    fontWeight: 900, fontSize: 12, cursor: "pointer",
  },
  hero: { marginBottom: 26, textAlign: "center" },
  heroTitle: { fontSize: 28, fontWeight: 1000, margin: 0, letterSpacing: ".02em" },
  heroSub: {
    margin: "8px auto 0", maxWidth: 720,
    fontSize: 14, color: "#475569", fontWeight: 700, lineHeight: 1.65,
  },
  section: { marginBottom: 28 },
  sectionHeader: {
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    marginBottom: 12,
  },
  sectionTitlePill: {
    display: "inline-block",
    padding: "10px 18px",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 1000,
    fontSize: 14,
    letterSpacing: ".02em",
    boxShadow: "0 8px 18px rgba(2,6,23,.18)",
  },
  sectionSub: {
    fontSize: 13, color: "#475569", fontWeight: 700,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },
  card: (hover, color, bg, dir) => ({
    display: "flex", alignItems: "center", gap: 14,
    padding: "16px 18px",
    background: bg,
    border: `1.5px solid ${hover ? color : "rgba(226,232,240,0.95)"}`,
    borderRadius: 18,
    cursor: "pointer",
    textAlign: dir === "rtl" ? "right" : "left",
    transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
    transform: hover ? "translateY(-3px)" : "translateY(0)",
    boxShadow: hover
      ? `0 18px 36px ${color}40, 0 0 0 4px ${color}22`
      : "0 8px 18px rgba(2,6,23,.08)",
    color: "#0f172a",
    fontFamily: "inherit",
  }),
  cardIcon: (color) => ({
    width: 52, height: 52, borderRadius: 14,
    background: "#fff",
    color,
    display: "grid", placeItems: "center",
    fontSize: 26, flexShrink: 0,
    border: `2px solid ${color}33`,
    boxShadow: `0 8px 16px ${color}22`,
  }),
  cardTitle: (color) => ({
    fontSize: 15, fontWeight: 1000, color,
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
  }),
  cardSub: { fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 4, lineHeight: 1.5 },
  cardArrow: (color, dir) => ({
    fontSize: 24, color, fontWeight: 1000,
    transform: dir === "rtl" ? "" : "",
    marginInlineStart: 4,
  }),
  badgeNew: {
    fontSize: 9, fontWeight: 1000, letterSpacing: ".08em",
    padding: "2px 8px", borderRadius: 999,
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    color: "#fff", textTransform: "uppercase",
    boxShadow: "0 4px 8px rgba(220,38,38,.30)",
  },
  footer: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 11, fontWeight: 800,
    color: "#64748b",
    padding: "12px 16px",
    borderTop: "1px dashed rgba(148,163,184,.45)",
  },
};
