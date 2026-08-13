// src/pages/butcher/ButcherHub.jsx
//
// قسم الجزار — كرتين فقط: تسجيل الأوزان / عرض التقارير (EN/AR).
// Butcher module hub — entry + reports.

import React from "react";
import { useNavigate } from "react-router-dom";
import { canOpenButcherPage } from "./ButcherAccess";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";

const CSS = `
#root .bh, #root .bh * { font-size: 18px !important; }
#root .bh-title { font-size: 30px !important; }
#root .bh-sub   { font-size: 14px !important; }
#root .bh-name  { font-size: 24px !important; }
#root .bh-icon  { font-size: 40px !important; }
@media (max-width: 820px) {
  #root .bh, #root .bh * { font-size: 16px !important; }
  #root .bh-title { font-size: 24px !important; }
  #root .bh-name  { font-size: 20px !important; }
  #root .bh-icon  { font-size: 34px !important; }
}
`;

const CARDS = [
  {
    id: "butcher.entry",
    to: "/butcher/log",
    icon: "🔪",
    ar: "تسجيل الأوزان",
    en: "Record Cut Weights",
    grad: "linear-gradient(135deg,#dc2626,#991b1b)",
  },
  {
    id: "butcher.view",
    to: "/butcher/view",
    icon: "📋",
    ar: "عرض التقارير",
    en: "Butcher Reports",
    grad: "linear-gradient(135deg,#1f6fd0,#1e40af)",
  },
  {
    id: "butcher.summary",
    to: "/butcher/summary",
    icon: "🗓️",
    ar: "التقرير الشامل",
    en: "Full Summary Report",
    grad: "linear-gradient(135deg,#0f766e,#115e59)",
  },
  {
    id: "butcher.settings",
    to: "/butcher/settings",
    icon: "⚙️",
    ar: "الإعدادات",
    en: "Settings",
    grad: "linear-gradient(135deg,#475569,#334155)",
  },
];

export default function ButcherHub() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  // نفس حارس الصفحات — حتى لا يظهر كرت يفتح على "لا صلاحية"
  const cards = CARDS.filter((c) => canOpenButcherPage(c.id));

  return (
    <div dir={dir} className="bh" style={S.page}>
      <style>{CSS}</style>
      <div style={S.wrap}>
        <div style={S.header}>
          <div>
            <div className="bh-title" style={S.title}>
              🔪 {t({ en: "Butcher", ar: "الجزار" })}
            </div>
            <div className="bh-sub" style={S.sub}>
              {t({ en: "Cut weights & yield", ar: "أوزان التقطيع ونسب التصافي" })}
            </div>
          </div>
          <div style={S.headerBtns}>
            <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            <button type="button" style={S.back} onClick={() => navigate("/named-dashboard")}>
              {t({ en: "Home", ar: "الرئيسية" })}
            </button>
          </div>
        </div>

        <div style={S.grid}>
          {cards.map((c) => (
            <button key={c.id} type="button" style={S.card} onClick={() => navigate(c.to)}>
              <div className="bh-icon" style={{ ...S.icon, background: c.grad }}>{c.icon}</div>
              <div className="bh-name" style={S.name}>{isAr ? c.ar : c.en}</div>
              <div className="bh-sub" style={S.sub}>{isAr ? c.en : c.ar}</div>
            </button>
          ))}
        </div>

        {cards.length === 0 && (
          <div style={S.empty}>
            {t({
              en: "You do not have access to any page in this section.",
              ar: "لا توجد صلاحية لأي صفحة في هذا القسم.",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "22px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: 760, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 22 },
  title: { fontWeight: 900 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  headerBtns: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },
  back: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "9px 16px", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 16 },
  card: {
    background: "#fff", border: "2px solid #dbe6f2", borderRadius: 20,
    padding: "28px 16px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, cursor: "pointer", fontFamily: FONT, color: "#0f2740",
  },
  icon: {
    width: 84, height: 84, borderRadius: 24, display: "grid", placeItems: "center",
    color: "#fff", marginBottom: 6,
  },
  name: { fontWeight: 900 },
  empty: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: 24, textAlign: "center", fontWeight: 700, color: "#6b8299",
  },
};
