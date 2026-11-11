// D:\inspection-react-full\src\pages\BFS PIC EFST\certRowMenu.jsx
//
// "⋯" actions menu for a certificate row. Rendered position:fixed from the
// button's rect so the table's own scroll box never clips it.

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

export function RowMenu({ items, label = "More actions" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, up: false });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuH = menuRef.current ? menuRef.current.offsetHeight : 260;
    const menuW = 230;
    const up = r.bottom + menuH + 8 > window.innerHeight && r.top - menuH - 8 > 0;
    setPos({
      top: up ? r.top - menuH - 6 : r.bottom + 6,
      left: Math.max(8, Math.min(r.right - menuW, window.innerWidth - menuW - 8)),
      up,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type === "mousedown" && (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target))) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 30,
          height: 28,
          borderRadius: 8,
          border: open ? "1px solid #2563eb" : "1px solid #cbd5e1",
          background: open ? "#eff6ff" : "#fff",
          color: "#334155",
          fontWeight: 800,
          cursor: "pointer",
          lineHeight: 1,
          padding: 0,
          flex: "none",
        }}
      >
        ⋯
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 230,
            zIndex: 9000,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 16px 40px rgba(15,23,42,0.22)",
            padding: 6,
            direction: "ltr",
          }}
        >
          {items
            .filter((it) => it && !it.hidden)
            .map((it, i) =>
              it.divider ? (
                <div key={`d${i}`} style={{ height: 1, background: "#f1f5f9", margin: "5px 4px" }} />
              ) : (
                <button
                  key={it.key || it.label}
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  {...(it.deleteAction ? { "data-delete-action": "true" } : {})}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: 0,
                    background: "transparent",
                    color: it.danger ? "#b91c1c" : "#0f172a",
                    fontWeight: 600,
                    cursor: it.disabled ? "default" : "pointer",
                    opacity: it.disabled ? 0.5 : 1,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = it.danger ? "#fef2f2" : "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ width: 18, textAlign: "center", color: it.danger ? "#b91c1c" : it.color || "#475569" }}>{it.icon}</span>
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.badge ? (
                    <span style={{ padding: "1px 7px", borderRadius: 999, background: "#eef2ff", color: "#4338ca", fontWeight: 800 }}>{it.badge}</span>
                  ) : null}
                </button>
              )
            )}
        </div>
      )}
    </>
  );
}
