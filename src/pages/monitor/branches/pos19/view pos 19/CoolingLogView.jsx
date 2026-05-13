// src/pages/monitor/branches/pos19/view pos 19/CoolingLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_cooling_log";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/CL/01";

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background:bg, color:"#fff", border:"none", borderRadius:8, padding:"8px 12px", fontWeight:700, cursor:"pointer" });
const formatDMY = (iso) => { if(!iso) return iso; const m=String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
const isFilledRow = (r={}) => Object.values(r).some(v => String(v ?? "").trim() !== "");
const emptyRow = () => ({ foodItem:"", batchNo:"", cookedTime:"", cookedTemp:"", check2hTime:"", check2hTemp:"", check6hTime:"", check6hTemp:"", destination:"", correctiveAction:"" });

export default function CoolingLogView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai = useMemo(() => { try { return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dubai"}); } catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; } }, []);

  const [date, setDate]         = useState(todayDubai);
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [record, setRecord]     = useState(null);
  const [editRows, setEditRows] = useState([]);
  const [editing, setEditing]   = useState(false);
  const [allDates, setAllDates] = useState([]);
  const [expandedYears, setExpandedYears]   = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const thCell = { border:"1px solid #1f3b70", padding:"8px 6px", textAlign:"center", whiteSpace:"pre-line", fontWeight:700, background:"#f5f8ff", color:"#0b1f4d" };
  const tdCell = { border:"1px solid #1f3b70", padding:"8px 6px", textAlign:"center", verticalAlign:"middle" };
  const inputStyle = { width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"6px 8px" };
  const gridStyle  = { width:"max-content", borderCollapse:"collapse", tableLayout:"fixed", fontSize:13 };

  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache:"no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const uniq = Array.from(new Set(list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate).map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch(e) { console.warn(e); }
  }
  async function fetchRecord(d=date) {
    setLoading(true); setErr(""); setRecord(null); setEditRows([]);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache:"no-store" });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find(r => r?.payload?.branch===BRANCH && r?.payload?.reportDate===d) || null;
      setRecord(match);
      const rows = match?.payload?.entries ?? [];
      setEditRows(rows.length ? JSON.parse(JSON.stringify(rows)) : []);
      setEditing(false);
    } catch(e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";
  function toggleEdit() { if (editing) { const rows=record?.payload?.entries??[]; setEditRows(rows.length?JSON.parse(JSON.stringify(rows)):[]); setEditing(false); return; } if (!askPass("Enable edit mode")) return alert("❌ Wrong password"); setEditing(true); }
  function upd(i, key, val) { setEditRows(p => { const n=[...p]; n[i]={...n[i], [key]:val}; return n; }); }
  function addRow() { setEditRows(p => [...p, emptyRow()]); }
  function delRow(i) { setEditRows(p => p.length===1 ? p : p.filter((_, idx) => idx !== i)); }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password"); if (!record) return;
    const rid = getId(record); const cleaned = editRows.filter(isFilledRow);
    const payload = { ...(record?.payload || {}), branch:BRANCH, reportDate:record?.payload?.reportDate, entries:cleaned, savedAt:Date.now() };
    try {
      setLoading(true);
      if (rid) { try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method:"DELETE" }); } catch {} }
      const r = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ reporter:"pos19", type:TYPE, payload }) });
      if (!r.ok) throw new Error(); alert("✅ Changes saved"); setEditing(false);
      await fetchRecord(payload.reportDate); await fetchAllDates();
    } catch(e) { alert("❌ Saving failed."); } finally { setLoading(false); }
  }
  async function handleDelete() {
    if (!record) return; if (!askPass("Delete confirmation")) return alert("❌ Wrong password"); if (!window.confirm("Are you sure?")) return;
    const rid = getId(record); if (!rid) return alert("⚠️ Missing id.");
    try { setLoading(true); const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method:"DELETE" }); if (!res.ok) throw new Error(); alert("✅ Deleted"); await fetchAllDates(); setDate(allDates.find(d => d !== record?.payload?.reportDate) || todayDubai); }
    catch(e) { alert("❌ Delete failed."); } finally { setLoading(false); }
  }

  function exportJSON() { if (!record) return; const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"})); a.download=`POS19_Cooling_${record?.payload?.reportDate||date}.json`; a.click(); URL.revokeObjectURL(a.href); }
  async function importJSON(file) { if (!file) return; try { const txt=await file.text(); const parsed=JSON.parse(txt); const payload=parsed?.payload||parsed; if (!payload?.reportDate) throw new Error(); setLoading(true); const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})}); if (!res.ok) throw new Error(); alert("✅ Imported"); setDate(payload.reportDate); await fetchAllDates(); await fetchRecord(payload.reportDate); } catch(e) { alert("❌ Invalid JSON or save failed"); } finally { if (fileInputRef.current) fileInputRef.current.value=""; setLoading(false); } }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const p = record?.payload || {}; const rows = (p.entries||[]).filter(isFilledRow);
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Cooling");
      const border = {top:{style:"thin",color:{argb:"1F3B70"}}, left:{style:"thin",color:{argb:"1F3B70"}}, bottom:{style:"thin",color:{argb:"1F3B70"}}, right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS = ["Food Item","Batch No","Cooked Time","Cooked °C (≥60)","2h Time","2h °C (≤21)","6h Time","6h °C (≤5)","Destination","Corrective Action"];
      ws.columns = [{width:20},{width:12},{width:12},{width:13},{width:12},{width:13},{width:12},{width:13},{width:16},{width:22}];
      ws.mergeCells(1,1,1,COL_HEADERS.length);
      const r1 = ws.getCell(1,1); r1.value = `POS 19 | Cooling Temperature Log — ${FORM_REF}`; r1.alignment={horizontal:"center",vertical:"middle"}; r1.font={size:13,bold:true}; r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}}; ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,COL_HEADERS.length); ws.getCell(2,1).value = `Branch: ${BRANCH} | Date: ${safe(p.reportDate)}`; ws.getCell(2,1).alignment={horizontal:"center"}; ws.getRow(2).height=18;
      const hr = ws.getRow(4); hr.values=COL_HEADERS; hr.eachCell(c=>{c.font={bold:true};c.alignment={horizontal:"center",vertical:"middle",wrapText:true};c.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};c.border=border;}); hr.height=28;
      let i = 5; rows.forEach(e => { ws.getRow(i).values=[safe(e.foodItem),safe(e.batchNo),safe(e.cookedTime),safe(e.cookedTemp),safe(e.check2hTime),safe(e.check2hTemp),safe(e.check6hTime),safe(e.check6hTemp),safe(e.destination),safe(e.correctiveAction)]; ws.getRow(i).eachCell(c=>{c.alignment={horizontal:"center",vertical:"middle",wrapText:true};c.border=border;}); ws.getRow(i).height=20; i++; });
      const buf = await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});
      const a = document.createElement("a"); a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})); a.download=`POS19_Cooling_${p.reportDate||date}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
    } catch(e) { console.error(e); alert("⚠️ XLSX export failed."); }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const node = reportRef.current; const canvas = await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf = new jsPDF("l","pt","a4"); const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH = () => { pdf.setFillColor(233,240,255); pdf.rect(0,0,pageW,headerH,"F"); pdf.setFont("helvetica","bold"); pdf.setFontSize(13); pdf.text(`POS 19 | Cooling Log — ${record?.payload?.reportDate||date}`, pageW/2, 28, {align:"center"}); };
    drawH(); const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin; let y=0;
    while (y<canvas.height) { const sliceH=Math.min(canvas.height-y,availH/ratio); const pc=document.createElement("canvas"); pc.width=canvas.width; pc.height=sliceH; pc.getContext("2d").drawImage(canvas,0,y,canvas.width,sliceH,0,0,canvas.width,sliceH); pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio); y+=sliceH; if(y<canvas.height){pdf.addPage("a4","l");drawH();} }
    pdf.save(`POS19_Cooling_${record?.payload?.reportDate||date}.pdf`);
  }

  const grouped = useMemo(() => { const out={}; for (const d of allDates) { const [y,m]=d.split("-"); (out[y]||={}); (out[y][m]||=[]).push(d); } for (const y of Object.keys(out)) out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(b)-Number(a)).map(([m,arr])=>[m,arr.sort((a,b)=>b.localeCompare(a))])); return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(b)-Number(a))); }, [allDates]);
  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]})); const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));
  const rows = record?.payload?.entries || [];

  // Out-of-limit highlight
  const hot = (v) => v && parseFloat(v) > 21;
  const veryHot = (v) => v && parseFloat(v) > 5;
  const cold = (v) => v && parseFloat(v) < 60;

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>Cooling Log — View (POS 19)</div>
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"Edit (password)"}</button>
          {editing && <><button onClick={addRow} style={btn("#0ea5e9")}>+ Row</button><button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button></>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!rows.filter(isFilledRow).length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{ ...btn("#059669"), display:"inline-block" }}>Import JSON<input ref={fileInputRef} type="file" accept="application/json" onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}}/></label>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(grouped).length ? Object.entries(grouped).map(([year, months]) => {
              const yOpen = !!expandedYears[year];
              return (<div key={year} style={{ marginBottom:8 }}>
                <button onClick={()=>toggleYear(year)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontWeight:800 }}><span>Year {year}</span><span>{yOpen?"▾":"▸"}</span></button>
                {yOpen && Object.entries(months).map(([month, days]) => { const key=`${year}-${month}`; const mOpen=!!expandedMonths[key]; return (<div key={key} style={{ marginTop:6, marginLeft:8 }}>
                  <button onClick={()=>toggleMonth(year,month)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontWeight:700 }}><span>Month {month}</span><span>{mOpen?"▾":"▸"}</span></button>
                  {mOpen && <ul style={{ listStyle:"none", padding:"6px 2px 0 2px", margin:0 }}>{days.map(d => (<li key={d} style={{ marginBottom:6 }}><button onClick={()=>setDate(d)} style={{ width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", background:d===date?"#2563eb":"#fff", color:d===date?"#fff":"#111827", fontWeight:700, cursor:"pointer" }}>{formatDMY(d)}</button></li>))}</ul>}
                </div>);})}
              </div>);
            }) : <div style={{ color:"#6b7280" }}>No available dates.</div>}
          </div>
        </div>

        <div>
          {loading && <p>Loading…</p>}{err && <p style={{color:"#b91c1c"}}>{err}</p>}
          {!loading && !err && !record && <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>No report for this date.</div>}
          {record && (
            <div style={{ overflowX:"auto", overflowY:"hidden" }}>
              <div ref={reportRef} style={{ width:"max-content" }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:8, marginBottom:8, fontSize:12, minWidth:1300 }}>
                  <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                  <div><strong>Report Date:</strong> {safe(record.payload?.reportDate)}</div>
                  <div><strong>Form Ref:</strong> {FORM_REF}</div>
                  <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
                </div>

                <table style={gridStyle}>
                  <colgroup>
                    <col style={{width:170}}/><col style={{width:110}}/>
                    <col style={{width:100}}/><col style={{width:100}}/>
                    <col style={{width:100}}/><col style={{width:100}}/>
                    <col style={{width:100}}/><col style={{width:100}}/>
                    <col style={{width:130}}/><col style={{width:200}}/>
                    {editing && <col style={{width:60}}/>}
                  </colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2} style={thCell}>Food Item</th>
                      <th rowSpan={2} style={thCell}>Batch No</th>
                      <th colSpan={2} style={{...thCell, background:"#fee2e2"}}>Cooked (≥60°C)</th>
                      <th colSpan={2} style={{...thCell, background:"#fef3c7"}}>2h Check (≤21°C)</th>
                      <th colSpan={2} style={{...thCell, background:"#dcfce7"}}>6h Check (≤5°C)</th>
                      <th rowSpan={2} style={thCell}>Destination</th>
                      <th rowSpan={2} style={thCell}>Corrective Action</th>
                      {editing && <th rowSpan={2} style={thCell}>—</th>}
                    </tr>
                    <tr>
                      <th style={thCell}>Time</th><th style={thCell}>°C</th>
                      <th style={thCell}>Time</th><th style={thCell}>°C</th>
                      <th style={thCell}>Time</th><th style={thCell}>°C</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? rows.filter(isFilledRow).map((r, i) => (
                      <tr key={i}>
                        <td style={tdCell}>{safe(r.foodItem)}</td>
                        <td style={tdCell}>{safe(r.batchNo)}</td>
                        <td style={tdCell}>{safe(r.cookedTime)}</td>
                        <td style={{...tdCell, ...(cold(r.cookedTemp)?{background:"#fef2f2",color:"#b91c1c",fontWeight:700}:{})}}>{safe(r.cookedTemp)}</td>
                        <td style={tdCell}>{safe(r.check2hTime)}</td>
                        <td style={{...tdCell, ...(hot(r.check2hTemp)?{background:"#fef2f2",color:"#b91c1c",fontWeight:700}:{})}}>{safe(r.check2hTemp)}</td>
                        <td style={tdCell}>{safe(r.check6hTime)}</td>
                        <td style={{...tdCell, ...(veryHot(r.check6hTemp)?{background:"#fef2f2",color:"#b91c1c",fontWeight:700}:{})}}>{safe(r.check6hTemp)}</td>
                        <td style={tdCell}>{safe(r.destination)}</td>
                        <td style={tdCell}>{safe(r.correctiveAction)}</td>
                      </tr>
                    )) : editRows.map((r, i) => (
                      <tr key={i}>
                        <td style={tdCell}><input value={r.foodItem||""} onChange={e=>upd(i,"foodItem",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input value={r.batchNo||""} onChange={e=>upd(i,"batchNo",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input type="time" value={r.cookedTime||""} onChange={e=>upd(i,"cookedTime",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input type="number" step="0.1" value={r.cookedTemp||""} onChange={e=>upd(i,"cookedTemp",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input type="time" value={r.check2hTime||""} onChange={e=>upd(i,"check2hTime",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input type="number" step="0.1" value={r.check2hTemp||""} onChange={e=>upd(i,"check2hTemp",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input type="time" value={r.check6hTime||""} onChange={e=>upd(i,"check6hTime",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input type="number" step="0.1" value={r.check6hTemp||""} onChange={e=>upd(i,"check6hTemp",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input value={r.destination||""} onChange={e=>upd(i,"destination",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><input value={r.correctiveAction||""} onChange={e=>upd(i,"correctiveAction",e.target.value)} style={inputStyle}/></td>
                        <td style={tdCell}><button onClick={()=>delRow(i)} style={btn("#dc2626")}>Del</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop:10, paddingTop:8, borderTop:"2px solid #1f3b70", fontSize:12, color:"#0b1f4d", lineHeight:1.6, width:"max-content" }}>
                  <strong>Note (CCP):</strong> 60°C → 21°C within 2h, 21°C → 5°C within next 4h. Total ≤ 6h.
                </div>

                <div style={{ marginTop:12, width:"100%", display:"flex", justifyContent:"space-between", gap:16, flexWrap:"wrap", alignItems:"center", fontSize:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:"1 1 320px", minWidth:300 }}><strong>Checked by:</strong><span style={{ display:"inline-block", minWidth:260, borderBottom:"2px solid #1f3b70", lineHeight:"1.8" }}>{safe(record.payload?.checkedBy)}</span></div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flex:"1 1 320px", minWidth:300, justifyContent:"flex-end" }}><strong>Verified by:</strong><span style={{ display:"inline-block", minWidth:260, borderBottom:"2px solid #1f3b70", lineHeight:"1.8" }}>{safe(record.payload?.verifiedBy)}</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
