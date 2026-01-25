// src/pages/monitor/branches/pos 11/POS11PersonalHygieneView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

const TYPE = "pos11_personal_hygiene";

/* ✅ أعمدة النظافة فقط (مثل الإدخال الجديد) */
const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

export default function POS11PersonalHygieneView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  // helper: ID موحّد للحذف والمقارنة
  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

  // 🔐 مطالبة كلمة السر (9999)
  const askPass = (label = "") =>
    (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  useEffect(() => {
    fetchReports();
  }, []);

  // helper: تاريخ آمن من reportDate ثم fallback على created_at
  const getReportDate = (r) => {
    const d1 = new Date(r?.payload?.reportDate);
    if (!isNaN(d1)) return d1;
    const d2 = new Date(r?.created_at);
    return isNaN(d2) ? new Date(0) : d2;
  };

  const isPOS11 = (r) =>
    String(r?.payload?.branch || r?.branch || "")
      .trim()
      .toLowerCase() === "pos 11";

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      let arr =
        Array.isArray(json) ? json :
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.rows) ? json.rows : [];

      // ✅ نحصر النتائج بفرع POS 11 فقط
      arr = arr.filter(isPOS11);

      // ✅ الأحدث أولاً
      arr.sort((a, b) => getReportDate(b) - getReportDate(a));

      setReports(arr);
      setSelectedReport(arr[0] || null); // الأحدث
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const payload = selectedReport?.payload || {};

  // ✅ اظهار POS 11 ومعه الاسم (ملحمة العين) — يدعم القديم والجديد
  const branchLabel = useMemo(() => {
    const base =
      (payload?.branchLabel && String(payload.branchLabel).trim()) ||
      (payload?.branch && String(payload.branch).trim()) ||
      "POS 11";

    // لو كان فقط POS 11 بدون وصف، أضف ملحمة العين تلقائياً
    if (/^pos\s*11$/i.test(base)) return "POS 11 — Al Ain Butchery";
    return base;
  }, [payload?.branchLabel, payload?.branch]);

  const reportDate = payload?.reportDate || payload?.date || "—";

  // ✅ لو التقارير القديمة كانت تستخدم checkedBy/verifiedBy
  const checkedBySupervisor =
    payload?.checkedBySupervisor || payload?.checkedBy || "—";
  const verifiedByQA = payload?.verifiedByQA || payload?.verifiedBy || "—";

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    const actions = reportRef.current.querySelector(".action-bar");
    const prev = actions?.style.display;
    if (actions) actions.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("l", "pt", "a4"); // Landscape
    const pageWidth = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(`AL MAWASHI — ${branchLabel}`, pageWidth / 2, 30, { align: "center" });

    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const x = 20;
    const y = 50;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`POS11_Personal_Hygiene_${reportDate}.pdf`);

    if (actions) actions.style.display = prev || "flex";
  };

  const handleDelete = async (report) => {
    if (!askPass("Delete confirmation")) {
      alert("❌ Wrong password");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted successfully.");
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    }
  };

  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: TYPE,
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
      a.download = `POS11_Personal_Hygiene_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to export JSON.");
    }
  };

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
              reporter: "pos11",
              type: TYPE,
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
    } catch (err) {
      console.error(err);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

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

  const entries = Array.isArray(payload?.entries) ? payload.entries : [];

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
          🗓️ Saved Reports ({branchLabel})
        </h4>

        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.entries(groupedReports)
              .sort(([ya], [yb]) => Number(yb) - Number(ya))
              .map(([year, months]) => (
                <details key={year} open={false}>
                  <summary style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    📅 Year {year}
                  </summary>

                  {Object.entries(months)
                    .sort(([ma], [mb]) => Number(mb) - Number(ma))
                    .map(([month, days]) => {
                      const daysSorted = [...days].sort((a, b) => b._dt - a._dt);
                      return (
                        <details key={month} style={{ marginLeft: "1rem" }} open={false}>
                          <summary style={{ fontWeight: "500" }}>📅 Month {month}</summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {daysSorted.map((r, i) => {
                              const isActive =
                                getId(selectedReport) && getId(selectedReport) === getId(r);
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
                                  }}
                                >
                                  {`${r.day}/${month}/${year}`}
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
            {/* Actions */}
            <div
              className="action-bar"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.6rem",
                marginBottom: "1rem",
                flexWrap: "wrap",
              }}
            >
              <button onClick={handleExportPDF} style={btn("#27ae60")}>
                ⬇ Export PDF
              </button>

              <button onClick={handleExportJSON} style={btn("#16a085")}>
                ⬇ Export JSON
              </button>

              <button onClick={triggerImport} style={btn("#f39c12")}>
                ⬆ Import JSON
              </button>

              <button onClick={() => handleDelete(selectedReport)} style={btn("#c0392b")}>
                🗑 Delete
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* Report content */}
            <div ref={reportRef}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
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
                      <strong>Area:</strong> QA &nbsp;&nbsp;
                      <span style={{ fontWeight: 800 }}>{branchLabel}</span>
                    </td>
                    <td style={tdHeader}>
                      <strong>Date:</strong> {reportDate}
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

              <h3
                style={{
                  textAlign: "center",
                  background: "#e5e7eb",
                  padding: "6px",
                  marginBottom: "0.5rem",
                }}
              >
                {branchLabel}
                <br />
                PERSONAL HYGIENE CHECKLIST
              </h3>

              {/* ✅ اعتماد إلكتروني */}
              <div
                style={{
                  marginBottom: "10px",
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: 800,
                  color: "#065f46",
                  textAlign: "center",
                }}
              >
                ✅ This report is electronically approved; no signature is required.
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                <thead>
                  <tr style={{ background: "#2980b9", color: "#fff" }}>
                    <th style={{ ...thStyle, width: "50px" }}>S.No</th>
                    <th style={{ ...thStyle, width: "160px" }}>Employee Name</th>

                    {HYGIENE_COLUMNS.map((col, i) => (
                      <th key={i} style={{ ...thStyle, width: "120px" }}>
                        {col}
                      </th>
                    ))}

                    <th style={{ ...thStyle, width: "150px" }}>
                      Fit for Food Handling?
                      <br />
                      (Yes/No)
                    </th>
                    <th style={{ ...thStyle, width: "140px" }}>
                      If No: Communicable disease
                      <br />
                      (Yes/No)
                    </th>
                    <th style={{ ...thStyle, width: "140px" }}>
                      If No: Open wound
                      <br />
                      (Yes/No)
                    </th>
                    <th style={{ ...thStyle, width: "170px" }}>If No: Other</th>

                    <th style={{ ...thStyle, width: "260px" }}>
                      Remarks and Corrective Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{entry?.name || "—"}</td>

                      {HYGIENE_COLUMNS.map((col, cIndex) => (
                        <td key={cIndex} style={tdStyle}>
                          {entry?.[col] || "—"}
                        </td>
                      ))}

                      <td style={tdStyle}>{entry?.fitForFoodHandling || "—"}</td>
                      <td style={tdStyle}>{entry?.reasonCommunicableDisease || "—"}</td>
                      <td style={tdStyle}>{entry?.reasonOpenWound || "—"}</td>
                      <td style={tdStyle}>{entry?.reasonOther || "—"}</td>

                      <td style={tdStyle}>{entry?.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "1rem",
                  fontWeight: 800,
                  gap: "1rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  Checked By (Branch Supervisor - PIC):{" "}
                  <span style={{ fontWeight: 900 }}>{checkedBySupervisor}</span>
                </div>
                <div>
                  Verified by (QA):{" "}
                  <span style={{ fontWeight: 900 }}>{verifiedByQA}</span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "10px",
                  textAlign: "center",
                  fontWeight: 900,
                  color: "#065f46",
                  borderTop: "1px dashed #94a3b8",
                  paddingTop: "8px",
                }}
              >
                ✅ This report is electronically approved; no signature is required.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

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

const btn = (bg) => ({
  padding: "6px 12px",
  borderRadius: "6px",
  background: bg,
  color: "#fff",
  fontWeight: "600",
  border: "none",
  cursor: "pointer",
});
