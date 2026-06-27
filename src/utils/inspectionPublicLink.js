const TOKEN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

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

export function extractInspectionEvidenceToken(url) {
  const match = String(url || "").match(/\/inspection\/evidence\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export function buildInspectionEvidencePublic(publicInfo = {}) {
  const existingToken = String(publicInfo?.token || "").trim() || extractInspectionEvidenceToken(publicInfo?.url);
  const token = existingToken || makeInspectionEvidenceToken();
  return {
    ...(publicInfo && typeof publicInfo === "object" ? publicInfo : {}),
    mode: "INSPECTION_CLOSED_EVIDENCE_ONLY",
    token,
    url: `${getInspectionPublicOrigin()}/inspection/evidence/${encodeURIComponent(token)}`,
    createdAt: publicInfo?.createdAt || new Date().toISOString(),
    submittedAt: publicInfo?.submittedAt || null,
    status: publicInfo?.status || "pending_evidence",
  };
}
