import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

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
  if (!res.ok) throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  return data;
}

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
  thumb: { width: "100%", height: "clamp(90px, 9vw, 150px)", objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1" },
  thumbBox: { position: "relative", minWidth: 0 },
  removeThumb: { position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 999, border: "1px solid rgba(15,23,42,.18)", background: "rgba(255,255,255,.94)", color: "#b91c1c", fontWeight: 1000, cursor: "pointer", boxShadow: "0 4px 12px rgba(15,23,42,.18)" },
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

export default function InspectionEvidencePublic() {
  const { token } = useParams();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploads, setUploads] = useState({});
  const [notes, setNotes] = useState({});
  const [uploadedBy, setUploadedBy] = useState("");
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchJson(`${API_BASE}/api/reports/public/${encodeURIComponent(token || "")}`, { method: "GET" });
        const rep = data?.report || data?.item || data?.data || data;
        if (!alive) return;
        setRecord(rep);
        const p = rep?.payload || {};
        setNotes(submittedNoteMap(p));
        setUploadedBy(submittedByName(p));
        setDone(
          !!p?.public?.submission?.closedEvidenceSubmittedAt ||
          !!p?.fields?.closedEvidenceSubmittedAt ||
          p?.public?.status === "evidence_submitted"
        );
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load report");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [token]);

  const payload = record?.payload || {};
  const header = payload.header || {};
  const table = useMemo(() => Array.isArray(payload.table) ? payload.table : [], [payload.table]);
  const previousEvidence = submittedEvidenceMap(payload);
  const openRowIndexes = useMemo(
    () => table.map((row, idx) => ({ row, idx })).filter(({ row }) => String(row?.status || "").toLowerCase() !== "closed").map(({ idx }) => idx),
    [table]
  );
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
    const indexes = Array.from(new Set([
      ...Object.keys(previousEvidence).map(Number),
      ...Object.keys(uploads).map(Number),
      ...Object.keys(notes).map(Number),
    ])).filter((idx) => Number.isInteger(idx));

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
      const existingFields = payload.fields && typeof payload.fields === "object" ? payload.fields : {};
      const nextTable = Array.isArray(payload.table) ? payload.table.map((row, idx) => {
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
      const nextPayload = {
        ...payload,
        table: nextTable,
        fields: {
          ...existingFields,
          closedEvidenceUpdates,
          closedEvidenceProgressSavedAt: savedAt,
          closedEvidenceSubmittedAt: final ? savedAt : existingFields.closedEvidenceSubmittedAt || null,
          closedEvidenceUploadedBy: uploadedBy.trim(),
          submittedBy: safe(header.location || record?.branch, "branch"),
          submissionType: "inspection_closed_evidence",
        },
        public: {
          ...(payload.public && typeof payload.public === "object" ? payload.public : {}),
          token,
          submittedAt: final ? savedAt : payload.public?.submittedAt || null,
          status: final ? "evidence_submitted" : "evidence_in_progress",
        },
      };

      await fetchJson(`${API_BASE}/api/reports/${encodeURIComponent(reportId)}`, {
        method: "PUT",
        body: JSON.stringify({
          type: record?.type || "internal_multi_audit",
          payload: nextPayload,
        }),
      });
      setRecord((prev) => ({ ...(prev || {}), payload: nextPayload }));
      Object.values(uploads).flat().forEach((img) => {
        if (img?.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
      setUploads({});
      setDone(final);
      setMsg(final ? "Closed Evidence sent successfully. QA will review and close the status." : "Progress saved. You can use the same link later to add remaining photos.");
    } catch (e) {
      setErr(e?.message || "Save failed");
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
              <div style={S.accountMark}>{done ? "OK" : allOpenRowsHaveEvidence ? "R" : "P"}</div>
              <div style={S.accountText}>
                <div>Status / الحالة</div>
                <div>{done ? "Submitted / تم الإرسال" : allOpenRowsHaveEvidence ? "Ready / جاهز" : "Pending / قيد الانتظار"}</div>
              </div>
            </div>
            <span style={S.badge(done ? "#16a34a" : allOpenRowsHaveEvidence ? "#15803d" : "#d97706")}>
              {completedOpenRows}/{openRowIndexes.length}
            </span>
          </div>
        </div>

        {loading && <div style={S.card}>Loading...</div>}
        {err && <div style={S.err}>{err}</div>}
        {msg && <div style={S.msg}>{msg}</div>}

        {!loading && record && (
          <>
            <div style={S.infoBand}>
              <div style={S.searchLike}>Evidence link / رابط الصور: {safe(record.branch || header.location, "selected branch")}</div>
              <div style={S.statChip}>{table.length} Items / بنود</div>
              <div style={S.statChip}>{openRowIndexes.length} Open / مفتوح</div>
              <div style={S.statChip}>{completedOpenRows} Ready / جاهز</div>
            </div>

            <section style={S.reportCard}>
              <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 8 }}>
                {safe(payload.title, "Internal Audit Report")}
              </div>
              <div style={S.meta}>
                <div>Branch: {safe(record.branch || header.location)}</div>
                <div>Date: {safe(header.date)}</div>
                <div>Report No: {safe(header.reportNo)}</div>
                <div>Audited By: {safe(header.auditConductedBy)}</div>
              </div>
              <label style={S.label}>Uploaded By / اسم الشخص الذي قام برفع الصور</label>
              {done ? (
                <div style={S.readonly}>{safe(uploadedBy, "-")}</div>
              ) : (
                <input
                  style={S.input}
                  value={uploadedBy}
                  onChange={(e) => setUploadedBy(e.target.value)}
                  placeholder="Supervisor name / اسم المشرف"
                />
              )}
            </section>

            <section style={S.card}>
              <div style={S.sectionHead}>
                <div style={S.sectionTitle}>Report Findings</div>
                <span style={S.badge(allOpenRowsHaveEvidence ? "#15803d" : "#d97706")}>
                  {allOpenRowsHaveEvidence ? "Ready to send" : "Evidence required"}
                </span>
              </div>
              {!done && (
                <div style={S.hint}>
                  Save Progress keeps current photos and notes. Final Send opens only when every open item has a Closed Evidence photo. / حفظ التقدم يحفظ الصور والملاحظات، وزر الإرسال النهائي لا يعمل إلا بعد رفع صورة إغلاق لكل بند مفتوح.
                </div>
              )}
              {!done && missingMessage && <div style={S.missing}>{missingMessage}</div>}
              {table.length === 0 && <div style={S.readonly}>No rows found in this report.</div>}
              {table.map((row, idx) => {
                  const ready = uploads[idx] || [];
                  const previous = previousEvidence[idx] || [];
                  const isClosed = String(row.status || "").toLowerCase() === "closed";
                  const hasEvidence = previous.length + ready.length > 0;
                return (
                  <div key={idx} style={S.row}>
                    <div style={S.rowTop}>
                      <div style={S.rowIdentity}>
                        <div style={S.rowIcon(isClosed)}>{idx + 1}</div>
                        <div>
                          <div style={S.rowTitle}>Finding #{idx + 1} / البند #{idx + 1}</div>
                          <div style={S.rowSub}>{hasEvidence ? "Closed evidence attached / تم إرفاق صور الإغلاق" : isClosed ? "Already closed / مغلق مسبقاً" : "Waiting for branch evidence / بانتظار صور الفرع"}</div>
                        </div>
                      </div>
                      <span style={S.badge(isClosed ? "#16a34a" : hasEvidence ? "#15803d" : "#d97706")}>{safe(row.status, "Open")}</span>
                    </div>
                    <label style={S.label}>Non-Conformance / عدم المطابقة</label>
                    <div style={S.readonly}>{safe(row.nonConformance)}</div>
                    <label style={S.label}>Corrective / Preventive Action / الإجراء التصحيحي والوقائي</label>
                    <div style={S.readonly}>{safe(row.corrective)}</div>
                    {Array.isArray(row.evidenceImgs) && row.evidenceImgs.length > 0 && (
                      <>
                        <label style={S.label}>Original Evidence Photos / الصور الأصلية للمشكلة</label>
                        <div style={S.thumbs}>
                          {row.evidenceImgs.map((src, imgIdx) => (
                            <a key={`${src}-${imgIdx}`} href={src} target="_blank" rel="noreferrer">
                              <img src={src} alt="Original evidence" style={S.thumb} />
                            </a>
                          ))}
                        </div>
                      </>
                    )}
                    <label style={S.label}>Closed Evidence Photos / صور الإجراء التصحيحي</label>
                    {done ? (
                      <div style={S.readonly}>Evidence already submitted for this link.</div>
                    ) : (
                      <input type="file" accept="image/*" multiple style={S.file} disabled={saving || isClosed} onChange={(e) => handleFiles(idx, e.target.files)} />
                    )}
                    {(ready.length > 0 || previous.length > 0) && (
                      <div style={S.thumbs}>
                        {previous.map((img, imgIdx) => (
                          <img key={`${imageSrc(img)}-${imgIdx}`} src={imageSrc(img)} alt={img.name || "Saved closed evidence"} style={S.thumb} />
                        ))}
                        {ready.map((img, imgIdx) => (
                          <div key={`${imageSrc(img)}-${imgIdx}`} style={S.thumbBox}>
                            <img src={imageSrc(img)} alt={img.name || "Selected closed evidence"} style={S.thumb} />
                            <button type="button" style={S.removeThumb} onClick={() => removePendingImage(idx, imgIdx)} title="Remove selected image">x</button>
                            <span style={S.pendingTag}>Selected</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <label style={S.label}>Branch Notes / ملاحظات الفرع</label>
                    {done || isClosed ? (
                      <div style={S.readonly}>{safe(notes[idx], "-")}</div>
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
            </section>

            <div style={S.actions}>
              <button style={S.ghost} disabled>
                {completedOpenRows}/{openRowIndexes.length} open item(s) with evidence
              </button>
              {!done && (
                <button style={{ ...S.amberBtn, opacity: saving || !hasPendingChanges ? 0.55 : 1 }} onClick={() => saveEvidence({ final: false })} disabled={saving || !hasPendingChanges}>
                  {saving ? "Working..." : "Save Progress"}
                </button>
              )}
              {!done && (
                <button style={{ ...S.btn, opacity: saving || !allOpenRowsHaveEvidence ? 0.55 : 1 }} onClick={() => saveEvidence({ final: true })} disabled={saving || !allOpenRowsHaveEvidence}>
                  {saving ? "Working..." : "Send Evidence"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
