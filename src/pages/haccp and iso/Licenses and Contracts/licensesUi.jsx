// src/pages/haccp and iso/Licenses and Contracts/licensesUi.jsx
//
// The two dropdowns of the Licenses & Contracts pages:
//   • SmartSelect — a picker for filters: icon/dot + label + count per option,
//     a search box once the list is long, keyboard (↑ ↓ Enter Esc), a ✕ to go
//     back to "All".
//   • ComboInput  — free text WITH suggestions (license name, contract type,
//     company, branch): filters as you type, highlights the match, shows how
//     many records already use each value, keyboard like above.
import React, { useEffect, useMemo, useRef, useState } from "react";

const C = { ink: "#0f172a", sub: "#64748b", faint: "#94a3b8", line: "#e2e8f0", soft: "#f8fafc", brand: "#4f46e5", brandSoft: "#eef2ff" };

// border as long-hands: the open state changes borderColor, and React must not
// mix that with a `border` shorthand.
const fieldBase = {
  width: "100%", boxSizing: "border-box", borderWidth: 1.5, borderStyle: "solid", borderColor: C.line, borderRadius: 10,
  padding: "10px 12px", fontSize: 14, fontWeight: 600, outline: "none", background: C.soft, color: C.ink,
};
const pop = {
  position: "fixed", zIndex: 10050,
  background: "#fff", border: `1.5px solid ${C.line}`, borderRadius: 12, boxShadow: "0 16px 40px rgba(15,23,42,0.16)",
  overflow: "hidden",
};

/**
 * Where the popover goes: fixed to the viewport under the field (or above it
 * when there is no room), so a scrolling table or a modal never clips it.
 */
function usePopRect(ref, open, maxH) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!open) { setRect(null); return undefined; }
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const vw = window.innerWidth; const vh = window.innerHeight;
      const width = Math.min(Math.max(r.width, 220), vw - 16);
      const left = Math.max(8, Math.min(r.left, vw - width - 8));
      const below = vh - r.bottom - 12;
      const up = below < Math.min(maxH, 200) && r.top > below;
      setRect(up
        ? { left, width, bottom: vh - r.top + 6, maxHeight: Math.min(maxH, r.top - 18) }
        : { left, width, top: r.bottom + 6, maxHeight: Math.min(maxH, below) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [ref, open, maxH]);
  return rect;
}
const countPill = (on) => ({
  marginInlineStart: "auto", fontSize: 11, fontWeight: 800, padding: "1px 8px", borderRadius: 999,
  background: on ? "rgba(255,255,255,0.25)" : "#f1f5f9", color: on ? "#fff" : C.sub, flex: "none",
});

/** Close when clicking outside `ref`. */
function useOutside(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [ref, open, onClose]);
}

function Highlight({ text, needle }) {
  const s = String(text);
  const n = String(needle || "").trim().toLowerCase();
  const at = n ? s.toLowerCase().indexOf(n) : -1;
  if (at < 0) return s;
  return <>{s.slice(0, at)}<mark style={{ background: "#fde68a", color: "inherit", borderRadius: 3, padding: 0 }}>{s.slice(at, at + n.length)}</mark>{s.slice(at + n.length)}</>;
}

/* ───────────────────────── SmartSelect ───────────────────────── */
/**
 * options: [{ value, label, count?, icon?, dot? }]
 * allValue: the "everything" value (shows the ✕ reset when something else is picked)
 */
export function SmartSelect({ value, onChange, options, allValue = "ALL", searchPh = "Search…", emptyText = "No match", style, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);
  const close = React.useCallback(() => { setOpen(false); setQ(""); }, []);
  useOutside(wrap, open, close);
  const rect = usePopRect(wrap, open, 360);

  const searchable = options.length > 7;
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? options.filter((o) => String(o.label).toLowerCase().includes(n)) : options;
  }, [options, q]);
  const cur = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const i = shown.findIndex((o) => o.value === value);
    setActive(i < 0 ? 0 : i);
    if (searchable) window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setActive(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (o) => { onChange(o.value); close(); };
  function onKey(e) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); setOpen(true); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
  }

  const isAll = value === allValue;
  return (
    <div ref={wrap} style={{ position: "relative", ...style }} onKeyDown={onKey}>
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => (open ? close() : setOpen(true))}
        style={{
          ...fieldBase, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", textAlign: "start",
          borderColor: open ? C.brand : isAll ? C.line : "#a5b4fc", background: isAll ? C.soft : C.brandSoft,
          boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.15)" : "none",
        }}>
        {cur?.dot && <span style={{ width: 9, height: 9, borderRadius: 99, background: cur.dot, flex: "none" }} />}
        {cur?.icon && <span style={{ flex: "none" }}>{cur.icon}</span>}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: isAll ? C.ink : "#3730a3", fontWeight: isAll ? 600 : 800 }}>{cur?.label}</span>
        {cur?.count != null && <span style={countPill(false)}>{cur.count}</span>}
        {!isAll && (
          <span role="button" tabIndex={-1} title="✕" onClick={(e) => { e.stopPropagation(); onChange(allValue); close(); }}
            style={{ color: C.sub, fontWeight: 900, padding: "0 2px", cursor: "pointer", flex: "none" }}>✕</span>
        )}
        <span style={{ color: C.faint, fontSize: 11, flex: "none", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▼</span>
      </button>

      {open && rect && (
        <div style={{ ...pop, left: rect.left, width: rect.width, top: rect.top, bottom: rect.bottom }}>
          {searchable && (
            <div style={{ padding: 8, borderBottom: `1px solid ${C.line}` }}>
              <input ref={searchRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPh}
                style={{ ...fieldBase, padding: "8px 10px", background: "#fff" }} />
            </div>
          )}
          <div ref={listRef} role="listbox" style={{ maxHeight: Math.max(120, rect.maxHeight - (searchable ? 58 : 0)), overflowY: "auto", padding: 6 }}>
            {shown.length === 0 && <div style={{ padding: "10px 12px", color: C.faint, fontWeight: 700, fontSize: 13 }}>{emptyText}</div>}
            {shown.map((o, i) => {
              const sel = o.value === value;
              const hi = i === active;
              const dim = o.count === 0 && o.value !== allValue;
              return (
                <div key={String(o.value)} data-i={i} role="option" aria-selected={sel}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 9, cursor: "pointer",
                    fontSize: 13, fontWeight: sel ? 800 : 600,
                    background: sel ? C.brand : hi ? C.brandSoft : "transparent",
                    color: sel ? "#fff" : dim ? C.faint : C.ink,
                  }}>
                  <span style={{ width: 14, flex: "none", fontWeight: 900 }}>{sel ? "✓" : ""}</span>
                  {o.dot && <span style={{ width: 9, height: 9, borderRadius: 99, background: o.dot, flex: "none", boxShadow: sel ? "0 0 0 2px #fff" : "none" }} />}
                  {o.icon && <span style={{ flex: "none" }}>{o.icon}</span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Highlight text={o.label} needle={q} /></span>
                  {o.count != null && <span style={countPill(sel)}>{o.count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── ComboInput ───────────────────────── */
/**
 * Free text with suggestions.
 * suggestions: [{ value, count }]   usedLabel(n) → "used 3×"
 */
export function ComboInput({ value, onChange, suggestions, placeholder, usedLabel, newLabel, inputStyle, autoFocus }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef(null);
  const listRef = useRef(null);
  const close = React.useCallback(() => { setOpen(false); setActive(-1); }, []);
  useOutside(wrap, open, close);
  const rect = usePopRect(wrap, open, 280);

  // the caller's look (e.g. a compact table input) minus its border shorthand
  const extra = useMemo(() => { const { border, ...rest } = inputStyle || {}; return rest; }, [inputStyle]);
  const v = String(value ?? "");
  const shown = useMemo(() => {
    const n = v.trim().toLowerCase();
    const list = safe(suggestions);
    if (!n) return list.slice(0, 50);
    // starts-with first, then contains
    const starts = list.filter((s) => s.value.toLowerCase().startsWith(n));
    const has = list.filter((s) => !s.value.toLowerCase().startsWith(n) && s.value.toLowerCase().includes(n));
    return [...starts, ...has].slice(0, 50);
  }, [suggestions, v]);
  const exact = shown.some((s) => s.value.toLowerCase() === v.trim().toLowerCase());

  useEffect(() => {
    if (active >= 0) listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const pick = (s) => { onChange(s.value); close(); };
  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter" && open && active >= 0 && shown[active]) { e.preventDefault(); pick(shown[active]); }
    else if (e.key === "Escape" && open) { e.preventDefault(); e.stopPropagation(); close(); }
    else if (e.key === "Tab") close();
  }

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        <input value={v} placeholder={placeholder} autoFocus={autoFocus} autoComplete="off"
          onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)} onKeyDown={onKey}
          style={{ ...fieldBase, ...extra, paddingInlineEnd: 54, borderColor: open ? C.brand : C.line, boxShadow: open ? "0 0 0 3px rgba(79,70,229,0.15)" : "none" }} />
        <span style={{ position: "absolute", insetInlineEnd: 8, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 4, alignItems: "center" }}>
          {v && (
            <button type="button" tabIndex={-1} title="✕" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); setOpen(true); }}
              style={{ border: "none", background: "none", cursor: "pointer", color: C.faint, fontWeight: 900, padding: "0 2px" }}>✕</button>
          )}
          <button type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => (open ? close() : setOpen(true))}
            style={{ border: "none", background: "none", cursor: "pointer", color: C.faint, fontSize: 11, padding: "0 2px", transform: open ? "rotate(180deg)" : "none" }}>▼</button>
        </span>
      </div>
      {open && rect && (shown.length > 0 || (v.trim() && !exact && newLabel)) && (
        <div style={{ ...pop, left: rect.left, width: rect.width, top: rect.top, bottom: rect.bottom }}>
          <div ref={listRef} role="listbox" style={{ maxHeight: Math.max(120, rect.maxHeight), overflowY: "auto", padding: 6 }}>
            {v.trim() && !exact && newLabel && (
              <div style={{ padding: "7px 10px", fontSize: 12, fontWeight: 700, color: "#047857", background: "#ecfdf5", borderRadius: 8, marginBottom: 4 }}>
                ✚ {newLabel}: “{v.trim()}”
              </div>
            )}
            {shown.map((s, i) => {
              const sel = s.value.toLowerCase() === v.trim().toLowerCase();
              return (
                <div key={s.value} data-i={i} role="option" aria-selected={sel}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    fontSize: 13, fontWeight: sel ? 800 : 600,
                    background: i === active ? C.brandSoft : "transparent", color: C.ink,
                  }}>
                  <span style={{ width: 14, flex: "none", color: C.brand, fontWeight: 900 }}>{sel ? "✓" : ""}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Highlight text={s.value} needle={v} /></span>
                  {s.count > 0 && usedLabel && <span style={countPill(false)}>{usedLabel(s.count)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function safe(x) { return Array.isArray(x) ? x : []; }
