// src/pages/monitor/branches/ftr1/FTR1ReportView.jsx
// FTR 1 — Daily Viewer Hub (unified design).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const FTR1TemperatureView            = lazy(() => import("./FTR1TemperatureView"));
const FTR1DailyCleanlinessView       = lazy(() => import("./FTR1DailyCleanlinessView"));
const FTR1OilCalibrationView         = lazy(() => import("./FTR1OilCalibrationView"));
const FTR1PersonalHygieneView        = lazy(() => import("./FTR1PersonalHygieneView"));
const FTR1ReceivingLogView           = lazy(() => import("./FTR1ReceivingLogView"));
const FTR1CookingTemperatureLogView  = lazy(() => import("./FTR1CookingTemperatureLogView"));

const DASH_TYPES = [
  { type: "ftr1_temperature",             key: "temperature", icon: "🌡️",    titleEn: "Temperature Log",     titleAr: "سجل الحرارة",         accent: "#3b82f6" },
  { type: "ftr1_daily_cleanliness",       key: "cleanliness", icon: "🧹",     titleEn: "Daily Cleanliness",   titleAr: "النظافة اليومية",     accent: "#22c55e" },
  { type: "ftr1_oil_calibration",         key: "oil",         icon: "🛢️",    titleEn: "Oil Calibration",     titleAr: "معايرة الزيت",        accent: "#f59e0b" },
  { type: "ftr1_personal_hygiene",        key: "hygiene",     icon: "🧑‍🔬", titleEn: "Personal Hygiene",    titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "ftr1_receiving_log_butchery",  key: "receiving",   icon: "🚚",     titleEn: "Receiving Log",       titleAr: "سجل الاستلام",         accent: "#a855f7" },
  { type: "ftr1_cooking_temperature_log", key: "cook",        icon: "🍳",     titleEn: "Cooking Temperature", titleAr: "حرارة الطبخ",         accent: "#e11d48" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="FTR 1" branchNameAr="فرع FTR 1" reportTypes={DASH_TYPES} accent="#0ea5e9" />
  },
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
      defaultTabKey="overview"
    />
  );
}
