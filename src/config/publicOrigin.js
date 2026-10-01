// ✅ Single source of truth for links that leave this app (branch evidence
// links, supplier questionnaires, training quizzes, QR codes…).
//
// A link is read on somebody else's phone, so it must point at the PUBLIC
// site even when QA happens to be working from `npm start` on localhost or
// from a LAN address. Resolution order (first defined wins):
//   window.__QCS_PUBLIC_ORIGIN__  →  process.env.REACT_APP_PUBLIC_ORIGIN  →
//   window.location.origin (only when it is reachable from outside)  →
//   PRODUCTION_PUBLIC_ORIGIN
export const PRODUCTION_PUBLIC_ORIGIN = "https://inspectpro-ae.netlify.app";

// Netlify does not redirect a renamed site, so every URL minted on these
// origins is a 404 now. fixPublicUrl() rewrites them onto the live origin.
export const LEGACY_PUBLIC_ORIGINS = ["https://transemirateslivestock.netlify.app"];

const trim = (s) => String(s || "").trim().replace(/\/$/, "");

/* localhost / LAN origins only work on this machine or inside the office. */
export function isShareableOrigin(origin) {
  const o = trim(origin).toLowerCase();
  if (!/^https?:\/\//.test(o)) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:\d+)?$/.test(o)) return false;
  if (/^https?:\/\/[^/]*\.localhost(:\d+)?$/.test(o)) return false;
  if (/^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(o)) return false;
  if (LEGACY_PUBLIC_ORIGINS.some((l) => l.toLowerCase() === o)) return false;
  return true;
}

export function getPublicOrigin() {
  const override = trim(
    (typeof window !== "undefined" && window.__QCS_PUBLIC_ORIGIN__) ||
      (typeof process !== "undefined" && process.env && process.env.REACT_APP_PUBLIC_ORIGIN)
  );
  if (override) return override;
  const here = typeof window !== "undefined" && window.location ? trim(window.location.origin) : "";
  return isShareableOrigin(here) ? here : PRODUCTION_PUBLIC_ORIGIN;
}

/** Absolute public URL for an app path ("/supplier-approval/t/abc"). */
export function buildPublicUrl(pathname = "") {
  const origin = getPublicOrigin();
  const p = String(pathname || "");
  if (!p) return origin;
  return `${origin}${p.startsWith("/") ? "" : "/"}${p}`;
}

/**
 * Re-home a URL that was stored earlier: dead legacy domains and
 * localhost/LAN origins are swapped for the current public origin, the path
 * and token are kept. Anything else (a real public URL, an external site) is
 * returned untouched.
 */
export function fixPublicUrl(url) {
  const s = String(url || "").trim();
  if (!s) return s;
  let u;
  try { u = new URL(s); } catch { return s; }
  if (isShareableOrigin(u.origin)) return s;
  return `${getPublicOrigin()}${u.pathname}${u.search}${u.hash}`;
}
