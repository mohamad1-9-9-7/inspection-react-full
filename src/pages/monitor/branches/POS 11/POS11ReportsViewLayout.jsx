// src/pages/monitor/branches/POS 11/POS11ReportsViewLayout.jsx
// POS 11 — Daily Viewer Hub (unified design).
import React, { lazy, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const POS11PersonalHygieneView = lazy(() => import("./POS11PersonalHygieneView"));
const POS11DailyCleaningView   = lazy(() => import("./POS11DailyCleaningView"));
const POS11TemperatureView     = lazy(() => import("./POS11TemperatureView"));
const POS11TraceabilityLogView = lazy(() => import("./POS11TraceabilityLogView"));
const POS11ReceivingLogView    = lazy(() => import("./POS11ReceivingLogView"));
const POS11PestControlView     = lazy(() => import("./POS11PestControlView"));
const POS11CalibrationView     = lazy(() => import("./POS11CalibrationView"));

const DASH_TYPES = [
  { type: "pos11_personal_hygiene",       key: "hygiene",      icon: "🧑‍🔬", titleEn: "Personal Hygiene",  titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "pos11_daily_cleanliness",      key: "cleanliness",  icon: "🧹",     titleEn: "Daily Cleaning",    titleAr: "التنظيف اليومي",      accent: "#22c55e" },
  { type: "pos11_temperature",            key: "temperature",  icon: "🌡️",    titleEn: "Temperature Log",   titleAr: "سجل الحرارة",          accent: "#3b82f6" },
  { type: "pos11_traceability_log",       key: "traceability", icon: "🧬",     titleEn: "Traceability Log",  titleAr: "سجل التتبع",           accent: "#8b5cf6" },
  { type: "pos11_receiving_log_butchery", key: "receiving",    icon: "📥",     titleEn: "Receiving Log",     titleAr: "سجل الاستلام",         accent: "#a855f7" },
  { type: "pos11_pest_control",           key: "pest",         icon: "🪲",     titleEn: "Pest Control",      titleAr: "مكافحة الآفات",        accent: "#b45309" },
  { type: "pos11_calibration_log",        key: "calibration",  icon: "🧰",     titleEn: "Calibration Log",   titleAr: "سجل المعايرة",         accent: "#64748b" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="POS 11" branchNameAr="فرع POS 11" reportTypes={DASH_TYPES} accent="#3b82f6" />
  },
  { key: "hygiene",      icon: "🧑‍🔬", label: "Personal Hygiene",    element: <POS11PersonalHygieneView /> },
  { key: "cleanliness",  icon: "🧹",     label: "Daily Cleaning",       element: <POS11DailyCleaningView /> },
  { key: "temperature",  icon: "🌡️",    label: "Temperature Log",      element: <POS11TemperatureView /> },
  { key: "traceability", icon: "🧬",     label: "Traceability Log",     element: <POS11TraceabilityLogView /> },
  { key: "receiving",    icon: "📥",     label: "Receiving Log",        element: <POS11ReceivingLogView /> },
  { key: "pest",         icon: "🪲",     label: "Pest Control",         element: <POS11PestControlView /> },
  { key: "calibration",  icon: "🧰",     label: "Calibration Log",      element: <POS11CalibrationView /> },
];

export default function POS11ReportsViewLayout() {
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const qs = new URLSearchParams(searchParams);
    let changed = false;
    if (!qs.get("branch")) { qs.set("branch", "POS 11"); changed = true; }
    if (!qs.get("source")) { qs.set("source", "pos11-views"); changed = true; }
    if (changed) setSearchParams(qs, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BranchDailyView
      branchCode="POS-11"
      title="عرض تقارير<br/>الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
