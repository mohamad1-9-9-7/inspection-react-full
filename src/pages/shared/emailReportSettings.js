// emailReportSettings.js
// Centralised persisted settings for the Email Send feature.
// One JSON in localStorage — read with `loadEmailSettings`, write with `saveEmailSettings`.

import { postMeta, listReportsByType } from "../monitor/branches/shipment_recc/qcsRawApi";

const STORAGE_KEY = "qcs_email_settings_v1";
const RECIPIENT_HISTORY_KEY = "qcs_email_recipient_history_v1";
const CONTACTS_LS_KEY = "qcs_email_contacts_v1";
const TEMPLATES_LS_KEY = "qcs_email_templates_v1";
const CONTACT_TYPE = "qcs_email_contact";
const MAX_HISTORY = 30;

/* ===== Classification levels (UI labels + colors) ===== */
export const CLASSIFICATIONS = [
  { id: "public",       label: "🟢 Public",                color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  { id: "internal",     label: "🔵 Internal",              color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  { id: "confidential", label: "🟡 Confidential",          color: "#a16207", bg: "#fef3c7", border: "#fcd34d" },
  { id: "highly",       label: "🔴 Highly Confidential",   color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
];
export const getClassification = (id) =>
  CLASSIFICATIONS.find((c) => c.id === id) || CLASSIFICATIONS[1]; // default Internal

/* ===== Recipient roles ===== */
export const RECIPIENT_ROLES = [
  { id: "none",     label: "—",                color: "#94a3b8", bg: "#f1f5f9" },
  { id: "action",   label: "⚡ Action",        color: "#b91c1c", bg: "#fee2e2" },
  { id: "approver", label: "✅ Approver",      color: "#15803d", bg: "#dcfce7" },
  { id: "reviewer", label: "📋 Reviewer",      color: "#1d4ed8", bg: "#dbeafe" },
  { id: "fyi",      label: "👁️ FYI",          color: "#7c3aed", bg: "#ede9fe" },
];
export const getRole = (id) =>
  RECIPIENT_ROLES.find((r) => r.id === id) || RECIPIENT_ROLES[0];

const EMAIL_RE_LOCAL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PRIORITY_VALUES = ["high", "normal", "low"];
export const PRIORITY_LABELS = {
  high:   "🔴 High",
  normal: "⚪ Normal",
  low:    "🔵 Low",
};

function defaultSettings() {
  return {
    defaultTo: "",
    defaultCc: "",
    defaultBcc: "",
    subjectPrefix: "",
    signatureName: "",
    signatureTitle: "",
    signatureCompany: "Al Mawashi — Trans Emirates Livestock Trading L.L.C.",
    signaturePhone: "",
    signatureEmail: "",
    signatureCustomHtml: "",        // optional custom HTML overrides everything
    signatureImageUrl: "",          // Cloudinary URL for logo/signature image
    priority: "normal",             // high | normal | low
    requestReadReceipt: false,
    confidentialityNote: false,     // (legacy) adds "Internal Use Only" banner
    defaultClassification: "internal", // public | internal | confidential | highly
    /* Auto-routing: per-report-type default recipients
       Shape: { [reportType]: { to: [], cc: [] } }
       When the modal opens, if the report's type matches an entry here,
       the To/CC are pre-filled from this (unless user already saved different defaults). */
    autoRouting: {},
  };
}

export function loadEmailSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

export function saveEmailSettings(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultSettings(), ...s }));
  } catch {}
}

export function resetEmailSettings() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  return defaultSettings();
}

/* ===== Recipient history (for autocomplete) ===== */

export function loadRecipientHistory() {
  try {
    const raw = localStorage.getItem(RECIPIENT_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function pushRecipientHistory(emails) {
  try {
    const cur = loadRecipientHistory();
    const merged = [...emails, ...cur];
    const uniq = [];
    const seen = new Set();
    for (const e of merged) {
      const k = String(e || "").toLowerCase().trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      uniq.push(e);
      if (uniq.length >= MAX_HISTORY) break;
    }
    localStorage.setItem(RECIPIENT_HISTORY_KEY, JSON.stringify(uniq));
  } catch {}
}

export function clearRecipientHistory() {
  try { localStorage.removeItem(RECIPIENT_HISTORY_KEY); } catch {}
}

/* ===== Saved Email Contacts (server + local fallback) =====
   Contact shape:  { email: string, name: string }
   Backward compat: legacy strings (just emails) are auto-upgraded to objects
   with empty `name`. New writes always store the object form. */

function normalizeContact(c) {
  if (!c) return null;
  if (typeof c === "string") {
    const e = c.trim();
    return e ? { email: e, name: "", groups: [] } : null;
  }
  if (typeof c === "object") {
    const e = String(c.email || "").trim();
    if (!e) return null;
    const groups = Array.isArray(c.groups) ? c.groups.map((g) => String(g || "").trim()).filter(Boolean) : [];
    return { email: e, name: String(c.name || "").trim(), groups };
  }
  return null;
}

function getLocalContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map(normalizeContact).filter(Boolean);
  } catch { return []; }
}

function setLocalContacts(arr) {
  try { localStorage.setItem(CONTACTS_LS_KEY, JSON.stringify(arr)); } catch {}
}

/** Dedupe by email (case-insensitive). For conflicts, merge fields:
    - name: take the non-empty one (later wins if both non-empty)
    - groups: union of both sides */
const dedupeContacts = (arr) => {
  const map = new Map();
  for (const c of arr) {
    const n = normalizeContact(c);
    if (!n) continue;
    const k = n.email.toLowerCase();
    const prev = map.get(k);
    if (!prev) { map.set(k, n); continue; }
    const mergedGroups = Array.from(new Set([...(prev.groups || []), ...(n.groups || [])]));
    map.set(k, {
      email: n.email,
      name:  n.name || prev.name,
      groups: mergedGroups,
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const an = (a.name || a.email).toLowerCase();
    const bn = (b.name || b.email).toLowerCase();
    return an.localeCompare(bn);
  });
};

/** Fetch saved contacts (server merged with local cache). Always resolves.
    Returns array of {email, name} objects. */
export async function listEmailContacts() {
  try {
    const recs = await listReportsByType(CONTACT_TYPE);
    const serverContacts = (Array.isArray(recs) ? recs : [])
      .map((r) => normalizeContact(r?.payload))
      .filter(Boolean);
    const merged = dedupeContacts([...serverContacts, ...getLocalContacts()]);
    setLocalContacts(merged);
    return merged;
  } catch {
    return dedupeContacts(getLocalContacts());
  }
}

/** Add a contact: validate, save. Accepts (email), (email, name), or (email, name, groups[]).
    Returns the cleaned {email, name, groups} object. */
export async function addEmailContact(email, name = "", groups = []) {
  const e = String(email || "").trim();
  if (!EMAIL_RE_LOCAL.test(e)) throw new Error("صيغة الإيميل غير صحيحة");
  const n = String(name || "").trim();
  const g = Array.isArray(groups) ? groups.map((x) => String(x || "").trim()).filter(Boolean) : [];

  const existing = getLocalContacts();
  const found = existing.find((x) => x.email.toLowerCase() === e.toLowerCase());
  if (found) {
    /* Update existing contact: take new name if provided, merge groups */
    const next = existing.map((x) => {
      if (x.email.toLowerCase() !== e.toLowerCase()) return x;
      return {
        email: x.email,
        name:  n || x.name,
        groups: Array.from(new Set([...(x.groups || []), ...g])),
      };
    });
    setLocalContacts(dedupeContacts(next));
    const updated = next.find((x) => x.email.toLowerCase() === e.toLowerCase());
    try { await postMeta(CONTACT_TYPE, { email: e, name: updated.name, groups: updated.groups }); } catch {}
    return updated;
  }
  /* New contact */
  const newContact = { email: e, name: n, groups: g };
  setLocalContacts(dedupeContacts([...existing, newContact]));
  try {
    await postMeta(CONTACT_TYPE, { email: e, name: n, groups: g });
  } catch {
    // server unreachable — kept locally, will re-sync on next listEmailContacts
  }
  return newContact;
}

/** Update an existing contact's groups (overwrites the groups list). */
export async function updateContactGroups(email, groups) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return;
  const g = Array.isArray(groups) ? groups.map((x) => String(x || "").trim()).filter(Boolean) : [];
  const existing = getLocalContacts();
  const found = existing.find((x) => x.email.toLowerCase() === e);
  if (!found) return;
  const next = existing.map((x) =>
    x.email.toLowerCase() === e ? { ...x, groups: g } : x
  );
  setLocalContacts(dedupeContacts(next));
  try { await postMeta(CONTACT_TYPE, { email: found.email, name: found.name, groups: g }); } catch {}
}

/** List unique group names from all contacts, sorted. */
export function listGroupsFromContacts(contacts) {
  const set = new Set();
  for (const c of contacts || []) {
    for (const g of (c?.groups || [])) {
      const t = String(g || "").trim();
      if (t) set.add(t);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** Get all emails belonging to a group (case-insensitive group match). */
export function expandGroup(groupName, contacts) {
  const g = String(groupName || "").trim().toLowerCase();
  if (!g) return [];
  return (contacts || [])
    .filter((c) => (c.groups || []).some((x) => String(x || "").trim().toLowerCase() === g))
    .map((c) => c.email);
}

/** Remove from local cache by email. */
export function removeLocalContact(email) {
  const e = String(email || "").trim().toLowerCase();
  setLocalContacts(getLocalContacts().filter((x) => x.email.toLowerCase() !== e));
}

/* ===== Email Templates — quick-action presets ===== */

/* Template shape:
   {
     id: string,           // unique
     name: string,         // shown on the button
     icon: string,         // emoji
     subject: string,      // overrides modal subject when applied
     note: string,         // overrides Note
     toGroups: string[],   // group names → expanded to emails
     ccGroups: string[],
     toEmails: string[],   // explicit emails (in addition to groups)
     ccEmails: string[],
     priority: "high"|"normal"|"low",
     classification: "public"|"internal"|"confidential"|"highly",
     includeTable: boolean,
     sortBy: string,
     groupBy: string,
   }
*/

export function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export function saveTemplates(arr) {
  try { localStorage.setItem(TEMPLATES_LS_KEY, JSON.stringify(arr || [])); } catch {}
}

/** Persist a new template (or update by id). Returns the saved template. */
export function saveTemplate(t) {
  const id = String(t.id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
  const safe = {
    id,
    name:           String(t.name || "Untitled").trim() || "Untitled",
    icon:           String(t.icon || "📧"),
    subject:        String(t.subject || ""),
    note:           String(t.note || ""),
    toGroups:       Array.isArray(t.toGroups) ? t.toGroups : [],
    ccGroups:       Array.isArray(t.ccGroups) ? t.ccGroups : [],
    toEmails:       Array.isArray(t.toEmails) ? t.toEmails : [],
    ccEmails:       Array.isArray(t.ccEmails) ? t.ccEmails : [],
    priority:       PRIORITY_VALUES.includes(t.priority) ? t.priority : "normal",
    classification: t.classification || "internal",
    includeTable:   !!t.includeTable,
    sortBy:         String(t.sortBy || "default"),
    groupBy:        String(t.groupBy || "none"),
  };
  const all = loadTemplates();
  const idx = all.findIndex((x) => x.id === id);
  if (idx >= 0) all[idx] = safe; else all.push(safe);
  saveTemplates(all);
  return safe;
}

export function deleteTemplate(id) {
  saveTemplates(loadTemplates().filter((t) => t.id !== id));
}

/** Expand a template's groups + explicit emails to a final list of emails. */
export function expandTemplateRecipients(template, contacts) {
  const t = template || {};
  const fromGroups = (groups) => (groups || []).flatMap((g) => expandGroup(g, contacts));
  const dedupe = (arr) => {
    const seen = new Set();
    const out = [];
    for (const e of arr) {
      const k = String(e || "").trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(e);
    }
    return out;
  };
  return {
    to: dedupe([...fromGroups(t.toGroups), ...(t.toEmails || [])]),
    cc: dedupe([...fromGroups(t.ccGroups), ...(t.ccEmails || [])]),
  };
}

/* ===== Auto-routing helpers ===== */

/** Get the auto-routing config for a given report type, or null. */
export function getAutoRoute(reportType, settings) {
  if (!reportType) return null;
  const cfg = settings?.autoRouting?.[reportType];
  if (!cfg) return null;
  return {
    toGroups: Array.isArray(cfg.toGroups) ? cfg.toGroups : [],
    ccGroups: Array.isArray(cfg.ccGroups) ? cfg.ccGroups : [],
    toEmails: Array.isArray(cfg.toEmails) ? cfg.toEmails : [],
    ccEmails: Array.isArray(cfg.ccEmails) ? cfg.ccEmails : [],
  };
}

/** Expand an auto-route to a final email list. */
export function expandAutoRoute(route, contacts) {
  return expandTemplateRecipients(route, contacts); // same shape
}

/** Find a contact's display name by email (case-insensitive). Falls back to email. */
export function contactLabel(emailOrContact, contacts = []) {
  if (typeof emailOrContact === "object" && emailOrContact?.email) {
    return emailOrContact.name || emailOrContact.email;
  }
  const e = String(emailOrContact || "").trim().toLowerCase();
  if (!e) return "";
  const found = contacts.find((c) => c.email.toLowerCase() === e);
  return found?.name ? `${found.name} <${found.email}>` : (found?.email || emailOrContact);
}

export function isValidEmail(s) {
  return EMAIL_RE_LOCAL.test(String(s || "").trim());
}

/* ===== Helper: build signature HTML from settings ===== */

export function buildSignatureHtml(settings) {
  if (!settings) return "";
  if (settings.signatureCustomHtml && settings.signatureCustomHtml.trim()) {
    return settings.signatureCustomHtml;
  }
  const {
    signatureName, signatureTitle, signatureCompany,
    signaturePhone, signatureEmail, signatureImageUrl,
  } = settings;
  const hasAny =
    signatureName || signatureTitle || signatureCompany ||
    signaturePhone || signatureEmail || signatureImageUrl;
  if (!hasAny) return "";
  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  const img = signatureImageUrl
    ? `<td style="vertical-align:top;padding-right:14px;"><img src="${esc(signatureImageUrl)}" alt="logo" style="max-height:70px;display:block;"/></td>`
    : "";
  const rows = [];
  if (signatureName)    rows.push(`<div style="font-weight:900;color:#0f172a;">${esc(signatureName)}</div>`);
  if (signatureTitle)   rows.push(`<div style="color:#475569;">${esc(signatureTitle)}</div>`);
  if (signatureCompany) rows.push(`<div style="color:#475569;font-weight:700;margin-top:2px;">${esc(signatureCompany)}</div>`);
  if (signaturePhone || signatureEmail) {
    const parts = [];
    if (signaturePhone) parts.push(`📞 ${esc(signaturePhone)}`);
    if (signatureEmail) parts.push(`✉️ <a href="mailto:${esc(signatureEmail)}" style="color:#2563eb;text-decoration:none;">${esc(signatureEmail)}</a>`);
    rows.push(`<div style="color:#64748b;font-size:12px;margin-top:4px;">${parts.join(" &nbsp;·&nbsp; ")}</div>`);
  }
  return `
    <div style="margin-top:20px;padding-top:14px;border-top:2px solid #e2e8f0;font-family:Inter,Roboto,Arial,sans-serif;">
      <table cellpadding="0" cellspacing="0"><tr>
        ${img}
        <td style="vertical-align:top;font-size:13px;line-height:1.5;">${rows.join("")}</td>
      </tr></table>
    </div>`;
}

export function buildSignatureText(settings) {
  if (!settings) return "";
  const {
    signatureName, signatureTitle, signatureCompany,
    signaturePhone, signatureEmail, signatureCustomHtml,
  } = settings;
  if (signatureCustomHtml && signatureCustomHtml.trim()) {
    return signatureCustomHtml.replace(/<[^>]+>/g, "").trim();
  }
  const parts = [];
  if (signatureName) parts.push(signatureName);
  if (signatureTitle) parts.push(signatureTitle);
  if (signatureCompany) parts.push(signatureCompany);
  if (signaturePhone) parts.push("📞 " + signaturePhone);
  if (signatureEmail) parts.push("✉️ " + signatureEmail);
  return parts.length ? "\n\n---\n" + parts.join("\n") : "";
}
