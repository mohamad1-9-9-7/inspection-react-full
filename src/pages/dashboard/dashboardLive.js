// src/pages/dashboard/dashboardLive.js
// What the home dashboard shows about TODAY, from data that already exists:
//   • open alerts        — the server's own list (shared request with the bell)
//   • daily logs filed   — counts only (/api/reports/kpi-days), no payloads
//   • connection + saves still waiting on this device (offline outbox)
//
// Cost: two light requests when the dashboard opens, then only on window
// focus (at most once a minute) or after an alert is acknowledged. No timer:
// a short poll would keep the database awake all day.
import { useCallback, useEffect, useRef, useState } from "react";
import API_BASE from "../../config/api";
import { fetchOpenAlertsShared, ALERTS_EVENT } from "../../utils/alertsApi";
import { subscribeOutbox } from "../../utils/offlineOutbox";
import { branchAllowed } from "../../utils/perms";
import { DAILY_LOG_BRANCHES, todayDubai, addDays } from "../../utils/dailyLogs";

const DAILY_CACHE_MS = 120_000;
let dailyMemo = null; // { at, key, value }

/** Which dashboard card an alert belongs to (null = only in the list). */
export function alertCardId(a) {
  const rule = a?.rule;
  if (rule === "temperature" || rule === "noReadingToday" || rule === "missedReports" || rule === "capa") return "daily";
  const link = String(a?.link || "");
  if (link.startsWith("/ohc")) return "ohc";
  if (link.startsWith("/training-certificates")) return "training";
  if (link.startsWith("/haccp-iso")) return "iso";
  return null;
}

/** Daily logs filed today by the sites this account may see: { done, expected }.
    A site with no daily log in the last 7 days is treated as not operating. */
async function fetchDailyToday() {
  const today = todayDubai();
  const sites = DAILY_LOG_BRANCHES.filter(
    (b) => branchAllowed("daily", b.perm) || branchAllowed("admin", b.perm)
  );
  if (!sites.length) return null;
  const types = sites.flatMap((b) => b.types.map(([t]) => t));
  const key = `${today}|${types.join(",")}`;
  if (dailyMemo && dailyMemo.key === key && Date.now() - dailyMemo.at < DAILY_CACHE_MS) return dailyMemo.value;

  const res = await fetch(
    `${API_BASE}/api/reports/kpi-days?types=${encodeURIComponent(types.join(","))}&from=${addDays(today, -7)}&to=${today}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || [];
  const seen = new Set();      // types with any log this week
  const doneToday = new Set(); // types filed today
  rows.forEach((r) => {
    seen.add(r.type);
    if (String(r.day).slice(0, 10) === today) doneToday.add(r.type);
  });
  let done = 0;
  let expected = 0;
  sites.forEach((b) => {
    const mine = b.types.map(([t]) => t);
    if (!mine.some((t) => seen.has(t))) return;
    expected += mine.length;
    done += mine.filter((t) => doneToday.has(t)).length;
  });
  const value = expected ? { done, expected } : null;
  dailyMemo = { at: Date.now(), key, value };
  return value;
}

/**
 * @param {{ wantDaily: boolean }} opts  wantDaily = the account has the Daily Monitor card
 * @returns {{ alerts: object[], alertsLoaded: boolean, daily: {done:number, expected:number}|null,
 *             online: boolean, waiting: number }}
 */
export function useDashboardLive({ wantDaily }) {
  const [alerts, setAlerts] = useState([]);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [daily, setDaily] = useState(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  const [waiting, setWaiting] = useState(0);
  const lastLoad = useRef(0);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (document.hidden) return;
    lastLoad.current = Date.now();
    fetchOpenAlertsShared()
      .then((list) => { if (alive.current) { setAlerts(list); setAlertsLoaded(true); } })
      .catch(() => { /* the section simply stays as it was */ });
    if (wantDaily) {
      fetchDailyToday()
        .then((v) => { if (alive.current) setDaily(v); })
        .catch(() => { /* card shows no count */ });
    }
  }, [wantDaily]);

  useEffect(() => {
    alive.current = true;
    load();
    const onFocus = () => { if (Date.now() - lastLoad.current > 60_000) load(); };
    const onAlerts = () => load();
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener(ALERTS_EVENT, onAlerts);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const unsub = subscribeOutbox((st) => {
      if (alive.current) setWaiting((st?.pending?.length || 0) + (st?.failed?.length || 0));
    });
    return () => {
      alive.current = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ALERTS_EVENT, onAlerts);
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      unsub();
    };
  }, [load]);

  return { alerts, alertsLoaded, daily, online, waiting };
}
