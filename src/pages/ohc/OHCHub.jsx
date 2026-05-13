// src/pages/ohc/OHCHub.jsx
// 🩺 OHC Hub — landing page that separates Upload (entry) from View (reports).

import React from "react";
import { useNavigate } from "react-router-dom";

const cards = [
  {
    id: "upload",
    icon: "📥",
    title: { ar: "إدخال / رفع شهادة جديدة", en: "Upload New Certificate" },
    subtitle: {
      ar: "تسجيل بطاقات صحية جديدة للموظفين + رفع الملفات والصور",
      en: "Register new Occupational Health Cards + upload files & images",
    },
    route: "/ohc/upload",
    color: "#2563eb",
    bg: "linear-gradient(135deg,#dbeafe,#eff6ff)",
  },
  {
    id: "view",
    icon: "📋",
    title: { ar: "عرض / استعراض الشهادات", en: "View / Browse Certificates" },
    subtitle: {
      ar: "استعراض كل البطاقات الصحية + تنبيهات الانتهاء + تصدير وطباعة",
      en: "Browse all OHC records + expiry alerts + export and print",
    },
    route: "/ohc/view",
    color: "#7c3aed",
    bg: "linear-gradient(135deg,#e9d5ff,#faf5ff)",
  },
];

export default function OHCHub() {
  const navigate = useNavigate();
  const [hover, setHover] = React.useState(null);
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem("ohc_hub_lang") || "en"; } catch { return "en"; }
  });
  const dir = lang === "ar" ? "rtl" : "ltr";
  const pick = (d) => d[lang] || d.ar || d.en || "";
  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("ohc_hub_lang", next); } catch {}
  };

  return (
    <main style={s.shell} dir={dir}>
      <div style={s.aurora} aria-hidden="true" />

      <div style={s.layout}>
        {/* Header */}
        <header style={s.header}>
          <div style={s.brand}>
            <div style={s.brandIco}>🩺</div>
            <div>
              <div style={s.brandTop}>AL MAWASHI</div>
              <div style={s.brandSub}>
                {pick({ ar: "البطاقات الصحية للعاملين (OHC)", en: "Occupational Health Cards" })}
              </div>
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

        {/* Hero */}
        <section style={s.hero}>
          <h1 style={s.heroTitle}>
            🩺 {pick({ ar: "مركز البطاقات الصحية", en: "OHC Management Hub" })}
          </h1>
          <p style={s.heroSub}>
            {pick({
              ar: "اختر العملية المطلوبة — إدخال بطاقة جديدة أو استعراض السجل الكامل مع التنبيهات",
              en: "Choose your action — register a new card or browse all records with expiry alerts",
            })}
          </p>
        </section>

        {/* Two big cards side-by-side */}
        <section style={s.cardsGrid}>
          {cards.map((c) => {
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
                  <div style={s.cardTitle(c.color)}>{pick(c.title)}</div>
                  <div style={s.cardSub}>{pick(c.subtitle)}</div>
                </div>
                <div style={s.cardArrow(c.color)}>{dir === "rtl" ? "‹" : "›"}</div>
              </button>
            );
          })}
        </section>

        <footer style={s.footer}>
          {pick({
            ar: "© Al Mawashi — قسم الصحة المهنية · يدير شهادات OHC للموظفين",
            en: "© Al Mawashi — Occupational Health · Manages OHC certificates",
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
    paddingBottom: 60,
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    color: "#0f172a",
    overflowX: "hidden",
  },
  aurora: {
    position: "fixed", inset: "-20vmax", zIndex: 0, pointerEvents: "none",
    background:
      "radial-gradient(40vmax 40vmax at 12% 18%, rgba(37,99,235,.18), transparent 60%)," +
      "radial-gradient(45vmax 35vmax at 85% 12%, rgba(124,58,237,.18), transparent 60%)," +
      "radial-gradient(40vmax 35vmax at 50% 90%, rgba(16,185,129,.14), transparent 60%)",
    filter: "saturate(1.05)",
  },
  layout: {
    position: "relative", zIndex: 1,
    maxWidth: 1100, margin: "0 auto",
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
  brandIco: {
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
  hero: { marginBottom: 30, textAlign: "center" },
  heroTitle: { fontSize: 28, fontWeight: 1000, margin: 0, letterSpacing: ".02em" },
  heroSub: {
    margin: "10px auto 0", maxWidth: 640,
    fontSize: 14, color: "#475569", fontWeight: 700, lineHeight: 1.65,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 18,
    marginBottom: 22,
  },
  card: (hover, color, bg, dir) => ({
    display: "flex", alignItems: "center", gap: 18,
    padding: "22px 24px",
    background: bg,
    border: `2px solid ${hover ? color : "rgba(226,232,240,0.95)"}`,
    borderRadius: 22,
    cursor: "pointer",
    textAlign: dir === "rtl" ? "right" : "left",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
    transform: hover ? "translateY(-4px)" : "translateY(0)",
    boxShadow: hover
      ? `0 24px 48px ${color}40, 0 0 0 5px ${color}22`
      : "0 12px 28px rgba(2,6,23,.10)",
    color: "#0f172a",
    fontFamily: "inherit",
    minHeight: 130,
  }),
  cardIcon: (color) => ({
    width: 68, height: 68, borderRadius: 18,
    background: "#fff",
    color,
    display: "grid", placeItems: "center",
    fontSize: 34, flexShrink: 0,
    border: `2px solid ${color}33`,
    boxShadow: `0 10px 20px ${color}22`,
  }),
  cardTitle: (color) => ({
    fontSize: 18, fontWeight: 1000, color,
    marginBottom: 6,
  }),
  cardSub: { fontSize: 13, color: "#475569", fontWeight: 700, lineHeight: 1.6 },
  cardArrow: (color) => ({
    fontSize: 36, color, fontWeight: 1000,
    marginInlineStart: 4,
  }),
  footer: {
    marginTop: 30,
    textAlign: "center",
    fontSize: 11, fontWeight: 800,
    color: "#64748b",
    padding: "12px 16px",
    borderTop: "1px dashed rgba(148,163,184,.45)",
  },
};
