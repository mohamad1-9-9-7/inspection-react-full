// src/pages/readiness/brand.jsx
// InspectPro's own mark for the public sales pages (/demo, /readiness).
// These pages sell the platform (INSPECT PRO), so they carry its mark, never a
// customer's logo. Pure SVG: sharp at any size, no image request.

import React from "react";

export function BrandMark({ size = 36 }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" style={{ flex: `0 0 ${size}px`, display: "block" }}>
      <defs>
        <linearGradient id={`bm-g-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2dd4bf" />
          <stop offset=".55" stopColor="#0d9488" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id={`bm-s-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".95" />
          <stop offset="1" stopColor="#fff" stopOpacity=".75" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill={`url(#bm-g-${id})`} />
      <rect x="1.5" y="1.5" width="45" height="45" rx="12.5" fill="none" stroke="#fff" strokeOpacity=".22" />
      {/* shield */}
      <path d="M24 9.5 35 13.6v9.1c0 7.4-4.7 12.9-11 15.8-6.3-2.9-11-8.4-11-15.8v-9.1L24 9.5Z" fill="none" stroke={`url(#bm-s-${id})`} strokeWidth="2.6" strokeLinejoin="round" />
      {/* check */}
      <path d="m18.6 23.9 3.9 3.9 7.4-7.6" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
