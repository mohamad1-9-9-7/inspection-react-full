// src/pages/haccp and iso/Kitchen/kitchenUI.js
// Design system for the Kitchen modules — "Soft Sky" light palette, 18 px base type.
//
// Type sizes are expressed against the `--kt-base` custom property that
// `shell()` puts on the page root, so one value drives every screen.

import React from "react";

export const BASE_FONT_PX = 18;

export const UI = {
  // ── surfaces & text ──
  canvas: "#f4f8fd",
  surface: "#ffffff",
  surfaceAlt: "#f7fafd",
  line: "#e6edf6",
  lineStrong: "#cfdcec",
  ink: "#1e293b",
  inkSoft: "#475569",
  inkMuted: "#94a3b8",

  // ── accents (gentle pastels, no dark fills) ──
  accent: "#2f6fed",
  accentInk: "#1d4ed8",
  accentSoft: "#eaf1fe",
  mint: "#0f9b8e",
  mintInk: "#0b7c71",
  mintSoft: "#e8f8f5",
  amber: "#b26a00",
  amberSoft: "#fdf5e6",
  rose: "#c2415a",
  roseSoft: "#fdeef1",
  sky: "#0e7490",
  skySoft: "#e7f6fb",

  // ── shape ──
  r: { sm: 10, md: 14, lg: 18, pill: 999 },
  shadow: {
    card: "0 1px 2px rgba(15,23,42,0.04), 0 10px 28px rgba(15,23,42,0.05)",
    raised: "0 2px 4px rgba(15,23,42,0.05), 0 18px 44px rgba(15,23,42,0.09)",
    inset: "inset 0 1px 0 rgba(255,255,255,0.7)",
  },
  font: '"Cairo", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Consolas, monospace',
};

/** Font sizes relative to the page base (18 px × user scale). */
export const FS = {
  xxs: "calc(var(--kt-base) * 0.66)",
  xs: "calc(var(--kt-base) * 0.75)",
  sm: "calc(var(--kt-base) * 0.86)",
  base: "var(--kt-base)",
  md: "calc(var(--kt-base) * 1.12)",
  lg: "calc(var(--kt-base) * 1.34)",
  xl: "calc(var(--kt-base) * 1.7)",
  xxl: "calc(var(--kt-base) * 2.15)",
};

/* ───────────────────────── layout ───────────────────────── */

/** Root style for a Kitchen page. Publishes `--kt-base` for every child. */
export function shell(dir, basePx) {
  return {
    "--kt-base": `${basePx}px`,
    direction: dir,
    minHeight: "100vh",
    boxSizing: "border-box",
    padding: "20px clamp(14px, 2.6vw, 40px) 56px",
    background: `linear-gradient(180deg, ${UI.canvas} 0%, #ffffff 62%)`,
    color: UI.ink,
    fontFamily: UI.font,
    fontSize: FS.base,
    lineHeight: 1.55,
  };
}

export const layout = { width: "min(1560px, 100%)", margin: "0 auto" };

/* ───────────────────────── primitives ───────────────────────── */

const BTN_TONES = {
  primary: { bg: UI.accent, fg: "#fff", bd: UI.accent },
  success: { bg: UI.mint, fg: "#fff", bd: UI.mint },
  danger: { bg: UI.rose, fg: "#fff", bd: UI.rose },
  soft: { bg: UI.accentSoft, fg: UI.accentInk, bd: "transparent" },
  ghost: { bg: UI.surface, fg: UI.inkSoft, bd: UI.lineStrong },
};

export function btn(variant = "ghost", extra) {
  const c = BTN_TONES[variant] || BTN_TONES.ghost;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: c.bg,
    color: c.fg,
    border: `1px solid ${c.bd}`,
    padding: "10px 18px",
    borderRadius: UI.r.pill,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: FS.sm,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    transition: "filter .15s ease, box-shadow .15s ease",
    ...extra,
  };
}

export function Btn({ variant = "ghost", style, children, ...rest }) {
  return (
    <button type="button" style={btn(variant, style)} {...rest}>
      {children}
    </button>
  );
}

export const card = {
  background: UI.surface,
  border: `1px solid ${UI.line}`,
  borderRadius: UI.r.lg,
  boxShadow: UI.shadow.card,
  padding: "clamp(16px, 1.8vw, 24px)",
  marginBottom: 16,
};

export function CardHead({ eyebrow, title, right }) {
  return (
    <div style={cardHeadStyles.wrap}>
      <div style={{ minWidth: 0 }}>
        {eyebrow && <div style={cardHeadStyles.eyebrow}>{eyebrow}</div>}
        <h2 style={cardHeadStyles.title}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

const cardHeadStyles = {
  wrap: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
    paddingBottom: 14,
    marginBottom: 18,
    borderBottom: `1px solid ${UI.line}`,
  },
  eyebrow: {
    fontSize: FS.xxs,
    fontWeight: 900,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    color: UI.inkMuted,
    marginBottom: 6,
  },
  title: { margin: 0, fontSize: FS.md, fontWeight: 900, color: UI.ink, lineHeight: 1.25 },
};

const CHIP_TONES = {
  neutral: { bg: UI.surfaceAlt, fg: UI.inkSoft, bd: UI.line },
  info: { bg: UI.accentSoft, fg: UI.accentInk, bd: "#d5e4fd" },
  good: { bg: UI.mintSoft, fg: UI.mintInk, bd: "#c8ece6" },
  warn: { bg: UI.amberSoft, fg: UI.amber, bd: "#f2e0bd" },
  bad: { bg: UI.roseSoft, fg: UI.rose, bd: "#f6d3db" },
  sky: { bg: UI.skySoft, fg: UI.sky, bd: "#cbe9f3" },
};

export function chip(tone = "neutral", extra) {
  const c = CHIP_TONES[tone] || CHIP_TONES.neutral;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: FS.xxs,
    fontWeight: 900,
    padding: "4px 10px",
    borderRadius: UI.r.pill,
    background: c.bg,
    color: c.fg,
    border: `1px solid ${c.bd}`,
    whiteSpace: "nowrap",
    ...extra,
  };
}

export function Chip({ tone, style, children }) {
  return <span style={chip(tone, style)}>{children}</span>;
}

/* ───────────────────────── form controls ───────────────────────── */

export const label = {
  display: "block",
  fontSize: FS.xs,
  fontWeight: 800,
  color: UI.inkSoft,
  marginBottom: 7,
};

export function control(invalid) {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    border: `1.5px solid ${invalid ? "#eaa9b6" : UI.lineStrong}`,
    borderRadius: UI.r.sm,
    fontSize: FS.sm,
    fontWeight: 700,
    fontFamily: "inherit",
    color: UI.ink,
    background: invalid ? UI.roseSoft : UI.surface,
    outline: "none",
  };
}

export const textarea = {
  ...control(false),
  minHeight: 76,
  resize: "vertical",
  lineHeight: 1.6,
  fontWeight: 600,
};

export const hint = {
  fontSize: FS.xs,
  color: UI.inkMuted,
  marginTop: 6,
  lineHeight: 1.55,
  fontWeight: 600,
};

export function Field({ label: text, hint: hintText, error, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <label style={label}>{text}</label>
      {children}
      {error ? <div style={{ ...hint, color: UI.rose, fontWeight: 800 }}>{error}</div> : null}
      {hintText && !error ? <div style={hint}>{hintText}</div> : null}
    </div>
  );
}

export const grid = {
  two: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 },
  three: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 },
  auto: (min = 220) => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${min}px), 1fr))`,
    gap: 16,
  }),
};

/* ───────────────────────── tables ───────────────────────── */

export const table = {
  wrap: { overflowX: "auto", borderRadius: UI.r.md, border: `1px solid ${UI.line}` },
  el: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: FS.sm,
    minWidth: 560,
    background: UI.surface,
  },
  th: {
    textAlign: "start",
    padding: "13px 16px",
    background: UI.surfaceAlt,
    color: UI.inkSoft,
    fontWeight: 900,
    fontSize: FS.xxs,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderBottom: `1px solid ${UI.line}`,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "13px 16px",
    borderBottom: `1px solid ${UI.line}`,
    verticalAlign: "middle",
    color: UI.ink,
    fontWeight: 600,
  },
  num: {
    fontVariantNumeric: "tabular-nums",
    textAlign: "end",
    whiteSpace: "nowrap",
    fontWeight: 800,
  },
};

/* ───────────────────────── tabs ───────────────────────── */

export const tabs = {
  wrap: {
    display: "inline-flex",
    gap: 4,
    padding: 5,
    borderRadius: UI.r.pill,
    background: UI.surfaceAlt,
    border: `1px solid ${UI.line}`,
    maxWidth: "100%",
    overflowX: "auto",
  },
  tab: (active) => ({
    padding: "9px 18px",
    borderRadius: UI.r.pill,
    border: "none",
    background: active ? UI.surface : "transparent",
    color: active ? UI.accentInk : UI.inkSoft,
    boxShadow: active ? "0 1px 3px rgba(15,23,42,0.10)" : "none",
    fontWeight: 900,
    fontSize: FS.sm,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
  }),
};

/* ───────────────────────── notices ───────────────────────── */

export function notice(tone = "info") {
  const c = CHIP_TONES[tone] || CHIP_TONES.neutral;
  return {
    padding: "14px 16px",
    borderRadius: UI.r.md,
    background: c.bg,
    color: c.fg,
    border: `1px solid ${c.bd}`,
    fontSize: FS.sm,
    fontWeight: 700,
    lineHeight: 1.65,
  };
}

export const muted = {
  padding: "40px 20px",
  textAlign: "center",
  color: UI.inkMuted,
  fontWeight: 700,
  fontSize: FS.sm,
};
