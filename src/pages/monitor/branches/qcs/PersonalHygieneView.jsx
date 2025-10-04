// src/pages/monitor/branches/qcs/PersonalHygieneVIEW.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ===== API مستقل ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" && process.env && (process.env.REACT_APP_API_URL)) ||
  API_ROOT_DEFAULT;
const API_BASE = String(API_ROOT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "qcs-ph";
const IS_SAME_ORIGIN = (() => { try{ return new URL(API_BASE).origin === window.location.origin; }catch{ return false; }})();

/* ===== helpers لنفس النوع ===== */
async function listReports(){
  const r=await fetch(`${REPORTS_URL}?type=${encodeURIComponent(TYPE)}`,{method:"GET",cache:"no-store",credentials:IS_SAME_ORIGIN?"include":"omit",headers:{Accept:"application/json"}});
  if(!r.ok) throw new Error("Failed to list reports"); const j=await r.json().catch(()=>null);
  return Array.isArray(j)?j:j?.data||[];
}
async function listDates(){
  const rows=await listReports();
  const dates=Array.from(new Set(rows.map(r=>String(r?.payload?.reportDate||r?.payload?.date||r?.payload?.header?.reportEntryDate||r?.payload?.meta?.entryDate||"").trim()).filter(Boolean)));
  return dates.sort((a,b)=>b.localeCompare(a));
}
async function getReportByDate(date){
  const rows=await listReports();
  const f=rows.find(r=>{
    const p=r?.payload||{}; const d=String(p.reportDate||p.date||p.header?.reportEntryDate||p.meta?.entryDate||"").trim();
    return d===String(date);
  }); return f?.payload||null;
}
async function getIdByDate(date){
  const rows=await listReports();
  const f=rows.find(r=>{
    const p=r?.payload||{}; const d=String(p.reportDate||p.date||p.header?.reportEntryDate||p.meta?.entryDate||"").trim();
    return d===String(date);
  }); return f?._id||f?.id||null;
}
async function delByDate(date){
  const id=await getIdByDate(date); if(!id) return true;
  const r=await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`,{method:"DELETE",credentials:IS_SAME_ORIGIN?"include":"omit"});
  if(!r.ok && r.status!==404) throw new Error("Failed to delete"); return true;
}

/* ===== ستايل وثوابت ===== */
const LOGO_URL="/brand/al-mawashi.jpg";
const MIN_PH_ROWS=21;
const thB=(c=false)=>({border:"1px solid #000",padding:"6px 4px",fontWeight:800,textAlign:c?"center":"left"});
const tdB=(c=false)=>({border:"1px solid #000",padding:"6px 4px",textAlign:c?"center":"left"});
const btnBase={padding:"9px 12px",borderRadius:8,cursor:"pointer",border:"1px solid transparent",fontWeight:700};
const btnPrimary={...btnBase,background:"#2563eb",color:"#fff"};
const btnDark={...btnBase,background:"#111827",color:"#fff"};
const btnOutline={...btnBase,background:"#fff",color:"#111827",border:"1px solid #e5e7eb"};
const printCss=`
  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    html, body { height: auto !important; }
    body * { visibility: hidden !important; }
    .ph-view .print-area, .ph-view .print-area * { visibility: visible !important; }
    .ph-view .print-area { position: absolute !important; inset: 0 !important; }
    .no-print { display: none !important; }
    thead { display: table-header-group; } tfoot { display: table-footer-group; }
    table { page-break-inside: auto; } tr { page-break-inside: avoid; }
    .one-page { width: 281mm; height: auto; transform-origin: top left; transform: scale(var(--print-scale,1)); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
const PX_PER_MM=96/25.4, PRINT_W_MM=281, PRINT_H_MM=194;
function setAutoPrintScale(rootSel){
  const el=document.querySelector(`${rootSel} .print-area.one-page`)||document.querySelector(`${rootSel} .print-area`);
  if(!el) return 1; const rect=el.getBoundingClientRect();
  const maxW=PRINT_W_MM*PX_PER_MM, maxH=PRINT_H_MM*PX_PER_MM;
  const scale=Math.min(maxW/rect.width,maxH/rect.height,1); el.style.setProperty("--print-scale",String(scale)); return scale;
}

function Row({label,value}){ return (
  <div style={{display:"flex",borderBottom:"1px solid #000"}}>
    <div style={{padding:"6px 8px",borderInlineEnd:"1px solid #000",minWidth:170,fontWeight:700}}>{label}</div>
    <div style={{padding:"6px 8px",flex:1}}>{value}</div>
  </div>
)}
function PHHeader({header,selectedDate}){ return (
  <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
    <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
      <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
        <img src={LOGO_URL} crossOrigin="anonymous" alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
      </div>
      <div style={{ borderInlineEnd:"1px solid #000" }}>
        <Row label="Document Title:" value={header.documentTitle} />
        <Row label="Issue Date:" value={header.issueDate} />
        <Row label="Area:" value={header.area} />
        <Row label="Controlling Officer:" value={header.controllingOfficer} />
      </div>
      <div>
        <Row label="Document No:" value={header.documentNo} />
        <Row label="Revision No:" value={header.revisionNo} />
        <Row label="Issued By:" value={header.issuedBy} />
        <Row label="Approved By:" value={header.approvedBy} />
      </div>
    </div>
    <div style={{ borderTop:"1px solid #000" }}>
      <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
        TRANS EMIRATES LIVESTOCK MEAT TRADING LLC - AL QUSAIS
      </div>
      <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
        PERSONAL HYGIENE CHECKLIST
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
        <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
        <span>{selectedDate || ""}</span>
      </div>
    </div>
  </div>
);}

/* ===== المكوّن ===== */
export default function PersonalHygieneVIEW(){
  const rootSel=".ph-view";
  const [dates,setDates]=useState([]); const [selectedDate,setSelectedDate]=useState(null);
  const [report,setReport]=useState(null); const [loading,setLoading]=useState(false);
  const [exportingPDF,setExportingPDF]=useState(false);
  const [exporting,setExporting]=useState(false); const [importing,setImporting]=useState(false);
  const fileRef=useRef(null);

  const phHeader=useMemo(()=>({
    documentTitle:"Personal Hygiene Checklist",
    documentNo:"FS-QM/REC/PH",
    issueDate:"05/02/2020",
    revisionNo:"0",
    area:"QA",
    issuedBy:"MOHAMAD ABDULLAH QC",
    controllingOfficer:"Quality Controller",
    approvedBy:"Hussam O. Sarhan",
  }),[]);
  const phFooter=useMemo(()=>({ checkedBy:"", verifiedBy:"" }),[]);

  async function refreshDates(){ const ds=await listDates(); setDates(ds); if(!selectedDate && ds.length) setSelectedDate(ds[0]); if(selectedDate && !ds.includes(selectedDate)) setSelectedDate(ds[0]||null); }
  async function loadSelected(){
    if(!selectedDate){ setReport(null); return; }
    setLoading(true);
    try{ const payload=await getReportByDate(selectedDate); setReport(payload?{date:selectedDate,...payload}:null); }
    catch(e){ console.error(e); alert("Failed to load report"); }
    finally{ setLoading(false); }
  }
  useEffect(()=>{ (async()=>{ try{ await refreshDates(); }catch(e){ alert("Failed to fetch dates"); } })(); },[]);
  useEffect(()=>{ (async()=>{ await loadSelected(); })(); /* eslint-disable-next-line */ },[selectedDate]);

  /* حذف */
  const handleDelete=async()=>{
    if(!selectedDate) return;
    if(!window.confirm(`Delete PH report dated ${selectedDate}?`)) return;
    try{ await delByDate(selectedDate); await refreshDates(); await loadSelected(); }catch(e){ alert("Delete failed"); }
  };

  /* JSON لنوع PH فقط */
  const downloadBlob=(s,m,n)=>{ const b=new Blob([s],{type:m}); const u=URL.createObjectURL(b); const a=document.createElement("a"); a.href=u; a.download=n; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u); };
  const exportJSON=async()=>{ try{ setExporting(true); const rows=await listReports(); const payloads=rows.map(x=>x?.payload||x).filter(x=>x&&typeof x==="object"); const backup={meta:{version:1,exportedAt:new Date().toISOString(),apiBase:API_BASE,type:TYPE},data:payloads}; const stamp=new Date().toISOString().replace(/[:.]/g,"-"); downloadBlob(JSON.stringify(backup,null,2),"application/json",`qcs_ph_backup_${stamp}.json`); } finally{ setExporting(false); } };
  const importJSON=async(file)=>{
    try{
      setImporting(true);
      const txt=await file.text(); const data=JSON.parse(txt);
      const arr=Array.isArray(data)?data:(Array.isArray(data?.data)?data.data:[]);
      let ok=0, skipped=0, failed=0;
      for(const item of arr){
        try{
          const payload={...(item?.payload||item)};
          const dateStr=String(payload.reportDate||payload.date||payload.header?.reportEntryDate||payload.meta?.entryDate||"").trim();
          if(!dateStr || !Array.isArray(payload.personalHygiene)){ skipped++; continue; }
          // حفظ كما هي
          payload.reportDate=dateStr;
          // حذف حقول غير ذات صلة
          delete payload.date; delete payload.coolers; delete payload.cleanlinessRows;
          try{ await delByDate(dateStr); }catch{}
          // POST
          const r=await fetch(REPORTS_URL,{ method:"POST", credentials:IS_SAME_ORIGIN?"include":"omit", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body:JSON.stringify({ reporter:"admin-import", type:TYPE, payload })});
          if(!r.ok) throw new Error("post failed");
          ok++;
        }catch(e){ console.error(e); failed++; }
      }
      await refreshDates(); await loadSelected();
      alert(`Import (PH)\n✅ Imported: ${ok}\n⏭️ Skipped: ${skipped}\n❌ Failed: ${failed}`);
    }catch(e){ alert("Import failed"); } finally{ setImporting(false); }
  };

  /* طباعة/PDF */
  const handlePrint=()=>{ setAutoPrintScale(rootSel); setTimeout(()=>window.print(),30); };
  const handleExportPDF=async()=>{
    try{
      setExportingPDF(true);
      const input=document.querySelector(`${rootSel} #ph-report`); if(!input) return alert("Report area not found.");
      const canvas=await html2canvas(input,{ scale:2, useCORS:true, allowTaint:true, backgroundColor:"#ffffff", logging:false, scrollX:0, scrollY:-window.scrollY, windowWidth:document.documentElement.clientWidth, windowHeight:document.documentElement.clientHeight });
      const img=canvas.toDataURL("image/png"); const pdf=new jsPDF("landscape","pt","a4");
      const W=pdf.internal.pageSize.getWidth(), H=pdf.internal.pageSize.getHeight(); const iw=W, ih=(canvas.height*iw)/canvas.width;
      let pos=0, left=ih; pdf.addImage(img,"PNG",0,pos,iw,ih); left-=H;
      while(left>0){ pos-=H; pdf.addPage(); pdf.addImage(img,"PNG",0,pos,iw,ih); left-=H; }
      pdf.save(`qcs_ph_${selectedDate||new Date().toISOString().split("T")[0]}.pdf`);
    }catch(e){ alert("PDF failed"); } finally{ setExportingPDF(false); }
  };

  const personalHygiene = Array.isArray(report?.personalHygiene) ? report.personalHygiene : [];
  const phRowsCount = Math.max(MIN_PH_ROWS, personalHygiene.length || 0);

  return (
    <div className="ph-view" style={{display:"flex",gap:"1rem",fontFamily:"Cairo, sans-serif",padding:"1rem"}}>
      <style>{printCss}</style>

      {/* Sidebar */}
      <aside className="no-print" style={{flex:"0 0 300px", borderRight:"1px solid #e5e7eb", paddingRight:"1rem"}}>
        <h3 style={{margin:0}}>Personal Hygiene</h3>
        <div style={{ margin:"10px 0" }}>
          <label style={{ display:"block", marginBottom:6, fontWeight:700 }}>Selected Date</label>
          <select value={selectedDate ?? ""} onChange={(e)=>setSelectedDate(e.target.value)}
            style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #e5e7eb", outline:"none" }}>
            {dates.map(d=>(<option key={d} value={d}>{d}</option>))}
          </select>
        </div>
        <ul style={{ listStyle:"none", padding:0, maxHeight:"55vh", overflowY:"auto" }}>
          {dates.map(d=>(
            <li key={d}
              onClick={()=>setSelectedDate(d)}
              style={{
                marginBottom:".5rem",
                backgroundColor: selectedDate===d ? "#2980b9" : "#f6f7f9",
                color: selectedDate===d ? "#fff" : "#111827",
                borderRadius:"8px", padding:"8px", cursor:"pointer",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                fontWeight: selectedDate===d ? "bold" : 600,
              }}>
              <span>{d}</span>
              <button onClick={(e)=>{e.stopPropagation(); setSelectedDate(d); handleDelete();}}
                style={{ background:"#c0392b", color:"#fff", border:"none", borderRadius:"6px", padding:"6px 10px", cursor:"pointer" }}>
                Delete
              </button>
            </li>
          ))}
        </ul>

        <div style={{ display:"grid", gap:8, marginTop:10 }}>
          <button onClick={refreshDates} style={btnOutline}>↻ Refresh</button>
          <button onClick={handlePrint} style={btnOutline} disabled={!report}>🖨️ Print</button>
          <button onClick={handleExportPDF} style={{...btnPrimary, opacity:exportingPDF?0.7:1}} disabled={!report||exportingPDF}>📄 Export PDF</button>
          <button onClick={exportJSON} style={{...btnDark, opacity:exporting?0.7:1}} disabled={exporting}>⬇️ Export JSON</button>
          <button onClick={()=>fileRef.current?.click()} style={{...btnOutline, opacity:importing?0.7:1}} disabled={importing}>⬆️ Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" style={{display:"none"}}
            onChange={(e)=>{ const f=e.target.files?.[0]; e.target.value=""; if(f) importJSON(f); }}/>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, minWidth:320, maxHeight:"calc(100vh - 3rem)", overflowY:"auto", paddingRight:"1rem" }}>
        <div className="print-area one-page" id="ph-report">
          <PHHeader header={phHeader} selectedDate={selectedDate} />

          {loading ? <div className="no-print" style={{ color:"#6b7280", marginBottom:8 }}>Loading…</div> : null}

          <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"center", border:"1px solid #000", tableLayout:"fixed", wordBreak:"break-word" }}>
            <thead>
              <tr style={{ background:"#d9d9d9" }}>
                {["S. No","Employee Name","Nails","Hair","No jewelry","Wearing clean clothes / hair net / gloves / face mask / shoes","Communicable disease(s)","Open wounds / sores / cuts","Remarks & Corrective Actions"].map((h,i)=>(<th key={i} style={thB(false)}>{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {phRowsCount ? Array.from({length:phRowsCount}).map((_,i)=>{
                const emp=personalHygiene[i]||{};
                return (
                  <tr key={i}>
                    <td style={tdB(true)}>{i+1}</td>
                    <td style={tdB(false)}>{emp?.employName||emp?.employeeName||""}</td>
                    <td style={tdB(true)}>{emp?.nails||""}</td>
                    <td style={tdB(true)}>{emp?.hair||""}</td>
                    <td style={tdB(true)}>{emp?.notWearingJewelries||""}</td>
                    <td style={tdB(true)}>{emp?.wearingCleanCloth||""}</td>
                    <td style={tdB(true)}>{emp?.communicableDisease||""}</td>
                    <td style={tdB(true)}>{emp?.openWounds||""}</td>
                    <td style={{...tdB(false),whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{emp?.remarks||""}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={9} style={{...tdB(true),color:"#6b7280"}}>No rows.</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ border:"1px solid #000", marginTop:8 }}>
            <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>REMARKS/CORRECTIVE ACTIONS:</div>
            <div style={{ padding:"8px", borderBottom:"1px solid #000", minHeight:56 }}>
              <em>*(C – Conform &nbsp;&nbsp; N / C – Non Conform)</em>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
              <div style={{ display:"flex" }}>
                <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>Checked By :</div>
                <div style={{ padding:"6px 8px", flex:1 }}>{(phFooter?.checkedBy??"")||"\u00A0"}</div>
              </div>
              <div style={{ display:"flex", borderInlineStart:"1px solid #000" }}>
                <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>Verified  By :</div>
                <div style={{ padding:"6px 8px", flex:1 }}>{(phFooter?.verifiedBy??"")||"\u00A0"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* عمليات */}
        <div className="no-print" style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:10 }}>
          <button onClick={handlePrint} style={btnOutline} disabled={!report}>🖨️ Print</button>
          <button onClick={handleExportPDF} style={{...btnPrimary, opacity:exportingPDF?0.7:1}} disabled={!report||exportingPDF}>📄 Export PDF</button>
        </div>
      </main>
    </div>
  );
}
