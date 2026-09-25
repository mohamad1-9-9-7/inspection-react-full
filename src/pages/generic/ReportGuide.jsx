// src/pages/generic/ReportGuide.jsx
// Collapsible "how to fill this report" panel shown by the company-app shell
// above a report page when the industry template gives the report a `guide`
// (see industries/sweets/index.js + sweetsReportGuides.js).
//
// Bilingual on purpose (user request): every line shows its English and its
// Arabic twin together. `compact` (view pages) keeps only the limits table and
// the notes, so the reviewer reads the same limits the person filling it did.
// The open/closed state is a per-viewer convenience in localStorage.

import React, { useState } from "react";

const KEY = "gia_guide_open_v1";
const readOpen = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };

function Bi({ v, strong = false }) {
  if (!v) return null;
  return (
    <span style={{ display: "block" }}>
      <span style={{ display: "block", fontWeight: strong ? 800 : 600 }}>{v.en}</span>
      <span dir="rtl" style={{ display: "block", color: "#475569", fontWeight: strong ? 800 : 600, textAlign: "right" }}>{v.ar}</span>
    </span>
  );
}

export default function ReportGuide({ guide, id, compact = false }) {
  const stateKey = `${id}:${compact ? "v" : "i"}`;
  const [open, setOpen] = useState(() => {
    const saved = readOpen()[stateKey];
    return saved === undefined ? !compact : !!saved;
  });
  if (!guide) return null;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(KEY, JSON.stringify({ ...readOpen(), [stateKey]: next })); } catch { /* optional */ }
  };

  return (
    <section className="no-print" style={S.box}>
      <button type="button" onClick={toggle} style={S.head} aria-expanded={open}>
        <span style={S.headIcon}>📘</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          <span style={{ display: "block", fontWeight: 900 }}>{compact ? "Limits & notes" : "How to fill this report"}</span>
          <span dir="rtl" style={{ display: "block", fontWeight: 800, opacity: 0.85, textAlign: "left" }}>{compact ? "الحدود والملاحظات" : "طريقة تعبئة التقرير"}</span>
        </span>
        <span style={S.chev}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={S.body}>
          {!compact && (
            <div style={S.grid2}>
              <div style={S.tile}><div style={S.tileLabel}>🎯 Purpose · الهدف</div><Bi v={guide.purpose} /></div>
              <div style={S.tile}><div style={S.tileLabel}>🕒 When & who · متى ومن</div><Bi v={guide.when} /></div>
            </div>
          )}

          {!compact && guide.steps?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={S.secLabel}>🧭 Steps · خطوات الإنشاء</div>
              <ol style={S.steps}>
                {guide.steps.map((s, i) => (
                  <li key={i} style={S.step}>
                    <span style={S.stepNo}>{i + 1}</span>
                    <Bi v={s} />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {guide.limits?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={S.secLabel}>📏 Limits · الحدود</div>
              <div style={{ overflowX: "auto" }}>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>Parameter · البند</th>
                      <th style={{ ...S.th, background: "#dcfce7", color: "#166534" }}>✓ Allowed · المسموح</th>
                      <th style={{ ...S.th, background: "#fee2e2", color: "#991b1b" }}>✕ Critical · الحرج</th>
                      <th style={S.th}>Action · الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guide.limits.map((l, i) => (
                      <tr key={i}>
                        <td style={S.td}><Bi v={l.param} strong /></td>
                        <td style={{ ...S.td, background: "#f0fdf4" }}><Bi v={l.allowed} /></td>
                        <td style={{ ...S.td, background: "#fef2f2" }}><Bi v={l.critical} /></td>
                        <td style={S.td}><Bi v={l.action} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {guide.notes?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={S.secLabel}>💡 Notes · ملاحظات</div>
              {guide.notes.map((n, i) => (
                <div key={i} style={S.note}><Bi v={n} /></div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const S = {
  box: { margin: "12px clamp(.75rem,2.5vw,2rem) 0", background: "#fff", border: "1px solid #99f6e4", borderRadius: 16, boxShadow: "0 6px 18px rgba(15,118,110,.08)", overflow: "hidden" },
  head: { display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", cursor: "pointer", padding: "10px 14px", background: "linear-gradient(135deg,#f0fdfa,#ecfeff)", color: "#134e4a", fontFamily: "inherit" },
  headIcon: { width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", flexShrink: 0 },
  chev: { color: "#0f766e", fontWeight: 900 },
  body: { padding: "12px 14px 14px", color: "#0f172a" },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 },
  tile: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "9px 11px" },
  tileLabel: { fontWeight: 900, color: "#0f766e", marginBottom: 4 },
  secLabel: { fontWeight: 900, color: "#0f766e", marginBottom: 6 },
  steps: { listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 },
  step: { display: "flex", gap: 10, alignItems: "flex-start", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 10px" },
  stepNo: { minWidth: 24, height: 24, borderRadius: 999, display: "grid", placeItems: "center", background: "#0f766e", color: "#fff", fontWeight: 900, flexShrink: 0 },
  table: { borderCollapse: "collapse", width: "100%", minWidth: 640 },
  th: { border: "1px solid #cbd5e1", background: "#ecfdf5", color: "#134e4a", padding: "7px 8px", textAlign: "left", fontWeight: 900, whiteSpace: "nowrap" },
  td: { border: "1px solid #e2e8f0", padding: "7px 8px", verticalAlign: "top" },
  note: { background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "7px 10px", marginBottom: 6 },
};
