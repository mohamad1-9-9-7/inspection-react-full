// src/pages/maintenance/useFontScale.js
// Shared "enlarge text" (zoom) control for the Maintenance pages.
// Uses CSS `zoom` on a wrapper — robust with the module's inline px styles
// (the app runs in Electron/Chrome where `zoom` is supported).
import React, { useCallback, useEffect, useState } from "react";

const KEY = "mnt_font_scale";
const MIN = 1;
const MAX = 1.6;
const STEP = 0.1;

const clamp = (n) => Math.min(MAX, Math.max(MIN, Math.round(n * 10) / 10));

export function useFontScale() {
  const [scale, setScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(KEY) || "1");
      return Number.isFinite(v) ? clamp(v) : 1;
    } catch {
      return 1;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(scale));
    } catch {}
  }, [scale]);

  const inc = useCallback(() => setScale((s) => clamp(s + STEP)), []);
  const dec = useCallback(() => setScale((s) => clamp(s - STEP)), []);
  const reset = useCallback(() => setScale(1), []);

  return { scale, inc, dec, reset, isMin: scale <= MIN, isMax: scale >= MAX };
}

/** Compact A- / % / A+ control. `dark` = light text for dark headers. */
export function FontScaleControl({ scale, inc, dec, reset, isMin, isMax, dark }) {
  const wrap = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    background: dark ? "rgba(255,255,255,0.16)" : "#fff",
    border: `1px solid ${dark ? "rgba(255,255,255,0.35)" : "#cbd5e1"}`,
    borderRadius: 10,
    padding: 3,
  };
  const btn = (disabled) => ({
    border: "none",
    background: "transparent",
    color: dark ? "#fff" : "#334155",
    fontWeight: 900,
    fontSize: 14,
    lineHeight: 1,
    padding: "6px 9px",
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  });
  return (
    <div style={wrap} title="تكبير / تصغير الخط — Text size" dir="ltr">
      <button type="button" onClick={dec} disabled={isMin} style={btn(isMin)} aria-label="تصغير الخط">
        A−
      </button>
      <button
        type="button"
        onClick={reset}
        style={{
          ...btn(false),
          fontSize: 11,
          minWidth: 40,
          color: dark ? "#fff" : "#0f172a",
        }}
        aria-label="حجم افتراضي"
      >
        {Math.round(scale * 100)}%
      </button>
      <button type="button" onClick={inc} disabled={isMax} style={btn(isMax)} aria-label="تكبير الخط">
        A+
      </button>
    </div>
  );
}
