// src/pages/monitor/InternalAuditReportsView.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import SignatureName from "../shared/SignatureName";
import {
  buildInspectionEvidencePublic,
  revokeInspectionEvidencePublic,
  getEvidenceLinkState,
  getInspectionPublicOrigin,
  isShareableEvidenceUrl,
} from "../../utils/inspectionPublicLink";
import EmailSendModal from "../shared/EmailSendModal";
import { internalAuditEmailConfig } from "./internalAuditEmailConfig";
import {
  getRowVerification,
  isAwaitingQa,
  countAwaitingQa,
  acceptRowPatch,
  rejectRowPatch,
  currentUserName,
  verificationTone,
} from "../../utils/auditVerification";
import API_BASE from "../../config/api";
import {
  INSPECTION_BRANCHES,
  canonicalInspectionBranch,
  getInspectionBranchLabel,
} from "../inspection/inspectionBranches";

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE_KEY = "internal_multi_audit";

function getImageUrl(img) {
  if (!img) return "";
  if (typeof img === "string") return img;
  if (typeof img === "object") {
    return (
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
      getImageUrl(img.image) ||
      getImageUrl(img.file) ||
      ""
    );
  }
  return "";
}

function collectImageUrls(source) {
  if (!source) return [];
  if (Array.isArray(source)) return source.flatMap(collectImageUrls);
  const direct = getImageUrl(source);
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
  return buckets.flatMap(collectImageUrls);
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
    const images = collectImageUrls(value);
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

function getBranchEvidenceUpdates(payload = {}) {
  const sources = [
    payload?.public?.submission?.closedEvidenceUpdates,
    payload?.fields?.closedEvidenceUpdates,
    payload?.closedEvidenceUpdates,
  ].filter(Array.isArray);
  const legacySources = [
    payload?.fields,
    payload?.public?.submission,
    payload?.public,
    payload,
  ].flatMap(collectLegacyEvidenceItems);
  const byRow = new Map();
  [...sources.flat(), ...legacySources].forEach((item) => {
    const rowIndex = Number(item?.rowIndex);
    if (!Number.isInteger(rowIndex)) return;
    const existing = byRow.get(rowIndex) || { rowIndex, images: [], note: "" };
    const normalizedImages = collectImageUrls(item);
    byRow.set(rowIndex, {
      rowIndex,
      images: Array.from(new Set([...existing.images, ...normalizedImages])).filter(Boolean),
      note: String(item?.note || existing.note || ""),
    });
  });
  return Array.from(byRow.values());
}

function getBranchEvidenceForRow(payload = {}, rowIndex) {
  const updates = getBranchEvidenceUpdates(payload);
  const found = updates.find((x) => Number(x?.rowIndex) === Number(rowIndex));
  return Array.isArray(found?.images) ? found.images.map((img) => getImageUrl(img)).filter(Boolean) : [];
}

function getRowClosedEvidenceImages(row = {}) {
  return collectImageUrls({
    closedEvidenceImgs: row?.closedEvidenceImgs,
    closedEvidenceImages: row?.closedEvidenceImages,
    closedEvidence: row?.closedEvidence,
    closureEvidence: row?.closureEvidence,
    correctiveEvidence: row?.correctiveEvidence,
    correctiveEvidenceImgs: row?.correctiveEvidenceImgs,
    closedAttachments: row?.closedAttachments,
  });
}

function getBranchEvidenceNoteForRow(payload = {}, rowIndex) {
  const updates = getBranchEvidenceUpdates(payload);
  const found = updates.find((x) => Number(x?.rowIndex) === Number(rowIndex));
  return String(found?.note || "");
}

function getBranchEvidenceUploadedBy(payload = {}) {
  return String(
    payload?.fields?.closedEvidenceUploadedBy ||
      payload?.public?.submission?.closedEvidenceUploadedBy ||
      ""
  ).trim();
}

function getBranchEvidenceStatus(payload = {}) {
  const table = Array.isArray(payload.table) ? payload.table : [];
  const allClosed = table.length > 0 && table.every((row) => String(row?.status || "").toLowerCase() === "closed");
  if (allClosed) return { label: "Closed by QA", ar: "أغلقتها الجودة", tone: "ok", bg: "#dcfce7", color: "#166534" };
  /* Findings waiting on a QA verdict outrank every other state — this is the
     queue somebody has to work through. */
  const awaiting = countAwaitingQa(table);
  if (awaiting > 0) {
    return { label: `${awaiting} Awaiting QA Verification`, ar: `${awaiting} بانتظار تحقق الجودة`, tone: "info", bg: "#dbeafe", color: "#1d4ed8" };
  }
  const rejected = table.filter((row) => getRowVerification(row).state === "rejected").length;
  if (rejected > 0) {
    return { label: `${rejected} Rejected — resubmit`, ar: `${rejected} مرفوضة — إعادة إرسال`, tone: "bad", bg: "#fee2e2", color: "#991b1b" };
  }
  if (payload?.fields?.closedEvidenceSubmittedAt || payload?.public?.status === "evidence_submitted") {
    return { label: "Evidence Submitted", ar: "تم إرسال الأدلة", tone: "info", bg: "#dbeafe", color: "#1d4ed8" };
  }
  if (payload?.fields?.closedEvidenceProgressSavedAt || payload?.public?.status === "evidence_in_progress" || getBranchEvidenceUpdates(payload).length > 0) {
    return { label: "Evidence In Progress", ar: "الأدلة قيد الرفع", tone: "warn", bg: "#fef3c7", color: "#92400e" };
  }
  return { label: "Pending Evidence", ar: "بانتظار الأدلة", tone: "bad", bg: "#fee2e2", color: "#991b1b" };
}

function mergeBranchEvidenceIntoPayload(payload = {}) {
  const table = Array.isArray(payload.table) ? payload.table : [];
  const nextTable = table.map((row, idx) => {
    const existing = getRowClosedEvidenceImages(row);
    const incoming = getBranchEvidenceForRow(payload, idx);
    /* No cap here on purpose — an earlier .slice(0, 5) silently threw away
       branch evidence beyond the fifth photo once it was merged back in. */
    const merged = Array.from(new Set([...existing, ...incoming]));
    const note = getBranchEvidenceNoteForRow(payload, idx);
    const nextRow = {
      ...(row || {}),
      ...(merged.length !== existing.length ? { closedEvidenceImgs: merged } : {}),
      ...(note ? { closedEvidenceNote: note } : {}),
    };
    return nextRow;
  });
  const nextFields = payload.fields && typeof payload.fields === "object"
    ? { ...payload.fields, closedEvidenceUpdates: [] }
    : payload.fields;
  const nextPublic = payload.public && typeof payload.public === "object"
    ? { ...payload.public, submission: { ...(payload.public.submission || {}), closedEvidenceUpdates: [] } }
    : payload.public;
  return { ...payload, table: nextTable, fields: nextFields, public: nextPublic, closedEvidenceUpdates: [] };
}

/* Debug viewer */
const SHOW_DEBUG = false;

/* ===== Branch list =====
 * Single source of truth: pages/inspection/inspectionBranches.js — the SAME
 * list the entry form and the annual plan use. This page used to keep its own
 * copy, which drifted (it was missing Al Warqa Kitchen), so a report could be
 * filed under one branch here and another one there. QCS (warehouse) and
 * PRODUCTION are two separate rows — a legacy report saved as "PRODUCTION" or
 * "QCS- PRODUCTION" resolves to the PRODUCTION row.
 *
 * The matcher survives mixed case, missing spaces, em-dashes, Arabic spelling
 * variants and typos — legacy reports stored the branch as free text in the
 * retired `header.location` field, and that text is all they have.
 */
const canonicalBranchName = canonicalInspectionBranch;
const getBranchLabel = (code, lang) => getInspectionBranchLabel(code, lang);
const BRANCH_CODES = INSPECTION_BRANCHES.map((b) => b.code);

/* ===== Helpers ===== */
function safe(obj, path, fb) {
  try {
    return (
      path
        .split(".")
        .reduce(
          (o, k) => (o && o[k] != null ? o[k] : undefined),
          obj
        ) ?? fb
    );
  } catch {
    return fb;
  }
}

function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}

/* مرن لتواريخ الهيدر: يقبل YYYY-MM-DD أو DD/MM/YYYY أو DD-MM-YYYY */
function toTsFromHeaderDate(s) {
  if (!s || typeof s !== "string") return 0;
  const trimmed = s.trim();
  const iso = Date.parse(trimmed);
  if (Number.isFinite(iso)) return iso;
  const m = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(trimmed);
  if (m) {
    const d = Number(m[1]);
    const mo = Number(m[2]);
    const y = m[3].length === 2 ? Number("20" + m[3]) : Number(m[3]);
    if (y && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return Date.UTC(y, mo - 1, d);
    }
  }
  return 0;
}

/* ✅ Upload image to Cloudinary via /api/images → returns URL.
 *    Replaces the old base64 path that was bloating the DB and crashing the server.
 *    Keeps the same client-side compression to <=1280px / quality 0.8 to keep uploads small. */
async function uploadCompressedToCloudinary(file, maxSide = 1280, quality = 0.8) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
  );
  if (!blob) throw new Error("Failed to compress image");
  const fd = new FormData();
  fd.append("file", blob, (file.name || "image").replace(/\.\w+$/, "") + ".jpg");
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  }
  return data.optimized_url || data.url;
}

/* === حساب نسبة العناصر المغلقة بشكل قوي === */
function isClosedStatus(v) {
  return /^\s*closed\s*$/i.test(String(v ?? ""));
}
function calcClosedPct(table = []) {
  const total = table.length;
  if (!total) return 0;
  const closed = table.filter((r) => isClosedStatus(r?.status)).length;
  return Math.round((closed / total) * 100);
}

export default function InternalAuditReportsView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);   // ✅ auto-load on mount (DB is now lightweight after migration)
  const [branchFilter, setBranchFilter] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  // Date tree filters
  const [yearFilter, setYearFilter] = useState(null);
  const [monthFilter, setMonthFilter] = useState(null);
  /* list: all | action (not fully closed) | closed ; findings: all | open | awaiting | closed */
  const [listFilter, setListFilter] = useState("all");
  const [findingFilter, setFindingFilter] = useState("all");

  // Inline edit state
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null); // full raw report (server schema)

  // Image viewer (lightbox)
  /* { items: [src], index } — the whole cell's photos, so ‹ › walks them. */
  const [viewer, setViewer] = useState(null);
  const openViewer = (items, index) => {
    const clean = (items || []).filter(Boolean);
    if (clean.length) setViewer({ items: clean, index: Math.max(0, Math.min(index || 0, clean.length - 1)) });
  };

  const [selectedId, setSelectedId] = useState(null);

  // refs لكروت التقارير (لاستخراج PDF من نفس التصميم)
  const cardRefs = useRef({});

  const loadReports = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${REPORTS_URL}?type=${encodeURIComponent(TYPE_KEY)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Failed to fetch reports (HTTP ${res.status})`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      setData(arr);
      setHasLoaded(true);
    } catch (e) {
      setError(e?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Auto-load on mount (safe again now that DB no longer contains base64 images)
  useEffect(() => { loadReports(); }, [loadReports]);

  // normalize for UI
  const normalized = useMemo(() => {
    return data.map((r) => {
      const p = r.payload || {};
      const header = p.header || {};
      const footer = p.footer || {};
      const table = Array.isArray(p.table) ? p.table : [];

      const computedClosedPct = calcClosedPct(table);

      const tsFromHeader = toTsFromHeaderDate(header.date);
      const tsBase =
        tsFromHeader ||
        toTs(p.createdAt) ||
        toTs(r.createdAt) ||
        toTs(r._id) ||
        Date.now();
      const d = new Date(tsBase);

      /* === مصدر الفرع ===
         التقارير الجديدة بتحفظ الفرع بـ payload.branch + header.branch.
         حقل الـ Location انلغى، بس التقارير القديمة الفرع محفوظ فيها فقط
         بـ header.location — فمنحافظ عليه كآخر خيار حتى ما نخسر بياناتها. */
      const branchRaw =
        p.branch || header.branch || r.branch || header.location || "";
      const branch = canonicalBranchName(branchRaw);
      /* Legacy extra text: only worth showing when it says something the
         resolved branch doesn't already say. New reports never set it. */
      const legacyLocation = header.location || "";
      const location =
        legacyLocation && canonicalBranchName(legacyLocation) !== branch
          ? legacyLocation
          : "";

      return {
        _raw: r,
        id: r.id || r._id || r.pk || undefined,
        ts: tsBase,
        y: d.getUTCFullYear(),
        m: d.getUTCMonth() + 1,
        d: d.getUTCDate(),
        branch,          // يُستخدم في الفلترة والقائمة
        branchRaw,
        location,        // legacy only — فاضي بالتقارير الجديدة
        title: p.title || "-",
        date: header.date || "-",
        reportNo: header.reportNo || "-",
        auditBy: header.auditConductedBy || "-",
        issuedBy: header.issuedBy || "-",
        approvedBy: header.approvedBy || "-",
        table,
        commentNextAudit: footer.commentForNextAudit || "",
        nextAudit: footer.nextAudit || "",
        reviewedBy: footer.reviewedAndVerifiedBy || "",
        percentageClosed: computedClosedPct,
      };
    });
  }, [data]);

  const rows = useMemo(() => {
    return normalized
      .filter((x) => !branchFilter || x.branch === branchFilter)
      .filter((x) => !yearFilter || x.y === yearFilter)
      .filter((x) => !monthFilter || x.m === monthFilter)
      .filter((x) => {
        if (listFilter === "all") return true;
        const done = x.table.length > 0 && x.percentageClosed === 100;
        return listFilter === "closed" ? done : !done;
      })
      .filter((x) =>
        !q ||
        [x.branch, x.title, x.auditBy, x.reportNo].some((v) =>
          String(v || "").toLowerCase().includes(q.toLowerCase())
        )
      )
      .sort((a, b) => b.ts - a.ts);
  }, [normalized, branchFilter, q, yearFilter, monthFilter, listFilter]);

  const branches = useMemo(() => {
    const s = new Set();
    normalized.forEach((r) => r.branch && s.add(r.branch));
    return Array.from(s).sort();
  }, [normalized]);

  const years = useMemo(
    () => Array.from(new Set(normalized.map((r) => r.y))).sort((a, b) => b - a),
    [normalized]
  );
  const monthsFor = (y) =>
    Array.from(new Set(normalized.filter((r) => y == null || r.y === y).map((r) => r.m))).sort((a, b) => a - b);

  /* ===== KPIs computed from the live data ===== */
  const kpis = useMemo(() => {
    const total = normalized.length;
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const last30 = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    const thisMonthCount = normalized.filter((r) =>
      `${r.y}-${String(r.m).padStart(2, "0")}` === ym
    ).length;
    const last30dCount = normalized.filter((r) => r.ts >= last30).length;

    const avgClosure = total > 0
      ? Math.round(normalized.reduce((a, r) => a + (Number(r.percentageClosed) || 0), 0) / total)
      : 0;

    /* Every finding that is not closed counts as open — the old count only
       matched the literal words "open"/"no", so "In Progress" rows vanished. */
    let openFindings = 0, totalFindings = 0, awaitingQa = 0;
    for (const r of normalized) {
      const st = findingStats(r.table);
      totalFindings += r.table.length;
      openFindings += st.open + st.awaiting;
      awaitingQa += st.awaiting;
    }

    const branchCount = branches.length;
    /* normalized keeps the server order — pick the newest by date. */
    const lastAudit = normalized.reduce((best, r) => (!best || r.ts > best.ts ? r : best), null);

    return {
      total,
      thisMonthCount,
      last30dCount,
      avgClosure,
      openFindings,
      totalFindings,
      awaitingQa,
      branchCount,
      lastAuditDate: lastAudit ? new Date(lastAudit.ts).toLocaleDateString("en-GB") : "—",
    };
  }, [normalized, branches]);

  /* ===== UI language toggle (per page) ===== */
  const [pageLang, setPageLang] = useState(() => {
    try { return localStorage.getItem("internal_audit_lang") || "en"; } catch { return "en"; }
  });
  const isAr = pageLang === "ar";
  const tt = (en, ar) => isAr ? ar : en;
  const togglePageLang = () => {
    const next = isAr ? "en" : "ar";
    setPageLang(next);
    try { localStorage.setItem("internal_audit_lang", next); } catch {}
  };

  /* ===== actions ===== */
  const refresh = async () => {
    try {
      const res = await fetch(
        `${REPORTS_URL}?type=${encodeURIComponent(TYPE_KEY)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data ?? [];
      setData(arr);
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm("Delete this report permanently?")) return;
    try {
      const id = r.id;
      if (!id) throw new Error("Missing id");
      const res = await fetch(`${REPORTS_URL}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      await refresh();
    } catch {
      alert("Failed to delete.");
    }
  };

  const handleEdit = (r) => {
    setEditId(r.id);
    const next = JSON.parse(JSON.stringify(r._raw));
    next.payload = mergeBranchEvidenceIntoPayload(next.payload || {});
    setDraft(next);
  };
  const handleCancel = () => {
    setEditId(null);
    setDraft(null);
  };

  const saveRawReport = async (raw) => {
    const id = raw?.id || raw?._id;
    if (!id) throw new Error("Missing id");
    const res = await fetch(`${REPORTS_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(raw),
    });
    if (!res.ok) throw new Error(`PUT failed with status ${res.status}`);
    return res;
  };

  /* Creates the branch evidence link if it doesn't exist yet, refreshes an
     expired one, and persists the change. Returns the public block so the
     caller can copy it, e-mail it, or show its state. */
  const ensureEvidenceLink = async (r, opts = {}) => {
    const raw = JSON.parse(JSON.stringify(r._raw || {}));
    raw.payload = raw.payload || {};
    const before = raw.payload.public || {};
    const state = getEvidenceLinkState(before);
    /* Auto-renew a link that is already dead — sending an expired URL to a
       branch is the single most common way this feature fails in practice. */
    const renew = opts.renew || state.expired || state.revoked;
    const next = buildInspectionEvidencePublic(before, { ...opts, renew });
    raw.payload.public = next;
    if (JSON.stringify(next) !== JSON.stringify(before)) {
      await saveRawReport(raw);
      await refresh();
    }
    return next;
  };

  const localOriginWarning = () =>
    `⚠️ This link points at ${getInspectionPublicOrigin() || "an unknown origin"}, which a branch outside ` +
    "this machine/network cannot open.\nSet REACT_APP_PUBLIC_ORIGIN to the public site address, " +
    "or do this from the deployed app.";

  const copyEvidenceLink = async (r, opts = {}) => {
    try {
      const pub = await ensureEvidenceLink(r, opts);
      const url = pub.url;
      const days = getEvidenceLinkState(pub).daysLeft;
      const warn = isShareableEvidenceUrl(url) ? "" : `\n\n${localOriginWarning()}`;
      try {
        await navigator.clipboard.writeText(url);
        alert(`Branch evidence link copied.${days != null ? `\nValid for ${days} more day(s).` : ""}${warn}`);
      } catch {
        window.prompt("Copy branch evidence link:", url);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create/copy evidence link.");
    }
  };

  const revokeEvidenceLink = async (r) => {
    if (!window.confirm("Cancel this branch link? Anyone holding the URL will lose access immediately.")) return;
    try {
      const raw = JSON.parse(JSON.stringify(r._raw || {}));
      raw.payload = raw.payload || {};
      if (!raw.payload.public?.token) { alert("No link has been created for this report yet."); return; }
      raw.payload.public = revokeInspectionEvidencePublic(raw.payload.public);
      await saveRawReport(raw);
      await refresh();
      alert("Branch link cancelled.");
    } catch (e) {
      console.error(e);
      alert("Failed to cancel the link.");
    }
  };

  /* ===== QA verification of branch evidence =====
     Rows the branch submitted arrive as "Pending QA Verification". Accepting
     closes them; rejecting sends them back with a reason AND reopens the
     branch link, which the old flow had no way to do — once the branch
     pressed Send the portal was locked forever. */
  const [verifyBusy, setVerifyBusy] = useState(false);

  const applyVerdicts = async (r, patches, { reopenLink = false } = {}) => {
    if (!patches.length) return;
    setVerifyBusy(true);
    try {
      const raw = JSON.parse(JSON.stringify(r._raw || {}));
      raw.payload = raw.payload || {};
      const table = Array.isArray(raw.payload.table) ? raw.payload.table : [];
      patches.forEach(({ rowIndex, patch }) => {
        if (!table[rowIndex]) return;
        table[rowIndex] = { ...table[rowIndex], ...patch };
      });
      raw.payload.table = table;

      if (reopenLink) {
        /* Un-submit the report so the portal accepts uploads again. */
        raw.payload.fields = { ...(raw.payload.fields || {}), closedEvidenceSubmittedAt: null };
        if (raw.payload.public && typeof raw.payload.public === "object") {
          raw.payload.public = {
            ...raw.payload.public,
            submittedAt: null,
            status: "evidence_in_progress",
          };
        }
      }

      syncClosedKPI(raw);
      await saveRawReport(raw);
      await refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to save the verification result.");
    } finally {
      setVerifyBusy(false);
    }
  };

  const acceptFinding = (r, rowIndex) =>
    applyVerdicts(r, [{ rowIndex, patch: acceptRowPatch(currentUserName()) }]);

  const rejectFinding = (r, rowIndex) => {
    const reason = window.prompt(
      `Reject the evidence for finding #${rowIndex + 1}?\n\n` +
      "Write the reason — the branch sees this text and must upload again:"
    );
    if (reason === null) return;
    if (!String(reason).trim()) {
      alert("A reason is required so the branch knows what to fix.");
      return;
    }
    return applyVerdicts(
      r,
      [{ rowIndex, patch: rejectRowPatch(currentUserName(), reason) }],
      { reopenLink: true }
    );
  };

  const acceptAllPending = (r) => {
    const table = Array.isArray(r._raw?.payload?.table) ? r._raw.payload.table : [];
    const patches = table
      .map((row, rowIndex) => ({ row, rowIndex }))
      .filter(({ row }) => isAwaitingQa(row))
      .map(({ rowIndex }) => ({ rowIndex, patch: acceptRowPatch(currentUserName()) }));
    if (!patches.length) return;
    if (!window.confirm(`Verify and close ${patches.length} finding(s) awaiting review?`)) return;
    return applyVerdicts(r, patches);
  };

  /* ===== Email ===== */
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailPayload, setEmailPayload] = useState(null);

  const openEmail = async (r) => {
    try {
      /* The e-mail body carries the evidence link, so make sure a live one
         exists before the composer opens. */
      const pub = await ensureEvidenceLink(r);
      const p = r._raw?.payload || {};
      /* A link nobody outside this machine can open is worse than no link —
         leave it out rather than mail a dead URL to a branch. */
      const shareable = isShareableEvidenceUrl(pub.url);
      setEmailPayload({
        ...p,
        id: r.id,
        branch: r.branch ? getBranchLabel(r.branch, pageLang) : (r.branchRaw || ""),
        reportDate: p?.header?.date || r.date || "",
        evidenceUrl: shareable ? pub.url : "",
        evidenceExpiresAt: pub.expiresAt || null,
      });
      setEmailOpen(true);
      if (!shareable) {
        alert(`The evidence link was left out of this e-mail.\n\n${localOriginWarning()}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to prepare the e-mail.");
    }
  };

  const syncClosedKPI = (doc) => {
    const table = safe(doc, "payload.table", []) || [];
    const pct = calcClosedPct(table);
    doc.payload = doc.payload || {};
    doc.payload.kpis = { ...(doc.payload.kpis || {}), percentageClosed: pct };
    return pct;
  };

  const handleSave = async () => {
    if (!draft) return;
    try {
      const id = draft.id || draft._id;
      if (!id) throw new Error("Missing id");

      syncClosedKPI(draft);

      const putRes = await fetch(`${REPORTS_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (putRes.ok) {
        setEditId(null);
        setDraft(null);
        await refresh();
        return;
      }
      if (putRes.status === 404) {
        const body = {
          type: draft.type || TYPE_KEY,
          branch:
            draft.branch ||
            safe(draft, "payload.header.branch") ||
            "",
          payload: draft.payload || {},
        };
        const postRes = await fetch(REPORTS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!postRes.ok) throw new Error("POST fallback failed");
        await fetch(`${REPORTS_URL}/${id}`, { method: "DELETE" }).catch(
          () => {}
        );
        setEditId(null);
        setDraft(null);
        await refresh();
        return;
      }
      throw new Error(`PUT failed with status ${putRes.status}`);
    } catch (e) {
      console.error(e);
      alert("Failed to update report.");
    }
  };

  const getHeader = () => (
    (draft.payload = draft.payload || {}),
    (draft.payload.header = draft.payload.header || {}),
    draft.payload.header
  );
  const getFooter = () => (
    (draft.payload = draft.payload || {}),
    (draft.payload.footer = draft.payload.footer || {}),
    draft.payload.footer
  );
  const getTable = () => (
    (draft.payload = draft.payload || {}),
    (draft.payload.table = Array.isArray(draft.payload.table)
      ? draft.payload.table
      : []),
    draft.payload.table
  );
  const editHeader = (key, value) => {
    const h = getHeader();
    h[key] = value;
    setDraft({ ...draft });
  };
  const editFooter = (key, value) => {
    const f = getFooter();
    f[key] = value;
    setDraft({ ...draft });
  };
  const editRow = (idx, patch) => {
    const t = getTable();
    t[idx] = { ...(t[idx] || {}), ...patch };
    setDraft({ ...draft });
  };
  const addRow = () => {
    const t = getTable();
    t.push({});
    setDraft({ ...draft });
  };
  const removeRow = (idx) => {
    const t = getTable();
    t.splice(idx, 1);
    setDraft({ ...draft });
  };
  const addImages = async (idx, field, files) => {
    if (!files || !files.length) return;
    const t = getTable();
    const row = (t[idx] = t[idx] || {});
    const current = Array.isArray(row[field]) ? row[field] : [];
    const capacity = Math.max(0, 5 - current.length);
    const slice = Array.from(files).slice(0, capacity);
    if (!slice.length) return;
    // ✅ Upload each picked image to Cloudinary → store URL (NOT base64) in the record.
    const urls = [];
    let failed = 0;
    for (const f of slice) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const url = await uploadCompressedToCloudinary(f);
        urls.push(url);
      } catch (e) {
        console.error("Upload failed:", f?.name, e);
        failed++;
      }
    }
    if (urls.length) {
      row[field] = [...current, ...urls];
      setDraft({ ...draft });
    }
    if (failed > 0) alert(`Failed to upload ${failed} image(s). Uploaded ${urls.length} successfully.`);
  };
  const removeImage = (idx, field, imgIdx) => {
    const t = getTable();
    const row = (t[idx] = t[idx] || {});
    row[field] = (row[field] || []).filter((_, i) => i !== imgIdx);
    setDraft({ ...draft });
  };

  const exportReportJSON = (raw) => {
    const blob = new Blob([JSON.stringify(raw, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `internal-audit-${raw?.id || raw?._id || "report"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportReportXLSX = async (view) => {
    try {
      const XLSX = await import("xlsx");

      const autosize = (arr) => {
        const colCount = arr.reduce(
          (m, r) => Math.max(m, r.length),
          0
        );
        const widths = new Array(colCount).fill(8);
        arr.forEach((row) => {
          row.forEach((cell, i) => {
            const v = cell == null ? "" : String(cell);
            widths[i] = Math.max(
              widths[i],
              Math.min(80, v.length + 2)
            );
          });
        });
        return widths.map((w) => ({ wch: w }));
      };

      const meta = [
        ["Branch", view.branch],
        ["Title", view.title],
        ["Date", view.date],
        ["Report No", view.reportNo],
        ["Auditor", view.auditBy],
        ["Approved By", view.approvedBy],
        ["Issued By", view.issuedBy],
        ["Closed %", `${calcClosedPct(view.table || [])}%`],
      ];

      const header = [
        "Row",
        "Non-Conformance",
        "Root Cause",
        "Corrective / Preventive action",
        "Evidence (images count)",
        "Closed Evidence (images count)",
        "Risk Category",
        "Risk Notes",
        "Status",
      ];

      const body = (view.table || []).map((line, i) => [
        i + 1,
        line.nonConformance || "",
        line.rootCause || "",
        line.corrective || "",
        Array.isArray(line.evidenceImgs)
          ? line.evidenceImgs.length
          : 0,
        Array.isArray(line.closedEvidenceImgs)
          ? line.closedEvidenceImgs.length
          : 0,
        line.risk || "",
        line.riskNotes || "",
        line.status || "",
      ]);

      const sheetRows = [...meta, [""], header, ...body];

      const ws = XLSX.utils.aoa_to_sheet(sheetRows);
      ws["!cols"] = autosize(sheetRows);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");

      const name = `internal-audit-${view.reportNo || "report"}.xlsx`;
      XLSX.writeFile(wb, name);
    } catch (e) {
      console.error(e);
      alert("XLSX export requires the 'xlsx' package.");
    }
  };

  const exportReportPDF = async (view) => {
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all(
        [import("html2canvas"), import("jspdf")]
      );

      const el = cardRefs.current[view.id];
      if (!el) { alert("Select the report first, then export."); return; }

      const A4_W    = 841.89;
      const A4_H    = 595.28;
      const LOGO_H  = 70;          // pt — header bar height on each page
      const CONT_H  = A4_H - LOGO_H; // pt — usable content per page
      const SCALE   = 2;
      const hdr     = view._raw?.payload?.header || {};

      // ── 1. Pre-load logo as base64 ──
      const logoBase64 = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          c.getContext("2d").drawImage(img, 0, 0);
          resolve(c.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = () => resolve(null);
        img.src = "/assets/almawashi-logo.jpg";
      });

      // ── 2. Clone card – strip buttons ──
      const clone = el.cloneNode(true);
      clone.querySelectorAll(".pdf-no-print").forEach((d) => d.remove());
      clone.style.cssText = `position:fixed;left:-9999px;top:0;width:${el.offsetWidth}px;background:#fff;padding:8px;box-sizing:border-box;`;
      /* Inside the page root, so the scoped #root .ia.ia stylesheet still applies. */
      (el.closest(".ia") || document.body).appendChild(clone);

      // ── 3. Measure row positions before rendering ──
      await new Promise((r) => setTimeout(r, 80));
      const cloneRect  = clone.getBoundingClientRect();
      const rowRects   = Array.from(clone.querySelectorAll("[data-pdf-row]")).map((r) => {
        const rect = r.getBoundingClientRect();
        return {
          top:    (rect.top    - cloneRect.top) * SCALE,
          bottom: (rect.bottom - cloneRect.top) * SCALE,
        };
      });

      // ── 4. Render to canvas ──
      const canvas = await html2canvas(clone, {
        scale: SCALE,
        backgroundColor: "#ffffff",
        useCORS: true,
        allowTaint: false,
        logging: false,
        height: clone.scrollHeight,
        windowHeight: clone.scrollHeight + 200,
      });
      clone.remove();

      // ── 5. Find smart page break points (never cut mid-row) ──
      const contH_px = CONT_H * (canvas.width / A4_W); // content height in canvas px
      const pageStarts = [0];
      let from = 0;
      while (true) {
        const natural = from + contH_px;
        if (natural >= canvas.height) break;
        // Walk rows backwards — find last row whose bottom ≤ natural break
        let cut = natural;
        for (let i = rowRects.length - 1; i >= 0; i--) {
          const { top, bottom } = rowRects[i];
          if (bottom <= natural && bottom > from + contH_px * 0.25) { cut = bottom; break; }
          if (top   <  natural && top   > from + contH_px * 0.25)   { cut = top;    break; }
        }
        if (cut <= from) cut = natural; // safety
        pageStarts.push(cut);
        from = cut;
      }
      pageStarts.push(canvas.height);

      // ── 6. Helper: draw logo bar (called for every page) ──
      const drawHeader = (pdf, pageNum, total) => {
        // white background bar
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, A4_W, LOGO_H, "F");
        // separator line
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(1.5);
        pdf.line(0, LOGO_H - 1, A4_W, LOGO_H - 1);
        // logo image
        if (logoBase64) pdf.addImage(logoBase64, "JPEG", 8, 7, 85, 52);
        // center title
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(15, 23, 42);
        pdf.text("INTERNAL AUDIT REPORT", A4_W / 2, 25, { align: "center" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          "CORRECTIVE & PREVENTIVE ACTION  |  FS-QM/REC/CA/1  |  Rev 00",
          A4_W / 2, 36, { align: "center" }
        );
        // right meta
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(15, 23, 42);
        const rx = A4_W - 10;
        pdf.text(`Branch: ${view.branch || "—"}`,            rx, 16, { align: "right" });
        pdf.text(`Date: ${hdr.date || view.reportDate || "—"}`, rx, 28, { align: "right" });
        pdf.text(`Report No: ${hdr.reportNo || "—"}`,        rx, 40, { align: "right" });
        pdf.text(`Audited By: ${hdr.auditConductedBy || hdr.auditBy || "—"}`, rx, 52, { align: "right" });
        // page number
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Page ${pageNum} / ${total}`, A4_W / 2, LOGO_H - 6, { align: "center" });
      };

      // ── 7. Build content pages ──
      const totalPages = pageStarts.length - 1;
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage();
        drawHeader(pdf, p + 1, totalPages);

        const srcY = pageStarts[p];
        const srcH = Math.ceil(pageStarts[p + 1] - srcY);
        if (srcH <= 0) continue;

        const slice = document.createElement("canvas");
        slice.width  = canvas.width;
        slice.height = srcH;
        slice.getContext("2d").drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

        const sliceH_pt = Math.min(srcH * (A4_W / canvas.width), CONT_H);
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, LOGO_H, A4_W, sliceH_pt);
      }

      // ── 8. Image gallery ──
      const allImages = [];
      (view.table || []).forEach((row, idx) => {
        (Array.isArray(row.evidenceImgs)       ? row.evidenceImgs       : []).forEach((src) => allImages.push({ src, label: `Row ${idx + 1} — Evidence` }));
        (Array.isArray(row.closedEvidenceImgs) ? row.closedEvidenceImgs : []).forEach((src) => allImages.push({ src, label: `Row ${idx + 1} — Closed Evidence` }));
      });

      if (allImages.length) {
        pdf.addPage();
        drawHeader(pdf, totalPages + 1, totalPages + 1);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.setTextColor(15, 23, 42);
        pdf.text("Images Gallery", 40, LOGO_H + 24);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10);
        pdf.text(`Total: ${allImages.length} image(s)`, 40, LOGO_H + 40);

        for (let i = 0; i < allImages.length; i++) {
          pdf.addPage();
          drawHeader(pdf, totalPages + 2 + i, totalPages + 1 + allImages.length);
          const { src, label } = allImages[i];
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(15, 23, 42);
          pdf.text(label, 40, LOGO_H + 20);
          const margin = 30;
          const boxW = A4_W - margin * 2;
          const boxH = CONT_H - 30;
          let base64 = src;
          if (!String(src).startsWith("data:image")) {
            const resp = await fetch(src);
            const blob = await resp.blob();
            base64 = await new Promise((ok) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(blob); });
          }
          const tmp = new Image();
          await new Promise((res, rej) => { tmp.onload = res; tmp.onerror = rej; tmp.src = base64; });
          const ratio = Math.min(boxW / tmp.width, boxH / tmp.height);
          const w = tmp.width * ratio; const h = tmp.height * ratio;
          pdf.addImage(base64, "JPEG", margin + (boxW - w) / 2, LOGO_H + 28 + (boxH - h) / 2, w, h);
        }
      }

      const safeBranch = (view.branch || "report").replace(/\s+/g, "-");
      const safeDate   = hdr.date || view.reportDate || "";
      pdf.save(`Internal-Audit_${safeBranch}_${safeDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF export failed. See console for details.");
    }
  };

  const groups = useMemo(() => {
    const g = new Map();
    for (const r of rows) {
      const key = `${r.y}-${String(r.m).padStart(2, "0")}`;
      if (!g.has(key)) g.set(key, []);
      g.get(key).push(r);
    }
    for (const [, arr] of g) arr.sort((a, b) => b.ts - a.ts);
    return Array.from(g.entries()).sort((a, b) =>
      b[0].localeCompare(a[0])
    );
  }, [rows]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((r) => r.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  /* Reset the findings filter whenever another report is opened. */
  useEffect(() => { setFindingFilter("all"); }, [selectedId]);

  const monthName = (m) =>
    new Date(Date.UTC(2000, m - 1, 1)).toLocaleString(isAr ? "ar" : "en", {
      month: "long",
    });

  const selected = rows.find((r) => r.id === selectedId) || null;
  const anyFilter = !!(branchFilter || q || yearFilter != null || monthFilter != null || listFilter !== "all");
  const clearFilters = () => {
    setBranchFilter(""); setQ(""); setYearFilter(null); setMonthFilter(null); setListFilter("all");
  };

  const statusText = (s) => {
    const k = String(s || "").trim().toLowerCase();
    if (!k) return "—";
    if (!isAr) return s;
    return { open: "مفتوحة", "in progress": "قيد التنفيذ", "pending qa verification": "بانتظار تحقق الجودة", closed: "مغلقة" }[k] || s;
  };
  const riskText = (s) => {
    const k = String(s || "").trim().toLowerCase();
    if (!k) return "";
    if (!isAr) return s;
    return { high: "عالية", medium: "متوسطة", low: "منخفضة" }[k] || s;
  };

  /* ===== Detail card for the selected report ===== */
  const renderDetail = (r) => {
    const isEditing = editId === r.id;
    const p = isEditing ? draft.payload || {} : r._raw.payload || {};
    const header = p.header || {};
    const footer = p.footer || {};
    const table = Array.isArray(p.table) ? p.table : [];
    const st = findingStats(table);
    const pct = calcClosedPct(table);
    const evidence = getBranchEvidenceStatus(p);
    const uploadedBy = getBranchEvidenceUploadedBy(p);
    const branchEvidenceCount = getBranchEvidenceUpdates(p).reduce(
      (sum, item) => sum + (Array.isArray(item?.images) ? item.images.map(getImageUrl).filter(Boolean).length : 0),
      0
    );
    const pub = p?.public || {};
    const linkState = pub.token ? getEvidenceLinkState(pub) : null;
    const linkChip = !linkState
      ? { tone: "mute", text: tt("No branch link yet", "لا يوجد رابط للفرع بعد") }
      : linkState.revoked
      ? { tone: "bad", text: tt("Link cancelled", "الرابط ملغى") }
      : linkState.expired
      ? { tone: "bad", text: tt("Link expired", "الرابط منتهي") }
      : linkState.daysLeft != null && linkState.daysLeft <= 7
      ? { tone: "warn", text: tt(`Link expires in ${linkState.daysLeft} day(s)`, `ينتهي الرابط خلال ${linkState.daysLeft} يوم`) }
      : { tone: "ok", text: linkState.daysLeft != null ? tt(`Link valid — ${linkState.daysLeft} day(s) left`, `الرابط صالح — باقي ${linkState.daysLeft} يوم`) : tt("Link active", "الرابط فعّال") };

    const awaiting = countAwaitingQa(table);
    const filterIdx = table
      .map((row, i) => ({ row, i }))
      .filter(({ row }) => isEditing || findingFilter === "all" || findingBucket(row) === findingFilter);

    const metaField = (label, view, edit) => (
      <div>
        <div className="ia-label">{label}</div>
        <div className="ia-val">{isEditing && edit ? edit : (view || "—")}</div>
      </div>
    );
    const inlineInput = (value, onChange, placeholder) => (
      <input className="ia-input" value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    );

    return (
      <div ref={(el) => { if (el) cardRefs.current[r.id] = el; }}>
        {/* ── Report header ── */}
        <div className="ia-card">
          <div className="ia-doc">
            <span>{tt("Doc. No.", "رقم الوثيقة")} <b>FS-QM/REC/CA/1</b></span>
            <span>{tt("Rev.", "الإصدار")} <b>00</b></span>
            <span>{tt("Issued by", "أصدرها")} <b>{r.issuedBy}</b></span>
            <span>{tt("Approved by", "اعتمدها")} <b><SignatureName name={r.approvedBy} underline={false} inline /></b></span>
          </div>

          <div className="ia-hero">
            <div style={{ minWidth: 0, flex: "1 1 360px" }}>
              {isEditing ? (
                <div style={{ display: "grid", gap: 8, maxWidth: 460 }}>
                  {/* Branch is the only place the site is recorded now, so it
                      has to be editable — that's how a legacy report whose
                      branch only existed as free-text Location gets corrected. */}
                  <select
                    className="ia-select"
                    value={(() => {
                      /* Read the DRAFT, not the normalized row — the row only
                         refreshes after a save. */
                      const cur = canonicalBranchName(p.branch || p.header?.branch || p.header?.location || "");
                      return BRANCH_CODES.includes(cur) ? cur : "";
                    })()}
                    onChange={(e) => {
                      const code = e.target.value;
                      draft.payload = p;
                      p.branch = code;
                      p.header = p.header || {};
                      p.header.branch = code;
                      /* Drop the retired field so the corrected branch can't
                         be shadowed later. */
                      delete p.header.location;
                      setDraft({ ...draft });
                    }}
                  >
                    <option value="">
                      {tt("-- Select Branch --", "-- اختر الفرع --")}
                      {r.branchRaw ? ` (${r.branchRaw})` : ""}
                    </option>
                    {BRANCH_CODES.map((code) => (
                      <option key={code} value={code}>{getBranchLabel(code, pageLang)}</option>
                    ))}
                  </select>
                  <input
                    className="ia-input"
                    value={p.title || ""}
                    onChange={(e) => { draft.payload = p; p.title = e.target.value; setDraft({ ...draft }); }}
                    placeholder={tt("Report title", "عنوان التقرير")}
                  />
                </div>
              ) : (
                <>
                  <div className="ia-hero-title">{r.branch ? getBranchLabel(r.branch, pageLang) : "—"}</div>
                  {/* Legacy reports only: the old free-text Location, shown
                      when it isn't just a restatement of the branch above. */}
                  {r.location && (
                    <div className="ia-sm ia-mute" style={{ fontStyle: "italic" }} title={tt("Legacy location text kept from an older report", "نص الموقع القديم محفوظ من تقرير سابق")}>
                      {r.location}
                    </div>
                  )}
                  {r.title && r.title !== "-" && <div className="ia-hero-sub">{r.title}</div>}
                </>
              )}

              <div className="ia-meta">
                {metaField(tt("Audit date", "تاريخ التدقيق"), r.date,
                  inlineInput(header.date, (v) => editHeader("date", v), "YYYY-MM-DD"))}
                {metaField(tt("Report no.", "رقم التقرير"), r.reportNo,
                  inlineInput(header.reportNo, (v) => editHeader("reportNo", v)))}
                {metaField(tt("Auditor", "المدقق"), r.auditBy,
                  inlineInput(header.auditConductedBy, (v) => editHeader("auditConductedBy", v)))}
                {metaField(tt("Branch supervisor", "مشرف الفرع"), header.branchSupervisor,
                  inlineInput(header.branchSupervisor, (v) => editHeader("branchSupervisor", v)))}
                {metaField(tt("Next audit", "التدقيق القادم"), r.nextAudit,
                  inlineInput(footer.nextAudit, (v) => editFooter("nextAudit", v)))}
                {metaField(tt("Evidence uploaded by", "رفع الأدلة"), uploadedBy,
                  inlineInput(uploadedBy, (v) => {
                    p.fields = p.fields && typeof p.fields === "object" ? p.fields : {};
                    p.fields.closedEvidenceUploadedBy = v;
                    draft.payload = p;
                    setDraft({ ...draft });
                  }, tt("Supervisor name", "اسم المشرف")))}
              </div>
            </div>

            <div className="ia-progress">
              <div className="ia-ring" style={{ background: `conic-gradient(${pctColor(pct)} ${pct * 3.6}deg, #e8eef6 0)` }}>
                <div className="ia-ring-in">
                  <div className="ia-ring-val">{pct}%</div>
                  <div className="ia-xs ia-mute">{tt("closed", "مغلق")}</div>
                </div>
              </div>
              <div className="ia-counts">
                <span><i className="dot t-ok" />{st.closed} {tt("closed", "مغلقة")}</span>
                <span><i className="dot t-info" />{st.awaiting} {tt("awaiting QA", "بانتظار الجودة")}</span>
                <span><i className="dot t-bad" />{st.open} {tt("open", "مفتوحة")}</span>
              </div>
            </div>
          </div>

          <div className="ia-chips ia-no-print pdf-no-print">
            <span className={`ia-pill t-${evidence.tone}`}>{isAr ? evidence.ar : evidence.label}</span>
            <span className={`ia-pill t-${linkChip.tone}`}>🔗 {linkChip.text}</span>
            {pub.token && (
              <span className={`ia-pill t-${pub.openedAt ? "info" : "mute"}`}>
                {pub.openedAt
                  ? tt(`Opened by branch ${new Date(pub.openedAt).toLocaleString("en-GB")}`, `فتحه الفرع ${new Date(pub.openedAt).toLocaleString("en-GB")}`)
                  : tt("Branch hasn't opened it yet", "الفرع لم يفتحه بعد")}
              </span>
            )}
            {branchEvidenceCount > 0 && (
              <span className="ia-pill t-ok">{tt(`${branchEvidenceCount} photo(s) from the branch`, `${branchEvidenceCount} صورة من الفرع`)}</span>
            )}
          </div>

          {/* ── Actions ── */}
          <div className="ia-actions ia-no-print pdf-no-print">
            {!isEditing ? (
              <>
                {awaiting > 0 && (
                  <button type="button" className="ia-btn ok" disabled={verifyBusy} onClick={() => acceptAllPending(r)}
                    title={tt("Accept every finding currently awaiting verification", "قبول كل الملاحظات بانتظار التحقق")}>
                    ✔ {tt(`Verify all (${awaiting})`, `تحقق من الكل (${awaiting})`)}
                  </button>
                )}
                <button type="button" className="ia-btn primary" onClick={() => openEmail(r)}
                  title={tt("Compose an e-mail with the PDF and the branch evidence link", "إيميل مع الـ PDF ورابط أدلة الفرع")}>
                  ✉️ {tt("Send email", "إرسال إيميل")}
                </button>
                <button type="button" className="ia-btn" onClick={() => copyEvidenceLink(r)}>
                  🔗 {tt("Copy branch link", "نسخ رابط الفرع")}
                </button>
                <button type="button" className="ia-btn" onClick={() => handleEdit(r)}>
                  ✎ {tt("Edit", "تعديل")}
                </button>
                <Menu label={`⤓ ${tt("Export", "تصدير")}`} items={[
                  { label: tt("PDF report", "تقرير PDF"), onClick: () => exportReportPDF(r) },
                  { label: tt("Excel sheet", "ملف Excel"), onClick: () => exportReportXLSX(r) },
                  { label: tt("JSON (raw data)", "JSON (بيانات خام)"), onClick: () => exportReportJSON(r._raw) },
                ]} />
                {pub.token && (
                  <Menu label={`⋯ ${tt("Link", "الرابط")}`} items={[
                    { label: tt("↻ Renew & copy link", "↻ تجديد ونسخ الرابط"), onClick: () => copyEvidenceLink(r, { renew: true }) },
                    ...(!linkState?.revoked ? [{ label: tt("⛔ Cancel link", "⛔ إلغاء الرابط"), danger: true, onClick: () => revokeEvidenceLink(r) }] : []),
                  ]} />
                )}
                <span className="ia-spacer" />
                <button type="button" className="ia-btn danger" onClick={() => handleDelete(r)} data-delete-action="true">
                  🗑 {tt("Delete", "حذف")}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="ia-btn ok" onClick={handleSave}>✔ {tt("Save changes", "حفظ التعديلات")}</button>
                <button type="button" className="ia-btn" onClick={handleCancel}>{tt("Cancel", "إلغاء")}</button>
                <span className="ia-spacer" />
                <span className="ia-sm ia-mute">{tt("Editing — changes are saved only when you press Save.", "وضع التعديل — لا يُحفظ شيء قبل الضغط على حفظ.")}</span>
              </>
            )}
          </div>
        </div>

        {/* ── Findings ── */}
        <div className="ia-card">
          <div className="ia-sec-head">
            <div className="ia-h2">
              {tt("Findings", "الملاحظات")} <span className="ia-count">{table.length}</span>
            </div>
            {!isEditing && table.length > 0 && (
              <div className="ia-seg ia-no-print pdf-no-print">
                {[
                  ["all", tt("All", "الكل"), table.length],
                  ["open", tt("Open", "مفتوحة"), st.open],
                  ["awaiting", tt("Awaiting QA", "بانتظار الجودة"), st.awaiting],
                  ["closed", tt("Closed", "مغلقة"), st.closed],
                ].map(([k, label, n]) => (
                  <button key={k} type="button" className={findingFilter === k ? "on" : ""} onClick={() => setFindingFilter(k)}>
                    {label} <span className="ia-xs">{n}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {table.length === 0 && !isEditing ? (
            <div className="ia-state">{tt("This report has no findings.", "لا توجد ملاحظات في هذا التقرير.")}</div>
          ) : (
            <div className="ia-tbl-scroll">
              <div className={`ia-tbl${isEditing ? " editing" : ""}`}>
                <div className="ia-tr ia-th">
                  <div>#</div>
                  <div>{tt("Non-conformance", "عدم المطابقة")}</div>
                  <div>{tt("Root cause", "السبب الجذري")}</div>
                  <div>{tt("Corrective / preventive action", "الإجراء التصحيحي / الوقائي")}</div>
                  <div>{tt("Evidence", "الدليل")}</div>
                  <div>{tt("Closure evidence", "دليل الإغلاق")}</div>
                  <div>{tt("Risk", "الخطورة")}</div>
                  <div>{tt("Status", "الحالة")}</div>
                  {isEditing && <div />}
                </div>

                {filterIdx.map(({ row, i: ridx }) => {
                  const bucket = findingBucket(row);
                  const closedImgs = Array.from(new Set([
                    ...getRowClosedEvidenceImages(row),
                    ...getBranchEvidenceForRow(p, ridx),
                  ]));
                  const branchNote = row.closedEvidenceNote || getBranchEvidenceNoteForRow(p, ridx);
                  return (
                    <div key={ridx} data-pdf-row="true" className={`ia-tr b-${bucket}`}>
                      <div className="ia-num">{ridx + 1}</div>
                      <div>
                        {isEditing
                          ? <textarea className="ia-ta" value={row.nonConformance || ""} onChange={(e) => editRow(ridx, { nonConformance: e.target.value })} />
                          : (row.nonConformance || <span className="ia-empty">—</span>)}
                      </div>
                      <div>
                        {isEditing
                          ? <textarea className="ia-ta" value={row.rootCause || ""} onChange={(e) => editRow(ridx, { rootCause: e.target.value })} />
                          : (row.rootCause || <span className="ia-empty">—</span>)}
                      </div>
                      <div>
                        {isEditing
                          ? <textarea className="ia-ta" value={row.corrective || ""} onChange={(e) => editRow(ridx, { corrective: e.target.value })} />
                          : (row.corrective || <span className="ia-empty">—</span>)}
                      </div>
                      <div>
                        {isEditing ? (
                          <ImageField
                            list={row.evidenceImgs}
                            onAdd={(files) => addImages(ridx, "evidenceImgs", files)}
                            onRemove={(i) => removeImage(ridx, "evidenceImgs", i)}
                            onView={openViewer}
                            tt={tt}
                          />
                        ) : (
                          <Thumbs list={row.evidenceImgs} onView={openViewer} />
                        )}
                      </div>
                      <div>
                        {isEditing ? (
                          <>
                            <ImageField
                              list={row.closedEvidenceImgs}
                              onAdd={(files) => addImages(ridx, "closedEvidenceImgs", files)}
                              onRemove={(i) => removeImage(ridx, "closedEvidenceImgs", i)}
                              onView={openViewer}
                              tt={tt}
                            />
                            <textarea
                              className="ia-ta"
                              style={{ marginTop: 8, minHeight: 56 }}
                              value={row.closedEvidenceNote || ""}
                              onChange={(e) => editRow(ridx, { closedEvidenceNote: e.target.value })}
                              placeholder={tt("Branch notes…", "ملاحظات الفرع…")}
                            />
                          </>
                        ) : (
                          <>
                            <Thumbs list={closedImgs} onView={openViewer} />
                            {branchNote && (
                              <div className="ia-note"><b>{tt("Branch note:", "ملاحظة الفرع:")}</b> {branchNote}</div>
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        {isEditing ? (
                          <>
                            <select className="ia-select" value={row.risk || ""} onChange={(e) => editRow(ridx, { risk: e.target.value })}>
                              <option value="">--</option>
                              <option value="Low">{riskText("Low")}</option>
                              <option value="Medium">{riskText("Medium")}</option>
                              <option value="High">{riskText("High")}</option>
                            </select>
                            <textarea
                              className="ia-ta"
                              style={{ marginTop: 8, minHeight: 64 }}
                              value={row.riskNotes || ""}
                              onChange={(e) => editRow(ridx, { riskNotes: e.target.value })}
                              placeholder={tt("Risk notes…", "ملاحظات الخطورة…")}
                            />
                          </>
                        ) : (
                          <>
                            {row.risk
                              ? <span className={`ia-pill t-${riskTone(row.risk)}`}>{riskText(row.risk)}</span>
                              : <span className="ia-empty">—</span>}
                            {row.riskNotes && <div className="ia-sm ia-mute" style={{ marginTop: 6 }}>{row.riskNotes}</div>}
                          </>
                        )}
                      </div>
                      <div>
                        {isEditing ? (
                          <select className="ia-select" value={row.status || ""} onChange={(e) => editRow(ridx, { status: e.target.value })}>
                            <option value="">--</option>
                            {["Open", "In Progress", "Pending QA Verification", "Closed"].map((s) => (
                              <option key={s} value={s}>{statusText(s)}</option>
                            ))}
                          </select>
                        ) : (
                          <>
                            <span className={`ia-pill t-${bucketTone(bucket)}`}>{statusText(row.status)}</span>
                            <VerdictCell
                              row={row}
                              busy={verifyBusy}
                              isAr={isAr}
                              tt={tt}
                              onAccept={() => acceptFinding(r, ridx)}
                              onReject={() => rejectFinding(r, ridx)}
                            />
                          </>
                        )}
                      </div>
                      {isEditing && (
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
                          <button type="button" className="ia-btn sm" onClick={() => removeRow(ridx)} title={tt("Remove finding", "حذف الملاحظة")}>✕</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!isEditing && filterIdx.length === 0 && (
                  <div className="ia-state">{tt("No findings match this filter.", "لا توجد ملاحظات بهذا الفلتر.")}</div>
                )}
              </div>
            </div>
          )}

          {isEditing && (
            <button type="button" className="ia-btn" style={{ marginTop: 12 }} onClick={addRow}>
              + {tt("Add finding", "إضافة ملاحظة")}
            </button>
          )}
        </div>

        {/* ── Closing notes ── */}
        {(isEditing || r.commentNextAudit || r.reviewedBy) && (
          <div className="ia-card">
            <div className="ia-h2" style={{ marginBottom: 10 }}>{tt("Comment for next audit", "ملاحظة للتدقيق القادم")}</div>
            {isEditing ? (
              <textarea
                className="ia-ta"
                value={footer.commentForNextAudit || ""}
                onChange={(e) => editFooter("commentForNextAudit", e.target.value)}
              />
            ) : (
              <div className="ia-quote">{r.commentNextAudit || <span className="ia-empty">—</span>}</div>
            )}
            <div className="ia-meta" style={{ marginTop: 14 }}>
              {metaField(
                tt("Reviewed & verified by", "راجعه وتحقق منه"),
                r.reviewedBy ? <SignatureName name={r.reviewedBy} underline={false} inline /> : "",
                inlineInput(footer.reviewedAndVerifiedBy, (v) => editFooter("reviewedAndVerifiedBy", v))
              )}
            </div>
          </div>
        )}

        {SHOW_DEBUG && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: "pointer" }}>Show raw JSON</summary>
            <pre style={preStyle}>{JSON.stringify(r._raw, null, 2)}</pre>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="ia ia-page" dir={isAr ? "rtl" : "ltr"}>
      <style>{IA_CSS}</style>

      {/* ====== Page header ====== */}
      <div className="ia-top">
        <div>
          <h1 className="ia-h1">{tt("Internal audit reports", "تقارير التدقيق الداخلي")}</h1>
          <div className="ia-sub">{tt("Findings, corrective actions and branch evidence — FS-QM/REC/CA/1", "الملاحظات والإجراءات التصحيحية وأدلة الفروع — FS-QM/REC/CA/1")}</div>
        </div>
        <div className="ia-toolbar ia-no-print">
          <button type="button" className="ia-btn" onClick={togglePageLang}>🌐 {isAr ? "English" : "عربي"}</button>
          <button type="button" className="ia-btn" onClick={loadReports} disabled={loading}>↻ {tt("Refresh", "تحديث")}</button>
          <button type="button" className="ia-btn" onClick={() => window.print()}>🖨 {tt("Print", "طباعة")}</button>
        </div>
      </div>

      {/* ====== KPIs ====== */}
      <div className="ia-stats ia-no-print">
        <Stat label={tt("Reports", "التقارير")} value={kpis.total} hint={tt(`${kpis.thisMonthCount} this month`, `${kpis.thisMonthCount} هذا الشهر`)} />
        <Stat label={tt("Branches audited", "الفروع المدققة")} value={kpis.branchCount} hint={tt(`Last audit ${kpis.lastAuditDate}`, `آخر تدقيق ${kpis.lastAuditDate}`)} />
        <Stat label={tt("Average closure", "متوسط الإغلاق")} value={`${kpis.avgClosure}%`} tone={kpis.avgClosure >= 80 ? "ok" : kpis.avgClosure >= 50 ? "warn" : "bad"} bar={kpis.avgClosure} />
        <Stat label={tt("Open findings", "ملاحظات مفتوحة")} value={kpis.openFindings} tone={kpis.openFindings ? "bad" : "ok"} hint={tt(`of ${kpis.totalFindings} in total`, `من أصل ${kpis.totalFindings}`)} />
        <Stat label={tt("Awaiting QA", "بانتظار تحقق الجودة")} value={kpis.awaitingQa} tone={kpis.awaitingQa ? "info" : "mute"} hint={tt("branch evidence to review", "أدلة فروع للمراجعة")} />
      </div>

      <div className="ia-body">
        {/* ====== Report list ====== */}
        <aside className="ia-panel ia-no-print">
          <div className="ia-list-tools">
            <div className="ia-search">
              <span aria-hidden="true">🔍</span>
              <input
                placeholder={tt("Search branch, report no., auditor…", "ابحث بالفرع، رقم التقرير، المدقق…")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && <button type="button" onClick={() => setQ("")} aria-label="Clear">✕</button>}
            </div>
            <select className="ia-select" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="">{tt("All branches", "كل الفروع")} ({branches.length})</option>
              {branches.map((b) => (
                <option key={b} value={b}>{getBranchLabel(b, pageLang)}</option>
              ))}
            </select>
            <div className="ia-row2">
              <select
                className="ia-select"
                value={yearFilter ?? ""}
                onChange={(e) => { setYearFilter(e.target.value ? Number(e.target.value) : null); setMonthFilter(null); }}
              >
                <option value="">{tt("All years", "كل السنوات")}</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select
                className="ia-select"
                value={monthFilter ?? ""}
                onChange={(e) => setMonthFilter(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{tt("All months", "كل الأشهر")}</option>
                {monthsFor(yearFilter).map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
            </div>
            <div className="ia-seg">
              {[
                ["all", tt("All", "الكل")],
                ["action", tt("Needs action", "تحتاج متابعة")],
                ["closed", tt("Fully closed", "مغلقة بالكامل")],
              ].map(([k, label]) => (
                <button key={k} type="button" className={listFilter === k ? "on" : ""} onClick={() => setListFilter(k)}>{label}</button>
              ))}
            </div>
            <div className="ia-list-count">
              <span>{tt(`${rows.length} of ${normalized.length} reports`, `${rows.length} من ${normalized.length} تقرير`)}</span>
              {anyFilter && <button type="button" onClick={clearFilters}>{tt("Clear filters", "مسح الفلاتر")}</button>}
            </div>
          </div>

          <div className="ia-list">
            {loading && <div className="ia-state">{tt("Loading reports…", "جاري تحميل التقارير…")}</div>}
            {!loading && error && <div className="ia-state ia-error">{error}</div>}
            {!loading && !error && rows.length === 0 && (
              <div className="ia-state">{hasLoaded && anyFilter ? tt("No reports match these filters.", "لا توجد تقارير بهذه الفلاتر.") : tt("No reports yet.", "لا توجد تقارير بعد.")}</div>
            )}
            {groups.map(([key, list]) => {
              const [yy, mm] = key.split("-");
              return (
                <div key={key}>
                  <div className="ia-month">{monthName(Number(mm))} {yy}</div>
                  {list.map((r) => {
                    const pct = calcClosedPct(r.table || []);
                    const ev = getBranchEvidenceStatus(r._raw?.payload || {});
                    return (
                      <button
                        type="button"
                        key={r.id}
                        className={`ia-item${selectedId === r.id ? " on" : ""}`}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <span className="ia-item-top">
                          <span className="ia-item-name">{r.branch ? getBranchLabel(r.branch, pageLang) : "—"}</span>
                          <span className="ia-xs ia-mute">{r.date}</span>
                        </span>
                        <span className="ia-item-meta">{r.reportNo !== "-" ? r.reportNo : ""}{r.reportNo !== "-" && r.auditBy !== "-" ? " · " : ""}{r.auditBy !== "-" ? r.auditBy : ""}</span>
                        <span className="ia-bar"><span style={{ width: `${pct}%`, background: pctColor(pct) }} /></span>
                        <span className="ia-item-foot">
                          <span className="ia-xs ia-mute">{tt(`${pct}% closed`, `${pct}% مغلق`)}</span>
                          <span className={`ia-pill sm t-${ev.tone}`}>{isAr ? ev.ar : ev.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ====== Selected report ====== */}
        <section style={{ minWidth: 0 }}>
          {selected
            ? renderDetail(selected)
            : !loading && (
              <div className="ia-card ia-state">{tt("Select a report from the list.", "اختر تقريراً من القائمة.")}</div>
            )}
        </section>
      </div>

      {viewer && (
        <Lightbox
          items={viewer.items}
          index={viewer.index}
          onIndex={(i) => setViewer((prev) => prev && {
            ...prev,
            index: ((i % prev.items.length) + prev.items.length) % prev.items.length,
          })}
          onClose={() => setViewer(null)}
        />
      )}

      <EmailSendModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        payload={emailPayload}
        config={internalAuditEmailConfig}
      />
    </div>
  );
}

/* ===== Finding status buckets ===== */
function findingBucket(row) {
  if (isClosedStatus(row?.status)) return "closed";
  if (isAwaitingQa(row)) return "awaiting";
  return "open";
}
function findingStats(table = []) {
  const s = { open: 0, awaiting: 0, closed: 0 };
  (Array.isArray(table) ? table : []).forEach((row) => { s[findingBucket(row)]++; });
  return s;
}
const bucketTone = (b) => (b === "closed" ? "ok" : b === "awaiting" ? "info" : "bad");
const riskTone = (r) => {
  const k = String(r || "").toLowerCase();
  return k === "high" ? "bad" : k === "medium" ? "warn" : k === "low" ? "ok" : "mute";
};
const pctColor = (pct) => (pct >= 80 ? "#22a06b" : pct >= 50 ? "#e0a020" : "#e5534b");

/* ===== Small components ===== */

function Stat({ label, value, hint, tone = "", bar }) {
  return (
    <div className={`ia-stat${tone ? ` s-${tone}` : ""}`}>
      <div className="ia-stat-label">{label}</div>
      <div className="ia-stat-val">{value}</div>
      {bar != null ? (
        <div className="ia-bar" style={{ marginTop: 8 }}><span style={{ width: `${bar}%`, background: pctColor(bar) }} /></div>
      ) : hint ? (
        <div className="ia-xs ia-mute">{hint}</div>
      ) : null}
    </div>
  );
}

/* Small dropdown for the secondary actions, closes on outside click / Esc. */
function Menu({ label, items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="ia-menu" ref={ref}>
      <button type="button" className="ia-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {label} ▾
      </button>
      {open && (
        <div className="ia-menu-pop" role="menu">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className={it.danger ? "danger" : ""}
              onClick={() => { setOpen(false); it.onClick(); }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Verdict chip + Accept/Reject controls, shown under the status of a finding.
   Only renders when there is something to act on or a recorded verdict. */
function VerdictCell({ row, busy, onAccept, onReject, isAr, tt }) {
  const v = getRowVerification(row);
  if (!v.state) return null;
  /* A plain closed row with no recorded verdict says nothing the Status
     column above doesn't already say — don't repeat it. */
  if (v.state === "accepted" && !v.by && !v.at) return null;
  const tone = verificationTone(v.state);
  const stamp = v.at ? new Date(v.at).toLocaleDateString("en-GB") : "";
  const awaiting = isAwaitingQa(row);

  return (
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
      {/* The status pill above already says "awaiting"; repeat only a real verdict. */}
      {!awaiting && (
        <span className={`ia-pill sm t-${v.state === "rejected" ? "bad" : "ok"}`}>{isAr ? tone.labelAr : tone.label}</span>
      )}
      {(v.by || stamp) && (
        <span className="ia-xs ia-mute">{[v.by, stamp].filter(Boolean).join(" · ")}</span>
      )}
      {v.state === "rejected" && v.reason && (
        <span className="ia-xs" style={{ color: "#b91c1c" }}>“{v.reason}”</span>
      )}
      {awaiting && (
        <div className="pdf-no-print" style={{ display: "flex", gap: 4 }}>
          <button type="button" className="ia-btn sm ok" disabled={busy} onClick={onAccept}
            title={tt("Evidence is acceptable — close this finding", "الدليل مقبول — أغلق الملاحظة")}>
            ✔ {tt("Accept", "قبول")}
          </button>
          <button type="button" className="ia-btn sm danger" disabled={busy} onClick={onReject}
            title={tt("Send back to the branch with a reason", "أعدها للفرع مع السبب")}>
            ✖ {tt("Reject", "رفض")}
          </button>
        </div>
      )}
    </div>
  );
}

function Thumbs({ list, onView }) {
  const arr = (Array.isArray(list) ? list : []).map(getImageUrl).filter(Boolean);
  if (!arr.length) return <span className="ia-empty">—</span>;
  return (
    <div className="ia-thumbs">
      {/* Every photo is shown — the old 6-photo cap hid anything a branch sent
          beyond the sixth behind an unclickable "+N". */}
      {arr.map((src, i) => (
        <img key={i} src={src} alt="evidence" onClick={() => onView && onView(arr, i)} title="Click to preview" />
      ))}
    </div>
  );
}

function ImageField({ list, onAdd, onRemove, onView, tt }) {
  const normalizedList = (Array.isArray(list) ? list : []).map(getImageUrl).filter(Boolean);
  const count = normalizedList.length;
  const canAdd = count < 5;
  return (
    <div>
      <div className="ia-thumbs">
        {normalizedList.map((src, i) => (
          <div key={i} className="ia-thumb-edit">
            <img src={src} alt="" onClick={() => onView && onView(normalizedList, i)} title="Click to preview" />
            <button type="button" onClick={() => onRemove(i)} title="Remove">×</button>
          </div>
        ))}
      </div>
      <label className="ia-btn sm" style={{ marginTop: 6, opacity: canAdd ? 1 : 0.55, pointerEvents: canAdd ? "auto" : "none" }}>
        ⬆ {tt("Upload", "رفع")} ({count}/5)
        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files;
            f && onAdd(f);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

/* ===== Lightbox ===== */
/* Cloudinary is another origin, so the `download` attribute alone is ignored —
   fetch the bytes into a blob first; fall back to opening the photo. */
async function downloadPhoto(url, index) {
  const clean = String(url || "").split("?")[0];
  const ext = (clean.match(/\.[a-z0-9]{2,5}$/i) || [".jpg"])[0];
  const name = clean.split("/").pop() || `evidence-${index + 1}${ext}`;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const href = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 5000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

/* Same viewer as the branch evidence link (InspectionEvidencePublic.jsx):
   ‹ › through the cell's photos, counter, Download / Open / Close, Esc and
   the arrow keys. Clicking the dark backdrop closes it. */
function Lightbox({ items, index, onIndex, onClose }) {
  const total = items.length;
  const src = items[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex(index + 1);
      else if (e.key === "ArrowLeft") onIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, onClose, onIndex]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  if (!src) return null;
  const stop = (e) => e.stopPropagation();

  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Photo viewer" style={lb.wrap}>
      <div style={lb.bar} onClick={stop}>
        <div style={{ fontWeight: 900 }}>
          Photo {index + 1} / {total}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={lb.primary} onClick={() => downloadPhoto(src, index)}>⤓ Download</button>
          <button type="button" style={lb.btn} onClick={() => window.open(src, "_blank", "noopener")}>↗ Open</button>
          <button type="button" style={lb.btn} onClick={onClose}>✕ Close</button>
        </div>
      </div>
      <div style={lb.stage}>
        {total > 1 && (
          <button type="button" style={lb.nav} onClick={(e) => { stop(e); onIndex(index - 1); }} aria-label="Previous photo">‹</button>
        )}
        <img src={src} alt={`Evidence ${index + 1}`} style={lb.img} onClick={stop} />
        {total > 1 && (
          <button type="button" style={lb.nav} onClick={(e) => { stop(e); onIndex(index + 1); }} aria-label="Next photo">›</button>
        )}
      </div>
      {total > 1 && (
        <div style={lb.strip} onClick={stop}>
          {items.map((s, i) => (
            <img
              key={`${s}-${i}`}
              src={s}
              alt=""
              onClick={() => onIndex(i)}
              style={{ ...lb.mini, ...(i === index ? lb.miniOn : null) }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const lb = {
  wrap: { position: "fixed", inset: 0, zIndex: 9999, background: "rgba(8,15,23,.9)", display: "flex", flexDirection: "column", padding: "clamp(10px, 2vw, 24px)", boxSizing: "border-box", cursor: "zoom-out" },
  bar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", color: "#fff", marginBottom: 10, cursor: "default" },
  btn: { background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.32)", borderRadius: 6, padding: "9px 14px", fontWeight: 900, cursor: "pointer" },
  primary: { background: "#0f766e", color: "#fff", border: "1px solid #0b5d57", borderRadius: 6, padding: "9px 16px", fontWeight: 900, cursor: "pointer" },
  /* minHeight 0 + a definite flex basis is what lets the photo shrink to fit
     instead of pushing the bar and the strip off screen. */
  stage: { flex: "1 1 0", minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  img: { maxWidth: "calc(100% - 120px)", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 30px 60px rgba(0,0,0,.5)", background: "#0b1220", cursor: "default" },
  nav: { width: 46, height: 46, flex: "0 0 auto", borderRadius: 999, border: "1px solid rgba(255,255,255,.32)", background: "rgba(255,255,255,.14)", color: "#fff", fontSize: 22, fontWeight: 900, cursor: "pointer" },
  strip: { display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 10, cursor: "default" },
  mini: { width: 52, height: 52, objectFit: "cover", borderRadius: 6, border: "2px solid transparent", opacity: 0.6, cursor: "pointer" },
  miniOn: { borderColor: "#5eead4", opacity: 1 },
};

const preStyle = {
  background: "#0f172a",
  color: "#e2e8f0",
  padding: "10px",
  borderRadius: 8,
  overflow: "auto",
  maxHeight: 300,
  fontSize: 12,
};

/* ===== Page stylesheet =====
   globals.css forces `#root * { font-size: 14px !important }`, so sizes live
   here under a doubled class (`#root .ia.ia`) that out-ranks it, and scale
   with the Aa text-size menu through --app-fs. Light "Soft Sky" palette. */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const IA_CSS = `
#root .ia.ia {
  --bg:#f3f7fc; --line:#e3eaf3; --line2:#d3ddea; --ink:#1e293b; --ink2:#475569; --mute:#64748b;
  --accent:#2f6fde; --accentSoft:#eaf2ff;
  background:var(--bg); min-height:100vh; padding:20px; color:var(--ink);
}
#root .ia.ia, #root .ia.ia * { font-size:${fs(14)}; box-sizing:border-box; }
#root .ia.ia .ia-h1 { font-size:${fs(24)}; font-weight:700; margin:0; color:var(--ink); line-height:1.25; }
#root .ia.ia .ia-sub { color:var(--mute); margin-top:4px; }
#root .ia.ia .ia-h2 { font-size:${fs(17)}; font-weight:700; display:flex; align-items:center; gap:8px; }
#root .ia.ia .ia-xs, #root .ia.ia .ia-xs * { font-size:${fs(11.5)}; }
#root .ia.ia .ia-sm { font-size:${fs(12.5)}; }
#root .ia.ia .ia-mute { color:var(--mute); }
#root .ia.ia .ia-empty { color:#a3b1c2; }

#root .ia.ia .ia-top { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
#root .ia.ia .ia-toolbar { display:flex; gap:8px; flex-wrap:wrap; }

#root .ia.ia .ia-stats { display:grid; grid-template-columns:repeat(auto-fit, minmax(170px, 1fr)); gap:12px; margin-bottom:18px; }
#root .ia.ia .ia-stat { background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px; }
#root .ia.ia .ia-stat-label { color:var(--mute); font-size:${fs(12.5)}; font-weight:600; }
#root .ia.ia .ia-stat-val { font-size:${fs(26)}; font-weight:700; line-height:1.2; margin:4px 0 2px; color:var(--ink); }
#root .ia.ia .s-ok .ia-stat-val { color:#15803d; }
#root .ia.ia .s-warn .ia-stat-val { color:#b45309; }
#root .ia.ia .s-bad .ia-stat-val { color:#c2410c; }
#root .ia.ia .s-info .ia-stat-val { color:#1d4ed8; }

#root .ia.ia .ia-body { display:grid; grid-template-columns:340px minmax(0, 1fr); gap:18px; align-items:start; }
#root .ia.ia .ia-panel { background:#fff; border:1px solid var(--line); border-radius:14px; overflow:hidden; }
#root .ia.ia .ia-list-tools { padding:12px; display:grid; gap:8px; border-bottom:1px solid var(--line); background:#fbfdff; }
#root .ia.ia .ia-row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
#root .ia.ia .ia-input, #root .ia.ia .ia-select {
  width:100%; height:38px; border:1px solid var(--line2); border-radius:9px; padding:0 10px;
  background:#fff; color:var(--ink); font-family:inherit; outline:none;
}
#root .ia.ia .ia-input:focus, #root .ia.ia .ia-select:focus, #root .ia.ia .ia-ta:focus { border-color:var(--accent); box-shadow:0 0 0 3px rgba(47,111,222,.12); }
#root .ia.ia .ia-search { display:flex; align-items:center; gap:8px; height:38px; border:1px solid var(--line2); border-radius:9px; padding:0 10px; background:#fff; }
#root .ia.ia .ia-search input { flex:1; min-width:0; border:0; outline:none; background:transparent; color:var(--ink); font-family:inherit; }
#root .ia.ia .ia-search button { border:0; background:transparent; color:var(--mute); cursor:pointer; }
#root .ia.ia .ia-list-count { display:flex; justify-content:space-between; align-items:center; color:var(--mute); font-size:${fs(12.5)}; padding:2px 2px 0; }
#root .ia.ia .ia-list-count button { border:0; background:transparent; color:var(--accent); cursor:pointer; font-weight:600; font-size:${fs(12.5)}; font-family:inherit; }

#root .ia.ia .ia-seg { display:flex; background:#eef3f9; border-radius:9px; padding:3px; gap:2px; flex-wrap:wrap; }
#root .ia.ia .ia-seg button { flex:1; border:0; background:transparent; border-radius:7px; padding:6px 10px; font-weight:600; color:var(--ink2); cursor:pointer; white-space:nowrap; font-family:inherit; }
#root .ia.ia .ia-seg button.on { background:#fff; color:var(--accent); box-shadow:0 1px 3px rgba(15,23,42,.1); }

#root .ia.ia .ia-list { max-height:calc(100vh - 230px); min-height:240px; overflow:auto; padding:4px 8px 10px; }
#root .ia.ia .ia-month { padding:12px 6px 6px; color:var(--mute); font-weight:700; font-size:${fs(11.5)}; letter-spacing:.04em; text-transform:uppercase; }
#root .ia.ia .ia-item { width:100%; text-align:start; display:block; border:1px solid transparent; background:transparent; border-radius:10px; padding:10px 11px; cursor:pointer; color:inherit; font-family:inherit; margin-bottom:2px; }
#root .ia.ia .ia-item:hover { background:#f5f8fc; }
#root .ia.ia .ia-item.on { background:var(--accentSoft); border-color:#c6d8fa; }
#root .ia.ia .ia-item > span { display:flex; }
#root .ia.ia .ia-item-top { justify-content:space-between; gap:8px; align-items:baseline; }
#root .ia.ia .ia-item-name { font-weight:700; }
#root .ia.ia .ia-item-meta { color:var(--mute); margin-top:2px; font-size:${fs(12.5)}; }
#root .ia.ia .ia-item-foot { justify-content:space-between; align-items:center; gap:8px; margin-top:7px; }
#root .ia.ia .ia-bar { height:6px; background:#e8eef6; border-radius:99px; overflow:hidden; margin-top:8px; }
#root .ia.ia .ia-bar > span { display:block; height:100%; border-radius:99px; }

#root .ia.ia .ia-pill { display:inline-flex; align-items:center; gap:4px; border-radius:99px; padding:3px 10px; font-weight:600; white-space:nowrap; font-size:${fs(12.5)}; max-width:100%; overflow:hidden; text-overflow:ellipsis; }
#root .ia.ia .ia-pill.sm { padding:2px 8px; font-size:${fs(11.5)}; }
#root .ia.ia .t-ok   { background:#e6f6ec; color:#15803d; }
#root .ia.ia .t-warn { background:#fff3dc; color:#a15c07; }
#root .ia.ia .t-bad  { background:#fdeceb; color:#b42318; }
#root .ia.ia .t-info { background:#e8f0ff; color:#1d4ed8; }
#root .ia.ia .t-mute { background:#eef2f6; color:#55657a; }
#root .ia.ia .dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-inline-end:6px; }
#root .ia.ia .dot.t-ok { background:#22a06b; } #root .ia.ia .dot.t-info { background:#3b82f6; } #root .ia.ia .dot.t-bad { background:#e5534b; }

#root .ia.ia .ia-btn { height:36px; padding:0 14px; border-radius:9px; border:1px solid var(--line2); background:#fff; color:var(--ink); font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font-family:inherit; white-space:nowrap; text-decoration:none; }
#root .ia.ia .ia-btn:hover { background:#f5f8fc; }
#root .ia.ia .ia-btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
#root .ia.ia .ia-btn.primary:hover { background:#2860c4; }
#root .ia.ia .ia-btn.ok { background:#1f9d5c; border-color:#1f9d5c; color:#fff; }
#root .ia.ia .ia-btn.ok:hover { background:#188a50; }
#root .ia.ia .ia-btn.danger { color:#b42318; border-color:#f2c9c5; background:#fff; }
#root .ia.ia .ia-btn.danger:hover { background:#fdf1f0; }
#root .ia.ia .ia-btn:disabled { opacity:.55; cursor:default; }
#root .ia.ia .ia-btn.sm { height:30px; padding:0 10px; font-size:${fs(12.5)}; }

#root .ia.ia .ia-menu { position:relative; }
#root .ia.ia .ia-menu-pop { position:absolute; top:calc(100% + 6px); inset-inline-start:0; background:#fff; border:1px solid var(--line); border-radius:10px; box-shadow:0 14px 30px rgba(15,23,42,.13); padding:6px; min-width:210px; z-index:50; display:grid; gap:2px; }
#root .ia.ia .ia-menu-pop button { text-align:start; border:0; background:transparent; padding:9px 10px; border-radius:7px; cursor:pointer; color:var(--ink); font-family:inherit; }
#root .ia.ia .ia-menu-pop button:hover { background:#f3f7fc; }
#root .ia.ia .ia-menu-pop button.danger { color:#b42318; }

#root .ia.ia .ia-card { background:#fff; border:1px solid var(--line); border-radius:14px; padding:20px; margin-bottom:16px; }
#root .ia.ia .ia-doc { display:flex; flex-wrap:wrap; gap:6px 18px; color:var(--mute); font-size:${fs(12.5)}; padding-bottom:12px; margin-bottom:16px; border-bottom:1px dashed var(--line2); }
#root .ia.ia .ia-doc * { font-size:${fs(12.5)}; }
#root .ia.ia .ia-doc b { color:var(--ink2); font-weight:600; }
#root .ia.ia .ia-hero { display:flex; gap:24px; justify-content:space-between; flex-wrap:wrap; }
#root .ia.ia .ia-hero-title { font-size:${fs(24)}; font-weight:700; line-height:1.25; }
#root .ia.ia .ia-hero-sub { color:var(--ink2); margin-top:4px; }
#root .ia.ia .ia-meta { display:grid; grid-template-columns:repeat(auto-fill, minmax(180px, 1fr)); gap:14px 22px; margin-top:18px; }
#root .ia.ia .ia-label { color:var(--mute); font-size:${fs(12.5)}; margin-bottom:3px; }
#root .ia.ia .ia-val { font-weight:600; word-break:break-word; }
#root .ia.ia .ia-progress { display:flex; flex-direction:column; align-items:center; gap:10px; min-width:150px; }
#root .ia.ia .ia-ring { width:112px; height:112px; border-radius:50%; display:grid; place-items:center; }
#root .ia.ia .ia-ring-in { width:88px; height:88px; border-radius:50%; background:#fff; display:grid; place-content:center; text-align:center; }
#root .ia.ia .ia-ring-val { font-size:${fs(24)}; font-weight:700; line-height:1.1; }
#root .ia.ia .ia-counts { display:grid; gap:3px; color:var(--ink2); font-size:${fs(12.5)}; }
#root .ia.ia .ia-counts * { font-size:${fs(12.5)}; }
#root .ia.ia .ia-chips { display:flex; gap:8px; flex-wrap:wrap; margin-top:18px; }
#root .ia.ia .ia-actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:16px; padding-top:16px; border-top:1px solid var(--line); }
#root .ia.ia .ia-spacer { flex:1; }

#root .ia.ia .ia-sec-head { display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px; }
#root .ia.ia .ia-count { background:#eef2f6; color:var(--ink2); border-radius:99px; padding:1px 9px; font-size:${fs(12.5)}; font-weight:600; }
#root .ia.ia .ia-tbl-scroll { overflow-x:auto; }
#root .ia.ia .ia-tbl { min-width:1080px; border:1px solid var(--line); border-radius:12px; overflow:hidden; }
#root .ia.ia .ia-tr { display:grid; grid-template-columns:46px 1.25fr 1fr 1.25fr 1fr 1.1fr 150px 170px; border-top:1px solid var(--line); }
#root .ia.ia .ia-tbl.editing .ia-tr { grid-template-columns:46px 1.25fr 1fr 1.25fr 1fr 1.1fr 170px 190px 52px; }
#root .ia.ia .ia-tr > div { padding:12px; white-space:pre-wrap; word-break:break-word; line-height:1.5; min-width:0; }
#root .ia.ia .ia-tr > div + div { border-inline-start:1px solid #eef2f7; }
#root .ia.ia .ia-th { background:#f6f9fd; border-top:0; }
#root .ia.ia .ia-th > div { font-weight:600; color:var(--ink2); font-size:${fs(12.5)}; padding:10px 12px; white-space:normal; }
#root .ia.ia .ia-num { font-weight:700; color:var(--mute); text-align:center; }
#root .ia.ia .ia-tr.b-open .ia-num { box-shadow:inset 3px 0 0 #e5534b; }
#root .ia.ia .ia-tr.b-awaiting .ia-num { box-shadow:inset 3px 0 0 #3b82f6; }
#root .ia.ia .ia-tr.b-closed .ia-num { box-shadow:inset 3px 0 0 #22a06b; }
#root .ia.ia .ia-tr:hover { background:#fbfcfe; }
#root .ia.ia .ia-thumbs { display:flex; gap:6px; flex-wrap:wrap; }
#root .ia.ia .ia-thumbs img { width:56px; height:56px; object-fit:cover; border-radius:8px; border:1px solid var(--line); cursor:zoom-in; }
#root .ia.ia .ia-thumb-edit { position:relative; }
#root .ia.ia .ia-thumb-edit button { position:absolute; top:-6px; inset-inline-end:-6px; width:20px; height:20px; border-radius:50%; border:2px solid #fff; background:#e5534b; color:#fff; cursor:pointer; line-height:14px; padding:0; }
#root .ia.ia .ia-note { margin-top:8px; padding:8px 10px; border-radius:8px; background:#fff8e6; border:1px solid #f4e1b0; color:#7a4b06; font-size:${fs(12.5)}; }
#root .ia.ia .ia-note * { font-size:${fs(12.5)}; }
#root .ia.ia .ia-ta { width:100%; min-height:84px; resize:vertical; border:1px solid var(--line2); border-radius:8px; padding:8px 10px; font-family:inherit; color:var(--ink); background:#fff; outline:none; }
#root .ia.ia .ia-quote { background:#f7fafd; border:1px solid var(--line); border-radius:10px; padding:12px 14px; white-space:pre-wrap; line-height:1.6; }
#root .ia.ia .ia-state { padding:36px 16px; text-align:center; color:var(--mute); }
#root .ia.ia .ia-error { color:#b42318; }

@media (max-width: 1100px) {
  #root .ia.ia .ia-body { grid-template-columns:1fr; }
  #root .ia.ia .ia-list { max-height:360px; }
}
@media (max-width: 640px) {
  #root .ia.ia { padding:12px; }
  #root .ia.ia .ia-card { padding:14px; }
  #root .ia.ia .ia-progress { flex-direction:row; }
}
@media print {
  #root .ia.ia { background:#fff; padding:0; }
  #root .ia.ia .ia-no-print { display:none !important; }
  #root .ia.ia .ia-body { grid-template-columns:1fr; }
  #root .ia.ia .ia-card { border-color:#cbd5e1; break-inside:auto; }
}
`;
