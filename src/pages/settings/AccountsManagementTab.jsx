// src/pages/settings/AccountsManagementTab.jsx
// 👥 Account Control Center — full-screen dark admin dashboard
// Accepts optional onClose prop; when omitted it renders inline.

import React, { useState, useEffect, useCallback, useRef } from "react";
import API_BASE from "../../config/api";
import { SECTION_ITEMS } from "../../utils/sectionItems";
import { useSettingsLang } from "./_shared/settingsI18n";
import { logSettingsAudit } from "../../utils/settingsAudit";
import {
  GROUP_COLORS,
  UNGROUPED,
  NO_BRANCH,
  assignMember,
  autoGroupByBranch,
  branchesOfUser,
  colorOf,
  groupByCustom,
  groupOfUser,
  normalizeGroup,
  removeGroup,
  unassignMember,
  upsertGroup,
  useAccountGroups,
} from "./_shared/accountGroups";

/* ═══════════════════════════════════════════════════════
   DESIGN TOKENS — one calm light palette for the whole screen
   ═══════════════════════════════════════════════════════
   The screen used to be a dark dashboard that was half-converted to light:
   selects, bucket headers and the whole reset-password modal still carried
   dark-theme colours (#e2e8f0 text, rgba(255,255,255,.07) fills) and were
   invisible on white. Everything now reads from these tokens, so a colour
   never has to be guessed at a call site again. */
const TK = {
  ink:      "#12324c",   // headings and numbers
  inkSoft:  "#546f88",   // body
  inkFaint: "#8aa2b8",   // captions, placeholders
  line:     "#e3edf6",   // hairlines
  lineHi:   "#cfe0f0",   // hover / focus hairline
  surface:  "#ffffff",
  tint:     "#f6fafd",   // page-level fills, toolbars
  tint2:    "#edf4fb",   // pressed / selected fills
  brand:    "#1f6fd0",
  brandSoft:"#e9f2fd",
  teal:     "#0f766e",
  tealSoft: "#e6f4f2",
  green:    "#0f7a45",
  greenSoft:"#e9f7ef",
  amber:    "#b45309",
  amberSoft:"#fdf3e3",
  rose:     "#be123c",
  roseSoft: "#fdeef1",
  violet:   "#6d28d9",
  violetSoft:"#f3edfd",
  r:   16,
  rMd: 12,
  rSm: 10,
  shadow:   "0 1px 2px rgba(16,42,67,.04), 0 8px 22px rgba(16,42,67,.05)",
  shadowHi: "0 2px 6px rgba(16,42,67,.07), 0 18px 40px rgba(16,42,67,.10)",
  font: "Cairo,'Segoe UI',system-ui,sans-serif",
};


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
  { id: "kpi",              icon: "📈",   nameKey: "amSecKpi" },
  { id: "inspector",        icon: "🔍",   nameKey: "amSecInspector" },
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
  { id: "butcher",          icon: "🔪",   nameKey: "amSecButcher" },
  { id: "workforce",        icon: "👥",   nameKey: "amSecWorkforce" },
  { id: "mrp",              icon: "🏭",   nameKey: "amSecMrp" },
  { id: "productTrace",     icon: "🧬",   nameKey: "amSecProductTrace" },
  // Email Center was a dashboard card and a live route with NO entry here, so
  // it could be neither granted nor denied: the tile is drawn from
  // `permissions.includes(id)`, and no account could ever hold an id that the
  // form never offered — while /email-center itself sat behind a plain
  // signed-in check, reachable by anyone who typed the URL. Both halves are
  // fixed: the row below makes it grantable, and App.jsx now guards the route.
  { id: "emailCenter",      icon: "📨",   nameKey: "amSecEmailCenter" },
  { id: "settings",         icon: "⚙️",  nameKey: "amSecSettings" },
];

const CRUD_OPS = [
  { id: "view",    icon: "👁️", nameKey: "amView",     color: "#2563eb" },
  { id: "write",   icon: "✏️", nameKey: "amWrite",    color: "#059669" },
  { id: "edit",    icon: "📝", nameKey: "amEditOp",   color: "#d97706" },
  { id: "delete",  icon: "🗑️", nameKey: "amDelOp",    color: "#dc2626" },
  // "history" lifts the recent-only window on report views. It only has an
  // effect on the Daily (POS 10/11/15/19) and Returns sections; elsewhere it
  // is stored but never checked. See utils/reportWindow.js.
  { id: "history", icon: "🕰️", nameKey: "amHistoryOp", color: "#7c3aed" },
];

/* Sections where the "history" op has an effect (lifts the recent-only report
   window). Elsewhere the column renders a muted dash so it isn't misleading. */
const HISTORY_SECTIONS = new Set(["daily", "returns"]);

const EMPTY_FORM = {
  username: "", displayName: "", password: "", confirmPassword: "",
  isAdmin: false, isFullAccess: false, crudPerms: {}, employees: [], allowedBranches: {},
  companyId: "",
};

const BRANCH_THEMES = {
  admin:            { icon:"👑",  title:"Admin",             bg:"#fffbeb", border:"#fde68a", accent:"#b45309", chipOn:"#fef3c7", chipOnText:"#78350f", badgeBg:"#fef3c7", badgeBorder:"#fcd34d", badgeText:"#78350f" },
  kpi:              { icon:"📈",  title:"KPI Dashboard",     bg:"#ecfdf5", border:"#99f6e4", accent:"#0f766e", chipOn:"#ccfbf1", chipOnText:"#134e4a", badgeBg:"#ccfbf1", badgeBorder:"#5eead4", badgeText:"#134e4a" },
  inspector:        { icon:"🔍",  title:"Inspector",         bg:"#eff6ff", border:"#bfdbfe", accent:"#1d4ed8", chipOn:"#dbeafe", chipOnText:"#1e3a8a", badgeBg:"#dbeafe", badgeBorder:"#93c5fd", badgeText:"#1e3a8a" },
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
  butcher:          { icon:"🔪",  title:"Butcher",           bg:"#fef2f2", border:"#fecaca", accent:"#991b1b", chipOn:"#fee2e2", chipOnText:"#7f1d1d", badgeBg:"#fee2e2", badgeBorder:"#fca5a5", badgeText:"#7f1d1d" },
  workforce:        { icon:"👥",  title:"Workforce",         bg:"#f5f3ff", border:"#ddd6fe", accent:"#6d28d9", chipOn:"#ede9fe", chipOnText:"#4c1d95", badgeBg:"#ede9fe", badgeBorder:"#c4b5fd", badgeText:"#4c1d95" },
  mrp:              { icon:"🏭",  title:"Manufacturing",     bg:"#ecfdf5", border:"#a7f3d0", accent:"#0f766e", chipOn:"#d1fae5", chipOnText:"#115e59", badgeBg:"#d1fae5", badgeBorder:"#6ee7b7", badgeText:"#115e59" },
  productTrace:     { icon:"🧬",  title:"Product Traceability", bg:"#f5f3ff", border:"#ddd6fe", accent:"#6d28d9", chipOn:"#ede9fe", chipOnText:"#4c1d95", badgeBg:"#ede9fe", badgeBorder:"#c4b5fd", badgeText:"#4c1d95" },
  emailCenter:      { icon:"📨",  title:"Email Center",      bg:"#eff6ff", border:"#bfdbfe", accent:"#1e40af", chipOn:"#dbeafe", chipOnText:"#1e3a8a", badgeBg:"#dbeafe", badgeBorder:"#93c5fd", badgeText:"#1e3a8a" },
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
    companyId:       u.company_id != null ? String(u.company_id) : "",
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
              style={{ ...fs.cbBig, accentColor:"#7c3aed" }} />
            <span style={{ fontWeight:900, color:"#7c3aed", fontSize:16 }}>
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
                <th style={{ ...fs.permTh, textAlign:"start", minWidth:250 }}>{t("amColSection")}</th>
                {CRUD_OPS.map(op => (
                  <th key={op.id} style={{ ...fs.permTh, color:op.color, minWidth:78 }}>
                    <span style={{ fontSize:17, display:"block", lineHeight:1.4 }}>{op.icon}</span>
                    {t(op.nameKey)}
                  </th>
                ))}
                <th style={fs.permTh}>{t("amColAllOps")}</th>
              </tr>
            </thead>
            <tbody>
              {SECTIONS.map((sec, i) => {
                const hasAccess = !!(crudPerms[sec.id]?.length > 0);
                const ops = crudPerms[sec.id] || [];
                const theme = BRANCH_THEMES[sec.id] || BRANCH_THEMES.daily;
                return (
                  <tr
                    key={sec.id}
                    className="acm-permrow"
                    style={{
                      background: hasAccess ? "#fff" : i % 2 === 0 ? "#f8fafc" : "#fff",
                      // Off rows used to drop to opacity .5, which greyed the
                      // section NAME too and made the list hard to read while
                      // hunting for the row you came to switch on. The row is
                      // now marked by its left edge instead, and only the
                      // disabled boxes dim.
                      boxShadow: hasAccess ? `inset 3px 0 0 ${theme.accent}` : "inset 3px 0 0 #e2e8f0",
                    }}
                  >
                    <td style={fs.permTd}>
                      {/* The whole name is the hit target for the row's master
                          switch — a 22px box is still a small thing to aim at. */}
                      <label style={fs.permSecLabel} title={t("amColAccess")}>
                        <input
                          type="checkbox"
                          checked={hasAccess}
                          onChange={() => toggleSection(sec.id)}
                          style={{ ...fs.cbBig, accentColor: theme.accent }}
                        />
                        <span style={{ fontSize: 19, lineHeight: 1 }}>{sec.icon}</span>
                        <span style={{ fontWeight: 900, fontSize: 15, color: hasAccess ? "#0f172a" : "#64748b" }}>
                          {t(sec.nameKey)}
                        </span>
                      </label>
                    </td>
                    {CRUD_OPS.map(op => {
                      const inert = op.id === "history" && !HISTORY_SECTIONS.has(sec.id);
                      const locked = !hasAccess || (op.id !== "view" && !ops.includes("view"));
                      const on = ops.includes(op.id);
                      return (
                        <td key={op.id} style={{ ...fs.permTd, textAlign:"center" }}>
                          {inert ? (
                            <span style={{ color:"#cbd5e1", fontWeight:900, fontSize:16 }}
                              title="Only applies to Daily (POS) & Returns reports">—</span>
                          ) : (
                            <label
                              style={{
                                ...fs.cbCell,
                                background: on ? `${op.color}14` : "transparent",
                                borderColor: on ? op.color : "transparent",
                                cursor: locked ? "not-allowed" : "pointer",
                                opacity: locked ? 0.35 : 1,
                              }}
                              title={t(op.nameKey)}
                            >
                              <input type="checkbox" checked={on}
                                disabled={locked}
                                onChange={() => toggleOp(sec.id, op.id)}
                                style={{ ...fs.cbBig, accentColor: op.color, cursor: locked ? "not-allowed" : "pointer" }} />
                            </label>
                          )}
                        </td>
                      );
                    })}
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
   SUB-ITEM MODAL — popup when clicking a chip with subItems
═══════════════════════════════════════════════════════ */
function SubItemModal({ item, selected, theme, onSave, onClose }) {
  const [local, setLocal] = useState(
    () => item.subItems.filter(s => selected.includes(s.id)).map(s => s.id)
  );
  const toggle = (id) =>
    setLocal(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "grid", placeItems: "center", zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 16, padding: "28px 32px",
          minWidth: 320, maxWidth: 420, width: "90vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          border: `2px solid ${theme.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontWeight: 1000, fontSize: 17, color: theme.accent, marginBottom: 20 }}>
          {item.icon} {item.label}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {item.subItems.map(sub => {
            const checked = local.includes(sub.id);
            return (
              <label key={sub.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px", borderRadius: 10, cursor: "pointer",
                background: checked ? theme.chipOn : "#f8fafc",
                border: `1.5px solid ${checked ? theme.accent : "#e2e8f0"}`,
                fontWeight: checked ? 900 : 700,
                color: checked ? theme.chipOnText : "#475569",
                transition: "all .12s", userSelect: "none",
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(sub.id)}
                  style={{ width: 18, height: 18, accentColor: theme.accent, flexShrink: 0 }} />
                <span style={{ fontSize: 22 }}>{sub.icon}</span>
                <span style={{ fontSize: 15 }}>{sub.label}</span>
              </label>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={() => onSave(local)} style={{
            flex: 1, padding: "11px 0", borderRadius: 10, border: "none",
            background: theme.accent, color: "#fff", fontWeight: 900, fontSize: 15,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            ✅ Save
          </button>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            border: "1px solid #e2e8f0", background: "#f8fafc",
            color: "#475569", fontWeight: 900, fontSize: 15,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BRANCH / PAGE SELECTOR (light — inside form card)
═══════════════════════════════════════════════════════ */
function BranchSelector({ selected, onChange, theme, sectionLabel, items, kind = "branches" }) {
  const { t } = useSettingsLang();
  const [modalItem, setModalItem] = useState(null);
  const list = Array.isArray(items) && items.length > 0 ? items : MASTER_BRANCHES;
  const isRestricted = selected.length > 0;
  const noun  = kind === "pages" ? t("amPageWord") : t("amBranchWord");
  const nounP = kind === "pages" ? t("amPagesWord") : t("amBranchesWord");
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter(b => b !== id) : [...selected, id]);
  const handleSubSave = (parentItem, chosenIds) => {
    const withoutOld = selected.filter(id => !parentItem.subItems.some(s => s.id === id));
    onChange([...withoutOld, ...chosenIds]);
    setModalItem(null);
  };

  return (
    <>
    <div style={{ border:`1.5px solid ${theme.border}`, borderRadius:14, padding:"16px 18px", marginBottom:14, background:theme.bg }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:8 }}>
        <div style={{ fontWeight:900, fontSize:16, color:theme.accent }}>
          {sectionLabel || `${theme.icon} ${theme.title}`} — {kind === "pages" ? t("amPageAccess") : t("amBranchAccess")}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          <button type="button" onClick={() => {
              const all = [];
              list.forEach(b => b.subItems ? b.subItems.forEach(s => all.push(s.id)) : all.push(b.id));
              onChange(all);
            }}
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
          if (b.subItems) {
            const checkedSubs = b.subItems.filter(s => selected.includes(s.id));
            const checked = checkedSubs.length > 0;
            return (
              <div key={b.id} role="button" tabIndex={0}
                onClick={() => setModalItem(b)}
                onKeyDown={e => e.key === "Enter" && setModalItem(b)}
                style={{
                  display:"flex", alignItems:"center", gap:6,
                  padding:"7px 10px", borderRadius:8, cursor:"pointer",
                  background: checked ? theme.chipOn : "#fff",
                  border:`1.5px solid ${checked ? theme.accent : "#e2e8f0"}`,
                  fontWeight: checked ? 900 : 700,
                  fontSize:13,
                  color: checked ? theme.chipOnText : "#64748b",
                  transition:"all .12s", userSelect:"none",
                }}>
                <span style={{ fontSize:13 }}>{checked ? "☑" : "☐"}</span>
                {b.label}
                {checked && (
                  <span style={{ fontSize:11, opacity:0.75, marginLeft:2 }}>
                    ({checkedSubs.length}/{b.subItems.length})
                  </span>
                )}
                <span style={{ fontSize:10, opacity:0.4, marginLeft:"auto" }}>▼</span>
              </div>
            );
          }
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
    {modalItem && (
      <SubItemModal
        item={modalItem}
        selected={selected}
        theme={theme}
        onSave={ids => handleSubSave(modalItem, ids)}
        onClose={() => setModalItem(null)}
      />
    )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   ACCOUNT FORM (white card — inside dark panel)
═══════════════════════════════════════════════════════ */
function AccountForm({ initial, onSave, onCancel, saving, isSuperAdmin, companies }) {
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
      <h3 className="acm-h" style={fs.title}>{isEdit ? `✏️ ${t("amEditAccount")}` : `➕ ${t("amAddAccount")}`}</h3>

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

      {isSuperAdmin && (
        <label style={{ ...fs.field, marginBottom: 18 }}>
          <span style={fs.label}>🏢 {t("amCompany")}</span>
          <select style={fs.input} value={form.companyId}
            onChange={e => set("companyId", e.target.value)}>
            <option value="">— {t("amPlatformLevel")} —</option>
            {companies.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
        </label>
      )}

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
   ACCOUNT CARD
═══════════════════════════════════════════════════════ */
/* Days-since-login helper for staleness badge */
function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function AccountCard({ user, onEdit, onToggle, onDelete, onResetPw, currentUsername, adminCount }) {
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
    dSince === null  ? { color:TK.inkFaint, bg:TK.tint,     label:t("amNeverLoggedIn") } :
    dSince === 0     ? { color:TK.green,    bg:TK.greenSoft, label:t("amToday") } :
    dSince <  7      ? { color:TK.green, bg:TK.greenSoft, label:`${dSince} ${t("amDaysAgo")}` } :
    dSince < 30      ? { color:TK.amber, bg:TK.amberSoft, label:`${dSince} ${t("amDaysAgo")}` } :
                       { color:TK.rose,  bg:TK.roseSoft,  label:`${dSince} ${t("amDaysAgo")}` };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="acm-card"
      style={{
        background:   TK.surface,
        border:       `1px solid ${hover ? TK.lineHi : TK.line}`,
        borderRadius: TK.r,
        padding:      "13px 16px",
        transition:   "border-color .16s ease, box-shadow .16s ease, transform .16s ease",
        boxShadow:    hover ? TK.shadowHi : TK.shadow,
        transform:    hover ? "translateY(-1px)" : "none",
        /* A disabled account is dimmed, not erased: at 0.55 its own name was
           the hardest thing on the row to read. */
        opacity:      user.is_active ? 1 : 0.8,
        display:      "grid",
        gridTemplateColumns: "auto minmax(0,1fr) auto auto",
        alignItems:   "center",
        gap:          14,
      }}
    >
      {/* Avatar */}
      <div className="acm-avatar" style={{
        width:46, height:46, borderRadius:15, background:grad,
        display:"grid", placeItems:"center",
        fontWeight:900, color:"#fff", flexShrink:0,
        boxShadow:"0 6px 14px rgba(16,42,67,.16)",
        filter: user.is_active ? "none" : "grayscale(.5)",
      }}>
        {initial}
      </div>

      {/* Main info column: name + meta row */}
      <div style={{ minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:10, flexWrap:"wrap" }}>
          <span className="acm-name" style={{ fontWeight:900, color:TK.ink,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {user.display_name || user.username}
          </span>
          <span className="acm-sm" style={{ color:TK.inkFaint, fontWeight:700 }}>
            @{user.username}
          </span>
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:7, alignItems:"center" }}>
          {user.is_admin && (
            <span className="acm-chip" style={ac.chip(TK.amber, TK.amberSoft)}>👑 {t("adminTag")}</span>
          )}
          {isFullAcc ? (
            <span className="acm-chip" style={ac.chip(TK.violet, TK.violetSoft)}>{t("amFullAccessShort")}</span>
          ) : (
            <span className="acm-chip" style={ac.chip(TK.brand, TK.brandSoft)}>
              {sections.length} {sections.length !== 1 ? t("amSectionsWord") : t("amSectionWord")}
            </span>
          )}
          {Array.isArray(user.employees) && user.employees.length > 0 && (
            <span className="acm-chip" style={ac.chip(TK.teal, TK.tealSoft)}>
              🧑 {user.employees.length}
            </span>
          )}
          <span className="acm-chip" style={{ ...ac.chip(freshness.color, freshness.bg) }}
            title={`${t("amLastLogin")}: ${fmt(user.last_login)}`}>
            🕒 {freshness.label}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <div className="acm-chip" style={{
        display:"inline-flex", alignItems:"center", gap:7,
        padding:"6px 13px", borderRadius:999, fontWeight:800, flexShrink:0,
        background: user.is_active ? TK.greenSoft : TK.roseSoft,
        color:      user.is_active ? TK.green : TK.rose,
        border:    `1px solid ${user.is_active ? TK.green : TK.rose}26`,
      }}>
        <span style={{ width:7, height:7, borderRadius:999, background:"currentColor", flexShrink:0 }} />
        {user.is_active ? t("amActive") : t("amOff")}
      </div>

      {/* Action buttons */}
      <div style={{ display:"flex", gap:6, flexShrink:0 }}>
        <button className="acm-actbtn acm-act-blue" onClick={onEdit} style={ac.actBtn}
          title={t("amEditAccountTip")} aria-label={t("amEditAccountTip")}>✏️</button>
        {onResetPw && (
          <button className="acm-actbtn acm-act-violet" onClick={onResetPw} style={ac.actBtn}
            title={t("amResetPwTip")} aria-label={t("amResetPwTip")}>🔑</button>
        )}
        <button className={canToggle ? "acm-actbtn acm-act-amber" : ""} onClick={canToggle ? onToggle : undefined} disabled={!canToggle} style={{
          ...ac.actBtn,
          opacity:    canToggle ? 1 : 0.4,
          cursor:     canToggle ? "pointer" : "not-allowed",
        }} title={
          isSelf ? t("amCantDisableSelf")
          : !canToggle ? t("amCantDisableLastAdmin")
          : user.is_active ? t("amDisableAccount") : t("amEnableAccount")
        }>
          {user.is_active ? "🔒" : "🔓"}
        </button>
        {canDelete && (
          <button className="acm-actbtn acm-act-rose" onClick={onDelete} style={ac.actBtn}
            title={t("amDeleteAccountTip")} aria-label={t("amDeleteAccountTip")}
            data-delete-action="true">🗑️</button>
        )}
      </div>
    </div>
  );
}

const ac = {
  chip: (color, bg) => ({
    padding:"4px 10px", borderRadius:999,
    fontWeight:800, color, background:bg,
    border:`1px solid ${color}22`, whiteSpace:"nowrap",
  }),
  /* Neutral circles that take their colour on hover: four coloured buttons on
     every row turned a list of people into a paint chart. */
  actBtn: {
    width:36, height:36, padding:0, borderRadius:11,
    fontWeight:800, cursor:"pointer",
    fontFamily:TK.font,
    background:TK.tint, color:TK.inkSoft,
    border:`1px solid ${TK.line}`,
    transition:"background .15s, border-color .15s, transform .12s",
    textAlign:"center",
    display:"inline-flex", alignItems:"center", justifyContent:"center",
  },
};

/* ═══════════════════════════════════════════════════════
   RESET PASSWORD MODAL — admin sets a new password for a user.
   Passwords are scrypt-hashed server-side and can never be read back,
   so the only safe recovery path is assigning a fresh one here.
═══════════════════════════════════════════════════════ */
function generateStrongPassword() {
  /* 14 chars, guaranteed letters + digits (matches checkPasswordStrength rules) */
  const sets = {
    upper: "ABCDEFGHJKLMNPQRSTUVWXYZ",
    lower: "abcdefghijkmnpqrstuvwxyz",
    digit: "23456789",
    sym:   "!@#$%*?-",
  };
  const all = sets.upper + sets.lower + sets.digit + sets.sym;
  const rnd = (str) => str[Math.floor(Math.random() * str.length)];
  let pw = [rnd(sets.upper), rnd(sets.lower), rnd(sets.digit), rnd(sets.sym)];
  for (let i = pw.length; i < 14; i++) pw.push(rnd(all));
  /* Fisher–Yates shuffle so the guaranteed chars aren't always in front */
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join("");
}

function ResetPasswordModal({ user, onClose, onSave, saving }) {
  const { t } = useSettingsLang();
  const [pw, setPw]       = useState("");
  const [show, setShow]   = useState(true);
  const [copied, setCopied] = useState(false);
  const [err, setErr]     = useState("");

  const strength = checkPasswordStrength(pw, t);

  const copy = async () => {
    if (!pw) return;
    try { await navigator.clipboard.writeText(pw); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard may be blocked — user can still read it */ }
  };

  const submit = (e) => {
    e.preventDefault();
    setErr("");
    if (!pw.trim()) return setErr(t("amPasswordReq"));
    if (strength?.level === "weak") return setErr(`${t("amPasswordTooWeak")} ${strength.needs}`);
    onSave(pw);
  };

  return (
    <div style={p.overlay}>
      <form className="acm" onSubmit={submit} style={{ ...p.modal, width:"min(460px,93vw)" }}>
        <div className="acm-h" style={{ fontWeight:900, marginBottom:6, color:TK.ink }}>
          🔑 {t("amResetPwTitle")}
        </div>
        <p style={{ color:TK.inkSoft, marginBottom:16, lineHeight:1.7, fontWeight:700 }}>
          {t("amResetPwFor")} <strong style={{ color:TK.violet }}>{user.display_name || user.username}</strong>
          <span style={{ color:TK.inkFaint }}> (@{user.username})</span>
        </p>

        <label className="acm-xs" style={{ fontWeight:800, color:TK.inkFaint,
          letterSpacing:".04em", display:"block", marginBottom:7 }}>
          {t("amResetPwNew")}
        </label>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={e => setPw(e.target.value)}
            autoComplete="new-password"
            autoFocus
            className="acm-mono"
            style={{
              flex:1, padding:"12px 14px", borderRadius:TK.rMd,
              fontFamily:"'Courier New',monospace", letterSpacing:".06em",
              background:TK.tint, border:`1px solid ${TK.line}`,
              color:TK.ink, outline:"none", minWidth:0,
            }}
          />
          <button type="button" onClick={() => setShow(s => !s)} style={p.pwIconBtn}
            title={show ? t("amResetPwHide") : t("amResetPwShow")}>
            {show ? "🙈" : "👁️"}
          </button>
          <button type="button" onClick={copy} disabled={!pw} style={{
            ...p.pwIconBtn, opacity: pw ? 1 : 0.4,
            color: copied ? TK.green : TK.inkSoft,
          }} title={t("amResetPwCopy")}>
            {copied ? "✅" : "📋"}
          </button>
        </div>

        {pw && strength && (
          <div style={{ fontSize:13, fontWeight:800, color:strength.color, marginBottom:10 }}>
            {strength.label}
          </div>
        )}

        <button type="button" onClick={() => { setPw(generateStrongPassword()); setShow(true); setCopied(false); }}
          className="acm-actbtn"
          style={{
            width:"100%", padding:"12px", marginBottom:14, borderRadius:TK.rMd,
            background:TK.violetSoft, color:TK.violet,
            border:`1px solid ${TK.violet}26`, cursor:"pointer",
            fontWeight:800, fontFamily:"inherit",
          }}>
          🎲 {t("amResetPwGenerate")}
        </button>

        <div className="acm-sm" style={{ color:TK.inkFaint, lineHeight:1.7, marginBottom:16, fontWeight:700 }}>
          ℹ️ {t("amResetPwHint")}
        </div>

        {err && (
          <div style={{ color:TK.rose, background:TK.roseSoft,
            border:`1px solid ${TK.rose}2e`, padding:"10px 13px", borderRadius:TK.rSm,
            fontWeight:800, marginBottom:14 }}>⚠️ {err}</div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <button type="submit" disabled={saving || !pw} className="acm-actbtn" style={{
            flex:1, padding:"13px",
            background: (saving || !pw) ? "#c3d6ea" : TK.violet,
            color:"#fff", border:"none", borderRadius:TK.rMd,
            fontWeight:800, cursor: (saving || !pw) ? "not-allowed" : "pointer",
            fontFamily:"inherit",
          }}>
            {saving ? t("saving") : `💾 ${t("amResetPwSave")}`}
          </button>
          <button type="button" onClick={onClose} className="acm-actbtn" style={{
            flex:1, padding:"13px",
            background:TK.tint, color:TK.inkSoft,
            border:`1px solid ${TK.line}`, borderRadius:TK.rMd,
            fontWeight:800, cursor:"pointer", fontFamily:"inherit",
          }}>{t("cancel")}</button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DORMANT ACCOUNTS — accounts inactive for 30/60+ days
═══════════════════════════════════════════════════════ */
function DormantAccountsTab({ users, currentUsername, adminCount, onToggle, onEdit, onDelete, onResetPw }) {
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
    { key:"never", icon:"🚫", label:t("amNeverLoggedIn"), color:"#64809a", help:t("amNeverHelp"),     list:buckets.never },
    { key:"d90",   icon:"🔴", label:t("amDormant90"),     color:TK.rose,   help:t("amDormant90Help"), list:buckets.d90 },
    { key:"d60",   icon:"🟠", label:t("amDormant60"),     color:"#c2410c", help:t("amDormant60Help"), list:buckets.d60 },
    { key:"d30",   icon:"🟡", label:t("amDormant30"),     color:TK.amber,  help:t("amDormant30Help"), list:buckets.d30 },
  ];
  const totalDormant = buckets.never.length + buckets.d90.length + buckets.d60.length + buckets.d30.length;

  return (
    <div>
      {/* Summary banner */}
      <div style={{
        padding:"16px 20px", borderRadius:TK.r, marginBottom:18,
        background: totalDormant === 0 ? TK.greenSoft : TK.amberSoft,
        border: `1px solid ${totalDormant === 0 ? TK.green : TK.amber}2e`,
        color: totalDormant === 0 ? TK.green : TK.amber,
        fontWeight:800, display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
      }}>
        <span className="acm-emoji-lg">{totalDormant === 0 ? "✅" : "⚠️"}</span>
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
            padding:"10px 14px", borderRadius:TK.rMd,
            background:TK.surface, border:`1px solid ${TK.line}`,
            borderInlineStart:`4px solid ${g.color}`,
          }}>
            <span>{g.icon}</span>
            <span className="acm-h" style={{ fontWeight:900, color:g.color }}>
              {g.label}
            </span>
            <span className="acm-sm" style={{ color:g.color, fontWeight:800,
              background:`${g.color}14`, padding:"3px 10px", borderRadius:999 }}>
              {g.list.length}
            </span>
            <span className="acm-sm" style={{ marginInlineStart:"auto", color:TK.inkFaint, fontWeight:700 }}>
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
                onDelete={() => onDelete(u)}
                onResetPw={() => onResetPw(u)} />
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
        color:"#111827", fontWeight:800 }}>
        ⚠️ {t("amFailedNotFound")}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <h3 style={{ margin:0, fontWeight:1000, fontSize:18, color:"#0f172a" }}>
          🛡️ {t("amFailedTitle")}
        </h3>
        <button className="acm-actbtn" onClick={load} style={p.btnRefresh}>🔄 {t("amRefresh")}</button>
      </div>

      {/* Suspicious IPs (last hour, 5+ attempts) */}
      {data.byIpLastHour.filter(x => x.attempts >= 5).length > 0 && (
        <div style={{
          padding:"14px 18px", borderRadius:12, marginBottom:18,
          background:"#fef2f2", border:"1px solid #fecaca",
          color:"#111827",
        }}>
          <div style={{ fontWeight:1000, fontSize:15, marginBottom:8, color:"#991b1b" }}>
            🚨 {t("amSuspicious")}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {data.byIpLastHour.filter(x => x.attempts >= 5).map(x => (
              <div key={x.ip_addr} style={{
                display:"flex", gap:10, alignItems:"center", flexWrap:"wrap",
                background:"#fff", padding:"8px 12px", borderRadius:8,
                border:"1px solid #fecaca",
                fontSize:13, fontWeight:700,
              }}>
                <span style={{ fontWeight:1000, color:"#111827", fontSize:14 }}>{x.ip_addr || "unknown"}</span>
                <span style={{ background:"#fee2e2", color:"#991b1b",
                  padding:"2px 9px", borderRadius:999, fontWeight:900 }}>
                  {x.attempts} {t("amAttempts")}
                </span>
                <span style={{ color:"#111827" }}>
                  {t("amTried")}: {(x.usernames || []).slice(0,3).join(", ") || "—"}
                  {(x.usernames?.length || 0) > 3 && ` +${x.usernames.length - 3}`}
                </span>
                <span style={{ marginLeft:"auto", color:"#334155", fontSize:12 }}>
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
        <FailStat color="#991b1b" bg="#fef2f2" label={t("amTotalRecent")} val={data.recent.length} />
        <FailStat color="#92400e" bg="#fffbeb" label={t("amLastHour")}
          val={data.byIpLastHour.reduce((a,b)=>a + (b.attempts||0), 0)} />
        <FailStat color="#5b21b6" bg="#f5f3ff" label={t("amUniqueIps")}
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
        <div style={{ overflowX:"auto", background:"#fff", border:"1px solid rgba(15,23,42,.12)", borderRadius:8 }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr>
                {[t("amColTime"), t("amUsername"), t("amColReason"), t("amColIp")].map(h => (
                  <th key={h} style={{
                    padding:"14px 16px", fontSize:14, fontWeight:900,
                    color:"#111827", textAlign:"left",
                    borderBottom:"1px solid rgba(15,23,42,.10)",
                    background:"#f8fafc",
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
                    borderBottom:"1px solid rgba(15,23,42,.07)",
                    background: i % 2 === 0 ? "#fff" : "#f8fafc",
                  }}>
                    <td style={al.td}>{fmt(r.created_at)}</td>
                    <td style={{ ...al.td, fontWeight:900, color:"#111827" }}>{r.username || "—"}</td>
                    <td style={{ ...al.td, fontWeight:800, color:"#111827" }}>
                      {reason.icon} {reason.label}
                    </td>
                    <td style={{ ...al.td, fontSize:14, color:"#111827" }}>{r.ip_addr || "—"}</td>
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
      background: bg, border: `1px solid ${color}33`,
      display:"flex", flexDirection:"column", gap:2,
    }}>
      <span style={{ fontSize:24, fontWeight:1000, color, lineHeight:1 }}>{val}</span>
      <span style={{ fontSize:12, color:"#111827", fontWeight:900,
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
        <div style={{ color:TK.inkSoft, fontWeight:700, marginBottom:12 }}>
          📊 {t("amShowing")} <strong style={{ color:TK.ink }}>{groups.length}</strong> {t("amAccountsWord")}
          {" · "}<strong style={{ color:TK.ink }}>{logs.length}</strong> {t("amTotalEvents")}
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
              lastAction === "login"        ? "#166534" :
              lastAction === "logout"       ? "#991b1b" :
              lastAction === "login_failed" ? TK.amber : TK.inkSoft;
            return (
              <div key={g.username} style={{
                background:TK.surface,
                border:`1px solid ${isOpen ? TK.lineHi : TK.line}`,
                borderRadius:TK.r,
                overflow:"hidden",
                transition:"border-color .15s, box-shadow .15s",
                boxShadow:TK.shadow,
              }}>
                {/* ─── Group header (clickable to toggle) ─── */}
                <button onClick={() => toggle(g.username)} style={{
                  width:"100%", border:"none", cursor:"pointer", fontFamily:"inherit",
                  display:"grid",
                  gridTemplateColumns:"auto 1fr auto auto",
                  alignItems:"center", gap:14,
                  padding:"13px 16px",
                  background: isOpen ? TK.tealSoft : TK.surface,
                  color:TK.ink, textAlign:"start",
                  transition:"background .15s",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width:44, height:44, borderRadius:14, background:avatarGrad(g.username),
                    display:"grid", placeItems:"center",
                    fontWeight:900, color:"#fff",
                    boxShadow:"0 6px 14px rgba(16,42,67,.16)",
                  }} className="acm-avatar">
                    {g.username[0]?.toUpperCase() || "?"}
                  </div>

                  {/* Name + meta */}
                  <div style={{ minWidth:0 }}>
                    <div className="acm-h" style={{ fontWeight:900, color:TK.ink, lineHeight:1.25 }}>
                      {g.username}
                    </div>
                    <div className="acm-sm" style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:5, color:TK.inkSoft, fontWeight:700 }}>
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
                      background:"#eff6ff", color:"#1d4ed8",
                      fontSize:13, fontWeight:900,
                      border:"1px solid #bfdbfe",
                    }}>{g.total}</span>
                    <span style={{
                      fontSize:20, color:"#475569",
                      transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                      transition:"transform .15s",
                      lineHeight:1,
                    }}>›</span>
                  </div>
                </button>

                {/* ─── Expanded body: full event list ─── */}
                {isOpen && (
                  <div style={{
                    borderTop:"1px solid rgba(15,23,42,.10)",
                    background:"#fff",
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
                          const color = isLogin ? "#166534" : isLogout ? "#991b1b" : isFailed ? "#92400e" : "#111827";
                          return (
                            <tr key={log.id} style={{
                              borderBottom:"1px solid rgba(15,23,42,.07)",
                              background: i % 2 === 0 ? "#fff" : "#f8fafc",
                            }}>
                              <td style={al.td}>{fmt(log.created_at)}</td>
                              <td style={{ ...al.td, color:"#111827" }}>{op}</td>
                              <td style={{ ...al.td, fontWeight:900, color }}>
                                {isLogin  ? `🟢 ${t("amActionLogin")}`
                                 : isLogout ? `🔴 ${t("amActionLogout")}`
                                 : isFailed ? `⚠️ ${t("amActionFailed")}${reason ? ` (${reason})` : ""}`
                                 : log.action}
                              </td>
                              <td style={{ ...al.td, fontSize:14, color:"#111827" }}>
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
  td: { padding:"12px 14px", color:TK.ink, verticalAlign:"middle" },
  subTh: {
    padding:"11px 14px", fontWeight:800,
    color:TK.inkSoft, textAlign:"start",
    background:TK.tint,
    borderBottom:`1px solid ${TK.line}`,
    whiteSpace:"nowrap",
  },
  miniChip: (color, bg) => ({
    padding:"3px 10px", borderRadius:999,
    fontWeight:800, color, background:bg,
    border:`1px solid ${color}26`, whiteSpace:"nowrap",
  }),
};

/* ═══════════════════════════════════════════════════════
   MAIN — Account Control Center
═══════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   GROUP MANAGER — the admin defines the buckets by hand
   ═══════════════════════════════════════════════════════
   Membership is explicit, never derived: an account belongs where the admin
   put it. The automatic branch view answers "who can reach POS 15"; this one
   answers "whose team is this", and the two disagree often enough that
   guessing would be worse than asking. */
function GroupManager({ open, groups, users, saving, onSave, onClose }) {
  const { t } = useSettingsLang();
  const [draft, setDraft] = useState(groups);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [icon, setIcon] = useState("🏬");
  const [color, setColor] = useState("teal");
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(null);   // group id being renamed
  const [pendingDel, setPendingDel] = useState(null);
  const [warn, setWarn] = useState("");           // in-modal notice
  /* member column filters */
  const [mq, setMq] = useState("");
  const [mScope, setMScope] = useState("all");    // all | free | mine
  const [mBranch, setMBranch] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  /* Unsaved work is the draft, so it decides what a close does. Comparing the
     serialised lists is cheap here (a handful of groups) and beats threading a
     flag through every mutation. */
  const dirty = JSON.stringify(draft) !== JSON.stringify(groups);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  /* Reseed the draft when the modal opens — but NEVER while it is open with
     unsaved edits: `groups` changes identity whenever the hook refetches or
     another tab writes, and silently swallowing half-typed work is worse than
     showing a slightly stale list. */
  const openRef = useRef(false);
  useEffect(() => {
    if (open && !openRef.current) {
      setDraft(groups);
      setEditing(null); setPendingDel(null); setConfirmClose(false); setWarn("");
      setMq(""); setMScope("all"); setMBranch("");
    }
    openRef.current = open;
  }, [open, groups]);
  useEffect(() => {
    if (open && !dirtyRef.current) setDraft(groups);
  }, [open, groups]);

  useEffect(() => {
    if (!active && draft.length) setActive(draft[0].id);
    if (active && !draft.some(g => g.id === active)) setActive(draft[0]?.id || null);
  }, [draft, active]);

  /* Escape closes — and asks first when there is something to lose. */
  const tryClose = useCallback(() => {
    if (dirtyRef.current) { setConfirmClose(true); return; }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { e.stopPropagation(); tryClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tryClose]);

  const byUsername = React.useMemo(
    () => new Map((users || []).map(u => [String(u.username || "").trim(), u])),
    [users]
  );

  /* Every branch that appears on any account — the bulk-add filter reads from
     the accounts themselves, so a new branch never needs registering here. */
  const allBranches = React.useMemo(() => {
    const set = new Set();
    (users || []).forEach(u => branchesOfUser(u).forEach(b => set.add(b)));
    return Array.from(set).sort();
  }, [users]);

  if (!open) return null;

  const addGroup = () => {
    const n = name.trim();
    const na = nameAr.trim();
    if (!n && !na) return;
    const twin = draft.find(g =>
      (n && g.name.toLowerCase() === n.toLowerCase()) || (na && g.nameAr && g.nameAr === na));
    if (twin) { setWarn(t("amGroupDupName")); return; }
    const g = normalizeGroup({ name: n, nameAr: na, icon, color, order: draft.length });
    setDraft(upsertGroup(draft, g));
    setActive(g.id);
    setName(""); setNameAr(""); setWarn("");
  };

  /* Patch a group in place. Deliberately NOT upsertGroup: that normalises, and
     normalisation throws the moment both name fields are empty — which is
     exactly what happens mid-keystroke while the admin retypes a name. */
  const patchGroup = (g, patch) =>
    setDraft(draft.map(x => (x.id === g.id ? { ...x, ...patch } : x)));

  const nameless = (g) => !String(g.name || "").trim() && !String(g.nameAr || "").trim();

  const closeEditor = (g) => {
    if (nameless(g)) { setWarn(t("amGroupNeedsName")); return; }
    setWarn(""); setEditing(null);
  };

  const activeGroup = draft.find(g => g.id === active) || null;

  /* Members whose account no longer exists: the list is keyed by username on
     purpose, so a deleted account leaves its name behind and the stored count
     drifts away from what the admin can actually see. */
  const ghosts = activeGroup ? activeGroup.members.filter(m => !byUsername.has(m)) : [];
  const dropGhosts = () => {
    setDraft(draft.map(g => (g.id !== activeGroup.id
      ? g
      : { ...g, members: g.members.filter(m => byUsername.has(m)) })));
  };

  const shown = !activeGroup ? [] : (users || []).filter(u => {
    const owner = groupOfUser(draft, u.username);
    const mine = owner?.id === activeGroup.id;
    if (mScope === "mine" && !mine) return false;
    if (mScope === "free" && owner) return false;
    if (mBranch && !branchesOfUser(u).includes(mBranch)) return false;
    const q = mq.trim().toLowerCase();
    if (!q) return true;
    return (u.username || "").toLowerCase().includes(q)
      || (u.display_name || "").toLowerCase().includes(q);
  });

  /* Bulk add respects the one-group rule: an account already sitting in
     another group is moved, and the admin is told how many moved. */
  const addShown = () => {
    const targets = shown.filter(u => groupOfUser(draft, u.username)?.id !== activeGroup.id);
    if (!targets.length) return;
    const moved = targets.filter(u => !!groupOfUser(draft, u.username)).length;
    let next = draft;
    targets.forEach(u => { next = assignMember(next, u.username, activeGroup.id); });
    setDraft(next);
    setWarn(moved ? `${t("amGroupMoved")}: ${moved}` : "");
  };
  const removeShown = () => {
    const targets = shown.filter(u => groupOfUser(draft, u.username)?.id === activeGroup.id);
    if (!targets.length) return;
    let next = draft;
    targets.forEach(u => { next = unassignMember(next, u.username); });
    setDraft(next);
    setWarn("");
  };

  return (
    <div style={gmS.overlay} onClick={tryClose}>
      <div className="acm" style={gmS.modal} onClick={e => e.stopPropagation()}>
        <div style={gmS.head}>
          <span className="acm-h" style={{ fontWeight:900, color:TK.ink }}>
            🏷️ {t("amGroupsTitle")}
            {dirty && <span style={gmX.dirty}>● {t("amGroupUnsaved")}</span>}
          </span>
          <button onClick={tryClose} style={gmS.x}>✕</button>
        </div>
        <div style={gmS.hint}>{t("amGroupsHint")}</div>

        {/* new group */}
        <div style={gmS.newRow}>
          <select value={icon} onChange={e => setIcon(e.target.value)} style={{ ...gmS.input, width:64, textAlign:"center" }}>
            {GROUP_ICONS.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <input value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addGroup(); }}
            placeholder={t("amGroupName")} style={{ ...gmS.input, flex:"2 1 170px" }} />
          <input value={nameAr} onChange={e => setNameAr(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addGroup(); }}
            placeholder={t("amGroupNameAr")} style={{ ...gmS.input, flex:"2 1 150px" }} />
          <div style={{ display:"flex", gap:5, alignItems:"center" }}>
            {GROUP_COLORS.map(c => (
              <button key={c.id} type="button" onClick={() => setColor(c.id)}
                title={c.id}
                style={{
                  width:22, height:22, borderRadius:7, background:c.dot, cursor:"pointer",
                  border: color === c.id ? "3px solid #0f172a" : "1px solid rgba(0,0,0,.15)",
                }} />
            ))}
          </div>
          <button type="button" onClick={addGroup} style={gmS.addBtn}>➕ {t("amGroupAdd")}</button>
        </div>

        {warn && <div style={gmX.warn}>⚠️ {warn}</div>}

        <div style={gmS.body} className="acm-gmbody">
          {/* the groups */}
          <div style={gmS.col}>
            {draft.length === 0 ? (
              <div style={gmS.empty}>—</div>
            ) : draft.map(g => {
              const c = colorOf(g.color);
              const on = g.id === active;
              const live = g.members.filter(m => byUsername.has(m)).length;

              /* Rename in place — deleting a group to fix a typo would throw
                 away every membership inside it. */
              if (editing === g.id) {
                return (
                  <div key={g.id} style={{ ...gmS.groupRow, display:"block", padding:"9px 10px", borderColor:c.dot }}>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                      <select value={g.icon} style={{ ...gmS.input, width:58, textAlign:"center", padding:"6px 4px" }}
                        onChange={e => patchGroup(g, { icon: e.target.value })}>
                        {GROUP_ICONS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                      <input value={g.name} placeholder={t("amGroupName")}
                        style={{ ...gmS.input, flex:"1 1 110px", padding:"6px 9px" }}
                        onChange={e => patchGroup(g, { name: e.target.value })} />
                      <input value={g.nameAr} placeholder={t("amGroupNameAr")}
                        style={{ ...gmS.input, flex:"1 1 100px", padding:"6px 9px" }}
                        onChange={e => patchGroup(g, { nameAr: e.target.value })} />
                    </div>
                    <div style={{ display:"flex", gap:5, alignItems:"center", marginTop:8, flexWrap:"wrap" }}>
                      {GROUP_COLORS.map(cc => (
                        <button key={cc.id} type="button" title={cc.id}
                          onClick={() => patchGroup(g, { color: cc.id })}
                          style={{
                            width:19, height:19, borderRadius:6, background:cc.dot, cursor:"pointer",
                            border: g.color === cc.id ? "3px solid #0f172a" : "1px solid rgba(0,0,0,.15)",
                          }} />
                      ))}
                      <button type="button" onClick={() => closeEditor(g)}
                        style={{ ...gmX.miniOk, marginInlineStart:"auto" }}>✓ {t("amGroupRenameDone")}</button>
                    </div>
                  </div>
                );
              }

              /* Asking before a delete: the group carries its memberships with
                 it, and there is no undo inside the modal. */
              if (pendingDel === g.id) {
                return (
                  <div key={g.id} style={{ ...gmS.groupRow, borderColor:"#fca5a5", background:"#fef2f2", gap:8 }}>
                    <span style={{ fontWeight:900, color:"#991b1b", flex:1, minWidth:0 }}>
                      {t("amGroupDelete")} «{g.name}»{live ? ` · ${live} ${t("amGroupMembers")}` : ""}
                    </span>
                    <button type="button" style={gmX.miniDanger}
                      onClick={() => { setDraft(removeGroup(draft, g.id)); setPendingDel(null); }}>
                      ✓
                    </button>
                    <button type="button" style={gmX.miniGhost} onClick={() => setPendingDel(null)}>✕</button>
                  </div>
                );
              }

              return (
                /* Sibling buttons in a row, not a delete nested inside the
                   select button: an interactive element inside another one is
                   unreachable by keyboard and ambiguous to a screen reader. */
                <div key={g.id} style={{
                  ...gmS.groupRow,
                  background: on ? c.bg : "#fff",
                  borderColor: on ? c.dot : "#e2e8f0",
                  color: on ? c.text : TK.inkSoft,
                }}>
                  <button type="button" onClick={() => setActive(g.id)} style={gmS.groupPick}>
                    <span style={{ fontSize:17 }}>{g.icon}</span>
                    <span style={{ fontWeight:900, minWidth:0, overflow:"hidden", textOverflow:"ellipsis" }}>
                      {g.name}{g.nameAr ? ` — ${g.nameAr}` : ""}
                    </span>
                    <span style={{ marginInlineStart:"auto", fontWeight:900, fontSize:12, background:c.dot, color:"#fff", borderRadius:999, padding:"1px 8px" }}>
                      {live}
                    </span>
                  </button>
                  <button
                    type="button"
                    title={t("amGroupRename")}
                    aria-label={`${t("amGroupRename")} — ${g.name}`}
                    onClick={() => { setActive(g.id); setEditing(g.id); }}
                    style={gmX.rowEdit}
                  >✎</button>
                  <button
                    type="button"
                    title={t("amGroupDelete")}
                    aria-label={`${t("amGroupDelete")} — ${g.name}`}
                    onClick={() => setPendingDel(g.id)}
                    style={gmS.groupDel}
                  >✕</button>
                </div>
              );
            })}
          </div>

          {/* who is in it */}
          <div style={gmS.col}>
            {!activeGroup ? (
              <div style={gmS.empty}>{t("amGroupsHint")}</div>
            ) : (
              <>
                {/* Finding one account among two hundred by scrolling is not a
                    workflow — filter first, then tick, or take the whole
                    filtered set in one click. */}
                <div style={gmX.filterBar}>
                  <input value={mq} onChange={e => setMq(e.target.value)}
                    placeholder={t("amGroupFindPerson")}
                    style={{ ...gmS.input, flex:"2 1 150px", padding:"7px 10px" }} />
                  <select value={mScope} onChange={e => setMScope(e.target.value)}
                    style={{ ...gmS.input, flex:"1 1 120px", padding:"7px 8px" }}>
                    <option value="all">{t("amGroupScopeAll")}</option>
                    <option value="free">{t("amGroupScopeFree")}</option>
                    <option value="mine">{t("amGroupScopeMine")}</option>
                  </select>
                  {allBranches.length > 0 && (
                    <select value={mBranch} onChange={e => setMBranch(e.target.value)}
                      style={{ ...gmS.input, flex:"1 1 120px", padding:"7px 8px" }}>
                      <option value="">{t("amGroupAnyBranch")}</option>
                      {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  )}
                </div>
                <div style={gmX.bulkBar}>
                  <span style={{ fontWeight:800, color:"#475569", fontSize:12 }}>
                    {shown.length} / {(users || []).length}
                  </span>
                  <button type="button" style={gmX.miniOk} disabled={!shown.length}
                    onClick={addShown}>➕ {t("amGroupAddShown")}</button>
                  <button type="button" style={gmX.miniGhost} disabled={!shown.length}
                    onClick={removeShown}>➖ {t("amGroupRemoveShown")}</button>
                </div>

                {ghosts.length > 0 && (
                  <div style={gmX.ghostBar}>
                    <span style={{ flex:1, minWidth:0 }}>
                      👻 {t("amGroupGhosts")}: {ghosts.join("، ")}
                    </span>
                    <button type="button" style={gmX.miniDanger} onClick={dropGhosts}>
                      🧹 {t("amGroupGhostsClean")}
                    </button>
                  </div>
                )}

                {shown.length === 0 ? (
                  <div style={gmS.empty}>{t("amNoMatchAccounts")}</div>
                ) : shown.map(u => {
                  const owner = groupOfUser(draft, u.username);
                  const mine = owner?.id === activeGroup.id;
                  const elsewhere = owner && !mine;
                  return (
                    <label key={u.id} style={{
                      ...gmS.memberRow,
                      opacity: elsewhere ? 0.6 : 1,
                      borderColor: mine ? colorOf(activeGroup.color).dot : "#e2e8f0",
                      background: mine ? colorOf(activeGroup.color).bg : "#fff",
                    }}>
                      <input type="checkbox" checked={!!mine}
                        onChange={() => setDraft(mine
                          ? unassignMember(draft, u.username)
                          : assignMember(draft, u.username, activeGroup.id))}
                        style={{ width:20, height:20, accentColor: colorOf(activeGroup.color).dot, cursor:"pointer" }} />
                      <span style={{ fontWeight:800, color:"#0f172a" }}>{u.display_name || u.username}</span>
                      <span style={{ color:"#64748b", fontSize:12 }}>@{u.username}</span>
                      {u.is_active === false && <span style={gmX.offTag}>⛔</span>}
                      {elsewhere && (
                        <span style={{ marginInlineStart:"auto", fontSize:11, fontWeight:800, background:colorOf(owner.color).bg, color:colorOf(owner.color).text, borderRadius:999, padding:"2px 8px" }}>
                          {owner.icon} {owner.name}
                        </span>
                      )}
                    </label>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {confirmClose ? (
          <div style={gmX.closeBar}>
            <span style={{ fontWeight:900, color:"#991b1b", flex:1, minWidth:0 }}>
              ⚠️ {t("amGroupDiscardAsk")}
            </span>
            <button type="button" style={gmS.cancel} onClick={() => setConfirmClose(false)}>
              ↩ {t("amGroupKeepEditing")}
            </button>
            <button type="button" style={gmX.discard} onClick={onClose}>
              🗑 {t("amGroupDiscard")}
            </button>
          </div>
        ) : (
          <div style={gmS.foot}>
            <button type="button" onClick={tryClose} style={gmS.cancel}>✕</button>
            <button type="button" disabled={saving || !dirty}
              onClick={() => {
                const bad = draft.find(nameless);
                if (bad) { setWarn(t("amGroupNeedsName")); setEditing(bad.id); setActive(bad.id); return; }
                onSave(draft);
              }}
              style={{ ...gmS.save, ...(saving || !dirty ? gmX.saveOff : null) }}>
              {saving ? "⏳" : "💾"} {t("amSaveChanges")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const GROUP_ICONS = ["🏬", "🔪", "🏭", "🚚", "🛡️", "👨‍🍳", "📍", "⭐", "🧊", "🧪", "📦", "🧑‍💼"];

const gmS = {
  overlay: { position:"fixed", inset:0, background:"rgba(18,50,76,.4)", backdropFilter:"blur(5px)", zIndex:9000, display:"grid", placeItems:"center", padding:16 },
  modal:   { background:TK.surface, borderRadius:22, width:"min(1000px,96vw)", maxHeight:"92vh", display:"flex", flexDirection:"column", padding:"22px 24px", boxShadow:"0 30px 70px rgba(16,42,67,.3)", color:TK.ink },
  head:    { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 },
  x:       { background:TK.tint, border:`1px solid ${TK.line}`, width:34, height:34, borderRadius:11, cursor:"pointer", color:TK.inkSoft, fontWeight:900 },
  hint:    { color:TK.inkFaint, fontWeight:700, marginBottom:14, lineHeight:1.8 },
  newRow:  { display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", padding:"13px", background:TK.tint, border:`1px solid ${TK.line}`, borderRadius:TK.r, marginBottom:14 },
  input:   { padding:"10px 12px", border:`1px solid ${TK.line}`, borderRadius:TK.rSm, fontFamily:"inherit", background:TK.surface, color:TK.ink, outline:"none", minWidth:0 },
  addBtn:  { padding:"10px 17px", background:TK.teal, color:"#fff", border:"none", borderRadius:TK.rSm, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  body:    { display:"grid", gridTemplateColumns:"minmax(240px,1fr) minmax(260px,1.2fr)", gap:14, overflow:"hidden", flex:1, minHeight:0 },
  col:     { overflowY:"auto", display:"flex", flexDirection:"column", gap:6, padding:2, minHeight:120 },
  groupRow:{ display:"flex", alignItems:"center", gap:4, width:"100%", padding:"4px 8px", borderRadius:TK.rMd, border:`1px solid ${TK.line}` },
  groupPick:{ display:"flex", alignItems:"center", gap:9, flex:1, minWidth:0, textAlign:"start", background:"none", border:"none", color:"inherit", font:"inherit", cursor:"pointer", padding:"7px 2px" },
  groupDel: { background:"none", border:"none", color:"#dc2626", fontWeight:900, fontSize:15, cursor:"pointer", padding:"6px 8px", borderRadius:8, lineHeight:1, flexShrink:0 },
  memberRow:{ display:"flex", alignItems:"center", gap:10, padding:"10px 13px", borderRadius:TK.rMd, border:`1px solid ${TK.line}`, cursor:"pointer", background:TK.surface, transition:"border-color .14s, background .14s" },
  empty:   { color:TK.inkFaint, fontStyle:"italic", padding:16, lineHeight:1.8 },
  foot:    { display:"flex", gap:10, justifyContent:"flex-end", marginTop:16, paddingTop:14, borderTop:`1px solid ${TK.line}` },
  cancel:  { padding:"12px 20px", background:TK.tint, color:TK.inkSoft, border:`1px solid ${TK.line}`, borderRadius:TK.rMd, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  save:    { padding:"12px 26px", background:TK.teal, color:"#fff", border:"none", borderRadius:TK.rMd, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 8px 20px rgba(15,118,110,.22)" },
};

/* Extras the group manager grew: rename, guarded delete, member filtering and
   the unsaved-work guard. Kept beside gmS rather than merged into it so the
   original modal shell stays readable. */
const gmX = {
  dirty:    { marginInlineStart:10, fontWeight:800, color:TK.amber, background:TK.amberSoft, borderRadius:999, padding:"3px 11px" },
  warn:     { background:TK.amberSoft, border:`1px solid ${TK.amber}2e`, color:TK.amber, fontWeight:800, borderRadius:TK.rSm, padding:"9px 13px", marginBottom:10 },
  rowEdit:  { background:"none", border:"none", color:"#0f766e", fontWeight:900, fontSize:15, cursor:"pointer", padding:"6px 6px", borderRadius:8, lineHeight:1, flexShrink:0 },
  miniOk:   { padding:"7px 12px", background:TK.teal, color:"#fff", border:"none", borderRadius:TK.rSm, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  miniGhost:{ padding:"7px 12px", background:TK.surface, color:TK.inkSoft, border:`1px solid ${TK.line}`, borderRadius:TK.rSm, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  miniDanger:{ padding:"7px 12px", background:TK.rose, color:"#fff", border:"none", borderRadius:TK.rSm, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  filterBar:{ display:"flex", gap:6, flexWrap:"wrap", position:"sticky", top:0, zIndex:2, background:"#fff", paddingBottom:6 },
  bulkBar:  { display:"flex", gap:7, alignItems:"center", flexWrap:"wrap", padding:"2px 2px 6px" },
  ghostBar: { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", background:"#f8fafc", border:"1px dashed #cbd5e1", borderRadius:10, padding:"8px 11px", fontSize:12.5, fontWeight:800, color:"#475569" },
  offTag:   { fontSize:11, fontWeight:900, color:"#b91c1c", background:"#fee2e2", borderRadius:999, padding:"1px 7px" },
  closeBar: { display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end", marginTop:16, paddingTop:14, borderTop:"1px solid #fecaca", background:"#fef2f2", borderRadius:12, padding:"12px 14px" },
  discard:  { padding:"11px 20px", background:"#dc2626", color:"#fff", border:"none", borderRadius:10, fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit" },
  saveOff:  { opacity:.5, cursor:"not-allowed", filter:"grayscale(.4)" },
};

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
  const [resetPwUser, setResetPwUser] = useState(null);
  const [search, setSearch]     = useState("");
  const [companies, setCompanies] = useState([]);
  /* Grouping: "none" | "branch" (derived from allowed_branches, zero setup)
     | "custom" (the admin's own buckets, stored server-side). */
  const [groupBy, setGroupBy]   = useState("none");
  const [sortBy, setSortBy]     = useState("name");
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [showGroups, setShowGroups] = useState(false);
  const [savingGroups, setSavingGroups] = useState(false);
  const { groups, error: groupsError, save: saveGroups } = useAccountGroups();

  const isSuperAdmin = (() => {
    try { return !!JSON.parse(localStorage.getItem("currentUser") || "{}").isSuperAdmin; }
    catch { return false; }
  })();

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch(`${API_BASE}/api/companies`).then(r => r.json())
      .then(d => { if (d.ok) setCompanies(d.companies || []); })
      .catch(() => {});
  }, [isSuperAdmin]);

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
      if (isSuperAdmin) body.companyId = form.companyId !== "" ? Number(form.companyId) : null;
      const r = await fetch(url, { method, headers:{ "Content-Type":"application/json" }, body:JSON.stringify(body) });
      const d = await r.json();
      if (!d.ok) {
        showMsg("err", d.error === "username_taken" ? t("amUsernameTaken") : (d.error || t("amServerError")));
      } else {
        await logSettingsAudit({
          area: "accounts",
          action: isEdit ? "update_user" : "create_user",
          target: body.username,
          before: isEdit ? editUser : null,
          after: d.user || body,
          reason: isEdit ? "User account updated" : "User account created",
        });
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
        await logSettingsAudit({
          area: "accounts",
          action: user.is_active ? "disable_user" : "enable_user",
          target: user.username,
          before: user,
          after: d.user || { ...user, is_active: !user.is_active },
          reason: user.is_active ? "User account disabled" : "User account enabled",
        });
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
        await logSettingsAudit({
          area: "accounts",
          action: "delete_user",
          target: user.username,
          before: user,
          after: null,
          reason: "User account deleted",
        });
        setUsers(prev => prev.filter(u => u.id !== user.id));
        showMsg("ok", `${t("amDeleted")} "${user.username}"`);
      } else {
        showMsg("err", d.error || t("amDeleteFailed"));
      }
    } catch { showMsg("err", t("amDeleteFailed")); }
    setConfirmDel(null);
  };

  const handleResetPw = async (newPassword) => {
    if (!resetPwUser) return;
    if (!serverReady) { showMsg("err", t("amServerNotDeployed")); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API_BASE}/api/app-users/${resetPwUser.id}`, {
        method:"PUT", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ password: newPassword }),
      });
      const d = await r.json();
      if (d.ok) {
        await logSettingsAudit({
          area: "accounts",
          action: "reset_user_password",
          target: resetPwUser.username,
          before: { username: resetPwUser.username, passwordChanged: false },
          after: { username: resetPwUser.username, passwordChanged: true },
          reason: "User password reset",
        });
        showMsg("ok", `${t("amResetPwDone")} — @${resetPwUser.username} ✅`);
        setResetPwUser(null);
      } else {
        showMsg("err", d.error || t("amResetPwFailed"));
      }
    } catch { showMsg("err", t("amNetworkError")); }
    setSaving(false);
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
        // Searching a group name has to find its people: the group is often
        // the only thing the admin remembers about an account.
        (u.display_name || "").toLowerCase().includes(search.toLowerCase()) ||
        (groupOfUser(groups, u.username)?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (groupOfUser(groups, u.username)?.nameAr || "").includes(search)
      )
    : users;

  const sortedUsers = React.useMemo(() => {
    const list = [...filteredUsers];
    const nameOf = (u) => (u.display_name || u.username || "").toLowerCase();
    if (sortBy === "login") {
      // Never-logged-in accounts sort last rather than first: an empty date is
      // "unknown", not "the oldest login in the system".
      return list.sort((a, b) => {
        const ta = a.last_login ? Date.parse(a.last_login) : -Infinity;
        const tb = b.last_login ? Date.parse(b.last_login) : -Infinity;
        return tb - ta || nameOf(a).localeCompare(nameOf(b));
      });
    }
    if (sortBy === "role") {
      const rank = (u) => (u.is_admin ? 0 : (u.permissions || []).includes("*") ? 1 : 2);
      return list.sort((a, b) => rank(a) - rank(b) || nameOf(a).localeCompare(nameOf(b)));
    }
    return list.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
  }, [filteredUsers, sortBy]);

  const buckets = React.useMemo(() => {
    let list = null;
    if (groupBy === "branch") {
      list = autoGroupByBranch(sortedUsers, { fullAccessLabel: t("amGroupAllAccess") });
    } else if (groupBy === "custom") {
      list = groupByCustom(sortedUsers, groups, { ungroupedLabel: t("amGroupUngrouped") });
    }
    // While searching, a wall of empty buckets buries the two matches that are
    // the whole reason the admin typed anything.
    return list && search ? list.filter(b => b.users.length) : list;
  }, [groupBy, sortedUsers, groups, search, t]);

  const toggleBucket = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const handleSaveGroups = async (draft) => {
    setSavingGroups(true);
    try {
      await saveGroups(draft, currentUsername);
      await logSettingsAudit({
        area: "accounts",
        action: "update_account_groups",
        target: "account_groups",
        after: draft,
        reason: "Account groups updated",
      });
      showMsg("ok", `${t("amGroupsSaved")} ✅`);
      setShowGroups(false);
      // Grouping the list by buckets nobody can see yet is a dead end.
      if (groupBy === "none" && draft.length) setGroupBy("custom");
    } catch {
      showMsg("err", t("amGroupsSaveErr"));
    }
    setSavingGroups(false);
  };

  /* Current logged-in username — used to lock self-destruction in cards */
  const currentUsername = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; }
    catch { return ""; }
  })();
  const adminCount = users.filter(u => u.is_admin && u.is_active).length;

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

  const stats = [
    { label:t("amStatTotal"),    val:users.length,                              tone:"#2563eb" },
    { label:t("amStatActive"),   val:users.filter(u => u.is_active).length,    tone:"#0f766e" },
    { label:t("amStatDisabled"), val:users.filter(u => !u.is_active).length,   tone:"#b91c1c" },
    { label:t("amStatAdmins"),   val:users.filter(u => u.is_admin).length,     tone:"#7c3aed" },
    { label:t("amNavDormant"),   val:dormantCount,                             tone:"#b45309" },
  ];

  return (
    <div className="acm" style={p.shell} dir={dir}>
      {/* ── Type scale ────────────────────────────────────────────────
          globals.css sets `#root * { font-size:14px !important }`, which
          flattens every inline fontSize on this page — that is why the screen
          read as one grey wall with no hierarchy. An !important rule with a
          doubled class (`.acm.acm`) outranks it, so the scale below is the
          only place sizes are set from now on: never write fontSize inline
          here again, it will be ignored. */}
      <style>{`
        #root .acm.acm{ color:${TK.ink}; }
        #root .acm.acm .acm-kpi{ font-size:29px !important; letter-spacing:-.02em; }
        #root .acm.acm .acm-h{ font-size:17px !important; }
        #root .acm.acm .acm-name{ font-size:16px !important; }
        #root .acm.acm .acm-sm{ font-size:12.5px !important; }
        #root .acm.acm .acm-xs{ font-size:11.5px !important; }
        #root .acm.acm .acm-chip{ font-size:12px !important; }
        #root .acm.acm .acm-avatar{ font-size:18px !important; }
        #root .acm.acm .acm-emoji-lg{ font-size:22px !important; }
        #root .acm.acm .acm-mono{ font-size:15px !important; }
        #root .acm.acm input, #root .acm.acm select, #root .acm.acm textarea{ font-size:14px !important; }

        /* ── Motion & states ─────────────────────────────────────── */
        .acm-card{ transition:border-color .16s, box-shadow .16s, transform .16s; }
        .acm-tab{ transition:background .16s, color .16s, box-shadow .16s; }
        .acm-tab:hover{ background:${TK.surface} !important; color:${TK.ink} !important; }
        .acm-actbtn{ transition:background .15s, border-color .15s, color .15s, transform .12s; }
        .acm-actbtn:hover{ transform:translateY(-1px); }
        .acm-actbtn:active{ transform:translateY(0); }
        .acm-actbtn:disabled{ transform:none; }

        /* Row actions stay neutral until you reach for them, so a list of
           twenty accounts is not eighty coloured squares. */
        .acm-act-blue:hover{   background:${TK.brandSoft}  !important; border-color:${TK.brand}33  !important; color:${TK.brand}  !important; }
        .acm-act-violet:hover{ background:${TK.violetSoft} !important; border-color:${TK.violet}33 !important; color:${TK.violet} !important; }
        .acm-act-amber:hover{  background:${TK.amberSoft}  !important; border-color:${TK.amber}33  !important; color:${TK.amber}  !important; }
        .acm-act-rose:hover{   background:${TK.roseSoft}   !important; border-color:${TK.rose}33   !important; color:${TK.rose}   !important; }

        .acm-searchinput:focus, .acm select:focus, .acm input:focus, .acm textarea:focus{
          border-color:${TK.brand} !important;
          box-shadow:0 0 0 3px rgba(31,111,208,.13);
          background:${TK.surface};
          outline:none;
        }
        .acm-searchinput::placeholder, .acm input::placeholder{ color:${TK.inkFaint}; }
        .acm select:hover, .acm-refresh:hover{ border-color:${TK.lineHi} !important; }

        /* Scrollbars inside the modal columns — thin and quiet. */
        .acm-gmbody ::-webkit-scrollbar, .acm ::-webkit-scrollbar{ width:9px; height:9px; }
        .acm-gmbody ::-webkit-scrollbar-thumb, .acm ::-webkit-scrollbar-thumb{
          background:${TK.lineHi}; border-radius:999px; border:2px solid #fff;
        }

        @media (max-width: 640px){
          .acm-gmbody{ grid-template-columns:1fr !important; overflow-y:auto !important; }
          #root .acm.acm .acm-kpi{ font-size:24px !important; }
        }
      `}</style>

      <div style={p.kpiGrid}>
        {stats.map(s => (
          <div key={s.label} className="acm-card" style={p.kpiCard}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ ...p.kpiDot, background:s.tone }} />
              <span className="acm-xs" style={p.kpiLabel}>{s.label}</span>
            </div>
            <div className="acm-kpi" style={{ ...p.kpiValue, color:s.tone }}>{s.val}</div>
          </div>
        ))}
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
                background: isActive ? TK.surface : "transparent",
                color:      isActive ? TK.teal : TK.inkSoft,
                boxShadow:  isActive ? "0 2px 6px rgba(16,42,67,.10)" : "none",
              }}
            >
              <span>{n.icon}</span>
              <span>{n.label}</span>
              {n.badge !== undefined && (
                <span className="acm-xs" style={{
                  fontWeight:800,
                  background: n.badgeColor === "warn" ? TK.amberSoft : TK.brandSoft,
                  color:      n.badgeColor === "warn" ? TK.amber : TK.brand,
                  padding:"2px 9px", borderRadius:999,
                }}>{n.badge}</span>
              )}
            </button>
          );
        })}
        {view === "form" && editUser && (
          <div style={{
            marginInlineStart:"auto", display:"flex", alignItems:"center", gap:8,
            padding:"7px 14px", borderRadius:999,
            background:TK.violetSoft, border:`1px solid ${TK.violet}26`,
            fontWeight:800, color:TK.violet,
          }}>
            ✏️ {t("amEditing")} <strong>{editUser.username}</strong>
            <button onClick={() => { setView("list"); setEditUser(null); }}
              style={{ background:"none", border:"none", cursor:"pointer", color:"#6d28d9",
                fontWeight:900, fontSize:18, padding:"0 2px", lineHeight:1 }}>×</button>
          </div>
        )}
      </div>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <main style={p.mainContent}>

          {/* Toast notification */}
          {msg && (
            <div style={p.notice(msg.type === "ok" ? "ok" : "err")}>
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
            <div style={p.notice("warn")}>
              <span>⚠️ {t("amServerNotFound")}</span>
            </div>
          )}

          {/* ── LIST VIEW ── */}
          {view === "list" && (
            <div>
              {/* Search + refresh */}
              <div style={p.listToolbar}>
                <div style={{ flex:1, minWidth:240, position:"relative" }}>
                  <span style={{ position:"absolute", insetInlineStart:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", opacity:.55 }}>🔍</span>
                  <input
                    className="acm-searchinput"
                    style={{ ...p.searchInput, paddingInlineStart:42, width:"100%", boxSizing:"border-box" }}
                    placeholder={t("amSearchPlaceholder")}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <select value={groupBy} onChange={e => setGroupBy(e.target.value)}
                  style={p.toolSelect} title={t("amGroupBy")}>
                  <option value="none">▤ {t("amGroupNone")}</option>
                  <option value="branch">🏬 {t("amGroupBranch")}</option>
                  <option value="custom">🏷️ {t("amGroupCustom")}{groups.length ? ` (${groups.length})` : ""}</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                  style={p.toolSelect} title={t("amSortBy")}>
                  <option value="name">🔤 {t("amSortName")}</option>
                  <option value="login">🕒 {t("amSortLogin")}</option>
                  <option value="role">👑 {t("amSortRole")}</option>
                </select>
                <button className="acm-actbtn" onClick={() => setShowGroups(true)}
                  style={p.btnRefresh} title={t("amManageGroups")}>
                  🏷️ {t("amManageGroups")}
                </button>
                <button className="acm-actbtn" onClick={loadUsers} style={p.btnRefresh}>
                  🔄 {t("amRefresh")}
                </button>
                <button className="acm-actbtn" onClick={exportCSV} style={p.btnRefresh} title={t("amExportCsvTip")}>
                  CSV
                </button>
                <button className="acm-actbtn" style={p.btnPrimary}
                  onClick={() => { setEditUser(null); setView("form"); }}>
                  ➕ {t("amNavAdd")}
                </button>
                {onClose && (
                  <button className="acm-actbtn" onClick={onClose} style={p.btnRefresh}>
                    ✕
                  </button>
                )}
              </div>

              {/* Content */}
              {loading ? (
                <div style={p.empty}><div style={{ fontSize:34, marginBottom:10 }}>⏳</div>{t("amLoadingAccounts")}</div>
              ) : sortedUsers.length === 0 ? (
                <div style={p.empty}>
                  <div style={{ fontSize:34, marginBottom:10 }}>{search ? "🔍" : "👥"}</div>
                  {search ? `${t("amNoMatchAccounts")} "${search}"` : t("amNoAccounts")}
                </div>
              ) : buckets ? (
                <div>
                  {/* A bucket header is a real control, not a caption: it says
                      how many are inside and folds the ones you are not
                      looking at, which is the whole point of grouping thirty
                      accounts. */}
                  <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap" }}>
                    <button className="acm-actbtn" style={p.btnMini}
                      onClick={() => setCollapsed(new Set())}>{t("amExpandAll")}</button>
                    <button className="acm-actbtn" style={p.btnMini}
                      onClick={() => setCollapsed(new Set(buckets.map(b => b.key)))}>{t("amCollapseAll")}</button>
                    {groupBy === "branch" && (
                      <span style={p.bucketNote}>
                        ℹ️ {t("amGroupBranch")} — {t("amBranchMemberships")}
                      </span>
                    )}
                    {groupsError === "offline" && groupBy === "custom" && (
                      <span style={{ ...p.bucketNote, color:TK.amber }}>⚠️ {t("amGroupsOffline")}</span>
                    )}
                  </div>

                  {buckets.map(b => {
                    const isOpen = !collapsed.has(b.key);
                    const c = b.group ? colorOf(b.group.color) : null;
                    const label =
                      b.key === NO_BRANCH ? t("amGroupNoBranch")
                      : b.key === UNGROUPED ? t("amGroupUngrouped")
                      : b.label;
                    return (
                      <div key={b.key} style={p.bucket}>
                        <button onClick={() => toggleBucket(b.key)} style={{
                          ...p.bucketHead,
                          borderInlineStartColor: c ? c.dot : TK.lineHi,
                        }}>
                          <span style={{ width:14, fontWeight:900, opacity:.75 }}>{isOpen ? "▾" : "▸"}</span>
                          {b.group ? <span style={{ fontSize:17 }}>{b.group.icon}</span> : null}
                          <span style={{ fontWeight:900 }}>{label}</span>
                          <span style={{
                            marginInlineStart:"auto", fontWeight:900, fontSize:12,
                            background: c ? c.dot : "#8aa2b8",
                            color:"#fff", borderRadius:999, padding:"3px 11px",
                          }}>
                            {b.users.length} {t("amGroupMembers")}
                          </span>
                        </button>
                        {isOpen && (
                          b.users.length === 0 ? (
                            <div style={p.bucketEmpty}>{t("amGroupEmpty")}</div>
                          ) : (
                            <div style={{ ...p.cardsGrid, padding:"10px 0 4px" }}>
                              {b.users.map(u => (
                                <AccountCard key={`${b.key}-${u.id}`} user={u}
                                  currentUsername={currentUsername}
                                  adminCount={adminCount}
                                  onEdit={() => { setEditUser(u); setView("form"); }}
                                  onToggle={() => handleToggle(u)}
                                  onDelete={() => setConfirmDel(u)}
                                  onResetPw={() => setResetPwUser(u)} />
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={p.cardsGrid}>
                  {sortedUsers.map(u => (
                    <AccountCard key={u.id} user={u}
                      currentUsername={currentUsername}
                      adminCount={adminCount}
                      onEdit={() => { setEditUser(u); setView("form"); }}
                      onToggle={() => handleToggle(u)}
                      onDelete={() => setConfirmDel(u)}
                      onResetPw={() => setResetPwUser(u)} />
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
              isSuperAdmin={isSuperAdmin}
              companies={companies}
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
              onResetPw={(u) => setResetPwUser(u)}
            />
          )}

          {/* ── FAILED LOGINS VIEW ── */}
          {view === "security" && <FailedLoginsTab />}

          {/* ── ACTIVITY VIEW ── */}
          {view === "activity" && <ActivityLogTab />}
      </main>

      {/* ══════════════ ACCOUNT GROUPS MODAL ══════════════ */}
      <GroupManager
        open={showGroups}
        groups={groups}
        users={users}
        saving={savingGroups}
        onSave={handleSaveGroups}
        onClose={() => setShowGroups(false)}
      />

      {/* ══════════════ RESET PASSWORD MODAL ══════════════ */}
      {resetPwUser && (
        <ResetPasswordModal
          user={resetPwUser}
          saving={saving}
          onClose={() => setResetPwUser(null)}
          onSave={handleResetPw}
        />
      )}

      {/* ══════════════ DELETE CONFIRM MODAL ══════════════ */}
      {confirmDel && (
        <div style={p.overlay}>
          <div style={p.modal}>
            <div style={{ fontWeight:1000, fontSize:20, marginBottom:10, color:"#0f172a" }}>
              🗑️ {t("amDeleteAccountTitle")}
            </div>
            <p style={{ color:"#475569", marginBottom:20, fontSize:15, lineHeight:1.65 }}>
              {t("amDeleteConfirm1")} <strong style={{ color:"#0f172a" }}>{confirmDel.username}</strong>?<br/>
              {t("amDeleteConfirm2")}
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => handleDelete(confirmDel)} style={{
                flex:1, padding:"13px", background:"#dc2626", color:"#fff",
                border:"none", borderRadius:10, fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"inherit",
              }} data-delete-action="true">🗑️ {t("delete")}</button>
              <button onClick={() => setConfirmDel(null)} style={{
                flex:1, padding:"13px",
                background:"#f8fafc", color:"#334155",
                border:"1px solid #cbd5e1", borderRadius:10,
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
   SETTINGS PANEL STYLES
═══════════════════════════════════════════════════════ */
const p = {
  /* Compact shell — no min-height, sizes to its content. Sits inside parent. */
  shell: {
    background:"transparent",
    display:"flex", flexDirection:"column",
    fontFamily:TK.font,
    color:TK.ink,
    border:"none", borderRadius:0, boxShadow:"none",
    overflow:"visible", position:"relative",
  },

  /* ── stat strip ─────────────────────────────────────────
     One quiet card per number. The old version shouted with a 4px coloured
     top border on every card; the colour now lives in a small dot, so five
     cards side by side read as one strip instead of five posters. */
  kpiGrid: {
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit, minmax(148px, 1fr))",
    gap:10,
    marginBottom:16,
  },
  kpiCard: {
    background:TK.surface,
    border:`1px solid ${TK.line}`,
    borderRadius:TK.r,
    padding:"14px 16px",
    boxShadow:TK.shadow,
    display:"flex", flexDirection:"column", gap:6,
  },
  kpiLabel: { color:TK.inkFaint, fontWeight:800, letterSpacing:".01em" },
  kpiValue: { color:TK.ink, fontWeight:900, lineHeight:1 },
  kpiDot:   { width:8, height:8, borderRadius:999, flexShrink:0 },

  /* ── segmented tab strip ───────────────────────────────
     A pill rail: the active tab is a raised white pill, the rest are plain
     text. Reads as one control, not five competing buttons. */
  tabsBar: {
    display:"flex", alignItems:"center", gap:4, flexWrap:"wrap",
    padding:5,
    marginBottom:16,
    background:TK.tint,
    border:`1px solid ${TK.line}`,
    borderRadius:999,
  },
  tab: {
    display:"inline-flex", alignItems:"center", gap:8,
    minHeight:42,
    padding:"9px 16px",
    border:"1px solid transparent", borderRadius:999,
    cursor:"pointer", fontFamily:"inherit",
    fontWeight:800,
    transition:"background .16s, color .16s, box-shadow .16s",
    whiteSpace:"nowrap",
  },

  mainContent: { padding:0 },

  /* ── control bar ───────────────────────────────────────── */
  listToolbar: {
    display:"flex", alignItems:"center", gap:9, flexWrap:"wrap",
    marginBottom:14,
    padding:12,
    background:TK.surface,
    border:`1px solid ${TK.line}`,
    borderRadius:TK.r,
    boxShadow:TK.shadow,
  },
  searchInput: {
    minHeight:44,
    padding:"11px 15px", borderRadius:TK.rMd,
    background:TK.tint,
    border:`1px solid ${TK.line}`,
    color:TK.ink,
    fontFamily:TK.font, fontWeight:700,
    transition:"border-color .15s, box-shadow .15s, background .15s",
  },
  /* Was dark-theme: light grey text on a transparent fill — invisible on the
     white toolbar it actually sits in. */
  toolSelect: {
    minHeight:44,
    padding:"10px 13px", borderRadius:TK.rMd,
    background:TK.surface, color:TK.ink,
    border:`1px solid ${TK.line}`,
    fontWeight:800, fontFamily:"inherit", cursor:"pointer", outline:"none",
    transition:"border-color .15s, box-shadow .15s",
  },
  btnRefresh: {
    minHeight:44,
    padding:"10px 16px", borderRadius:TK.rMd,
    background:TK.surface, color:TK.inkSoft,
    border:`1px solid ${TK.line}`,
    fontWeight:800, cursor:"pointer",
    fontFamily:TK.font, whiteSpace:"nowrap",
    transition:"background .15s, border-color .15s, color .15s",
  },
  btnPrimary: {
    minHeight:44,
    padding:"10px 18px", borderRadius:TK.rMd,
    background:TK.teal, color:"#fff",
    border:`1px solid ${TK.teal}`,
    fontWeight:800, cursor:"pointer",
    fontFamily:TK.font, whiteSpace:"nowrap",
    boxShadow:"0 6px 16px rgba(15,118,110,.22)",
  },
  btnToolbar: {
    padding:"10px 18px", borderRadius:TK.rMd,
    fontWeight:800, cursor:"pointer", fontFamily:"inherit",
    whiteSpace:"nowrap",
  },
  btnMini: {
    padding:"7px 14px", borderRadius:999,
    fontWeight:800, fontFamily:"inherit", cursor:"pointer",
    background:TK.surface, color:TK.inkSoft,
    border:`1px solid ${TK.line}`,
    transition:"background .15s, color .15s",
  },

  cardsGrid: { display:"flex", flexDirection:"column", gap:10 },

  /* ── grouped list ──────────────────────────────────────
     Also dark-theme leftovers: #e2e8f0 text on a 5%-white fill. */
  bucketNote: { fontWeight:700, color:TK.inkFaint, alignSelf:"center" },
  bucket: { marginBottom:16 },
  bucketHead: {
    display:"flex", alignItems:"center", gap:10, width:"100%", textAlign:"start",
    padding:"12px 16px", borderRadius:TK.rMd, cursor:"pointer", font:"inherit",
    fontWeight:800,
    background:TK.tint, color:TK.ink,
    border:`1px solid ${TK.line}`,
    borderInlineStartWidth:4, borderInlineStartStyle:"solid",
    transition:"background .15s",
  },
  bucketEmpty: { color:TK.inkFaint, fontStyle:"italic", padding:"12px 16px" },

  empty: {
    background:TK.surface, border:`1px dashed ${TK.lineHi}`,
    borderRadius:TK.r, textAlign:"center", padding:"38px 22px",
    color:TK.inkSoft, fontWeight:800,
  },

  /* ── dialogs ───────────────────────────────────────────── */
  overlay: {
    position:"fixed", inset:0,
    background:"rgba(18,50,76,.38)",
    display:"flex", alignItems:"center", justifyContent:"center",
    zIndex:9999, backdropFilter:"blur(5px)", padding:16,
  },
  modal: {
    background:TK.surface,
    border:`1px solid ${TK.line}`,
    borderRadius:20, padding:"26px 28px",
    width:"min(430px,94vw)",
    boxShadow:"0 30px 70px rgba(16,42,67,.28)",
    color:TK.ink,
  },
  pwIconBtn: {
    padding:"0 14px", borderRadius:TK.rMd,
    background:TK.tint, color:TK.inkSoft,
    border:`1px solid ${TK.line}`,
    cursor:"pointer", fontFamily:"inherit", flexShrink:0,
  },

  /* ── notices ───────────────────────────────────────────── */
  notice: (tone) => ({
    display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
    padding:"13px 17px", borderRadius:TK.rMd, marginBottom:16,
    fontWeight:800,
    background: tone === "ok" ? TK.greenSoft : tone === "warn" ? TK.amberSoft : TK.roseSoft,
    color:      tone === "ok" ? TK.green    : tone === "warn" ? TK.amber     : TK.rose,
    border: `1px solid ${(tone === "ok" ? TK.green : tone === "warn" ? TK.amber : TK.rose)}2e`,
  }),
};

/* ═══════════════════════════════════════════════════════
   LIGHT FORM STYLES (used inside white AccountForm card)
═══════════════════════════════════════════════════════ */
const fs = {
  formWrap: {
    background:TK.surface, border:`1px solid ${TK.line}`,
    borderRadius:20, padding:"28px 30px",
    boxShadow:TK.shadow,
    maxWidth:"100%",
  },
  title:  { margin:"0 0 22px", fontWeight:900, color:TK.ink },
  row:    { display:"flex", gap:16, marginBottom:16, flexWrap:"wrap" },
  field:  { flex:1, minWidth:220, display:"flex", flexDirection:"column", gap:7 },
  /* Sentence case, not SHOUTING CAPS — a form of twenty fields set in
     uppercase micro-type is the least readable thing on the screen. */
  label:  { fontWeight:800, color:TK.inkSoft, letterSpacing:0 },
  input:  {
    padding:"12px 14px", border:`1px solid ${TK.line}`, borderRadius:TK.rMd,
    fontFamily:"inherit", color:TK.ink,
    background:TK.tint, outline:"none", width:"100%", boxSizing:"border-box",
    transition:"border-color .15s, box-shadow .15s, background .15s",
  },
  checkRow: { display:"flex", alignItems:"center", gap:10, cursor:"pointer", padding:"6px 8px", borderRadius:8 },
  err: { color:TK.rose, background:TK.roseSoft, padding:"11px 14px", borderRadius:TK.rSm, fontWeight:800, marginTop:10 },
  /* permissions table */
  permBox:    { border:`1px solid ${TK.line}`, borderRadius:TK.r, padding:"18px 20px", marginBottom:18, background:TK.surface },
  permHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 },
  permTitle:  { fontWeight:900, color:TK.ink },
  fullAccessBanner: { background:TK.violetSoft, border:`1px solid ${TK.violet}26`, borderRadius:TK.rMd, padding:"13px 16px", color:TK.violet, fontWeight:800 },
  permTable:  { width:"100%", borderCollapse:"separate", borderSpacing:0, fontSize:14 },
  permTh:     { padding:"10px", background:TK.tint, fontWeight:800, color:TK.inkSoft, textAlign:"center", whiteSpace:"nowrap", borderBottom:`1px solid ${TK.line}`, position:"sticky", top:0, zIndex:1 },
  permTd:     { padding:"8px 10px", verticalAlign:"middle", borderBottom:`1px solid ${TK.line}` },
  /* 22px, not 16 — these are the switches the whole screen exists to flip, and
     at 16px they were smaller than the text beside them and awkward to hit. */
  cbBig:      { width:22, height:22, cursor:"pointer", flexShrink:0, margin:0 },
  permSecLabel: { display:"flex", alignItems:"center", gap:10, cursor:"pointer", userSelect:"none" },
  cbCell:     { display:"inline-flex", alignItems:"center", justifyContent:"center", width:38, height:34, borderRadius:9, border:"1.5px solid transparent", transition:"background .12s, border-color .12s" },
  btnSelectAll: { fontWeight:800, color:TK.brand, background:TK.brandSoft, border:`1px solid ${TK.brand}26`, borderRadius:999, cursor:"pointer", padding:"8px 15px", fontFamily:"inherit" },
  btnAllOps:  { background:"none", border:"none", cursor:"pointer", fontSize:18, padding:"2px 6px", borderRadius:6 },
  /* employees */
  empBox:      { border:`1px solid ${TK.line}`, borderRadius:TK.r, padding:"18px 20px", marginBottom:18, background:TK.tint },
  empChip:     { display:"flex", alignItems:"center", gap:6, background:TK.brandSoft, color:TK.brand, border:`1px solid ${TK.brand}22`, borderRadius:999, padding:"5px 13px", fontWeight:800 },
  empRemoveBtn:{ background:"none", border:"none", cursor:"pointer", color:"#dc2626", fontWeight:900, fontSize:17, lineHeight:1, padding:"0 2px" },
  btnAdd2:     { padding:"11px 18px", background:TK.brand, color:"#fff", border:"none", borderRadius:TK.rMd, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
  /* form action buttons */
  btnSave:     { padding:"13px 28px", background:TK.teal, color:"#fff", border:"none", borderRadius:TK.rMd, fontWeight:800, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 8px 20px rgba(15,118,110,.22)" },
  btnCancel:   { padding:"13px 24px", background:TK.tint, color:TK.inkSoft, border:`1px solid ${TK.line}`, borderRadius:TK.rMd, fontWeight:800, cursor:"pointer", fontFamily:"inherit" },
};
