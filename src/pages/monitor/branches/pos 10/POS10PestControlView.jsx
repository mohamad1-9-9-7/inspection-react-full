// src/pages/monitor/branches/pos 10/POS10PestControlView.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function POS10PestControlView() {
  const TYPE = "pos10_pest_control";
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  // ⬇️ حالة معاينة الصور (Lightbox)
  const [preview, setPreview] = useState({
    open: false,
    src: "",
    title: "",
    idx: -1,
  });

  const openPreview = (src, title, idx) => setPreview({ open: true, src, title, idx });
  const closePreview = () => setPreview((p) => ({ ...p, open: false }));

  // Helpers
  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
  const askPass = (label = "") =>
    (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  const getDate = (r) => {
    const d =
      (r?.payload?.reportDate && new Date(r.payload.reportDate)) ||
      (r?.created_at && new Date(r.created_at)) ||
      new Date(NaN);
    return d;
  };

  const isPos10 = (r) =>
    String(r?.payload?.branch || r?.branch || "")
      .trim()
      .toLowerCase() === "pos 10";

  // Fetch
  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error("fetch failed");
      const json = await res.json();
      let arr =
        Array.isArray(json) ? json :
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.rows) ? json.rows : [];

      // فقط POS 10
      arr = arr.filter(isPos10);

      // الأحدث أولًا
      arr = arr
        .filter((r) => !isNaN(getDate(r)))
        .sort((a, b) => getDate(b) - getDate(a));

      setReports(arr);
      setSelected(arr[0] || null);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  // Group (Year → Month → Days) — أحدث أولاً
  const grouped = useMemo(() => {
    const acc = {};
    for (const r of reports) {
      const d = getDate(r);
      if (isNaN(d)) continue;
      const y = String(d.getFullYear());
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const ts = d.getTime();
      acc[y] ||= {};
      acc[y][m] ||= [];
      acc[y][m].push({ ...r, _ts: ts, _label: `${day}/${m}/${y}` });
    }
    for (const y of Object.keys(acc)) {
      for (const m of Object.keys(acc[y])) {
        acc[y][m].sort((a, b) => b._ts - a._ts);
      }
    }
    return acc;
  }, [reports]);

  // PDF
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4"); // Portrait
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // عنوان أعلى الصفحة
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI — POS 10 Pest Control Log", pageWidth / 2, 28, { align: "center" });

    const imgWidth = pageWidth - 40;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;
    const x = 20;
    const y = 44;

    if (imgHeight > pageHeight - y - 20) {
      imgHeight = pageHeight - y - 20;
    }
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);

    const fileDate =
      selected?.payload?.reportDate ||
      getDate(selected)?.toISOString()?.slice(0, 10) ||
      "report";
    pdf.save(`POS10_PestControl_${fileDate}.pdf`);
  };

  // تنزيل Base64 كملف
  const downloadBase64 = (dataUrl, filename = "image.png") => {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to download image.");
    }
  };

  // Delete (مع كلمة سر 9999)
  async function handleDelete(report) {
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("⚠️ Delete this record?")) return;
    const id = getId(report);
    if (!id) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      alert("✅ Deleted.");
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to delete.");
    }
  }

  // Export JSON (كل تقارير POS 10 فقط)
  const handleExportJSON = () => {
    try {
      const items = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: TYPE,
        branch: "POS 10",
        exportedAt: new Date().toISOString(),
        count: items.length,
        items,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `POS10_PestControl_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("❌ Export failed.");
    }
  };

  // Import JSON (رفع وإنشاء على السيرفر)
  const triggerImport = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);
      const items =
        Array.isArray(json) ? json :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.data) ? json.data : [];

      if (!items.length) {
        alert("⚠️ ملف JSON لا يحتوي عناصر قابلة للاستيراد.");
        return;
      }

      let ok = 0, fail = 0;
      for (const item of items) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: TYPE, payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch {
          fail++;
        }
      }

      alert(`✅ Imported: ${ok} ${fail ? `| ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

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
        <h4 style={{ marginBottom: 12, color: "#6d28d9", textAlign: "center" }}>🗓️ Saved Reports (POS 10)</h4>
        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(grouped).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.keys(grouped)
              .sort((a, b) => Number(b) - Number(a)) // Years desc
              .map((y) => (
                <details key={y} open>
                  <summary style={{ fontWeight: "bold", marginBottom: 6 }}>📅 Year {y}</summary>

                  {Object.keys(grouped[y])
                    .sort((a, b) => Number(b) - Number(a)) // Months desc
                    .map((m) => {
                      const arr = grouped[y][m];
                      return (
                        <details key={m} style={{ marginLeft: "1rem" }}>
                          <summary style={{ fontWeight: 600 }}>
                            📅 Month {m} <span style={{ color: "#6b7280" }}>({arr.length})</span>
                          </summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {arr.map((r, i) => {
                              const active = getId(selected) && getId(selected) === getId(r);
                              return (
                                <li
                                  key={i}
                                  onClick={() => setSelected(r)}
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

      {/* Report viewer */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)",
          padding: "1.5rem",
          borderRadius: 14,
          boxShadow: "0 4px 18px #d2b4de44",
        }}
      >
        {!selected ? (
          <p>❌ No report selected.</p>
        ) : (
          <>
            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <button onClick={handleExportPDF} style={btn("#27ae60")}>⬇ Export PDF</button>
              <button onClick={handleExportJSON} style={btn("#16a085")}>⬇ Export JSON</button>
              <button onClick={triggerImport} style={btn("#f39c12")}>⬆ Import JSON</button>
              <button onClick={() => handleDelete(selected)} style={btn("#c0392b")}>🗑 Delete</button>

              {/* hidden input for import */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* Content to export */}
            <div ref={reportRef}>
              {/* Header table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: "0.9rem", border: "1px solid #9aa4ae", background: "#f8fbff" }}>
                <tbody>
                  <tr>
                    <td rowSpan={4} style={{ border: "1px solid #9aa4ae", padding: "8px", width: 120, textAlign: "center" }}>
                      <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                        AL<br/>MAWASHI
                      </div>
                    </td>
                    <td style={tdHeader}><b>Document Title:</b> Pest Control Visit Log</td>
                    <td style={tdHeader}><b>Document No:</b> FS-QM/REC/PC</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
                    <td style={tdHeader}><b>Revision No:</b> 0</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Area:</b> POS 10</td>
                    <td style={tdHeader}><b>Service Provider:</b> {selected?.payload?.serviceProvider || "—"}</td>
                  </tr>
                  <tr>
                    <td style={tdHeader}><b>Visit Type:</b> {selected?.payload?.visitType || "—"}</td>
                    <td style={tdHeader}><b>Date:</b> {selected?.payload?.reportDate || "—"}</td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: "center", background: "#dde3e9", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none", marginBottom: 8 }}>
                PEST CONTROL — SIGHTINGS (POS 10)
              </div>

              {/* Grid table */}
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #9aa4ae" }}>
                <thead>
                  <tr>
                    <th style={thCell}>S.No</th>
                    <th style={thCell}>Location</th>
                    <th style={thCell}>Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {selected?.payload?.sightings?.map((row, idx) => {
                    const filename = `POS10_Pest_${selected?.payload?.reportDate || "date"}_${idx + 1}.png`;
                    return (
                      <tr key={idx}>
                        <td style={tdCellCenter}>{idx + 1}</td>
                        <td style={tdCellLeft}>{row.location || "—"}</td>
                        <td style={tdCellCenter}>
                          {row.photoBase64 ? (
                            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                              {/* المصغّر قابل للنقر لفتح المعاينة */}
                              <img
                                src={row.photoBase64}
                                alt={`sighting-${idx + 1}`}
                                style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 6, border: "1px solid #d1d5db", cursor: "zoom-in" }}
                                onClick={() => openPreview(row.photoBase64, `Sighting #${idx + 1} — ${row.location || ""}`, idx)}
                                title="Click to preview"
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  style={btnMini}
                                  onClick={() => openPreview(row.photoBase64, `Sighting #${idx + 1} — ${row.location || ""}`, idx)}
                                  title="Preview"
                                >
                                  🔍 Preview
                                </button>
                                <button
                                  type="button"
                                  style={btnMini}
                                  onClick={() => downloadBase64(row.photoBase64, filename)}
                                  title="Download"
                                >
                                  ⬇ Download
                                </button>
                              </div>
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Sign-off */}
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                <div>Checked By: {selected?.payload?.checkedBy || "—"}</div>
                <div>Verified By: {selected?.payload?.verifiedBy || "—"}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Lightbox Modal للصور */}
      {preview.open && (
        <div style={lightboxOverlay} onClick={closePreview}>
          <div style={lightboxBox} onClick={(e) => e.stopPropagation()}>
            <div style={lightboxHeader}>
              <strong style={{ color: "#111827" }}>{preview.title || "Preview"}</strong>
              <button onClick={closePreview} style={btnClose}>✖</button>
            </div>
            <div style={lightboxBody}>
              <img
                src={preview.src}
                alt="preview"
                style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain", borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>
            <div style={lightboxFooter}>
              <button
                style={btn("#2563eb")}
                onClick={() =>
                  downloadBase64(
                    preview.src,
                    `POS10_Pest_Image_${(selected?.payload?.reportDate || "date")}_${(preview.idx ?? 0) + 1}.png`
                  )
                }
              >
                ⬇ Download
              </button>
              <button style={btn("#6b7280")} onClick={closePreview}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Styles ===== */
const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
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

const btnMini = {
  padding: "4px 8px",
  borderRadius: 6,
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 12,
};

/* Lightbox styles */
const lightboxOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
};

const lightboxBox = {
  background: "#fff",
  borderRadius: 12,
  padding: 12,
  minWidth: 320,
  maxWidth: "92vw",
  boxShadow: "0 16px 36px rgba(0,0,0,0.35)",
};

const lightboxHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
};

const lightboxBody = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 8,
};

const lightboxFooter = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  marginTop: 8,
};

const btnClose = {
  padding: "4px 8px",
  borderRadius: 6,
  background: "#ef4444",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
};
