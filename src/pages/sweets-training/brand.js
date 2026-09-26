// src/pages/sweets-training/brand.js
// Who the training documents belong to. Never a hardcoded company: the name
// comes from the signed-in account (or the super-admin's picked company), and
// the mark is drawn from its initials — no other company's logo file.
import React from "react";
import { getActiveCompanyName } from "../../utils/companyContext";

export function companyName() {
  return getActiveCompanyName() || "";
}

/** Text to show where a company line belongs; falls back to a neutral label. */
export function companyLine(suffix = "") {
  const n = companyName();
  if (!n) return suffix || "";
  return suffix ? `${n} — ${suffix}` : n;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "🎓";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

/** Square badge with the company's initials, in place of a logo image. */
export function CompanyMark({ size = 48, name, style }) {
  const label = initials(name ?? companyName());
  return (
    <div
      aria-hidden="true"
      style={{
        width: size, height: size, flex: "0 0 auto", borderRadius: Math.round(size / 5),
        display: "grid", placeItems: "center",
        background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff",
        fontWeight: 900, fontSize: Math.round(size * 0.38), letterSpacing: ".02em",
        fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
        ...style,
      }}
    >
      {label}
    </div>
  );
}
