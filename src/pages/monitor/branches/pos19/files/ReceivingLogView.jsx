// src/pages/monitor/branches/pos19/pos19_views/ReceivingLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_receiving_log_butchery";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/RCV/06";

const TICK_COLS = [
  { key:"vehicleClean",   label:"Vehicle clean" },
  { key:"handlerHygiene", label:"Food handler hygiene" },
  { key:"appearanceOK",   label:"Appearance" },
  { key:"firmnessOK",     label:"Firmness" },
  { key:"smellOK",        label:"Smell" },
  { key:"packagingGood",  label:"Packaging good/undamaged/clean/no pests" },
];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 12px",fontWeight:700,cursor:"pointer" });
const formatDMY = (iso) => { if(!iso)return iso; const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1]}`:iso; };
const isFilledRow = (r={}) => Object.values(r).some(v=>String(v??"").trim()!=="");

function emptyRow(){ return {date:"",time:"",supplier:"",foodItem:"",dmApprovalNo:"",vehicleTemp:"",foodTemp:"",vehicleClean:"",handlerHygiene:"",appearanceOK:"",firmnessOK:"",smellOK:"",packagingGood:"",countryOfOrigin:"",productionDate:"",expiryDate:"",invoiceNo:"",remarks:"",receivedBy:""}; }

export default function ReceivingLogView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai   = useMemo(()=>{ try{return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dubai"});}catch{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;} },[]);

  const [date,setDate]                     = useState(todayDubai);
  const [loading,setLoading]               = useState(false);
  const [err,setErr]                       = useState("");
  const [record,setRecord]                 = useState(null);
  const [editRows,setEditRows]             = useState(Array.from({length:15},()=>emptyRow()));
  const [editing,setEditing]               = useState(false);
  const [editVerifiedBy,setEditVerifiedBy] = useState("");
  const [editRevDate,setEditRevDate]       = useState("");
  const [editRevNo,setEditRevNo]           = useState("");
  const [allDates,setAllDates]             = useState([]);
  const [expandedYears,setExpandedYears]   = useState({});
  const [expandedMonths,setExpandedMonths] = useState({});

  const thCell = {border:"1px solid #1f3b70",padding:"6px 4px",textAlign:"center",whiteSpace:"pre-line",fontWeight:700,background:"#f5f8ff",color:"#0b1f4d"};
  const tdCell = {border:"1px solid #1f3b70",padding:"6px 4px",textAlign:"center",verticalAlign:"middle"};
  const inputStyle = {width:"100%",border:"1px solid #c7d2fe",borderRadius:6,padding:"4px 6px"};

  const colDefs = useMemo(()=>[
    <col key="date" style={{width:100}}/>,<col key="time" style={{width:84}}/>,<col key="sup" style={{width:170}}/>,<col key="food" style={{width:160}}/>,
    <col key="dm" style={{width:140}}/>,<col key="vt" style={{width:90}}/>,<col key="ft" style={{width:90}}/>,
    <col key="vc" style={{width:120}}/>,<col key="hh" style={{width:140}}/>,<col key="app" style={{width:120}}/>,<col key="fir" style={{width:110}}/>,<col key="smell" style={{width:110}}/>,
    <col key="pack" style={{width:220}}/>,<col key="ori" style={{width:120}}/>,<col key="prod" style={{width:120}}/>,<col key="exp" style={{width:120}}/>,
    <col key="inv" style={{width:120}}/>,<col key="rem" style={{width:180}}/>,<col key="rec" style={{width:120}}/>,
  ],[]);

  async function fetchAllDates(){
    try{const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});const data=await res.json();const list=Array.isArray(data)?data:data?.data??[];
    const uniq=Array.from(new Set(list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate).map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
    setAllDates(uniq);if(uniq.length){const[y,m]=uniq[0].split("-");setExpandedYears(p=>({...p,[y]:true}));setExpandedMonths(p=>({...p,[`${y}-${m}`]:true}));}
    if(!uniq.includes(date)&&uniq.length)setDate(uniq[0]);}catch(e){console.warn(e);}
  }

  async function fetchRecord(d=date){
    setLoading(true);setErr("");setRecord(null);
    try{const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});const data=await res.json();const list=Array.isArray(data)?data:data?.data??[];
    const match=list.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d)||null;setRecord(match);
    setEditRows(Array.from({length:15},(_,i)=>match?.payload?.entries?.[i]||emptyRow()));
    setEditVerifiedBy(match?.payload?.verifiedBy||"");setEditRevDate(match?.payload?.revDate||"");setEditRevNo(match?.payload?.revNo||"");setEditing(false);}
    catch(e){console.error(e);setErr("Failed to fetch data.");}finally{setLoading(false);}
  }

  useEffect(()=>{fetchAllDates();},[]);useEffect(()=>{if(date)fetchRecord(date);},[date]);

  const askPass=(label="")=>(window.prompt(`${label}\nEnter password:`)||"")==="9999";

  function toggleEdit(){
    if(editing){setEditRows(Array.from({length:15},(_,i)=>record?.payload?.entries?.[i]||emptyRow()));setEditVerifiedBy(record?.payload?.verifiedBy||"");setEditRevDate(record?.payload?.revDate||"");setEditRevNo(record?.payload?.revNo||"");setEditing(false);return;}
    if(!askPass("Enable edit mode"))return alert("❌ Wrong password");setEditing(true);
  }

  async function saveEdit(){
    if(!askPass("Save changes"))return alert("❌ Wrong password");if(!record)return;
    const rid=getId(record);const cleaned=editRows.filter(isFilledRow);
    const payload={...(record?.payload||{}),branch:BRANCH,reportDate:record?.payload?.reportDate,entries:cleaned,verifiedBy:editVerifiedBy,revDate:editRevDate,revNo:editRevNo,savedAt:Date.now()};
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

  function exportJSON(){if(!record)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));a.download=`POS19_ReceivingLog_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);}

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rawRows=Array.isArray(p.entries)?p.entries:[];
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("ReceivingLog");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS=["Date","Time","Name of the Supplier","Food Item","DM approval no","Vehicle Temp (°C)","Food Temp (°C)","Vehicle clean","Food handler hygiene","Appearance","Firmness","Smell","Packaging (good/undamaged/clean/no pests)","Country of origin","Production Date","Expiry Date","Invoice No:","Remarks (if any)","Received by"];
      ws.columns=[{width:12},{width:10},{width:24},{width:20},{width:22},{width:14},{width:14},{width:16},{width:18},{width:14},{width:12},{width:12},{width:36},{width:16},{width:15},{width:15},{width:14},{width:22},{width:16}];
      ws.mergeCells(1,1,1,19);const r1=ws.getCell(1,1);r1.value=`POS 19 | Receiving Log (Butchery) — ${FORM_REF}`;r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,19);ws.getCell(2,1).value=`Branch: ${BRANCH} | Date: ${p.reportDate||""} | Classification: ${p.classification||"Official"}`;ws.getCell(2,1).alignment={horizontal:"center"};ws.getRow(2).height=18;
      const hr=ws.getRow(4);hr.values=COL_HEADERS;hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=28;
      const rows=rawRows.filter(isFilledRow);let rIdx=5;
      rows.forEach(e=>{ws.getRow(rIdx).values=[e?.date||"",e?.time||"",e?.supplier||"",e?.foodItem||"",e?.dmApprovalNo||"",e?.vehicleTemp||"",e?.foodTemp||"",e?.vehicleClean||"",e?.handlerHygiene||"",e?.appearanceOK||"",e?.firmnessOK||"",e?.smellOK||"",e?.packagingGood||"",e?.countryOfOrigin||"",e?.productionDate||"",e?.expiryDate||"",e?.invoiceNo||"",e?.remarks||"",e?.receivedBy||""];ws.getRow(rIdx).eachCell(cell=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;});ws.getRow(rIdx).height=20;rIdx++;});
      rIdx+=1;[["Verified by:",p.verifiedBy||""],["Rev.Date:",p.revDate||""],["Rev.No:",p.revNo||""]].forEach(([label,val],i)=>{const c=i*2+1;const lc=ws.getCell(rIdx,c);const vc=ws.getCell(rIdx,c+1);lc.value=label;lc.font={bold:true};lc.alignment={horizontal:"left",vertical:"middle"};vc.value=val;vc.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FCE4D6"}};lc.border=vc.border=border;});
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_ReceivingLog_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current)return;const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.text(`POS 19 | Receiving Log (Butchery) — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","l");drawH();}}
    pdf.save(`POS19_ReceivingLog_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){if(!file)return;try{const payload=JSON.parse(await file.text())?.payload||JSON.parse(await file.text());if(!payload?.reportDate)throw new Error();setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok)throw new Error();alert("✅ Imported");setDate(payload.reportDate);await fetchAllDates();await fetchRecord(payload.reportDate);}catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}}

  const grouped=useMemo(()=>{const out={};for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}for(const y of Object.keys(out))out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort((a,b)=>a.localeCompare(b))]));return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));}, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));

  const upd=(idx,key,val)=>setEditRows(prev=>{const n=[...prev];n[idx]={...n[idx],[key]:val};return n;});

  return (
    <div style={{background:"#fff",border:"1px solid #dbe3f4",borderRadius:12,padding:16,color:"#0b1f4d",direction:"ltr"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:18}}>Receiving Log (Butchery) — View (POS 19)</div>
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
        <div style={{minWidth:0}}>
          {loading&&<p>Loading…</p>}{err&&<p style={{color:"#b91c1c"}}>{err}</p>}
          {!loading&&!err&&!record&&<div style={{padding:12,border:"1px dashed #9ca3af",borderRadius:8,textAlign:"center"}}>No report for this date.</div>}
          {record&&(<div style={{overflowX:"auto",overflowY:"hidden"}}><div ref={reportRef} style={{width:"max-content"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:8,fontSize:12,minWidth:1000}}>
              <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
              <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
              <div><strong>Form Ref:</strong> {FORM_REF}</div>
              <div><strong>Classification:</strong> {safe(record.payload?.classification||"Official")}</div>
            </div>
            <div style={{border:"1px solid #1f3b70",borderBottom:"none"}}><div style={{...thCell,background:"#e9f0ff"}}>LEGEND: (√) – Satisfactory / (✗) – Needs Improvement</div></div>
            <table style={{width:"max-content",borderCollapse:"collapse",tableLayout:"fixed",fontSize:12}}>
              <colgroup>{colDefs}</colgroup>
              <thead><tr>
                <th style={thCell}>Date</th><th style={thCell}>Time</th><th style={thCell}>Name of the Supplier</th><th style={thCell}>Food Item</th>
                <th style={thCell}>DM approval number of the delivery vehicle</th><th style={thCell}>Vehicle Temp (°C)</th><th style={thCell}>Food Temp (°C)</th>
                <th style={thCell}>Vehicle clean</th><th style={thCell}>Food handler hygiene</th><th style={thCell}>Appearance</th><th style={thCell}>Firmness</th><th style={thCell}>Smell</th>
                <th style={thCell}>Packaging of food is good and undamaged, clean and no signs of pest infestation</th>
                <th style={thCell}>Country of origin</th><th style={thCell}>Production Date</th><th style={thCell}>Expiry Date</th><th style={thCell}>Invoice No:</th><th style={thCell}>Remarks (if any)</th><th style={thCell}>Received by</th>
              </tr></thead>
              <tbody>
                {!editing?(record.payload?.entries||[]).filter(isFilledRow).map((r,idx)=>(<tr key={idx}>
                  <td style={tdCell}>{formatDMY(safe(r.date))}</td><td style={tdCell}>{safe(r.time)}</td><td style={tdCell}>{safe(r.supplier)}</td><td style={tdCell}>{safe(r.foodItem)}</td>
                  <td style={tdCell}>{safe(r.dmApprovalNo)}</td><td style={tdCell}>{safe(r.vehicleTemp)}</td><td style={tdCell}>{safe(r.foodTemp)}</td>
                  <td style={tdCell}>{safe(r.vehicleClean)}</td><td style={tdCell}>{safe(r.handlerHygiene)}</td><td style={tdCell}>{safe(r.appearanceOK)}</td><td style={tdCell}>{safe(r.firmnessOK)}</td><td style={tdCell}>{safe(r.smellOK)}</td>
                  <td style={tdCell}>{safe(r.packagingGood)}</td><td style={tdCell}>{safe(r.countryOfOrigin)}</td><td style={tdCell}>{formatDMY(safe(r.productionDate))}</td><td style={tdCell}>{formatDMY(safe(r.expiryDate))}</td>
                  <td style={tdCell}>{safe(r.invoiceNo)}</td><td style={tdCell}>{safe(r.remarks)}</td><td style={tdCell}>{safe(r.receivedBy)}</td>
                </tr>)):(
                  editRows.map((r,idx)=>(<tr key={idx}>
                    <td style={tdCell}><input type="date" value={r.date||""} onChange={e=>upd(idx,"date",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="time" value={r.time||""} onChange={e=>upd(idx,"time",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.supplier||""} onChange={e=>upd(idx,"supplier",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.foodItem||""} onChange={e=>upd(idx,"foodItem",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.dmApprovalNo||""} onChange={e=>upd(idx,"dmApprovalNo",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="number" step="0.1" value={r.vehicleTemp||""} onChange={e=>upd(idx,"vehicleTemp",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="number" step="0.1" value={r.foodTemp||""} onChange={e=>upd(idx,"foodTemp",e.target.value)} style={inputStyle}/></td>
                    {TICK_COLS.map(c=>(<td key={c.key} style={tdCell}><select value={r[c.key]||""} onChange={e=>upd(idx,c.key,e.target.value)} style={inputStyle}><option value=""></option><option value="√">√</option><option value="✗">✗</option></select></td>))}
                    <td style={tdCell}><input type="text" value={r.countryOfOrigin||""} onChange={e=>upd(idx,"countryOfOrigin",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="date" value={r.productionDate||""} onChange={e=>upd(idx,"productionDate",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="date" value={r.expiryDate||""} onChange={e=>upd(idx,"expiryDate",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.invoiceNo||""} onChange={e=>upd(idx,"invoiceNo",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.remarks||""} onChange={e=>upd(idx,"remarks",e.target.value)} style={inputStyle}/></td>
                    <td style={tdCell}><input type="text" value={r.receivedBy||""} onChange={e=>upd(idx,"receivedBy",e.target.value)} style={inputStyle}/></td>
                  </tr>))
                )}
              </tbody>
            </table>
            <div style={{marginTop:8,fontSize:12,fontWeight:700,width:"max-content"}}>Legend: (√) – Satisfactory & (✗) – Needs Improvement</div>
            <div style={{marginTop:10,fontSize:11,color:"#0b1f4d",width:"max-content"}}>
              <div style={{fontWeight:700,marginBottom:4}}>Organoleptic Checks*</div>
              <div>Appearance: Normal colour (Free from discoloration) | Firmness: Firm rather than soft. | Smell: Normal smell (No rancid or strange smell)</div>
              <div style={{marginTop:6}}><strong>Note:</strong> Chilled ≤ 5°C | Frozen ≤ -18°C | Hot ≥ 60°C | Dry/Low Risk ≤ 25°C</div>
            </div>
            <div style={{marginTop:12,width:"max-content"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                <strong>Verified by:</strong>
                {!editing?(<span style={{display:"inline-block",minWidth:260,borderBottom:"2px solid #1f3b70",lineHeight:"1.8"}}>{safe(record.payload?.verifiedBy)}</span>):(<input value={editVerifiedBy} onChange={e=>setEditVerifiedBy(e.target.value)} style={{border:"none",borderBottom:"2px solid #1f3b70",padding:"4px 6px",outline:"none",fontSize:12,color:"#0b1f4d"}}/>)}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12,fontSize:12}}>
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
