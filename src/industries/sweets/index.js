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
import { DAILY_LOG_SCHEMAS } from "../../pages/monitor/branches/sweets/dailyLogSchemas";
import { guideFor } from "../../pages/monitor/branches/sweets/sweetsReportGuides";
import { arOf } from "../../pages/monitor/branches/sweets/bilingual";

const REPORT_PAGES = [
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
  // Schema-driven daily log sheets (Dubai Municipality / HACCP records).
  // Fields + compliance limits live in sweets/dailyLogSchemas.js; one engine
  // (SweetsDailyLog.jsx) renders entry, view and exports for all of them.
  ...DAILY_LOG_SCHEMAS.map((s) => ({
    type: s.type,
    icon: s.icon,
    label: s.label,
    desc: s.desc,
    Input: lazy(() => import("../../pages/monitor/branches/sweets/SweetsDailyLog").then((m) => ({ default: m.inputFor(s.type) }))),
    View: lazy(() => import("../../pages/monitor/branches/sweets/SweetsDailyLog").then((m) => ({ default: m.viewFor(s.type) }))),
  })),
];

// Every report carries its bilingual fill-in guide (sweetsReportGuides.js);
// the shell shows it above the input page and, limits only, above the view.
// labelAr/descAr come from the shared EN→AR dictionary (sweets/bilingual.jsx);
// `group` places the report under a heading in the card's sidebar.
const GROUP_OF = {
  "sweets-ph": "hygiene", "sweets-clean": "hygiene", sweets_sanitizer_chemicals: "hygiene",
  sweets_raw_receiving: "receiving", "sweets-coolers": "receiving", sweets_thawing: "receiving",
  sweets_baking_cooking: "production", sweets_cooling_display: "production", sweets_production_batch: "production",
  sweets_visitor_checklist: "people", sweets_staff_sickness: "people",
  sweets_non_conformance: "quality", sweets_product_rejection: "quality", sweets_pest_control: "quality",
  sweets_preventive_maintenance: "quality",
};
const REPORT_GROUPS = [
  { id: "hygiene", icon: "🧼", label: "Hygiene & Cleaning" },
  { id: "receiving", icon: "📦", label: "Receiving & Storage" },
  { id: "production", icon: "🏭", label: "Production" },
  { id: "people", icon: "👥", label: "People" },
  { id: "quality", icon: "✅", label: "Quality & Maintenance" },
].map((g) => ({ ...g, labelAr: arOf(g.label) }));

const REPORTS = REPORT_PAGES.map((r) => ({
  ...r,
  labelAr: arOf(r.label),
  descAr: arOf(r.desc),
  group: GROUP_OF[r.type] || null,
  guide: guideFor(r.type),
}));

// Arabic twins for every card text the shell shows.
const withAr = (c) => ({
  ...c,
  labelAr: arOf(c.label),
  descAr: arOf(c.desc),
  ...(c.inputLabel ? { inputLabelAr: arOf(c.inputLabel), inputDescAr: arOf(c.inputDesc) } : {}),
  ...(c.viewLabel ? { viewLabelAr: arOf(c.viewLabel), viewDescAr: arOf(c.viewDesc) } : {}),
  ...(c.reports ? { groups: REPORT_GROUPS } : {}),
});

const sweets = {
  id: "sweets",
  label: "Confectionery",
  labelAr: arOf("Confectionery"),
  branchAr: arOf("Main Branch"),
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
      grad: "linear-gradient(135deg,#0f766e,#14b8a6)",
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
    {
      // A card that opens to TWO inner cards: add + view (OHC design reused).
      id: "ohc",
      kind: "pair",
      label: "OHC Certificates",
      desc: "Occupational Health Cards",
      icon: "🩺",
      grad: "linear-gradient(135deg,#7c3aed,#6d28d9)",
      inputLabel: "Add Certificate",
      inputDesc: "Upload a new OHC certificate",
      inputIcon: "➕",
      viewLabel: "View Certificates",
      viewDesc: "Browse saved OHC certificates",
      viewIcon: "🗂️",
      Input: lazy(() => import("../../pages/sweets-ohc/OHCUpload")),
      View: lazy(() => import("../../pages/sweets-ohc/OHCView")),
    },
    {
      // Inspection (Internal Audit) — its own Add / View pages, isolated
      // under the sweets_internal_audit report type.
      id: "inspection",
      kind: "pair",
      label: "Inspection",
      desc: "Internal audit & inspection",
      icon: "📋",
      grad: "linear-gradient(135deg,#0891b2,#0e7490)",
      inputLabel: "New Audit",
      inputDesc: "Fill a new internal audit",
      inputIcon: "➕",
      viewLabel: "View Audits",
      viewDesc: "Browse saved audits",
      viewIcon: "🗂️",
      Input: lazy(() => import("../../pages/monitor/branches/sweets/InternalAuditInput")),
      View: lazy(() => import("../../pages/monitor/branches/sweets/InternalAuditView")),
    },
    {
      // Training Certificates (BFS / PIC / EFST / HACCP) — Add / View pages,
      // isolated under the sweets_training_certificate report type.
      id: "certificates",
      kind: "pair",
      label: "Training Certificates",
      desc: "BFS / PIC / EFST / HACCP certificates",
      icon: "🎓",
      grad: "linear-gradient(135deg,#f59e0b,#d97706)",
      inputLabel: "Add Certificate",
      inputDesc: "Upload a training certificate",
      inputIcon: "➕",
      viewLabel: "View Certificates",
      viewDesc: "Browse training certificates",
      viewIcon: "🗂️",
      Input: lazy(() => import("../../pages/sweets-certs/CertUpload")),
      View: lazy(() => import("../../pages/sweets-certs/CertView")),
    },
    {
      // Internal Training — the full training system (sessions, quiz links,
      // certificates, annual plan & yearly summary, gap analysis, settings),
      // copied from the other company's structure into pages/sweets-training
      // with its own sweets_training_* types and confectionery modules.
      // (The earlier single-record sweets_training_record stays in backups.)
      id: "training",
      kind: "hub",
      label: "Internal Training",
      desc: "Sessions, quizzes, certificates & annual plan",
      icon: "🎓",
      grad: "linear-gradient(135deg,#16a34a,#15803d)",
      Hub: lazy(() => import("../../pages/sweets-training/SweetsTrainingHub")),
    },
    {
      // Vehicles hub — loading checks (truck temp ≤ 5 °C) + daily truck
      // cleaning, entry and reports. Same design as the fleet hub, but its own
      // sweets-cars copies and sweets_* report types.
      id: "cars",
      kind: "hub",
      label: "Vehicles",
      desc: "Loading checks & truck cleaning",
      icon: "🚚",
      grad: "linear-gradient(135deg,#2563eb,#7c3aed)",
      Hub: lazy(() => import("../../pages/sweets-cars/SweetsCarsHub")),
    },
    {
      // HACCP hub — placeholder module grid only (Supplier Evaluation, SOP,
      // CCP Monitoring, Dubai Municipality Inspection, Mock Recall). No real
      // report data yet; wire real Input/View pages in later.
      id: "haccp",
      kind: "hub",
      label: "HACCP",
      desc: "Food safety modules",
      icon: "🛡️",
      grad: "linear-gradient(135deg,#0f766e,#0891b2)",
      Hub: lazy(() => import("../../pages/monitor/branches/sweets/HaccpHub")),
    },
    {
      // Company settings — admins only (GenericIndustryApp hides adminOnly
      // cards from everyone else). First tool: Excel export of every sweets
      // report, the same exporter Al Mawashi's Settings uses, scoped to the
      // catalog's "sweets" card.
      id: "settings",
      kind: "hub",
      adminOnly: true,
      label: "Settings",
      desc: "Company tools — export all reports to Excel",
      icon: "⚙️",
      grad: "linear-gradient(135deg,#475569,#0f766e)",
      Hub: lazy(() => import("../../pages/sweets-settings/SweetsSettingsHub")),
    },
  ],
};

sweets.cards = sweets.cards.map(withAr);

export default sweets;
