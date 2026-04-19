// src/pages/monitor/branches/qcs/QCSReportsView.jsx
// QCS — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

const CoolersView                       = lazy(() => import("./CoolersView"));
const PersonalHygieneView               = lazy(() => import("./PersonalHygieneView"));
const DailyCleanlinessView              = lazy(() => import("./DailyCleanlinessView"));
const FreshChickenReportsView           = lazy(() => import("./FreshChickenReportsView"));
const FTR1PreloadingViewer              = lazy(() => import("./FTR1PreloadingViewer"));
const FTR2PreloadingViewer              = lazy(() => import("./FTR2PreloadingViewer"));
const RMInspectionReportIngredientsView = lazy(() => import("./RMInspectionReportIngredientsView"));
const RMInspectionReportPackagingView   = lazy(() => import("./RMInspectionReportPackagingView"));
const NonConformanceReportsView         = lazy(() => import("./NonConformanceReportsView"));
const CorrectiveActionReportsView       = lazy(() => import("./CorrectiveActionReportsView"));
const InternalAuditView                 = lazy(() => import("./InternalAuditView"));

const CC_HEADER = {
  documentTitle: "QCS — Daily Cleanliness",
  documentNo: "FS-QM/REC/CLN",
  revisionNo: "01",
  area: "QCS Warehouse",
  issuedBy: "QA Manager",
  approvedBy: "Food Safety Team Leader",
  issueDate: "",
  controllingOfficer: "",
};

const TABS = [
  { key: "coolers",        icon: "🧊",  label: "Coolers",                element: <CoolersView /> },
  { key: "ph",             icon: "🧼",  label: "Personal Hygiene",       element: <PersonalHygieneView /> },
  {
    key: "clean",
    icon: "🧹",
    label: "Daily Cleanliness",
    element: (
      <DailyCleanlinessView
        ccHeader={CC_HEADER}
        selectedCleanDate=""
        cleanlinessRows={[]}
        ccFooter={{ checkedBy: "", verifiedBy: "" }}
      />
    ),
  },
  { key: "fresh",          icon: "🍗",  label: "Fresh Chicken",          element: <FreshChickenReportsView /> },
  { key: "ftr1_preload",   icon: "🚚",  label: "FTR 1 • Preloading",     element: <FTR1PreloadingViewer /> },
  { key: "ftr2_preload",   icon: "🚚",  label: "FTR 2 • Preloading",     element: <FTR2PreloadingViewer /> },
  { key: "rm_ing",         icon: "🧪",  label: "RM — Ingredients",       element: <RMInspectionReportIngredientsView /> },
  { key: "rm_pack",        icon: "📦",  label: "RM — Packaging",         element: <RMInspectionReportPackagingView /> },
  { key: "nc_reports",     icon: "🚫",  label: "Non-Conformance",        element: <NonConformanceReportsView /> },
  { key: "car_reports",    icon: "🛠️", label: "Corrective Action",      element: <CorrectiveActionReportsView /> },
  { key: "internal_audit", icon: "📋",  label: "Internal Audit",         element: <InternalAuditView /> },
];

export default function QCSReportsView() {
  return (
    <BranchDailyView
      branchCode="QCS"
      title="عرض تقارير<br/>الجودة"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
    />
  );
}
