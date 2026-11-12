// src/pages/monitor/branches/ftr1/CreatorBadge.jsx
import React from "react";

/** 👤 "Created by" chip — shared look for the input sheet and the viewer. */
export default function CreatorBadge({ name }) {
  return (
    <span
      title="The account that created this report"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1e3a8a",
        fontWeight: 700,
      }}
    >
      <span aria-hidden="true">👤</span>
      <span style={{ color: "#64748b", fontWeight: 600 }}>Created by:</span>
      <span>{name || "—"}</span>
    </span>
  );
}
