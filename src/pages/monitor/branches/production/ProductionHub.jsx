// src/pages/monitor/branches/production/ProductionHub.jsx
import React, { useState, Suspense, lazy } from "react";

/* ===== Lazy Inputs (يتم عرضها داخل التبويبات) ===== */
const PersonalHygienePRDInput   = lazy(() => import("./PersonalHygienePRDInput"));
const CleaningChecklistPRDInput = lazy(() => import("./CleaningChecklistPRDInput"));
const PRDDefrostingRecordInput  = lazy(() => import("./PRDDefrostingRecordInput"));
const PRDTraceabilityLogInput   = lazy(() => import("./PRDTraceabilityLogInput")); // ⬅️ جديد

/* أيقونات بسيطة */
const Svg = (p) => ({
  width: 18, height: 18, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 1.9,
  strokeLinecap: "round", strokeLinejoin: "round", ...p
});
const IconHygiene = () => (
  <svg {...Svg()}><circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
);
const IconCleaning = () => (
  <svg {...Svg()}><path d="M3 21h18"/><path d="M6 21v-8l5-2 7 2v8"/><path d="M9 21v-3M12 21v-6M15 21v-4"/></svg>
);
const IconDefrost = () => (
  <svg {...Svg()}><path d="M12 2v20"/><path d="M4 6l16 12"/><path d="M20 6L4 18"/></svg>
);
/* أيقونة التتبّع */
const IconTrace = () => (
  <svg {...Svg()}>
    <path d="M7 7l-3 3a4 4 0 0 0 0 6l1 1a4 4 0 0 0 6 0l3-3" />
    <path d="M17 17l3-3a4 4 0 0 0 0-6l-1-1a4 4 0 0 0-6 0l-3 3" />
    <path d="M9 12a3 3 0 0 1 3-3h2" />
    <path d="M15 12a3 3 0 0 1-3 3H10" />
  </svg>
);

const TABS = [
  { key: "personal",     title: "Personal Hygiene (PRD)",   Icon: IconHygiene, Comp: PersonalHygienePRDInput },
  { key: "cleaning",     title: "CLEANING CHECKLIST (PRD)", Icon: IconCleaning, Comp: CleaningChecklistPRDInput },
  { key: "defrost",      title: "PRD Defrosting Record",    Icon: IconDefrost,  Comp: PRDDefrostingRecordInput },
  { key: "traceability", title: "Traceability Log (PRD)",   Icon: IconTrace,    Comp: PRDTraceabilityLogInput }, // ⬅️ جديد
];

export default function ProductionHub() {
  const [active, setActive] = useState(TABS[0].key);
  const ActiveComp = TABS.find(t => t.key === active)?.Comp || TABS[0].Comp;

  return (
    <div
      className="page"
      style={{
        direction: "ltr",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{`
        .page{ width:100%; max-width:100vw; overflow-x:hidden; }
        .shell{ width:100%; max-width:100vw; margin:0; }
        .hero{
          position:relative; color:#111827; background:#fff;
          border:1px solid #e5e7eb; border-radius:0; padding:16px 18px;
          box-shadow:0 10px 30px rgba(0,0,0,.06);
        }
        .hero h1{ margin:0; font-size:20px; font-weight:900; letter-spacing:.3px; }
        .sub{ color:#64748b; font-size:12px; font-weight:800; }

        /* تبويبات أفقية بعرض الشاشة مع سكرول */
        .tabsBar{
          display:flex; gap:12px; margin-top:14px;
          flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch;
          padding-bottom:6px;
        }
        .tabsBar::-webkit-scrollbar{ height:8px; }
        .tabsBar::-webkit-scrollbar-thumb{ background:#e5e7eb; border-radius:4px; }

        .tabBtn{
          flex:0 0 auto;
          display:flex; align-items:center; gap:8px;
          padding:12px 18px; border-radius:10px;
          border:1px solid #e5e7eb; background:#f1f5f9; color:#334155;
          font-weight:800; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,.04);
          transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
        }
        .tabBtn:hover{ transform:translateY(-1px); }
        .tabBtn.active{
          background:#2563eb; color:#fff; border-color:#1d4ed8;
          box-shadow:0 6px 18px rgba(37,99,235,.25);
        }

        /* اللوحة بعرض الشاشة */
        .panel{
          margin-top:0; background:#ffffff; border:1px solid #e5e7eb;
          border-left:none; border-right:none; border-radius:0; padding:0;
          box-shadow:0 10px 30px rgba(0,0,0,.06);
        }
      `}</style>

      <div className="shell">
        <div className="hero" role="banner" aria-label="PRD Reports">
          <h1>PRD Reports</h1>
          <div className="sub">All inputs in one place (tabs like FTR 2)</div>

          {/* تبويبات الإدخال فقط */}
          <div className="tabsBar" role="tablist" aria-label="PRD Inputs">
            {TABS.map(({ key, title, Icon }) => (
              <button
                key={key}
                role="tab"
                className={`tabBtn ${active === key ? "active" : ""}`}
                aria-selected={active === key}
                onClick={() => setActive(key)}
              >
                <Icon /> {title}
              </button>
            ))}
          </div>
        </div>

        {/* محتوى التبويب النشط (إدخال فقط) */}
        <div className="panel" role="tabpanel" aria-live="polite">
          <Suspense fallback={<div style={{padding:12, fontWeight:800}}>Loading…</div>}>
            <ActiveComp />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
