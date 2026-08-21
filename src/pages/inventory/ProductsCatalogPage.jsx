// src/pages/inventory/ProductsCatalogPage.jsx
//
// 📦 كتالوج المنتجات — نفس أداة الإعدادات، بس بمدخل تاني من المخزون.
// Standalone route for the Products Catalog tool. It renders the very same
// <ProductsTab /> used by Settings ▸ Data Tools — one component, two doors.
// صفحة عادية مفتوحة: بتظهر لكل من بيوصل للمخزون بلا صلاحية خاصة.

import React from "react";
import { useNavigate } from "react-router-dom";
import ProductsTab from "../settings/ProductsTab";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";

export default function ProductsCatalogPage() {
  const navigate = useNavigate();
  const { t, dir, lang, toggle } = useSettingsLang();

  return (
    <div dir={dir} style={S.page}>
      <div style={S.wrap}>
        <header style={S.bar}>
          <div style={S.barStart}>
            <span style={S.icon}>📦</span>
            <div style={{ minWidth: 0 }}>
              <div style={S.title}>{t({ en: "Products Catalog", ar: "كتالوج المنتجات" })}</div>
              <div style={S.sub}>
                {t({
                  en: "Same tool as Settings ▸ Data Tools — edits here show up everywhere.",
                  ar: "نفس الأداة اللي بالإعدادات ← أدوات البيانات — أي تعديل هون بيبيّن بكل مكان.",
                })}
              </div>
            </div>
          </div>
          <div style={S.barEnd}>
            <LangToggle lang={lang} toggle={toggle} style={S.btn} />
            <button type="button" style={S.btn} onClick={() => navigate("/inventory")}>
              {t({ en: "Inventory", ar: "المخزون" })}
            </button>
            <button type="button" style={S.btn} onClick={() => navigate("/named-dashboard")}>
              {t({ en: "Home", ar: "الرئيسية" })}
            </button>
          </div>
        </header>

        <div style={S.card}>
          {/* ⚠️ الأداة نفسها إنجليزي — مشتركة حرفياً مع صفحة الإعدادات */}
          <ProductsTab />
        </div>
      </div>
    </div>
  );
}

const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Cairo, sans-serif';

const S = {
  page: { minHeight: "100vh", background: "#f2f7fc", fontFamily: FONT, color: "#0f2740", padding: "18px 14px 40px" },
  wrap: { maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 },
  bar: {
    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 18,
    padding: "14px 16px", boxShadow: "0 12px 30px rgba(15,39,64,.07)",
  },
  barStart: { display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 320px" },
  barEnd: { display: "flex", gap: 8, flexWrap: "wrap", marginInlineStart: "auto" },
  icon: {
    width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center",
    fontSize: 24, background: "linear-gradient(135deg,#14b8a6,#0d9488)", flexShrink: 0,
  },
  title: { fontWeight: 1000, fontSize: 24, lineHeight: 1.25 },
  sub: { color: "#6b8299", fontWeight: 700, fontSize: 14, lineHeight: 1.6 },
  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#0f2740", borderRadius: 11,
    padding: "9px 15px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  card: {
    background: "#fff", border: "1px solid #e3edf7", borderRadius: 18,
    padding: "18px 16px", boxShadow: "0 12px 30px rgba(15,39,64,.07)",
  },
};
