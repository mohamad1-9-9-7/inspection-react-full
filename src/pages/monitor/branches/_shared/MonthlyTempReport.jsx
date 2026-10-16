// src/pages/monitor/branches/_shared/MonthlyTempReport.jsx
//
// 📊 Monthly temperature report — one month of a temperature sheet, per unit:
//   • a chart of every reading against the allowed band,
//   • readings recorded vs. readings due (completion %),
//   • min / average / max,
//   • every out-of-range reading with the corrective action taken.
// "Download PDF" builds an English A4 document for the inspector / auditor
// (English only: html2canvas cannot shape Arabic, see utils/nodeToPdf).
//
// Works for any QuickTempPage adapter A that also gives:
//   type            the report type to read
//   namesOf?(p)     unit keys found in one day's payload (branch sheets)
//   defOf?(key)     the def of a unit found that way
//   remarksOf(p, k) the unit's remarks / corrective action text that day

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listReports, payloadOf, reportDateOf } from "./reportApi";
import { exportNodeToPdf, pdfStageStyle, PDF_UI, safeFileName } from "../../../../utils/nodeToPdf";
import { localDate } from "../qcs/coolerQuick";

const pad = (n) => String(n).padStart(2, "0");
const daysIn = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};
const num = (v) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const fmt = (n) => (n == null ? "—" : (Math.round(n * 10) / 10).toFixed(1));

/* ── one unit's month ── */
function unitMonth(A, unit, days, ym, lastDay) {
  const points = [];
  const outs = [];
  days.forEach(({ day, payload }) => {
    const readings = A.readingsOf(payload, unit.key) || {};
    const log = Array.isArray(payload?.quickReadings) ? payload.quickReadings : [];
    A.slots.forEach((sl, si) => {
      const v = num(readings[sl.key]);
      if (v == null) return;
      const x = day - 1 + si / A.slots.length;
      const ok = A.inRange(unit.def, v);
      points.push({ x, v, ok });
      if (!ok) {
        const q = [...log].reverse().find((r) => r && A.sameUnit(r.unit, unit.key) && r.slot === sl.key && r.kind !== "recheck");
        const recheck = log.find((r) => r && A.sameUnit(r.unit, unit.key) && r.kind === "recheck" && q && r.at > q.at);
        outs.push({
          date: `${ym}-${pad(day)}`,
          slot: sl.label,
          value: v,
          action: q?.correctiveAction || A.remarksOf?.(payload, unit.key) || "",
          recheck: recheck ? `${recheck.value}°C${A.inRange(unit.def, recheck.value) ? " ✓" : " ✗"}` : "",
          by: q?.byName || "",
        });
      }
    });
  });
  const vals = points.map((p) => p.v);
  const due = lastDay * A.slots.length;
  return {
    unit,
    points,
    outs,
    recorded: points.length,
    due,
    pct: due ? Math.round((points.length / due) * 100) : 0,
    min: vals.length ? Math.min(...vals) : null,
    max: vals.length ? Math.max(...vals) : null,
    avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
  };
}

/* ── chart: readings over the month against the allowed band ── */
function Chart({ m, monthDays, width = 1040, height = 190 }) {
  const { def } = m.unit;
  const L = 38, R = 8, T = 10, B = 22;
  const realMin = def.min > -50 ? def.min : null;
  const lo = Math.min(...m.points.map((p) => p.v), realMin ?? def.max - 6, def.max) - 1;
  const hi = Math.max(...m.points.map((p) => p.v), def.max) + 1;
  const X = (x) => L + (x / monthDays) * (width - L - R);
  const Y = (v) => T + ((hi - v) / (hi - lo || 1)) * (height - T - B);
  const bandTop = Y(def.max);
  const bandBot = Y(realMin ?? lo);
  const ticks = [lo, (lo + hi) / 2, hi].map((v) => Math.round(v));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <rect x={L} y={bandTop} width={width - L - R} height={Math.max(0, bandBot - bandTop)} fill="#dcfce7" />
      <line x1={L} x2={width - R} y1={bandTop} y2={bandTop} stroke="#16a34a" strokeDasharray="4 3" />
      {realMin != null && <line x1={L} x2={width - R} y1={bandBot} y2={bandBot} stroke="#16a34a" strokeDasharray="4 3" />}
      {ticks.map((v) => (
        <g key={v}>
          <line x1={L} x2={width - R} y1={Y(v)} y2={Y(v)} stroke="#e5e7eb" />
          <text x={L - 6} y={Y(v) + 4} fontSize="10" textAnchor="end" fill="#6b7280">{v}°</text>
        </g>
      ))}
      {Array.from({ length: monthDays }, (_, i) => i + 1).filter((d) => d === 1 || d % 5 === 0).map((d) => (
        <text key={d} x={X(d - 1)} y={height - 6} fontSize="10" fill="#6b7280">{d}</text>
      ))}
      <polyline fill="none" stroke="#64748b" strokeWidth="1" points={m.points.map((p) => `${X(p.x)},${Y(p.v)}`).join(" ")} />
      {m.points.map((p, i) => (
        <circle key={i} cx={X(p.x)} cy={Y(p.v)} r={p.ok ? 2.4 : 3.6} fill={p.ok ? "#2563eb" : "#dc2626"} />
      ))}
    </svg>
  );
}

/* ── the PDF document (portal outside #root: real font sizes) ── */
function PdfDoc({ A, ym, months, nodeRef }) {
  const monthDays = daysIn(ym);
  return createPortal(
    <div ref={nodeRef} style={pdfStageStyle(1120)}>
      <h1 style={PDF_UI.h1}>Monthly Temperature Report — {A.printTitle || A.label}</h1>
      <div style={PDF_UI.sub}>Month: {ym} · Units: {months.length} · Generated {localDate()} (UAE)</div>

      <div style={PDF_UI.sectionTitle}>Summary</div>
      <table style={PDF_UI.table}>
        <thead>
          <tr>
            {["Unit", "Allowed", "Recorded / due", "Completion", "Min", "Avg", "Max", "Out of range"].map((h) => (
              <th key={h} style={PDF_UI.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.unit.key}>
              <td style={PDF_UI.td}><b>{m.unit.def.label}</b></td>
              <td style={{ ...PDF_UI.td, textAlign: "center" }}>{A.rangeLabel(m.unit.def)}</td>
              <td style={{ ...PDF_UI.td, textAlign: "center" }}>{m.recorded} / {m.due}</td>
              <td style={{ ...PDF_UI.td, textAlign: "center", fontWeight: 800, color: m.pct >= 90 ? "#047857" : m.pct >= 70 ? "#b45309" : "#b91c1c" }}>{m.pct}%</td>
              <td style={{ ...PDF_UI.td, textAlign: "center" }}>{fmt(m.min)}</td>
              <td style={{ ...PDF_UI.td, textAlign: "center" }}>{fmt(m.avg)}</td>
              <td style={{ ...PDF_UI.td, textAlign: "center" }}>{fmt(m.max)}</td>
              <td style={{ ...PDF_UI.td, textAlign: "center", fontWeight: 800, color: m.outs.length ? "#b91c1c" : "#047857" }}>{m.outs.length}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {months.map((m) => (
        <div key={m.unit.key} style={{ marginTop: 18, breakInside: "avoid" }}>
          <div style={PDF_UI.sectionTitle}>
            {m.unit.def.label} — allowed {A.rangeLabel(m.unit.def)} · completion {m.pct}% · out of range {m.outs.length}
          </div>
          {m.points.length ? <Chart m={m} monthDays={monthDays} /> : <div style={PDF_UI.sub}>No readings this month.</div>}
          {m.outs.length > 0 && (
            <table style={{ ...PDF_UI.table, marginTop: 6 }}>
              <thead>
                <tr>
                  {["Date", "Time", "Reading", "Corrective action", "Recheck", "By"].map((h) => <th key={h} style={PDF_UI.th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.outs.map((o, i) => (
                  <tr key={i}>
                    <td style={PDF_UI.td}>{o.date}</td>
                    <td style={PDF_UI.td}>{o.slot}</td>
                    <td style={{ ...PDF_UI.td, color: "#b91c1c", fontWeight: 800 }}>{o.value}°C</td>
                    <td style={PDF_UI.td}>{o.action || <span style={{ color: "#b91c1c" }}>Not recorded</span>}</td>
                    <td style={PDF_UI.td}>{o.recheck}</td>
                    <td style={PDF_UI.td}>{o.by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      <table style={{ ...PDF_UI.metaTable, marginTop: 22 }}>
        <tbody>
          <tr>
            <td style={PDF_UI.signBox}><b>Reviewed by (QA)</b><br />Name / signature / date</td>
            <td style={PDF_UI.signBox}><b>Approved by</b><br />Name / signature / date</td>
          </tr>
        </tbody>
      </table>
    </div>,
    document.body
  );
}

export default function MonthlyTempReport({ A, units, onClose, t }) {
  const [ym, setYm] = useState(() => localDate().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyPdf, setBusyPdf] = useState(false);
  const nodeRef = useRef(null);

  useEffect(() => {
    let stop = false;
    setLoading(true);
    setError("");
    listReports(A.type, { from: `${ym}-01`, to: `${ym}-${pad(daysIn(ym))}`, limit: 100 })
      .then((list) => { if (!stop) setRows(list); })
      .catch((e) => { if (!stop) setError(String(e?.message || e)); })
      .finally(() => { if (!stop) setLoading(false); });
    return () => { stop = true; };
  }, [A, ym]);

  const months = useMemo(() => {
    const days = rows
      .map((r) => ({ date: String(reportDateOf(r) || "").slice(0, 10), payload: payloadOf(r) }))
      .filter((d) => d.date.startsWith(ym))
      .map((d) => ({ day: Number(d.date.slice(8, 10)), payload: d.payload }))
      .sort((a, b) => a.day - b.day);
    // Units: the sheet's current ones, plus any that appear in this month's records.
    const list = [...units];
    if (A.namesOf) {
      days.forEach(({ payload }) => A.namesOf(payload).forEach((k) => {
        if (!list.some((u) => A.sameUnit(u.key, k))) list.push({ key: k, def: A.defOf(k, payload) });
      }));
    }
    const today = localDate();
    const lastDay = today.startsWith(ym) ? Number(today.slice(8, 10)) : today < ym ? 0 : daysIn(ym);
    return list.map((u) => unitMonth(A, u, days, ym, lastDay));
  }, [A, rows, units, ym]);

  const download = async () => {
    if (!nodeRef.current) return;
    setBusyPdf(true);
    try {
      await exportNodeToPdf(nodeRef.current, safeFileName(`Temperature_${A.label}_${ym}`) + ".pdf", { orientation: "l" });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusyPdf(false);
    }
  };

  return (
    <div>
      <div className="bar">
        <button className="btn" onClick={onClose}>✕</button>
        <input type="month" value={ym} onChange={(e) => e.target.value && setYm(e.target.value)}
          className="btn" style={{ padding: "8px 10px" }} />
        <button className="btn pri" onClick={download} disabled={loading || busyPdf}>
          {busyPdf ? "…" : "⬇ PDF"}
        </button>
      </div>
      {error && <div className="alert bad">{error}</div>}
      {loading ? (
        <div className="sm">…</div>
      ) : (
        months.map((m) => (
          <div className="card" key={m.unit.key}>
            <div className="row">
              <div className="t2">{A.emoji(m.unit.def)} {m.unit.def.label}</div>
              <span className={`pill ${m.pct >= 90 ? "ok" : m.pct >= 70 ? "warn" : "bad"}`}>{m.pct}%</span>
            </div>
            <div className="sm">
              {m.recorded} / {m.due} · min {fmt(m.min)} · avg {fmt(m.avg)} · max {fmt(m.max)} ·{" "}
              <b style={{ color: m.outs.length ? "#b91c1c" : "#047857" }}>{m.outs.length} {t.outOfRange}</b>
            </div>
          </div>
        ))
      )}
      {!loading && <PdfDoc A={A} ym={ym} months={months} nodeRef={nodeRef} />}
    </div>
  );
}
