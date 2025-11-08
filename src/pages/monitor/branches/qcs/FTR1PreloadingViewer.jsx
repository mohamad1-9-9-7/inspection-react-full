// src/pages/monitor/branches/qcs/FTR1PreloadingViewer.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Type / constants ===== */
const TYPE = "ftr1_preloading_inspection";
const BRANCH_FALLBACK = "FTR 1 Food Truck";
const SITE_LABEL = "MUSHRIF PARK";

/* ===== Default rows (مطابقة للإدخال) ===== */
const DEFAULT_ROWS_DEF = [
  { key: "no",              label: "SAMPLE NO" },
  { key: "productName",     label: "PRODUCT NAME" },
  { key: "area",            label: "AREA" },
  { key: "truckTemp",       label: "TRUCK TEMP", type: "number" },
  { key: "proDate",         label: "PRO DATE" },
  { key: "expDate",         label: "EXP DATE" },
  { key: "deliveryDate",    label: "DELIVERY  DATE" },
  { key: "quantity",        label: "QUANTITY" },
  { key: "colorCode",       label: "COLOR CODE" },
  { key: "productTemp",     label: "PRODUCT  TEMP °C", type: "number" },
  { key: "labelling",       label: "LABELLING" },
  { key: "appearance",      label: "APPEARANCE" },
  { key: "color",           label: "COLOR" },
  { key: "brokenDamage",    label: "BROKEN/DAMAGE" },
  { key: "badSmell",        label: "BAD SMELL" },
  { key: "overallCondition",label: "OVERALL CONDITION" },
  { key: "remarks",         label: "REMARKS" },
];

/* ===== Helpers ===== */
function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
}
function ensureObject(v) {
  if (!v) return {};
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
  return v;
}
function pickEntryDate(p = {}) {
  const h = p?.header || {};
  return h.reportEntryDate || p?.meta?.entryDate || h.date || "";
}

// ✅ sign-off reader (يدعم matchedBy أو checkedBy)
function getSignoff(payload) {
  const s = ensureObject(payload?.signoff) || {};
  return {
    verifiedBy: s.verifiedBy || "",
    checkedBy: s.checkedBy || s.matchedBy || "",
  };
}

// ✅ يقبل samplesTable أو samples (القديم) ويضمن arrays آمنة
function normalizeTable(rawPayload) {
  const payload = ensureObject(rawPayload);
  const base = {
    header: { reportEntryDate: "", site: SITE_LABEL, dayOfWeek: "" },
    branchCode: BRANCH_FALLBACK,
    rows: DEFAULT_ROWS_DEF,
    columns: [],
  };
  if (!payload || typeof payload !== "object") return base;

  const branchCode = payload.branchCode || payload.branch || BRANCH_FALLBACK;
  const header = {
    reportEntryDate: pickEntryDate(payload),
    dayOfWeek: payload?.header?.dayOfWeek || "",
    site: payload?.header?.site || SITE_LABEL,
  };

  // صفوف
  let rows = Array.isArray(payload?.samplesTable?.rows) && payload.samplesTable.rows.length
    ? payload.samplesTable.rows
    : DEFAULT_ROWS_DEF;

  // أعمدة
  let columns;
  if (Array.isArray(payload?.samplesTable?.columns)) columns = payload.samplesTable.columns;
  else if (Array.isArray(payload?.samples)) {
    columns = payload.samples.map((s, i) => ({
      sampleId: s?.no ?? i + 1,
      no: s?.no ?? i + 1,
      ...s,
      // تأمين الحقول المرجعية للصور إن كانت في الإدخال القديم
      photo1Base64: s?.photo1Base64 || s?.photo1 || "",
      photo2Base64: s?.photo2Base64 || s?.photo2 || "",
    }));
  } else columns = [];

  // احرص على وجود مفاتيح الصور في الأعمدة النهائية
  columns = (Array.isArray(columns) ? columns : []).map((c) => ({
    ...c,
    photo1Base64: c?.photo1Base64 || c?.photo1 || "",
    photo2Base64: c?.photo2Base64 || c?.photo2 || "",
  }));

  return {
    header,
    branchCode,
    rows: Array.isArray(rows) && rows.length ? rows : DEFAULT_ROWS_DEF,
    columns: Array.isArray(columns) ? columns : [],
  };
}

/* ====== ألوان/ثيم (تصميم فقط) ====== */
const COLORS = {
  ink: "#0b1f4d",
  sub: "#475569",
  softBg: "#f5f7fb",
  primary: "#1d4ed8",
  border: "#e5e7eb",
  danger: "#ef4444",
};

/* ===== ترويسة AL MAWASHI (مثل الصورة) ===== */
const headWrap   = { background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:12, padding:12, marginBottom:10 };
const brandRow   = { display:"flex", justifyContent:"flex-end" };
const brandBox   = { textAlign:"right", lineHeight:1.1 };
const brandTitle = { margin:0, fontSize:18, fontWeight:900, color:"#7b001c", letterSpacing:.3 };
const brandSub   = { margin:0, fontSize:12, color:"#111827" };
const metaTable  = { width:"100%", borderCollapse:"collapse", marginTop:8, fontSize:13 };
const cell       = { border:`1px solid ${COLORS.border}`, padding:"6px 8px" };
const metaLabel  = { ...cell, fontWeight:800, width:"24%" };
const metaValue  = { ...cell, width:"26%" };
const strip      = { background:"#eceff3", borderRadius:4, marginTop:10, padding:"8px 10px", textAlign:"center" };
const stripLine1 = { margin:0, fontWeight:900, color:"#111827" };
const stripLine2 = { margin:0, fontWeight:900 };

/* ===== Styles لباقي الصفحة (تصميم فقط) ===== */
const pageWrap = { display:"grid", gridTemplateColumns:"300px 1fr", gap:12, alignItems:"start" };

const side = {
  background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:12, padding:12,
  boxShadow:"0 4px 12px rgba(0,0,0,.06)", maxHeight:"74vh", overflow:"auto"
};
const sideTitle = { margin:"0 0 8px", fontWeight:900, fontSize:14, color:COLORS.ink };
const sideBtn = {
  display:"inline-flex", alignItems:"center", gap:8, marginBottom:10,
  background:"#eef2ff", border:`1px solid ${COLORS.primary}`, color:"#1e293b",
  padding:"6px 10px", borderRadius:10, fontWeight:800, cursor:"pointer"
};
const ymHeader = { padding:"6px 8px", fontWeight:900, color:COLORS.ink, background:"#f3f4f6", borderRadius:8, marginTop:8 };
const dayBox = (active) => ({
  padding:"8px 10px", borderRadius:10,
  border:`1px solid ${active ? COLORS.primary : COLORS.border}`,
  background: active ? "#e0e7ff" : "#f8fafc",
  marginTop:6,
});
const timeBtn = {
  display:"block", width:"100%", textAlign:"left",
  padding:"6px 8px", marginTop:6, borderRadius:8,
  border:`1px dashed ${COLORS.border}`, background:"#ffffff",
  cursor:"pointer", fontWeight:700, fontSize:12
};

const card   = { background:"#fff", border:`1px solid ${COLORS.border}`, borderRadius:12, padding:12 };
const title  = { margin:"0 0 6px", fontWeight:900, fontSize:16, color:COLORS.ink };
const sub    = { margin:"0 0 12px", color:COLORS.sub, fontWeight:700, fontSize:13 };
const toolbar= { display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:10 };
const btn    = (bg, color="#111827", bd=COLORS.border) => ({
  background:bg, color, border:`1px solid ${bd}`, borderRadius:10,
  padding:"8px 12px", fontWeight:800, cursor:"pointer"
});

const th = {
  border:"1px solid #cbd5e1",
  padding:"10px 8px",
  textAlign:"center",
  background:"#f7fafc",
  fontWeight:900,
  whiteSpace:"nowrap",
  color:COLORS.ink
};
const td = { border:"1px solid #e2e8f0", padding:"9px 8px", textAlign:"center", verticalAlign:"top", color:COLORS.ink };
const tdAttr = { ...td, fontWeight:900, textAlign:"left", background:COLORS.softBg, position:"sticky", left:0, zIndex:1 };
const gridTbl = { width:"100%", borderCollapse:"separate", borderSpacing:0, tableLayout:"fixed", fontSize:13 };
const baseInput = { width:"100%", boxSizing:"border-box", border:`1px solid ${COLORS.border}`, borderRadius:8, padding:"6px 8px", minWidth:0 };

/* ==== صور (معاينات) ==== */
const photoGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(180px, 1fr))", gap:12 };
const photoCard = { border:`1px solid ${COLORS.border}`, borderRadius:10, padding:8, background:"#fff" };
const preview = { width:"100%", height:120, objectFit:"cover", borderRadius:6, border:`1px solid ${COLORS.border}`, cursor:"zoom-in" };
const chip = { display:"inline-block", padding:"2px 8px", borderRadius:999, background:"#f1f5f9", fontWeight:800, fontSize:12, color:COLORS.ink };

/* ===== Modal (Preview/Download) ===== */
const modalBackdrop = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 9999,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16
};
const modalBox = {
  background: "#fff", borderRadius: 12, maxWidth: "92vw", maxHeight: "88vh",
  display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #e5e7eb"
};
const modalHeader = { padding: "10px 12px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" };
const modalTitle = { margin: 0, fontWeight: 900, color: "#0b1f4d" };
const modalActions = { display: "flex", gap: 8, alignItems: "center" };
const modalBtn = (bg="#eef2ff", bd="#c7d2fe") => ({
  background: bg, border: `1px solid ${bd}`, borderRadius: 8, padding: "6px 10px", fontWeight: 800, cursor: "pointer"
});
const modalBody = { padding: 10, overflow: "auto", background: "#f8fafc" };
const fullImg = { maxWidth: "100%", maxHeight: "76vh", objectFit: "contain" };

/* ===== ✅ Sign-off styles ===== */
const signWrap = {
  marginTop: 12,
  padding: 10,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: "#f8fafc",
};
const signRow = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" };
const signBox = { display: "flex", alignItems: "center", gap: 8, minWidth: 0 };
const signLabel = { fontWeight: 900, color: COLORS.ink, whiteSpace: "nowrap" };
const signValue = {
  padding: "6px 10px",
  border: `1px dashed ${COLORS.border}`,
  borderRadius: 8,
  minWidth: 220,
  background: "#ffffff",
  fontWeight: 800,
  color: COLORS.ink,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

/* ===== Component ===== */
export default function FTR1PreloadingViewer() {
  const [date, setDate] = useState(todayDubai());           // آخر تاريخ مفتوح
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);               // العنصر المختار (كامل)
  const [error, setError] = useState("");

  // 🆕 مودال المعاينة
  const [viewer, setViewer] = useState({ open: false, src: "", name: "" });
  const openPreview = (src, name) => setViewer({ open: true, src, name });
  const closePreview = () => setViewer({ open: false, src: "", name: "" });
  const downloadCurrent = () => {
    if (!viewer.src) return;
    const a = document.createElement("a");
    a.href = viewer.src;
    a.download = (viewer.name || "image").replace(/\s+/g, "_") + ".jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // فهرس الأيام (سنحوّله لعرض سنة/شهر/يوم في الواجهة)
  const [daysTree, setDaysTree] = useState([]);             // [{date:'YYYY-MM-DD', items:[...]}]

  // وضع تحرير
  const [editMode, setEditMode] = useState(false);
  const [editRows, setEditRows] = useState(DEFAULT_ROWS_DEF);
  const [editCols, setEditCols] = useState([]);

  const caption = useMemo(() => {
    const dstr = pickEntryDate(report?.payload || {}) || date || "";
    const tm = (report?.createdAt || "").slice(11, 16);
    return `MEAT PRODUCT INSPECTION REPORT — MUSHRIF PARK (FTR 1) • ${dstr}${tm ? ` • ${tm}` : ""}`;
  }, [report, date]);

  /* ====== جلب وبناء شجرة التواريخ ====== */
  async function buildDaysTree() {
    setLoading(true);
    setError("");
    try {
      async function fetchAll(url) {
        const res = await fetch(url);
        const data = await res.json().catch(() => ({}));
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        return [];
      }

      // 1) جرّب مع type
      let items = await fetchAll(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);
      // 2) لو فاضي، جرّب بدون فلترة
      if (!items.length) {
        items = await fetchAll(`${API_BASE}/api/reports`);
        items = items.filter((it) => (it?.type || "").trim() === TYPE);
      }

      // payload قد يكون string
      items = items.map((it) => ({ ...it, payload: ensureObject(it?.payload) }));

      // تجميع حسب التاريخ
      const groups = new Map();
      for (const it of items) {
        const p = it?.payload || {};
        const d = pickEntryDate(p) || String(it?.createdAt || "").slice(0, 10);
        if (!d) continue;
        const arr = groups.get(d) || [];
        arr.push(it);
        groups.set(d, arr);
      }

      const list = Array.from(groups.entries())
        .map(([d, arr]) => ({
          date: d,
          items: arr.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      setDaysTree(list);

      // افتح أحدث عنصر إن لم يوجد تقرير مفتوح
      if (!report && list[0]?.items?.[0]) {
        setReport(list[0].items[0]);
        setDate(list[0].date);
      }
    } catch (e) {
      console.error(e);
      setDaysTree([]);
      setError("فشل جلب شجرة التواريخ.");
    } finally {
      setLoading(false);
    }
  }

  function openItem(item) {
    if (!item) return;
    const d = pickEntryDate(item?.payload || {}) || (item?.createdAt || "").slice(0, 10) || todayDubai();
    setReport(item);
    setDate(d);
    setError("");
    setEditMode(false);
  }

  useEffect(() => {
    buildDaysTree();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ====== تحرير ====== */
  function enterEdit() {
    const norm = normalizeTable(report?.payload);
    setEditRows(norm.rows);
    setEditCols((norm.columns || []).map((c) => ({ ...c })));
    setEditMode(true);
  }
  function cancelEdit() { setEditMode(false); }
  function setCell(colIdx, key, val) {
    setEditCols((prev) => {
      const next = [...prev];
      next[colIdx] = { ...next[colIdx], [key]: val };
      return next;
    });
  }

  async function saveEdit() {
    if (!report) return;
    const id = report.id || report._id;
    if (!id) return alert("لا يمكن حفظ: المعرّف غير متوفر.");
    try {
      const norm = normalizeTable(report?.payload);
      const newPayload = {
        ...(report.payload || {}),
        header: {
          ...(ensureObject(report.payload)?.header || {}),
          reportEntryDate: norm.header.reportEntryDate,
          dayOfWeek: norm.header.dayOfWeek,
          site: norm.header.site || SITE_LABEL,
        },
        samplesTable: { rows: editRows, columns: editCols },
      };
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: newPayload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ Saved changes.");
      setReport((r) => ({ ...(r || {}), payload: newPayload }));
      // حدث في الشجرة
      setDaysTree((prev) =>
        prev.map((day) => ({
          ...day,
          items: day.items.map((it) => ((it.id || it._id) === id ? { ...it, payload: newPayload } : it)),
        }))
      );
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تأكد من PUT /api/reports/:id.");
    }
  }

  async function deleteReport() {
    if (!report) return;
    const id = report.id || report._id;
    if (!id) return alert("لا يمكن الحذف: المعرّف غير متوفر.");
    if (!window.confirm("هل تريد حذف هذا التقرير نهائيًا؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("🗑️ Deleted.");

      // أزل من الشجرة
      setDaysTree((prev) => {
        const next = [];
        for (const day of prev) {
          const items = day.items.filter((it) => (it.id || it._id) !== id);
          if (items.length) next.push({ ...day, items });
        }
        return next;
      });

      // إعادة تحميل الشجرة واختيار أحدث تقرير متاح
      await buildDaysTree();
      setReport(null);
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحذف. تأكد من DELETE /api/reports/:id.");
    }
  }

  /* ====== تصدير XLS (بدون مكتبة) ====== */
  function exportXLS() {
    const norm = normalizeTable(report?.payload);
    const rows = norm.rows || [];
    const columns = norm.columns || [];
    const safe = (s) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
      <table border="1">
        <tr><th></th>${columns.map((c, i) => `<th>${safe(c?.sampleId ?? c?.no ?? i + 1)}</th>`).join("")}</tr>
        ${rows
          .map(
            (r) =>
              `<tr><td>${safe(r.label)}</td>${columns
                .map((c) => `<td>${safe(c?.[r.key])}</td>`).join("")}</tr>`
          )
          .join("")}
      </table>
      </body></html>`;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = pickEntryDate(report?.payload || {}) || date || todayDubai();
    a.href = url;
    a.download = `FTR1_MUSHRIF_${d}.xls`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  /* ====== العرض ====== */
  const norm = normalizeTable(report?.payload);
  const rows = norm.rows;
  const columns = editMode ? editCols : norm.columns;

  // بيانات الترويسة
  const meta = {
    documentTitle: "MEAT PRODUCT INSPECTION REPORT",
    documentNo: "FS-QM/REC/RM/FTR1-01",
    issueDate: "05/02/2020",
    revisionNo: "01",
    area: "QA",
    issuedBy: "Mohamad Abdullah",
    approvedBy: "Hussam O. Sarhan",
    controllingOfficer: "Quality Controller",
  };

  // ⬅️ تجميع شجرة التاريخ: سنة ⟶ شهر ⟶ يوم
  const groupedNav = useMemo(() => {
    const byYear = new Map();
    for (const d of daysTree) {
      const [y, m] = (d.date || "").split("-");
      if (!y || !m) continue;
      const ym = `${y}-${m}`;
      if (!byYear.has(y)) byYear.set(y, new Map());
      const months = byYear.get(y);
      if (!months.has(ym)) months.set(ym, []);
      months.get(ym).push(d);
    }
    const years = Array.from(byYear.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([year, monthsMap]) => ({
        year,
        months: Array.from(monthsMap.entries())
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([ym, days]) => ({ ym, days })),
      }));
    return years;
  }, [daysTree]);

  const monthName = (ym) => {
    const [y, m] = ym.split("-");
    const date = new Date(Number(y), Number(m) - 1, 1);
    return `${date.toLocaleString("en", { month: "long" })} ${y}`;
  };

  // هل يحتوي التقرير على أي صور؟
  const hasAnyPhotos = (columns || []).some(
    (c) => c?.photo1Base64 || c?.photo2Base64
  );

  // 🆕 sign-off values
  const sign = getSignoff(report?.payload || {});

  return (
    <div>
      {/* ===== ترويسة AL MAWASHI ===== */}
      <div style={headWrap}>
        <div style={brandRow}>
          <div style={brandBox}>
            <h3 style={brandTitle}>AL MAWASHI</h3>
            <p style={brandSub}>Trans Emirates Livestock Trading L.L.C.</p>
          </div>
        </div>

        <table style={metaTable}>
          <tbody>
            <tr>
              <td style={metaLabel}>Document Title:</td>
              <td style={metaValue}>{meta.documentTitle}</td>
              <td style={metaLabel}>Document No:</td>
              <td style={metaValue}>{meta.documentNo}</td>
            </tr>
            <tr>
              <td style={metaLabel}>Issue Date:</td>
              <td style={metaValue}>{meta.issueDate || "-"}</td>
              <td style={metaLabel}>Revision No:</td>
              <td style={metaValue}>{meta.revisionNo}</td>
            </tr>
            <tr>
              <td style={metaLabel}>Area:</td>
              <td style={metaValue}>{meta.area}</td>
              <td style={metaLabel}>Issued By:</td>
              <td style={metaValue}>{meta.issuedBy || "-"}</td>
            </tr>
            <tr>
              <td style={metaLabel}>Controlling Officer:</td>
              <td style={metaValue}>{meta.controllingOfficer}</td>
              <td style={metaLabel}>Approved By:</td>
              <td style={metaValue}>{meta.approvedBy || "-"}</td>
            </tr>
          </tbody>
        </table>

        <div style={strip}>
          <p style={stripLine1}>
            TRANS EMIRATES LIVESTOCK MEAT TRADING LLC — {norm.header.site || SITE_LABEL}
          </p>
          <p style={stripLine2}>MEAT PRODUCT INSPECTION REPORT</p>
        </div>
      </div>

      {/* ===== بقية الصفحة ===== */}
      <div style={pageWrap}>
        {/* الشريط الجانبي: شجرة سنة/شهر/يوم */}
        <aside style={side}>
          <h4 style={sideTitle}>🗓️ All Reports (Year ▸ Month ▸ Day)</h4>
          <button onClick={buildDaysTree} style={sideBtn}>⟳ Refresh</button>
          {groupedNav.length === 0 && (
            <div style={{ fontSize: 12, color: COLORS.sub }}>لا توجد تقارير.</div>
          )}

          {groupedNav.map((y) => (
            <div key={y.year}>
              <div style={ymHeader}>📅 {y.year}</div>
              {y.months.map((m) => (
                <div key={m.ym} style={{ marginTop: 6 }}>
                  <div style={{ ...ymHeader, background:"#f9fafb" }}>🗂️ {monthName(m.ym)}</div>
                  {m.days.map((d) => {
                    const isActiveDay = d.date === (pickEntryDate(report?.payload || {}) || date);
                    return (
                      <div key={d.date} style={dayBox(isActiveDay)}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontWeight:800 }}>
                          <span>{d.date}</span>
                          <span style={{ opacity:.7 }}>×{d.items.length}</span>
                        </div>
                        {d.items.map((it) => {
                          const tm = (it?.createdAt || "").slice(11, 16);
                          const isActiveItem = (it.id || it._id) === (report?.id || report?._id);
                          return (
                            <button
                              key={it.id || it._id}
                              style={{
                                ...timeBtn,
                                border: isActiveItem ? `1px solid ${COLORS.primary}` : timeBtn.border,
                                background: isActiveItem ? "#eef2ff" : "#ffffff",
                              }}
                              onClick={() => openItem(it)}
                              title={`Open ${d.date} ${tm || ""}`}
                            >
                              {tm || "—"}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </aside>

        {/* مساحة العرض الرئيسية */}
        <div style={card}>
          <h3 style={title}>FTR 1 • Mushrif — Viewer</h3>
          <p style={sub}>
            {caption} | Branch: <strong>{norm.branchCode}</strong> | Site: <strong>{norm.header.site}</strong>
          </p>

          <div style={toolbar}>
            <button onClick={exportXLS} style={btn("#ecfdf5", "#065f46", "#a7f3d0")}>⬇️ Export XLS</button>

            {!editMode && (
              <button onClick={enterEdit} style={btn("#fff7ed", "#7c2d12", "#fed7aa")}>✏️ Edit</button>
            )}

            {editMode && (
              <>
                <button onClick={saveEdit} style={btn("#eefdf3", "#065f46", "#a7f3d0")}>💾 Save</button>
                <button onClick={cancelEdit} style={btn("#fef2f2", "#7f1d1d", "#fecaca")}>✖ Cancel</button>
              </>
            )}

            <button onClick={deleteReport} style={btn("#fef2f2", "#7f1d1d", "#fecaca")}>🗑️ Delete</button>

            {loading && <span style={{ fontWeight: 700, color: COLORS.ink }}>Loading…</span>}
            {!!error && <span style={{ color: COLORS.danger, fontWeight: 800 }}>{error}</span>}
          </div>

          {/* الجدول */}
          <div style={{ overflowX: "auto", borderRadius:12, border:`1px solid ${COLORS.border}` }}>
            <table style={gridTbl}>
              <colgroup>
                <col style={{ width: 230 }} />
                {columns.map((_, i) => <col key={i} style={{ width: 170 }} />)}
              </colgroup>
              <thead>
                <tr>
                  <th style={th}></th>
                  {columns.map((c, i) => (
                    <th key={i} style={th}>{c?.sampleId ?? c?.no ?? i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, rIdx) => (
                  <tr key={r.key} style={{ background: rIdx % 2 ? "#fcfeff" : "#ffffff" }}>
                    <td style={tdAttr}>{r.label}</td>
                    {columns.map((c, i) => {
                      const v = c?.[r.key] ?? "";
                      if (!editMode) return <td key={`${r.key}-${i}`} style={td}>{String(v)}</td>;
                      const isNum = r.type === "number";
                      return (
                        <td key={`${r.key}-${i}`} style={td}>
                          {isNum ? (
                            <input
                              type="number"
                              value={v}
                              onChange={(e) => setCell(i, r.key, e.target.value)}
                              style={baseInput}
                            />
                          ) : r.key.toLowerCase().includes("date") ? (
                            <input
                              type="date"
                              value={v}
                              onChange={(e) => setCell(i, r.key, e.target.value)}
                              style={baseInput}
                            />
                          ) : ["labelling","appearance","color","brokenDamage","badSmell","overallCondition"].includes(r.key) ? (
                            <select
                              value={v}
                              onChange={(e) => setCell(i, r.key, e.target.value)}
                              style={baseInput}
                            >
                              <option value="">--</option>
                              <option>OK</option>
                              <option>NIL</option>
                              <option>NC</option>
                            </select>
                          ) : (
                            <input
                              value={v}
                              onChange={(e) => setCell(i, r.key, e.target.value)}
                              style={baseInput}
                              placeholder=""
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {columns.length === 0 && (
                  <tr>
                    <td style={{ ...td, textAlign: "center" }} colSpan={rows.length + 1}>
                      لا توجد أعمدة/عينات للعرض.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ عرض الصور المدخلة من صفحة الإدخال + Preview/Download */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 900, color: COLORS.ink, marginBottom: 8 }}>Attached Photos (per sample)</div>
            {!hasAnyPhotos ? (
              <div style={{ color: COLORS.sub, fontSize: 13 }}>لا توجد صور مرفقة لهذا التقرير.</div>
            ) : (
              <div style={photoGrid}>
                {columns.map((c, i) => {
                  const p1 = c?.photo1Base64;
                  const p2 = c?.photo2Base64;
                  if (!p1 && !p2) return null;
                  const sampleName = `Sample ${c?.sampleId ?? c?.no ?? i+1}`;
                  return (
                    <div key={`ph-${i}`} style={photoCard}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                        <span style={{ fontWeight:900, color:COLORS.ink }}>{sampleName}</span>
                        <span style={chip}>Photos</span>
                      </div>

                      {p1 && (
                        <img
                          alt={`${sampleName} — 1 of 2`}
                          src={p1}
                          style={preview}
                          onClick={() => openPreview(p1, `${sampleName} — 1 of 2`)}
                          title="Click to preview & download"
                        />
                      )}
                      {p2 && (
                        <img
                          alt={`${sampleName} — 2 of 2`}
                          src={p2}
                          style={{ ...preview, marginTop: 8 }}
                          onClick={() => openPreview(p2, `${sampleName} — 2 of 2`)}
                          title="Click to preview & download"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 🆕 ✅ خانتا التوقيع بأسفل العارض */}
          <div style={signWrap}>
            <div style={signRow}>
              <div style={signBox}>
                <div style={signLabel}>Verified by:</div>
                <div style={signValue}>{sign.verifiedBy || "\u200b"}</div>
              </div>
              <div style={signBox}>
                <div style={signLabel}>CHECKED BY:</div>
                <div style={signValue}>{sign.checkedBy || "\u200b"}</div>
              </div>
            </div>
          </div>
          {/* نهاية خانتي التوقيع */}
        </div>
      </div>

      {/* ===== Modal ===== */}
      {viewer.open && (
        <div style={modalBackdrop} onClick={closePreview}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeader}>
              <h4 style={modalTitle}>{viewer.name || "Image"}</h4>
              <div style={modalActions}>
                <button style={modalBtn()} onClick={downloadCurrent}>Download</button>
                <a
                  href={viewer.src}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...modalBtn("#f0fdf4", "#a7f3d0"), textDecoration: "none", display: "inline-block" }}
                >
                  Open in new tab
                </a>
                <button style={modalBtn("#fee2e2", "#fecaca")} onClick={closePreview}>Close</button>
              </div>
            </div>
            <div style={modalBody}>
              <img alt={viewer.name || "image"} src={viewer.src} style={fullImg} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
