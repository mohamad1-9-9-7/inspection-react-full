// src/pages/trial/trialSession.js
// The self-service free trial (server: routes/trial.cjs).
//
// A trial is a company of its own, flagged is_trial, that locks on its end
// date like any lapsed subscription and is ERASED a few days later. Nothing
// typed into it is kept — a customer who subscribes gets a new company.
// These helpers sign the visitor in from the /trial/start answer (same shape
// as /api/auth/login) and tell the in-app banner how long is left.

import { writeSubscriptionCache } from "../../utils/subscriptionLock";

export const TRIAL_DAYS = 7;

/** /demo sector → kit system (mirror of SECTOR_KIT in the server's routes/trial.cjs). */
export const SECTOR_KIT = {
  restaurant: "restaurant",
  kitchen: "restaurant",
  retail: "retail",
  meat: "retail",
  distribution: "warehouse",
  factory: "factory",
  sweets: "factory",
};

/** Same currentUser shape Login.jsx writes, so every screen reads it the same way. */
export function storeTrialSession(data, lang) {
  const u = data.user;
  if (data.token) localStorage.setItem("authToken", data.token);
  localStorage.setItem("currentUser", JSON.stringify({
    username: u.username,
    displayName: u.displayName,
    role: "Admin",
    permissions: u.permissions,
    employees: u.employees || [],
    crudPerms: u.crudPerms || {},
    allowedBranches: u.allowedBranches || [],
    isAdmin: true,
    isSuperAdmin: false,
    companyIndustry: u.company?.industry || "restaurant",
    companyModule: u.company?.module || "",
    companyName: u.company?.name || "",
    companyId: u.companyId || null,
    companyTrial: true,
    companyEndDate: u.company?.endDate || null,
    trialLang: lang === "ar" ? "ar" : "en", // the trial bar speaks the language of the sign-up
    type: "named",
    loginAt: Date.now(),
  }));
  if (u.company?.id) writeSubscriptionCache(u.company.id, u.company);
}

const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/** Days of access left, counting today; 0 once the end date has passed. */
export function trialDaysLeft(endDate, now = new Date()) {
  const end = String(endDate || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return null;
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${todayISO(now)}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 864e5) + 1);
}

/** { endDate, daysLeft } for a signed-in trial account, else null. */
export function currentTrial() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!u.companyTrial || u.isSuperAdmin) return null;
    return { endDate: u.companyEndDate || null, daysLeft: trialDaysLeft(u.companyEndDate), lang: u.trialLang || "" };
  } catch {
    return null;
  }
}
