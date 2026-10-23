// src/pages/haccp and iso/MockRecall/AutoTraceSummary.jsx
//
// The automatic-trace summary saved on a drill (payload.linked.autoTrace),
// shown in the drill view: the numbers as they were when the drill ran, plus
// a way back into Product Traceability for the same code.

import React from "react";

const dmy = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso || "")) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "—");
const kg = (n) => `${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US")} kg`;

export default function AutoTraceSummary({ trace, lang, onOpenTrace }) {
  if (!trace) return null;
  const ar = lang === "ar";
  const L = (en, a) => (ar ? a : en);
  const sent = (Number(trace.sentOur) || 0) + (Number(trace.sentCustomers) || 0);
  const pct = trace.inKg > 0 ? Math.min(100, (sent / trace.inKg) * 100) : null;
  const items = [
    [L("Shipment", "الشحنة"), `${dmy(trace.shipmentDate)} · ${trace.supplier || "—"} · ${trace.invoiceNo || "—"}`],
    [L("Received", "الوارد"), kg(trace.inKg)],
    [L("To our branches", "لفروعنا"), kg(trace.sentOur)],
    [L("To customers", "للعملاء"), kg(trace.sentCustomers)],
    [L("Returns", "المرتجعات"), kg(trace.returnsQty)],
    [L("Not found", "غير موجود"), trace.unaccounted > 0 ? kg(trace.unaccounted) : "✓"],
    [L("Labels printed", "ملصقات مطبوعة"), trace.labels ? `${trace.labels.copies} · ${trace.labels.lots?.length || 0} ${L("lot(s)", "دفعة")}` : "—"],
    [L("Window until", "النافذة حتى"), trace.windowUntil ? dmy(trace.windowUntil) : L("open", "مفتوحة")],
  ];
  return (
    <div style={S.box}>
      <div style={S.head}>
        <span style={{ fontWeight: 900, color: "#4c1d95" }}>🧬 {L("Automatic trace", "التتبّع التلقائي")} — {trace.product} [{trace.code}]</span>
        {pct != null && <span style={{ ...S.pill, ...(pct >= 99 ? S.ok : S.warn) }}>{pct.toFixed(1)}%</span>}
        <span style={{ flex: 1 }} />
        {onOpenTrace && trace.code && (
          <button type="button" style={S.btn} onClick={() => onOpenTrace(trace.code)}>{L("Open in Product Traceability", "افتح في تتبّع المنتج")}</button>
        )}
      </div>
      <div style={S.grid}>
        {items.map(([k, v]) => (
          <div key={k} style={S.cell}>
            <div style={S.k}>{k}</div>
            <div style={S.v}>{v}</div>
          </div>
        ))}
      </div>
      {Array.isArray(trace.branches) && trace.branches.length > 0 && (
        <div style={S.branches}>
          {trace.branches.map((b) => {
            const diff = Math.round(((Number(b.qty) || 0) - (Number(b.logged) || 0)) * 100) / 100;
            return (
              <span key={b.id} style={{ ...S.pill, ...(Math.abs(diff) < 0.5 ? S.ok : S.warn) }}>
                {b.id}: {kg(b.qty)} → {kg(b.logged)}
              </span>
            );
          })}
        </div>
      )}
      <div style={S.foot}>{L("Traced at", "وقت التتبّع")} {trace.tracedAt ? new Date(trace.tracedAt).toLocaleString() : "—"}</div>
    </div>
  );
}

const S = {
  box: { background: "linear-gradient(180deg,#f5f3ff,#eef4ff)", border: "1px solid #ddd6fe", borderRadius: 12, padding: 12, marginBottom: 14 },
  head: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 },
  cell: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "7px 10px" },
  k: { color: "#64748b", fontWeight: 700, fontSize: "0.78rem" },
  v: { color: "#0f172a", fontWeight: 800 },
  branches: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 },
  pill: { borderRadius: 999, padding: "3px 10px", fontWeight: 800, fontSize: "0.8rem", border: "1px solid" },
  ok: { background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" },
  warn: { background: "#fff7ed", borderColor: "#fed7aa", color: "#9a3412" },
  btn: { padding: "6px 12px", borderRadius: 10, border: 0, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  foot: { color: "#64748b", fontSize: "0.78rem", marginTop: 8 },
};
