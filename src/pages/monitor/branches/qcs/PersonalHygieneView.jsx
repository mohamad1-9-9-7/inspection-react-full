// src/pages/monitor/branches/qcs/PersonalHygieneVIEW.jsx
import React, { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ===== API base (أسلوب موحّد) ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "qcs-ph";

/* ===== ستايل موحّد (نفس POS/QCS Viewer) ===== */
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

/* ===== Defaults آمنة ===== */
const DEFAULT_HEADER = {
  documentTitle: "Personal Hygiene Checklist",
  documentNo: "FS-QM/REC/PH",
  revisionNo: "0",
  issueDate: "05/02/2020",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH QC",
  approvedBy: "Hussam O. Sarhan",
  controllingOfficer: "Quality Controller",
};
const DEFAULT_FOOTER = { checkedBy: "", verifiedBy: "" };

/* ===== Helpers ===== */
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;

export default function PersonalHygieneVIEW() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  /* === Fetch (أقدم ← أحدث) === */
  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
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

  /* === Group Year > Month > Day (للشجرة) === */
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

  /* === استخراج الحقول بمرونة === */
  const p   = selectedReport?.payload || {};
  const hdr = p.header || p.headers?.phHeader || DEFAULT_HEADER;
  const ftr = p.footer || p.headers?.phFooter || DEFAULT_FOOTER;
  const rowsRaw = Array.isArray(p.personalHygiene) ? p.personalHygiene : (Array.isArray(p.rows) ? p.rows : []);
  const phRows  = rowsRaw.map(x => ({
    employeeName: x?.employeeName ?? x?.employName ?? "",
    nails: x?.nails ?? "",
    hair: x?.hair ?? "",
    notWearingJewelries: x?.notWearingJewelries ?? x?.noJewelry ?? "",
    wearingCleanCloth: x?.wearingCleanCloth ?? x?.cleanClothes ?? "",
    communicableDisease: x?.communicableDisease ?? "",
    openWounds: x?.openWounds ?? "",
    remarks: x?.remarks ?? "",
  }));

  /* === Actions === */
  const handleDelete = async (report) => {
    if (!report) return;
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
      a.download = `QCS_PersonalHygiene_ALL_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to export JSON.");
    }
  };

  const triggerImport = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const txt = await file.text();
      const data = JSON.parse(txt);
      const items =
        Array.isArray(data) ? data :
        Array.isArray(data?.items) ? data.items :
        Array.isArray(data?.data) ? data.data : [];
      if (!items.length) { alert("⚠️ JSON file has no items."); return; }
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

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const btns = reportRef.current.querySelector(".action-buttons");
    if (btns) btns.style.display = "none";

    const canvas = await html2canvas(reportRef.current, {
      scale: 3,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape","pt","a4");
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const iw = W;
    const ih = (canvas.height * iw) / canvas.width;

    let pos = 0, left = ih;
    pdf.addImage(img, "PNG", 0, pos, iw, ih);
    left -= H;
    while (left > 0) {
      pos -= H;
      pdf.addPage();
      pdf.addImage(img, "PNG", 0, pos, iw, ih);
      left -= H;
    }
    const d = p.reportDate || "report";
    pdf.save(`QCS_PersonalHygiene_${d}.pdf`);

    if (btns) btns.style.display = "flex";
  };

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
              <h3 style={{ color:"#2980b9" }}>🧼 Personal Hygiene — {p.reportDate || ""}</h3>
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
              TRANS EMIRATES LIVESTOCK MEAT TRADING LLC — AL QUSAIS <br />
              PERSONAL HYGIENE CHECKLIST
            </h3>

            {/* جدول النظافة الشخصية */}
            <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"center", border:"1px solid #000", tableLayout:"fixed", wordBreak:"break-word" }}>
              <thead>
                <tr style={{ background:"#d9d9d9", color:"#000" }}>
                  {[
                    "S. No",
                    "Employee Name",
                    "Nails",
                    "Hair",
                    "No jewelry",
                    "Wearing clean clothes / hair net / gloves / face mask / shoes",
                    "Communicable disease(s)",
                    "Open wounds / sores / cuts",
                    "Remarks & Corrective Actions",
                  ].map((h,i)=>(<th key={i} style={thStyle}>{h}</th>))}
                </tr>
              </thead>
              <tbody>
                {phRows.length ? phRows.map((emp, i) => (
                  <tr key={i}>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{i+1}</td>
                    <td style={tdStyle}>{emp.employeeName}</td>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{emp.nails}</td>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{emp.hair}</td>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{emp.notWearingJewelries}</td>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{emp.wearingCleanCloth}</td>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{emp.communicableDisease}</td>
                    <td style={{ ...tdStyle, textAlign:"center" }}>{emp.openWounds}</td>
                    <td style={{ ...tdStyle, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>{emp.remarks}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={9} style={{ ...tdStyle, textAlign:"center", color:"#6b7280" }}>No rows.</td></tr>
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
