import { getPublicOrigin, isShareableOrigin } from "../config/publicOrigin";

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

/* Links always point at the public site — getPublicOrigin() falls back to
   production when QA works from localhost/LAN (see config/publicOrigin.js). */
export function getInspectionPublicOrigin() {
  return getPublicOrigin();
}

/* Callers use this to warn (or block) before copying / e-mailing a URL that
   a branch outside this machine could not open. */
export function isShareablePublicOrigin(origin = getInspectionPublicOrigin()) {
  return isShareableOrigin(origin);
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

  /* Always rebuild the URL from the token. A stored URL can sit on a dead
     domain (the site was renamed on 1 Oct 2026 and Netlify does not
     redirect) or on localhost; the token is what the server checks, so
     re-homing the URL keeps every link already sent working. */
  const url = `${getInspectionPublicOrigin()}/inspection/evidence/${encodeURIComponent(token)}`;

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
