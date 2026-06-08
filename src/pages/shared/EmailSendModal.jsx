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
  CLASSIFICATIONS,
  getClassification,
  RECIPIENT_ROLES,
  getRole,
  loadTemplates,
  saveTemplate,
  expandTemplateRecipients,
  getAutoRoute,
  expandAutoRoute,
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
  const [sortBy, setSortBy] = useState("default");   // default | branch | action | origin | product | expiry
  const [groupBy, setGroupBy] = useState("none");    // none | branch | action | origin
  const [method, setMethod] = useState("outlook");

  /* New: classification, recipient roles, templates, attachment manager */
  const [classification, setClassification] = useState("internal");
  const [recipientRoles, setRecipientRoles] = useState({});  // { [email.toLowerCase()]: "approver"|"reviewer"|"fyi"|"action" }
  const [showRoles, setShowRoles] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [imageSelection, setImageSelection] = useState({});  // { [url]: boolean } default true
  const [showAttachments, setShowAttachments] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
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
    setTemplates(loadTemplates());

    /* Pre-fill from saved defaults (as arrays) */
    let initialTo = splitToArr(lsGet(LS_TO, "") || s.defaultTo);
    let initialCc = splitToArr(lsGet(LS_CC, "") || s.defaultCc);

    /* Auto-routing: if config provides a reportType and the user has a routing
       config for it, merge those defaults in (without dropping anything the user
       had saved as a global default). */
    setTo(initialTo);
    setCc(initialCc);
    setBcc(splitToArr(s.defaultBcc));

    setPriority(s.priority || "normal");
    setClassification(s.defaultClassification || "internal");
    setRecipientRoles({});
    setShowRoles(false);
    setShowAttachments(false);
    setShowSaveTemplate(false);
    setTemplateName("");
    setImageSelection({});
    setScheduleAt("");
    setIncludeTable(false);
    setSortBy("default");
    setGroupBy("none");
    const saved = lsGet(LS_METHOD, "outlook");
    setMethod(SEND_METHODS.some((m) => m.id === saved) ? saved : "outlook");
    setNote("");
    setError("");
    setInfo("");
    setProgress("");
    const baseSubject = config?.getSubject?.(payload) || "";
    const prefix = (s.subjectPrefix || "").trim();
    setSubject(prefix && !baseSubject.startsWith(prefix) ? `${prefix} ${baseSubject}` : baseSubject);

    /* Async: load contacts, then apply auto-routing if applicable */
    (async () => {
      const list = await refreshContacts();
      const route = getAutoRoute(config?.reportType, s);
      if (route) {
        const { to: routeTo, cc: routeCc } = expandAutoRoute(route, list);
        if (routeTo.length) setTo((prev) => mergeUniqueCI(prev, routeTo));
        if (routeCc.length) setCc((prev) => mergeUniqueCI(prev, routeCc));
      }
      /* Initialize attachment selection — all images selected by default */
      const images = (config?.getImages?.(payload) || []).filter(Boolean);
      const init = {};
      for (const u of images) init[u] = true;
      setImageSelection(init);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* Helper: merge two arrays of emails case-insensitively */
  function mergeUniqueCI(base, additions) {
    const seen = new Set(base.map((x) => String(x).toLowerCase()));
    const out = [...base];
    for (const a of additions) {
      const k = String(a).toLowerCase();
      if (!seen.has(k)) { seen.add(k); out.push(a); }
    }
    return out;
  }

  /* Apply a template to all relevant modal state */
  function applyTemplate(t) {
    if (!t) return;
    const expanded = expandTemplateRecipients(t, contacts);
    if (expanded.to.length) setTo(expanded.to);
    if (expanded.cc.length) setCc(expanded.cc);
    if (t.subject) setSubject(t.subject);
    if (t.note) setNote(t.note);
    if (t.priority) setPriority(t.priority);
    if (t.classification) setClassification(t.classification);
    if (typeof t.includeTable === "boolean") setIncludeTable(t.includeTable);
    if (t.sortBy)  setSortBy(t.sortBy);
    if (t.groupBy) setGroupBy(t.groupBy);
    setInfo(`✓ Applied template: ${t.name}`);
    setTimeout(() => setInfo(""), 2500);
  }

  /* Save current modal state as a new template */
  function handleSaveAsTemplate() {
    const n = templateName.trim() || subject.trim() || "Untitled";
    const t = saveTemplate({
      name: n, icon: "📧",
      subject, note,
      toEmails: to, ccEmails: cc,
      priority, classification,
      includeTable, sortBy, groupBy,
    });
    setTemplates(loadTemplates());
    setShowSaveTemplate(false);
    setTemplateName("");
    setInfo(`💾 Template saved: ${t.name}`);
    setTimeout(() => setInfo(""), 2500);
  }

  /* Cycle a recipient's role: none → action → approver → reviewer → fyi → none */
  function cycleRole(email) {
    const key = String(email).toLowerCase();
    const cur = recipientRoles[key] || "none";
    const ids = RECIPIENT_ROLES.map((r) => r.id);
    const next = ids[(ids.indexOf(cur) + 1) % ids.length];
    setRecipientRoles((m) => ({ ...m, [key]: next }));
  }

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

  /* ===== Audit log helper — fire-and-forget POST to /api/email-history.
     Imports API_BASE lazily to avoid coupling this module to any single page. */
  async function logEmailSent({ methodUsed, attachmentCount }) {
    try {
      const { default: API_BASE } = await import("../../config/api");
      const reportDate = payload?.reportDate || null;
      let me = "";
      try { me = JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; } catch {}
      await fetch(`${API_BASE}/api/email-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sent_by:          me,
          report_type:      config?.reportType || "",
          report_title:     config?.reportTitle || "",
          report_date:      reportDate,
          subject:          subject.trim(),
          to_emails:        to,
          cc_emails:        cc,
          bcc_emails:       bcc,
          classification,
          priority,
          method:           methodUsed,
          attachment_count: attachmentCount || 0,
          note:             (note || "").slice(0, 2000),
          status:           "sent",
        }),
      });
    } catch (err) {
      /* Audit log is best-effort — never block the user on it */
      console.warn("[EmailHistory] log failed (non-blocking):", err);
    }
  }

  /* ===== Send dispatchers ===== */

  async function sendViaMailto() {
    setProgress("⏳ Generating PDF...");
    const { blob: pdfBlob, base64: pdfBase64Raw, filename: pdfFilename } =
      await config.generatePdf(payload, { sortBy, groupBy, classification });

    const pdfBase64 = pdfBase64Raw || (await (async () => {
      const { blobToBase64 } = await import("./emailReportUtils");
      return blobToBase64(pdfBlob);
    })());

    /* Apply the user's attachment-manager selection (default: all selected) */
    const allImages = (config.getImages?.(payload) || []).filter(Boolean);
    const images = allImages.filter((u) => imageSelection[u] !== false);
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
    let html = config.buildHtml(payload, {
      note, pdfUrl: null, attachmentsCount: attachments.length,
      includeTable, sortBy, groupBy,
      classification,
      recipientRoles, recipients: { to: toList, cc: ccList, bcc: bccList },
    });

    // Prepend banners (classification + schedule) and append signature
    const banners = [];
    /* Classification banner — replaces the legacy single "Internal" toggle */
    const classMeta = getClassification(classification);
    if (classification && classification !== "public") {
      const forwardWarn = classification === "highly" ? " · DO NOT FORWARD" : "";
      banners.push(`<div style="background:${classMeta.bg};border:1px solid ${classMeta.border};color:${classMeta.color};padding:8px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:12px;font-weight:900;text-align:center;letter-spacing:1px;text-transform:uppercase;">🔒 ${classMeta.label.replace(/^[^\s]+\s/, "")}${forwardWarn}</div>`);
    }
    if (scheduleAt) {
      const niceTime = new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      banners.push(`<div style="background:#fef3c7;border:1px solid #f59e0b;color:#78350f;padding:10px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:13px;font-weight:700;">📅 <b>Scheduled to send:</b> ${niceTime} (Dubai) — In Outlook: <i>Options → Delay Delivery → Do not deliver before</i>.</div>`);
    }
    /* Recipient roles roster — appended only if at least one role was set */
    const rolesSet = Object.entries(recipientRoles).filter(([, r]) => r && r !== "none");
    if (rolesSet.length) {
      const rolesHtml = rolesSet.map(([emKey, rId]) => {
        const meta = getRole(rId);
        const display = [...toList, ...ccList, ...bccList].find((x) => String(x).toLowerCase() === emKey) || emKey;
        return `<span style="display:inline-flex;align-items:center;gap:5px;margin:2px;padding:3px 9px;border-radius:6px;background:${meta.bg};color:${meta.color};border:1px solid ${meta.color}40;font-size:11px;font-weight:800;">${meta.label}: ${display}</span>`;
      }).join("");
      banners.push(`<div style="background:#f8fafc;border:1px solid #e2e8f0;color:#0f172a;padding:10px 14px;border-radius:8px;margin:10px auto;max-width:780px;font-family:Inter,Arial,sans-serif;font-size:12px;">
        <div style="font-weight:900;letter-spacing:.5px;text-transform:uppercase;color:#64748b;font-size:11px;margin-bottom:6px;">🎯 Roles assigned</div>
        ${rolesHtml}
      </div>`);
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
    /* Audit log — fire-and-forget after the .eml is in the user's hands */
    logEmailSent({ methodUsed: "outlook", attachmentCount: attachments.length });
    setTimeout(() => onClose?.(), 5000);
  }

  async function generateAndUploadPdf() {
    setProgress("⏳ Generating PDF...");
    const { blob, filename } = await config.generatePdf(payload, { sortBy, groupBy, classification });
    setProgress("☁️ Uploading PDF (Cloudinary)...");
    const pdfUrl = await uploadPdfBlob(blob, filename);
    return { blob, pdfUrl, filename };
  }

  async function sendViaWhatsapp() {
    const { pdfUrl } = await generateAndUploadPdf();
    setProgress("💬 Opening WhatsApp...");
    let body = config.buildText(payload, { note, pdfUrl, includeTable, sortBy, groupBy });
    if (scheduleAt) body = `📅 Scheduled: ${new Date(scheduleAt).toLocaleString("en-GB", { timeZone: "Asia/Dubai" })}\n\n` + body;
    body += buildSignatureText(settings);
    const text = `*${subject.trim()}*\n\n${body}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setInfo("💬 WhatsApp Web فُتح — اختر المستلم وأرسل.");
    pushRecipientHistory([...toList, ...ccList]);
    logEmailSent({ methodUsed: "whatsapp", attachmentCount: 1 });
    setTimeout(() => onClose?.(), 1800);
  }

  async function sendViaCopy() {
    const { pdfUrl } = await generateAndUploadPdf();
    setProgress("📋 Copying to clipboard...");
    let body = config.buildText(payload, { note, pdfUrl, includeTable, sortBy, groupBy });
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
      logEmailSent({ methodUsed: "copy", attachmentCount: 1 });
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

        {/* ===== Quick Actions / Templates ===== */}
        {templates.length > 0 && (
          <div style={{ marginTop: 14, padding: "10px 12px", background: "linear-gradient(135deg,#f5f3ff,#eef2ff)", border: "1px solid #c7d2fe", borderRadius: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#4338ca", letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 8 }}>
              ⚡ Quick Actions
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {templates.slice(0, 6).map((t) => (
                <button key={t.id} type="button" onClick={() => applyTemplate(t)} disabled={busy}
                  style={{
                    padding: "6px 12px", background: "#fff", color: "#3730a3",
                    border: "1px solid #c7d2fe", borderRadius: 999,
                    fontWeight: 800, fontSize: 12, cursor: busy ? "not-allowed" : "pointer",
                    fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5,
                  }}
                  title={`Apply template: ${t.name}`}>
                  {t.icon} {t.name}
                </button>
              ))}
              {templates.length > 6 && (
                <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>
                  +{templates.length - 6} more in ⚙️ Settings
                </span>
              )}
            </div>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={styles.field}>
            <label style={styles.label}>📅 Schedule reminder</label>
            <input
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              style={styles.input}
              disabled={busy}
            />
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
          <div style={styles.field}>
            <label style={styles.label}>🔒 Classification</label>
            <select value={classification} onChange={(e) => setClassification(e.target.value)}
              style={{
                ...styles.input,
                background: getClassification(classification).bg,
                color: getClassification(classification).color,
                fontWeight: 800,
                borderColor: getClassification(classification).border,
              }} disabled={busy}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== Recipient Roles (collapsible) ===== */}
        {needsRecipients && (to.length + cc.length + bcc.length) > 0 && (
          <div style={{ ...styles.field, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
            <button type="button" onClick={() => setShowRoles((v) => !v)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              <span style={{ fontWeight: 800, fontSize: 13, color: "#334155" }}>
                🎯 Recipient Roles
                <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b", marginInlineStart: 8 }}>
                  ({Object.values(recipientRoles).filter((r) => r && r !== "none").length} assigned)
                </span>
              </span>
              <span style={{ color: "#64748b", fontSize: 12 }}>{showRoles ? "▲" : "▼"}</span>
            </button>
            {showRoles && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: "#64748b" }}>اضغط على الدور بجانب كل مستلم للتدوير بين الأدوار.</div>
                {[...to, ...cc, ...bcc].map((email) => {
                  const key = String(email).toLowerCase();
                  const found = contacts.find((c) => c.email.toLowerCase() === key);
                  const role = getRole(recipientRoles[key] || "none");
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                      <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {found?.name ? `${found.name} <${email}>` : email}
                      </span>
                      <button type="button" onClick={() => cycleRole(email)} disabled={busy}
                        style={{
                          padding: "3px 10px", borderRadius: 6,
                          background: role.bg, color: role.color,
                          border: `1px solid ${role.color}40`,
                          fontWeight: 800, fontSize: 11, cursor: busy ? "not-allowed" : "pointer",
                          fontFamily: "inherit", whiteSpace: "nowrap",
                        }}>
                        {role.label}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== Attachment Manager (collapsible) ===== */}
        {(() => {
          const allImages = (config?.getImages?.(payload) || []).filter(Boolean);
          if (allImages.length === 0) return null;
          const selectedCount = allImages.filter((u) => imageSelection[u] !== false).length;
          return (
            <div style={{ ...styles.field, padding: "10px 12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              <button type="button" onClick={() => setShowAttachments((v) => !v)}
                style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: "#334155" }}>
                  📎 Attachments
                  <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b", marginInlineStart: 8 }}>
                    ({selectedCount} / {allImages.length + 1} selected · 1 PDF auto + {selectedCount} photos)
                  </span>
                </span>
                <span style={{ color: "#64748b", fontSize: 12 }}>{showAttachments ? "▲" : "▼"}</span>
              </button>
              {showAttachments && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                    PDF التقرير يُرفق دائماً. اختر الصور المراد إرفاقها (افتراضياً: الكل).
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <button type="button" onClick={() => {
                      const all = {};
                      for (const u of allImages) all[u] = true;
                      setImageSelection(all);
                    }} style={{ padding: "4px 10px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      ☑ Select All
                    </button>
                    <button type="button" onClick={() => {
                      const none = {};
                      for (const u of allImages) none[u] = false;
                      setImageSelection(none);
                    }} style={{ padding: "4px 10px", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      ☐ Deselect All
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                    {allImages.map((url, i) => {
                      const checked = imageSelection[url] !== false;
                      const filename = (url.split("/").pop() || `photo_${i + 1}`).split("?")[0];
                      return (
                        <label key={url} style={{
                          position: "relative", border: `2px solid ${checked ? "#16a34a" : "#cbd5e1"}`,
                          borderRadius: 8, overflow: "hidden", cursor: "pointer",
                          background: "#fff", opacity: checked ? 1 : 0.5,
                        }}>
                          <input type="checkbox" checked={checked}
                            onChange={(e) => setImageSelection((m) => ({ ...m, [url]: e.target.checked }))}
                            style={{ position: "absolute", top: 4, left: 4, zIndex: 2, width: 18, height: 18, accentColor: "#16a34a" }} />
                          <img src={url} alt={filename}
                            style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }}
                            onError={(e) => { e.target.style.background = "#fee2e2"; }} />
                          <div style={{ padding: "4px 6px", fontSize: 10, color: "#475569", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {filename}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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

        {/* ===== Sort / Group controls — apply to PDF + email table ===== */}
        <div style={{ ...styles.field, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            🗂️ ترتيب البنود في التقرير
            <span style={{ fontWeight: 600, fontSize: 11, color: "#64748b" }}>
              (يطبَّق على PDF والجدول داخل الإيميل)
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                ↕️ فرز حسب
              </label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                disabled={busy} style={styles.input}>
                <option value="default">— الترتيب الأصلي —</option>
                <option value="branch">🏪 الفرع / POS</option>
                <option value="action">🎯 الإجراء</option>
                <option value="origin">🌍 المنشأ</option>
                <option value="product">📦 اسم المنتج</option>
                <option value="expiry">📅 تاريخ الانتهاء</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                📂 تجميع حسب
              </label>
              <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                disabled={busy} style={styles.input}>
                <option value="none">— بدون تجميع —</option>
                <option value="branch">🏪 الفرع / POS</option>
                <option value="action">🎯 الإجراء</option>
                <option value="origin">🌍 المنشأ</option>
              </select>
            </div>
          </div>
          {(sortBy !== "default" || groupBy !== "none") && (
            <div style={{ fontSize: 11, color: "#1e40af", fontWeight: 700, marginTop: 8, padding: "6px 10px", background: "#eff6ff", borderRadius: 6 }}>
              ✓ سيُطبَّق على البنود قبل إنشاء الملف.
            </div>
          )}
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

        {/* ===== Save-as-template inline form ===== */}
        {showSaveTemplate && (
          <div style={{ marginTop: 14, padding: "12px 14px", background: "#f5f3ff", border: "1px dashed #c4b5fd", borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#4338ca", marginBottom: 6 }}>
              💾 احفظ هذا الإعداد كقالب لاستخدامه لاحقاً بضغطة وحدة
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="اسم القالب (مثلاً: تقرير يومي للمدراء)"
                style={{ ...styles.input, flex: 1 }}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveAsTemplate(); }} />
              <button type="button" onClick={handleSaveAsTemplate}
                style={{ ...styles.btnPrimary, padding: "9px 16px", fontSize: 13 }}>
                Save
              </button>
              <button type="button" onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }}
                style={{ ...styles.btnGhost, padding: "9px 14px", fontSize: 13 }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ ...styles.actions, justifyContent: "space-between" }}>
          <button type="button" onClick={() => setShowSaveTemplate(true)} disabled={busy || showSaveTemplate}
            style={{ ...styles.btnGhost, fontSize: 12, padding: "8px 14px", color: "#7c3aed", borderColor: "#c4b5fd", ...(busy ? styles.btnDisabled : {}) }}>
            💾 Save as template
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} disabled={busy} style={{ ...styles.btnGhost, ...(busy ? styles.btnDisabled : {}) }}>
              إغلاق
            </button>
            <button onClick={handleSend} disabled={!canSend}
              style={{ ...styles.btnPrimary, ...(canSend ? {} : styles.btnDisabled) }}>
              {sendLabel}
            </button>
          </div>
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
