// src/pages/monitor/branches/pos19/pos19_views/GlassItemsConditionChecklistView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_glass_items_condition";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/GLS/03";

const LEGEND_COLS = [
  { key: "inGoodRepair", label: "In good repair and condition" },
  { key: "noBreakage",   label: "No signs of glass breakage" },
  { key: "cleanDry",     label: "Visibly clean and dry" },
];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg, color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontWeight:700, cursor:"pointer" });
const formatDMY = (iso) => { if (!iso) return iso; const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };

function emptyRow() { return { date:"", glassItem:"", section:"", inGoodRepair:"", noBreakage:"", cleanDry:"", correctiveAction:"", checkedBy:"" }; }

export default function GlassItemsConditionChecklistView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai   = useMemo(() => { try { return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dubai"}); } catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; } }, []);

  const [date,setDate]                     = useState(todayDubai);
  const [loading,setLoading]               = useState(false);
  const [err,setErr]                       = useState("");
  const [record,setRecord]                 = useState(null);
  const [editRows,setEditRows]             = useState(Array.from({length:5},()=>emptyRow()));
  const [editing,setEditing]               = useState(false);
  const [footer,setFooter]                 = useState({ verifiedBy:"", revDate:"", revNo:"" });
  const [allDates,setAllDates]             = useState([]);
  const [expandedYears,setExpandedYears]   = useState({});
  const [expandedMonths,setExpandedMonths] = useState({});

  const thCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", whiteSpace:"pre-line", fontWeight:700, background:"#f5f8ff", color:"#0b1f4d" };
  const tdCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", verticalAlign:"middle" };
  const inputStyle = { width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" };

  const colDefs = useMemo(() => [
    <col key="date" style={{width:120}}/>, <col key="glass" style={{width:210}}/>, <col key="sec" style={{width:160}}/>,
    ...LEGEND_COLS.map((_,i)=><col key={`lg${i}`} style={{width:160}}/>),
    <col key="ca" style={{width:220}}/>, <col key="chk" style={{width:140}}/>,
  ], []);

  async function fetchAllDates() {
    try {
      const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});
      const data=await res.json(); const list=Array.isArray(data)?data:data?.data??[];
      const uniq=Array.from(new Set(list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate).map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);
      // Tree stays collapsed by default.
      if (!uniq.includes(date)&&uniq.length) setDate(uniq[0]);
    } catch(e){console.warn(e);}
  }

  async function fetchRecord(d=date) {
    setLoading(true);setErr("");setRecord(null);
    try {
      const res=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"});
      const list=(await res.json())?.data??(await res.json());
      const data2=await fetch(`${API_BASE}/api/reports?type=${TYPE}`,{cache:"no-store"}).then(r=>r.json());
      const list2=Array.isArray(data2)?data2:data2?.data??[];
      const match=list2.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d)||null;
      setRecord(match);
      setEditRows(Array.from({length:5},(_,i)=>match?.payload?.entries?.[i]||emptyRow()));
      setFooter({verifiedBy:match?.payload?.verifiedBy||"",revDate:match?.payload?.revDate||"",revNo:match?.payload?.revNo||""});
      setEditing(false);
    } catch(e){console.error(e);setErr("Failed to fetch data.");}
    finally{setLoading(false);}
  }

  useEffect(()=>{fetchAllDates();},[]);
  useEffect(()=>{if(date)fetchRecord(date);},[date]);

  const askPass=(label="")=>(window.prompt(`${label}\nEnter password:`)||"")==="9999";

  function toggleEdit(){
    if(editing){setEditing(false);setEditRows(Array.from({length:5},(_,i)=>record?.payload?.entries?.[i]||emptyRow()));setFooter({verifiedBy:record?.payload?.verifiedBy||"",revDate:record?.payload?.revDate||"",revNo:record?.payload?.revNo||""});return;}
    if(!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditing(true);
  }

  async function saveEdit(){
    if(!askPass("Save changes")) return alert("❌ Wrong password");
    if(!record) return;
    const rid=getId(record);
    const cleaned=editRows.filter(r=>Object.values(r).some(v=>String(v||"").trim()!==""));
    const payload={...(record?.payload||{}),branch:BRANCH,reportDate:record?.payload?.reportDate,entries:cleaned,...footer,savedAt:Date.now()};
    try{
      setLoading(true);
      if(rid){try{await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});}catch(e){console.warn(e);}}
      const r=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      alert("✅ Changes saved");setEditing(false);await fetchRecord(payload.reportDate);await fetchAllDates();
    }catch(e){console.error(e);alert("❌ Saving failed.\n"+String(e?.message||e));}
    finally{setLoading(false);}
  }

  async function handleDelete(){
    if(!record) return;
    if(!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if(!window.confirm("Are you sure?")) return;
    const rid=getId(record);if(!rid) return alert("⚠️ Missing id.");
    try{setLoading(true);const res=await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});if(!res.ok)throw new Error();alert("✅ Deleted");await fetchAllDates();setDate(allDates.find(d=>d!==record?.payload?.reportDate)||todayDubai);}
    catch(e){alert("❌ Delete failed.");}finally{setLoading(false);}
  }

  function exportJSON(){
    if(!record) return;
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));
    a.download=`POS19_GlassItems_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);
  }

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rows=Array.isArray(p.entries)?p.entries:[];
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("GlassItems");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS=["Date","Glass Item","Section",...LEGEND_COLS.map(c=>c.label),"Corrective Action (if any)","Checked by"];
      ws.columns=[{width:12},{width:28},{width:18},...LEGEND_COLS.map(()=>({width:22})),{width:28},{width:16}];
      ws.mergeCells(1,1,1,COL_HEADERS.length);const r1=ws.getCell(1,1);
      r1.value=`POS 19 | Glass Items Condition Monitoring Checklist (Weekly) — ${FORM_REF}`;
      r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,COL_HEADERS.length);ws.getCell(2,1).value=`Branch: ${BRANCH} | Section: ${safe(p.section)} | Date: ${safe(p.reportDate)}`;ws.getCell(2,1).alignment={horizontal:"center"};ws.getRow(2).height=18;
      ws.mergeCells(3,1,3,COL_HEADERS.length);ws.getCell(3,1).value="LEGEND: (√) – Satisfactory & (✗) – Needs Improvement";ws.getCell(3,1).alignment={horizontal:"center"};ws.getCell(3,1).font={bold:true};ws.getRow(3).height=18;
      const hr=ws.getRow(5);hr.values=COL_HEADERS;hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=28;
      let rIdx=6;
      rows.forEach(e=>{
        ws.getRow(rIdx).values=[e?.date||"",e?.glassItem||"",e?.section||"",e?.inGoodRepair||"",e?.noBreakage||"",e?.cleanDry||"",e?.correctiveAction||"",e?.checkedBy||""];
        ws.getRow(rIdx).eachCell(cell=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;});ws.getRow(rIdx).height=22;rIdx++;
      });
      const footIdx=rIdx+1;const footPairs=[["Verified by:",p.verifiedBy||""],["Rev.Date:",p.revDate||""],["Rev.No:",p.revNo||""]];
      let colPtr=1;footPairs.forEach(([label,val])=>{const lc=ws.getCell(footIdx,colPtr++);const vc=ws.getCell(footIdx,colPtr++);lc.value=label;lc.font={bold:true};vc.value=val;vc.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FCE4D6"}};lc.border=vc.border=border;});
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});
      const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_GlassItems_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current) return;
    const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.text(`POS 19 | Glass Items Condition Checklist (Weekly) — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","l");drawH();}}
    pdf.save(`POS19_GlassItems_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){
    if(!file) return;
    try{const parsed=JSON.parse(await file.text());const payload=parsed?.payload||parsed;if(!payload?.reportDate) throw new Error("Missing reportDate");setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok) throw new Error();alert("✅ Imported");setDate(payload.reportDate);await fetchAllDates();await fetchRecord(payload.reportDate);}
    catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}
    finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}
  }

  const grouped=useMemo(()=>{const out={};for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}for(const y of Object.keys(out))out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(b)-Number(a)).map(([m,arr])=>[m,arr.sort((a,b)=>b.localeCompare(a))]));return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(b)-Number(a)));}, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));
  const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));

  return (
    <div style={{background:"#fff",border:"1px solid #dbe3f4",borderRadius:12,padding:16,color:"#0b1f4d",direction:"ltr"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:18}}>Glass Items Condition Monitoring Checklist (Weekly) — View (POS 19)</div>
        <div style={{marginInlineStart:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={toggleEdit} style={btn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"Edit (password)"}</button>
          {editing&&<button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!record?.payload?.entries?.length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{...btn("#059669"),display:"inline-block"}}>Import JSON<input ref={fileInputRef} type="file" accept="application/json" onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}}/></label>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"280px 1fr",gap:12}}>
        {/* Date Tree */}
        <div style={{border:"1px solid #e5e7eb",borderRadius:10,padding:10,background:"#fafafa"}}>
          <div style={{fontWeight:800,marginBottom:8}}>📅 Date Tree</div>
          <div style={{maxHeight:380,overflowY:"auto"}}>
            {Object.keys(grouped).length?Object.entries(grouped).map(([year,months])=>{
              const yOpen=!!expandedYears[year];
              return(<div key={year} style={{marginBottom:8}}>
                <button onClick={()=>toggleYear(year)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid #d1d5db",background:"#fff",cursor:"pointer",fontWeight:800}}><span>Year {year}</span><span>{yOpen?"▾":"▸"}</span></button>
                {yOpen&&Object.entries(months).map(([month,days])=>{const key=`${year}-${month}`;const mOpen=!!expandedMonths[key];return(<div key={key} style={{marginTop:6,marginLeft:8}}>
                  <button onClick={()=>toggleMonth(year,month)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid #e5e7eb",background:"#fff",cursor:"pointer",fontWeight:700}}><span>Month {month}</span><span>{mOpen?"▾":"▸"}</span></button>
                  {mOpen&&<ul style={{listStyle:"none",padding:"6px 2px 0 2px",margin:0}}>{days.map(d=>(<li key={d} style={{marginBottom:6}}><button onClick={()=>setDate(d)} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:8,border:"1px solid #d1d5db",background:d===date?"#2563eb":"#fff",color:d===date?"#fff":"#111827",fontWeight:700,cursor:"pointer"}}>{formatDMY(d)}</button></li>))}</ul>}
                </div>);})}
              </div>);
            }):<div style={{color:"#6b7280"}}>No available dates.</div>}
          </div>
        </div>
        {/* Report */}
        <div>
          {loading&&<p>Loading…</p>}{err&&<p style={{color:"#b91c1c"}}>{err}</p>}
          {!loading&&!err&&!record&&<div style={{padding:12,border:"1px dashed #9ca3af",borderRadius:8,textAlign:"center"}}>No report for this date.</div>}
          {record&&(<div ref={reportRef}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:8,fontSize:12}}>
              <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
              <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
              <div><strong>Form Ref:</strong> {FORM_REF}</div>
              <div><strong>Classification:</strong> {safe(record.payload?.classification||"Official")}</div>
              <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
            </div>
            <div style={{border:"1px solid #1f3b70",borderBottom:"none"}}>
              <div style={{...thCell,background:"#e9f0ff"}}>LEGEND: (√) – Satisfactory & (✗) – Needs Improvement</div>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed",fontSize:12}}>
                <colgroup>{colDefs}</colgroup>
                <thead><tr>
                  <th style={thCell}>Date</th><th style={thCell}>Glass Item</th><th style={thCell}>Section</th>
                  {LEGEND_COLS.map(c=><th key={c.key} style={thCell}>{c.label}</th>)}
                  <th style={thCell}>Corrective Action{"\n"}(if any)</th><th style={thCell}>Checked by</th>
                </tr></thead>
                <tbody>
                  {!editing?(
                    (Array.from({length:5},(_,i)=>record.payload?.entries?.[i]||emptyRow())).map((r,idx)=>(
                      <tr key={idx}>
                        <td style={tdCell}>{formatDMY(safe(r.date))}</td><td style={tdCell}>{safe(r.glassItem)}</td><td style={tdCell}>{safe(r.section)}</td>
                        {LEGEND_COLS.map(c=><td key={c.key} style={tdCell}>{safe(r[c.key])}</td>)}
                        <td style={tdCell}>{safe(r.correctiveAction)}</td><td style={tdCell}>{safe(r.checkedBy)}</td>
                      </tr>
                    ))
                  ):(
                    editRows.map((r,idx)=>(
                      <tr key={idx}>
                        <td style={tdCell}><input type="date" value={r.date||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],date:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                        <td style={tdCell}><input type="text" value={r.glassItem||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],glassItem:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                        <td style={tdCell}><input type="text" value={r.section||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],section:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                        {LEGEND_COLS.map(c=>(
                          <td key={c.key} style={tdCell}><select value={r[c.key]||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],[c.key]:e.target.value};setEditRows(n);}} style={inputStyle}><option value=""></option><option value="√">√</option><option value="✗">✗</option></select></td>
                        ))}
                        <td style={tdCell}><input type="text" value={r.correctiveAction||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],correctiveAction:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                        <td style={tdCell}><input type="text" value={r.checkedBy||""} onChange={e=>{const n=[...editRows];n[idx]={...n[idx],checkedBy:e.target.value};setEditRows(n);}} style={inputStyle}/></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12}}>
                <strong>Verified by:</strong>
                {!editing?(<span style={{display:"inline-block",minWidth:260,borderBottom:"2px solid #1f3b70",lineHeight:"1.8"}}>{safe(record.payload?.verifiedBy)}</span>):(<input value={footer.verifiedBy} onChange={e=>setFooter(p=>({...p,verifiedBy:e.target.value}))} style={{border:"none",borderBottom:"2px solid #1f3b70",padding:"4px 6px",outline:"none",fontSize:12,color:"#0b1f4d"}}/>)}
              </div>
              <div style={{marginTop:8,fontSize:11,color:"#0b1f4d"}}><strong>NOTE:</strong> Any glass items found defective or not within the standards should be removed from the section.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12,fontSize:12}}>
                <div><strong>Rev. Date:</strong> {!editing?safe(record.payload?.revDate):(<input type="date" value={footer.revDate} onChange={e=>setFooter(p=>({...p,revDate:e.target.value}))} style={inputStyle}/>)}</div>
                <div><strong>Rev. No:</strong> {!editing?safe(record.payload?.revNo):(<input value={footer.revNo} onChange={e=>setFooter(p=>({...p,revNo:e.target.value}))} style={inputStyle}/>)}</div>
              </div>
            </div>
          </div>)}
        </div>
      </div>
    </div>
  );
}
