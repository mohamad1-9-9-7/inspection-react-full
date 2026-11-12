// src/pages/monitor/branches/ftr1/CreatorBadge.jsx
// "Created by" — who actually filled the sheet in (not necessarily the
// supervisor who signs Checked By). On the input sheet it is a box filled from
// the employee number; on the viewer it is a read-only chip.
import React from "react";

const CHIP = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontWeight: 700,
};

const BOX = {
  height: 36,
  boxSizing: "border-box",
  padding: "0 10px",
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "solid",
};

/** Viewer chip: 👤 Created by: Name · #123 */
export default function CreatorBadge({ name, empNo }) {
  return (
    <span title="The employee who created this report" style={CHIP}>
      <span aria-hidden="true">👤</span>
      <span style={{ color: "#64748b", fontWeight: 600 }}>Created by:</span>
      <span>{name || "—"}</span>
      {empNo ? <span style={{ color: "#64748b", fontWeight: 600 }}>· #{empNo}</span> : null}
    </span>
  );
}

/**
 * Employee-number picker: number box + the resolved name beside it (locked —
 * it can only come from the number). The name is plain text, not an input, so
 * a long name is shown in full instead of being cut off.
 * `name` is resolved by the parent; `unknown` marks a number not found.
 */
export function EmpNoField({ label, icon = "👤", empNo, name, unknown, onEmpNoChange, title }) {
  return (
    <div style={{ ...CHIP, padding: "6px 8px 6px 12px", borderRadius: 12, flexWrap: "wrap" }}>
      <span aria-hidden="true">{icon}</span>
      <span style={{ color: "#64748b", fontWeight: 600 }}>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        placeholder="Emp. No."
        value={empNo}
        onChange={(e) => onEmpNoChange(e.target.value)}
        title={unknown ? "Employee number not found in the Staff Directory" : title || "Employee number"}
        style={{
          ...BOX,
          width: 100,
          textAlign: "center",
          fontWeight: 700,
          borderColor: unknown || !empNo ? "#ef4444" : "#cbd5e1",
          background: unknown ? "#fef2f2" : "#fff",
        }}
      />
      <span
        title="Filled automatically from the employee number"
        style={{
          ...BOX,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          minWidth: 200,
          borderColor: "#e2e8f0",
          background: "#f1f5f9",
          color: name ? "#0f172a" : unknown ? "#dc2626" : "#94a3b8",
          fontWeight: name ? 700 : 500,
          whiteSpace: "nowrap",
        }}
      >
        <span aria-hidden="true" style={{ opacity: 0.6 }}>🔒</span>
        {name || (unknown ? "Not found" : "Name fills from the number")}
      </span>
    </div>
  );
}

/** Created by = EmpNoField with its fixed label. */
export function CreatorField(props) {
  return <EmpNoField label="Created by:" title="Your employee number" {...props} />;
}
