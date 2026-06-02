// emailReportSettings.js
// Centralised persisted settings for the Email Send feature.
// One JSON in localStorage — read with `loadEmailSettings`, write with `saveEmailSettings`.

import { postMeta, listReportsByType } from "../monitor/branches/shipment_recc/qcsRawApi";

const STORAGE_KEY = "qcs_email_settings_v1";
const RECIPIENT_HISTORY_KEY = "qcs_email_recipient_history_v1";
const CONTACTS_LS_KEY = "qcs_email_contacts_v1";
const CONTACT_TYPE = "qcs_email_contact";
const MAX_HISTORY = 30;

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
    confidentialityNote: false,     // adds "Internal Use Only" banner
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
    return e ? { email: e, name: "" } : null;
  }
  if (typeof c === "object") {
    const e = String(c.email || "").trim();
    if (!e) return null;
    return { email: e, name: String(c.name || "").trim() };
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

/** Dedupe by email (case-insensitive); when duplicates exist, prefer the one
    that has a non-empty name (later wins so server overrides local). */
const dedupeContacts = (arr) => {
  const map = new Map();
  for (const c of arr) {
    const n = normalizeContact(c);
    if (!n) continue;
    const k = n.email.toLowerCase();
    const prev = map.get(k);
    if (!prev) { map.set(k, n); continue; }
    // merge: keep whichever has a name
    map.set(k, { email: n.email, name: n.name || prev.name });
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

/** Add a contact: validate, save. Accepts (email) or (email, name) — second arg optional.
    Returns the cleaned {email, name} object. */
export async function addEmailContact(email, name = "") {
  const e = String(email || "").trim();
  if (!EMAIL_RE_LOCAL.test(e)) throw new Error("صيغة الإيميل غير صحيحة");
  const n = String(name || "").trim();

  const existing = getLocalContacts();
  const found = existing.find((x) => x.email.toLowerCase() === e.toLowerCase());
  if (found) {
    // Already exists — update name if a new non-empty one is supplied
    if (n && n !== found.name) {
      const next = existing.map((x) =>
        x.email.toLowerCase() === e.toLowerCase() ? { email: x.email, name: n } : x
      );
      setLocalContacts(dedupeContacts(next));
      try { await postMeta(CONTACT_TYPE, { email: e, name: n }); } catch {}
      return { email: e, name: n };
    }
    return found;
  }
  // New: optimistic local save first
  const newContact = { email: e, name: n };
  setLocalContacts(dedupeContacts([...existing, newContact]));
  try {
    await postMeta(CONTACT_TYPE, { email: e, name: n });
  } catch {
    // server unreachable — kept locally, will re-sync on next listEmailContacts
  }
  return newContact;
}

/** Remove from local cache by email. */
export function removeLocalContact(email) {
  const e = String(email || "").trim().toLowerCase();
  setLocalContacts(getLocalContacts().filter((x) => x.email.toLowerCase() !== e));
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
