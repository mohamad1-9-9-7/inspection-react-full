// src/pages/monitor/branches/pos19/pos19_views/EquipmentInspectionSanitizingLogView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && (process.env.REACT_APP_API_URL || process.env.VITE_API_URL || process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_equipment_inspection";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/EQP/02";

const SLOTS = [
  { key: "s_8_9_AM",  label: "8-9 AM" },
  { key: "s_12_1_PM", label: "12-1 PM" },
  { key: "s_4_5_PM",  label: "4-5 PM" },
  { key: "s_8_9_PM",  label: "8-9 PM" },
  { key: "s_12_1_AM", label: "12-1 AM" },
];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, cursor: "pointer" });
const formatDMY = (iso) => { if (!iso) return iso; const [y,m,d] = iso.split("-"); return `${d}/${m}/${y}`; };

function emptyRow() {
  const base = { equipment: "", freeFromDamage: "", freeFromBrokenPieces: "", correctiveAction: "", checkedByRow: "" };
  SLOTS.forEach(s => (base[s.key] = ""));
  return base;
}

export default function EquipmentInspectionSanitizingLogView() {
  const reportRef   = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai  = useMemo(() => { try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); } catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; } }, []);

  const [date, setDate]                   = useState(todayDubai);
  const [loading, setLoading]             = useState(false);
  const [err, setErr]                     = useState("");
  const [record, setRecord]               = useState(null);
  const [editing, setEditing]             = useState(false);
  const [editRows, setEditRows]           = useState([]);
  const [allDates, setAllDates]           = useState([]);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const thCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", whiteSpace:"pre-line", fontWeight:700, background:"#f5f8ff", color:"#0b1f4d" };
  const tdCell = { border:"1px solid #1f3b70", padding:"6px 4px", textAlign:"center", verticalAlign:"middle" };
  const inputStyle = { width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" };

  const colDefs = useMemo(() => [
    <col key="equip" style={{ width:280 }} />, <col key="fd" style={{ width:140 }} />, <col key="fb" style={{ width:160 }} />,
    ...SLOTS.map((_,i) => <col key={`s${i}`} style={{ width:90 }} />),
    <col key="corr" style={{ width:220 }} />, <col key="chk" style={{ width:140 }} />,
  ], []);

  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache:"no-store" });
      const data = await res.json(); const list = Array.isArray(data) ? data : data?.data ?? [];
      const filtered = list.map(r=>r?.payload).filter(p=>p&&p.branch===BRANCH&&p.reportDate);
      const uniq = Array.from(new Set(filtered.map(p=>p.reportDate))).sort((a,b)=>b.localeCompare(a));
      setAllDates(uniq);
      if (uniq.length) { const [y,m]=uniq[0].split("-"); setExpandedYears(p=>({...p,[y]:true})); setExpandedMonths(p=>({...p,[`${y}-${m}`]:true})); }
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch(e) { console.warn(e); }
  }

  async function fetchRecord(d=date) {
    setLoading(true); setErr(""); setRecord(null); setEditRows([]);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache:"no-store" });
      const data = await res.json(); const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find(r=>r?.payload?.branch===BRANCH&&r?.payload?.reportDate===d)||null;
      if (match?.payload) match.payload.formRef = FORM_REF;
      setRecord(match);
      const rows = match?.payload?.entries ?? [];
      setEditRows(rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
      setEditing(false);
    } catch(e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) { setEditing(false); setEditRows(record?.payload?.entries||[]); return; }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditRows(record?.payload?.entries ? JSON.parse(JSON.stringify(record.payload.entries)) : [emptyRow()]);
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    for (const r of editRows) {
      const risky = r.freeFromDamage==="No"||r.freeFromBrokenPieces==="No"||SLOTS.some(s=>r[s.key]==="✗");
      if (risky && !String(r.correctiveAction||"").trim()) { alert("هناك صف به (✗ أو No) بدون Corrective Action."); return; }
    }
    const rid = getId(record);
    const payload = { ...(record?.payload||{}), formRef:FORM_REF, branch:BRANCH, reportDate:record?.payload?.reportDate, entries:editRows, savedAt:Date.now() };
    try {
      setLoading(true);
      if (rid) { try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method:"DELETE" }); } catch(e) { console.warn(e); } }
      const postRes = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ reporter:"pos19", type:TYPE, payload }) });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);
      alert("✅ Changes saved"); setEditing(false);
      await fetchRecord(payload.reportDate); await fetchAllDates();
    } catch(e) { console.error(e); alert("❌ Saving failed.\n"+String(e?.message||e)); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(record); if (!rid) return alert("⚠️ Missing record id.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method:"DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted"); await fetchAllDates();
      setDate(allDates.find(d=>d!==record?.payload?.reportDate)||todayDubai);
    } catch(e) { console.error(e); alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  function exportJSON() {
    if (!record) return;
    const out = { type:TYPE, payload:{ ...record.payload, formRef:FORM_REF } };
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out,null,2)],{type:"application/json"}));
    a.download = `POS19_EquipmentInspection_${record?.payload?.reportDate||date}.json`; a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
      const p = record?.payload||{}; const rows = Array.isArray(p.entries) ? p.entries : [];
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Equipment Log");
      const border = { top:{style:"thin",color:{argb:"1F3B70"}}, left:{style:"thin",color:{argb:"1F3B70"}}, bottom:{style:"thin",color:{argb:"1F3B70"}}, right:{style:"thin",color:{argb:"1F3B70"}} };
      const HEADERS = ["Equipment's","Free from damage (yes/no)","Free from broken pieces (yes/no)",...SLOTS.map(s=>s.label),"Corrective Action","Checked by"];
      ws.columns = [{ width:40 },{ width:18 },{ width:28 },...SLOTS.map(()=>({width:10})),{ width:28 },{ width:14 }];
      ws.mergeCells(1,1,1,HEADERS.length);
      const r1 = ws.getCell(1,1); r1.value = `POS 19 | Equipment Inspection & Sanitizing Log — ${FORM_REF}`;
      r1.alignment = {horizontal:"center",vertical:"middle"}; r1.font = {bold:true,size:13};
      r1.fill = {type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}}; ws.getRow(1).height = 22;
      ws.mergeCells(2,1,2,HEADERS.length);
      const r2 = ws.getCell(2,1); r2.value = `Branch: ${BRANCH} | Section: ${safe(p.section)} | Date: ${safe(p.reportDate)} | Classification: ${safe(p.classification||"Official")}`;
      r2.alignment = {horizontal:"center",vertical:"middle"}; ws.getRow(2).height = 18;
      const hr = ws.getRow(4); hr.values = HEADERS;
      hr.eachCell(cell => { cell.font={bold:true}; cell.alignment={horizontal:"center",vertical:"middle",wrapText:true}; cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"F5F8FF"}}; cell.border=border; });
      hr.height = 28;
      let rIdx = 5;
      rows.forEach(row => {
        ws.getRow(rIdx).values = [safe(row.equipment),safe(row.freeFromDamage),safe(row.freeFromBrokenPieces),...SLOTS.map(s=>safe(row[s.key])),safe(row.correctiveAction),safe(row.checkedByRow)];
        ws.getRow(rIdx).eachCell(cell => { cell.alignment={horizontal:"center",vertical:"middle",wrapText:true}; cell.border=border; });
        rIdx++;
      });
      const buf = await wb.xlsx.writeBuffer();
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
      a.download = `POS19_EquipmentInspection_${p.reportDate||date}.xlsx`; a.click(); URL.revokeObjectURL(a.href);
    } catch(e) { console.error(e); alert("⚠️ XLSX export failed."); }
  }

  async function exportPDF() {
    if (!reportRef.current) return;
    const node = reportRef.current;
    const canvas = await html2canvas(node, { scale:2, windowWidth:node.scrollWidth, windowHeight:node.scrollHeight });
    const pdf = new jsPDF("l","pt","a4");
    const pageW=pdf.internal.pageSize.getWidth(), pageH=pdf.internal.pageSize.getHeight(), margin=20, headerH=50;
    const drawHeader = () => {
      pdf.setFillColor(233,240,255); pdf.rect(0,0,pageW,headerH,"F");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(13);
      pdf.text(`POS 19 | Equipment Inspection & Sanitizing Log — ${record?.payload?.reportDate||date}`, pageW/2, 28, { align:"center" });
    };
    drawHeader();
    const usableW=pageW-margin*2, ratio=usableW/canvas.width, availH=pageH-(headerH+10)-margin;
    let ypx=0;
    while (ypx<canvas.height) {
      const sliceH=Math.min(canvas.height-ypx,availH/ratio);
      const pc=document.createElement("canvas"); pc.width=canvas.width; pc.height=sliceH;
      pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);
      pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);
      ypx+=sliceH; if (ypx<canvas.height) { pdf.addPage("a4","l"); drawHeader(); }
    }
    pdf.save(`POS19_EquipmentInspection_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()); const payload = parsed?.payload||parsed;
      if (!payload?.reportDate) throw new Error("Missing reportDate");
      payload.formRef = FORM_REF; setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ reporter:"pos19", type:TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Imported"); setDate(payload.reportDate); await fetchAllDates(); await fetchRecord(payload.reportDate);
    } catch(e) { console.error(e); alert("❌ Invalid JSON or save failed"); }
    finally { if (fileInputRef.current) fileInputRef.current.value=""; setLoading(false); }
  }

  const grouped = useMemo(() => {
    const out={};
    for (const d of allDates) { const [y,m]=d.split("-"); (out[y]||={}); (out[y][m]||=[]).push(d); }
    for (const y of Object.keys(out)) out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort((a,b)=>a.localeCompare(b))]));
    return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));
  }, [allDates]);

  const toggleYear=(y)=>setExpandedYears(p=>({...p,[y]:!p[y]}));
  const toggleMonth=(y,m)=>setExpandedMonths(p=>({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>Equipment Inspection &amp; Sanitizing Log — View (POS 19)</div>
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"Edit (password)"}</button>
          {editing && <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>
          <button onClick={exportXLSX} disabled={!record?.payload?.entries?.length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{ ...btn("#059669"), display:"inline-block" }}>Import JSON<input ref={fileInputRef} type="file" accept="application/json" onChange={e=>importJSON(e.target.files?.[0])} style={{ display:"none" }} /></label>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        {/* Date Tree */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(grouped).length ? Object.entries(grouped).map(([year,months]) => {
              const yOpen=!!expandedYears[year];
              return (
                <div key={year} style={{ marginBottom:8 }}>
                  <button onClick={()=>toggleYear(year)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontWeight:800 }}>
                    <span>Year {year}</span><span>{yOpen?"▾":"▸"}</span>
                  </button>
                  {yOpen && Object.entries(months).map(([month,days]) => {
                    const key=`${year}-${month}`; const mOpen=!!expandedMonths[key];
                    return (
                      <div key={key} style={{ marginTop:6, marginLeft:8 }}>
                        <button onClick={()=>toggleMonth(year,month)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", width:"100%", padding:"6px 10px", borderRadius:8, border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontWeight:700 }}>
                          <span>Month {month}</span><span>{mOpen?"▾":"▸"}</span>
                        </button>
                        {mOpen && <ul style={{ listStyle:"none", padding:"6px 2px 0 2px", margin:0 }}>
                          {days.map(d=>(
                            <li key={d} style={{ marginBottom:6 }}>
                              <button onClick={()=>setDate(d)} style={{ width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8, border:"1px solid #d1d5db", background:d===date?"#2563eb":"#fff", color:d===date?"#fff":"#111827", fontWeight:700, cursor:"pointer" }}>{formatDMY(d)}</button>
                            </li>
                          ))}
                        </ul>}
                      </div>
                    );
                  })}
                </div>
              );
            }) : <div style={{ color:"#6b7280" }}>No available dates.</div>}
          </div>
        </div>

        {/* Report */}
        <div>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}
          {!loading && !err && !record && <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>No report for this date.</div>}
          {record && (
            <div ref={reportRef}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:8, fontSize:12 }}>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
                <div><strong>Form Ref:</strong> {FORM_REF}</div>
                <div><strong>Classification:</strong> {safe(record.payload?.classification||"Official")}</div>
              </div>
              <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                <div style={{ ...thCell, background:"#e9f0ff" }}>Sanitize every 4 hours</div>
                <div style={{ fontSize:11, textAlign:"center", padding:"6px 0" }}><strong>Legend: (√) — Satisfactory ; (✗) — Needs Improvement</strong></div>
              </div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Equipment's</th>
                      <th style={thCell}>Free from{"\n"}damage{"\n"}(yes/no)</th>
                      <th style={thCell}>Free from{"\n"}broken pieces{"\n"}(yes/no)</th>
                      {SLOTS.map(s=><th key={s.key} style={thCell}>{s.label}</th>)}
                      <th style={thCell}>Corrective{"\n"}Action</th>
                      <th style={thCell}>Checked{"\n"}by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      record.payload?.entries?.length ? record.payload.entries.map((r,idx)=>(
                        <tr key={idx}>
                          <td style={tdCell}>{safe(r.equipment)}</td>
                          <td style={tdCell}>{safe(r.freeFromDamage)}</td>
                          <td style={tdCell}>{safe(r.freeFromBrokenPieces)}</td>
                          {SLOTS.map(s=><td key={s.key} style={tdCell}>{safe(r[s.key])}</td>)}
                          <td style={tdCell}>{safe(r.correctiveAction)}</td>
                          <td style={tdCell}>{safe(r.checkedByRow)}</td>
                        </tr>
                      )) : <tr><td style={{ ...tdCell, textAlign:"center" }} colSpan={3+SLOTS.length+2}>— No data —</td></tr>
                    ) : (
                      editRows.map((r,i)=>{
                        const risky=r.freeFromDamage==="No"||r.freeFromBrokenPieces==="No"||SLOTS.some(s=>r[s.key]==="✗");
                        return (
                          <tr key={i}>
                            <td style={tdCell}><input value={r.equipment||""} onChange={e=>{const n=[...editRows];n[i]={...n[i],equipment:e.target.value};setEditRows(n);}} style={inputStyle} /></td>
                            <td style={tdCell}>
                              <select value={r.freeFromDamage||""} onChange={e=>{const n=[...editRows];n[i]={...n[i],freeFromDamage:e.target.value};setEditRows(n);}} style={inputStyle}>
                                <option value=""></option><option value="Yes">Yes</option><option value="No">No</option>
                              </select>
                            </td>
                            <td style={tdCell}>
                              <select value={r.freeFromBrokenPieces||""} onChange={e=>{const n=[...editRows];n[i]={...n[i],freeFromBrokenPieces:e.target.value};setEditRows(n);}} style={inputStyle}>
                                <option value=""></option><option value="Yes">Yes</option><option value="No">No</option>
                              </select>
                            </td>
                            {SLOTS.map(s=>(
                              <td key={s.key} style={tdCell}>
                                <select value={r[s.key]||""} onChange={e=>{const n=[...editRows];n[i]={...n[i],[s.key]:e.target.value};setEditRows(n);}} style={{ ...inputStyle, background:r[s.key]==="√"?"#e7f7ec":r[s.key]==="✗"?"#fde8e8":"#fff" }}>
                                  <option value=""></option><option value="√">√</option><option value="✗">✗</option>
                                </select>
                              </td>
                            ))}
                            <td style={tdCell}><input value={r.correctiveAction||""} onChange={e=>{const n=[...editRows];n[i]={...n[i],correctiveAction:e.target.value};setEditRows(n);}} style={{ ...inputStyle, background:risky?"#fff7ed":"#fff" }} placeholder={risky?"Required when ✗ or No":""} /></td>
                            <td style={tdCell}><input value={r.checkedByRow||""} onChange={e=>{const n=[...editRows];n[i]={...n[i],checkedByRow:e.target.value};setEditRows(n);}} style={inputStyle} /></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, marginTop:12, fontSize:12 }}>
                <div><strong>Verified by:</strong> {safe(record.payload?.verifiedBy)}</div>
                <div><strong>Rev.Date:</strong> {safe(record.payload?.revDate)}</div>
                <div><strong>Rev.No:</strong> {safe(record.payload?.revNo)}</div>
                <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
