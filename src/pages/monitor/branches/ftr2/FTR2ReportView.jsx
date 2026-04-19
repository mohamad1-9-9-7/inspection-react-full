// src/pages/monitor/branches/ftr2/FTR2ReportView.jsx
// FTR 2 — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

const FTR2TemperatureView            = lazy(() => import("./FTR2TemperatureView"));
const FTR2DailyCleanlinessView       = lazy(() => import("./FTR2DailyCleanlinessView"));
const FTR2OilCalibrationView         = lazy(() => import("./FTR2OilCalibrationView"));
const FTR2PersonalHygieneView        = lazy(() => import("./FTR2PersonalHygieneView"));
const FTR2ReceivingLogView           = lazy(() => import("./FTR2ReceivingLogView"));
const FTR2CookingTemperatureLogView  = lazy(() => import("./FTR2CookingTemperatureLogView"));

const TABS = [
  { key: "temperature",  icon: "🌡️",    label: "Temperature Log",      element: <FTR2TemperatureView /> },
  { key: "cleanliness",  icon: "🧹",     label: "Daily Cleanliness",    element: <FTR2DailyCleanlinessView /> },
  { key: "oil",          icon: "🛢️",    label: "Oil Calibration",      element: <FTR2OilCalibrationView /> },
  { key: "hygiene",      icon: "🧑‍🔬", label: "Personal Hygiene",    element: <FTR2PersonalHygieneView /> },
  { key: "receiving",    icon: "🚚",     label: "Receiving Log",        element: <FTR2ReceivingLogView /> },
  { key: "cook",         icon: "🍳",     label: "Cooking Temperature",  element: <FTR2CookingTemperatureLogView /> },
];

export default function FTR2ReportView() {
  return (
    <BranchDailyView
      branchCode="FTR-2"
      title="عرض تقارير<br/>الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
    />
  );
}
