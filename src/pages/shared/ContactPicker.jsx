// ContactPicker.jsx
// Searchable contact picker — find recipients by friendly name OR email.
// Each contact is { email, name }. Backward-compat: bare strings auto-upgrade.

import React, { useMemo, useState, useRef, useEffect } from "react";
import { addEmailContact, isValidEmail, listGroupsFromContacts, expandGroup } from "./emailReportSettings";

const styles = {
  wrap: { marginTop: 4 },
  chips: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6,
    background: "#eef2ff", color: "#3730a3", border: "1px solid #c7d2fe",
    borderRadius: 999, padding: "4px 6px 4px 10px", fontSize: 12, fontWeight: 700,
  },
  chipName: { fontWeight: 800 },
  chipEmail: { opacity: 0.7, fontWeight: 600, fontSize: 11 },
  chipX: {
    border: "none", background: "rgba(0,0,0,.08)", color: "#3730a3",
    borderRadius: 999, width: 18, height: 18, cursor: "pointer",
    lineHeight: "16px", fontWeight: 900, fontSize: 12, padding: 0,
  },
  searchBox: { position: "relative" },
  search: {
    width: "100%", padding: "9px 11px 9px 32px", border: "1px solid #94a3b8",
    borderRadius: 8, outline: "none", fontSize: 13, boxSizing: "border-box", background: "#fff",
  },
  searchIcon: {
    position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
    fontSize: 14, pointerEvents: "none", color: "#94a3b8",
  },
  dropdown: {
    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
    background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8,
    marginTop: 4, maxHeight: 240, overflowY: "auto",
    boxShadow: "0 8px 18px rgba(0,0,0,.10)",
  },
  option: (focused) => ({
    padding: "9px 12px", cursor: "pointer",
    background: focused ? "#eff6ff" : "#fff",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 13,
  }),
  optionName: { fontWeight: 800, color: "#0f172a" },
  optionEmail: { color: "#64748b", fontSize: 11, marginTop: 2 },
  optionEmpty: { padding: "12px", color: "#94a3b8", fontSize: 12, textAlign: "center" },
  addWrap: {
    display: "grid", gridTemplateColumns: "1.2fr 1fr auto", gap: 6, marginTop: 8,
    padding: 8, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 8,
  },
  input: {
    width: "100%", padding: "8px 10px", border: "1px solid #94a3b8",
    borderRadius: 6, outline: "none", fontSize: 12, boxSizing: "border-box",
  },
  btn: {
    padding: "8px 12px", background: "#16a34a", color: "#fff", border: "none",
    borderRadius: 6, fontWeight: 800, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap",
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  err: { color: "#dc2626", fontSize: 11, marginTop: 4, fontWeight: 700 },
};

/* Highlight matching parts of a string */
function highlight(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const idx = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: "#fef08a", padding: 0 }}>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/**
 * Props:
 *  - label
 *  - value: string[] (selected emails — for backward compatibility)
 *  - onChange(string[])
 *  - contacts: Array<{email, name}> or string[] (legacy — auto-upgraded)
 *  - onContactsChange()  (parent refetches after save)
 *  - disabled
 *  - allowAdd (default true)
 */
export default function ContactPicker({
  label, value = [], onChange, contacts = [],
  onContactsChange, disabled = false, allowAdd = true,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(0);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const wrapRef = useRef(null);

  const safeValue = Array.isArray(value)
    ? value
    : (typeof value === "string"
        ? value.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
        : []);

  /* Normalize contacts: accept either string[] or {email,name,groups}[] */
  const normContacts = useMemo(
    () =>
      (Array.isArray(contacts) ? contacts : [])
        .map((c) => (typeof c === "string"
          ? { email: c.trim(), name: "", groups: [] }
          : {
              email: String(c?.email || "").trim(),
              name: String(c?.name || "").trim(),
              groups: Array.isArray(c?.groups) ? c.groups : [],
            }))
        .filter((c) => c.email),
    [contacts]
  );

  /* Derived: group names */
  const allGroups = useMemo(() => listGroupsFromContacts(normContacts), [normContacts]);

  /* Add an entire group at once — appends only emails not already selected */
  function addGroup(groupName) {
    const members = expandGroup(groupName, normContacts);
    if (!members.length) return;
    const seen = new Set(safeValue.map((v) => String(v).toLowerCase()));
    const additions = members.filter((m) => !seen.has(String(m).toLowerCase()));
    if (additions.length) onChange([...safeValue, ...additions]);
  }

  /* Build a lookup so we can show the name on a selected chip */
  const contactsByEmail = useMemo(() => {
    const m = new Map();
    for (const c of normContacts) m.set(c.email.toLowerCase(), c);
    return m;
  }, [normContacts]);

  /* Filter out already-selected emails and apply the search query */
  const available = useMemo(() => {
    const selectedSet = new Set(safeValue.map((v) => String(v).toLowerCase()));
    const q = query.trim().toLowerCase();
    return normContacts.filter((c) => {
      if (selectedSet.has(c.email.toLowerCase())) return false;
      if (!q) return true;
      return c.email.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
    });
  }, [normContacts, safeValue, query]);

  /* Close dropdown when clicking outside */
  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => { setFocusedIdx(0); }, [query, open]);

  function addSelected(email) {
    const e = String(email || "").trim();
    if (!e) return;
    if (safeValue.some((v) => String(v).toLowerCase() === e.toLowerCase())) return;
    onChange([...safeValue, e]);
    setQuery("");
    setOpen(false);
  }

  function removeChip(email) {
    onChange(safeValue.filter((v) => String(v).toLowerCase() !== email.toLowerCase()));
  }

  function onSearchKey(e) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((i) => Math.min(i + 1, available.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = available[focusedIdx];
      if (pick) addSelected(pick.email);
      else if (isValidEmail(query)) addSelected(query.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  async function handleAddNew() {
    const e = newEmail.trim();
    const n = newName.trim();
    setErr("");
    if (!isValidEmail(e)) { setErr("صيغة الإيميل غير صحيحة"); return; }
    setAdding(true);
    try {
      const saved = await addEmailContact(e, n);
      setNewEmail("");
      setNewName("");
      onContactsChange?.();
      addSelected(saved.email);
    } catch (ex) {
      setErr(ex?.message || "فشل الحفظ");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div style={styles.wrap} ref={wrapRef}>
      {label && (
        <label style={{ display: "block", fontWeight: 800, fontSize: 13, color: "#334155", marginBottom: 6 }}>
          {label}
        </label>
      )}

      {/* Selected chips — show friendly name + email */}
      {safeValue.length > 0 && (
        <div style={styles.chips}>
          {safeValue.map((e) => {
            const found = contactsByEmail.get(String(e).toLowerCase());
            return (
              <span key={e} style={styles.chip}>
                {found?.name ? (
                  <>
                    <span style={styles.chipName}>{found.name}</span>
                    <span style={styles.chipEmail}>&lt;{e}&gt;</span>
                  </>
                ) : (
                  <span style={styles.chipName}>{e}</span>
                )}
                <button type="button" style={styles.chipX} disabled={disabled}
                  onClick={() => removeChip(e)} title="Remove">×</button>
              </span>
            );
          })}
        </div>
      )}

      {/* Quick-add groups */}
      {allGroups.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: ".5px",
            alignSelf: "center", marginInlineEnd: 4 }}>📁 GROUPS:</span>
          {allGroups.map((g) => {
            const memberCount = expandGroup(g, normContacts).length;
            return (
              <button key={g} type="button" onClick={() => addGroup(g)} disabled={disabled}
                title={`Add all ${memberCount} member(s) of ${g}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "4px 10px", borderRadius: 999,
                  background: "#fef3c7", color: "#92400e",
                  border: "1px solid #fcd34d", fontWeight: 800, fontSize: 11,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.5 : 1,
                  fontFamily: "inherit",
                }}>
                @{g}
                <span style={{ background: "rgba(146,64,14,.15)", borderRadius: 999,
                  padding: "0px 6px", fontSize: 10 }}>{memberCount}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Searchable input */}
      <div style={styles.searchBox}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          style={styles.search}
          disabled={disabled}
          placeholder="ابحث بالاسم أو الإيميل…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onSearchKey}
        />
        {open && (
          <div style={styles.dropdown}>
            {available.length === 0 ? (
              <div style={styles.optionEmpty}>
                {normContacts.length === 0 ? "لا يوجد محفوظين بعد" : "لا نتائج مطابقة"}
              </div>
            ) : (
              available.map((c, idx) => (
                <div
                  key={c.email}
                  style={styles.option(idx === focusedIdx)}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  onMouseDown={(e) => { e.preventDefault(); addSelected(c.email); }}
                >
                  <div style={styles.optionName}>
                    {c.name ? highlight(c.name, query) : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>بدون اسم</span>}
                  </div>
                  <div style={styles.optionEmail}>{highlight(c.email, query)}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {allowAdd && (
        <>
          <div style={styles.addWrap}>
            <input
              style={styles.input}
              placeholder="🏷️ الاسم الشائع (مثلاً: أحمد المدير)"
              value={newName}
              disabled={disabled || adding}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNew(); } }}
            />
            <input
              style={styles.input}
              placeholder="✉️ name@example.com"
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
