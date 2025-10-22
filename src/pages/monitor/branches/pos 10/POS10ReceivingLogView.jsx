// src/pages/monitor/branches/pos 10/POS10ReceivingLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

// Matches the POS10 input file (no external references)
const TYPE   = "pos10_receiving_log_butchery";
const BRANCH = "POS 10";

// C/NC columns
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean" },
  { key: "handlerHygiene", label: "Food handler hygiene" },
  { key: "appearanceOK",   label: "Appearance" },
  { key: "firmnessOK",     label: "Firmness" },
  { key: "smellOK",        label: "Smell" },
  { key: "packagingGood",  label: "Packaging good/undamaged/clean/no pests" },
];

const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({
  background: bg, color: "#fff", border: "none", borderRadius: 8,
  padding: "8px 12px", fontWeight: 700, cursor: "pointer"
});
const formatDMY = (iso) => {
  if (!iso) return iso;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
// A row is considered filled if any field has a value
const isFilledRow = (r = {}) => Object.values(r).some(v => String(v ?? "").trim() !== "");

// Same row structure as the input component
function emptyRow() {
  return {
    supplier: "", foodItem: "",
    vehicleTemp: "", foodTemp: "",
    vehicleClean: "", handlerHygiene: "", appearanceOK: "", firmnessOK: "", smellOK: "", packagingGood: "",
    countryOfOrigin: "", productionDate: "", expiryDate: "",
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
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }, []);

  // State
  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);

  // Optional edit mode (password 9999)
  const [editRows, setEditRows] = useState(Array.from({ length: 15 }, () => emptyRow()));
  const [editing, setEditing] = useState(false);
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [editReceivedBy, setEditReceivedBy] = useState("");
  const [allDates, setAllDates] = useState([]);

  // Accordion state
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key: YYYY-MM -> boolean

  // Styles
  const gridStyle = useMemo(() => ({
    width: "max-content",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);
  const thCell = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "4px 6px",
  };

  // Table columns (aligned with the input component)
  const colDefs = useMemo(() => ([
    <col key="supplier" style={{ width: 170 }} />,
    <col key="food" style={{ width: 160 }} />,
    <col key="vehT" style={{ width: 90 }} />,
    <col key="foodT" style={{ width: 90 }} />,
    <col key="vehClean" style={{ width: 120 }} />,
    <col key="handler" style={{ width: 140 }} />,
    <col key="appearanceOK" style={{ width: 120 }} />,
    <col key="firmnessOK" style={{ width: 110 }} />,
    <col key="smellOK" style={{ width: 110 }} />,
    <col key="pack" style={{ width: 220 }} />,
    <col key="origin" style={{ width: 120 }} />,
    <col key="prod" style={{ width: 120 }} />,
    <col key="exp" style={{ width: 120 }} />,
    <col key="remarks" style={{ width: 200 }} />,
  ]), []);

  /* ====== Fetch ====== */
  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const filtered = list
        .map((r) => r?.payload)
        .filter((p) => p && p.branch === BRANCH && p.reportDate);

      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);

      if (uniq.length) {
        const [y, m] = uniq[0].split("-");
        setExpandedYears((prev) => ({ ...prev, [y]: true }));
        setExpandedMonths((prev) => ({ ...prev, [`${y}-${m}`]: true }));
      }
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
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      setRecord(match);

      // Initialize edit state (up to 15 rows)
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

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  /* ====== Edit / Save / Delete (password protected) ====== */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      // Cancel: restore from record
      const rows = Array.from({ length: 15 }, (_, i) => record?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);
      setEditVerifiedBy(record?.payload?.verifiedBy || "");
      setEditReceivedBy(record?.payload?.receivedBy || "");
      setEditing(false);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
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
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
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
      await fetchRecord(payload.reportDate);
      await fetchAllDates();
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
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted");
      await fetchAllDates();
      const next = allDates.find((d) => d !== record?.payload?.reportDate) || todayDubai;
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
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS10_ReceivingLog_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Browser-friendly exceljs loader
  async function loadExcelJS() {
    try {
      const m = await import(/* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min.js");
      const ExcelJS = m?.default ?? m;
      if (ExcelJS?.Workbook) return ExcelJS;
    } catch (_) {}
    try {
      const m2 = await import(/* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min");
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

  // CSV fallback (matches the new columns)
  function fallbackCSV(p) {
    const headers = [
      "Name of the Supplier","Food Item","Vehicle Temp (°C)","Food Temp (°C)",
      "Vehicle clean","Food handler hygiene","Appearance","Firmness","Smell",
      "Packaging good/undamaged/clean/no pests",
      "Country of origin","Production Date","Expiry Date","Remarks (if any)"
    ];
    const rows = (p.entries || []).filter(isFilledRow).map(e => ([
      e?.supplier ?? "", e?.foodItem ?? "", e?.vehicleTemp ?? "", e?.foodTemp ?? "",
      e?.vehicleClean ?? "", e?.handlerHygiene ?? "", e?.appearanceOK ?? "", e?.firmnessOK ?? "", e?.smellOK ?? "",
      e?.packagingGood ?? "", e?.countryOfOrigin ?? "", e?.productionDate ?? "", e?.expiryDate ?? "",
      e?.remarks ?? ""
    ]));
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS10_ReceivingLog_${p.reportDate || date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // XLSX export (meta header + new table columns)
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

      // Title
      ws.mergeCells(1,1,1,14);
      const r1 = ws.getCell(1,1);
      r1.value = "POS 10 | Receiving Log (Butchery)";
      r1.alignment = { horizontal: "center", vertical: "middle" };
      r1.font = { size: 14, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      ws.getRow(1).height = 26;

      // Meta (right-aligned block)
      const meta = [
        ["Classification:", p.classification || "Official"],
        ["Branch:",        p.branch        || "POS 10"],
        ["Date:",          p.reportDate    || ""],
        ["Time:",          p.reportTime    || ""],
        ["Invoice No:",    p.invoiceNo     || ""],
      ];
      for (let i = 0; i < meta.length; i++) {
        const rowIdx = 2 + i;
        ws.mergeCells(rowIdx, 8, rowIdx, 14);
        const c = ws.getCell(rowIdx, 8);
        c.value = `${meta[i][0]} ${meta[i][1]}`;
        c.alignment = { horizontal: "right", vertical: "middle" };
        ws.getRow(rowIdx).height = 18;
      }

      // Column widths
      ws.columns = [
        { width: 24 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 18 },
        { width: 14 }, { width: 12 }, { width: 12 }, { width: 36 }, { width: 16 }, { width: 15 },
        { width: 15 }, { width: 22 },
      ];

      // Header row
      const COL_HEADERS = [
        "Name of the Supplier","Food Item","Vehicle Temp (°C)","Food Temp (°C)",
        "Vehicle clean","Food handler hygiene","Appearance","Firmness","Smell",
        "Packaging of food is good and undamaged, clean and no signs of pest infestation",
        "Country of origin","Production Date","Expiry Date","Remarks (if any)"
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

      // Data
      let rowIdx = 8;
      rawRows.forEach((e) => {
        ws.getRow(rowIdx).values = [
          e?.supplier || "", e?.foodItem || "", e?.vehicleTemp || "", e?.foodTemp || "",
          e?.vehicleClean || "", e?.handlerHygiene || "", e?.appearanceOK || "", e?.firmnessOK || "", e?.smellOK || "",
          e?.packagingGood || "", e?.countryOfOrigin || "", e?.productionDate || "", e?.expiryDate || "",
          e?.remarks || "",
        ];
        ws.getRow(rowIdx).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        });
        ws.getRow(rowIdx).height = 20;
        rowIdx++;
      });

      // Legend
      const legendRow = rowIdx + 1;
      ws.mergeCells(legendRow, 1, legendRow, 6);
      const legCell = ws.getCell(legendRow, 1);
      legCell.value = "Legend: (C) – Conform   (NC) – Non-Conform";
      legCell.font = { bold: true };
      legCell.alignment = { horizontal: "left", vertical: "middle" };
      ws.getRow(legendRow).height = 18;

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `POS10_ReceivingLog_${p.reportDate || date}.xlsx`
      );
    } catch (err) {
      console.error("[XLSX export error]", err);
      try {
        const p = record?.payload || {};
        fallbackCSV(p);
        alert("⚠️ XLSX export failed, CSV exported instead.\n" + (err?.message || err));
      } catch (e2) {
        alert("⚠️ XLSX and CSV export both failed.\n" + (err?.message || err));
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
      setDate(payload.reportDate);
      await fetchAllDates();
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

    // Header
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

  /* ====== Group dates (Year -> Month -> Dates) ====== */
  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y, m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    for (const y of Object.keys(out))
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a],[b]) => Number(a) - Number(b))
          .map(([m, arr]) => [m, arr.sort((a,b)=>a.localeCompare(b))])
      );
    return Object.fromEntries(Object.entries(out).sort(([a],[b]) => Number(a) - Number(b)));
  }, [allDates]);

  const toggleYear  = (y)    => setExpandedYears((p)  => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>
          Receiving Log (Butchery) — View (POS 10)
        </div>

        {/* Actions */}
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>

          <button onClick={exportXLSX} disabled={!record} style={btn("#0ea5e9")}>
            Export XLSX
          </button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>
            Export JSON
          </button>
          <button onClick={exportPDF} style={btn("#374151")}>
            Export PDF
          </button>
          <label style={{ ...btn("#059669"), display:"inline-block" }}>
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e)=>importJSON(e.target.files?.[0])}
              style={{ display:"none" }}
            />
          </label>
        </div>
      </div>

      {/* Layout: Date tree + content */}
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        {/* Date tree */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(grouped).length ? (
              Object.entries(grouped).map(([year, months]) => {
                const yOpen = !!expandedYears[year];
                return (
                  <div key={year} style={{ marginBottom:8 }}>
                    <button
                      onClick={()=>toggleYear(year)}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        width:"100%", padding:"6px 10px", borderRadius:8,
                        border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontWeight:800
                      }}
                      title={yOpen ? "Collapse" : "Expand"}
                    >
                      <span>Year {year}</span>
                      <span aria-hidden="true">{yOpen ? "▾" : "▸"}</span>
                    </button>

                    {yOpen && Object.entries(months).map(([month, days]) => {
                      const key = `${year}-${month}`;
                      const mOpen = !!expandedMonths[key];
                      return (
                        <div key={key} style={{ marginTop:6, marginLeft:8 }}>
                          <button
                            onClick={()=>toggleMonth(year, month)}
                            style={{
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              width:"100%", padding:"6px 10px", borderRadius:8,
                              border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontWeight:700
                            }}
                            title={mOpen ? "Collapse" : "Expand"}
                          >
                            <span>Month {month}</span>
                            <span aria-hidden="true">{mOpen ? "▾" : "▸"}</span>
                          </button>

                          {mOpen && (
                            <div style={{ padding:"6px 2px 0 2px" }}>
                              <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                                {days.map((d)=>(
                                  <li key={d} style={{ marginBottom:6 }}>
                                    <button
                                      onClick={()=>setDate(d)}
                                      style={{
                                        width:"100%", textAlign:"left", padding:"8px 10px",
                                        borderRadius:8, border:"1px solid #d1d5db",
                                        background: d===date ? "#2563eb" : "#fff",
                                        color: d===date ? "#fff" : "#111827",
                                        fontWeight:700, cursor:"pointer"
                                      }}
                                      title={formatDMY(d)}
                                    >
                                      {formatDMY(d)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div style={{ color:"#6b7280" }}>No available dates.</div>
            )}
          </div>
        </div>

        {/* Report content */}
        <div style={{ minWidth: 0 }}>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}

          {!loading && !err && !record && (
            <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>
              No report for this date.
            </div>
          )}

          {record && (
            <div style={{ overflowX:"auto", overflowY:"hidden" }}>
              <div ref={reportRef} style={{ width: "max-content" }}>
                {/* Info band — mirrors the input header */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8, marginBottom:8, fontSize:12, minWidth: 1100 }}>
                  <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                  <div><strong>Time:</strong> {safe(record.payload?.reportTime)}</div>
                  <div><strong>Invoice No:</strong> {safe(record.payload?.invoiceNo)}</div>
                  <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                  <div><strong>Form Ref:</strong> {safe(record.payload?.formRef || "FSMS/BR/F01A")}</div>
                  <div><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</div>
                </div>

                {/* Legend strip */}
                <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                  <div style={{ ...thCell, background:"#e9f0ff" }}>
                    LEGEND: (C) – Conform &nbsp;&nbsp; / &nbsp;&nbsp; (NC) – Non-Conform
                  </div>
                </div>

                {/* Table — same columns as input */}
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Name of the Supplier</th>
                      <th style={thCell}>Food Item</th>
                      <th style={thCell}>Vehicle Temp (°C)</th>
                      <th style={thCell}>Food Temp (°C)</th>
                      <th style={thCell}>Vehicle clean</th>
                      <th style={thCell}>Food handler hygiene</th>
                      <th style={thCell}>Appearance</th>
                      <th style={thCell}>Firmness</th>
                      <th style={thCell}>Smell</th>
                      <th style={thCell}>Packaging of food is good and undamaged, clean and no signs of pest infestation</th>
                      <th style={thCell}>Country of origin</th>
                      <th style={thCell}>Production Date</th>
                      <th style={thCell}>Expiry Date</th>
                      <th style={thCell}>Remarks (if any)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      (record.payload?.entries || []).filter(isFilledRow).map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>{safe(r.supplier)}</td>
                          <td style={tdCell}>{safe(r.foodItem)}</td>
                          <td style={tdCell}>{safe(r.vehicleTemp)}</td>
                          <td style={tdCell}>{safe(r.foodTemp)}</td>
                          <td style={tdCell}>{safe(r.vehicleClean)}</td>
                          <td style={tdCell}>{safe(r.handlerHygiene)}</td>
                          <td style={tdCell}>{safe(r.appearanceOK)}</td>
                          <td style={tdCell}>{safe(r.firmnessOK)}</td>
                          <td style={tdCell}>{safe(r.smellOK)}</td>
                          <td style={tdCell}>{safe(r.packagingGood)}</td>
                          <td style={tdCell}>{safe(r.countryOfOrigin)}</td>
                          <td style={tdCell}>{formatDMY(safe(r.productionDate))}</td>
                          <td style={tdCell}>{formatDMY(safe(r.expiryDate))}</td>
                          <td style={tdCell}>{safe(r.remarks)}</td>
                        </tr>
                      ))
                    ) : (
                      editRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.supplier || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], supplier:e.target.value}; return n; })}
                              style={inputStyle}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.foodItem || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], foodItem:e.target.value}; return n; })}
                              style={inputStyle}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="number" step="0.1"
                              value={r.vehicleTemp || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], vehicleTemp:e.target.value}; return n; })}
                              style={inputStyle}
                              placeholder="°C"
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="number" step="0.1"
                              value={r.foodTemp || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], foodTemp:e.target.value}; return n; })}
                              style={inputStyle}
                              placeholder="°C"
                            />
                          </td>

                          {TICK_COLS.map((c) => (
                            <td key={c.key} style={tdCell}>
                              <select
                                value={r[c.key] || ""}
                                onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], [c.key]:e.target.value}; return n; })}
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
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], countryOfOrigin:e.target.value}; return n; })}
                              style={inputStyle}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="date"
                              value={r.productionDate || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], productionDate:e.target.value}; return n; })}
                              style={inputStyle}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="date"
                              value={r.expiryDate || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], expiryDate:e.target.value}; return n; })}
                              style={inputStyle}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.remarks || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], remarks:e.target.value}; return n; })}
                              style={inputStyle}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Notes */}
                <div style={{ marginTop:10, fontSize:11, color:"#0b1f4d", width:"max-content" }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>Organoleptic Checks*</div>
                  <div>Appearance: Normal colour (Free from discoloration)</div>
                  <div>Firmness: Firm rather than soft.</div>
                  <div>Smell: Normal smell (No rancid or strange smell)</div>
                  <div style={{ marginTop:8 }}>
                    <strong>Note:</strong> For Chilled Food: Target ≤ 5°C; Critical Limit: 5°C (short deviations ≤ 15 minutes during transfer).&nbsp;
                    For Frozen Food: Target ≤ -18°C (RTE ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp;
                    For Hot Food: Target ≥ 60°C; Critical Limit: 60°C.&nbsp;
                    Dry food, Low Risk: Receive cool/dry or ≤ 25°C, or as per product requirement.
                  </div>
                </div>

                {/* Footer: left = Received, right = Verified (text left-aligned) */}
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
                  {/* Left: Received by */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      flex: "1 1 320px",
                      minWidth: 300,
                    }}
                  >
                    <strong>Received by:</strong>
                    {!editing ? (
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: 260,
                          borderBottom: "2px solid #1f3b70",
                          lineHeight: "1.8",
                          textAlign: "left",
                        }}
                      >
                        {safe(record.payload?.receivedBy)}
                      </span>
                    ) : (
                      <input
                        value={editReceivedBy}
                        onChange={(e) => setEditReceivedBy(e.target.value)}
                        style={{
                          border: "none",
                          borderBottom: "2px solid #1f3b70",
                          padding: "4px 6px",
                          outline: "none",
                          fontSize: 12,
                          color: "#0b1f4d",
                          minWidth: 260,
                          textAlign: "left",
                        }}
                      />
                    )}
                  </div>

                  {/* Right: Verified by (container sits right, text inside stays left) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      flex: "1 1 320px",
                      minWidth: 300,
                      justifyContent: "flex-end",
                    }}
                  >
                    <strong>Verified by:</strong>
                    {!editing ? (
                      <span
                        style={{
                          display: "inline-block",
                          minWidth: 260,
                          borderBottom: "2px solid #1f3b70",
                          lineHeight: "1.8",
                          textAlign: "left",
                        }}
                      >
                        {safe(record.payload?.verifiedBy)}
                      </span>
                    ) : (
                      <input
                        value={editVerifiedBy}
                        onChange={(e) => setEditVerifiedBy(e.target.value)}
                        style={{
                          border: "none",
                          borderBottom: "2px solid #1f3b70",
                          padding: "4px 6px",
                          outline: "none",
                          fontSize: 12,
                          color: "#0b1f4d",
                          minWidth: 260,
                          textAlign: "left",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
