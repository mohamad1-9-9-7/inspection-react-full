// src/pages/inventory/InventoryHub.jsx
//
// 📦 المخزون — كرت واحد بالداشبورد بيجمع وحدتين:
//   الجزار (تقطيع وأوزان)  ·  التصنيع (قوائم المواد وأوامر التصنيع)
// Inventory hub: one dashboard tile that holds the Butcher and Manufacturing modules.

import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";

/** الوحدات داخل المخزون — الظهور يتبع صلاحية القسم نفسه. */
const MODULES = [
  {
    id: "butcher",
    to: "/butcher",
    icon: "🔪",
    ar: "الجزار",
    en: "Butcher",
    arSub: "أوزان التقطيع ونسب التصافي والماستر ليست",
    enSub: "Cut weights, yield and the product master list",
    grad: "linear-gradient(135deg,#dc2626,#991b1b)",
  },
  {
    id: "mrp",
    to: "/mrp",
    icon: "🏭",
    ar: "التصنيع",
    en: "Manufacturing",
    arSub: "قوائم المواد وأوامر التصنيع وتحليل التكاليف",
    enSub: "Bills of materials, work orders and cost analytics",
    grad: "linear-gradient(135deg,#0f766e,#115e59)",
  },
];

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

const CSS = `
#root .inv, #root .inv * { font-size: 17px !important; }
#root .inv-title { font-size: 32px !important; }
#root .inv-sub   { font-size: 15px !important; }
#root .inv-name  { font-size: 23px !important; }
#root .inv-card { transition: transform .16s ease, box-shadow .16s ease; }
#root .inv-card:hover { transform: translateY(-4px); box-shadow: 0 22px 44px rgba(15,39,64,.14); }
@media (max-width: 820px) {
  #root .inv, #root .inv * { font-size: 15px !important; }
  #root .inv-title { font-size: 25px !important; }
  #root .inv-name  { font-size: 20px !important; }
}
`;

export default function InventoryHub() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();

  const user = currentUser();
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  const full = perms.includes("*") || perms.length === 0 || !!user.isAdmin;
  const modules = MODULES.filter((m) => full || perms.includes(m.id));

  return (
    <div dir={dir} className="inv" style={S.page}>
      <style>{CSS}</style>

      <div style={S.wrap}>
        <header style={S.header}>
          <div style={S.headStart}>
            <span style={S.headIcon}>📦</span>
            <div style={{ minWidth: 0 }}>
              <div className="inv-title" style={S.title}>
                {t({ en: "Inventory", ar: "المخزون" })}
              </div>
              <div className="inv-sub" style={S.sub}>
                {t({
                  en: "Cutting, manufacturing and everything that moves stock",
                  ar: "التقطيع والتصنيع وكل ما يحرّك المخزون",
                })}
              </div>
            </div>
          </div>
          <div style={S.headBtns}>
            <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            <button type="button" style={S.btn} onClick={() => navigate("/named-dashboard")}>
              {t({ en: "Home", ar: "الرئيسية" })}
            </button>
          </div>
        </header>

        <div style={S.grid}>
          {modules.map((m) => (
            <button
              key={m.id}
              type="button"
              className="inv-card"
              style={S.card}
              onClick={() => navigate(m.to)}
            >
              <div style={S.cardTop}>
                <span style={{ ...S.icon, background: m.grad }}>{m.icon}</span>
                <span style={S.tag}>{t({ en: "Module", ar: "وحدة" })}</span>
              </div>

              <div>
                <div className="inv-name" style={S.name}>{isAr ? m.ar : m.en}</div>
                <div className="inv-sub" style={S.cardSub}>{isAr ? m.arSub : m.enSub}</div>
              </div>

              <div style={S.cardFoot}>
                <span>{t({ en: "Open module", ar: "فتح الوحدة" })}</span>
                <span aria-hidden="true">{isAr ? "←" : "→"}</span>
              </div>
            </button>
          ))}
        </div>

        {modules.length === 0 && (
          <div style={S.empty}>
            {t({
              en: "You do not have access to any inventory module.",
              ar: "لا توجد صلاحية لأي وحدة داخل المخزون.",
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
    padding: "24px clamp(14px, 3vw, 30px) 48px", overflowX: "hidden",
  },
  wrap: { maxWidth: 1100, margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 14, marginBottom: 24,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 20,
    padding: "16px 18px", boxShadow: "0 10px 26px rgba(15,39,64,.05)",
  },
  headStart: { display: "flex", alignItems: "center", gap: 14, minWidth: 0 },
  headIcon: {
    width: 56, height: 56, borderRadius: 18, flexShrink: 0,
    display: "grid", placeItems: "center", fontSize: 28,
    background: "linear-gradient(135deg,#1f6fd0,#14507f)", color: "#fff",
    boxShadow: "0 10px 24px rgba(31,111,208,.3)",
  },
  title: { fontWeight: 900, letterSpacing: "-0.01em", lineHeight: 1.2 },
  sub: { color: "#6b8299", fontWeight: 700, marginTop: 3 },
  headBtns: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },
  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "11px 20px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },

  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))", gap: 18,
  },
  card: {
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 22,
    padding: "22px 20px", display: "flex", flexDirection: "column", gap: 18,
    cursor: "pointer", fontFamily: FONT, color: "#0f2740", textAlign: "start",
    boxShadow: "0 12px 30px rgba(15,39,64,.06)", minHeight: 210,
  },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  icon: {
    width: 66, height: 66, borderRadius: 20, display: "grid", placeItems: "center",
    fontSize: 30, color: "#fff",
  },
  tag: {
    background: "#eef4fb", color: "#6b8299", borderRadius: 999,
    padding: "5px 14px", fontWeight: 900, letterSpacing: ".04em",
  },
  name: { fontWeight: 900, lineHeight: 1.25 },
  cardSub: { color: "#8aa3b8", fontWeight: 700, marginTop: 5, lineHeight: 1.6 },
  cardFoot: {
    marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, color: "#1f6fd0", fontWeight: 900,
    borderTop: "1px solid #eef4fb", paddingTop: 14,
  },
  empty: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 26, textAlign: "center", fontWeight: 800, color: "#6b8299",
  },
};
