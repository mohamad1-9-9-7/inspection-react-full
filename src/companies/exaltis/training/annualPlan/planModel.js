// src/companies/exaltis/training/annualPlan/planModel.js
// Annual training plan — modules, branches, months and matrix helpers.
// (Split out of TrainingAnnualPlan.jsx — the code is unchanged.)
import { SWEETS_MODULES, SWEETS_MONTHLY_FOCUS } from "../content";
import { SWEETS_AREAS } from "../../reports/sweetsAreas";

export function sessionDate(r) {
  const raw = r?.payload?.date || r?.payload?.reportDate || r?.created_at || r?.createdAt || r?.created || r?.timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}

export function sessionBranch(r) {
  return String(r?.branch || r?.payload?.branch || r?.payload?.BRANCH || "").trim();
}

export function sessionModule(r) {
  return String(r?.payload?.moduleName || r?.payload?.module || "").trim();
}

export function sessionTitle(r) {
  return String(r?.title || r?.payload?.title || r?.payload?.documentTitle || "").trim();
}

/* normalize for matching — lowercase, trim, collapse spaces */
export function normalizeModule(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/* Free-typed module names from older sessions → this company's module names. */
export const MODULE_MATCH_ALIASES = new Map([
  ["hygiene", "Personal Hygiene & Handwashing"],
  ["personal hygiene", "Personal Hygiene & Handwashing"],
  ["handwashing", "Personal Hygiene & Handwashing"],
  ["allergen", "Allergen Control"],
  ["allergens", "Allergen Control"],
  ["cream", "High-Risk Fillings: Cream, Custard & Cheese"],
  ["custard", "High-Risk Fillings: Cream, Custard & Cheese"],
  ["fillings", "High-Risk Fillings: Cream, Custard & Cheese"],
  ["baking", "Baking, Cooking & Sugar Syrups"],
  ["cooking", "Baking, Cooking & Sugar Syrups"],
  ["syrup", "Baking, Cooking & Sugar Syrups"],
  ["cooling", "Cooling, Chilled Storage & Display"],
  ["display", "Cooling, Chilled Storage & Display"],
  ["chilled storage", "Cooling, Chilled Storage & Display"],
  ["thawing", "Thawing (Defrosting)"],
  ["defrosting", "Thawing (Defrosting)"],
  ["receiving", "Receiving & Dry Store"],
  ["dry store", "Receiving & Dry Store"],
  ["storage", "Receiving & Dry Store"],
  ["cleaning", "Cleaning & Sanitation"],
  ["sanitation", "Cleaning & Sanitation"],
  ["cleaning & sanitation", "Cleaning & Sanitation"],
  ["foreign body", "Foreign Body & Cross-Contamination"],
  ["cross contamination", "Foreign Body & Cross-Contamination"],
  ["pest control", "Pest Control Awareness"],
  ["pests", "Pest Control Awareness"],
  ["labelling", "Labelling, Shelf Life & Traceability"],
  ["labeling", "Labelling, Shelf Life & Traceability"],
  ["shelf life", "Labelling, Shelf Life & Traceability"],
  ["traceability", "Labelling, Shelf Life & Traceability"],
  ["haccp", "HACCP Basics for Confectionery"],
  ["haccp basics", "HACCP Basics for Confectionery"],
  ["burns", "OHS: Ovens, Burns & Hot Sugar"],
  ["ovens", "OHS: Ovens, Burns & Hot Sugar"],
  ["ohs", "OHS: Ovens, Burns & Hot Sugar"],
]);

export function moduleMatchKey(s) {
  const n = normalizeModule(s).replace(/[—–-]/g, " ").replace(/[^\w\s/&()+]/g, " ").replace(/\s+/g, " ").trim();
  return normalizeModule(MODULE_MATCH_ALIASES.get(n) || s);
}

export function normalizeBranch(s) {
  return String(s || "").toUpperCase().replace(/\s+/g, " ").trim();
}

export function fmtDate(d) {
  if (!d) return "";
  try {
    const dd = d instanceof Date ? d : new Date(d);
    if (isNaN(dd.getTime())) return "";
    return dd.toISOString().slice(0, 10);
  } catch { return ""; }
}

/* ===================== Modules & Branches ===================== */
export const MODULES = SWEETS_MODULES;

/* ✅ مناطق مصنع الحلويات */
export const BRANCHES = SWEETS_AREAS.map((a) => ({
  key: a.labelEn,
  label: a.labelEn,
  icon: a.icon,
  aliases: [a.code, a.labelEn],
}));

export function branchAliases(branch) {
  return [branch?.key, branch?.label, ...(branch?.aliases || [])].filter(Boolean);
}

export function matchBranchFromList(rawBranch, branches = BRANCHES) {
  const n = normalizeBranch(rawBranch);
  if (!n) return null;
  for (const b of branches) {
    for (const alias of branchAliases(b)) {
      const a = normalizeBranch(alias);
      if (!a) continue;
      if (n === a) return b.key;
      if (n.startsWith(a + " ") || n.startsWith(a + "-")) return b.key;
      if (a.startsWith(n + " ") || a.startsWith(n + "-")) return b.key;
      if ((n.includes(" " + a + " ") || n.includes(a)) && a.length >= 4) return b.key;
    }
  }
  return null;
}

export function dynamicBranchIcon(name) {
  const n = normalizeBranch(name);
  if (n.startsWith("FTR") || n.includes("FOOD TRUCK")) return "🚚";
  if (n.includes("KITCHEN")) return "🍳";
  if (n.startsWith("POS")) return "🥩";
  if (n.includes("PROD")) return "🏭";
  return "🏢";
}

export function makeDynamicBranch(rawBranch) {
  const label = String(rawBranch || "").trim();
  const compact = label.replace(/\s+/g, "");
  return {
    key: label,
    label,
    icon: dynamicBranchIcon(label),
    aliases: compact && compact !== label ? [label, compact] : [label],
    dynamic: true,
  };
}

export const MONTHS = [
  { i: 1,  short: "Jan", full: "January"   },
  { i: 2,  short: "Feb", full: "February"  },
  { i: 3,  short: "Mar", full: "March"     },
  { i: 4,  short: "Apr", full: "April"     },
  { i: 5,  short: "May", full: "May"       },
  { i: 6,  short: "Jun", full: "June"      },
  { i: 7,  short: "Jul", full: "July"      },
  { i: 8,  short: "Aug", full: "August"    },
  { i: 9,  short: "Sep", full: "September" },
  { i: 10, short: "Oct", full: "October"   },
  { i: 11, short: "Nov", full: "November"  },
  { i: 12, short: "Dec", full: "December"  },
];

/* ===================== Default Plan ===================== */
export const DEFAULT_MONTHLY_FOCUS = SWEETS_MONTHLY_FOCUS;

export function buildEmptyMatrix() {
  const m = {};
  for (const b of BRANCHES) {
    m[b.key] = {};
    for (const mo of MONTHS) m[b.key][mo.i] = [];
  }
  return m;
}

export function buildDefaultMatrix() {
  const m = {};
  for (const b of BRANCHES) {
    m[b.key] = {};
    for (const mo of MONTHS) m[b.key][mo.i] = [...(DEFAULT_MONTHLY_FOCUS[mo.i] || [])];
  }
  return m;
}
