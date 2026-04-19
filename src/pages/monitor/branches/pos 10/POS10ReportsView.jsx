// src/pages/monitor/branches/pos 10/POS10ReportsView.jsx
// POS 10 — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

const POS10DailyCleaningView   = lazy(() => import("./POS10DailyCleaningView"));
const POS10PersonalHygieneView = lazy(() => import("./POS10PersonalHygieneView"));
const POS10TemperatureView     = lazy(() => import("./POS10TemperatureView"));
const POS10ReceivingLogView    = lazy(() => import("./POS10ReceivingLogView"));
const POS10TraceabilityLogView = lazy(() => import("./POS10TraceabilityLogView"));
const POS10PestControlView     = lazy(() => import("./POS10PestControlView"));
const POS10CalibrationView     = lazy(() => import("./POS10CalibrationView"));

const TABS = [
  { key: "cleanliness",  icon: "🧹",     label: "Daily Cleaning",        element: <POS10DailyCleaningView /> },
  { key: "hygiene",      icon: "🧑‍🔬", label: "Personal Hygiene",     element: <POS10PersonalHygieneView /> },
  { key: "temperature",  icon: "🌡️",    label: "Temperature Log",        element: <POS10TemperatureView /> },
  { key: "receiving",    icon: "📥",     label: "Receiving Log",         element: <POS10ReceivingLogView /> },
  { key: "traceability", icon: "🧬",     label: "Traceability Log",      element: <POS10TraceabilityLogView /> },
  { key: "pest",         icon: "🪲",     label: "Pest Control",          element: <POS10PestControlView /> },
  { key: "calibration",  icon: "🧰",     label: "Calibration Log",       element: <POS10CalibrationView /> },
];

export default function POS10ReportsView() {
  return (
    <BranchDailyView
      branchCode="POS-10"
      title="عرض تقارير<br/>الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
    />
  );
}
