// src/pages/monitor/branches/production/PRDReportsView.jsx
// Production — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

const CleaningChecklistPRDView = lazy(() => import("./CleaningChecklistPRDView"));
const PersonalHygienePRDView   = lazy(() => import("./PersonalHygienePRDView"));
const PRDDefrostingRecordView  = lazy(() => import("./PRDDefrostingRecordView"));
const PRDTraceabilityLogView   = lazy(() => import("./PRDTraceabilityLogView"));

const TABS = [
  { key: "cleaning",  icon: "🧽", label: "Cleaning Checklist",  element: <CleaningChecklistPRDView /> },
  { key: "hygiene",   icon: "🧑‍🍳", label: "Personal Hygiene", element: <PersonalHygienePRDView /> },
  { key: "defrost",   icon: "❄️",  label: "Defrosting Record",  element: <PRDDefrostingRecordView /> },
  { key: "trace",     icon: "🔗", label: "Traceability Log",    element: <PRDTraceabilityLogView /> },
];

export default function PRDReportsView() {
  return (
    <BranchDailyView
      branchCode="PRD"
      title="عرض تقارير<br/>الإنتاج"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
    />
  );
}
