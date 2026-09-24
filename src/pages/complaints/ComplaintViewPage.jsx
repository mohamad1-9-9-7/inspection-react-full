// src/pages/complaints/ComplaintViewPage.jsx
// -----------------------------------------------------------------------------
// Full-page reader for a single complaint. Reached at:
//   /returns/complaints/view/:id
// Shows every field, the photos, an email-history section (audit log of all
// previous sends of this record) and the same set of actions the list card has.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmailSendModal from "../shared/EmailSendModal";
import EmailSendHistory from "../shared/EmailSendHistory";
import { thumbUrl, deleteImage } from "../../utils/imageUpload";
import { COMPLAINTS_CSS } from "./complaintsCSS";
import {
  STATUSES,
  apiDeleteComplaint, apiGetComplaint, apiUpdateComplaint,
  catById, dmy, sevById, splitEmails, statusById, targetById,
  targetKeyOf, targetLabelOf, rememberRecipients, REPORT_TYPE,
  useComplaintCategories,
} from "./complaintsCore";
import {
  buildEmailHtml, buildComplaintText, complaintEmailSubject, generateComplaintPdf,
} from "./complaintsEmail";

export default function ComplaintViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(null);
  const [refreshLog, setRefreshLog] = useState(0);
  /* Loads admin-added reasons into the registry so their chips resolve here
     (the re-render on load recomputes the chip list below). */
  useComplaintCategories();

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const rec = await apiGetComplaint(id);
      setComplaint(rec);
    } catch (e) {
      setErr(e?.message || "Failed to load the record.");
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (status) => {
    if (!complaint || complaint.status === status) return;
    try {
      await apiUpdateComplaint(complaint.id, { ...complaint, status });
      await load();
    } catch (e) {
      alert(`Failed to update status: ${e?.message || e}`);
    }
  };

  const onDelete = async () => {
    if (!complaint?.id) return;
    if (!window.confirm(`Permanently delete the complaint against ${targetLabelOf(complaint)}?`)) return;
    try {
      await apiDeleteComplaint(complaint.id);
      for (const url of complaint.images || []) {
        try { await deleteImage(url); } catch { /* ignore */ }
      }
      navigate(`/returns/complaints/list/${complaint.target}`);
    } catch (e) {
      alert(`Delete failed: ${e?.message || e}`);
    }
  };

  const cloneComplaint = () => {
    if (!complaint) return;
    try {
      sessionStorage.setItem(
        "qaComplaints_prefill_v1",
        JSON.stringify({
          target: complaint.target,
          branch: complaint.branch, customBranch: complaint.customBranch, supplier: complaint.supplier,
          categories: Array.from(new Set([...(complaint.categories || []), "REPEATED"])),
          severity: complaint.severity,
          subject: complaint.subject ? `Repeat: ${complaint.subject}` : "",
          description: complaint.description,
          items: complaint.items,
        })
      );
    } catch {}
    navigate(`/returns/complaints/new/${complaint.target}?repeat=1`);
  };

  const emailConfig = useMemo(() => ({
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
    /* Real calendar date + record ref for the send log (reportDate is a unique
       non-date key that the DATE column would reject). */
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
        setRefreshLog((k) => k + 1);
      } catch { /* keep success */ }
    },
  }), [sending, load]);

  if (loading) {
    return (
      <div className="qc qc">
        <style>{COMPLAINTS_CSS}</style>
        <div className="qc-shell"><div className="qc-empty">Loading…</div></div>
      </div>
    );
  }
  if (err || !complaint) {
    return (
      <div className="qc qc">
        <style>{COMPLAINTS_CSS}</style>
        <div className="qc-shell">
          <div className="qc-alert err">⚠️ {err || "Record not found."}</div>
          <button className="qc-btn ghost" onClick={() => navigate(-1)}>⬅ Back</button>
        </div>
      </div>
    );
  }

  const cats = complaint.categories.map((id) => catById(id)).filter(Boolean);
  const sev = sevById(complaint.severity);
  const st = statusById(complaint.status);
  const tg = targetById(complaint.target);
  const items = complaint.items.filter((r) => r.itemCode || r.productName || r.quantity);

  return (
    <div className="qc qc">
      <style>{COMPLAINTS_CSS}</style>
      <div className="qc-shell">
        <header className="qc-hero">
          <div className="qc-hero-top">
            <div>
              <h1 className="qc-hero-title">{tg.icon} Complaint against: {targetLabelOf(complaint)}</h1>
              <p className="qc-hero-sub">
                {dmy(complaint.complaintDate)} · Ref: <code style={{ fontFamily: "monospace" }}>{complaint.refNo || "—"}</code>
              </p>
            </div>
            <div className="qc-hero-actions">
              <button className="qc-btn ghost" onClick={() => navigate(-1)}>⬅ Back</button>
              <button className="qc-btn ghost" onClick={() => navigate(`/returns/complaints/list/${complaint.target}`)}>📚 Log</button>
            </div>
          </div>
        </header>

        <div className="qc-page qc-view">
          <h3 dir="auto">{complaint.subject || "—"}</h3>

          <p>
            <b>Severity:</b> <span className="qc-sev" style={{ background: sev.tone }}>{sev.en}</span>
            &nbsp;·&nbsp; <b>Current status:</b>{" "}
            <span className="qc-status" style={{ background: st.tone }}>{st.en}</span>
          </p>

          <div className="qc-status-bar">
            <span style={{ fontSize: 12, fontWeight: 900, color: "#334155" }}>Change status:</span>
            {STATUSES.map((s) => (
              <button
                key={s.id}
                className={complaint.status === s.id ? "on" : ""}
                style={{ background: s.tone }}
                onClick={() => changeStatus(s.id)}
                title={s.en}
              >
                {s.en}
              </button>
            ))}
          </div>

          <p style={{ marginTop: 14 }}>
            <b>Reasons:</b>{" "}
            {cats.length ? cats.map((c) => (
              <span key={c.id} className="qc-chip" style={{ background: c.tone + "22", color: c.tone, border: `1px solid ${c.tone}55` }}>
                {c.icon} {c.en}
              </span>
            )) : "—"}
          </p>

          {complaint.description && (
            <>
              <p style={{ marginTop: 10 }}><b>Details:</b></p>
              <div className="qc-view-desc" dir="auto">{complaint.description}</div>
            </>
          )}

          {items.length > 0 && (
            <div className="qc-block">
              <h4><span>📦 Items</span></h4>
              <table className="qc-items">
                <thead>
                  <tr>
                    <th>#</th><th>Code</th><th>Item</th><th>Qty</th><th>Expiry</th><th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: "center" }}>{i + 1}</td>
                      <td style={{ fontFamily: "monospace" }}>{r.itemCode || "—"}</td>
                      <td>{r.productName || "—"}</td>
                      <td style={{ textAlign: "center" }}>{r.quantity} {r.qtyUnit === "أخرى" || r.qtyUnit === "Other" ? r.customQtyUnit : r.qtyUnit}</td>
                      <td>{r.expiry || "—"}</td>
                      <td>{r.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {complaint.images.length > 0 && (
            <div className="qc-block">
              <h4><span>📷 Photos</span></h4>
              <div className="qc-photos">
                {complaint.images.map((src, i) => (
                  <a key={`${src}_${i}`} href={src} target="_blank" rel="noopener noreferrer" className="qc-thumb">
                    <img src={thumbUrl(src, 240)} alt={`#${i + 1}`} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {complaint.notes && (
            <div className="qc-block">
              <h4><span>📝 Internal notes</span></h4>
              <div className="qc-view-desc">{complaint.notes}</div>
            </div>
          )}

          <div className="qc-block" style={{ marginTop: 12 }}>
            <EmailSendHistory
              reportType={REPORT_TYPE}
              reportRef={complaint.refNo}
              reportDate={complaint.complaintDate}
              refreshKey={refreshLog}
              onSendClick={() => setSending(complaint)}
            />
          </div>

          <div className="qc-page-actions">
            <button className="qc-btn gray" onClick={() => navigate(-1)}>⬅ Back</button>
            <button className="qc-btn violet" onClick={cloneComplaint}>🔁 Log a repeat</button>
            <button className="qc-btn red" onClick={onDelete}>🗑 Delete</button>
            <button className="qc-btn teal" onClick={() => navigate(`/returns/complaints/edit/${complaint.id}`)}>✏️ Edit</button>
            <button className="qc-btn primary" onClick={() => setSending(complaint)}>📨 Email</button>
          </div>
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
