// src/pages/settings/tools/DateTree.jsx
// 🗂️ Date Tree Explorer — browse records by Year → Month → Day.

import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../../config/api";

const KNOWN_TYPES = [
  "internal_multi_audit", "supervisor_corrective_action",
  "hse_incident_reports", "hse_work_permits", "hse_evacuation_drills",
  "hse_toolbox_meeting", "hse_fire_equipment", "hse_forklift_inspection",
  "car_approvals", "cars_loading_inspection", "truck_daily_cleaning",
  "ohc_certificate", "customer_complaint", "internal_audit_record",
  "ccp_monitoring_record", "calibration_record", "mock_recall_drill",
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function extractDate(rec) {
  const p = rec?.payload || {};
  // Try common date fields in order of preference
  const candidates = [
    p.reportDate, p.date, p.visitDate, p.inspectionDate,
    p.issueDate, p.expiryDate, p.createdAt,
    rec.createdAt, rec.updatedAt, p.savedAt,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const d = new Date(c);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function buildTree(records) {
  const tree = {};
  for (const r of records) {
    const d = extractDate(r);
    if (!d) {
      tree["_noDate"] = tree["_noDate"] || { records: [] };
      tree["_noDate"].records.push(r);
      continue;
    }
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    tree[y] = tree[y] || { count: 0, months: {} };
    tree[y].months[m] = tree[y].months[m] || { count: 0, days: {} };
    tree[y].months[m].days[day] = tree[y].months[m].days[day] || { count: 0, records: [] };
    tree[y].count++;
    tree[y].months[m].count++;
    tree[y].months[m].days[day].count++;
    tree[y].months[m].days[day].records.push(r);
  }
  return tree;
}

function summarizeRecord(rec) {
  const p = rec?.payload || {};
  // Try to find a meaningful "title" field
  const titleCandidates = [
    p.title, p.reportTitle, p.documentTitle,
    p.company, p.branchName, p.vehicleNo, p.supplierName,
    p.employeeName, p.workerName, p.auditTitle, p.subject,
    rec.id || rec._id,
  ];
  return String(titleCandidates.find(Boolean) || rec.id || rec._id || "Unnamed");
}

export default function DateTree() {
  const [type, setType] = useState("internal_multi_audit");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openYears, setOpenYears] = useState(new Set());
  const [openMonths, setOpenMonths] = useState(new Set());
  const [openDays, setOpenDays] = useState(new Set());

  async function load() {
    setLoading(true); setError(""); setRecords([]);
    setOpenYears(new Set()); setOpenMonths(new Set()); setOpenDays(new Set());
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      const arr = Array.isArray(data) ? data
                : Array.isArray(data?.data) ? data.data
                : Array.isArray(data?.items) ? data.items
                : Array.isArray(data?.rows) ? data.rows
                : [];
      setRecords(arr.filter((r) => r?.type === type || !r?.type));
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type]);

  const tree = useMemo(() => buildTree(records), [records]);

  const toggle = (setFn) => (key) => setFn((s) => {
    const next = new Set(s);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const toggleYear = toggle(setOpenYears);
  const toggleMonth = toggle(setOpenMonths);
  const toggleDay = toggle(setOpenDays);

  const years = Object.keys(tree).filter((k) => k !== "_noDate").map(Number).sort((a, b) => b - a);

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.h2}>🗂️ Date Tree Explorer</h2>
          <p style={s.intro}>
            Browse records hierarchically by Year → Month → Day. Quickly find what was saved when.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={type} onChange={(e) => setType(e.target.value)} disabled={loading} style={s.select}>
            {KNOWN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button type="button" onClick={load} disabled={loading} style={s.btnPrimary}>
            {loading ? "⏳ Loading…" : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && <div style={s.errorBox}>❌ {error}</div>}

      {records.length > 0 && (
        <div style={s.summary}>
          <span style={{ fontWeight: 1000 }}>{records.length}</span> record(s) in{" "}
          <span style={{ fontWeight: 1000 }}>{years.length}</span> year(s)
          {tree._noDate && <span style={{ marginInlineStart: 8, color: "#92400e" }}>· {tree._noDate.records.length} without a date</span>}
        </div>
      )}

      <div style={s.tree}>
        {years.map((y) => {
          const yearOpen = openYears.has(y);
          return (
            <div key={y} style={s.yearBox}>
              <button type="button" onClick={() => toggleYear(y)} style={s.yearBtn(yearOpen)}>
                <span style={s.chev}>{yearOpen ? "▼" : "▶"}</span>
                <span style={{ fontWeight: 1000, fontSize: 16 }}>📅 {y}</span>
                <span style={s.countBadge}>{tree[y].count}</span>
              </button>
              {yearOpen && Object.keys(tree[y].months).map(Number).sort((a, b) => b - a).map((m) => {
                const mKey = `${y}-${m}`;
                const monthOpen = openMonths.has(mKey);
                const mData = tree[y].months[m];
                return (
                  <div key={mKey} style={s.monthBox}>
                    <button type="button" onClick={() => toggleMonth(mKey)} style={s.monthBtn(monthOpen)}>
                      <span style={s.chev}>{monthOpen ? "▼" : "▶"}</span>
                      <span style={{ fontWeight: 900 }}>{MONTHS[m]} {y}</span>
                      <span style={s.countBadge}>{mData.count}</span>
                    </button>
                    {monthOpen && Object.keys(mData.days).map(Number).sort((a, b) => b - a).map((day) => {
                      const dKey = `${mKey}-${day}`;
                      const dayOpen = openDays.has(dKey);
                      const dData = mData.days[day];
                      return (
                        <div key={dKey} style={s.dayBox}>
                          <button type="button" onClick={() => toggleDay(dKey)} style={s.dayBtn(dayOpen)}>
                            <span style={s.chev}>{dayOpen ? "▼" : "▶"}</span>
                            <span style={{ fontWeight: 800, fontSize: 13 }}>
                              {String(day).padStart(2, "0")} {MONTHS[m]}
                            </span>
                            <span style={s.countBadgeSm}>{dData.count}</span>
                          </button>
                          {dayOpen && (
                            <div style={s.recordsBox}>
                              {dData.records.map((rec, i) => (
                                <div key={i} style={s.record}>
                                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#64748b" }}>
                                    {rec.id || rec._id || `#${i}`}
                                  </span>
                                  <span style={{ fontWeight: 800, fontSize: 13 }}>{summarizeRecord(rec)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
        {tree._noDate && (
          <div style={s.yearBox}>
            <div style={{ ...s.yearBtn(false), background: "#fef3c7", color: "#92400e" }}>
              <span style={s.chev}>·</span>
              <span style={{ fontWeight: 1000, fontSize: 14 }}>❓ Records without a date</span>
              <span style={s.countBadge}>{tree._noDate.records.length}</span>
            </div>
          </div>
        )}
        {!loading && records.length === 0 && !error && (
          <div style={s.emptyState}>
            <div style={{ fontSize: 36 }}>🗂️</div>
            <div style={{ fontWeight: 1000, color: "#0f172a", marginTop: 6 }}>No records to show</div>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: 1000, color: "#0f172a", margin: 0 },
  intro: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4, maxWidth: 560, lineHeight: 1.6 },
  select: {
    padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1",
    fontWeight: 800, fontSize: 12, background: "#fff", cursor: "pointer", color: "#0f172a", minWidth: 200,
  },
  btnPrimary: {
    padding: "10px 16px", borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff",
    border: "none", fontWeight: 1000, fontSize: 12, cursor: "pointer",
  },
  errorBox: { background: "#fee2e2", color: "#7f1d1d", padding: "10px 14px", borderRadius: 10, fontWeight: 800, fontSize: 13, marginBottom: 12 },
  summary: { fontSize: 13, color: "#475569", marginBottom: 12, fontWeight: 700 },
  tree: { display: "flex", flexDirection: "column", gap: 6 },
  yearBox: {},
  yearBtn: (open) => ({
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "12px 14px", borderRadius: 12,
    background: open ? "linear-gradient(180deg, #dbeafe, #eff6ff)" : "#fff",
    border: `1.5px solid ${open ? "#3b82f6" : "#e2e8f0"}`,
    cursor: "pointer", textAlign: "start", fontFamily: "inherit", color: "#0f172a",
    boxShadow: "0 4px 10px rgba(2,6,23,.04)",
  }),
  monthBox: { marginInlineStart: 22, marginTop: 4 },
  monthBtn: (open) => ({
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "9px 12px", borderRadius: 10,
    background: open ? "#f1f5f9" : "transparent",
    border: "1px solid #e2e8f0",
    cursor: "pointer", textAlign: "start", fontFamily: "inherit", color: "#0f172a",
  }),
  dayBox: { marginInlineStart: 22, marginTop: 3 },
  dayBtn: (open) => ({
    width: "100%", display: "flex", alignItems: "center", gap: 10,
    padding: "7px 12px", borderRadius: 8,
    background: open ? "#fef9c3" : "transparent",
    border: "1px dashed #cbd5e1",
    cursor: "pointer", textAlign: "start", fontFamily: "inherit", color: "#0f172a",
  }),
  recordsBox: { marginInlineStart: 22, marginTop: 4, display: "flex", flexDirection: "column", gap: 4 },
  record: {
    display: "flex", gap: 12, alignItems: "center",
    padding: "6px 10px", background: "#f8fafc",
    borderRadius: 8, border: "1px solid #e2e8f0",
  },
  chev: { fontSize: 10, color: "#64748b", width: 12 },
  countBadge: {
    marginInlineStart: "auto",
    background: "#0b1220", color: "#fff",
    padding: "3px 10px", borderRadius: 999,
    fontWeight: 1000, fontSize: 11,
  },
  countBadgeSm: {
    marginInlineStart: "auto",
    background: "#94a3b8", color: "#fff",
    padding: "2px 8px", borderRadius: 999,
    fontWeight: 1000, fontSize: 10,
  },
  emptyState: {
    background: "#f8fafc", borderRadius: 14, border: "1px dashed #cbd5e1",
    padding: "30px 20px", textAlign: "center",
  },
};
