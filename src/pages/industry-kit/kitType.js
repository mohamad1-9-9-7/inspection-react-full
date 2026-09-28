// src/pages/industry-kit/kitType.js
// The isolation guard of every kit page.
//
// A kit page (OHC cards, external certificates, log sheets) is shared by the
// restaurant, supermarket, warehouse and manufacturing apps, so it never
// hard-codes a report type. It asks here instead:
//
//   kitType("ohc_certificate")  → "retail_ohc_certificate" inside a supermarket
//
// The prefix comes from the company the session is working in (the login
// token's company for an employee, the picked company for the super-admin).
// Anything else — Al Mawashi (meat), sweets, or no company picked — THROWS,
// so a kit page can never read or write another system's data by accident.
// On top of this the server scopes every row to the caller's company_id, which
// keeps two companies of the same industry apart.

import { getActiveIndustry } from "../../utils/companyContext";
import { KIT_INDUSTRY_IDS } from "../../industries/catalog";

/** The kit industry this session works in; throws outside one. */
export function kitIndustry() {
  const id = getActiveIndustry();
  if (!KIT_INDUSTRY_IDS.includes(id)) {
    throw new Error(`Industry kit used outside a kit company (active industry: ${id || "none"})`);
  }
  return id;
}

/** `<industry>_<suffix>` for the active company's industry. */
export function kitType(suffix) {
  if (!/^[a-z0-9_]+$/.test(suffix)) throw new Error(`Bad report type suffix "${suffix}"`);
  return `${kitIndustry()}_${suffix}`;
}

/** Refuses a schema type that does not belong to the active industry. */
export function assertOwnType(type) {
  const ns = kitIndustry();
  if (!String(type || "").startsWith(`${ns}_`)) {
    throw new Error(`Report type "${type}" does not belong to the ${ns} company`);
  }
  return type;
}

/** localStorage key private to the active company (never shared across tenants). */
export function kitStorageKey(base) {
  let company = "";
  try { company = JSON.parse(localStorage.getItem("activeCompany") || "null")?.id ?? ""; } catch { /* none picked */ }
  return `${base}:${kitIndustry()}:${company || "own"}`;
}
