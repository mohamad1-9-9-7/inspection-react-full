// src/pages/monitor/branches/qcs/QCSReportsView.jsx
// QCS — reports hub. Same sidebar as the QCS input hub (QCSReport.jsx): one
// shared component, _shared/QcsSidebarHub, so the two menus cannot drift.
// The open report lives in ?rtab= (unchanged keys, old links still land).
import React from "react";
import lazyWithRetry from "../../../../utils/lazyWithRetry";
import BranchDashboard from "../_shared/BranchDashboard";
import QcsSidebarHub, {
  QCS_GROUPS,
  IconBox, IconSnow, IconHygiene, IconCleaning, IconChicken, IconTruck, IconFlask, IconPackage,
  IconAlert, IconWrench, IconClipboard, IconTrash, IconMeat, IconBug, IconRotate, IconUserCheck,
  IconHealth, IconReturn, IconReject, IconChart,
} from "../_shared/QcsSidebarHub";

// Resilient lazy: retries the chunk fetch and self-heals after a deploy /
// network blip instead of white-screening the route (see lazyWithRetry.js).
const lazy = lazyWithRetry;

const QCSRawMaterialView                = lazy(() => import("../../../admin/QCSRawMaterialView"));
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

// 🆕 Product Rejection view
const ProductRejectionView              = lazy(() => import("./ProductRejectionView"));

// 🆕 Employee Warning / Notice view
const EmployeeWarningView               = lazy(() => import("./EmployeeWarningView"));

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
  { type: "qcs-coolers",            key: "coolers",        icon: "🧊",  titleEn: "Coolers",            titleAr: "البرادات",            accent: "#06b6d4" },
  { type: "qcs-ph",                 key: "ph",             icon: "🧼",  titleEn: "Personal Hygiene",   titleAr: "النظافة الشخصية",     accent: "#0ea5e9" },
  { type: "qcs-clean",              key: "clean",          icon: "🧹",  titleEn: "Daily Cleanliness",  titleAr: "النظافة اليومية",     accent: "#22c55e" },
  { type: "pos_al_qusais_fresh_chicken_receiving", key: "fresh", icon: "🍗", titleEn: "Fresh Chicken", titleAr: "الدجاج الطازج", accent: "#ef4444" },
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
  { type: "qcs_employee_return_to_work", key: "return_to_work",    icon: "🏥", titleEn: "Return to Work",      titleAr: "العودة للعمل",        accent: "#0b5236" },
  { type: "qcs_product_rejection",       key: "product_rejection", icon: "🚫", titleEn: "Product Rejection",   titleAr: "رفض المنتجات",        accent: "#dc2626" },
  { type: "qcs_employee_warning",        key: "employee_warning",  icon: "⚠️", titleEn: "Employee Warning",    titleAr: "إنذارات الموظفين",    accent: "#b91c1c" },
];

/* Overview first, then the same sections as the input hub. Titles match the
   input form each report comes from. */
const GROUPS = [
  { key: "overview", label: "OVERVIEW", color: "#22d3ee", Icon: IconChart },
  ...QCS_GROUPS,
];

const TABS = [
  { key: "overview", group: "overview", title: "Overview", subtitle: "All QCS reports at a glance", Icon: IconChart, accent: "#0f766e",
    element: <BranchDashboard branchName="QCS" branchNameAr="مراقبة الجودة" reportTypes={DASH_TYPES} accent="#0f766e" /> },

  // ── Receiving & Storage ──
  { key: "raw_material",   group: "receiving",  title: "Raw Material Receipt",   subtitle: "Shipment inspections",          Icon: IconBox,       accent: "#0ea5e9", element: <QCSRawMaterialView /> },
  { key: "coolers",        group: "receiving",  title: "Coolers Temperatures",   subtitle: "Cold chain monitoring",         Icon: IconSnow,      accent: "#3b82f6", element: <CoolersView /> },
  { key: "stock_rotation", group: "receiving",  title: "Stock Rotation",         subtitle: "FIFO / FEFO audits",            Icon: IconRotate,    accent: "#6366f1", element: <StockRotationView /> },

  // ── Hygiene & Cleaning ──
  { key: "ph",             group: "hygiene",    title: "Personal Hygiene",       subtitle: "Employee checklists",           Icon: IconHygiene,   accent: "#14b8a6", element: <PersonalHygieneView /> },
  { key: "clean",          group: "hygiene",    title: "Daily Cleanliness",      subtitle: "Facility cleaning records",     Icon: IconCleaning,  accent: "#22c55e",
    element: (
      <DailyCleanlinessView
        ccHeader={CC_HEADER}
        selectedCleanDate=""
        cleanlinessRows={[]}
        ccFooter={{ checkedBy: "", verifiedBy: "" }}
      />
    ) },
  { key: "visitor",        group: "hygiene",    title: "Visitor Checklist",      subtitle: "Entry screening",               Icon: IconUserCheck, accent: "#84cc16", element: <VisitorChecklistView /> },

  // ── Product Inspection ──
  { key: "fresh",          group: "inspection", title: "Fresh Chicken",          subtitle: "Al Qusais receiving",           Icon: IconChicken,   accent: "#f59e0b", element: <FreshChickenReportsView /> },
  { key: "ftr2_preload",   group: "inspection", title: "Meat Inspection FTR 2",  subtitle: "Mamzar Park • pre-loading",     Icon: IconTruck,     accent: "#e11d48", element: <FTR2PreloadingViewer /> },
  { key: "ftr1_preload",   group: "inspection", title: "Meat Inspection FTR 1",  subtitle: "Mushrif Park • pre-loading",    Icon: IconTruck,     accent: "#be123c", element: <FTR1PreloadingViewer /> },
  { key: "rm_ing",         group: "inspection", title: "Physical — Ingredients", subtitle: "Ingredient inspection reports", Icon: IconFlask,     accent: "#a855f7", element: <RMInspectionReportIngredientsView /> },
  { key: "rm_pack",        group: "inspection", title: "Physical — Packaging",   subtitle: "Packaging inspection reports",  Icon: IconPackage,   accent: "#8b5cf6", element: <RMInspectionReportPackagingView /> },

  // ── Quality & Compliance ──
  { key: "nc_reports",     group: "quality",    title: "Non-Conformance",        subtitle: "NCR reports",                   Icon: IconAlert,     accent: "#f97316", element: <NonConformanceReportsView /> },
  { key: "car_reports",    group: "quality",    title: "Corrective Action",      subtitle: "CAPA reports",                  Icon: IconWrench,    accent: "#0891b2", element: <CorrectiveActionReportsView /> },
  { key: "internal_audit", group: "quality",    title: "Internal Audit",         subtitle: "Audit checklists",              Icon: IconClipboard, accent: "#0f766e", element: <InternalAuditView /> },
  { key: "product_rejection", group: "quality", title: "Product Rejection",      subtitle: "Rejection reports",             Icon: IconReject,    accent: "#dc2626", element: <ProductRejectionView /> },
  { key: "employee_warning",  group: "quality", title: "Employee Warning",       subtitle: "Warnings / notices",            Icon: IconAlert,     accent: "#b91c1c", element: <EmployeeWarningView /> },

  // ── Waste & Pest ──
  { key: "garbage",        group: "waste",      title: "Garbage Disposal",       subtitle: "Disposal log",                  Icon: IconTrash,     accent: "#64748b", element: <GarbageDisposalView /> },
  { key: "meat_waste",     group: "waste",      title: "Meat Waste Disposal",    subtitle: "Condemned product log",         Icon: IconMeat,      accent: "#b45309", element: <MeatWasteDisposalView /> },
  { key: "pest_control",   group: "waste",      title: "Pest Control",           subtitle: "Monitoring log",                Icon: IconBug,       accent: "#7c3aed", element: <PestControlView /> },

  // ── People & Health ──
  { key: "staff_sickness", group: "people",     title: "Staff Sickness",         subtitle: "Illness / occupational injury", Icon: IconHealth,    accent: "#ec4899", element: <StaffSicknessView /> },
  { key: "return_to_work", group: "people",     title: "Return to Work",         subtitle: "Fitness clearance",             Icon: IconReturn,    accent: "#10b981", element: <EmployeeReturnToWorkView /> },
];

export default function QCSReportsView() {
  return (
    <QcsSidebarHub
      tabs={TABS}
      groups={GROUPS}
      brandSub="Reports"
      crumb="Reports"
      param="rtab"
      defaultKey="overview"
      storagePrefix="qcs_view_nav"
      itemNoun="reports"
    />
  );
}
