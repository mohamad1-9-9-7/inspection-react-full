// src/pages/monitor/branches/pos19/view pos 19/GlassItemsConditionChecklistView.jsx
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

const TYPE   = "pos19_glass_items_condition";
const BRANCH = "POS 19";

const LEGEND_COLS = [
  { key: "inGoodRepair", label: "In good repair and condition" },
  { key: "noBreakage",   label: "No signs of glass breakage" },
  { key: "cleanDry",     label: "Visibly clean and dry" },
];

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
  return {
    date: "",
    glassItem: "",
    section: "",
    inGoodRepair: "",
    noBreakage: "",
    cleanDry: "",
    correctiveAction: "",
    checkedBy: "",
  };
}

export default function GlassItemsConditionChecklistView() {
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
  const [editRows, setEditRows] = useState(Array.from({ length: 5 }, () => emptyRow()));
  const [editing, setEditing] = useState(false);
  const [allDates, setAllDates] = useState([]);
  // ✅ Footer editable state
  const [footer, setFooter] = useState({ verifiedBy: "", revDate: "", revNo: "" });

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

  // colgroup (مطابق للإدخال)
  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 120 }} />,
    <col key="glass" style={{ width: 210 }} />,
    <col key="section" style={{ width: 160 }} />,
    ...LEGEND_COLS.map((_, i) => <col key={`lg${i}`} style={{ width: 160 }} />),
    <col key="ca" style={{ width: 220 }} />,
    <col key="checked" style={{ width: 140 }} />,
  ]), []);

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
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;
      setRecord(match);

      // rows (حتى 5 أسطر)
      const rows = Array.from({ length: 5 }, (_, i) => match?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);

      // ✅ footer from payload
      setFooter({
        verifiedBy: match?.payload?.verifiedBy || "",
        revDate: match?.payload?.revDate || "",
        revNo: match?.payload?.revNo || "",
      });

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

  function toggleEdit() {
    if (editing) {
      // إلغاء: ارجع للبيانات الأصلية من السجل
      const rows = Array.from({ length: 5 }, (_, i) => record?.payload?.entries?.[i] || emptyRow());
      setEditRows(rows);
      setFooter({
        verifiedBy: record?.payload?.verifiedBy || "",
        revDate: record?.payload?.revDate || "",
        revNo: record?.payload?.revNo || "",
      });
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
    const cleaned = editRows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );

    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: cleaned,              // حتى 5 أسطر
      verifiedBy: footer.verifiedBy, // ✅ جديد
      revDate: footer.revDate,       // ✅ جديد
      revNo: footer.revNo,           // ✅ جديد
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      if (rid) {
        try {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
        } catch (e) {
          console.warn("DELETE (ignored error):", e);
        }
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

  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS19_GlassItems_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ===== Helpers for XLSX export ===== */
  // 1) تحميل exceljs للمتصفح (نحاول dist أولاً لتفادي تحذير webpack)
  async function loadExcelJS() {
    try {
      const m = await import(/* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min.js");
      const ExcelJS = m?.default ?? m;
      if (ExcelJS?.Workbook) return ExcelJS;
    } catch (_) {}

    try {
      const m2 = await import(/* webpackChunkName: "exceljs-browser" */ "exceljs/dist/exceljs.min");
      const ExcelJS2 = m2?.default ?? m2;
      if (ExcelJS2?.Workbook) return ExcelJS2;
    } catch (_) {}

    const m3 = await import(/* webpackChunkName: "exceljs" */ "exceljs");
    const ExcelJS3 = m3?.default ?? m3;
    if (ExcelJS3?.Workbook) return ExcelJS3;
    throw new Error("Failed to load ExcelJS");
  }

  // 2) حل file-saver بغض النظر عن نوع التصدير
  async function resolveSaveAs() {
    const mod = await import("file-saver");
    return mod?.saveAs || mod?.default?.saveAs || mod?.default || mod;
  }

  // 3) Fallback CSV لو فشل xlsx
  function fallbackCSV(p) {
    const headers = [
      "Date","Glass Item","Section",
      ...LEGEND_COLS.map(c=>c.label),
      "Corrective Action (if any)","Checked by"
    ];
    const rows = (p.entries || []).map(e => ([
      e?.date ?? "", e?.glassItem ?? "", e?.section ?? "",
      e?.inGoodRepair ?? "", e?.noBreakage ?? "", e?.cleanDry ?? "",
      e?.correctiveAction ?? "", e?.checkedBy ?? ""
    ]));
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS19_GlassItems_${p.reportDate || date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // 4) الدالة المصححة لتصدير XLSX (بدون تداخل دمج خلايا)
  async function exportXLSX() {
    try {
      const ExcelJS = await loadExcelJS();
      const saveAs = await resolveSaveAs();

      const p = record?.payload || {};
      const rows = Array.isArray(p.entries) ? p.entries : [];

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("GlassItems");

      const lightBlue = "D9E2F3";
      const headerBlue = "BDD7EE";
      const borderThin = { style: "thin", color: { argb: "1F3B70" } };

      const COL_HEADERS = [
        "Date","Glass Item","Section",
        ...LEGEND_COLS.map(c => c.label),
        "Corrective Action (if any)","Checked by"
      ];
      ws.columns = [
        { header: COL_HEADERS[0], width: 12 },
        { header: COL_HEADERS[1], width: 28 },
        { header: COL_HEADERS[2], width: 18 },
        ...LEGEND_COLS.map(() => ({ width: 22 })),
        { header: COL_HEADERS[COL_HEADERS.length - 2], width: 28 },
        { header: COL_HEADERS[COL_HEADERS.length - 1], width: 16 },
      ];

      // الصف 1: عنوان
      ws.mergeCells(1,1,1,COL_HEADERS.length);
      const r1 = ws.getCell(1,1);
      r1.value = "Union Coop — POS 19 | Glass Items Condition Monitoring Checklist (Weekly)";
      r1.alignment = { horizontal: "center", vertical: "middle" };
      r1.font = { size: 14, bold: true };
      r1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      ws.getRow(1).height = 22;

      // الشعار (A2:E5) — غير مانع للتصدير لو فشل
      try {
        const dataUrl = await loadImageDataURL(unionLogo);
        if (dataUrl) {
          const base64 = dataUrl.split(",")[1];
          const imgId = wb.addImage({ base64, extension: "png" });
          ws.mergeCells(2,1,5,5);
          ws.addImage(imgId, {
            tl: { col: 0.25, row: 1.2 },
            ext: { width: 520, height: 120 },
            editAs: "oneCell",
          });
        } else {
          ws.mergeCells(2,1,5,5);
        }
      } catch { ws.mergeCells(2,1,5,5); }

      // الميتا (يمين): الصفوف 2..6
      const meta = [
        ["Classification:", p.classification || "Official"],
        ["Form Ref:",      p.formRef       || "UC/HACCP/BR/F29"],
        ["Branch:",        p.branch        || "POS 19"],
        ["Section:",       p.section       || ""],
        ["Date:",          p.reportDate    || ""],
      ];
      for (let i = 0; i < meta.length; i++) {
        const rowIdx = 2 + i; // 2..6
        ws.mergeCells(rowIdx, 7, rowIdx, COL_HEADERS.length);
        const c = ws.getCell(rowIdx, 7);
        c.value = `${meta[i][0]} ${meta[i][1]}`;
        c.alignment = { horizontal: "right", vertical: "middle" };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "BDD7EE" } };
        ws.getRow(rowIdx).height = 18;
      }

      // LEGEND في الصف 7
      ws.mergeCells(7,1,7,COL_HEADERS.length);
      const legend = ws.getCell(7,1);
      legend.value = "LEGEND: (√) – Satisfactory & (✗) – Needs Improvement";
      legend.alignment = { horizontal: "center", vertical: "middle" };
      legend.font = { bold: true, size: 12 };
      legend.fill = { type: "pattern", pattern: "solid", fgColor: { argb: lightBlue } };
      ws.getRow(7).height = 18;

      // رؤوس الجدول في الصف 8
      const headerRowIdx = 8;
      const hr = ws.getRow(headerRowIdx);
      hr.values = COL_HEADERS;
      hr.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "DCE6F1" } };
        cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      });
      hr.height = 28;

      // البيانات (حتى 5 صفوف) تبدأ من الصف 9
      let rowIdx = headerRowIdx + 1;
      rows.forEach((e) => {
        ws.getRow(rowIdx).values = [
          e?.date || "", e?.glassItem || "", e?.section || "",
          e?.inGoodRepair || "", e?.noBreakage || "", e?.cleanDry || "",
          e?.correctiveAction || "", e?.checkedBy || "",
        ];
        ws.getRow(rowIdx).eachCell((cell) => {
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
        });
        ws.getRow(rowIdx).height = 22;
        rowIdx++;
      });

      // Footer: Verified / Rev (بعد صفوف البيانات + سطر فاصل)
      const footIdx = rowIdx + 1;
      const footPairs = [
        ["Verified by:", p.verifiedBy || ""],
        ["Rev.Date:",    p.revDate    || ""],
        ["Rev.No:",      p.revNo      || ""],
      ];
      let colPtr = 1;
      footPairs.forEach(([label, val]) => {
        const labelCell = ws.getCell(footIdx, colPtr++);
        const valueCell = ws.getCell(footIdx, colPtr++);
        labelCell.value = label;
        labelCell.font = { bold: true };
        labelCell.alignment = { horizontal: "left", vertical: "middle" };
        valueCell.value = val;
        valueCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FCE4D6" } };
        valueCell.alignment = { horizontal: "left", vertical: "middle" };
        labelCell.border = valueCell.border = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };
      });

      const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `POS19_GlassItems_${p.reportDate || date}.xlsx`
      );
    } catch (err) {
      console.error("[XLSX export error]", err);
      // Fallback CSV حتى لا يتعطل شغلك
      try {
        const p = record?.payload || {};
        fallbackCSV(p);
        alert("⚠️ تعذر تصدير XLSX، تم تصدير CSV بدلاً منه.\n" + (err?.message || err));
      } catch (e2) {
        alert("⚠️ فشل تصدير XLSX وCSV.\n" + (err?.message || err));
      }
    }
  }

  /* ===== Import JSON ===== */
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

  /* ====== PDF (التقرير فقط) ====== */
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
      `Union Coop — POS 19 | Glass Items Condition Monitoring Checklist (Weekly) (${record?.payload?.reportDate || date})`,
      pageW / 2,
      28,
      { align: "center" }
    );

    const usableW = pageW - margin * 2;
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
          `Union Coop — POS 19 | Glass Items Condition Monitoring Checklist (Weekly) (${record?.payload?.reportDate || date})`,
          pageW / 2,
          28,
          { align: "center" }
        );
      }
    }

    pdf.save(`POS19_GlassItems_${record?.payload?.reportDate || date}.pdf`);
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

  const toggleYear  = (y)    => setExpandedYears((p)  => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  /* ====== UI ====== */
  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ fontWeight:800, fontSize:18 }}>
          Glass Items Condition Monitoring Checklist (Weekly) — View (POS 19)
        </div>

        {/* Actions — داخل التقرير */}
        <div style={{ marginInlineStart:"auto", display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")}>
            Delete (password)
          </button>

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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:8, marginBottom:8, fontSize:12 }}>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                <div><strong>Form Ref:</strong> {safe(record.payload?.formRef || "UC/HACCP/BR/F29")}</div>
                <div><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</div>
                <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
              </div>

              {/* Legend */}
              <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                <div style={{ ...thCell, background:"#e9f0ff" }}>
                  LEGEND: (√) – Satisfactory & (✗) – Needs Improvement
                </div>
              </div>

              {/* Table (حتى 5 أسطر) */}
              <div style={{ overflowX:"auto" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Date</th>
                      <th style={thCell}>Glass Item</th>
                      <th style={thCell}>Section</th>
                      {LEGEND_COLS.map((c) => (
                        <th key={c.key} style={thCell}>{c.label}</th>
                      ))}
                      <th style={thCell}>Corrective Action{"\n"}(if any)</th>
                      <th style={thCell}>Checked by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      (Array.from({ length: 5 }, (_, i) => record.payload?.entries?.[i] || emptyRow())).map((r, idx) => (
                        <tr key={idx}>
                          <td style={tdCell}>{formatDMY(safe(r.date))}</td>
                          <td style={tdCell}>{safe(r.glassItem)}</td>
                          <td style={tdCell}>{safe(r.section)}</td>
                          <td style={tdCell}>{safe(r.inGoodRepair)}</td>
                          <td style={tdCell}>{safe(r.noBreakage)}</td>
                          <td style={tdCell}>{safe(r.cleanDry)}</td>
                          <td style={tdCell}>{safe(r.correctiveAction)}</td>
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
                              value={r.glassItem || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], glassItem:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            />
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.section || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], section:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            />
                          </td>
                          <td style={tdCell}>
                            <select
                              value={r.inGoodRepair || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], inGoodRepair:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            >
                              <option value=""></option><option value="√">√</option><option value="✗">✗</option>
                            </select>
                          </td>
                          <td style={tdCell}>
                            <select
                              value={r.noBreakage || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], noBreakage:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            >
                              <option value=""></option><option value="√">√</option><option value="✗">✗</option>
                            </select>
                          </td>
                          <td style={tdCell}>
                            <select
                              value={r.cleanDry || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], cleanDry:e.target.value}; return n; })}
                              style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                            >
                              <option value=""></option><option value="√">√</option><option value="✗">✗</option>
                            </select>
                          </td>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.correctiveAction || ""}
                              onChange={(e)=>setEditRows((prev)=>{ const n=[...prev]; n[idx]={...n[idx], correctiveAction:e.target.value}; return n; })}
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

              {/* Footer info: Verified + Rev + NOTE */}
              <div style={{ marginTop:12 }}>
                {/* Verified by */}
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                  <strong>Verified by:</strong>
                  {!editing ? (
                    <span style={{ display:"inline-block", minWidth:260, borderBottom:"2px solid #1f3b70", lineHeight:"1.8" }}>
                      {safe(record.payload?.verifiedBy)}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={footer.verifiedBy}
                      onChange={(e)=>setFooter((p)=>({ ...p, verifiedBy: e.target.value }))}
                      placeholder=""
                      style={{
                        flex: "0 1 360px",
                        border: "none",
                        borderBottom: "2px solid #1f3b70",
                        padding: "4px 6px",
                        outline: "none",
                        fontSize: 12,
                        color: "#0b1f4d",
                      }}
                    />
                  )}
                </div>

                {/* NOTE */}
                <div style={{ marginTop:8, fontSize:11, color:"#0b1f4d" }}>
                  <strong>NOTE:</strong> Any glass items found defective or not within the standards should be removed from the section.
                </div>

                {/* Rev.Date / Rev.No */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12, fontSize:12 }}>
                  <div>
                    <strong>Rev. Date:</strong>{" "}
                    {!editing ? (
                      <>{safe(record.payload?.revDate)}</>
                    ) : (
                      <input
                        type="date"
                        value={footer.revDate}
                        onChange={(e)=>setFooter((p)=>({ ...p, revDate: e.target.value }))}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          border: "1px solid #c7d2fe",
                          borderRadius: 6,
                          padding: "4px 6px",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <strong>Rev. No:</strong>{" "}
                    {!editing ? (
                      <>{safe(record.payload?.revNo)}</>
                    ) : (
                      <input
                        type="text"
                        value={footer.revNo}
                        onChange={(e)=>setFooter((p)=>({ ...p, revNo: e.target.value }))}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          border: "1px solid #c7d2fe",
                          borderRadius: 6,
                          padding: "4px 6px",
                        }}
                      />
                    )}
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
