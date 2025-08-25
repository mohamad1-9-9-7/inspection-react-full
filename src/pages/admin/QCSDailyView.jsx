// src/pages/admin/QCSDailyView.jsx
import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ============ API base ============ */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  API_ROOT_DEFAULT;

const API_BASE = String(API_ROOT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;

const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ============ API helpers ============ */
async function listQcsDailyReports() {
  const res = await fetch(`${REPORTS_URL}?type=qcs-daily`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to list qcs-daily reports");
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}
async function listReportDates() {
  const rows = await listQcsDailyReports();
  const dates = Array.from(new Set(
    rows.map(r => String(r?.payload?.reportDate || r?.payload?.date || "")).filter(Boolean)
  ));
  return dates.sort((a,b)=>b.localeCompare(a));
}
async function getReportByDate(date) {
  const rows = await listQcsDailyReports();
  const found = rows.find(r => String(r?.payload?.reportDate || "") === String(date));
  return found?.payload || null;
}
async function deleteReportByDate(date) {
  const rows = await listQcsDailyReports();
  const found = rows.find(r => String(r?.payload?.reportDate || "") === String(date));
  const id = found?._id || found?.id;
  if (!id) throw new Error("Report not found");
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) throw new Error("Failed to delete report");
  return true;
}

/* ============ Constants ============ */
const LOGO_URL = "/brand/al-mawashi.jpg";
const MIN_PH_ROWS = 21;
const COOLER_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM","2:00 PM","4:00 PM","6:00 PM","8:00 PM",
];

/* ============ Print CSS ============ */
const printCss = `
  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    html, body { height: auto !important; }
    body { font-family: "Times New Roman", Times, serif; }
    body * { visibility: hidden !important; }
    .print-area, .print-area * { visibility: visible !important; }
    .print-area { position: absolute !important; inset: 0 !important; }
    .no-print { display: none !important; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    .one-page { width: 281mm; height: auto; transform-origin: top left; transform: scale(var(--print-scale,1)); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;
const screenCss = `
  @media screen {
    body { background: linear-gradient(135deg,#f7fafc 0%,#eef2ff 100%); }
    * { scrollbar-width: thin; scrollbar-color:#cbd5e1 #f1f5f9; }
    *::-webkit-scrollbar{height:8px;width:8px}
    *::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}
    *::-webkit-scrollbar-track{background:#f1f5f9}
  }
`;

/* ============ print scale ============ */
const PX_PER_MM = 96/25.4, PRINT_W_MM = 281, PRINT_H_MM = 194;
function setAutoPrintScale() {
  const el = document.querySelector(".print-area.one-page") || document.querySelector(".print-area");
  if (!el) return 1;
  const rect = el.getBoundingClientRect();
  const maxW = PRINT_W_MM*PX_PER_MM, maxH = PRINT_H_MM*PX_PER_MM;
  const scale = Math.min(maxW/rect.width, maxH/rect.height, 1);
  el.style.setProperty("--print-scale", String(scale));
  return scale;
}

/* ============ Local storage helper ============ */
function useLocalJSON(key, initialValue) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(()=>{ try{ localStorage.setItem(key, JSON.stringify(val)); }catch{} },[key,val]);
  return [val, setVal];
}

/* ============ Headers Defaults ============ */
const defaultPHHeader = {
  documentTitle:"Personal Hygiene Checklist", documentNo:"FS-QM/REC/PH",
  issueDate:"05/02/2020", revisionNo:"0", area:"QA",
  issuedBy:"MOHAMAD ABDULLAH QC", controllingOfficer:"Quality Controller",
  approvedBy:"Hussam O. Sarhan",
};
const defaultPHFooter = { checkedBy:"", verifiedBy:"" };
const defaultCCHeader = {
  documentTitle:"Cleaning Checklist", documentNo:"FF-QM/REC/CC",
  issueDate:"05/02/2020", revisionNo:"0", area:"QA",
  issuedBy:"MOHAMAD ABDULLAH", controllingOfficer:"Quality Controller",
  approvedBy:"Hussam O. Sarhan",
};
const defaultCCFooter = { checkedBy:"", verifiedBy:"" };
const defaultTMPHeader = {
  documentTitle:"Temperature Control Record", documentNo:"FS-QM/REC/TMP",
  issueDate:"05/02/2020", revisionNo:"0", area:"QA",
  issuedBy:"MOHAMAD ABDULLAH", controllingOfficer:"Quality Controller",
  approvedBy:"Hussam O. Sarhan",
};

/* ============ Small row component ============ */
function Row({ label, value }) {
  return (
    <div style={{ display:"flex", borderBottom:"1px solid #000" }}>
      <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:170, fontWeight:700 }}>{label}</div>
      <div style={{ padding:"6px 8px", flex:1 }}>{value}</div>
    </div>
  );
}

/* ============ Headers for print ============ */
function PHPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
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
  );
}
function CCPrintHeader({ header, selectedDate }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
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
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          CLEANING CHECKLIST - WAREHOUSE
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", padding:"6px 8px" }}>
          <span style={{ fontWeight:900, textDecoration:"underline" }}>Date:</span>
          <span>{selectedDate || ""}</span>
        </div>
      </div>
    </div>
  );
}
function TMPPrintHeader({ header }) {
  return (
    <div style={{ border:"1px solid #000", marginBottom:8, breakInside:"avoid" }}>
      <div style={{ display:"grid", gridTemplateColumns:"180px 1fr 1fr", alignItems:"stretch" }}>
        <div style={{ borderInlineEnd:"1px solid #000", display:"flex", alignItems:"center", justifyContent:"center", padding:8 }}>
          <img src={LOGO_URL} alt="Al Mawashi" style={{ maxWidth:"100%", maxHeight:80, objectFit:"contain" }} />
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
          <Row label="Issued by:" value={header.issuedBy} />
          <Row label="Approved by:" value={header.approvedBy} />
        </div>
      </div>
      <div style={{ borderTop:"1px solid #000" }}>
        <div style={{ background:"#c0c0c0", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ background:"#d6d6d6", textAlign:"center", fontWeight:900, padding:"6px 8px", borderBottom:"1px solid #000" }}>
          TEMPERATURE CONTROL CHECKLIST (CCP)
        </div>
        <div style={{ padding:"6px 8px", lineHeight:1.5 }}>
          <div>1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.</div>
          <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
          <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
          <div style={{ marginTop:6, fontWeight:700 }}>
            Corrective action: Transfer the meat to another cold room and call maintenance department to check and solve the problem.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Helpers ============ */
const thB = (txtCenter=false)=>({ border:"1px solid #000", padding:"4px", fontWeight:800, textAlign: txtCenter?"center":"left", whiteSpace:"nowrap" });
const tdB = (txtCenter=false)=>({ border:"1px solid #000", padding:"4px", textAlign: txtCenter?"center":"left" });

function labelForCooler(i){
  return i===7 ? "FREEZER" : (i===2||i===3) ? "Production Room" : `Cooler ${i+1}`;
}

/* ============ Page ============ */
export default function QCSDailyView() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeTab, setActiveTab] = useState("coolers");

  const [phHeaderLS] = useLocalJSON("qcs_ph_header_v1", defaultPHHeader);
  const [phFooterLS] = useLocalJSON("qcs_ph_footer_v1", defaultPHFooter);
  const [ccHeaderLS] = useLocalJSON("qcs_cc_header_v1", defaultCCHeader);
  const [ccFooterLS] = useLocalJSON("qcs_cc_footer_v1", defaultCCFooter);
  const [tmpHeaderLS] = useLocalJSON("qcs_tmp_header_v1", defaultTMPHeader);

  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);

  useEffect(()=>{ (async()=>{
    try { const dates = await listReportDates(); setReports(dates.map(d=>({date:d}))); setSelectedDate(dates[0]||null); }
    catch(e){ console.error(e); alert("Failed to fetch reports list from server."); }
  })(); },[]);
  useEffect(()=>{ if(!selectedDate){ setSelectedReport(null); return; }
    setLoadingReport(true);
    (async()=>{
      try{ const payload = await getReportByDate(selectedDate); setSelectedReport(payload?{date:selectedDate,...payload}:null); }
      catch(e){ console.error(e); setSelectedReport(null); alert("Failed to load the selected report from server."); }
      finally{ setLoadingReport(false); }
    })();
  },[selectedDate]);

  const handleDeleteReport = async (dateToDelete) => {
    if (!window.confirm(`Delete report dated ${dateToDelete}?`)) return;
    try {
      await deleteReportByDate(dateToDelete);
      const filtered = reports.filter(r => r.date !== dateToDelete);
      setReports(filtered);
      if (selectedDate === dateToDelete) setSelectedDate(filtered[0]?.date || null);
    } catch (e) {
      console.error(e);
      alert("Failed to delete report from server.");
    }
  };

  const downloadBlob = (str, mime, filename) => {
    const blob = new Blob([str], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const exportAll = async () => {
    try {
      setExportingAll(true);
      const all = [];
      for (const r of reports) {
        try { const data = await getReportByDate(r.date); if (data) all.push({ date: r.date, ...data }); }
        catch (e) { console.warn("Skip date due to fetch error:", r.date, e); }
      }
      downloadBlob(JSON.stringify(all, null, 2), "application/json", "qcs_reports_backup_all.json");
    } catch (e) { console.error(e); alert("Failed to export all."); }
    finally { setExportingAll(false); }
  };
  const exportCurrent = () => selectedReport && downloadBlob(JSON.stringify(selectedReport, null, 2), "application/json", `qcs_report_${selectedDate}.json`);

  const handlePrint = () => { setAutoPrintScale(); setTimeout(()=>window.print(), 30); };
  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      const input = document.getElementById("report-container");
      if (!input) { alert("Report area not found."); setExportingPDF(false); return; }
      const canvas = await html2canvas(input, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: "#ffffff",
        logging: false, scrollX: 0, scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("landscape","pt","a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height*imgWidth)/canvas.width;
      let position = 0, heightLeft = imgHeight;
      pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData,"PNG",0,position,imgWidth,imgHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `qcs_report_${selectedDate || new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(fileName);
    } catch (e) { console.error(e); alert("Failed to generate PDF. Make sure jspdf and html2canvas are installed."); }
    finally { setExportingPDF(false); }
  };

  if (reports.length === 0) {
    return (
      <div className="app-shell" style={{ padding:"1rem", fontFamily:"Cairo, sans-serif" }}>
        <style>{printCss}</style><style>{screenCss}</style>
        <div className="print-area one-page" id="report-container"><p>No reports found.</p></div>
      </div>
    );
  }

  const coolers = Array.isArray(selectedReport?.coolers) ? selectedReport.coolers : [];
  const personalHygiene = Array.isArray(selectedReport?.personalHygiene) ? selectedReport.personalHygiene : [];
  const cleanlinessRows = Array.isArray(selectedReport?.cleanlinessRows) ? selectedReport.cleanlinessRows : [];

  const phRowsCount = Math.max(MIN_PH_ROWS, personalHygiene.length || 0);
  const phDataForPrint = Array.from({length: phRowsCount}).map((_,i)=>personalHygiene[i]||{});

  const headers = selectedReport?.headers || {};
  const phHeader = headers.phHeader || defaultPHHeader;
  const phFooter = headers.phFooter || defaultPHFooter;
  const ccHeader = headers.dcHeader || defaultCCHeader;
  const ccFooter = headers.dcFooter || defaultCCFooter;
  const tmpHeader = headers.tmpHeader || defaultTMPHeader;

  return (
    <div className="app-shell" style={{ display:"flex", gap:"1rem", fontFamily:"Cairo, sans-serif", padding:"1rem" }}>
      <style>{printCss}</style><style>{screenCss}</style>

      {/* Sidebar */}
      <aside className="no-print" style={{ flex:"0 0 290px", borderRight:"1px solid #e5e7eb", paddingRight:"1rem" }}>
        <header style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0 }}>Reports List</h3>
        </header>
        <div style={{ margin:"10px 0" }}>
          <label style={{ display:"block", marginBottom:6, fontWeight:700 }}>Selected Date</label>
          <select value={selectedDate ?? ""} onChange={e=>setSelectedDate(e.target.value)}
                  style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid #e5e7eb", outline:"none" }}>
            {reports.map(r => <option key={r.date} value={r.date}>{r.date}</option>)}
          </select>
        </div>
        <ul style={{ listStyle:"none", padding:0, maxHeight:"55vh", overflowY:"auto" }}>
          {reports.map(report => (
            <li key={report.date}
                style={{
                  marginBottom:".5rem", backgroundColor:selectedDate===report.date?"#2980b9":"#f6f7f9",
                  color:selectedDate===report.date?"#fff":"#111827", borderRadius:"8px", padding:"8px",
                  cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center",
                  fontWeight:selectedDate===report.date?"bold":600,
                }}
                onClick={()=>setSelectedDate(report.date)}>
              <span>{report.date}</span>
              <button onClick={(e)=>{ e.stopPropagation(); handleDeleteReport(report.date); }}
                      style={{ background:"#c0392b", color:"#fff", border:"none", borderRadius:"6px", padding:"6px 10px", cursor:"pointer", marginLeft:"6px" }}
                      title="Delete report">
                Delete
              </button>
            </li>
          ))}
        </ul>
        <div style={{ marginTop:"1.2rem", display:"grid", gap:8 }}>
          <button onClick={exportCurrent} style={btnPrimary} disabled={!selectedReport}>⬇️ Export Current (JSON)</button>
          <button onClick={exportAll} style={{ ...btnDark, opacity:exportingAll?0.7:1 }} disabled={exportingAll}>⬇️⬇️ Export All (JSON)</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, minWidth:320, maxHeight:"calc(100vh - 3rem)", overflowY:"auto", paddingRight:"1rem" }}>
        {/* Tabs */}
        <nav className="no-print" style={{ display:"flex", gap:"10px", marginBottom:".6rem", position:"sticky", top:0, background:"#fff", paddingTop:6, paddingBottom:6, zIndex:5 }}>
          {[
            { id:"coolers", label:"🧊 Coolers Temperatures" },
            { id:"personalHygiene", label:"🧼 Personal Hygiene" },
            { id:"dailyCleanliness", label:"🧹 Daily Cleanliness" },
          ].map(({id,label})=>(
            <button key={id} onClick={()=>setActiveTab(id)}
              style={{
                padding:"9px 16px", borderRadius:"8px",
                border: activeTab===id ? "2px solid #2980b9" : "1px solid #e5e7eb",
                backgroundColor: activeTab===id ? "#d6eaf8" : "#fff",
                cursor:"pointer", flex:1, fontWeight: activeTab===id ? "bold" : 600, fontSize:"1.02em",
              }}>
              {label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="no-print" style={{ display:"flex", gap:8, justifyContent:"flex-end", margin:"0 0 8px 0" }}>
          <button onClick={handlePrint} style={btnOutline}>🖨️ Print Report</button>
          <button onClick={handleExportPDF} style={{ ...btnPrimary, opacity:exportingPDF?0.7:1 }} disabled={exportingPDF} title="Export as PDF (A4 Landscape)">
            {exportingPDF ? "… Generating PDF" : "📄 Export PDF"}
          </button>
        </div>

        {loadingReport && <div className="no-print" style={{ marginBottom:8, fontStyle:"italic", color:"#6b7280" }}>Loading report…</div>}

        {/* Print area */}
        <div className="print-area one-page" id="report-container">
          {/* ================= Coolers (COMPACT TABLE) ================= */}
          {activeTab === "coolers" && (
            <>
              <TMPPrintHeader header={tmpHeader} />
              <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"center", border:"1px solid #000", fontSize:"12px" }}>
                <thead>
                  <tr style={{ background:"#d9d9d9" }}>
                    <th style={thB(true)}>Cooler</th>
                    {COOLER_TIMES.map(t => (
                      <th key={t} style={thB(true)}>{t}</th>
                    ))}
                    <th style={thB(false)}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {coolers.length>0 ? (
                    coolers.map((c, i)=>(
                      <tr key={i}>
                        <td style={tdB(false)}>{labelForCooler(i)}</td>
                        {COOLER_TIMES.map(time=>{
                          const raw = c?.temps?.[time];
                          const val = (raw===undefined || raw==="" || raw===null) ? "—" : `${raw}°C`;
                          return <td key={time} style={tdB(true)}>{val}</td>;
                        })}
                        <td style={{ ...tdB(false), whiteSpace:"pre-wrap" }}>{c?.remarks || ""}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={COOLER_TIMES.length + 2} style={{ ...tdB(true), color:"#6b7280" }}>No coolers data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          {/* ================= Personal Hygiene ================= */}
          {activeTab === "personalHygiene" && (
            <>
              <PHPrintHeader header={phHeader} selectedDate={selectedDate} />
              <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"center", border:"1px solid #000" }}>
                <thead>
                  <tr style={{ background:"#d9d9d9" }}>
                    {[
                      "S. No","Employee Name","Nails","Hair","No jewelry",
                      "Wearing clean clothes / hair net / gloves / face mask / shoes",
                      "Communicable disease(s)","Open wounds / sores / cuts","Remarks & Corrective Actions",
                    ].map((h,idx)=>(
                      <th key={idx} style={{ border:"1px solid #000", padding:"6px 4px", fontWeight:800 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {phDataForPrint.map((emp,i)=>(
                    <tr key={i}>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{i+1}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.employName || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.nails || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.hair || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.notWearingJewelries || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.wearingCleanCloth || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.communicableDisease || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.openWounds || ""}</td>
                      <td style={{ border:"1px solid #000", padding:"6px 4px" }}>{emp?.remarks || ""}</td>
                    </tr>
                  ))}
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
                    <div style={{ padding:"6px 8px", flex:1 }}>{phFooter.checkedBy || "\u00A0"}</div>
                  </div>
                  <div style={{ display:"flex", borderInlineStart:"1px solid #000" }}>
                    <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:120, fontWeight:700 }}>Verified  By :</div>
                    <div style={{ padding:"6px 8px", flex:1 }}>{phFooter.verifiedBy || "\u00A0"}</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= Daily Cleanliness ================= */}
          {activeTab === "dailyCleanliness" && (
            <>
              <CCPrintHeader header={ccHeader} selectedDate={selectedDate} />
              <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"left", border:"1px solid #000" }}>
                <thead>
                  <tr style={{ background:"#d9d9d9" }}>
                    <th style={thB(true)}>SI-No</th>
                    <th style={thB(false)}>General Cleaning</th>
                    <th style={thB(true)}>Observation (C / N\\C)</th>
                    <th style={thB(false)}>Informed to</th>
                    <th style={thB(false)}>Remarks & CA</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(cleanlinessRows) && cleanlinessRows.length>0 ? (
                    cleanlinessRows.map((r,i)=>{
                      const isSection = !!r?.isSection;
                      const letter = r?.letter || (typeof r?.slNo!=="undefined" ? r.slNo : i+1);
                      const general = r?.general || r?.itemEn || r?.itemAr || r?.groupEn || r?.groupAr || "";
                      const observation = r?.observation || r?.result || "";
                      const informedTo = r?.informedTo || r?.informed || "";
                      const remarks = r?.remarks || "";
                      if (isSection) {
                        return (
                          <tr key={`sec-${i}`} style={{ background:"#f2f2f2", fontWeight:800 }}>
                            <td style={tdB(true)}>—</td>
                            <td style={tdB(false)}>{r.section || general}</td>
                            <td style={tdB(true)} />
                            <td style={tdB(false)} />
                            <td style={tdB(false)} />
                          </tr>
                        );
                      }
                      return (
                        <tr key={`row-${i}`}>
                          <td style={tdB(true)}>{letter}</td>
                          <td style={tdB(false)}>{general}</td>
                          <td style={tdB(true)}>{observation}</td>
                          <td style={tdB(false)}>{informedTo}</td>
                          <td style={tdB(false)}>{remarks}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr><td colSpan={5} style={{ ...tdB(true), color:"#6b7280" }}>No rows.</td></tr>
                  )}
                </tbody>
              </table>

              <div style={{ marginTop:6, fontStyle:"italic" }}>
                *(C – Conform &nbsp;&nbsp;&nbsp; N / C – Non Conform)
              </div>
              <div style={{ border:"1px solid #000", marginTop:8 }}>
                <div style={{ padding:"6px 8px", borderBottom:"1px solid #000", fontWeight:900 }}>
                  REMARKS/CORRECTIVE ACTIONS:
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid #000" }}>
                  <div style={{ display:"flex", minHeight:42 }}>
                    <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:180, fontWeight:900, textDecoration:"underline" }}>
                      CHECKED BY: <span style={{ fontWeight:400 }}>(QC-ASSIST)</span>
                    </div>
                    <div style={{ padding:"6px 8px", flex:1 }}>{ccFooter.checkedBy || "\u00A0"}</div>
                  </div>
                  <div style={{ display:"flex", borderInlineStart:"1px solid #000", minHeight:42 }}>
                    <div style={{ padding:"6px 8px", borderInlineEnd:"1px solid #000", minWidth:180, fontWeight:900, textDecoration:"underline" }}>
                      VERIFIED BY:
                    </div>
                    <div style={{ padding:"6px 8px", flex:1 }}>{ccFooter.verifiedBy || "\u00A0"}</div>
                  </div>
                </div>
                <div style={{ padding:"8px 10px", lineHeight:1.6 }}>
                  <div>Remark: Frequency — Daily</div>
                  <div>* (C = Conform &nbsp;&nbsp;&nbsp;&nbsp; N / C = Non Conform)</div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ============ Buttons ============ */
const btnBase = { padding:"9px 12px", borderRadius:8, cursor:"pointer", border:"1px solid transparent", fontWeight:700 };
const btnPrimary = { ...btnBase, background:"#2563eb", color:"#fff" };
const btnDark    = { ...btnBase, background:"#111827", color:"#fff" };
const btnOutline = { ...btnBase, background:"#fff", color:"#111827", border:"1px solid #e5e7eb" };
