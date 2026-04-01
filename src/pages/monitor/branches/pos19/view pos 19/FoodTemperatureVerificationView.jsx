// src/pages/monitor/branches/pos19/view pos 19/FoodTemperatureVerificationView.jsx
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

const TYPE     = "pos19_food_temperature_verification";
const BRANCH   = "WARQA KITCHEN";                   // ✅ مطابق للإدخال
const FORM_REF = "FS-HACCP/KITCH/FTV/13";           // ✅ مطابق للإدخال

const PROCESS_TYPES = [
  { value: "cooking",   label: "Cooking",   limit: "≥ 75°C" },
  { value: "cooling",   label: "Cooling",   limit: "≤ 5°C in 4h" },
  { value: "reheating", label: "Reheating", limit: "≥ 75°C" },
  { value: "chilled",   label: "Chilled",   limit: "≤ 5°C" },
  { value: "frozen",    label: "Frozen",    limit: "≤ -18°C" },
];

/* ── Helpers ── */
const safe      = (v) => v ?? "";
const getId     = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const formatDMY = (iso) => { if (!iso) return iso; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };

function emptyRow() {
  return {
    date: "", time: "", foodItem: "",
    processType: "cooking", targetTemp: "≥ 75°C",
    actualTemp: "", result: "",
    correctiveAction: "", checkedBy: "",
  };
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
  whiteSpace: "nowrap",
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
const inputSt = {
  width: "100%", boxSizing: "border-box",
  border: `1px solid ${C.border}`, borderRadius: 6,
  padding: "4px 6px", fontSize: 11,
};

export default function FoodTemperatureVerificationView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate]         = useState(todayDubai);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [record, setRecord]     = useState(null);
  const [editRows, setEditRows] = useState([emptyRow()]);
  const [editing, setEditing]   = useState(false);
  const [allDates, setAllDates] = useState([]);
  const [expandedYears, setExpandedYears]   = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const gridStyle = useMemo(() => ({ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }), []);

  const colDefs = useMemo(() => [
    <col key="date"    style={{ width: 100 }} />,
    <col key="time"    style={{ width: 80  }} />,
    <col key="food"    style={{ width: 170 }} />,
    <col key="process" style={{ width: 110 }} />,
    <col key="target"  style={{ width: 110 }} />,
    <col key="actual"  style={{ width: 100 }} />,
    <col key="result"  style={{ width: 85  }} />,
    <col key="ca"      style={{ width: 190 }} />,
    <col key="chk"     style={{ width: 120 }} />,
  ], []);

  /* ── Fetch ── */
  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?${new URLSearchParams({type:TYPE})}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const uniq = Array.from(new Set(
        list.map(r=>r?.payload).filter(p=>p?.branch===BRANCH&&p?.reportDate).map(p=>p.reportDate)
      )).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);
      if (uniq.length) {
        const [y,m]=uniq[0].split("-");
        setExpandedYears(p=>({...p,[y]:true}));
        setExpandedMonths(p=>({...p,[`${y}-${m}`]:true}));
        if (!uniq.includes(date)) setDate(uniq[0]);
      }
    } catch(e) { console.warn("fetchAllDates:", e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null); setEditRows([emptyRow()]);
    try {
      const res = await fetch(`${API_BASE}/api/reports?${new URLSearchParams({type:TYPE})}`, { cache:"no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d) || null;
      setRecord(match);
      const entries = match?.payload?.entries;
      setEditRows(Array.isArray(entries)&&entries.length ? JSON.parse(JSON.stringify(entries)) : [emptyRow()]);
      setEditing(false);
    } catch(e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  /* ── Edit helpers ── */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      const entries = record?.payload?.entries;
      setEditRows(Array.isArray(entries)&&entries.length ? JSON.parse(JSON.stringify(entries)) : [emptyRow()]);
      setEditing(false); return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    const entries = record?.payload?.entries;
    setEditRows(Array.isArray(entries)&&entries.length ? JSON.parse(JSON.stringify(entries)) : [emptyRow()]);
    setEditing(true);
  }

  function addEditRow()    { setEditRows(p => [...p, emptyRow()]); }
  function removeEditRow(i){ setEditRows(p => p.length===1 ? p : p.filter((_,idx)=>idx!==i)); }
  function updateEditRow(i, key, val) {
    setEditRows(p => {
      const n=[...p];
      if (key==="processType") {
        const found = PROCESS_TYPES.find(pt=>pt.value===val);
        n[i] = { ...n[i], [key]:val, targetTemp: found?found.limit:"" };
      } else { n[i]={...n[i],[key]:val}; }
      return n;
    });
  }

  /* ── Save ── */
  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    for (const r of editRows) {
      if (r.result==="Fail" && !String(r.correctiveAction||"").trim()) {
        alert("صف نتيجته Fail بدون Corrective Action."); return;
      }
    }
    const rid = getId(record);
    const payload = { ...(record?.payload||{}), branch:BRANCH, formRef:FORM_REF, reportDate:record?.payload?.reportDate, entries:editRows, savedAt:Date.now() };
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

  /* ── Delete ── */
  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure?")) return;
    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted"); await fetchAllDates();
      setDate(allDates.find(d=>d!==record?.payload?.reportDate)||todayDubai);
    } catch(e) { alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  /* ── Export / Import ── */
  function exportJSON() {
    if (!record) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));
    a.download = `FoodTempVerification_${record?.payload?.reportDate||date}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const p = record?.payload || {};
      const entries = Array.isArray(p.entries) ? p.entries : [];
      const NAVY="1E3A5F", SKY="DBEAFE", HEAD="EFF6FF";
      const border = { top:{style:"thin",color:{argb:NAVY}}, left:{style:"thin",color:{argb:NAVY}}, bottom:{style:"thin",color:{argb:NAVY}}, right:{style:"thin",color:{argb:NAVY}} };
      const HEADERS = ["Date","Time","Food Item","Process Type","Target Temp","Actual Temp (°C)","Result","Corrective Action","Checked by"];
      const lastCol = HEADERS.length;

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("FoodTempLog", { views:[{showGridLines:false}], pageSetup:{paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1} });
      ws.columns = [{width:12},{width:10},{width:22},{width:14},{width:14},{width:14},{width:10},{width:26},{width:14}];

      // Title
      ws.mergeCells(1,1,1,lastCol);
      Object.assign(ws.getCell(1,1), { value:`${BRANCH} — Food Temperature Verification Log`, alignment:{horizontal:"center",vertical:"middle"}, font:{bold:true,size:14,color:{argb:NAVY}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:SKY}} });
      ws.getRow(1).height = 26;

      // Meta
      ws.mergeCells(2,1,2,4); ws.mergeCells(2,5,2,7); ws.mergeCells(2,8,2,lastCol);
      const ms = { alignment:{vertical:"middle"}, font:{size:11}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:"F8FAFF"}}, border };
      Object.assign(ws.getCell(2,1), { value:`Form Ref: ${FORM_REF}  |  Branch: ${BRANCH}`, ...ms });
      Object.assign(ws.getCell(2,5), { value:`Date: ${safe(p.reportDate)}`, ...ms });
      Object.assign(ws.getCell(2,8), { value:`Classification: ${safe(p.classification||"Official")}  |  Section: ${safe(p.section)}`, ...ms });
      ws.getRow(2).height = 20;

      // Critical limits band
      ws.mergeCells(3,1,3,lastCol);
      Object.assign(ws.getCell(3,1), { value:"Critical Limits: Cooking/Reheating ≥ 75°C  |  Chilled ≤ 5°C  |  Frozen ≤ -18°C  |  Cooling ≤ 5°C within 4 hrs", alignment:{horizontal:"center",vertical:"middle"}, font:{bold:true,color:{argb:NAVY}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:SKY}}, border });

      // Table header
      HEADERS.forEach((txt,i) => {
        Object.assign(ws.getCell(4,i+1), { value:txt, alignment:{horizontal:"center",vertical:"middle",wrapText:true}, font:{bold:true,color:{argb:NAVY}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:HEAD}}, border });
      });
      ws.getRow(4).height = 30;

      // Data
      if (!entries.length) {
        for(let c=1;c<=lastCol;c++) Object.assign(ws.getCell(5,c),{value:"—",alignment:{horizontal:"center"},border});
      } else {
        entries.forEach((e,idx) => {
          const rIdx=5+idx, fill=idx%2===0?"FFFFFF":"F8FAFF";
          const vals=[e.date||"",e.time||"",e.foodItem||"",e.processType||"",e.targetTemp||"",e.actualTemp||"",e.result||"",e.correctiveAction||"",e.checkedBy||""];
          vals.forEach((val,ci) => {
            const cell=ws.getCell(rIdx,ci+1);
            Object.assign(cell,{value:val,alignment:{horizontal:"center",vertical:"middle",wrapText:true},border,fill:{type:"pattern",pattern:"solid",fgColor:{argb:fill}}});
            if(val==="Pass") cell.font={bold:true,color:{argb:"166534"}};
            if(val==="Fail") cell.font={bold:true,color:{argb:"B91C1C"}};
          });
          ws.getRow(rIdx).height=20;
        });
      }

      // Footer
      const footIdx=5+entries.length+1;
      ws.mergeCells(footIdx,1,footIdx,5); ws.mergeCells(footIdx,6,footIdx,lastCol);
      Object.assign(ws.getCell(footIdx,1), { value:`Checked by: ${safe(p.checkedBy)}`, alignment:{horizontal:"left",vertical:"middle"}, font:{bold:true}, border });
      Object.assign(ws.getCell(footIdx,6), { value:`Verified by: ${safe(p.verifiedBy)}`, alignment:{horizontal:"left",vertical:"middle"}, font:{bold:true}, border });
      ws.getRow(footIdx).height=20;

      const a=document.createElement("a");
      a.href=URL.createObjectURL(new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
      a.download=`FoodTempVerification_${p.reportDate||date}.xlsx`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch(e) { console.error(e); alert("⚠️ فشل إنشاء XLSX.\n"+(e?.message||e)); }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const payload = (JSON.parse(await file.text()))?.payload;
      if (!payload?.reportDate) throw new Error("missing reportDate");
      payload.formRef = FORM_REF; payload.branch = BRANCH;
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reporter:"pos19",type:TYPE,payload}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Imported"); setDate(payload.reportDate);
      await fetchAllDates(); await fetchRecord(payload.reportDate);
    } catch(e) { alert("❌ Invalid JSON or save failed"); }
    finally { if(fileInputRef.current) fileInputRef.current.value=""; setLoading(false); }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const node=reportRef.current;
    const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");
    const pageW=pdf.internal.pageSize.getWidth(), pageH=pdf.internal.pageSize.getHeight();
    const margin=20, headerH=50;
    const addHeader=()=>{
      pdf.setFillColor(30,58,95); pdf.rect(0,0,pageW,headerH,"F");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(15); pdf.setTextColor(255,255,255);
      pdf.text(`${BRANCH} | Food Temperature Verification Log — ${record?.payload?.reportDate||date}`, pageW/2, 30, {align:"center"});
      pdf.setTextColor(0,0,0);
    };
    addHeader();
    const usableW=pageW-margin*2, ratio=usableW/canvas.width;
    let ypx=0;
    while(ypx<canvas.height){
      const sliceH=Math.min(canvas.height-ypx,(pageH-headerH-10-margin)/ratio);
      const part=document.createElement("canvas"); part.width=canvas.width; part.height=sliceH;
      part.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);
      pdf.addImage(part.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);
      ypx+=sliceH;
      if(ypx<canvas.height){pdf.addPage("a4","l"); addHeader();}
    }
    pdf.save(`FoodTempVerification_${record?.payload?.reportDate||date}.pdf`);
  }

  /* ── Grouping ── */
  const grouped = useMemo(() => {
    const out={};
    for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}
    for(const y of Object.keys(out)) out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort()]));
    return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));
  },[allDates]);

  const toggleYear  = y     => setExpandedYears(p  => ({...p,[y]:!p[y]}));
  const toggleMonth = (y,m) => setExpandedMonths(p => ({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));

  const entries = record?.payload?.entries || [];

  /* ── UI ── */
  return (
    <div style={{ background:C.gray50, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.gray700, direction:"ltr" }}>

      {/* ── Top bar ── */}
      <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.navyLight} 100%)`, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderRadius:"12px 12px 0 0", flexWrap:"wrap" }}>
        <div>
          <div style={{ color:C.white, fontWeight:800, fontSize:17, letterSpacing:.3 }}>Food Temperature Verification Log</div>
          <div style={{ color:"#93c5fd", fontSize:12, marginTop:2 }}>{BRANCH} — View Mode</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={toggleEdit}   style={actionBtn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"✏️ Edit"}</button>
          {editing && <>
            <button onClick={addEditRow} style={actionBtn("#16a34a")}>+ Row</button>
            <button onClick={saveEdit}   style={actionBtn("#10b981")}>💾 Save</button>
          </>}
          <button onClick={handleDelete} style={actionBtn(C.red)}>🗑 Delete</button>
          <button onClick={exportXLSX}   style={actionBtn("#0ea5e9", !entries.length)} disabled={!entries.length}>📊 XLSX</button>
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
          {loading && <div style={{textAlign:"center",padding:40,color:C.gray400}}><div style={{fontSize:28,marginBottom:8}}>⏳</div>Loading…</div>}
          {err     && <div style={{background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:8,padding:12,color:C.red,fontSize:13}}>{err}</div>}

          {!loading && !err && !record && (
            <div style={{textAlign:"center",padding:48,background:C.gray50,borderRadius:10,border:`2px dashed ${C.gray200}`}}>
              <div style={{fontSize:36,marginBottom:10}}>🌡️</div>
              <div style={{fontWeight:700,fontSize:15,color:C.gray700}}>No report for this date</div>
              <div style={{fontSize:12,color:C.gray400,marginTop:4}}>Select a date from the tree on the left</div>
            </div>
          )}

          {record && (
            <div ref={reportRef}>

              {/* ── Info cards ── */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
                {[
                  ["📅 Date",           safe(record.payload?.reportDate)],
                  ["🏢 Branch",          BRANCH],
                  ["📋 Form Ref.",       FORM_REF],
                  ["🏷 Classification",  safe(record.payload?.classification||"Official")],
                ].map(([label,val])=>(
                  <div key={label} style={{background:C.accentBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
                    <div style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.navy,wordBreak:"break-all"}}>{val||"—"}</div>
                  </div>
                ))}
              </div>

              {/* Section */}
              {record.payload?.section && (
                <div style={{background:C.tealBg,border:`1px solid #99f6e4`,borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:12,color:C.teal,fontWeight:600}}>
                  Section: {record.payload.section}
                </div>
              )}

              {/* ── Legend band ── */}
              <div style={{background:`linear-gradient(90deg,${C.navy},${C.navyLight})`,borderRadius:"8px 8px 0 0",padding:"9px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:6}}>
                <span style={{color:C.white,fontWeight:800,fontSize:13}}>Food Temperature Verification</span>
                <span style={{color:"#93c5fd",fontSize:11}}>Cooking/Reheating ≥ 75°C &nbsp;|&nbsp; Chilled ≤ 5°C &nbsp;|&nbsp; Frozen ≤ -18°C &nbsp;|&nbsp; Cooling ≤ 5°C / 4hrs</span>
              </div>

              {/* ── Table ── */}
              <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",marginBottom:14}}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Date</th>
                      <th style={thCell}>Time</th>
                      <th style={thCell}>Food Item</th>
                      <th style={thCell}>Process{"\n"}Type</th>
                      <th style={thCell}>Target{"\n"}Temp</th>
                      <th style={thCell}>Actual{"\n"}Temp (°C)</th>
                      <th style={thCell}>Result{"\n"}(Pass/Fail)</th>
                      <th style={thCell}>Corrective{"\n"}Action</th>
                      <th style={thCell}>Checked{"\n"}by</th>
                      {editing && <th style={thCell}>—</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      entries.length ? entries.map((r,idx) => {
                        const td = idx%2===0 ? tdCell : tdAlt;
                        const isPass=r.result==="Pass", isFail=r.result==="Fail";
                        return (
                          <tr key={idx}>
                            <td style={td}>{safe(r.date)}</td>
                            <td style={td}>{safe(r.time)}</td>
                            <td style={{...td,textAlign:"left",fontWeight:600}}>{safe(r.foodItem)}</td>
                            <td style={td}>{safe(r.processType)}</td>
                            <td style={td}>{safe(r.targetTemp)}</td>
                            <td style={{...td, background:isFail?"#fee2e2":td.background, color:isFail?C.red:C.gray700, fontWeight:isFail?700:400}}>
                              {safe(r.actualTemp)}{r.actualTemp?"°C":""}
                            </td>
                            <td style={{...td, background:isPass?"#dcfce7":isFail?"#fee2e2":td.background, color:isPass?C.green:isFail?C.red:C.gray700, fontWeight:r.result?700:400}}>
                              {safe(r.result)}
                            </td>
                            <td style={{...td,textAlign:"left",fontSize:11}}>{safe(r.correctiveAction)}</td>
                            <td style={td}>{safe(r.checkedBy)}</td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={9} style={{...tdCell,color:C.gray400,padding:20}}>— No data —</td></tr>
                      )
                    ) : (
                      editRows.map((r,i) => {
                        const isFail=r.result==="Fail", isPass=r.result==="Pass";
                        return (
                          <tr key={i} style={{background:i%2===0?C.white:"#f8faff"}}>
                            <td style={tdCell}><input type="date" value={r.date||""} onChange={e=>updateEditRow(i,"date",e.target.value)} style={inputSt}/></td>
                            <td style={tdCell}><input type="time" value={r.time||""} onChange={e=>updateEditRow(i,"time",e.target.value)} style={inputSt}/></td>
                            <td style={tdCell}><input value={r.foodItem||""} onChange={e=>updateEditRow(i,"foodItem",e.target.value)} style={inputSt} placeholder="Food item"/></td>
                            <td style={tdCell}>
                              <select value={r.processType||""} onChange={e=>updateEditRow(i,"processType",e.target.value)} style={inputSt}>
                                {PROCESS_TYPES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
                              </select>
                            </td>
                            <td style={tdCell}><input value={r.targetTemp||""} onChange={e=>updateEditRow(i,"targetTemp",e.target.value)} style={inputSt}/></td>
                            <td style={tdCell}>
                              <input type="number" step="0.1" value={r.actualTemp||""} onChange={e=>updateEditRow(i,"actualTemp",e.target.value)}
                                style={{...inputSt,background:isFail?"#fee2e2":C.white}} placeholder="°C"/>
                            </td>
                            <td style={tdCell}>
                              <select value={r.result||""} onChange={e=>updateEditRow(i,"result",e.target.value)}
                                style={{...inputSt,background:isPass?"#dcfce7":isFail?"#fee2e2":C.white,color:isPass?C.green:isFail?C.red:C.gray700,fontWeight:r.result?700:400}}>
                                <option value=""/><option value="Pass">Pass</option><option value="Fail">Fail</option>
                              </select>
                            </td>
                            <td style={tdCell}>
                              <input value={r.correctiveAction||""} onChange={e=>updateEditRow(i,"correctiveAction",e.target.value)}
                                placeholder={isFail?"⚠️ Required":"If any"}
                                style={{...inputSt,background:isFail?"#fff7ed":C.white}}/>
                            </td>
                            <td style={tdCell}><input value={r.checkedBy||""} onChange={e=>updateEditRow(i,"checkedBy",e.target.value)} style={inputSt}/></td>
                            <td style={{...tdCell,padding:4}}>
                              <button onClick={()=>removeEditRow(i)} disabled={editRows.length===1}
                                style={{background:editRows.length===1?"#e5e7eb":"#fee2e2",color:editRows.length===1?C.gray400:C.red,border:"none",borderRadius:6,width:28,height:28,cursor:editRows.length===1?"not-allowed":"pointer",fontWeight:700,fontSize:16}}>
                                ×
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

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