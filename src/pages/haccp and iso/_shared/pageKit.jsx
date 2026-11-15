// src/pages/haccp and iso/_shared/pageKit.jsx
// ONE page design for the HACCP / ISO modules — the inside of the hub.
//
// It sits on the hub's own look (pages/dashboard/hubCss.js): the same light
// header, buttons and cards, so opening a module does not feel like leaving
// the system. A module page is:
//
//   <HaccpPage lang icon title sub clause actions>
//     <Stats>…<Stat/></Stats>
//     <FilterBar>…<Field/></FilterBar>
//     <Panel title actions>…</Panel>
//   </HaccpPage>
//
// Sizes: globals.css forces `#root * { font-size:14px !important }`, so an
// inline fontSize does nothing. Every text class here sets its own size with
// the doubled-class trick and follows the Aa slider (--app-fs). Use these
// classes / components instead of inline font sizes.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HUB_CSS, fs } from "../../dashboard/hubCss";

export const PAGE_CSS = `
/* ── header extras ── */
.pgk-ico { width:54px; height:54px; border-radius:14px; display:grid; place-items:center; flex-shrink:0;
  background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; }
#root .ndx.ndx .pgk-ico { font-size:${fs(27)}; line-height:1; }
.pgk-clause { display:inline-block; margin-inline-start:8px; padding:2px 9px; border-radius:999px; background:#eff6ff;
  border:1px solid #bfdbfe; color:#1d4ed8; font-weight:800; vertical-align:middle; }
#root .ndx.ndx .pgk-clause { font-size:${fs(12)}; }
.pgk-actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:flex-end; }

/* ── buttons ── */
.pgk-btn { min-height:42px; padding:8px 16px; border-radius:11px; border:1px solid #cfe0f3; background:#fff; color:#1e3a5f;
  font-weight:800; cursor:pointer; white-space:nowrap; font-family:inherit; display:inline-flex; align-items:center; gap:7px;
  text-decoration:none; transition:background .15s, border-color .15s; }
.pgk-btn:hover { background:#eff6ff; border-color:#93c5fd; }
.pgk-btn:disabled { opacity:.55; cursor:not-allowed; }
.pgk-btn.primary { background:#2563eb; border-color:#2563eb; color:#fff; }
.pgk-btn.primary:hover { background:#1d4ed8; }
.pgk-btn.ok { background:#059669; border-color:#059669; color:#fff; }
.pgk-btn.ok:hover { background:#047857; }
.pgk-btn.danger { background:#fff5f5; border-color:#fecaca; color:#b91c1c; }
.pgk-btn.danger:hover { background:#fee2e2; }
.pgk-btn.sm { min-height:34px; padding:5px 11px; border-radius:9px; }
.pgk-btn:focus-visible, .pgk-in:focus-visible { outline:3px solid rgba(59,130,246,.45); outline-offset:2px; }
#root .ndx.ndx .pgk-btn { font-size:${fs(14)}; }
#root .ndx.ndx .pgk-btn.sm { font-size:${fs(13)}; }

/* ── stat tiles ── */
.pgk-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr)); gap:10px; margin-top:14px; }
.pgk-stat { border-radius:14px; background:#fff; border:1px solid #e2e8f0; padding:12px 14px; box-shadow:0 1px 2px rgba(15,23,42,.04);
  text-align:start; font-family:inherit; color:inherit; }
button.pgk-stat { cursor:pointer; }
button.pgk-stat:hover { border-color:#93c5fd; }
.pgk-stat.on { border-color:#2563eb; box-shadow:0 0 0 2px rgba(37,99,235,.18); }
#root .ndx.ndx .pgk-stat-v { font-size:${fs(24)}; font-weight:900; line-height:1.15; color:#0f172a; display:block; }
#root .ndx.ndx .pgk-stat-l { font-size:${fs(13)}; font-weight:700; color:#64748b; display:block; margin-top:3px; }
.pgk-stat.red .pgk-stat-v { color:#b91c1c; } .pgk-stat.amber .pgk-stat-v { color:#b45309; }
.pgk-stat.green .pgk-stat-v { color:#047857; } .pgk-stat.blue .pgk-stat-v { color:#1d4ed8; }

/* ── panels ── */
.pgk-panel { margin-top:14px; border-radius:16px; background:#fff; border:1px solid #e2e8f0; padding:16px;
  box-shadow:0 1px 2px rgba(15,23,42,.04); }
.pgk-panel-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:12px; }
#root .ndx.ndx .pgk-h { font-size:${fs(17)}; font-weight:900; color:#0f172a; margin:0; }
#root .ndx.ndx .pgk-hint { font-size:${fs(13)}; color:#64748b; font-weight:600; margin-top:3px; line-height:1.5; }

/* ── fields ── */
.pgk-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr)); gap:12px; align-items:end; }
.pgk-field { display:block; min-width:0; }
.pgk-field.wide { grid-column:1 / -1; }
#root .ndx.ndx .pgk-label { font-size:${fs(13)}; font-weight:800; color:#475569; display:block; margin-bottom:5px; }
.pgk-req { color:#dc2626; }
.pgk-in { width:100%; min-height:42px; padding:9px 12px; border:1.5px solid #cbd5e1; border-radius:11px; background:#fff;
  color:#0f172a; font-family:inherit; font-weight:600; outline:none; }
.pgk-in:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,.16); }
.pgk-in.bad { border-color:#f87171; background:#fff5f5; }
textarea.pgk-in { min-height:84px; resize:vertical; line-height:1.55; }
#root .ndx.ndx .pgk-in { font-size:${fs(15)}; }
#root .ndx.ndx .pgk-err { font-size:${fs(12.5)}; color:#b91c1c; font-weight:700; margin-top:4px; }

/* ── record cards / rows ── */
.pgk-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr)); gap:12px; margin-top:14px; }
.pgk-rec { text-align:start; border-radius:16px; background:#fff; border:1px solid #e2e8f0; padding:14px; cursor:pointer;
  font-family:inherit; color:#0f172a; box-shadow:0 2px 8px rgba(15,23,42,.05); display:flex; flex-direction:column; gap:8px;
  transition:transform .15s, box-shadow .15s, border-color .15s; }
.pgk-rec:hover, .pgk-rec:focus-visible { transform:translateY(-2px); border-color:#93c5fd; box-shadow:0 12px 26px rgba(37,99,235,.14); outline:none; }
.pgk-rec-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
#root .ndx.ndx .pgk-rec-t { font-size:${fs(16.5)}; font-weight:900; line-height:1.3; }
#root .ndx.ndx .pgk-rec-m { font-size:${fs(13.5)}; font-weight:600; color:#475569; line-height:1.5; }
#root .ndx.ndx .pgk-rec-n { font-size:${fs(13)}; font-weight:600; color:#64748b; line-height:1.5;
  display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
.pgk-rec-foot { margin-top:auto; padding-top:8px; border-top:1px solid #eef2f7; display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
.pgk-pill { padding:3px 10px; border-radius:999px; font-weight:800; border:1px solid; white-space:nowrap; display:inline-block; }
#root .ndx.ndx .pgk-pill { font-size:${fs(12.5)}; }
.pgk-pill.red { background:#fef2f2; color:#b91c1c; border-color:#fecaca; }
.pgk-pill.amber { background:#fffbeb; color:#b45309; border-color:#fde68a; }
.pgk-pill.green { background:#f0fdf4; color:#166534; border-color:#bbf7d0; }
.pgk-pill.blue { background:#eff6ff; color:#1d4ed8; border-color:#bfdbfe; }
.pgk-pill.grey { background:#f1f5f9; color:#475569; border-color:#e2e8f0; }

/* ── table ── */
.pgk-tablewrap { overflow-x:auto; border:1px solid #e2e8f0; border-radius:12px; }
.pgk-table { width:100%; border-collapse:collapse; background:#fff; }
.pgk-table th { text-align:start; background:#f1f6fc; color:#475569; font-weight:800; padding:9px 10px; border-bottom:1px solid #e2e8f0; white-space:nowrap; }
.pgk-table td { padding:8px 10px; border-bottom:1px solid #eef2f7; vertical-align:top; color:#0f172a; }
.pgk-table tr:last-child td { border-bottom:none; }
#root .ndx.ndx .pgk-table th { font-size:${fs(12.5)}; }
#root .ndx.ndx .pgk-table td { font-size:${fs(14)}; }

/* ── messages ── */
.pgk-note { margin-top:14px; padding:14px 16px; border-radius:14px; border:1px solid #e2e8f0; background:#fff; color:#64748b; font-weight:700; text-align:center; }
.pgk-note.err { background:#fef2f2; border-color:#fecaca; color:#991b1b; text-align:start; }
#root .ndx.ndx .pgk-note, #root .ndx.ndx .pgk-note * { font-size:${fs(14.5)}; }
.pgk-toast { position:fixed; bottom:22px; left:50%; transform:translateX(-50%); z-index:10050; padding:12px 18px; border-radius:12px;
  background:#0f172a; color:#fff; font-weight:800; box-shadow:0 14px 34px rgba(15,23,42,.3); max-width:min(92vw,560px); text-align:center; }
.pgk-toast.ok { background:#047857; } .pgk-toast.err { background:#b91c1c; }
#root .pgk-toast.pgk-toast { font-size:${fs(14.5)}; }

/* ── modal ── */
.pgk-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:10000; display:grid; place-items:center; padding:14px; }
.pgk-modal { width:min(1000px,100%); max-height:92vh; overflow:auto; background:#f8fbff; border-radius:18px;
  box-shadow:0 24px 70px rgba(15,23,42,.3); font-family:system-ui,-apple-system,"Segoe UI",sans-serif; color:#0f172a; }
.pgk-modal.narrow { width:min(520px,100%); }
.pgk-modal-head { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:13px 16px; background:#fff;
  border-bottom:1px solid #e2e8f0; border-radius:18px 18px 0 0; }
.pgk-modal-body { padding:16px; display:grid; gap:12px; }
.pgk-modal .pgk-panel { margin-top:0; }
#root .ndx.ndx .pgk-modal-title, #root .pgk-modal .pgk-modal-title { font-size:${fs(17)}; font-weight:900; margin:0; }

/* ── attachments ── */
.pgk-thumbs { display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:10px; }
.pgk-thumb { border:1px solid #e2e8f0; border-radius:12px; overflow:hidden; background:#fff; padding:0; cursor:pointer; font-family:inherit; text-align:start; }
.pgk-thumb img { width:100%; height:112px; object-fit:cover; display:block; }
.pgk-thumb-cap { padding:6px 9px; display:flex; align-items:center; justify-content:space-between; gap:6px; color:#475569; font-weight:700; }
.pgk-thumb-cap span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
#root .ndx.ndx .pgk-thumb-cap, #root .ndx.ndx .pgk-thumb-cap * { font-size:${fs(12.5)}; }
.pgk-file { display:flex; align-items:center; gap:10px; padding:9px 11px; border:1px solid #e2e8f0; border-radius:12px; background:#fff; min-width:0; }
.pgk-file-ic { width:38px; height:38px; border-radius:9px; display:grid; place-items:center; background:#fef2f2; border:1px solid #fecaca; color:#dc2626; font-weight:900; flex-shrink:0; }
.pgk-file-name { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
#root .ndx.ndx .pgk-file-ic { font-size:${fs(11.5)}; }
#root .ndx.ndx .pgk-file-name { font-size:${fs(14)}; }
.pgk-drop { border:1.5px dashed #bfdbfe; border-radius:12px; padding:16px; background:#f5faff; color:#1d4ed8; font-weight:700; text-align:center; }
#root .ndx.ndx .pgk-drop { font-size:${fs(14)}; }

@media (max-width: 860px) {
  .pgk-ico { width:44px; height:44px; border-radius:11px; }
  .ndx-hero.pgk-hero { flex-wrap:wrap; }
  .pgk-actions { width:100%; justify-content:flex-start; }
}
@media print {
  .pgk-noprint, .ndx-hside, .ndx-toolbar { display:none !important; }
}
`;

/**
 * The page frame. `clause` = the ISO clause shown beside the title ("ISO 4.2").
 * `actions` = buttons on the header's right. The "← Hub" button is built in.
 */
export function HaccpPage({ lang = "en", icon, title, sub, clause, actions, backTo = "/haccp-iso", children }) {
  const navigate = useNavigate();
  const ar = lang === "ar";
  return (
    <main className="ndx ndx" dir={ar ? "rtl" : "ltr"} lang={lang}>
      <style>{HUB_CSS}</style>
      <style>{PAGE_CSS}</style>
      <header className="ndx-hero pgk-hero">
        <span className="pgk-ico" aria-hidden="true">{icon}</span>
        <div className="ndx-hello">
          <p className="ndx-eyebrow">{ar ? "الأيزو 22000 والهاسب" : "ISO 22000 & HACCP"}</p>
          <h1 className="ndx-title">
            {title}
            {clause && <span className="pgk-clause">{clause}</span>}
          </h1>
          {sub && <p className="ndx-sub">{sub}</p>}
        </div>
        <div className="pgk-actions pgk-noprint">
          {actions}
          <button type="button" className="pgk-btn" onClick={() => navigate(backTo)}>
            {ar ? "→ القسم" : "← Hub"}
          </button>
        </div>
      </header>
      {children}
      <footer className="ndx-foot">{ar ? "المواشي — نظام الجودة وسلامة الغذاء" : "Al Mawashi — Quality & Food Safety System"}</footer>
    </main>
  );
}

export function Btn({ kind = "", small, className = "", ...rest }) {
  return <button type="button" className={`pgk-btn ${kind}${small ? " sm" : ""} ${className}`} {...rest} />;
}

export function Stats({ children }) {
  return <section className="pgk-stats">{children}</section>;
}

/** A figure. With onClick it is a filter button (`active` = that filter is on). */
export function Stat({ label, value, tone = "", onClick, active }) {
  const cls = `pgk-stat ${tone}${active ? " on" : ""}`;
  const inner = (
    <>
      <span className="pgk-stat-v">{value}</span>
      <span className="pgk-stat-l">{label}</span>
    </>
  );
  return onClick
    ? <button type="button" className={cls} onClick={onClick} aria-pressed={!!active}>{inner}</button>
    : <div className={cls}>{inner}</div>;
}

export function Panel({ title, hint, actions, children, className = "" }) {
  return (
    <section className={`pgk-panel ${className}`}>
      {(title || actions) && (
        <div className="pgk-panel-head">
          <div>
            {title && <h2 className="pgk-h">{title}</h2>}
            {hint && <div className="pgk-hint">{hint}</div>}
          </div>
          {actions && <div className="pgk-actions">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, required, error, wide, children }) {
  return (
    <label className={`pgk-field${wide ? " wide" : ""}`}>
      <span className="pgk-label">{label}{required && <span className="pgk-req"> *</span>}</span>
      {children}
      {error && <div className="pgk-err">{error}</div>}
    </label>
  );
}

export function Pill({ tone = "grey", children }) {
  return <span className={`pgk-pill ${tone}`}>{children}</span>;
}

export function Note({ error, children }) {
  return <div className={`pgk-note${error ? " err" : ""}`}>{children}</div>;
}

/** A dialog. Closes on Escape and on a click outside. */
export function Modal({ open, title, onClose, narrow, lang = "en", children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="pgk-overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      {/* .ndx.ndx so the kit's text sizes apply inside the dialog too */}
      <div className={`pgk-modal ndx-in${narrow ? " narrow" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="pgk-modal-head">
          <h2 className="pgk-modal-title">{title}</h2>
          <button type="button" className="pgk-btn sm" onClick={onClose}>✕ {lang === "ar" ? "إغلاق" : "Close"}</button>
        </div>
        <div className="pgk-modal-body">{children}</div>
      </div>
    </div>
  );
}

/** const [toast, say] = useToast();  say("Saved", "ok");  …{toast} */
export function useToast() {
  const [msg, setMsg] = useState(null);
  const timer = useRef(null);
  const say = useCallback((text, tone = "") => {
    clearTimeout(timer.current);
    setMsg({ text, tone });
    timer.current = setTimeout(() => setMsg(null), tone === "err" ? 6000 : 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = msg ? <div className={`pgk-toast pgk-toast ${msg.tone}`} role="status">{msg.text}</div> : null;
  return [node, say];
}

/** Download rows as a CSV that Excel opens correctly (UTF-8 with BOM). */
export function downloadCsv(filename, header, rows) {
  const cell = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
