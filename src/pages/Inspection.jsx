// src/pages/Inspection.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===== Routing ===== */
const REPORTS_ROUTE = "/monitor/internal-audit";

/* ===== API base ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const fromWindow = typeof window !== "undefined" ? window.__QCS_API__ : undefined;
const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL ||
       process.env?.VITE_API_URL ||
       process.env?.RENDER_EXTERNAL_URL)
    : undefined;
let fromVite;
try { fromVite = import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL); }
catch { fromVite = undefined; }
const API_BASE = String(fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;

/* ===== Helpers: image -> Base64 (compressed) ===== */
async function fileToCompressedDataURL(file, maxSide = 1280, quality = 0.8) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality); // Base64
}

/* ===== Options ===== */
const BRANCHES = [
  "QCS",
  "POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16","POS 17","POS 18",
  "POS 19","POS 21","POS 24","POS 25","POS 26","POS 31","POS 34","POS 35","POS 36",
  "POS 37","POS 38","POS 41","POS 42","POS 43","POS 44","POS 45",
  "FTR1","FTR2"
];

const RISK_OPTIONS = ["Low","Medium","High"];
const STATUS_OPTIONS = ["Open","In Progress","Closed"];

export default function Inspection() {
  const navigate = useNavigate();

  /* ===== Header meta ===== */
  const [branch, setBranch] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [reportNo, setReportNo] = useState("");
  const [auditBy, setAuditBy] = useState("MOHAMAD ABDULLAH (QC)");
  const [location, setLocation] = useState("");
  const [approvedBy] = useState("Hussam O. Sarhan");
  const [issuedBy] = useState("MOHAMAD ABDULLAH  QC");

  /* ===== Table rows ===== */
  const [rows, setRows] = useState([ makeEmptyRow(), makeEmptyRow(), makeEmptyRow() ]);

  /* Footer */
  const [commentNextAudit, setCommentNextAudit] = useState("");
  const [nextAudit, setNextAudit] = useState("nil");
  const [reviewedBy, setReviewedBy] = useState("");

  /* Modal state */
  const [modal, setModal] = useState({ open: false, stage: "idle", message: "" }); // stage: 'saving' | 'success' | 'error'
  const isSaving = modal.open && modal.stage === "saving";

  /* Calc helpers */
  const percentageClosed = useMemo(() => {
    const total = rows.length || 1;
    const closed = rows.filter(r => (r.status || "").toLowerCase() === "closed").length;
    return Math.round((closed/total)*100);
  }, [rows]);

  function makeEmptyRow() {
    return {
      nonConformance: "",
      rootCause: "",
      corrective: "",
      evidenceImgs: [],       // Base64 array (max 5)
      closedEvidenceImgs: [], // Base64 array (max 5)
      risk: "",
      status: ""
    };
  }

  /* ===== Handlers ===== */
  const updateRow = (idx, patch) => {
    setRows(prev => prev.map((r,i)=> i===idx ? {...r, ...patch} : r));
  };

  const addRow = () => setRows(prev => [...prev, makeEmptyRow()]);
  const removeRow = (idx) => setRows(prev => prev.filter((_,i)=> i!==idx));

  const addImage = async (idx, field, files) => {
    if (!files || files.length === 0) return;
    try {
      const current = rows[idx][field] || [];
      const capacity = Math.max(0, 5 - current.length);
      const slice = Array.from(files).slice(0, capacity);

      const dataURLs = [];
      for (const f of slice) {
        // eslint-disable-next-line no-await-in-loop
        const data = await fileToCompressedDataURL(f);
        dataURLs.push(data);
      }
      updateRow(idx, { [field]: [...current, ...dataURLs] });
    } catch {
      // نترك تنبيه فشل معالجة الصورة كما هو، لأنه قبل الحفظ
      alert("Image processing failed");
    }
  };

  const removeImage = (idx, field, imgIdx) => {
    const list = rows[idx][field] || [];
    const newList = list.filter((_,i)=> i!==imgIdx);
    updateRow(idx, { [field]: newList });
  };

  /* ===== Save to server (type fixed) ===== */
  const confirmSave = async () => {
    if (!branch || !date) {
      // بظل استخدام alert هنا للتحقق المسبق، لأننا لم نبدأ الحفظ بعد
      alert("Please select Branch and Date.");
      return;
    }

    const reportName = `${branch} - ${date}`;
    const payload = {
      template: "capa_v1",
      title: reportName,
      header: {
        documentNumber: "FS-QM/REC/CA/1",
        revisionNo: "00",
        issuedBy,
        approvedBy,
        date,
        reportNo,
        auditConductedBy: auditBy,
        location: location || branch
      },
      table: rows,
      footer: {
        commentForNextAudit: commentNextAudit,
        nextAudit,
        reviewedAndVerifiedBy: reviewedBy
      },
      kpis: { percentageClosed },
      createdAt: new Date().toISOString()
    };

    const body = { type: "internal_multi_audit", branch, payload };

    // افتح النافذة: جاري الحفظ
    setModal({ open: true, stage: "saving", message: "جاري الحفظ..." });

    try {
      const res = await fetch(REPORTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("HTTP " + res.status);

      // نجاح
      setModal({ open: true, stage: "success", message: "تم الحفظ بنجاح ✅" });

      // تفريغ الحقول
      setRows([makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]);
      setCommentNextAudit("");
      setNextAudit("nil");
      setReviewedBy("");

      // اغلاق تلقائي بعد لحظات
      setTimeout(() => {
        setModal({ open: false, stage: "idle", message: "" });
      }, 1600);
    } catch (e) {
      // فشل
      setModal({ open: true, stage: "error", message: "فشل الحفظ ❌" });
    }
  };

  /* ===== UI ===== */
  return (
    <div style={pageWrap}>
      {/* Header brand + meta */}
      <div style={headerCard}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:18, fontWeight:700}}>Internal Audit Report</div>
            <div style={{fontSize:16, fontWeight:700}}>CORRECTIVE & PREVENTIVE ACTION</div>
          </div>
          <div style={{textAlign:"right", fontSize:12, lineHeight:1.5}}>
            <div><b>Document Number:</b> FS-QM/REC/CA/1</div>
            <div><b>Revision No:</b> 00</div>
            <div><b>Issued By:</b> {issuedBy}</div>
            <div><b>Approved By:</b> {approvedBy}</div>
          </div>
        </div>

        <div style={metaGrid}>
          <label style={metaCell}>
            <span>Date</span>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>Report No</span>
            <input value={reportNo} onChange={(e)=>setReportNo(e.target.value)} placeholder="e.g., 050125/P01" style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>Audit Conducted By</span>
            <input value={auditBy} onChange={(e)=>setAuditBy(e.target.value)} style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>Location</span>
            <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="e.g., POS 24 AL SEICON" style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>Branch</span>
            <select value={branch} onChange={(e)=>setBranch(e.target.value)} style={metaInput}>
              <option value="">-- Select Branch --</option>
              {BRANCHES.map(b=> <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Table (Grid with fixed columns + horizontal scroll if needed) */}
      <div style={tableScroll}>
        <div style={tableWrap}>
          <div style={tableHeaderRow}>
            <div style={th}>Non-Conformance</div>
            <div style={th}>Root Cause</div>
            <div style={th}>Corrective / Preventive action</div>
            <div style={th}>Evidence</div>
            <div style={th}>Closed Evidence</div>
            <div style={th}>Risk Category</div>
            <div style={th}>Status</div>
            <div style={th} />
          </div>

          {rows.map((r, idx)=>(
            <div key={idx} style={tr}>
              <div style={td}>
                <textarea value={r.nonConformance} onChange={e=>updateRow(idx,{nonConformance:e.target.value})} style={cellTextArea}/>
              </div>
              <div style={td}>
                <textarea value={r.rootCause} onChange={e=>updateRow(idx,{rootCause:e.target.value})} style={cellTextArea}/>
              </div>
              <div style={td}>
                <textarea value={r.corrective} onChange={e=>updateRow(idx,{corrective:e.target.value})} style={cellTextArea}/>
              </div>

              {/* Evidence */}
              <div style={td}>
                <ImageField
                  list={r.evidenceImgs}
                  onAdd={(files)=>addImage(idx,"evidenceImgs",files)}
                  onRemove={(i)=>removeImage(idx,"evidenceImgs",i)}
                />
              </div>

              {/* Closed Evidence */}
              <div style={td}>
                <ImageField
                  list={r.closedEvidenceImgs}
                  onAdd={(files)=>addImage(idx,"closedEvidenceImgs",files)}
                  onRemove={(i)=>removeImage(idx,"closedEvidenceImgs",i)}
                />
              </div>

              {/* Risk */}
              <div style={tdFixed(140)}>
                <select value={r.risk} onChange={e=>updateRow(idx,{risk:e.target.value})} style={selectCell}>
                  <option value="">--</option>
                  {RISK_OPTIONS.map(x=> <option key={x} value={x}>{x}</option>)}
                </select>
              </div>

              {/* Status */}
              <div style={tdFixed(120)}>
                <select value={r.status} onChange={e=>updateRow(idx,{status:e.target.value})} style={selectCell}>
                  <option value="">--</option>
                  {STATUS_OPTIONS.map(x=> <option key={x} value={x}>{x}</option>)}
                </select>
              </div>

              {/* Actions */}
              <div style={tdFixed(60, {display:"flex", alignItems:"center", justifyContent:"center"})}>
                <button onClick={()=>removeRow(idx)} style={iconBtn} title="Remove row">✕</button>
              </div>
            </div>
          ))}

          <div style={{padding:"10px"}}>
            <button onClick={addRow} style={addRowBtn}>+ Add Row</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={footerCard}>
        <label style={{display:"block", marginBottom:8, fontWeight:600}}>Comment for next Audit</label>
        <textarea
          value={commentNextAudit}
          onChange={(e)=>setCommentNextAudit(e.target.value)}
          placeholder="Write your recommendation and observations..."
          style={{...cellTextArea, minHeight:120}}
        />

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12}}>
          <label style={metaCell}>
            <span>Next Audit</span>
            <input value={nextAudit} onChange={(e)=>setNextAudit(e.target.value)} style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>Reviewed and verified By</span>
            <input value={reviewedBy} onChange={(e)=>setReviewedBy(e.target.value)} style={metaInput}/>
          </label>
        </div>
      </div>

      {/* Save / View bar */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:16, gap:12, flexWrap:"wrap"}}>
        <div style={{opacity:0.8}}>Closed Items: <b>{percentageClosed}%</b></div>
        <div style={{display:"flex", gap:10}}>
          <button onClick={()=>navigate(REPORTS_ROUTE)} style={viewBtn}>📄 View Reports</button>
          <button onClick={confirmSave} style={{...saveBtn, opacity: isSaving ? .7 : 1, pointerEvents: isSaving ? "none" : "auto"}}>
            {isSaving ? "Saving…" : "💾 Save Report"}
          </button>
        </div>
      </div>

      {/* ===== Modal (Saving / Success / Error) ===== */}
      {modal.open && (
        <div style={modalBackdrop} onClick={()=> modal.stage!=="saving" && setModal({open:false, stage:"idle", message:""})}>
          <div style={modalCard} onClick={(e)=>e.stopPropagation()}>
            {modal.stage === "saving" && <div style={spinner}/>}
            <div style={{fontSize:16, fontWeight:800, marginTop: modal.stage==="saving" ? 10 : 0, textAlign:"center"}}>
              {modal.message || (modal.stage==="saving" ? "جاري الحفظ..." : "")}
            </div>

            {modal.stage === "error" && (
              <button onClick={()=>setModal({open:false,stage:"idle",message:""})} style={{...smallBtn, marginTop:12}}>
                إغلاق
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Reusable image field (multi up to 5) ===== */
function ImageField({ list, onAdd, onRemove }) {
  const count = (list || []).length;
  const canAdd = count < 5;

  return (
    <div>
      <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
        {(list||[]).map((src,i)=>(
          <div key={i} style={{position:"relative", width:72, height:72, border:"1px solid #9aa3b8", borderRadius:6, overflow:"hidden"}}>
            <img src={src} alt="evidence" style={{width:"100%", height:"100%", objectFit:"cover"}}/>
            <button onClick={()=>onRemove(i)} title="Remove" style={thumbX}>×</button>
          </div>
        ))}
      </div>

      <div style={{display:"flex", alignItems:"center", gap:8, marginTop:6}}>
        <label style={{...uploadBtn, opacity: canAdd ? 1 : 0.6, pointerEvents: canAdd ? "auto" : "none"}}>
          Upload ({count}/5)
          <input
            type="file"
            accept="image/*"
            multiple
            style={{display:"none"}}
            onChange={(e)=> {
              const files = e.target.files;
              onAdd(files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const BORDER        = "#9aa3b8";  // darker general border
const BORDER_STRONG = "#64748b";  // darker header separator

/* Grid columns: fixed distribution; min width ensures no wrap, use horizontal scroll when narrow */
const COLS = "1.2fr 1fr 1.2fr 1.1fr 1.1fr 140px 120px 60px";

const pageWrap   = { padding:"18px", fontFamily:"Arial, sans-serif", background:"#5376bcff", minHeight:"100vh", direction:"ltr" };
const headerCard = { background:"#fff", border:`1px solid ${BORDER}`, borderRadius:12, padding:16, marginBottom:14 };
const metaGrid   = { display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:10, marginTop:12 };
const metaCell   = { display:"flex", flexDirection:"column", gap:6, fontSize:12 };
const metaInput  = { padding:"10px 12px", border:`1px solid ${BORDER}`, borderRadius:8, background:"#fff" };

const tableScroll = { overflowX:"auto" };
const tableWrap   = { background:"#fff", border:`1px solid ${BORDER}`, borderRadius:12, overflow:"hidden", minWidth: 1200 };
const tableGrid   = { display:"grid", gridTemplateColumns: COLS, alignItems:"stretch" };

const tableHeaderRow = { ...tableGrid, background:"#f3f4f6", borderBottom:`1px solid ${BORDER_STRONG}`, fontWeight:700, fontSize:13 };
const tr             = { ...tableGrid, borderBottom:`1px solid ${BORDER}` };

const th = {
  padding:10,
  borderRight:`1px solid ${BORDER}`,
  whiteSpace:"nowrap",
  overflow:"hidden",
  textOverflow:"ellipsis",
  boxSizing:"border-box"
};

const td = { padding:8, borderRight:`1px solid ${BORDER}`, boxSizing:"border-box" };
const tdFixed = (w, extra={}) => ({ padding:8, borderRight:`1px solid ${BORDER}`, width:w, boxSizing:"border-box", ...extra });

const cellTextArea = { width:"100%", minHeight:84, resize:"vertical", padding:10, border:`1px solid ${BORDER}`, borderRadius:8, background:"#fff", boxSizing:"border-box" };
const selectCell   = { width:"100%", padding:"10px 12px", border:`1px solid ${BORDER}`, borderRadius:8, background:"#fff", boxSizing:"border-box" };

const iconBtn    = { width:28, height:28, border:`1px solid ${BORDER}`, background:"#fff", borderRadius:6, cursor:"pointer" };
const addRowBtn  = { border:`1px dashed ${BORDER}`, background:"#fff", padding:"8px 12px", borderRadius:8, cursor:"pointer" };
const footerCard = { background:"#fff", border:`1px solid ${BORDER}`, borderRadius:12, padding:16, marginTop:14 };

const viewBtn    = { background:"#0ea5e9", color:"#fff", padding:"12px 18px", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600 };
const saveBtn    = { background:"#16a34a", color:"#fff", padding:"12px 18px", border:"none", borderRadius:10, cursor:"pointer", fontWeight:600 };

/* ⬇️ هذا التعريف كان ناقص — تمت إضافته لإصلاح ESLint */
const smallBtn   = { padding:"6px 10px", borderRadius:8, border:`1px solid ${BORDER}`, background:"#fff", cursor:"pointer", fontSize:13 };

const uploadBtn = { display:"inline-block", fontSize:12, border:`1px solid ${BORDER}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", background:"#fff" };
const thumbX    = { position:"absolute", top:2, right:2, width:20, height:20, borderRadius:"50%", border:"none", background:"rgba(239,68,68,.9)", color:"#fff", cursor:"pointer", lineHeight:"20px" };

/* ===== Modal styles ===== */
const modalBackdrop = {
  position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
  display:"flex", alignItems:"center", justifyContent:"center",
  zIndex: 9999
};
const modalCard = {
  width: 320, maxWidth: "90vw",
  background:"#fff", border:"1px solid #e5e7eb", borderRadius:12,
  boxShadow:"0 20px 50px rgba(0,0,0,.25)",
  padding:"16px 18px", textAlign:"center"
};
const spinner = {
  width: 36, height: 36, borderRadius:"50%",
  border: "4px solid #e5e7eb", borderTop: "4px solid #16a34a",
  margin: "0 auto",
  animation: "spin 1s linear infinite"
};
// inject keyframes (once)
if (typeof document !== "undefined" && !document.getElementById("spin-keyframes")) {
  const style = document.createElement("style");
  style.id = "spin-keyframes";
  style.textContent = `@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;
  document.head.appendChild(style);
}
