// src/components/AccessibilityMenu.jsx
// "Aa" button, fixed bottom-left just above the day/night toggle, on every
// page. Opens a small accessibility panel with a 5-stop text-size slider.
// Mounted once in App.jsx. The scaling itself: utils/fontScale.js + globals.css.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { FONT_STEPS, DEFAULT_STEP, getFontStep, setFontStep } from "../utils/fontScale";

// Public sales pages carry their own design (same list as ThemeToggle).
const PUBLIC_PAGES = ["/demo", "/readiness"];

const TXT = {
  ar: {
    open: "سهولة الوصول — حجم الخط",
    title: "سهولة الوصول",
    size: "حجم الخط",
    smaller: "تصغير الخط",
    larger: "تكبير الخط",
    reset: "الحجم الافتراضي",
    close: "إغلاق",
    sample: "هذا مثال على حجم النص",
  },
  en: {
    open: "Accessibility — text size",
    title: "Accessibility",
    size: "Text size",
    smaller: "Smaller text",
    larger: "Larger text",
    reset: "Default size",
    close: "Close",
    sample: "This is how text will look",
  },
};

const getLang = () => {
  try { return localStorage.getItem("settings_lang") === "en" ? "en" : "ar"; } catch { return "ar"; }
};

// globals.css forces `#root *` to a fixed size with !important, so this panel
// sizes its own text with a doubled class that out-ranks it. Fixed px on
// purpose: the panel must not jump while the user drags the slider.
const CSS = `
#root .a11y.a11y, #root .a11y.a11y * { font-size: 14px !important; }
#root .a11y.a11y .a11y-fab { font-size: 16px !important; font-weight: 800; letter-spacing: -.5px; }
#root .a11y.a11y .a11y-title { font-size: 18px !important; font-weight: 800; }
#root .a11y.a11y .a11y-lbl { font-size: 13px !important; font-weight: 700; }
#root .a11y.a11y .a11y-pct { font-size: 12px !important; font-weight: 700; }
#root .a11y.a11y .a11y-aS { font-size: 13px !important; font-weight: 800; }
#root .a11y.a11y .a11y-aL { font-size: 22px !important; font-weight: 800; }
#root .a11y.a11y .a11y-x { font-size: 16px !important; }
#root .a11y.a11y .a11y-sample { font-size: calc(14px * var(--app-fs, 1)) !important; }
.a11y-fab { position: fixed; bottom: 62px; left: 14px; z-index: 9990; width: 40px; height: 40px;
  border-radius: 50%; border: 1px solid rgba(15,23,42,.15); background: #fff; color: #1e3a5f;
  box-shadow: 0 4px 14px rgba(15,23,42,.22); cursor: pointer; display: grid; place-items: center;
  opacity: .9; transition: transform .15s, opacity .15s; }
.a11y-fab:hover, .a11y-fab[aria-expanded="true"] { opacity: 1; transform: scale(1.06); }
.a11y-fab:focus-visible, .a11y-panel button:focus-visible { outline: 3px solid #38bdf8; outline-offset: 2px; }
.a11y-panel { position: fixed; bottom: 112px; left: 14px; z-index: 9991; width: 300px; max-width: calc(100vw - 28px);
  background: #fff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 16px;
  box-shadow: 0 18px 44px rgba(15,23,42,.22); padding: 16px 18px 18px; animation: a11yIn .16s ease-out; }
@keyframes a11yIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.a11y-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.a11y-x { border: none; background: transparent; color: #64748b; cursor: pointer; width: 30px; height: 30px; border-radius: 8px; }
.a11y-x:hover { background: #f1f5f9; }
.a11y-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; color: #475569; }
.a11y-reset { border: none; background: transparent; color: #0284c7; cursor: pointer; padding: 2px 4px; border-radius: 6px; }
.a11y-reset:disabled { color: #94a3b8; cursor: default; }
.a11y-slider { display: flex; align-items: center; gap: 10px; direction: ltr; }
.a11y-step { border: none; background: transparent; color: #0f172a; cursor: pointer; padding: 4px 6px; border-radius: 8px; line-height: 1; }
.a11y-step:disabled { color: #cbd5e1; cursor: default; }
.a11y-track { position: relative; flex: 1; height: 28px; display: flex; align-items: center; justify-content: space-between; }
.a11y-line { position: absolute; left: 7px; right: 7px; top: 50%; height: 2px; background: #e2e8f0; transform: translateY(-50%); }
.a11y-fill { position: absolute; left: 7px; top: 50%; height: 2px; background: #0ea5e9; transform: translateY(-50%); transition: width .15s; }
.a11y-dot { position: relative; z-index: 1; width: 14px; height: 14px; padding: 0; border-radius: 50%; border: 2px solid #cbd5e1;
  background: #fff; cursor: pointer; transition: transform .15s, border-color .15s, background .15s; }
.a11y-dot.on { border-color: #0ea5e9; background: #0ea5e9; }
.a11y-dot.cur { width: 22px; height: 22px; border: 4px solid #0ea5e9; background: #fff; box-shadow: 0 0 0 4px rgba(14,165,233,.15); }
.a11y-sample { margin-top: 14px; padding: 10px 12px; border-radius: 10px; background: #f0f9ff; color: #334155; text-align: center; }
@media print { .a11y-fab, .a11y-panel { display: none !important; } }
`;

export default function AccessibilityMenu() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(getFontStep);
  const [lang, setLang] = useState(getLang);
  const panelRef = useRef(null);
  const fabRef = useRef(null);
  const t = TXT[lang];

  useEffect(() => {
    const onScale = (e) => setStep(Number(e.detail));
    const onLang = () => setLang(getLang());
    window.addEventListener("app:font-scale-changed", onScale);
    window.addEventListener("storage", onLang);
    return () => {
      window.removeEventListener("app:font-scale-changed", onScale);
      window.removeEventListener("storage", onLang);
    };
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current?.contains(e.target) || fabRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); fabRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = useCallback((i) => setFontStep(i), []);

  // Slider keyboard: arrows / Home / End, like a native range input.
  const onSliderKey = (e) => {
    const last = FONT_STEPS.length - 1;
    let next = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = step + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = step - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next == null) return;
    e.preventDefault();
    go(Math.min(last, Math.max(0, next)));
  };

  if (PUBLIC_PAGES.includes(pathname)) return null;

  const last = FONT_STEPS.length - 1;
  const pct = Math.round(FONT_STEPS[step] * 100);

  return (
    <div className="a11y">
      <style>{CSS}</style>
      <button
        ref={fabRef}
        type="button"
        className="a11y-fab"
        onClick={() => { setLang(getLang()); setOpen((o) => !o); }}
        title={t.open}
        aria-label={t.open}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Aa
      </button>

      {open && (
        <div ref={panelRef} className="a11y-panel" role="dialog" aria-label={t.title} dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="a11y-head">
            <span className="a11y-title">{t.title}</span>
            <button type="button" className="a11y-x" onClick={() => setOpen(false)} aria-label={t.close}>✕</button>
          </div>

          <div className="a11y-row">
            <span className="a11y-lbl">{t.size} · <span className="a11y-pct">{pct}%</span></span>
            <button type="button" className="a11y-reset a11y-pct" onClick={() => go(DEFAULT_STEP)} disabled={step === DEFAULT_STEP}>
              {t.reset}
            </button>
          </div>

          <div className="a11y-slider">
            <button type="button" className="a11y-step a11y-aS" onClick={() => go(step - 1)} disabled={step === 0} aria-label={t.smaller}>
              A−
            </button>
            <div
              className="a11y-track"
              role="slider"
              tabIndex={0}
              aria-label={t.size}
              aria-valuemin={Math.round(FONT_STEPS[0] * 100)}
              aria-valuemax={Math.round(FONT_STEPS[last] * 100)}
              aria-valuenow={pct}
              aria-valuetext={`${pct}%`}
              onKeyDown={onSliderKey}
            >
              <span className="a11y-line" />
              <span className="a11y-fill" style={{ width: `calc((100% - 14px) * ${step / last})` }} />
              {FONT_STEPS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  tabIndex={-1}
                  className={`a11y-dot${i < step ? " on" : ""}${i === step ? " cur" : ""}`}
                  onClick={() => go(i)}
                  aria-label={`${Math.round(s * 100)}%`}
                />
              ))}
            </div>
            <button type="button" className="a11y-step a11y-aL" onClick={() => go(step + 1)} disabled={step === last} aria-label={t.larger}>
              A+
            </button>
          </div>

          {/* Sized from --app-fs, not fixed: a live preview of the app's text. */}
          <div className="a11y-sample">{t.sample}</div>
        </div>
      )}
    </div>
  );
}
