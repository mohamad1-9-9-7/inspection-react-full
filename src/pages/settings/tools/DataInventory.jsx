// src/pages/settings/tools/DataInventory.jsx
// 📊 Scans the server and shows counts + estimated sizes per record TYPE.
//   - Identifies which types are heaviest (potential OOM risk).
//   - Detects records still using base64 images.
//   - Click a type → see top 5 largest records.

import React, { useState } from "react";
import API_BASE from "../../../config/api";

const KNOWN_TYPES = [
  // HSE (migrated)
  "hse_incident_reports", "hse_work_permits", "hse_licenses_certs",
  "hse_fire_equipment", "hse_forklift_inspection", "hse_toolbox_meeting",
  "hse_evacuation_drills", "hse_monthly_safety_report", "hse_ncr_reports",
  "hse_capa_actions", "hse_risk_register", "hse_policies_status",
  "hse_sops_status", "hse_training_records", "hse_ppe_log",
  "hse_emergency_contacts", "hse_cleaning_log", "hse_swabs_log",
  "hse_pest_control_log", "hse_equipment_maintenance", "hse_waste_log",
  "hse_welfare",
  // HACCP / ISO
  "ccp_monitoring_record", "ccp_catalog_config", "calibration_record",
  "internal_calibration_record", "internal_audit_record", "fsms_objective",
  "fsms_opportunity_register_item", "fsms_change_management_log_item",
  "glass_register_item", "mock_recall_drill", "mock_recall_config",
  "real_recall", "mrm_record", "customer_complaint", "continual_improvement",
  "licenses_contracts", "municipality_inspection", "haccp_manual_overrides",
  // QCS / branches
  "qcs_internal_audit", "qcs_raw_material_inspection",
  "qcs_meat_product_inspection", "qcs_pest_control",
  // Cars
  "car_approvals", "cars_loading_inspection", "truck_daily_cleaning",
  // Misc
  "internal_multi_audit", "ohc_certificate", "training_certificate",
  "supervisor_corrective_action", "admin_notification_config",
  "finished_products_report", "enoc_returns",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function isBase64Image(s) {
  return typeof s === "string" && /^data:image\/[a-z0-9.+-]+;base64,/i.test(s);
}

function countBase64(obj, acc = { count: 0, bytes: 0 }) {
  if (isBase64Image(obj)) {
    acc.count++;
    const comma = obj.indexOf(",");
    acc.bytes += Math.floor((obj.length - comma - 1) * 0.75);
    return acc;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) countBase64(v, acc);
    return acc;
  }
  if (obj && typeof obj === "object") {
    for (const v of Object.values(obj)) countBase64(v, acc);
  }
  return acc;
}

function fmtBytes(n) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function fetchType(type) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
    if (!res.ok) return { type, error: `HTTP ${res.status}` };
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data) ? data
              : Array.isArray(data?.data) ? data.data
              : Array.isArray(data?.items) ? data.items
              : Array.isArray(data?.rows) ? data.rows
              : [];
    const filtered = arr.filter((r) => r?.type === type || !r?.type);
    // Estimate JSON size + base64 inside
    let totalSize = 0, base64Count = 0, base64Bytes = 0;
    for (const r of filtered) {
      try { totalSize += JSON.stringify(r).length; } catch {}
      const b = countBase64(r?.payload || {});
      base64Count += b.count;
      base64Bytes += b.bytes;
    }
    return { type, count: filtered.length, totalSize, base64Count, base64Bytes };
  } catch (e) {
    return { type, error: e?.message || String(e) };
  }
}

export default function DataInventory() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [sort, setSort] = useState("count_desc");

  async function scan() {
    setScanning(true);
    setError("");
    setResults([]);
    setProgress(0);
    const out = [];
    for (let i = 0; i < KNOWN_TYPES.length; i++) {
      const t = KNOWN_TYPES[i];
      const res = await fetchType(t);
      if (res.count > 0 || res.error) out.push(res);
      setProgress(((i + 1) / KNOWN_TYPES.length) * 100);
      await sleep(200); // gentle on the server
    }
    setResults(out);
    setScanning(false);
  }

  const sorted = React.useMemo(() => {
    const r = [...results];
    switch (sort) {
      case "count_desc": r.sort((a, b) => (b.count || 0) - (a.count || 0)); break;
      case "size_desc": r.sort((a, b) => (b.totalSize || 0) - (a.totalSize || 0)); break;
      case "base64_desc": r.sort((a, b) => (b.base64Count || 0) - (a.base64Count || 0)); break;
      default: r.sort((a, b) => a.type.localeCompare(b.type));
    }
    return r;
  }, [results, sort]);

  const totals = React.useMemo(() => {
    return results.reduce((acc, r) => {
      acc.records += r.count || 0;
      acc.size += r.totalSize || 0;
      acc.base64 += r.base64Count || 0;
      acc.base64Bytes += r.base64Bytes || 0;
      acc.types += 1;
      if (r.error) acc.errors++;
      return acc;
    }, { records: 0, size: 0, base64: 0, base64Bytes: 0, types: 0, errors: 0 });
  }, [results]);

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>📊 Data Inventory</h2>
          <p style={s.intro}>
            Scans the server and lists every record type with counts, estimated sizes, and base64 image
            warnings. Use this to identify which types are bloating the database.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={s.select} disabled={scanning}>
            <option value="count_desc">Sort: by record count</option>
            <option value="size_desc">Sort: by total size</option>
            <option value="base64_desc">Sort: by base64 count</option>
            <option value="name">Sort: by name</option>
          </select>
          <button type="button" onClick={scan} disabled={scanning} style={s.btnPrimary}>
            {scanning ? `⏳ Scanning… ${progress.toFixed(0)}%` : "🔎 Scan All Types"}
          </button>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {scanning && (
        <div style={s.progressBar}>
          <div style={{ ...s.progressFill, width: `${progress}%` }} />
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Totals */}
          <div style={s.kpiGrid}>
            <Kpi icon="🗂️" label="Types found" value={totals.types} color="#0f172a" bg="#f1f5f9" />
            <Kpi icon="📝" label="Total records" value={totals.records.toLocaleString()} color="#1e40af" bg="#dbeafe" />
            <Kpi icon="💾" label="Approx total size" value={fmtBytes(totals.size)} color="#5b21b6" bg="#e9d5ff" />
            <Kpi
              icon="🖼️"
              label="Base64 images left"
              value={totals.base64}
              hint={totals.base64 > 0 ? `~${fmtBytes(totals.base64Bytes)} to clean` : "✅ Clean"}
              color={totals.base64 > 0 ? "#92400e" : "#166534"}
              bg={totals.base64 > 0 ? "#fef3c7" : "#dcfce7"}
            />
            {totals.errors > 0 && (
              <Kpi icon="⚠️" label="Errors" value={totals.errors} color="#991b1b" bg="#fee2e2" hint="Some types failed" />
            )}
          </div>

          {/* Table */}
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Type</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Records</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Size</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Base64 images</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.type} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: "monospace", fontWeight: 700 }}>{r.type}</td>
                    <td style={{ ...s.td, textAlign: "right", fontWeight: 900 }}>
                      {r.count?.toLocaleString() ?? "—"}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>
                      {r.error ? "—" : fmtBytes(r.totalSize)}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>
                      {r.base64Count > 0
                        ? <span style={s.badge("#92400e", "#fef3c7")}>⚠ {r.base64Count} ({fmtBytes(r.base64Bytes)})</span>
                        : r.error ? "—"
                        : <span style={s.badge("#166534", "#dcfce7")}>✓ clean</span>}
                    </td>
                    <td style={s.td}>
                      {r.error
                        ? <span style={s.badge("#991b1b", "#fee2e2")}>❌ {r.error}</span>
                        : <span style={s.badge("#475569", "#f1f5f9")}>OK</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!scanning && results.length === 0 && (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 6 }}>📊</div>
          <div style={{ fontWeight: 1000, color: "#0f172a" }}>No scan yet</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
            Click "Scan All Types" to inventory your server data.
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, hint, color, bg }) {
  return (
    <div style={{ background: bg, color, borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(226,232,240,.95)", boxShadow: "0 6px 14px rgba(2,6,23,.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.75 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 1000 }}>{value}</div>
      {hint && <div style={{ fontSize: 10, fontWeight: 800, opacity: 0.7 }}>{hint}</div>}
    </div>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: 1000, color: "#0f172a", margin: 0 },
  intro: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4, maxWidth: 560, lineHeight: 1.6 },
  select: {
    padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1",
    fontWeight: 800, fontSize: 12, background: "#fff", cursor: "pointer", color: "#0f172a",
  },
  btnPrimary: {
    padding: "10px 18px", borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
    border: "none", fontWeight: 1000, fontSize: 13, cursor: "pointer",
    boxShadow: "0 10px 22px rgba(37,99,235,.30)",
  },
  errorBox: {
    background: "#fee2e2", color: "#7f1d1d",
    padding: "10px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13, marginBottom: 12,
  },
  progressBar: { width: "100%", height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden", marginBottom: 16 },
  progressFill: { height: "100%", background: "linear-gradient(90deg, #2563eb, #16a34a)", transition: "width .2s" },
  kpiGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12, marginBottom: 16,
  },
  tableWrap: {
    background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
    overflow: "auto", boxShadow: "0 10px 24px rgba(2,6,23,.06)",
  },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: {
    background: "linear-gradient(180deg, #0b1220, #1e293b)", color: "#fff",
    padding: "10px 14px", textAlign: "left", fontWeight: 1000, fontSize: 11,
    letterSpacing: ".05em", textTransform: "uppercase",
  },
  tr: {},
  td: { padding: "9px 14px", borderTop: "1px solid #f1f5f9", fontSize: 13, color: "#0f172a", fontWeight: 700 },
  badge: (color, bg) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    background: bg, color, fontWeight: 1000, fontSize: 11,
  }),
  emptyState: {
    background: "#f8fafc", borderRadius: 14, border: "1px dashed #cbd5e1",
    padding: "30px 20px", textAlign: "center",
  },
};
