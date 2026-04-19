// src/pages/monitor/branches/ftr1/FTR1ReportView.jsx
// FTR 1 — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

const FTR1TemperatureView            = lazy(() => import("./FTR1TemperatureView"));
const FTR1DailyCleanlinessView       = lazy(() => import("./FTR1DailyCleanlinessView"));
const FTR1OilCalibrationView         = lazy(() => import("./FTR1OilCalibrationView"));
const FTR1PersonalHygieneView        = lazy(() => import("./FTR1PersonalHygieneView"));
const FTR1ReceivingLogView           = lazy(() => import("./FTR1ReceivingLogView"));
const FTR1CookingTemperatureLogView  = lazy(() => import("./FTR1CookingTemperatureLogView"));

const TABS = [
  { key: "temperature",  icon: "🌡️",    label: "Temperature Log",      element: <FTR1TemperatureView /> },
  { key: "cleanliness",  icon: "🧹",     label: "Daily Cleanliness",    element: <FTR1DailyCleanlinessView /> },
  { key: "oil",          icon: "🛢️",    label: "Oil Calibration",      element: <FTR1OilCalibrationView /> },
  { key: "hygiene",      icon: "🧑‍🔬", label: "Personal Hygiene",    element: <FTR1PersonalHygieneView /> },
  { key: "receiving",    icon: "🚚",     label: "Receiving Log",        element: <FTR1ReceivingLogView /> },
  { key: "cook",         icon: "🍳",     label: "Cooking Temperature",  element: <FTR1CookingTemperatureLogView /> },
];

export default function FTR1ReportView() {
  return (
    <BranchDailyView
      branchCode="FTR-1"
      title="عرض تقارير<br/>الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
    />
  );
}
