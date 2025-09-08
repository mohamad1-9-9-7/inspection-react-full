// SidebarTree.jsx
import React, { useRef } from "react";
import { monthNames } from "./viewUtils";

export default function SidebarTree({
  tree,
  selectedReportId,
  setSelectedReportId,
  loadingServer,
  serverErr,
  onRefresh,
  canExportPDF,
  onExportPDF,
  searchTerm,
  setSearchTerm,
  onDeleteReport,
  onExportJSON,
  onImportJSON,
  getDisplayId,
}) {
  const importRef = useRef(null);
  const [openYears, setOpenYears] = React.useState({});
  const [openMonths, setOpenMonths] = React.useState({});
  const [openDays, setOpenDays] = React.useState({});

  return (
    <aside
      className="no-print"
      style={{
        flex: "0 0 300px",
        borderLeft: "1px solid #e5e7eb",
        paddingLeft: "1rem",
        maxHeight: "80vh",
        overflowY: "auto",
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 2px 8px rgba(2,6,23,0.06)",
      }}
    >
      <h3 style={{ marginBottom: "1rem", color: "#111827", fontWeight: 800 }}>
        📅 Reports by Date
      </h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={onRefresh}
          style={{
            flex: 1, padding: 10, background: "#10b981", color: "#fff",
            border: "1px solid #0f766e", borderRadius: 10, fontWeight: 800, cursor: "pointer",
          }}
          title="Reload"
        >
          🔄 Refresh
        </button>
        <button
          onClick={onExportPDF}
          disabled={!canExportPDF}
          style={{
            flex: 1, padding: 10,
            background: !canExportPDF ? "#93c5fd" : "#0ea5e9",
            color: "#fff", border: "1px solid #1d4ed8", borderRadius: 10,
            fontWeight: 800, cursor: !canExportPDF ? "not-allowed" : "pointer",
          }}
          title="Export selected report to PDF"
        >
          ⬇️ PDF
        </button>
      </div>

      {loadingServer && (
        <div style={{ marginBottom: 8, color: "#0ea5e9", fontWeight: 800 }}>
          ⏳ Fetching from server…
        </div>
      )}
      {serverErr && (
        <div style={{ marginBottom: 8, color: "#dc2626", fontWeight: 800 }}>
          {serverErr}
        </div>
      )}

      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="🔍 Search (AWB / Invoice / Key)"
        style={{
          width: "100%", padding: 10, borderRadius: 10,
          border: "1px solid #e5e7eb", marginBottom: "1rem",
        }}
      />

      {/* Date tree */}
      {Object.keys(tree)
        .sort((a, b) => b.localeCompare(a))
        .map((year) => (
          <div key={year} style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
              style={{
                width: "100%", background: "#f3f4f6", padding: "10px 12px",
                fontWeight: 800, textAlign: "left", border: "1px solid #e5e7eb",
                borderRadius: "10px", marginBottom: "0.5rem",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                cursor: "pointer", color: "#0f172a",
              }}
            >
              📅 {year}
              <span>{openYears[year] ? "➖" : "➕"}</span>
            </button>

            {openYears[year] &&
              Object.keys(tree[year])
                .sort((a, b) => b.localeCompare(a))
                .map((m) => {
                  const ym = `${year}-${m}`;
                  return (
                    <div key={ym} style={{ marginLeft: 8, marginBottom: 8 }}>
                      <button
                        onClick={() => setOpenMonths((p) => ({ ...p, [ym]: !p[ym] }))}
                        style={{
                          width: "100%", background: "#ffffff", padding: "8px 10px",
                          fontWeight: 800, textAlign: "left", border: "1px solid #e5e7eb",
                          borderRadius: "10px", marginBottom: "0.5rem",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          cursor: "pointer", color: "#0f172a",
                        }}
                      >
                        📆 {monthNames[parseInt(m, 10) - 1] || m}
                        <span>{openMonths[ym] ? "➖" : "➕"}</span>
                      </button>

                      {openMonths[ym] &&
                        Object.keys(tree[year][m])
                          .sort((a, b) => b.localeCompare(a))
                          .map((d) => {
                            const ymd = `${ym}-${d}`;
                            const dayReports = tree[year][m][d];
                            return (
                              <div key={ymd} style={{ marginLeft: 8, marginBottom: 8 }}>
                                <button
                                  onClick={() => setOpenDays((p) => ({ ...p, [ymd]: !p[ymd] }))}
                                  style={{
                                    width: "100%", background: "#eef2ff", padding: "8px 10px",
                                    fontWeight: 800, textAlign: "left", border: "1px solid #c7d2fe",
                                    borderRadius: "10px", marginBottom: "0.5rem",
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    cursor: "pointer", color: "#0f172a",
                                  }}
                                >
                                  📄 {year}-{m}-{d}
                                  <span>{openDays[ymd] ? "➖" : "➕"}</span>
                                </button>

                                {openDays[ymd] && (
                                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                    {dayReports.map((r) => (
                                      <li key={r.id} style={{ marginBottom: "0.5rem" }}>
                                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                          <button
                                            onClick={() => {
                                              setSelectedReportId(r.id);
                                            }}
                                            title={`Open report ${getDisplayId(r)}`}
                                            style={{
                                              flex: 1, padding: "8px 10px", borderRadius: 10, cursor: "pointer",
                                              border: selectedReportId === r.id ? "2px solid #1f2937" : "1px solid #e5e7eb",
                                              background: selectedReportId === r.id ? "#f5f5f5" : "#fff",
                                              fontWeight: selectedReportId === r.id ? 800 : 600,
                                              display: "flex", justifyContent: "space-between",
                                              alignItems: "center", textAlign: "left", color: "#0f172a",
                                            }}
                                          >
                                            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                              <span>{getDisplayId(r)}</span>
                                              {r.sequence ? (
                                                <span style={{ fontSize: 12, opacity: 0.8 }}>· #{r.sequence}</span>
                                              ) : null}
                                              {r.shipmentType ? (
                                                <span style={{ fontSize: 12, opacity: 0.8 }}>· {r.shipmentType}</span>
                                              ) : null}
                                            </span>
                                            <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                                              {r.status === "Acceptable" ? "✅" : r.status === "Average" ? "⚠️" : "❌"}
                                            </span>
                                          </button>

                                          <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteReport(r.id); }}
                                            style={{
                                              background: "#dc2626", color: "#fff", border: "1px solid #b91c1c",
                                              borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 800, minWidth: 72,
                                            }}
                                            title="Delete report from server"
                                          >
                                            Delete
                                          </button>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                    </div>
                  );
                })}
          </div>
        ))}

      <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
        <button
          onClick={onExportJSON}
          style={{
            padding: 10, background: "#111827", color: "#fff",
            border: "1px solid #111827", borderRadius: 10,
            width: "100%", fontWeight: 800, marginBottom: 8,
          }}
        >
          ⬇️ Export reports (JSON)
        </button>
        <button
          onClick={() => importRef.current?.click()}
          style={{
            padding: 10, background: "#16a34a", color: "#fff",
            border: "1px solid #15803d", borderRadius: 10,
            width: "100%", fontWeight: 800,
          }}
        >
          ⬆️ Import reports
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json"
          onChange={(e) => { onImportJSON(e); if (importRef.current) importRef.current.value = ""; }}
          style={{ display: "none" }}
        />
      </div>
    </aside>
  );
}
