// src/pages/monitor/branches/_shared/staffRegistry.js
//
// Shared staff directory — employee number ⇄ employee name.
//
// Why this exists: the employee list used to be a hardcoded `DEFAULT_NAMES`
// array inside PersonalHygieneTab.js. Adding or removing one worker meant a
// code edit and a deploy. It now lives on the server so QA can maintain it
// from Settings → Staff Directory, and every form that asks for an employee
// (Personal Hygiene, Staff Sickness, Return to Work) reads the same list.
//
// Storage: the generic `product_catalog` table, scope "qcs_staff".
//   code → employee number (unique per scope, enforced by the DB)
//   name → employee name
// No new server route was needed; /api/catalog/products already takes a scope.
//
// localStorage is a CACHE only, never a standalone store: it keeps the
// dropdowns populated on a slow connection, and the server always wins.

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../../config/api";

export const STAFF_SCOPE = "qcs_staff";
export const STAFF_CACHE_KEY = "qcs_staff_cache_v1";
export const STAFF_EVENT = "qcs_staff_changed";

const CATALOG_URL = `${API_BASE}/api/catalog/products`;

/* ===== Normalisation ===== */

/** Employee numbers are compared loosely: "0012", "12 ", "EMP-12" → "12"/"emp12". */
export function normalizeEmpNo(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_()/\\.]/g, "")
    .replace(/^0+(?=\d)/, "");
}

export function normalizeName(v) {
  return String(v ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

/** Accepts every shape the catalog API and the cache can produce. */
export function normalizeStaff(raw) {
  if (!raw) return null;
  const empNo = String(raw.empNo ?? raw.code ?? raw.item_code ?? raw.employeeNo ?? "").trim();
  const name = String(raw.name ?? raw.description ?? raw.employeeName ?? "").trim();
  if (!empNo || !name) return null;
  return { empNo, name };
}

const sortStaff = (list) =>
  [...list].sort((a, b) => {
    const na = Number(normalizeEmpNo(a.empNo));
    const nb = Number(normalizeEmpNo(b.empNo));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.empNo).localeCompare(String(b.empNo), undefined, { numeric: true });
  });

/* ===== Cache layer ===== */

export function loadStaffCache() {
  try {
    const raw = localStorage.getItem(STAFF_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeStaff).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function saveStaffCache(list) {
  const clean = (Array.isArray(list) ? list : []).map(normalizeStaff).filter(Boolean);
  try {
    localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify(clean));
  } catch {
    /* quota / private mode — the server copy is still authoritative */
  }
  try {
    window.dispatchEvent(new CustomEvent(STAFF_EVENT));
  } catch {
    /* ignore */
  }
  return clean;
}

/* ===== Server layer ===== */

/** Returns the staff list, or null when the server could not be reached. */
export async function fetchStaff(signal) {
  try {
    const res = await fetch(
      `${CATALOG_URL}?scope=${encodeURIComponent(STAFF_SCOPE)}&limit=10000`,
      { cache: "no-store", signal }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const list = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : [];
    return sortStaff(list.map(normalizeStaff).filter(Boolean));
  } catch {
    return null;
  }
}

export async function saveStaff(entry, oldEmpNo = "") {
  const normalized = normalizeStaff(entry);
  if (!normalized) throw new Error("Employee number and name are both required");

  const target = String(oldEmpNo || "").trim();
  const url = target ? `${CATALOG_URL}/${encodeURIComponent(target)}` : CATALOG_URL;

  const res = await fetch(url, {
    method: target ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scope: STAFF_SCOPE,
      item: { code: normalized.empNo, name: normalized.name },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    if (json?.error === "DUPLICATE_CODE") {
      throw new Error(`Employee number "${normalized.empNo}" already exists.`);
    }
    throw new Error(json?.message || json?.error || `Save failed (${res.status})`);
  }
  return normalizeStaff(json?.item) || normalized;
}

export async function deleteStaff(empNo) {
  const code = String(empNo || "").trim();
  if (!code) throw new Error("Employee number required");
  const res = await fetch(
    `${CATALOG_URL}/${encodeURIComponent(code)}?scope=${encodeURIComponent(STAFF_SCOPE)}`,
    { method: "DELETE" }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.message || json?.error || `Delete failed (${res.status})`);
  }
  return json;
}

/* ===== Lookup helpers (used by the forms) ===== */

export function buildStaffIndex(list) {
  const byNo = new Map();
  const byName = new Map();
  (Array.isArray(list) ? list : []).forEach((s) => {
    const rec = normalizeStaff(s);
    if (!rec) return;
    const kNo = normalizeEmpNo(rec.empNo);
    const kName = normalizeName(rec.name);
    if (kNo && !byNo.has(kNo)) byNo.set(kNo, rec);
    if (kName && !byName.has(kName)) byName.set(kName, rec);
  });
  return { byNo, byName };
}

export function lookupByEmpNo(list, empNo) {
  return buildStaffIndex(list).byNo.get(normalizeEmpNo(empNo)) || null;
}

export function lookupByName(list, name) {
  return buildStaffIndex(list).byName.get(normalizeName(name)) || null;
}

/* ===== React hook =====
   Serves the cached list immediately so a form never renders an empty
   dropdown, then replaces it with the server copy. */
export function useStaffDirectory() {
  const [staff, setStaff] = useState(() => loadStaffCache());
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  const reload = useCallback(async (signal) => {
    setLoading(true);
    const server = await fetchStaff(signal);
    if (signal?.aborted) return;
    if (Array.isArray(server)) {
      setStaff(server);
      saveStaffCache(server);
      setOnline(true);
    } else {
      setStaff(loadStaffCache());
      setOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    reload(ctrl.signal);
    return () => ctrl.abort();
  }, [reload]);

  // Stay in sync when Settings edits the list in this tab or another one.
  useEffect(() => {
    const onChange = () => setStaff(loadStaffCache());
    window.addEventListener(STAFF_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(STAFF_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const index = buildStaffIndex(staff);
  return { staff, loading, online, reload, ...index };
}
