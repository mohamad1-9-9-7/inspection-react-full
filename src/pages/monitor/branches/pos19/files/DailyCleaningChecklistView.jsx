// src/pages/monitor/branches/pos19/pos19_views/DailyCleaningChecklistView.jsx
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

const TYPE     = "pos19_daily_cleaning";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/CLN/01";

const COLS = [
  { key: "floorWallsDrains",   label: "FLOOR/\nWALLS /\nDRAINS" },
  { key: "chillersFreezer",    label: "CHILLERS /\nFREEZER" },
  { key: "cookingArea",        label: "COOKING\nAREA" },
  { key: "preparationArea",    label: "PREPARATION\nAREA" },
  { key: "packingArea",        label: "PACKING\nAREA" },
  { key: "frontUnderCounters", label: "FRONT\n&UNDER\nCOUNTERS" },
  { key: "handWashingStation", label: "HAND\nWASHING\nSTATION" },
  { key: "equipments",         label: "EQUIPMENT\nS" },
  { key: "utensils",           label: "UTENSILS" },
  { key: "worktopTables",      label: "WORKTOP\nTABLES" },
  { key: "kitchenHoodFilters", label: "KITCHEN\nHOOD\nFILTERS" },
];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" });
const formatDMY = (iso) => { if (!iso) return iso; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

function emptyEntry() {
  const base = { cleanerName: "", time: "", correctiveAction: "" };
  COLS.forEach((c) => (base[c.key] = ""));
  return base;
}

export default function DailyCleaningChecklistView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate]                   = useState(todayDubai);
  const [loading, setLoading]             = useState(false);
  const [err, setErr]                     = useState("");
  const [record, setRecord]               = useState(null);
  const [editEntry, setEditEntry]         = useState(null);
  const [editing, setEditing]             = useState(false);
  const [allDates, setAllDates]           = useState([]);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const gridStyle = useMemo(() => ({ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 }), []);
  const thCell = { border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d" };
  const tdCell = { border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", verticalAlign: "middle" };
  const inputStyle = { width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px" };

  const colDefs = useMemo(() => {
    const arr = [<col key="name" style={{ width: 170 }} />, <col key="time" style={{ width: 120 }} />];
    COLS.forEach((_, i) => arr.push(<col key={`c${i}`} style={{ width: 110 }} />));
    arr.push(<col key="action" style={{ width: 210 }} />);
    return arr;
  }, []);

  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const filtered = list.map((r) => r?.payload).filter((p) => p && p.branch === BRANCH && p.reportDate);
      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);
      // Tree stays collapsed by default.
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) { console.warn(e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null); setEditEntry(null);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      setRecord(match);
      setEditEntry(match?.payload?.entries?.[0] ? JSON.parse(JSON.stringify(match.payload.entries[0])) : emptyEntry());
      setEditing(false);
    } catch (e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) { setEditing(false); setEditEntry(record?.payload?.entries?.[0] || emptyEntry()); return; }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditEntry(record?.payload?.entries?.[0] ? JSON.parse(JSON.stringify(record.payload.entries[0])) : emptyEntry());
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    const rid = getId(record);
    const payload = { ...(record?.payload || {}), branch: BRANCH, reportDate: record?.payload?.reportDate, entries: [editEntry || {}], savedAt: Date.now() };
    try {
      setLoading(true);
      if (rid) { try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" }); } catch (e) { console.warn(e); } }
      const postRes = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }) });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);
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
    const blob = new Blob([JSON.stringify({ type: TYPE, payload: record.payload }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `POS19_DailyCleaning_${record?.payload?.reportDate || date}.json`; a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const FileSaver = await import("file-saver");
      const p = record?.payload || {};
      const e = p?.entries?.[0] || {};
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("DailyCleaning");
      const borderThin = { style: "thin", color: { argb: "1F3B70" } };
      const border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      const COL_HEADERS = ["Cleaner Name", "Time", ...COLS.map(c => c.label.replace(/\n/g, " ")), "Corrective Action"];
      ws.columns = [{ width: 18 }, { width: 10 }, ...COLS.map(() => ({ width: 14 })), { width: 22 }];

      ws.mergeCells(1, 1, 1, COL_HEADERS.length);
      const r1 = ws.getCell(1, 1);
      r1.value = `POS 19 | Daily Cleaning Checklist (Butchery) — ${FORM_REF}`;
      r1.alignment = { horizontal: "center", vertical: "middle" }; r1.font = { size: 13, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E9F0FF" } };
      ws.getRow(1).height = 22;

      // Meta
      const metaData = [["Form Ref:", FORM_REF], ["Date:", p.reportDate || ""], ["Classification:", p.classification || "Official"], ["Branch:", BRANCH]];
      metaData.forEach(([label, val], i) => {
        ws.getCell(2 + i, 1).value = label; ws.getCell(2 + i, 1).font = { bold: true };
        ws.getCell(2 + i, 2).value = val; ws.getRow(2 + i).height = 18;
      });

      const headerRowIdx = 7;
      const hr = ws.getRow(headerRowIdx);
      hr.values = COL_HEADERS;
      hr.eachCell((cell) => { cell.font = { bold: true }; cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCE6F1" } }; cell.border = border; });
      hr.height = 28;

      const dataRow = [e.cleanerName || "", e.time || "", ...COLS.map(c => e[c.key] ?? ""), e.correctiveAction || ""];
      ws.getRow(headerRowIdx + 1).values = dataRow;
      ws.getRow(headerRowIdx + 1).eachCell((cell) => { cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true }; cell.border = border; });
      ws.getRow(headerRowIdx + 1).height = 22;

      const footIdx = headerRowIdx + 3;
      const footPairs = [["Checked by:", p.checkedBy || ""], ["Verified by:", p.verifiedBy || ""], ["Rev.Date:", p.revDate || ""], ["Rev.No:", p.revNo || ""]];
      let colPtr = 1;
      footPairs.forEach(([label, val]) => {
        const lc = ws.getCell(footIdx, colPtr++); const vc = ws.getCell(footIdx, colPtr++);
        lc.value = label; lc.font = { bold: true }; lc.alignment = { horizontal: "left", vertical: "middle" };
        vc.value = val; vc.alignment = { horizontal: "left", vertical: "middle" };
        lc.border = vc.border = border;
      });
      ws.getRow(footIdx).height = 20;

      const buf = await wb.xlsx.writeBuffer();
      FileSaver.saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `POS19_DailyCleaning_${p.reportDate || date}.xlsx`);
    } catch (err) { console.error(err); alert("⚠️ XLSX export failed."); }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const node = reportRef.current;
    const canvas = await html2canvas(node, { scale: 2, windowWidth: node.scrollWidth, windowHeight: node.scrollHeight });
    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20; const headerH = 50;
    pdf.setFillColor(233, 240, 255); pdf.rect(0, 0, pageW, headerH, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text(`POS 19 | Daily Cleaning Checklist (Butchery) — ${record?.payload?.reportDate || date}`, pageW / 2, 28, { align: "center" });
    const usableW = pageW - margin * 2;
    const availableH = pageH - (headerH + 10) - margin;
    const ratio = usableW / canvas.width;
    let ypx = 0;
    while (ypx < canvas.height) {
      const sliceH = Math.min(canvas.height - ypx, availableH / ratio);
      const partCanvas = document.createElement("canvas"); partCanvas.width = canvas.width; partCanvas.height = sliceH;
      partCanvas.getContext("2d").drawImage(canvas, 0, ypx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      pdf.addImage(partCanvas.toDataURL("image/png"), "PNG", margin, headerH + 10, usableW, sliceH * ratio);
      ypx += sliceH;
      if (ypx < canvas.height) {
        pdf.addPage("a4", "l"); pdf.setFillColor(233, 240, 255); pdf.rect(0, 0, pageW, headerH, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
        pdf.text(`POS 19 | Daily Cleaning Checklist (Butchery) — ${record?.payload?.reportDate || date}`, pageW / 2, 28, { align: "center" });
      }
    }
    pdf.save(`POS19_DailyCleaning_${record?.payload?.reportDate || date}.pdf`);
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text())?.payload || JSON.parse(await file.text());
      if (!payload?.reportDate) throw new Error("Missing reportDate");
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Imported and saved"); setDate(payload.reportDate);
      await fetchAllDates(); await fetchRecord(payload.reportDate);
    } catch (e) { console.error(e); alert("❌ Invalid JSON or save failed"); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; setLoading(false); }
  }

  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) { const [y, m] = d.split("-"); (out[y] ||= {}); (out[y][m] ||= []).push(d); }
    for (const y of Object.keys(out)) out[y] = Object.fromEntries(Object.entries(out[y]).sort(([a],[b]) => Number(b)-Number(a)).map(([m, arr]) => [m, arr.sort((a,b)=>b.localeCompare(a))]));
    return Object.fromEntries(Object.entries(out).sort(([a],[b]) => Number(b)-Number(a)));
  }, [allDates]);

  const toggleYear = (y) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>Daily Cleaning Checklist (Butchery) — View (POS 19)</div>
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>{editing ? "Cancel Edit" : "Edit (password)"}</button>
          {editing && <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!record?.payload?.entries?.length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{ ...btn("#059669"), display:"inline-block" }}>Import JSON<input ref={fileInputRef} type="file" accept="application/json" onChange={(e)=>importJSON(e.target.files?.[0])} style={{ display:"none" }} /></label>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        {/* Date Tree */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(grouped).length ? Object.entries(grouped).map(([year, months]) => {
              const yOpen = !!expandedYears[year];
              return (
                <div key={year} style={{ marginBottom:8 }}>
                  <button onClick={()=>toggleYear(year)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontWeight:800 }}>
                    <span>Year {year}</span><span>{yOpen ? "▾" : "▸"}</span>
                  </button>
                  {yOpen && Object.entries(months).map(([month, days]) => {
                    const key = `${year}-${month}`; const mOpen = !!expandedMonths[key];
                    return (
                      <div key={key} style={{ marginTop:6, marginLeft:8 }}>
                        <button onClick={()=>toggleMonth(year, month)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontWeight:700 }}>
                          <span>Month {month}</span><span>{mOpen ? "▾" : "▸"}</span>
                        </button>
                        {mOpen && <ul style={{ listStyle:"none", padding:"6px 2px 0 2px", margin:0 }}>
                          {days.map((d) => (
                            <li key={d} style={{ marginBottom:6 }}>
                              <button onClick={()=>setDate(d)} style={{ width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", background: d===date ? "#2563eb" : "#fff", color: d===date ? "#fff" : "#111827", fontWeight:700, cursor:"pointer" }}>
                                {formatDMY(d)}
                              </button>
                            </li>
                          ))}
                        </ul>}
                      </div>
                    );
                  })}
                </div>
              );
            }) : <div style={{ color:"#6b7280" }}>No available dates.</div>}
          </div>
        </div>

        {/* Report */}
        <div>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}
          {!loading && !err && !record && <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>No report for this date.</div>}
          {record && (
            <div ref={reportRef}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:8, fontSize:12 }}>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                <div><strong>Form Ref:</strong> {FORM_REF}</div>
                <div><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</div>
              </div>
              <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                <div style={{ ...thCell, background:"#e9f0ff" }}>AREA</div>
                <div style={{ fontSize:11, textAlign:"center", padding:"6px 0" }}><strong>(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)</strong></div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Cleaner Name</th>
                      <th style={thCell}>Time</th>
                      {COLS.map((c)=><th key={c.key} style={thCell}>{c.label}</th>)}
                      <th style={thCell}>CORRECTIVE{"\n"}ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      <tr>
                        <td style={tdCell}>{safe(record.payload?.entries?.[0]?.cleanerName)}</td>
                        <td style={tdCell}>{safe(record.payload?.entries?.[0]?.time)}</td>
                        {COLS.map((c)=><td key={c.key} style={tdCell}>{safe(record.payload?.entries?.[0]?.[c.key])}</td>)}
                        <td style={tdCell}>{safe(record.payload?.entries?.[0]?.correctiveAction)}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td style={tdCell}><input type="text" value={editEntry?.cleanerName||""} onChange={(e)=>setEditEntry((p)=>({...(p||{}),cleanerName:e.target.value}))} style={inputStyle} /></td>
                        <td style={tdCell}><input type="time" value={editEntry?.time||""} onChange={(e)=>setEditEntry((p)=>({...(p||{}),time:e.target.value}))} style={inputStyle} /></td>
                        {COLS.map((c)=>(
                          <td key={c.key} style={tdCell}>
                            <select value={editEntry?.[c.key]||""} onChange={(e)=>setEditEntry((p)=>({...(p||{}),[c.key]:e.target.value}))} style={inputStyle}>
                              <option value=""></option><option value="√">√</option><option value="✗">✗</option>
                            </select>
                          </td>
                        ))}
                        <td style={tdCell}><input type="text" value={editEntry?.correctiveAction||""} onChange={(e)=>setEditEntry((p)=>({...(p||{}),correctiveAction:e.target.value}))} style={inputStyle} /></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:12, fontSize:12 }}>
                <div><strong>Checked by:</strong> {safe(record.payload?.checkedBy)}</div>
                <div><strong>Verified by:</strong> {safe(record.payload?.verifiedBy)}</div>
                <div><strong>Rev.Date:</strong> {safe(record.payload?.revDate)}</div>
                <div><strong>Rev.No:</strong> {safe(record.payload?.revNo)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
