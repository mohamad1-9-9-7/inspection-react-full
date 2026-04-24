// src/pages/monitor/branches/production/_shared/productionTheme.js
// Design tokens and reusable style helpers for the Production section.

export const colors = {
  // Brand
  primary:        "#0f766e",   // deep teal — fresh & industrial
  primaryDark:    "#115e59",
  primaryLight:   "#14b8a6",
  primarySoft:    "#ccfbf1",

  // Neutral scale
  ink:            "#0f172a",
  inkMid:         "#1e293b",
  muted:          "#64748b",
  border:         "#e2e8f0",
  borderStrong:   "#cbd5e1",
  surface:        "#ffffff",
  canvas:         "#f8fafc",
  canvasAlt:      "#f1f5f9",

  // Accents
  amber:          "#d97706",
  amberSoft:      "#fef3c7",
  danger:         "#dc2626",
  dangerSoft:     "#fee2e2",
  success:        "#16a34a",
  successSoft:    "#dcfce7",
  info:           "#2563eb",
  infoSoft:       "#dbeafe",
};

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
};

export const shadows = {
  xs: "0 1px 2px rgba(15, 23, 42, 0.04)",
  sm: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
  md: "0 6px 16px rgba(15, 23, 42, 0.08)",
  lg: "0 14px 34px rgba(15, 23, 42, 0.12)",
};

export const fonts = {
  sans:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, SFMono-Regular, monospace",
};

/* ─── Reusable style objects ─── */

export const buttonBase = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  padding: "10px 16px",
  borderRadius: radii.md,
  fontFamily: fonts.sans,
  fontWeight: 700,
  fontSize: 13,
  letterSpacing: ".01em",
  cursor: "pointer",
  border: "1px solid transparent",
  transition: "transform .12s ease, box-shadow .2s ease, background .2s ease",
  whiteSpace: "nowrap",
};

export const btnPrimary = {
  ...buttonBase,
  background: colors.primary,
  color: "#fff",
  boxShadow: shadows.sm,
};

export const btnGhost = {
  ...buttonBase,
  background: "#fff",
  color: colors.inkMid,
  border: `1px solid ${colors.border}`,
};

export const btnDanger = {
  ...buttonBase,
  background: "#fff",
  color: colors.danger,
  border: `1px solid ${colors.dangerSoft}`,
};

export const btnSuccess = {
  ...buttonBase,
  background: colors.success,
  color: "#fff",
  boxShadow: shadows.sm,
};

export const inputBase = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: radii.sm,
  border: `1px solid ${colors.border}`,
  fontSize: 13,
  fontFamily: fonts.sans,
  color: colors.ink,
  background: "#fff",
  outline: "none",
  transition: "border .15s, box-shadow .15s",
};

export const cardBase = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radii.lg,
  boxShadow: shadows.sm,
};

export const sectionTitle = {
  fontSize: 12,
  fontWeight: 800,
  color: colors.muted,
  textTransform: "uppercase",
  letterSpacing: ".08em",
  marginBottom: 8,
};
