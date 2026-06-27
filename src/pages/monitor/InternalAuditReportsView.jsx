// src/pages/monitor/InternalAuditReportsView.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SignatureName from "../shared/SignatureName";
import { buildInspectionEvidencePublic } from "../../utils/inspectionPublicLink";

/* ===== API base (aligned with your project) ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const fromWindow = typeof window !== "undefined" ? window.__QCS_API__ : undefined;
const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL ||
       process.env?.VITE_API_URL ||
       process.env?.RENDER_EXTERNAL_URL)
    : undefined;
let fromVite;
try {
  fromVite =
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL);
} catch {
  fromVite = undefined;
}
const API_BASE = String(
  fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT
).replace(/\/$/, "");
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
  if (allClosed) return { label: "Closed by QA", bg: "#dcfce7", color: "#166534" };
  if (payload?.fields?.closedEvidenceSubmittedAt || payload?.public?.status === "evidence_submitted") {
    return { label: "Evidence Submitted", bg: "#dbeafe", color: "#1d4ed8" };
  }
  if (payload?.fields?.closedEvidenceProgressSavedAt || payload?.public?.status === "evidence_in_progress" || getBranchEvidenceUpdates(payload).length > 0) {
    return { label: "Evidence In Progress", bg: "#fef3c7", color: "#92400e" };
  }
  return { label: "Pending Evidence", bg: "#fee2e2", color: "#991b1b" };
}

function mergeBranchEvidenceIntoPayload(payload = {}) {
  const table = Array.isArray(payload.table) ? payload.table : [];
  const nextTable = table.map((row, idx) => {
    const existing = getRowClosedEvidenceImages(row);
    const incoming = getBranchEvidenceForRow(payload, idx);
    const merged = Array.from(new Set([...existing, ...incoming])).slice(0, 5);
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

/* ===== Known branch codes (normalize branch name from raw text) ===== */
/* ===== Smart branch matching =====
 * Each branch has a canonical code + a list of aliases (English + Arabic)
 * that often appear in audit reports as the "location" or "branch" field.
 * The matcher is order-sensitive: more specific codes come first so
 * "POS 11" doesn't accidentally match "POS 1".
 */
const BRANCHES = [
  { code: "QCS",         labelEn: "QCS — Al Qusais Warehouse",       labelAr: "QCS — مستودع القصيص",          aliases: ["QCS","QUSAIS WAREHOUSE","QUSAIS-WAREHOUSE","AL QUSAIS","ALQUSAIS","QUSAIS","قصيص","مستودع القصيص","المستودع"] },
  { code: "POS 45",      labelEn: "POS 45",                          labelAr: "POS 45",                       aliases: ["POS 45","POS45"] },
  { code: "POS 44",      labelEn: "POS 44",                          labelAr: "POS 44",                       aliases: ["POS 44","POS44"] },
  { code: "POS 43",      labelEn: "POS 43",                          labelAr: "POS 43",                       aliases: ["POS 43","POS43"] },
  { code: "POS 42",      labelEn: "POS 42",                          labelAr: "POS 42",                       aliases: ["POS 42","POS42"] },
  { code: "POS 41",      labelEn: "POS 41",                          labelAr: "POS 41",                       aliases: ["POS 41","POS41"] },
  { code: "POS 38",      labelEn: "POS 38",                          labelAr: "POS 38",                       aliases: ["POS 38","POS38"] },
  { code: "POS 37",      labelEn: "POS 37",                          labelAr: "POS 37",                       aliases: ["POS 37","POS37"] },
  { code: "POS 36",      labelEn: "POS 36",                          labelAr: "POS 36",                       aliases: ["POS 36","POS36"] },
  { code: "POS 35",      labelEn: "POS 35",                          labelAr: "POS 35",                       aliases: ["POS 35","POS35"] },
  { code: "POS 34",      labelEn: "POS 34",                          labelAr: "POS 34",                       aliases: ["POS 34","POS34"] },
  { code: "POS 31",      labelEn: "POS 31",                          labelAr: "POS 31",                       aliases: ["POS 31","POS31"] },
  { code: "POS 26",      labelEn: "POS 26",                          labelAr: "POS 26",                       aliases: ["POS 26","POS26"] },
  { code: "POS 25",      labelEn: "POS 25",                          labelAr: "POS 25",                       aliases: ["POS 25","POS25"] },
  { code: "POS 24",      labelEn: "POS 24",                          labelAr: "POS 24",                       aliases: ["POS 24","POS24"] },
  { code: "POS 21",      labelEn: "POS 21",                          labelAr: "POS 21",                       aliases: ["POS 21","POS21"] },
  { code: "POS 19",      labelEn: "POS 19 — Motor City",             labelAr: "POS 19 — موتور سيتي",          aliases: ["POS 19","POS19","MOTOR CITY"] },
  { code: "POS 18",      labelEn: "POS 18",                          labelAr: "POS 18",                       aliases: ["POS 18","POS18"] },
  { code: "POS 17",      labelEn: "POS 17 — Mushrif Coop",           labelAr: "POS 17 — تعاونية المشرف",      aliases: ["POS 17","POS17","MUSHRIF COOP","تعاونية المشرف"] },
  { code: "POS 16",      labelEn: "POS 16 — AFCOP Maqta Mall",        labelAr: "POS 16 — AFCOP مول المقطع",   aliases: ["POS 16","POS16","AFCOP","MAQTA MALL","المقطع"] },
  // 🔥 Aliased branches (Arabic names + butchery name):
  { code: "POS 15",      labelEn: "POS 15 — Al Barsha Butchery",     labelAr: "POS 15 — ملحمة البرشا",        aliases: ["POS 15","POS15","ALBARSHA","AL BARSHA","ملحمة البرشا","البرشا","BARSHA"] },
  { code: "POS 14",      labelEn: "POS 14 — Al Ain Market",          labelAr: "POS 14 — سوق العين",          aliases: ["POS 14","POS14","AL AIN MARKET","سوق العين"] },
  { code: "POS 11",      labelEn: "POS 11 — Al Ain Butchery",        labelAr: "POS 11 — ملحمة العين",        aliases: ["POS 11","POS11","AL AIN BUTCHERY","ملحمة العين","AL AIN","العين"] },
  { code: "POS 10",      labelEn: "POS 10 — Abu Dhabi Butchery",     labelAr: "POS 10 — ملحمة أبوظبي",        aliases: ["POS 10","POS10","ABU DHABI BUTCHERY","ملحمة أبوظبي","ملحمة ابوظبي","ABU DHABI","ABUDHABI","أبوظبي","ابوظبي"] },
  { code: "POS 7",       labelEn: "POS 7",                           labelAr: "POS 7",                        aliases: ["POS 7","POS7"] },
  { code: "POS 6",       labelEn: "POS 6 — Sharjah Butchery",        labelAr: "POS 6 — ملحمة الشارقة",        aliases: ["POS 6","POS6","SHARJAH BUTCHERY","ملحمة الشارقة","الشارقة"] },
  { code: "FTR 1",       labelEn: "FTR 1 — Al Mushrif Park",         labelAr: "FTR 1 — حديقة المشرف",         aliases: ["FTR1","FTR 1","AL MUSHRIF","MUSHRIF PARK","المشرف","حديقة المشرف","حديقة المشرف بارك"] },
  { code: "FTR 2",       labelEn: "FTR 2 — Al Mamzar (Park/Beach)",  labelAr: "FTR 2 — الممزر (حديقة/شاطئ)",  aliases: ["FTR2","FTR 2","MAMZAR","AL MAMZAR","الممزر","حديقة الممزر","شاطئ الممزر"] },
  { code: "PRODUCTION",  labelEn: "Production",                       labelAr: "الإنتاج",                      aliases: ["PRODUCTION","الإنتاج","انتاج"] },
];

/** Normalize a string for matching: strip spaces, dashes, diacritics, lowercase. */
function _normalize(s) {
  return String(s || "")
    .replace(/[ً-ْ]/g, "")   // strip Arabic diacritics
    .toUpperCase()
    .replace(/[\s\-_،,()/]+/g, "");
}

function canonicalBranchName(str) {
  if (!str) return "";
  const t = String(str).trim();
  const norm = _normalize(t);
  for (const b of BRANCHES) {
    for (const alias of b.aliases) {
      const a = _normalize(alias);
      if (!a) continue;
      if (norm === a || norm.includes(a)) return b.code;
    }
  }
  return t; // unknown — keep as-is
}

/** Returns a friendly display label for a canonical branch code in the chosen language. */
function getBranchLabel(code, lang) {
  const found = BRANCHES.find((b) => b.code === code);
  if (!found) return code;
  return lang === "ar" ? found.labelAr : found.labelEn;
}

// Back-compat: legacy array of just codes (used in a few spots)
const BRANCH_CODES = BRANCHES.map((b) => b.code);

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

/* date tree from normalized views (Year -> Month -> Day) */
function buildDateTreeFromViews(list) {
  const tree = {};
  list.forEach((v) => {
    const d = new Date(v.ts || Date.now());
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    (tree[y] ||= {});
    (tree[y][m] ||= {});
    tree[y][m][day] = (tree[y][m][day] || 0) + 1;
  });
  return tree;
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

/* ===== Color palette ===== */
const C = {
  border: "#9aa3b8",
  borderStrong: "#64748b",
  cardBg: "#ffffff",
  bandBlue: "#e9f0ff",
  bandGreen: "#e9fbe7",
  bandSilver: "#f5f7fa",
  zebra: "#f8fafc",
  headerGradFrom: "#e8f1ff",
  headerGradTo: "#e7ffef",
  badgeFrom: "#34d399",
  badgeTo: "#60a5fa",
};

export default function InternalAuditReportsView() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);   // ✅ auto-load on mount (DB is now lightweight after migration)
  const [branchFilter, setBranchFilter] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  // Date tree filters
  const [yearFilter, setYearFilter] = useState(null);
  const [monthFilter, setMonthFilter] = useState(null);
  const [dayFilter, setDayFilter] = useState(null);

  // Inline edit state
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState(null); // full raw report (server schema)

  // Accordion (collapsed months): key = "YYYY-MM"
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [collapsedInit, setCollapsedInit] = useState(false);

  // Image viewer (lightbox)
  const [viewerSrc, setViewerSrc] = useState(null);

  // فتح/إغلاق لكل تقرير بشكل منفصل
  const [openCards, setOpenCards] = useState(() => new Set());
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
      setError(e?.message || "Failed to load reports. The server may be out of memory (try /admin/image-migration first).");
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

      // === هنا التعديل المهم ===
      // نأخذ branch إن وجد، أو header.branch، وإذا كان الاثنين فاضيين نستخدم location
      const branchRaw =
        r.branch || header.branch || header.location || "";
      const branch = canonicalBranchName(branchRaw);
      const location = header.location || "";

      return {
        _raw: r,
        id: r.id || r._id || r.pk || undefined,
        ts: tsBase,
        y: d.getUTCFullYear(),
        m: d.getUTCMonth() + 1,
        d: d.getUTCDate(),
        branch,          // يُستخدم في الفلترة والقائمة
        branchRaw,
        location,        // للعرض فقط
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
      .filter((x) => !dayFilter || x.d === dayFilter)
      .filter((x) =>
        !q ||
        [x.branch, x.title, x.auditBy, x.reportNo].some((v) =>
          String(v || "").toLowerCase().includes(q.toLowerCase())
        )
      )
      .sort((a, b) => b.ts - a.ts);
  }, [normalized, branchFilter, q, yearFilter, monthFilter, dayFilter]);

  const branches = useMemo(() => {
    const s = new Set();
    normalized.forEach((r) => r.branch && s.add(r.branch));
    return Array.from(s).sort();
  }, [normalized]);

  const dateTree = useMemo(
    () => buildDateTreeFromViews(normalized),
    [normalized]
  );

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

    // count of "no" answers across all tables (open findings)
    let openFindings = 0, totalFindings = 0;
    for (const r of normalized) {
      for (const row of (r.table || [])) {
        // Look for status / closed / answer-like fields
        const status = String(row.status || row.closed || row.answer || row.compliance || "").toLowerCase();
        if (status) totalFindings++;
        if (status === "no" || status === "open" || status === "not closed") openFindings++;
      }
    }

    const branchCount = branches.length;
    const lastAudit = normalized[0];

    return {
      total,
      thisMonthCount,
      last30dCount,
      avgClosure,
      openFindings,
      totalFindings,
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

  const copyEvidenceLink = async (r) => {
    try {
      const raw = JSON.parse(JSON.stringify(r._raw || {}));
      raw.payload = raw.payload || {};
      const previousPublic = JSON.stringify(raw.payload.public || {});
      raw.payload.public = buildInspectionEvidencePublic(raw.payload.public || {});
      const publicChanged = JSON.stringify(raw.payload.public || {}) !== previousPublic;
      if (publicChanged) {
        await saveRawReport(raw);
        await refresh();
      }
      const url = raw.payload.public.url;
      try {
        await navigator.clipboard.writeText(url);
        alert("Branch evidence link copied.");
      } catch {
        window.prompt("Copy branch evidence link:", url);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to create/copy evidence link.");
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
      if (!el) { alert("Open the report card first, then export."); return; }

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
      document.body.appendChild(clone);

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
      document.body.removeChild(clone);

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
      setOpenCards(new Set());
    }
  }, [rows, selectedId]);

  useEffect(() => {
    if (!collapsedInit && groups.length) {
      setCollapsed(new Set());
      setCollapsedInit(true);
      setOpenCards(new Set());
    }
  }, [groups, collapsedInit, rows]);

  const toggleMonth = (key) => {
    setCollapsed((prev) => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key);
      else s.add(key);
      return s;
    });
  };
  const toggleCard = (id) => {
    setOpenCards((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  };

  const selectReport = (id) => {
    setSelectedId(id);
    setOpenCards(new Set());
  };

  const monthName = (m) =>
    new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en", {
      month: "long",
    });

  return (
    <div
      className="ia-shell ia-page"
      style={{
        display: "grid",
        gridTemplateColumns: "280px minmax(0, 1fr)",
        gap: 16,
        padding: 16,
        fontFamily: "Arial, sans-serif",
        direction: "ltr",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
      }}
    >
      <style>{`
        @media print {
          .ia-no-print { display: none !important; }
          body { background: #fff !important; }
        }
        @media (max-width: 1180px) {
          .ia-shell { grid-template-columns: 1fr !important; }
          .ia-date-tree { position: relative !important; top: auto !important; max-height: none !important; }
          .ia-workspace { grid-template-columns: 1fr !important; }
          .ia-report-rail { position: relative !important; top: auto !important; max-height: none !important; }
        }
        @media (max-width: 720px) {
          .ia-page { padding: 10px !important; }
          .ia-title-row { align-items: flex-start !important; }
          .ia-tools { border-radius: 10px !important; }
        }
      `}</style>
      {/* ====== Modern Date Tree Sidebar ====== */}
      <aside style={treeAside} className="ia-no-print ia-date-tree">
        <div style={treeHeader}>
          <span style={{ fontSize: 16 }}>🗂️</span>
          <span style={{ fontWeight: 1000, fontSize: 13 }}>{tt("Date Tree", "شجرة التواريخ")}</span>
          <span style={treeCountBadge}>{normalized.length}</span>
        </div>

        <button
          type="button"
          style={treeAllBtn(yearFilter == null && monthFilter == null && dayFilter == null)}
          onClick={() => { setYearFilter(null); setMonthFilter(null); setDayFilter(null); }}
        >
          📁 {tt("All Reports", "كل التقارير")}
          <span style={treeCountBadgeSm}>{normalized.length}</span>
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
          {Object.keys(dateTree).sort((a, b) => b - a).map((y) => {
            const yOpen = yearFilter === Number(y);
            const yCount = Object.values(dateTree[y]).reduce((a, mObj) => a + Object.values(mObj).reduce((b, day) => b + (day?.length || 0), 0), 0);
            return (
              <div key={y}>
                <button
                  type="button"
                  style={treeYearBtn(yOpen)}
                  onClick={() => {
                    if (yOpen) { setYearFilter(null); setMonthFilter(null); setDayFilter(null); }
                    else { setYearFilter(Number(y)); setMonthFilter(null); setDayFilter(null); }
                  }}
                >
                  <span style={treeChev}>{yOpen ? "▼" : "▶"}</span>
                  <span style={{ fontWeight: 1000, fontSize: 13 }}>📅 {y}</span>
                  <span style={treeCountBadgeSm}>{yCount}</span>
                </button>
                {yOpen && (
                  <div style={{ marginInlineStart: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 3 }}>
                    {Object.keys(dateTree[y]).sort((a, b) => Number(b) - Number(a)).map((m) => {
                      const mOpen = monthFilter === Number(m);
                      const mCount = Object.values(dateTree[y][m]).reduce((a, day) => a + (day?.length || 0), 0);
                      return (
                        <div key={m}>
                          <button
                            type="button"
                            style={treeMonthBtn(mOpen)}
                            onClick={() => {
                              if (mOpen) { setMonthFilter(null); setDayFilter(null); }
                              else { setMonthFilter(Number(m)); setDayFilter(null); }
                            }}
                          >
                            <span style={treeChev}>{mOpen ? "▼" : "▶"}</span>
                            <span style={{ fontWeight: 900, fontSize: 12 }}>
                              {monthName(Number(m))}
                            </span>
                            <span style={treeCountBadgeSm}>{mCount}</span>
                          </button>
                          {mOpen && (
                            <div style={{ marginInlineStart: 14, marginTop: 3, display: "flex", flexDirection: "column", gap: 2 }}>
                              {Object.keys(dateTree[y][m]).sort((a, b) => Number(b) - Number(a)).map((d) => {
                                const dActive = dayFilter === Number(d);
                                const dCount = dateTree[y][m][d]?.length || 0;
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    style={treeDayBtn(dActive)}
                                    onClick={() => setDayFilter(dActive ? null : Number(d))}
                                  >
                                    <span style={{ fontWeight: 800, fontSize: 11 }}>
                                      {String(d).padStart(2, "0")} {monthName(Number(m)).slice(0, 3)}
                                    </span>
                                    <span style={treeCountBadgeSm}>{dCount}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <main>
        {/* ====== Modern Header ====== */}
        <div style={modernHeader.card} dir={isAr ? "rtl" : "ltr"}>
          <div style={modernHeader.row} className="ia-title-row">
            <div style={modernHeader.brandWrap}>
              <div style={modernHeader.brandIco}>📋</div>
              <div>
                <h1 style={modernHeader.title}>
                  {tt("Internal Audit Reports — CAPA", "تقارير التدقيق الداخلي — CAPA")}
                </h1>
                <div style={modernHeader.subtitle}>
                  {tt("Track findings, corrective actions & closure rates", "متابعة الملاحظات والإجراءات التصحيحية ونسب الإغلاق")}
                </div>
              </div>
            </div>

            <div style={modernHeader.toolbar}>
              <button type="button" onClick={togglePageLang} style={modernHeader.toolBtn} title="Toggle language">
                🌐 {isAr ? "EN" : "AR"}
              </button>
              <button type="button" onClick={loadReports} disabled={loading} style={modernHeader.toolBtn} title="Refresh">
                ↻ {tt("Refresh", "تحديث")}
              </button>
              <button type="button" onClick={() => window.print()} style={modernHeader.toolBtn} title="Print">
                🖨️ {tt("Print", "طباعة")}
              </button>
              <button type="button" onClick={() => navigate("/ai-assistant")} style={modernHeader.aiBtn} title="AI Assistant">
                🤖 {tt("AI", "AI")}
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div style={modernHeader.kpiRow} className="ia-no-print">
            <KpiTile icon="📁" label={tt("Total Reports", "إجمالي")} value={kpis.total} color="#0f172a" bg="linear-gradient(135deg,#fff,#f1f5f9)" />
            <KpiTile icon="📅" label={tt("This Month", "هذا الشهر")} value={kpis.thisMonthCount} color="#1e40af" bg="linear-gradient(135deg,#dbeafe,#eff6ff)" />
            <KpiTile icon="⏱️" label={tt("Last 30d", "آخر 30 يوم")} value={kpis.last30dCount} color="#5b21b6" bg="linear-gradient(135deg,#e9d5ff,#faf5ff)" />
            <KpiTile icon="🏢" label={tt("Branches", "الفروع")} value={kpis.branchCount} color="#0e7490" bg="linear-gradient(135deg,#cffafe,#ecfeff)" />
            <KpiTile
              icon="✅"
              label={tt("Closure Rate", "نسبة الإغلاق")}
              value={`${kpis.avgClosure}%`}
              color={kpis.avgClosure >= 80 ? "#166534" : kpis.avgClosure >= 50 ? "#92400e" : "#991b1b"}
              bg={kpis.avgClosure >= 80 ? "linear-gradient(135deg,#dcfce7,#f0fdf4)" :
                  kpis.avgClosure >= 50 ? "linear-gradient(135deg,#fef3c7,#fffbeb)" :
                  "linear-gradient(135deg,#fee2e2,#fef2f2)"}
            />
            {kpis.openFindings > 0 && (
              <KpiTile icon="🚨" label={tt("Open Findings", "ملاحظات مفتوحة")} value={kpis.openFindings} color="#991b1b" bg="linear-gradient(135deg,#fee2e2,#fef2f2)" />
            )}
            <KpiTile icon="🕐" label={tt("Last Audit", "آخر تدقيق")} value={kpis.lastAuditDate} color="#475569" bg="linear-gradient(135deg,#f8fafc,#fff)" smaller />
          </div>
        </div>

        {/* ====== Tools bar (filter / search / sort) ====== */}
        <div style={toolsBar.row} className="ia-no-print ia-tools" dir={isAr ? "rtl" : "ltr"}>
          <div style={toolsBar.searchWrap}>
            <span style={toolsBar.searchIcon}>🔍</span>
            <input
              placeholder={tt("Search by branch / title / report no / auditor…", "ابحث بالفرع / العنوان / رقم التقرير / المُدقق…")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={toolsBar.searchInput}
            />
            {q && <button type="button" onClick={() => setQ("")} style={toolsBar.clearBtn}>✕</button>}
          </div>

          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            style={toolsBar.select}
          >
            <option value="">{tt("All Branches", "كل الفروع")} ({branches.length})</option>
            {branches.map((b) => (
              <option key={b} value={b}>{getBranchLabel(b, pageLang)}</option>
            ))}
          </select>

          {(branchFilter || q || yearFilter != null || monthFilter != null || dayFilter != null) && (
            <button
              type="button"
              onClick={() => { setBranchFilter(""); setQ(""); setYearFilter(null); setMonthFilter(null); setDayFilter(null); }}
              style={toolsBar.clearAll}
            >
              ✕ {tt("Clear all filters", "مسح الفلاتر")}
            </button>
          )}

          <span style={{ flex: 1 }} />

          <span style={toolsBar.resultCount}>
            {tt("Showing", "يعرض")} <strong>{rows.length}</strong> / {normalized.length}
          </span>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && !error && groups.length === 0 && <p>No reports found.</p>}

        <div
          className="ia-workspace"
          style={auditWorkspace}
        >
          <section style={reportRail} className="ia-no-print ia-report-rail" dir={isAr ? "rtl" : "ltr"}>
            <div style={railHeader}>
              <div>
                <div style={railTitle}>{tt("Report Queue", "قائمة التقارير")}</div>
                <div style={railSub}>{tt("Select one report to review, export, or update", "اختر تقريراً للمراجعة أو التصدير أو التحديث")}</div>
              </div>
              <span style={railCount}>{rows.length}</span>
            </div>
            <div style={railList}>
              {rows.map((r) => {
                const active = selectedId === r.id;
                const evidenceStatus = getBranchEvidenceStatus(r._raw?.payload || {});
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => selectReport(r.id)}
                    style={reportListItem(active)}
                  >
                    <span style={reportListTop}>
                      <span style={reportBranch}>{r.branch ? getBranchLabel(r.branch, pageLang) : "-"}</span>
                      <span style={reportDate}>{r.date || "-"}</span>
                    </span>
                    <span style={reportMetaLine}>
                      <b>{r.reportNo || "-"}</b>
                      <span>{r.auditBy || "-"}</span>
                    </span>
                    <span style={reportProgressTrack}>
                      <span style={reportProgressFill(calcClosedPct(r.table || []))} />
                    </span>
                    <span style={reportFooterLine}>
                      <span>{tt("Closed", "مغلق")} {calcClosedPct(r.table || [])}%</span>
                      <span style={{ ...miniStatus, background: evidenceStatus.bg, color: evidenceStatus.color }}>
                        {evidenceStatus.label}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={detailStage}>
          {groups.map(([key, list]) => {
            const [yy, mm] = key.split("-");
            const isClosed = collapsed.has(key);
            const visibleList = list.filter((r) => r.id === selectedId);
            if (!visibleList.length) return null;
            return (
              <div
                key={key}
                style={monthDetailShell}
              >
                <div
                  onClick={() => toggleMonth(key)}
                  style={{
                    cursor: "pointer",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: `linear-gradient(90deg, ${C.headerGradFrom}, ${C.headerGradTo})`,
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {monthName(Number(mm))} {yy}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    {list.length} report(s)
                  </div>
                </div>

                {!isClosed && (
                  <div
                    style={{
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "1fr",
                      gap: 14,
                    }}
                  >
                    {visibleList.map((r, idx) => {
                      const isEditing = editId === r.id;
                      const open = openCards.has(r.id);
                      const p = isEditing
                        ? draft.payload || {}
                        : r._raw.payload || {};
                      const header = p.header || {};
                      const footer = p.footer || {};
                      const table = Array.isArray(p.table) ? p.table : [];
                      const branchEvidenceCount = getBranchEvidenceUpdates(p).reduce(
                        (sum, item) => sum + (Array.isArray(item?.images) ? item.images.map(getImageUrl).filter(Boolean).length : 0),
                        0
                      );
                      const branchEvidenceUploadedBy = getBranchEvidenceUploadedBy(p);
                      const branchEvidenceStatus = getBranchEvidenceStatus(p);

                      return (
                        <div
                          key={idx}
                          ref={(el) => {
                            if (el) cardRefs.current[r.id] = el;
                          }}
                          style={{ ...cardStyle, background: C.cardBg }}
                        >
                          <div
                            style={{
                              background: C.bandSilver,
                              border: `1px solid ${C.border}`,
                              borderRadius: 10,
                              padding: "8px 10px",
                              marginBottom: 8,
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 10,
                              fontSize: 12,
                            }}
                          >
                            <b>Document Number:</b>&nbsp;FS-QM/REC/CA/1
                            <span style={{ opacity: 0.6 }}>|</span>
                            <b>Revision No:</b>&nbsp;00
                            <span style={{ opacity: 0.6 }}>|</span>
                            <b>Issued By:</b>&nbsp;{r.issuedBy}
                            <span style={{ opacity: 0.6 }}>|</span>
                            <b>Approved By:</b>&nbsp;<SignatureName name={r.approvedBy} underline={false} inline />
                          </div>

                          <div
                            onClick={() => toggleCard(r.id)}
                            style={{
                              cursor: "pointer",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 6,
                            }}
                          >
                            <div>
                              {isEditing ? (
                                <input
                                  style={inputInline}
                                  value={p.title || ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    draft.payload = p;
                                    p.title = e.target.value;
                                    setDraft({ ...draft });
                                  }}
                                  placeholder="Report Title"
                                />
                              ) : (
                                <>
                                  <div style={{ fontWeight: 700 }}>
                                    {r.branch ? getBranchLabel(r.branch, pageLang) : "-"}
                                  </div>
                                  {r.location && (
                                    <div
                                      style={{
                                        opacity: 0.7,
                                        fontSize: 11,
                                      }}
                                    >
                                      {r.location}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      opacity: 0.8,
                                      fontSize: 12,
                                    }}
                                  >
                                    {r.title}
                                  </div>
                                </>
                              )}
                            </div>
                            <div
                              style={{
                                textAlign: "right",
                                fontSize: 12,
                              }}
                            >
                              {!isEditing ? (
                                <>
                                  <div style={{ opacity: 0.8 }}>
                                    {r.date}
                                  </div>
                                  <div style={{ opacity: 0.8 }}>
                                    Report No: {r.reportNo}
                                  </div>
                                  <div
                                    style={{
                                      marginTop: 6,
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                      background: `linear-gradient(90deg, ${C.badgeFrom}, ${C.badgeTo})`,
                                      color: "#083344",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Closed Items:{" "}
                                    {calcClosedPct(table)}%
                                  </div>
                                  <div
                                    style={{
                                      marginTop: 6,
                                      display: "inline-block",
                                      padding: "3px 9px",
                                      borderRadius: 999,
                                      background: branchEvidenceStatus.bg,
                                      color: branchEvidenceStatus.color,
                                      fontWeight: 900,
                                    }}
                                  >
                                    {branchEvidenceStatus.label}
                                  </div>
                                  {branchEvidenceCount > 0 && (
                                    <div style={{ marginTop: 6, fontWeight: 800, color: "#166534" }}>
                                      Branch evidence: {branchEvidenceCount} image(s)
                                    </div>
                                  )}
                                  {branchEvidenceUploadedBy && (
                                    <div style={{ marginTop: 4, fontWeight: 800, color: "#0f766e" }}>
                                      Uploaded by: {branchEvidenceUploadedBy}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div>
                                    <input
                                      style={inputInline}
                                      value={header.date || ""}
                                      onClick={(e) =>
                                        e.stopPropagation()
                                      }
                                      onChange={(e) =>
                                        editHeader("date", e.target.value)
                                      }
                                      placeholder="YYYY-MM-DD"
                                    />
                                  </div>
                                  <div>
                                    Report No:{" "}
                                    <input
                                      style={inputInline}
                                      value={header.reportNo || ""}
                                      onClick={(e) =>
                                        e.stopPropagation()
                                      }
                                      onChange={(e) =>
                                        editHeader(
                                          "reportNo",
                                          e.target.value
                                        )
                                      }
                                    />
                                  </div>
                                  <div
                                    style={{
                                      marginTop: 6,
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                      background: `linear-gradient(90deg, ${C.badgeFrom}, ${C.badgeTo})`,
                                      color: "#083344",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Closed Items:{" "}
                                    {calcClosedPct(table)}%
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 8,
                              marginBottom: 10,
                            }}
                          >
                            <div>
                              <b>Auditor:</b>{" "}
                              {isEditing ? (
                                <input
                                  style={inputInline}
                                  onClick={(e) => e.stopPropagation()}
                                  value={header.auditConductedBy || ""}
                                  onChange={(e) =>
                                    editHeader(
                                      "auditConductedBy",
                                      e.target.value
                                    )
                                  }
                                />
                              ) : (
                                r.auditBy
                              )}
                            </div>
                            <div>
                              <b>Next Audit:</b>{" "}
                              {isEditing ? (
                                <input
                                  style={inputInline}
                                  onClick={(e) => e.stopPropagation()}
                                  value={
                                    safe(p, "footer.nextAudit", "") || ""
                                  }
                                  onChange={(e) => {
                                    const f = (p.footer ||= {});
                                    f.nextAudit = e.target.value;
                                    setDraft({ ...draft });
                                  }}
                                />
                              ) : (
                                r.nextAudit || "-"
                              )}
                            </div>
                            <div>
                              <b>Closed Evidence Uploaded By:</b>{" "}
                              {isEditing ? (
                                <input
                                  style={inputInline}
                                  onClick={(e) => e.stopPropagation()}
                                  value={getBranchEvidenceUploadedBy(p)}
                                  onChange={(e) => {
                                    p.fields = p.fields && typeof p.fields === "object" ? p.fields : {};
                                    p.fields.closedEvidenceUploadedBy = e.target.value;
                                    draft.payload = p;
                                    setDraft({ ...draft });
                                  }}
                                  placeholder="Supervisor name"
                                />
                              ) : (
                                branchEvidenceUploadedBy || "-"
                              )}
                            </div>
                          </div>

                          <div
                            className="pdf-no-print"
                            style={{
                              display: "flex",
                              gap: 8,
                              justifyContent: "flex-end",
                              marginBottom: 8,
                            }}
                          >
                            {!isEditing ? (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportReportXLSX(r);
                                  }}
                                  style={smallBtn}
                                >
                                  Export XLSX
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportReportPDF(r);
                                  }}
                                  style={smallBtn}
                                >
                                  Export PDF
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportReportJSON(r._raw);
                                  }}
                                  style={smallBtn}
                                >
                                  Export JSON
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyEvidenceLink(r);
                                  }}
                                  style={smallBtn}
                                >
                                  Copy Branch Link
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(r);
                                  }}
                                  style={smallBtn}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(r);
                                  }}
                                  style={dangerBtn}
                                 data-delete-action="true">
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSave();
                                  }}
                                  style={saveBtn}
                                >
                                  Save
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancel();
                                  }}
                                  style={smallBtn}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>

                          {open && (
                            <>
                              <div style={tableScroll}>
                                <div style={tableWrap}>
                                  <div
                                    style={{
                                      ...tableHeaderRow,
                                      background: C.bandBlue,
                                    }}
                                  >
                                    <div style={th}>
                                      Non-Conformance
                                    </div>
                                    <div style={th}>Root Cause</div>
                                    <div style={th}>
                                      Corrective / Preventive action
                                    </div>
                                    <div style={th}>Evidence</div>
                                    <div style={th}>
                                      Closed Evidence
                                    </div>
                                    <div style={th}>Risk Category / Notes</div>
                                    <div style={th}>Status</div>
                                    {isEditing && <div style={th} />}
                                  </div>

                                  {table.map((row, ridx) => {
                                    const bg =
                                      ridx % 2 === 0 ? C.zebra : "#fff";
                                    return (
                                      <div
                                        key={ridx}
                                        data-pdf-row="true"
                                        style={{ ...tr, background: bg }}
                                      >
                                        <div style={td}>
                                          {isEditing ? (
                                            <textarea
                                              style={cellTextArea}
                                              value={
                                                row.nonConformance || ""
                                              }
                                              onChange={(e) =>
                                                editRow(ridx, {
                                                  nonConformance:
                                                    e.target.value,
                                                })
                                              }
                                            />
                                          ) : (
                                            row.nonConformance || "-"
                                          )}
                                        </div>
                                        <div style={td}>
                                          {isEditing ? (
                                            <textarea
                                              style={cellTextArea}
                                              value={row.rootCause || ""}
                                              onChange={(e) =>
                                                editRow(ridx, {
                                                  rootCause: e.target.value,
                                                })
                                              }
                                            />
                                          ) : (
                                            row.rootCause || "-"
                                          )}
                                        </div>
                                        <div style={td}>
                                          {isEditing ? (
                                            <textarea
                                              style={cellTextArea}
                                              value={row.corrective || ""}
                                              onChange={(e) =>
                                                editRow(ridx, {
                                                  corrective: e.target.value,
                                                })
                                              }
                                            />
                                          ) : (
                                            row.corrective || "-"
                                          )}
                                        </div>

                                        <div style={td}>
                                          {isEditing ? (
                                            <ImageField
                                              list={row.evidenceImgs}
                                              onAdd={(files) =>
                                                addImages(
                                                  ridx,
                                                  "evidenceImgs",
                                                  files
                                                )
                                              }
                                              onRemove={(i) =>
                                                removeImage(
                                                  ridx,
                                                  "evidenceImgs",
                                                  i
                                                )
                                              }
                                              onView={setViewerSrc}
                                            />
                                          ) : (
                                            <Thumbs
                                              list={row.evidenceImgs}
                                              onView={setViewerSrc}
                                            />
                                          )}
                                        </div>

                                        <div style={td}>
                                          {isEditing ? (
                                            <>
                                              <ImageField
                                                list={row.closedEvidenceImgs}
                                                onAdd={(files) =>
                                                  addImages(
                                                    ridx,
                                                    "closedEvidenceImgs",
                                                    files
                                                  )
                                                }
                                                onRemove={(i) =>
                                                  removeImage(
                                                    ridx,
                                                    "closedEvidenceImgs",
                                                    i
                                                  )
                                                }
                                                onView={setViewerSrc}
                                              />
                                              <textarea
                                                style={{ ...riskNotesArea, marginTop: 8, minHeight: 56 }}
                                                value={row.closedEvidenceNote || ""}
                                                onChange={(e) =>
                                                  editRow(ridx, {
                                                    closedEvidenceNote: e.target.value,
                                                  })
                                                }
                                                placeholder="Branch notes..."
                                              />
                                            </>
                                          ) : (
                                            <>
                                              <Thumbs
                                                list={Array.from(new Set([
                                                  ...getRowClosedEvidenceImages(row),
                                                  ...getBranchEvidenceForRow(p, ridx),
                                                ]))}
                                                onView={setViewerSrc}
                                              />
                                              {(row.closedEvidenceNote || getBranchEvidenceNoteForRow(p, ridx)) && (
                                                <div style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#fffbeb", border: "1px solid #fde68a", fontSize: 12, fontWeight: 700, color: "#854d0e", whiteSpace: "pre-wrap" }}>
                                                  <b>Branch Notes:</b> {row.closedEvidenceNote || getBranchEvidenceNoteForRow(p, ridx)}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        <div style={tdFixed(180)}>
                                          {isEditing ? (
                                            <>
                                              <select
                                                style={selectCell}
                                                value={row.risk || ""}
                                                onChange={(e) =>
                                                  editRow(ridx, {
                                                    risk: e.target.value,
                                                  })
                                                }
                                              >
                                                <option value="">--</option>
                                                <option>Low</option>
                                                <option>Medium</option>
                                                <option>High</option>
                                              </select>
                                              <textarea
                                                style={riskNotesArea}
                                                value={row.riskNotes || ""}
                                                onChange={(e) =>
                                                  editRow(ridx, {
                                                    riskNotes: e.target.value,
                                                  })
                                                }
                                                placeholder="Risk notes..."
                                              />
                                            </>
                                          ) : (
                                            <>
                                              <div style={{ fontWeight: 700 }}>
                                                {row.risk || "-"}
                                              </div>
                                              {row.riskNotes && (
                                                <div style={riskNotesText}>
                                                  {row.riskNotes}
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        <div style={tdFixed(120)}>
                                          {isEditing ? (
                                            <select
                                              style={selectCell}
                                              value={row.status || ""}
                                              onChange={(e) =>
                                                editRow(ridx, {
                                                  status: e.target.value,
                                                })
                                              }
                                            >
                                              <option value="">--</option>
                                              <option>Open</option>
                                              <option>In Progress</option>
                                              <option>Closed</option>
                                            </select>
                                          ) : (
                                            row.status || "-"
                                          )}
                                        </div>

                                        {isEditing && (
                                          <div
                                            style={tdFixed(60, {
                                              display: "flex",
                                              justifyContent: "center",
                                              alignItems: "center",
                                            })}
                                          >
                                            <button
                                              onClick={() => removeRow(ridx)}
                                              style={iconBtn}
                                             data-delete-action="true">
                                              ✕
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {isEditing && (
                                <div style={{ padding: 10 }}>
                                  <button
                                    onClick={addRow}
                                    style={addRowBtn}
                                  >
                                    + Add Row
                                  </button>
                                </div>
                              )}

                              {((!isEditing &&
                                (r.commentNextAudit ||
                                  r.nextAudit ||
                                  r.reviewedBy)) ||
                                isEditing) && (
                                <div style={{ marginTop: 10, fontSize: 13 }}>
                                  <div
                                    style={{
                                      fontWeight: 600,
                                      marginBottom: 4,
                                      background: C.bandGreen,
                                      border: `1px solid ${C.border}`,
                                      borderRadius: 8,
                                      padding: 6,
                                    }}
                                  >
                                    Comment for next Audit
                                  </div>
                                  {isEditing ? (
                                    <textarea
                                      style={{
                                        ...cellTextArea,
                                        minHeight: 80,
                                      }}
                                      value={
                                        footer.commentForNextAudit || ""
                                      }
                                      onChange={(e) => {
                                        const f = getFooter();
                                        f.commentForNextAudit =
                                          e.target.value;
                                        setDraft({ ...draft });
                                      }}
                                    />
                                  ) : (
                                    <div style={noteBox}>
                                      {r.commentNextAudit}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: 10,
                                      marginTop: 8,
                                    }}
                                  >
                                    <div>
                                      <b>Next Audit:</b>{" "}
                                      {isEditing ? (
                                        <input
                                          style={inputInline}
                                          value={footer.nextAudit || ""}
                                          onChange={(e) => {
                                            const f = getFooter();
                                            f.nextAudit = e.target.value;
                                            setDraft({ ...draft });
                                          }}
                                        />
                                      ) : (
                                        r.nextAudit || "-"
                                      )}
                                    </div>
                                    <div>
                                      <b>Reviewed &amp; Verified By:</b>{" "}
                                      {isEditing ? (
                                        <input
                                          style={inputInline}
                                          value={
                                            footer.reviewedAndVerifiedBy ||
                                            ""
                                          }
                                          onChange={(e) => {
                                            const f = getFooter();
                                            f.reviewedAndVerifiedBy =
                                              e.target.value;
                                            setDraft({ ...draft });
                                          }}
                                        />
                                      ) : (
                                        <SignatureName name={r.reviewedBy} underline={false} inline />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {SHOW_DEBUG && (
                            <details style={{ marginTop: 10 }}>
                              <summary style={{ cursor: "pointer" }}>
                                Show raw JSON
                              </summary>
                              <pre style={preStyle}>
                                {JSON.stringify(r._raw, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          </section>
        </div>

        {viewerSrc && (
          <Lightbox src={viewerSrc} onClose={() => setViewerSrc(null)} />
        )}
      </main>
    </div>
  );
}

/* ===== Small components ===== */
function Thumbs({ list, onView }) {
  const arr = (Array.isArray(list) ? list : []).map(getImageUrl).filter(Boolean);
  if (!arr.length) return <span style={{ opacity: 0.6 }}>-</span>;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {arr.slice(0, 6).map((src, i) => (
        <img
          key={i}
          src={src}
          alt="evidence"
          onClick={() => onView && onView(src)}
          title="Click to preview"
          style={{
            width: 56,
            height: 56,
            objectFit: "cover",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            cursor: "zoom-in",
          }}
        />
      ))}
      {arr.length > 6 && (
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          +{arr.length - 6}
        </span>
      )}
    </div>
  );
}

function ImageField({ list, onAdd, onRemove, onView }) {
  const normalizedList = (Array.isArray(list) ? list : []).map(getImageUrl).filter(Boolean);
  const count = normalizedList.length;
  const canAdd = count < 5;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {normalizedList.map((src, i) => (
          <div
            key={i}
            style={{
              position: "relative",
              width: 56,
              height: 56,
              border: "1px solid #d1d5db",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <img
              src={src}
              alt=""
              onClick={() => onView && onView(src)}
              title="Click to preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                cursor: "zoom-in",
              }}
            />
            <button
              onClick={() => onRemove(i)}
              title="Remove"
              style={thumbX}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <label
        style={{
          ...uploadBtn,
          opacity: canAdd ? 1 : 0.6,
          pointerEvents: canAdd ? "auto" : "none",
        }}
      >
        Upload ({count}/5)
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
function Lightbox({ src, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        cursor: "zoom-out",
      }}
      title="Click to close"
    >
      <img
        src={src}
        alt="preview"
        style={{
          maxWidth: "90vw",
          maxHeight: "90vh",
          borderRadius: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,.4)",
          background: "#fff",
        }}
      />
    </div>
  );
}

/* ===== Styles ===== */
const BORDER = C.border;
const BORDER_STRONG = C.borderStrong;
const COLS = "1.2fr 1fr 1.2fr 1.1fr 1.1fr 180px 120px";

const asideStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  height: "fit-content",
};
const chip = (active) => ({
  border: `1px solid ${active ? BORDER_STRONG : BORDER}`,
  background: active ? "#eef2ff" : "#fff",
  color: active ? "#1e40af" : "#111827",
  borderRadius: 999,
  padding: "4px 10px",
  cursor: "pointer",
  fontSize: 12,
});

const inputStyle = {
  padding: "10px",
  borderRadius: 8,
  border: "1px solid #ccc",
  background: "#fff",
  minWidth: 220,
};
const inputInline = {
  padding: "6px 8px",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  background: "#fff",
  minWidth: 140,
};

const smallBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: `1px solid ${BORDER}`,
  background: "#fff",
  cursor: "pointer",
  fontSize: 13,
};
const saveBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #16a34a",
  background: "#dcfce7",
  color: "#166534",
  cursor: "pointer",
  fontSize: 13,
};
const dangerBtn = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #ef4444",
  background: "#fee2e2",
  color: "#b91c1c",
  cursor: "pointer",
  fontSize: 13,
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 14,
  boxShadow: "0 14px 34px rgba(15,23,42,0.08)",
};

const auditWorkspace = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: 14,
  alignItems: "start",
};

const reportRail = {
  position: "sticky",
  top: 12,
  maxHeight: "calc(100vh - 24px)",
  overflow: "hidden",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 10px 26px rgba(2,6,23,.07)",
};

const railHeader = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "14px 14px 12px",
  background: `linear-gradient(90deg, ${C.headerGradFrom}, ${C.headerGradTo})`,
  borderBottom: "1px solid #dbe4f0",
};

const railTitle = {
  fontSize: 14,
  fontWeight: 1000,
  color: "#0f172a",
};

const railSub = {
  marginTop: 3,
  fontSize: 11,
  fontWeight: 800,
  color: "#64748b",
  lineHeight: 1.35,
};

const railCount = {
  minWidth: 34,
  height: 28,
  borderRadius: 6,
  display: "grid",
  placeItems: "center",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 1000,
  fontSize: 12,
};

const railList = {
  display: "grid",
  gap: 8,
  padding: 10,
  overflow: "auto",
  maxHeight: "calc(100vh - 110px)",
};

const reportListItem = (active) => ({
  width: "100%",
  textAlign: "start",
  border: `1px solid ${active ? C.borderStrong : "#e2e8f0"}`,
  borderLeft: `4px solid ${active ? C.badgeTo : "transparent"}`,
  background: active ? "#f8fafc" : "#fff",
  borderRadius: 8,
  padding: "10px 11px",
  cursor: "pointer",
  color: "#0f172a",
  fontFamily: "inherit",
  boxShadow: active ? "0 10px 22px rgba(96,165,250,.16)" : "0 1px 2px rgba(15,23,42,.03)",
});

const reportListTop = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
};

const reportBranch = {
  fontSize: 13,
  fontWeight: 1000,
  lineHeight: 1.25,
};

const reportDate = {
  flexShrink: 0,
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  background: C.bandSilver,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  padding: "2px 6px",
};

const reportMetaLine = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 7,
  color: "#475569",
  fontSize: 11,
  fontWeight: 800,
};

const reportProgressTrack = {
  display: "block",
  height: 6,
  marginTop: 9,
  borderRadius: 99,
  overflow: "hidden",
  background: "#e2e8f0",
};

const reportProgressFill = (pct) => ({
  display: "block",
  width: `${Math.max(0, Math.min(100, Number(pct) || 0))}%`,
  height: "100%",
  background: `linear-gradient(90deg, ${C.badgeFrom}, ${C.badgeTo})`,
});

const reportFooterLine = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  marginTop: 8,
  fontSize: 11,
  fontWeight: 900,
  color: "#334155",
};

const miniStatus = {
  maxWidth: 150,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  borderRadius: 999,
  padding: "2px 7px",
  fontSize: 10,
  fontWeight: 1000,
};

const detailStage = {
  minWidth: 0,
};

const monthDetailShell = {
  border: "1px solid #dbe4f0",
  borderRadius: 8,
  background: "#fff",
  overflow: "hidden",
  boxShadow: "0 10px 26px rgba(2,6,23,.06)",
};

const tableScroll = { overflowX: "auto", marginTop: 8 };
const tableWrap = {
  minWidth: 1100,
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  overflow: "hidden",
};
const tableGrid = {
  display: "grid",
  gridTemplateColumns: COLS,
  alignItems: "stretch",
};
const tableHeaderRow = {
  ...tableGrid,
  borderBottom: `1px solid ${BORDER_STRONG}`,
  fontWeight: 700,
  fontSize: 13,
};
const tr = { ...tableGrid, borderBottom: `1px solid ${BORDER}` };

const th = {
  padding: 10,
  borderRight: `1px solid ${BORDER}`,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
};
const td = {
  padding: 8,
  borderRight: `1px solid ${BORDER}`,
  boxSizing: "border-box",
  whiteSpace: "pre-wrap",
};
const tdFixed = (w, extra = {}) => ({
  padding: 8,
  borderRight: `1px solid ${BORDER}`,
  width: w,
  boxSizing: "border-box",
  ...extra,
});

const cellTextArea = {
  width: "100%",
  minHeight: 80,
  resize: "vertical",
  padding: 8,
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  background: "#fff",
  boxSizing: "border-box",
};
const riskNotesArea = { ...cellTextArea, minHeight: 64, marginTop: 8 };
const riskNotesText = {
  marginTop: 6,
  paddingTop: 6,
  borderTop: `1px dashed ${BORDER}`,
  fontSize: 12,
  color: "#475569",
  whiteSpace: "pre-wrap",
};
const selectCell = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  background: "#fff",
  boxSizing: "border-box",
};

const iconBtn = {
  width: 28,
  height: 28,
  border: `1px solid ${BORDER}`,
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
};
const addRowBtn = {
  border: `1px dashed ${BORDER}`,
  background: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

const noteBox = {
  background: C.bandSilver,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: 8,
};

const uploadBtn = {
  display: "inline-block",
  marginTop: 6,
  fontSize: 12,
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  background: "#fff",
};
const thumbX = {
  position: "absolute",
  top: 2,
  right: 2,
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "none",
  background: "rgba(239,68,68,.9)",
  color: "#fff",
  cursor: "pointer",
  lineHeight: "18px",
  fontSize: 12,
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

/* ===== KPI Tile + modern header / tools styles ===== */
function KpiTile({ icon, label, value, color, bg, smaller }) {
  return (
    <div style={{
      background: bg,
      color,
      borderRadius: 14,
      padding: "10px 12px",
      border: "1px solid rgba(226,232,240,.95)",
      boxShadow: "0 6px 14px rgba(2,6,23,.06)",
      minWidth: 130,
      display: "flex",
      flexDirection: "column",
      gap: 2,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 1000, letterSpacing: ".05em", textTransform: "uppercase", opacity: 0.75 }}>{label}</span>
      </div>
      <div style={{ fontSize: smaller ? 14 : 22, fontWeight: 1000, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

const modernHeader = {
  card: {
    background: "linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 6,
    padding: "22px 28px",
    marginBottom: 14,
    boxShadow: "0 22px 50px rgba(15,23,42,.18)",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  brandWrap: { display: "flex", alignItems: "center", gap: 12 },
  brandIco: {
    width: 44, height: 44, borderRadius: 6,
    background: "rgba(255,255,255,.16)", color: "#fff",
    display: "grid", placeItems: "center", fontSize: 22,
    border: "1px solid rgba(255,255,255,.24)",
    boxShadow: "0 10px 22px rgba(2,6,23,.18)",
  },
  title: { margin: 0, fontSize: 18, fontWeight: 1000, color: "#fff", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#e0f2fe", fontWeight: 800, marginTop: 4 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap" },
  toolBtn: {
    padding: "8px 14px", borderRadius: 5,
    background: "rgba(255,255,255,.14)",
    color: "#fff", border: "1px solid rgba(255,255,255,.25)",
    fontWeight: 900, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 10px rgba(2,6,23,.08)",
  },
  aiBtn: {
    padding: "8px 14px", borderRadius: 5,
    background: "rgba(15,23,42,.28)", color: "#fff",
    border: "1px solid rgba(255,255,255,.18)", fontWeight: 1000, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 8px 18px rgba(2,6,23,.18)",
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 10,
  },
};

const toolsBar = {
  row: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    padding: "10px 14px", marginBottom: 14,
    background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 14, boxShadow: "0 8px 18px rgba(2,6,23,.06)",
  },
  searchWrap: {
    display: "flex", alignItems: "center", gap: 8,
    background: "#f8fafc", border: "1px solid #cbd5e1",
    borderRadius: 999, padding: "5px 12px",
    minWidth: 320, flex: "1 1 320px",
  },
  searchIcon: { fontSize: 14, opacity: 0.6 },
  searchInput: {
    flex: 1, border: "none", outline: "none",
    background: "transparent", fontSize: 13, fontWeight: 800, color: "#0f172a",
    fontFamily: "inherit",
  },
  clearBtn: {
    background: "transparent", border: "none",
    color: "#64748b", cursor: "pointer", fontSize: 14, fontWeight: 1000,
    padding: 0, lineHeight: 1,
  },
  select: {
    padding: "8px 12px", borderRadius: 999,
    background: "#f8fafc", border: "1px solid #cbd5e1",
    fontWeight: 900, fontSize: 12, color: "#0f172a",
    cursor: "pointer", fontFamily: "inherit",
  },
  clearAll: {
    padding: "7px 14px", borderRadius: 999,
    background: "linear-gradient(135deg, #fee2e2, #fef2f2)",
    color: "#991b1b", border: "1px solid #fecaca",
    fontWeight: 1000, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit",
  },
  resultCount: {
    fontSize: 12, color: "#475569", fontWeight: 800,
  },
};

/* ===== Modern Date-Tree sidebar styles ===== */
const treeAside = {
  position: "sticky",
  top: 12,
  alignSelf: "flex-start",
  maxHeight: "calc(100vh - 24px)",
  overflow: "auto",
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 12,
  boxShadow: "0 8px 20px rgba(2,6,23,.06)",
};
const treeHeader = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 6px 10px",
  borderBottom: "2px dashed #e2e8f0",
  marginBottom: 8,
};
const treeCountBadge = {
  marginInlineStart: "auto",
  background: "#0b1220", color: "#fff",
  padding: "2px 10px", borderRadius: 999,
  fontWeight: 1000, fontSize: 11,
};
const treeCountBadgeSm = {
  marginInlineStart: "auto",
  background: "#94a3b8", color: "#fff",
  padding: "1px 7px", borderRadius: 999,
  fontWeight: 1000, fontSize: 10,
};
const treeAllBtn = (active) => ({
  width: "100%",
  display: "flex", alignItems: "center", gap: 8,
  padding: "10px 12px",
  background: active ? "linear-gradient(135deg, #dbeafe, #eff6ff)" : "#f8fafc",
  border: `1px solid ${active ? "#3b82f6" : "#e2e8f0"}`,
  borderRadius: 12, cursor: "pointer",
  fontWeight: 1000, fontSize: 12, color: "#0f172a",
  fontFamily: "inherit", textAlign: "start",
});
const treeYearBtn = (active) => ({
  width: "100%",
  display: "flex", alignItems: "center", gap: 8,
  padding: "9px 10px",
  background: active ? "linear-gradient(135deg, #fef3c7, #fffbeb)" : "transparent",
  border: `1px solid ${active ? "#fcd34d" : "#e2e8f0"}`,
  borderRadius: 10, cursor: "pointer",
  fontFamily: "inherit", color: "#0f172a", textAlign: "start",
});
const treeMonthBtn = (active) => ({
  width: "100%",
  display: "flex", alignItems: "center", gap: 8,
  padding: "6px 10px",
  background: active ? "#dbeafe" : "transparent",
  border: `1px solid ${active ? "#bfdbfe" : "#f1f5f9"}`,
  borderRadius: 8, cursor: "pointer",
  fontFamily: "inherit", color: "#0f172a", textAlign: "start",
});
const treeDayBtn = (active) => ({
  width: "100%",
  display: "flex", alignItems: "center", gap: 8,
  padding: "5px 10px",
  background: active ? "#fee2e2" : "transparent",
  border: `1px dashed ${active ? "#fca5a5" : "#cbd5e1"}`,
  borderRadius: 6, cursor: "pointer",
  fontFamily: "inherit", color: "#0f172a", textAlign: "start",
});
const treeChev = {
  fontSize: 9, color: "#64748b", width: 10,
};
