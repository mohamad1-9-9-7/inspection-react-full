// src/pages/haccp and iso/Licenses and Contracts/licensesBranches.js
//
// The settings of the Licenses & Contracts module, editable from the pages:
//   • branches     — add / rename / reorder / delete, sub-branches (parentId)
//   • requirements — the licences and contracts every branch (or chosen
//                    branches) must have; a missing one shows as an alert
//
// One config record on the server, same pattern as `account_groups`:
//   type = licenses_branches_config , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate), so there is always one row.
// localStorage is only a first-paint cache. Until someone saves the list the
// defaults (licensesKit BRANCHES) are used.
import { useCallback, useEffect, useRef, useState } from "react";
import API_BASE from "../../../config/api";
import { BRANCHES, CORE_LICENSES, newUid } from "./licensesKit";

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

/* ───────────── required documents ───────────── */
/** [{ id, kind: "license"|"contract", name, branches: [] }] — branches empty = every branch. */
export function normalizeRequirements(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((r) => {
    const kind = r?.kind === "contract" ? "contract" : "license";
    const name = clean(r?.name);
    const k = `${kind}:${name.toLowerCase()}`;
    if (!name || seen.has(k)) return;
    seen.add(k);
    const branches = [...new Set((Array.isArray(r?.branches) ? r.branches : []).map(clean).filter(Boolean))];
    out.push({ id: String(r?.id || newUid("q")), kind, name, branches });
  });
  return out;
}
export const defaultRequirements = () => normalizeRequirements(CORE_LICENSES.map((name, i) => ({ id: `dq${i}`, kind: "license", name })));

/* ───────────── server + cache ───────────── */
// The record holds BOTH lists; every save writes both, taking the other one
// from the last state this page knows.
const fromPayload = (p) => {
  const b = normalizeBranches(p?.branches);
  return {
    branches: b.length ? b : defaultBranches(),
    // undefined = never saved → defaults; [] = the admin removed them all
    requirements: Array.isArray(p?.requirements) ? normalizeRequirements(p.requirements) : defaultRequirements(),
  };
};

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE) || "null");
    if (Array.isArray(v)) return fromPayload({ branches: v }); // older cache = branches only
    return v && typeof v === "object" ? fromPayload(v) : null;
  } catch {
    return null;
  }
}
function writeCache(cfg) {
  try { localStorage.setItem(CACHE, JSON.stringify(cfg)); } catch { /* cache only */ }
}

/** { branches, requirements } — defaults when nothing is saved yet, null when the server can't be reached. */
export async function fetchSettings(signal) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(BRANCHES_TYPE)}&limit=5`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row = rows.find((r) => String(r?.payload?.reportDate || "") === KEY) || rows[0] || null;
    return fromPayload(row?.payload);
  } catch {
    return null;
  }
}

export async function saveSettings({ branches, requirements }, user = "") {
  const cfg = { branches: normalizeBranches(branches), requirements: normalizeRequirements(requirements) };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      reporter: user || "licenses-settings",
      type: BRANCHES_TYPE,
      payload: { reportDate: KEY, ...cfg, updatedAt: new Date().toISOString(), updatedBy: user || "" },
    }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  writeCache(cfg);
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: cfg })); } catch { /* old webviews */ }
  return cfg;
}

/**
 * { branches, names, parents, requirements, ready,
 *   save(branchList, user), saveRequirements(list, user) }
 */
export function useLicenseBranches() {
  const [cfg, setCfg] = useState(() => readCache() || fromPayload(null));
  const [ready, setReady] = useState(false);
  const latest = useRef(cfg);
  latest.current = cfg;
  useEffect(() => {
    const ctl = new AbortController();
    fetchSettings(ctl.signal).then((got) => {
      if (got) { setCfg(got); writeCache(got); }
      setReady(true);
    });
    const onChange = (e) => { if (e.detail && Array.isArray(e.detail.branches)) setCfg(e.detail); };
    window.addEventListener(EVENT, onChange);
    return () => { ctl.abort(); window.removeEventListener(EVENT, onChange); };
  }, []);
  const save = useCallback(async (list, user) => {
    const saved = await saveSettings({ ...latest.current, branches: list }, user);
    setCfg(saved);
    return saved.branches;
  }, []);
  const saveRequirements = useCallback(async (list, user) => {
    const saved = await saveSettings({ ...latest.current, requirements: list }, user);
    setCfg(saved);
    return saved.requirements;
  }, []);
  return {
    branches: cfg.branches,
    names: cfg.branches.map((b) => b.name),
    parents: parentMap(cfg.branches),
    requirements: cfg.requirements,
    ready, save, saveRequirements,
  };
}
