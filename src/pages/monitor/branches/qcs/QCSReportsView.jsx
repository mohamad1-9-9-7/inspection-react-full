// src/pages/monitor/branches/qcs/QCSReportsView.jsx
// QCS — Daily Viewer Hub (unified design).
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

const CoolersView                       = lazy(() => import("./CoolersView"));
const PersonalHygieneView               = lazy(() => import("./PersonalHygieneView"));
const DailyCleanlinessView              = lazy(() => import("./DailyCleanlinessView"));
const FreshChickenReportsView           = lazy(() => import("./FreshChickenReportsView"));
const FTR1PreloadingViewer              = lazy(() => import("./FTR1PreloadingViewer"));
const FTR2PreloadingViewer              = lazy(() => import("./FTR2PreloadingViewer"));
const RMInspectionReportIngredientsView = lazy(() => import("./RMInspectionReportIngredientsView"));
const RMInspectionReportPackagingView   = lazy(() => import("./RMInspectionReportPackagingView"));
const NonConformanceReportsView         = lazy(() => import("./NonConformanceReportsView"));
const CorrectiveActionReportsView       = lazy(() => import("./CorrectiveActionReportsView"));
const InternalAuditView                 = lazy(() => import("./InternalAuditView"));

// 🆕 Disposal views
const GarbageDisposalView               = lazy(() => import("./GarbageDisposalView"));
const MeatWasteDisposalView             = lazy(() => import("./MeatWasteDisposalView"));

// 🆕 Pest Control view
const PestControlView                   = lazy(() => import("./PestControlView"));

// 🆕 Stock Rotation (FIFO/FEFO) view
const StockRotationView                 = lazy(() => import("./StockRotationView"));

// 🆕 Visitor Checklist view
const VisitorChecklistView              = lazy(() => import("./VisitorChecklistView"));

// 🆕 Staff Sickness view
const StaffSicknessView                 = lazy(() => import("./StaffSicknessView"));

// 🆕 Employee Return to Work view
const EmployeeReturnToWorkView          = lazy(() => import("./EmployeeReturnToWorkView"));

const CC_HEADER = {
  documentTitle: "QCS — Daily Cleanliness",
  documentNo: "FS-QM/REC/CLN",
  revisionNo: "01",
  area: "QCS Warehouse",
  issuedBy: "QA Manager",
  approvedBy: "Food Safety Team Leader",
  issueDate: "",
  controllingOfficer: "",
};

/* Report type list for the Dashboard (overview tab) */
const DASH_TYPES = [
  { type: "qcs_coolers",            key: "coolers",        icon: "🧊",  titleEn: "Coolers",            titleAr: "البرادات",            accent: "#06b6d4" },
  { type: "qcs-ph",                 key: "ph",             icon: "🧼",  titleEn: "Personal Hygiene",   titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "qcs-clean",              key: "clean",          icon: "🧹",  titleEn: "Daily Cleanliness",  titleAr: "النظافة اليومية",     accent: "#22c55e" },
  { type: "ftr1_preloading_inspection", key: "ftr1_preload", icon: "🚚", titleEn: "FTR 1 Preloading",  titleAr: "تحميل FTR 1",        accent: "#f59e0b" },
  { type: "ftr2_preloading_inspection", key: "ftr2_preload", icon: "🚚", titleEn: "FTR 2 Preloading",  titleAr: "تحميل FTR 2",        accent: "#f97316" },
  { type: "qcs_rm_ingredients",     key: "rm_ing",         icon: "🧪",  titleEn: "RM — Ingredients",   titleAr: "المكونات",            accent: "#8b5cf6" },
  { type: "qcs_rm_packaging",       key: "rm_pack",        icon: "📦",  titleEn: "RM — Packaging",     titleAr: "التعبئة",             accent: "#a855f7" },
  { type: "qcs_non_conformance",    key: "nc_reports",     icon: "🚫",  titleEn: "Non-Conformance",    titleAr: "عدم المطابقة",        accent: "#dc2626" },
  { type: "qcs_corrective_action",  key: "car_reports",    icon: "🛠️", titleEn: "Corrective Action",  titleAr: "الإجراء التصحيحي",    accent: "#16a34a" },
  { type: "qcs_internal_audit",     key: "internal_audit", icon: "📋",  titleEn: "Internal Audit",     titleAr: "التدقيق الداخلي",     accent: "#0f766e" },
  { type: "qcs_garbage_disposal",   key: "garbage",        icon: "🗑️", titleEn: "Garbage Disposal",   titleAr: "التخلص من النفايات",   accent: "#16a34a" },
  { type: "qcs_meat_waste_disposal",key: "meat_waste",     icon: "🥩",  titleEn: "Meat Waste",         titleAr: "هدر اللحوم",          accent: "#dc2626" },
  { type: "qcs_pest_control",       key: "pest_control",   icon: "🐀",  titleEn: "Pest Control",       titleAr: "مكافحة الحشرات",      accent: "#7c3aed" },
  { type: "qcs_stock_rotation",     key: "stock_rotation", icon: "📦",  titleEn: "Stock Rotation",     titleAr: "دوران المخزون",       accent: "#0ea5e9" },
  { type: "qcs_visitor_checklist",  key: "visitor",        icon: "🧍",  titleEn: "Visitor Checklist",  titleAr: "قائمة الزوار",        accent: "#0b5236" },
  { type: "qcs_staff_sickness",     key: "staff_sickness", icon: "🩺",  titleEn: "Staff Sickness",     titleAr: "أمراض الموظفين",     accent: "#0f3d2e" },
  { type: "qcs_employee_return_to_work", key: "return_to_work", icon: "🏥", titleEn: "Return to Work",  titleAr: "العودة للعمل",       accent: "#0b5236" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="QCS" branchNameAr="مراقبة الجودة" reportTypes={DASH_TYPES} accent="#0f766e" />
  },
  { key: "coolers",        icon: "🧊",  label: "Coolers",                element: <CoolersView /> },
  { key: "ph",             icon: "🧼",  label: "Personal Hygiene",       element: <PersonalHygieneView /> },
  {
    key: "clean",
    icon: "🧹",
    label: "Daily Cleanliness",
    element: (
      <DailyCleanlinessView
        ccHeader={CC_HEADER}
        selectedCleanDate=""
        cleanlinessRows={[]}
        ccFooter={{ checkedBy: "", verifiedBy: "" }}
      />
    ),
  },
  { key: "fresh",          icon: "🍗",  label: "Fresh Chicken",          element: <FreshChickenReportsView /> },
  { key: "ftr1_preload",   icon: "🚚",  label: "FTR 1 • Preloading",     element: <FTR1PreloadingViewer /> },
  { key: "ftr2_preload",   icon: "🚚",  label: "FTR 2 • Preloading",     element: <FTR2PreloadingViewer /> },
  { key: "rm_ing",         icon: "🧪",  label: "RM — Ingredients",       element: <RMInspectionReportIngredientsView /> },
  { key: "rm_pack",        icon: "📦",  label: "RM — Packaging",         element: <RMInspectionReportPackagingView /> },
  { key: "nc_reports",     icon: "🚫",  label: "Non-Conformance",        element: <NonConformanceReportsView /> },
  { key: "car_reports",    icon: "🛠️", label: "Corrective Action",      element: <CorrectiveActionReportsView /> },
  { key: "internal_audit", icon: "📋",  label: "Internal Audit",         element: <InternalAuditView /> },
  { key: "garbage",        icon: "🗑️", label: "Garbage Disposal",       element: <GarbageDisposalView /> },
  { key: "meat_waste",     icon: "🥩",  label: "Meat Waste",             element: <MeatWasteDisposalView /> },
  { key: "pest_control",   icon: "🐀",  label: "Pest Control",           element: <PestControlView /> },
  { key: "stock_rotation", icon: "📦",  label: "Stock Rotation",         element: <StockRotationView /> },
  { key: "visitor",        icon: "🧍",  label: "Visitor Checklist",      element: <VisitorChecklistView /> },
  { key: "staff_sickness", icon: "🩺",  label: "Staff Sickness",         element: <StaffSicknessView /> },
  { key: "return_to_work", icon: "🏥",  label: "Return to Work",         element: <EmployeeReturnToWorkView /> },
];

export default function QCSReportsView() {
  return (
    <BranchDailyView
      branchCode="QCS"
      title="عرض تقارير<br/>الجودة"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
