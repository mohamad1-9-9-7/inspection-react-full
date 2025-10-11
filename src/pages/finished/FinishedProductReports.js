// src/pages/FinishedProductReports.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";

const STORAGE_KEY = "finished_products_reports";

/* ============ Utils ============ */
function daysBetween(from, to) {
  if (!from || !to) return "";
  const a = new Date(from);
  const b = new Date(to);
  const d = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return Number.isFinite(d) ? d : "";
}
function parseYMD(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { y: "", m: "", d: "" };
  return { y: m[1], m: m[2], d: m[3] };
}
function pad2(v) {
  return String(v || "").padStart(2, "0");
}
function formatDMY(iso) {
  if (!iso) return "-";
  try {
    const { y, m, d } = parseYMD(iso);
    if (y && m && d) return `${pad2(d)}/${pad2(m)}/${y}`;
    const dt = new Date(iso);
    if (!isNaN(dt)) {
      const dy = dt.getFullYear();
      const mm = pad2(dt.getMonth() + 1);
      const dd = pad2(dt.getDate());
      return `${dd}/${mm}/${dy}`;
    }
    return iso;
  } catch {
    return iso;
  }
}
function downloadFile(filename, content, type = "application/json") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* Highlight helper */
function highlightMatch(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const parts = String(text ?? "").split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* Status helpers */
function statusFromDates(reportDate, expiryDate) {
  const d = daysBetween(reportDate, expiryDate);
  if (d === "") return { days: "", label: "—", tone: "muted" };
  if (d <= 0) return { days: d, label: "EXP", tone: "danger" };
  if (d <= 6) return { days: d, label: "NEAR EXPIRED", tone: "warn" };
  return { days: d, label: "—", tone: "ok" };
}

/* ============ Component ============ */
export default function FinishedProductReports() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [treeFilter, setTreeFilter] = useState({ year: "", month: "", day: "" });

  // expand states (persisted)
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [openDays, setOpenDays] = useState({});

  // sort
  const [sortBy, setSortBy] = useState("date_desc");

  // JSON import
  const jsonInputRef = useRef(null);
  const [importMode, setImportMode] = useState("merge");

  // Delete confirm & undo
  const [confirmState, setConfirmState] = useState({ open: false, target: null, type: null });
  const [undoState, setUndoState] = useState({ visible: false, payload: null, timer: null });

  // Image viewer state
  const [imgViewer, setImgViewer] = useState({ open: false, images: [], index: 0, title: "" });

  /* Load once */
  useEffect(() => {
    reloadFromStorage();
    const saved = JSON.parse(localStorage.getItem("finished_reports_ui") || "{}");
    if (saved.search) setSearch(saved.search);
    if (saved.sortBy) setSortBy(saved.sortBy);
    if (saved.treeFilter) setTreeFilter(saved.treeFilter);
    if (saved.openYears) setOpenYears(saved.openYears);
    if (saved.openMonths) setOpenMonths(saved.openMonths);
    if (saved.openDays) setOpenDays(saved.openDays);
  }, []);

  /* Persist UI state */
  useEffect(() => {
    const payload = { search, sortBy, treeFilter, openYears, openMonths, openDays };
    localStorage.setItem("finished_reports_ui", JSON.stringify(payload));
  }, [search, sortBy, treeFilter, openYears, openMonths, openDays]);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  function reloadFromStorage() {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const flat = [];
    reports.forEach((rep) => {
      (rep.products || []).forEach((p, idx) => {
        flat.push({
          ...p,
          reportDate: rep.reportDate || "",
          reportTitle: rep.reportTitle || "",
          __reportId: rep.id,
          __productIndex: idx,
        });
      });
    });
    setRows(flat);
  }

  /* Build date tree from all rows */
  const groupedByYMD = useMemo(() => {
    const g = {};
    for (const r of rows) {
      const { y, m, d } = parseYMD(r.reportDate || "");
      const yy = y || "Unknown";
      const mm = m || "00";
      const dd = d || "00";
      g[yy] = g[yy] || {};
      g[yy][mm] = g[yy][mm] || {};
      g[yy][mm][dd] = g[yy][mm][dd] || [];
      g[yy][mm][dd].push(r);
    }
    return g;
  }, [rows]);

  /* Apply search + date filter */
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return rows.filter((r) => {
      if (treeFilter.year) {
        const { y, m, d } = parseYMD(r.reportDate || "");
        if (y !== treeFilter.year) return false;
        if (treeFilter.month && m !== treeFilter.month) return false;
        if (treeFilter.day && d !== treeFilter.day) return false;
      }
      if (!q) return true;
      const hay = [
        r.product, r.customer, r.orderNo, r.time, r.slaughterDate, r.expiryDate,
        r.temp, r.quantity, r.unitOfMeasure, r.overallCondition, r.remarks,
        r.reportDate, r.reportTitle,
      ].map((v) => String(v ?? "")).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [rows, debouncedSearch, treeFilter]);

  /* Group filtered rows by report (reportId) */
  const reportsArr = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const id = r.__reportId;
      if (!m.has(id)) {
        m.set(id, {
          reportId: id,
          reportTitle: r.reportTitle || "",
          reportDate: r.reportDate || "",
          rows: [],
        });
      }
      m.get(id).rows.push(r);
    }
    let arr = Array.from(m.values());

    if (sortBy === "date_desc") {
      arr = arr.sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || "") || (a.reportTitle || "").localeCompare(b.reportTitle || ""));
    } else if (sortBy === "title_az") {
      arr = arr.sort((a, b) => (a.reportTitle || "").localeCompare(b.reportTitle || ""));
    } else if (sortBy === "customer_az") {
      const firstCustomer = (rep) => (rep.rows[0]?.customer || "");
      arr = arr.sort((a, b) => firstCustomer(a).localeCompare(firstCustomer(b)));
    } else if (sortBy === "qty_desc") {
      const sumQty = (rep) => rep.rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
      arr = arr.sort((a, b) => sumQty(b) - sumQty(a));
    }
    return arr;
  }, [filtered, sortBy]);

  const totalQty = useMemo(() => filtered.reduce((s, r) => s + (Number(r.quantity) || 0), 0), [filtered]);

  /* Actions */
  const requestDeleteRow = (row) => setConfirmState({ open: true, target: row, type: "row" });
  const requestDeleteReport = (reportId) => setConfirmState({ open: true, target: reportId, type: "report" });

  const confirmDeletion = () => {
    if (!confirmState.open) return;
    if (confirmState.type === "row") {
      const row = confirmState.target;
      const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const repIdx = reports.findIndex((r) => r.id === row.__reportId);
      if (repIdx === -1) return closeConfirm();
      const products = reports[repIdx].products || [];
      const targetIdx = products.findIndex(
        (p, i) =>
          i === row.__productIndex &&
          p.product === row.product &&
          p.orderNo === row.orderNo &&
          p.customer === row.customer
      );
      if (targetIdx === -1) return closeConfirm();

      const removed = products.splice(targetIdx, 1)[0];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      reloadFromStorage();
      closeConfirm();

      if (undoState.timer) clearTimeout(undoState.timer);
      const timer = setTimeout(() => setUndoState({ visible: false, payload: null, timer: null }), 7000);
      setUndoState({ visible: true, payload: { repId: row.__reportId, index: targetIdx, row: removed }, timer });
    } else if (confirmState.type === "report") {
      const reportId = confirmState.target;
      const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const backup = reports.find((r) => r.id === reportId);
      const next = reports.filter((r) => r.id !== reportId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      reloadFromStorage();
      closeConfirm();

      if (undoState.timer) clearTimeout(undoState.timer);
      const timer = setTimeout(() => setUndoState({ visible: false, payload: null, timer: null }), 7000);
      setUndoState({ visible: true, payload: { restoreReport: backup || null }, timer });
    }
  };
  const closeConfirm = () => setConfirmState({ open: false, target: null, type: null });

  const undoLast = () => {
    if (!undoState.visible || !undoState.payload) return;
    if (undoState.timer) clearTimeout(undoState.timer);

    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (undoState.payload.restoreReport) {
      const rep = undoState.payload.restoreReport;
      const exists = reports.some((r) => r.id === rep.id);
      const restored = exists ? reports.map((r) => (r.id === rep.id ? rep : r)) : [...reports, rep];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(restored));
    } else {
      const { repId, index, row } = undoState.payload;
      const rep = reports.find((r) => r.id === repId);
      if (rep) {
        rep.products = rep.products || [];
        rep.products.splice(Math.min(index, rep.products.length), 0, row);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      }
    }
    reloadFromStorage();
    setUndoState({ visible: false, payload: null, timer: null });
  };

  /* XLSX Export */
  function exportRowsToXLSX(data, filename) {
    const headers = [
      "Product","Customer","Order No","TIME","Slaughter Date","Expiry Date",
      "TEMP","Quantity","Unit of Measure","OVERALL CONDITION","REMARKS",
      "Report Title","Report Date","Days to Expiry","Status"
    ];
    const aoa = [headers];
    data.forEach((r) => {
      const st = statusFromDates(r.reportDate, r.expiryDate);
      aoa.push([
        r.product, r.customer, r.orderNo, r.time, r.slaughterDate, r.expiryDate,
        r.temp, r.quantity, r.unitOfMeasure || "KG", r.overallCondition, r.remarks,
        r.reportTitle || "", r.reportDate || "", st.days === "" ? "" : st.days, st.label
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 34 }, { wch: 20 }, { wch: 16 }, { wch: 10 }, { wch: 14 },
      { wch: 12 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 18 },
      { wch: 26 }, { wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ];

    const headFill = { patternType: "solid", fgColor: { rgb: "F2F6FF" } };
    const headFont = { bold: true, color: { rgb: "1F2937" } };
    const border = { top:{style:"thin",color:{rgb:"94A3B8"}}, bottom:{style:"thin",color:{rgb:"94A3B8"}}, left:{style:"thin",color:{rgb:"CBD5E1"}}, right:{style:"thin",color:{rgb:"CBD5E1"}} };

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      ws[addr].s = { fill: headFill, font: headFont, alignment:{ horizontal: "center", vertical: "center" }, border };
    }
    for (let R = 1; R <= range.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: 7 });
      if (ws[addr]) ws[addr].t = "n";
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, filename);
  }
  const exportXLSXFiltered = () => {
    if (filtered.length === 0) return alert("No data to export.");
    exportRowsToXLSX(filtered, "FinishedReports_Filtered.xlsx");
  };
  const exportReportXLSX = (reportId) => {
    const rowsOfReport = filtered.filter((r) => r.__reportId === reportId);
    if (rowsOfReport.length === 0) return alert("No data for this report.");
    exportRowsToXLSX(rowsOfReport, `Report_${reportId}.xlsx`);
  };

  /* JSON Export/Import (full) */
  const exportJSON = () => {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    downloadFile("FinishedReports.json", JSON.stringify(reports, null, 2));
  };
  const importJSONClick = () => jsonInputRef.current?.click();
  const onImportJSON = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const incoming = JSON.parse(text);
      if (!Array.isArray(incoming)) throw new Error("JSON must be an array of reports.");
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const next = importMode === "replace" ? incoming : mergeReports(current, incoming);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      reloadFromStorage();
      alert("Imported successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to import JSON.");
    } finally {
      e.target.value = "";
    }
  };
  function mergeReports(current, incoming) {
    const map = new Map(current.map((r) => [r.id, { ...r, products: [...(r.products || [])] }]));
    for (const rep of incoming) {
      if (!rep || typeof rep !== "object") continue;
      if (map.has(rep.id)) {
        const m = map.get(rep.id);
        m.products = [...(m.products || []), ...((rep.products || []))];
        map.set(rep.id, m);
      } else {
        map.set(rep.id, rep);
      }
    }
    return Array.from(map.values());
  }

  /* Left tree helpers */
  const toggleYear = (y) => setOpenYears((s) => ({ ...s, [y]: !s[y] }));
  const toggleMonth = (y, m) => setOpenMonths((s) => ({ ...s, [`${y}-${m}`]: !s[`${y}-${m}`] }));
  const toggleDay = (y, m, d) => setOpenDays((s) => ({ ...s, [`${y}-${m}-${d}`]: !s[`${y}-${m}-${d}`] }));
  const isOpenMonth = (y, m) => !!openMonths[`${y}-${m}`];
  const isOpenDay = (y, m, d) => !!openDays[`${y}-${m}-${d}`];

  const selectYear = (y) => setTreeFilter({ year: y, month: "", day: "" });
  const selectMonth = (y, m) => setTreeFilter({ year: y, month: m, day: "" });
  const selectDay = (y, m, d) => setTreeFilter({ year: y, month: m, day: d });
  const clearTreeFilter = () => setTreeFilter({ year: "", month: "", day: "" });

  // Image viewer
  const openImages = (row) => {
    const imgs = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
    if (!imgs.length) return;
    setImgViewer({ open: true, images: imgs, index: 0, title: row.product || "Images" });
  };
  const closeImages = () => setImgViewer({ open: false, images: [], index: 0, title: "" });
  const prevImg = () => setImgViewer((s) => ({ ...s, index: (s.index - 1 + s.images.length) % s.images.length }));
  const nextImg = () => setImgViewer((s) => ({ ...s, index: (s.index + 1) % s.images.length }));
  const jumpImg = (i) => setImgViewer((s) => ({ ...s, index: i }));

  /* ===== Filter label as Y / MM/YYYY / DD/MM/YYYY ===== */
  const filterLabel = useMemo(() => {
    const { year, month, day } = treeFilter;
    if (!year) return "";
    if (year && !month && !day) return `${year}`;
    if (year && month && !day) return `${pad2(month)}/${year}`;
    return `${pad2(day)}/${pad2(month)}/${year}`;
  }, [treeFilter]);

  return (
    <div
      className="layout"
      style={{
        display: "grid",
        gridTemplateColumns: "520px 1fr",
        gap: 18,
        padding: "1.4rem 1rem 2.4rem",
        fontFamily: "Cairo, Inter, system-ui, sans-serif",
        minHeight: "100vh",
        background: "#f5f7fb",
        fontSize: "17px",
        maxWidth: "100%",
      }}
    >
      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 1024px) {
          .layout { grid-template-columns: 1fr; padding: 1rem 0.75rem 1.6rem; }
          .top-bar { flex-direction: column; align-items: stretch; gap: 10px; }
          .search-box { width: 100% !important; }
          .table-wrap { border-radius: 12px; }
          .data-table { min-width: 100% !important; }
          .col-time, .col-slaughter { display: none; }
        }
        @media (max-width: 640px) {
          .data-table { font-size: 14.5px; }
          .data-table th, .data-table td { padding: 8px 6px !important; }
          .col-temp, .col-unit, .col-cond, .col-remarks { display: none; }
        }
      `}</style>

      {/* LEFT: Date Tree */}
      <aside style={{ ...sideCard, fontSize: "18px", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, color: "#1f2937", fontSize: 24, fontWeight: 900, letterSpacing: ".2px" }}>
            🗓️ Date Tree
          </h3>
          <button onClick={clearTreeFilter} style={{ ...btnGhost, padding: "8px 12px", fontSize: 15 }}>Clear</button>
        </div>

        <div style={{ maxHeight: "70vh", overflow: "auto", paddingRight: 6 }}>
          {Object.keys(groupedByYMD).sort().map((y) => (
            <div key={y} style={{ marginBottom: 14 }}>
              <div style={treeRowBig}>
                <button onClick={() => toggleYear(y)} style={treeToggleBig}>{openYears[y] ? "▾" : "▸"}</button>
                {/* Year label: YYYY */}
                <button onClick={() => selectYear(y)} style={treeBtnBig}>{y}</button>
              </div>

              {openYears[y] && (
                <div style={{ marginInlineStart: 22 }}>
                  {Object.keys(groupedByYMD[y]).sort().map((m) => (
                    <div key={`${y}-${m}`} style={{ marginBottom: 10 }}>
                      <div style={treeRowBig}>
                        <button onClick={() => toggleMonth(y, m)} style={treeToggleBig}>
                          {isOpenMonth(y, m) ? "▾" : "▸"}
                        </button>
                        {/* Month label: MM/YYYY */}
                        <button onClick={() => selectMonth(y, m)} style={treeBtnBig}>
                          {pad2(m)}/{y}
                        </button>
                      </div>

                      {isOpenMonth(y, m) && (
                        <div style={{ marginInlineStart: 22 }}>
                          {Object.keys(groupedByYMD[y][m]).sort().map((d) => (
                            <div key={`${y}-${m}-${d}`} style={treeRowBig}>
                              <button onClick={() => toggleDay(y, m, d)} style={treeToggleBig}>
                                {isOpenDay(y, m, d) ? "▾" : "▸"}
                              </button>
                              {/* Day label: DD/MM/YYYY */}
                              <button onClick={() => selectDay(y, m, d)} style={treeBtnBig}>
                                {pad2(d)}/{pad2(m)}/{y}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <hr style={hr} />

        {/* Global export/import */}
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 15, color: "#475569", fontWeight: 800 }}>Import mode:</label>
            <select value={importMode} onChange={(e)=>setImportMode(e.target.value)} style={{ ...selectStyle, fontSize: 15 }}>
              <option value="merge">Merge</option>
              <option value="replace">Replace all</option>
            </select>
          </div>

          <button onClick={exportXLSXFiltered} style={btnPrimary}>⬇️ Export XLSX (Filtered)</button>
          <button onClick={exportJSON} style={btnInfo}>⬇️ Export JSON (All)</button>

          <button onClick={importJSONClick} style={btnSuccess}>📥 Import JSON</button>
          <input ref={jsonInputRef} onChange={onImportJSON} type="file" accept="application/json" style={{ display: "none" }} />
        </div>
      </aside>

      {/* RIGHT: Reports list */}
      <main>
        {/* Top search/sort bar */}
        <div className="top-bar" style={topBar}>
          <input
            className="search-box"
            type="search"
            placeholder="🔍 Search product, customer, order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchBox}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%" }}>
            <div style={{ color: "#475569", fontSize: 15.5, flex: 1 }}>
              Rows: <b style={{ color: "#2563eb" }}>{filtered.length}</b> &nbsp;|&nbsp;
              Total Qty: <b style={{ color: "#16a34a" }}>{totalQty}</b>
              {treeFilter.year && (
                <>
                  &nbsp;|&nbsp; Filter: <b>{filterLabel}</b>
                </>
              )}
            </div>
            <div>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={selectStyle}>
                <option value="date_desc">Sort: Date (newest)</option>
                <option value="title_az">Sort: Title A–Z</option>
                <option value="customer_az">Sort: Customer A–Z</option>
                <option value="qty_desc">Sort: Quantity (high→low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Undo banner */}
        {undoState.visible && (
          <div style={undoBar}>
            <span>Item deleted.</span>
            <button onClick={undoLast} style={btnLink}>Undo</button>
          </div>
        )}

        {/* Cards per report */}
        {reportsArr.length === 0 && (
          <div style={emptyCard}>No reports match the current search/filter.</div>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {reportsArr.map((rep) => {
            const rowsOfRep = rep.rows;
            const repTotalQty = rowsOfRep.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
            return (
              <section key={rep.reportId} style={card}>
                {/* Header with date in DD/MM/YYYY */}
                <div style={cardHead}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>
                      {highlightMatch(rep.reportTitle || "Untitled Report", debouncedSearch)}
                    </div>
                    <div style={{ color: "#64748b", marginTop: 2, fontSize: 14.5 }}>
                      {formatDMY(rep.reportDate)}{" "}
                      <span style={{ color: "#94a3b8" }}>
                        ({rep.reportDate || "-"})
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => exportReportXLSX(rep.reportId)} style={btnSoftBlue}>⬇️ Export XLSX</button>
                    <button onClick={() => requestDeleteReport(rep.reportId)} style={btnDanger}>Delete Report</button>
                  </div>
                </div>

                {/* Table */}
                <div className="table-wrap" style={{ overflowX: "auto", border: "1.5px solid #94a3b8", borderRadius: 12 }}>
                  <table className="data-table" style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse", fontSize: "15.5px" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr style={{ background: "#f8fafc", color: "#1f2937" }}>
                        <th style={{ ...th, minWidth: 260, textAlign: "left" }}>Product</th>
                        <th style={{ ...th, minWidth: 170, textAlign: "left" }}>Customer</th>
                        <th style={{ ...th, minWidth: 120 }}>Order No</th>
                        <th className="col-time" style={{ ...th, minWidth: 100 }}>TIME</th>
                        <th className="col-slaughter" style={{ ...th, minWidth: 140 }}>Slaughter Date</th>
                        <th style={{ ...th, minWidth: 120 }}>Expiry Date</th>
                        <th className="col-temp" style={{ ...th, minWidth: 90 }}>TEMP</th>
                        <th style={{ ...th, minWidth: 110 }}>Quantity</th>
                        <th className="col-unit" style={{ ...th, minWidth: 90 }}>Unit</th>
                        <th className="col-cond" style={{ ...th, minWidth: 170 }}>Condition</th>
                        <th className="col-remarks" style={{ ...th, minWidth: 260, textAlign: "left" }}>Remarks</th>
                        <th style={{ ...th, minWidth: 90 }}>Days</th>
                        <th style={{ ...th, minWidth: 110 }}>Status</th>
                        <th style={{ ...th, minWidth: 80 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rowsOfRep.map((row, i) => {
                        const st = statusFromDates(row.reportDate, row.expiryDate);
                        const hasImages = Array.isArray(row.images) && row.images.filter(Boolean).length > 0;
                        return (
                          <tr key={`${row.__reportId}-${row.__productIndex}`} style={{ background: i % 2 ? "#ffffff" : "#fbfdff" }}>
                            <td style={{ ...td, textAlign: "left", wordBreak: "break-word" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{highlightMatch(row.product, debouncedSearch)}</span>
                                {hasImages && (
                                  <button onClick={() => openImages(row)} title="View product images" style={btnImgSm}>
                                    View pic
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ ...td, textAlign: "left", wordBreak: "break-word" }}>{highlightMatch(row.customer, debouncedSearch)}</td>
                            <td style={td}>{highlightMatch(row.orderNo, debouncedSearch)}</td>
                            <td className="col-time" style={td}>{row.time}</td>
                            <td className="col-slaughter" style={td}>{row.slaughterDate}</td>
                            <td style={td}>{row.expiryDate}</td>
                            <td className="col-temp" style={td}>{row.temp}</td>
                            <td style={td}>{row.quantity}</td>
                            <td className="col-unit" style={td}>{row.unitOfMeasure || "KG"}</td>
                            <td className="col-cond" style={td}>{row.overallCondition}</td>
                            <td className="col-remarks" style={{ ...td, textAlign: "left", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {highlightMatch(row.remarks, debouncedSearch)}
                            </td>
                            <td style={td}>{st.days === "" ? "" : st.days}</td>
                            <td style={td}>
                              <span style={{ ...badge, ...(st.tone === "danger" ? badgeDanger : st.tone === "warn" ? badgeWarn : st.tone === "ok" ? badgeOk : badgeMuted) }}>
                                {st.label}
                              </span>
                            </td>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                              <button onClick={() => requestDeleteRow(row)} style={btnDangerSm} title="Delete row">🗑️</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f8fafc" }}>
                        <td colSpan={7} />
                        <td style={{ ...td, fontWeight: "bold", color: "#16a34a" }}>{repTotalQty}</td>
                        <td colSpan={5} />
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Confirm dialog */}
      {confirmState.open && (
        <div style={modalBack}>
          <div style={modalCard}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Confirm deletion</div>
            <div style={{ color: "#475569", marginBottom: 16 }}>
              {confirmState.type === "report" ? "This will delete the entire report and its rows." : "This will delete the selected row."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={closeConfirm} style={btnGhost}>Cancel</button>
              <button onClick={confirmDeletion} style={btnDanger}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {imgViewer.open && (
        <div style={imgModalBack} onClick={closeImages}>
          <div style={imgModalCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>🖼️ {imgViewer.title}</div>
              <button onClick={closeImages} style={galleryClose}>✕</button>
            </div>

            <div style={imgStage}>
              {imgViewer.images.length > 1 && (
                <button onClick={prevImg} style={{ ...imgNavBtn, left: 8 }} title="Prev">‹</button>
              )}
              <img src={imgViewer.images[imgViewer.index]} alt="product" style={imgMain} />
              {imgViewer.images.length > 1 && (
                <button onClick={nextImg} style={{ ...imgNavBtn, right: 8 }} title="Next">›</button>
              )}
            </div>

            {imgViewer.images.length > 1 && (
              <div style={thumbsWrap}>
                {imgViewer.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => jumpImg(i)}
                    style={{ ...thumbBtn, outline: i === imgViewer.index ? "3px solid #3b82f6" : "1px solid #e5e7eb" }}
                    title={`Image ${i + 1}`}
                  >
                    <img src={src} alt={`thumb-${i}`} style={thumbImg} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Styles ============ */
const sideCard = {
  background: "#ffffff",
  borderRadius: 16,
  boxShadow: "0 6px 20px rgba(31,41,55,.06)",
  padding: 14,
  alignSelf: "start",
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 12,
};

const searchBox = {
  width: 460,
  maxWidth: "100%",
  padding: "10px 16px",
  fontSize: "16.25px",
  borderRadius: 12,
  border: "1.6px solid #cbd5e1",
  background: "#fff",
  boxShadow: "0 2px 6px rgba(2,6,23,.06)",
};

const card = {
  background: "#ffffff",
  borderRadius: 16,
  boxShadow: "0 8px 24px rgba(2,6,23,.06)",
  padding: 12,
  border: "1px solid #eef2f7",
};

const cardHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "6px 4px 10px",
  borderBottom: "1px solid #f1f5f9",
  marginBottom: 8,
};

const hr = { margin: "12px 0", border: 0, borderTop: "1px solid #eef2f7" };

/* Stronger borders for table cells */
const th = {
  padding: "10px 8px",
  borderBottom: "2px solid #94a3b8",
  borderRight: "1px solid #cbd5e1",
  textAlign: "center",
  fontWeight: 700,
  fontSize: "15.5px",
  whiteSpace: "nowrap",
  color: "#1f2937",
};
const td = {
  padding: "9px 8px",
  textAlign: "center",
  borderBottom: "1px solid #cbd5e1",
  borderRight: "1px solid #cbd5e1",
  color: "#111827",
  fontSize: "15.25px",
};

const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 800 };
const btnInfo = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 800 };
const btnSuccess = { background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 800 };
const btnGhost = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 10px", cursor: "pointer", fontWeight: 700 };

const btnSoftBlue = { background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 };
const btnDanger = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 };

const btnDangerSm = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 800 };

const btnImgSm = {
  background: "#f1f5f9",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "2px 8px",
  fontWeight: 800,
  fontSize: 12,
  cursor: "pointer",
};

const selectStyle = { padding: "7px 10px", borderRadius: 10, border: "1.6px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, color: "#0f172a" };

const treeRowBig = { display: "flex", alignItems: "center", gap: 12, marginBottom: 10, lineHeight: 1.4 };
const treeToggleBig = { background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: "4px 12px", cursor: "pointer", fontSize: 18, fontWeight: 900, color: "#1e3a8a" };
const treeBtnBig = { background: "transparent", border: "none", color: "#0f172a", cursor: "pointer", fontWeight: 900, fontSize: 19.5, letterSpacing: ".2px", padding: "2px 2px" };

const emptyCard = {
  background: "#ffffff",
  borderRadius: 16,
  border: "1px dashed #cbd5e1",
  color: "#64748b",
  padding: "26px 18px",
  textAlign: "center",
  marginTop: 8,
};

const badge = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid",
};
const badgeDanger = { color: "#991b1b", background: "#fee2e2", borderColor: "#fecaca" };
const badgeWarn = { color: "#92400e", background: "#fef3c7", borderColor: "#fde68a" };
const badgeOk = { color: "#065f46", background: "#d1fae5", borderColor: "#a7f3d0" };
const badgeMuted = { color: "#334155", background: "#f1f5f9", borderColor: "#e2e8f0" };

const modalBack = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,.35)",
  display: "grid", placeItems: "center", zIndex: 50
};
const modalCard = {
  background: "#fff", borderRadius: 16, padding: 16, width: 420,
  boxShadow: "0 20px 50px rgba(2,6,23,.25)", border: "1px solid #e2e8f0"
};

const undoBar = {
  display: "flex", alignItems: "center", gap: 10,
  background: "#f8fafc", border: "1px solid #e2e8f0",
  borderRadius: 12, padding: "8px 12px", marginBottom: 10
};
const btnLink = {
  background: "transparent", border: "none", color: "#2563eb",
  cursor: "pointer", fontWeight: 800, textDecoration: "underline"
};

/* Image modal styles */
const imgModalBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 60,
};
const imgModalCard = {
  width: "min(1100px, 96vw)",
  maxHeight: "88vh",
  overflow: "auto",
  background: "#ffffff",
  color: "#111",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: 12,
  boxShadow: "0 18px 44px rgba(0,0,0,.35)",
};
const galleryClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};
const imgStage = {
  position: "relative",
  display: "grid",
  placeItems: "center",
  background: "#0b1220",
  borderRadius: 12,
  minHeight: 360,
};
const imgMain = {
  maxWidth: "100%",
  maxHeight: 520,
  objectFit: "contain",
  borderRadius: 10,
};
const imgNavBtn = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  background: "rgba(255,255,255,.85)",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  width: 36,
  height: 36,
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: 20,
  fontWeight: 900,
};
const thumbsWrap = {
  marginTop: 10,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
  gap: 8,
};
const thumbBtn = {
  padding: 0,
  borderRadius: 10,
  background: "#fff",
  cursor: "pointer",
};
const thumbImg = {
  width: "100%",
  height: 90,
  objectFit: "cover",
  display: "block",
  borderRadius: 8,
};
