// src/companies/exaltis/training/annualPlan/planApi.js
// Annual training plan — server calls.
// (Split out of TrainingAnnualPlan.jsx — the code is unchanged.)
import API_BASE from "../../../../config/api";
import { sessionDate } from "./planModel";

/* ===================== API base → src/config/api.js ===================== */

export const REPORTS_URL = `${API_BASE}/api/reports`;

export const TYPE = "sweets_training_annual_plan";

export const SESSION_TYPE = "sweets_training_session";

/* ===================== Helpers ===================== */
export async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text || null; }
}

export function unwrapList(data) {
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.reports)
    ? data.reports
    : [];
}

export async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return unwrapList(await safeJson(res));
}

export function planTimestamp(r) {
  const t = r?.payload?.updatedAt || r?.updated_at || r?.updatedAt || r?.created_at || r?.createdAt || r?.created || r?.timestamp;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export async function listPlans(year) {
  const arr = await listReportsByType(TYPE);
  const filtered = year == null ? arr : arr.filter((r) => Number(r?.payload?.year) === Number(year));
  // ✅ Most recent first
  return [...filtered].sort((a, b) => planTimestamp(b) - planTimestamp(a));
}

export async function listSessions(year) {
  const arr = await listReportsByType(SESSION_TYPE);
  if (year == null) return arr;
  return arr.filter((r) => {
    const d = sessionDate(r);
    if (!d) return false;
    return d.getFullYear() === Number(year);
  });
}

export async function createPlan(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return await safeJson(res);
}

export async function updatePlan(id, body) {
  let res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return await safeJson(res);
}

export function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}
