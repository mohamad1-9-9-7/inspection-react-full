// src/pages/monitor/branches/ftr1/FTR1DailyCleanlinessView.jsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import {
  getId,
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE = "ftr1_daily_cleanliness";

export default function FTR1DailyCleanlinessView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  const fileInputRef = useRef(null);

  const getReportDate = (r) => {
    const d1 = new Date(r?.payload?.reportDate);
    if (!isNaN(d1)) return d1;
    const d2 = new Date(r?.created_at);
    return isNaN(d2) ? new Date(0) : d2;
  };

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a, b) => getReportDate(b) - getReportDate(a));
      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data.");
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

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

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
    if (imgHeight > pageHeight - 40) {
      imgHeight = pageHeight - 40;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }

    const x = (pageWidth - imgWidth) / 2;
    pdf.addImage(imgData, "PNG", x, 20, imgWidth, imgHeight);
    pdf.save(`FTR1_Cleanliness_${selectedReport?.payload?.reportDate || "report"}.pdf`);
  };

  // ===== Delete =====
  const handleDelete = async (report) => {
    if (!report) return;
    const pwd = window.prompt("Enter password to delete this report:");
    if (pwd === null) return;
    if (pwd.trim() !== "9999") { alert("Wrong password."); return; }
    if (!window.confirm("Delete this report? This action cannot be undone.")) return;

    const rid = getId(report);
    if (!rid) return alert("Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      alert("Report deleted.");
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert("Failed to delete.");
    }
  };

  // ===== Export JSON =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = { type: TYPE, exportedAt: new Date().toISOString(), count: payloads.length, items: payloads };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
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
      alert("Failed to export JSON.");
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
      if (!itemsRaw.length) { alert("JSON file has no importable items."); return; }

      let ok = 0, fail = 0;
      for (const item of itemsRaw) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reporter: "ftr1", type: TYPE, payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
      alert(`Imported: ${ok} ${fail ? `| Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert("Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // ===== Tree items =====
  const treeItems = useMemo(() => {
    return reports.map((r) => {
      const d = getReportDate(r);
      const iso = d.getTime() > 0 ? d.toISOString().slice(0, 10) : "";
      return {
        key: getId(r) || iso,
        dateISO: iso,
        label: formatDMY(iso) || "No date",
        data: r,
      };
    });
  }, [reports]);

  const activeKey = useMemo(() => getId(selectedReport), [selectedReport]);
  const selectedPayload = selectedReport?.payload || {};
  const entries = Array.isArray(selectedPayload?.entries) ? selectedPayload.entries : [];

  // ===== Spectral table styles =====
  const gridStyle = { width: "100%", borderCollapse: "collapse", fontSize: 15, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(99,102,241,0.10)" };
  const theadRow = { background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" };
  const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "10px 8px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 800, background: "transparent", color: "#fff" };
  const tdCell = { border: "1px solid #c7d2fe", padding: "9px 7px", textAlign: "center", verticalAlign: "middle" };

  return (
    <GlassShell
      icon="🧹"
      title="Cleaning Checklist — View (FTR1 Mushrif Park)"
      actions={
        <>
          <button onClick={() => handleDelete(selectedReport)} style={btn("#dc2626")} data-delete-action="true">Delete</button>
          <button onClick={handleExportPDF} style={btn("#27ae60")}>Export PDF</button>
          <button onClick={handleExportJSON} style={btn("#16a085")}>Export JSON</button>
          <label style={{ ...btn("#059669"), display: "inline-block" }}>
            Import JSON
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportJSON} style={{ display: "none" }} />
          </label>
        </>
      }
    >
      <SidebarLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={activeKey}
            onPick={(it) => setSelectedReport(it.data)}
            loading={loading}
          />
        }
      >
        {loading && <p>Loading...</p>}
        {!loading && !selectedReport && <EmptyState text="No report selected." />}

        {selectedReport && (
          <div ref={reportRef} style={{ overflowX: "auto" }}>
            {/* Meta */}
            <div style={{ marginBottom: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
                <tbody>
                  <tr>
                    <td style={metaCell}><strong>Document Title:</strong> Cleaning Checklist</td>
                    <td style={metaCell}><strong>Document No:</strong> FF-QM/REC/CC</td>
                  </tr>
                  <tr>
                    <td style={metaCell}><strong>Issue Date:</strong> 05/02/2020</td>
                    <td style={metaCell}><strong>Revision No:</strong> 0</td>
                  </tr>
                  <tr>
                    <td style={metaCell}><strong>Area:</strong> {selectedPayload?.area || "QA"}</td>
                    <td style={metaCell}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</td>
                  </tr>
                  <tr>
                    <td style={metaCell}><strong>Controlling Officer:</strong> Quality Controller</td>
                    <td style={metaCell}><strong>Approved By:</strong> Hussam.O.Sarhan</td>
                  </tr>
                </tbody>
              </table>

              <div style={{
                textAlign: "center",
                background: "linear-gradient(90deg,#ede9fe,#e0f2fe,#d1fae5)",
                border: "1px solid #c7d2fe",
                borderRadius: 10,
                padding: "9px 6px",
                fontWeight: 800,
                fontSize: 16,
                color: "#0b1f4d",
                marginBottom: 10,
              }}>
                AL MAWASHI BRAAI MUSH RIF — CLEANING CHECKLIST (FTR1)
              </div>
            </div>

            {/* PIC note */}
            {selectedPayload?.checkedByNote ? (
              <div style={{
                marginBottom: 10,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "rgba(255,255,255,0.6)",
                fontWeight: 600,
                color: "#0f172a",
              }}>
                Note: {selectedPayload.checkedByNote}
              </div>
            ) : null}

            {/* Table */}
            <table style={gridStyle}>
              <thead>
                <tr style={theadRow}>
                  <th style={thCell}>Sl-No</th>
                  <th style={thCell}>General Cleaning</th>
                  <th style={thCell}>C / NC</th>
                  <th style={thCell}>Observation</th>
                  <th style={thCell}>Informed To</th>
                  <th style={thCell}>Remarks & CA</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} style={{ background: i % 2 ? "rgba(237,233,254,0.45)" : "#fff" }}>
                    <td style={tdCell}>{entry.isSection ? entry.secNo : entry.subLetter}</td>
                    <td style={{ ...tdCell, fontWeight: entry.isSection ? 700 : 400 }}>{entry.section || entry.item}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.status || "—"}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.observation || "—"}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.informed || "—"}</td>
                    <td style={tdCell}>{entry.isSection ? "—" : entry.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures */}
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontWeight: 700 }}>
              <SignatureName label="Checked By" name={selectedPayload?.checkedBy} align="start" />
              <SignatureName label="Verified by (QA)" name={selectedPayload?.verifiedByQA} align="end" />
            </div>
          </div>
        )}
      </SidebarLayout>
    </GlassShell>
  );
}

const metaCell = {
  border: "1px solid #d1d5db",
  padding: "7px 10px",
  fontSize: 14,
  lineHeight: 1.4,
};
