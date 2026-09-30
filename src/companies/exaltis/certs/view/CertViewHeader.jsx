// src/companies/exaltis/certs/view/CertViewHeader.jsx
// Certificates view — page header.
// (Extracted from CertView.jsx — the code is unchanged.)

export function CertViewHeader({ rows, navigate }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        alignItems: "flex-start",
        marginBottom: 18,
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
              "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(8,47,73,0.08))",
            color: "#1d4ed8",
            border: "1px solid rgba(59,130,246,0.6)",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "999px",
              background:
                "radial-gradient(circle, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%)",
            }}
          />
          Training Certificates Register
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
          📋 All BFS / PIC / EFST / HACCP Certificates
        </h2>
        <div
          style={{
            fontSize: 13,
            color: "#4b5563",
          }}
        >
          View, edit, or delete training certificates saved from the BFS /
          PIC / EFST entry screen, per employee.
        </div>
      </div>

      <div
        style={{
          textAlign: "right",
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        <div style={{ fontWeight: 600, color: "#111827" }}>
          Records:{" "}
          <span style={{ color: "#1d4ed8" }}>{rows.length}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate("/company-app?card=certificates")}
          style={{
            marginTop: 6,
            padding: "6px 12px",
            borderRadius: 999,
            border: "none",
            background:
              "linear-gradient(135deg,#0f172a,#1f2937,#020617)",
            color: "#f9fafb",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 8px 18px rgba(15,23,42,0.55)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ↩ Back to Entry
        </button>
      </div>
    </div>
  );
}
