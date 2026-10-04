// src/pages/trial/LockedCards.jsx
// Teaser cards on a TRIAL company's home screen (GenericIndustryApp): blurred,
// locked, and they open nothing — only the name reads clearly, to show what a
// subscription adds. Not real modules: no route, no report type behind them.
//
// ISO & HACCP is not one locked card but its own section (LockedIsoSection,
// below): every module grouped under headings, so the trial home shows how
// much a subscription really adds. Dubai Municipality lives inside it.

import React from "react";

export const LOCKED_CARDS = [
  { id: "training", icon: "🎓", grad: "linear-gradient(135deg,#7c3aed,#4f46e5)", label: "Internal Training", labelAr: "التدريب الداخلي" },
  { id: "maintenance", icon: "🛠️", grad: "linear-gradient(135deg,#ea580c,#c2410c)", label: "Maintenance", labelAr: "الصيانة" },
  { id: "inspector", icon: "🔍", grad: "linear-gradient(135deg,#2563eb,#1d4ed8)", label: "Inspector", labelAr: "المفتش" },
  { id: "vehicles", icon: "🚚", grad: "linear-gradient(135deg,#16a34a,#15803d)", label: "Vehicles", labelAr: "السيارات" },
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

/* ── ISO & HACCP: the modules, grouped and locked ── */
const ISO_GROUPS = [
  {
    id: "governance", icon: "🏛️", color: "#0f766e", label: "Policy & Compliance", labelAr: "السياسة والامتثال",
    items: [
      { icon: "📜", label: "Food Safety Policy", labelAr: "سياسة سلامة الغذاء", desc: "ISO 5.2 — controlled policy, employee acknowledgment & print for posting", descAr: "سياسة معتمدة مع إقرار الموظفين وطباعة للتعليق" },
      { icon: "📘", label: "SOP & sSOP", labelAr: "إجراءات التشغيل والتعقيم", desc: "Standard Operating & Sanitation SOPs — documents, versions & records", descAr: "إجراءات التشغيل والتعقيم — وثائق وإصدارات وسجلات" },
      { icon: "📑", label: "Licenses & Contracts", labelAr: "الرخص والعقود", desc: "Company licenses, permits, contracts & expiry tracking", descAr: "الرخص والتصاريح والعقود مع تتبّع تواريخ الانتهاء" },
      { icon: "🏛️", label: "Dubai Municipality Inspection", labelAr: "تفتيش بلدية دبي", desc: "DM inspection checklists, findings, photos & corrective actions", descAr: "قوائم تفتيش البلدية والملاحظات والصور والإجراءات التصحيحية" },
      { icon: "📢", label: "FSMS Communication Matrix", labelAr: "مصفوفة التواصل", desc: "ISO 7.4 — internal & external communication, 13 mandatory topics", descAr: "التواصل الداخلي والخارجي — 13 موضوعاً إلزامياً" },
    ],
  },
  {
    id: "suppliers", icon: "🤝", color: "#2563eb", label: "Suppliers & Products", labelAr: "الموردون والمنتجات",
    items: [
      { icon: "✅", label: "Supplier Evaluation", labelAr: "تقييم الموردين", desc: "Approved suppliers, evaluation scores, renewals & performance", descAr: "الموردون المعتمدون ودرجات التقييم والتجديد والأداء" },
      { icon: "🏷️", label: "Product Details & Specifications", labelAr: "مواصفات المنتجات", desc: "Product specs, labels, shelf life, allergens & claims", descAr: "مواصفات المنتج والملصقات ومدة الصلاحية ومسببات الحساسية" },
    ],
  },
  {
    id: "recall", icon: "🚨", color: "#dc2626", label: "Traceability & Recall", labelAr: "التتبّع والاستدعاء",
    items: [
      { icon: "🔁", label: "Mock Recall / Traceability Drill", labelAr: "تمرين الاستدعاء الوهمي", desc: "Quarterly drills — backward + forward trace, KPI & audit-ready logs", descAr: "تمارين ربع سنوية — تتبّع للخلف وللأمام ومؤشرات أداء" },
      { icon: "🚨", label: "Real Product Recall", labelAr: "استدعاء المنتج الفعلي", desc: "ISO 8.9.5 — Class I/II/III, authority notification & cost tracking", descAr: "الفئة I/II/III وإبلاغ الجهات وتتبّع التكلفة" },
      { icon: "📦", label: "Product Withdrawal", labelAr: "سحب المنتج", desc: "ISO 8.9.5 — withdrawal before the product reaches the consumer", descAr: "سحب المنتج قبل وصوله إلى المستهلك" },
    ],
  },
  {
    id: "control", icon: "🎯", color: "#7c3aed", label: "Operational Control", labelAr: "الرقابة التشغيلية",
    items: [
      { icon: "🎯", label: "CCP Monitoring Log", labelAr: "سجل مراقبة نقاط التحكم الحرجة", desc: "Critical Control Points — readings, deviations, corrective actions", descAr: "القراءات والانحرافات والإجراءات التصحيحية" },
      { icon: "🌡️", label: "Calibration Log", labelAr: "سجل المعايرة", desc: "Equipment calibration records, due dates, alerts & traceability", descAr: "سجلات معايرة الأجهزة والمواعيد والتنبيهات" },
      { icon: "🧪", label: "Internal Calibration Log", labelAr: "سجل المعايرة الداخلية", desc: "Daily / weekly probe verification — ice-point, boiling, master probe", descAr: "تحقق يومي وأسبوعي من المجسّات — نقطة الجليد والغليان" },
    ],
  },
  {
    id: "performance", icon: "📈", color: "#ea580c", label: "Performance & Improvement", labelAr: "الأداء والتحسين",
    items: [
      { icon: "🏁", label: "FSMS Objectives", labelAr: "أهداف نظام سلامة الغذاء", desc: "SMART objectives — targets, live progress, owners & review status", descAr: "أهداف ذكية — المستهدفات والتقدم والمسؤولون" },
      { icon: "📞", label: "Customer Complaints", labelAr: "شكاوى العملاء", desc: "Complaint logging, root cause (5-Whys), CAPA & trend analysis", descAr: "تسجيل الشكاوى والسبب الجذري والإجراءات التصحيحية" },
      { icon: "🌱", label: "Continual Improvement Log", labelAr: "سجل التحسين المستمر", desc: "ISO 10.2 — idea → approval → implementation → effectiveness", descAr: "من الفكرة إلى الاعتماد فالتنفيذ فقياس الفاعلية" },
    ],
  },
];

const ISO_COUNT = ISO_GROUPS.reduce((n, g) => n + g.items.length, 0);

// Class-based sizes: globals.css forces 14px on every #root element, so inline
// font sizes would be ignored (same pattern as the gia-* rules).
const ISO_CSS = `
  .lki{margin-top:30px;border-radius:20px;padding:22px clamp(14px,1.6vw,26px) 26px;background:linear-gradient(180deg,#f0fdfa 0%,#fff 46%);border:1px solid rgba(15,118,110,.16);box-shadow:0 18px 40px rgba(15,23,42,.06)}
  .lki-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding-bottom:16px;border-bottom:1px solid rgba(15,118,110,.14)}
  .lki-brand{display:flex;align-items:center;gap:14px;min-width:0}
  .lki-logo{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#0f766e,#0891b2);box-shadow:0 12px 24px rgba(15,118,110,.3);flex-shrink:0}
  .lki-title{font-weight:1000;color:#0f172a;line-height:1.2}
  .lki-sub{color:#64748b;font-weight:700;margin-top:2px}
  .lki-pill{display:inline-flex;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;background:#0f172a;color:#fff;font-weight:900;white-space:nowrap}
  .lki-group{margin-top:22px}
  .lki-gh{display:flex;align-items:center;gap:10px;margin-bottom:12px}
  .lki-gdot{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;flex-shrink:0}
  .lki-gname{font-weight:1000;color:#0f172a}
  .lki-gline{flex:1;height:1px;background:linear-gradient(90deg,rgba(15,23,42,.14),transparent)}
  .lki-gcount{font-weight:900;color:#64748b;background:#f1f5f9;border-radius:999px;padding:3px 10px}
  .lki-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr));gap:12px}
  .lki-card{position:relative;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;padding:14px 14px 14px 12px;border-radius:14px;background:#fff;border:1px solid rgba(15,23,42,.08);border-inline-start-width:4px;cursor:not-allowed;user-select:none;transition:transform .16s ease,box-shadow .16s ease;animation:giaIn .3s ease both}
  .lki-card:hover{transform:translateY(-2px);box-shadow:0 14px 28px rgba(15,23,42,.08)}
  .lki-ic{width:40px;height:40px;border-radius:11px;display:grid;place-items:center}
  .lki-name{font-weight:950;color:#0f172a;line-height:1.3;padding-inline-end:22px}
  .lki-desc{color:#64748b;font-weight:600;line-height:1.45;margin-top:4px}
  .lki-lock{position:absolute;top:10px;inset-inline-end:10px;opacity:.55}
  #root .gia.gia .lki-logo{font-size:26px !important}
  #root .gia.gia .lki-title{font-size:20px !important}
  #root .gia.gia .lki-sub,#root .gia.gia .lki-pill{font-size:13px !important}
  #root .gia.gia .lki-gdot{font-size:16px !important}
  #root .gia.gia .lki-gname{font-size:15px !important}
  #root .gia.gia .lki-gcount{font-size:11.5px !important}
  #root .gia.gia .lki-ic{font-size:20px !important}
  #root .gia.gia .lki-name{font-size:14.5px !important}
  #root .gia.gia .lki-desc{font-size:12.5px !important}
  #root .gia.gia .lki-lock{font-size:13px !important}
`;

/** ISO & HACCP section for a trial home: every module, grouped, locked. */
export function LockedIsoSection({ Two, accent }) {
  let n = 0;
  return (
    <section className="lki" aria-label={`ISO 22000 & HACCP — ${ISO_COUNT} modules, available after subscribing`}>
      <style>{ISO_CSS}</style>
      <div className="lki-head">
        <div className="lki-brand">
          <div className="lki-logo" aria-hidden="true">🛡️</div>
          <div style={{ minWidth: 0 }}>
            <div className="lki-title"><Two en="ISO 22000 & HACCP" ar="ISO 22000 و HACCP" /></div>
            <div className="lki-sub">
              <Two en={`${ISO_COUNT} modules for a complete food safety management system`} ar={`${ISO_COUNT} وحدة لنظام متكامل لإدارة سلامة الغذاء`} />
            </div>
          </div>
        </div>
        <span className="lki-pill">🔒 <Two en="After subscribing" ar="بعد الاشتراك" /></span>
      </div>

      {ISO_GROUPS.map((g) => (
        <div key={g.id} className="lki-group">
          <div className="lki-gh">
            <span className="lki-gdot" style={{ background: `${g.color}1a`, color: g.color }} aria-hidden="true">{g.icon}</span>
            <span className="lki-gname"><Two en={g.label} ar={g.labelAr} /></span>
            <span className="lki-gline" aria-hidden="true" />
            <span className="lki-gcount">{g.items.length}</span>
          </div>
          <div className="lki-grid">
            {g.items.map((it) => (
              <div
                key={it.label}
                className="lki-card"
                role="group"
                aria-disabled="true"
                title="Available after subscribing · متاح بعد الاشتراك"
                style={{ borderInlineStartColor: g.color, animationDelay: `${(n++) * 0.03}s` }}
              >
                <span className="lki-lock" aria-hidden="true">🔒</span>
                <div className="lki-ic" style={{ background: `${g.color}14` }} aria-hidden="true">{it.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="lki-name">
                    {it.label}
                    <div className="gia-ar gia-card-ar" lang="ar" dir="rtl" style={{ color: accent, marginTop: 2 }}>{it.labelAr}</div>
                  </div>
                  <div className="lki-desc">
                    {it.desc}
                    <div className="gia-ar" lang="ar" dir="rtl" style={{ marginTop: 2 }}>{it.descAr}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
