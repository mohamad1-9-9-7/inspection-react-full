// src/pages/monitor/branches/pos19/pos19_views/OilQualityMonitoringView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_oil_quality_monitoring";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/OIL/04";

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg, color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontWeight:700, cursor:"pointer" });
const formatDMY = (iso) => { if (!iso) return iso; const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
const hasVal = (o) => Object.values(o||{}).some(v=>String(v||"").trim()!=="");
function emptyRow() { return { date:"", result:"", action:"", checkedBy:"" }; }

export default function OilQualityMonitoringView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai   = useMemo(()=>{ try{return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dubai"});}catch{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;} },[]);

  const [date,setDate]                     = useState(todayDubai);
  const [loading,setLoading]               = useState(false);
  const [err,setErr]                       = useState("");
  const [record,setRecord]                 = useState(null);
  const [editRows,setEditRows]             = useState([emptyRow()]);
  const [editing,setEditing]               = useState(false);
  const [editSection,setEditSection]       = useState("");
  const [editVerifiedBy,setEditVerifiedBy] = useState("");
  const [editRevDate,setEditRevDate]       = useState("");
  const [editRevNo,setEditRevNo]           = useState("");
  const [allDates,setAllDates]             = useState([]);
  const [expandedYears,setExpandedYears]   = useState({});
  const [expandedMonths,setExpandedMonths] = useState({});

  const thCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", whiteSpace:"pre-line", fontWeight:700, background:"#f5f8ff", color:"#0b1f4d" };
  const tdCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", verticalAlign:"middle" };
  const inputStyle = { width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" };

  const colDefs = useMemo(()=>[<col key="date" style={{width:160}}/>,<col key="res" style={{width:420}}/>,<col key="act" style={{width:360}}/>,<col key="chk" style={{width:180}}/>],[]);

  async function fetchAllDates(){
    try{
      const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});const data=await res.json();const list=Array.isArray(data)?data:data?.data??[];
      const uniq=Array.from(new Set(list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate).map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);if(uniq.length){const[y,m]=uniq[0].split("-");setExpandedYears(p=>({...p,[y]:true}));setExpandedMonths(p=>({...p,[`${y}-${m}`]:true}));}
      if(!uniq.includes(date)&&uniq.length)setDate(uniq[0]);
    }catch(e){console.warn(e);}
  }

  async function fetchRecord(d=date){
    setLoading(true);setErr("");setRecord(null);
    try{
      const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});const data=await res.json();const list=Array.isArray(data)?data:data?.data??[];
      const match=list.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d)||null;
      setRecord(match);
      const rows=Array.from({length:Math.max(1,match?.payload?.entries?.length||1)},(_,i)=>match?.payload?.entries?.[i]||emptyRow());
      setEditRows(rows);setEditSection(match?.payload?.section||"");setEditVerifiedBy(match?.payload?.verifiedBy||"");setEditRevDate(match?.payload?.revDate||"");setEditRevNo(match?.payload?.revNo||"");setEditing(false);
    }catch(e){console.error(e);setErr("Failed to fetch data.");}finally{setLoading(false);}
  }

  useEffect(()=>{fetchAllDates();},[]);
  useEffect(()=>{if(date)fetchRecord(date);},[date]);

  const askPass=(label="")=>(window.prompt(`${label}\nEnter password:`)||"")==="9999";

  function toggleEdit(){
    if(editing){const rows=Array.from({length:Math.max(1,record?.payload?.entries?.length||1)},(_,i)=>record?.payload?.entries?.[i]||emptyRow());setEditRows(rows);setEditSection(record?.payload?.section||"");setEditVerifiedBy(record?.payload?.verifiedBy||"");setEditRevDate(record?.payload?.revDate||"");setEditRevNo(record?.payload?.revNo||"");setEditing(false);return;}
    if(!askPass("Enable edit mode"))return alert("❌ Wrong password");setEditing(true);
  }

  async function saveEdit(){
    if(!askPass("Save changes"))return alert("❌ Wrong password");if(!record)return;
    const rid=getId(record);const cleaned=editRows.filter(hasVal);
    const payload={...(record?.payload||{}),branch:BRANCH,reportDate:record?.payload?.reportDate,entries:cleaned,section:editSection,verifiedBy:editVerifiedBy,revDate:editRevDate,revNo:editRevNo,savedAt:Date.now()};
    try{setLoading(true);if(rid){try{await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});}catch(e){console.warn(e);}}
    const r=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!r.ok)throw new Error();alert("✅ Changes saved");setEditing(false);await fetchRecord(payload.reportDate);await fetchAllDates();}
    catch(e){console.error(e);alert("❌ Saving failed.");}finally{setLoading(false);}
  }

  async function handleDelete(){
    if(!record)return;if(!askPass("Delete confirmation"))return alert("❌ Wrong password");if(!window.confirm("Are you sure?"))return;
    const rid=getId(record);if(!rid)return alert("⚠️ Missing id.");
    try{setLoading(true);const res=await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});if(!res.ok)throw new Error();alert("✅ Deleted");await fetchAllDates();setDate(allDates.find(d=>d!==record?.payload?.reportDate)||todayDubai);}
    catch(e){alert("❌ Delete failed.");}finally{setLoading(false);}
  }

  function exportJSON(){if(!record)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));a.download=`POS19_OilQuality_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);}

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rows=(p.entries||[]).filter(hasVal);
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("OilQuality");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      ws.columns=[{key:"c_date",width:18},{key:"c_res",width:60},{key:"c_act",width:46},{key:"c_chk",width:22}];
      ws.mergeCells(1,1,1,4);const r1=ws.getCell(1,1);r1.value=`POS 19 | Oil Quality Monitoring Form — ${FORM_REF}`;r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      [["Form Ref:",FORM_REF],["Section:",p.section||""],["Classification:",p.classification||"Official"],["Date:",p.reportDate||""]].forEach(([label,val],i)=>{const r=ws.getRow(2+i);r.getCell(1).value=label;r.getCell(1).font={bold:true};r.getCell(2).value=val;r.height=18;});
      const hr=ws.getRow(7);hr.values=["Date","Evaluation Results","Corrective Action","Checked by"];hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=24;
      let rIdx=8;rows.forEach(e=>{ws.getRow(rIdx).values=[e?.date||"",e?.result||"",e?.action||"",e?.checkedBy||""];ws.getRow(rIdx).eachCell(cell=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;});ws.getRow(rIdx).height=20;rIdx++;});
      rIdx+=1;[["Verified by:",p.verifiedBy||""],["Rev.Date:",p.revDate||""],["Rev.No:",p.revNo||""]].forEach(([label,val],i)=>{const c=i*2+1;const lc=ws.getCell(rIdx,c);const vc=ws.getCell(rIdx,c+1);lc.value=label;lc.font={bold:true};lc.alignment={horizontal:"left",vertical:"middle"};vc.value=val;vc.alignment={horizontal:"left",vertical:"middle"};lc.border=vc.border=border;});
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_OilQuality_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current)return;const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("p","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=24,headerH=60;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(14);pdf.text(`POS 19 | Oil Quality Monitoring — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","p");drawH();}}
    pdf.save(`POS19_OilQuality_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){
    if(!file)return;try{const payload=JSON.parse(await file.text())?.payload||JSON.parse(await file.text());if(!payload?.reportDate)throw new Error("Missing reportDate");setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok)throw new Error();alert("✅ Imported");setDate(payload.reportDate);await fetchAllDates();await fetchRecord(payload.reportDate);}
    catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}
  }

  const grouped=useMemo(()=>{const out={};for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}for(const y of Object.keys(out))out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort((a,b)=>a.localeCompare(b))]));return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));}, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));
  const rowsToShow=(record?.payload?.entries||[]).filter(hasVal);

  return (
    <div style={{background:"#fff",border:"1px solid #dbe3f4",borderRadius:12,padding:16,color:"#0b1f4d",direction:"ltr"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:18}}>Oil Quality Monitoring — View (POS 19)</div>
        <div style={{marginInlineStart:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={toggleEdit} style={btn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"Edit (password)"}</button>
          {editing&&<button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!rowsToShow.length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{...btn("#059669"),display:"inline-block"}}>Import JSON<input ref={fileInputRef} type="file" accept="application/json" onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}}/></label>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:12}}>
        <div style={{border:"1px solid #e5e7eb",borderRadius:10,padding:10,background:"#fafafa"}}>
          <div style={{fontWeight:800,marginBottom:8}}>📅 Date Tree</div>
          <div style={{maxHeight:380,overflowY:"auto"}}>
            {Object.keys(grouped).length?Object.entries(grouped).map(([year,months])=>{const yOpen=!!expandedYears[year];return(<div key={year} style={{marginBottom:8}}>
              <button onClick={()=>toggleYear(year)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",cursor:"pointer",fontWeight:800}}><span>Year {year}</span><span>{yOpen?"▾":"▸"}</span></button>
              {yOpen&&Object.entries(months).map(([month,days])=>{const key=`${year}-${month}`;const mOpen=!!expandedMonths[key];return(<div key={key} style={{marginTop:6,marginLeft:8}}>
                <button onClick={()=>toggleMonth(year,month)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontWeight:700}}><span>Month {month}</span><span>{mOpen?"▾":"▸"}</span></button>
                {mOpen&&<ul style={{listStyle:"none",padding:"6px 2px 0 2px",margin:0}}>{days.map(d=>(<li key={d} style={{marginBottom:6}}><button onClick={()=>setDate(d)} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,border:"1px solid #d1d5db",background:d===date?"#2563eb":"#fff",color:d===date?"#fff":"#111827",fontWeight:700,cursor:"pointer"}}>{formatDMY(d)}</button></li>))}</ul>}
              </div>);})}
            </div>);})<div style={{color:"#6b7280"}}>No available dates.</div>}
          </div>
        </div>
        <div style={{minWidth:0}}>
          {loading&&<p>Loading…</p>}{err&&<p style={{color:"#b91c1c"}}>{err}</p>}
          {!loading&&!err&&!record&&<div style={{padding:12,border:"1px dashed #9ca3af",borderRadius:8,textAlign:"center"}}>No report for this date.</div>}
          {record&&(<div style={{overflowX:"auto",overflowY:"hidden"}}><div ref={reportRef} style={{width:"max-content"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8,fontSize:12,minWidth:900}}>
              <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
              <div><strong>Form Ref:</strong> {FORM_REF}</div>
              <div><strong>Classification:</strong> {safe(record.payload?.classification||"Official")}</div>
              <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
            </div>
            <div style={{border:"1px solid #1f3b70",borderBottom:"none"}}><div style={{...thCell,background:"#e9f0ff"}}>RECORD</div></div>
            <table style={{width:"max-content",borderCollapse:"collapse",tableLayout:"fixed",fontSize:12}}>
              <colgroup>{colDefs}</colgroup>
              <thead><tr><th style={thCell}>Date</th><th style={thCell}>Evaluation Results</th><th style={thCell}>Corrective Action</th><th style={thCell}>Checked by</th></tr></thead>
              <tbody>
                {!editing?(rowsToShow.length?rowsToShow.map((r,idx)=>(<tr key={idx}><td style={tdCell}>{formatDMY(safe(r.date))}</td><td style={tdCell}>{safe(r.result)}</td><td style={tdCell}>{safe(r.action)}</td><td style={tdCell}>{safe(r.checkedBy)}</td></tr>)):null):(
                  editRows.map((r,idx)=>(<tr key={idx}>
                    <td style={tdCell}><input type="date" value={r.date||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],date:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.result||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],result:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.action||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],action:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.checkedBy||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],checkedBy:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                  </tr>))
                )}
              </tbody>
            </table>
            <div style={{marginTop:12,width:"max-content"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                <strong>Verified by:</strong>
                {!editing?(<span style={{display:"inline-block",minWidth:260,borderBottom:"2px solid #1f3b70",lineHeight:"1.8"}}>{safe(record.payload?.verifiedBy)}</span>):(<input value={editVerifiedBy} onChange={e=>setEditVerifiedBy(e.target.value)} style={{border:"none",borderBottom:"2px solid #1f3b70",padding:"4px 6px",outline:"none",fontSize:12,color:"#0b1f4d"}}/>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginTop:12,fontSize:12}}>
                <div><strong>Section:</strong> {!editing?safe(record.payload?.section):(<input value={editSection} onChange={e=>setEditSection(e.target.value)} style={inputStyle}/>)}</div>
                <div><strong>Rev. Date:</strong> {!editing?safe(record.payload?.revDate):(<input type="date" value={editRevDate} onChange={e=>setEditRevDate(e.target.value)} style={inputStyle}/>)}</div>
                <div><strong>Rev. No:</strong> {!editing?safe(record.payload?.revNo):(<input value={editRevNo} onChange={e=>setEditRevNo(e.target.value)} style={inputStyle}/>)}</div>
              </div>
            </div>
          </div></div>)}
        </div>
      </div>
    </div>
  );
}
