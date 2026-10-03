// src/pages/trial/LockedCards.jsx
// Teaser cards on a TRIAL company's home screen (GenericIndustryApp): blurred,
// locked, and they open nothing — only the name reads clearly, to show what a
// subscription adds. Not real modules: no route, no report type behind them.

import React from "react";

export const LOCKED_CARDS = [
  { id: "training", icon: "🎓", grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", label: "Internal Training", labelAr: "التدريب الداخلي" },
  { id: "isohaccp", icon: "🛡️", grad: "linear-gradient(135deg,#0f766e,#0891b2)", label: "ISO & HACCP", labelAr: "ISO و HACCP" },
  { id: "maintenance", icon: "🛠️", grad: "linear-gradient(135deg,#ea580c,#c2410c)", label: "Maintenance", labelAr: "الصيانة" },
  { id: "inspector", icon: "🔍", grad: "linear-gradient(135deg,#2563eb,#1d4ed8)", label: "Inspector", labelAr: "المفتش" },
  { id: "vehicles", icon: "🚚", grad: "linear-gradient(135deg,#16a34a,#15803d)", label: "Vehicles", labelAr: "السيارات" },
  { id: "dm", icon: "🏛️", grad: "linear-gradient(135deg,#b91c1c,#7f1d1d)", label: "Dubai Municipality", labelAr: "بلدية دبي" },
];

const L = {
  card: { position: "relative", overflow: "hidden", cursor: "not-allowed", userSelect: "none" },
  blur: { filter: "blur(5px)", opacity: 0.55, pointerEvents: "none" },
  name: { position: "relative", zIndex: 1, fontWeight: 1000, color: "#0f172a" },
  lock: {
    position: "absolute", top: 14, insetInlineEnd: 14, zIndex: 2,
    display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999,
    background: "rgba(15,23,42,.86)", color: "#fff", fontWeight: 900, whiteSpace: "nowrap",
  },
  shade: { position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(255,255,255,0) 30%,rgba(241,245,249,.75))", pointerEvents: "none" },
};

/** The locked cards, styled like the real ones (S = GenericIndustryApp's styles). */
export default function LockedCards({ S, startIndex = 0, Two, accent }) {
  return LOCKED_CARDS.map((c, i) => (
    <div
      key={`locked-${c.id}`}
      className="gia-card"
      role="group"
      aria-disabled="true"
      aria-label={`${c.label} — available after subscribing`}
      title="Available after subscribing · متاح بعد الاشتراك"
      style={{ ...S.card, ...L.card, animationDelay: `${(startIndex + i) * 0.05}s` }}
    >
      <span style={L.lock}>🔒 <Two en="After subscribing" ar="بعد الاشتراك" /></span>
      <div style={{ ...S.cardTop, ...L.blur }}>
        <div style={{ ...S.cardIcon, background: c.grad }}>{c.icon}</div>
      </div>
      <div className="gia-ct" style={{ ...S.cardTitle, ...L.name }}>
        {c.label}
        <div className="gia-ar gia-card-ar" lang="ar" dir="rtl" style={{ color: accent, marginTop: 3 }}>{c.labelAr}</div>
      </div>
      <div style={{ ...S.cardDesc, ...L.blur }} aria-hidden="true">
        Daily checks, records and reports for every branch, ready for any inspection.
        <div className="gia-ar" lang="ar" dir="rtl" style={{ marginTop: 2 }}>فحوصات وسجلات وتقارير يومية لكل فرع.</div>
      </div>
      <div style={{ ...S.cardFoot, ...L.blur }} aria-hidden="true"><span>Open</span><span>→</span></div>
      <div style={L.shade} aria-hidden="true" />
    </div>
  ));
}
