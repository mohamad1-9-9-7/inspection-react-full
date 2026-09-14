// src/pages/hse/hseIsoUi.js
// نمط صفحات ISO / HACCP لصفحات HSE — مصدر واحد للألوان والجداول والبطاقات.

import { ISO_UI } from "../monitor/branches/_shared/branchViewKit";

export { ISO_UI };

/* ═════════ نمط ISO/HACCP ═════════ */
export const UI = {
  page: { ...ISO_UI.shell, padding: "16px 14px" },
  wrap: { width: "100%", margin: 0 },
  card: {
    background: "rgba(255,255,255,0.94)",
    border: "1px solid rgba(15,23,42,0.16)",
    borderRadius: 14,
    boxShadow: "0 12px 32px rgba(2,132,199,0.10)",
    padding: 14,
    marginBottom: 14,
  },
  table: { width: "100%", borderCollapse: "collapse", background: "#fff", fontWeight: 600 },
  th: {
    border: "1px solid rgba(255,255,255,0.30)",
    background: "transparent",
    color: "#fff",
    padding: "9px 8px",
    fontWeight: 900,
    fontSize: 13,
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  td: {
    border: "1px solid #e2e8f0",
    padding: "9px 8px",
    fontSize: 13,
    fontWeight: 600,
    color: "#071b2d",
    verticalAlign: "top",
    lineHeight: 1.65,
  },
  sectionTitle: { fontSize: 16, fontWeight: 900, color: "#0c4a6e", marginBottom: 8 },
  chip: (bg, color) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 7,
    background: bg, color, fontSize: 11.5, fontWeight: 900,
  }),
};