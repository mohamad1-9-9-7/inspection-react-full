import React from "react";

export const ui = {
  page: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Cairo, sans-serif',
    color: "#0f172a",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  eyebrow: {
    margin: 0,
    color: "#0f766e",
    fontWeight: 1000,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "6px 0 0",
    color: "#0f172a",
    fontWeight: 1000,
    lineHeight: 1.1,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#64748b",
    fontWeight: 750,
    lineHeight: 1.5,
    maxWidth: 860,
  },
  card: {
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 18,
    marginBottom: 16,
  },
  subtleCard: {
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 14,
  },
  input: {
    width: "100%",
    minHeight: 44,
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 800,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  label: {
    display: "block",
    marginBottom: 6,
    color: "#475569",
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  tableWrap: {
    overflow: "auto",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "#fff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "10px 12px",
    textAlign: "start",
    color: "#475569",
    background: "#f8fafc",
    borderBottom: "1px solid rgba(15,23,42,0.10)",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(15,23,42,0.07)",
    color: "#334155",
    fontWeight: 750,
    verticalAlign: "middle",
  },
};

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div style={ui.header}>
      <div>
        {eyebrow && <p style={ui.eyebrow}>{eyebrow}</p>}
        <h2 style={ui.title}>{title}</h2>
        {subtitle && <p style={ui.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

export function Button({ tone = "secondary", disabled, children, style, ...props }) {
  const tones = {
    primary: { background: "#0f766e", color: "#fff", border: "1px solid #0f766e" },
    secondary: { background: "#fff", color: "#0f172a", border: "1px solid rgba(15,23,42,0.14)" },
    muted: { background: "#f1f5f9", color: "#334155", border: "1px solid rgba(15,23,42,0.10)" },
    danger: { background: "#dc2626", color: "#fff", border: "1px solid #dc2626" },
    warning: { background: "#f59e0b", color: "#fff", border: "1px solid #f59e0b" },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        minHeight: 42,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "9px 16px",
        borderRadius: 8,
        fontWeight: 950,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.58 : 1,
        fontFamily: "inherit",
        ...tones[tone],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusMessage({ message }) {
  if (!message) return null;
  const text = typeof message === "string" ? message : message.text;
  const kind = typeof message === "string"
    ? (message.startsWith("✅") ? "ok" : message.startsWith("❌") ? "err" : "info")
    : message.kind;
  return (
    <div
      style={{
        ...ui.card,
        marginBottom: 16,
        background: kind === "ok" ? "#f0fdf4" : kind === "err" ? "#fef2f2" : "#eff6ff",
        borderColor: kind === "ok" ? "#86efac" : kind === "err" ? "#fca5a5" : "#bfdbfe",
        color: kind === "ok" ? "#065f46" : kind === "err" ? "#991b1b" : "#1e40af",
        fontWeight: 850,
      }}
    >
      {text}
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        zIndex: 10000,
        backdropFilter: "blur(6px)",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: "min(460px, 100%)",
          background: "#fff",
          borderRadius: 8,
          border: "1px solid rgba(15,23,42,0.14)",
          boxShadow: "0 28px 70px rgba(15,23,42,0.28)",
          padding: 22,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 style={{ margin: 0, color: "#0f172a", fontWeight: 1000 }}>{title}</h3>
        {body && <p style={{ margin: "12px 0 20px", color: "#64748b", lineHeight: 1.6, fontWeight: 750 }}>{body}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <Button tone="secondary" onClick={onCancel}>{cancelText}</Button>
          <Button tone={tone} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}
