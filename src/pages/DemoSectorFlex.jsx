/* /demo "pick your business" accordion: one panel per sector side by side.
   Desktop: hovering (or focusing) a panel widens it and shows its three pains.
   Phone: panels stack and a tap opens one. Pure CSS flex-grow, no library.
   Until the visitor touches it, the open panel moves on by itself every few
   seconds (a bar on the open panel shows the time left); any hover, focus or
   pick stops that for good. Styles: .dp-flex* in DemoRequest.css. */
import React, { useEffect, useRef, useState } from "react";
import { SECTORS, SECTOR_ORDER, SECTOR_UI, SECTOR_LOOK } from "./demoSectors";

const AUTO_MS = 6000;
const LIVE = { en: "Live", ar: "مباشر" };

function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

export default function DemoSectorFlex({ lang, sector, ctaTrial, arrow, onTrial, onExplore }) {
  const [active, setActive] = useState(sector || SECTOR_ORDER[0]);
  const [auto, setAuto] = useState(() => !sector && !prefersReducedMotion());
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const secRef = useRef(null);
  const SU = SECTOR_UI[lang];

  // a pick in the chips strip above opens the same panel here
  useEffect(() => { if (sector) { setActive(sector); setAuto(false); } }, [sector]);

  // only rotate while the section is on screen
  useEffect(() => {
    const el = secRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = auto && inView && !paused;
  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => {
      setActive((cur) => SECTOR_ORDER[(SECTOR_ORDER.indexOf(cur) + 1) % SECTOR_ORDER.length]);
    }, AUTO_MS);
    return () => clearTimeout(id);
  }, [running, active]);

  const pick = (v) => { setActive(v); setAuto(false); };

  return (
    <section id="sectors" ref={secRef} className="dp-section tight dp-flex-sec">
      <div className="dp-wrap">
        <div className="dp-center">
          <span className="dp-eyebrow fs-xs">{SU.flexEyebrow}</span>
          <h2 className="dp-h2 fs-h2">{SU.flexTitle}</h2>
        </div>
        <div className="dp-flex" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          {SECTOR_ORDER.map((v, i) => {
            const s = SECTORS[v][lang];
            const look = SECTOR_LOOK[v];
            const on = active === v;
            return (
              <div key={v} className={`dp-flex-p${on ? " on" : ""}`} style={{ "--fx-bg": look.bg, "--fx-ac": look.ac, "--fx-ms": `${AUTO_MS}ms` }}
                onMouseEnter={() => pick(v)}>
                <span className="dp-flex-mark" aria-hidden="true">{look.emo}</span>
                <button type="button" className="dp-flex-head" aria-expanded={on} onClick={() => pick(v)} onFocus={() => pick(v)}>
                  <span className="dp-flex-emo" aria-hidden="true">{look.emo}</span>
                  <span className="dp-flex-name fs-sm">{s.chip}</span>
                  <span className="dp-flex-plus" aria-hidden="true">+</span>
                </button>
                {/* React 18 passes inert through only as a string; "" = on, undefined = off */}
                <div className="dp-flex-body" aria-hidden={!on} inert={on ? undefined : ""}>
                  <div className="dp-flex-meta fs-xs">
                    <span className="dp-flex-num">{String(i + 1).padStart(2, "0")} / {String(SECTOR_ORDER.length).padStart(2, "0")}</span>
                    {s.mock?.f1 && <span className="dp-flex-live"><b aria-hidden="true" />{LIVE[lang] || LIVE.en} · {s.mock.f1}</span>}
                  </div>
                  <h3 className="fs-h3">{s.h1a} <span>{s.h1b}</span></h3>
                  <ul>
                    {s.pains.map(([ic, h, d]) => (
                      <li key={h}>
                        <i aria-hidden="true">{ic}</i>
                        <div>
                          <strong className="fs-sm">{h}</strong>
                          {d && <p className="fs-xs">{d}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="dp-flex-cta">
                    <button type="button" className="dp-btn primary sm fs-sm" onClick={() => onTrial(v)}>🚀 {ctaTrial}</button>
                    <button type="button" className="dp-flex-more fs-sm" onClick={() => onExplore(v)}>{SU.flexMore} {arrow}</button>
                  </div>
                </div>
                {on && running && <span key={`bar-${v}`} className="dp-flex-bar" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
