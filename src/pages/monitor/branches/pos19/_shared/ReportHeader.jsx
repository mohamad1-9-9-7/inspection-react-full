// src/pages/monitor/branches/pos19/_shared/ReportHeader.jsx
// Shared header component for POS 19 input forms
// Usage: <ReportHeader title="..." subtitle="..." titleAr="..." fields={[...]} />

import React from "react";

/**
 * ReportHeader — shared gradient banner + grid of fields
 *
 * Props:
 *  - title       (string)          — main English title
 *  - subtitle    (string, opt)     — smaller text under title (e.g. Restaurant)
 *  - titleAr     (string, opt)     — Arabic subtitle shown on the right
 *  - fields      (array, required) — list of header fields to render in grid
 *
 * Each field in `fields` is an object:
 *  - label   (string)   — label shown above the cell
 *  - value   (any)      — current value
 *  - onChange(fn, opt)  — if provided, renders an input; if omitted, renders read-only
 *  - type    (string, opt) — "date" | "text" (default "text")
 *  - placeholder (string, opt)
 *
 * Layout: auto 5 columns on desktop, responsive below.
 */
export default function ReportHeader({
  title,
  subtitle,
  titleAr,
  fields = [],
}) {
  const headerCell = {
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 8, padding: "8px 10px",
    display: "flex", flexDirection: "column", gap: 4,
  };
  const headerLabel = {
    fontSize: 10, fontWeight: 700, color: "#2563eb",
    textTransform: "uppercase", letterSpacing: ".05em",
  };
  const headerValueStatic = {
    fontSize: 13, fontWeight: 700, color: "#0b1f4d",
    background: "#fff", border: "1px solid #1f3b70",
    borderRadius: 4, padding: "4px 6px", minHeight: 24,
  };
  const headerInput = {
    fontSize: 13, fontWeight: 600, color: "#0b1f4d",
    background: "#fff", border: "1px solid #1f3b70",
    borderRadius: 4, padding: "4px 6px", width: "100%",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <>
      {/* Gradient banner */}
      <div style={{
        marginBottom: 14, padding: "12px 14px",
        background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
        borderRadius: 10, color: "#fff",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
            {subtitle ? (
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3 }}>{subtitle}</div>
            ) : null}
          </div>
          {titleAr ? (
            <div style={{
              fontSize: 13, color: "#fef3c7",
              direction: "rtl", fontWeight: 600,
            }}>
              {titleAr}
            </div>
          ) : null}
        </div>
      </div>

      {/* Fields grid */}
      {fields.length ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10, marginBottom: 14, fontSize: 12,
        }}>
          {fields.map((f, i) => (
            <div key={i} style={headerCell}>
              <div style={headerLabel}>{f.label}</div>
              {typeof f.onChange === "function" ? (
                <input
                  type={f.type || "text"}
                  value={f.value ?? ""}
                  onChange={(e) => f.onChange(e.target.value)}
                  placeholder={f.placeholder || ""}
                  style={headerInput}
                />
              ) : (
                <div style={headerValueStatic}>{f.value || "—"}</div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
