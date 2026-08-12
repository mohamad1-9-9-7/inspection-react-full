// src/pages/haccp and iso/ProductWithdrawal/WithdrawalAttachments.jsx
// Supporting-document upload for a Product Withdrawal record.
//
// Images are compressed client-side then uploaded to Cloudinary; PDFs go up
// as-is. Only the resulting URL is stored in the report payload — no base64
// ever enters the record.

import React, { useEffect, useRef, useState } from "react";
import { uploadImageToServer } from "../../monitor/branches/shipment_recc/qcsRawApi";

const PDF_MAX_BYTES = 5 * 1024 * 1024;  // 5 MB per PDF
const IMG_MAX_BYTES = 12 * 1024 * 1024; // 12 MB before compression
const IMG_MAX_DIM = 1600;
const IMG_QUALITY = 0.82;

/* Document taxonomy — grouped the way a withdrawal file is actually assembled. */
export const ATTACHMENT_GROUPS = [
  {
    tk: "pwAttGrpCommercial",
    items: [
      { value: "invoice",        tk: "pwAttInvoice",        icon: "🧾" },
      { value: "transfer",       tk: "pwAttTransfer",       icon: "🔁" },
      { value: "crm",            tk: "pwAttCRM",            icon: "💬" },
      { value: "deliveryNote",   tk: "pwAttDeliveryNote",   icon: "🚚" },
      { value: "grn",            tk: "pwAttGRN",            icon: "📥" },
      { value: "returnNote",     tk: "pwAttReturnNote",     icon: "↩️" },
    ],
  },
  {
    tk: "pwAttGrpEvidence",
    items: [
      { value: "holdLabel",      tk: "pwAttHoldLabel",      icon: "🏷️" },
      { value: "quarantine",     tk: "pwAttQuarantine",     icon: "🚧" },
      { value: "branchConfirm",  tk: "pwAttBranchConfirm",  icon: "✅" },
      { value: "circular",       tk: "pwAttCircular",       icon: "📢" },
      { value: "productPhoto",   tk: "pwAttProductPhoto",   icon: "📷" },
    ],
  },
  {
    tk: "pwAttGrpQuality",
    items: [
      { value: "labReport",      tk: "pwAttLabReport",      icon: "🔬" },
      { value: "coa",            tk: "pwAttCOA",            icon: "📜" },
      { value: "supplierNotice", tk: "pwAttSupplierNotice", icon: "🏭" },
    ],
  },
  {
    tk: "pwAttGrpClosure",
    items: [
      { value: "authorityLetter", tk: "pwAttAuthorityLetter", icon: "🏛️" },
      { value: "destructionCert", tk: "pwAttDestructionCert", icon: "🔥" },
      { value: "other",           tk: "pwAttOther",           icon: "📁" },
    ],
  },
];

/* Flat lookup: category value -> { tk, icon } */
export const ATTACHMENT_META = ATTACHMENT_GROUPS.reduce((acc, g) => {
  g.items.forEach((i) => { acc[i.value] = i; });
  return acc;
}, {});

export function attachmentLabel(category, t) {
  const meta = ATTACHMENT_META[category];
  return meta ? `${meta.icon} ${t(meta.tk)}` : category || "";
}

export function formatBytes(n) {
  if (!n || n < 1024) return `${n || 0} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const isPdf = (att) =>
  att?.mime === "application/pdf" || String(att?.fileName || "").toLowerCase().endsWith(".pdf");

/* ── Image helpers ─────────────────────────────────────────── */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { try { URL.revokeObjectURL(url); } catch {} resolve(img); };
    img.onerror = (e) => { try { URL.revokeObjectURL(url); } catch {} reject(e); };
    img.src = url;
  });
}

/* Compress to a JPEG File before upload — keeps Cloudinary usage and the
   payload small without ever putting base64 in the record. */
async function compressToFile(file, { maxDim = IMG_MAX_DIM, quality = IMG_QUALITY } = {}) {
  const img = await loadImageFromFile(file);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Invalid image dimensions");
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Image compression failed");
  const base = String(file?.name || "image").replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export default function WithdrawalAttachments({
  value = [],
  onChange,
  t,
  lang = "ar",
  dir = "rtl",
  readOnly = false,
  locations = [],
}) {
  const list = Array.isArray(value) ? value : [];
  const fileInputRef = useRef(null);

  const [category, setCategory] = useState("invoice");
  const [label, setLabel] = useState("");
  const [refNo, setRefNo] = useState("");
  const [linkedLocation, setLinkedLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errMsg, setErrMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const isAr = lang === "ar";
  const locationNames = (locations || []).map((l) => l.location).filter(Boolean);

  async function handleFiles(files) {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    setErrMsg("");
    setBusy(true);
    setProgress({ done: 0, total: picked.length });

    const added = [];
    const problems = [];

    try {
      for (let i = 0; i < picked.length; i++) {
        const file = picked[i];
        const name = String(file?.name || "");
        const lower = name.toLowerCase();
        const pdf = file?.type === "application/pdf" || lower.endsWith(".pdf");
        const image = String(file?.type || "").startsWith("image/");

        try {
          if (!pdf && !image) {
            problems.push(`${t("pwAttBadType")}: ${name}`);
            continue;
          }
          if (pdf && file.size > PDF_MAX_BYTES) {
            problems.push(`${t("pwAttTooLarge")}: ${name} (${formatBytes(file.size)})`);
            continue;
          }
          if (image && file.size > IMG_MAX_BYTES) {
            problems.push(`${t("pwAttTooLarge")}: ${name} (${formatBytes(file.size)})`);
            continue;
          }

          const toUpload = pdf ? file : await compressToFile(file);
          const url = await uploadImageToServer(toUpload, "product_withdrawal");

          added.push({
            id: newId(),
            category,
            label: label.trim(),
            refNo: refNo.trim(),
            linkedLocation: linkedLocation || "",
            fileName: name || (pdf ? "document.pdf" : "image.jpg"),
            mime: pdf ? "application/pdf" : "image/jpeg",
            size: toUpload.size || file.size || 0,
            url,
            uploadedAt: new Date().toISOString(),
          });
        } catch (e) {
          problems.push(`${t("pwAttUploadFail")}: ${name} — ${e?.message || e}`);
        } finally {
          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }
      }

      if (added.length) {
        onChange?.([...list, ...added]);
        setLabel("");
        setRefNo("");
      }
      if (problems.length) setErrMsg(problems.join("\n"));
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0 });
    }
  }

  function removeAttachment(id) {
    if (!window.confirm(t("pwAttConfirmRemove"))) return;
    onChange?.(list.filter((a) => a.id !== id));
  }

  function openAttachment(att) {
    if (!att?.url) return;
    if (isPdf(att)) window.open(att.url, "_blank", "noopener,noreferrer");
    else setLightbox(att);
  }

  /* Grouped view so a long list stays readable. */
  const grouped = ATTACHMENT_GROUPS
    .map((g) => ({
      tk: g.tk,
      items: list.filter((a) => g.items.some((i) => i.value === a.category)),
    }))
    .filter((g) => g.items.length > 0);
  const ungrouped = list.filter((a) => !ATTACHMENT_META[a.category]);
  if (ungrouped.length) grouped.push({ tk: "pwAttOther", items: ungrouped });

  return (
    <div>
      {!readOnly && (
        <>
          <div style={S.hint}>{t("pwAttHint")}</div>

          {/* Metadata for the next upload */}
          <div style={S.controls}>
            <div>
              <label style={S.label}>{t("pwAttCategory")}</label>
              <select style={S.input} value={category} onChange={(e) => setCategory(e.target.value)}>
                {ATTACHMENT_GROUPS.map((g) => (
                  <optgroup key={g.tk} label={t(g.tk)}>
                    {g.items.map((i) => (
                      <option key={i.value} value={i.value}>{i.icon} {t(i.tk)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={S.label}>{t("pwAttRefNo")}</label>
              <input
                style={S.input}
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder={t("pwAttRefNoPh")}
              />
            </div>
            <div>
              <label style={S.label}>{t("pwAttLabel")}</label>
              <input
                style={S.input}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("pwAttLabelPh")}
              />
            </div>
            {locationNames.length > 0 && (
              <div>
                <label style={S.label}>{t("pwAttLinkedLocation")}</label>
                <select style={S.input} value={linkedLocation} onChange={(e) => setLinkedLocation(e.target.value)}>
                  <option value="">{t("pwAttNoLocation")}</option>
                  {locationNames.map((n, i) => (
                    <option key={`${n}_${i}`} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Drop zone */}
          <div
            onClick={() => !busy && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!busy) handleFiles(e.dataTransfer.files);
            }}
            style={{
              ...S.dropzone,
              background: dragOver ? "#eef2ff" : "#f8fafc",
              borderColor: dragOver ? "#2d5a8e" : "#cbd5e1",
              cursor: busy ? "wait" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            <div style={{ fontSize: "1.6rem" }}>📎</div>
            <div style={{ fontWeight: 800, color: "#0b1f4d", marginTop: 6 }}>
              {busy
                ? `${t("pwAttUploading")} ${progress.total ? `(${progress.done}/${progress.total})` : ""}`
                : t("pwAttDrop")}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: 4 }}>
              {t("pwAttAccept")}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              multiple
              style={{ display: "none" }}
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
            />
          </div>

          {errMsg && <div style={S.errBox}>{errMsg}</div>}
        </>
      )}

      {/* List */}
      <div style={{ marginTop: readOnly ? 0 : 14 }}>
        {list.length === 0 ? (
          <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.88rem" }}>
            {t("pwAttNone")}
          </div>
        ) : (
          <>
            {!readOnly && (
              <div style={{ fontWeight: 800, color: "#0b1f4d", marginBottom: 8 }}>
                {list.length} {t("pwAttCount")}
              </div>
            )}
            {grouped.map((g) => (
              <div key={g.tk} style={{ marginBottom: 12 }}>
                <div style={S.groupTitle}>{t(g.tk)} · {g.items.length}</div>
                <div style={S.grid}>
                  {g.items.map((att) => {
                    const pdf = isPdf(att);
                    return (
                      <div key={att.id} style={S.tile}>
                        <div style={S.thumbWrap} onClick={() => openAttachment(att)} title={t("pwAttOpen")}>
                          {pdf ? (
                            <div style={S.pdfBox}>
                              <div style={{ fontSize: "2rem" }}>📄</div>
                              <div style={{ fontWeight: 900, color: "#991b1b", fontSize: "0.8rem" }}>PDF</div>
                            </div>
                          ) : (
                            <img src={att.url} alt={att.label || att.category} style={S.thumbImg} loading="lazy" />
                          )}
                          <div style={S.catBadge}>{attachmentLabel(att.category, t)}</div>
                        </div>
                        <div style={S.tileBody}>
                          <div style={S.tileLabel} title={att.label || att.fileName}>
                            {att.label || att.fileName}
                          </div>
                          {att.refNo && <div style={S.refNo}># {att.refNo}</div>}
                          {att.linkedLocation && (
                            <div style={S.tileMeta}>📍 {att.linkedLocation}</div>
                          )}
                          <div style={S.tileMeta}>
                            {formatBytes(att.size)} · {String(att.uploadedAt || "").slice(0, 10)}
                          </div>
                          <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ ...S.btnSmall, textAlign: "center", textDecoration: "none" }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t("pwAttOpen")}
                            </a>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                                style={S.btnDanger}
                                data-delete-action="true"
                                title={t("pwAttRemove")}
                              >
                                ✖
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {lightbox && (
        <Lightbox
          attachment={lightbox}
          onClose={() => setLightbox(null)}
          t={t}
          dir={dir}
          isAr={isAr}
          categoryLabel={attachmentLabel(lightbox.category, t)}
        />
      )}
    </div>
  );
}

/* ===== Full-screen image lightbox — ESC closes, click toggles 1:1 ===== */
function Lightbox({ attachment, onClose, t, dir, isAr, categoryLabel }) {
  const [actualSize, setActualSize] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div style={S.lbOverlay} onClick={onClose}>
      <div style={{ ...S.lbHeader, direction: dir }} onClick={(e) => e.stopPropagation()}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1rem", color: "#fff" }}>{categoryLabel}</div>
          <div style={{ opacity: 0.85, fontSize: "0.85rem", marginTop: 2, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {attachment.label || attachment.fileName}
            {attachment.refNo ? ` · # ${attachment.refNo}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); setActualSize((v) => !v); }} style={S.lbBtn}>
            {actualSize ? (isAr ? "🔽 ملاءمة" : "🔽 Fit") : "🔍 1:1"}
          </button>
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...S.lbBtn, textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {t("pwAttOpen")}
          </a>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={S.lbCloseBtn}>✖</button>
        </div>
      </div>

      <div style={{ ...S.lbBody, overflow: actualSize ? "auto" : "hidden" }} onClick={(e) => e.stopPropagation()}>
        <img
          src={attachment.url}
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
  hint: { color: "#475569", fontSize: "0.86rem", marginBottom: 12, lineHeight: 1.6 },
  controls: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  label: { display: "block", fontWeight: 800, color: "#475569", fontSize: 12, marginBottom: 5 },
  input: {
    padding: "9px 11px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    fontSize: "0.9rem",
    width: "100%",
    boxSizing: "border-box",
    background: "#fff",
    fontFamily: "inherit",
    fontWeight: 600,
  },
  dropzone: {
    border: "2px dashed",
    borderRadius: 10,
    padding: "20px 16px",
    textAlign: "center",
    transition: "all .12s ease",
  },
  errBox: {
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: 10,
    borderRadius: 8,
    fontWeight: 700,
    fontSize: "0.85rem",
    marginTop: 10,
    whiteSpace: "pre-line",
  },
  groupTitle: {
    fontWeight: 800,
    color: "#0b1f4d",
    fontSize: "0.85rem",
    marginBottom: 6,
    paddingBottom: 4,
    borderBottom: "1px solid #e5e7eb",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
    gap: 10,
  },
  tile: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  thumbWrap: {
    position: "relative",
    width: "100%",
    height: 130,
    background: "#f1f5f9",
    overflow: "hidden",
    cursor: "zoom-in",
  },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  pdfBox: {
    width: "100%", height: "100%",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#fef2f2",
  },
  catBadge: {
    position: "absolute",
    top: 6,
    insetInlineStart: 6,
    background: "rgba(15,23,42,0.85)",
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: "0.68rem",
    fontWeight: 800,
    maxWidth: "88%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tileBody: { padding: 10 },
  tileLabel: {
    fontWeight: 700,
    color: "#0b1f4d",
    fontSize: "0.86rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  refNo: {
    fontSize: "0.78rem",
    color: "#1e40af",
    fontWeight: 800,
    fontFamily: "monospace",
    marginTop: 2,
  },
  tileMeta: { fontSize: "0.74rem", color: "#64748b", fontWeight: 600, marginTop: 2 },
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
    fontFamily: "inherit",
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
    fontFamily: "inherit",
  },
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
    fontFamily: "inherit",
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
  },
  lbImgFull: {
    maxWidth: "100vw", maxHeight: "100vh",
    width: "auto", height: "auto",
    objectFit: "contain",
    cursor: "zoom-in",
    display: "block",
  },
  lbImgActual: {
    width: "auto", height: "auto",
    maxWidth: "none", maxHeight: "none",
    cursor: "zoom-out",
    display: "block",
  },
};
