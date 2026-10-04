// src/pages/generic/HomeSection.jsx
// A titled, grouped block of cards on a company home screen
// (GenericIndustryApp). Two uses share the one look:
//   • Daily Reports  — open cards, each opens its report directly
//   • ISO & HACCP    — locked teaser cards under frosted glass (trial only,
//                      pages/trial/LockedCards)

import React from "react";

// Class-based sizes: globals.css forces 14px on every #root element, so inline
// font sizes would be ignored (same pattern as the gia-* rules).
const CSS = `
  .hs{margin-top:26px;border-radius:20px;padding:22px clamp(14px,1.6vw,26px) 26px;border:1px solid rgba(15,23,42,.08);box-shadow:0 18px 40px rgba(15,23,42,.06)}
  .hs-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:1px solid rgba(15,23,42,.08)}
  .hs-brand{display:flex;align-items:center;gap:14px;min-width:0}
  .hs-logo{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;color:#fff;flex-shrink:0;box-shadow:0 12px 24px rgba(15,23,42,.18)}
  .hs-title{font-weight:1000;color:#0f172a;line-height:1.2}
  .hs-sub{color:#64748b;font-weight:700;margin-top:2px}
  .hs-pill{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;font-weight:900;white-space:nowrap}
  .hs-group{margin-top:22px}
  .hs-gh{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .hs-gdot{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
  .hs-gname{font-weight:1000;color:#0f172a}
  .hs-gline{flex:1;height:1px;background:linear-gradient(90deg,rgba(15,23,42,.14),transparent)}
  .hs-gcount{font-weight:900;color:#64748b;background:#f1f5f9;border-radius:999px;padding:3px 10px}
  .hs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr));gap:12px}
  .hs-card{position:relative;overflow:hidden;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;text-align:start;width:100%;box-sizing:border-box;padding:14px 14px 14px 12px;border-radius:14px;background:#fff;border:1px solid rgba(15,23,42,.08);border-inline-start-width:4px;font:inherit;transition:transform .16s ease,box-shadow .16s ease;animation:giaIn .3s ease both}
  .hs-card:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(15,23,42,.09)}
  .hs-card.is-open{cursor:pointer}
  .hs-card.is-open:focus-visible{outline:3px solid rgba(15,118,110,.45);outline-offset:2px}
  .hs-ic{width:40px;height:40px;border-radius:11px;display:grid;place-items:center}
  .hs-name{font-weight:950;color:#0f172a;line-height:1.3;padding-inline-end:24px}
  .hs-desc{color:#64748b;font-weight:600;line-height:1.45;margin-top:4px}
  .hs-corner{position:absolute;top:10px;inset-inline-end:10px}
  .hs-go{opacity:0;transform:translateX(-4px);transition:opacity .16s ease,transform .16s ease;font-weight:1000}
  .hs-card.is-open:hover .hs-go,.hs-card.is-open:focus-visible .hs-go{opacity:1;transform:none}

  /* Locked: frosted glass over the description and icon — the name stays
     readable, the rest only hints at what is there. */
  .hs-card.is-locked{cursor:not-allowed;user-select:none;background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(241,245,249,.82))}
  .hs-card.is-locked .hs-ic{filter:blur(1.6px) saturate(.7)}
  .hs-glass{position:relative;margin-top:4px;border-radius:8px}
  .hs-glass .hs-desc{margin-top:0;filter:blur(3.4px);opacity:.75}
  .hs-glass::after{content:"";position:absolute;inset:-4px -6px;border-radius:9px;background:linear-gradient(115deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,.12) 38%,rgba(255,255,255,.62) 50%,rgba(255,255,255,.12) 62%,rgba(255,255,255,.4) 100%);background-size:240% 100%;border:1px solid rgba(255,255,255,.7);box-shadow:inset 0 1px 0 rgba(255,255,255,.9);-webkit-backdrop-filter:blur(1.5px);backdrop-filter:blur(1.5px);animation:hsSheen 5.5s ease-in-out infinite}
  .hs-card.is-locked:hover .hs-glass::after{animation-duration:1.8s}
  .hs-lock{display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;background:rgba(15,23,42,.06);color:#334155;font-weight:900;white-space:nowrap}
  .hs-lock .hs-lock-t{max-width:0;overflow:hidden;transition:max-width .25s ease}
  .hs-card.is-locked:hover .hs-lock{background:#0f172a;color:#fff}
  .hs-card.is-locked:hover .hs-lock .hs-lock-t{max-width:160px}
  @keyframes hsSheen{0%,100%{background-position:100% 0}50%{background-position:0 0}}
  @media (prefers-reduced-motion:reduce){.hs-glass::after{animation:none}}

  #root .gia.gia .hs-logo{font-size:26px !important}
  #root .gia.gia .hs-title{font-size:20px !important}
  #root .gia.gia .hs-sub,#root .gia.gia .hs-pill{font-size:13px !important}
  #root .gia.gia .hs-gdot{font-size:16px !important}
  #root .gia.gia .hs-gname{font-size:15px !important}
  #root .gia.gia .hs-gcount,#root .gia.gia .hs-lock{font-size:11.5px !important}
  #root .gia.gia .hs-ic{font-size:20px !important}
  #root .gia.gia .hs-name{font-size:14.5px !important}
  #root .gia.gia .hs-desc{font-size:12.5px !important}
  #root .gia.gia .hs-go{font-size:15px !important}
`;

/** The section frame: heading row + groups as children. */
export function HomeSection({ Two, icon, logoBg, title, titleAr, sub, subAr, pill, pillAr, pillStyle, bg, label, children }) {
  return (
    <section className="hs" aria-label={label || title} style={{ background: bg }}>
      <style>{CSS}</style>
      <div className="hs-head">
        <div className="hs-brand">
          <div className="hs-logo" style={{ background: logoBg }} aria-hidden="true">{icon}</div>
          <div style={{ minWidth: 0 }}>
            <div className="hs-title"><Two en={title} ar={titleAr} /></div>
            {sub && <div className="hs-sub"><Two en={sub} ar={subAr} /></div>}
          </div>
        </div>
        {pill && <span className="hs-pill" style={pillStyle}><Two en={pill} ar={pillAr} /></span>}
      </div>
      {children}
    </section>
  );
}

/** One heading + its grid of cards. */
export function HomeGroup({ Two, icon, color, label, labelAr, count, children }) {
  return (
    <div className="hs-group">
      <div className="hs-gh">
        <span className="hs-gdot" style={{ background: `${color}1a`, color }} aria-hidden="true">{icon}</span>
        <span className="hs-gname"><Two en={label} ar={labelAr} /></span>
        <span className="hs-gline" aria-hidden="true" />
        <span className="hs-gcount">{count}</span>
      </div>
      <div className="hs-grid">{children}</div>
    </div>
  );
}

function Texts({ item, accent }) {
  return (
    <div className="hs-name">
      {item.label}
      {item.labelAr && <div className="gia-ar gia-card-ar" lang="ar" dir="rtl" style={{ color: accent, marginTop: 2 }}>{item.labelAr}</div>}
    </div>
  );
}
function Desc({ item }) {
  if (!item.desc) return null;
  return (
    <div className="hs-desc">
      {item.desc}
      {item.descAr && <div className="gia-ar" lang="ar" dir="rtl" style={{ marginTop: 2 }}>{item.descAr}</div>}
    </div>
  );
}

/** A card that opens something. */
export function OpenCard({ item, color, accent, index = 0, onOpen }) {
  return (
    <button
      type="button"
      className="hs-card is-open"
      style={{ borderInlineStartColor: color, animationDelay: `${index * 0.03}s` }}
      onClick={onOpen}
    >
      <span className="hs-corner hs-go" style={{ color }} aria-hidden="true">→</span>
      <div className="hs-ic" style={{ background: `${color}14` }} aria-hidden="true">{item.icon}</div>
      <div style={{ minWidth: 0 }}>
        <Texts item={item} accent={accent} />
        <Desc item={item} />
      </div>
    </button>
  );
}

/** A locked teaser: readable name, description under frosted glass. */
export function LockedCard({ item, color, accent, index = 0, Two }) {
  return (
    <div
      className="hs-card is-locked"
      role="group"
      aria-disabled="true"
      aria-label={`${item.label} — available after subscribing`}
      title="Available after subscribing · متاح بعد الاشتراك"
      style={{ borderInlineStartColor: color, animationDelay: `${index * 0.03}s` }}
    >
      <span className="hs-corner hs-lock" aria-hidden="true">
        🔒<span className="hs-lock-t"><Two en="After subscribing" ar="بعد الاشتراك" /></span>
      </span>
      <div className="hs-ic" style={{ background: `${color}14` }} aria-hidden="true">{item.icon}</div>
      <div style={{ minWidth: 0 }}>
        <Texts item={item} accent={accent} />
        <div className="hs-glass" aria-hidden="true"><Desc item={item} /></div>
      </div>
    </div>
  );
}
