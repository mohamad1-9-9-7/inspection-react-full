import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * CodeSuggest — the item-code field with its suggestion list.
 *
 * The list is rendered in a portal on <body>, not inside the cell. Inside the
 * cell it was clipped by the table's `overflow-x: auto` wrapper (a scroll
 * container clips BOTH axes) and painted under the rows below it, so it
 * disappeared whenever the row was near the bottom of the table. Fixed
 * positioning against the input's own rectangle removes the whole class of
 * problem: no clipping, no stacking fights, and it escapes the globals.css
 * `#root table * { font-size: 12px !important }` rule as a bonus.
 *
 * Behaviour: opens on focus and on typing, ↑/↓/Home/End move, Enter or Tab
 * accepts, Esc closes, hovering moves the selection, the highlighted row is
 * always scrolled into view, and the panel flips above the field when there is
 * no room below it. It follows the field while the page or the table scrolls,
 * and closes if the field is scrolled out of sight.
 */

const MIN_W = 340;
const MAX_H = 288;

const CSS = `
.cs-pop, .cs-pop * { box-sizing: border-box; font-family: "Segoe UI", Roboto, Arial, sans-serif; }
.cs-pop {
  position: fixed;
  z-index: 2147482000;
  background: #fff;
  border: 1px solid #e9d5ff;
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(81, 46, 95, .26);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: cs-in .1s ease-out;
}
@keyframes cs-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }

.cs-list { overflow-y: auto; overscroll-behavior: contain; }
.cs-row {
  display: flex; align-items: baseline; gap: 10px;
  padding: 8px 12px; cursor: pointer;
  border-bottom: 1px solid #f6f0fb;
}
.cs-row:last-child { border-bottom: none; }
.cs-row[data-on="1"] { background: #f3e8ff; }
.cs-code {
  flex: none; min-width: 74px;
  font-size: 13px; font-weight: 800; color: #6b21a8;
  font-variant-numeric: tabular-nums; letter-spacing: .3px;
}
.cs-name {
  flex: 1; min-width: 0;
  font-size: 12.5px; color: #334155; line-height: 1.35;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cs-row[data-on="1"] .cs-name { color: #1e1b4b; }
.cs-tag {
  flex: none; font-size: 10px; font-weight: 800; letter-spacing: .4px;
  color: #7c3aed; background: #f5f3ff; border: 1px solid #e9d5ff;
  border-radius: 999px; padding: 1px 7px;
}
.cs-hit { background: #fde68a; border-radius: 3px; padding: 0 1px; }

.cs-foot {
  flex: none;
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 12px;
  background: #faf5ff; border-top: 1px solid #f1e5fb;
  font-size: 11px; color: #7c6f86; font-weight: 600;
}
.cs-empty { padding: 14px 12px; font-size: 12.5px; color: #b45309; font-weight: 700; }
.cs-kbd {
  font-size: 10px; font-weight: 800; color: #6b21a8;
  background: #fff; border: 1px solid #e9d5ff; border-radius: 5px; padding: 1px 5px;
}
`;

function mountCss() {
  if (document.getElementById("cs-css")) return;
  const tag = document.createElement("style");
  tag.id = "cs-css";
  tag.textContent = CSS;
  document.head.appendChild(tag);
}

/** Highlight the typed text inside a suggestion, without regex (a user can type "(" ). */
function Marked({ text, query }) {
  const s = String(text ?? "");
  const q = String(query ?? "").trim();
  if (!q) return s;
  const at = s.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return s;
  return (
    <>
      {s.slice(0, at)}
      <span className="cs-hit">{s.slice(at, at + q.length)}</span>
      {s.slice(at + q.length)}
    </>
  );
}

export default function CodeSuggest({
  value,
  onChange,
  onPick,
  search,
  style,
  placeholder = "Code or name",
  disabled = false,
  debounce = 120,
  /* Spread onto the <input> itself. A table that drives focus between cells
     needs its own marker on the real element, which is in here, not on the
     wrapper. */
  inputProps,
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(0);
  const [pos, setPos] = useState(null);
  const listId = useId();

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const timer = useRef(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    mountCss();
    return () => clearTimeout(timer.current);
  }, []);

  const run = useCallback((q, immediate) => {
    clearTimeout(timer.current);
    const go = () => {
      let list = [];
      try {
        list = searchRef.current(q) || [];
      } catch {
        list = [];
      }
      setItems(list);
      setSel(0);
    };
    if (immediate) go();
    else timer.current = setTimeout(go, debounce);
  }, [debounce]);

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // the field scrolled out of its container — nothing to anchor to
    if (r.bottom < 4 || r.top > window.innerHeight - 4) {
      setOpen(false);
      return;
    }
    const width = Math.max(r.width, MIN_W);
    let left = r.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;

    const below = window.innerHeight - r.bottom - 10;
    const above = r.top - 10;
    const flip = below < 150 && above > below;
    const height = Math.min(MAX_H, Math.max(110, flip ? above : below));
    setPos({ left, width, height, top: flip ? r.top - height - 4 : r.bottom + 4 });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, items.length, place]);

  useEffect(() => {
    if (!open) return undefined;
    const on = () => place();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [open, place]);

  /* keep the highlighted row visible */
  useEffect(() => {
    if (!open || !listRef.current) return;
    const row = listRef.current.children[sel];
    if (row && row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
  }, [sel, open]);

  const close = () => setOpen(false);

  const choose = (item) => {
    if (!item) return;
    onPick(item);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        run(value, true);
        return;
      }
      if (!items.length) return;
      setSel((i) => {
        const n = items.length;
        return e.key === "ArrowDown" ? (i + 1) % n : (i - 1 + n) % n;
      });
      return;
    }
    if (!open || !items.length) return;
    if (e.key === "Home") { e.preventDefault(); setSel(0); }
    else if (e.key === "End") { e.preventDefault(); setSel(items.length - 1); }
    else if (e.key === "Enter") { e.preventDefault(); choose(items[sel]); }
    else if (e.key === "Tab") { choose(items[sel]); } // let Tab still move on
  };

  const popup =
    open && pos ? (
      <div
        className="cs-pop"
        id={listId}
        role="listbox"
        style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: pos.height }}
        onMouseDown={(e) => e.preventDefault()} // keep the caret in the input
      >
        {items.length ? (
          <>
            <div className="cs-list" ref={listRef} style={{ maxHeight: pos.height - 28 }}>
              {items.map((it, k) => (
                <div
                  key={(it.item_code || "") + "|" + k}
                  className="cs-row"
                  id={listId + "-" + k}
                  role="option"
                  aria-selected={k === sel}
                  data-on={k === sel ? "1" : "0"}
                  onMouseEnter={() => setSel(k)}
                  onClick={() => choose(it)}
                >
                  <span className="cs-code">
                    <Marked text={it.item_code} query={value} />
                  </span>
                  <span className="cs-name" title={it.description}>
                    <Marked text={it.description} query={value} />
                  </span>
                  {it.origin ? <span className="cs-tag">{it.origin}</span> : null}
                </div>
              ))}
            </div>
            <div className="cs-foot">
              <span>
                {items.length} match{items.length === 1 ? "" : "es"}
              </span>
              <span>
                <span className="cs-kbd">↑↓</span> move <span className="cs-kbd">↵</span> pick{" "}
                <span className="cs-kbd">esc</span> close
              </span>
            </div>
          </>
        ) : (
          <div className="cs-empty">
            No product matches “{String(value || "").trim()}” — check the code, or add it with “Add item”.
          </div>
        )}
      </div>
    ) : null;

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && items[sel] ? listId + "-" + sel : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        style={style}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          run(e.target.value, false);
        }}
        onFocus={() => {
          setOpen(true);
          run(value, true);
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        {...inputProps}
      />
      {popup ? createPortal(popup, document.body) : null}
    </>
  );
}
