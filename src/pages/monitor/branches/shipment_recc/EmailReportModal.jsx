// EmailReportModal.jsx
// Modal for composing & sending the shipment report email (with PDF attachment).

import React, { useEffect, useMemo, useState } from "react";
import { sendEmailReport } from "./qcsRawApi";
import { generateReportPdf } from "./qcsReportPdf";

const LS_TO = "qcs_email_to_v1";
const LS_CC = "qcs_email_cc_v1";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function splitEmails(s) {
  return String(s || "")
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
function validEmails(list) {
  return list.every((e) => EMAIL_RE.test(e));
}

function lsGet(k, d = "") {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, v); } catch {}
}

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "min(680px, 96vw)", maxHeight: "92vh", overflow: "auto",
    background: "#fff", borderRadius: 16, boxShadow: "0 24px 48px rgba(0,0,0,.28)",
    padding: 22, color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sub: { marginTop: 4, fontSize: 13, color: "#475569" },
  field: { marginTop: 14 },
  label: { display: "block", fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #94a3b8",
    borderRadius: 10, outline: "none", fontSize: 14, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "10px 12px", border: "1px solid #94a3b8",
    borderRadius: 10, outline: "none", fontSize: 14, minHeight: 90, resize: "vertical",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  summary: {
    marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 10, fontSize: 13, lineHeight: 1.55,
  },
  row: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  chipOk: { background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  chipWarn: { background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  chipBad: { background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  err: { marginTop: 10, padding: "10px 12px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 700 },
  actions: { marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  btnPrimary: {
    padding: "11px 18px", background: "#2563eb", color: "#fff", border: "none",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14,
  },
  btnGhost: {
    padding: "11px 18px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14,
  },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 6 },
};

function statusChip(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("acceptable")) return { style: styles.chipOk, label: "ACCEPTABLE" };
  if (s.includes("average") && !s.includes("below")) return { style: styles.chipWarn, label: "AVERAGE" };
  return { style: styles.chipBad, label: "BELOW AVERAGE" };
}

export default function EmailReportModal({ open, onClose, payload, onSent }) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Defaults — only when modal opens (not on every parent re-render).
  // We deliberately omit `payload` from deps; we read it once on open.
  useEffect(() => {
    if (!open) return;
    setTo(lsGet(LS_TO, ""));
    setCc(lsGet(LS_CC, ""));
    setNote("");
    setError("");
    const supplier = payload?.generalInfo?.supplierName || "";
    const inv = payload?.generalInfo?.invoiceNo || "";
    const type = payload?.shipmentType || "";
    const date = payload?.createdDate || new Date().toISOString().slice(0, 10);
    setSubject(`[QCS] Shipment Report — ${type || "Raw Material"}${supplier ? " · " + supplier : ""}${inv ? " · Invoice " + inv : ""} · ${date}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chip = useMemo(() => statusChip(payload?.shipmentStatus), [payload?.shipmentStatus]);

  if (!open) return null;

  const toList = splitEmails(to);
  const ccList = splitEmails(cc);
  const toValid = toList.length > 0 && validEmails(toList);
  const ccValid = ccList.length === 0 || validEmails(ccList);
  const canSend = toValid && ccValid && subject.trim().length > 0 && !sending;

  async function handleSend() {
    setError("");
    if (!toValid) { setError("الرجاء إدخال إيميل واحد صحيح على الأقل في حقل To."); return; }
    if (!ccValid) { setError("هناك إيميل غير صحيح في حقل CC."); return; }

    setSending(true);
    try {
      const { base64, filename } = await generateReportPdf(payload);
      const html = buildEmailHtml({ payload, note });
      await sendEmailReport({
        to: toList,
        cc: ccList,
        subject: subject.trim(),
        html,
        attachments: [{ filename, content: base64, contentType: "application/pdf" }],
      });
      lsSet(LS_TO, to);
      lsSet(LS_CC, cc);
      onSent?.();
      onClose?.();
    } catch (e) {
      setError(`فشل الإرسال: ${e?.message || e}`);
    } finally {
      setSending(false);
    }
  }

  const supplier = payload?.generalInfo?.supplierName || "—";
  const invoice  = payload?.generalInfo?.invoiceNo || "—";
  const type     = payload?.shipmentType || "—";
  const date     = payload?.createdDate || "—";
  const samplesN = payload?.samples?.length || 0;
  const linesN   = payload?.productLines?.length || 0;

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={styles.modal}>
        <h3 style={styles.title}>📨 Email Shipment Report</h3>
        <div style={styles.sub}>سيتم توليد PDF احترافي وإرفاقه بالرسالة تلقائياً.</div>

        <div style={styles.summary}>
          <div style={styles.row}>
            <strong>Status:</strong> <span style={chip.style}>{chip.label}</span>
          </div>
          <div style={{ marginTop: 6 }}>
            <strong>Type:</strong> {type} &nbsp;·&nbsp;
            <strong>Supplier:</strong> {supplier} &nbsp;·&nbsp;
            <strong>Invoice:</strong> {invoice}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>Date:</strong> {date} &nbsp;·&nbsp;
            <strong>Samples:</strong> {samplesN} &nbsp;·&nbsp;
            <strong>Lines:</strong> {linesN}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>To <span style={{ color: "#dc2626" }}>*</span></label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="manager@almawashi.ae, qa@almawashi.ae"
            style={styles.input}
            autoFocus
          />
          <div style={styles.meta}>افصل بفاصلة (,) أو فاصلة منقوطة (;) لإيميلات متعددة.</div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>CC</label>
          <input
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="(اختياري)"
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Subject <span style={{ color: "#dc2626" }}>*</span></label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Additional note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظات إضافية تضاف لمتن الرسالة..."
            style={styles.textarea}
          />
        </div>

        {error && <div style={styles.err}>{error}</div>}

        <div style={styles.actions}>
          <button onClick={onClose} disabled={sending} style={{ ...styles.btnGhost, ...(sending ? styles.btnDisabled : {}) }}>
            إلغاء
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{ ...styles.btnPrimary, ...(canSend ? {} : styles.btnDisabled) }}
            title={!toValid ? "أدخل إيميل صحيح في To" : !subject.trim() ? "Subject فاضي" : "إرسال الإيميل"}
          >
            {sending ? "⏳ جاري الإرسال..." : "📤 Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Email HTML body builder ===== */
function buildEmailHtml({ payload, note }) {
  const gi = payload?.generalInfo || {};
  const meta = payload?.docMeta || {};
  const status = String(payload?.shipmentStatus || "").toLowerCase();
  const statusColor =
    status.includes("acceptable") ? "#16a34a" :
    (status.includes("average") && !status.includes("below")) ? "#d97706" :
    "#dc2626";

  const noteHtml = note && String(note).trim()
    ? `<tr><td style="padding:14px 18px;border-top:1px solid #e2e8f0;"><b>Note from inspector:</b><br/>${escapeHtml(note).replace(/\n/g, "<br/>")}</td></tr>`
    : "";

  const safe = (v) => escapeHtml(String(v ?? "—"));

  return `
  <div style="font-family:Inter,Roboto,Arial,sans-serif;background:#f1f5f9;padding:24px;color:#0f172a;">
    <table cellpadding="0" cellspacing="0" style="max-width:640px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.08);">
      <tr>
        <td style="background:#0f172a;color:#fff;padding:18px 22px;">
          <div style="font-size:18px;font-weight:900;letter-spacing:.5px;">AL MAWASHI</div>
          <div style="font-size:12px;opacity:.85;">Trans Emirates Livestock Trading L.L.C.</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 22px;">
          <div style="font-size:17px;font-weight:800;">QCS Incoming Shipment Report</div>
          <div style="margin-top:10px;">
            <span style="display:inline-block;background:${statusColor};color:#fff;padding:4px 12px;border-radius:6px;font-weight:800;font-size:13px;">
              ${safe(payload?.shipmentStatus || "STATUS")}
            </span>
          </div>
          <table cellpadding="6" cellspacing="0" style="margin-top:14px;width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;">
            <tr><td style="background:#f8fafc;font-weight:700;width:42%;border:1px solid #e2e8f0;">Shipment Type</td><td style="border:1px solid #e2e8f0;">${safe(payload?.shipmentType)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Supplier</td><td style="border:1px solid #e2e8f0;">${safe(gi.supplierName)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Invoice No</td><td style="border:1px solid #e2e8f0;">${safe(gi.invoiceNo)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Origin / Brand</td><td style="border:1px solid #e2e8f0;">${safe(gi.origin)} / ${safe(gi.brand)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Inspection Date</td><td style="border:1px solid #e2e8f0;">${safe(gi.inspectionDate)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Avg Product Temp / Vehicle Temp (°C)</td><td style="border:1px solid #e2e8f0;">${safe(gi.temperature)} / ${safe(gi.vehicleTemperature)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Inspected / Verified By</td><td style="border:1px solid #e2e8f0;">${safe(payload?.inspectedBy)} / ${safe(payload?.verifiedBy)}</td></tr>
            <tr><td style="background:#f8fafc;font-weight:700;border:1px solid #e2e8f0;">Document No / Rev</td><td style="border:1px solid #e2e8f0;">${safe(meta.documentNo)} / ${safe(meta.revisionNo)}</td></tr>
          </table>
          <div style="margin-top:14px;font-size:13px;color:#475569;">
            📎 The full inspection report is attached as PDF.
          </div>
        </td>
      </tr>
      ${noteHtml}
      <tr>
        <td style="background:#f8fafc;padding:14px 22px;color:#64748b;font-size:11px;text-align:center;">
          Generated automatically by Al Mawashi QCS — do not reply to this email.
        </td>
      </tr>
    </table>
  </div>`;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
