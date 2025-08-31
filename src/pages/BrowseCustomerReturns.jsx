// src/pages/BrowseCustomerReturns.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========== API ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch " + type);
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data ?? [];
}

/* ========== Helpers ========== */
function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function bestTs(rec) {
  return (
    toTs(rec?.createdAt) ||
    toTs(rec?.updatedAt) ||
    toTs(rec?.timestamp) ||
    toTs(rec?._id) ||
    toTs(rec?.payload?._clientSavedAt) ||
    0
  );
}
function normalizeReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec) => {
      const payload = rec?.payload || {};
      return {
        ts: bestTs(rec),
        reportDate: payload.reportDate || rec?.reportDate || "",
        items: Array.isArray(payload.items) ? payload.items : [],
      };
    })
    .filter((e) => e.reportDate);

  const byDate = new Map();
  for (const e of entries) {
    const prev = byDate.get(e.reportDate);
    if (!prev || e.ts > prev.ts) byDate.set(e.reportDate, e);
  }
  return Array.from(byDate.values());
}

function itemKey(row) {
  return [
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (row?.customerName || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}

function actionText(row) {
  return row?.action === "Other..." ? row?.customAction || "" : row?.action || "";
}

/* ===== Unified Donut KPI Card (SVG) ===== */
function DonutCard({
  percent = 0,
  label = "",
  subLabel = "",
  count = null,
  color = "#166534",
  centerText = null,
  extra = null,
  size = 140,
  stroke = 14,
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - dash / 100);

  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.6)",
      borderRadius: 16,
      boxShadow: "0 10px 26px rgba(13, 10, 44, 0.12)",
      padding: "16px 18px",
      display: "grid",
      placeItems: "center",
      gap: 8,
      minWidth: 230,
      backdropFilter: "blur(6px)",
    }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke="url(#ringGrad)" strokeWidth={stroke} fill="none"
          strokeDasharray={`${C} ${C}`} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text
          x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontWeight: 900, fontSize: 24, fill: "#0f172a" }}
        >
          {centerText != null ? centerText : `${dash}%`}
        </text>
      </svg>

      <div
        style={{
          fontWeight: 900,
          color: "#0f172a",
          textAlign: "center",
          maxWidth: 200,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          fontSize: 16,
        }}
        title={label}
      >
        {label}
      </div>

      {subLabel ? (
        <div
          style={{
            fontSize: 12,
            opacity: 0.8,
            textAlign: "center",
            maxWidth: 220,
            lineHeight: 1.25,
          }}
          title={subLabel}
        >
          {subLabel}
        </div>
      ) : null}

      {count != null && (
        <div style={{ opacity: .85, fontWeight: 800, marginTop: 2 }}>{count}</div>
      )}
      {extra}
    </div>
  );
}

/* ===== Read-only Image Viewer Modal ===== */
const viewImgBtn = {
  marginLeft: 8,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 1px 6px rgba(37,99,235,.35)",
};

const viewerBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const viewerCard = {
  width: "min(1200px, 96vw)",
  maxHeight: "90vh",
  overflow: "auto",
  background: "#fff",
  color: "#111",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
};

const viewerClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};

const viewerBigImg = {
  width: "100%",
  height: "auto",
  maxHeight: "70vh",
  objectFit: "contain",
  borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,.2)",
};

const viewerThumbsWrap = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};

const viewerThumbTile = {
  position: "relative",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f8fafc",
  padding: 0,
  cursor: "pointer",
};

const viewerThumbImg = {
  width: "100%",
  height: 120,
  objectFit: "cover",
  display: "block",
};

function ImageViewerModal({ open, images = [], title = "", onClose }) {
  const [preview, setPreview] = React.useState(images[0] || "");
  React.useEffect(() => {
    if (open) setPreview(images[0] || "");
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, images, onClose]);
  if (!open) return null;
  return (
    <div style={viewerBack} onClick={onClose}>
      <div style={viewerCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images{title ? ` — ${title}` : ""}
          </div>
          <button onClick={onClose} style={viewerClose}>✕</button>
        </div>

        {preview ? (
          <div style={{ marginTop: 12, marginBottom: 10 }}>
            <img src={preview} alt="preview" style={viewerBigImg} />
          </div>
        ) : (
          <div style={{ marginTop: 12, marginBottom: 10, color: "#64748b" }}>No images.</div>
        )}

        <div style={viewerThumbsWrap}>
          {images.map((src, i) => (
            <button key={i} style={viewerThumbTile} onClick={() => setPreview(src)} title={`Image ${i + 1}`}>
              <img src={src} alt={`thumb-${i}`} style={viewerThumbImg} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== Page ========== */
export default function BrowseCustomerReturns() {
  const [returnsData, setReturnsData] = useState([]);
  const [changesData, setChangesData] = useState([]);

  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});

  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");

  async function reload() {
    setServerErr("");
    setLoadingServer(true);
    try {
      const [rawReturns, rawChanges] = await Promise.all([
        fetchByType("returns_customers"),
        fetchByType("returns_customers_changes"),
      ]);
      const normalized = normalizeReturns(rawReturns);
      setReturnsData(normalized);
      setChangesData(rawChanges);

      if (!selectedDate && normalized.length) {
        const oldest = [...normalized]
          .map((r) => r.reportDate)
          .sort((a, b) => a.localeCompare(b))[0];
        setSelectedDate(oldest);
        const y = oldest.slice(0, 4);
        const m = oldest.slice(5, 7);
        setOpenYears((p) => ({ ...p, [y]: true }));
        setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
      }
    } catch (e) {
      console.error(e);
      setServerErr("Failed to fetch from server. (The server might be waking up).");
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  /* Changes map: date -> Map(key -> {from,to,at,ts}) */
  const changeMapByDate = useMemo(() => {
    const map = new Map();
    for (const rec of changesData) {
      const d = rec?.payload?.reportDate || rec?.reportDate || "";
      if (!d) continue;
      const items = Array.isArray(rec?.payload?.items) ? rec.payload.items : [];
      if (!map.has(d)) map.set(d, new Map());
      const inner = map.get(d);
      for (const ch of items) {
        const k = ch?.key;
        if (!k) continue;
        const ts = toTs(ch?.at) || 0;
        const prev = inner.get(k);
        if (!prev || ts > prev.ts) inner.set(k, { from: ch.from, to: ch.to, at: ch.at, ts });
      }
    }
    return map;
  }, [changesData]);

  /* Filter & sort (ascending) */
  const filteredReportsAsc = useMemo(() => {
    const arr = returnsData.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
    arr.sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
    return arr;
  }, [returnsData, filterFrom, filterTo]);

  useEffect(() => {
    if (!filteredReportsAsc.length) {
      setSelectedDate("");
      return;
    }
    const still = filteredReportsAsc.some((r) => r.reportDate === selectedDate);
    if (!still) {
      setSelectedDate(filteredReportsAsc[0].reportDate);
      const y = filteredReportsAsc[0].reportDate.slice(0, 4);
      const m = filteredReportsAsc[0].reportDate.slice(5, 7);
      setOpenYears((p) => ({ ...p, [y]: true }));
      setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    }
  }, [filteredReportsAsc, selectedDate]);

  /* IMPORTANT: selectedReport MUST be defined before any usage */
  const selectedReport = useMemo(
    () => filteredReportsAsc.find((r) => r.reportDate === selectedDate) || null,
    [filteredReportsAsc, selectedDate]
  );

  /* We'll compute changeMap AFTER selectedReport exists */
  const changeMap = useMemo(
    () => changeMapByDate.get(selectedReport?.reportDate || "") || new Map(),
    [changeMapByDate, selectedReport]
  );

  /* Year -> Month -> Day hierarchy (ascending) */
  const hierarchyAsc = useMemo(() => {
    const years = new Map();
    filteredReportsAsc.forEach((rep) => {
      const d = rep.reportDate;
      const y = d.slice(0, 4);
      const m = d.slice(5, 7);
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(d);
    });
    years.forEach((months) => {
      months.forEach((days) => days.sort((a, b) => a.localeCompare(b)));
    });
    const sortedYears = Array.from(years.keys()).sort((a, b) => a.localeCompare(b));
    return sortedYears.map((y) => {
      const months = years.get(y);
      const sortedMonths = Array.from(months.keys()).sort((a, b) => a.localeCompare(b));
      return {
        year: y,
        months: sortedMonths.map((m) => ({ month: m, days: months.get(m) })),
      };
    });
  }, [filteredReportsAsc]);

  /* ================= KPIs (Customers) =================
     - Total returned items
     - Total returned weight (kg)
     - Total reports (days)
     - Top 5 returned products (by count)
     - Top 5 customers (by count)
  */
  const kpi = useMemo(() => {
    let totalItems = 0;
    let totalQtyKg = 0;

    const byCustomerCount = {};
    const byProductCount = {};

    const isKgType = (t) => {
      const s = (t || "").toString().toLowerCase();
      return s.includes("kg") || s.includes("كيلو") || s.includes("كجم");
    };

    filteredReportsAsc.forEach((rep) => {
      totalItems += (rep.items || []).length;
      (rep.items || []).forEach((it) => {
        const q = Number(it.quantity || 0);

        const cust = it.customerName || "—";
        byCustomerCount[cust] = (byCustomerCount[cust] || 0) + 1;

        const prod = it.productName || "—";
        byProductCount[prod] = (byProductCount[prod] || 0) + 1;

        if (isKgType(it.qtyType)) totalQtyKg += q;
      });
    });

    const top5 = (obj) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
      totalItems,
      totalQtyKg: Math.round(totalQtyKg * 1000) / 1000,
      totalReports: filteredReportsAsc.length,
      topProducts: top5(byProductCount),
      topCustomers: top5(byCustomerCount),
    };
  }, [filteredReportsAsc]);

  /* ========== PDF Export (selected day) ========== */
  async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }
  async function ensureAutoTable() {
    if (window.jspdf?.jsPDF?.API?.autoTable) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF-AutoTable"));
      document.head.appendChild(s);
    });
  }

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      const JsPDF = await ensureJsPDF();
      await ensureAutoTable();

      const isOther = (v) => v === "Other...";
      const actionTextSafe = (row) =>
        isOther(row?.action) ? row?.customAction || "" : row?.action || "";

      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const marginL = 20, marginR = 20, marginTop = 80;
      const pageWidth = doc.internal.pageSize.getWidth();
      const avail = pageWidth - marginL - marginR;

      const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Customer Returns Report", marginL, 36);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`Date: ${selectedReport.reportDate}`, marginL, 54);

        const rightX = pageWidth - marginR;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 0, 0);
        doc.setFontSize(18);
        doc.text("AL MAWASHI", rightX, 30, { align: "right" });

        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("Trans Emirates Livestock Trading L.L.C.", rightX, 46, { align: "right" });
      };

      drawHeader();

      const head = [
        ["SL", "PRODUCT", "ORIGIN", "CUSTOMER", "QTY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION"],
      ];

      const body = (selectedReport.items || []).map((row, i) => {
        const qtyType = row.qtyType === "أخرى / Other" ? row.customQtyType || "" : row.qtyType || "";
        const curr = actionTextSafe(row);
        const k = itemKey(row);
        const ch = changeMap.get(k);
        let actionCell = curr || "";
        if (ch && (ch.to ?? "") === (curr ?? "")) {
          const t = toTs(ch?.at);
          const d = t ? new Date(t) : null;
          const dd = d ? String(d.getDate()).padStart(2, "0") : "";
          const mm = d ? String(d.getMonth() + 1).padStart(2, "0") : "";
          const yyyy = d ? d.getFullYear() : "";
          const dateTxt = d ? `${dd}/${mm}/${yyyy}` : "";
          actionCell = `${(ch.from || "").trim()} to ${(ch.to || "").trim()}${dateTxt ? `\n${dateTxt}` : ""}`;
        }
        return [
          String(i + 1),
          row.productName || "",
          row.origin || "",
          row.customerName || "",
          String(row.quantity ?? ""),
          qtyType,
          row.expiry || "",
          row.remarks || "",
          actionCell,
        ];
      });

      const frac = [0.05, 0.18, 0.09, 0.12, 0.06, 0.08, 0.08, 0.18, 0.20];
      const columnStyles = {};
      const pageAvail = avail;
      frac.forEach((f, idx) => (columnStyles[idx] = { cellWidth: Math.floor(pageAvail * f) }));
      columnStyles[0].halign = "center";
      columnStyles[4].halign = "center";
      columnStyles[6].halign = "center";
      columnStyles[7].halign = "left";
      columnStyles[8].halign = "left";

      doc.autoTable({
        head,
        body,
        margin: { top: marginTop, left: marginL, right: marginR },
        tableWidth: avail,
        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 4,
          lineColor: [182, 200, 227],
          lineWidth: 0.5,
          halign: "left",
          valign: "middle",
        },
        headStyles: { fillColor: [219, 234, 254] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles,
        didDrawPage: () => drawHeader(),
      });

      const fileName = `customer_returns_${selectedReport.reportDate}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error(e);
      alert("Failed to create PDF");
    }
  };

  /* ===== Read-only Image Viewer State ===== */
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerTitle, setViewerTitle] = useState("");
  const [viewerImages, setViewerImages] = useState([]);
  const openViewer = (title, images) => {
    setViewerTitle(title || "");
    setViewerImages(Array.isArray(images) ? images : []);
    setViewerOpen(true);
  };
  const closeViewer = () => setViewerOpen(false);

  /* ===== Styling (background & layout) ===== */
  const bgWrap = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    background:
      "radial-gradient(1200px 600px at 100% -10%, #67e8f9 0%, transparent 60%), linear-gradient(135deg,#6d28d9 0%, #4f46e5 45%, #06b6d4 100%)",
  };
  const waveTop = { position: "absolute", top: 0, left: 0, width: "100%", opacity: 0.25 };
  const waveBottom = { position: "absolute", bottom: -2, left: 0, width: "100%", opacity: 0.22, transform: "scaleY(-1)" };

  const pageWrap = {
    position: "relative",
    zIndex: 1,
    fontFamily: "Cairo, sans-serif",
    padding: "2.2rem",
    minHeight: "100vh",
    direction: "ltr",
    color: "#111",
  };

  const hero = {
    background: "linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.35))",
    border: "1px solid rgba(255,255,255,.6)",
    borderRadius: 20,
    padding: "18px 22px",
    marginBottom: 16,
    boxShadow: "0 12px 28px rgba(16, 24, 40, 0.15)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
  const heroTitle = {
    fontWeight: 900,
    fontSize: "1.35rem",
    background: "linear-gradient(90deg,#fff 0%, #0ea5e9 60%, #22d3ee 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    letterSpacing: ".3px",
  };
  const brandWrap = { textAlign: "right" };
  const brandTitle = { fontWeight: 900, letterSpacing: "1px", fontSize: "18px", color: "#b91c1c" };
  const brandSub = { fontWeight: 600, fontSize: "11px", color: "#0f172a", opacity: 0.9 };

  const dateInputStyle = {
    borderRadius: 10,
    border: "1.5px solid rgba(255,255,255,.8)",
    background: "rgba(255,255,255,.85)",
    padding: "8px 13px",
    fontSize: "1em",
    minWidth: 120,
    color: "#111",
    boxShadow: "0 4px 10px rgba(0,0,0,.06)",
  };
  const clearBtn = {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "9px 18px",
    fontWeight: "bold",
    fontSize: "1em",
    cursor: "pointer",
    boxShadow: "0 6px 18px rgba(59,130,246,.25)",
  };

  const leftTree = {
    minWidth: 300,
    background: "rgba(255,255,255,.9)",
    borderRadius: 16,
    boxShadow: "0 10px 24px rgba(2,6,23,.12)",
    padding: "6px 0",
    border: "1px solid rgba(255,255,255,.7)",
    maxHeight: "70vh",
    overflow: "auto",
    color: "#111",
    backdropFilter: "blur(6px)",
  };
  const treeHeader = {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: 800,
    color: "#0f172a",
    borderBottom: "1px solid #e5e7eb",
  };
  const treeSubHeader = {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 16px",
    cursor: "pointer",
    color: "#0f172a",
    borderBottom: "1px dashed #e5e7eb",
  };
  const treeDay = (active) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 16px",
    cursor: "pointer",
    borderBottom: "1px dashed #e5e7eb",
    background: active ? "rgba(14,165,233,.15)" : "transparent",
    borderRight: active ? "5px solid #3b82f6" : "none",
    fontSize: "1em",
    color: "#0f172a",
  });

  const rightPanel = {
    flex: 1,
    background: "rgba(255,255,255,.9)",
    borderRadius: 18,
    boxShadow: "0 12px 28px rgba(2,6,23,.12)",
    minHeight: 320,
    padding: "24px 26px",
    color: "#111",
    border: "1px solid rgba(255,255,255,.7)",
    backdropFilter: "blur(6px)",
  };

  const table = {
    width: "100%",
    background: "#fff",
    borderRadius: 10,
    borderCollapse: "collapse",
    border: "1px solid #b6c8e3",
    marginTop: 8,
    minWidth: 800,
    color: "#111",
  };
  const th = {
    padding: "12px 8px",
    textAlign: "center",
    fontSize: "0.98em",
    fontWeight: "bold",
    border: "1px solid #b6c8e3",
    background: "#e6f0ff",
    color: "#0f172a",
    userSelect: "none",
  };
  const td = {
    padding: "10px 8px",
    textAlign: "center",
    minWidth: 90,
    border: "1px solid #b6c8e3",
    background: "#f8fbff",
    color: "#0f172a",
  };

  const listRow = {
    display: "grid",
    gridTemplateColumns: "28px 1fr auto",
    alignItems: "center",
    gap: 8,
    padding: "6px 2px",
    borderBottom: "1px dashed #e5e7eb",
  };
  const rankDot = {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "#ecfdf5",
    color: "#065f46",
    fontWeight: 800,
    border: "1px solid #a7f3d0",
    fontSize: 12,
  };
  const countChip = {
    background: "#eff6ff",
    color: "#1e3a8a",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid #bfdbfe",
  };

  return (
    <>
      {/* Gradient & waves background */}
      <div style={bgWrap}>
        <svg style={waveTop} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path
            d="M0,64L60,64C120,64,240,64,360,85.3C480,107,600,149,720,149.3C840,149,960,107,1080,80C1200,53,1320,43,1380,37.3L1440,32L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
            fill="#ffffff" />
        </svg>
        <svg style={waveBottom} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path
            d="M0,128L60,122.7C120,117,240,107,360,112C480,117,600,139,720,149.3C840,160,960,160,1080,149.3C1200,139,1320,117,1380,106.7L1440,96L1440,200L1380,200C1320,200,1200,200,1080,200C960,200,840,200,720,200C600,200,480,200,360,200C240,200,120,200,60,200L0,200Z"
            fill="#ffffff" />
        </svg>
      </div>

      <div style={pageWrap}>
        {/* glass hero header */}
        <div style={hero}>
          <div>
            <div style={heroTitle}>📂 Browse Customer Returns (View Only)</div>
            <div style={{ fontWeight: 600, fontSize: ".95rem", color: "#0f172a", opacity: .85 }}>
              Quick KPIs, date filter, and per-day details in a clean dashboard.
            </div>
          </div>
          <div style={brandWrap}>
            <div style={brandTitle}>AL MAWASHI</div>
            <div style={brandSub}>Trans Emirates Livestock Trading L.L.C.</div>
          </div>
        </div>

        {/* KPI row (exactly the ones requested) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
            marginBottom: 16,
            alignItems: "stretch",
          }}
        >
          <DonutCard
            percent={100}
            centerText={String(kpi.totalItems)}
            label="Total returned items"
            subLabel="Across selected range"
            color="#059669"
          />
          <DonutCard
            percent={100}
            centerText={String(kpi.totalQtyKg)}
            label="Returned weight (kg)"
            subLabel="Weight-based items only"
            color="#1d4ed8"
          />
          <DonutCard
            percent={100}
            centerText={String(kpi.totalReports)}
            label="Total reports"
            subLabel="Number of days"
            color="#0ea5e9"
          />

          {/* Top 5 returned products */}
          <div style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(255,255,255,0.7)",
            borderRadius: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,.08)",
            padding: "12px 14px",
            minWidth: 210,
            backdropFilter: "blur(6px)",
          }}>
            <div style={{ textAlign: "center", fontWeight: 900, marginBottom: 6 }}>
              Top 5 Returned Products
            </div>
            {kpi.topProducts.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {kpi.topProducts.map((p, i) => (
                  <li key={i} style={listRow}>
                    <span style={rankDot}>{i + 1}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </span>
                    <span style={countChip}>{p.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ opacity: 0.75, textAlign: "center" }}>No data.</div>
            )}
          </div>

          {/* Top 5 customers */}
          <div style={{
            background: "rgba(255,255,255,0.9)",
            border: "1px solid rgba(255,255,255,0.7)",
            borderRadius: 14,
            boxShadow: "0 2px 12px rgba(0,0,0,.08)",
            padding: "12px 14px",
            minWidth: 210,
            backdropFilter: "blur(6px)",
          }}>
            <div style={{ textAlign: "center", fontWeight: 900, marginBottom: 6 }}>
              Top 5 Customers
            </div>
            {kpi.topCustomers.length ? (
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {kpi.topCustomers.map((p, i) => (
                  <li key={i} style={listRow}>
                    <span style={rankDot}>{i + 1}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={p.name}
                    >
                      {p.name}
                    </span>
                    <span style={countChip}>{p.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ opacity: 0.75, textAlign: "center" }}>No data.</div>
            )}
          </div>
        </div>

        {loadingServer && (
          <div style={{ textAlign: "center", marginBottom: 10, color: "#0f172a", fontWeight: 700 }}>
            ⏳ Loading from server…
          </div>
        )}
        {serverErr && (
          <div style={{ textAlign: "center", marginBottom: 10, color: "#b91c1c", fontWeight: 700 }}>
            {serverErr}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            background: "rgba(255,255,255,.9)",
            border: "1px solid rgba(255,255,255,.7)",
            borderRadius: 16,
            padding: "14px",
            marginBottom: 16,
            boxShadow: "0 10px 24px rgba(2,6,23,.08)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 800, color: "#0f172a" }}>Filter by report date:</span>
            <label>
              From:
              <input
                type="date"
                value={filterFrom}
                onChange={(e) => setFilterFrom(e.target.value)}
                style={{ ...dateInputStyle, marginLeft: 8 }}
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={filterTo}
                onChange={(e) => setFilterTo(e.target.value)}
                style={{ ...dateInputStyle, marginLeft: 8 }}
              />
            </label>
            {(filterFrom || filterTo) && (
              <button
                onClick={() => {
                  setFilterFrom("");
                  setFilterTo("");
                }}
                style={clearBtn}
              >
                🧹 Clear filter
              </button>
            )}
          </div>
        </div>

        {/* Layout: left tree + right details */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
          {/* Left: date tree */}
          <div style={leftTree}>
            {hierarchyAsc.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#334155", fontSize: "1.03em" }}>
                No reports for the selected period.
              </div>
            ) : (
              hierarchyAsc.map(({ year, months }) => {
                const yOpen = !!openYears[year];
                const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
                return (
                  <div key={year} style={{ marginBottom: 4 }}>
                    <div
                      style={{ ...treeHeader, background: yOpen ? "rgba(224,242,254,.6)" : "rgba(239,246,255,.7)" }}
                      onClick={() =>
                        setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))
                      }
                    >
                      <span>{yOpen ? "▼" : "►"} Year {year}</span>
                      <span style={{ color: "#0f172a", fontWeight: 700 }}>{yearCount} days</span>
                    </div>

                    {yOpen && (
                      <div style={{ padding: "6px 0 6px 0" }}>
                        {months.map(({ month, days }) => {
                          const key = `${year}-${month}`;
                          const mOpen = !!openMonths[key];
                          return (
                            <div key={key} style={{ margin: "4px 0 6px" }}>
                              <div
                                style={{ ...treeSubHeader, background: mOpen ? "rgba(240,249,255,.8)" : "#ffffff" }}
                                onClick={() =>
                                  setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))
                                }
                              >
                                <span>{mOpen ? "▾" : "▸"} Month {month}</span>
                                <span style={{ color: "#0f172a" }}>{days.length} days</span>
                              </div>

                              {mOpen && (
                                <div>
                                  {days.map((d) => {
                                    const isSelected = selectedDate === d;
                                    const rep = filteredReportsAsc.find((r) => r.reportDate === d);
                                    return (
                                      <div
                                        key={d}
                                        style={treeDay(isSelected)}
                                        onClick={() => setSelectedDate(d)}
                                      >
                                        <div>📅 {d}</div>
                                        <div style={{ color: "#0f172a", fontWeight: 700 }}>
                                          {(rep?.items?.length || 0)} items
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Right: selected day details */}
          <div style={rightPanel}>
            {selectedReport ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontWeight: "bold", color: "#0f172a", fontSize: "1.15em" }}>
                    Returns details ({selectedReport.reportDate})
                  </div>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      background: "#111827",
                      color: "#fff",
                      border: "none",
                      borderRadius: 12,
                      padding: "9px 14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      boxShadow: "0 10px 22px rgba(17,24,39,.25)"
                    }}
                    title="Export PDF"
                  >
                    ⬇️ Export PDF
                  </button>
                </div>

                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>SL</th>
                      <th style={th}>PRODUCT</th>
                      <th style={th}>ORIGIN</th>
                      <th style={th}>CUSTOMER</th>
                      <th style={th}>QTY</th>
                      <th style={th}>QTY TYPE</th>
                      <th style={th}>EXPIRY</th>
                      <th style={th}>REMARKS</th>
                      <th style={th}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.items || []).map((row, i) => {
                      const curr = actionText(row);
                      const k = itemKey(row);
                      const ch = changeMap.get(k);
                      const showChange = ch && ch.to === curr;

                      return (
                        <tr key={i}>
                          <td style={td}>{i + 1}</td>
                          <td style={td}>
                            <span>{row.productName}</span>
                            {Array.isArray(row.images) && row.images.length > 0 && (
                              <button
                                style={viewImgBtn}
                                onClick={() => openViewer(row.productName || "", row.images)}
                                title="View images"
                              >
                                View images ({row.images.length})
                              </button>
                            )}
                          </td>
                          <td style={td}>{row.origin}</td>
                          <td style={td}>{row.customerName}</td>
                          <td style={td}>{row.quantity}</td>
                          <td style={td}>
                            {row.qtyType === "أخرى / Other" ? row.customQtyType : row.qtyType || ""}
                          </td>
                          <td style={td}>{row.expiry}</td>
                          <td style={td}>{row.remarks}</td>
                          <td style={{ ...td, background: showChange ? "#e9fce9" : td.background }}>
                            {showChange ? (
                              <div style={{ lineHeight: 1.2 }}>
                                <div>
                                  <span style={{ opacity: 0.8 }}>{ch.from}</span>
                                  <span style={{ margin: "0 6px" }}>→</span>
                                  <b>{ch.to}</b>
                                </div>
                                {(() => {
                                  const t = toTs(ch?.at);
                                  if (!t) return null;
                                  const d = new Date(t);
                                  const dd = String(d.getDate()).padStart(2, "0");
                                  const mm = String(d.getMonth() + 1).padStart(2, "0");
                                  const yyyy = d.getFullYear();
                                  return (
                                    <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85, color: "#111" }}>
                                      🗓️ {dd}/{mm}/{yyyy}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              curr
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#334155", padding: 80, fontSize: "1.05em" }}>
                Pick a date from the list to view its details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View-only image viewer */}
      <ImageViewerModal open={viewerOpen} images={viewerImages} title={viewerTitle} onClose={closeViewer} />
    </>
  );
}
