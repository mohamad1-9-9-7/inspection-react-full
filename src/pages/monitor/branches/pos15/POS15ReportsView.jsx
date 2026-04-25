// src/pages/monitor/branches/pos15/POS15ReportsView.jsx
// POS 15 — Daily Viewer Hub (unified design).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const POS15DailyCleaningView                  = lazy(() => import("./POS15DailyCleaningView"));
const POS15PersonalHygieneView                = lazy(() => import("./POS15PersonalHygieneView"));
const POS15TemperatureView                    = lazy(() => import("./POS15TemperatureView"));
const POS15ReceivingLogView                   = lazy(() => import("./POS15ReceivingLogView"));
const POS15TraceabilityLogView                = lazy(() => import("./POS15TraceabilityLogView"));
const POS15EquipmentInspectionSanitizingView  = lazy(() => import("./POS15EquipmentInspectionSanitizingLogView"));
const POS15PestControlView                    = lazy(() => import("./POS15PestControlView"));

const DASH_TYPES = [
  { type: "pos15_daily_cleanliness",      key: "cleanliness",  icon: "🧹",     titleEn: "Daily Cleaning",          titleAr: "التنظيف اليومي",      accent: "#22c55e" },
  { type: "pos15_personal_hygiene",       key: "hygiene",      icon: "🧑‍🔬", titleEn: "Personal Hygiene",        titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "pos15_temperature",            key: "temperature",  icon: "🌡️",    titleEn: "Temperature Log",         titleAr: "سجل الحرارة",          accent: "#3b82f6" },
  { type: "pos15_receiving_log_butchery", key: "receiving",    icon: "📥",     titleEn: "Receiving Log",           titleAr: "سجل الاستلام",         accent: "#a855f7" },
  { type: "pos15_traceability_log",       key: "traceability", icon: "🧬",     titleEn: "Traceability Log",        titleAr: "سجل التتبع",           accent: "#8b5cf6" },
  { type: "pos15_equipment_inspection",   key: "equip_sanit",  icon: "🧪",     titleEn: "Equipment Inspection",    titleAr: "فحص المعدات",          accent: "#f59e0b" },
  { type: "pos15_pest_control",           key: "pest",         icon: "🪲",     titleEn: "Pest Control",            titleAr: "مكافحة الآفات",        accent: "#b45309" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="POS 15" branchNameAr="فرع POS 15" reportTypes={DASH_TYPES} accent="#8b5cf6" />
  },
  { key: "cleanliness",  icon: "🧹",     label: "Daily Cleaning",                       element: <POS15DailyCleaningView /> },
  { key: "hygiene",      icon: "🧑‍🔬", label: "Personal Hygiene",                    element: <POS15PersonalHygieneView /> },
  { key: "temperature",  icon: "🌡️",    label: "Temperature Log",                      element: <POS15TemperatureView /> },
  { key: "receiving",    icon: "📥",     label: "Receiving Log",                        element: <POS15ReceivingLogView /> },
  { key: "traceability", icon: "🧬",     label: "Traceability Log",                     element: <POS15TraceabilityLogView /> },
  { key: "equip_sanit",  icon: "🧪",     label: "Equipment Inspection & Sanitizing",    element: <POS15EquipmentInspectionSanitizingView /> },
  { key: "pest",         icon: "🪲",     label: "Pest Control",                         element: <POS15PestControlView /> },
];

export default function POS15ReportsView() {
  return (
    <BranchDailyView
      branchCode="POS-15"
      title="عرض تقارير<br/>الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
