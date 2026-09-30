// src/companies/exaltis/certs/view/certViewUi.jsx
// Certificates view — table styles and stat card.
// (Split out of CertView.jsx — the code is unchanged.)

export const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  borderBottom: "1px solid rgba(31,41,55,0.8)",
  position: "sticky",
  top: 0,
  zIndex: 1,
  fontWeight: 700,
  fontSize: 11,
  whiteSpace: "nowrap",
};

export const tdStyle = {
  padding: "6px 8px",
  borderBottom: "1px solid rgba(209,213,219,0.8)",
  color: "#111827",
  verticalAlign: "top",
  whiteSpace: "nowrap",
};

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
