// src/pages/monitor/branches/pos15/POS15TraceabilityLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import SignatureName from "../../../shared/SignatureName";
import {
  btn,
  formatDMY,
  GlassShell,
  DateTreeSidebar,
  SidebarLayout,
  EmptyState,
} from "../_shared/branchViewKit";

const TYPE   = "pos15_traceability_log";
const BRANCH = "POS 15";

const DOC = {
  title: "Traceability Record",
  no: "FS-QM/REC/TBL",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: BRANCH,
  issuedBy: "MOHAMAD ABDULLAH",
  approvedBy: "Hussam O. Sarhan",
  officer: "Quality Controller",
};

const safe  = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const isFilledRow = (r = {}) => Object.values(r).some((v) => String(v ?? "").trim() !== "");

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
  return { batchId: "", rawName: "", origProdDate: "", origExpDate: "", openedDate: "", bestBefore: "", rawWeight: "", finalName: "", finalProdDate: "", finalExpDate: "", finalWeight: "" };
}

const equalAcross = (rows, keys) => {
  if (!rows.length) return false;
  const f = rows[0];
  return rows.every(r => keys.every(k => String(r?.[k] ?? "") === String(f?.[k] ?? "")));
};

const theadRow = { background: "linear-gradient(90deg,#7c3aed 0%,#0ea5e9 55%,#10b981 100%)" };
const thCell = { border: "1px solid rgba(255,255,255,0.30)", padding: "8px 6px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 800, background: "transparent", color: "#fff" };
const tdCell = { border: "1px solid #c7d2fe", padding: "8px 6px", textAlign: "center", verticalAlign: "middle" };
const gridStyle = { width: "max-content", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 20 };
const inputStyle = { width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "6px 8px" };

export default function POS15TraceabilityLogView() {
  const sheetRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState(Array.from({ length: 12 }, () => emptyRow()));
  const [editCheckedBy, setEditCheckedBy] = useState("");
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [editReportDate, setEditReportDate] = useState("");
  const [allDates, setAllDates] = useState([]);

  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const filtered = list.map((r) => r?.payload).filter((p) => p && p.branch === BRANCH && p.reportDate);
      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) { console.warn("Failed to fetch dates", e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      setRecord(match);
      const rows = Array.from({ length: 12 }, (_, i) => {
        const e = match?.payload?.entries?.[i];
        return e ? { batchId: e.batchId ?? "", rawName: e.rawName ?? "", origProdDate: e.origProdDate ?? "", origExpDate: e.origExpDate ?? "", openedDate: e.openedDate ?? "", bestBefore: e.bestBefore ?? "", rawWeight: e.rawWeight ?? "", finalName: e.finalName ?? "", finalProdDate: e.finalProdDate ?? "", finalExpDate: e.finalExpDate ?? "", finalWeight: e.finalWeight ?? "" } : emptyRow();
      });
      setEditRows(rows);
      setEditCheckedBy(match?.payload?.checkedBy || "");
      setEditVerifiedBy(match?.payload?.verifiedBy || "");
      setEditReportDate(match?.payload?.reportDate || "");
      setEditing(false);
    } catch (e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  const treeItems = useMemo(() =>
    allDates.map(d => {
      const n = normYMD(d);
      return n ? { key: d, dateISO: n.iso, label: formatDMY(n.iso), data: d } : null;
    }).filter(Boolean),
  [allDates]);

  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      const rows = Array.from({ length: 12 }, (_, i) => { const e = record?.payload?.entries?.[i]; return e ? { batchId: e.batchId ?? "", rawName: e.rawName ?? "", origProdDate: e.origProdDate ?? "", origExpDate: e.origExpDate ?? "", openedDate: e.openedDate ?? "", bestBefore: e.bestBefore ?? "", rawWeight: e.rawWeight ?? "", finalName: e.finalName ?? "", finalProdDate: e.finalProdDate ?? "", finalExpDate: e.finalExpDate ?? "", finalWeight: e.finalWeight ?? "" } : emptyRow(); });
      setEditRows(rows); setEditCheckedBy(record?.payload?.checkedBy || ""); setEditVerifiedBy(record?.payload?.verifiedBy || ""); setEditReportDate(record?.payload?.reportDate || ""); setEditing(false); return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    if (!editRows.some(isFilledRow)) return alert("⚠️ Please fill at least one row before saving.");
    if (!editReportDate) return alert("⚠️ Please select Report Date before saving.");
    const rid = getId(record);
    const cleaned = editRows.filter(isFilledRow);
    const payload = { ...(record?.payload || {}), branch: BRANCH, reportDate: editReportDate, entries: cleaned, checkedBy: editCheckedBy, verifiedBy: editVerifiedBy, savedAt: Date.now() };
    try {
      setLoading(true);
      const postRes = await fetch(rid ? `${API_BASE}/api/reports/${encodeURIComponent(rid)}` : `${API_BASE}/api/reports`, { method: rid ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: "pos15", type: TYPE, payload }) });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);
      alert("✅ Changes saved"); setEditing(false); await fetchAllDates(); setDate(editReportDate); await fetchRecord(editReportDate);
    } catch (e) { console.error(e); alert("❌ Saving failed.\n" + String(e?.message || e)); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(record); if (!rid) return alert("⚠️ Missing record id.");
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
    a.download = `POS15_TraceabilityLog_${record?.payload?.reportDate || date}.json`; a.click(); URL.revokeObjectURL(a.href);
  }

  function fallbackCSV(p) {
    const headers = ["Batch / Lot ID","Name of Raw Material Used for Preparation","Original Production Date","Original Expiry Date","Opened Date","Best Before Date","Raw Weight (kg)","Name of Product Prepared (Final Product)","Production Date (Final Product)","Expiry Date (Final Product)","Final Weight (kg)","Checked by","Verified by"];
    const rows = (p.entries || []).filter(isFilledRow).map(e => ([e?.batchId ?? "", e?.rawName ?? "", e?.origProdDate ?? "", e?.origExpDate ?? "", e?.openedDate ?? "", e?.bestBefore ?? "", e?.rawWeight ?? "", e?.finalName ?? "", e?.finalProdDate ?? "", e?.finalExpDate ?? "", e?.finalWeight ?? "", p?.checkedBy ?? "", p?.verifiedBy ?? ""]));
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `POS15_TraceabilityLog_${p.reportDate || date}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      async function loadExcelJS() {
        try { const m = await import("exceljs/dist/exceljs.min.js"); return m?.default ?? m; } catch (_) {}
        try { const m2 = await import("exceljs"); return m2?.default ?? m2; } catch (_) {}
        throw new Error("Failed to load ExcelJS");
      }
      const ExcelJS = await loadExcelJS(); const { saveAs } = await import("file-saver");
      const p = record?.payload || {}; const rawRows = Array.isArray(p.entries) ? p.entries.filter(isFilledRow) : [];
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("TraceabilityLog");
      const lightBlue = "D9E2F3"; const headBlue = "DCE6F1"; const borderThin = { style: "thin", color: { argb: "1F3B70" } };
      ws.mergeCells(1,1,1,11); const r1 = ws.getCell(1,1); r1.value = "POS 15 | Traceability Log"; r1.alignment = { horizontal: "center", vertical: "middle" }; r1.font = { size: 14, bold: true }; r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } }; ws.getRow(1).height = 26;
      const meta = [["Branch:", p.branch || "POS 15"],["Report Date:", p.reportDate || ""],["Checked by:", p.checkedBy || ""],["Verified by:", p.verifiedBy || ""]];
      for (let i = 0; i < meta.length; i++) { const rowIdx = 2 + i; ws.mergeCells(rowIdx, 6, rowIdx, 11); const c = ws.getCell(rowIdx, 6); c.value = `${meta[i][0]} ${meta[i][1]}`; c.alignment = { horizontal: "right", vertical: "middle" }; ws.getRow(rowIdx).height = 18; }
      ws.columns = [{ width: 24 }, { width: 28 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 18 }, { width: 14 }, { width: 28 }, { width: 20 }, { width: 20 }, { width: 14 }];
      const COL_HEADERS = ["Batch / Lot ID","Name of Raw Material Used for Preparation","Original Production Date","Original Expiry Date","Opened Date","Best Before Date","Raw Weight (kg)","Name of Product Prepared (Final Product)","Production Date (Final Product)","Expiry Date (Final Product)","Final Weight (kg)"];
      const hr = ws.getRow(7); hr.values = COL_HEADERS; hr.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headBlue } }; cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin }; }); hr.height = 28;
      let rowIdx = 8;
      rawRows.forEach((e) => { ws.getRow(rowIdx).values = [e?.batchId || "", e?.rawName || "", e?.origProdDate || "", e?.origExpDate || "", e?.openedDate || "", e?.bestBefore || "", e?.rawWeight || "", e?.finalName || "", e?.finalProdDate || "", e?.finalExpDate || "", e?.finalWeight || ""]; ws.getRow(rowIdx).eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin }; }); ws.getRow(rowIdx).height = 22; rowIdx++; });
      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `POS15_TraceabilityLog_${p.reportDate || date}.xlsx`);
    } catch (err) {
      console.error("[XLSX export error]", err);
      try { fallbackCSV(record?.payload || {}); alert("⚠️ XLSX export failed, CSV exported instead.\n" + (err?.message || err)); }
      catch (e2) { alert("⚠️ XLSX and CSV export both failed.\n" + (err?.message || err)); }
    }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text(); const parsed = JSON.parse(text); const payload = parsed?.payload || parsed;
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
    const p = record?.payload || {};
    const PRINT_CSS = `
      @page { size: A4 landscape; margin: 10mm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      body { margin:0; font-family: Inter, Arial, sans-serif; color:#0f172a; }
      table { border-collapse: collapse; width:100%; }
      th, td { border:1.5px solid #94a3b8; padding:6px; font-size:11px; }
      thead th { background:#e2e8f0; font-weight:900; }
      tbody tr:nth-child(2n) td { background:#f8fafc; }
    `;
    const html = `<html><head><meta charset="utf-8"/><title>POS 15 Traceability Log - ${p.reportDate || date}</title><style>${PRINT_CSS}</style></head><body>${sheetRef.current.outerHTML}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 100);
  }

  const grouped = useMemo(() => {
    const entries = record?.payload?.entries || [];
    const groups = new Map();
    for (const e of entries) { const key = (e?.batchId ?? "").trim() || "—"; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(e); }
    return groups;
  }, [record]);

  const metaBadge = { display: "inline-block", background: "rgba(255,255,255,0.6)", border: "1px solid #c7d2fe", borderRadius: 10, padding: "6px 12px", fontSize: 13, fontWeight: 700, color: "#0b1f4d", marginRight: 8, marginBottom: 6 };

  return (
    <GlassShell
      icon="🧬"
      title="Traceability Log — View (POS 15)"
      actions={
        <>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>{editing ? "Cancel Edit" : "Edit (password)"}</button>
          {editing && <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")} disabled={!record} data-delete-action="true">Delete</button>
          <button onClick={exportXLSX} disabled={!record} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportPDF} disabled={!record} style={btn("#374151")}>Export PDF</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <label style={{ ...btn("#059669"), display: "inline-block", cursor: "pointer" }}>
            Import JSON
            <input ref={fileInputRef} type="file" accept="application/json" onChange={(e) => importJSON(e.target.files?.[0])} style={{ display: "none" }} />
          </label>
        </>
      }
    >
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
            <div ref={sheetRef}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span style={metaBadge}><strong>Document Title:</strong> {DOC.title}</span>
                <span style={metaBadge}><strong>Document No:</strong> {DOC.no}</span>
                <span style={metaBadge}><strong>Issue Date:</strong> {DOC.issueDate}</span>
                <span style={metaBadge}><strong>Revision No:</strong> {DOC.revisionNo}</span>
                <span style={metaBadge}><strong>Area:</strong> {DOC.area}</span>
                <span style={metaBadge}><strong>Issued by:</strong> {DOC.issuedBy}</span>
                <span style={metaBadge}><strong>Approved by:</strong> {DOC.approvedBy}</span>
              </div>

              <div style={{ textAlign: "center", background: "linear-gradient(90deg,#ede9fe,#e0f2fe,#d1fae5)", border: "1px solid #c7d2fe", borderRadius: 10, padding: "9px 6px", fontWeight: 800, fontSize: 16, color: "#0b1f4d", marginBottom: 10 }}>
                🧬 TRACEABILITY LOG — POS 15
              </div>

              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
                <strong>Branch:</strong> {safe(record.payload?.branch)}&nbsp;&nbsp;
                <strong>Report Date:</strong>&nbsp;
                {!editing ? (
                  <span>{safe(record.payload?.reportDate)}</span>
                ) : (
                  <input type="date" value={editReportDate || ""} onChange={(e) => setEditReportDate(e.target.value)} style={{ ...inputStyle, maxWidth: 200, display: "inline-block" }} />
                )}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={gridStyle}>
                  <colgroup>
                    <col style={{ width: 180 }} /><col style={{ width: 260 }} /><col style={{ width: 140 }} />
                    <col style={{ width: 140 }} /><col style={{ width: 120 }} /><col style={{ width: 140 }} />
                    <col style={{ width: 120 }} /><col style={{ width: 260 }} /><col style={{ width: 160 }} />
                    <col style={{ width: 160 }} /><col style={{ width: 120 }} />
                  </colgroup>
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
                      Array.from(grouped.entries()).map(([batchId, allRows], gi) => {
                        const rows = allRows.filter(isFilledRow);
                        if (!rows.length) return null;
                        const rawsSame = equalAcross(rows, ["rawName","origProdDate","origExpDate","openedDate","bestBefore","rawWeight"]);
                        const finalsSame = equalAcross(rows, ["finalName","finalProdDate","finalExpDate","finalWeight"]);
                        const span = rows.length;
                        return (
                          <React.Fragment key={`g-${gi}`}>
                            <tr>
                              <td colSpan={11} style={{ background: "rgba(237,233,254,0.55)", color: "#1e3a8a", fontWeight: 800, textAlign: "left", border: "1px solid #c7d2fe", padding: "8px 10px" }}>
                                Batch / Lot: {batchId} — {rows.length} row(s)
                              </td>
                            </tr>
                            {rows.map((r, idx) => (
                              <tr key={`${gi}-${idx}`} style={{ background: idx % 2 ? "rgba(237,233,254,0.45)" : "#fff" }}>
                                {idx === 0 && (<td style={tdCell} rowSpan={span}>{safe(batchId)}</td>)}
                                {rawsSame ? (
                                  idx === 0 ? (<><td style={tdCell} rowSpan={span}>{safe(rows[0].rawName)}</td><td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].origProdDate))}</td><td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].origExpDate))}</td><td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].openedDate))}</td><td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].bestBefore))}</td><td style={tdCell} rowSpan={span}>{safe(rows[0].rawWeight) ? `${rows[0].rawWeight} kg` : ""}</td></>) : null
                                ) : (<><td style={tdCell}>{safe(r.rawName)}</td><td style={tdCell}>{formatDMY(safe(r.origProdDate))}</td><td style={tdCell}>{formatDMY(safe(r.origExpDate))}</td><td style={tdCell}>{formatDMY(safe(r.openedDate))}</td><td style={tdCell}>{formatDMY(safe(r.bestBefore))}</td><td style={tdCell}>{safe(r.rawWeight) ? `${r.rawWeight} kg` : ""}</td></>)}
                                {finalsSame ? (
                                  idx === 0 ? (<><td style={tdCell} rowSpan={span}>{safe(rows[0].finalName)}</td><td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].finalProdDate))}</td><td style={tdCell} rowSpan={span}>{formatDMY(safe(rows[0].finalExpDate))}</td><td style={tdCell} rowSpan={span}>{safe(rows[0].finalWeight) ? `${rows[0].finalWeight} kg` : ""}</td></>) : null
                                ) : (<><td style={tdCell}>{safe(r.finalName)}</td><td style={tdCell}>{formatDMY(safe(r.finalProdDate))}</td><td style={tdCell}>{formatDMY(safe(r.finalExpDate))}</td><td style={tdCell}>{safe(r.finalWeight) ? `${r.finalWeight} kg` : ""}</td></>)}
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      editRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}><input type="text" value={r.batchId || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], batchId:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="text" value={r.rawName || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], rawName:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="date" value={r.origProdDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], origProdDate:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="date" value={r.origExpDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], origExpDate:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="date" value={r.openedDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], openedDate:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="date" value={r.bestBefore || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], bestBefore:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="number" step="0.01" min="0" value={r.rawWeight || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], rawWeight:e.target.value}; return n;})} style={inputStyle} placeholder="e.g., 2.50"/></td>
                          <td style={tdCell}><input type="text" value={r.finalName || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalName:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="date" value={r.finalProdDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalProdDate:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="date" value={r.finalExpDate || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalExpDate:e.target.value}; return n;})} style={inputStyle}/></td>
                          <td style={tdCell}><input type="number" step="0.01" min="0" value={r.finalWeight || ""} onChange={(e)=>setEditRows(p=>{const n=[...p]; n[idx]={...n[idx], finalWeight:e.target.value}; return n;})} style={inputStyle} placeholder="e.g., 1.20"/></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "2px solid #c7d2fe", fontSize: 12, color: "#0b1f4d", lineHeight: 1.6 }}>
                <strong>Note:</strong>
                <span style={{ marginInlineStart: 4 }}>The raw materials used for the preparation and the final product details should be recorded in the <strong>"Traceability Record Form"</strong>.</span>
              </div>

              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 320px", minWidth: 300 }}>
                  <strong>Checked by:</strong>
                  {!editing ? (
                    <span style={{ display: "inline-block", minWidth: 260, borderBottom: "2px solid #c7d2fe", lineHeight: "1.8", textAlign: "left" }}>
                      <SignatureName name={safe(record.payload?.checkedBy)} underline={false} />
                    </span>
                  ) : (
                    <input value={editCheckedBy} onChange={(e) => setEditCheckedBy(e.target.value)} style={{ border: "none", borderBottom: "2px solid #c7d2fe", padding: "4px 6px", outline: "none", minWidth: 260 }} />
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 320px", minWidth: 300, justifyContent: "flex-end" }}>
                  <strong>Verified by:</strong>
                  {!editing ? (
                    <span style={{ display: "inline-block", minWidth: 260, borderBottom: "2px solid #c7d2fe", lineHeight: "1.8", textAlign: "left" }}>
                      <SignatureName name={safe(record.payload?.verifiedBy)} underline={false} />
                    </span>
                  ) : (
                    <input value={editVerifiedBy} onChange={(e) => setEditVerifiedBy(e.target.value)} style={{ border: "none", borderBottom: "2px solid #c7d2fe", padding: "4px 6px", outline: "none", minWidth: 260 }} />
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
