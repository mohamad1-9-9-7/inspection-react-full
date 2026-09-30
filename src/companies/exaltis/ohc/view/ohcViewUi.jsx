// src/companies/exaltis/ohc/view/ohcViewUi.jsx
// OHC view — form fields, select style and stat card.
// (Split out of OHCView.jsx — the code is unchanged.)
import { toIsoYMD } from "./ohcViewModel";

/* ========= Small UI helpers ========= */
export function Field({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      />
    </label>
  );
}

export function DateField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <input
        type="date"
        value={toIsoYMD(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      />
    </label>
  );
}

export function Select({ label, value, onChange, options }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const selectStyle = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.9)",
  background: "linear-gradient(135deg,#ffffff,#f1f5f9)",
  fontSize: 12,
  fontWeight: 600,
  color: "#0f172a",
  cursor: "pointer",
  outline: "none",
  minWidth: 200,
  maxWidth: 360,
  textOverflow: "ellipsis",
};

export function StatCard({ label, value, color, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 14,
        border: active
          ? `2px solid ${color}`
          : "1px solid rgba(148,163,184,0.6)",
        background: active
          ? `linear-gradient(135deg, ${color}15, ${color}30)`
          : "linear-gradient(135deg,#ffffff,#f8fafc)",
        cursor: "pointer",
        boxShadow: active
          ? `0 6px 18px ${color}55`
          : "0 2px 6px rgba(15,23,42,0.08)",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
    </button>
  );
}
