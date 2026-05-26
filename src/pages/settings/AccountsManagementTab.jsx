// src/pages/settings/AccountsManagementTab.jsx
// 👥 Account Management — list · add/edit · CRUD permissions · employees · activity log
import React, { useState, useEffect, useCallback } from "react";
import API_BASE from "../../config/api";
import { SECTION_ITEMS } from "../../utils/sectionItems";

/* ─── Master branch list (same IDs as DailyMonitorDashboard) ─── */
const MASTER_BRANCHES = [
  { id: "QCS",        label: "🛡️ QCS" },
  { id: "PRODUCTION", label: "🏭 Production" },
  { id: "POS 6",      label: "POS 6" },
  { id: "POS 7",      label: "POS 7" },
  { id: "POS 10",     label: "POS 10" },
  { id: "POS 11",     label: "POS 11" },
  { id: "POS 14",     label: "POS 14" },
  { id: "POS 15",     label: "POS 15" },
  { id: "POS 16",     label: "POS 16" },
  { id: "POS 17",     label: "POS 17" },
  { id: "POS 18",     label: "POS 18" },
  { id: "POS 19",     label: "👨‍🍳 Al Warqa Kitchen" },
  { id: "POS 21",     label: "POS 21" },
  { id: "POS 24",     label: "POS 24" },
  { id: "POS 25",     label: "POS 25" },
  { id: "POS 26",     label: "POS 26" },
  { id: "POS 31",     label: "POS 31" },
  { id: "POS 34",     label: "POS 34" },
  { id: "POS 35",     label: "POS 35" },
  { id: "POS 36",     label: "POS 36" },
  { id: "POS 37",     label: "POS 37" },
  { id: "POS 38",     label: "POS 38" },
  { id: "POS 41",     label: "POS 41" },
  { id: "POS 42",     label: "POS 42" },
  { id: "POS 43",     label: "POS 43" },
  { id: "POS 44",     label: "POS 44" },
  { id: "POS 45",     label: "POS 45" },
  { id: "FTR 1",      label: "🚚 FTR 1" },
  { id: "FTR 2",      label: "🚚 FTR 2" },
];

/* ─── sections (same order as NamedDashboard) ─── */
const SECTIONS = [
  { id: "admin",            label: "👑 Admin" },
  { id: "inspector",        label: "🔍 Inspector" },
  { id: "supervisor",       label: "🛠️ Supervisor" },
  { id: "daily",            label: "📅 Daily Monitor" },
  { id: "ohc",              label: "🩺 OHC" },
  { id: "returns",          label: "♻️ Returns" },
  { id: "finalProduct",     label: "🏷️ Final Product Report" },
  { id: "cars",             label: "🚗 Cars" },
  { id: "maintenance",      label: "🔧 Maintenance Requests" },
  { id: "qcsView",          label: "📦 QCS Shipments" },
  { id: "training",         label: "🎓 Training Certificates" },
  { id: "internalTraining", label: "🧑‍🏫 Internal Training" },
  { id: "iso",              label: "📘 ISO & HACCP" },
  { id: "halalAudit",       label: "📋 HALAL Audit" },
  { id: "hse",              label: "🦺 HSE" },
  { id: "settings",         label: "⚙️ Settings" },
];

const CRUD_OPS = [
  { id: "view",   label: "👁️ View",   color: "#2563eb" },
  { id: "write",  label: "✏️ Write",  color: "#059669" },
  { id: "edit",   label: "📝 Edit",   color: "#d97706" },
  { id: "delete", label: "🗑️ Delete", color: "#dc2626" },
];

const EMPTY_FORM = {
  username: "",
  displayName: "",
  password: "",
  confirmPassword: "",
  isAdmin: false,
  isFullAccess: false,
  // crudPerms: { sectionId: ["view","write","edit","delete"] }
  crudPerms: {},
  employees: [],
  // allowedBranches: { [sectionId]: [branchId, ...] }  → [] = all branches for that section
  // Independent per icon — set restrictions for any section the account can access.
  allowedBranches: {},
};

/* Normalize allowedBranches into an object keyed by section ID.
   Handles legacy flat-array format (applied to both daily + admin historically). */
function normalizeBranches(val) {
  if (Array.isArray(val)) {
    return { daily: [...val], admin: [...val] };
  }
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (Array.isArray(v) && v.length > 0) out[k] = [...v];
    }
    return out;
  }
  return {};
}

/* ─── Password strength ─── */
function checkPasswordStrength(pw) {
  if (!pw) return null;
  const issues = [];
  if (pw.length < 8)           issues.push("at least 8 characters");
  if (!/[A-Za-z]/.test(pw))   issues.push("a letter");
  if (!/[0-9]/.test(pw))      issues.push("a number");
  if (issues.length === 0) return { level: "strong", color: "#16a34a", label: "🟢 Strong" };
  if (issues.length === 1) return { level: "medium", color: "#d97706", label: "🟡 Fair — needs " + issues.join(", ") };
  return { level: "weak", color: "#dc2626", label: "🔴 Weak — needs " + issues.join(", ") };
}

/* ─── helpers ─── */
function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// permissions from DB is still the old array ["inspector","*"] — derive from crudPerms
function permissionsArrayFromCrud(isFullAccess, crudPerms) {
  if (isFullAccess) return ["*"];
  return Object.keys(crudPerms).filter(k => crudPerms[k]?.length > 0);
}

// Convert old permissions array to our form state
function formStateFromUser(u) {
  const oldPerms = u.permissions || [];
  const isFullAccess = oldPerms.includes("*");
  // crudPerms from DB (new field) or derive from old permissions (view only as default)
  let crudPerms = {};
  if (u.crud_perms && typeof u.crud_perms === "object" && !Array.isArray(u.crud_perms)) {
    crudPerms = u.crud_perms;
  } else if (!isFullAccess) {
    // old account — give each section "view" by default
    oldPerms.forEach(id => {
      if (id !== "*") crudPerms[id] = ["view"];
    });
  }
  return {
    id:              u.id,
    username:        u.username,
    displayName:     u.display_name || "",
    password:        "",
    confirmPassword: "",
    isAdmin:         !!u.is_admin,
    isFullAccess,
    crudPerms,
    employees:       Array.isArray(u.employees) ? u.employees : [],
    allowedBranches: normalizeBranches(u.allowed_branches),
  };
}

/* ══════════════════════════════════════════════
   CRUD PERMISSIONS TABLE
══════════════════════════════════════════════ */
function CrudTable({ isFullAccess, crudPerms, onChange, onFullAccessChange }) {
  const toggleSection = (sectionId) => {
    const next = { ...crudPerms };
    if (next[sectionId]) {
      delete next[sectionId];
    } else {
      next[sectionId] = ["view"]; // default: view only
    }
    onChange(next);
  };

  const toggleOp = (sectionId, op) => {
    const ops = crudPerms[sectionId] || [];
    let next;
    if (ops.includes(op)) {
      next = ops.filter(o => o !== op);
      // if removing view, remove everything
      if (op === "view") next = [];
    } else {
      next = [...ops, op];
      // if adding write/edit/delete, ensure view is included
      if (!next.includes("view")) next = ["view", ...next];
    }
    onChange({ ...crudPerms, [sectionId]: next });
  };

  const selectAllOps = (sectionId) => {
    const ops = crudPerms[sectionId] || [];
    const allSelected = CRUD_OPS.every(o => ops.includes(o.id));
    onChange({
      ...crudPerms,
      [sectionId]: allSelected ? ["view"] : CRUD_OPS.map(o => o.id),
    });
  };

  const allSectionsOn = SECTIONS.every(s => crudPerms[s.id]?.length > 0);

  return (
    <div style={fs.permBox}>
      {/* Header */}
      <div style={fs.permHeader}>
        <span style={fs.permTitle}>🔐 Permissions</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isFullAccess}
              onChange={e => onFullAccessChange(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "#7c3aed" }}
            />
            <span style={{ fontWeight: 900, color: "#7c3aed", fontSize: 15 }}>
              ⭐ Full Access (all sections + all operations)
            </span>
          </label>
          {!isFullAccess && (
            <button
              type="button"
              onClick={() => {
                const next = {};
                SECTIONS.forEach(s => {
                  next[s.id] = allSectionsOn ? ["view"] : CRUD_OPS.map(o => o.id);
                });
                onChange(next);
              }}
              style={fs.btnSelectAll}
            >
              {allSectionsOn ? "⬇️ All View-Only" : "⬆️ All Full Access"}
            </button>
          )}
        </div>
      </div>

      {isFullAccess ? (
        <div style={fs.fullAccessBanner}>
          ⭐ This account has unrestricted access to all sections and operations.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={fs.permTable}>
            <thead>
              <tr>
                <th style={{ ...fs.permTh, textAlign: "left", minWidth: 190 }}>Section</th>
                <th style={fs.permTh}>Access</th>
                {CRUD_OPS.map(op => (
                  <th key={op.id} style={{ ...fs.permTh, color: op.color }}>{op.label}</th>
                ))}
                <th style={fs.permTh}>All Ops</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((sec, i) => {
                const hasAccess = !!(crudPerms[sec.id]?.length > 0);
                const ops = crudPerms[sec.id] || [];
                return (
                  <tr
                    key={sec.id}
                    style={{
                      background: i % 2 === 0 ? "#f8fafc" : "#fff",
                      opacity: hasAccess ? 1 : 0.5,
                    }}
                  >
                    <td style={fs.permTd}>
                      <span style={{ fontWeight: 800, fontSize: 14 }}>{sec.label}</span>
                    </td>
                    <td style={{ ...fs.permTd, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasAccess}
                        onChange={() => toggleSection(sec.id)}
                        style={{ width: 17, height: 17, accentColor: "#2563eb", cursor: "pointer" }}
                      />
                    </td>
                    {CRUD_OPS.map(op => (
                      <td key={op.id} style={{ ...fs.permTd, textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={ops.includes(op.id)}
                          disabled={!hasAccess || (op.id !== "view" && !ops.includes("view"))}
                          onChange={() => toggleOp(sec.id, op.id)}
                          style={{
                            width: 16, height: 16,
                            accentColor: op.color, cursor: hasAccess ? "pointer" : "not-allowed",
                          }}
                        />
                      </td>
                    ))}
                    <td style={{ ...fs.permTd, textAlign: "center" }}>
                      {hasAccess && (
                        <button
                          type="button"
                          onClick={() => selectAllOps(sec.id)}
                          style={fs.btnAllOps}
                          title="Toggle all operations"
                        >
                          {CRUD_OPS.every(o => ops.includes(o.id)) ? "🔓" : "🔒"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   EMPLOYEES LIST
══════════════════════════════════════════════ */
function EmployeesList({ employees, onChange }) {
  const [newName, setNewName] = useState("");

  const add = () => {
    const n = newName.trim();
    if (!n || employees.includes(n)) return;
    onChange([...employees, n]);
    setNewName("");
  };

  const remove = (name) => onChange(employees.filter(e => e !== name));

  return (
    <div style={fs.empBox}>
      <div style={fs.permTitle}>
        👷 Employees
        <span style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", marginLeft: 8 }}>
          (will appear in the "who is working?" popup after login)
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {employees.map(name => (
          <div key={name} style={fs.empChip}>
            <span style={{ fontWeight: 800 }}>{name}</span>
            <button
              type="button"
              onClick={() => remove(name)}
              style={fs.empRemoveBtn}
            >×</button>
          </div>
        ))}
        {employees.length === 0 && (
          <span style={{ color: "#94a3b8", fontSize: 13 }}>No employees added yet</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...fs.input, maxWidth: 240, flex: 1 }}
          placeholder="Employee name…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
        />
        <button type="button" onClick={add} style={fs.btnAdd2}>+ Add</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ITEM SELECTOR — per-section (branches OR sub-pages)
   selected: string[]  → [] = all items; [...] = restricted list
   items:    [{ id, icon?, label }, ...]  ← what the user can check
   kind:     "branches" | "pages"          ← only changes the wording
   theme:    color preset (see BRANCH_THEMES)
══════════════════════════════════════════════ */
function BranchSelector({ selected, onChange, theme, sectionLabel, items, kind = "branches" }) {
  const list = Array.isArray(items) && items.length > 0 ? items : MASTER_BRANCHES;
  const isRestricted = selected.length > 0;
  const noun  = kind === "pages" ? "page" : "branch";
  const nounP = kind === "pages" ? "pages" : "branches";

  const toggle = (id) => {
    if (selected.includes(id)) {
      onChange(selected.filter(b => b !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const selectAll = () => onChange(list.map(b => b.id));
  const clearAll  = () => onChange([]);

  return (
    <div style={{
      border: `1.5px solid ${theme.border}`, borderRadius: 14,
      padding: "16px 18px", marginBottom: 14,
      background: theme.bg,
    }}>
      {/* Title row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, flexWrap: "wrap", marginBottom: 8,
      }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: theme.accent }}>
          {theme.icon} {theme.title} — {kind === "pages" ? "Page Access" : "Branch Access"}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={selectAll}
            style={{
              fontSize: 12, fontWeight: 900, color: theme.accent,
              background: "#fff", border: `1px solid ${theme.border}`,
              borderRadius: 8, cursor: "pointer", padding: "5px 11px", fontFamily: "inherit",
            }}
          >
            ☑️ Select All
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{
              fontSize: 12, fontWeight: 900, color: "#475569",
              background: "#fff", border: "1px solid #e2e8f0",
              borderRadius: 8, cursor: "pointer", padding: "5px 11px", fontFamily: "inherit",
            }}
          >
            ⬜ Clear
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: "#475569", marginBottom: 12, fontWeight: 700 }}>
        {nounP[0].toUpperCase() + nounP.slice(1)} this account can access in <strong>{sectionLabel || theme.title}</strong>.
        Leave all unchecked for full access.
      </p>

      {/* All-access toggle */}
      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 12 }}>
        <input
          type="checkbox"
          checked={!isRestricted}
          onChange={() => onChange([])}
          style={{ width: 17, height: 17, accentColor: theme.accent }}
        />
        <span style={{ fontWeight: 900, color: theme.accent, fontSize: 15 }}>
          ⭐ All {nounP[0].toUpperCase() + nounP.slice(1)} (no restriction)
        </span>
      </label>

      {/* Item chips */}
      <div style={{
        display: "grid",
        gridTemplateColumns: kind === "pages"
          ? "repeat(auto-fill, minmax(220px,1fr))"
          : "repeat(auto-fill, minmax(140px,1fr))",
        gap: 6,
      }}>
        {list.map(b => {
          const checked = selected.includes(b.id);
          return (
            <label
              key={b.id}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                background: checked ? theme.chipOn : "#fff",
                border: `1.5px solid ${checked ? theme.accent : "#e2e8f0"}`,
                fontWeight: checked ? 900 : 700,
                fontSize: 13,
                color: checked ? theme.chipOnText : "#64748b",
                transition: "all .12s",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(b.id)}
                style={{ width: 14, height: 14, accentColor: theme.accent, flexShrink: 0 }}
              />
              {b.label}
            </label>
          );
        })}
      </div>

      {isRestricted && (
        <div style={{
          marginTop: 12, padding: "8px 12px", borderRadius: 8,
          background: theme.badgeBg, border: `1px solid ${theme.badgeBorder}`,
          fontSize: 13, fontWeight: 800, color: theme.badgeText,
        }}>
          🔒 Restricted to {selected.length} {selected.length !== 1 ? nounP : noun}
        </div>
      )}
    </div>
  );
}

/* Per-section themes for the BranchSelector (matched to NamedDashboard tile colors) */
const BRANCH_THEMES = {
  admin:            { icon: "👑",  title: "Admin",              bg: "#fffbeb", border: "#fde68a", accent: "#b45309", chipOn: "#fef3c7", chipOnText: "#78350f", badgeBg: "#fef3c7", badgeBorder: "#fcd34d", badgeText: "#78350f" },
  inspector:        { icon: "🔍",  title: "Inspector",          bg: "#eff6ff", border: "#bfdbfe", accent: "#1d4ed8", chipOn: "#dbeafe", chipOnText: "#1e3a8a", badgeBg: "#dbeafe", badgeBorder: "#93c5fd", badgeText: "#1e3a8a" },
  supervisor:       { icon: "🛠️", title: "Supervisor",         bg: "#f5f3ff", border: "#ddd6fe", accent: "#6d28d9", chipOn: "#ede9fe", chipOnText: "#4c1d95", badgeBg: "#ede9fe", badgeBorder: "#c4b5fd", badgeText: "#4c1d95" },
  daily:            { icon: "📅",  title: "Daily Monitor",      bg: "#ecfeff", border: "#a5f3fc", accent: "#0e7490", chipOn: "#cffafe", chipOnText: "#155e75", badgeBg: "#cffafe", badgeBorder: "#67e8f9", badgeText: "#155e75" },
  ohc:              { icon: "🩺",  title: "OHC",                bg: "#ecfdf5", border: "#a7f3d0", accent: "#059669", chipOn: "#d1fae5", chipOnText: "#064e3b", badgeBg: "#d1fae5", badgeBorder: "#6ee7b7", badgeText: "#064e3b" },
  returns:          { icon: "♻️", title: "Returns",            bg: "#fff7ed", border: "#fed7aa", accent: "#ea580c", chipOn: "#ffedd5", chipOnText: "#7c2d12", badgeBg: "#ffedd5", badgeBorder: "#fdba74", badgeText: "#7c2d12" },
  finalProduct:     { icon: "🏷️", title: "Final Product",      bg: "#fdf2f8", border: "#fbcfe8", accent: "#be185d", chipOn: "#fce7f3", chipOnText: "#831843", badgeBg: "#fce7f3", badgeBorder: "#f9a8d4", badgeText: "#831843" },
  cars:             { icon: "🚗",  title: "Cars",               bg: "#f8fafc", border: "#cbd5e1", accent: "#475569", chipOn: "#e2e8f0", chipOnText: "#1e293b", badgeBg: "#e2e8f0", badgeBorder: "#94a3b8", badgeText: "#1e293b" },
  maintenance:      { icon: "🔧",  title: "Maintenance",        bg: "#fef2f2", border: "#fecaca", accent: "#b91c1c", chipOn: "#fee2e2", chipOnText: "#7f1d1d", badgeBg: "#fee2e2", badgeBorder: "#fca5a5", badgeText: "#7f1d1d" },
  qcsView:          { icon: "📦",  title: "QCS Shipments",      bg: "#eef2ff", border: "#c7d2fe", accent: "#4338ca", chipOn: "#e0e7ff", chipOnText: "#312e81", badgeBg: "#e0e7ff", badgeBorder: "#a5b4fc", badgeText: "#312e81" },
  training:         { icon: "🎓",  title: "Training Certs",     bg: "#faf5ff", border: "#e9d5ff", accent: "#7e22ce", chipOn: "#f3e8ff", chipOnText: "#581c87", badgeBg: "#f3e8ff", badgeBorder: "#d8b4fe", badgeText: "#581c87" },
  internalTraining: { icon: "🧑‍🏫", title: "Internal Training", bg: "#eff6ff", border: "#bfdbfe", accent: "#1e40af", chipOn: "#dbeafe", chipOnText: "#1e3a8a", badgeBg: "#dbeafe", badgeBorder: "#93c5fd", badgeText: "#1e3a8a" },
  iso:              { icon: "📘",  title: "ISO & HACCP",        bg: "#ecfeff", border: "#a5f3fc", accent: "#0e7490", chipOn: "#cffafe", chipOnText: "#155e75", badgeBg: "#cffafe", badgeBorder: "#67e8f9", badgeText: "#155e75" },
  halalAudit:       { icon: "📋",  title: "HALAL Audit",        bg: "#f7fee7", border: "#d9f99d", accent: "#4d7c0f", chipOn: "#ecfccb", chipOnText: "#365314", badgeBg: "#ecfccb", badgeBorder: "#bef264", badgeText: "#365314" },
  hse:              { icon: "🦺",  title: "HSE",                bg: "#fefce8", border: "#fef08a", accent: "#a16207", chipOn: "#fef9c3", chipOnText: "#713f12", badgeBg: "#fef9c3", badgeBorder: "#fde047", badgeText: "#713f12" },
  settings:         { icon: "⚙️",  title: "Settings",           bg: "#f1f5f9", border: "#cbd5e1", accent: "#334155", chipOn: "#e2e8f0", chipOnText: "#0f172a", badgeBg: "#e2e8f0", badgeBorder: "#94a3b8", badgeText: "#0f172a" },
};

/* SECTION_ITEMS imported from utils/sectionItems.js — shared with hub pages. */

/* ══════════════════════════════════════════════
   ACCOUNT FORM
══════════════════════════════════════════════ */
function AccountForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [err, setErr] = useState("");
  const isEdit = !!initial?.id;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");
    if (!form.username.trim()) return setErr("Username is required");
    if (!isEdit && !form.password.trim()) return setErr("Password is required");
    if (form.password) {
      const str = checkPasswordStrength(form.password);
      if (str?.level === "weak") return setErr("Password is too weak — " + str.label.replace(/^🔴 Weak — /, ""));
      if (form.password !== form.confirmPassword) return setErr("Passwords don't match");
    }
    if (!form.isFullAccess && Object.keys(form.crudPerms).length === 0)
      return setErr("Grant at least one section or enable Full Access");
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} style={fs.formWrap}>
      <h3 style={fs.title}>
        {isEdit ? "✏️ Edit Account" : "➕ Add New Account"}
      </h3>

      {/* Username + Display Name */}
      <div style={fs.row}>
        <label style={fs.field}>
          <span style={fs.label}>Username *</span>
          <input style={fs.input} value={form.username}
            onChange={e => set("username", e.target.value)}
            placeholder="e.g. mohamad" disabled={isEdit} />
        </label>
        <label style={fs.field}>
          <span style={fs.label}>Display Name</span>
          <input style={fs.input} value={form.displayName}
            onChange={e => set("displayName", e.target.value)}
            placeholder="e.g. Mohammed Abdullah" />
        </label>
      </div>

      {/* Passwords */}
      <div style={fs.row}>
        <div style={fs.field}>
          <span style={fs.label}>{isEdit ? "New Password (blank = no change)" : "Password *"}</span>
          <input type="password" style={fs.input} value={form.password}
            onChange={e => set("password", e.target.value)}
            placeholder={isEdit ? "Leave blank to keep" : "Enter password"}
            autoComplete="new-password" />
          {/* Password strength indicator */}
          {form.password && (() => {
            const s = checkPasswordStrength(form.password);
            return (
              <div style={{ marginTop: 5, fontSize: 13, fontWeight: 800, color: s.color }}>
                {s.label}
              </div>
            );
          })()}
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, fontWeight: 700 }}>
            Min 8 chars · must have a letter and a number
          </div>
        </div>
        <label style={fs.field}>
          <span style={fs.label}>Confirm Password</span>
          <input type="password" style={fs.input} value={form.confirmPassword}
            onChange={e => set("confirmPassword", e.target.value)}
            placeholder="Repeat password"
            autoComplete="new-password" />
          {/* Match indicator */}
          {form.confirmPassword && (
            <div style={{
              marginTop: 5, fontSize: 13, fontWeight: 800,
              color: form.password === form.confirmPassword ? "#16a34a" : "#dc2626",
            }}>
              {form.password === form.confirmPassword ? "✅ Passwords match" : "❌ Passwords don't match"}
            </div>
          )}
        </label>
      </div>

      {/* Admin flag */}
      <label style={{ ...fs.checkRow, marginBottom: 18 }}>
        <input type="checkbox" checked={form.isAdmin}
          onChange={e => set("isAdmin", e.target.checked)}
          style={{ width: 18, height: 18, accentColor: "#7c3aed" }} />
        <span style={{ fontWeight: 900, color: "#7c3aed", fontSize: 15 }}>
          👑 Admin — can manage accounts in Settings
        </span>
      </label>

      {/* CRUD Permissions Table */}
      <CrudTable
        isFullAccess={form.isFullAccess}
        crudPerms={form.crudPerms}
        onChange={v => set("crudPerms", v)}
        onFullAccessChange={v => set("isFullAccess", v)}
      />

      {/* Employees */}
      <EmployeesList
        employees={form.employees}
        onChange={v => set("employees", v)}
      />

      {/* Per-section item access — branches OR sub-pages depending on the section type */}
      {(() => {
        const access = form.allowedBranches || {};
        /* Sections this account has access to AND that have an inner restriction config */
        const activeSections = SECTIONS
          .filter(sec => {
            const cfg = SECTION_ITEMS[sec.id];
            if (!cfg || cfg.kind === "none") return false;
            return form.isFullAccess || (form.crudPerms?.[sec.id]?.length > 0);
          })
          .map(sec => sec.id);
        if (activeSections.length === 0) return null;

        const updateSection = (sec, list) =>
          set("allowedBranches", { ...access, [sec]: list });

        return (
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontWeight: 1000, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>
              🔐 Section Access Control
              <span style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", marginLeft: 6 }}>
                (configured independently for each icon)
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 12, fontWeight: 700 }}>
              For every section this account can access, choose which branches or pages are visible.
              Leave all unchecked to grant access to everything.
            </p>
            {activeSections.map(sid => {
              const cfg     = SECTION_ITEMS[sid];
              const theme   = BRANCH_THEMES[sid] || BRANCH_THEMES.daily;
              const secMeta = SECTIONS.find(x => x.id === sid);
              return (
                <BranchSelector
                  key={sid}
                  kind={cfg.kind}
                  items={cfg.kind === "pages" ? cfg.items : MASTER_BRANCHES}
                  theme={theme}
                  sectionLabel={secMeta?.label || theme.title}
                  selected={Array.isArray(access[sid]) ? access[sid] : []}
                  onChange={list => updateSection(sid, list)}
                />
              );
            })}
          </div>
        );
      })()}

      {err && <div style={fs.err}>⚠️ {err}</div>}

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button type="submit" disabled={saving} style={fs.btnSave}>
          {saving ? "Saving…" : isEdit ? "💾 Save Changes" : "✅ Create Account"}
        </button>
        <button type="button" onClick={onCancel} style={fs.btnCancel}>Cancel</button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════
   ACTIVITY LOG
══════════════════════════════════════════════ */
function ActivityLogTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `${API_BASE}/api/activity-log?limit=200&username=${encodeURIComponent(filter)}`
        : `${API_BASE}/api/activity-log?limit=200`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.ok) setLogs(d.logs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const actionColor = { login: "#16a34a", logout: "#dc2626" };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <input
          style={{ ...fs.input, maxWidth: 240 }}
          placeholder="Filter by username…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button onClick={load} style={fs.btnRefresh}>🔄 Refresh</button>
      </div>

      {loading ? (
        <div style={fs.loading}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={fs.empty}>No activity recorded yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={fs.table}>
            <thead>
              <tr>
                {["Time", "Account", "Operator", "Action", "IP"].map(h => (
                  <th key={h} style={fs.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={fs.td}>{fmt(log.created_at)}</td>
                  <td style={{ ...fs.td, fontWeight: 900 }}>{log.username}</td>
                  <td style={{ ...fs.td, color: "#475569" }}>
                    {log.detail?.operator || log.detail?.displayName || "—"}
                  </td>
                  <td style={{ ...fs.td, fontWeight: 900,
                    color: actionColor[log.action] || "#374151" }}>
                    {log.action === "login"  ? "🟢 login"
                     : log.action === "logout" ? "🔴 logout"
                     : log.action}
                  </td>
                  <td style={{ ...fs.td, fontSize: 13, color: "#94a3b8" }}>{log.ip_addr || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   PERMISSION SUMMARY for the list table
══════════════════════════════════════════════ */
function PermSummary({ permissions, crudPerms }) {
  if (!permissions) return <span style={{ color: "#94a3b8" }}>—</span>;
  if (permissions.includes("*"))
    return <span style={{ color: "#7c3aed", fontWeight: 900 }}>⭐ Full Access</span>;

  const sections = Object.keys(crudPerms || {}).filter(k => crudPerms[k]?.length > 0);
  if (sections.length === 0)
    return <span style={{ color: "#94a3b8" }}>No sections</span>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {sections.slice(0, 4).map(id => {
        const ops = crudPerms[id] || [];
        const label = SECTIONS.find(s => s.id === id)?.label?.split(" ")[0] || id;
        const allOps = CRUD_OPS.every(o => ops.includes(o.id));
        return (
          <span key={id} style={{
            background: allOps ? "#dbeafe" : "#f1f5f9",
            color: allOps ? "#1d4ed8" : "#475569",
            fontSize: 12, fontWeight: 700,
            padding: "2px 8px", borderRadius: 999,
            border: `1px solid ${allOps ? "#bfdbfe" : "#e2e8f0"}`,
          }}>
            {label}
          </span>
        );
      })}
      {sections.length > 4 && (
        <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>
          +{sections.length - 4}
        </span>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function AccountsManagementTab() {
  const [tab, setTab]           = useState("list");
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [serverReady, setServerReady] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setServerReady(true);
    try {
      const r = await fetch(`${API_BASE}/api/app-users`);
      if (r.status === 404) { setServerReady(false); setLoading(false); return; }
      const d = await r.json();
      if (d.ok) setUsers(d.users || []);
    } catch { setServerReady(false); }
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4500);
  };

  /* ── Save ── */
  const handleSave = async (form) => {
    if (!serverReady) { showMsg("err", "Server not deployed yet"); return; }
    setSaving(true);
    try {
      const isEdit = !!editUser?.id;
      const url    = isEdit ? `${API_BASE}/api/app-users/${editUser.id}` : `${API_BASE}/api/app-users`;
      const method = isEdit ? "PUT" : "POST";

      const permissions = permissionsArrayFromCrud(form.isFullAccess, form.crudPerms);
      const body = {
        username:        form.username.trim(),
        displayName:     form.displayName.trim() || form.username.trim(),
        permissions,
        crudPerms:       form.isFullAccess ? {} : form.crudPerms,
        employees:       form.employees,
        allowedBranches: normalizeBranches(form.allowedBranches),
        isAdmin:         form.isAdmin,
      };
      if (form.password) body.password = form.password;

      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();

      if (!d.ok) {
        const errMap = { username_taken: "Username already taken." };
        showMsg("err", errMap[d.error] || d.error || "Server error");
      } else {
        showMsg("ok", isEdit ? "Account updated ✅" : "Account created ✅");
        setTab("list"); setEditUser(null); loadUsers();
      }
    } catch { showMsg("err", "Network error — please try again"); }
    setSaving(false);
  };

  /* ── Toggle active ── */
  const handleToggle = async (user) => {
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.is_active }),
      });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? d.user : u));
        showMsg("ok", user.is_active ? "Account disabled" : "Account enabled");
      }
    } catch { showMsg("err", "Toggle failed"); }
  };

  /* ── Delete ── */
  const handleDelete = async (user) => {
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${user.id}`, { method: "DELETE" });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        showMsg("ok", `Deleted "${user.username}"`);
      }
    } catch { showMsg("err", "Delete failed"); }
    setConfirmDel(null);
  };

  const TABS = [
    { id: "list",     label: "👥 Accounts" },
    { id: "activity", label: "📜 Activity Log" },
  ];

  return (
    <div style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 1000, fontSize: 24, color: "#0f172a" }}>
            👥 Account Management
          </h2>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 16 }}>
            Manage accounts · CRUD permissions · employees · activity log
          </p>
        </div>
        {tab !== "form" && (
          <button onClick={() => { setEditUser(null); setTab("form"); }} style={fs.btnAdd}>
            ➕ Add Account
          </button>
        )}
      </div>

      {/* Toast */}
      {msg && (
        <div style={{
          padding: "12px 18px", borderRadius: 10, marginBottom: 16,
          fontWeight: 800, fontSize: 16,
          background: msg.type === "ok" ? "#dcfce7" : "#fee2e2",
          color:      msg.type === "ok" ? "#166534" : "#991b1b",
          border:     `1px solid ${msg.type === "ok" ? "#86efac" : "#fca5a5"}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDel && (
        <div style={fs.overlay}>
          <div style={fs.modal}>
            <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>🗑️ Delete Account</div>
            <p style={{ color: "#374151", marginBottom: 18, fontSize: 16 }}>
              Delete <strong>{confirmDel.username}</strong>? This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleDelete(confirmDel)} style={fs.btnDanger}>Delete</button>
              <button onClick={() => setConfirmDel(null)} style={fs.btnCancel}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {tab !== "form" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 20,
          borderBottom: "2px solid #e2e8f0", paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 22px", background: "none", border: "none",
              borderBottom: tab === t.id ? "3px solid #2563eb" : "3px solid transparent",
              color: tab === t.id ? "#2563eb" : "#64748b",
              fontWeight: 900, fontSize: 16, cursor: "pointer",
              fontFamily: "inherit", marginBottom: -2,
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Server not ready */}
      {!serverReady && (
        <div style={{ background:"#fffbeb", border:"1.5px solid #fbbf24",
          borderRadius:12, padding:"16px 20px", marginBottom:16,
          display:"flex", gap:14, alignItems:"flex-start" }}>
          <span style={{ fontSize: 24 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 900, color: "#92400e", fontSize: 15, marginBottom: 4 }}>
              Server not updated yet
            </div>
            <div style={{ color: "#78350f", fontSize: 14, lineHeight: 1.6 }}>
              Push <strong>index.cjs</strong> to Render first, then refresh.
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {tab === "list" && (
        <div>
          {loading ? (
            <div style={fs.loading}>Loading accounts…</div>
          ) : users.length === 0 ? (
            <div style={fs.empty}>No accounts yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={fs.table}>
                <thead>
                  <tr>
                    {["Username","Display Name","Permissions","Employees","Admin","Status","Last Login","Actions"].map(h => (
                      <th key={h} style={fs.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{
                      borderBottom: "1px solid #f1f5f9",
                      opacity: u.is_active ? 1 : 0.5,
                    }}>
                      <td style={{ ...fs.td, fontWeight: 900, color: "#1e3a5f" }}>{u.username}</td>
                      <td style={fs.td}>{u.display_name || "—"}</td>
                      <td style={fs.td}>
                        <PermSummary permissions={u.permissions} crudPerms={u.crud_perms} />
                      </td>
                      <td style={fs.td}>
                        {Array.isArray(u.employees) && u.employees.length > 0
                          ? <span style={{ fontSize: 13, color: "#475569" }}>
                              {u.employees.slice(0,2).join(", ")}
                              {u.employees.length > 2 && ` +${u.employees.length-2}`}
                            </span>
                          : <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>}
                      </td>
                      <td style={{ ...fs.td, textAlign: "center" }}>
                        {u.is_admin ? "👑" : "—"}
                      </td>
                      <td style={{ ...fs.td, textAlign: "center" }}>
                        <span style={{
                          padding: "4px 14px", borderRadius: 999, fontSize: 14, fontWeight: 900,
                          background: u.is_active ? "#dcfce7" : "#fee2e2",
                          color:      u.is_active ? "#166534" : "#991b1b",
                        }}>
                          {u.is_active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ ...fs.td, fontSize: 13, color: "#64748b" }}>
                        {fmt(u.last_login)}
                      </td>
                      <td style={{ ...fs.td, whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => { setEditUser(u); setTab("form"); }}
                            style={fs.btnSm} title="Edit">✏️
                          </button>
                          <button
                            onClick={() => handleToggle(u)}
                            style={{ ...fs.btnSm, background: u.is_active ? "#fef3c7" : "#dcfce7" }}
                            title={u.is_active ? "Disable" : "Enable"}
                          >
                            {u.is_active ? "🔒" : "🔓"}
                          </button>
                          <button
                            onClick={() => setConfirmDel(u)}
                            style={{ ...fs.btnSm, background: "#fee2e2", color: "#991b1b" }}
                            title="Delete" disabled={u.username === "admin"}
                          >🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      {tab === "form" && (
        <AccountForm
          initial={editUser ? formStateFromUser(editUser) : EMPTY_FORM}
          onSave={handleSave}
          onCancel={() => { setTab("list"); setEditUser(null); }}
          saving={saving}
        />
      )}

      {/* Activity */}
      {tab === "activity" && <ActivityLogTab />}
    </div>
  );
}

/* ─── Styles ─── */
const fs = {
  formWrap: {
    background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 16, padding: "28px 32px", maxWidth: 920,
  },
  title: { margin: "0 0 22px", fontWeight: 1000, fontSize: 22, color: "#0f172a" },
  row:   { display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" },
  field: { flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 14, fontWeight: 900, color: "#475569", textTransform: "uppercase", letterSpacing: ".05em" },
  input: {
    padding: "12px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
    fontSize: 16, fontFamily: "inherit", color: "#0f172a",
    background: "#f8fafc", outline: "none", width: "100%", boxSizing: "border-box",
  },
  checkRow: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 8px", borderRadius: 8 },
  err: {
    color: "#991b1b", background: "#fee2e2",
    padding: "10px 14px", borderRadius: 8, fontSize: 15, fontWeight: 800, marginTop: 10,
  },
  /* permissions table */
  permBox: {
    border: "1.5px solid #e2e8f0", borderRadius: 14,
    padding: "16px 18px", marginBottom: 18, background: "#fafafa",
  },
  permHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 10, marginBottom: 14,
  },
  permTitle: { fontWeight: 900, fontSize: 16, color: "#0f172a" },
  fullAccessBanner: {
    background: "#f3e8ff", border: "1px solid #d8b4fe",
    borderRadius: 10, padding: "12px 16px",
    color: "#7c3aed", fontWeight: 800, fontSize: 15,
  },
  permTable: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  permTh: {
    padding: "10px 14px", background: "#f1f5f9",
    fontSize: 13, fontWeight: 900, color: "#475569",
    textAlign: "center", whiteSpace: "nowrap",
    borderBottom: "2px solid #e2e8f0",
  },
  permTd: { padding: "10px 12px", verticalAlign: "middle" },
  btnSelectAll: {
    fontSize: 13, fontWeight: 900, color: "#2563eb",
    background: "#dbeafe", border: "1px solid #bfdbfe",
    borderRadius: 8, cursor: "pointer", padding: "5px 12px", fontFamily: "inherit",
  },
  btnAllOps: {
    background: "none", border: "none", cursor: "pointer",
    fontSize: 16, padding: "2px 6px", borderRadius: 6,
  },
  /* employees */
  empBox: {
    border: "1.5px solid #e2e8f0", borderRadius: 14,
    padding: "16px 18px", marginBottom: 18, background: "#fafafa",
  },
  empChip: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#dbeafe", border: "1px solid #bfdbfe",
    borderRadius: 999, padding: "4px 12px",
    fontSize: 14,
  },
  empRemoveBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#dc2626", fontWeight: 900, fontSize: 17,
    lineHeight: 1, padding: "0 2px",
  },
  btnAdd2: {
    padding: "10px 18px", background: "#2563eb", color: "#fff",
    border: "none", borderRadius: 10, fontWeight: 900,
    fontSize: 15, cursor: "pointer", fontFamily: "inherit",
  },
  /* buttons */
  btnSave: {
    padding: "12px 26px",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 10,
    fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
  },
  btnCancel: {
    padding: "12px 22px", background: "#f1f5f9", color: "#374151",
    border: "1px solid #e2e8f0", borderRadius: 10,
    fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
  },
  btnAdd: {
    padding: "12px 24px",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 10,
    fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 6px 16px rgba(37,99,235,.25)",
  },
  btnRefresh: {
    padding: "10px 16px", background: "#f1f5f9", color: "#374151",
    border: "1px solid #e2e8f0", borderRadius: 10,
    fontWeight: 900, fontSize: 15, cursor: "pointer", fontFamily: "inherit",
  },
  btnDanger: {
    padding: "12px 22px", background: "#dc2626", color: "#fff",
    border: "none", borderRadius: 10,
    fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "inherit",
  },
  btnSm: {
    padding: "7px 12px", background: "#f1f5f9",
    border: "1px solid #e2e8f0", borderRadius: 8,
    fontSize: 17, cursor: "pointer",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    padding: "12px 16px", background: "#f8fafc",
    fontSize: 14, fontWeight: 900, color: "#64748b",
    textAlign: "left", whiteSpace: "nowrap",
    borderBottom: "2px solid #e2e8f0",
  },
  td: { padding: "14px 16px", fontSize: 15, color: "#0f172a", verticalAlign: "middle" },
  loading: { padding: "40px 0", textAlign: "center", color: "#94a3b8", fontWeight: 700, fontSize: 16 },
  empty:   { padding: "40px 0", textAlign: "center", color: "#94a3b8", fontWeight: 700, fontSize: 16 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: "28px 32px",
    boxShadow: "0 20px 60px rgba(0,0,0,.2)",
    width: "min(440px,92vw)", border: "1px solid #e2e8f0",
  },
};
