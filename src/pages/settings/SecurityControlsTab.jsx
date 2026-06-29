// src/pages/settings/SecurityControlsTab.jsx
// Security & Access Controls — manages appSecuritySettings in localStorage

import React, { useState, useMemo } from "react";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";
import { BRANCHES, BRANCH_TYPE_META } from "../../config/branches";
import { Button, ConfirmModal } from "./_shared/SettingsUIKit";

const STORAGE_KEY = "appSecuritySettings";

export const SEC_DEFAULTS = {
  allowDeleteRecords:    false,  // master switch + default for branches w/o override
  deleteBranchOverrides: {},     // { [branchId]: true|false } — per-branch override
  requireDeleteConfirm:  true,   // double-confirm before delete
  readOnlyMode:          false,  // disable all create/edit forms app-wide
  adminOnlySettings:     true,   // only isAdmin users can open Settings
  sessionTimeoutHours:   8,      // hours before auto-logout
  lockScreenMinutes:     0,      // 0 = disabled; else idle minutes before lock
};

export function getSecuritySettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      ...SEC_DEFAULTS,
      ...parsed,
      deleteBranchOverrides: { ...(parsed.deleteBranchOverrides || {}) },
    };
  } catch {
    return { ...SEC_DEFAULTS, deleteBranchOverrides: {} };
  }
}

/**
 * Is the 🗑 Delete button allowed for a given branch?
 * Per-branch override wins; otherwise falls back to the master switch.
 * Pass no branchId (or null) to get the master/global decision.
 */
export function isDeleteAllowedForBranch(branchId) {
  const s = getSecuritySettings();
  const ov = s.deleteBranchOverrides || {};
  if (branchId != null && Object.prototype.hasOwnProperty.call(ov, branchId)) {
    return ov[branchId] === true;
  }
  return s.allowDeleteRecords === true;
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
  const [branchOpen, setBranchOpen] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const toggle = (key) => { setS(p => ({ ...p, [key]: !p[key] })); setSaved(false); };
  const pick   = (key, val) => { setS(p => ({ ...p, [key]: val })); setSaved(false); };

  /* ── per-branch delete override helpers ── */
  // state per branch: "inherit" | "show" | "hide"
  const branchState = (id) => {
    const ov = s.deleteBranchOverrides || {};
    if (!Object.prototype.hasOwnProperty.call(ov, id)) return "inherit";
    return ov[id] === true ? "show" : "hide";
  };
  const effectiveAllowed = (id) => {
    const st = branchState(id);
    if (st === "show") return true;
    if (st === "hide") return false;
    return s.allowDeleteRecords === true;
  };
  const setBranchState = (id, next) => {
    setS(p => {
      const ov = { ...(p.deleteBranchOverrides || {}) };
      if (next === "inherit") delete ov[id];
      else ov[id] = (next === "show");
      return { ...p, deleteBranchOverrides: ov };
    });
    setSaved(false);
  };
  const bulkBranch = (next) => {
    setS(p => {
      if (next === "inherit") return { ...p, deleteBranchOverrides: {} };
      const ov = {};
      BRANCHES.forEach(b => { ov[b.id] = (next === "show"); });
      return { ...p, deleteBranchOverrides: ov };
    });
    setSaved(false);
  };

  const filteredBranches = useMemo(() => {
    const q = branchQuery.trim().toLowerCase();
    if (!q) return BRANCHES;
    return BRANCHES.filter(b =>
      b.id.toLowerCase().includes(q) || b.label.toLowerCase().includes(q));
  }, [branchQuery]);

  const overrideCount = Object.keys(s.deleteBranchOverrides || {}).length;

  const handleSave = () => {
    saveSecuritySettings(s);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setConfirmReset(true);
  };

  const doReset = () => {
    setS({ ...SEC_DEFAULTS });
    saveSecuritySettings({ ...SEC_DEFAULTS });
    setConfirmReset(false);
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

      {/* ── Per-branch delete customization ── */}
      <div style={{ borderBottom: "1px solid #f1f5f9" }}>
        <div style={rs.row}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
            <span style={rs.icon}>🏢</span>
            <div>
              <div style={rs.title}>{t("secBranchDelete")}</div>
              <div style={rs.desc}>{t("secBranchDeleteD")}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {overrideCount > 0 && (
              <span style={rs.ovBadge}>{overrideCount} {t("secBranchOverrides")}</span>
            )}
            <button onClick={() => setBranchOpen(o => !o)} style={rs.expandBtn}>
              {branchOpen ? `▲ ${t("secBranchHide")}` : `▼ ${t("secBranchCustomize")}`}
            </button>
          </div>
        </div>

        {branchOpen && (
          <div style={rs.branchPanel}>
            {/* toolbar: search + bulk */}
            <div style={rs.branchToolbar}>
              <input
                value={branchQuery}
                onChange={e => setBranchQuery(e.target.value)}
                placeholder={t("secBranchSearch")}
                style={rs.branchSearch}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => bulkBranch("show")}    style={rs.bulkBtn}>👁 {t("secBranchShowAll")}</button>
                <button onClick={() => bulkBranch("hide")}    style={rs.bulkBtn}>🚫 {t("secBranchHideAll")}</button>
                <button onClick={() => bulkBranch("inherit")} style={rs.bulkBtn}>↺ {t("secBranchResetAll")}</button>
              </div>
            </div>

            <div style={rs.branchHint}>{t("secBranchHint")}</div>

            {/* branch list */}
            <div style={rs.branchList}>
              {filteredBranches.map(b => {
                const st  = branchState(b.id);
                const eff = effectiveAllowed(b.id);
                const meta = BRANCH_TYPE_META[b.type] || {};
                return (
                  <div key={b.id} style={rs.branchRow}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: 16 }}>{meta.icon || "🏢"}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={rs.branchName}>{b.id}</div>
                        <div style={rs.branchSub}>
                          {lang === "ar" ? (meta.badgeAr || meta.badge) : meta.badge}
                          {b.label !== b.id ? ` · ${b.label}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* effective state dot */}
                    <span style={{ ...rs.effDot, background: eff ? "#dc2626" : "#94a3b8" }}
                      title={eff ? t("secDeleteEnabled") : t("secDeleteLocked")} />

                    {/* 3-state segmented control */}
                    <div style={rs.seg}>
                      {[
                        { k: "inherit", label: t("secBranchInherit") },
                        { k: "show",    label: t("secBranchShow")    },
                        { k: "hide",    label: t("secBranchHide2")   },
                      ].map(opt => {
                        const active = st === opt.k;
                        const activeBg = opt.k === "show" ? "#dc2626" : opt.k === "hide" ? "#475569" : "#0284c7";
                        return (
                          <button
                            key={opt.k}
                            onClick={() => setBranchState(b.id, opt.k)}
                            style={{
                              ...rs.segBtn,
                              background: active ? activeBg : "transparent",
                              color: active ? "#fff" : "#64748b",
                              fontWeight: active ? 800 : 600,
                            }}>
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {filteredBranches.length === 0 && (
                <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                  {t("secBranchNoResults")}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
        <Button onClick={handleReset} tone="danger">↺ {t("secResetDefaults")}</Button>
        <Button onClick={handleSave} tone="primary" style={{ background: saved ? "#15803d" : "#0f766e" }}>
          {saved ? `✅ ${t("secSaved")}` : `💾 ${t("secSave")}`}
        </Button>
      </div>

      <ConfirmModal
        open={confirmReset}
        title={t("secResetDefaults")}
        body={t("secResetConfirm")}
        confirmText={t("secResetDefaults")}
        cancelText={t("cancel")}
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
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

  /* per-branch delete customization */
  ovBadge: {
    background: "#eff6ff", border: "1.5px solid #bfdbfe", color: "#1d4ed8",
    fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 9px", whiteSpace: "nowrap",
  },
  expandBtn: {
    padding: "6px 14px", borderRadius: 8, border: "1.5px solid #cbd5e1",
    background: "#f8fafc", cursor: "pointer", color: "#334155", fontWeight: 700, fontSize: 12.5,
    whiteSpace: "nowrap",
  },
  branchPanel: {
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
    padding: 12, margin: "0 0 14px",
  },
  branchToolbar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap", marginBottom: 8,
  },
  branchSearch: {
    flex: 1, minWidth: 160, padding: "7px 12px", borderRadius: 8,
    border: "1.5px solid #cbd5e1", fontSize: 13, background: "#fff", color: "#1e293b",
  },
  bulkBtn: {
    padding: "6px 12px", borderRadius: 8, border: "1.5px solid #cbd5e1",
    background: "#fff", cursor: "pointer", color: "#475569", fontWeight: 700, fontSize: 12,
  },
  branchHint: {
    fontSize: 11.5, color: "#94a3b8", marginBottom: 10, lineHeight: 1.5,
  },
  branchList: {
    display: "flex", flexDirection: "column", gap: 6,
    maxHeight: 360, overflowY: "auto",
  },
  branchRow: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 10px",
  },
  branchName: { fontWeight: 800, fontSize: 13, color: "#1e293b" },
  branchSub:  { fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  effDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  seg: {
    display: "inline-flex", background: "#f1f5f9", border: "1px solid #e2e8f0",
    borderRadius: 9, padding: 2, gap: 2, flexShrink: 0,
  },
  segBtn: {
    border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11.5,
    padding: "5px 10px", transition: "background .15s, color .15s", whiteSpace: "nowrap",
  },
};
