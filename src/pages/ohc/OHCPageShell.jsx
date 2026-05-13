// src/pages/ohc/OHCPageShell.jsx
// Sticky header with "Back to Hub" + language toggle, used by Upload/View pages.

import React from "react";

export default function OHCPageShell({ title, subtitle, accent = "#2563eb", onBack, children }) {
  const [lang, setLang] = React.useState(() => {
    try { return localStorage.getItem("ohc_hub_lang") || "en"; } catch { return "en"; }
  });
  const dir = lang === "ar" ? "rtl" : "ltr";
  const pick = (d) => (typeof d === "string" ? d : d?.[lang] || d?.ar || d?.en || "");
  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("ohc_hub_lang", next); } catch {}
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      fontFamily: 'Cairo, ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
    }} dir={dir}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(226,232,240,0.95)",
        padding: "10px 18px",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        boxShadow: "0 6px 18px rgba(2,6,23,.06)",
      }} className="ohc-shell-header">
        <button
          type="button"
          onClick={onBack}
          style={{
            border: "none",
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            color: "#fff",
            borderRadius: 999,
            padding: "8px 16px",
            fontWeight: 1000, fontSize: 13, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 6,
            boxShadow: `0 8px 18px ${accent}33`,
            fontFamily: "inherit",
          }}
        >
          {dir === "rtl" ? "›" : "‹"} {pick({ ar: "للمركز", en: "Back to Hub" })}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <div style={{ fontWeight: 1000, fontSize: 16, color: "#0f172a", lineHeight: 1.2 }}>
              {pick(title)}
            </div>
          )}
          {subtitle && (
            <div style={{ fontWeight: 800, fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {pick(subtitle)}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleLang}
          style={{
            padding: "7px 14px", borderRadius: 999,
            background: "linear-gradient(135deg, #e0e7ff, #f0f9ff)",
            color: "#3730a3", border: "1px solid #c7d2fe",
            fontWeight: 900, fontSize: 12, cursor: "pointer",
            fontFamily: "inherit",
          }}
          title="Toggle language"
        >🌐 {lang === "ar" ? "EN" : "AR"}</button>
      </div>

      <div>{children}</div>

      <style>{`
        @media print {
          .ohc-shell-header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
