// src/industries/sweets/index.js
// Sweets (Confectionery) industry template.
//
// Each report reuses the EXACT QCS report design (copied into
// src/pages/monitor/branches/sweets/, English, with sweets_* report types so
// data never mixes with any other company). Company data is additionally
// isolated by company_id at the API layer.
//
// Two dashboard cards:
//   "daily" (entry) → open a report's INPUT page.
//   "view"  (viewer) → open a report's VIEW page (browse/read).
//
// Add a report: create/copy its Input + View components, then add one entry
// to REPORTS below. Nothing else changes.
import { lazy } from "react";

const REPORTS = [
  {
    type: "sweets-ph",
    icon: "🧼",
    label: "Personal Hygiene",
    desc: "Personal hygiene checklist",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/PersonalHygieneTab")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/PersonalHygieneView")),
  },
  {
    type: "sweets-clean",
    icon: "🧽",
    label: "Daily Cleanliness",
    desc: "Daily cleaning checklist",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/DailyCleanlinessTab")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/DailyCleanlinessView")),
  },
  {
    type: "sweets-coolers",
    icon: "🌡️",
    label: "Cooler Temperatures",
    desc: "5 coolers + freezer temperature log",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/CoolersTab")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/CoolersView")),
  },
  {
    type: "sweets_visitor_checklist",
    icon: "🚶",
    label: "Visitor Checklist",
    desc: "Visitor log & hygiene compliance",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/VisitorChecklistInput")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/VisitorChecklistView")),
  },
  {
    type: "sweets_non_conformance",
    icon: "⚠️",
    label: "Non-Conformance",
    desc: "Non-conformance reports (NCR)",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/NonConformanceReportInput")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/NonConformanceReportsView")),
  },
  {
    type: "sweets_product_rejection",
    icon: "🚫",
    label: "Product Rejection",
    desc: "Rejected products & decisions",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/ProductRejectionInput")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/ProductRejectionView")),
  },
  {
    type: "sweets_pest_control",
    icon: "🐜",
    label: "Pest Control",
    desc: "Pest control visits & findings",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/PestControlInput")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/PestControlView")),
  },
  {
    type: "sweets_staff_sickness",
    icon: "🤒",
    label: "Sick Employee",
    desc: "Staff sickness / fitness to work",
    Input: lazy(() => import("../../pages/monitor/branches/sweets/StaffSicknessInput")),
    View: lazy(() => import("../../pages/monitor/branches/sweets/StaffSicknessView")),
  },
];

const sweets = {
  id: "sweets",
  label: "Confectionery",
  labelEn: "Confectionery",
  icon: "🍰",
  branch: "Main Branch", // single branch; stamped where relevant

  cards: [
    {
      id: "daily",
      kind: "entry",
      label: "Daily Reports",
      desc: "Fill in the daily operation reports",
      icon: "📋",
      grad: "linear-gradient(135deg,#ec4899,#be185d)",
      reports: REPORTS,
    },
    {
      id: "view",
      kind: "viewer",
      label: "View Reports",
      desc: "Browse all saved reports",
      icon: "🗂️",
      grad: "linear-gradient(135deg,#0891b2,#0e7490)",
      reports: REPORTS,
    },
  ],
};

export default sweets;
