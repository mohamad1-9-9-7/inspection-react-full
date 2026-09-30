// src/companies/exaltis/reports/coolers/coolersStyles.js
// Cooler temperatures — styles of the entry screen.
// (Extracted from CoolersTab.js — the code is unchanged.)

export const remarksInputStyle = {
  width: 260,
  padding: "6px 10px",
  borderRadius: 8,
  border: "1.7px solid #94a3b8",
  background: "#ffffff",
  color: "#111827",
  fontWeight: 600,
  transition: "all .18s",
};
export const btnSave = {
  padding: "11px 22px",
  borderRadius: 10,
  cursor: "pointer",
  border: "none",
  fontWeight: 800,
  background: "#059669",
  color: "#fff",
  boxShadow: "0 4px 14px rgba(5,150,105,.28)",
};
export const sectionSubLabel = {
  fontSize: ".74rem",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".4px",
  marginBottom: 8,
  display: "block",
};
export const statusChip = (s) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 12px",
  borderRadius: 999,
  background: s.bg,
  color: s.color,
  fontWeight: 900,
  fontSize: ".82rem",
  whiteSpace: "nowrap",
});
export const rangeBadge = {
  padding: "3px 11px",
  borderRadius: 999,
  background: "#eef2ff",
  color: "#3730a3",
  fontWeight: 800,
  fontSize: ".78rem",
  border: "1px solid #c7d2fe",
  whiteSpace: "nowrap",
};
export const addMatchBtn = (accent) => ({
  padding: "7px 14px",
  borderRadius: 8,
  border: `1.5px solid ${accent}`,
  background: "#fff",
  color: accent,
  fontWeight: 800,
  cursor: "pointer",
  fontSize: ".85rem",
  whiteSpace: "nowrap",
});
export const mField = { display: "flex", flexDirection: "column", gap: 4 };
export const mLabel = {
  fontSize: ".7rem",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".3px",
};
export const mInput = {
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 700,
  boxSizing: "border-box",
};
export const mReadOnly = {
  padding: "7px 9px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  fontWeight: 800,
  textAlign: "center",
  boxSizing: "border-box",
};
export const delBtn = {
  alignSelf: "flex-end",
  border: "1px solid #fecaca",
  background: "#fff",
  color: "#dc2626",
  borderRadius: 8,
  width: 36,
  height: 36,
  fontWeight: 900,
  cursor: "pointer",
  lineHeight: 1,
};
