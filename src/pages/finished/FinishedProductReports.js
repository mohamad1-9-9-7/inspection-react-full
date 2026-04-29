// src/pages/finished/FinishedProductReports.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx-js-style";

/* ============ API ============ */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" &&
      (process.env?.REACT_APP_API_URL ||
        process.env?.VITE_API_URL ||
        process.env?.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "finished_products_report";

/* ============ Utils ============ */
function pad2(v) {
  return String(v || "").padStart(2, "0");
}
function parseYMD(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { y: "", m: "", d: "" };
  return { y: m[1], m: m[2], d: m[3] };
}
function isYMD(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || "").trim());
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDMY(isoOrDmy) {
  if (!isoOrDmy) return "-";
  try {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(isoOrDmy))) return isoOrDmy;
    const { y, m, d } = parseYMD(isoOrDmy);
    if (y && m && d) return `${pad2(d)}/${pad2(m)}/${y}`;
    const dt = new Date(isoOrDmy);
    if (!isNaN(dt)) {
      return `${pad2(dt.getDate())}/${pad2(dt.getMonth() + 1)}/${dt.getFullYear()}`;
    }
    return isoOrDmy;
  } catch {
    return isoOrDmy;
  }
}

function highlightMatch(text, query) {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const parts = String(text ?? "").split(
    new RegExp(`(${escapeRegExp(q)})`, "ig")
  );
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i}>{part}</mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

/* === تاريخ: دعم ISO و DD/MM/YYYY (بناء صريح بالـ local time) === */
function parseAnyDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  // ISO YYYY-MM-DD
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d) ? null : d;
  }
  // DMY DD/MM/YYYY
  m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
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
  // start-of-day مقارنة لتفادي فروقات DST/التوقيت
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bMid - aMid) / 86400000);
}
function statusFromDates(reportDate, expiryDate) {
  const d = daysBetween(reportDate, expiryDate);
  if (d === "") return { days: "", label: "—", tone: "muted" };
  if (d < 0) return { days: d, label: "EXPIRED", tone: "danger" };
  if (d === 0) return { days: d, label: "EXP TODAY", tone: "danger" };
  if (d <= 6) return { days: d, label: "NEAR EXPIRED", tone: "warn" };
  return { days: d, label: "OK", tone: "ok" };
}

/* ============ Server helpers ============ */
async function fetchServerReports() {
  try {
    const url = `${API_BASE}/api/reports?type=${encodeURIComponent(
      TYPE
    )}&limit=500`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data) return [];

    const arr =
      Array.isArray(data)
        ? data
        : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.results)
        ? data.results
        : Array.isArray(data.records)
        ? data.records
        : [];

    const all = [];
    for (const it of arr) {
      const dbId = it.id || it._id || null;
      const payload =
        it.payload && typeof it.payload === "object" ? it.payload : it;
      all.push({
        id:
          dbId ||
          `${payload.reportDate || "srv"}-${Math.random()
            .toString(36)
            .slice(2, 8)}`,
        _dbId: dbId,
        reportTitle: payload.reportTitle || it.reportTitle || "",
        reportDate: payload.reportDate || it.reportDate || "",
        products: Array.isArray(payload.products) ? payload.products : [],
        checkedBy: payload.checkedBy || "",
        verifiedBy: payload.verifiedBy || "",
      });
    }
    return all;
  } catch {
    return [];
  }
}

async function deleteServerReport(idOrDbId) {
  const id = String(idOrDbId);
  const res = await fetch(
    `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false)
    throw new Error(data?.error || "Delete failed");
}

async function deleteServerRow(idOrDbId, productIndex) {
  const list = await fetchServerReports();
  const rep = list.find(
    (r) =>
      String(r._dbId || "") === String(idOrDbId) ||
      String(r.id) === String(idOrDbId)
  );
  if (!rep) throw new Error("Report not found");

  const nextProducts = [...(rep.products || [])];
  if (productIndex < 0 || productIndex >= nextProducts.length)
    throw new Error("Row index invalid");

  nextProducts.splice(productIndex, 1);
  const id = rep._dbId || rep.id;

  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: {
        reportTitle: rep.reportTitle,
        reportDate: rep.reportDate,
        products: nextProducts,
        checkedBy: rep.checkedBy || "",
        verifiedBy: rep.verifiedBy || "",
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false)
    throw new Error(data?.error || "Update failed");
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
        checkedBy: rep.checkedBy || "",
        verifiedBy: rep.verifiedBy || "",
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
  const [treeFilter, setTreeFilter] = useState({
    year: "",
    month: "",
    day: "",
  });

  // حالات الطي/الفتح للشجرة
  const [expandedYears, setExpandedYears] = useState(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState(() => new Set());

  const [sortBy, setSortBy] = useState("date_desc");

  // فلاتر إضافية
  const [statusFilter, setStatusFilter] = useState("all"); // all|expired|near|ok
  const [customerFilter, setCustomerFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    target: null,
    type: null,
  });
  const [banner, setBanner] = useState("");
  const [busy, setBusy] = useState(false);

  // مراجع أقسام التقارير للتمرير
  const sectionRefs = useRef({});

  /* Load once */
  useEffect(() => {
    loadFromServerOnly().then(() => {
      const saved = JSON.parse(
        localStorage.getItem("finished_reports_ui") || "{}"
      );
      if (saved.search) setSearch(saved.search);
      if (saved.sortBy) setSortBy(saved.sortBy);
      if (saved.treeFilter && saved.treeFilter.year)
        setTreeFilter(saved.treeFilter);
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
        .map((r) => r.reportDate)
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

  const refreshNow = async () => {
    await loadFromServerOnly();
  };

  /* Persist UI state */
  useEffect(() => {
    const payload = {
      search,
      sortBy,
      treeFilter,
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
    return Object.keys(groupedByYMD)
      .filter((y) => /^\d{4}$/.test(y))
      .sort((a, b) => b.localeCompare(a));
  }, [groupedByYMD]);

  /* تجهيز الصفوف بالحالة (status) */
  const enriched = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      __status: statusFromDates(r.reportDate, r.expiryDate),
    }));
  }, [rows]);

  /* قوائم Customer & Unit للفلاتر */
  const customerList = useMemo(() => {
    const s = new Set();
    enriched.forEach((r) => {
      const c = String(r.customer || "").trim();
      if (c) s.add(c);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const unitList = useMemo(() => {
    const s = new Set();
    enriched.forEach((r) => {
      const u = String(r.unitOfMeasure || "").trim();
      if (u) s.add(u);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  /* Apply search + date filter + status + customer + unit + flagged */
  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return enriched.filter((r) => {
      if (treeFilter.year) {
        const { y, m, d } = parseYMD(r.reportDate || "");
        if (y !== treeFilter.year) return false;
        if (treeFilter.month && m !== treeFilter.month) return false;
        if (treeFilter.day && d !== treeFilter.day) return false;
      }
      // status filter
      if (statusFilter !== "all") {
        const t = r.__status?.tone;
        if (statusFilter === "expired" && t !== "danger") return false;
        if (statusFilter === "near" && t !== "warn") return false;
        if (statusFilter === "ok" && t !== "ok") return false;
      }
      if (showFlaggedOnly && !["danger", "warn"].includes(r.__status?.tone)) {
        return false;
      }
      if (
        customerFilter &&
        String(r.customer || "").trim() !== customerFilter
      ) {
        return false;
      }
      if (
        unitFilter &&
        String(r.unitOfMeasure || "").trim() !== unitFilter
      ) {
        return false;
      }
      if (!q) return true;
      const hay = [
        r.product,
        r.customer,
        r.orderNo,
        r.time,
        r.slaughterDate,
        r.expiryDate,
        r.temp,
        r.quantity,
        r.unitOfMeasure,
        r.overallCondition,
        r.remarks,
        r.reportDate,
        r.reportTitle,
      ]
        .map((v) => String(v ?? ""))
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [
    enriched,
    debouncedSearch,
    treeFilter,
    statusFilter,
    customerFilter,
    unitFilter,
    showFlaggedOnly,
  ]);

  /* إحصاءات على كل البيانات (لا تتأثر بالفلاتر — تعطي صورة كاملة) */
  const stats = useMemo(() => {
    const out = {
      reports: 0,
      rows: enriched.length,
      qty: 0,
      expired: 0,
      near: 0,
      ok: 0,
      muted: 0,
      expiredQty: 0,
      nearQty: 0,
    };
    const reportSet = new Set();
    enriched.forEach((r) => {
      const id = r.__dbId || r.__reportId;
      if (id) reportSet.add(id);
      const q = Number(r.quantity) || 0;
      out.qty += q;
      const t = r.__status?.tone || "muted";
      out[t] = (out[t] || 0) + 1;
      if (t === "danger") out.expiredQty += q;
      if (t === "warn") out.nearQty += q;
    });
    out.reports = reportSet.size;
    return out;
  }, [enriched]);

  /* Smart insights — top customers/products + anomalies */
  const insights = useMemo(() => {
    const custMap = new Map();
    const prodMap = new Map();
    const issuesByReport = new Map();
    const anomalies = [];

    enriched.forEach((r) => {
      const c = String(r.customer || "").trim();
      const p = String(r.product || "").trim();
      const q = Number(r.quantity) || 0;
      if (c) {
        const cur = custMap.get(c) || { customer: c, qty: 0, rows: 0 };
        cur.qty += q;
        cur.rows += 1;
        custMap.set(c, cur);
      }
      if (p) {
        const cur = prodMap.get(p) || { product: p, qty: 0, rows: 0 };
        cur.qty += q;
        cur.rows += 1;
        prodMap.set(p, cur);
      }
      const tone = r.__status?.tone;
      if (tone === "danger" || tone === "warn") {
        const id = r.__dbId || r.__reportId;
        const cur = issuesByReport.get(id) || {
          reportId: id,
          reportDate: r.reportDate || "",
          reportTitle: r.reportTitle || "",
          expired: 0,
          near: 0,
        };
        if (tone === "danger") cur.expired += 1;
        else cur.near += 1;
        issuesByReport.set(id, cur);
      }
      // anomaly: quantity = 0
      if (r.quantity !== "" && r.quantity != null && Number(r.quantity) === 0) {
        anomalies.push({
          type: "zero_qty",
          label: "Zero quantity",
          row: r,
        });
      }
      // anomaly: TEMP suspicious (numeric and > 5 for non-frozen, > -10 for frozen)
      const tempNum = Number(r.temp);
      if (Number.isFinite(tempNum)) {
        const isFrozen = /(frozen|frz|frzn|freez|مجمد)/i.test(p) &&
          !/(defrost|thaw|مذوب|مفكوك|defrosted)/i.test(p);
        if (isFrozen && tempNum > -10) {
          anomalies.push({
            type: "temp_high_frozen",
            label: `Frozen at ${tempNum}°C (>-10)`,
            row: r,
          });
        } else if (!isFrozen && tempNum > 5) {
          anomalies.push({
            type: "temp_high",
            label: `TEMP ${tempNum}°C (>5)`,
            row: r,
          });
        }
      }
    });

    return {
      topCustomers: Array.from(custMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
      topProducts: Array.from(prodMap.values())
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5),
      problemReports: Array.from(issuesByReport.values())
        .sort((a, b) => b.expired - a.expired || b.near - a.near)
        .slice(0, 5),
      anomalies: anomalies.slice(0, 20),
      anomaliesCount: anomalies.length,
    };
  }, [enriched]);

  /* Group filtered rows by report */
  const reportsArr = useMemo(() => {
    const m = new Map();
    for (const r of filtered) {
      const id = r.__dbId || r.__reportId;
      if (!m.has(id)) {
        m.set(id, {
          reportId: id,
          dbId: r.__dbId || null,
          reportTitle: r.reportTitle || "",
          reportDate: r.reportDate || "",
          checkedBy: r.checkedBy || "",
          verifiedBy: r.verifiedBy || "",
          rows: [],
        });
      }
      m.get(id).rows.push(r);
    }
    let arr = Array.from(m.values());

    // pre-compute helpers
    const sumQty = (rep) =>
      rep.rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const issueCount = (rep) =>
      rep.rows.reduce(
        (s, r) =>
          s +
          (r.__status?.tone === "danger"
            ? 2
            : r.__status?.tone === "warn"
            ? 1
            : 0),
        0
      );
    const firstCustomer = (rep) => rep.rows[0]?.customer || "";

    switch (sortBy) {
      case "date_desc":
        arr.sort(
          (a, b) =>
            (b.reportDate || "").localeCompare(a.reportDate || "") ||
            (a.reportTitle || "").localeCompare(b.reportTitle || "")
        );
        break;
      case "date_asc":
        arr.sort(
          (a, b) =>
            (a.reportDate || "").localeCompare(b.reportDate || "") ||
            (a.reportTitle || "").localeCompare(b.reportTitle || "")
        );
        break;
      case "title_az":
        arr.sort((a, b) =>
          (a.reportTitle || "").localeCompare(b.reportTitle || "")
        );
        break;
      case "title_za":
        arr.sort((a, b) =>
          (b.reportTitle || "").localeCompare(a.reportTitle || "")
        );
        break;
      case "customer_az":
        arr.sort((a, b) => firstCustomer(a).localeCompare(firstCustomer(b)));
        break;
      case "customer_za":
        arr.sort((a, b) => firstCustomer(b).localeCompare(firstCustomer(a)));
        break;
      case "qty_desc":
        arr.sort((a, b) => sumQty(b) - sumQty(a));
        break;
      case "qty_asc":
        arr.sort((a, b) => sumQty(a) - sumQty(b));
        break;
      case "rows_desc":
        arr.sort((a, b) => b.rows.length - a.rows.length);
        break;
      case "issues_desc":
        arr.sort(
          (a, b) =>
            issueCount(b) - issueCount(a) ||
            (b.reportDate || "").localeCompare(a.reportDate || "")
        );
        break;
      default:
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const totalQty = useMemo(
    () => filtered.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
    [filtered]
  );

  /* Actions: delete row/report */
  const requestDeleteRow = (row) =>
    setConfirmState({ open: true, target: row, type: "row" });
  const requestDeleteReport = (reportIdOrDbId) =>
    setConfirmState({ open: true, target: reportIdOrDbId, type: "report" });

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
  const closeConfirm = () =>
    setConfirmState({ open: false, target: null, type: null });

  /* XLSX Export */
  function exportRowsToXLSX(data, filename) {
    const headers = [
      "Product",
      "Customer",
      "Order No",
      "TIME",
      "Slaughter Date",
      "Expiry Date",
      "TEMP",
      "Quantity",
      "Unit of Measure",
      "OVERALL CONDITION",
      "REMARKS",
      "Report Title",
      "Report Date",
      "Days to Expiry",
      "Status",
    ];
    const aoa = [headers];
    data.forEach((r) => {
      const st = statusFromDates(r.reportDate, r.expiryDate);
      aoa.push([
        r.product,
        r.customer,
        r.orderNo,
        r.time,
        formatDMY(r.slaughterDate),
        formatDMY(r.expiryDate),
        r.temp,
        r.quantity,
        r.unitOfMeasure || "KG",
        r.overallCondition,
        r.remarks,
        r.reportTitle || "",
        r.reportDate || "",
        st.days === "" ? "" : st.days,
        st.label,
      ]);
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws["!cols"] = [
      { wch: 34 },
      { wch: 20 },
      { wch: 16 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
      { wch: 10 },
      { wch: 12 },
      { wch: 18 },
      { wch: 26 },
      { wch: 24 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
    ];

    const headFill = {
      patternType: "solid",
      fgColor: { rgb: "F2F6FF" },
    };
    const headFont = { bold: true, color: { rgb: "1F2937" } };
    const border = {
      top: { style: "thin", color: { rgb: "94A3B8" } },
      bottom: { style: "thin", color: { rgb: "94A3B8" } },
      left: { style: "thin", color: { rgb: "CBD5E1" } },
      right: { style: "thin", color: { rgb: "CBD5E1" } },
    };

    const range = XLSX.utils.decode_range(ws["!ref"]);
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        fill: headFill,
        font: headFont,
        alignment: { horizontal: "center", vertical: "center" },
        border,
      };
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

  /* Clear all filters */
  function clearAllFilters() {
    setSearch("");
    setStatusFilter("all");
    setCustomerFilter("");
    setUnitFilter("");
    setShowFlaggedOnly(false);
    setTreeFilter({ year: "", month: "", day: "" });
    setSortBy("date_desc");
  }

  /* Print individual report */
  function printReport(rep) {
    if (!rep || !rep.rows?.length) {
      alert("Nothing to print.");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      alert("Please allow pop-ups to print.");
      return;
    }
    const esc = (v) =>
      String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const trs = rep.rows
      .map((r, i) => {
        const st = r.__status || statusFromDates(r.reportDate, r.expiryDate);
        const tone =
          st.tone === "danger"
            ? "color:#b91c1c;font-weight:700"
            : st.tone === "warn"
            ? "color:#b45309;font-weight:700"
            : st.tone === "ok"
            ? "color:#166534"
            : "color:#64748b";
        return `
          <tr>
            <td>${i + 1}</td>
            <td>${esc(r.product)}</td>
            <td>${esc(r.customer)}</td>
            <td>${esc(r.orderNo)}</td>
            <td>${esc(r.time)}</td>
            <td>${esc(formatDMY(r.slaughterDate))}</td>
            <td>${esc(formatDMY(r.expiryDate))}</td>
            <td>${esc(r.temp)}</td>
            <td>${esc(r.quantity)}</td>
            <td>${esc(r.unitOfMeasure || "KG")}</td>
            <td>${esc(r.overallCondition)}</td>
            <td>${esc(r.remarks)}</td>
            <td>${st.days === "" ? "—" : st.days}</td>
            <td style="${tone}">${esc(st.label)}</td>
          </tr>`;
      })
      .join("");
    const total = rep.rows.reduce(
      (s, r) => s + (Number(r.quantity) || 0),
      0
    );
    w.document.write(`
      <html>
        <head>
          <title>${esc(rep.reportTitle || "Report")} — ${esc(formatDMY(rep.reportDate))}</title>
          <meta charset="utf-8" />
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 16px; color:#0f172a; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            .meta { font-size: 12px; color: #475569; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
            thead { background: #0f172a; color: #fff; }
            tr:nth-child(even) td { background: #f8fafc; }
            tfoot td { background: #fef9c3; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>${esc(rep.reportTitle || "Final Product Report")}</h1>
          <div class="meta">
            Date: <b>${esc(formatDMY(rep.reportDate))}</b> &nbsp;|&nbsp;
            Rows: <b>${rep.rows.length}</b> &nbsp;|&nbsp;
            Total Qty: <b>${total}</b> &nbsp;|&nbsp;
            Checked by: <b>${esc(rep.checkedBy || "-")}</b> &nbsp;|&nbsp;
            Verified by: <b>${esc(rep.verifiedBy || "-")}</b>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>Customer</th><th>Order</th>
                <th>Time</th><th>Slaughter</th><th>Expiry</th><th>Temp</th>
                <th>Qty</th><th>Unit</th><th>Cond</th><th>Remarks</th>
                <th>Days</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${trs}</tbody>
            <tfoot>
              <tr><td colspan="8" style="text-align:right">Total Quantity:</td>
              <td>${total}</td><td colspan="5"></td></tr>
            </tfoot>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  }

  /* Label للفلترة */
  const filterLabel = useMemo(() => {
    const { year, month, day } = treeFilter;
    if (!year) return "";
    if (year && !month && !day) return `${year}`;
    if (year && month && !day) return `${year}/${pad2(month)}`;
    return `${year}/${pad2(month)}/${pad2(day)}`;
  }, [treeFilter]);

  /* Helpers لتحديد العنصر النشط */
  const isYearActive = (y) =>
    treeFilter.year === y && !treeFilter.month && !treeFilter.day;
  const isMonthActive = (y, m) =>
    treeFilter.year === y && treeFilter.month === m && !treeFilter.day;
  const isDayActive = (y, m, d) =>
    treeFilter.year === y && treeFilter.month === m && treeFilter.day === d;

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
          .data-table { width: 100% !important; }
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
          border-radius:999px; padding:6px 12px; font-weight:800;
          width: fit-content;
        }
        .chip-day.active{ background:#dcfce7; border-color:#bbf7d0; color:#065f46; }
        .tree-actions button { border-radius:9px; }

        /* ✅ FIX: الجدول يلبس عرض الصفحة ويتوزع بشكل ثابت */
        .data-table { table-layout: fixed; width: 100%; }
        .data-table th, .data-table td { overflow: hidden; text-overflow: ellipsis; }

        /* ✅ Customer أصغر + wrap */
        .td-customer { white-space: normal !important; word-break: break-word; line-height: 1.15; }

        /* ✅ Product/Remarks wrap بدل ما يفرضوا عرض كبير */
        .td-product, .td-remarks { white-space: normal !important; word-break: break-word; line-height: 1.15; }
      `}</style>

      {/* LEFT: Collapsible Y/M/D Tree + Controls */}
      <aside
        style={{ ...sideCard, fontSize: "18px", padding: 16 }}
        className="tree-card"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#1f2937",
              fontSize: 22,
              fontWeight: 900,
              letterSpacing: ".2px",
            }}
          >
            📅 Filter by Date
          </h3>
          <div className="tree-actions" style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                const all = new Set(yearsList);
                setExpandedYears(all);
                const months = new Set();
                yearsList.forEach((y) =>
                  Object.keys(groupedByYMD[y] || {}).forEach((m) =>
                    months.add(`${y}-${m}`)
                  )
                );
                setExpandedMonths(months);
              }}
              style={{ ...btnGhost, padding: "6px 10px", fontSize: 13 }}
              disabled={busy}
            >
              Expand All
            </button>
            <button
              onClick={() => {
                setExpandedYears(new Set());
                setExpandedMonths(new Set());
              }}
              style={{ ...btnGhost, padding: "6px 10px", fontSize: 13 }}
              disabled={busy}
            >
              Collapse All
            </button>
            <button
              onClick={refreshNow}
              style={{ ...btnGhost, padding: "6px 10px", fontSize: 13 }}
              disabled={busy}
            >
              Refresh
            </button>
          </div>
        </div>

        {banner && (
          <div
            style={{
              background: "#eaf2f8",
              color: "#1b4f72",
              borderRadius: 8,
              padding: "8px 10px",
              marginBottom: 10,
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {banner}
          </div>
        )}

        {/* شجرة سنة → شهر/سنة → أيام (كل يوم سطر) */}
        <div style={{ display: "grid", gap: 10 }}>
          {yearsList.length === 0 && <div style={mutedText}>No years</div>}
          {yearsList.map((y) => {
            const months = Object.keys(groupedByYMD[y] || {})
              .filter((m) => /^\d{2}$/.test(m))
              .sort();
            const yearCount = months.reduce((acc, m) => {
              const days = Object.keys(groupedByYMD[y][m] || {});
              return (
                acc +
                days.reduce(
                  (s, d) => s + (groupedByYMD[y][m][d]?.length || 0),
                  0
                )
              );
            }, 0);

            const keyY = y;
            const isYExpanded = expandedYears.has(keyY);

            return (
              <div
                key={y}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  background: "#fff",
                }}
              >
                <div
                  className="year-head"
                  onClick={() => {
                    const next = new Set(expandedYears);
                    if (next.has(keyY)) next.delete(keyY);
                    else next.add(keyY);
                    setExpandedYears(next);
                  }}
                  style={{ padding: "10px 12px" }}
                  title={`Year ${y}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      className={`caret ${isYExpanded ? "open" : ""}`}
                      style={{ fontSize: 16 }}
                    >
                      ▶
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTreeFilter({ year: y, month: "", day: "" });
                      }}
                      className={`pill ${isYearActive(y) ? "active" : ""}`}
                      style={{
                        padding: "6px 12px",
                        fontWeight: 900,
                        color: "#0f172a",
                      }}
                    >
                      {y}
                    </button>
                    <span className="count-badge">{yearCount}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setTreeFilter({ year: y, month: "", day: "" });
                    }}
                    style={{ ...btnGhost, padding: "4px 10px", fontSize: 12.5 }}
                  >
                    Filter
                  </button>
                </div>

                {isYExpanded && (
                  <div style={{ padding: "6px 10px 12px", display: "grid", gap: 8 }}>
                    {months.length === 0 && <div style={mutedText}>No months</div>}
                    {months.map((m) => {
                      const keyM = `${y}-${m}`;
                      const days = Object.keys(groupedByYMD[y][m] || {})
                        .filter((d) => /^\d{2}$/.test(d))
                        .sort();
                      const monthCount = days.reduce(
                        (s, d) => s + (groupedByYMD[y][m][d]?.length || 0),
                        0
                      );
                      const isMExpanded = expandedMonths.has(keyM);

                      return (
                        <div
                          key={keyM}
                          style={{
                            border: "1px dashed #e2e8f0",
                            borderRadius: 12,
                            background: "#fafcff",
                          }}
                        >
                          <div
                            className="month-head"
                            onClick={() => {
                              const next = new Set(expandedMonths);
                              if (next.has(keyM)) next.delete(keyM);
                              else next.add(keyM);
                              setExpandedMonths(next);
                            }}
                            style={{ padding: "8px 10px" }}
                            title={`${y}/${m}`}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span
                                className={`caret ${isMExpanded ? "open" : ""}`}
                                style={{ fontSize: 14 }}
                              >
                                ▶
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTreeFilter({ year: y, month: m, day: "" });
                                }}
                                className={`pill ${isMonthActive(y, m) ? "active" : ""}`}
                                style={{
                                  padding: "5px 10px",
                                  fontWeight: 900,
                                  color: "#0f172a",
                                  fontSize: 14.5,
                                }}
                              >
                                {m} / {y}
                              </button>
                              <span className="count-badge">{monthCount}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTreeFilter({ year: y, month: m, day: "" });
                              }}
                              style={{ ...btnGhost, padding: "3px 8px", fontSize: 12 }}
                            >
                              Filter
                            </button>
                          </div>

                          {isMExpanded && (
                            <div style={{ padding: "6px 10px 10px", display: "grid", gap: 8 }}>
                              {days.length === 0 && <div style={mutedText}>No days</div>}
                              {days.map((d) => {
                                const dayCount = groupedByYMD[y][m][d]?.length || 0;
                                const active = isDayActive(y, m, d);
                                return (
                                  <button
                                    key={`${y}-${m}-${d}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTreeFilter({ year: y, month: m, day: d });
                                    }}
                                    className={`chip-day ${active ? "active" : ""}`}
                                    title={`${d}/${m}/${y} (${dayCount})`}
                                  >
                                    {d} / {m} / {y}&nbsp;
                                    <span style={{ color: active ? "#065f46" : "#64748b" }}>
                                      ({dayCount})
                                    </span>
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

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setTreeFilter({ year: "", month: "", day: "" })}
            style={btnClear}
          >
            ✖ Clear Filter
          </button>
          {filterLabel && (
            <div style={{ fontSize: 14.5, color: "#334155" }}>
              Filter: <b>{filterLabel}</b>
            </div>
          )}
        </div>
      </aside>

      {/* RIGHT: Reports list */}
      <main>
        {/* ===== Stat cards (clickable to filter) ===== */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <StatCard
            label="Reports"
            value={stats.reports}
            color="#1d4ed8"
            icon="📑"
            sub={`${stats.rows} rows`}
          />
          <StatCard
            label="Total Qty"
            value={stats.qty.toLocaleString()}
            color="#0f766e"
            icon="⚖️"
          />
          <StatCard
            label="Expired"
            value={stats.expired}
            color="#b91c1c"
            icon="⛔"
            sub={`${stats.expiredQty} qty`}
            active={statusFilter === "expired"}
            onClick={() =>
              setStatusFilter(statusFilter === "expired" ? "all" : "expired")
            }
          />
          <StatCard
            label="Near Expiry"
            value={stats.near}
            color="#c2410c"
            icon="⚠️"
            sub={`${stats.nearQty} qty`}
            active={statusFilter === "near"}
            onClick={() =>
              setStatusFilter(statusFilter === "near" ? "all" : "near")
            }
          />
          <StatCard
            label="Valid (OK)"
            value={stats.ok}
            color="#15803d"
            icon="✅"
            active={statusFilter === "ok"}
            onClick={() =>
              setStatusFilter(statusFilter === "ok" ? "all" : "ok")
            }
          />
          <StatCard
            label="Anomalies"
            value={insights.anomaliesCount}
            color="#7c3aed"
            icon="🧠"
            sub="zero qty / temp"
            active={showInsights}
            onClick={() => setShowInsights((v) => !v)}
          />
        </div>

        {/* ===== Status chips ===== */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#374151",
              marginRight: 4,
              letterSpacing: 0.4,
            }}
          >
            STATUS:
          </span>
          {[
            { value: "all", label: "All", color: "#1d4ed8" },
            { value: "expired", label: "Expired", color: "#b91c1c" },
            { value: "near", label: "Near Expiry", color: "#c2410c" },
            { value: "ok", label: "OK", color: "#15803d" },
          ].map((s) => {
            const active = statusFilter === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatusFilter(s.value)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
                  border: `1.5px solid ${s.color}`,
                  background: active ? s.color : "transparent",
                  color: active ? "#fff" : s.color,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {s.label}
              </button>
            );
          })}

          <label
            style={{
              display: "inline-flex",
              gap: 6,
              alignItems: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
              padding: "4px 10px",
              borderRadius: 999,
              background: showFlaggedOnly
                ? "linear-gradient(135deg,#fef2f2,#fee2e2)"
                : "transparent",
              border: `1.5px solid ${
                showFlaggedOnly ? "#ef4444" : "#cbd5e1"
              }`,
              cursor: "pointer",
              marginLeft: 8,
            }}
          >
            <input
              type="checkbox"
              checked={showFlaggedOnly}
              onChange={(e) => setShowFlaggedOnly(e.target.checked)}
              style={{ margin: 0 }}
            />
            🚩 Flagged only
          </label>
        </div>

        {/* ===== Filter row 2: dropdowns + sort + actions ===== */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 12,
            alignItems: "center",
            background:
              "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            padding: 10,
            borderRadius: 12,
            border: "1px solid #e2e8f0",
          }}
        >
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            style={filterSelectStyle}
            disabled={busy}
            title="Filter by Customer"
          >
            <option value="">👤 All Customers ({customerList.length})</option>
            {customerList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            style={filterSelectStyle}
            disabled={busy}
            title="Filter by Unit"
          >
            <option value="">📦 All Units</option>
            {unitList.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={filterSelectStyle}
            disabled={busy}
            title="Sort By"
          >
            <option value="date_desc">↕ Date (Newest → Oldest)</option>
            <option value="date_asc">↕ Date (Oldest → Newest)</option>
            <option value="title_az">↕ Title (A → Z)</option>
            <option value="title_za">↕ Title (Z → A)</option>
            <option value="customer_az">↕ Customer (A → Z)</option>
            <option value="customer_za">↕ Customer (Z → A)</option>
            <option value="qty_desc">↕ Quantity (High → Low)</option>
            <option value="qty_asc">↕ Quantity (Low → High)</option>
            <option value="rows_desc">↕ Most Products First</option>
            <option value="issues_desc">⚠ Most Issues First (Smart)</option>
          </select>

          <button
            type="button"
            onClick={clearAllFilters}
            style={{
              ...btnGhost,
              padding: "7px 14px",
              borderRadius: 999,
            }}
          >
            ✕ Clear Filters
          </button>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={() => setShowInsights((v) => !v)}
            style={{
              padding: "7px 14px",
              borderRadius: 999,
              border: "none",
              background: showInsights
                ? "linear-gradient(135deg,#7c3aed,#5b21b6)"
                : "linear-gradient(135deg,#a78bfa,#7c3aed)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(124,58,237,0.35)",
            }}
          >
            🧠 {showInsights ? "Hide" : "Show"} Insights
          </button>

          <button
            onClick={exportXLSXFiltered}
            style={{
              ...btnSoftBlue,
              padding: "7px 14px",
              borderRadius: 999,
            }}
            disabled={busy}
          >
            ⬇️ Export XLSX
          </button>
        </div>

        {/* ===== Smart Insights panel ===== */}
        {showInsights && (
          <SmartInsights
            insights={insights}
            stats={stats}
            onPickCustomer={(c) => setCustomerFilter(c)}
          />
        )}

        {/* Top search/sort bar */}
        <div className="top-bar" style={topBar}>
          <input
            className="search-box"
            type="search"
            placeholder="🔍 Search product, customer, order, remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={searchBox}
            disabled={busy}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#475569",
                fontSize: 14,
                padding: "8px 14px",
                borderRadius: 999,
                background: "#fff",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 6px rgba(2,6,23,.04)",
              }}
            >
              Rows: <b style={{ color: "#2563eb" }}>{filtered.length}</b>
              &nbsp;/&nbsp;
              <span style={{ color: "#94a3b8" }}>{stats.rows}</span>
              &nbsp;|&nbsp; Total Qty:{" "}
              <b style={{ color: "#16a34a" }}>
                {totalQty.toLocaleString()}
              </b>
              {filterLabel && (
                <>
                  &nbsp;|&nbsp;
                  <span style={{ color: "#7c3aed", fontWeight: 700 }}>
                    📅 {filterLabel}
                  </span>
                </>
              )}
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
            const repTotalQty = rowsOfRep.reduce(
              (s, r) => s + (Number(r.quantity) || 0),
              0
            );

            // ملخّص الحالة لكل تقرير
            const repCounts = rowsOfRep.reduce(
              (acc, r) => {
                const t = r.__status?.tone || "muted";
                acc[t] = (acc[t] || 0) + 1;
                return acc;
              },
              { danger: 0, warn: 0, ok: 0, muted: 0 }
            );
            const worstTone =
              repCounts.danger > 0
                ? "danger"
                : repCounts.warn > 0
                ? "warn"
                : repCounts.ok > 0
                ? "ok"
                : "muted";
            const stripColor =
              worstTone === "danger"
                ? "linear-gradient(180deg,#ef4444,#b91c1c)"
                : worstTone === "warn"
                ? "linear-gradient(180deg,#f59e0b,#c2410c)"
                : worstTone === "ok"
                ? "linear-gradient(180deg,#22c55e,#15803d)"
                : "linear-gradient(180deg,#94a3b8,#64748b)";
            const cardBg =
              worstTone === "danger"
                ? "linear-gradient(135deg,#fffbfa 0%,#ffffff 60%)"
                : worstTone === "warn"
                ? "linear-gradient(135deg,#fff8f0 0%,#ffffff 60%)"
                : "#ffffff";

            return (
              <section
                key={rep.reportId || `rep-${idx}`}
                ref={(el) => {
                  if (rep.reportId) sectionRefs.current[rep.reportId] = el;
                }}
                style={{
                  ...card,
                  background: cardBg,
                  borderLeft: `0`,
                  position: "relative",
                  paddingLeft: 18,
                  transition:
                    "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 14px 36px rgba(2,6,23,.10)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px rgba(2,6,23,.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Status strip on the left */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 8,
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                    background: stripColor,
                  }}
                />

                {/* Header */}
                <div style={cardHead}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: "#111827" }}>
                      {highlightMatch(
                        rep.reportTitle || "Untitled Report",
                        debouncedSearch
                      )}
                    </div>
                    <div style={{ color: "#64748b", marginTop: 2, fontSize: 14.5 }}>
                      {formatDMY(rep.reportDate)}{" "}
                      <span style={{ color: "#94a3b8" }}>
                        ({rep.reportDate || "-"})
                      </span>
                    </div>

                    {/* ✅ التواقيع أسفل التاريخ */}
                    <div
                      style={{
                        marginTop: 6,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 18,
                        fontSize: 14.5,
                        color: "#111827",
                        fontWeight: 600,
                      }}
                    >
                      <span>
                        Checked by:{" "}
                        <span style={{ fontWeight: 800 }}>{rep.checkedBy || "-"}</span>
                      </span>
                      <span>
                        Verified by:{" "}
                        <span style={{ fontWeight: 800 }}>{rep.verifiedBy || "-"}</span>
                      </span>
                    </div>

                    {/* Mini status summary for this report */}
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <MiniBadge
                        color="#1d4ed8"
                        label="Rows"
                        value={rowsOfRep.length}
                      />
                      <MiniBadge
                        color="#16a34a"
                        label="Qty"
                        value={repTotalQty.toLocaleString()}
                      />
                      {repCounts.danger > 0 && (
                        <MiniBadge
                          color="#b91c1c"
                          label="⛔ Expired"
                          value={repCounts.danger}
                        />
                      )}
                      {repCounts.warn > 0 && (
                        <MiniBadge
                          color="#c2410c"
                          label="⚠ Near"
                          value={repCounts.warn}
                        />
                      )}
                      {repCounts.ok > 0 && (
                        <MiniBadge
                          color="#15803d"
                          label="✓ OK"
                          value={repCounts.ok}
                        />
                      )}
                    </div>
                  </div>

                  {/* الأزرار */}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      onClick={() => printReport(rep)}
                      style={btnSoftIndigo}
                      disabled={busy}
                      title="Print this report"
                    >
                      🖨 Print
                    </button>
                    <button
                      onClick={() => requestDeleteReport(rep.dbId || rep.reportId)}
                      style={btnDanger}
                      disabled={busy}
                    >
                      Delete Report
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div
                  className="table-wrap"
                  style={{
                    overflowX: "auto",
                    border: "1.5px solid #94a3b8",
                    borderRadius: 12,
                  }}
                >
                  <table
                    className="data-table"
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "15.5px",
                      tableLayout: "fixed",
                    }}
                  >
                    {/* ✅ توزيع أعمدة ثابت لتقليل اختفاء يمين الشاشة */}
                    <colgroup>
                      <col style={{ width: "22%" }} /> {/* Product */}
                      <col style={{ width: "16%" }} /> {/* Customer (أصغر) */}
                      <col style={{ width: "10%" }} /> {/* Order */}
                      <col style={{ width: "7%" }} /> {/* Time */}
                      <col style={{ width: "9%" }} /> {/* Slaughter */}
                      <col style={{ width: "9%" }} /> {/* Expiry */}
                      <col style={{ width: "5%" }} /> {/* Temp */}
                      <col style={{ width: "8%" }} /> {/* Qty */}
                      <col style={{ width: "4%" }} /> {/* Unit */}
                      <col style={{ width: "8%" }} /> {/* Cond */}
                      <col style={{ width: "8%" }} /> {/* Remarks */}
                      <col style={{ width: "4%" }} /> {/* Days */}
                      <col style={{ width: "8%" }} /> {/* Status */}
                      <col style={{ width: "4%" }} /> {/* Delete */}
                    </colgroup>

                    <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                      <tr style={{ background: "#f8fafc", color: "#1f2937" }}>
                        <th style={{ ...th, textAlign: "left" }}>Product</th>
                        <th style={{ ...th, textAlign: "left" }}>Customer</th>
                        <th style={{ ...th, minWidth: 0 }}>Order No</th>
                        <th className="col-time" style={{ ...th, minWidth: 0 }}>
                          TIME
                        </th>
                        <th className="col-slaughter" style={{ ...th, minWidth: 0 }}>
                          Slaughter Date
                        </th>
                        <th style={{ ...th, minWidth: 0 }}>Expiry Date</th>
                        <th className="col-temp" style={{ ...th, minWidth: 0 }}>
                          TEMP
                        </th>
                        <th style={{ ...th, minWidth: 0 }}>Quantity</th>
                        <th className="col-unit" style={{ ...th, minWidth: 0 }}>
                          Unit
                        </th>
                        <th className="col-cond" style={{ ...th, minWidth: 0 }}>
                          Condition
                        </th>
                        <th className="col-remarks" style={{ ...th, textAlign: "left", minWidth: 0 }}>
                          Remarks
                        </th>
                        <th style={{ ...th, minWidth: 0 }}>Days</th>
                        <th style={{ ...th, minWidth: 0 }}>Status</th>
                        <th style={{ ...th, minWidth: 0 }}></th>
                      </tr>
                    </thead>

                    <tbody>
                      {rowsOfRep.map((row, i) => {
                        const st = statusFromDates(row.reportDate, row.expiryDate);
                        const hasImages =
                          Array.isArray(row.images) && row.images.filter(Boolean).length > 0;

                        return (
                          <tr
                            key={`${row.__reportId || "rep"}-${row.__productIndex ?? i}`}
                            style={{ background: i % 2 ? "#ffffff" : "#fbfdff" }}
                          >
                            <td
                              className="td-product"
                              style={{ ...td, textAlign: "left", wordBreak: "break-word" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{highlightMatch(row.product, debouncedSearch)}</span>
                                {hasImages && (
                                  <span style={{ fontSize: 12, color: "#64748b" }}>
                                    ({row.images.length} pic)
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="td-customer" style={{ ...td, textAlign: "left" }}>
                              {highlightMatch(row.customer, debouncedSearch)}
                            </td>

                            <td style={td}>{highlightMatch(row.orderNo, debouncedSearch)}</td>

                            <td className="col-time" style={td}>
                              {row.time}
                            </td>

                            <td className="col-slaughter" style={td}>
                              {formatDMY(row.slaughterDate)}
                            </td>

                            <td style={td}>{formatDMY(row.expiryDate)}</td>

                            <td className="col-temp" style={td}>
                              {row.temp}
                            </td>

                            <td style={td}>{row.quantity}</td>

                            <td className="col-unit" style={td}>
                              {row.unitOfMeasure || "KG"}
                            </td>

                            <td className="col-cond" style={td}>
                              {row.overallCondition}
                            </td>

                            <td className="td-remarks col-remarks" style={{ ...td, textAlign: "left" }}>
                              {highlightMatch(row.remarks, debouncedSearch)}
                            </td>

                            <td style={td}>{st.days === "" ? "" : st.days}</td>

                            <td style={td}>
                              <span
                                style={{
                                  ...badge,
                                  ...(st.tone === "danger"
                                    ? badgeDanger
                                    : st.tone === "warn"
                                    ? badgeWarn
                                    : st.tone === "ok"
                                    ? badgeOk
                                    : badgeMuted),
                                }}
                              >
                                {st.label}
                              </span>
                            </td>

                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => requestDeleteRow(row)}
                                style={btnDangerSm}
                                title="Delete row"
                                disabled={busy}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                    <tfoot>
                      <tr style={{ background: "#f8fafc" }}>
                        <td colSpan={7} />
                        <td style={{ ...td, fontWeight: "bold", color: "#16a34a" }}>
                          {repTotalQty}
                        </td>
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
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
              Confirm deletion
            </div>
            <div style={{ color: "#475569", marginBottom: 16 }}>
              {confirmState.type === "report"
                ? "This will delete the entire report and its rows."
                : "This will delete the selected row."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={closeConfirm} style={btnGhost} disabled={busy}>
                Cancel
              </button>
              <button onClick={confirmDeletion} style={btnDanger} disabled={busy}>
                Delete
              </button>
            </div>
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
const btnPrimary = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
};
const btnInfo = {
  background: "#0ea5e9",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
};
const btnGhost = {
  background: "#f8fafc",
  color: "#0f172a",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: 700,
};
const btnSoftBlue = {
  background: "#e0f2fe",
  color: "#0369a1",
  border: "1px solid #bae6fd",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
};
const btnDanger = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
};
const btnDangerSm = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "4px 8px",
  cursor: "pointer",
  fontWeight: 800,
};
const selectStyle = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1.6px solid #cbd5e1",
  background: "#f8fafc",
  fontWeight: 700,
  color: "#0f172a",
};
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
const badgeDanger = {
  color: "#991b1b",
  background: "#fee2e2",
  borderColor: "#fecaca",
};
const badgeWarn = {
  color: "#92400e",
  background: "#fef3c7",
  borderColor: "#fde68a",
};
const badgeOk = {
  color: "#065f46",
  background: "#d1fae5",
  borderColor: "#a7f3d0",
};
const badgeMuted = {
  color: "#334155",
  background: "#f1f5f9",
  borderColor: "#e2e8f0",
};
const modalBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.35)",
  display: "grid",
  placeItems: "center",
  zIndex: 50,
};
const modalCard = {
  background: "#fff",
  borderRadius: 16,
  padding: 16,
  width: 420,
  boxShadow: "0 20px 50px rgba(2,6,23,.25)",
  border: "1px solid #e2e8f0",
};
const mutedText = { fontSize: 14, color: "#94a3b8" };
const btnClear = {
  ...btnGhost,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 14,
  background: "#fff",
};

const btnSoftIndigo = {
  background: "#eef2ff",
  color: "#3730a3",
  border: "1px solid #c7d2fe",
  borderRadius: 10,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 800,
};

const filterSelectStyle = {
  padding: "8px 12px",
  borderRadius: 999,
  border: "1.5px solid #cbd5e1",
  background: "linear-gradient(135deg,#ffffff,#f8fafc)",
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  cursor: "pointer",
  outline: "none",
  minWidth: 180,
  maxWidth: 260,
};

/* === Reusable mini components === */
function StatCard({ label, value, color, icon, sub, active, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable && !onClick}
      style={{
        textAlign: "left",
        padding: "10px 12px",
        borderRadius: 14,
        border: active
          ? `2px solid ${color}`
          : "1px solid rgba(148,163,184,0.5)",
        background: active
          ? `linear-gradient(135deg, ${color}15, ${color}30)`
          : "linear-gradient(135deg,#ffffff,#f8fafc)",
        cursor: clickable ? "pointer" : "default",
        boxShadow: active
          ? `0 6px 18px ${color}55`
          : "0 2px 6px rgba(15,23,42,0.06)",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#6b7280",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color,
          marginTop: 2,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 10,
            color: "#64748b",
            fontWeight: 600,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </button>
  );
}

function MiniBadge({ color, label, value }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        color,
        background: `${color}14`,
        border: `1px solid ${color}55`,
      }}
    >
      <span style={{ opacity: 0.85 }}>{label}:</span>
      <span>{value}</span>
    </span>
  );
}

function SmartInsights({ insights, stats, onPickCustomer }) {
  const Section = ({ title, children, color = "#1d4ed8" }) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );

  const RowLine = ({ left, right, color }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "5px 0",
        borderBottom: "1px dashed #e5e7eb",
        fontSize: 13,
      }}
    >
      <span
        style={{
          color: "#0f172a",
          fontWeight: 600,
          maxWidth: "65%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={left}
      >
        {left}
      </span>
      <span style={{ color, fontWeight: 800 }}>{right}</span>
    </div>
  );

  return (
    <div
      style={{
        marginBottom: 12,
        padding: 14,
        borderRadius: 16,
        background:
          "linear-gradient(135deg,#faf5ff 0%,#f5f3ff 50%,#ede9fe 100%)",
        border: "1px solid #ddd6fe",
        boxShadow: "0 6px 18px rgba(124,58,237,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 900,
          color: "#5b21b6",
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        🧠 Smart Insights
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#7c3aed",
            background: "#ede9fe",
            padding: "2px 10px",
            borderRadius: 999,
          }}
        >
          {stats.rows} rows analyzed
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 10,
        }}
      >
        <Section title="🏆 Top Customers (by Quantity)" color="#0f766e">
          {insights.topCustomers.length === 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>No data.</div>
          )}
          {insights.topCustomers.map((c) => (
            <div
              key={c.customer}
              onClick={() => onPickCustomer && onPickCustomer(c.customer)}
              style={{ cursor: "pointer" }}
              title="Click to filter"
            >
              <RowLine
                left={c.customer}
                right={`${c.qty.toLocaleString()} (${c.rows})`}
                color="#0f766e"
              />
            </div>
          ))}
        </Section>

        <Section title="📦 Top Products (by Quantity)" color="#1d4ed8">
          {insights.topProducts.length === 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>No data.</div>
          )}
          {insights.topProducts.map((p) => (
            <RowLine
              key={p.product}
              left={p.product}
              right={`${p.qty.toLocaleString()} (${p.rows})`}
              color="#1d4ed8"
            />
          ))}
        </Section>

        <Section title="⚠️ Reports With Most Issues" color="#b91c1c">
          {insights.problemReports.length === 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              All clean! 🎉
            </div>
          )}
          {insights.problemReports.map((r) => (
            <RowLine
              key={r.reportId}
              left={`${formatDMY(r.reportDate)} — ${r.reportTitle || "Report"}`}
              right={`⛔ ${r.expired} / ⚠ ${r.near}`}
              color="#b91c1c"
            />
          ))}
        </Section>

        <Section title="🚨 Anomalies Detected" color="#7c3aed">
          {insights.anomalies.length === 0 && (
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              No anomalies.
            </div>
          )}
          {insights.anomalies.slice(0, 8).map((a, i) => (
            <RowLine
              key={i}
              left={`${a.row.product || "—"} (${a.row.customer || "—"})`}
              right={a.label}
              color="#7c3aed"
            />
          ))}
          {insights.anomaliesCount > 8 && (
            <div
              style={{
                fontSize: 11,
                color: "#7c3aed",
                marginTop: 6,
                textAlign: "center",
                fontWeight: 700,
              }}
            >
              +{insights.anomaliesCount - 8} more anomalies
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
