// src/pages/monitor/branches/production/_shared/PrintButton.jsx
// Reusable Print button that triggers window.print().
// Optionally shows an "Official Header" block just before printing.

import React from "react";
import { useLang } from "./i18n";

export default function PrintButton({ title, documentNo, reportDate, className = "" }) {
  const { isAr } = useLang();

  const doPrint = () => {
    // Ensure the window's official header has the right content
    const headerEl = document.getElementById("prd-print-official-header");
    if (headerEl) {
      headerEl.querySelector(".__pt-title").textContent = title || "Report";
      headerEl.querySelector(".__pt-docno").textContent = documentNo || "";
      headerEl.querySelector(".__pt-date").textContent = reportDate || new Date().toLocaleDateString("en-GB");
    }
    setTimeout(() => window.print(), 50);
  };

  return (
    <button
      onClick={doPrint}
      className={`prd-print-btn no-print ${className}`}
      title={isAr ? "طباعة للمفتش (A4)" : "Print for inspector (A4)"}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {isAr ? "طباعة" : "Print"}
      <style>{`
        .prd-print-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #334155;
          font-family: inherit;
          font-size: 13px; font-weight: 700;
          cursor: pointer;
          transition: all .15s ease;
        }
        .prd-print-btn:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
          color: #0f172a;
        }
      `}</style>
    </button>
  );
}

/**
 * Renders an "Official Header" block that is visible ONLY when printing.
 * Place this near the top of each view; it will only appear on printouts.
 */
export function PrintOfficialHeader({ title, documentNo, reportDate, company = "Trans Emirates Livestock Trading LLC — Al Mawashi" }) {
  return (
    <div id="prd-print-official-header" className="print-official-header print-only">
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
