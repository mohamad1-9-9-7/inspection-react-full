/* /demo "pick your business" accordion: one panel per sector side by side.
   Desktop: hovering (or focusing) a panel widens it and shows its three pains.
   Phone: panels stack and a tap opens one. Pure CSS flex-grow, no library.
   Styles: .dp-flex* in DemoRequest.css. */
import React, { useEffect, useState } from "react";
import { SECTORS, SECTOR_ORDER, SECTOR_UI, SECTOR_LOOK } from "./demoSectors";

export default function DemoSectorFlex({ lang, sector, ctaTrial, arrow, onTrial, onExplore }) {
  const [active, setActive] = useState(sector || SECTOR_ORDER[0]);
  const SU = SECTOR_UI[lang];
  // a pick in the chips strip above opens the same panel here
  useEffect(() => { if (sector) setActive(sector); }, [sector]);

  return (
    <section id="sectors" className="dp-section tight dp-flex-sec">
      <div className="dp-wrap">
        <div className="dp-center">
          <span className="dp-eyebrow fs-xs">{SU.flexEyebrow}</span>
          <h2 className="dp-h2 fs-h2">{SU.flexTitle}</h2>
        </div>
        <div className="dp-flex">
          {SECTOR_ORDER.map((v) => {
            const s = SECTORS[v][lang];
            const look = SECTOR_LOOK[v];
            const on = active === v;
            return (
              <div key={v} className={`dp-flex-p${on ? " on" : ""}`} style={{ "--fx-bg": look.bg, "--fx-ac": look.ac }}
                onMouseEnter={() => setActive(v)}>
                <button type="button" className="dp-flex-head" aria-expanded={on} onClick={() => setActive(v)} onFocus={() => setActive(v)}>
                  <span className="dp-flex-emo" aria-hidden="true">{look.emo}</span>
                  <span className="dp-flex-name fs-sm">{s.chip}</span>
                </button>
                {/* React 18 passes inert through only as a string; "" = on, undefined = off */}
                <div className="dp-flex-body" aria-hidden={!on} inert={on ? undefined : ""}>
                  <h3 className="fs-h3">{s.h1a} <span>{s.h1b}</span></h3>
                  <ul>
                    {s.pains.map(([ic, h]) => (
                      <li key={h} className="fs-sm"><i aria-hidden="true">{ic}</i>{h}</li>
                    ))}
                  </ul>
                  <div className="dp-flex-cta">
                    <button type="button" className="dp-btn primary sm fs-sm" onClick={() => onTrial(v)}>🚀 {ctaTrial}</button>
                    <button type="button" className="dp-flex-more fs-sm" onClick={() => onExplore(v)}>{SU.flexMore} {arrow}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
