// src/pages/monitor/branches/pos 10/POS10ReportsView.jsx
// POS 10 — Daily Viewer Hub (unified design).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const POS10DailyCleaningView   = lazy(() => import("./POS10DailyCleaningView"));
const POS10PersonalHygieneView = lazy(() => import("./POS10PersonalHygieneView"));
const POS10TemperatureView     = lazy(() => import("./POS10TemperatureView"));
const POS10ReceivingLogView    = lazy(() => import("./POS10ReceivingLogView"));
const POS10TraceabilityLogView = lazy(() => import("./POS10TraceabilityLogView"));
const POS10PestControlView     = lazy(() => import("./POS10PestControlView"));
const POS10CalibrationView     = lazy(() => import("./POS10CalibrationView"));

const DASH_TYPES = [
  { type: "pos10_daily_cleanliness",    key: "cleanliness",  icon: "🧹",     titleEn: "Daily Cleaning",    titleAr: "التنظيف اليومي",      accent: "#22c55e" },
  { type: "pos10_personal_hygiene",     key: "hygiene",      icon: "🧑‍🔬", titleEn: "Personal Hygiene",  titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "pos10_temperature",          key: "temperature",  icon: "🌡️",    titleEn: "Temperature Log",   titleAr: "سجل الحرارة",          accent: "#3b82f6" },
  { type: "pos10_receiving_log_butchery", key: "receiving",  icon: "📥",     titleEn: "Receiving Log",     titleAr: "سجل الاستلام",         accent: "#a855f7" },
  { type: "pos10_traceability_log",     key: "traceability", icon: "🧬",     titleEn: "Traceability Log",  titleAr: "سجل التتبع",           accent: "#8b5cf6" },
  { type: "pos10_pest_control",         key: "pest",         icon: "🪲",     titleEn: "Pest Control",      titleAr: "مكافحة الآفات",        accent: "#b45309" },
  { type: "pos10_calibration_log",      key: "calibration",  icon: "🧰",     titleEn: "Calibration Log",   titleAr: "سجل المعايرة",         accent: "#64748b" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="POS 10" branchNameAr="فرع POS 10" reportTypes={DASH_TYPES} accent="#22c55e" />
  },
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
      defaultTabKey="overview"
    />
  );
}
