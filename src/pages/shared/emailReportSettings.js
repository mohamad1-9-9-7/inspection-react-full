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

/* ===== Saved Email Contacts (server + local fallback) ===== */

function getLocalContacts() {
  try {
    const raw = localStorage.getItem(CONTACTS_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function setLocalContacts(arr) {
  try { localStorage.setItem(CONTACTS_LS_KEY, JSON.stringify(arr)); } catch {}
}

const dedupeCI = (arr) => {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const v = String(x || "").trim();
    const k = v.toLowerCase();
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out.sort((a, b) => a.localeCompare(b));
};

/** Fetch saved contacts (server merged with local cache). Always resolves. */
export async function listEmailContacts() {
  try {
    const recs = await listReportsByType(CONTACT_TYPE);
    const serverEmails = (Array.isArray(recs) ? recs : [])
      .map((r) => r?.payload?.email)
      .filter(Boolean);
    const merged = dedupeCI([...serverEmails, ...getLocalContacts()]);
    setLocalContacts(merged);
    return merged;
  } catch {
    return dedupeCI(getLocalContacts());
  }
}

/** Add a contact: validate, save to server (with local fallback). Returns the cleaned email. */
export async function addEmailContact(email) {
  const e = String(email || "").trim();
  if (!EMAIL_RE_LOCAL.test(e)) throw new Error("صيغة الإيميل غير صحيحة");

  const existing = getLocalContacts();
  if (existing.some((x) => x.toLowerCase() === e.toLowerCase())) {
    return e; // already saved
  }
  // Optimistic local save first
  setLocalContacts(dedupeCI([...existing, e]));
  try {
    await postMeta(CONTACT_TYPE, { email: e });
  } catch {
    // server unreachable — kept locally, will re-sync on next listEmailContacts
  }
  return e;
}

/** Remove from local cache (server records are append-only meta; we just hide locally). */
export function removeLocalContact(email) {
  const e = String(email || "").trim().toLowerCase();
  setLocalContacts(getLocalContacts().filter((x) => x.toLowerCase() !== e));
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
