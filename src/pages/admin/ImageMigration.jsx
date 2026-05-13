// src/pages/admin/ImageMigration.jsx
// 🖼️ Internal Multi Audit — Base64 → Cloudinary URL Migration
// One-purpose tool: cleans the base64 images out of `internal_multi_audit` records
// that are crashing the server with OOM.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";

const TYPE = "internal_multi_audit";

/* ===== Helpers ===== */

function isBase64Image(s) {
  return typeof s === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(s);
}

function approxBase64Bytes(s) {
  if (typeof s !== "string") return 0;
  const comma = s.indexOf(",");
  const payload = comma >= 0 ? s.slice(comma + 1) : s;
  return Math.floor(payload.length * 0.75);
}

function scanBase64(obj, path = "$", acc = { count: 0, bytes: 0, samplePaths: [] }) {
  if (isBase64Image(obj)) {
    acc.count++;
    acc.bytes += approxBase64Bytes(obj);
    if (acc.samplePaths.length < 5) acc.samplePaths.push(path);
    return acc;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanBase64(v, `${path}[${i}]`, acc));
    return acc;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) scanBase64(v, `${path}.${k}`, acc);
  }
  return acc;
}

async function replaceBase64(obj, uploadFn, counter = { uploaded: 0, failed: 0, errors: [] }, path = "$") {
  if (isBase64Image(obj)) {
    try {
      const url = await uploadFn(obj);
      counter.uploaded++;
      return url;
    } catch (e) {
      counter.failed++;
      if (counter.errors.length < 5) counter.errors.push(`${path}: ${e?.message || e}`);
      return obj;
    }
  }
  if (Array.isArray(obj)) {
    const out = [];
    for (let i = 0; i < obj.length; i++) {
      out.push(await replaceBase64(obj[i], uploadFn, counter, `${path}[${i}]`));
    }
    return out;
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = await replaceBase64(v, uploadFn, counter, `${path}.${k}`);
    }
    return out;
  }
  return obj;
}

async function uploadBase64ToServer(dataUrl) {
  const blobRes = await fetch(dataUrl);
  const blob = await blobRes.blob();
  const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
  const fd = new FormData();
  fd.append("file", blob, `image.${ext}`);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data.optimized_url || data.url;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, opts = {}, tries = 4) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { cache: "no-store", ...opts });
      if (res.ok || res.status === 404) return res;
      if (res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        await sleep(3000 * (i + 1));
        continue;
      }
      return res;
    } catch (e) {
      lastErr = e;
      await sleep(2000 * (i + 1));
    }
  }
  throw lastErr || new Error("Failed after retries");
}

async function fetchAuditReports() {
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
    body: JSON.stringify({ type: TYPE, reporter: "image_migration_tool", payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/* ===== Component ===== */

export default function ImageMigration() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [reports, setReports] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, uploaded: 0, failed: 0 });
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");

  const appendLog = (line) => setLog((l) => [...l.slice(-200), line]);

  async function doScan() {
    setError("");
    setScanResult(null);
    setLog([]);
    setReports([]);
    setProgress({ done: 0, total: 0, uploaded: 0, failed: 0 });

    setScanning(true);
    appendLog(`🔎 Fetching internal_multi_audit records…`);
    try {
      const arr = await fetchAuditReports();
      appendLog(`✅ Got ${arr.length} record(s). Scanning for base64 images…`);
      let totalCount = 0, totalBytes = 0, recordsWithImages = 0;
      for (const r of arr) {
        const res = scanBase64(r?.payload || {});
        if (res.count > 0) recordsWithImages++;
        totalCount += res.count;
        totalBytes += res.bytes;
      }
      setReports(arr);
      setScanResult({
        totalRecords: arr.length,
        recordsWithImages,
        totalImages: totalCount,
        totalBytes,
      });
      appendLog(`📊 Found ${totalCount} base64 image(s), ~${formatBytes(totalBytes)} in ${recordsWithImages} of ${arr.length} record(s)`);
      if (totalCount === 0) appendLog(`✨ No migration needed — all clean!`);
    } catch (e) {
      const msg = e?.message || String(e);
      setError(`Scan failed: ${msg}`);
      appendLog(`❌ Scan failed: ${msg}`);
      appendLog(`⏳ The server might be out of memory. Wait 2 minutes and try again.`);
    } finally {
      setScanning(false);
    }
  }

  async function doMigrate() {
    if (!reports.length) { setError("Run a scan first."); return; }
    if (!window.confirm(
      `Migrate ${scanResult.totalImages} image(s) across ${scanResult.recordsWithImages} record(s)?\n\n` +
      `Each image will be uploaded to Cloudinary (/api/images) and the record will be updated.\n\n` +
      `This is irreversible. Make sure your server has a backup.`
    )) return;

    setError("");
    setRunning(true);
    setProgress({ done: 0, total: scanResult.totalImages, uploaded: 0, failed: 0 });
    const targetRecords = reports.filter((r) => scanBase64(r?.payload || {}).count > 0);
    appendLog(`🚀 Starting migration on ${targetRecords.length} record(s)…`);

    let totalUploaded = 0, totalFailed = 0;
    for (let i = 0; i < targetRecords.length; i++) {
      const rec = targetRecords[i];
      const id = rec.id || rec._id;
      if (!id) {
        appendLog(`⚠️ Record at index ${i} has no id, skipping`);
        continue;
      }
      const counter = { uploaded: 0, failed: 0, errors: [] };
      try {
        const newPayload = await replaceBase64(rec.payload || {}, uploadBase64ToServer, counter, "$");
        if (counter.uploaded === 0 && counter.failed === 0) {
          appendLog(`⏭️ #${i + 1} (${id}): nothing to migrate`);
        } else {
          await updateRecord(id, newPayload);
          appendLog(`✅ #${i + 1} (${id}): uploaded ${counter.uploaded}, failed ${counter.failed}, saved`);
        }
      } catch (e) {
        counter.failed += 1;
        appendLog(`❌ #${i + 1} (${id}): ${e?.message || e}`);
      }
      totalUploaded += counter.uploaded;
      totalFailed += counter.failed;
      setProgress((p) => ({
        ...p,
        done: p.done + counter.uploaded + counter.failed,
        uploaded: p.uploaded + counter.uploaded,
        failed: p.failed + counter.failed,
      }));
    }
    appendLog(`🎉 Migration finished. Uploaded ${totalUploaded}, failed ${totalFailed}.`);
    setRunning(false);
  }

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div style={s.shell}>
      <div style={s.card}>
        <div style={s.header}>
          <div>
            <div style={s.title}>🖼️ Internal Audit — Image Cleanup</div>
            <div style={s.subtitle}>
              Converts the base64 images stored in <code style={s.code}>internal_multi_audit</code> records
              into lightweight Cloudinary URLs. This is the ONE table that's crashing your server.
            </div>
          </div>
          <button type="button" onClick={() => navigate(-1)} style={s.btn}>← Back</button>
        </div>

        <div style={s.banner}>
          <strong>⚠️ Why this exists:</strong> Internal Audit reports store images as massive base64 strings
          (each image = ~1 MB inline). When the page loads ALL records at once, the server runs out of memory
          (512 MB on Starter plan) and crashes. This tool uploads each image to Cloudinary and replaces it
          with a short URL (~80 bytes). After migration, the server is happy.
        </div>

        {/* Step 1: Scan */}
        <div style={s.section}>
          <div style={s.sectionTitle}>1. Scan (read-only — safe)</div>
          <button
            type="button"
            onClick={doScan}
            disabled={scanning || running}
            style={s.btnPrimary}
          >
            {scanning ? "⏳ Scanning…" : "🔎 Scan internal_multi_audit"}
          </button>

          {scanResult && (
            <div style={s.resultCard}>
              <table style={s.statsTable}>
                <tbody>
                  <tr><td>Total records</td><td style={s.statValue}>{scanResult.totalRecords}</td></tr>
                  <tr><td>Records with base64 images</td><td style={s.statValue}>{scanResult.recordsWithImages}</td></tr>
                  <tr><td>Total base64 images</td><td style={s.statValue}>{scanResult.totalImages}</td></tr>
                  <tr><td>Estimated memory savings after migration</td><td style={{ ...s.statValue, color: "#16a34a" }}>{formatBytes(scanResult.totalBytes)}</td></tr>
                </tbody>
              </table>
              {scanResult.totalImages === 0 && (
                <div style={{ ...s.notice, background: "#dcfce7", color: "#166534" }}>
                  ✅ Clean — no base64 images found. Your records are already using URLs.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Migrate */}
        {scanResult && scanResult.totalImages > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>2. Run migration (writes to DB)</div>
            <button
              type="button"
              onClick={doMigrate}
              disabled={running || scanning}
              style={{ ...s.btnPrimary, background: running ? "#9ca3af" : "linear-gradient(135deg, #16a34a, #15803d)" }}
            >
              {running ? "⏳ Migrating…" : `🚀 Migrate ${scanResult.totalImages} image(s)`}
            </button>

            {progress.total > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, marginBottom: 4 }}>
                  <span>Progress: {progress.done} / {progress.total} ({progressPct}%)</span>
                  <span>
                    <span style={{ color: "#166534" }}>✓ {progress.uploaded}</span>
                    {"  ·  "}
                    <span style={{ color: "#991b1b" }}>✗ {progress.failed}</span>
                  </span>
                </div>
                <div style={s.progressBar}>
                  <div style={{ ...s.progressFill, width: `${progressPct}%` }} />
                </div>
                {running && (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 6, fontWeight: 700 }}>
                    ⏳ This will take several minutes. Don't close this tab.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Log */}
        {log.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>📜 Log</div>
            <div style={s.logBox}>
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  shell: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif',
    padding: 20,
    direction: "ltr",
  },
  card: {
    maxWidth: 880, margin: "0 auto",
    background: "#fff", borderRadius: 20,
    border: "1px solid rgba(226,232,240,0.95)",
    boxShadow: "0 14px 40px rgba(2,6,23,.10)",
    padding: 26,
  },
  header: {
    display: "flex", alignItems: "flex-start", gap: 12,
    justifyContent: "space-between", flexWrap: "wrap",
    marginBottom: 18, paddingBottom: 12,
    borderBottom: "2px dashed rgba(226,232,240,.95)",
  },
  title: { fontSize: 22, fontWeight: 1000, color: "#0f172a" },
  subtitle: { fontSize: 13, color: "#64748b", fontWeight: 700, marginTop: 6, lineHeight: 1.6, maxWidth: 640 },
  code: { background: "#f1f5f9", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace", fontSize: 12 },
  btn: {
    padding: "8px 14px", borderRadius: 999,
    background: "#fff", color: "#0f172a",
    border: "1px solid rgba(148,163,184,.55)",
    fontWeight: 900, fontSize: 12, cursor: "pointer",
  },
  btnPrimary: {
    padding: "12px 22px", borderRadius: 14,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff", border: "none",
    fontWeight: 1000, fontSize: 14, cursor: "pointer",
    boxShadow: "0 12px 24px rgba(37,99,235,.30)",
  },
  banner: {
    background: "#fef9c3", border: "1px solid #fde68a",
    color: "#92400e", padding: "12px 14px", borderRadius: 12,
    fontSize: 13, fontWeight: 700, marginBottom: 20,
    lineHeight: 1.7,
  },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: 1000, color: "#0f172a", marginBottom: 10 },
  resultCard: {
    marginTop: 12, padding: 16, borderRadius: 12,
    background: "#f8fafc", border: "1px solid #e2e8f0",
  },
  statsTable: { width: "100%", fontSize: 13, fontWeight: 800 },
  statValue: { textAlign: "right", color: "#1e40af", fontFamily: "monospace", fontSize: 14, padding: "5px 0" },
  notice: { marginTop: 10, padding: 10, borderRadius: 10, fontSize: 13, fontWeight: 900 },
  progressBar: {
    width: "100%", height: 14, background: "#e2e8f0",
    borderRadius: 999, overflow: "hidden",
  },
  progressFill: {
    height: "100%", background: "linear-gradient(90deg, #2563eb, #16a34a)",
    transition: "width .25s",
  },
  errorBox: {
    background: "#fee2e2", color: "#7f1d1d",
    padding: "10px 14px", borderRadius: 10,
    fontWeight: 800, fontSize: 13, marginBottom: 12,
    border: "1px solid #fecaca",
  },
  logBox: {
    background: "#0b1220", color: "#cbd5e1",
    padding: 14, borderRadius: 12,
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 12, lineHeight: 1.7,
    maxHeight: 360, overflow: "auto",
  },
};
