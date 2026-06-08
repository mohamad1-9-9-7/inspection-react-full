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
  updateContactGroups,
  listGroupsFromContacts,
  removeLocalContact,
  isValidEmail,
  CLASSIFICATIONS,
  loadTemplates,
  saveTemplate,
  deleteTemplate,
} from "./emailReportSettings";
import { uploadImageToServer } from "../monitor/branches/shipment_recc/qcsRawApi";
import { sanitizeHtml } from "../../utils/sanitizeHtml";

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
  embeddedWrap: {
    padding: "20px 24px", color: "#0f172a", fontFamily: "Inter,Roboto,Cairo,sans-serif",
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

export default function EmailSettingsPanel({ open, onClose, onSaved, embedded = false }) {
  const [s, setS] = useState(() => loadEmailSettings());
  const [history, setHistory] = useState([]);
  const [savedFlash, setSavedFlash] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [newContact, setNewContact] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactGroups, setNewContactGroups] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [contactBusy, setContactBusy] = useState(false);
  const [contactErr, setContactErr] = useState("");

  /* Inline group editor: tracks which contact's groups are being edited */
  const [editingGroupsFor, setEditingGroupsFor] = useState(null);
  const [editingGroupsValue, setEditingGroupsValue] = useState("");

  const [templates, setTemplates] = useState([]);

  const reloadContacts = () => listEmailContacts().then(setContacts).catch(() => {});

  useEffect(() => {
    if (open) {
      setS(loadEmailSettings());
      setHistory(loadRecipientHistory());
      setNewContact("");
      setContactErr("");
      setEditingGroupsFor(null);
      setTemplates(loadTemplates());
      reloadContacts();
    }
  }, [open]);

  async function handleAddContact() {
    const e = newContact.trim();
    const n = newContactName.trim();
    const g = newContactGroups.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    setContactErr("");
    if (!isValidEmail(e)) { setContactErr("صيغة الإيميل غير صحيحة / Invalid email"); return; }
    setContactBusy(true);
    try {
      await addEmailContact(e, n, g);
      setNewContact("");
      setNewContactName("");
      setNewContactGroups("");
      await reloadContacts();
    } catch (ex) {
      setContactErr(ex?.message || "فشل الحفظ / Save failed");
    } finally {
      setContactBusy(false);
    }
  }

  function startEditGroups(c) {
    setEditingGroupsFor(c.email);
    setEditingGroupsValue((c.groups || []).join(", "));
  }
  async function saveEditGroups() {
    const g = editingGroupsValue.split(/[,;]+/).map((x) => x.trim()).filter(Boolean);
    await updateContactGroups(editingGroupsFor, g);
    setEditingGroupsFor(null);
    setEditingGroupsValue("");
    await reloadContacts();
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
    if (embedded) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    } else {
      onClose?.();
    }
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

  const content = (
    <>
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
            كل جهة اتصال = <b>اسم شائع</b> + إيميل. تقدر تبحث وقت الإرسال بأي منهما.
          </div>

          {/* Add new — three fields side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr auto", gap: 8, marginTop: 8 }}>
            <input
              style={styles.input}
              placeholder="🏷️ الاسم الشائع"
              value={newContactName}
              disabled={contactBusy}
              onChange={(e) => setNewContactName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
            />
            <input
              style={styles.input}
              placeholder="✉️ email@almawashi.ae"
              value={newContact}
              disabled={contactBusy}
              onChange={(e) => setNewContact(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
            />
            <input
              style={styles.input}
              placeholder="📁 Groups (comma-separated)"
              value={newContactGroups}
              disabled={contactBusy}
              onChange={(e) => setNewContactGroups(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddContact(); } }}
              title="مثلاً: QA Team, Management"
            />
            <button
              type="button"
              onClick={handleAddContact}
              disabled={contactBusy || !newContact.trim()}
              style={{ ...styles.btnPrimary, opacity: (contactBusy || !newContact.trim()) ? 0.5 : 1, whiteSpace: "nowrap" }}
            >
              {contactBusy ? "…" : "+ Add"}
            </button>
          </div>
          {contactErr && <div style={{ ...styles.meta, color: "#dc2626", fontWeight: 700 }}>{contactErr}</div>}

          {/* Search box */}
          {contacts.length > 3 && (
            <div style={{ position: "relative", marginTop: 12 }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none", color: "#94a3b8" }}>🔍</span>
              <input
                style={{ ...styles.input, paddingLeft: 32 }}
                placeholder="ابحث بالاسم أو الإيميل…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
            </div>
          )}

          {contacts.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, maxHeight: 240, overflowY: "auto" }}>
              {(() => {
                const q = contactSearch.trim().toLowerCase();
                const filtered = q
                  ? contacts.filter((c) =>
                      (c.email || "").toLowerCase().includes(q) ||
                      (c.name || "").toLowerCase().includes(q)
                    )
                  : contacts;
                if (filtered.length === 0) {
                  return <div style={{ ...styles.meta, marginTop: 4 }}>لا نتائج مطابقة.</div>;
                }
                return filtered.map((c) => {
                  const isEditing = editingGroupsFor === c.email;
                  return (
                  <div key={c.email} style={{
                    display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between",
                    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
                    padding: "8px 12px", flexWrap: "wrap",
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                        {c.name || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>بدون اسم</span>}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 11, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {c.email}
                      </div>
                      {/* Group chips or inline editor */}
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                          <input
                            style={{ ...styles.input, padding: "5px 8px", fontSize: 12, flex: 1 }}
                            placeholder="Groups, comma-separated"
                            value={editingGroupsValue}
                            autoFocus
                            onChange={(e) => setEditingGroupsValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEditGroups(); if (e.key === "Escape") setEditingGroupsFor(null); }}
                          />
                          <button type="button" onClick={saveEditGroups}
                            style={{ ...styles.btnPrimary, padding: "5px 10px", fontSize: 11 }}>حفظ</button>
                          <button type="button" onClick={() => setEditingGroupsFor(null)}
                            style={{ ...styles.btnGhost, padding: "5px 10px", fontSize: 11 }}>إلغاء</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                          {(c.groups || []).map((g) => (
                            <span key={g} style={{
                              display: "inline-flex", alignItems: "center",
                              padding: "1px 7px", borderRadius: 999,
                              background: "#fef3c7", color: "#92400e",
                              border: "1px solid #fcd34d", fontWeight: 700, fontSize: 10,
                            }}>@{g}</span>
                          ))}
                          <button type="button" onClick={() => startEditGroups(c)}
                            style={{ background: "none", border: "1px dashed #cbd5e1", borderRadius: 999,
                              padding: "1px 8px", fontSize: 10, color: "#64748b", cursor: "pointer", fontWeight: 700 }}>
                            {(c.groups || []).length ? "✏️ تعديل" : "+ Group"}
                          </button>
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => handleRemoveContact(c.email)}
                      style={{ border: "none", background: "#fee2e2", color: "#991b1b", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 800, fontSize: 12 }}
                      title="حذف">حذف</button>
                  </div>
                  );
                });
              })()}
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
            <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(buildSignatureHtml(s) || "<em style='color:#94a3b8'>لا يوجد توقيع.</em>") }} />
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
          <div style={styles.field}>
            <label style={styles.label}>🔒 Default Classification</label>
            <select style={styles.input} value={s.defaultClassification || "internal"}
              onChange={(e) => set("defaultClassification", e.target.value)}>
              {CLASSIFICATIONS.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <div style={styles.meta}>
              يحدّد البانر الافتراضي عند فتح المودال. تقدر تغيّره لكل إيميل قبل الإرسال.
            </div>
          </div>
          <label style={styles.check}>
            <input type="checkbox" checked={s.requestReadReceipt}
              onChange={(e) => set("requestReadReceipt", e.target.checked)} />
            Request read receipt (relies on recipient's mail client — free, no tracking)
          </label>
        </div>

        {/* === Templates === */}
        <div style={styles.section}>
          <div style={styles.sectionH}>📝 Email Templates ({templates.length})</div>
          <div style={styles.meta}>
            القوالب تظهر كأزرار سريعة فوق مودال الإرسال — ضغطة وحدة تعبّي كل الحقول. أنشئ قالب من المودال نفسه بـ "💾 Save current as template".
          </div>
          {templates.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, maxHeight: 200, overflowY: "auto" }}>
              {templates.map((t) => (
                <div key={t.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 8, padding: "8px 12px",
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 13 }}>
                      {t.icon} {t.name}
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                      To: {(t.toEmails?.length || 0) + (t.toGroups?.length || 0)} ·
                      CC: {(t.ccEmails?.length || 0) + (t.ccGroups?.length || 0)}
                      {t.toGroups?.length ? ` · 📁 ${t.toGroups.join(", ")}` : ""}
                    </div>
                  </div>
                  <button type="button" onClick={() => { deleteTemplate(t.id); setTemplates(loadTemplates()); }}
                    style={{ ...styles.btnDanger, padding: "4px 10px", fontSize: 11 }}>
                    حذف
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ ...styles.meta, marginTop: 8, padding: "12px", background: "#f8fafc", borderRadius: 8, textAlign: "center" }}>
              لا توجد قوالب بعد. افتح إيميل وعبّي البيانات، ثم اضغط "💾 Save as template".
            </div>
          )}
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
            <button onClick={handleClearHistory} style={{ ...styles.btnDanger, marginTop: 8 }} data-delete-action="true">
              Clear history
            </button>
          </div>
        )}

        <div style={styles.actions}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleReset} style={styles.btnDanger} data-delete-action="true">↺ Reset to defaults</button>
            {!embedded && (
              <button type="button"
                onClick={() => { onClose?.(); window.location.href = "/email-center"; }}
                style={{ ...styles.btnGhost, color: "#7c3aed", borderColor: "#c4b5fd", padding: "8px 14px", fontSize: 12 }}>
                📨 Email Center →
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {embedded && savedFlash && (
              <span style={{ color: "#16a34a", fontWeight: 800, fontSize: 13 }}>✅ تم الحفظ</span>
            )}
            {!embedded && <button onClick={onClose} style={styles.btnGhost}>إلغاء</button>}
            <button onClick={handleSave} style={styles.btnPrimary}>💾 Save Settings</button>
          </div>
        </div>
    </>
  );

  if (embedded) {
    return <div style={styles.embeddedWrap}>{content}</div>;
  }
  return (
    <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={styles.modal}>{content}</div>
    </div>
  );
}
