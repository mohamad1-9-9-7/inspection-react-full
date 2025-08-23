// src/pages/admin/DailyReportsTab.jsx
import React from "react";

const branches = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
  "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
  "POS 42", "POS 44", "POS 45",
  "FTR 1", "FTR 2" // ✅ الفروع الجديدة
];

export default function DailyReportsTab({
  dailyReports,
  setDailyReports,
  onOpenQCSReport,
  onOpenPOS19Report,
  onOpenQCSShipmentReport,
  onOpenFTR1Report,   // ✅ دالة جديدة
  onOpenFTR2Report,   // ✅ دالة جديدة
}) {
  return (
    <div style={{ background: "#fff", padding: "1rem", borderRadius: "10px" }}>
      <h3>🗓️ التقارير اليومية</h3>
      <p>عدد التقارير الحالية: {dailyReports.length}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        {branches.map((branch, index) => (
          <div
            key={index}
            onClick={() => {
              if (branch === "QCS") {
                onOpenQCSReport();
              } else if (branch === "POS 19") {
                onOpenPOS19Report();
              } else if (branch === "FTR 1") {
                onOpenFTR1Report(); // ✅ فتح تقرير FTR 1
              } else if (branch === "FTR 2") {
                onOpenFTR2Report(); // ✅ فتح تقرير FTR 2
              } else {
                alert(`📌 لا يوجد تقرير متاح حاليًا لهذا الفرع: ${branch}`);
              }
            }}
            style={{
              padding: "1rem",
              backgroundColor: "#f8f9fa",
              borderRadius: "8px",
              textAlign: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
              fontWeight: "bold",
              cursor: "pointer",
              transition: "0.2s",
            }}
          >
            🏢 {branch}
          </div>
        ))}
      </div>

      {/* ✅ زر منفصل لتقرير استلام الشحنات لفرع QCS فقط */}
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button
          onClick={onOpenQCSShipmentReport}
          style={{
            backgroundColor: "#8e44ad",
            color: "white",
            border: "none",
            padding: "12px 20px",
            borderRadius: "10px",
            cursor: "pointer",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          📦 تقرير استلام الشحنات - QCS
        </button>
      </div>
    </div>
  );
}
