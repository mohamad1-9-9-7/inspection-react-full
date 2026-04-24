// src/pages/monitor/branches/pos19/pos19_views/TemperatureMonitoringLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReportHeader from "../_shared/ReportHeader";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_temperature_monitoring";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/TMP/09";

const READINGS   = [{ key:"am", label:"Morning" },{ key:"pm", label:"Midday" },{ key:"ev", label:"Evening" }];
const UNIT_TYPES = [{ value:"chiller", label:"Chiller", limit:"≤ 5°C" },{ value:"freezer", label:"Freezer", limit:"≤ -18°C" },{ value:"ambient", label:"Ambient", limit:"≤ 25°C" }];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 12px",fontWeight:700,cursor:"pointer" });
const formatDMY = (iso) => { if(!iso)return iso; const[y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const isFilledRow = (r={}) => Object.values(r).some(v=>String(v??"").trim()!=="");

function isBreach(unitType,temp){
  if(temp===""||temp===undefined||temp===null)return false;
  const v=parseFloat(temp);if(isNaN(v))return false;
  if(unitType==="chiller")return v>5;if(unitType==="freezer")return v>-18;if(unitType==="ambient")return v>25;return false;
}

function emptyRow(){
  const base={equipment:"",unitType:"chiller",targetTemp:"≤ 5°C",correctiveAction:"",checkedBy:""};
  READINGS.forEach(r=>{base[`${r.key}_time`]="";base[`${r.key}_temp`]="";});
  return base;
}

export default function TemperatureMonitoringLogView() {
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
    setAllDates(uniq);if(uniq.length){const[y,m]=uniq[0].split("-");setExpandedYears(p=>({...p,[y]:true}));setExpandedMonths(p=>({...p,[`${y}-${m}`]:true}));}
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

  function upd(i,key,val){setEditRows(p=>{const n=[...p];if(key==="unitType"){const found=UNIT_TYPES.find(u=>u.value===val);n[i]={...n[i],[key]:val,targetTemp:found?found.limit:""};}else{n[i]={...n[i],[key]:val};}return n;});}
  function addRow(){setEditRows(p=>[...p,emptyRow()]);}
  function delRow(i){setEditRows(p=>p.length===1?p:p.filter((_,idx)=>idx!==i));}

  async function saveEdit(){
    if(!askPass("Save changes"))return alert("❌ Wrong password");if(!record)return;
    const rid=getId(record);const cleaned=editRows.filter(isFilledRow);
    for(const r of cleaned){const hasBreach=READINGS.some(rd=>isBreach(r.unitType,r[`${rd.key}_temp`]));if(hasBreach&&!String(r.correctiveAction||"").trim()){alert("يوجد صف تجاوز درجة الحرارة بدون Corrective Action.");return;}}
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

  function exportJSON(){if(!record)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));a.download=`POS19_TempMonitoring_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);}

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rows=(p.entries||[]).filter(isFilledRow);
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("TempMonitoring");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS=["Equipment / Location","Unit Type","Target Temp",...READINGS.flatMap(r=>[`${r.label} Time`,`${r.label} °C`]),"Corrective Action","Checked by"];
      ws.columns=[{width:22},{width:12},{width:12},...READINGS.flatMap(()=>[{width:10},{width:12}]),{width:28},{width:16}];
      ws.mergeCells(1,1,1,COL_HEADERS.length);const r1=ws.getCell(1,1);r1.value=`POS 19 | Temperature Monitoring Log — ${FORM_REF}`;r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,COL_HEADERS.length);ws.getCell(2,1).value=`Branch: ${BRANCH} | Date: ${safe(p.reportDate)} | Critical Limits: Chiller ≤5°C | Freezer ≤-18°C | Ambient ≤25°C`;ws.getCell(2,1).alignment={horizontal:"center"};ws.getRow(2).height=18;
      const hr=ws.getRow(4);hr.values=COL_HEADERS;hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=28;
      let rIdx=5;rows.forEach(e=>{
        ws.getRow(rIdx).values=[safe(e.equipment),safe(e.unitType),safe(e.targetTemp),...READINGS.flatMap(rd=>[safe(e[`${rd.key}_time`]),safe(e[`${rd.key}_temp`])]),safe(e.correctiveAction),safe(e.checkedBy)];
        ws.getRow(rIdx).eachCell(cell=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;});ws.getRow(rIdx).height=20;rIdx++;
      });
      rIdx+=1;[["Checked by:",p.checkedBy||""],["Verified by:",p.verifiedBy||""],["Rev.Date:",p.revDate||""],["Rev.No:",p.revNo||""]].forEach(([label,val],i)=>{const c=i*2+1;const lc=ws.getCell(rIdx,c);const vc=ws.getCell(rIdx,c+1);lc.value=label;lc.font={bold:true};vc.value=val;lc.border=vc.border=border;});
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_TempMonitoring_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current)return;const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.text(`POS 19 | Temperature Monitoring Log — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","l");drawH();}}
    pdf.save(`POS19_TempMonitoring_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){if(!file)return;try{const payload=JSON.parse(await file.text())?.payload||JSON.parse(await file.text());if(!payload?.reportDate)throw new Error();setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok)throw new Error();alert("✅ Imported");setDate(payload.reportDate);await fetchAllDates();await fetchRecord(payload.reportDate);}catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}}

  const grouped=useMemo(()=>{const out={};for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}for(const y of Object.keys(out))out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort((a,b)=>a.localeCompare(b))]));return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));}, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));
  const rows=record?.payload?.entries||[];

  return (
    <div style={{background:"#fff",border:"1px solid #dbe3f4",borderRadius:12,padding:16,color:"#0b1f4d",direction:"ltr"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:18}}>Temperature Monitoring Log — View (POS 19)</div>
        <div style={{marginInlineStart:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={toggleEdit} style={btn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"Edit (password)"}</button>
          {editing&&<><button onClick={addRow} style={btn("#0ea5e9")}>+ Row</button><button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button></>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!rows.filter(isFilledRow).length} style={btn("#0ea5e9")}>Export XLSX</button>
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
            </div>);}):<div style={{color:"#6b7280"}}>No available dates.</div>}
          </div>
        </div>
        <div>
          {loading&&<p>Loading…</p>}{err&&<p style={{color:"#b91c1c"}}>{err}</p>}
          {!loading&&!err&&!record&&<div style={{padding:12,border:"1px dashed #9ca3af",borderRadius:8,textAlign:"center"}}>No report for this date.</div>}
          {record&&(<div ref={reportRef}>
            <ReportHeader
              title="Temperature Monitoring Log"
              fields={[
                { label: "Report Date", value: safe(record.payload?.reportDate) },
                { label: "Branch",      value: safe(record.payload?.branch) },
                { label: "Form Ref",    value: FORM_REF },
                { label: "Section",     value: safe(record.payload?.section) },
              ]}
            />
            <div style={{border:"1px solid #1f3b70",borderBottom:"none"}}><div style={{...thCell,background:"#e9f0ff"}}>Critical Limits: Chiller ≤ 5°C | Freezer ≤ -18°C | Ambient ≤ 25°C</div></div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",fontSize:12}}>
                <colgroup>
                  <col style={{width:180}}/><col style={{width:110}}/><col style={{width:100}}/>
                  {READINGS.flatMap((_,i)=>[<col key={`r${i}a`} style={{width:90}}/>,<col key={`r${i}b`} style={{width:90}}/>])}
                  <col style={{width:200}}/><col style={{width:120}}/>
                  {editing&&<col style={{width:70}}/>}
                </colgroup>
                <thead>
                  <tr>
                    <th style={thCell} rowSpan={2}>Equipment /{ "\n"}Location</th>
                    <th style={thCell} rowSpan={2}>Unit{"\n"}Type</th>
                    <th style={thCell} rowSpan={2}>Target{"\n"}Temp</th>
                    {READINGS.map(r=><th key={r.key} style={thCell} colSpan={2}>{r.label}</th>)}
                    <th style={thCell} rowSpan={2}>Corrective{"\n"}Action</th>
                    <th style={thCell} rowSpan={2}>Checked{"\n"}by</th>
                    {editing&&<th style={thCell} rowSpan={2}>—</th>}
                  </tr>
                  <tr>
                    {READINGS.flatMap(r=>[<th key={`${r.key}t`} style={thCell}>Time</th>,<th key={`${r.key}d`} style={thCell}>°C</th>])}
                  </tr>
                </thead>
                <tbody>
                  {!editing?(rows.filter(isFilledRow).map((r,idx)=>(<tr key={idx}>
                    <td style={tdCell}>{safe(r.equipment)}</td>
                    <td style={tdCell}>{safe(r.unitType)}</td>
                    <td style={tdCell}>{safe(r.targetTemp)}</td>
                    {READINGS.flatMap(rd=>[
                      <td key={`${rd.key}t`} style={tdCell}>{safe(r[`${rd.key}_time`])}</td>,
                      <td key={`${rd.key}d`} style={{...tdCell,background:isBreach(r.unitType,r[`${rd.key}_temp`])?"#fde8e8":""}}>{safe(r[`${rd.key}_temp`])}</td>
                    ])}
                    <td style={tdCell}>{safe(r.correctiveAction)}</td>
                    <td style={tdCell}>{safe(r.checkedBy)}</td>
                  </tr>))):(
                    editRows.map((r,i)=>(<tr key={i}>
                      <td style={tdCell}><input value={r.equipment||""} onChange={e=>upd(i,"equipment",e.target.value)} style={inputStyle} placeholder="e.g. Chiller 1"/></td>
                      <td style={tdCell}><select value={r.unitType||""} onChange={e=>upd(i,"unitType",e.target.value)} style={inputStyle}>{UNIT_TYPES.map(u=><option key={u.value} value={u.value}>{u.label}</option>)}</select></td>
                      <td style={tdCell}><input value={r.targetTemp||""} onChange={e=>upd(i,"targetTemp",e.target.value)} style={inputStyle}/></td>
                      {READINGS.flatMap(rd=>[
                        <td key={`${rd.key}t`} style={tdCell}><input type="time" value={r[`${rd.key}_time`]||""} onChange={e=>upd(i,`${rd.key}_time`,e.target.value)} style={inputStyle}/></td>,
                        <td key={`${rd.key}d`} style={{...tdCell,background:isBreach(r.unitType,r[`${rd.key}_temp`])?"#fde8e8":""}}>
                          <input type="number" step="0.1" value={r[`${rd.key}_temp`]||""} onChange={e=>upd(i,`${rd.key}_temp`,e.target.value)} style={{...inputStyle,background:isBreach(r.unitType,r[`${rd.key}_temp`])?"#fde8e8":"#fff"}} placeholder="°C"/>
                        </td>
                      ])}
                      <td style={tdCell}><input value={r.correctiveAction||""} onChange={e=>upd(i,"correctiveAction",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.checkedBy||""} onChange={e=>upd(i,"checkedBy",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><button onClick={()=>delRow(i)} style={btn("#dc2626")}>Del</button></td>
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