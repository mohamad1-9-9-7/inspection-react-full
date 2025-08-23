// src/pages/admin/QCSRawMaterialView.jsx
import React, { useEffect, useState, useRef } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

/* =============================================================================
   🔗 API Base (external only)
============================================================================= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_API_URL || process.env.VITE_API_URL)) ||
  (typeof import.meta !== "undefined" &&
    import.meta &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  API_ROOT_DEFAULT;

const API_BASE = String(API_ROOT).replace(/\/$/, "");

/* Same-origin? include cookies */
const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* =============================================================================
   🧪 Attributes (transpose view)
============================================================================= */
const ATTRIBUTES = [
  { key: "temperature",      label: "Product Temperature" },
  { key: "ph",               label: "Product PH" },
  { key: "slaughterDate",    label: "Slaughter Date" },
  { key: "expiryDate",       label: "Expiry Date" },
  { key: "broken",           label: "Broken / Cut Pieces" },
  { key: "appearance",       label: "Appearance" },
  { key: "bloodClots",       label: "Blood Stain" },
  { key: "colour",           label: "Colour" },
  { key: "fatDiscoloration", label: "Fat Discoloration" },
  { key: "meatDamage",       label: "Meat Damage" },
  { key: "foreignMatter",    label: "Hair / Foreign Matter" },
  { key: "texture",          label: "Texture" },
  { key: "testicles",        label: "Testicles" },
  { key: "smell",            label: "Bad Smell" },
];

/* =============================================================================
   🖨️ Print CSS
============================================================================= */
const printStyles = `
  @media print {
    .no-print { display: none !important; }
    aside { display: none !important; }
    main, .print-main, .print-unclip {
      max-height: none !important;
      overflow: visible !important;
      box-shadow: none !important;
      border: none !important;
    }
    [style*="overflow"], [style*="max-height"] {
      max-height: none !important;
      overflow: visible !important;
    }
    .print-area { visibility: visible !important; }
    html, body { height: auto !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    table, thead, tbody, tfoot, tr, th, td { border: 1px solid #000 !important; }
    .headerTable th, .headerTable td { border: 1px solid #000 !important; background: #fff !important; }
    .samples thead th { background: #f5f5f5 !important; }

    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr, img { page-break-inside: avoid; }
    img { max-width: 100% !important; }
    * { color: #000 !important; }
  }
`;

/* =============================================================================
   📄 Header styles
============================================================================= */
const headerStyles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "0.95rem",
    background: "#fff",
    border: "1px solid #000",
  },
  th: {
    border: "1px solid #000",
    background: "#f8fafc",
    textAlign: "left",
    padding: "10px 12px",
    width: "220px",
    color: "#111827",
    fontWeight: 800,
  },
  td: { border: "1px solid #000", padding: "10px 12px", background: "#fff" },
  spacerCol: { borderLeft: "1px solid #000", width: "10px" },
};

/* =============================================================================
   🧭 Default doc meta
============================================================================= */
const defaultDocMeta = {
  documentTitle: "Raw Material Inspection Report - Chilled Lamb",
  documentNo: "FS-QM/REC/RMB",
  issueDate: "2020-02-10",
  revisionNo: "0",
  area: "QA",
};

/* =============================================================================
   🧠 Field labels
============================================================================= */
const keyLabels = {
  reportOn: "Report On",
  receivedOn: "Sample Received On",
  inspectionDate: "Inspection Date",
  temperature: "Temperature",
  brand: "Brand",
  invoiceNo: "Invoice No",
  ph: "PH",
  origin: "Origin",
  airwayBill: "Air Way Bill No",
  localLogger: "Local Logger",
  internationalLogger: "International Logger",
};

/* =============================================================================
   💾 Local cache key
============================================================================= */
const LS_KEY_REPORTS = "qcs_raw_material_reports";

/* =============================================================================
   🎨 Theme and info grid (strong borders)
============================================================================= */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Cairo, sans-serif",
  },
  hero: {
    position: "relative",
    height: 220,
    background:
      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 35%, #0ea5e9 100%)",
    overflow: "hidden",
    zIndex: 0,
  },
  heroBlobA: {
    position: "absolute",
    width: 400,
    height: 400,
    left: -120,
    top: -180,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(255,255,255,.25), rgba(255,255,255,0))",
  },
  heroBlobB: {
    position: "absolute",
    width: 500,
    height: 300,
    right: -140,
    top: -120,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(255,255,255,.18), rgba(255,255,255,0))",
    transform: "rotate(-15deg)",
  },
  heroWave: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    width: "100%",
    height: 140,
    display: "block",
    pointerEvents: "none",
    zIndex: 0,
  },
  contentWrap: {
    display: "flex",
    gap: "1rem",
    padding: "0 16px 24px",
    marginTop: -80,
    position: "relative",
    zIndex: 1,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 0,
    border: "1px solid #000",
    borderRadius: 0,
    overflow: "hidden",
    background: "#fff",
  },
  infoCell: {
    border: "1px solid #000",
    padding: 12,
    minHeight: 66,
  },
  infoTitle: { fontWeight: 800, marginBottom: 5, color: "#111827" },
};

/* =============================================================================
   Page
============================================================================= */
export default function QCSRawMaterialView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [openTypes, setOpenTypes] = useState({});
  const [showAttachments, setShowAttachments] = useState(false); // bottom toggle

  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");

  const restoreShowRef = useRef(false);
  const printAreaRef = useRef(null);
  const mainRef = useRef(null);
  const importRef = useRef(null);

  /* helpers */
  const toggleType = (type) =>
    setOpenTypes((prev) => ({ ...prev, [type]: !prev[type] }));

  const ShipmentStatusPill = ({ status }) => {
    const statusMap = {
      Acceptable: { text: "✅ Acceptable", color: "#16a34a", bd: "#a7f3d0" },
      Average: { text: "⚠️ Average", color: "#d97706", bd: "#fde68a" },
      "Below Average": { text: "❌ Below Average", color: "#dc2626", bd: "#fecaca" },
    };
    const m =
      statusMap[status] || { text: status || "-", color: "#111827", bd: "#e5e7eb" };
    return (
      <span
        style={{
          padding: "4px 10px",
          borderRadius: 999,
          background: m.bd,
          color: m.color,
          fontWeight: 800,
          display: "inline-block",
        }}
      >
        {m.text}
      </span>
    );
  };

  /* server I/O */
  const normalizeServerRecord = (rec) => {
    const p = rec?.payload || rec || {};
    const payloadId = p.id || p.payloadId || undefined;
    const dbId = rec?._id || rec?.id || undefined;

    return {
      id:
        payloadId ||
        dbId ||
        `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      serverId: dbId,

      shipmentType: p.shipmentType || "",
      status: p.status || "",
      generalInfo: p.generalInfo || {},
      date: p.date || rec?.createdAt || "",
      samples: Array.isArray(p.samples) ? p.samples : [],
      inspectedBy: p.inspectedBy || "",
      verifiedBy: p.verifiedBy || "",
      totalQuantity: p.totalQuantity || "",
      totalWeight: p.totalWeight || "",
      averageWeight: p.averageWeight || "",
      certificateFile: p.certificateFile || "",
      certificateName: p.certificateName || "",
      images: Array.isArray(p.images) ? p.images : [],
      docMeta: p.docMeta || {},
      notes: p.notes || "",
      createdAt: rec?.createdAt || undefined,
      updatedAt: rec?.updatedAt || undefined,
    };
  };

  const mergeUniqueById = (serverArr, localArr) => {
    const map = new Map();
    localArr.forEach((r) => map.set(r.id, r));
    serverArr.forEach((r) => {
      const prev = map.get(r.id) || {};
      map.set(r.id, { ...prev, ...r });
    });
    return Array.from(map.values());
  };

  const loadFromLocal = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY_REPORTS) || "[]");
      return saved.map((r) => ({ ...r, serverId: r.serverId || undefined }));
    } catch {
      return [];
    }
  };
  const saveToLocal = (list) => {
    try {
      localStorage.setItem(LS_KEY_REPORTS, JSON.stringify(list));
    } catch {}
  };

  const fetchFromServer = async () => {
    setServerErr("");
    setLoadingServer(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=qcs_raw_material`, {
        cache: "no-store",
        mode: "cors",
        credentials: IS_SAME_ORIGIN ? "include" : "omit",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data || [];
      return arr.map(normalizeServerRecord);
    } catch (e) {
      setServerErr("Unable to fetch from server now (it may be waking up).");
      return [];
    } finally {
      setLoadingServer(false);
    }
  };

  /* initial load + refresh */
  useEffect(() => {
    let mounted = true;

    const update = async () => {
      const local = loadFromLocal();

      if (mounted) {
        const sortedLocal = local.sort((a, b) =>
          String(b.date || b.createdAt || "").localeCompare(
            String(a.date || a.createdAt || "")
          )
        );
        setReports(sortedLocal);
        if (sortedLocal.length && selectedReportId == null) {
          setSelectedReportId(sortedLocal[0].id);
        }
      }

      const server = await fetchFromServer();
      if (mounted) {
        const merged = mergeUniqueById(server, local).sort((a, b) =>
          String(b.date || b.createdAt || "").localeCompare(
            String(a.date || a.createdAt || "")
          )
        );
        setReports(merged);
        if (merged.length && !merged.some((r) => r.id === selectedReportId)) {
          setSelectedReportId(merged[0]?.id || null);
        }
        saveToLocal(merged);
      }
    };

    update();
    const onFocus = () => update();
    const onStorage = () => update();
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [selectedReportId]);

  /* delete */
  const deleteOnServer = async (record) => {
    const base = `${API_BASE}/api/reports`;
    const apiDelete = async (url) => {
      try {
        const res = await fetch(url, {
          method: "DELETE",
          mode: "cors",
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
        });
        if (res.ok || res.status === 404) return true;
      } catch {}
      return false;
    };

    if (record.serverId) {
      const urls = [
        `${base}/${encodeURIComponent(record.serverId)}`,
        `${base}/${encodeURIComponent(record.serverId)}?type=qcs_raw_material`,
        `${base}/qcs_raw_material/${encodeURIComponent(record.serverId)}`,
      ];
      for (const u of urls) if (await apiDelete(u)) return true;
    }

    try {
      const res = await fetch(`${base}?type=qcs_raw_material`, {
        cache: "no-store",
        mode: "cors",
        credentials: IS_SAME_ORIGIN ? "include" : "omit",
      });
      if (res.ok) {
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json?.data || [];
        const norm = (s) => String(s || "").trim().toLowerCase();
        const target = arr.find((rec) => {
          const p = rec?.payload || {};
          return (
            (p.id && p.id === record.id) ||
            (norm(p.generalInfo?.airwayBill) ===
              norm(record.generalInfo?.airwayBill))
          );
        });
        const dbId = target?._id || target?.id;
        if (dbId) {
          const urls2 = [
            `${base}/${encodeURIComponent(dbId)}`,
            `${base}/${encodeURIComponent(dbId)}?type=qcs_raw_material`,
            `${base}/qcs_raw_material/${encodeURIComponent(dbId)}`,
          ];
          for (const u of urls2) if (await apiDelete(u)) return true;
        }
      }
    } catch {}
    return false;
  };

  const handleDelete = async (id) => {
    const rec = reports.find((r) => r.id === id);
    if (!rec) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    setReports((prev) => {
      const newList = prev.filter((r) => r.id !== id);
      saveToLocal(newList);
      if (selectedReportId === id) setSelectedReportId(newList[0]?.id || null);
      return newList;
    });

    const ok = await deleteOnServer(rec);
    if (!ok) alert("⚠️ Failed to delete from server. Removed locally.");
  };

  /* import/export */
  const handleExportJSON = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(reports, null, 2)], {
        type: "application/json",
      })
    );
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "qcs_raw_material_reports_backup.json",
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const data = JSON.parse(target.result);
        if (!Array.isArray(data))
          return alert("Invalid JSON: expected an array of reports.");
        const map = new Map();
        [...reports, ...data].forEach((r) =>
          map.set(r.id, { ...map.get(r.id), ...r })
        );
        const merged = Array.from(map.values()).sort((a, b) =>
          String(b.date || b.createdAt || "").localeCompare(
            String(a.date || a.createdAt || "")
          )
        );
        setReports(merged);
        saveToLocal(merged);
        alert("Reports imported successfully.");
      } catch {
        alert("Failed to parse the file or invalid format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* filter/selection */
  const filteredReports = reports.filter((r) =>
    (r.generalInfo?.airwayBill || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );
  const selectedReport =
    filteredReports.find((r) => r.id === selectedReportId) || null;

  /* export PDF (forces show attachments during export) */
  const exportToPDF = async () => {
    if (!selectedReport) return alert("No selected report to export.");

    restoreShowRef.current = showAttachments;
    setShowAttachments(true);

    const filename =
      (selectedReport?.generalInfo?.airwayBill &&
        `QCS-${selectedReport.generalInfo.airwayBill}`) ||
      `QCS-Report-${
        (selectedReport?.date || "").replace(/[:/\\s]+/g, "_").slice(0, 40) ||
        Date.now()
      }`;

    const mainEl = mainRef.current;
    const originalMainStyle = {
      maxHeight: mainEl?.style.maxHeight,
      overflowY: mainEl?.style.overflowY,
      boxShadow: mainEl?.style.boxShadow,
      border: mainEl?.style.border,
    };
    if (mainEl) {
      mainEl.style.maxHeight = "none";
      mainEl.style.overflowY = "visible";
      mainEl.style.boxShadow = "none";
      mainEl.style.border = "none";
    }

    await new Promise((r) => setTimeout(r, 150));

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all(
        [import("html2canvas"), import("jspdf")]
      );

      const target = printAreaRef.current;
      const scale = window.devicePixelRatio > 1 ? 2 : 1;
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(
        imgData,
        "PNG",
        0,
        position,
        imgWidth,
        imgHeight,
        undefined,
        "FAST"
      );
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(
          imgData,
          "PNG",
          0,
          position,
          imgWidth,
          imgHeight,
          undefined,
          "FAST"
        );
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Failed to create PDF. Make sure jspdf and html2canvas are installed.");
    } finally {
      if (mainEl) {
        mainEl.style.maxHeight = originalMainStyle.maxHeight || "";
        mainEl.style.overflowY = originalMainStyle.overflowY || "";
        mainEl.style.boxShadow = originalMainStyle.boxShadow || "";
        mainEl.style.border = originalMainStyle.border || "";
      }
      setShowAttachments(restoreShowRef.current);
    }
  };

  /* titles/meta */
  const reportTitle =
    (selectedReport?.generalInfo?.airwayBill &&
      `📦 Air Way Bill: ${selectedReport.generalInfo.airwayBill}`) ||
    "📋 Incoming Shipment Report";

  const docMeta = selectedReport?.docMeta
    ? {
        documentTitle:
          selectedReport.docMeta.documentTitle || defaultDocMeta.documentTitle,
        documentNo:
          selectedReport.docMeta.documentNo || defaultDocMeta.documentNo,
        issueDate: selectedReport.docMeta.issueDate || defaultDocMeta.issueDate,
        revisionNo:
          selectedReport.docMeta.revisionNo || defaultDocMeta.revisionNo,
        area: selectedReport.docMeta.area || defaultDocMeta.area,
      }
    : defaultDocMeta;

  return (
    <div style={styles.page}>
      <style>{printStyles}</style>

      {/* Hero */}
      <div style={styles.hero} aria-hidden="true">
        <div style={styles.heroBlobA} />
        <div style={styles.heroBlobB} />
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" style={styles.heroWave}>
          <path fill="#ffffff" d="M0,64 C240,128 480,0 720,32 C960,64 1200,160 1440,96 L1440,140 L0,140 Z" />
        </svg>
      </div>

      <div style={styles.contentWrap}>
        {/* Sidebar */}
        <aside
          className="no-print"
          style={{
            flex: "0 0 300px",
            borderLeft: "1px solid #e5e7eb",
            paddingLeft: "1rem",
            maxHeight: "80vh",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(2,6,23,0.06)",
          }}
        >
          <h3 style={{ marginBottom: "1rem", color: "#111827", fontWeight: 800 }}>
            📦 Reports by Shipment Type
          </h3>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1,
                padding: 10,
                background: "#10b981",
                color: "#fff",
                border: "1px solid #0f766e",
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
              title="Reload"
            >
              🔄 Refresh
            </button>
            <button
              onClick={exportToPDF}
              disabled={!selectedReport}
              style={{
                flex: 1,
                padding: 10,
                background: !selectedReport ? "#93c5fd" : "#0ea5e9",
                color: "#fff",
                border: "1px solid #1d4ed8",
                borderRadius: 10,
                fontWeight: 800,
                cursor: !selectedReport ? "not-allowed" : "pointer",
              }}
              title="Export selected report to PDF"
            >
              ⬇️ PDF
            </button>
          </div>

          {loadingServer && (
            <div style={{ marginBottom: 8, color: "#0ea5e9", fontWeight: 800 }}>
              ⏳ Fetching from server…
            </div>
          )}
          {serverErr && (
            <div style={{ marginBottom: 8, color: "#dc2626", fontWeight: 800 }}>
              {serverErr}
            </div>
          )}

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Search by Air Way Bill"
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              marginBottom: "1rem",
            }}
          />

          {Object.entries(
            filteredReports.reduce((acc, r) => {
              const type = r.shipmentType || "Unspecified";
              if (!acc[type]) acc[type] = [];
              acc[type].push(r);
              return acc;
            }, {})
          ).map(([type, reportsInType]) => (
            <div key={type} style={{ marginBottom: "1.5rem" }}>
              <button
                onClick={() => toggleType(type)}
                style={{
                  width: "100%",
                  background: "#f3f4f6",
                  padding: "10px 12px",
                  fontWeight: 800,
                  textAlign: "left",
                  border: "1px solid #e5e7eb",
                  borderRadius: "10px",
                  marginBottom: "0.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  color: "#0f172a",
                }}
              >
                📦 {type}
                <span>{openTypes[type] ? "➖" : "➕"}</span>
              </button>

              {openTypes[type] && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {reportsInType.map((r) => (
                    <li key={r.id} style={{ marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          onClick={() => {
                            setSelectedReportId(r.id);
                            setShowAttachments(false);
                          }}
                          title={`Open report ${r.generalInfo?.airwayBill || "No AWB"}`}
                          style={{
                            flex: 1,
                            padding: "10px 12px",
                            borderRadius: 10,
                            cursor: "pointer",
                            border:
                              selectedReportId === r.id
                                ? "2px solid #1f2937"
                                : "1px solid #e5e7eb",
                            background:
                              selectedReportId === r.id ? "#f5f5f5" : "#fff",
                            fontWeight: selectedReportId === r.id ? 800 : 600,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            textAlign: "left",
                            color: "#0f172a",
                          }}
                        >
                          <span>
                            {r.generalInfo?.airwayBill || "No AWB"}{" "}
                            <span style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                              {r.status === "Acceptable"
                                ? "✅"
                                : r.status === "Average"
                                ? "⚠️"
                                : "❌"}
                            </span>
                          </span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(r.id);
                          }}
                          style={{
                            background: "#dc2626",
                            color: "#fff",
                            border: "1px solid #b91c1c",
                            borderRadius: 8,
                            padding: "8px 12px",
                            cursor: "pointer",
                            fontWeight: 800,
                            minWidth: 72,
                          }}
                          title="Delete report from server"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
            <button
              onClick={handleExportJSON}
              style={{
                padding: 10,
                background: "#111827",
                color: "#fff",
                border: "1px solid #111827",
                borderRadius: 10,
                width: "100%",
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              ⬇️ Export reports (JSON)
            </button>
            <button
              onClick={() => importRef.current?.click()}
              style={{
                padding: 10,
                background: "#16a34a",
                color: "#fff",
                border: "1px solid #15803d",
                borderRadius: 10,
                width: "100%",
                fontWeight: 800,
              }}
            >
              ⬆️ Import reports
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              onChange={handleImportJSON}
              style={{ display: "none" }}
            />
          </div>
        </aside>

        {/* Main */}
        <main
          ref={mainRef}
          className="print-main"
          style={{
            flex: 1,
            maxHeight: "80vh",
            overflowY: "auto",
            background: "#fff",
            borderRadius: 16,
            padding: "1rem",
            boxShadow:
              "0 10px 20px rgba(2,6,23,0.06), 0 1px 2px rgba(2,6,23,0.04)",
            border: "1px solid #e5e7eb",
          }}
        >
          {!selectedReport ? (
            <p
              style={{
                textAlign: "center",
                fontWeight: 800,
                color: "#dc2626",
                padding: "2rem",
              }}
            >
              ❌ No report selected.
            </p>
          ) : (
            <div className="print-area" ref={printAreaRef}>
              {/* Header */}
              <div style={{ marginBottom: "10px" }}>
                <table className="headerTable" style={headerStyles.table}>
                  <colgroup>
                    <col />
                    <col />
                    <col style={headerStyles.spacerCol} />
                    <col />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr>
                      <th style={headerStyles.th}>Document Title</th>
                      <td style={headerStyles.td}>{docMeta.documentTitle}</td>
                      <td />
                      <th style={headerStyles.th}>Document No</th>
                      <td style={headerStyles.td}>{docMeta.documentNo}</td>
                    </tr>
                    <tr>
                      <th style={headerStyles.th}>Issue Date</th>
                      <td style={headerStyles.td}>{docMeta.issueDate}</td>
                      <td />
                      <th style={headerStyles.th}>Revision No</th>
                      <td style={headerStyles.td}>{docMeta.revisionNo}</td>
                    </tr>
                    <tr>
                      <th style={headerStyles.th}>Area</th>
                      <td style={headerStyles.td} colSpan={4}>
                        {docMeta.area}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Title */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: "1rem",
                }}
              >
                <h3 style={{ margin: 0, color: "#111827", fontWeight: 800 }}>
                  {reportTitle}
                </h3>
                {/* (تم إزالة زر Show attachments من هنا) */}
              </div>

              {/* General Info */}
              <section style={{ marginBottom: "1.5rem" }}>
                <div style={styles.infoGrid}>
                  {Object.entries(selectedReport.generalInfo || {}).map(([k, v]) => (
                    <div key={k} style={styles.infoCell}>
                      <div style={styles.infoTitle}>{keyLabels[k] || k}</div>
                      <div>{v || "-"}</div>
                    </div>
                  ))}
                  <div style={styles.infoCell}>
                    <div style={styles.infoTitle}>Shipment Type</div>
                    <div>{selectedReport.shipmentType || "-"}</div>
                  </div>
                  <div style={styles.infoCell}>
                    <div style={styles.infoTitle}>Shipment Status</div>
                    <ShipmentStatusPill status={selectedReport.status} />
                  </div>
                  <div style={styles.infoCell}>
                    <div style={styles.infoTitle}>Entry Date</div>
                    <div>{selectedReport.date || "-"}</div>
                  </div>
                  <div style={styles.infoCell}>
                    <div style={styles.infoTitle}>Total Quantity (pcs)</div>
                    <div>{selectedReport.totalQuantity || "-"}</div>
                  </div>
                  <div style={styles.infoCell}>
                    <div style={styles.infoTitle}>Total Weight (kg)</div>
                    <div>{selectedReport.totalWeight || "-"}</div>
                  </div>
                  <div style={styles.infoCell}>
                    <div style={styles.infoTitle}>Average Weight (kg)</div>
                    <div>{selectedReport.averageWeight || "-"}</div>
                  </div>
                </div>
              </section>

              {/* Samples (transposed) */}
              <section>
                <h4
                  style={{
                    marginBottom: "0.8rem",
                    fontWeight: 800,
                    color: "#111827",
                    borderBottom: "2px solid #000",
                    paddingBottom: "0.3rem",
                  }}
                >
                  Test Samples
                </h4>
                <div
                  className="print-unclip"
                  style={{
                    overflowX: "auto",
                    border: "1px solid #000",
                    borderRadius: 0,
                  }}
                >
                  <table
                    className="samples"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "0.95rem",
                      minWidth: "900px",
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          background: "#f5f5f5",
                          textAlign: "center",
                          fontWeight: 800,
                        }}
                      >
                        <th
                          style={{
                            padding: "10px 6px",
                            border: "1px solid #000",
                            whiteSpace: "nowrap",
                            textAlign: "left",
                          }}
                        >
                          Attribute
                        </th>
                        {selectedReport.samples?.map((_, idx) => (
                          <th
                            key={idx}
                            style={{
                              padding: "10px 6px",
                              border: "1px solid #000",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Sample {idx + 1}
                          </th>
                        ))}
                      </tr>
                      <tr style={{ background: "#fafafa", textAlign: "center" }}>
                        <th
                          style={{
                            padding: "10px 6px",
                            border: "1px solid #000",
                            textAlign: "left",
                          }}
                        >
                          PRODUCT NAME
                        </th>
                        {selectedReport.samples?.map((s, idx) => (
                          <th
                            key={`pn-${idx}`}
                            style={{
                              padding: "8px 6px",
                              border: "1px solid #000",
                              fontWeight: 600,
                            }}
                          >
                            {s?.productName || "-"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ATTRIBUTES.map((attr) => (
                        <tr
                          key={attr.key}
                          style={
                            ["temperature", "ph", "slaughterDate", "expiryDate"].includes(
                              attr.key
                            )
                              ? { background: "#f9fafb" }
                              : undefined
                          }
                        >
                          <td
                            style={{
                              padding: "8px 6px",
                              border: "1px solid #000",
                              fontWeight: 600,
                            }}
                          >
                            {attr.label}
                          </td>
                          {selectedReport.samples?.map((s, i) => (
                            <td
                              key={`${attr.key}-${i}`}
                              style={{
                                padding: "8px 6px",
                                border: "1px solid #000",
                                textAlign: "center",
                              }}
                            >
                              {s?.[attr.key] || "-"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Notes */}
              <section style={{ marginTop: "1rem" }}>
                <h4
                  style={{
                    marginBottom: "0.5rem",
                    fontWeight: 800,
                    color: "#111827",
                  }}
                >
                  📝 Notes
                </h4>
                <div
                  style={{
                    border: "1px solid #000",
                    borderRadius: 0,
                    padding: "10px 12px",
                    minHeight: "6em",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    background: "#fff",
                  }}
                >
                  {(selectedReport?.notes ??
                    selectedReport?.generalInfo?.notes ??
                    "")?.trim() || "—"}
                </div>
              </section>

              {/* Signatures */}
              <section
                style={{
                  marginTop: "1.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                {selectedReport.inspectedBy && (
                  <div style={{ flex: 1 }}>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoCell}>
                        <div style={styles.infoTitle}>Inspected By</div>
                        <div>{selectedReport.inspectedBy}</div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedReport.verifiedBy && (
                  <div style={{ flex: 1 }}>
                    <div style={styles.infoGrid}>
                      <div style={styles.infoCell}>
                        <div style={styles.infoTitle}>Verified By</div>
                        <div>{selectedReport.verifiedBy}</div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Attachments (moved to bottom) */}
              {showAttachments && (
                <section style={{ marginTop: "1.5rem" }}>
                  {(selectedReport.certificateFile ||
                    (Array.isArray(selectedReport.images) &&
                      selectedReport.images.length > 0)) && (
                    <h4
                      style={{
                        marginBottom: 8,
                        fontWeight: 800,
                        color: "#111827",
                      }}
                    >
                      Attachments
                    </h4>
                  )}

                  {/* Certificate */}
                  {selectedReport.certificateFile && (
                    <div style={{ margin: "0.5rem 0 1rem" }}>
                      <div style={{ fontWeight: 800, marginBottom: 6, color: "#111827" }}>
                        {selectedReport.certificateName}
                      </div>
                      {selectedReport.certificateFile.startsWith("data:image/") ? (
                        <img
                          src={selectedReport.certificateFile}
                          alt={selectedReport.certificateName || "Halal certificate"}
                          style={{
                            maxWidth: "350px",
                            borderRadius: 8,
                            display: "block",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      ) : selectedReport.certificateFile.startsWith(
                          "data:application/pdf"
                        ) ? (
                        <div
                          style={{
                            padding: "8px 12px",
                            border: "1px dashed #94a3b8",
                            display: "inline-block",
                            borderRadius: 8,
                          }}
                        >
                          📄 PDF attached — file name:{" "}
                          <strong>{selectedReport.certificateName}</strong>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Images */}
                  {Array.isArray(selectedReport.images) &&
                    selectedReport.images.length > 0 && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(140px, 1fr))",
                          gap: 8,
                        }}
                      >
                        {selectedReport.images.map((img, i) => (
                          <img
                            key={`${img.name || "img"}-${i}`}
                            src={img.data || img.url || ""}
                            alt={img.name || `image-${i + 1}`}
                            style={{
                              width: "100%",
                              borderRadius: 8,
                              border: "1px solid #e5e7eb",
                            }}
                          />
                        ))}
                      </div>
                    )}
                </section>
              )}

              {/* Bottom toggle button */}
              <div
                className="no-print"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={() => setShowAttachments((s) => !s)}
                  title={showAttachments ? "Hide attachments" : "Show attachments"}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  {showAttachments ? <FiEyeOff /> : <FiEye />}
                  <span style={{ fontSize: 14 }}>
                    {showAttachments ? "Hide attachments" : "Show attachments"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
