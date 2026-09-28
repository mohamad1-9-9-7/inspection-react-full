// src/industries/_kit/kitRegistry.js
// Every report of every kit industry, as pure data (no React, no pages) —
// what the templates render and what the backup catalog lists.
//
// An industry's reports = the shared set (commonReports, its own copy) + its
// own specific set. Plus two register types every kit company has:
//   <industry>_ohc_certificate       — OHC card
//   <industry>_external_certificate  — BFS / PIC / EFST / HACCP… certificates
//
// Add a kit industry: create industries/<id>/reports.js, add it to SPECIFIC
// below, flag it `kit: true` in industries/catalog.js and register its
// template in industries/index.js.

import { KIT_INDUSTRY_IDS, categoryOf } from "../catalog";
import { commonReports } from "./commonReports";
import { RESTAURANT_REPORTS } from "../restaurant/reports";
import { RETAIL_REPORTS } from "../retail/reports";
import { WAREHOUSE_REPORTS } from "../warehouse/reports";
import { FACTORY_REPORTS } from "../factory/reports";

const SPECIFIC = {
  restaurant: RESTAURANT_REPORTS,
  retail: RETAIL_REPORTS,
  warehouse: WAREHOUSE_REPORTS,
  factory: FACTORY_REPORTS,
};

/** Sidebar headings, in order. A report's `group` picks one. */
export const REPORT_GROUPS = [
  { id: "operations", icon: "⚙️", label: "Operations" },
  { id: "hygiene", icon: "🧼", label: "Hygiene & Cleaning" },
  { id: "storage", icon: "📦", label: "Receiving & Storage" },
  { id: "safety", icon: "🦺", label: "Health & Safety" },
  { id: "people", icon: "👥", label: "People" },
  { id: "quality", icon: "✅", label: "Quality & Corrective Action" },
];

/** Every log-sheet schema of one kit industry: its own reports first. */
export function kitSchemasFor(id) {
  if (!SPECIFIC[id]) throw new Error(`[industry kit] unknown industry "${id}"`);
  return [...SPECIFIC[id], ...commonReports(id)];
}

/** The two register types every kit company keeps next to its log sheets. */
export const registerTypesFor = (id) => ({
  ohc: `${id}_ohc_certificate`,
  certificates: `${id}_external_certificate`,
});

/* Guard at load time: every kit industry has reports, and no report type is
   written by two industries (or twice by one). A clash throws here — in
   development, on the first import — instead of silently mixing data. */
(function assertUniqueTypes() {
  const owner = {};
  KIT_INDUSTRY_IDS.forEach((id) => {
    const reg = registerTypesFor(id);
    [...kitSchemasFor(id).map((s) => s.type), reg.ohc, reg.certificates].forEach((type) => {
      if (!type.startsWith(`${id}_`)) throw new Error(`[industry kit] ${type} is not prefixed with ${id}_`);
      if (owner[type]) throw new Error(`[industry kit] report type ${type} is defined twice`);
      owner[type] = id;
    });
  });
})();

/** Backup / data-inventory modules of one kit industry (reportTypeCatalog). */
export function kitReportModules(id) {
  const cat = categoryOf(id);
  const up = id.toUpperCase();
  const schemas = kitSchemasFor(id);
  const groupLabel = Object.fromEntries(REPORT_GROUPS.map((g) => [g.id, g.label]));
  const reg = registerTypesFor(id);
  return [
    {
      id: `${up}_DAILY`,
      label: "Daily Reports",
      emoji: "📋",
      types: schemas.map((s) => [s.type, s.label, groupLabel[s.group] || "Other"]),
    },
    {
      id: `${up}_CERTS`,
      label: "OHC & External Certificates",
      emoji: cat.icon,
      types: [
        [reg.ohc, "OHC Certificates"],
        [reg.certificates, "External Certificates"],
      ],
    },
  ];
}
