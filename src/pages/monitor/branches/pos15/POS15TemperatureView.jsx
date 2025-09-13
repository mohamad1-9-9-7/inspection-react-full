// src/pages/monitor/branches/pos15/POS15TemperatureView.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// نفس أوقات الإدخال
const times = [
  "8:00 AM",
  "11:00 AM",
  "2:00 PM",
  "5:00 PM",
  "8:00 PM",
  "10:00 PM",
  "Corrective Action",
];
const gridTimes = times.filter((t) => t !== "Corrective Action");

// هل الصف فريزر؟
const isFreezer = (name = "") => /^freezer/i.test(String(name).trim());

// KPI helper (فقط للمبردات 0–5°C)
function calculateKPI(coolers = []) {
  const all = [];
  let out = 0;
  for (const c of coolers) {
    if (isFreezer(c.name)) continue;
    for (const [key, v] of Object.entries(c.temps || {})) {
      if (key === "Corrective Action") continue;
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) out++;
      }
    }
  }
  const avg = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  return { avg, min, max, out };
}

export default function POS15TemperatureView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

  // يلتقط تاريخ الحقل الصحيح: payload.date (من الإدخال) أو created_at
  const getReportDate = (r) => {
    const d =
      (r?.payload?.date && new Date(r.payload.date)) ||
      (r?.payload?.reportDate && new Date(r.payload.reportDate)) ||
      (r?.created_at && new Date(r.created_at)) ||
      new Date(NaN);
    return d;
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=pos15_temperature`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      let arr = Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [];
      // استبعد العناصر بدون تاريخ صالح، ثم رتب من الأحدث إلى الأقدم
      arr = arr
        .filter((r) => !isNaN(getReportDate(r)))
        .sort((a, b) => getReportDate(b) - getReportDate(a));
      setReports(arr);
      setSelectedReport(arr[0] || null); // الأحدث افتراضيًا
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

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
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI — POS 15 Temperature Record", pageWidth / 2, 30, { align: "center" });
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight);
    const fileDate =
      selectedReport?.payload?.date ||
      selectedReport?.payload?.reportDate ||
      getReportDate(selectedReport)?.toISOString()?.slice(0, 10) ||
      "report";
    pdf.save(`POS15_Temperature_${fileDate}.pdf`);
  };

  const handleDelete = async (report) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Report deleted successfully.");
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete report.");
    }
  };

  // -------- شجرة التاريخ (Year → Month → Days) | أحدث أولاً --------
  const grouped = useMemo(() => {
    const acc = {};
    for (const r of reports) {
      const d = getReportDate(r);
      if (isNaN(d)) continue;
      const y = String(d.getFullYear());
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const ts = d.getTime();
      acc[y] ||= {};
      acc[y][m] ||= [];
      acc[y][m].push({ ...r, _ts: ts, _label: `${day}/${m}/${y}` });
    }
    // ترتيب حديث → قديم
    for (const y of Object.keys(acc)) {
      for (const m of Object.keys(acc[y])) {
        acc[y][m].sort((a, b) => b._ts - a._ts);
      }
    }
    return acc;
  }, [reports]);

  const kpi = useMemo(() => calculateKPI(selectedReport?.payload?.coolers), [selectedReport]);

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* Sidebar (Date Tree) */}
      <div
        style={{
          minWidth: 260,
          background: "#f9f9f9",
          padding: "1rem",
          borderRadius: 10,
          boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
          height: "fit-content",
        }}
      >
        <h4 style={{ marginBottom: 12, color: "#6d28d9", textAlign: "center" }}>🗓️ Saved Reports</h4>
        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {/** سنوات: أحدث → أقدم */}
            {Object.keys(grouped)
              .sort((a, b) => Number(b) - Number(a))
              .map((y) => (
                <details key={y} open>
                  <summary style={{ fontWeight: "bold", marginBottom: 6 }}>📅 Year {y}</summary>

                  {/** شهور: أحدث → أقدم */}
                  {Object.keys(grouped[y])
                    .sort((a, b) => Number(b) - Number(a))
                    .map((m) => {
                      const arr = grouped[y][m];
                      return (
                        <details key={m} style={{ marginLeft: "1rem" }}>
                          <summary style={{ fontWeight: 600 }}>
                            📅 Month {m} <span style={{ color: "#6b7280" }}>({arr.length})</span>
                          </summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {arr.map((r, i) => {
                              const active = getId(selectedReport) && getId(selectedReport) === getId(r);
                              return (
                                <li
                                  key={i}
                                  onClick={() => setSelectedReport(r)}
                                  style={{
                                    padding: "6px 10px",
                                    marginBottom: 4,
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    background: active ? "#6d28d9" : "#ecf0f1",
                                    color: active ? "#fff" : "#333",
                                    fontWeight: 600,
                                    textAlign: "center",
                                  }}
                                >
                                  {r._label}
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

      {/* Report */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
          padding: "1.5rem",
          borderRadius: 14,
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <>
            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <button onClick={handleExportPDF} style={btnGreen}>
                ⬇ Export PDF
              </button>
              <button onClick={() => handleDelete(selectedReport)} style={btnRed}>
                🗑 Delete
              </button>
            </div>

            {/* Content */}
            <div ref={reportRef}>
              {/* Header */}
              <table style={topTable}>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ ...tdHeader, width: 120, textAlign: "center" }}>
                      <div style={{ fontWeight: 900, color: "#a00" }}>
                        AL
                        <br />
                        MAWASHI
                      </div>
                    </td>
                    <td style={tdHeader}>
                      <b>Document Title:</b> Temperature Control Record
                    </td>
                    <td style={tdHeader}>
                      <b>Document No:</b> FS-QM/REC/TMP
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <b>Issue Date:</b> 05/02/2020
                    </td>
                    <td style={tdHeader}>
                      <b>Revision No:</b> 0
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <b>Area:</b> POS 15
                    </td>
                    <td style={tdHeader}>
                      <b>Issued by:</b> MOHAMAD ABDULLAH
                    </td>
                  </tr>
                  <tr>
                    <td style={tdHeader}>
                      <b>Controlling Officer:</b> Quality Controller
                    </td>
                    <td style={tdHeader}>
                      <b>Approved by:</b> Hussam O. Sarhan
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
              <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP)</div>

              <div style={{ margin: "8px 0 10px" }}>
                <strong>Date:</strong>{" "}
                {selectedReport?.payload?.date ||
                  selectedReport?.payload?.reportDate ||
                  getReportDate(selectedReport)?.toISOString()?.slice(0, 10) ||
                  "—"}
              </div>

              {/* جدول القيم */}
              <table style={gridTable}>
                <thead>
                  <tr>
                    <th style={thCell}>Cooler/Freezer</th>
                    {gridTimes.map((t) => (
                      <th key={t} style={thCell}>
                        {t}
                      </th>
                    ))}
                    <th style={thCell}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport?.payload?.coolers?.map((c, idx) => (
                    <tr key={idx}>
                      <td style={tdCellLeft}>
                        <b>{c.name}</b>
                      </td>
                      {gridTimes.map((t) => (
                        <td key={t} style={tdCellCenter}>
                          {c.temps?.[t] ?? "—"}
                        </td>
                      ))}
                      <td style={tdCellLeft}>{c.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* KPI */}
              <div style={{ marginTop: 12, fontWeight: 700 }}>
                KPI — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}{" "}
                <span style={{ color: "#374151" }}>(Coolers only)</span>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
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

/* ==== Styles ==== */
const topTable = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 8,
  fontSize: "0.9rem",
  border: "1px solid #9aa4ae",
  background: "#f8fbff",
};
const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
const band1 = {
  textAlign: "center",
  background: "#bfc7cf",
  fontWeight: 700,
  padding: "6px 4px",
  border: "1px solid #9aa4ae",
  borderTop: "none",
};
const band2 = {
  textAlign: "center",
  background: "#dde3e9",
  fontWeight: 700,
  padding: "6px 4px",
  border: "1px solid #9aa4ae",
  borderTop: "none",
  marginBottom: 8,
};
const gridTable = { width: "100%", borderCollapse: "collapse", border: "1px solid #9aa4ae" };
const thCell = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  background: "#e0e6ed",
  fontWeight: 700,
  textAlign: "center",
};
const tdCellCenter = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center" };
const tdCellLeft = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "left" };

const btn = (bg) => ({
  padding: "6px 12px",
  borderRadius: 6,
  background: bg,
  color: "#fff",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
});
const btnGreen = btn("#27ae60");
const btnRed = btn("#c0392b");
