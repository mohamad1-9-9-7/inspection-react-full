// src/pages/monitor/branches/_shared/PrintStyles.jsx
// GLOBAL print-friendly styles for ALL branches.
// Injected once at BranchDailyView level — every branch automatically supports A4 printing.
//
// When the user presses Ctrl+P or clicks a Print button:
//  • Navigation chrome (sidebars, topbars, tabs, buttons) is hidden
//  • Report content expands to full-width
//  • Colors downgrade to black on white
//  • Tables show clear borders and repeat headers on each page
//  • Warnings become bold text + ⚠ symbol instead of red color

import React from "react";

export default function PrintStyles() {
  return <style>{PRINT_CSS}</style>;
}

const PRINT_CSS = `
  @media print {
    /* ── Page setup ── */
    @page {
      size: A4;
      margin: 12mm 10mm 14mm 10mm;
    }

    /* ── Reset colors for print ── */
    * {
      -webkit-print-color-adjust: economy !important;
      print-color-adjust: economy !important;
      color-adjust: economy !important;
      box-shadow: none !important;
    }

    html, body {
      background: #fff !important;
      color: #000 !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Times New Roman', Georgia, serif !important;
      font-size: 10pt !important;
      line-height: 1.35 !important;
    }

    /* ── Hide non-printable chrome ── */
    .bdv-sidebar,
    .bdv-topbar,
    .bdv-nav,
    .prd-sidebar,
    .prd-topbar,
    .prd-breadcrumb,
    .pos19-sidebar,
    .pos19-topbar,
    .no-print,
    button,
    .dmv-sidebar,
    .dmv-topbar,
    .ocv-sidebar,
    .ocv-topbar {
      display: none !important;
    }

    /* ── Main content takes full width ── */
    .bdv-main,
    .bdv-content,
    .prd-main,
    .prd-panel,
    .pos19-main,
    .pos19-content,
    .dmv-layout,
    .dmv-main,
    .ocv-layout,
    .ocv-main {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      grid-template-columns: none !important;
    }

    /* ── Container overrides ── */
    .prd-hub,
    .bdv-root,
    .pos19-root {
      display: block !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    /* ── Show only print header ── */
    .print-only {
      display: block !important;
    }

    /* ── Report Header (PRDReportHeader / POS19 ReportHeader) — downgrade colors ── */
    .prd-rh-banner,
    .report-banner {
      background: #fff !important;
      color: #000 !important;
      border: 2px solid #000 !important;
      padding: 8px 10px !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      page-break-inside: avoid;
    }
    .prd-rh-banner::before,
    .prd-rh-banner::after { display: none !important; }
    .prd-rh-title { color: #000 !important; font-size: 14pt !important; font-weight: 700 !important; }
    .prd-rh-subtitle { color: #333 !important; font-size: 9pt !important; }
    .prd-rh-title-ar { color: #000 !important; font-size: 10pt !important; font-weight: 700 !important; }
    .prd-rh-fields {
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 4px !important;
      margin-top: 6px !important;
    }
    .prd-rh-cell {
      background: #fff !important;
      border: 1px solid #000 !important;
      border-radius: 0 !important;
      padding: 3px 6px !important;
    }
    .prd-rh-label { color: #000 !important; font-size: 7pt !important; font-weight: 700 !important; }
    .prd-rh-value {
      background: #fff !important;
      border: none !important;
      color: #000 !important;
      font-size: 9pt !important;
      min-height: 0 !important;
      padding: 0 !important;
    }
    .prd-rh-input {
      background: #fff !important;
      border: none !important;
      color: #000 !important;
      font-size: 9pt !important;
      padding: 0 !important;
    }

    /* ── Tables: print-safe ── */
    table {
      page-break-inside: auto;
      border-collapse: collapse !important;
      width: 100% !important;
      color: #000 !important;
    }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
    thead th {
      background: #f0f0f0 !important;
      color: #000 !important;
      border: 1px solid #000 !important;
      padding: 4px 6px !important;
      font-weight: 700 !important;
      font-size: 8.5pt !important;
    }
    td {
      border: 1px solid #000 !important;
      padding: 3px 6px !important;
      color: #000 !important;
      background: #fff !important;
      font-size: 9pt !important;
    }

    /* ── Inputs in print — show values as plain text ── */
    input, select, textarea {
      border: none !important;
      background: transparent !important;
      color: #000 !important;
      font-family: inherit !important;
      font-size: inherit !important;
      padding: 0 !important;
      box-shadow: none !important;
      -webkit-appearance: none !important;
      appearance: none !important;
    }

    /* ── Card / panel flattening ── */
    .dm-section,
    .dmv-panel,
    .ph-wrap,
    .cc-wrap,
    .df-wrap,
    .dm-wrap,
    .dmv-wrap,
    .oc-wrap,
    .ocv-wrap,
    .pos19-panel,
    .report-panel {
      background: #fff !important;
      border: 1px solid #000 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 6px 8px !important;
      margin-bottom: 6px !important;
      page-break-inside: avoid;
    }

    /* Section titles downgraded */
    .dm-section-header,
    .dmv-panel-header,
    .pos19-panel-header {
      border-bottom: 1px solid #000 !important;
      padding-bottom: 3px !important;
      margin-bottom: 6px !important;
    }
    .dm-section-title,
    .dmv-panel-title,
    .pos19-panel-name {
      color: #000 !important;
      font-size: 11pt !important;
      font-weight: 700 !important;
    }
    .dm-section-icon,
    .dmv-panel-icon,
    .pos19-panel-icon { display: none !important; }
    .dm-ccp-badge,
    .dmv-ccp {
      background: #fff !important;
      color: #000 !important;
      border: 1px solid #000 !important;
      font-weight: 700 !important;
    }

    /* Status / critical chips → bordered text */
    .dmv-chip,
    .dmv-chip-crit,
    .oc-chip,
    .ocv-chip,
    .ph-chip-c, .ph-chip-nc,
    .cc-chip-c, .cc-chip-nc {
      background: #fff !important;
      color: #000 !important;
      border: 1px solid #000 !important;
      box-shadow: none !important;
    }

    /* Critical-limit cards → flatten */
    .dm-crit-card,
    .dm-crit-card.dm-crit-ok,
    .dm-crit-card.dm-crit-bad,
    .dm-crit-card.dm-crit-empty {
      background: #fff !important;
      border: 2px solid #000 !important;
      box-shadow: none !important;
    }
    .dm-crit-title, .dm-crit-status { color: #000 !important; }

    /* Progress bar → text */
    .dm-progress,
    .cc-stat-bar { display: none !important; }

    /* Signatures */
    .dm-sig, .dmv-sig,
    .oc-sig, .ocv-sig,
    .ph-sig, .cc-sig, .df-sig {
      background: #fff !important;
      border: 1px solid #000 !important;
      border-radius: 0 !important;
      padding: 6px 8px !important;
      min-height: 50px;
    }
    .dm-footer, .dmv-footer,
    .oc-footer, .ocv-footer,
    .ph-footer, .cc-footer, .df-footer {
      display: grid !important;
      grid-template-columns: repeat(3, 1fr) !important;
      gap: 6px !important;
      margin-top: 10px !important;
    }

    /* Red warnings → bold text instead of color */
    .dm-input-warn,
    .dmv-value-bad,
    .oc-input-warn,
    .ocv-warn,
    .dmv-chip-bad {
      color: #000 !important;
      font-weight: 800 !important;
      background: #fff !important;
      border: 1px solid #000 !important;
    }
    .dmv-value-bad::after,
    .ocv-warn::after {
      content: " ⚠";
    }

    /* Section banners (e.g. cleaning section rows) */
    .cc-section-row td {
      background: #e0e0e0 !important;
      color: #000 !important;
      font-weight: 700 !important;
      border: 1px solid #000 !important;
    }
    .cc-row-ok, .cc-row-bad {
      background: #fff !important;
    }

    /* Page-break helpers */
    .print-break-before { page-break-before: always; }
    .print-break-after  { page-break-after: always; }
    .print-avoid-break  { page-break-inside: avoid; }

    /* Official print-only header */
    .print-official-header {
      display: block !important;
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    .print-official-header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: 800;
      letter-spacing: .02em;
    }
    .print-official-header .company {
      font-size: 11pt;
      font-weight: 700;
      margin-top: 2px;
    }
    .print-official-header .meta {
      font-size: 9pt;
      color: #333;
      margin-top: 3px;
    }

    /* Print footer */
    .print-footer-text {
      position: fixed;
      bottom: 2mm;
      left: 0; right: 0;
      text-align: center;
      font-size: 8pt;
      color: #333;
    }
  }

  /* Hidden in screen, shown only when printing */
  .print-only { display: none; }
`;
