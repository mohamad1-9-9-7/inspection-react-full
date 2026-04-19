// src/hooks/usePresence.js
// Heartbeat + presence stats for the login page.
// - Sends a ping every 25s while the tab is open
// - Fetches stats (online / todayVisits / totalVisits) every 15s
// - Silently returns zeros if the backend endpoint isn't available yet.
import { useEffect, useState, useRef } from "react";
import API_BASE from "../config/api";

const VISITOR_ID_KEY = "visitorId";
const PING_INTERVAL = 25_000;
const STATS_INTERVAL = 15_000;

function getVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id =
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : "v-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
}

export default function usePresence({ enabled = true } = {}) {
  const [stats, setStats] = useState({ online: 0, todayVisits: 0, totalVisits: 0, ok: false });
  const pingTimerRef = useRef(null);
  const statsTimerRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const visitorId = getVisitorId();
    let cancelled = false;

    const ping = async () => {
      if (document.hidden) return; // don't count idle tabs
      try {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const timer = setTimeout(() => ctrl.abort(), 5000);
        await fetch(`${API_BASE}/api/presence/ping`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
      } catch {
        // ignore — backend may not be ready yet
      }
    };

    const fetchStats = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${API_BASE}/api/presence/stats`, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error("stats not ok");
        const data = await res.json();
        if (!cancelled) {
          setStats({
            online: Number(data.online) || 0,
            todayVisits: Number(data.todayVisits) || 0,
            totalVisits: Number(data.totalVisits) || 0,
            ok: true,
          });
        }
      } catch {
        if (!cancelled) setStats((s) => ({ ...s, ok: false }));
      }
    };

    // initial
    ping();
    fetchStats();

    // intervals
    pingTimerRef.current  = setInterval(ping,       PING_INTERVAL);
    statsTimerRef.current = setInterval(fetchStats, STATS_INTERVAL);

    // refresh when tab becomes visible again
    const onVisibility = () => {
      if (!document.hidden) {
        ping();
        fetchStats();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // graceful bye on unload (best-effort)
    const onUnload = () => {
      try {
        const blob = new Blob([JSON.stringify({ visitorId })], { type: "application/json" });
        navigator.sendBeacon?.(`${API_BASE}/api/presence/bye`, blob);
      } catch {}
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      clearInterval(pingTimerRef.current);
      clearInterval(statsTimerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      abortRef.current?.abort?.();
    };
  }, [enabled]);

  return stats;
}
