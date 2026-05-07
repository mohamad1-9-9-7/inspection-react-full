// src/pages/monitor/branches/qcs/StaffSicknessView.jsx
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

const TYPE = "qcs_staff_sickness";

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
  const v = r?.payload?.date || "";
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

/* ===== Tree ===== */
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
        <h3 style={{ margin: 0, fontWeight: 900, fontSize: 15, color: "#0f172a" }}>📅 Sickness Records</h3>
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
          placeholder="Search staff / details / date…"
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
                                          const rows = r?.payload?.rows || [];
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
                                            >
                                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                                🩺 {rows.length} entr{rows.length === 1 ? "y" : "ies"}
                                              </span>
                                              <span style={{
                                                background: "#f1f5f9", color: "#0f172a",
                                                padding: "2px 8px", borderRadius: 999,
                                                fontSize: 11, fontWeight: 800, border: "1px solid #e2e8f0",
                                              }}>
                                                {fmt(r?.payload?.date)}
                                              </span>
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
  const p     = record.payload || {};
  const hTop  = p.headerTop || {};
  const rows  = p.rows || [];
  const ft    = p.footer || {};
  const cb    = ft.checkedBy  || {};
  const vb    = ft.verifiedBy || {};

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
            {hTop.documentTitle || "Staff Sickness Form"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Doc No: <b>{hTop.documentNo || "AM/BK/CK/SS/1"}</b> · Issue: <b>05/05/2022</b> · Area: <b>{hTop.area || "Central Kitchen"}</b>
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
        <div style={{ fontStyle: "italic", color: "#0b5236", fontWeight: 800, fontSize: 16 }}>
          Staff Sickness / Occupational Injury Record
        </div>
      </div>

      {/* Date + meta */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { label: "Date",        value: fmt(p.date) },
          { label: "Issued By",   value: hTop.issuedBy   || "—" },
          { label: "Approved By", value: hTop.approvedBy || "—" },
          { label: "Controlling Officer", value: hTop.controllingOfficer || "—" },
        ].map((m) => (
          <div key={m.label} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{m.label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{m.value || "—"}</p>
          </div>
        ))}
      </div>

      {/* Rows table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 14 }}>
          <colgroup>
            <col style={{ width: 50 }} />
            <col style={{ width: "16%" }} />
            <col />
            <col style={{ width: "16%" }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 110 }} />
            <col />
          </colgroup>
          <thead>
            <tr style={{ background: "#0f3d2e", color: "#fff" }}>
              <th style={hCell}>S.No</th>
              <th style={hCell}>Staff Name</th>
              <th style={hCell}>Details of Sickness</th>
              <th style={hCell}>Action Taken</th>
              <th style={hCell}>Date From</th>
              <th style={hCell}>Date Returned</th>
              <th style={hCell}>Comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...dCell, textAlign: "center", color: "#94a3b8" }}>
                  No entries.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                <td style={{ ...dCell, fontWeight: 800, textAlign: "center" }}>{r.sNo || i + 1}</td>
                <td style={dCell}>{r.staffName || "—"}</td>
                <td style={{ ...dCell, whiteSpace: "pre-wrap" }}>{r.details || "—"}</td>
                <td style={{ ...dCell, whiteSpace: "pre-wrap" }}>{r.action || "—"}</td>
                <td style={dCell}>{fmt(r.dateFrom)}</td>
                <td style={dCell}>{fmt(r.dateReturned)}</td>
                <td style={{ ...dCell, whiteSpace: "pre-wrap" }}>{r.comments || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remarks */}
      <SectionHead title="Remarks / Corrective Actions" />
      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 14, whiteSpace: "pre-wrap", color: "#0f172a" }}>
        {p.remarks || <span style={{ color: "#cbd5e1" }}>—</span>}
      </div>

      {/* Sign-off */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
        <SignBox title="Checked By"  name={cb.name} date={cb.date} />
        <SignBox title="Verified By" name={vb.name} date={vb.date} />
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
  border: "1px solid #cbd5e1",
  padding: "8px 10px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 800,
};
const dCell = {
  border: "1px solid #e2e8f0",
  padding: "8px 10px",
  fontSize: 13,
  color: "#0f172a",
  verticalAlign: "top",
};

function SectionHead({ title }) {
  return (
    <div style={{ fontWeight: 900, background: "#e5e7eb", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 6, marginBottom: 8, color: "#0f172a" }}>
      {title}
    </div>
  );
}

function SignBox({ title, name, date }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{title}</p>
      <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{name || "—"}</p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>{date ? fmt(date) : "—"}</p>
    </div>
  );
}

/* ===== Main ===== */
export default function StaffSicknessView() {
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
      const p = r?.payload || {};
      const rows = p.rows || [];
      const ft   = p.footer || {};
      const hay = [
        p.date, p.remarks,
        ft.checkedBy?.name, ft.verifiedBy?.name,
        ...rows.flatMap((row) => [
          row.staffName, row.details, row.action, row.comments, row.dateFrom, row.dateReturned,
        ]),
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [records, search]);

  const tree = useMemo(() => groupByYMD(filtered), [filtered]);
  const selected = useMemo(() => records.find((r) => recId(r) === selectedId) || null, [records, selectedId]);

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this sickness record?")) return;
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
          🩺 Staff Sickness — Records
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
          Central Kitchen · AM/BK/CK/SS/1 · Staff Sickness / Occupational Injury Record
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
