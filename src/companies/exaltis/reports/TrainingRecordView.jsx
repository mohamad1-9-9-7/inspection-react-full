// src/pages/monitor/branches/sweets/TrainingRecordView.jsx
// Browse saved Internal Training records (sweets_training_record). List with
// search + detail panel + delete + CSV export. Self-contained, renders inside
// the company-app shell. Company isolation is server-side by token.

import React, { useState, useEffect, useCallback } from "react";
import API_BASE from "../../../../config/api";
import { canDelete } from "../../../../utils/perms";

const TYPE = "sweets_training_record";
const getId = (r) => r?._id || r?.id || r?.payload?.id || null;
const fmt = (d) => { if (!d) return "—"; try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; } };

const wrap = { minHeight: "100%", padding: "1.4rem clamp(1rem,3vw,2.5rem)", background: "#f6f7fb", fontFamily: 'Inter, ui-sans-serif, system-ui, "Segoe UI", sans-serif', color: "#0f172a" };
const card = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "1.1rem 1.25rem", marginBottom: 14, boxShadow: "0 8px 24px rgba(15,23,42,.05)" };
const th = { border: "1px solid #cbd5e1", background: "#f1f5f9", padding: "8px", fontSize: 12.5, fontWeight: 800, textAlign: "left" };
const td = { border: "1px solid #e2e8f0", padding: "7px 9px", fontSize: 13 };
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 800, fontSize: 12.5, cursor: "pointer" });

function csvEscape(v) { const s = String(v ?? ""); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function downloadCSV(name, rows) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TrainingRecordView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.reports || data.data || data.items || []);
      setRecords(arr.sort((a, b) => (b.payload?.savedAt || "").localeCompare(a.payload?.savedAt || "")));
    } catch (e) {
      setError("Failed to load records. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id) {
    if (!id || !window.confirm("Delete this training record?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRecords((p) => p.filter((r) => getId(r) !== id));
      if (selected && getId(selected) === id) setSelected(null);
    } catch { alert("Failed to delete."); }
  }

  function exportCSV(rec) {
    const p = rec.payload || {};
    const rows = [
      ["Training Title", p.title || ""],
      ["Category", p.category || ""],
      ["Trainer", p.trainer || ""],
      ["Date", p.date || p.reportDate || ""],
      ["Location", p.location || ""],
      ["Duration (h)", p.durationHours || ""],
      ["Objective", p.objective || ""],
      [],
      ["#", "Name", "Emp No", "Department", "Signature"],
      ...(p.attendees || []).map((a, i) => [i + 1, a.name, a.empNo, a.department, a.signature]),
    ];
    downloadCSV(`training_${p.date || p.reportDate || "record"}.csv`, rows);
  }

  const filtered = records.filter((r) => {
    const p = r.payload || {};
    const q = search.toLowerCase();
    return !q || [p.title, p.trainer, p.category, p.location].some((v) => String(v || "").toLowerCase().includes(q));
  });

  /* ── Detail ── */
  if (selected) {
    const p = selected.payload || {};
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <button onClick={() => setSelected(null)} style={{ ...btn("#e2e8f0"), color: "#334155", marginBottom: 16 }}>← Back to Records</button>
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: 21, fontWeight: 900 }}>🎓 {p.title || "Training Record"}</h2>
                <p style={{ margin: 0, color: "#64748b", fontWeight: 600, fontSize: 13 }}>
                  {p.category ? `${p.category} · ` : ""}{fmt(p.date || p.reportDate)}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => exportCSV(selected)} style={btn("#059669")}>⬇ Export CSV</button>
                {canDelete("daily") && (
                  <button onClick={() => handleDelete(getId(selected))} style={btn("#ef4444")} data-delete-action="true">🗑 Delete</button>
                )}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 16 }}>
              {[["Trainer", p.trainer], ["Location", p.location], ["Duration (h)", p.durationHours], ["Attendees", (p.attendees || []).length]].map(([k, v]) => (
                <div key={k} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase" }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{v || "—"}</div>
                </div>
              ))}
            </div>
            {p.objective && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>OBJECTIVE</div>
                <div style={{ marginTop: 4, fontSize: 14 }}>{p.objective}</div>
              </div>
            )}
          </div>

          <div style={card}>
            <h3 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800 }}>Attendees ({(p.attendees || []).length})</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr><th style={{ ...th, width: 40 }}>#</th><th style={th}>Name</th><th style={th}>Emp No</th><th style={th}>Department</th><th style={th}>Signature</th></tr>
                </thead>
                <tbody>
                  {(p.attendees || []).map((a, i) => (
                    <tr key={i}>
                      <td style={{ ...td, textAlign: "center", color: "#64748b" }}>{i + 1}</td>
                      <td style={td}>{a.name || "—"}</td>
                      <td style={td}>{a.empNo || "—"}</td>
                      <td style={td}>{a.department || "—"}</td>
                      <td style={td}>{a.signature || "—"}</td>
                    </tr>
                  ))}
                  {!(p.attendees || []).length && <tr><td style={td} colSpan={5}>No attendees.</td></tr>}
                </tbody>
              </table>
            </div>
            {p.notes && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8" }}>NOTES</div>
                <div style={{ marginTop: 4, fontSize: 14 }}>{p.notes}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── List ── */
  return (
    <div style={wrap}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>🎓 Internal Training — Records</h2>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontWeight: 600, fontSize: 13 }}>{records.length} record(s)</p>
          </div>
          <button onClick={load} style={btn("#2563eb")}>↻ Refresh</button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by title, trainer, category, location…"
          style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 14, marginBottom: 16, outline: "none" }}
        />

        {loading && <div style={{ textAlign: "center", padding: 50, color: "#64748b", fontWeight: 700 }}>⏳ Loading…</div>}
        {error && <div style={{ ...card, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontWeight: 700 }}>⚠️ {error}</div>}
        {!loading && !error && !filtered.length && (
          <div style={{ textAlign: "center", padding: 50, color: "#94a3b8", fontWeight: 700 }}>
            {search ? "No records match your search." : "No training records yet."}
          </div>
        )}

        {!loading && !error && filtered.map((rec) => {
          const p = rec.payload || {};
          return (
            <button key={getId(rec)} onClick={() => setSelected(rec)} style={{ ...card, display: "block", width: "100%", textAlign: "left", cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{p.title || "Untitled training"}</div>
                  <div style={{ color: "#64748b", fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                    {p.category ? `${p.category} · ` : ""}{p.trainer ? `${p.trainer} · ` : ""}{fmt(p.date || p.reportDate)}
                  </div>
                </div>
                <span style={{ background: "#fce7f3", color: "#be185d", borderRadius: 999, padding: "5px 12px", fontWeight: 800, fontSize: 12 }}>
                  {(p.attendees || []).length} attendees
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
