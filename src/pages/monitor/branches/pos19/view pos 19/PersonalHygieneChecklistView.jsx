// src/pages/monitor/branches/pos19/view pos 19/PersonalHygieneChecklistView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import unionLogo from "../../../../../assets/unioncoop-logo.png";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
      process.env.VITE_API_URL ||
      process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "pos19_personal_hygiene";
const BRANCH = "POS 19";

const COLS = [
  { key: "cleanUniform", label: "Clean\nUniform" },
  { key: "cleanShoes", label: "Clean\nShoes" },
  { key: "handwashGloves", label: "Hand washing and\nwearing disposable\ngloves when handling\nhigh risk food" },
  { key: "hairCovered", label: "Hair is short\nand clean\ncovered" },
  { key: "fingernails", label: "Fingernail\nis clean\nand short" },
  { key: "mustacheShaved", label: "Mustache/\nbeard properly\nshaved" },
  { key: "noJewelry", label: "No\nJewelry" },
  { key: "noIllness", label: "No Illness,\nNo Septic\nCuts, No Skin\nInfection" },
];

// helpers
const btn = (bg) => ({
  background: bg,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
});
const safe = (v) => v ?? "";
const getId = (r) => r?.id || r?._id || r?.payload?.id || r?.payload?._id;
const formatDMY = (iso) => {
  if (!iso) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

// — شعار كـ DataURL للـ PDF
function loadImageDataURL(src) {
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

export default function PersonalHygieneChecklistView() {
  const fileInputRef = useRef(null);
  const reportRef = useRef(null); // PDF snapshot only

  const todayDubai = useMemo(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    }
  }, []);

  // state
  const [date, setDate] = useState(todayDubai);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [record, setRecord] = useState(null);
  const [allDates, setAllDates] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editEntries, setEditEntries] = useState([]);

  // accordion states
  const [expandedYears, setExpandedYears] = useState({});
  const [expandedMonths, setExpandedMonths] = useState({}); // key: YYYY-MM -> boolean

  // table styles
  const gridStyle = useMemo(
    () => ({ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 }),
    []
  );
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

  // <colgroup>
  const colDefs = useMemo(
    () => [
      <col key="name" style={{ width: 170 }} />,
      ...COLS.map((_, i) => <col key={`c${i}`} style={{ width: 110 }} />),
      <col key="action" style={{ width: 190 }} />,
    ],
    []
  );

  // fetch helpers
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

      const uniq = Array.from(new Set(filtered.map((p) => p.reportDate))).sort((a, b) =>
        b.localeCompare(a)
      );
      setAllDates(uniq);

      // expand latest year/month by default
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

      const match =
        list.find((r) => r?.payload?.branch === BRANCH && r?.payload?.reportDate === d) || null;

      setRecord(match);
      setEditing(false);
      setEditEntries(
        match?.payload?.entries ? JSON.parse(JSON.stringify(match.payload.entries)) : []
      );
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (date) fetchRecord(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // password = 9999
  function askPass(label = "") {
    const p = window.prompt(`${label}\nEnter password:`) || "";
    return p === "9999";
  }

  // DELETE by id
  async function handleDelete() {
    if (!record) return;
    if (!askPass("Delete confirmation")) return alert("❌ Wrong password");
    if (!window.confirm("Are you sure you want to delete this report?")) return;

    const rid = getId(record);
    if (!rid) return alert("⚠️ Missing record id.");

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
        method: "DELETE",
      });
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

  // toggle edit
  function toggleEdit() {
    if (editing) {
      setEditing(false);
      setEditEntries(record?.payload?.entries || []);
      return;
    }
    if (!askPass("Enable edit mode")) return alert("❌ Wrong password");
    setEditEntries(
      record?.payload?.entries ? JSON.parse(JSON.stringify(record.payload.entries)) : []
    );
    setEditing(true);
  }

  // save edit (PUT by id; fallback POST)
  async function saveEdit() {
    if (!askPass("Save changes")) return alert("❌ Wrong password");
    if (!record) return;

    const rid = getId(record);
    const payload = {
      ...(record?.payload || {}),
      branch: BRANCH,
      reportDate: record?.payload?.reportDate,
      entries: editEntries,
      savedAt: Date.now(),
    };

    try {
      setLoading(true);

      let ok = false;
      if (rid) {
        const putRes = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: TYPE, payload }),
        });
        ok = putRes.ok;
      }

      if (!ok) {
        const postRes = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
        });
        if (!postRes.ok) throw new Error(`HTTP ${postRes.status}`);
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

  // ===== Export / Import =====

  // ✅ Export JSON
  function exportJSON() {
    if (!record) return;
    const out = { type: TYPE, payload: record.payload };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `POS19_PersonalHygiene_${record?.payload?.reportDate || date}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ✅ Export XLSX (كل المعلومات + الجدول كله)
  // ✅ Export XLSX with fixed design (styled like your screenshot)
async function exportXLSX() {
  try {
    const ExcelJS = (await import("exceljs")).default;

    // بيانات التقرير
    const p = record?.payload || {};
    const entries = Array.isArray(p.entries) ? p.entries : [];
    const reportDate = p.reportDate || date;

    // ترويسة الأعمدة (مثل القالب)
    const tableHeader = [
      "Date",
      "Staff Name",
      ...COLS.map((c) => c.label.replace(/\n/g, " ")),
      "Corrective Action",
    ];

    // نحضّر الـ workbook / worksheet
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Personal Hygiene Checklist", {
      views: [{ showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

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

    // عرض الأعمدة
    ws.columns = [
      { width: 13 },   // Date
      { width: 18 },   // Staff Name
      ...COLS.map(() => ({ width: 17 })),
      { width: 20 },   // Corrective Action
    ];

    // ====== الصفوف العلوية: الشعار + عنوان + معلومات النموذج ======
    // الشعار يسار الأعلى
    const logoDataUrl = await loadImageDataURL(unionLogo); // موجودة عندك مسبقًا
    let logoId = null;
    if (logoDataUrl) {
      const base64 = logoDataUrl.split(",")[1]; // ExcelJS يحتاج base64 بدون الـ prefix
      logoId = wb.addImage({ base64, extension: "png" });
      // ضع الشعار في A1:B5 (حسب الشكل)
      ws.addImage(logoId, { tl: { col: 0, row: 0 }, br: { col: 2, row: 5 } });
    }

    // العنوان في الصف 2 عبر C إلى آخر عمود
    const lastCol = tableHeader.length;
    ws.mergeCells(2, 3, 2, lastCol);
    const titleCell = ws.getCell(2, 3);
    titleCell.value = "Union Coop\nPersonal Hygiene Checklist";
    titleCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    titleCell.font = { bold: true, size: 16, color: { argb: BLACK } };

    // مربع معلومات: Form Ref / Section / Classification على اليمين
    // نعمل جدول صغير في الأعمدة الأخيرة (يناسب اللقطة)
    const infoStartCol = lastCol - 4; // أربع أعمدة تقريبًا للمربع
    const infoRows = [
      ["Form Ref. No", ":", "UC/HACCP/BR/F06"],
      ["Section",      ":", safe(p.section)],
      ["Classification",":", safe(p.classification || "Official")],
    ];
    infoRows.forEach((arr, i) => {
      const r = 2 + i; // صفوف 2..4
      ws.getCell(r, infoStartCol).value = arr[0];
      ws.getCell(r, infoStartCol+1).value = arr[1];
      ws.getCell(r, infoStartCol+2).value = arr[2];
      [infoStartCol, infoStartCol+1, infoStartCol+2].forEach(c => {
        const cell = ws.getCell(r, c);
        cell.font = { bold: true, size: 11 };
        cell.alignment = { vertical: "middle" };
      });
    });

    // ====== شريط "Good Hygiene Practices" + الأسطورة ======
    // شريط العنوان الممتد
    const bandRow = 6;
    ws.mergeCells(bandRow, 1, bandRow, lastCol);
    const band = ws.getCell(bandRow, 1);
    band.value = "Good Hygiene Practices";
    band.alignment = { horizontal: "center", vertical: "middle" };
    band.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SKY } };
    band.font = { bold: true, color: { argb: BLUE } };
    band.border = thinBorder;

    // الأسطورة أسفل الشريط
    const legendRow = bandRow + 1;
    ws.mergeCells(legendRow, 1, legendRow, lastCol);
    const legend = ws.getCell(legendRow, 1);
    legend.value = "(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)";
    legend.alignment = { horizontal: "center", vertical: "middle" };
    legend.font = { size: 11 };
    legend.border = thinBorder;

    // ====== رأس الجدول (صفوف متعددة مثل القالب) ======
    const headerRow = legendRow + 1; // الصف الذي يحتوي أسماء الأعمدة
    // نكتب العناوين مباشرة (سطر واحد مبسط مع نفس التسميات)
    tableHeader.forEach((txt, i) => {
      const cell = ws.getCell(headerRow, i + 1);
      cell.value = txt;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.font = { bold: true, color: { argb: BLUE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD } };
      cell.border = thinBorder;
    });

    // ====== بيانات الجدول ======
    let rowIdx = headerRow + 1;
    const makeCell = (r, c, v, align = "center") => {
      const cell = ws.getCell(r, c);
      cell.value = v;
      cell.alignment = { horizontal: align, vertical: "middle", wrapText: true };
      cell.border = thinBorder;
      return cell;
    };

    if (entries.length === 0) {
      tableHeader.forEach((_, cIdx) => makeCell(rowIdx, cIdx + 1, "—"));
      rowIdx++;
    } else {
      entries.forEach((r) => {
        let c = 1;
        makeCell(rowIdx, c++, reportDate);               // Date
        makeCell(rowIdx, c++, safe(r.name), "left");     // Staff Name
        COLS.forEach((col) => {
          const v = safe(r[col.key]);
          const cell = makeCell(rowIdx, c++, v);
          // تلوين √ و ✗
          if (v === "√") cell.font = { bold: true, color: { argb: "166534" } };
          if (v === "✗" || v === "X" || v === "x")
            cell.font = { bold: true, color: { argb: "B91C1C" } };
        });
        makeCell(rowIdx, c++, safe(r.remarks), "left");  // Corrective Action
        rowIdx++;
      });
    }

    // ====== فوتر: Checked / Verified / Rev.Date / Rev.No ======
    rowIdx += 1;
    const footer = [
      ["Checked by:", safe(p.checkedBy)],
      ["Verified by:", safe(p.verifiedBy)],
      ["Rev.Date:", safe(p.revDate)],
      ["Rev.No:",   safe(p.revNo)],
    ];

    // نوزّع عناصر الفوتر على 8 خلايا (عنوان + قيمة) ×4
    let c0 = 1;
    footer.forEach(([label, val]) => {
      const cLabel = ws.getCell(rowIdx, c0);
      cLabel.value = label;
      cLabel.font = { bold: true, color: { argb: BLUE } };
      cLabel.alignment = { horizontal: "center", vertical: "middle" };
      cLabel.border = thinBorder;

      const cVal = ws.getCell(rowIdx, c0 + 1);
      cVal.value = val;
      cVal.alignment = { horizontal: "center", vertical: "middle" };
      cVal.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FDE7D9" } };
      cVal.border = thinBorder;

      c0 += 2;
    });

    // إذا بقيت أعمدة فارغة في الصف نفسه، نمدها بحدود خفيفة
    for (; c0 <= lastCol; c0++) {
      const cell = ws.getCell(rowIdx, c0);
      cell.border = thinBorder;
    }

    // حفظ الملف
    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `POS19_PersonalHygiene_${reportDate}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error(e);
    alert("⚠️ فشل إنشاء ملف XLSX بالقالب. تفعيل ExcelJS مطلوب.\n" + (e?.message || e));
  }
}
    // ✅ Import JSON (POST)

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

  // ✅ Export ONLY the report area as PDF + header logo
  async function exportPDF() {
    if (!reportRef.current) return;

    const node = reportRef.current;
    const canvas = await html2canvas(node, {
      scale: 2,
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
    });
    const logoDataUrl = await loadImageDataURL(unionLogo);

    const pdf = new jsPDF("l", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const headerH = 60;

    // header
    pdf.setFillColor(247, 249, 252);
    pdf.rect(0, 0, pageW, headerH, "F");
    if (logoDataUrl) {
      const logoW = 110;
      const logoH = 110 * 0.5 * 0.9;
      pdf.addImage(logoDataUrl, "PNG", margin, 8, logoW, logoH);
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(
      `Union Coop — POS 19 | Personal Hygiene Checklist (${record?.payload?.reportDate || date})`,
      pageW / 2,
      28,
      { align: "center" }
    );

    const usableW = pageW - margin * 2;
    const availableH = pageH - (headerH + 10) - margin;

    // slice tall image to multiple pages
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
        // header for next page
        pdf.setFillColor(247, 249, 252);
        pdf.rect(0, 0, pageW, headerH, "F");
        if (logoDataUrl) {
          const logoW = 110;
          const logoH = 110 * 0.5 * 0.9;
          pdf.addImage(logoDataUrl, "PNG", margin, 8, logoW, logoH);
        }
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.text(
          `Union Coop — POS 19 | Personal Hygiene Checklist (${record?.payload?.reportDate || date})`,
          pageW / 2,
          28,
          { align: "center" }
        );
      }
    }

    pdf.save(`POS19_PersonalHygiene_${record?.payload?.reportDate || date}.pdf`);
  }

  // group dates: Year -> Month -> [iso dates]
  const grouped = useMemo(() => {
    const out = {};
    for (const d of allDates) {
      const [y, m] = d.split("-");
      (out[y] ||= {});
      (out[y][m] ||= []).push(d);
    }
    // sort years asc, months asc, days asc
    for (const y of Object.keys(out))
      out[y] = Object.fromEntries(
        Object.entries(out[y])
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([m, arr]) => [m, arr.sort((a, b) => a.localeCompare(b))])
      );
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => Number(a) - Number(b)));
  }, [allDates]);

  const toggleYear = (y) => setExpandedYears((p) => ({ ...p, [y]: !p[y] }));
  const toggleMonth = (y, m) =>
    setExpandedMonths((p) => ({ ...p, [`${y}-${m}`]: !p[`${y}-${m}`] }));

  // UI
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #dbe3f4",
        borderRadius: 12,
        padding: 16,
        color: "#0b1f4d",
        direction: "ltr",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <img src={unionLogo} alt="Union Coop" style={{ width: 56, height: 56, objectFit: "contain" }} />
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          Personal Hygiene Checklist — View (POS 19)
        </div>

        <div
          style={{ marginInlineStart: "auto", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          {/* Admin actions */}
          <button onClick={toggleEdit} style={btn(editing ? "#6b7280" : "#7c3aed")}>
            {editing ? "Cancel Edit" : "Edit (password)"}
          </button>
          {editing && (
            <button onClick={saveEdit} style={btn("#10b981")}>Save Changes</button>
          )}
          <button onClick={handleDelete} style={btn("#dc2626")}>Delete (password)</button>

          {/* Export / Import */}
          <button onClick={exportXLSX} disabled={!record?.payload?.entries?.length} style={btn("#0ea5e9")}>
            Export XLSX
          </button>
          <button onClick={exportJSON} disabled={!record} style={btn("#0284c7")}>
            Export JSON
          </button>
          <button onClick={exportPDF} style={btn("#374151")}>
            Export PDF
          </button>
          <label style={{ ...btn("#059669"), display: "inline-block" }}>
            Import JSON
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={(e) => importJSON(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>

      {/* Layout: Date tree + content */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12 }}>
        {/* Date tree (Year -> Month -> Dates) */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, background: "#fafafa" }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>📅 Date Tree</div>
          <div style={{ maxHeight: 380, overflowY: "auto" }}>
            {Object.keys(grouped).length ? (
              Object.entries(grouped).map(([year, months]) => {
                const yOpen = !!expandedYears[year];
                return (
                  <div key={year} style={{ marginBottom: 8 }}>
                    <button
                      onClick={() => toggleYear(year)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        background: "#fff",
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                      title={yOpen ? "Collapse" : "Expand"}
                    >
                      <span>Year {year}</span>
                      <span aria-hidden="true">{yOpen ? "▾" : "▸"}</span>
                    </button>

                    {yOpen &&
                      Object.entries(months).map(([month, days]) => {
                        const key = `${year}-${month}`;
                        const mOpen = !!expandedMonths[key];
                        return (
                          <div key={key} style={{ marginTop: 6, marginLeft: 8 }}>
                            <button
                              onClick={() => toggleMonth(year, month)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                padding: "6px 10px",
                                borderRadius: 8,
                                border: "1px solid #e5e7eb",
                                background: "#fff",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                              title={mOpen ? "Collapse" : "Expand"}
                            >
                              <span>Month {month}</span>
                              <span aria-hidden="true">{mOpen ? "▾" : "▸"}</span>
                            </button>

                            {mOpen && (
                              <div style={{ padding: "6px 2px 0 2px" }}>
                                {/* ✅ قائمة عمودية للأيام */}
                                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                  {days.map((d) => (
                                    <li key={d} style={{ marginBottom: 6 }}>
                                      <button
                                        onClick={() => setDate(d)}
                                        style={{
                                          width: "100%",
                                          textAlign: "left",
                                          padding: "8px 10px",
                                          borderRadius: 8,
                                          border: "1px solid #d1d5db",
                                          background: d === date ? "#2563eb" : "#fff",
                                          color: d === date ? "#fff" : "#111827",
                                          fontWeight: 700,
                                          cursor: "pointer",
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
              <div style={{ color: "#6b7280" }}>No available dates.</div>
            )}
          </div>
        </div>

        {/* Report content (wrapped by ref for PDF export) */}
        <div>
          {loading && <p>Loading…</p>}
          {err && <p style={{ color: "#b91c1c" }}>{err}</p>}

          {!loading && !err && !record && (
            <div
              style={{ padding: 12, border: "1px dashed #9ca3af", borderRadius: 8, textAlign: "center" }}
            >
              No report for this date.
            </div>
          )}

          {record && (
            <div ref={reportRef}>
              {/* Info band */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <div><strong>Date:</strong> {safe(record.payload?.reportDate)}</div>
                <div><strong>Section:</strong> {safe(record.payload?.section)}</div>
                <div><strong>Branch:</strong> {safe(record.payload?.branch)}</div>
                <div><strong>Ref:</strong> UC/HACCP/BR/F06</div>
              </div>

              <div style={{ border: "1px solid #1f3b70", borderBottom: "none" }}>
                <div style={{ ...thCell, background: "#e9f0ff" }}>Good Hygiene Practices</div>
                <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
                  <strong>(LEGEND: (√) – For Satisfactory & (✗) – For Needs Improvement)</strong>
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={gridStyle}>
                  <colgroup>{colDefs}</colgroup>
                  <thead>
                    <tr>
                      <th style={thCell}>Staff Name</th>
                      {COLS.map((c) => (
                        <th key={c.key} style={thCell}>{c.label}</th>
                      ))}
                      <th style={thCell}>Corrective Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!editing ? (
                      record.payload?.entries?.length ? (
                        record.payload.entries.map((r, i) => (
                          <tr key={i}>
                            <td style={tdCell}>{safe(r.name)}</td>
                            {COLS.map((c) => (
                              <td key={c.key} style={tdCell}>{safe(r[c.key])}</td>
                            ))}
                            <td style={tdCell}>{safe(r.remarks)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td style={{ ...tdCell, textAlign: "center" }} colSpan={COLS.length + 2}>
                            — No data —
                          </td>
                        </tr>
                      )
                    ) : editEntries?.length ? (
                      editEntries.map((r, i) => (
                        <tr key={i}>
                          <td style={tdCell}>
                            <input
                              type="text"
                              value={r.name || ""}
                              onChange={(e) => {
                                const next = [...editEntries];
                                next[i] = { ...next[i], name: e.target.value };
                                setEditEntries(next);
                              }}
                              style={{ width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px" }}
                            />
                          </td>
                          {COLS.map((c) => (
                            <td key={c.key} style={tdCell}>
                              <select
                                value={r[c.key] || ""}
                                onChange={(e) => {
                                  const next = [...editEntries];
                                  next[i] = { ...next[i], [c.key]: e.target.value };
                                  setEditEntries(next);
                                }}
                                style={{ width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px" }}
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
                              value={r.remarks || ""}
                              onChange={(e) => {
                                const next = [...editEntries];
                                next[i] = { ...next[i], remarks: e.target.value };
                                setEditEntries(next);
                              }}
                              style={{ width: "100%", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px" }}
                            />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={{ ...tdCell, textAlign: "center" }} colSpan={COLS.length + 2}>
                          — No data —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer info */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 12,
                  marginTop: 12,
                  fontSize: 12,
                }}
              >
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
