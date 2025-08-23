// src/pages/DailyMonitorDashboard.js

import React from "react";
import { useNavigate } from "react-router-dom";

const branches = [
  "QCS",
  "POS 6", "POS 7", "POS 10", "POS 11", "POS 14",
  "POS 15", "POS 16", "POS 17",
  "POS 18",
  "POS 19", "POS 21", "POS 24", "POS 25",
  "POS 26",
  "POS 31",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37", "POS 38",
  "POS 41",
  "POS 42",
  "POS 43",
  "POS 44", "POS 45",
  "FTR 1",  // New
  "FTR 2"   // New
];

// Convert name to valid slug: "POS 19" -> "pos19", "QCS" -> "qcs"
const toSlug = (name) => name.trim().toLowerCase().replace(/\s+/g, "");

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();

  const handleBranchClick = (branch) => {
    if (branch === "FTR 2") {
      navigate("/monitor/ftr2"); // ✅ إدخال FTR2Report
    } else if (branch === "FTR 1") {
      navigate("/monitor/ftr1"); // (ممكن تضيف لاحقًا نفس الفكرة لـ FTR1)
    } else {
      const slug = toSlug(branch);
      navigate(`/monitor/${slug}`);
    }
  };

  return (
    <div style={{ padding: "2rem", direction: "ltr", fontFamily: "Inter, sans-serif" }}>
      {/* Simple styles */}
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

      <h2>📋 Daily Monitoring Reports - All Branches</h2>
      <p>Select a branch to enter a daily report:</p>

      <div className="branches-grid">
        {branches.map((branch) => (
          <div
            key={branch}
            role="button"
            tabIndex={0}
            aria-label={`Open reports for ${branch}`}
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
