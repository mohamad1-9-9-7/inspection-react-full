// src/pages/monitor/branches/pos19/POS19Layout.jsx
// POS 19 — Input Tabs ONLY.

import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiActivity,
  FiAlertTriangle,
  FiArchive,
  FiCalendar,
  FiDroplet,
  FiGrid,
  FiLink,
  FiPackage,
  FiSearch,
  FiShield,
  FiSliders,
  FiThermometer,
  FiTool,
  FiTruck,
  FiX,
} from "react-icons/fi";

/* ✅ بقية تبويبات الإدخال (سننشئها لاحقاً داخل: src/pages/monitor/branches/pos19/pos19_inputs/)
   - CleaningProgrammeScheduleInput.jsx
   - DailyCleaningButcheryInput.jsx
   - EquipmentInspectionSanitizingLogInput.jsx
   - FoodTemperatureVerificationInput.jsx
   - GlassItemsConditionChecklistInput.jsx
   - HotHoldingTemperatureLogInput.jsx
   - OilQualityMonitoringInput.jsx
   - PersonalHygieneChecklistInput.jsx
   - ReceivingLogInput.jsx
   - SanitizerConcentrationVerificationInput.jsx
   - TemperatureMonitoringLogInput.jsx
   - TraceabilityLogInput.jsx
   - WoodenItemsConditionChecklistInput.jsx
*/
const CleaningProgrammeScheduleInput = lazy(() =>
  import("./pos19_inputs/CleaningProgrammeScheduleInput")
);
const DailyCleaningButcheryInput = lazy(() =>
  import("./pos19_inputs/DailyCleaningButcheryInput")
);
const EquipmentInspectionSanitizingLogInput = lazy(() =>
  import("./pos19_inputs/EquipmentInspectionSanitizingLogInput")
);
const FoodTemperatureVerificationInput = lazy(() =>
  import("./pos19_inputs/FoodTemperatureVerificationInput")
);
const GlassItemsConditionChecklistInput = lazy(() =>
  import("./pos19_inputs/GlassItemsConditionChecklistInput")
);
const HotHoldingTemperatureLogInput = lazy(() =>
  import("./pos19_inputs/HotHoldingTemperatureLogInput")
);
const OilQualityMonitoringInput = lazy(() =>
  import("./pos19_inputs/OilQualityMonitoringInput")
);
const PersonalHygieneChecklistInput = lazy(() =>
  import("./pos19_inputs/PersonalHygieneChecklistInput")
);
const ReceivingLogInput = lazy(() =>
  import("./pos19_inputs/ReceivingLogInput")
);
const SanitizerConcentrationVerificationInput = lazy(() =>
  import("./pos19_inputs/SanitizerConcentrationVerificationInput")
);
const TemperatureMonitoringLogInput = lazy(() =>
  import("./pos19_inputs/TemperatureMonitoringLogInput")
);
const TraceabilityLogInput = lazy(() =>
  import("./pos19_inputs/TraceabilityLogInput")
);
const WoodenItemsConditionChecklistInput = lazy(() =>
  import("./pos19_inputs/WoodenItemsConditionChecklistInput")
);
const CookingTemperatureMonitoringInput = lazy(() =>
  import("./pos19_inputs/CookingTemperatureMonitoringInput")
);
const DefrostingRecordInput = lazy(() =>
  import("./pos19_inputs/DefrostingRecordInput")
);
const CoolingLogInput = lazy(() =>
  import("./pos19_inputs/CoolingLogInput")
);
const ReheatingLogInput = lazy(() =>
  import("./pos19_inputs/ReheatingLogInput")
);
const CalibrationLogInput = lazy(() =>
  import("./pos19_inputs/CalibrationLogInput")
);
const NonConformanceReportInput = lazy(() =>
  import("./pos19_inputs/NonConformanceReportInput")
);
const FinishedProductMonitoringInput = lazy(() =>
  import("./pos19_inputs/FinishedProductMonitoringInput")
);
const VegSanitationInput = lazy(() =>
  import("./pos19_inputs/VegSanitationInput")
);
const BlastFreezerInput = lazy(() =>
  import("./pos19_inputs/BlastFreezerInput")
);
const DryStoreTempHumidityInput = lazy(() =>
  import("./pos19_inputs/DryStoreTempHumidityInput")
);

const REPORT_CATEGORIES = [
  { key: "all", label: "All Reports", labelAr: "كل التقارير", color: "#1e3a5f" },
  { key: "cleaning", label: "Cleaning & Sanitizing", labelAr: "التنظيف والتعقيم", color: "#0f766e" },
  { key: "temperature", label: "Temperature Control", labelAr: "مراقبة الحرارة", color: "#0369a1" },
  { key: "operations", label: "Receiving & Traceability", labelAr: "الاستلام والتتبع", color: "#7c3aed" },
  { key: "quality", label: "Quality & Compliance", labelAr: "الجودة والامتثال", color: "#b45309" },
];

const REPORTS = [
  { key: "cleaningProgramme", label: "Cleaning Programme Schedule", labelAr: "جدول برنامج التنظيف", category: "cleaning", cadence: "Monthly", cadenceAr: "شهري", icon: FiCalendar },
  { key: "dailyCleaningButchery", label: "Daily Cleaning Checklist – Butchery", labelAr: "قائمة التحقق من التنظيف اليومي – الملحمة", category: "cleaning", cadence: "Daily", cadenceAr: "يومي", icon: FiDroplet },
  { key: "equipmentInspection", label: "Equipment Inspection and Sanitizing Log", labelAr: "سجل فحص وتعقيم المعدات", category: "cleaning", cadence: "Every 4 Hours", cadenceAr: "كل 4 ساعات", icon: FiTool },
  { key: "foodTempVerification", label: "Food Temperature Verification Log", labelAr: "سجل التحقق من درجات حرارة الطعام", category: "temperature", cadence: "Daily", cadenceAr: "يومي", icon: FiThermometer },
  { key: "glassItemsCondition", label: "Glass Items Condition Monitoring Checklist", labelAr: "قائمة مراقبة حالة الأدوات الزجاجية", category: "quality", cadence: "Weekly", cadenceAr: "أسبوعي", icon: FiShield },
  { key: "hotHoldingTemp", label: "Hot Holding Temperature Monitoring Log Sheet", labelAr: "سجل مراقبة درجة حرارة الحفظ الساخن", category: "temperature", cadence: "Daily", cadenceAr: "يومي", icon: FiThermometer },
  { key: "oilQuality", label: "Oil Quality Monitoring Form", labelAr: "نموذج مراقبة جودة الزيت", category: "quality", cadence: "Daily", cadenceAr: "يومي", icon: FiActivity },
  { key: "personalHygiene", label: "Personal Hygiene Checklist", labelAr: "قائمة التحقق من النظافة الشخصية", category: "quality", cadence: "Daily", cadenceAr: "يومي", icon: FiShield },
  { key: "receivingLog", label: "Receiving Log", labelAr: "سجل الاستلام", category: "operations", cadence: "Per Delivery", cadenceAr: "لكل استلام", icon: FiTruck },
  { key: "sanitizerConcentration", label: "Sanitizer Concentration Verification Log", labelAr: "سجل التحقق من تركيز المطهر", category: "cleaning", cadence: "Daily", cadenceAr: "يومي", icon: FiDroplet },
  { key: "temperatureMonitoring", label: "Temperature Monitoring Log", labelAr: "سجل مراقبة درجات الحرارة", category: "temperature", cadence: "Daily", cadenceAr: "يومي", icon: FiThermometer },
  { key: "traceability", label: "Traceability Log", labelAr: "سجل التتبع", category: "operations", cadence: "Per Batch", cadenceAr: "لكل دفعة", icon: FiLink },
  { key: "woodenItemsCondition", label: "Wooden Items Condition Monitoring Checklist", labelAr: "قائمة مراقبة حالة الأدوات الخشبية", category: "quality", cadence: "Weekly", cadenceAr: "أسبوعي", icon: FiArchive },
  { key: "cookingTemperature", label: "Cooking Temperature Monitoring Record", labelAr: "سجل مراقبة درجة حرارة الطبخ", category: "temperature", cadence: "Per Batch", cadenceAr: "لكل دفعة", icon: FiThermometer },
  { key: "defrosting", label: "Defrosting Record", labelAr: "سجل إذابة التجميد", category: "temperature", cadence: "Per Batch", cadenceAr: "لكل دفعة", icon: FiThermometer },
  { key: "cooling", label: "Cooling Temperature Log", labelAr: "سجل مراقبة درجة حرارة التبريد", category: "temperature", cadence: "Per Batch", cadenceAr: "لكل دفعة", icon: FiThermometer },
  { key: "reheating", label: "Reheating Temperature Log", labelAr: "سجل مراقبة درجة حرارة إعادة التسخين", category: "temperature", cadence: "Per Batch", cadenceAr: "لكل دفعة", icon: FiThermometer },
  { key: "calibration", label: "Thermometer Calibration Log", labelAr: "سجل معايرة موازين الحرارة", category: "temperature", cadence: "Weekly", cadenceAr: "أسبوعي", icon: FiSliders },
  { key: "nonConformance", label: "Non-Conformance Report", labelAr: "تقرير عدم المطابقة", category: "quality", cadence: "As Needed", cadenceAr: "عند الحاجة", icon: FiAlertTriangle },
  { key: "finishedProduct", label: "Finished Product Monitoring Checklist", labelAr: "قائمة مراقبة المنتج النهائي", category: "operations", cadence: "Daily", cadenceAr: "يومي", icon: FiPackage },
  { key: "vegSanitation", label: "Sanitation Record (CCP) – Veg/Fruits", labelAr: "سجل تعقيم الخضروات والفواكه", category: "cleaning", cadence: "CCP", cadenceAr: "نقطة تحكم حرجة", icon: FiDroplet },
  { key: "blastFreezer", label: "Blast Freezer / Chiller Log (CCP)", labelAr: "سجل التجميد والتبريد السريع", category: "temperature", cadence: "CCP", cadenceAr: "نقطة تحكم حرجة", icon: FiThermometer },
  { key: "dryStore", label: "Dry Store Temp & Humidity", labelAr: "سجل حرارة ورطوبة المخزن الجاف", category: "temperature", cadence: "Daily", cadenceAr: "يومي", icon: FiArchive },
];

export default function POS19Layout() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("cleaningProgramme");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const visibleReports = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return REPORTS.filter((report) => {
      const inCategory = activeCategory === "all" || report.category === activeCategory;
      const matchesSearch = !term || `${report.label} ${report.labelAr} ${report.cadence} ${report.cadenceAr}`.toLocaleLowerCase().includes(term);
      return inCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  const requestedTab = searchParams.get("tab");
  useEffect(() => {
    if (requestedTab && REPORTS.some((tab) => tab.key === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  const panelStyle = {
    width: "100%",
    background: "#fafafa",
    border: "none",
    borderRadius: 0,
    padding: 0,
    boxShadow: "none",
    boxSizing: "border-box",
    minHeight: 280,
  };

  const Loading = ({ text = "Loading…" }) => (
    <div style={{ fontWeight: 800, color: "#6b7280" }}>{text}</div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "cleaningProgramme":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <CleaningProgrammeScheduleInput />
            </Suspense>
          </div>
        );
      case "dailyCleaningButchery":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <DailyCleaningButcheryInput />
            </Suspense>
          </div>
        );
      case "equipmentInspection":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <EquipmentInspectionSanitizingLogInput />
            </Suspense>
          </div>
        );
      case "foodTempVerification":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <FoodTemperatureVerificationInput />
            </Suspense>
          </div>
        );
      case "glassItemsCondition":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <GlassItemsConditionChecklistInput />
            </Suspense>
          </div>
        );
      case "hotHoldingTemp":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <HotHoldingTemperatureLogInput />
            </Suspense>
          </div>
        );
      case "oilQuality":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <OilQualityMonitoringInput />
            </Suspense>
          </div>
        );
      case "personalHygiene":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <PersonalHygieneChecklistInput />
            </Suspense>
          </div>
        );
      case "receivingLog":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <ReceivingLogInput />
            </Suspense>
          </div>
        );
      case "sanitizerConcentration":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <SanitizerConcentrationVerificationInput />
            </Suspense>
          </div>
        );
      case "temperatureMonitoring":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <TemperatureMonitoringLogInput />
            </Suspense>
          </div>
        );
      case "traceability":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <TraceabilityLogInput />
            </Suspense>
          </div>
        );
      case "woodenItemsCondition":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <WoodenItemsConditionChecklistInput />
            </Suspense>
          </div>
        );
      case "cookingTemperature":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <CookingTemperatureMonitoringInput />
            </Suspense>
          </div>
        );
      case "defrosting":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <DefrostingRecordInput />
            </Suspense>
          </div>
        );
      case "cooling":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <CoolingLogInput />
            </Suspense>
          </div>
        );
      case "reheating":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <ReheatingLogInput />
            </Suspense>
          </div>
        );
      case "calibration":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading />}>
              <CalibrationLogInput />
            </Suspense>
          </div>
        );
      case "nonConformance":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading text="Loading Non-Conformance form…" />}>
              <NonConformanceReportInput />
            </Suspense>
          </div>
        );
      case "finishedProduct":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading text="Loading Finished Product Checklist…" />}>
              <FinishedProductMonitoringInput />
            </Suspense>
          </div>
        );
      case "vegSanitation":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading text="Loading Sanitation Record…" />}>
              <VegSanitationInput />
            </Suspense>
          </div>
        );
      case "blastFreezer":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading text="Loading Blast Freezer Log…" />}>
              <BlastFreezerInput />
            </Suspense>
          </div>
        );
      case "dryStore":
        return (
          <div style={panelStyle}>
            <Suspense fallback={<Loading text="Loading Dry Store Record…" />}>
              <DryStoreTempHumidityInput />
            </Suspense>
          </div>
        );

      default:
        return (
          <div
            style={{
              ...panelStyle,
              color: "#6b7280",
              fontWeight: 700,
            }}
          >
            Pick a tab to start entering records.
          </div>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        margin: 0,
        padding: 0,
        background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
        boxSizing: "border-box",
        direction: "ltr",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "95%",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 0,
          boxShadow: "none",
          maxWidth: "95%",
          margin: "12px auto",
          boxSizing: "border-box",
        }}
      >
        <section style={{ padding: "18px 18px 16px", borderBottom: "1px solid #dbe5f1", background: "#f8fbff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#1e3a5f", fontWeight: 800, fontSize: 12, letterSpacing: ".04em" }}>
                <FiGrid aria-hidden="true" /> POS 19 / AL WARQA KITCHEN
              </div>
              <h1 style={{ fontSize: 24, lineHeight: 1.2, margin: "7px 0 3px", color: "#0f172a" }}>Operations Inputs</h1>
              <div dir="rtl" style={{ color: "#475569", fontSize: 14, fontWeight: 700 }}>نماذج إدخال التشغيل</div>
            </div>
            <div style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", color: "#334155", fontSize: 12, fontWeight: 800 }}>
              {REPORTS.length} Reports / {REPORTS.length} تقرير
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flex: "1 1 290px", maxWidth: 430, minWidth: 0 }}>
              <FiSearch aria-hidden="true" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
              <input
                aria-label="Search reports"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search a report / ابحث عن تقرير"
                style={{ width: "100%", minHeight: 38, boxSizing: "border-box", border: "1px solid #b8c8dc", borderRadius: 7, background: "#fff", padding: "8px 38px 8px 34px", color: "#0f172a", fontSize: 13 }}
              />
              {search && (
                <button type="button" aria-label="Clear search" onClick={() => setSearch("")} style={{ position: "absolute", right: 5, top: 5, width: 28, height: 28, border: "none", borderRadius: 6, background: "transparent", color: "#64748b", cursor: "pointer" }}>
                  <FiX aria-hidden="true" />
                </button>
              )}
            </div>
            <div style={{ marginLeft: "auto", color: "#64748b", fontSize: 12, fontWeight: 700 }}>{visibleReports.length} visible / ظاهر</div>
          </div>

          <div role="tablist" aria-label="Report categories" style={{ display: "flex", gap: 7, marginTop: 12, overflowX: "auto", paddingBottom: 2 }}>
            {REPORT_CATEGORIES.map((category) => {
              const selected = activeCategory === category.key;
              return (
                <button
                  type="button"
                  key={category.key}
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveCategory(category.key)}
                  style={{ flex: "0 0 auto", border: `1px solid ${selected ? category.color : "#cbd5e1"}`, borderRadius: 7, background: selected ? category.color : "#fff", color: selected ? "#fff" : "#334155", padding: "7px 10px", cursor: "pointer", textAlign: "left", fontSize: 11, fontWeight: 800, lineHeight: 1.25 }}
                >
                  <span style={{ display: "block" }}>{category.label}</span>
                  <span dir="rtl" style={{ display: "block", marginTop: 2, fontWeight: 700 }}>{category.labelAr}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ padding: 18, background: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
            {visibleReports.map((report) => {
              const category = REPORT_CATEGORIES.find((item) => item.key === report.category);
              const Icon = report.icon;
              const selected = activeTab === report.key;
              const isCritical = report.cadence === "CCP";
              return (
                <button
                  type="button"
                  key={report.key}
                  onClick={() => setActiveTab(report.key)}
                  style={{ width: "100%", minHeight: 96, padding: 10, border: `1px solid ${selected ? category.color : "#d7e1ee"}`, borderLeft: `4px solid ${category.color}`, borderRadius: 8, background: selected ? "#f0f7ff" : "#fff", color: "#0f172a", boxShadow: selected ? "0 4px 12px rgba(15, 23, 42, 0.10)" : "0 1px 2px rgba(15, 23, 42, 0.04)", cursor: "pointer", textAlign: "left", transition: "border-color .16s ease, box-shadow .16s ease, background .16s ease", boxSizing: "border-box" }}
                  title={`${report.label} / ${report.labelAr}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, background: `${category.color}14`, color: category.color }}><Icon size={15} aria-hidden="true" /></span>
                    <span style={{ borderRadius: 5, padding: "3px 6px", background: isCritical ? "#fff1f2" : "#f1f5f9", color: isCritical ? "#be123c" : "#475569", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>{report.cadence}</span>
                  </div>
                  <span style={{ display: "block", marginTop: 7, color: "#1e293b", fontSize: 12, lineHeight: 1.3, fontWeight: 800 }}>{report.label}</span>
                  <span dir="rtl" style={{ display: "block", marginTop: 3, color: "#64748b", fontSize: 11, lineHeight: 1.3, fontWeight: 700 }}>{report.labelAr}</span>
                </button>
              );
            })}
          </div>
          {!visibleReports.length && (
            <div style={{ padding: 28, border: "1px dashed #b8c8dc", borderRadius: 8, textAlign: "center", color: "#64748b", fontSize: 13, fontWeight: 700 }}>
              No matching reports / لا توجد تقارير مطابقة
            </div>
          )}
        </section>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}
