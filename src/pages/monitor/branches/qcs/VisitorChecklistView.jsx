// src/pages/monitor/branches/qcs/VisitorChecklistView.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "qcs_visitor_checklist";

/* ===== Helpers ===== */
const monthNames = [
  "01 - January","02 - February","03 - March","04 - April","05 - May","06 - June",
  "07 - July","08 - August","09 - September","10 - October","11 - November","12 - December",
];

const fmt = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; }
};

const recId = (r) => r?._id || r?.id || null;

const recDate = (r) => {
  const v = r?.payload?.visitor?.visitDate || "";
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (r?.payload?.savedAt) {
    try {
      const d = new Date(r.payload.savedAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch {}
  }
  return "0000-00-00";
};

function groupByYMD(list) {
  const map = {};
  list.forEach((r) => {
    const d = recDate(r) || "0000-00-00";
    const [y, m, day] = d.split("-");
    map[y] ??= {};
    map[y][m] ??= {};
    map[y][m][day] ??= [];
    map[y][m][day].push(r);
  });
  return map;
}

/* ===== Decision badge ===== */
const DecisionBadge = ({ value }) => {
  const allowed = String(value).toLowerCase() === "allowed";
  const palette = allowed
    ? { bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0", icon: "✓" }
    : value
    ? { bg: "#fee2e2", color: "#dc2626", border: "#fecaca", icon: "✗" }
    : { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb", icon: "—" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800,
      background: palette.bg, color: palette.color, border: `1px solid ${palette.border}`,
    }}>
      <span>{palette.icon}</span>
      <span>{value || "—"}</span>
    </span>
  );
};

const YesNoChip = ({ value }) => {
  if (value === "Yes") return <span style={{ background: "#fee2e2", color: "#dc2626", padding: "2px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 }}>Yes</span>;
  if (value === "No")  return <span style={{ background: "#dcfce7", color: "#16a34a", padding: "2px 10px", borderRadius: 999, fontWeight: 800, fontSize: 12 }}>No</span>;
  return <span style={{ color: "#94a3b8", fontWeight: 700 }}>—</span>;
};

/* ===== Tree (Year > Month > Day > Visitors) ===== */
function SidebarTree({ tree, selectedId, setSelectedId, search, setSearch, onRefresh, loading }) {
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [openDays, setOpenDays] = useState({});

  const yearsSorted = useMemo(
    () => Object.keys(tree).sort((a, b) => b.localeCompare(a)),
    [tree]
  );

  const countDay = (y, m, d) => (tree?.[y]?.[m]?.[d] || []).length;
  const countMonth = (y, m) => Object.keys(tree?.[y]?.[m] || {}).reduce((s, d) => s + countDay(y, m, d), 0);
  const countYear = (y) => Object.keys(tree?.[y] || {}).reduce((s, m) => s + countMonth(y, m), 0);
  const total = yearsSorted.reduce((a, y) => a + countYear(y), 0);

  return (
    <aside
      style={{
        flex: "0 0 320px",
        maxHeight: "82vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 18px rgba(2,6,23,.06)",
        padding: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "#0f172a" }}>📅 Visitor Records</h3>
        <span style={{ background: "#0f172a", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
          {total} total
        </span>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px solid #16a34a",
          background: loading ? "#cbd5e1" : "linear-gradient(135deg,#10b981,#0ea5e9)",
          color: "#fff",
          fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: 10,
        }}
      >
        {loading ? "⏳ Loading…" : "🔄 Refresh"}
      </button>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name / company / mobile…"
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1px solid #e2e8f0", borderRadius: 10,
            padding: "9px 12px 9px 32px", fontSize: 13, outline: "none",
          }}
        />
      </div>

      {yearsSorted.length === 0 && (
        <div style={{ color: "#94a3b8", textAlign: "center", padding: 20, fontSize: 13 }}>
          No records found.
        </div>
      )}

      {yearsSorted.map((year) => {
        const yearOpen = !!openYears[year];
        return (
          <div key={year} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
              style={treeBtn("year", yearOpen)}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={dot("#6366f1")} />
                <span>Year {year}</span>
                <span style={pill}>{countYear(year)}</span>
              </span>
              <span style={chev}>{yearOpen ? "▾" : "▸"}</span>
            </button>

            {yearOpen && (
              <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px dashed #cbd5e1", marginLeft: 6 }}>
                {Object.keys(tree[year])
                  .sort((a, b) => b.localeCompare(a))
                  .map((m) => {
                    const ym = `${year}-${m}`;
                    const monthOpen = !!openMonths[ym];
                    const mLabel = monthNames[parseInt(m, 10) - 1] || m;
                    return (
                      <div key={ym} style={{ marginBottom: 6, marginTop: 6 }}>
                        <button
                          onClick={() => setOpenMonths((p) => ({ ...p, [ym]: !p[ym] }))}
                          style={treeBtn("month", monthOpen)}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={dot("#0ea5e9")} />
                            <span>{mLabel}</span>
                            <span style={pill}>{countMonth(year, m)}</span>
                          </span>
                          <span style={chev}>{monthOpen ? "▾" : "▸"}</span>
                        </button>

                        {monthOpen && (
                          <div style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px dashed #cbd5e1", marginLeft: 6 }}>
                            {Object.keys(tree[year][m])
                              .sort((a, b) => b.localeCompare(a))
                              .map((d) => {
                                const ymd = `${ym}-${d}`;
                                const dayOpen = !!openDays[ymd];
                                const items = tree[year][m][d] || [];
                                return (
                                  <div key={ymd} style={{ marginTop: 6 }}>
                                    <button
                                      onClick={() => setOpenDays((p) => ({ ...p, [ymd]: !p[ymd] }))}
                                      style={treeBtn("day", dayOpen)}
                                    >
                                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={dot("#10b981")} />
                                        <span>{year}-{m}-{d}</span>
                                        <span style={pill}>{items.length}</span>
                                      </span>
                                      <span style={chev}>{dayOpen ? "▾" : "▸"}</span>
                                    </button>

                                    {dayOpen && (
                                      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
                                        {items.map((r) => {
                                          const id = recId(r);
                                          const v = r?.payload?.visitor || {};
                                          const decision = r?.payload?.management?.decision || "";
                                          const active = id === selectedId;
                                          return (
                                            <button
                                              key={id}
                                              onClick={() => setSelectedId(id)}
                                              style={{
                                                width: "100%",
                                                padding: "8px 10px",
                                                borderRadius: 10,
                                                border: active ? "2px solid #0f172a" : "1px solid #e2e8f0",
                                                background: active ? "linear-gradient(180deg,#f1f5f9,#fff)" : "#fff",
                                                color: "#0f172a",
                                                cursor: "pointer",
                                                fontWeight: active ? 900 : 700,
                                                textAlign: "left",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                gap: 8,
                                              }}
                                              title={v.companyName || ""}
                                            >
                                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                                👤 {v.visitorName || "Unnamed"}
                                              </span>
                                              <DecisionBadge value={decision} />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

const treeBtn = (level, open) => ({
  width: "100%",
  textAlign: "left",
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: open
    ? (level === "year"  ? "linear-gradient(180deg,#eef2ff,#fff)"
      : level === "month" ? "linear-gradient(180deg,#eff6ff,#fff)"
      : "linear-gradient(180deg,#ecfdf5,#fff)")
    : "#fff",
  fontWeight: 800,
  color: "#0f172a",
  cursor: "pointer",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
});
const dot = (color) => ({
  width: 9, height: 9, borderRadius: 999, background: color,
  boxShadow: `0 0 0 3px ${color}25`, flex: "0 0 auto",
});
const pill = {
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  background: "#f1f5f9",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
};
const chev = {
  width: 24, height: 24, borderRadius: 6, border: "1px solid #e2e8f0",
  display: "grid", placeItems: "center", fontWeight: 900, color: "#0f172a",
  background: "#fff", flex: "0 0 auto",
};

/* ===== Detail panel ===== */
function DetailsPanel({ record, onDelete, deleting }) {
  if (!record) {
    return (
      <main style={{ flex: 1, padding: 40, color: "#94a3b8", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0" }}>
        Select a record from the tree to view its details.
      </main>
    );
  }
  const p = record.payload || {};
  const hTop = p.headerTop || {};
  const v    = p.visitor   || {};
  const q1   = p.healthQuestions?.q1 || [];
  const qa   = p.healthQuestions?.additional || [];
  const sigs = p.signatures || {};
  const mgmt = p.management || {};
  const decl = p.declaration || {};

  return (
    <main
      style={{
        flex: 1,
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 18px rgba(2,6,23,.06)",
        padding: 16,
        maxHeight: "82vh",
        overflowY: "auto",
      }}
    >
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>
            {hTop.documentTitle || "Visitor Checklist"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Doc No: <b>{hTop.documentNo || "FF/QA/VC/1"}</b> · Rev: <b>{hTop.revisionNo || "0"}</b> · Issue: <b>26/02/2020</b> · Area: <b>{hTop.area || "QA"}</b>
          </div>
        </div>
        <button
          onClick={() => onDelete(recId(record))}
          disabled={deleting}
          style={{
            background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca",
            borderRadius: 10, padding: "8px 14px", fontWeight: 800, cursor: deleting ? "not-allowed" : "pointer",
          }}
        >
          {deleting ? "…" : "🗑 Delete"}
        </button>
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 12, padding: "12px 0", background: "#f8fafc", borderRadius: 10, border: "1px solid #e2e8f0" }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>TRANS EMIRATES LIVESTOCK TRADING LLC</div>
        <div style={{ fontStyle: "italic", color: "#0b5236", fontWeight: 800, marginTop: 2 }}>Visitor Checklist</div>
      </div>

      {/* Visitor info */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Visitor Name",  value: v.visitorName },
          { label: "Date",          value: fmt(v.visitDate) },
          { label: "Company Name",  value: v.companyName },
          { label: "Mobile Number", value: v.mobileNumber },
          { label: "Purpose Of Visit", value: v.purposeOfVisit, wide: true },
        ].map((m) => (
          <div key={m.label} style={{
            background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
            padding: "10px 14px",
            gridColumn: m.wide ? "1 / -1" : "auto",
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{m.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Q1 */}
      <SectionHead title="Q.1 — Suffer from any of the following now or during the last 2 weeks?" />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
        <colgroup>
          <col style={{ width: 60 }} />
          <col />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={hCell}>#</th>
            <th style={hCell}>Question</th>
            <th style={hCell}>Answer</th>
          </tr>
        </thead>
        <tbody>
          {q1.map((it, i) => (
            <tr key={it.code} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={dCell}><b>{it.code})</b></td>
              <td style={dCell}>{it.text}</td>
              <td style={{ ...dCell, textAlign: "center" }}><YesNoChip value={it.answer} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Additional */}
      <SectionHead title="Additional Health Questions" />
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
        <colgroup>
          <col style={{ width: 60 }} />
          <col />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={hCell}>#</th>
            <th style={hCell}>Question</th>
            <th style={hCell}>Answer</th>
          </tr>
        </thead>
        <tbody>
          {qa.map((it, i) => (
            <tr key={it.code} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={dCell}><b>{it.code}</b></td>
              <td style={dCell}>{it.text}</td>
              <td style={{ ...dCell, textAlign: "center" }}><YesNoChip value={it.answer} /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Declaration */}
      <SectionHead title="Declaration By Visitor/s" />
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 14, fontStyle: "italic", color: "#334155" }}>
        {`"${decl.text || ""}"`}
        <div style={{ marginTop: 6, fontStyle: "normal", fontWeight: 800, color: decl.accepted ? "#16a34a" : "#dc2626" }}>
          {decl.accepted ? "✓ Accepted" : "✗ Not accepted"}
        </div>
      </div>

      {/* Signatures + Remarks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Field label="Visitor's Signature" value={sigs.visitorSignature} />
        <Field label="Manager Signature"   value={sigs.managerSignature} />
      </div>
      <Field label="Management Remarks" value={mgmt.remarks} multiline />

      {/* Decision */}
      <div style={{ marginTop: 14, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontWeight: 900, color: "#0f172a" }}>Management Decision</span>
        <DecisionBadge value={mgmt.decision} />
      </div>

      {p.savedAt && (
        <p style={{ textAlign: "right", fontSize: 11, color: "#cbd5e1", marginTop: 16 }}>
          Saved: {new Date(p.savedAt).toLocaleString("en-GB")}
        </p>
      )}
    </main>
  );
}

const hCell = {
  border: "1px solid #e2e8f0",
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 800,
  color: "#475569",
};
const dCell = {
  border: "1px solid #e2e8f0",
  padding: "8px 10px",
  fontSize: 13,
  color: "#0f172a",
};

function SectionHead({ title }) {
  return (
    <div style={{ fontWeight: 900, background: "#e5e7eb", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, marginBottom: 8, color: "#0f172a" }}>
      {title}
    </div>
  );
}

function Field({ label, value, multiline }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a", whiteSpace: multiline ? "pre-wrap" : "normal" }}>
        {value || "—"}
      </p>
    </div>
  );
}

/* ===== Main ===== */
export default function VisitorChecklistView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch]   = useState("");
  const abortRef = useRef(null);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const res = await fetch(
        `${API_BASE}/api/reports?reporter=qcs&type=${TYPE}`,
        { cache: "no-store", signal: abortRef.current.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.reports || data.data || []);
      const normalized = arr
        .map((r, i) => ({ ...r, _id: r._id || r.id || `rec-${i}` }))
        .sort((a, b) => (b.payload?.savedAt || 0) - (a.payload?.savedAt || 0));
      setRecords(normalized);
    } catch (e) {
      if (e.name !== "AbortError") setError("Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    return () => abortRef.current?.abort();
  }, [fetchRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const v = r?.payload?.visitor || {};
      const m = r?.payload?.management || {};
      const hay = [
        v.visitorName, v.companyName, v.mobileNumber, v.purposeOfVisit, v.visitDate,
        m.decision, m.remarks,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);

  const tree = useMemo(() => groupByYMD(filtered), [filtered]);
  const selected = useMemo(() => records.find((r) => recId(r) === selectedId) || null, [records, selectedId]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this visitor checklist?")) return;
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRecords((p) => p.filter((r) => recId(r) !== id));
      if (selectedId === id) setSelectedId(null);
    } catch {
      alert("Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", padding: "8px 0" }}>
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
          📋 Visitor Checklist — Records
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          QCS · FF/QA/VC/1 · Visitor Health & Hygiene Screening
        </p>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 12, color: "#dc2626", fontWeight: 700, marginBottom: 12 }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <SidebarTree
          tree={tree}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          search={search}
          setSearch={setSearch}
          onRefresh={fetchRecords}
          loading={loading}
        />
        <DetailsPanel record={selected} onDelete={handleDelete} deleting={deleting} />
      </div>
    </div>
  );
}
