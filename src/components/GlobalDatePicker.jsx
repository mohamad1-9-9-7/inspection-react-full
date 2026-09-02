import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * GlobalDatePicker — one calendar for the whole app.
 *
 * Mounted once in App.jsx. It hides the browser's native calendar popup (which
 * is tiny, unstyleable and follows the OS language) and opens our own panel for
 * EVERY <input type="date"> in the app — no page has to import anything.
 *
 * The input itself is untouched: still a real date input, still typeable, still
 * honours min/max/disabled/readOnly, and the value stays "YYYY-MM-DD". We write
 * the picked day back through the native value setter and dispatch input+change,
 * so a React controlled input's onChange fires exactly as if the user typed it.
 *
 * Opt out on a single field with  data-native-date  on the input (or on any
 * ancestor).
 *
 * The panel renders in a portal on <body> because inputs live inside scrolling
 * tables and modals that would clip it, and because globals.css forces
 * `#root *` to 14px / `#root table *` to 12px with !important.
 */

const L10N = {
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    short: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    week: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    today: "Today",
    clear: "Clear",
    prev: "Previous",
    next: "Next",
    drill: "Switch between day / month / year",
  },
  ar: {
    months: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    short: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
    week: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
    today: "اليوم",
    clear: "مسح",
    prev: "السابق",
    next: "التالي",
    drill: "التنقل بين اليوم / الشهر / السنة",
  },
};

const PANEL_W = 328;
const PANEL_H = 400;

const pad2 = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

/** "2026-08-31" (or an ISO timestamp) -> {y, m, d}, m 0-based. */
function parseISO(v) {
  const mt = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || "").trim());
  if (!mt) return null;
  const y = +mt[1];
  const m = +mt[2] - 1;
  const d = +mt[3];
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  return { y, m, d };
}

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

/* a calendar glyph to replace the native indicator we hide */
const ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#884ea0" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>'
  );

const CSS = `
/* the native popup is replaced by ours everywhere */
input[type="date"]::-webkit-calendar-picker-indicator { display: none !important; }
input[type="date"]::-webkit-inner-spin-button { display: none !important; }
input[type="date"]:not([data-native-date]) {
  background-image: url("${ICON}") !important;
  background-repeat: no-repeat !important;
  background-size: 15px 15px !important;
  background-position: right 8px center !important;
  cursor: pointer;
}
[dir="rtl"] input[type="date"]:not([data-native-date]) { background-position: left 8px center !important; }
input[type="date"][data-gdp-open] { box-shadow: 0 0 0 3px rgba(168, 85, 247, .28) !important; }

.gdp, .gdp * { box-sizing: border-box; font-family: "Cairo", "Segoe UI", Roboto, Arial, sans-serif; }
.gdp {
  position: fixed;
  width: ${PANEL_W}px;
  background: #fff;
  border: 1px solid #e9d5ff;
  border-radius: 18px;
  box-shadow: 0 24px 60px rgba(81, 46, 95, .28);
  z-index: 2147483000;
  padding: 12px;
  color: #1e1b4b;
  user-select: none;
  animation: gdp-in .12s ease-out;
}
@keyframes gdp-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

.gdp-head {
  display: flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #884ea0, #a855f7);
  border-radius: 14px; padding: 8px 10px; margin-bottom: 10px;
}
.gdp-nav {
  width: 34px; height: 34px; flex: none;
  display: grid; place-items: center;
  border: none; border-radius: 10px; cursor: pointer;
  background: rgba(255,255,255,.18); color: #fff;
  font-size: 18px; line-height: 1; font-weight: 700;
}
.gdp-nav:hover { background: rgba(255,255,255,.34); }
.gdp-caption {
  flex: 1; text-align: center; cursor: pointer;
  border: none; background: transparent; color: #fff;
  font-size: 16px; font-weight: 800; letter-spacing: .3px;
  padding: 6px 8px; border-radius: 10px;
}
.gdp-caption:hover { background: rgba(255,255,255,.18); }

.gdp-week { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.gdp-week span {
  text-align: center; font-size: 11px; font-weight: 800;
  color: #9333ea; letter-spacing: .4px; padding: 4px 0;
  overflow: hidden; text-overflow: clip; white-space: nowrap;
}

.gdp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.gdp-day {
  height: 40px; border: none; border-radius: 11px; cursor: pointer;
  background: transparent; color: #1e1b4b;
  font-size: 15px; font-weight: 600;
}
.gdp-day:hover { background: #f3e8ff; }
.gdp-day.out { color: #cbd5e1; font-weight: 500; }
.gdp-day.off { color: #e2e8f0; cursor: not-allowed; }
.gdp-day.off:hover { background: transparent; }
.gdp-day.today { box-shadow: inset 0 0 0 2px #a855f7; color: #7e22ce; font-weight: 800; }
.gdp-day.sel {
  background: linear-gradient(135deg, #884ea0, #a855f7);
  color: #fff; font-weight: 800;
  box-shadow: 0 6px 14px rgba(136, 78, 160, .35);
}

.gdp-cells { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.gdp-cell {
  height: 56px; border: 1px solid #ede9fe; border-radius: 12px; cursor: pointer;
  background: #faf5ff; color: #1e1b4b; font-size: 15px; font-weight: 700;
}
.gdp-cell:hover { background: #f3e8ff; border-color: #d8b4fe; }
.gdp-cell.sel { background: linear-gradient(135deg, #884ea0, #a855f7); color: #fff; border-color: transparent; }

.gdp-foot { display: flex; gap: 8px; margin-top: 10px; }
.gdp-foot button { flex: 1; height: 36px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 800; }
.gdp-today { border: 1.5px solid #d8b4fe; background: #faf5ff; color: #6b21a8; }
.gdp-today:hover { background: #f3e8ff; }
.gdp-clear { border: 1.5px solid #fecdd3; background: #fff1f2; color: #be123c; }
.gdp-clear:hover { background: #ffe4e6; }
`;

/** write into a real <input> so React's onChange fires */
function writeValue(el, iso) {
  const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  if (desc && desc.set) desc.set.call(el, iso);
  else el.value = iso;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function isPickable(el) {
  return (
    el &&
    el.tagName === "INPUT" &&
    el.type === "date" &&
    !el.disabled &&
    !el.readOnly &&
    !el.closest("[data-native-date]")
  );
}

export default function GlobalDatePicker() {
  const [target, setTarget] = useState(null);
  const [mode, setMode] = useState("days"); // days | months | years
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [view, setView] = useState({ y: 2000, m: 0 });
  const panelRef = useRef(null);
  const targetRef = useRef(null);
  targetRef.current = target;

  /* stylesheet, once */
  useEffect(() => {
    if (document.getElementById("gdp-css")) return;
    const tag = document.createElement("style");
    tag.id = "gdp-css";
    tag.textContent = CSS;
    document.head.appendChild(tag);
  }, []);

  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  }, []);

  const rtl = useMemo(() => {
    if (!target) return false;
    if (target.closest('[dir="rtl"]')) return true;
    try {
      return window.getComputedStyle(target).direction === "rtl";
    } catch {
      return false;
    }
  }, [target]);
  const T = rtl ? L10N.ar : L10N.en;

  const selected = target ? parseISO(target.value) : null;
  const min = target ? parseISO(target.min) : null;
  const max = target ? parseISO(target.max) : null;

  const close = useCallback(() => setTarget(null), []);

  const place = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    if (!el.isConnected) {
      setTarget(null);
      return;
    }
    const r = el.getBoundingClientRect();
    let left = rtl ? r.right - PANEL_W : r.left;
    if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8;
    if (left < 8) left = 8;
    let top = r.bottom + 6;
    if (top + PANEL_H > window.innerHeight - 8) top = Math.max(8, r.top - PANEL_H - 6);
    setPos({ top, left });
  }, [rtl]);

  useLayoutEffect(() => {
    if (target) place();
  }, [target, place]);

  /* open / toggle / dismiss */
  useEffect(() => {
    const onDown = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      const el = e.target && e.target.closest ? e.target.closest('input[type="date"]') : null;
      if (isPickable(el)) {
        if (targetRef.current === el) {
          setTarget(null);
          return;
        }
        const p = parseISO(el.value);
        setView({ y: p?.y ?? today.y, m: p?.m ?? today.m });
        setMode("days");
        setTarget(el);
        return;
      }
      setTarget(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "Tab") setTarget(null);
    };
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [today]);

  /* follow the field while the page scrolls */
  useEffect(() => {
    if (!target) return undefined;
    const on = () => place();
    window.addEventListener("scroll", on, true);
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on, true);
      window.removeEventListener("resize", on);
    };
  }, [target, place]);

  /* mark the live field so the user sees which one the calendar belongs to */
  useEffect(() => {
    if (!target) return undefined;
    target.setAttribute("data-gdp-open", "1");
    return () => target.removeAttribute("data-gdp-open");
  }, [target]);

  const pick = (y, m, d) => {
    if (target) writeValue(target, toISO(y, m, d));
    close();
  };

  const stepMonth = (delta) =>
    setView((v) => {
      const n = new Date(v.y, v.m + delta, 1);
      return { y: n.getFullYear(), m: n.getMonth() };
    });

  /* 6x7 grid including the greyed days of the neighbouring months */
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const prevLen = daysInMonth(view.y, view.m - 1 < 0 ? 11 : view.m - 1);
    const len = daysInMonth(view.y, view.m);
    const out = [];
    for (let i = 0; i < 42; i++) {
      const n = i - first + 1;
      if (n < 1) {
        const d = new Date(view.y, view.m - 1, prevLen + n);
        out.push({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), out: true });
      } else if (n > len) {
        const d = new Date(view.y, view.m + 1, n - len);
        out.push({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), out: true });
      } else {
        out.push({ y: view.y, m: view.m, d: n, out: false });
      }
    }
    return out;
  }, [view]);

  if (!target) return null;

  const yearBlockStart = view.y - (((view.y % 12) + 12) % 12);
  const blocked = (c) => {
    const v = toISO(c.y, c.m, c.d);
    if (min && v < toISO(min.y, min.m, min.d)) return true;
    if (max && v > toISO(max.y, max.m, max.d)) return true;
    return false;
  };

  const panel = (
    <div className="gdp" ref={panelRef} dir={rtl ? "rtl" : "ltr"} style={{ top: pos.top, left: pos.left }}>
      <div className="gdp-head">
        <button
          type="button"
          className="gdp-nav"
          title={T.prev}
          onClick={() => {
            if (mode === "days") stepMonth(-1);
            else if (mode === "months") setView((v) => ({ ...v, y: v.y - 1 }));
            else setView((v) => ({ ...v, y: v.y - 12 }));
          }}
        >
          {rtl ? "›" : "‹"}
        </button>

        <button
          type="button"
          className="gdp-caption"
          title={T.drill}
          onClick={() => setMode((m) => (m === "days" ? "months" : m === "months" ? "years" : "days"))}
        >
          {mode === "days"
            ? `${T.months[view.m]} ${view.y}`
            : mode === "months"
            ? view.y
            : `${yearBlockStart} – ${yearBlockStart + 11}`}
        </button>

        <button
          type="button"
          className="gdp-nav"
          title={T.next}
          onClick={() => {
            if (mode === "days") stepMonth(1);
            else if (mode === "months") setView((v) => ({ ...v, y: v.y + 1 }));
            else setView((v) => ({ ...v, y: v.y + 12 }));
          }}
        >
          {rtl ? "‹" : "›"}
        </button>
      </div>

      {mode === "days" && (
        <>
          <div className="gdp-week">
            {T.week.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="gdp-grid">
            {cells.map((c, i) => {
              const isSel = selected && selected.y === c.y && selected.m === c.m && selected.d === c.d;
              const isToday = today.y === c.y && today.m === c.m && today.d === c.d;
              const off = blocked(c);
              return (
                <button
                  type="button"
                  key={i}
                  disabled={off}
                  className={
                    "gdp-day" +
                    (c.out ? " out" : "") +
                    (off ? " off" : "") +
                    (isToday && !isSel ? " today" : "") +
                    (isSel ? " sel" : "")
                  }
                  onClick={() => pick(c.y, c.m, c.d)}
                >
                  {c.d}
                </button>
              );
            })}
          </div>
        </>
      )}

      {mode === "months" && (
        <div className="gdp-cells">
          {T.short.map((mn, i) => (
            <button
              type="button"
              key={mn}
              className={"gdp-cell" + (view.m === i ? " sel" : "")}
              onClick={() => {
                setView((v) => ({ ...v, m: i }));
                setMode("days");
              }}
            >
              {mn}
            </button>
          ))}
        </div>
      )}

      {mode === "years" && (
        <div className="gdp-cells">
          {Array.from({ length: 12 }, (_, i) => yearBlockStart + i).map((y) => (
            <button
              type="button"
              key={y}
              className={"gdp-cell" + (view.y === y ? " sel" : "")}
              onClick={() => {
                setView((v) => ({ ...v, y }));
                setMode("months");
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      <div className="gdp-foot">
        <button type="button" className="gdp-today" onClick={() => pick(today.y, today.m, today.d)}>
          {T.today}
        </button>
        <button
          type="button"
          className="gdp-clear"
          onClick={() => {
            if (target) writeValue(target, "");
            close();
          }}
        >
          {T.clear}
        </button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
