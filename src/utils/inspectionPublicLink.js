const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/* Default lifetime of a branch evidence link. Long enough for a slow branch,
   short enough that a leaked URL stops working. Override per-link by passing
   `days` to buildInspectionEvidencePublic. */
export const DEFAULT_EVIDENCE_LINK_DAYS = 45;

function randomPart(len = 40) {
  const bytes = new Uint8Array(len);
  const cryptoApi = getCryptoApi();
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else for (let i = 0; i < len; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  let out = "";
  for (let i = 0; i < len; i += 1) out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  return out;
}

function getCryptoApi() {
  return typeof window !== "undefined" && window.crypto ? window.crypto : null;
}

export function makeInspectionEvidenceToken() {
  const cryptoApi = getCryptoApi();
  const timePart = Date.now().toString(36);
  const uuidPart = cryptoApi?.randomUUID ? cryptoApi.randomUUID().replace(/-/g, "") : randomPart(24);
  return `iev_${timePart}_${uuidPart}_${randomPart(18)}`;
}

export function getInspectionPublicOrigin() {
  return String(
    (typeof window !== "undefined" && window.__QCS_PUBLIC_ORIGIN__) ||
      (typeof import.meta !== "undefined" && import.meta.env?.VITE_PUBLIC_ORIGIN) ||
      (typeof process !== "undefined" && process.env?.REACT_APP_PUBLIC_ORIGIN) ||
      (typeof window !== "undefined" && window.location ? window.location.origin : "")
  ).replace(/\/$/, "");
}

/* A link built from a dev origin is useless the moment it leaves this machine —
   the branch would get http://localhost:3000/... in their inbox. Callers use
   this to warn (or block) before copying / e-mailing the URL. */
export function isShareablePublicOrigin(origin = getInspectionPublicOrigin()) {
  const o = String(origin || "").toLowerCase();
  if (!o) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/.test(o)) return false;
  /* LAN addresses are reachable inside the office but not from a phone on 4G. */
  if (/^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(o)) return false;
  return true;
}

/* Same test applied to a URL that already exists — a link minted earlier from
   the production site stays valid even while you browse from localhost. */
export function isShareableEvidenceUrl(url) {
  try {
    return isShareablePublicOrigin(new URL(String(url || "")).origin);
  } catch {
    return false;
  }
}

export function extractInspectionEvidenceToken(url) {
  const match = String(url || "").match(/\/inspection\/evidence\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function isInspectionEvidenceToken(token) {
  return /^iev_/i.test(String(token || "").trim());
}

/* Expiry / revocation state of an existing payload.public block. */
export function getEvidenceLinkState(publicInfo = {}) {
  const revokedAt = publicInfo?.revokedAt || null;
  const expiresAt = publicInfo?.expiresAt || null;
  const expiredMs = expiresAt ? Date.parse(expiresAt) : NaN;
  const expired = Number.isFinite(expiredMs) && expiredMs < Date.now();
  const daysLeft = Number.isFinite(expiredMs)
    ? Math.ceil((expiredMs - Date.now()) / 86400000)
    : null;
  return {
    revoked: Boolean(revokedAt),
    expired,
    active: Boolean(publicInfo?.token) && !revokedAt && !expired,
    expiresAt,
    revokedAt,
    daysLeft,
  };
}

/**
 * Build (or refresh) the payload.public block for a branch evidence link.
 *
 * Reuses an existing token so a link already sent to a branch keeps working.
 * `renew: true` pushes the expiry forward without changing the token;
 * `rotate: true` mints a brand-new token, which invalidates the old URL.
 */
export function buildInspectionEvidencePublic(publicInfo = {}, opts = {}) {
  const { days = DEFAULT_EVIDENCE_LINK_DAYS, renew = false, rotate = false } = opts;
  const existingToken = String(publicInfo?.token || "").trim() || extractInspectionEvidenceToken(publicInfo?.url);
  const token = rotate || !existingToken ? makeInspectionEvidenceToken() : existingToken;
  const isNew = token !== existingToken;

  const keepExpiry = !isNew && !renew && publicInfo?.expiresAt;
  const expiresAt = keepExpiry
    ? publicInfo.expiresAt
    : new Date(Date.now() + Math.max(1, Number(days) || DEFAULT_EVIDENCE_LINK_DAYS) * 86400000).toISOString();

  /* Never let a dev/LAN origin overwrite a URL that was already minted from
     the real public site — that would quietly turn a working link into
     http://localhost:3000/... for everyone who reads the report later. */
  const origin = getInspectionPublicOrigin();
  const previousUrl = String(publicInfo?.url || "");
  const url =
    !isNew && previousUrl && !isShareablePublicOrigin(origin)
      ? previousUrl
      : `${origin}/inspection/evidence/${encodeURIComponent(token)}`;

  return {
    ...(publicInfo && typeof publicInfo === "object" ? publicInfo : {}),
    mode: "INSPECTION_CLOSED_EVIDENCE_ONLY",
    token,
    url,
    createdAt: isNew ? new Date().toISOString() : publicInfo?.createdAt || new Date().toISOString(),
    expiresAt,
    /* Renewing or rotating un-revokes — that is the point of the action. */
    revokedAt: isNew || renew ? null : publicInfo?.revokedAt || null,
    submittedAt: isNew ? null : publicInfo?.submittedAt || null,
    status: isNew ? "pending_evidence" : publicInfo?.status || "pending_evidence",
  };
}

/** Mark an existing link dead without touching anything else. */
export function revokeInspectionEvidencePublic(publicInfo = {}) {
  return {
    ...(publicInfo && typeof publicInfo === "object" ? publicInfo : {}),
    revokedAt: new Date().toISOString(),
  };
}
