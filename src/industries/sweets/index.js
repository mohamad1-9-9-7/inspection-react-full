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
const REPORTS = REPORT_PAGES.map((r) => ({ ...r, guide: guideFor(r.type) }));

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
      // Internal Training — one session per record (topic, trainer, attendees).
      // Isolated under the sweets_training_record report type.
      id: "training",
      kind: "pair",
      label: "Internal Training",
      desc: "Training sessions & attendance",
      icon: "🎓",
      grad: "linear-gradient(135deg,#16a34a,#15803d)",
      inputLabel: "New Training",
      inputDesc: "Record a training session",
      inputIcon: "➕",
      viewLabel: "View Trainings",
      viewDesc: "Browse training records",
      viewIcon: "🗂️",
      Input: lazy(() => import("../../pages/monitor/branches/sweets/TrainingRecordInput")),
      View: lazy(() => import("../../pages/monitor/branches/sweets/TrainingRecordView")),
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
  ],
};

export default sweets;
