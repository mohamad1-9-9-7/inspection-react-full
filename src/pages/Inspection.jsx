// src/pages/Inspection.jsx
import React, { useMemo, useState } from "react";
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

/* ✅ رفع صورة على Cloudinary عبر السيرفر */
async function uploadImageToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

/* ===== Smart branches (same structure as the View page) ===== */
const BRANCH_LIST = [
  { code: "QCS",         en: "QCS — Al Qusais Warehouse",        ar: "QCS — مستودع القصيص" },
  { code: "POS 6",       en: "POS 6 — Sharjah Butchery",         ar: "POS 6 — ملحمة الشارقة" },
  { code: "POS 7",       en: "POS 7 — Abu Dhabi Store",          ar: "POS 7 — مخزن أبوظبي" },
  { code: "POS 10",      en: "POS 10 — Abu Dhabi Butchery",      ar: "POS 10 — ملحمة أبوظبي" },
  { code: "POS 11",      en: "POS 11 — Al Ain Market",           ar: "POS 11 — سوق العين" },
  { code: "POS 14",      en: "POS 14 — Al Ain Butchery",         ar: "POS 14 — ملحمة العين" },
  { code: "POS 15",      en: "POS 15 — Al Barsha Butchery",      ar: "POS 15 — ملحمة البرشا" },
  { code: "POS 16",      en: "POS 16 — AFCOP Maqta Mall",         ar: "POS 16 — AFCOP مول المقطع" },
  { code: "POS 17",      en: "POS 17 — Mushrif Coop",            ar: "POS 17 — تعاونية المشرف" },
  { code: "POS 18",      en: "POS 18",                            ar: "POS 18" },
  { code: "POS 19",      en: "POS 19 — Motor City",              ar: "POS 19 — موتور سيتي" },
  { code: "POS 21",      en: "POS 21",                            ar: "POS 21" },
  { code: "POS 24",      en: "POS 24",                            ar: "POS 24" },
  { code: "POS 25",      en: "POS 25",                            ar: "POS 25" },
  { code: "POS 26",      en: "POS 26",                            ar: "POS 26" },
  { code: "POS 31",      en: "POS 31",                            ar: "POS 31" },
  { code: "POS 34",      en: "POS 34",                            ar: "POS 34" },
  { code: "POS 35",      en: "POS 35",                            ar: "POS 35" },
  { code: "POS 36",      en: "POS 36",                            ar: "POS 36" },
  { code: "POS 37",      en: "POS 37 — Safeer Musafah",           ar: "POS 37 — سفير مصفح" },
  { code: "POS 38",      en: "POS 38 — Safeer Khalifa A",         ar: "POS 38 — سفير خليفة A" },
  { code: "POS 41",      en: "POS 41",                            ar: "POS 41" },
  { code: "POS 42",      en: "POS 42",                            ar: "POS 42" },
  { code: "POS 43",      en: "POS 43 — Fazaa Shamkha",            ar: "POS 43 — فزعة الشامخة" },
  { code: "POS 44",      en: "POS 44",                            ar: "POS 44" },
  { code: "POS 45",      en: "POS 45",                            ar: "POS 45" },
  { code: "FTR 1",       en: "FTR 1 — Al Mushrif Park",          ar: "FTR 1 — حديقة المشرف" },
  { code: "FTR 2",       en: "FTR 2 — Al Mamzar",                ar: "FTR 2 — الممزر" },
];

const RISK_OPTIONS = [
  { v: "Low",    en: "Low",    ar: "منخفض",  color: "#166534", bg: "#dcfce7" },
  { v: "Medium", en: "Medium", ar: "متوسط",  color: "#92400e", bg: "#fef3c7" },
  { v: "High",   en: "High",   ar: "عالي",   color: "#991b1b", bg: "#fee2e2" },
];
const STATUS_OPTIONS = [
  { v: "Open",        en: "Open",        ar: "مفتوح",      color: "#991b1b", bg: "#fee2e2" },
  { v: "In Progress", en: "In Progress", ar: "قيد التنفيذ", color: "#92400e", bg: "#fef3c7" },
  { v: "Closed",      en: "Closed",      ar: "مغلق",       color: "#166534", bg: "#dcfce7" },
];

const DRAFT_KEY = "inspection_draft_v1";

export default function Inspection() {
  const navigate = useNavigate();

  /* ===== Language (synced with view page) ===== */
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem("internal_audit_lang") || "en"; } catch { return "en"; }
  });
  const isAr = lang === "ar";
  const tt = (en, ar) => isAr ? ar : en;
  const toggleLang = () => {
    const next = isAr ? "en" : "ar";
    setLang(next);
    try { localStorage.setItem("internal_audit_lang", next); } catch {}
  };

  /* ===== Load draft if exists ===== */
  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  };
  const draft = useMemo(() => loadDraft(), []);

  /* ===== Header meta ===== */
  const [branch, setBranch] = useState(draft?.branch || "");
  const [date, setDate] = useState(draft?.date || new Date().toISOString().slice(0,10));
  const [reportNo, setReportNo] = useState(draft?.reportNo || "");
  const [auditBy, setAuditBy] = useState(draft?.auditBy || "MOHAMAD ABDULLAH (QC)");
  const [location, setLocation] = useState(draft?.location || "");
  const [approvedBy] = useState("Hussam O. Sarhan");
  const [issuedBy] = useState("MOHAMAD ABDULLAH  QC");

  /* ===== Table rows ===== */
  const [rows, setRows] = useState(
    Array.isArray(draft?.rows) && draft.rows.length > 0
      ? draft.rows
      : [makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]
  );

  /* ✅ حالة رفع الصور (loading per cell) */
  const [uploadingCell, setUploadingCell] = useState(null); // "idx-field"

  /* Footer */
  const [commentNextAudit, setCommentNextAudit] = useState(draft?.commentNextAudit || "");
  const [nextAudit, setNextAudit] = useState(draft?.nextAudit || "nil");
  const [reviewedBy, setReviewedBy] = useState(draft?.reviewedBy || "");

  /* Modal state */
  const [modal, setModal] = useState({ open: false, stage: "idle", message: "" });
  const isSaving = modal.open && modal.stage === "saving";

  /* Toast for draft auto-save */
  const [draftMsg, setDraftMsg] = useState("");

  /* ===== Auto-save draft (debounced) ===== */
  React.useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          branch, date, reportNo, auditBy, location,
          rows, commentNextAudit, nextAudit, reviewedBy,
          savedAt: Date.now(),
        }));
        setDraftMsg("💾 saved");
        setTimeout(() => setDraftMsg(""), 1200);
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [branch, date, reportNo, auditBy, location, rows, commentNextAudit, nextAudit, reviewedBy]);

  /* Calc helpers — extended KPIs */
  const kpis = useMemo(() => {
    const total = rows.length;
    const closed = rows.filter(r => (r.status || "").toLowerCase() === "closed").length;
    const inProgress = rows.filter(r => (r.status || "").toLowerCase() === "in progress").length;
    const open = rows.filter(r => (r.status || "").toLowerCase() === "open").length;
    const highRisk = rows.filter(r => (r.risk || "").toLowerCase() === "high").length;
    const medRisk = rows.filter(r => (r.risk || "").toLowerCase() === "medium").length;
    const lowRisk = rows.filter(r => (r.risk || "").toLowerCase() === "low").length;
    const percentageClosed = total > 0 ? Math.round((closed/total)*100) : 0;
    const withImages = rows.filter(r => (r.evidenceImgs?.length || 0) + (r.closedEvidenceImgs?.length || 0) > 0).length;
    return { total, closed, inProgress, open, highRisk, medRisk, lowRisk, percentageClosed, withImages };
  }, [rows]);
  const percentageClosed = kpis.percentageClosed;

  function makeEmptyRow() {
    return {
      nonConformance: "",
      rootCause: "",
      corrective: "",
      evidenceImgs: [],       // Cloudinary URLs (max 5)
      closedEvidenceImgs: [], // Cloudinary URLs (max 5)
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
  const duplicateRow = (idx) => setRows(prev => {
    const c = { ...prev[idx], evidenceImgs: [...(prev[idx].evidenceImgs || [])], closedEvidenceImgs: [...(prev[idx].closedEvidenceImgs || [])] };
    return [...prev.slice(0, idx + 1), c, ...prev.slice(idx + 1)];
  });
  const clearRow = (idx) => {
    if (!window.confirm(tt("Clear this row's contents?", "مسح محتويات هذا السطر؟"))) return;
    setRows(prev => prev.map((r,i)=> i===idx ? makeEmptyRow() : r));
  };
  const markRowClosed = (idx) => setRows(prev => prev.map((r,i)=> i===idx ? { ...r, status: "Closed" } : r));
  const markAllClosed = () => {
    if (!window.confirm(tt("Mark all rows as Closed?", "تعليم كل السطور كمغلق؟"))) return;
    setRows(prev => prev.map(r => ({ ...r, status: "Closed" })));
  };
  const clearAllRows = () => {
    if (!window.confirm(tt("Reset the form? All unsaved data will be lost.", "إعادة تعيين النموذج؟ كل البيانات غير المحفوظة ستضيع."))) return;
    setRows([makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]);
    setReportNo(""); setLocation(""); setCommentNextAudit(""); setReviewedBy("");
    setBranch(""); setNextAudit("nil");
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  /* ✅ رفع الصور على Cloudinary بدل base64 */
  const addImage = async (idx, field, files) => {
    if (!files || files.length === 0) return;

    const current = rows[idx][field] || [];
    const capacity = Math.max(0, 5 - current.length);
    const slice = Array.from(files).slice(0, capacity);
    if (!slice.length) return;

    const cellKey = `${idx}-${field}`;
    setUploadingCell(cellKey);

    const uploadedUrls = [];
    let failedCount = 0;
    try {
      for (const f of slice) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const url = await uploadImageToCloudinary(f);
          uploadedUrls.push(url);
        } catch (e) {
          console.error("Image upload failed for file:", f.name, e);
          failedCount++;
        }
      }
      if (uploadedUrls.length > 0) {
        updateRow(idx, { [field]: [...current, ...uploadedUrls] });
      }
      if (failedCount > 0) {
        alert(`فشل رفع ${failedCount} صورة. تم رفع ${uploadedUrls.length} بنجاح.`);
      }
    } finally {
      setUploadingCell(null);
    }
  };

  const removeImage = (idx, field, imgIdx) => {
    const list = rows[idx][field] || [];
    updateRow(idx, { [field]: list.filter((_,i)=> i!==imgIdx) });
  };

  /* ===== Save to server ===== */
  const confirmSave = async () => {
    if (isSaving) return; // منع double-submit
    if (!branch || !date) {
      alert("Please select Branch and Date.");
      return;
    }

    if (uploadingCell) {
      alert("يرجى الانتظار حتى تنتهي رفع الصور.");
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

    setModal({ open: true, stage: "saving", message: "جاري الحفظ..." });

    try {
      const res = await fetch(REPORTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("HTTP " + res.status);

      setModal({ open: true, stage: "success", message: tt("Saved successfully ✅", "تم الحفظ بنجاح ✅") });
      // Clear draft so the form doesn't reload the same data after a successful save
      try { localStorage.removeItem(DRAFT_KEY); } catch {}

      setRows([makeEmptyRow(), makeEmptyRow(), makeEmptyRow()]);
      setCommentNextAudit("");
      setNextAudit("nil");
      setReviewedBy("");

      setTimeout(() => {
        setModal({ open: false, stage: "idle", message: "" });
      }, 1600);
    } catch (e) {
      setModal({ open: true, stage: "error", message: "فشل الحفظ ❌" });
    }
  };

  /* ===== UI ===== */
  return (
    <div style={pageWrap} dir={isAr ? "rtl" : "ltr"} className="ins-page-wrap">
      <style>{`
        @media print {
          .ins-no-print { display: none !important; }
          .ins-page-wrap { background: #fff !important; padding: 0 !important; }
        }
      `}</style>

      {/* Modern Header with KPIs */}
      <div style={modernHeaderCard}>
        <div style={modernHeaderTop}>
          <div style={{display:"flex", alignItems:"center", gap:14}}>
            <div style={brandIco}>📋</div>
            <div>
              <div style={{fontSize:20, fontWeight:1000, color:"#0f172a", lineHeight:1.2}}>
                {tt("Internal Audit Report", "تقرير تدقيق داخلي")}
              </div>
              <div style={{fontSize:13, fontWeight:800, color:"#7c3aed", letterSpacing:".05em"}}>
                {tt("CORRECTIVE & PREVENTIVE ACTION", "إجراءات تصحيحية ووقائية")}
              </div>
            </div>
          </div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}} className="ins-no-print">
            <button onClick={toggleLang} style={toolBtn} title="Toggle language">🌐 {isAr ? "EN" : "AR"}</button>
            <button onClick={()=>window.print()} style={toolBtn} title="Print">🖨️ {tt("Print", "طباعة")}</button>
            <button onClick={()=>navigate("/ai-assistant")} style={aiBtn} title="AI Assistant">🤖 AI</button>
            <button onClick={()=>navigate(REPORTS_ROUTE)} style={viewBtn}>📄 {tt("View Reports", "عرض التقارير")}</button>
          </div>
        </div>

        {/* Doc info chip strip */}
        <div style={docInfoStrip}>
          <span style={docChip}>📄 <b>FS-QM/REC/CA/1</b></span>
          <span style={docChip}>🔁 Rev 00</span>
          <span style={docChip}>✍️ Issued: <b>{issuedBy}</b></span>
          <span style={docChip}>✅ Approved: <b>{approvedBy}</b></span>
          {draftMsg && <span style={{...docChip, background:"#dcfce7", color:"#166534"}}>{draftMsg}</span>}
        </div>

        {/* KPIs */}
        <div style={kpiGrid} className="ins-no-print">
          <KpiTile icon="📝" label={tt("Total", "إجمالي")} value={kpis.total} color="#0f172a" bg="#f1f5f9" />
          <KpiTile icon="🔴" label={tt("Open", "مفتوح")} value={kpis.open} color="#991b1b" bg="#fee2e2" />
          <KpiTile icon="🟡" label={tt("In Progress", "قيد التنفيذ")} value={kpis.inProgress} color="#92400e" bg="#fef3c7" />
          <KpiTile icon="✅" label={tt("Closed", "مغلق")} value={kpis.closed} color="#166534" bg="#dcfce7" />
          <KpiTile
            icon="📊"
            label={tt("Closure %", "نسبة الإغلاق")}
            value={`${kpis.percentageClosed}%`}
            color={kpis.percentageClosed >= 80 ? "#166534" : kpis.percentageClosed >= 50 ? "#92400e" : "#991b1b"}
            bg={kpis.percentageClosed >= 80 ? "#dcfce7" : kpis.percentageClosed >= 50 ? "#fef3c7" : "#fee2e2"}
          />
          <KpiTile icon="⚠️" label={tt("High Risk", "خطر عالي")} value={kpis.highRisk} color="#991b1b" bg="#fee2e2" />
          <KpiTile icon="🖼️" label={tt("With Evidence", "مع أدلة")} value={kpis.withImages} color="#0e7490" bg="#cffafe" />
        </div>

        {/* Meta fields */}
        <div style={metaGrid}>
          <label style={metaCell}>
            <span>{tt("Date", "التاريخ")}</span>
            <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={metaInput} dir="ltr"/>
          </label>
          <label style={metaCell}>
            <span>{tt("Report No", "رقم التقرير")}</span>
            <input value={reportNo} onChange={(e)=>setReportNo(e.target.value)} placeholder="e.g., 050125/P01" style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>{tt("Audit Conducted By", "أجرى التدقيق")}</span>
            <input value={auditBy} onChange={(e)=>setAuditBy(e.target.value)} style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>{tt("Location", "الموقع")}</span>
            <input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder={tt("e.g., POS 24 — Silicon Oasis", "مثال: POS 24 — سيليكون أوايسس")} style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>{tt("Branch", "الفرع")} {!branch && <span style={{color:"#dc2626"}}>*</span>}</span>
            <select value={branch} onChange={(e)=>setBranch(e.target.value)} style={{...metaInput, fontWeight:800}}>
              <option value="">{tt("-- Select Branch --", "-- اختر الفرع --")}</option>
              {BRANCH_LIST.map(b=> <option key={b.code} value={b.code}>{isAr ? b.ar : b.en}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Quick actions toolbar */}
      <div style={quickActionsBar} className="ins-no-print">
        <button onClick={addRow} style={qaPrimary}>+ {tt("Add Row", "إضافة سطر")}</button>
        <button onClick={markAllClosed} style={qaSuccess}>✅ {tt("Mark all Closed", "تعليم الكل كمغلق")}</button>
        <button onClick={clearAllRows} style={qaDanger}>🗑 {tt("Reset Form", "إعادة تعيين")}</button>
        <span style={{flex:1}}/>
        <span style={{fontSize:12, color:"#fff", fontWeight:800, opacity:.85}}>
          {tt(`${kpis.total} row(s)`, `${kpis.total} سطر`)}
        </span>
      </div>

      {/* Table */}
      <div style={tableScroll}>
        <div style={tableWrap}>
          <div style={tableHeaderRow}>
            <div style={th}>{tt("Non-Conformance","عدم المطابقة")}</div>
            <div style={th}>{tt("Root Cause","السبب الجذري")}</div>
            <div style={th}>{tt("Corrective / Preventive","إجراء تصحيحي/وقائي")}</div>
            <div style={th}>{tt("Evidence","الدليل")}</div>
            <div style={th}>{tt("Closed Evidence","دليل الإغلاق")}</div>
            <div style={th}>{tt("Risk","المخاطر")}</div>
            <div style={th}>{tt("Status","الحالة")}</div>
            <div style={th}>{tt("Actions","إجراءات")}</div>
          </div>

          {rows.map((r, idx)=> {
            const riskOpt = RISK_OPTIONS.find(o => o.v === r.risk);
            const statusOpt = STATUS_OPTIONS.find(o => o.v === r.status);
            const rowAccent = r.status === "Closed" ? "#16a34a" :
                              r.status === "In Progress" ? "#eab308" :
                              r.status === "Open" ? "#dc2626" : "transparent";
            return (
            <div key={idx} style={{...tr, borderLeft: `4px solid ${rowAccent}`}}>
              <div style={td}>
                <textarea value={r.nonConformance} onChange={e=>updateRow(idx,{nonConformance:e.target.value})} style={cellTextArea} placeholder={tt("Describe the finding...", "صف الملاحظة...")}/>
              </div>
              <div style={td}>
                <textarea value={r.rootCause} onChange={e=>updateRow(idx,{rootCause:e.target.value})} style={cellTextArea} placeholder={tt("Why did this happen?", "لماذا حدث هذا؟")}/>
              </div>
              <div style={td}>
                <textarea value={r.corrective} onChange={e=>updateRow(idx,{corrective:e.target.value})} style={cellTextArea} placeholder={tt("What corrective action will be taken?", "ما الإجراء التصحيحي؟")}/>
              </div>

              <div style={td}>
                <ImageField
                  list={r.evidenceImgs}
                  uploading={uploadingCell === `${idx}-evidenceImgs`}
                  onAdd={(files)=>addImage(idx,"evidenceImgs",files)}
                  onRemove={(i)=>removeImage(idx,"evidenceImgs",i)}
                  label={tt("Upload","رفع")}
                />
              </div>

              <div style={td}>
                <ImageField
                  list={r.closedEvidenceImgs}
                  uploading={uploadingCell === `${idx}-closedEvidenceImgs`}
                  onAdd={(files)=>addImage(idx,"closedEvidenceImgs",files)}
                  onRemove={(i)=>removeImage(idx,"closedEvidenceImgs",i)}
                  label={tt("Upload","رفع")}
                />
              </div>

              <div style={tdFixed(140)}>
                <select
                  value={r.risk}
                  onChange={e=>updateRow(idx,{risk:e.target.value})}
                  style={{
                    ...selectCell,
                    background: riskOpt?.bg || "#fff",
                    color: riskOpt?.color || "#0f172a",
                    fontWeight: 900,
                    border: riskOpt ? `2px solid ${riskOpt.color}55` : `1px solid ${BORDER}`,
                  }}
                >
                  <option value="">--</option>
                  {RISK_OPTIONS.map(x=> <option key={x.v} value={x.v}>{isAr ? x.ar : x.en}</option>)}
                </select>
              </div>

              <div style={tdFixed(130)}>
                <select
                  value={r.status}
                  onChange={e=>updateRow(idx,{status:e.target.value})}
                  style={{
                    ...selectCell,
                    background: statusOpt?.bg || "#fff",
                    color: statusOpt?.color || "#0f172a",
                    fontWeight: 900,
                    border: statusOpt ? `2px solid ${statusOpt.color}55` : `1px solid ${BORDER}`,
                  }}
                >
                  <option value="">--</option>
                  {STATUS_OPTIONS.map(x=> <option key={x.v} value={x.v}>{isAr ? x.ar : x.en}</option>)}
                </select>
              </div>

              <div style={tdFixed(120, {display:"flex", alignItems:"center", justifyContent:"center", gap:4, flexWrap:"wrap"})}>
                <button onClick={()=>duplicateRow(idx)} style={iconBtnSm} title={tt("Duplicate row","نسخ السطر")}>📋</button>
                <button onClick={()=>clearRow(idx)} style={iconBtnSm} title={tt("Clear row","مسح السطر")}>🧹</button>
                {r.status !== "Closed" && <button onClick={()=>markRowClosed(idx)} style={{...iconBtnSm, background:"#dcfce7", color:"#166534"}} title={tt("Mark Closed","تعليم كمغلق")}>✅</button>}
                <button onClick={()=>removeRow(idx)} style={{...iconBtnSm, background:"#fee2e2", color:"#991b1b"}} title={tt("Remove row","حذف السطر")}>✕</button>
              </div>
            </div>
            );
          })}

          <div style={{padding:"10px"}}>
            <button onClick={addRow} style={addRowBtn}>+ {tt("Add Row","إضافة سطر")}</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={footerCard}>
        <label style={{display:"block", marginBottom:8, fontWeight:1000, color:"#0f172a"}}>
          📝 {tt("Comment for Next Audit","ملاحظات للتدقيق القادم")}
        </label>
        <textarea
          value={commentNextAudit}
          onChange={(e)=>setCommentNextAudit(e.target.value)}
          placeholder={tt("Write your recommendation and observations...","اكتب توصياتك وملاحظاتك...")}
          style={{...cellTextArea, minHeight:120}}
        />
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12}}>
          <label style={metaCell}>
            <span>{tt("Next Audit","تاريخ التدقيق القادم")}</span>
            <input value={nextAudit} onChange={(e)=>setNextAudit(e.target.value)} style={metaInput}/>
          </label>
          <label style={metaCell}>
            <span>{tt("Reviewed and verified By","راجع وصدّق")}</span>
            <input value={reviewedBy} onChange={(e)=>setReviewedBy(e.target.value)} style={metaInput}/>
          </label>
        </div>
      </div>

      {/* Save bar */}
      <div style={saveBar} className="ins-no-print">
        <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
          <span style={{fontSize:14, color:"#fff", fontWeight:1000}}>
            {tt("Closure Rate:","نسبة الإغلاق:")} <span style={{color: percentageClosed >= 80 ? "#bbf7d0" : percentageClosed >= 50 ? "#fde68a" : "#fecaca"}}>{percentageClosed}%</span>
          </span>
          <span style={{fontSize:12, color:"rgba(255,255,255,.85)", fontWeight:800}}>
            ({kpis.closed}/{kpis.total} {tt("closed","مغلق")})
          </span>
        </div>
        <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
          <button
            onClick={confirmSave}
            disabled={isSaving || !!uploadingCell}
            style={{...saveBtnBig, opacity: (isSaving || uploadingCell) ? .7 : 1, cursor: (isSaving || uploadingCell) ? "wait" : "pointer"}}
          >
            {isSaving ? `⏳ ${tt("Saving…","جاري الحفظ…")}` : uploadingCell ? `📤 ${tt("Uploading images…","جاري رفع الصور…")}` : `💾 ${tt("Save Report","حفظ التقرير")}`}
          </button>
        </div>
      </div>

      {/* Modal */}
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

/* ===== ImageField ===== */
function ImageField({ list, uploading, onAdd, onRemove, label = "Upload" }) {
  const count = (list || []).length;
  const canAdd = count < 5 && !uploading;

  return (
    <div>
      <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
        {(list||[]).map((src,i)=>(
          <a key={i} href={src} target="_blank" rel="noopener noreferrer"
             style={{position:"relative", width:60, height:60, border:"1.5px solid #cbd5e1", borderRadius:8, overflow:"hidden", display:"block", textDecoration:"none"}}>
            <img src={src} alt="evidence" style={{width:"100%", height:"100%", objectFit:"cover"}}/>
            <button onClick={(e)=>{e.preventDefault(); onRemove(i);}} title="Remove" style={thumbX}>×</button>
          </a>
        ))}

        {uploading && (
          <div style={{width:60, height:60, border:"2px dashed #94a3b8", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, background:"#fef3c7"}}>
            ⏳
          </div>
        )}
      </div>

      <div style={{display:"flex", alignItems:"center", gap:8, marginTop:6}}>
        <label style={{...uploadBtn, opacity: canAdd ? 1 : 0.5, pointerEvents: canAdd ? "auto" : "none"}}>
          {uploading ? "⏳" : `📎 ${label} ${count}/5`}
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

/* ===== KpiTile ===== */
function KpiTile({ icon, label, value, color, bg }) {
  return (
    <div style={{
      background: bg,
      color,
      borderRadius: 12,
      padding: "10px 12px",
      border: "1px solid rgba(226,232,240,.95)",
      boxShadow: "0 4px 10px rgba(2,6,23,.05)",
      display: "flex", flexDirection: "column", gap: 2,
      minWidth: 110,
    }}>
      <div style={{display:"flex", alignItems:"center", gap:6}}>
        <span style={{fontSize:16}}>{icon}</span>
        <span style={{fontSize:10, fontWeight:1000, letterSpacing:".05em", textTransform:"uppercase", opacity:.75}}>{label}</span>
      </div>
      <div style={{fontSize:20, fontWeight:1000, lineHeight:1.1}}>{value}</div>
    </div>
  );
}

/* ===== Styles ===== */
const BORDER        = "#cbd5e1";
const BORDER_STRONG = "#64748b";
const COLS = "1.2fr 1fr 1.2fr 1.1fr 1.1fr 140px 130px 120px";

const pageWrap   = {
  padding:"18px",
  fontFamily:'ui-sans-serif, system-ui, "Segoe UI", Cairo, Roboto, sans-serif',
  background:"linear-gradient(180deg,#f1f5f9 0%, #e0e7ff 100%)",
  minHeight:"100vh",
};

/* Modern header card with KPIs */
const modernHeaderCard = {
  background:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:18,
  marginBottom:14,
  boxShadow:"0 12px 30px rgba(2,6,23,.10)",
};
const modernHeaderTop = {
  display:"flex", justifyContent:"space-between", alignItems:"center",
  flexWrap:"wrap", gap:12, marginBottom:14,
};
const brandIco = {
  width:48, height:48, borderRadius:14,
  background:"linear-gradient(135deg, #2563eb, #7c3aed)", color:"#fff",
  display:"grid", placeItems:"center", fontSize:24,
  boxShadow:"0 12px 26px rgba(37,99,235,.30)",
};
const toolBtn = {
  padding:"8px 14px", borderRadius:12,
  background:"linear-gradient(180deg,#fff,#f8fafc)", color:"#0f172a",
  border:"1px solid #cbd5e1", fontWeight:900, fontSize:12, cursor:"pointer",
  fontFamily:"inherit",
};
const aiBtn = {
  padding:"8px 14px", borderRadius:12,
  background:"linear-gradient(135deg,#7c3aed,#2563eb)", color:"#fff",
  border:"none", fontWeight:1000, fontSize:12, cursor:"pointer",
  fontFamily:"inherit", boxShadow:"0 8px 18px rgba(124,58,237,.30)",
};
const docInfoStrip = {
  display:"flex", gap:8, flexWrap:"wrap",
  padding:"10px 12px", marginBottom:14,
  background:"linear-gradient(135deg,#f8fafc,#eef2ff)",
  border:"1px dashed #cbd5e1", borderRadius:10,
};
const docChip = {
  fontSize:11, fontWeight:800, color:"#475569",
  background:"#fff", border:"1px solid #e2e8f0",
  padding:"4px 10px", borderRadius:999,
};
const kpiGrid = {
  display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",
  gap:8, marginBottom:14,
};

const metaGrid   = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10 };
const metaCell   = { display:"flex", flexDirection:"column", gap:6, fontSize:12, fontWeight:800, color:"#0f172a" };
const metaInput  = { padding:"10px 12px", border:`1px solid ${BORDER}`, borderRadius:10, background:"#fff", fontFamily:"inherit", fontSize:13 };

const quickActionsBar = {
  display:"flex", gap:8, alignItems:"center", flexWrap:"wrap",
  padding:"10px 14px", marginBottom:10,
  background:"linear-gradient(135deg,#0f172a,#1e293b)",
  borderRadius:14,
  boxShadow:"0 10px 24px rgba(2,6,23,.20)",
};
const qaPrimary = {
  padding:"7px 14px", borderRadius:10,
  background:"linear-gradient(135deg,#2563eb,#1d4ed8)", color:"#fff",
  border:"none", fontWeight:1000, fontSize:12, cursor:"pointer", fontFamily:"inherit",
};
const qaSuccess = {
  padding:"7px 14px", borderRadius:10,
  background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff",
  border:"none", fontWeight:1000, fontSize:12, cursor:"pointer", fontFamily:"inherit",
};
const qaDanger = {
  padding:"7px 14px", borderRadius:10,
  background:"linear-gradient(135deg,#dc2626,#b91c1c)", color:"#fff",
  border:"none", fontWeight:1000, fontSize:12, cursor:"pointer", fontFamily:"inherit",
};

const tableScroll = { overflowX:"auto" };
const tableWrap   = { background:"#fff", border:`1px solid ${BORDER}`, borderRadius:14, overflow:"hidden", minWidth: 1200, boxShadow:"0 8px 20px rgba(2,6,23,.06)" };
const tableGrid   = { display:"grid", gridTemplateColumns: COLS, alignItems:"stretch" };
const tableHeaderRow = { ...tableGrid, background:"linear-gradient(180deg,#0b1220,#1e293b)", color:"#fff", borderBottom:`1px solid ${BORDER_STRONG}`, fontWeight:1000, fontSize:12, letterSpacing:".03em", textTransform:"uppercase" };
const tr             = { ...tableGrid, borderBottom:`1px solid ${BORDER}` };
const th = { padding:"12px 10px", borderRight:`1px solid rgba(255,255,255,.10)`, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", boxSizing:"border-box" };
const td = { padding:8, borderRight:`1px solid ${BORDER}`, boxSizing:"border-box" };
const tdFixed = (w, extra={}) => ({ padding:8, borderRight:`1px solid ${BORDER}`, width:w, boxSizing:"border-box", ...extra });
const cellTextArea = { width:"100%", minHeight:84, resize:"vertical", padding:10, border:`1px solid ${BORDER}`, borderRadius:10, background:"#fff", boxSizing:"border-box", fontFamily:"inherit", fontSize:13 };
const selectCell   = { width:"100%", padding:"9px 10px", border:`1px solid ${BORDER}`, borderRadius:10, background:"#fff", boxSizing:"border-box", fontFamily:"inherit", fontSize:13, cursor:"pointer" };
const iconBtn    = { width:28, height:28, border:`1px solid ${BORDER}`, background:"#fff", borderRadius:6, cursor:"pointer" };
const iconBtnSm  = { width:30, height:30, border:`1px solid ${BORDER}`, background:"#fff", borderRadius:8, cursor:"pointer", fontSize:14, fontFamily:"inherit", display:"inline-flex", alignItems:"center", justifyContent:"center" };
const addRowBtn  = { border:`2px dashed ${BORDER}`, background:"linear-gradient(135deg,#f8fafc,#eef2ff)", padding:"10px 16px", borderRadius:10, cursor:"pointer", fontWeight:900, fontSize:13, fontFamily:"inherit", color:"#1e40af" };
const footerCard = { background:"#fff", border:`1px solid ${BORDER}`, borderRadius:14, padding:16, marginTop:14, boxShadow:"0 8px 20px rgba(2,6,23,.06)" };

const saveBar = {
  display:"flex", justifyContent:"space-between", alignItems:"center",
  flexWrap:"wrap", gap:12,
  marginTop:14, padding:"14px 18px", borderRadius:16,
  background:"linear-gradient(135deg, #0f172a, #1e293b)",
  boxShadow:"0 14px 30px rgba(2,6,23,.20)",
};
const viewBtn    = {
  background:"linear-gradient(135deg,#0ea5e9,#0284c7)", color:"#fff",
  padding:"8px 14px", border:"none", borderRadius:12, cursor:"pointer",
  fontWeight:1000, fontSize:12, fontFamily:"inherit",
  boxShadow:"0 8px 18px rgba(14,165,233,.30)",
};
const saveBtnBig = {
  background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff",
  padding:"13px 26px", border:"none", borderRadius:14, cursor:"pointer",
  fontWeight:1000, fontSize:14, fontFamily:"inherit",
  boxShadow:"0 12px 24px rgba(22,163,74,.40)",
};
const smallBtn   = { padding:"6px 10px", borderRadius:8, border:`1px solid ${BORDER}`, background:"#fff", cursor:"pointer", fontSize:13 };
const uploadBtn  = { display:"inline-block", fontSize:11, border:`1px solid ${BORDER}`, borderRadius:8, padding:"5px 10px", cursor:"pointer", background:"linear-gradient(135deg,#dbeafe,#eff6ff)", color:"#1e40af", fontWeight:900, fontFamily:"inherit" };
const thumbX     = { position:"absolute", top:2, insetInlineEnd:2, width:20, height:20, borderRadius:"50%", border:"none", background:"rgba(239,68,68,.95)", color:"#fff", cursor:"pointer", lineHeight:"20px", fontWeight:1000, fontSize:13 };
const modalBackdrop = { position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex: 9999 };
const modalCard = { width: 320, maxWidth: "90vw", background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, boxShadow:"0 20px 50px rgba(0,0,0,.25)", padding:"16px 18px", textAlign:"center" };
const spinner = { width: 36, height: 36, borderRadius:"50%", border: "4px solid #e5e7eb", borderTop: "4px solid #16a34a", margin: "0 auto", animation: "spin 1s linear infinite" };

if (typeof document !== "undefined" && !document.getElementById("spin-keyframes")) {
  const style = document.createElement("style");
  style.id = "spin-keyframes";
  style.textContent = `@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`;
  document.head.appendChild(style);
}