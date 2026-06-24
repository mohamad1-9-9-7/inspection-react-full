// src/pages/monitor/branches/production/PRDReportsView.jsx
// Production — Daily Viewer Hub (unified design).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const CleaningChecklistPRDView = lazy(() => import("./CleaningChecklistPRDView"));
const PersonalHygienePRDView   = lazy(() => import("./PersonalHygienePRDView"));
const PRDDefrostingRecordView  = lazy(() => import("./PRDDefrostingRecordView"));
const PRDTraceabilityLogView   = lazy(() => import("./PRDTraceabilityLogView"));
const OnlineCuttingRecordView  = lazy(() => import("./OnlineCuttingRecordView"));
const DriedMeatProcessView     = lazy(() => import("./DriedMeatProcessView"));
const PRDVegSanitationView     = lazy(() => import("./PRDVegSanitationView"));
const PRDSanitizerView         = lazy(() => import("./PRDSanitizerConcentrationView"));
const EquipmentInspectionView = lazy(() => import("../pos15/POS15EquipmentInspectionSanitizingLogView"));

const DASH_TYPES = [
  { type: "prod_personal_hygiene",    key: "hygiene",  icon: "🧑‍🍳", titleEn: "Personal Hygiene",   titleAr: "النظافة الشخصية",   accent: "#0ea5e9" },
  { type: "prod_cleaning_checklist",  key: "cleaning", icon: "🧽",    titleEn: "Cleaning Checklist", titleAr: "قائمة النظافة",      accent: "#22c55e" },
  { type: "prod_defrosting_record",   key: "defrost",  icon: "❄️",    titleEn: "Defrosting Record",  titleAr: "سجل إذابة التجميد",  accent: "#3b82f6" },
  { type: "prd_traceability_log",     key: "trace",    icon: "🔗",    titleEn: "Traceability Log",   titleAr: "سجل التتبع",          accent: "#a855f7" },
  { type: "prod_online_cutting",      key: "cutting",  icon: "✂️",    titleEn: "Online Cutting",     titleAr: "التقطيع المباشر",     accent: "#e11d48" },
  { type: "prod_dried_meat",          key: "dried",    icon: "🥓",    titleEn: "Dried Meat Process", titleAr: "تصنيع اللحم المجفف", accent: "#b45309" },
  { type: "prod_veg_sanitation_ccp",  key: "vegSanitation", icon: "🥬", titleEn: "Veg/Fruits Sanitation", titleAr: "تعقيم الخضار والفواكه", accent: "#16a34a" },
  { type: "prod_sanitizer_concentration", key: "sanitizer", icon: "🧴", titleEn: "Sanitizer Concentration", titleAr: "تركيز المعقم", accent: "#0891b2" },
  { type: "prod_equipment_inspection", key: "equipment", icon: "🧪", titleEn: "Equipment Inspection & Sanitizing", titleAr: "فحص وتعقيم المعدات", accent: "#f59e0b" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="Production" branchNameAr="الإنتاج" reportTypes={DASH_TYPES} accent="#0f766e" />
  },
  { key: "cleaning",  icon: "🧽", label: "Cleaning Checklist",    element: <CleaningChecklistPRDView /> },
  { key: "hygiene",   icon: "🧑‍🍳", label: "Personal Hygiene",    element: <PersonalHygienePRDView /> },
  { key: "defrost",   icon: "❄️",  label: "Defrosting Record",    element: <PRDDefrostingRecordView /> },
  { key: "trace",     icon: "🔗", label: "Traceability Log",      element: <PRDTraceabilityLogView /> },
  { key: "cutting",   icon: "✂️", label: "Online Cutting Record", element: <OnlineCuttingRecordView /> },
  { key: "dried",     icon: "🥓", label: "Dried Meat Process",    element: <DriedMeatProcessView /> },
  { key: "vegSanitation", icon: "🥬", label: "Sanitation Record (CCP) – Veg/Fruits", element: <PRDVegSanitationView /> },
  { key: "sanitizer", icon: "🧴", label: "Sanitizer Concentration", element: <PRDSanitizerView /> },
  { key: "equipment", icon: "🧪", label: "Equipment Inspection & Sanitizing", element: <EquipmentInspectionView reportType="prod_equipment_inspection" branch="Production" reporter="production" /> },
];

export default function PRDReportsView() {
  return (
    <BranchDailyView
      branchCode="PRD"
      title="عرض تقارير<br/>الإنتاج"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
