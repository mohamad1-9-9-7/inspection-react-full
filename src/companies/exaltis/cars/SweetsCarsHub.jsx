// src/pages/sweets-cars/SweetsCarsHub.jsx
// 🚚 Vehicles hub for the Confectionery company — the same design as the fleet
// hub (pages/car/CarsHub.jsx) but self-contained: its four pages are sweets
// copies (sweets-cars/pages, sweets_* report types) and they open INSIDE the
// hub instead of routing to the other company's /car/* screens. The loading
// and cleaning entry pages carry their bilingual fill-in guide.

import React, { Suspense, lazy, useState } from "react";
import ReportGuide from "../generic/ReportGuide";
import { guideFor } from "../monitor/branches/sweets/sweetsReportGuides";

const LoadingLog = lazy(() => import("./pages/LoadingLog"));
const Cleaning = lazy(() => import("./pages/Cleaning"));
const LoadingReports = lazy(() => import("./pages/LoadingReports"));
const CleaningReports = lazy(() => import("./pages/CleaningReports"));

const sections = [
  {
    id: "entry",
    title: { ar: "📥 إدخال البيانات", en: "📥 Data Entry" },
    subtitle: { ar: "نماذج التسجيل اليومية للسيارات", en: "Daily vehicle entry forms" },
    accent: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    cards: [
      {
        id: "loading",
        icon: "🕐",
        title: { ar: "فحص التحميل", en: "Loading Check" },
        subtitle: { ar: "حرارة السيارة ونظافتها وسلامة التحميل", en: "Truck temperature, hygiene & loading safety" },
        Page: LoadingLog,
        guide: "sweets_cars_loading_inspection",
        color: "#2563eb",
        bg: "linear-gradient(135deg,#dbeafe,#eff6ff)",
      },
      {
        id: "cleaning",
        icon: "🧼",
        title: { ar: "تنظيف السيارات", en: "Truck Cleaning" },
        subtitle: { ar: "سجل التنظيف اليومي للسيارات المبردة", en: "Daily cleaning log for refrigerated trucks" },
        Page: Cleaning,
        guide: "sweets_truck_daily_cleaning",
        color: "#0891b2",
        bg: "linear-gradient(135deg,#cffafe,#ecfeff)",
      },
    ],
  },
  {
    id: "reports",
    title: { ar: "📊 التقارير", en: "📊 Reports" },
    subtitle: { ar: "عرض وتصدير البيانات المُسجَّلة", en: "View and export recorded data" },
    accent: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    cards: [
      {
        id: "loading-reports",
        icon: "📄",
        title: { ar: "تقارير التحميل", en: "Loading Reports" },
        subtitle: { ar: "استعراض وتصدير تقارير التحميل", en: "Browse and export loading reports" },
        Page: LoadingReports,
        guide: "sweets_cars_loading_inspection",
        compact: true,
        color: "#7c3aed",
        bg: "linear-gradient(135deg,#e9d5ff,#faf5ff)",
      },
      {
        id: "cleaning-reports",
        icon: "🧾",
        title: { ar: "تقارير التنظيف", en: "Cleaning Reports" },
        subtitle: { ar: "استعراض وتصدير سجلات التنظيف", en: "Browse and export cleaning logs" },
        Page: CleaningReports,
        guide: "sweets_truck_daily_cleaning",
        compact: true,
        color: "#9333ea",
        bg: "linear-gradient(135deg,#f3e8ff,#faf5ff)",
      },
    ],
  },
];
const ALL_CARDS = sections.flatMap((sec) => sec.cards);

export default function SweetsCarsHub() {
  const [hover, setHover] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("sweets_cars_hub_lang") || "en"; } catch { return "en"; }
  });
  const dir = lang === "ar" ? "rtl" : "ltr";
  const pick = (d) => d[lang] || d.ar || d.en || "";
  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("sweets_cars_hub_lang", next); } catch { /* per-viewer only */ }
  };
  const langBtn = (
    <button type="button" onClick={toggleLang} style={s.langBtn} title="Toggle language">
      🌐 {lang === "ar" ? "EN" : "AR"}
    </button>
  );

  const open = ALL_CARDS.find((c) => c.id === openId) || null;
  if (open) {
    const { Page } = open;
    return (
      <div style={s.pageShell} dir={dir}>
        <div style={s.pageBar} className="scars-shell-header">
          <button
            type="button"
            onClick={() => setOpenId(null)}
            style={{ ...s.hubBack, background: `linear-gradient(135deg, ${open.color}, ${open.color}cc)`, boxShadow: `0 8px 18px ${open.color}33` }}
          >
            {dir === "rtl" ? "›" : "‹"} {pick({ ar: "للمركز", en: "Back to Hub" })}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.pageTitle}>{open.icon} {pick(open.title)}</div>
            <div style={s.pageSub}>{pick(open.subtitle)}</div>
          </div>
          {langBtn}
        </div>
        <ReportGuide id={open.guide} guide={guideFor(open.guide)} compact={!!open.compact} />
        <Suspense fallback={<div style={s.loading}>Loading…</div>}>
          <Page />
        </Suspense>
        <style>{"@media print { .scars-shell-header { display: none !important; } }"}</style>
      </div>
    );
  }

  return (
    <main style={s.shell} dir={dir}>
      <div style={s.aurora} aria-hidden="true" />

      <div style={s.layout}>
        <header style={s.header}>
          <div style={s.brand}>
            <div style={s.brandIcon}>🚚</div>
            <div>
              <div style={s.brandTop}>CONFECTIONERY</div>
              <div style={s.brandSub}>{pick({ ar: "إدارة السيارات", en: "Vehicle Management" })}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          {langBtn}
        </header>

        <section style={s.hero}>
          <h1 style={s.heroTitle}>{pick({ ar: "🚚 مركز السيارات", en: "🚚 Vehicles Hub" })}</h1>
          <p style={s.heroSub}>
            {pick({
              ar: "فحص التحميل وحرارة السيارات وتنظيفها اليومي — الإدخال والتقارير في مكان واحد",
              en: "Loading checks, truck temperature and daily cleaning — entry and reports in one place",
            })}
          </p>
        </section>

        {sections.map((sec) => (
          <section key={sec.id} style={s.section}>
            <div style={s.sectionHeader}>
              <div style={{ ...s.sectionTitlePill, background: sec.accent }}>{pick(sec.title)}</div>
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
                    onClick={() => setOpenId(c.id)}
                  >
                    <div style={s.cardIcon(c.color)}>{c.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.cardTitle(c.color)}>{pick(c.title)}</div>
                      <div style={s.cardSub}>{pick(c.subtitle)}</div>
                    </div>
                    <div style={s.cardArrow(c.color)}>{dir === "rtl" ? "‹" : "›"}</div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <footer style={s.footer}>
          {pick({ ar: "Confectionery — منظومة إدارة السيارات", en: "Confectionery — Vehicle Management" })}
        </footer>
      </div>
    </main>
  );
}

const s = {
  shell: {
    position: "relative",
    minHeight: "100%",
    padding: "0 0 60px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Apple Color Emoji", "Segoe UI Emoji"',
    color: "#0f172a",
    overflow: "hidden",
  },
  // absolute (not fixed) so the glow stays inside the company-app shell
  aurora: {
    position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
    background:
      "radial-gradient(40vmax 40vmax at 12% 18%, rgba(124,58,237,.20), transparent 60%)," +
      "radial-gradient(45vmax 35vmax at 85% 12%, rgba(37,99,235,.20), transparent 60%)," +
      "radial-gradient(40vmax 35vmax at 20% 90%, rgba(16,185,129,.20), transparent 60%)",
    filter: "saturate(1.05)",
  },
  layout: { position: "relative", zIndex: 1, maxWidth: 1180, margin: "0 auto", padding: "16px 18px 0" },
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
    fontWeight: 900, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
  },
  hero: { marginBottom: 26, textAlign: "center" },
  heroTitle: { fontSize: 28, fontWeight: 1000, margin: 0, letterSpacing: ".02em" },
  heroSub: { margin: "8px auto 0", maxWidth: 720, fontSize: 14, color: "#475569", fontWeight: 700, lineHeight: 1.65 },
  section: { marginBottom: 28 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  sectionTitlePill: {
    display: "inline-block", padding: "10px 18px", borderRadius: 12, color: "#fff",
    fontWeight: 1000, fontSize: 14, letterSpacing: ".02em", boxShadow: "0 8px 18px rgba(2,6,23,.18)",
  },
  sectionSub: { fontSize: 13, color: "#475569", fontWeight: 700 },
  cardsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 },
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
    boxShadow: hover ? `0 18px 36px ${color}40, 0 0 0 4px ${color}22` : "0 8px 18px rgba(2,6,23,.08)",
    color: "#0f172a",
    fontFamily: "inherit",
  }),
  cardIcon: (color) => ({
    width: 52, height: 52, borderRadius: 14, background: "#fff", color,
    display: "grid", placeItems: "center", fontSize: 26, flexShrink: 0,
    border: `2px solid ${color}33`, boxShadow: `0 8px 16px ${color}22`,
  }),
  cardTitle: (color) => ({ fontSize: 15, fontWeight: 1000, color, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }),
  cardSub: { fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 4, lineHeight: 1.5 },
  cardArrow: (color) => ({ fontSize: 24, color, fontWeight: 1000, marginInlineStart: 4 }),
  footer: {
    marginTop: 30, textAlign: "center", fontSize: 11, fontWeight: 800, color: "#64748b",
    padding: "12px 16px", borderTop: "1px dashed rgba(148,163,184,.45)",
  },

  /* page shell — same as CarsPageShell */
  pageShell: {
    minHeight: "100%",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
    paddingBottom: 20,
  },
  pageBar: {
    position: "sticky", top: 0, zIndex: 50,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(226,232,240,0.95)",
    padding: "10px 18px",
    display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    boxShadow: "0 6px 18px rgba(2,6,23,.06)",
  },
  hubBack: {
    border: "none", color: "#fff", borderRadius: 999, padding: "8px 16px",
    fontWeight: 1000, fontSize: 13, cursor: "pointer",
    display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit",
  },
  pageTitle: { fontWeight: 1000, fontSize: 16, color: "#0f172a", lineHeight: 1.2 },
  pageSub: { fontWeight: 800, fontSize: 11, color: "#64748b", marginTop: 2 },
  loading: { padding: 40, textAlign: "center", color: "#64748b", fontWeight: 800 },
};
