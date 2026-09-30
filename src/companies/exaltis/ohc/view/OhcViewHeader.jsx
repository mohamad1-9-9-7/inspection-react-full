// src/companies/exaltis/ohc/view/OhcViewHeader.jsx
// OHC view — page header.
// (Extracted from OHCView.jsx — the code is unchanged.)

export function OhcViewHeader({ showing, total, stats, search, setSearch }) {
  return (
    <div
      style={{
        marginBottom: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "2px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            background:
              "linear-gradient(135deg, #fce7f3, #fbcfe8)",
            color: "#be185d",
            border: "1px solid #f9a8d4",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "999px",
              background:
                "radial-gradient(circle, #22c55e 0%, #15803d 60%, #052e16 100%)",
            }}
          />
          OHC Certificates Register
        </div>
        <h2
          style={{
            margin: "8px 0 4px",
            color: "#0f172a",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: 0.2,
          }}
        >
          📋 OHC Certificates Overview
        </h2>
        <div
          style={{
            fontSize: 13,
            color: "#4b5563",
          }}
        >
          Centralized view of employee OHC certificates with expiry
          tracking, branch filter and image attachments.
        </div>

        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 8,
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              padding: "3px 10px",
              borderRadius: 999,
              background: "rgba(37,99,235,0.06)",
              color: "#1d4ed8",
              fontWeight: 700,
              border: "1px solid rgba(129,140,248,0.6)",
            }}
          >
            Showing: {showing} / {total}
          </span>
          {stats.fit > 0 && (
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(22,163,74,0.08)",
                color: "#166534",
                fontWeight: 700,
                border: "1px solid rgba(74,222,128,0.6)",
              }}
            >
              FIT: {stats.fit}
            </span>
          )}
          {stats.unfit > 0 && (
            <span
              style={{
                padding: "3px 10px",
                borderRadius: 999,
                background: "rgba(239,68,68,0.08)",
                color: "#b91c1c",
                fontWeight: 700,
                border: "1px solid rgba(248,113,113,0.6)",
              }}
            >
              UNFIT: {stats.unfit}
            </span>
          )}
        </div>
      </div>

      {/* Search box */}
      <div
        style={{
          minWidth: 260,
          maxWidth: 360,
          marginLeft: "auto",
        }}
      >
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            color: "#0f172a",
          }}
        >
          Search
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.9)",
              background:
                "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
            }}
          >
            <span style={{ fontSize: 14, opacity: 0.8 }}>🔍</span>
            <input
              type="text"
              placeholder="Employee No, Name, Nationality, Branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: 13,
              }}
            />
          </div>
        </label>
      </div>
    </div>
  );
}
