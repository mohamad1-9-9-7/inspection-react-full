// src/companies/exaltis/training/admin/adminApi.js
// Training admin — server calls.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import { API_BASE } from "../TrainingSessionsList.helpers";

export const REPORTS_URL = `${API_BASE}/api/reports`;

/* ===================== API helpers ===================== */
export async function apiGet(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}&limit=500`, { cache: "no-store" });
  if (!res.ok) return [];
  const d = await res.json().catch(() => []);
  if (Array.isArray(d)) return d;
  return d?.data ?? d?.items ?? d?.rows ?? [];
}

export async function apiPost(type, payload) {
  const res = await fetch(REPORTS_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type, payload }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  // Server returns { ok, report }. Callers read `.id`, so unwrap to the row.
  const data = await res.json().catch(() => ({}));
  return data?.report || data;
}

export async function apiPut(id, type, payload) {
  const res = await fetch(`${REPORTS_URL}/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type, payload }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  // Server returns { ok, report }. Callers read `.id`, so unwrap to the row.
  const data = await res.json().catch(() => ({}));
  return data?.report || data;
}

export async function apiDel(id) {
  const res = await fetch(`${REPORTS_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  return res.json().catch(() => ({ ok: true }));
}
