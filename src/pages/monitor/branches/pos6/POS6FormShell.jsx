// src/pages/monitor/branches/pos6/POS6FormShell.jsx
// The chrome every POS 6 form shares: the Production form stylesheet, the
// two-signature footer and the save bar. Keeping them here is what lets each
// form file be just its own table.

import React from "react";

export default function FormShell({ dir = "ltr", children }) {
  return (
    <div className="ph-wrap" dir={dir}>
      <style>{FORM_STYLES}</style>
      {children}
    </div>
  );
}

export function SignatureFooter({ t, checkedBy, setCheckedBy, verifiedBy, setVerifiedBy }) {
  return (
    <div className="ph-footer">
      <div className="ph-sig">
        <label>{t("sig_checked_by")} <span className="ph-req">*</span></label>
        <input
          type="text"
          value={checkedBy}
          onChange={(e) => setCheckedBy(e.target.value)}
          placeholder={t("sig_name_sig")}
          className="ph-input"
        />
      </div>
      <div className="ph-sig">
        <label>{t("sig_verified_by")} <span className="ph-req">*</span></label>
        <input
          type="text"
          value={verifiedBy}
          onChange={(e) => setVerifiedBy(e.target.value)}
          placeholder={t("sig_name_sig")}
          className="ph-input"
        />
      </div>
    </div>
  );
}

/**
 * Guidance shown above each sheet, written per report from its own subject —
 * what the checker must not miss, and what must happen when a line fails.
 * `kind` is "tip" (how to fill it correctly) or "warn" (a rule that can fail
 * an audit or spoil product if ignored).
 */
export function GuidanceNote({ isAr, accent = "#0284c7", items = [] }) {
  if (!items.length) return null;
  return (
    <div className="ph-guide" style={{ "--guide-accent": accent }}>
      <div className="ph-guide-head">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-5M12 8h.01" />
        </svg>
        {isAr ? "ملاحظات إرشادية وتحذيرات" : "Guidance & warnings"}
      </div>
      <ul className="ph-guide-list">
        {items.map((it, i) => (
          <li key={i} className={`ph-guide-item ${it.kind === "warn" ? "warn" : "tip"}`}>
            <span className="ph-guide-mark">{it.kind === "warn" ? "!" : "i"}</span>
            <span>{isAr ? it.ar : it.en}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SaveBar({ t, opMsg, saving, onSave }) {
  const message =
    opMsg === "⏳" ? `⏳ ${t("msg_saving")}`
    : opMsg === "✅" ? `✅ ${t("msg_saved")}`
    : opMsg;

  return (
    <div className="ph-savebar">
      {message && <div className="ph-msg">{message}</div>}
      <button onClick={onSave} disabled={saving} className="ph-btn ph-btn-primary ph-btn-lg">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
        {saving ? t("btn_saving") : t("btn_save")}
      </button>
    </div>
  );
}

/* Lifted from PersonalHygienePRDInput so POS 6 forms match Production exactly. */
const FORM_STYLES = `
  .ph-wrap {
    padding: 22px;
    background: #f8fafc;
    min-height: 100%;
  }

  .ph-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 12px;
  }
  .ph-legend {
    display: inline-flex; gap: 16px;
    font-size: 12px; font-weight: 600; color: #64748b;
  }
  .ph-legend b {
    display: inline-block;
    min-width: 22px; text-align: center;
    padding: 2px 6px;
    border-radius: 5px;
    font-size: 11px; font-weight: 800;
    margin-right: 4px;
  }
  .ph-chip-c  { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .ph-chip-nc { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  .ph-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 8px;
    font-family: inherit; font-size: 13px; font-weight: 700;
    cursor: pointer; border: 1px solid transparent;
    transition: all .15s ease;
  }
  .ph-btn-ghost {
    background: #fff; color: #334155;
    border-color: #e2e8f0;
  }
  .ph-btn-ghost:hover {
    background: #f1f5f9; border-color: #cbd5e1;
  }
  .ph-btn-primary {
    background: linear-gradient(135deg, #0f766e, #14b8a6);
    color: #fff;
    box-shadow: 0 4px 12px rgba(15,118,110,.25);
  }
  .ph-btn-primary:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(15,118,110,.35);
    transform: translateY(-1px);
  }
  .ph-btn-primary:disabled {
    opacity: .6; cursor: not-allowed;
  }
  .ph-btn-lg { padding: 11px 22px; font-size: 14px; }

  .ph-btn-icon {
    width: 34px; height: 34px;
    border-radius: 6px;
    border: none;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 800;
    cursor: pointer;
    transition: all .15s;
  }
  .ph-btn-danger {
    background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;
  }
  .ph-btn-danger:hover:not(:disabled) { background: #fee2e2; }
  .ph-btn-danger:disabled { opacity: .3; cursor: not-allowed; }

  .ph-table-wrap {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .ph-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14.5px;
  }
  .ph-table thead th {
    background: #0f172a;
    color: #fff;
    padding: 16px 10px;
    font-weight: 700;
    font-size: 12.5px;
    letter-spacing: .03em;
    text-align: center;
    border-right: 1px solid rgba(255,255,255,.08);
  }
  .ph-table thead th:last-child { border-right: none; }
  .ph-col-compact { min-width: 90px; }
  .ph-table tbody td {
    padding: 14px 12px;
    border-bottom: 1px solid #f1f5f9;
    border-right: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .ph-table tbody tr { height: 64px; }
  .ph-table tbody tr:nth-child(even) { background: #fafbfc; }
  .ph-table tbody tr:hover { background: #eff6ff; }
  .ph-num {
    text-align: center;
    color: #94a3b8;
    font-weight: 700;
    font-size: 13.5px;
  }

  .ph-input {
    width: 100%; box-sizing: border-box;
    padding: 12px 14px;
    min-height: 46px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 14.5px;
    color: #0f172a;
    background: #fff;
    outline: none;
    transition: border .15s, box-shadow .15s;
  }
  .ph-input:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,.12);
  }
  .ph-input::placeholder { color: #cbd5e1; }

  .ph-cell-select { text-align: center; padding: 4px !important; }
  .ph-select {
    width: 100%;
    padding: 12px 6px;
    min-height: 46px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    outline: none;
    text-align: center;
    text-align-last: center;
    transition: all .15s;
  }
  .ph-select-empty { background: #fff; color: #94a3b8; }
  .ph-select-ok    { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .ph-select-bad   { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

  .ph-footer {
    margin-top: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }
  .ph-sig {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 14px;
  }
  .ph-sig label {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: .06em;
    margin-bottom: 6px;
  }
  .ph-req { color: #dc2626; }

  .ph-savebar {
    margin-top: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 14px 16px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }
  .ph-msg {
    font-size: 13px;
    font-weight: 700;
    color: #0f766e;
  }

  @media (max-width: 900px) {
    .ph-wrap { padding: 14px; }
    .ph-footer { grid-template-columns: 1fr; }
    .ph-table thead th { font-size: 11.5px; padding: 12px 4px; }
    .ph-table tbody tr { height: 56px; }
    .ph-table tbody td { padding: 10px 7px; }
    .ph-select, .ph-input { font-size: 13.5px; padding: 10px 9px; min-height: 42px; }
  }

  /* ── POS 6 additions ── */
  .ph-toolbar-note { font-size: 12px; font-weight: 600; color: #64748b; }
  .ph-btn-soft { background:#f0fdfa; color:#0f766e; border-color:#99f6e4; }
  .ph-btn-soft:hover { background:#ccfbf1; }
  .ph-btn-amber { background:#fffbeb; color:#b45309; border-color:#fde68a; }
  .ph-btn-amber:hover { background:#fef3c7; }
  .ph-empty {
    padding: 34px 18px; text-align: center;
    color: #94a3b8; font-weight: 700; font-size: 13px;
    background: #fff; border: 1px dashed #cbd5e1; border-radius: 12px;
  }
  .ph-unit-name { display:flex; align-items:center; gap:8px; }
  .ph-tag {
    flex-shrink: 0; padding: 2px 8px; border-radius: 999px;
    font-size: 10px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase;
  }
  .ph-tag-chiller { background:#e0f2fe; color:#075985; border:1px solid #bae6fd; }
  .ph-tag-freezer { background:#eef2ff; color:#3730a3; border:1px solid #c7d2fe; }
  .ph-temp { text-align:center; font-weight:700; }
  .ph-temp-bad { background:#fee2e2; border-color:#fecaca; color:#991b1b; }
  .ph-stats {
    display:flex; flex-wrap:wrap; gap:10px; margin: 12px 0;
  }
  .ph-stat {
    flex: 1 1 150px; background:#fff; border:1px solid #e2e8f0; border-radius:10px;
    padding:10px 14px;
  }
  .ph-stat-label { font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:.06em; }
  .ph-stat-value { font-size:20px; font-weight:900; color:#0f172a; margin-top:3px; }
  .ph-stat-bad .ph-stat-value { color:#dc2626; }
  .ph-section-row td {
    background:#0f172a !important; color:#fff;
    font-weight:800; font-size:12px; letter-spacing:.04em; text-transform:uppercase;
  }
  .ph-scroll-x { overflow-x: auto; }

  .ph-draft {
    display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    margin: 0 0 14px;
    padding: 11px 16px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-radius: 10px;
    font-size: 13.5px; font-weight: 700; color: #92400e;
  }
  .ph-draft-dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    background: #f59e0b; box-shadow: 0 0 0 4px rgba(245,158,11,.18);
  }
  .ph-draft-text { flex: 1; min-width: 200px; }
  .ph-draft-note {
    display: block; margin-top: 3px;
    font-size: 12.5px; font-weight: 600; color: #b45309;
  }

  .ph-guide {
    margin: 0 0 14px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-inline-start: 4px solid var(--guide-accent, #0284c7);
    border-radius: 12px;
    padding: 14px 18px;
    box-shadow: 0 1px 3px rgba(15,23,42,.04);
  }
  .ph-guide-head {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 900;
    color: var(--guide-accent, #0284c7);
    letter-spacing: .02em;
    margin-bottom: 10px;
  }
  .ph-guide-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .ph-guide-item {
    display: flex; align-items: flex-start; gap: 9px;
    font-size: 14px; line-height: 1.6; font-weight: 600; color: #334155;
  }
  .ph-guide-item.warn { color: #9a3412; }
  .ph-guide-mark {
    flex-shrink: 0; margin-top: 1px;
    width: 20px; height: 20px; border-radius: 6px;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 900;
  }
  .ph-guide-item.tip  .ph-guide-mark { background:#e0f2fe; color:#075985; border:1px solid #bae6fd; }
  .ph-guide-item.warn .ph-guide-mark { background:#ffedd5; color:#9a3412; border:1px solid #fed7aa; }
  @media (max-width: 900px) {
    .ph-guide { padding: 12px 14px; }
    .ph-guide-item { font-size: 13px; }
  }

`;
