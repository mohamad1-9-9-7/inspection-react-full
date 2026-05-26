// src/utils/sectionItems.js
// 🔐 Shared registry of "items" that can be restricted inside each top-level section.
//
// Each top-level icon on the dashboard is a "section" (e.g. "daily", "admin", "returns", "ohc").
// Inside each section, there are either:
//   - BRANCHES (physical locations like "POS 15", "FTR 1") — used by daily / admin
//   - PAGES    (cards on the hub page like "Browse Meat Daily")
//   - NONE     (the section is a single page — no inner restriction)
//
// The same item IDs are used in two places:
//   1) Settings → Accounts Management → save into allowedBranches[section] = [id, ...]
//   2) Hub pages (OHCHub, ReturnsMenu, …) → filter cards by checking the id

export const SECTION_ITEMS = {
  // ── branch-based ──
  daily: { kind: "branches" },
  admin: { kind: "branches" },

  // ── page-based ──
  returns: {
    kind: "pages",
    items: [
      // Browse (left column on ReturnsMenu)
      { id: "returns.browse",         icon: "📂", label: "Browse Returns Reports" },
      { id: "meatDaily.browse",       icon: "📊", label: "Browse Meat Daily" },
      { id: "customerReturns.browse", icon: "👤", label: "Browse Customer Returns" },
      { id: "inventory.browse",       icon: "📦", label: "Browse Inventory Daily" },
      { id: "enoc.browse",            icon: "⛽", label: "Browse ENOC Returns" },
      // Create (right column on ReturnsMenu)
      { id: "returns.create",         icon: "📝", label: "Create Returns Report" },
      { id: "meatDaily.create",       icon: "🧾", label: "Create Meat Daily Report" },
      { id: "customerReturns.create", icon: "✍️", label: "Create Customer Returns" },
      { id: "inventory.create",       icon: "🧮", label: "Create Inventory Daily Report" },
      { id: "enoc.create",            icon: "⛽", label: "Create ENOC Returns Report" },
    ],
  },
  ohc: {
    kind: "pages",
    items: [
      { id: "ohc.upload", icon: "📥", label: "Upload New Certificate" },
      { id: "ohc.view",   icon: "📋", label: "View / Browse Certificates" },
    ],
  },

  // ── system-wide sections — no inner restriction (full access if section is granted) ──
  inspector:        { kind: "none" },
  supervisor:       { kind: "none" },
  finalProduct:     { kind: "none" },
  cars:             { kind: "none" },
  maintenance:      { kind: "none" },
  qcsView:          { kind: "none" },
  training:         { kind: "none" },
  internalTraining: { kind: "none" },
  iso:              { kind: "none" },
  halalAudit:       { kind: "none" },
  hse:              { kind: "none" },
  settings:         { kind: "none" },
};

/**
 * Check whether a specific page id is visible to the current user under a given section.
 *  - Admin / Full Access → always true
 *  - No restriction list configured for that section → true
 *  - Restriction list non-empty and id is in it → true
 *  - Restriction list non-empty and id is NOT in it → false
 */
export function isItemAllowed(section, itemId) {
  let user = {};
  try { user = JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { /* ignore */ }
  if (user.isAdmin) return true;
  if (Array.isArray(user.permissions) && user.permissions.includes("*")) return true;

  const ab = user.allowedBranches;
  // Legacy array format applied only to daily/admin historically — ignore for page-based sections.
  if (Array.isArray(ab)) return true;

  const list = ab && Array.isArray(ab[section]) ? ab[section] : null;
  if (!list || list.length === 0) return true; // no restriction set
  return list.includes(itemId);
}
