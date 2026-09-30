// src/companies/exaltis/training/sessions/KPICardLocal.jsx
// Training sessions — KPI card.
// (Split out of TrainingSessionsList.jsx — the code is unchanged.)

/* ============== KPI Card (matches Mock Recall View style) ============== */
export function KPICardLocal({ icon, label, value, sub, accent = "#1e40af", bad }) {
  return (
    <div
      style={{
        flex: "1 1 180px",
        minWidth: 180,
        background: "#fff",
        border: "1px solid #eceef3",
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 10px 28px rgba(16,24,40,.05)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 4,
          background: bad ? "#ef4444" : accent,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 10, fontSize: 17,
            background: bad ? "#fef2f2" : `${accent}14`,
          }}
        >
          {icon}
        </span>
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: "1.9rem",
          fontWeight: 800,
          color: bad ? "#b91c1c" : "#1e293b",
          lineHeight: 1.1,
          marginTop: 10,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
