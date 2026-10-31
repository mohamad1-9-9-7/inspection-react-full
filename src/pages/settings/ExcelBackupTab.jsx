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
} from "./_shared/backupPhotos";
import { auditBranchOf } from "./excel-exporters/internal_multi_audit";
import {
  fetchProductCatalog, fetchAccounts, fetchAuditTrail,
  addProductsSheet, addAccountsSheet, addAuditSheet,
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
      await exporter(wb, rec, { branchLabel, typeKey, typeLabel, sheetName: name, blankForm, images: opts.images || null });
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
  const [withPhotos, setWithPhotos] = useState(false);
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

      for (const item of work) {
        checkAbort();
        const { branch, card, typeKey, typeLabel, segments, fileBase } = item;
        step++;
        setProgress({ current: step, total: work.length, label: `${card.label} ← ${branch.label} ← ${typeLabel}` });

        const atStep = step;
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
        const records = isMawashi ? sortByDate(filtered) : filtered;
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
        /* تقارير التفتيش دايماً مع صورها؛ الباقي لما ينطلب. */
        const wantPhotos = isMawashi && (card.id === "inspector" || withPhotos);
        const exporter = getExporter(typeKey);

        /* Writes one workbook (+ its photos folder) and its INDEX line.
           Awaited inside this same iteration, so the shared counters it bumps
           are never raced. */
        // eslint-disable-next-line no-loop-func
        const writeOne = async (recs, segs, fileName, { monthLabel = "", embed = false } = {}) => {
          checkAbort();
          const folder = folderFor(zip, segs, folderCache);
          /* embed: the photos go INSIDE the sheet, in the exporter's photo
             column — no side folder, no Photos sheet. */
          let images = null;
          if (embed) {
            const urls = recs.flatMap((r) => collectPhotoUrls(r).map((x) => x.url));
            if (urls.length) {
              images = await fetchEmbeddableImages(urls, {
                signal,
                onProgress: (done, total) => setProgress({
                  current: atStep, total: work.length, label: `📷 ${typeLabel} — ${monthLabel} — صور ${done}/${total}`,
                }),
              });
              photosSaved += images.size;
              photosFailed += new Set(urls).size - images.size;
            }
          }
          const photoCounts = wantPhotos && !embed ? recs.map((r) => collectPhotoUrls(r).length) : null;
          const hasPhotos = !!photoCounts && photoCounts.some((n) => n > 0);
          let photoIndex = null;
          if (hasPhotos && exporter.collection) {
            let row = 3; // the Photos sheet: title row, header row, then one line per photo
            photoIndex = photoCounts.map((n) => { const at = { count: n, row }; row += n; return at; });
          }
          const before = retKind
            ? (wb) => addReturnsMonthSheets(wb, recs, { kind: retKind, monthLabel: monthLabel || filterLabel(filter) })
            : null;
          const wb = await buildWorkbook(ExcelJS, branch.label, typeKey, typeLabel, recs, {
            brand, tenantBrand, enhance: isMawashi, before, photoIndex, images,
          });

          if (hasPhotos) {
            const stem = fileName.replace(/\.xlsx$/i, "");
            const dirName = `${stem.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/_+/g, "_").slice(0, 70)}_photos`;
            const res = await downloadRecordPhotos(recs, {
              zipFolder: folder,
              dirName,
              dateOf: recordDate,
              refOf: (r) => getRefNo(r, typeKey),
              signal,
              onProgress: (done, total) => setProgress({
                current: atStep, total: work.length, label: `📷 ${typeLabel} — صور ${done}/${total}`,
              }),
            });
            addPhotosSheet(wb, res.entries);
            relinkToLocal(wb, res.localByUrl);
            photosSaved += res.localByUrl.size;
            photosFailed += res.failed;
          }

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
            await writeOne([rec], [...segments, fileBase, br], `${name}.xlsx`, { monthLabel: `${day} · ${br}`, embed: true });
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
            notes.push(`${label}: ما انحفظ (${e?.message || e}) — غالباً بدّو حساب مدير.`);
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
      setMsg({
        kind: cutTypes.length > 0 || windowWarning ? "err" : (heavyTypes.length > 0 ? "info" : "ok"),
        text: `✅ تم! ${filesCreated} ملف Excel · ${filesEmpty} فارغ · ${totalRows.toLocaleString()} سجل · ${manifest.length} ملف بالفهرس · ${(blob.size / 1048576).toFixed(1)} MB${filterNote}${skipNote}${photoNote}${tableNote}${pagedNote}${cutNote}${windowNote}${heavyNote}`,
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

  return (
    <div style={S.root}>
      {/* ═══ Hero ═══ */}
      <div style={S.hero}>
        <div style={S.heroLeft}>
          <div style={S.heroBadge}>📊  EXCEL BACKUP</div>
          <h1 style={S.heroTitle}>نسخ احتياطي مُصمَّم لكل تقرير</h1>
          <p style={S.heroSub}>
            كل تقرير في السيستم بيطلع صفحة Excel منفصلة بنفس تصميم صفحة العرض الأصلية.
            اختار الفروع والتقارير اللي بدك ياها بالتحديد، وحدّد يوم أو مدة معيّنة بدل التصدير الشامل.
          </p>
        </div>
        <div style={S.heroRight}>
          <div style={S.heroStat}>
            <div style={S.heroStatNum}>{pickedCount}</div>
            <div style={S.heroStatLbl}>تقرير مُختار</div>
          </div>
          <div style={S.heroStatDivider} />
          <div style={S.heroStat}>
            <div style={S.heroStatNum}>{totalTypes}</div>
            <div style={S.heroStatLbl}>إجمالي</div>
          </div>
        </div>
      </div>

      {/* ═══ تحذير نافذة الرؤية ═══ */}
      {windowWarning && (
        <div
          style={{
            margin: "0 0 14px",
            padding: "12px 16px",
            borderRadius: 12,
            border: "1px solid #fca5a5",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            fontWeight: 600,
          }}
        >
          {windowWarning}
        </div>
      )}

      {/* ═══ سجل النسخ (Al Mawashi) ═══ */}
      {isMawashi && backupLog && (() => {
        const last = backupLog[0];
        const age = last ? daysSince(last.at) : Infinity;
        const stale = age > BACKUP_STALE_DAYS;
        const fmt = (iso) => {
          try { return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Dubai", dateStyle: "medium", timeStyle: "short" }); }
          catch { return String(iso || ""); }
        };
        return (
          <div style={S.logCard(stale)}>
            <div style={S.logHead}>
              <span style={S.logTitle}>🗂️ سجل النسخ الاحتياطية</span>
              <span style={S.logState(stale)}>
                {!last
                  ? `⚠️ ما في ولا نسخة مسجّلة — خُد نسخة هلق`
                  : stale
                    ? `⚠️ آخر نسخة من ${age} يوم — صار لازم نسخة جديدة`
                    : `✅ آخر نسخة من ${age === 0 ? "اليوم" : `${age} يوم`}`}
              </span>
            </div>
            {backupLog.length > 0 && (
              <div style={S.logList}>
                {backupLog.slice(0, 6).map((b) => (
                  <div key={b.id || b.at} style={S.logRow}>
                    <span style={S.logWhen}>{fmt(b.at)}</span>
                    <span style={S.logWho}>{b.byName || b.by || "—"}</span>
                    <span style={S.logWhat}>
                      {b.filter || "—"} · {Number(b.files || 0).toLocaleString()} ملف · {Number(b.records || 0).toLocaleString()} سجل
                      {b.photos ? ` · 📷 ${b.photos}` : ""}
                      {b.sizeMB != null ? ` · ${b.sizeMB} MB` : ""}
                      {b.types && b.typesTotal ? ` · ${b.types}/${b.typesTotal} نوع` : ""}
                      {b.incomplete ? " · ⚠️ ناقصة" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ Toolbar ═══ */}
      <div style={S.toolbar}>
        <div style={S.search}>
          <span style={S.searchIco}>🔎</span>
          <input
            type="text"
            placeholder="ابحث عن نوع تقرير..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={S.searchInput}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} style={S.searchClear} title="مسح">✕</button>
          )}
        </div>
        <div style={S.toolbarBtns}>
          <button onClick={() => selectAll(true)}  style={S.btnGhost}>تحديد الكل</button>
          <button onClick={() => selectAll(false)} style={S.btnGhost}>إلغاء الكل</button>
          <button
            onClick={() => setExpandedBranches(new Set(treeBranches.map((b) => b.id)))}
            style={S.btnGhost}
          >
            توسيع
          </button>
          <button
            onClick={() => setExpandedBranches(new Set())}
            style={S.btnGhost}
          >
            طي
          </button>
        </div>
      </div>

      {/* ═══ Date filter ═══ */}
      <div style={S.filterCard(filterOn)}>
        <div style={S.filterHead}>
          <span style={S.filterTitle}>🗓️ فلترة حسب التاريخ</span>
          <span style={S.filterState(filterOn)}>{filterLabel(filter)}</span>
        </div>

        <div style={S.filterRow}>
          {[
            ["all", "كل التواريخ"],
            ["day", "يوم محدد"],
            ["range", "نطاق تاريخ"],
            ["months", "آخر عدة أشهر"],
          ].map(([m, lbl]) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={S.chip(filter.mode === m)}>
              {lbl}
            </button>
          ))}
        </div>

        {filter.mode === "day" && (
          <div style={S.filterRow}>
            <label style={S.fieldLbl}>التاريخ</label>
            <input
              type="date"
              value={filter.day}
              onChange={(e) => setFilter((f) => ({ ...f, day: e.target.value }))}
              style={S.dateInput}
            />
            <button type="button" onClick={() => setFilter((f) => ({ ...f, day: todayISO() }))} style={S.btnGhostSm}>
              اليوم
            </button>
          </div>
        )}

        {filter.mode === "range" && (
          <div style={S.filterRow}>
            <label style={S.fieldLbl}>من</label>
            <input
              type="date"
              value={filter.from}
              onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))}
              style={S.dateInput}
            />
            <label style={S.fieldLbl}>إلى</label>
            <input
              type="date"
              value={filter.to}
              onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))}
              style={S.dateInput}
            />
          </div>
        )}

        {filter.mode === "months" && (
          <div style={S.filterRow}>
            <label style={S.fieldLbl}>آخر</label>
            <input
              type="number"
              min="1"
              max="60"
              value={filter.months}
              onChange={(e) =>
                setFilter((f) => ({ ...f, months: Math.max(1, Math.min(60, Number(e.target.value) || 1)) }))
              }
              style={{ ...S.dateInput, width: 90 }}
            />
            <label style={S.fieldLbl}>شهر</label>
            {[1, 3, 6, 12].map((n) => (
              <button key={n} type="button" onClick={() => setFilter((f) => ({ ...f, months: n }))} style={S.chip(filter.months === n)}>
                {n}
              </button>
            ))}
          </div>
        )}

        <div style={S.filterRow}>
          {filterOn && (
            <label style={S.checkRow}>
              <input
                type="checkbox"
                checked={filter.includeUndated}
                onChange={(e) => setFilter((f) => ({ ...f, includeUndated: e.target.checked }))}
                style={S.checkBox}
              />
              <span>تضمين السجلات بدون تاريخ</span>
            </label>
          )}
          <label style={S.checkRow}>
            <input
              type="checkbox"
              checked={skipEmpty}
              onChange={(e) => setSkipEmpty(e.target.checked)}
              style={S.checkBox}
            />
            <span>تخطّي الملفات الفارغة (لا تنشئ ملف للتقارير بلا سجلات)</span>
          </label>
        </div>

        {isMawashi && (
          <div style={S.filterRow}>
            <label style={S.checkRow}>
              <input type="checkbox" checked={splitMonths} onChange={(e) => setSplitMonths(e.target.checked)} style={S.checkBox} />
              <span>📅 ملف لكل شهر — التقرير اللي بيغطي أكتر من شهر بيصير مجلد ← سنة ← ملف لكل شهر (المرتجعات دايماً هيك)</span>
            </label>
            <label style={S.checkRow}>
              <input type="checkbox" checked={withPhotos} onChange={(e) => setWithPhotos(e.target.checked)} style={S.checkBox} />
              <span>📷 إرفاق صور كل التقارير المختارة (تقارير التفتيش دايماً مع صورها) — بيكبّر حجم الـZIP</span>
            </label>
            <label style={S.checkRow}>
              <input type="checkbox" checked={includeTables} onChange={(e) => setIncludeTables(e.target.checked)} style={S.checkBox} />
              <span>🗄️ جداول قاعدة البيانات: المنتجات، الحسابات (بلا كلمات سر)، سجل التعديلات</span>
            </label>
          </div>
        )}
      </div>

      {/* ═══ Card → branch → group tree ═══
           نفس شجرة المجلدات اللي بتطلع بالـZIP، فاللي بيختار من هون بيعرف
           سلفاً وين رح يلاقي الملف. */}
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

        return (
          <section key={card.id} style={S.cardSection}>
            <div style={S.cardHead}>
              <span style={S.cardEmoji}>{card.emoji}</span>
              <h2 style={S.cardTitle}>{card.label}</h2>
              <span style={S.cardMeta}>{cardPicked}/{cardTotal} نوع · {branches.length} مجلد</span>
              <span style={S.cardRule} aria-hidden="true" />
              <button
                type="button"
                onClick={() => toggleCardAll(branches)}
                style={S.cardTogAll(cardPicked === cardTotal)}
              >
                {cardPicked === cardTotal ? "إلغاء الكرت" : "تحديد الكرت"}
              </button>
            </div>

            <div style={S.branchGrid}>
              {cardBranches.map(({ branch, visibleTypes }) => {
                const expanded = expandedBranches.has(branch.id);
                const count = branchPickedCount(branch);
                const total = branch.types.length;
                const allOn = count === total;
                const someOn = count > 0 && count < total;
                const groups = groupsOfBranch(branch);

                return (
                  <div key={`${card.id}:${branch.id}`} style={S.branchCard(branch.accent, count > 0)}>
                    {/* Branch header */}
                    <div style={S.branchHead}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(branch.id)}
                        style={S.branchHeadLeft}
                        title={expanded ? "طي" : "توسيع"}
                      >
                        <span style={S.branchEmoji}>{branch.emoji}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={S.branchName(branch.accent)}>{branch.label}</div>
                          <div style={S.branchCount}>
                            {count}/{total} نوع
                          </div>
                        </div>
                        <span style={S.branchChev}>{expanded ? "▾" : "▸"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleBranchAll(branch)}
                        style={S.branchTogAll(allOn, someOn, branch.accent)}
                        title={allOn ? "إلغاء كل تقارير الفرع" : "تحديد كل تقارير الفرع"}
                      >
                        {allOn ? "✓" : someOn ? "—" : ""}
                      </button>
                    </div>

                    {/* Types list (collapsible), split by the same groups the
                        ZIP turns into sub-folders. */}
                    {expanded && (
                      <div style={S.typeList}>
                        {["", ...groups].map((g) => {
                          const inGroup = visibleTypes.filter(([, , tg]) => (tg || "") === g);
                          if (!inGroup.length) return null;
                          return (
                            <div key={g || "__root"}>
                              {g && <div style={S.groupHead}>{g}</div>}
                              {inGroup.map(([k, lbl]) => {
                                const on = isPicked(branch.id, k);
                                return (
                                  <label key={k} style={S.typeRow(on, branch.accent)}>
                                    {/* hidden native checkbox for accessibility */}
                                    <input
                                      type="checkbox"
                                      checked={on}
                                      onChange={() => togglePicked(branch.id, k)}
                                      style={S.typeChkHidden}
                                    />
                                    <span style={S.typeLbl}>{lbl}</span>
                                    {/* custom visible checkbox */}
                                    <span style={S.typeChkBox(on, branch.accent)}>
                                      {on && "✓"}
                                    </span>
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

      {/* ═══ Blank forms ═══ */}
      <div style={S.blankCard}>
        <div style={S.blankHead}>
          <span style={S.blankTitle}>📄 نماذج فارغة للطباعة</span>
          <span style={S.blankSub}>
            نفس شجرة المجلدات، بس كل ملف نموذج فاضي بترويسته وأعمدته وأسئلته — بلا بيانات.
          </span>
        </div>
        <div style={S.filterRow}>
          <label style={S.fieldLbl}>أسطر فارغة لكل نموذج</label>
          <input
            type="number"
            min="1"
            max="60"
            value={blankRows}
            onChange={(e) => setBlankRows(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
            style={{ ...S.dateInput, width: 90 }}
          />
          {[10, 15, 25, 40].map((n) => (
            <button key={n} type="button" onClick={() => setBlankRows(n)} style={S.chip(blankRows === n)}>
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBlankForms}
            disabled={busy || pickedCount === 0}
            style={S.btnBlank(busy, pickedCount === 0)}
          >
            📄 تحميل النماذج الفارغة · {pickedCount}
          </button>
        </div>
      </div>

      {/* ═══ Action bar (sticky bottom) ═══ */}
      <div style={S.actionBar}>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || pickedCount === 0}
          style={S.btnGenerate(busy, pickedCount === 0)}
        >
          {busy
            ? `⏳  ${progress.current}/${progress.total} — ${pct}%`
            : `📥  إنشاء وتحميل ZIP   ·   ${pickedCount} ملف Excel`}
        </button>

        {busy && (
          <button type="button" onClick={cancelRun} style={S.btnCancel}>
            ⛔ إلغاء
          </button>
        )}

        {busy && (
          <div style={S.progressBox}>
            <div style={S.progressTrack}>
              <div style={S.progressBar(pct)} />
            </div>
            {progress.label && <div style={S.progressLabel}>{progress.label}</div>}
          </div>
        )}
      </div>

      {/* ═══ Message ═══ */}
      {msg.text && <div style={S.msgBox(msg.kind)}>{msg.text}</div>}

      {/* ═══ Stats ═══ */}
      {stats && !busy && (
        <div style={S.statsGrid}>
          <Stat
            icon="✅"
            label={stats.mode === "blank" ? "نموذج فارغ" : "ملف بيانات"}
            value={stats.filesCreated} color="#16a34a" bg="#dcfce7"
          />
          <Stat
            icon="📭"
            label={stats.mode === "blank" ? "بلا سجل يُبنى عليه" : "ملف فارغ"}
            value={stats.filesEmpty} color="#92400e" bg="#fef3c7"
          />
          {stats.mode !== "blank" && (
            <Stat icon="📋" label="إجمالي السجلات" value={stats.totalRows.toLocaleString()} color="#1e40af" bg="#dbeafe" />
          )}
          <Stat icon="🏢" label="فرع"          value={stats.branches}    color="#7c3aed" bg="#ede9fe" />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color, bg }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${color}44`, borderRadius: 16, padding: "18px 22px" }}>
      <div style={{ fontSize: 26, lineHeight: 1 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 1000, color, marginTop: 8, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", marginTop: 6 }}>{label}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STYLES — wide cards, big font, clear checkboxes
   ═══════════════════════════════════════════════════════════════ */
const NAVY   = "#0b1f4d";
const SLATE  = "#475569";
const SLATE2 = "#64748b";
const BORDER = "#dde3ec";

const S = {
  root: {
    fontFamily: 'ui-sans-serif, "Segoe UI", Cairo, sans-serif',
    color: NAVY,
    direction: "rtl",
  },

  /* ── Hero ── */
  hero: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 24,
    alignItems: "center",
    padding: "28px 36px",
    background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #2d5a8e 100%)",
    color: "#fff",
    borderRadius: 20,
    marginBottom: 18,
    boxShadow: "0 18px 40px rgba(15,23,42,.22)",
  },
  heroLeft: { minWidth: 0 },
  heroBadge: {
    display: "inline-block",
    padding: "6px 16px",
    borderRadius: 999,
    background: "rgba(255,255,255,.15)",
    border: "1px solid rgba(255,255,255,.28)",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: ".16em",
    marginBottom: 12,
  },
  heroTitle: {
    margin: 0,
    fontSize: "1.9rem",
    fontWeight: 1000,
    lineHeight: 1.2,
  },
  heroSub: {
    margin: "10px 0 0",
    fontSize: 15,
    opacity: 0.85,
    lineHeight: 1.65,
    maxWidth: 720,
  },
  heroRight: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    padding: "18px 24px",
    background: "rgba(255,255,255,.09)",
    border: "1px solid rgba(255,255,255,.22)",
    borderRadius: 16,
  },
  heroStat: { textAlign: "center", minWidth: 80 },
  heroStatNum: { fontSize: "2.4rem", fontWeight: 1000, lineHeight: 1, color: "#fff" },
  heroStatLbl: { fontSize: 13, fontWeight: 700, opacity: 0.8, marginTop: 5 },
  heroStatDivider: { width: 1, height: 44, background: "rgba(255,255,255,.28)" },

  /* ── Toolbar ── */
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: "14px 18px",
    background: "#fff",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 16,
    marginBottom: 14,
    boxShadow: "0 3px 10px rgba(2,6,23,.06)",
  },
  search: {
    flex: "1 1 300px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#f6f8fb",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 12,
    padding: "0 16px",
    height: 46,
  },
  searchIco: { fontSize: 17, color: SLATE2 },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "inherit",
    color: NAVY,
    height: "100%",
  },
  searchClear: {
    background: "#e2e8f0",
    color: NAVY,
    border: "none",
    borderRadius: 999,
    width: 24,
    height: 24,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    display: "grid",
    placeItems: "center",
  },
  toolbarBtns: { display: "flex", gap: 8, flexWrap: "wrap" },
  btnGhost: {
    background: "#f1f5f9",
    color: NAVY,
    border: `1.5px solid ${BORDER}`,
    padding: "10px 20px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 14,
    fontFamily: "inherit",
    transition: "all .12s",
  },

  /* ── Date filter ── */
  filterCard: (on) => ({
    background: "#fff",
    border: `2px solid ${on ? "#2d5a8e" : BORDER}`,
    borderRadius: 16,
    padding: "14px 18px",
    marginBottom: 14,
    boxShadow: on ? "0 8px 22px rgba(45,90,142,.16)" : "0 3px 10px rgba(2,6,23,.06)",
  }),
  filterHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 10,
  },
  filterTitle: { fontSize: 16, fontWeight: 900, color: NAVY },
  filterState: (on) => ({
    fontSize: 14,
    fontWeight: 800,
    color: on ? "#1e3a5f" : SLATE2,
    background: on ? "#e6eff9" : "#f1f5f9",
    border: `1.5px solid ${on ? "#2d5a8e44" : BORDER}`,
    borderRadius: 999,
    padding: "5px 14px",
  }),
  filterRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    flexWrap: "wrap",
    marginTop: 9,
  },
  chip: (on) => ({
    padding: "9px 18px",
    borderRadius: 999,
    border: `1.5px solid ${on ? "#2d5a8e" : BORDER}`,
    background: on ? "linear-gradient(135deg,#1e3a5f,#2d5a8e)" : "#f6f8fb",
    color: on ? "#fff" : NAVY,
    fontWeight: 800,
    fontSize: 14,
    fontFamily: "inherit",
    cursor: "pointer",
    transition: "all .12s",
  }),
  fieldLbl: { fontSize: 14, fontWeight: 800, color: SLATE },
  dateInput: {
    padding: "9px 12px",
    border: `1.5px solid ${BORDER}`,
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    fontFamily: "inherit",
    color: NAVY,
    background: "#fff",
  },
  btnGhostSm: {
    background: "#f1f5f9",
    color: NAVY,
    border: `1.5px solid ${BORDER}`,
    padding: "8px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 13.5,
    fontFamily: "inherit",
  },
  checkRow: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    fontSize: 14,
    fontWeight: 700,
    color: SLATE,
    cursor: "pointer",
  },
  checkBox: { width: 19, height: 19, cursor: "pointer", accentColor: "#2d5a8e" },

  /* ── Branch grid — wider cards ── */
  /* ── Blank-forms panel ── */
  blankCard: {
    background: "#fffbeb",
    border: "2px solid #fcd34d",
    borderRadius: 18,
    padding: "18px 22px",
    marginBottom: 18,
  },
  blankHead: { marginBottom: 12 },
  blankTitle: { display: "block", fontSize: 17, fontWeight: 1000, color: "#78350f" },
  blankSub: { display: "block", fontSize: 13.5, fontWeight: 600, color: "#92400e", marginTop: 4, lineHeight: 1.7 },
  btnBlank: (busy, none) => ({
    marginInlineStart: "auto",
    padding: "11px 22px",
    borderRadius: 12,
    border: "none",
    background: busy || none ? "#e2e8f0" : "linear-gradient(135deg,#f59e0b,#d97706)",
    color: busy || none ? "#94a3b8" : "#fff",
    fontWeight: 1000,
    fontSize: 14.5,
    cursor: busy || none ? "not-allowed" : "pointer",
    boxShadow: busy || none ? "none" : "0 10px 24px rgba(217,119,6,.28)",
  }),

  /* ── Card section — one per dashboard tile, mirrors the top ZIP folder ── */
  cardSection: { marginBottom: 26 },
  cardHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "0 0 12px",
  },
  cardEmoji: { fontSize: 22, lineHeight: 1 },
  cardTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 1000,
    color: NAVY,
    whiteSpace: "nowrap",
  },
  cardMeta: {
    fontSize: 12.5,
    fontWeight: 800,
    color: SLATE2,
    background: "#f1f5f9",
    border: `1px solid ${BORDER}`,
    borderRadius: 999,
    padding: "3px 12px",
    whiteSpace: "nowrap",
  },
  cardRule: { flex: 1, height: 1, background: BORDER },
  cardTogAll: (allOn) => ({
    padding: "6px 14px",
    borderRadius: 999,
    border: `1.5px solid ${allOn ? "#16a34a" : BORDER}`,
    background: allOn ? "#dcfce7" : "#fff",
    color: allOn ? "#166534" : SLATE,
    fontWeight: 900,
    fontSize: 12.5,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }),
  groupHead: {
    fontSize: 12,
    fontWeight: 900,
    color: SLATE2,
    letterSpacing: ".04em",
    padding: "10px 4px 4px",
    borderBottom: `1px dashed ${BORDER}`,
    marginBottom: 4,
  },

  branchGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
    gap: 16,
    marginBottom: 4,
  },
  branchCard: (accent, hasSelection) => ({
    background: "#fff",
    border: `2px solid ${hasSelection ? accent : BORDER}`,
    borderRadius: 18,
    padding: 0,
    overflow: "hidden",
    boxShadow: hasSelection
      ? `0 10px 30px ${accent}28`
      : "0 2px 8px rgba(2,6,23,.06)",
    transition: "all .16s",
    display: "flex",
    flexDirection: "column",
  }),
  branchHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 20px",
    background: "#f6f8fb",
    borderBottom: `1.5px solid ${BORDER}`,
  },
  branchHeadLeft: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    color: NAVY,
    textAlign: "start",
    padding: 0,
  },
  branchEmoji: { fontSize: 30, flexShrink: 0 },
  branchName: () => ({
    fontWeight: 900,
    fontSize: 18,
    color: NAVY,
    lineHeight: 1.2,
  }),
  branchCount: { fontSize: 13, fontWeight: 700, color: SLATE2, marginTop: 3 },
  branchChev: { fontSize: 16, color: SLATE2, fontWeight: 900, marginLeft: 4 },

  /* ── Branch select-all toggle ── */
  branchTogAll: (allOn, someOn, accent) => ({
    width: 34, height: 34, borderRadius: 9,
    background: allOn ? accent : (someOn ? `${accent}22` : "#fff"),
    color: allOn ? "#fff" : (someOn ? accent : NAVY),
    border: `2px solid ${allOn || someOn ? accent : "#c8d0dc"}`,
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 16,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    transition: "all .14s",
  }),

  /* ── Type rows ── */
  typeList: {
    padding: "10px 10px",
    display: "flex",
    flexDirection: "column",
    gap: 5,
    maxHeight: 440,
    overflowY: "auto",
  },
  typeRow: (on, accent) => ({
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "13px 16px",
    borderRadius: 12,
    background: on ? `${accent}12` : "#fdfdfe",
    border: `1.5px solid ${on ? accent : "#e4e9f0"}`,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all .12s",
    minHeight: 52,
  }),
  typeChkHidden: {
    position: "absolute",
    opacity: 0,
    width: 0,
    height: 0,
    pointerEvents: "none",
  },
  typeLbl: {
    flex: 1,
    fontSize: 15,
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: 1.4,
  },
  typeChkBox: (on, accent) => ({
    width: 28, height: 28,
    borderRadius: 8,
    border: `2px solid ${on ? accent : "#c4cdd8"}`,
    background: on ? accent : "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all .13s",
    fontSize: 15,
    color: "#fff",
    fontWeight: 900,
    boxShadow: on ? `0 3px 10px ${accent}44` : "none",
  }),

  /* ── Action bar ── */
  actionBar: {
    position: "sticky",
    bottom: 0,
    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.85) 25%, #fff 50%)",
    paddingTop: 14,
    paddingBottom: 10,
    zIndex: 5,
    marginBottom: 14,
  },
  btnGenerate: (busy, disabled) => ({
    width: "100%",
    padding: "17px 24px",
    borderRadius: 16,
    border: "none",
    background: busy
      ? "#94a3b8"
      : disabled
        ? "#cbd5e1"
        : "linear-gradient(135deg, #0b1f4d 0%, #1e3a5f 50%, #2d5a8e 100%)",
    color: "#fff",
    fontWeight: 1000,
    fontSize: 16,
    fontFamily: "inherit",
    cursor: busy || disabled ? "not-allowed" : "pointer",
    boxShadow: busy || disabled ? "none" : "0 16px 32px rgba(11,31,77,.35)",
    transition: "all .2s",
    letterSpacing: ".03em",
  }),
  progressBox: { marginTop: 12 },
  btnCancel: {
    marginTop: 10, padding: "10px 22px", borderRadius: 12, cursor: "pointer",
    border: "1px solid #fca5a5", background: "#fef2f2", color: "#b91c1c",
    fontWeight: 800, fontSize: "0.95rem",
  },
  logCard: (stale) => ({
    margin: "0 0 14px", padding: "12px 16px", borderRadius: 14,
    border: `1px solid ${stale ? "#fcd34d" : "#bae6fd"}`,
    background: stale ? "#fffbeb" : "#f0f9ff",
  }),
  logHead: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" },
  logTitle: { fontWeight: 800, color: "#0f172a" },
  logState: (stale) => ({ fontWeight: 700, color: stale ? "#92400e" : "#0369a1" }),
  logList: { marginTop: 8, display: "grid", gap: 4 },
  logRow: { display: "flex", flexWrap: "wrap", gap: 10, fontSize: "0.85rem", color: "#334155" },
  logWhen: { fontWeight: 700, minWidth: 150 },
  logWho: { minWidth: 90, color: "#0f766e", fontWeight: 700 },
  logWhat: { flex: 1, minWidth: 200 },
  progressTrack: {
    height: 10, background: "#e2e8f0", borderRadius: 999, overflow: "hidden",
  },
  progressBar: (pct) => ({
    height: "100%", width: `${pct}%`,
    background: "linear-gradient(90deg, #1e3a5f, #2d5a8e, #7c3aed)",
    borderRadius: 999,
    transition: "width .3s ease",
  }),
  progressLabel: {
    fontSize: 13, color: SLATE, fontWeight: 700, marginTop: 7, textAlign: "center",
  },

  /* ── Message ── */
  msgBox: (kind) => ({
    borderRadius: 14,
    padding: "14px 20px",
    fontWeight: 800,
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 1.6,
    background: kind === "ok" ? "#f0fdf4" : kind === "err" ? "#fef2f2" : "#eff6ff",
    border: `1.5px solid ${kind === "ok" ? "#86efac" : kind === "err" ? "#fca5a5" : "#bfdbfe"}`,
    color:   kind === "ok" ? "#065f46" : kind === "err" ? "#991b1b" : "#1e40af",
  }),

  /* ── Stats ── */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
};
