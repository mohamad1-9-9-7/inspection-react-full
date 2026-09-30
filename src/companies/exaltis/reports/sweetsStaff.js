// src/pages/monitor/branches/sweets/sweetsStaff.js
//
// The confectionery company's own staff list: employee number · name · job.
// Feeds the Personal Hygiene sheet (one row per active person) and the name /
// number pickers on Sick Employee.
//
// Deliberately independent of _shared/staffRegistry.js — that module reads the
// other company's employee register and settings screen. Nothing here may
// import from it (separation rule #1).
//
// Storage: one config record on the server, like coolerDefs.js
//   type = sweets_staff_directory , payload.reportDate = "config"
// PUT /api/reports upserts on (company, type, reportDate) → always one row per
// company. localStorage is a first-paint cache only, keyed per company so a
// super-admin switching companies never sees another company's names.

import { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";
import { companyScopedKey } from "./sweetsRecord";

export const SWEETS_STAFF_TYPE = "sweets_staff_directory";
const STAFF_KEY = "config";
const STAFF_EVENT = "sweets_staff_changed";

const cacheKey = () => companyScopedKey("sweets_staff_cache_v1");

/* ───────── normalisation ───────── */

/** Employee numbers compare loosely: "0012", " 12", "EMP-12" → "12". */
export function normalizeEmpNo(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[-_()/\\.]/g, "")
    .replace(/^emp/, "")
    .replace(/^0+(?=\d)/, "");
}

export function normalizeName(v) {
  return String(v ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

function normalizeStaff(raw) {
  if (!raw) return null;
  const empNo = String(raw.empNo ?? "").trim();
  const name = String(raw.name ?? "").trim();
  if (!empNo || !name) return null;
  return {
    empNo,
    name,
    job: String(raw.job ?? "").trim(),
    active: raw.active !== false,
  };
}

const sortStaff = (list) =>
  [...list].sort((a, b) =>
    String(a.empNo).localeCompare(String(b.empNo), undefined, { numeric: true })
  );

const cleanList = (list) =>
  sortStaff((Array.isArray(list) ? list : []).map(normalizeStaff).filter(Boolean));

/* ───────── cache (first paint only) ───────── */

function loadCache() {
  try { return cleanList(JSON.parse(localStorage.getItem(cacheKey()) || "[]")); } catch { return []; }
}
function saveCache(list) {
  try { localStorage.setItem(cacheKey(), JSON.stringify(list)); } catch { /* optional */ }
  try { window.dispatchEvent(new CustomEvent(STAFF_EVENT)); } catch { /* ignore */ }
}

/* ───────── server ───────── */

/** The staff list, or null when the server could not be reached. */
export async function fetchSweetsStaff(signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${SWEETS_STAFF_TYPE}&reportDate=${STAFF_KEY}`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || [];
    const row = rows.find((r) => String(r?.payload?.reportDate || "") === STAFF_KEY) || null;
    return cleanList(row?.payload?.staff);
  } catch {
    return null;
  }
}

/** Writes the whole list back (one row per company). */
export async function saveSweetsStaff(list, user = "") {
  const staff = cleanList(list);
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      reporter: "sweets",
      type: SWEETS_STAFF_TYPE,
      payload: { reportDate: STAFF_KEY, staff, updatedAt: new Date().toISOString(), updatedBy: user },
    }),
  });
  if (!res.ok) throw new Error(`Save failed (HTTP ${res.status})`);
  saveCache(staff);
  return staff;
}

/* ───────── pure list operations ───────── */

/** Adds or replaces one person. `oldEmpNo` renames a number. */
export function upsertSweetsStaff(list, entry, oldEmpNo = "") {
  const rec = normalizeStaff(entry);
  if (!rec) throw new Error("Employee number and name are both required.");
  const newKey = normalizeEmpNo(rec.empNo);
  const oldKey = normalizeEmpNo(oldEmpNo || rec.empNo);
  const clash = (list || []).some(
    (s) => normalizeEmpNo(s.empNo) === newKey && normalizeEmpNo(s.empNo) !== oldKey
  );
  if (clash) throw new Error(`Employee number "${rec.empNo}" already exists.`);
  const rest = (list || []).filter((s) => {
    const k = normalizeEmpNo(s.empNo);
    return k !== oldKey && k !== newKey;
  });
  return sortStaff([...rest, rec]);
}

export function removeSweetsStaff(list, empNo) {
  const key = normalizeEmpNo(empNo);
  return (list || []).filter((s) => normalizeEmpNo(s.empNo) !== key);
}

/* ───────── React hook ─────────
   Same return shape the forms already used ({ staff, roster, byNo, byName }),
   so switching a form over is an import change. */
export function useSweetsStaff() {
  const [staff, setStaff] = useState(loadCache);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  const reload = useCallback(async (signal) => {
    setLoading(true);
    const server = await fetchSweetsStaff(signal);
    if (signal?.aborted) return;
    if (Array.isArray(server)) {
      setStaff(server);
      saveCache(server);
      setOnline(true);
    } else {
      setOnline(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    reload(ctrl.signal);
    return () => ctrl.abort();
  }, [reload]);

  useEffect(() => {
    const onChange = () => setStaff(loadCache());
    window.addEventListener(STAFF_EVENT, onChange);
    return () => window.removeEventListener(STAFF_EVENT, onChange);
  }, []);

  const { byNo, byName } = useMemo(() => {
    const no = new Map();
    const nm = new Map();
    staff.forEach((s) => {
      const kNo = normalizeEmpNo(s.empNo);
      const kName = normalizeName(s.name);
      if (kNo && !no.has(kNo)) no.set(kNo, s);
      if (kName && !nm.has(kName)) nm.set(kName, s);
    });
    return { byNo: no, byName: nm };
  }, [staff]);

  const roster = useMemo(() => staff.filter((s) => s.active !== false), [staff]);

  return { staff, roster, loading, online, reload, byNo, byName };
}
