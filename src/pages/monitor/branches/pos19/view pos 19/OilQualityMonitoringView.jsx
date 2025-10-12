// src/pages/monitor/branches/pos19/view pos 19/OilQualityMonitoringView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import unionLogo from "../../../../../assets/unioncoop-logo.png";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE   = "pos19_oil_quality_monitoring";
const BRANCH = "POS 19";

/* ===== Helpers & styles ===== */
const safe = (v) => (v ?? "");
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const btn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
});
const formatDMY = (iso) => {
  if (!iso) return iso;
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
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
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 160 }} />,
    <col key="res"  style={{ width: 420 }} />,
    <col key="act"  style={{ width: 360 }} />,
    <col key="chk"  style={{ width: 180 }} />,
  ]), []);

  /* ===== Fetch dates & records ===== */
  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const filtered = list
        .map((r) => r?.payload)
        .filter((p) => p && p.branch === BRANCH && p.reportDate);

      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);

      if (uniq.length) {
        const [y, m] = uniq[0].split("-");
        setExpandedYears((prev) => ({ ...prev, [y]: true }));
        setExpandedMonths((prev) => ({ ...prev, [`${y}-${m}`]: true }));
      }
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
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
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
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

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
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditing(true);
  }

  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
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
      if (rid) {
        try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" }); }
        catch (e) { console.warn("DELETE ignored:", e); }
      }
      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);

      alert("✅ Changes saved");
      setEditing(false);
      await fetchRecord(payload.reportDate);
      await fetchAllDates();
    } catch (e) {
      console.error(e);
      alert("❌ Saving failed.\n" + String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Deleted");
      await fetchAllDates();
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
      await fetchAllDates();
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
          .sort(([a],[b]) => Number(a) - Number(b))
          .map(([m, arr]) => [m, arr.sort((a,b)=>a.localeCompare(b))])
      );
    return Object.fromEntries(Object.entries(out).sort(([a],[b]) => Number(a) - Number(b)));
  }, [allDates]);

  const toggleYear  = (y)    => setExpandedYears((p)  => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  /* ===== UI ===== */
  const rowsToShow = (record?.payload?.entries || []).filter(hasAnyValue); // ✅ إظهار الممتلئ فقط

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ fontWeight:800, fontSize:18 }}>
          Oil Quality Monitoring — View (POS 19)
        </div>

        {/* Actions */}
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>

          <button onClick={exportXLSX} disabled={!rowsToShow.length} style={btn("#0ea5e9")}>Export XLSX</button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>Export JSON</button>
          <button onClick={exportPDF} style={btn("#374151")}>Export PDF</button>
          <label style={{ ...btn("#059669"), display:"inline-block" }}>
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e)=>importJSON(e.target.files?.[0])}
              style={{ display:"none" }}
            />
          </label>
        </div>
      </div>

      {/* Layout: Date tree + content */}
      <div style={{ display:"grid", gridTemplateColumns:"280px 1fr", gap:12 }}>
        {/* Date tree */}
        <div style={{ border:"1px solid #e5e7eb", borderRadius:10, padding:10, background:"#fafafa" }}>
          <div style={{ fontWeight:800, marginBottom:8 }}>📅 Date Tree</div>
          <div style={{ maxHeight:380, overflowY:"auto" }}>
            {Object.keys(grouped).length ? (
              Object.entries(grouped).map(([year, months]) => {
                const yOpen = !!expandedYears[year];
                return (
                  <div key={year} style={{ marginBottom:8 }}>
                    <button
                      onClick={()=>toggleYear(year)}
                      style={{
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                        width:"100%", padding:"6px 10px", borderRadius:8,
                        border:"1px solid #d1d5db", background:"#fff", cursor:"pointer", fontWeight:800
                      }}
                    >
                      <span>Year {year}</span>
                      <span aria-hidden="true">{yOpen ? "▾" : "▸"}</span>
                    </button>

                    {yOpen && Object.entries(months).map(([month, days]) => {
                      const key = `${year}-${month}`;
                      const mOpen = !!expandedMonths[key];
                      return (
                        <div key={key} style={{ marginTop:6, marginLeft:8 }}>
                          <button
                            onClick={()=>toggleMonth(year, month)}
                            style={{
                              display:"flex", alignItems:"center", justifyContent:"space-between",
                              width:"100%", padding:"6px 10px", borderRadius:8,
                              border:"1px solid #e5e7eb", background:"#fff", cursor:"pointer", fontWeight:700
                            }}
                          >
                            <span>Month {month}</span>
                            <span aria-hidden="true">{mOpen ? "▾" : "▸"}</span>
                          </button>

                          {mOpen && (
                            <div style={{ padding:"6px 2px 0 2px" }}>
                              <ul style={{ listStyle:"none", padding:0, margin:0 }}>
                                {days.map((d)=>(
                                  <li key={d} style={{ marginBottom:6 }}>
                                    <button
                                      onClick={()=>setDate(d)}
                                      style={{
                                        width:"100%", textAlign:"left", padding:"8px 10px",
                                        borderRadius:8, border:"1px solid #d1d5db",
                                        background: d===date ? "#2563eb" : "#fff",
                                        color: d===date ? "#fff" : "#111827",
                                        fontWeight:700, cursor:"pointer"
                                      }}
                                      title={formatDMY(d)}
                                    >
                                      {formatDMY(d)}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            ) : (
              <div style={{ color:"#6b7280" }}>No available dates.</div>
            )}
          </div>
        </div>

        {/* Report content */}
        <div style={{ minWidth: 0 }}>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}
          {!loading && !err && !record && (
            <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>
              No report for this date.
            </div>
          )}

          {record && (
            <div style={{ overflowX:"auto", overflowY:"hidden" }}>
              <div ref={reportRef} style={{ width: "max-content" }}>
                {/* Info band (matches original form header placement) */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:8, fontSize:12, minWidth: 900 }}>
                  <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                  <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                  <div><strong>Form Ref:</strong> {safe(record.payload?.formRef || "UC/HACCP/BR/F15")}</div>
                  <div><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</div>
                  <div><strong>Section:</strong> {safe(record.payload?.section || "")}</div>
                </div>

                {/* Table */}
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
                      (rowsToShow.length ? rowsToShow : []).map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>{formatDMY(safe(r.date))}</td>
                          <td style={tdCell}>{safe(r.result)}</td>
                          <td style={tdCell}>{safe(r.action)}</td>
                          <td style={tdCell}>{safe(r.checkedBy)}</td>
                        </tr>
                      ))
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

                {/* Footer info */}
                <div style={{ marginTop:12, width:"max-content" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                    <strong>Verified by:</strong>
                    {!editing ? (
                      <span style={{ display:"inline-block", minWidth:260, borderBottom:"2px solid #1f3b70", lineHeight:"1.8" }}>
                        {safe(record.payload?.verifiedBy)}
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
