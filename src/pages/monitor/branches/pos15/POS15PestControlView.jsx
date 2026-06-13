// src/pages/monitor/branches/pos15/POS15PestControlView.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SignatureName from "../../../shared/SignatureName";
import API_BASE from "../../../../config/api";
import {
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE = "pos15_pest_control";

const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

const getDate = (r) => {
  const d = (r?.payload?.reportDate && new Date(r.payload.reportDate)) || (r?.created_at && new Date(r.created_at)) || new Date(NaN);
  return d;
};
const isPos15 = (r) => String(r?.payload?.branch || r?.branch || "").trim().toLowerCase() === "pos 15";

function normYMD(s) {
  const str = String(s || "").trim();
  if (!str) return null;
  const iso = /^\d{4}-\d{2}$/.test(str) ? `${str}-01` : str;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return { y, m, d: dd, iso: `${y}-${m}-${dd}` };
}

const theadRow = { background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" };
const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "8px", textAlign: "center", fontWeight: 800, background: "transparent", color: "#fff" };
const tdCell = { border: "1px solid #c7d2fe", padding: "8px", textAlign: "center", verticalAlign: "middle" };
const tdCellLeft = { border: "1px solid #c7d2fe", padding: "8px", textAlign: "left", verticalAlign: "middle" };

export default function POS15PestControlView() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const [preview, setPreview] = useState({ open: false, src: "", title: "", idx: -1 });
  const openPreview = (src, title, idx) => setPreview({ open: true, src, title, idx });
  const closePreview = () => setPreview((p) => ({ ...p, open: false }));

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      let arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.items) ? json.items : [];
      arr = arr.filter(isPos15).filter((r) => !isNaN(getDate(r))).sort((a, b) => getDate(b) - getDate(a));
      setReports(arr);
      setSelected(arr[0] || null);
    } catch (e) { console.error(e); alert("⚠️ Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchReports(); }, []);

  const treeItems = useMemo(() =>
    reports.map(r => {
      const d = getDate(r);
      if (isNaN(d)) return null;
      const iso = d.toISOString().slice(0, 10);
      const n = normYMD(iso);
      const id = getId(r) || iso;
      return { key: id, dateISO: iso, label: n ? formatDMY(n.iso) : iso, data: r };
    }).filter(Boolean),
  [reports]);

  const selectedId = getId(selected);
  const activeKey = selectedId || "";

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2, windowWidth: reportRef.current.scrollWidth, windowHeight: reportRef.current.scrollHeight });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(16); pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI — POS 15 Pest Control Log", pageWidth / 2, 28, { align: "center" });
    const imgWidth = pageWidth - 40; let imgHeight = (canvas.height * imgWidth) / canvas.width;
    const x = 20; const y = 44;
    if (imgHeight > pageHeight - y - 20) imgHeight = pageHeight - y - 20;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    const fileDate = selected?.payload?.reportDate || getDate(selected)?.toISOString()?.slice(0, 10) || "report";
    pdf.save(`POS15_PestControl_${fileDate}.pdf`);
  };

  const downloadBase64 = (dataUrl, filename = "image.png") => {
    try { const a = document.createElement("a"); a.href = dataUrl; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); }
    catch (e) { console.error(e); alert("❌ Failed to download image."); }
  };

  async function handleDelete(report) {
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("⚠️ Delete this record?")) return;
    const id = getId(report); if (!id) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      alert("✅ Deleted."); await fetchReports();
    } catch (e) { console.error(e); alert("❌ Failed to delete."); }
  }

  const handleExportJSON = () => {
    try {
      const items = reports.map((r) => r?.payload ?? r);
      const bundle = { type: TYPE, branch: "POS 15", exportedAt: new Date().toISOString(), count: items.length, items };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-"); a.href = url;
      a.download = `POS15_PestControl_ALL_${ts}.json`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { console.error(e); alert("❌ Export failed."); }
  };

  const triggerImport = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setLoading(true); const text = await file.text(); const json = JSON.parse(text);
      const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : Array.isArray(json?.data) ? json.data : [];
      if (!items.length) { alert("⚠️ ملف JSON لا يحتوي عناصر قابلة للاستيراد."); return; }
      let ok = 0, fail = 0;
      for (const item of items) {
        const payload = item?.payload ?? item; if (!payload || typeof payload !== "object") { fail++; continue; }
        try { const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: TYPE, payload }) }); if (res.ok) ok++; else fail++; }
        catch { fail++; }
      }
      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`); await fetchReports();
    } catch (e) { console.error(e); alert("❌ Invalid JSON file."); }
    finally { setLoading(false); if (e?.target) e.target.value = ""; }
  };

  const metaBadge = { display: "inline-block", background: "rgba(255,255,255,0.6)", border: "1px solid #c7d2fe", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#0b1f4d", marginRight: 8, marginBottom: 6 };

  return (
    <>
      <GlassShell
        icon="🪲"
        title="Pest Control Visit Log — View (POS 15)"
        actions={
          <>
            <button onClick={fetchReports} style={btn("#7c3aed")}>Refresh</button>
            <button onClick={handleExportPDF} disabled={!selected} style={btn("#374151")}>Export PDF</button>
            <button onClick={handleExportJSON} style={btn("#0284c7")}>Export JSON (all)</button>
            <button onClick={triggerImport} style={btn("#059669")}>Import JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJSON} />
            <button onClick={() => selected && handleDelete(selected)} disabled={!selected} style={btn("#dc2626")} data-delete-action="true">Delete</button>
          </>
        }
      >
        <SidebarLayout
          sidebarWidth={280}
          sidebar={
            <DateTreeSidebar
              items={treeItems}
              activeKey={activeKey}
              onPick={(it) => setSelected(it.data)}
              loading={loading && !reports.length}
            />
          }
        >
          {loading && <p>Loading…</p>}
          {!loading && !selected && <EmptyState text="No report selected." />}

          {selected && (
            <div>
              <div ref={reportRef}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  <span style={metaBadge}><strong>Document Title:</strong> Pest Control Visit Log</span>
                  <span style={metaBadge}><strong>Document No:</strong> FS-QM/REC/PC</span>
                  <span style={metaBadge}><strong>Issue Date:</strong> 05/02/2020</span>
                  <span style={metaBadge}><strong>Revision No:</strong> 0</span>
                  <span style={metaBadge}><strong>Area:</strong> POS 15</span>
                  <span style={metaBadge}><strong>Service Provider:</strong> {selected?.payload?.serviceProvider || "—"}</span>
                  <span style={metaBadge}><strong>Visit Type:</strong> {selected?.payload?.visitType || "—"}</span>
                  <span style={metaBadge}><strong>Date:</strong> {selected?.payload?.reportDate || "—"}</span>
                </div>

                <div style={{ textAlign: "center", background: "linear-gradient(90deg,#ede9fe,#e0f2fe,#d1fae5)", border: "1px solid #c7d2fe", borderRadius: 10, padding: "9px 6px", fontWeight: 800, fontSize: 16, color: "#0b1f4d", marginBottom: 10 }}>
                  🪲 PEST CONTROL — SIGHTINGS (POS 15)
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 20, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 14px rgba(99,102,241,0.10)" }}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={{ ...thCell, width: 70 }}>S.No</th>
                      <th style={thCell}>Location</th>
                      <th style={thCell}>Photo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected?.payload?.sightings?.map((row, idx) => {
                      const filename = `POS15_Pest_${selected?.payload?.reportDate || "date"}_${idx + 1}.png`;
                      return (
                        <tr key={idx} style={{ background: idx % 2 ? "rgba(237,233,254,0.45)" : "#fff" }}>
                          <td style={tdCell}>{idx + 1}</td>
                          <td style={tdCellLeft}>{row.location || "—"}</td>
                          <td style={tdCell}>
                            {row.photoBase64 ? (
                              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                                <img src={row.photoBase64} alt={`sighting-${idx + 1}`} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid #c7d2fe", cursor: "zoom-in" }} onClick={() => openPreview(row.photoBase64, `Sighting #${idx + 1} — ${row.location || ""}`, idx)} title="Click to preview" />
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button type="button" style={btnMini} onClick={() => openPreview(row.photoBase64, `Sighting #${idx + 1} — ${row.location || ""}`, idx)}>🔍 Preview</button>
                                  <button type="button" style={btnMini} onClick={() => downloadBase64(row.photoBase64, filename)}>⬇ Download</button>
                                </div>
                              </div>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {(!selected?.payload?.sightings?.length) && (
                      <tr><td colSpan={3} style={{ ...tdCell, textAlign: "center", color: "#64748b", fontWeight: 800 }}>No sightings recorded</td></tr>
                    )}
                  </tbody>
                </table>

                <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                  <SignatureName label="Checked By" name={selected?.payload?.checkedBy} align="start" />
                  <SignatureName label="Verified By" name={selected?.payload?.verifiedBy} align="end" />
                </div>
              </div>
            </div>
          )}
        </SidebarLayout>
      </GlassShell>

      {/* Lightbox Modal */}
      {preview.open && (
        <div style={lightboxOverlay} onClick={closePreview}>
          <div style={lightboxBox} onClick={(e) => e.stopPropagation()}>
            <div style={lightboxHeader}>
              <strong style={{ color: "#111827" }}>{preview.title || "Preview"}</strong>
              <button onClick={closePreview} style={btnClose}>✖</button>
            </div>
            <div style={lightboxBody}>
              <img src={preview.src} alt="preview" style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8, border: "1px solid #c7d2fe" }} />
            </div>
            <div style={lightboxFooter}>
              <button style={btn("#2563eb")} onClick={() => downloadBase64(preview.src, `POS15_Pest_Image_${(selected?.payload?.reportDate || "date")}_${(preview.idx ?? 0) + 1}.png`)}>⬇ Download</button>
              <button style={btn("#6b7280")} onClick={closePreview}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const btnMini = { padding: "4px 8px", borderRadius: 6, background: "#e5e7eb", color: "#111827", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 12 };
const lightboxOverlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000 };
const lightboxBox = { background: "#fff", borderRadius: 12, padding: 12, minWidth: 320, maxWidth: "92vw", boxShadow: "0 16px 36px rgba(0,0,0,0.35)" };
const lightboxHeader = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 };
const lightboxBody = { display: "flex", alignItems: "center", justifyContent: "center", padding: 8 };
const lightboxFooter = { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 };
const btnClose = { padding: "4px 8px", borderRadius: 6, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700 };
