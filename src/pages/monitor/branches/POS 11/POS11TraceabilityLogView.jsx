// src/pages/monitor/branches/POS 11/POS11TraceabilityLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import {
  safe,
  getId,
  btn,
  formatDMY,
  isFilledRow,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE   = "pos11_traceability_log";
const BRANCH = "POS 11";

// ط¸â€ ط¸â€¦ط¸ث†ط·آ°ط·آ¬ ط·آµط¸ظ¾
function emptyRow() {
  return {
    batchId: "",
    rawName: "", origProdDate: "", origExpDate: "", openedDate: "", bestBefore: "",
    rawWeight: "",
    finalName: "", finalProdDate: "", finalExpDate: "",
    finalWeight: "",
  };
}

// ط¸â€¦ط·آ³ط·آ§ط¸ث†ط·آ§ط·آ© ط·آ§ط¸â€‍ط·آ­ط¸â€ڑط¸ث†ط¸â€‍ ط·آ¹ط·آ¨ط·آ± ط¸â€¦ط·آ¬ط¸â€¦ط¸ث†ط·آ¹ط·آ© ط·آµط¸ظ¾ط¸ث†ط¸ظ¾
const equalAcross = (rows, keys) => {
  if (!rows.length) return false;
  const f = rows[0];
  return rows.every(r => keys.every(k => String(r?.[k] ?? "") === String(f?.[k] ?? "")));
};

export default function POS11TraceabilityLogView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);

  // Edit mode (password 9999)
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState(Array.from({ length: 12 }, () => emptyRow()));
  const [editCheckedBy, setEditCheckedBy] = useState("");
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [allDates, setAllDates] = useState([]);

  // Styles
  // Styles أ¢â‚¬â€‌ ط·آ¬ط·آ¯ط¸ث†ط¸â€‍ ط¸ظ¹ط¸â€¦ط¸â€‍ط·آ£ ط·آ§ط¸â€‍ط·آµط¸ظ¾ط·آ­ط·آ© ط·آ¨ط·ع¾ط·آµط¸â€¦ط¸ظ¹ط¸â€¦ ط·آ·ط¸ظ¹ط¸ظ¾ط¸ظ¹ ط·آ¹ط·آµط·آ±ط¸ظ¹
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 15,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 2px 14px rgba(99,102,241,0.10)",
  }), []);
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
    padding: "6px 8px",
    fontSize: 14,
  };

  /* ===== Fetch dates ===== */
  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const filtered = list.map((r) => r?.payload).filter((p) => p && p.branch === BRANCH && p.reportDate);
      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);

      // Tree stays collapsed by default.
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) {
      console.warn("Failed to fetch dates", e);
    }
  }

  /* ===== Fetch one record ===== */
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

      // Init edit buffers
      const rows = Array.from({ length: 12 }, (_, i) => {
        const e = match?.payload?.entries?.[i];
        return e ? {
          batchId: e.batchId ?? "",
          rawName: e.rawName ?? "", origProdDate: e.origProdDate ?? "", origExpDate: e.origExpDate ?? "",
          openedDate: e.openedDate ?? "", bestBefore: e.bestBefore ?? "",
          rawWeight: e.rawWeight ?? "",
          finalName: e.finalName ?? "", finalProdDate: e.finalProdDate ?? "", finalExpDate: e.finalExpDate ?? "",
          finalWeight: e.finalWeight ?? "",
        } : emptyRow();
      });
      setEditRows(rows);
      setEditCheckedBy(match?.payload?.checkedBy || "");
      setEditVerifiedBy(match?.payload?.verifiedBy || "");
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

  /* ===== Edit / Save / Delete with password ===== */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      const rows = Array.from({ length: 12 }, (_, i) => {
        const e = record?.payload?.entries?.[i];
        return e ? {
          batchId: e.batchId ?? "",
          rawName: e.rawName ?? "", origProdDate: e.origProdDate ?? "", origExpDate: e.origExpDate ?? "",
          openedDate: e.openedDate ?? "", bestBefore: e.bestBefore ?? "",
          rawWeight: e.rawWeight ?? "",
          finalName: e.finalName ?? "", finalProdDate: e.finalProdDate ?? "", finalExpDate: e.finalExpDate ?? "",
          finalWeight: e.finalWeight ?? "",
        } : emptyRow();
      });
      setEditRows(rows);
      setEditCheckedBy(record?.payload?.checkedBy || "");
      setEditVerifiedBy(record?.payload?.verifiedBy || "");
      setEditing(false);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("أ¢â€Œإ’ Wrong password");
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("أ¢â€Œإ’ Wrong password");
    if (!record) return;

    if (!editRows.some(isFilledRow)) {
      return alert("أ¢ع‘آ أ¯آ¸عˆ Please fill at least one row before saving.");
    }

    const rid = getId(record);
    const cleaned = editRows.filter(isFilledRow);

    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: cleaned, // ط¸ظ¹ط·آ­ط·ع¾ط¸ث†ط¸ظ¹ ط·آ¹ط¸â€‍ط¸â€° batchId ط¸ث† ط·آ§ط¸â€‍ط·آ£ط¸ث†ط·آ²ط·آ§ط¸â€ 
      checkedBy: editCheckedBy,
      verifiedBy: editVerifiedBy,
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      // PUT on the existing id (never DELETE+POST: a failed POST would lose the report)
      const postRes = await fetch(rid ? `${API_BASE}/api/reports/${encodeURIComponent(rid)}` : `${API_BASE}/api/reports`, {
        method: rid ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos11", type: TYPE, payload }),
      });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      alert("أ¢إ“â€¦ Changes saved");
      setEditing(false);
      await fetchRecord(payload.reportDate);
      await fetchAllDates();
    } catch (e) {
      console.error(e);
      alert("أ¢â€Œإ’ Saving failed.\n" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("أ¢â€Œإ’ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("أ¢ع‘آ أ¯آ¸عˆ Missing record id.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("أ¢إ“â€¦ Deleted");
      await fetchAllDates();
      const next = allDates.find((d) => d !== record?.payload?.reportDate) || todayDubai;
      setDate(next);
    } catch (e) {
      console.error(e);
      alert("أ¢â€Œإ’ Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ===== Export / Import ===== */
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS11_TraceabilityLog_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // CSV (ط¸â€¦ط·آ¹ ط·آ§ط¸â€‍ط·آ£ط¸ث†ط·آ²ط·آ§ط¸â€ )
  function fallbackCSV(p) {
    const headers = [
      "Batch / Lot ID",
      "Name of Raw Material Used for Preparation",
      "Original Production Date",
      "Original Expiry Date",
      "Opened Date",
      "Best Before Date",
      "Raw Weight (kg)",
      "Name of Product Prepared (Final Product)",
      "Production Date (Final Product)",
      "Expiry Date (Final Product)",
      "Final Weight (kg)",
      "Checked by",
      "Verified by",
    ];
    const rows = (p.entries || []).filter(isFilledRow).map(e => ([
      e?.batchId ?? "",
      e?.rawName ?? "", e?.origProdDate ?? "", e?.origExpDate ?? "",
      e?.openedDate ?? "", e?.bestBefore ?? "", e?.rawWeight ?? "",
      e?.finalName ?? "", e?.finalProdDate ?? "", e?.finalExpDate ?? "", e?.finalWeight ?? "",
      p?.checkedBy ?? "", p?.verifiedBy ?? "",
    ]));
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS11_TraceabilityLog_${p.reportDate || date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // XLSX
  async function exportXLSX() {
    try {
      async function loadExcelJS() {
        try {
          const m = await import("exceljs/dist/exceljs.min.js");
          return m?.default ?? m;
        } catch (_) {}
        try {
          const m2 = await import("exceljs");
          return m2?.default ?? m2;
        } catch (_) {}
        throw new Error("Failed to load ExcelJS");
      }
      const ExcelJS = await loadExcelJS();
      const { saveAs } = await import("file-saver");

      const p = record?.payload || {};
      const rawRows = Array.isArray(p.entries) ? p.entries.filter(isFilledRow) : [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("TraceabilityLog");

      const lightBlue = "D9E2F3";
      const headBlue = "DCE6F1";
      const borderThin = { style: "thin", color: { argb: "1F3B70" } };

      // Title (11 ط·آ¹ط¸â€¦ط¸ث†ط·آ¯)
      ws.mergeCells(1,1,1,11);
      const r1 = ws.getCell(1,1);
      r1.value = "POS 11 | Traceability Log";
      r1.alignment = { horizontal: "center", vertical: "middle" };
      r1.font = { size: 14, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      ws.getRow(1).height = 26;

      // Meta (ط¸ظ¹ط¸â€¦ط¸ظ¹ط¸â€ )
      const meta = [
        ["Branch:",     p.branch     || "POS 11"],
        ["Report Date:",p.reportDate || ""],
        ["Checked by:", p.checkedBy  || ""],
        ["Verified by:",p.verifiedBy || ""],
      ];
      for (let i = 0; i < meta.length; i++) {
        const rowIdx = 2 + i;
        ws.mergeCells(rowIdx, 6, rowIdx, 11);
        const c = ws.getCell(rowIdx, 6);
        c.value = `${meta[i][0]} ${meta[i][1]}`;
        c.alignment = { horizontal: "right", vertical: "middle" };
        ws.getRow(rowIdx).height = 18;
      }

      ws.columns = [
        { width: 24 }, // batch
        { width: 28 }, { width: 18 }, { width: 18 }, { width: 16 },
        { width: 18 }, { width: 14 }, // rawWeight
        { width: 28 }, { width: 20 }, { width: 20 }, { width: 14 }, // finalWeight
      ];

      const COL_HEADERS = [
        "Batch / Lot ID",
        "Name of Raw Material Used for Preparation",
        "Original Production Date",
        "Original Expiry Date",
        "Opened Date",
        "Best Before Date",
        "Raw Weight (kg)",
        "Name of Product Prepared (Final Product)",
        "Production Date (Final Product)",
        "Expiry Date (Final Product)",
        "Final Weight (kg)",
      ];
      const hr = ws.getRow(7);
      hr.values = COL_HEADERS;
      hr.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headBlue } };
        cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      });
      hr.height = 28;

      let rowIdx = 8;
      rawRows.forEach((e) => {
        ws.getRow(rowIdx).values = [
          e?.batchId || "",
          e?.rawName || "", e?.origProdDate || "", e?.origExpDate || "",
          e?.openedDate || "", e?.bestBefore || "", e?.rawWeight || "",
          e?.finalName || "", e?.finalProdDate || "", e?.finalExpDate || "", e?.finalWeight || "",
        ];
        ws.getRow(rowIdx).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        });
        ws.getRow(rowIdx).height = 22;
        rowIdx++;
      });

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `POS11_TraceabilityLog_${p.reportDate || date}.xlsx`
      );
    } catch (err) {
      console.error("[XLSX export error]", err);
      try {
        const p = record?.payload || {};
        fallbackCSV(p);
        alert("أ¢ع‘آ أ¯آ¸عˆ XLSX export failed, CSV exported instead.\n" + (err?.message || err));
      } catch (e2) {
        alert("أ¢ع‘آ أ¯آ¸عˆ XLSX and CSV export both failed.\n" + (err?.message || err));
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
        body: JSON.stringify({ reporter: "pos11", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("أ¢إ“â€¦ Imported and saved");
      setDate(payload.reportDate);
      await fetchAllDates();
      await fetchRecord(payload.reportDate);
    } catch (e) {
      console.error(e);
      alert("أ¢â€Œإ’ Invalid JSON or save failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setLoading(false);
    }
  }

  /* ===== PDF export ===== */
  async function exportPDF() {
    if (!reportRef.current) return;

    // ط·ع¾ط·آ­ط¸â€¦ط¸ظ¹ط¸â€‍ ط·آ¯ط¸ظ¹ط¸â€ ط·آ§ط¸â€¦ط¸ظ¹ط¸ئ’ط¸ظ¹ أ¢â‚¬â€‌ ط¸ظ¹ط·آ®ط¸ظ¾ط¸â€کط¸ظ¾ ط·آ­ط·آ¬ط¸â€¦ ط·آ§ط¸â€‍ط·آµط¸ظ¾ط·آ­ط·آ© ط·آ¹ط¸â€ ط·آ¯ ط·آ§ط¸â€‍ط¸ظ¾ط·ع¾ط·آ­
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

    const p = record?.payload || {};
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
    pdf.text(`POS 11 | Traceability Log (${p.reportDate || date})`, pageW / 2, 28, { align: "center" });

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
        pdf.text(`POS 11 | Traceability Log (${p.reportDate || date})`, pageW / 2, 28, { align: "center" });
      }
    }

    pdf.save(`POS11_TraceabilityLog_${p.reportDate || date}.pdf`);
  }

  /* ===== Grouping by batchId ===== */
  const grouped = useMemo(() => {
    const entries = record?.payload?.entries || [];
    const groups = new Map();
    for (const e of entries) {
      const key = (e?.batchId ?? "").trim() || "أ¢â‚¬â€‌";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    return groups;
  }, [record]);

  /* ===== ط·آ¹ط¸â€ ط·آ§ط·آµط·آ± ط·آ´ط·آ¬ط·آ±ط·آ© ط·آ§ط¸â€‍ط·ع¾ط·آ§ط·آ±ط¸ظ¹ط·آ® (ط¸â€‍ط¸â€‍ط¸â€¦ط¸ئ’ط¸ث†ط¸â€کط¸â€  ط·آ§ط¸â€‍ط¸â€¦ط·آ´ط·ع¾ط·آ±ط¸ئ’) ===== */
  const treeItems = useMemo(
    () => allDates.map((d) => ({ key: d, dateISO: d, label: formatDMY(d) })),
    [allDates]
  );

  return (
    <GlassShell
      icon="ظ‹ع؛آ§آ¬"
      title="Traceability Log أ¢â‚¬â€‌ View (POS 11)"
      actions={
        <>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")} data-delete-action="true">Delete (password)</button>

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
        </>
      }
    >
      {/* Layout: Date tree + content */}
      <SidebarLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={date}
            onPick={(it) => setDate(it.key)}
            loading={loading && !allDates.length}
          />
        }
      >
          {loading && <p>Loadingأ¢â‚¬آ¦</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}

          {!loading && !err && !record && <EmptyState />}

          {record && (
            <div style={{ overflowX:"auto", overflowY:"hidden" }}>
              <div ref={reportRef} style={{ width: "100%", minWidth: 0 }}>
                {/* Meta أ¢â‚¬â€‌ ط·آ´ط·آ§ط·آ±ط·آ§ط·ع¾ ط·آ²ط·آ¬ط·آ§ط·آ¬ط¸ظ¹ط·آ© */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:8, marginBottom:10, fontSize:14.5 }}>
                  {[
                    ["Branch", safe(record.payload?.branch)],
                    ["Report Date", safe(record.payload?.reportDate)],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      background: "linear-gradient(135deg, rgba(237,233,254,0.6), rgba(224,242,254,0.5))",
                      border: "1px solid rgba(139,92,246,0.25)",
                      borderRadius: 10,
                      padding: "7px 12px",
                    }}>
                      <strong style={{ color: "#5b21b6" }}>{k}:</strong> {v || "أ¢â‚¬â€‌"}
                    </div>
                  ))}
                </div>

                {/* Table */}
                <table style={gridStyle}>
                  <thead>
                    <tr style={theadRow}>
                      <th style={thCell}>Batch / Lot ID</th>
                      <th style={thCell}>Name of Raw Material Used for Preparation</th>
                      <th style={thCell}>Original Production Date</th>
                      <th style={thCell}>Original Expiry Date</th>
                      <th style={thCell}>Opened Date</th>
                      <th style={thCell}>Best Before Date</th>
                      <th style={thCell}>Raw Weight (kg)</th>
                      <th style={thCell}>Name of Product Prepared (Final Product)</th>
                      <th style={thCell}>Production Date (Final Product)</th>
                      <th style={thCell}>Expiry Date (Final Product)</th>
                      <th style={thCell}>Final Weight (kg)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!editing ? (
                      // === ط·آ¹ط·آ±ط·آ¶ ط¸â€¦ط·آ¹ ط·آ¯ط¸â€¦ط·آ¬ ط·آ®ط¸â€‍ط·آ§ط¸ظ¹ط·آ§ ط·آ¹ط¸â€ ط·آ¯ ط·ع¾ط¸ئ’ط·آ±ط·آ§ط·آ± ط·آ¬ط·آ§ط¸â€ ط·آ¨ ط¸ث†ط·آ§ط·آ­ط·آ¯ (raw ط·آ£ط¸ث† final) + ط·آ¯ط¸â€¦ط·آ¬ batchId ===
                      Array.from(grouped.entries()).map(([batchId, allRows], gi) => {
                        const rows = allRows.filter(isFilledRow);
                        if (!rows.length) return null;

                        const rawsSame   = equalAcross(rows, ["rawName","origProdDate","origExpDate","openedDate","bestBefore","rawWeight"]);
                        const finalsSame = equalAcross(rows, ["finalName","finalProdDate","finalExpDate","finalWeight"]);
                        const span = rows.length;

                        return (
                          <React.Fragment key={`g-${gi}`}>
                            {/* ط·آ¹ط¸â€ ط¸ث†ط·آ§ط¸â€  ط·آ§ط¸â€‍ط·آ¨ط·آ§ط·ع¾ط·آ´ أ¢â‚¬â€‌ ط·آ´ط·آ±ط¸ظ¹ط·آ· ط·آ·ط¸ظ¹ط¸ظ¾ط¸ظ¹ */}
                            <tr>
                              <td colSpan={11} style={{
                                background: "linear-gradient(90deg,#ede9fe,#cffafe,#d1fae5)",
                                color: "#4c1d95",
                                fontWeight: 800,
                                fontSize: 15,
                                textAlign: "left",
                                border: "1px solid #c7d2fe",
                                padding: "9px 12px"
                              }}>
                                ظ‹ع؛آ§آ¬ Batch / Lot: {batchId} أ¢â‚¬â€‌ {rows.length} row(s)
                              </td>
                            </tr>

                            {rows.map((r, idx) => (
                              <tr key={`${gi}-${idx}`}>
                                {/* أ¢إ“â€¦ Batch id أ¢â‚¬â€‌ ط·آ®ط¸â€‍ط¸ظ¹ط·آ© ط¸â€¦ط·آ¯ط¸â€¦ط¸ث†ط·آ¬ط·آ© ط¸â€¦ط·آ±ط·آ© ط¸ث†ط·آ§ط·آ­ط·آ¯ط·آ© */}
                                {idx === 0 && (
                                  <td style={tdCell} rowSpan={span}>
                                    {safe(batchId)}
                                  </td>
                                )}

                                {/* RAW side */}
                                {rawsSame ? (
                                  idx === 0 ? (
                                    <>
                                      <td style={tdCell} rowSpan={span}>{safe(rows[0].rawName)}</td>
                                      <td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].origProdDate))}</td>
                                      <td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].origExpDate))}</td>
                                      <td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].openedDate))}</td>
                                      <td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].bestBefore))}</td>
                                      <td style={tdCell} rowSpan={span}>{safe(rows[0].rawWeight) ? `${rows[0].rawWeight} kg` : ""}</td>
                                    </>
                                  ) : null
                                ) : (
                                  <>
                                    <td style={tdCell}>{safe(r.rawName)}</td>
                                    <td style={tdCell}>{formatDMY(safe(r.origProdDate))}</td>
                                    <td style={tdCell}>{formatDMY(safe(r.origExpDate))}</td>
                                    <td style={tdCell}>{formatDMY(safe(r.openedDate))}</td>
                                    <td style={tdCell}>{formatDMY(safe(r.bestBefore))}</td>
                                    <td style={tdCell}>{safe(r.rawWeight) ? `${r.rawWeight} kg` : ""}</td>
                                  </>
                                )}

                                {/* FINAL side */}
                                {finalsSame ? (
                                  idx === 0 ? (
                                    <>
                                      <td style={tdCell} rowSpan={span}>{safe(rows[0].finalName)}</td>
                                      <td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].finalProdDate))}</td>
                                      <td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].finalExpDate))}</td>
                                      <td style={tdCell} rowSpan={span}>{safe(rows[0].finalWeight) ? `${rows[0].finalWeight} kg` : ""}</td>
                                    </>
                                  ) : null
                                ) : (
                                  <>
                                    <td style={tdCell}>{safe(r.finalName)}</td>
                                    <td style={tdCell}>{formatDMY(safe(r.finalProdDate))}</td>
                                    <td style={tdCell}>{formatDMY(safe(r.finalExpDate))}</td>
                                    <td style={tdCell}>{safe(r.finalWeight) ? `${r.finalWeight} kg` : ""}</td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      // === ط¸ث†ط·آ¶ط·آ¹ ط·آ§ط¸â€‍ط·ع¾ط·آ¹ط·آ¯ط¸ظ¹ط¸â€‍ (ط¸ظ¹ط·آ´ط¸â€¦ط¸â€‍ batchId ط¸ث† ط·آ§ط¸â€‍ط·آ£ط¸ث†ط·آ²ط·آ§ط¸â€ ) ===
                      editRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>
                            <input type="text" value={r.batchId || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], batchId:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="text" value={r.rawName || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], rawName:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.origProdDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], origProdDate:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.origExpDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], origExpDate:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.openedDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], openedDate:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.bestBefore || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], bestBefore:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="number" step="0.01" min="0" value={r.rawWeight || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], rawWeight:e.target.value}; return n;})} style={inputStyle} placeholder="e.g., 2.50"/>
                          </td>
                          <td style={tdCell}>
                            <input type="text" value={r.finalName || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalName:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.finalProdDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalProdDate:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.finalExpDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalExpDate:e.target.value}; return n;})} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="number" step="0.01" min="0" value={r.finalWeight || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalWeight:e.target.value}; return n;})} style={inputStyle} placeholder="e.g., 1.20"/>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Note */}
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 14,
                    color: "#0b1f4d",
                    lineHeight: 1.7,
                    background: "rgba(255,255,255,0.6)",
                    border: "1px solid #e0e7ff",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  <strong style={{ color: "#0b1f4d" }}>Note:</strong>
                  <span style={{ marginInlineStart: 4 }}>
                    The raw materials used for the preparation and the final product details should be recorded in the
                    <span style={{ fontWeight: 800 }}> أ¢â‚¬إ“Traceability Record Formأ¢â‚¬â€Œ</span>.
                  </span>
                </div>

                {/* Footer: Checked left | Verified right */}
                <div
                  style={{
                    marginTop: 12,
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    flexWrap: "wrap",
                    alignItems: "center",
                    fontSize: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 320px", minWidth: 300 }}>
                    <strong>Checked by:</strong>
                    {!editing ? (
                      <span style={{ display: "inline-block", minWidth: 260, borderBottom: "2px solid #1f3b70", lineHeight: "1.8", textAlign: "left" }}>
                        <SignatureName name={safe(record.payload?.checkedBy)} underline={false} />
                      </span>
                    ) : (
                      <input
                        value={editCheckedBy}
                        onChange={(e) => setEditCheckedBy(e.target.value)}
                        style={{ border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", minWidth: 260 }}
                      />
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 320px", minWidth: 300, justifyContent: "flex-end" }}>
                    <strong>Verified by:</strong>
                    {!editing ? (
                      <span style={{ display: "inline-block", minWidth: 260, borderBottom: "2px solid #1f3b70", lineHeight: "1.8", textAlign: "left" }}>
                        <SignatureName name={safe(record.payload?.verifiedBy)} underline={false} />
                      </span>
                    ) : (
                      <input
                        value={editVerifiedBy}
                        onChange={(e) => setEditVerifiedBy(e.target.value)}
                        style={{ border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", minWidth: 260 }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
      </SidebarLayout>
    </GlassShell>
  );
}
