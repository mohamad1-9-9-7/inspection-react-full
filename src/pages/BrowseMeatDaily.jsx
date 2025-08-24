// src/pages/BrowseMeatDaily.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========== API ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchDays() {
  const res = await fetch(`${API_BASE}/api/reports?type=meat_daily`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data || [];
}

/* ========== Helpers ========== */
function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}
function pickLatestPerDate(raw) {
  const out = new Map();
  raw.forEach((rec) => {
    const p = rec?.payload || {};
    const d = p.reportDate || rec?.reportDate || "";
    if (!d) return;
    const ts =
      toTs(rec?.updatedAt) || toTs(rec?.createdAt) || toTs(rec?._id) || toTs(p?._clientSavedAt);
    const curr = out.get(d);
    if (!curr || ts > curr.ts)
      out.set(d, { reportDate: d, items: Array.isArray(p.items) ? p.items : [], ts });
  });
  return Array.from(out.values());
}

/* ========== Donut KPI Card ========== */
function DonutCard({
  percent = 0,
  label = "",
  subLabel = "",
  count = null,
  color = "#0ea5e9",
  centerText = null,
  size = 140,
  stroke = 14,
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - dash / 100);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(255,255,255,0.7)",
        borderRadius: 16,
        boxShadow: "0 10px 24px rgba(2,6,23,.12)",
        padding: "14px 16px",
        display: "grid",
        placeItems: "center",
        gap: 8,
        minWidth: 230,
        backdropFilter: "blur(6px)",
        color: "#0f172a",
      }}
    >
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${C} ${C}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ fontWeight: 900, fontSize: 22, fill: "#0f172a" }}
        >
          {centerText != null ? centerText : `${dash}%`}
        </text>
      </svg>

      <div
        style={{
          fontWeight: 900,
          textAlign: "center",
          maxWidth: 220,
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
            opacity: 0.85,
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
        <div style={{ opacity: 0.85, fontWeight: 800, marginTop: 2 }}>{count}</div>
      )}
    </div>
  );
}

/* ========== Page ========== */
export default function BrowseMeatDaily() {
  const [days, setDays] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");

  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [selectedDate, setSelectedDate] = useState("");

  async function reload() {
    try {
      const raw = await fetchDays();
      const latest = pickLatestPerDate(raw).sort((a, b) =>
        (a.reportDate || "").localeCompare(b.reportDate || "")
      );
      setDays(latest);
      if (!selectedDate && latest.length) {
        setSelectedDate(latest[0].reportDate);
        const y = latest[0].reportDate.slice(0, 4);
        const m = latest[0].reportDate.slice(5, 7);
        setOpenYears((p) => ({ ...p, [y]: true }));
        setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
      }
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch from server.");
      setTimeout(() => setErr(""), 2500);
    }
  }
  useEffect(() => {
    reload();
  }, []); // eslint-disable-line

  /* Filtered */
  const filteredAsc = useMemo(() => {
    const arr = days.filter((r) => {
      const d = r.reportDate || "";
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
    arr.sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
    return arr;
  }, [days, from, to]);

  useEffect(() => {
    if (!filteredAsc.length) {
      setSelectedDate("");
      return;
    }
    const still = filteredAsc.some((r) => r.reportDate === selectedDate);
    if (!still) {
      setSelectedDate(filteredAsc[0].reportDate);
      const y = filteredAsc[0].reportDate.slice(0, 4);
      const m = filteredAsc[0].reportDate.slice(5, 7);
      setOpenYears((p) => ({ ...p, [y]: true }));
      setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    }
  }, [filteredAsc, selectedDate]);

  const selectedReport =
    filteredAsc.find((r) => r.reportDate === selectedDate) || null;

  /* Year -> Month -> Day hierarchy (ascending) */
  const hierarchyAsc = useMemo(() => {
    const years = new Map();
    filteredAsc.forEach((rep) => {
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
  }, [filteredAsc]);

  /* ================= KPIs ================= */
  const kpi = useMemo(() => {
    let totalItems = 0;
    let totalKg = 0;
    let totalPcs = 0;
    const byStatus = {};
    const byPos = {};

    const isKgType = (t) => {
      const s = (t || "").toString().toLowerCase();
      return s.includes("kg") || s.includes("كيلو") || s.includes("كجم");
    };
    const parsePos = (remarks) => {
      const m = /pos\s*(\d+)/i.exec(remarks || "");
      return m ? `POS ${m[1]}` : "—";
    };

    filteredAsc.forEach((rep) => {
      (rep.items || []).forEach((it) => {
        totalItems += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) totalKg += q;
        else totalPcs += q;

        const st = (it.status || "—").trim();
        byStatus[st] = (byStatus[st] || 0) + 1;

        const pos = parsePos(it.remarks);
        byPos[pos] = (byPos[pos] || 0) + 1;
      });
    });

    const toArr = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const topStatus = toArr(byStatus)[0] || ["—", 0];
    const topPos = toArr(byPos)[0] || ["—", 0];

    const totalStatus = Object.values(byStatus).reduce((a, b) => a + b, 0) || 1;
    const statusShare = Math.round((topStatus[1] * 100) / totalStatus);

    return {
      totalReports: filteredAsc.length,
      totalItems,
      totalKg: Math.round(totalKg * 1000) / 1000,
      totalPcs: Math.round(totalPcs * 1000) / 1000,
      topStatusName: topStatus[0],
      topStatusCount: topStatus[1],
      statusShare,
      topPosName: topPos[0],
      topPosCount: topPos[1],
    };
  }, [filteredAsc]);

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

      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const marginL = 20,
        marginR = 20,
        marginTop = 80;
      const pageWidth = doc.internal.pageSize.getWidth();
      const avail = pageWidth - marginL - marginR;

      const drawHeader = () => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Meat Daily Status Report", marginL, 36);
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

      const head = [["SL", "PRODUCT", "QUANTITY", "QTY TYPE", "STATUS", "EXPIRY DATE", "REMARKS"]];
      const body = (selectedReport.items || []).map((row, i) => [
        String(i + 1),
        row.productName || "",
        String(row.quantity ?? ""),
        row.qtyType || "",
        row.status || "",
        row.expiry || "",
        row.remarks || "",
      ]);

      const frac = [0.06, 0.22, 0.11, 0.11, 0.14, 0.14, 0.22];
      const columnStyles = {};
      frac.forEach((f, idx) => (columnStyles[idx] = { cellWidth: Math.floor(avail * f) }));
      columnStyles[0].halign = "center";
      columnStyles[2].halign = "center";
      columnStyles[3].halign = "center";
      columnStyles[5].halign = "center";

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

      doc.save(`meat_daily_${selectedReport.reportDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to generate PDF. Please try again.");
    }
  };

  /* ========== Styles ========== */
  // Background & waves
  const bgWrap = {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    background:
      "radial-gradient(1200px 600px at 100% -10%, #67e8f9 0%, transparent 60%), linear-gradient(135deg,#6d28d9 0%, #4f46e5 45%, #06b6d4 100%)",
  };
  const waveTop = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    opacity: 0.25,
  };
  const waveBottom = {
    position: "absolute",
    bottom: -2,
    left: 0,
    width: "100%",
    opacity: 0.22,
    transform: "scaleY(-1)",
  };

  const pageWrap = {
    position: "relative",
    zIndex: 1,
    fontFamily: "Cairo, sans-serif",
    padding: "2.2rem",
    minHeight: "100vh",
    direction: "ltr",
    color: "#111",
  };

  // Hero
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
  const heroSub = {
    fontWeight: 600,
    fontSize: "0.95rem",
    color: "#0f172a",
    opacity: 0.85,
  };

  const kpiBox = {
    background: "rgba(255,255,255,0.9)",
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: 14,
    boxShadow: "0 2px 12px rgba(0,0,0,.08)",
    padding: "12px 14px",
    color: "#111",
    minWidth: 210,
    backdropFilter: "blur(6px)",
  };

  const dateInputStyle = {
    borderRadius: 10,
    border: "1.5px solid rgba(255,255,255,.8)",
    background: "rgba(255,255,255,.85)",
    padding: "8px 13px",
    fontSize: "1em",
    minWidth: 120,
    color: "#111",
    boxShadow: "0 4px 10px rgba(0,0,0,.06)",
    marginLeft: 8,
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
  };
  const td = {
    padding: "10px 8px",
    textAlign: "center",
    minWidth: 90,
    border: "1px solid #b6c8e3",
    background: "#f8fbff",
    color: "#0f172a",
  };

  const brandWrap = { textAlign: "right" };
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
    color: "#0f172a",
    opacity: 0.9,
  };

  return (
    <>
      {/* Gradient & waves background */}
      <div style={bgWrap}>
        <svg style={waveTop} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path
            d="M0,64L60,64C120,64,240,64,360,85.3C480,107,600,149,720,149.3C840,149,960,107,1080,80C1200,53,1320,43,1380,37.3L1440,32L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
            fill="#ffffff"
          />
        </svg>
        <svg style={waveBottom} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path
            d="M0,128L60,122.7C120,117,240,107,360,112C480,117,600,139,720,149.3C840,160,960,160,1080,149.3C1200,139,1320,117,1380,106.7L1440,96L1440,200L1380,200C1320,200,1200,200,1080,200C960,200,840,200,720,200C600,200,480,200,360,200C240,200,120,200,60,200L0,200Z"
            fill="#ffffff"
          />
        </svg>
      </div>

      <div style={pageWrap}>
        {/* glass hero header */}
        <div style={hero}>
          <div>
            <div style={heroTitle}>📂 Browse Meat Daily Reports (View Only)</div>
            <div style={heroSub}>KPIs, date filter, and per-day details with PDF export.</div>
          </div>
          <div style={brandWrap}>
            <div style={brandTitle}>AL MAWASHI</div>
            <div style={brandSub}>Trans Emirates Livestock Trading L.L.C.</div>
          </div>
        </div>

        {/* KPI donuts */}
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
            centerText="ALL"
            label="Total items"
            subLabel="All items across selected range"
            count={kpi.totalItems}
            color="#059669"
          />
          <DonutCard
            percent={100}
            centerText={String(kpi.totalReports)}
            label="Total reports"
            subLabel="Reports in selected range"
            color="#0ea5e9"
          />
          <DonutCard
            percent={100}
            centerText={String(kpi.totalKg)}
            label="Total quantity (kg)"
            subLabel="Weight-based items only"
            color="#2563eb"
          />
          <DonutCard
            percent={100}
            centerText={String(kpi.totalPcs)}
            label="Total quantity (pcs)"
            subLabel="Piece-based items only"
            color="#1d4ed8"
          />
          <DonutCard
            percent={kpi.statusShare}
            centerText={`${kpi.statusShare}%`}
            label={kpi.topStatusName || "—"}
            subLabel="Top status (share of items)"
            count={`${kpi.topStatusCount} items`}
            color="#b45309"
          />
          <DonutCard
            percent={Math.min(100, Math.round((kpi.topPosCount * 100) / (kpi.totalItems || 1)))}
            centerText={String(kpi.topPosCount)}
            label={kpi.topPosName || "—"}
            subLabel="Top POS by item count"
            color="#0e7490"
          />
        </div>

        {err && (
          <div style={{ textAlign: "center", marginBottom: 10, color: "#b91c1c", fontWeight: 700 }}>
            {err}
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
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={dateInputStyle}
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={dateInputStyle}
              />
            </label>
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom("");
                  setTo("");
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
                                    const rep = filteredAsc.find((r) => r.reportDate === d);
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
                    Meat daily details ({selectedReport.reportDate})
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
                      boxShadow: "0 10px 22px rgba(17,24,39,.25)",
                    }}
                    title="Export PDF"
                  >
                    ⬇️ Export PDF
                  </button>
                </div>

                <table style={table}>
                  <thead>
                    <tr>
                      <th style={th}>SL.NO</th>
                      <th style={th}>PRODUCT NAME</th>
                      <th style={th}>QUANTITY</th>
                      <th style={th}>QTY TYPE</th>
                      <th style={th}>STATUS</th>
                      <th style={th}>EXPIRY DATE</th>
                      <th style={th}>REMARKS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.items.map((row, i) => (
                      <tr key={i}>
                        <td style={td}>{i + 1}</td>
                        <td style={td}>{row.productName}</td>
                        <td style={td}>{row.quantity}</td>
                        <td style={td}>{row.qtyType}</td>
                        <td style={td}>{row.status}</td>
                        <td style={td}>{row.expiry}</td>
                        <td style={td}>{row.remarks}</td>
                      </tr>
                    ))}
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
    </>
  );
}
