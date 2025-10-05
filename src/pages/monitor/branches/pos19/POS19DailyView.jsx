// src/pages/monitor/branches/pos19/POS19DailyView.jsx
import React, { useEffect, useMemo, useState, Suspense, lazy } from "react";

/* 
  POS19DailyView — Viewer Hub
  - يحتوي 13 تبويب لعرض التقارير (Views) + تبويب Overview لعرض المحتوى القديم.
  - Personal hygiene و Daily cleaning و Equipment inspection مربوطة بملفات العرض الفعلية عبر lazy imports.
*/

// ✅ Personal Hygiene View
const PHView = lazy(() => import("./view pos 19/PersonalHygieneChecklistView"));
// ✅ Daily Cleaning (Butchery) View
const DCView = lazy(() => import("./view pos 19/DailyCleaningChecklistView"));
// ✅ Equipment Inspection & Sanitizing Log View (جديد)
const EIView = lazy(() => import("./view pos 19/EquipmentInspectionSanitizingLogView"));

export default function POS19DailyView() {
  const [activeTab, setActiveTab] = useState("overview");
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  // اليوم حسب توقيت دبي (YYYY-MM-DD)
  const todayDubai = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${mm}-${dd}`;
    }
  }, []);

  // حمل بيانات الـ Overview القديمة (pos19_reports) فقط كتجربة عرض
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("pos19_reports") || "[]") || [];
    saved.sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || "")));
    setReports(saved);

    const todayReport = saved.find((r) => r?.date === todayDubai);
    if (todayReport) setSelectedDate(todayDubai);
    else if (saved.length > 0) setSelectedDate(saved[saved.length - 1]?.date || "");
  }, [todayDubai]);

  const selectedReport = useMemo(
    () => reports.find((r) => r?.date === selectedDate) || null,
    [reports, selectedDate]
  );

  // ——————————— التبويبات ———————————
  const tabs = [
    { key: "overview", label: "📊 Overview (POS19)" },
    { key: "cleaningProgramme", label: "🧼 Cleaning Programme Schedule" },
    { key: "dailyCleaningButchery", label: "🧹 Daily Cleaning checklist – Butchery" }, // ← DCView
    { key: "equipmentInspection", label: "🧪 Equipment Inspection & Sanitizing Log" }, // ← EIView
    { key: "foodTempVerification", label: "🌡️ Food Temperature Verification Log" },
    { key: "glassItemsCondition", label: "🧯 Glass items Condition Monitoring Checklist" },
    { key: "hotHoldingTemp", label: "🔥 Hot Holding Temperature Monitoring Log Sheet" },
    { key: "oilQuality", label: "🛢️ Oil Quality Monitoring Form" },
    { key: "personalHygiene", label: "🧑‍🔬 Personal hygiene checklist" }, // ← PHView
    { key: "receivingLog", label: "📦 Receiving Log" },
    { key: "sanitizerConcentration", label: "🧴 Sanitizer Concentration Verification Log" },
    { key: "temperatureMonitoring", label: "🌡️ Temperature Monitoring Log" },
    { key: "traceability", label: "🔗 Traceability Log" },
    { key: "woodenItemsCondition", label: "🪵 Wooden items Condition Monitoring Checklist" },
  ];

  // ——————————— ستايلات سريعة ———————————
  const layoutStyle = {
    background: "#fff",
    padding: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
    direction: "rtl",
  };
  const panelStyle = {
    background: "#fafafa",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    padding: "1rem",
    boxShadow: "inset 0 0 6px rgba(0,0,0,0.05)",
    minHeight: 220,
  };
  const LoadingLike = ({ text = "سيتم الربط لاحقاً…" }) => (
    <div style={{ fontWeight: 700, color: "#6b7280" }}>{text}</div>
  );

  // ——————————— Placeholders لباقي التبويبات ———————————
  const CleaningProgrammeScheduleView = () => (
    <div style={panelStyle}>
      <h4>🧼 Cleaning Programme Schedule (View)</h4>
      <LoadingLike />
    </div>
  );
  const DailyCleaningButcheryPlaceholder = () => (
    <div style={panelStyle}>
      <h4>🧹 Daily Cleaning checklist – Butchery (View)</h4>
      <LoadingLike />
    </div>
  );
  // أزلنا الـ placeholder الخاص بـ Equipment Inspection لأننا ربطناه فعليًا

  const FoodTemperatureVerificationView = () => (
    <div style={panelStyle}>
      <h4>🌡️ Food Temperature Verification Log (View)</h4>
      <LoadingLike />
    </div>
  );
  const GlassItemsConditionChecklistView = () => (
    <div style={panelStyle}>
      <h4>🧯 Glass items Condition Monitoring Checklist (View)</h4>
      <LoadingLike />
    </div>
  );
  const HotHoldingTemperatureLogView = () => (
    <div style={panelStyle}>
      <h4>🔥 Hot Holding Temperature Monitoring Log Sheet (View)</h4>
      <LoadingLike />
    </div>
  );
  const OilQualityMonitoringView = () => (
    <div style={panelStyle}>
      <h4>🛢️ Oil Quality Monitoring Form (View)</h4>
      <LoadingLike />
    </div>
  );
  // PHView لا يحتاج Placeholder

  const ReceivingLogView = () => (
    <div style={panelStyle}>
      <h4>📦 Receiving Log (View)</h4>
      <LoadingLike />
    </div>
  );
  const SanitizerConcentrationVerificationView = () => (
    <div style={panelStyle}>
      <h4>🧴 Sanitizer Concentration Verification Log (View)</h4>
      <LoadingLike />
    </div>
  );
  const TemperatureMonitoringLogView = () => (
    <div style={panelStyle}>
      <h4>🌡️ Temperature Monitoring Log (View)</h4>
      <LoadingLike />
    </div>
  );
  const TraceabilityLogView = () => (
    <div style={panelStyle}>
      <h4>🔗 Traceability Log (View)</h4>
      <LoadingLike />
    </div>
  );
  const WoodenItemsConditionChecklistView = () => (
    <div style={panelStyle}>
      <h4>🪵 Wooden items Condition Monitoring Checklist (View)</h4>
      <LoadingLike />
    </div>
  );

  // ——————————— تبويب Overview القديم (يعرض pos19_reports) ———————————
  const OverviewView = () => {
    if (!reports.length) {
      return (
        <div style={panelStyle}>
          <p>❗ لا توجد تقارير محفوظة حتى الآن لفرع POS 19.</p>
        </div>
      );
    }

    const temps = selectedReport?.temperatures || {};
    const clean = selectedReport?.cleanliness || {};
    const uniform = !!selectedReport?.uniform;
    const notes = selectedReport?.notes || "—";

    return (
      <div style={{ ...panelStyle, direction: "rtl" }}>
        <div style={{ marginBottom: "1rem" }}>
          <strong>أدخل التاريخ:</strong>{" "}
          <input
            type="date"
            value={selectedDate || ""}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: "6px", marginInlineStart: "1rem" }}
          />
        </div>

        {selectedReport ? (
          <>
            <hr />
            <h4>🌡️ درجات حرارة البرادات</h4>
            <ul>
              <li>براد 1: {temps.fridge1 ?? "—"}°C</li>
              <li>براد 2: {temps.fridge2 ?? "—"}°C</li>
              <li>براد 3: {temps.fridge3 ?? "—"}°C</li>
            </ul>

            <hr />
            <h4>🧼 نظافة الموقع</h4>
            <ul>
              <li>{clean.floors ? "✅" : "❌"} الأرضيات</li>
              <li>{clean.shelves ? "✅" : "❌"} الرفوف</li>
              <li>{clean.fridges ? "✅" : "❌"} الثلاجات</li>
            </ul>

            <hr />
            <h4>👔 الزي الرسمي</h4>
            <p>{uniform ? "✅ الموظف ملتزم بالزي" : "❌ الموظف غير ملتزم"}</p>

            <hr />
            <h4>📝 ملاحظات المفتش</h4>
            <p>{notes}</p>
          </>
        ) : (
          <p>❌ لا يوجد تقرير لهذا التاريخ.</p>
        )}
      </div>
    );
  };

  // ——————————— اختيار المحتوى حسب التبويب ———————————
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewView />;
      case "cleaningProgramme":
        return <CleaningProgrammeScheduleView />;
      case "dailyCleaningButchery":
        return (
          <div style={{ background: "#fafafa", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "1rem", minHeight: 220 }}>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>جاري تحميل عرض Daily Cleaning…</div>}>
              <DCView />
            </Suspense>
          </div>
        );
      case "equipmentInspection":
        return (
          <div style={{ background: "#fafafa", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "1rem", minHeight: 220 }}>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>جاري تحميل عرض Equipment Inspection…</div>}>
              <EIView />
            </Suspense>
          </div>
        );
      case "foodTempVerification":
        return <FoodTemperatureVerificationView />;
      case "glassItemsCondition":
        return <GlassItemsConditionChecklistView />;
      case "hotHoldingTemp":
        return <HotHoldingTemperatureLogView />;
      case "oilQuality":
        return <OilQualityMonitoringView />;
      case "personalHygiene":
        return (
          <div style={{ background: "#fafafa", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "1rem", minHeight: 220 }}>
            <Suspense fallback={<div style={{ fontWeight: 800, color: "#6b7280" }}>جاري تحميل عرض النظافة الشخصية…</div>}>
              <PHView />
            </Suspense>
          </div>
        );
      case "receivingLog":
        return <ReceivingLogView />;
      case "sanitizerConcentration":
        return <SanitizerConcentrationVerificationView />;
      case "temperatureMonitoring":
        return <TemperatureMonitoringLogView />;
      case "traceability":
        return <TraceabilityLogView />;
      case "woodenItemsCondition":
        return <WoodenItemsConditionChecklistView />;
      default:
        return <div style={panelStyle}>—</div>;
    }
  };

  // ——————————— الواجهة ———————————
  return (
    <div style={layoutStyle}>
      <h3 style={{ margin: 0, marginBottom: "12px" }}>📋 عرض تقارير POS 19</h3>

      {/* أزرار التبويب */}
      <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            title={tab.label}
            style={{
              flex: "1 1 240px",
              minWidth: "220px",
              padding: "10px 14px",
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
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويب */}
      {renderContent()}
    </div>
  );
}
// انتهى الملف تاريخ 05/10/2025
