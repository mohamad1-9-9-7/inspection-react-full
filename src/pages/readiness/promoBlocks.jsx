// src/pages/readiness/promoBlocks.jsx
// Sales blocks shared by the public /demo and /readiness pages. Everything
// time-bound or factual (the launch offer, the referral discount, the
// customer story) comes from the server config the owner edits in Platform
// Center → Demo Requests — GET /api/demo-config only returns what is switched
// on and not expired, so these blocks never show a stale deadline or a story
// nobody wrote.

import React, { useEffect, useState } from "react";
import API_BASE from "../../config/api";

/** { whatsapp, offer?, referral?, story?, testimonials? } — empty until the server answers. */
export function useDemoConfig() {
  const [cfg, setCfg] = useState({ whatsapp: "" });
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/demo-config`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => {
        if (!alive || !j) return;
        setCfg({
          whatsapp: String(j.whatsapp || "").replace(/\D/g, ""),
          offer: j.offer || null,
          referral: j.referral || null,
          story: j.story || null,
          testimonials: Array.isArray(j.testimonials) ? j.testimonials : [],
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return cfg;
}

// Days left including today, in Dubai time (the server compares the same way).
function daysLeft(endsAt) {
  const today = new Date(Date.now() + 4 * 3600_000).toISOString().slice(0, 10);
  return Math.round((Date.parse(endsAt) - Date.parse(today)) / 864e5) + 1;
}
const fmtDate = (iso, lang) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(lang === "ar" ? "ar-AE" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const arMonths = (m) => (m === 1 ? "شهر واحد" : m === 2 ? "شهرين" : m <= 10 ? `${m} أشهر` : `${m} شهرًا`);

const T = {
  en: {
    offerTag: "Limited-time offer",
    offer: "No setup fee for every company that subscribes before",
    left: (n) => (n <= 1 ? "Last day" : `${n} days left`),
    refTitle: "Already a customer?",
    ref: (p, m) => `Recommend another company. When it subscribes, you get ${p}% off your subscription for ${m} months.`,
    storyTag: "From our customers",
    before: "Before",
    after: "After",
    beforeCap: "Paper folders at every branch — slow to find, easy to lose.",
    afterCap: "Every branch on one screen, ready for the inspector in minutes.",
    pains: ["Searching by hand", "Missing signatures", "Records lost or damaged"],
    photoCredit: "Photo: Wesley Tingey / Unsplash",
    ui: {
      search: "Temperature log · POS 10 · September",
      found: "18 records found",
      branches: "Branches today",
      rows: [["POS 10", 100], ["POS 15", 100], ["QCS", 86], ["POS 19", 72]],
      export: "Export PDF",
      live: "Live",
    },
  },
  ar: {
    offerTag: "عرض لفترة محدودة",
    offer: "إعفاء من رسوم التأسيس لكل شركة تشترك قبل",
    left: (n) => (n <= 1 ? "اليوم الأخير" : n === 2 ? "متبقٍّ يومان" : n <= 10 ? `متبقٍّ ${n} أيام` : `متبقٍّ ${n} يومًا`),
    refTitle: "هل أنت من عملائنا؟",
    ref: (p, m) => `رشّح شركة أخرى، وعند اشتراكها تحصل على خصم ${p}% على اشتراكك لمدة ${arMonths(m)}.`,
    storyTag: "من تجارب عملائنا",
    before: "قبل",
    after: "بعد",
    beforeCap: "ملفات ورقية في كل فرع — يصعب الوصول إليها ويسهل ضياعها.",
    afterCap: "جميع الفروع على شاشة واحدة، وجاهزة للمفتش خلال دقائق.",
    pains: ["بحث يدوي مرهق", "توقيعات ناقصة", "سجلات تضيع أو تتلف"],
    photoCredit: "Photo: Wesley Tingey / Unsplash",
    ui: {
      search: "سجل الحرارة · POS 10 · سبتمبر",
      found: "تم العثور على 18 سجلًا",
      branches: "الفروع اليوم",
      rows: [["POS 10", 100], ["POS 15", 100], ["QCS", 86], ["POS 19", 72]],
      export: "تصدير PDF",
      live: "مباشر",
    },
  },
};

export function OfferBanner({ offer, lang }) {
  if (!offer?.endsAt) return null;
  const n = daysLeft(offer.endsAt);
  if (n < 1) return null;
  const t = T[lang];
  return (
    <div className="promo-offer" style={S.offer}>
      <span style={S.offerTag}>🎁 {t.offerTag}</span>
      <span style={{ flex: "1 1 240px", fontWeight: 900 }}>
        {t.offer} <b style={{ whiteSpace: "nowrap" }}>{fmtDate(offer.endsAt, lang)}</b>
      </span>
      <span style={S.offerLeft}>⏳ {t.left(n)}</span>
    </div>
  );
}

export function ReferralNote({ referral, lang }) {
  if (!referral?.pct) return null;
  const t = T[lang];
  return (
    <div style={S.ref}>
      <span style={{ fontSize: 26 }} aria-hidden="true">🤝</span>
      <div>
        <div style={{ fontWeight: 1000 }}>{t.refTitle}</div>
        <div style={{ fontWeight: 700, color: "#475569", lineHeight: 1.6 }}>{t.ref(referral.pct, referral.months || 12)}</div>
      </div>
    </div>
  );
}

/* One language per page: a story is shown only in the language it was written in. */
export function StoryCard({ story, lang }) {
  const text = story?.[lang];
  if (!text) return null;
  return (
    <figure style={S.story}>
      <div style={S.storyTag}>💬 {T[lang].storyTag}</div>
      <blockquote style={S.quote}>{text}</blockquote>
    </figure>
  );
}

/* Before: a real photo of paper files (Unsplash licence, hot-linked from
   their CDN). After: the product itself — a live-looking dashboard panel. */
const PAPER_PHOTO = "https://images.unsplash.com/photo-1583521214690-73421a1829a9?auto=format&fit=crop&w=1100&q=72";

const barColor = (pct) =>
  pct === 100 ? "linear-gradient(90deg,#2dd4bf,#10b981)"
    : pct >= 80 ? "linear-gradient(90deg,#22d3ee,#0ea5e9)"
      : "linear-gradient(90deg,#fbbf24,#f59e0b)";

export function BeforeAfter({ lang }) {
  const t = T[lang];
  const u = t.ui;
  return (
    <div className="promo-ba">
      <figure className="pba-card pba-before">
        <img src={PAPER_PHOTO} alt="" loading="lazy" decoding="async" className="pba-photo" />
        <div className="pba-shade" />
        <span className="pba-tag bad">✕ {t.before}</span>
        <span className="pba-credit"><bdi>{t.photoCredit}</bdi></span>
        <div className="pba-pains">
          {t.pains.map((x) => <span key={x}>{x}</span>)}
        </div>
        <figcaption className="pba-cap">{t.beforeCap}</figcaption>
      </figure>

      <figure className="pba-card pba-after">
        <div className="pba-glow" />
        <span className="pba-tag good">✓ {t.after}</span>
        <div className="pba-ui" aria-hidden="true">
          <div className="pba-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <span className="q">{u.search}</span>
            <span className="ok">✓ {u.found}</span>
          </div>
          <div className="pba-panel">
            <div className="pba-panel-h"><b>{u.branches}</b><span className="live"><i />{u.live}</span></div>
            {u.rows.map(([name, pct]) => (
              <div className="pba-row" key={name}>
                <span className="nm" dir="ltr">{name}</span>
                <span className="bar"><i style={{ width: `${pct}%`, background: barColor(pct) }} /></span>
                <span className="pc" dir="ltr">{pct}%</span>
              </div>
            ))}
          </div>
          <div className="pba-foot">
            <span className="pdf">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5" /></svg>
              {u.export}
            </span>
          </div>
        </div>
        <figcaption className="pba-cap">{t.afterCap}</figcaption>
      </figure>
    </div>
  );
}

export const PROMO_CSS = `
#root .promo-offer.promo-offer * { font-size: 15px !important; }
.promo-ba { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
.pba-card { position: relative; margin: 0; min-height: 380px; border-radius: 22px; overflow: hidden; isolation: isolate; display: flex; flex-direction: column; justify-content: flex-end; padding: 22px; box-shadow: 0 30px 60px -30px rgba(15,23,42,.45); }
.pba-before { background: #3b3a36; }
.pba-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: -2; filter: saturate(.8) contrast(1.05); transform: scale(1.02); transition: transform 6s ease; }
.pba-before:hover .pba-photo { transform: scale(1.08); }
.pba-shade { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgba(15,10,5,.1) 0%, rgba(15,10,5,.2) 40%, rgba(15,10,5,.9) 100%); }
.pba-tag { position: absolute; top: 18px; inset-inline-start: 18px; padding: 6px 14px; border-radius: 999px; font-weight: 800; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.pba-tag.bad { background: rgba(254,226,226,.94); color: #b91c1c; }
.pba-tag.good { background: rgba(209,250,229,.95); color: #047857; }
.pba-credit { position: absolute; top: 24px; inset-inline-end: 18px; color: rgba(255,255,255,.6); font-weight: 600; }
.pba-pains { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.pba-pains span { padding: 6px 12px; border-radius: 10px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.24); color: #fff; font-weight: 700; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
.pba-pains span::before { content: "✕"; color: #fca5a5; margin-inline-end: 6px; font-weight: 900; }
.pba-cap { color: #fff; font-weight: 700; line-height: 1.6; }
.pba-after { background: radial-gradient(500px circle at 80% 0%, rgba(34,211,238,.25), transparent 55%), radial-gradient(500px circle at 0% 100%, rgba(20,184,166,.3), transparent 55%), #081226; }
.pba-glow { position: absolute; inset: auto -20% -40% -20%; height: 60%; background: radial-gradient(closest-side, rgba(45,212,191,.25), transparent); z-index: -1; }
.pba-ui { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; margin: 44px 0 16px; min-width: 0; }
.pba-search { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 14px; background: #fff; color: #334155; box-shadow: 0 16px 30px -12px rgba(0,0,0,.5); font-weight: 700; }
.pba-search .q { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pba-search .ok { flex: 0 0 auto; padding: 3px 10px; border-radius: 999px; background: #d1fae5; color: #047857; font-weight: 800; white-space: nowrap; }
.pba-panel { border-radius: 16px; padding: 14px 16px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); display: grid; gap: 10px; }
.pba-panel-h { display: flex; justify-content: space-between; align-items: center; color: #e2e8f0; }
.pba-panel-h .live { display: inline-flex; align-items: center; gap: 6px; color: #5eead4; font-weight: 800; }
.pba-panel-h .live i { width: 8px; height: 8px; border-radius: 50%; background: #2dd4bf; animation: pba-ping 1.8s infinite; }
@keyframes pba-ping { 0% { box-shadow: 0 0 0 0 rgba(45,212,191,.6); } 70% { box-shadow: 0 0 0 8px rgba(45,212,191,0); } 100% { box-shadow: 0 0 0 0 rgba(45,212,191,0); } }
.pba-row { display: grid; grid-template-columns: 64px 1fr 44px; align-items: center; gap: 10px; color: #cbd5e1; font-weight: 700; }
.pba-row .bar { height: 8px; border-radius: 8px; background: rgba(255,255,255,.08); overflow: hidden; }
.pba-row .bar i { display: block; height: 100%; border-radius: 8px; }
.pba-row .pc { text-align: end; color: #fff; font-weight: 800; }
.pba-foot { display: flex; justify-content: flex-end; }
.pba-foot .pdf { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px; background: linear-gradient(135deg,#5eead4,#22d3ee); color: #04211d; font-weight: 800; }
#root .promo-ba.promo-ba .pba-tag, #root .promo-ba.promo-ba .pba-pains span, #root .promo-ba.promo-ba .pba-search, #root .promo-ba.promo-ba .pba-search *, #root .promo-ba.promo-ba .pba-panel-h b { font-size: 14px !important; }
#root .promo-ba.promo-ba .pba-cap { font-size: 16px !important; }
#root .promo-ba.promo-ba .pba-panel-h .live, #root .promo-ba.promo-ba .pba-row, #root .promo-ba.promo-ba .pba-row *, #root .promo-ba.promo-ba .pba-foot .pdf { font-size: 12.5px !important; }
#root .promo-ba.promo-ba .pba-credit { font-size: 10.5px !important; }
@media (max-width: 720px) { .promo-ba { grid-template-columns: minmax(0, 1fr); } .pba-card { min-height: 340px; } }
@media (prefers-reduced-motion: reduce) { .pba-photo { transition: none; } .pba-panel-h .live i { animation: none; } }
@keyframes promo-glow { 0%,100% { box-shadow: 0 10px 24px rgba(217,119,6,.18); } 50% { box-shadow: 0 10px 30px rgba(217,119,6,.36); } }
.promo-offer { animation: promo-glow 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .promo-offer { animation: none; } }
`;

const S = {
  offer: {
    display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px 14px", padding: "12px 16px",
    borderRadius: 14, background: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "1.5px solid #fbbf24",
    color: "#78350f", marginBottom: 16,
  },
  offerTag: { background: "#d97706", color: "#fff", borderRadius: 999, padding: "4px 12px", fontWeight: 1000, whiteSpace: "nowrap" },
  offerLeft: { background: "#fff", border: "1px solid #fbbf24", borderRadius: 999, padding: "4px 12px", fontWeight: 1000, whiteSpace: "nowrap" },
  ref: {
    display: "flex", gap: 12, alignItems: "flex-start", padding: "14px 16px", borderRadius: 14,
    background: "#eff6ff", border: "1px solid #bfdbfe", color: "#0f172a",
  },
  story: { margin: 0, padding: "16px 18px", borderRadius: 14, background: "#fff", border: "1px solid #e2e8f0", borderInlineStart: "5px solid #0f766e" },
  storyTag: { color: "#0f766e", fontWeight: 1000, marginBottom: 6 },
  quote: { margin: 0, fontWeight: 700, color: "#334155", lineHeight: 1.8, whiteSpace: "pre-wrap" },
};
