// EmailSettingsPanel.jsx
// Modal panel for configuring persistent email settings.

import React, { useEffect, useState } from "react";
import {
  loadEmailSettings,
  saveEmailSettings,
  resetEmailSettings,
  buildSignatureHtml,
  PRIORITY_VALUES,
  PRIORITY_LABELS,
  loadRecipientHistory,
  clearRecipientHistory,
  listEmailContacts,
  addEmailContact,
  removeLocalContact,
  isValidEmail,
} from "./emailReportSettings";
import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";

const styles = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
    zIndex: 10020, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  },
  modal: {
    width: "min(720px, 96vw)", maxHeight: "94vh", overflow: "auto",
    background: "#fff", borderRadius: 16, boxShadow: "0 28px 56px rgba(0,0,0,.32)",
    padding: 22, color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  title:   { margin: 0, fontSize: 20, fontWeight: 900, color: "#0f172a" },
  sub:     { marginTop: 4, fontSize: 13, color: "#475569" },
  section: { marginTop: 18 },
  sectionH: { fontSize: 13, fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, paddingBottom: 4, borderBottom: "1px solid #e2e8f0" },
  field:   { marginTop: 10 },
  label:   { display: "block", fontWeight: 800, fontSize: 12, color: "#334155", marginBottom: 4 },
  input:   { width: "100%", padding: "9px 11px", border: "1px solid #94a3b8", borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box" },
  textarea: { width: "100%", padding: "9px 11px", border: "1px solid #94a3b8", borderRadius: 8, outline: "none", fontSize: 13, minHeight: 70, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" },
  meta:    { fontSize: 11, color: "#64748b", marginTop: 4 },
  twoCol:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  check:   { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer", padding: "6px 0" },
  preview: { marginTop: 10, padding: 14, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10 },
  imgBox:  { display: "flex", alignItems: "center", gap: 10, marginTop: 6 },
  img:     { maxHeight: 64, maxWidth: 180, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", padding: 4 },
  actions: { marginTop: 22, display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" },
  btnPrimary: { padding: "10px 18px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14 },
  btnGhost:   { padding: "10px 18px", background: "#fff", color: "#334155", border: "1px solid #cbd5e1", borderRadius: 10, fontWeight: 800, cursor: "pointer", fontSize: 14 },
  btnDanger:  { padding: "8px 14px", background: "#fff", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 12 },
  btnLink:    { background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: 700, padding: "4px 6px" },
};

export default function EmailSettingsPanel({ open, onClose, onSaved }) {
  const [s, setS] = useState(() => loadEmailSettings());
  const [history, setHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactErr, setContactErr] = useState("");

  const reloadContacts = () => listEmailContacts().then(setContacts).catch(() => {});

  useEffect(() => {
    if (open) {
      setS(loadEmailSettings());
      setHistory(loadRecipientHistory());
      setNewContact("");
      setContactErr("");
      reloadContacts();
    }
  }, [open]);

  async function handleAddContact() {
    const e = newContact.trim();
    setContactErr("");
    if (!isValidEmail(e)) { setContactErr("صيغة الإيميل غير صحيحة / Invalid email"); return; }
    setContactBusy(true);
    try {
      await addEmailContact(e);
      setNewContact("");
      await reloadContacts();
    } catch (ex) {
      setContactErr(ex?.message || "فشل الحفظ / Save failed");
    } finally {
      setContactBusy(false);
    }
  }

  function handleRemoveContact(email) {
    if (!window.confirm(`حذف ${email} من القائمة المحلية؟`)) return;
    removeLocalContact(email);
    reloadContacts();
  }

  if (!open) return null;

  const set = (k, v) => setS((cur) => ({ ...cur, [k]: v }));

  async function handleUploadImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImageToServer(file, "qcs_email_signature");
      set("signatureImageUrl", url);
    } catch (err) {
      alert("فشل رفع الصورة: " + (err?.message || err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function handleSave() {
    saveEmailSettings(s);
    onSaved?.(s);
    onClose?.();
  }

  function handleReset() {
    if (!window.confirm("Reset all email settings to defaults?")) return;
    const def = resetEmailSettings();
    setS(def);
  }

  function handleClearHistory() {
    if (!window.confirm("Clear saved recipient history?")) return;
    clearRecipientHistory();
    setHistory([]);
  }

  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={styles.modal}>
        <h3 style={styles.title}>⚙️ Email Settings</h3>
        <div style={styles.sub}>إعدادات تنطبق على كل التقارير. تُحفظ محلياً.</div>

        {/* === Default Recipients === */}
        <div style={styles.section}>
          <div style={styles.sectionH}>👥 Default Recipients</div>
          <div style={styles.field}>
            <label style={styles.label}>Default To</label>
            <input style={styles.input} value={s.defaultTo}
              onChange={(e) => set("defaultTo", e.target.value)}
              placeholder="manager@almawashi.ae" />
          </div>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>Default CC (always)</label>
              <input style={styles.input} value={s.defaultCc}
                onChange={(e) => set("defaultCc", e.target.value)}
                placeholder="qa@almawashi.ae, ops@almawashi.ae" />
              <div style={styles.meta}>افصل بفاصلة لأكثر من إيميل.</div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Default BCC</label>
              <input style={styles.input} value={s.defaultBcc}
                onChange={(e) => set("defaultBcc", e.target.value)}
                placeholder="(اختياري)" />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Subject Prefix</label>
            <input style={styles.input} value={s.subjectPrefix}
              onChange={(e) => set("subjectPrefix", e.target.value)}
              placeholder="[QA-URGENT] " />
            <div style={styles.meta}>يُضاف لبداية كل subject تلقائياً.</div>
          </div>
        </div>

        {/* === Email Contacts (server-saved) === */}
        <div style={styles.section}>
          <div style={styles.sectionH}>📇 Email Contacts ({contacts.length})</div>
          <div style={styles.meta}>
            هذه القائمة هي مصدر الإيميلات في To/CC/BCC. الإضافة من هنا فقط — تُحفظ على السيرفر.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginTop: 8 }}>
            <input
              style={styles.input}
              placeholder="email@almawashi.ae"
              value={newContact}
              disabled={contactBusy}
              onChange={(e) => setNewContact(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
            />
            <button
              type="button"
              onClick={handleAddContact}
              disabled={contactBusy || !newContact.trim()}
              style={{ ...styles.btnPrimary, opacity: (contactBusy || !newContact.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}
            >
              {contactBusy ? "…" : "+ Add Email"}
            </button>
          </div>
          {contactErr && <div style={{ ...styles.meta, color: "#dc2626", fontWeight: 700 }}>{contactErr}</div>}
          {contacts.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {contacts.map((c) => (
                <span key={c} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe",
                  borderRadius: 999, padding: "4px 6px 4px 10px", fontSize: 12, fontWeight: 700,
                }}>
                  {c}
                  <button type="button" onClick={() => handleRemoveContact(c)}
                    style={{ border: "none", background: "rgba(0,0,0,.08)", color: "#3730a3", borderRadius: 999, width: 18, height: 18, cursor: "pointer", lineHeight: "16px", fontWeight: 900, fontSize: 12, padding: 0 }}
                    title="حذف">×</button>
                </span>
              ))}
            </div>
          ) : (
            <div style={{ ...styles.meta, marginTop: 8 }}>لا يوجد إيميلات محفوظة بعد.</div>
          )}
        </div>

        {/* === Signature === */}
        <div style={styles.section}>
          <div style={styles.sectionH}>✍️ Email Signature</div>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>Name</label>
              <input style={styles.input} value={s.signatureName}
                onChange={(e) => set("signatureName", e.target.value)}
                placeholder="Mohammad Abdullah" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Title / Position</label>
              <input style={styles.input} value={s.signatureTitle}
                onChange={(e) => set("signatureTitle", e.target.value)}
                placeholder="QA Manager" />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Company</label>
            <input style={styles.input} value={s.signatureCompany}
              onChange={(e) => set("signatureCompany", e.target.value)} />
          </div>
          <div style={styles.twoCol}>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input style={styles.input} value={s.signaturePhone}
                onChange={(e) => set("signaturePhone", e.target.value)}
                placeholder="+971 ..." />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input style={styles.input} value={s.signatureEmail}
                onChange={(e) => set("signatureEmail", e.target.value)}
                placeholder="m.abdullah@almawashi.ae" />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Signature Image / Logo (اختياري)</label>
            <div style={styles.imgBox}>
              {s.signatureImageUrl ? (
                <>
                  <img src={s.signatureImageUrl} alt="signature" style={styles.img} />
                  <button onClick={() => set("signatureImageUrl", "")} style={styles.btnDanger}>✕ Remove</button>
                </>
              ) : (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>لا توجد صورة بعد.</span>
              )}
              <label style={{ ...styles.btnGhost, fontSize: 12, padding: "6px 12px", cursor: uploading ? "wait" : "pointer" }}>
                {uploading ? "⏳ Uploading..." : "📤 Upload"}
                <input type="file" accept="image/*" onChange={handleUploadImage} style={{ display: "none" }} disabled={uploading} />
              </label>
            </div>
          </div>

          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "#2563eb", fontWeight: 700 }}>
              Advanced: Custom HTML signature (overrides fields above)
            </summary>
            <div style={styles.field}>
              <textarea style={styles.textarea} value={s.signatureCustomHtml}
                onChange={(e) => set("signatureCustomHtml", e.target.value)}
                placeholder="<div>...your custom HTML...</div>" />
            </div>
          </details>

          {/* Signature preview */}
          <div style={styles.preview}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 6 }}>PREVIEW</div>
            <div dangerouslySetInnerHTML={{ __html: buildSignatureHtml(s) || "<em style='color:#94a3b8'>لا يوجد توقيع.</em>" }} />
          </div>
        </div>

        {/* === Behaviour === */}
        <div style={styles.section}>
          <div style={styles.sectionH}>⚙️ Behaviour</div>
          <div style={styles.field}>
            <label style={styles.label}>Default Priority</label>
            <select style={styles.input} value={s.priority}
              onChange={(e) => set("priority", e.target.value)}>
              {PRIORITY_VALUES.map((v) => (
                <option key={v} value={v}>{PRIORITY_LABELS[v]}</option>
              ))}
            </select>
          </div>
          <label style={styles.check}>
            <input type="checkbox" checked={s.requestReadReceipt}
              onChange={(e) => set("requestReadReceipt", e.target.checked)} />
            Request read receipt (Disposition-Notification-To)
          </label>
          <label style={styles.check}>
            <input type="checkbox" checked={s.confidentialityNote}
              onChange={(e) => set("confidentialityNote", e.target.checked)} />
            Add "Internal Use Only" confidentiality banner
          </label>
        </div>

        {/* === Recipient History === */}
        {history.length > 0 && (
          <div style={styles.section}>
            <div style={styles.sectionH}>📜 Recent Recipients ({history.length})</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 12 }}>
              {history.slice(0, 12).map((e, i) => (
                <span key={i} style={{ padding: "3px 8px", background: "#f1f5f9", borderRadius: 4, color: "#475569" }}>{e}</span>
              ))}
              {history.length > 12 && <span style={{ color: "#94a3b8", fontSize: 11 }}>+{history.length - 12} more</span>}
            </div>
            <button onClick={handleClearHistory} style={{ ...styles.btnDanger, marginTop: 8 }}>
              Clear history
            </button>
          </div>
        )}

        <div style={styles.actions}>
          <button onClick={handleReset} style={styles.btnDanger}>↺ Reset to defaults</button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={styles.btnGhost}>إلغاء</button>
            <button onClick={handleSave} style={styles.btnPrimary}>💾 Save Settings</button>
          </div>
        </div>
      </div>
    </div>
  );
}
