// src/pages/monitor/branches/pos19/POS19DailyView.jsx
// POS 19 — Daily Viewer Hub (unified design عبر BranchDailyView — تبويبات أفقية فوق)
import React, { lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";

// ✅ Personal Hygiene View
const PHView   = lazy(() => import("./view pos 19/PersonalHygieneChecklistView"));
// ✅ Daily Cleaning (Butchery) View
const DCView   = lazy(() => import("./view pos 19/DailyCleaningChecklistView"));
// ✅ Equipment Inspection & Sanitizing Log View
const EIView   = lazy(() => import("./view pos 19/EquipmentInspectionSanitizingLogView"));
// ✅ Glass Items Condition Monitoring Checklist View
const GlassView = lazy(() => import("./view pos 19/GlassItemsConditionChecklistView"));
// ✅ Receiving Log (Butchery) View
const RLView   = lazy(() => import("./view pos 19/ReceivingLogView"));
// ✅ Oil Quality Monitoring View
const OilView  = lazy(() => import("./view pos 19/OilQualityMonitoringView"));
// ✅ Food Temperature Verification Log View
const FTView   = lazy(() => import("./view pos 19/FoodTemperatureVerificationView"));
// ✅ Cleaning Programme Schedule View
const CPSView  = lazy(() => import("./view pos 19/CleaningProgrammeScheduleView"));
// ✅ Hot Holding Temperature Log View
const HHTView  = lazy(() => import("./view pos 19/HotHoldingTemperatureLogView"));
// ✅ Sanitizer Concentration Verification View
const SCVView  = lazy(() => import("./view pos 19/SanitizerConcentrationVerificationView"));
// ✅ Temperature Monitoring Log View
const TMLView  = lazy(() => import("./view pos 19/TemperatureMonitoringLogView"));
// ✅ Traceability Log View
const TRLView  = lazy(() => import("./view pos 19/TraceabilityLogView"));
// ✅ Wooden Items Condition Checklist View
const WICView  = lazy(() => import("./view pos 19/WoodenItemsConditionChecklistView"));
// ✅ Cooking Temperature Monitoring Record View
const CTMView  = lazy(() => import("./view pos 19/CookingTemperatureMonitoringView"));
// ✅ Defrosting Record View
const DFView   = lazy(() => import("./view pos 19/DefrostingRecordView"));
// ✅ Cooling Log View
const CoolView = lazy(() => import("./view pos 19/CoolingLogView"));
// ✅ Reheating Log View
const RHView   = lazy(() => import("./view pos 19/ReheatingLogView"));
// ✅ Calibration Log View
const CalView  = lazy(() => import("./view pos 19/CalibrationLogView"));
// ✅ Non-Conformance Report View
const NCView   = lazy(() => import("./view pos 19/NonConformanceReportsView"));
// ✅ Finished Product Monitoring Checklist View
const FPView   = lazy(() => import("./view pos 19/FinishedProductMonitoringView"));
// ✅ Sanitation Record (CCP) – Veg/Fruits View
const VSView   = lazy(() => import("./view pos 19/VegSanitationView"));
// ✅ Blast Freezer / Chiller Log (CCP) View
const BFView   = lazy(() => import("./view pos 19/BlastFreezerView"));
// ✅ Dry Store Temp & Humidity View
const DSView   = lazy(() => import("./view pos 19/DryStoreTempHumidityView"));
// ✅ Staff Sickness / Occupational Injury View (نفس نموذج QCS)
const SSView   = lazy(() => import("../qcs/StaffSicknessView"));
// ✅ Employee Return to Work View (نفس نموذج QCS)
const ERTWView = lazy(() => import("../qcs/EmployeeReturnToWorkView"));

/* ── Overview — today's status per report type, read from the server.
   The old overview read a "pos19_reports" localStorage key that nothing has
   written for months, so the default tab always said "no reports yet". ── */
const DASH_TYPES = [
  { type: "pos19_cleaning_programme_schedule",  key: "cleaningProgramme",      icon: "🧼", titleEn: "Cleaning Programme",          titleAr: "جدول برنامج التنظيف",           accent: "#22c55e" },
  { type: "pos19_daily_cleaning",               key: "dailyCleaningButchery",  icon: "🧹", titleEn: "Daily Cleaning",              titleAr: "التنظيف اليومي",                accent: "#16a34a" },
  { type: "pos19_equipment_inspection",         key: "equipmentInspection",    icon: "🧪", titleEn: "Equipment Inspection",        titleAr: "فحص وتعقيم المعدات",            accent: "#f59e0b" },
  { type: "pos19_food_temperature_verification",key: "foodTempVerification",   icon: "🌡️", titleEn: "Food Temperature",            titleAr: "التحقق من حرارة الطعام",         accent: "#ef4444" },
  { type: "pos19_glass_items_condition",        key: "glassItemsCondition",    icon: "🧯", titleEn: "Glass Items",                 titleAr: "الأدوات الزجاجية",              accent: "#06b6d4" },
  { type: "pos19_hot_holding_temperature",      key: "hotHoldingTemp",         icon: "🔥", titleEn: "Hot Holding",                 titleAr: "الحفظ الساخن",                  accent: "#f97316" },
  { type: "pos19_oil_quality_monitoring",       key: "oilQuality",             icon: "🛢️", titleEn: "Oil Quality",                 titleAr: "جودة الزيت",                    accent: "#ca8a04" },
  { type: "pos19_personal_hygiene",             key: "personalHygiene",        icon: "🧑‍🔬", titleEn: "Personal Hygiene",          titleAr: "النظافة الشخصية",               accent: "#0ea5e9" },
  { type: "pos19_receiving_log_butchery",       key: "receivingLog",           icon: "📦", titleEn: "Receiving Log",               titleAr: "سجل الاستلام",                  accent: "#a855f7" },
  { type: "pos19_sanitizer_concentration",      key: "sanitizerConcentration", icon: "🧴", titleEn: "Sanitizer Concentration",     titleAr: "تركيز المطهر",                  accent: "#0891b2" },
  { type: "pos19_temperature_monitoring",       key: "temperatureMonitoring",  icon: "🌡️", titleEn: "Temperature Monitoring",      titleAr: "مراقبة درجات الحرارة",          accent: "#3b82f6" },
  { type: "pos19_traceability_log",             key: "traceability",           icon: "🔗", titleEn: "Traceability Log",            titleAr: "سجل التتبع",                    accent: "#8b5cf6" },
  { type: "pos19_wooden_items_condition",       key: "woodenItemsCondition",   icon: "🪵", titleEn: "Wooden Items",                titleAr: "الأدوات الخشبية",               accent: "#92400e" },
  { type: "pos19_cooking_temperature",          key: "cookingTemperature",     icon: "🍳", titleEn: "Cooking Temperature",         titleAr: "حرارة الطبخ",                   accent: "#e11d48" },
  { type: "pos19_defrosting_record",            key: "defrosting",             icon: "❄️", titleEn: "Defrosting",                  titleAr: "إذابة التجميد",                 accent: "#38bdf8" },
  { type: "pos19_cooling_log",                  key: "cooling",                icon: "🧊", titleEn: "Cooling Log",                 titleAr: "سجل التبريد",                   accent: "#0284c7" },
  { type: "pos19_reheating_log",                key: "reheating",              icon: "♨️", titleEn: "Reheating Log",               titleAr: "إعادة التسخين",                 accent: "#dc2626" },
  { type: "pos19_calibration_log",              key: "calibration",            icon: "📏", titleEn: "Thermometer Calibration",     titleAr: "معايرة موازين الحرارة",         accent: "#64748b" },
  { type: "pos19_non_conformance",              key: "nonConformance",         icon: "🚫", titleEn: "Non-Conformance",             titleAr: "عدم المطابقة",                  accent: "#b91c1c" },
  { type: "pos19_finished_product_monitoring",  key: "finishedProduct",        icon: "🍖", titleEn: "Finished Product",            titleAr: "المنتج النهائي",                accent: "#be123c" },
  { type: "pos19_veg_sanitation_ccp",           key: "vegSanitation",          icon: "🥬", titleEn: "Veg/Fruits Sanitation (CCP)", titleAr: "تعقيم الخضار والفواكه",          accent: "#65a30d" },
  { type: "pos19_blast_freezer_ccp",            key: "blastFreezer",           icon: "🥶", titleEn: "Blast Freezer (CCP)",         titleAr: "التجميد السريع",                accent: "#1d4ed8" },
  { type: "pos19_dry_store_temp_humidity",      key: "dryStore",               icon: "📦", titleEn: "Dry Store",                   titleAr: "المخزن الجاف",                  accent: "#a16207" },
  { type: "pos19_staff_sickness",               key: "staffSickness",          icon: "🩺", titleEn: "Staff Sickness",              titleAr: "مرض الموظفين",                  accent: "#0f766e" },
  { type: "pos19_employee_return_to_work",      key: "employeeReturnToWork",   icon: "🏥", titleEn: "Return to Work",              titleAr: "العودة إلى العمل",              accent: "#0b5236" },
];

const TABS = [
  { key: "overview",               icon: "📊", label: "Overview — POS 19",                      labelAr: "نظرة عامة — POS 19",                element: <BranchDashboard branchName="Al Warqa Kitchen (POS 19)" branchNameAr="مطبخ الورقاء (POS 19)" reportTypes={DASH_TYPES} accent="#0ea5e9" /> },
  { key: "cleaningProgramme",      icon: "🧼", label: "Cleaning Programme Schedule",            labelAr: "جدول برنامج التنظيف",              element: <CPSView />,   loaderLabel: "Cleaning Programme" },
  { key: "dailyCleaningButchery",  icon: "🧹", label: "Daily Cleaning – Butchery",              labelAr: "التنظيف اليومي – الملحمة",         element: <DCView />,    loaderLabel: "Daily Cleaning" },
  { key: "equipmentInspection",    icon: "🧪", label: "Equipment Inspection & Sanitizing",      labelAr: "فحص وتعقيم المعدات",              element: <EIView />,    loaderLabel: "Equipment Inspection" },
  { key: "foodTempVerification",   icon: "🌡️", label: "Food Temperature Verification",          labelAr: "التحقق من حرارة الطعام",           element: <FTView />,    loaderLabel: "Food Temperature" },
  { key: "glassItemsCondition",    icon: "🧯", label: "Glass Items Condition Monitoring",       labelAr: "مراقبة حالة الأدوات الزجاجية",     element: <GlassView />, loaderLabel: "Glass Items" },
  { key: "hotHoldingTemp",         icon: "🔥", label: "Hot Holding Temperature Log",            labelAr: "سجل حرارة الحفظ الساخن",           element: <HHTView />,   loaderLabel: "Hot Holding Temperature" },
  { key: "oilQuality",             icon: "🛢️", label: "Oil Quality Monitoring",                 labelAr: "مراقبة جودة الزيت",               element: <OilView />,   loaderLabel: "Oil Quality" },
  { key: "personalHygiene",        icon: "🧑‍🔬", label: "Personal Hygiene Checklist",          labelAr: "قائمة النظافة الشخصية",           element: <PHView />,    loaderLabel: "Personal Hygiene" },
  { key: "receivingLog",           icon: "📦", label: "Receiving Log",                          labelAr: "سجل الاستلام",                    element: <RLView />,    loaderLabel: "Receiving Log" },
  { key: "sanitizerConcentration", icon: "🧴", label: "Sanitizer Concentration Log",            labelAr: "سجل تركيز المطهر",                element: <SCVView />,   loaderLabel: "Sanitizer Concentration" },
  { key: "temperatureMonitoring",  icon: "🌡️", label: "Temperature Monitoring Log",             labelAr: "سجل مراقبة درجات الحرارة",         element: <TMLView />,   loaderLabel: "Temperature Monitoring" },
  { key: "traceability",           icon: "🔗", label: "Traceability Log",                       labelAr: "سجل التتبع",                      element: <TRLView />,   loaderLabel: "Traceability Log" },
  { key: "woodenItemsCondition",   icon: "🪵", label: "Wooden Items Condition Monitoring",      labelAr: "مراقبة حالة الأدوات الخشبية",      element: <WICView />,   loaderLabel: "Wooden Items Condition" },
  { key: "cookingTemperature",     icon: "🍳", label: "Cooking Temperature Record",             labelAr: "سجل حرارة الطبخ",                 element: <CTMView />,   loaderLabel: "Cooking Temperature Record" },
  { key: "defrosting",             icon: "❄️", label: "Defrosting Record",                      labelAr: "سجل إذابة التجميد",               element: <DFView />,    loaderLabel: "Defrosting Record" },
  { key: "cooling",                icon: "🧊", label: "Cooling Temperature Log",                labelAr: "سجل حرارة التبريد",               element: <CoolView />,  loaderLabel: "Cooling Log" },
  { key: "reheating",              icon: "♨️", label: "Reheating Temperature Log",              labelAr: "سجل حرارة إعادة التسخين",          element: <RHView />,    loaderLabel: "Reheating Log" },
  { key: "calibration",            icon: "📏", label: "Thermometer Calibration Log",            labelAr: "معايرة موازين الحرارة",           element: <CalView />,   loaderLabel: "Calibration Log" },
  { key: "nonConformance",         icon: "🚫", label: "Non-Conformance Report",                 labelAr: "تقرير عدم المطابقة",              element: <NCView />,    loaderLabel: "Non-Conformance Report" },
  { key: "finishedProduct",        icon: "🍖", label: "Finished Product Monitoring Checklist",  labelAr: "مراقبة المنتج النهائي",           element: <FPView />,    loaderLabel: "Finished Product Checklist" },
  { key: "vegSanitation",          icon: "🥬", label: "Sanitation Record (CCP) – Veg/Fruits",   labelAr: "تعقيم الخضروات والفواكه (CCP)",    element: <VSView />,    loaderLabel: "Sanitation Record (CCP)" },
  { key: "blastFreezer",           icon: "🥶", label: "Blast Freezer / Chiller Log (CCP)",      labelAr: "التجميد/التبريد السريع (CCP)",     element: <BFView />,    loaderLabel: "Blast Freezer / Chiller Log" },
  { key: "dryStore",               icon: "📦", label: "Dry Store Temp & Humidity",              labelAr: "حرارة ورطوبة المخزن الجاف",        element: <DSView />,    loaderLabel: "Dry Store Temp & Humidity" },
  { key: "staffSickness",          icon: "🩺", label: "Staff Sickness / Occupational Injury",   labelAr: "مرض الموظفين / إصابات العمل",      element: <SSView type="pos19_staff_sickness" reporter="pos19" />,             loaderLabel: "Staff Sickness" },
  { key: "employeeReturnToWork",   icon: "🏥", label: "Employee Return to Work",                labelAr: "عودة الموظف إلى العمل",           element: <ERTWView type="pos19_employee_return_to_work" reporter="pos19" />,  loaderLabel: "Employee Return to Work" },
];

/* ─── Main component ─── */
export default function POS19DailyView() {
  return (
    <BranchDailyView
      branchCode="POS-19"
      title="مطبخ الورقاء — عرض التقارير"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
