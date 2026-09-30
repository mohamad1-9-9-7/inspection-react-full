// src/companies/exaltis/training/annualPlan/planUi.jsx
// Annual training plan — colours, styles and small stat blocks.
// (Split out of TrainingAnnualPlan.jsx — the code is unchanged.)

/* ===================== Design Tokens ===================== */
export const C = {
  bg0:    "#0b1120",
  bg1:    "#1e293b",
  bg2:    "#0f172a",
  card:   "#ffffff",
  navy:   "#0f172a",
  ink:    "#0f172a",
  sub:    "#475569",
  muted:  "#94a3b8",
  line:   "#e2e8f0",
  line2:  "#cbd5e1",
  band:   "#f8fafc",
  band2:  "#f1f5f9",
  blue:   "#2563eb",
  blueBg: "#dbeafe",
  green:  "#059669",
  greenBg:"#d1fae5",
  amber:  "#d97706",
  amberBg:"#fef3c7",
  red:    "#dc2626",
  redBg:  "#fee2e2",
  purple: "#7c3aed",
  purpleBg:"#ede9fe",
  indigo: "#4f46e5",
};

export const btn = (bg, color = "#fff", disabled = false) => ({
  background: disabled ? "#e5e7eb" : bg,
  color: disabled ? "#94a3b8" : color,
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  letterSpacing: 0.2,
  transition: "transform .12s ease, box-shadow .12s ease, opacity .12s",
  boxShadow: disabled ? "none" : "0 4px 12px rgba(15,23,42,0.10)",
});

export const inputSt = {
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  color: C.ink,
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 700,
};

/* ===================== Helpers ===================== */
export function statusPill(bg, color) {
  return {
    background: bg,
    color: "#000",
    border: `1px solid ${color}40`,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  };
}

export function StatBlock({ label, value, color, highlight }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 12px",
      borderRight: "1px solid rgba(255,255,255,0.10)",
      background: highlight ? "rgba(220,38,38,0.18)" : "transparent",
      minWidth: 64,
    }}>
      <span className="annual-plan-stat-value" style={{ fontSize: 16, fontWeight: 1000, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 9, fontWeight: 800, color: "#cbd5e1", letterSpacing: 0.4, textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </span>
    </div>
  );
}

export function MiniStat({ label, value, bg, fg }) {
  return (
    <div style={{
      background: bg,
      color: fg,
      padding: "4px 10px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 900,
      display: "flex",
      gap: 6,
      alignItems: "center",
    }}>
      <span style={{ fontSize: 13 }}>{value}</span>
      <span style={{ fontSize: 9, opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
    </div>
  );
}

export function legendChip(color, bg, dashed = false) {
  return {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 8,
    border: `${dashed ? "1.5px dashed" : "1.5px solid"} ${color}`,
    background: bg,
    color,
    fontWeight: 800,
    fontSize: 11,
  };
}

export const thBase = {
  color: "#fff",
  fontWeight: 1000,
  fontSize: 12,
  padding: "10px 6px",
  textAlign: "center",
  letterSpacing: 0.3,
};

export const tdBase = {
  padding: 6,
  borderBottom: `1px solid ${"#e2e8f0"}`,
  borderRight: `1px solid ${"#eef2f7"}`,
  verticalAlign: "stretch",
};
