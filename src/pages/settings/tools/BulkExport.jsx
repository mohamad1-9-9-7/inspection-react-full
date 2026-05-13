// src/pages/settings/tools/BulkExport.jsx
// 📦 Bulk export — downloads all records of a type as JSON / CSV.

import React, { useState } from "react";
import API_BASE from "../../../config/api";

const KNOWN_TYPES = [
  "internal_multi_audit", "supervisor_corrective_action",
  "hse_incident_reports", "hse_work_permits", "hse_risk_register",
  "hse_licenses_certs", "hse_ppe_log",
  "car_approvals", "cars_loading_inspection", "truck_daily_cleaning",
  "ohc_certificate", "customer_complaint", "internal_audit_record",
  "ccp_monitoring_record", "calibration_record",
];

function flatten(obj, prefix = "", out = {}) {
  if (obj === null || obj === undefined) {
    out[prefix] = "";
    return out;
  }
  if (Array.isArray(obj)) {
    out[prefix] = obj.length ? JSON.stringify(obj) : "";
    return out;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out[prefix] = String(obj);
  return out;
}

function toCsv(records) {
  // Flatten all records into a unified column set
  const flatRecords = records.map((r) => flatten(r));
  const allCols = new Set();
  flatRecords.forEach((r) => Object.keys(r).forEach((k) => allCols.add(k)));
  const cols = Array.from(allCols).sort();
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(escape).join(",")];
  for (const fr of flatRecords) {
    lines.push(cols.map((c) => escape(fr[c] || "")).join(","));
  }
  return "﻿" + lines.join("\r\n");
}

function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export default function BulkExport() {
  const [type, setType] = useState("internal_multi_audit");
  const [customType, setCustomType] = useState("");
  const [format, setFormat] = useState("json");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [count, setCount] = useState(null);

  const activeType = customType.trim() || type;

  async function doExport() {
    setBusy(true);
    setMsg(""); setCount(null);
    try {
      setMsg("📥 Fetching records…");
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(activeType)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      const arr = Array.isArray(data) ? data
                : Array.isArray(data?.data) ? data.data
                : Array.isArray(data?.items) ? data.items
                : Array.isArray(data?.rows) ? data.rows
                : [];
      const filtered = arr.filter((r) => r?.type === activeType || !r?.type);
      setCount(filtered.length);
      if (filtered.length === 0) { setMsg("⚠️ No records found for this type."); return; }

      const today = new Date().toISOString().slice(0, 10);
      if (format === "json") {
        downloadFile(JSON.stringify(filtered, null, 2), `${activeType}_${today}.json`, "application/json");
      } else if (format === "csv") {
        // CSV: flatten payload
        const flat = filtered.map((r) => ({ id: r.id, type: r.type, ...flatten(r.payload || {}, "payload") }));
        downloadFile(toCsv(flat), `${activeType}_${today}.csv`, "text/csv;charset=utf-8");
      }
      setMsg(`✅ Exported ${filtered.length} record(s).`);
    } catch (e) {
      setMsg("❌ Export failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>📦 Bulk Export</h2>
          <p style={s.intro}>
            Download all records of a type as JSON (full structure, exact replica) or CSV (flattened for Excel).
            Use this for backups, reports, or off-site analysis.
          </p>
        </div>
      </div>

      <div style={s.card}>
        <div style={s.field}>
          <label style={s.label}>Type to export</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={type} onChange={(e) => { setType(e.target.value); setCustomType(""); }} disabled={busy} style={s.select}>
              {KNOWN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}>or:</span>
            <input
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              disabled={busy}
              placeholder="custom_type"
              style={{ ...s.select, fontFamily: "monospace", minWidth: 200 }}
            />
          </div>
        </div>

        <div style={s.field}>
          <label style={s.label}>Format</label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <RadioCard
              checked={format === "json"}
              onClick={() => setFormat("json")}
              icon="📄"
              title="JSON"
              hint="Full records, exact structure (best for backup / re-import)"
            />
            <RadioCard
              checked={format === "csv"}
              onClick={() => setFormat("csv")}
              icon="📊"
              title="CSV"
              hint="Flattened, Excel-friendly (UTF-8 + BOM)"
            />
          </div>
        </div>

        <button type="button" onClick={doExport} disabled={busy} style={s.btnPrimary}>
          {busy ? "⏳ Exporting…" : `📥 Export ${activeType}`}
        </button>

        {msg && (
          <div style={{
            ...s.msgBox,
            background: msg.startsWith("❌") ? "#fee2e2" : msg.startsWith("⚠") ? "#fef3c7" : "#dcfce7",
            color: msg.startsWith("❌") ? "#7f1d1d" : msg.startsWith("⚠") ? "#92400e" : "#166534",
          }}>
            {msg}
            {count != null && <span style={{ marginInlineStart: 8 }}>· {count} record(s)</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function RadioCard({ checked, onClick, icon, title, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, minWidth: 200, padding: "12px 14px",
        background: checked ? "linear-gradient(135deg, #dbeafe, #eff6ff)" : "#fff",
        border: `2px solid ${checked ? "#2563eb" : "#e2e8f0"}`,
        borderRadius: 12, cursor: "pointer",
        textAlign: "start", fontFamily: "inherit",
        boxShadow: checked ? "0 10px 22px rgba(37,99,235,.18)" : "0 4px 10px rgba(2,6,23,.04)",
        transition: "all .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontWeight: 1000, fontSize: 14, color: checked ? "#1e40af" : "#0f172a" }}>{title}</span>
      </div>
      <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, lineHeight: 1.5 }}>{hint}</div>
    </button>
  );
}

const s = {
  header: { marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: 1000, color: "#0f172a", margin: 0 },
  intro: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4, maxWidth: 560, lineHeight: 1.6 },
  card: { background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #e2e8f0", boxShadow: "0 8px 18px rgba(2,6,23,.06)" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 11, fontWeight: 1000, color: "#0f172a", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" },
  select: {
    padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1",
    fontWeight: 800, fontSize: 13, background: "#fff", cursor: "pointer", color: "#0f172a",
  },
  btnPrimary: {
    padding: "10px 18px", borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
    border: "none", fontWeight: 1000, fontSize: 13, cursor: "pointer",
    boxShadow: "0 10px 22px rgba(37,99,235,.30)",
  },
  msgBox: { marginTop: 12, padding: "10px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13 },
};
