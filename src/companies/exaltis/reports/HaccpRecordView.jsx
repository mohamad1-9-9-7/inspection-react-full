// src/pages/monitor/branches/sweets/HaccpRecordView.jsx
// Browse list for the generic HACCP hub records (see HaccpRecordInput). One
// component, reused per module via the `reportType` prop — each module's data
// stays isolated by its own sweets_* type, independent of Al Mawashi.
import React, { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../../config/api";

const STATUS_TONE = {
  Compliant: { bg: "#ecfdf5", fg: "#065f46", bd: "#6ee7b7" },
  "Non-Compliant": { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5" },
  "Pending Review": { bg: "#fffbeb", fg: "#92400e", bd: "#fcd34d" },
};

async function listReports(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=5000`, {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
  return arr
    .map((r) => ({ id: r._id || r.id, ...r }))
    .filter((r) => r?.payload)
    .sort((a, b) => String(b.payload?.reportDate || "").localeCompare(String(a.payload?.reportDate || "")));
}

async function deleteReport(id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  return res.ok;
}

export default function HaccpRecordView({ reportType, title, icon }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await listReports(reportType);
    setRows(data);
    setLoading(false);
  }, [reportType]);

  useEffect(() => { refresh(); }, [refresh]);

  async function onDelete(id) {
    if (!window.confirm("Delete this record permanently?")) return;
    setBusyId(id);
    const ok = await deleteReport(id);
    if (!ok) alert("Delete failed.");
    await refresh();
    setBusyId(null);
  }

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div style={S.headIcon}>{icon}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={S.headEyebrow}>HACCP · Manual Records</div>
          <div style={S.headTitle}>{title}</div>
        </div>
        <span style={S.count}>{rows.length} record{rows.length === 1 ? "" : "s"}</span>
      </div>

      {loading ? (
        <div style={S.empty}>Loading…</div>
      ) : rows.length === 0 ? (
        <div style={S.empty}>No records yet. Use "Add Record" to upload the first one.</div>
      ) : (
        <div style={S.list}>
          {rows.map((r) => {
            const p = r.payload || {};
            const tone = STATUS_TONE[p.status] || null;
            return (
              <div key={r.id} style={S.card}>
                <div style={S.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={S.cardTitle}>{p.refTitle || "(No title)"}</div>
                    <div style={S.cardDate}>{String(p.reportDate || "").slice(0, 10) || "—"}</div>
                  </div>
                  {p.status && (
                    <span style={{ ...S.badge, background: tone?.bg, color: tone?.fg, border: `1px solid ${tone?.bd}` }}>
                      {p.status}
                    </span>
                  )}
                </div>
                {p.remarks && <div style={S.remarks}>{p.remarks}</div>}
                <div style={S.cardFoot}>
                  {p.fileUrl ? (
                    p.fileType === "application/pdf" ? (
                      <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" style={S.fileLink}>📄 {p.fileName || "View PDF"}</a>
                    ) : (
                      <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" style={S.fileLink}>
                        <img src={p.fileUrl} alt="attachment" style={S.thumb} />
                      </a>
                    )
                  ) : (
                    <span style={S.noFile}>No attachment</span>
                  )}
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => onDelete(r.id)}
                    style={S.deleteBtn}
                    data-delete-action="true"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: { width: "min(920px,100%)", margin: "0 auto", padding: "4px 4px 24px" },
  head: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  headIcon: { width: 46, height: 46, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontSize: 22, flexShrink: 0 },
  headEyebrow: { fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: ".08em" },
  headTitle: { fontSize: 19, fontWeight: 1000, color: "#0f172a", marginTop: 2 },
  count: { fontSize: 12, fontWeight: 900, color: "#0f766e", background: "#ccfbf1", borderRadius: 999, padding: "6px 12px", whiteSpace: "nowrap" },
  empty: { padding: 34, borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,.1)", textAlign: "center", color: "#64748b", fontWeight: 700 },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: { borderRadius: 14, background: "#fff", border: "1px solid rgba(15,23,42,.1)", boxShadow: "0 8px 20px rgba(15,23,42,.06)", padding: "14px 16px" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  cardTitle: { fontWeight: 900, fontSize: 15, color: "#0f172a" },
  cardDate: { fontSize: 12.5, fontWeight: 700, color: "#64748b", marginTop: 3 },
  badge: { fontSize: 11, fontWeight: 900, padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap" },
  remarks: { marginTop: 10, fontSize: 13, color: "#334155", lineHeight: 1.55, whiteSpace: "pre-wrap" },
  cardFoot: { marginTop: 12, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  fileLink: { display: "inline-flex", alignItems: "center", fontWeight: 800, fontSize: 12.5, color: "#0f766e", textDecoration: "none" },
  thumb: { height: 46, borderRadius: 8, border: "1px solid #e2e8f0", objectFit: "cover" },
  noFile: { fontSize: 12.5, color: "#94a3b8", fontWeight: 700 },
  deleteBtn: { padding: "6px 12px", borderRadius: 999, border: "none", background: "linear-gradient(135deg,#ef4444,#b91c1c)", color: "#fff", fontWeight: 800, fontSize: 11.5, cursor: "pointer" },
};
