// src/pages/monitor/branches/production/PRDReportsView.jsx
// Production — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import PrintStyles from "./_shared/PrintStyles";

const ProductionDashboard     = lazy(() => import("./ProductionDashboard"));
const CleaningChecklistPRDView = lazy(() => import("./CleaningChecklistPRDView"));
const PersonalHygienePRDView   = lazy(() => import("./PersonalHygienePRDView"));
const PRDDefrostingRecordView  = lazy(() => import("./PRDDefrostingRecordView"));
const PRDTraceabilityLogView   = lazy(() => import("./PRDTraceabilityLogView"));
const OnlineCuttingRecordView  = lazy(() => import("./OnlineCuttingRecordView"));
const DriedMeatProcessView     = lazy(() => import("./DriedMeatProcessView"));

const TABS = [
  { key: "overview",  icon: "📊", label: "Overview",              element: <ProductionDashboard /> },
  { key: "cleaning",  icon: "🧽", label: "Cleaning Checklist",    element: <CleaningChecklistPRDView /> },
  { key: "hygiene",   icon: "🧑‍🍳", label: "Personal Hygiene",    element: <PersonalHygienePRDView /> },
  { key: "defrost",   icon: "❄️",  label: "Defrosting Record",    element: <PRDDefrostingRecordView /> },
  { key: "trace",     icon: "🔗", label: "Traceability Log",      element: <PRDTraceabilityLogView /> },
  { key: "cutting",   icon: "✂️", label: "Online Cutting Record", element: <OnlineCuttingRecordView /> },
  { key: "dried",     icon: "🥓", label: "Dried Meat Process",    element: <DriedMeatProcessView /> },
];

export default function PRDReportsView() {
  return (
    <>
      <PrintStyles />
      <BranchDailyView
        branchCode="PRD"
        title="عرض تقارير<br/>الإنتاج"
        subtitle="Daily Viewer Hub"
        tabs={TABS}
        defaultTabKey="overview"
      />
    </>
  );
}
