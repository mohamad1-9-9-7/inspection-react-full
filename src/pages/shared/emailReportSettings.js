// emailReportSettings.js
// Centralised persisted settings for the Email Send feature.
//
// STORAGE RULE: the server is the only source of truth. Everything here —
// settings, contacts, templates — lives in /api/reports as a meta record.
// localStorage is a CACHE ONLY: it makes the first paint instant and keeps the
// app usable while the server is unreachable, and every cached value is either
// already on the server or queued to be pushed there. Nothing is local-only.

import { postMeta, listReportsByType, REPORTS_URL } from "../monitor/branches/shipment_recc/qcsRawApi";

/* Cache keys (mirrors of server records — never a standalone store) */
const STORAGE_KEY = "qcs_email_settings_v1";
const SETTINGS_ID_KEY = "qcs_email_settings_row_v1";  // remembered /api/reports row id
const CONTACTS_LS_KEY = "qcs_email_contacts_v1";
const TEMPLATES_LS_KEY = "qcs_email_templates_v1";

/* Server record types */
const SETTINGS_TYPE = "qcs_email_settings";
const CONTACT_TYPE = "qcs_email_contact";
const TEMPLATE_TYPE = "qcs_email_template";

/* ===== Classification levels (UI labels + colors) ===== */
export const CLASSIFICATIONS = [
  { id: "public",       label: "🟢 Public",              labelAr: "🟢 عام",            color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  { id: "internal",     label: "🔵 Internal",            labelAr: "🔵 داخلي",          color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  { id: "confidential", label: "🟡 Confidential",        labelAr: "🟡 سرّي",           color: "#a16207", bg: "#fef3c7", border: "#fcd34d" },
  { id: "highly",       label: "🔴 Highly Confidential", labelAr: "🔴 سرّي للغاية",    color: "#991b1b", bg: "#fee2e2", border: "#fca5a5" },
];
export const getClassification = (id) =>
  CLASSIFICATIONS.find((c) => c.id === id) || CLASSIFICATIONS[1]; // default Internal

/* ===== Recipient roles ===== */
export const RECIPIENT_ROLES = [
  { id: "none",     label: "—",           labelAr: "—",              color: "#94a3b8", bg: "#f1f5f9" },
  { id: "action",   label: "⚡ Action",   labelAr: "⚡ للتنفيذ",      color: "#b91c1c", bg: "#fee2e2" },
  { id: "approver", label: "✅ Approver", labelAr: "✅ للاعتماد",     color: "#15803d", bg: "#dcfce7" },
  { id: "reviewer", label: "📋 Reviewer", labelAr: "📋 للمراجعة",    color: "#1d4ed8", bg: "#dbeafe" },
  { id: "fyi",      label: "👁️ FYI",     labelAr: "👁️ للعلم",       color: "#7c3aed", bg: "#ede9fe" },
];
export const getRole = (id) =>
  RECIPIENT_ROLES.find((r) => r.id === id) || RECIPIENT_ROLES[0];
/** Role label for the active language (`isAr`). */
export const roleLabel = (role, isAr) =>
  (isAr ? role?.labelAr || role?.label : role?.label) || "";

const EMAIL_RE_LOCAL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PRIORITY_VALUES = ["high", "normal", "low"];
export const PRIORITY_LABELS = {
  high:   "🔴 High",
  normal: "⚪ Normal",
  low:    "🔵 Low",
};
export const PRIORITY_LABELS_AR = {
  high:   "🔴 عالية",
  normal: "⚪ عادية",
  low:    "🔵 منخفضة",
};
/** Priority label for the active language (`isAr`). */
export const priorityLabel = (v, isAr) =>
  (isAr ? PRIORITY_LABELS_AR[v] : PRIORITY_LABELS[v]) || PRIORITY_LABELS[v] || v;

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
    defaultMethod: "outlook",       // outlook | server | whatsapp | copy
    requestReadReceipt: false,
    defaultClassification: "internal", // public | internal | confidential | highly
    /* Auto-routing: per-report-type defaults.
       Shape: { [reportType]: { templateId, toGroups[], ccGroups[], toEmails[], ccEmails[] } }
       When the modal opens against a matching report type, To/CC (and the
       routed template's subject/intro/note) are filled in automatically. */
    autoRouting: {},
  };
}

/* ===== Settings: server record + local cache =====
   One shared record of type `qcs_email_settings` — the whole team sees the same
   defaults, signature and auto-routing. localStorage only mirrors it. */

/** Synchronous read of the cached copy. Safe for first paint; call
    `fetchEmailSettings()` right after to pick up anyone else's changes. */
export function loadEmailSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

function cacheSettings(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultSettings(), ...s })); } catch {}
}
function getSettingsRowId() {
  try { return localStorage.getItem(SETTINGS_ID_KEY) || null; } catch { return null; }
}
function setSettingsRowId(id) {
  try {
    if (id) localStorage.setItem(SETTINGS_ID_KEY, String(id));
    else localStorage.removeItem(SETTINGS_ID_KEY);
  } catch {}
}

/** Pull the shared settings from the server and refresh the cache.
    Falls back to the cache when offline — never throws. */
export async function fetchEmailSettings() {
  try {
    const recs = await listReportsByType(SETTINGS_TYPE);
    const rows = (Array.isArray(recs) ? recs : []).filter((r) => r?.payload);
    if (!rows.length) {
      /* Nothing on the server yet — publish whatever this browser has so the
         team starts from the existing configuration instead of blanks. */
      const local = loadEmailSettings();
      setSettingsRowId(null);
      await saveEmailSettings(local);
      return local;
    }
    /* Newest row wins; older ones are leftovers from concurrent first-saves. */
    const newest = rows
      .slice()
      .sort((a, b) => Number(a?.id ?? a?._id ?? 0) - Number(b?.id ?? b?._id ?? 0))
      .pop();
    const merged = { ...defaultSettings(), ...newest.payload };
    setSettingsRowId(newest?.id ?? newest?._id ?? null);
    cacheSettings(merged);
    return merged;
  } catch {
    return loadEmailSettings();
  }
}

/** Write settings to the server (PUT the known row, else POST a new one) and
    refresh the cache. Resolves to the saved settings; `ok` says whether the
    server actually took it. */
export async function saveEmailSettings(s) {
  const payload = { ...defaultSettings(), ...s };
  cacheSettings(payload);                       // cache first so the UI stays live
  let rowId = getSettingsRowId();
  try {
    if (!rowId) {
      /* A browser that has never synced doesn't know the row id. Look it up
         before posting, otherwise every fresh machine adds a duplicate row. */
      const recs = await listReportsByType(SETTINGS_TYPE);
      const existing = (Array.isArray(recs) ? recs : [])
        .filter((r) => r?.payload)
        .sort((a, b) => Number(a?.id ?? a?._id ?? 0) - Number(b?.id ?? b?._id ?? 0))
        .pop();
      rowId = existing?.id ?? existing?._id ?? null;
      if (rowId) setSettingsRowId(rowId);
    }
    if (rowId) {
      const r = await fetch(`${REPORTS_URL}/${encodeURIComponent(rowId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: SETTINGS_TYPE, payload }),
      });
      /* Row was deleted server-side — fall through to creating a fresh one. */
      if (r.status === 404) setSettingsRowId(null);
      else if (r.ok) return { settings: payload, ok: true };
    }
    const res = await postMeta(SETTINGS_TYPE, payload);
    const newId = res?.report?.id ?? res?.report?._id ?? res?.id ?? res?._id ?? null;
    if (newId) setSettingsRowId(newId);
    return { settings: payload, ok: Boolean(newId) };
  } catch {
    return { settings: payload, ok: false };    // cached; retried on the next save
  }
}

/** Reset to defaults — on the server too, so it resets for everyone. */
export async function resetEmailSettings() {
  const def = defaultSettings();
  await saveEmailSettings(def);
  return def;
}

/* ===== Saved Email Contacts (server + local fallback) =====
   Contact shape:  { email, name, groups[], serverId }
   Backward compat: legacy strings (just emails) are auto-upgraded to objects
   with empty `name`. New writes always store the object form.
   `serverId` is the /api/reports row id — edits PUT that row instead of piling
   up a new row per save (old behaviour made group removal impossible, because
   the merge unioned the groups of every stale row back in). */

function normalizeContact(c, serverId = null) {
  if (!c) return null;
  if (typeof c === "string") {
    const e = c.trim();
    return e ? { email: e, name: "", groups: [], serverId } : null;
  }
  if (typeof c === "object") {
    const e = String(c.email || "").trim();
    if (!e) return null;
    const groups = Array.isArray(c.groups) ? c.groups.map((g) => String(g || "").trim()).filter(Boolean) : [];
    return { email: e, name: String(c.name || "").trim(), groups, serverId: serverId ?? c.serverId ?? null };
  }
  return null;
}

/** Case-insensitive dedupe of an email list, first occurrence wins. */
function dedupeCI(arr) {
  const seen = new Set();
  const out = [];
  for (const e of arr || []) {
    const k = String(e || "").trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
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

/** Dedupe by email (case-insensitive). The FIRST entry for an email wins its
    groups outright — no union — so removing a group actually removes it.
    Missing fields (a name, a serverId) are still back-filled from later copies. */
const dedupeContacts = (arr) => {
  const map = new Map();
  for (const c of arr) {
    const n = normalizeContact(c);
    if (!n) continue;
    const k = n.email.toLowerCase();
    const prev = map.get(k);
    if (!prev) { map.set(k, n); continue; }
    map.set(k, {
      email:    prev.email,
      name:     prev.name || n.name,
      groups:   prev.groups,
      serverId: prev.serverId ?? n.serverId ?? null,
    });
  }
  return Array.from(map.values()).sort((a, b) => {
    const an = (a.name || a.email).toLowerCase();
    const bn = (b.name || b.email).toLowerCase();
    return an.localeCompare(bn);
  });
};

/** Fetch saved contacts (server first, local cache as fallback/offline extras).
    Always resolves. Returns array of {email, name, groups, serverId}. */
export async function listEmailContacts() {
  try {
    const recs = await listReportsByType(CONTACT_TYPE);
    /* Newest row per email wins — older rows are leftovers from the days when
       every edit POSTed a fresh record. */
    const serverContacts = (Array.isArray(recs) ? recs : [])
      .map((r) => normalizeContact(r?.payload, r?.id ?? r?._id ?? null))
      .filter(Boolean)
      .sort((a, b) => Number(a.serverId || 0) - Number(b.serverId || 0))
      .reverse();
    const merged = dedupeContacts([...serverContacts, ...getLocalContacts()]);
    setLocalContacts(merged);
    return merged;
  } catch {
    return dedupeContacts(getLocalContacts());
  }
}

/** Write one contact to the server: PUT its own row when we know it, else POST
    a new row and remember the id. Returns the serverId (or null when offline). */
async function pushContact(contact) {
  const payload = { email: contact.email, name: contact.name, groups: contact.groups || [] };
  try {
    if (contact.serverId) {
      await fetch(`${REPORTS_URL}/${encodeURIComponent(contact.serverId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: CONTACT_TYPE, payload }),
      });
      return contact.serverId;
    }
    const res = await postMeta(CONTACT_TYPE, payload);
    return res?.report?.id ?? res?.report?._id ?? res?.id ?? res?._id ?? null;
  } catch {
    return contact.serverId ?? null; // offline — local copy re-syncs on next save
  }
}

/** Persist one contact locally (creating or replacing it) and on the server. */
async function upsertContact(contact) {
  const withId = { ...contact, serverId: await pushContact(contact) };
  const next = getLocalContacts().map((x) =>
    x.email.toLowerCase() === withId.email.toLowerCase() ? withId : x
  );
  if (!next.some((x) => x.email.toLowerCase() === withId.email.toLowerCase())) next.push(withId);
  setLocalContacts(dedupeContacts(next));
  return withId;
}

/** Add a contact: validate, save. Accepts (email), (email, name), or (email, name, groups[]).
    Returns the cleaned {email, name, groups} object. */
export async function addEmailContact(email, name = "", groups = []) {
  const e = String(email || "").trim();
  if (!EMAIL_RE_LOCAL.test(e)) throw new Error("صيغة الإيميل غير صحيحة");
  const n = String(name || "").trim();
  const g = Array.isArray(groups) ? groups.map((x) => String(x || "").trim()).filter(Boolean) : [];

  const found = getLocalContacts().find((x) => x.email.toLowerCase() === e.toLowerCase());
  if (found) {
    /* Existing contact: keep the old name unless a new one was typed, add the
       new group tags to the ones it already carries. */
    return upsertContact({
      ...found,
      name:   n || found.name,
      groups: Array.from(new Set([...(found.groups || []), ...g])),
    });
  }
  return upsertContact({ email: e, name: n, groups: g, serverId: null });
}

/** Update an existing contact's groups (overwrites the groups list). */
export async function updateContactGroups(email, groups) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return;
  const g = Array.isArray(groups) ? groups.map((x) => String(x || "").trim()).filter(Boolean) : [];
  const found = getLocalContacts().find((x) => x.email.toLowerCase() === e);
  if (!found) return;
  await upsertContact({ ...found, groups: g });
}

/** Rename / retitle a contact (display name only — the email is the key). */
export async function updateContactName(email, name) {
  const e = String(email || "").trim().toLowerCase();
  const found = getLocalContacts().find((x) => x.email.toLowerCase() === e);
  if (!found) return;
  await upsertContact({ ...found, name: String(name || "").trim() });
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

/** Rename a group across every contact that carries it. */
export async function renameGroup(oldName, newName) {
  const from = String(oldName || "").trim().toLowerCase();
  const to = String(newName || "").trim();
  if (!from || !to) return;
  const affected = getLocalContacts().filter((c) =>
    (c.groups || []).some((g) => String(g).trim().toLowerCase() === from)
  );
  for (const c of affected) {
    const next = Array.from(new Set(
      (c.groups || []).map((g) => (String(g).trim().toLowerCase() === from ? to : g))
    ));
    await updateContactGroups(c.email, next);
  }
}

/** Remove a group entirely — contacts stay, they just lose the tag. */
export async function deleteGroup(name) {
  const g0 = String(name || "").trim().toLowerCase();
  if (!g0) return;
  const affected = getLocalContacts().filter((c) =>
    (c.groups || []).some((g) => String(g).trim().toLowerCase() === g0)
  );
  for (const c of affected) {
    await updateContactGroups(
      c.email,
      (c.groups || []).filter((g) => String(g).trim().toLowerCase() !== g0)
    );
  }
}

/** After a send: make sure every address used is a saved contact on the server.
    Replaces the old browser-only "recent recipients" list — same convenience,
    but shared with the team and searchable in the picker. Never throws. */
export async function rememberRecipients(emails) {
  const known = new Set(getLocalContacts().map((c) => c.email.toLowerCase()));
  const fresh = dedupeCI(emails).filter(
    (e) => EMAIL_RE_LOCAL.test(String(e).trim()) && !known.has(String(e).trim().toLowerCase())
  );
  for (const e of fresh) {
    try { await addEmailContact(e); } catch { /* best-effort, never blocks a send */ }
  }
  return fresh;
}

/** Remove from local cache by email. */
export function removeLocalContact(email) {
  const e = String(email || "").trim().toLowerCase();
  setLocalContacts(getLocalContacts().filter((x) => x.email.toLowerCase() !== e));
}

/** Delete a contact everywhere. Local-only removal used to be pointless: the
    next server merge brought the contact straight back. This wipes every server
    row carrying that address (there can be leftovers from older saves). */
export async function deleteEmailContact(email) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return;
  removeLocalContact(e);
  try {
    const recs = await listReportsByType(CONTACT_TYPE);
    const rows = (Array.isArray(recs) ? recs : []).filter(
      (r) => String(r?.payload?.email || "").trim().toLowerCase() === e
    );
    for (const r of rows) {
      const id = r?.id ?? r?._id;
      if (!id) continue;
      await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
    }
  } catch {
    /* Offline — the row stays server-side and reappears on the next merge. */
  }
}

/* ===== Template variables =====
   Placeholders usable in a template's subject / intro / note. They stay
   unresolved in storage (so a saved template keeps working every day) and are
   filled in only when the send modal opens against a specific report. */

export const TEMPLATE_VARS = [
  { key: "{date}",    label: { en: "Report date",  ar: "تاريخ التقرير" } },
  { key: "{today}",   label: { en: "Today's date", ar: "تاريخ اليوم" } },
  { key: "{report}",  label: { en: "Report name",  ar: "اسم التقرير" } },
  { key: "{count}",   label: { en: "Items count",  ar: "عدد الأصناف" } },
  { key: "{user}",    label: { en: "Your name",    ar: "اسمك" } },
  { key: "{company}", label: { en: "Company",      ar: "الشركة" } },
];

/** `2026-06-28` → `28/06/2026`. Anything else is passed through untouched. */
export function toDMY(d) {
  const s = String(d || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join("/") : s;
}

/** Build the values every placeholder resolves to for one specific send. */
export function buildTemplateVars({ reportDate, reportTitle, itemsCount, settings } = {}) {
  let user = "";
  try { user = JSON.parse(localStorage.getItem("currentUser") || "{}").username || ""; } catch {}
  const s = settings || loadEmailSettings();
  return {
    "{date}":    toDMY(reportDate) || toDMY(new Date().toISOString().slice(0, 10)),
    "{today}":   toDMY(new Date().toISOString().slice(0, 10)),
    "{report}":  reportTitle || "",
    "{count}":   itemsCount == null ? "" : String(itemsCount),
    "{user}":    s.signatureName || user || "",
    "{company}": s.signatureCompany || "",
  };
}

/** Replace every {placeholder} in `text` with its value. */
export function applyTemplateVars(text, vars) {
  let out = String(text ?? "");
  for (const [k, v] of Object.entries(vars || {})) out = out.split(k).join(v);
  return out;
}

/* ===== Email Templates — quick-action presets ===== */

/* Template shape:
   {
     id: string,           // unique
     name: string,         // shown on the button
     icon: string,         // emoji
     subject: string,      // overrides modal subject when applied
     intro: string,        // greeting/opening lines above the report table
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

/* Note: there is deliberately no local-only `saveTemplate` — `normalizeTemplate`
   below is the single definition of a template's shape, and `saveTemplateRemote`
   is the only writer. A second copy of the shape drifted out of sync every time
   a field was added. */

export function deleteTemplate(id) {
  saveTemplates(loadTemplates().filter((t) => t.id !== id));
}

/* ===== Templates — server sync =====
   Stored as generic meta records (type `qcs_email_template`) on /api/reports,
   the same mechanism contacts use. `serverId` is the DB row id so edits can
   PUT in place instead of piling up duplicate rows. localStorage stays as an
   offline cache + fallback when the server is unreachable. */

/** Normalise whatever came back from the server/cache into a template. */
function normalizeTemplate(t, serverId = null) {
  if (!t || typeof t !== "object") return null;
  const name = String(t.name || "").trim();
  const id = String(t.id || "").trim();
  if (!id && !name) return null;
  const strArr = (v) =>
    Array.isArray(v) ? v.map((x) => String(x || "").trim()).filter(Boolean) : [];
  return {
    id:             id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    serverId:       serverId ?? t.serverId ?? null,
    name:           name || "Untitled",
    icon:           String(t.icon || "📧"),
    subject:        String(t.subject || ""),
    intro:          String(t.intro || ""),
    note:           String(t.note || ""),
    toGroups:       strArr(t.toGroups),
    ccGroups:       strArr(t.ccGroups),
    toEmails:       strArr(t.toEmails),
    ccEmails:       strArr(t.ccEmails),
    priority:       PRIORITY_VALUES.includes(t.priority) ? t.priority : "normal",
    classification: t.classification || "internal",
    includeTable:   !!t.includeTable,
    sortBy:         String(t.sortBy || "default"),
    groupBy:        String(t.groupBy || "none"),
  };
}

/** Server wins on conflict — it's the shared copy everyone sees. */
function dedupeTemplates(arr) {
  const map = new Map();
  for (const raw of arr) {
    const t = normalizeTemplate(raw);
    if (!t) continue;
    const prev = map.get(t.id);
    /* Keep whichever side carries a serverId, so a locally-cached copy never
       masks the shared record (and never loses the id needed to PUT). */
    if (!prev || (!prev.serverId && t.serverId)) map.set(t.id, t);
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Fetch templates (server merged with local cache). Always resolves. */
export async function listEmailTemplates() {
  try {
    const recs = await listReportsByType(TEMPLATE_TYPE);
    const fromServer = (Array.isArray(recs) ? recs : [])
      /* rec.id on Postgres, rec._id on the legacy Mongo shape. */
      .map((r) => normalizeTemplate(r?.payload, r?.id ?? r?._id ?? null))
      .filter(Boolean);
    const merged = dedupeTemplates([...fromServer, ...loadTemplates()]);
    saveTemplates(merged);
    return merged;
  } catch {
    return dedupeTemplates(loadTemplates());
  }
}

/** Create or update a template, locally and on the server. */
export async function saveTemplateRemote(t) {
  const safe = normalizeTemplate(t);
  if (!safe) throw new Error("قالب غير صالح");

  /* Local first so the UI stays responsive even if the server is down. */
  const all = loadTemplates();
  const idx = all.findIndex((x) => x.id === safe.id);
  if (idx >= 0) all[idx] = safe; else all.push(safe);
  saveTemplates(dedupeTemplates(all));

  const { serverId, ...payload } = safe;
  try {
    if (serverId) {
      await fetch(`${REPORTS_URL}/${encodeURIComponent(serverId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ type: TEMPLATE_TYPE, payload }),
      });
    } else {
      const res = await postMeta(TEMPLATE_TYPE, payload);
      /* POST /api/reports answers { ok, report: {...} } — the id lives on
         `report`. Missing it would re-POST on every edit and pile up rows. */
      const newId = res?.report?.id ?? res?.report?._id ?? res?.id ?? res?._id ?? null;
      if (newId) {
        safe.serverId = newId;
        const list = loadTemplates().map((x) => (x.id === safe.id ? safe : x));
        saveTemplates(list);
      }
    }
  } catch {
    /* Kept locally; re-syncs on the next save. */
  }
  return safe;
}

/** Delete a template locally and on the server. */
export async function deleteTemplateRemote(id) {
  const found = loadTemplates().find((t) => t.id === id);
  deleteTemplate(id);
  if (found?.serverId) {
    try {
      await fetch(`${REPORTS_URL}/${encodeURIComponent(found.serverId)}`, { method: "DELETE" });
    } catch {
      /* Row stays server-side; it would reappear on the next merge. */
    }
  }
}

/** Expand a template's groups + explicit emails to a final list of emails.
    Anyone already in To is dropped from CC — same rule the editor previews. */
export function expandTemplateRecipients(template, contacts) {
  const t = template || {};
  const fromGroups = (groups) => (groups || []).flatMap((g) => expandGroup(g, contacts));
  const to = dedupeCI([...fromGroups(t.toGroups), ...(t.toEmails || [])]);
  const toSet = new Set(to.map((e) => String(e).toLowerCase()));
  const cc = dedupeCI([...fromGroups(t.ccGroups), ...(t.ccEmails || [])])
    .filter((e) => !toSet.has(String(e).toLowerCase()));
  return { to, cc };
}

/* ===== Auto-routing helpers ===== */

/** Get the auto-routing config for a given report type, or null.
    A route can point at a saved template (`templateId`) and/or list extra
    groups/addresses of its own. */
export function getAutoRoute(reportType, settings) {
  if (!reportType) return null;
  const cfg = settings?.autoRouting?.[reportType];
  if (!cfg) return null;
  const arr = (v) => (Array.isArray(v) ? v : []);
  const route = {
    templateId: cfg.templateId ? String(cfg.templateId) : "",
    toGroups: arr(cfg.toGroups),
    ccGroups: arr(cfg.ccGroups),
    toEmails: arr(cfg.toEmails),
    ccEmails: arr(cfg.ccEmails),
  };
  const empty =
    !route.templateId && !route.toGroups.length && !route.ccGroups.length &&
    !route.toEmails.length && !route.ccEmails.length;
  return empty ? null : route;
}

/** Resolve an auto-route into what the send modal should actually apply:
    the template it points at (if any) plus its own extra groups/addresses. */
export function resolveAutoRoute(route, contacts, templates = []) {
  if (!route) return null;
  const template = route.templateId
    ? (templates || []).find((t) => t.id === route.templateId) || null
    : null;
  const own = expandTemplateRecipients(route, contacts);
  const fromTpl = template ? expandTemplateRecipients(template, contacts) : { to: [], cc: [] };
  const to = dedupeCI([...fromTpl.to, ...own.to]);
  const toSet = new Set(to.map((e) => String(e).toLowerCase()));
  const cc = dedupeCI([...fromTpl.cc, ...own.cc]).filter((e) => !toSet.has(String(e).toLowerCase()));
  return { to, cc, template };
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
