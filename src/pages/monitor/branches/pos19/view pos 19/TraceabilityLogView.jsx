// src/pages/monitor/branches/pos19/pos19_views/TraceabilityLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_traceability_log";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/TRC/10";

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg,color:"#fff",border:"none",borderRadius:8,padding:"8px 12px",fontWeight:700,cursor:"pointer" });
const formatDMY = (iso) => { if(!iso)return iso; const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m?`${m[3]}/${m[2]}/${m[1]}`:iso; };
const isFilledRow = (r={}) => Object.values(r).some(v=>String(v??"").trim()!=="");

function emptyRow(){ return {date:"",productName:"",supplier:"",productionDate:"",expiryDate:"",finalProduct:"",finalProductionDate:"",finalExpiryDate:"",storageLocation:"",disposalReason:"",checkedBy:""}; }

export default function TraceabilityLogView() {
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

  const gridStyle = {width:"max-content",borderCollapse:"collapse",tableLayout:"fixed",fontSize:13};
  const thCell = {border:"1px solid #1f3b70",padding:"8px 6px",textAlign:"center",whiteSpace:"pre-line",fontWeight:700,background:"#f5f8ff",color:"#0b1f4d"};
  const tdCell = {border:"1px solid #1f3b70",padding:"8px 6px",textAlign:"center",verticalAlign:"middle"};
  const inputStyle = {width:"100%",border:"1px solid #c7d2fe",borderRadius:6,padding:"6px 8px"};
  const colDefs = [
    <col key="date"                style={{width:110}}/>,
    <col key="productName"         style={{width:200}}/>,
    <col key="supplier"            style={{width:180}}/>,
    <col key="productionDate"      style={{width:130}}/>,
    <col key="expiryDate"          style={{width:130}}/>,
    <col key="finalProduct"        style={{width:200}}/>,
    <col key="finalProductionDate" style={{width:150}}/>,
    <col key="finalExpiryDate"     style={{width:150}}/>,
    <col key="storageLocation"     style={{width:160}}/>,
    <col key="disposalReason"      style={{width:180}}/>,
    <col key="checkedBy"           style={{width:140}}/>,
  ];

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

  function upd(i,key,val){setEditRows(p=>{const n=[...p];n[i]={...n[i],[key]:val};return n;});}
  function addRow(){setEditRows(p=>[...p,emptyRow()]);}
  function delRow(i){setEditRows(p=>p.length===1?p:p.filter((_,idx)=>idx!==i));}

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

  function exportJSON(){if(!record)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));a.download=`POS19_Traceability_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);}

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rows=(p.entries||[]).filter(isFilledRow);
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("TraceabilityLog");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS=["Date","Raw Name","Supplier","Production Date","Expiry Date","Final Product","Final Prod. Date","Final Exp. Date","Storage Location","Disposal Reason","Checked by"];
      ws.columns=[{width:12},{width:20},{width:20},{width:14},{width:14},{width:20},{width:16},{width:16},{width:18},{width:20},{width:16}];
      ws.mergeCells(1,1,1,COL_HEADERS.length);const r1=ws.getCell(1,1);r1.value=`POS 19 | Traceability Log — ${FORM_REF}`;r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,COL_HEADERS.length);ws.getCell(2,1).value=`Branch: ${BRANCH} | Section: ${safe(p.section)} | Date: ${safe(p.reportDate)}`;ws.getCell(2,1).alignment={horizontal:"center"};ws.getRow(2).height=18;
      const hr=ws.getRow(4);hr.values=COL_HEADERS;hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=28;
      let rIdx=5;rows.forEach(e=>{ws.getRow(rIdx).values=[safe(e.date),safe(e.productName),safe(e.supplier),safe(e.productionDate),safe(e.expiryDate),safe(e.finalProduct),safe(e.finalProductionDate),safe(e.finalExpiryDate),safe(e.storageLocation),safe(e.disposalReason),safe(e.checkedBy)];ws.getRow(rIdx).eachCell(cell=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;});ws.getRow(rIdx).height=20;rIdx++;});
      rIdx+=1;[["Checked by:",p.checkedBy||""],["Verified by:",p.verifiedBy||""],["Rev.Date:",p.revDate||""],["Rev.No:",p.revNo||""]].forEach(([label,val],i)=>{const c=i*2+1;const lc=ws.getCell(rIdx,c);const vc=ws.getCell(rIdx,c+1);lc.value=label;lc.font={bold:true};vc.value=val;lc.border=vc.border=border;});
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_Traceability_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current)return;const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.text(`POS 19 | Traceability Log — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","l");drawH();}}
    pdf.save(`POS19_Traceability_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){if(!file)return;try{const payload=JSON.parse(await file.text())?.payload||JSON.parse(await file.text());if(!payload?.reportDate)throw new Error();setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok)throw new Error();alert("✅ Imported");setDate(payload.reportDate);await fetchAllDates();await fetchRecord(payload.reportDate);}catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}}

  const grouped=useMemo(()=>{const out={};for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}for(const y of Object.keys(out))out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(b)-Number(a)).map(([m,arr])=>[m,arr.sort((a,b)=>b.localeCompare(a))]));return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(b)-Number(a)));}, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));
  const rows=record?.payload?.entries||[];

  return (
    <div style={{background:"#fff",border:"1px solid #dbe3f4",borderRadius:12,padding:16,color:"#0b1f4d",direction:"ltr"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:18}}>Traceability Log — View (POS 19)</div>
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
          {record&&(<div style={{overflowX:"auto",overflowY:"hidden"}}>
            <div ref={reportRef} style={{width:"max-content"}}>
              {/* Meta */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:8,marginBottom:8,fontSize:12,minWidth:1730}}>
                <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                <div><strong>Report Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Form Ref:</strong> {FORM_REF}</div>
                <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
              </div>

              {/* Table */}
              <table style={gridStyle}>
                <colgroup>{colDefs}{editing&&<col style={{width:70}}/>}</colgroup>
                <thead>
                  <tr>
                    <th style={thCell}>Date</th>
                    <th style={thCell}>Raw{"\n"}Name</th>
                    <th style={thCell}>Supplier</th>
                    <th style={thCell}>Production{"\n"}Date</th>
                    <th style={thCell}>Expiry{"\n"}Date</th>
                    <th style={thCell}>Final{"\n"}Product</th>
                    <th style={thCell}>Final Prod.{"\n"}Date</th>
                    <th style={thCell}>Final Exp.{"\n"}Date</th>
                    <th style={thCell}>Storage{"\n"}Location</th>
                    <th style={thCell}>Disposal{"\n"}Reason</th>
                    <th style={thCell}>Checked{"\n"}by</th>
                    {editing&&<th style={thCell}>—</th>}
                  </tr>
                </thead>
                <tbody>
                  {!editing?(rows.filter(isFilledRow).map((r,idx)=>(<tr key={idx}>
                    <td style={tdCell}>{formatDMY(safe(r.date))}</td>
                    <td style={tdCell}>{safe(r.productName)}</td>
                    <td style={tdCell}>{safe(r.supplier)}</td>
                    <td style={tdCell}>{formatDMY(safe(r.productionDate))}</td>
                    <td style={tdCell}>{formatDMY(safe(r.expiryDate))}</td>
                    <td style={tdCell}>{safe(r.finalProduct)}</td>
                    <td style={tdCell}>{formatDMY(safe(r.finalProductionDate))}</td>
                    <td style={tdCell}>{formatDMY(safe(r.finalExpiryDate))}</td>
                    <td style={tdCell}>{safe(r.storageLocation)}</td>
                    <td style={tdCell}>{safe(r.disposalReason)}</td>
                    <td style={tdCell}>{safe(r.checkedBy)}</td>
                  </tr>))):(
                    editRows.map((r,i)=>(<tr key={i}>
                      <td style={tdCell}><input type="date" value={r.date||""} onChange={e=>upd(i,"date",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.productName||""} onChange={e=>upd(i,"productName",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.supplier||""} onChange={e=>upd(i,"supplier",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input type="date" value={r.productionDate||""} onChange={e=>upd(i,"productionDate",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input type="date" value={r.expiryDate||""} onChange={e=>upd(i,"expiryDate",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.finalProduct||""} onChange={e=>upd(i,"finalProduct",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input type="date" value={r.finalProductionDate||""} onChange={e=>upd(i,"finalProductionDate",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input type="date" value={r.finalExpiryDate||""} onChange={e=>upd(i,"finalExpiryDate",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.storageLocation||""} onChange={e=>upd(i,"storageLocation",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.disposalReason||""} onChange={e=>upd(i,"disposalReason",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><input value={r.checkedBy||""} onChange={e=>upd(i,"checkedBy",e.target.value)} style={inputStyle}/></td>
                      <td style={tdCell}><button onClick={()=>delRow(i)} style={btn("#dc2626")}>Del</button></td>
                    </tr>))
                  )}
                </tbody>
              </table>

              {/* Note */}
              <div style={{marginTop:10,paddingTop:8,borderTop:"2px solid #1f3b70",fontSize:12,color:"#0b1f4d",lineHeight:1.6,width:"max-content"}}>
                <strong style={{color:"#0b1f4d"}}>Note:</strong>
                <span style={{marginInlineStart:4}}>
                  Raw material receipts, usage and disposal at the kitchen should be recorded as per
                  <span style={{fontWeight:800}}> “{FORM_REF}”</span>.
                </span>
              </div>

              {/* Footer: Checked left | Verified right */}
              <div style={{marginTop:12,width:"100%",display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",alignItems:"center",fontSize:12}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:"1 1 320px",minWidth:300}}>
                  <strong>Checked by:</strong>
                  <span style={{display:"inline-block",minWidth:260,borderBottom:"2px solid #1f3b70",lineHeight:"1.8",textAlign:"left"}}>
                    {safe(record.payload?.checkedBy)}
                  </span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8,flex:"1 1 320px",minWidth:300,justifyContent:"flex-end"}}>
                  <strong>Verified by:</strong>
                  <span style={{display:"inline-block",minWidth:260,borderBottom:"2px solid #1f3b70",lineHeight:"1.8",textAlign:"left"}}>
                    {safe(record.payload?.verifiedBy)}
                  </span>
                </div>
              </div>

              {/* Rev info */}
              <div style={{marginTop:8,display:"flex",justifyContent:"space-between",gap:16,fontSize:11,color:"#6b7280"}}>
                <div><strong>Rev.Date:</strong> {safe(record.payload?.revDate)}</div>
                <div><strong>Rev.No:</strong> {safe(record.payload?.revNo)}</div>
              </div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  );
}