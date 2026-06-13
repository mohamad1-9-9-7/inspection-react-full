// src/pages/monitor/branches/ftr1/FTR1TemperatureView.jsx
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

const TYPE = "ftr1_temperature";

const toDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d) ? d : null;
};

export default function FTR1TemperatureView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef();
  const fileInputRef = useRef(null);

  // ===== Fetch (newest first) =====
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];

      arr.sort((a, b) => {
        const da = toDate(a?.payload?.date)?.getTime() || 0;
        const db = toDate(b?.payload?.date)?.getTime() || 0;
        return db - da;
      });

      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch data from server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  // ===== Export PDF =====
  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const canvas = await html2canvas(reportRef.current, {
      scale: 4,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pageWidth - 20;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    if (imgHeight > pageHeight - 20) {
      imgHeight = pageHeight - 20;
      imgWidth = (canvas.width * imgHeight) / canvas.height;
    }
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;

    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`FTR1_Temperature_${selectedReport?.payload?.date || "report"}.pdf`);
  };

  // ===== Export XLS (CSV) =====
  const handleExportXLS = () => {
    if (!selectedReport) return;

    const times =
      (selectedReport?.payload?.times || [
        "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
      ]).filter((t) => String(t).toLowerCase() !== "corrective action");

    const coolersRaw = (selectedReport?.payload?.coolers || []).map((c, idx) => ({
      ...c,
      __idx: idx,
      __name: String(c?.name || c?.label || `Cooler ${idx + 1}`),
    }));
    const coolers = coolersRaw.filter((c) => {
      const nm = c.__name.trim().toLowerCase().replace(/\s+/g, "");
      return nm !== "cooler9" && c.__idx !== 8;
    });

    const header = ["Cooler", ...times, "Remarks"];
    const rows = [header, ...coolers.map((c) => [
      c.__name,
      ...times.map((t) => c?.temps?.[t] ?? ""),
      c?.remarks ?? "",
    ])];

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
    const nameDate = selectedReport?.payload?.date || "report";
    a.href = url;
    a.download = `FTR1_Temperature_${nameDate}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ===== Delete =====
  const handleDelete = async (report) => {
    const pwd = window.prompt("Enter password to delete this report:");
    if (pwd === null) return;
    if (pwd.trim() !== "9999") {
      alert("Wrong password.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(report);
    if (!rid) return alert("Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      alert("Report deleted successfully.");
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("Failed to delete report.");
    }
  };

  // ===== Export JSON =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: TYPE,
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
      a.download = `FTR1_Temperature_ALL_${ts}.json`;
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
      if (!itemsRaw.length) {
        alert("JSON file has no importable items.");
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
            body: JSON.stringify({ reporter: "ftr1", type: TYPE, payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch {
          fail++;
        }
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

  // ===== Tree items from reports =====
  const treeItems = useMemo(() => {
    return reports.map((r) => {
      const d = r?.payload?.date || "";
      const iso = d ? new Date(d).toISOString().slice(0, 10) : "";
      return {
        key: getId(r) || iso,
        dateISO: iso,
        label: formatDMY(iso) || d || "No date",
        data: r,
      };
    });
  }, [reports]);

  const activeKey = useMemo(() => getId(selectedReport), [selectedReport]);

  // Times and coolers for selected report
  const times = useMemo(() =>
    (selectedReport?.payload?.times || [
      "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
    ]).filter((t) => String(t).toLowerCase() !== "corrective action"),
  [selectedReport]);

  const coolers = useMemo(() => {
    const coolersRaw = (selectedReport?.payload?.coolers || []).map((c, idx) => ({
      ...c,
      __idx: idx,
      __name: String(c?.name || c?.label || `Cooler ${idx + 1}`),
    }));
    return coolersRaw.filter((c) => {
      const nm = c.__name.trim().toLowerCase().replace(/\s+/g, "");
      return nm !== "cooler9" && c.__idx !== 8;
    });
  }, [selectedReport]);

  // ===== Spectral table styles =====
  const gridStyle = { width: "100%", borderCollapse: "collapse", fontSize: 15, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 14px rgba(99,102,241,0.10)" };
  const theadRow = { background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" };
  const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "10px 8px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 800, background: "transparent", color: "#fff" };
  const tdCellCenter = { border: "1px solid #c7d2fe", padding: "9px 7px", textAlign: "center", verticalAlign: "middle", fontWeight: 600, color: "#2c3e50" };
  const tdCellLeft = { border: "1px solid #c7d2fe", padding: "9px 7px", textAlign: "left", verticalAlign: "middle" };

  return (
    <GlassShell
      icon="🌡️"
      title="Temperature Control — View (FTR1 Mushrif Park)"
      actions={
        <>
          <button onClick={() => handleDelete(selectedReport)} style={btn("#dc2626")} data-delete-action="true">Delete</button>
          <button onClick={handleExportPDF} style={btn("#27ae60")}>Export PDF</button>
          <button onClick={handleExportJSON} style={btn("#16a085")}>Export JSON</button>
          <button onClick={handleExportXLS} style={btn("#0ea5e9")}>Export XLS</button>
          <label style={{ ...btn("#059669"), display: "inline-block" }}>
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportJSON}
              style={{ display: "none" }}
            />
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
            {/* Meta badges */}
            <div style={{ marginBottom: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6 }}>
                <tbody>
                  <tr>
                    <td style={metaCell}><strong>Document Title:</strong> Temperature Control Record</td>
                    <td style={metaCell}><strong>Document No:</strong> FS-QM/REC/TMP</td>
                  </tr>
                  <tr>
                    <td style={metaCell}><strong>Issue Date:</strong> 05/02/2020</td>
                    <td style={metaCell}><strong>Revision No:</strong> 0</td>
                  </tr>
                  <tr>
                    <td style={metaCell}><strong>Area:</strong> QA</td>
                    <td style={metaCell}><strong>Issued by:</strong> MOHAMAD ABDULLAH</td>
                  </tr>
                  <tr>
                    <td style={metaCell}><strong>Controlling Officer:</strong> Quality Controller</td>
                    <td style={metaCell}><strong>Approved by:</strong> Hussam O. Sarhan</td>
                  </tr>
                </tbody>
              </table>

              {/* Title strip */}
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
                TEMPERATURE CONTROL CHECKLIST (CCP) — FTR1
              </div>
            </div>

            {/* Rules */}
            <div style={{
              border: "1px solid #c7d2fe",
              background: "rgba(255,255,255,0.6)",
              borderRadius: 10,
              padding: "8px 10px",
              fontSize: "0.92rem",
              marginBottom: 10,
            }}>
              <div>1. If the temp is +5°C or more / Check product temperature - corrective action should be taken.</div>
              <div>2. If the loading area is more than +16°C - corrective action should be taken.</div>
              <div>3. If the preparation area is more than +10°C - corrective action should be taken.</div>
              <div style={{ marginTop: 6 }}>
                <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
              </div>
            </div>

            {/* Table */}
            <table style={gridStyle}>
              <thead>
                <tr style={theadRow}>
                  <th style={thCell}>Cooler</th>
                  {times.map((t, i) => (
                    <th key={i} style={thCell}>{t}</th>
                  ))}
                  <th style={thCell}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {coolers.map((c, idx) => (
                  <tr key={idx} style={{ background: idx % 2 ? "rgba(237,233,254,0.45)" : "#fff" }}>
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

            {/* Signatures */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 700, flexWrap: "wrap", gap: 12 }}>
              <SignatureName label="Checked By" name={selectedReport?.payload?.checkedBy} align="start" />
              <SignatureName label="Verified By" name={selectedReport?.payload?.verifiedBy} align="end" />
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
