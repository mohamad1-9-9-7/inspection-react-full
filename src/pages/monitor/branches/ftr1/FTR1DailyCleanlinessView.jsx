// src/pages/monitor/branches/ftr1/FTR1DailyCleanlinessView.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function FTR1DailyCleanlinessView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

  const getReportDate = (r) => {
    const d1 = new Date(r?.payload?.reportDate);
    if (!isNaN(d1)) return d1;
    const d2 = new Date(r?.created_at);
    return isNaN(d2) ? new Date(0) : d2;
  };

  // Fetch reports (أحدث أولاً)
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=ftr1_daily_cleanliness`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];

      // ✅ أحدث أولاً
      arr.sort((a, b) => getReportDate(b) - getReportDate(a));

      setReports(arr);
      setSelectedReport(arr[0] || null); // ✅ افتح الأحدث تلقائياً
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== Export PDF =====
  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    const actions = reportRef.current.querySelector(".action-buttons");
    const prev = actions?.style.display;
    if (actions) actions.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 3,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pageWidth;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    // ضبط داخل صفحة واحدة قدر الإمكان
    if (imgHeight > pageHeight - 40) {
      imgHeight = pageHeight - 40;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    const x = (pageWidth - imgWidth) / 2;
    const y = 20;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(
      `FTR1_Cleanliness_${selectedReport?.payload?.reportDate || "report"}.pdf`
    );

    if (actions) actions.style.display = prev || "flex";
  };

  // ===== Delete (بكلمة سر) =====
  const handleDelete = async (report) => {
    if (!report) return;

    const pwd = window.prompt("Enter password to delete this report:");
    if (pwd === null) return;
    if (pwd.trim() !== "9999") {
      alert("❌ Wrong password.");
      return;
    }

    if (!window.confirm("⚠️ Delete this report? This action cannot be undone.")) return;

    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");

    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted.");
      await fetchReports(); // ✅ يرجع يفتح الأحدث
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete.");
    }
  };

  // ===== Export JSON (كل التقارير) =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "ftr1_daily_cleanliness",
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
      a.download = `FTR1_Cleanliness_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to export JSON.");
    }
  };

  // ===== Import JSON (رفع للسيرفر) =====
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
              reporter: "ftr1",
              type: "ftr1_daily_cleanliness",
              payload,
            }),
          });
          if (res.ok) ok++; else fail++;
        } catch {
          fail++;
        }
      }

      alert(`✅ Imported: ${ok}  ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // Group reports by year > month > day
  const groupedReports = useMemo(() => {
    return reports.reduce((acc, r) => {
      const date = getReportDate(r);
      if (isNaN(date)) return acc;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      acc[year] ??= {};
      acc[year][month] ??= [];
      acc[year][month].push({ ...r, day, _dt: date.getTime() });
      return acc;
    }, {});
  }, [reports]);

  const selectedPayload = selectedReport?.payload || {};
  const entries = Array.isArray(selectedPayload?.entries) ? selectedPayload.entries : [];

  return (
    <div className="ftr1-clean" style={{ display: "flex", gap: "1rem" }}>
      {/* حارس CSS لتعطيل أي إخفاء للأزرار */}
      <style>{`
        .ftr1-clean .action-buttons { display: flex !important; }
        .ftr1-clean .action-buttons button { display: inline-flex !important; visibility: visible !important; opacity: 1 !important; }
      `}</style>

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
        <h4 style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}>
          🗓️ Saved Reports
        </h4>

        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {/* ✅ مطوية بشكل دائم: بدون open */}
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
                          <summary style={{ fontWeight: "500" }}>📅 Month {month}</summary>

                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {daysSorted.map((r, i) => {
                              const isActive = selectedReport && getId(selectedReport) === getId(r);
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
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ color: "#2980b9", margin: 0 }}>
                🧹 Report: {selectedPayload?.reportDate || "—"}{" "}
                {selectedPayload?.reportTime ? `• ${selectedPayload.reportTime}` : ""}
              </h3>

              <div
                className="action-buttons"
                style={{
                  display: "flex",
                  gap: "0.6rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button onClick={handleExportPDF} style={btnExport} title="Export PDF">
                  ⬇ Export PDF
                </button>
                <button onClick={handleExportJSON} style={btnJson} title="Export JSON">
                  ⬇ Export JSON
                </button>
                <button onClick={triggerImport} style={btnImport} title="Import JSON">
                  ⬆ Import JSON
                </button>

                <button
                  onClick={() => handleDelete(selectedReport)}
                  style={{ ...btnDelete }}
                  title="Delete this report (password required)"
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

            {/* شعار المواشي (نص بدل صورة خارج src) */}
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
                  <td style={tdStyleLeft}><b>Document Title:</b> Cleaning Checklist</td>
                  <td style={tdStyleLeft}><b>Document No:</b> FF-QM/REC/CC</td>
                </tr>
                <tr>
                  <td style={tdStyleLeft}><b>Issue Date:</b> 05/02/2020</td>
                  <td style={tdStyleLeft}><b>Revision No:</b> 0</td>
                </tr>
                <tr>
                  <td style={tdStyleLeft}><b>Area:</b> {selectedPayload?.area || "QA"}</td>
                  <td style={tdStyleLeft}><b>Issued By:</b> MOHAMAD ABDULLAH QC</td>
                </tr>
                <tr>
                  <td style={tdStyleLeft}><b>Controlling Officer:</b> Quality Controller</td>
                  <td style={tdStyleLeft}><b>Approved By:</b> Hussam.O.Sarhan</td>
                </tr>
              </tbody>
            </table>

            {/* ✅ عنوان مطابق لآخر تعديل */}
            <h3
              style={{
                textAlign: "center",
                background: "#e5e7eb",
                padding: "6px",
                marginBottom: "0.75rem",
              }}
            >
              AL MAWASHI BRAAI MUSH RIF <br />
              CLEANING CHECKLIST – FTR1
            </h3>

            {/* ✅ PIC note (من الإدخال) */}
            {selectedPayload?.checkedByNote ? (
              <div
                style={{
                  marginBottom: "10px",
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Note: {selectedPayload.checkedByNote}
              </div>
            ) : null}

            {/* جدول النظافة */}
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
                {entries.map((entry, i) => (
                  <tr key={i}>
                    <td style={tdCell}>
                      {entry.isSection ? entry.secNo : entry.subLetter}
                    </td>
                    <td style={{ ...tdCell, fontWeight: entry.isSection ? 700 : 400 }}>
                      {entry.section || entry.item}
                    </td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.status || "—"}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.observation || "—"}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.informed || "—"}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Checked/Verified ✅ مطابق آخر تعديل (PIC + QA) */}
            <div
              style={{
                marginTop: "1.25rem",
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                fontWeight: 700,
                padding: "0 0.25rem",
              }}
            >
              <span>Checked By: {selectedPayload?.checkedBy || "—"}</span>
              <span>Verified by (QA): {selectedPayload?.verifiedByQA || "—"}</span>
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

const tdStyleLeft = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "left",
};

const tdCell = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};

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
const btnDelete = {
  ...btnBase,
  background: "#c0392b",
  boxShadow: "0 0 0 1.5px rgba(192,57,43,.25) inset",
};
