// src/pages/admin/ComplaintNumberBackfill.jsx
// 🔢 Customer Complaints — backfill missing complaint numbers.
// Old records saved without a number get a sequential CC-<year>-#### assigned
// chronologically (oldest first), continuing from any numbers that already exist.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";

const TYPE = "customer_complaint";
const NUM_RE = /^CC-(\d{4})-(\d+)$/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store", ...opts });
      if (res.ok || res.status === 404) return res;
      if (res.status >= 500) { lastErr = new Error(`HTTP ${res.status}`); await sleep(2500 * (i + 1)); continue; }
      return res;
    } catch (e) { lastErr = e; await sleep(2000 * (i + 1)); }
  }
  throw lastErr || new Error("Failed after retries");
}

async function fetchComplaints() {
  const res = await fetchWithRetry(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, {}, 4);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json().catch(() => ({}));
  const arr = Array.isArray(data) ? data
            : Array.isArray(data?.data) ? data.data
            : Array.isArray(data?.items) ? data.items
            : Array.isArray(data?.rows) ? data.rows
            : [];
  return arr.filter((r) => r?.type === TYPE || !r?.type);
}

async function updateRecord(id, payload) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: TYPE, reporter: "complaint_number_backfill", payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

function yearOf(rec) {
  const p = rec?.payload || {};
  const s = String(p.complaintDate || rec?.created_at || rec?.createdAt || "");
  const y = s.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : String(new Date().getFullYear());
}

function sortKey(rec) {
  const p = rec?.payload || {};
  return String(p.complaintDate || rec?.created_at || rec?.createdAt || "") + "_" + String(rec?.id || "");
}

/* Build the list of {rec, year, newNumber} for every record that has NO number,
   continuing each year's sequence from whatever valid numbers already exist. */
function planAssignments(records) {
  const maxByYear = {};
  for (const rec of records) {
    const n = String(rec?.payload?.complaintNumber || "").trim();
    const m = NUM_RE.exec(n);
    if (m) {
      const y = m[1];
      const v = parseInt(m[2], 10);
      if (Number.isFinite(v) && (maxByYear[y] == null || v > maxByYear[y])) maxByYear[y] = v;
    }
  }

  const needs = records
    .filter((rec) => !String(rec?.payload?.complaintNumber || "").trim())
    .sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));

  const counter = { ...maxByYear };
  return needs.map((rec) => {
    const y = yearOf(rec);
    const next = (counter[y] == null ? 0 : counter[y]) + 1;
    counter[y] = next;
    return {
      rec,
      id: rec?.id || rec?._id,
      year: y,
      date: String(rec?.payload?.complaintDate || rec?.created_at || "—"),
      newNumber: `CC-${y}-${String(next).padStart(4, "0")}`,
    };
  });
}

export default function ComplaintNumberBackfill() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [records, setRecords] = useState([]);
  const [plan, setPlan] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, failed: 0 });
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");

  const appendLog = (line) => setLog((l) => [...l.slice(-200), line]);

  async function doScan() {
    setError(""); setScanResult(null); setPlan(null); setLog([]); setRecords([]);
    setProgress({ done: 0, total: 0, ok: 0, failed: 0 });
    setScanning(true);
    appendLog("🔎 Fetching customer_complaint records…");
    try {
      const arr = await fetchComplaints();
      appendLog(`✅ Got ${arr.length} record(s).`);
      const withNumber = arr.filter((r) => String(r?.payload?.complaintNumber || "").trim()).length;
      const p = planAssignments(arr);
      setRecords(arr);
      setPlan(p);
      setScanResult({ total: arr.length, withNumber, missing: p.length });
      appendLog(`📊 ${withNumber} have a number · ${p.length} missing → will be assigned.`);
      if (p.length === 0) appendLog("✨ Nothing to do — every record already has a number.");
      else p.slice(0, 12).forEach((a) => appendLog(`   • ${a.date}  →  ${a.newNumber}`));
      if (p.length > 12) appendLog(`   … and ${p.length - 12} more`);
    } catch (e) {
      const msg = e?.message || String(e);
      setError(`Scan failed: ${msg}`);
      appendLog(`❌ Scan failed: ${msg}`);
    } finally {
      setScanning(false);
    }
  }

  async function doBackfill() {
    if (!plan || plan.length === 0) { setError("Run a scan first."); return; }
    if (!window.confirm(
      `Assign numbers to ${plan.length} record(s)?\n\n` +
      `Each old report with no number gets a sequential CC-<year>-#### based on its date.\n` +
      `Records that already have a number are NOT touched.\n\nThis writes to the database.`
    )) return;

    setError(""); setRunning(true);
    setProgress({ done: 0, total: plan.length, ok: 0, failed: 0 });
    appendLog(`🚀 Backfilling ${plan.length} record(s)…`);

    let ok = 0, failed = 0;
    for (let i = 0; i < plan.length; i++) {
      const a = plan[i];
      if (!a.id) {
        appendLog(`⚠️ #${i + 1}: record has no id, skipped`);
        failed++;
        setProgress((pr) => ({ total: pr.total, done: pr.done + 1, ok: pr.ok, failed: pr.failed + 1 }));
        continue;
      }
      const newPayload = { ...(a.rec.payload || {}), complaintNumber: a.newNumber };
      let success = false;
      try {
        await updateRecord(a.id, newPayload);
        success = true;
        appendLog(`✅ #${i + 1} (${a.id}) ${a.date} → ${a.newNumber}`);
      } catch (e) {
        appendLog(`❌ #${i + 1} (${a.id}): ${e?.message || e}`);
      }
      if (success) ok++; else failed++;
      setProgress((pr) => ({
        total: pr.total,
        done: pr.done + 1,
        ok: pr.ok + (success ? 1 : 0),
        failed: pr.failed + (success ? 0 : 1),
      }));
      await sleep(150);
    }
    appendLog(`🎉 Done. Assigned ${ok}, failed ${failed}. Re-scan to verify.`);
    setRunning(false);
  }

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <div style={s.title}>🔢 Complaint Numbers — Backfill</div>
            <div style={s.subtitle}>
              Old <code style={s.code}>customer_complaint</code> records saved without a number get a
              sequential <strong>CC-&lt;year&gt;-####</strong> assigned by date (oldest first),
              continuing from numbers that already exist. Records that already have a number are left alone.
            </div>
          </div>
          <button type="button" onClick={() => navigate(-1)} style={s.btn}>← Back</button>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>1. Scan (read-only — safe)</div>
          <button type="button" onClick={doScan} disabled={scanning || running} style={s.btnPrimary}>
            {scanning ? "⏳ Scanning…" : "🔎 Scan customer_complaint"}
          </button>

          {scanResult && (
            <div style={s.resultCard}>
              <table style={s.statsTable}>
                <tbody>
                  <tr><td>Total records</td><td style={s.statValue}>{scanResult.total}</td></tr>
                  <tr><td>Already numbered</td><td style={s.statValue}>{scanResult.withNumber}</td></tr>
                  <tr><td>Missing a number</td><td style={{ ...s.statValue, color: scanResult.missing ? "#b45309" : "#16a34a" }}>{scanResult.missing}</td></tr>
                </tbody>
              </table>
              {scanResult.missing === 0 && (
                <div style={{ ...s.notice, background: "#dcfce7", color: "#166534" }}>
                  ✅ All records already have a number.
                </div>
              )}
            </div>
          )}
        </div>

        {scanResult && scanResult.missing > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>2. Backfill (writes to DB)</div>
            <button
              type="button"
              onClick={doBackfill}
              disabled={running || scanning}
              style={{ ...s.btnPrimary, background: running ? "#9ca3af" : "linear-gradient(135deg,#16a34a,#15803d)" }}
            >
              {running ? "⏳ Assigning…" : `🚀 Assign ${scanResult.missing} number(s)`}
            </button>

            {progress.total > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  <span>Progress: {progress.done} / {progress.total} ({pct}%)</span>
                  <span>
                    <span style={{ color: "#166534" }}>✓ {progress.ok}</span>
                    {"  ·  "}
                    <span style={{ color: "#991b1b" }}>✗ {progress.failed}</span>
                  </span>
                </div>
                <div style={s.progressBar}><div style={{ ...s.progressFill, width: `${pct}%` }} /></div>
                {running && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, fontWeight: 700 }}>⏳ Don't close this tab.</div>}
              </div>
            )}
          </div>
        )}

        {error && <div style={s.errorBox}>{error}</div>}

        {log.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>📜 Log</div>
            <div style={s.logBox}>{log.map((line, i) => <div key={i}>{line}</div>)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  shell: { minHeight: "100vh", background: "linear-gradient(180deg,#f8fafc 0%,#fff7ed 100%)", fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif', padding: 20, direction: "ltr" },
  card: { maxWidth: 880, margin: "0 auto", background: "#fff", borderRadius: 20, border: "1px solid rgba(226,232,240,0.95)", boxShadow: "0 14px 40px rgba(2,6,23,.10)", padding: 26 },
  header: { display: "flex", alignItems: "flex-start", gap: 12, justifyContent: "space-between", flexWrap: "wrap", marginBottom: 18, paddingBottom: 12, borderBottom: "2px dashed rgba(226,232,240,.95)" },
  title: { fontSize: 22, fontWeight: 1000, color: "#9a3412" },
  subtitle: { fontSize: 13, color: "#64748b", fontWeight: 700, marginTop: 6, lineHeight: 1.6, maxWidth: 640 },
  code: { background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 },
  btn: { padding: "8px 14px", borderRadius: 999, background: "#fff", color: "#0f172a", border: "1px solid rgba(148,163,184,.55)", fontWeight: 900, fontSize: 12, cursor: "pointer" },
  btnPrimary: { padding: "12px 22px", borderRadius: 14, background: "linear-gradient(135deg,#ea580c,#c2410c)", color: "#fff", border: "none", fontWeight: 1000, fontSize: 14, cursor: "pointer", boxShadow: "0 12px 24px rgba(234,88,12,.30)" },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: 1000, color: "#0f172a", marginBottom: 10 },
  resultCard: { marginTop: 12, padding: 16, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0" },
  statsTable: { width: "100%", fontSize: 13, fontWeight: 800 },
  statValue: { textAlign: "right", color: "#9a3412", fontFamily: "monospace", fontSize: 14, padding: "5px 0" },
  notice: { marginTop: 10, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 900 },
  progressBar: { width: "100%", height: 14, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#ea580c,#16a34a)", transition: "width .25s" },
  errorBox: { background: "#fee2e2", color: "#7f1d1d", padding: "10px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13, marginBottom: 12, border: "1px solid #fecaca" },
  logBox: { background: "#0b1220", color: "#cbd5e1", padding: 14, borderRadius: 12, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12, lineHeight: 1.7, maxHeight: 360, overflow: "auto" },
};
