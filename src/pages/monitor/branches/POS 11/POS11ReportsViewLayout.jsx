// src/pages/monitor/branches/POS 11/POS11ReportsViewLayout.jsx
// POS 11 — Daily Viewer Hub (unified design, same as POS 19).
import React, { lazy, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import BranchDailyView from "../_shared/BranchDailyView";

const POS11PersonalHygieneView = lazy(() => import("./POS11PersonalHygieneView"));
const POS11DailyCleaningView   = lazy(() => import("./POS11DailyCleaningView"));
const POS11TemperatureView     = lazy(() => import("./POS11TemperatureView"));
const POS11TraceabilityLogView = lazy(() => import("./POS11TraceabilityLogView"));
const POS11ReceivingLogView    = lazy(() => import("./POS11ReceivingLogView"));
const POS11PestControlView     = lazy(() => import("./POS11PestControlView"));
const POS11CalibrationView     = lazy(() => import("./POS11CalibrationView"));

const TABS = [
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
    />
  );
}
