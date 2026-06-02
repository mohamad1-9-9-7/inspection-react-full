// src/pages/settings/AccountsManagementTab.jsx
// 👥 Account Control Center — full-screen dark admin dashboard
// Accepts optional onClose prop; when omitted it renders inline.

import React, { useState, useEffect, useCallback } from "react";
import API_BASE from "../../config/api";
import { SECTION_ITEMS } from "../../utils/sectionItems";
import { useSettingsLang } from "./_shared/settingsI18n";

/* ═══════════════════════════════════════════════════════ CONSTANTS */

const MASTER_BRANCHES = [
  { id: "QCS",        label: "🛡️ QCS" },
  { id: "PRODUCTION", label: "🏭 Production" },
  { id: "POS 6",  label: "POS 6"  }, { id: "POS 7",  label: "POS 7"  },
  { id: "POS 10", label: "POS 10" }, { id: "POS 11", label: "POS 11" },
  { id: "POS 14", label: "POS 14" }, { id: "POS 15", label: "POS 15" },
  { id: "POS 16", label: "POS 16" }, { id: "POS 17", label: "POS 17" },
  { id: "POS 18", label: "POS 18" },
  { id: "POS 19", label: "👨‍🍳 Al Warqa Kitchen" },
  { id: "POS 21", label: "POS 21" }, { id: "POS 24", label: "POS 24" },
  { id: "POS 25", label: "POS 25" }, { id: "POS 26", label: "POS 26" },
  { id: "POS 31", label: "POS 31" }, { id: "POS 34", label: "POS 34" },
  { id: "POS 35", label: "POS 35" }, { id: "POS 36", label: "POS 36" },
  { id: "POS 37", label: "POS 37" }, { id: "POS 38", label: "POS 38" },
  { id: "POS 41", label: "POS 41" }, { id: "POS 42", label: "POS 42" },
  { id: "POS 43", label: "POS 43" }, { id: "POS 44", label: "POS 44" },
  { id: "POS 45", label: "POS 45" },
  { id: "FTR 1",  label: "🚚 FTR 1" }, { id: "FTR 2", label: "🚚 FTR 2" },
];

const SECTIONS = [
  { id: "admin",            icon: "👑",   nameKey: "amSecAdmin" },
  { id: "inspector",        icon: "🔍",   nameKey: "amSecInspector" },
  { id: "supervisor",       icon: "🛠️",  nameKey: "amSecSupervisor" },
  { id: "daily",            icon: "📅",   nameKey: "amSecDaily" },
  { id: "ohc",              icon: "🩺",   nameKey: "amSecOhc" },
  { id: "returns",          icon: "♻️",  nameKey: "amSecReturns" },
  { id: "finalProduct",     icon: "🏷️",  nameKey: "amSecFinalProduct" },
  { id: "cars",             icon: "🚗",   nameKey: "amSecCars" },
  { id: "maintenance",      icon: "🔧",   nameKey: "amSecMaintenance" },
  { id: "qcsView",          icon: "📦",   nameKey: "amSecQcsView" },
  { id: "training",         icon: "🎓",   nameKey: "amSecTraining" },
  { id: "internalTraining", icon: "🧑‍🏫", nameKey: "amSecInternalTraining" },
  { id: "iso",              icon: "📘",   nameKey: "amSecIso" },
  { id: "halalAudit",       icon: "📋",   nameKey: "amSecHalalAudit" },
  { id: "hse",              icon: "🦺",  nameKey: "amSecHse" },
  { id: "settings",         icon: "⚙️",  nameKey: "amSecSettings" },
];

const CRUD_OPS = [
  { id: "view",   icon: "👁️", nameKey: "amView",   color: "#2563eb" },
  { id: "write",  icon: "✏️", nameKey: "amWrite",  color: "#059669" },
  { id: "edit",   icon: "📝", nameKey: "amEditOp", color: "#d97706" },
  { id: "delete", icon: "🗑️", nameKey: "amDelOp",  color: "#dc2626" },
];

const EMPTY_FORM = {
  username: "", displayName: "", password: "", confirmPassword: "",
  isAdmin: false, isFullAccess: false, crudPerms: {}, employees: [], allowedBranches: {},
};

const BRANCH_THEMES = {
  admin:            { icon:"👑",  title:"Admin",             bg:"#fffbeb", border:"#fde68a", accent:"#b45309", chipOn:"#fef3c7", chipOnText:"#78350f", badgeBg:"#fef3c7", badgeBorder:"#fcd34d", badgeText:"#78350f" },
  inspector:        { icon:"🔍",  title:"Inspector",         bg:"#eff6ff", border:"#bfdbfe", accent:"#1d4ed8", chipOn:"#dbeafe", chipOnText:"#1e3a8a", badgeBg:"#dbeafe", badgeBorder:"#93c5fd", badgeText:"#1e3a8a" },
  supervisor:       { icon:"🛠️", title:"Supervisor",        bg:"#f5f3ff", border:"#ddd6fe", accent:"#6d28d9", chipOn:"#ede9fe", chipOnText:"#4c1d95", badgeBg:"#ede9fe", badgeBorder:"#c4b5fd", badgeText:"#4c1d95" },
  daily:            { icon:"📅",  title:"Daily Monitor",     bg:"#ecfeff", border:"#a5f3fc", accent:"#0e7490", chipOn:"#cffafe", chipOnText:"#155e75", badgeBg:"#cffafe", badgeBorder:"#67e8f9", badgeText:"#155e75" },
  ohc:              { icon:"🩺",  title:"OHC",               bg:"#ecfdf5", border:"#a7f3d0", accent:"#059669", chipOn:"#d1fae5", chipOnText:"#064e3b", badgeBg:"#d1fae5", badgeBorder:"#6ee7b7", badgeText:"#064e3b" },
  returns:          { icon:"♻️", title:"Returns",           bg:"#fff7ed", border:"#fed7aa", accent:"#ea580c", chipOn:"#ffedd5", chipOnText:"#7c2d12", badgeBg:"#ffedd5", badgeBorder:"#fdba74", badgeText:"#7c2d12" },
  finalProduct:     { icon:"🏷️", title:"Final Product",     bg:"#fdf2f8", border:"#fbcfe8", accent:"#be185d", chipOn:"#fce7f3", chipOnText:"#831843", badgeBg:"#fce7f3", badgeBorder:"#f9a8d4", badgeText:"#831843" },
  cars:             { icon:"🚗",  title:"Cars",              bg:"#f8fafc", border:"#cbd5e1", accent:"#475569", chipOn:"#e2e8f0", chipOnText:"#1e293b", badgeBg:"#e2e8f0", badgeBorder:"#94a3b8", badgeText:"#1e293b" },
  maintenance:      { icon:"🔧",  title:"Maintenance",       bg:"#fef2f2", border:"#fecaca", accent:"#b91c1c", chipOn:"#fee2e2", chipOnText:"#7f1d1d", badgeBg:"#fee2e2", badgeBorder:"#fca5a5", badgeText:"#7f1d1d" },
  qcsView:          { icon:"📦",  title:"QCS Shipments",     bg:"#eef2ff", border:"#c7d2fe", accent:"#4338ca", chipOn:"#e0e7ff", chipOnText:"#312e81", badgeBg:"#e0e7ff", badgeBorder:"#a5b4fc", badgeText:"#312e81" },
  training:         { icon:"🎓",  title:"Training Certs",    bg:"#faf5ff", border:"#e9d5ff", accent:"#7e22ce", chipOn:"#f3e8ff", chipOnText:"#581c87", badgeBg:"#f3e8ff", badgeBorder:"#d8b4fe", badgeText:"#581c87" },
  internalTraining: { icon:"🧑‍🏫", title:"Internal Training", bg:"#eff6ff", border:"#bfdbfe", accent:"#1e40af", chipOn:"#dbeafe", chipOnText:"#1e3a8a", badgeBg:"#dbeafe", badgeBorder:"#93c5fd", badgeText:"#1e3a8a" },
  iso:              { icon:"📘",  title:"ISO & HACCP",       bg:"#ecfeff", border:"#a5f3fc", accent:"#0e7490", chipOn:"#cffafe", chipOnText:"#155e75", badgeBg:"#cffafe", badgeBorder:"#67e8f9", badgeText:"#155e75" },
  halalAudit:       { icon:"📋",  title:"HALAL Audit",       bg:"#f7fee7", border:"#d9f99d", accent:"#4d7c0f", chipOn:"#ecfccb", chipOnText:"#365314", badgeBg:"#ecfccb", badgeBorder:"#bef264", badgeText:"#365314" },
  hse:              { icon:"🦺",  title:"HSE",               bg:"#fefce8", border:"#fef08a", accent:"#a16207", chipOn:"#fef9c3", chipOnText:"#713f12", badgeBg:"#fef9c3", badgeBorder:"#fde047", badgeText:"#713f12" },
  settings:         { icon:"⚙️",  title:"Settings",          bg:"#f1f5f9", border:"#cbd5e1", accent:"#334155", chipOn:"#e2e8f0", chipOnText:"#0f172a", badgeBg:"#e2e8f0", badgeBorder:"#94a3b8", badgeText:"#0f172a" },
};

const AVATAR_GRADS = [
  "linear-gradient(135deg,#3b82f6,#7c3aed)",
  "linear-gradient(135deg,#10b981,#0891b2)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#f97316,#e11d48)",
];

/* ═══════════════════════════════════════════════════════ HELPERS */

function normalizeBranches(val) {
  if (Array.isArray(val)) return { daily: [...val], admin: [...val] };
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (Array.isArray(v) && v.length > 0) out[k] = [...v];
    }
    return out;
  }
  return {};
}

function checkPasswordStrength(pw, t) {
  if (!pw) return null;
  const issues = [];
  if (pw.length < 8)        issues.push(t("amPwAtLeast8"));
  if (!/[A-Za-z]/.test(pw)) issues.push(t("amPwLetter"));
  if (!/[0-9]/.test(pw))    issues.push(t("amPwNumber"));
  const needs = issues.join(", ");
  if (issues.length === 0) return { level: "strong", color: "#16a34a", label: `🟢 ${t("amPwStrong")}`, needs: "" };
  if (issues.length === 1) return { level: "medium", color: "#d97706", label: `🟡 ${t("amPwFair")} ${needs}`, needs };
  return { level: "weak", color: "#dc2626", label: `🔴 ${t("amPwWeak")} ${needs}`, needs };
}

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function permissionsArrayFromCrud(isFullAccess, crudPerms) {
  if (isFullAccess) return ["*"];
  return Object.keys(crudPerms).filter(k => crudPerms[k]?.length > 0);
}

function formStateFromUser(u) {
  const oldPerms = u.permissions || [];
  const isFullAccess = oldPerms.includes("*");
  let crudPerms = {};
  if (u.crud_perms && typeof u.crud_perms === "object" && !Array.isArray(u.crud_perms)) {
    crudPerms = u.crud_perms;
  } else if (!isFullAccess) {
    oldPerms.forEach(id => { if (id !== "*") crudPerms[id] = ["view"]; });
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

const avatarGrad = (username) =>
  AVATAR_GRADS[(username?.charCodeAt(0) || 0) % AVATAR_GRADS.length];

/* ═══════════════════════════════════════════════════════
   CRUD PERMISSIONS TABLE (light — inside white form card)
═══════════════════════════════════════════════════════ */
function CrudTable({ isFullAccess, crudPerms, onChange, onFullAccessChange }) {
  const { t } = useSettingsLang();
  const toggleSection = (sectionId) => {
    const next = { ...crudPerms };
    if (next[sectionId]) delete next[sectionId];
    else next[sectionId] = ["view"];
    onChange(next);
  };
  const toggleOp = (sectionId, op) => {
    const ops = crudPerms[sectionId] || [];
    let next;
    if (ops.includes(op)) {
      next = ops.filter(o => o !== op);
      if (op === "view") next = [];
    } else {
      next = [...ops, op];
      if (!next.includes("view")) next = ["view", ...next];
    }
    onChange({ ...crudPerms, [sectionId]: next });
  };
  const selectAllOps = (sectionId) => {
    const ops = crudPerms[sectionId] || [];
    const allSelected = CRUD_OPS.every(o => ops.includes(o.id));
    onChange({ ...crudPerms, [sectionId]: allSelected ? ["view"] : CRUD_OPS.map(o => o.id) });
  };
  const allSectionsOn = SECTIONS.every(s => crudPerms[s.id]?.length > 0);

  return (
    <div style={fs.permBox}>
      <div style={fs.permHeader}>
        <span style={fs.permTitle}>🔐 {t("amPermissions")}</span>
        <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <input type="checkbox" checked={isFullAccess}
              onChange={e => onFullAccessChange(e.target.checked)}
              style={{ width:18, height:18, accentColor:"#7c3aed" }} />
            <span style={{ fontWeight:900, color:"#7c3aed", fontSize:15 }}>
              ⭐ {t("amFullAccess")}
            </span>
          </label>
          {!isFullAccess && (
            <button type="button" onClick={() => {
              const next = {};
              SECTIONS.forEach(s => { next[s.id] = allSectionsOn ? ["view"] : CRUD_OPS.map(o => o.id); });
              onChange(next);
            }} style={fs.btnSelectAll}>
              {allSectionsOn ? `⬇️ ${t("amAllViewOnly")}` : `⬆️ ${t("amAllFullAccess")}`}
            </button>
          )}
        </div>
      </div>

      {isFullAccess ? (
        <div style={fs.fullAccessBanner}>
          ⭐ {t("amFullAccessBanner")}
        </div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={fs.permTable}>
            <thead>
              <tr>
                <th style={{ ...fs.permTh, textAlign:"left", minWidth:190 }}>{t("amColSection")}</th>
                <th style={fs.permTh}>{t("amColAccess")}</th>
                {CRUD_OPS.map(op => (
                  <th key={op.id} style={{ ...fs.permTh, color:op.color }}>{op.icon} {t(op.nameKey)}</th>
                ))}
                <th style={fs.permTh}>{t("amColAllOps")}</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((sec, i) => {
                const hasAccess = !!(crudPerms[sec.id]?.length > 0);
                const ops = crudPerms[sec.id] || [];
                return (
                  <tr key={sec.id} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff", opacity: hasAccess ? 1 : 0.5 }}>
                    <td style={fs.permTd}><span style={{ fontWeight:800, fontSize:14 }}>{sec.icon} {t(sec.nameKey)}</span></td>
                    <td style={{ ...fs.permTd, textAlign:"center" }}>
                      <input type="checkbox" checked={hasAccess} onChange={() => toggleSection(sec.id)}
                        style={{ width:17, height:17, accentColor:"#2563eb", cursor:"pointer" }} />
                    </td>
                    {CRUD_OPS.map(op => (
                      <td key={op.id} style={{ ...fs.permTd, textAlign:"center" }}>
                        <input type="checkbox" checked={ops.includes(op.id)}
                          disabled={!hasAccess || (op.id !== "view" && !ops.includes("view"))}
                          onChange={() => toggleOp(sec.id, op.id)}
                          style={{ width:16, height:16, accentColor:op.color, cursor: hasAccess ? "pointer" : "not-allowed" }} />
                      </td>
                    ))}
                    <td style={{ ...fs.permTd, textAlign:"center" }}>
                      {hasAccess && (
                        <button type="button" onClick={() => selectAllOps(sec.id)}
                          style={fs.btnAllOps} title={t("amToggleAllOps")}>
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

/* ═══════════════════════════════════════════════════════
   EMPLOYEES LIST (light — inside form card)
═══════════════════════════════════════════════════════ */
function EmployeesList({ employees, onChange }) {
  const { t } = useSettingsLang();
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
        👷 {t("amEmployees")}
        <span style={{ fontWeight:700, fontSize:12, color:"#94a3b8", marginLeft:8 }}>
          {t("amEmployeesHint")}
        </span>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        {employees.map(name => (
          <div key={name} style={fs.empChip}>
            <span style={{ fontWeight:800 }}>{name}</span>
            <button type="button" onClick={() => remove(name)} style={fs.empRemoveBtn}>×</button>
          </div>
        ))}
        {employees.length === 0 && <span style={{ color:"#94a3b8", fontSize:13 }}>{t("amNoEmployees")}</span>}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <input style={{ ...fs.input, maxWidth:240, flex:1 }} placeholder={t("amEmployeeNamePh")}
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())} />
        <button type="button" onClick={add} style={fs.btnAdd2}>+ {t("amAdd")}</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BRANCH / PAGE SELECTOR (light — inside form card)
═══════════════════════════════════════════════════════ */
function BranchSelector({ selected, onChange, theme, sectionLabel, items, kind = "branches" }) {
  const { t } = useSettingsLang();
  const list = Array.isArray(items) && items.length > 0 ? items : MASTER_BRANCHES;
  const isRestricted = selected.length > 0;
  const noun  = kind === "pages" ? t("amPageWord") : t("amBranchWord");
  const nounP = kind === "pages" ? t("amPagesWord") : t("amBranchesWord");
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter(b => b !== id) : [...selected, id]);

  return (
    <div style={{ border:`1.5px solid ${theme.border}`, borderRadius:14, padding:"16px 18px", marginBottom:14, background:theme.bg }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 }}>
        <div style={{ fontWeight:900, fontSize:16, color:theme.accent }}>
          {sectionLabel || `${theme.icon} ${theme.title}`} — {kind === "pages" ? t("amPageAccess") : t("amBranchAccess")}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button type="button" onClick={() => onChange(list.map(b => b.id))}
            style={{ fontSize:12, fontWeight:900, color:theme.accent, background:"#fff", border:`1px solid ${theme.border}`, borderRadius:8, cursor:"pointer", padding:"5px 11px", fontFamily:"inherit" }}>
            ☑️ {t("amSelectAll")}
          </button>
          <button type="button" onClick={() => onChange([])}
            style={{ fontSize:12, fontWeight:900, color:"#475569", background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, cursor:"pointer", padding:"5px 11px", fontFamily:"inherit" }}>
            ⬜ {t("amClear")}
          </button>
        </div>
      </div>

      <p style={{ fontSize:13, color:"#475569", marginBottom:12, fontWeight:700 }}>
        {kind === "pages" ? t("amAccessHelpPages") : t("amAccessHelpBranches")} <strong>{sectionLabel || theme.title}</strong>. {t("amAccessHelpTail")}
      </p>

      <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", marginBottom:12 }}>
        <input type="checkbox" checked={!isRestricted} onChange={() => onChange([])}
          style={{ width:17, height:17, accentColor:theme.accent }} />
        <span style={{ fontWeight:900, color:theme.accent, fontSize:15 }}>
          ⭐ {kind === "pages" ? t("amAllPages") : t("amAllBranches")}
        </span>
      </label>

      <div style={{
        display:"grid",
        gridTemplateColumns: kind === "pages" ? "repeat(auto-fill,minmax(220px,1fr))" : "repeat(auto-fill,minmax(140px,1fr))",
        gap:6,
      }}>
        {list.map(b => {
          const checked = selected.includes(b.id);
          return (
            <label key={b.id} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"7px 10px", borderRadius:8, cursor:"pointer",
              background: checked ? theme.chipOn : "#fff",
              border:`1.5px solid ${checked ? theme.accent : "#e2e8f0"}`,
              fontWeight: checked ? 900 : 700,
              fontSize:13,
              color: checked ? theme.chipOnText : "#64748b",
              transition:"all .12s", userSelect:"none",
            }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(b.id)}
                style={{ width:14, height:14, accentColor:theme.accent, flexShrink:0 }} />
              {b.label}
            </label>
          );
        })}
      </div>

      {isRestricted && (
        <div style={{ marginTop:12, padding:"8px 12px", borderRadius:8,
          background:theme.badgeBg, border:`1px solid ${theme.badgeBorder}`,
          fontSize:13, fontWeight:800, color:theme.badgeText }}>
          🔒 {t("amRestrictedTo")} {selected.length} {selected.length !== 1 ? nounP : noun}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ACCOUNT FORM (white card — inside dark panel)
═══════════════════════════════════════════════════════ */
function AccountForm({ initial, onSave, onCancel, saving }) {
  const { t } = useSettingsLang();
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [err, setErr]   = useState("");
  const isEdit = !!initial?.id;
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setErr("");
    if (!form.username.trim()) return setErr(t("amUsernameReq"));
    if (!isEdit && !form.password.trim()) return setErr(t("amPasswordReq"));
    if (form.password) {
      const str = checkPasswordStrength(form.password, t);
      if (str?.level === "weak") return setErr(`${t("amPasswordTooWeak")} ${str.needs}`);
      if (form.password !== form.confirmPassword) return setErr(t("amPasswordsNoMatch"));
    }
    if (!form.isFullAccess && Object.keys(form.crudPerms).length === 0)
      return setErr(t("amGrantOne"));
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} style={fs.formWrap}>
      <h3 style={fs.title}>{isEdit ? `✏️ ${t("amEditAccount")}` : `➕ ${t("amAddAccount")}`}</h3>

      <div style={fs.row}>
        <label style={fs.field}>
          <span style={fs.label}>{t("amUsername")} *</span>
          <input style={fs.input} value={form.username}
            onChange={e => set("username", e.target.value)}
            placeholder={t("amUsernamePh")} disabled={isEdit} />
        </label>
        <label style={fs.field}>
          <span style={fs.label}>{t("amDisplayName")}</span>
          <input style={fs.input} value={form.displayName}
            onChange={e => set("displayName", e.target.value)}
            placeholder={t("amDisplayNamePh")} />
        </label>
      </div>

      <div style={fs.row}>
        <div style={fs.field}>
          <span style={fs.label}>{isEdit ? t("amNewPassword") : `${t("amPassword")} *`}</span>
          <input type="password" style={fs.input} value={form.password}
            onChange={e => set("password", e.target.value)}
            placeholder={isEdit ? t("amPasswordKeepPh") : t("amPasswordEnterPh")}
            autoComplete="new-password" />
          {form.password && (() => {
            const s = checkPasswordStrength(form.password, t);
            return <div style={{ marginTop:5, fontSize:13, fontWeight:800, color:s.color }}>{s.label}</div>;
          })()}
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:3, fontWeight:700 }}>
            {t("amPasswordRule")}
          </div>
        </div>
        <label style={fs.field}>
          <span style={fs.label}>{t("amConfirmPassword")}</span>
          <input type="password" style={fs.input} value={form.confirmPassword}
            onChange={e => set("confirmPassword", e.target.value)}
            placeholder={t("amConfirmPasswordPh")} autoComplete="new-password" />
          {form.confirmPassword && (
            <div style={{ marginTop:5, fontSize:13, fontWeight:800,
              color: form.password === form.confirmPassword ? "#16a34a" : "#dc2626" }}>
              {form.password === form.confirmPassword ? `✅ ${t("amPasswordsMatch")}` : `❌ ${t("amPasswordsNoMatch")}`}
            </div>
          )}
        </label>
      </div>

      <label style={{ ...fs.checkRow, marginBottom:18 }}>
        <input type="checkbox" checked={form.isAdmin}
          onChange={e => set("isAdmin", e.target.checked)}
          style={{ width:18, height:18, accentColor:"#7c3aed" }} />
        <span style={{ fontWeight:900, color:"#7c3aed", fontSize:15 }}>
          👑 {t("amAdminCheckbox")}
        </span>
      </label>

      <CrudTable isFullAccess={form.isFullAccess} crudPerms={form.crudPerms}
        onChange={v => set("crudPerms", v)} onFullAccessChange={v => set("isFullAccess", v)} />

      <EmployeesList employees={form.employees} onChange={v => set("employees", v)} />

      {/* Per-section access control */}
      {(() => {
        const access = form.allowedBranches || {};
        const activeSections = SECTIONS.filter(sec => {
          const cfg = SECTION_ITEMS[sec.id];
          if (!cfg || cfg.kind === "none") return false;
          return form.isFullAccess || (form.crudPerms?.[sec.id]?.length > 0);
        }).map(sec => sec.id);
        if (activeSections.length === 0) return null;
        const updateSection = (sec, list) => set("allowedBranches", { ...access, [sec]: list });
        return (
          <div style={{ marginBottom:4 }}>
            <div style={{ fontWeight:1000, fontSize:15, color:"#0f172a", marginBottom:4 }}>
              🔐 {t("amSectionAccessControl")}
              <span style={{ fontWeight:700, fontSize:12, color:"#94a3b8", marginLeft:6 }}>
                {t("amSectionAccessHint")}
              </span>
            </div>
            <p style={{ fontSize:12, color:"#64748b", marginBottom:12, fontWeight:700 }}>
              {t("amSectionAccessDesc")}
            </p>
            {activeSections.map(sid => {
              const cfg     = SECTION_ITEMS[sid];
              const theme   = BRANCH_THEMES[sid] || BRANCH_THEMES.daily;
              const secMeta = SECTIONS.find(x => x.id === sid);
              return (
                <BranchSelector key={sid} kind={cfg.kind}
                  items={cfg.kind === "pages" ? cfg.items : MASTER_BRANCHES}
                  theme={theme} sectionLabel={secMeta ? `${secMeta.icon} ${t(secMeta.nameKey)}` : theme.title}
                  selected={Array.isArray(access[sid]) ? access[sid] : []}
                  onChange={list => updateSection(sid, list)} />
              );
            })}
          </div>
        );
      })()}

      {err && <div style={fs.err}>⚠️ {err}</div>}

      <div style={{ display:"flex", gap:10, marginTop:22 }}>
        <button type="submit" disabled={saving} style={fs.btnSave}>
          {saving ? t("saving") : isEdit ? `💾 ${t("amSaveChanges")}` : `✅ ${t("amCreateAccount")}`}
        </button>
        <button type="button" onClick={onCancel} style={fs.btnCancel}>{t("cancel")}</button>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════
   ACCOUNT CARD (dark — accounts grid)
═══════════════════════════════════════════════════════ */
/* Days-since-login helper for staleness badge */
function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function AccountCard({ user, onEdit, onToggle, onDelete, currentUsername, adminCount }) {
  const { t } = useSettingsLang();
  const [hover, setHover] = useState(false);
  const initial = (user.display_name || user.username || "?")[0].toUpperCase();
  const grad    = avatarGrad(user.username);
  const isFullAcc = user.permissions?.includes("*");
  const sections  = Object.keys(user.crud_perms || {}).filter(k => (user.crud_perms[k] || []).length > 0);
  const isSelf       = user.username === currentUsername;
  const isLastAdmin  = user.is_admin && adminCount <= 1;
  const isRootAdmin  = user.username === "admin";
  const canDelete    = !isSelf && !isRootAdmin && !isLastAdmin;
  const canToggle    = !isSelf && !(user.is_admin && user.is_active && isLastAdmin);

  /* Login freshness colour: green<7d, yellow<30d, red>=30d, gray=never */
  const dSince = daysSince(user.last_login);
  const freshness =
    dSince === null  ? { color:"#94a3b8", label:t("amNeverLoggedIn") } :
    dSince === 0     ? { color:"#34d399", label:t("amToday") } :
    dSince <  7      ? { color:"#34d399", label:`${dSince} ${t("amDaysAgo")}` } :
    dSince < 30      ? { color:"#fbbf24", label:`${dSince} ${t("amDaysAgo")}` } :
                       { color:"#f87171", label:`${dSince} ${t("amDaysAgo")}` };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   hover ? "rgba(255,255,255,.085)" : "rgba(255,255,255,.04)",
        border:       `1.5px solid ${hover ? "rgba(96,165,250,.5)" : "rgba(255,255,255,.08)"}`,
        borderRadius: 16,
        padding:      "14px 16px",
        backdropFilter: "blur(12px)",
        transition:   "all .15s ease",
        boxShadow:    hover ? "0 10px 28px rgba(0,0,0,.32)" : "0 2px 8px rgba(0,0,0,.18)",
        opacity:      user.is_active ? 1 : 0.55,
        display:      "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        alignItems:   "center",
        gap:          14,
      }}
    >
      {/* Avatar */}
      <div style={{
        width:52, height:52, borderRadius:14, background:grad,
        display:"grid", placeItems:"center",
        fontSize:22, fontWeight:1000, color:"#fff", flexShrink:0,
        boxShadow:"0 4px 12px rgba(0,0,0,.4)",
        border:"1.5px solid rgba(255,255,255,.18)",
      }}>
        {initial}
      </div>

      {/* Main info column: name + meta row */}
      <div style={{ minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontWeight:1000, fontSize:17, color:"#f1f5f9",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {user.display_name || user.username}
          </span>
          <span style={{ fontSize:13, color:"rgba(255,255,255,.5)", fontWeight:700 }}>
            @{user.username}
          </span>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6, alignItems:"center" }}>
          {user.is_admin && (
            <span style={ac.chip("#fbbf24","rgba(251,191,36,.16)")}>👑 {t("adminTag")}</span>
          )}
          {isFullAcc ? (
            <span style={ac.chip("#a78bfa","rgba(167,139,250,.16)")}>⭐ {t("amFullAccessShort")}</span>
          ) : (
            <span style={ac.chip("#60a5fa","rgba(96,165,250,.16)")}>
              🔐 {sections.length} {sections.length !== 1 ? t("amSectionsWord") : t("amSectionWord")}
            </span>
          )}
          {Array.isArray(user.employees) && user.employees.length > 0 && (
            <span style={ac.chip("#34d399","rgba(52,211,153,.16)")}>
              👷 {user.employees.length}
            </span>
          )}
          <span style={{ fontSize:12, fontWeight:800, color:freshness.color,
            padding:"3px 9px", borderRadius:999,
            background:`${freshness.color}1f`, border:`1px solid ${freshness.color}55`,
            whiteSpace:"nowrap" }}
            title={`${t("amLastLogin")}: ${fmt(user.last_login)}`}>
            🕐 {freshness.label}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <div style={{
        padding:"5px 12px", borderRadius:999, fontSize:12, fontWeight:900, flexShrink:0,
        background: user.is_active ? "rgba(52,211,153,.18)" : "rgba(248,113,113,.18)",
        color:      user.is_active ? "#34d399" : "#f87171",
        border:    `1px solid ${user.is_active ? "rgba(52,211,153,.3)" : "rgba(248,113,113,.3)"}`,
      }}>
        {user.is_active ? `● ${t("amActive")}` : `● ${t("amOff")}`}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:5, flexShrink:0 }}>
        <button className="acm-actbtn" onClick={onEdit} style={{
          ...ac.actBtn,
          background:"rgba(59,130,246,.2)", color:"#93c5fd",
          border:"1.5px solid rgba(59,130,246,.35)",
        }} title={t("amEditAccountTip")}>✏️</button>
        <button className={canToggle ? "acm-actbtn" : ""} onClick={canToggle ? onToggle : undefined} disabled={!canToggle} style={{
          ...ac.actBtn,
          background: user.is_active ? "rgba(251,191,36,.18)" : "rgba(52,211,153,.18)",
          color:      user.is_active ? "#fbbf24" : "#34d399",
          border:    `1.5px solid ${user.is_active ? "rgba(251,191,36,.3)" : "rgba(52,211,153,.3)"}`,
          opacity:    canToggle ? 1 : 0.45,
          cursor:     canToggle ? "pointer" : "not-allowed",
        }} title={
          isSelf ? t("amCantDisableSelf")
          : !canToggle ? t("amCantDisableLastAdmin")
          : user.is_active ? t("amDisableAccount") : t("amEnableAccount")
        }>
          {user.is_active ? "🔒" : "🔓"}
        </button>
        {canDelete && (
          <button className="acm-actbtn" onClick={onDelete} style={{
            ...ac.actBtn,
            background:"rgba(248,113,113,.18)", color:"#f87171",
            border:"1.5px solid rgba(248,113,113,.3)",
          }} title={t("amDeleteAccountTip")} data-delete-action="true">🗑️</button>
        )}
      </div>
    </div>
  );
}

const ac = {
  chip: (color, bg) => ({
    padding:"3px 9px", borderRadius:999,
    fontSize:12, fontWeight:900, color, background:bg,
    border:`1px solid ${color}55`, whiteSpace:"nowrap",
  }),
  actBtn: {
    padding:"8px 11px", borderRadius:10,
    fontSize:15, fontWeight:900, cursor:"pointer",
    fontFamily:"Cairo,'Segoe UI',sans-serif",
    transition:"filter .15s, transform .12s",
    textAlign:"center",
  },
};

/* ═══════════════════════════════════════════════════════
   DORMANT ACCOUNTS — accounts inactive for 30/60+ days
═══════════════════════════════════════════════════════ */
function DormantAccountsTab({ users, currentUsername, adminCount, onToggle, onEdit, onDelete }) {
  const { t } = useSettingsLang();
  /* Bucket by staleness — only active accounts, since disabled are already off */
  const buckets = { d30: [], d60: [], d90: [], never: [] };
  users.forEach(u => {
    if (!u.is_active) return;
    if (!u.last_login) { buckets.never.push(u); return; }
    const d = Math.floor((Date.now() - new Date(u.last_login).getTime()) / 86400000);
    if (d >= 90) buckets.d90.push(u);
    else if (d >= 60) buckets.d60.push(u);
    else if (d >= 30) buckets.d30.push(u);
  });

  const groups = [
    { key:"never", icon:"🚫", label:t("amNeverLoggedIn"), color:"#94a3b8", help:t("amNeverHelp"),     list:buckets.never },
    { key:"d90",   icon:"🔴", label:t("amDormant90"),     color:"#f87171", help:t("amDormant90Help"), list:buckets.d90 },
    { key:"d60",   icon:"🟠", label:t("amDormant60"),     color:"#fb923c", help:t("amDormant60Help"), list:buckets.d60 },
    { key:"d30",   icon:"🟡", label:t("amDormant30"),     color:"#fbbf24", help:t("amDormant30Help"), list:buckets.d30 },
  ];
  const totalDormant = buckets.never.length + buckets.d90.length + buckets.d60.length + buckets.d30.length;

  return (
    <div>
      {/* Summary banner */}
      <div style={{
        padding:"16px 20px", borderRadius:14, marginBottom:18,
        background: totalDormant === 0 ? "rgba(52,211,153,.12)" : "rgba(251,191,36,.12)",
        border: `1px solid ${totalDormant === 0 ? "rgba(52,211,153,.4)" : "rgba(251,191,36,.4)"}`,
        color: totalDormant === 0 ? "#34d399" : "#fcd34d",
        fontWeight:800, fontSize:15, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
      }}>
        <span style={{ fontSize:24 }}>{totalDormant === 0 ? "✅" : "⚠️"}</span>
        <div style={{ flex:1, minWidth:200 }}>
          {totalDormant === 0
            ? t("amDormantAllGood")
            : <>{t("amDormantFound1")} <strong>{totalDormant}</strong> {t("amDormantFound2")}</>}
        </div>
      </div>

      {totalDormant === 0 ? null : groups.filter(g => g.list.length > 0).map(g => (
        <section key={g.key} style={{ marginBottom:22 }}>
          <div style={{
            display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap",
            padding:"8px 12px", borderRadius:10,
            background:`${g.color}11`, border:`1px solid ${g.color}44`,
          }}>
            <span style={{ fontSize:20 }}>{g.icon}</span>
            <span style={{ fontWeight:1000, fontSize:16, color:g.color }}>
              {g.label}
            </span>
            <span style={{ fontSize:13, color:`${g.color}cc`, fontWeight:800,
              background:`${g.color}22`, padding:"2px 9px", borderRadius:999 }}>
              {g.list.length}
            </span>
            <span style={{ marginLeft:"auto", fontSize:12, color:"rgba(255,255,255,.5)", fontWeight:700 }}>
              {g.help}
            </span>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {g.list.map(u => (
              <AccountCard key={u.id} user={u}
                currentUsername={currentUsername}
                adminCount={adminCount}
                onEdit={() => onEdit(u)}
                onToggle={() => onToggle(u)}
                onDelete={() => onDelete(u)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FAILED LOGINS MONITOR — security audit
═══════════════════════════════════════════════════════ */
function FailedLoginsTab() {
  const { t } = useSettingsLang();
  const [data, setData]       = useState({ recent: [], byIpLastHour: [] });
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const r = await fetch(`${API_BASE}/api/security/failed-logins?limit=50`);
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      const d = await r.json();
      if (d.ok) setData({ recent: d.recent || [], byIpLastHour: d.byIpLastHour || [] });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const reasonMap = {
    unknown_user:     { label: t("amReasonUnknownUser"),   icon:"❓" },
    wrong_password:   { label: t("amReasonWrongPassword"), icon:"🔑" },
    account_disabled: { label: t("amReasonDisabled"),      icon:"🚫" },
  };

  if (notFound) {
    return (
      <div style={{ padding:"16px 20px", borderRadius:12,
        background:"rgba(251,191,36,.14)", border:"1px solid rgba(251,191,36,.4)",
        color:"#fbbf24", fontWeight:800 }}>
        ⚠️ {t("amFailedNotFound")}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <h3 style={{ margin:0, fontWeight:1000, fontSize:18, color:"#f1f5f9" }}>
          🛡️ {t("amFailedTitle")}
        </h3>
        <button className="acm-actbtn" onClick={load} style={p.btnRefresh}>🔄 {t("amRefresh")}</button>
      </div>

      {/* Suspicious IPs (last hour, 5+ attempts) */}
      {data.byIpLastHour.filter(x => x.attempts >= 5).length > 0 && (
        <div style={{
          padding:"14px 18px", borderRadius:12, marginBottom:18,
          background:"rgba(248,113,113,.13)", border:"1px solid rgba(248,113,113,.45)",
          color:"#fca5a5",
        }}>
          <div style={{ fontWeight:1000, fontSize:15, marginBottom:8, color:"#f87171" }}>
            🚨 {t("amSuspicious")}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {data.byIpLastHour.filter(x => x.attempts >= 5).map(x => (
              <div key={x.ip_addr} style={{
                display:"flex", gap:10, alignItems:"center", flexWrap:"wrap",
                background:"rgba(0,0,0,.25)", padding:"8px 12px", borderRadius:8,
                fontSize:13, fontWeight:700,
              }}>
                <span style={{ fontWeight:1000, color:"#fff", fontSize:14 }}>{x.ip_addr || "unknown"}</span>
                <span style={{ background:"rgba(248,113,113,.3)", color:"#fff",
                  padding:"2px 9px", borderRadius:999, fontWeight:900 }}>
                  {x.attempts} {t("amAttempts")}
                </span>
                <span style={{ color:"rgba(255,255,255,.6)" }}>
                  {t("amTried")}: {(x.usernames || []).slice(0,3).join(", ") || "—"}
                  {(x.usernames?.length || 0) > 3 && ` +${x.usernames.length - 3}`}
                </span>
                <span style={{ marginLeft:"auto", color:"rgba(255,255,255,.5)", fontSize:12 }}>
                  {t("amLast")}: {fmt(x.last_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",
        gap:12, marginBottom:18 }}>
        <FailStat color="#f87171" bg="rgba(248,113,113,.14)" label={t("amTotalRecent")} val={data.recent.length} />
        <FailStat color="#fbbf24" bg="rgba(251,191,36,.14)" label={t("amLastHour")}
          val={data.byIpLastHour.reduce((a,b)=>a + (b.attempts||0), 0)} />
        <FailStat color="#a78bfa" bg="rgba(167,139,250,.14)" label={t("amUniqueIps")}
          val={data.byIpLastHour.length} />
      </div>

      {/* Recent attempts table */}
      {loading ? (
        <div style={p.empty}><div style={{ fontSize:30, marginBottom:8 }}>⏳</div>{t("loading")}</div>
      ) : data.recent.length === 0 ? (
        <div style={p.empty}>
          <div style={{ fontSize:30, marginBottom:8 }}>✅</div>
          {t("amNoFailed")}
        </div>
      ) : (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {[t("amColTime"), t("amUsername"), t("amColReason"), t("amColIp")].map(h => (
                  <th key={h} style={{
                    padding:"14px 16px", fontSize:14, fontWeight:900,
                    color:"rgba(255,255,255,.6)", textAlign:"left",
                    borderBottom:"1px solid rgba(255,255,255,.1)",
                    background:"rgba(255,255,255,.04)",
                    whiteSpace:"nowrap", letterSpacing:".06em", textTransform:"uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((r, i) => {
                const reason = reasonMap[r.detail?.reason] || { label: r.detail?.reason || "—", icon: "⚠️" };
                return (
                  <tr key={r.id} style={{
                    borderBottom:"1px solid rgba(255,255,255,.06)",
                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.025)",
                  }}>
                    <td style={al.td}>{fmt(r.created_at)}</td>
                    <td style={{ ...al.td, fontWeight:900, color:"#e2e8f0" }}>{r.username || "—"}</td>
                    <td style={{ ...al.td, fontWeight:800, color:"#fbbf24" }}>
                      {reason.icon} {reason.label}
                    </td>
                    <td style={{ ...al.td, fontSize:14, color:"rgba(255,255,255,.5)" }}>{r.ip_addr || "—"}</td>
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

function FailStat({ color, bg, label, val }) {
  return (
    <div style={{
      padding:"12px 16px", borderRadius:12,
      background: bg, border: `1px solid ${color}44`,
      display:"flex", flexDirection:"column", gap:2,
    }}>
      <span style={{ fontSize:24, fontWeight:1000, color, lineHeight:1 }}>{val}</span>
      <span style={{ fontSize:12, color:"rgba(255,255,255,.6)", fontWeight:800,
        textTransform:"uppercase", letterSpacing:".05em" }}>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ACTIVITY LOG (grouped by account — click to expand)
═══════════════════════════════════════════════════════ */
function ActivityLogTab() {
  const { t } = useSettingsLang();
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const [expanded, setExpanded] = useState(new Set());  // set of usernames

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/activity-log?limit=500`);
      const d = await r.json();
      if (d.ok) setLogs(d.logs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (username) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };
  const expandAll   = () => setExpanded(new Set(groups.map(g => g.username)));
  const collapseAll = () => setExpanded(new Set());

  /* Group by username — keep entries sorted newest-first within each group */
  const groupMap = new Map();
  for (const log of logs) {
    const key = log.username || "(unknown)";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key).push(log);
  }
  let groups = Array.from(groupMap.entries()).map(([username, entries]) => {
    const last     = entries[0]; // already newest first from server
    const logins   = entries.filter(e => e.action === "login").length;
    const logouts  = entries.filter(e => e.action === "logout").length;
    const failed   = entries.filter(e => e.action === "login_failed").length;
    const uniqueIps = new Set(entries.map(e => e.ip_addr).filter(Boolean)).size;
    return {
      username, entries, last, logins, logouts, failed, uniqueIps,
      total: entries.length,
    };
  });

  /* Filter by username */
  if (filter) {
    const q = filter.toLowerCase();
    groups = groups.filter(g => g.username.toLowerCase().includes(q));
  }
  /* Sort by most recent activity */
  groups.sort((a, b) => new Date(b.last?.created_at || 0) - new Date(a.last?.created_at || 0));

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:220, position:"relative" }}>
          <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:18, pointerEvents:"none" }}>🔍</span>
          <input
            style={{ ...p.searchInput, paddingLeft:42, width:"100%", boxSizing:"border-box" }}
            placeholder={t("amFilterByAccount")}
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
        <button className="acm-actbtn" onClick={expandAll} style={p.btnRefresh}>📂 {t("amExpandAll")}</button>
        <button className="acm-actbtn" onClick={collapseAll} style={p.btnRefresh}>📁 {t("amCollapseAll")}</button>
        <button className="acm-actbtn" onClick={load} style={p.btnRefresh}>🔄 {t("amRefresh")}</button>
      </div>

      {/* Summary line */}
      {!loading && groups.length > 0 && (
        <div style={{ fontSize:14, color:"rgba(255,255,255,.55)", fontWeight:700, marginBottom:12 }}>
          📊 {t("amShowing")} <strong style={{ color:"#e2e8f0" }}>{groups.length}</strong> {t("amAccountsWord")}
          {" · "}<strong style={{ color:"#e2e8f0" }}>{logs.length}</strong> {t("amTotalEvents")}
          {filter && <> · {t("amFilteredBy")} "{filter}"</>}
        </div>
      )}

      {loading ? (
        <div style={p.empty}><div style={{ fontSize:30, marginBottom:8 }}>⏳</div>{t("amLoadingActivity")}</div>
      ) : groups.length === 0 ? (
        <div style={p.empty}>
          <div style={{ fontSize:30, marginBottom:8 }}>{filter ? "🔍" : "📜"}</div>
          {filter ? `${t("amNoMatchAccounts")} "${filter}"` : t("amNoActivity")}
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {groups.map(g => {
            const isOpen = expanded.has(g.username);
            const lastAction = g.last?.action;
            const lastColor =
              lastAction === "login"        ? "#34d399" :
              lastAction === "logout"       ? "#f87171" :
              lastAction === "login_failed" ? "#fbbf24" : "#94a3b8";
            return (
              <div key={g.username} style={{
                background:"rgba(255,255,255,.04)",
                border:`1px solid ${isOpen ? "rgba(96,165,250,.4)" : "rgba(255,255,255,.08)"}`,
                borderRadius:12,
                overflow:"hidden",
                transition:"border-color .15s",
              }}>
                {/* ─── Group header (clickable to toggle) ─── */}
                <button onClick={() => toggle(g.username)} style={{
                  width:"100%", border:"none", cursor:"pointer", fontFamily:"inherit",
                  display:"grid",
                  gridTemplateColumns:"auto 1fr auto auto",
                  alignItems:"center", gap:14,
                  padding:"12px 16px",
                  background: isOpen ? "rgba(96,165,250,.08)" : "transparent",
                  color:"#f1f5f9", textAlign:"left",
                  transition:"background .15s",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width:44, height:44, borderRadius:12, background:avatarGrad(g.username),
                    display:"grid", placeItems:"center",
                    fontSize:20, fontWeight:1000, color:"#fff",
                    boxShadow:"0 4px 10px rgba(0,0,0,.4)",
                    border:"1.5px solid rgba(255,255,255,.18)",
                  }}>
                    {g.username[0]?.toUpperCase() || "?"}
                  </div>

                  {/* Name + meta */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:1000, fontSize:18, color:"#f1f5f9", lineHeight:1.2 }}>
                      {g.username}
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:4, fontSize:13, color:"rgba(255,255,255,.55)", fontWeight:700 }}>
                      <span>🕐 {t("amLast")}: <span style={{ color:lastColor, fontWeight:900 }}>{fmt(g.last?.created_at)}</span></span>
                      {g.uniqueIps > 1 && <span>🌐 {g.uniqueIps} IPs</span>}
                    </div>
                  </div>

                  {/* Activity chips */}
                  <div style={{ display:"flex", gap:5, flexWrap:"nowrap" }}>
                    {g.logins > 0 && (
                      <span style={al.miniChip("#34d399","rgba(52,211,153,.18)")}>🟢 {g.logins}</span>
                    )}
                    {g.logouts > 0 && (
                      <span style={al.miniChip("#f87171","rgba(248,113,113,.18)")}>🔴 {g.logouts}</span>
                    )}
                    {g.failed > 0 && (
                      <span style={al.miniChip("#fbbf24","rgba(251,191,36,.18)")}>⚠️ {g.failed}</span>
                    )}
                  </div>

                  {/* Expand chevron + total */}
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{
                      padding:"3px 11px", borderRadius:999,
                      background:"rgba(96,165,250,.18)", color:"#93c5fd",
                      fontSize:13, fontWeight:900,
                      border:"1px solid rgba(96,165,250,.3)",
                    }}>{g.total}</span>
                    <span style={{
                      fontSize:20, color:"rgba(255,255,255,.45)",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition:"transform .15s",
                      lineHeight:1,
                    }}>›</span>
                  </div>
                </button>

                {/* ─── Expanded body: full event list ─── */}
                {isOpen && (
                  <div style={{
                    borderTop:"1px solid rgba(255,255,255,.07)",
                    background:"rgba(0,0,0,.18)",
                  }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr>
                          {[t("amColTime"), t("amColOperator"), t("amColAction"), t("amColIp")].map(h => (
                            <th key={h} style={al.subTh}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {g.entries.map((log, i) => {
                          const op = log.detail?.operator || log.detail?.displayName || "—";
                          const reason = log.detail?.reason;
                          const isLogin   = log.action === "login";
                          const isLogout  = log.action === "logout";
                          const isFailed  = log.action === "login_failed";
                          const color = isLogin ? "#34d399" : isLogout ? "#f87171" : isFailed ? "#fbbf24" : "#e2e8f0";
                          return (
                            <tr key={log.id} style={{
                              borderBottom:"1px solid rgba(255,255,255,.05)",
                              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,.02)",
                            }}>
                              <td style={al.td}>{fmt(log.created_at)}</td>
                              <td style={{ ...al.td, color:"rgba(255,255,255,.6)" }}>{op}</td>
                              <td style={{ ...al.td, fontWeight:900, color }}>
                                {isLogin  ? `🟢 ${t("amActionLogin")}`
                                 : isLogout ? `🔴 ${t("amActionLogout")}`
                                 : isFailed ? `⚠️ ${t("amActionFailed")}${reason ? ` (${reason})` : ""}`
                                 : log.action}
                              </td>
                              <td style={{ ...al.td, fontSize:14, color:"rgba(255,255,255,.45)" }}>
                                {log.ip_addr || "—"}
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
          })}
        </div>
      )}
    </div>
  );
}

const al = {
  td: { padding:"11px 14px", fontSize:15, color:"rgba(255,255,255,.8)", verticalAlign:"middle" },
  subTh: {
    padding:"10px 14px", fontSize:12, fontWeight:900,
    color:"rgba(255,255,255,.5)", textAlign:"left",
    borderBottom:"1px solid rgba(255,255,255,.08)",
    whiteSpace:"nowrap", letterSpacing:".06em", textTransform:"uppercase",
  },
  miniChip: (color, bg) => ({
    padding:"3px 9px", borderRadius:999,
    fontSize:12, fontWeight:900, color, background:bg,
    border:`1px solid ${color}55`, whiteSpace:"nowrap",
  }),
};

/* ═══════════════════════════════════════════════════════
   MAIN — Account Control Center
═══════════════════════════════════════════════════════ */
export default function AccountsManagementTab({ onClose }) {
  const { t, dir } = useSettingsLang();
  const [view, setView]         = useState("list");
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [serverReady, setServerReady] = useState(true);
  const [editUser, setEditUser] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [search, setSearch]     = useState("");

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
    /* Success disappears fast; errors hang around so the admin actually sees them */
    setTimeout(() => setMsg(null), type === "ok" ? 4500 : 9000);
  };

  const handleSave = async (form) => {
    if (!serverReady) { showMsg("err", t("amServerNotDeployed")); return; }
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
      const r = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) });
      const d = await r.json();
      if (!d.ok) {
        showMsg("err", d.error === "username_taken" ? t("amUsernameTaken") : (d.error || t("amServerError")));
      } else {
        showMsg("ok", isEdit ? `${t("amAccountUpdated")} ✅` : `${t("amAccountCreated")} ✅`);
        setView("list"); setEditUser(null); loadUsers();
      }
    } catch { showMsg("err", t("amNetworkError")); }
    setSaving(false);
  };

  const handleToggle = async (user) => {
    /* Self-disable protection (server-side trust applies — UI lock is primary) */
    const currentName = (() => {
      try { return JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; }
      catch { return ""; }
    })();
    if (user.is_active && user.username === currentName) {
      showMsg("err", t("amCantDisableSelfLoggedIn"));
      return;
    }
    /* Don't allow disabling the last active admin */
    if (user.is_active && user.is_admin &&
        users.filter(u => u.is_admin && u.is_active).length <= 1) {
      showMsg("err", t("amCantDisableLastActiveAdmin"));
      return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${user.id}`, {
        method:"PUT", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ isActive: !user.is_active }),
      });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.map(u => u.id === user.id ? d.user : u));
        showMsg("ok", user.is_active ? t("amAccountDisabled") : t("amAccountEnabled"));
      } else {
        showMsg("err", d.error || t("amOperationRejected"));
      }
    } catch { showMsg("err", t("amToggleFailed")); }
  };

  const handleDelete = async (user) => {
    /* Belt-and-suspenders guards (UI already hides the button, but never trust the UI) */
    const currentName = (() => {
      try { return JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; }
      catch { return ""; }
    })();
    if (user.username === currentName) {
      showMsg("err", t("amCantDeleteSelf"));
      setConfirmDel(null); return;
    }
    if (user.username === "admin") {
      showMsg("err", t("amRootProtected"));
      setConfirmDel(null); return;
    }
    if (user.is_admin && users.filter(u => u.is_admin && u.is_active).length <= 1) {
      showMsg("err", t("amCantDeleteLastAdmin"));
      setConfirmDel(null); return;
    }
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${user.id}`, { method:"DELETE" });
      const d = await r.json();
      if (d.ok) {
        setUsers(prev => prev.filter(u => u.id !== user.id));
        showMsg("ok", `${t("amDeleted")} "${user.username}"`);
      } else {
        showMsg("err", d.error || t("amDeleteFailed"));
      }
    } catch { showMsg("err", t("amDeleteFailed")); }
    setConfirmDel(null);
  };

  const exportCSV = () => {
    const headers = ["Username","Display Name","Admin","Permissions","Sections","Employees","Last Login","Status"];
    const rows = users.map(u => [
      u.username,
      u.display_name || "",
      u.is_admin ? "Yes" : "No",
      u.permissions?.includes("*") ? "Full Access" : "Restricted",
      u.permissions?.includes("*") ? "All" : Object.keys(u.crud_perms || {}).filter(k => (u.crud_perms[k] || []).length > 0).join("; "),
      (u.employees || []).join("; "),
      fmt(u.last_login),
      u.is_active ? "Active" : "Disabled",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type:"text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `accounts_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const filteredUsers = search
    ? users.filter(u =>
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        (u.display_name || "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  /* Current logged-in username — used to lock self-destruction in cards */
  const currentUsername = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; }
    catch { return ""; }
  })();
  const adminCount = users.filter(u => u.is_admin && u.is_active).length;

  const stats = [
    { label:t("amStatTotal"),    val:users.length,                              color:"#60a5fa", bg:"rgba(96,165,250,.15)"  },
    { label:t("amStatActive"),   val:users.filter(u => u.is_active).length,    color:"#34d399", bg:"rgba(52,211,153,.15)"  },
    { label:t("amStatDisabled"), val:users.filter(u => !u.is_active).length,   color:"#f87171", bg:"rgba(248,113,113,.15)" },
    { label:t("amStatAdmins"),   val:users.filter(u => u.is_admin).length,     color:"#fbbf24", bg:"rgba(251,191,36,.15)"  },
  ];

  /* active nav key */
  const activeNav =
    view === "form" && !editUser ? "new" :
    view === "form" &&  editUser ? "edit" :
    view;

  /* Dormant = active accounts with no login in 30+ days (or never logged in) */
  const dormantCount = users.filter(u => {
    if (!u.is_active) return false;
    const d = u.last_login ? Math.floor((Date.now() - new Date(u.last_login).getTime()) / 86400000) : 9999;
    return d >= 30;
  }).length;

  const NAV = [
    { id:"list",     icon:"👥", label:t("amNavAll"), badge: users.length },
    { id:"new",      icon:"➕", label:t("amNavAdd") },
    { id:"dormant",  icon:"😴", label:t("amNavDormant"), badge: dormantCount || undefined,
      badgeColor: dormantCount > 0 ? "warn" : null },
    { id:"security", icon:"🛡️", label:t("amNavFailed") },
    { id:"activity", icon:"📜", label:t("amNavActivity") },
  ];

  return (
    <div style={p.shell} dir={dir}>
      <style>{`
        .acm-tab:hover{background:rgba(255,255,255,.1) !important; color:#fff !important;}
        .acm-actbtn:hover{filter:brightness(1.15); transform:translateY(-1px);}
        .acm-actbtn{transition:all .15s;}
        .acm-searchinput:focus{border-color:rgba(96,165,250,.6) !important; outline:none;}
        .acm-searchinput::placeholder{color:rgba(255,255,255,.3);}
      `}</style>

      {/* ══════════════ COMPACT TOOLBAR ══════════════ */}
      <div style={p.toolbar}>
        {/* Stats inline */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {stats.map(s => (
            <div key={s.label} style={{ ...p.statChipInline, background:s.bg, border:`1px solid ${s.color}44` }}>
              <span style={{ color:s.color, fontWeight:1000, fontSize:18, lineHeight:1 }}>{s.val}</span>
              <span style={{ color:"rgba(255,255,255,.65)", fontSize:14, fontWeight:800 }}>{s.label}</span>
            </div>
          ))}
        </div>

        <div style={{ flex:1 }} />

        {/* Action buttons */}
        <button className="acm-actbtn" onClick={exportCSV}
          style={{ ...p.btnToolbar, background:"rgba(16,185,129,.18)", color:"#34d399", border:"1px solid rgba(16,185,129,.35)" }}
          title={t("amExportCsvTip")}>
          📥 CSV
        </button>
        {onClose && (
          <button className="acm-actbtn" onClick={onClose}
            style={{ ...p.btnToolbar, background:"rgba(255,255,255,.08)", color:"#e2e8f0", border:"1px solid rgba(255,255,255,.18)" }}>
            ✕
          </button>
        )}
      </div>

      {/* ══════════════ HORIZONTAL TABS ══════════════ */}
      <div style={p.tabsBar}>
        {NAV.map(n => {
          const isActive = activeNav === n.id;
          return (
            <button key={n.id} className="acm-tab"
              onClick={() => {
                if (n.id === "new") { setEditUser(null); setView("form"); }
                else { setView(n.id); }
              }}
              style={{
                ...p.tab,
                background: isActive ? "rgba(96,165,250,.18)" : "transparent",
                color:      isActive ? "#93c5fd" : "rgba(255,255,255,.55)",
                borderBottom: `2px solid ${isActive ? "#60a5fa" : "transparent"}`,
              }}
            >
              <span style={{ fontSize:20 }}>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge !== undefined && (
                <span style={{
                  fontSize:13, fontWeight:900,
                  background: n.badgeColor === "warn" ? "rgba(251,191,36,.25)" : "rgba(96,165,250,.2)",
                  color:      n.badgeColor === "warn" ? "#fbbf24" : "#93c5fd",
                  padding:"2px 9px", borderRadius:999,
                  border: `1px solid ${n.badgeColor === "warn" ? "rgba(251,191,36,.4)" : "rgba(96,165,250,.3)"}`,
                }}>{n.badge}</span>
              )}
            </button>
          );
        })}
        {view === "form" && editUser && (
          <div style={{
            marginLeft:"auto", display:"flex", alignItems:"center", gap:8,
            padding:"6px 12px", borderRadius:9,
            background:"rgba(167,139,250,.15)", border:"1px solid rgba(167,139,250,.3)",
            fontSize:15, fontWeight:800, color:"#c4b5fd",
          }}>
            ✏️ {t("amEditing")} <strong>{editUser.username}</strong>
            <button onClick={() => { setView("list"); setEditUser(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#c4b5fd",
                fontWeight:900, fontSize:18, padding:"0 2px", lineHeight:1 }}>×</button>
          </div>
        )}
      </div>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <main style={p.mainContent}>

          {/* Toast notification */}
          {msg && (
            <div style={{
              padding:"12px 18px", borderRadius:12, marginBottom:18,
              fontWeight:800, fontSize:15,
              background: msg.type === "ok" ? "rgba(52,211,153,.18)" : "rgba(248,113,113,.18)",
              color:      msg.type === "ok" ? "#34d399" : "#f87171",
              border:    `1px solid ${msg.type === "ok" ? "rgba(52,211,153,.4)" : "rgba(248,113,113,.4)"}`,
              backdropFilter:"blur(8px)",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
            }}>
              <span>{msg.text}</span>
              <button onClick={() => setMsg(null)} style={{
                background:"transparent", border:"none", cursor:"pointer",
                color:"inherit", fontSize:18, fontWeight:1000, padding:"0 4px",
                lineHeight:1, opacity:0.7,
              }} title={t("amDismiss")}>✕</button>
            </div>
          )}

          {/* Server not ready warning */}
          {!serverReady && (
            <div style={{
              padding:"14px 18px", borderRadius:12, marginBottom:18,
              background:"rgba(251,191,36,.14)", border:"1px solid rgba(251,191,36,.35)",
              color:"#fbbf24", fontWeight:800, fontSize:14,
            }}>
              ⚠️ {t("amServerNotFound")}
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === "list" && (
            <div>
              {/* Search + refresh */}
              <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:240, position:"relative" }}>
                  <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", fontSize:16, pointerEvents:"none" }}>🔍</span>
                  <input
                    className="acm-searchinput"
                    style={{ ...p.searchInput, paddingLeft:40, width:"100%", boxSizing:"border-box" }}
                    placeholder={t("amSearchPlaceholder")}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <button className="acm-actbtn" onClick={loadUsers} style={p.btnRefresh}>
                  🔄 {t("amRefresh")}
                </button>
                <button className="acm-actbtn"
                  onClick={() => { setEditUser(null); setView("form"); }}
                  style={{ ...p.btnRefresh, background:"rgba(59,130,246,.22)", color:"#93c5fd", border:"1px solid rgba(59,130,246,.4)" }}>
                  ➕ {t("amNavAdd")}
                </button>
              </div>

              {/* Content */}
              {loading ? (
                <div style={p.empty}><div style={{ fontSize:34, marginBottom:10 }}>⏳</div>{t("amLoadingAccounts")}</div>
              ) : filteredUsers.length === 0 ? (
                <div style={p.empty}>
                  <div style={{ fontSize:34, marginBottom:10 }}>{search ? "🔍" : "👥"}</div>
                  {search ? `${t("amNoMatchAccounts")} "${search}"` : t("amNoAccounts")}
                </div>
              ) : (
                <div style={p.cardsGrid}>
                  {filteredUsers.map(u => (
                    <AccountCard key={u.id} user={u}
                      currentUsername={currentUsername}
                      adminCount={adminCount}
                      onEdit={() => { setEditUser(u); setView("form"); }}
                      onToggle={() => handleToggle(u)}
                      onDelete={() => setConfirmDel(u)} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FORM VIEW ── */}
          {view === "form" && (
            <AccountForm
              initial={editUser ? formStateFromUser(editUser) : EMPTY_FORM}
              onSave={handleSave}
              onCancel={() => { setView("list"); setEditUser(null); }}
              saving={saving}
            />
          )}

          {/* ── DORMANT ACCOUNTS VIEW ── */}
          {view === "dormant" && (
            <DormantAccountsTab
              users={users}
              currentUsername={currentUsername}
              adminCount={adminCount}
              onToggle={handleToggle}
              onEdit={(u) => { setEditUser(u); setView("form"); }}
              onDelete={(u) => setConfirmDel(u)}
            />
          )}

          {/* ── FAILED LOGINS VIEW ── */}
          {view === "security" && <FailedLoginsTab />}

          {/* ── ACTIVITY VIEW ── */}
          {view === "activity" && <ActivityLogTab />}
      </main>

      {/* ══════════════ DELETE CONFIRM MODAL ══════════════ */}
      {confirmDel && (
        <div style={p.overlay}>
          <div style={p.modal}>
            <div style={{ fontWeight:1000, fontSize:20, marginBottom:10, color:"#f1f5f9" }}>
              🗑️ {t("amDeleteAccountTitle")}
            </div>
            <p style={{ color:"rgba(255,255,255,.7)", marginBottom:20, fontSize:15, lineHeight:1.65 }}>
              {t("amDeleteConfirm1")} <strong style={{ color:"#f1f5f9" }}>{confirmDel.username}</strong>?<br/>
              {t("amDeleteConfirm2")}
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => handleDelete(confirmDel)} style={{
                flex:1, padding:"13px", background:"#dc2626", color:"#fff",
                border:"none", borderRadius:10, fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit",
              }} data-delete-action="true">🗑️ {t("delete")}</button>
              <button onClick={() => setConfirmDel(null)} style={{
                flex:1, padding:"13px",
                background:"rgba(255,255,255,.1)", color:"#e2e8f0",
                border:"1px solid rgba(255,255,255,.18)", borderRadius:10,
                fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit",
              }}>{t("cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DARK PANEL STYLES
═══════════════════════════════════════════════════════ */
const p = {
  /* Compact shell — no min-height, sizes to its content. Sits inside parent. */
  shell: {
    background:"linear-gradient(140deg,rgba(15,23,42,.98) 0%,rgba(30,27,75,.96) 50%,rgba(15,23,42,.98) 100%)",
    display:"flex", flexDirection:"column",
    fontFamily:"Cairo,'Segoe UI',system-ui,sans-serif",
    borderRadius:16,
    border:"1px solid rgba(255,255,255,.08)",
    overflow:"hidden",
    position:"relative",
  },
  /* Toolbar row: stats + actions */
  toolbar: {
    display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
    padding:"14px 18px",
    background:"rgba(255,255,255,.03)",
    borderBottom:"1px solid rgba(255,255,255,.06)",
  },
  statChipInline: {
    display:"inline-flex", alignItems:"baseline", gap:6,
    padding:"7px 14px", borderRadius:999,
  },
  btnToolbar: {
    padding:"10px 18px", borderRadius:10,
    fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit",
    whiteSpace:"nowrap",
  },
  /* Horizontal tab strip */
  tabsBar: {
    display:"flex", alignItems:"center", gap:4, flexWrap:"wrap",
    padding:"6px 14px 0",
    background:"rgba(255,255,255,.02)",
    borderBottom:"1px solid rgba(255,255,255,.07)",
  },
  tab: {
    display:"inline-flex", alignItems:"center", gap:8,
    padding:"12px 18px",
    border:"none", borderRadius:"10px 10px 0 0",
    cursor:"pointer", fontFamily:"inherit",
    fontWeight:800, fontSize:18,
    transition:"all .15s",
    whiteSpace:"nowrap",
  },
  /* Content area: auto-sized, padding only */
  mainContent: { padding:"18px 20px" },
  searchInput: {
    padding:"11px 14px", borderRadius:11,
    background:"rgba(255,255,255,.06)",
    border:"1px solid rgba(255,255,255,.12)",
    color:"#f1f5f9", fontSize:18,
    fontFamily:"Cairo,'Segoe UI',sans-serif",
    fontWeight:700,
  },
  btnRefresh: {
    padding:"11px 18px", borderRadius:11,
    background:"rgba(255,255,255,.06)", color:"#e2e8f0",
    border:"1px solid rgba(255,255,255,.13)",
    fontWeight:900, fontSize:15, cursor:"pointer",
    fontFamily:"Cairo,'Segoe UI',sans-serif",
    whiteSpace:"nowrap",
  },
  cardsGrid: { display:"flex", flexDirection:"column", gap:10 },
  empty: { textAlign:"center", padding:"30px 20px", color:"rgba(255,255,255,.35)", fontWeight:700, fontSize:16 },
  overlay: {
    position:"fixed", inset:0,
    background:"rgba(0,0,0,.65)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:9999, backdropFilter:"blur(6px)",
  },
  modal: {
    background:"rgba(15,23,42,.96)",
    border:"1px solid rgba(255,255,255,.16)",
    borderRadius:18, padding:"24px 28px",
    width:"min(420px,92vw)",
    backdropFilter:"blur(24px)",
    boxShadow:"0 28px 64px rgba(0,0,0,.55)",
  },
};

/* ═══════════════════════════════════════════════════════
   LIGHT FORM STYLES (used inside white AccountForm card)
═══════════════════════════════════════════════════════ */
const fs = {
  formWrap: {
    background:"#fff", border:"1px solid #e2e8f0",
    borderRadius:18, padding:"28px 32px",
    maxWidth:"100%",
  },
  title:  { margin:"0 0 22px", fontWeight:1000, fontSize:22, color:"#0f172a" },
  row:    { display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" },
  field:  { flex:1, minWidth:220, display:"flex", flexDirection:"column", gap:6 },
  label:  { fontSize:13, fontWeight:900, color:"#475569", textTransform:"uppercase", letterSpacing:".05em" },
  input:  {
    padding:"12px 14px", border:"1.5px solid #e2e8f0", borderRadius:10,
    fontSize:16, fontFamily:"inherit", color:"#0f172a",
    background:"#f8fafc", outline:"none", width:"100%", boxSizing:"border-box",
  },
  checkRow: { display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"6px 8px", borderRadius:8 },
  err: { color:"#991b1b", background:"#fee2e2", padding:"10px 14px", borderRadius:8, fontSize:15, fontWeight:800, marginTop:10 },
  /* permissions table */
  permBox:    { border:"1.5px solid #e2e8f0", borderRadius:14, padding:"16px 18px", marginBottom:18, background:"#fafafa" },
  permHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 },
  permTitle:  { fontWeight:900, fontSize:16, color:"#0f172a" },
  fullAccessBanner: { background:"#f3e8ff", border:"1px solid #d8b4fe", borderRadius:10, padding:"12px 16px", color:"#7c3aed", fontWeight:800, fontSize:15 },
  permTable:  { width:"100%", borderCollapse:"collapse", fontSize:14 },
  permTh:     { padding:"10px 14px", background:"#f1f5f9", fontSize:13, fontWeight:900, color:"#475569", textAlign:"center", whiteSpace:"nowrap", borderBottom:"2px solid #e2e8f0" },
  permTd:     { padding:"10px 12px", verticalAlign:"middle" },
  btnSelectAll: { fontSize:13, fontWeight:900, color:"#2563eb", background:"#dbeafe", border:"1px solid #bfdbfe", borderRadius:8, cursor:"pointer", padding:"5px 12px", fontFamily:"inherit" },
  btnAllOps:  { background:"none", border:"none", cursor:"pointer", fontSize:16, padding:"2px 6px", borderRadius:6 },
  /* employees */
  empBox:      { border:"1.5px solid #e2e8f0", borderRadius:14, padding:"16px 18px", marginBottom:18, background:"#fafafa" },
  empChip:     { display:"flex", alignItems:"center", gap:6, background:"#dbeafe", border:"1px solid #bfdbfe", borderRadius:999, padding:"4px 12px", fontSize:14 },
  empRemoveBtn:{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontWeight:900, fontSize:17, lineHeight:1, padding:"0 2px" },
  btnAdd2:     { padding:"10px 18px", background:"#2563eb", color:"#fff", border:"none", borderRadius:10, fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit" },
  /* form action buttons */
  btnSave:     { padding:"12px 26px", background:"linear-gradient(135deg,#2563eb,#7c3aed)", color:"#fff", border:"none", borderRadius:10, fontWeight:900, fontSize:16, cursor:"pointer", fontFamily:"inherit" },
  btnCancel:   { padding:"12px 22px", background:"#f1f5f9", color:"#374151", border:"1px solid #e2e8f0", borderRadius:10, fontWeight:900, fontSize:16, cursor:"pointer", fontFamily:"inherit" },
};
