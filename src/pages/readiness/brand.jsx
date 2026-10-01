// src/pages/readiness/brand.jsx
// InspectPro's own mark for the public sales pages (/demo, /readiness).
// These pages sell the platform (INSPECT PRO), so they carry its mark, never a
// customer's logo. Pure SVG: sharp at any size, no image request.

import React from "react";

/* The approved INSPECT PRO mark ("Scan ring", Oct 2026): a lens whose ring is
   scanning, a check inside, on a navy app tile. Same drawing as
   public/brand/inspect-pro/app-icon.svg — change both together. */
export function BrandMark({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" style={{ flex: `0 0 ${size}px`, display: "block" }}>
      <rect width="120" height="120" rx="27" fill="#0B1E3F" />
      <g transform="translate(13,13) scale(.8)">
        <path d="M88 52 A36 36 0 1 1 52 16" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" />
        <path d="M52 16 A36 36 0 0 1 88 52" fill="none" stroke="#0EA5A4" strokeWidth="11" strokeLinecap="round" />
        <path d="M80 80 L104 104" stroke="#fff" strokeWidth="14" strokeLinecap="round" />
        <path d="M33 53 L47 67 L73 39" fill="none" stroke="#0EA5A4" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Mark + "InspectPro" wordmark. `tone` = the background it sits on. */
export function BrandLockup({ size = 36, tone = "dark", tag = "QMS" }) {
  const onDark = tone === "dark";
  return (
    <span dir="ltr" style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <BrandMark size={size} />
      <span className="brand-word" style={{ fontWeight: 800, letterSpacing: "-.02em", color: onDark ? "#fff" : "#0f172a", lineHeight: 1 }}>
        Inspect<span style={{ color: onDark ? "#5eead4" : "#0d9488" }}>Pro</span>
        {tag && (
          <span
            className="brand-tag"
            style={{
              marginInlineStart: 8, padding: "3px 7px", borderRadius: 6, verticalAlign: "middle", fontWeight: 800,
              letterSpacing: ".08em", color: onDark ? "#99f6e4" : "#0f766e",
              background: onDark ? "rgba(45,212,191,.12)" : "#ccfbf1", border: `1px solid ${onDark ? "rgba(45,212,191,.3)" : "#99f6e4"}`,
            }}
          >
            {tag}
          </span>
        )}
      </span>
    </span>
  );
}
