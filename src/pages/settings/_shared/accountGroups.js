// src/pages/settings/_shared/accountGroups.js
//
// 🏷️ مجموعات الحسابات — تقسيم الحسابات على الملاحم/المجموعات
// Account groups: the admin's own way of carving the account list into the
// units the business actually thinks in — a butchery, a region, a shift.
//
// ── Why this is not derived automatically ───────────────────────────────────
// Every account already carries `allowed_branches`, so the list CAN be grouped
// by branch with no setup at all — and it is (see `autoGroupByBranch`). But a
// branch is not a team: one account is allowed into five branches, a district
// supervisor belongs with his shops rather than in five places at once, and
// head-office accounts belong to no branch and would all pile into "بلا فرع".
// So the automatic view is offered as the zero-effort default, and a custom
// grouping the admin defines by hand sits alongside it for when the automatic
// answer is not the real org chart.
//
// ── Storage ─────────────────────────────────────────────────────────────────
// One config record on the server, exactly like `staff_directory`:
//   type = account_groups , payload.reportDate = "config"
// PUT /api/reports upserts on (type, reportDate), so there is always one row.
// localStorage is a cache for first paint only — never a standalone store.

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../config/api";

export const GROUPS_TYPE = "account_groups";
const GROUPS_KEY = "config";
export const GROUPS_CACHE_KEY = "account_groups_cache_v1";
export const GROUPS_EVENT = "account_groups_changed";

/* A group's colour is picked from a fixed set rather than a free colour input:
   these are the only ones that stay legible as a chip on both the light list
   and the dark shell the accounts screen renders inside. */
export const GROUP_COLORS = [
  { id: "teal", dot: "#0d9488", bg: "#ccfbf1", text: "#115e59" },
  { id: "blue", dot: "#2563eb", bg: "#dbeafe", text: "#1e3a8a" },
  { id: "violet", dot: "#7c3aed", bg: "#ede9fe", text: "#4c1d95" },
  { id: "amber", dot: "#d97706", bg: "#fef3c7", text: "#78350f" },
  { id: "rose", dot: "#e11d48", bg: "#ffe4e6", text: "#9f1239" },
  { id: "emerald", dot: "#059669", bg: "#d1fae5", text: "#065f46" },
  { id: "slate", dot: "#475569", bg: "#e2e8f0", text: "#1e293b" },
  { id: "cyan", dot: "#0891b2", bg: "#cffafe", text: "#155e75" },
];

export const colorOf = (id) => GROUP_COLORS.find((c) => c.id === id) || GROUP_COLORS[0];

const s = (v) => String(v ?? "").trim();

const newId = () =>
  `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** A stored group, with every field defaulted so a half-written record still
 *  renders instead of throwing somewhere deep in the list. */
export function normalizeGroup(g) {
  if (!g) return null;
  const name = s(g.name);
  const nameAr = s(g.nameAr);
  if (!name && !nameAr) return null;
  return {
    id: s(g.id) || newId(),
    name: name || nameAr,
    nameAr,
    icon: s(g.icon) || "🏬",
    color: GROUP_COLORS.some((c) => c.id === g.color) ? g.color : "teal",
    // Usernames, not ids: an account can be deleted and recreated, and the
    // name is what the admin recognises in the assignment list.
    members: Array.from(new Set((Array.isArray(g.members) ? g.members : []).map(s).filter(Boolean))),
    // Optional: branches this group stands for. Used to offer "add everyone
    // who can reach POS 15" in one click — never to compute membership, which
    // stays explicit.
    branches: Array.from(new Set((Array.isArray(g.branches) ? g.branches : []).map(s).filter(Boolean))),
    order: Number.isFinite(Number(g.order)) ? Number(g.order) : 0,
  };
}

export const sortGroups = (list) =>
  [...(list || [])].sort(
    (a, b) => (a.order - b.order) || String(a.name).localeCompare(String(b.name))
  );

/* ══════════════════════════════════════ cache */

export function loadGroupsCache() {
  try {
    const raw = localStorage.getItem(GROUPS_CACHE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return sortGroups((Array.isArray(arr) ? arr : []).map(normalizeGroup).filter(Boolean));
  } catch {
    return [];
  }
}

function saveGroupsCache(list) {
  try {
    localStorage.setItem(GROUPS_CACHE_KEY, JSON.stringify(list));
  } catch {
    /* a full or blocked storage must never break the screen */
  }
}

/* ══════════════════════════════════════ server */

/** Returns the group list, or null when the server could not be reached. */
export async function fetchAccountGroups(signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(GROUPS_TYPE)}&limit=5`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row =
      rows.find((r) => String(r?.payload?.reportDate || "") === GROUPS_KEY) || rows[0] || null;
    const list = row?.payload?.groups;
    return sortGroups((Array.isArray(list) ? list : []).map(normalizeGroup).filter(Boolean));
  } catch {
    return null;
  }
}

/** Writes the whole list back. PUT upserts on (type, reportDate) — one row. */
export async function saveAccountGroups(list, user = "") {
  const groups = sortGroups((Array.isArray(list) ? list : []).map(normalizeGroup).filter(Boolean))
    .map((g, i) => ({ ...g, order: i }));
  const payload = {
    reportDate: GROUPS_KEY,
    groups,
    updatedAt: new Date().toISOString(),
    updatedBy: user || "",
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "account-groups", type: GROUPS_TYPE, payload }),
  });
  if (!res.ok) {
    throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  }
  saveGroupsCache(groups);
  try {
    window.dispatchEvent(new CustomEvent(GROUPS_EVENT, { detail: groups }));
  } catch {
    /* CustomEvent is unavailable in some embedded webviews */
  }
  return groups;
}

/* ══════════════════════════════════════ hook */

export function useAccountGroups() {
  const [groups, setGroups] = useState(loadGroupsCache);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async (signal) => {
    setLoading(true);
    const list = await fetchAccountGroups(signal);
    if (list) {
      setGroups(list);
      saveGroupsCache(list);
      setError("");
    } else {
      // The cache already painted; say the list may be stale rather than
      // wiping it and pretending there are no groups.
      setError("offline");
    }
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    reload(ac.signal);
    return () => ac.abort();
  }, [reload]);

  useEffect(() => {
    const onChanged = (e) => {
      if (Array.isArray(e?.detail)) setGroups(e.detail);
    };
    window.addEventListener(GROUPS_EVENT, onChanged);
    return () => window.removeEventListener(GROUPS_EVENT, onChanged);
  }, []);

  const save = useCallback(async (next, user) => {
    const saved = await saveAccountGroups(next, user);
    setGroups(saved);
    return saved;
  }, []);

  return { groups, setGroups, loading, error, reload, save };
}

/* ══════════════════════════════════════ list operations (pure) */

export function upsertGroup(list, group) {
  const rec = normalizeGroup(group);
  if (!rec) throw new Error("Group name is required");
  const i = (list || []).findIndex((g) => g.id === rec.id);
  if (i < 0) return [...(list || []), rec];
  const next = [...list];
  next[i] = rec;
  return next;
}

export const removeGroup = (list, id) => (list || []).filter((g) => g.id !== id);

/** Move an account into a group — and out of every other one, because a
 *  membership that appears twice makes the grouped list show one account in
 *  two places and the counts stop adding up. */
export function assignMember(list, username, groupId) {
  const u = s(username);
  if (!u) return list || [];
  return (list || []).map((g) => {
    const has = g.members.includes(u);
    if (g.id === groupId) return has ? g : { ...g, members: [...g.members, u] };
    return has ? { ...g, members: g.members.filter((m) => m !== u) } : g;
  });
}

export const unassignMember = (list, username) => assignMember(list, username, null);

/** The group one account belongs to, or null. */
export const groupOfUser = (list, username) =>
  (list || []).find((g) => g.members.includes(s(username))) || null;

/* ══════════════════════════════════════ automatic grouping */

/** Every branch an account can reach, across all sections, de-duplicated. */
export function branchesOfUser(user) {
  const raw = user?.allowed_branches ?? user?.allowedBranches;
  const out = new Set();
  if (Array.isArray(raw)) raw.forEach((b) => s(b) && out.add(s(b)));
  else if (raw && typeof raw === "object") {
    Object.values(raw).forEach((list) => {
      if (Array.isArray(list)) list.forEach((b) => s(b) && out.add(s(b)));
    });
  }
  return Array.from(out).sort();
}

export const NO_BRANCH = "__none__";
export const UNGROUPED = "__ungrouped__";

/**
 * Group accounts by the branches they are allowed into.
 *
 * An account allowed into three branches is listed under all three — that is
 * the honest answer to "who can work on POS 15", which is the question this
 * view exists to answer. It does mean the bucket counts add up to more than
 * the number of accounts, so the caller must label them as memberships.
 */
export function autoGroupByBranch(users, { fullAccessLabel = "⭐ Full access" } = {}) {
  const buckets = new Map();
  const put = (key, label, user) => {
    if (!buckets.has(key)) buckets.set(key, { key, label, users: [] });
    buckets.get(key).users.push(user);
  };
  (users || []).forEach((u) => {
    // A full-access or admin account reaches every branch; listing it under
    // all thirty would drown the real assignment in every single bucket.
    if (u?.is_admin || (Array.isArray(u?.permissions) && u.permissions.includes("*"))) {
      put("__all__", fullAccessLabel, u);
      return;
    }
    const branches = branchesOfUser(u);
    if (!branches.length) put(NO_BRANCH, "—", u);
    else branches.forEach((b) => put(b, b, u));
  });
  return Array.from(buckets.values()).sort((a, b) => {
    // "everything" first, "nothing" last, the real branches in between.
    const rank = (k) => (k === "__all__" ? 0 : k === NO_BRANCH ? 2 : 1);
    return rank(a.key) - rank(b.key) || String(a.label).localeCompare(String(b.label));
  });
}

/** Group accounts by the admin's own groups, with the leftovers last. */
export function groupByCustom(users, groups, { ungroupedLabel = "Ungrouped" } = {}) {
  const out = sortGroups(groups).map((g) => ({
    key: g.id,
    label: g.nameAr ? `${g.name} — ${g.nameAr}` : g.name,
    group: g,
    users: [],
  }));
  const byId = new Map(out.map((b) => [b.key, b]));
  const rest = { key: UNGROUPED, label: ungroupedLabel, group: null, users: [] };
  (users || []).forEach((u) => {
    const g = groupOfUser(groups, u?.username);
    if (g && byId.has(g.id)) byId.get(g.id).users.push(u);
    else rest.users.push(u);
  });
  return rest.users.length ? [...out, rest] : out;
}
