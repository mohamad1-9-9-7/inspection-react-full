// src/config/branches.js
// ───────────────────────────────────────────────────────────────────────────
// Canonical branch registry — single source of truth for branch ids/labels.
// Used by the monitor dashboard, the per-branch delete-button settings, and the
// route-aware delete guard. Keep this list in sync with the monitor dashboard.
// ───────────────────────────────────────────────────────────────────────────

export const BRANCHES = [
  { id: "QCS",        label: "QCS",               type: "qcs"     },
  { id: "PRODUCTION", label: "PRODUCTION",        type: "prod"    },
  { id: "POS 6",      label: "POS 6",             type: "pos"     },
  { id: "POS 7",      label: "POS 7",             type: "pos"     },
  { id: "POS 10",     label: "POS 10",            type: "pos"     },
  { id: "POS 11",     label: "POS 11",            type: "pos"     },
  { id: "POS 14",     label: "POS 14",            type: "pos"     },
  { id: "POS 15",     label: "POS 15",            type: "pos"     },
  { id: "POS 16",     label: "POS 16",            type: "pos"     },
  { id: "POS 17",     label: "POS 17",            type: "pos"     },
  { id: "POS 18",     label: "POS 18",            type: "pos"     },
  { id: "POS 19",     label: "Al Warqa Kitchen",  type: "kitchen" },
  { id: "POS 21",     label: "POS 21",            type: "pos"     },
  { id: "POS 24",     label: "POS 24",            type: "pos"     },
  { id: "POS 25",     label: "POS 25",            type: "pos"     },
  { id: "POS 26",     label: "POS 26",            type: "pos"     },
  { id: "POS 31",     label: "POS 31",            type: "pos"     },
  { id: "POS 34",     label: "POS 34",            type: "pos"     },
  { id: "POS 35",     label: "POS 35",            type: "pos"     },
  { id: "POS 36",     label: "POS 36",            type: "pos"     },
  { id: "POS 37",     label: "POS 37",            type: "pos"     },
  { id: "POS 38",     label: "POS 38",            type: "pos"     },
  { id: "POS 41",     label: "POS 41",            type: "pos"     },
  { id: "POS 42",     label: "POS 42",            type: "pos"     },
  { id: "POS 43",     label: "POS 43",            type: "pos"     },
  { id: "POS 44",     label: "POS 44",            type: "pos"     },
  { id: "POS 45",     label: "POS 45",            type: "pos"     },
  { id: "FTR 1",      label: "FTR 1",             type: "ftr"     },
  { id: "FTR 2",      label: "FTR 2",             type: "ftr"     },
];

export const BRANCH_TYPE_META = {
  qcs:     { badge: "Quality Control", badgeAr: "ضبط الجودة",   icon: "🛡️" },
  prod:    { badge: "Production",      badgeAr: "الإنتاج",       icon: "🏭" },
  pos:     { badge: "Point of Sale",  badgeAr: "نقطة بيع",      icon: "🏪" },
  kitchen: { badge: "Kitchen Branch", badgeAr: "فرع مطبخ",      icon: "👨‍🍳" },
  ftr:     { badge: "FTR Branch",     badgeAr: "فرع FTR",       icon: "🚚" },
};

// "POS 10" -> "pos10" — matches the slug used in monitor routes.
export const toSlug = (id) => String(id).trim().toLowerCase().replace(/\s+/g, "");

// Reverse lookup: slug -> branch id.
const SLUG_TO_ID = BRANCHES.reduce((acc, b) => {
  acc[toSlug(b.id)] = b.id;
  return acc;
}, {});

/**
 * Resolve the active branch id from a URL pathname.
 * Returns the branch id (e.g. "POS 10", "QCS") or null when the path is not a
 * branch page (training, inspection, hse, settings, …).
 */
export function branchIdFromPath(pathname = "") {
  const path = String(pathname).toLowerCase();
  const segs = path.split("/").filter(Boolean);

  // Exact slug match on any path segment: /monitor/pos10, /monitor/ftr1, …
  for (const seg of segs) {
    if (SLUG_TO_ID[seg]) return SLUG_TO_ID[seg];
  }

  // Special cases where the branch is implied but not a clean slug segment.
  if (path.includes("qcs")) return "QCS";                       // /qcs-raw-material-view, …
  if (path.includes("production") || path.includes("/prd")) return "PRODUCTION";

  return null;
}
