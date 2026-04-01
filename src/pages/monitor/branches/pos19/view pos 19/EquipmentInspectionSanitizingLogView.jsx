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

const TYPE     = "pos19_equipment_inspection";
const BRANCH   = "WARQA KITCHEN";
const FORM_REF = "FS-HACCP/KTCH/EQP/02";

const SLOTS = [
  { key: "s_8_9_AM",  label: "8-9 AM" },
  { key: "s_12_1_PM", label: "12-1 PM" },
  { key: "s_4_5_PM",  label: "4-5 PM" },
  { key: "s_8_9_PM",  label: "8-9 PM" },
  { key: "s_12_1_AM", label: "12-1 AM" },
];

const safe      = (v) => v ?? "";
const getId     = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const formatDMY = (iso) => {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

async function loadImageDataURL(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function emptyRow() {
  const base = { equipment: "", freeFromDamage: "", freeFromBrokenPieces: "", correctiveAction: "", checkedByRow: "" };
  SLOTS.forEach(s => (base[s.key] = ""));
  return base;
}

/* ── Design tokens ── */
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
  gray100:   "#f3f4f6",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray700:   "#374151",
  white:     "#ffffff",
  border:    "#dbeafe",
};

const actionBtn = (bg, disabled = false) => ({
  background: disabled ? C.gray200 : bg,
  color: disabled ? C.gray400 : C.white,
  border: "none",
  borderRadius: 8,
  padding: "7px 13px",
  fontWeight: 700,
  fontSize: 12,
  cursor: disabled ? "not-allowed" : "pointer",
  transition: "opacity .15s",
  whiteSpace: "nowrap",
});

const thCell = {
  border: `1px solid ${C.navy}`,
  padding: "7px 5px",
  textAlign: "center",
  whiteSpace: "pre-line",
  fontWeight: 700,
  fontSize: 11,
  background: "#dbeafe",
  color: C.navy,
  lineHeight: 1.35,
};
const tdCell = {
  border: `1px solid #bfdbfe`,
  padding: "6px 5px",
  textAlign: "center",
  verticalAlign: "middle",
  fontSize: 12,
  background: C.white,
};
const tdAlt = { ...tdCell, background: "#f8faff" };

export default function EquipmentInspectionSanitizingLogView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  }, []);

  const [date, setDate]           = useState(todayDubai);
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");
  const [record, setRecord]       = useState(null);
  const [editing, setEditing]     = useState(false);
  const [editRows, setEditRows]   = useState([]);
  const [allDates, setAllDates]   = useState([]);
  const [expandedYears, setExpandedYears]   = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  const gridStyle = useMemo(() => ({
    width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12,
  }), []);

  const colDefs = useMemo(() => ([
    <col key="equip"      style={{ width: 260 }} />,
    <col key="freeDamage" style={{ width: 130 }} />,
    <col key="freeBroken" style={{ width: 155 }} />,
    ...SLOTS.map((_, i) => <col key={`s${i}`} style={{ width: 85 }} />),
    <col key="corr"       style={{ width: 200 }} />,
    <col key="chk"        style={{ width: 130 }} />,
  ]), []);

  /* ── Fetch ── */
  async function fetchAllDates() {
    try {
      const res = await fetch(`${API_BASE}/api/reports?${new URLSearchParams({ type: TYPE })}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const uniq = Array.from(new Set(
        list.map(r => r?.payload).filter(p => p?.branch === BRANCH && p?.reportDate).map(p => p.reportDate)
      )).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);
      if (uniq.length) {
        const [y, m] = uniq[0].split("-");
        setExpandedYears(p => ({ ...p, [y]: true }));
        setExpandedMonths(p => ({ ...p, [`${y}-${m}`]: true }));
        if (!uniq.includes(date)) setDate(uniq[0]);
      }
    } catch (e) { console.warn("fetchAllDates:", e); }
  }

  async function fetchRecord(d = date) {
    setLoading(true); setErr(""); setRecord(null); setEditRows([]);
    try {
      const res = await fetch(`${API_BASE}/api/reports?${new URLSearchParams({ type: TYPE })}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];
      const match = list.find(r => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      if (match?.payload) match.payload.formRef = FORM_REF;
      setRecord(match);
      const rows = match?.payload?.entries ?? [];
      setEditRows(rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
      setEditing(false);
    } catch (e) { console.error(e); setErr("Failed to fetch data."); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  /* ── Edit / Save / Delete ── */
  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      setEditing(false);
      setEditRows(record?.payload?.entries ? JSON.parse(JSON.stringify(record.payload.entries)) : [emptyRow()]);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditRows(record?.payload?.entries ? JSON.parse(JSON.stringify(record.payload.entries)) : [emptyRow()]);
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;
    for (const r of editRows) {
      const risky = r.freeFromDamage === "No" || r.freeFromBrokenPieces === "No" || SLOTS.some(s => r[s.key] === "✗");
      if (risky && !String(r.correctiveAction || "").trim()) { alert("صف به (✗/No) بدون Corrective Action."); return; }
    }
    const rid = getId(record);
    const payload = { ...(record?.payload || {}), formRef: FORM_REF, branch: BRANCH, reportDate: record?.payload?.reportDate, entries: editRows, savedAt: Date.now() };
    try {
      setLoading(true);
      if (rid) { try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" }); } catch {} }
      const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Changes saved");
      setEditing(false);
      await fetchRecord(payload.reportDate);
      await fetchAllDates();
    } catch (e) { alert("❌ Saving failed.\n" + String(e?.message || e)); }
    finally { setLoading(false); }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure?")) return;
    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted");
      await fetchAllDates();
      setDate(allDates.find(d => d !== record?.payload?.reportDate) || todayDubai);
    } catch (e) { alert("❌ Delete failed."); }
    finally { setLoading(false); }
  }

  /* ── Export / Import ── */
  function exportJSON() {
    if (!record) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ type: TYPE, payload: { ...record.payload, formRef: FORM_REF } }, null, 2)], { type: "application/json" }));
    a.download = `EquipmentInspection_${record?.payload?.reportDate || date}.json`;
    a.click(); URL.revokeObjectURL(a.href);
  }

  async function exportXLSX() {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const p = record?.payload || {};
      const rows = Array.isArray(p.entries) ? p.entries : [];
      const reportDate = p.reportDate || date;
      const HEADERS = ["Equipment's", "Free from damage (yes/no)", "Free from broken metal/plastic pieces (yes/no)", ...SLOTS.map(s => s.label), "Corrective Action (if any)", "Checked by"];
      const lastCol = HEADERS.length;
      const BLUE = "1E3A5F"; const SKY = "DBEAFE"; const HEAD = "EFF6FF";
      const border = { top:{style:"thin",color:{argb:BLUE}}, left:{style:"thin",color:{argb:BLUE}}, bottom:{style:"thin",color:{argb:BLUE}}, right:{style:"thin",color:{argb:BLUE}} };
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Equipment Log", { views:[{showGridLines:false}], pageSetup:{paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1} });
      ws.columns = [{width:38},{width:18},{width:30},...SLOTS.map(()=>({width:10})),{width:26},{width:14}];

      // Title
      ws.mergeCells(1,1,1,lastCol);
      Object.assign(ws.getCell(1,1), { value:`WARQA KITCHEN — Equipment Inspection & Sanitizing Log`, alignment:{horizontal:"center",vertical:"middle"}, font:{bold:true,size:14,color:{argb:BLUE}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:SKY}} });
      ws.getRow(1).height = 26;

      // Meta row
      ws.mergeCells(2,1,2,5);
      ws.mergeCells(2,6,2,8);
      ws.mergeCells(2,9,2,lastCol);
      const metaStyle = { alignment:{vertical:"middle"}, font:{size:11}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:"F8FAFF"}}, border };
      Object.assign(ws.getCell(2,1), { value:`Form Ref: ${FORM_REF}`, ...metaStyle });
      Object.assign(ws.getCell(2,6), { value:`Branch: ${BRANCH}`, ...metaStyle });
      Object.assign(ws.getCell(2,9), { value:`Section: ${safe(p.section)}   |   Classification: ${safe(p.classification||"Official")}`, ...metaStyle });
      ws.getRow(2).height = 20;

      // Band
      ws.mergeCells(3,1,3,lastCol);
      Object.assign(ws.getCell(3,1), { value:"Sanitize every 4 hours", alignment:{horizontal:"center",vertical:"middle"}, font:{bold:true,color:{argb:BLUE}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:SKY}}, border });
      // Legend
      ws.mergeCells(4,1,4,lastCol);
      Object.assign(ws.getCell(4,1), { value:"(LEGEND: (√) – For Satisfactory  &  (✗) – For Needs Improvement)", alignment:{horizontal:"center",vertical:"middle"}, font:{size:10,italic:true}, border });

      // Table header
      HEADERS.forEach((txt,i) => {
        Object.assign(ws.getCell(5,i+1), { value:txt, alignment:{horizontal:"center",vertical:"middle",wrapText:true}, font:{bold:true,color:{argb:BLUE}}, fill:{type:"pattern",pattern:"solid",fgColor:{argb:HEAD}}, border });
      });
      ws.getRow(5).height = 30;

      // Data
      let rIdx = 6;
      if (!rows.length) { for(let c=1;c<=lastCol;c++) Object.assign(ws.getCell(rIdx,c),{value:"—",alignment:{horizontal:"center"},border}); rIdx++; }
      else rows.forEach(row => {
        let c=1;
        const put=(v,align="center")=>{ Object.assign(ws.getCell(rIdx,c++),{value:v,alignment:{horizontal:align,vertical:"middle",wrapText:true},border}); };
        put(safe(row.equipment),"left"); put(safe(row.freeFromDamage)); put(safe(row.freeFromBrokenPieces));
        SLOTS.forEach(s => {
          const v=safe(row[s.key]); const cell=ws.getCell(rIdx,c++);
          Object.assign(cell,{value:v,alignment:{horizontal:"center",vertical:"middle"},border});
          if(v==="√") cell.font={bold:true,color:{argb:"166534"}};
          if(v==="✗") cell.font={bold:true,color:{argb:"B91C1C"}};
        });
        put(safe(row.correctiveAction),"left"); put(safe(row.checkedByRow));
        ws.getRow(rIdx).height=20; rIdx++;
      });

      // Footer
      rIdx++;
      ws.mergeCells(rIdx,1,rIdx,6);
      ws.mergeCells(rIdx,7,rIdx,lastCol);
      Object.assign(ws.getCell(rIdx,1), { value:`Verified by: ${safe(p.verifiedBy)}`, alignment:{horizontal:"left",vertical:"middle"}, font:{bold:true}, border });
      Object.assign(ws.getCell(rIdx,7), { value:`Date: ${safe(reportDate)}`, alignment:{horizontal:"left",vertical:"middle"}, font:{bold:true}, border });
      ws.getRow(rIdx).height=20;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([await wb.xlsx.writeBuffer()],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));
      a.download = `EquipmentInspection_${reportDate}.xlsx`;
      a.click(); URL.revokeObjectURL(a.href);
    } catch(e) { console.error(e); alert("⚠️ فشل إنشاء XLSX.\n"+(e?.message||e)); }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const payload = (JSON.parse(await file.text()))?.payload;
      if (!payload?.reportDate) throw new Error("missing reportDate");
      payload.formRef = FORM_REF;
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({reporter:"pos19",type:TYPE,payload}) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Imported");
      setDate(payload.reportDate);
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
      pdf.text(`WARQA KITCHEN | Equipment Inspection & Sanitizing Log — ${record?.payload?.reportDate||date}`, pageW/2, 30, {align:"center"});
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
    pdf.save(`EquipmentInspection_${record?.payload?.reportDate||date}.pdf`);
  }

  /* ── Grouping ── */
  const grouped = useMemo(() => {
    const out={};
    for(const d of allDates){const[y,m]=d.split("-");(out[y]||={}); (out[y][m]||=[]).push(d);}
    for(const y of Object.keys(out)) out[y]=Object.fromEntries(Object.entries(out[y]).sort(([a],[b])=>Number(a)-Number(b)).map(([m,arr])=>[m,arr.sort()]));
    return Object.fromEntries(Object.entries(out).sort(([a],[b])=>Number(a)-Number(b)));
  }, [allDates]);

  const toggleYear  = y    => setExpandedYears(p  => ({...p,[y]:!p[y]}));
  const toggleMonth = (y,m)=> setExpandedMonths(p => ({...p,[`${y}-${m}`]:!p[`${y}-${m}`]}));

  /* ── Inline edit helper ── */
  const upd = (i, key, val) => { const next=[...editRows]; next[i]={...next[i],[key]:val}; setEditRows(next); };

  /* ── UI ── */
  return (
    <div style={{ background:C.gray50, minHeight:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.gray700, direction:"ltr" }}>

      {/* ── Top bar ── */}
      <div style={{ background:`linear-gradient(135deg, ${C.navy} 0%, ${C.navyLight} 100%)`, padding:"14px 20px", display:"flex", alignItems:"center", gap:12, borderRadius:"12px 12px 0 0", flexWrap:"wrap" }}>
        <div>
          <div style={{ color:C.white, fontWeight:800, fontSize:17, letterSpacing:.3 }}>Equipment Inspection &amp; Sanitizing Log</div>
          <div style={{ color:"#93c5fd", fontSize:12, marginTop:2 }}>WARQA KITCHEN — View Mode</div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:7, flexWrap:"wrap", alignItems:"center" }}>
          <button onClick={toggleEdit}   style={actionBtn(editing?"#6b7280":"#7c3aed")}>{editing?"Cancel Edit":"✏️ Edit"}</button>
          {editing && <button onClick={saveEdit} style={actionBtn("#10b981")}>💾 Save</button>}
          <button onClick={handleDelete} style={actionBtn(C.red)}>🗑 Delete</button>
          <button onClick={exportXLSX}   style={actionBtn("#0ea5e9", !record?.payload?.entries?.length)} disabled={!record?.payload?.entries?.length}>📊 XLSX</button>
          <button onClick={exportJSON}   style={actionBtn("#0284c7", !record)} disabled={!record}>📄 JSON</button>
          <button onClick={exportPDF}    style={actionBtn(C.gray700)}>🖨 PDF</button>
          <label  style={{...actionBtn("#059669"), display:"inline-block", cursor:"pointer"}}>
            📥 Import
            <input ref={fileInputRef} type="file" accept="application/json" onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}} />
          </label>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:"grid", gridTemplateColumns:"260px 1fr", gap:0, background:C.white, borderRadius:"0 0 12px 12px", border:`1px solid ${C.border}`, borderTop:"none" }}>

        {/* ── Date tree ── */}
        <div style={{ borderRight:`1px solid ${C.border}`, padding:14, background:C.gray50 }}>
          <div style={{ fontWeight:800, fontSize:13, marginBottom:10, color:C.navy, letterSpacing:.3 }}>📅 Date Tree</div>
          <div style={{ maxHeight:480, overflowY:"auto" }}>
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

        {/* ── Report ── */}
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
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
                {[
                  ["📅 Date",           safe(record.payload?.reportDate)],
                  ["🏢 Branch",          safe(record.payload?.branch)],
                  ["📋 Form Ref.",       FORM_REF],
                  ["🏷 Classification",  safe(record.payload?.classification||"Official")],
                ].map(([label,val])=>(
                  <div key={label} style={{background:C.accentBg,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
                    <div style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",marginBottom:3}}>{label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.navy,wordBreak:"break-all"}}>{val||"—"}</div>
                  </div>
                ))}
              </div>

              {/* ── Section ── */}
              {record.payload?.section && (
                <div style={{background:C.tealBg,border:`1px solid #99f6e4`,borderRadius:8,padding:"8px 14px",marginBottom:12,fontSize:12,color:C.teal,fontWeight:600}}>
                  Section: {record.payload.section}
                </div>
              )}

              {/* ── Legend band ── */}
              <div style={{background:`linear-gradient(90deg,${C.navy},${C.navyLight})`,borderRadius:"8px 8px 0 0",padding:"9px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{color:C.white,fontWeight:800,fontSize:13}}>Sanitize every 4 hours</span>
                <span style={{color:"#93c5fd",fontSize:11}}>✔ Satisfactory &nbsp;|&nbsp; ✗ Needs Improvement</span>
              </div>

              {/* ── Table ── */}
              <div style={{overflowX:"auto",border:`1px solid ${C.border}`,borderTop:"none",borderRadius:"0 0 8px 8px",marginBottom:14}}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Equipment's</th>
                      <th style={thCell}>Free from{"\n"}damage{"\n"}(yes/no)</th>
                      <th style={thCell}>Free from broken{"\n"}metal/plastic pieces{"\n"}(yes/no)</th>
                      {SLOTS.map(s=><th key={s.key} style={thCell}>{s.label}</th>)}
                      <th style={thCell}>Corrective{"\n"}Action</th>
                      <th style={thCell}>Checked{"\n"}by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      record.payload?.entries?.length ? record.payload.entries.map((r,idx)=>{
                        const td = idx%2===0 ? tdCell : tdAlt;
                        return (
                          <tr key={idx}>
                            <td style={{...td,textAlign:"left",fontWeight:600}}>{safe(r.equipment)}</td>
                            <td style={{...td,color: r.freeFromDamage==="No"?C.red:r.freeFromDamage==="Yes"?C.green:C.gray700, fontWeight:600}}>{safe(r.freeFromDamage)}</td>
                            <td style={{...td,color: r.freeFromBrokenPieces==="No"?C.red:r.freeFromBrokenPieces==="Yes"?C.green:C.gray700, fontWeight:600}}>{safe(r.freeFromBrokenPieces)}</td>
                            {SLOTS.map(s=>(
                              <td key={s.key} style={{...td, background:r[s.key]==="√"?"#dcfce7":r[s.key]==="✗"?"#fee2e2":td.background, color:r[s.key]==="√"?C.green:r[s.key]==="✗"?C.red:C.gray700, fontWeight:700, fontSize:14}}>
                                {safe(r[s.key])}
                              </td>
                            ))}
                            <td style={{...td,textAlign:"left",fontSize:11}}>{safe(r.correctiveAction)}</td>
                            <td style={td}>{safe(r.checkedByRow)}</td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={3+SLOTS.length+2} style={{...tdCell,color:C.gray400,padding:20}}>— No data —</td></tr>
                      )
                    ) : (
                      editRows.map((r,i)=>{
                        const risky = r.freeFromDamage==="No"||r.freeFromBrokenPieces==="No"||SLOTS.some(s=>r[s.key]==="✗");
                        const inp = {width:"100%",border:`1px solid ${C.border}`,borderRadius:6,padding:"4px 6px",fontSize:11,boxSizing:"border-box"};
                        return (
                          <tr key={i} style={{background:i%2===0?C.white:"#f8faff"}}>
                            <td style={tdCell}><input value={r.equipment||""} onChange={e=>upd(i,"equipment",e.target.value)} style={inp}/></td>
                            <td style={tdCell}>
                              <select value={r.freeFromDamage||""} onChange={e=>upd(i,"freeFromDamage",e.target.value)} style={inp}>
                                <option value=""/><option value="Yes">Yes</option><option value="No">No</option>
                              </select>
                            </td>
                            <td style={tdCell}>
                              <select value={r.freeFromBrokenPieces||""} onChange={e=>upd(i,"freeFromBrokenPieces",e.target.value)} style={inp}>
                                <option value=""/><option value="Yes">Yes</option><option value="No">No</option>
                              </select>
                            </td>
                            {SLOTS.map(s=>(
                              <td key={s.key} style={tdCell}>
                                <select value={r[s.key]||""} onChange={e=>upd(i,s.key,e.target.value)} style={{...inp,background:r[s.key]==="√"?"#dcfce7":r[s.key]==="✗"?"#fee2e2":"#fff"}}>
                                  <option value=""/><option value="√">√</option><option value="✗">✗</option>
                                </select>
                              </td>
                            ))}
                            <td style={tdCell}><input value={r.correctiveAction||""} onChange={e=>upd(i,"correctiveAction",e.target.value)} placeholder={risky?"Required!":""} style={{...inp,background:risky?"#fff7ed":"#fff"}}/></td>
                            <td style={tdCell}><input value={r.checkedByRow||""} onChange={e=>upd(i,"checkedByRow",e.target.value)} style={inp}/></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Footer ── */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  ["✅ Verified by", safe(record.payload?.verifiedBy)],
                  ["📅 Date",        safe(record.payload?.reportDate)],
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