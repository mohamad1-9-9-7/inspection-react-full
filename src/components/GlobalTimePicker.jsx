import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * GlobalTimePicker — the clock twin of GlobalDatePicker.
 *
 * Mounted once in App.jsx. It hides the browser's native time popup (tiny,
 * unstyleable, and it follows the OS locale, so an inspector sees a different
 * control on every machine) and opens our own panel for EVERY
 * <input type="time"> in the app — 73 of them across 47 files, so a per-page
 * component was never an option.
 *
 * The input itself is untouched: still a real time input, still typeable, still
 * honours disabled/readOnly, and the value stays "HH:MM". The pick is written
 * through the native value setter followed by input+change, so a controlled
 * React input's onChange fires exactly as if the user typed it.
 *
 * Opt out on a single field with  data-native-time  on the input (or on any
 * ancestor).
 *
 * The panel renders in a portal on <body> because these inputs live inside
 * scrolling tables that would clip it, and because globals.css forces
 * `#root *` to 14px / `#root table *` to 12px with !important.
 */

const L10N = {
  en: { hour: "Hour", minute: "Minute", now: "Now", clear: "Clear", am: "AM", pm: "PM" },
  ar: { hour: "الساعة", minute: "الدقيقة", now: "الآن", clear: "مسح", am: "ص", pm: "م" },
};

const PANEL_W = 328;
const PANEL_H = 396;

const pad2 = (n) => String(n).padStart(2, "0");

/** "07:23" (or "07:23:00") -> {h, m}; null when the field is empty/invalid. */
function parseTime(v) {
  const mt = /^(\d{1,2}):(\d{2})/.exec(String(v || "").trim());
  if (!mt) return null;
  const h = +mt[1];
  const m = +mt[2];
  if (h > 23 || m > 59) return null;
  return { h, m };
}

/* a clock glyph to replace the native indicator we hide */
const ICON =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#884ea0" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>'
  );

const CSS = `
/* the native popup is replaced by ours everywhere */
input[type="time"]::-webkit-calendar-picker-indicator { display: none !important; }
input[type="time"]::-webkit-inner-spin-button { display: none !important; }
input[type="time"]:not([data-native-time]) {
  background-image: url("${ICON}") !important;
  background-repeat: no-repeat !important;
  background-size: 15px 15px !important;
  background-position: right 8px center !important;
  cursor: pointer;
}
[dir="rtl"] input[type="time"]:not([data-native-time]) { background-position: left 8px center !important; }
input[type="time"][data-gtp-open] { box-shadow: 0 0 0 3px rgba(168, 85, 247, .28) !important; }

.gtp, .gtp * { box-sizing: border-box; font-family: "Cairo", "Segoe UI", Roboto, Arial, sans-serif; }
.gtp {
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
  animation: gtp-in .12s ease-out;
}
@keyframes gtp-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }

.gtp-head {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, #884ea0, #a855f7);
  border-radius: 14px; padding: 10px; margin-bottom: 10px;
  color: #fff;
}
.gtp-clock { font-size: 26px; font-weight: 800; letter-spacing: 1px; line-height: 1; }
.gtp-ampm { font-size: 12px; font-weight: 800; opacity: .85; align-self: flex-end; padding-bottom: 2px; }

.gtp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.gtp-col-title {
  font-size: 11px; font-weight: 800; color: #9333ea; letter-spacing: .4px;
  text-align: center; padding: 2px 0 6px;
}
.gtp-scroll { max-height: 224px; overflow-y: auto; padding-right: 2px; }
.gtp-scroll::-webkit-scrollbar { width: 6px; }
.gtp-scroll::-webkit-scrollbar-thumb { background: #e9d5ff; border-radius: 999px; }

.gtp-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
.gtp-cell {
  height: 34px; border: 1px solid #f3e8ff; border-radius: 10px; cursor: pointer;
  background: #faf5ff; color: #1e1b4b; font-size: 14px; font-weight: 700;
}
.gtp-cell:hover { background: #f3e8ff; border-color: #d8b4fe; }
.gtp-cell.sel {
  background: linear-gradient(135deg, #884ea0, #a855f7);
  color: #fff; border-color: transparent;
  box-shadow: 0 6px 14px rgba(136, 78, 160, .35);
}

.gtp-foot { display: flex; gap: 8px; margin-top: 10px; }
.gtp-foot button { flex: 1; height: 36px; border-radius: 11px; cursor: pointer; font-size: 13px; font-weight: 800; }
.gtp-now { border: 1.5px solid #d8b4fe; background: #faf5ff; color: #6b21a8; }
.gtp-now:hover { background: #f3e8ff; }
.gtp-clear { border: 1.5px solid #fecdd3; background: #fff1f2; color: #be123c; }
.gtp-clear:hover { background: #ffe4e6; }
`;

/** write into a real <input> so React's onChange fires */
function writeValue(el, value) {
  const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
  if (desc && desc.set) desc.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function isPickable(el) {
  return (
    el &&
    el.tagName === "INPUT" &&
    el.type === "time" &&
    !el.disabled &&
    !el.readOnly &&
    !el.closest("[data-native-time]")
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export default function GlobalTimePicker() {
  const [target, setTarget] = useState(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [draft, setDraft] = useState({ h: null, m: null });
  const panelRef = useRef(null);
  const targetRef = useRef(null);
  const hourBoxRef = useRef(null);
  const minuteBoxRef = useRef(null);
  targetRef.current = target;

  /* stylesheet, once */
  useEffect(() => {
    if (document.getElementById("gtp-css")) return;
    const tag = document.createElement("style");
    tag.id = "gtp-css";
    tag.textContent = CSS;
    document.head.appendChild(tag);
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
      const el = e.target && e.target.closest ? e.target.closest('input[type="time"]') : null;
      if (isPickable(el)) {
        if (targetRef.current === el) {
          setTarget(null);
          return;
        }
        const p = parseTime(el.value);
        setDraft({ h: p ? p.h : null, m: p ? p.m : null });
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
  }, []);

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

  /* mark the live field so the user sees which one the clock belongs to */
  useEffect(() => {
    if (!target) return undefined;
    target.setAttribute("data-gtp-open", "1");
    return () => target.removeAttribute("data-gtp-open");
  }, [target]);

  /* a 60-row minute column is useless if it opens at zero — scroll to the value */
  useEffect(() => {
    if (!target) return;
    [hourBoxRef, minuteBoxRef].forEach((ref) => {
      const box = ref.current;
      const sel = box && box.querySelector(".gtp-cell.sel");
      if (box && sel) box.scrollTop = Math.max(0, sel.offsetTop - box.clientHeight / 2 + sel.offsetHeight / 2);
    });
  }, [target]);

  if (!target) return null;

  /** Writing needs both halves; the missing one falls back to a sane default. */
  const commit = (h, m, andClose) => {
    const hh = h === null ? new Date().getHours() : h;
    const mm = m === null ? 0 : m;
    setDraft({ h: hh, m: mm });
    writeValue(target, `${pad2(hh)}:${pad2(mm)}`);
    if (andClose) close();
  };

  const shownH = draft.h === null ? null : draft.h;
  const shownM = draft.m === null ? null : draft.m;
  const clock =
    shownH === null && shownM === null ? "--:--" : `${pad2(shownH ?? 0)}:${pad2(shownM ?? 0)}`;
  const ampm = shownH === null ? "" : shownH < 12 ? T.am : T.pm;

  const panel = (
    <div className="gtp" ref={panelRef} dir={rtl ? "rtl" : "ltr"} style={{ top: pos.top, left: pos.left }}>
      <div className="gtp-head">
        <span className="gtp-clock">{clock}</span>
        {ampm && <span className="gtp-ampm">{ampm}</span>}
      </div>

      <div className="gtp-cols">
        <div>
          <div className="gtp-col-title">{T.hour}</div>
          <div className="gtp-scroll" ref={hourBoxRef}>
            <div className="gtp-grid">
              {HOURS.map((h) => (
                <button
                  type="button"
                  key={h}
                  className={"gtp-cell" + (draft.h === h ? " sel" : "")}
                  onClick={() => commit(h, draft.m, false)}
                >
                  {pad2(h)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="gtp-col-title">{T.minute}</div>
          <div className="gtp-scroll" ref={minuteBoxRef}>
            <div className="gtp-grid">
              {MINUTES.map((m) => (
                <button
                  type="button"
                  key={m}
                  className={"gtp-cell" + (draft.m === m ? " sel" : "")}
                  onClick={() => commit(draft.h, m, true)}
                >
                  {pad2(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gtp-foot">
        <button
          type="button"
          className="gtp-now"
          onClick={() => {
            const n = new Date();
            commit(n.getHours(), n.getMinutes(), true);
          }}
        >
          {T.now}
        </button>
        <button
          type="button"
          className="gtp-clear"
          onClick={() => {
            writeValue(target, "");
            setDraft({ h: null, m: null });
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
