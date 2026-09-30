// src/industries/_kit/buildTemplate.js
// Turns a kit industry id into the template the company-app shell renders
// (pages/generic/GenericIndustryApp.jsx) — the four basic cards:
//
//   daily        (entry)  fill in the log sheets
//   view         (viewer) browse / edit / export the saved sheets
//   ohc          (pair)   OHC cards — add + register
//   certificates (pair)   external certificates — add + register
//   settings     (hub)    admins only — Excel backup of every report
//
// Permission keys are "<industry>:<card id>" (industries/index.js), so a
// restaurant account's grants can never open a supermarket's cards.

import { lazy } from "react";
import { categoryOf } from "../catalog";
import { arOf } from "../../pages/industry-kit/i18n/bilingual";
import { REPORT_GROUPS, kitSchemasFor } from "./kitRegistry";
import { guideFor } from "./guides";

const logPage = (kind, schema) =>
  lazy(() => import("../../pages/industry-kit/log/DailyLog").then((m) => ({ default: kind === "input" ? m.inputFor(schema) : m.viewFor(schema) })));

// Arabic twins for every card text the shell shows.
const withAr = (c) => ({
  ...c,
  labelAr: arOf(c.label),
  descAr: arOf(c.desc),
  ...(c.inputLabel ? { inputLabelAr: arOf(c.inputLabel), inputDescAr: arOf(c.inputDesc) } : {}),
  ...(c.viewLabel ? { viewLabelAr: arOf(c.viewLabel), viewDescAr: arOf(c.viewDesc) } : {}),
});

export function buildTemplate(id) {
  const cat = categoryOf(id);
  const groups = REPORT_GROUPS.map((g) => ({ ...g, labelAr: arOf(g.label) }));

  const reports = kitSchemasFor(id).map((s) => ({
    type: s.type,
    icon: s.icon,
    label: s.label,
    desc: s.desc,
    labelAr: arOf(s.label),
    descAr: arOf(s.desc),
    group: s.group || null,
    // "How to fill this report" panel (pages/generic/ReportGuide.jsx).
    guide: guideFor(id, s.key),
    Input: logPage("input", s),
    View: logPage("view", s),
  }));

  const cards = [
    {
      id: "daily",
      kind: "entry",
      label: "Daily Reports",
      desc: "Fill in the daily operation reports",
      icon: "📋",
      grad: "linear-gradient(135deg,#0f766e,#14b8a6)",
      reports,
      groups,
    },
    {
      id: "view",
      kind: "viewer",
      label: "View Reports",
      desc: "Browse all saved reports",
      icon: "🗂️",
      grad: "linear-gradient(135deg,#0891b2,#0e7490)",
      reports,
      groups,
    },
    {
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
      Input: lazy(() => import("../../pages/industry-kit/health-cards/OHCUpload")),
      View: lazy(() => import("../../pages/industry-kit/health-cards/OHCView")),
    },
    {
      id: "certificates",
      kind: "pair",
      label: "External Certificates",
      desc: "BFS / PIC / EFST / HACCP and other external certificates",
      icon: "🎓",
      grad: "linear-gradient(135deg,#f59e0b,#d97706)",
      inputLabel: "Add Certificate",
      inputDesc: "Upload an external certificate",
      inputIcon: "➕",
      viewLabel: "View Certificates",
      viewDesc: "Browse external certificates",
      viewIcon: "🗂️",
      Input: lazy(() => import("../../pages/industry-kit/external-certs/CertUpload")),
      View: lazy(() => import("../../pages/industry-kit/external-certs/CertView")),
    },
    {
      // Company settings — admins only (GenericIndustryApp hides adminOnly
      // cards from everyone else, and they are never offered as a grant).
      id: "settings",
      kind: "hub",
      adminOnly: true,
      label: "Settings",
      desc: "Company tools — export all reports to Excel",
      icon: "⚙️",
      grad: "linear-gradient(135deg,#475569,#0f766e)",
      Hub: lazy(() => import("../../pages/industry-kit/settings/KitSettingsHub")),
    },
  ].map(withAr);

  return {
    id,
    label: cat.long,
    labelEn: cat.long,
    labelAr: cat.labelAr,
    icon: cat.icon,
    branch: "Main Branch",
    branchAr: arOf("Main Branch"),
    cards,
  };
}
