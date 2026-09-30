// src/companies/exaltis/reports/dailyLog/logStyles.jsx
// Daily log engine — shared styles, tones and the status pill.
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)

/* ───────── styles (Mawashi teal) ───────── */
export const ACCENT = "#0f766e";

export const S = {
  wrap: { minHeight: "100%", padding: "1.2rem clamp(.75rem,2.5vw,2rem)", background: "#f6f7fb", color: "#0f172a", fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif' },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1.1rem 1.2rem", marginBottom: 14, boxShadow: "0 8px 24px rgba(15,23,42,.05)" },
  h2: { margin: 0, fontSize: 21, fontWeight: 900 },
  sub: { margin: "4px 0 0", color: "#64748b", fontWeight: 600, fontSize: 13 },
  label: { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 5 },
  input: { width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "8px 10px", fontSize: 14, outline: "none", background: "#f8fafc", fontFamily: "inherit" },
  cell: { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 7, padding: "6px 7px", fontSize: 13, outline: "none", background: "#fff", fontFamily: "inherit" },
  th: { border: "1px solid #cbd5e1", background: "#ecfdf5", color: "#134e4a", padding: "7px 6px", fontSize: 12, fontWeight: 800, textAlign: "left", whiteSpace: "nowrap" },
  td: { border: "1px solid #e2e8f0", padding: 4, verticalAlign: "top" },
  tdView: { border: "1px solid #e2e8f0", padding: "6px 8px", fontSize: 13 },
  btn: (bg, color = "#fff") => ({ background: bg, color, border: "none", borderRadius: 10, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }),
};

export const TONE = {
  ok: { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
  warn: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  fail: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
};

export function StatusPill({ status }) {
  if (!status) return <span style={{ color: "#cbd5e1" }}>—</span>;
  const t = TONE[status.level] || TONE.ok;
  return (
    <span style={{ display: "inline-block", background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, borderRadius: 999, padding: "3px 9px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {status.level === "ok" ? "✓ " : status.level === "warn" ? "! " : "✕ "}{status.text}
    </span>
  );
}

export const Hint = ({ c }) => (c.hint ? <span style={{ display: "block", fontWeight: 700, color: "#0f766e", opacity: 0.8 }}>{c.hint}</span> : null);
