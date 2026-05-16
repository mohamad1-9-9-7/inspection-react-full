// ContactPicker.jsx
// Select recipients from server-saved contacts only. Add-new saves to server.

import React, { useMemo, useState } from "react";
import { addEmailContact, isValidEmail } from "./emailReportSettings";

const styles = {
  wrap: { marginTop: 4 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe",
    borderRadius: 999, padding: "4px 6px 4px 10px", fontSize: 12, fontWeight: 700,
  },
  chipX: {
    border: "none", background: "rgba(0,0,0,.08)", color: "#3730a3",
    borderRadius: 999, width: 18, height: 18, cursor: "pointer",
    lineHeight: "16px", fontWeight: 900, fontSize: 12, padding: 0,
  },
  row: { display: "grid", gridTemplateColumns: "1fr auto", gap: 8 },
  select: {
    width: "100%", padding: "9px 11px", border: "1px solid #94a3b8",
    borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box", background: "#fff",
  },
  addWrap: { display: "grid", gridTemplateColumns: "1fr auto", gap: 6, marginTop: 6 },
  input: {
    width: "100%", padding: "9px 11px", border: "1px solid #94a3b8",
    borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box",
  },
  btn: {
    padding: "9px 12px", background: "#16a34a", color: "#fff", border: "none",
    borderRadius: 8, fontWeight: 800, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  err: { color: "#dc2626", fontSize: 11, marginTop: 4, fontWeight: 700 },
  empty: { fontSize: 11, color: "#94a3b8", padding: "4px 0" },
};

/**
 * Props:
 *  - label
 *  - value: string[]  (selected emails)
 *  - onChange(string[])
 *  - contacts: string[]  (saved contacts)
 *  - onContactsChange()  (called after a new contact is saved → parent refetches)
 *  - disabled
 *  - allowAdd (default true)
 */
export default function ContactPicker({
  label, value = [], onChange, contacts = [],
  onContactsChange, disabled = false, allowAdd = true,
}) {
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const safeValue = Array.isArray(value)
    ? value
    : (typeof value === "string"
        ? value.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
        : []);
  const safeContacts = Array.isArray(contacts) ? contacts : [];

  const available = useMemo(() => {
    const sel = new Set(safeValue.map((v) => String(v).toLowerCase()));
    return safeContacts.filter((c) => !sel.has(String(c).toLowerCase()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeContacts, safeValue]);

  function addSelected(email) {
    if (!email) return;
    if (safeValue.some((v) => String(v).toLowerCase() === email.toLowerCase())) return;
    onChange([...safeValue, email]);
  }

  function removeChip(email) {
    onChange(safeValue.filter((v) => String(v).toLowerCase() !== email.toLowerCase()));
  }

  async function handleAddNew() {
    const e = newEmail.trim();
    setErr("");
    if (!isValidEmail(e)) { setErr("صيغة الإيميل غير صحيحة"); return; }
    setAdding(true);
    try {
      const saved = await addEmailContact(e);
      setNewEmail("");
      onContactsChange?.();
      addSelected(saved);
    } catch (ex) {
      setErr(ex?.message || "فشل الحفظ");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={styles.wrap}>
      {label && (
        <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 6 }}>
          {label}
        </label>
      )}

      {safeValue.length > 0 && (
        <div style={styles.chips}>
          {safeValue.map((e) => (
            <span key={e} style={styles.chip}>
              {e}
              <button type="button" style={styles.chipX} disabled={disabled}
                onClick={() => removeChip(e)} title="Remove">×</button>
            </span>
          ))}
        </div>
      )}

      <div style={styles.row}>
        <select
          style={styles.select}
          disabled={disabled}
          value=""
          onChange={(e) => { addSelected(e.target.value); e.target.value = ""; }}
        >
          <option value="">
            {available.length ? "— اختر من المحفوظين —" : "لا يوجد محفوظين بعد"}
          </option>
          {available.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {allowAdd && (
        <>
          <div style={styles.addWrap}>
            <input
              style={styles.input}
              placeholder="إضافة إيميل جديد (يُحفظ على السيرفر)..."
              value={newEmail}
              disabled={disabled || adding}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNew(); } }}
            />
            <button
              type="button"
              onClick={handleAddNew}
              disabled={disabled || adding || !newEmail.trim()}
              style={{ ...styles.btn, ...(disabled || adding || !newEmail.trim() ? styles.btnDisabled : {}) }}
            >
              {adding ? "..." : "+ Add"}
            </button>
          </div>
          {err && <div style={styles.err}>{err}</div>}
        </>
      )}
    </div>
  );
}
