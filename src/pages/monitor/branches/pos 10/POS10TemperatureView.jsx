// src/pages/monitor/branches/pos 10/POS10TemperatureView.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import SignatureName from "../../../shared/SignatureName";
import {
  getId,
  btn,
  toISODate,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "./pos10ViewKit";

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

export default function POS10TemperatureView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();

  // 🔐 مطالبة كلمة السر (9999)
  const askPass = (label = "") =>
    (window.prompt(`${label}\nEnter password:`) || "") === "9999";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=pos10_temperature`, { cache: "no-store" });
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
    // تحميل ديناميكي — يخفّف حجم الصفحة عند الفتح
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
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
    pdf.text("AL MAWASHI — POS 10 Temperature Record", pageWidth / 2, 30, { align: "center" });
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight);
    const fileDate =
      selectedReport?.payload?.date ||
      selectedReport?.payload?.reportDate ||
      getReportDate(selectedReport)?.toISOString()?.slice(0, 10) ||
      "report";
    pdf.save(`POS10_Temperature_${fileDate}.pdf`);
  };

  // 📌 حذف التقرير (يتطلب كلمة سر 9999 + تأكيد)
  const handleDelete = async (report) => {
    if (!askPass("Delete confirmation")) {
      alert("❌ Wrong password");
      return;
    }
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

  // -------- عناصر شجرة التاريخ الموحّدة --------
  const treeItems = useMemo(
    () =>
      reports.map((r, i) => {
        const d = getReportDate(r);
        const iso = toISODate(d);
        return {
          key: getId(r) || `${iso}-${i}`,
          dateISO: iso,
          label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`,
          data: r,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reports]
  );

  const kpi = useMemo(() => calculateKPI(selectedReport?.payload?.coolers), [selectedReport]);

  return (
    <GlassShell
      icon="🌡️"
      title="Temperature Log — View (POS 10)"
      actions={
        selectedReport && (
          <>
            <button onClick={handleExportPDF} style={btn("#27ae60")}>⬇ Export PDF</button>
            <button onClick={() => handleDelete(selectedReport)} style={btn("#c0392b")} data-delete-action="true">
              🗑 Delete
            </button>
          </>
        )
      }
    >
      <SidebarLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            title="🗓️ Saved Reports"
            items={treeItems}
            activeKey={getId(selectedReport)}
            onPick={(it) => setSelectedReport(it.data)}
            loading={loading}
            emptyText="❌ No reports"
          />
        }
      >
        {!selectedReport ? (
          <EmptyState text="❌ No report selected." />
        ) : (
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
                    <b>Area:</b> POS 10
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
              <SignatureName label="Checked By" name={selectedReport?.payload?.checkedBy} align="start" />
              <SignatureName label="Verified By" name={selectedReport?.payload?.verifiedBy} align="end" />
            </div>
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}

/* ==== Styles ==== */
const topTable = {
  width: "100%",
  borderCollapse: "collapse",
  marginBottom: 8,
  fontSize: "1rem",
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
