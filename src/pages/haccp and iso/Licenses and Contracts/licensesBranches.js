// src/pages/haccp and iso/Licenses and Contracts/licensesBranches.js
//
// The branch list of the Licenses & Contracts module — editable from the
// pages themselves (add / rename / reorder / delete), not hard-coded.
//
// One config record on the server, same pattern as `account_groups`:
//   type = licenses_branches_config , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate), so there is always one row.
// localStorage is only a first-paint cache. Until someone saves the list the
// defaults (licensesKit BRANCHES) are used.
import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../config/api";
import { BRANCHES, newUid } from "./licensesKit";

export const BRANCHES_TYPE = "licenses_branches_config";
const KEY = "config";
const CACHE = "lc_branches_cache_v1";
const EVENT = "lc:branches";

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

/**
 * [{ id, name, parentId }] — trimmed, no blanks, no duplicate names (case-insensitive).
 * parentId = the branch this one belongs to (e.g. a food truck working under a
 * butchery's licence). One level only: a parent can't itself have a parent,
 * and a missing / self parent is dropped.
 */
export function normalizeBranches(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((b) => {
    const name = clean(typeof b === "string" ? b : b?.name);
    const k = name.toLowerCase();
    if (!name || seen.has(k)) return;
    seen.add(k);
    out.push({
      id: String((typeof b === "object" && b?.id) || newUid("b")),
      name,
      parentId: (typeof b === "object" && b?.parentId) ? String(b.parentId) : "",
    });
  });
  const byId = new Map(out.map((b) => [b.id, b]));
  out.forEach((b) => {
    const p = byId.get(b.parentId);
    if (!p || p.id === b.id || p.parentId) b.parentId = "";
  });
  // a branch that became a parent loses its own parent (keeps the tree one level deep)
  const parents = new Set(out.map((b) => b.parentId).filter(Boolean));
  out.forEach((b) => { if (parents.has(b.id)) b.parentId = ""; });
  return out;
}

/** { childName: parentName } for every branch that belongs to another. */
export function parentMap(list) {
  const byId = new Map(normalizeBranches(list).map((b) => [b.id, b]));
  const out = {};
  byId.forEach((b) => { if (b.parentId && byId.get(b.parentId)) out[b.name] = byId.get(b.parentId).name; });
  return out;
}

export const defaultBranches = () => normalizeBranches(BRANCHES.map((name, i) => ({ id: `d${i}`, name })));

/**
 * Old name → new name for every branch kept under the same id with another
 * name. Used to move existing records along when a branch is renamed.
 */
export function branchRenames(before, after) {
  const prev = new Map(normalizeBranches(before).map((b) => [b.id, b.name]));
  const out = [];
  normalizeBranches(after).forEach((b) => {
    const old = prev.get(b.id);
    if (old && old !== b.name) out.push({ from: old, to: b.name });
  });
  return out;
}

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) || "null");
    return Array.isArray(v) && v.length ? normalizeBranches(v) : null;
  } catch {
    return null;
  }
}
function writeCache(list) {
  try { localStorage.setItem(CACHE, JSON.stringify(list)); } catch { /* cache only */ }
}

/** The saved list, defaults when nothing is saved yet, or null when the server can't be reached. */
export async function fetchBranches(signal) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(BRANCHES_TYPE)}&limit=5`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row = rows.find((r) => String(r?.payload?.reportDate || "") === KEY) || rows[0] || null;
    const list = normalizeBranches(row?.payload?.branches);
    return list.length ? list : defaultBranches();
  } catch {
    return null;
  }
}

export async function saveBranches(list, user = "") {
  const branches = normalizeBranches(list);
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      reporter: user || "licenses-branches",
      type: BRANCHES_TYPE,
      payload: { reportDate: KEY, branches, updatedAt: new Date().toISOString(), updatedBy: user || "" },
    }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  writeCache(branches);
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: branches })); } catch { /* old webviews */ }
  return branches;
}

/** { branches: [{id,name,parentId}], names: string[], parents: {child: parent}, ready, save(list) } */
export function useLicenseBranches() {
  const [branches, setBranches] = useState(() => readCache() || defaultBranches());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    fetchBranches(ctl.signal).then((list) => {
      if (list) { setBranches(list); writeCache(list); }
      setReady(true);
    });
    const onChange = (e) => { if (Array.isArray(e.detail)) setBranches(e.detail); };
    window.addEventListener(EVENT, onChange);
    return () => { ctl.abort(); window.removeEventListener(EVENT, onChange); };
  }, []);
  const save = useCallback(async (list, user) => {
    const saved = await saveBranches(list, user);
    setBranches(saved);
    return saved;
  }, []);
  return { branches, names: branches.map((b) => b.name), parents: parentMap(branches), ready, save };
}
