// src/pages/monitor/branches/ftr1/FTR1ReceivingLogView.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ================== Columns (بدون عمود الصور) ================== */
const COLS = [
  { key: "supplier", label: "Name of the Supplier", align: "left" },
  { key: "foodItem", label: "Food Item", align: "left" },
  { key: "dmApprovalNo", label: "DM approval number of the delivery vehicle", align: "left" },
  { key: "vehicleTemp", label: "Vehicle Temp (°C)", align: "center" },
  { key: "foodTemp", label: "Food Temp (°C)", align: "center" },
  { key: "vehicleClean", label: "Vehicle clean", align: "center" },
  { key: "handlerHygiene", label: "Food handler hygiene", align: "center" },
  { key: "appearanceOK", label: "Appearance", align: "center" },
  { key: "smellOK", label: "Smell", align: "center" },
  {
    key: "packagingGood",
    label: "Packaging of food is good and undamaged, clean and no signs of pest infestation",
    align: "left",
  },
  { key: "countryOfOrigin", label: "Country of origin", align: "center" },
  { key: "productionDate", label: "Production Date", align: "center" },
  { key: "expiryDate", label: "Expiry Date", align: "center" },
  { key: "remarks", label: "Remarks (if any)", align: "left" },
  { key: "receivedBy", label: "Received by", align: "center" },
];

/* أبعاد الأعمدة الأساسية (قبل التحجيم) — لا صور */
const COL_WIDTHS_PX = [
  64, 160, 140, 240, 110, 110, 130, 160, 130, 110, 300, 140, 140, 140, 260, 160,
];
const TABLE_BASE_WIDTH = COL_WIDTHS_PX.reduce((a, b) => a + b, 0);
const MIN_SCALE = 0.75; // حد أدنى للتحجيم

export default function FTR1ReceivingLogView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // ===== Auto-Scale (بدون تمرير أفقي) =====
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(0);
  const [measureReady, setMeasureReady] = useState(false);

  const viewportRef = useRef(null);
  const scaleBoxRef = useRef(null);
  const reportRef = useRef(null);
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);

  // ===== Edit mode =====
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  // ===== Preview للصور =====
  const [preview, setPreview] = useState({ open: false, images: [], index: 0 });
  const openPreview = useCallback((images, index = 0) => {
    const imgs = (images || []).filter(Boolean);
    if (!imgs.length) return;
    setPreview({ open: true, images: imgs, index });
  }, []);
  const closePreview = useCallback(() => setPreview((p) => ({ ...p, open: false })), []);
  const prevImage = useCallback(
    () => setPreview((p) => ({ ...p, index: (p.index - 1 + p.images.length) % p.images.length })),
    []
  );
  const nextImage = useCallback(
    () => setPreview((p) => ({ ...p, index: (p.index + 1) % p.images.length })),
    []
  );
  useEffect(() => {
    const onKey = (e) => {
      if (!preview.open) return;
      if (e.key === "Escape") closePreview();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview.open, closePreview, prevImage, nextImage]);

  // ===== قياس الارتفاع/العرض وتطبيق التحجيم =====
  useLayoutEffect(() => {
    let raf1, raf2;
    const measureAndScale = () => {
      const vp = viewportRef.current;
      const box = scaleBoxRef.current;
      if (!vp || !box) return;

      const inner = box.firstChild;
      const naturalHeight = inner ? inner.scrollHeight : 0;
      if (naturalHeight > 0) {
        setContentH(naturalHeight);
        setMeasureReady(true);
      }

      const available = Math.max(0, vp.clientWidth - 2);
      const s = Math.min(1, Math.max(MIN_SCALE, available / TABLE_BASE_WIDTH));
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measureAndScale);
    });

    const ro = new ResizeObserver(measureAndScale);
    ro.observe(document.body);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (scaleBoxRef.current?.firstChild) ro.observe(scaleBoxRef.current.firstChild);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [selectedReport, isEditing]);

  // ===== Fetch =====
  const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
  const getReportDate = (r) => {
    const d1 = new Date(r?.payload?.reportDate);
    if (!isNaN(d1)) return d1;
    const d2 = new Date(r?.created_at || r?.createdAt);
    return isNaN(d2) ? new Date(0) : d2;
  };

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=ftr1_receiving_log_butchery`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a, b) => getReportDate(a) - getReportDate(b));
      setReports(arr);
      setSelectedReport(arr[0] || null);
      setIsEditing(false);
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  // ===== Export PDF (نوقف التحجيم مؤقتًا) =====
  const handleExportPDF = async () => {
    if (!reportRef.current || !scaleBoxRef.current) return;
    const box = scaleBoxRef.current;
    const prev = {
      transform: box.style.transform,
      position: box.style.position,
      left: box.style.left,
      top: box.style.top,
      width: box.style.width,
      height: box.style.height,
    };

    box.style.transform = "none";
    box.style.position = "static";
    box.style.width = "auto";
    box.style.height = "auto";

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    box.style.transform = prev.transform;
    box.style.position = prev.position;
    box.style.left = prev.left;
    box.style.top = prev.top;
    box.style.width = prev.width;
    box.style.height = prev.height;

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI", pageWidth / 2, 30, { align: "center" });
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight);
    const dt = selectedReport?.payload?.reportDate || "report";
    pdf.save(`FTR1_Receiving_Log_${dt}.pdf`);
  };

  // ===== Delete =====
  const handleDelete = async (report) => {
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      alert("✅ Report deleted successfully.");
      fetchReports();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    }
  };

  // ===== Edit / Save =====
  const startEdit = () => {
    setDraft(structuredClone(selectedReport?.payload || {}));
    setIsEditing(true);
  };
  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(null);
  };
  const saveEdit = async () => {
    if (!draft) return;
    const rid = getId(selectedReport);
    try {
      const body = { type: "ftr1_receiving_log_butchery", payload: draft };
      let ok = false;
      const put = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      ok = put.ok;
      if (!ok) {
        const post = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (post.ok) {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
          ok = true;
        }
      }
      if (!ok) throw new Error("Save failed");
      alert("✅ Saved successfully.");
      setIsEditing(false);
      setDraft(null);
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save changes.");
    }
  };

  const updateDraftEntry = (rowIdx, key, value) => {
    setDraft((d) => {
      const entries = Array.isArray(d?.entries) ? [...d.entries] : [];
      const row = { ...(entries[rowIdx] || {}) };
      row[key] = value;
      entries[rowIdx] = row;
      return { ...d, entries };
    });
  };

  // ===== Export/Import JSON =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "ftr1_receiving_log_butchery",
        exportedAt: new Date().toISOString(),
        count: payloads.length,
        items: payloads,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `FTR1_Receiving_Log_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to export JSON.");
    }
  };

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
      if (!itemsRaw.length) { alert("⚠️ JSON file has no importable items."); return; }
      let ok = 0, fail = 0;
      for (const item of itemsRaw) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "ftr1_receiving_log_butchery", payload }),
          });
          if (res.ok) ok++; else fail++;
        } catch { fail++; }
      }
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // ===== Grouping =====
  const groupedReports = useMemo(() => {
    return reports.reduce((acc, r) => {
      const date = getReportDate(r);
      if (isNaN(date)) return acc;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      if (!acc[y]) acc[y] = {};
      if (!acc[y][m]) acc[y][m] = [];
      acc[y][m].push({ ...r, day: d, _dt: date.getTime() });
      return acc;
    }, {});
  }, [reports]);

  /* ================== Styles ================== */
  const shell = { display: "flex", gap: "1rem" };
  const sidebar = {
    minWidth: 260,
    background: "#fbfbfc",
    padding: "1rem",
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    border: "1px solid #eef0f4",
    height: "fit-content",
  };
  const main = {
    flex: 1,
    background: "linear-gradient(120deg, #f7f9fc 60%, #efe7f9 100%)",
    padding: "1.25rem",
    borderRadius: 14,
    boxShadow: "0 6px 22px rgba(95,61,196,0.12)",
    border: "1px solid #ececf5",
    overflowX: "hidden",
  };
  const headerCell = {
    border: "1px solid #d7dbe7",
    padding: "8px 10px",
    fontSize: "0.95rem",
    background: "#f4f6fb",
  };
  const baseCell = {
    padding: "8px 10px",
    border: "1px solid #e1e5ee",
    verticalAlign: "middle",
    fontSize: "0.94rem",
    lineHeight: 1.35,
    wordBreak: "break-word",
    whiteSpace: "normal",
  };
  const thStyle = {
    ...baseCell,
    background: "#2345a5",
    color: "#fff",
    fontWeight: 700,
    borderColor: "#1f3b70",
    position: "sticky",
    top: 0,
    zIndex: 1,
    textAlign: "center",
  };

  // ===== Render helpers =====
  const renderValue = (val, key) => {
    if (!val && val !== 0) return "—";
    if (key === "productionDate" || key === "expiryDate") {
      try { const d = new Date(val); if (!isNaN(d)) return d.toLocaleDateString("en-CA"); } catch {}
    }
    return String(val);
  };

  // مصادر الصور من مفاتيح مختلفة
  const getRowImages = (row) => {
    const raw =
      row?.images ||
      row?.photos ||
      row?.Photos ||
      row?.photosBase64 ||
      row?.imagesBase64 ||
      [];
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.filter(Boolean);
  };

  const viewBtnStyle = {
    marginLeft: 8,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #94a3b8",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: "0.8rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const EditableCell = ({ value, onChange, type = "text", align = "center" }) => {
    const base = {
      width: "100%",
      boxSizing: "border-box",
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #cfd6e6",
      fontSize: "0.92rem",
      textAlign: align,
      background: "#fff",
    };
    if (type === "date") {
      return (
        <input
          type="date"
          value={value ? new Date(value).toISOString().slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value)}
          style={base}
        />
      );
    }
    return (
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={base}
      />
    );
  };

  return (
    <div style={shell}>
      {/* Sidebar */}
      <div style={sidebar}>
        <h4 style={{ marginBottom: "1rem", color: "#5b21b6", textAlign: "center" }}>
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
                  <summary style={{ fontWeight: 700, marginBottom: 6 }}>
                    📅 Year {year}
                  </summary>
                  {Object.entries(months)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([month, days]) => {
                      const ddays = [...days].sort((a, b) => a._dt - b._dt);
                      return (
                        <details key={month} style={{ marginLeft: "1rem" }}>
                          <summary style={{ fontWeight: 600 }}>📅 Month {month}</summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {ddays.map((r, i) => {
                              const isActive = getId(selectedReport) && getId(selectedReport) === getId(r);
                              const d = getReportDate(r);
                              const label = `${String(d.getDate()).padStart(2, "0")}/${String(
                                d.getMonth() + 1
                              ).padStart(2, "0")}/${d.getFullYear()}`;
                              return (
                                <li
                                  key={i}
                                  onClick={() => setSelectedReport(r)}
                                  style={{
                                    padding: "6px 10px",
                                    marginBottom: 4,
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    background: isActive ? "#5b21b6" : "#eef1f7",
                                    color: isActive ? "#fff" : "#263042",
                                    fontWeight: 700,
                                    textAlign: "center",
                                  }}
                                >
                                  {label}
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

      {/* Main / Report */}
      <div style={main}>
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <>
            {/* Actions */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {!isEditing ? (
                <>
                  <button onClick={startEdit} style={{ padding: "8px 14px", borderRadius: 8, background: "#2563eb", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    ✏ Edit
                  </button>
                  <button onClick={handleExportPDF} style={{ padding: "8px 14px", borderRadius: 8, background: "#10b981", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    ⬇ Export PDF
                  </button>
                  <button onClick={handleExportJSON} style={{ padding: "8px 14px", borderRadius: 8, background: "#059669", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    ⬇ Export JSON
                  </button>
                  <button onClick={triggerImport} style={{ padding: "8px 14px", borderRadius: 8, background: "#f59e0b", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    ⬆ Import JSON
                  </button>
                  <button onClick={() => handleDelete(selectedReport)} style={{ padding: "8px 14px", borderRadius: 8, background: "#ef4444", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    🗑 Delete
                  </button>
                </>
              ) : (
                <>
                  <button onClick={saveEdit} style={{ padding: "8px 14px", borderRadius: 8, background: "#16a34a", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>
                    💾 Save
                  </button>
                  <button onClick={cancelEdit} style={{ padding: "8px 14px", borderRadius: 8, background: "#6b7280", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    ↩ Cancel
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* ====== Auto-Scale container ====== */}
            <div
              ref={viewportRef}
              style={{
                width: "100%",
                position: "relative",
                overflow: "hidden",
                height: measureReady && contentH ? contentH * scale : "auto",
                minHeight: 120,
              }}
            >
              <div
                ref={scaleBoxRef}
                style={
                  measureReady
                    ? {
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: TABLE_BASE_WIDTH,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                      }
                    : { position: "static", width: "100%" }
                }
              >
                <div ref={reportRef}>
                  {/* Header info */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
                    <tbody>
                      <tr>
                        <td style={headerCell}>
                          <strong>Document Title:</strong> Receiving Log (Food Truck – FTR 1)
                        </td>
                        <td style={headerCell}>
                          <strong>Document No:</strong> TELT/QC/RECLOG/01
                        </td>
                      </tr>
                      <tr>
                        <td style={headerCell}><strong>Issue Date:</strong> 05/02/2020</td>
                        <td style={headerCell}><strong>Revision No:</strong> 0</td>
                      </tr>
                      <tr>
                        <td style={headerCell}><strong>Area:</strong> QA</td>
                        <td style={headerCell}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</td>
                      </tr>
                      <tr>
                        <td style={headerCell}><strong>Controlling Officer:</strong> Quality Controller</td>
                        <td style={headerCell}><strong>Approved By:</strong> Hussam.O.Sarhan</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Title */}
                  <h3
                    style={{
                      textAlign: "center",
                      background: "#eef1f7",
                      padding: "8px 10px",
                      margin: "0 0 8px",
                      border: "1px solid #e1e5ee",
                      borderRadius: 8,
                    }}
                  >
                    AL MAWASHI BRAAI MUSHRIF PARK
                    <br />
                    RECEIVING LOG – FOOD TRUCK (FTR-1)
                  </h3>

                  {/* Date & Invoice */}
                  <div style={{ marginBottom: 10, display: "flex", gap: 24, fontWeight: 700, color: "#263042", flexWrap: "wrap" }}>
                    <div><strong>Date:</strong> {(!isEditing ? selectedReport?.payload : draft)?.reportDate || "—"}</div>
                    <div><strong>Invoice No:</strong> {(!isEditing ? selectedReport?.payload : draft)?.invoiceNo || "—"}</div>
                  </div>

                  {/* Legend */}
                  <div style={{ margin: "6px 0 12px", fontSize: "0.92rem", color: "#374151" }}>
                    LEGEND: <strong>C</strong> – Compliant / <strong>NC</strong> – Non-Compliant
                  </div>

                  {/* Table */}
                  <table ref={tableRef} style={{ borderCollapse: "collapse", tableLayout: "fixed", width: TABLE_BASE_WIDTH }}>
                    <colgroup>
                      {COL_WIDTHS_PX.map((w, i) => (<col key={i} style={{ width: `${w}px` }} />))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thStyle}>S.No</th>
                        {COLS.map((c, i) => (<th key={i} style={thStyle}>{c.label}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {( (isEditing ? draft?.entries : selectedReport?.payload?.entries) || [] ).map((row, i) => (
                        <tr key={i} style={{ background: i % 2 ? "#fafbff" : "#ffffff" }}>
                          <td style={{ ...baseCell, textAlign: "center", fontWeight: 700 }}>{i + 1}</td>
                          {COLS.map((c) => {
                            const val = row?.[c.key];
                            const type = c.key === "productionDate" || c.key === "expiryDate" ? "date" : "text";
                            const imgs = getRowImages(row);
                            const isFoodItem = c.key === "foodItem";
                            return (
                              <td key={c.key} style={{ ...baseCell, textAlign: c.align || "center" }}>
                                {!isEditing ? (
                                  <>
                                    {renderValue(val, c.key)}
                                    {isFoodItem && imgs.length > 0 && (
                                      <button
                                        type="button"
                                        style={viewBtnStyle}
                                        onClick={() => openPreview(imgs, 0)}
                                        title="View photos"
                                      >
                                        View
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <EditableCell
                                    value={val}
                                    type={type}
                                    align={c.align || "center"}
                                    onChange={(v) => updateDraftEntry(i, c.key, v)}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Notes */}
                  <div style={{ marginTop: 8, fontSize: "0.9rem", color: "#374151" }}>
                    *(C – Compliant &nbsp;&nbsp;&nbsp; NC – Non-Compliant)
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 12,
                      fontWeight: 700,
                      color: "#263042",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>Checked By: {(!isEditing ? selectedReport?.payload : draft)?.checkedBy || "—"}</div>
                    <div>Verified By: {(!isEditing ? selectedReport?.payload : draft)?.verifiedBy || "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {preview.open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closePreview(); }}
          style={{
            position: "fixed", inset: 0, background: "rgba(16,18,27,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24, zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "relative", maxWidth: "92vw", maxHeight: "90vh",
              background: "#0b1020", border: "1px solid #1f2a44", borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)", padding: 12,
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#d1d5db", fontWeight: 800 }}>
                {preview.index + 1} / {preview.images.length}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={preview.images[preview.index]}
                  download={`FTR1_Image_${preview.index + 1}.jpg`}
                  style={{ textDecoration: "none", padding: "8px 12px", borderRadius: 8, background: "#10b981", color: "#fff", fontWeight: 800 }}
                >
                  ⬇ Download
                </a>
                <button
                  onClick={closePreview}
                  style={{ padding: "8px 12px", borderRadius: 8, background: "#ef4444", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div
              style={{
                position: "relative", flex: 1, display: "flex",
                alignItems: "center", justifyContent: "center",
                overflow: "hidden", borderRadius: 10, background: "#0f172a",
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={preview.images[preview.index]}
                style={{ maxWidth: "100%", maxHeight: "84vh", objectFit: "contain", display: "block", userSelect: "none" }}
              />
              {preview.images.length > 1 && (
                <>
                  <button onClick={prevImage} title="Previous (←)" style={navBtnStyle("left")}>‹</button>
                  <button onClick={nextImage} title="Next (→)" style={navBtnStyle("right")}>›</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Helper: nav buttons style ===== */
function navBtnStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
    width: 44,
    height: 44,
    borderRadius: "9999px",
    border: "none",
    cursor: "pointer",
    background: "rgba(255,255,255,0.95)",
    color: "#0f172a",
    fontSize: 28,
    fontWeight: 900,
    lineHeight: "44px",
    textAlign: "center",
    boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
  };
}
