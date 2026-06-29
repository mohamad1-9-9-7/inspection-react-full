// src/pages/settings/tools/AppearanceAndLanguage.jsx
// 🌐 Language preferences — central control for the entire app.

import React, { useState } from "react";
import { Button, ConfirmModal, PageHeader, StatusMessage, ui } from "../_shared/SettingsUIKit";
// ThemeCard removed — app now uses a fixed light theme only.

// All language-related localStorage keys used across the app
const LANG_KEYS = [
  { key: "settings_lang",             label: "Settings & Billing" },
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
  const [statuses, setStatuses] = useState(() => {
    const out = {};
    for (const { key } of LANG_KEYS) {
      try { out[key] = localStorage.getItem(key) || ""; } catch { out[key] = ""; }
    }
    return out;
  });

  const [msg, setMsg] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  function applyLangAll(lang) {
    const out = {};
    for (const { key } of LANG_KEYS) {
      try {
        localStorage.setItem(key, lang);
        out[key] = lang;
      } catch {}
    }
    setStatuses(out);
    flash(`✅ Set language to "${lang}" everywhere. Refresh pages to see the change.`);
    setConfirmAction(null);
  }

  function setLangAll(lang) {
    setConfirmAction({
      title: `Set all modules to ${lang.toUpperCase()}?`,
      body: `This updates ${LANG_KEYS.length} saved language preferences. Re-open affected modules to see the change.`,
      confirmText: `Set ${lang.toUpperCase()}`,
      tone: "primary",
      onConfirm: () => applyLangAll(lang),
    });
  }

  function applyResetAllLang() {
    const out = {};
    for (const { key } of LANG_KEYS) {
      try { localStorage.removeItem(key); out[key] = ""; } catch {}
    }
    setStatuses(out);
    flash("✅ All language preferences cleared.");
    setConfirmAction(null);
  }

  function resetAllLang() {
    setConfirmAction({
      title: "Clear all language preferences?",
      body: "The app will fall back to its built-in defaults, usually English, until each module is set again.",
      confirmText: "Clear all",
      tone: "danger",
      onConfirm: applyResetAllLang,
    });
  }

  function setOneLang(key, lang) {
    try {
      if (!lang) localStorage.removeItem(key);
      else localStorage.setItem(key, lang);
      setStatuses((s) => ({ ...s, [key]: lang }));
    } catch {}
  }

  return (
    <div style={ui.page}>
      <PageHeader
        eyebrow="Preferences"
        title="Language"
        subtitle="Control the saved language preference for each major module in the app."
      />

      <StatusMessage message={msg ? { kind: msg.startsWith("❌") ? "err" : "ok", text: msg } : null} />

      {/* LANGUAGE — global */}
      <section style={ui.card}>
        <div style={s.sectionHead}>🌐 Language — apply to all modules</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button type="button" onClick={() => setLangAll("en")} tone="secondary">
            🇬🇧 Set all to English
          </Button>
          <Button type="button" onClick={() => setLangAll("ar")} tone="warning">
            🇸🇦 العربية للجميع
          </Button>
          <Button type="button" onClick={resetAllLang} tone="danger">
            🗑️ Clear all (use defaults)
          </Button>
        </div>
      </section>

      {/* LANGUAGE — per module */}
      <section style={ui.card}>
        <div style={s.sectionHead}>🔧 Per-module language</div>
        <div style={ui.tableWrap}>
          <table style={ui.table}>
            <thead>
              <tr>
                <th style={ui.th}>Module</th>
                <th style={ui.th}>Storage key</th>
                <th style={ui.th}>Current</th>
                <th style={ui.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {LANG_KEYS.map(({ key, label }) => {
                const val = statuses[key] || "";
                return (
                  <tr key={key}>
                    <td style={ui.td}><strong>{label}</strong></td>
                    <td style={{ ...ui.td, fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>{key}</td>
                    <td style={ui.td}>
                      {val === "en" && <span style={s.badge("#1e40af", "#dbeafe")}>🇬🇧 EN</span>}
                      {val === "ar" && <span style={s.badge("#7c2d12", "#fed7aa")}>🇸🇦 AR</span>}
                      {!val && <span style={s.badge("#475569", "#f1f5f9")}>default</span>}
                    </td>
                    <td style={ui.td}>
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
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.title}
        body={confirmAction?.body}
        confirmText={confirmAction?.confirmText}
        cancelText="Cancel"
        tone={confirmAction?.tone}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

const s = {
  sectionHead: { fontSize: 14, fontWeight: 1000, color: "#0f172a", marginBottom: 12 },
  note: { fontSize: 11, color: "#64748b", marginTop: 10, lineHeight: 1.5, fontWeight: 700 },
  badge: (color, bg) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 999, background: bg, color, fontWeight: 1000, fontSize: 11 }),
  pillBtn: { padding: "4px 10px", borderRadius: 999, background: "#0b1220", color: "#fff", border: "none", fontWeight: 1000, fontSize: 11, cursor: "pointer" },
  pillBtnGhost: { padding: "4px 10px", borderRadius: 999, background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", fontWeight: 1000, fontSize: 11, cursor: "pointer" },
};
