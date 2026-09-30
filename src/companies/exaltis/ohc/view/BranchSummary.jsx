// src/companies/exaltis/ohc/view/BranchSummary.jsx
// OHC view — per-branch summary (group by branch).
// (Extracted from OHCView.jsx — the code is unchanged.)

export function BranchSummary({ branchStats, setBranchFilter, branchFilter }) {
  return (
    <div
      style={{
        marginBottom: 10,
        padding: 8,
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.6)",
        background:
          "linear-gradient(135deg,#f8fafc,#eef2ff,#e0e7ff)",
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
        BRANCH BREAKDOWN ({branchStats.length} branches)
      </div>
      {branchStats.map((b) => (
        <button
          key={b.branch}
          type="button"
          onClick={() =>
            setBranchFilter(
              branchFilter === b.branch ? "all" : b.branch
            )
          }
          style={{
            padding: "6px 10px",
            borderRadius: 10,
            border:
              branchFilter === b.branch
                ? "2px solid #1d4ed8"
                : "1px solid rgba(148,163,184,0.7)",
            background:
              branchFilter === b.branch
                ? "linear-gradient(135deg,#dbeafe,#bfdbfe)"
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
            {b.branch}
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              flexWrap: "wrap",
              fontSize: 10,
            }}
          >
            <span style={{ color: "#1d4ed8", fontWeight: 700 }}>
              Total: {b.total}
            </span>
            {b.expired > 0 && (
              <span style={{ color: "#b91c1c", fontWeight: 700 }}>
                ⛔ {b.expired}
              </span>
            )}
            {b.expiring_soon > 0 && (
              <span style={{ color: "#c2410c", fontWeight: 700 }}>
                ⚠ {b.expiring_soon}
              </span>
            )}
            {b.expiring > 0 && (
              <span style={{ color: "#a16207", fontWeight: 700 }}>
                ⏳ {b.expiring}
              </span>
            )}
            {b.valid > 0 && (
              <span style={{ color: "#15803d", fontWeight: 700 }}>
                ✓ {b.valid}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
