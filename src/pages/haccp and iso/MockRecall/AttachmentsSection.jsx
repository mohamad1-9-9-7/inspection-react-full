// src/pages/haccp and iso/MockRecall/AttachmentsSection.jsx
// قسم المرفقات لـ Mock Recall: رفع متعدّد + تصنيف + معاينة + حذف
// كل مرفق يُرفع على Cloudinary ويُحفظ رابطه فقط داخل الـ payload.
// سابقاً كان الملف نفسه يُخزَّن Base64، فصار سجل واحد ~144 KB وقراءة القائمة 7 MB.

import React, { useEffect, useRef, useState } from "react";
import { uploadImage, downloadImage } from "../../../utils/imageUpload";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB قبل الرفع

/* مصدر عرض المرفق: الرابط الجديد أو المرفق القديم المخزَّن Base64 */
function attSrc(att) {
  return att?.imageUrl || att?.imageBase64 || "";
}

/* ===== Attachment row factory ===== */
function makeAttachment({ category, label, fileName, fileSize, dataUrl }) {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    category,
    label: String(label || "").trim(),
    fileName: fileName || "image.jpg",
    fileSize: fileSize || 0,
    imageUrl: dataUrl,
    uploadedAt: new Date().toISOString(),
  };
}

const CATEGORY_KEYS = [
  { value: "invoice",        tk: "catInvoice" },
  { value: "transfer",       tk: "catTransfer" },
  { value: "return_invoice", tk: "catReturnInvoice" },
  { value: "grn",            tk: "catGRN" },
  { value: "photo",          tk: "catPhoto" },
  { value: "other",          tk: "catOther" },
];

const CATEGORY_LABEL = {}; // ملء عند الـ render حسب اللغة

export default function AttachmentsSection({ value = [], onChange, t, lang, dir = "rtl" }) {
  const list = Array.isArray(value) ? value : [];
  const fileInputRef = useRef(null);
  const [pendingCategory, setPendingCategory] = useState("invoice");
  const [pendingLabel, setPendingLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [lightbox, setLightbox] = useState(null); // مرفق مفتوح للعرض الكامل
  const [dragOver, setDragOver] = useState(false);

  CATEGORY_KEYS.forEach(({ value, tk }) => { CATEGORY_LABEL[value] = t(tk); });

  async function handleFiles(files) {
    if (!files || !files.length) return;
    setErrMsg("");
    setBusy(true);
    const next = [...list];
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          setErrMsg(t("fileTooLarge") + ` (${file.name})`);
          continue;
        }
        if (!file.type.startsWith("image/")) {
          setErrMsg(t("invalidFileType") + ` (${file.name})`);
          continue;
        }
        const dataUrl = await uploadImage(file, "mock_recall_attachment");
        next.push(makeAttachment({
          category: pendingCategory,
          label: pendingLabel,
          fileName: file.name,
          fileSize: file.size,
          dataUrl,
        }));
      }
      onChange?.(next);
      setPendingLabel("");
    } catch (e) {
      setErrMsg(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function removeAttachment(id) {
    if (!window.confirm(t("deleteAttachment"))) return;
    onChange?.(list.filter((a) => a.id !== id));
  }

  function downloadAttachment(att) {
    const src = attSrc(att);
    if (!src) return;
    downloadImage(src, (att.fileName || `${att.category}.jpg`).replace(/[^\w.-]/g, "_"));
  }

  function fmtSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div>
      <div style={{ color: "#475569", fontSize: "0.88rem", marginBottom: 12, lineHeight: 1.6 }}>
        {t("attachmentsHint")}
      </div>

      {/* Add controls */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr auto", gap: 10, marginBottom: 12, alignItems: "end" }}>
        <div>
          <label style={S.label}>{t("attachmentCategory")}</label>
          <select
            value={pendingCategory}
            onChange={(e) => setPendingCategory(e.target.value)}
            style={S.input}
          >
            {CATEGORY_KEYS.map((c) => (
              <option key={c.value} value={c.value}>{t(c.tk)}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={S.label}>{t("attachmentLabel")}</label>
          <input
            type="text"
            value={pendingLabel}
            placeholder={t("attachmentLabelPlaceholder")}
            onChange={(e) => setPendingLabel(e.target.value)}
            style={S.input}
          />
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          style={{ ...S.btnPrimary, opacity: busy ? 0.6 : 1, whiteSpace: "nowrap" }}
        >
          {busy ? t("compressing") : t("addAttachment")}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        style={{
          ...S.dropzone,
          background: dragOver ? "#eef2ff" : "#f8fafc",
          borderColor: dragOver ? "#4338ca" : "#cbd5e1",
        }}
      >
        <div style={{ fontSize: "1.6rem" }}>📎</div>
        <div style={{ fontWeight: 800, color: "#0b1f4d", marginTop: 6 }}>
          {t("chooseFiles")}
        </div>
        <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
          {t("dragDropHint")} · {t("imagesOnly")}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {errMsg && (
        <div style={S.errBox}>{errMsg}</div>
      )}

      {/* List */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 800, color: "#0b1f4d", marginBottom: 8 }}>
          {list.length === 0
            ? t("noAttachments")
            : `${list.length} ${t("attachmentsCount")}`}
        </div>
        {list.length > 0 && (
          <div style={S.grid}>
            {list.map((att) => (
              <div key={att.id} style={S.tile}>
                <div style={S.thumbWrap} onClick={() => setLightbox(att)} title={t("fullSize")}>
                  <img
                    src={attSrc(att)}
                    alt={att.label || att.category}
                    style={S.thumbImg}
                  />
                  <div style={S.catBadge}>{CATEGORY_LABEL[att.category] || att.category}</div>
                </div>
                <div style={S.tileBody}>
                  <div style={S.tileLabel}>{att.label || att.fileName}</div>
                  <div style={S.tileMeta}>
                    {fmtSize(att.fileSize)} · {String(att.uploadedAt || "").slice(0, 10)}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button type="button" onClick={() => downloadAttachment(att)} style={S.btnSmall}>
                      {t("download")}
                    </button>
                    <button type="button" onClick={() => removeAttachment(att.id)} style={S.btnDanger}>
                      ✖
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          attachment={lightbox}
          onClose={() => setLightbox(null)}
          onDownload={() => downloadAttachment(lightbox)}
          t={t}
          dir={dir}
          categoryLabel={CATEGORY_LABEL[lightbox.category] || lightbox.category}
        />
      )}
    </div>
  );
}

/* ===== Lightbox component — full-screen, click to toggle actual size, ESC to close ===== */
function Lightbox({ attachment, onClose, onDownload, t, dir, categoryLabel }) {
  const [actualSize, setActualSize] = useState(false);

  /* ESC to close + lock body scroll while open */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div style={S.lbOverlay} onClick={onClose}>
      {/* Floating header — overlaid on image */}
      <div style={{ ...S.lbHeader, direction: dir }} onClick={(e) => e.stopPropagation()}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff" }}>{categoryLabel}</div>
          <div style={{ opacity: 0.85, fontSize: "0.85rem", marginTop: 2, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {attachment.label || attachment.fileName}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); setActualSize((v) => !v); }} style={S.lbBtn}
            title={actualSize ? t("fitScreen") || "Fit screen" : t("actualSize") || "Actual size"}>
            {actualSize ? "🔽 Fit" : "🔍 1:1"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDownload(); }} style={S.lbBtn}>{t("download")}</button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={S.lbCloseBtn}>✖</button>
        </div>
      </div>

      {/* Image area — full screen, scrollable when in actual-size mode */}
      <div
        style={{ ...S.lbBody, overflow: actualSize ? "auto" : "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={attSrc(attachment)}
          alt={attachment.label || ""}
          style={actualSize ? S.lbImgActual : S.lbImgFull}
          onClick={() => setActualSize((v) => !v)}
        />
      </div>
    </div>
  );
}

/* ===== Styles ===== */
const S = {
  label: {
    display: "block",
    fontWeight: 700,
    color: "#374151",
    fontSize: "0.88rem",
    marginBottom: 5,
  },
  input: {
    padding: "9px 11px",
    border: "1.5px solid #d1d5db",
    borderRadius: 8,
    fontSize: "0.92rem",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
  },
  dropzone: {
    border: "2px dashed",
    borderRadius: 12,
    padding: "20px 16px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all .12s ease",
  },
  errBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: 10,
    borderRadius: 8,
    fontWeight: 700,
    fontSize: "0.88rem",
    marginTop: 10,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 12,
  },
  tile: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  thumbWrap: {
    position: "relative",
    width: "100%",
    height: 140,
    background: "#f1f5f9",
    overflow: "hidden",
    cursor: "zoom-in",
  },
  thumbImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  catBadge: {
    position: "absolute",
    top: 6,
    insetInlineStart: 6,
    background: "rgba(15,23,42,0.85)",
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: "0.72rem",
    fontWeight: 800,
  },
  tileBody: { padding: 10 },
  tileLabel: {
    fontWeight: 700,
    color: "#0b1f4d",
    fontSize: "0.88rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tileMeta: {
    fontSize: "0.75rem",
    color: "#64748b",
    fontWeight: 600,
    marginTop: 2,
  },
  btnPrimary: {
    background: "linear-gradient(180deg,#10b981,#059669)",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.92rem",
  },
  btnSmall: {
    background: "#eef2ff",
    color: "#1e40af",
    border: "1px solid #c7d2fe",
    padding: "4px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.75rem",
    flex: 1,
  },
  btnDanger: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    padding: "4px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.75rem",
  },
  /* ===== Full-screen lightbox ===== */
  lbOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.95)",
    zIndex: 10001,
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  lbHeader: {
    position: "fixed",
    top: 0, left: 0, right: 0,
    background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.55) 80%, transparent)",
    color: "#fff",
    padding: "14px 18px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    zIndex: 10003,
  },
  lbBtn: {
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
  },
  lbCloseBtn: {
    background: "rgba(220,38,38,0.85)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    width: 36, height: 36,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "1rem",
  },
  lbBody: {
    position: "absolute", inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  /* Fit-to-screen mode: image scales to viewport while preserving aspect */
  lbImgFull: {
    maxWidth: "100vw",
    maxHeight: "100vh",
    width: "auto",
    height: "auto",
    objectFit: "contain",
    cursor: "zoom-in",
    display: "block",
  },
  /* Actual-size mode: image rendered at native pixel dimensions, scrollable */
  lbImgActual: {
    width: "auto",
    height: "auto",
    maxWidth: "none",
    maxHeight: "none",
    cursor: "zoom-out",
    display: "block",
  },
};
