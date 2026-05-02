// src/pages/haccp and iso/MockRecall/MockRecallSettings.jsx
// إعدادات Mock Recall: حد نسبة الاسترجاع وحد المدّة

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLang, LangToggle } from "./i18n";
import { useMockRecallConfig, saveConfig, DEFAULT_CONFIG } from "./useMockRecallConfig";

export default function MockRecallSettings() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useLang();
  const { config, loading, reload } = useMockRecallConfig();

  const [pct, setPct] = useState(DEFAULT_CONFIG.passPctThreshold);
  const [dur, setDur] = useState(DEFAULT_CONFIG.maxDurationMinutes);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  // مزامنة مع الإعدادات المحمّلة
  useEffect(() => {
    setPct(Number(config.passPctThreshold) || DEFAULT_CONFIG.passPctThreshold);
    setDur(Number(config.maxDurationMinutes) || DEFAULT_CONFIG.maxDurationMinutes);
  }, [config]);

  async function handleSave() {
    setSaving(true);
    setMsg({ kind: "", text: "" });
    try {
      await saveConfig({
        passPctThreshold: Math.max(1, Math.min(100, Number(pct))),
        maxDurationMinutes: Math.max(1, Math.min(1440, Number(dur))),
      });
      setMsg({ kind: "ok", text: t("settingsSaved") });
      await reload();
    } catch (e) {
      setMsg({ kind: "err", text: `${t("settingsSaveFailed")}: ${e?.message || e}` });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg({ kind: "", text: "" }), 4000);
    }
  }

  function resetDefaults() {
    setPct(DEFAULT_CONFIG.passPctThreshold);
    setDur(DEFAULT_CONFIG.maxDurationMinutes);
  }

  const hours = Math.floor(dur / 60);
  const mins = dur % 60;

  return (
    <div style={{ ...S.shell, direction: dir }}>
      <div style={S.frame}>
        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate(-1)} style={S.backBtn}>
            {t("back")}
          </button>
          <LangToggle lang={lang} toggle={toggle} />
        </div>

        {/* Header */}
        <div style={S.header}>
          <h1 style={S.title}>{t("settingsTitle")}</h1>
          <div style={S.subtitle}>{t("settingsSubtitle")}</div>
        </div>

        {/* Form */}
        <div style={S.card}>
          {loading && (
            <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 10 }}>
              {t("loading")}
            </div>
          )}

          {/* Pass % */}
          <div style={S.field}>
            <label style={S.label}>{t("minTracePct")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={50}
                max={100}
                step={1}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#0f766e" }}
              />
              <input
                type="number"
                min={1}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                style={{ ...S.input, width: 90, textAlign: "center", fontWeight: 800 }}
              />
              <span style={{ fontWeight: 800, color: "#0f766e", minWidth: 24 }}>%</span>
            </div>
            <div style={S.hint}>{t("minTracePctHint")}</div>
          </div>

          {/* Duration */}
          <div style={S.field}>
            <label style={S.label}>{t("maxDurationMin")}</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={30}
                max={720}
                step={15}
                value={dur}
                onChange={(e) => setDur(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#0891b2" }}
              />
              <input
                type="number"
                min={1}
                max={1440}
                value={dur}
                onChange={(e) => setDur(Number(e.target.value))}
                style={{ ...S.input, width: 90, textAlign: "center", fontWeight: 800 }}
              />
              <span style={{ fontWeight: 800, color: "#0891b2", minWidth: 70 }}>
                = {hours}h {mins ? `${mins}m` : ""}
              </span>
            </div>
            <div style={S.hint}>{t("maxDurationMinHint")}</div>
          </div>

          {/* Live preview */}
          <div style={S.preview}>
            <div style={{ fontWeight: 800, color: "#0b1f4d", marginBottom: 6 }}>
              {lang === "ar" ? "📋 ملخّص العتبات الجديدة:" : "📋 New thresholds summary:"}
            </div>
            <div style={{ color: "#0b1f4d", fontSize: "0.95rem", lineHeight: 1.7 }}>
              {lang === "ar"
                ? <>التمرين ينجح فقط إذا تتبّعت <b style={{ color: "#0f766e" }}>{pct}%</b> أو أكثر من الكمية، خلال <b style={{ color: "#0891b2" }}>{hours}h {mins ? `${mins}m` : ""}</b> أو أقل.</>
                : <>Drill PASSES only if <b style={{ color: "#0f766e" }}>{pct}%</b> or more is traced within <b style={{ color: "#0891b2" }}>{hours}h {mins ? `${mins}m` : ""}</b> or less.</>}
            </div>
          </div>

          {/* Standards note */}
          <div style={S.warning}>
            ℹ️ {t("notesAboutStandards")}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button type="button" onClick={resetDefaults} style={S.btnLight}>
              {t("resetDefaults")}
            </button>
            <button type="button" onClick={handleSave} disabled={saving}
              style={{ ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? t("saving") : t("saveSettings")}
            </button>
          </div>

          {/* Message */}
          {msg.text && (
            <div style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 10,
              fontWeight: 700,
              background: msg.kind === "ok" ? "#ecfdf5" : "#fef2f2",
              color: msg.kind === "ok" ? "#065f46" : "#991b1b",
              border: `1px solid ${msg.kind === "ok" ? "#86efac" : "#fca5a5"}`,
            }}>
              {msg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#ecfdf5)",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  frame: {
    maxWidth: 800,
    margin: "0 auto",
  },
  header: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
    padding: "20px 22px",
    borderRadius: 14,
    marginBottom: 14,
    boxShadow: "0 6px 18px rgba(30,58,95,0.20)",
  },
  title: { margin: 0, fontSize: "1.5rem", fontWeight: 900 },
  subtitle: { marginTop: 6, opacity: 0.9, fontSize: "0.95rem" },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 24,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  },
  field: {
    marginBottom: 22,
    paddingBottom: 16,
    borderBottom: "1px dashed #e5e7eb",
  },
  label: {
    display: "block",
    fontWeight: 800,
    color: "#0b1f4d",
    fontSize: "1rem",
    marginBottom: 10,
  },
  hint: {
    color: "#64748b",
    fontSize: "0.85rem",
    marginTop: 6,
    fontWeight: 600,
  },
  input: {
    padding: "8px 12px",
    border: "1.5px solid #d1d5db",
    borderRadius: 8,
    fontSize: "1rem",
    background: "#fff",
  },
  preview: {
    background: "linear-gradient(135deg,#f0fdf4,#ecfeff)",
    border: "1.5px solid #86efac",
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginBottom: 12,
  },
  warning: {
    background: "linear-gradient(135deg,#fef9c3,#fffbeb)",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: 12,
    color: "#78350f",
    fontWeight: 600,
    fontSize: "0.88rem",
    lineHeight: 1.6,
  },
  btnPrimary: {
    background: "linear-gradient(180deg,#10b981,#059669)",
    color: "#fff",
    border: "none",
    padding: "10px 20px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.95rem",
  },
  btnLight: {
    background: "#f1f5f9",
    color: "#0b1f4d",
    border: "1px solid #cbd5e1",
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.92rem",
  },
  backBtn: {
    background: "#fff",
    color: "#0b1f4d",
    border: "1.5px solid #cbd5e1",
    padding: "8px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.9rem",
  },
};
