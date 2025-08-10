import React from "react";
import { useNavigate } from "react-router-dom";

const branches = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14",
  "POS 15", "POS 16", "POS 17", "POS 19", "POS 21", "POS 24",
  "POS 25", "POS 37", "POS 38", "POS 42", "POS 44", "POS 45"
];

// تحويل الاسم إلى مسار صالح: "POS 19" -> "pos19" ، "QCS" -> "qcs"
const toSlug = (name) => name.trim().toLowerCase().replace(/\s+/g, "");

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();

  const handleBranchClick = (branch) => {
    const slug = toSlug(branch);
    navigate(`/monitor/${slug}`);
  };

  return (
    <div style={{ padding: "2rem", direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
      {/* ستايل تأثيرات بسيطة */}
      <style>{`
        .branches-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 1rem;
          margin-top: 2rem;
        }
        .branch-card {
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 12px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          text-align: center;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
          user-select: none;
          outline: none;
        }
        .branch-card:hover,
        .branch-card:focus-visible {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
          background: #ffffff;
        }
      `}</style>

      <h2>📋 التقارير اليومية - المراقبة لجميع الفروع</h2>
      <p>اختر أحد الفروع لإدخال تقرير يومي:</p>

      <div className="branches-grid">
        {branches.map((branch) => (
          <div
            key={branch}
            role="button"
            tabIndex={0}
            aria-label={`فتح تقارير ${branch}`}
            className="branch-card"
            onClick={() => handleBranchClick(branch)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleBranchClick(branch)}
          >
            🏢 {branch}
          </div>
        ))}
      </div>
    </div>
  );
}
