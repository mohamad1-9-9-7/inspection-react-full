// src/pages/monitor/branches/ftr2/FTR2OilCalibrationView.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function FTR2OilCalibrationView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  /* ===== Helpers ===== */
  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
  const safeDate = (d) => {
    const dt = d ? new Date(d) : null;
    return dt && !isNaN(dt) ? dt : null;
  };
  const formatDate = (d) => {
    const dt = safeDate(d);
    if (!dt) return "—";
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };
  const firstEntryDate = (r) => r?.payload?.entries?.[0]?.date || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=ftr2_oil_calibration`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data || [];

      // تصاعدي: الأقدم أولًا
      arr.sort((a, b) => {
        const ta = safeDate(firstEntryDate(a))?.getTime() || 0;
        const tb = safeDate(firstEntryDate(b))?.getTime() || 0;
        return ta - tb;
      });

      setReports(arr);
      setSelectedReport(arr[0] || null); // الأقدم
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group: Year -> Month -> [reports] (تصاعدي)
  const grouped = useMemo(() => {
    const acc = {};
    for (const r of reports) {
      const dt = safeDate(firstEntryDate(r));
      if (!dt) continue;
      const y = String(dt.getFullYear());
      const m = String(dt.getMonth() + 1).padStart(2, "0");
      acc[y] ??= {};
      acc[y][m] ??= [];
      acc[y][m].push(r);
    }
    // داخل كل شهر: تصاعدي
    Object.values(acc).forEach((months) => {
      Object.values(months).forEach((arr) =>
        arr.sort(
          (a, b) =>
            (safeDate(firstEntryDate(a))?.getTime() || 0) -
            (safeDate(firstEntryDate(b))?.getTime() || 0)
        )
      );
    });
    return acc;
  }, [reports]);

  // ترتيب قيود التقرير المختار تصاعديًا
  const sortedEntries = useMemo(() => {
    const items = selectedReport?.payload?.entries || [];
    return [...items].sort(
      (a, b) =>
        (safeDate(a?.date)?.getTime() || 0) -
        (safeDate(b?.date)?.getTime() || 0)
    );
  }, [selectedReport]);

  /* ===== Export PDF ===== */
  const handleExportPDF = async () => {
    if (!reportRef.current || !selectedReport) return;

    const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const imgWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let position = margin;
    let heightLeft = imgHeight;

    pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
    }

    const nameDate = selectedReport?.payload?.entries?.[0]?.date || "report";
    pdf.save(`FTR2_Oil_Calibration_${nameDate}.pdf`);
  };

  /* ===== Delete ===== */
  const handleDelete = async (report) => {
    if (!report) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(report);
    if (!rid) {
      alert("⚠️ Missing report ID.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      setReports((prev) => {
        const idx = prev.findIndex((x) => getId(x) === rid);
        const next = prev.filter((x) => getId(x) !== rid);
        // بعد الحذف: اختَر العنصر في نفس الموضع إن وُجد
        const pick = next[Math.min(idx, Math.max(0, next.length - 1))] || null;
        setSelectedReport(pick);
        return next;
      });

      alert("✅ Report deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    }
  };

  /* ===== Export JSON (كل التقارير) ===== */
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "ftr2_oil_calibration",
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
      a.download = `FTR2_Oil_Calibration_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to export JSON.");
    }
  };

  /* ===== Import JSON (رفع للسيرفر وإنشاء سجلات) ===== */
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
              type: "ftr2_oil_calibration",
              payload,
            }),
          });
          if (res.ok) ok++; else fail++;
        } catch {
          fail++;
        }
      }

      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await load();
    } catch (err) {
      console.error(err);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = ""; // يسمح بإعادة اختيار نفس الملف لاحقًا
    }
  };

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Sidebar */}
      <div
        style={{
          minWidth: "280px",
          background: "#f9f9f9",
          padding: "1rem",
          borderRadius: "10px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}
      >
        <h4
          style={{
            marginBottom: "0.5rem",
            color: "#16a085",
            textAlign: "center",
          }}
        >
          📂 Saved Reports
        </h4>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <button
            onClick={load}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              background: "#0ea5e9",
              color: "#fff",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
            title="Refresh"
          >
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.entries(grouped)
              .sort(([a], [b]) => Number(a) - Number(b)) // السنوات تصاعدي
              .map(([year, months]) => (
                <details key={year} open>
                  <summary style={{ fontWeight: "bold", margin: "8px 0" }}>
                    📅 Year {year}
                  </summary>

                  {Object.entries(months)
                    .sort(([a], [b]) => Number(a) - Number(b)) // الأشهر تصاعدي
                    .map(([month, reportsInMonth]) => (
                      <div
                        key={month}
                        style={{
                          background: "#ecf0f1",
                          borderRadius: 8,
                          padding: "6px 8px",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            marginBottom: 6,
                            display: "flex",
                            justifyContent: "space_between",
                            alignItems: "center",
                          }}
                        >
                          <span>📂 Month {month}</span>
                          <span style={{ fontSize: 12, color: "#555" }}>
                            {reportsInMonth.length} item(s)
                          </span>
                        </div>

                        {/* داخل الشهر: الأقدم أولًا */}
                        {reportsInMonth.map((r) => {
                          const isActive = getId(selectedReport) === getId(r);
                          const dt = firstEntryDate(r);
                          return (
                            <div
                              key={getId(r) || dt || Math.random()}
                              onClick={() => setSelectedReport(r)}
                              style={{
                                padding: "6px 10px",
                                marginBottom: 4,
                                borderRadius: 6,
                                cursor: "pointer",
                                background: isActive ? "#16a085" : "#ffffff",
                                color: isActive ? "#fff" : "#333",
                                border: "1px solid #e5e7eb",
                                display: "flex",
                                justifyContent: "space-between",
                                fontWeight: 600,
                              }}
                              title={`Open report (${formatDate(dt)})`}
                            >
                              <span>📝 {formatDate(dt)}</span>
                              {getId(r) ? (
                                <span style={{ fontSize: 12, opacity: 0.8 }}>
                                  ID: {String(getId(r)).slice(0, 6)}…
                                </span>
                              ) : null}
                            </div>
                          );
                        })}
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
                onClick={handleExportJSON}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "#16a085",
                  color: "#fff",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ⬇ Export JSON
              </button>

              <button
                onClick={triggerImport}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  background: "#f39c12",
                  color: "#fff",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ⬆ Import JSON
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

              {/* input مخفي لاستيراد JSON */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
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
                {sortedEntries.length ? (
                  sortedEntries.map((entry, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{formatDate(entry?.date)}</td>
                      <td style={tdStyle}>{entry?.result || "—"}</td>
                      <td style={tdStyle}>{entry?.action || "—"}</td>
                      <td style={tdStyle}>{entry?.checkedBy || "—"}</td>
                      <td style={tdStyle}>{entry?.verifiedBy || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td style={tdStyle} colSpan={5}>
                      — No entries —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Styles ===== */
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
