// src/pages/monitor/branches/qcs/InternalAuditView.jsx
// QCS Internal Audit — saved audits.
//
// List: one card per audit with its compliance score, No count and open
// findings. Detail: score + counts up top, the findings as cards, then the
// checklist — opening on the problems ("No" answers) when there are any, with
// All / No / With remarks / Unanswered filters and per-section progress bars.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import { canDelete } from "../../../../utils/perms";

const TYPE = "qcs_internal_audit";

const fmt = (d) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; }
};
const shortTitle = (t) => String(t || "").replace(/^\d+\s+/, "");

const calcScore = (checklist) => {
  let yes = 0, no = 0, ok = 0, na = 0, total = 0;
  (checklist || []).forEach((g) => (g.items || []).forEach((it) => {
    total += 1;
    if (it.status === "Yes") yes += 1;
    else if (it.status === "No") no += 1;
    else if (it.status === "OK") ok += 1;
    else if (it.status === "NA") na += 1;
  }));
  const scored = yes + no + ok;
  return { yes, no, ok, na, total, blank: total - yes - no - ok - na, score: scored ? Math.round(((yes + ok) / scored) * 100) : null };
};
const scoreTone = (s) => (s == null ? "na" : s >= 80 ? "good" : s >= 60 ? "mid" : "bad");
const isOpenFinding = (r) => r?.status === "OPEN" || r?.status === "IN PROGRESS" || !r?.status;

const STATUS_LABEL = { Yes: "Yes", OK: "OK", No: "No", NA: "N/A" };
const STATUS_TONE = { Yes: "yes", OK: "ok", No: "no", NA: "na" };
const FIND_TONE = { OPEN: "no", "IN PROGRESS": "mid", CLOSED: "yes", "ON HOLD": "na" };

const FILTERS = [
  { key: "no", label: "No answers" },
  { key: "remarks", label: "With remarks" },
  { key: "blank", label: "Unanswered" },
  { key: "all", label: "All questions" },
];
const keep = (it, f) =>
  f === "all" ? true :
  f === "no" ? it.status === "No" :
  f === "remarks" ? !!String(it.remarks || "").trim() :
  !it.status;

const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .iav.iav { color:#0f172a; padding:4px; }
#root .iav.iav * { box-sizing:border-box; }
#root .iav.iav .v-head { display:flex; justify-content:space-between; align-items:flex-end; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
#root .iav.iav .v-title { font-size:${fs(22)}; font-weight:900; margin:0; }
#root .iav.iav .v-sub { font-size:${fs(13)}; font-weight:700; color:#64748b; margin-top:4px; }
#root .iav.iav .v-btn { border-radius:10px; min-height:40px; padding:0 14px; font-size:${fs(13.5)}; font-weight:800; cursor:pointer; font-family:inherit; border:1.5px solid #cbd5e1; background:#fff; color:#334155; }
#root .iav.iav .v-btn:hover { border-color:#0ea5e9; color:#0369a1; }
#root .iav.iav .v-btn.on { background:#0f766e; border-color:#0f766e; color:#fff; }
#root .iav.iav .v-btn.red { background:#fff1f2; border-color:#fecaca; color:#b91c1c; }
#root .iav.iav .v-in { width:100%; border:1.5px solid #cbd5e1; border-radius:10px; padding:10px 12px; font-size:${fs(15)}; font-family:inherit; min-height:44px; }
#root .iav.iav .v-in:focus { outline:none; border-color:#0ea5e9; box-shadow:0 0 0 3px rgba(14,165,233,.15); }
#root .iav.iav .v-state { padding:40px 16px; text-align:center; color:#64748b; font-weight:700; font-size:${fs(15)}; background:#fff; border:1.5px dashed #cbd5e1; border-radius:14px; }
#root .iav.iav .v-state.err { color:#b91c1c; border-color:#fecaca; background:#fff7f7; }

#root .iav.iav .v-pill { display:inline-block; font-size:${fs(12.5)}; font-weight:800; border-radius:999px; padding:3px 10px; }
#root .iav.iav .t-yes, #root .iav.iav .t-good { background:#dcfce7; color:#15803d; }
#root .iav.iav .t-ok { background:#dbeafe; color:#1d4ed8; }
#root .iav.iav .t-no, #root .iav.iav .t-bad { background:#fee2e2; color:#b91c1c; }
#root .iav.iav .t-na { background:#f1f5f9; color:#475569; }
#root .iav.iav .t-mid { background:#fef9c3; color:#a16207; }

/* list */
#root .iav.iav .v-list { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(360px,100%),1fr)); gap:12px; margin-top:12px; }
#root .iav.iav .v-card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; cursor:pointer; display:flex; gap:14px; align-items:center; transition:border-color .15s, box-shadow .15s; text-align:left; font-family:inherit; width:100%; }
#root .iav.iav .v-card:hover { border-color:#7dd3fc; box-shadow:0 8px 20px rgba(15,23,42,.07); }
#root .iav.iav .v-ring { flex-shrink:0; width:64px; height:64px; border-radius:50%; display:grid; place-items:center; font-size:${fs(16)}; font-weight:900; }
#root .iav.iav .v-ring.good { background:conic-gradient(#16a34a var(--p), #e2e8f0 0); }
#root .iav.iav .v-ring.mid  { background:conic-gradient(#ca8a04 var(--p), #e2e8f0 0); }
#root .iav.iav .v-ring.bad  { background:conic-gradient(#dc2626 var(--p), #e2e8f0 0); }
#root .iav.iav .v-ring.na   { background:#e2e8f0; }
#root .iav.iav .v-ring > span { width:50px; height:50px; border-radius:50%; background:#fff; display:grid; place-items:center; }
#root .iav.iav .v-card-tx { flex:1; min-width:0; }
#root .iav.iav .v-card-d { font-size:${fs(16)}; font-weight:900; }
#root .iav.iav .v-card-m { font-size:${fs(13)}; font-weight:700; color:#64748b; margin-top:3px; }
#root .iav.iav .v-card-p { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }

/* detail */
#root .iav.iav .v-top { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:16px; display:flex; gap:18px; align-items:center; flex-wrap:wrap; margin-bottom:12px; }
#root .iav.iav .v-top .v-ring { width:92px; height:92px; font-size:${fs(22)}; }
#root .iav.iav .v-top .v-ring > span { width:72px; height:72px; }
#root .iav.iav .v-meta { flex:1; min-width:240px; display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; }
#root .iav.iav .v-meta div { background:#f8fafc; border:1px solid #eef2f7; border-radius:10px; padding:8px 12px; }
#root .iav.iav .v-meta b { display:block; font-size:${fs(11.5)}; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
#root .iav.iav .v-meta span { font-size:${fs(15)}; font-weight:800; }
#root .iav.iav .v-sec-t { font-size:${fs(15)}; font-weight:900; margin:18px 0 10px; display:flex; align-items:center; gap:8px; }
#root .iav.iav .v-recs { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr)); gap:10px; }
#root .iav.iav .v-rec { background:#fff; border:1px solid #e2e8f0; border-left:5px solid #94a3b8; border-radius:12px; padding:12px 14px; }
#root .iav.iav .v-rec.no { border-left-color:#dc2626; }
#root .iav.iav .v-rec.mid { border-left-color:#ca8a04; }
#root .iav.iav .v-rec.yes { border-left-color:#16a34a; }
#root .iav.iav .v-rec-f { font-size:${fs(15)}; font-weight:800; white-space:pre-wrap; line-height:1.5; margin:6px 0; }
#root .iav.iav .v-rec-a { font-size:${fs(14)}; color:#334155; white-space:pre-wrap; line-height:1.5; }
#root .iav.iav .v-rec-m { font-size:${fs(12.5)}; font-weight:700; color:#64748b; margin-top:8px; display:flex; gap:12px; flex-wrap:wrap; }
#root .iav.iav .v-filters { display:flex; gap:6px; flex-wrap:wrap; }
#root .iav.iav .v-grp { background:#fff; border:1px solid #e2e8f0; border-radius:14px; margin-bottom:10px; overflow:hidden; }
#root .iav.iav .v-grp-h { display:flex; align-items:center; gap:12px; padding:12px 14px; cursor:pointer; background:#f8fafc; border:0; width:100%; font-family:inherit; text-align:left; }
#root .iav.iav .v-grp-n { font-size:${fs(15)}; font-weight:900; flex:1; min-width:0; }
#root .iav.iav .v-grp-bar { width:120px; height:8px; background:#e2e8f0; border-radius:999px; overflow:hidden; flex-shrink:0; }
#root .iav.iav .v-grp-bar i { display:block; height:100%; background:#16a34a; }
#root .iav.iav .v-q { display:flex; gap:12px; padding:10px 14px; border-top:1px solid #f1f5f9; align-items:flex-start; }
#root .iav.iav .v-q.no { background:#fffafa; }
#root .iav.iav .v-code { flex-shrink:0; font-size:${fs(12)}; font-weight:900; color:#0369a1; background:#e0f2fe; border-radius:8px; padding:3px 8px; margin-top:2px; }
#root .iav.iav .v-q-tx { flex:1; min-width:0; font-size:${fs(15)}; line-height:1.55; white-space:pre-wrap; }
#root .iav.iav .v-q-r { font-size:${fs(14)}; color:#b91c1c; font-weight:700; margin-top:4px; white-space:pre-wrap; }
#root .iav.iav .v-q-r.plain { color:#475569; }
#root .iav.iav .v-q .v-pill { flex-shrink:0; min-width:48px; text-align:center; }
@media (max-width: 640px) { #root .iav.iav .v-grp-bar { display:none; } }
`;

function Ring({ score }) {
  const tone = scoreTone(score);
  return (
    <div className={`v-ring ${tone}`} style={{ "--p": `${score || 0}%` }}>
      <span>{score == null ? "—" : `${score}%`}</span>
    </div>
  );
}

export default function InternalAuditView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [closed, setClosed] = useState({});

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_BASE}/api/reports?reporter=qcs&type=${TYPE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.reports || data.data || []);
      const normalized = arr.map((r, i) => ({ ...r, _id: r._id || r.id || `rec-${i}` }));
      normalized.sort((a, b) =>
        String(b.payload?.headRow?.dateOfAudit || "").localeCompare(String(a.payload?.headRow?.dateOfAudit || "")) ||
        (b.payload?.savedAt || 0) - (a.payload?.savedAt || 0));
      setRecords(normalized);
    } catch {
      setError("Could not load the audits. Press Refresh to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this audit permanently?")) return;
    try {
      setDeleting(id);
      const res = await fetch(`${API_BASE}/api/reports/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setRecords((p) => p.filter((r) => r._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch {
      alert("Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  const open = (rec) => {
    const sc = calcScore(rec.payload?.checklist);
    setFilter(sc.no > 0 ? "no" : "all"); // open on the problems when there are any
    setClosed({});
    setSelected(rec);
    window.scrollTo({ top: 0 });
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const p = r.payload || {};
      return [p.headRow?.conductedBy, p.headRow?.area, p.headRow?.dateOfAudit, fmt(p.headRow?.dateOfAudit), p.footer?.auditorName]
        .some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [records, search]);

  /* ================= LIST ================= */
  if (!selected) {
    return (
      <div className="iav" dir="ltr" lang="en">
        <style>{CSS}</style>
        <div className="v-head">
          <div>
            <h2 className="v-title">Internal Audits</h2>
            <div className="v-sub">QCS · FS-QA/INA-QCS-W/01 · {records.length} audit(s)</div>
          </div>
          <button type="button" className="v-btn" onClick={fetchRecords} disabled={loading}>{loading ? "Loading…" : "↻ Refresh"}</button>
        </div>
        <input className="v-in" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search by date, area, auditor…" />

        {loading && <div className="v-state" style={{ marginTop: 12 }}>Loading audits…</div>}
        {!loading && error && <div className="v-state err" style={{ marginTop: 12 }}>⚠️ {error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="v-state" style={{ marginTop: 12 }}>{search ? "No audits match your search." : "No audits saved yet."}</div>
        )}

        <div className="v-list">
          {!loading && !error && filtered.map((rec) => {
            const p = rec.payload || {};
            const h = p.headRow || {};
            const sc = calcScore(p.checklist);
            const openF = (p.auditRecommendation || []).filter(isOpenFinding).length;
            return (
              <div key={rec._id} className="v-card" role="button" tabIndex={0}
                onClick={() => open(rec)} onKeyDown={(e) => { if (e.key === "Enter") open(rec); }}>
                <Ring score={sc.score} />
                <div className="v-card-tx">
                  <div className="v-card-d">{fmt(h.dateOfAudit)}{h.area ? ` · ${h.area}` : ""}</div>
                  <div className="v-card-m">{h.conductedBy ? `By ${h.conductedBy}` : "Auditor not recorded"}</div>
                  <div className="v-card-p">
                    {sc.no > 0 && <span className="v-pill t-no">{sc.no} No</span>}
                    {openF > 0 && <span className="v-pill t-mid">{openF} open finding{openF > 1 ? "s" : ""}</span>}
                    {sc.no === 0 && openF === 0 && <span className="v-pill t-yes">No issues</span>}
                    <span className="v-pill t-na">{sc.total - sc.blank}/{sc.total} answered</span>
                  </div>
                </div>
                {canDelete("daily") && (
                  <button type="button" className="v-btn red" data-delete-action="true" disabled={deleting === rec._id}
                    onClick={(e) => { e.stopPropagation(); handleDelete(rec._id); }}>
                    {deleting === rec._id ? "…" : "Delete"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ================= DETAIL ================= */
  const p = selected.payload || {};
  const h = p.headRow || {};
  const hTop = p.headerTop || {};
  const ft = p.footer || {};
  const sc = calcScore(p.checklist);
  const recs = p.auditRecommendation || [];
  const groups = (p.checklist || [])
    .map((g, gi) => ({ ...g, gi, shown: (g.items || []).filter((it) => keep(it, filter)) }))
    .filter((g) => filter === "all" || g.shown.length > 0);
  const counts = { no: sc.no, remarks: (p.checklist || []).reduce((n, g) => n + (g.items || []).filter((it) => String(it.remarks || "").trim()).length, 0), blank: sc.blank, all: sc.total };

  return (
    <div className="iav" dir="ltr" lang="en">
      <style>{CSS}</style>
      <div className="v-head">
        <div>
          <button type="button" className="v-btn" onClick={() => setSelected(null)}>← All audits</button>
          <h2 className="v-title" style={{ marginTop: 10 }}>Internal Audit — {fmt(h.dateOfAudit)}</h2>
          <div className="v-sub">{hTop.documentNo || "FS-QA/INA-QCS-W/01"} · Issue {hTop.issueNo || "01"} · Rev {hTop.revisionNo || "00"}</div>
        </div>
      </div>

      <div className="v-top">
        <Ring score={sc.score} />
        <div className="v-meta">
          <div><b>Area</b><span>{h.area || "—"}</span></div>
          <div><b>Conducted by</b><span>{h.conductedBy || "—"}</span></div>
          <div><b>Verified by</b><span>{h.verifiedBy ? <SignatureName name={h.verifiedBy} underline={false} inline /> : "—"}</span></div>
          <div><b>Auditor</b><span>{ft.auditorName || "—"}{ft.auditorSignDate ? ` · ${fmt(ft.auditorSignDate)}` : ""}</span></div>
        </div>
        <div className="v-card-p" style={{ width: "100%" }}>
          <span className="v-pill t-yes">Yes {sc.yes}</span>
          <span className="v-pill t-ok">OK {sc.ok}</span>
          <span className="v-pill t-no">No {sc.no}</span>
          <span className="v-pill t-na">N/A {sc.na}</span>
          {sc.blank > 0 && <span className="v-pill t-na">Unanswered {sc.blank}</span>}
        </div>
      </div>

      <div className="v-sec-t">📌 Findings &amp; actions <span className="v-pill t-na">{recs.length}</span></div>
      {recs.length === 0 ? <div className="v-state">No findings were recorded for this audit.</div> : (
        <div className="v-recs">
          {recs.map((r, i) => {
            const tone = FIND_TONE[r.status] || "na";
            return (
              <div key={i} className={`v-rec ${tone}`}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <b style={{ color: "#64748b" }}>#{i + 1}{r.type ? ` · ${r.type}` : ""}</b>
                  <span className={`v-pill t-${tone}`}>{r.status || "—"}</span>
                </div>
                <div className="v-rec-f">{r.finding || "—"}</div>
                {r.action && <div className="v-rec-a"><b>Action:</b> {r.action}</div>}
                <div className="v-rec-m">
                  <span>👤 {r.resp || "No owner"}</span>
                  <span>📅 {r.targetDate ? fmt(r.targetDate) : "No target date"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="v-sec-t" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <span>✅ Checklist</span>
        <div className="v-filters">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={`v-btn ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && <div className="v-state">Nothing to show for this filter.</div>}
      {groups.map((g) => {
        const items = g.items || [];
        const good = items.filter((it) => it.status === "Yes" || it.status === "OK").length;
        const bad = items.filter((it) => it.status === "No").length;
        const scored = items.filter((it) => it.status && it.status !== "NA").length;
        const isClosed = closed[g.gi];
        return (
          <div key={g.gi} className="v-grp">
            <button type="button" className="v-grp-h" onClick={() => setClosed((c) => ({ ...c, [g.gi]: !c[g.gi] }))} aria-expanded={!isClosed}>
              <span className="v-grp-n">{shortTitle(g.title)}</span>
              {bad > 0 && <span className="v-pill t-no">{bad} No</span>}
              <span className="v-grp-bar" title={`${good} of ${scored} compliant`}><i style={{ width: `${scored ? (good / scored) * 100 : 0}%` }} /></span>
              <span style={{ color: "#94a3b8" }}>{isClosed ? "▼" : "▲"}</span>
            </button>
            {!isClosed && g.shown.map((it) => (
              <div key={it.code} className={`v-q ${it.status === "No" ? "no" : ""}`}>
                <span className="v-code">{it.code}</span>
                <div className="v-q-tx">
                  {it.text}
                  {String(it.remarks || "").trim() && <div className={`v-q-r ${it.status === "No" ? "" : "plain"}`}>💬 {it.remarks}</div>}
                </div>
                <span className={`v-pill t-${STATUS_TONE[it.status] || "na"}`}>{STATUS_LABEL[it.status] || "—"}</span>
              </div>
            ))}
          </div>
        );
      })}

      {p.savedAt && <div className="v-sub" style={{ textAlign: "right", marginTop: 12 }}>Saved {new Date(p.savedAt).toLocaleString("en-GB")}</div>}
    </div>
  );
}
