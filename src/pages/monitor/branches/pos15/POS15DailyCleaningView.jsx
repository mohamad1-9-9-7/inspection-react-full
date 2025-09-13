// src/pages/monitor/branches/pos15/POS15DailyCleaningView.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function POS15DailyCleaningView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [err, setErr] = useState("");

  const q = useMemo(() => {
    const params = new URLSearchParams();
    params.set("reporter", "pos15");
    params.set("type", "pos15_daily_cleaning");
    params.set("branch", "POS 15");
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("limit", "50");
    return params.toString();
  }, [from, to]);

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/reports?${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      console.error(e);
      setErr("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []); // أول تحميل

  return (
    <div>
      <h3 style={{ marginTop: 0, color: "#1f2937" }}>🧹 Daily Cleaning — POS 15</h3>

      <Filters from={from} to={to} setFrom={setFrom} setTo={setTo} onRefresh={fetchData} />
      <States loading={loading} err={err} />

      <List records={records} />
    </div>
  );
}

/* ====== Sub-components (محلية داخل الملف) ====== */
function Filters({ from, to, setFrom, setTo, onRefresh }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
      <label>From: <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label>To: <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <button type="button" onClick={onRefresh} style={btnPrimary}>Refresh</button>
      {(from || to) && (
        <button type="button" onClick={() => { setFrom(""); setTo(""); }} style={btnGhost}>
          Clear
        </button>
      )}
    </div>
  );
}

function States({ loading, err }) {
  return (
    <>
      {loading && <div style={{ fontWeight: 700, color: "#6b7280" }}>Loading…</div>}
      {err && <div style={{ color: "#b91c1c", fontWeight: 700 }}>{err}</div>}
    </>
  );
}

function List({ records }) {
  if (!records?.length) {
    return <EmptyState />;
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {records.map((rec) => (
        <RecordCard key={rec._id || rec.id} rec={rec} />
      ))}
    </div>
  );
}

function RecordCard({ rec }) {
  const [open, setOpen] = useState(false);
  const p = rec?.payload || {};
  const entries = Array.isArray(p.entries) ? p.entries : null;

  return (
    <div style={card}>
      <div style={cardHead}>
        <div style={{ fontWeight: 800, color: "#111827" }}>Date: {fmtDate(p.reportDate) || "—"}</div>
        <div style={{ color: "#6b7280", fontSize: 14 }}>
          Checked: <strong>{p.checkedBy || "—"}</strong> &nbsp;|&nbsp; Verified: <strong>{p.verifiedBy || "—"}</strong>
        </div>
        <div style={{ marginLeft: "auto", color: "#9ca3af", fontSize: 12 }}>
          ID: {(rec._id || rec.id || "").toString().slice(-6)}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} style={btnToggle}>
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {open && (
        <div style={{ padding: "10px 12px 6px" }}>
          {entries?.length ? <DynamicTable rows={entries} /> : <JsonBox data={p} />}
        </div>
      )}
    </div>
  );
}

function DynamicTable({ rows }) {
  const cols = React.useMemo(() => {
    if (!rows.length) return [];
    const keys = Array.from(
      rows.reduce((set, r) => { Object.keys(r || {}).forEach((k) => set.add(k)); return set; }, new Set())
    );
    const nameIdx = keys.indexOf("name"); if (nameIdx > -1) { keys.splice(nameIdx, 1); keys.unshift("name"); }
    const remarksIdx = keys.indexOf("remarks"); if (remarksIdx > -1) { keys.splice(remarksIdx, 1); keys.push("remarks"); }
    return keys;
  }, [rows]);

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={th}>#</th>
            {cols.map((c) => (<th key={c} style={th}>{c}</th>))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>{i + 1}</td>
              {cols.map((c) => (<td key={c} style={td}>{fmt(r?.[c])}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ====== utils & styles ====== */
const btnPrimary = { padding: "8px 12px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer" };
const btnGhost   = { padding: "8px 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#111827", fontWeight: 700, cursor: "pointer" };
const btnToggle  = { marginLeft: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontWeight: 700 };
const card       = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" };
const cardHead   = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid #f3f4f6" };
const th         = { padding: 8, border: "1px solid #e5e7eb", textAlign: "center", whiteSpace: "nowrap" };
const td         = { padding: 8, border: "1px solid #e5e7eb", textAlign: "center" };

function fmtDate(d) { try { return d ? new Date(d).toLocaleDateString() : ""; } catch { return d || ""; } }
function fmt(v) { if (v === undefined || v === null) return ""; return typeof v === "object" ? JSON.stringify(v) : String(v); }
function JsonBox({ data }) {
  return (
    <pre style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, overflowX: "auto", margin: 0 }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
function EmptyState() {
  return (
    <div style={{ padding: 14, border: "1px dashed #d1d5db", borderRadius: 8, background: "#fafafa", color: "#6b7280", fontWeight: 600 }}>
      No records found.
    </div>
  );
}
