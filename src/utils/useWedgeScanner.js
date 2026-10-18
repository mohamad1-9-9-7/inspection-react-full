// src/utils/useWedgeScanner.js
//
// 🔫 Handheld barcode reader (USB / wireless / Bluetooth "keyboard" readers,
// e.g. the EY-034): the reader types the code very fast and presses Enter.
//
//   useWedgeScanner((text) => …, enabled);
//
// Listens on the whole page — no box needs the cursor. A burst is a scan
// when every key came within GAP_MS of the one before and it ends in Enter
// (or Tab); a person typing is far slower, so normal typing is untouched.
// If the burst landed inside a text box, it is taken back out of that box.
// Works with the keyboard set to Arabic too (letters are read from the key
// position), and turns Ctrl+] / the GS key into the GS1 separator.

import { useEffect, useRef } from "react";

const GAP_MS = 50;
const MIN_LEN = 6;
const GS = "\u001d";

function charOf(e) {
  if (e.ctrlKey && (e.key === "]" || e.code === "BracketRight")) return GS;
  if (e.key === GS) return GS;
  if (e.ctrlKey || e.altKey || e.metaKey) return "";
  if (e.key.length !== 1) return "";
  if (e.key.charCodeAt(0) < 128) return e.key;
  // non-English keyboard layout: read the key position instead
  const m = /^(Key([A-Z])|Digit(\d)|Numpad(\d))$/.exec(e.code || "");
  if (!m) return "";
  if (m[2]) return e.shiftKey ? m[2] : m[2].toLowerCase();
  return m[3] || m[4];
}

function takeBack(el, text) {
  if (!el || !("value" in el) || typeof el.value !== "string") return;
  const v = el.value;
  // the typed text may be the scanned one with a different layout — strip by length
  if (v.length < text.length) return;
  const next = v.slice(0, v.length - text.length);
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  try {
    if (setter) setter.call(el, next); else el.value = next;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } catch { /* not a plain box */ }
}

export default function useWedgeScanner(onCode, enabled = true) {
  const cbRef = useRef(onCode);
  cbRef.current = onCode;

  useEffect(() => {
    if (!enabled) return undefined;
    let buf = "";
    let typed = 0; // keys that reached a text box (not prevented)
    let last = 0;
    let target = null;

    const onKey = (e) => {
      const now = performance.now();
      const fast = now - last <= GAP_MS;
      last = now;

      if (e.key === "Enter" || e.key === "Tab") {
        const code = buf;
        const el = target;
        const n = typed;
        buf = ""; typed = 0; target = null;
        if (fast && code.replace(new RegExp(GS, "g"), "").length >= MIN_LEN) {
          e.preventDefault();
          e.stopPropagation();
          if (n) takeBack(el, code.slice(code.length - n));
          cbRef.current?.(code);
        }
        return;
      }
      if (e.key === "Shift") return; // readers press Shift for capitals — not a gap breaker
      const ch = charOf(e);
      if (!ch) { buf = ""; typed = 0; target = null; return; }
      if (!fast) { buf = ""; typed = 0; }
      buf += ch;
      target = e.target;
      if (ch === GS) e.preventDefault();
      else typed += 1;
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [enabled]);
}
