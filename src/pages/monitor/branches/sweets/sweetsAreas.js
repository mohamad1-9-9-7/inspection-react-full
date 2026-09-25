// src/pages/monitor/branches/sweets/sweetsAreas.js
// The confectionery factory's own areas — the location list for sweets forms
// (NCR, …). Deliberately independent of inspection/inspectionBranches.js,
// which belongs to the other company.

export const SWEETS_AREAS = [
  { code: "RM-STORE", icon: "📦", labelEn: "Raw Material Store" },
  { code: "PROD", icon: "🥣", labelEn: "Mixing & Preparation" },
  { code: "BAKE", icon: "🔥", labelEn: "Baking Area" },
  { code: "CREAM", icon: "🍰", labelEn: "Cream & Decoration Room" },
  { code: "PACK", icon: "🎁", labelEn: "Packaging Area" },
  { code: "FG-STORE", icon: "🏬", labelEn: "Finished Goods Store" },
  { code: "COLD", icon: "❄️", labelEn: "Chillers & Freezers" },
  { code: "LOADING", icon: "🚚", labelEn: "Loading Bay" },
  { code: "STAFF", icon: "🚻", labelEn: "Staff Facilities" },
  { code: "OTHER", icon: "📍", labelEn: "Other" },
];

const norm = (v) => String(v || "").trim().toLowerCase();

export function canonicalSweetsArea(v) {
  const n = norm(v);
  if (!n) return "";
  const hit = SWEETS_AREAS.find((a) => norm(a.code) === n || norm(a.labelEn) === n);
  return hit ? hit.code : String(v).trim();
}

export const isKnownSweetsArea = (v) => SWEETS_AREAS.some((a) => a.code === v);

export function sweetsAreaLabel(v) {
  const hit = SWEETS_AREAS.find((a) => a.code === canonicalSweetsArea(v));
  return hit ? hit.labelEn : String(v || "");
}
