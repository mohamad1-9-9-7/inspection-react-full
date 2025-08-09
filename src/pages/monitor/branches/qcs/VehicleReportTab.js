import React from "react";

export default function VehicleReportTab({ vehicleReport, setVehicleReport }) {
  const handleVehicleChange = (index, field, value) => {
    const updated = [...vehicleReport];
    updated[index][field] = value;
    setVehicleReport(updated);
  };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "1.5rem",
        borderRadius: "12px",
        boxShadow: "0 0 8px rgba(0,0,0,0.12)",
        color: "#2c3e50",
      }}
    >
      <h3 style={{ color: "#f39c12", marginBottom: "1rem" }}>🚚 تقارير السيارات</h3>
      {vehicleReport.map((vehicle, i) => (
        <div
          key={i}
          style={{
            marginBottom: "1rem",
            borderBottom: "1px solid #ccc",
            paddingBottom: "1rem",
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
  );
}
