// src/pages/monitor/branches/pos19/view pos 19/DailyCleaningChecklistView.jsx
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

const TYPE = "pos19_daily_cleaning";
const BRANCH = "POS 19";

const COLS = [
  { key: "floorWallsDrains",  label: "FLOOR/\nWALLS /\nDRAINS" },
  { key: "chillersFreezer",   label: "CHILLERS /\nFREEZER" },
  { key: "cookingArea",       label: "COOKING\nAREA" },
  { key: "preparationArea",   label: "PREPARATION\nAREA" },
  { key: "packingArea",       label: "PACKING\nAREA" },
  { key: "frontUnderCounters",label: "FRONT\n&UNDER\nCOUNTERS" },
  { key: "handWashingStation",label: "HAND\nWASHING\nSTATION" },
  { key: "equipments",        label: "EQUIPMENT\nS" },
  { key: "utensils",          label: "UTENSILS" },
  { key: "worktopTables",     label: "WORKTOP\nTABLES" },
  { key: "kitchenHoodFilters",label: "KITCHEN\nHOOD\nFILTERS" },
];

/* ===== Helpers & styles ===== */
const safe = (v) => v ?? "";
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

export default function DailyCleaningChecklistView() {
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
  const [editEntry, setEditEntry] = useState(null); // سطر واحد
  const [editing, setEditing] = useState(false);
  const [allDates, setAllDates] = useState([]);

  // accordion states
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key: YYYY-MM -> boolean

  // styles
  const gridStyle = useMemo(() => ({
    width: "100%",
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

  // colgroup (مطابق لملف الإدخال)
  const colDefs = useMemo(() => {
    const arr = [
      <col key="name" style={{ width: 170 }} />,
      <col key="time" style={{ width: 120 }} />,
    ];
    COLS.forEach((_, i) => arr.push(<col key={`c${i}`} style={{ width: 110 }} />));
    arr.push(<col key="action" style={{ width: 210 }} />);
    return arr;
  }, []);

  /* ====== Fetch ====== */
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
    setEditEntry(null);
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      setRecord(match);

      const entry = match?.payload?.entries?.[0] || null; // سطر واحد
      setEditEntry(entry ? JSON.parse(JSON.stringify(entry)) : emptyEntry());
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

  /* ====== Edit / Save / Delete with password ====== */
  const askPass = (label="") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function emptyEntry() {
    const base = { cleanerName: "", time: "", correctiveAction: "" };
    COLS.forEach((c) => (base[c.key] = ""));
    return base;
  }

  function toggleEdit() {
    if (editing) {
      setEditing(false);
      setEditEntry(record?.payload?.entries?.[0] || emptyEntry());
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditEntry(record?.payload?.entries?.[0] ? JSON.parse(JSON.stringify(record.payload.entries[0])) : emptyEntry());
    setEditing(true);
  }

  // ====== SAVE: DELETE then POST ======
  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;

    const rid = getId(record);
    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: [editEntry || {}], // سطر واحد دائمًا
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      if (rid) {
        try {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
            method: "DELETE",
          });
        } catch (e) {
          console.warn("DELETE (ignored error):", e);
        }
      }

      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!postRes.ok) {
        console.warn("POST failed", postRes.status, await postRes.text().catch(() => ""));
        throw new Error(`HTTP ${postRes.status}`);
      }

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

  /* ====== Export / Import (JSON + PDF + XLSX) ====== */
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS19_DailyCleaning_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // استبدل دالة exportXLSX بهذه
// استبدل الدالة الحالية بهذه الدالة
// ===== XLSX بتصميم كامل عبر ExcelJS (شعار + ألوان + حدود) =====
async function exportXLSX() {
  try {
    const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
    const FileSaver = await import("file-saver");

    const p = record?.payload || {};
    const e = p?.entries?.[0] || {};
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("DailyCleaning");

    // ألوان/ستايلات سريعة
    const lightBlue = "D9E2F3";
    const headerBlue = "BDD7EE";
    const tableHeaderBlue = "DCE6F1";
    const footerFill = "FCE4D6";
    const borderThin = { style: "thin", color: { argb: "1F3B70" } };

    // أعمدة (14 عمود)
    const COL_HEADERS = [
      "Cleaner Name","Time",
      ...COLS.map(c => c.label.replace(/\n/g," ")),
      "Corrective Action"
    ];
    ws.columns = [
      { header: COL_HEADERS[0], key: "nm", width: 18 },
      { header: COL_HEADERS[1], key: "tm", width: 10 },
      ...COLS.map(() => ({ width: 16 })),
      { header: COL_HEADERS[COL_HEADERS.length - 1], key: "ca", width: 22 }
    ];

    // الصف 1: عنوان أعلى الشيت
    const title = "Union Coop — POS 19 | Daily Cleaning Checklist (Butchery)";
    ws.mergeCells(1,1,1,COL_HEADERS.length);
    const r1 = ws.getCell(1,1);
    r1.value = title;
    r1.alignment = { horizontal: "center", vertical: "middle" };
    r1.font = { size: 14, bold: true };
    r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
    ws.getRow(1).height = 22;

    // الشعار (يسار أعلى الشيت)
    const dataUrl = await loadImageDataURL(unionLogo); // عندك الدالة جاهزة
    if (dataUrl) {
      const base64 = dataUrl.split(",")[1];
      const imgId = wb.addImage({ base64, extension: "png" });
      // مساحة الشعار (تقريباً) عبر خلايا A2:F6
      ws.mergeCells(2,1,6,6);
      ws.addImage(imgId, {
        tl: { col: 0.25, row: 1.2 }, // موضع نسبي
        ext: { width: 520, height: 120 },
        editAs: "oneCell",
      });
    } else {
      // لو ما قدر يحمل الشعار، نخلي الخلفية بلون فاتح
      ws.mergeCells(2,1,6,6);
      ws.getCell(2,1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } };
    }

    // يمين الشعار: Classification / Form Ref / Branch
    const meta = [
      ["Classification:", p.classification || "Official"],
      ["Form Ref:", p.formRef || "UC/HACCP/BR/F07A"],
      ["Branch:", p.branch || "POS 19"],
    ];
    // نكتبها على صفوف 2..4 بالجهة اليمنى (أعمدة I..N)
    for (let i = 0; i < meta.length; i++) {
      const rowIdx = 2 + i;
      ws.mergeCells(rowIdx, 9, rowIdx, COL_HEADERS.length);
      const c = ws.getCell(rowIdx, 9);
      c.value = `${meta[i][0]} ${meta[i][1]}`;
      c.alignment = { horizontal: "right", vertical: "middle" };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: headerBlue } };
      ws.getRow(rowIdx).height = 18;
    }

    // فاصل بلون أزرق فاتح تحت الترويسة
    ws.mergeCells(6,7,6,COL_HEADERS.length);
    ws.getCell(6,7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };

    // صف عنوان AREA
    ws.mergeCells(7,1,7,COL_HEADERS.length);
    const area = ws.getCell(7,1);
    area.value = "AREA";
    area.alignment = { horizontal: "center", vertical: "middle" };
    area.font = { bold: true, size: 13 };
    area.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
    ws.getRow(7).height = 20;

    // صف الـ Legend
    ws.mergeCells(8,1,8,COL_HEADERS.length);
    const legend = ws.getCell(8,1);
    legend.value = "(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)";
    legend.alignment = { horizontal: "center", vertical: "middle" };
    legend.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF" } };
    ws.getRow(8).height = 18;

    // صف رؤوس الجدول (الترويسة)
    const headerRowIdx = 9;
    const hr = ws.getRow(headerRowIdx);
    hr.values = COL_HEADERS;
    hr.eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: tableHeaderBlue } };
      cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
    });
    hr.height = 28;

    // صف البيانات (سطر واحد)
    const rowIdx = headerRowIdx + 1;
    const dataRow = [
      e.cleanerName || "",
      e.time || "",
      ...COLS.map(c => (e[c.key] ?? "")),
      e.correctiveAction || "",
    ];
    ws.getRow(rowIdx).values = dataRow;
    ws.getRow(rowIdx).eachCell((cell, col) => {
      cell.alignment = { horizontal: col <= 2 ? "center" : "center", vertical: "middle", wrapText: true };
      cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
    });
    ws.getRow(rowIdx).height = 22;

    // صف تذييل (Checked by … Verified … Rev.Date … Rev.No … Date …)
    const footIdx = rowIdx + 2;
    // نخلي 6 أزواج: (label, value) ونلوّن القيم بلون footerFill
    const footPairs = [
      ["Checked by:", p.checkedBy || ""],
      ["Verified by:", p.verifiedBy || ""],
      ["Rev.Date:", p.revDate || ""],
      ["Rev.No:", p.revNo || ""],
      ["Date:", p.reportDate || ""],
    ];

    // نوزّعها عبر الصف: كل زوج على خليتين متتاليتين
    let colPtr = 1;
    footPairs.forEach(([label, val]) => {
      const labelCell = ws.getCell(footIdx, colPtr++);
      const valueCell = ws.getCell(footIdx, colPtr++);
      labelCell.value = label;
      labelCell.font = { bold: true };
      labelCell.alignment = { horizontal: "left", vertical: "middle" };
      valueCell.value = val;
      valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: footerFill } };
      valueCell.alignment = { horizontal: "left", vertical: "middle" };
      // حدود خفيفة
      labelCell.border = valueCell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
    });

    // أي خلايا فاضية بالصف نلوّنها خفيف عشان الشكل العام
    for (; colPtr <= COL_HEADERS.length; colPtr++) {
      ws.getCell(footIdx, colPtr).fill = { type: "pattern", pattern: "solid", fgColor: { argb: footerFill } };
      ws.getCell(footIdx, colPtr).border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
    }
    ws.getRow(footIdx).height = 20;

    // مارجن بسيط لراحة القراءة
    ws.getColumn(1).alignment = { horizontal: "left" };

    // حفظ الملف
    const buf = await wb.xlsx.writeBuffer();
    FileSaver.saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      `POS19_DailyCleaning_${p.reportDate || date}.xlsx`
    );
  } catch (err) {
    console.error(err);
    alert("⚠️ فشل تصدير XLSX المصمم. تأكد من تثبيت exceljs و file-saver.");
  }
}

  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      if (!payload?.reportDate) throw new Error("Invalid payload: missing reportDate");

      setLoading(true);
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
      setLoading(false);
    }
  }

  /* ====== PDF (يلتقط منطقة التقرير فقط) ====== */
  async function exportPDF() {
    if (!reportRef.current) return;

    const node = reportRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
    const logo = await loadImageDataURL(unionLogo);

    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const headerH = 60;

    // header
    pdf.setFillColor(247, 249, 252);
    pdf.rect(0, 0, pageW, headerH, "F");
    if (logo) {
      const logoW = 110;
      const logoH = 110 * 0.5 * 0.9;
      pdf.addImage(logo, "PNG", margin, 8, logoW, logoH);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(
      `Union Coop — POS 19 | Daily Cleaning Checklist (Butchery) (${record?.payload?.reportDate || date})`,
      pageW / 2,
      28,
      { align: "center" }
    );

    const usableW = pageW - margin * 2;
    const availableH = pageH - (headerH + 10) - margin;

    // slice into pages if needed
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
        pdf.addPage("a4", "l");
        pdf.setFillColor(247, 249, 252);
        pdf.rect(0, 0, pageW, headerH, "F");
        if (logo) {
          const logoW = 110;
          const logoH = 110 * 0.5 * 0.9;
          pdf.addImage(logo, "PNG", margin, 8, logoW, logoH);
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(
          `Union Coop — POS 19 | Daily Cleaning Checklist (Butchery) (${record?.payload?.reportDate || date})`,
          pageW / 2,
          28,
          { align: "center" }
        );
      }
    }

    pdf.save(`POS19_DailyCleaning_${record?.payload?.reportDate || date}.pdf`);
  }

  /* ====== Group dates (Year -> Month -> Dates) ====== */
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

  const toggleYear = (y) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  /* ====== UI ====== */
  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ fontWeight:800, fontSize:18 }}>
          Daily Cleaning Checklist (Butchery) — View (POS 19)
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

          {/* XLSX بدل CSV */}
          <button onClick={exportXLSX} disabled={!record?.payload?.entries?.length} style={btn("#0ea5e9")}>
            Export XLSX
          </button>

          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>
            Export JSON
          </button>
          <button onClick={exportPDF} style={btn("#374151")}>
            Export PDF
          </button>

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
                      title={yOpen ? "Collapse" : "Expand"}
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
                            title={mOpen ? "Collapse" : "Expand"}
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
        <div>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color:"#b91c1c" }}>{err}</p>}

          {!loading && !err && !record && (
            <div style={{ padding:12, border:"1px dashed #9ca3af", borderRadius:8, textAlign:"center" }}>
              No report for this date.
            </div>
          )}

          {record && (
            <div ref={reportRef}>
              {/* Info band */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:8, fontSize:12 }}>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                <div><strong>Form Ref:</strong> {safe(record.payload?.formRef || "UC/HACCP/BR/F07A")}</div>
                <div><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</div>
              </div>

              {/* Title + Legend */}
              <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                <div style={{ ...thCell, background:"#e9f0ff" }}>AREA</div>
                <div style={{ fontSize:11, textAlign:"center", padding:"6px 0", color:"#0b1f4d" }}>
                  <strong>(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)</strong>
                </div>
              </div>

              {/* Table (سطر واحد) */}
              <div style={{ overflowX:"auto" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Cleaner Name</th>
                      <th style={thCell}>Time</th>
                      {COLS.map((c)=><th key={c.key} style={thCell}>{c.label}</th>)}
                      <th style={thCell}>CORRECTIVE{"\n"}ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      <tr>
                        <td style={tdCell}>{safe(record.payload?.entries?.[0]?.cleanerName)}</td>
                        <td style={tdCell}>{safe(record.payload?.entries?.[0]?.time)}</td>
                        {COLS.map((c)=>(
                          <td key={c.key} style={tdCell}>{safe(record.payload?.entries?.[0]?.[c.key])}</td>
                        ))}
                        <td style={tdCell}>{safe(record.payload?.entries?.[0]?.correctiveAction)}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td style={tdCell}>
                          <input
                            type="text"
                            value={editEntry?.cleanerName || ""}
                            onChange={(e)=>setEditEntry((p)=>({ ...(p||{}), cleanerName: e.target.value }))}
                            style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                          />
                        </td>
                        <td style={tdCell}>
                          <input
                            type="time"
                            value={editEntry?.time || ""}
                            onChange={(e)=>setEditEntry((p)=>({ ...(p||{}), time: e.target.value }))}
                            style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                          />
                        </td>
                        {COLS.map((c)=>(
                          <td key={c.key} style={tdCell}>
                            <select
                              value={editEntry?.[c.key] || ""}
                              onChange={(e)=>setEditEntry((p)=>({ ...(p||{}), [c.key]: e.target.value }))}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                              title="√ = Satisfactory, ✗ = Needs Improvement"
                            >
                              <option value=""></option>
                              <option value="√">√</option>
                              <option value="✗">✗</option>
                            </select>
                          </td>
                        ))}
                        <td style={tdCell}>
                          <input
                            type="text"
                            value={editEntry?.correctiveAction || ""}
                            onChange={(e)=>setEditEntry((p)=>({ ...(p||{}), correctiveAction: e.target.value }))}
                            style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer info */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:12, fontSize:12 }}>
                <div><strong>Checked by:</strong> {safe(record.payload?.checkedBy)}</div>
                <div><strong>Verified by:</strong> {safe(record.payload?.verifiedBy)}</div>
                <div><strong>Rev.Date:</strong> {safe(record.payload?.revDate)}</div>
                <div><strong>Rev.No:</strong> {safe(record.payload?.revNo)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// انتهى الملف تاريخ05/10/2025 
