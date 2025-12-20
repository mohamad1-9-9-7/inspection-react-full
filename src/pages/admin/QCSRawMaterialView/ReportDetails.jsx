// src/pages/admin/QCSRawMaterialView/ReportDetails.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ATTRIBUTES,
  defaultDocMeta,
  GENERAL_FIELDS_ORDER,
  keyLabels,
  uploadImageViaServer, // من viewUtils
  deleteImageUrl, // من viewUtils
  upsertReportOnServer, // ✅ الحفظ على السيرفر (UPSERT)
} from "./viewUtils";

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

/* ===== PIN للحذف (يسأل كل مرة) ===== */
const DELETE_PIN = "9999";
function ensureDeleteAuth() {
  try {
    const pin = window.prompt("Enter delete password (PIN):");
    if (pin === null) return false; // Cancel
    if (String(pin) === DELETE_PIN) return true;
    alert("❌ Wrong password.");
    return false;
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

export default function ReportDetails({
  selectedReport,
  getDisplayId,
  getCreatedDate,
  updateSelectedReport,
  onDeleteReport, // ← استلام دالة الحذف من index.jsx
}) {
  const [showAttachments, setShowAttachments] = useState(true);
  const [deleting, setDeleting] = useState(false); // حالة زر الحذف

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

  const closeViewer = () => setViewer((v) => ({ ...v, open: false }));

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

  // ESC لإغلاق
  useEffect(() => {
    if (!viewer.open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeViewer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer.open]);

  const Modal = () =>
    !viewer.open ? null : (
      <div
        onClick={closeViewer}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.65)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
            background: "#0b0f19",
            borderRadius: 12,
            border: "1px solid #1f2937",
            boxShadow: "0 10px 30px rgba(0,0,0,.35)",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div
              style={{
                color: "#e5e7eb",
                fontWeight: 800,
                fontSize: "0.95rem",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "60vw",
              }}
              title={viewer.name}
            >
              {viewer.name}
            </div>
            <button
              onClick={closeViewer}
              title="Close"
              className="no-print no-pdf"
              style={{
                background: "transparent",
                border: "1px solid #334155",
                color: "#e5e7eb",
                borderRadius: 10,
                padding: "6px 10px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "auto",
              background: "#0b0f19",
              borderRadius: 8,
              padding: 8,
            }}
          >
            <img
              src={viewer.src}
              alt={viewer.name}
              style={{
                maxWidth: "88vw",
                maxHeight: "76vh",
                display: "block",
                borderRadius: 8,
              }}
            />
          </div>

          <div
            className="no-print no-pdf"
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              {viewer.canDelete && (
                <button
                  onClick={() => {
                    if (viewer.kind === "image") {
                      handleDeleteImage(viewer.index);
                    } else {
                      handleDeleteCertificate();
                    }
                    closeViewer();
                  }}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                  title="Delete"
                >
                  Delete
                </button>
              )}
            </div>

            {isUrl(viewer.src) && (
              <a
                href={viewer.src}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: "#111827",
                  color: "#fff",
                  border: "1px solid #374151",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontWeight: 800,
                  textDecoration: "none",
                }}
                title="Open in new tab"
              >
                Open
              </a>
            )}
          </div>
        </div>
      </div>
    );

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

  // ====== حذف صورة (مع PIN) ======
  const handleDeleteImage = async (idx) => {
    if (!ensureDeleteAuth()) return;
    const url = (selectedReport?.images || [])[idx];
    if (!window.confirm("Delete this image?")) return;

    if (isUrl(url)) {
      try {
        await deleteImageUrl(url);
      } catch {}
    }

    const nextImages = Array.isArray(selectedReport?.images) ? [...selectedReport.images] : [];
    nextImages.splice(idx, 1);
    const nextReport = { ...selectedReport, images: nextImages };
    updateSelectedReport(() => nextReport);

    try {
      await commitToServer(nextReport, updateSelectedReport);
    } catch {
      alert("⚠️ Image removed locally, but saving to server failed.");
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
      const toBase64 = (f) =>
        new Promise((res) => {
          const r = new FileReader();
          r.onloadend = () => res(String(r.result || ""));
          r.readAsDataURL(f);
        });
      const data = await toBase64(file);
      if (wasUrl && isUrl(wasUrl)) {
        try {
          await deleteImageUrl(wasUrl);
        } catch {}
      }
      const nextReport = {
        ...selectedReport,
        certificateUrl: "",
        certificateFile: data,
        certificateName: file.name,
      };
      updateSelectedReport(() => nextReport);
      setShowAttachments(true);
      try {
        await commitToServer(nextReport, updateSelectedReport);
      } catch {}
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
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
        }
        .image-tile {
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          background: #f8fafc;
        }
        .image-tile img {
          width: 100%;
          height: 150px;
          object-fit: cover;
          display: block;
          cursor: zoom-in;
        }
        .attachments-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      `}</style>

      {noReport && (
        <p
          style={{
            textAlign: "center",
            fontWeight: 800,
            color: "#dc2626",
            padding: "2rem",
          }}
        >
          ❌ No report selected.
        </p>
      )}

      {!noReport && (
        <>
          {/* Title + actions */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: "0.75rem",
            }}
          >
            <h3 style={{ margin: 0, color: "#111827", fontWeight: 900 }}>
              {idForTitle
                ? selectedReport?.generalInfo?.airwayBill
                  ? `📦 Air Way Bill: ${idForTitle}`
                  : `🧾 Invoice No: ${idForTitle}`
                : "📋 Incoming Shipment Report"}
            </h3>

            <div className="no-print no-pdf" style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleDeleteReport}
                disabled={!selectedReport || deleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #b91c1c",
                  background: deleting ? "#fca5a5" : "#dc2626",
                  cursor: deleting ? "not-allowed" : "pointer",
                  color: "#fff",
                  fontWeight: 900,
                }}
                title="Delete this report from server"
              >
                {deleting ? "Deleting..." : "🗑 Delete report"}
              </button>

              <button
                onClick={() => setShowAttachments((s) => !s)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                  cursor: "pointer",
                  fontWeight: 900,
                  color: "#0f172a",
                }}
                title={showAttachments ? "Hide attachments" : "Show attachments"}
              >
                {showAttachments ? "🙈 Hide attachments" : "👀 Show attachments"}
              </button>
            </div>
          </div>

          {/* ✅ Quality alert */}
          {(smellIsBad || isCritical) && (
            <div
              style={{
                border: "1px solid #991b1b",
                background: "#fee2e2",
                color: "#7f1d1d",
                fontWeight: 900,
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: "0.8rem",
                lineHeight: 1.5,
              }}
            >
              ⚠️ <span style={{ textDecoration: "underline" }}>QUALITY ALERT</span>
              <div style={{ fontWeight: 800, marginTop: 6 }}>
                {smellIsBad ? "• Bad / Off odour detected (رائحة غير مقبولة)" : null}
                {smellIsBad && isCritical ? "  |  " : null}
                {isCritical
                  ? "• Shipment condition requires urgent action (حالة حرجة/تتطلب إجراء عاجل)"
                  : null}
              </div>
            </div>
          )}

          {/* Header (Document meta) */}
          <div style={{ marginBottom: "10px" }}>
            <table className="headerTable" style={headerStyles.table}>
              <colgroup>
                <col />
                <col />
                <col style={headerStyles.spacerCol} />
                <col />
                <col />
              </colgroup>
              <tbody>
                <tr>
                  <th style={headerStyles.th}>Document Title</th>
                  <td style={headerStyles.td}>
                    {selectedReport?.docMeta?.documentTitle || defaultDocMeta.documentTitle}
                  </td>
                  <td />
                  <th style={headerStyles.th}>Document No</th>
                  <td style={headerStyles.td}>
                    {selectedReport?.docMeta?.documentNo || defaultDocMeta.documentNo}
                  </td>
                </tr>
                <tr>
                  <th style={headerStyles.th}>Issue Date</th>
                  <td style={headerStyles.td}>
                    {selectedReport?.docMeta?.issueDate || defaultDocMeta.issueDate}
                  </td>
                  <td />
                  <th style={headerStyles.th}>Revision No</th>
                  <td style={headerStyles.td}>
                    {selectedReport?.docMeta?.revisionNo || defaultDocMeta.revisionNo}
                  </td>
                </tr>
                <tr>
                  <th style={headerStyles.th}>Area</th>
                  <td style={headerStyles.td} colSpan={4}>
                    {selectedReport?.docMeta?.area || defaultDocMeta.area}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* General Info grid */}
          <section style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 0,
                border: "1px solid #000",
                background: "#fff",
              }}
            >
              {generalFields.map((k) => {
                const v = displayFieldValue(k);
                const isLL = isLocalLoggerKey(k);
                const llStyle = isLL ? localLoggerValueStyle(v) : null;

                return (
                  <div
                    key={k}
                    style={{
                      border: "1px solid #000",
                      padding: 12,
                      minHeight: 66,
                      background: isLL ? llStyle.background : "#fff",
                      color: isLL ? llStyle.color : "#0f172a",
                    }}
                  >
                    <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                      {k === "receivingAddress"
                        ? keyLabels[k] || "Receiving Address (عنوان الاستلام)"
                        : keyLabels[k] || k}
                    </div>
                    <div
                      style={{
                        fontWeight: isLL && isNo(v) ? 900 : 700,
                        border: isLL ? `1px solid ${llStyle.borderColor}` : "1px solid transparent",
                        borderRadius: 10,
                        padding: "8px 10px",
                        background: isLL ? "rgba(255,255,255,.7)" : "transparent",
                        display: "inline-block",
                        minWidth: "140px",
                      }}
                    >
                      {v}
                    </div>
                  </div>
                );
              })}

              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Shipment Type
                </div>
                <div>{selectedReport?.shipmentType || "-"}</div>
              </div>

              {/* ✅ Shipment Status colored cell */}
              <div
                style={{
                  border: "1px solid #000",
                  padding: 12,
                  background: shipBox.background,
                  color: shipBox.color,
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 5, color: shipBox.color }}>
                  Shipment Status
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    borderRadius: 999,
                    padding: "6px 10px",
                    border: `1px solid ${shipBox.borderColor}`,
                    background: "rgba(255,255,255,.65)",
                    fontWeight: 900,
                  }}
                >
                  {selectedReport?.status || "-"}
                  <span style={{ fontSize: 14 }}>
                    {String(selectedReport?.status || "") === "Acceptable"
                      ? "✅"
                      : String(selectedReport?.status || "") === "Average"
                      ? "⚠️"
                      : selectedReport?.status
                      ? "❌"
                      : ""}
                  </span>
                </div>
              </div>

              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Entry Date
                </div>
                <div>{selectedReport?.date || "-"}</div>
              </div>

              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Created Date
                </div>
                <div>{getCreatedDate(selectedReport) || "-"}</div>
              </div>

              {selectedReport?.sequence ? (
                <div style={{ border: "1px solid #000", padding: 12 }}>
                  <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                    Sequence (day)
                  </div>
                  <div>
                    <span>#</span>
                    {selectedReport.sequence}
                  </div>
                </div>
              ) : null}

              {selectedReport?.uniqueKey ? (
                <div style={{ border: "1px solid #000", padding: 12, gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                    Unique Key
                  </div>
                  <div style={{ wordBreak: "break-all" }}>{selectedReport.uniqueKey}</div>
                </div>
              ) : null}

              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Total Quantity (pcs)
                </div>
                <div>{show(selectedReport?.totalQuantity ?? sumQty)}</div>
              </div>

              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Total Weight (kg)
                </div>
                {/* ✅ رقمين بعد الفاصلة */}
                <div>{show2(selectedReport?.totalWeight ?? sumWgt)}</div>
              </div>

              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Average Weight (kg)
                </div>
                <div>{show2(selectedReport?.averageWeight ?? avgW)}</div>
              </div>
            </div>
          </section>

          {/* Samples */}
          <section>
            <h4 style={sectionTitle}>Test Samples</h4>
            <div style={{ overflowX: "auto", border: "1px solid #000" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.95rem",
                  minWidth: "900px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f5f5f5", textAlign: "center", fontWeight: 900 }}>
                    <th
                      style={{
                        padding: "10px 6px",
                        border: "1px solid #000",
                        whiteSpace: "nowrap",
                        textAlign: "left",
                      }}
                    >
                      Attribute
                    </th>
                    {selectedReport?.samples?.map((_, idx) => (
                      <th
                        key={idx}
                        style={{
                          padding: "10px 6px",
                          border: "1px solid #000",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Sample {idx + 1}
                      </th>
                    ))}
                  </tr>
                  <tr style={{ background: "#fafafa", textAlign: "center" }}>
                    <th style={{ padding: "10px 6px", border: "1px solid #000", textAlign: "left" }}>
                      PRODUCT NAME
                    </th>
                    {selectedReport?.samples?.map((s, idx) => (
                      <th
                        key={`pn-${idx}`}
                        style={{ padding: "8px 6px", border: "1px solid #000", fontWeight: 700 }}
                      >
                        {s?.productName || "-"}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {ATTRIBUTES.map((attr) => {
                    const baseBg = ["temperature", "ph", "slaughterDate", "expiryDate"].includes(attr.key)
                      ? "#f9fafb"
                      : "#ffffff";

                    const isSmellRow = attr.key === "smell";
                    const isTempRow = attr.key === "temperature";

                    const rowBg = isSmellRow && smellIsBad ? "#fee2e2" : baseBg;

                    return (
                      <tr key={attr.key} style={{ background: rowBg }}>
                        <td
                          style={{
                            padding: "8px 6px",
                            border: "1px solid #000",
                            fontWeight: 900,
                            color: isSmellRow && smellIsBad ? "#7f1d1d" : "#111827",
                          }}
                        >
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
                                padding: "8px 6px",
                                border: "1px solid #000",
                                textAlign: "center",
                                fontWeight: badSmellCell ? 900 : 700,
                                color: badSmellCell ? "#7f1d1d" : tStyle?.color || "#111827",
                                background: badSmellCell
                                  ? "#fecaca"
                                  : tStyle?.background || "transparent",
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

          {/* Product Lines */}
          <section style={{ marginTop: "1.5rem" }}>
            <h4 style={sectionTitle}>Product Lines (تفاصيل أسطر المنتجات)</h4>
            <div style={{ overflowX: "auto", border: "1px solid #000", background: "#fff" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.95rem",
                  minWidth: "640px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f5f5f5", fontWeight: 900 }}>
                    <th style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "left" }}>
                      Product Name
                    </th>
                    <th style={{ border: "1px solid #000", padding: "10px 8px", width: 140, textAlign: "center" }}>
                      Qty (pcs)
                    </th>
                    <th style={{ border: "1px solid #000", padding: "10px 8px", width: 160, textAlign: "center" }}>
                      Weight (kg)
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lines.length > 0 ? (
                    lines.map((r, idx) => (
                      <tr key={r?.id || idx}>
                        <td style={{ border: "1px solid #000", padding: "8px 8px" }}>
                          {String(r?.name ?? r?.productName ?? "").trim() || "-"}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "8px 8px", textAlign: "center" }}>
                          {show(pick(r, ["qty", "quantity", "pcs", "pieces"]))}
                        </td>
                        <td style={{ border: "1px solid #000", padding: "8px 8px", textAlign: "center" }}>
                          {show2(pick(r, ["weight", "wt", "kg", "kgs", "weightKg"]))}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "center", color: "#6b7280" }}>
                        لا توجد أسطر منتجات مسجلة.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr style={{ background: "#fafafa", fontWeight: 900 }}>
                    <td style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "right" }}>
                      الإجمالي:
                    </td>
                    <td style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "center" }}>
                      {show(selectedReport?.totalQuantity ?? sumQty)}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "10px 8px", textAlign: "center" }}>
                      {show2(selectedReport?.totalWeight ?? sumWgt)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ border: "1px solid #000", padding: "8px 8px", textAlign: "right" }}>
                      <strong>Average Weight (kg/pc):</strong> {show2(selectedReport?.averageWeight ?? avgW)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Inspector / Auditor */}
          <section style={{ marginTop: "1rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 0,
                border: "1px solid #000",
                background: "#fff",
              }}
            >
              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Inspector Name (اسم المفتش)
                </div>
                <div>{getInspectorName()}</div>
              </div>
              <div style={{ border: "1px solid #000", padding: 12 }}>
                <div style={{ fontWeight: 900, marginBottom: 5, color: "#111827" }}>
                  Auditor / Verifier Name (اسم المدقق)
                </div>
                <div>{getAuditorName()}</div>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section style={{ marginTop: "1rem" }}>
            <h4 style={{ marginBottom: "0.5rem", fontWeight: 900, color: "#111827" }}>📝 Notes</h4>
            <div
              style={{
                border: "1px solid #000",
                padding: "10px 12px",
                minHeight: "6em",
                whiteSpace: "pre-wrap",
                lineHeight: 1.6,
                background: "#fff",
              }}
            >
              {(selectedReport?.notes ?? selectedReport?.generalInfo?.notes ?? "")?.trim() || "—"}
            </div>
          </section>

          {/* Attachments */}
          {showAttachments && (
            <section className="attachments-section" style={{ marginTop: "1.5rem" }}>
              {(selectedReport?.certificateUrl ||
                selectedReport?.certificateFile ||
                (Array.isArray(selectedReport?.images) && selectedReport.images.length > 0)) && (
                <h4 style={{ marginBottom: 8, fontWeight: 900, color: "#111827" }}>
                  Attachments
                </h4>
              )}

              {/* Upload buttons */}
              <div className="no-print no-pdf" style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <button
                  onClick={() => certUploadRef.current?.click()}
                  title="Upload/Replace halal certificate (image/PDF)"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#fff7ed",
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "#7c2d12",
                  }}
                >
                  🕌 Upload / Replace certificate
                </button>
                <input
                  ref={certUploadRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleUploadOrReplaceCertificate}
                  style={{ display: "none" }}
                />

                <button
                  onClick={() => imagesUploadRef.current?.click()}
                  title="Upload images"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#eff6ff",
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "#1e3a8a",
                  }}
                >
                  📸 Upload images
                </button>
                <input
                  ref={imagesUploadRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAddImages}
                  style={{ display: "none" }}
                />
              </div>

              {/* Certificate preview */}
              {(selectedReport?.certificateUrl || selectedReport?.certificateFile) && (
                <div style={{ margin: "0.5rem 0 1rem" }}>
                  <div style={{ fontWeight: 900, marginBottom: 6, color: "#111827" }}>
                    {selectedReport?.certificateName || "Certificate"}
                  </div>

                  {selectedReport?.certificateUrl ? (
                    isPdfUrl(selectedReport.certificateUrl) ? (
                      <a
                        href={selectedReport.certificateUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontWeight: 800 }}
                      >
                        📄 Open certificate (PDF)
                      </a>
                    ) : (
                      <img
                        src={selectedReport.certificateUrl}
                        alt={selectedReport?.certificateName || "Certificate"}
                        onClick={openCertViewer}
                        style={{
                          maxWidth: 350,
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          display: "block",
                          marginBottom: 6,
                          cursor: "zoom-in",
                        }}
                      />
                    )
                  ) : null}

                  {!selectedReport?.certificateUrl && selectedReport?.certificateFile ? (
                    isBase64Image(selectedReport.certificateFile) ? (
                      <img
                        src={selectedReport.certificateFile}
                        alt={selectedReport?.certificateName || "Certificate"}
                        onClick={openCertViewer}
                        style={{
                          maxWidth: 350,
                          borderRadius: 12,
                          border: "1px solid #e5e7eb",
                          display: "block",
                          marginBottom: 6,
                          cursor: "zoom-in",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          padding: "8px 12px",
                          border: "1px dashed #94a3b8",
                          display: "inline-block",
                          borderRadius: 10,
                          marginBottom: 6,
                        }}
                      >
                        📄 PDF attached — file name: <strong>{selectedReport?.certificateName}</strong>
                      </div>
                    )
                  ) : null}

                  <div className="no-print no-pdf" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {isUrl(selectedReport?.certificateUrl) && (
                      <button
                        onClick={handleDeleteCertificate}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: "6px 10px",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                        title="Delete certificate from server"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Images grid */}
              {Array.isArray(selectedReport?.images) && selectedReport.images.length > 0 && (
                <div className="attachments-grid">
                  {selectedReport.images.map((src, i) => {
                    const canDelete = isUrl(src);
                    return (
                      <div key={`${src}-${i}`} className="image-tile" title={`Image ${i + 1}`}>
                        <img
                          src={src}
                          alt={`image-${i + 1}`}
                          className="qcs-thumb"
                          data-thumb-index={i}
                          onClick={() => openImageViewer(i, src)}
                        />

                        <div
                          className="no-print no-pdf"
                          style={{
                            position: "absolute",
                            left: 6,
                            right: 6,
                            bottom: 6,
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteImage(i)}
                              style={{
                                background: "#ef4444",
                                color: "#fff",
                                border: "none",
                                borderRadius: 10,
                                padding: "4px 8px",
                                fontWeight: 900,
                                cursor: "pointer",
                              }}
                              title="Delete image from server"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </>
      )}

      <Modal />
    </div>
  );
}
