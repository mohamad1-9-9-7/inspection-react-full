// src/pages/BrowseReturns.jsx
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

/* ========== Normalization Helpers ========== */
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
function safeButchery(row) {
  return row?.butchery === "فرع آخر..." ? row?.customButchery || "" : row?.butchery || "";
}
function itemKey(row) {
  return [
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}
function actionText(row) {
  return row?.action === "إجراء آخر..." ? row?.customAction || "" : row?.action || "";
}

/* UI date for table: DD/MM/YYYY with Latin digits */
function formatChangeDate(ch) {
  const t = ch?.ts || toTs(ch?.at);
  if (!t) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(t));
  } catch {
    const d = new Date(t);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}`;
  }
}

/* PDF date: DD/MM/YYYY */
function formatChangeDatePDF(ch) {
  const t = ch?.ts || toTs(ch?.at);
  if (!t) return "";
  const d = new Date(t);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/* Match "Condemnation" exactly (case-insensitive) */
function isCondemnation(s) {
  return (s ?? "").toString().trim().toLowerCase() === "condemnation";
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
}) {
  const size = 114;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - dash / 100);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,.06)",
      padding: "12px 14px",
      display: "grid",
      placeItems: "center",
      gap: 6,
      minWidth: 210
    }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${C} ${C}`} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text
          x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontWeight: 800, fontSize: 20, fill: "#111" }}
        >
          {centerText != null ? centerText : `${dash}%`}
        </text>
      </svg>

      {/* Main label (value/subject) */}
      <div
        style={{
          fontWeight: 800,
          color: "#111",
          textAlign: "center",
          maxWidth: 180,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }}
        title={label}
      >
        {label}
      </div>

      {/* Descriptive line */}
      {subLabel ? (
        <div
          style={{
            fontSize: 12,
            opacity: 0.85,
            textAlign: "center",
            maxWidth: 200,
            lineHeight: 1.2,
          }}
          title={subLabel}
        >
          {subLabel}
        </div>
      ) : null}

      {count != null && (
        <div style={{ opacity: .75, fontWeight: 700 }}>{count}</div>
      )}
      {extra}
    </div>
  );
}

/* ========== Page ========== */
export default function BrowseReturns() {
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
        fetchByType("returns"),
        fetchByType("returns_changes"),
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

  const selectedReport =
    filteredReportsAsc.find((r) => r.reportDate === selectedDate) || null;

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

  /* ================= KPIs ================= */
  const kpi = useMemo(() => {
    let totalItems = 0;
    let totalQtyKg = 0;
    let totalQtyPcs = 0;

    const posCountItems = {};
    const posKg = {};
    const posPcs = {};
    const byActionLatest = {};
    const condemnationNames = {};

    const isKgType = (t) => {
      const s = (t || "").toString().toLowerCase();
      return s.includes("kg") || s.includes("كيلو") || s.includes("كجم");
    };

    const latestActionFor = (date, row) => {
      const inner = changeMapByDate.get(date) || new Map();
      const ch = inner.get(itemKey(row));
      return ch?.to ?? actionText(row);
    };

    filteredReportsAsc.forEach((rep) => {
      const date = rep.reportDate;
      totalItems += (rep.items || []).length;
      (rep.items || []).forEach((it) => {
        const q = Number(it.quantity || 0);

        const pos =
          it.butchery === "فرع آخر..." ? it.customButchery || "—" : it.butchery || "—";
        posCountItems[pos] = (posCountItems[pos] || 0) + 1;

        if (isKgType(it.qtyType)) {
          posKg[pos] = (posKg[pos] || 0) + q;
          totalQtyKg += q;
        } else {
          posPcs[pos] = (posPcs[pos] || 0) + q;
          totalQtyPcs += q;
        }

        const act = latestActionFor(date, it);
        if (act) byActionLatest[act] = (byActionLatest[act] || 0) + 1;

        if (isCondemnation(act)) {
          const name = (it.productName || "—").trim();
          condemnationNames[name] = (condemnationNames[name] || 0) + 1;
        }
      });
    });

    const pickMax = (obj) => {
      let bestK = "—";
      let bestV = -Infinity;
      for (const [k, v] of Object.entries(obj)) {
        if (v > bestV) {
          bestV = v;
          bestK = k;
        }
      }
      return { key: bestK, value: bestV > 0 ? bestV : 0 };
    };

    const topActionLatest = pickMax(byActionLatest);
    const topPosByItems = pickMax(posCountItems);

    // Top POS by kg
    const topKg = pickMax(posKg);
    const topPosByQtyKg = {
      key: topKg.key,
      kg: Math.round((topKg.value || 0) * 1000) / 1000,
      percent: Math.round(((topKg.value || 0) * 100) / (totalQtyKg || 1)),
    };

    // Top POS by pcs
    const topPcs = pickMax(posPcs);
    const topPosByQtyPcs = {
      key: topPcs.key,
      pcs: Math.round((topPcs.value || 0) * 1000) / 1000,
      percent: Math.round(((topPcs.value || 0) * 100) / (totalQtyPcs || 1)),
    };

    const topCondemnList = Object.entries(condemnationNames)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const totalActionItems =
      Object.values(byActionLatest).reduce((a, b) => a + b, 0) || 1;
    const topActions = Object.entries(byActionLatest)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count * 100) / totalActionItems),
      }));

    return {
      totalReports: filteredReportsAsc.length,
      totalItems,
      totalQtyKg,
      totalQtyPcs,
      topActionLatest,
      topPosByItems,
      topPosByQtyKg,
      topPosByQtyPcs,
      topCondemnList,
      topActions,
      actionTotal: totalActionItems,
    };
  }, [filteredReportsAsc, changeMapByDate]);

  /* ========== PDF Export ========== */
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

      const isOther = (v) => v === "إجراء آخر..." || v === "Other...";
      const actionTextSafe = (row) =>
        isOther(row?.action) ? row?.customAction || "" : row?.action || "";

      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const marginL = 20, marginR = 20, marginTop = 80;
      const pageWidth = doc.internal.pageSize.getWidth();
      const avail = pageWidth - marginL - marginR;

      const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Returns Report", marginL, 36);
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
        ["SL", "PRODUCT", "ORIGIN", "POS", "QTY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION"],
      ];

      const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();

      const body = (selectedReport.items || []).map((row, i) => {
        const pos = row.butchery === "فرع آخر..." ? row.customButchery || "" : row.butchery || "";
        const qtyType = row.qtyType === "أخرى" ? row.customQtyType || "" : row.qtyType || "";
        const curr = actionTextSafe(row);
        let actionCell = curr || "";
        const k = itemKey(row);
        const ch = changeMap.get(k);
        if (ch && (ch.to ?? "") === (curr ?? "")) {
          const dateTxt = formatChangeDatePDF(ch);
          actionCell = `${(ch.from || "").trim()} to ${(ch.to || "").trim()}${dateTxt ? `\n${dateTxt}` : ""}`;
        }
        return [
          String(i + 1),
          row.productName || "",
          row.origin || "",
          pos,
          String(row.quantity ?? ""),
          qtyType,
          row.expiry || "",
          row.remarks || "",
          actionCell,
        ];
      });

      const frac = [0.05, 0.18, 0.09, 0.08, 0.06, 0.08, 0.08, 0.18, 0.20];
      const columnStyles = {};
      frac.forEach((f, idx) => (columnStyles[idx] = { cellWidth: Math.floor(avail * f) }));
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
          overflow: "linebreak",
          wordBreak: "break-word",
          minCellHeight: 16,
        },
        headStyles: {
          fillColor: [219, 234, 254],
          textColor: [17, 17, 17],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles,
        didDrawPage: () => {
          drawHeader();
        },
      });

      doc.save(`returns_${selectedReport.reportDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to generate PDF. Please try again.");
    }
  };

  /* ========== Styles ========== */
  const kpiBox = {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    boxShadow: "0 2px 12px rgba(0,0,0,.06)",
    padding: "12px 14px",
    color: "#111",
    minWidth: 210,
  };
  const kpiTitle = { fontWeight: "bold", marginBottom: 6 };

  const dateInputStyle = {
    borderRadius: 8,
    border: "1.5px solid #93c5fd",
    background: "#eff6ff",
    padding: "7px 13px",
    fontSize: "1em",
    minWidth: 120,
    color: "#111",
  };
  const clearBtn = {
    background: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "7px 18px",
    fontWeight: "bold",
    fontSize: "1em",
    cursor: "pointer",
    boxShadow: "0 1px 6px #bfdbfe",
  };
  const leftTree = {
    minWidth: 280,
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 1px 10px #e8daef66",
    padding: "6px 0",
    border: "1px solid #e5e7eb",
    maxHeight: "70vh",
    overflow: "auto",
    color: "#111",
  };
  const treeHeader = {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
    color: "#111",
    borderBottom: "1px solid #e5e7eb",
  };
  const treeSubHeader = {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 14px",
    cursor: "pointer",
    color: "#111",
    borderBottom: "1px dashed #e5e7eb",
  };
  const treeDay = (active) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 14px",
    cursor: "pointer",
    borderBottom: "1px dashed #e5e7eb",
    background: active ? "#e0f2fe" : "#fff",
    borderRight: active ? "5px solid #3b82f6" : "none",
    fontSize: "0.98em",
    color: "#111",
  });

  const rightPanel = {
    flex: 1,
    background: "#fff",
    borderRadius: 15,
    boxShadow: "0 1px 12px #e8daef44",
    minHeight: 320,
    padding: "25px 28px",
    color: "#111",
  };
  const table = {
    width: "100%",
    background: "#fff",
    borderRadius: 8,
    borderCollapse: "collapse",
    border: "1px solid #b6c8e3",
    marginTop: 6,
    minWidth: 800,
    color: "#111",
  };
  const th = {
    padding: "10px 8px",
    textAlign: "center",
    fontSize: "0.98em",
    fontWeight: "bold",
    border: "1px solid #b6c8e3",
    background: "#dbeafe",
    color: "#111",
  };
  const td = {
    padding: "9px 8px",
    textAlign: "center",
    minWidth: 90,
    border: "1px solid #b6c8e3",
    background: "#eef6ff",
    color: "#111",
  };

  const brandWrap = {
    position: "fixed",
    top: 10,
    right: 16,
    textAlign: "right",
    zIndex: 9999,
    pointerEvents: "none",
  };
  const brandTitle = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 900,
    letterSpacing: "1px",
    fontSize: "18px",
    color: "#b91c1c",
  };
  const brandSub = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 600,
    fontSize: "11px",
    color: "#374151",
    opacity: 0.9,
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
    width: 24,
    height: 24,
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
    padding: "2px 8px",
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid #bfdbfe",
  };

  const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();

  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "linear-gradient(180deg, #f7f2fb 0%, #f4f6fa 100%)",
        minHeight: "100vh",
        direction: "ltr",
        color: "#111",
      }}
    >
      <div style={brandWrap}>
        <div style={brandTitle}>AL MAWASHI</div>
        <div style={brandSub}>Trans Emirates Livestock Trading L.L.C.</div>
      </div>

      <h2
        style={{
          textAlign: "center",
          color: "#1f2937",
          fontWeight: "bold",
          marginBottom: "1.2rem",
          letterSpacing: ".2px",
        }}
      >
        📂 Browse Returns Reports (View Only)
      </h2>

      {/* KPI donuts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
          marginBottom: 14,
          alignItems: "stretch",
        }}
      >
        {/* Total items */}
        <DonutCard
          percent={100}
          centerText="ALL"
          label="Total items"
          subLabel="All items across selected range"
          count={kpi.totalItems}
          color="#059669"
        />

        {/* Top actions (share of latest actions) */}
        {kpi.topActions.map((a, idx) => (
          <DonutCard
            key={a.name + idx}
            label={a.name}
            subLabel="Share of latest actions"
            count={a.count}
            percent={a.percent}
            color={["#166534", "#a21caf", "#b45309"][idx % 3]}
          />
        ))}

        {/* Total reports */}
        <DonutCard
          percent={100}
          centerText={String(kpi.totalReports)}
          label="Total reports"
          subLabel="Reports found in the selected date range"
          color="#0ea5e9"
        />

        {/* Total quantity (kg) */}
        <DonutCard
          percent={100}
          centerText={String(Math.round(kpi.totalQtyKg * 1000) / 1000)}
          label="Total quantity (kg)"
          subLabel="Weight-based items only"
          color="#2563eb"
        />

        {/* Total quantity (pcs) */}
        <DonutCard
          percent={100}
          centerText={String(Math.round(kpi.totalQtyPcs * 1000) / 1000)}
          label="Total quantity (pcs)"
          subLabel="Piece-based items only"
          color="#1d4ed8"
        />

        {/* Top POS by item count */}
        <DonutCard
          percent={Math.round((kpi.topPosByItems.value * 100) / (kpi.totalItems || 1))}
          label={kpi.topPosByItems.key || "—"}
          subLabel="Top POS by item count"
          count={`${kpi.topPosByItems.value} items`}
          color="#b45309"
        />

        {/* Top POS by total quantity (kg) */}
        <DonutCard
          percent={kpi.topPosByQtyKg.percent}
          label={kpi.topPosByQtyKg.key || "—"}
          subLabel="Top POS by total quantity (kg)"
          count={`${kpi.topPosByQtyKg.kg} kg`}
          color="#0e7490"
        />

        {/* Top POS by total quantity (pcs) */}
        <DonutCard
          percent={kpi.topPosByQtyPcs.percent}
          label={kpi.topPosByQtyPcs.key || "—"}
          subLabel="Top POS by total quantity (pcs)"
          count={`${kpi.topPosByQtyPcs.pcs} pcs`}
          color="#0284c7"
        />

        {/* Top 5 Condemnation list */}
        <div style={kpiBox}>
          <div style={{ ...kpiTitle, textAlign: "center" }}>
            Top 5 Condemnation
          </div>

          {kpi.topCondemnList.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {kpi.topCondemnList.map((p, i) => (
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
            <div style={{ opacity: 0.75, textAlign: "center" }}>
              No items with Condemnation status.
            </div>
          )}
        </div>
      </div>

      {loadingServer && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#1f2937" }}>
          ⏳ Loading from server…
        </div>
      )}
      {serverErr && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#b91c1c" }}>
          {serverErr}
        </div>
      )}

      {/* Controls */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "12px",
          marginBottom: 16,
          boxShadow: "0 2px 14px #e8daef66",
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
          <span style={{ fontWeight: 700 }}>Filter by report date:</span>
          <label>
            From:
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={dateInputStyle}
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={dateInputStyle}
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
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: "1.03em" }}>
              No reports for the selected period.
            </div>
          ) : (
            hierarchyAsc.map(({ year, months }) => {
              const yOpen = !!openYears[year];
              const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
              return (
                <div key={year} style={{ marginBottom: 4 }}>
                  <div
                    style={{ ...treeHeader, background: yOpen ? "#e0f2fe" : "#eff6ff" }}
                    onClick={() =>
                      setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))
                    }
                  >
                    <span>{yOpen ? "▼" : "►"} Year {year}</span>
                    <span style={{ color: "#111", fontWeight: 700 }}>{yearCount} days</span>
                  </div>

                  {yOpen && (
                    <div style={{ padding: "6px 0 6px 0" }}>
                      {months.map(({ month, days }) => {
                        const key = `${year}-${month}`;
                        const mOpen = !!openMonths[key];
                        return (
                          <div key={key} style={{ margin: "4px 0 6px" }}>
                            <div
                              style={{ ...treeSubHeader, background: mOpen ? "#f0f9ff" : "#ffffff" }}
                              onClick={() =>
                                setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))
                              }
                            >
                              <span>{mOpen ? "▾" : "▸"} Month {month}</span>
                              <span style={{ color: "#111" }}>{days.length} days</span>
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
                                      <div style={{ color: "#111", fontWeight: 700 }}>
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
                <div style={{ fontWeight: "bold", color: "#111", fontSize: "1.2em" }}>
                  Returns details ({selectedReport.reportDate})
                </div>
                <button
                  onClick={handleExportPDF}
                  style={{
                    background: "#111827",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 14px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                  title="Export PDF"
                >
                  ⬇️ Export PDF
                </button>
              </div>

              <table style={table}>
                <thead>
                  <tr style={{ background: "#dbeafe", color: "#111" }}>
                    <th style={th}>SL.NO</th>
                    <th style={th}>PRODUCT NAME</th>
                    <th style={th}>ORIGIN</th>
                    <th style={th}>POS</th>
                    <th style={th}>QUANTITY</th>
                    <th style={th}>QTY TYPE</th>
                    <th style={th}>EXPIRY DATE</th>
                    <th style={th}>REMARKS</th>
                    <th style={th}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.items.map((row, i) => {
                    const curr = actionText(row);
                    const k = itemKey(row);
                    const ch = changeMap.get(k);
                    const showChange = ch && ch.to === curr;

                    return (
                      <tr key={i}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{row.productName}</td>
                        <td style={td}>{row.origin}</td>
                        <td style={td}>
                          {row.butchery === "فرع آخر..." ? row.customButchery : row.butchery}
                        </td>
                        <td style={td}>{row.quantity}</td>
                        <td style={td}>
                          {row.qtyType === "أخرى" ? row.customQtyType : row.qtyType || ""}
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
                              <span
                                style={{
                                  display: "inline-block",
                                  marginTop: 4,
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  background: "#16a34a",
                                  color: "#fff",
                                  fontSize: 12,
                                  fontWeight: 700,
                                }}
                              >
                                Changed
                              </span>
                              {formatChangeDate(ch) && (
                                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85, color: "#111" }}>
                                  🗓️ {formatChangeDate(ch)}
                                </div>
                              )}
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
            <div style={{ textAlign: "center", color: "#6b7280", padding: 80, fontSize: "1.05em" }}>
              Pick a date from the list to view its details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
