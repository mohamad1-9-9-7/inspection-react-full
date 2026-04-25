// src/pages/monitor/branches/pos 11/POS11DailyCleaningView.jsx
import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function POS11DailyCleaningView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

  // 🔐 مطالبة كلمة السر (9999)
  const askPass = (label = "") =>
    (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  // نحصر النتائج بفرع POS 11 فقط
  const isPOS11 = (r) =>
    String(r?.payload?.branch || r?.branch || "")
      .trim()
      .toLowerCase() === "pos 11";

  // ===== Fetch (أقدم ← أحدث)
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=pos11_daily_cleanliness`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      let arr =
        Array.isArray(json) ? json :
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.rows) ? json.rows : [];

      // فلترة الفرع
      arr = arr.filter(isPOS11);

      // ترتيب تصاعدي بالتاريخ
      arr.sort(
        (a, b) =>
          new Date(a?.payload?.reportDate || 0) -
          new Date(b?.payload?.reportDate || 0)
      );
      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  // ===== PDF
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const buttons = reportRef.current.querySelector(".action-buttons");
    if (buttons) buttons.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 4,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = 20;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(
      `POS11_Cleanliness_${selectedReport?.payload?.reportDate || "report"}.pdf`
    );

    if (buttons) buttons.style.display = "flex";
  };

  // ===== Delete (بكلمة سر 9999 + تأكيد)
  const handleDelete = async (report) => {
    if (!askPass("Delete confirmation")) {
      alert("❌ Wrong password");
      return;
    }
    if (!window.confirm("⚠️ Delete this report?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(getId(report))}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted.");
      fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  };

  // ===== Export JSON (كل التقارير لفرع POS 11)
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "pos11_daily_cleanliness",
        branch: "POS 11",
        exportedAt: new Date().toISOString(),
        count: payloads.length,
        items: payloads,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `POS11_Cleanliness_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to export JSON.");
    }
  };

  // ===== Import JSON (رفع للسيرفر)
  const triggerImport = () => fileInputRef.current?.click();

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);

      const itemsRaw =
        Array.isArray(json) ? json :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.data) ? json.data : [];

      if (!itemsRaw.length) {
        alert("⚠️ ملف JSON لا يحتوي عناصر قابلة للاستيراد.");
        return;
      }

      let ok = 0, fail = 0;
      for (const item of itemsRaw) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }

        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "pos11_daily_cleanliness",
              payload,
            }),
          });
          if (res.ok) ok++; else fail++;
        } catch {
          fail++;
        }
      }

      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // ===== Group by Year > Month > Day
  const groupedReports = reports.reduce((acc, r) => {
    const date = new Date(r?.payload?.reportDate);
    if (isNaN(date)) return acc;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    if (!acc[year]) acc[year] = {};
    if (!acc[year][month]) acc[year][month] = [];
    acc[year][month].push({ ...r, day, _dt: date.getTime() });
    return acc;
  }, {});

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
          style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}
        >
          🗓️ Saved Reports (POS 11)
        </h4>
        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.entries(groupedReports)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, months]) => (
                <details key={year}>
                  <summary style={{ fontWeight: "bold" }}>📅 Year {year}</summary>
                  {Object.entries(months)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([month, days]) => {
                      const daysSorted = [...days].sort((x, y) => y._dt - x._dt);
                      return (
                        <details key={month} style={{ marginLeft: "1rem" }}>
                          <summary style={{ fontWeight: "500" }}>
                            📅 Month {month}
                          </summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {daysSorted.map((r, i) => {
                              const isActive =
                                selectedReport && getId(selectedReport) === getId(r);
                              return (
                                <li
                                  key={i}
                                  onClick={() => setSelectedReport(r)}
                                  style={{
                                    padding: "6px 10px",
                                    marginBottom: "4px",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    background: isActive ? "#6d28d9" : "#ecf0f1",
                                    color: isActive ? "#fff" : "#333",
                                    fontWeight: 600,
                                    textAlign: "center",
                                    borderLeft: isActive
                                      ? "4px solid #4c1d95"
                                      : "4px solid transparent",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                  }}
                                  title={isActive ? "Currently open" : "Open report"}
                                >
                                  <span>{`${r.day}/${month}/${year}`}</span>
                                  {isActive ? (
                                    <span>✔️</span>
                                  ) : (
                                    <span style={{ opacity: 0.5 }}>•</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      );
                    })}
                </details>
              ))}
          </div>
        )}
      </div>

      {/* Report display */}
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
          <div ref={reportRef} style={{ paddingBottom: "100px" }}>
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
                🧹 Report: {selectedReport.payload?.reportDate}
              </h3>
              <div className="action-buttons" style={{ display: "flex", gap: "0.6rem" }}>
                <button onClick={handleExportPDF} style={btnExport}>
                  ⬇ Export PDF
                </button>
                <button onClick={handleExportJSON} style={btnJson}>
                  ⬇ Export JSON
                </button>
                <button onClick={triggerImport} style={btnImport}>
                  ⬆ Import JSON
                </button>
                <button
                  onClick={() => handleDelete(selectedReport)}
                  style={btnDelete}
                >
                  🗑 Delete
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* شعار */}
            <div style={{ textAlign: "right", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, color: "darkred" }}>AL MAWASHI</h2>
              <div style={{ fontSize: "0.95rem", color: "#333" }}>
                Trans Emirates Livestock Trading L.L.C.
              </div>
            </div>

            {/* الترويسة */}
            <table
              style={{
                width: "100%",
                border: "1px solid #ccc",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                <tr>
                  <td style={tdStyleHeader}>
                    <b>Document Title:</b> Cleaning Checklist
                  </td>
                  <td style={tdStyleHeader}>
                    <b>Document No:</b> FF-QM/REC/CC
                  </td>
                </tr>
                <tr>
                  <td style={tdStyleHeader}>
                    <b>Issue Date:</b> 05/02/2020
                  </td>
                  <td style={tdStyleHeader}>
                    <b>Revision No:</b> 0
                  </td>
                </tr>
                <tr>
                  <td style={tdStyleHeader}>
                    <b>Area:</b> POS 11
                  </td>
                  <td style={tdStyleHeader}>
                    <b>Issued By:</b> MOHAMAD ABDULLAH
                  </td>
                </tr>
                <tr>
                  <td style={tdStyleHeader}>
                    <b>Controlling Officer:</b> Quality Controller
                  </td>
                  <td style={tdStyleHeader}>
                    <b>Approved By:</b> Hussam O.Sarhan
                  </td>
                </tr>
              </tbody>
            </table>

            <h3
              style={{
                textAlign: "center",
                background: "#e5e7eb",
                padding: "6px",
                marginBottom: "1rem",
              }}
            >
              TRANS EMIRATES LIVESTOCK (AL AIN BUTCHERY) <br />
              CLEANING CHECKLIST – POS 11
            </h3>

            {/* جدول العرض */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#2980b9", color: "#fff" }}>
                  <th style={thStyle}>Sl-No</th>
                  <th style={thStyle}>General Cleaning</th>
                  <th style={thStyle}>C / NC</th>
                  <th style={thStyle}>Observation</th>
                  <th style={thStyle}>Informed To</th>
                  <th style={thStyle}>Remarks & CA</th>
                </tr>
              </thead>
              <tbody>
                {selectedReport.payload?.entries?.map((entry, i) => (
                  <tr key={i}>
                    <td style={tdStyleCell}>
                      {entry.isSection ? entry.secNo : entry.subLetter}
                    </td>
                    <td
                      style={{
                        ...tdStyleCell,
                        fontWeight: entry.isSection ? 700 : 400,
                      }}
                    >
                      {entry.section || entry.item}
                    </td>
                    <td style={tdStyleCell}>
                      {entry.isSection ? "—" : entry.status || ""}
                    </td>
                    <td style={tdStyleCell}>
                      {entry.isSection ? "—" : entry.observation || ""}
                    </td>
                    <td style={tdStyleCell}>
                      {entry.isSection ? "—" : entry.informed || ""}
                    </td>
                    <td style={tdStyleCell}>
                      {entry.isSection ? "—" : entry.remarks || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Checked/Verified */}
            <div
              style={{
                marginTop: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 600,
                padding: "0 1rem",
              }}
            >
              <span>
                Checked By: {selectedReport.payload?.checkedBy || "—"}
              </span>
              <span>
                Verified By: {selectedReport.payload?.verifiedBy || "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.9rem",
};
const tdStyleHeader = { padding: "6px", border: "1px solid #ccc", textAlign: "left" };
const tdStyleCell = { padding: "6px", border: "1px solid #ccc", textAlign: "left" };

const btnBase = {
  padding: "8px 14px",
  borderRadius: "6px",
  color: "#fff",
  fontWeight: "600",
  border: "none",
  cursor: "pointer",
};

const btnExport = { ...btnBase, background: "#27ae60" };
const btnJson = { ...btnBase, background: "#16a085" };
const btnImport = { ...btnBase, background: "#f39c12" };
const btnDelete = { ...btnBase, background: "#c0392b" };
