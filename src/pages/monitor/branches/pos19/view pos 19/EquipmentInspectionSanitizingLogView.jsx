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

const TYPE   = "pos19_equipment_inspection";
const BRANCH = "POS 19";
const FORM_REF = "UC/HACCP/BR/F17"; // رقم مرجعي ثابت

// نوافذ التعقيم
const SLOTS = [
  { key: "s_8_9_AM",  label: "8-9 AM" },
  { key: "s_12_1_PM", label: "12-1 PM" },
  { key: "s_4_5_PM",  label: "4-5 PM" },
  { key: "s_8_9_PM",  label: "8-9 PM" },
  { key: "s_12_1_AM", label: "12-1 AM" },
];

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

function emptyRow() {
  const base = {
    equipment: "",
    freeFromDamage: "",
    freeFromBrokenPieces: "",
    correctiveAction: "",
    checkedByRow: "",
  };
  SLOTS.forEach(s => (base[s.key] = ""));
  return base;
}

export default function EquipmentInspectionSanitizingLogView() {
  const reportRef = useRef(null);
  const fileInputRef = useRef(null);

  // اليوم دبي
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
  const [editing, setEditing] = useState(false);
  const [editRows, setEditRows] = useState([]);
  const [allDates, setAllDates] = useState([]);

  // accordion
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key: YYYY-MM

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

  // colgroup
  const colDefs = useMemo(() => ([
    <col key="equip" style={{ width: 280 }} />,
    <col key="freeDamage" style={{ width: 140 }} />,
    <col key="freeBroken" style={{ width: 160 }} />,
    ...SLOTS.map((_, i) => <col key={`s${i}`} style={{ width: 90 }} />),
    <col key="corr" style={{ width: 220 }} />,
    <col key="chk" style={{ width: 140 }} />,
  ]), []);

  // ===== Fetch dates & record =====
  async function fetchAllDates() {
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const filtered = list.map((r) => r?.payload).filter((p) => p && p.branch === BRANCH && p.reportDate);
      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) => b.localeCompare(a));
      setAllDates(uniq);

      // expand latest Y/M
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
    setEditRows([]);
    try {
      const q = new URLSearchParams({ type: TYPE });
      const res = await fetch(`${API_BASE}/api/reports?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data ?? [];

      const match = list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;

      // فرض رقم المرجع الصحيح عند العرض
      if (match?.payload) match.payload.formRef = FORM_REF;

      setRecord(match);
      const rows = match?.payload?.entries ?? [];
      setEditRows(rows.length ? JSON.parse(JSON.stringify(rows)) : [emptyRow()]);
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

  // ===== Edit / Save / Delete =====
  const askPass = (label = "") => (window.prompt(`${label}\nEnter password:`) || "") === "9999";

  function toggleEdit() {
    if (editing) {
      setEditing(false);
      setEditRows(record?.payload?.entries || []);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditRows(record?.payload?.entries ? JSON.parse(JSON.stringify(record.payload.entries)) : [emptyRow()]);
    setEditing(true);
  }

  // حفظ: نحذف السجل ثم نُنشئ واحداً لتفادي unique constraint
  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;

    // تحقق منطقي
    for (const r of editRows) {
      const risky =
        r.freeFromDamage === "No" ||
        r.freeFromBrokenPieces === "No" ||
        SLOTS.some((s) => r[s.key] === "✗");
      if (risky && !String(r.correctiveAction || "").trim()) {
        alert("هناك صف به (✗ أو No) بدون Corrective Action.");
        return;
      }
    }

    const rid = getId(record);
    const payload = {
      ...(record?.payload || {}),
      formRef: FORM_REF,              // تثبيت المرجع عند الحفظ
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: editRows,
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      if (rid) {
        try {
          await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
        } catch (e) { console.warn("DELETE ignored:", e); }
      }

      const postRes = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!postRes.ok) {
        console.warn("POST failed", postRes.status, await postRes.text().catch(()=>"" ));
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

  // ===== Export / Import =====
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: { ...record.payload, formRef: FORM_REF } }; // ضمان المرجع الصحيح
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS19_EquipmentInspection_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ====== Export XLSX (بدون تنسيقات خلوية — لا يظهر تحذير Excel) ======
  // ===== Export XLSX (ExcelJS | تصميم مطابق للتقرير) =====
async function exportXLSX() {
  try {
    // تحتاج تثبيت:  npm i exceljs
    const ExcelJS = (await import("exceljs")).default;

    const p = record?.payload || {};
    const rows = Array.isArray(p.entries) ? p.entries : [];
    const reportDate = p.reportDate || date;

    // رؤوس الجدول (10 أعمدة)
    const HEADERS = [
      "Equipment’s",
      "Free from damage (yes/no)",
      "Free from broken metal/plastic pieces (yes/no)",
      ...SLOTS.map((s) => s.label), // 5 فترات
      "Corrective Action (if any)",
      "Checked by",
    ];
    const lastCol = HEADERS.length; // = 10

    // ألوان وخطوط
    const BLUE = "1F3B70";
    const SKY  = "E9F0FF";
    const HEAD = "F5F8FF";
    const BLACK = "000000";

    const thinBorder = {
      top: { style: "thin", color: { argb: BLUE } },
      left: { style: "thin", color: { argb: BLUE } },
      bottom:{ style: "thin", color: { argb: BLUE } },
      right: { style: "thin", color: { argb: BLUE } },
    };

    // Workbook / Worksheet
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Equipment Log", {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    // عرض الأعمدة
    ws.columns = [
      { width: 40 }, // Equipment’s
      { width: 18 }, // Free damage
      { width: 32 }, // Free broken metal/plastic
      ...SLOTS.map(() => ({ width: 10 })), // 5 فترات
      { width: 28 }, // Corrective
      { width: 14 }, // Checked by
    ];

    // ===== الهيدر: شعار + معلومات النموذج =====
    // ===== الهيدر: شعار + معلومات النموذج =====
const logoDataUrl = await loadImageDataURL(unionLogo);
if (logoDataUrl) {
  const base64 = logoDataUrl.split(",")[1];
  const imgId = wb.addImage({ base64, extension: "png" });

  // اضبط ارتفاع صفوف الهيدر بحيث يكون عندك فراغ نظيف أعلى التقرير
  ws.getRow(1).height = 26;   // صفّ 1
  ws.getRow(2).height = 26;   // صفّ 2 (العنوان)
  ws.getRow(3).height = 24;   // صفّ 3 (Branch/Section)

  // ⬅️ المقاس المطلوب (عدّل الأرقام إذا بدك):
  const LOGO_W = 190;  // العرض بالبكسل
  const LOGO_H = 72;   // الارتفاع بالبكسل

  // ضع الشعار في الزاوية اليسار العليا مع حجم ثابت
  ws.addImage(imgId, {
    tl:  { col: 0.15, row: 0.15 },   // نقطة البداية (يسار/أعلى) نسبة عمود/صف
    ext: { width: LOGO_W, height: LOGO_H }, // الحجم بالبكسل
    // editAs: "oneCell",  // (اختياري) يُبقيه ثابت داخل الخلية الأولى
  });
}


    // I1: Form Ref   | J1: Classification
    ws.getCell(1, 9).value  = `Form Ref: ${FORM_REF}`;
    ws.getCell(1,10).value  = `Classification: ${safe(p.classification || "Official")}`;
    [ws.getCell(1, 9), ws.getCell(1, 10)].forEach((c) => {
      c.font = { bold: true, size: 11 };
      c.alignment = { vertical: "middle" };
    });

    // I3: Branch     | J3: Section
    ws.getCell(3, 9).value  = `Branch: ${safe(p.branch || BRANCH)}`;
    ws.getCell(3,10).value  = `Section: ${safe(p.section || "")}`;
    [ws.getCell(3, 9), ws.getCell(3, 10)].forEach((c) => {
      c.font = { bold: true, size: 11 };
      c.alignment = { vertical: "middle" };
    });

    // صف 4: عنوان داخلي عبر كل الأعمدة
    ws.mergeCells(4, 1, 4, lastCol);
    const title = ws.getCell(4, 1);
    title.value = "Union Coop — POS 19 | Equipment Inspection & Sanitizing Log";
    title.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    title.font = { bold: true, size: 14, color: { argb: BLACK } };

    // صف 5: "Sanitize every 4 hours"
    ws.mergeCells(5, 1, 5, lastCol);
    const band = ws.getCell(5, 1);
    band.value = "Sanitize every 4 hours";
    band.alignment = { horizontal: "center", vertical: "middle" };
    band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SKY } };
    band.font = { bold: true, color: { argb: BLUE } };
    band.border = thinBorder;

    // صف 6: الأسطورة/الليجند
    ws.mergeCells(6, 1, 6, lastCol);
    const legend = ws.getCell(6, 1);
    legend.value = "(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)";
    legend.alignment = { horizontal: "center", vertical: "middle" };
    legend.font = { size: 11 };
    legend.border = thinBorder;

    // ===== رأس الجدول (صف 7) =====
    const headerRowIdx = 7;
    HEADERS.forEach((txt, i) => {
      const cell = ws.getCell(headerRowIdx, i + 1);
      cell.value = txt;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.font = { bold: true, color: { argb: BLUE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
      cell.border = thinBorder;
      ws.getRow(headerRowIdx).height = 28;
    });

    // ===== جسم الجدول =====
    let rIdx = headerRowIdx + 1;

    const put = (r, c, v, align = "center") => {
      const cell = ws.getCell(r, c);
      cell.value = v;
      cell.alignment = { horizontal: align, vertical: "middle", wrapText: true };
      cell.border = thinBorder;
      return cell;
    };

    if (rows.length === 0) {
      for (let c = 1; c <= lastCol; c++) put(rIdx, c, "—");
      rIdx++;
    } else {
      rows.forEach((row) => {
        let c = 1;
        put(rIdx, c++, safe(row.equipment), "left");
        put(rIdx, c++, safe(row.freeFromDamage));
        put(rIdx, c++, safe(row.freeFromBrokenPieces));
        SLOTS.forEach((s) => {
          const v = safe(row[s.key]);
          const cell = put(rIdx, c++, v);
          if (v === "√") cell.font = { bold: true, color: { argb: "166534" } };
          if (v === "✗" || v === "X" || v === "x") cell.font = { bold: true, color: { argb: "B91C1C" } };
        });
        put(rIdx, c++, safe(row.correctiveAction), "left");
        put(rIdx, c++, safe(row.checkedByRow), "center");
        rIdx++;
      });
    }

    // صف فارغ قبل الفوتر
    rIdx += 1;

    /* ===== الفوتر — السطر الأول: Checked / Verified ===== */
    // A..E => "Checked by (footer): ..."   |   F..J => "Verified by: ..."
    ws.mergeCells(rIdx, 1, rIdx, 5);
    ws.mergeCells(rIdx, 6, rIdx, 10);

    const fChecked = ws.getCell(rIdx, 1);
    fChecked.value = `Checked by (footer): ${safe(p.checkedBy)}`;
    fChecked.alignment = { horizontal: "left", vertical: "middle" };
    fChecked.border = thinBorder;
    fChecked.font = { bold: true };

    const fVerified = ws.getCell(rIdx, 6);
    fVerified.value = `Verified by: ${safe(p.verifiedBy)}`;
    fVerified.alignment = { horizontal: "left", vertical: "middle" };
    fVerified.border = thinBorder;
    fVerified.font = { bold: true };

    // سطر فاصل اختياري:
    // rIdx += 1;

    /* ===== الفوتر — السطر الثاني: Rev.Date / Rev.No / Date ===== */
    rIdx += 1; // انتقل للسطر التالي للفوتر الثاني

    // Rev.Date: A..B   | Rev.No: D..E   | Date: G..I
    ws.mergeCells(rIdx, 1, rIdx, 2);
    ws.mergeCells(rIdx, 4, rIdx, 5);
    ws.mergeCells(rIdx, 7, rIdx, 9);

    const f1 = ws.getCell(rIdx, 1);
    f1.value = `Rev.Date: ${safe(p.revDate || "")}`;
    const f2 = ws.getCell(rIdx, 4);
    f2.value = `Rev.No: ${safe(p.revNo || "")}`;
    const f3 = ws.getCell(rIdx, 7);
    f3.value = `Date: ${safe(reportDate)}`;

    [f1, f2, f3].forEach((cell) => {
      cell.alignment = { horizontal: "left", vertical: "middle" };
      cell.border = thinBorder;
      cell.font = { bold: true };
    });

    // نغلق الصف بالكامل بحدود خفيفة
    for (let c = 1; c <= lastCol; c++) {
      ws.getCell(rIdx, c).border = ws.getCell(rIdx, c).border || thinBorder;
    }

    // حفظ الملف
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS19_EquipmentInspection_${reportDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error(e);
    alert("⚠️ فشل إنشاء XLSX (ExcelJS).\n" + (e?.message || e));
  }
}


  async function importJSON(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const payload = parsed?.payload || parsed;
      if (!payload?.reportDate) throw new Error("Invalid payload: missing reportDate");

      // تصحيح المرجع عند الاستيراد
      payload.formRef = FORM_REF;

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

  // PDF
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
      `Union Coop — POS 19 | Equipment Inspection & Sanitizing Log (${record?.payload?.reportDate || date})`,
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
          `Union Coop — POS 19 | Equipment Inspection & Sanitizing Log (${record?.payload?.reportDate || date})`,
          pageW / 2,
          28,
          { align: "center" }
        );
      }
    }

    pdf.save(`POS19_EquipmentInspection_${record?.payload?.reportDate || date}.pdf`);
  }

  // ===== Grouping dates =====
  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y, m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    for (const y of Object.keys(out)) {
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a],[b]) => Number(a) - Number(b))
          .map(([m, arr]) => [m, arr.sort((a,b)=>a.localeCompare(b))])
      );
    }
    return Object.fromEntries(Object.entries(out).sort(([a],[b]) => Number(a) - Number(b)));
  }, [allDates]);

  const toggleYear  = (y)    => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) => setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  // ===== UI =====
  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", direction:"ltr" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width:56, height:56, objectFit:"contain" }} />
        <div style={{ fontWeight:800, fontSize:18 }}>
          Equipment Inspection &amp; Sanitizing Log — View (POS 19)
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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:8, marginBottom:8, fontSize:12 }}>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
                <div><strong>Form Ref:</strong> {FORM_REF}</div>
                <div><strong>Classification:</strong> {safe(record.payload?.classification || "Official")}</div>
              </div>

              {/* Title + Legend */}
              <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
                <div style={{ ...thCell, background:"#e9f0ff" }}>Sanitize every 4 hours</div>
                <div style={{ fontSize:11, textAlign:"center", padding:"6px 0", color:"#0b1f4d" }}>
                  <strong>(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)</strong>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX:"auto" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Equipment’s</th>
                      <th style={thCell}>Free from{"\n"}damage{"\n"}(yes/no)</th>
                      <th style={thCell}>Free from{"\n"}broken metal/plastic pieces{"\n"}(yes/no)</th>
                      {SLOTS.map((s) => <th key={s.key} style={thCell}>{s.label}</th>)}
                      <th style={thCell}>Corrective{"\n"}Action{"\n"}(if any)</th>
                      <th style={thCell}>Checked{"\n"}by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      record.payload?.entries?.length ? (
                        record.payload.entries.map((r, idx) => (
                          <tr key={idx}>
                            <td style={tdCell}>{safe(r.equipment)}</td>
                            <td style={tdCell}>{safe(r.freeFromDamage)}</td>
                            <td style={tdCell}>{safe(r.freeFromBrokenPieces)}</td>
                            {SLOTS.map((s) => (
                              <td key={s.key} style={tdCell}>{safe(r[s.key])}</td>
                            ))}
                            <td style={tdCell}>{safe(r.correctiveAction)}</td>
                            <td style={tdCell}>{safe(r.checkedByRow)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ ...tdCell, textAlign:"center" }} colSpan={3 + SLOTS.length + 2}>— No data —</td>
                        </tr>
                      )
                    ) : (
                      editRows.map((r, i) => {
                        const risky =
                          r.freeFromDamage === "No" ||
                          r.freeFromBrokenPieces === "No" ||
                          SLOTS.some((s) => r[s.key] === "✗");
                        return (
                          <tr key={i}>
                            <td style={tdCell}>
                              <input
                                value={r.equipment || ""}
                                onChange={(e)=> {
                                  const next = [...editRows];
                                  next[i] = { ...next[i], equipment: e.target.value };
                                  setEditRows(next);
                                }}
                                style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                              />
                            </td>
                            <td style={tdCell}>
                              <select
                                value={r.freeFromDamage || ""}
                                onChange={(e)=> {
                                  const next = [...editRows];
                                  next[i] = { ...next[i], freeFromDamage: e.target.value };
                                  setEditRows(next);
                                }}
                                style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                              >
                                <option value=""></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            </td>
                            <td style={tdCell}>
                              <select
                                value={r.freeFromBrokenPieces || ""}
                                onChange={(e)=> {
                                  const next = [...editRows];
                                  next[i] = { ...next[i], freeFromBrokenPieces: e.target.value };
                                  setEditRows(next);
                                }}
                                style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                              >
                                <option value=""></option>
                                <option value="Yes">Yes</option>
                                <option value="No">No</option>
                              </select>
                            </td>

                            {SLOTS.map((s) => (
                              <td key={s.key} style={tdCell}>
                                <select
                                  value={r[s.key] || ""}
                                  onChange={(e)=> {
                                    const next = [...editRows];
                                    next[i] = { ...next[i], [s.key]: e.target.value };
                                    setEditRows(next);
                                  }}
                                  style={{
                                    width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px",
                                    background: r[s.key]==="√" ? "#e7f7ec" : r[s.key]==="✗" ? "#fde8e8" : "#fff"
                                  }}
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
                                value={r.correctiveAction || ""}
                                onChange={(e)=> {
                                  const next = [...editRows];
                                  next[i] = { ...next[i], correctiveAction: e.target.value };
                                  setEditRows(next);
                                }}
                                placeholder={risky ? "Required when ✗ or No" : ""}
                                style={{
                                  width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px",
                                  background: risky ? "#fff7ed" : "#fff"
                                }}
                              />
                            </td>
                            <td style={tdCell}>
                              <input
                                value={r.checkedByRow || ""}
                                onChange={(e)=> {
                                  const next = [...editRows];
                                  next[i] = { ...next[i], checkedByRow: e.target.value };
                                  setEditRows(next);
                                }}
                                style={{ width:"100%", border:"1px solid #c7d2fe", borderRadius:6, padding:"4px 6px" }}
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer info */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:12, marginTop:12, fontSize:12 }}>
                <div><strong>Checked by (footer):</strong> {safe(record.payload?.checkedBy)}</div>
                <div><strong>Verified by:</strong> {safe(record.payload?.verifiedBy)}</div>
                <div><strong>Rev.Date:</strong> {safe(record.payload?.revDate)}</div>
                <div><strong>Rev.No:</strong> {safe(record.payload?.revNo)}</div>
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
