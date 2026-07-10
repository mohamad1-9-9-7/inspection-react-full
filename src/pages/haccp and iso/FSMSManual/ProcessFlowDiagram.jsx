// src/pages/haccp and iso/FSMSManual/ProcessFlowDiagram.jsx
// Annex B — data-driven Process Flow Diagrams.
// Renders the FSMS_PROCESS_FLOWS data as elegant vertical flow charts with
// CCP highlighting, temperature chips and side branches. Fully bilingual /
// RTL-aware, and print-safe (used both on screen and in the PDF export).

import React, { useEffect, useMemo, useState } from "react";
import { FLOW_THEMES, countCCPs } from "./flowDiagrams";

/* Keyframes injected once (guarded) so connectors can animate on screen.
   Harmless in the PDF export — html2canvas captures a single frame. */
const KEYFRAMES_ID = "fsms-flow-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const el = document.createElement("style");
  el.id = KEYFRAMES_ID;
  el.textContent = `
    @keyframes fsmsFlowDash { to { stroke-dashoffset: -14; } }
    @keyframes fsmsFlowPulse { 0%,100% { opacity:.55; transform:translateY(0); } 50% { opacity:1; transform:translateY(2px); } }
  `;
  document.head.appendChild(el);
}

const T = (theme) => FLOW_THEMES[theme] || FLOW_THEMES.combined;

/* ---- One step box ---------------------------------------------------- */
function StepBox({ step, index, total, theme, lang, animate }) {
  const ar = lang === "ar";
  const th = T(theme);
  const isCCP = !!step.ccp;
  const label = ar && step.labelAr ? step.labelAr : step.label;

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 14,
          padding: "12px 16px",
          background: isCCP
            ? "linear-gradient(135deg,#fff5f5,#ffffff)"
            : "#ffffff",
          border: `1.5px solid ${isCCP ? "#fecaca" : th.ring}`,
          boxShadow: isCCP
            ? "0 10px 26px rgba(220,38,38,.14)"
            : "0 8px 20px rgba(15,23,42,.06)",
          borderInlineStart: isCCP ? "5px solid #dc2626" : `5px solid ${th.ink}`,
        }}
      >
        {/* Step index chip */}
        <div
          style={{
            flexShrink: 0,
            width: 30,
            height: 30,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            fontSize: 13,
            fontWeight: 1000,
            color: "#fff",
            background: isCCP ? "linear-gradient(135deg,#dc2626,#ef4444)" : th.grad,
            boxShadow: "0 4px 10px rgba(15,23,42,.18)",
          }}
        >
          {index + 1}
        </div>

        {/* Label + temp */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 900, color: "#0f172a", lineHeight: 1.4 }}>
            {label}
          </div>
          {step.temp && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginTop: 5,
                fontSize: 11.5,
                fontWeight: 900,
                color: th.ink,
                background: th.soft,
                border: `1px solid ${th.ring}`,
                borderRadius: 999,
                padding: "2px 9px",
              }}
            >
              🌡️ {step.temp}
            </span>
          )}
        </div>

        {/* CCP pill */}
        {isCCP && (
          <span
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11.5,
              fontWeight: 1000,
              letterSpacing: ".02em",
              color: "#fff",
              background: "linear-gradient(135deg,#dc2626,#f43f5e)",
              borderRadius: 999,
              padding: "4px 11px",
              boxShadow: "0 6px 14px rgba(220,38,38,.30)",
            }}
          >
            🎯 {step.ccp}
          </span>
        )}
      </div>

      {/* Side branch (e.g. Waste → Disposal) */}
      {step.branch && <BranchBox branch={step.branch} theme={theme} lang={lang} />}

      {/* Connector down to next step */}
      {index < total - 1 && <Connector theme={theme} animate={animate} />}
    </div>
  );
}

/* ---- Vertical connector between steps -------------------------------- */
function Connector({ theme, animate }) {
  const th = T(theme);
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3px 0" }}>
      <svg width="26" height="30" viewBox="0 0 26 30" style={{ overflow: "visible" }}>
        <line
          x1="13" y1="0" x2="13" y2="20"
          stroke={th.ink} strokeWidth="2.4" strokeLinecap="round"
          strokeDasharray="5 5"
          style={animate ? { animation: "fsmsFlowDash 0.9s linear infinite" } : undefined}
        />
        <path
          d="M6 19 L13 27 L20 19"
          fill="none" stroke={th.ink} strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          style={animate ? { animation: "fsmsFlowPulse 1.6s ease-in-out infinite" } : undefined}
        />
      </svg>
    </div>
  );
}

/* ---- Side branch block ----------------------------------------------- */
function BranchBox({ branch, theme, lang }) {
  const ar = lang === "ar";
  const th = T(theme);
  const label = ar && branch.labelAr ? branch.labelAr : branch.label;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 10,
        margin: "8px 0 0 26px",
        marginInlineStart: 26,
      }}
    >
      {/* Elbow connector */}
      <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 6 }}>
        <span style={{ fontSize: 18, color: "#94a3b8", fontWeight: 900 }}>{ar ? "↰" : "↳"}</span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          background: "#f8fafc",
          border: "1px dashed #cbd5e1",
          borderRadius: 12,
          padding: "8px 12px",
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 900, color: "#475569" }}>♻️ {label}</span>
        {branch.steps?.map((s, i) => (
          <React.Fragment key={i}>
            <span style={{ color: "#94a3b8", fontWeight: 900 }}>{ar ? "←" : "→"}</span>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 900,
                color: "#64748b",
                background: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "3px 10px",
              }}
            >
              {ar && s.labelAr ? s.labelAr : s.label}
            </span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ---- One flow card --------------------------------------------------- */
export function ProcessFlowDiagram({ flow, lang, animate = true }) {
  const ar = lang === "ar";
  const th = T(flow.category);
  const ccpCount = countCCPs(flow);
  const title = ar && flow.titleAr ? flow.titleAr : flow.title;

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      style={{
        breakInside: "avoid",
        background: "#fff",
        border: `1px solid ${th.ring}`,
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 14px 36px rgba(15,23,42,.08)",
      }}
    >
      {/* Header band */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 18px",
          background: th.grad,
          color: "#fff",
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            fontSize: 22,
            background: "rgba(255,255,255,.18)",
            border: "1px solid rgba(255,255,255,.25)",
            flexShrink: 0,
          }}
        >
          {th.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 1000, lineHeight: 1.3 }}>{title}</div>
          <div style={{ fontSize: 11.5, fontWeight: 800, opacity: 0.92, marginTop: 2 }}>
            {ar ? th.labelAr : th.label}
            {flow.site ? ` · ${flow.site}` : ""}
          </div>
        </div>
        {/* Stat chips */}
        <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
          <span style={statChip}>
            {flow.steps.length} {ar ? "خطوة" : "steps"}
          </span>
          {ccpCount > 0 && (
            <span style={{ ...statChip, background: "rgba(220,38,38,.92)", border: "1px solid rgba(255,255,255,.3)" }}>
              {ccpCount} CCP
            </span>
          )}
        </div>
      </div>

      {/* Steps */}
      <div style={{ padding: "18px clamp(14px,2.4vw,24px)", background: `linear-gradient(180deg,${th.soft},#ffffff)` }}>
        {flow.steps.map((step, i) => (
          <StepBox
            key={i}
            step={step}
            index={i}
            total={flow.steps.length}
            theme={flow.category}
            lang={lang}
            animate={animate}
          />
        ))}
      </div>
    </div>
  );
}

const statChip = {
  fontSize: 11,
  fontWeight: 1000,
  color: "#fff",
  background: "rgba(255,255,255,.20)",
  border: "1px solid rgba(255,255,255,.28)",
  borderRadius: 999,
  padding: "4px 10px",
  whiteSpace: "nowrap",
};

/* ---- Gallery: selector + one/all flows ------------------------------- */
export default function ProcessFlowGallery({ flows = [], lang = "en", printMode = false }) {
  const ar = lang === "ar";
  const [active, setActive] = useState("all"); // "all" | flow.id

  useEffect(() => { if (!printMode) ensureKeyframes(); }, [printMode]);

  const shown = printMode || active === "all"
    ? flows
    : flows.filter((f) => f.id === active);

  const totalCCP = useMemo(() => flows.reduce((n, f) => n + countCCPs(f), 0), [flows]);

  if (!flows.length) return null;

  return (
    <div dir={ar ? "rtl" : "ltr"} style={{ marginTop: 16 }}>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          padding: "10px 14px",
          background: "#f8fafc",
          border: "1px solid #e6ebf1",
          borderRadius: 12,
          marginBottom: 14,
          fontSize: 12,
          fontWeight: 800,
          color: "#475569",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 16, height: 16, borderRadius: 5, background: "linear-gradient(135deg,#dc2626,#f43f5e)", display: "inline-block" }} />
          {ar ? "نقطة تحكّم حرجة (CCP)" : "Critical Control Point (CCP)"}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>🌡️ {ar ? "حدّ حرج للحرارة" : "Temperature critical limit"}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>♻️ {ar ? "فرع المخلفات" : "Waste branch"}</span>
        <span style={{ marginInlineStart: "auto", color: "#0f766e", fontWeight: 1000 }}>
          {flows.length} {ar ? "مخطط" : "diagrams"} · {totalCCP} CCP
        </span>
      </div>

      {/* Selector chips (screen only) */}
      {!printMode && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <FilterChip active={active === "all"} onClick={() => setActive("all")}>
            {ar ? "الكل" : "All"} ({flows.length})
          </FilterChip>
          {flows.map((f) => {
            const th = T(f.category);
            return (
              <FilterChip key={f.id} active={active === f.id} onClick={() => setActive(f.id)} icon={th.icon}>
                {(ar && f.titleAr ? f.titleAr : f.title).split(" — ")[0]}
              </FilterChip>
            );
          })}
        </div>
      )}

      {/* Diagrams */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: (printMode || active === "all")
            ? "repeat(auto-fit, minmax(320px, 1fr))"
            : "1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        {shown.map((flow) => (
          <ProcessFlowDiagram key={flow.id} flow={flow} lang={lang} animate={!printMode} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 13px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 1000,
        cursor: "pointer",
        fontFamily: "inherit",
        border: active ? "1px solid #0f766e" : "1px solid #e2e8f0",
        color: active ? "#fff" : "#334155",
        background: active ? "linear-gradient(135deg,#0f766e,#14b8a6)" : "#fff",
        boxShadow: active ? "0 8px 18px rgba(15,118,110,.22)" : "0 2px 6px rgba(15,23,42,.05)",
        transition: "all .15s ease",
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
