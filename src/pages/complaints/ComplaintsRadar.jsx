// src/pages/complaints/ComplaintsRadar.jsx
// -----------------------------------------------------------------------------
// "📡 Repeat-offender radar" for the complaints log.
// Turns the raw complaint rows into a decision panel:
//   • a 12-week trend of how many complaints were raised (with a 30-day delta)
//   • the parties (branch/supplier) with ≥2 complaints, ranked by a risk score
//     that weights recent + high-severity + still-open cases.
// Clicking a party filters the log to it. Pure client-side, no extra calls.
// -----------------------------------------------------------------------------

import React, { useMemo } from "react";
import { dmy, targetLabelOf } from "./complaintsCore";

const DAY = 86400000;

function daysAgo(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return Infinity;
  return Math.floor((Date.now() - new Date(iso + "T00:00:00").getTime()) / DAY);
}

export default function ComplaintsRadar({ rows = [], target, onPickParty }) {
  const { trend, delta, offenders, totals } = useMemo(() => {
    /* 12-week trend, bucket 0 = this week … 11 = 11 weeks ago. */
    const weeks = new Array(12).fill(0);
    let last30 = 0, prev30 = 0;
    for (const r of rows) {
      const d = daysAgo(r.complaintDate);
      if (d === Infinity) continue;
      if (d < 84) weeks[Math.floor(d / 7)]++;
      if (d < 30) last30++;
      else if (d < 60) prev30++;
    }
    const trendArr = weeks.slice().reverse(); // oldest → newest for the chart

    /* Per-party aggregates. */
    const map = new Map();
    for (const r of rows) {
      const key = targetLabelOf(r);
      if (!key || key === "—") continue;
      const e = map.get(key) || { party: key, total: 0, high: 0, open: 0, l30: 0, last: "" };
      e.total++;
      if (r.severity === "HIGH") e.high++;
      if (r.status !== "CLOSED") e.open++;
      if (daysAgo(r.complaintDate) < 30) e.l30++;
      if ((r.complaintDate || "") > e.last) e.last = r.complaintDate || "";
      map.set(key, e);
    }
    const list = [...map.values()]
      .filter((e) => e.total >= 2)
      .map((e) => ({ ...e, score: e.l30 * 3 + e.high * 2 + e.open + e.total * 0.5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      trend: trendArr,
      delta: last30 - prev30,
      offenders: list,
      totals: { last30, prev30, repeaters: [...map.values()].filter((e) => e.total >= 2).length },
    };
  }, [rows]);

  const max = Math.max(1, ...trend);
  const word = target === "supplier" ? "suppliers" : "branches";

  return (
    <div className="qc-block" style={{ marginTop: 14, borderColor: "#99f6e4", background: "#f7fdfc" }}>
      <h4>
        <span>📡 Repeat-offender radar</span>
        <span className="qc-h4-r" style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>
          {totals.repeaters} repeat {totals.repeaters === 1 ? "party" : "parties"}
        </span>
      </h4>

      <div className="qc-radar-grid" style={{ display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: 16, alignItems: "stretch" }}>
        {/* ── trend ── */}
        <div style={{
          border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff",
          padding: "12px 14px", display: "flex", flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: ".06em" }}>
              Last 12 weeks
            </span>
            <span style={{
              fontSize: 12, fontWeight: 900,
              color: delta > 0 ? "#b91c1c" : delta < 0 ? "#0f766e" : "#64748b",
            }}>
              {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {delta > 0 ? "+" : ""}{delta} vs prev 30d
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 70, marginTop: 10 }}>
            {trend.map((n, i) => (
              <div key={i} title={`${n} complaint(s)`} style={{
                flex: 1, height: `${Math.round((n / max) * 100)}%`, minHeight: n ? 4 : 2,
                borderRadius: 3, background: i === trend.length - 1 ? "#0f766e" : "#5eead4",
                opacity: n ? 1 : 0.4,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10.5, color: "#94a3b8", fontWeight: 700 }}>
            <span>12w ago</span><span>now</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: "#334155" }}>
            {totals.last30} in the last 30 days
          </div>
        </div>

        {/* ── top offenders ── */}
        <div style={{ minWidth: 0 }}>
          {offenders.length === 0 ? (
            <div className="qc-empty" style={{ padding: 22 }}>
              No {word} with repeat complaints yet. 🎉
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {offenders.map((e, i) => (
                <button
                  key={e.party}
                  type="button"
                  onClick={() => onPickParty?.(e.party)}
                  title="Filter the log to this party"
                  style={{
                    display: "grid", gridTemplateColumns: "22px 1fr auto", alignItems: "center", gap: 10,
                    border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff",
                    padding: "9px 12px", cursor: "pointer", fontFamily: "inherit", textAlign: "start",
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: 999, display: "grid", placeItems: "center",
                    fontSize: 11, fontWeight: 900,
                    background: i === 0 ? "#0f766e" : "#ccfbf1", color: i === 0 ? "#fff" : "#0f766e",
                  }}>{i + 1}</span>

                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.party}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "#64748b", fontWeight: 700 }}>
                      last {dmy(e.last)} · {e.open} open
                    </span>
                  </span>

                  <span style={{ display: "flex", gap: 5, alignItems: "center", whiteSpace: "nowrap" }}>
                    <span style={{ background: "#f1f5f9", color: "#334155", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>
                      ×{e.total}
                    </span>
                    {e.high > 0 && (
                      <span style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>
                        🔴 {e.high}
                      </span>
                    )}
                    {e.l30 > 0 && (
                      <span style={{ background: "#ffedd5", color: "#b45309", borderRadius: 999, padding: "3px 9px", fontSize: 11, fontWeight: 900 }}>
                        {e.l30} · 30d
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
