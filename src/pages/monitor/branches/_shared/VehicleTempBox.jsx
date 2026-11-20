// src/pages/monitor/branches/_shared/VehicleTempBox.jsx
// The single "Vehicle Temp (°C)" box shown above a receiving-log table
// (it used to be a column on every row). Read-only, or an input in edit mode.
import React from "react";

export default function VehicleTempBox({ value = "", editing = false, onChange, style }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 14px",
        margin: "0 0 10px",
        border: "1px solid #bae6fd",
        background: "#f0f9ff",
        borderRadius: 10,
        color: "#0b1f4d",
        fontWeight: 700,
        ...style,
      }}
    >
      <span aria-hidden="true">🚚</span>
      <span style={{ color: "#475569" }}>Vehicle Temp (°C):</span>
      {editing ? (
        <input
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="°C"
          style={{ width: 90, border: "1px solid #7dd3fc", borderRadius: 6, padding: "4px 8px", fontWeight: 800 }}
        />
      ) : (
        <span style={{ fontWeight: 900 }}>{String(value ?? "").trim() || "—"}</span>
      )}
    </div>
  );
}
