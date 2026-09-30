// src/companies/exaltis/training/sessions/sessionsStyles.js
// Training sessions — theme and shared styles.
// (Extracted from TrainingSessionsList.jsx — the code is unchanged.)

export const THEME = {
  text: "#475569",
  textStrong: "#1e293b",
  muted: "#64748b",
  muted2: "#94a3b8",
  line: "#e5ecea",
  lineStrong: "#dbe4e2",
  glassBg: "#ffffff",
  glassBd: "#dbe4e2",
  glassShadow: "0 12px 30px rgba(15,23,42,.06)",
  surfaceBg: "#ffffff",
  surfaceBd: "#dbe4e2",
  surfaceShadow: "0 12px 30px rgba(15,23,42,.06)",
  inputBg: "#ffffff",
  inputBd: "#dbe4e2",
  inputPh: "#94a3b8",
  // ✅ Soft Sky header — light gradient, slate-blue text (no harsh dark)
  headerBg: "linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)",
  headerText: "#ffffff",
  headerSub: "rgba(255,255,255,.88)",
  headerLine: "rgba(255,255,255,.25)",
  // ✅ soft sub-surface tints (replace old dark navy fills)
  subBg: "#f4f8f7",
  subBg2: "#edf5f3",
  tableHeadBg: "#edf5f3",
};
export const pageStyle = {
  minHeight: "100vh",
  width: "100%",
  padding: "14px clamp(12px,2.4vw,28px) 22px",
  background: "linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)",
  boxSizing: "border-box",
  direction: "ltr",
  fontFamily: "Cairo, Arial, sans-serif",
  color: THEME.text,
};
export const glass = {
  background: THEME.glassBg,
  border: `1px solid ${THEME.glassBd}`,
  borderRadius: 6,
  boxShadow: THEME.glassShadow,
};
export const surface = {
  background: THEME.surfaceBg,
  border: `1px solid ${THEME.surfaceBd}`,
  borderRadius: 6,
  boxShadow: THEME.surfaceShadow,
};
export const btn = (kind = "light") => {
  const m = {
    dark:    { bg: "#0f766e",                fg: "#fff",    bd: "transparent" },
    light:   { bg: "#ffffff",                fg: "#0f766e", bd: "#dbe4e2" },
    blue:    { bg: "#0f766e",                fg: "#fff",    bd: "transparent" },
    red:     { bg: "#fef2f2",                fg: "#b91c1c", bd: "#fecaca" },
    violet:  { bg: "#f5f3ff",                fg: "#6d28d9", bd: "#e9d5ff" },
    green:   { bg: "#16a34a",                fg: "#fff",    bd: "transparent" },
    gray:    { bg: "#f1f5f9",                fg: "#475569", bd: "#e5e7eb" },
    warning: { bg: "#fffbeb",                fg: "#b45309", bd: "#fde68a" },
  };
  const c = m[kind] || m.light;
  return {
    padding: "9px 16px",
    borderRadius: 10,
    border: `1px solid ${c.bd}`,
    background: c.bg,
    color: c.fg,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.875rem",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    transition: "transform .12s ease, box-shadow .12s ease, filter .12s ease",
  };
};
export const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: `1px solid ${THEME.inputBd}`,
  outline: "none",
  fontWeight: 600,
  fontSize: "0.92rem",
  color: THEME.textStrong,
  background: THEME.inputBg,
  fontFamily: "inherit",
  boxShadow: "0 1px 2px rgba(16,24,40,.03)",
  transition: "border-color .12s ease, box-shadow .12s ease",
};
export const selectStyle = {
  padding: "9px 12px",
  borderRadius: 10,
  border: `1px solid ${THEME.inputBd}`,
  outline: "none",
  fontWeight: 700,
  fontSize: "0.85rem",
  color: THEME.textStrong,
  background: THEME.inputBg,
  fontFamily: "inherit",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(16,24,40,.03)",
};
export const fieldLabel = {
  fontSize: "0.68rem",
  fontWeight: 800,
  color: THEME.muted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: 4,
  display: "block",
};
export const TOP_EST = 372;
export const rightPanelHeight = `calc(100vh - ${TOP_EST}px)`;
