// src/pages/settings/ExcelBackupTab.jsx
// 📊 Excel Backup — each report becomes one Excel sheet matching its view design.
//    Branches and individual report types are independently selectable.

import React, { useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { getExporter, exporterKindFor } from "./excel-exporters";
import {
  sheetNameFor, sanitizeSheetName, extractDate, formatDMY, linkifySheet,
} from "./excel-exporters/_lib";
import { pickTemplateRecord, makeBlankRecord, makeBlankRecordList } from "./excel-exporters/_blank_form";
import {
  BRANCHES, activeCards, branchesOfCard, groupsOfBranch,
} from "./reportTypeCatalog";
import { fetchAllOfType, visibilityWarningText } from "./_shared/reportBackupFetch";
import {
  buildWorkList, folderFor, manifestCsv, readmeText, blankReadmeText,
} from "./_shared/backupTree";

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

async function buildWorkbook(ExcelJS, branchLabel, typeKey, typeLabel, records, opts = {}) {
  const wb = new ExcelJS.Workbook();
  const brand = opts.brand || "Al Mawashi";
  wb.creator = opts.blankForm ? `${brand} — Blank Forms` : `${brand} — Excel Backup`;
  wb.created = new Date();

  const exporter = getExporter(typeKey);
  const blankForm = !!opts.blankForm;

  // Collection exporters (registers/logs) render ALL records into ONE sheet
  // that mirrors the on-screen table — call once with the full array.
  if (exporter.collection) {
    if (!records.length) { addEmptySheet(wb, typeLabel); return wb; }
    try {
      await exporter(wb, records, { branchLabel, typeKey, typeLabel, blankForm });
    } catch (e) {
      console.error(`Collection exporter failed for ${typeKey}:`, e);
      const ws = wb.addWorksheet(sanitizeSheetName(typeLabel), { views: [{ showGridLines: false }] });
      ws.getCell("A1").value = `⚠️ Failed to render this register: ${e?.message || e}`;
      ws.getCell("A1").font = { color: { argb: "B91C1C" } };
    }
    wb.worksheets.forEach((ws) => linkifySheet(ws)); // not point-free: forEach passes the index, which would land in maxRows
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
      await exporter(wb, rec, { branchLabel, typeKey, typeLabel, sheetName: name, blankForm });
    } catch (e) {
      console.error(`Exporter failed for ${typeKey} record ${i}:`, e);
      const ws = wb.addWorksheet(name, { views: [{ showGridLines: false }] });
      ws.getCell("A1").value = `⚠️ Failed to render this report: ${e?.message || e}`;
      ws.getCell("A1").font = { color: { argb: "B91C1C" } };
    }
  }
  wb.worksheets.forEach((ws) => linkifySheet(ws)); // not point-free: forEach passes the index, which would land in maxRows
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
  const scopeBranches = useMemo(
    () => (cardIds ? BRANCHES.filter((b) => cardIds.includes(b.card)) : BRANCHES),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardKey]
  );
  const scopeCards = useMemo(
    () => (cardIds ? activeCards().filter((c) => cardIds.includes(c.id)) : activeCards()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardKey]
  );
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
    () => scopeBranches.reduce((s, b) => s + b.types.length, 0),
    [scopeBranches]
  );
  const pickedCount = picked.size;
  const filterQ = query.trim().toLowerCase();

  /* نافذة الرؤية: حساب بلا صلاحية «history» بياخد آخر ٣٠ يوم لفروع POS وشهرين
     للمرتجعات — والقصّ بيصير مركزياً في authFetch.js، فبدون هالتحذير بتطلع نسخة
     ناقصة واسمها كاملة. منحسبها من الأنواع المختارة فعلياً. */
  const windowWarning = useMemo(() => {
    const types = [];
    scopeBranches.forEach((b) => b.types.forEach(([k]) => {
      if (picked.has(`${b.id}::${k}`)) types.push(k);
    }));
    return visibilityWarningText(types);
  }, [picked, scopeBranches]);

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
      scopeBranches.forEach((b) => b.types.forEach(([k]) => all.add(`${b.id}::${k}`)));
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

    try {
      const [JSZipModule, ExcelJSModule] = await Promise.all([
        import("jszip"),
        import("exceljs"),
      ]);
      const JSZip   = JSZipModule.default;
      const ExcelJS = ExcelJSModule.default || ExcelJSModule;
      const zip     = new JSZip();

      /* One work item per selected placement, already carrying the folder path
         it belongs in. Order follows the catalog, which follows the screens. */
      const work = buildWorkList(picked);

      let step = 0;
      let filesCreated = 0;
      let filesEmpty   = 0;
      let filesSkipped = 0;
      let totalRows    = 0;   // records that survived the date filter
      let totalFetched = 0;   // records returned by the server before filtering
      const folderCache = new Map();
      const fetchCache  = new Map(); // typeKey → page, so a type listed under two cards is read once
      const counted     = new Set(); // typeKeys already added to the record total
      const manifest    = [];
      const heavyTypes  = []; // types with 400+ records — warn user after export
      const pagedTypes  = []; // types that needed date-splitting to clear the 5000 cap
      const cutTypes    = []; // types where even one day exceeded the cap

      for (const item of work) {
        const { branch, card, typeKey, typeLabel, segments, fileBase } = item;
        step++;
        setProgress({ current: step, total: work.length, label: `${card.label} ← ${branch.label} ← ${typeLabel}` });

        const atStep = step;
        let page = fetchCache.get(typeKey);
        if (!page) {
          page = await fetchAllOfType(typeKey, {
            onProgress: ({ requests }) => {
              if (requests > 1) {
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
          if (page.paged) pagedTypes.push(`${typeLabel} (${page.requests} طلب)`);
          if (page.truncated) cutTypes.push(typeLabel);
        }
        const fetched = page.rows;
        const records = filterOn ? fetched.filter((r) => matchesFilter(r, filter)) : fetched;
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

        const folder = folderFor(zip, segments, folderCache);
        const wb = await buildWorkbook(ExcelJS, branch.label, typeKey, typeLabel, records, { brand });
        const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });

        const empty = records.length === 0;
        const fileName = empty ? `${fileBase} — empty.xlsx` : `${fileBase}.xlsx`;
        folder.file(fileName, buf);
        if (empty) filesEmpty++; else filesCreated++;

        const { firstDate, lastDate } = dateSpan(records);
        manifest.push({
          card: card.label,
          branch: branch.label,
          group: item.group,
          typeLabel,
          typeKey,
          count: records.length,
          firstDate,
          lastDate,
          kind: exporterKindFor(typeKey),
          path: [...segments, fileName].join("/"),
        });
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

      setProgress({ current: work.length, total: work.length, label: "🗜️ جارٍ ضغط الملفات..." });

      /* Index + readme at the ZIP root. Without them a 200-file archive is a
         pile of folders with no way to tell what is inside without opening
         each one, or to notice that a type came back empty. */
      const generatedAt = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" });
      const notes = [];
      if (cutTypes.length)   notes.push(`نسخة ناقصة (يوم فيه أكتر من 5000 سجل): ${cutTypes.join(" · ")}`);
      if (pagedTypes.length) notes.push(`انقسمت المدة لتجاوز السقف: ${pagedTypes.join(" · ")}`);
      if (filesSkipped)      notes.push(`${filesSkipped} نوع بلا سجلات — ما انعمله ملف.`);
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
      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      downloadBlob(blob, `${fileBrand}_Excel_Backup_${today}${filterSuffix(filter)}.zip`);

      setStats({ mode: "backup", filesCreated, filesEmpty, totalRows, branches: new Set(manifest.map((m) => m.branch)).size });
      const heavyNote = heavyTypes.length > 0
        ? `  ⚠️ تقارير ضخمة (${heavyTypes.length}): ${heavyTypes.join(" · ")}`
        : "";
      const filterNote = filterOn
        ? `  🗓️ الفلترة: ${filterLabel(filter)} — ${totalRows.toLocaleString()} من أصل ${totalFetched.toLocaleString()} سجل.`
        : "";
      const skipNote = filesSkipped > 0 ? `  ⏭️ ${filesSkipped} نوع بلا سجلات (ما انعمله ملف).` : "";
      const pagedNote = pagedTypes.length > 0
        ? `  📄 تعدّى سقف الـ5000 فانقسمت المدة: ${pagedTypes.join(" · ")}.`
        : "";
      const cutNote = cutTypes.length > 0
        ? `  ⛔ يوم واحد فيه أكتر من 5000 سجل — النسخة ناقصة لـ: ${cutTypes.join(" · ")}.`
        : "";
      const windowNote = windowWarning ? `  ${windowWarning}` : "";
      setMsg({
        kind: cutTypes.length > 0 || windowWarning ? "err" : (heavyTypes.length > 0 ? "info" : "ok"),
        text: `✅ تم! ${filesCreated} ملف Excel · ${filesEmpty} فارغ · ${totalRows.toLocaleString()} سجل · ${manifest.length} ملف بالفهرس${filterNote}${skipNote}${pagedNote}${cutNote}${windowNote}${heavyNote}`,
      });
    } catch (e) {
      console.error(e);
      setMsg({ kind: "err", text: `❌ فشل الإنشاء: ${e?.message || e}` });
    } finally {
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
          ExcelJS, branch.label, typeKey, typeLabel, payload, { blankForm: true, brand }
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
      console.error(e);
      setMsg({ kind: "err", text: `❌ فشل إنشاء النماذج: ${e?.message || e}` });
    } finally {
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
            onClick={() => setExpandedBranches(new Set(scopeBranches.map((b) => b.id)))}
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
      </div>

      {/* ═══ Card → branch → group tree ═══
           نفس شجرة المجلدات اللي بتطلع بالـZIP، فاللي بيختار من هون بيعرف
           سلفاً وين رح يلاقي الملف. */}
      {scopeCards.map((card) => {
        const branches = branchesOfCard(card.id);
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
