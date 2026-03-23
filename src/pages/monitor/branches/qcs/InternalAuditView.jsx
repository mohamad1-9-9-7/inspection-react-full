// src/pages/monitor/branches/qcs/InternalAuditView.jsx
import React, { useState, useEffect, useCallback } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "qcs_internal_audit";

/* ===== helpers ===== */
const getId = (r) => r?._id || r?.id || null; // ✅ normalize ID

/* ===== Status colors ===== */
const STATUS_COLOR = {
  Yes: { bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" },
  No:  { bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  NA:  { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" },
  OK:  { bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe" },
  "":  { bg: "#f9fafb", color: "#9ca3af", border: "#e5e7eb" },
};

const FINDING_STATUS_COLOR = {
  OPEN:          { bg: "#fee2e2", color: "#dc2626" },
  "IN PROGRESS": { bg: "#fef9c3", color: "#ca8a04" },
  CLOSED:        { bg: "#dcfce7", color: "#16a34a" },
  "ON HOLD":     { bg: "#f3f4f6", color: "#6b7280" },
};

/* ===== Helpers ===== */
const fmt = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; }
};

const StatusBadge = ({ value }) => {
  const s = STATUS_COLOR[value] || STATUS_COLOR[""];
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{value || "—"}</span>
  );
};

const FindingBadge = ({ value }) => {
  const s = FINDING_STATUS_COLOR[value] || { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 700, background: s.bg, color: s.color,
    }}>{value || "—"}</span>
  );
};

/* ===== Score calculator ===== */
const calcScore = (checklist) => {
  if (!checklist) return null;
  let yes = 0, no = 0, ok = 0, na = 0, total = 0;
  checklist.forEach(g =>
    g.items.forEach(it => {
      total++;
      if (it.status === "Yes") yes++;
      else if (it.status === "No") no++;
      else if (it.status === "OK") ok++;
      else if (it.status === "NA") na++;
    })
  );
  const answered = yes + no + ok;
  const score = answered > 0 ? Math.round(((yes + ok) / answered) * 100) : null;
  return { yes, no, ok, na, total, score };
};

/* ===== Main component ===== */
export default function InternalAuditView() {
  const [records, setRecords]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [selected, setSelected]           = useState(null);
  const [deleting, setDeleting]           = useState(null);
  const [search, setSearch]               = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  /* ── Fetch list ── */
  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/reports?reporter=qcs&type=${TYPE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.reports || data.data || []);
      // ✅ normalize: كل record يحصل على _id موحد
      const normalized = arr.map((r, i) => ({ ...r, _id: r._id || r.id || `rec-${i}` }));
      setRecords(normalized.sort((a, b) => (b.payload?.savedAt || 0) - (a.payload?.savedAt || 0)));
    } catch (e) {
      setError("Failed to load records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  /* ── Delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this audit record?")) return;
    try {
      setDeleting(id);
      // ✅ id مضمون مش undefined لأننا normalize فوق
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRecords(p => p.filter(r => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch {
      alert("Failed to delete.");
    } finally {
      setDeleting(null);
    }
  };

  /* ── Toggle group expand ── */
  const toggleGroup = (title) =>
    setExpandedGroups(p => ({ ...p, [title]: !p[title] }));

  const expandAll = (checklist) => {
    const obj = {};
    checklist?.forEach(g => { obj[g.title] = true; });
    setExpandedGroups(obj);
  };

  const collapseAll = () => setExpandedGroups({});

  /* ── Filtered list ── */
  const filtered = records.filter(r => {
    const p = r.payload || {};
    const q = search.toLowerCase();
    return (
      !q ||
      (p.headRow?.conductedBy  || "").toLowerCase().includes(q) ||
      (p.headRow?.area         || "").toLowerCase().includes(q) ||
      (p.headRow?.dateOfAudit  || "").includes(q) ||
      (p.footer?.auditorName   || "").toLowerCase().includes(q)
    );
  });

  /* ===========================
     LIST VIEW
  =========================== */
  if (!selected) {
    return (
      <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
              📋 Internal Audit — Records
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>QCS · FS-QA/INA-QCS-W/01</p>
          </div>
          <button
            onClick={fetchRecords}
            style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: 16 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by auditor, area, or date..."
            style={{
              width: "100%", boxSizing: "border-box",
              border: "1.5px solid #e2e8f0", borderRadius: 10,
              padding: "10px 12px 10px 36px", fontSize: 14,
              color: "#0f172a", outline: "none",
            }}
          />
        </div>

        {/* States */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#64748b", fontSize: 15 }}>
            ⏳ Loading records...
          </div>
        )}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 16, color: "#dc2626", fontWeight: 600 }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#94a3b8", fontSize: 15 }}>
            {search ? "No records match your search." : "No audit records found."}
          </div>
        )}

        {/* Records list */}
        {!loading && !error && filtered.map((rec) => {
          const p  = rec.payload || {};
          const h  = p.headRow  || {};
          const ft = p.footer   || {};
          const sc = calcScore(p.checklist);
          const openFindings = (p.auditRecommendation || [])
            .filter(r => r.status === "OPEN" || r.status === "IN PROGRESS").length;

          return (
            <div
              key={rec._id} // ✅ مضمون مش undefined
              style={{
                background: "#fff", border: "1.5px solid #e2e8f0",
                borderRadius: 14, padding: "16px 20px", marginBottom: 10,
                cursor: "pointer", transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,0.10)"; e.currentTarget.style.borderColor = "#93c5fd"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
              onClick={() => { setSelected(rec); expandAll(p.checklist); }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>

                {/* Left */}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>
                    📅 {fmt(h.dateOfAudit)}
                    {h.area && <span style={{ color: "#64748b", fontWeight: 500, marginLeft: 8 }}>· {h.area}</span>}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", display: "flex", gap: 16, flexWrap: "wrap" }}>
                    {h.conductedBy && <span>👤 <b>{h.conductedBy}</b></span>}
                    {ft.auditorName && <span>✍️ {ft.auditorName}</span>}
                    {h.verifiedBy  && <span>✅ Verified by: {h.verifiedBy}</span>}
                  </div>
                </div>

                {/* Right — badges */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {sc?.score != null && (
                    <span style={{
                      background: sc.score >= 80 ? "#dcfce7" : sc.score >= 60 ? "#fef9c3" : "#fee2e2",
                      color:      sc.score >= 80 ? "#16a34a" : sc.score >= 60 ? "#ca8a04" : "#dc2626",
                      fontWeight: 800, fontSize: 13, padding: "4px 12px", borderRadius: 999,
                    }}>
                      {sc.score}% Compliance
                    </span>
                  )}
                  {openFindings > 0 && (
                    <span style={{ background: "#fee2e2", color: "#dc2626", fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>
                      {openFindings} open finding{openFindings > 1 ? "s" : ""}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(rec._id); }} // ✅
                    disabled={deleting === rec._id}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    {deleting === rec._id ? "…" : "🗑 Delete"}
                  </button>
                </div>
              </div>

              {/* Mini stats */}
              {sc && (
                <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                  {[
                    { label: "Yes",   val: sc.yes,   color: "#16a34a", bg: "#dcfce7" },
                    { label: "No",    val: sc.no,    color: "#dc2626", bg: "#fee2e2" },
                    { label: "OK",    val: sc.ok,    color: "#2563eb", bg: "#dbeafe" },
                    { label: "N/A",   val: sc.na,    color: "#6b7280", bg: "#f3f4f6" },
                    { label: "Total", val: sc.total, color: "#0f172a", bg: "#f1f5f9" },
                  ].map(s => (
                    <span key={s.label} style={{ fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, padding: "2px 10px", borderRadius: 999 }}>
                      {s.label}: {s.val}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ===========================
     DETAIL VIEW
  =========================== */
  const p    = selected.payload || {};
  const h    = p.headRow        || {};
  const hTop = p.headerTop      || {};
  const ft   = p.footer         || {};
  const sc   = calcScore(p.checklist);
  const recs = p.auditRecommendation || [];

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: 24, maxWidth: 1100, margin: "0 auto" }}>

      {/* Back */}
      <button
        onClick={() => setSelected(null)}
        style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 16px", fontWeight: 700, cursor: "pointer", marginBottom: 20, fontSize: 13, color: "#374151" }}
      >
        ← Back to Records
      </button>

      {/* Document header */}
      <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
              {hTop.documentTitle || "INTERNAL AUDIT – QCS"}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {hTop.documentNo} · Issue No: {hTop.issueNo} · Revision: {hTop.revisionNo} · Issue Date: 01/11/2025
            </p>
          </div>
          {sc?.score != null && (
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontSize: 28, fontWeight: 900,
                color: sc.score >= 80 ? "#16a34a" : sc.score >= 60 ? "#ca8a04" : "#dc2626",
              }}>{sc.score}%</div>
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Compliance Score</div>
            </div>
          )}
        </div>

        {/* Score bar */}
        {sc?.score != null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${sc.score}%`,
                background: sc.score >= 80 ? "#22c55e" : sc.score >= 60 ? "#eab308" : "#ef4444",
                transition: "width 0.6s ease",
              }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              {[
                { label: "Yes",   val: sc.yes,   color: "#16a34a" },
                { label: "No",    val: sc.no,    color: "#dc2626" },
                { label: "OK",    val: sc.ok,    color: "#2563eb" },
                { label: "N/A",   val: sc.na,    color: "#6b7280" },
                { label: "Total", val: sc.total, color: "#0f172a" },
              ].map(s => (
                <span key={s.label} style={{ fontSize: 13, fontWeight: 700, color: s.color }}>
                  {s.label}: {s.val}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Meta info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Conducted By",  value: h.conductedBy },
          { label: "Verified By",   value: h.verifiedBy  },
          { label: "Date of Audit", value: fmt(h.dateOfAudit) },
          { label: "Area",          value: h.area        },
          { label: "Auditor Name",  value: ft.auditorName },
          { label: "Auditor Date",  value: fmt(ft.auditorSignDate) },
        ].map(m => (
          <div key={m.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Expand/Collapse */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => expandAll(p.checklist)} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, color: "#374151" }}>
          ↓ Expand All
        </button>
        <button onClick={collapseAll} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12, color: "#374151" }}>
          ↑ Collapse All
        </button>
      </div>

      {/* Checklist groups */}
      {(p.checklist || []).map((g, gi) => {
        const isOpen   = expandedGroups[g.title] !== false;
        const groupNo  = g.items.filter(i => i.status === "No").length;
        const groupYes = g.items.filter(i => i.status === "Yes" || i.status === "OK").length;

        return (
          <div key={`group-${gi}`} style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}> {/* ✅ key محدد */}
            <div
              onClick={() => toggleGroup(g.title)}
              style={{
                background: "#f8fafc", padding: "12px 16px",
                borderBottom: isOpen ? "1px solid #e2e8f0" : "none",
                cursor: "pointer", userSelect: "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}
            >
              <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{g.title}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {groupNo > 0 && (
                  <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                    {groupNo} ✗
                  </span>
                )}
                {groupYes > 0 && (
                  <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                    {groupYes} ✓
                  </span>
                )}
                <span style={{ color: "#94a3b8", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <colgroup>
                    <col style={{ width: "5%" }} />
                    <col style={{ width: "55%" }} />
                    <col style={{ width: "12%" }} />
                    <col />
                  </colgroup>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      {["#", "Area / Question", "Status", "Remarks"].map(col => (
                        <th key={col} style={{ border: "1px solid #e2e8f0", padding: "8px 10px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569" }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((it, ii) => (
                      <tr key={`${gi}-${it.code}`} style={{ background: ii % 2 === 0 ? "#fff" : "#fafafa" }}> {/* ✅ key فريد */}
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 12, fontWeight: 700, color: "#64748b", verticalAlign: "top" }}>{it.code}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", verticalAlign: "top" }}>{it.text}</td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", verticalAlign: "top" }}>
                          <StatusBadge value={it.status} />
                        </td>
                        <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", verticalAlign: "top" }}>
                          {it.remarks || <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Audit Recommendations */}
      {recs.length > 0 && (
        <div style={{ background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 14, marginTop: 16, overflow: "hidden" }}>
          <div style={{ background: "#f8fafc", padding: "12px 16px", borderBottom: "1px solid #e2e8f0" }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>📌 Audit Recommendations</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: "#64748b" }}>{recs.length} item{recs.length > 1 ? "s" : ""}</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f1f5f9" }}>
                  {["#", "Finding", "Type", "Action", "Responsibility", "Target Date", "Status"].map(col => (
                    <th key={col} style={{ border: "1px solid #e2e8f0", padding: "8px 10px", textAlign: "left", fontSize: 12, fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recs.map((r, i) => (
                  <tr key={`rec-${i}`} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}> {/* ✅ key محدد */}
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, fontWeight: 700, color: "#64748b", verticalAlign: "top" }}>{i + 1}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", verticalAlign: "top", minWidth: 180 }}>{r.finding || "—"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", verticalAlign: "top", whiteSpace: "nowrap" }}>{r.type || "—"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", verticalAlign: "top", minWidth: 160 }}>{r.action || "—"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", verticalAlign: "top", whiteSpace: "nowrap" }}>{r.resp || "—"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", fontSize: 13, color: "#374151", verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(r.targetDate)}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "8px 10px", verticalAlign: "top" }}>
                      <FindingBadge value={r.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved at */}
      {p.savedAt && (
        <p style={{ textAlign: "right", fontSize: 11, color: "#cbd5e1", marginTop: 16 }}>
          Saved: {new Date(p.savedAt).toLocaleString("en-GB")}
        </p>
      )}
    </div>
  );
}