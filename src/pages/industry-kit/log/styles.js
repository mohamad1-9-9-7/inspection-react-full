// src/pages/industry-kit/log/styles.js
// Look of the log-sheet engine — the Mawashi teal family every company app uses.

export const ACCENT = "#0f766e";

export const S = {
  wrap: { minHeight: "100%", padding: "1.2rem clamp(.75rem,2.5vw,2rem)", background: "#f6f7fb", color: "#0f172a", fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif' },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1.1rem 1.2rem", marginBottom: 14, boxShadow: "0 8px 24px rgba(15,23,42,.05)" },
  h2: { margin: 0, fontSize: 21, fontWeight: 900 },
  h3: { margin: 0, fontSize: 15, fontWeight: 900, color: "#134e4a" },
  sub: { margin: "4px 0 0", color: "#64748b", fontWeight: 600, fontSize: 13 },
  label: { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 14, outline: "none", background: "#f8fafc", fontFamily: "inherit" },
  cell: { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 7px", fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit" },
  th: { border: "1px solid #cbd5e1", background: "#ecfdf5", color: "#134e4a", padding: "7px 6px", fontSize: 12, fontWeight: 800, textAlign: "left", whiteSpace: "nowrap" },
  td: { border: "1px solid #e2e8f0", padding: 4, verticalAlign: "top" },
  tdView: { border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: 13 },
  empty: { textAlign: "center", padding: 40, color: "#94a3b8", fontWeight: 700 },
  btn: (bg, color = "#fff") => ({ background: bg, color, border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }),
};

export const TONE = {
  ok: { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
  warn: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  fail: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
};

export const MARK = { ok: "✓", warn: "!", fail: "✕" };
