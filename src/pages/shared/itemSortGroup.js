// itemSortGroup.js
// Shared helpers for sorting and grouping report items before they are
// rendered into the email body or the PDF export. Used by BrowseReturns
// and BrowseCustomerReturns; designed to be extended for other reports.

/* ─── Field extractors (tolerant of varying row shapes) ─── */

const branchOf  = (r) => String(r?.butchery || r?.pos || r?.customer || "").trim();
const actionOf  = (r) => {
  const a = r?.action;
  if (a === "إجراء آخر..." || a === "Other...") return String(r?.customAction || "").trim();
  return String(a || "").trim();
};
const originOf  = (r) => String(r?.origin || "").trim();
const productOf = (r) => String(r?.productName || "").trim();
const expiryOf  = (r) => String(r?.expiry || "").trim();

/* Friendly comparator: blanks always sink to the bottom. */
const cmp = (a, b) => {
  const av = (a || "").toString().trim();
  const bv = (b || "").toString().trim();
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
};

const SORT_KEYS = {
  branch:  branchOf,
  action:  actionOf,
  origin:  originOf,
  product: productOf,
  expiry:  expiryOf,
};

const GROUP_KEYS = {
  branch: branchOf,
  action: actionOf,
  origin: originOf,
};

/**
 * Returns a new array of items, sorted per `sortBy` (or original order).
 * sortBy: "default" | "branch" | "action" | "origin" | "product" | "expiry"
 */
export function sortItems(items, sortBy) {
  if (!Array.isArray(items)) return [];
  if (!sortBy || sortBy === "default" || !SORT_KEYS[sortBy]) return items.slice();
  const extractor = SORT_KEYS[sortBy];
  return items
    .map((row, originalIndex) => ({ row, originalIndex }))
    .sort((a, b) => {
      const c = cmp(extractor(a.row), extractor(b.row));
      return c !== 0 ? c : a.originalIndex - b.originalIndex;
    })
    .map((x) => x.row);
}

/**
 * Returns an ordered array of groups: [{ key, label, items }, …]
 * groupBy: "none" | "branch" | "action" | "origin"
 * If groupBy === "none" → a single group with key="" and the items as-is.
 * Items inside each group preserve the input order (sort BEFORE grouping if you
 * want sorted groups).
 */
export function groupItems(items, groupBy) {
  if (!Array.isArray(items)) return [{ key: "", label: "", items: [] }];
  if (!groupBy || groupBy === "none" || !GROUP_KEYS[groupBy]) {
    return [{ key: "", label: "", items: items.slice() }];
  }
  const extractor = GROUP_KEYS[groupBy];
  const order = [];           // insertion order
  const groups = new Map();
  for (const row of items) {
    const raw = extractor(row);
    const key = raw || "—";
    if (!groups.has(key)) {
      groups.set(key, { key, label: raw || "(غير محدد)", items: [] });
      order.push(key);
    }
    groups.get(key).items.push(row);
  }
  // Sort groups alphabetically, but keep "(غير محدد)" at the very end.
  order.sort((a, b) => {
    if (a === "—" && b !== "—") return 1;
    if (b === "—" && a !== "—") return -1;
    return cmp(a, b);
  });
  return order.map((k) => groups.get(k));
}

/**
 * Convenience: sort then group in one call.
 * Returns: { groups: [{key,label,items}], totalCount, flatSortedItems }
 */
export function arrangeItems(items, { sortBy = "default", groupBy = "none" } = {}) {
  const sorted = sortItems(items || [], sortBy);
  const groups = groupItems(sorted, groupBy);
  return {
    groups,
    totalCount: sorted.length,
    flatSortedItems: sorted,
  };
}

/* Human label for the group-by field — useful in headings */
export const GROUP_LABEL = {
  none:   { en: "—",       ar: "—" },
  branch: { en: "Branch",  ar: "الفرع" },
  action: { en: "Action",  ar: "الإجراء" },
  origin: { en: "Origin",  ar: "المنشأ" },
};
