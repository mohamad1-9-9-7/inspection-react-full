// src/pages/shared/SignatureName.jsx
// 🖋️ Renders a person's name as a calligraphic "signature" without changing
// the text itself. Latin glyphs use Great Vibes, Arabic glyphs fall back to
// Aref Ruqaa (per-glyph font fallback — no script detection needed).
// Fonts are loaded in public/index.html.
//
// Usage:
//   <SignatureName label="Verified By" name={ftr?.verifiedBy} align="end" />
//   <SignatureName name={view?.signature?.signature} />            // value only
//   <SignatureName label="Checked By" name={x} inline />           // label beside

import React from "react";

const SIG_FONT = '"Great Vibes", "Aref Ruqaa", cursive';

export default function SignatureName({
  name,
  label,
  size = 30,                // signature glyph size (px)
  color = "#1e3a5f",        // ink colour
  underline = true,         // draw a signature baseline
  align = "start",          // "start" | "end" | "center" (when stacked)
  inline = false,           // label beside the signature instead of above
  style,                    // extra style merged onto the signature span
}) {
  const value = (name == null ? "" : String(name)).trim();

  const sig = (
    <span
      style={{
        fontFamily: SIG_FONT,
        fontSize: size,
        lineHeight: 1.15,
        color: value ? color : "#9ca3af",
        whiteSpace: "nowrap",
        ...(underline && {
          display: "inline-block",
          borderBottom: "1.5px solid #cbd5e1",
          paddingBottom: 2,
          minWidth: 110,
          textAlign: "center",
        }),
        ...style,
      }}
    >
      {value || " "}
    </span>
  );

  if (!label) return sig;

  const crossAlign =
    align === "end" ? "flex-end" : align === "center" ? "center" : "flex-start";

  return (
    <span
      style={{
        display: inline ? "inline-flex" : "flex",
        flexDirection: inline ? "row" : "column",
        alignItems: inline ? "baseline" : crossAlign,
        gap: inline ? 8 : 4,
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 13, color: "#64748b" }}>{label}</span>
      {sig}
    </span>
  );
}
