// src/pages/monitor/branches/pos19/view pos 19/DailyCleaningChecklistView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReportHeader from "../_shared/ReportHeader";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE   = "pos19_daily_cleaning";
const BRANCH = "POS 19";

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

/* ── Helpers ── */
const safe      = (v) => v ?? "";
const getId     = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const formatDMY = (iso) => { if (!iso) return iso; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };

function emptyEntry() {
  const base = { cleanerName: "", time: "", correctiveAction: "" };
  COLS.forEach((c) => (base[c.key] = ""));
  return base;
}

/* ── الخارق 1 Design Tokens ── */
const C = {
  navy:      "#1e3a5f",
  navyLight: "#2d5a8e",
  accent:    "#3b82f6",
  accentBg:  "#eff6ff",
  teal:      "#0d9488",
  tealBg:    "#f0fdfa",
  red:       "#dc2626",
  green:     "#16a34a",
  gray50:    "#f9fafb",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray700:   "#374151",
  white:     "#ffffff",
  border:    "#dbeafe",
};

const actionBtn = (bg, disabled = false) => ({
  background: disabled ? C.gray200 : bg,
  color: disabled ? C.gray400 : C.white,
  border: "none", borderRadius: 8, padding: "7px 13px",
  fontWeight: 700, fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "opacity .15s", whiteSpace: "nowrap",
});

const thCell = {
  border: `1px solid ${C.navy}`, padding: "7px 5px",
  textAlign: "center", whiteSpace: "pre-line",
  fontWeight: 700, fontSize: 11,
  background: "#dbeafe", color: C.navy, lineHeight: 1.35,
};
const tdCell = {
  border: `1px solid #bfdbfe`, padding: "6px 5px",
  textAlign: "center", verticalAlign: "middle",
  fontSize: 12, background: C.white,
};
const tdAlt = { ...tdCell, background: "#f8faff" };

export default function DailyCleaningChecklistView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate]               = useState(todayDubai);
  const [loading, setLoading]         = useState(false);
  const [err, setErr]                 = useState("");
  const [record, setRecord]           = useState(null);
  const [editEntries, setEditEntries] = useState([emptyEntry()]);
  const [editing, setEditing]         = useState(false);
  const [allDates, setAllDates]       = useState([]);
  const [expandedYears, setExpandedYears]   = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const gridStyle = useMemo(() => ({ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }), []);

  const colDefs = useMemo(() => {
    const arr = [<col key="name" style={{ width:170 }}/>, <col key="time" style={{ width:120 }}/>];
    COLS.forEach((_,i) => arr.push(<col key={`c${i}`} style={{ width:110 }}/>));
    arr.push(<col key="action" style={{ width:210 }}/>);
    return arr;
  }, []);

  /* ── Fetch ── */
  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?${new URLSearchParams({type:TYPE})}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const uniq = Array.from(new Set(
        list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate).map(p=>p.reportDate)
      )).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);
      if (uniq.length) {
        const [y,m] = uniq[0].split("-");
        setExpandedYears(p=>({...p,[y]:true}));
        setExpandedMonths(p=>({...p,[`${y}-${m}`]:true}));
        if (!uniq.includes(date)) setDate(uniq[0]);
      }
    } catch(e) { console.warn("fetchAllDates:", e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null); setEditEntries([emptyEntry()]);
    try {
      const res = await fetch(`${API_BASE}/api/reports?${new URLSearchParams({type:TYPE})}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d) || null;
      setRecord(match);
      const entries = match?.payload?.entries?.length ? JSON.parse(JSON.stringify(match.payload.entries)) : [emptyEntry()];
      setEditEntries(entries);
      setEditing(false);
    } catch(e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  /* ── Edit helpers ── */
  const updateEditEntry = (index, key, val) =>
    setEditEntries(prev => prev.map((r,i) => i===index ? {...r,[key]:val} : r));
  const addEditRow    = () => setEditEntries(prev => [...prev, emptyEntry()]);
  const removeEditRow = (index) => setEditEntries(prev => prev.length===1 ? prev : prev.filter((_,i)=>i!==index));

  /* ── Edit / Save / Delete ── */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      setEditing(false);
      setEditEntries(record?.payload?.entries?.length ? JSON.parse(JSON.stringify(record.payload.entries)) : [emptyEntry()]);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditEntries(record?.payload?.entries?.length ? JSON.parse(JSON.stringify(record.payload.entries)) : [emptyEntry()]);
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    const rid = getId(record);
    const payload = { ...(record?.payload||{}), branch:BRANCH, reportDate:record?.payload?.reportDate, entries:editEntries, savedAt:Date.now() };
    try {
      setLoading(true);
      if (rid) { try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"}); } catch {} }
      const res = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reporter:"pos19",type:TYPE,payload}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Changes saved"); setEditing(false);
      await fetchRecord(payload.reportDate); await fetchAllDates();
    } catch(e) { alert("❌ Saving failed.\n"+String(e?.message||e)); }
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
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted"); await fetchAllDates();
      setDate(allDates.find(d=>d!==record?.payload?.reportDate) || todayDubai);
    } catch(e) { alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  /* ── Export / Import ── */
  function exportJSON() {
    if (!record) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));
    a.download = `POS19_DailyCleaning_${record?.payload?.reportDate||date}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const FileSaver = await import("file-saver");
      const p = record?.payload || {};
      const entries = p?.entries || [];
      const NAVY = "1E3A5F"; const SKY = "DBEAFE"; const HEAD = "EFF6FF";
      const border = { top:{style:"thin",color:{argb:NAVY}}, left:{style:"thin",color:{argb:NAVY}}, bottom:{style:"thin",color:{argb:NAVY}}, right:{style:"thin",color:{argb:NAVY}} };

      const COL_HEADERS = ["Cleaner Name","Time",...COLS.map(c=>c.label.replace(/\n/g," ")),"Corrective Action"];
      const lastCol = COL_HEADERS.length;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("DailyCleaning", { views:[{showGridLines:false}], pageSetup:{paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1} });
      ws.columns = [{width:18},{width:10},...COLS.map(()=>({width:16})),{width:22}];

      // Title
      ws.mergeCells(1,1,1,lastCol);
      Object.assign(ws.getCell(1,1), { value:"POS 19 — Daily Cleaning Checklist (Butchery)", alignment:{horizontal:"center",vertical:"middle"}, font:{bold:true,size:14,color:{argb:NAVY}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:SKY}} });
      ws.getRow(1).height = 26;

      // Meta
      ws.mergeCells(2,1,2,5); ws.mergeCells(2,6,2,9); ws.mergeCells(2,10,2,lastCol);
      const ms = { alignment:{vertical:"middle"}, font:{size:11}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:"F8FAFF"}}, border };
      Object.assign(ws.getCell(2,1),  { value:`Branch: ${safe(p.branch||BRANCH)}`, ...ms });
      Object.assign(ws.getCell(2,6),  { value:`Date: ${safe(p.reportDate)}`, ...ms });
      Object.assign(ws.getCell(2,10), { value:`Classification: ${safe(p.classification||"Official")}`, ...ms });
      ws.getRow(2).height = 20;

      // AREA band
      ws.mergeCells(3,1,3,lastCol);
      Object.assign(ws.getCell(3,1), { value:"AREA — Daily Cleaning", alignment:{horizontal:"center",vertical:"middle"}, font:{bold:true,color:{argb:NAVY}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:SKY}}, border });
      // Legend
      ws.mergeCells(4,1,4,lastCol);
      Object.assign(ws.getCell(4,1), { value:"(LEGEND: (√) – For Satisfactory  &  (✗) – For Needs Improvement)", alignment:{horizontal:"center",vertical:"middle"}, font:{size:10,italic:true}, border });

      // Table header
      COL_HEADERS.forEach((txt,i) => {
        Object.assign(ws.getCell(5,i+1), { value:txt, alignment:{horizontal:"center",vertical:"middle",wrapText:true}, font:{bold:true,color:{argb:NAVY}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:HEAD}}, border });
      });
      ws.getRow(5).height = 30;

      // Data rows
      if (!entries.length) {
        for(let c=1;c<=lastCol;c++) Object.assign(ws.getCell(6,c),{value:"—",alignment:{horizontal:"center"},border});
      } else {
        entries.forEach((e,idx) => {
          const rIdx = 6 + idx;
          const rowFill = idx%2===0 ? "FFFFFF" : "F8FAFF";
          const dataRow = [e.cleanerName||"", e.time||"", ...COLS.map(c=>(e[c.key]??"")), e.correctiveAction||""];
          dataRow.forEach((val,ci) => {
            const cell = ws.getCell(rIdx, ci+1);
            cell.value = val; cell.alignment = {horizontal:"center",vertical:"middle",wrapText:true}; cell.border = border;
            cell.fill = {type:"pattern",pattern:"solid",fgColor:{argb:rowFill}};
            if (val==="√") { cell.font={bold:true,color:{argb:"166534"}}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCFCE7"}}; }
            if (val==="✗") { cell.font={bold:true,color:{argb:"B91C1C"}}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FEE2E2"}}; }
          });
          ws.getRow(rIdx).height = 22;
        });
      }

      // Footer
      const footIdx = 6 + entries.length + 1;
      ws.mergeCells(footIdx,1,footIdx,Math.floor(lastCol/2));
      ws.mergeCells(footIdx,Math.floor(lastCol/2)+1,footIdx,lastCol);
      Object.assign(ws.getCell(footIdx,1), { value:`Checked by: ${safe(p.checkedBy)}`, alignment:{horizontal:"left",vertical:"middle"}, font:{bold:true}, border });
      Object.assign(ws.getCell(footIdx,Math.floor(lastCol/2)+1), { value:`Verified by: ${safe(p.verifiedBy)}`, alignment:{horizontal:"left",vertical:"middle"}, font:{bold:true}, border });
      ws.getRow(footIdx).height = 20;

      const buf = await wb.xlsx.writeBuffer();
      FileSaver.saveAs(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}), `POS19_DailyCleaning_${p.reportDate||date}.xlsx`);
    } catch(e) { console.error(e); alert("⚠️ فشل تصدير XLSX."); }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const payload = (JSON.parse(await file.text()))?.payload;
      if (!payload?.reportDate) throw new Error("missing reportDate");
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reporter:"pos19",type:TYPE,payload}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Imported and saved"); setDate(payload.reportDate);
      await fetchAllDates(); await fetchRecord(payload.reportDate);
    } catch(e) { alert("❌ Invalid JSON or save failed"); }
    finally { if(fileInputRef.current) fileInputRef.current.value=""; setLoading(false); }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const node = reportRef.current;
    const canvas = await html2canvas(node, { scale:2, windowWidth:node.scrollWidth, windowHeight:node.scrollHeight });
    const pdf = new jsPDF("l","pt","a4");
    const pageW=pdf.internal.pageSize.getWidth(), pageH=pdf.internal.pageSize.getHeight();
    const margin=20, headerH=50;
    const addHeader = () => {
      pdf.setFillColor(30,58,95); pdf.rect(0,0,pageW,headerH,"F");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(15); pdf.setTextColor(255,255,255);
      pdf.text(`POS 19 | Daily Cleaning Checklist (Butchery) — ${record?.payload?.reportDate||date}`, pageW/2, 30, {align:"center"});
      pdf.setTextColor(0,0,0);
    };
    addHeader();
    const usableW=pageW-margin*2, ratio=usableW/canvas.width;
    let ypx=0;
    while(ypx<canvas.height) {
      const sliceH=Math.min(canvas.height-ypx,(pageH-headerH-10-margin)/ratio);
      const part=document.createElement("canvas"); part.width=canvas.width; part.height=sliceH;
      part.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);
      pdf.addImage(part.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);
      ypx+=sliceH;
      if(ypx<canvas.height){pdf.addPage("a4","l"); addHeader();}
    }
    pdf.save(`POS19_DailyCleaning_${record?.payload?.reportDate||date}.pdf`);
  }

  /* ── Grouping ── */
  const grouped = useMemo(() => {
    const out={};
    for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}
    for(const y of Object.keys(out)) out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort()]));
    return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));
  }, [allDates]);

  const toggleYear  = y     => setExpandedYears(p  => ({...p,[y]:!p[y]}));
  const toggleMonth = (y,m) => setExpandedMonths(p => ({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));

  const inputSt = { width:"100%", border:`1px solid ${C.border}`, borderRadius:6, padding:"4px 6px", fontSize:11, boxSizing:"border-box" };

  /* ── UI ── */
  return (
    <div style={{ background:C.gray50, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.gray700, direction:"ltr" }}>

      {/* ── Top bar ── */}
      <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderRadius:"12px 12px 0 0", flexWrap:"wrap" }}>
        <div>
          <div style={{ color:C.white, fontWeight:800, fontSize:17, letterSpacing:.3 }}>Daily Cleaning Checklist (Butchery)</div>
          <div style={{ color:"#93c5fd", fontSize:12, marginTop:2 }}>POS 19 — View Mode</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={toggleEdit}   style={actionBtn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"✏️ Edit"}</button>
          {editing && <button onClick={saveEdit} style={actionBtn("#10b981")}>💾 Save</button>}
          <button onClick={handleDelete} style={actionBtn(C.red)}>🗑 Delete</button>
          <button onClick={exportXLSX}   style={actionBtn("#0ea5e9", !record?.payload?.entries?.length)} disabled={!record?.payload?.entries?.length}>📊 XLSX</button>
          <button onClick={exportJSON}   style={actionBtn("#0284c7", !record)} disabled={!record}>📄 JSON</button>
          <button onClick={exportPDF}    style={actionBtn(C.gray700)}>🖨 PDF</button>
          <label style={{...actionBtn("#059669"), display:"inline-block", cursor:"pointer"}}>
            📥 Import
            <input ref={fileInputRef} type="file" accept="application/json" onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}}/>
          </label>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:0, background:C.white, borderRadius:"0 0 12px 12px", border:`1px solid ${C.border}`, borderTop:"none" }}>

        {/* ── Date tree ── */}
        <div style={{ borderRight:`1px solid ${C.border}`, padding:14, background:C.gray50 }}>
          <div style={{ fontWeight:800, fontSize:13, marginBottom:10, color:C.navy, letterSpacing:.3 }}>📅 Date Tree</div>
          <div style={{ maxHeight:520, overflowY:"auto" }}>
            {Object.keys(grouped).length ? Object.entries(grouped).map(([year,months]) => {
              const yOpen=!!expandedYears[year];
              return (
                <div key={year} style={{marginBottom:8}}>
                  <button onClick={()=>toggleYear(year)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"7px 10px",borderRadius:8,border:`1px solid ${C.border}`,background:yOpen?C.accentBg:C.white,cursor:"pointer",fontWeight:800,fontSize:12,color:C.navy }}>
                    <span>📁 {year}</span><span>{yOpen?"▾":"▸"}</span>
                  </button>
                  {yOpen && Object.entries(months).map(([month,days]) => {
                    const key=`${year}-${month}`, mOpen=!!expandedMonths[key];
                    return (
                      <div key={key} style={{marginTop:5,marginLeft:10}}>
                        <button onClick={()=>toggleMonth(year,month)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"6px 10px",borderRadius:7,border:`1px solid ${C.gray200}`,background:mOpen?"#f0f9ff":C.white,cursor:"pointer",fontWeight:700,fontSize:11,color:C.navyLight }}>
                          <span>📂 {new Date(`${year}-${month}-01`).toLocaleString("en",{month:"long"})} {year}</span>
                          <span>{mOpen?"▾":"▸"}</span>
                        </button>
                        {mOpen && (
                          <div style={{paddingTop:5}}>
                            {days.map(d=>(
                              <button key={d} onClick={()=>setDate(d)} style={{ display:"block",width:"100%",textAlign:"left",padding:"7px 12px",borderRadius:7,border:`1px solid ${d===date?C.accent:C.gray200}`,background:d===date?C.accent:C.white,color:d===date?C.white:C.gray700,fontWeight:d===date?700:500,fontSize:11,cursor:"pointer",marginBottom:4 }}>
                                {formatDMY(d)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            }) : <div style={{color:C.gray400,fontSize:12}}>No dates available.</div>}
          </div>
        </div>

        {/* ── Report content ── */}
        <div style={{padding:18}}>
          {loading && (
            <div style={{textAlign:"center",padding:40,color:C.gray400}}>
              <div style={{fontSize:28,marginBottom:8}}>⏳</div>Loading…
            </div>
          )}
          {err && <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:12,color:C.red,fontSize:13}}>{err}</div>}

          {!loading && !err && !record && (
            <div style={{textAlign:"center",padding:48,background:C.gray50,borderRadius:10,border:`2px dashed ${C.gray200}`}}>
              <div style={{fontSize:36,marginBottom:10}}>📋</div>
              <div style={{fontWeight:700,fontSize:15,color:C.gray700}}>No report for this date</div>
              <div style={{fontSize:12,color:C.gray400,marginTop:4}}>Select a date from the tree on the left</div>
            </div>
          )}

          {record && (
            <div ref={reportRef}>

              {/* ── Info cards ── */}
              <ReportHeader
                title="Daily Cleaning Checklist (Butchery)"
                fields={[
                  { label: "Report Date",    value: safe(record.payload?.reportDate) },
                  { label: "Branch",         value: safe(record.payload?.branch) },
                  { label: "Classification", value: safe(record.payload?.classification||"Official") },
                ]}
              />

              {/* ── Legend band ── */}
              <div style={{background:`linear-gradient(90deg,${C.navy},${C.navyLight})`,borderRadius:"8px 8px 0 0",padding:"9px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:C.white,fontWeight:800,fontSize:13}}>AREA — Daily Cleaning</span>
                <span style={{color:"#93c5fd",fontSize:11}}>✔ Satisfactory &nbsp;|&nbsp; ✗ Needs Improvement</span>
              </div>

              {/* ── Table ── */}
              <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",marginBottom:14}}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Cleaner Name</th>
                      <th style={thCell}>Time</th>
                      {COLS.map(c=><th key={c.key} style={thCell}>{c.label}</th>)}
                      <th style={thCell}>CORRECTIVE{"\n"}ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      (record.payload?.entries||[]).map((entry,idx) => {
                        const td = idx%2===0 ? tdCell : tdAlt;
                        return (
                          <tr key={idx}>
                            <td style={{...td,textAlign:"left",fontWeight:600}}>{safe(entry?.cleanerName)}</td>
                            <td style={td}>{safe(entry?.time)}</td>
                            {COLS.map(c=>(
                              <td key={c.key} style={{
                                ...td,
                                background: entry?.[c.key]==="√"?"#dcfce7":entry?.[c.key]==="✗"?"#fee2e2":td.background,
                                color:      entry?.[c.key]==="√"?C.green:entry?.[c.key]==="✗"?C.red:C.gray700,
                                fontWeight: entry?.[c.key] ? 700 : 400, fontSize:14,
                              }}>
                                {safe(entry?.[c.key])}
                              </td>
                            ))}
                            <td style={{...td,textAlign:"left",fontSize:11}}>{safe(entry?.correctiveAction)}</td>
                          </tr>
                        );
                      })
                    ) : (
                      editEntries.map((entry,idx) => (
                        <tr key={idx} style={{background:idx%2===0?C.white:"#f8faff"}}>
                          <td style={tdCell}><input type="text" value={entry.cleanerName||""} onChange={e=>updateEditEntry(idx,"cleanerName",e.target.value)} style={inputSt}/></td>
                          <td style={tdCell}><input type="time" value={entry.time||""}         onChange={e=>updateEditEntry(idx,"time",e.target.value)}        style={inputSt}/></td>
                          {COLS.map(c=>(
                            <td key={c.key} style={tdCell}>
                              <select value={entry[c.key]||""} onChange={e=>updateEditEntry(idx,c.key,e.target.value)} style={{...inputSt,background:entry[c.key]==="√"?"#dcfce7":entry[c.key]==="✗"?"#fee2e2":"#fff"}} title="√ / ✗">
                                <option value=""/><option value="√">√</option><option value="✗">✗</option>
                              </select>
                            </td>
                          ))}
                          <td style={tdCell}><input type="text" value={entry.correctiveAction||""} onChange={e=>updateEditEntry(idx,"correctiveAction",e.target.value)} style={inputSt}/></td>
                          <td style={{...tdCell,padding:4}}>
                            <button onClick={()=>removeEditRow(idx)} disabled={editEntries.length===1}
                              style={{background:editEntries.length===1?"#e5e7eb":"#fee2e2",color:editEntries.length===1?C.gray400:C.red,border:"none",borderRadius:6,width:28,height:28,cursor:editEntries.length===1?"not-allowed":"pointer",fontWeight:700,fontSize:16}}>
                              ×
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Add row (edit mode) ── */}
              {editing && (
                <div style={{marginBottom:14}}>
                  <button onClick={addEditRow} style={{background:C.accentBg,color:C.accent,border:`1px dashed ${C.accent}`,borderRadius:8,padding:"7px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>
                    + إضافة سطر
                  </button>
                </div>
              )}

              {/* ── Footer cards ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["👤 Checked by",  safe(record.payload?.checkedBy)],
                  ["✅ Verified by", safe(record.payload?.verifiedBy)],
                ].map(([label,val])=>(
                  <div key={label} style={{background:C.tealBg,border:`1px solid #99f6e4`,borderRadius:8,padding:"9px 14px"}}>
                    <div style={{fontSize:10,color:C.teal,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:2}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.navy}}>{val||"—"}</div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// انتهى الملف — تصميم الخارق 1