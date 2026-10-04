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
  .hs{margin-top:26px;border-radius:22px;padding:22px clamp(14px,1.6vw,26px) 26px;border:1.5px solid #dbe4ee;box-shadow:0 20px 44px rgba(15,23,42,.08)}
  .hs-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:2px solid #e2e8f0}
  .hs-brand{display:flex;align-items:center;gap:14px;min-width:0}
  .hs-logo{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;color:#fff;flex-shrink:0;box-shadow:0 12px 24px rgba(15,23,42,.22)}
  .hs-title{font-weight:1000;color:#0f172a;line-height:1.2}
  .hs-sub{color:#475569;font-weight:700;margin-top:2px}
  .hs-pill{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;font-weight:900;white-space:nowrap}
  /* Groups flow into two balanced columns; every card is the same size. */
  .hs-cols{margin-top:22px;column-count:2;column-gap:26px}
  /* Each group sits in its own see-through panel, faintly tinted by its colour. */
  .hs-group{break-inside:avoid;display:inline-block;width:100%;box-sizing:border-box;margin:0 0 22px;vertical-align:top;padding:14px 14px 16px;border-radius:20px;background:linear-gradient(160deg,color-mix(in srgb,var(--c) 7%,transparent) 0%,color-mix(in srgb,var(--c) 2%,transparent) 100%);border:1.5px solid color-mix(in srgb,var(--c) 18%,transparent);box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 8px 22px color-mix(in srgb,var(--c) 7%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  @media (max-width:1100px){.hs-cols{column-count:1}}
  .hs-gh{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .hs-gbadge{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;background:var(--c);color:#fff;box-shadow:0 6px 16px color-mix(in srgb,var(--c) 30%,transparent)}
  .hs-gdot{width:26px;height:26px;border-radius:999px;display:grid;place-items:center;flex-shrink:0;background:rgba(255,255,255,.22)}
  .hs-gname{font-weight:1000;color:#fff}
  .hs-gname .gia-ar{opacity:.9}
  .hs-gline{flex:1;height:2px;border-radius:2px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 45%,transparent),transparent)}
  .hs-gcount{font-weight:1000;color:var(--c);background:color-mix(in srgb,var(--c) 12%,#fff);border:1.5px solid color-mix(in srgb,var(--c) 35%,#fff);border-radius:999px;padding:2px 10px}
  .hs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  @media (max-width:560px){.hs-grid{grid-template-columns:1fr}}
  .hs-card{position:relative;overflow:hidden;min-height:118px;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;text-align:start;width:100%;box-sizing:border-box;padding:15px 15px 15px 13px;border-radius:15px;background:linear-gradient(135deg,color-mix(in srgb,var(--c) 9%,#fff) 0%,#fff 62%);border:1.5px solid color-mix(in srgb,var(--c) 30%,#e2e8f0);border-inline-start:5px solid var(--c);box-shadow:0 6px 16px color-mix(in srgb,var(--c) 12%,transparent);font:inherit;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease;animation:giaIn .3s ease both}
  .hs-card:hover{transform:translateY(-3px);border-color:var(--c);box-shadow:0 16px 32px color-mix(in srgb,var(--c) 24%,transparent)}
  .hs-card.is-open{cursor:pointer}
  .hs-card.is-open:focus-visible{outline:3px solid color-mix(in srgb,var(--c) 50%,transparent);outline-offset:2px}
  .hs-ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 70%,#0f172a));box-shadow:0 8px 18px color-mix(in srgb,var(--c) 35%,transparent)}
  .hs-name{font-weight:950;color:#0f172a;line-height:1.3;padding-inline-end:24px}
  .hs-desc{color:#475569;font-weight:600;line-height:1.45;margin-top:5px;padding-top:6px;border-top:1px dashed color-mix(in srgb,var(--c) 30%,#e2e8f0)}
  .hs-corner{position:absolute;top:10px;inset-inline-end:10px}
  .hs-go{display:grid;place-items:center;width:26px;height:26px;border-radius:999px;background:var(--c);color:#fff;opacity:0;transform:translateX(-4px);transition:opacity .16s ease,transform .16s ease;font-weight:1000}
  .hs-card.is-open:hover .hs-go,.hs-card.is-open:focus-visible .hs-go{opacity:1;transform:none}

  /* Locked: frosted glass over the description and icon — the name stays
     readable, the rest only hints at what is there. */
  .hs-card.is-locked{cursor:not-allowed;user-select:none}
  .hs-card.is-locked .hs-ic{filter:blur(1.4px) saturate(.85)}
  .hs-glass{position:relative;margin-top:5px;border-radius:8px}
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
  #root .gia.gia .hs-gdot{font-size:14px !important}
  #root .gia.gia .hs-gname{font-size:15px !important}
  #root .gia.gia .hs-gcount,#root .gia.gia .hs-lock{font-size:11.5px !important}
  #root .gia.gia .hs-ic{font-size:21px !important}
  #root .gia.gia .hs-name{font-size:14.5px !important}
  #root .gia.gia .hs-desc{font-size:12.5px !important}
  #root .gia.gia .hs-go{font-size:14px !important}
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
      <div className="hs-cols">{children}</div>
    </section>
  );
}

/** One heading + its grid of cards. */
export function HomeGroup({ Two, icon, color, label, labelAr, count, children }) {
  return (
    <div className="hs-group" style={{ "--c": color }}>
      <div className="hs-gh">
        <span className="hs-gbadge">
          <span className="hs-gdot" aria-hidden="true">{icon}</span>
          <span className="hs-gname"><Two en={label} ar={labelAr} /></span>
        </span>
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
      style={{ "--c": color, animationDelay: `${index * 0.03}s` }}
      onClick={onOpen}
    >
      <span className="hs-corner hs-go" aria-hidden="true">→</span>
      <div className="hs-ic" aria-hidden="true">{item.icon}</div>
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
      style={{ "--c": color, animationDelay: `${index * 0.03}s` }}
    >
      <span className="hs-corner hs-lock" aria-hidden="true">
        🔒<span className="hs-lock-t"><Two en="After subscribing" ar="بعد الاشتراك" /></span>
      </span>
      <div className="hs-ic" aria-hidden="true">{item.icon}</div>
      <div style={{ minWidth: 0 }}>
        <Texts item={item} accent={accent} />
        <div className="hs-glass" aria-hidden="true"><Desc item={item} /></div>
      </div>
    </div>
  );
}
