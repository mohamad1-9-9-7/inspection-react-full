// src/pages/monitor/branches/ftr2/FTR2ReportView.jsx
// FTR 2 — Daily Viewer Hub (unified design).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const FTR2TemperatureView            = lazy(() => import("./FTR2TemperatureView"));
const FTR2DailyCleanlinessView       = lazy(() => import("./FTR2DailyCleanlinessView"));
const FTR2OilCalibrationView         = lazy(() => import("./FTR2OilCalibrationView"));
const FTR2PersonalHygieneView        = lazy(() => import("./FTR2PersonalHygieneView"));
const FTR2ReceivingLogView           = lazy(() => import("./FTR2ReceivingLogView"));
const FTR2CookingTemperatureLogView  = lazy(() => import("./FTR2CookingTemperatureLogView"));

const DASH_TYPES = [
  { type: "ftr2_temperature",             key: "temperature", icon: "🌡️",    titleEn: "Temperature Log",     titleAr: "سجل الحرارة",         accent: "#3b82f6" },
  { type: "ftr2_daily_cleanliness",       key: "cleanliness", icon: "🧹",     titleEn: "Daily Cleanliness",   titleAr: "النظافة اليومية",     accent: "#22c55e" },
  { type: "ftr2_oil_calibration",         key: "oil",         icon: "🛢️",    titleEn: "Oil Calibration",     titleAr: "معايرة الزيت",        accent: "#f59e0b" },
  { type: "ftr2_personal_hygiene",        key: "hygiene",     icon: "🧑‍🔬", titleEn: "Personal Hygiene",    titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "ftr2_receiving_log_butchery",  key: "receiving",   icon: "🚚",     titleEn: "Receiving Log",       titleAr: "سجل الاستلام",         accent: "#a855f7" },
  { type: "ftr2_cooking_temperature_log", key: "cook",        icon: "🍳",     titleEn: "Cooking Temperature", titleAr: "حرارة الطبخ",         accent: "#e11d48" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="FTR 2" branchNameAr="فرع FTR 2" reportTypes={DASH_TYPES} accent="#f97316" />
  },
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
      defaultTabKey="overview"
    />
  );
}
