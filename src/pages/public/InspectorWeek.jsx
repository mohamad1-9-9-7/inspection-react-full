// src/pages/public/InspectorWeek.jsx
//
// /inspector/:token — what an outside inspector sees after scanning the QR
// sticker on the unit: the last 7 days of the report, read-only, no account.
// The server decides everything (which report, which company, which days,
// which fields — routes/inspectorLinks.cjs); this page only draws it.
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import API_BASE from "../../config/api";
import TemperatureMatchingReport from "../monitor/branches/_shared/TemperatureMatchingReport";
import { GRID_TIMES, makeClassify, calcKPI } from "../monitor/branches/ftr1/ftr1TempUnits";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

const fmtDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
};

/** The 7 dates of the window, newest first, whether filed or not. */
function windowDays(from, to) {
  const out = [];
  const end = new Date(`${to}T00:00:00`);
  const start = new Date(`${from}T00:00:00`);
  for (let d = end; d >= start; d = new Date(d.getTime() - 86_400_000)) {
    out.push(d.toLocaleDateString("en-CA"));
    if (out.length > 10) break;
  }
  return out;
}

export default function InspectorWeek() {
  const { token = "" } = useParams();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const [picked, setPicked] = useState("");

  useEffect(() => {
    document.title = "Inspection view — read only";
    // Keep this page out of search engines even if a link is shared.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  useEffect(() => {
    if (!TOKEN_RE.test(token)) {
      setState({ loading: false, error: "invalid", data: null });
      return undefined;
    }
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/public/inspector/${encodeURIComponent(token)}`, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (res.status === 404) return setState({ loading: false, error: "invalid", data: null });
        if (res.status === 429) return setState({ loading: false, error: "busy", data: null });
        if (!res.ok) return setState({ loading: false, error: "server", data: null });
        const data = await res.json();
        setState({ loading: false, error: "", data });
        setPicked(data?.days?.[0]?.date || data?.to || "");
      })
      .catch((e) => {
        if (e?.name !== "AbortError") setState({ loading: false, error: "network", data: null });
      });
    return () => ctrl.abort();
  }, [token]);

  const data = state.data;
  const byDate = useMemo(() => Object.fromEntries((data?.days || []).map((d) => [d.date, d])), [data]);
  const dates = useMemo(() => (data ? windowDays(data.from, data.to) : []), [data]);
  const day = byDate[picked] || null;
  const times = day?.times?.length ? day.times : GRID_TIMES;
  const classify = useMemo(() => (day ? makeClassify(day.units) : null), [day]);
  const kpi = useMemo(() => (day ? calcKPI(day.units, times) : null), [day, times]);

  if (state.loading) return <Frame><p style={muted}>Loading…</p></Frame>;
  if (state.error) {
    const msg = {
      invalid: "This link is not valid. It may have expired or been withdrawn — please ask the site for a new one.",
      busy: "Too many requests. Please wait a minute and try again.",
      server: "The server could not answer. Please try again shortly.",
      network: "No connection. Check the internet and try again.",
    }[state.error];
    return <Frame><div style={errorBox}>🔒 {msg}</div></Frame>;
  }

  return (
    <Frame>
      <header style={head}>
        <div>
          <div style={{ color: "#64748b", fontWeight: 700 }}>{data.company}</div>
          <h1 style={h1}>{data.title}</h1>
          <div style={muted}>Last 7 days · {fmtDay(data.from)} – {fmtDay(data.to)}</div>
        </div>
        <span style={roBadge}>🔍 Read-only inspection view</span>
      </header>

      {/* Day picker: every date of the window; a day with no record says so. */}
      <nav style={dayRow} aria-label="Days">
        {dates.map((d) => {
          const rec = byDate[d];
          const k = rec ? calcKPI(rec.units, rec.times?.length ? rec.times : GRID_TIMES) : null;
          const bad = k && k.out > 0;
          const active = d === picked;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setPicked(d)}
              style={{
                ...dayBtn,
                borderColor: active ? "#1d4ed8" : "#e2e8f0",
                background: active ? "#eff6ff" : rec ? "#fff" : "#f8fafc",
                color: rec ? "#0f172a" : "#94a3b8",
              }}
            >
              <div style={{ fontWeight: 800 }}>{fmtDay(d)}</div>
              <div style={{ fontWeight: 600, color: !rec ? "#94a3b8" : bad ? "#b91c1c" : "#15803d" }}>
                {!rec ? "No record" : bad ? `${k.out} out of range` : "In range"}
              </div>
            </button>
          );
        })}
      </nav>

      {!day && <div style={emptyBox}>No temperature record was filed for {fmtDay(picked)}.</div>}

      {day && (
        <>
          <div style={kpiRow}>
            <Tile label="Readings" value={`${kpi.readings} / ${kpi.total}`} />
            <Tile label="Out of range" value={kpi.out} tone={kpi.out ? "bad" : "ok"} />
            <Tile label="Compliance" value={kpi.compliance == null ? "—" : `${kpi.compliance}%`} tone={kpi.compliance === 100 ? "ok" : kpi.compliance == null ? "" : "bad"} />
            <Tile label="Status" value={day.filed ? "Filed" : "Phone readings only"} tone={day.filed ? "ok" : "bad"} />
          </div>

          <TemperatureMatchingReport
            units={day.units}
            times={times}
            classify={classify}
            productVerifications={day.productVerifications}
            readOnly
          />

          <div style={sigRow}>
            <div><span style={muted}>Checked by:</span> <b>{day.checkedBy || "—"}</b></div>
            <div><span style={muted}>Verified by (QA):</span> <b>{day.verifiedBy || "—"}</b></div>
          </div>
        </>
      )}

      <footer style={foot}>
        Generated {new Date(data.generatedAt).toLocaleString("en-GB")} · This page shows the last 7 days only and cannot change any data.
      </footer>
    </Frame>
  );
}

function Frame({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: "16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", background: "#fff", borderRadius: 16, padding: "18px", boxShadow: "0 6px 24px rgba(15,23,42,.08)" }}>
        {children}
      </div>
    </div>
  );
}

function Tile({ label, value, tone = "" }) {
  const color = tone === "ok" ? "#166534" : tone === "bad" ? "#b91c1c" : "#0f172a";
  const bg = tone === "ok" ? "#f0fdf4" : tone === "bad" ? "#fef2f2" : "#fff";
  return (
    <div style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 14px", minWidth: 120 }}>
      <div style={{ color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ color, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const muted = { color: "#64748b" };
const head = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 };
const h1 = { margin: "2px 0 4px", color: "#0f172a", fontWeight: 900 };
const roBadge = { padding: "6px 12px", borderRadius: 999, background: "#ecfeff", border: "1px solid #a5f3fc", color: "#155e75", fontWeight: 800 };
const dayRow = { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 14 };
const dayBtn = { minWidth: 118, textAlign: "left", padding: "8px 12px", borderRadius: 12, borderWidth: 2, borderStyle: "solid", cursor: "pointer" };
const kpiRow = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const sigRow = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 12, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 12 };
const emptyBox = { padding: 18, borderRadius: 12, background: "#f8fafc", border: "1px dashed #cbd5e1", color: "#475569", fontWeight: 700 };
const errorBox = { padding: 18, borderRadius: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 700 };
const foot = { marginTop: 16, color: "#94a3b8", textAlign: "center" };
