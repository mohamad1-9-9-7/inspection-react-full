// src/companies/exaltis/cars/pages/loadingLog/loadingLogApi.js
// Loading log — server calls.
// (Split out of LoadingLog.jsx — the code is unchanged.)
import API_BASE from "../../../../../config/api";
import { TYPE } from "./loadingLogModel";

export async function saveToServer(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
  });
  if (!res.ok) throw new Error("Server " + res.status + ": " + (await res.text()));
  return res.json();
}

export async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch ${type}: ${res.status}`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? [];
}

export async function saveLookupValue(type, value) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2);

  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "sweets",
      type,
      payload: {
        id,
        value,
        createdAt: Date.now(),
      },
    }),
  });

  if (!res.ok) throw new Error("Server " + res.status + ": " + (await res.text()));
  return res.json().catch(() => ({ ok: true }));
}
