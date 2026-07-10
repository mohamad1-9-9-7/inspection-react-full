// src/pages/monitor/branches/pos19/view pos 19/OilQualityMonitoringView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import unionLogo from "../../../../../assets/unioncoop-logo.png";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";
import { listReportDates, getReportByDate, invalidateReportDates } from "../_shared/reportsApi";
import SignatureName from "../../../../shared/SignatureName";



const TYPE   = "pos19_oil_quality_monitoring";
const BRANCH = "POS 19";

/* ===== Helpers & styles ===== */
const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const formatDMY = (iso) => {
  if (!iso) return iso;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const monthName = (mm) => MONTH_NAMES[Number(mm) - 1] || `Month ${mm}`;
async function loadImageDataURL(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
function emptyRow() {
  return { date: "", result: "", action: "", checkedBy: "" };
}
const hasAnyValue = (o) => Object.values(o || {}).some((v) => String(v || "").trim() !== "");

/* ===== Component ===== */
export default function OilQualityMonitoringView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  const todayDubai = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  }, []);

  // state
  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);

  const [editRows, setEditRows] = useState([emptyRow()]);
  const [editing, setEditing] = useState(false);

  // header/footer editable
  const [editSection, setEditSection]     = useState("");
  const [editVerifiedBy, setEditVerifiedBy] = useState("");
  const [editRevDate, setEditRevDate]     = useState("");
  const [editRevNo, setEditRevNo]         = useState("");

  const [allDates, setAllDates] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({});

  // styles
  const gridStyle = useMemo(() => ({
    width: "max-content",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);
  const thCell = {
    border: "1px solid rgba(255,255,255,0.18)",
    padding: "11px 10px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 800,
    fontSize: 12.5,
    letterSpacing: ".02em",
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
  };
  const tdCell = {
    border: "1px solid #e6ecf7",
    padding: "9px 10px",
    textAlign: "center",
    verticalAlign: "middle",
    fontSize: 12.5,
    color: "#0b1f4d",
  };

  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 140 }} />,
    <col key="res"  style={{ width: 380 }} />,
    <col key="act"  style={{ width: 320 }} />,
    <col key="chk"  style={{ width: 170 }} />,
  ]), []);

  /* ===== Fetch dates & records ===== */
  async function fetchAllDates() {
    try {
      const uniq = await listReportDates(TYPE);
      setAllDates(uniq);

      // Tree stays collapsed by default.
      if (!uniq.includes(date) && uniq.length) setDate(uniq[0]);
    } catch (e) {
      console.warn("Failed to fetch dates", e);
    }
  }

  async function fetchRecord(d = date) {
    setLoading(true);
    setErr("");
    setRecord(null);
    try {
      const match = await getReportByDate(TYPE, d);
      setRecord(match);

      const rows = Array.from({ length: Math.max(1, match?.payload?.entries?.length || 1) },
        (_, i) => match?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);
      setEditSection(match?.payload?.section || "");
      setEditVerifiedBy(match?.payload?.verifiedBy || "");
      setEditRevDate(match?.payload?.revDate || "");
      setEditRevNo(match?.payload?.revNo || "");
      setEditing(false);
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAllDates(); }, []);
  useEffect(() => { if (date) fetchRecord(date); }, [date]);

  /* ===== Edit / Save / Delete ===== */

  function toggleEdit() {
    if (editing) {
      const rows = Array.from({ length: Math.max(1, record?.payload?.entries?.length || 1) },
        (_, i) => record?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);
      setEditSection(record?.payload?.section || "");
      setEditVerifiedBy(record?.payload?.verifiedBy || "");
      setEditRevDate(record?.payload?.revDate || "");
      setEditRevNo(record?.payload?.revNo || "");
      setEditing(false);
      return;
    }

    setEditing(true);
  }

  async function saveEdit() {
    if (!record) return;

    const rid = getId(record);
    const cleaned = editRows.filter(hasAnyValue);

    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: cleaned, // ✅ عرض/حفظ الأسطر الممتلئة فقط
      section: editSection,
      verifiedBy: editVerifiedBy,
      revDate: editRevDate,
      revNo: editRevNo,
      savedAt: Date.now(),
    };

    try {
      setLoading(true);
      // PUT on the existing id (never DELETE+POST: a failed POST would lose the report)
      const postRes = await fetch(rid ? `${API_BASE}/api/reports/${encodeURIComponent(rid)}` : `${API_BASE}/api/reports`, {
        method: rid ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      alert("✅ Changes saved");
      setEditing(false);
      await fetchRecord(payload.reportDate);
      invalidateReportDates(TYPE); await fetchAllDates();
    } catch (e) {
      console.error(e);
      alert("❌ Saving failed.\n" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted");
      invalidateReportDates(TYPE); await fetchAllDates();
      const next = allDates.find((d) => d !== record?.payload?.reportDate) || todayDubai;
      setDate(next);
    } catch (e) {
      console.error(e);
      alert("❌ Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  /* ===== Export / Import ===== */
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS19_OilQuality_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadExcelJS() {
    try {
      const m = await import(/* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min.js");
      return m?.default ?? m;
    } catch (_) {}
    try {
      const m2 = await import(/* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min");
      return m2?.default ?? m2;
    } catch (_) {}
    const m3 = await import(/* webpackChunkName: "exceljs" */ "exceljs");
    return m3?.default ?? m3;
  }
  async function resolveSaveAs() {
    const mod = await import("file-saver");
    return mod?.saveAs || mod?.default?.saveAs || mod?.default || mod;
  }

  async function exportXLSX() {
    try {
      const ExcelJS = await loadExcelJS();
      const saveAs = await resolveSaveAs();

      const p = record?.payload || {};
      const rows = Array.isArray(p.entries) ? p.entries.filter(hasAnyValue) : [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("OilQuality");

      const borderThin = { style: "thin", color: { argb: "1F3B70" } };

      // Header ribbon (title area with logo)
      ws.mergeCells(1,1,1,10);
      ws.getRow(1).height = 22;

      const logoData = await loadImageDataURL(unionLogo);
      if (logoData && wb.addImage) {
        const imgId = wb.addImage({ base64: logoData, extension: "png" });
        ws.addImage(imgId, { tl: { col: 0, row: 0 }, ext: { width: 120, height: 45 } });
      }

      ws.mergeCells(2,8,2,10);
      ws.getCell(2,8).value = `Form Ref: ${p.formRef || "UC/HACCP/BR/F15"}`;
      ws.getCell(2,8).alignment = { horizontal: "right" };
      ws.mergeCells(3,8,3,10);
      ws.getCell(3,8).value = `Section: ${p.section || ""}`;
      ws.getCell(3,8).alignment = { horizontal: "right" };
      ws.mergeCells(4,8,4,10);
      ws.getCell(4,8).value = `Classification: ${p.classification || "Official"}`;
      ws.getCell(4,8).alignment = { horizontal: "right" };
      ws.mergeCells(5,8,5,10);
      ws.getCell(5,8).value = `Date: ${p.reportDate || ""}`;
      ws.getCell(5,8).alignment = { horizontal: "right" };

      // ===== Table headers — بدون header في ws.columns (لتفادي صف تلقائي) =====
      const HEADERS = ["Date","Evaluation Results","Corrective Action","Checked by"];

      // فقط نحدد العرض باستخدام مفاتيح بدون header
      ws.columns = [
        { key: "c_date", width: 18 },
        { key: "c_res",  width: 60 },
        { key: "c_act",  width: 46 },
        { key: "c_chk",  width: 22 },
      ];

      // نكتب الرؤوس يدويًا في الصف 7
      const headRow = ws.getRow(7);
      headRow.values = HEADERS;
      headRow.eachCell((c)=>{ 
        c.font = { bold: true }; 
        c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        c.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCE6F1" } };
      });
      headRow.height = 24;

      // Data
      let rowIdx = 8;
      rows.forEach((e) => {
        ws.getRow(rowIdx).values = [
          e?.date || "", e?.result || "", e?.action || "", e?.checkedBy || "",
        ];
        ws.getRow(rowIdx).eachCell((cell)=> {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        });
        ws.getRow(rowIdx).height = 20;
        rowIdx++;
      });

      // Footer
      rowIdx += 1;
      const footPairs = [
        ["Verified by:", p.verifiedBy || ""],
        ["Rev.Date:",    p.revDate    || ""],
        ["Rev.No:",      p.revNo      || ""],
      ];
      let colPtr = 1;
      footPairs.forEach(([label,val]) => {
        const lc = ws.getCell(rowIdx, colPtr++);
        const vc = ws.getCell(rowIdx, colPtr++);
        lc.value = label; lc.font = { bold: true };
        lc.alignment = { horizontal: "left", vertical: "middle" };
        vc.value = val;
        vc.alignment = { horizontal: "left", vertical: "middle" };
        lc.border = vc.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      });

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `POS19_OilQuality_${p.reportDate || date}.xlsx`
      );
    } catch (err) {
      console.error("[XLSX export error]", err);
      alert("⚠️ تعذر تصدير XLSX.");
    }
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      if (!payload?.reportDate) throw new Error("Invalid payload: missing reportDate");

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      alert("✅ Imported and saved");
      setDate(payload.reportDate);
      invalidateReportDates(TYPE); await fetchAllDates();
      await fetchRecord(payload.reportDate);
    } catch (e) {
      console.error(e);
      alert("❌ Invalid JSON or save failed");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  /* ===== PDF export ===== */
  async function exportPDF() {
    if (!reportRef.current) return;

    const node = reportRef.current;
    const canvas = await html2canvas(node, { scale: 2, windowWidth: node.scrollWidth, windowHeight: node.scrollHeight });
    const logo = await loadImageDataURL(unionLogo);

    const pdf = new jsPDF("p", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const headerH = 70;

    pdf.setFillColor(247, 249, 252);
    pdf.rect(0, 0, pageW, headerH, "F");
    if (logo) {
      pdf.addImage(logo, "PNG", margin, 10, 110, 110 * 0.5 * 0.9);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(`Union Coop — Oil Quality Monitoring (${record?.payload?.reportDate || date})`, pageW/2, 28, { align: "center" });

    const usableW = pageW - margin*2;
    const availableH = pageH - (headerH + 10) - margin;

    const ratio = usableW / canvas.width;
    const totalHpx = canvas.height;
    let ypx = 0;

    while (ypx < totalHpx) {
      const sliceHpx = Math.min(totalHpx - ypx, availableH / ratio);
      const partCanvas = document.createElement("canvas");
      partCanvas.width = canvas.width;
      partCanvas.height = sliceHpx;
      const ctx = partCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, ypx, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
      const partData = partCanvas.toDataURL("image/png");

      const partHpt = sliceHpx * ratio;
      pdf.addImage(partData, "PNG", margin, headerH + 10, usableW, partHpt);

      ypx += sliceHpx;
      if (ypx < totalHpx) {
        pdf.addPage("a4", "p");
        pdf.setFillColor(247, 249, 252);
        pdf.rect(0, 0, pageW, headerH, "F");
        if (logo) pdf.addImage(logo, "PNG", margin, 10, 110, 110 * 0.5 * 0.9);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(`Union Coop — Oil Quality Monitoring (${record?.payload?.reportDate || date})`, pageW/2, 28, { align: "center" });
      }
    }

    pdf.save(`POS19_OilQuality_${record?.payload?.reportDate || date}.pdf`);
  }

  /* ===== Group dates (Year -> Month -> Dates) ===== */
  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y, m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    for (const y of Object.keys(out))
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a],[b]) => Number(b) - Number(a))
          .map(([m, arr]) => [m, arr.sort((a,b)=>b.localeCompare(a))])
      );
    return Object.fromEntries(Object.entries(out).sort(([a],[b]) => Number(b) - Number(a)));
  }, [allDates]);

  const toggleYear  = (y)    => setExpandedYears((p)  => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  /* ===== UI ===== */
  const rowsToShow = (record?.payload?.entries || []).filter(hasAnyValue); // ✅ إظهار الممتلئ فقط

  const totalRecords = allDates.length;
  const tbtn = (bg, { ghost = false, disabled = false } = {}) => ({
    display: "inline-flex", alignItems: "center", gap: 6,
    background: ghost ? "#fff" : bg,
    color: ghost ? bg : "#fff",
    border: ghost ? `1px solid ${bg}` : "1px solid transparent",
    borderRadius: 9, padding: "8px 13px",
    fontWeight: 700, fontSize: 12.5, lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    boxShadow: ghost ? "none" : "0 1px 2px rgba(11,31,77,0.14)",
    transition: "transform .08s ease, box-shadow .12s ease",
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ background:"#f4f7fc", border:"1px solid #dbe3f4", borderRadius:14, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* ===== Branded banner ===== */}
      <div style={{
        display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
        padding:"14px 18px", borderRadius:14, marginBottom:14,
        background:"linear-gradient(135deg,#1e3a5f 0%,#2d5a8e 100%)",
        color:"#fff", boxShadow:"0 6px 20px rgba(30,58,95,0.28)",
      }}>
        <div style={{ width:56, height:56, borderRadius:12, background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 2px 6px rgba(0,0,0,0.15)" }}>
          <img src={unionLogo} alt="Union Coop" style={{ width:46, height:46, objectFit:"contain" }} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:900, fontSize:19, letterSpacing:".01em" }}>Oil Quality Monitoring</div>
          <div style={{ fontSize:12.5, color:"#cbd8ea", marginTop:3, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span>🍳 Al Warqa Kitchen · POS 19</span>
            <span style={{ opacity:0.5 }}>|</span>
            <span style={{ background:"rgba(255,255,255,0.14)", borderRadius:20, padding:"2px 9px", fontWeight:700 }}>Form Ref: {safe(record?.payload?.formRef || "UC/HACCP/BR/F15")}</span>
          </div>
        </div>
        <div style={{ marginInlineStart:"auto", textAlign:"right", direction:"rtl" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#fef3c7" }}>مراقبة جودة الزيت</div>
          <div style={{ fontSize:12, color:"#cbd8ea", marginTop:2 }}>مطبخ الورقاء</div>
        </div>
      </div>

      {/* ===== Action toolbar ===== */}
      <div style={{
        display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
        padding:"10px 12px", borderRadius:12, marginBottom:14,
        background:"#fff", border:"1px solid #e5ecf7", boxShadow:"0 1px 3px rgba(11,31,77,0.05)",
      }}>
        <button onClick={toggleEdit} style={tbtn(editing ? "#6b7280" : "#7c3aed", { ghost: !editing })}>
          {editing ? "✕ Cancel" : "✎ Edit"}
        </button>
        {editing && <button onClick={saveEdit} style={tbtn("#10b981")}>💾 Save Changes</button>}
        <button onClick={handleDelete} style={tbtn("#dc2626", { ghost: true })} data-delete-action="true">🗑 Delete</button>

        <span style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".05em" }}>Export</span>
          <button onClick={exportXLSX} disabled={!rowsToShow.length} style={tbtn("#0ea5e9", { disabled: !rowsToShow.length })}>📊 XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={tbtn("#0284c7", { disabled: !record })}>{"{ } JSON"}</button>
          <button onClick={exportPDF} style={tbtn("#374151")}>📄 PDF</button>
          <label style={{ ...tbtn("#059669", { ghost: true }) }}>
            ⬆ Import
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e)=>importJSON(e.target.files?.[0])}
              style={{ display:"none" }}
            />
          </label>
        </span>
      </div>

      {/* Layout: Date tree + content */}
      <div style={{ display:"grid", gridTemplateColumns:"270px 1fr", gap:14 }}>
        {/* Date tree */}
        <div style={{ border:"1px solid #e5ecf7", borderRadius:12, padding:12, background:"#fff", boxShadow:"0 1px 3px rgba(11,31,77,0.05)", alignSelf:"start" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ fontWeight:800, fontSize:13.5, color:"#1e3a5f" }}>📅 Records</div>
            <span style={{ background:"#eff6ff", color:"#2563eb", borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:800 }}>{totalRecords}</span>
          </div>
          <div style={{ maxHeight:420, overflowY:"auto" }}>
            {Object.keys(grouped).length ? (
              Object.entries(grouped).map(([year, months]) => {
                const yOpen = !!expandedYears[year];
                const yearCount = Object.values(months).reduce((a, arr) => a + arr.length, 0);
                return (
                  <div key={year} style={{ marginBottom:8 }}>
                    <button
                      onClick={()=>toggleYear(year)}
                      style={{
                        display:"flex", alignItems:"center", gap:8,
                        width:"100%", padding:"8px 11px", borderRadius:9,
                        border:"1px solid #d7e0f0", background: yOpen ? "#eff6ff" : "#f8faff",
                        cursor:"pointer", fontWeight:800, fontSize:13, color:"#1e3a5f"
                      }}
                    >
                      <span aria-hidden="true" style={{ fontSize:10, color:"#64748b" }}>{yOpen ? "▼" : "▶"}</span>
                      <span style={{ flex:1, textAlign:"left" }}>Year {year}</span>
                      <span style={{ background:"#dbeafe", color:"#1e40af", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800 }}>{yearCount}</span>
                    </button>

                    {yOpen && Object.entries(months).map(([month, days]) => {
                      const key = `${year}-${month}`;
                      const mOpen = !!expandedMonths[key];
                      return (
                        <div key={key} style={{ marginTop:6, marginLeft:10 }}>
                          <button
                            onClick={()=>toggleMonth(year, month)}
                            style={{
                              display:"flex", alignItems:"center", gap:8,
                              width:"100%", padding:"7px 10px", borderRadius:8,
                              border:"1px solid #e5ecf7", background: mOpen ? "#f8faff" : "#fff",
                              cursor:"pointer", fontWeight:700, fontSize:12.5, color:"#334155"
                            }}
                          >
                            <span aria-hidden="true" style={{ fontSize:9, color:"#94a3b8" }}>{mOpen ? "▼" : "▶"}</span>
                            <span style={{ flex:1, textAlign:"left" }}>{monthName(month)}</span>
                            <span style={{ background:"#eef2f9", color:"#475569", borderRadius:20, padding:"1px 7px", fontSize:10.5, fontWeight:800 }}>{days.length}</span>
                          </button>

                          {mOpen && (
                            <div style={{ padding:"6px 2px 0 4px", display:"grid", gap:5 }}>
                              {days.map((d)=>{
                                const activeD = d === date;
                                return (
                                  <button
                                    key={d}
                                    onClick={()=>setDate(d)}
                                    style={{
                                      display:"flex", alignItems:"center", gap:8,
                                      width:"100%", textAlign:"left", padding:"8px 11px",
                                      borderRadius:8, border:`1px solid ${activeD ? "#2563eb" : "#e5ecf7"}`,
                                      background: activeD ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#fff",
                                      color: activeD ? "#fff" : "#334155",
                                      fontWeight:700, fontSize:12.5, cursor:"pointer",
                                      boxShadow: activeD ? "0 2px 6px rgba(37,99,235,0.30)" : "none",
                                    }}
                                    title={formatDMY(d)}
                                  >
                                    <span aria-hidden="true" style={{ opacity: activeD ? 1 : 0.4 }}>{activeD ? "📄" : "•"}</span>
                                    {formatDMY(d)}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div style={{ color:"#94a3b8", fontSize:13, textAlign:"center", padding:"18px 8px" }}>No available dates.</div>
            )}
          </div>
        </div>

        {/* Report content */}
        <div style={{ minWidth: 0 }}>
          {loading && (
            <div style={{ padding:24, textAlign:"center", color:"#64748b", background:"#fff", border:"1px solid #e5ecf7", borderRadius:12 }}>⏳ Loading…</div>
          )}
          {err && (
            <div style={{ padding:14, color:"#b91c1c", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:12 }}>{err}</div>
          )}
          {!loading && !err && !record && (
            <div style={{ padding:"32px 16px", border:"1.5px dashed #c7d2e8", borderRadius:12, textAlign:"center", background:"#fff", color:"#64748b" }}>
              <div style={{ fontSize:30, marginBottom:6 }}>🗂️</div>
              <div style={{ fontWeight:700, color:"#475569" }}>No report for this date.</div>
              <div style={{ fontSize:12, marginTop:4 }}>Pick another date from the list on the left.</div>
            </div>
          )}

          {record && (
            <div style={{ overflowX:"auto", overflowY:"hidden" }}>
              <div ref={reportRef} style={{ width: "max-content", background:"#fff", padding:16, borderRadius:12, border:"1px solid #e5ecf7", boxShadow:"0 1px 4px rgba(11,31,77,0.06)" }}>
                {/* Info band (matches original form header placement) */}
                <ReportHeader
                  title="Oil Quality Monitoring"
                  fields={[
                    { label: "Report Date",    value: safe(record.payload?.reportDate) },
                    { label: "Branch",         value: safe(record.payload?.branch) },
                    { label: "Form Ref",       value: safe(record.payload?.formRef || "UC/HACCP/BR/F15") },
                    { label: "Classification", value: safe(record.payload?.classification || "Official") },
                    { label: "Section",        value: safe(record.payload?.section || "") },
                  ]}
                />

                {/* Table */}
                <div style={{ border:"1px solid #dbe3f4", borderRadius:10, overflow:"hidden", boxShadow:"0 1px 3px rgba(11,31,77,0.06)" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Date</th>
                      <th style={thCell}>Evaluation Results</th>
                      <th style={thCell}>Corrective Action</th>
                      <th style={thCell}>Checked by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      rowsToShow.length ? rowsToShow.map((r, idx) => (
                        <tr key={idx} style={{ background: idx % 2 ? "#f7faff" : "#fff" }}>
                          <td style={{ ...tdCell, fontWeight:700 }}>{formatDMY(safe(r.date))}</td>
                          <td style={{ ...tdCell, textAlign:"left" }}>{safe(r.result)}</td>
                          <td style={{ ...tdCell, textAlign:"left" }}>{safe(r.action)}</td>
                          <td style={tdCell}>{safe(r.checkedBy)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td style={{ ...tdCell, color:"#94a3b8", padding:"18px" }} colSpan={4}>No entries recorded for this date.</td>
                        </tr>
                      )
                    ) : (
                      editRows.map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>
                            <input
                              type="date"
                              value={r.date || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], date:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.result || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], result:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.action || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], action:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.checkedBy || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], checkedBy:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>

                {/* Footer info */}
                <div style={{ marginTop:12, width:"max-content" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                    <strong>Verified by:</strong>
                    {!editing ? (
                      <span style={{ display:"inline-block", minWidth:260, borderBottom:"2px solid #1f3b70", lineHeight:"1.8" }}>
                        <SignatureName name={safe(record.payload?.verifiedBy)} underline={false} />
                      </span>
                    ) : (
                      <input
                        value={editVerifiedBy}
                        onChange={(e)=>setEditVerifiedBy(e.target.value)}
                        style={{ border:"none", borderBottom:"2px solid #1f3b70", padding:"4px 6px", outline:"none", fontSize:12, color:"#0b1f4d" }}
                      />
                    )}
                  </div>

                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:12, fontSize:12 }}>
                    <div>
                      <strong>Section:</strong>{" "}
                      {!editing ? safe(record.payload?.section) : (
                        <input
                          value={editSection}
                          onChange={(e)=>setEditSection(e.target.value)}
                          style={{ border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                        />
                      )}
                    </div>
                    <div>
                      <strong>Rev. Date:</strong>{" "}
                      {!editing ? safe(record.payload?.revDate) : (
                        <input
                          type="date"
                          value={editRevDate}
                          onChange={(e)=>setEditRevDate(e.target.value)}
                          style={{ border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                        />
                      )}
                    </div>
                    <div>
                      <strong>Rev. No:</strong>{" "}
                      {!editing ? safe(record.payload?.revNo) : (
                        <input
                          value={editRevNo}
                          onChange={(e)=>setEditRevNo(e.target.value)}
                          style={{ border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
