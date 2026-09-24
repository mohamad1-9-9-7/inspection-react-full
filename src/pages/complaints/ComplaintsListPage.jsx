// src/pages/complaints/ComplaintsListPage.jsx
// -----------------------------------------------------------------------------
// Full-page log for one target only (branch OR supplier). Reads the target from
// the /returns/complaints/list/:target route param.
//
// Actions per card: 👁 view · ✏️ edit · 📨 send by e-mail · ✅ change status ·
//                   🔁 clone (mark as repeat) · 🗑 delete
// Repeat detector: any party that has ≥2 complaints gets a "🔁 تكرار" badge.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmailSendModal from "../shared/EmailSendModal";
import ComplaintsRadar from "./ComplaintsRadar";
import { deleteImage } from "../../utils/imageUpload";
import { COMPLAINTS_CSS } from "./complaintsCSS";
import {
  STATUSES, TARGETS,
  apiDeleteComplaint, apiListComplaints, apiUpdateComplaint,
  catById, dmy, sevById, splitEmails, statusById, targetById,
  targetKeyOf, targetLabelOf, rememberRecipients,
  REPORT_TYPE, useComplaintCategories,
} from "./complaintsCore";
import {
  buildEmailHtml, buildComplaintText, complaintEmailSubject, generateComplaintPdf,
} from "./complaintsEmail";

/* Small popover to change status right on the card. */
function StatusMenu({ current, onPick, onClose }) {
  const boxRef = useRef(null);
  useEffect(() => {
    const off = (e) => {
      if (!boxRef.current?.contains(e.target)) onClose?.();
    };
    setTimeout(() => document.addEventListener("mousedown", off), 0);
    return () => document.removeEventListener("mousedown", off);
  }, [onClose]);
  return (
    <div
      ref={boxRef}
      style={{
        position: "absolute", zIndex: 12, background: "#fff", border: "1px solid #dbe4ec",
        borderRadius: 12, boxShadow: "0 20px 40px rgba(15,23,42,.18)", padding: 8, gap: 4,
        display: "flex", flexDirection: "column", minWidth: 160,
      }}
    >
      {STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s.id)}
          style={{
            border: 0, cursor: "pointer", padding: "8px 12px", borderRadius: 8, textAlign: "start",
            fontFamily: "inherit", fontWeight: 900, color: "#fff", background: s.tone,
            opacity: current === s.id ? 1 : .78,
          }}
        >
          {current === s.id ? "✓ " : ""}{s.en}
        </button>
      ))}
    </div>
  );
}

export default function ComplaintsListPage() {
  const { target: routeTarget } = useParams();
  const navigate = useNavigate();
  const target = routeTarget === "supplier" ? "supplier" : "branch";
  const tg = targetById(target);
  const { categories: allCategories } = useComplaintCategories();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [fParty, setFParty] = useState("");
  const [fCategory, setFCategory] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [q, setQ] = useState("");

  const [statusMenuFor, setStatusMenuFor] = useState(null);
  const [sending, setSending] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setLoadErr("");
    try {
      const list = (await apiListComplaints()).filter((r) => r.target === target);
      list.sort((a, b) => {
        const da = a.complaintDate || "";
        const db = b.complaintDate || "";
        if (db !== da) return db.localeCompare(da);
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });
      setRows(list);
    } catch (e) {
      setLoadErr(e?.message || "Failed to load complaints.");
    } finally { setLoading(false); }
  }, [target]);

  useEffect(() => { load(); }, [load]);

  /* Count complaints per party — powers the "🔁 تكرار" chip on cards. */
  const partyCounts = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const k = targetLabelOf(r);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }, [rows]);

  const partyOptions = useMemo(() => {
    const set = new Set();
    for (const r of rows) {
      const lbl = targetLabelOf(r);
      if (lbl && lbl !== "—") set.add(lbl);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [rows]);

  const filtered = useMemo(() => {
    const qs = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (fParty && targetLabelOf(r) !== fParty) return false;
      if (fCategory && !r.categories.includes(fCategory)) return false;
      if (fStatus && r.status !== fStatus) return false;
      if (fFrom && r.complaintDate < fFrom) return false;
      if (fTo && r.complaintDate > fTo) return false;
      if (qs) {
        const hay = [
          r.refNo, r.subject, r.description, targetLabelOf(r),
          ...(r.items || []).map((it) => `${it.itemCode} ${it.productName} ${it.remarks}`),
        ].join(" ").toLowerCase();
        if (!hay.includes(qs)) return false;
      }
      return true;
    });
  }, [rows, fParty, fCategory, fStatus, fFrom, fTo, q]);

  const totals = useMemo(() => ({
    all: rows.length,
    sent: rows.filter((r) => r.status === "SENT").length,
    draft: rows.filter((r) => r.status === "DRAFT").length,
    ack: rows.filter((r) => r.status === "ACKNOWLEDGED").length,
    closed: rows.filter((r) => r.status === "CLOSED").length,
    critical: rows.filter((r) => r.severity === "HIGH").length,
  }), [rows]);

  const onDelete = async (row) => {
    if (!row?.id) return;
    if (!window.confirm(`Permanently delete the complaint against ${targetLabelOf(row)} (${dmy(row.complaintDate)})?`)) return;
    try {
      await apiDeleteComplaint(row.id);
      for (const url of row.images || []) {
        try { await deleteImage(url); } catch { /* ignore */ }
      }
      await load();
    } catch (e) {
      alert(`Delete failed: ${e?.message || e}`);
    }
  };

  const changeStatus = async (row, status) => {
    setStatusMenuFor(null);
    if (row.status === status) return;
    try {
      await apiUpdateComplaint(row.id, { ...row, status });
      await load();
    } catch (e) {
      alert(`Failed to update status: ${e?.message || e}`);
    }
  };

  const cloneComplaint = (row) => {
    /* Repeat handling: pass the previous complaint through the URL so the form
       pre-fills its party + REPEATED category. */
    try {
      sessionStorage.setItem(
        "qaComplaints_prefill_v1",
        JSON.stringify({
          target: row.target,
          branch: row.branch, customBranch: row.customBranch, supplier: row.supplier,
          categories: Array.from(new Set([...(row.categories || []), "REPEATED"])),
          severity: row.severity,
          subject: row.subject ? `Repeat: ${row.subject}` : "",
          description: row.description,
          items: row.items,
        })
      );
    } catch {}
    navigate(`/returns/complaints/new/${row.target}?repeat=1`);
  };

  /* ═════ Email sending — same modal used everywhere ═════ */
  const emailConfig = {
    reportTitle: "Quality Complaint",
    reportType: REPORT_TYPE,
    allowServerSend: true,
    /* Subject = the "Short subject" typed on the entry page, word for word. */
    getSubject: complaintEmailSubject,
    generatePdf: async (rep) => generateComplaintPdf(rep || sending),
    buildHtml: buildEmailHtml,
    buildText: buildComplaintText,
    getImages: (rep) => (rep?.images || []).filter(Boolean),
    getCertificate: () => null,
    getSummary: (rep) => ({
      fields: [
        { label: "Date", value: dmy(rep?.complaintDate) || "—" },
        { label: "Target", value: targetLabelOf(rep) },
        { label: "Ref", value: rep?.refNo || "—" },
        { label: "Severity", value: sevById(rep?.severity).en },
        { label: "Items", value: String((rep?.items || []).filter((r) => r.itemCode || r.productName || r.quantity).length) },
      ],
    }),
    getDefaultTo: (rep) => splitEmails(rep?.recipients),
    getDefaultCc: (rep) => splitEmails(rep?.cc),
    /* The record's reportDate is a unique non-date key; the send log needs the
       real calendar date so it isn't dropped by the DATE column. */
    getReportDate: (rep) => rep?.complaintDate || null,
    getReportRef: (rep) => rep?.refNo || null,
    onSent: async ({ to = [], cc = [] } = {}) => {
      const cur = sending;
      if (!cur) return;
      try {
        const key = targetKeyOf(cur);
        if (key && to.length) rememberRecipients(key, to);
        const patched = {
          ...cur, status: "SENT",
          sentAt: new Date().toISOString(),
          recipients: to.join(", "),
          cc: cc.join(", "),
        };
        if (cur.id) await apiUpdateComplaint(cur.id, patched);
        await load();
      } catch { /* keep the success toast even if the follow-up fails */ }
    },
  };

  return (
    <div className="qc qc">
      <style>{COMPLAINTS_CSS}</style>
      <div className="qc-shell">
        <header className="qc-hero">
          <div className="qc-hero-top">
            <div>
              <h1 className="qc-hero-title">{tg.icon} {tg.en} · Complaints Log</h1>
              <p className="qc-hero-sub">
                All QA complaints directed at {target === "supplier" ? "suppliers" : "branches"}.
                Each complaint supports: view, edit, status change, email, or an instant repeat.
              </p>
            </div>
            <div className="qc-hero-actions">
              <button className="qc-btn ghost" onClick={() => navigate("/returns/complaints/browse")}>⬅ Other type</button>
              <button className="qc-btn primary" onClick={() => navigate(`/returns/complaints/new/${target}`)}>➕ New complaint</button>
            </div>
          </div>
        </header>

        <div className="qc-stats">
          <div className="qc-stat" style={{ "--tone": "#0f172a" }}><b className="qc-num">{totals.all}</b><span>Total</span></div>
          <div className="qc-stat" style={{ "--tone": "#ef4444" }}><b className="qc-num">{totals.critical}</b><span>🔴 High severity</span></div>
          <div className="qc-stat" style={{ "--tone": "#64748b" }}><b className="qc-num">{totals.draft}</b><span>Drafts</span></div>
          <div className="qc-stat" style={{ "--tone": "#2563eb" }}><b className="qc-num">{totals.sent}</b><span>Sent</span></div>
          <div className="qc-stat" style={{ "--tone": "#0f766e" }}><b className="qc-num">{totals.ack}</b><span>Acknowledged</span></div>
          <div className="qc-stat" style={{ "--tone": "#334155" }}><b className="qc-num">{totals.closed}</b><span>Closed</span></div>
        </div>

        {rows.length > 0 && (
          <ComplaintsRadar rows={rows} target={target} onPickParty={(p) => setFParty(p)} />
        )}

        <div className="qc-toolbar">
          <div>
            <label>{target === "supplier" ? "Supplier" : "Branch"}</label>
            <select value={fParty} onChange={(e) => setFParty(e.target.value)}>
              <option value="">All</option>
              {partyOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label>Reason</label>
            <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
              <option value="">All</option>
              {allCategories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.en}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.en}</option>)}
            </select>
          </div>
          <div>
            <label>From date</label>
            <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} />
          </div>
          <div>
            <label>To date</label>
            <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} />
          </div>
          <div className="qc-search">
            <label>Search</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Subject, ref, item code…" />
          </div>
        </div>

        <div className="qc-list">
          {loadErr && <div className="qc-alert err" style={{ margin: 10 }}>⚠️ {loadErr}</div>}
          {loading ? (
            <div className="qc-empty">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="qc-empty">
              {rows.length === 0
                ? `No complaints against ${target === "supplier" ? "suppliers" : "branches"} yet. Click “New complaint” to start.`
                : "No results match the filters."}
            </div>
          ) : (
            <div className="qc-case-grid">
              {filtered.map((row) => {
                const sev = sevById(row.severity);
                const st = statusById(row.status);
                const partyLabel = targetLabelOf(row);
                const repeatCount = partyCounts.get(partyLabel) || 0;
                return (
                  <article className="qc-case" key={row.id || `${row.complaintDate}-${row.subject}`}>
                    <div className="qc-case-top">
                      <span className="qc-case-party">{partyLabel} · {dmy(row.complaintDate)}</span>
                      <span className="qc-case-ref">{row.refNo || "—"}</span>
                    </div>
                    <h3>{row.subject || "Untitled"}</h3>
                    <div className="qc-case-cats">
                      {row.categories.map((id) => {
                        const category = catById(id);
                        if (!category) return null;
                        return (
                          <span key={id} className="qc-chip"
                            style={{ background: category.tone + "18", color: category.tone, border: `1px solid ${category.tone}44` }}>
                            {category.icon} {category.en}
                          </span>
                        );
                      })}
                      {repeatCount > 1 && (
                        <span className="qc-case-repeat" title="Complaints against this party">
                          🔁 Repeat ×{repeatCount}
                        </span>
                      )}
                    </div>
                    <div className="qc-case-bottom">
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", position: "relative" }}>
                        <span className="qc-sev" style={{ background: sev.tone }}>{sev.en}</span>
                        <button
                          type="button"
                          className="qc-status"
                          style={{ background: st.tone, border: 0, cursor: "pointer" }}
                          title="Change status"
                          onClick={() => setStatusMenuFor(statusMenuFor === row.id ? null : row.id)}
                        >
                          {st.en} ▾
                        </button>
                        {statusMenuFor === row.id && (
                          <StatusMenu
                            current={row.status}
                            onPick={(s) => changeStatus(row, s)}
                            onClose={() => setStatusMenuFor(null)}
                          />
                        )}
                      </div>
                      <div className="qc-actions-cell">
                        <button className="qc-btn blue" title="View complaint" onClick={() => navigate(`/returns/complaints/view/${row.id}`)}><span className="qc-act-ic">👁</span> View</button>
                        <button className="qc-btn teal" title="Edit complaint" onClick={() => navigate(`/returns/complaints/edit/${row.id}`)}><span className="qc-act-ic">✏️</span> Edit</button>
                        <button className="qc-btn primary" title="Send by email" onClick={() => setSending(row)}><span className="qc-act-ic">📨</span> Email</button>
                        <button className="qc-btn violet" title="Log a repeat from this complaint" onClick={() => cloneComplaint(row)}><span className="qc-act-ic">🔁</span> Repeat</button>
                        <button className="qc-btn red" title="Delete complaint" onClick={() => onDelete(row)}><span className="qc-act-ic">🗑</span> Delete</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <EmailSendModal
        open={!!sending}
        onClose={() => setSending(null)}
        payload={sending}
        config={emailConfig}
      />
    </div>
  );
}
