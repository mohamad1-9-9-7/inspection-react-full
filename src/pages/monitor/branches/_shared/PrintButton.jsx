// src/pages/monitor/branches/_shared/PrintButton.jsx
// Universal Print button — works across all branches.
// Language-agnostic (falls back to English/Arabic based on document.dir or prop)

import React from "react";

export default function PrintButton({
  title,
  documentNo,
  reportDate,
  lang,        // "en" | "ar" — if omitted, detect from document direction
  className = "",
  variant = "default", // "default" | "compact"
}) {
  const effectiveLang = lang || (typeof document !== "undefined" && document.dir === "rtl" ? "ar" : "en");
  const labels = effectiveLang === "ar"
    ? { btn: "طباعة", tooltip: "طباعة للمفتش (A4)" }
    : { btn: "Print", tooltip: "Print for inspector (A4)" };

  const doPrint = () => {
    // Populate the official print header if present in the DOM
    const headerEl = document.getElementById("branch-print-official-header");
    if (headerEl) {
      const titleEl = headerEl.querySelector(".__pt-title");
      const docEl   = headerEl.querySelector(".__pt-docno");
      const dateEl  = headerEl.querySelector(".__pt-date");
      if (titleEl) titleEl.textContent = title || "Report";
      if (docEl)   docEl.textContent   = documentNo || "—";
      if (dateEl)  dateEl.textContent  = reportDate || new Date().toLocaleDateString("en-GB");
    }
    setTimeout(() => window.print(), 50);
  };

  return (
    <button
      onClick={doPrint}
      className={`universal-print-btn universal-print-btn-${variant} no-print ${className}`}
      title={labels.tooltip}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      <span>{labels.btn}</span>
      <style>{`
        .universal-print-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,.25);
          background: rgba(255,255,255,.1);
          color: #fff;
          font-family: inherit;
          font-size: 13px; font-weight: 700;
          cursor: pointer;
          transition: all .15s ease;
          backdrop-filter: blur(4px);
        }
        .universal-print-btn:hover {
          background: rgba(255,255,255,.18);
          transform: translateY(-1px);
        }
        .universal-print-btn-compact {
          padding: 6px 10px;
          font-size: 12px;
          background: #fff;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .universal-print-btn-compact:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
      `}</style>
    </button>
  );
}

/**
 * Renders an "Official Header" block that is visible ONLY when printing.
 * Place it anywhere inside the report's rendered content (once per page).
 */
export function PrintOfficialHeader({
  title,
  documentNo,
  reportDate,
  company = "Trans Emirates Livestock Trading LLC — Al Mawashi",
}) {
  return (
    <div id="branch-print-official-header" className="print-official-header print-only">
      <h1 className="__pt-title">{title}</h1>
      <div className="company">{company}</div>
      <div className="meta">
        Doc No: <span className="__pt-docno">{documentNo || "—"}</span>
        {" | "}
        Report Date: <span className="__pt-date">{reportDate || "—"}</span>
      </div>
    </div>
  );
}
