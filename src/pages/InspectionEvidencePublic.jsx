import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getRowVerification, isClosedStatus, verificationTone } from "../utils/auditVerification";

const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

async function readJson(res) {
  const text = await res.text().catch(() => "");
  try { return text ? JSON.parse(text) : null; } catch { return text; }
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...(options?.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const data = await readJson(res);
  if (!res.ok) {
    const err = new Error(data?.message || data?.error || `HTTP ${res.status}`);
    err.code = String(data?.error || "");
    err.status = res.status;
    throw err;
  }
  return data;
}

/* Server-side link states, phrased for the branch supervisor who opened it. */
const LINK_MESSAGES = {
  LINK_EXPIRED:
    "This link has expired. Please ask the QA team to send you a new one. / انتهت صلاحية هذا الرابط، الرجاء طلب رابط جديد من قسم الجودة.",
  LINK_REVOKED:
    "This link has been cancelled by the QA team. Please ask for a new one. / تم إلغاء هذا الرابط من قسم الجودة، الرجاء طلب رابط جديد.",
  LINK_NOT_FOUND:
    "This link is not valid — the report may have been deleted or the address was mistyped. / هذا الرابط غير صالح، ربما تم حذف التقرير أو أن العنوان غير صحيح.",
};

async function uploadImage(file) {
  if (!file || !file.type?.startsWith("image/")) throw new Error("Only image files are allowed.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) throw new Error(data?.error || "Upload failed");
  return {
    url: data.optimized_url || data.url,
    originalUrl: data.url || data.optimized_url,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
  };
}

function safe(v, fallback = "-") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function fileNameFromUrl(url, fallback = "evidence.jpg") {
  const clean = String(url || "").split("?")[0].split("#")[0];
  const last = clean.split("/").pop() || "";
  if (!last) return fallback;
  return /\.[a-z0-9]{2,5}$/i.test(last) ? last : `${last}.jpg`;
}

/* Cloudinary serves the photos from another origin, so a plain `download`
   attribute is ignored and the browser just navigates to the image. Pulling the
   bytes first turns it into a real download; if CORS ever blocks that we open
   the image instead of failing silently. */
async function downloadImage(url, name) {
  const filename = String(name || "").trim() || fileNameFromUrl(url);
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
    return true;
  } catch {
    window.open(url, "_blank", "noopener");
    return false;
  }
}

/* The branch used to live in the free-text `header.location` field. That field
   is gone from the entry form, so read the branch from the places the form
   writes today and only fall back to `location` for legacy reports. */
function reportBranchName(record) {
  const p = record?.payload || {};
  const h = p.header || {};
  return (
    [p.branch, h.branch, record?.branch, h.location]
      .map((v) => String(v ?? "").trim())
      .find(Boolean) || ""
  );
}

function submittedEvidenceMap(payload) {
  const updates = [
    payload?.public?.submission?.closedEvidenceUpdates,
    payload?.fields?.closedEvidenceUpdates,
    payload?.closedEvidenceUpdates,
  ].filter(Array.isArray).flat();
  const legacyUpdates = [
    payload?.fields,
    payload?.public?.submission,
    payload?.public,
    payload,
  ].flatMap(collectLegacyEvidenceItems);
  return [...updates, ...legacyUpdates].reduce((acc, item) => {
    const idx = Number(item?.rowIndex);
    if (Number.isInteger(idx)) {
      const existing = acc[idx] || [];
      acc[idx] = Array.from(new Set([...existing, ...collectImageSrcs(item)].filter(Boolean)));
    }
    return acc;
  }, {});
}

function submittedNoteMap(payload) {
  const updates = [
    payload?.public?.submission?.closedEvidenceUpdates,
    payload?.fields?.closedEvidenceUpdates,
    payload?.closedEvidenceUpdates,
  ].filter(Array.isArray).flat();
  return updates.reduce((acc, item) => {
    const idx = Number(item?.rowIndex);
    if (Number.isInteger(idx)) acc[idx] = String(item?.note || "");
    return acc;
  }, {});
}

function submittedByName(payload) {
  return String(payload?.fields?.closedEvidenceUploadedBy || payload?.public?.submission?.closedEvidenceUploadedBy || "").trim();
}

function imageSrc(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  return (
    img.previewUrl ||
    img.url ||
    img.optimized_url ||
    img.optimizedUrl ||
    img.secure_url ||
    img.secureUrl ||
    img.originalUrl ||
    img.original_url ||
    img.src ||
    img.href ||
    img.path ||
    imageSrc(img.image) ||
    imageSrc(img.file) ||
    ""
  );
}

function normalizeEvidenceImage(img) {
  const url = imageSrc(img);
  if (!url) return null;
  if (typeof img === "object" && !img.previewUrl && !img.pending && !img.file) {
    return { ...img, url: img.url || url };
  }
  return { url };
}

function mergeClosedEvidenceIntoPayload(payload, closedEvidenceUpdates, token, final, uploadedBy, savedAt) {
  const existingFields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};
  const nextTable = Array.isArray(payload.table) ? payload.table.map((row, i) => {
    /* Rows carry their original position once the server has filtered the
       closed ones out, so never assume array order matches rowIndex. */
    const declared = Number(row?.rowIndex);
    const idx = Number.isInteger(declared) && declared >= 0 ? declared : i;
    const update = closedEvidenceUpdates.find((item) => Number(item.rowIndex) === idx);
    if (!update) return row;
    const existingImgs = collectImageSrcs(row?.closedEvidenceImgs);
    const incomingImgs = collectImageSrcs(update.images);
    const mergedImgs = Array.from(new Set([...existingImgs, ...incomingImgs]));
    return {
      ...(row || {}),
      closedEvidenceImgs: mergedImgs,
      ...(String(update.note || "").trim() ? { closedEvidenceNote: update.note } : {}),
    };
  }) : payload.table;

  return {
    ...payload,
    table: nextTable,
    fields: {
      ...existingFields,
      closedEvidenceUpdates,
      closedEvidenceProgressSavedAt: savedAt,
      closedEvidenceSubmittedAt: final ? savedAt : existingFields.closedEvidenceSubmittedAt || null,
      closedEvidenceUploadedBy: uploadedBy.trim(),
      submittedBy: safe(reportBranchName({ payload }), "branch"),
      submissionType: "inspection_closed_evidence",
    },
    public: {
      ...(payload.public && typeof payload.public === "object" ? payload.public : {}),
      token,
      submittedAt: final ? savedAt : payload.public?.submittedAt || null,
      status: final ? "evidence_submitted" : "evidence_in_progress",
    },
  };
}

function collectImageSrcs(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source.flatMap(collectImageSrcs);
  const direct = imageSrc(source);
  if (direct) return [direct];
  if (typeof source !== "object") return [];
  const buckets = [
    source.images,
    source.closedEvidenceImgs,
    source.closedEvidenceImages,
    source.closedEvidence,
    source.evidenceImgs,
    source.attachments,
    source.fieldAttachments,
    source.files,
    source.urls,
    source.imageUrls,
    source.photoUrls,
    source.photos,
    source.image,
    source.file,
    source.attachment,
  ];
  return buckets.flatMap(collectImageSrcs);
}

function inferRowIndex(source, fallbackKey = "") {
  const direct =
    source?.rowIndex ??
    source?.rowIdx ??
    source?.ridx ??
    source?.index ??
    source?.itemIndex ??
    source?.findingIndex;
  const n = Number(direct);
  if (Number.isInteger(n) && n >= 0) return n;
  const text = [
    fallbackKey,
    source?.key,
    source?.name,
    source?.field,
    source?.fieldName,
    source?.id,
  ].filter(Boolean).join(" ");
  const match = /(?:row|item|finding|closedEvidence|closedEvidenceImgs|closed|evidence)[^\d]*(\d+)/i.exec(text);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function collectLegacyEvidenceItems(container) {
  if (!container || typeof container !== "object") return [];
  const out = [];
  const scan = (value, key = "") => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item, idx) => scan(item, `${key}.${idx}`));
      return;
    }
    if (typeof value !== "object") return;
    const rowIndex = inferRowIndex(value, key);
    const images = collectImageSrcs(value);
    if (Number.isInteger(rowIndex) && images.length) {
      out.push({ rowIndex, images, note: String(value.note || value.notes || value.comment || "") });
    }
    Object.entries(value).forEach(([childKey, childValue]) => {
      const joined = key ? `${key}.${childKey}` : childKey;
      if (/(closed|corrective|closure|evidence|attachment|image|photo|url)/i.test(joined)) scan(childValue, joined);
    });
  };
  [
    ["fieldAttachments", container.fieldAttachments],
    ["attachments", container.attachments],
    ["closedEvidenceAttachments", container.closedEvidenceAttachments],
    ["closedEvidenceImgs", container.closedEvidenceImgs],
    ["closedEvidenceImages", container.closedEvidenceImages],
    ["closedEvidence", container.closedEvidence],
    ["closedEvidenceUpdates", container.closedEvidenceUpdates],
  ].forEach(([key, value]) => scan(value, key));
  return out;
}

const S = {
  page: { minHeight: "100vh", padding: "clamp(10px, 1.4vw, 22px)", background: "#f4f8f7", color: "#0f172a", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', boxSizing: "border-box" },
  wrap: { width: "100%", maxWidth: "none", margin: 0 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18, flexWrap: "wrap", marginBottom: 16, padding: "clamp(16px, 1.8vw, 28px)", borderRadius: 6, background: "linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)", color: "#fff", boxShadow: "0 22px 50px rgba(15,23,42,.18)" },
  brand: { display: "flex", alignItems: "center", gap: 14, minWidth: "min(260px, 100%)", flex: "1 1 520px" },
  logo: { width: 52, height: 52, objectFit: "contain", borderRadius: 6, background: "#fff", padding: 4 },
  title: { fontSize: 16, fontWeight: 950, color: "#fff", letterSpacing: 0 },
  sub: { marginTop: 5, color: "#e0f2fe", fontSize: 14, fontWeight: 800, maxWidth: 640 },
  topActions: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", flex: "1 1 260px" },
  account: { display: "flex", alignItems: "center", gap: 10, minHeight: 48, padding: "9px 12px", borderRadius: 6, background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.22)" },
  accountMark: { width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 5, background: "rgba(255,255,255,.18)", fontWeight: 1000 },
  accountText: { fontSize: 14, fontWeight: 900, lineHeight: 1.25 },
  infoBand: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, alignItems: "center", marginBottom: 12 },
  searchLike: { minHeight: 42, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 6, background: "#fff", border: "1px solid #dbe4e2", boxShadow: "0 8px 18px rgba(15,23,42,.06)", fontSize: 14, fontWeight: 850, color: "#334155" },
  statChip: { minHeight: 42, display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 6, background: "#fff", border: "1px solid #dbe4e2", boxShadow: "0 8px 18px rgba(15,23,42,.06)", fontSize: 14, fontWeight: 950, color: "#0f172a", whiteSpace: "nowrap" },
  card: { background: "#fff", border: "1px solid #dbe4e2", borderRadius: 6, padding: "clamp(12px, 1.2vw, 18px)", marginBottom: 12, boxShadow: "0 12px 28px rgba(15,23,42,.07)" },
  reportCard: { background: "#fff", border: "1px solid #dbe4e2", borderRadius: 6, padding: "clamp(12px, 1.2vw, 18px)", marginBottom: 12, boxShadow: "0 12px 28px rgba(15,23,42,.07)" },
  meta: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, color: "#475569", fontSize: 14, fontWeight: 800 },
  sectionHead: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 1000, color: "#0f172a" },
  row: { border: "1px solid #dbe4e2", borderRadius: 6, padding: "clamp(12px, 1.1vw, 18px)", marginTop: 10, background: "#fff" },
  rowTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  rowIdentity: { display: "flex", gap: 10, alignItems: "center", minWidth: 0 },
  rowIcon: (closed) => ({ width: 38, height: 38, borderRadius: 6, display: "grid", placeItems: "center", flex: "0 0 auto", background: closed ? "linear-gradient(135deg,#16a34a,#0f766e)" : "linear-gradient(135deg,#f97316,#dc2626)", color: "#fff", fontWeight: 1000, boxShadow: closed ? "0 8px 18px rgba(22,163,74,.22)" : "0 8px 18px rgba(249,115,22,.22)" }),
  rowTitle: { fontSize: 16, fontWeight: 1000, color: "#0f172a" },
  rowSub: { marginTop: 2, fontSize: 14, fontWeight: 850, color: "#64748b" },
  label: { display: "block", marginTop: 8, marginBottom: 4, fontSize: 14, fontWeight: 950, color: "#334155" },
  readonly: { padding: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" },
  badge: (bg, fg = "#fff") => ({ display: "inline-flex", padding: "3px 9px", borderRadius: 999, background: bg, color: fg, fontSize: 14, fontWeight: 950 }),
  file: { width: "100%", padding: 10, border: "1px dashed #94a3b8", borderRadius: 8, background: "#f8fafc" },
  input: { width: "100%", minHeight: 42, padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontFamily: "inherit", fontSize: 14, background: "#fff" },
  textarea: { width: "100%", minHeight: 74, padding: 10, border: "1.5px solid #cbd5e1", borderRadius: 8, resize: "vertical", fontFamily: "inherit", fontSize: 14, lineHeight: 1.45, background: "#fff" },
  thumbs: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(150px, 100%), 1fr))", gap: 8, marginTop: 8 },
  thumb: { width: "100%", height: "clamp(90px, 9vw, 150px)", objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1", display: "block" },
  thumbBox: { position: "relative", minWidth: 0 },
  thumbBtn: { display: "block", width: "100%", padding: 0, margin: 0, border: 0, background: "transparent", cursor: "zoom-in", borderRadius: 8 },
  thumbDl: { position: "absolute", left: 6, top: 6, minWidth: 28, height: 28, padding: "0 8px", borderRadius: 999, border: "1px solid rgba(15,23,42,.18)", background: "rgba(255,255,255,.94)", color: "#0f766e", fontWeight: 1000, fontSize: 13, lineHeight: 1, cursor: "pointer", boxShadow: "0 4px 12px rgba(15,23,42,.18)" },
  removeThumb: { position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(15,23,42,.18)", background: "rgba(255,255,255,.94)", color: "#b91c1c", fontWeight: 1000, cursor: "pointer", boxShadow: "0 4px 12px rgba(15,23,42,.18)" },
  /* Supervisor name: it is required for every save, so it gets its own block
     instead of looking like one more read-only line in the report card. */
  uploaderCard: { marginTop: 14, padding: "clamp(12px, 1.2vw, 18px)", borderRadius: 8, border: "2px solid #0f766e", background: "linear-gradient(135deg,#ecfeff 0%,#f0fdfa 100%)", boxShadow: "0 10px 24px rgba(15,118,110,.12)" },
  uploaderCardMissing: { borderColor: "#dc2626", background: "linear-gradient(135deg,#fef2f2 0%,#fff7ed 100%)", boxShadow: "0 10px 24px rgba(220,38,38,.12)" },
  uploaderTop: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  uploaderIcon: { width: 40, height: 40, borderRadius: 8, display: "grid", placeItems: "center", background: "#0f766e", color: "#fff", fontSize: 19, fontWeight: 1000, flex: "0 0 auto" },
  uploaderLabel: { fontSize: 16, fontWeight: 1000, color: "#0f172a", lineHeight: 1.3 },
  uploaderHint: { fontSize: 13, fontWeight: 800, color: "#475569", marginTop: 3, lineHeight: 1.5 },
  uploaderInput: { width: "100%", minHeight: 54, padding: "12px 14px", border: "2px solid #0f766e", borderRadius: 8, fontFamily: "inherit", fontSize: 17, fontWeight: 850, background: "#fff", color: "#0f172a", boxShadow: "inset 0 1px 3px rgba(15,23,42,.07)" },
  uploaderInputMissing: { borderColor: "#dc2626" },
  uploaderValue: { padding: "12px 14px", background: "#fff", border: "2px solid #cbd5e1", borderRadius: 8, fontSize: 17, fontWeight: 900, color: "#0f172a" },
  req: { color: "#dc2626", fontWeight: 1000 },
  viewOnly: { display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999, background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569", fontSize: 13, fontWeight: 950 },
  /* Photo viewer */
  lbWrap: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(8,15,23,.88)", display: "flex", flexDirection: "column", padding: "clamp(10px, 2vw, 24px)", boxSizing: "border-box" },
  lbBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", color: "#fff", marginBottom: 10 },
  lbTitle: { fontSize: 15, fontWeight: 950, minWidth: 0, wordBreak: "break-word" },
  lbCount: { fontSize: 13, fontWeight: 850, color: "#cbd5e1", marginTop: 2 },
  lbActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  lbBtn: { background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.32)", borderRadius: 6, padding: "10px 14px", fontWeight: 900, fontSize: 14, cursor: "pointer" },
  lbPrimary: { background: "#0f766e", color: "#fff", border: "1px solid #0b5d57", borderRadius: 6, padding: "10px 16px", fontWeight: 950, fontSize: 14, cursor: "pointer" },
  lbStage: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 0 },
  lbImg: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 30px 60px rgba(0,0,0,.5)", background: "#0b1220" },
  lbNav: { width: 46, height: 46, flex: "0 0 auto", borderRadius: 999, border: "1px solid rgba(255,255,255,.32)", background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 20, fontWeight: 1000, cursor: "pointer" },
  pendingTag: { position: "absolute", left: 6, bottom: 6, padding: "3px 7px", borderRadius: 999, background: "rgba(15,118,110,.94)", color: "#fff", fontSize: 12, fontWeight: 950 },
  btn: { background: "#006b63", color: "#fff", border: "1px solid #00584f", borderRadius: 5, padding: "10px 14px", fontWeight: 950, cursor: "pointer" },
  amberBtn: { background: "#2aa8c4", color: "#fff", border: "1px solid #1789a2", borderRadius: 5, padding: "10px 14px", fontWeight: 950, cursor: "pointer" },
  ghost: { background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 5, padding: "10px 14px", fontWeight: 900 },
  msg: { padding: 12, borderRadius: 8, background: "#ecfeff", border: "1px solid #a5f3fc", color: "#155e75", fontWeight: 800, marginBottom: 12 },
  err: { padding: 12, borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontWeight: 800, marginBottom: 12 },
  hint: { padding: 10, borderRadius: 6, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", fontSize: 14, fontWeight: 850, marginTop: 8 },
  missing: { padding: 10, borderRadius: 6, background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", fontSize: 14, fontWeight: 850, marginTop: 8 },
  actions: { position: "sticky", bottom: 0, display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 0 4px", background: "linear-gradient(180deg,rgba(244,248,247,0),#f4f8f7 36%)", flexWrap: "wrap" },
};

/* Full-size photo viewer. Thumbnails are cropped squares, and on a phone a
   150px crop of a temperature log is unreadable — the branch needs the whole
   picture plus a way to keep a copy. */
function PhotoViewer({ items, index, title, onClose, onIndex }) {
  const total = items.length;
  const item = items[Math.min(Math.max(index, 0), total - 1)] || null;

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex(index + 1);
      else if (e.key === "ArrowLeft") onIndex(index - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onIndex]);

  /* The page behind the overlay must not scroll under the finger on a phone. */
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  if (!item) return null;

  return (
    <div style={S.lbWrap} onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div style={S.lbBar} onClick={(e) => e.stopPropagation()}>
        <div style={{ minWidth: 0 }}>
          <div style={S.lbTitle}>{title || "Photo / صورة"}</div>
          <div style={S.lbCount}>
            {index + 1} / {total} — {item.name || fileNameFromUrl(item.src)}
          </div>
        </div>
        <div style={S.lbActions}>
          <button type="button" style={S.lbPrimary} onClick={() => downloadImage(item.src, item.name)}>
            ⤓ Download / تنزيل
          </button>
          <button type="button" style={S.lbBtn} onClick={() => window.open(item.src, "_blank", "noopener")}>
            ↗ Open / فتح
          </button>
          <button type="button" style={S.lbBtn} onClick={onClose}>
            ✕ Close / إغلاق
          </button>
        </div>
      </div>
      <div style={S.lbStage} onClick={(e) => e.stopPropagation()}>
        {total > 1 && (
          <button type="button" style={S.lbNav} onClick={() => onIndex(index - 1)} aria-label="Previous photo">‹</button>
        )}
        <img src={item.src} alt={item.name || "Evidence"} style={S.lbImg} />
        {total > 1 && (
          <button type="button" style={S.lbNav} onClick={() => onIndex(index + 1)} aria-label="Next photo">›</button>
        )}
      </div>
    </div>
  );
}

export default function InspectionEvidencePublic() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState({});
  const [notes, setNotes] = useState({});
  const [uploadedBy, setUploadedBy] = useState("");
  /* Legacy lock: reports written before per-finding verification existed only
     record "the branch pressed Send once". Used as a fallback below. */
  const [submittedFlag, setSubmittedFlag] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  /* Set when the link itself is unusable (expired / revoked / unknown) —
     the page then shows an explanation instead of an empty form. */
  const [deadLink, setDeadLink] = useState("");
  /* { items: [{src, name}], index, title } while a photo is open full-size. */
  const [viewer, setViewer] = useState(null);

  const openViewer = useCallback((items, index, title) => {
    const clean = (items || []).filter((it) => it && it.src);
    if (!clean.length) return;
    setViewer({ items: clean, index: Math.max(0, Math.min(index, clean.length - 1)), title });
  }, []);
  const closeViewer = useCallback(() => setViewer(null), []);
  /* Wraps around, so ‹ on the first photo lands on the last one. */
  const moveViewer = useCallback((next) => {
    setViewer((prev) => {
      if (!prev) return prev;
      const total = prev.items.length;
      return { ...prev, index: ((next % total) + total) % total };
    });
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      setDeadLink("");
      try {
        const data = await fetchJson(`${API_BASE}/api/reports/public/${encodeURIComponent(token || "")}`, { method: "GET" });
        const rep = data?.report || data?.item || data?.data || data;
        if (!alive) return;
        setRecord(rep);
        const p = rep?.payload || {};
        setNotes(submittedNoteMap(p));
        setUploadedBy(submittedByName(p));
        setSubmittedFlag(
          !!p?.public?.submission?.closedEvidenceSubmittedAt ||
          !!p?.fields?.closedEvidenceSubmittedAt ||
          p?.public?.status === "evidence_submitted"
        );
        /* Best-effort read receipt so QA can see the branch opened the link.
           Never blocks or fails the page. */
        fetch(`${API_BASE}/api/reports/public/${encodeURIComponent(token || "")}/opened`, { method: "POST" })
          .catch(() => {});
      } catch (e) {
        if (!alive) return;
        if (LINK_MESSAGES[e?.code]) setDeadLink(LINK_MESSAGES[e.code]);
        else setErr(e?.message || "Failed to load report");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [token]);

  const payload = record?.payload || {};
  const header = payload.header || {};
  const branchName = reportBranchName(record);
  const table = useMemo(() => Array.isArray(payload.table) ? payload.table : [], [payload.table]);

  /* EVERY finding is listed, closed ones included, so the branch can see the
     whole audit and re-read what was already accepted. A closed row is strictly
     view-only: no file input, no notes box, and the server drops any evidence
     aimed at it — so listing it changes nothing about what can be written.
     Rows carry their ORIGINAL table position as `rowIndex`; every upload, note
     and submit keys off that `idx`, never the display order, so evidence always
     lands on the finding QA is looking at. */
  const allRows = useMemo(
    () => table.map((row, i) => {
      const declared = Number(row?.rowIndex);
      return { row, idx: Number.isInteger(declared) && declared >= 0 ? declared : i };
    }),
    [table]
  );
  const summary = payload.summary || {};
  const totalFindings = Number(summary.totalFindings) || table.length;
  const listedClosedCount = allRows.filter(({ row }) => isClosedStatus(row?.status)).length;
  /* Only > 0 while an old server build is still filtering closed rows out of
     the payload; then we say so instead of pretending the report is shorter. */
  const summaryClosed = Number(summary.closedFindings);
  const hiddenClosedCount = Number.isFinite(summaryClosed)
    ? Math.max(0, summaryClosed - listedClosedCount)
    : 0;

  /* Saved photos live in two places: the `closedEvidenceUpdates` list this
     portal writes, and the row itself once the server merged them in. Closed
     findings usually only have the row copy, so both are read. */
  const previousEvidence = useMemo(() => {
    const merged = { ...submittedEvidenceMap(payload) };
    allRows.forEach(({ row, idx }) => {
      const rowImgs = collectImageSrcs(row?.closedEvidenceImgs);
      if (!rowImgs.length) return;
      merged[idx] = Array.from(new Set([...(merged[idx] || []), ...rowImgs]));
    });
    return merged;
  }, [payload, allRows]);

  /* Per-finding verdicts. A finding the branch already submitted is locked
     while QA reviews it; a finding QA rejected unlocks again with the reason
     attached. Previously one final Send froze the whole page for good. */
  const rowStates = useMemo(
    () => allRows.map(({ row, idx }) => ({ row, idx, v: getRowVerification(row) })),
    [allRows]
  );
  const actionableRows = useMemo(
    () => rowStates.filter(({ v }) => v.state !== "pending" && v.state !== "accepted"),
    [rowStates]
  );
  const awaitingQaCount = rowStates.filter(({ v }) => v.state === "pending").length;
  const rejectedRows = rowStates.filter(({ v }) => v.state === "rejected");
  const hasVerdictData = rowStates.some(({ v }) => v.state);

  /* "Done" = nothing left for the branch to do right now. Falls back to the
     old submitted flag for reports that predate the verification cycle. */
  const done = hasVerdictData ? actionableRows.length === 0 : submittedFlag;

  const openRowIndexes = useMemo(() => actionableRows.map(({ idx }) => idx), [actionableRows]);
  /* Nothing to do: every finding is closed or already with QA (or the report
     has no findings at all). The rows are still listed — only the inputs and
     the send buttons go away. */
  const nothingPending = actionableRows.length === 0;
  const hasRows = rowStates.length > 0;
  const allOpenRowsHaveEvidence = openRowIndexes.length > 0 && openRowIndexes.every((idx) => {
    const previous = previousEvidence[idx] || [];
    const ready = uploads[idx] || [];
    return previous.length + ready.length > 0;
  });
  const completedOpenRows = openRowIndexes.filter((idx) => (previousEvidence[idx] || []).length + (uploads[idx] || []).length > 0).length;
  const missingOpenRows = openRowIndexes.filter((idx) => (previousEvidence[idx] || []).length + (uploads[idx] || []).length === 0);
  const missingMessage = missingOpenRows.length
    ? `Missing Closed Evidence for item(s): ${missingOpenRows.map((idx) => idx + 1).join(", ")}. / البنود التي ما زالت تحتاج صور إغلاق: ${missingOpenRows.map((idx) => idx + 1).join(", ")}`
    : "";
  const hasPendingChanges =
    Object.values(uploads).some((images) => Array.isArray(images) && images.length > 0) ||
    Object.keys(notes).some((idx) => String(notes[idx] || "") !== String(submittedNoteMap(payload)[idx] || "")) ||
    uploadedBy.trim() !== submittedByName(payload);

  async function handleFiles(rowIndex, files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    setErr("");
    setMsg("");
    try {
      const staged = list.map((file) => {
        if (!file.type?.startsWith("image/")) throw new Error("Only image files are allowed.");
        if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
        return {
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type,
          pending: true,
        };
      });
      setUploads((prev) => ({ ...prev, [rowIndex]: [...(prev[rowIndex] || []), ...staged] }));
      setMsg("Images selected only. They will be saved when you press Save Progress or Send Evidence. / تم اختيار الصور فقط، وسيتم حفظها عند الضغط على حفظ التقدم أو الإرسال.");
    } catch (e) {
      setErr(e?.message || "Image selection failed");
    }
  }

  function removePendingImage(rowIndex, imageIndex) {
    setUploads((prev) => {
      const rowImages = prev[rowIndex] || [];
      const removed = rowImages[imageIndex];
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      const nextImages = rowImages.filter((_, idx) => idx !== imageIndex);
      const next = { ...prev };
      if (nextImages.length) next[rowIndex] = nextImages;
      else delete next[rowIndex];
      return next;
    });
  }

  async function buildClosedEvidenceUpdates() {
    /* Closed findings are read-only. The server rejects any update aimed at
       one, so re-posting their saved photos would only bloat the request. */
    const closedIdx = new Set(
      allRows.filter(({ row }) => isClosedStatus(row?.status)).map(({ idx }) => idx)
    );
    const indexes = Array.from(new Set([
      ...Object.keys(previousEvidence).map(Number),
      ...Object.keys(uploads).map(Number),
      ...Object.keys(notes).map(Number),
    ])).filter((idx) => Number.isInteger(idx) && !closedIdx.has(idx));

    const updates = [];
    for (const rowIndex of indexes) {
      const previous = previousEvidence[rowIndex] || [];
      const ready = uploads[rowIndex] || [];
      const savedReady = [];
      for (const img of ready) {
        savedReady.push(img?.pending && img.file ? await uploadImage(img.file) : img);
      }
      const images = [...previous, ...savedReady].map(normalizeEvidenceImage).filter(Boolean);
      const item = { rowIndex, images, note: String(notes[rowIndex] || "") };
      if (item.images.length || item.note.trim()) updates.push(item);
    }
    return updates;
  }

  async function saveEvidence({ final = false } = {}) {
    const reportId = record?.id || record?._id;
    const savedAt = new Date().toISOString();
    const hasAnythingToSave =
      Object.values(previousEvidence).some((images) => Array.isArray(images) && images.length > 0) ||
      Object.values(uploads).some((images) => Array.isArray(images) && images.length > 0) ||
      Object.values(notes).some((note) => String(note || "").trim());
    if (!hasAnythingToSave) {
      setErr("Please upload at least one Closed Evidence image or write a note before saving.");
      return;
    }
    if (!uploadedBy.trim()) {
      setErr("Please write the supervisor name before saving. / الرجاء كتابة اسم الشخص الذي رفع الصور قبل الحفظ.");
      return;
    }
    if (final && !allOpenRowsHaveEvidence) {
      setErr(missingMessage || "Final submission requires Closed Evidence photos for every open item.");
      return;
    }
    if (!reportId) {
      setErr("Report ID is missing. Please refresh the link and try again.");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const closedEvidenceUpdates = await buildClosedEvidenceUpdates();
      if (!closedEvidenceUpdates.length) {
        setErr("Nothing to save — closed findings are view-only. / لا يوجد ما يتم حفظه، البنود المغلقة للعرض فقط.");
        return;
      }
      const data = await fetchJson(`${API_BASE}/api/reports/public/${encodeURIComponent(token || "")}/submit`, {
        method: "POST",
        body: JSON.stringify({
          submissionType: "inspection_closed_evidence",
          closedEvidenceUpdates,
          uploadedBy: uploadedBy.trim(),
          final,
        }),
      });
      const nextPayload = data?.report?.payload || mergeClosedEvidenceIntoPayload(payload, closedEvidenceUpdates, token, final, uploadedBy, savedAt);
      setRecord((prev) => ({ ...(prev || {}), payload: nextPayload }));
      Object.values(uploads).flat().forEach((img) => {
        if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      setUploads({});
      setSubmittedFlag(final);
      setMsg(final
        ? "Evidence sent. QA will review each finding and either close it or send it back with a reason. / تم إرسال الأدلة، ستقوم الجودة بمراجعة كل بند وإغلاقه أو إعادته مع ذكر السبب."
        : "Progress saved. You can use the same link later to add remaining photos.");
    } catch (e) {
      /* A link can expire between opening the page and pressing Send. */
      if (LINK_MESSAGES[e?.code]) setDeadLink(LINK_MESSAGES[e.code]);
      else setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={S.page}>
      <div style={S.wrap}>
        <div style={S.head}>
          <div style={S.brand}>
            <img src="/assets/almawashi-logo.jpg" alt="Al Mawashi" style={S.logo} />
            <div>
              <div style={S.title}>AL MAWASHI QMS</div>
              <div style={{ fontSize: 16, fontWeight: 950, marginTop: 4 }}>Corrective Evidence Portal / بوابة الصور التصحيحية</div>
              <div style={S.sub}>Read-only report. Add closed evidence photos and notes for every open item. / التقرير للعرض فقط، أضف صور الإغلاق والملاحظات.</div>
            </div>
          </div>
          <div style={S.topActions}>
            <div style={S.account}>
              <div style={S.accountMark}>{done ? "QA" : allOpenRowsHaveEvidence ? "R" : "P"}</div>
              <div style={S.accountText}>
                <div>Status / الحالة</div>
                <div>
                  {!done
                    ? allOpenRowsHaveEvidence
                      ? "Ready / جاهز"
                      : "Pending / قيد الانتظار"
                    : awaitingQaCount > 0
                    ? "Under QA review / قيد مراجعة الجودة"
                    : "Completed / مكتمل"}
                </div>
              </div>
            </div>
            <span style={S.badge(done ? "#16a34a" : allOpenRowsHaveEvidence ? "#15803d" : "#d97706")}>
              {!done
                ? `${completedOpenRows}/${openRowIndexes.length}`
                : awaitingQaCount > 0
                ? `${awaitingQaCount} with QA`
                : "All closed"}
            </span>
          </div>
        </div>

        {loading && <div style={S.card}>Loading...</div>}
        {deadLink && (
          <div style={{ ...S.card, textAlign: "center", padding: "clamp(24px, 4vw, 48px)" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 8 }}>Link unavailable / الرابط غير متاح</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", lineHeight: 1.7 }}>{deadLink}</div>
          </div>
        )}
        {err && <div style={S.err}>{err}</div>}
        {msg && <div style={S.msg}>{msg}</div>}

        {!loading && !deadLink && record && (
          <>
            <div style={S.infoBand}>
              <div style={S.searchLike}>Evidence link / رابط الصور: {safe(branchName, "selected branch")}</div>
              <div style={S.statChip}>{totalFindings} Items / بنود</div>
              <div style={S.statChip}>{openRowIndexes.length} Open / مفتوح</div>
              <div style={S.statChip}>{completedOpenRows} Ready / جاهز</div>
              <div style={S.statChip}>{listedClosedCount + hiddenClosedCount} Closed / مغلق</div>
            </div>

            <section style={S.reportCard}>
              <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 8 }}>
                {safe(payload.title, "Internal Audit Report")}
              </div>
              <div style={S.meta}>
                <div>Branch: {safe(branchName)}</div>
                <div>Date: {safe(header.date)}</div>
                <div>Report No: {safe(header.reportNo)}</div>
                <div>Audited By: {safe(header.auditConductedBy)}</div>
              </div>
              {(!nothingPending || uploadedBy.trim()) && (
                <div
                  style={{
                    ...S.uploaderCard,
                    ...(!done && !uploadedBy.trim() ? S.uploaderCardMissing : null),
                  }}
                >
                  <div style={S.uploaderTop}>
                    <div style={{ ...S.uploaderIcon, ...(!done && !uploadedBy.trim() ? { background: "#dc2626" } : null) }}>👤</div>
                    <div style={{ minWidth: 0 }}>
                      <label htmlFor="uploadedBy" style={S.uploaderLabel}>
                        Supervisor Name / اسم المشرف {!done && <span style={S.req}>*</span>}
                      </label>
                      <div style={S.uploaderHint}>
                        Write the full name of the person uploading these photos — it is saved with the evidence. /
                        {" "}اكتب الاسم الكامل للشخص الذي يقوم برفع الصور، يتم حفظه مع الأدلة.
                      </div>
                    </div>
                  </div>
                  {done ? (
                    <div style={S.uploaderValue}>{safe(uploadedBy, "-")}</div>
                  ) : (
                    <>
                      <input
                        id="uploadedBy"
                        style={{ ...S.uploaderInput, ...(uploadedBy.trim() ? null : S.uploaderInputMissing) }}
                        value={uploadedBy}
                        onChange={(e) => setUploadedBy(e.target.value)}
                        placeholder="e.g. Ahmad Ali / مثال: أحمد علي"
                        autoComplete="name"
                      />
                      {!uploadedBy.trim() && (
                        <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900, color: "#b91c1c" }}>
                          Required before saving or sending. / مطلوب قبل الحفظ أو الإرسال.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>

            <section style={S.card}>
              <div style={S.sectionHead}>
                <div style={S.sectionTitle}>All Findings / جميع البنود</div>
                <span style={S.badge(nothingPending || done || allOpenRowsHaveEvidence ? "#15803d" : "#d97706")}>
                  {nothingPending ? "Nothing pending" : done ? "Under QA review" : allOpenRowsHaveEvidence ? "Ready to send" : "Evidence required"}
                </span>
              </div>

              {/* Findings QA sent back — this is what the branch must fix now. */}
              {rejectedRows.length > 0 && (
                <div style={S.missing}>
                  ✖ QA returned {rejectedRows.length} finding(s): #{rejectedRows.map(({ idx }) => idx + 1).join(", #")}.
                  Read the reason on each one and upload new evidence. /
                  {" "}أعادت الجودة {rejectedRows.length} بند، اقرأ السبب على كل بند وارفع صوراً جديدة.
                </div>
              )}

              {awaitingQaCount > 0 && (
                <div style={{ ...S.hint, background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8" }}>
                  ⏳ {awaitingQaCount} finding(s) are with QA for review — no action needed on those. /
                  {" "}{awaitingQaCount} بند قيد المراجعة لدى الجودة، لا حاجة لأي إجراء عليها.
                </div>
              )}

              {/* Closed findings are listed too, but read-only — say so, so
                  nobody waits for an upload button that will never appear. */}
              {listedClosedCount > 0 && (
                <div style={{ ...S.hint, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                  ✔ {listedClosedCount} closed finding(s) are shown for reference only — their photos can be viewed and downloaded, but nothing new can be uploaded. /
                  {" "}يتم عرض {listedClosedCount} بند مغلق للاطلاع فقط، يمكن عرض صورها وتنزيلها دون إمكانية رفع صور جديدة.
                </div>
              )}

              {/* Only appears while an old server build still strips them out. */}
              {hiddenClosedCount > 0 && (
                <div style={{ ...S.hint, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                  ✔ {hiddenClosedCount} closed finding(s) are already verified and are not shown here. /
                  {" "}تم إغلاق {hiddenClosedCount} بند مسبقاً ولا تظهر هنا.
                </div>
              )}

              {!hasRows ? (
                <div style={{ ...S.readonly, textAlign: "center", padding: 24, fontWeight: 900 }}>
                  {totalFindings > 0
                    ? "✔ All findings in this report are closed — nothing to upload. / تم إغلاق جميع البنود، لا حاجة لرفع أي صور."
                    : "No findings were recorded in this report. / لا توجد بنود مسجلة في هذا التقرير."}
                </div>
              ) : (
                <>
              {nothingPending && (
                <div style={{ ...S.readonly, textAlign: "center", padding: 16, fontWeight: 900 }}>
                  ✔ Nothing to upload right now — every finding below is closed or already with QA. / لا يوجد ما يتم رفعه حالياً، جميع البنود أدناه مغلقة أو قيد مراجعة الجودة.
                </div>
              )}
              {!done && (
                <div style={S.hint}>
                  Save Progress keeps current photos and notes. Final Send opens only when every open item has a Closed Evidence photo. / حفظ التقدم يحفظ الصور والملاحظات، وزر الإرسال النهائي لا يعمل إلا بعد رفع صورة إغلاق لكل بند مفتوح.
                </div>
              )}
              {!done && missingMessage && <div style={S.missing}>{missingMessage}</div>}
              {rowStates.map(({ row, idx, v }) => {
                  const ready = uploads[idx] || [];
                  const previous = previousEvidence[idx] || [];
                  const isClosed = isClosedStatus(row.status);
                  const hasEvidence = previous.length + ready.length > 0;
                  /* Locked while QA holds it; unlocked the moment QA rejects.
                     A closed finding is locked for good — view only. */
                  const locked = isClosed || v.state === "pending" || v.state === "accepted";
                  const tone = verificationTone(v.state);
                  const subLine = isClosed
                    ? "Closed — view only / مغلق — للعرض فقط"
                    : v.state === "pending"
                    ? "With QA for review / قيد المراجعة لدى الجودة"
                    : v.state === "rejected"
                    ? "Returned by QA — upload new evidence / أعادته الجودة، ارفع صوراً جديدة"
                    : hasEvidence
                    ? "Closed evidence attached / تم إرفاق صور الإغلاق"
                    : "Waiting for branch evidence / بانتظار صور الفرع";
                  const originalItems = (Array.isArray(row.evidenceImgs) ? row.evidenceImgs : [])
                    .map((img, i) => ({ src: imageSrc(img), name: `finding-${idx + 1}-original-${i + 1}${(fileNameFromUrl(imageSrc(img)).match(/\.[a-z0-9]{2,5}$/i) || [".jpg"])[0]}` }))
                    .filter((it) => it.src);
                  /* Saved and just-selected photos share one viewer list so ‹ ›
                     walks through all photos of the finding in order. */
                  const closedItems = [
                    ...previous.map((img, i) => ({
                      src: imageSrc(img),
                      name: img?.name || `finding-${idx + 1}-closed-${i + 1}${(fileNameFromUrl(imageSrc(img)).match(/\.[a-z0-9]{2,5}$/i) || [".jpg"])[0]}`,
                    })),
                    ...ready.map((img) => ({ src: imageSrc(img), name: img?.name || "" })),
                  ].filter((it) => it.src);
                return (
                  <div
                    key={idx}
                    style={{
                      ...S.row,
                      ...(v.state === "rejected" ? { borderColor: "#fca5a5", borderWidth: 2 } : null),
                      ...(isClosed ? { borderColor: "#bbf7d0", background: "#f7fefb" } : null),
                    }}
                  >
                    <div style={S.rowTop}>
                      <div style={S.rowIdentity}>
                        <div style={S.rowIcon(isClosed || v.state === "accepted")}>{idx + 1}</div>
                        <div>
                          <div style={S.rowTitle}>Finding #{idx + 1} / البند #{idx + 1}</div>
                          <div style={S.rowSub}>{subLine}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {isClosed && <span style={S.viewOnly}>🔒 View only / للعرض فقط</span>}
                        <span style={S.badge(isClosed ? "#16a34a" : v.state === "pending" ? "#1d4ed8" : v.state === "rejected" ? "#b91c1c" : hasEvidence ? "#15803d" : "#d97706")}>
                          {safe(row.status, "Open")}
                        </span>
                      </div>
                    </div>

                    {/* QA's verdict, in the branch's own language. A rejection
                        without a visible reason is just a silent bounce. */}
                    {tone && (
                      <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 6, background: tone.bg, color: tone.color, fontSize: 14, fontWeight: 850, lineHeight: 1.6 }}>
                        <div>{tone.label} / {tone.labelAr}</div>
                        {(v.by || v.at) && (
                          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.85, marginTop: 2 }}>
                            {[v.by, v.at ? new Date(v.at).toLocaleString("en-GB") : ""].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {v.state === "rejected" && v.reason && (
                          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 900 }}>
                            Reason / السبب: {v.reason}
                          </div>
                        )}
                      </div>
                    )}

                    <label style={S.label}>Non-Conformance / عدم المطابقة</label>
                    <div style={S.readonly}>{safe(row.nonConformance)}</div>
                    <label style={S.label}>Corrective / Preventive Action / الإجراء التصحيحي والوقائي</label>
                    <div style={S.readonly}>{safe(row.corrective)}</div>
                    {originalItems.length > 0 && (
                      <>
                        <label style={S.label}>Original Evidence Photos / الصور الأصلية للمشكلة</label>
                        <div style={S.thumbs}>
                          {originalItems.map((it, imgIdx) => (
                            <div key={`${it.src}-${imgIdx}`} style={S.thumbBox}>
                              <button
                                type="button"
                                style={S.thumbBtn}
                                onClick={() => openViewer(originalItems, imgIdx, `Finding #${idx + 1} — Original evidence / الصور الأصلية`)}
                                title="Click to enlarge / اضغط للتكبير"
                              >
                                <img src={it.src} alt="Original evidence" style={S.thumb} />
                              </button>
                              <button
                                type="button"
                                style={S.thumbDl}
                                onClick={() => downloadImage(it.src, it.name)}
                                title="Download / تنزيل"
                              >
                                ⤓
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    <label style={S.label}>Closed Evidence Photos / صور الإجراء التصحيحي</label>
                    {locked ? (
                      <div style={S.readonly}>
                        {isClosed
                          ? "🔒 This finding is closed — photos can be viewed and downloaded, but uploading is disabled. / هذا البند مغلق، يمكن عرض الصور وتنزيلها فقط ولا يمكن رفع صور جديدة."
                          : v.state === "pending"
                          ? "Submitted — waiting for the QA verdict. / تم الإرسال، بانتظار قرار الجودة."
                          : "Verified and closed by QA. / تم التحقق والإغلاق من قبل الجودة."}
                      </div>
                    ) : (
                      <input type="file" accept="image/*" multiple style={S.file} disabled={saving} onChange={(e) => handleFiles(idx, e.target.files)} />
                    )}
                    {closedItems.length > 0 && (
                      <div style={S.thumbs}>
                        {previous.map((img, imgIdx) => (
                          <div key={`${imageSrc(img)}-${imgIdx}`} style={S.thumbBox}>
                            <button
                              type="button"
                              style={S.thumbBtn}
                              onClick={() => openViewer(closedItems, imgIdx, `Finding #${idx + 1} — Closed evidence / صور الإغلاق`)}
                              title="Click to enlarge / اضغط للتكبير"
                            >
                              <img src={imageSrc(img)} alt={img?.name || "Saved closed evidence"} style={S.thumb} />
                            </button>
                            <button
                              type="button"
                              style={S.thumbDl}
                              onClick={() => downloadImage(imageSrc(img), closedItems[imgIdx]?.name)}
                              title="Download / تنزيل"
                            >
                              ⤓
                            </button>
                          </div>
                        ))}
                        {ready.map((img, imgIdx) => (
                          <div key={`${imageSrc(img)}-${imgIdx}`} style={S.thumbBox}>
                            <button
                              type="button"
                              style={S.thumbBtn}
                              onClick={() => openViewer(closedItems, previous.length + imgIdx, `Finding #${idx + 1} — Closed evidence / صور الإغلاق`)}
                              title="Click to enlarge / اضغط للتكبير"
                            >
                              <img src={imageSrc(img)} alt={img.name || "Selected closed evidence"} style={S.thumb} />
                            </button>
                            <button type="button" style={S.removeThumb} onClick={() => removePendingImage(idx, imgIdx)} title="Remove selected image">x</button>
                            <span style={S.pendingTag}>Selected</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <label style={S.label}>Branch Notes / ملاحظات الفرع</label>
                    {locked ? (
                      /* Closed rows keep their note on the row itself, not in
                         the updates list the notes map is built from. */
                      <div style={S.readonly}>{safe(notes[idx] || row.closedEvidenceNote, "-")}</div>
                    ) : (
                      <textarea
                        style={S.textarea}
                        value={notes[idx] || ""}
                        onChange={(e) => setNotes((prev) => ({ ...prev, [idx]: e.target.value }))}
                        placeholder="Write any notes about the corrective evidence... / اكتب أي ملاحظات توضيحية للمشرف"
                      />
                    )}
                  </div>
                );
              })}
                </>
              )}
            </section>

            <div style={S.actions}>
              <button style={S.ghost} disabled>
                {!nothingPending
                  ? `${completedOpenRows}/${openRowIndexes.length} open item(s) with evidence`
                  : awaitingQaCount > 0
                  ? `${awaitingQaCount} finding(s) with QA — nothing to do right now`
                  : "Nothing to upload / لا يوجد ما يتم رفعه"}
              </button>
              {!done && !nothingPending && (
                <button style={{ ...S.amberBtn, opacity: saving || !hasPendingChanges ? 0.55 : 1 }} onClick={() => saveEvidence({ final: false })} disabled={saving || !hasPendingChanges}>
                  {saving ? "Working..." : "Save Progress"}
                </button>
              )}
              {!done && !nothingPending && (
                <button style={{ ...S.btn, opacity: saving || !allOpenRowsHaveEvidence ? 0.55 : 1 }} onClick={() => saveEvidence({ final: true })} disabled={saving || !allOpenRowsHaveEvidence}>
                  {saving ? "Working..." : "Send Evidence"}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {viewer && (
        <PhotoViewer
          items={viewer.items}
          index={viewer.index}
          title={viewer.title}
          onClose={closeViewer}
          onIndex={moveViewer}
        />
      )}
    </main>
  );
}
