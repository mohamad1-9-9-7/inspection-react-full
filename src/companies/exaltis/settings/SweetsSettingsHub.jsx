// src/pages/sweets-settings/SweetsSettingsHub.jsx
// Settings card for the Confectionery (sweets) company-app. Same visual
// language as the sweets HACCP hub (teal hero + module cards). Admin-only —
// the card carries `adminOnly` in industries/sweets/index.js.
//
// First module: Excel export of every sweets report. It is the SAME
// ExcelBackupTab Al Mawashi's Settings uses (one sheet per report in its view
// design, folder tree ZIP, date filters, blank forms), limited to the
// catalog's "sweets" card so only this company's report types are listed.
// Data is company-scoped by the server token, so nothing else can leak in.
import React, { Suspense, lazy, useState } from "react";
import { Bi } from "../monitor/branches/sweets/bilingual";
import { getActiveCompanyName } from "../../utils/companyContext";

const ExcelBackupTab = lazy(() => import("../settings/ExcelBackupTab"));

const MODULES = [
  {
    id: "excel-export",
    icon: "📊",
    title: "Export All Reports (Excel)",
    titleAr: "تصدير كل التقارير (Excel)",
    subtitle: "Every report as its own Excel sheet in the view design — pick reports and a date range, download one ZIP",
    subtitleAr: "كل تقرير بملف Excel بنفس تصميم صفحة العرض — اختر التقارير والمدة ونزّل ملف ZIP واحد",
  },
];

const S = {
  shell: {
    minHeight: "100%",
    padding: "10px clamp(8px,1.4vw,18px) 26px",
    background: "linear-gradient(180deg,#f8fafc 0%,#eef7f4 44%,#f8fafc 100%)",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    color: "#0f172a",
  },
  hero: { position: "relative", overflow: "hidden", borderRadius: 14, padding: "20px clamp(16px,2vw,34px)", background: "linear-gradient(135deg, rgba(15,23,42,.96), rgba(71,85,105,.94) 52%, rgba(15,118,110,.92))", color: "#fff", boxShadow: "0 18px 44px rgba(15,23,42,.18)" },
  heroInner: { display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" },
  heroIcon: { width: 58, height: 58, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.28)", fontSize: 28, flexShrink: 0 },
  eyebrow: { margin: 0, fontWeight: 900, color: "rgba(255,255,255,.78)", letterSpacing: ".16em", textTransform: "uppercase" },
  title: { margin: "4px 0 0", fontWeight: 1000, lineHeight: 1.1 },
  subtitle: { margin: "6px 0 0", maxWidth: 640, color: "rgba(255,255,255,.82)", lineHeight: 1.45, fontWeight: 650 },
  grid: { marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%,280px),1fr))", gap: 14 },
  card: {
    display: "grid", gap: 10, minWidth: 0, padding: "16px 18px 13px", borderRadius: 14,
    border: "1px solid rgba(15,23,42,.1)", background: "#fff", cursor: "pointer", textAlign: "left",
    fontFamily: "inherit", boxShadow: "0 8px 20px rgba(15,23,42,.07)",
  },
  cardIcon: { width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center", background: "#ccfbf1", border: "1px solid #99f6e4", fontSize: 20 },
  cardTitle: { margin: 0, fontWeight: 1000, color: "#0f172a" },
  cardSub: { color: "#475569", fontWeight: 650, lineHeight: 1.5 },
  cardFoot: { paddingTop: 10, borderTop: "1px solid rgba(15,23,42,.09)", fontWeight: 950, color: "#0f766e" },
  back: { minHeight: 40, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(15,118,110,.28)", background: "#ecfeff", color: "#0f766e", fontWeight: 900, cursor: "pointer", marginBottom: 14 },
  loading: { padding: 30, textAlign: "center", color: "#64748b", fontWeight: 800 },
};

export default function SweetsSettingsHub() {
  const [openId, setOpenId] = useState(null);
  const brand = getActiveCompanyName() || "Confectionery";

  if (openId === "excel-export") {
    return (
      <main style={S.shell}>
        <button type="button" style={S.back} onClick={() => setOpenId(null)}>
          ← <Bi en="Back to Settings" ar="رجوع للإعدادات" />
        </button>
        <Suspense fallback={<div style={S.loading}>…</div>}>
          <ExcelBackupTab cardIds={["sweets"]} brand={brand} />
        </Suspense>
      </main>
    );
  }

  return (
    <main style={S.shell}>
      <section style={S.hero}>
        <div style={S.heroInner}>
          <div style={S.heroIcon}>⚙️</div>
          <div style={{ minWidth: 0 }}>
            <p style={S.eyebrow}><Bi en="Confectionery · Administration" ar="الحلويات · الإدارة" /></p>
            <h1 style={S.title}><Bi en="Settings" ar="الإعدادات" /></h1>
            <p style={S.subtitle}>
              <Bi en="Company tools for administrators." ar="أدوات الشركة للمسؤولين." />
            </p>
          </div>
        </div>
      </section>

      <div style={S.grid}>
        {MODULES.map((m) => (
          <button key={m.id} type="button" style={S.card} onClick={() => setOpenId(m.id)}>
            <div style={S.cardIcon}>{m.icon}</div>
            <div style={S.cardTitle}><Bi en={m.title} ar={m.titleAr} /></div>
            <div style={S.cardSub}><Bi en={m.subtitle} ar={m.subtitleAr} /></div>
            <div style={S.cardFoot}><Bi en="Open →" ar="فتح ←" /></div>
          </button>
        ))}
      </div>
    </main>
  );
}
