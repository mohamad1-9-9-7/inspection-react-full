// Patches the global fetch ONCE so every existing `fetch(`${API_BASE}/...`)`
// call site in the app (250+ files) automatically sends the session token —
// without having to touch each call site individually.
import { API_BASE, IMAGE_API_BASE } from "../config/api";
import { windowRuleForType, canSeeFullHistory, filterRowsByWindow } from "./reportWindow";

const ORIGINAL_FETCH = window.fetch.bind(window);
const API_ORIGINS = [API_BASE, IMAGE_API_BASE].filter(Boolean);

// Dozens of report views cache their data in localStorage/sessionStorage
// (offline resilience, "recent reports" lists, etc.) under fixed keys that
// aren't scoped per user/company. If we only removed currentUser+authToken
// on logout, the next login on the same browser — a different account, or a
// different company entirely — would still see that stale cached data. So
// logout/session-expiry must wipe everything except pure UI prefs.
const PRESERVE_KEYS = ["settings_lang"];

export function clearAppSession() {
  try {
    const preserved = {};
    PRESERVE_KEYS.forEach((k) => {
      const v = localStorage.getItem(k);
      if (v !== null) preserved[k] = v;
    });
    localStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));
  } catch { /* ignore */ }
  try { sessionStorage.clear(); } catch { /* ignore */ }
}

function targetsApi(url) {
  return API_ORIGINS.some((base) => url.startsWith(base));
}

/* ------------------------------------------------------------------
   429 resilience for /api/reports reads
   ------------------------------------------------------------------
   The server caps report reads at 120/min per IP. Report views fetch
   `/api/reports?type=…` directly in ~250 files, and a dashboard that
   mounts many types fires them all in one burst — enough to trip the
   limiter, which surfaced as red 429s and blank screens with no
   recovery.

   Fixing it here (the one place every API fetch already funnels
   through) covers all 250 call sites without editing any of them:

   1. Throttle — never let more than MAX_INFLIGHT report reads run at
      once, so a burst is spread out instead of hammering the limiter.
   2. Retry — when a 429 still comes back, honour the server's
      `Retry-After` (capped) and try again a few times, so a transient
      rate-limit heals itself instead of failing the screen.

   Scoped to GET/HEAD on /api/reports only: writes must never be blindly
   retried (double-post risk), and non-report calls are left untouched. */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MAX_INFLIGHT = 4;
let _inflight = 0;
const _waiters = [];
function _acquire() {
  if (_inflight < MAX_INFLIGHT) { _inflight += 1; return Promise.resolve(); }
  return new Promise((resolve) => _waiters.push(resolve));
}
function _release() {
  _inflight -= 1;
  const next = _waiters.shift();
  if (next) { _inflight += 1; next(); }
}

function isReportRead(url, method) {
  const m = String(method || "GET").toUpperCase();
  return (m === "GET" || m === "HEAD") && /\/api\/reports(\?|\/|$)/.test(url);
}

/* The server defaults report reads to LIMIT 200 (max 5000). ~250 views fetch
   `/api/reports?type=X` with no `limit`, so every type with more than 200
   records silently lost the rest — a Date Tree that showed 200 of 314, reports
   that "disappeared". Rather than edit 250 call sites, raise the default here:
   if a report read names a `type` but no `limit`, request the full 5000. An
   explicit `limit` from the caller is always respected; `?dates=1` / `:id` /
   `reportDate=` ignore the param, so adding it there is harmless. */
function withFullLimit(url) {
  if (typeof url !== "string") return url;
  if (!/\/api\/reports(\?|$)/.test(url.split("#")[0])) return url; // collection only
  if (/[?&]limit=/.test(url)) return url;                          // caller set one
  if (!/[?&]type=/.test(url)) return url;                          // not a list read
  return url + (url.includes("?") ? "&" : "?") + "limit=5000";
}

/* ------------------------------------------------------------------
   Report visibility window (see utils/reportWindow.js)
   ------------------------------------------------------------------
   Non-admin accounts only see recent reports: POS 10/11/15/19 for the
   last 30 days, returns reports for the last 2 months. Because every
   `/api/reports?type=…` list read funnels through this wrapper, trimming
   the response here hides older rows from the Date Tree, search, exports
   and everything else at once — without touching any of the ~250 views.
   Accounts with the section's "history" op (and all admins) are exempt,
   so their reads are returned untouched with no parsing overhead. */
function reportTypeParam(url) {
  const q = String(url).split("?")[1];
  if (!q) return "";
  const p = new URLSearchParams(q);
  return p.get("type") || p.get("reportType") || "";
}

async function applyReportWindow(url, res) {
  try {
    const type = reportTypeParam(url);
    if (!type) return res;
    const rule = windowRuleForType(type);
    if (!rule || canSeeFullHistory(rule.section)) return res;
    if (!res.ok) return res;
    if (!/json/i.test(res.headers.get("content-type") || "")) return res;

    // Read a clone so the original body stays intact if anything goes wrong.
    const data = await res.clone().json().catch(() => null);
    if (data == null) return res;

    let filtered;
    if (Array.isArray(data)) filtered = filterRowsByWindow(type, data);
    else if (Array.isArray(data.data)) filtered = { ...data, data: filterRowsByWindow(type, data.data) };
    else if (Array.isArray(data.items)) filtered = { ...data, items: filterRowsByWindow(type, data.items) };
    else return res;

    const headers = new Headers(res.headers);
    headers.delete("content-length");
    return new Response(JSON.stringify(filtered), {
      status: res.status,
      statusText: res.statusText,
      headers,
    });
  } catch {
    return res;
  }
}

async function withRetry(send, { retries = 4, signal } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await send();
    if (res.status !== 429 || attempt >= retries || signal?.aborted) return res;
    const ra = Number(res.headers.get("Retry-After"));
    const backoff = Number.isFinite(ra) && ra > 0
      ? Math.min(ra * 1000, 8000)
      : Math.min(500 * 2 ** attempt, 8000) + Math.floor(Math.random() * 300);
    attempt += 1;
    await sleep(backoff);
  }
}

window.fetch = function authFetch(input, init = {}) {
  const url = typeof input === "string" ? input : input?.url || "";

  if (!targetsApi(url)) {
    return ORIGINAL_FETCH(input, init);
  }

  const method = init.method || (typeof input !== "string" ? input?.method : "") || "GET";

  // Raise the 200-row default to the full set for unbounded list reads.
  let reqInput = input;
  if (isReportRead(url, method) && typeof input === "string") {
    reqInput = withFullLimit(input);
  }

  const token = localStorage.getItem("authToken");
  let nextInit = init;
  if (token) {
    const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    nextInit = { ...init, headers };
  }

  const send = () => ORIGINAL_FETCH(reqInput, nextInit);

  const run = isReportRead(url, method)
    ? _acquire()
        .then(() => withRetry(send, { retries: 4, signal: nextInit.signal }))
        .finally(_release)
    : send();

  return run.then((res) => {
    const isLoginCall = url.includes("/api/auth/login");
    if (res.status === 401 && !isLoginCall) {
      clearAppSession();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
      return res;
    }
    // Trim windowed report lists for non-privileged accounts.
    if (isReportRead(url, method)) {
      return applyReportWindow(url, res);
    }
    return res;
  });
};
