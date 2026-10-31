// src/pages/settings/ExcelBackupTab.jsx
// 📊 Excel Backup — each report becomes one Excel sheet matching its view design.
//    Branches and individual report types are independently selectable.

import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../config/api";
import { getExporter, exporterKindFor } from "./excel-exporters";
import {
  sheetNameFor, sanitizeSheetName, extractDate, formatDMY, linkifySheet, setDocBrand,
} from "./excel-exporters/_lib";
import { pickTemplateRecord, makeBlankRecord, makeBlankRecordList } from "./excel-exporters/_blank_form";
import {
  ALL_BRANCHES, BRANCHES, activeCards, branchesOfCard, groupsOfBranch, cardById, UNLISTED_CARD_ID,
} from "./reportTypeCatalog";
import { fetchAllOfType, visibilityWarningText } from "./_shared/reportBackupFetch";
import {
  buildWorkList, folderFor, manifestCsv, readmeText, blankReadmeText, safeSegment,
} from "./_shared/backupTree";
import { fetchUnlistedTypes, unlistedBranch } from "./_shared/unlistedTypes";
import { enhanceSheet } from "./excel-exporters/_postpass";
import { addReturnsMonthSheets, buildReturnsYearSummary, returnsKindOf } from "./excel-exporters/returns_extras";
import {
  collectPhotoUrls, downloadRecordPhotos, addPhotosSheet, relinkToLocal, fetchEmbeddableImages,
  stripEvidenceLinks, estimatePhotoMB, PHOTO_MODES, PHOTO_QUALITY, photoModeById, photoQualityById,
} from "./_shared/backupPhotos";
import { auditBranchOf } from "./excel-exporters/internal_multi_audit";
import {
  fetchProductCatalog, fetchAccounts, fetchAuditTrail,
  addProductsSheet, addAccountsSheet, addAuditSheet, SESSION_EXPIRED,
} from "./_shared/backupExtraTables";
import { getRefNo } from "../../utils/reportRef";
import { getCurrentUser } from "../../utils/perms";

/* ═══════════════════════════════════════════════════════════════
   DATE FILTER
   ═══════════════════════════════════════════════════════════════ */
/** Normalize any stored date shape to YYYY-MM-DD ("" when unparseable). */
function toISO(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  // بعض التقارير القديمة تخزّن التاريخ بصيغة DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  return "";
}

/** YYYY-MM-DD for a record, whatever shape its payload uses. "" when undated. */
function recordDate(rec) {
  return toISO(extractDate(rec)) || toISO(rec?.createdAt) || toISO(rec?.created_at) || "";
}

const todayISO = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
};

/** أول يوم في الشهر بعد الرجوع (n − 1) شهراً — أي "آخر n أشهر" شاملة الشهر الحالي */
function monthsBackStart(n) {
  const now = new Date();
  const back = Math.max(1, Math.min(60, Number(n) || 1)) - 1;
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Resolve the UI filter into a plain { from, to } window ("" = open end). */
function filterWindow(f) {
  if (f.mode === "day")    return { from: f.day, to: f.day };
  if (f.mode === "range")  return { from: f.from, to: f.to };
  if (f.mode === "months") return { from: monthsBackStart(f.months), to: "" };
  return { from: "", to: "" };
}

function matchesFilter(rec, f) {
  if (f.mode === "all") return true;
  const d = recordDate(rec);
  if (!d) return !!f.includeUndated;
  const { from, to } = filterWindow(f);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

/** Human-readable filter description (Arabic) + a filename-safe suffix. */
function filterLabel(f) {
  if (f.mode === "day")    return f.day ? `يوم ${formatDMY(f.day)}` : "يوم محدد (اختر التاريخ)";
  if (f.mode === "range")  return `من ${f.from ? formatDMY(f.from) : "البداية"} إلى ${f.to ? formatDMY(f.to) : "اليوم"}`;
  if (f.mode === "months") return `آخر ${f.months} شهر — من ${formatDMY(monthsBackStart(f.months))}`;
  return "كل التواريخ";
}
function filterSuffix(f) {
  if (f.mode === "day")    return f.day ? `_${f.day}` : "";
  if (f.mode === "range")  return `_${f.from || "start"}_to_${f.to || todayISO()}`;
  if (f.mode === "months") return `_last${f.months}m`;
  return "";
}

/* Path and file-name safety live in _shared/backupTree.js (`safeSegment`), so
   the Excel backup and the blank-forms export can never disagree about where a
   file lands. */

/* ═══════════════════════════════════════════════════════════════
   BRANCH / TYPE DEFINITIONS
   ═══════════════════════════════════════════════════════════════ */
/* Branch/type catalog lives in reportTypeCatalog.js so other screens can reuse
   it. It also owns the card → branch → group tree this ZIP mirrors. */

/** Oldest and newest business date across a set of records. */
function dateSpan(records) {
  const days = records.map(recordDate).filter(Boolean).sort();
  return { firstDate: days[0] || "", lastDate: days[days.length - 1] || "" };
}

/** Oldest first — a month file reads like the month did. Undated last. */
function sortByDate(records) {
  return records
    .map((r, i) => ({ r, i, d: recordDate(r) }))
    .sort((a, b) => (a.d && b.d ? a.d.localeCompare(b.d) : a.d ? -1 : b.d ? 1 : 0) || a.i - b.i)
    .map((x) => x.r);
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

/**
 * One file per month (Al Mawashi backup). Returns null when the type stays a
 * single file: fewer than two dated months, unless `force` (the Returns card
 * always gets its year / month folders, even for a one-month backup).
 * @returns {null | {key:string, year:string, label:string, records:object[]}[]}
 */
function monthParts(records, { force = false } = {}) {
  const byMonth = new Map();
  const undated = [];
  for (const r of records) {
    const d = recordDate(r);
    if (!d) { undated.push(r); continue; }
    const k = d.slice(0, 7);
    if (!byMonth.has(k)) byMonth.set(k, []);
    byMonth.get(k).push(r);
  }
  if (byMonth.size === 0 || (byMonth.size < 2 && !force)) return null;
  const parts = [...byMonth.keys()].sort().map((k) => ({
    key: k,
    year: k.slice(0, 4),
    label: `${k} ${MONTH_NAMES[Number(k.slice(5, 7)) - 1] || ""}`.trim(),
    records: byMonth.get(k),
  }));
  if (undated.length) parts.push({ key: "", year: "", label: "No date", records: undated });
  return parts;
}

/* Inspection visits (Al Mawashi): one FILE per report, in a folder per branch,
   the date leading the name, photos embedded in their column. Each entry
   returns the record's branch. */
const PER_REPORT_FILES = {
  internal_multi_audit: auditBranchOf,
  municipality_inspection: (r) => String(r?.payload?.branchName || r?.payload?.branch || "").trim(),
};

/* Photo scope "inspection" + the default custom selection. */
const INSPECTION_PHOTO_TYPES = ["municipality_inspection", "internal_multi_audit", "supervisor_corrective_action", "inspection_annual_plan"];
const PHOTO_PREFS_KEY = "xb_photo_prefs";
function loadPhotoPrefs() {
  try { return JSON.parse(localStorage.getItem(PHOTO_PREFS_KEY) || "{}") || {}; } catch { return {}; }
}
function savePhotoPrefs(prefs) {
  try { localStorage.setItem(PHOTO_PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
}

const abortError = () => {
  const e = new Error("Aborted");
  e.name = "AbortError";
  return e;
};

/** سجل النسخ الاحتياطية (Al Mawashi): سجل لكل نسخة على السيرفر. */
const BACKUP_LOG_TYPE = "excel_backup_log";
const BACKUP_STALE_DAYS = 30;

async function fetchBackupLog() {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${BACKUP_LOG_TYPE}&limit=15`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || [];
    return rows
      .map((r) => ({ id: r.id, ...(r.payload || {}), at: r.payload?.at || r.created_at }))
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));
  } catch {
    return null;
  }
}

async function saveBackupLog(entry) {
  try {
    const u = getCurrentUser();
    await fetch(`${API_BASE}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reporter: u.username || "backup",
        type: BACKUP_LOG_TYPE,
        // بلا date/reportDate عمداً: الفهرس الفريد (type, التاريخ) كان رح يرفض نسختين بنفس اليوم.
        payload: { ...entry, by: u.username || "", byName: u.displayName || u.display_name || u.name || "" },
      }),
    });
  } catch {
    /* A log line must never fail the backup the user already downloaded. */
  }
}

const daysSince = (iso) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86400000) : Infinity;
};

/** Hand a finished ZIP to the browser. */
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 60_000); // 60s — enough for large ZIPs on slow connections
}

/**
 * The newest single record of a type — the shape a blank form is modelled on.
 *
 * `limit=1` is set explicitly because utils/authFetch.js injects `limit=5000`
 * into any report read that names a type but no limit. Pulling 5000 payloads
 * to learn a column layout would make this export heavier than the backup it
 * sits next to; the server orders by created_at DESC, so one row is the latest.
 */
async function fetchNewestRecord(type) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=1`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || [];
    return pickTemplateRecord(rows);
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════════════════════════
   API FETCH
   ═══════════════════════════════════════════════════════════════
   القراءة صارت عبر fetchAllOfType في _shared/reportBackupFetch.js: السيرفر
   بيسقّف كل طلب بـ 5000 صف وما بيدعم offset، فالنوع اللي تعدّى السقف كان
   بينقصّ بصمت. الهيلبر بيقسّم المدة (سنة ← شهر ← يوم) لما يضرب بالسقف. */

/* ═══════════════════════════════════════════════════════════════
   WORKBOOK BUILDER
   ═══════════════════════════════════════════════════════════════ */
function addEmptySheet(wb, typeLabel) {
  const ws = wb.addWorksheet("لا بيانات", { views: [{ showGridLines: false }] });
  ws.columns = [{ width: 60 }];
  ws.getCell("A1").value = `لا توجد بيانات لـ ${typeLabel}`;
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
  ws.getCell("A1").font = { size: 13, color: { argb: "9CA3AF" } };
  ws.getRow(1).height = 36;
}

/* A customer company's backup (opts.tenantBrand) must not carry Al Mawashi's
   name, logo band or signatories: every exporter's document header reads the
   brand set here for the length of one workbook (exporters run one at a time). */
async function buildWorkbook(ExcelJS, branchLabel, typeKey, typeLabel, records, opts = {}) {
  setDocBrand(opts.tenantBrand || null);
  try {
    return await buildWorkbookInner(ExcelJS, branchLabel, typeKey, typeLabel, records, opts);
  } finally {
    setDocBrand(null);
  }
}

async function buildWorkbookInner(ExcelJS, branchLabel, typeKey, typeLabel, records, opts = {}) {
  const wb = new ExcelJS.Workbook();
  const brand = opts.brand || "Al Mawashi";
  wb.creator = opts.blankForm ? `${brand} — Blank Forms` : `${brand} — Excel Backup`;
  wb.created = new Date();

  const exporter = getExporter(typeKey);
  const blankForm = !!opts.blankForm;
  /* Al Mawashi only: real date/number cells + a filter row on every table. */
  const finish = () => {
    wb.worksheets.forEach((ws) => {
      linkifySheet(ws); // not point-free: forEach passes the index, which would land in maxRows
      if (opts.enhance) enhanceSheet(ws);
    });
  };
  // Extra sheets that must open first (the returns month summary).
  if (opts.before && records.length) opts.before(wb);

  // Collection exporters (registers/logs) render ALL records into ONE sheet
  // that mirrors the on-screen table — call once with the full array.
  if (exporter.collection) {
    if (!records.length) { addEmptySheet(wb, typeLabel); return wb; }
    try {
      await exporter(wb, records, { branchLabel, typeKey, typeLabel, blankForm, photoIndex: opts.photoIndex || null });
    } catch (e) {
      console.error(`Collection exporter failed for ${typeKey}:`, e);
      const ws = wb.addWorksheet(sanitizeSheetName(typeLabel), { views: [{ showGridLines: false }] });
      ws.getCell("A1").value = `⚠️ Failed to render this register: ${e?.message || e}`;
      ws.getCell("A1").font = { color: { argb: "B91C1C" } };
    }
    finish();
    return wb;
  }

  if (!records.length) {
    addEmptySheet(wb, typeLabel);
    return wb;
  }

  const usedNames = new Map();
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    let name = blankForm ? sanitizeSheetName(typeLabel) : sheetNameFor(i, rec);
    const count = usedNames.get(name) || 0;
    usedNames.set(name, count + 1);
    if (count > 0) name = `${name.slice(0, 28)}(${count})`;
    name = sanitizeSheetName(name);
    try {
      await exporter(wb, rec, { branchLabel, typeKey, typeLabel, sheetName: name, blankForm,
        images: opts.images || null, photoLink: opts.photoLink, imageLinks: opts.imageLinks,
      });
    } catch (e) {
      console.error(`Exporter failed for ${typeKey} record ${i}:`, e);
      const ws = wb.addWorksheet(name, { views: [{ showGridLines: false }] });
      ws.getCell("A1").value = `⚠️ Failed to render this report: ${e?.message || e}`;
      ws.getCell("A1").font = { color: { argb: "B91C1C" } };
    }
  }
  finish();
  return wb;
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════ */
/* Props (both optional — Settings uses neither and gets the whole catalog):
 *   cardIds — only these catalog cards (e.g. ["sweets"] inside the
 *             Confectionery company-app), so a tenant sees its own reports only.
 *   brand   — company name on the ZIP file name, README and workbook creator. */
export default function ExcelBackupTab({ cardIds = null, brand = "Al Mawashi" } = {}) {
  const cardKey = cardIds ? cardIds.join("|") : "";
  // A scoped (company-app) backup may name kit cards, whose branches live in
  // ALL_BRANCHES; the full Al Mawashi backup keeps walking BRANCHES only.
  const scopeBranches = useMemo(
    () => (cardIds ? ALL_BRANCHES.filter((b) => cardIds.includes(b.card)) : BRANCHES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardKey]
  );
  const scopeCards = useMemo(
    () => (cardIds ? activeCards({ withKit: true }).filter((c) => cardIds.includes(c.id)) : activeCards()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardKey]
  );
  // Another company's backup carries its own name in every sheet header.
  const tenantBrand = cardIds ? brand : null;
  const fileBrand = brand.replace(/[^A-Za-z0-9]+/g, "") || "Backup";

  // Selection state: Set of "branchId::typeKey" strings (type-level granularity)
  const [picked, setPicked] = useState(() => {
    const all = new Set();
    scopeBranches.forEach((b) => b.types.forEach(([k]) => all.add(`${b.id}::${k}`)));
    return all;
  });
  const [expandedBranches, setExpandedBranches] = useState(() => new Set(scopeBranches.map((b) => b.id)));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [stats, setStats] = useState(null);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [query, setQuery] = useState("");

  /* Safety net: types with data on the server that the catalog does not list
     get their own "Other (unlisted types)" folder, ticked by default, so the
     backup still covers them when someone forgets to add a slug to the catalog. */
  const [extraBranch, setExtraBranch] = useState(null);
  useEffect(() => {
    let alive = true;
    fetchUnlistedTypes().then((list) => {
      const branch = unlistedBranch(list);
      if (!alive || !branch) return;
      setExtraBranch(branch);
      setPicked((prev) => {
        const next = new Set(prev);
        branch.types.forEach(([k]) => next.add(`${branch.id}::${k}`));
        return next;
      });
      setExpandedBranches((prev) => new Set([...prev, branch.id]));
    });
    return () => { alive = false; };
  }, []);
  const treeBranches = useMemo(
    () => (extraBranch ? [...scopeBranches, extraBranch] : scopeBranches),
    [scopeBranches, extraBranch]
  );
  const treeCards = useMemo(
    () => (extraBranch ? [...scopeCards, cardById(UNLISTED_CARD_ID)] : scopeCards),
    [scopeCards, extraBranch]
  );
  const branchesFor = (cardId) =>
    (cardId === UNLISTED_CARD_ID ? (extraBranch ? [extraBranch] : []) : branchesOfCard(cardId));

  /* Date filter: mode all | day | range | months */
  const [filter, setFilter] = useState({
    mode: "all",
    day: todayISO(),
    from: "",
    to: "",
    months: 3,
    includeUndated: false,
  });
  const [skipEmpty, setSkipEmpty] = useState(false);
  /* Al Mawashi backup options (a customer company's scoped backup keeps the
     old single-file layout). */
  const isMawashi = !cardIds;
  const [splitMonths, setSplitMonths] = useState(true);
  /* Photos: how (mode), how sharp (quality), which reports (scope). Kept in
     this browser as a UI preference (the backup itself never depends on it). */
  const savedPhotoPrefs = useMemo(loadPhotoPrefs, []);
  const [photoMode, setPhotoMode] = useState(savedPhotoPrefs.mode || "embed_links");
  const [photoQuality, setPhotoQuality] = useState(savedPhotoPrefs.quality || "medium");
  const [photoScope, setPhotoScope] = useState(savedPhotoPrefs.scope || "inspection");
  const [photoTypes, setPhotoTypes] = useState(() => new Set(savedPhotoPrefs.types || INSPECTION_PHOTO_TYPES));
  const [askSize, setAskSize] = useState(savedPhotoPrefs.askSize !== false);
  useEffect(() => {
    savePhotoPrefs({ mode: photoMode, quality: photoQuality, scope: photoScope, types: [...photoTypes], askSize });
  }, [photoMode, photoQuality, photoScope, photoTypes, askSize]);
  /** Is this report in the photo scope? */
  const photoInScope = (cardId, typeKey) => {
    if (photoScope === "all") return true;
    if (photoScope === "custom") return photoTypes.has(typeKey);
    return cardId === "inspector";
  };
  function togglePhotoType(typeKey) {
    setPhotoTypes((prev) => {
      const next = new Set(prev);
      next.has(typeKey) ? next.delete(typeKey) : next.add(typeKey);
      return next;
    });
  }
  /* The size question: handleGenerate awaits the user's answer. */
  const [sizeAsk, setSizeAsk] = useState(null); // { count, mb, types }
  const askResolveRef = useRef(null);
  const askPhotoSize = (info) => new Promise((resolve) => {
    askResolveRef.current = resolve;
    setSizeAsk(info);
  });
  function answerPhotoSize(answer) {
    const resolve = askResolveRef.current;
    askResolveRef.current = null;
    setSizeAsk(null);
    resolve?.(answer);
  }
  const [includeTables, setIncludeTables] = useState(true);
  const abortRef = useRef(null);
  const [backupLog, setBackupLog] = useState(null); // null = loading/unavailable
  useEffect(() => {
    if (!isMawashi) return undefined;
    let alive = true;
    fetchBackupLog().then((list) => { if (alive) setBackupLog(list); });
    return () => { alive = false; };
  }, [isMawashi]);
  function cancelRun() {
    if (askResolveRef.current) answerPhotoSize("cancel");
    abortRef.current?.abort();
    setMsg({ kind: "info", text: "⛔ جارٍ الإلغاء..." });
  }
  /* Blank-forms export: how many writable lines a free-entry log gets. */
  const [blankRows, setBlankRows] = useState(15);

  function setMode(mode) {
    setFilter((f) => ({ ...f, mode }));
    // فلترة بتاريخ ⇒ أغلب الأنواع رح تطلع فارغة، فالأنسب تخطّي الملفات الفارغة
    if (mode !== "all") setSkipEmpty(true);
  }
  const filterOn = filter.mode !== "all";

  /* ─── Derived: counts & filter ─── */
  const totalTypes = useMemo(
    () => treeBranches.reduce((s, b) => s + b.types.length, 0),
    [treeBranches]
  );
  const pickedCount = picked.size;
  const filterQ = query.trim().toLowerCase();

  /* نافذة الرؤية: حساب بلا صلاحية «history» بياخد آخر ٣٠ يوم لفروع POS وشهرين
     للمرتجعات — والقصّ بيصير مركزياً في authFetch.js، فبدون هالتحذير بتطلع نسخة
     ناقصة واسمها كاملة. منحسبها من الأنواع المختارة فعلياً. */
  const windowWarning = useMemo(() => {
    const types = [];
    treeBranches.forEach((b) => b.types.forEach(([k]) => {
      if (picked.has(`${b.id}::${k}`)) types.push(k);
    }));
    return visibilityWarningText(types);
  }, [picked, treeBranches]);

  function isPicked(branchId, typeKey) {
    return picked.has(`${branchId}::${typeKey}`);
  }
  function togglePicked(branchId, typeKey) {
    setPicked((prev) => {
      const next = new Set(prev);
      const key = `${branchId}::${typeKey}`;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
  function branchPickedCount(branch) {
    return branch.types.filter(([k]) => picked.has(`${branch.id}::${k}`)).length;
  }
  function toggleBranchAll(branch) {
    setPicked((prev) => {
      const next = new Set(prev);
      const allOn = branch.types.every(([k]) => next.has(`${branch.id}::${k}`));
      branch.types.forEach(([k]) => {
        const id = `${branch.id}::${k}`;
        if (allOn) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }
  /** Tick or untick every type of every branch on one dashboard card. */
  function toggleCardAll(branches) {
    setPicked((prev) => {
      const next = new Set(prev);
      const allOn = branches.every((b) => b.types.every(([k]) => next.has(`${b.id}::${k}`)));
      branches.forEach((b) => b.types.forEach(([k]) => {
        const id = `${b.id}::${k}`;
        if (allOn) next.delete(id);
        else next.add(id);
      }));
      return next;
    });
  }
  function selectAll(on) {
    if (on) {
      const all = new Set();
      treeBranches.forEach((b) => b.types.forEach(([k]) => all.add(`${b.id}::${k}`)));
      setPicked(all);
    } else {
      setPicked(new Set());
    }
  }
  function toggleExpand(branchId) {
    setExpandedBranches((prev) => {
      const next = new Set(prev);
      next.has(branchId) ? next.delete(branchId) : next.add(branchId);
      return next;
    });
  }

  /* ─── Generate ─── */
  async function handleGenerate() {
    if (pickedCount === 0) {
      setMsg({ kind: "err", text: "⚠️ اختر تقرير واحد على الأقل" });
      return;
    }
    if (filter.mode === "day" && !filter.day) {
      setMsg({ kind: "err", text: "⚠️ اختر التاريخ المطلوب أولاً" });
      return;
    }
    if (filter.mode === "range" && !filter.from && !filter.to) {
      setMsg({ kind: "err", text: "⚠️ حدّد بداية أو نهاية النطاق" });
      return;
    }
    if (filter.mode === "range" && filter.from && filter.to && filter.from > filter.to) {
      setMsg({ kind: "err", text: "⚠️ تاريخ البداية بعد تاريخ النهاية" });
      return;
    }
    setBusy(true);
    setStats(null);
    setMsg({ kind: "info", text: "⏳ جارٍ جلب البيانات من السيرفر..." });
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    const checkAbort = () => { if (signal.aborted) throw abortError(); };

    try {
      const [JSZipModule, ExcelJSModule] = await Promise.all([
        import("jszip"),
        import("exceljs"),
      ]);
      const JSZip   = JSZipModule.default;
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const zip     = new JSZip();

      /* One work item per selected placement, already carrying the folder path
         it belongs in. Order follows the catalog, which follows the screens;
         the unlisted-types folder comes last. */
      const work = buildWorkList(picked, extraBranch ? [extraBranch] : []);

      /* المدة بتنبعت للسيرفر (فلترة SQL) بدل ما ننزّل كل السجلات ونفلتر هون.
         «تضمين السجلات بدون تاريخ» بيحتاج القراءة الكاملة — السيرفر ما بيرجّع
         سجل بلا تاريخ لطلب فيه مدة. */
      const win = filterOn && !filter.includeUndated ? filterWindow(filter) : { from: "", to: "" };

      let step = 0;
      let filesCreated = 0;
      let filesEmpty   = 0;
      let filesSkipped = 0;
      let totalRows    = 0;   // records that survived the date filter
      let totalFetched = 0;   // records returned by the server before filtering
      let serverFiltered = 0; // types whose date window ran in SQL
      let photosSaved  = 0;
      let photosFailed = 0;
      const folderCache = new Map();
      const fetchCache  = new Map(); // typeKey → page, so a type listed under two cards is read once
      const counted     = new Set(); // typeKeys already added to the record total
      const manifest    = [];
      const heavyTypes  = []; // types with 400+ records — warn user after export
      const pagedTypes  = []; // types that needed date-splitting to clear the 5000 cap
      const cutTypes    = []; // types where even one day exceeded the cap
      const notes       = [];

      /* Read one type (once — cached) and return its records for this
         backup: date-filtered, oldest first. */
      const loadType = async (item, atStep) => {
        const { branch, typeKey, typeLabel } = item;
        let page = fetchCache.get(typeKey);
        if (!page) {
          page = await fetchAllOfType(typeKey, {
            from: win.from,
            to: win.to,
            signal,
            onProgress: ({ requests }) => {
              if (requests > 2) {
                setProgress({
                  current: atStep,
                  total: work.length,
                  label: `${branch.label} ← ${typeLabel} — تقسيم المدة (${requests} طلب)`,
                });
              }
            },
          });
          fetchCache.set(typeKey, page);
          totalFetched += page.rows.length;
          if (page.serverFiltered) serverFiltered++;
          if (page.paged) pagedTypes.push(`${typeLabel} (${page.requests} طلب)`);
          if (page.truncated) cutTypes.push(typeLabel);
        }
        const fetched = page.rows;
        const filtered = filterOn ? fetched.filter((r) => matchesFilter(r, filter)) : fetched;
        return isMawashi ? sortByDate(filtered) : filtered;
      };

      /* Photos: count them first and ask before downloading a big ZIP. The
         reads are cached, so the main loop below does not fetch them again. */
      let runMode = isMawashi ? photoMode : "links";
      if (runMode !== "links" && askSize) {
        const photoItems = work.filter((it) => photoInScope(it.card.id, it.typeKey));
        const seenTypes = new Set();
        let photoCount = 0;
        let i = 0;
        for (const it of photoItems) {
          checkAbort();
          i++;
          if (seenTypes.has(it.typeKey)) continue;
          seenTypes.add(it.typeKey);
          setProgress({ current: i, total: photoItems.length, label: `📷 عدّ الصور — ${it.typeLabel}` });
          const recs = await loadType(it, 0);
          const urls = new Set(recs.flatMap((r) => collectPhotoUrls(r).map((x) => x.url)));
          photoCount += urls.size;
        }
        if (photoCount > 0) {
          const mb = estimatePhotoMB(photoCount, runMode, photoQuality, { sheetThumbs: photoCount });
          const answer = await askPhotoSize({ count: photoCount, mb, types: seenTypes.size });
          if (answer === "cancel") throw abortError();
          if (answer === "links") runMode = "links";
        }
      }

      for (const item of work) {
        checkAbort();
        const { branch, card, typeKey, typeLabel, segments, fileBase } = item;
        step++;
        setProgress({ current: step, total: work.length, label: `${card.label} ← ${branch.label} ← ${typeLabel}` });

        const atStep = step;
        const records = await loadType(item, atStep);
        /* Counted per TYPE, not per file: a type placed under two cards writes
           two files but is still one set of records, and adding it twice would
           inflate the summary the user reads. */
        if (!counted.has(typeKey)) {
          counted.add(typeKey);
          totalRows += records.length;
          if (records.length >= 400) {
            heavyTypes.push(`${typeLabel} (${records.length.toLocaleString()} سجل)`);
          }
        }

        // لا ملف أصلاً للأنواع الفارغة عند تفعيل "تخطّي الملفات الفارغة"
        if (records.length === 0 && skipEmpty) {
          filesSkipped++;
          continue;
        }

        const retKind = isMawashi ? returnsKindOf(typeKey) : "";
        /* Photo mode for THIS type: the chosen mode when the type is in the
           photo scope, plain links otherwise. */
        const typeMode = isMawashi && photoInScope(card.id, typeKey) ? runMode : "links";
        const exporter = getExporter(typeKey);

        /* Writes one workbook (+ its photos) and its INDEX line.
           Awaited inside this same iteration, so the shared counters it bumps
           are never raced. `cellPhotos`: the exporter has its own photo column
           (internal audit, municipality) and embeds pictures in the cell. */
        // eslint-disable-next-line no-loop-func
        const writeOne = async (recs, segs, fileName, { monthLabel = "", cellPhotos = false } = {}) => {
          checkAbort();
          const folder = folderFor(zip, segs, folderCache);
          const urls = typeMode === "links"
            ? []
            : [...new Set(recs.flatMap((r) => collectPhotoUrls(r).map((x) => x.url)))];
          const onPhoto = (done, total) => setProgress({
            current: atStep, total: work.length,
            label: `📷 ${typeLabel}${monthLabel ? ` — ${monthLabel}` : ""} — صور ${done}/${total}`,
          });
          const stem = fileName.replace(/\.xlsx$/i, "");
          const dirName = `${stem.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(0, 70)}_photos`;

          let images = null;   // url → bytes, embedded by the exporter in its photo column
          let photoRes = null; // downloaded photos for the Photos sheet / _photos folder
          if (urls.length) {
            if (typeMode === "folder") {
              photoRes = await downloadRecordPhotos(recs, {
                mode: "folder", quality: photoQuality, zipFolder: folder, dirName,
                dateOf: recordDate, refOf: (r) => getRefNo(r, typeKey), signal, onProgress: onPhoto,
              });
              photosSaved += photoRes.localByUrl.size;
              photosFailed += photoRes.failed;
            } else if (cellPhotos) {
              images = await fetchEmbeddableImages(urls, { quality: photoQuality, signal, onProgress: onPhoto });
              photosSaved += images.size;
              photosFailed += Math.max(0, urls.filter((u) => !/\.pdf(\?|#|$)|\/raw\/upload\//i.test(u)).length - images.size);
            } else {
              photoRes = await downloadRecordPhotos(recs, {
                mode: typeMode, quality: photoQuality,
                dateOf: recordDate, refOf: (r) => getRefNo(r, typeKey), signal, onProgress: onPhoto,
              });
              photosSaved += photoRes.entries.filter((e) => e.thumb).length;
              photosFailed += photoRes.failed;
            }
          }

          let photoIndex = null;
          if (photoRes && photoRes.entries.length && exporter.collection) {
            let row = 3; // the Photos sheet: title row, header row, then one line per photo
            photoIndex = recs.map((r) => {
              const n = collectPhotoUrls(r).length;
              const at = { count: n, row };
              row += n;
              return at;
            });
          }
          /* How the exporter writes a photo it does not embed. */
          let photoLink;
          if (typeMode === "folder" && photoRes) {
            photoLink = (u) => {
              const local = photoRes.localByUrl.get(u);
              return local ? { text: local.split("/").pop(), href: local } : { text: u, href: u };
            };
          } else if (typeMode === "embed_only") {
            photoLink = (u) => ({ text: /\.pdf(\?|#|$)|\/raw\/upload\//i.test(u) ? "📄 PDF" : "⚠️ photo not available", href: null });
          }

          const before = retKind
            ? (wb) => addReturnsMonthSheets(wb, recs, { kind: retKind, monthLabel: monthLabel || filterLabel(filter) })
            : null;
          const wb = await buildWorkbook(ExcelJS, branch.label, typeKey, typeLabel, recs, {
            brand, tenantBrand, enhance: isMawashi, before, photoIndex, images,
            photoLink, imageLinks: typeMode !== "embed_only",
          });

          if (photoRes && photoRes.entries.length) {
            addPhotosSheet(wb, photoRes.entries, {
              showLocal: typeMode === "folder",
              showOnline: typeMode !== "embed_only",
            });
            if (typeMode === "folder") relinkToLocal(wb, photoRes.localByUrl);
          }
          if (typeMode === "embed_only") stripEvidenceLinks(wb);

          const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
          const empty = recs.length === 0;
          const finalName = empty ? fileName.replace(/\.xlsx$/i, " — empty.xlsx") : fileName;
          folder.file(finalName, buf);
          if (empty) filesEmpty++; else filesCreated++;

          const { firstDate, lastDate } = dateSpan(recs);
          manifest.push({
            card: card.label,
            branch: branch.label,
            group: item.group,
            typeLabel: monthLabel ? `${typeLabel} — ${monthLabel}` : typeLabel,
            typeKey,
            count: recs.length,
            firstDate,
            lastDate,
            kind: exporterKindFor(typeKey),
            path: [...segs, finalName].join("/"),
          });
        };

        /* تقارير التفتيش: كل تقرير ملف لحاله بمجلد فرعه، والتاريخ أول الاسم. */
        const perReport = isMawashi ? PER_REPORT_FILES[typeKey] : null;
        if (perReport && records.length) {
          const used = new Map();
          const label = safeSegment(typeLabel);
          for (const rec of records) {
            const br = safeSegment(perReport(rec) || "No branch");
            const day = recordDate(rec) || "no-date";
            let name = `${day} — ${br} — ${label}`;
            const n = (used.get(name) || 0) + 1;
            used.set(name, n);
            if (n > 1) name += ` (${n})`;
            await writeOne([rec], [...segments, fileBase, br], `${name}.xlsx`, { monthLabel: `${day} · ${br}`, cellPhotos: true });
          }
          continue;
        }

        /* ملف لكل شهر: مجلد باسم التقرير ← مجلد لكل سنة ← ملف لكل شهر.
           المرتجعات دايماً هيك، حتى لو النسخة شهر واحد. */
        const parts = isMawashi && (splitMonths || card.id === "returns")
          ? monthParts(records, { force: card.id === "returns" })
          : null;

        if (!parts) {
          await writeOne(records, segments, `${fileBase}.xlsx`);
          continue;
        }
        const label = safeSegment(typeLabel);
        for (const part of parts) {
          const segs = [...segments, fileBase, ...(part.year ? [part.year] : [])];
          await writeOne(part.records, segs, `${part.label} — ${label}.xlsx`, { monthLabel: part.label });
        }
        /* المرتجعات: ملخّص السنة (شهر × فرع، شهر × إجراء) أول ملف بمجلد السنة. */
        if (retKind) {
          const years = [...new Set(parts.map((x) => x.year).filter(Boolean))];
          for (const y of years) {
            checkAbort();
            const yearRecs = parts.filter((x) => x.year === y).flatMap((x) => x.records);
            const wb = new ExcelJS.Workbook();
            wb.creator = `${brand} — Excel Backup`;
            buildReturnsYearSummary(wb, yearRecs, { kind: retKind, year: y });
            const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
            const segs = [...segments, fileBase, y];
            const fileName = `00 Year Summary ${y} — ${label}.xlsx`;
            folderFor(zip, segs, folderCache).file(fileName, buf);
            manifest.push({
              card: card.label, branch: branch.label, group: item.group,
              typeLabel: `${typeLabel} — Year Summary ${y}`, typeKey, count: yearRecs.length,
              ...dateSpan(yearRecs), kind: "summary", path: [...segs, fileName].join("/"),
            });
          }
        }
      }

      if (filesCreated === 0 && filesEmpty === 0) {
        setMsg({
          kind: "err",
          text: filterOn
            ? `⚠️ ما في أي سجل ضمن الفلترة (${filterLabel(filter)}) — من أصل ${totalFetched.toLocaleString()} سجل. جرّب توسيع المدة أو فعّل "تضمين السجلات بدون تاريخ".`
            : "⚠️ ما في أي سجل في الأنواع المختارة.",
        });
        return;
      }

      /* جداول قاعدة البيانات اللي مش تقارير (Al Mawashi). كل جدول لحالو:
         جدول فشل (صلاحية مثلاً) ما بيوقّف الباقي، وبينكتب بالـREADME. */
      const tables = [];
      let sessionExpired = false;
      if (isMawashi && includeTables) {
        const segs = ["99 Database Tables"];
        const tableJobs = [
          ["01 Products Catalog.xlsx", "Products Catalog", async (wb) => {
            const items = await fetchProductCatalog(signal);
            addProductsSheet(wb, items);
            return items.length;
          }],
          ["02 Accounts (no passwords).xlsx", "Accounts", async (wb) => {
            const users = await fetchAccounts(signal);
            addAccountsSheet(wb, users);
            return users.length;
          }],
          ["03 Audit Trail.xlsx", "Audit Trail", async (wb) => {
            const w = filterOn ? filterWindow(filter) : { from: "", to: "" };
            const res = await fetchAuditTrail({
              from: w.from, to: w.to, signal,
              onPage: (got, total) => setProgress({
                current: work.length, total: work.length, label: `🗄️ سجل التعديلات ${got.toLocaleString()}/${total.toLocaleString()}`,
              }),
            });
            addAuditSheet(wb, res.rows, filterOn ? filterLabel(filter) : "");
            if (res.capped) notes.push(`سجل التعديلات: أول ${res.rows.length.toLocaleString()} من ${res.total.toLocaleString()} — ضيّق المدة للباقي.`);
            return res.rows.length;
          }],
        ];
        for (const [fileName, label, run] of tableJobs) {
          checkAbort();
          setProgress({ current: work.length, total: work.length, label: `🗄️ ${label}` });
          try {
            const wb = new ExcelJS.Workbook();
            wb.creator = `${brand} — Excel Backup`;
            const n = await run(wb);
            const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
            folderFor(zip, segs, folderCache).file(fileName, buf);
            tables.push(`${label} (${n.toLocaleString()})`);
            manifest.push({
              card: "Database Tables", branch: "", group: "", typeLabel: label, typeKey: "",
              count: n, firstDate: "", lastDate: "", kind: "table", path: [...segs, fileName].join("/"),
            });
          } catch (e) {
            if (e?.name === "AbortError") throw e;
            if (e?.code === SESSION_EXPIRED) sessionExpired = true;
            notes.push(`${label}: ما انحفظ (${e?.message || e}).`);
          }
        }
      }

      setProgress({ current: work.length, total: work.length, label: "🗜️ جارٍ ضغط الملفات..." });

      /* Index + readme at the ZIP root. Without them a 200-file archive is a
         pile of folders with no way to tell what is inside without opening
         each one, or to notice that a type came back empty. */
      const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      if (cutTypes.length)   notes.push(`نسخة ناقصة (يوم فيه أكتر من 5000 سجل): ${cutTypes.join(" · ")}`);
      if (pagedTypes.length) notes.push(`انقسمت المدة لتجاوز السقف: ${pagedTypes.join(" · ")}`);
      if (filesSkipped)      notes.push(`${filesSkipped} نوع بلا سجلات — ما انعمله ملف.`);
      if (photosSaved || photosFailed) {
        notes.push(`📷 ${photosSaved} صورة محفوظة جوّا النسخة${photosFailed ? ` · ${photosFailed} ما نزلت (بيضل رابطها الأونلاين بورقة Photos)` : ""}.`);
      }
      if (windowWarning)     notes.push(windowWarning.replace(/^⚠️\s*/, ""));
      zip.file("00 INDEX.csv", manifestCsv(manifest));
      zip.file("00 README.txt", readmeText({
        generatedAt,
        filterLabel: filterLabel(filter),
        rows: manifest,
        notes,
        brand,
      }));

      const today = new Date().toISOString().slice(0, 10);
      checkAbort();
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      checkAbort();

      downloadBlob(blob, `${fileBrand}_Excel_Backup_${today}${filterSuffix(filter)}.zip`);

      if (isMawashi) {
        const w = filterWindow(filter);
        await saveBackupLog({
          at: new Date().toISOString(),
          filter: filterLabel(filter),
          mode: filter.mode,
          from: w.from || "",
          to: w.to || "",
          files: filesCreated,
          emptyFiles: filesEmpty,
          records: totalRows,
          types: counted.size,
          typesTotal: totalTypes,
          photos: photosSaved,
          photoMode: runMode,
          photoQuality,
          tables,
          sizeMB: Math.round((blob.size / 1048576) * 10) / 10,
          incomplete: cutTypes.length > 0 || !!windowWarning,
        });
        fetchBackupLog().then((list) => list && setBackupLog(list));
      }

      setStats({ mode: "backup", filesCreated, filesEmpty, totalRows, branches: new Set(manifest.map((m) => m.branch)).size });
      const heavyNote = heavyTypes.length > 0
        ? `  ⚠️ تقارير ضخمة (${heavyTypes.length}): ${heavyTypes.join(" · ")}`
        : "";
      const filterNote = filterOn
        ? `  🗓️ الفلترة: ${filterLabel(filter)} — ${totalRows.toLocaleString()} سجل${serverFiltered ? ` (${serverFiltered} نوع انفلتر على السيرفر)` : ""}.`
        : "";
      const skipNote = filesSkipped > 0 ? `  ⏭️ ${filesSkipped} نوع بلا سجلات (ما انعمله ملف).` : "";
      const pagedNote = pagedTypes.length > 0
        ? `  📄 تعدّى سقف الـ5000 فانقسمت المدة: ${pagedTypes.join(" · ")}.`
        : "";
      const cutNote = cutTypes.length > 0
        ? `  ⛔ يوم واحد فيه أكتر من 5000 سجل — النسخة ناقصة لـ: ${cutTypes.join(" · ")}.`
        : "";
      const photoNote = photosSaved || photosFailed
        ? `  📷 ${photosSaved} صورة${photosFailed ? ` (${photosFailed} ما نزلت)` : ""}.`
        : "";
      const tableNote = tables.length ? `  🗄️ ${tables.join(" · ")}.` : "";
      const windowNote = windowWarning ? `  ${windowWarning}` : "";
      const sessionNote = sessionExpired
        ? "  🔑 جلسة الدخول منتهية: انحفظت النسخة بس بلا جدول الحسابات/سجل التعديلات. سجّل خروج ودخول من جديد وخُد نسخة تانية لهالجداول."
        : "";
      setMsg({
        kind: cutTypes.length > 0 || windowWarning || sessionExpired ? "err" : (heavyTypes.length > 0 ? "info" : "ok"),
        text: `✅ تم! ${filesCreated} ملف Excel · ${filesEmpty} فارغ · ${totalRows.toLocaleString()} سجل · ${manifest.length} ملف بالفهرس · ${(blob.size / 1048576).toFixed(1)} MB${filterNote}${skipNote}${photoNote}${tableNote}${sessionNote}${pagedNote}${cutNote}${windowNote}${heavyNote}`,
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        setMsg({ kind: "info", text: "⛔ انلغت النسخة — ما نزل أي ملف." });
      } else {
        console.error(e);
        setMsg({ kind: "err", text: `❌ فشل الإنشاء: ${e?.message || e}` });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }

  /* ─── Blank forms ───
     نفس شجرة المجلدات، بس الملفات نماذج فارغة جاهزة للطباعة. منجيب سجل واحد
     فقط لكل نوع (limit=1 ⇒ الأحدث) لأن الهدف الشكل مش البيانات — فالتصدير
     أخف بمراحل من النسخة الاحتياطية حتى لو انختار كل شي. */
  async function handleBlankForms() {
    if (pickedCount === 0) {
      setMsg({ kind: "err", text: "⚠️ اختر تقرير واحد على الأقل" });
      return;
    }
    setBusy(true);
    setStats(null);
    setMsg({ kind: "info", text: "⏳ جارٍ تحضير النماذج الفارغة..." });
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [JSZipModule, ExcelJSModule] = await Promise.all([
        import("jszip"),
        import("exceljs"),
      ]);
      const JSZip   = JSZipModule.default;
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const zip     = new JSZip();

      const work = buildWorkList(picked);
      const folderCache   = new Map();
      const templateCache = new Map();   // typeKey → newest record (or null)
      const manifest = [];
      const missing  = [];
      let step = 0;
      let made = 0;

      for (const item of work) {
        if (controller.signal.aborted) throw abortError();
        const { branch, card, typeKey, typeLabel, segments, fileBase } = item;
        step++;
        setProgress({ current: step, total: work.length, label: `${card.label} ← ${branch.label} ← ${typeLabel}` });

        let template = templateCache.get(typeKey);
        if (template === undefined) {
          template = await fetchNewestRecord(typeKey);
          templateCache.set(typeKey, template);
          if (!template) missing.push(`${branch.label} — ${typeLabel}`);
        }

        const exporter = getExporter(typeKey);
        const payload = exporter.collection
          ? makeBlankRecordList(template, blankRows)
          : [makeBlankRecord(template, blankRows)];

        const wb = await buildWorkbook(
          ExcelJS, branch.label, typeKey, typeLabel, payload, { blankForm: true, brand, tenantBrand }
        );
        const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });

        const folder = folderFor(zip, segments, folderCache);
        const fileName = `${fileBase} — BLANK.xlsx`;
        folder.file(fileName, buf);
        made++;

        manifest.push({
          card: card.label,
          branch: branch.label,
          group: item.group,
          typeLabel,
          typeKey,
          count: template ? "modelled on a real record" : "skeleton",
          firstDate: "",
          lastDate: "",
          kind: exporterKindFor(typeKey),
          path: [...segments, fileName].join("/"),
        });
      }

      setProgress({ current: work.length, total: work.length, label: "🗜️ جارٍ ضغط الملفات..." });
      const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      zip.file("00 INDEX.csv", manifestCsv(manifest));
      zip.file("00 README.txt", blankReadmeText({
        generatedAt, rowCount: blankRows, rows: manifest, missing, brand,
      }));

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      const today = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `${fileBrand}_Blank_Forms_${today}.zip`);

      setStats({ mode: "blank", filesCreated: made, filesEmpty: missing.length, totalRows: 0, branches: new Set(manifest.map((m) => m.branch)).size });
      setMsg({
        kind: missing.length ? "info" : "ok",
        text: `✅ تم! ${made} نموذج فارغ · ${blankRows} سطر لكل نموذج` +
          (missing.length
            ? `  ℹ️ ${missing.length} نوع ما عنده ولا سجل محفوظ فانبنى من هيكل عام (التفاصيل بملف README داخل الـZIP).`
            : ""),
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        setMsg({ kind: "info", text: "⛔ انلغى تحضير النماذج — ما نزل أي ملف." });
      } else {
        console.error(e);
        setMsg({ kind: "err", text: `❌ فشل إنشاء النماذج: ${e?.message || e}` });
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress({ current: 0, total: 0, label: "" });
    }
  }
  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  /* Quick packages: tick only the types of these dashboard cards. */
  function selectCards(cardIdsToPick) {
    const want = new Set(cardIdsToPick);
    const next = new Set();
    treeBranches.forEach((b) => {
      if (!want.has(b.card)) return;
      b.types.forEach(([k]) => next.add(`${b.id}::${k}`));
    });
    setPicked(next);
  }
  const PRESETS = [
    ["all", "🗂️ الكل", null],
    ["returns", "♻️ المرتجعات", ["returns"]],
    ["inspector", "🔍 التفتيش", ["inspector"]],
    ["daily", "📅 المراقبة اليومية", ["daily"]],
    ["iso", "📘 ISO & HACCP", ["iso"]],
    ["hse", "🦺 HSE", ["hse"]],
  ];

  const lastBackup = backupLog && backupLog[0];
  const lastAge = lastBackup ? daysSince(lastBackup.at) : Infinity;
  const backupStale = lastAge > BACKUP_STALE_DAYS;
  const fmtWhen = (iso) => {
    try { return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" }); }
    catch { return String(iso || ""); }
  };
  const pickedPct = totalTypes ? Math.round((pickedCount / totalTypes) * 100) : 0;

  return (
    <div className="xb" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: XB_CSS }} />

      {/* ═══ Header ═══ */}
      <header className="xb-head">
        <div className="xb-head-txt">
          <div className="xb-eyebrow">📊 Excel Backup</div>
          <h1 className="xb-title">النسخ الاحتياطي Excel</h1>
          <p className="xb-sub">
            كل تقرير بيطلع بنفس تصميم صفحة العرض، مرتّب بمجلدات متل الشاشة الرئيسية.
            اختار التقارير من اليمين، وحدّد المدة والخيارات من الشريط الجانبي.
          </p>
        </div>
        {isMawashi && backupLog && (
          <div className={`xb-status ${backupStale ? "is-warn" : "is-ok"}`}>
            <span className="xb-status-ico">{backupStale ? "⚠️" : "✅"}</span>
            <div>
              <div className="xb-status-main">
                {!lastBackup
                  ? "ما في ولا نسخة مسجّلة"
                  : lastAge === 0 ? "آخر نسخة: اليوم" : `آخر نسخة: قبل ${lastAge} يوم`}
              </div>
              <div className="xb-status-sub">
                {!lastBackup
                  ? "خُد أول نسخة هلق"
                  : backupStale ? `مرّ أكتر من ${BACKUP_STALE_DAYS} يوم — صار لازم نسخة جديدة` : (lastBackup.byName || lastBackup.by || "")}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ═══ KPI strip ═══ */}
      <div className="xb-kpis">
        <div className="xb-kpi">
          <div className="xb-kpi-lbl">التقارير المختارة</div>
          <div className="xb-kpi-val">{pickedCount}<span className="xb-kpi-of"> / {totalTypes}</span></div>
          <div className="xb-meter"><span style={{ width: `${pickedPct}%` }} /></div>
        </div>
        <div className="xb-kpi">
          <div className="xb-kpi-lbl">المدة</div>
          <div className="xb-kpi-val xb-kpi-txt">{filterLabel(filter)}</div>
        </div>
        <div className="xb-kpi">
          <div className="xb-kpi-lbl">الصور</div>
          <div className="xb-kpi-val xb-kpi-txt">
            {!isMawashi || photoMode === "links"
              ? "🔗 روابط فقط"
              : `${photoModeById(photoMode).icon} ${photoModeById(photoMode).label} · ${
                  photoScope === "all" ? "كل التقارير" : photoScope === "custom" ? `${photoTypes.size} تقرير` : "التفتيش"
                } · ${photoQualityById(photoQuality).label}`}
          </div>
        </div>
        <div className="xb-kpi">
          <div className="xb-kpi-lbl">ترتيب الملفات</div>
          <div className="xb-kpi-val xb-kpi-txt">{isMawashi && splitMonths ? "ملف لكل شهر" : "ملف لكل تقرير"}</div>
        </div>
      </div>

      {windowWarning && <div className="xb-banner is-bad">{windowWarning}</div>}

      <div className="xb-grid">
        {/* ═══════════ Reports tree ═══════════ */}
        <main className="xb-main">
          <div className="xb-toolbar">
            <div className="xb-search">
              <span aria-hidden="true">🔎</span>
              <input
                type="text"
                placeholder="ابحث عن تقرير أو فرع..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="xb-x" onClick={() => setQuery("")} title="مسح">✕</button>
              )}
            </div>
            <div className="xb-tools">
              <button type="button" className="xb-btn-ghost" onClick={() => setExpandedBranches(new Set(treeBranches.map((b) => b.id)))}>توسيع الكل</button>
              <button type="button" className="xb-btn-ghost" onClick={() => setExpandedBranches(new Set())}>طي الكل</button>
              <button type="button" className="xb-btn-ghost" onClick={() => selectAll(false)}>إلغاء التحديد</button>
            </div>
          </div>

          <div className="xb-presets">
            <span className="xb-presets-lbl">اختيار سريع:</span>
            {PRESETS.filter(([id, , cards]) => !cards || treeCards.some((c) => cards.includes(c.id)) || id === "all").map(([id, lbl, cards]) => (
              <button
                key={id}
                type="button"
                className="xb-chip"
                onClick={() => (cards ? selectCards(cards) : selectAll(true))}
              >
                {lbl}
              </button>
            ))}
          </div>

          {treeCards.map((card) => {
            const branches = branchesFor(card.id);
            const cardTotal  = branches.reduce((s, b) => s + b.types.length, 0);
            const cardPicked = branches.reduce((s, b) => s + branchPickedCount(b), 0);
            const cardBranches = branches
              .map((branch) => {
                const visibleTypes = branch.types.filter(([, lbl]) => {
                  if (!filterQ) return true;
                  return lbl.toLowerCase().includes(filterQ)
                    || branch.label.toLowerCase().includes(filterQ)
                    || card.label.toLowerCase().includes(filterQ);
                });
                return { branch, visibleTypes };
              })
              .filter(({ visibleTypes }) => !filterQ || visibleTypes.length > 0);
            if (!cardBranches.length) return null;
            const cardState = cardPicked === 0 ? "off" : cardPicked === cardTotal ? "on" : "some";

            return (
              <section key={card.id} className="xb-card">
                <div className="xb-card-head">
                  <span className="xb-card-emoji">{card.emoji}</span>
                  <div className="xb-card-titles">
                    <h2 className="xb-card-title">{card.label}</h2>
                    <div className="xb-card-meta">{cardPicked}/{cardTotal} تقرير · {branches.length} مجلد</div>
                  </div>
                  <div className="xb-meter xb-card-meter"><span style={{ width: `${cardTotal ? (cardPicked / cardTotal) * 100 : 0}%` }} /></div>
                  <button
                    type="button"
                    className={`xb-tri is-${cardState}`}
                    onClick={() => toggleCardAll(branches)}
                    title={cardState === "on" ? "إلغاء الكرت" : "تحديد الكرت"}
                  >
                    {cardState === "on" ? "✓" : cardState === "some" ? "–" : ""}
                  </button>
                </div>

                <div className="xb-branches">
                  {cardBranches.map(({ branch, visibleTypes }) => {
                    const expanded = expandedBranches.has(branch.id) || !!filterQ;
                    const count = branchPickedCount(branch);
                    const total = branch.types.length;
                    const state = count === 0 ? "off" : count === total ? "on" : "some";
                    const groups = groupsOfBranch(branch);
                    return (
                      <div
                        key={`${card.id}:${branch.id}`}
                        className={`xb-branch ${count > 0 ? "is-active" : ""}`}
                        style={{ "--acc": branch.accent || "#0ea5e9" }}
                      >
                        <div className="xb-branch-head">
                          <button
                            type="button"
                            className="xb-branch-open"
                            onClick={() => toggleExpand(branch.id)}
                            aria-expanded={expanded}
                          >
                            <span className="xb-branch-emoji">{branch.emoji}</span>
                            <span className="xb-branch-name">{branch.label}</span>
                            <span className="xb-branch-count">{count}/{total}</span>
                            <span className="xb-chev">{expanded ? "▾" : "◂"}</span>
                          </button>
                          <button
                            type="button"
                            className={`xb-tri is-${state}`}
                            onClick={() => toggleBranchAll(branch)}
                            title={state === "on" ? "إلغاء الفرع" : "تحديد الفرع"}
                          >
                            {state === "on" ? "✓" : state === "some" ? "–" : ""}
                          </button>
                        </div>

                        {expanded && (
                          <div className="xb-types">
                            {["", ...groups].map((g) => {
                              const inGroup = visibleTypes.filter(([, , tg]) => (tg || "") === g);
                              if (!inGroup.length) return null;
                              return (
                                <div key={g || "__root"} className="xb-group">
                                  {g && <div className="xb-group-head">{g}</div>}
                                  {inGroup.map(([k, lbl]) => {
                                    const on = isPicked(branch.id, k);
                                    return (
                                      <label key={k} className={`xb-type ${on ? "is-on" : ""}`}>
                                        <input
                                          type="checkbox"
                                          checked={on}
                                          onChange={() => togglePicked(branch.id, k)}
                                        />
                                        <span className="xb-box" aria-hidden="true">{on ? "✓" : ""}</span>
                                        <span className="xb-type-lbl">{lbl}</span>
                                        {isMawashi && photoMode !== "links" && photoScope === "custom" && (
                                          <button
                                            type="button"
                                            className={`xb-cam ${photoTypes.has(k) ? "is-on" : ""}`}
                                            title={photoTypes.has(k) ? "بلا صور" : "مع الصور"}
                                            onClick={(e) => { e.preventDefault(); togglePhotoType(k); }}
                                          >
                                            📷
                                          </button>
                                        )}
                                      </label>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </main>

        {/* ═══════════ Side panel ═══════════ */}
        <aside className="xb-side">
          {/* Export */}
          <section className="xb-panel xb-panel-cta">
            <div className="xb-panel-title">📥 التصدير</div>
            <ul className="xb-summary">
              <li><span>التقارير</span><b>{pickedCount}</b></li>
              <li><span>المدة</span><b>{filterLabel(filter)}</b></li>
              {isMawashi && <li><span>جداول قاعدة البيانات</span><b>{includeTables ? "نعم" : "لا"}</b></li>}
            </ul>
            <button
              type="button"
              className="xb-btn-primary"
              onClick={handleGenerate}
              disabled={busy || pickedCount === 0}
            >
              {busy ? `⏳ ${progress.current}/${progress.total} — ${pct}%` : "إنشاء وتحميل ZIP"}
            </button>
            {busy && (
              <>
                <div className="xb-progress"><span style={{ width: `${pct}%` }} /></div>
                {progress.label && <div className="xb-progress-lbl">{progress.label}</div>}
                <button type="button" className="xb-btn-cancel" onClick={cancelRun}>⛔ إلغاء</button>
              </>
            )}
            {sizeAsk && (
              <div className="xb-ask">
                <div className="xb-ask-title">📷 قبل التحميل</div>
                <div className="xb-ask-body">
                  في <b>{sizeAsk.count.toLocaleString()}</b> صورة بـ{sizeAsk.types} تقرير —
                  الحجم المتوقّع حوالي <b>{sizeAsk.mb < 1 ? "أقل من 1" : Math.round(sizeAsk.mb).toLocaleString()} MB</b>
                  {" "}({photoModeById(photoMode).label} · {photoQualityById(photoQuality).label}).
                </div>
                <div className="xb-ask-btns">
                  <button type="button" className="xb-btn-primary xb-btn-sm" onClick={() => answerPhotoSize("go")}>كمّل مع الصور</button>
                  <button type="button" className="xb-btn-soft xb-btn-sm" onClick={() => answerPhotoSize("links")}>روابط بس هالمرة</button>
                  <button type="button" className="xb-btn-cancel xb-btn-sm" onClick={() => answerPhotoSize("cancel")}>إلغاء</button>
                </div>
              </div>
            )}
            {msg.text && <div className={`xb-msg is-${msg.kind || "info"}`}>{msg.text}</div>}
            {stats && !busy && (
              <div className="xb-stats">
                <div><b>{stats.filesCreated}</b><span>{stats.mode === "blank" ? "نموذج" : "ملف"}</span></div>
                <div><b>{stats.filesEmpty}</b><span>{stats.mode === "blank" ? "بلا سجل" : "فارغ"}</span></div>
                {stats.mode !== "blank" && <div><b>{stats.totalRows.toLocaleString()}</b><span>سجل</span></div>}
                <div><b>{stats.branches}</b><span>فرع</span></div>
              </div>
            )}
          </section>

          {/* Period */}
          <section className="xb-panel">
            <div className="xb-panel-title">🗓️ المدة</div>
            <div className="xb-seg">
              {[
                ["all", "الكل"],
                ["day", "يوم"],
                ["range", "من - إلى"],
                ["months", "آخر أشهر"],
              ].map(([m, lbl]) => (
                <button key={m} type="button" className={filter.mode === m ? "is-on" : ""} onClick={() => setMode(m)}>
                  {lbl}
                </button>
              ))}
            </div>

            {filter.mode === "day" && (
              <div className="xb-fields">
                <input
                  type="date"
                  className="xb-input"
                  value={filter.day}
                  onChange={(e) => setFilter((f) => ({ ...f, day: e.target.value }))}
                />
                <button type="button" className="xb-chip" onClick={() => setFilter((f) => ({ ...f, day: todayISO() }))}>اليوم</button>
              </div>
            )}
            {filter.mode === "range" && (
              <div className="xb-fields xb-fields-2">
                <label className="xb-field">
                  <span>من</span>
                  <input type="date" className="xb-input" value={filter.from}
                    onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))} />
                </label>
                <label className="xb-field">
                  <span>إلى</span>
                  <input type="date" className="xb-input" value={filter.to}
                    onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))} />
                </label>
              </div>
            )}
            {filter.mode === "months" && (
              <div className="xb-fields">
                {[1, 3, 6, 12].map((n) => (
                  <button key={n} type="button" className={`xb-chip ${filter.months === n ? "is-on" : ""}`}
                    onClick={() => setFilter((f) => ({ ...f, months: n }))}>
                    {n} {n === 1 ? "شهر" : "أشهر"}
                  </button>
                ))}
                <input
                  type="number" min="1" max="60" className="xb-input xb-input-num"
                  value={filter.months}
                  onChange={(e) => setFilter((f) => ({ ...f, months: Math.max(1, Math.min(60, Number(e.target.value) || 1)) }))}
                />
              </div>
            )}
            <div className="xb-hint">{filterLabel(filter)}</div>
            {filterOn && (
              <Switch
                on={filter.includeUndated}
                onChange={(v) => setFilter((f) => ({ ...f, includeUndated: v }))}
                label="تضمين السجلات بدون تاريخ"
                hint="أبطأ: بيقرأ كل سجلات النوع بدل فلترة السيرفر"
              />
            )}
          </section>

          {/* Options */}
          <section className="xb-panel">
            <div className="xb-panel-title">⚙️ الخيارات</div>
            <Switch
              on={skipEmpty}
              onChange={setSkipEmpty}
              label="تخطّي التقارير الفارغة"
              hint="ما بينعمل ملف لتقرير بلا سجلات"
            />
            {isMawashi && (
              <>
                <Switch
                  on={splitMonths}
                  onChange={setSplitMonths}
                  label="📅 ملف لكل شهر"
                  hint="التقرير ← سنة ← ملف لكل شهر (المرتجعات دايماً هيك)"
                />
                <Switch
                  on={includeTables}
                  onChange={setIncludeTables}
                  label="🗄️ جداول قاعدة البيانات"
                  hint="المنتجات · الحسابات (بلا كلمات سر) · سجل التعديلات"
                />
              </>
            )}
          </section>

          {/* Photos */}
          {isMawashi && (
            <section className="xb-panel">
              <div className="xb-panel-title">📷 الصور</div>
              <div className="xb-modes">
                {PHOTO_MODES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`xb-mode ${photoMode === m.id ? "is-on" : ""}`}
                    onClick={() => setPhotoMode(m.id)}
                  >
                    <span className="xb-mode-ico">{m.icon}</span>
                    <span className="xb-mode-lbl">{m.label}</span>
                    <span className="xb-mode-hint">{m.hint}</span>
                  </button>
                ))}
              </div>

              {photoMode !== "links" && (
                <>
                  <div className="xb-sub-lbl">الجودة</div>
                  <div className="xb-seg xb-seg-3">
                    {PHOTO_QUALITY.map((q) => (
                      <button key={q.id} type="button" className={photoQuality === q.id ? "is-on" : ""} onClick={() => setPhotoQuality(q.id)}>
                        {q.label} <span className="xb-seg-hint">{q.hint}</span>
                      </button>
                    ))}
                  </div>

                  <div className="xb-sub-lbl">على أي تقارير</div>
                  <div className="xb-seg xb-seg-3">
                    {[["inspection", "التفتيش"], ["all", "كل المختار"], ["custom", "أنا بحدد"]].map(([id, lbl]) => (
                      <button key={id} type="button" className={photoScope === id ? "is-on" : ""} onClick={() => setPhotoScope(id)}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                  <div className="xb-hint">
                    {photoScope === "custom"
                      ? `اكبس 📷 جنب أي تقرير بالقائمة · مختار ${photoTypes.size}`
                      : photoScope === "all"
                        ? "كل التقارير المختارة بتطلع مع صورها"
                        : "تقارير التفتيش مع صورها — الباقي روابط"}
                  </div>
                  <Switch
                    on={askSize}
                    onChange={setAskSize}
                    label="اسألني عن الحجم قبل التحميل"
                    hint="بيعدّ الصور وبيقلّك الحجم المتوقّع قبل ما يبلّش"
                  />
                </>
              )}
            </section>
          )}

          {/* Blank forms */}
          <details className="xb-panel xb-details">
            <summary className="xb-panel-title">📄 نماذج فارغة للطباعة</summary>
            <p className="xb-hint">نفس المجلدات، وكل ملف نموذج فاضي بترويسته وأعمدته — للتعبئة باليد.</p>
            <div className="xb-fields">
              <span className="xb-field-lbl">أسطر لكل نموذج</span>
              {[10, 15, 25, 40].map((n) => (
                <button key={n} type="button" className={`xb-chip ${blankRows === n ? "is-on" : ""}`} onClick={() => setBlankRows(n)}>{n}</button>
              ))}
              <input
                type="number" min="1" max="60" className="xb-input xb-input-num"
                value={blankRows}
                onChange={(e) => setBlankRows(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              />
            </div>
            <button
              type="button"
              className="xb-btn-soft"
              onClick={handleBlankForms}
              disabled={busy || pickedCount === 0}
            >
              📄 تحميل {pickedCount} نموذج فارغ
            </button>
          </details>

          {/* Backup log */}
          {isMawashi && backupLog && backupLog.length > 0 && (
            <section className="xb-panel">
              <div className="xb-panel-title">🗂️ آخر النسخ</div>
              <ol className="xb-log">
                {backupLog.slice(0, 6).map((b) => (
                  <li key={b.id || b.at}>
                    <div className="xb-log-top">
                      <span className="xb-log-when">{fmtWhen(b.at)}</span>
                      {b.incomplete && <span className="xb-tag is-warn">ناقصة</span>}
                    </div>
                    <div className="xb-log-who">{b.byName || b.by || "—"} · {b.filter || "—"}</div>
                    <div className="xb-log-what">
                      {Number(b.files || 0).toLocaleString()} ملف · {Number(b.records || 0).toLocaleString()} سجل
                      {b.photos ? ` · 📷 ${b.photos}` : ""}
                      {b.sizeMB != null ? ` · ${b.sizeMB} MB` : ""}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** On/off switch with a second line of help text. */
function Switch({ on, onChange, label, hint }) {
  return (
    <label className={`xb-switch ${on ? "is-on" : ""}`}>
      <input type="checkbox" checked={!!on} onChange={(e) => onChange(e.target.checked)} />
      <span className="xb-switch-track" aria-hidden="true"><span className="xb-switch-dot" /></span>
      <span className="xb-switch-txt">
        <span className="xb-switch-lbl">{label}</span>
        {hint && <span className="xb-switch-hint">{hint}</span>}
      </span>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — Soft Sky, page-scoped.
   globals.css forces `#root * { font-size: … !important }`, so inline font
   sizes are dead: every rule here uses the doubled class `.xb.xb` to out-rank
   it, and sizes follow the app's Aa text-size control via --app-fs.
   globals.css also sets overflow-x:hidden on html/body/#root, which kills
   position:sticky — `overflow-x: clip` on this page brings the side panel's
   sticky back.
   ═══════════════════════════════════════════════════════════════ */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const XB_CSS = `
html:has(.xb), body:has(.xb), #root:has(.xb) { overflow-x: clip; }
#root .xb.xb {
  --ink: #1e293b; --ink-2: #475569; --ink-3: #64748b; --line: #e2e8f0; --line-2: #cbd5e1;
  --sky: #0ea5e9; --sky-d: #0369a1; --sky-50: #f0f9ff; --sky-100: #e0f2fe; --sky-200: #bae6fd;
  --ok: #15803d; --ok-bg: #f0fdf4; --warn: #92400e; --warn-bg: #fffbeb; --bad: #b91c1c; --bad-bg: #fef2f2;
  color: var(--ink); width: 100%; max-width: none; margin: 0; padding: 4px 4px 40px;
  font-family: inherit;
}
#root .xb.xb * { box-sizing: border-box; }
#root .xb.xb button { font-family: inherit; }

/* header */
#root .xb.xb .xb-head { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap;
  background: linear-gradient(135deg, #f0f9ff 0%, #ffffff 60%); border: 1px solid var(--sky-200); border-radius: 18px; padding: 20px 22px; }
#root .xb.xb .xb-eyebrow { display: inline-block; font-size: ${fs(12)}; font-weight: 800; letter-spacing: .04em; color: var(--sky-d);
  background: var(--sky-100); border-radius: 999px; padding: 3px 10px; }
#root .xb.xb .xb-title { font-size: ${fs(26)}; font-weight: 900; margin: 8px 0 4px; color: #0f172a; line-height: 1.25; }
#root .xb.xb .xb-sub { font-size: ${fs(14)}; color: var(--ink-2); margin: 0; max-width: 720px; line-height: 1.7; }
#root .xb.xb .xb-status { display: flex; gap: 10px; align-items: center; border-radius: 14px; padding: 12px 16px; min-width: 240px; border: 1px solid; }
#root .xb.xb .xb-status.is-ok { background: var(--ok-bg); border-color: #bbf7d0; }
#root .xb.xb .xb-status.is-warn { background: var(--warn-bg); border-color: #fde68a; }
#root .xb.xb .xb-status-ico { font-size: ${fs(22)}; }
#root .xb.xb .xb-status-main { font-size: ${fs(15)}; font-weight: 800; }
#root .xb.xb .xb-status.is-ok .xb-status-main { color: var(--ok); }
#root .xb.xb .xb-status.is-warn .xb-status-main { color: var(--warn); }
#root .xb.xb .xb-status-sub { font-size: ${fs(12.5)}; color: var(--ink-3); margin-top: 2px; }

/* kpis */
#root .xb.xb .xb-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 14px 0; }
#root .xb.xb .xb-kpi { background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; min-width: 0; }
#root .xb.xb .xb-kpi-lbl { font-size: ${fs(12)}; color: var(--ink-3); font-weight: 700; }
#root .xb.xb .xb-kpi-val { font-size: ${fs(24)}; font-weight: 900; color: #0f172a; margin-top: 4px; line-height: 1.2; }
#root .xb.xb .xb-kpi-of { font-size: ${fs(14)}; color: var(--ink-3); font-weight: 700; }
#root .xb.xb .xb-kpi-txt { font-size: ${fs(14.5)}; font-weight: 800; color: var(--sky-d); overflow-wrap: anywhere; }
#root .xb.xb .xb-meter { height: 6px; background: var(--sky-100); border-radius: 999px; overflow: hidden; margin-top: 8px; }
#root .xb.xb .xb-meter > span { display: block; height: 100%; background: var(--sky); border-radius: 999px; transition: width .25s; }

#root .xb.xb .xb-banner { border-radius: 12px; padding: 12px 16px; margin: 0 0 14px; font-size: ${fs(13.5)}; font-weight: 600; line-height: 1.7; }
#root .xb.xb .xb-banner.is-bad { background: var(--bad-bg); border: 1px solid #fecaca; color: var(--bad); }

/* layout */
#root .xb.xb .xb-grid { display: grid; grid-template-columns: minmax(0, 1fr) clamp(320px, 24vw, 420px); gap: 16px; align-items: start; }
#root .xb.xb .xb-main, #root .xb.xb .xb-side, #root .xb.xb .xb-side > * { min-width: 0; }
#root .xb.xb .xb-side { position: sticky; top: 12px; display: grid; gap: 12px; max-height: calc(100vh - 24px); overflow-y: auto; padding-bottom: 4px; }
@media (max-width: 1020px) {
  #root .xb.xb .xb-grid { grid-template-columns: minmax(0, 1fr); }
  #root .xb.xb .xb-side { position: static; max-height: none; overflow: visible; order: -1; }
  #root .xb.xb .xb-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* toolbar */
#root .xb.xb .xb-toolbar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
#root .xb.xb .xb-search { flex: 1 1 260px; display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line-2);
  border-radius: 12px; padding: 0 12px; height: 42px; }
#root .xb.xb .xb-search:focus-within { border-color: var(--sky); box-shadow: 0 0 0 3px var(--sky-100); }
#root .xb.xb .xb-search input { flex: 1; border: 0; outline: 0; background: transparent; font-size: ${fs(15.5)}; color: var(--ink); min-width: 0; }
#root .xb.xb .xb-x { border: 0; background: var(--sky-50); color: var(--ink-3); border-radius: 8px; width: 26px; height: 26px; cursor: pointer; font-size: ${fs(12)}; }
#root .xb.xb .xb-tools { display: flex; gap: 6px; flex-wrap: wrap; }
#root .xb.xb .xb-btn-ghost { border: 1px solid var(--line-2); background: #fff; color: var(--ink-2); border-radius: 10px; padding: 8px 12px;
  font-size: ${fs(14.5)}; font-weight: 700; cursor: pointer; }
#root .xb.xb .xb-btn-ghost:hover { border-color: var(--sky); color: var(--sky-d); background: var(--sky-50); }
#root .xb.xb .xb-presets { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
#root .xb.xb .xb-presets-lbl { font-size: ${fs(12.5)}; color: var(--ink-3); font-weight: 700; margin-inline-end: 4px; }
#root .xb.xb .xb-chip { border: 1px solid var(--sky-200); background: var(--sky-50); color: var(--sky-d); border-radius: 999px; padding: 7px 14px;
  font-size: ${fs(14.5)}; font-weight: 700; cursor: pointer; white-space: nowrap; }
#root .xb.xb .xb-chip:hover { background: var(--sky-100); }
#root .xb.xb .xb-chip.is-on { background: var(--sky); border-color: var(--sky); color: #fff; }

/* cards */
#root .xb.xb .xb-card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 18px; margin-bottom: 14px; }
#root .xb.xb .xb-card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
#root .xb.xb .xb-card-emoji { font-size: ${fs(26)}; width: 48px; height: 48px; display: grid; place-items: center; background: var(--sky-50); border-radius: 12px; flex: none; }
#root .xb.xb .xb-card-titles { min-width: 0; }
#root .xb.xb .xb-card-title { font-size: ${fs(20)}; font-weight: 900; margin: 0; color: #0f172a; }
#root .xb.xb .xb-card-meta { font-size: ${fs(13.5)}; color: var(--ink-3); font-weight: 600; margin-top: 2px; }
#root .xb.xb .xb-card-meter { flex: 1; margin-top: 0; max-width: 220px; margin-inline-start: auto; }

/* tri-state checkbox button */
#root .xb.xb .xb-tri { width: 32px; height: 32px; flex: none; border-radius: 8px; border: 2px solid var(--line-2); background: #fff; cursor: pointer;
  display: grid; place-items: center; font-size: ${fs(15)}; font-weight: 900; color: #fff; line-height: 1; }
#root .xb.xb .xb-tri.is-on { background: var(--sky); border-color: var(--sky); }
#root .xb.xb .xb-tri.is-some { background: var(--sky-100); border-color: var(--sky); color: var(--sky-d); }

/* branches */
#root .xb.xb .xb-branches { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 14px; align-items: start; }
#root .xb.xb .xb-branch { border: 1px solid var(--line); border-radius: 12px; background: #fbfdff; border-top: 3px solid var(--line-2); }
#root .xb.xb .xb-branch.is-active { border-top-color: var(--acc); background: #fff; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
#root .xb.xb .xb-branch-head { display: flex; align-items: center; gap: 10px; padding: 12px 14px; }
#root .xb.xb .xb-branch-open { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; cursor: pointer; padding: 2px 0; text-align: start; }
#root .xb.xb .xb-branch-emoji { font-size: ${fs(20)}; }
#root .xb.xb .xb-branch-name { font-size: ${fs(17)}; font-weight: 800; color: var(--ink); line-height: 1.3; min-width: 0; overflow-wrap: anywhere; }
#root .xb.xb .xb-branch-count { font-size: ${fs(13.5)}; font-weight: 800; color: var(--ink-3); background: var(--sky-50); border-radius: 999px; padding: 1px 8px; }
#root .xb.xb .xb-branch.is-active .xb-branch-count { color: var(--acc); }
#root .xb.xb .xb-chev { margin-inline-start: auto; color: var(--ink-3); font-size: ${fs(12)}; }

/* types */
#root .xb.xb .xb-types { border-top: 1px dashed var(--line); padding: 8px 8px 10px; }
#root .xb.xb .xb-group-head { font-size: ${fs(13)}; font-weight: 800; color: var(--ink-3); padding: 8px 6px 4px; letter-spacing: .02em; }
#root .xb.xb .xb-type { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; cursor: pointer; }
#root .xb.xb .xb-type:hover { background: var(--sky-50); }
#root .xb.xb .xb-type input { position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; }
#root .xb.xb .xb-box { width: 21px; height: 21px; flex: none; border-radius: 5px; border: 2px solid var(--line-2); background: #fff;
  display: grid; place-items: center; font-size: ${fs(13)}; font-weight: 900; color: #fff; }
#root .xb.xb .xb-type.is-on .xb-box { background: var(--acc); border-color: var(--acc); }
#root .xb.xb .xb-type input:focus-visible + .xb-box { box-shadow: 0 0 0 3px var(--sky-200); }
#root .xb.xb .xb-type-lbl { font-size: ${fs(15.5)}; color: var(--ink-2); line-height: 1.4; }
#root .xb.xb .xb-type.is-on .xb-type-lbl { color: var(--ink); font-weight: 700; }

/* side panels */
#root .xb.xb .xb-panel { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 14px; }
#root .xb.xb .xb-panel-title { font-size: ${fs(15)}; font-weight: 900; color: #0f172a; margin-bottom: 10px; }
#root .xb.xb .xb-seg { display: grid; grid-template-columns: repeat(4, 1fr); background: var(--sky-50); border: 1px solid var(--sky-100); border-radius: 12px; padding: 3px; gap: 3px; }
#root .xb.xb .xb-seg button { border: 0; background: transparent; border-radius: 9px; padding: 8px 4px; font-size: ${fs(13)}; font-weight: 700; color: var(--ink-2); cursor: pointer; }
#root .xb.xb .xb-seg button.is-on { background: #fff; color: var(--sky-d); box-shadow: 0 1px 3px rgba(15,23,42,.1); }
#root .xb.xb .xb-fields { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 10px; }
#root .xb.xb .xb-fields-2 { display: grid; grid-template-columns: 1fr 1fr; }
#root .xb.xb .xb-field { display: grid; gap: 4px; }
#root .xb.xb .xb-field > span, #root .xb.xb .xb-field-lbl { font-size: ${fs(12)}; color: var(--ink-3); font-weight: 700; }
#root .xb.xb .xb-input { border: 1px solid var(--line-2); border-radius: 10px; padding: 7px 10px; font-size: ${fs(13.5)}; color: var(--ink); background: #fff; min-width: 0; width: 100%; }
#root .xb.xb .xb-fields:not(.xb-fields-2) .xb-input { width: auto; flex: 1 1 140px; }
#root .xb.xb .xb-fields .xb-input-num { flex: 0 0 72px; width: 72px; }
#root .xb.xb .xb-input:focus { outline: 0; border-color: var(--sky); box-shadow: 0 0 0 3px var(--sky-100); }
#root .xb.xb .xb-hint { font-size: ${fs(12)}; color: var(--ink-3); margin-top: 8px; line-height: 1.6; }

/* switch */
#root .xb.xb .xb-switch { display: flex; gap: 10px; align-items: flex-start; padding: 8px 2px; cursor: pointer; border-top: 1px solid #f1f5f9; }
#root .xb.xb .xb-panel-title + .xb-switch { border-top: 0; }
#root .xb.xb .xb-switch input { position: absolute; opacity: 0; pointer-events: none; width: 1px; height: 1px; }
#root .xb.xb .xb-switch-track { flex: none; width: 38px; height: 22px; border-radius: 999px; background: var(--line-2); position: relative; transition: background .2s; margin-top: 1px; }
#root .xb.xb .xb-switch-dot { position: absolute; top: 3px; inset-inline-start: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff;
  box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: inset-inline-start .2s; }
#root .xb.xb .xb-switch.is-on .xb-switch-track { background: var(--sky); }
#root .xb.xb .xb-switch.is-on .xb-switch-dot { inset-inline-start: 19px; }
#root .xb.xb .xb-switch input:focus-visible + .xb-switch-track { box-shadow: 0 0 0 3px var(--sky-200); }
#root .xb.xb .xb-switch-txt { display: grid; gap: 2px; min-width: 0; }
#root .xb.xb .xb-switch-lbl { font-size: ${fs(13.5)}; font-weight: 800; color: var(--ink); }
#root .xb.xb .xb-switch-hint { font-size: ${fs(12)}; color: var(--ink-3); line-height: 1.5; }

/* export */
#root .xb.xb .xb-panel-cta { border-color: var(--sky-200); background: linear-gradient(180deg, #f8fcff, #fff); }
#root .xb.xb .xb-summary { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 6px; }
#root .xb.xb .xb-summary li { display: flex; justify-content: space-between; gap: 10px; font-size: ${fs(13)}; color: var(--ink-2); }
#root .xb.xb .xb-summary b { color: var(--ink); font-weight: 800; text-align: end; overflow-wrap: anywhere; }
#root .xb.xb .xb-btn-primary { width: 100%; border: 0; border-radius: 12px; padding: 13px 16px; cursor: pointer;
  background: var(--sky); color: #fff; font-size: ${fs(15.5)}; font-weight: 900; box-shadow: 0 6px 16px rgba(14,165,233,.25); }
#root .xb.xb .xb-btn-primary:hover:not(:disabled) { background: #0284c7; }
#root .xb.xb .xb-btn-primary:disabled { background: #cbd5e1; box-shadow: none; cursor: not-allowed; }
#root .xb.xb .xb-btn-cancel { width: 100%; margin-top: 8px; border: 1px solid #fecaca; background: var(--bad-bg); color: var(--bad);
  border-radius: 10px; padding: 9px; font-size: ${fs(13.5)}; font-weight: 800; cursor: pointer; }
#root .xb.xb .xb-btn-soft { width: 100%; margin-top: 10px; border: 1px solid var(--sky-200); background: var(--sky-50); color: var(--sky-d);
  border-radius: 10px; padding: 10px; font-size: ${fs(13.5)}; font-weight: 800; cursor: pointer; }
#root .xb.xb .xb-btn-soft:disabled { opacity: .5; cursor: not-allowed; }
#root .xb.xb .xb-progress { height: 8px; background: var(--sky-100); border-radius: 999px; overflow: hidden; margin-top: 12px; }
#root .xb.xb .xb-progress > span { display: block; height: 100%; background: linear-gradient(90deg, #38bdf8, #0ea5e9); transition: width .3s; }
#root .xb.xb .xb-progress-lbl { font-size: ${fs(12)}; color: var(--ink-3); margin-top: 6px; line-height: 1.5; overflow-wrap: anywhere; }
#root .xb.xb .xb-msg { margin-top: 12px; border-radius: 10px; padding: 10px 12px; font-size: ${fs(12.5)}; line-height: 1.7; overflow-wrap: anywhere; border: 1px solid; }
#root .xb.xb .xb-msg.is-ok { background: var(--ok-bg); border-color: #bbf7d0; color: var(--ok); }
#root .xb.xb .xb-msg.is-info { background: var(--sky-50); border-color: var(--sky-200); color: var(--sky-d); }
#root .xb.xb .xb-msg.is-err { background: var(--bad-bg); border-color: #fecaca; color: var(--bad); }
#root .xb.xb .xb-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
#root .xb.xb .xb-stats > div { background: var(--sky-50); border-radius: 10px; padding: 8px 10px; display: grid; }
#root .xb.xb .xb-stats b { font-size: ${fs(18)}; font-weight: 900; color: #0f172a; }
#root .xb.xb .xb-stats span { font-size: ${fs(12)}; color: var(--ink-3); font-weight: 700; }

/* photo modes */
#root .xb.xb .xb-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
#root .xb.xb .xb-mode { display: grid; gap: 2px; text-align: start; border: 1px solid var(--line-2); background: #fff; border-radius: 12px;
  padding: 10px; cursor: pointer; }
#root .xb.xb .xb-mode:hover { border-color: var(--sky); background: var(--sky-50); }
#root .xb.xb .xb-mode.is-on { border: 2px solid var(--sky); background: var(--sky-50); padding: 9px; }
#root .xb.xb .xb-mode-ico { font-size: ${fs(20)}; line-height: 1; }
#root .xb.xb .xb-mode-lbl { font-size: ${fs(14)}; font-weight: 900; color: var(--ink); }
#root .xb.xb .xb-mode.is-on .xb-mode-lbl { color: var(--sky-d); }
#root .xb.xb .xb-mode-hint { font-size: ${fs(11.5)}; color: var(--ink-3); line-height: 1.45; }
#root .xb.xb .xb-sub-lbl { font-size: ${fs(12.5)}; font-weight: 800; color: var(--ink-2); margin: 12px 0 6px; }
#root .xb.xb .xb-seg-3 { grid-template-columns: repeat(3, 1fr); }
#root .xb.xb .xb-seg-hint { display: block; font-size: ${fs(11)}; color: var(--ink-3); font-weight: 600; }
#root .xb.xb .xb-cam { margin-inline-start: auto; flex: none; border: 1px solid var(--line-2); background: #fff; border-radius: 8px;
  width: 30px; height: 26px; cursor: pointer; font-size: ${fs(13)}; filter: grayscale(1); opacity: .45; }
#root .xb.xb .xb-cam.is-on { filter: none; opacity: 1; border-color: var(--sky); background: var(--sky-50); }
#root .xb.xb .xb-ask { margin-top: 12px; border: 1px solid #fde68a; background: var(--warn-bg); border-radius: 12px; padding: 12px; }
#root .xb.xb .xb-ask-title { font-size: ${fs(14)}; font-weight: 900; color: var(--warn); }
#root .xb.xb .xb-ask-body { font-size: ${fs(13)}; color: var(--ink); line-height: 1.7; margin: 6px 0 10px; }
#root .xb.xb .xb-ask-btns { display: grid; gap: 6px; }
#root .xb.xb .xb-btn-sm { margin-top: 0; padding: 9px 12px; font-size: ${fs(13.5)}; box-shadow: none; }

/* details + log */
#root .xb.xb .xb-details summary { cursor: pointer; list-style: none; margin-bottom: 0; }
#root .xb.xb .xb-details summary::-webkit-details-marker { display: none; }
#root .xb.xb .xb-details summary::after { content: "◂"; float: left; color: var(--ink-3); font-size: ${fs(12)}; }
#root .xb.xb .xb-details[open] summary { margin-bottom: 8px; }
#root .xb.xb .xb-details[open] summary::after { content: "▾"; }
#root .xb.xb .xb-log { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
#root .xb.xb .xb-log li { border-inline-start: 3px solid var(--sky-200); padding: 2px 10px; }
#root .xb.xb .xb-log-top { display: flex; gap: 6px; align-items: center; }
#root .xb.xb .xb-log-when { font-size: ${fs(13)}; font-weight: 800; color: var(--ink); }
#root .xb.xb .xb-log-who { font-size: ${fs(12)}; color: var(--sky-d); font-weight: 700; }
#root .xb.xb .xb-log-what { font-size: ${fs(12)}; color: var(--ink-3); }
#root .xb.xb .xb-tag { font-size: ${fs(11)}; font-weight: 800; border-radius: 999px; padding: 1px 8px; }
#root .xb.xb .xb-tag.is-warn { background: var(--warn-bg); color: var(--warn); }

@media (max-width: 560px) {
  #root .xb.xb .xb-head { padding: 16px; }
  #root .xb.xb .xb-title { font-size: ${fs(21)}; }
  #root .xb.xb .xb-branches { grid-template-columns: minmax(0, 1fr); }
  #root .xb.xb .xb-card-meter { display: none; }
}
`;
