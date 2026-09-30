// src/companies/exaltis/reports/personalHygiene/phStyles.js
// Personal Hygiene — table and input styles.
// (Split out of PersonalHygieneTab.js — the code is unchanged.)

export const th = (w) => ({
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.85rem",
  width: w,
});

export const td = () => ({ padding: "6px", border: "1px solid #ccc", textAlign: "center" });

export const inp = (w) => ({
  width: w,
  maxWidth: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
});

export const sel = (w) => ({
  width: w,
  maxWidth: "100%",
  padding: "6px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  boxSizing: "border-box",
});
