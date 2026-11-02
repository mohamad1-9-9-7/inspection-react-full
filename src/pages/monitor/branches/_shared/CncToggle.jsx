// src/pages/monitor/branches/_shared/CncToggle.jsx
// Two big tap buttons — ✓ C / ✗ NC — in place of a C/NC dropdown: one tap
// instead of open-list-then-pick, and the state reads at a glance. Tapping the
// lit button again clears it back to empty.
import React from "react";

const BASE = {
  flex: 1,
  minWidth: 0,
  padding: "7px 0",
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#64748b",
  fontWeight: 800,
  cursor: "pointer",
  lineHeight: 1.1,
  whiteSpace: "nowrap",
};

const ON = {
  C:  { background: "#16a34a", borderColor: "#16a34a", color: "#fff" },
  NC: { background: "#dc2626", borderColor: "#dc2626", color: "#fff" },
};

export default function CncToggle({ value = "", onChange, disabled = false, minWidth = 96 }) {
  const pick = (v) => { if (!disabled) onChange(value === v ? "" : v); };
  return (
    <div role="group" style={{ display: "flex", minWidth, opacity: disabled ? 0.5 : 1 }}>
      <button type="button" disabled={disabled} aria-pressed={value === "C"} onClick={() => pick("C")}
        style={{ ...BASE, borderRadius: "8px 0 0 8px", ...(value === "C" ? ON.C : null) }}>
        ✓ C
      </button>
      <button type="button" disabled={disabled} aria-pressed={value === "NC"} onClick={() => pick("NC")}
        style={{ ...BASE, borderRadius: "0 8px 8px 0", borderInlineStart: 0, ...(value === "NC" ? ON.NC : null) }}>
        ✗ NC
      </button>
    </div>
  );
}
