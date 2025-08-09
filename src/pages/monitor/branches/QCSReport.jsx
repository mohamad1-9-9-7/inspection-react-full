import React, { useState } from "react";
import QCSRawMaterialInspection from "./shipment_recc/QCSRawMaterialInspection";
import PersonalHygieneTab from "./qcs/PersonalHygieneTab";
import DailyCleanlinessTab from "./qcs/DailyCleanlinessTab";

// === توليد أوقات كل ساعتين من 4AM إلى 8PM ===
function generateTimes() {
  // 4AM, 6AM, ..., 8PM
  const times = [];
  let hour = 4;
  for (let i = 0; i < 9; i++) {
    let suffix = hour < 12 ? "AM" : "PM";
    let dispHour = hour % 12 === 0 ? 12 : hour % 12;
    times.push(`${dispHour}:00 ${suffix}`);
    hour += 2;
  }
  return times;
}
const times = generateTimes();

export default function QCSReport() {
  const [reportDate, setReportDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const [activeTab, setActiveTab] = useState("coolers");

  // عدد البرادات ثابت 8 مع أوقات الجديدة
  const [coolers, setCoolers] = useState(
    Array(8)
      .fill(null)
      .map(() => ({
        temps: times.reduce((acc, time) => {
          acc[time] = "";
          return acc;
        }, {}),
      }))
  );

  const defaultNames = [
    "WELSON",
    "GHITH",
    "ROTIC",
    "RAJU",
    "ABED",
    "KIDANY",
    "MARK",
    "SOULEMAN",
    "THEOPHIAUS",
    "PRINCE",
    "KWAKU ANTWI",
    "KARTHICK",
    "BHUVANESHWARAN",
    "JAYABHARATHI",
    "PURUSHOTH",
    "NASIR"
  ];

  const [personalHygiene, setPersonalHygiene] = useState(
    defaultNames.map(name => ({
      employName: name,
      nails: "",
      hair: "",
      notWearingJewelries: "",
      wearingCleanCloth: "",
      communicableDisease: "",
      openWounds: "",
      remarks: "",
    }))
  );

  const [auditTime, setAuditTime] = useState("");
  const [cleanlinessRows, setCleanlinessRows] = useState([]);
  const [vehicleReport, setVehicleReport] = useState([
    {
      startTime: "",
      endTime: "",
      temperature: "",
      cleanliness: false,
      plateNumber: "",
      driverName: "",
    },
  ]);

  const handleCoolerChange = (index, time, value) => {
    const updated = [...coolers];
    updated[index].temps[time] = value;
    setCoolers(updated);
  };

  const handleVehicleChange = (index, field, value) => {
    const updated = [...vehicleReport];
    updated[index][field] = value;
    setVehicleReport(updated);
  };

  // === KPI حسابي للبرادات ===
  function calculateKPI(coolers) {
    let allTemps = [];
    let outOfRange = 0;
    coolers.forEach(cooler => {
      Object.values(cooler.temps).forEach(v => {
        const t = Number(v);
        if (v !== "" && !isNaN(t)) {
          allTemps.push(t);
          if (t < 0 || t > 5) outOfRange += 1;
        }
      });
    });
    const avg = allTemps.length
      ? (allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(2)
      : "—";
    const min = allTemps.length ? Math.min(...allTemps) : "—";
    const max = allTemps.length ? Math.max(...allTemps) : "—";
    return { avg, outOfRange, min, max };
  }
  const kpi = calculateKPI(coolers);

  // لون الـ input حسب القيم المطلوبة
  function tempInputStyle(temp) {
    let t = Number(temp);
    const base = {
      width: "63px",
      padding: "6px 8px",
      borderRadius: "8px",
      border: "1.7px solid #2980b9",
      textAlign: "center",
      fontWeight: "600",
      color: "#2c3e50",
      fontSize: "1em",
      background: "#fafbff",
      transition: "all .18s"
    };
    if (isNaN(t) || temp === "") return base;
    if (t > 5 || t < 0)
      return { ...base, background: "#fdecea", borderColor: "#e74c3c", color: "#c0392b", fontWeight: 700 };
    if (t >= 3)
      return { ...base, background: "#eaf6fb", borderColor: "#3498db", color: "#2471a3" };
    return base;
  }

  const saveReport = () => {
    const report = {
      date: reportDate,
      auditTime,
      coolers,
      personalHygiene,
      cleanlinessRows,
      vehicleReport,
    };

    const previous = JSON.parse(localStorage.getItem("qcs_reports") || "[]");
    const filtered = previous.filter((r) => r.date !== reportDate);
    const updated = [...filtered, report];

    localStorage.setItem("qcs_reports", JSON.stringify(updated));
    alert(`✅ تم حفظ التقرير ليوم ${reportDate} بنجاح`);
  };

  const cardStyle = {
    backgroundColor: "#fff",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    borderRadius: "12px",
    boxShadow: "0 0 8px rgba(0,0,0,0.12)",
  };

  const tabs = [
    { id: "coolers", label: "🧊 درجات حرارة البرادات" },
    { id: "personalHygiene", label: "🧼 النظافة الشخصية" },
    { id: "dailyCleanliness", label: "🧹 النظافة اليومية للمستودع" },
    { id: "vehicleReport", label: "🚚 تقارير السيارات" },
    { id: "shipment", label: "📦 تقرير استلام الشحنات" },
  ];

  const containerStyle = {
    padding: "0",
    direction: "rtl",
    backgroundColor: "#f9fbfc",
    fontFamily: "Cairo, sans-serif",
    maxWidth: "100vw",
    width: "100vw",
    margin: 0,
    color: "#34495e",
    overflowX: "auto"
  };

  // --- JSX
  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: "2rem", textAlign: "center", color: "#2c3e50" }}>
        📋 تقرير فرع QCS اليومي
      </h2>

      <div
        style={{
          marginBottom: "2rem",
          textAlign: "center",
          fontSize: "1.1rem",
          fontWeight: "600",
          color: "#34495e",
        }}
      >
        <label>
          اختر التاريخ:{" "}
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: "1rem",
              borderRadius: "6px",
              border: "1.5px solid #2980b9",
              cursor: "pointer",
            }}
          />
        </label>
      </div>

      {/* أزرار التبويبات */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? "700" : "400",
              backgroundColor: activeTab === tab.id ? "#2980b9" : "#ddd",
              color: activeTab === tab.id ? "white" : "#555",
              transition: "background-color 0.3s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* محتوى التبويبات */}
      <div>
        {activeTab === "coolers" && (
          <div style={cardStyle}>
            {/* KPIs Bar */}
            <div style={{
              display: "flex",
              gap: "1.2rem",
              justifyContent: "center",
              marginBottom: 25,
              flexWrap: "wrap"
            }}>
              <div style={{
                background: "#fff",
                borderRadius: 14,
                padding: "1.1rem 2rem",
                boxShadow: "0 2px 14px #e8daef33",
                minWidth: 180,
                textAlign: "center",
                fontWeight: 600,
                fontSize: "1.08em"
              }}>
                <span style={{ fontSize: 26 }}>📊</span>
                <div style={{ color: "#884ea0", margin: "4px 0 0 0" }}>Avg Temp</div>
                <div style={{
                  fontSize: "1.3em",
                  color: kpi.avg !== "—" && (kpi.avg < 0 || kpi.avg > 5) ? "#c0392b" : "#229954",
                  fontWeight: "bold"
                }}>
                  {kpi.avg} <span style={{ fontSize: ".9em", color: "#2c3e50" }}>°C</span>
                </div>
              </div>
              <div style={{
                background: "#fff",
                borderRadius: 14,
                padding: "1.1rem 2rem",
                boxShadow: "0 2px 14px #e8daef33",
                minWidth: 180,
                textAlign: "center",
                fontWeight: 600,
                fontSize: "1.08em"
              }}>
                <span style={{ fontSize: 26 }}>🚨</span>
                <div style={{ color: "#e74c3c", margin: "4px 0 0 0" }}>Out of range</div>
                <div style={{
                  fontSize: "1.3em",
                  color: kpi.outOfRange > 0 ? "#c0392b" : "#229954",
                  fontWeight: "bold"
                }}>
                  {kpi.outOfRange}
                </div>
              </div>
              <div style={{
                background: "#fff",
                borderRadius: 14,
                padding: "1.1rem 2rem",
                boxShadow: "0 2px 14px #e8daef33",
                minWidth: 180,
                textAlign: "center",
                fontWeight: 600,
                fontSize: "1.08em"
              }}>
                <span style={{ fontSize: 26 }}>⬇️⬆️</span>
                <div style={{ color: "#884ea0", margin: "4px 0 0 0" }}>Min / Max</div>
                <div style={{ fontSize: "1.12em", fontWeight: "bold" }}>
                  <span style={{ color: "#2471a3" }}>{kpi.min}</span>
                  <span style={{ color: "#777" }}> / </span>
                  <span style={{ color: "#c0392b" }}>{kpi.max}</span>
                  <span style={{ fontSize: ".91em", color: "#2c3e50" }}> °C</span>
                </div>
              </div>
            </div>

            <h3 style={{ color: "#2980b9", marginBottom: "1rem", textAlign: "center" }}>
              🧊 درجات حرارة البرادات (كل ساعتين من 4AM حتى 8PM)
            </h3>
            {coolers.map((cooler, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "1.2rem",
                  padding: "1rem",
                  backgroundColor: i % 2 === 0 ? "#ecf6fc" : "#d6eaf8",
                  borderRadius: "10px",
                  boxShadow: "inset 0 0 6px rgba(0, 131, 230, 0.15)",
                }}
              >
                <strong style={{ display: "block", marginBottom: "0.8rem", fontSize: "1.1rem" }}>
                  براد {i + 1}
                </strong>
                <div
                  style={{
                    display: "flex",
                    gap: "0.7rem",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                  }}
                >
                  {times.map((time) => (
                    <label
                      key={time}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        fontSize: "0.93rem",
                        color: "#34495e",
                        minWidth: "78px",
                      }}
                    >
                      <span style={{ marginBottom: "7px", fontWeight: "600" }}>{time}</span>
                      <input
                        type="number"
                        value={cooler.temps[time]}
                        onChange={(e) => handleCoolerChange(i, time, e.target.value)}
                        style={tempInputStyle(cooler.temps[time])}
                        placeholder="°C"
                        min="-50"
                        max="50"
                        step="0.1"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "personalHygiene" && (
          <div style={cardStyle}>
            <PersonalHygieneTab personalHygiene={personalHygiene} setPersonalHygiene={setPersonalHygiene} />
          </div>
        )}

        {activeTab === "dailyCleanliness" && (
          <div style={cardStyle}>
            <DailyCleanlinessTab
              cleanlinessRows={cleanlinessRows}
              setCleanlinessRows={setCleanlinessRows}
              auditTime={auditTime}
              setAuditTime={setAuditTime}
            />
          </div>
        )}

        {activeTab === "vehicleReport" && (
          <div style={cardStyle}>
            <h3 style={{ color: "#f39c12", marginBottom: "1rem" }}>🚚 تقارير السيارات</h3>
            {vehicleReport.map((vehicle, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "1rem",
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "1rem",
                  color: "#2c3e50",
                }}
              >
                <label>
                  🕐 وقت التحميل:{" "}
                  <input
                    type="time"
                    value={vehicle.startTime}
                    onChange={(e) => handleVehicleChange(i, "startTime", e.target.value)}
                    style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ddd" }}
                  />
                </label>
                <br />
                <label>
                  🕔 وقت الانتهاء:{" "}
                  <input
                    type="time"
                    value={vehicle.endTime}
                    onChange={(e) => handleVehicleChange(i, "endTime", e.target.value)}
                    style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ddd" }}
                  />
                </label>
                <br />
                <label>
                  🌡️ درجة الحرارة:{" "}
                  <input
                    type="number"
                    value={vehicle.temperature}
                    onChange={(e) => handleVehicleChange(i, "temperature", e.target.value)}
                    style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ddd", width: "80px" }}
                  />
                </label>
                <br />
                <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  🚿 نظافة السيارة:{" "}
                  <input
                    type="checkbox"
                    checked={vehicle.cleanliness}
                    onChange={(e) => handleVehicleChange(i, "cleanliness", e.target.checked)}
                    style={{ width: "18px", height: "18px", cursor: "pointer" }}
                  />
                </label>
                <br />
                <label>
                  🚗 رقم اللوحة:{" "}
                  <input
                    type="text"
                    value={vehicle.plateNumber}
                    onChange={(e) => handleVehicleChange(i, "plateNumber", e.target.value)}
                    style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ddd" }}
                  />
                </label>
                <br />
                <label>
                  👤 اسم السائق:{" "}
                  <input
                    type="text"
                    value={vehicle.driverName}
                    onChange={(e) => handleVehicleChange(i, "driverName", e.target.value)}
                    style={{ padding: "4px", borderRadius: "6px", border: "1px solid #ddd" }}
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        {activeTab === "shipment" && (
          <div>
            <QCSRawMaterialInspection />
          </div>
        )}
      </div>

      <button
        onClick={saveReport}
        style={{
          padding: "12px 24px",
          backgroundColor: "#27ae60",
          color: "white",
          fontSize: "1rem",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
          marginTop: "1rem",
          boxShadow: "0 4px 8px rgba(39, 174, 96, 0.4)",
          transition: "background-color 0.3s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#219150")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#27ae60")}
      >
        💾 حفظ التقرير
      </button>
    </div>
  );
}
