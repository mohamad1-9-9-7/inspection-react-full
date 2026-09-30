// src/companies/exaltis/ohc/view/JobSummary.jsx
// OHC view — per-occupation summary (group by occupation).
// (Extracted from OHCView.jsx — the code is unchanged.)

export function JobSummary({ jobStats, setJobFilter, jobFilter }) {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.6)",
        background: "linear-gradient(135deg,#f8fafc,#ecfeff,#cffafe)",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#374151",
          width: "100%",
        }}
      >
        OCCUPATION BREAKDOWN ({jobStats.length} occupations)
      </div>
      {jobStats.map((j) => (
        <button
          key={j.job}
          type="button"
          onClick={() =>
            setJobFilter(jobFilter === j.job ? "all" : j.job)
          }
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border:
              jobFilter === j.job
                ? "2px solid #0369a1"
                : "1px solid rgba(148,163,184,0.7)",
            background:
              jobFilter === j.job
                ? "linear-gradient(135deg,#e0f2fe,#bae6fd)"
                : "#ffffff",
            cursor: "pointer",
            fontSize: 11,
            textAlign: "left",
            minWidth: 180,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: "#0f172a",
              marginBottom: 2,
            }}
          >
            {j.job}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              fontSize: 10,
            }}
          >
            <span style={{ color: "#0369a1", fontWeight: 700 }}>
              Total: {j.total}
            </span>
            {j.expired > 0 && (
              <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                ⛔ {j.expired}
              </span>
            )}
            {j.expiring_soon > 0 && (
              <span style={{ color: "#c2410c", fontWeight: 700 }}>
                ⚠ {j.expiring_soon}
              </span>
            )}
            {j.expiring > 0 && (
              <span style={{ color: "#a16207", fontWeight: 700 }}>
                ⏳ {j.expiring}
              </span>
            )}
            {j.valid > 0 && (
              <span style={{ color: "#15803d", fontWeight: 700 }}>
                ✓ {j.valid}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
