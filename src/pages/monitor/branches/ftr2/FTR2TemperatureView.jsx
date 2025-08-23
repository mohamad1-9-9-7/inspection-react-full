// src/pages/monitor/branches/ftr2/FTR2TemperatureView.jsx
import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function FTR2TemperatureView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef();

  // Fetch all reports
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=ftr2_temperature`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];

      arr.sort((a, b) => new Date(a.payload?.date) - new Date(b.payload?.date));
      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to fetch data from server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  // Export PDF (صفحة واحدة أفقية)
  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`FTR2_Temperature_${selectedReport?.payload?.date || "report"}.pdf`);
  };

  // Delete report
  const handleDelete = async (report) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${report.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted successfully.");
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    }
  };

  // Group reports by year → month → day
  const groupedReports = reports.reduce((acc, r) => {
    const date = new Date(r.payload?.date);
    if (isNaN(date)) return acc;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push({ ...r, day });
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Sidebar dates */}
      <div
        style={{
          minWidth: "260px",
          background: "#f9f9f9",
          padding: "1rem",
          borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}
      >
        <h4 style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}>
          🗓️ Saved Reports
        </h4>
        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.entries(groupedReports).map(([year, months]) => (
              <details key={year} open>
                <summary style={{ fontWeight: "bold", marginBottom: "6px" }}>
                  📅 Year {year}
                </summary>
                {Object.entries(months).map(([month, days]) => (
                  <details key={month} style={{ marginLeft: "1rem" }}>
                    <summary style={{ fontWeight: "500" }}>📅 Month {month}</summary>
                    <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                      {days.map((r, i) => (
                        <li
                          key={i}
                          onClick={() => setSelectedReport(r)}
                          style={{
                            padding: "6px 10px",
                            marginBottom: "4px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            background:
                              selectedReport?.id === r.id ? "#dcd6f7" : "#ecf0f1", // ✅ مميز
                            color: selectedReport?.id === r.id ? "#222" : "#333",
                            fontWeight: 600,
                            textAlign: "center",
                            transition: "background 0.2s ease",
                          }}
                        >
                          {`${r.day}/${month}/${year}`}
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Report display */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
          padding: "1.5rem",
          borderRadius: "14px",
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <div ref={reportRef}>
            {/* Header with actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3 style={{ color: "#2980b9" }}>
                🌡️ Report: {selectedReport.payload?.date}
              </h3>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                <button
                  onClick={handleExportPDF}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#27ae60",
                    color: "#fff",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ⬇ Export PDF
                </button>
                <button
                  onClick={() => handleDelete(selectedReport)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    background: "#c0392b",
                    color: "#fff",
                    fontWeight: "600",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  🗑 Delete
                </button>
              </div>
            </div>

            {/* Coolers */}
            {selectedReport.payload?.coolers?.map((cooler, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "1.7rem",
                  padding: "1.2rem 0.6rem",
                  background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa",
                  borderRadius: "12px",
                  boxShadow: "inset 0 0 7px #d6eaf8aa",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.9rem",
                    fontWeight: "bold",
                    fontSize: "1.16em",
                    color: "#34495e",
                  }}
                >
                  🌡️ Cooler {i + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.65rem",
                    flexWrap: "wrap",
                  }}
                >
                  {selectedReport.payload?.times?.map((time) => (
                    <label
                      key={time}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        fontSize: "0.95em",
                        color: "#34495e",
                        minWidth: "77px",
                      }}
                    >
                      <span
                        style={{
                          marginBottom: "7px",
                          fontWeight: "600",
                        }}
                      >
                        {time}
                      </span>
                      {time === "Corrective Action" ? (
                        <input
                          type="text"
                          value={cooler.temps?.[time] || ""}
                          readOnly
                          style={{
                            width: "280px", // ✅ دبل العرض
                            padding: "6px 8px",
                            borderRadius: "8px",
                            border: "1.7px solid #2980b9",
                            textAlign: "center",
                            fontWeight: "600",
                            background: "#f4f4f4",
                            color: "#2c3e50",
                          }}
                        />
                      ) : (
                        <input
                          type="number"
                          value={cooler.temps?.[time] || ""}
                          readOnly
                          style={{
                            width: "63px",
                            padding: "6px 8px",
                            borderRadius: "8px",
                            border: "1.7px solid #2980b9",
                            textAlign: "center",
                            fontWeight: "600",
                            background: "#f4f4f4",
                            color: "#2c3e50",
                          }}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Footer */}
            <div
              style={{
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "1rem",
                marginTop: "2rem",
                background: "#fff",
              }}
            >
              <div style={{ marginBottom: "1rem", fontWeight: "600" }}>
                REMARKS:-{" "}
                <span style={{ marginLeft: "1rem", fontWeight: "400" }}>
                  If the temp is 5°C or More, check product temperature and corrective
                  action should be taken
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "2rem",
                  fontWeight: "600",
                }}
              >
                <div>Checked By:- {selectedReport.payload?.checkedBy || "—"}</div>
                <div>Verified By:- {selectedReport.payload?.verifiedBy || "—"}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
