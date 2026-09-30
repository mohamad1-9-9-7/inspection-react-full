// src/companies/exaltis/cars/pages/loadingReports/reportsApi.js
// Loading reports — server calls.
// (Split out of LoadingReports.jsx — the code is unchanged.)
import API_BASE from "../../../../../config/api";

/* ===================== API base → src/config/api.js (one source of truth) ===================== */

export const REPORTS_URL = `${API_BASE}/api/reports`;

export const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ===================== Server type (matches LoadingLog.jsx) ===================== */
export const LOADING_TYPE = "sweets_cars_loading_inspection";

/* ===================== Server helpers ===================== */
export async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list reports for ${type}`);
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : (json?.data || []);
}

export async function deleteReportById(id) {
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to delete");
  }
  return true;
}
