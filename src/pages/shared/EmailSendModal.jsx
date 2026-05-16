// EmailSendModal.jsx
// Generic, report-agnostic email composer.
// Each parent provides callbacks for PDF generation, HTML body, etc.
// Methods: Outlook (.eml auto-attach), WhatsApp Web, Copy to clipboard.

import React, { useEffect, useMemo, useState } from "react";
import {
  buildEml,
  downloadBlobLocally,
  fetchAsBase64,
  fetchImagesAsAttachments,
  uploadPdfBlob,
  validEmails,
} from "./emailReportUtils";
import {
  loadEmailSettings,
  buildSignatureHtml,
  buildSignatureText,
  pushRecipientHistory,
  listEmailContacts,
} from "./emailReportSettings";
import EmailSettingsPanel from "./EmailSettingsPanel";
import ContactPicker from "./ContactPicker";

const splitToArr = (s) =>
  String(s || "").split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);

const LS_TO = "qcs_email_to_v1";
const LS_CC = "qcs_email_cc_v1";
const LS_METHOD = "qcs_email_method_v1";

function lsGet(k, d = "") {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
}
function lsSet(k, v) {
  try { localStorage.setItem(k, v); } catch {}
}

const SEND_METHODS = [
  { id: "outlook",  icon: "📧", label: "Outlook",   desc: "PDF + images auto-attached" },
  { id: "whatsapp", icon: "💬", label: "WhatsApp",  desc: "Share via WhatsApp Web" },
  { id: "copy",     icon: "📋", label: "Copy",      desc: "Copy text + PDF link" },
];

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
    zIndex: 10010, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "min(720px, 96vw)", maxHeight: "94vh", overflow: "auto",
    background: "#fff", borderRadius: 16, boxShadow: "0 24px 48px rgba(0,0,0,.28)",
    padding: 22, color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sub:   { marginTop: 4, fontSize: 13, color: "#475569" },
  field: { marginTop: 14 },
  label: { display: "block", fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #94a3b8",
    borderRadius: 10, outline: "none", fontSize: 14, boxSizing: "border-box",
  },
  textarea: {
    width: "100%", padding: "10px 12px", border: "1px solid #94a3b8",
    borderRadius: 10, outline: "none", fontSize: 14, minHeight: 80, resize: "vertical",
    boxSizing: "border-box", fontFamily: "inherit",
  },
  summary: {
    marginTop: 12, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 10, fontSize: 13, lineHeight: 1.55,
  },
  row:   { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  chipOk:   { background: "#dcfce7", color: "#166534", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  chipWarn: { background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  chipBad:  { background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "1px 8px", fontWeight: 800 },
  err:      { marginTop: 10, padding: "10px 12px", background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", borderRadius: 10, fontSize: 13, fontWeight: 700 },
  info:     { marginTop: 10, padding: "10px 12px", background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e3a8a", borderRadius: 10, fontSize: 13, fontWeight: 700 },
  actions:  { marginTop: 18, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" },
  btnPrimary: {
    padding: "11px 18px", background: "#2563eb", color: "#fff", border: "none",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14, minWidth: 200,
  },
  btnGhost: {
    padding: "11px 18px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1",
    borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14,
  },
  btnDisabled: { opacity: 0.55, cursor: "not-allowed" },
  meta: { fontSize: 12, color: "#64748b", marginTop: 6 },
  methodGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: 8, marginTop: 6,
  },
};

function methodCard(active) {
  return {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "12px 10px", borderRadius: 12,
    border: active ? "2px solid #2563eb" : "1px solid #cbd5e1",
    background: active ? "#eff6ff" : "#fff",
    cursor: "pointer", fontFamily: "inherit",
    boxShadow: active ? "0 2px 8px rgba(37,99,235,.18)" : "none",
    transition: "all .12s",
  };
}

function chipForStatus(kind) {
  if (kind === "ok") return styles.chipOk;
  if (kind === "warn") return styles.chipWarn;
  if (kind === "bad") return styles.chipBad;
  return null;
}

/**
 * Props:
 *   open, onClose
 *   payload: any object (report data)
 *   config: {
 *     reportTitle: string,                                    // e.g., "Returns Report"
 *     getSubject(payload) -> string,                          // default subject
 *     generatePdf(payload) -> Promise<{blob, base64?, filename}>,
 *     buildHtml(payload, { note, pdfUrl, attachmentsCount }) -> string,
 *     buildText(payload, { note, pdfUrl }) -> string,
 *     getImages(payload) -> string[],                         // image URLs to attach
 *     getCertificate(payload) -> {url, name} | null,          // optional single doc
 *     getSummary(payload) -> { status?, statusKind?, fields: [{label,value}] }
 *   }
 */
export default function EmailSendModal({ open, onClose, payload, config }) {
  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [priority, setPriority] = useState("normal");
  const [includeTable, setIncludeTable] = useState(false);
  const [method, setMethod] = useState("outlook");
  const [progress, setProgress] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState(() => loadEmailSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contacts, setContacts] = useState([]);

  const refreshContacts = React.useCallback(async () => {
    const list = await listEmailContacts();
    setContacts(list);
    return list;
  }, []);

  useEffect(() => {
    if (!open) return;
    const s = loadEmailSettings();
    setSettings(s);
    // Pre-fill from saved defaults (as arrays)
    setTo(splitToArr(lsGet(LS_TO, "") || s.defaultTo));
    setCc(splitToArr(lsGet(LS_CC, "") || s.defaultCc));
    setBcc(splitToArr(s.defaultBcc));
    setPriority(s.priority || "normal");
    setScheduleAt("");
    setIncludeTable(false);
    const saved = lsGet(LS_METHOD, "outlook");
    setMethod(SEND_METHODS.some((m) => m.id === saved) ? saved : "outlook");
    setNote("");
    setError("");
    setInfo("");
    setProgress("");
    const baseSubject = config?.getSubject?.(payload) || "";
    const prefix = (s.subjectPrefix || "").trim();
    setSubject(prefix && !baseSubject.startsWith(prefix) ? `${prefix} ${baseSubject}` : baseSubject);
    refreshContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const summary = useMemo(
    () => config?.getSummary?.(payload) || { fields: [] },
    [payload, config]
  );

  if (!open) return null;

  const toList = to;
  const ccList = cc;
  const bccList = bcc;
  const toValid = toList.length > 0 && validEmails(toList);
  const ccValid = ccList.length === 0 || validEmails(ccList);

  const needsRecipients = method === "outlook";
  const canSend =
    !busy &&
    subject.trim().length > 0 &&
    (!needsRecipients || (toValid && ccValid));

  /* ===== Send dispatchers ===== */

  async function sendViaMailto() {
    setProgress("⏳ Generating PDF...");
    const { blob: pdfBlob, base64: pdfBase64Raw, filename: pdfFilename } =
      await config.generatePdf(payload);

    const pdfBase64 = pdfBase64Raw || (await (async () => {
      const { blobToBase64 } = await import("./emailReportUtils");
      return blobToBase64(pdfBlob);
    })());

    const images = (config.getImages?.(payload) || []).filter(Boolean);
    const cert = config.getCertificate?.(payload);

    const attachments = [
      { filename: pdfFilename, base64: pdfBase64, contentType: "application/pdf" },
    ];

    const imgAtts = await fetchImagesAsAttachments(images, (n, total) => {
      setProgress(`🖼️ Fetching image ${n} / ${total}...`);
    });
    attachments.push(...imgAtts);

    if (cert?.url) {
      setProgress("📄 Fetching certificate...");
      try {
        const { base64, contentType } = await fetchAsBase64(cert.url);
        const isPdf = (contentType || "").includes("pdf");
        const ext = isPdf ? "pdf" : ((contentType.split("/")[1] || "jpg") + "").replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "");
        attachments.push({
          filename: cert.name || `certificate.${ext || "jpg"}`,
          base64,
          contentType: contentType || "application/octet-stream",
        });
      } catch (e) {
        console.warn("Failed to fetch certificate:", e);
      }
    }

    setProgress("📩 Building email package...");
    let html = config.buildHtml(payload, { note, pdfUrl: null, attachmentsCount: attachments.length, includeTable });

    // Prepend banners (schedule / confidentiality) and append signature
    const banners = [];
    if (scheduleAt) {
      const niceTime = new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      banners.push(`<div style="background:#fef3c7;border:1px solid #f59e0b;color:#78350f;padding:10px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:700;">📅 <b>Scheduled to send:</b> ${niceTime} (Dubai) — In Outlook: <i>Options → Delay Delivery → Do not deliver before</i>.</div>`);
    }
    if (settings.confidentialityNote) {
      banners.push(`<div style="background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;padding:8px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:800;text-align:center;letter-spacing:0.5px;">🔒 INTERNAL USE ONLY — DO NOT FORWARD</div>`);
    }
    if (banners.length) {
      const bannerHtml = `<div style="background:#f1f5f9;padding:12px 0 0;">${banners.join("")}</div>`;
      // Insert banners right after the body opening
      html = html.replace(/(<body[^>]*>|<div[^>]*background:#f1f5f9[^>]*>)/i, (m) => `${m}${bannerHtml}`);
      if (!html.includes(bannerHtml)) html = bannerHtml + html;
    }
    const sig = buildSignatureHtml(settings);
    if (sig) {
      // Insert before the final closing div tags
      const insertion = `<div style="background:#f1f5f9;padding:0 20px 20px;"><div style="max-width:780px;margin:auto;">${sig}</div></div>`;
      html = html + insertion;
    }

    // Build extra headers
    const extraHeaders = [];
    if (priority === "high") extraHeaders.push("X-Priority: 1", "Importance: High");
    else if (priority === "low") extraHeaders.push("X-Priority: 5", "Importance: Low");
    if (settings.requestReadReceipt && toList[0]) {
      extraHeaders.push(`Disposition-Notification-To: ${toList[0]}`);
    }

    const eml = buildEml({
      to: toList.join(", "),
      cc: ccList.join(", "),
      bcc: bccList.join(", "),
      subject: subject.trim(),
      html,
      attachments,
      extraHeaders,
    });

    setProgress("📧 Downloading .eml...");
    const emlBlob = new Blob([eml], { type: "message/rfc822" });
    const emlFilename = pdfFilename.replace(/\.pdf$/i, "") + ".eml";
    downloadBlobLocally(emlBlob, emlFilename);

    setInfo(
      `📧 الملف ${emlFilename} نزّل. اضغطه (من شريط التحميل) → Outlook يفتح مع ${attachments.length} مرفق(ات).${scheduleAt ? " ⏰ لا تنسَ Delay Delivery!" : ""}`
    );
    lsSet(LS_TO, to.join(", "));
    lsSet(LS_CC, cc.join(", "));
    pushRecipientHistory([...toList, ...ccList, ...bccList]);
    setTimeout(() => onClose?.(), 5000);
  }

  async function generateAndUploadPdf() {
    setProgress("⏳ Generating PDF...");
    const { blob, filename } = await config.generatePdf(payload);
    setProgress("☁️ Uploading PDF (Cloudinary)...");
    const pdfUrl = await uploadPdfBlob(blob, filename);
    return { blob, pdfUrl, filename };
  }

  async function sendViaWhatsapp() {
    const { pdfUrl } = await generateAndUploadPdf();
    setProgress("💬 Opening WhatsApp...");
    let body = config.buildText(payload, { note, pdfUrl, includeTable });
    if (scheduleAt) body = `📅 Scheduled: ${new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}\n\n` + body;
    body += buildSignatureText(settings);
    const text = `*${subject.trim()}*\n\n${body}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setInfo("💬 WhatsApp Web فُتح — اختر المستلم وأرسل.");
    pushRecipientHistory([...toList, ...ccList]);
    setTimeout(() => onClose?.(), 1800);
  }

  async function sendViaCopy() {
    const { pdfUrl } = await generateAndUploadPdf();
    setProgress("📋 Copying to clipboard...");
    let body = config.buildText(payload, { note, pdfUrl, includeTable });
    if (scheduleAt) body = `📅 Scheduled: ${new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}\n\n` + body;
    body += buildSignatureText(settings);
    const text =
      `Subject: ${subject.trim()}\n` +
      (toList.length ? `To: ${toList.join(", ")}\n` : "") +
      (ccList.length ? `Cc: ${ccList.join(", ")}\n` : "") +
      (bccList.length ? `Bcc: ${bccList.join(", ")}\n` : "") +
      `\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setInfo("📋 تم النسخ — الصقه (Ctrl+V) وين ما بدك.");
      pushRecipientHistory([...toList, ...ccList, ...bccList]);
    } catch {
      throw new Error("فشل النسخ. المتصفح يمنع الوصول للحافظة.");
    }
  }

  async function handleSend() {
    setError("");
    setInfo("");
    if (needsRecipients && !toValid) { setError("الرجاء إدخال إيميل واحد صحيح على الأقل في حقل To."); return; }
    if (needsRecipients && !ccValid) { setError("هناك إيميل غير صحيح في حقل CC."); return; }
    if (!subject.trim()) { setError("Subject فاضي."); return; }

    setBusy(true);
    lsSet(LS_METHOD, method);
    try {
      if (method === "outlook")       await sendViaMailto();
      else if (method === "whatsapp") await sendViaWhatsapp();
      else if (method === "copy")     await sendViaCopy();
    } catch (e) {
      setError(`فشل: ${e?.message || e}`);
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const sendLabel = busy ? (progress || "⏳ Working...") : ({
    outlook:  "📧 Open in Outlook",
    whatsapp: "💬 Open WhatsApp",
    copy:     "📋 Copy to Clipboard",
  }[method] || "Send");

  const statusChipStyle = chipForStatus(summary.statusKind);

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" onClick={(e) => e.target === e.currentTarget && !busy && onClose?.()}>
      <div style={styles.modal}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div>
            <h3 style={styles.title}>📨 Send {config?.reportTitle || "Report"}</h3>
            <div style={styles.sub}>اختر طريقة الإرسال. الـ PDF يُولّد تلقائياً.</div>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            disabled={busy}
            style={{
              padding: "8px 12px", background: "#f1f5f9", border: "1px solid #cbd5e1",
              borderRadius: 10, cursor: busy ? "not-allowed" : "pointer", fontSize: 13,
              fontWeight: 800, color: "#334155", display: "inline-flex", alignItems: "center", gap: 6,
            }}
            title="Email Settings (defaults, signature, priority...)"
          >
            ⚙️ Settings
          </button>
        </div>

        {(summary.status || summary.fields?.length) && (
          <div style={styles.summary}>
            {summary.status && (
              <div style={styles.row}>
                <strong>Status:</strong>
                {statusChipStyle
                  ? <span style={statusChipStyle}>{summary.status}</span>
                  : <span style={{ fontWeight: 800 }}>{summary.status}</span>
                }
              </div>
            )}
            {summary.fields?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {summary.fields.map((f, i) => (
                  <span key={i}>
                    {i > 0 && " · "}
                    <strong>{f.label}:</strong> {f.value || "—"}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Send via:</label>
          <div style={styles.methodGrid}>
            {SEND_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                style={methodCard(method === m.id)}
                disabled={busy}
              >
                <div style={{ fontSize: 22, lineHeight: 1 }}>{m.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 13, marginTop: 4 }}>{m.label}</div>
                <div style={{ fontSize: 10.5, color: "#64748b", textAlign: "center" }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {needsRecipients && (
          <>
            <div style={styles.field}>
              <ContactPicker
                label="To *"
                value={to}
                onChange={setTo}
                contacts={contacts}
                disabled={busy}
                allowAdd={false}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={styles.field}>
                <ContactPicker
                  label="CC"
                  value={cc}
                  onChange={setCc}
                  contacts={contacts}
                  disabled={busy}
                  allowAdd={false}
                />
              </div>
              <div style={styles.field}>
                <ContactPicker
                  label="BCC"
                  value={bcc}
                  onChange={setBcc}
                  contacts={contacts}
                  disabled={busy}
                  allowAdd={false}
                />
              </div>
            </div>
            {contacts.length === 0 && (
              <div style={{ ...styles.meta, color: "#b45309" }}>
                ⚠️ لا يوجد إيميلات محفوظة. أضِفها من ⚙️ Settings → Email Contacts.
              </div>
            )}
          </>
        )}

        <div style={styles.field}>
          <label style={styles.label}>Subject <span style={{ color: "#dc2626" }}>*</span></label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)}
            style={styles.input} disabled={busy} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={styles.field}>
            <label style={styles.label}>📅 Schedule reminder (optional)</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={styles.input}
              disabled={busy}
            />
            <div style={styles.meta}>يضيف banner للرسالة + تعليمات Delay Delivery في Outlook.</div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              style={styles.input} disabled={busy}>
              <option value="high">🔴 High</option>
              <option value="normal">⚪ Normal</option>
              <option value="low">🔵 Low</option>
            </select>
          </div>
        </div>

        <div style={styles.field}>
          <label
            style={{
              display: "flex", alignItems: "center", gap: 10, cursor: busy ? "not-allowed" : "pointer",
              padding: "10px 12px", background: includeTable ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${includeTable ? "#93c5fd" : "#e2e8f0"}`, borderRadius: 10,
              fontWeight: 800, fontSize: 13, color: "#334155",
            }}
          >
            <input
              type="checkbox"
              checked={includeTable}
              onChange={(e) => setIncludeTable(e.target.checked)}
              disabled={busy}
              style={{ width: 18, height: 18, accentColor: "#2563eb", cursor: "inherit" }}
            />
            📊 ضمّن جدول البيانات الكامل في متن الرسالة
            <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b" }}>
              ({includeTable ? "مفعّل — الجدول يظهر بالإيميل" : "معطّل — PDF مرفق فقط"})
            </span>
          </label>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Additional note (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظات إضافية تضاف لمتن الرسالة..."
            style={styles.textarea} disabled={busy} />
        </div>

        {progress && <div style={styles.info}>{progress}</div>}
        {info && !progress && <div style={styles.info}>{info}</div>}
        {error && <div style={styles.err}>{error}</div>}

        <div style={styles.actions}>
          <button onClick={onClose} disabled={busy} style={{ ...styles.btnGhost, ...(busy ? styles.btnDisabled : {}) }}>
            إغلاق
          </button>
          <button onClick={handleSend} disabled={!canSend}
            style={{ ...styles.btnPrimary, ...(canSend ? {} : styles.btnDisabled) }}>
            {sendLabel}
          </button>
        </div>
      </div>

      <EmailSettingsPanel
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); refreshContacts(); }}
        onSaved={(s) => { setSettings(s); refreshContacts(); }}
      />
    </div>
  );
}
