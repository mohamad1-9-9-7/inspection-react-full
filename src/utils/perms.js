// src/utils/perms.js
// 🔐 Central permissions helper — single source of truth for what a user can see/do.
//
// Reads currentUser from localStorage (written by Login.jsx) and exposes
// boolean checks. Buttons/menus should call these instead of rendering blindly.
//
// Usage:
//   import { getPerms, can, canEdit, canDelete } from "../utils/perms";
//   const p = getPerms();
//   if (p.isAdmin || canEdit("daily")) { ... render Edit button ... }

/** Read the cached user object from localStorage. Safe to call anytime. */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Returns a stable permissions snapshot for the current user. */
export function getPerms() {
  const u = getCurrentUser();
  const permissions = Array.isArray(u.permissions) ? u.permissions : [];
  const crudPerms   = (u.crudPerms && typeof u.crudPerms === "object") ? u.crudPerms : {};
  const isFullAccess = permissions.includes("*");
  const isAdmin      = !!u.isAdmin;

  return {
    user: u,
    isAdmin,
    isFullAccess,
    permissions,
    crudPerms,
    /** Branches the user is restricted to, by section. {} means no restriction. */
    allowedBranches: normalizeBranches(u.allowedBranches),
  };
}

/** Normalize allowedBranches into an object keyed by section ID. */
export function normalizeBranches(val) {
  if (Array.isArray(val)) {
    // Legacy flat array — apply to all sections that historically used branches
    return { daily: [...val], admin: [...val] };
  }
  if (val && typeof val === "object") {
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      out[k] = Array.isArray(v) ? v : [];
    }
    return out;
  }
  return {};
}

/**
 * Does the user have a specific CRUD operation on a section?
 * Admin / Full Access bypass all checks.
 *
 * @param {string} section  - section ID (e.g. "daily", "admin", "returns")
 * @param {string} op       - one of "view" | "write" | "edit" | "delete"
 */
export function can(section, op) {
  const p = getPerms();
  if (p.isAdmin || p.isFullAccess) return true;
  const ops = p.crudPerms[section];
  return Array.isArray(ops) && ops.includes(op);
}

/** Shorthands for the most common checks. */
export const canView   = (section) => can(section, "view");
export const canWrite  = (section) => can(section, "write");
export const canEdit   = (section) => can(section, "edit");
export const canDelete = (section) => can(section, "delete");

/** Does the user have ANY access to a section? */
export function hasSection(section) {
  const p = getPerms();
  if (p.isAdmin || p.isFullAccess) return true;
  const ops = p.crudPerms[section];
  return Array.isArray(ops) && ops.length > 0;
}

/**
 * Is a branch accessible to this user under a given section?
 * Returns true if no restriction is configured for that section.
 */
export function branchAllowed(section, branchId) {
  const p = getPerms();
  if (p.isAdmin || p.isFullAccess) return true;
  const list = p.allowedBranches[section];
  if (!Array.isArray(list) || list.length === 0) return true; // no restriction
  return list.includes(branchId);
}

/** Filter an array of branch IDs to those allowed for the given section. */
export function filterBranches(section, branchIds) {
  const p = getPerms();
  if (p.isAdmin || p.isFullAccess) return [...branchIds];
  const list = p.allowedBranches[section];
  if (!Array.isArray(list) || list.length === 0) return [...branchIds];
  return branchIds.filter(id => list.includes(id));
}
