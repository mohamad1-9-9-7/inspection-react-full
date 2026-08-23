// src/pages/finished/FinishedProductHub.jsx
//
// 🏷️ المنتج النهائي — كرت الداشبورد صار يفتح كرتين بدل ما يفوت مباشرة على الإدخال:
//   📝 إدخال تقرير      → /finished-product-entry     (صلاحية write)
//   📋 التقارير المحفوظة → /finished-product-reports   (صلاحية view)
// Final Product hub: two cards — data entry and saved reports — each gated by its
// own CRUD op on the "finalProduct" section, plus the per-page restriction list
// (allowedBranches.finalProduct) configured in Settings ▸ Accounts.

import React from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { can } from "../../utils/perms";
import { isItemAllowed } from "../../utils/sectionItems";

const SECTION = "finalProduct";

const MODULES = [
  {
    id: "finalProduct.entry",
    op: "write",
    to: "/finished-product-entry",
    icon: "📝",
    ar: "إدخال تقرير",
    en: "Report Entry",
    arSub: "تسجيل منتجات اليوم النهائية بالأوزان وتواريخ الإنتاج والصلاحية",
    enSub: "Record the day's finished products with weights and production dates",
    grad: "linear-gradient(135deg,#ec4899,#be185d)",
  },
  {
    id: "finalProduct.reports",
    op: "view",
    to: "/finished-product-reports",
    icon: "📋",
    ar: "التقارير المحفوظة",
    en: "Saved Reports",
    arSub: "تصفّح التقارير المحفوظة على السيرفر وتصديرها إلى Excel",
    enSub: "Browse the reports saved on the server and export them to Excel",
    grad: "linear-gradient(135deg,#4f46e5,#3730a3)",
  },
];

const CSS = `
#root .fph, #root .fph * { font-size: 17px !important; }
#root .fph-title { font-size: 32px !important; }
#root .fph-sub   { font-size: 15px !important; }
#root .fph-name  { font-size: 23px !important; }
#root .fph-card { transition: transform .16s ease, box-shadow .16s ease; }
#root .fph-card:hover { transform: translateY(-4px); box-shadow: 0 22px 44px rgba(15,39,64,.14); }
@media (max-width: 820px) {
  #root .fph, #root .fph * { font-size: 15px !important; }
  #root .fph-title { font-size: 25px !important; }
  #root .fph-name  { font-size: 20px !important; }
}
`;

export default function FinishedProductHub() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();

  const modules = MODULES.filter(
    (m) => can(SECTION, m.op) && isItemAllowed(SECTION, m.id)
  );

  return (
    <div dir={dir} className="fph" style={S.page}>
      <style>{CSS}</style>

      <div style={S.wrap}>
        <header style={S.header}>
          <div style={S.headStart}>
            <span style={S.headIcon}>🏷️</span>
            <div style={{ minWidth: 0 }}>
              <div className="fph-title" style={S.title}>
                {t({ en: "Final Product", ar: "المنتج النهائي" })}
              </div>
              <div className="fph-sub" style={S.sub}>
                {t({
                  en: "Enter a new finished-products report, or browse the saved ones",
                  ar: "إدخال تقرير منتجات نهائية جديد، أو تصفّح التقارير المحفوظة",
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
              className="fph-card"
              style={S.card}
              onClick={() => navigate(m.to)}
            >
              <div style={S.cardTop}>
                <span style={{ ...S.icon, background: m.grad }}>{m.icon}</span>
                <span style={S.tag}>
                  {m.op === "write"
                    ? t({ en: "Entry", ar: "إدخال" })
                    : t({ en: "Reports", ar: "تقارير" })}
                </span>
              </div>

              <div>
                <div className="fph-name" style={S.name}>{isAr ? m.ar : m.en}</div>
                <div className="fph-sub" style={S.cardSub}>{isAr ? m.arSub : m.enSub}</div>
              </div>

              <div style={S.cardFoot}>
                <span>
                  {m.op === "write"
                    ? t({ en: "Open the form", ar: "فتح النموذج" })
                    : t({ en: "Browse reports", ar: "تصفّح التقارير" })}
                </span>
                <span aria-hidden="true">{isAr ? "←" : "→"}</span>
              </div>
            </button>
          ))}
        </div>

        {modules.length === 0 && (
          <div style={S.empty}>
            {t({
              en: "You do not have access to any Final Product page.",
              ar: "لا توجد صلاحية لأي صفحة داخل المنتج النهائي.",
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
    background: "linear-gradient(135deg,#ec4899,#be185d)", color: "#fff",
    boxShadow: "0 10px 24px rgba(236,72,153,.3)",
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
    gap: 10, color: "#be185d", fontWeight: 900,
    borderTop: "1px solid #eef4fb", paddingTop: 14,
  },
  empty: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 26, textAlign: "center", fontWeight: 800, color: "#6b8299",
  },
};
