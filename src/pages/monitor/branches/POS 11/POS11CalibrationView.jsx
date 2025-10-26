// src/pages/monitor/branches/POS 11/POS11CalibrationView.jsx
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

const TYPE   = "pos11_calibration_log";
const BRANCH = "POS 11";

const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" });
const formatDMY = (iso) => {
  if (!iso) return iso;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
const isFilledRow = (r={}) =>
  ["equipmentName","calibrationDate","nextDueDate","photoBase64"].some(k => String(r?.[k]||"").trim() !== "");

// row model (matches input)
function emptyRow(today) {
  return { equipmentName:"", calibrationDate: today, nextDueDate:"", photoBase64:"" };
}

export default function POS11CalibrationView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA",{ timeZone:"Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);

  // edit mode
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState([emptyRow(todayDubai)]);
  const [allDates, setAllDates] = useState([]);

  // ===== Image preview (lightbox)
  const [preview, setPreview] = useState({ open:false, src:"" });
  const openPreview = (src) => setPreview({ open:true, src: src || "" });
  const closePreview = () => setPreview({ open:false, src:"" });
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") closePreview(); };
    if (preview.open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [preview.open]);

  // accordion
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key: YYYY-MM

  // styles
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
  const inputStyle = { width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px" };

  const colDefs = useMemo(() => ([
    <col key="#" style={{ width: 50 }} />,
    <col key="equip" style={{ width: 260 }} />,
    <col key="photo" style={{ width: 220 }} />,
    <col key="calib" style={{ width: 150 }} />,
    <col key="next" style={{ width: 150 }} />,
  ]), []);

  // ===== Header (matches input form)
  const tdHeaderLogo = {
    border: "1px solid #9aa4ae",
    width: 120,
    textAlign: "center",
    verticalAlign: "middle",
    background: "#fff",
  };
  const tdHeader = {
    border: "1px solid #9aa4ae",
    padding: "6px 8px",
    background: "#f5f9ff",
    verticalAlign: "middle",
    fontSize: "0.9rem",
  };

  /* ===== fetch dates ===== */
  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const filtered = list.map(r=>r?.payload).filter(p=>p && p.branch===BRANCH && p.reportDate);
      const uniq = Array.from(new Set(filtered.map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);
      if (uniq.length) {
        const [y,m] = uniq[0].split("-");
        setExpandedYears((p)=>({ ...p, [y]: true }));
        setExpandedMonths((p)=>({ ...p, [`${y}-${m}`]: true }));
      }
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch(e) {
      console.warn("Dates fetch failed", e);
    }
  }

  /* ===== fetch one ===== */
  async function fetchRecord(d=date) {
    setLoading(true); setErr(""); setRecord(null);
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find(r=>r?.payload?.branch===BRANCH && r?.payload?.reportDate===d) || null;
      setRecord(match);

      const rows = Array.from({ length: Math.max(1, match?.payload?.entries?.length||1) }, (_,i)=> {
        const e = match?.payload?.entries?.[i];
        return e ? {
          equipmentName: e.equipmentName||"",
          calibrationDate: e.calibrationDate||todayDubai,
          nextDueDate: e.nextDueDate||"",
          photoBase64: e.photoBase64||"",
        } : emptyRow(todayDubai);
      });
      setEditRows(rows);
      setEditing(false);
    } catch(e){
      console.error(e);
      setErr("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchAllDates(); }, []);
  useEffect(()=>{ if (date) fetchRecord(date); }, [date]);

  /* ===== edit / save / delete ===== */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      // cancel -> reset buffers
      const rows = Array.from({ length: Math.max(1, record?.payload?.entries?.length||1) }, (_,i)=> {
        const e = record?.payload?.entries?.[i];
        return e ? {
          equipmentName: e.equipmentName||"",
          calibrationDate: e.calibrationDate||todayDubai,
          nextDueDate: e.nextDueDate||"",
          photoBase64: e.photoBase64||"",
        } : emptyRow(todayDubai);
      });
      setEditRows(rows);
      setEditing(false);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditing(true);
  }

  const setRow = (i, k, v) => setEditRows(prev => { const n=[...prev]; n[i] = { ...n[i], [k]: v }; return n; });
  const addRow = () => setEditRows(prev => [...prev, emptyRow(todayDubai)]);
  const removeRow = (i) => setEditRows(prev => prev.filter((_,idx)=>idx!==i));

  const setRowImage = (i, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setRow(i, "photoBase64", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;

    const rid = getId(record);
    const cleaned = (editRows||[]).filter(isFilledRow);

    if (!cleaned.length) return alert("⚠️ Please keep at least one filled row.");

    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: cleaned,
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      if (rid) {
        try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method:"DELETE" }); }
        catch (e) { console.warn("DELETE (ignored)", e); }
      }

      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ reporter:"pos11", type: TYPE, payload }),
      });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      alert("✅ Changes saved");
      setEditing(false);
      await fetchRecord(payload.reportDate);
      await fetchAllDates();
    } catch(e) {
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
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method:"DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted");
      await fetchAllDates();
      const next = allDates.find((d)=>d!==record?.payload?.reportDate) || todayDubai;
      setDate(next);
    } catch(e) {
      console.error(e);
      alert("❌ Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ===== export / import ===== */
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS11_Calibration_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // exceljs loader
  async function loadExcelJS() {
    try {
      const m = await import("exceljs/dist/exceljs.min.js");
      return m?.default ?? m;
    } catch(_) {}
    try {
      const m2 = await import("exceljs");
      return m2?.default ?? m2;
    } catch(_) {}
    throw new Error("Failed to load ExcelJS");
  }
  async function resolveSaveAs() {
    const mod = await import("file-saver");
    return mod?.saveAs || mod?.default?.saveAs || mod?.default || mod;
  }

  function fallbackCSV(p) {
    const headers = ["#","Equipment","Image Attached","Calibration Date","Next Due Date"];
    const rows = (p.entries||[]).filter(isFilledRow).map((e,idx)=>[
      String(idx+1),
      e?.equipmentName??"",
      e?.photoBase64 ? "Yes" : "No",
      e?.calibrationDate??"",
      e?.nextDueDate??"",
    ]);
    const csv = [headers, ...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\r\n");
    const blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS11_Calibration_${p.reportDate || date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = await loadExcelJS();
      const saveAs = await resolveSaveAs();

      const p = record?.payload || {};
      const rows = Array.isArray(p.entries) ? p.entries.filter(isFilledRow) : [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Calibration");

      const lightBlue = "D9E2F3";
      const headBlue  = "DCE6F1";
      const borderThin = { style:"thin", color:{ argb:"1F3B70" } };

      // title (5 cols)
      ws.mergeCells(1,1,1,5);
      const r1 = ws.getCell(1,1);
      r1.value = "POS 11 | Calibration Log";
      r1.alignment = { horizontal:"center", vertical:"middle" };
      r1.font = { size:14, bold:true };
      r1.fill = { type:"pattern", pattern:"solid", fgColor:{ argb: lightBlue } };
      ws.getRow(1).height = 26;

      // meta
      const meta = [
        ["Branch:", p.branch||BRANCH],
        ["Report Date:", p.reportDate||""],
      ];
      meta.forEach((pair, i) => {
        const rowIdx = 2+i;
        ws.mergeCells(rowIdx, 3, rowIdx, 5);
        const c = ws.getCell(rowIdx, 3);
        c.value = `${pair[0]} ${pair[1]}`;
        c.alignment = { horizontal:"right", vertical:"middle" };
        ws.getRow(rowIdx).height = 18;
      });

      ws.columns = [{ width:6 }, { width:32 }, { width:18 }, { width:18 }, { width:18 }];

      const header = ["#","Equipment","Image Attached","Calibration Date","Next Due Date"];
      const hr = ws.getRow(5); hr.values = header;
      hr.eachCell((cell)=>{
        cell.font = { bold:true };
        cell.alignment = { horizontal:"center", vertical:"middle", wrapText:true };
        cell.fill = { type:"pattern", pattern:"solid", fgColor:{ argb: headBlue } };
        cell.border = { top:borderThin, left:borderThin, bottom:borderThin, right:borderThin };
      });
      hr.height = 24;

      let rowIdx = 6;
      rows.forEach((e, i) => {
        ws.getRow(rowIdx).values = [
          i+1,
          e?.equipmentName || "",
          e?.photoBase64 ? "Yes" : "No",
          e?.calibrationDate || "",
          e?.nextDueDate || "",
        ];
        ws.getRow(rowIdx).eachCell((cell)=>{
          cell.alignment = { horizontal:"center", vertical:"middle", wrapText:true };
          cell.border = { top:borderThin, left:borderThin, bottom:borderThin, right:borderThin };
        });
        ws.getRow(rowIdx).height = 20;
        rowIdx++;
      });

      const buf = await wb.xlsx.writeBuffer({ useStyles:true, useSharedStrings:true });
      saveAs(new Blob([buf], { type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `POS11_Calibration_${p.reportDate || date}.xlsx`);
    } catch(err) {
      console.error("[XLSX export error]", err);
      try {
        const p = record?.payload || {};
        fallbackCSV(p);
        alert("⚠️ XLSX export failed, CSV exported instead.\n" + (err?.message || err));
      } catch(e2) {
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
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ reporter:"pos11", type: TYPE, payload }),
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

  /* ===== pdf export ===== */
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

    pdf.setFillColor(247, 249, 252);
    pdf.rect(0, 0, pageW, headerH, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`POS 11 | Calibration Log (${record?.payload?.reportDate || date})`, pageW/2, 28, { align:"center" });

    const usableW = pageW - margin*2;
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
        pdf.text(`POS 11 | Calibration Log (${record?.payload?.reportDate || date})`, pageW/2, 28, { align:"center" });
      }
    }

    pdf.save(`POS11_Calibration_${record?.payload?.reportDate || date}.pdf`);
  }

  /* ===== date tree grouping ===== */
  const groupedDates = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y,m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    for (const y of Object.keys(out))
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a],[b])=>Number(a)-Number(b))
          .map(([m,arr]) => [m, arr.sort((a,b)=>a.localeCompare(b))])
      );
    return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));
  }, [allDates]);

  const toggleYear  = (y)    => setExpandedYears((p)=>({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p)=>({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>
          Calibration Log — View (POS 11)
        </div>

        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <>
              <button onClick={()=>setEditRows(p=>[...p, emptyRow(todayDubai)])} style={btn("#10b981")}>Add Row</button>
              <button onClick={saveEdit} style={btn("#059669")}>Save Changes</button>
            </>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>

          <button onClick={exportXLSX} disabled={!record} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
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

      {/* layout */}
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        {/* date tree */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(groupedDates).length ? (
              Object.entries(groupedDates).map(([year, months]) => {
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

        {/* content */}
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
                {/* ===== Header identical to input (screenshot) ===== */}
                <table style={{ width:"100%", minWidth:820, borderCollapse:"collapse", marginBottom:8 }}>
                  <tbody>
                    <tr>
                      <td rowSpan={3} style={tdHeaderLogo}>
                        <div style={{ fontWeight:900, color:"#a00", lineHeight:1.1 }}>
                          AL<br/>MAWASHI
                        </div>
                      </td>
                      <td style={tdHeader}><b>Document Title:</b> Calibration Log</td>
                      <td style={tdHeader}><b>Document No:</b> FS-QM/REC/CAL</td>
                    </tr>
                    <tr>
                      <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
                      <td style={tdHeader}><b>Revision No:</b> 0</td>
                    </tr>
                    <tr>
                      <td style={tdHeader}><b>Area:</b> {BRANCH}</td>
                      <td style={tdHeader}><b> </b></td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ background:"#dde3e9", border:"1px solid #9aa4ae", padding:"6px 4px", textAlign:"center", fontWeight:800, marginBottom:10 }}>
                  CALIBRATION — {BRANCH}
                </div>

                {/* meta strip */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, marginBottom:8, fontSize:12, minWidth: 820 }}>
                  <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                  <div><strong>Report Date:</strong> {safe(record.payload?.reportDate)}</div>
                  <div><strong>Total Items:</strong> {record.payload?.entries?.filter?.(isFilledRow)?.length || 0}</div>
                </div>

                {/* table */}
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>#</th>
                      <th style={thCell}>Equipment</th>
                      <th style={thCell}>Photo</th>
                      <th style={thCell}>Calibration Date</th>
                      <th style={thCell}>Next Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      (record.payload?.entries || []).filter(isFilledRow).map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>{idx+1}</td>
                          <td style={tdCell}>{safe(r.equipmentName)}</td>
                          <td style={tdCell}>
                            {r.photoBase64 ? (
                              <img
                                src={r.photoBase64}
                                alt="equipment"
                                style={{ width:64, height:64, objectFit:"cover", borderRadius:6, border:"1px solid #e5e7eb", cursor:"zoom-in" }}
                                onClick={()=>openPreview(r.photoBase64)}
                              />
                            ) : <span style={{ color:"#6b7280" }}>—</span>}
                          </td>
                          <td style={tdCell}>{formatDMY(safe(r.calibrationDate))}</td>
                          <td style={tdCell}>{formatDMY(safe(r.nextDueDate))}</td>
                        </tr>
                      ))
                    ) : (
                      editRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>
                            <div style={{ display:"flex", gap:6, alignItems:"center", justifyContent:"center" }}>
                              <span>{idx+1}</span>
                              <button onClick={()=>removeRow(idx)} style={{ ...btn("#ef4444"), padding:"2px 8px" }} title="Remove">✖</button>
                            </div>
                          </td>
                          <td style={tdCell}>
                            <input value={r.equipmentName||""} onChange={(e)=>setRow(idx,"equipmentName",e.target.value)} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
                              <input type="file" accept="image/*" onChange={(e)=>setRowImage(idx, e.target.files?.[0] || null)} />
                              {r.photoBase64 ? (
                                <>
                                  <img
                                    src={r.photoBase64}
                                    alt="preview"
                                    style={{ width:48, height:48, objectFit:"cover", borderRadius:6, border:"1px solid #e5e7eb", cursor:"zoom-in" }}
                                    onClick={()=>openPreview(r.photoBase64)}
                                  />
                                  <button onClick={()=>setRow(idx,"photoBase64","")} style={{ ...btn("#ef4444"), padding:"2px 8px" }}>Clear</button>
                                </>
                              ) : <small style={{ color:"#6b7280" }}>No image</small>}
                            </div>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.calibrationDate||""} onChange={(e)=>setRow(idx,"calibrationDate",e.target.value)} style={inputStyle}/>
                          </td>
                          <td style={tdCell}>
                            <input type="date" value={r.nextDueDate||""} onChange={(e)=>setRow(idx,"nextDueDate",e.target.value)} style={inputStyle}/>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Preview */}
      {preview.open && (
        <div
          onClick={closePreview}
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
            display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999, padding:16
          }}
          title="Click to close"
        >
          <img
            src={preview.src}
            alt="preview"
            style={{ maxWidth:"92vw", maxHeight:"92vh", borderRadius:10, boxShadow:"0 10px 30px rgba(0,0,0,0.6)" }}
            onClick={(e)=>e.stopPropagation()}
          />
          <button
            onClick={closePreview}
            style={{ position:"fixed", top:20, right:20, ...btn("#ef4444"), padding:"8px 12px" }}
          >
            Close ✕
          </button>
        </div>
      )}
    </div>
  );
}
