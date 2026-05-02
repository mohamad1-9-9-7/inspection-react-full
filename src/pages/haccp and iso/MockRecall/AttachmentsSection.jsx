// src/pages/haccp and iso/MockRecall/AttachmentsSection.jsx
// قسم المرفقات لـ Mock Recall: رفع متعدّد + تصنيف + ضغط تلقائي + معاينة + حذف
// كل مرفق يُحفظ كـ Base64 في الـ payload (متوافق مع نمط بقية النظام)

import React, { useRef, useState } from "react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB قبل الضغط
const MAX_DIMENSION = 1280;              // أقصى عرض/ارتفاع بعد الضغط
const JPEG_QUALITY = 0.85;

/* ===== ضغط الصورة قبل الحفظ ===== */
async function compressImage(file) {
  const dataURL = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataURL;
  });
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
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
    imageBase64: dataUrl,
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
        const dataUrl = await compressImage(file);
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
    if (!att?.imageBase64) return;
    const a = document.createElement("a");
    a.href = att.imageBase64;
    a.download = (att.fileName || `${att.category}.jpg`).replace(/[^\w.-]/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
                    src={att.imageBase64}
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

/* ===== Lightbox component ===== */
function Lightbox({ attachment, onClose, onDownload, t, dir, categoryLabel }) {
  return (
    <div style={S.lbOverlay} onClick={onClose}>
      <div style={{ ...S.lbBox, direction: dir }} onClick={(e) => e.stopPropagation()}>
        <div style={S.lbHeader}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1rem" }}>{categoryLabel}</div>
            <div style={{ opacity: 0.85, fontSize: "0.85rem", marginTop: 2 }}>
              {attachment.label || attachment.fileName}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onDownload} style={S.lbBtn}>{t("download")}</button>
            <button onClick={onClose} style={S.lbCloseBtn}>✖</button>
          </div>
        </div>
        <div style={S.lbBody}>
          <img src={attachment.imageBase64} alt={attachment.label || ""} style={S.lbImg} />
        </div>
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
  lbOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.85)",
    zIndex: 10001,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  lbBox: {
    background: "#fff",
    borderRadius: 12,
    maxWidth: "95vw",
    maxHeight: "92vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  lbHeader: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
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
  },
  lbCloseBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    width: 32, height: 32,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
  },
  lbBody: {
    padding: 12,
    background: "#f8fafc",
    overflow: "auto",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lbImg: {
    maxWidth: "100%",
    maxHeight: "80vh",
    objectFit: "contain",
  },
};
