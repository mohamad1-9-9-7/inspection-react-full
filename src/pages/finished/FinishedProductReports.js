// src/pages/finished/FinishedProductReports.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";

/* ============ API ============ */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "finished_products_report";

/* ============ Utils ============ */
function pad2(v) { return String(v || "").padStart(2, "0"); }
function parseYMD(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { y: "", m: "", d: "" };
  return { y: m[1], m: m[2], d: m[3] };
}
function isYMD(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim()); }
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function formatDMY(isoOrDmy) {
  if (!isoOrDmy) return "-";
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(isoOrDmy))) return isoOrDmy;
    const { y, m, d } = parseYMD(isoOrDmy);
    if (y && m && d) return `${pad2(d)}/${pad2(m)}/${y}`;
    const dt = new Date(isoOrDmy);
    if (!isNaN(dt)) return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    return isoOrDmy;
  } catch { return isoOrDmy; }
}

function highlightMatch(text, query) {
  if (!query) return text;
  const q = query.trim(); if (!q) return text;
  const parts = String(text ?? "").split(new RegExp(`(${escapeRegExp(q)})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

/* === تاريخ: دعم ISO و DD/MM/YYYY === */
function parseAnyDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00");
    return isNaN(d) ? null : d;
  }
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d) ? null : d;
  }
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
function daysBetween(from, to) {
  const a = parseAnyDate(from);
  const b = parseAnyDate(to);
  if (!a || !b) return "";
  const one = 1000 * 60 * 60 * 24;
  return Math.ceil((b - a) / one);
}
function statusFromDates(reportDate, expiryDate) {
  const d = daysBetween(reportDate, expiryDate);
  if (d === "") return { days: "", label: "—", tone: "muted" };
  if (d <= 0) return { days: d, label: "EXP", tone: "danger" };
  if (d <= 6) return { days: d, label: "NEAR EXPIRED", tone: "warn" };
  return { days: d, label: "—", tone: "ok" };
}

/* ============ Server helpers ============ */
async function fetchServerReports() {
  try {
    const url = `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=500`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data) return [];

    const arr =
      Array.isArray(data) ? data :
      Array.isArray(data.items) ? data.items :
      Array.isArray(data.data) ? data.data :
      Array.isArray(data.results) ? data.results :
      Array.isArray(data.records) ? data.records :
      [];

    const all = [];
    for (const it of arr) {
      const dbId = it.id || it._id || null;
      const payload = it.payload && typeof it.payload === "object" ? it.payload : it;
      all.push({
        id: dbId || `${payload.reportDate || "srv"}-${Math.random().toString(36).slice(2, 8)}`,
        _dbId: dbId,
        reportTitle: payload.reportTitle || it.reportTitle || "",
        reportDate: payload.reportDate || it.reportDate || "",
        products: Array.isArray(payload.products) ? payload.products : [],
      });
    }
    return all;
  } catch { return []; }
}
async function fetchServerReportsByDate() {
  const list = await fetchServerReports();
  const map = new Map();
  for (const r of list) {
    const key = String(r.reportDate || "").trim();
    if (key) map.set(key, r);
  }
  return map;
}
async function deleteServerReport(idOrDbId) {
  const id = String(idOrDbId);
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Delete failed");
}
async function deleteServerRow(idOrDbId, productIndex) {
  const list = await fetchServerReports();
  const rep = list.find((r) =>
    String(r._dbId || "") === String(idOrDbId) || String(r.id) === String(idOrDbId)
  );
  if (!rep) throw new Error("Report not found");
  const nextProducts = [...(rep.products || [])];
  if (productIndex < 0 || productIndex >= nextProducts.length) throw new Error("Row index invalid");
  nextProducts.splice(productIndex, 1);
  const id = rep._dbId || rep.id;
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: { reportTitle: rep.reportTitle, reportDate: rep.reportDate, products: nextProducts } }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Update failed");
}

async function postServerReportOne(rep, reporter = "SYSTEM") {
  const payload = {
    reportTitle: rep.reportTitle || rep.title || rep.name || "",
    reportDate: rep.reportDate || rep.date || "",
    products: Array.isArray(rep.products) ? rep.products : [],
  };
  if (!isYMD(payload.reportDate)) throw new Error(`Invalid or missing reportDate for POST: "${payload.reportDate}" (expected YYYY-MM-DD).`);
  const body = { reporter, type: TYPE, payload };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "POST failed");
  return data;
}
async function putServerReportReplace(exists, incomingRep) {
  const payload = {
    reportTitle: incomingRep.reportTitle || exists.reportTitle || "",
    reportDate: exists.reportDate,
    products: Array.isArray(incomingRep.products) ? incomingRep.products : [],
  };
  const id = exists._dbId || exists.id;
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Update failed");
  return data;
}
async function runWithConcurrency(taskFns, limit = 4) {
  const results = []; const executing = new Set();
  for (const fn of taskFns) {
    const p = Promise.resolve().then(fn);
    results.push(p); executing.add(p);
    const clean = () => executing.delete(p); p.then(clean, clean);
    if (executing.size >= limit) await Promise.race(executing);
  }
  return Promise.all(results);
}
async function serverImportReports(incomingRaw, mode = "replace", reporter = "SYSTEM") {
  const incoming = Array.isArray(incomingRaw) ? incomingRaw : [incomingRaw];
  const normalize = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((rep, i) => ({
      id: rep.id || rep._id || rep.reportId || `srv-${rep.reportDate || "unknown"}-${i}`,
      reportDate: rep.reportDate || "",
      reportTitle: rep.reportTitle || "",
      products: Array.isArray(rep.products) ? rep.products : [],
    }));
  };

  if (mode === "replace") {
    const existing = await fetchServerReports();
    await runWithConcurrency(existing.map((r) => () => deleteServerReport(r._dbId || r.id)), 4);
  }
  const byDate = await fetchServerReportsByDate();

  const tasks = normalize(incoming).map((rep) => async () => {
    const reportDate = (rep && rep.reportDate) || "";
    if (!isYMD(reportDate)) { console.warn("Skipped record without valid reportDate:", rep); return null; }
    const exists = byDate.get(reportDate);
    if (exists) {
      await putServerReportReplace(exists, rep);
      byDate.set(reportDate, { ...exists, reportTitle: rep.reportTitle || exists.reportTitle || "", reportDate, products: Array.isArray(rep.products) ? rep.products : [] });
    } else {
      try {
        const res = await postServerReportOne({ ...rep, reportDate }, reporter);
        byDate.set(reportDate, {
          id: res?.id || res?._id || `tmp-${reportDate}`,
          _dbId: res?.id || res?._id || null,
          reportTitle: rep.reportTitle || "",
          reportDate,
          products: Array.isArray(rep.products) ? rep.products : [],
        });
      } catch (e) {
        if (String(e?.message || "").includes("duplicate key value")) {
          const latest = await fetchServerReportsByDate();
          const found = latest.get(reportDate);
          if (found) {
            await putServerReportReplace(found, rep);
            byDate.set(reportDate, { ...found, reportTitle: rep.reportTitle || found.reportTitle || "", reportDate, products: Array.isArray(rep.products) ? rep.products : [] });
          } else throw e;
        } else throw e;
      }
    }
    return true;
  });
  await runWithConcurrency(tasks, 4);
}

/* ===== Helper: flatten reports → rows ===== */
function flattenReports(reports, src = "server") {
  const flat = [];
  (reports || []).forEach((rep, ridx) => {
    const safeId = rep.id || `rep-${rep.reportDate || "unknown"}-${ridx}`;
    (rep.products || []).forEach((p, pidx) => {
      flat.push({
        ...p,
        reportDate: rep.reportDate || "",
        reportTitle: rep.reportTitle || "",
        __reportId: safeId,
        __dbId: rep._dbId || null,
        __productIndex: pidx,
        __source: src,
      });
    });
  });
  return flat;
}

/* ============ Component ============ */
export default function FinishedProductReports() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // فلترة بالتاريخ (سنة/شهر/يوم)
  const [treeFilter, setTreeFilter] = useState({ year: "", month: "", day: "" });

  // حالات الطي/الفتح للشجرة
  const [expandedYears, setExpandedYears] = useState(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState(() => new Set());

  const [sortBy, setSortBy] = useState("date_desc");

  const jsonInputRef = useRef(null);
  const [importMode, setImportMode] = useState("replace");

  const [confirmState, setConfirmState] = useState({ open: false, target: null, type: null });
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false); // <-- keep variable name as in your file

  // مراجع أقسام التقارير للتمرير
  const sectionRefs = useRef({});

  /* Load once */
  useEffect(() => {
    loadFromServerOnly().then(() => {
      const saved = JSON.parse(localStorage.getItem("finished_reports_ui") || "{}");
      if (saved.search) setSearch(saved.search);
      if (saved.sortBy) setSortBy(saved.sortBy);
      if (saved.treeFilter && saved.treeFilter.year) setTreeFilter(saved.treeFilter);
      if (saved.expandedYears) setExpandedYears(new Set(saved.expandedYears));
      if (saved.expandedMonths) setExpandedMonths(new Set(saved.expandedMonths));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFromServerOnly() {
    try {
      const serverReports = await fetchServerReports();
      const flat = flattenReports(serverReports, "server");
      setRows(flat);

      // افتراضيًا أحدث تقرير
      const latestDate = serverReports
        .map(r => r.reportDate)
        .filter(isYMD)
        .sort()
        .pop();

      if (latestDate) {
        const { y, m, d } = parseYMD(latestDate);
        setTreeFilter({ year: y, month: m, day: d });
        setExpandedYears(new Set([y]));
        setExpandedMonths(new Set([`${y}-${m}`]));
      }

      setBanner(`📡 Loaded from server: ${serverReports.length} report(s).`);
      setTimeout(() => setBanner(""), 1200);
    } catch {
      setRows([]);
      setBanner("❌ Server unavailable.");
      setTimeout(() => setBanner(""), 1800);
    }
  }

  const refreshNow = async () => { await loadFromServerOnly(); };

  /* Persist UI state */
  useEffect(() => {
    const payload = {
      search, sortBy, treeFilter,
      expandedYears: Array.from(expandedYears),
      expandedMonths: Array.from(expandedMonths),
    };
    localStorage.setItem("finished_reports_ui", JSON.stringify(payload));
  }, [search, sortBy, treeFilter, expandedYears, expandedMonths]);

  /* Debounce search */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  /* Build date tree */
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

  const yearsList = useMemo(() => {
    return Object.keys(groupedByYMD).filter((y) => /^\d{4}$/.test(y)).sort((a, b) => b.localeCompare(a));
  }, [groupedByYMD]);

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

  /* Group filtered rows by report */
  const reportsArr = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const id = r.__dbId || r.__reportId;
      if (!m.has(id)) {
        m.set(id, { reportId: id, dbId: r.__dbId || null, reportTitle: r.reportTitle || "", reportDate: r.reportDate || "", rows: [] });
      }
      m.get(id).rows.push(r);
    }
    let arr = Array.from(m.values());
    if (sortBy === "date_desc") {
      arr = arr.sort((a, b) =>
        (b.reportDate || "").localeCompare(a.reportDate || "") || (a.reportTitle || "").localeCompare(b.reportTitle || "")
      );
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

  const scrollToReport = (id) => {
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* Actions: delete row/report */
  const requestDeleteRow = (row) => setConfirmState({ open: true, target: row, type: "row" });
  const requestDeleteReport = (reportIdOrDbId) => setConfirmState({ open: true, target: reportIdOrDbId, type: "report" });

  const confirmDeletion = async () => {
    if (!confirmState.open) return;
    try {
      if (confirmState.type === "row") {
        const row = confirmState.target;
        await deleteServerRow(row.__dbId || row.__reportId, row.__productIndex);
        await loadFromServerOnly();
      } else if (confirmState.type === "report") {
        const id = confirmState.target;
        await deleteServerReport(id);
        await loadFromServerOnly();
      }
    } catch (e) {
      alert(e?.message || "Delete failed");
    } finally {
      setConfirmState({ open: false, target: null, type: null });
    }
  };
  const closeConfirm = () => setConfirmState({ open: false, target: null, type: null });

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
        r.product, r.customer, r.orderNo, r.time,
        formatDMY(r.slaughterDate),         // ← تنسيق يوم/شهر/سنة
        formatDMY(r.expiryDate),            // ← تنسيق يوم/شهر/سنة
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
      if (!ws[addr]) continue;
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

  /* JSON Export/Import (Server) */
  const exportJSON = async () => {
    try {
      const list = await fetchServerReports();
      const plain = list.map(({ _dbId, ...rest }) => rest);
      const blob = new Blob([JSON.stringify(plain, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "FinishedReports_Server.json"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to export from server.");
    }
  };

  const importJSONClick = () => jsonInputRef.current?.click();
  const onImportJSON = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      const text = await f.text();
      const incoming = JSON.parse(text);
      setBanner("⏫ Importing to server...");
      await serverImportReports(incoming, importMode, "QA");
      setBanner("✅ Imported to server successfully.");
      await loadFromServerOnly();
      setTimeout(() => setBanner(""), 1500);
    } catch (err) {
      console.error(err);
      alert(err?.message || "Failed to import.");
      setBanner("❌ Import failed.");
      setTimeout(() => setBanner(""), 2000);
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  /* Label للفلترة */
  const filterLabel = useMemo(() => {
    const { year, month, day } = treeFilter;
    if (!year) return "";
    if (year && !month && !day) return `${year}`;
    if (year && month && !day) return `${year}/${pad2(month)}`;
    return `${year}/${pad2(month)}/${pad2(day)}`;
  }, [treeFilter]);

  /* Helpers لتحديد العنصر النشط */
  const isYearActive = (y) => treeFilter.year === y && !treeFilter.month && !treeFilter.day;
  const isMonthActive = (y, m) => treeFilter.year === y && treeFilter.month === m && !treeFilter.day;
  const isDayActive = (y, m, d) => treeFilter.year === y && treeFilter.month === m && treeFilter.day === d;

  /* ====== UI ====== */
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
      {/* Responsive / Tree CSS */}
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

        /* Tree looks */
        .tree-card { max-height: calc(100vh - 120px); overflow: auto; }
        .year-head, .month-head {
          display:flex; align-items:center; justify-content:space-between;
          cursor:pointer; user-select:none;
        }
        .caret { transition: transform .18s ease; }
        .caret.open { transform: rotate(90deg); }
        .count-badge{
          background:#f1f5f9; color:#334155; border:1px solid #e2e8f0;
          padding:2px 8px; border-radius:999px; font-weight:800; font-size:12.5px;
        }
        .pill { border-radius:999px; border:1.5px solid #e2e8f0; background:#fff; }
        .pill.active { background:#e0f2fe; border-color:#bae6fd; color:#075985; }
        .chip-day{
          background:#f8fafc; border:1.5px solid #e2e8f0; color:#0f172a;
          border-radius:999px; padding:6px 12px; font-weight:800; font-size:14.5px;
          width: fit-content;
        }
        .chip-day.active{ background:#dcfce7; border-color:#bbf7d0; color:#065f46; }
        .tree-actions button { border-radius:9px; }
      `}</style>

      {/* LEFT: Collapsible Y/M/D Tree + Controls */}
      <aside style={{ ...sideCard, fontSize: "18px", padding: 16 }} className="tree-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "#1f2937", fontSize: 22, fontWeight: 900, letterSpacing: ".2px" }}>
            📅 Filter by Date
          </h3>
          <div className="tree-actions" style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                const all = new Set(yearsList);
                setExpandedYears(all);
                const months = new Set();
                yearsList.forEach((y)=>Object.keys(groupedByYMD[y]||{}).forEach((m)=>months.add(`${y}-${m}`)));
                setExpandedMonths(months);
              }}
              style={{ ...btnGhost, padding: "6px 10px", fontSize: 13 }}
              disabled={busy}
            >Expand All</button>
            <button
              onClick={() => { setExpandedYears(new Set()); setExpandedMonths(new Set()); }}
              style={{ ...btnGhost, padding: "6px 10px", fontSize: 13 }}
              disabled={busy}
            >Collapse All</button>
            <button onClick={refreshNow} style={{ ...btnGhost, padding: "6px 10px", fontSize: 13 }} disabled={busy}>Refresh</button>
          </div>
        </div>

        {banner && (
          <div style={{ background:"#eaf2f8", color:"#1b4f72", borderRadius:8, padding:"8px 10px", marginBottom:10, fontWeight:800, fontSize:14 }}>
            {banner}
          </div>
        )}

        {/* شجرة سنة → شهر/سنة → أيام (كل يوم سطر) */}
        <div style={{ display: "grid", gap: 10 }}>
          {yearsList.length === 0 && <div style={mutedText}>No years</div>}
          {yearsList.map((y) => {
            const months = Object.keys(groupedByYMD[y] || {}).filter((m) => /^\d{2}$/.test(m)).sort();
            const yearCount = months.reduce((acc, m) => {
              const days = Object.keys(groupedByYMD[y][m] || {});
              return acc + days.reduce((s, d) => s + (groupedByYMD[y][m][d]?.length || 0), 0);
            }, 0);

            const keyY = y;
            const isYExpanded = expandedYears.has(keyY);

            return (
              <div key={y} style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff" }}>
                <div
                  className="year-head"
                  onClick={() => {
                    const next = new Set(expandedYears);
                    if (next.has(keyY)) next.delete(keyY); else next.add(keyY);
                    setExpandedYears(next);
                  }}
                  style={{ padding: "10px 12px" }}
                  title={`Year ${y}`}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span className={`caret ${isYExpanded ? "open" : ""}`} style={{ fontSize: 16 }}>▶</span>
                    <button
                      onClick={(e)=>{ e.stopPropagation(); setTreeFilter({ year: y, month: "", day: "" }); }}
                      className={`pill ${isYearActive(y) ? "active" : ""}`}
                      style={{ padding:"6px 12px", fontWeight:900, color:"#0f172a" }}
                    >
                      {y}
                    </button>
                    <span className="count-badge">{yearCount}</span>
                  </div>
                  <button
                    onClick={(e)=>{ e.stopPropagation(); setTreeFilter({ year: y, month: "", day: "" }); }}
                    style={{ ...btnGhost, padding:"4px 10px", fontSize:12.5 }}
                  >
                    Filter
                  </button>
                </div>

                {isYExpanded && (
                  <div style={{ padding: "6px 10px 12px", display: "grid", gap: 8 }}>
                    {months.length === 0 && <div style={mutedText}>No months</div>}
                    {months.map((m) => {
                      const keyM = `${y}-${m}`;
                      const days = Object.keys(groupedByYMD[y][m] || {}).filter((d) => /^\d{2}$/.test(d)).sort();
                      const monthCount = days.reduce((s, d) => s + (groupedByYMD[y][m][d]?.length || 0), 0);
                      const isMExpanded = expandedMonths.has(keyM);

                      return (
                        <div key={keyM} style={{ border: "1px dashed #e2e8f0", borderRadius: 12, background: "#fafcff" }}>
                          <div
                            className="month-head"
                            onClick={() => {
                              const next = new Set(expandedMonths);
                              if (next.has(keyM)) next.delete(keyM); else next.add(keyM);
                              setExpandedMonths(next);
                            }}
                            style={{ padding: "8px 10px" }}
                            title={`${y}/${m}`}
                          >
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <span className={`caret ${isMExpanded ? "open" : ""}`} style={{ fontSize: 14 }}>▶</span>
                              <button
                                onClick={(e)=>{ e.stopPropagation(); setTreeFilter({ year: y, month: m, day: "" }); }}
                                className={`pill ${isMonthActive(y,m) ? "active" : ""}`}
                                style={{ padding:"5px 10px", fontWeight:900, color:"#0f172a", fontSize:14.5 }}
                              >
                                {m} / {y}
                              </button>
                              <span className="count-badge">{monthCount}</span>
                            </div>
                            <button
                              onClick={(e)=>{ e.stopPropagation(); setTreeFilter({ year: y, month: m, day: "" }); }}
                              style={{ ...btnGhost, padding:"3px 8px", fontSize:12 }}
                            >
                              Filter
                            </button>
                          </div>

                          {isMExpanded && (
                            <div style={{ padding: "6px 10px 10px", display: "grid", gap: 8 }}>
                              {days.length === 0 && <div style={mutedText}>No days</div>}
                              {days.map((d) => {
                                const dayCount = (groupedByYMD[y][m][d]?.length || 0);
                                const active = isDayActive(y,m,d);
                                return (
                                  <button
                                    key={`${y}-${m}-${d}`}
                                    onClick={(e) => { e.stopPropagation(); setTreeFilter({ year: y, month: m, day: d }); }}
                                    className={`chip-day ${active ? "active" : ""}`}
                                    title={`${d}/${m}/${y} (${dayCount})`}
                                  >
                                    {d} / {m} / {y}&nbsp;
                                    <span style={{ color: active ? "#065f46" : "#64748b" }}>({dayCount})</span>
                                  </button>
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
          })}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap:"wrap" }}>
          <button onClick={() => setTreeFilter({ year: "", month: "", day: "" })} style={btnClear}>✖ Clear Filter</button>
          {filterLabel && <div style={{ fontSize: 14.5, color: "#334155" }}>Filter: <b>{filterLabel}</b></div>}
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
            disabled={busy}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%" }}>
            <div style={{ color: "#475569", fontSize: 15.5, flex: 1 }}>
              Rows: <b style={{ color: "#2563eb" }}>{filtered.length}</b> &nbsp;|&nbsp;
              Total Qty: <b style={{ color: "#16a34a" }}>{totalQty}</b>
              {filterLabel && (<>&nbsp;|&nbsp; Filter: <b>{filterLabel}</b></>)}
            </div>
            <div>
              <button onClick={exportXLSXFiltered} style={{ ...btnSoftBlue, marginRight: 8 }} disabled={busy}>⬇️ Export XLSX (Filtered)</button>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} style={selectStyle} disabled={busy}>
                <option value="date_desc">Sort: Date (newest)</option>
                <option value="title_az">Sort: Title A–Z</option>
                <option value="customer_az">Sort: Customer A–Z</option>
                <option value="qty_desc">Sort: Quantity (high→low)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards per report */}
        {reportsArr.length === 0 && (
          <div style={emptyCard}>No reports match the current search/filter.</div>
        )}

        <div style={{ display: "grid", gap: 16 }}>
          {reportsArr.map((rep, idx) => {
            const rowsOfRep = rep.rows;
            const repTotalQty = rowsOfRep.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

            const softBg = idx % 2 === 0 ? "#ffffff" : "#fcfdfd";
            const leftAccent = idx % 2 === 0 ? "#bfdbfe" : "#a7f3d0";

            return (
              <section
                key={rep.reportId || Math.random()}
                ref={(el) => { if (rep.reportId) sectionRefs.current[rep.reportId] = el; }}
                style={{ ...card, background: softBg, borderLeft: `6px solid ${leftAccent}` }}
              >
                {/* Header */}
                <div style={cardHead}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>
                      {highlightMatch(rep.reportTitle || "Untitled Report", debouncedSearch)}
                    </div>
                    <div style={{ color: "#64748b", marginTop: 2, fontSize: 14.5 }}>
                      {formatDMY(rep.reportDate)}{" "}
                      <span style={{ color: "#94a3b8" }}>({rep.reportDate || "-"})</span>
                    </div>
                  </div>

                  {/* الأزرار صارت فوق التقرير نفسه */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button onClick={exportJSON} style={btnPrimary} disabled={busy}>⬇️ Export JSON (Server)</button>
                    <button onClick={importJSONClick} style={btnInfo} disabled={busy}>⤴️ Import JSON → Server</button>
                    <select value={importMode} onChange={(e)=>setImportMode(e.target.value)} style={selectStyle} disabled={busy}>
                      <option value="replace">Import mode: Replace</option>
                      <option value="merge">Import mode: Merge by date</option>
                    </select>
                    <button onClick={() => requestDeleteReport(rep.dbId || rep.reportId)} style={btnDanger} disabled={busy}>Delete Report</button>
                    <input type="file" accept="application/json" ref={jsonInputRef} style={{ display: "none" }} onChange={onImportJSON} />
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
                          <tr key={`${row.__reportId || "rep"}-${row.__productIndex || i}`} style={{ background: i % 2 ? "#ffffff" : "#fbfdff" }}>
                            <td style={{ ...td, textAlign: "left", wordBreak: "break-word" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{highlightMatch(row.product, debouncedSearch)}</span>
                                {hasImages && (
                                  <span style={{ fontSize: 12, color: "#64748b" }}>
                                    ({row.images.length} pic)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ ...td, textAlign: "left", wordBreak: "break-word" }}>{highlightMatch(row.customer, debouncedSearch)}</td>
                            <td style={td}>{highlightMatch(row.orderNo, debouncedSearch)}</td>
                            <td className="col-time" style={td}>{row.time}</td>
                            {/* ▼▼ تم التنسيق إلى يوم/شهر/سنة فقط ▼▼ */}
                            <td className="col-slaughter" style={td}>{formatDMY(row.slaughterDate)}</td>
                            <td style={td}>{formatDMY(row.expiryDate)}</td>
                            {/* ▲▲ لا تغيير آخر ▲▲ */}
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
                              <button onClick={() => requestDeleteRow(row)} style={btnDangerSm} title="Delete row" disabled={busy}>🗑️</button>
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
              <button onClick={closeConfirm} style={btnGhost} disabled={busy}>Cancel</button>
              <button onClick={confirmDeletion} style={btnDanger} disabled={busy}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============ Styles ============ */
const sideCard = { background: "#ffffff", borderRadius: 16, boxShadow: "0 6px 20px rgba(31,41,55,.06)", padding: 14, alignSelf: "start" };
const topBar = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 };
const searchBox = { width: 460, maxWidth: "100%", padding: "10px 16px", fontSize: "16.25px", borderRadius: 12, border: "1.6px solid #cbd5e1", background: "#fff", boxShadow: "0 2px 6px rgba(2,6,23,.06)" };
const card = { background: "#ffffff", borderRadius: 16, boxShadow: "0 8px 24px rgba(2,6,23,.06)", padding: 12, border: "1px solid #eef2f7" };
const cardHead = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "6px 4px 10px", borderBottom: "1px solid #f1f5f9", marginBottom: 8 };
const hr = { margin: "12px 0", border: 0, borderTop: "1px solid #eef2f7" };
const th = { padding: "10px 8px", borderBottom: "2px solid #94a3b8", borderRight: "1px solid #cbd5e1", textAlign: "center", fontWeight: 700, fontSize: "15.5px", whiteSpace: "nowrap", color: "#1f2937" };
const td = { padding: "9px 8px", textAlign: "center", borderBottom: "1px solid #cbd5e1", borderRight: "1px solid #cbd5e1", color: "#111827", fontSize: "15.25px" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 };
const btnInfo = { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 };
const btnGhost = { background: "#f8fafc", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 10, padding: "7px 10px", cursor: "pointer", fontWeight: 700 };
const btnSoftBlue = { background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 };
const btnDanger = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", fontWeight: 800 };
const btnDangerSm = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 800 };
const selectStyle = { padding: "7px 10px", borderRadius: 10, border: "1.6px solid #cbd5e1", background: "#f8fafc", fontWeight: 700, color: "#0f172a" };
const emptyCard = { background: "#ffffff", borderRadius: 16, border: "1px dashed #cbd5e1", color: "#64748b", padding: "26px 18px", textAlign: "center", marginTop: 8 };
const badge = { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 800, border: "1px solid" };
const badgeDanger = { color: "#991b1b", background: "#fee2e2", borderColor: "#fecaca" };
const badgeWarn = { color: "#92400e", background: "#fef3c7", borderColor: "#fde68a" };
const badgeOk = { color: "#065f46", background: "#d1fae5", borderColor: "#a7f3d0" };
const badgeMuted = { color: "#334155", background: "#f1f5f9", borderColor: "#e2e8f0" };
const modalBack = { position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "grid", placeItems: "center", zIndex: 50 };
const modalCard = { background: "#fff", borderRadius: 16, padding: 16, width: 420, boxShadow: "0 20px 50px rgba(2,6,23,.25)", border: "1px solid #e2e8f0" };

const mutedText = { fontSize: 14, color: "#94a3b8" };
const btnClear = { ...btnGhost, padding: "6px 10px", borderRadius: 999, fontSize: 14, background: "#fff" };
