// src/pages/settings/SecurityControlsTab.jsx
// Security & Access Controls — manages appSecuritySettings in localStorage

import React, { useState } from "react";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";

const STORAGE_KEY = "appSecuritySettings";

export const SEC_DEFAULTS = {
  allowDeleteRecords:    false,  // show 🗑 Delete in QCS reports
  requireDeleteConfirm:  true,   // double-confirm before delete
  readOnlyMode:          false,  // disable all create/edit forms app-wide
  adminOnlySettings:     true,   // only isAdmin users can open Settings
  sessionTimeoutHours:   8,      // hours before auto-logout
  lockScreenMinutes:     0,      // 0 = disabled; else idle minutes before lock
};

export function getSecuritySettings() {
  try {
    return { ...SEC_DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
  } catch {
    return { ...SEC_DEFAULTS };
  }
}

function saveSecuritySettings(settings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

/* ── small helpers ── */
const Row = ({ icon, title, desc, children }) => (
  <div style={rs.row}>
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
      <span style={rs.icon}>{icon}</span>
      <div>
        <div style={rs.title}>{title}</div>
        <div style={rs.desc}>{desc}</div>
      </div>
    </div>
    <div style={{ flexShrink: 0 }}>{children}</div>
  </div>
);

const Toggle = ({ checked, onChange, danger }) => (
  <button
    onClick={onChange}
    style={{
      width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
      background: checked ? (danger ? "#dc2626" : "#0284c7") : "#cbd5e1",
      position: "relative", transition: "background .2s",
      boxShadow: checked ? `0 0 0 3px ${danger ? "rgba(220,38,38,.2)" : "rgba(2,132,199,.2)"}` : "none",
    }}
    title={checked ? "ON — click to disable" : "OFF — click to enable"}>
    <span style={{
      position: "absolute", top: 3, left: checked ? 25 : 3,
      width: 20, height: 20, borderRadius: "50%",
      background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)",
      transition: "left .2s",
    }} />
  </button>
);

const GroupLabel = ({ label }) => (
  <div style={rs.groupLabel}>{label}</div>
);

export default function SecurityControlsTab() {
  const { t, dir, lang, toggle: toggleLang } = useSettingsLang();
  const [s, setS]   = useState(getSecuritySettings);
  const [saved, setSaved] = useState(false);

  const toggle = (key) => { setS(p => ({ ...p, [key]: !p[key] })); setSaved(false); };
  const pick   = (key, val) => { setS(p => ({ ...p, [key]: val })); setSaved(false); };

  const handleSave = () => {
    saveSecuritySettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    if (!window.confirm(t("secResetConfirm"))) return;
    setS({ ...SEC_DEFAULTS });
    saveSecuritySettings({ ...SEC_DEFAULTS });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={rs.wrap} dir={dir}>

      {/* language toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <LangToggle lang={lang} toggle={toggleLang}
          style={{ background: "#0b1220", border: "1px solid #1e293b" }} />
      </div>

      {/* ── Record Management ── */}
      <GroupLabel label={t("secGrpRecords")} />

      <Row
        icon="🗑️"
        title={t("secAllowDelete")}
        desc={t("secAllowDeleteD")}
      >
        <Toggle checked={s.allowDeleteRecords} onChange={() => toggle("allowDeleteRecords")} danger />
      </Row>

      <Row
        icon="⚠️"
        title={t("secReqConfirm")}
        desc={t("secReqConfirmD")}
      >
        <Toggle checked={s.requireDeleteConfirm} onChange={() => toggle("requireDeleteConfirm")} />
      </Row>

      {/* ── Access Control ── */}
      <GroupLabel label={t("secGrpAccess")} />

      <Row
        icon="📖"
        title={t("secReadOnly")}
        desc={t("secReadOnlyD")}
      >
        <Toggle checked={s.readOnlyMode} onChange={() => toggle("readOnlyMode")} danger />
      </Row>

      <Row
        icon="👑"
        title={t("secAdminOnly")}
        desc={t("secAdminOnlyD")}
      >
        <Toggle checked={s.adminOnlySettings} onChange={() => toggle("adminOnlySettings")} />
      </Row>

      {/* ── Session ── */}
      <GroupLabel label={t("secGrpSession")} />

      <Row
        icon="🕐"
        title={t("secTimeout")}
        desc={t("secTimeoutD")}
      >
        <select
          value={s.sessionTimeoutHours}
          onChange={e => pick("sessionTimeoutHours", Number(e.target.value))}
          style={rs.select}
        >
          {[1, 2, 4, 8, 12, 24].map(h => (
            <option key={h} value={h}>{h}h</option>
          ))}
        </select>
      </Row>

      <Row
        icon="🔒"
        title={t("secLockIdle")}
        desc={t("secLockIdleD")}
      >
        <select
          value={s.lockScreenMinutes}
          onChange={e => pick("lockScreenMinutes", Number(e.target.value))}
          style={rs.select}
        >
          {[0, 5, 10, 15, 30, 60].map(m => (
            <option key={m} value={m}>{m === 0 ? t("secDisabled") : `${m} ${t("secMin")}`}</option>
          ))}
        </select>
      </Row>

      {/* ── Current State Summary ── */}
      <div style={rs.summary}>
        <div style={rs.summaryTitle}>{t("secCurrentState")}</div>
        <div style={rs.chips}>
          {s.allowDeleteRecords  && <Chip color="#fef2f2" border="#fca5a5" text="#b91c1c" label={t("secDeleteEnabled")} />}
          {!s.allowDeleteRecords && <Chip color="#f0fdf4" border="#86efac" text="#15803d" label={t("secDeleteLocked")} />}
          {s.readOnlyMode        && <Chip color="#fef3c7" border="#fcd34d" text="#92400e" label={t("secReadOnlyOn")} />}
          {s.adminOnlySettings   && <Chip color="#f5f3ff" border="#c4b5fd" text="#6d28d9" label={t("secAdminOnlyChip")} />}
          <Chip color="#f0f9ff" border="#7dd3fc" text="#0369a1" label={`${t("secTimeoutChip")}: ${s.sessionTimeoutHours}h`} />
          {s.lockScreenMinutes > 0 && (
            <Chip color="#fff7ed" border="#fed7aa" text="#9a3412" label={`${t("secLockChip")}: ${s.lockScreenMinutes}m`} />
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={rs.actions}>
        <button onClick={handleReset} style={rs.btnReset}>↺ {t("secResetDefaults")}</button>
        <button onClick={handleSave}  style={{ ...rs.btnSave, background: saved ? "#15803d" : "#0284c7" }}>
          {saved ? `✅ ${t("secSaved")}` : `💾 ${t("secSave")}`}
        </button>
      </div>

    </div>
  );
}

const Chip = ({ color, border, text, label }) => (
  <span style={{
    background: color, border: `1.5px solid ${border}`, color: text,
    fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 10px",
  }}>{label}</span>
);

const rs = {
  wrap: { display: "flex", flexDirection: "column", gap: 0 },
  groupLabel: {
    fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.08em",
    textTransform: "uppercase", padding: "20px 0 8px", borderBottom: "1px solid #e2e8f0",
    marginBottom: 4,
  },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 16, padding: "14px 0", borderBottom: "1px solid #f1f5f9",
  },
  icon: { fontSize: 20, flexShrink: 0, marginTop: 1 },
  title: { fontWeight: 700, fontSize: 14, color: "#1e293b" },
  desc:  { fontSize: 12, color: "#64748b", marginTop: 2, maxWidth: 440, lineHeight: 1.5 },
  select: {
    padding: "5px 10px", borderRadius: 8, border: "1.5px solid #cbd5e1",
    fontSize: 13, fontWeight: 700, color: "#1e293b", background: "#f8fafc",
    cursor: "pointer",
  },
  summary: {
    marginTop: 20, padding: 16, borderRadius: 12,
    background: "#f8fafc", border: "1px solid #e2e8f0",
  },
  summaryTitle: { fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 10 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6 },
  actions: {
    display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20,
    paddingTop: 16, borderTop: "1px solid #e2e8f0",
  },
  btnSave: {
    padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
    color: "#fff", fontWeight: 700, fontSize: 14, transition: "background .2s",
  },
  btnReset: {
    padding: "10px 20px", borderRadius: 10, border: "1.5px solid #cbd5e1",
    background: "#fff", cursor: "pointer", color: "#475569", fontWeight: 700, fontSize: 14,
  },
};
