// src/pages/monitor/branches/ftr1/FTR1PersonalHygieneView.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ✅ نفس أعمدة الإدخال (النظافة العامة) */
const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

export default function FTR1PersonalHygieneView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getReportDate = (r) => {
    const d1 = new Date(r?.payload?.reportDate);
    if (!isNaN(d1)) return d1;
    const d2 = new Date(r?.created_at);
    return isNaN(d2) ? new Date(0) : d2;
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=ftr1_personal_hygiene`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a, b) => getReportDate(b) - getReportDate(a)); // ✅ أحدث أولاً
      setReports(arr);

      // ✅ اعرض آخر/أحدث تقرير تلقائياً دائماً
      setSelectedReport(arr[0] || null);
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  // ===== PDF (يُخفي الشريط مؤقتاً) =====
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const toolbar = reportRef.current.querySelector(".action-toolbar");
    const prev = toolbar?.style.display;
    if (toolbar) toolbar.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI", pageWidth / 2, 30, { align: "center" });
    pdf.addImage(imgData, "PNG", margin, 50, imgWidth, imgHeight);
    pdf.save(
      `FTR1_Personal_Hygiene_${
        selectedReport?.payload?.reportDate || "report"
      }.pdf`
    );

    if (toolbar) toolbar.style.display = prev || "flex";
  };

  // ===== XLS (CSV متوافق) =====
  const handleExportXLS = () => {
    if (!selectedReport) return;

    const header = [
      "S.No",
      "Employee Name",
      ...HYGIENE_COLUMNS,
      "Fit for Food Handling? (Yes/No)",
      "If No: Communicable disease (Yes/No)",
      "If No: Open wound (Yes/No)",
      "If No: Other (text)",
      "Remarks and Corrective Actions",
    ];

    const rows = [
      header,
      ...(selectedReport?.payload?.entries || []).map((entry, i) => [
        i + 1,
        entry?.name || "",
        ...HYGIENE_COLUMNS.map((c) => entry?.[c] || ""),
        entry?.fitForFoodHandling || "",
        entry?.reasonCommunicableDisease || "",
        entry?.reasonOpenWound || "",
        entry?.reasonOther || "",
        entry?.remarks || "",
      ]),
    ];

    const csv = rows
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            const needsQuotes = /[",\n;]/.test(s);
            const escaped = s.replace(/"/g, '""');
            return needsQuotes ? `"${escaped}"` : escaped;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nameDate = selectedReport?.payload?.reportDate || "report";
    a.href = url;
    a.download = `FTR1_Personal_Hygiene_${nameDate}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ===== Delete (بكلمة سر 9999) =====
  const handleDelete = async (report) => {
    if (!report) return;
    const pwd = window.prompt("Enter password to delete this report:");
    if (pwd === null) return;
    if (pwd.trim() !== "9999") {
      alert("❌ Wrong password.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted successfully.");
      fetchReports(); // ✅ سيعيد اختيار أحدث تقرير تلقائياً
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    }
  };

  // ===== Export JSON (كل التقارير) =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "ftr1_personal_hygiene",
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
      a.download = `FTR1_Personal_Hygiene_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to export JSON.");
    }
  };

  // ===== Import JSON =====
  const triggerImport = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);

      const itemsRaw = Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.data)
        ? json.data
        : [];

      if (!itemsRaw.length) {
        alert("⚠️ ملف JSON لا يحتوي عناصر قابلة للاستيراد.");
        return;
      }

      let ok = 0,
        fail = 0;
      for (const item of itemsRaw) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") {
          fail++;
          continue;
        }

        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reporter: "ftr1",
              type: "ftr1_personal_hygiene",
              payload,
            }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }

      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchReports(); // ✅ سيعرض أحدث تقرير تلقائياً
    } catch (err) {
      console.error(err);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // Group by year → month → day
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
        <h4 style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}>
          🗓️ Saved Reports
        </h4>

        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {/* ✅ الشجرة مطوية دائماً: حذف open من details */}
            {Object.entries(groupedReports)
              .sort(([ya], [yb]) => Number(yb) - Number(ya))
              .map(([year, months]) => (
                <details key={year}>
                  <summary style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    📅 Year {year}
                  </summary>

                  {Object.entries(months)
                    .sort(([ma], [mb]) => Number(mb) - Number(ma))
                    .map(([month, days]) => {
                      const daysSorted = [...days].sort((a, b) => b._dt - a._dt);
                      return (
                        <details key={month} style={{ marginLeft: "1rem" }}>
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
          <div ref={reportRef}>
            <style>{`
              .action-toolbar { display: flex !important; }
              .action-toolbar button { display: inline-flex !important; visibility: visible !important; opacity: 1 !important; }
            `}</style>

            {/* Toolbar */}
            <div
              className="action-toolbar"
              style={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.6rem",
                padding: "8px 0 12px",
                background: "linear-gradient(to bottom, #f6f8fa, #f6f8facc)",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => handleDelete(selectedReport)}
                style={btn("#c0392b")}
                title="Delete this report (password: 9999)"
              >
                🗑 Delete
              </button>

              <button onClick={handleExportPDF} style={btn("#27ae60")}>⬇ Export PDF</button>
              <button onClick={handleExportJSON} style={btn("#16a085")}>⬇ Export JSON</button>
              <button onClick={handleExportXLS} style={btn("#0ea5e9")}>⬇ Export XLS</button>
              <button onClick={triggerImport} style={btn("#f39c12")}>⬆ Import JSON</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* Header info */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
              <tbody>
                <tr>
                  <td style={tdHeader}><strong>Document Title:</strong> Personal Hygiene Check List</td>
                  <td style={tdHeader}><strong>Document No:</strong> FS-QM /REC/PH</td>
                </tr>
                <tr>
                  <td style={tdHeader}><strong>Issue Date:</strong> 05/02/2020</td>
                  <td style={tdHeader}><strong>Revision No:</strong> 0</td>
                </tr>
                <tr>
                  <td style={tdHeader}><strong>Area:</strong> QA</td>
                  <td style={tdHeader}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</td>
                </tr>
                <tr>
                  <td style={tdHeader}><strong>Controlling Officer:</strong> Quality Controller</td>
                  <td style={tdHeader}><strong>Approved By:</strong> Hussam.O.Sarhan</td>
                </tr>
              </tbody>
            </table>

            {/* Title (✅ مشرف) */}
            <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: "6px", marginBottom: "0.5rem" }}>
              AL MAWASHI BRAAI MUSH RIF
              <br />
              PERSONAL HYGIENE CHECKLIST FTR-1
            </h3>

            {/* Date */}
            <div style={{ marginBottom: "0.75rem" }}>
              <strong>Date:</strong> {selectedPayload?.reportDate || "—"}
            </div>

            {/* PIC note */}
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

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "#2980b9", color: "#fff" }}>
                  <th style={{ ...thStyle, width: "50px" }}>S.No</th>
                  <th style={{ ...thStyle, width: "150px" }}>Employee Name</th>

                  {HYGIENE_COLUMNS.map((col, i) => (
                    <th key={i} style={{ ...thStyle, width: "120px" }}>{col}</th>
                  ))}

                  <th style={{ ...thStyle, width: "150px" }}>Fit for Food Handling?<br />(Yes/No)</th>
                  <th style={{ ...thStyle, width: "140px" }}>If No: Communicable disease<br />(Yes/No)</th>
                  <th style={{ ...thStyle, width: "140px" }}>If No: Open wound<br />(Yes/No)</th>
                  <th style={{ ...thStyle, width: "170px" }}>If No: Other (text)</th>

                  <th style={{ ...thStyle, width: "250px" }}>Remarks and Corrective Actions</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{entry?.name || "—"}</td>

                    {HYGIENE_COLUMNS.map((col, cIndex) => (
                      <td key={cIndex} style={tdStyle}>{entry?.[col] || "—"}</td>
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

            {/* Footers */}
            <div style={{ marginTop: "1rem", fontWeight: "600" }}>
              REMARKS / CORRECTIVE ACTIONS:
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginTop: "1rem", fontWeight: 600 }}>
              <div>Checked By: {selectedPayload?.checkedBy || "—"}</div>
              <div>Verified by (QA): {selectedPayload?.verifiedByQA || "—"}</div>
            </div>
          </div>
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
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
});
