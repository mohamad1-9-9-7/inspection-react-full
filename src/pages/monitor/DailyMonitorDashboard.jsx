import React from "react";
import { useNavigate } from "react-router-dom";

const branches = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14",
  "POS 15", "POS 16", "POS 17", "POS 19", "POS 21", "POS 24",
  "POS 25", "POS 37", "POS 38", "POS 42", "POS 44", "POS 45"
];

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();

  const handleBranchClick = (branch) => {
    if (branch === "QCS") {
      navigate("/monitor/qcs");
    } else if (branch === "POS 19") {
      navigate("/monitor/pos19"); // ✅ توجيه مخصص لـ POS 19
    } else {
      alert(`🛠️ التقارير لفرع ${branch} لم يتم إعدادها بعد.`);
    }
  };

  return (
    <div style={{ padding: "2rem", direction: "rtl", fontFamily: "Cairo" }}>
      <h2>📋 التقارير اليومية - المراقبة لجميع الفروع</h2>
      <p>اختر أحد الفروع لإدخال تقرير يومي:</p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
        gap: "1rem",
        marginTop: "2rem"
      }}>
        {branches.map((branch, index) => (
          <div
            key={index}
            onClick={() => handleBranchClick(branch)}
            style={{
              padding: "1rem",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              textAlign: "center",
              transition: "0.3s",
              fontWeight: "bold"
            }}
          >
            🏢 {branch}
          </div>
        ))}
      </div>
    </div>
  );
}
