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
  const fileInputRef = useRef(null);

  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
  const toDate = (v) => {
    const d = v ? new Date(v) : null;
    return d && !isNaN(d) ? d : null;
  };

  // ===== Fetch (أقدم ← أحدث) =====
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=ftr2_temperature`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];

      arr.sort((a, b) => {
        const da = toDate(a?.payload?.date)?.getTime() || 0;
        const db = toDate(b?.payload?.date)?.getTime() || 0;
        return da - db;
      });

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

  // ===== Export PDF: صفحة واحدة أفقية =====
  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    const buttons = document.querySelector(".action-buttons");
    if (buttons) buttons.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 4,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pageWidth - 20; // هوامش خفيفة
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > pageHeight - 20) {
      imgHeight = pageHeight - 20;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`FTR2_Temperature_${selectedReport?.payload?.date || "report"}.pdf`);

    if (buttons) buttons.style.display = "flex";
  };

  // ===== Delete =====
  const handleDelete = async (report) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
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

  // ===== Export JSON (كل التقارير) =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "ftr2_temperature",
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
      a.download = `FTR2_Temperature_ALL_${ts}.json`;
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
            body: JSON.stringify({ type: "ftr2_temperature", payload }),
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

  // ===== Group (Year → Month → Day) تصاعدي =====
  const groupedReports = reports.reduce((acc, r) => {
    const d = toDate(r?.payload?.date);
    if (!d) return acc;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    acc[y] ??= {};
    acc[y][m] ??= [];
    acc[y][m].push({ ...r, day, _dt: d.getTime() });
    return acc;
  }, {});

  // أعمدة الزمن (بدون "Corrective Action")
  const times =
    (selectedReport?.payload?.times || [
      "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
    ]).filter((t) => String(t).toLowerCase() !== "corrective action");

  // ==== إزالة COOLER 9 من العرض/التصدير ====
  const coolersRaw = (selectedReport?.payload?.coolers || []).map((c, idx) => ({
    ...c,
    __idx: idx,
    __name: String(c?.name || c?.label || `Cooler ${idx + 1}`),
  }));
  const coolers = coolersRaw.filter((c) => {
    const nm = c.__name.trim().toLowerCase().replace(/\s+/g, "");
    // استبعاد الذي اسمه "Cooler 9" أو ترتيبه الأصلي التاسع (index 8)
    return nm !== "cooler9" && c.__idx !== 8;
  });

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
            {Object.entries(groupedReports)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([year, months]) => (
                <details key={year} open>
                  <summary style={{ fontWeight: "bold", marginBottom: "6px" }}>
                    📅 Year {year}
                  </summary>
                  {Object.entries(months)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([month, days]) => {
                      const daysSorted = [...days].sort((x, y) => x._dt - y._dt);
                      return (
                        <details key={month} style={{ marginLeft: "1rem" }} open>
                          <summary style={{ fontWeight: "500" }}>📅 Month {month}</summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {daysSorted.map((r, i) => {
                              const active =
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
                                    background: active ? "#dcd6f7" : "#ecf0f1",
                                    color: active ? "#222" : "#333",
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
          background: "#eef3f8",
          padding: "1.5rem",
          borderRadius: "14px",
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <div ref={reportRef}>

            {/* شريط أزرار */}
            <div
              className="action-buttons"
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.6rem",
                marginBottom: "0.8rem",
              }}
            >
              <button onClick={handleExportPDF} style={btn("#27ae60")}>⬇ Export PDF</button>
              <button onClick={handleExportJSON} style={btn("#16a085")}>⬇ Export JSON</button>
              <button onClick={triggerImport} style={btn("#f39c12")}>⬆ Import JSON</button>
              <button onClick={() => handleDelete(selectedReport)} style={btn("#c0392b")}>🗑 Delete</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* الترويسة */}
            <table style={topTable}>
              <tbody>
                <tr>
                  <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
                    <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                      AL<br/>MAWASHI
                    </div>
                  </td>
                  <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
                  <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
                  <td style={tdHeader}><b>Revision No:</b> 0</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Area:</b> QA</td>
                  <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
                </tr>
                <tr>
                  <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
                  <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
                </tr>
              </tbody>
            </table>

            <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
            <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP)</div>

            {/* تعليمات */}
            <div style={rulesBox}>
              <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
              <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
              <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
              <div style={{ marginTop: 6 }}>
                <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
              </div>
            </div>

            {/* جدول القياسات */}
            <table style={gridTable}>
              <thead>
                <tr>
                  <th style={thCell}>Cooler</th>
                  {times.map((t, i) => (
                    <th key={i} style={thCell}>{t}</th>
                  ))}
                  <th style={thCell}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {coolers.map((c, idx) => (
                  <tr key={idx}>
                    <td style={tdCellLeft}>{c.__name}</td>
                    {times.map((t, j) => (
                      <td key={j} style={tdCellCenter}>
                        {c?.temps?.[t] ?? "—"}
                      </td>
                    ))}
                    <td style={tdCellLeft}>{c?.remarks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* توقيعات */}
            <div style={signRow}>
              <div>Checked By:- <span style={{ fontWeight: 500 }}>{selectedReport?.payload?.checkedBy || "—"}</span></div>
              <div>Verified By:- <span style={{ fontWeight: 500 }}>{selectedReport?.payload?.verifiedBy || "—"}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const topTable = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: "8px",
  fontSize: "0.9rem",
  border: "1px solid #9aa4ae",
  background: "#f8fbff",
};

const tdHeader = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  verticalAlign: "middle",
};

const band1 = {
  width: "100%",
  textAlign: "center",
  background: "#bfc7cf",
  color: "#2c3e50",
  fontWeight: 700,
  padding: "6px 4px",
  border: "1px solid #9aa4ae",
  borderTop: "none",
};

const band2 = {
  width: "100%",
  textAlign: "center",
  background: "#dde3e9",
  color: "#2c3e50",
  fontWeight: 700,
  padding: "6px 4px",
  border: "1px solid #9aa4ae",
  borderTop: "none",
  marginBottom: "8px",
};

const rulesBox = {
  border: "1px solid #9aa4ae",
  background: "#f1f5f9",
  padding: "8px 10px",
  fontSize: "0.92rem",
  marginBottom: "10px",
};

const gridTable = {
  width: "100%",
  borderCollapse: "collapse",
  border: "1px solid #9aa4ae",
  background: "#ffffff",
};

const thCell = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  textAlign: "center",
  background: "#e0e6ed",
  fontWeight: 700,
  fontSize: "0.9rem",
  whiteSpace: "nowrap",
};

const tdCellCenter = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  textAlign: "center",
  fontWeight: 600,
  color: "#2c3e50",
};

const tdCellLeft = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  textAlign: "left",
};

const signRow = {
  display: "flex",
  justifyContent: "space-between",
  marginTop: "12px",
  fontWeight: 700,
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
