// Patches the global fetch ONCE so every existing `fetch(`${API_BASE}/...`)`
// call site in the app (250+ files) automatically sends the session token —
// without having to touch each call site individually.
import { API_BASE, IMAGE_API_BASE } from "../config/api";

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

window.fetch = function authFetch(input, init = {}) {
  const url = typeof input === "string" ? input : input?.url || "";

  if (!targetsApi(url)) {
    return ORIGINAL_FETCH(input, init);
  }

  const token = localStorage.getItem("authToken");
  let nextInit = init;
  if (token) {
    const headers = new Headers(init.headers || (typeof input !== "string" ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
    nextInit = { ...init, headers };
  }

  return ORIGINAL_FETCH(input, nextInit).then((res) => {
    const isLoginCall = url.includes("/api/auth/login");
    if (res.status === 401 && !isLoginCall) {
      clearAppSession();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return res;
  });
};
