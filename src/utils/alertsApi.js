// src/utils/alertsApi.js
//
// 🔔 The server's alerts (inspection-server routes/alerts.cjs + utils/alertEngine.cjs).
// The server finds the problems itself — a phone temperature reading out of
// range, a daily log not filed, a calibration / certificate about to expire,
// a CAPA past its date — and keeps them in its own table. This file only
// reads them and marks them seen; nothing here decides what is a problem.

import API_BASE from "../config/api";
import { branchAllowed, getPerms } from "./perms";

export const ALERTS_EVENT = "app:alerts-changed";

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}/api/alerts${path}`, {
    method,
    cache: "no-store",
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const e = new Error(json.error || `Alerts request failed (${res.status})`);
    e.status = res.status;
    throw e;
  }
  return json;
}
const changed = () => { try { window.dispatchEvent(new Event(ALERTS_EVENT)); } catch { /* non-browser */ } };

/** status: "open" | "ack" | "resolved" | "active" | "all" */
export const fetchAlerts = (status = "open", limit = 100) =>
  call(`?status=${encodeURIComponent(status)}&limit=${limit}`).then((j) => j.data || []);
export const fetchAlertCount = () => call("/count");
export const ackAlert = (id, note = "") => call(`/${encodeURIComponent(id)}/ack`, { method: "POST", body: { note } }).then((j) => { changed(); return j; });
export const ackAllAlerts = () => call("/ack-all", { method: "POST", body: {} }).then((j) => { changed(); return j; });
export const fetchAlertRules = () => call("/rules");
export const saveAlertRules = (rules) => call("/rules", { method: "PUT", body: { rules } });
export const runAlertChecks = (first = true) => call("/run", { method: "POST", body: { first } }).then((j) => { changed(); return j; });

export const isAlertsAdmin = () => !!getPerms().isAdmin;

/** An account limited to some branches sees the alerts of those branches
    (plus the company-wide ones that name no branch). */
export const alertVisible = (a) =>
  !a?.branch || branchAllowed("daily", a.branch) || branchAllowed("admin", a.branch);

export const SEVERITY = {
  critical: { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", icon: "🚨" },
  warning: { color: "#b45309", bg: "#fffbeb", border: "#fde68a", icon: "⚠️" },
  info: { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: "ℹ️" },
};

/* What each rule is, for the page and the bell (EN / AR). */
export const RULE_INFO = {
  temperature: { icon: "🌡️", en: "Temperature out of range", ar: "حرارة خارج الحد" },
  missedReports: { icon: "📋", en: "Daily log not filed", ar: "تقرير يومي لم يُعبّأ" },
  noReadingToday: { icon: "⏰", en: "No temperature reading yet today", ar: "لا قراءة حرارة اليوم بعد" },
  expiries: { icon: "⏳", en: "Expiring / expired", ar: "قارب على الانتهاء / منتهي" },
  capa: { icon: "🛠️", en: "CAPA / NCR overdue", ar: "CAPA / NCR متأخر" },
};
