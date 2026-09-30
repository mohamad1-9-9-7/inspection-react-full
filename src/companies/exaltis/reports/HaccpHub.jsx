// src/pages/monitor/branches/sweets/HaccpHub.jsx
// HACCP hub for the Confectionery (sweets) company. Same visual language as
// Al Mawashi's HACCP/ISO command center (teal/cyan gradient hero + card grid),
// scoped to a small starter set of modules. Each module is a fully standalone
// sweets_haccp_* report type with its own manual Add/View pages (see
// HaccpRecordInput / HaccpRecordView) — none of them read, write or link to
// any Al Mawashi HACCP report or component.
import React, { useState } from "react";
import HaccpRecordInput from "./HaccpRecordInput";
import HaccpRecordView from "./HaccpRecordView";
import AllergenMatrix from "./AllergenMatrix";
import ReportGuide from "../../../generic/ReportGuide";
import { guideFor } from "./sweetsReportGuides";
import { Bi } from "./bilingual";

const MODULES = [
  {
    // Its own page (no Add / View split): one living matrix, edited in place.
    id: "allergen-matrix",
    type: "sweets_haccp_allergen_matrix",
    icon: "🥜",
    title: "Allergen Matrix",
    subtitle: "Every product × nuts, gluten, milk, eggs, sesame — label line & production run order",
    Page: AllergenMatrix,
  },
  {
    id: "supplier-evaluation",
    type: "sweets_haccp_supplier_eval",
    icon: "🤝",
    title: "Supplier Evaluation",
    subtitle: "Approved suppliers, evaluation scores, renewals & performance tracking",
  },
  {
    id: "sop",
    type: "sweets_haccp_sop",
    icon: "📋",
    title: "SOP",
    subtitle: "Standard Operating Procedures — documents, versions & records",
  },
  {
    id: "ccp-monitoring",
    type: "sweets_haccp_ccp_monitoring",
    icon: "🎯",
    title: "CCP Monitoring",
    subtitle: "Critical Control Points monitoring — readings, deviations, corrective actions",
  },
  {
    id: "dm-inspection",
    type: "sweets_haccp_dm_inspection",
    icon: "🏛️",
    title: "Dubai Municipality Inspection",
    subtitle: "DM inspection reports — uploaded manually, with findings & attachments",
  },
  {
    id: "mock-recall",
    type: "sweets_haccp_mock_recall",
    icon: "🔄",
    title: "Mock Recall / Traceability Drill",
    subtitle: "Quarterly traceability drills — backward + forward trace, KPI & audit-ready logs",
  },
];

const HUB_CSS = `
  html:has(.hhx-shell), body:has(.hhx-shell), #root:has(.hhx-shell) { overflow-x: clip; }
  #root .hhx.hhx-eyebrow { font-size: 10.5px !important; letter-spacing: .16em; text-transform: uppercase; }
  #root .hhx.hhx-title { font-size: clamp(19px, 1.9vw, 30px) !important; }
  #root .hhx.hhx-subtitle { font-size: 13px !important; }
  #root .hhx.hhx-stat-value { font-size: clamp(20px, 1.7vw, 28px) !important; }
  #root .hhx.hhx-stat-label { font-size: 10.5px !important; letter-spacing: .10em; text-transform: uppercase; }
  #root .hhx.hhx-card-title { font-size: 15px !important; }
  #root .hhx.hhx-card-sub { font-size: 12.5px !important; }
  #root .hhx.hhx-card-foot { font-size: 11px !important; letter-spacing: .08em; text-transform: uppercase; }
  #root .hhx.hhx-pill { font-size: 10px !important; letter-spacing: .08em; text-transform: uppercase; }
  #root .hhx.hhx-footer { font-size: 11px !important; letter-spacing: .10em; text-transform: uppercase; }
  #root .hhx-card:focus-visible { outline: 2px solid #0f766e; outline-offset: 2px; }
  @media (max-width: 980px) { .hhx-hero-inner { grid-template-columns: 1fr !important; } }
`;

const S = {
  shell: {
    minHeight: "100%",
    padding: "10px clamp(8px,1.4vw,18px) 26px",
    background: "linear-gradient(180deg,#f8fafc 0%,#eef7f4 44%,#f8fafc 100%)",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },

  hero: { position: "relative", overflow: "hidden", borderRadius: 14, padding: "20px clamp(16px,2vw,34px)", background: "linear-gradient(135deg, rgba(15,23,42,.96), rgba(15,118,110,.94) 52%, rgba(8,145,178,.92))", color: "#fff", border: "1px solid rgba(255,255,255,.2)", boxShadow: "0 18px 44px rgba(15,23,42,.18)" },
  heroGlow: { position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(760px 260px at 12% 0%, rgba(45,212,191,.28), transparent 62%), radial-gradient(700px 300px at 90% 20%, rgba(125,211,252,.22), transparent 60%)" },
  heroInner: { position: "relative", display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", alignItems: "center", gap: 18 },
  heroIcon: { width: 58, height: 58, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", fontSize: 28, flexShrink: 0 },
  eyebrow: { margin: 0, fontWeight: 900, color: "rgba(255,255,255,.78)" },
  title: { margin: "4px 0 0", fontWeight: 1000, lineHeight: 1.1, letterSpacing: "-.01em" },
  subtitle: { margin: "6px 0 0", maxWidth: 640, color: "rgba(255,255,255,.82)", lineHeight: 1.45, fontWeight: 650 },
  stat: { borderRadius: 10, padding: "10px 16px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)", textAlign: "center", minWidth: 100 },
  statValue: { fontWeight: 1000, lineHeight: 1 },
  statLabel: { marginTop: 5, color: "rgba(255,255,255,.76)", fontWeight: 800 },

  grid: { marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%,280px),1fr))", gap: 14 },
  card: (hover) => ({
    position: "relative", minHeight: 168, height: "100%", display: "grid", gridTemplateRows: "auto 1fr auto", gap: 12,
    // one column that may shrink to the card: content can never widen the card
    gridTemplateColumns: "minmax(0,1fr)", minWidth: 0,
    padding: "16px 18px 13px", borderRadius: 14, border: hover ? "1px solid rgba(15,118,110,.48)" : "1px solid rgba(15,23,42,.1)",
    background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
    boxShadow: hover ? "0 20px 42px rgba(15,23,42,.15)" : "0 8px 20px rgba(15,23,42,.07)",
    transform: hover ? "translateY(-3px)" : "translateY(0)", transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
  }),
  cardAccent: (hover) => ({ position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: "#0f766e", opacity: hover ? 1 : .3 }),
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center", color: "#0f766e", background: "#ccfbf1", border: "1px solid #99f6e4", fontSize: 20, flexShrink: 0 },
  pill: { padding: "5px 10px", borderRadius: 999, background: "#f1f5f9", color: "#475569", fontWeight: 900, whiteSpace: "nowrap" },
  cardTitle: { margin: 0, fontWeight: 1000, lineHeight: 1.25, color: "#0f172a" },
  cardSub: { marginTop: 7, color: "#475569", fontWeight: 650, lineHeight: 1.5 },
  cardFoot: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 11, borderTop: "1px solid rgba(15,23,42,.09)", fontWeight: 950, color: "#0f766e" },

  footer: { marginTop: 22, textAlign: "center", color: "#64748b", fontWeight: 800 },

  pageWrap: { width: "100%", margin: "10px auto 0" },
  moduleWrap: { width: "min(760px,100%)", margin: "10px auto 0" },
  back: { minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(15,118,110,.28)", background: "#ecfeff", color: "#0f766e", fontWeight: 900, cursor: "pointer", marginBottom: 16 },
  moduleIntro: { marginBottom: 18 },
  moduleTitle: { fontWeight: 1000, fontSize: 21, color: "#0f172a" },
  moduleSub: { marginTop: 4, color: "#64748b", fontWeight: 700 },
};

export default function HaccpHub() {
  const [openId, setOpenId] = useState(null);
  const [mode, setMode] = useState(null); // null | "input" | "view"
  const active = MODULES.find((m) => m.id === openId) || null;

  const openModule = (id) => { setOpenId(id); setMode(null); };
  const ActivePage = active?.Page || null;
  const backToHub = () => { setOpenId(null); setMode(null); };
  const backToModule = () => setMode(null);

  return (
    <main className="hhx-shell" style={S.shell}>
      <style>{HUB_CSS}</style>
      <div style={S.layout}>
        {!active && (
          <>
            <section style={S.hero}>
              <div aria-hidden="true" style={S.heroGlow} />
              <div className="hhx-hero-inner" style={S.heroInner}>
                <div style={S.heroIcon}>🛡️</div>
                <div style={{ minWidth: 0 }}>
                  <p className="hhx hhx-eyebrow" style={S.eyebrow}><Bi en="Confectionery · Food Safety" ar="الحلويات · سلامة الغذاء" /></p>
                  <h1 className="hhx hhx-title" style={S.title}><Bi en="HACCP" /></h1>
                  <p className="hhx hhx-subtitle" style={S.subtitle}>
                    <Bi en="Central access to HACCP modules. Records are added manually." ar="وصول مركزي لوحدات الهاسب — تُضاف السجلات يدوياً." />
                  </p>
                </div>
                <div style={S.stat}>
                  <div className="hhx hhx-stat-value" style={S.statValue}>{MODULES.length}</div>
                  <div className="hhx hhx-stat-label" style={S.statLabel}><Bi en="Modules" ar="وحدات" /></div>
                </div>
              </div>
            </section>

            <div style={S.grid}>
              {MODULES.map((m) => (
                <HubCard key={m.id} m={m} onOpen={() => openModule(m.id)} />
              ))}
            </div>

            <div className="hhx hhx-footer" style={S.footer}><Bi en="Confectionery — Food Safety System" ar="الحلويات — نظام سلامة الغذاء" /></div>
          </>
        )}

        {ActivePage && (
          <div style={S.pageWrap}>
            <button type="button" style={S.back} onClick={backToHub}>← <Bi en="Back to HACCP" ar="رجوع للهاسب" /></button>
            <ReportGuide id={active.type} guide={guideFor(active.type)} />
            <div style={{ marginTop: 12 }}><ActivePage /></div>
          </div>
        )}

        {active && !ActivePage && !mode && (
          <div style={S.moduleWrap}>
            <button type="button" style={S.back} onClick={backToHub}>← <Bi en="Back to HACCP" ar="رجوع للهاسب" /></button>
            <div style={S.moduleIntro}>
              <div style={S.moduleTitle}>{active.icon} <Bi en={active.title} /></div>
              <div style={S.moduleSub}><Bi en={active.subtitle} /></div>
            </div>
            <div style={S.grid}>
              {[
                { m: "input", label: "Add Record", ar: "إضافة سجل", desc: "Type or upload a new record", descAr: "اكتب أو ارفع سجلاً جديداً", icon: "➕" },
                { m: "view", label: "View Records", ar: "عرض السجلات", desc: "Browse saved records", descAr: "تصفح السجلات المحفوظة", icon: "🗂️" },
              ].map((x) => (
                <button
                  key={x.m}
                  type="button"
                  className="hhx-card"
                  style={S.card(false)}
                  onClick={() => setMode(x.m)}
                >
                  <div style={S.cardTop}>
                    <div style={S.cardIcon}>{x.icon}</div>
                  </div>
                  <div className="hhx hhx-card-title" style={S.cardTitle}><Bi en={x.label} ar={x.ar} stack /></div>
                  <div className="hhx hhx-card-sub" style={S.cardSub}><Bi en={x.desc} ar={x.descAr} stack /></div>
                  <div className="hhx hhx-card-foot" style={S.cardFoot}>
                    <span><Bi en="Open" ar="فتح" /></span>
                    <span aria-hidden="true">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {active && !ActivePage && mode && (
          <div style={S.moduleWrap}>
            <button type="button" style={S.back} onClick={backToModule}>← <Bi en={`Back to ${active.title}`} ar="رجوع" /></button>
            {mode === "input" ? (
              <HaccpRecordInput reportType={active.type} title={active.title} icon={active.icon} onSaved={backToModule} />
            ) : (
              <HaccpRecordView reportType={active.type} title={active.title} icon={active.icon} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function HubCard({ m, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      className="hhx-card"
      style={S.card(hover)}
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      title={m.title}
    >
      <span aria-hidden="true" style={S.cardAccent(hover)} />
      <div style={S.cardTop}>
        <div style={S.cardIcon}>{m.icon}</div>
        <span className="hhx hhx-pill" style={S.pill}><Bi en="Module" ar="وحدة" /></span>
      </div>
      <div>
        <h2 className="hhx hhx-card-title" style={S.cardTitle}><Bi en={m.title} stack /></h2>
        <div className="hhx hhx-card-sub" style={S.cardSub}><Bi en={m.subtitle} stack /></div>
      </div>
      <div className="hhx hhx-card-foot" style={S.cardFoot}>
        <span><Bi en="Open" ar="فتح" /></span>
        <span aria-hidden="true">→</span>
      </div>
    </button>
  );
}
