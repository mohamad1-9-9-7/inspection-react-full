// src/industries/catalog.js
// The company CATEGORIES the platform sells — one entry per industry.
//
// Pure data (no React, no pages) so the Platform Center, the Companies form
// and the backup catalog can all read it without pulling any report page into
// their bundle.
//
// A category is how the owner files companies: every company has exactly one
// `industry`, and the Platform Center groups its cards under these headings.
// The report system a company opens is decided by the same id:
//   meat   → the hand-built Al Mawashi system (no template)
//   others → the generic company app driven by industries/<id>/index.js
//
// Add a category: add it here AND register its template in industries/index.js.
// `order` sorts the headings; colours follow the Mawashi teal family except
// where an existing company already shows its own colour (sweets keeps its tag).

export const INDUSTRY_CATEGORIES = [
  {
    id: "meat",
    order: 1,
    icon: "🥩",
    label: "Meat",
    labelAr: "اللحوم",
    long: "Meat manufacturing (Al Mawashi system)",
    opens: "Al Mawashi QMS",
    grad: "linear-gradient(135deg,#0f766e,#0891b2)",
    glow: "rgba(15,118,110,.35)",
    tint: "#0f766e",
  },
  {
    id: "sweets",
    order: 2,
    icon: "🍬",
    label: "Confectionery",
    labelAr: "الحلويات",
    long: "Confectionery",
    opens: "Company app",
    grad: "linear-gradient(135deg,#ec4899,#be185d)",
    glow: "rgba(190,24,93,.35)",
    tint: "#be185d",
  },
  {
    id: "restaurant",
    kit: true, // built from the shared industry kit (industries/_kit)
    order: 3,
    icon: "🍽️",
    label: "Restaurants",
    labelAr: "المطاعم",
    long: "Restaurants & kitchens",
    opens: "Company app",
    grad: "linear-gradient(135deg,#ea580c,#c2410c)",
    glow: "rgba(234,88,12,.32)",
    tint: "#c2410c",
  },
  {
    id: "retail",
    kit: true, // built from the shared industry kit (industries/_kit)
    order: 4,
    icon: "🛒",
    label: "Supermarkets",
    labelAr: "السوبرماركت",
    long: "Supermarkets & food retail",
    opens: "Company app",
    grad: "linear-gradient(135deg,#16a34a,#15803d)",
    glow: "rgba(22,163,74,.32)",
    tint: "#15803d",
  },
  {
    id: "warehouse",
    kit: true, // built from the shared industry kit (industries/_kit)
    order: 5,
    icon: "📦",
    label: "Warehouses",
    labelAr: "المستودعات",
    long: "Storage & distribution warehouses",
    opens: "Company app",
    grad: "linear-gradient(135deg,#2563eb,#1d4ed8)",
    glow: "rgba(37,99,235,.32)",
    tint: "#1d4ed8",
  },
  {
    id: "factory",
    kit: true, // built from the shared industry kit (industries/_kit)
    order: 6,
    icon: "🏭",
    label: "Manufacturing",
    labelAr: "معامل التصنيع",
    long: "Food manufacturing plants",
    opens: "Company app",
    grad: "linear-gradient(135deg,#7c3aed,#6d28d9)",
    glow: "rgba(124,58,237,.32)",
    tint: "#6d28d9",
  },
];

/** Industries built from the shared kit (pages/industry-kit + industries/_kit). */
export const KIT_INDUSTRY_IDS = INDUSTRY_CATEGORIES.filter((c) => c.kit).map((c) => c.id);

const BY_ID = Object.fromEntries(INDUSTRY_CATEGORIES.map((c) => [c.id, c]));

/** Unknown / legacy values fall into a neutral bucket instead of breaking. */
const OTHER = {
  id: "other",
  order: 99,
  icon: "🏢",
  label: "Other",
  labelAr: "أخرى",
  long: "Other",
  opens: "Company app",
  grad: "linear-gradient(135deg,#6366f1,#4f46e5)",
  glow: "rgba(99,102,241,.35)",
  tint: "#4f46e5",
};

/** Category of a company's `industry` value ("" / null = meat, the default). */
export function categoryOf(industry) {
  const k = String(industry || "meat").trim().toLowerCase();
  return BY_ID[k] || OTHER;
}
