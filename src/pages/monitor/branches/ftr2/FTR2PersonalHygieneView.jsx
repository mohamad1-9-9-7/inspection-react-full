// src/pages/monitor/branches/ftr2/FTR2PersonalHygieneView.jsx
import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function FTR2PersonalHygieneView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=ftr2_personal_hygiene`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  // تصدير PDF مع اسم AL MAWASHI
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("l", "pt", "a4"); // Landscape
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // 🔹 إضافة اسم الشركة أعلى التقرير
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI", pageWidth / 2, 30, { align: "center" });

    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const x = 20;
    const y = 50;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`FTR2_Personal_Hygiene_${selectedReport?.payload?.reportDate || "report"}.pdf`);
  };

  // حذف التقرير
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
    const date = new Date(r.payload?.reportDate);
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
                            background: selectedReport?.id === r.id ? "#6d28d9" : "#ecf0f1",
                            color: selectedReport?.id === r.id ? "#fff" : "#333",
                            fontWeight: 600,
                            textAlign: "center",
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
          <>
            {/* Actions (خارج التقرير → ما يبينوا بالـ PDF) */}
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

            {/* Report content */}
            <div ref={reportRef}>
              {/* Header info */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
                <tbody>
                  <tr>
                    <td style={tdHeader}>
                      <strong>Document Title:</strong> Personal Hygiene Check List
                    </td>
                    <td style={tdHeader}>
                      <strong>Document No:</strong> FS-QM /REC/PH
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <strong>Issue Date:</strong> 05/02/2020
                    </td>
                    <td style={tdHeader}>
                      <strong>Revision No:</strong> 0
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <strong>Area:</strong> QA
                    </td>
                    <td style={tdHeader}>
                      <strong>Issued By:</strong> MOHAMAD ABDULLAH QC
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <strong>Controlling Officer:</strong> Quality Controller
                    </td>
                    <td style={tdHeader}>
                      <strong>Approved By:</strong> Hussam.O.Sarhan
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Title */}
              <h3
                style={{
                  textAlign: "center",
                  background: "#e5e7eb",
                  padding: "6px",
                  marginBottom: "0.5rem",
                }}
              >
                AL MAWASHI BRAAI MAMZAR
                <br />
                PERSONAL HYGIENE CHECKLIST FTR-2
              </h3>

              {/* Date */}
              <div style={{ marginBottom: "0.5rem" }}>
                <strong>Date:</strong> {selectedReport?.payload?.reportDate || "—"}
              </div>

              {/* Table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <thead>
                  <tr style={{ background: "#2980b9", color: "#fff" }}>
                    <th style={{ ...thStyle, width: "50px" }}>S.No</th>
                    <th style={{ ...thStyle, width: "150px" }}>Employee Name</th>
                    {columns.map((col, i) => (
                      <th key={i} style={{ ...thStyle, width: "120px" }}>
                        {col}
                      </th>
                    ))}
                    <th style={{ ...thStyle, width: "250px" }}>Remarks and Corrective Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport?.payload?.entries?.map((entry, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{entry.name || "—"}</td>
                      {columns.map((col, cIndex) => (
                        <td key={cIndex} style={tdStyle}>
                          {entry[col] || "—"}
                        </td>
                      ))}
                      <td style={tdStyle}>{entry.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Remarks footer */}
              <div style={{ marginTop: "1rem", fontWeight: "600" }}>
                REMARKS / CORRECTIVE ACTIONS:
              </div>

              {/* C / NC note */}
              <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
                *(C – Conform &nbsp;&nbsp;&nbsp; N/C – Non Conform)
              </div>

              {/* Checked / Verified */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "1rem",
                  fontWeight: 600,
                }}
              >
                <div>Checked By: {selectedReport?.payload?.checkedBy || "—"}</div>
                <div>Verified By: {selectedReport?.payload?.verifiedBy || "—"}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const columns = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];

const thStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.85rem",
};

const tdStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const tdHeader = {
  border: "1px solid #ccc",
  padding: "4px 6px",
  fontSize: "0.85rem",
};
