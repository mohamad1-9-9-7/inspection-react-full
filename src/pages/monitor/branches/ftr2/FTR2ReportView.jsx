// src/pages/monitor/branches/ftr2/FTR2ReportView.jsx
// FTR 2 - Daily Viewer Hub.
import React from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";
import FTR2UnifiedReportView from "./FTR2UnifiedReportView";
import FTR2ReceivingLogView from "./FTR2ReceivingLogView";

const DASH_TYPES = [
  { type: "ftr2_temperature", key: "temperature", icon: "T", titleEn: "Temperature Log", titleAr: "Temperature Log", accent: "#3b82f6" },
  { type: "ftr2_daily_cleanliness", key: "cleanliness", icon: "C", titleEn: "Daily Cleanliness", titleAr: "Daily Cleanliness", accent: "#22c55e" },
  { type: "ftr2_oil_calibration", key: "oil", icon: "O", titleEn: "Oil Calibration", titleAr: "Oil Calibration", accent: "#f59e0b" },
  { type: "ftr2_personal_hygiene", key: "hygiene", icon: "H", titleEn: "Personal Hygiene", titleAr: "Personal Hygiene", accent: "#0ea5e9" },
  { type: "ftr2_receiving_log_butchery", key: "receiving", icon: "R", titleEn: "Receiving Log", titleAr: "Receiving Log", accent: "#a855f7" },
  { type: "ftr2_cooking_temperature_log", key: "cook", icon: "K", titleEn: "Cooking Temperature", titleAr: "Cooking Temperature", accent: "#e11d48" },
];

const TABS = [
  {
    key: "overview",
    icon: "O",
    label: "Overview",
    element: (
      <BranchDashboard
        branchName="FTR 2"
        branchNameAr="FTR 2"
        reportTypes={DASH_TYPES}
        accent="#f97316"
      />
    ),
  },
  {
    key: "temperature",
    icon: "T",
    label: "Temperature Log",
    element: (
      <FTR2UnifiedReportView
        type="ftr2_temperature"
        title="Temperature Log"
        documentTitle="Temperature Control Record"
        accent="#3b82f6"
      />
    ),
  },
  {
    key: "cleanliness",
    icon: "C",
    label: "Daily Cleanliness",
    element: (
      <FTR2UnifiedReportView
        type="ftr2_daily_cleanliness"
        title="Daily Cleanliness"
        documentTitle="Daily Cleanliness Checklist"
        accent="#22c55e"
      />
    ),
  },
  {
    key: "oil",
    icon: "O",
    label: "Oil Calibration",
    element: (
      <FTR2UnifiedReportView
        type="ftr2_oil_calibration"
        title="Oil Calibration"
        documentTitle="Oil Calibration Record"
        accent="#f59e0b"
      />
    ),
  },
  {
    key: "hygiene",
    icon: "H",
    label: "Personal Hygiene",
    element: (
      <FTR2UnifiedReportView
        type="ftr2_personal_hygiene"
        title="Personal Hygiene"
        documentTitle="Personal Hygiene Checklist"
        accent="#0ea5e9"
      />
    ),
  },
  {
    key: "receiving",
    icon: "R",
    label: "Receiving Log",
    element: <FTR2ReceivingLogView />,
  },
  {
    key: "cook",
    icon: "K",
    label: "Cooking Temperature",
    element: (
      <FTR2UnifiedReportView
        type="ftr2_cooking_temperature_log"
        title="Cooking Temperature"
        documentTitle="Cooking Temperature Log"
        accent="#e11d48"
      />
    ),
  },
];

export default function FTR2ReportView() {
  return (
    <BranchDailyView
      branchCode="FTR-2"
      title="FTR 2<br/>Reports"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
      direction="ltr"
    />
  );
}
