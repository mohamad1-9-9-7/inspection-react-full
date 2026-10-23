// src/pages/settings/_shared/devConsole.jsx
// 🖥️ "Dev console" look for the technical Settings tools (Backup & Restore):
// terminal windows with a title bar, monospace text, [x] checkboxes, log lines
// and an ASCII progress bar. Scoped to `.devc` so nothing leaks into other pages.
//
// globals.css forces `#root * { font-size: 14px !important }`, so every size
// here goes through a `#root .devc …` rule with !important (higher specificity
// wins) and scales with the Aa text-size menu via --app-fs.

import React from "react";

export const DEV = {
  bg:     "#0d1117",
  panel:  "#161b22",
  bar:    "#1c2128",
  line:   "#30363d",
  text:   "#c9d1d9",
  muted:  "#8b949e",
  green:  "#3fb950",
  cyan:   "#58a6ff",
  purple: "#d2a8ff",
  orange: "#ffa657",
  red:    "#f85149",
  yellow: "#e3b341",
  mono:   '"JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace',
};

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;

const CSS = `
#root .devc { font-family: ${DEV.mono}; }
#root .devc .devc-h1   { font-size: ${fs(22)}; }
#root .devc .devc-sm   { font-size: ${fs(12)}; }
#root .devc .devc-xs   { font-size: ${fs(11)}; }
#root .devc .devc-cursor { display:inline-block; width:.6em; height:1.1em; background:${DEV.green};
  vertical-align:text-bottom; margin-inline-start:4px; animation: devc-blink 1.1s steps(1) infinite; }
@keyframes devc-blink { 50% { opacity: 0; } }
#root .devc .devc-row:hover { background: rgba(88,166,255,.08); }
#root .devc .devc-btn:not(:disabled):hover { filter: brightness(1.18); box-shadow: 0 0 0 1px currentColor inset; }
#root .devc .devc-chip:hover { border-color: ${DEV.cyan} !important; color: ${DEV.cyan} !important; }
#root .devc input[type="date"], #root .devc textarea { color-scheme: dark; }
#root .devc ::-webkit-scrollbar { width: 8px; height: 8px; }
#root .devc ::-webkit-scrollbar-thumb { background: ${DEV.line}; border-radius: 8px; }
#root .devc code { font-family: ${DEV.mono}; }
`;

/** Mount once at the top of a dev-console page. */
export function DevStyles() {
  return <style>{CSS}</style>;
}

export const devInput = {
  background: DEV.bg,
  color: DEV.text,
  border: `1px solid ${DEV.line}`,
  borderRadius: 6,
  padding: "7px 10px",
  fontFamily: DEV.mono,
  outline: "none",
};

/** A terminal window: traffic-light dots + a file-name title bar. */
export function Terminal({ file, title, right, accent = DEV.cyan, children, style }) {
  return (
    <section
      style={{
        background: DEV.panel,
        border: `1px solid ${DEV.line}`,
        borderRadius: 10,
        marginBottom: 16,
        overflow: "hidden",
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "8px 14px", background: DEV.bar, borderBottom: `1px solid ${DEV.line}`,
        }}
      >
        <span dir="ltr" style={{ display: "inline-flex", gap: 6 }} aria-hidden="true">
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
        </span>
        {file && <code dir="ltr" className="devc-sm" style={{ color: accent }}>{file}</code>}
        {title && <span style={{ color: DEV.text, fontWeight: 700 }}>{title}</span>}
        {right && <span style={{ marginInlineStart: "auto", color: DEV.muted }} className="devc-sm">{right}</span>}
      </div>
      <div style={{ padding: 16, color: DEV.text }}>{children}</div>
    </section>
  );
}

/** `$ command` prompt line. */
export function Prompt({ cmd, children }) {
  return (
    <div style={{ margin: "2px 0", lineHeight: 1.8 }}>
      <span dir="ltr" style={{ color: DEV.green }}>➜ </span>
      <code dir="ltr" style={{ color: DEV.cyan }}>{cmd}</code>
      {children && <span style={{ color: DEV.muted }}> {children}</span>}
    </div>
  );
}

const TONES = {
  run:    { color: "#0d1117", background: DEV.green,  border: `1px solid ${DEV.green}` },
  ghost:  { color: DEV.text,  background: "transparent", border: `1px solid ${DEV.line}` },
  danger: { color: "#fff",    background: "#da3633",  border: "1px solid #da3633" },
  info:   { color: "#0d1117", background: DEV.cyan,   border: `1px solid ${DEV.cyan}` },
};

export function DevButton({ tone = "ghost", disabled, children, style, ...props }) {
  return (
    <button
      type="button"
      className="devc-btn"
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "8px 14px", borderRadius: 6, fontWeight: 700,
        fontFamily: DEV.mono, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1, transition: "filter .15s, box-shadow .15s",
        ...TONES[tone], ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/** Flag-style chip: `--full`. */
export function DevChip({ flag, children, onClick }) {
  return (
    <button
      type="button"
      className="devc-chip"
      onClick={onClick}
      style={{
        display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
        padding: "8px 12px", borderRadius: 8, cursor: "pointer",
        background: DEV.bg, color: DEV.text, border: `1px solid ${DEV.line}`,
        fontFamily: DEV.mono, transition: "border-color .15s, color .15s",
      }}
    >
      <code dir="ltr" style={{ color: DEV.orange }}>{flag}</code>
      <span className="devc-xs" style={{ color: DEV.muted }}>{children}</span>
    </button>
  );
}

/** `[x]` checkbox: a real checkbox for keyboard/screen readers, drawn as text. */
export function DevCheck({ checked, indeterminate, onChange, children, style }) {
  const mark = checked ? "x" : indeterminate ? "~" : " ";
  return (
    <label className="devc-row" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", borderRadius: 4, padding: "2px 4px", ...style }}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />
      <code dir="ltr" style={{ color: checked ? DEV.green : indeterminate ? DEV.yellow : DEV.muted, whiteSpace: "pre" }}>
        [{mark}]
      </code>
      {children}
    </label>
  );
}

/** `[ OK ]` / `[ERR ]` style log line. */
export function LogLine({ kind = "info", children }) {
  const map = {
    ok:   ["[ OK ]", DEV.green],
    err:  ["[ERR ]", DEV.red],
    warn: ["[WARN]", DEV.yellow],
    info: ["[INFO]", DEV.cyan],
  };
  const [tag, color] = map[kind] || map.info;
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.7 }}>
      <code dir="ltr" style={{ color, fontWeight: 700, whiteSpace: "pre", flexShrink: 0 }}>{tag}</code>
      <span style={{ color: DEV.text }}>{children}</span>
    </div>
  );
}

/** `[██████░░░░] 12/40` */
export function AsciiProgress({ current, total, width = 28 }) {
  if (!total) return null;
  const done = Math.max(0, Math.min(width, Math.round((current / total) * width)));
  const pct = Math.round((current / total) * 100);
  return (
    <code dir="ltr" style={{ color: DEV.green, whiteSpace: "pre" }}>
      [{"█".repeat(done)}<span style={{ color: DEV.line }}>{"░".repeat(width - done)}</span>] {current}/{total} · {pct}%
    </code>
  );
}
