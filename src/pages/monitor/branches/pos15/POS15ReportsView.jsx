// src/pages/monitor/branches/pos15/POS15ReportsView.jsx
// POS 15 — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

const POS15DailyCleaningView                  = lazy(() => import("./POS15DailyCleaningView"));
const POS15PersonalHygieneView                = lazy(() => import("./POS15PersonalHygieneView"));
const POS15TemperatureView                    = lazy(() => import("./POS15TemperatureView"));
const POS15ReceivingLogView                   = lazy(() => import("./POS15ReceivingLogView"));
const POS15TraceabilityLogView                = lazy(() => import("./POS15TraceabilityLogView"));
const POS15EquipmentInspectionSanitizingView  = lazy(() => import("./POS15EquipmentInspectionSanitizingLogView"));
const POS15PestControlView                    = lazy(() => import("./POS15PestControlView"));

const TABS = [
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
    />
  );
}
