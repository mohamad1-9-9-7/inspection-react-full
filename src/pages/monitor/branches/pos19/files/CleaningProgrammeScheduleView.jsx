// src/pages/monitor/branches/pos19/pos19_views/CleaningProgrammeScheduleView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_cleaning_programme_schedule";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/CPS/12";

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 12px",fontWeight:700,cursor:"pointer" });
const formatDMY = (iso) => { if(!iso)return iso; const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1]}`:iso; };
const isFilledRow = (r={}) => Object.values(r).some(v=>String(v??"").trim()!=="");

function emptyRow(){const base={area:"",equipment:"",cleaningMethod:"",cleaningAgent:"",concentration:"",frequency:"Daily",responsiblePerson:"",remarks:""};DAYS.forEach(d=>(base[`day_${d}`]=""));return base;}

export default function CleaningProgrammeScheduleView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai   = useMemo(()=>{ try{return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dubai"});}catch{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;} },[]);

  const [date,setDate]                     = useState(todayDubai);
  const [loading,setLoading]               = useState(false);
  const [err,setErr]                       = useState("");
  const [record,setRecord]                 = useState(null);
  const [editRows,setEditRows]             = useState([]);
  const [editing,setEditing]               = useState(false);
  const [allDates,setAllDates]             = useState([]);
  const [expandedYears,setExpandedYears]   = useState({});
  const [expandedMonths,setExpandedMonths] = useState({});

  const thCell = {border:"1px solid #1f3b70",padding:"6px 4px",textAlign:"center",whiteSpace:"pre-line",fontWeight:700,background:"#f5f8ff",color:"#0b1f4d"};
  const tdCell = {border:"1px solid #1f3b70",padding:"6px 4px",textAlign:"center",verticalAlign:"middle"};
  const inputStyle = {width:"100%",border:"1px solid #c7d2fe",borderRadius:6,padding:"4px 6px"};

  async function fetchAllDates(){
    try{const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});const data=await res.json();const list=Array.isArray(data)?data:data?.data??[];
    const uniq=Array.from(new Set(list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate).map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
    setAllDates(uniq);
    // Tree stays collapsed by default.
    if(!uniq.includes(date)&&uniq.length)setDate(uniq[0]);}catch(e){console.warn(e);}
  }

  async function fetchRecord(d=date){
    setLoading(true);setErr("");setRecord(null);setEditRows([]);
    try{const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});const data=await res.json();const list=Array.isArray(data)?data:data?.data??[];
    const match=list.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d)||null;setRecord(match);
    const rows=match?.payload?.entries??[];setEditRows(rows.length?JSON.parse(JSON.stringify(rows)):[emptyRow()]);setEditing(false);}
    catch(e){console.error(e);setErr("Failed to fetch data.");}finally{setLoading(false);}
  }

  useEffect(()=>{fetchAllDates();},[]);useEffect(()=>{if(date)fetchRecord(date);},[date]);

  const askPass=(label="")=>(window.prompt(`${label}\nEnter password:`)||"")==="9999";

  function toggleEdit(){
    if(editing){const rows=record?.payload?.entries??[];setEditRows(rows.length?JSON.parse(JSON.stringify(rows)):[emptyRow()]);setEditing(false);return;}
    if(!askPass("Enable edit mode"))return alert("❌ Wrong password");setEditing(true);
  }

  async function saveEdit(){
    if(!askPass("Save changes"))return alert("❌ Wrong password");if(!record)return;
    const rid=getId(record);const cleaned=editRows.filter(isFilledRow);
    const payload={...(record?.payload||{}),branch:BRANCH,reportDate:record?.payload?.reportDate,entries:cleaned,savedAt:Date.now()};
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

  function exportJSON(){if(!record)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));a.download=`POS19_CleaningSchedule_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);}

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rows=(p.entries||[]).filter(isFilledRow);
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("CleaningSchedule");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS=["Area","Equipment/Surface","Cleaning Method","Cleaning Agent","Conc./Dilution","Frequency",...DAYS,"Responsible Person","Remarks"];
      ws.columns=[{width:18},{width:22},{width:24},{width:18},{width:14},{width:14},...DAYS.map(()=>({width:8})),{width:20},{width:20}];
      ws.mergeCells(1,1,1,COL_HEADERS.length);const r1=ws.getCell(1,1);r1.value=`POS 19 | Cleaning Programme Schedule — ${FORM_REF}`;r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,COL_HEADERS.length);ws.getCell(2,1).value=`Branch: ${BRANCH} | Section: ${safe(p.section)} | Week: ${safe(p.weekNo)} | Date: ${safe(p.reportDate)} | LEGEND: (√) Completed (✗) Not Completed`;ws.getCell(2,1).alignment={horizontal:"center"};ws.getRow(2).height=18;
      const hr=ws.getRow(4);hr.values=COL_HEADERS;hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=28;
      let rIdx=5;rows.forEach(e=>{ws.getRow(rIdx).values=[safe(e.area),safe(e.equipment),safe(e.cleaningMethod),safe(e.cleaningAgent),safe(e.concentration),safe(e.frequency),...DAYS.map(d=>safe(e[`day_${d}`])),safe(e.responsiblePerson),safe(e.remarks)];ws.getRow(rIdx).eachCell(cell=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;});ws.getRow(rIdx).height=20;rIdx++;});
      rIdx+=1;[["Checked by:",p.checkedBy||""],["Verified by:",p.verifiedBy||""],["Rev.Date:",p.revDate||""],["Rev.No:",p.revNo||""]].forEach(([label,val],i)=>{const c=i*2+1;const lc=ws.getCell(rIdx,c);const vc=ws.getCell(rIdx,c+1);lc.value=label;lc.font={bold:true};vc.value=val;lc.border=vc.border=border;});
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_CleaningSchedule_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current)return;const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.text(`POS 19 | Cleaning Programme Schedule — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","l");drawH();}}
    pdf.save(`POS19_CleaningSchedule_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){if(!file)return;try{const payload=JSON.parse(await file.text())?.payload||JSON.parse(await file.text());if(!payload?.reportDate)throw new Error();setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok)throw new Error();alert("✅ Imported");setDate(payload.reportDate);await fetchAllDates();await fetchRecord(payload.reportDate);}catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}}

  const grouped=useMemo(()=>{const out={};for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}for(const y of Object.keys(out))out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(b)-Number(a)).map(([m,arr])=>[m,arr.sort((a,b)=>b.localeCompare(a))]));return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(b)-Number(a)));}, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));
  const upd=(i,key,val)=>setEditRows(p=>{const n=[...p];n[i]={...n[i],[key]:val};return n;});

  return (
    <div style={{background:"#fff",border:"1px solid #dbe3f4",borderRadius:12,padding:16,color:"#0b1f4d",direction:"ltr"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:18}}>Cleaning Programme Schedule — View (POS 19)</div>
        <div style={{marginInlineStart:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={toggleEdit} style={btn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"Edit (password)"}</button>
          {editing&&<button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!record} style={btn("#0ea5e9")}>Export XLSX</button>
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
        <div>
          {loading&&<p>Loading…</p>}{err&&<p style={{color:"#b91c1c"}}>{err}</p>}
          {!loading&&!err&&!record&&<div style={{padding:12,border:"1px dashed #9ca3af",borderRadius:8,textAlign:"center"}}>No report for this date.</div>}
          {record&&(<div ref={reportRef}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8,fontSize:12}}>
              <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
              <div><strong>Form Ref:</strong> {FORM_REF}</div>
              <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
              <div><strong>Week No:</strong> {safe(record.payload?.weekNo)}</div>
            </div>
            <div style={{border:"1px solid #1f3b70",borderBottom:"none"}}><div style={{...thCell,background:"#e9f0ff"}}>LEGEND: (√) – Completed & (✗) – Not Completed / Missed</div></div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",fontSize:12}}>
                <colgroup>
                  <col style={{width:140}}/><col style={{width:160}}/><col style={{width:150}}/><col style={{width:140}}/><col style={{width:100}}/><col style={{width:110}}/>
                  {DAYS.map(d=><col key={d} style={{width:60}}/>)}
                  <col style={{width:140}}/><col style={{width:140}}/>
                </colgroup>
                <thead><tr>
                  <th style={thCell}>Area</th><th style={thCell}>Equipment{"\n"}/Surface</th><th style={thCell}>Cleaning{"\n"}Method</th><th style={thCell}>Cleaning{"\n"}Agent</th><th style={thCell}>Conc.{"\n"}/Dilution</th><th style={thCell}>Frequency</th>
                  {DAYS.map(d=><th key={d} style={thCell}>{d}</th>)}
                  <th style={thCell}>Responsible{"\n"}Person</th><th style={thCell}>Remarks</th>
                </tr></thead>
                <tbody>
                  {!editing?(record.payload?.entries||[]).filter(isFilledRow).map((r,idx)=>(<tr key={idx}>
                    <td style={tdCell}>{safe(r.area)}</td><td style={tdCell}>{safe(r.equipment)}</td><td style={tdCell}>{safe(r.cleaningMethod)}</td><td style={tdCell}>{safe(r.cleaningAgent)}</td><td style={tdCell}>{safe(r.concentration)}</td><td style={tdCell}>{safe(r.frequency)}</td>
                    {DAYS.map(d=><td key={d} style={{...tdCell,background:r[`day_${d}`]==="√"?"#e7f7ec":r[`day_${d}`]==="✗"?"#fde8e8":""}}>{safe(r[`day_${d}`])}</td>)}
                    <td style={tdCell}>{safe(r.responsiblePerson)}</td><td style={tdCell}>{safe(r.remarks)}</td>
                  </tr>)):(
                    editRows.map((r,i)=>(<tr key={i}>
                      <td style={tdCell}><input value={r.area||""} onChange={e=>upd(i,"area",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.equipment||""} onChange={e=>upd(i,"equipment",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.cleaningMethod||""} onChange={e=>upd(i,"cleaningMethod",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.cleaningAgent||""} onChange={e=>upd(i,"cleaningAgent",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.concentration||""} onChange={e=>upd(i,"concentration",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.frequency||""} onChange={e=>upd(i,"frequency",e.target.value)} style={inputStyle}/></td>
                      {DAYS.map(d=>(
                        <td key={d} style={{...tdCell,background:r[`day_${d}`]==="√"?"#e7f7ec":r[`day_${d}`]==="✗"?"#fde8e8":""}}>
                          <select value={r[`day_${d}`]||""} onChange={e=>upd(i,`day_${d}`,e.target.value)} style={inputStyle}><option value=""></option><option value="√">√</option><option value="✗">✗</option></select>
                        </td>
                      ))}
                      <td style={tdCell}><input value={r.responsiblePerson||""} onChange={e=>upd(i,"responsiblePerson",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.remarks||""} onChange={e=>upd(i,"remarks",e.target.value)} style={inputStyle}/></td>
                    </tr>))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginTop:12,fontSize:12}}>
              <div><strong>Checked by:</strong> {safe(record.payload?.checkedBy)}</div>
              <div><strong>Verified by:</strong> {safe(record.payload?.verifiedBy)}</div>
              <div><strong>Rev.Date:</strong> {safe(record.payload?.revDate)}</div>
              <div><strong>Rev.No:</strong> {safe(record.payload?.revNo)}</div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  );
}
