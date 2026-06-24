// src/pages/monitor/branches/pos 10/POS10ReceivingLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import {
  safe,
  getId,
  btn,
  formatDMY,
  isFilledRow,
  norm,
  GlassShell,
  SearchBar,
  GlobalResults,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "./pos10ViewKit";

// Matches the POS10 input file (no external references)
const TYPE = "pos10_receiving_log_butchery";
const BRANCH = "POS 10";

// C/NC columns
const TICK_COLS = [
  { key: "vehicleClean", label: "Vehicle clean" },
  { key: "handlerHygiene", label: "Food handler hygiene" },
  { key: "appearanceOK", label: "Appearance" },
  { key: "firmnessOK", label: "Firmness" },
  { key: "smellOK", label: "Bad Smell" },
  { key: "packagingGood", label: "Packaging good/undamaged/clean/no pests" },
];

// شارة C / NC ملوّنة (C أخضر، NC أحمر)
function Tick({ v }) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return null;
  const ok = s === "C";
  const bad = s === "NC";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 12px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 13.5,
        background: ok ? "#d1fae5" : bad ? "#fee2e2" : "#e5e7eb",
        color: ok ? "#065f46" : bad ? "#991b1b" : "#374151",
        border: `1px solid ${ok ? "#6ee7b7" : bad ? "#fca5a5" : "#d1d5db"}`,
      }}
    >
      {s}
    </span>
  );
}

function rowHaystack(r = {}) {
  return norm(
    [
      r.supplier,
      r.foodItem,
      r.countryOfOrigin,
      r.productionDate,
      r.expiryDate,
      r.vehicleTemp,
      r.foodTemp,
      r.quantity,
      r.remarks,
      r.vehicleClean,
      r.handlerHygiene,
      r.appearanceOK,
      r.firmnessOK,
      r.smellOK,
      r.packagingGood,
    ].join(" | ")
  );
}

function metaHaystack(p = {}) {
  return norm(
    [
      p.branch,
      p.reportDate,
      p.reportTime,
      p.invoiceNo,
      p.formRef,
      p.classification,
      p.receivedBy,
      p.verifiedBy,
    ].join(" | ")
  );
}

// Same row structure as the input component
function emptyRow() {
  return {
    supplier: "",
    foodItem: "",
    vehicleTemp: "",
    foodTemp: "",
    quantity: "",
    vehicleClean: "",
    handlerHygiene: "",
    appearanceOK: "",
    firmnessOK: "",
    smellOK: "",
    packagingGood: "",
    countryOfOrigin: "",
    productionDate: "",
    expiryDate: "",
    remarks: "",
  };
}

export default function POS10ReceivingLogView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    }
  }, []);

  // State
  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);

  // ✅ Global search (across ALL days + within selected day table)
  const [search, setSearch] = useState("");

  // Cache: all payloads for this TYPE+BRANCH (used for global search)
  const [allPayloads, setAllPayloads] = useState([]);

  // Optional edit mode (password 9999)
  const [editRows, setEditRows] = useState(
    Array.from({ length: 15 }, () => emptyRow())
  );
  const [editing, setEditing] = useState(false);
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [editReceivedBy, setEditReceivedBy] = useState("");
  const [allDates, setAllDates] = useState([]);

  // Styles — جدول يملأ الصفحة بتصميم طيفي عصري
  const gridStyle = useMemo(
    () => ({
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 15,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 2px 14px rgba(99,102,241,0.10)",
    }),
    []
  );
  const theadRow = {
    background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)",
  };
  const thCell = {
    border: "1px solid rgba(255,255,255,0.30)",
    padding: "10px 8px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 800,
    background: "transparent",
    color: "#fff",
  };
  const tdCell = {
    border: "1px solid #c7d2fe",
    padding: "9px 7px",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "5px 7px",
    fontSize: 14,
  };
  // صف متعرّج بألوان طيفية خفيفة
  const zebra = (i) => ({
    background: i % 2 ? "rgba(237,233,254,0.45)" : "#fff",
  });

  /* ====== Fetch ====== */
  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      // payloads for POS 10 only
      const payloads = list
        .map((r) => r?.payload)
        .filter((p) => p && p.branch === BRANCH && p.reportDate);

      // cache for global search
      payloads.sort((a, b) =>
        String(b.reportDate || "").localeCompare(String(a.reportDate || ""))
      );
      setAllPayloads(payloads);

      const uniq = Array.from(new Set(payloads.map((p) => p.reportDate))).sort(
        (a, b) => String(b).localeCompare(String(a))
      );
      setAllDates(uniq);

      // Tree stays collapsed by default.
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) {
      console.warn("Failed to fetch dates", e);
    }
  }

  async function fetchRecord(d = date) {
    setLoading(true);
    setErr("");
    setRecord(null);

    try {
      // fast path from cached payloads
      const cached = allPayloads.find((p) => p?.reportDate === d);
      if (cached) {
        // emulate record shape (payload only is used heavily)
        const pseudo = { payload: cached };
        setRecord(pseudo);

        const rows = Array.from({ length: 15 }, (_, i) => cached?.entries?.[i] || emptyRow());
        setEditRows(rows);
        setEditVerifiedBy(cached?.verifiedBy || "");
        setEditReceivedBy(cached?.receivedBy || "");
        setEditing(false);
        return;
      }

      // fallback: fetch all and find match (kept for safety)
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match =
        list.find(
          (r) =>
            r?.payload?.branch === BRANCH &&
            r?.payload?.reportDate === d
        ) || null;

      setRecord(match);

      const rows = Array.from({ length: 15 }, (_, i) => match?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);
      setEditVerifiedBy(match?.payload?.verifiedBy || "");
      setEditReceivedBy(match?.payload?.receivedBy || "");
      setEditing(false);
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (date) {
      // Tree stays collapsed by default (no auto-open on date change).
      fetchRecord(date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  /* ====== Edit / Save / Delete (password protected) ====== */
  const askPass = (label = "") =>
    (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      const rows = Array.from(
        { length: 15 },
        (_, i) => record?.payload?.entries?.[i] || emptyRow()
      );
      setEditRows(rows);
      setEditVerifiedBy(record?.payload?.verifiedBy || "");
      setEditReceivedBy(record?.payload?.receivedBy || "");
      setEditing(false);
      return;
    }

    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;

    const rid = getId(record);
    const cleaned = editRows.filter(isFilledRow);

    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: cleaned,
      verifiedBy: editVerifiedBy,
      receivedBy: editReceivedBy,
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      if (rid) {
        try {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
            method: "DELETE",
          });
        } catch (e) {
          console.warn("DELETE (ignored error):", e);
        }
      }

      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos10", type: TYPE, payload }),
      });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      alert("✅ Changes saved");
      setEditing(false);

      // refresh cache + current record
      await fetchAllDates();
      setDate(payload.reportDate);
      await fetchRecord(payload.reportDate);
    } catch (e) {
      console.error(e);
      alert("❌ Saving failed.\n" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("✅ Deleted");
      await fetchAllDates();

      const current = record?.payload?.reportDate;
      const next = allDates.find((d) => d !== current) || todayDubai;
      setDate(next);
    } catch (e) {
      console.error(e);
      alert("❌ Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ====== Export / Import ====== */
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS10_ReceivingLog_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadExcelJS() {
    try {
      const m = await import(
        /* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min.js"
      );
      const ExcelJS = m?.default ?? m;
      if (ExcelJS?.Workbook) return ExcelJS;
    } catch (_) {}
    try {
      const m2 = await import(
        /* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min"
      );
      const ExcelJS2 = m2?.default ?? m2;
      if (ExcelJS2?.Workbook) return ExcelJS2;
    } catch (_) {}
    const m3 = await import(/* webpackChunkName: "exceljs" */ "exceljs");
    const ExcelJS3 = m3?.default ?? m3;
    if (ExcelJS3?.Workbook) return ExcelJS3;
    throw new Error("Failed to load ExcelJS");
  }

  async function resolveSaveAs() {
    const mod = await import("file-saver");
    return mod?.saveAs || mod?.default?.saveAs || mod?.default || mod;
  }

  function fallbackCSV(p) {
    const headers = [
      "Name of the Supplier",
      "Food Item",
      "Vehicle Temp (°C)",
      "Food Temp (°C)",
      "Quantity KG\\PCS",
      "Vehicle clean",
      "Food handler hygiene",
      "Appearance",
      "Firmness",
      "Bad Smell",
      "Packaging good/undamaged/clean/no pests",
      "Country of origin",
      "Production Date",
      "Expiry Date",
      "Remarks (if any)",
    ];
    const rows = (p.entries || [])
      .filter(isFilledRow)
      .map((e) => [
        e?.supplier ?? "",
        e?.foodItem ?? "",
        e?.vehicleTemp ?? "",
        e?.foodTemp ?? "",
        e?.quantity ?? "",
        e?.vehicleClean ?? "",
        e?.handlerHygiene ?? "",
        e?.appearanceOK ?? "",
        e?.firmnessOK ?? "",
        e?.smellOK ?? "",
        e?.packagingGood ?? "",
        e?.countryOfOrigin ?? "",
        e?.productionDate ?? "",
        e?.expiryDate ?? "",
        e?.remarks ?? "",
      ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS10_ReceivingLog_${p.reportDate || date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = await loadExcelJS();
      const saveAs = await resolveSaveAs();

      const p = record?.payload || {};
      const rawRows = Array.isArray(p.entries) ? p.entries.filter(isFilledRow) : [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("ReceivingLog");

      const lightBlue = "D9E2F3";
      const tableHeaderBlue = "DCE6F1";
      const borderThin = { style: "thin", color: { argb: "1F3B70" } };

      ws.mergeCells(1, 1, 1, 15);
      const r1 = ws.getCell(1, 1);
      r1.value = "POS 10 | Receiving Log (Butchery)";
      r1.alignment = { horizontal: "center", vertical: "middle" };
      r1.font = { size: 14, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      ws.getRow(1).height = 26;

      const meta = [
        ["Classification:", p.classification || "Official"],
        ["Branch:", p.branch || "POS 10"],
        ["Date:", p.reportDate || ""],
        ["Time:", p.reportTime || ""],
        ["Invoice No:", p.invoiceNo || ""],
      ];
      for (let i = 0; i < meta.length; i++) {
        const rowIdx = 2 + i;
        ws.mergeCells(rowIdx, 8, rowIdx, 15);
        const c = ws.getCell(rowIdx, 8);
        c.value = `${meta[i][0]} ${meta[i][1]}`;
        c.alignment = { horizontal: "right", vertical: "middle" };
        ws.getRow(rowIdx).height = 18;
      }

      ws.columns = [
        { width: 24 },
        { width: 20 },
        { width: 14 },
        { width: 14 },
        { width: 16 },
        { width: 16 },
        { width: 18 },
        { width: 14 },
        { width: 12 },
        { width: 12 },
        { width: 36 },
        { width: 16 },
        { width: 15 },
        { width: 15 },
        { width: 22 },
      ];

      const COL_HEADERS = [
        "Name of the Supplier",
        "Food Item",
        "Vehicle Temp (°C)",
        "Food Temp (°C)",
        "Quantity KG\\PCS",
        "Vehicle clean",
        "Food handler hygiene",
        "Appearance",
        "Firmness",
        "Bad Smell",
        "Packaging of food is good and undamaged, clean and no signs of pest infestation",
        "Country of origin",
        "Production Date",
        "Expiry Date",
        "Remarks (if any)",
      ];
      const hr = ws.getRow(7);
      hr.values = COL_HEADERS;
      hr.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tableHeaderBlue } };
        cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      });
      hr.height = 28;

      let rowIdx = 8;
      rawRows.forEach((e) => {
        ws.getRow(rowIdx).values = [
          e?.supplier || "",
          e?.foodItem || "",
          e?.vehicleTemp || "",
          e?.foodTemp || "",
          e?.quantity || "",
          e?.vehicleClean || "",
          e?.handlerHygiene || "",
          e?.appearanceOK || "",
          e?.firmnessOK || "",
          e?.smellOK || "",
          e?.packagingGood || "",
          e?.countryOfOrigin || "",
          e?.productionDate || "",
          e?.expiryDate || "",
          e?.remarks || "",
        ];
        ws.getRow(rowIdx).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        });
        ws.getRow(rowIdx).height = 20;
        rowIdx++;
      });

      const legendRow = rowIdx + 1;
      ws.mergeCells(legendRow, 1, legendRow, 6);
      const legCell = ws.getCell(legendRow, 1);
      legCell.value = "Legend: (C) – Conform   (NC) – Non-Conform";
      legCell.font = { bold: true };
      legCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(legendRow).height = 18;

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(
        new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        `POS10_ReceivingLog_${p.reportDate || date}.xlsx`
      );
    } catch (xerr) {
      console.error("[XLSX export error]", xerr);
      try {
        const p = record?.payload || {};
        fallbackCSV(p);
        alert("⚠️ XLSX export failed, CSV exported instead.\n" + (xerr?.message || xerr));
      } catch (e2) {
        alert("⚠️ XLSX and CSV export both failed.\n" + (xerr?.message || xerr));
      }
    }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      if (!payload?.reportDate) throw new Error("Invalid payload: missing reportDate");

      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos10", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("✅ Imported and saved");
      await fetchAllDates();
      setDate(payload.reportDate);
      await fetchRecord(payload.reportDate);
    } catch (e) {
      console.error(e);
      alert("❌ Invalid JSON or save failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setLoading(false);
    }
  }

  /* ====== PDF export (report only) ====== */
  async function exportPDF() {
    if (!reportRef.current) return;

    // تحميل ديناميكي — يخفّف حجم الصفحة عند الفتح
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const node = reportRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });

    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const headerH = 50;

    pdf.setFillColor(247, 249, 252);
    pdf.rect(0, 0, pageW, headerH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(
      `POS 10 | Receiving Log (Butchery) (${record?.payload?.reportDate || date})`,
      pageW / 2,
      28,
      { align: "center" }
    );

    const usableW = pageW - margin * 2;
    const availableH = pageH - (headerH + 10) - margin;

    const ratio = usableW / canvas.width;
    const totalHpx = canvas.height;
    let ypx = 0;

    while (ypx < totalHpx) {
      const sliceHpx = Math.min(totalHpx - ypx, availableH / ratio);

      const partCanvas = document.createElement("canvas");
      partCanvas.width = canvas.width;
      partCanvas.height = sliceHpx;
      const ctx = partCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, ypx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
      const partData = partCanvas.toDataURL("image/png");

      const partHpt = sliceHpx * ratio;
      pdf.addImage(partData, "PNG", margin, headerH + 10, usableW, partHpt);

      ypx += sliceHpx;
      if (ypx < totalHpx) {
        pdf.addPage("a4", "l");
        pdf.setFillColor(247, 249, 252);
        pdf.rect(0, 0, pageW, headerH, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(
          `POS 10 | Receiving Log (Butchery) (${record?.payload?.reportDate || date})`,
          pageW / 2,
          28,
          { align: "center" }
        );
      }
    }

    pdf.save(`POS10_ReceivingLog_${record?.payload?.reportDate || date}.pdf`);
  }

  /* ====== عناصر شجرة التاريخ (للمكوّن المشترك) ====== */
  const treeItems = useMemo(
    () => allDates.map((d) => ({ key: d, dateISO: d, label: formatDMY(d) })),
    [allDates]
  );

  /* ====== GLOBAL Search results across ALL days ====== */
  const globalResults = useMemo(() => {
    const q = norm(search);
    if (!q) return [];

    const res = [];
    for (let i = 0; i < allPayloads.length; i++) {
      const p = allPayloads[i];
      const d = p?.reportDate;
      if (!d) continue;

      const metaHit = metaHaystack(p).includes(q);
      const entries = Array.isArray(p.entries) ? p.entries.filter(isFilledRow) : [];

      if (metaHit) {
        res.push({
          kind: "meta",
          reportDate: d,
          label: `Header match (Invoice/Time/Verified/Received/etc.)`,
        });
      }

      for (let j = 0; j < entries.length; j++) {
        const r = entries[j];
        if (rowHaystack(r).includes(q)) {
          res.push({
            kind: "row",
            reportDate: d,
            row: r,
          });
        }
      }
    }

    // newest first by date
    res.sort((a, b) => String(b.reportDate).localeCompare(String(a.reportDate)));
    return res;
  }, [allPayloads, search]);

  /* ====== Current day table filtering uses same search (so user sees matches when opens date) ====== */
  const viewRows = useMemo(() => {
    const entries = (record?.payload?.entries || []).filter(isFilledRow);
    const q = norm(search);
    if (!q) return entries;

    const headerHit = metaHaystack(record?.payload || {}).includes(q);
    if (headerHit) return entries;

    return entries.filter((r) => rowHaystack(r).includes(q));
  }, [record, search]);

  const editMatch = useMemo(() => {
    const q = norm(search);
    if (!q) return () => false;

    const headerHit = metaHaystack(record?.payload || {}).includes(q);
    if (headerHit) return () => true;

    return (r) => rowHaystack(r).includes(q);
  }, [search, record]);

  const jumpTo = (d) => setDate(d); // الشجرة المشتركة تكشف موقع التاريخ تلقائياً

  return (
    <GlassShell
      icon="📥"
      title="Receiving Log (Butchery) — View (POS 10)"
      actions={
        <>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit"}
          </button>
          {editing && <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")} data-delete-action="true">Delete (password)</button>

          <button onClick={exportXLSX} disabled={!record} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>

          <label style={{ ...btn("#059669"), display: "inline-block" }}>
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e) => importJSON(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>
        </>
      }
    >
      {/* ✅ One search input that searches ALL DAYS + filters current table */}
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search anything across all days: supplier / item / invoice / temps / expiry / remarks / received / verified ..."
        count={globalResults.length}
      />

      {/* Layout: Date tree + content */}
      <SidebarLayout
        sidebarWidth={360}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={date}
            onPick={(it) => setDate(it.key)}
            loading={loading && !allDates.length}
            topSlot={
              <GlobalResults
                searchActive={!!norm(search)}
                activeDate={date}
                onJump={jumpTo}
                items={globalResults.map((g, idx) => ({
                  key: `${g.kind}-${g.reportDate}-${idx}`,
                  date: g.reportDate,
                  tag: g.kind === "meta" ? "Header" : "Row",
                  label:
                    g.kind === "meta"
                      ? g.label
                      : `${safe(g.row?.supplier)} — ${safe(g.row?.foodItem)} (Exp: ${formatDMY(safe(g.row?.expiryDate)) || "-"})`,
                }))}
              />
            }
          />
        }
      >
          {loading && <p>Loading…</p>}
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

          {!loading && !err && !record && <EmptyState />}

          {record && (
            <div style={{ overflowX: "auto", overflowY: "hidden" }}>
              <div ref={reportRef} style={{ width: "100%", minWidth: 0 }}>
                {/* Info band — شارات زجاجية تملأ العرض */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 8, marginBottom: 10, fontSize: 14.5 }}>
                  {[
                    ["Date", safe(record.payload?.reportDate)],
                    ["Time", safe(record.payload?.reportTime)],
                    ["Invoice No", safe(record.payload?.invoiceNo)],
                    ["Branch", safe(record.payload?.branch)],
                    ["Form Ref", safe(record.payload?.formRef || "FSMS/BR/F01A")],
                    ["Classification", safe(record.payload?.classification || "Official")],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      background: "linear-gradient(135deg, rgba(237,233,254,0.6), rgba(224,242,254,0.5))",
                      border: "1px solid rgba(139,92,246,0.25)",
                      borderRadius: 10,
                      padding: "7px 12px",
                    }}>
                      <strong style={{ color: "#5b21b6" }}>{k}:</strong> {v || "—"}
                    </div>
                  ))}
                </div>

                {/* Legend strip — شريط طيفي */}
                <div style={{
                  background: "linear-gradient(90deg,#ede9fe,#e0f2fe,#d1fae5)",
                  border: "1px solid #c7d2fe",
                  borderBottom: "none",
                  borderRadius: "12px 12px 0 0",
                  padding: "9px 8px",
                  textAlign: "center",
                  fontWeight: 800,
                  color: "#0b1f4d",
                }}>
                  LEGEND: <span style={{ color: "#065f46" }}>(C) – Conform</span> &nbsp;&nbsp; / &nbsp;&nbsp; <span style={{ color: "#991b1b" }}>(NC) – Non-Conform</span>
                </div>

                {/* Table */}
                <table style={gridStyle}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thCell}>Name of the Supplier</th>
                      <th style={thCell}>Food Item</th>
                      <th style={thCell}>Vehicle Temp (°C)</th>
                      <th style={thCell}>Food Temp (°C)</th>
                      <th style={thCell}>Quantity KG\PCS</th>
                      <th style={thCell}>Vehicle clean</th>
                      <th style={thCell}>Food handler hygiene</th>
                      <th style={thCell}>Appearance</th>
                      <th style={thCell}>Firmness</th>
                      <th style={thCell}>Bad Smell</th>
                      <th style={thCell}>
                        Packaging of food is good and undamaged, clean and no signs of pest infestation
                      </th>
                      <th style={thCell}>Country of origin</th>
                      <th style={thCell}>Production Date</th>
                      <th style={thCell}>Expiry Date</th>
                      <th style={thCell}>Remarks (if any)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!editing ? (
                      viewRows.length ? (
                        viewRows.map((r, idx) => (
                          <tr key={idx} style={zebra(idx)}>
                            <td style={{ ...tdCell, fontWeight: 700 }}>{safe(r.supplier)}</td>
                            <td style={tdCell}>{safe(r.foodItem)}</td>
                            <td style={tdCell}>{safe(r.vehicleTemp)}</td>
                            <td style={tdCell}>{safe(r.foodTemp)}</td>
                            <td style={tdCell}>{safe(r.quantity)}</td>
                            <td style={tdCell}><Tick v={r.vehicleClean} /></td>
                            <td style={tdCell}><Tick v={r.handlerHygiene} /></td>
                            <td style={tdCell}><Tick v={r.appearanceOK} /></td>
                            <td style={tdCell}><Tick v={r.firmnessOK} /></td>
                            <td style={tdCell}><Tick v={r.smellOK} /></td>
                            <td style={tdCell}><Tick v={r.packagingGood} /></td>
                            <td style={tdCell}>{safe(r.countryOfOrigin)}</td>
                            <td style={tdCell}>{formatDMY(safe(r.productionDate))}</td>
                            <td style={tdCell}>{formatDMY(safe(r.expiryDate))}</td>
                            <td style={tdCell}>{safe(r.remarks)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ ...tdCell, textAlign: "left" }} colSpan={15}>
                            No matching results in this day for: <strong>{search}</strong>
                          </td>
                        </tr>
                      )
                    ) : (
                      editRows.map((r, idx) => {
                        const hit = editMatch(r);
                        return (
                          <tr
                            key={idx}
                            style={hit ? { background: "rgba(245, 158, 11, 0.12)" } : undefined}
                            title={hit ? "Matches search" : ""}
                          >
                            <td style={tdCell}>
                              <input
                                type="text"
                                value={r.supplier || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], supplier: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="text"
                                value={r.foodItem || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], foodItem: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="number"
                                step="0.1"
                                value={r.vehicleTemp || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], vehicleTemp: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                                placeholder="°C"
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="number"
                                step="0.1"
                                value={r.foodTemp || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], foodTemp: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                                placeholder="°C"
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="text"
                                value={r.quantity || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], quantity: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                                placeholder="e.g., 10 KG / 5 PCS"
                              />
                            </td>

                            {TICK_COLS.map((c) => (
                              <td key={c.key} style={tdCell}>
                                <select
                                  value={r[c.key] || ""}
                                  onChange={(e) =>
                                    setEditRows((prev) => {
                                      const n = [...prev];
                                      n[idx] = { ...n[idx], [c.key]: e.target.value };
                                      return n;
                                    })
                                  }
                                  style={inputStyle}
                                  title="C = Conform, NC = Non-Conform"
                                >
                                  <option value=""></option>
                                  <option value="C">C</option>
                                  <option value="NC">NC</option>
                                </select>
                              </td>
                            ))}

                            <td style={tdCell}>
                              <input
                                type="text"
                                value={r.countryOfOrigin || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], countryOfOrigin: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="date"
                                value={r.productionDate || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], productionDate: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="date"
                                value={r.expiryDate || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], expiryDate: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                type="text"
                                value={r.remarks || ""}
                                onChange={(e) =>
                                  setEditRows((prev) => {
                                    const n = [...prev];
                                    n[idx] = { ...n[idx], remarks: e.target.value };
                                    return n;
                                  })
                                }
                                style={inputStyle}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Notes */}
                <div style={{ marginTop: 12, fontSize: 14, color: "#0b1f4d", lineHeight: 1.7,
                  background: "rgba(255,255,255,0.6)", border: "1px solid #e0e7ff", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Organoleptic Checks*</div>
                  <div>Appearance: Normal colour (Free from discoloration)</div>
                  <div>Firmness: Firm rather than soft.</div>
                  <div>Smell: Normal smell (No rancid or strange smell)</div>
                  <div style={{ marginTop: 8 }}>
                    <strong>Note:</strong> For Chilled Food: Target ≤ 5°C; Critical Limit: 5°C (short deviations ≤ 15 minutes during transfer).&nbsp;
                    For Frozen Food: Target ≤ -18°C (RTE ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp;
                    For Hot Food: Target ≥ 60°C; Critical Limit: 60°C.&nbsp;
                    Dry food, Low Risk: Receive cool/dry or ≤ 25°C, or as per product requirement.
                  </div>
                </div>

                {/* Footer */}
                <div
                  style={{
                    marginTop: 12,
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, flex: "1 1 320px", minWidth: 300 }}>
                    <strong>Received by:</strong>
                    {!editing ? (
                      <span style={{ display: "inline-block", minWidth: 260, borderBottom: "2px solid #1f3b70", lineHeight: "1.8", textAlign: "left" }}>
                        {safe(record.payload?.receivedBy)}
                      </span>
                    ) : (
                      <input
                        value={editReceivedBy}
                        onChange={(e) => setEditReceivedBy(e.target.value)}
                        style={{ border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", fontSize: 12, color: "#0b1f4d", minWidth: 260, textAlign: "left" }}
                      />
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, flex: "1 1 320px", minWidth: 300, justifyContent: "flex-end" }}>
                    <strong>Verified by:</strong>
                    {!editing ? (
                      <span style={{ display: "inline-block", minWidth: 260, borderBottom: "2px solid #1f3b70", lineHeight: "1.8", textAlign: "left" }}>
                        <SignatureName name={safe(record.payload?.verifiedBy)} underline={false} />
                      </span>
                    ) : (
                      <input
                        value={editVerifiedBy}
                        onChange={(e) => setEditVerifiedBy(e.target.value)}
                        style={{ border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", fontSize: 12, color: "#0b1f4d", minWidth: 260, textAlign: "left" }}
                      />
                    )}
                  </div>
                </div>

                {/* Quick hint */}
                {norm(search) && (
                  <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
                    Tip: search is global — use the left “Global Results” to jump to other dates quickly.
                  </div>
                )}
              </div>
            </div>
          )}
      </SidebarLayout>
    </GlassShell>
  );
}
