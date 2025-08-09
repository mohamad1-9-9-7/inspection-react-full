import React from "react";

// === توليد أوقات كل ساعتين من 4AM حتى 8PM (9 أوقات) ===
function generateTimes() {
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

// === KPI Helper ===
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

// === المكون الرئيسي ===
export default function CoolersTab({ coolers, setCoolers }) {
  // تنسيقات الكارت والإنبوت
  const cardKPI = {
    background: "#fff",
    borderRadius: 14,
    padding: "1.1rem 2rem",
    marginBottom: 20,
    boxShadow: "0 2px 14px #e8daef33",
    minWidth: 180,
    textAlign: "center",
    fontWeight: 600,
    fontSize: "1.08em"
  };
  const inputStyle = {
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

  // لون خانة الحرارة حسب الشروط
  function tempInputStyle(temp) {
    let t = Number(temp);
    if (isNaN(t) || temp === "") return inputStyle;
    if (t > 5 || t < 0)
      return { ...inputStyle, background: "#fdecea", borderColor: "#e74c3c", color: "#c0392b", fontWeight: 700 };
    if (t >= 3)
      return { ...inputStyle, background: "#eaf6fb", borderColor: "#3498db", color: "#2471a3" };
    return inputStyle;
  }

  const handleCoolerChange = (index, time, value) => {
    const updated = [...coolers];
    updated[index].temps[time] = value;
    setCoolers(updated);
  };

  // KPI values
  const kpi = calculateKPI(coolers);

  return (
    <div
      style={{
        background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
        padding: "2.2rem 1.2rem",
        borderRadius: "14px",
        boxShadow: "0 4px 18px #d2b4de44",
        marginBottom: 32
      }}
    >
      {/* KPI Bar */}
      <div style={{
        display: "flex",
        gap: "1.3rem",
        justifyContent: "center",
        marginBottom: 25,
        flexWrap: "wrap"
      }}>
        <div style={cardKPI}>
          <span style={{ fontSize: 26, verticalAlign: "middle" }}>📊</span>
          <div style={{ color: "#884ea0", margin: "4px 0 0 0" }}>Avg Temp</div>
          <div style={{
            fontSize: "1.42em",
            color: kpi.avg !== "—" && (kpi.avg < 0 || kpi.avg > 5) ? "#c0392b" : "#229954",
            fontWeight: "bold"
          }}>
            {kpi.avg} <span style={{ fontSize: ".9em", color: "#2c3e50" }}>°C</span>
          </div>
        </div>
        <div style={cardKPI}>
          <span style={{ fontSize: 26 }}>🚨</span>
          <div style={{ color: "#e74c3c", margin: "4px 0 0 0" }}>Out of range</div>
          <div style={{
            fontSize: "1.42em",
            color: kpi.outOfRange > 0 ? "#c0392b" : "#229954",
            fontWeight: "bold"
          }}>
            {kpi.outOfRange}
          </div>
        </div>
        <div style={cardKPI}>
          <span style={{ fontSize: 26 }}>⬇️⬆️</span>
          <div style={{ color: "#884ea0", margin: "4px 0 0 0" }}>Min / Max</div>
          <div style={{ fontSize: "1.26em", fontWeight: "bold" }}>
            <span style={{ color: "#2471a3" }}>{kpi.min}</span>
            <span style={{ color: "#777" }}> / </span>
            <span style={{ color: "#c0392b" }}>{kpi.max}</span>
            <span style={{ fontSize: ".91em", color: "#2c3e50" }}> °C</span>
          </div>
        </div>
      </div>

      {/* عنوان */}
      <h3 style={{
        color: "#2980b9",
        marginBottom: "1.4rem",
        textAlign: "center",
        letterSpacing: ".01em"
      }}>
        🧊 Cooler Temperatures <span style={{ color: "#7d3c98", fontWeight: "normal", fontSize: ".91em" }}>(Every 2 hours, 4AM - 8PM)</span>
      </h3>

      {/* البرادات */}
      {coolers.map((cooler, i) => (
        <div
          key={i}
          style={{
            marginBottom: "1.7rem",
            padding: "1.2rem 0.6rem",
            background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa",
            borderRadius: "12px",
            boxShadow: "inset 0 0 7px #d6eaf8aa",
          }}
        >
          <div
            style={{
              marginBottom: "0.9rem",
              fontWeight: "bold",
              fontSize: "1.16em",
              color: "#34495e",
              letterSpacing: ".02em"
            }}
          >
            🧊 Cooler {i + 1}
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.65rem",
              flexWrap: "wrap",
              alignItems: "flex-end",
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
                  fontSize: "0.98em",
                  color: "#34495e",
                  minWidth: "77px",
                }}
              >
                <span
                  style={{
                    marginBottom: "7px",
                    fontWeight: "600",
                    fontSize: "1em",
                    letterSpacing: ".02em"
                  }}
                >
                  {time}
                </span>
                <input
                  type="number"
                  value={cooler.temps[time] || ""}
                  onChange={(e) =>
                    handleCoolerChange(i, time, e.target.value)
                  }
                  style={tempInputStyle(cooler.temps[time])}
                  placeholder="°C"
                  min="-10"
                  max="50"
                  step="0.1"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
