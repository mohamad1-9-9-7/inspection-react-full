// src/pages/settings/_shared/ScaledDoc.jsx
// -----------------------------------------------------------------------------
// A live A4 page (794 × 1123 px) shrunk to whatever width its column has,
// like a PDF viewer — never a horizontal scrollbar, never cut off. Shared by
// the quotation editor and the invoice screens so both previews behave alike.
//
// `useContainerWidth` is the other half: editors decide between one and two
// columns from the space they are actually given (the Platform Center has a
// sidebar), not from the window width.
// -----------------------------------------------------------------------------

import React, { useEffect, useRef, useState } from "react";

export const A4_W = 794;
export const A4_H = 1123;

export function useContainerWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const read = () => setWidth(el.clientWidth || 0);
    read();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/* `pages` = how much of the page height to show (1 = the whole first page). */
export default function ScaledDoc({ html, title, onOpen, pages = 1 }) {
  const [box, width] = useContainerWidth();
  const scale = Math.min(1, (width || A4_W) / A4_W);
  return (
    <div
      ref={box}
      onClick={onOpen}
      title={onOpen ? title : undefined}
      style={{ ...S.frame, height: Math.round(A4_H * pages * scale), cursor: onOpen ? "zoom-in" : "default" }}
    >
      <iframe
        title={title}
        sandbox="allow-same-origin"
        srcDoc={html}
        scrolling="no"
        style={{ position: "absolute", left: 0, top: 0, width: A4_W, height: A4_H * pages, border: 0, display: "block", transform: `scale(${scale})`, transformOrigin: "top left", pointerEvents: onOpen ? "none" : "auto" }}
      />
    </div>
  );
}

const S = {
  /* the iframe is absolutely placed so its 794 px never widen the column
     (a grid/flex item would otherwise grow to fit it before it is scaled) */
  frame: {
    position: "relative", width: "100%", minWidth: 0, overflow: "hidden", borderRadius: 10, background: "#fff",
    border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(15,23,42,.06), 0 14px 34px rgba(15,23,42,.12)",
  },
};
