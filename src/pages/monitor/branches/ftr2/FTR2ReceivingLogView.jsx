// src/pages/monitor/branches/ftr2/FTR2ReceivingLogView.jsx
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { resilientFetch, classifyError } from "../_shared/resilientFetch";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ===== Admin PIN ===== */
const ADMIN_PIN = "9999";
function checkPin() {
  const pin = window.prompt("Enter PIN to proceed:");
  if (pin === ADMIN_PIN) return true;
  alert("❌ Wrong PIN.");
  return false;
}

/* ================== Columns ================== */
const COLS = [
  { key: "supplier",         label: "Name of the Supplier",                                                           align: "left"   },
  { key: "foodItem",         label: "Food Item",                                                                       align: "left"   },
  { key: "dmApprovalNo",    label: "DM approval number of the delivery vehicle",                                      align: "left"   },
  { key: "vehicleTemp",     label: "Vehicle Temp (°C)",                                                                align: "center" },
  { key: "foodTemp",        label: "Food Temp (°C)",                                                                   align: "center" },
  { key: "vehicleClean",    label: "Vehicle clean",                                                                    align: "center" },
  { key: "handlerHygiene",  label: "Food handler hygiene",                                                             align: "center" },
  { key: "appearanceOK",    label: "Appearance",                                                                       align: "center" },
  { key: "smellOK",         label: "Smell",                                                                            align: "center" },
  { key: "packagingGood",   label: "Packaging of food is good and undamaged, clean and no signs of pest infestation", align: "left"   },
  { key: "countryOfOrigin", label: "Country of origin",                                                               align: "center" },
  { key: "productionDate",  label: "Production Date",                                                                 align: "center" },
  { key: "expiryDate",      label: "Expiry Date",                                                                     align: "center" },
  { key: "remarks",         label: "Remarks (if any)",                                                                align: "left"   },
  { key: "receivedBy",      label: "Received by",                                                                     align: "center" },
];

const COL_WIDTHS_PX    = [64,160,140,240,110,110,130,160,130,110,300,140,140,140,260,160];
const TABLE_BASE_WIDTH = COL_WIDTHS_PX.reduce((a, b) => a + b, 0);
const MIN_SCALE        = 0.5;

const GRID_COLOR    = "#9aa3b2";
const HEADER_BG     = "#eaf1fb";
const HEADER_BORDER = "#7f93ad";
const CELL_BG_ODD   = "#ffffff";
const CELL_BG_EVEN  = "#f9fbff";

export default function FTR2ReceivingLogView() {
  const [reportList,     setReportList]     = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);

  const [loadingList,   setLoadingList]   = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [busy,          setBusy]          = useState(false);

  // ✅ Non-blocking error state (replaces alerts)
  const [fetchError, setFetchError] = useState(null); // { message, retry }
  const [retryMsg,   setRetryMsg]   = useState("");

  const [scale,        setScale]        = useState(1);
  const [contentH,     setContentH]     = useState(0);
  const [measureReady, setMeasureReady] = useState(false);

  const viewportRef  = useRef(null);
  const scaleBoxRef  = useRef(null);
  const reportRef    = useRef(null);
  const tableRef     = useRef(null);
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft,     setDraft]     = useState(null);

  const [preview, setPreview] = useState({ open: false, images: [], index: 0 });
  const openPreview  = useCallback((imgs, idx = 0) => { const f = (imgs||[]).filter(Boolean); if (f.length) setPreview({ open: true, images: f, index: idx }); }, []);
  const closePreview = useCallback(() => setPreview(p => ({ ...p, open: false })), []);
  const prevImage    = useCallback(() => setPreview(p => ({ ...p, index: (p.index - 1 + p.images.length) % p.images.length })), []);
  const nextImage    = useCallback(() => setPreview(p => ({ ...p, index: (p.index + 1) % p.images.length })), []);

  useEffect(() => {
    const h = (e) => {
      if (!preview.open) return;
      if (e.key === "Escape")     closePreview();
      if (e.key === "ArrowLeft")  prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [preview.open, closePreview, prevImage, nextImage]);

  /* ===== Auto-Scale ===== */
  useLayoutEffect(() => {
    let r1, r2;
    const measure = () => {
      const vp = viewportRef.current, box = scaleBoxRef.current;
      if (!vp || !box) return;
      const h = box.firstChild?.scrollHeight || 0;
      if (h > 0) { setContentH(h); setMeasureReady(true); }
      const s = Math.min(1, Math.max(MIN_SCALE, (vp.clientWidth - 2) / TABLE_BASE_WIDTH));
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };
    r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(measure); });
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    if (viewportRef.current)             ro.observe(viewportRef.current);
    if (scaleBoxRef.current?.firstChild) ro.observe(scaleBoxRef.current.firstChild);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); ro.disconnect(); };
  }, [selectedReport, isEditing]);

  /* ===== Helpers ===== */
  const getId = (r) => { const c = r?.id ?? r?._id ?? r?.payload?._id; return c == null ? null : String(c); };

  const getReportDate = (r) => {
    const v = r?.reportDate || r?.payload?.reportDate || r?.created_at || r?.createdAt;
    const d = new Date(v);
    return isNaN(d) ? new Date(0) : d;
  };

  /* ===== 1) جلب القائمة الخفيفة + تحميل آخر تقرير تلقائياً ===== */
  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    setLoadingList(true);
    setFetchError(null);
    setRetryMsg("");

    const primaryUrl  = `${API_BASE}/api/reports?type=ftr2_receiving_log_butchery&lite=1&limit=500`;
    const fallbackUrl = `${API_BASE}/api/reports?type=ftr2_receiving_log_butchery`;

    try {
      const res = await resilientFetch(
        primaryUrl,
        { cache: "no-store" },
        {
          retries: 3,
          initialDelay: 1500,
          maxDelay: 8000,
          timeout: 35000,
          fallbackUrl,
          onAttempt: (attempt, err) => {
            if (err) {
              setRetryMsg(`⏳ Attempt ${attempt} failed, retrying…`);
            } else if (attempt > 1) {
              setRetryMsg(`⏳ Retrying (${attempt})…`);
            } else {
              setRetryMsg("");
            }
          },
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const arr  = Array.isArray(json) ? json : json?.data ?? [];
      arr.sort((a, b) => getReportDate(b) - getReportDate(a));
      setReportList(arr);
      setRetryMsg("");

      // ✅ تحميل آخر تقرير تلقائياً
      if (arr.length > 0) {
        await fetchFullReport(arr[0]);
      }
    } catch (e) {
      console.error("[FTR2 Receiving] fetchList failed:", e);
      const info = classifyError(e);
      setFetchError({
        type: info.type,
        message: info.label,
        messageAr: info.labelAr,
      });
    } finally {
      setLoadingList(false);
      setRetryMsg("");
    }
  }

  /* ===== 2) جلب تقرير واحد كامل بالضغط ===== */
  async function fetchFullReport(liteRow) {
    const id = getId(liteRow);
    if (!id) return;
    setLoadingReport(true);
    setSelectedReport(null);
    setIsEditing(false);
    setDraft(null);
    try {
      const res = await resilientFetch(
        `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
        { cache: "no-store" },
        { retries: 3, initialDelay: 1000, timeout: 25000 }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setSelectedReport(json?.report ?? json);
    } catch (e) {
      console.error("[FTR2 Receiving] fetchFullReport failed:", e);
      const info = classifyError(e);
      setFetchError({ type: info.type, message: info.label, messageAr: info.labelAr });
    } finally {
      setLoadingReport(false);
    }
  }

  /* ===== Export PDF ===== */
  const handleExportPDF = async () => {
    if (!reportRef.current || !scaleBoxRef.current) return;
    const box  = scaleBoxRef.current;
    const prev = { transform: box.style.transform, position: box.style.position, width: box.style.width, height: box.style.height };
    box.style.transform = "none"; box.style.position = "static"; box.style.width = "auto"; box.style.height = "auto";
    const canvas = await html2canvas(reportRef.current, { scale: 2, windowWidth: reportRef.current.scrollWidth, windowHeight: reportRef.current.scrollHeight });
    Object.assign(box.style, prev);
    const pdf       = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setFontSize(18); pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI", pageWidth / 2, 30, { align: "center" });
    const iw = pageWidth - 40;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 20, 50, iw, (canvas.height * iw) / canvas.width);
    pdf.save(`FTR2_Receiving_Log_${selectedReport?.payload?.reportDate || "report"}.pdf`);
  };

  /* ===== Delete ===== */
  const handleDelete = async (report) => {
    if (busy || !checkPin()) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing ID.");
    try {
      setBusy(true);
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text().catch(() => ""));
      alert("✅ Deleted.");
      setSelectedReport(null);
      await fetchList();
    } catch (err) { console.error(err); alert("⚠️ Delete failed."); }
    finally { setBusy(false); }
  };

  /* ===== Edit / Save ===== */
  const startEdit = () => {
    if (!checkPin()) return;
    const base = structuredClone(selectedReport?.payload || {});
    if (!Array.isArray(base.entries)) base.entries = [];
    if (!base.branch)     base.branch     = "FTR 2";
    if (!base.reportDate) base.reportDate = new Date().toISOString().slice(0, 10);
    setDraft(base); setIsEditing(true);
  };
  const cancelEdit = () => { setIsEditing(false); setDraft(null); };

  const saveEdit = async () => {
    if (busy || !draft) return;
    const norm = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
    draft.entries = (Array.isArray(draft.entries) ? draft.entries : [])
      .map(r => (r && typeof r === "object" ? r : {}))
      .filter(r => Object.values(r).some(v => v !== "" && v != null));
    draft.reportDate = norm(draft.reportDate);
    draft.entries    = draft.entries.map(r => ({ ...r, productionDate: norm(r.productionDate), expiryDate: norm(r.expiryDate) }));

    const readTxt = async (r) => { try { return await r.text(); } catch { return ""; } };
    const oldId   = getId(selectedReport);
    const oldPay  = structuredClone(selectedReport?.payload || null);

    try {
      setBusy(true);
      if (oldId) {
        const del = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(oldId)}`, { method: "DELETE" });
        if (!del.ok) throw new Error(await readTxt(del) || "Delete failed.");
      }
      const post = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ftr2_receiving_log_butchery", payload: draft }),
      });
      if (!post.ok) {
        const msg = await readTxt(post);
        if (oldPay) await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ftr2_receiving_log_butchery", payload: oldPay }) });
        throw new Error(msg || "Save failed");
      }
      const saved = await post.json();
      alert("✅ Saved.");
      setIsEditing(false); setDraft(null);
      await fetchList();
      const newId = saved?.report?.id;
      if (newId) await fetchFullReport({ id: newId });
    } catch (e) { console.error(e); alert("❌ Save failed.\n" + (e?.message || "")); }
    finally { setBusy(false); }
  };

  const updateDraftEntry = (i, key, val) =>
    setDraft(d => { const entries = [...(Array.isArray(d?.entries) ? d.entries : [])]; entries[i] = { ...(entries[i] || {}), [key]: val }; return { ...d, entries }; });
  const updateDraftMeta  = (key, val) => setDraft(d => ({ ...(d || {}), [key]: val }));

  /* ===== Export / Import JSON ===== */
  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify({ type: "ftr2_receiving_log_butchery", exportedAt: new Date().toISOString(), count: reportList.length, items: reportList.map(r => r?.payload ?? r) }, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href = url; a.download = `FTR2_Receiving_Log_ALL_${new Date().toISOString().replace(/[:.]/g,"-")}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (err) { console.error(err); alert("❌ Export failed."); }
  };

  const triggerImport    = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setLoadingList(true);
      const json  = JSON.parse(await file.text());
      const items = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : Array.isArray(json?.data) ? json.data : [];
      if (!items.length) { alert("⚠️ No items."); return; }
      let ok = 0, fail = 0;
      for (const item of items) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") { fail++; continue; }
        try { const r = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "ftr2_receiving_log_butchery", payload }) }); if (r.ok) ok++; else fail++; }
        catch { fail++; }
      }
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await fetchList();
    } catch (err) { console.error(err); alert("❌ Invalid JSON."); }
    finally { setLoadingList(false); if (e?.target) e.target.value = ""; }
  };

  /* ===== Grouping ===== */
  const groupedReports = useMemo(() =>
    reportList.reduce((acc, r) => {
      const d = getReportDate(r); if (isNaN(d)) return acc;
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0");
      if (!acc[y]) acc[y] = {}; if (!acc[y][m]) acc[y][m] = [];
      acc[y][m].push({ ...r, _dt: d.getTime() });
      return acc;
    }, {}),
  [reportList]);

  /* ===== Styles ===== */
  const shell    = { display: "flex", gap: "1rem" };
  const sidebar  = { minWidth: 260, background: "#fbfbfc", padding: "1rem", borderRadius: 12, boxShadow: "0 4px 14px rgba(0,0,0,0.06)", border: "1px solid #eef0f4", height: "fit-content" };
  const main     = { flex: 1, minWidth: 0, background: "linear-gradient(120deg,#f7f9fc 60%,#efe7f9 100%)", padding: "1.25rem", borderRadius: 14, boxShadow: "0 6px 22px rgba(95,61,196,0.12)", border: "1px solid #ececf5", overflowX: "auto", fontSize: 16 };
  const hCell    = { border: `1.4px solid ${GRID_COLOR}`, padding: "10px 12px", fontSize: 16, background: HEADER_BG, fontWeight: 700, color: "#1e293b" };
  const baseCell = { padding: "10px 12px", border: `1.2px solid ${GRID_COLOR}`, verticalAlign: "middle", fontSize: 16, lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "normal", background: "#fff" };
  const thStyle  = { ...baseCell, background: HEADER_BG, color: "#0f172a", fontWeight: 800, border: `1.5px solid ${HEADER_BORDER}`, position: "sticky", top: 0, zIndex: 1, textAlign: "center" };

  const renderValue = (val, key) => {
    if (!val && val !== 0) return "—";
    if (key === "productionDate" || key === "expiryDate") { try { const d = new Date(val); if (!isNaN(d)) return d.toLocaleDateString("en-CA"); } catch {} }
    return String(val);
  };

  const getRowImages = (row) => {
    const raw = row?.images || row?.photos || row?.Photos || row?.photosBase64 || row?.imagesBase64 || [];
    return (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);
  };

  const viewBtnStyle = { marginLeft: 8, padding: "4px 8px", borderRadius: 6, border: "1px solid #94a3b8", background: "#fff", color: "#0f172a", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" };

  const EditableCell = ({ value, onChange, type = "text", align = "center" }) => {
    const s = { width: "100%", boxSizing: "border-box", padding: "6px 8px", borderRadius: 6, border: "1px solid #cfd6e6", fontSize: "0.92rem", textAlign: align, background: "#fff" };
    if (type === "date") return <input type="date" value={value ? new Date(value).toISOString().slice(0,10) : ""} onChange={e => onChange(e.target.value)} style={s} />;
    return <input type="text" value={value ?? ""} onChange={e => onChange(e.target.value)} style={s} />;
  };

  const asDate = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

  const Btn = ({ label, onClick, color, disabled }) => (
    <button onClick={onClick} disabled={disabled}
      style={{ padding: "8px 14px", borderRadius: 8, background: disabled ? "#d1d5db" : color, color: "#fff", fontWeight: 700, border: "none", cursor: disabled ? "not-allowed" : "pointer" }}>
      {label}
    </button>
  );

  return (
    <div style={shell}>

      {/* ===== Sidebar ===== */}
      <div style={sidebar}>
        <h4 style={{ marginBottom: "1rem", color: "#5b21b6", textAlign: "center" }}>🗓️ Saved Reports</h4>

        {/* ── Non-blocking error banner ── */}
        {fetchError && (
          <div style={{
            padding: "10px 12px",
            marginBottom: 12,
            borderRadius: 10,
            background: fetchError.type === "network" ? "#fffbeb" : "#fef2f2",
            border: `1px solid ${fetchError.type === "network" ? "#fde68a" : "#fecaca"}`,
            color: fetchError.type === "network" ? "#92400e" : "#991b1b",
            fontSize: 12,
            lineHeight: 1.5,
          }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>
              {fetchError.type === "network" ? "⚠️ اتصال متقطع" : "⚠️ خطأ في السيرفر"}
            </div>
            <div style={{ marginBottom: 8 }}>{fetchError.messageAr || fetchError.message}</div>
            <button
              onClick={fetchList}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: 6,
                border: "none",
                background: "#5b21b6",
                color: "#fff",
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              🔄 إعادة المحاولة
            </button>
            <div style={{ marginTop: 6, fontSize: 10, color: "#64748b", fontStyle: "italic" }}>
              السيرفر المجاني قد يحتاج ~30 ثانية ليستيقظ
            </div>
          </div>
        )}

        {/* ── Retry progress indicator ── */}
        {retryMsg && (
          <div style={{
            padding: "8px 12px",
            marginBottom: 10,
            borderRadius: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: 12,
            fontWeight: 700,
            textAlign: "center",
          }}>
            {retryMsg}
          </div>
        )}

        {loadingList ? <p>⏳ Loading list…</p>
          : Object.keys(groupedReports).length === 0 ? (
            fetchError ? null : <p>❌ No reports</p>
          )
          : Object.entries(groupedReports)
              .sort(([a],[b]) => Number(b)-Number(a))
              .map(([year, months]) => (
                // ✅ بدون open — الشجرة مغلقة افتراضياً
                <details key={year}>
                  <summary style={{ fontWeight: 700, marginBottom: 6, cursor: "pointer" }}>📅 {year}</summary>
                  {Object.entries(months)
                    .sort(([a],[b]) => Number(b)-Number(a))
                    .map(([month, days]) => (
                      <details key={month} style={{ marginLeft: "1rem" }}>
                        <summary style={{ fontWeight: 600, cursor: "pointer" }}>📅 {year}/{month}</summary>
                        <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                          {[...days].sort((a,b) => b._dt-a._dt).map((r, i) => {
                            const isActive = getId(selectedReport) && getId(selectedReport) === getId(r);
                            const d = getReportDate(r);
                            const label = `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
                            return (
                              <li key={i} onClick={() => fetchFullReport(r)}
                                style={{ padding: "6px 10px", marginBottom: 4, borderRadius: 8, cursor: loadingReport ? "wait" : "pointer", background: isActive ? "#5b21b6" : "#eef1f7", color: isActive ? "#fff" : "#263042", fontWeight: 700, textAlign: "center" }}>
                                {label}
                              </li>
                            );
                          })}
                        </ul>
                      </details>
                    ))}
                </details>
              ))
        }
      </div>

      {/* ===== Main ===== */}
      <div style={main}>
        {loadingReport ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#5b21b6", fontSize: 18, fontWeight: 700 }}>
            ⏳ Loading report...
          </div>
        ) : !selectedReport ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#94a3b8", fontSize: 16 }}>
            👈 Select a date from the list to load the report
          </div>
        ) : (
          <>
            {/* Actions */}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              {!isEditing ? (
                <>
                  <Btn label="✏ Edit"        onClick={startEdit}                          color="#2563eb" disabled={busy} />
                  <Btn label="⬇ Export PDF"  onClick={handleExportPDF}                    color="#10b981" disabled={busy} />
                  <Btn label="⬇ Export JSON" onClick={handleExportJSON}                   color="#059669" disabled={busy} />
                  <Btn label="⬆ Import JSON" onClick={triggerImport}                      color="#f59e0b" disabled={busy} />
                  <Btn label="🗑 Delete"      onClick={() => handleDelete(selectedReport)} color="#ef4444" disabled={busy} />
                </>
              ) : (
                <>
                  <Btn label="💾 Save"   onClick={saveEdit}   color="#16a34a" disabled={busy} />
                  <Btn label="↩ Cancel" onClick={cancelEdit} color="#6b7280" disabled={busy} />
                </>
              )}
              <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleImportJSON} />
            </div>

            {/* Auto-Scale */}
            <div ref={viewportRef} style={{ width: "100%", position: "relative", overflowX: "auto", overflowY: "hidden", height: measureReady && contentH ? contentH * scale : "auto", minHeight: 120 }}>
              <div ref={scaleBoxRef}
                style={measureReady
                  ? { position: "absolute", left: 0, top: 0, width: TABLE_BASE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }
                  : { position: "static", width: "100%" }}>
                <div ref={reportRef}>

                  {/* Header */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
                    <tbody>
                      <tr>
                        <td style={hCell}><strong>Document Title:</strong> Receiving Log (Food Truck – FTR 2)</td>
                        <td style={hCell}><strong>Document No:</strong> TELT/QC/RECLOG/01</td>
                      </tr>
                      <tr>
                        <td style={hCell}><strong>Issue Date:</strong> 05/02/2020</td>
                        <td style={hCell}><strong>Revision No:</strong> 0</td>
                      </tr>
                      <tr>
                        <td style={hCell}><strong>Area:</strong> QA</td>
                        <td style={hCell}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</td>
                      </tr>
                      <tr>
                        <td style={hCell}><strong>Controlling Officer:</strong> Quality Controller</td>
                        <td style={hCell}><strong>Approved By:</strong> Hussam.O.Sarhan</td>
                      </tr>
                    </tbody>
                  </table>

                  <h3 style={{ textAlign: "center", background: "#eef1f7", padding: "8px 10px", margin: "0 0 8px", border: "1px solid #e1e5ee", borderRadius: 8 }}>
                    AL MAWASHI BRAAI MAMZAR<br />RECEIVING LOG – FOOD TRUCK (FTR-2)
                  </h3>

                  {/* Date / Invoice */}
                  <div style={{ marginBottom: 10, display: "flex", gap: 24, fontWeight: 700, color: "#263042", flexWrap: "wrap" }}>
                    <div>
                      <strong>Date:</strong>{" "}
                      {!isEditing ? selectedReport?.payload?.reportDate || "—"
                        : <input type="date" value={asDate(draft?.reportDate)} onChange={e => updateDraftMeta("reportDate", e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cfd6e6", fontSize: "0.92rem" }} />}
                    </div>
                    <div>
                      <strong>Invoice No:</strong>{" "}
                      {!isEditing ? selectedReport?.payload?.invoiceNo || "—"
                        : <input type="text" value={draft?.invoiceNo ?? ""} onChange={e => updateDraftMeta("invoiceNo", e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cfd6e6", fontSize: "0.92rem", minWidth: 160 }} />}
                    </div>
                  </div>

                  <div style={{ margin: "6px 0 12px", fontSize: "0.92rem", color: "#374151" }}>
                    LEGEND: <strong>C</strong> – Compliant / <strong>NC</strong> – Non-Compliant
                  </div>

                  {/* Table */}
                  <table ref={tableRef} style={{ borderCollapse: "collapse", tableLayout: "fixed", width: TABLE_BASE_WIDTH, border: `1.6px solid ${GRID_COLOR}`, background: "#fff" }}>
                    <colgroup>{COL_WIDTHS_PX.map((w,i) => <col key={i} style={{ width: `${w}px` }} />)}</colgroup>
                    <thead>
                      <tr>
                        <th style={thStyle}>S.No</th>
                        {COLS.map((c,i) => <th key={i} style={thStyle}>{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {((isEditing ? draft?.entries : selectedReport?.payload?.entries) || []).map((row, i) => (
                        <tr key={i}
                          style={{ background: i%2 ? CELL_BG_EVEN : CELL_BG_ODD, transition: "background 120ms" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "#eef4ff")}
                          onMouseLeave={e => (e.currentTarget.style.background = i%2 ? CELL_BG_EVEN : CELL_BG_ODD)}>
                          <td style={{ ...baseCell, textAlign: "center", fontWeight: 700, position: "sticky", left: 0, background: "inherit" }}>{i+1}</td>
                          {COLS.map(c => {
                            const val  = row?.[c.key];
                            const type = c.key === "productionDate" || c.key === "expiryDate" ? "date" : "text";
                            const imgs = getRowImages(row);
                            return (
                              <td key={c.key} style={{ ...baseCell, textAlign: c.align||"center" }}>
                                {!isEditing ? (
                                  <>
                                    {renderValue(val, c.key)}
                                    {c.key === "foodItem" && imgs.length > 0 && (
                                      <button type="button" style={viewBtnStyle} onClick={() => openPreview(imgs, 0)}>View</button>
                                    )}
                                  </>
                                ) : (
                                  <EditableCell value={val} type={type} align={c.align||"center"} onChange={v => updateDraftEntry(i, c.key, v)} />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 8, fontSize: "0.9rem", color: "#374151" }}>*(C – Compliant &nbsp;&nbsp; NC – Non-Compliant)</div>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontWeight: 700, color: "#263042", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      Checked By:{" "}
                      {!isEditing ? selectedReport?.payload?.checkedBy || "—"
                        : <input type="text" value={draft?.checkedBy ?? ""} onChange={e => updateDraftMeta("checkedBy", e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cfd6e6", fontSize: "0.92rem", minWidth: 180 }} />}
                    </div>
                    <div>
                      Verified By:{" "}
                      {!isEditing ? selectedReport?.payload?.verifiedBy || "—"
                        : <input type="text" value={draft?.verifiedBy ?? ""} onChange={e => updateDraftMeta("verifiedBy", e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #cfd6e6", fontSize: "0.92rem", minWidth: 180 }} />}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Preview Modal */}
      {preview.open && (
        <div onClick={e => { if (e.target === e.currentTarget) closePreview(); }}
          style={{ position: "fixed", inset: 0, background: "rgba(16,18,27,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 9999 }}>
          <div style={{ position: "relative", maxWidth: "92vw", maxHeight: "90vh", background: "#0b1020", border: "1px solid #1f2a44", borderRadius: 12, boxShadow: "0 12px 40px rgba(0,0,0,0.45)", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "#d1d5db", fontWeight: 800 }}>{preview.index+1} / {preview.images.length}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <a href={preview.images[preview.index]} download={`FTR2_Image_${preview.index+1}.jpg`} style={{ textDecoration: "none", padding: "8px 12px", borderRadius: 8, background: "#10b981", color: "#fff", fontWeight: 800 }}>⬇ Download</a>
                <button onClick={closePreview} style={{ padding: "8px 12px", borderRadius: 8, background: "#ef4444", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer" }}>✕ Close</button>
              </div>
            </div>
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 10, background: "#0f172a" }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img src={preview.images[preview.index]} style={{ maxWidth: "100%", maxHeight: "84vh", objectFit: "contain", display: "block", userSelect: "none" }} />
              {preview.images.length > 1 && (
                <>
                  <button onClick={prevImage} style={navBtn("left")}>‹</button>
                  <button onClick={nextImage} style={navBtn("right")}>›</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function navBtn(side) {
  return { position: "absolute", top: "50%", transform: "translateY(-50%)", [side]: 10, width: 44, height: 44, borderRadius: "9999px", border: "none", cursor: "pointer", background: "rgba(255,255,255,0.95)", color: "#0f172a", fontSize: 28, fontWeight: 900, lineHeight: "44px", textAlign: "center", boxShadow: "0 6px 16px rgba(0,0,0,0.25)" };
}