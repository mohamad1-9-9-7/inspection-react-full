// src/pages/dashboard/dashboardPrefs.js
// The account's own dashboard choices: pinned cards (favs) and the last few
// things it opened from the dashboard (recent).
//
// They belong to the ACCOUNT: saved on the server (app_users.ui_prefs,
// PUT /api/auth/me/prefs), returned by the login and cached in
// currentUser.uiPrefs — the same pattern as the interface language
// (utils/appLang.js). localStorage here is only that cache.
import { useEffect, useState } from "react";
import API_BASE from "../../config/api";

const EVENT = "app:dash-prefs";
const MAX_FAVS = 12;
const MAX_RECENT = 6;

function readUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}") || {}; } catch { return {}; }
}

export function getDashPrefs() {
  const p = readUser().uiPrefs;
  return {
    favs: Array.isArray(p?.favs) ? p.favs.filter((x) => typeof x === "string") : [],
    recent: Array.isArray(p?.recent) ? p.recent.filter((x) => x && x.k && x.r) : [],
  };
}

let saveTimer = null;
function save(prefs) {
  const cu = readUser();
  if (!cu.username) return;
  try { localStorage.setItem("currentUser", JSON.stringify({ ...cu, uiPrefs: prefs })); } catch { /* storage blocked */ }
  try { window.dispatchEvent(new Event(EVENT)); } catch { /* no DOM */ }
  // One request for a burst of changes. fetch is wrapped by authFetch.js,
  // which attaches the session token.
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch(`${API_BASE}/api/auth/me/prefs`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      keepalive: true, // opening a card navigates away right after
      body: JSON.stringify({ prefs: getDashPrefs() }),
    }).catch(() => { /* offline: the cached choice stands; saved with the next change */ });
  }, 800);
}

export function toggleFav(id) {
  const p = getDashPrefs();
  const favs = p.favs.includes(id) ? p.favs.filter((x) => x !== id) : [...p.favs, id].slice(-MAX_FAVS);
  save({ ...p, favs });
}

/** entry = { k: unique key, l: label (reports only), r: in-app route } */
export function pushRecent(entry) {
  if (!entry?.k || !String(entry.r || "").startsWith("/")) return;
  const p = getDashPrefs();
  if (p.recent[0]?.k === entry.k) return; // already on top — no write, no request
  const recent = [{ k: entry.k, l: entry.l || "", r: entry.r }, ...p.recent.filter((x) => x.k !== entry.k)].slice(0, MAX_RECENT);
  save({ ...p, recent });
}

export function useDashPrefs() {
  const [prefs, setPrefs] = useState(getDashPrefs);
  useEffect(() => {
    const h = () => setPrefs(getDashPrefs());
    window.addEventListener(EVENT, h);
    return () => window.removeEventListener(EVENT, h);
  }, []);
  return prefs;
}
