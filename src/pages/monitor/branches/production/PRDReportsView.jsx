import React, { useState } from "react";
import CleaningChecklistPRDView from "./CleaningChecklistPRDView";
import PersonalHygienePRDView from "./PersonalHygienePRDView";
import PRDDefrostingRecordView from "./PRDDefrostingRecordView";
import PRDTraceabilityLogView from "./PRDTraceabilityLogView"; // ⬅️ جديد

export default function PRDReportsView() {
  const TABS = [
    { key: "cleaning", label: "🧽 Cleaning Checklist", comp: <CleaningChecklistPRDView /> },
    { key: "hygiene",  label: "🧑‍🍳 Personal Hygiene", comp: <PersonalHygienePRDView /> },
    { key: "defrost",  label: "❄️ Defrosting Record",  comp: <PRDDefrostingRecordView /> },
    { key: "trace",    label: "🔗 Traceability Log",    comp: <PRDTraceabilityLogView /> }, // ⬅️ جديد
  ];

  const [active, setActive] = useState(TABS[0].key);

  return (
    <div style={{ padding: 12 }}>
      {/* Tabs */}
      <div style={tabWrap}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            style={{
              ...tabBtn,
              ...(active === t.key ? tabBtnActive : {}),
            }}
            className="no-print"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active View */}
      <div style={{ marginTop: 10 }}>
        {TABS.find((t) => t.key === active)?.comp}
      </div>

      <style>{`
        @media print { .no-print{ display:none !important; } body{ background:#fff; } }
      `}</style>
    </div>
  );
}

/* ========== styles ========== */
const tabWrap = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 6,
};

const tabBtn = {
  padding: "8px 12px",
  borderRadius: 10,
  background: "#fff",
  border: "1px solid #e5e7eb",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: ".95rem",
};

const tabBtnActive = {
  background: "#1f2937",
  color: "#fff",
  border: "1px solid #1f2937",
};
