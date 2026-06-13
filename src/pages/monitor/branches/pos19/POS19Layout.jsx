// src/pages/monitor/branches/pos19/POS19Layout.jsx
// POS 19 — Input Tabs ONLY.

import React, { useState, Suspense, lazy } from "react";

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

export default function POS19Layout() {
  const [activeTab, setActiveTab] = useState("cleaningProgramme");

  const tabs = [
    { key: "cleaningProgramme", label: "🧼 Cleaning Programme Schedule" },
    { key: "dailyCleaningButchery", label: "🧹 Daily Cleaning checklist – Butchery" },
    { key: "equipmentInspection", label: "🧪 Equipment Inspection and Sanitizing Log" },
    { key: "foodTempVerification", label: "🌡️ Food Temperature Verification Log" },
    { key: "glassItemsCondition", label: "🧯 Glass items Condition Monitoring Checklist" },
    { key: "hotHoldingTemp", label: "🔥 Hot Holding Temperature Monitoring Log Sheet" },
    { key: "oilQuality", label: "🛢️ Oil Quality Monitoring Form" },
    { key: "personalHygiene", label: "🧑‍🔬 Personal hygiene checklist" },
    { key: "receivingLog", label: "📦 Receiving Log" },
    { key: "sanitizerConcentration", label: "🧴 Sanitizer Concentration Verification Log" },
    { key: "temperatureMonitoring", label: "🌡️ Temperature Monitoring Log" },
    { key: "traceability", label: "🔗 Traceability Log" },
    { key: "woodenItemsCondition", label: "🪵 Wooden items Condition Monitoring Checklist" },
    { key: "cookingTemperature", label: "🍳 Cooking Temperature Monitoring Record" },
    { key: "defrosting", label: "❄️ Defrosting Record" },
    { key: "cooling", label: "🧊 Cooling Temperature Log" },
    { key: "reheating", label: "♨️ Reheating Temperature Log" },
    { key: "calibration", label: "📏 Thermometer Calibration Log" },
    { key: "nonConformance", label: "🚫 Non-Conformance Report" },
    { key: "finishedProduct", label: "🍖 Finished Product Monitoring Checklist" },
    { key: "vegSanitation", label: "🥬 Sanitation Record (CCP) – Veg/Fruits" },
    { key: "blastFreezer", label: "🥶 Blast Freezer / Chiller Log (CCP)" },
    { key: "dryStore", label: "📦 Dry Store Temp & Humidity" },
  ];

  const panelStyle = {
    background: "#fafafa",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1.25rem",
    boxShadow: "inset 0 0 6px rgba(0,0,0,0.05)",
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
        padding: "2rem",
        background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
        direction: "ltr",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2rem",
          boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
          maxWidth: "95%",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.9rem", marginBottom: "0.5rem", color: "#1f2937" }}>
            📋 POS 19 — Operations Inputs
          </h2>
          <p style={{ color: "#6b7280", fontSize: "1rem" }}>
            Input tabs for POS 19 — standalone input forms.
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: "1",
                minWidth: "220px",
                padding: "12px 20px",
                borderRadius: "10px",
                fontWeight: 600,
                cursor: "pointer",
                border: "1.5px solid #d1d5db",
                background: activeTab === tab.key ? "#2563eb" : "#f3f4f6",
                color: activeTab === tab.key ? "#fff" : "#111827",
                boxShadow: activeTab === tab.key ? "0 4px 12px rgba(37,99,235,0.25)" : "none",
                transition: "all 0.2s",
                textAlign: "center",
              }}
              title={tab.label}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </div>
  );
}
