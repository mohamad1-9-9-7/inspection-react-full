// src/companies/exaltis/training/admin/adminUi.jsx
// Training admin — shared styles and small controls.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { THEMES, COLORS } from "./adminModel";

/* ===================== Style helpers ===================== */
export function btnStyle(theme, variant = "default") {
  const T = THEMES[theme];
  const base = { padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, border: "none", fontFamily: "inherit", lineHeight: 1.3, transition: "all 0.15s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 };
  if (variant === "primary") return { ...base, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" };
  if (variant === "success") return { ...base, background: T.success, color: "#fff", boxShadow: `0 4px 12px ${T.success}40` };
  if (variant === "danger")  return { ...base, background: T.danger, color: "#fff", boxShadow: `0 4px 12px ${T.danger}40` };
  if (variant === "warning") return { ...base, background: T.warning, color: "#fff", boxShadow: `0 4px 12px ${T.warning}40` };
  if (variant === "ghost")   return { ...base, background: "transparent", color: T.text, border: `1px solid ${T.cardBorder}` };
  if (variant === "subtle")  return { ...base, background: T.chip, color: T.text };
  return { ...base, background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}` };
}

export function inputStyle(theme, multiline = false) {
  const T = THEMES[theme];
  const base = { width: "100%", borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.15s" };
  return multiline ? { ...base, minHeight: 72, resize: "vertical" } : base;
}

export function chipStyle(color = "indigo", small = false) {
  const c = COLORS[color] || COLORS.indigo;
  return { background: c.bg, color: c.fg, border: `1px solid ${c.border}`, padding: small ? "2px 8px" : "4px 10px", borderRadius: 99, fontSize: small ? 11 : 12, fontWeight: 800, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 };
}

export function cardStyle(theme, hover = false) {
  const T = THEMES[theme];
  return { background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, boxShadow: T.cardShadow, transition: "transform 0.15s, box-shadow 0.15s", ...(hover ? { cursor: "pointer" } : {}) };
}

export function Stat({ T, label, value, icon }) {
  return (
    <div style={{ flex: "1 0 140px", padding: 14, background: T.sectionBg, borderRadius: 12, border: `1px solid ${T.cardBorder}` }}>
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 900 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 1000, color: T.text }}>{value}</div>
        <div style={{ fontSize: 18 }}>{icon}</div>
      </div>
    </div>
  );
}

/* ===================== CMD+K ===================== */
export function CmdKModal({ T, theme, tt, search, setSearch, results, onClose }) {
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 20000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ background: T.cardBg, borderRadius: 14, boxShadow: "0 30px 80px rgba(0,0,0,0.4)", width: "min(640px,90%)", overflow: "hidden", border: `1px solid ${T.cardBorder}` }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${T.cardBorder}` }}>
          <input autoFocus style={{ ...inputStyle(theme), fontSize: 16, padding: "12px 14px" }} placeholder={`🔍 ${tt("search_modules_qs")}`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {results.length === 0 && search && <div style={{ padding: 30, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>{tt("no_matches")}</div>}
          {!search && (
            <div style={{ padding: 20, color: T.textSubtle, fontSize: 12, fontWeight: 800 }}>
              {tt("cmd_k_help")}<br />{tt("cmd_k_esc")}
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={r.action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${T.cardBorder}`, width: "100%", textAlign: "left", cursor: "pointer", color: T.text, fontFamily: "inherit" }}>
              <span style={chipStyle("indigo", true)}>{r.type}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 13 }}>{r.name}</span>
              <span style={{ color: T.textSubtle }}>↵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== Atoms ===================== */
export function Label({ children, T }) {
  return <div style={{ fontWeight: 900, fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{children}</div>;
}

export function Field({ T, label, hint, children }) {
  return (
    <div>
      <Label T={T}>{label}</Label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textSubtle, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

export function Toggle({ T, label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.sectionBg, borderRadius: 10, border: `1px solid ${T.cardBorder}`, cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#6366f1", width: 16, height: 16 }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{label}</span>
    </label>
  );
}
