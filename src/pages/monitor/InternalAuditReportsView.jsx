// src/pages/monitor/InternalAuditReportsView.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

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
  { code: "POS 14",      labelEn: "POS 14 — Al Ain Butchery",        labelAr: "POS 14 — ملحمة العين",        aliases: ["POS 14","POS14","AL AIN BUTCHERY","ملحمة العين","AL AIN","العين"] },
  { code: "POS 11",      labelEn: "POS 11 — Al Ain Market",          labelAr: "POS 11 — سوق العين",          aliases: ["POS 11","POS11","AL AIN MARKET","سوق العين"] },
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
    setDraft(JSON.parse(JSON.stringify(r._raw)));
  };
  const handleCancel = () => {
    setEditId(null);
    setDraft(null);
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
      if (!el) {
        alert("Open the report card first, then export.");
        return;
      }

      const scale = 2;
      const canvas = await html2canvas(el, {
        scale,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;
      const pageCount = Math.ceil(imgH / pdfH);

      for (let i = 0; i < pageCount; i++) {
        if (i > 0) pdf.addPage();
        const sy = (canvas.height / pageCount) * i;
        const sH = canvas.height / pageCount;
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sH;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          sy,
          canvas.width,
          sH,
          0,
          0,
          canvas.width,
          sH
        );
        const dataUrl = pageCanvas.toDataURL("image/jpeg", 0.95);
        pdf.addImage(
          dataUrl,
          "JPEG",
          0,
          0,
          imgW,
          (sH * pdfW) / canvas.width
        );
      }

      const allImages = [];
      (view.table || []).forEach((row, idx) => {
        const e1 = Array.isArray(row.evidenceImgs)
          ? row.evidenceImgs
          : [];
        const e2 = Array.isArray(row.closedEvidenceImgs)
          ? row.closedEvidenceImgs
          : [];
        e1.forEach((src) =>
          allImages.push({ src, label: `Row ${idx + 1} - Evidence` })
        );
        e2.forEach((src) =>
          allImages.push({
            src,
            label: `Row ${idx + 1} - Closed Evidence`,
          })
        );
      });

      const galleryStartPage = pdf.getNumberOfPages() + 1;
      if (allImages.length) {
        pdf.addPage();
        pdf.setFontSize(18);
        pdf.text("Images Gallery", 40, 50);
        pdf.setFontSize(11);
        pdf.text(`Total images: ${allImages.length}`, 40, 70);

        for (let i = 0; i < allImages.length; i++) {
          if (i > 0) pdf.addPage();
          const { src, label } = allImages[i];
          pdf.setFontSize(12);
          pdf.text(label, 40, 40);

          const margin = 40;
          const boxW = pdfW - margin * 2;
          const boxH = pdfH - margin * 2 - 20;
          let base64 = src;
          if (!String(src).startsWith("data:image")) {
            const resp = await fetch(src);
            const blob = await resp.blob();
            base64 = await new Promise((ok) => {
              const fr = new FileReader();
              fr.onload = () => ok(fr.result);
              fr.readAsDataURL(blob);
            });
          }
          const tmp = new Image();
          await new Promise((res, rej) => {
            tmp.onload = res;
            tmp.onerror = rej;
            tmp.src = base64;
          });
          const ratio = Math.min(
            boxW / tmp.width,
            boxH / tmp.height
          );
          const w = tmp.width * ratio;
          const h = tmp.height * ratio;
          const x = margin + (boxW - w) / 2;
          const y = margin + 20 + (boxH - h) / 2;
          pdf.addImage(base64, "JPEG", x, y, w, h);
        }
      }

      if (allImages.length) {
        const elRect = el.getBoundingClientRect();
        const imgs = Array.from(el.querySelectorAll("img[alt='evidence']"));
        const totalPdfH = (canvas.height * pdfW) / canvas.width;

        let targetPage = galleryStartPage;
        imgs.forEach((imgEl) => {
          const r = imgEl.getBoundingClientRect();
          const relX = (r.left - elRect.left) / elRect.width;
          const relY = (r.top - elRect.top) / elRect.height;
          const relW = r.width / elRect.width;
          const relH = r.height / elRect.height;

          const pdfX = relX * pdfW;
          const pdfY = relY * totalPdfH;
          const pdfWrect = relW * pdfW;
          const pdfHrect = relH * totalPdfH;

          const pageIndex = Math.floor(pdfY / pdfH);
          const yOnPage = pdfY - pageIndex * pdfH;

          const pageNo = 1 + pageIndex;
          pdf.setPage(pageNo);
          pdf.link(pdfX, yOnPage, pdfWrect, pdfHrect, {
            pageNumber: Math.min(
              targetPage,
              pdf.getNumberOfPages()
            ),
          });

          targetPage = Math.min(
            targetPage + 1,
            pdf.getNumberOfPages()
          );
        });
      }

      pdf.save(`internal-audit-${view.reportNo || "report"}.pdf`);
    } catch (e) {
      console.error(e);
      alert("PDF export failed.");
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
    if (!collapsedInit && groups.length) {
      setCollapsed(new Set(groups.map(([k]) => k)));
      setCollapsedInit(true);
      setOpenCards(new Set());
    }
  }, [groups, collapsedInit]);

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

  const monthName = (m) =>
    new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en", {
      month: "long",
    });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "260px 1fr",
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
      `}</style>
      {/* ====== Modern Date Tree Sidebar ====== */}
      <aside style={treeAside} className="ia-no-print">
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
          <div style={modernHeader.row}>
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
        <div style={toolsBar.row} className="ia-no-print" dir={isAr ? "rtl" : "ltr"}>
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
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 14,
          }}
        >
          {groups.map(([key, list]) => {
            const [yy, mm] = key.split("-");
            const isClosed = collapsed.has(key);
            return (
              <div
                key={key}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#fff",
                }}
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
                    {list.map((r, idx) => {
                      const isEditing = editId === r.id;
                      const open = openCards.has(r.id);
                      const p = isEditing
                        ? draft.payload || {}
                        : r._raw.payload || {};
                      const header = p.header || {};
                      const footer = p.footer || {};
                      const table = Array.isArray(p.table) ? p.table : [];

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
                            <b>Approved By:</b>&nbsp;{r.approvedBy}
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
                          </div>

                          <div
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
                                >
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
                                    <div style={th}>Risk Category</div>
                                    <div style={th}>Status</div>
                                    {isEditing && <div style={th} />}
                                  </div>

                                  {table.map((row, ridx) => {
                                    const bg =
                                      ridx % 2 === 0 ? C.zebra : "#fff";
                                    return (
                                      <div
                                        key={ridx}
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
                                          ) : (
                                            <Thumbs
                                              list={row.closedEvidenceImgs}
                                              onView={setViewerSrc}
                                            />
                                          )}
                                        </div>

                                        <div style={tdFixed(140)}>
                                          {isEditing ? (
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
                                          ) : (
                                            row.risk || "-"
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
                                            >
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
                                        r.reviewedBy || "-"
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
  const arr = Array.isArray(list) ? list : [];
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
  const count = (list || []).length;
  const canAdd = count < 5;
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {(list || []).map((src, i) => (
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
const COLS = "1.2fr 1fr 1.2fr 1.1fr 1.1fr 140px 120px";

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
  borderRadius: 12,
  padding: 14,
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
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
    background: "linear-gradient(180deg, #ffffff, #fafbff)",
    border: "1px solid #e2e8f0",
    borderRadius: 18,
    padding: "16px 18px",
    marginBottom: 14,
    boxShadow: "0 12px 32px rgba(2,6,23,.08)",
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
    width: 44, height: 44, borderRadius: 12,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff",
    display: "grid", placeItems: "center", fontSize: 22,
    boxShadow: "0 10px 22px rgba(37,99,235,.30)",
  },
  title: { margin: 0, fontSize: 20, fontWeight: 1000, color: "#0f172a", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#64748b", fontWeight: 800, marginTop: 4 },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap" },
  toolBtn: {
    padding: "8px 14px", borderRadius: 12,
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    color: "#0f172a", border: "1px solid #cbd5e1",
    fontWeight: 900, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 10px rgba(2,6,23,.04)",
  },
  aiBtn: {
    padding: "8px 14px", borderRadius: 12,
    background: "linear-gradient(135deg,#7c3aed,#2563eb)", color: "#fff",
    border: "none", fontWeight: 1000, fontSize: 12, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 8px 18px rgba(124,58,237,.30)",
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
