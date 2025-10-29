// src/pages/monitor/InternalAuditReportsView.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";

/* ===== API base (aligned with your project) ===== */
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
const TYPE_KEY = "internal_multi_audit";

/* Debug viewer */
const SHOW_DEBUG = false;

/* ===== Helpers ===== */
function safe(obj, path, fb) {
  try { return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj) ?? fb; }
  catch { return fb; }
}
function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}
/* مرن لتواريخ الهيدر: يقبل YYYY-MM-DD أو DD/MM/YYYY أو DD-MM-YYYY */
function toTsFromHeaderDate(s) {
  if (!s || typeof s !== "string") return 0;
  const trimmed = s.trim();
  const iso = Date.parse(trimmed);
  if (Number.isFinite(iso)) return iso;
  const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(trimmed);
  if (m) {
    const d = Number(m[1]), mo = Number(m[2]);
    const y = m[3].length === 2 ? Number("20" + m[3]) : Number(m[3]);
    if (y && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return Date.UTC(y, mo - 1, d);
  }
  return 0;
}
/* date tree from normalized views (Year -> Month -> Day) */
function buildDateTreeFromViews(list) {
  const tree = {};
  list.forEach((v) => {
    const d = new Date(v.ts || Date.now());
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    (tree[y] ||= {});
    (tree[y][m] ||= {});
    tree[y][m][day] = (tree[y][m][day] || 0) + 1;
  });
  return tree;
}
/* image -> base64 (compressed) */
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
  return canvas.toDataURL("image/jpeg", quality);
}

/* === حساب نسبة العناصر المغلقة بشكل قوي === */
function isClosedStatus(v) {
  return /^\s*closed\s*$/i.test(String(v ?? ""));
}
function calcClosedPct(table = []) {
  const total = table.length;
  if (!total) return 0;
  const closed = table.filter(r => isClosedStatus(r?.status)).length;
  return Math.round((closed / total) * 100);
}

/* ===== Color palette ===== */
const C = {
  border: "#9aa3b8",
  borderStrong: "#64748b",
  cardBg: "#ffffff",
  bandBlue: "#e9f0ff",
  bandGreen: "#e9fbe7",
  bandSilver: "#f5f7fa",
  zebra: "#f8fafc",
  headerGradFrom: "#e8f1ff",
  headerGradTo: "#e7ffef",
  badgeFrom: "#34d399",
  badgeTo: "#60a5fa",
};

export default function InternalAuditReportsView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [branchFilter, setBranchFilter] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  // Date tree filters
  const [yearFilter, setYearFilter] = useState(null);
  const [monthFilter, setMonthFilter] = useState(null);
  const [dayFilter, setDayFilter] = useState(null);

  // Inline edit state
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null); // full raw report (server schema)

  // Accordion (collapsed months): key = "YYYY-MM"
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [collapsedInit, setCollapsedInit] = useState(false);

  // Image viewer (lightbox)
  const [viewerSrc, setViewerSrc] = useState(null);

  // فتح/إغلاق لكل تقرير بشكل منفصل
  const [openCards, setOpenCards] = useState(() => new Set());

  // refs لكروت التقارير (لاستخراج PDF من نفس التصميم)
  const cardRefs = useRef({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(TYPE_KEY)}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch reports");
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json?.data ?? [];
        if (!alive) return;
        setData(arr);
      } catch {
        if (!alive) return;
        setError("Failed to load reports");
      } finally {
        alive && setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // normalize for UI (نستخدم تاريخ الهيدر للتجميع إن وُجد)
  const normalized = useMemo(() => {
    return data.map((r) => {
      const p = r.payload || {};
      const header = p.header || {};
      const footer = p.footer || {};
      const table = Array.isArray(p.table) ? p.table : [];

      // النسبة تُحسب دائمًا من الجدول (لا نعتمد KPI المخزّن للعرض)
      const computedClosedPct = calcClosedPct(table);

      // نُفضّل header.date إن وُجد وصالح
      const tsFromHeader = toTsFromHeaderDate(header.date);
      const tsBase = tsFromHeader || toTs(p.createdAt) || toTs(r.createdAt) || toTs(r._id) || Date.now();
      const d = new Date(tsBase);

      return {
        _raw: r,
        id: r.id || r._id || r.pk || undefined,
        ts: tsBase,             // للتجميع حسب تاريخ الهيدر
        y: d.getUTCFullYear(),
        m: d.getUTCMonth() + 1,
        d: d.getUTCDate(),
        branch: r.branch || header.branch || header.location || "-",
        title: p.title || "-",
        date: header.date || "-",                 // المعروض
        reportNo: header.reportNo || "-",
        auditBy: header.auditConductedBy || "-",
        issuedBy: header.issuedBy || "-",         // للـ banner فقط
        approvedBy: header.approvedBy || "-",     // للـ banner فقط
        table,
        commentNextAudit: footer.commentForNextAudit || "",
        nextAudit: footer.nextAudit || "",
        reviewedBy: footer.reviewedAndVerifiedBy || "",
        percentageClosed: computedClosedPct,      // دائماً من الجدول
      };
    });
  }, [data]);

  const rows = useMemo(() => {
    return normalized
      .filter((x) => !branchFilter || x.branch === branchFilter)
      .filter((x) => !yearFilter || x.y === yearFilter)
      .filter((x) => !monthFilter || x.m === monthFilter)
      .filter((x) => !dayFilter || x.d === dayFilter)
      .filter((x) =>
        !q ||
        [x.branch, x.title, x.auditBy, x.reportNo].some(v =>
          String(v || "").toLowerCase().includes(q.toLowerCase())
        )
      )
      .sort((a, b) => b.ts - a.ts);
  }, [normalized, branchFilter, q, yearFilter, monthFilter, dayFilter]);

  const branches = useMemo(() => {
    const s = new Set();
    normalized.forEach((r) => r.branch && s.add(r.branch));
    return Array.from(s).sort();
  }, [normalized]);

  // ✅ شجرة التاريخ الآن تعتمد على تاريخ العرض نفسه
  const dateTree = useMemo(() => buildDateTreeFromViews(normalized), [normalized]);

  /* ===== actions ===== */
  const refresh = async () => {
    try {
      const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(TYPE_KEY)}`, { cache: "no-store" });
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      setData(arr);
    } catch {/* ignore */}
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Delete this report permanently?")) return;
    try {
      const id = r.id;
      if (!id) throw new Error("Missing id");
      const res = await fetch(`${REPORTS_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await refresh();
    } catch (e) {
      alert("Failed to delete.");
    }
  };

  const handleEdit = (r) => { setEditId(r.id); setDraft(JSON.parse(JSON.stringify(r._raw))); };
  const handleCancel = () => { setEditId(null); setDraft(null); };

  // قبل الحفظ: نحدّث KPI بالنسبة المحسوبة من الجدول
  const syncClosedKPI = (doc) => {
    const table = safe(doc, "payload.table", []) || [];
    const pct = calcClosedPct(table);
    doc.payload = doc.payload || {};
    doc.payload.kpis = { ...(doc.payload.kpis || {}), percentageClosed: pct };
    return pct;
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      const id = draft.id || draft._id;
      if (!id) throw new Error("Missing id");

      // حدّث KPI قبل الإرسال
      syncClosedKPI(draft);

      const putRes = await fetch(`${REPORTS_URL}/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      if (putRes.ok) { setEditId(null); setDraft(null); await refresh(); return; }
      if (putRes.status === 404) {
        const body = {
          type: draft.type || TYPE_KEY,
          branch: draft.branch || safe(draft, "payload.header.location") || safe(draft, "branch") || "",
          payload: draft.payload || {},
        };
        const postRes = await fetch(REPORTS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!postRes.ok) throw new Error("POST fallback failed");
        await fetch(`${REPORTS_URL}/${id}`, { method: "DELETE" }).catch(()=>{});
        setEditId(null); setDraft(null); await refresh(); return;
      }
      throw new Error(`PUT failed with status ${putRes.status}`);
    } catch (e) {
      console.error(e); alert("Failed to update report.");
    }
  };

  // mutators
  const getHeader = () => (draft.payload = draft.payload || {}, draft.payload.header = draft.payload.header || {}, draft.payload.header);
  const getFooter = () => (draft.payload = draft.payload || {}, draft.payload.footer = draft.payload.footer || {}, draft.payload.footer);
  const getTable  = () => (draft.payload = draft.payload || {}, draft.payload.table = Array.isArray(draft.payload.table) ? draft.payload.table : [], draft.payload.table);
  const editHeader = (key, value) => { const h = getHeader(); h[key] = value; setDraft({...draft}); };
  const editFooter = (key, value) => { const f = getFooter(); f[key] = value; setDraft({...draft}); };
  const editRow    = (idx, patch) => { const t = getTable(); t[idx] = { ...(t[idx]||{}), ...patch }; setDraft({...draft}); };
  const addRow     = () => { const t = getTable(); t.push({}); setDraft({...draft}); };
  const removeRow  = (idx) => { const t = getTable(); t.splice(idx,1); setDraft({...draft}); };
  const addImages = async (idx, field, files) => {
    if (!files || !files.length) return;
    const t = getTable();
    const row = t[idx] = t[idx] || {};
    const current = Array.isArray(row[field]) ? row[field] : [];
    const capacity = Math.max(0, 5 - current.length);
    const slice = Array.from(files).slice(0, capacity);
    const dataURLs = [];
    for (const f of slice) { const data = await fileToCompressedDataURL(f); dataURLs.push(data); }
    row[field] = [...current, ...dataURLs];
    setDraft({ ...draft });
  };
  const removeImage = (idx, field, imgIdx) => {
    const t = getTable();
    const row = t[idx] = t[idx] || {};
    row[field] = (row[field] || []).filter((_, i) => i !== imgIdx);
    setDraft({ ...draft });
  };

  /* ===== Export: JSON ===== */
  const exportReportJSON = (raw) => {
    const blob = new Blob([JSON.stringify(raw, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `internal-audit-${raw?.id || raw?._id || "report"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ===== Export: XLSX (counts only) ===== */
  const exportReportXLSX = async (view) => {
    try {
      const XLSX = await import("xlsx");

      // helper: auto column widths
      const autosize = (arr) => {
        const colCount = arr.reduce((m, r) => Math.max(m, r.length), 0);
        const widths = new Array(colCount).fill(8);
        arr.forEach(row => {
          row.forEach((cell, i) => {
            const v = cell == null ? "" : String(cell);
            widths[i] = Math.max(widths[i], Math.min(80, v.length + 2));
          });
        });
        return widths.map(w => ({ wch: w }));
      };

      const meta = [
        ["Branch", view.branch],
        ["Title", view.title],
        ["Date", view.date],
        ["Report No", view.reportNo],
        ["Auditor", view.auditBy],
        ["Approved By", view.approvedBy],
        ["Issued By", view.issuedBy],
        ["Closed %", `${calcClosedPct(view.table || [])}%`],
      ];

      const header = [
        "Row",
        "Non-Conformance",
        "Root Cause",
        "Corrective / Preventive action",
        "Evidence (images count)",
        "Closed Evidence (images count)",
        "Risk Category",
        "Status",
      ];

      const body = (view.table || []).map((line, i) => ([
        i + 1,
        line.nonConformance || "",
        line.rootCause || "",
        line.corrective || "",
        Array.isArray(line.evidenceImgs) ? line.evidenceImgs.length : 0,
        Array.isArray(line.closedEvidenceImgs) ? line.closedEvidenceImgs.length : 0,
        line.risk || "",
        line.status || "",
      ]));

      const sheetRows = [
        ...meta,
        [""],
        header,
        ...body,
      ];

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws["!cols"] = autosize(sheetRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");

      const name = `internal-audit-${view.reportNo || "report"}.xlsx`;
      XLSX.writeFile(wb, name);
    } catch (e) {
      console.error(e);
      alert("XLSX export requires the 'xlsx' package.");
    }
  };

  /* ===== Export: PDF (same design + clickable thumbs to big gallery) ===== */
  const exportReportPDF = async (view) => {
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);

      // 1) عنصر الكارت الحالي
      const el = cardRefs.current[view.id];
      if (!el) { alert("Open the report card first, then export."); return; }

      // 2) لقطة عالية الجودة
      const scale = 2;
      const canvas = await html2canvas(el, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false
      });

      // 3) إعداد صفحات A4 Landscape
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      // الصورة الأساسية (نقسّم الطول على صفحات)
      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;
      const pageCount = Math.ceil(imgH / pdfH);

      // 4) إضافة صفحات المحتوى (نفس التصميم)
      for (let i = 0; i < pageCount; i++) {
        if (i > 0) pdf.addPage();
        const sy = (canvas.height / pageCount) * i;
        const sH = (canvas.height / pageCount);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sH;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, sy, canvas.width, sH, 0, 0, canvas.width, sH);
        const dataUrl = pageCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(dataUrl, "JPEG", 0, 0, imgW, (sH * pdfW) / canvas.width);
      }

      // 5) تجهيز معرض الصور الكبير (نستخرج كل الصور من الجدول)
      const allImages = [];
      (view.table || []).forEach((row, idx) => {
        const e1 = Array.isArray(row.evidenceImgs) ? row.evidenceImgs : [];
        const e2 = Array.isArray(row.closedEvidenceImgs) ? row.closedEvidenceImgs : [];
        e1.forEach((src) => allImages.push({ src, label: `Row ${idx+1} - Evidence` }));
        e2.forEach((src) => allImages.push({ src, label: `Row ${idx+1} - Closed Evidence` }));
      });

      const galleryStartPage = pdf.getNumberOfPages() + 1;
      if (allImages.length) {
        pdf.addPage(); // صفحة عنوان
        pdf.setFontSize(18);
        pdf.text("Images Gallery", 40, 50);
        pdf.setFontSize(11);
        pdf.text(`Total images: ${allImages.length}`, 40, 70);

        // كل صورة صفحة منفصلة بحجم كبير
        for (let i = 0; i < allImages.length; i++) {
          if (i > 0) pdf.addPage();
          const { src, label } = allImages[i];
          // العنوان
          pdf.setFontSize(12);
          pdf.text(label, 40, 40);

          // إضافة الصورة بالحجم الأقصى مع هوامش
          const margin = 40;
          const boxW = pdfW - margin * 2;
          const boxH = pdfH - margin * 2 - 20;
          // تحميل مصدر الصورة (قد يكون dataURL جاهز)
          let base64 = src;
          if (!String(src).startsWith("data:image")) {
            const resp = await fetch(src);
            const blob = await resp.blob();
            base64 = await new Promise((ok) => {
              const fr = new FileReader();
              fr.onload = () => ok(fr.result);
              fr.readAsDataURL(blob);
            });
          }
          // حساب نسبة الاحتفاظ
          const tmp = new Image();
          await new Promise((res, rej) => { tmp.onload = res; tmp.onerror = rej; tmp.src = base64; });
          const ratio = Math.min(boxW / tmp.width, boxH / tmp.height);
          const w = tmp.width * ratio;
          const h = tmp.height * ratio;
          const x = margin + (boxW - w) / 2;
          const y = margin + 20 + (boxH - h) / 2;
          pdf.addImage(base64, "JPEG", x, y, w, h);
        }
      }

      // 6) جعل الصور المصغرة في صفحات المحتوى قابلة للنقر وتنقلك لصفحة الصورة الكبيرة
      if (allImages.length) {
        // نقرأ مواضع <img> داخل الكارت الحالي (Thumbs)
        const cardRect = el.getBoundingClientRect();
        const imgs = Array.from(el.querySelectorAll("img[alt='evidence']"));

        // خريطة تربط كل صورة مصغرة بأقرب صورة مطابقة في معرض الصور بنفس الترتيب
        let targetPage = galleryStartPage; // أول صفحة بعد عنوان المعرض
        imgs.forEach((imgEl) => {
          const r = imgEl.getBoundingClientRect();
          // إحداثيات نسبية للكارت
          const relX = (r.left - cardRect.left) / cardRect.width;
          const relY = (r.top  - cardRect.top ) / cardRect.height;
          const relW = r.width / cardRect.width;
          const relH = r.height / cardRect.height;

          // تحويلها لإحداثيات PDF الكلي
          const totalPdfH = imgH; // ارتفاع الصورة المضافة على كل الصفحات
          const pdfX = relX * pdfW;
          const pdfY = relY * totalPdfH;
          const pdfWrect = relW * pdfW;
          const pdfHrect = relH * totalPdfH;

          // تحديد الصفحة التي يقع ضمنها هذا المستطيل
          const pageIndex = Math.floor(pdfY / pdfH); // صفرية
          const yOnPage = pdfY - pageIndex * pdfH;

          const pageNo = 1 + pageIndex; // صفحات المحتوى تبدأ من 1
          pdf.setPage(pageNo);
          // مستطيل رابط يقفز لصفحة الصورة الكبيرة المقابلة
          pdf.link(pdfX, yOnPage, pdfWrect, pdfHrect, { pageNumber: Math.min(targetPage, pdf.getNumberOfPages()) });

          // ننقل المؤشر لصفحة الصورة التالية
          targetPage = Math.min(targetPage + 1, pdf.getNumberOfPages());
        });
      }

      // 7) حفظ
      pdf.save(`internal-audit-${view.reportNo || "report"}.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF export failed.");
    }
  };

  /* ===== Group rows by Month (YYYY-MM) for accordion ===== */
  const groups = useMemo(() => {
    const g = new Map();
    for (const r of rows) {
      const key = `${r.y}-${String(r.m).padStart(2,"0")}`;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(r);
    }
    for (const [, arr] of g) arr.sort((a,b)=>b.ts-a.ts);
    return Array.from(g.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
  }, [rows]);

  // init all months collapsed once
  useEffect(() => {
    if (!collapsedInit && groups.length) {
      setCollapsed(new Set(groups.map(([k]) => k)));
      setCollapsedInit(true);
      setOpenCards(new Set()); // كل التقارير مغلقة مبدئياً
    }
  }, [groups, collapsedInit]);

  const toggleMonth = (key) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });
  };
  const toggleCard = (id) => {
    setOpenCards(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const monthName = (m) =>
    new Date(Date.UTC(2000, m-1, 1)).toLocaleString("en", { month: "long" });

  /* ===== UI ===== */
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, padding: 16, fontFamily: "Arial, sans-serif", direction: "ltr" }}>
      {/* Date tree */}
      <aside style={asideStyle}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Date Tree</div>
        <button
          style={chip(yearFilter == null && monthFilter == null && dayFilter == null)}
          onClick={() => { setYearFilter(null); setMonthFilter(null); setDayFilter(null); }}
        >
          All
        </button>

        {Object.keys(dateTree).sort((a,b)=>b-a).map(y => (
          <div key={y} style={{ marginTop: 10 }}>
            <button
              style={chip(yearFilter === Number(y) && monthFilter == null && dayFilter == null)}
              onClick={() => { setYearFilter(Number(y)); setMonthFilter(null); setDayFilter(null); }}
            >
              {y}
            </button>

            {/* months */}
            {yearFilter === Number(y) && (
              <div style={{ marginTop: 6 }}>
                {Object.keys(dateTree[y]).sort((a,b)=>Number(a)-Number(b)).map(m => (
                  <div key={m} style={{ marginBottom: 6 }}>
                    <button
                      style={chip(yearFilter === Number(y) && monthFilter === Number(m) && dayFilter == null)}
                      onClick={() => { setYearFilter(Number(y)); setMonthFilter(Number(m)); setDayFilter(null); }}
                    >
                      {`${String(m).padStart(2,"0")}-${y}`}
                    </button>

                    {/* days */}
                    {monthFilter === Number(m) && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                        {Object.keys(dateTree[y][m]).sort((a,b)=>Number(a)-Number(b)).map(d => (
                          <button
                            key={d}
                            style={chip(yearFilter===Number(y) && monthFilter===Number(m) && dayFilter===Number(d))}
                            onClick={() => { setYearFilter(Number(y)); setMonthFilter(Number(m)); setDayFilter(Number(d)); }}
                          >
                            {`${String(d).padStart(2,"0")}-${String(m).padStart(2,"0")}-${y}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </aside>

      <main>
        <h2 style={{ marginTop: 0 }}>Internal Audit Reports – CAPA</h2>

        <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "12px 0" }}>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={inputStyle}>
            <option value="">All Branches</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <input
            placeholder="Search (branch / title / report no / auditor)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={inputStyle}
          />
        </div>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && groups.length === 0 && <p>No reports found.</p>}

        {/* Accordion by month */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          {groups.map(([key, list]) => {
            const [yy,mm] = key.split("-");
            const isClosed = collapsed.has(key); // collapsed = hidden
            return (
              <div key={key} style={{ border:"1px solid #e5e7eb", borderRadius:12, background:"#fff" }}>
                <div
                  onClick={()=>toggleMonth(key)}
                  style={{ cursor:"pointer", padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", background: `linear-gradient(90deg, ${C.headerGradFrom}, ${C.headerGradTo})` }}
                >
                  <div style={{ fontWeight:700 }}>
                    {monthName(Number(mm))} {yy}
                  </div>
                  <div style={{ fontSize:12, opacity:.7 }}>{list.length} report(s)</div>
                </div>

                {!isClosed && (
                  <div style={{ padding: 10, display:"grid", gridTemplateColumns:"1fr", gap:14 }}>
                    {list.map((r, idx) => {
                      const isEditing = editId === r.id;
                      const open = openCards.has(r.id);
                      const p = isEditing ? (draft.payload || {}) : (r._raw.payload || {});
                      const header = p.header || {};
                      const footer = p.footer || {};
                      const table = Array.isArray(p.table) ? p.table : [];

                      return (
                        <div
                          key={idx}
                          ref={(el) => { if (el) cardRefs.current[r.id] = el; }}
                          style={{ ...cardStyle, background: C.cardBg }}
                        >
                          {/* Document banner */}
                          <div style={{ background: C.bandSilver, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 10px", marginBottom: 8, display:"flex", flexWrap:"wrap", gap:10, fontSize:12 }}>
                            <b>Document Number:</b>&nbsp;FS-QM/REC/CA/1
                            <span style={{ opacity:.6 }}>|</span>
                            <b>Revision No:</b>&nbsp;00
                            <span style={{ opacity:.6 }}>|</span>
                            <b>Issued By:</b>&nbsp;{r.issuedBy}
                            <span style={{ opacity:.6 }}>|</span>
                            <b>Approved By:</b>&nbsp;{r.approvedBy}
                          </div>

                          {/* Header (click to toggle card) */}
                          <div
                            onClick={()=>toggleCard(r.id)}
                            style={{ cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}
                          >
                            <div>
                              {isEditing ? (
                                <input
                                  style={inputInline}
                                  value={p.title || ""}
                                  onClick={(e)=>e.stopPropagation()}
                                  onChange={(e)=>{ draft.payload = p; p.title = e.target.value; setDraft({...draft}); }}
                                  placeholder="Report Title"
                                />
                              ) : (
                                <>
                                  <div style={{ fontWeight: 700 }}>{r.branch}</div>
                                  <div style={{ opacity: 0.8, fontSize: 12 }}>{r.title}</div>
                                </>
                              )}
                            </div>
                            <div style={{ textAlign: "right", fontSize: 12 }}>
                              {!isEditing ? (
                                <>
                                  <div style={{ opacity:.8 }}>{r.date}</div>
                                  <div style={{ opacity:.8 }}>Report No: {r.reportNo}</div>
                                  {/* Closed badge — دائماً محسوبة من الجدول */}
                                  <div style={{ marginTop:6, display:"inline-block", padding:"2px 8px", borderRadius:999,
                                                background:`linear-gradient(90deg, ${C.badgeFrom}, ${C.badgeTo})`, color:"#083344", fontWeight:700 }}>
                                    Closed Items: {calcClosedPct(table)}%
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <input style={inputInline} value={header.date || ""} onClick={(e)=>e.stopPropagation()} onChange={(e)=>editHeader("date", e.target.value)} placeholder="YYYY-MM-DD" />
                                  </div>
                                  <div>
                                    Report No:{" "}
                                    <input style={inputInline} value={header.reportNo || ""} onClick={(e)=>e.stopPropagation()} onChange={(e)=>editHeader("reportNo", e.target.value)} />
                                  </div>
                                  <div style={{ marginTop:6, display:"inline-block", padding:"2px 8px", borderRadius:999,
                                                background:`linear-gradient(90deg, ${C.badgeFrom}, ${C.badgeTo})`, color:"#083344", fontWeight:700 }}>
                                    Closed Items: {calcClosedPct(table)}%
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Meta line — بعد الطلب: فقط Auditor و Next Audit */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                            <div><b>Auditor:</b> {isEditing ? (<input style={inputInline} onClick={(e)=>e.stopPropagation()} value={header.auditConductedBy || ""} onChange={(e)=>editHeader("auditConductedBy", e.target.value)} />) : (r.auditBy)}</div>
                            <div><b>Next Audit:</b> {isEditing ? (<input style={inputInline} onClick={(e)=>e.stopPropagation()} value={safe(p,"footer.nextAudit","") } onChange={(e)=>{ const f=(p.footer ||= {}); f.nextAudit = e.target.value; setDraft({...draft}); }} />) : (r.nextAudit || "-")}</div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
                            {!isEditing ? (
                              <>
                                <button onClick={(e)=>{e.stopPropagation(); exportReportXLSX(r);}} style={smallBtn}>Export XLSX</button>
                                <button onClick={(e)=>{e.stopPropagation(); exportReportPDF(r);}} style={smallBtn}>Export PDF</button>
                                <button onClick={(e)=>{e.stopPropagation(); exportReportJSON(r._raw);}} style={smallBtn}>Export JSON</button>
                                <button onClick={(e)=>{e.stopPropagation(); handleEdit(r);}} style={smallBtn}>Edit</button>
                                <button onClick={(e)=>{e.stopPropagation(); handleDelete(r);}} style={dangerBtn}>Delete</button>
                              </>
                            ) : (
                              <>
                                <button onClick={(e)=>{e.stopPropagation(); handleSave();}} style={saveBtn}>Save</button>
                                <button onClick={(e)=>{e.stopPropagation(); handleCancel();}} style={smallBtn}>Cancel</button>
                              </>
                            )}
                          </div>

                          {/* محتوى التقرير يُعرض فقط عند فتح البطاقة */}
                          {open && (
                            <>
                              {/* Table */}
                              <div style={tableScroll}>
                                <div style={tableWrap}>
                                  {/* colored header row */}
                                  <div style={{ ...tableHeaderRow, background: C.bandBlue }}>
                                    <div style={th}>Non-Conformance</div>
                                    <div style={th}>Root Cause</div>
                                    <div style={th}>Corrective / Preventive action</div>
                                    <div style={th}>Evidence</div>
                                    <div style={th}>Closed Evidence</div>
                                    <div style={th}>Risk Category</div>
                                    <div style={th}>Status</div>
                                    {isEditing && <div style={th} />}
                                  </div>

                                  {table.map((row, ridx) => {
                                    const bg = ridx % 2 === 0 ? C.zebra : "#fff";
                                    return (
                                      <div key={ridx} style={{ ...tr, background:bg }}>
                                        <div style={td}>
                                          {isEditing
                                            ? <textarea style={cellTextArea} value={row.nonConformance || ""} onChange={(e)=>editRow(ridx,{nonConformance:e.target.value})} />
                                            : (row.nonConformance || "-")}
                                        </div>
                                        <div style={td}>
                                          {isEditing
                                            ? <textarea style={cellTextArea} value={row.rootCause || ""} onChange={(e)=>editRow(ridx,{rootCause:e.target.value})} />
                                            : (row.rootCause || "-")}
                                        </div>
                                        <div style={td}>
                                          {isEditing
                                            ? <textarea style={cellTextArea} value={row.corrective || ""} onChange={(e)=>editRow(ridx,{corrective:e.target.value})} />
                                            : (row.corrective || "-")}
                                        </div>

                                        <div style={td}>
                                          {isEditing
                                            ? <ImageField list={row.evidenceImgs} onAdd={(files)=>addImages(ridx,"evidenceImgs",files)} onRemove={(i)=>removeImage(ridx,"evidenceImgs",i)} onView={setViewerSrc} />
                                            : <Thumbs list={row.evidenceImgs} onView={setViewerSrc} />}
                                        </div>

                                        <div style={td}>
                                          {isEditing
                                            ? <ImageField list={row.closedEvidenceImgs} onAdd={(files)=>addImages(ridx,"closedEvidenceImgs",files)} onRemove={(i)=>removeImage(ridx,"closedEvidenceImgs",i)} onView={setViewerSrc} />
                                            : <Thumbs list={row.closedEvidenceImgs} onView={setViewerSrc} />}
                                        </div>

                                        <div style={tdFixed(140)}>
                                          {isEditing ? (
                                            <select
                                              style={selectCell}
                                              value={row.risk || ""}
                                              onChange={(e)=>editRow(ridx,{risk:e.target.value})}
                                            >
                                              <option value="">--</option>
                                              <option>Low</option>
                                              <option>Medium</option>
                                              <option>High</option>
                                            </select>
                                          ) : (row.risk || "-")}
                                        </div>

                                        <div style={tdFixed(120)}>
                                          {isEditing ? (
                                            <select
                                              style={selectCell}
                                              value={row.status || ""}
                                              onChange={(e)=>editRow(ridx,{status:e.target.value})}
                                            >
                                              <option value="">--</option>
                                              <option>Open</option>
                                              <option>In Progress</option>
                                              <option>Closed</option>
                                            </select>
                                          ) : (row.status || "-")}
                                        </div>

                                        {isEditing && (
                                          <div style={tdFixed(60, { display:"flex", justifyContent:"center", alignItems:"center" })}>
                                            <button onClick={()=>removeRow(ridx)} style={iconBtn}>✕</button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {isEditing && (
                                <div style={{ padding: 10 }}>
                                  <button onClick={addRow} style={addRowBtn}>+ Add Row</button>
                                </div>
                              )}

                              {/* Footer meta */}
                              {(!isEditing && (r.commentNextAudit || r.nextAudit || r.reviewedBy)) || isEditing ? (
                                <div style={{ marginTop: 10, fontSize: 13 }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4, background:C.bandGreen, border:`1px solid ${C.border}`, borderRadius:8, padding:6 }}>Comment for next Audit</div>
                                  {isEditing ? (
                                    <textarea
                                      style={{ ...cellTextArea, minHeight: 80 }}
                                      value={footer.commentForNextAudit || ""}
                                      onChange={(e)=>{ const f=getFooter(); f.commentForNextAudit = e.target.value; setDraft({...draft}); }}
                                    />
                                  ) : (
                                    <div style={noteBox}>{r.commentNextAudit}</div>
                                  )}
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                                    <div>
                                      <b>Next Audit:</b>{" "}
                                      {isEditing
                                        ? <input style={inputInline} value={footer.nextAudit || ""} onChange={(e)=>{ const f=getFooter(); f.nextAudit = e.target.value; setDraft({...draft}); }} />
                                        : (r.nextAudit || "-")}
                                    </div>
                                    <div>
                                      <b>Reviewed & Verified By:</b>{" "}
                                      {isEditing
                                        ? <input style={inputInline} value={footer.reviewedAndVerifiedBy || ""} onChange={(e)=>{ const f=getFooter(); f.reviewedAndVerifiedBy = e.target.value; setDraft({...draft}); }} />
                                        : (r.reviewedBy || "-")}
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </>
                          )}

                          {/* Debug viewer */}
                          {SHOW_DEBUG && (
                            <details style={{ marginTop: 10 }}>
                              <summary style={{ cursor: "pointer" }}>Show raw JSON</summary>
                              <pre style={preStyle}>{JSON.stringify(r._raw, null, 2)}</pre>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Lightbox viewer */}
        {viewerSrc && <Lightbox src={viewerSrc} onClose={() => setViewerSrc(null)} />}
      </main>
    </div>
  );
}

/* ===== Small components ===== */
function Thumbs({ list, onView }) {
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length) return <span style={{ opacity: 0.6 }}>-</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {arr.slice(0, 6).map((src, i) => (
        <img
          key={i}
          src={src}
          alt="evidence"
          onClick={() => onView && onView(src)}
          title="Click to preview"
          style={{ width: 56, height: 56, objectFit: "cover", border: "1px solid #d1d5db", borderRadius: 6, cursor:"zoom-in" }}
        />
      ))}
      {arr.length > 6 && <span style={{ fontSize: 12, opacity: 0.7 }}>+{arr.length - 6}</span>}
    </div>
  );
}

function ImageField({ list, onAdd, onRemove, onView }) {
  const count = (list || []).length;
  const canAdd = count < 5;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(list || []).map((src, i) => (
          <div key={i} style={{ position: "relative", width: 56, height: 56, border: "1px solid #d1d5db", borderRadius: 6, overflow: "hidden" }}>
            <img
              src={src}
              alt=""
              onClick={() => onView && onView(src)}
              title="Click to preview"
              style={{ width: "100%", height: "100%", objectFit: "cover", cursor:"zoom-in" }}
            />
            <button onClick={()=>onRemove(i)} title="Remove" style={thumbX}>×</button>
          </div>
        ))}
      </div>
      <label style={{ ...uploadBtn, opacity: canAdd ? 1 : 0.6, pointerEvents: canAdd ? "auto" : "none" }}>
        Upload ({count}/5)
        <input type="file" accept="image/*" multiple style={{ display: "none" }}
               onChange={(e)=>{ const f=e.target.files; f && onAdd(f); e.target.value=""; }} />
      </label>
    </div>
  );
}

/* ===== Lightbox ===== */
function Lightbox({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex",
        alignItems:"center", justifyContent:"center", zIndex: 9999, cursor:"zoom-out"
      }}
      title="Click to close"
    >
      <img
        src={src}
        alt="preview"
        style={{ maxWidth:"90vw", maxHeight:"90vh", borderRadius:12, boxShadow:"0 10px 30px rgba(0,0,0,.4)", background:"#fff" }}
      />
    </div>
  );
}

/* ===== Styles ===== */
const BORDER = C.border;
const BORDER_STRONG = C.borderStrong;
const COLS = "1.2fr 1fr 1.2fr 1.1fr 1.1fr 140px 120px";

const asideStyle = { background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12, height:"fit-content" };
const chip = (active) => ({ border:`1px solid ${active ? BORDER_STRONG : BORDER}`, background:active ? "#eef2ff" : "#fff", color:active ? "#1e40af" : "#111827", borderRadius:999, padding:"4px 10px", cursor:"pointer", fontSize:12 });

const inputStyle = { padding:"10px", borderRadius:8, border:"1px solid #ccc", background:"#fff", minWidth:220 };
const inputInline = { padding:"6px 8px", border:`1px solid ${BORDER}`, borderRadius:6, background:"#fff", minWidth:140 };

const smallBtn = { padding:"6px 10px", borderRadius:8, border:`1px solid ${BORDER}`, background:"#fff", cursor:"pointer", fontSize:13 };
const saveBtn = { padding:"6px 10px", borderRadius:8, border:"1px solid #16a34a", background:"#dcfce7", color:"#166534", cursor:"pointer", fontSize:13 };
const dangerBtn = { padding:"6px 10px", borderRadius:8, border:"1px solid #ef4444", background:"#fee2e2", color:"#b91c1c", cursor:"pointer", fontSize:13 };

const cardStyle = { background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:14, boxShadow:"0 1px 2px rgba(0,0,0,0.04)" };

const tableScroll = { overflowX:"auto", marginTop:8 };
const tableWrap = { minWidth:1100, border:`1px solid ${BORDER}`, borderRadius:10, overflow:"hidden" };
const tableGrid = { display:"grid", gridTemplateColumns:COLS, alignItems:"stretch" };
const tableHeaderRow = { ...tableGrid, borderBottom:`1px solid ${BORDER_STRONG}`, fontWeight:700, fontSize:13 };
const tr = { ...tableGrid, borderBottom:`1px solid ${BORDER}` };

const th = { padding:10, borderRight:`1px solid ${BORDER}`, whiteSpace:"nowrap", boxSizing:"border-box" };
const td = { padding:8, borderRight:`1px solid ${BORDER}`, boxSizing:"border-box", whiteSpace:"pre-wrap" };
const tdFixed = (w, extra={}) => ({ padding:8, borderRight:`1px solid ${BORDER}`, width:w, boxSizing:"border-box", ...extra });

const cellTextArea = { width:"100%", minHeight:80, resize:"vertical", padding:8, border:`1px solid ${BORDER}`, borderRadius:6, background:"#fff", boxSizing:"border-box" };
const selectCell = { width:"100%", padding:"8px 10px", border:`1px solid ${BORDER}`, borderRadius:6, background:"#fff", boxSizing:"border-box" };

const iconBtn = { width:28, height:28, border:`1px solid ${BORDER}`, background:"#fff", borderRadius:6, cursor:"pointer" };
const addRowBtn = { border:`1px dashed ${BORDER}`, background:"#fff", padding:"8px 12px", borderRadius:8, cursor:"pointer" };

const noteBox = { background:C.bandSilver, border:`1px solid ${BORDER}`, borderRadius:8, padding:8 };

const uploadBtn = { display:"inline-block", marginTop:6, fontSize:12, border:`1px solid ${BORDER}`, borderRadius:8, padding:"6px 10px", cursor:"pointer", background:"#fff" };
const thumbX = { position:"absolute", top:2, right:2, width:18, height:18, borderRadius:"50%", border:"none", background:"rgba(239,68,68,.9)", color:"#fff", cursor:"pointer", lineHeight:"18px", fontSize:12 };

const preStyle = { background:"#0f172a", color:"#e2e8f0", padding:"10px", borderRadius:8, overflow:"auto", maxHeight:300, fontSize:12 };
