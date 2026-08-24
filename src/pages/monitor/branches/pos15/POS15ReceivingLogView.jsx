// src/pages/monitor/branches/pos15/POS15ReceivingLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { canEdit, canDelete, canWrite } from "../../../../utils/perms";
import SignatureName from "../../../shared/SignatureName";
import {
  formatDMY,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";
import { listReportDates, listReports, getReportRowByDate, reportDateOf, payloadOf } from "../_shared/reportApi";
import mawashiLogo from "../../../../assets/almawashi-logo.jpg";

const TYPE   = "pos15_receiving_log_butchery";
const BRANCH = "POS 15";

/* Columns judged C / NC on arrival. `hint` carries the paper form's full
   wording for the short header — spelled out in the heading it was unreadable. */
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean",   w: 105 },
  { key: "handlerHygiene", label: "Handler hygiene", w: 115, hint: "Food handler hygiene" },
  { key: "appearanceOK",   label: "Appearance",      w: 105, hint: "Normal colour, free from discoloration" },
  { key: "firmnessOK",     label: "Firmness",        w: 100, hint: "Firm rather than soft" },
  { key: "smellOK",        label: "Smell",           w: 95,  hint: "Normal smell — no rancid or strange smell" },
  { key: "packagingGood",  label: "Packaging intact", w: 125,
    hint: "Packaging of food is good and undamaged, clean and no signs of pest infestation" },
];

/* One definition of the sheet, used by the header row, the read-only row, the
   edit row, the CSV and the XLSX — five hand-maintained lists that each had to
   be edited in step, and any one of them slipping put a header above the wrong
   value.

   Code and product lead the sheet, the way the branch fills it in and the way
   POS 6 and POS 10 already print it.
     w  — on-screen pixel width,  xw — Excel column width. */
const COLUMNS = [
  { key: "itemCode",        label: "Item Code",            w: 115, xw: 13, kind: "code" },
  { key: "foodItem",        label: "Food Item",            w: 200, xw: 22, align: "left" },
  { key: "supplier",        label: "Name of the Supplier", w: 180, xw: 24, align: "left" },
  { key: "netWeight",       label: "Net Weight (kg)",      w: 110, xw: 14, kind: "number", step: "0.01" },
  { key: "vehicleTemp",     label: "Vehicle Temp (°C)",    w: 100, xw: 14, kind: "number", step: "0.1" },
  { key: "foodTemp",        label: "Food Temp (°C)",       w: 100, xw: 14, kind: "number", step: "0.1" },
  ...TICK_COLS.map((c) => ({ ...c, xw: 13, kind: "tick" })),
  { key: "countryOfOrigin", label: "Country of origin",    w: 135, xw: 16 },
  { key: "productionDate",  label: "Production Date",      w: 130, xw: 15, kind: "date" },
  { key: "expiryDate",      label: "Expiry Date",          w: 130, xw: 15, kind: "date" },
  { key: "invoiceNo",       label: "Invoice No.",          w: 120, xw: 14 },
  // In a cross-day search this is what tells the reader which report the line
  // came from, so it falls back to the report's own date.
  { key: "date",            label: "Received date",        w: 130, xw: 14, kind: "date", orReportDate: true },
  { key: "time",            label: "Time",                 w: 90,  xw: 10, kind: "time" },
  { key: "receivedBy",      label: "Received by",          w: 130, xw: 16 },
  { key: "remarks",         label: "Remarks (if any)",     w: 200, xw: 24, align: "left" },
];

const SNO_W = 48;

const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const isFilledRow = (r = {}) => Object.values(r).some(v => String(v ?? "").trim() !== "");

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

function emptyRow() {
  return {
    date: "", time: "", supplier: "", itemCode: "", foodItem: "",
    netWeight: "",
    vehicleTemp: "", foodTemp: "",
    vehicleClean: "", handlerHygiene: "", appearanceOK: "", firmnessOK: "", smellOK: "", packagingGood: "",
    countryOfOrigin: "", productionDate: "", expiryDate: "", invoiceNo: "", remarks: "", receivedBy: "",
  };
}

/* `width: 100%` with `table-layout: fixed` was the reason this sheet was
   unreadable: the colgroup asked for ~2400px of columns, the fixed layout
   scaled every one of them down to fit the container, and twenty columns each
   ended up about 50px wide with their headers shredded down the middle. The
   table now takes the width its columns need and the wrapper scrolls. */
const gridStyle = { width: "max-content", minWidth: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12.5 };
const theadRow = { background: "#0ea5e9" };
const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "9px 6px", textAlign: "center", whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.35, fontSize: 11.5, fontWeight: 800, background: "transparent", color: "#fff" };
const tdCell = { border: "1px solid #e2e8f0", padding: "8px 6px", textAlign: "center", verticalAlign: "middle", whiteSpace: "normal", overflowWrap: "anywhere" };

/* C / NC as a coloured badge: a non-conformity has to be visible at a glance
   when the sheet is skimmed, not a bare two-letter string in a grey grid. */
function Tick({ v }) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return <span style={{ color: "#cbd5e1" }}>—</span>;
  const ok = s === "C";
  const bad = s === "NC";
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontWeight: 800, fontSize: 12,
      background: ok ? "#d1fae5" : bad ? "#fee2e2" : "#e5e7eb",
      color: ok ? "#065f46" : bad ? "#991b1b" : "#374151",
      border: `1px solid ${ok ? "#6ee7b7" : bad ? "#fca5a5" : "#d1d5db"}`,
    }}>{s}</span>
  );
}
const inputStyle = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px" };
const advancedSelectStyle = { width: "100%", height: 39, border: "1px solid #cbd5e1", borderRadius: 10, padding: "0 10px", background: "#fff", color: "#0f172a", fontSize: 12, fontWeight: 700, outline: "none" };

/* 🎨 نمط تصميم صفحة ISO & HACCP (خلفية متدرّجة فاتحة + شريط علوي أبيض + أزرار حبوب) */
const ISO = {
  shell: {
    minHeight: "100vh",
    padding: "20px 16px",
    background:
      "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.18) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
      "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.14) 0, rgba(255,255,255,0) 55%)",
    fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    color: "#071b2d",
  },
  topBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(15,23,42,0.16)", boxShadow: "0 12px 32px rgba(2,132,199,0.10)",
    flexWrap: "wrap", marginBottom: 14,
  },
  title: { fontSize: 22, fontWeight: 950, lineHeight: 1.15 },
  subtitle: { fontSize: 12, fontWeight: 700, opacity: 0.78 },
  btn: (kind = "secondary", disabled = false) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg,#0ea5e9,#06b6d4)", color: "#fff", border: "#0284c7" },
      secondary: { bg: "#fff", color: "#0c4a6e", border: "#cbd5e1" },
      success:   { bg: "linear-gradient(180deg,#22c55e,#16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "#b91c1c" },
      violet:    { bg: "linear-gradient(180deg,#8b5cf6,#7c3aed)", color: "#fff", border: "#6d28d9" },
    };
    const c = map[kind] || map.secondary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 15px", borderRadius: 999, cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap", opacity: disabled ? 0.5 : 1,
    };
  },
};

export default function POS15ReceivingLogView() {
  const sheetRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate] = useState(""); // empty = nothing open until a date is picked
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);
  const [editRows, setEditRows] = useState(Array.from({ length: 15 }, () => emptyRow()));
  const [editing, setEditing] = useState(false);
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [allDates, setAllDates] = useState([]);
  const [historicalReports, setHistoricalReports] = useState([]);
  const [historicalLoaded, setHistoricalLoaded] = useState(false);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [itemFilter, setItemFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [resultSort, setResultSort] = useState("original");

  async function fetchAllDates() {
    try {
      // Lightweight index (dates only, no payloads); the record loads on demand.
      const rows = await listReportDates(TYPE);
      const uniq = Array.from(new Set(rows.map((r) => reportDateOf(r)).filter(Boolean)))
        .sort((a, b) => String(b).localeCompare(String(a)));
      setAllDates(uniq);
      // Cross-day search data is heavy; reset it so it reloads on next search.
      setHistoricalLoaded(false);
      // Nothing opens by default; the user picks a date from the tree.
    } catch (e) { console.warn("Failed to fetch dates", e); }
  }

  // The advanced search scans every archived report, so it needs the full
  // payloads — but only once the user actually opens the search panel.
  async function loadHistorical() {
    if (historicalLoaded || historicalLoading) return;
    setHistoricalLoading(true);
    try {
      const rows = await listReports(TYPE);
      const uniqueReports = Array.from(
        rows.reduce((map, r) => {
          const p = payloadOf(r);
          if (p?.reportDate && !map.has(p.reportDate)) map.set(p.reportDate, p);
          return map;
        }, new Map()).values()
      );
      setHistoricalReports(uniqueReports);
      setHistoricalLoaded(true);
    } catch (e) { console.warn("Failed to load history", e); }
    finally { setHistoricalLoading(false); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null);
    setSearchQuery("");
    setSupplierFilter("all"); setItemFilter("all"); setCountryFilter("all");
    setComplianceFilter("all"); setResultSort("original");
    try {
      const match = await getReportRowByDate(TYPE, d);
      setRecord(match);
      const rows = Array.from({ length: 15 }, (_, i) => match?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);
      setEditVerifiedBy(match?.payload?.verifiedBy || "");
      setEditing(false);
    } catch (e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);
  // Pull the heavy cross-day payloads only when the search panel is opened.
  useEffect(() => {
    if (showAdvancedSearch && !historicalLoaded) loadHistorical();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdvancedSearch, historicalLoaded]);

  const treeItems = useMemo(() =>
    allDates.map(d => {
      const n = normYMD(d);
      return n ? { key: d, dateISO: n.iso, label: formatDMY(n.iso), data: d } : null;
    }).filter(Boolean),
  [allDates]);

  const filledEntries = useMemo(
    () => (record?.payload?.entries || []).filter(isFilledRow),
    [record]
  );

  const historicalEntries = useMemo(() =>
    historicalReports.flatMap((report) =>
      (Array.isArray(report?.entries) ? report.entries : [])
        .filter(isFilledRow)
        .map((entry, entryIndex) => ({
          ...entry,
          __reportDate: report.reportDate,
          __reportVerifiedBy: report.verifiedBy || "",
          __historyKey: `${report.reportDate}_${entryIndex}`,
        }))
    ),
  [historicalReports]);

  const isHistoricalSearch = Boolean(
    searchQuery.trim() || supplierFilter !== "all" || itemFilter !== "all"
    || countryFilter !== "all" || complianceFilter !== "all"
  );

  const searchSourceEntries = isHistoricalSearch ? historicalEntries : filledEntries;

  const searchOptions = useMemo(() => {
    const unique = (key) => Array.from(new Set(
      historicalEntries.map((row) => String(row?.[key] || "").trim()).filter(Boolean)
    )).sort((a, b) => a.localeCompare(b));
    return {
      suppliers: unique("supplier"),
      items: unique("foodItem"),
      countries: unique("countryOfOrigin"),
    };
  }, [historicalEntries]);

  const filteredEntries = useMemo(() => {
    const terms = String(searchQuery || "").trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const tickKeys = TICK_COLS.map((column) => column.key);
    const matches = searchSourceEntries.filter((row) => {
      const searchable = Object.values(row || {}).map((value) => String(value ?? "").toLocaleLowerCase()).join(" ");
      const hasNC = tickKeys.some((key) => String(row?.[key] || "").toUpperCase() === "NC");
      const hasC = tickKeys.some((key) => String(row?.[key] || "").toUpperCase() === "C");
      return terms.every((term) => searchable.includes(term))
        && (supplierFilter === "all" || row?.supplier === supplierFilter)
        && (itemFilter === "all" || row?.foodItem === itemFilter)
        && (countryFilter === "all" || row?.countryOfOrigin === countryFilter)
        && (complianceFilter === "all" || (complianceFilter === "nc" ? hasNC : hasC && !hasNC));
    });

    return [...matches].sort((a, b) => {
      if (resultSort === "time-asc") return String(a?.time || "").localeCompare(String(b?.time || ""));
      if (resultSort === "time-desc") return String(b?.time || "").localeCompare(String(a?.time || ""));
      if (resultSort === "supplier") return String(a?.supplier || "").localeCompare(String(b?.supplier || ""));
      if (resultSort === "item") return String(a?.foodItem || "").localeCompare(String(b?.foodItem || ""));
      if (resultSort === "date-asc") return String(a?.__reportDate || a?.date || "").localeCompare(String(b?.__reportDate || b?.date || ""));
      if (resultSort === "date-desc") return String(b?.__reportDate || b?.date || "").localeCompare(String(a?.__reportDate || a?.date || ""));
      if (isHistoricalSearch) return String(b?.__reportDate || "").localeCompare(String(a?.__reportDate || ""));
      return 0;
    });
  }, [searchSourceEntries, searchQuery, supplierFilter, itemFilter, countryFilter, complianceFilter, resultSort, isHistoricalSearch]);

  const activeSearchFilters = [
    searchQuery.trim(), supplierFilter !== "all", itemFilter !== "all",
    countryFilter !== "all", complianceFilter !== "all", resultSort !== "original",
  ].filter(Boolean).length;

  function resetAdvancedSearch() {
    setSearchQuery(""); setSupplierFilter("all"); setItemFilter("all");
    setCountryFilter("all"); setComplianceFilter("all"); setResultSort("original");
  }

  const editCell = (idx, key, value) =>
    setEditRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });

  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      const rows = Array.from({ length: 15 }, (_, i) => record?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows); setEditVerifiedBy(record?.payload?.verifiedBy || ""); setEditing(false); return;
    }

    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    const rid = getId(record);
    const cleaned = editRows.filter(isFilledRow);
    const payload = { ...(record?.payload || {}), branch: BRANCH, reportDate: record?.payload?.reportDate, entries: cleaned, verifiedBy: editVerifiedBy, savedAt: Date.now() };
    try {
      setLoading(true);
      // Editing UPDATES the record. It used to DELETE the row and POST a new
      // one, which threw away the server-allocated reference number and the
      // record's history — and if the POST then failed, the report was simply
      // gone. PUT /api/reports/:id keeps the id and the reference.
      const res = rid
        ? await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: TYPE, payload }),
          })
        : await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reporter: "pos15", type: TYPE, payload }),
          });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Changes saved"); setEditing(false);
      await fetchRecord(payload.reportDate); await fetchAllDates();
    } catch (e) { console.error(e); alert("❌ Saving failed.\n" + String(e?.message || e)); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted"); await fetchAllDates();
      const next = allDates.find((d) => d !== record?.payload?.reportDate) || todayDubai;
      setDate(next);
    } catch (e) { console.error(e); alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `POS15_ReceivingLog_${record?.payload?.reportDate || date}.json`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function loadExcelJS() {
    try { const m = await import("exceljs/dist/exceljs.min.js"); const E = m?.default ?? m; if (E?.Workbook) return E; } catch (_) {}
    try { const m2 = await import("exceljs/dist/exceljs.min"); const E2 = m2?.default ?? m2; if (E2?.Workbook) return E2; } catch (_) {}
    const m3 = await import("exceljs"); const E3 = m3?.default ?? m3; if (E3?.Workbook) return E3;
    throw new Error("Failed to load ExcelJS");
  }
  async function resolveSaveAs() { const mod = await import("file-saver"); return mod?.saveAs || mod?.default?.saveAs || mod?.default || mod; }

  /* Both exports print the sheet the viewer is looking at: same columns, same
     order, same date format. They are generated from COLUMNS so a change to
     the table cannot leave the backup describing a different sheet. */
  const exportHeaders = ["S.No", ...COLUMNS.map((c) => c.label)];
  const exportRow = (e, i) => [
    i + 1,
    ...COLUMNS.map((c) => {
      const raw = c.orReportDate ? (e?.[c.key] || e?.__reportDate) : e?.[c.key];
      return c.kind === "date" ? formatDMY(safe(raw)) : safe(raw);
    }),
  ];

  function fallbackCSV(p) {
    const rows = (p.entries || []).filter(isFilledRow).map(exportRow);
    const csv = [exportHeaders, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `POS15_ReceivingLog_${p.reportDate || date}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = await loadExcelJS(); const saveAs = await resolveSaveAs();
      const p = record?.payload || {}; const rawRows = Array.isArray(p.entries) ? p.entries : [];
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("ReceivingLog");
      const lightBlue = "D9E2F3"; const tableHeaderBlue = "DCE6F1"; const borderThin = { style: "thin", color: { argb: "1F3B70" } };
      const NC = exportHeaders.length;             // S.No + every column
      const metaCol = Math.max(1, NC - 10);        // meta block sits on the right
      ws.mergeCells(1, 1, 1, NC);
      const r1 = ws.getCell(1,1); r1.value = "POS 15 | Receiving Log (Butchery)";
      r1.alignment = { horizontal: "center", vertical: "middle" }; r1.font = { size: 14, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } }; ws.getRow(1).height = 26;
      const meta = [["Classification:", p.classification || "Official"],["Branch:", p.branch || "POS 15"],["Date:", formatDMY(p.reportDate || "")],["Form Ref:", p.formRef || "FSMS/BR/F01A"]];
      for (let i = 0; i < meta.length; i++) {
        const rowIdx = 2 + i; ws.mergeCells(rowIdx, metaCol, rowIdx, NC);
        const c = ws.getCell(rowIdx, metaCol); c.value = `${meta[i][0]} ${meta[i][1]}`;
        c.alignment = { horizontal: "right", vertical: "middle" }; ws.getRow(rowIdx).height = 18;
      }
      ws.columns = [{ width: 6 }, ...COLUMNS.map((c) => ({ width: c.xw }))];
      const headRowIdx = 2 + meta.length + 1;
      const hr = ws.getRow(headRowIdx); hr.values = exportHeaders;
      hr.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tableHeaderBlue } }; cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin }; }); hr.height = 30;
      const rows = rawRows.filter(isFilledRow); let rowIdx = headRowIdx + 1;
      rows.forEach((e, i) => {
        ws.getRow(rowIdx).values = exportRow(e, i);
        ws.getRow(rowIdx).eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin }; }); ws.getRow(rowIdx).height = 20; rowIdx++;
      });
      const legendRow = rowIdx + 1; ws.mergeCells(legendRow, 1, legendRow, Math.min(10, NC));
      const legCell = ws.getCell(legendRow, 1); legCell.value = "Legend: (C) – Conform   (NC) – Non-Conform"; legCell.font = { bold: true }; legCell.alignment = { horizontal: "left", vertical: "middle" }; ws.getRow(legendRow).height = 18;
      const signRow = legendRow + 2; ws.mergeCells(signRow, 1, signRow, Math.min(10, NC));
      const signCell = ws.getCell(signRow, 1); signCell.value = `Verified by: ${p.verifiedBy || ""}`; signCell.font = { bold: true }; signCell.alignment = { horizontal: "left", vertical: "middle" };
      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `POS15_ReceivingLog_${p.reportDate || date}.xlsx`);
    } catch (err) {
      console.error("[XLSX export error]", err);
      try { fallbackCSV(record?.payload || {}); alert("⚠️ تعذر تصدير XLSX، تم تصدير CSV بدلاً منه.\n" + (err?.message || err)); }
      catch (e2) { alert("⚠️ فشل تصدير XLSX وCSV.\n" + (err?.message || err)); }
    }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text(); const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      if (!payload?.reportDate) throw new Error("Invalid payload: missing reportDate");
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: "pos15", type: TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Imported and saved"); setDate(payload.reportDate); await fetchAllDates(); await fetchRecord(payload.reportDate);
    } catch (e) { console.error(e); alert("❌ Invalid JSON or save failed"); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; setLoading(false); }
  }

  function exportPDF() {
    if (!sheetRef.current || !record) return;
    const titleDate = record?.payload?.reportDate || date;
    const PRINT_CSS = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin:0; font-family: Inter, Arial, sans-serif; color:#0f172a; font-size:11px; }
      table { border-collapse: collapse; width:100%; }
      th, td { border:1.5px solid #94a3b8; padding:5px; font-size:10px; }
      thead th { background:#e2e8f0; font-weight:900; }
      tbody tr:nth-child(2n) td { background:#f8fafc; }
    `;
    const html = `<html><head><meta charset="utf-8"/><title>POS 15 Receiving Log - ${titleDate}</title><style>${PRINT_CSS}</style></head><body>${sheetRef.current.outerHTML}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 100);
  }

  const metaBadge = { display: "inline-block", background: "#fff", border: "1px solid rgba(15,23,42,0.14)", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#0c4a6e", marginRight: 8, marginBottom: 6, boxShadow: "0 4px 12px rgba(2,132,199,0.06)" };

  return (
    <main style={ISO.shell}>
      <div style={ISO.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={mawashiLogo} alt="logo" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
          <div>
            <div style={ISO.title}>📥 Receiving Log (Butchery) — POS 15</div>
            <div style={ISO.subtitle}>View, search and export saved receiving records</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {canEdit("daily") && <button onClick={toggleEdit} style={ISO.btn(editing ? "secondary" : "violet")}>{editing ? "Cancel Edit" : "Edit"}</button>}
          {canEdit("daily") && editing && <button onClick={saveEdit} style={ISO.btn("success")}>Save Changes</button>}
          {canDelete("daily") && <button onClick={handleDelete} style={ISO.btn("danger", !record)} disabled={!record} data-delete-action="true">Delete</button>}
          <button onClick={exportXLSX} disabled={!record} style={ISO.btn("primary", !record)}>Export XLSX</button>
          <button onClick={exportPDF} disabled={!record} style={ISO.btn("secondary", !record)}>Export PDF</button>
          <button onClick={exportJSON} disabled={!record} style={ISO.btn("secondary", !record)}>Export JSON</button>
          {canWrite("daily") && (
            <label style={{ ...ISO.btn("success"), display: "inline-block" }}>
              Import JSON
              <input ref={fileInputRef} type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0])} style={{ display: "none" }} />
            </label>
          )}
        </div>
      </div>

      <SidebarLayout
        sidebarWidth={280}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={date}
            onPick={(it) => setDate(it.data)}
            loading={loading && !allDates.length}
          />
        }
      >
        {loading && <p>Loading…</p>}
        {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
        {!loading && !err && !record && <EmptyState text="No report for this date." />}

        {record && (
          <div style={{ overflowX: "auto" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
                marginBottom: 12, padding: 12, border: "1px solid rgba(15,23,42,0.14)",
                borderRadius: 14, background: "rgba(255,255,255,0.92)",
                boxShadow: "0 8px 22px rgba(2,132,199,0.08)",
              }}
            >
              <label style={{ position: "relative", flex: "1 1 320px" }}>
                <span aria-hidden="true" style={{ position: "absolute", left: 13, top: 9, fontSize: 18, color: "#64748b" }}>⌕</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={editing}
                  placeholder="Search every old report: supplier, item, invoice, country... / بحث شامل"
                  aria-label="Search receiving log entries"
                  style={{
                    width: "100%", height: 40, border: "1.5px solid #7dd3fc", borderRadius: 11,
                    padding: "0 42px", outline: "none", background: editing ? "#f1f5f9" : "#fff",
                    color: "#0f172a", fontSize: 13, fontWeight: 650,
                  }}
                />
                {searchQuery && !editing && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    title="Clear search"
                    style={{ position: "absolute", right: 8, top: 5, width: 30, height: 30, border: 0, borderRadius: 8, background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 20 }}
                  >×</button>
                )}
              </label>
              <span style={{ padding: "7px 11px", borderRadius: 999, background: "#fff", border: "1px solid #bae6fd", color: "#0369a1", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }} aria-live="polite">
                {editing ? `${editRows.filter(isFilledRow).length} rows` : `${filteredEntries.length} of ${isHistoricalSearch ? historicalEntries.length : filledEntries.length} rows`}
              </span>
              {!editing && (
                <span style={{ padding: "7px 11px", borderRadius: 999, background: isHistoricalSearch ? "#dcfce7" : "#f8fafc", border: `1px solid ${isHistoricalSearch ? "#86efac" : "#cbd5e1"}`, color: isHistoricalSearch ? "#166534" : "#475569", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap" }}>
                  {isHistoricalSearch
                    ? `All history · ${new Set(filteredEntries.map((row) => row.__reportDate).filter(Boolean)).size} report(s)`
                    : `Current report · ${allDates.length} archived report(s) available`}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowAdvancedSearch((value) => !value)}
                disabled={editing}
                aria-expanded={showAdvancedSearch}
                style={{ height: 38, padding: "0 13px", border: "1px solid #7dd3fc", borderRadius: 10, background: showAdvancedSearch ? "#0ea5e9" : "#fff", color: showAdvancedSearch ? "#fff" : "#0369a1", fontSize: 12, fontWeight: 850, cursor: editing ? "not-allowed" : "pointer" }}
              >
                ⚙ Advanced {activeSearchFilters ? `(${activeSearchFilters})` : ""}
              </button>
              {editing && <span style={{ color: "#64748b", fontSize: 11, fontWeight: 700 }}>Search is paused while editing.</span>}
            </div>

            {showAdvancedSearch && !editing && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 9, margin: "-4px 0 12px", padding: 12, border: "1px solid #bae6fd", borderRadius: 13, background: "rgba(255,255,255,.92)" }}>
                <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} aria-label="Filter by supplier" style={advancedSelectStyle}>
                  <option value="all">All suppliers</option>
                  {searchOptions.suppliers.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={itemFilter} onChange={(e) => setItemFilter(e.target.value)} aria-label="Filter by food item" style={advancedSelectStyle}>
                  <option value="all">All food items</option>
                  {searchOptions.items.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} aria-label="Filter by country" style={advancedSelectStyle}>
                  <option value="all">All countries</option>
                  {searchOptions.countries.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={complianceFilter} onChange={(e) => setComplianceFilter(e.target.value)} aria-label="Filter by conformity" style={advancedSelectStyle}>
                  <option value="all">All conformity statuses</option>
                  <option value="c">Conform only (C)</option>
                  <option value="nc">Has non-conformity (NC)</option>
                </select>
                <select value={resultSort} onChange={(e) => setResultSort(e.target.value)} aria-label="Sort search results" style={advancedSelectStyle}>
                  <option value="original">Original order</option>
                  <option value="time-asc">Time: earliest first</option>
                  <option value="time-desc">Time: latest first</option>
                  <option value="date-desc">Report date: newest first</option>
                  <option value="date-asc">Report date: oldest first</option>
                  <option value="supplier">Supplier A-Z</option>
                  <option value="item">Food item A-Z</option>
                </select>
                <button type="button" onClick={resetAdvancedSearch} disabled={!activeSearchFilters} style={{ ...advancedSelectStyle, cursor: activeSearchFilters ? "pointer" : "not-allowed", color: "#0369a1", fontWeight: 850, opacity: activeSearchFilters ? 1 : .55 }}>
                  Reset all filters
                </button>
              </div>
            )}

            {!editing && activeSearchFilters > 0 && filteredEntries.length === 0 && (
              <div style={{ marginBottom: 12, padding: 14, borderRadius: 12, textAlign: "center", border: "1px dashed #7dd3fc", background: "rgba(255,255,255,.85)", color: "#64748b", fontWeight: 750 }}>
                No matching entries. <button type="button" onClick={resetAdvancedSearch} style={{ border: 0, background: "transparent", color: "#0ea5e9", fontWeight: 850, cursor: "pointer" }}>Clear all filters</button>
              </div>
            )}

            <div ref={sheetRef}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span style={metaBadge}><strong>{isHistoricalSearch ? "Scope:" : "Date:"}</strong> {isHistoricalSearch ? `All archived reports (${allDates.length})` : safe(record.payload?.reportDate)}</span>
                <span style={metaBadge}><strong>Branch:</strong> {safe(record.payload?.branch)}</span>
                <span style={metaBadge}><strong>Form Ref:</strong> {safe(record.payload?.formRef || "FSMS/BR/F01A")}</span>
                <span style={metaBadge}><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</span>
              </div>

              <div style={{ textAlign: "center", background: "#e0f2fe", border: "1px solid rgba(15,23,42,0.14)", borderRadius: 10, padding: "9px 6px", fontWeight: 800, fontSize: 16, color: "#0c4a6e", marginBottom: 10 }}>
                📥 {isHistoricalSearch ? "HISTORICAL SEARCH RESULTS" : "RECEIVING LOG (BUTCHERY)"} — POS 15
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={gridStyle}>
                  <colgroup>
                    <col style={{ width: SNO_W }} />
                    {COLUMNS.map((c) => <col key={c.key} style={{ width: c.w }} />)}
                  </colgroup>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thCell}>#</th>
                      {COLUMNS.map((c) => (
                        <th key={c.key} style={thCell} title={c.hint || c.label}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      filteredEntries.length ? filteredEntries.map((r, idx) => (
                        <tr key={r.__historyKey || idx} style={{ background: idx % 2 ? "#f0f9ff" : "#fff" }}>
                          <td style={{ ...tdCell, color: "#94a3b8", fontWeight: 700 }}>{idx + 1}</td>
                          {COLUMNS.map((c) => {
                            const raw = c.orReportDate ? (r[c.key] || r.__reportDate) : r[c.key];
                            if (c.kind === "tick") {
                              return <td key={c.key} style={tdCell}><Tick v={raw} /></td>;
                            }
                            const cell = { ...tdCell, ...(c.align === "left" ? { textAlign: "left" } : null) };
                            if (c.kind === "code") {
                              return <td key={c.key} style={{ ...cell, fontWeight: 800, color: "#4f46e5" }}>{safe(raw)}</td>;
                            }
                            return (
                              <td key={c.key} style={cell}>
                                {c.kind === "date" ? formatDMY(safe(raw)) : safe(raw)}
                              </td>
                            );
                          })}
                        </tr>
                      )) : (
                        <tr>
                          <td style={{ ...tdCell, textAlign: "left", color: "#64748b", fontWeight: 700 }} colSpan={COLUMNS.length + 1}>
                            No lines to show for this report.
                          </td>
                        </tr>
                      )
                    ) : (
                      editRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={{ ...tdCell, color: "#94a3b8", fontWeight: 700 }}>{idx + 1}</td>
                          {COLUMNS.map((c) => (
                            <td key={c.key} style={tdCell}>
                              {c.kind === "tick" ? (
                                <select
                                  value={r[c.key] || ""}
                                  onChange={(e) => editCell(idx, c.key, e.target.value)}
                                  title={c.hint || c.label}
                                  style={inputStyle}
                                >
                                  <option value=""></option><option value="C">C</option><option value="NC">NC</option>
                                </select>
                              ) : (
                                <input
                                  type={c.kind === "date" ? "date" : c.kind === "time" ? "time" : c.kind === "number" ? "number" : "text"}
                                  step={c.step}
                                  value={r[c.key] || ""}
                                  onChange={(e) => editCell(idx, c.key, e.target.value)}
                                  style={inputStyle}
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700 }}>
                LEGEND: (C) – Conform &nbsp;&nbsp; / &nbsp;&nbsp; (NC) – Non-Conform
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "#0b1f4d" }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Organoleptic Checks*</div>
                <div>Appearance: Normal colour (Free from discoloration)</div>
                <div>Firmness: Firm rather than soft.</div>
                <div>Smell: Normal smell (No rancid or strange smell)</div>
                <div style={{ marginTop: 8 }}>
                  <strong>Note:</strong> For Chilled Food: Target ≤ 5°C (Critical Limit: 5°C; short deviations up to 15 minutes during transfer).&nbsp;
                  For Frozen Food: Target ≤ -18°C (Critical limits: RTE Frozen ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp;
                  For Hot Food: Target ≥ 60°C (Critical Limit: 60°C).&nbsp;
                  Dry food, Low Risk: Receive at cool, dry condition or ≤ 25°C, or as per product requirement.
                </div>
              </div>

              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <strong>Verified by:</strong>
                {!editing ? (
                  <SignatureName name={safe(record.payload?.verifiedBy)} underline={false} />
                ) : (
                  <input value={editVerifiedBy} onChange={(e) => setEditVerifiedBy(e.target.value)} style={{ border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", fontSize: 12, color: "#0b1f4d" }} />
                )}
              </div>
            </div>
          </div>
        )}
      </SidebarLayout>
    </main>
  );
}
