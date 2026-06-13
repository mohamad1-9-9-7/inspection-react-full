import React, { useEffect, useState, useRef, useMemo } from "react";
import SignatureName from "../../../shared/SignatureName";
import {
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "./pos10ViewKit";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function POS10DailyCleaningView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  const getId = (r) => r?.id || r?._id;

  // 🔐 مطالبة كلمة السر (9999)
  const askPass = (label = "") =>
    (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  // ===== Fetch (أقدم ← أحدث)
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=pos10_daily_cleanliness`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort(
        (a, b) =>
          new Date(a.payload?.reportDate || 0) -
          new Date(b.payload?.reportDate || 0)
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
    // تحميل ديناميكي — يخفّف حجم الصفحة عند الفتح
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);
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
      `POS10_Cleanliness_${selectedReport?.payload?.reportDate || "report"}.pdf`
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
      const res = await fetch(`${API_BASE}/api/reports/${getId(report)}`, {
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

  // ===== Export JSON (كل التقارير)
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "pos10_daily_cleanliness",
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
      a.download = `POS10_Cleanliness_ALL_${ts}.json`;
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
              type: "pos10_daily_cleanliness",
              payload,
            }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }

      alert(`✅ Imported: ${ok}  ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // ===== عناصر شجرة التاريخ الموحّدة
  const treeItems = useMemo(
    () =>
      reports
        .filter((r) => r?.payload?.reportDate && !isNaN(new Date(r.payload.reportDate)))
        .map((r, i) => {
          const iso = String(r.payload.reportDate).slice(0, 10);
          return {
            key: getId(r) || `${iso}-${i}`,
            dateISO: iso,
            label: formatDMY(iso),
            data: r,
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reports]
  );

  return (
    <GlassShell
      icon="🧹"
      title="Daily Cleaning — View (POS 10)"
      actions={
        <>
          <button onClick={handleExportPDF} disabled={!selectedReport} style={btn("#27ae60")}>
            ⬇ Export PDF
          </button>
          <button onClick={handleExportJSON} style={btn("#16a085")}>
            ⬇ Export JSON
          </button>
          <button onClick={triggerImport} style={btn("#f39c12")}>
            ⬆ Import JSON
          </button>
          <button
            onClick={() => handleDelete(selectedReport)}
            disabled={!selectedReport}
            style={btn("#c0392b")}
            data-delete-action="true"
          >
            🗑 Delete
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={handleImportJSON}
          />
        </>
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
          <div ref={reportRef} style={{ paddingBottom: "100px" }}>
            <h3 style={{ color: "#2980b9", marginTop: 0 }}>
              🧹 Report: {selectedReport.payload?.reportDate}
            </h3>

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
                fontSize: "1rem",
                borderCollapse: "collapse",
              }}
            >
              <tbody>
                <tr>
                  <td style={tdStyle}>
                    <b>Document Title:</b> Cleaning Checklist
                  </td>
                  <td style={tdStyle}>
                    <b>Document No:</b> FF-QM/REC/CC
                  </td>
                </tr>
                <tr>
                  <td style={tdStyle}>
                    <b>Issue Date:</b> 05/02/2020
                  </td>
                  <td style={tdStyle}>
                    <b>Revision No:</b> 0
                  </td>
                </tr>
                <tr>
                  <td style={tdStyle}>
                    <b>Area:</b> POS 10
                  </td>
                  <td style={tdStyle}>
                    <b>Issued By:</b> MOHAMAD ABDULLAH
                  </td>
                </tr>
                <tr>
                  <td style={tdStyle}>
                    <b>Controlling Officer:</b> Quality Controller
                  </td>
                  <td style={tdStyle}>
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
              TRANS EMIRATES LIVESTOCK (AL BARSHA BUTCHRY) <br />
              CLEANING CHECKLIST – POS 10
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
                    <td style={tdStyle}>
                      {entry.isSection ? entry.secNo : entry.subLetter}
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        fontWeight: entry.isSection ? 700 : 400,
                      }}
                    >
                      {entry.section || entry.item}
                    </td>
                    <td style={tdStyle}>
                      {entry.isSection ? "—" : entry.status || ""}
                    </td>
                    <td style={tdStyle}>
                      {entry.isSection ? "—" : entry.observation || ""}
                    </td>
                    <td style={tdStyle}>
                      {entry.isSection ? "—" : entry.informed || ""}
                    </td>
                    <td style={tdStyle}>
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
              <SignatureName label="Checked By" name={selectedReport.payload?.checkedBy} align="start" />
              <SignatureName label="Verified By" name={selectedReport.payload?.verifiedBy} align="end" />
            </div>
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}

const thStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "1rem",
};
const tdStyle = { padding: "6px", border: "1px solid #ccc", textAlign: "left" };
