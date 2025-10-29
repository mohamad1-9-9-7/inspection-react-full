// src/pages/monitor/branches/qcs/DailyCleanlinessView.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== API base (نفس أسلوب مشروعك) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* نوع تقرير QCS للنظافة اليومية */
const TYPE = "qcs-clean";

/* ===== أدوات عرض بسيطة ===== */
const thStyle = { padding: "8px", border: "1px solid #ccc", textAlign: "center", fontSize: ".9rem" };
const tdStyle = { padding: "6px", border: "1px solid #ccc", textAlign: "left" };

const btnBase = {
  padding: "8px 14px",
  borderRadius: "6px",
  color: "#fff",
  fontWeight: 600,
  border: "none",
  cursor: "pointer",
};
const btnExport = { ...btnBase, background: "#27ae60" };
const btnJson   = { ...btnBase, background: "#16a085" };
const btnImport = { ...btnBase, background: "#f39c12" };
const btnDelete = { ...btnBase, background: "#c0392b" };

/* Defaults آمنة */
const DEFAULT_HEADER = {
  documentTitle: "QCS — Daily Cleanliness",
  documentNo: "FS-QM/REC/CLN",
  revisionNo: "01",
  issueDate: "",
  area: "QCS Warehouse",
  issuedBy: "QA Manager",
  approvedBy: "Food Safety Team Leader",
  controllingOfficer: "QC Team",
};
const DEFAULT_FOOTER = { checkedBy: "", verifiedBy: "" };

/* مساعد: أخذ المعرّف */
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

export default function DailyCleanlinessView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  /* ===== جلب التقارير (أقدم ← أحدث) ===== */
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json?.data ?? []);
      arr.sort((a,b) => new Date(a?.payload?.reportDate || 0) - new Date(b?.payload?.reportDate || 0));
      setReports(arr);
      setSelectedReport(arr[0] || null);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchReports(); }, []);

  /* ===== PDF ===== */
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const btns = reportRef.current.querySelector(".action-buttons");
    if (btns) btns.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 4,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    let w = pw;
    let h = (canvas.height * w) / canvas.width;
    if (h > ph) { h = ph; w = (canvas.width * h) / canvas.height; }
    pdf.addImage(img, "PNG", (pw - w) / 2, 20, w, h);
    const d = selectedReport?.payload?.reportDate || "report";
    pdf.save(`QCS_Cleanliness_${d}.pdf`);

    if (btns) btns.style.display = "flex";
  };

  /* ===== حذف ===== */
  const handleDelete = async (report) => {
    if (!window.confirm("⚠️ Delete this report?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${getId(report)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      alert("✅ Report deleted.");
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  };

  /* ===== تصدير JSON (كل التقارير) ===== */
  const handleExportJSON = () => {
    try {
      const payloads = reports.map(r => r?.payload ?? r);
      const out = {
        type: TYPE,
        exportedAt: new Date().toISOString(),
        count: payloads.length,
        items: payloads,
      };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QCS_Cleanliness_ALL_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to export JSON.");
    }
  };

  /* ===== استيراد JSON (رفع للسيرفر) ===== */
  const triggerImport = () => fileInputRef.current?.click();

  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const txt = await file.text();
      const json = JSON.parse(txt);

      const items =
        Array.isArray(json) ? json :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.data) ? json.data : [];

      if (!items.length) { alert("⚠️ ملف JSON لا يحتوي عناصر."); return; }

      let ok = 0, fail = 0;
      for (const it of items) {
        const payload = it?.payload ?? it;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: TYPE, payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (e2) {
      console.error(e2);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  /* ===== تجميع حسب سنة > شهر > يوم ===== */
  const grouped = reports.reduce((acc, r) => {
    const d = new Date(r?.payload?.reportDate);
    if (isNaN(d)) return acc;
    const Y = d.getFullYear();
    const M = String(d.getMonth()+1).padStart(2,"0");
    const D = String(d.getDate()).padStart(2,"0");
    if (!acc[Y]) acc[Y] = {};
    if (!acc[Y][M]) acc[Y][M] = [];
    acc[Y][M].push({ ...r, _dt: d.getTime(), _day: D });
    return acc;
  }, {});

  /* ===== استخراج الحقول بمرونة (header/footer/rows) ===== */
  const p = selectedReport?.payload || {};
  const hdr = p.header || p.headers?.dcHeader || DEFAULT_HEADER;
  const ftr = p.footer || p.headers?.dcFooter || DEFAULT_FOOTER;

  const rows = (() => {
    const raw =
      p.cleanlinessRows ||
      p.entries ||
      p.rows ||
      [];
    return Array.isArray(raw) ? raw : [];
  })();

  return (
    <div style={{ display: "flex", gap: "1rem" }}>
      {/* الشجرة الجانبية */}
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
        <h4 style={{ marginBottom: "1rem", color: "#6d28d9", textAlign: "center" }}>
          🗓️ Saved Reports
        </h4>

        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          Object.entries(grouped)
            .sort(([a],[b]) => Number(a) - Number(b))
            .map(([Y, months]) => (
              <details key={Y} open>
                <summary style={{ fontWeight: 700 }}>📅 Year {Y}</summary>
                {Object.entries(months)
                  .sort(([a],[b]) => Number(a) - Number(b))
                  .map(([M, days]) => {
                    const sorted = [...days].sort((x,y) => x._dt - y._dt);
                    return (
                      <details key={M} style={{ marginLeft: "1rem" }} open>
                        <summary style={{ fontWeight: 500 }}>📅 Month {M}</summary>
                        <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                          {sorted.map((r,i) => {
                            const active = selectedReport && getId(selectedReport) === getId(r);
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
                                  borderLeft: active ? "4px solid #4c1d95" : "4px solid transparent",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                                title={active ? "Currently open" : "Open report"}
                              >
                                <span>{`${r._day}/${M}/${Y}`}</span>
                                {active ? <span>✔️</span> : <span style={{ opacity: .5 }}>•</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    );
                  })}
              </details>
            ))
        )}
      </div>

      {/* مساحة العرض */}
      <div
        style={{
          flex: 1,
          background: "#fff",
          padding: "1.5rem",
          borderRadius: 14,
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <div ref={reportRef} style={{ paddingBottom: 100 }}>
            {/* العنوان وأزرار الإجراءات */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
              <h3 style={{ color:"#2980b9" }}>🧹 Report: {p.reportDate || ""}</h3>
              <div className="action-buttons" style={{ display:"flex", gap:".6rem" }}>
                <button onClick={handleExportPDF} style={btnExport}>⬇ Export PDF</button>
                <button onClick={handleExportJSON} style={btnJson}>⬇ Export JSON</button>
                <button onClick={triggerImport} style={btnImport}>⬆ Import JSON</button>
                <button onClick={() => handleDelete(selectedReport)} style={btnDelete}>🗑 Delete</button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display:"none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* شعار مبسّط */}
            <div style={{ textAlign:"right", marginBottom:"1rem" }}>
              <h2 style={{ margin:0, color:"darkred" }}>AL MAWASHI</h2>
              <div style={{ fontSize:".95rem", color:"#333" }}>Trans Emirates Livestock Trading L.L.C.</div>
            </div>

            {/* ترويسة المستند */}
            <table style={{ width:"100%", border:"1px solid #ccc", marginBottom:"1rem", fontSize:".9rem", borderCollapse:"collapse" }}>
              <tbody>
                <tr>
                  <td style={tdStyle}><b>Document Title:</b> {hdr.documentTitle || DEFAULT_HEADER.documentTitle}</td>
                  <td style={tdStyle}><b>Document No:</b> {hdr.documentNo || DEFAULT_HEADER.documentNo}</td>
                </tr>
                <tr>
                  <td style={tdStyle}><b>Issue Date:</b> {hdr.issueDate || DEFAULT_HEADER.issueDate}</td>
                  <td style={tdStyle}><b>Revision No:</b> {hdr.revisionNo || DEFAULT_HEADER.revisionNo}</td>
                </tr>
                <tr>
                  <td style={tdStyle}><b>Area:</b> {hdr.area || DEFAULT_HEADER.area}</td>
                  <td style={tdStyle}><b>Issued By:</b> {hdr.issuedBy || DEFAULT_HEADER.issuedBy}</td>
                </tr>
                <tr>
                  <td style={tdStyle}><b>Controlling Officer:</b> {hdr.controllingOfficer || DEFAULT_HEADER.controllingOfficer}</td>
                  <td style={tdStyle}><b>Approved By:</b> {hdr.approvedBy || DEFAULT_HEADER.approvedBy}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ textAlign:"center", background:"#e5e7eb", padding:"6px", marginBottom:"1rem" }}>
              TRANS EMIRATES LIVESTOCK MEAT TRADING LLC <br />
              CLEANING CHECKLIST – WAREHOUSE
            </h3>

            {/* جدول النظافة */}
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"#2980b9", color:"#fff" }}>
                  <th style={thStyle}>SI-No</th>
                  <th style={thStyle}>General Cleaning</th>
                  <th style={thStyle}>Observation (C / N / C)</th>
                  <th style={thStyle}>Informed to</th>
                  <th style={thStyle}>Remarks & CA</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((r, i) => {
                  const isSection = !!r?.isSection;
                  const letter = r?.letter || r?.secNo || r?.slNo || (i+1);
                  const general = r?.general || r?.section || r?.item || r?.itemEn || r?.itemAr || r?.groupEn || r?.groupAr || "";
                  const observation = r?.observation || r?.result || r?.status || "";
                  const informedTo = r?.informedTo || r?.informed || "";
                  const remarks = r?.remarks || "";
                  return (
                    <tr key={i} style={isSection ? { fontWeight:700, background:"#f8fafc" } : undefined}>
                      <td style={tdStyle}>{isSection ? "—" : letter}</td>
                      <td style={{ ...tdStyle, whiteSpace:"pre-wrap" }}>{general}</td>
                      <td style={tdStyle}>{isSection ? "—" : observation}</td>
                      <td style={tdStyle}>{isSection ? "—" : informedTo}</td>
                      <td style={{ ...tdStyle, whiteSpace:"pre-wrap" }}>{isSection ? "—" : remarks}</td>
                    </tr>
                  );
                }) : (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign:"center", color:"#6b7280" }}>No rows.</td></tr>
                )}
              </tbody>
            </table>

            {/* التذييل */}
            <div style={{ marginTop:"1.5rem", display:"flex", justifyContent:"space-between", fontWeight:600, padding:"0 1rem" }}>
              <span>Checked By: {ftr?.checkedBy || "—"}</span>
              <span>Verified By: {ftr?.verifiedBy || "—"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
