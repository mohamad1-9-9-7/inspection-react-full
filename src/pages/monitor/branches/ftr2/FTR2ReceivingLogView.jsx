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
  { key: "supplier", label: "Name of the Supplier", align: "left" },
  { key: "foodItem", label: "Food Item", align: "left" },
  { key: "dmApprovalNo", label: "DM approval number of the delivery vehicle", align: "left" },
  { key: "vehicleTemp", label: "Vehicle Temp (°C)", align: "center" },
  { key: "foodTemp", label: "Food Temp (°C)", align: "center" },
  { key: "vehicleClean", label: "Vehicle clean", align: "center" },
  { key: "handlerHygiene", label: "Food handler hygiene", align: "center" },
  { key: "appearanceOK", label: "Appearance", align: "center" },
  { key: "smellOK", label: "Smell", align: "center" },
  {
    key: "packagingGood",
    label:
      "Packaging of food is good and undamaged, clean and no signs of pest infestation",
    align: "left",
  },
  { key: "countryOfOrigin", label: "Country of origin", align: "center" },
  { key: "productionDate", label: "Production Date", align: "center" },
  { key: "expiryDate", label: "Expiry Date", align: "center" },
  { key: "remarks", label: "Remarks (if any)", align: "left" },
  { key: "receivedBy", label: "Received by", align: "center" },
];

/* أبعاد الأعمدة الأساسية (قبل التحجيم) — أول خانة لـ S.No */
const COL_WIDTHS_PX = [
  64, 160, 140, 240, 110, 110, 130, 160, 130, 110, 300, 140, 140, 140, 260, 160,
];
const TABLE_BASE_WIDTH = COL_WIDTHS_PX.reduce((a, b) => a + b, 0);
const MIN_SCALE = 0.75;

/* ألوان/ثوابت نمط إكسل */
const GRID_COLOR   = "#9aa3b2";   // حدود الشبكة
const HEADER_BG    = "#eaf1fb";   // خلفية العناوين
const HEADER_BORDER= "#7f93ad";   // حدود العناوين
const CELL_BG_ODD  = "#ffffff";   // صف فردي
const CELL_BG_EVEN = "#f9fbff";   // صف زوجي

export default function FTR2ReceivingLogView() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  // لمنع نقرات مزدوجة أثناء الحذف/الحفظ
  const [busy, setBusy] = useState(false);

  // ===== Auto-Scale (بدون تمرير أفقي) =====
  const [scale, setScale] = useState(1);
  const [contentH, setContentH] = useState(0);
  const [measureReady, setMeasureReady] = useState(false);

  const viewportRef = useRef(null);
  const scaleBoxRef = useRef(null);
  const reportRef = useRef(null);
  const tableRef = useRef(null);
  const fileInputRef = useRef(null);

  // ===== Edit mode =====
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  // ===== Preview للصور =====
  const [preview, setPreview] = useState({ open: false, images: [], index: 0 });
  const openPreview = useCallback((images, index = 0) => {
    const imgs = (images || []).filter(Boolean);
    if (!imgs.length) return;
    setPreview({ open: true, images: imgs, index });
  }, []);
  const closePreview = useCallback(
    () => setPreview((p) => ({ ...p, open: false })),
    []
  );
  const prevImage = useCallback(
    () =>
      setPreview((p) => ({
        ...p,
        index: (p.index - 1 + p.images.length) % p.images.length,
      })),
    []
  );
  const nextImage = useCallback(
    () => setPreview((p) => ({ ...p, index: (p.index + 1) % p.images.length })),
    []
  );
  useEffect(() => {
    const onKey = (e) => {
      if (!preview.open) return;
      if (e.key === "Escape") closePreview();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview.open, closePreview, prevImage, nextImage]);

  // ===== قياس الارتفاع/العرض وتطبيق التحجيم =====
  useLayoutEffect(() => {
    let raf1, raf2;
    const measureAndScale = () => {
      const vp = viewportRef.current;
      const box = scaleBoxRef.current;
      if (!vp || !box) return;

      const inner = box.firstChild;
      const naturalHeight = inner ? inner.scrollHeight : 0;
      if (naturalHeight > 0) {
        setContentH(naturalHeight);
        setMeasureReady(true);
      }

      const available = Math.max(0, vp.clientWidth - 2);
      const s = Math.min(1, Math.max(MIN_SCALE, available / TABLE_BASE_WIDTH));
      setScale(Number.isFinite(s) && s > 0 ? s : 1);
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measureAndScale);
    });

    const ro = new ResizeObserver(measureAndScale);
    ro.observe(document.body);
    if (viewportRef.current) ro.observe(viewportRef.current);
    if (scaleBoxRef.current?.firstChild) ro.observe(scaleBoxRef.current.firstChild);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [selectedReport, isEditing]);

  // ===== Fetch =====
  const getId = (r) => {
    const cand = r?._id || r?.payload?._id || r?.id || r?.payload?.id;
    return cand === undefined || cand === null ? null : String(cand);
  };

  const getReportDate = (r) => {
    const d1 = new Date(r?.payload?.reportDate);
    if (!isNaN(d1)) return d1;
    const d2 = new Date(r?.created_at || r?.createdAt);
    return isNaN(d2) ? new Date(0) : d2;
  };

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=ftr2_receiving_log_butchery`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Failed to fetch data");
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      // الأحدث أولاً
      arr.sort((a, b) => getReportDate(b) - getReportDate(a));
      setReports(arr);
      setSelectedReport(arr[0] || null);
      setIsEditing(false);
      setDraft(null);
    } catch (e) {
      console.error(e);
      alert("⚠️ Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  }

  // ===== Export PDF (نوقف التحجيم مؤقتًا) =====
  const handleExportPDF = async () => {
    if (!reportRef.current || !scaleBoxRef.current) return;
    const box = scaleBoxRef.current;
    const prev = {
      transform: box.style.transform,
      position: box.style.position,
      left: box.style.left,
      top: box.style.top,
      width: box.style.width,
      height: box.style.height,
    };

    box.style.transform = "none";
    box.style.position = "static";
    box.style.width = "auto";
    box.style.height = "auto";

    const canvas = await html2canvas(reportRef.current, {
      scale: 2,
      windowWidth: reportRef.current.scrollWidth,
      windowHeight: reportRef.current.scrollHeight,
    });

    box.style.transform = prev.transform;
    box.style.position = prev.position;
    box.style.left = prev.left;
    box.style.top = prev.top;
    box.style.width = prev.width;
    box.style.height = prev.height;

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text("AL MAWASHI", pageWidth / 2, 30, { align: "center" });
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 20, 50, imgWidth, imgHeight);
    const dt = selectedReport?.payload?.reportDate || "report";
    pdf.save(`FTR2_Receiving_Log_${dt}.pdf`);
  };

  // ===== Delete (محمي بالـ PIN) =====
  const handleDelete = async (report) => {
    if (busy) return;
    if (!checkPin()) return;
    if (!window.confirm("Are you sure you want to delete this report?")) return;
    const rid = getId(report);
    if (!rid) return alert("⚠️ Missing report ID.");
    try {
      setBusy(true);
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(rid)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed to delete"));
      alert("✅ Report deleted successfully.");
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert("⚠️ Failed to delete report.");
    } finally {
      setBusy(false);
    }
  };

  // ===== Edit / Save (Edit محمي بالـ PIN) =====
  const startEdit = () => {
    if (!checkPin()) return;
    const base = structuredClone(selectedReport?.payload || {});
    if (!Array.isArray(base.entries)) {
      base.entries = structuredClone(selectedReport?.payload?.entries || []);
    }
    // ضمان وجود الحقول الأساسية
    if (!base.branch) base.branch = "FTR 2";
    if (!base.reportDate) base.reportDate = new Date().toISOString().slice(0, 10);
    setDraft(base);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(null);
  };

  const saveEdit = async () => {
    if (busy) return;
    if (!draft) return;

    // ترتيب الأسطر وحذف الفراغات لتحسين العرض
    draft.entries = Array.isArray(draft.entries)
      ? draft.entries
          .map((r) => (r && typeof r === "object" ? r : {}))
          .filter((r) => Object.values(r).some((v) => v !== "" && v != null))
      : [];

    // حفظ بصيغة موحّدة للتواريخ
    const normDate = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
    draft.reportDate = normDate(draft.reportDate);
    draft.entries = draft.entries.map((r) => ({
      ...r,
      productionDate: normDate(r.productionDate),
      expiryDate: normDate(r.expiryDate),
    }));

    const body = { type: "ftr2_receiving_log_butchery", payload: draft };

    const readTxt = async (res) => {
      try {
        return await res.text();
      } catch {
        return "";
      }
    };

    const oldId = getId(selectedReport);
    const oldPayload = structuredClone(selectedReport?.payload || null);

    try {
      setBusy(true);

      // حذف القديم لتفادي قيود uniqueness المحتملة
      if (oldId) {
        const del = await fetch(
          `${API_BASE}/api/reports/${encodeURIComponent(oldId)}`,
          { method: "DELETE" }
        );
        if (!del.ok) {
          const msg = await readTxt(del);
          throw new Error(msg || "Failed to delete old report before saving.");
        }
      }

      // إنشاء الجديد
      const post = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!post.ok) {
        const msg = await readTxt(post);
        // محاولة تراجع: إعادة القديم إن وجد
        if (oldPayload) {
          try {
            const rollback = await fetch(`${API_BASE}/api/reports`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "ftr2_receiving_log_butchery", payload: oldPayload }),
            });
            if (!rollback.ok) {
              const rbMsg = await readTxt(rollback);
              throw new Error(`Save failed (${msg}). Rollback also failed: ${rbMsg}`);
            }
          } catch (rbErr) {
            throw rbErr;
          }
        }
        throw new Error(msg || "Save failed");
      }

      alert("✅ Saved successfully.");
      setIsEditing(false);
      setDraft(null);

      // إعادة الجلب مع ضمان اختيار آخر تقرير (الأحدث)
      await fetchReports();
    } catch (e) {
      console.error(e);
      alert("❌ Failed to save changes.\n" + (e?.message || ""));
    } finally {
      setBusy(false);
    }
  };

  // تحديث صفوف الجدول أثناء التحرير
  const updateDraftEntry = (rowIdx, key, value) => {
    setDraft((d) => {
      const entries = Array.isArray(d?.entries) ? [...d.entries] : [];
      const row = { ...(entries[rowIdx] || {}) };
      row[key] = value;
      entries[rowIdx] = row;
      return { ...d, entries };
    });
  };

  // تحديث الحقول العلوية (التاريخ/الإنفويس/المحقَّق/المُدقَّق)
  const updateDraftMeta = (key, value) =>
    setDraft((d) => ({ ...(d || {}), [key]: value }));

  // ===== Export/Import JSON =====
  const handleExportJSON = () => {
    try {
      const payloads = reports.map((r) => r?.payload ?? r);
      const bundle = {
        type: "ftr2_receiving_log_butchery",
        exportedAt: new Date().toISOString(),
        count: payloads.length,
        items: payloads,
      };
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      a.href = url;
      a.download = `FTR2_Receiving_Log_ALL_${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("❌ Failed to export JSON.");
    }
  };

  const triggerImport = () => fileInputRef.current?.click();
  const handleImportJSON = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);
      const itemsRaw =
        Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.data)
          ? json.data
          : [];
      if (!itemsRaw.length) {
        alert("⚠️ JSON file has no importable items.");
        return;
      }
      let ok = 0, fail = 0;
      for (const item of itemsRaw) {
        const payload = item?.payload ?? item;
        if (!payload || typeof payload !== "object") {
          fail++;
          continue;
        }
        try {
          const res = await fetch(`${API_BASE}/api/reports`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "ftr2_receiving_log_butchery",
              payload,
            }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      alert(`✅ Imported: ${ok}${fail ? ` | ❌ Failed: ${fail}` : ""}`);
      await fetchReports();
    } catch (err) {
      console.error(err);
      alert("❌ Invalid JSON file.");
    } finally {
      setLoading(false);
      if (e?.target) e.target.value = "";
    }
  };

  // ===== Grouping (بعد ترتيب الأحدث أولًا) =====
  const groupedReports = useMemo(() => {
    return reports.reduce((acc, r) => {
      const date = getReportDate(r);
      if (isNaN(date)) return acc;
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      if (!acc[y]) acc[y] = {};
      if (!acc[y][m]) acc[y][m] = [];
      acc[y][m].push({ ...r, day: d, _dt: date.getTime() });
      return acc;
    }, {});
  }, [reports]);

  /* ================== Styles ================== */
  const shell = { display: "flex", gap: "1rem" };
  const sidebar = {
    minWidth: 260,
    background: "#fbfbfc",
    padding: "1rem",
    borderRadius: 12,
    boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
    border: "1px solid #eef0f4",
    height: "fit-content",
  };
  const main = {
    flex: 1,
    background: "linear-gradient(120deg, #f7f9fc 60%, #efe7f9 100%)",
    padding: "1.25rem",
    borderRadius: 14,
    boxShadow: "0 6px 22px rgba(95,61,196,0.12)",
    border: "1px solid #ececf5",
    overflowX: "hidden",
    fontSize: 16, // خط أوضح
  };
  const headerCell = {
    border: `1.4px solid ${GRID_COLOR}`,
    padding: "10px 12px",
    fontSize: 16,
    background: HEADER_BG,
    fontWeight: 700,
    color: "#1e293b",
  };
  const baseCell = {
    padding: "10px 12px",
    border: `1.2px solid ${GRID_COLOR}`, // حدود مثل إكسل
    verticalAlign: "middle",
    fontSize: 16,
    lineHeight: 1.55,
    wordBreak: "break-word",
    whiteSpace: "normal",
    background: "#fff",
  };
  const thStyle = {
    ...baseCell,
    background: HEADER_BG,
    color: "#0f172a",
    fontWeight: 800,
    border: `1.5px solid ${HEADER_BORDER}`,
    position: "sticky",
    top: 0,
    zIndex: 1,
    textAlign: "center",
  };

  // ===== Render helpers =====
  const renderValue = (val, key) => {
    if (!val && val !== 0) return "—";
    if (key === "productionDate" || key === "expiryDate") {
      try {
        const d = new Date(val);
        if (!isNaN(d)) return d.toLocaleDateString("en-CA");
      } catch {}
    }
    return String(val);
  };

  // مصادر الصور من مفاتيح مختلفة
  const getRowImages = (row) => {
    const raw =
      row?.images ||
      row?.photos ||
      row?.Photos ||
      row?.photosBase64 ||
      row?.imagesBase64 ||
      [];
    const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
    return arr.filter(Boolean);
  };

  const viewBtnStyle = {
    marginLeft: 8,
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #94a3b8",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: "0.8rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const EditableCell = ({ value, onChange, type = "text", align = "center" }) => {
    const base = {
      width: "100%",
      boxSizing: "border-box",
      padding: "6px 8px",
      borderRadius: 6,
      border: "1px solid #cfd6e6",
      fontSize: "0.92rem",
      textAlign: align,
      background: "#fff",
    };
    if (type === "date") {
      return (
        <input
          type="date"
          value={value ? new Date(value).toISOString().slice(0, 10) : ""}
          onChange={(e) => onChange(e.target.value)}
          style={base}
        />
      );
    }
    return (
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={base}
      />
    );
  };

  const asDateValue = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

  return (
    <div style={shell}>
      {/* Sidebar */}
      <div style={sidebar}>
        <h4 style={{ marginBottom: "1rem", color: "#5b21b6", textAlign: "center" }}>
          🗓️ Saved Reports
        </h4>
        {loading ? (
          <p>⏳ Loading...</p>
        ) : Object.keys(groupedReports).length === 0 ? (
          <p>❌ No reports</p>
        ) : (
          <div>
            {Object.entries(groupedReports)
              .sort(([a], [b]) => Number(b) - Number(a))
              .map(([year, months]) => (
                <details key={year} open>
                  <summary style={{ fontWeight: 700, marginBottom: 6 }}>
                    📅 Year {year}
                  </summary>
                  {Object.entries(months)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([month, days]) => {
                      const ddays = [...days].sort((a, b) => b._dt - a._dt);
                      return (
                        <details key={month} style={{ marginLeft: "1rem" }} open>
                          <summary style={{ fontWeight: 600 }}>📅 Month {month}</summary>
                          <ul style={{ listStyle: "none", paddingLeft: "1rem" }}>
                            {ddays.map((r, i) => {
                              const isActive =
                                getId(selectedReport) &&
                                getId(selectedReport) === getId(r);
                              const d = getReportDate(r);
                              const label = `${String(d.getDate()).padStart(2, "0")}/${String(
                                d.getMonth() + 1
                              ).padStart(2, "0")}/${d.getFullYear()}`;
                              return (
                                <li
                                  key={i}
                                  onClick={() => setSelectedReport(r)}
                                  style={{
                                    padding: "6px 10px",
                                    marginBottom: 4,
                                    borderRadius: 8,
                                    cursor: "pointer",
                                    background: isActive ? "#5b21b6" : "#eef1f7",
                                    color: isActive ? "#fff" : "#263042",
                                    fontWeight: 700,
                                    textAlign: "center",
                                  }}
                                >
                                  {label}
                                </li>
                              );
                            })}
                          </ul>
                        </details>
                      );
                    })}
                </details>
              ))}
          </div>
        )}
      </div>

      {/* Main / Report */}
      <div style={main}>
        {!selectedReport ? (
          <p>❌ No report selected.</p>
        ) : (
          <>
            {/* Actions */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "flex-end",
                gap: 8,
                marginBottom: 12,
              }}
            >
              {!isEditing ? (
                <>
                  <button
                    onClick={startEdit}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#93c5fd" : "#2563eb",
                      color: "#fff",
                      fontWeight: 700,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    ✏ Edit
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#a7f3d0" : "#10b981",
                      color: "#fff",
                      fontWeight: 700,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    ⬇ Export PDF
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#6ee7b7" : "#059669",
                      color: "#fff",
                      fontWeight: 700,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    ⬇ Export JSON
                  </button>
                  <button
                    onClick={triggerImport}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#fde68a" : "#f59e0b",
                      color: "#fff",
                      fontWeight: 700,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    ⬆ Import JSON
                  </button>
                  <button
                    onClick={() => handleDelete(selectedReport)}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#fca5a5" : "#ef4444",
                      color: "#fff",
                      fontWeight: 700,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    🗑 Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={saveEdit}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#86efac" : "#16a34a",
                      color: "#fff",
                      fontWeight: 800,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    💾 Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={busy}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: busy ? "#9ca3af" : "#6b7280",
                      color: "#fff",
                      fontWeight: 700,
                      border: "none",
                      cursor: busy ? "not-allowed" : "pointer",
                    }}
                  >
                    ↩ Cancel
                  </button>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={handleImportJSON}
              />
            </div>

            {/* ====== Auto-Scale container ====== */}
            <div
              ref={viewportRef}
              style={{
                width: "100%",
                position: "relative",
                overflow: "hidden",
                height: measureReady && contentH ? contentH * scale : "auto",
                minHeight: 120,
              }}
            >
              <div
                ref={scaleBoxRef}
                style={
                  measureReady
                    ? {
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: TABLE_BASE_WIDTH,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                      }
                    : { position: "static", width: "100%" }
                }
              >
                <div ref={reportRef}>
                  {/* Header info */}
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td style={headerCell}>
                          <strong>Document Title:</strong> Receiving Log (Food
                          Truck – FTR 2)
                        </td>
                        <td style={headerCell}>
                          <strong>Document No:</strong> TELT/QC/RECLOG/01
                        </td>
                      </tr>
                      <tr>
                        <td style={headerCell}>
                          <strong>Issue Date:</strong> 05/02/2020
                        </td>
                        <td style={headerCell}>
                          <strong>Revision No:</strong> 0
                        </td>
                      </tr>
                      <tr>
                        <td style={headerCell}>
                          <strong>Area:</strong> QA
                        </td>
                        <td style={headerCell}>
                          <strong>Issued By:</strong> MOHAMAD ABDULLAH QC
                        </td>
                      </tr>
                      <tr>
                        <td style={headerCell}>
                          <strong>Controlling Officer:</strong> Quality
                          Controller
                        </td>
                        <td style={headerCell}>
                          <strong>Approved By:</strong> Hussam.O.Sarhan
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Title */}
                  <h3
                    style={{
                      textAlign: "center",
                      background: "#eef1f7",
                      padding: "8px 10px",
                      margin: "0 0 8px",
                      border: "1px solid #e1e5ee",
                      borderRadius: 8,
                    }}
                  >
                    AL MAWASHI BRAAI MAMZAR
                    <br />
                    RECEIVING LOG – FOOD TRUCK (FTR-2)
                  </h3>

                  {/* Date & Invoice */}
                  <div
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      gap: 24,
                      fontWeight: 700,
                      color: "#263042",
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <strong>Date:</strong>{" "}
                      {!isEditing ? (
                        selectedReport?.payload?.reportDate || "—"
                      ) : (
                        <input
                          type="date"
                          value={asDateValue(draft?.reportDate)}
                          onChange={(e) =>
                            updateDraftMeta("reportDate", e.target.value)
                          }
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid #cfd6e6",
                            fontSize: "0.92rem",
                          }}
                        />
                      )}
                    </div>
                    <div>
                      <strong>Invoice No:</strong>{" "}
                      {!isEditing ? (
                        selectedReport?.payload?.invoiceNo || "—"
                      ) : (
                        <input
                          type="text"
                          value={draft?.invoiceNo ?? ""}
                          onChange={(e) =>
                            updateDraftMeta("invoiceNo", e.target.value)
                          }
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid #cfd6e6",
                            fontSize: "0.92rem",
                            minWidth: 160,
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Legend */}
                  <div
                    style={{
                      margin: "6px 0 12px",
                      fontSize: "0.92rem",
                      color: "#374151",
                    }}
                  >
                    LEGEND: <strong>C</strong> – Compliant / <strong>NC</strong>{" "}
                    – Non-Compliant
                  </div>

                  {/* Table */}
                  <table
                    ref={tableRef}
                    style={{
                      borderCollapse: "collapse",
                      tableLayout: "fixed",
                      width: TABLE_BASE_WIDTH,
                      border: `1.6px solid ${GRID_COLOR}`,
                      background: "#fff",
                    }}
                  >
                    <colgroup>
                      {COL_WIDTHS_PX.map((w, i) => (
                        <col key={i} style={{ width: `${w}px` }} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={thStyle}>S.No</th>
                        {COLS.map((c, i) => (
                          <th key={i} style={thStyle}>
                            {c.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        (isEditing
                          ? draft?.entries
                          : selectedReport?.payload?.entries) || []
                      ).map((row, i) => (
                        <tr
                          key={i}
                          style={{
                            background: i % 2 ? CELL_BG_EVEN : CELL_BG_ODD,
                            transition: "background 120ms",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#eef4ff")}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = i % 2 ? CELL_BG_EVEN : CELL_BG_ODD)
                          }
                        >
                          <td
                            style={{
                              ...baseCell,
                              textAlign: "center",
                              fontWeight: 700,
                              position: "sticky",
                              left: 0,
                              background: "inherit",
                            }}
                          >
                            {i + 1}
                          </td>

                          {COLS.map((c) => {
                            const val = row?.[c.key];
                            const type =
                              c.key === "productionDate" || c.key === "expiryDate"
                                ? "date"
                                : "text";
                            const imgs = getRowImages(row);
                            const isFoodItem = c.key === "foodItem";

                            return (
                              <td
                                key={c.key}
                                style={{
                                  ...baseCell,
                                  textAlign: c.align || "center",
                                }}
                              >
                                {!isEditing ? (
                                  <>
                                    {renderValue(val, c.key)}
                                    {isFoodItem && imgs.length > 0 && (
                                      <button
                                        type="button"
                                        style={viewBtnStyle}
                                        onClick={() => openPreview(imgs, 0)}
                                        title="View photos"
                                      >
                                        View
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <EditableCell
                                    value={val}
                                    type={type}
                                    align={c.align || "center"}
                                    onChange={(v) => updateDraftEntry(i, c.key, v)}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Notes */}
                  <div style={{ marginTop: 8, fontSize: "0.9rem", color: "#374151" }}>
                    *(C – Compliant &nbsp;&nbsp;&nbsp; NC – Non-Compliant)
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 12,
                      fontWeight: 700,
                      color: "#263042",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <div>
                      Checked By:{" "}
                      {!isEditing ? (
                        selectedReport?.payload?.checkedBy || "—"
                      ) : (
                        <input
                          type="text"
                          value={draft?.checkedBy ?? ""}
                          onChange={(e) => updateDraftMeta("checkedBy", e.target.value)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid #cfd6e6",
                            fontSize: "0.92rem",
                            minWidth: 180,
                          }}
                        />
                      )}
                    </div>
                    <div>
                      Verified By:{" "}
                      {!isEditing ? (
                        selectedReport?.payload?.verifiedBy || "—"
                      ) : (
                        <input
                          type="text"
                          value={draft?.verifiedBy ?? ""}
                          onChange={(e) => updateDraftMeta("verifiedBy", e.target.value)}
                          style={{
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: "1px solid #cfd6e6",
                            fontSize: "0.92rem",
                            minWidth: 180,
                          }}
                        />
                      )}
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
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closePreview();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(16,18,27,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 9999,
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "90vh",
              background: "#0b1020",
              border: "1px solid #1f2a44",
              borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ color: "#d1d5db", fontWeight: 800 }}>
                {preview.index + 1} / {preview.images.length}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={preview.images[preview.index]}
                  download={`FTR2_Image_${preview.index + 1}.jpg`}
                  style={{
                    textDecoration: "none",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#10b981",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  ⬇ Download
                </a>
                <button
                  onClick={closePreview}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#ef4444",
                    color: "#fff",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                borderRadius: 10,
                background: "#0f172a",
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <img
                src={preview.images[preview.index]}
                style={{
                  maxWidth: "100%",
                  maxHeight: "84vh",
                  objectFit: "contain",
                  display: "block",
                  userSelect: "none",
                }}
              />
              {preview.images.length > 1 && (
                <>
                  <button onClick={prevImage} title="Previous (←)" style={navBtnStyle("left")}>
                    ‹
                  </button>
                  <button onClick={nextImage} title="Next (→)" style={navBtnStyle("right")}>
                    ›
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== Helper: nav buttons style ===== */
function navBtnStyle(side) {
  return {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    [side]: 10,
    width: 44,
    height: 44,
    borderRadius: "9999px",
    border: "none",
    cursor: "pointer",
    background: "rgba(255,255,255,0.95)",
    color: "#0f172a",
    fontSize: 28,
    fontWeight: 900,
    lineHeight: "44px",
    textAlign: "center",
    boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
  };
}
