// src/pages/complaints/ComplaintFormPage.jsx
// -----------------------------------------------------------------------------
// Full-page complaint editor. One route serves three purposes, decided by the
// route params:
//   /returns/complaints/new/:target      → new complaint (target=branch|supplier)
//   /returns/complaints/edit/:id         → edit an existing complaint
//
// Data goes to the server the moment you press "Save". No modal, no popup.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import EmailSendModal from "../shared/EmailSendModal";
import { COMPLAINTS_CSS } from "./complaintsCSS";
import {
  BRANCHES, STATUSES, TARGETS,
  apiCreateComplaint, apiGetComplaint, apiUpdateComplaint,
  dmy, emptyComplaint, recallRecipients, rememberRecipients, splitEmails,
  targetById, targetKeyOf, targetLabelOf, todayISO, useSuppliers,
  sevById, REPORT_TYPE, useComplaintCategories,
} from "./complaintsCore";
import {
  buildEmailHtml, buildComplaintText, defaultIntro, generateComplaintPdf,
} from "./complaintsEmail";
import {
  CategoriesPicker, SeverityPicker, ItemsEditor, PhotoUploader,
} from "./complaintsPieces";
import SmartFillPanel from "./SmartFillPanel";

const PREFILL_KEY = "qaComplaints_prefill_v1";

function readPrefill() {
  try {
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    return JSON.parse(raw);
  } catch { return null; }
}

export default function ComplaintFormPage({ mode = "new" }) {
  const navigate = useNavigate();
  const params = useParams();
  const [search] = useSearchParams();
  const suppliers = useSuppliers();
  const { categories: allCategories, addCategory, removeCategory } = useComplaintCategories();

  const initialTarget = mode === "new"
    ? (params.target === "supplier" ? "supplier" : "branch")
    : "branch";

  const [form, setForm] = useState(() => ({ ...emptyComplaint(), target: initialTarget }));
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [sending, setSending] = useState(null);

  /* ═════ Load / prefill ═════ */
  useEffect(() => {
    let alive = true;
    if (mode === "edit" && params.id) {
      setLoading(true);
      apiGetComplaint(params.id)
        .then((rec) => { if (alive) setForm(rec); })
        .catch((e) => { if (alive) setErr(`Failed to load the record: ${e?.message || e}`); })
        .finally(() => { if (alive) setLoading(false); });
    } else if (mode === "new") {
      const prefill = search.get("repeat") ? readPrefill() : null;
      if (prefill) {
        setForm((f) => ({ ...f, ...prefill, complaintDate: todayISO(), status: "DRAFT" }));
      } else {
        setForm({ ...emptyComplaint(), target: initialTarget });
      }
    }
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, params.id]);

  /* Recall saved recipients per party */
  useEffect(() => {
    const key = targetKeyOf(form);
    if (!key || form.recipients) return;
    const list = recallRecipients(key);
    if (list.length) setForm((f) => ({ ...f, recipients: list.join(", ") }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.branch, form.customBranch, form.supplier, form.target]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  /* Merge a Smart-fill result into the form: fill empty scalar fields, switch
     the target when one was detected, union the reasons, and replace the items
     list when codes were read. Nothing is saved until the user presses Save. */
  const applySmartFill = (patch = {}) => {
    setForm((f) => {
      const next = { ...f };
      if (patch.target === "supplier" || patch.target === "branch") next.target = patch.target;
      if (next.target === "supplier") {
        if (patch.supplier) next.supplier = patch.supplier;
        next.branch = ""; next.customBranch = "";
      } else {
        if (patch.branch) next.branch = patch.branch;
        next.supplier = "";
      }
      if (patch.subject && !f.subject.trim()) next.subject = patch.subject;
      if (patch.description && !f.description.trim()) next.description = patch.description;
      if (Array.isArray(patch.categories) && patch.categories.length) {
        next.categories = Array.from(new Set([...(f.categories || []), ...patch.categories]));
      }
      if (patch.severity) next.severity = patch.severity;
      if (Array.isArray(patch.items) && patch.items.length) next.items = patch.items;
      /* If the party changed, drop recipients so the recall effect refills the
         saved addresses for the newly-detected branch/supplier. */
      if (patch.target || patch.branch || patch.supplier) next.recipients = "";
      return next;
    });
    setOk("Smart fill applied ✓ Review the fields below, then Save.");
    setErr("");
  };

  const validate = () => {
    if (form.target === "branch") {
      if (!form.branch) return "Select the branch.";
      if (form.branch === "OTHER" && !form.customBranch.trim()) return "Enter the branch name.";
    } else {
      if (!form.supplier.trim()) return "Select or type the supplier name.";
    }
    if (!form.categories.length) return "Select at least one reason.";
    if (!form.subject.trim()) return "Enter a short subject for the complaint.";
    return "";
  };

  const buildPayload = () => ({
    target: form.target,
    complaintDate: form.complaintDate || todayISO(),
    reportDate: form.reportDate || "",
    branch: form.target === "branch" ? form.branch : "",
    customBranch: form.target === "branch" ? form.customBranch : "",
    supplier: form.target === "supplier" ? form.supplier.trim() : "",
    categories: form.categories,
    severity: form.severity,
    status: form.status,
    subject: form.subject.trim(),
    description: form.description.trim(),
    items: form.items.filter((r) =>
      r.itemCode || r.productName || r.quantity || r.remarks || r.expiry
    ),
    images: form.images,
    recipients: form.recipients.trim(),
    cc: form.cc.trim(),
    notes: form.notes.trim(),
    sentAt: form.sentAt || null,
  });

  const doSave = async (alsoSend) => {
    const bad = validate();
    if (bad) { setErr(bad); return; }
    setErr(""); setOk("");
    setSaving(true);
    try {
      const payload = buildPayload();
      /* apiCreate/Update already unwrap the {ok,report} envelope and hand back a
         parsed complaint (id, refNo, images, etc.). */
      const rec = form.id
        ? await apiUpdateComplaint(form.id, payload)
        : await apiCreateComplaint(payload);
      /* Remember recipients per party for next time */
      const emails = splitEmails(payload.recipients);
      const key = targetKeyOf(payload);
      if (emails.length && key) rememberRecipients(key, emails);

      /* Merge server-provided ids/refs back into the local form so a follow-up
         "save and send" acts on the new row instead of creating a second one. */
      setForm((f) => ({ ...f, id: rec.id, refNo: rec.refNo, reportDate: rec.reportDate }));

      if (alsoSend) {
        setSending(rec);
        setOk(`Saved ✓ Ref: ${rec.refNo || "—"}. Ready to send by email.`);
      } else {
        /* Land the user on the freshly saved complaint so they SEE it exists.
           From that view they can go to the log or edit again. */
        if (rec.id) {
          navigate(`/returns/complaints/view/${rec.id}`, { replace: true });
        } else {
          navigate(`/returns/complaints/list/${payload.target}`, { replace: true });
        }
      }
    } catch (e) {
      setErr(e?.message || "Unexpected error while saving.");
    } finally { setSaving(false); }
  };

  const tg = targetById(form.target);

  /* ═════ Email config — shared with the list page ═════ */
  const emailConfig = useMemo(() => ({
    reportTitle: "Quality Complaint",
    reportType: REPORT_TYPE,
    allowServerSend: true,
    getSubject: (rep) =>
      `[QA Complaint${rep?.refNo ? ` ${rep.refNo}` : ""}] ${targetLabelOf(rep)} — ${rep?.subject || ""}`.trim(),
    getDefaultIntro: defaultIntro,
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
      } catch { /* keep the modal success alive */ }
      /* After a successful send we drop back onto the list. */
      navigate(`/returns/complaints/list/${cur.target}`);
    },
  }), [sending, navigate]);

  const targetSelector = mode === "new" ? (
    <div className="qc-block" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div style={{ fontWeight: 1000 }}>Complaint against:</div>
      {TARGETS.map((t) => (
        <button
          key={t.id}
          type="button"
          className="qc-btn"
          style={{
            background: form.target === t.id ? t.tone : "#e2e8f0",
            color: form.target === t.id ? "#fff" : "#0f172a",
          }}
          onClick={() => set({ target: t.id, branch: "", customBranch: "", supplier: "", recipients: "" })}
        >
          {t.icon} {t.en}
        </button>
      ))}
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="qc qc">
        <style>{COMPLAINTS_CSS}</style>
        <div className="qc-shell"><div className="qc-empty">Loading…</div></div>
      </div>
    );
  }

  return (
    <div className="qc qc">
      <style>{COMPLAINTS_CSS}</style>
      <div className="qc-shell">
        <header className="qc-hero">
          <div className="qc-hero-top">
            <div>
              <h1 className="qc-hero-title">
                {tg.icon} {form.id ? "Edit complaint" : "New complaint"} — {tg.en}
              </h1>
              <p className="qc-hero-sub">
                Fill in the details; the complaint is saved to the server the moment you press “Save”.
                Press “Save &amp; Email” to send it out by email in one go.
              </p>
            </div>
            <div className="qc-hero-actions">
              <button className="qc-btn ghost" onClick={() => navigate(-1)}>⬅ Back</button>
              <button className="qc-btn ghost" onClick={() => navigate(`/returns/complaints/list/${form.target}`)}>📚 Log</button>
            </div>
          </div>
        </header>

        <div className="qc-page">
          {err && <div className="qc-alert err">⚠️ {err}</div>}
          {ok && <div className="qc-alert ok">✅ {ok}</div>}

          {targetSelector}

          <SmartFillPanel suppliers={suppliers} onApply={applySmartFill} />

          <div className="qc-grid three">
            <div className="qc-field">
              <label>Complaint date</label>
              <input type="date" value={form.complaintDate} onChange={(e) => set({ complaintDate: e.target.value })} />
            </div>

            {form.target === "branch" ? (
              <div className="qc-field">
                <label>Branch</label>
                <select value={form.branch} onChange={(e) => set({ branch: e.target.value, recipients: "" })}>
                  <option value="">— Select branch —</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                  <option value="OTHER">Other branch…</option>
                </select>
                {form.branch === "OTHER" && (
                  <input
                    style={{ marginTop: 6 }}
                    placeholder="Branch name"
                    value={form.customBranch}
                    onChange={(e) => set({ customBranch: e.target.value })}
                  />
                )}
              </div>
            ) : (
              <div className="qc-field">
                <label>Supplier</label>
                <input
                  list="qc-suppliers-list"
                  value={form.supplier}
                  onChange={(e) => set({ supplier: e.target.value, recipients: "" })}
                  placeholder="Search the supplier list or type a new name"
                />
                <datalist id="qc-suppliers-list">
                  {suppliers.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>
            )}

            <div className="qc-field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set({ status: e.target.value })}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.en}</option>)}
              </select>
            </div>
          </div>

          <div className="qc-block">
            <h4>
              <span>🎯 Complaint reasons (select all that apply)</span>
              <span className="qc-h4-r" style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                {form.categories.length} selected
              </span>
            </h4>
            <CategoriesPicker
              value={form.categories}
              onChange={(v) => set({ categories: v })}
              categories={allCategories}
              onAddCategory={addCategory}
              onRemoveCategory={removeCategory}
            />
          </div>

          <div className="qc-block">
            <h4><span>🚨 Severity</span></h4>
            <SeverityPicker value={form.severity} onChange={(v) => set({ severity: v })} />
          </div>

          <div className="qc-field" style={{ marginTop: 12 }}>
            <label>Short subject *</label>
            <input
              value={form.subject}
              onChange={(e) => set({ subject: e.target.value })}
              placeholder="e.g. Return of expired chicken quantity"
            />
          </div>

          <div className="qc-block">
            <h4><span>📦 Items involved (name is auto-filled from the product catalog)</span></h4>
            <ItemsEditor items={form.items} onChange={(items) => set({ items })} />
          </div>

          <div className="qc-block">
            <h4>
              <span>📝 Complaint text</span>
              <span className="qc-h4-r" style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                {form.description.length} chars
              </span>
            </h4>
            <div className="qc-field">
              <textarea
                className="qc-longtext"
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Paste the email text here, or write the complaint details directly… multiple lines are fine."
                rows={12}
              />
            </div>
          </div>

          <div className="qc-block">
            <h4><span>📷 Complaint photos</span></h4>
            <PhotoUploader
              images={form.images}
              onAdd={(urls) => set({ images: [...form.images, ...urls] })}
              onRemove={(i) => set({ images: form.images.filter((_, ix) => ix !== i) })}
            />
          </div>

          <div className="qc-block">
            <h4><span>✉️ Send-to emails (English + Arabic copy in the same message)</span></h4>
            <div className="qc-grid">
              <div className="qc-field">
                <label>Recipients (To) — comma separated</label>
                <input
                  value={form.recipients}
                  onChange={(e) => set({ recipients: e.target.value })}
                  placeholder="branch.manager@almawashi.ae, qa@almawashi.ae"
                />
              </div>
              <div className="qc-field">
                <label>CC — optional</label>
                <input
                  value={form.cc}
                  onChange={(e) => set({ cc: e.target.value })}
                  placeholder="ops@almawashi.ae"
                />
              </div>
            </div>
            <div className="qc-field" style={{ marginTop: 8 }}>
              <label>Internal note (not emailed)</label>
              <textarea
                value={form.notes}
                onChange={(e) => set({ notes: e.target.value })}
                placeholder="Private notes for QA/management"
                style={{ minHeight: 60 }}
              />
            </div>
          </div>

          <div className="qc-page-actions">
            <button className="qc-btn gray" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
            <button className="qc-btn blue" onClick={() => doSave(false)} disabled={saving}>
              {saving ? "Saving…" : (form.id ? "💾 Save changes" : "💾 Save complaint")}
            </button>
            <button className="qc-btn primary" onClick={() => doSave(true)} disabled={saving}>
              📨 Save &amp; Email (EN + AR)
            </button>
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
