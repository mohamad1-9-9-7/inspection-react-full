// src/pages/settings/tools/ServerHealth.jsx
// 🩺 Server health monitor — pings the backend periodically and shows latency / status.

import React, { useEffect, useRef, useState } from "react";
import API_BASE from "../../../config/api";

const MAX_HISTORY = 30;

async function pingServer() {
  const t0 = performance.now();
  try {
    // A lightweight endpoint that should always exist
    const res = await fetch(`${API_BASE}/api/reports?type=__health_probe__&limit=1`, {
      cache: "no-store",
      method: "GET",
    });
    const latency = Math.round(performance.now() - t0);
    return { ok: res.ok, status: res.status, latency, ts: Date.now() };
  } catch (e) {
    const latency = Math.round(performance.now() - t0);
    return { ok: false, status: 0, latency, ts: Date.now(), error: e?.message || String(e) };
  }
}

export default function ServerHealth() {
  const [history, setHistory] = useState([]);
  const [autoMs, setAutoMs] = useState(0); // 0 = off
  const [pinging, setPinging] = useState(false);
  const timerRef = useRef(null);

  async function doPing() {
    setPinging(true);
    const result = await pingServer();
    setHistory((h) => [result, ...h].slice(0, MAX_HISTORY));
    setPinging(false);
  }

  useEffect(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoMs > 0) {
      doPing();
      timerRef.current = setInterval(doPing, autoMs);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [autoMs]);

  const latest = history[0];
  const okCount = history.filter((h) => h.ok).length;
  const failCount = history.length - okCount;
  const avgLatency = history.length > 0
    ? Math.round(history.reduce((a, h) => a + h.latency, 0) / history.length)
    : 0;

  const statusColor = latest?.ok ? "#16a34a" : history.length === 0 ? "#64748b" : "#dc2626";
  const statusLabel = latest?.ok
    ? "✅ Online"
    : history.length === 0 ? "❓ Not tested" : "❌ Offline / Error";

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>🩺 Server Health</h2>
          <p style={s.intro}>
            Ping the backend to check if it's responsive and measure latency. Useful to confirm whether
            502 errors are server-side (Render OOM) or client-side (CORS/network).
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={doPing} disabled={pinging} style={s.btnPrimary}>
            {pinging ? "⏳ Pinging…" : "📡 Ping Now"}
          </button>
          <select value={autoMs} onChange={(e) => setAutoMs(Number(e.target.value))} style={s.select}>
            <option value={0}>Auto: off</option>
            <option value={5_000}>Auto: every 5s</option>
            <option value={15_000}>Auto: every 15s</option>
            <option value={60_000}>Auto: every 1min</option>
          </select>
        </div>
      </div>

      {/* Status banner */}
      <div style={{
        ...s.statusBanner,
        background: `${statusColor}11`,
        borderColor: `${statusColor}55`,
      }}>
        <div style={{ ...s.dot, background: statusColor, boxShadow: `0 0 0 4px ${statusColor}22` }} />
        <div>
          <div style={{ fontWeight: 1000, fontSize: 17, color: statusColor }}>{statusLabel}</div>
          {latest && (
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginTop: 2 }}>
              HTTP {latest.status} · {latest.latency} ms · {new Date(latest.ts).toLocaleTimeString()}
              {latest.error && <span style={{ color: "#991b1b" }}> · {latest.error}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {history.length > 0 && (
        <div style={s.kpiGrid}>
          <Kpi label="Total pings" value={history.length} color="#0f172a" bg="#f1f5f9" />
          <Kpi label="Successful" value={okCount} color="#166534" bg="#dcfce7" />
          <Kpi label="Failed" value={failCount} color="#991b1b" bg="#fee2e2" />
          <Kpi label="Avg latency" value={`${avgLatency} ms`} color="#1e40af" bg="#dbeafe" />
        </div>
      )}

      {/* Latency chart (simple bar visualization) */}
      {history.length > 1 && (
        <div style={s.chartCard}>
          <div style={s.chartTitle}>Latency timeline (newest left)</div>
          <div style={s.chart}>
            {history.map((h, i) => {
              const max = Math.max(...history.map((x) => x.latency), 100);
              const heightPct = Math.max(2, (h.latency / max) * 100);
              const color = !h.ok ? "#dc2626" : h.latency > 1000 ? "#f97316" : h.latency > 500 ? "#eab308" : "#16a34a";
              return (
                <div key={i} style={s.bar(heightPct, color)} title={`${h.latency} ms · HTTP ${h.status} · ${new Date(h.ts).toLocaleTimeString()}`} />
              );
            })}
          </div>
          <div style={s.chartLegend}>
            <span><span style={{ ...s.legendDot, background: "#16a34a" }} /> &lt; 500 ms</span>
            <span><span style={{ ...s.legendDot, background: "#eab308" }} /> 500-1000 ms</span>
            <span><span style={{ ...s.legendDot, background: "#f97316" }} /> &gt; 1000 ms</span>
            <span><span style={{ ...s.legendDot, background: "#dc2626" }} /> Failed</span>
          </div>
        </div>
      )}

      {/* Recent log */}
      {history.length > 0 && (
        <div style={s.logCard}>
          <div style={s.chartTitle}>Recent pings</div>
          <div style={s.logList}>
            {history.slice(0, 10).map((h, i) => (
              <div key={i} style={s.logRow}>
                <span style={{ color: h.ok ? "#16a34a" : "#dc2626", fontWeight: 1000 }}>
                  {h.ok ? "✓" : "✗"}
                </span>
                <span style={{ fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                  {new Date(h.ts).toLocaleTimeString()}
                </span>
                <span style={{ fontWeight: 800, fontSize: 12, color: "#0f172a", minWidth: 70 }}>
                  HTTP {h.status}
                </span>
                <span style={{ fontWeight: 900, fontSize: 12, color: h.latency > 1000 ? "#dc2626" : h.latency > 500 ? "#92400e" : "#166534" }}>
                  {h.latency} ms
                </span>
                {h.error && <span style={{ fontSize: 11, color: "#991b1b" }}>{h.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, color, borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(226,232,240,.95)" }}>
      <div style={{ fontSize: 10, fontWeight: 900, opacity: 0.75, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 1000, marginTop: 4 }}>{value}</div>
    </div>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: 1000, color: "#0f172a", margin: 0 },
  intro: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4, maxWidth: 560, lineHeight: 1.6 },
  btnPrimary: {
    padding: "10px 18px", borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
    border: "none", fontWeight: 1000, fontSize: 13, cursor: "pointer",
    boxShadow: "0 10px 22px rgba(37,99,235,.30)",
  },
  select: {
    padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1",
    fontWeight: 800, fontSize: 12, background: "#fff", cursor: "pointer", color: "#0f172a",
  },
  statusBanner: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 18px", borderRadius: 14,
    border: "1px solid", marginBottom: 16,
  },
  dot: { width: 14, height: 14, borderRadius: "50%", flexShrink: 0 },
  kpiGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12, marginBottom: 16,
  },
  chartCard: {
    background: "#fff", borderRadius: 14, padding: 16,
    border: "1px solid #e2e8f0", marginBottom: 16,
    boxShadow: "0 8px 18px rgba(2,6,23,.06)",
  },
  chartTitle: { fontSize: 12, fontWeight: 1000, color: "#0f172a", marginBottom: 10, letterSpacing: ".05em", textTransform: "uppercase" },
  chart: {
    display: "flex", alignItems: "flex-end", gap: 2, height: 80,
    padding: "0 4px", background: "#f8fafc", borderRadius: 10,
  },
  bar: (height, color) => ({
    flex: 1, height: `${height}%`, minWidth: 8, maxWidth: 24,
    background: color, borderRadius: "4px 4px 0 0", transition: "height .2s",
  }),
  chartLegend: {
    display: "flex", gap: 12, flexWrap: "wrap",
    fontSize: 11, fontWeight: 800, color: "#475569", marginTop: 10,
  },
  legendDot: {
    display: "inline-block", width: 10, height: 10, borderRadius: "50%",
    marginInlineEnd: 4, verticalAlign: "middle",
  },
  logCard: {
    background: "#fff", borderRadius: 14, padding: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 18px rgba(2,6,23,.06)",
  },
  logList: { display: "flex", flexDirection: "column", gap: 4 },
  logRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "6px 10px", borderRadius: 8,
    background: "#f8fafc", flexWrap: "wrap",
  },
};
