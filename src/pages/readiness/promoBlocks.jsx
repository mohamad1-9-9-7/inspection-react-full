// src/pages/readiness/promoBlocks.jsx
// Sales blocks shared by the public /demo and /readiness pages. Everything
// time-bound or factual (the launch offer, the referral discount, the
// customer story) comes from the server config the owner edits in Platform
// Center → Demo Requests — GET /api/demo-config only returns what is switched
// on and not expired, so these blocks never show a stale deadline or a story
// nobody wrote.

import React, { useEffect, useState } from "react";
import API_BASE from "../../config/api";

/** { whatsapp, offer?, referral?, story? } — empty until the server answers. */
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

/* Paper folders vs the dashboard, drawn — no photos to go stale. */
export function BeforeAfter({ lang }) {
  const t = T[lang];
  return (
    <div className="promo-ba" style={S.ba}>
      <div style={S.baCol}>
        <div style={{ ...S.baTag, background: "#fee2e2", color: "#b91c1c" }}>✗ {t.before}</div>
        <svg viewBox="0 0 220 140" style={S.baSvg} aria-hidden="true">
          <rect x="0" y="0" width="220" height="140" rx="12" fill="#fef7ed" />
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${34 + i * 3} ${96 - i * 15}) rotate(${[-4, 3, -2, 5, -6][i]})`}>
              <rect width="120" height="22" rx="3" fill={["#d6b27a", "#c9a268", "#e0bf8a", "#cfa972", "#dcb880"][i]} stroke="#a47d46" />
              <rect x="8" y="-5" width="40" height="7" rx="2" fill="#f8fafc" stroke="#cbd5e1" />
            </g>
          ))}
          {[0, 1, 2].map((i) => (
            <rect key={i} x={150 + i * 8} y={30 + i * 26} width="44" height="32" rx="2" fill="#fff" stroke="#cbd5e1" transform={`rotate(${[8, -10, 14][i]} 172 ${46 + i * 26})`} />
          ))}
          <text x="170" y="128" fontSize="22" textAnchor="middle">❓</text>
        </svg>
        <p style={S.baCap}>{t.beforeCap}</p>
      </div>
      <div style={S.baCol}>
        <div style={{ ...S.baTag, background: "#d1fae5", color: "#047857" }}>✓ {t.after}</div>
        <svg viewBox="0 0 220 140" style={S.baSvg} aria-hidden="true">
          <rect x="0" y="0" width="220" height="140" rx="12" fill="#f0fdfa" />
          <rect x="16" y="14" width="188" height="112" rx="8" fill="#fff" stroke="#99f6e4" />
          <rect x="16" y="14" width="188" height="16" rx="8" fill="#0f766e" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x={26 + i * 60} y="38" width="52" height="26" rx="5" fill={["#d1fae5", "#cffafe", "#fef3c7"][i]} />
              <rect x={32 + i * 60} y="44" width="22" height="6" rx="2" fill={["#059669", "#0891b2", "#d97706"][i]} />
              <rect x={32 + i * 60} y="54" width="34" height="4" rx="2" fill="#cbd5e1" />
            </g>
          ))}
          {[0, 1, 2, 3].map((i) => (
            <g key={i}>
              <circle cx="32" cy={78 + i * 11} r="3.5" fill={i === 2 ? "#d97706" : "#059669"} />
              <rect x="42" y={75 + i * 11} width={[110, 90, 120, 70][i]} height="6" rx="3" fill="#e2e8f0" />
            </g>
          ))}
          <rect x="168" y="74" width="26" height="42" rx="4" fill="#0f766e" opacity=".12" />
          <rect x="172" y="96" width="5" height="16" fill="#0f766e" />
          <rect x="180" y="86" width="5" height="26" fill="#0891b2" />
          <rect x="188" y="80" width="5" height="32" fill="#059669" />
        </svg>
        <p style={S.baCap}>{t.afterCap}</p>
      </div>
    </div>
  );
}

export const PROMO_CSS = `
#root .promo-offer.promo-offer * { font-size: 15px !important; }
@media (max-width: 620px) { .promo-ba { grid-template-columns: 1fr !important; } }
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
  ba: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  baCol: { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 12, display: "grid", gap: 8, alignContent: "start" },
  baTag: { justifySelf: "start", borderRadius: 999, padding: "3px 12px", fontWeight: 1000 },
  baSvg: { width: "100%", height: "auto", display: "block" },
  baCap: { margin: 0, fontWeight: 800, color: "#475569", lineHeight: 1.6 },
};
