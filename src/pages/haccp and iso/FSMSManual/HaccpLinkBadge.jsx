// src/pages/haccp and iso/FSMSManual/HaccpLinkBadge.jsx
// Small badge that links any module to its related clause(s) in the HACCP Manual.
// Usage:
//   <HaccpLinkBadge clauses={["8.5", "8.5.4"]} label="HACCP Plan / CCP Monitoring" />

import React from "react";
import { useNavigate } from "react-router-dom";

const wrapStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
  marginTop: 4,
};

const baseStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 11px",
  borderRadius: 999,
  fontSize: 11.5,
  fontWeight: 900,
  color: "#854d0e",
  background: "linear-gradient(180deg, rgba(254,243,199,0.95), rgba(253,230,138,0.85))",
  border: "1.5px solid rgba(245,158,11,0.55)",
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
  boxShadow: "0 4px 10px rgba(245,158,11,0.16)",
  transition: "transform .12s ease, box-shadow .12s ease",
};

export default function HaccpLinkBadge({ clauses = [], label, hint, style }) {
  const navigate = useNavigate();
  const list = Array.isArray(clauses) ? clauses : [clauses];
  const primary = list[0] || "";

  function open(c) {
    const url = c
      ? `/haccp-iso/haccp-manual?section=${encodeURIComponent(c)}`
      : `/haccp-iso/haccp-manual`;
    navigate(url);
  }

  return (
    <div style={{ ...wrapStyle, ...(style || {}) }} title={hint || "View related HACCP Manual clause"}>
      <span
        role="button"
        tabIndex={0}
        onClick={() => open(primary)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open(primary)}
        style={baseStyle}
      >
        📕 HACCP Manual
        {label ? <> · <span style={{ fontWeight: 800 }}>{label}</span></> : null}
        {list.length > 0 && (
          <>
            {" · "}
            {list.map((c, i) => (
              <span
                key={c + i}
                onClick={(ev) => { ev.stopPropagation(); open(c); }}
                style={{
                  padding: "1px 7px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(180,83,9,0.35)",
                  fontWeight: 950,
                  fontSize: 10.5,
                  marginInlineStart: i === 0 ? 0 : 4,
                  cursor: "pointer",
                }}
              >
                {c}
              </span>
            ))}
          </>
        )}
      </span>
    </div>
  );
}
