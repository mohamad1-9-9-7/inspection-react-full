// src/pages/settings/tools/AppearanceAndLanguage.jsx
// 🎨 Theme + 🌐 Language preferences — central control for the entire app.

import React, { useState } from "react";

// All language-related localStorage keys used across the app
const LANG_KEYS = [
  { key: "hse_lang",                  label: "HSE module" },
  { key: "haccp_modules_lang_v1",     label: "HACCP / ISO" },
  { key: "ccp_lang_v1",               label: "CCP Monitoring" },
  { key: "fsms_lang_v1",              label: "FSMS Manual" },
  { key: "mr_lang_v1",                label: "Mock Recall" },
  { key: "prd_lang",                  label: "Production branches" },
  { key: "cars_hub_lang",             label: "Cars / Fleet" },
  { key: "fleet_kpi_lang",            label: "Fleet KPI Dashboard" },
  { key: "ohc_hub_lang",              label: "OHC" },
  { key: "qcs_results_lang",          label: "Supplier Evaluation Results" },
  { key: "qcs_public_lang",           label: "Supplier Public Form" },
  { key: "qcs_supplier_lang",         label: "Supplier Approval" },
];

export default function AppearanceAndLanguage() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "light"; } catch { return "light"; }
  });

  const [statuses, setStatuses] = useState(() => {
    const out = {};
    for (const { key } of LANG_KEYS) {
      try { out[key] = localStorage.getItem(key) || ""; } catch { out[key] = ""; }
    }
    return out;
  });

  const [msg, setMsg] = useState("");
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  function applyTheme(t) {
    setTheme(t);
    try {
      localStorage.setItem("theme", t);
      document.documentElement.setAttribute("data-theme", t);
    } catch {}
    flash(`✅ Theme set to ${t}`);
  }

  function setLangAll(lang) {
    if (!window.confirm(`Set language to "${lang}" across ALL modules (${LANG_KEYS.length} apps)?`)) return;
    const out = {};
    for (const { key } of LANG_KEYS) {
      try {
        localStorage.setItem(key, lang);
        out[key] = lang;
      } catch {}
    }
    setStatuses(out);
    flash(`✅ Set language to "${lang}" everywhere. Refresh pages to see the change.`);
  }

  function resetAllLang() {
    if (!window.confirm("Clear ALL saved language preferences? The app will fall back to its built-in defaults (English).")) return;
    const out = {};
    for (const { key } of LANG_KEYS) {
      try { localStorage.removeItem(key); out[key] = ""; } catch {}
    }
    setStatuses(out);
    flash("✅ All language preferences cleared.");
  }

  function setOneLang(key, lang) {
    try {
      if (!lang) localStorage.removeItem(key);
      else localStorage.setItem(key, lang);
      setStatuses((s) => ({ ...s, [key]: lang }));
    } catch {}
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>🎨 Appearance & 🌐 Language</h2>
          <p style={s.intro}>
            Control the visual theme and the language used by each module of the app.
          </p>
        </div>
      </div>

      {msg && (
        <div style={{
          ...s.msgBox,
          background: msg.startsWith("❌") ? "#fee2e2" : "#dcfce7",
          color: msg.startsWith("❌") ? "#7f1d1d" : "#166534",
        }}>{msg}</div>
      )}

      {/* THEME */}
      <section style={s.section}>
        <div style={s.sectionHead}>🎨 Theme</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ThemeCard active={theme === "light"} onClick={() => applyTheme("light")}
            label="Light" emoji="☀️" gradient="linear-gradient(135deg,#fff,#f1f5f9)" />
          <ThemeCard active={theme === "dark"} onClick={() => applyTheme("dark")}
            label="Dark" emoji="🌙" gradient="linear-gradient(135deg,#0b1220,#1e293b)" />
          <ThemeCard active={theme === "auto"} onClick={() => applyTheme("auto")}
            label="Auto (System)" emoji="🌓" gradient="linear-gradient(135deg,#0b1220 50%,#fff 50%)" />
        </div>
        <p style={s.note}>
          Theme switching requires CSS variables. Some pages have their own hard-coded colors and
          won't follow this setting.
        </p>
      </section>

      {/* LANGUAGE — global */}
      <section style={s.section}>
        <div style={s.sectionHead}>🌐 Language — apply to all modules</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => setLangAll("en")} style={s.btnLang("#0f172a", "linear-gradient(135deg,#dbeafe,#eff6ff)")}>
            🇬🇧 Set all to English
          </button>
          <button type="button" onClick={() => setLangAll("ar")} style={s.btnLang("#7c2d12", "linear-gradient(135deg,#fed7aa,#fff7ed)")}>
            🇸🇦 العربية للجميع
          </button>
          <button type="button" onClick={resetAllLang} style={s.btnDanger}>
            🗑️ Clear all (use defaults)
          </button>
        </div>
      </section>

      {/* LANGUAGE — per module */}
      <section style={s.section}>
        <div style={s.sectionHead}>🔧 Per-module language</div>
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Module</th>
                <th style={s.th}>Storage key</th>
                <th style={s.th}>Current</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {LANG_KEYS.map(({ key, label }) => {
                const val = statuses[key] || "";
                return (
                  <tr key={key}>
                    <td style={s.td}><strong>{label}</strong></td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{key}</td>
                    <td style={s.td}>
                      {val === "en" && <span style={s.badge("#1e40af", "#dbeafe")}>🇬🇧 EN</span>}
                      {val === "ar" && <span style={s.badge("#7c2d12", "#fed7aa")}>🇸🇦 AR</span>}
                      {!val && <span style={s.badge("#475569", "#f1f5f9")}>default</span>}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button type="button" onClick={() => setOneLang(key, "en")} style={s.pillBtn}>EN</button>
                        <button type="button" onClick={() => setOneLang(key, "ar")} style={s.pillBtn}>AR</button>
                        <button type="button" onClick={() => setOneLang(key, "")} style={s.pillBtnGhost}>×</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={s.note}>
          Changes take effect when you re-open the affected module (or refresh).
        </p>
      </section>
    </div>
  );
}

function ThemeCard({ active, onClick, label, emoji, gradient }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, minWidth: 160, padding: "18px 16px",
        background: gradient,
        border: `2px solid ${active ? "#2563eb" : "#e2e8f0"}`,
        borderRadius: 14, cursor: "pointer",
        textAlign: "center", fontFamily: "inherit",
        boxShadow: active ? "0 12px 26px rgba(37,99,235,.25)" : "0 4px 10px rgba(2,6,23,.05)",
        transition: "all .15s",
        color: gradient.includes("#0b1220") ? "#fff" : "#0f172a",
      }}
    >
      <div style={{ fontSize: 32, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontWeight: 1000, fontSize: 13 }}>{label}</div>
      {active && <div style={{ fontSize: 10, color: "#2563eb", marginTop: 4, fontWeight: 900 }}>✓ active</div>}
    </button>
  );
}

const s = {
  header: { marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: 1000, color: "#0f172a", margin: 0 },
  intro: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4, lineHeight: 1.6 },
  section: {
    marginBottom: 22, padding: 18,
    background: "#fff", borderRadius: 14,
    border: "1px solid #e2e8f0", boxShadow: "0 8px 18px rgba(2,6,23,.06)",
  },
  sectionHead: { fontSize: 14, fontWeight: 1000, color: "#0f172a", marginBottom: 12 },
  note: { fontSize: 11, color: "#64748b", marginTop: 10, lineHeight: 1.5, fontWeight: 700 },
  btnLang: (color, bg) => ({
    padding: "10px 18px", borderRadius: 12,
    background: bg, color, border: "1px solid rgba(2,6,23,.10)",
    fontWeight: 1000, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  }),
  btnDanger: {
    padding: "10px 16px", borderRadius: 12,
    background: "linear-gradient(135deg,#fee2e2,#fef2f2)",
    color: "#991b1b", border: "1px solid #fecaca",
    fontWeight: 1000, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  msgBox: {
    padding: "10px 14px", borderRadius: 10, marginBottom: 14,
    fontWeight: 800, fontSize: 13,
  },
  tableWrap: { overflow: "auto", borderRadius: 10, border: "1px solid #e2e8f0" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: { background: "#0b1220", color: "#fff", padding: "9px 12px", textAlign: "left", fontWeight: 1000, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" },
  td: { padding: "8px 12px", borderTop: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a", fontWeight: 700 },
  badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: bg, color, fontWeight: 1000, fontSize: 11 }),
  pillBtn: { padding: "4px 10px", borderRadius: 999, background: "#0b1220", color: "#fff", border: "none", fontWeight: 1000, fontSize: 11, cursor: "pointer" },
  pillBtnGhost: { padding: "4px 10px", borderRadius: 999, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontWeight: 1000, fontSize: 11, cursor: "pointer" },
};
