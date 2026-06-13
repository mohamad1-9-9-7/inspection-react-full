// src/pages/monitor/branches/pos19/POS19DailyView.jsx
// POS 19 — Daily Viewer Hub (unified design عبر BranchDailyView — تبويبات أفقية فوق)
import React, { useEffect, useMemo, useState, lazy } from "react";
import BranchDailyView from "../_shared/BranchDailyView";

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

/* ── Overview — ملخص اليوم من تقارير المفتش (localStorage) ── */
function POS19Overview() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  useEffect(() => {
    let saved; try { saved = JSON.parse(localStorage.getItem("pos19_reports") || "[]") || []; } catch { saved = []; }
    saved.sort((a,b) => String(a?.date||"").localeCompare(String(b?.date||"")));
    setReports(saved);
    const todayRep = saved.find(r => r?.date === todayDubai);
    if (todayRep) setSelectedDate(todayDubai);
    else if (saved.length > 0) setSelectedDate(saved[saved.length-1]?.date || "");
  }, [todayDubai]);

  const selectedReport = useMemo(
    () => reports.find(r => r?.date === selectedDate) || null,
    [reports, selectedDate]
  );

  const S = {
    noReport: { display:"flex", flexDirection:"column", alignItems:"center", gap:12, padding:"50px 0", color:"#64748b", fontWeight:700, fontSize:16 },
    dateRow: { display:"flex", alignItems:"center", gap:10, marginBottom:16, fontWeight:700, fontSize:15.5 },
    dateInput: { padding:"8px 12px", border:"1.5px solid #c7d2fe", borderRadius:10, fontSize:15, fontFamily:"inherit" },
    grid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:12, marginBottom:18 },
    card: {
      background:"linear-gradient(135deg, rgba(237,233,254,0.6), rgba(224,242,254,0.5))",
      border:"1px solid rgba(139,92,246,0.25)", borderRadius:14, padding:"14px 16px", textAlign:"center",
    },
    cardTitle: { fontSize:14.5, fontWeight:700, color:"#5b21b6", marginBottom:4 },
    cardValue: { fontSize:28, fontWeight:900, color:"#0b1f4d" },
    cardUnit: { fontSize:15, fontWeight:700, color:"#64748b" },
    secTitle: { fontWeight:800, fontSize:16.5, color:"#0b1f4d", margin:"16px 0 8px" },
    checkRow: { display:"flex", alignItems:"center", gap:8, padding:"6px 0", fontSize:15.5, fontWeight:600, color:"#334155" },
    notes: { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontSize:15, color:"#334155", lineHeight:1.7 },
  };

  if (!reports.length) return (
    <div style={S.noReport}>
      <span style={{fontSize:40}}>📭</span>
      لا توجد تقارير محفوظة حتى الآن لفرع POS 19
    </div>
  );

  const temps   = selectedReport?.temperatures || {};
  const clean   = selectedReport?.cleanliness  || {};
  const uniform = !!selectedReport?.uniform;
  const notes   = selectedReport?.notes || "—";

  return (
    <>
      <div style={S.dateRow}>
        <span>اختر التاريخ:</span>
        <input type="date" style={S.dateInput}
          value={selectedDate||""}
          onChange={e => setSelectedDate(e.target.value)}
        />
      </div>

      {selectedReport ? (
        <>
          <div style={S.grid}>
            {[["براد 1", temps.fridge1], ["براد 2", temps.fridge2], ["براد 3", temps.fridge3]].map(([lbl, val]) => (
              <div style={S.card} key={lbl}>
                <div style={S.cardTitle}>{lbl}</div>
                <div style={S.cardValue}>{val ?? "—"}<span style={S.cardUnit}> °C</span></div>
              </div>
            ))}
          </div>

          <div style={S.secTitle}>🧼 نظافة الموقع</div>
          {[["الأرضيات",clean.floors],["الرفوف",clean.shelves],["الثلاجات",clean.fridges]].map(([lbl,val]) => (
            <div style={S.checkRow} key={lbl}>
              <span>{val ? "✅" : "❌"}</span>
              {lbl}
            </div>
          ))}

          <div style={S.secTitle}>👔 الزي الرسمي</div>
          <div style={S.checkRow}>
            <span>{uniform ? "✅" : "❌"}</span>
            {uniform ? "الموظف ملتزم بالزي" : "الموظف غير ملتزم بالزي"}
          </div>

          <div style={S.secTitle}>📝 ملاحظات المفتش</div>
          <div style={S.notes}>{notes}</div>
        </>
      ) : (
        <div style={S.noReport}>
          <span style={{fontSize:36}}>❌</span>
          لا يوجد تقرير لهذا التاريخ
        </div>
      )}
    </>
  );
}

const TABS = [
  { key: "overview",               icon: "📊", label: "Overview — POS 19",                      element: <POS19Overview /> },
  { key: "cleaningProgramme",      icon: "🧼", label: "Cleaning Programme Schedule",            element: <CPSView />,   loaderLabel: "Cleaning Programme" },
  { key: "dailyCleaningButchery",  icon: "🧹", label: "Daily Cleaning – Butchery",              element: <DCView />,    loaderLabel: "Daily Cleaning" },
  { key: "equipmentInspection",    icon: "🧪", label: "Equipment Inspection & Sanitizing",      element: <EIView />,    loaderLabel: "Equipment Inspection" },
  { key: "foodTempVerification",   icon: "🌡️", label: "Food Temperature Verification",          element: <FTView />,    loaderLabel: "Food Temperature" },
  { key: "glassItemsCondition",    icon: "🧯", label: "Glass Items Condition Monitoring",       element: <GlassView />, loaderLabel: "Glass Items" },
  { key: "hotHoldingTemp",         icon: "🔥", label: "Hot Holding Temperature Log",            element: <HHTView />,   loaderLabel: "Hot Holding Temperature" },
  { key: "oilQuality",             icon: "🛢️", label: "Oil Quality Monitoring",                 element: <OilView />,   loaderLabel: "Oil Quality" },
  { key: "personalHygiene",        icon: "🧑‍🔬", label: "Personal Hygiene Checklist",          element: <PHView />,    loaderLabel: "Personal Hygiene" },
  { key: "receivingLog",           icon: "📦", label: "Receiving Log",                          element: <RLView />,    loaderLabel: "Receiving Log" },
  { key: "sanitizerConcentration", icon: "🧴", label: "Sanitizer Concentration Log",            element: <SCVView />,   loaderLabel: "Sanitizer Concentration" },
  { key: "temperatureMonitoring",  icon: "🌡️", label: "Temperature Monitoring Log",             element: <TMLView />,   loaderLabel: "Temperature Monitoring" },
  { key: "traceability",           icon: "🔗", label: "Traceability Log",                       element: <TRLView />,   loaderLabel: "Traceability Log" },
  { key: "woodenItemsCondition",   icon: "🪵", label: "Wooden Items Condition Monitoring",      element: <WICView />,   loaderLabel: "Wooden Items Condition" },
  { key: "cookingTemperature",     icon: "🍳", label: "Cooking Temperature Record",             element: <CTMView />,   loaderLabel: "Cooking Temperature Record" },
  { key: "defrosting",             icon: "❄️", label: "Defrosting Record",                      element: <DFView />,    loaderLabel: "Defrosting Record" },
  { key: "cooling",                icon: "🧊", label: "Cooling Temperature Log",                element: <CoolView />,  loaderLabel: "Cooling Log" },
  { key: "reheating",              icon: "♨️", label: "Reheating Temperature Log",              element: <RHView />,    loaderLabel: "Reheating Log" },
  { key: "calibration",            icon: "📏", label: "Thermometer Calibration Log",            element: <CalView />,   loaderLabel: "Calibration Log" },
  { key: "nonConformance",         icon: "🚫", label: "Non-Conformance Report",                 element: <NCView />,    loaderLabel: "Non-Conformance Report" },
  { key: "finishedProduct",        icon: "🍖", label: "Finished Product Monitoring Checklist",  element: <FPView />,    loaderLabel: "Finished Product Checklist" },
  { key: "vegSanitation",          icon: "🥬", label: "Sanitation Record (CCP) – Veg/Fruits",   element: <VSView />,    loaderLabel: "Sanitation Record (CCP)" },
  { key: "blastFreezer",           icon: "🥶", label: "Blast Freezer / Chiller Log (CCP)",      element: <BFView />,    loaderLabel: "Blast Freezer / Chiller Log" },
  { key: "dryStore",               icon: "📦", label: "Dry Store Temp & Humidity",              element: <DSView />,    loaderLabel: "Dry Store Temp & Humidity" },
];

/* ─── Main component ─── */
export default function POS19DailyView() {
  return (
    <BranchDailyView
      branchCode="POS-19"
      title="عرض تقارير الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
