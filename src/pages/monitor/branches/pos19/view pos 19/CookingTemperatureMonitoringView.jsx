// src/pages/monitor/branches/pos19/view pos 19/CookingTemperatureMonitoringView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";
import { listReportDates, getReportByDate, invalidateReportDates } from "../_shared/reportsApi";
import SignatureName from "../../../../shared/SignatureName";
import {
  DateTreeSidebar,
  ResponsiveReportLayout,
  ResponsiveTableWrap,
} from "../../_shared/branchViewKit";
import { canEdit, canDelete } from "../../../../../utils/perms";


const TYPE     = "pos19_cooking_temperature";
const BRANCH   = "POS 19";
const FORM_REF = "FSM-QM/REC/CR";

/** Critical limit for this record: cooked/reheated core temperature. */
const CRITICAL_TEMP = 75;

const PRODUCT_SLOTS = [
  { key:"p1", label:"Product 1" },
  { key:"p2", label:"Product 2" },
  { key:"p3", label:"Product 3" },
];

const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const formatDMY = (iso) => { if(!iso)return iso; const[y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const isFilledRow = (r={}) => PRODUCT_SLOTS.some(s => String(r[`${s.key}_name`]||"").trim()!=="") || String(r.comment||"").trim()!=="" || String(r.monitoredBy||"").trim()!=="";

/** Parsed temperature, or null when the cell is blank / not a number. */
function tempOf(row, key) {
  const raw = row?.[`${key}_temp`];
  if (raw === "" || raw == null) return null;
  const n = parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

function emptyRow(){
  const base={comment:"",monitoredBy:""};
  PRODUCT_SLOTS.forEach(s=>{base[`${s.key}_name`]="";base[`${s.key}_time`]="";base[`${s.key}_temp`]="";});
  return base;
}

/* ─────────────────────────────────────────────────────────────
   Presentation kit — bigger type, clear CCP colour coding
   ───────────────────────────────────────────────────────────── */
const UI = {
  panel: {
    background: "#fff", border: "1px solid #dbe3f4", borderRadius: 16,
    padding: 18, color: "#0b1f4d", direction: "ltr",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
  },
  headBar: {
    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    paddingBottom: 14, marginBottom: 16, borderBottom: "2px solid #e0f2fe",
  },
  titleEn: { fontWeight: 900, fontSize: 21, lineHeight: 1.2, color: "#0b1f4d" },
  titleAr: { fontWeight: 700, fontSize: 15, color: "#475569", marginTop: 3 },
  refChip: {
    display: "inline-block", background: "#e0f2fe", border: "1px solid #7dd3fc",
    color: "#0c4a6e", borderRadius: 999, padding: "6px 14px",
    fontSize: 13, fontWeight: 900, whiteSpace: "nowrap",
  },
  btnGroup: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  divider: { width: 1, height: 26, background: "#e2e8f0", margin: "0 2px" },

  kpiGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12, marginBottom: 16,
  },
  kpi: (accent, bg) => ({
    background: bg, border: `1px solid ${accent}33`, borderRadius: 14,
    padding: "14px 16px", textAlign: "center",
  }),
  kpiLabel: { fontSize: 13, fontWeight: 800, color: "#64748b", marginBottom: 6 },
  kpiValue: (color) => ({ fontSize: 30, fontWeight: 950, color, lineHeight: 1 }),
  kpiUnit: { fontSize: 13, fontWeight: 700, color: "#94a3b8", marginTop: 4 },

  legend: {
    display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
    padding: "10px 16px", marginBottom: 12, fontSize: 14, fontWeight: 700, color: "#334155",
  },

  table: {
    width: "100%", borderCollapse: "separate", borderSpacing: 0,
    minWidth: 1080, fontSize: 14.5, background: "#fff",
  },
  thGroup: {
    padding: "11px 8px", textAlign: "center", fontWeight: 900, fontSize: 15,
    color: "#fff", background: "#0284c7",
    border: "1px solid rgba(255,255,255,0.28)", whiteSpace: "nowrap",
  },
  thCell: {
    padding: "9px 8px", textAlign: "center", fontWeight: 800, fontSize: 13.5,
    color: "#fff", background: "#0ea5e9", lineHeight: 1.35,
    border: "1px solid rgba(255,255,255,0.28)", whiteSpace: "pre-line",
  },
  td: {
    padding: "11px 10px", textAlign: "center", verticalAlign: "middle",
    borderBottom: "1px solid #e2e8f0", borderInlineEnd: "1px solid #eef2f7",
    fontSize: 14.5, color: "#0f172a",
  },
  rowNo: {
    padding: "11px 6px", textAlign: "center", fontWeight: 900, fontSize: 13.5,
    color: "#94a3b8", background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0", borderInlineEnd: "1px solid #e2e8f0",
  },
  input: {
    width: "100%", border: "1.5px solid #c7d2fe", borderRadius: 8,
    padding: "8px 10px", fontSize: 14.5, fontFamily: "inherit", fontWeight: 600,
  },
  notes: {
    marginTop: 16, border: "1px solid #fcd34d", borderInlineStart: "5px solid #f59e0b",
    borderRadius: 12, padding: "14px 18px", background: "#fffbeb", fontSize: 14.5,
    color: "#78350f", lineHeight: 1.85,
  },
  empty: {
    padding: 40, border: "2px dashed #cbd5e1", borderRadius: 14,
    textAlign: "center", color: "#64748b", fontWeight: 800, fontSize: 16,
    background: "#f8fafc",
  },
};

/** Action button — 40px min height so it is comfortably tappable. */
function Btn({ tone = "slate", disabled, children, ...rest }) {
  const map = {
    violet: { bg: "linear-gradient(180deg,#8b5cf6,#7c3aed)", fg: "#fff", bd: "#6d28d9" },
    sky:    { bg: "linear-gradient(180deg,#38bdf8,#0ea5e9)", fg: "#fff", bd: "#0284c7" },
    green:  { bg: "linear-gradient(180deg,#34d399,#10b981)", fg: "#fff", bd: "#059669" },
    red:    { bg: "linear-gradient(180deg,#f87171,#ef4444)", fg: "#fff", bd: "#dc2626" },
    slate:  { bg: "#fff", fg: "#0f172a", bd: "#cbd5e1" },
    dark:   { bg: "linear-gradient(180deg,#475569,#334155)", fg: "#fff", bd: "#1e293b" },
  };
  const c = map[tone] || map.slate;
  return (
    <button
      disabled={disabled}
      style={{
        minHeight: 40, padding: "9px 16px", borderRadius: 10,
        background: disabled ? "#f1f5f9" : c.bg,
        color: disabled ? "#94a3b8" : c.fg,
        border: `1.5px solid ${disabled ? "#e2e8f0" : c.bd}`,
        fontWeight: 850, fontSize: 14, fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Temperature as a pass/fail pill — the whole point of this record. */
function TempPill({ value }) {
  if (value === "" || value == null) return <span style={{ color: "#cbd5e1", fontWeight: 700 }}>—</span>;
  const n = parseFloat(value);
  if (Number.isNaN(n)) return <span style={{ fontWeight: 700 }}>{value}</span>;
  const low = n < CRITICAL_TEMP;
  return (
    <span style={{
      display: "inline-block", minWidth: 74, padding: "5px 10px", borderRadius: 999,
      fontWeight: 950, fontSize: 14.5,
      background: low ? "#fee2e2" : "#dcfce7",
      color: low ? "#991b1b" : "#166534",
      border: `1.5px solid ${low ? "#fca5a5" : "#86efac"}`,
    }}>
      {low ? "⚠ " : ""}{n}°C
    </span>
  );
}

export default function CookingTemperatureMonitoringView() {
  const reportRef    = useRef(null);
  const fileInputRef = useRef(null);
  const todayDubai   = useMemo(()=>{ try{return new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Dubai"});}catch{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;} },[]);

  const [date,setDate]         = useState(todayDubai);
  const [loading,setLoading]   = useState(false);
  const [err,setErr]           = useState("");
  const [record,setRecord]     = useState(null);
  const [editRows,setEditRows] = useState([]);
  const [editing,setEditing]   = useState(false);
  const [allDates,setAllDates] = useState([]);

  async function fetchAllDates(){
    try{const uniq = await listReportDates(TYPE);
    setAllDates(uniq);
    if(!uniq.includes(date)&&uniq.length)setDate(uniq[0]);}catch(e){console.warn(e);}
  }

  async function fetchRecord(d=date){
    setLoading(true);setErr("");setRecord(null);setEditRows([]);
    try{const match = await getReportByDate(TYPE, d);setRecord(match);
    const rows=match?.payload?.entries??[];setEditRows(rows.length?JSON.parse(JSON.stringify(rows)):[emptyRow()]);setEditing(false);}
    catch(e){console.error(e);setErr("Failed to fetch data.");}finally{setLoading(false);}
  }

  useEffect(()=>{fetchAllDates();},[]);useEffect(()=>{if(date)fetchRecord(date);},[date]);


  function toggleEdit(){
    if(editing){const rows=record?.payload?.entries??[];setEditRows(rows.length?JSON.parse(JSON.stringify(rows)):[emptyRow()]);setEditing(false);return;}
    setEditing(true);
  }

  function upd(i,key,val){setEditRows(p=>{const n=[...p];n[i]={...n[i],[key]:val};return n;});}
  function addRow(){setEditRows(p=>[...p,emptyRow()]);}
  function delRow(i){setEditRows(p=>p.length===1?p:p.filter((_,idx)=>idx!==i));}

  async function saveEdit(){
    if(!record)return;
    const rid=getId(record);const cleaned=editRows.filter(isFilledRow);
    const payload={...(record?.payload||{}),branch:BRANCH,reportDate:record?.payload?.reportDate,entries:cleaned,savedAt:Date.now()};
    try{setLoading(true);const r = await fetch(rid ? `${API_BASE}/api/reports/${encodeURIComponent(rid)}` : `${API_BASE}/api/reports`, { method: rid ? "PUT" : "POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!r.ok)throw new Error();alert("✅ Changes saved");setEditing(false);await fetchRecord(payload.reportDate);invalidateReportDates(TYPE); await fetchAllDates();}
    catch(e){console.error(e);alert("❌ Saving failed.");}finally{setLoading(false);}
  }

  async function handleDelete(){
    if(!record)return;if(!window.confirm("Are you sure?"))return;
    const rid=getId(record);if(!rid)return alert("⚠️ Missing id.");
    try{setLoading(true);const res=await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`,{method:"DELETE"});if(!res.ok)throw new Error();alert("✅ Deleted");invalidateReportDates(TYPE); await fetchAllDates();setDate(allDates.find(d=>d!==record?.payload?.reportDate)||todayDubai);}
    catch(e){alert("❌ Delete failed.");}finally{setLoading(false);}
  }

  function exportJSON(){if(!record)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({type:TYPE,payload:record.payload},null,2)],{type:"application/json"}));a.download=`POS19_CookingRecord_${record?.payload?.reportDate||date}.json`;a.click();URL.revokeObjectURL(a.href);}

  async function exportXLSX(){
    try{
      const ExcelJS=(await import("exceljs")).default||(await import("exceljs"));
      const p=record?.payload||{};const rows=(p.entries||[]).filter(isFilledRow);
      const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet("CookingRecord");
      const border={top:{style:"thin",color:{argb:"1F3B70"}},left:{style:"thin",color:{argb:"1F3B70"}},bottom:{style:"thin",color:{argb:"1F3B70"}},right:{style:"thin",color:{argb:"1F3B70"}}};
      const COL_HEADERS=[...PRODUCT_SLOTS.flatMap(s=>[`${s.label} Name`,`${s.label} Time`,`${s.label} Temp (°C)`]),"Comment","Monitored By"];
      ws.columns=[...PRODUCT_SLOTS.flatMap(()=>[{width:22},{width:10},{width:12}]),{width:22},{width:18}];
      ws.mergeCells(1,1,1,COL_HEADERS.length);const r1=ws.getCell(1,1);r1.value=`POS 19 | Cooking Temperature Monitoring Record — ${FORM_REF}`;r1.alignment={horizontal:"center",vertical:"middle"};r1.font={size:13,bold:true};r1.fill={type:"pattern",pattern:"solid",fgColor:{argb:"E9F0FF"}};ws.getRow(1).height=22;
      ws.mergeCells(2,1,2,COL_HEADERS.length);ws.getCell(2,1).value=`Branch: ${BRANCH} | Area: ${safe(p.area)} | Date: ${safe(p.reportDate)} | Restaurant: Al Mawashi – Braai Restaurant LLC`;ws.getCell(2,1).alignment={horizontal:"center"};ws.getRow(2).height=18;
      const hr=ws.getRow(4);hr.values=COL_HEADERS;hr.eachCell(cell=>{cell.font={bold:true};cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"DCE6F1"}};cell.border=border;});hr.height=28;
      let rIdx=5;rows.forEach(e=>{
        ws.getRow(rIdx).values=[...PRODUCT_SLOTS.flatMap(s=>[safe(e[`${s.key}_name`]),safe(e[`${s.key}_time`]),safe(e[`${s.key}_temp`])]),safe(e.comment),safe(e.monitoredBy)];
        ws.getRow(rIdx).eachCell((cell,col)=>{cell.alignment={horizontal:"center",vertical:"middle",wrapText:true};cell.border=border;
          const tempCols=PRODUCT_SLOTS.map((_,i)=>3+i*3);if(tempCols.includes(col)){const v=parseFloat(ws.getRow(rIdx).getCell(col).value);if(!isNaN(v)&&v<CRITICAL_TEMP)cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FDE8E8"}};}
        });ws.getRow(rIdx).height=20;rIdx++;
      });
      const buf=await wb.xlsx.writeBuffer({useStyles:true,useSharedStrings:true});const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([buf],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=`POS19_CookingRecord_${p.reportDate||date}.xlsx`;a.click();URL.revokeObjectURL(a.href);
    }catch(e){console.error(e);alert("⚠️ XLSX export failed.");}
  }

  async function exportPDF(){
    if(!reportRef.current)return;const node=reportRef.current;const canvas=await html2canvas(node,{scale:2,windowWidth:node.scrollWidth,windowHeight:node.scrollHeight});
    const pdf=new jsPDF("l","pt","a4");const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=20,headerH=50;
    const drawH=()=>{pdf.setFillColor(233,240,255);pdf.rect(0,0,pageW,headerH,"F");pdf.setFont("helvetica","bold");pdf.setFontSize(13);pdf.text(`POS 19 | Cooking Temperature Record — ${record?.payload?.reportDate||date}`,pageW/2,28,{align:"center"});};
    drawH();const usableW=pageW-margin*2,ratio=usableW/canvas.width,availH=pageH-(headerH+10)-margin;let ypx=0;
    while(ypx<canvas.height){const sliceH=Math.min(canvas.height-ypx,availH/ratio);const pc=document.createElement("canvas");pc.width=canvas.width;pc.height=sliceH;pc.getContext("2d").drawImage(canvas,0,ypx,canvas.width,sliceH,0,0,canvas.width,sliceH);pdf.addImage(pc.toDataURL("image/png"),"PNG",margin,headerH+10,usableW,sliceH*ratio);ypx+=sliceH;if(ypx<canvas.height){pdf.addPage("a4","l");drawH();}}
    pdf.save(`POS19_CookingRecord_${record?.payload?.reportDate||date}.pdf`);
  }

  async function importJSON(file){if(!file)return;try{const payload=JSON.parse(await file.text())?.payload||JSON.parse(await file.text());if(!payload?.reportDate)throw new Error();setLoading(true);const res=await fetch(`${API_BASE}/api/reports`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reporter:"pos19",type:TYPE,payload})});if(!res.ok)throw new Error();alert("✅ Imported");setDate(payload.reportDate);invalidateReportDates(TYPE); await fetchAllDates();await fetchRecord(payload.reportDate);}catch(e){console.error(e);alert("❌ Invalid JSON or save failed");}finally{if(fileInputRef.current)fileInputRef.current.value="";setLoading(false);}}

  const rows = record?.payload?.entries || [];
  const visibleRows = useMemo(() => rows.filter(isFilledRow), [rows]);

  /** At-a-glance CCP summary for the selected day. */
  const stats = useMemo(() => {
    let checked = 0, below = 0;
    for (const r of visibleRows) {
      for (const s of PRODUCT_SLOTS) {
        const n = tempOf(r, s.key);
        if (n === null) continue;
        checked++;
        if (n < CRITICAL_TEMP) below++;
      }
    }
    return {
      rows: visibleRows.length,
      checked,
      below,
      pct: checked ? Math.round(((checked - below) / checked) * 100) : null,
    };
  }, [visibleRows]);

  /* DateTreeSidebar keys rows by `key` and shows `label`. */
  const dateItems = useMemo(
    () => allDates.map((d) => ({ key: d, dateISO: d, label: formatDMY(d) })),
    [allDates]
  );

  /* One body row, shared by read and edit modes. */
  const renderCells = (r, i, isEdit) =>
    PRODUCT_SLOTS.flatMap((s, gi) => {
      const groupTint = gi % 2 ? "#f8fbff" : "#fff";
      const edge = gi > 0 ? { borderInlineStart: "3px solid #bae6fd" } : null;
      return [
        <td key={`${s.key}n`} style={{ ...UI.td, background: groupTint, textAlign: "start", fontWeight: 700, ...edge }}>
          {isEdit
            ? <input value={r[`${s.key}_name`]||""} onChange={e=>upd(i,`${s.key}_name`,e.target.value)} style={UI.input} placeholder="Product"/>
            : (safe(r[`${s.key}_name`]) || <span style={{color:"#cbd5e1"}}>—</span>)}
        </td>,
        <td key={`${s.key}t`} style={{ ...UI.td, background: groupTint, fontWeight: 700, color: "#475569" }}>
          {isEdit
            ? <input type="time" value={r[`${s.key}_time`]||""} onChange={e=>upd(i,`${s.key}_time`,e.target.value)} style={UI.input}/>
            : (safe(r[`${s.key}_time`]) || <span style={{color:"#cbd5e1"}}>—</span>)}
        </td>,
        <td key={`${s.key}d`} style={{ ...UI.td, background: groupTint }}>
          {isEdit
            ? <input type="number" step="0.1" value={r[`${s.key}_temp`]||""} onChange={e=>upd(i,`${s.key}_temp`,e.target.value)}
                     style={{...UI.input, textAlign:"center", fontWeight:900,
                             background: tempOf(r,s.key)!==null && tempOf(r,s.key)<CRITICAL_TEMP ? "#fee2e2" : "#fff"}} placeholder="°C"/>
            : <TempPill value={r[`${s.key}_temp`]}/>}
        </td>,
      ];
    });

  return (
    <div style={UI.panel}>
      {/* ── Header: what this is + what you can do ── */}
      <div style={UI.headBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 30 }}>🍳</span>
          <div style={{ minWidth: 0 }}>
            <div style={UI.titleEn}>Cooking Temperature Monitoring Record</div>
            <div style={UI.titleAr}>سجل مراقبة درجة حرارة الطبخ · {BRANCH}</div>
          </div>
        </div>
        <span style={UI.refChip}>{FORM_REF}</span>

        <div style={{ ...UI.btnGroup, marginInlineStart: "auto" }}>
          {canEdit("daily") && (
            <Btn tone={editing ? "slate" : "violet"} onClick={toggleEdit}>
              {editing ? "✕ Cancel Edit" : "✎ Edit"}
            </Btn>
          )}
          {editing && (
            <>
              <Btn tone="sky" onClick={addRow}>＋ Row</Btn>
              <Btn tone="green" onClick={saveEdit}>💾 Save Changes</Btn>
            </>
          )}
          <span style={UI.divider} />
          <Btn tone="slate" onClick={exportXLSX} disabled={!visibleRows.length}>📊 XLSX</Btn>
          <Btn tone="slate" onClick={exportJSON} disabled={!record}>🗄 JSON</Btn>
          <Btn tone="dark" onClick={exportPDF} disabled={!record}>📄 PDF</Btn>
          <Btn tone="green" onClick={() => fileInputRef.current?.click()}>⬆ Import</Btn>
          <input ref={fileInputRef} type="file" accept="application/json"
                 onChange={e=>importJSON(e.target.files?.[0])} style={{display:"none"}}/>
          <span style={UI.divider} />
          {canDelete("daily") && (
            <Btn tone="red" onClick={handleDelete} disabled={!record}>🗑 Delete</Btn>
          )}
        </div>
      </div>

      <ResponsiveReportLayout
        sidebarWidth={300}
        sidebar={
          <DateTreeSidebar
            items={dateItems}
            activeKey={date}
            onPick={(it) => setDate(it.dateISO)}
            title="📅 Report dates"
            loading={loading && !allDates.length}
            emptyText="No saved reports yet."
            maxHeight={460}
          />
        }
      >
        {loading && <div style={UI.empty}>⏳ Loading…</div>}
        {err && <div style={{ ...UI.empty, color: "#b91c1c", borderColor: "#fca5a5", background: "#fef2f2" }}>{err}</div>}
        {!loading && !err && !record && <div style={UI.empty}>📭 No report saved for {formatDMY(date)}.</div>}

        {record && (
          <>
            {/* ── Day summary — reads the CCP result without scanning the table ── */}
            <div style={UI.kpiGrid}>
              <div style={UI.kpi("#0ea5e9", "linear-gradient(135deg,#e0f2fe,#f8fafc)")}>
                <div style={UI.kpiLabel}>Rows recorded</div>
                <div style={UI.kpiValue("#0c4a6e")}>{stats.rows}</div>
                <div style={UI.kpiUnit}>سجلات</div>
              </div>
              <div style={UI.kpi("#8b5cf6", "linear-gradient(135deg,#ede9fe,#f8fafc)")}>
                <div style={UI.kpiLabel}>Temperatures taken</div>
                <div style={UI.kpiValue("#5b21b6")}>{stats.checked}</div>
                <div style={UI.kpiUnit}>قراءات</div>
              </div>
              <div style={UI.kpi(stats.below ? "#ef4444" : "#10b981", stats.below ? "linear-gradient(135deg,#fee2e2,#fff5f5)" : "linear-gradient(135deg,#dcfce7,#f8fafc)")}>
                <div style={UI.kpiLabel}>Below {CRITICAL_TEMP}°C</div>
                <div style={UI.kpiValue(stats.below ? "#991b1b" : "#166534")}>{stats.below}</div>
                <div style={UI.kpiUnit}>{stats.below ? "⚠ خرق الحد الحرج" : "✓ لا يوجد خرق"}</div>
              </div>
              <div style={UI.kpi("#10b981", "linear-gradient(135deg,#dcfce7,#f8fafc)")}>
                <div style={UI.kpiLabel}>Compliance</div>
                <div style={UI.kpiValue(stats.pct === null ? "#94a3b8" : stats.pct === 100 ? "#166534" : "#b45309")}>
                  {stats.pct === null ? "—" : `${stats.pct}%`}
                </div>
                <div style={UI.kpiUnit}>نسبة المطابقة</div>
              </div>
            </div>

            <div ref={reportRef}>
              <ReportHeader
                title="Cooking Temperature Monitoring Record"
                subtitle="Restaurant: Al Mawashi – Braai Restaurant LLC"
                titleAr="سجل مراقبة درجة حرارة الطبخ"
                fields={[
                  { label: "Report Date",         value: safe(record.payload?.reportDate) },
                  { label: "Branch",              value: safe(record.payload?.branch) },
                  { label: "Form Ref",            value: FORM_REF },
                  { label: "Area",                value: safe(record.payload?.area) },
                  { label: "Issued By",           value: safe(record.payload?.issuedBy) },
                  { label: "Controlling Officer", value: safe(record.payload?.controllingOfficer) },
                  { label: "Approved By",         value: safe(record.payload?.approvedBy) },
                  { label: "Revision No",         value: safe(record.payload?.revisionNo) },
                ]}
              />

              {/* ── Colour key, so a red cell needs no explanation ── */}
              <div style={UI.legend}>
                <span style={{ fontWeight: 900, color: "#0b1f4d" }}>Critical limit — الحد الحرج:</span>
                <span><TempPill value="78" /> &nbsp;≥ {CRITICAL_TEMP}°C — safe / مطابق</span>
                <span><TempPill value="68" /> &nbsp;&lt; {CRITICAL_TEMP}°C — corrective action required / يتطلب إجراءً تصحيحياً</span>
              </div>

              <ResponsiveTableWrap style={{ border: "1px solid #cbd5e1" }}>
                <table style={UI.table}>
                  <thead>
                    <tr>
                      <th style={{ ...UI.thGroup, width: 46 }} rowSpan={2}>#</th>
                      {PRODUCT_SLOTS.map(s => <th key={s.key} style={UI.thGroup} colSpan={3}>{s.label}</th>)}
                      <th style={UI.thGroup} rowSpan={2}>Comment{"\n"}تعليق</th>
                      <th style={UI.thGroup} rowSpan={2}>Monitored By{"\n"}مراقب بواسطة</th>
                      {editing && <th style={{ ...UI.thGroup, width: 80 }} rowSpan={2}>—</th>}
                    </tr>
                    <tr>
                      {PRODUCT_SLOTS.flatMap(s=>[
                        <th key={`${s.key}n`} style={{ ...UI.thCell, minWidth: 170 }}>Product Name{"\n"}اسم الطعام</th>,
                        <th key={`${s.key}t`} style={{ ...UI.thCell, minWidth: 95 }}>Time{"\n"}وقت</th>,
                        <th key={`${s.key}d`} style={{ ...UI.thCell, minWidth: 110 }}>Temp °C{"\n"}درجة حرارة</th>,
                      ])}
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      visibleRows.length ? visibleRows.map((r,idx)=>(
                        <tr key={idx}>
                          <td style={UI.rowNo}>{idx+1}</td>
                          {renderCells(r, idx, false)}
                          <td style={{ ...UI.td, textAlign: "start" }}>{safe(r.comment) || <span style={{color:"#cbd5e1"}}>—</span>}</td>
                          <td style={{ ...UI.td, fontWeight: 700 }}>{safe(r.monitoredBy) || <span style={{color:"#cbd5e1"}}>—</span>}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={PRODUCT_SLOTS.length*3+3} style={{ ...UI.td, padding: 28, color: "#64748b", fontWeight: 800 }}>
                            No product rows recorded for this date.
                          </td>
                        </tr>
                      )
                    ) : (
                      editRows.map((r,i)=>(
                        <tr key={i}>
                          <td style={UI.rowNo}>{i+1}</td>
                          {renderCells(r, i, true)}
                          <td style={UI.td}><input value={r.comment||""} onChange={e=>upd(i,"comment",e.target.value)} style={UI.input}/></td>
                          <td style={UI.td}><input value={r.monitoredBy||""} onChange={e=>upd(i,"monitoredBy",e.target.value)} style={UI.input}/></td>
                          <td style={UI.td}>
                            <Btn tone="red" onClick={()=>delRow(i)}>Del</Btn>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </ResponsiveTableWrap>

              <div style={UI.notes}>
                <div style={{ fontWeight: 950, marginBottom: 8, fontSize: 15.5, color: "#92400e" }}>⚠️ NOTES — ملاحظات</div>
                <ol style={{ margin: 0, paddingInlineStart: 22 }}>
                  <li>Food Must be first cooked until core temp reached &lt; 75°C or reheated core temp above 75°C</li>
                  <li>Transfer to hot holding equipment immediately after cooking or reheating</li>
                  <li>Maintain product at 60 Deg C (140 Deg F) or hotter at all times</li>
                  <li>Take temperature of food at least once per shift</li>
                </ol>
              </div>

              <div style={{ marginTop: 16, fontSize: 14.5 }}>
                <SignatureName label="Verified By" name={safe(record.payload?.verifiedBy)} inline />
              </div>
            </div>
          </>
        )}
      </ResponsiveReportLayout>
    </div>
  );
}
