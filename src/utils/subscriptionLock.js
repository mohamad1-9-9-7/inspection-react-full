// src/utils/subscriptionLock.js
// -----------------------------------------------------------------------------
// The in-app subscription lock. The server's login lock is the real one
// (routes/admin.cjs); this catches a company whose subscription lapses while
// someone is already signed in. Both judge the same thing: the company's own
// row in `companies`, served by GET /api/subscription.
//
// The cache belongs to ONE company (cache.companyId). It used to be filled
// before login with no token, which the server answered with Al Mawashi's
// row — so whoever signed in next, from any company, was judged by Al
// Mawashi's dates for up to an hour. Now a platform account (super-admin, no
// company) never locks, and a cache from another company is ignored.
// -----------------------------------------------------------------------------

export const SUB_CACHE_KEY = "subscription_cache";
export const SUB_CACHE_MAX_AGE = 60 * 60 * 1000;

function readJsonKey(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; }
}

const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/* The pure rule, so it can be tested: same as the server — expired or
   suspended, or an end date before today. */
export function isLocked(user, cache, now = new Date()) {
  const companyId = Number(user?.companyId) || null;
  if (!companyId || user?.isSuperAdmin) return false;             // platform account
  if (!cache?.status || !cache.companyId) return false;            // nothing known, or a pre-fix cache
  if (Number(cache.companyId) !== companyId) return false;         // another company's
  if (cache.status === "expired" || cache.status === "suspended") return true;
  const end = String(cache.end_date || "").slice(0, 10);
  return !!end && end < todayISO(now);
}

export function isSubscriptionExpired() {
  return isLocked(readJsonKey("currentUser"), readJsonKey(SUB_CACHE_KEY));
}

/* Store what the server said about the signed-in account's company. */
export function writeSubscriptionCache(companyId, s) {
  try {
    localStorage.setItem(SUB_CACHE_KEY, JSON.stringify({
      companyId: Number(companyId),
      status: s?.status,
      end_date: s?.end_date ?? s?.endDate ?? null,
      plan: s?.plan ?? s?.planName ?? null,
      fetchedAt: Date.now(),
    }));
  } catch { /* storage unavailable — the login lock still stands */ }
}

/* Whether the cache needs a refresh for this account. */
export function needsRefresh(user, cache, now = Date.now()) {
  const companyId = Number(user?.companyId) || null;
  if (!companyId || user?.isSuperAdmin) return false;
  return Number(cache?.companyId) !== companyId || now - (cache?.fetchedAt || 0) >= SUB_CACHE_MAX_AGE;
}

export function refreshSubscriptionCache(apiBase) {
  const user = readJsonKey("currentUser");
  if (!needsRefresh(user, readJsonKey(SUB_CACHE_KEY)) || !localStorage.getItem("authToken")) return;
  const companyId = Number(user.companyId);
  fetch(`${apiBase}/api/subscription`)
    .then((r) => r.json())
    .then((data) => {
      const s = data?.ok ? data.subscription : null;
      if (s && Number(s.company_id) === companyId) writeSubscriptionCache(companyId, s);
    })
    .catch(() => {}); // non-fatal
}
