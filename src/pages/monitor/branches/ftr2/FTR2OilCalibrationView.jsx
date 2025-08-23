// src/pages/monitor/branches/ftr2/FTR2OilCalibrationView.jsx
import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function FTR2OilCalibrationView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/reports?type=ftr2_oil_calibration`)
      .then((res) => res.json())
      .then((json) => {
        const arr = Array.isArray(json) ? json : json.data || [];
        arr.sort(
          (a, b) =>
            new Date(b.payload?.entries?.[0]?.date) -
            new Date(a.payload?.entries?.[0]?.date)
        );
        setReports(arr);
        setSelectedReport(arr[0] || null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const groupedReports = reports.reduce((acc, r) => {
    const date = new Date(r.payload?.entries?.[0]?.date);
    if (isNaN(date)) return acc;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push(r);
    return acc;
  }, {});

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 20, 20, imgWidth, imgHeight);
    pdf.save(
      `FTR2_Oil_Calibration_${
        selectedReport?.payload?.entries?.[0]?.date || "report"
      }.pdf`
    );
  };

  const handleDelete = async (report) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${report.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted successfully.");
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      setSelectedReport(null);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    }
  };

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Sidebar */}
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
        <h4
          style={{
            marginBottom: "1rem",
            color: "#16a085",
            textAlign: "center",
          }}
        >
          📂 Saved Reports
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
                {Object.entries(months).map(([month, reportsInMonth]) => (
                  <div
                    key={month}
                    onClick={() => setSelectedReport(reportsInMonth[0])}
                    style={{
                      padding: "6px 10px",
                      marginBottom: "4px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background:
                        selectedReport &&
                        new Date(
                          selectedReport.payload?.entries?.[0]?.date
                        ).getMonth() +
                          1 ===
                          parseInt(month)
                          ? "#16a085"
                          : "#ecf0f1",
                      color:
                        selectedReport &&
                        new Date(
                          selectedReport.payload?.entries?.[0]?.date
                        ).getMonth() +
                          1 ===
                          parseInt(month)
                          ? "#fff"
                          : "#333",
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    📂 Month {month} ({reportsInMonth.length})
                  </div>
                ))}
              </details>
            ))}
          </div>
        )}
      </div>

      {/* Report Display */}
      <div
        style={{
          flex: 1,
          background: "#fff",
          padding: "1.5rem",
          borderRadius: "14px",
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <div ref={reportRef}>
            {/* ====== Header with AL MAWASHI text ====== */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                flexDirection: "column",
                alignItems: "flex-end",
                marginBottom: "1rem",
              }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  fontSize: "1.4rem",
                  color: "#a00",
                }}
              >
                AL MAWASHI
              </span>
              <span style={{ fontSize: "0.9rem", color: "#333" }}>
                Trans Emirates Livestock Trading L.L.C.
              </span>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginBottom: "1rem",
              }}
            >
              <tbody>
                <tr>
                  <td style={cellStyle}>
                    <b>Document Title:</b> Oil Quality Monitoring Form
                  </td>
                  <td style={cellStyle}>
                    <b>Document Number:</b> FS-QM/REC/TR/1
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <b>Issue Date:</b> 05/02/2020
                  </td>
                  <td style={cellStyle}>
                    <b>Revision No:</b> 0
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <b>Area:</b> QA
                  </td>
                  <td style={cellStyle}>
                    <b>Issued By:</b> MOHAMAD ABDULLAH QC
                  </td>
                </tr>
                <tr>
                  <td style={cellStyle}>
                    <b>Controlling Officer:</b> QA
                  </td>
                  <td style={cellStyle}>
                    <b>Approved By:</b> Hussam O. Sarhan
                  </td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                textAlign: "center",
                background: "#ecf0f1",
                padding: "0.6rem",
                fontWeight: "bold",
                marginBottom: "1.2rem",
              }}
            >
              AL MAWASHI BRAAI KITCHEN — (OIL QUALITY MONITORING FORM)
            </div>

            {/* Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.6rem",
                marginBottom: "1rem",
              }}
            >
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

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#16a085", color: "#fff" }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Evaluation Results</th>
                  <th style={thStyle}>Corrective Action</th>
                  <th style={thStyle}>Checked By</th>
                  <th style={thStyle}>Verified By</th>
                </tr>
              </thead>
              <tbody>
                {selectedReport.payload?.entries?.map((entry, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{entry.date || "—"}</td>
                    <td style={tdStyle}>{entry.result || "—"}</td>
                    <td style={tdStyle}>{entry.action || "—"}</td>
                    <td style={tdStyle}>{entry.checkedBy || "—"}</td>
                    <td style={tdStyle}>{entry.verifiedBy || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const cellStyle = {
  border: "1px solid #333",
  padding: "6px 10px",
  fontSize: "0.95em",
};

const thStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const tdStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};
