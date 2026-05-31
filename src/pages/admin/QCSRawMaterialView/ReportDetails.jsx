// src/pages/admin/QCSRawMaterialView/ReportDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
  ATTRIBUTES,
  defaultDocMeta,
  GENERAL_FIELDS_ORDER,
  keyLabels,
  uploadImageViaServer, // من viewUtils
  deleteImageUrl, // من viewUtils
  upsertReportOnServer, // ✅ الحفظ على السيرفر (UPSERT)
} from "./viewUtils";
import EmailSendModal from "../../shared/EmailSendModal";
import { qcsEmailConfig } from "../../monitor/branches/shipment_recc/qcsEmailConfig";

/* ── Security settings helper ── */
function getSecSetting(key) {
  try {
    const s = JSON.parse(localStorage.getItem("appSecuritySettings") || "{}");
    return s[key];
  } catch { return undefined; }
}

/* ================= Helpers للإجماليات ================= */
const toNum = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const toNumMaybe = (v) => {
  const s = String(v ?? "").trim();
  if (!s || s === "-" || s === "—") return null;
  const n = Number(s.replace(/[^\d.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

const pick = (obj, keys) => {
  for (const k of keys) {
    const val = obj?.[k];
    if (val !== undefined && val !== null && String(val) !== "") return val;
  }
  return 0;
};

const show = (v) => {
  if (v === 0) return "0";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  const s = String(v ?? "").trim();
  return s ? s : "-";
};

// ✅ رقمين بعد الفاصلة للأوزان
const show2 = (v) => {
  const n = toNumMaybe(v);
  if (n === null) return show(v);
  return n.toFixed(2);
};

const headerStyles = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "0.95rem",
    background: "#fff",
    border: "1px solid #000",
  },
  th: {
    border: "1px solid #000",
    background: "#f8fafc",
    textAlign: "left",
    padding: "10px 12px",
    width: "220px",
    color: "#111827",
    fontWeight: 800,
  },
  td: { border: "1px solid #000", padding: "10px 12px", background: "#fff" },
  spacerCol: { borderLeft: "1px solid #000", width: "10px" },
};

const sectionTitle = {
  marginBottom: "0.8rem",
  fontWeight: 900,
  color: "#111827",
  borderBottom: "2px solid #000",
  paddingBottom: "0.3rem",
};

const isUrl = (u) => typeof u === "string" && /^https?:\/\//i.test(u);
const isPdfUrl = (u) => typeof u === "string" && /\.pdf(\?|#|$)/i.test(u);
const isBase64Image = (u) => typeof u === "string" && u.startsWith("data:image/");

/* ================= Helper: نحفظ ونثبت serverId ================= */
async function commitToServer(nextReport, updateSelectedReport) {
  const saved = await upsertReportOnServer(nextReport);
  const srv = saved?.data || saved || {};
  const dbId =
    srv?._id || srv?.id || srv?.data?._id || nextReport?.serverId || undefined;
  const payload = srv?.payload || null;

  const merged = payload
    ? { ...nextReport, ...payload, serverId: dbId }
    : { ...nextReport, serverId: dbId };

  updateSelectedReport(() => merged);
  return merged;
}

/* ===== Delete auth: requires admin + respects security settings ===== */
function ensureDeleteAuth() {
  try {
    const cu = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (!cu?.isAdmin) {
      alert("❌ Only admins can delete records.");
      return false;
    }
    const needConfirm = getSecSetting("requireDeleteConfirm") !== false; // default ON
    if (needConfirm) {
      return window.confirm("⚠️ Delete this record? This cannot be undone.");
    }
    return true;
  } catch {
    return false;
  }
}

/* =================== Quality Highlight Helpers =================== */
const normText = (v) => String(v ?? "").trim().toLowerCase();
const hasAny = (txt, arr) => {
  const t = normText(txt);
  if (!t) return false;
  return arr.some((k) => t.includes(k));
};

const isBadSmell = (v) =>
  hasAny(v, [
    "bad",
    "foul",
    "off",
    "off-odour",
    "off odor",
    "odor",
    "odour",
    "spoiled",
    "putrid",
    "stinky",
    "rotten",
    "rancid",
    "smell",
    "رائحة",
    "كريه",
    "كريهة",
    "سيئة",
    "عفن",
  ]);

const isCriticalFlag = (v) =>
  hasAny(v, [
    "critical",
    "rejected",
    "reject",
    "not acceptable",
    "unacceptable",
    "bad condition",
    "very bad",
    "poor",
    "urgent",
    "alert",
    "حرج",
    "حرجة",
    "مرفوض",
    "رفض",
    "غير مقبول",
    "سيء جدا",
    "سيئة جدا",
    "طارئ",
    "تنبيه",
  ]);

/* ✅ Shipment Status coloring */
const statusTone = (status) => {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "acceptable") return "ok";
  if (s === "average") return "warn";
  if (s) return "bad";
  return "neutral";
};

const statusCellStyle = (tone) => {
  if (tone === "ok")
    return {
      background: "rgba(16,185,129,.14)",
      borderColor: "rgba(16,185,129,.35)",
      color: "#065f46",
    };
  if (tone === "warn")
    return {
      background: "rgba(245,158,11,.18)",
      borderColor: "rgba(245,158,11,.45)",
      color: "#92400e",
    };
  if (tone === "bad")
    return {
      background: "rgba(239,68,68,.14)",
      borderColor: "rgba(239,68,68,.35)",
      color: "#7f1d1d",
    };
  return {
    background: "rgba(148,163,184,.10)",
    borderColor: "rgba(148,163,184,.30)",
    color: "#0f172a",
  };
};

/* ✅ Local Logger = NO => أحمر خفيف */
const isNo = (v) => String(v ?? "").trim().toUpperCase() === "NO";
const isYes = (v) => String(v ?? "").trim().toUpperCase() === "YES";

/* ✅✅ FIX: parentheses to avoid no-mixed-operators warning */
const isLocalLoggerKey = (k) => {
  const s = String(k ?? "").toLowerCase();
  return (
    s === "locallogger" ||
    s === "local_logger" ||
    (s.includes("local") && s.includes("logger"))
  );
};

const localLoggerValueStyle = (v) => {
  if (isNo(v)) {
    return {
      background: "rgba(239,68,68,.12)",
      borderColor: "rgba(239,68,68,.35)",
      color: "#7f1d1d",
    };
  }
  if (isYes(v)) {
    return {
      background: "rgba(16,185,129,.12)",
      borderColor: "rgba(16,185,129,.30)",
      color: "#065f46",
    };
  }
  return {
    background: "rgba(148,163,184,.10)",
    borderColor: "rgba(148,163,184,.28)",
    color: "#0f172a",
  };
};

/* ✅ Temperature coloring */
const tempCellBg = (v) => {
  const n = toNumMaybe(v);
  if (n === null) return null;
  if (n === 4) return { background: "rgba(59,130,246,.16)", color: "#1e3a8a" };
  if (n >= 5) return { background: "rgba(239,68,68,.14)", color: "#7f1d1d" };
  return null;
};

/* ── ImageWithFallback: يعرض placeholder لما الصورة تكسر ── */
const ImageWithFallback = ({ src, alt, style, onClick, className, ...rest }) => {
  const [err, setErr] = React.useState(false);
  if (!src || err) {
    return (
      <div
        className="qcs-img-error-state"
        style={{
          height:      style?.height      ?? 150,
          width:       style?.width,
          maxWidth:    style?.maxWidth,
          borderRadius: style?.borderRadius ?? 12,
          minHeight:   style?.minHeight,
        }}
      >
        <span style={{ fontSize: 26 }}>🖼️</span>
        <span>Image unavailable</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || ""}
      style={style}
      className={className}
      onClick={onClick}
      onError={() => setErr(true)}
      {...rest}
    />
  );
};

export default function ReportDetails({
  selectedReport,
  getDisplayId,
  getCreatedDate,
  updateSelectedReport,
  onDeleteReport, // ← استلام دالة الحذف من index.jsx
}) {
  const [showAttachments, setShowAttachments] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [selectedImages, setSelectedImages] = useState(new Set());

  // Normalize selectedReport for EmailSendModal (it expects shipmentStatus + entrySequence)
  const emailPayload = useMemo(() => {
    if (!selectedReport) return null;
    return {
      ...selectedReport,
      shipmentStatus: selectedReport.shipmentStatus || selectedReport.status || "",
      entrySequence: selectedReport.entrySequence ?? selectedReport.sequence ?? "",
      createdDate: selectedReport.createdDate || String(selectedReport.date || "").slice(0, 10),
    };
  }, [selectedReport]);

  // زر الحذف مع تأكيد + حماية PIN
  const handleDeleteReport = async () => {
    if (!selectedReport || !onDeleteReport) return;
    if (!ensureDeleteAuth()) return;
    const name = getDisplayId?.(selectedReport) || "this report";
    if (!window.confirm(`Are you sure you want to delete "${name}" from the server?`)) return;
    try {
      setDeleting(true);
      await onDeleteReport(selectedReport); // يمرّر الكائن كامل
    } finally {
      setDeleting(false);
    }
  };

  // refs
  const imagesUploadRef = useRef(null);
  const certUploadRef = useRef(null);

  // ====== IMAGE VIEWER (Modal) ======
  const [viewer, setViewer] = useState({
    open: false,
    kind: null, // 'image' | 'cert'
    index: 0,
    src: "",
    name: "",
    canDelete: false,
  });
  const [lbZoom,   setLbZoom]   = useState(1);
  const [lbRotate, setLbRotate] = useState(0);
  const lbOverlayRef = useRef(null);

  const resetLbTransform = () => { setLbZoom(1); setLbRotate(0); };

  const openImageViewer = (index, src) => {
    setViewer({
      open: true,
      kind: "image",
      index,
      src,
      name: `image-${index + 1}`,
      canDelete: isUrl(src),
    });
  };

  const openCertViewer = () => {
    const url = selectedReport?.certificateUrl;
    const b64 = selectedReport?.certificateFile;
    const name = selectedReport?.certificateName || "Certificate";
    const src = url || b64 || "";
    if (!src || isPdfUrl(src)) return;
    setViewer({
      open: true,
      kind: "cert",
      index: 0,
      src,
      name,
      canDelete: isUrl(url), // حذف فعلي من السيرفر فقط لو URL
    });
  };

  const closeViewer = () => { setViewer((v) => ({ ...v, open: false })); resetLbTransform(); };

  // ref يحمل آخر قائمة صور (يتجنّب stale closure في navigateViewer)
  const viewerImagesRef = useRef([]);
  useEffect(() => {
    viewerImagesRef.current = Array.isArray(selectedReport?.images)
      ? selectedReport.images
      : [];
  }, [selectedReport?.images]);

  // تنقل بين الصور داخل الـ lightbox
  const navigateViewer = (dir) => {
    const images = viewerImagesRef.current;
    if (!images.length) return;
    resetLbTransform();
    setViewer((v) => {
      if (v.kind !== "image") return v;
      const newIndex = (v.index + dir + images.length) % images.length;
      const newSrc = images[newIndex];
      return {
        ...v,
        index: newIndex,
        src: newSrc,
        name: `Image ${newIndex + 1}`,
        canDelete: isUrl(newSrc),
      };
    });
  };

  // قفل سكرول الخلفية وقت فتح المودال
  useEffect(() => {
    if (viewer.open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev || "";
      };
    }
  }, [viewer.open]);

  // ESC لإغلاق + ← → للتنقل + +/- زووم + R تدوير
  useEffect(() => {
    if (!viewer.open) return;
    const onKey = (e) => {
      if (e.key === "Escape")      closeViewer();
      if (e.key === "ArrowLeft")   navigateViewer(-1);
      if (e.key === "ArrowRight")  navigateViewer(1);
      if (e.key === "+" || e.key === "=") setLbZoom(z => Math.min(5, +(z + 0.25).toFixed(2)));
      if (e.key === "-")           setLbZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
      if (e.key === "0")           resetLbTransform();
      if (e.key === "r" || e.key === "R") setLbRotate(r => r + 90);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer.open]);

  // ── Lightbox JSX (يُرسم كـ Portal على document.body لتجاوز backdrop-filter stacking context) ──
  const lightboxJsx = !viewer.open ? null : (() => {
    const images     = viewerImagesRef.current;
    const canNav     = viewer.kind === "image" && images.length > 1;
    const total      = images.length;
    const currentNum = viewer.index + 1;

    const NavBtn = ({ dir, label }) => (
      <button
        onClick={(e) => { e.stopPropagation(); navigateViewer(dir); }}
        title={dir === -1 ? "Previous (←)" : "Next (→)"}
        style={{
          position: "absolute",
          top: "50%",
          [dir === -1 ? "left" : "right"]: -56,
          transform: "translateY(-50%)",
          width: 44, height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,.15)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,.25)",
          color: "#fff", fontSize: 24, fontWeight: 900,
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background .15s",
          zIndex: 2,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.30)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.15)"; }}
      >
        {label}
      </button>
    );

    // ── تنسيق أزرار شريط الأدوات ──
    const tb = (extra = {}) => ({
      background: "rgba(255,255,255,.08)",
      border: "1px solid #334155",
      color: "#e2e8f0",
      borderRadius: 8,
      padding: "5px 10px",
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 14,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 34,
      transition: "background .15s",
      ...extra,
    });

    // ── تحميل الصورة الحالية ──
    const downloadCurrent = async () => {
      try {
        const res = await fetch(viewer.src, { mode: "cors" });
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = viewer.name.replace(/[^\w.\-]/g, "_") || "image.jpg";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch { window.open(viewer.src, "_blank"); }
    };

    // ── fullscreen على الـ overlay ──
    const toggleFullscreen = () => {
      const el = lbOverlayRef.current;
      if (!el) return;
      if (!document.fullscreenElement) el.requestFullscreen?.();
      else document.exitFullscreen?.();
    };

    return (
      <div
        ref={lbOverlayRef}
        onClick={closeViewer}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,.86)",
          zIndex: 99999,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "16px 80px",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            maxWidth: "92vw",
            background: "#0b0f19",
            borderRadius: 18,
            border: "1px solid #1f2937",
            boxShadow: "0 24px 80px rgba(0,0,0,.75)",
            padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 8,
          }}
        >
          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55vw" }}>
              {viewer.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {canNav && (
                <span style={{ color: "#94a3b8", fontWeight: 800, fontSize: 13, background: "rgba(255,255,255,.07)", borderRadius: 8, padding: "3px 10px", border: "1px solid #334155" }}>
                  {currentNum} / {total}
                </span>
              )}
              <button onClick={closeViewer} style={tb({ padding: "5px 13px", fontSize: 16, fontWeight: 900 })}>✕</button>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: "center", flexWrap: "wrap", padding: "4px 0", borderTop: "1px solid #1e293b", borderBottom: "1px solid #1e293b" }}>
            {/* زووم */}
            <button style={tb()} title="Zoom out (−)" onClick={() => setLbZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)))}>−</button>
            <span
              style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800, minWidth: 46, textAlign: "center", cursor: "pointer", userSelect: "none" }}
              title="Reset zoom (0)"
              onClick={resetLbTransform}
            >
              {Math.round(lbZoom * 100)}%
            </span>
            <button style={tb()} title="Zoom in (+)" onClick={() => setLbZoom(z => Math.min(5, +(z + 0.25).toFixed(2)))}>+</button>

            <div style={{ width: 1, height: 20, background: "#374151", margin: "0 4px" }} />

            {/* تدوير */}
            <button style={tb()} title="Rotate left" onClick={() => setLbRotate(r => r - 90)}>↺</button>
            <button style={tb()} title="Rotate right (R)" onClick={() => setLbRotate(r => r + 90)}>↻</button>

            <div style={{ width: 1, height: 20, background: "#374151", margin: "0 4px" }} />

            {/* Fullscreen */}
            <button style={tb()} title="Fullscreen" onClick={toggleFullscreen}>⛶</button>

            {/* تحميل */}
            {isUrl(viewer.src) && (
              <button style={tb({ color: "#86efac" })} title="Download this image" onClick={downloadCurrent}>⬇ Download</button>
            )}

            {/* فتح في تاب */}
            {isUrl(viewer.src) && (
              <a href={viewer.src} target="_blank" rel="noreferrer" style={tb({ textDecoration: "none", color: "#93c5fd" })} title="Open in new tab">↗ Open</a>
            )}
          </div>

          {/* ── Image area + arrows ── */}
          <div style={{
            position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            background: "#060a12",
            borderRadius: 10,
            padding: 6,
            minHeight: 120,
          }}>
            {canNav && <NavBtn dir={-1} label="‹" />}

            <img
              src={viewer.src}
              alt={viewer.name}
              style={{
                maxWidth: "82vw",
                maxHeight: "70vh",
                display: "block",
                borderRadius: lbRotate % 180 !== 0 ? 0 : 8,
                objectFit: "contain",
                transform: `scale(${lbZoom}) rotate(${lbRotate}deg)`,
                transition: "transform 0.22s cubic-bezier(.4,0,.2,1)",
                transformOrigin: "center center",
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `data:image/svg+xml,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#1e293b" rx="12"/><text x="160" y="85" text-anchor="middle" fill="#475569" font-size="40">🖼️</text><text x="160" y="130" text-anchor="middle" fill="#64748b" font-size="14" font-family="system-ui">Image unavailable</text></svg>`
                )}`;
              }}
            />

            {canNav && <NavBtn dir={1} label="›" />}
          </div>

          {/* ── Footer ── */}
          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {viewer.canDelete && viewer.kind === "cert" && (
                <button
                  onClick={() => { handleDeleteCertificate(); closeViewer(); }}
                  style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 10, padding: "7px 14px", fontWeight: 800, cursor: "pointer", fontSize: 13 }}
                 data-delete-action="true">
                  🗑 Delete certificate
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {canNav && (
                <>
                  <button onClick={() => navigateViewer(-1)} style={tb({ padding: "7px 14px" })}>‹ Prev</button>
                  <button onClick={() => navigateViewer(1)}  style={tb({ padding: "7px 14px" })}>Next ›</button>
                </>
              )}
            </div>
          </div>

          {/* ── Keyboard hints ── */}
          <div style={{ textAlign: "center", color: "#475569", fontSize: 11, borderTop: "1px solid #1e293b", paddingTop: 6 }}>
            ← → navigate &nbsp;·&nbsp; +/− zoom &nbsp;·&nbsp; R rotate &nbsp;·&nbsp; 0 reset &nbsp;·&nbsp; Esc close
          </div>
        </div>
      </div>
    );
  })();

  // لا نستخدم return مبكّر — حتى نحافظ على ترتيب الـHooks ثابت
  const idForTitle = useMemo(() => {
    if (!selectedReport) return null;
    const awb = selectedReport?.generalInfo?.airwayBill;
    const inv = selectedReport?.generalInfo?.invoiceNo;
    const norm = (s) => String(s ?? "").trim();
    return norm(awb) || norm(inv) || null;
  }, [selectedReport]);

  // ===== Helpers =====
  const displayFieldValue = (k) => {
    const v = selectedReport?.generalInfo?.[k];
    const sentinels = ["", "NIL", "NA", "N/A", "NONE", "NULL", "-", "—", "0"];
    if (
      (k === "airwayBill" || k === "invoiceNo") &&
      sentinels.includes(String(v || "").toUpperCase())
    ) {
      return "-";
    }
    return v ?? "-";
  };

  // ===== صور المعرض (الصور العادية) =====
  const handleAddImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const urls = [];
    for (const f of files) {
      try {
        const u = await uploadImageViaServer(f);
        urls.push(u);
      } catch (err) {
        console.warn("Upload failed:", err);
      }
    }
    if (!urls.length) return;

    const next = (() => {
      const prev = Array.isArray(selectedReport?.images) ? selectedReport.images : [];
      return { ...selectedReport, images: [...prev, ...urls] };
    })();

    updateSelectedReport(() => next);
    setShowAttachments(true);

    try {
      await commitToServer(next, updateSelectedReport);
    } catch {}
  };

  // ====== تبديل تحديد صورة ======
  const toggleImageSelect = (idx) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ====== حذف الصور المحددة (bulk) ======
  const handleDeleteSelected = async () => {
    if (!selectedImages.size) return;
    if (!ensureDeleteAuth()) return;
    if (!window.confirm(`Delete ${selectedImages.size} image(s)?`)) return;

    // نرتّب تنازلياً حتى ما تتغير الـ indices عند الحذف
    const indices = Array.from(selectedImages).sort((a, b) => b - a);
    let nextImages = Array.isArray(selectedReport?.images)
      ? [...selectedReport.images]
      : [];

    for (const idx of indices) {
      const url = nextImages[idx];
      if (isUrl(url)) {
        try { await deleteImageUrl(url); } catch {}
      }
      nextImages.splice(idx, 1);
    }

    const nextReport = { ...selectedReport, images: nextImages };
    updateSelectedReport(() => nextReport);
    setSelectedImages(new Set());

    try {
      await commitToServer(nextReport, updateSelectedReport);
    } catch {
      alert("⚠️ Images removed locally, but saving to server failed.");
    }
  };

  // ====== تحميل الصور المحددة ======
  const handleDownloadSelected = async () => {
    if (!selectedImages.size) return;
    const images = Array.isArray(selectedReport?.images) ? selectedReport.images : [];
    const indices = Array.from(selectedImages).sort((a, b) => a - b);

    for (const idx of indices) {
      const url = images[idx];
      if (!url) continue;
      try {
        const res = await fetch(url, { mode: "cors" });
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `image-${idx + 1}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
      } catch {
        // fallback: فتح في تاب جديد
        window.open(url, "_blank");
      }
      // تأخير بسيط بين الملفات
      await new Promise((r) => setTimeout(r, 350));
    }
  };

  // ===== شهادة الحلال =====
  const handleUploadOrReplaceCertificate = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const wasUrl = selectedReport?.certificateUrl || "";

    if (file.type.startsWith("image/")) {
      try {
        const newUrl = await uploadImageViaServer(file);
        if (wasUrl && isUrl(wasUrl)) {
          try {
            await deleteImageUrl(wasUrl);
          } catch {}
        }
        const nextReport = {
          ...selectedReport,
          certificateUrl: newUrl,
          certificateFile: "",
          certificateName: file.name,
        };
        updateSelectedReport(() => nextReport);
        setShowAttachments(true);
        await commitToServer(nextReport, updateSelectedReport);
      } catch {
        alert("❌ Failed to upload certificate image.");
      }
      return;
    }

    if (file.type === "application/pdf") {
      try {
        const newUrl = await uploadImageViaServer(file, "qcs_certificate");
        if (wasUrl && isUrl(wasUrl)) {
          try { await deleteImageUrl(wasUrl); } catch {}
        }
        const nextReport = {
          ...selectedReport,
          certificateUrl: newUrl,
          certificateFile: "",
          certificateName: file.name,
        };
        updateSelectedReport(() => nextReport);
        setShowAttachments(true);
        await commitToServer(nextReport, updateSelectedReport);
      } catch {
        alert("❌ Failed to upload certificate PDF to server.");
      }
      return;
    }

    alert("Unsupported certificate file type. Please upload an image or PDF.");
  };

  const handleDeleteCertificate = async () => {
    if (!ensureDeleteAuth()) return;
    const url = selectedReport?.certificateUrl;
    if (!isUrl(url)) return;
    if (!window.confirm("Delete certificate image from server?")) return;
    try {
      try {
        await deleteImageUrl(url);
      } catch {}
      const nextReport = { ...selectedReport, certificateUrl: "", certificateName: "" };
      updateSelectedReport(() => nextReport);
      try {
        await commitToServer(nextReport, updateSelectedReport);
      } catch {}
    } catch {
      alert("❌ Failed to delete certificate.");
    }
  };

  // ===== Derived totals from product lines =====
  const lines = Array.isArray(selectedReport?.productLines) ? selectedReport.productLines : [];

  const sumQty = lines.reduce(
    (a, l) => a + toNum(pick(l, ["qty", "quantity", "pcs", "pieces"])),
    0
  );

  const sumWgt = lines.reduce(
    (a, l) => a + toNum(pick(l, ["weight", "wt", "kg", "kgs", "weightKg"])),
    0
  );

  const avgW = sumQty > 0 ? Number((sumWgt / sumQty).toFixed(3)) : 0;

  /* ===== حقول المعلومات العامة بما فيها Receiving Address ===== */
  const generalFields = useMemo(() => {
    const arr = Array.isArray(GENERAL_FIELDS_ORDER) ? [...GENERAL_FIELDS_ORDER] : [];
    if (!arr.includes("receivingAddress")) {
      const idx = arr.indexOf("origin");
      if (idx >= 0) arr.splice(idx + 1, 0, "receivingAddress");
      else arr.push("receivingAddress");
    }
    return arr;
  }, []);

  /* ===== Helpers لأسماء المفتش والمدقق ===== */
  const firstNonEmpty = (...vals) => {
    for (const v of vals) {
      const s = String(v ?? "").trim();
      if (s) return s;
    }
    return "-";
  };

  const getInspectorName = () =>
    firstNonEmpty(
      selectedReport?.inspectorName,
      selectedReport?.inspector?.name,
      selectedReport?.generalInfo?.inspectorName,
      selectedReport?.generalInfo?.inspector,
      selectedReport?.checkedBy,
      selectedReport?.inspectedBy
    );

  const getAuditorName = () =>
    firstNonEmpty(
      selectedReport?.auditorName,
      selectedReport?.auditor?.name,
      selectedReport?.generalInfo?.auditorName,
      selectedReport?.generalInfo?.auditor,
      selectedReport?.verifiedBy,
      selectedReport?.approvedBy
    );

  const noReport = !selectedReport;

  /* ====== Flags: Smell/Critical highlighting ====== */
  const smellIsBad = useMemo(() => {
    const samples = Array.isArray(selectedReport?.samples) ? selectedReport.samples : [];
    for (const s of samples) {
      if (isBadSmell(s?.smell)) return true;
    }
    if (isBadSmell(selectedReport?.notes)) return true;
    if (isBadSmell(selectedReport?.generalInfo?.notes)) return true;
    return false;
  }, [selectedReport]);

  const isCritical = useMemo(() => {
    if (isCriticalFlag(selectedReport?.status)) return true;
    if (isCriticalFlag(selectedReport?.shipmentType)) return true;
    if (isCriticalFlag(selectedReport?.notes)) return true;
    if (isCriticalFlag(selectedReport?.generalInfo?.notes)) return true;
    if (smellIsBad) return true;
    return false;
  }, [selectedReport, smellIsBad]);

  const shipTone = statusTone(selectedReport?.status);
  const shipBox = statusCellStyle(shipTone);

  return (
    <div className="qcs-report-details pdf-root">
      {/* PDF/PRINT styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        body.qcs-pdf-exporting .no-pdf { display: none !important; }

        .attachments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 14px;
        }
        .image-tile {
          position: relative;
          border: 2px solid #94a3b8;
          border-radius: 14px;
          overflow: hidden;
          background: #f1f5f9;
          transition: transform .18s, box-shadow .18s, border-color .18s;
          cursor: pointer;
        }
        .image-tile:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 28px rgba(0,0,0,.18);
          border-color: #6366f1;
        }
        .img-num-badge {
          position: absolute;
          top: 8px; left: 8px;
          background: rgba(0,0,0,.55);
          backdrop-filter: blur(6px);
          color: #fff;
          font-size: 12px; font-weight: 900;
          padding: 3px 9px;
          border-radius: 999px;
          pointer-events: none;
          z-index: 2;
        }
        /* overlay — pointer-events: none دايماً حتى لا يحجب الكليك */
        .img-hover-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0);
          display: flex; align-items: center; justify-content: center;
          transition: background .2s;
          pointer-events: none;
          z-index: 3;
        }
        .image-tile:hover .img-hover-overlay {
          background: rgba(15,23,42,.45);
        }
        .img-overlay-zoom {
          font-size: 32px;
          opacity: 0; transform: scale(.6);
          transition: opacity .2s, transform .2s;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,.6));
        }
        .image-tile:hover .img-overlay-zoom {
          opacity: 1; transform: scale(1);
        }
        /* checkbox تحديد الصورة */
        .img-select-label {
          position: absolute;
          top: 8px; right: 8px;
          z-index: 5;
          line-height: 0;
          cursor: pointer;
        }
        .img-select-check {
          width: 26px; height: 26px;
          cursor: pointer;
          accent-color: #6366f1;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,.45);
        }
        /* حالة محددة */
        .img-tile--selected {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99,102,241,.35) !important;
        }
        .qcs-cert-card {
          background: rgba(248,250,252,.95);
          border: 2px solid #94a3b8;
          border-radius: 16px;
          padding: 16px 18px;
        }
        .attachments-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      {noReport && (
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>📋</div>
          <p style={{ fontWeight: 800, color: "#94a3b8", margin: 0 }}>
            No report selected.
          </p>
        </div>
      )}

      {!noReport && (
        <>
          {/* ── Title + actions ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, color: "#1e1b4b", fontWeight: 900, fontSize: "1.05rem", lineHeight: 1.4 }}>
              {idForTitle
                ? selectedReport?.generalInfo?.airwayBill
                  ? `📦 Air Way Bill: ${idForTitle}`
                  : `🧾 Invoice No: ${idForTitle}`
                : "📋 Incoming Shipment Report"}
            </h3>

            <div className="no-print no-pdf" style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
              <button
                className="qcs-action-btn-sm"
                onClick={() => setEmailOpen(true)}
                disabled={!selectedReport}
                style={{ background: "#7c3aed", color: "#fff", borderColor: "#6d28d9" }}
                title="Send by email"
              >
                📨 Email
              </button>

              {getSecSetting("allowDeleteRecords") === true && (
                <button
                  className="qcs-action-btn-sm"
                  onClick={handleDeleteReport}
                  disabled={!selectedReport || deleting}
                  style={{ background: deleting ? "#fca5a5" : "#dc2626", color: "#fff", borderColor: deleting ? "#fca5a5" : "#b91c1c", cursor: deleting ? "not-allowed" : "pointer" }}
                  title="Delete report"
                 data-delete-action="true">
                  {deleting ? "Deleting…" : "🗑 Delete"}
                </button>
              )}

              <button
                className="qcs-action-btn-sm"
                onClick={() => setShowAttachments((s) => !s)}
                style={{ background: "#f8fafc", color: "#334155", borderColor: "#e2e8f0" }}
              >
                {showAttachments ? "🙈 Hide" : "👀 Show"} attachments
              </button>
            </div>
          </div>

          {/* ── Quality alert ── */}
          {(smellIsBad || isCritical) && (
            <div className="qcs-quality-alert">
              ⚠️ <strong style={{ textDecoration: "underline" }}>QUALITY ALERT</strong>
              <div style={{ marginTop: 6, fontWeight: 700 }}>
                {smellIsBad && <div>• Bad / Off odour detected (رائحة غير مقبولة)</div>}
                {isCritical  && <div>• Shipment condition requires urgent action (حالة حرجة)</div>}
              </div>
            </div>
          )}

          {/* ── Document Meta ── */}
          <table className="qcs-doc-table">
            <colgroup>
              <col style={{ width: "185px" }} />
              <col />
              <col style={{ width: "10px", borderStyle: "hidden" }} />
              <col style={{ width: "185px" }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <th>Document Title</th>
                <td>{selectedReport?.docMeta?.documentTitle || defaultDocMeta.documentTitle}</td>
                <td style={{ border: "none", background: "transparent", padding: 0 }} />
                <th>Document No</th>
                <td>{selectedReport?.docMeta?.documentNo || defaultDocMeta.documentNo}</td>
              </tr>
              <tr>
                <th>Issue Date</th>
                <td>{selectedReport?.docMeta?.issueDate || defaultDocMeta.issueDate}</td>
                <td style={{ border: "none", background: "transparent", padding: 0 }} />
                <th>Revision No</th>
                <td>{selectedReport?.docMeta?.revisionNo || defaultDocMeta.revisionNo}</td>
              </tr>
              <tr>
                <th>Area</th>
                <td colSpan={4}>{selectedReport?.docMeta?.area || defaultDocMeta.area}</td>
              </tr>
            </tbody>
          </table>

          {/* ── General Info ── */}
          <section style={{ marginBottom: "1.5rem" }}>
            <div className="qcs-section-hdr">📋 General Information</div>
            <div className="qcs-info-grid">
              {generalFields.map((k) => {
                const v = displayFieldValue(k);
                const isLL = isLocalLoggerKey(k);
                const llTone = isLL ? (isNo(v) ? "no" : isYes(v) ? "yes" : "") : "";
                return (
                  <div key={k} className={`qcs-info-card${llTone ? ` qcs-info-card--${llTone}` : ""}`}>
                    <div className="qcs-info-label">
                      {k === "receivingAddress" ? "Receiving Address" : keyLabels[k] || k}
                    </div>
                    {llTone ? (
                      <span className={`qcs-status-badge qcs-status-badge--${llTone}`}>{v}</span>
                    ) : (
                      <div className="qcs-info-value">{v}</div>
                    )}
                  </div>
                );
              })}

              {/* Shipment Type */}
              <div className="qcs-info-card">
                <div className="qcs-info-label">Shipment Type</div>
                <div className="qcs-info-value">{selectedReport?.shipmentType || "-"}</div>
              </div>

              {/* Shipment Status — colored badge */}
              <div className={`qcs-info-card${shipTone === "ok" ? " qcs-info-card--ok" : shipTone === "warn" ? " qcs-info-card--warn" : shipTone === "bad" ? " qcs-info-card--bad" : ""}`}>
                <div className="qcs-info-label">Shipment Status</div>
                <span className={`qcs-status-badge${shipTone === "ok" ? " qcs-status-badge--ok" : shipTone === "warn" ? " qcs-status-badge--warn" : shipTone === "bad" ? " qcs-status-badge--bad" : ""}`}>
                  {selectedReport?.status || "-"}
                  {String(selectedReport?.status || "") === "Acceptable" ? " ✅"
                    : String(selectedReport?.status || "") === "Average" ? " ⚠️"
                    : selectedReport?.status ? " ❌" : ""}
                </span>
              </div>

              {/* Entry Date */}
              <div className="qcs-info-card">
                <div className="qcs-info-label">Entry Date</div>
                <div className="qcs-info-value">{selectedReport?.date || "-"}</div>
              </div>

              {/* Created Date */}
              <div className="qcs-info-card">
                <div className="qcs-info-label">Created Date</div>
                <div className="qcs-info-value">{getCreatedDate(selectedReport) || "-"}</div>
              </div>

              {selectedReport?.sequence ? (
                <div className="qcs-info-card">
                  <div className="qcs-info-label">Sequence (day)</div>
                  <div className="qcs-info-value qcs-info-value--num">#{selectedReport.sequence}</div>
                </div>
              ) : null}

              {selectedReport?.uniqueKey ? (
                <div className="qcs-info-card qcs-info-card--wide">
                  <div className="qcs-info-label">Unique Key</div>
                  <div className="qcs-info-value" style={{ wordBreak: "break-all", fontSize: ".8rem" }}>
                    {selectedReport.uniqueKey}
                  </div>
                </div>
              ) : null}

              <div className="qcs-info-card">
                <div className="qcs-info-label">Total Quantity (pcs)</div>
                <div className="qcs-info-value qcs-info-value--num">
                  {show(selectedReport?.totalQuantity ?? sumQty)}
                </div>
              </div>

              <div className="qcs-info-card">
                <div className="qcs-info-label">Total Weight (kg)</div>
                <div className="qcs-info-value qcs-info-value--num">
                  {show2(selectedReport?.totalWeight ?? sumWgt)}
                </div>
              </div>

              <div className="qcs-info-card">
                <div className="qcs-info-label">Average Weight (kg)</div>
                <div className="qcs-info-value qcs-info-value--num">
                  {show2(selectedReport?.averageWeight ?? avgW)}
                </div>
              </div>
            </div>
          </section>

          {/* ── Test Samples ── */}
          <section style={{ marginBottom: "1.5rem" }}>
            <div className="qcs-section-hdr">🧪 Test Samples</div>
            <div style={{ overflowX: "auto", borderRadius: 12 }}>
              <table className="qcs-modern-table" style={{ minWidth: "900px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Attribute</th>
                    {selectedReport?.samples?.map((_, idx) => (
                      <th key={idx} style={{ textAlign: "center" }}>Sample {idx + 1}</th>
                    ))}
                  </tr>
                  <tr>
                    <th style={{ textAlign: "left", textTransform: "none", letterSpacing: 0, fontWeight: 700, opacity: .85 }}>
                      Product Name
                    </th>
                    {selectedReport?.samples?.map((s, idx) => (
                      <th key={`pn-${idx}`} style={{ textAlign: "center", textTransform: "none", letterSpacing: 0, fontWeight: 700, opacity: .85 }}>
                        {s?.productName || "-"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ATTRIBUTES.map((attr) => {
                    const isSmellRow = attr.key === "smell";
                    const isTempRow  = attr.key === "temperature";
                    const rowBg = isSmellRow && smellIsBad ? "rgba(254,226,226,.4)" : undefined;
                    return (
                      <tr key={attr.key} style={rowBg ? { background: rowBg } : {}}>
                        <td style={{ fontWeight: 800, color: isSmellRow && smellIsBad ? "#7f1d1d" : "#334155" }}>
                          {attr.label}
                        </td>
                        {selectedReport?.samples?.map((s, i) => {
                          const cellVal = s?.[attr.key] || "-";
                          const badSmellCell = isSmellRow && isBadSmell(cellVal);
                          const tStyle = isTempRow ? tempCellBg(cellVal) : null;
                          return (
                            <td
                              key={`${attr.key}-${i}`}
                              style={{
                                textAlign: "center",
                                fontWeight: badSmellCell ? 900 : 600,
                                color: badSmellCell ? "#7f1d1d" : tStyle?.color || undefined,
                                background: badSmellCell ? "#fecaca" : tStyle?.background || undefined,
                              }}
                            >
                              {cellVal}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Product Lines ── */}
          <section style={{ marginBottom: "1.5rem" }}>
            <div className="qcs-section-hdr">📦 Product Lines (تفاصيل أسطر المنتجات)</div>
            <div style={{ overflowX: "auto", borderRadius: 12 }}>
              <table className="qcs-modern-table" style={{ minWidth: "640px" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Product Name</th>
                    <th style={{ width: 130, textAlign: "center" }}>Qty (pcs)</th>
                    <th style={{ width: 150, textAlign: "center" }}>Weight (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length > 0 ? (
                    lines.map((r, idx) => (
                      <tr key={r?.id || idx}>
                        <td>{String(r?.name ?? r?.productName ?? "").trim() || "-"}</td>
                        <td style={{ textAlign: "center" }}>
                          {show(pick(r, ["qty", "quantity", "pcs", "pieces"]))}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {show2(pick(r, ["weight", "wt", "kg", "kgs", "weightKg"]))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: "center", color: "#94a3b8", padding: "18px 8px", fontStyle: "italic" }}>
                        لا توجد أسطر منتجات مسجلة.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={{ textAlign: "right" }}>الإجمالي:</td>
                    <td style={{ textAlign: "center" }}>{show(selectedReport?.totalQuantity ?? sumQty)}</td>
                    <td style={{ textAlign: "center" }}>{show2(selectedReport?.totalWeight ?? sumWgt)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ textAlign: "right" }}>
                      <strong>Average Weight (kg/pc):</strong> {show2(selectedReport?.averageWeight ?? avgW)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* ── Inspector / Auditor ── */}
          <section style={{ marginBottom: "1.5rem" }}>
            <div className="qcs-info-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div className="qcs-info-card">
                <div className="qcs-info-label">Inspector Name (اسم المفتش)</div>
                <div className="qcs-info-value">{getInspectorName()}</div>
              </div>
              <div className="qcs-info-card">
                <div className="qcs-info-label">Auditor / Verifier (اسم المدقق)</div>
                <div className="qcs-info-value">{getAuditorName()}</div>
              </div>
            </div>
          </section>

          {/* ── Notes ── */}
          <section style={{ marginBottom: "1.5rem" }}>
            <div className="qcs-section-hdr">📝 Notes</div>
            <div className="qcs-notes-box">
              {(selectedReport?.notes ?? selectedReport?.generalInfo?.notes ?? "")?.trim() || "—"}
            </div>
          </section>

          {/* ── Attachments ── */}
          {showAttachments && (
            <section className="attachments-section">
              {(selectedReport?.certificateUrl ||
                selectedReport?.certificateFile ||
                (Array.isArray(selectedReport?.images) && selectedReport.images.length > 0)) && (
                <div className="qcs-section-hdr">📎 Attachments</div>
              )}

              {/* Upload buttons */}
              <div className="no-print no-pdf" style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <button
                  onClick={() => certUploadRef.current?.click()}
                  className="qcs-action-btn-sm"
                  style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", color: "#92400e", borderColor: "rgba(253,186,116,.8)", boxShadow: "0 2px 8px rgba(251,146,60,.12)" }}
                >
                  🕌 Upload / Replace certificate
                </button>
                <input ref={certUploadRef} type="file" accept="image/*,.pdf" onChange={handleUploadOrReplaceCertificate} style={{ display: "none" }} />

                <button
                  onClick={() => imagesUploadRef.current?.click()}
                  className="qcs-action-btn-sm"
                  style={{ background: "linear-gradient(135deg,#eff6ff,#dbeafe)", color: "#1e40af", borderColor: "rgba(147,197,253,.8)", boxShadow: "0 2px 8px rgba(59,130,246,.12)" }}
                >
                  📸 Upload images
                </button>
                <input ref={imagesUploadRef} type="file" accept="image/*" multiple onChange={handleAddImages} style={{ display: "none" }} />
              </div>

              {/* ── Certificate card ── */}
              {(selectedReport?.certificateUrl || selectedReport?.certificateFile) && (
                <div className="qcs-cert-card" style={{ marginBottom: "1.2rem" }}>
                  {/* header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>📜</span>
                      <div>
                        <div style={{ fontWeight: 900, color: "#1e1b4b", fontSize: 15 }}>
                          {selectedReport?.certificateName || "Halal Certificate"}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                          {isPdfUrl(selectedReport?.certificateUrl) ? "PDF Document" : "Image"}
                        </div>
                      </div>
                    </div>

                    <div className="no-print no-pdf" style={{ display: "flex", gap: 8 }}>
                      {isUrl(selectedReport?.certificateUrl) && (
                        <>
                          <a
                            href={selectedReport.certificateUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, background: "#eef2ff", color: "#4338ca", border: "1.5px solid #c7d2fe", fontWeight: 800, fontSize: 13, textDecoration: "none" }}
                          >
                            ↗ Open
                          </a>
                          <button
                            onClick={handleDeleteCertificate}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 14px", borderRadius: 10, background: "#fef2f2", color: "#dc2626", border: "1.5px solid #fecaca", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                           data-delete-action="true">
                            🗑 Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* preview */}
                  {selectedReport?.certificateUrl ? (
                    isPdfUrl(selectedReport.certificateUrl) ? (
                      <div style={{ padding: "18px 20px", borderRadius: 12, background: "rgba(238,242,255,.6)", border: "1.5px dashed #a5b4fc", textAlign: "center" }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
                        <div style={{ fontWeight: 700, color: "#4338ca", fontSize: 14 }}>PDF Certificate</div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{selectedReport.certificateName || ""}</div>
                        <a
                          href={selectedReport.certificateUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ display: "inline-block", marginTop: 12, padding: "8px 20px", borderRadius: 10, background: "#6366f1", color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none" }}
                        >
                          📄 Open PDF
                        </a>
                      </div>
                    ) : (
                      <ImageWithFallback
                        src={selectedReport.certificateUrl}
                        alt={selectedReport?.certificateName || "Certificate"}
                        onClick={openCertViewer}
                        style={{ maxWidth: 450, width: "100%", borderRadius: 14, border: "2px solid #94a3b8", display: "block", cursor: "zoom-in", boxShadow: "0 4px 16px rgba(0,0,0,.10)" }}
                      />
                    )
                  ) : null}

                  {!selectedReport?.certificateUrl && selectedReport?.certificateFile ? (
                    isBase64Image(selectedReport.certificateFile) ? (
                      <ImageWithFallback
                        src={selectedReport.certificateFile}
                        alt={selectedReport?.certificateName || "Certificate"}
                        onClick={openCertViewer}
                        style={{ maxWidth: 450, width: "100%", borderRadius: 14, border: "2px solid #94a3b8", display: "block", cursor: "zoom-in", boxShadow: "0 4px 16px rgba(0,0,0,.10)" }}
                      />
                    ) : (
                      <div style={{ padding: "18px 20px", borderRadius: 12, background: "rgba(241,245,249,.8)", border: "1.5px dashed #94a3b8", color: "#334155", fontSize: 14 }}>
                        📄 PDF attached — <strong>{selectedReport?.certificateName}</strong>
                      </div>
                    )
                  ) : null}
                </div>
              )}

              {/* ── Images grid ── */}
              {Array.isArray(selectedReport?.images) && selectedReport.images.length > 0 && (
                <>
                  {/* ── شريط أعلى الصور: count + bulk delete ── */}
                  <div className="no-print no-pdf" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 700, color: "#475569", fontSize: 14 }}>
                      🖼️ {selectedReport.images.length} image{selectedReport.images.length > 1 ? "s" : ""}
                      <span style={{ marginLeft: 8, fontWeight: 500, color: "#94a3b8", fontSize: 12 }}>
                        — click to enlarge · ← → to browse
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      {/* زر تحديد الكل / إلغاء الكل */}
                      {(() => {
                        const total = selectedReport.images.length;
                        const allSelected = selectedImages.size === total;
                        return (
                          <button
                            onClick={() => {
                              if (allSelected) {
                                setSelectedImages(new Set());
                              } else {
                                setSelectedImages(new Set(selectedReport.images.map((_, idx) => idx)));
                              }
                            }}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: allSelected ? "#e2e8f0" : "#6366f1", color: allSelected ? "#475569" : "#fff", border: allSelected ? "1.5px solid #cbd5e1" : "none", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: allSelected ? "none" : "0 2px 8px rgba(99,102,241,.3)" }}
                          >
                            {allSelected ? "☑ Deselect all" : "☐ Select all"}
                          </button>
                        );
                      })()}

                      {selectedImages.size > 0 && (
                        <>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
                            {selectedImages.size} selected
                          </span>
                          <button
                            onClick={handleDeleteSelected}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "#dc2626", color: "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(220,38,38,.3)" }}
                           data-delete-action="true">
                            🗑 Delete selected
                          </button>
                          <button
                            onClick={handleDownloadSelected}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 10, background: "#16a34a", color: "#fff", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(22,163,74,.3)" }}
                          >
                            ⬇️ Download selected
                          </button>
                          <button
                            onClick={() => setSelectedImages(new Set())}
                            style={{ padding: "7px 12px", borderRadius: 10, background: "#f1f5f9", color: "#475569", border: "1.5px solid #cbd5e1", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                          >
                            ✕ Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="attachments-grid">
                    {selectedReport.images.map((src, i) => {
                      const isSelected = selectedImages.has(i);
                      return (
                        <div
                          key={`${src}-${i}`}
                          className={`image-tile${isSelected ? " img-tile--selected" : ""}`}
                          title={`Image ${i + 1} — click to open`}
                          onClick={() => openImageViewer(i, src)}
                        >
                          {/* الصورة */}
                          <ImageWithFallback
                            src={src}
                            alt={`image-${i + 1}`}
                            className="qcs-thumb"
                            data-thumb-index={i}
                            style={{ width: "100%", height: 240, objectFit: "cover", display: "block" }}
                          />

                          {/* رقم badge */}
                          <div className="img-num-badge">#{i + 1}</div>

                          {/* checkbox للتحديد */}
                          <label
                            className="img-select-label no-print no-pdf"
                            onClick={(e) => e.stopPropagation()}
                            title="Select image"
                          >
                            <input
                              type="checkbox"
                              className="img-select-check"
                              checked={isSelected}
                              onChange={() => toggleImageSelect(i)}
                            />
                          </label>

                          {/* hover overlay — pointer-events: none دايماً */}
                          <div className="img-hover-overlay">
                            <span className="img-overlay-zoom">🔍</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      {lightboxJsx && ReactDOM.createPortal(lightboxJsx, document.body)}

      <EmailSendModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        payload={emailPayload}
        config={qcsEmailConfig}
      />
    </div>
  );
}
