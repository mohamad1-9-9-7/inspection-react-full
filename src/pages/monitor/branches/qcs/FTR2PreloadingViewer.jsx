// src/pages/monitor/branches/qcs/FTR2PreloadingViewer.jsx
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
const TYPE = "ftr2_preloading_inspection";
const BRANCH_FALLBACK = "FTR 2 Food Truck";
const SITE_LABEL = "MAMZAR PARK";

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
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
}
const pickEntryDate = (p = {}) =>
  p?.header?.reportEntryDate || p?.header?.date || p?.meta?.entryDate || "";

// بعض الاستجابات قد تعيد payload كنص
function ensureObject(v) {
  if (!v) return {};
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
  return v;
}

/* ✅ sign-off reader (يدعم matchedBy أو checkedBy) */
function getSignoff(payload) {
  const s = ensureObject(payload?.signoff) || {};
  return {
    verifiedBy: s.verifiedBy || "",
    checkedBy: s.checkedBy || s.matchedBy || "",
  };
}

/* تحويل مصفوفة samples إلى أعمدة عند غياب samplesTable */
function samplesToColumns(samples = []) {
  if (!Array.isArray(samples)) return [];
  return samples.map((s, i) => {
    const col = { sampleId: s?.no ?? i + 1, no: s?.no ?? i + 1 };
    for (const r of DEFAULT_ROWS_DEF) col[r.key] = s?.[r.key] ?? "";
    col.photo1Base64 = s?.photo1Base64 || s?.photo1 || "";
    col.photo2Base64 = s?.photo2Base64 || s?.photo2 || "";
    return col;
  });
}

/* تطبيع الحمولة لاستخدام rows/columns العرضية */
function normalizeTable(rawPayload) {
  const payload = ensureObject(rawPayload);
  if (!payload || typeof payload !== "object") {
    return {
      header: { reportEntryDate: "", site: SITE_LABEL, dayOfWeek: "" },
      branchCode: BRANCH_FALLBACK,
      rows: DEFAULT_ROWS_DEF,
      columns: [],
    };
  }
  const branchCode = payload.branchCode || payload.branch || BRANCH_FALLBACK;
  const header = {
    reportEntryDate: pickEntryDate(payload),
    dayOfWeek: payload?.header?.dayOfWeek || "",
    site: payload?.header?.site || SITE_LABEL,
  };
  let rows = payload?.samplesTable?.rows;
  if (!Array.isArray(rows) || !rows.length) rows = DEFAULT_ROWS_DEF;

  let columns = payload?.samplesTable?.columns;
  if (!Array.isArray(columns) || !columns.length) {
    columns = samplesToColumns(payload?.samples); // دعم الإدخال القديم
  } else {
    columns = columns.map((c) => ({
      ...c,
      photo1Base64: c?.photo1Base64 || c?.photo1 || "",
      photo2Base64: c?.photo2Base64 || c?.photo2 || "",
    }));
  }
  return { header, branchCode, rows, columns };
}

/* لاستخراج items من أي شكل استجابة */
function extractItems(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.rows)) return data.rows;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

/* بناء شجرة سنة ← شهر ← يوم */
function buildYMDTree(items) {
  const byY = new Map();
  for (const it of items) {
    const p = ensureObject(it?.payload) || {};
    const dStr = pickEntryDate(p) || String(it?.createdAt || "").slice(0, 10);
    if (!dStr) continue;
    const [y, m, d] = dStr.split("-");
    if (!byY.has(y)) byY.set(y, new Map());
    const byM = byY.get(y);
    if (!byM.has(m)) byM.set(m, new Map());
    const byD = byM.get(m);
    const arr = byD.get(d) || [];
    arr.push(it);
    byD.set(d, arr);
  }
  const years = Array.from(byY.keys()).sort((a, b) => b.localeCompare(a));
  return years.map((y) => {
    const byM = byY.get(y);
    const months = Array.from(byM.keys()).sort((a, b) => b.localeCompare(a));
    return {
      year: y,
      months: months.map((m) => {
        const byD = byM.get(m);
        const days = Array.from(byD.keys()).sort((a, b) => b.localeCompare(a));
        return {
          month: m,
          days: days.map((d) => {
            const dayItems = (byD.get(d) || [])
              .slice()
              .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
              .reverse();
            return { day: d, items: dayItems, date: `${y}-${m}-${d}` };
          }),
        };
      }),
    };
  });
}

/* ===== ألوان وواجهات (تصميم فقط) ===== */
const COLORS = {
  ink: "#0b1f4d",
  sub: "#475569",
  softBg: "#f5f7fb",
  primary: "#1d4ed8",
  border: "#e5e7eb",
  danger: "#ef4444",
  ok: "#10b981",
};

const pageWrap = { display: "grid", gridTemplateColumns: "300px 1fr", gap: 14, alignItems: "start" };

/* === ترويسة بنمط Al Mawashi (مثل الصورة) === */
const headWrap = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, marginBottom: 10 };
const brandRow = { display: "flex", justifyContent: "flex-end" };
const brandBox = { textAlign: "right", lineHeight: 1.1 };
const brandTitle = { margin: 0, fontSize: 18, fontWeight: 900, color: "#7b001c", letterSpacing: .3 };
const brandSub = { margin: 0, fontSize: 12, color: "#111827" };

const metaTable = { width: "100%", borderCollapse: "collapse", marginTop: 8, fontSize: 13 };
const cell = { border: `1px solid ${COLORS.border}`, padding: "6px 8px" };
const metaLabel = { ...cell, fontWeight: 800, width: "24%" };
const metaValue = { ...cell, width: "26%" };

const strip = { background: "#eceff3", borderRadius: 4, marginTop: 10, padding: "8px 10px", textAlign: "center" };
const stripLine1 = { margin: 0, fontWeight: 900, color: "#111827" };
const stripLine2 = { margin: 0, fontWeight: 900 };

/* صندوق جانبي */
const side = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12, maxHeight: "74vh", overflow: "auto" };
const sideTop = { display: "flex", gap: 8, alignItems: "center", marginBottom: 8 };
const sideTitle = { margin: 0, fontWeight: 900, fontSize: 14, color: COLORS.ink };
const refreshBtn = { background: "#eef2ff", border: `1px solid ${COLORS.primary}`, borderRadius: 10, padding: "6px 10px", fontWeight: 800, cursor: "pointer" };

const yearHdr = { margin: "8px 0 6px", fontWeight: 900, color: COLORS.ink };
const monthHdr = { margin: "4px 0 6px", fontWeight: 800, color: COLORS.sub };
const dayBox = (active) => ({ padding: "8px 10px", borderRadius: 12, border: `1px solid ${active ? COLORS.primary : COLORS.border}`, background: active ? "#f0f6ff" : "#f8fafc", marginBottom: 8 });

const dateHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, fontSize: 13, color: COLORS.ink };
const timeBtn = { display: "block", width: "100%", textAlign: "left", padding: "7px 10px", marginTop: 6, borderRadius: 10, border: `1px dashed ${COLORS.border}`, background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 12, color: COLORS.ink };

/* بطاقة المحتوى */
const card = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 12 };
const title = { margin: "0 0 6px", fontWeight: 900, fontSize: 17, color: COLORS.ink };
const sub = { margin: "0 0 12px", color: COLORS.sub, fontWeight: 800, fontSize: 13 };
const toolbar = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 };
const btn = (bg, color = "#0b1220", bd = COLORS.border) => ({ background: bg, color, border: `1px solid ${bd}`, borderRadius: 10, padding: "9px 12px", fontWeight: 900, cursor: "pointer" });

/* جدول العرض — فواصل أعمدة واضحة */
const tableShell = { background: "#fff", borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.border}` };
const th = {
  border: `1px solid #cbd5e1`,
  padding: "10px 8px",
  textAlign: "center",
  background: "#f7fafc",
  fontWeight: 900,
  whiteSpace: "nowrap",
  color: COLORS.ink
};
const td = {
  border: `1px solid #e2e8f0`,
  padding: "9px 8px",
  textAlign: "center",
  verticalAlign: "top",
  color: COLORS.ink
};
const tdAttr = {
  ...td,
  fontWeight: 900,
  textAlign: "left",
  background: COLORS.softBg,
  position: "sticky",
  left: 0,
  zIndex: 1,
  borderRight: "2px solid #94a3b8"
};
const grid = { width: "100%", borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", fontSize: 13 };
const baseInput = { width: "100%", boxSizing: "border-box", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "7px 10px", minWidth: 0, background: "#fff" };

/* صور */
const photosWrap = { marginTop: 12, padding: 10, border: "1px dashed #64748b", borderRadius: 8, background: "#eef2ff" };
const photosGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 };
const photoCard = { border: "1px solid #cbd5e1", borderRadius: 8, padding: 8, background: "#fff" };
const photoTitle = { fontWeight: 800, marginBottom: 6, textAlign: "center" };
const preview = { width: 90, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #94a3b8", cursor: "zoom-in" };

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
export default function FTR2PreloadingViewer() {
  const [date, setDate] = useState(todayDubai());
  const [report, setReport] = useState(null);
  const [ymdTree, setYmdTree] = useState([]);    // ⬅️ شجرة سنة/شهر/يوم
  const [editMode, setEditMode] = useState(false);
  const [editRows, setEditRows] = useState(DEFAULT_ROWS_DEF);
  const [editCols, setEditCols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 🆕 حالة المودال
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

  const caption = useMemo(() => {
    const dstr = pickEntryDate(ensureObject(report?.payload) || {}) || date || "";
    const tm = (report?.createdAt || "").slice(11, 16);
    return `MEAT PRODUCT INSPECTION REPORT — MAMZAR PARK (FTR 2) • ${dstr}${tm ? ` • ${tm}` : ""}`;
  }, [report, date]);

  /* ترويسة/ميتا */
  const meta = useMemo(() => ({
    documentTitle: "MEAT PRODUCT INSPECTION REPORT",
    documentNo: "FS-QM/REC/RM/FTR2-02",
    issueDate: "05/02/2020",
    revisionNo: "01",
    area: "QA",
    issuedBy: "Mohamad Abdullah",
    approvedBy: "Hussam O. Sarhan",
    controllingOfficer: "Quality Controller",
  }), []);

  /* ====== بناء شجرة التواريخ (Y/M/D) ====== */
  async function buildDaysTree() {
    setLoading(true);
    setError("");
    try {
      let res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);
      let data = await res.json().catch(() => ({}));
      let items = extractItems(data);

      if (!items.length) {
        res = await fetch(`${API_BASE}/api/reports`);
        data = await res.json().catch(() => ({}));
        const all = extractItems(data);
        items = all.filter((x) => (x?.type || "").trim() === TYPE);
      }

      items = items.map((it) => ({ ...it, payload: ensureObject(it?.payload) }));

      const tree = buildYMDTree(items);
      setYmdTree(tree);

      if (tree[0]?.months?.[0]?.days?.[0]?.items?.[0]) {
        const first = tree[0].months[0].days[0];
        setReport(first.items[0]);
        setDate(first.date);
      } else {
        setReport(null);
        setError("لا توجد تقارير محفوظة لـ FTR2.");
      }
    } catch (e) {
      console.error(e);
      setError("فشل جلب التقارير من الخادم.");
      setYmdTree([]);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  function openItem(item) {
    if (!item) return;
    const d = pickEntryDate(ensureObject(item?.payload) || {}) || (item?.createdAt || "").slice(0, 10) || todayDubai();
    setReport(item);
    setDate(d);
    setEditMode(false);
    setError("");
  }

  useEffect(() => { buildDaysTree(); /* eslint-disable-next-line */ }, []);

  /* ===== تحرير ===== */
  function enterEdit() {
    const norm = normalizeTable(report?.payload);
    setEditRows(norm.rows);
    setEditCols((norm.columns || []).map((c) => ({ ...c })));
    setEditMode(true);
  }
  const cancelEdit = () => setEditMode(false);
  const setCell = (colIdx, key, val) =>
    setEditCols((prev) => { const next = [...prev]; next[colIdx] = { ...next[colIdx], [key]: val }; return next; });

  async function saveEdit() {
    if (!report) return;
    const id = report.id || report._id;
    if (!id) return alert("لا يمكن الحفظ: لا يوجد معرّف للسجل.");
    try {
      const norm = normalizeTable(report?.payload);
      const newPayload = {
        ...(ensureObject(report.payload) || {}),
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
      setEditMode(false);
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تأكد من PUT /api/reports/:id.");
    }
  }

  async function deleteReport() {
    if (!report) return;
    const id = report.id || report._id;
    if (!id) return alert("لا يمكن الحذف: لا يوجد معرّف.");
    if (!window.confirm("حذف هذا التقرير نهائيًا؟")) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("🗑️ Deleted.");
      await buildDaysTree();
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحذف. تأكد من DELETE /api/reports/:id.");
    }
  }

  function exportXLS() {
    const norm = normalizeTable(report?.payload);
    const rows = norm.rows || [];
    const cols = norm.columns || [];
    const esc = (s) => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
      <table border="1">
        <tr><th></th>${cols.map((c,i)=>`<th>${esc(c?.sampleId ?? c?.no ?? i+1)}</th>`).join("")}</tr>
        ${rows.map(r=>`<tr><td>${esc(r.label)}</td>${cols.map(c=>`<td>${esc(c?.[r.key])}</td>`).join("")}</tr>`).join("")}
      </table>
      </body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const d    = pickEntryDate(ensureObject(report?.payload) || {}) || date || todayDubai();
    a.href = url; a.download = `FTR2_MAMZAR_${d}.xls`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  }

  /* ===== العرض ===== */
  const norm = normalizeTable(report?.payload);
  const rows = norm.rows;
  const columns = editMode ? editCols : norm.columns;

  // 🆕 sign-off values
  const sign = getSignoff(ensureObject(report?.payload) || {});

  return (
    <div>
      {/* === ترويسة بنمط الصورة === */}
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
        {/* الشريط الجانبي (سنة ← شهر ← يوم) */}
        <aside style={side}>
          <div style={sideTop}>
            <h4 style={sideTitle}>🗓️ All Available Reports</h4>
            <button style={refreshBtn} onClick={buildDaysTree}>↻ Refresh</button>
          </div>
          {!ymdTree.length && (
            <div style={{ fontSize: 12, color: COLORS.sub }}>
              {loading ? "Loading…" : (error || "لا توجد تقارير.")}
            </div>
          )}

          <div>
            {ymdTree.map((y) => (
              <div key={y.year}>
                <div style={yearHdr}>📅 {y.year}</div>
                {y.months.map((m) => (
                  <div key={`${y.year}-${m.month}`} style={{ marginLeft: 8 }}>
                    <div style={monthHdr}>🗓️ {y.year}-{m.month}</div>
                    {m.days.map((dObj) => {
                      const activeDay = dObj.date === (pickEntryDate(ensureObject(report?.payload) || {}) || date);
                      return (
                        <div key={dObj.date} style={dayBox(activeDay)}>
                          <div style={dateHeader}>
                            <span>{dObj.date}</span>
                            <span style={{ opacity:.7, fontWeight:700 }}>×{dObj.items.length}</span>
                          </div>
                          {dObj.items.map((it) => {
                            const tm = (it?.createdAt || "").slice(11,16);
                            const isActive = (it.id||it._id) === (report?.id||report?._id);
                            const label = tm || `ID…${String(it?.id||it?._id||"").slice(-4)}`;
                            return (
                              <button
                                key={it.id||it._id}
                                style={{
                                  ...timeBtn,
                                  border: isActive ? `1px solid ${COLORS.primary}` : timeBtn.border,
                                  background: isActive ? "#eef2ff" : "#fff"
                                }}
                                onClick={() => openItem(it)}
                                title={`Open ${dObj.date} ${tm || ""}`}
                              >
                                {label}
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
          </div>
        </aside>

        {/* مساحة العرض الرئيسية */}
        <div style={card}>
          <h3 style={title}>FTR 2 • Mamzar — Viewer</h3>
          <p style={sub}>
            {caption} | Branch: <strong>{norm.branchCode}</strong> | Site: <strong>{norm.header.site}</strong>
          </p>

          <div style={toolbar}>
            <button onClick={exportXLS} style={btn("#ecfdf5", "#065f46", "#a7f3d0")}>⬇️ Export XLS</button>
            {!editMode && <button onClick={enterEdit}  style={btn("#fff7ed", "#7c2d12", "#fed7aa")}>✏️ Edit</button>}
            {editMode && (
              <>
                <button onClick={saveEdit}   style={btn("#eefdf3", "#065f46", "#a7f3d0")}>💾 Save</button>
                <button onClick={cancelEdit} style={btn("#fef2f2", "#7f1d1d", "#fecaca")}>✖ Cancel</button>
              </>
            )}
            <button onClick={deleteReport} style={btn("#fef2f2", "#7f1d1d", "#fecaca")}>🗑️ Delete</button>
            {loading && <span style={{ fontWeight: 800, color: COLORS.ink }}>Loading…</span>}
            {!!error && <span style={{ color: COLORS.danger, fontWeight: 900 }}>{error}</span>}
          </div>

          {/* الجدول */}
          <div style={tableShell}>
            <table style={grid}>
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
                            <input type="number" value={v} onChange={(e) => setCell(i, r.key, e.target.value)} style={baseInput} />
                          ) : r.key.toLowerCase().includes("date") ? (
                            <input type="date" value={v} onChange={(e) => setCell(i, r.key, e.target.value)} style={baseInput} />
                          ) : ["labelling","appearance","color","brokenDamage","badSmell","overallCondition"].includes(r.key) ? (
                            <select value={v} onChange={(e) => setCell(i, r.key, e.target.value)} style={baseInput}>
                              <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                            </select>
                          ) : (
                            <input value={v} onChange={(e) => setCell(i, r.key, e.target.value)} style={baseInput} />
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

          {/* ===== عرض الصور (2 لكل عيّنة) + Preview/Download ===== */}
          <div style={photosWrap}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Attached images (if any) — 2 per sample</div>
            <div style={photosGrid}>
              {columns.map((c, i) => {
                const p1 = c?.photo1Base64 || c?.photo1 || "";
                const p2 = c?.photo2Base64 || c?.photo2 || "";
                if (!p1 && !p2) return null;
                const sampleName = c?.productName || `Sample ${c?.sampleId ?? c?.no ?? i+1}`;
                return (
                  <div key={`ph-${i}`} style={photoCard}>
                    <div style={photoTitle}>{sampleName}</div>

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
                        style={{ ...preview, marginLeft: 8 }}
                        onClick={() => openPreview(p2, `${sampleName} — 2 of 2`)}
                        title="Click to preview & download"
                      />
                    )}
                  </div>
                );
              })}
            </div>
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
              <img alt={viewer.name || ""} src={viewer.src} style={fullImg} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
