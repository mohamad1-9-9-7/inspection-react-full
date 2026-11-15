// src/pages/dashboard/OperatorPicker.jsx
// "Who is working now?" — shown once per browser session to a shared
// (non-admin) account, so every save carries a person's name.
//
// A typed name that already exists on the account's list is stored in the
// list's own spelling ("ahmed ali " → "Ahmed Ali"), so one person does not
// end up under three names in the audit trail.
import React, { useMemo, useState } from "react";
import { normText } from "./dashboardSearch";

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
.opk-overlay { position:fixed; inset:0; background:rgba(15,23,42,.45); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px; }
.opk-card { background:#fff; border-radius:20px; padding:28px 26px; width:min(460px,96vw); max-height:92vh; overflow:auto;
  box-shadow:0 24px 60px rgba(15,23,42,.25); border:1px solid #dbeafe; text-align:center; font-family:inherit; }
.opk-icon { width:64px; height:64px; border-radius:50%; background:#eff6ff; border:1px solid #bfdbfe;
  display:grid; place-items:center; margin:0 auto 14px; }
#root .opk-card.opk-card .opk-icon { font-size:${fs(30)}; }
#root .opk-card.opk-card .opk-title { font-size:${fs(22)}; font-weight:900; color:#0f172a; margin:0 0 6px; }
#root .opk-card.opk-card .opk-sub { font-size:${fs(14.5)}; color:#64748b; margin:0 0 18px; line-height:1.6; }
#root .opk-card.opk-card .opk-sub strong { font-size:inherit !important; color:#2563eb; }
.opk-toggle { display:flex; gap:6px; margin-bottom:14px; background:#f1f5f9; border-radius:12px; padding:4px; }
.opk-mode { flex:1; padding:9px 0; background:none; border:none; border-radius:9px; font-weight:800;
  cursor:pointer; font-family:inherit; color:#64748b; }
.opk-mode.on { background:#fff; color:#2563eb; box-shadow:0 1px 4px rgba(15,23,42,.12); }
#root .opk-card.opk-card .opk-mode { font-size:${fs(14)}; }
.opk-input { width:100%; padding:12px 14px; border:1.5px solid #cbd5e1; border-radius:12px; font-family:inherit;
  box-sizing:border-box; margin-bottom:12px; outline:none; color:#0f172a; background:#fff; }
.opk-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.18); }
#root .opk-card.opk-card .opk-input { font-size:${fs(16)}; }
.opk-list { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; max-height:300px; overflow-y:auto; }
.opk-emp { display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:12px; background:#f8fafc;
  border:1.5px solid #e2e8f0; cursor:pointer; font-family:inherit; text-align:start; color:#0f172a; font-weight:800; }
.opk-emp:hover { border-color:#93c5fd; }
.opk-emp.on { background:#eff6ff; border-color:#3b82f6; }
#root .opk-card.opk-card .opk-emp, #root .opk-card.opk-card .opk-emp span { font-size:${fs(16)}; }
.opk-av { width:34px; height:34px; border-radius:50%; background:#dbeafe; color:#1d4ed8; font-weight:900;
  display:grid; place-items:center; flex-shrink:0; }
.opk-tick { margin-inline-start:auto; color:#2563eb; }
#root .opk-card.opk-card .opk-none { font-size:${fs(14)}; color:#64748b; padding:10px 0; }
.opk-go { width:100%; padding:14px 0; background:#2563eb; color:#fff; border:none; border-radius:12px; font-weight:900;
  font-family:inherit; cursor:pointer; }
.opk-go:disabled { opacity:.5; cursor:not-allowed; }
#root .opk-card.opk-card .opk-go { font-size:${fs(17)}; }
`;

const tidy = (v) => String(v || "").replace(/\s+/g, " ").trim();

export default function OperatorPicker({ employees, accountName, onConfirm, t, lang = "en" }) {
  const hasList = employees.length > 0;
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const [find, setFind] = useState("");
  const [mode, setMode] = useState(hasList ? "list" : "type");

  const shown = useMemo(() => {
    const q = normText(find);
    return q ? employees.filter((n) => normText(n).includes(q)) : employees;
  }, [employees, find]);

  const typed = tidy(custom);
  const name = mode === "list" ? selected : typed;

  const confirm = () => {
    if (!name) return;
    // a typed name that is already on the list keeps the list's spelling
    const known = employees.find((n) => normText(n) === normText(name));
    onConfirm(known || name);
  };

  return (
    <div className="opk-overlay">
      <style>{CSS}</style>
      <div className="opk-card opk-card" dir={lang === "ar" ? "rtl" : "ltr"} role="dialog" aria-modal="true" aria-labelledby="opk-title">
        <div className="opk-icon" aria-hidden="true">👷</div>
        <h2 id="opk-title" className="opk-title">{t.whoTitle}</h2>
        <p className="opk-sub">
          {t.account} <strong>{accountName}</strong><br />
          {t.pickSub}
        </p>

        {hasList && (
          <div className="opk-toggle">
            <button type="button" className={`opk-mode${mode === "list" ? " on" : ""}`} onClick={() => setMode("list")}>{t.fromList}</button>
            <button type="button" className={`opk-mode${mode === "type" ? " on" : ""}`} onClick={() => setMode("type")}>{t.typeName}</button>
          </div>
        )}

        {mode === "list" && hasList && (
          <>
            {employees.length > 6 && (
              <input
                className="opk-input"
                placeholder={t.findName}
                value={find}
                onChange={(e) => setFind(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && shown.length === 1) onConfirm(shown[0]);
                }}
              />
            )}
            <div className="opk-list">
              {shown.map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`opk-emp${selected === n ? " on" : ""}`}
                  onClick={() => setSelected(n)}
                  onDoubleClick={() => onConfirm(n)}
                >
                  <span className="opk-av" aria-hidden="true">{n[0]?.toUpperCase()}</span>
                  <span>{n}</span>
                  {selected === n && <span className="opk-tick" aria-hidden="true">✓</span>}
                </button>
              ))}
              {shown.length === 0 && <div className="opk-none">{t.noName}</div>}
            </div>
          </>
        )}

        {mode === "type" && (
          <input
            autoFocus
            className="opk-input"
            placeholder={t.enterName}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirm()}
          />
        )}

        <button type="button" className="opk-go" onClick={confirm} disabled={!name}>{t.start}</button>
      </div>
    </div>
  );
}
