// src/pages/BrowseReturns.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  FiSearch, FiX, FiDownload, FiPrinter, FiRefreshCw, FiLock, FiMail,
  FiChevronDown, FiChevronRight, FiEye, FiSliders, FiBarChart2,
  FiCalendar, FiGrid, FiList, FiBookmark, FiTrendingUp, FiTrendingDown,
  FiCheck, FiInfo, FiActivity, FiPieChart, FiSave, FiTrash2,
  FiArrowRight, FiCopy, FiLayers, FiAlertTriangle, FiFileText,
  FiFilter, FiColumns, FiZap, FiHelpCircle, FiPackage, FiClock,
  FiTarget, FiChevronLeft, FiChevronsUp, FiChevronsDown,
} from "react-icons/fi";
import EmailSendModal from "./shared/EmailSendModal";
import { escapeHtml } from "./shared/emailReportUtils";
import { MAWASHI_LOGO_B64 } from "../assets/mawashi-logo-b64";
import { arrangeItems, GROUP_LABEL } from "./shared/itemSortGroup";
import { getRefNo, isPendingRef } from "../utils/reportRef";

/* Left date-tree panel: remember whether the user folded it away (UI preference only). */
const TREE_HIDDEN_KEY = "browseReturns.treeHidden";

/* ============================================================
   API
   ============================================================ */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  // The server defaults to LIMIT 200 (most-recent first). Without an explicit
  // limit, older months (e.g. Sep 2025) get truncated and never reach the page.
  // 5000 is the server's max clamp — enough for years of daily returns.
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=5000`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch " + type);
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data ?? [];
}

/* ============================================================
   Helpers — date / branch / action / qty
   ============================================================ */
/* Default opening lines of the emailed report. {date} is resolved by the send
   modal (EmailSendModal → applyTemplateVars); an email template can replace
   these lines entirely. */
const DEFAULT_INTRO = "Dear Team,\n\nPlease find attached the Daily Returns Report for {date}.";

function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x))
    return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function bestTs(rec) {
  return (
    toTs(rec?.createdAt) || toTs(rec?.updatedAt) || toTs(rec?.timestamp) ||
    toTs(rec?._id) || toTs(rec?.payload?._clientSavedAt) || 0
  );
}
function normalizeReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec) => {
      const payload = rec?.payload || {};
      const refNo = getRefNo(rec, "returns");
      return {
        ts: bestTs(rec),
        reportDate: payload.reportDate || rec?.reportDate || "",
        refNo,
        /* Reference carried per row so `ref:` search works across days */
        items: Array.isArray(payload.items)
          ? payload.items.map((it) => ({ ...it, refNo }))
          : [],
      };
    })
    .filter((e) => e.reportDate);
  const byDate = new Map();
  for (const e of entries) {
    const prev = byDate.get(e.reportDate);
    if (!prev || e.ts > prev.ts) byDate.set(e.reportDate, e);
  }
  return Array.from(byDate.values());
}

function isOtherBranch(val) {
  const s = String(val || "").toLowerCase();
  return s.includes("other branch") || s.includes("فرع آخر");
}
// Old data sometimes stored the branch as a bare number (e.g. "47" / "48").
// Normalize any bare-number branch to its "POS <n>" form for display/filtering.
function normalizeBranch(val) {
  const s = String(val ?? "").trim();
  if (/^\d+$/.test(s)) return `POS ${s}`;
  return s;
}
function safeButchery(row) {
  return isOtherBranch(row?.butchery)
    ? row?.customButchery || ""
    : normalizeBranch(row?.butchery);
}
function actionText(row) {
  return row?.action === "إجراء آخر..." || row?.action === "Other..."
    ? row?.customAction || ""
    : row?.action || "";
}
function itemKey(row) {
  return [
    (row?.itemCode || "").trim().toLowerCase(),
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}
function formatChangeDate(ch) {
  const t = ch?.ts || toTs(ch?.at);
  if (!t) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(t));
  } catch {
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
}
function formatChangeDatePDF(ch) {
  const t = ch?.ts || toTs(ch?.at);
  if (!t) return "";
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}
function isCondemnation(s) { return (s ?? "").toString().trim().toLowerCase() === "condemnation"; }
function isSendToMarket(s) { return (s ?? "").toString().trim().toLowerCase() === "send to market"; }
function isDisposed(s) {
  const v = (s ?? "").toString().trim().toLowerCase();
  return v === "disposed" || v === "desposed";
}
function isKgType(t) {
  const s = (t || "").toString().toLowerCase();
  return s.includes("kg") || s.includes("كيلو") || s.includes("كجم");
}
function isPcsType(t) {
  const s = (t || "").toString().toLowerCase();
  return s.includes("pcs") || s.includes("قطعة") || s.includes("حبة") || s.includes("pc");
}
function isPlateType(t) {
  return (t || "").toString().toLowerCase().includes("plate");
}
/* The unit as displayed: an "Other" row carries its real unit in customQtyType. */
function effectiveQtyType(row) {
  const t = row?.qtyType || "";
  return t === "أخرى" || t === "أخرى / Other" ? row?.customQtyType || "" : t;
}
function qtyKind(row) {
  const t = effectiveQtyType(row);
  if (isKgType(t)) return "kg";
  if (isPcsType(t)) return "pcs";
  if (isPlateType(t)) return "plate";
  return "other";
}
function fmtNum(n, digits = 2) {
  if (n == null || isNaN(n)) return "0";
  const v = Math.round(Number(n) * Math.pow(10, digits)) / Math.pow(10, digits);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
/* Weights in a summed column always carry both decimals — a column mixing
   "106" and "75.52" reads as sloppy data in a management pack. */
/* One decimal unless the rate is whole — printing "100%" for 1010/1011 makes an
   outlier look identical to a branch that really is at 100%. */
function fmtRate(n) {
  const v = Number(n) || 0;
  if (Number.isInteger(v)) return `${v}%`;
  let s = v.toFixed(1);
  /* Never let rounding invent a perfect score, or erase a real one: 99.95%
     must not print as 100%, and 0.04% must not print as 0%. */
  if (Number(s) >= 100 && v < 100) s = "99.9";
  if (Number(s) <= 0 && v > 0) s = "0.1";
  return `${s}%`;
}
function fmtKg(n) {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return "0%";
  return `${Math.round(Number(n))}%`;
}
/* "2026-08-09" → "09 Aug 2026". */
function fmtDayLong(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return String(iso || "");
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
/* "2026-07" → "July 2026" (used by the Periodic Report). */
function monthLabel(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return String(monthKey || "");
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}
/* Shift a "YYYY-MM" key by `delta` months. */
function addMonthKey(monthKey, delta) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  const d = new Date(y, (m - 1) + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
/* Human range label: same month → "July 2026"; else "May – Jul 2026" (adds the
   start year too when the window spans two calendar years). */
function rangeLabel(fromKey, toKey) {
  if (fromKey === toKey) return monthLabel(toKey);
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);
  const optsFrom = { month: "short", ...(fy !== ty ? { year: "numeric" } : {}) };
  const from = new Date(fy, fm - 1, 1).toLocaleDateString("en-GB", optsFrom);
  const to = new Date(ty, tm - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return `${from} – ${to}`;
}
/* Report period presets. `months` = window length ending at the chosen anchor month. */
const REPORT_PERIODS = [
  { key: "monthly", months: 1,  en: "Monthly (current)",     ar: "شهري (شهر واحد)",       reportTitle: "Monthly Returns Report",    cover: "MONTHLY RETURNS",   fileTag: "Monthly" },
  { key: "quarter", months: 3,  en: "Quarterly (3 months)",  ar: "ربع سنوي (3 شهور)",     reportTitle: "Quarterly Returns Report",  cover: "QUARTERLY RETURNS", fileTag: "Quarter" },
  { key: "half",    months: 6,  en: "Half-Year (6 months)",  ar: "نصف سنوي (6 شهور)",     reportTitle: "Half-Year Returns Report",  cover: "HALF-YEAR RETURNS", fileTag: "HalfYear" },
  { key: "nine",    months: 9,  en: "Nine-Month (9 months)", ar: "تسعة شهور",              reportTitle: "Nine-Month Returns Report", cover: "NINE-MONTH RETURNS", fileTag: "9Month" },
  { key: "yearly",  months: 12, en: "Annual (12 months)",    ar: "سنوي (12 شهر)",         reportTitle: "Annual Returns Report",     cover: "ANNUAL RETURNS",    fileTag: "Annual" },
];

/* ── Report-builder UI strings. The POPUP is bilingual; the PDF stays English
   because jsPDF's built-in helvetica cannot render Arabic glyphs. ── */
const RB = {
  title:        { en: "Returns Report Builder", ar: "منشئ تقرير المرتجعات" },
  subtitle:     { en: "Choose the period, narrow the scope, pick the sections, sign it off",
                  ar: "اختر الفترة، حدّد النطاق، اختر الأقسام، ثم الاعتماد" },
  navPreset:    { en: "Presets",        ar: "قوالب جاهزة" },
  navPresetSub: { en: "Start from a template", ar: "ابدأ من قالب" },
  navScope:     { en: "Period & Scope", ar: "الفترة والنطاق" },
  navScopeSub:  { en: "What data goes in", ar: "أي بيانات تدخل" },
  navSections:  { en: "Sections",       ar: "الأقسام" },
  navAnalysis:  { en: "Analysis",       ar: "التحليل" },
  navAnalysisSub:{ en: "Depth & metrics", ar: "العمق والمقاييس" },
  navDoc:       { en: "Document",       ar: "الوثيقة" },
  navDocSub:    { en: "Title, ref, sign-off", ar: "العنوان والمرجع والاعتماد" },
  on:           { en: "on",             ar: "مفعّل" },

  presetTitle:  { en: "Start from a template", ar: "ابدأ من قالب جاهز" },
  presetNote:   { en: "A preset only sets which sections are included — your scope and document details stay put.",
                  ar: "القالب يحدّد الأقسام فقط — النطاق وتفاصيل الوثيقة تبقى كما هي." },
  sectionsWord: { en: "sections",       ar: "أقسام" },

  reportType:   { en: "Report type",    ar: "نوع التقرير" },
  month:        { en: "Month",          ar: "الشهر" },
  endingMonth:  { en: "Ending month",   ar: "شهر النهاية" },
  noData:       { en: "No returns data available yet.", ar: "لا توجد بيانات مرتجعات بعد." },
  covers:       { en: "Covers",         ar: "يغطي" },
  monthsWord:   { en: "months",         ar: "شهور" },
  monthWord:    { en: "month",          ar: "شهر" },
  itemsWord:    { en: "items",          ar: "صنف" },

  fBranches:    { en: "Branches (POS)", ar: "الفروع (POS)" },
  fProducts:    { en: "Products",       ar: "المنتجات" },
  fOrigins:     { en: "Origins",        ar: "المناشئ" },
  fActions:     { en: "Dispositions",   ar: "القرارات" },
  allWord:      { en: "All",            ar: "الكل" },
  selectedWord: { en: "selected",       ar: "محدّد" },
  filterPh:     { en: "Filter…",        ar: "بحث…" },
  noMatches:    { en: "No matches.",    ar: "لا توجد نتائج." },
  clearWord:    { en: "Clear",          ar: "مسح" },

  unit:         { en: "Unit",           ar: "الوحدة" },
  unitAll:      { en: "All units",      ar: "كل الوحدات" },
  unitKg:       { en: "Kilograms only", ar: "كيلوغرام فقط" },
  unitPcs:      { en: "Pieces only",    ar: "قطع فقط" },
  minQty:       { en: "Minimum qty",    ar: "أقل كمية" },
  anyPh:        { en: "any",            ar: "أي" },
  condOnly:     { en: "Condemned items only", ar: "الأصناف المُعدَمة فقط" },

  /* Condemnation leaderboard — pick products off the ranked list instead of
     hunting for them in the alphabetical facet picker. */
  cpTitle:      { en: "Top condemned products in this period", ar: "أعلى المنتجات إعداماً في هذه الفترة" },
  cpNote:       { en: "Tick what you want — this sets the Products filter above, so the whole report narrows to your picks.",
                  ar: "علّم ما تريده — هذا يضبط فلتر «المنتجات» أعلاه، فينحصر التقرير كله بما اخترته." },
  cpTop:        { en: "Top {n}",        ar: "أعلى {n}" },
  cpNone:       { en: "No condemned items in this period and scope.", ar: "لا توجد أصناف مُعدَمة في هذه الفترة والنطاق." },
  cpShowing:    { en: "Showing {n} of {t} condemned products", ar: "عرض {n} من أصل {t} منتج مُعدَم" },
  cpShowAll:    { en: "Show all",       ar: "عرض الكل" },
  cpShowLess:   { en: "Show less",      ar: "عرض أقل" },
  cpCond:       { en: "condemned",      ar: "مُعدَم" },
  cpOfCond:     { en: "of all condemned", ar: "من إجمالي الإعدام" },
  cpRate:       { en: "rate",           ar: "المعدل" },
  cpPicked:     { en: "{n} product(s) selected", ar: "{n} منتج محدّد" },
  cpNotInList:  { en: "Selections made elsewhere are kept.", ar: "الاختيارات من القائمة الأخرى محفوظة." },

  cvPartial:    { en: "Incomplete month — data only to {d} ({a} of {b} days). Volumes for {m} are part-month figures.",
                  ar: "شهر غير مكتمل — البيانات حتى {d} فقط ({a} من {b} يوماً). أرقام {m} تمثّل جزءاً من الشهر." },
  cvFull:       { en: "Complete month — data to {d}.", ar: "شهر مكتمل — البيانات حتى {d}." },

  sectionsTitle:{ en: "Sections to include", ar: "الأقسام المطلوب تضمينها" },
  selectAll:    { en: "Select all",     ar: "تحديد الكل" },
  clearAll:     { en: "Clear all",      ar: "إلغاء الكل" },
  grpCore:      { en: "Core",           ar: "أساسي" },
  grpAnalysis:  { en: "Analysis",       ar: "تحليلي" },
  grpAnnex:     { en: "Annex",          ar: "ملاحق" },

  analysisTitle:{ en: "How the analysis is computed", ar: "كيف يُحتسب التحليل" },
  analysisNote: { en: "These change the numbers themselves, not just the layout.",
                  ar: "هذه الخيارات تغيّر الأرقام نفسها، وليس الشكل فقط." },
  rankBy:       { en: "Rank “top” by",  ar: "رتّب «الأعلى» حسب" },
  rankByNote:   { en: "“Most returned” by count answers an ops question; by weight answers a financial one.",
                  ar: "«الأكثر إرجاعاً» بالعدد سؤال تشغيلي، وبالوزن سؤال مالي." },
  rankDepth:    { en: "Ranking depth",  ar: "عمق الترتيب" },
  topWord:      { en: "Top",            ar: "أعلى" },
  baseline:     { en: "Comparison baseline", ar: "أساس المقارنة" },
  basePrev:     { en: "Previous period", ar: "الفترة السابقة" },
  baseYoy:      { en: "Same period last year", ar: "نفس الفترة العام الماضي" },
  repeatThr:    { en: "Repeat offender threshold", ar: "عتبة التكرار" },
  repeatOpt:    { en: "Returned on {n}+ separate days", ar: "رجع في {n} أيام منفصلة أو أكثر" },
  annexCap:     { en: "Line-item annex cap", ar: "سقف ملحق الأصناف" },
  rowsWord:     { en: "rows",           ar: "صف" },
  capFits:      { en: "The whole scope fits inside this cap.", ar: "كامل النطاق يدخل ضمن هذا السقف." },
  capCut:       { en: "Scope has {a} items — {b} would be cut.", ar: "النطاق فيه {a} صنف — سيُقتطع {b}." },

  docTitle:     { en: "Report title",   ar: "عنوان التقرير" },
  docRef:       { en: "Reference no.",  ar: "الرقم المرجعي" },
  docClass:     { en: "Classification", ar: "التصنيف" },
  docPrep:      { en: "Prepared by",    ar: "أُعدّ بواسطة" },
  docRev:       { en: "Reviewed by",    ar: "روجع بواسطة" },
  docApp:       { en: "Approved by",    ar: "اعتُمد بواسطة" },
  docNotes:     { en: "Executive commentary", ar: "التعليق التنفيذي" },
  docNotesSub:  { en: "(printed under Key Metrics)", ar: "(يُطبع تحت المقاييس الرئيسية)" },
  docNotesPh:   { en: "Context, root causes, actions agreed…", ar: "السياق، الأسباب الجذرية، الإجراءات المتفق عليها…" },
  docFoot:      { en: "Reference no. and classification are stamped in the footer of every page. Signatures appear on the sign-off page (enable it under Sections).",
                  ar: "الرقم المرجعي والتصنيف يُطبعان في تذييل كل صفحة. التواقيع تظهر في صفحة الاعتماد (فعّلها من الأقسام)." },

  outline:      { en: "Document outline", ar: "مخطط الوثيقة" },
  outlineEmpty: { en: "No sections selected — the PDF would be empty.", ar: "لم تُحدَّد أي أقسام — الملف سيكون فارغاً." },
  rankedBy:     { en: "Ranked by",      ar: "مرتّب حسب" },
  baselineWord: { en: "Baseline",       ar: "الأساس" },
  scopeActive:  { en: "scope filters active", ar: "فلاتر نطاق مفعّلة" },

  fLineItems:   { en: "line items",     ar: "صنف" },
  across:       { en: "across",         ar: "على مدى" },
  daysWord:     { en: "days",           ar: "يوم" },
  msgNoData:    { en: "No returns recorded in this period — choose another month or a longer report type.",
                  ar: "لا توجد مرتجعات مسجّلة في هذه الفترة — اختر شهراً آخر أو نوع تقرير أطول." },
  msgFiltered:  { en: "{n} line items in this period, but none match the current filters — clear or widen them in “Period & Scope”.",
                  ar: "يوجد {n} صنف في هذه الفترة، لكن لا شيء يطابق الفلاتر الحالية — امسحها أو وسّعها من «الفترة والنطاق»." },
  msgBlocker:   { en: "{n} line items exist here, but the “{f}” filter alone excludes every one of them.",
                  ar: "يوجد {n} صنف هنا، لكن فلتر «{f}» وحده يستبعدها جميعاً." },
  msgCombo:     { en: "{n} line items exist here — each filter matches something on its own, but nothing matches all of them together.",
                  ar: "يوجد {n} صنف هنا — كل فلتر يطابق شيئاً بمفرده، لكن لا شيء يطابقها كلها معاً." },
  clearFilters: { en: "Clear all filters", ar: "مسح كل الفلاتر" },

  myTemplates:  { en: "My saved templates", ar: "قوالبي المحفوظة" },
  tplNone:      { en: "Nothing saved yet — set up a report below, then save it here.",
                  ar: "لا يوجد محفوظ بعد — اضبط تقريراً ثم احفظه هنا." },
  tplNamePh:    { en: "Name this setup, e.g. “POS 11 monthly”", ar: "سمِّ هذا الإعداد، مثلاً «POS 11 شهري»" },
  tplSave:      { en: "Save current setup", ar: "حفظ الإعداد الحالي" },
  tplSaving:    { en: "Saving…",            ar: "جارٍ الحفظ…" },
  tplApply:     { en: "Apply",              ar: "تطبيق" },
  tplDelete:    { en: "Delete",             ar: "حذف" },
  tplDeleteAsk: { en: "Delete this saved template?", ar: "حذف هذا القالب المحفوظ؟" },
  tplSaved:     { en: "Template saved",     ar: "تم حفظ القالب" },
  tplApplied:   { en: "Template applied",   ar: "تم تطبيق القالب" },
  tplNeedName:  { en: "Give the template a name first", ar: "اكتب اسماً للقالب أولاً" },
  tplFailed:    { en: "Could not save the template", ar: "تعذّر حفظ القالب" },
  tplBuiltIn:   { en: "Built-in presets",   ar: "قوالب جاهزة" },
  tplScopeNote: { en: "Saves filters, sections, analysis options and document details — not the month.",
                  ar: "يحفظ الفلاتر والأقسام وخيارات التحليل وتفاصيل الوثيقة — لا الشهر." },

  navDelivery:  { en: "Delivery",  ar: "التسليم" },
  navDeliverySub:{ en: "E-mail & per-branch", ar: "بريد وتوزيع للفروع" },
  mailTitle:    { en: "E-mail this report", ar: "إرسال هذا التقرير بالبريد" },
  mailNote2:    { en: "The PDF is built in your browser, then sent through the company mail server.",
                  ar: "يُبنى الملف في متصفحك ثم يُرسل عبر خادم بريد الشركة." },
  mailTo:       { en: "To",        ar: "إلى" },
  mailCc:       { en: "Cc",        ar: "نسخة" },
  mailSubj:     { en: "Subject",   ar: "الموضوع" },
  mailSubjPh:   { en: "Leave empty to use the report title + period", ar: "اتركه فارغاً لاستخدام عنوان التقرير والفترة" },
  mailBody:     { en: "Message",   ar: "الرسالة" },
  mailSend:     { en: "Generate & send", ar: "إنشاء وإرسال" },
  mailSending:  { en: "Sending…",  ar: "جارٍ الإرسال…" },
  mailSent:     { en: "Report e-mailed", ar: "تم إرسال التقرير" },
  mailFailed:   { en: "Send failed", ar: "فشل الإرسال" },
  mailNeedTo:   { en: "Add at least one recipient", ar: "أضف مستلماً واحداً على الأقل" },
  mailMulti:    { en: "Separate several addresses with a comma.", ar: "افصل بين العناوين بفاصلة." },

  burstTitle:   { en: "One report per branch (bursting)", ar: "تقرير لكل فرع (توزيع مُقسَّم)" },
  burstNote:    { en: "Builds a separate report for every branch, each filtered to that branch only.",
                  ar: "ينشئ تقريراً منفصلاً لكل فرع، كل واحد مفلتر على فرعه فقط." },
  burstScope:   { en: "Branches covered", ar: "الفروع المشمولة" },
  burstAllNote: { en: "No branch filter set — every branch in the data will get a report.",
                  ar: "لا يوجد فلتر فروع — كل فرع في البيانات سيحصل على تقرير." },
  burstDl:      { en: "Download all", ar: "تنزيل الكل" },
  burstMail:    { en: "E-mail each branch", ar: "إرسال لكل فرع" },
  burstNoBranches:{ en: "No branches found in the data", ar: "لا توجد فروع في البيانات" },
  burstDone:    { en: "Done: {d} · skipped: {s} · failed: {f}", ar: "تم: {d} · متجاوَز: {s} · فشل: {f}" },
  burstAddr:    { en: "Branch addresses", ar: "عناوين الفروع" },
  burstAddrNote:{ en: "A branch with no address is skipped when e-mailing.",
                  ar: "الفرع بدون عنوان يُتجاوَز عند الإرسال." },
  xlsxTitle:    { en: "Excel workbook", ar: "ملف إكسل" },
  xlsxNote:     { en: "Same scope and analysis as the PDF, as sheets you can pivot.",
                  ar: "نفس النطاق والتحليل، على شكل أوراق قابلة للتحليل." },
  xlsxBtn:      { en: "Export Excel", ar: "تصدير إكسل" },
  reset:        { en: "Reset",          ar: "إعادة ضبط" },
  cancel:       { en: "Cancel",         ar: "إلغاء" },
  generate:     { en: "Generate PDF",   ar: "إنشاء PDF" },
  generating:   { en: "Generating…",    ar: "جارٍ الإنشاء…" },
  pdfEnNote:    { en: "The PDF itself is produced in English.", ar: "ملف الـ PDF نفسه يُنتج بالإنجليزية." },
};

/* Build the "does this line item belong in the report?" predicate from the
   builder options. Empty selections mean "no restriction", so the default
   options reproduce the old full-scope report exactly. */
function makeItemFilter(opts) {
  const o = opts || {};
  const has = (arr) => Array.isArray(arr) && arr.length > 0;
  const min = o.minQty === "" || o.minQty == null ? null : Number(o.minQty);
  /* `resolvedAction` lets the generator pass the LATEST disposition (after any
     recorded change) so the action filter matches what the report actually
     counts. Callers without that context fall back to the row's own action. */
  return (it, resolvedAction) => {
    if (!it) return false;
    const act = resolvedAction !== undefined ? (resolvedAction || "") : (actionText(it) || "");
    if (has(o.branches) && !o.branches.includes(safeButchery(it) || "—")) return false;
    if (has(o.products) && !o.products.includes((it.productName || "").trim() || "—")) return false;
    if (has(o.origins) && !o.origins.includes(it.origin || "—")) return false;
    if (has(o.actions) && !o.actions.includes(act)) return false;
    if (o.qtyType === "kg" && !isKgType(it.qtyType)) return false;
    if (o.qtyType === "pcs" && !isPcsType(it.qtyType)) return false;
    if (o.condemnedOnly && !isCondemnation(act)) return false;
    if (min != null && Number.isFinite(min) && (Number(it.quantity) || 0) < min) return false;
    return true;
  };
}

/* Report sections the builder can switch on/off, in the order they are rendered.
   `always` sections cannot be unticked (the document would be meaningless). */
const REPORT_SECTIONS = [
  { key: "cover",          group: "Core",     icon: "📘", label: "Cover page",              hint: "Branding, period pill, hero KPIs, at-a-glance facts",
    labelAr: "صفحة الغلاف",              hintAr: "الهوية، شارة الفترة، المؤشرات الرئيسية، لمحة سريعة" },
  { key: "summary",        group: "Core",     icon: "📊", label: "Executive summary",       hint: "Key metrics grid + your commentary",
    labelAr: "الملخص التنفيذي",           hintAr: "شبكة المقاييس الرئيسية + تعليقك" },
  { key: "mix",            group: "Core",     icon: "🍩", label: "Disposition mix",         hint: "Donut of every action taken, with share %",
    labelAr: "توزيع القرارات",            hintAr: "رسم دائري لكل إجراء متخذ مع النسبة" },
  { key: "comparison",     group: "Core",     icon: "📈", label: "Period comparison",       hint: "This period vs the chosen baseline, with % deltas",
    labelAr: "مقارنة الفترات",            hintAr: "هذه الفترة مقابل الأساس المختار مع نسب التغير" },
  { key: "activity",       group: "Core",     icon: "📅", label: "Activity chart + register", hint: "Bar chart per day/month plus a reconciling table",
    labelAr: "رسم النشاط + السجل",        hintAr: "رسم بياني يومي/شهري مع جدول مطابقة" },

  { key: "rankings",       group: "Analysis", icon: "🏆", label: "Rankings",                hint: "Top products, branches, origins and most-condemned items",
    labelAr: "الترتيبات",                 hintAr: "أعلى المنتجات والفروع والمناشئ وأكثر الأصناف إعداماً" },
  { key: "topCondemn",     group: "Analysis", icon: "⛔", label: "Top Condemnation",        hint: "The most-condemned products: weight, share of all condemnations, rate, and where they came from",
    labelAr: "أعلى حالات الإعدام",        hintAr: "المنتجات الأكثر إعداماً: الوزن، نسبتها من إجمالي الإعدام، المعدل، ومن أي فرع/منشأ" },
  { key: "branchScorecard", group: "Analysis", icon: "🏪", label: "Branch scorecard",       hint: "League table per branch: volume, weight, condemned, rate and grade",
    labelAr: "بطاقة أداء الفروع",         hintAr: "جدول لكل فرع: العدد، الوزن، المُعدَم، المعدل، التقدير" },
  { key: "originQuality",  group: "Analysis", icon: "🌍", label: "Origin quality table",    hint: "Same scorecard by country/supplier origin — supplier accountability",
    labelAr: "جودة المنشأ",               hintAr: "نفس البطاقة حسب بلد/مورد المنشأ — محاسبة الموردين" },
  { key: "hotspots",       group: "Analysis", icon: "🔥", label: "Condemnation hotspots",   hint: "Condemnation RATE ranked by branch and by origin",
    labelAr: "بؤر الإعدام",               hintAr: "معدّل الإعدام مرتّباً حسب الفرع والمنشأ" },
  { key: "pareto",         group: "Analysis", icon: "🎯", label: "Pareto (80/20)",          hint: "The vital few products driving most returns, with cumulative curve",
    labelAr: "باريتو (80/20)",            hintAr: "القلّة الحيوية من المنتجات المسببة لمعظم المرتجعات" },
  { key: "repeat",         group: "Analysis", icon: "🔁", label: "Repeat offenders",        hint: "Products coming back on many separate days — chronic problems",
    labelAr: "المتكرّرون",                hintAr: "منتجات ترجع في أيام منفصلة كثيرة — مشاكل مزمنة" },
  { key: "weekday",        group: "Analysis", icon: "🗓️", label: "Day-of-week pattern",     hint: "Which weekdays carry the returns load",
    labelAr: "نمط أيام الأسبوع",          hintAr: "أي أيام الأسبوع تحمل عبء المرتجعات" },
  { key: "anomalies",      group: "Analysis", icon: "⚠️", label: "Spike days",              hint: "Days statistically above normal (mean + 1.5σ) — worth investigating",
    labelAr: "أيام الارتفاع الشاذ",       hintAr: "أيام أعلى من الطبيعي إحصائياً (المتوسط + 1.5 انحراف)" },

  { key: "lineItems",      group: "Annex",    icon: "📋", label: "Line-item register",      hint: "Every matching return as one table row — the audit annex",
    labelAr: "سجل الأصناف التفصيلي",      hintAr: "كل صنف مطابق في صف — ملحق التدقيق" },
  { key: "signoff",        group: "Annex",    icon: "✍️", label: "Sign-off page",           hint: "Document control table + prepared / reviewed / approved signatures",
    labelAr: "صفحة الاعتماد",             hintAr: "جدول ضبط الوثيقة + تواقيع الإعداد والمراجعة والاعتماد" },
];

const SECTION_GROUPS = ["Core", "Analysis", "Annex"];

/* One-click starting points. `sections` lists what is ON; everything else is OFF. */
const REPORT_PRESETS = [
  {
    key: "exec", icon: "⚡", label: "Executive one-pager", labelAr: "صفحة تنفيذية واحدة",
    desc: "Cover + summary + mix. Fastest read for management.",
    descAr: "غلاف + ملخص + توزيع. أسرع قراءة للإدارة.",
    sections: ["cover", "summary", "mix"],
  },
  {
    key: "standard", icon: "📗", label: "Standard monthly", labelAr: "الشهري القياسي",
    desc: "The classic pack: KPIs, trends, activity and rankings.",
    descAr: "الباقة الكلاسيكية: المؤشرات والاتجاهات والنشاط والترتيبات.",
    sections: ["cover", "summary", "mix", "comparison", "hotspots", "activity", "rankings"],
  },
  {
    key: "topCondemn", icon: "⛔", label: "Top Condemnation", labelAr: "أعلى حالات الإعدام",
    desc: "One-click condemnation report: the worst products, their weight, share, rate and source.",
    descAr: "تقرير إعدام بضغطة واحدة: أسوأ المنتجات ووزنها ونسبتها ومعدلها ومصدرها.",
    sections: ["cover", "summary", "mix", "topCondemn", "hotspots", "originQuality", "signoff"],
  },
  {
    key: "quality", icon: "🔬", label: "Condemnation deep-dive", labelAr: "تحليل معمّق للإعدام",
    desc: "Everything about what got condemned and where it came from.",
    descAr: "كل شيء عن الأصناف المُعدَمة ومن أين أتت.",
    sections: ["cover", "summary", "mix", "topCondemn", "hotspots", "originQuality", "pareto", "repeat", "rankings", "signoff"],
  },
  {
    key: "branch", icon: "🏪", label: "Branch performance review", labelAr: "مراجعة أداء الفروع",
    desc: "Scorecards, patterns and rankings for a branch meeting.",
    descAr: "بطاقات الأداء والأنماط والترتيبات لاجتماع الفروع.",
    sections: ["cover", "summary", "branchScorecard", "comparison", "weekday", "anomalies", "rankings", "signoff"],
  },
  {
    key: "audit", icon: "🗂️", label: "Full audit pack", labelAr: "باقة التدقيق الكاملة",
    desc: "Every section including the complete line-item annex.",
    descAr: "كل الأقسام بما فيها ملحق الأصناف الكامل.",
    sections: REPORT_SECTIONS.map((s) => s.key),
  },
];

const RANK_METRICS = [
  { key: "count", label: "Number of returns",     labelAr: "عدد المرتجعات" },
  { key: "kg",    label: "Weight returned (kg)",  labelAr: "الوزن المُرجَع (كغ)" },
  { key: "cond",  label: "Condemned count",       labelAr: "عدد المُعدَم" },
];

const DEFAULT_REPORT_OPTS = {
  /* scope */
  branches: [], products: [], origins: [], actions: [],
  qtyType: "all",          // all | kg | pcs
  condemnedOnly: false,
  minQty: "",
  /* content */
  sections: REPORT_SECTIONS.reduce(
    (a, s) => ({ ...a, [s.key]: ["cover", "summary", "mix", "comparison", "hotspots", "activity", "rankings"].includes(s.key) }),
    {}
  ),
  topN: 8,
  rankMetric: "count",     // count | kg | cond
  baseline: "prev",        // prev | yoy
  lineItemLimit: 400,
  minRepeatDays: 3,
  /* details */
  titleOverride: "",
  refNo: "",
  classification: "Internal",
  preparedBy: "", reviewedBy: "", approvedBy: "",
  notes: "",
};

const CLASSIFICATIONS = ["Internal", "Confidential", "Restricted", "Public"];

/* Saved report setups live on the server like any other record, so they follow
   the account between devices. */
const REPORT_TPL_TYPE = "returns_report_template";
/* Every generated report writes one of these — the server audits the create,
   so the Audit Trail shows who produced which report over what scope. */
const REPORT_LOG_TYPE = "returns_report_log";

/* iOS-style switch — reads faster than a checkbox in a long section list. */
function BuilderSwitch({ on, onChange, disabled, T }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 38, height: 22, borderRadius: 999, flexShrink: 0, position: "relative",
        border: `1px solid ${on ? T.primary : "#cbd5e1"}`,
        background: on ? T.primary : "#e2e8f0",
        cursor: disabled ? "not-allowed" : "pointer", padding: 0,
        transition: "background .15s ease",
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        boxShadow: "0 1px 3px rgba(15,23,42,.3)", transition: "left .15s ease",
      }} />
    </button>
  );
}

/* Collapsible multi-select used by the report builder's Scope tab.
   Nothing selected == "all", which is why the summary says "All" not "None". */
function ReportFacetPicker({ title, icon, options, selected, onToggle, onClear, disabled, searchable, sx, T, L }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
    return list.slice(0, 300);
  }, [options, q]);

  const summary = selected.length === 0
    ? `${L("allWord")} (${options.length})`
    : selected.length <= 2 ? selected.join(", ") : `${selected.length} ${L("selectedWord")}`;

  return (
    <div style={{ marginBottom: 12, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", border: "none", cursor: "pointer", fontFamily: "inherit",
          background: selected.length ? T.primaryS : "transparent", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: T.text }}>{title}</span>
        <span style={{
          fontSize: 12, fontWeight: 700, marginInlineStart: "auto",
          color: selected.length ? T.primaryD : T.textM,
        }}>{summary}</span>
        <span style={{ color: T.textM, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${T.border}` }}>
          {searchable && (
            <input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder={L("filterPh")}
              disabled={disabled}
              style={{ ...sx.input, width: "100%", marginBottom: 10, fontSize: 13 }}
            />
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 190, overflowY: "auto" }}>
            {shown.map((o) => {
              const on = selected.includes(o.label);
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => onToggle(o.label)}
                  disabled={disabled}
                  style={{
                    padding: "6px 11px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap",
                    border: `1px solid ${on ? T.primary : T.border}`,
                    background: on ? T.primary : "#fff",
                    color: on ? "#fff" : T.text,
                  }}
                  title={`${o.label} — ${o.n} item${o.n === 1 ? "" : "s"}`}
                >
                  {o.label || "(blank)"} <span style={{ opacity: .7 }}>{o.n}</span>
                </button>
              );
            })}
            {shown.length === 0 && <span style={{ ...sx.muted, fontSize: 12.5 }}>{L("noMatches")}</span>}
          </div>
          {selected.length > 0 && (
            <button
              type="button" onClick={onClear} disabled={disabled}
              style={{ ...sx.btn, marginTop: 10, padding: "5px 12px", fontSize: 12 }}
            >{L("clearWord")} — {title}</button>
          )}
        </div>
      )}
    </div>
  );
}

/* Condemnation leaderboard with tick boxes — builds the product scope from the
   actual worst offenders in the chosen period instead of making the user hunt
   through the alphabetical facet list. Ticking here writes to the same
   `products` filter, so every section, the Excel sheets and the e-mail all
   narrow to the picks. */
function CondemnLeaderboard({ rows, selected, onToggle, onTopN, onClear, disabled, sx, T, L }) {
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 8;
  const shown = showAll ? rows : rows.slice(0, LIMIT);
  const max = Math.max(...rows.map((r) => r.cond), 1);
  /* Products picked in the facet list that are NOT condemned (so absent here)
     still filter the report — say so rather than look like they were lost. */
  const pickedInList = rows.filter((r) => selected.includes(r.label)).length;

  return (
    <div style={{
      border: `1px solid ${T.border}`, borderRadius: 12, background: T.card,
      marginBottom: 12, overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
        padding: "11px 14px", background: T.dangerS, borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 16 }}>🔥</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: T.text, flex: 1, minWidth: 150 }}>{L("cpTitle")}</span>
        {[5, 10].map((n) => (
          <button
            key={n} type="button" disabled={disabled || rows.length === 0}
            onClick={() => onTopN(n)}
            style={{ ...sx.btn, padding: "4px 10px", fontSize: 12 }}
          >{L("cpTop", { n })}</button>
        ))}
        <button
          type="button" disabled={disabled || selected.length === 0} onClick={onClear}
          style={{ ...sx.btn, padding: "4px 10px", fontSize: 12 }}
        >{L("clearWord")}</button>
      </div>

      <div style={{ padding: "10px 14px 12px" }}>
        <div style={{ ...sx.mutedS, marginBottom: 10, lineHeight: 1.6 }}>{L("cpNote")}</div>
        {rows.length === 0 ? (
          <div style={{ ...sx.muted, padding: "6px 0" }}>{L("cpNone")}</div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 6 }}>
              {shown.map((r, i) => {
                const on = selected.includes(r.label);
                return (
                  <button
                    key={r.label} type="button" role="checkbox" aria-checked={on}
                    disabled={disabled} onClick={() => onToggle(r.label)}
                    style={{
                      display: "block", width: "100%", textAlign: "start", fontFamily: "inherit",
                      border: `1px solid ${on ? T.danger : T.border}`,
                      background: on ? T.dangerS : T.card,
                      borderRadius: 10, padding: "8px 10px",
                      cursor: disabled ? "not-allowed" : "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0, fontSize: 11,
                        lineHeight: "15px", textAlign: "center", color: "#fff", fontWeight: 900,
                        border: `1px solid ${on ? T.danger : "#cbd5e1"}`,
                        background: on ? T.danger : "#fff",
                      }}>{on ? "✓" : ""}</span>
                      <span style={{
                        fontSize: 12.5, fontWeight: 800, color: T.text, flex: 1, minWidth: 0,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{i + 1}. {r.label || "(blank)"}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: T.danger, flexShrink: 0 }}>
                        {r.cond} {L("cpCond")}
                      </span>
                    </span>
                    <span style={{
                      display: "block", height: 5, borderRadius: 3,
                      background: T.bgAlt, margin: "6px 0 5px",
                    }}>
                      <span style={{
                        display: "block", height: 5, borderRadius: 3, background: T.danger,
                        width: `${Math.max(3, (r.cond / max) * 100)}%`,
                      }} />
                    </span>
                    <span style={{ ...sx.mutedS, display: "block" }}>
                      {fmtNum(r.kg)} kg · {r.share.toFixed(1)}% {L("cpOfCond")} · {L("cpRate")} {Math.round(r.rate)}% ({r.cond}/{r.n})
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <span style={sx.mutedS}>{L("cpShowing", { n: shown.length, t: rows.length })}</span>
              {rows.length > LIMIT && (
                <button
                  type="button" onClick={() => setShowAll((v) => !v)}
                  style={{ ...sx.btn, padding: "3px 10px", fontSize: 12 }}
                >{showAll ? L("cpShowLess") : L("cpShowAll")}</button>
              )}
              {selected.length > 0 && (
                <span style={{ ...sx.mutedS, fontWeight: 800, color: T.danger }}>
                  · {L("cpPicked", { n: selected.length })}
                  {selected.length > pickedInList ? ` · ${L("cpNotInList")}` : ""}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function latestReportDate(reports) {
  const dates = (reports || []).map((r) => r.reportDate).filter(Boolean).sort();
  return dates[dates.length - 1] || "";
}

/* ============================================================
   Power search — parse key:value tokens with quotes
   Supported keys (aliases in parens):
     code (itemcode)            substring match on itemCode
     name (product, productname) substring match on productName
     pos (butchery)             substring match on POS
     origin                     substring match on origin
     action                     substring match on action
     expiry                     substring match on expiry
     remarks                    substring match on remarks
     qty / quantity             numeric — supports >N, <N, >=N, <=N, =N
     qtytype / type             "kg" | "pcs"
     images                     "yes" | "no"
   Plain words are matched as substrings across all fields.
   ============================================================ */
function parseSearchQuery(q) {
  const out = { filters: [], terms: [] };
  if (!q || !q.trim()) return out;
  const re = /(\w+):(?:"([^"]*)"|(\S+))|"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(q)) !== null) {
    if (m[1]) {
      const key = m[1].toLowerCase();
      const val = (m[2] != null ? m[2] : m[3]) || "";
      out.filters.push({ key, val });
    } else if (m[4] != null) {
      out.terms.push(m[4]);
    } else if (m[5] != null) {
      out.terms.push(m[5]);
    }
  }
  return out;
}

const KEY_ALIASES = {
  code: "code", itemcode: "code",
  name: "name", product: "name", productname: "name",
  pos: "pos", butchery: "pos",
  origin: "origin",
  action: "action",
  expiry: "expiry",
  remarks: "remarks",
  qty: "qty", quantity: "qty",
  qtytype: "qtytype", type: "qtytype",
  images: "images",
  ref: "refNo", refno: "refNo", reference: "refNo",
  trn: "transferNo", transfer: "transferNo", transferno: "transferNo",
  ord: "qty", ordered: "qty",   // the old ORDERED column is now QUANTITY
};

function rowMatchesPower(row, parsed) {
  if (!parsed) return true;
  const { filters, terms } = parsed;
  // Free text terms — all must match somewhere
  for (const t of terms) {
    const needle = t.toLowerCase();
    const hay = [
      row.itemCode, row.productName, row.origin, safeButchery(row),
      String(row.quantity ?? ""),
      (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || ""),
      row.expiry, row.remarks, actionText(row), row.transferNo,
    ].some((v) => (v ?? "").toString().toLowerCase().includes(needle));
    if (!hay) return false;
  }
  // Structured filters
  for (const { key, val } of filters) {
    const aliased = KEY_ALIASES[key] || key;
    const v = (val || "").toLowerCase();
    if (aliased === "code") {
      if (!String(row.itemCode || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "name") {
      if (!String(row.productName || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "pos") {
      if (!String(safeButchery(row) || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "origin") {
      if (!String(row.origin || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "action") {
      if (!String(actionText(row) || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "expiry") {
      const expiry = String(row.expiry || "").toLowerCase();
      if (v === "empty") { if (expiry.trim() !== "") return false; }
      else if (v === "nonempty") { if (expiry.trim() === "") return false; }
      else if (!expiry.includes(v)) return false;
    } else if (aliased === "transferNo") {
      const t = String(row.transferNo || "").toLowerCase();
      if (v === "empty") { if (t.trim() !== "") return false; }
      else if (v === "nonempty") { if (t.trim() === "") return false; }
      else if (!t.includes(v)) return false;
    } else if (aliased === "remarks") {
      const r = String(row.remarks || "").toLowerCase();
      if (v === "empty") { if (r.trim() !== "") return false; }
      else if (v === "nonempty") { if (r.trim() === "") return false; }
      else if (!r.includes(v)) return false;
    } else if (aliased === "qty") {
      const n = Number(row.quantity || 0);
      const m = String(val).match(/^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/);
      if (!m) return false;
      const op = m[1] || "=";
      const target = Number(m[2]);
      if (op === ">"  && !(n > target)) return false;
      if (op === ">=" && !(n >= target)) return false;
      if (op === "<"  && !(n < target)) return false;
      if (op === "<=" && !(n <= target)) return false;
      if (op === "="  && !(n === target)) return false;
    } else if (aliased === "qtytype") {
      const k = qtyKind(row);
      if (k !== v) return false;
    } else if (aliased === "images") {
      const has = Array.isArray(row.images) && row.images.length > 0;
      if (v === "yes" && !has) return false;
      if (v === "no" && has) return false;
    } else {
      return false; // unknown key
    }
  }
  return true;
}

/* ============================================================
   Local presets (filter snapshots) in localStorage
   ============================================================ */
const PRESETS_KEY = "browseReturns:presets:v1";
function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); }
  catch { return []; }
}
function savePresetsAll(arr) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(arr)); } catch {}
}

/* ============================================================
   Design tokens
   ============================================================ */
const T = {
  bg: "#f8fafc",
  bgAlt: "#f1f5f9",
  card: "#ffffff",
  cardAlt: "#fafafa",
  border: "#e2e8f0",
  borderS: "#f1f5f9",
  text: "#0f172a",
  textM: "#475569",
  textS: "#94a3b8",
  primary: "#4f46e5",
  primaryD: "#4338ca",
  primaryS: "#eef2ff",
  success: "#059669",
  successS: "#ecfdf5",
  danger: "#dc2626",
  dangerS: "#fef2f2",
  warning: "#d97706",
  warningS: "#fffbeb",
  info: "#0891b2",
  infoS: "#ecfeff",
  purple: "#7c3aed",
  purpleS: "#f5f3ff",
};

/* ============================================================
   Shared inline styles
   ============================================================ */
const sx = {
  page: {
    minHeight: "100vh",
    background: T.bg,
    color: T.text,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "20px 24px 40px",
    boxSizing: "border-box",
  },
  card: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  cardPad: { padding: 16 },
  h1: { fontSize: 22, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.01em" },
  h2: { fontSize: 16, fontWeight: 700, color: T.text, margin: 0 },
  h3: { fontSize: 13, fontWeight: 700, color: T.textM, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" },
  muted: { color: T.textM, fontSize: 13 },
  mutedS: { color: T.textS, fontSize: 12 },
  input: {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px",
    fontSize: 14, color: T.text, background: T.card, outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  btn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: `1px solid ${T.border}`, borderRadius: 8,
    background: T.card, color: T.text,
    padding: "8px 12px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
  },
  btnPri: {
    background: T.primary, color: "#fff", borderColor: T.primary,
  },
  btnGhost: {
    background: "transparent", border: "none", color: T.textM,
  },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: T.bgAlt, color: T.textM, border: `1px solid ${T.border}`,
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
  },
  divider: { height: 1, background: T.border, border: "none", margin: "12px 0" },
};

/* ============================================================
   Reusable UI components
   ============================================================ */
function IconBtn({ icon: Icon, onClick, title, active = false, danger = false, disabled = false, children, style = {} }) {
  const bg = danger ? T.dangerS : active ? T.primaryS : T.card;
  const fg = danger ? T.danger : active ? T.primary : T.textM;
  const bd = danger ? "#fecaca" : active ? "#c7d2fe" : T.border;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        ...sx.btn,
        background: disabled ? T.bgAlt : bg,
        color: disabled ? T.textS : fg,
        borderColor: bd,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

function PrimaryBtn({ icon: Icon, onClick, disabled = false, children, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sx.btn, ...sx.btnPri,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

function StatChip({ icon: Icon, label, value, sub, color = T.primary, bg = T.primaryS }) {
  return (
    <div style={{ ...sx.card, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: bg, color, display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        {Icon ? <Icon size={18} /> : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textM, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1.15, marginTop: 2 }}>{value}</div>
        {sub ? <div style={{ ...sx.mutedS, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub}>{sub}</div> : null}
      </div>
    </div>
  );
}

function FilterPill({ label, value, onRemove }) {
  return (
    <span style={{
      ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe",
    }}>
      <span style={{ fontWeight: 600, color: T.primaryD, opacity: 0.8 }}>{label}:</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
      {onRemove ? (
        <button onClick={onRemove} style={{
          ...sx.btnGhost, padding: 0, marginLeft: 2, color: T.primaryD,
          display: "inline-flex", alignItems: "center", cursor: "pointer",
        }} title="Remove filter">
          <FiX size={12} />
        </button>
      ) : null}
    </span>
  );
}

function Skeleton({ height = 16, width = "100%", radius = 6, style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{
      display: "inline-flex", gap: 4, padding: 4,
      background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 10,
    }}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 7, fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: active ? T.card : "transparent",
              color: active ? T.primary : T.textM,
              boxShadow: active ? "0 1px 2px rgba(15,23,42,.06)" : "none",
              transition: "all .15s",
            }}
          >
            {t.icon ? <t.icon size={14} /> : null}
            {t.label}
            {t.badge != null && (
              <span style={{
                ...sx.badge, background: active ? T.primaryS : T.border,
                color: active ? T.primary : T.textM,
                marginLeft: 4,
              }}>{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Dropdown checkbox multi-select */
function MultiSelect({ label, options = [], selected = [], onChange, placeholder = "All", icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const toggle = (val) => {
    const set = new Set(selected);
    if (set.has(val)) set.delete(val); else set.add(val);
    onChange(Array.from(set));
  };
  const display = selected.length === 0 ? placeholder
    : selected.length === 1 ? selected[0]
    : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...sx.btn, width: "100%", justifyContent: "space-between",
          background: selected.length ? T.primaryS : T.card,
          borderColor: selected.length ? "#c7d2fe" : T.border,
          color: selected.length ? T.primaryD : T.text,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {Icon ? <Icon size={13} /> : null}
          <span style={{ fontWeight: 700 }}>{label}:</span>
          <span style={{ fontWeight: 600, opacity: 0.85 }}>{display}</span>
        </span>
        <FiChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          width: 280, maxHeight: 320, overflow: "auto", zIndex: 100,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, boxShadow: "0 10px 24px rgba(15,23,42,.12)", padding: 8,
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button onClick={() => onChange(options)} style={{ ...sx.btn, flex: 1, padding: "6px 8px", fontSize: 12 }}>Select all</button>
            <button onClick={() => onChange([])} style={{ ...sx.btn, flex: 1, padding: "6px 8px", fontSize: 12, color: T.danger, borderColor: "#fecaca" }}>Clear</button>
          </div>
          {options.length === 0 ? (
            <div style={{ ...sx.muted, padding: 10, textAlign: "center" }}>No options.</div>
          ) : options.map((opt, i) => {
            const checked = selected.includes(opt);
            return (
              <label key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                background: checked ? T.primaryS : "transparent",
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} style={{ accentColor: T.primary }} />
                <span style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={opt}>{opt || "—"}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Inline SVG sparkline */
function Sparkline({ data = [], width = 280, height = 70, color = T.primary, fill = T.primaryS, showDots = true, interactive = false, renderTooltip }) {
  const [hover, setHover] = useState(null);
  if (!data.length) return <div style={{ ...sx.mutedS, textAlign: "center", padding: 20 }}>No data.</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const padX = 8, padY = 8;
  const W = width - padX * 2, H = height - padY * 2;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + H - ((d.value - min) / (max - min || 1)) * H;
    return [x, y];
  });
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const areaPath = `${path} L${points[points.length - 1][0]},${padY + H} L${padX},${padY + H} Z`;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    let bestI = 0, bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(points[i][0] - x);
      if (d < bestDist) { bestDist = d; bestI = i; }
    }
    setHover(bestI);
  };

  const tipW = 220;
  const hp = hover != null ? points[hover] : null;
  const tipLeft = hp ? Math.max(4, Math.min(width - tipW - 4, hp[0] - tipW / 2)) : 0;
  const placeAbove = hp ? hp[1] > 70 : true;

  return (
    <div style={{ position: "relative", width, height, display: "inline-block" }}>
      <svg
        width={width}
        height={height}
        style={{ display: "block", cursor: interactive ? "crosshair" : "default" }}
        onMouseMove={interactive ? onMove : undefined}
        onMouseLeave={interactive ? () => setHover(null) : undefined}
      >
        <path d={areaPath} fill={fill} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {showDots && points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={2.5} fill={color}>
            {!interactive && <title>{`${data[i].label}: ${data[i].value}`}</title>}
          </circle>
        ))}
        {hover != null && interactive && hp && (
          <>
            <line x1={hp[0]} x2={hp[0]} y1={padY} y2={height - padY}
              stroke={T.textS} strokeDasharray="3 3" strokeWidth={1} opacity={0.7} />
            <circle cx={hp[0]} cy={hp[1]} r={5} fill={color} stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
      {hover != null && interactive && hp && (
        <div style={{
          position: "absolute",
          left: tipLeft,
          top: placeAbove ? Math.max(4, hp[1] - 90) : Math.min(height - 80, hp[1] + 12),
          width: tipW,
          background: T.text,
          color: "#fff",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12,
          lineHeight: 1.5,
          boxShadow: "0 8px 24px rgba(15,23,42,.35)",
          pointerEvents: "none",
          zIndex: 100,
          border: `1px solid ${T.text}`,
        }}>
          {renderTooltip ? renderTooltip(data[hover]) : (
            <>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 4 }}>{data[hover].label}</div>
              <div style={{ opacity: 0.9 }}>{data[hover].value}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* Horizontal bar list */
function HBarList({ items = [], color = T.primary, bg = T.primaryS, formatValue, max }) {
  if (!items.length) return <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>No data.</div>;
  const m = max != null ? max : Math.max(...items.map((it) => it.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => {
        const pct = (it.value / m) * 100;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>{it.label}</span>
              <span style={{ fontSize: 12, color: T.textM, fontWeight: 700, flexShrink: 0 }}>
                {formatValue ? formatValue(it.value) : it.value}
              </span>
            </div>
            <div style={{ height: 8, background: T.bgAlt, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .25s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Compact donut for action share */
function MiniDonut({ percent = 0, label = "", color = T.primary, size = 80, count }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - dash / 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={T.bgAlt} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${C} ${C}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontSize: 14, fontWeight: 800, fill: T.text }}>{Math.round(percent)}%</text>
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{label}</div>
        {count != null && <div style={sx.mutedS}>{count}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Product DNA fingerprint — radial spider chart
   axes: condemn%, useProd%, posSpread, originSpread, volume, recency
   Each axis 0-100. Optional second product overlay for comparison.
   ============================================================ */
function ProductDNA({ primary, secondary, size = 280 }) {
  const axes = [
    { key: "condemn",  label: "Condemn%" },
    { key: "useProd",  label: "Use Prod%" },
    { key: "posSpread", label: "POS spread" },
    { key: "originSpread", label: "Origin spread" },
    { key: "volume",   label: "Volume" },
    { key: "recency",  label: "Recency" },
  ];
  const cx = size / 2, cy = size / 2;
  const r = (size / 2) - 40;
  const N = axes.length;
  const angleFor = (i) => (-Math.PI / 2) + (2 * Math.PI * i / N);

  const polyPoints = (data, fillR = r) => axes.map((a, i) => {
    const v = Math.max(0, Math.min(100, data?.[a.key] || 0));
    const ang = angleFor(i);
    const dist = (v / 100) * fillR;
    return [cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist];
  });

  const toPath = (pts) => pts.map(([x, y], i) => (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1)).join(" ") + " Z";

  const pPts = primary ? polyPoints(primary) : null;
  const sPts = secondary ? polyPoints(secondary) : null;

  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        {/* concentric circles */}
        {[20, 40, 60, 80, 100].map((p) => (
          <circle key={p} cx={cx} cy={cy} r={(p / 100) * r}
            fill="none" stroke={T.borderS} strokeWidth={p === 100 ? 1.5 : 1} strokeDasharray={p === 100 ? "" : "2 3"} />
        ))}
        {/* axes lines */}
        {axes.map((a, i) => {
          const ang = angleFor(i);
          const ex = cx + Math.cos(ang) * r;
          const ey = cy + Math.sin(ang) * r;
          return <line key={a.key} x1={cx} y1={cy} x2={ex} y2={ey} stroke={T.border} strokeWidth={1} />;
        })}
        {/* secondary polygon (if compare mode) */}
        {sPts && (
          <>
            <path d={toPath(sPts)} fill={T.success} fillOpacity={0.18} stroke={T.success} strokeWidth={2} />
            {sPts.map(([x, y], i) => <circle key={`s${i}`} cx={x} cy={y} r={3} fill={T.success} />)}
          </>
        )}
        {/* primary polygon */}
        {pPts && (
          <>
            <path d={toPath(pPts)} fill={T.primary} fillOpacity={0.22} stroke={T.primary} strokeWidth={2} />
            {pPts.map(([x, y], i) => <circle key={`p${i}`} cx={x} cy={y} r={3.5} fill={T.primary} />)}
          </>
        )}
        {/* axis labels */}
        {axes.map((a, i) => {
          const ang = angleFor(i);
          const lx = cx + Math.cos(ang) * (r + 18);
          const ly = cy + Math.sin(ang) * (r + 18);
          const v = primary?.[a.key] || 0;
          return (
            <g key={a.key}>
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 11, fill: T.textM, fontWeight: 700 }}>
                {a.label}
              </text>
              <text x={lx} y={ly + 12} textAnchor="middle" dominantBaseline="middle"
                style={{ fontSize: 10, fill: T.text, fontWeight: 800 }}>
                {Math.round(v)}{secondary ? ` / ${Math.round(secondary?.[a.key] || 0)}` : ""}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
   Sankey diagram — 3 columns (Origin → POS → Action) with curved links
   Width = flow count. Hover highlights connected paths.
   ============================================================ */
function SankeyChart({ flows = [], width = 900, height = 420, topN = 8 }) {
  const [hoverNode, setHoverNode] = useState(null); // {col, key}
  if (!flows || flows.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No flows to display.</div>;
  }

  // Aggregate flows: each flow {origin, pos, action, count}
  // Build column nodes
  const buildNodes = (col) => {
    const m = new Map();
    for (const f of flows) {
      const k = col === 0 ? f.origin : col === 1 ? f.pos : f.action;
      m.set(k, (m.get(k) || 0) + f.count);
    }
    const all = Array.from(m.entries()).map(([key, value]) => ({ key, value }));
    all.sort((a, b) => b.value - a.value);
    if (all.length > topN) {
      const top = all.slice(0, topN);
      const restSum = all.slice(topN).reduce((s, x) => s + x.value, 0);
      if (restSum > 0) top.push({ key: "Other", value: restSum, isOther: true });
      return top;
    }
    return all;
  };
  const cols = [buildNodes(0), buildNodes(1), buildNodes(2)];
  const colLabels = ["Origin", "POS", "Action"];
  const colColors = [T.success, T.primary, T.danger];

  // Group "Other" entries
  const remap = (col, key) => {
    const nodes = cols[col];
    const found = nodes.find((n) => n.key === key);
    if (found) return key;
    return "Other";
  };
  const aggregated = new Map(); // "src||mid||dst" -> count
  for (const f of flows) {
    const o = remap(0, f.origin);
    const p = remap(1, f.pos);
    const a = remap(2, f.action);
    const key1 = `0|${o}|1|${p}`;
    aggregated.set(key1, (aggregated.get(key1) || 0) + f.count);
    const key2 = `1|${p}|2|${a}`;
    aggregated.set(key2, (aggregated.get(key2) || 0) + f.count);
  }

  // Layout
  const padX = 140, padY = 20;
  const colW = 18, gap = (width - padX * 2 - colW * 3) / 2;
  const colXs = [padX, padX + colW + gap, padX + colW * 2 + gap * 2];

  // Compute Y positions per node
  const nodePositions = cols.map((nodes, ci) => {
    const total = nodes.reduce((s, n) => s + n.value, 0) || 1;
    const innerH = height - padY * 2;
    let y = padY;
    return nodes.map((n) => {
      const h = (n.value / total) * (innerH - (nodes.length - 1) * 4);
      const node = { ...n, x: colXs[ci], y, h, col: ci };
      y += h + 4;
      return node;
    });
  });

  // Build links
  const links = [];
  for (const [key, value] of aggregated.entries()) {
    const [c1, k1, c2, k2] = key.split("|");
    const src = nodePositions[parseInt(c1)].find((n) => n.key === k1);
    const dst = nodePositions[parseInt(c2)].find((n) => n.key === k2);
    if (!src || !dst) continue;
    links.push({ src, dst, value });
  }
  // Sort links per src so widths stack consistently
  for (const node of nodePositions.flat()) {
    const out = links.filter((l) => l.src === node).sort((a, b) => b.value - a.value);
    let yOff = 0;
    for (const l of out) {
      const total = node.value || 1;
      const w = (l.value / total) * node.h;
      l.srcY = node.y + yOff + w / 2;
      l.srcW = w;
      yOff += w;
    }
    const incoming = links.filter((l) => l.dst === node).sort((a, b) => b.value - a.value);
    let yOffIn = 0;
    for (const l of incoming) {
      const total = node.value || 1;
      const w = (l.value / total) * node.h;
      l.dstY = node.y + yOffIn + w / 2;
      l.dstW = w;
      yOffIn += w;
    }
  }

  const isLinkHighlighted = (l) => {
    if (!hoverNode) return false;
    return (l.src.col === hoverNode.col && l.src.key === hoverNode.key)
      || (l.dst.col === hoverNode.col && l.dst.key === hoverNode.key);
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} style={{ display: "block" }}>
        {/* Column labels */}
        {colLabels.map((lbl, i) => (
          <text key={lbl} x={colXs[i] + colW / 2} y={12} textAnchor="middle"
            style={{ fontSize: 11, fontWeight: 800, fill: T.textM, textTransform: "uppercase", letterSpacing: ".05em" }}>
            {lbl}
          </text>
        ))}
        {/* Links (drawn first so nodes appear on top) */}
        {links.map((l, i) => {
          const x1 = l.src.x + colW;
          const x2 = l.dst.x;
          const xm = (x1 + x2) / 2;
          const w = Math.max(1, Math.min(l.srcW, l.dstW));
          const path = `M${x1},${l.srcY} C${xm},${l.srcY} ${xm},${l.dstY} ${x2},${l.dstY}`;
          const high = isLinkHighlighted(l);
          return (
            <path key={i} d={path}
              fill="none"
              stroke={l.src.col === 0 ? T.success : T.primary}
              strokeWidth={w}
              strokeOpacity={hoverNode ? (high ? 0.5 : 0.08) : 0.22}
              style={{ transition: "stroke-opacity .15s" }}
            >
              <title>{`${l.src.key} → ${l.dst.key}: ${l.value}`}</title>
            </path>
          );
        })}
        {/* Nodes */}
        {nodePositions.map((nodes, ci) =>
          nodes.map((n, i) => (
            <g key={`${ci}-${i}`}
              onMouseEnter={() => setHoverNode({ col: ci, key: n.key })}
              onMouseLeave={() => setHoverNode(null)}
              style={{ cursor: "pointer" }}>
              <rect x={n.x} y={n.y} width={colW} height={Math.max(2, n.h)}
                fill={colColors[ci]} rx={3} opacity={hoverNode && hoverNode.col === ci && hoverNode.key !== n.key ? 0.4 : 1}>
                <title>{`${n.key}: ${n.value}`}</title>
              </rect>
              <text
                x={ci === 0 ? n.x - 6 : n.x + colW + 6}
                y={n.y + n.h / 2 + 3}
                textAnchor={ci === 0 ? "end" : "start"}
                style={{ fontSize: 11, fill: T.text, fontWeight: 600, pointerEvents: "none" }}>
                {(n.key || "—").length > 18 ? (n.key || "—").slice(0, 18) + "…" : (n.key || "—")}
                <tspan dx={6} style={{ fill: T.textS, fontWeight: 800 }}>{n.value}</tspan>
              </text>
            </g>
          ))
        )}
      </svg>
    </div>
  );
}

/* ============================================================
   Pareto chart — vertical bars + cumulative %
   ============================================================ */
function ParetoChart({ items = [], color = T.primary, formatLabel = (s) => s, topN = 12 }) {
  if (!items || items.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data.</div>;
  }
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, topN);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const max = sorted[0]?.value || 1;
  let cum = 0;
  const data = sorted.map((it) => {
    cum += it.value;
    return { ...it, percent: (it.value / total) * 100, cumulative: (cum / total) * 100 };
  });
  const at80 = data.findIndex((d) => d.cumulative >= 80);
  const at80Count = at80 < 0 ? data.length : at80 + 1;

  const W = Math.max(560, data.length * 56), H = 280;
  const padL = 36, padR = 36, padT = 16, padB = 80;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const stepX = innerW / data.length;
  const barW = Math.min(stepX * 0.7, 36);

  const linePoints = data.map((d, i) => [
    padL + i * stepX + stepX / 2,
    padT + innerH - (d.cumulative / 100) * innerH,
  ]);
  const linePath = linePoints.map(([x, y], i) => (i === 0 ? "M" : "L") + x + "," + y).join(" ");

  const eightyY = padT + innerH - (80 / 100) * innerH;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {/* Y-axis grid lines */}
        {[0, 25, 50, 75, 100].map((p) => {
          const y = padT + innerH - (p / 100) * innerH;
          return (
            <g key={p}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke={T.border} strokeWidth={0.5} />
              <text x={padL - 6} y={y + 3} textAnchor="end" style={{ fontSize: 10, fill: T.textS }}>{p}%</text>
            </g>
          );
        })}
        {/* 80% reference */}
        <line x1={padL} x2={padL + innerW} y1={eightyY} y2={eightyY} stroke={T.warning} strokeWidth={1.2} strokeDasharray="4 4" />
        <text x={padL + innerW + 4} y={eightyY + 3} style={{ fontSize: 10, fill: T.warning, fontWeight: 700 }}>80%</text>

        {/* Bars */}
        {data.map((d, i) => {
          const x = padL + i * stepX + (stepX - barW) / 2;
          const h = (d.value / max) * innerH * 0.95;
          const y = padT + innerH - h;
          const inEighty = i < at80Count;
          const fill = inEighty ? color : T.textS;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill={fill} rx={3} opacity={0.85}>
                <title>{`${d.label}: ${d.value} (${Math.round(d.percent)}%, cum ${Math.round(d.cumulative)}%)`}</title>
              </rect>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" style={{ fontSize: 10, fill: T.textM, fontWeight: 700 }}>
                {d.value}
              </text>
              <text x={x + barW / 2} y={padT + innerH + 12} textAnchor="middle" transform={`rotate(-30 ${x + barW / 2} ${padT + innerH + 12})`} style={{ fontSize: 10, fill: T.textM }}>
                {formatLabel(d.label).slice(0, 14)}
              </text>
            </g>
          );
        })}

        {/* Cumulative line */}
        <path d={linePath} fill="none" stroke={T.danger} strokeWidth={2} />
        {linePoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#fff" stroke={T.danger} strokeWidth={2}>
            <title>{`cum ${Math.round(data[i].cumulative)}%`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ ...sx.mutedS, marginTop: 4, textAlign: "center" }}>
        Top <strong style={{ color: T.text }}>{at80Count}</strong> of {items.length} = <strong style={{ color: T.danger }}>{Math.round(data[at80Count - 1]?.cumulative || 100)}%</strong> of returns
      </div>
    </div>
  );
}

/* ============================================================
   Day-of-week bars
   ============================================================ */
function DayOfWeekBars({ daily }) {
  if (!daily || daily.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 20 }}>No data.</div>;
  }
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of daily) {
    const [y, m, dd] = d.date.split("-").map(Number);
    const dt = new Date(y, m - 1, dd);
    const dow = dt.getDay();
    sums[dow] += d.items;
    counts[dow] += 1;
  }
  const avgs = sums.map((s, i) => counts[i] ? s / counts[i] : 0);
  const max = Math.max(...avgs, 1);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const peak = avgs.indexOf(Math.max(...avgs));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end", height: 130 }}>
        {avgs.map((v, i) => {
          const h = max > 0 ? (v / max) * 100 : 0;
          const isPeak = i === peak && v > 0;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isPeak ? T.danger : T.textM }} title={`${counts[i]} day(s)`}>
                {v ? v.toFixed(1) : "—"}
              </div>
              <div style={{
                width: "70%", height: `${h}%`, minHeight: v > 0 ? 4 : 0,
                background: isPeak ? T.danger : T.primary,
                borderRadius: "4px 4px 0 0",
                opacity: v > 0 ? 0.85 : 0.2,
              }} title={`${labels[i]}: avg ${v.toFixed(1)} items (${counts[i]} day${counts[i] !== 1 ? "s" : ""})`} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 6 }}>
        {labels.map((l, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === peak && avgs[i] > 0 ? T.danger : T.textM }}>{l}</div>
        ))}
      </div>
      {peak >= 0 && avgs[peak] > 0 && (
        <div style={{ ...sx.mutedS, marginTop: 8, textAlign: "center" }}>
          Peak: <strong style={{ color: T.danger }}>{labels[peak]}</strong> with avg <strong>{avgs[peak].toFixed(1)}</strong> items/day
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Calendar heatmap (GitHub-style)
   ============================================================ */
function CalendarHeatmap({ daily, mode = "items", onPickDay, anomalies = new Set(), selectedDate }) {
  if (!daily || daily.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data in range.</div>;
  }
  const map = new Map(daily.map((d) => [d.date, d]));
  const sortedDates = daily.map((d) => d.date).sort();
  const startStr = sortedDates[0];
  const endStr = sortedDates[sortedDates.length - 1];

  const parseDate = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const start = parseDate(startStr);
  const end = parseDate(endStr);
  start.setDate(start.getDate() - start.getDay());
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const values = daily.map((d) => mode === "items" ? d.items : d.condCount);
  const max = Math.max(...values, 1);

  const palettes = {
    items: ["#f1f5f9", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"],
    condemn: ["#f1f5f9", "#fee2e2", "#fca5a5", "#ef4444", "#991b1b"],
  };
  const pal = palettes[mode] || palettes.items;
  const colorFor = (v) => {
    if (v == null) return "#f8fafc";
    if (v === 0) return pal[0];
    const r = v / max;
    if (r < 0.25) return pal[1];
    if (r < 0.5) return pal[2];
    if (r < 0.75) return pal[3];
    return pal[4];
  };

  const cellSize = 14, gap = 3, leftLabelW = 28, topLabelH = 22;
  const widthSvg = leftLabelW + weeks.length * (cellSize + gap);
  const heightSvg = topLabelH + 7 * (cellSize + gap);

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ x: leftLabelW + wi * (cellSize + gap), label: week[0].toLocaleString("en", { month: "short" }), y: week[0].getFullYear() });
      lastMonth = m;
    }
  });

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={widthSvg} height={heightSvg} style={{ display: "block" }}>
        {monthLabels.map((m, i) => (
          <text key={i} x={m.x} y={14} style={{ fontSize: 11, fill: T.textM, fontWeight: 600 }}>{m.label}</text>
        ))}
        {dayLabels.map((d, i) => d && (
          <text key={i} x={0} y={topLabelH + i * (cellSize + gap) + cellSize - 2} style={{ fontSize: 10, fill: T.textS }}>{d}</text>
        ))}
        {weeks.map((week, wi) =>
          week.map((dt, di) => {
            const ds = fmt(dt);
            const data = map.get(ds);
            const inRange = ds >= startStr && ds <= endStr;
            const v = data ? (mode === "items" ? data.items : data.condCount) : null;
            const x = leftLabelW + wi * (cellSize + gap);
            const y = topLabelH + di * (cellSize + gap);
            const isAnom = anomalies.has(ds);
            const isSel = selectedDate === ds;
            return (
              <g key={`${wi}-${di}`}>
                <rect
                  x={x} y={y} width={cellSize} height={cellSize} rx={3}
                  fill={inRange ? colorFor(v) : "#fafafa"}
                  stroke={isSel ? T.primary : isAnom ? T.danger : "transparent"}
                  strokeWidth={isSel || isAnom ? 2 : 0}
                  style={{ cursor: data ? "pointer" : "default" }}
                  onClick={() => data && onPickDay && onPickDay(ds)}
                >
                  <title>
                    {ds}{data ? `\n${data.items} items · ${data.condCount} cond · ${data.kg} kg${isAnom ? "\n⚠ anomaly" : ""}` : "\nNo report"}
                  </title>
                </rect>
              </g>
            );
          })
        )}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 11, color: T.textM }}>
        <span>Less</span>
        {pal.map((c, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: `1px solid ${T.border}` }} />)}
        <span>More</span>
        <span style={{ marginLeft: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: T.card, border: `2px solid ${T.danger}` }} />
          Anomaly
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Audit trail modal
   ============================================================ */
function AuditTrailModalInner({ open, onClose, item, trail }) {
  if (!open || !item) return null;
  const all = trail || [];
  return (
    <ModalShell open={open} onClose={onClose} title="Audit trail" width={620}>
      <div style={{ marginBottom: 14, padding: "10px 12px", background: T.cardAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{item.productName || "—"}</div>
        <div style={{ ...sx.mutedS, marginTop: 4 }}>
          {[item.itemCode, item.origin, safeButchery(item), item.expiry ? `Exp: ${item.expiry}` : null].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      {all.length === 0 ? (
        <div style={{ ...sx.muted, padding: 30, textAlign: "center" }}>
          <FiClock size={24} style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 8 }}>No changes recorded for this item.</div>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: T.border }} />
          {all.map((ch, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 12, paddingLeft: 16 }}>
              <div style={{
                position: "absolute", left: -2, top: 6, width: 12, height: 12, borderRadius: 999,
                background: i === all.length - 1 ? T.primary : T.card,
                border: `2px solid ${T.primary}`,
              }} />
              <div style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe" }}>
                    <FiCalendar size={11} /> {ch.date}
                  </span>
                  <span style={sx.mutedS}>{formatChangeDate(ch)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ color: T.textM, textDecoration: "line-through" }}>{ch.from || "(empty)"}</span>
                  <span style={{ margin: "0 8px", color: T.primary, fontWeight: 700 }}>→</span>
                  <span style={{ fontWeight: 700, color: T.text }}>{ch.to || "(empty)"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

/* ============================================================
   Product Insights modal — full 360° view of a single product
   ============================================================ */
function ProductInsightsModalInner({ open, onClose, returnsData, changeMapByDate, auditTrailByKey, initialCode, initialName }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [compareWith, setCompareWith] = useState(null);
  const [compareQuery, setCompareQuery] = useState("");
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (initialName) {
        setSelected({ code: initialCode || "", name: initialName });
        setQuery("");
      } else {
        setSelected(null);
        setQuery("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      setPFrom(""); setPTo("");
      setCompareWith(null); setCompareQuery("");
    }
  }, [open, initialCode, initialName]);

  // Reset date range + compare when changing product
  useEffect(() => { setPFrom(""); setPTo(""); setCompareWith(null); setCompareQuery(""); }, [selected?.code, selected?.name]);

  function setQuickRange(days) {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromD = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setPFrom(fromD.toISOString().slice(0, 10));
    setPTo(to);
  }
  function clearRange() { setPFrom(""); setPTo(""); }
  const isRangeActive = !!(pFrom || pTo);

  const productList = useMemo(() => {
    if (!open) return [];
    const map = new Map();
    for (const rep of returnsData) {
      for (const it of (rep.items || [])) {
        const code = (it.itemCode || "").trim();
        const name = (it.productName || "").trim();
        if (!code && !name) continue;
        const key = `${code.toLowerCase()}||${name.toLowerCase()}`;
        if (!map.has(key)) map.set(key, { code, name, count: 0, dates: new Set() });
        const e = map.get(key);
        e.count += 1;
        e.dates.add(rep.reportDate);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [returnsData, open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || selected) return [];
    return productList.filter((p) =>
      p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query, productList, selected]);

  const insights = useMemo(() => {
    if (!selected || !open) return null;
    const codeN = (selected.code || "").trim().toLowerCase();
    const nameN = (selected.name || "").trim().toLowerCase();
    const occurrences = [];
    let returnsCount = 0, totalKg = 0, totalPcs = 0;
    let condCount = 0, condKg = 0;
    let useProd = 0, market = 0, marketKg = 0, disposed = 0, disposedKg = 0, sepExp = 0;
    const posMap = {}, originMap = {}, actionMap = {}, expiryMap = {};
    const dailyData = new Map();
    let totalAcrossAllTime = 0;
    for (const rep of returnsData) {
      const date = rep.reportDate;
      const inner = changeMapByDate.get(date) || new Map();
      const inRange = (!pFrom || date >= pFrom) && (!pTo || date <= pTo);
      for (const it of (rep.items || [])) {
        const c = (it.itemCode || "").trim().toLowerCase();
        const n = (it.productName || "").trim().toLowerCase();
        if (c !== codeN || n !== nameN) continue;
        totalAcrossAllTime += 1;
        if (!inRange) continue;
        returnsCount += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) totalKg += q;
        else if (isPcsType(it.qtyType)) totalPcs += q;
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        if (act) actionMap[act] = (actionMap[act] || 0) + 1;
        if (isCondemnation(act)) {
          condCount += 1;
          if (isKgType(it.qtyType)) condKg += q;
        }
        if ((act || "").toLowerCase() === "use in production") useProd += 1;
        if ((act || "").toLowerCase() === "separated expired shelf") sepExp += 1;
        if (isSendToMarket(act)) {
          market += 1;
          if (isKgType(it.qtyType)) marketKg += q;
        }
        if (isDisposed(act)) {
          disposed += 1;
          if (isKgType(it.qtyType)) disposedKg += q;
        }
        const pos = safeButchery(it) || "—";
        const origin = it.origin || "—";
        posMap[pos] = (posMap[pos] || 0) + 1;
        originMap[origin] = (originMap[origin] || 0) + 1;
        if (it.expiry) expiryMap[it.expiry] = (expiryMap[it.expiry] || 0) + 1;
        const cur = dailyData.get(date) || { items: 0, kg: 0, pcs: 0, condCount: 0, condKg: 0, posSet: new Set() };
        cur.items += 1;
        if (isKgType(it.qtyType)) cur.kg += q;
        else if (isPcsType(it.qtyType)) cur.pcs += q;
        if (isCondemnation(act)) {
          cur.condCount += 1;
          if (isKgType(it.qtyType)) cur.condKg += q;
        }
        cur.posSet.add(pos);
        dailyData.set(date, cur);
        occurrences.push({ ...it, date, currentAction: act, hasChange: !!ch && ch.to === actionText(it) });
      }
    }
    const audit = [];
    for (const [k, arr] of (auditTrailByKey || new Map()).entries()) {
      const parts = k.split("|");
      if ((parts[0] || "") === codeN && (parts[1] || "") === nameN) {
        for (const x of arr) {
          if ((!pFrom || x.date >= pFrom) && (!pTo || x.date <= pTo)) {
            audit.push({ ...x, fullKey: k });
          }
        }
      }
    }
    audit.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const dates = Array.from(dailyData.keys()).sort();
    return {
      returnsCount,
      totalAcrossAllTime,
      totalKg: Math.round(totalKg * 100) / 100,
      totalPcs,
      condCount,
      condKg: Math.round(condKg * 100) / 100,
      useProd, sepExp,
      market, marketKg: Math.round(marketKg * 100) / 100,
      disposed, disposedKg: Math.round(disposedKg * 100) / 100,
      posTop: Object.entries(posMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      originTop: Object.entries(originMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      actionTop: Object.entries(actionMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      expiryTop: Object.entries(expiryMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
      daily: dates.map((d) => {
        const x = dailyData.get(d);
        return {
          label: d,
          value: x.items,
          kg: Math.round(x.kg * 100) / 100,
          pcs: x.pcs,
          condCount: x.condCount,
          condKg: Math.round(x.condKg * 100) / 100,
          posList: Array.from(x.posSet),
        };
      }),
      dailyKg: dates.map((d) => ({ label: d, value: Math.round((dailyData.get(d)?.kg || 0) * 100) / 100 })),
      occurrences: occurrences.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      audit,
      firstSeen: dates[0],
      lastSeen: dates[dates.length - 1],
      uniqueDates: dates.length,
    };
  }, [selected, returnsData, changeMapByDate, auditTrailByKey, open, pFrom, pTo]);

  /* Global maxes for DNA normalization */
  const productMaxes = useMemo(() => {
    if (!open) return { vol: 1, pos: 1, origin: 1 };
    const stats = new Map();
    for (const rep of returnsData) {
      for (const it of (rep.items || [])) {
        const c = (it.itemCode || "").trim().toLowerCase();
        const n = (it.productName || "").trim().toLowerCase();
        if (!c && !n) continue;
        const k = `${c}||${n}`;
        const e = stats.get(k) || { vol: 0, pos: new Set(), origin: new Set() };
        e.vol += 1;
        e.pos.add(safeButchery(it) || "—");
        e.origin.add(it.origin || "—");
        stats.set(k, e);
      }
    }
    let mv = 1, mp = 1, mo = 1;
    for (const e of stats.values()) {
      if (e.vol > mv) mv = e.vol;
      if (e.pos.size > mp) mp = e.pos.size;
      if (e.origin.size > mo) mo = e.origin.size;
    }
    return { vol: mv, pos: mp, origin: mo };
  }, [returnsData, open]);

  function dnaFor(insightsObj) {
    if (!insightsObj || insightsObj.returnsCount === 0) return null;
    const total = insightsObj.returnsCount || 1;
    const lastDate = insightsObj.lastSeen ? new Date(insightsObj.lastSeen) : null;
    const today = new Date();
    const daysSince = lastDate ? Math.max(0, Math.round((today - lastDate) / (24 * 60 * 60 * 1000))) : 999;
    return {
      condemn: (insightsObj.condCount / total) * 100,
      useProd: (insightsObj.useProd / total) * 100,
      posSpread: (insightsObj.posTop.length / productMaxes.pos) * 100,
      originSpread: (insightsObj.originTop.length / productMaxes.origin) * 100,
      volume: (insightsObj.returnsCount / productMaxes.vol) * 100,
      recency: Math.max(0, 100 - (daysSince / 365) * 100),
    };
  }

  const dnaPrimary = useMemo(() => dnaFor(insights), [insights, productMaxes]);

  /* Compute secondary insights for compareWith */
  const compareInsights = useMemo(() => {
    if (!compareWith || !open) return null;
    const codeN = (compareWith.code || "").trim().toLowerCase();
    const nameN = (compareWith.name || "").trim().toLowerCase();
    let returnsCount = 0;
    let condCount = 0, useProd = 0;
    const posSet = new Set(), originSet = new Set();
    let lastSeen = "";
    for (const rep of returnsData) {
      const date = rep.reportDate;
      const inner = changeMapByDate.get(date) || new Map();
      for (const it of (rep.items || [])) {
        const c = (it.itemCode || "").trim().toLowerCase();
        const n = (it.productName || "").trim().toLowerCase();
        if (c !== codeN || n !== nameN) continue;
        returnsCount += 1;
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        if (isCondemnation(act)) condCount += 1;
        if ((act || "").toLowerCase() === "use in production") useProd += 1;
        posSet.add(safeButchery(it) || "—");
        originSet.add(it.origin || "—");
        if (!lastSeen || date > lastSeen) lastSeen = date;
      }
    }
    return {
      returnsCount, condCount, useProd, lastSeen,
      posTop: Array.from(posSet).map((label) => ({ label, value: 0 })),
      originTop: Array.from(originSet).map((label) => ({ label, value: 0 })),
    };
  }, [compareWith, returnsData, changeMapByDate, open]);

  const dnaSecondary = useMemo(() => dnaFor(compareInsights), [compareInsights, productMaxes]);

  /* Compare autocomplete matches */
  const compareMatches = useMemo(() => {
    const q = compareQuery.trim().toLowerCase();
    if (!q || compareWith) return [];
    return productList.filter((p) => {
      if (selected && p.code === selected.code && p.name === selected.name) return false;
      return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
    }).slice(0, 8);
  }, [compareQuery, productList, compareWith, selected]);

  function exportProductCSV() {
    if (!insights || !selected) return;
    const head = ["DATE", "ITEM CODE", "PRODUCT", "ORIGIN", "POS", "TRANSFER NO", "QUANTITY", "QTY TYPE", "EXPIRY", "REMARKS", "CURRENT ACTION"];
    const rows = insights.occurrences.map((r) => [
      r.date, r.itemCode || "", r.productName || "", r.origin || "", safeButchery(r) || "", r.transferNo || "",
      r.quantity ?? "", (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || ""),
      r.expiry || "", r.remarks || "", r.currentAction || "",
    ]);
    const csv = "﻿" + [head, ...rows].map((row) => row.map((v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `product_${(selected.code || selected.name).slice(0, 30).replace(/[^a-z0-9]+/gi, "_")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!open) return null;
  return (
    <ModalShell open={open} onClose={onClose} title="Product Insights" width={1200}>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <FiSearch size={14} color={T.textS} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          ref={inputRef}
          type="text"
          value={selected ? `${selected.code ? selected.code + " · " : ""}${selected.name}` : query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder="Search by item code or product name…"
          style={{ ...sx.input, paddingLeft: 36, paddingRight: 80, width: "100%", fontSize: 14 }}
          readOnly={!!selected}
        />
        {selected && (
          <button onClick={() => { setSelected(null); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            ...sx.btn, padding: "6px 10px", fontSize: 12,
          }}>Change</button>
        )}
        {matches.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            ...sx.card, padding: 6, maxHeight: 320, overflow: "auto",
            boxShadow: "0 12px 28px rgba(15,23,42,.18)",
          }}>
            {matches.map((m, i) => (
              <button key={i} onClick={() => { setSelected({ code: m.code, name: m.name }); setQuery(""); }} style={{
                width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 6,
                background: "transparent", border: "none", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }} onMouseOver={(e) => e.currentTarget.style.background = T.bgAlt}
                 onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name || "—"}
                  </div>
                  <div style={{ ...sx.mutedS, marginTop: 2 }}>
                    {m.code ? <code style={{ fontFamily: "ui-monospace, monospace", color: T.primary }}>{m.code}</code> : <span style={{ color: T.textS }}>no code</span>}
                  </div>
                </div>
                <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe", fontSize: 11, flexShrink: 0 }}>
                  {m.count} occurrence{m.count !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selected ? (
        <div style={{ textAlign: "center", padding: 60, color: T.textM }}>
          <FiPackage size={36} style={{ opacity: 0.25 }} />
          <div style={{ marginTop: 12, fontWeight: 700, color: T.text }}>Search a product</div>
          <div style={{ ...sx.mutedS, marginTop: 4 }}>
            Type item code or product name to see full insights.
          </div>
          {productList.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ ...sx.h3, marginBottom: 8 }}>Most frequent products</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 520, margin: "0 auto" }}>
                {productList.slice(0, 6).map((p, i) => (
                  <button key={i} onClick={() => setSelected({ code: p.code, name: p.name })} style={{
                    ...sx.btn, justifyContent: "space-between", padding: "8px 12px", textAlign: "left",
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>{p.name || p.code || "—"}</span>
                    <span style={{ ...sx.mutedS, fontWeight: 700 }}>{p.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !insights || (insights.returnsCount === 0 && insights.totalAcrossAllTime === 0) ? (
        <div style={{ textAlign: "center", padding: 50, color: T.textM }}>
          <FiAlertTriangle size={28} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontWeight: 600 }}>No data found for this product.</div>
        </div>
      ) : insights.returnsCount === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: T.textM }}>
          <FiCalendar size={28} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontWeight: 700, color: T.text }}>No occurrences in this date range.</div>
          <div style={{ ...sx.mutedS, marginTop: 4 }}>
            This product has {insights.totalAcrossAllTime} occurrence{insights.totalAcrossAllTime !== 1 ? "s" : ""} outside the selected range.
          </div>
          <button onClick={clearRange} style={{
            ...sx.btn, marginTop: 14, padding: "8px 14px",
            background: T.primary, color: "#fff", borderColor: T.primary, fontWeight: 700,
          }}><FiX size={13} /> Clear date range</button>
        </div>
      ) : (
        <div>
          {/* Product header */}
          <div style={{
            ...sx.card, padding: "14px 16px", marginBottom: 12, background: T.cardAlt,
            borderColor: T.primary, borderWidth: 1, borderLeft: `4px solid ${T.primary}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{selected.name || "—"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {selected.code && (
                    <span style={{ ...sx.pill, background: T.primaryS, color: T.primary, borderColor: "#c7d2fe" }}>
                      <code style={{ fontFamily: "ui-monospace, monospace" }}>{selected.code}</code>
                    </span>
                  )}
                  <span style={{ ...sx.pill }}>
                    {isRangeActive ? "First (range): " : "First: "}{insights.firstSeen || "—"}
                  </span>
                  <span style={{ ...sx.pill }}>
                    {isRangeActive ? "Last (range): " : "Last: "}{insights.lastSeen || "—"}
                  </span>
                  <span style={{ ...sx.pill }}>
                    {insights.uniqueDates} day{insights.uniqueDates !== 1 ? "s" : ""}
                  </span>
                  {isRangeActive && (
                    <span style={{ ...sx.pill, background: T.warningS, color: T.warning, borderColor: "#fde68a" }}>
                      <FiCalendar size={11} /> {insights.returnsCount} of {insights.totalAcrossAllTime} in range
                    </span>
                  )}
                </div>
              </div>
              <button onClick={exportProductCSV} style={{
                ...sx.btn, padding: "8px 12px", fontSize: 13,
              }}><FiDownload size={13} /> Export CSV</button>
            </div>
          </div>

          {/* ✅ Date range filter for this product */}
          <div style={{
            ...sx.card, padding: "10px 14px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            background: isRangeActive ? T.primaryS : T.card,
            borderColor: isRangeActive ? "#c7d2fe" : T.border,
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.textM, fontWeight: 700, fontSize: 13 }}>
              <FiCalendar size={14} /> Date range:
            </div>
            <input
              type="date" value={pFrom} onChange={(e) => setPFrom(e.target.value)}
              style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }}
            />
            <span style={{ color: T.textS }}>→</span>
            <input
              type="date" value={pTo} onChange={(e) => setPTo(e.target.value)}
              style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }}
            />
            <button onClick={() => setQuickRange(7)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>7d</button>
            <button onClick={() => setQuickRange(30)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>30d</button>
            <button onClick={() => setQuickRange(90)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>90d</button>
            <button onClick={() => setQuickRange(365)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>1y</button>
            {isRangeActive && (
              <button onClick={clearRange} style={{
                ...sx.btn, padding: "6px 10px", fontSize: 12,
                background: T.dangerS, color: T.danger, borderColor: "#fecaca",
              }}><FiX size={12} /> Clear</button>
            )}
            {isRangeActive && (
              <span style={{ ...sx.mutedS, marginLeft: "auto", fontWeight: 700 }}>
                Filtering all stats, charts, audit trail & occurrences
              </span>
            )}
          </div>

          {/* Stat strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            <StatChip icon={FiPackage} label="Total returns" value={insights.returnsCount}
              sub={`${insights.totalKg} kg · ${insights.totalPcs} pcs`} />
            <StatChip icon={FiAlertTriangle} label="Condemned" value={insights.condCount}
              sub={`${insights.condKg} kg`} color={T.danger} bg={T.dangerS} />
            <StatChip icon={FiZap} label="Use in prod" value={insights.useProd}
              sub={`${insights.sepExp} sep. expired`} color={T.purple} bg={T.purpleS} />
            <StatChip icon={FiTrendingUp} label="Send to market" value={insights.market}
              sub={`${insights.marketKg} kg`} color={T.success} bg={T.successS} />
            <StatChip icon={FiTrash2} label="Disposed" value={insights.disposed}
              sub={`${insights.disposedKg} kg`} color={T.warning} bg={T.warningS} />
          </div>

          {/* Product DNA fingerprint */}
          <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FiTarget size={16} color={T.primary} />
                <h2 style={sx.h2}>Product DNA</h2>
                <span style={{ ...sx.mutedS }}>radar of behavior across 6 dimensions</span>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                {compareWith ? (
                  <>
                    <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0" }}>
                      vs {compareWith.name?.slice(0, 20) || compareWith.code}
                    </span>
                    <button onClick={() => { setCompareWith(null); setCompareQuery(""); }} style={{
                      ...sx.btn, padding: "4px 8px", fontSize: 11,
                    }}><FiX size={11} /> Remove</button>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={compareQuery}
                      onChange={(e) => setCompareQuery(e.target.value)}
                      placeholder="Compare with…"
                      style={{ ...sx.input, padding: "6px 10px", fontSize: 12, width: 200 }}
                    />
                    {compareMatches.length > 0 && (
                      <div style={{
                        position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
                        ...sx.card, padding: 6, width: 280, maxHeight: 240, overflow: "auto",
                        boxShadow: "0 12px 28px rgba(15,23,42,.18)",
                      }}>
                        {compareMatches.map((m, i) => (
                          <button key={i} onClick={() => { setCompareWith({ code: m.code, name: m.name }); setCompareQuery(""); }} style={{
                            width: "100%", textAlign: "left", padding: "6px 8px", borderRadius: 6,
                            background: "transparent", border: "none", cursor: "pointer",
                            display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", fontSize: 12,
                          }} onMouseOver={(e) => e.currentTarget.style.background = T.bgAlt}
                             onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}>
                              {m.name || m.code || "—"}
                            </span>
                            <span style={{ ...sx.mutedS, flexShrink: 0 }}>{m.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <ProductDNA primary={dnaPrimary} secondary={dnaSecondary} size={300} />
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, fontSize: 12 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: T.primary }} />
                <strong>{selected.name?.slice(0, 24) || selected.code}</strong>
              </span>
              {compareWith && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: T.success }} />
                  <strong>{compareWith.name?.slice(0, 24) || compareWith.code}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Charts row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>Returns over time</div>
              {insights.daily.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <Sparkline
                    data={insights.daily}
                    width={Math.max(500, insights.daily.length * 22)}
                    height={120}
                    color={T.primary}
                    fill={T.primaryS}
                    interactive
                    renderTooltip={(d) => (
                      <>
                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                          <FiCalendar size={11} /> {d.label}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontSize: 12 }}>
                          <span style={{ opacity: 0.7 }}>Returns</span>
                          <span style={{ fontWeight: 700, textAlign: "right" }}>{d.value}</span>
                          {d.kg > 0 && <>
                            <span style={{ opacity: 0.7 }}>Weight</span>
                            <span style={{ fontWeight: 700, textAlign: "right" }}>{fmtNum(d.kg)} kg</span>
                          </>}
                          {d.pcs > 0 && <>
                            <span style={{ opacity: 0.7 }}>Pieces</span>
                            <span style={{ fontWeight: 700, textAlign: "right" }}>{fmtNum(d.pcs, 0)}</span>
                          </>}
                          {d.condCount > 0 && <>
                            <span style={{ color: "#fca5a5" }}>Condemned</span>
                            <span style={{ fontWeight: 700, textAlign: "right", color: "#fca5a5" }}>
                              {d.condCount}{d.condKg > 0 ? ` · ${fmtNum(d.condKg)} kg` : ""}
                            </span>
                          </>}
                          {d.posList && d.posList.length > 0 && <>
                            <span style={{ opacity: 0.7 }}>POS</span>
                            <span style={{ fontWeight: 700, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={d.posList.join(", ")}>
                              {d.posList.length === 1 ? d.posList[0] : `${d.posList.length} locations`}
                            </span>
                          </>}
                        </div>
                      </>
                    )}
                  />
                </div>
              ) : <div style={{ ...sx.muted, textAlign: "center", padding: 20 }}>No data.</div>}
            </div>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>By POS</div>
              <HBarList items={insights.posTop.slice(0, 6)} color={T.primary} />
            </div>
          </div>

          {/* Charts row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>By Origin</div>
              <HBarList items={insights.originTop.slice(0, 6)} color={T.success} />
            </div>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>By Action (latest)</div>
              <HBarList items={insights.actionTop.slice(0, 6)} color={T.danger} />
            </div>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>Top Expiry dates</div>
              {insights.expiryTop.length > 0 ? (
                <HBarList items={insights.expiryTop} color={T.warning} />
              ) : <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>No data.</div>}
            </div>
          </div>

          {/* Audit trail */}
          {insights.audit.length > 0 && (
            <div style={{ ...sx.card, padding: 14, marginBottom: 12 }}>
              <div style={{ ...sx.h3, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <FiClock size={13} /> Audit trail · {insights.audit.length} change{insights.audit.length !== 1 ? "s" : ""}
              </div>
              <div style={{ position: "relative", paddingLeft: 22, maxHeight: 260, overflow: "auto" }}>
                <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: T.border }} />
                {insights.audit.map((ch, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 10, paddingLeft: 16 }}>
                    <div style={{
                      position: "absolute", left: -2, top: 6, width: 12, height: 12, borderRadius: 999,
                      background: i === insights.audit.length - 1 ? T.primary : T.card,
                      border: `2px solid ${T.primary}`,
                    }} />
                    <div style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe", fontSize: 11 }}>
                          <FiCalendar size={10} /> {ch.date}
                        </span>
                        <span style={sx.mutedS}>{formatChangeDate(ch)}</span>
                      </div>
                      <div>
                        <span style={{ color: T.textM, textDecoration: "line-through" }}>{ch.from || "(empty)"}</span>
                        <span style={{ margin: "0 6px", color: T.primary, fontWeight: 700 }}>→</span>
                        <span style={{ fontWeight: 700, color: T.text }}>{ch.to || "(empty)"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occurrences table */}
          <div style={{ ...sx.card, padding: 14 }}>
            <div style={{ ...sx.h3, marginBottom: 10 }}>All occurrences · {insights.occurrences.length}</div>
            <div style={{ overflow: "auto", maxHeight: 360 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.bgAlt }}>
                    {["Date", "POS", "Origin", "Qty", "Type", "Expiry", "Remarks", "Current Action"].map((h) => (
                      <th key={h} style={{
                        padding: "8px", textAlign: "left", fontSize: 10, fontWeight: 700,
                        color: T.textM, textTransform: "uppercase", letterSpacing: ".04em",
                        borderBottom: `1px solid ${T.border}`,
                        position: "sticky", top: 0, background: T.bgAlt, zIndex: 5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insights.occurrences.map((r, i) => {
                    const qtyType = (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || "");
                    return (
                      <tr key={i}>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 600 }}>{r.date}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{safeButchery(r) || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{r.origin || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.quantity ?? ""}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{qtyType}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, color: T.textM }}>{r.expiry || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, color: T.textM, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.remarks}>{r.remarks || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 600 }}>
                          {r.currentAction || "—"}
                          {r.hasChange && <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0", marginLeft: 6, fontSize: 10 }}>changed</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* ============================================================
   Modals
   ============================================================ */
function ModalShell({ open, onClose, title, children, width = 440 }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,.5)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...sx.card, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 20px 50px rgba(15,23,42,.25)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={sx.h2}>{title}</div>
          <button onClick={onClose} style={{ ...sx.btnGhost, padding: 4, cursor: "pointer", color: T.textM }}>
            <FiX size={18} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

function PasswordModal({ show, onSubmit, onCancel, title = "Enter Password" }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { if (show) { setVal(""); setErr(""); } }, [show]);
  return (
    <ModalShell open={show} onClose={onCancel} title={title} width={380}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password" autoFocus value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(val, setErr); }}
          placeholder="Enter password…"
          style={{ ...sx.input, padding: "10px 14px" }}
        />
        {err && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <IconBtn onClick={onCancel}>Cancel</IconBtn>
          <PrimaryBtn icon={FiLock} onClick={() => onSubmit(val, setErr)}>Confirm</PrimaryBtn>
        </div>
      </div>
    </ModalShell>
  );
}

function ImageViewerModal({ open, images = [], title = "", onClose }) {
  const [preview, setPreview] = useState(images[0] || "");
  useEffect(() => { if (open) setPreview(images[0] || ""); }, [open, images]);
  return (
    <ModalShell open={open} onClose={onClose} title={`Images${title ? ` — ${title}` : ""}`} width={1100}>
      {preview ? (
        <div style={{ marginBottom: 12 }}>
          <img src={preview} alt="preview" style={{
            width: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 10,
            border: `1px solid ${T.border}`,
          }} />
        </div>
      ) : (
        <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No images.</div>
      )}
      {images.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
          {images.map((src, i) => (
            <button key={i} onClick={() => setPreview(src)} style={{
              border: `2px solid ${preview === src ? T.primary : T.border}`,
              borderRadius: 8, padding: 0, overflow: "hidden", cursor: "pointer", background: T.card,
            }}>
              <img src={src} alt={`thumb-${i}`} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function PresetsModal({ open, onClose, presets, onApply, onDelete, onSave, currentSnapshot }) {
  const [name, setName] = useState("");
  return (
    <ModalShell open={open} onClose={onClose} title="Filter Presets" width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ ...sx.h3, marginBottom: 8 }}>Save current filters</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Preset name (e.g. Last 7 days · Beef)"
              style={{ ...sx.input, flex: 1 }}
            />
            <PrimaryBtn icon={FiSave} onClick={() => { if (!name.trim()) return; onSave(name.trim(), currentSnapshot); setName(""); }}>
              Save
            </PrimaryBtn>
          </div>
        </div>
        <hr style={sx.divider} />
        <div>
          <div style={{ ...sx.h3, marginBottom: 8 }}>Saved presets</div>
          {presets.length === 0 ? (
            <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>No presets yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {presets.map((p, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.cardAlt,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{p.name}</div>
                    <div style={{ ...sx.mutedS, marginTop: 2 }}>
                      {[
                        p.from || p.to ? `${p.from || "…"} → ${p.to || "…"}` : null,
                        p.posSel?.length ? `POS: ${p.posSel.length}` : null,
                        p.originSel?.length ? `Origin: ${p.originSel.length}` : null,
                        p.actionSel?.length ? `Action: ${p.actionSel.length}` : null,
                      ].filter(Boolean).join(" · ") || "Empty"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconBtn icon={FiCheck} onClick={() => { onApply(p); onClose(); }} title="Apply">Apply</IconBtn>
                    <IconBtn icon={FiTrash2} onClick={() => onDelete(i)} danger title="Delete" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* Inline toast — minimal */
function useToast() {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, msg, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const Toaster = (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 10000,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {items.map((t) => {
        const colors = {
          ok: { bg: T.successS, fg: T.success, bd: "#a7f3d0" },
          err: { bg: T.dangerS, fg: T.danger, bd: "#fecaca" },
          info: { bg: T.infoS, fg: T.info, bd: "#a5f3fc" },
        }[t.kind] || { bg: T.cardAlt, fg: T.text, bd: T.border };
        return (
          <div key={t.id} style={{
            background: colors.bg, color: colors.fg,
            border: `1px solid ${colors.bd}`, borderRadius: 10, padding: "10px 14px",
            fontWeight: 600, fontSize: 13, boxShadow: "0 4px 12px rgba(15,23,42,.08)",
            minWidth: 220, display: "flex", alignItems: "center", gap: 8,
          }}>
            {t.kind === "ok" ? <FiCheck size={16} /> : t.kind === "err" ? <FiAlertTriangle size={16} /> : <FiInfo size={16} />}
            {t.msg}
          </div>
        );
      })}
    </div>
  );
  return { push, Toaster };
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
const ALL_COLUMNS = [
  { key: "sl",          label: "SL", sortable: false, always: true, width: 50 },
  { key: "itemCode",    label: "ITEM CODE", sortable: true,  width: 110 },
  { key: "productName", label: "PRODUCT NAME", sortable: true, width: 220 },
  { key: "origin",      label: "ORIGIN", sortable: true, width: 110 },
  { key: "pos",         label: "POS", sortable: true, width: 130 },
  { key: "transferNo",  label: "TRANSFER NO", sortable: true, width: 120 },
  { key: "quantity",    label: "QTY", sortable: true, width: 80 },
  { key: "qtyType",     label: "QTY TYPE", sortable: true, width: 90 },
  { key: "expiry",      label: "EXPIRY", sortable: true, width: 100 },
  { key: "remarks",     label: "REMARKS", sortable: true, width: 160 },
  { key: "action",      label: "ACTION", sortable: true, width: 200 },
];

const SEARCH_QUICK_ACTIONS = [
  { label: "Condemnation", query: "action:condemnation" },
  { label: "Missing expiry", query: "expiry:empty" },
  { label: "With images", query: "images:yes" },
  { label: "Qty > 10", query: "qty:>10" },
  { label: "KG only", query: "type:kg" },
];

export default function BrowseReturns() {
  /* --- Data --- */
  const [returnsData, setReturnsData] = useState([]);
  const [changesData, setChangesData] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");

  /* --- UI tab + view --- */
  const [tab, setTab] = useState("overview");

  /* --- Filters (shared) --- */
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [posSel, setPosSel] = useState([]);
  const [originSel, setOriginSel] = useState([]);
  const [actionSel, setActionSel] = useState([]);
  const [qtySel, setQtySel] = useState("any");
  const [hasImages, setHasImages] = useState("any");
  const [remarksState, setRemarksState] = useState("any");

  /* --- Browse view --- */
  const [selectedDate, setSelectedDate] = useState("");
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [treeHidden, setTreeHidden] = useState(() => {
    try { return localStorage.getItem(TREE_HIDDEN_KEY) === "1"; } catch { return false; }
  });
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState("day"); // "day" | "all"
  const [resPage, setResPage] = useState(1);
  const RES_PAGE_SIZE = 50;

  const [density, setDensity] = useState("comfy"); // "comfy" | "compact"
  const [groupBy, setGroupBy] = useState("none"); // "none" | "pos" | "origin" | "action"
  const [visibleCols, setVisibleCols] = useState(() => {
    const set = new Set(ALL_COLUMNS.map((c) => c.key));
    return set;
  });
  const [colsOpen, setColsOpen] = useState(false);

  /* --- Compare --- */
  const [cmpAFrom, setCmpAFrom] = useState("");
  const [cmpATo, setCmpATo] = useState("");
  const [cmpBFrom, setCmpBFrom] = useState("");
  const [cmpBTo, setCmpBTo] = useState("");

  /* --- Modals --- */
  const [pwModal, setPwModal] = useState(false);
  const [presetsModal, setPresetsModal] = useState(false);
  const [presets, setPresets] = useState(loadPresets());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerData, setViewerData] = useState({ title: "", images: [] });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);
  const [emailOpen, setEmailOpen] = useState(false);
  /* Report date awaiting an auto-opened email modal ("" = nothing pending). */
  const [pendingEmailDate, setPendingEmailDate] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productInit, setProductInit] = useState({ code: "", name: "" });

  /* --- Periodic Report (monthly / quarter / half / 9-month / yearly) --- */
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [monthlyBusy, setMonthlyBusy] = useState(false);
  const [monthlyMonth, setMonthlyMonth] = useState("");   // anchor = ending month
  const [periodType, setPeriodType] = useState("monthly");
  const [reportTab, setReportTab] = useState("scope");    // preset | scope | content | analysis | details
  /* Builder popup language — remembered between sessions. The PDF stays English. */
  const [rbLang, setRbLang] = useState(() => {
    try { return localStorage.getItem("returnsReportLang") === "ar" ? "ar" : "en"; } catch { return "en"; }
  });
  useEffect(() => {
    try { localStorage.setItem("returnsReportLang", rbLang); } catch { /* private mode */ }
  }, [rbLang]);
  const isAr = rbLang === "ar";
  /* L("key") → string; L("key", {n: 5}) fills {n} placeholders. */
  const L = useCallback((key, vars) => {
    let s = RB[key]?.[rbLang] ?? RB[key]?.en ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  }, [rbLang]);
  /* Pick the localized field off a data object ({label,labelAr} → label). */
  const LA = useCallback((obj, field) => (isAr ? (obj?.[`${field}Ar`] || obj?.[field]) : obj?.[field]) || "", [isAr]);
  /* Everything the report builder can tune. Empty arrays = "no restriction". */
  const [reportOpts, setReportOpts] = useState(() => ({ ...DEFAULT_REPORT_OPTS }));
  const setOpt = (k, v) => setReportOpts((o) => ({ ...o, [k]: v }));
  const toggleIn = (k, val) =>
    setReportOpts((o) => {
      const cur = o[k] || [];
      return { ...o, [k]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
    });

  /* --- Heatmap mode --- */
  const [heatmapMode, setHeatmapMode] = useState("items"); // "items" | "condemn"

  /* --- Time machine: asOfDate filters everything to as-of that date --- */
  const [asOfDate, setAsOfDate] = useState(""); // "" = today / no filter
  const [tmPlaying, setTmPlaying] = useState(false);

  /* --- Reviews queue (persisted in localStorage) --- */
  const [reviews, setReviews] = useState(() => {
    try { return JSON.parse(localStorage.getItem("br:reviews:v1") || "{}"); } catch { return {}; }
  });
  function persistReviews(next) {
    try { localStorage.setItem("br:reviews:v1", JSON.stringify(next)); } catch {}
  }
  function reviewKey(date, row) { return `${date}__${itemKey(row)}`; }
  function addReview(date, row) {
    const k = reviewKey(date, row);
    if (reviews[k]) return;
    const snapshot = {
      date, key: k,
      itemCode: row.itemCode || "", productName: row.productName || "",
      origin: row.origin || "", pos: safeButchery(row) || "",
      quantity: row.quantity, qtyType: row.qtyType,
      expiry: row.expiry || "", remarks: row.remarks || "",
      action: actionText(row) || "",
      status: "pending", notes: "", createdAt: Date.now(),
    };
    const next = { ...reviews, [k]: snapshot };
    setReviews(next); persistReviews(next);
    toast(`Marked for review`, "ok");
  }
  function updateReview(k, patch) {
    if (!reviews[k]) return;
    const next = { ...reviews, [k]: { ...reviews[k], ...patch } };
    setReviews(next); persistReviews(next);
  }
  function removeReview(k) {
    const { [k]: _drop, ...rest } = reviews;
    setReviews(rest); persistReviews(rest);
  }
  const reviewsArr = Object.values(reviews).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const reviewsPending = reviewsArr.filter((r) => r.status === "pending").length;

  /* --- Bulk selection (per-day) --- */
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const lastClickedRef = useRef(null);
  useEffect(() => { setSelectedRows(new Set()); lastClickedRef.current = null; }, [selectedDate]);

  /* --- Auto-refresh polling --- */
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try { return localStorage.getItem("br:autoRefresh") !== "0"; } catch { return true; }
  });
  const [pendingFetch, setPendingFetch] = useState(null); // { returns, changes }
  const [newCount, setNewCount] = useState(0);

  /* --- Toast --- */
  const { push: toast, Toaster } = useToast();

  /* --- Sort --- */
  const [sort, setSort] = useState({ key: null, dir: null });

  /* ============================================================
     Fetch
     ============================================================ */
  const reload = useCallback(async () => {
    setServerErr("");
    setLoadingServer(true);
    try {
      const [rawReturns, rawChanges] = await Promise.all([
        fetchByType("returns"),
        fetchByType("returns_changes"),
      ]);
      const normalized = normalizeReturns(rawReturns);
      setReturnsData(normalized);
      setChangesData(rawChanges);

      if (!selectedDate && normalized.length) {
        const requestedDate = (() => {
          try { return new URLSearchParams(window.location.search).get("d") || ""; }
          catch { return ""; }
        })();
        const availableDates = new Set(normalized.map((r) => r.reportDate).filter(Boolean));
        const targetDate = requestedDate && availableDates.has(requestedDate)
          ? requestedDate
          : latestReportDate(normalized);
        setSelectedDate(targetDate);
        const y = targetDate.slice(0, 4), m = targetDate.slice(5, 7);
        setOpenYears((p) => ({ ...p, [y]: true }));
        setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
      }
    } catch (e) {
      console.error(e);
      setServerErr("Failed to fetch from server.");
    } finally {
      setLoadingServer(false);
    }
  }, [selectedDate]);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  /* ============================================================
     URL state sync — read on mount, write on filter change
     ============================================================ */
  const urlReadDone = useRef(false);
  useEffect(() => {
    if (urlReadDone.current) return;
    urlReadDone.current = true;
    try {
      const p = new URLSearchParams(window.location.search);
      const v = (k) => p.get(k);
      if (v("from")) setFilterFrom(v("from"));
      if (v("to")) setFilterTo(v("to"));
      if (v("pos")) setPosSel(v("pos").split(",").filter(Boolean));
      if (v("origin")) setOriginSel(v("origin").split(",").filter(Boolean));
      if (v("action")) setActionSel(v("action").split(",").filter(Boolean));
      if (v("qty")) setQtySel(v("qty"));
      if (v("img")) setHasImages(v("img"));
      if (v("rem")) setRemarksState(v("rem"));
      if (v("q")) setSearch(v("q"));
      if (v("qs")) setSearchScope(v("qs") === "all" ? "all" : "day");
      if (v("tab")) setTab(["overview", "browse", "compare"].includes(v("tab")) ? v("tab") : "overview");
      if (v("gb")) setGroupBy(["none", "pos", "origin", "action"].includes(v("gb")) ? v("gb") : "none");
      if (v("d")) setSelectedDate(v("d"));
      /* ?email=1 — arrived from the input page's "send it now?" prompt.
         Deferred until that exact report has loaded (see effect below): the
         modal's generatePdf needs a non-null selectedReport, and the
         "selected date no longer exists" effect transiently snaps the
         selection to the latest report while data is still loading. */
      if (v("email") === "1" && v("d")) setPendingEmailDate(v("d"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!urlReadDone.current) return;
    try {
      const p = new URLSearchParams();
      if (filterFrom) p.set("from", filterFrom);
      if (filterTo) p.set("to", filterTo);
      if (posSel.length) p.set("pos", posSel.join(","));
      if (originSel.length) p.set("origin", originSel.join(","));
      if (actionSel.length) p.set("action", actionSel.join(","));
      if (qtySel !== "any") p.set("qty", qtySel);
      if (hasImages !== "any") p.set("img", hasImages);
      if (remarksState !== "any") p.set("rem", remarksState);
      if (search) p.set("q", search);
      if (searchScope !== "day") p.set("qs", searchScope);
      if (tab !== "overview") p.set("tab", tab);
      if (groupBy !== "none") p.set("gb", groupBy);
      if (selectedDate) p.set("d", selectedDate);
      const qs = p.toString();
      const path = window.location.pathname;
      const hash = window.location.hash || "";
      window.history.replaceState({}, "", qs ? `${path}?${qs}${hash}` : `${path}${hash}`);
    } catch {}
  }, [filterFrom, filterTo, posSel, originSel, actionSel, qtySel, hasImages, remarksState, search, searchScope, tab, groupBy, selectedDate]);

  function copyShareLink() {
    try {
      const url = window.location.href;
      navigator.clipboard?.writeText(url);
      toast("Link copied", "ok");
    } catch (e) {
      toast("Failed to copy", "err");
    }
  }

  function applySearchQuick(query, scope = searchScope) {
    setSearch(query);
    setSearchScope(scope);
    setResPage(1);
  }

  /* --- Bulk selection handlers --- */
  function toggleRowSelect(idx) {
    setSelectedRows((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    lastClickedRef.current = idx;
  }
  function toggleAllVisible(ids, allChecked) {
    setSelectedRows((s) => {
      const next = new Set(s);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }
  function rangeSelect(idx) {
    const last = lastClickedRef.current;
    if (last == null) { toggleRowSelect(idx); return; }
    const visibleIdx = sortedRows.map((r) => r.__i);
    const a = visibleIdx.indexOf(last);
    const b = visibleIdx.indexOf(idx);
    if (a < 0 || b < 0) { toggleRowSelect(idx); return; }
    const [from, to] = a < b ? [a, b] : [b, a];
    const range = visibleIdx.slice(from, to + 1);
    setSelectedRows((s) => {
      const next = new Set(s);
      range.forEach((i) => next.add(i));
      return next;
    });
    lastClickedRef.current = idx;
  }
  function clearSelection() { setSelectedRows(new Set()); lastClickedRef.current = null; }
  function selectAllVisibleRows() {
    setSelectedRows(new Set(sortedRows.map((r) => r.__i)));
  }

  /* Build TSV/CSV from selection */
  function buildSelectedRows() {
    if (!selectedReport) return [];
    return (selectedReport.items || [])
      .map((r, i) => ({ ...r, __i: i }))
      .filter((r) => selectedRows.has(r.__i));
  }
  function selectionToTSV() {
    const cols = visibleColumns.filter((c) => c.key !== "sl");
    const rows = buildSelectedRows();
    const head = cols.map((c) => c.label);
    const body = rows.map((r, i) => cols.map((c) => {
      if (c.key === "itemCode") return r.itemCode || "";
      if (c.key === "productName") return r.productName || "";
      if (c.key === "origin") return r.origin || "";
      if (c.key === "pos") return safeButchery(r) || "";
      if (c.key === "transferNo") return r.transferNo || "";
      if (c.key === "quantity") return r.quantity ?? "";
      if (c.key === "qtyType") return (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || "");
      if (c.key === "expiry") return r.expiry || "";
      if (c.key === "remarks") return r.remarks || "";
      if (c.key === "action") return actionText(r) || "";
      return "";
    }));
    return [head, ...body].map((row) => row.map((v) => String(v ?? "").replace(/\t/g, " ").replace(/\n/g, " ")).join("\t")).join("\n");
  }
  async function copySelectionTSV() {
    const tsv = selectionToTSV();
    try {
      await navigator.clipboard.writeText(tsv);
      toast(`${selectedRows.size} rows copied`, "ok");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = tsv; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(`${selectedRows.size} rows copied`, "ok"); }
      catch { toast("Failed to copy", "err"); }
      document.body.removeChild(ta);
    }
  }
  function exportSelectionCSV() {
    if (!selectedReport) return;
    const cols = visibleColumns.filter((c) => c.key !== "sl");
    const rows = buildSelectedRows();
    const head = cols.map((c) => c.label);
    const body = rows.map((r) => cols.map((c) => {
      if (c.key === "itemCode") return r.itemCode || "";
      if (c.key === "productName") return r.productName || "";
      if (c.key === "origin") return r.origin || "";
      if (c.key === "pos") return safeButchery(r) || "";
      if (c.key === "transferNo") return r.transferNo || "";
      if (c.key === "quantity") return r.quantity ?? "";
      if (c.key === "qtyType") return (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || "");
      if (c.key === "expiry") return r.expiry || "";
      if (c.key === "remarks") return r.remarks || "";
      if (c.key === "action") return actionText(r) || "";
      return "";
    }));
    const csv = "﻿" + [head, ...body].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`returns_${selectedReport.reportDate}_selection.csv`, csv);
    toast(`${rows.length} rows exported`, "ok");
  }

  /* ============================================================
     Auto-refresh polling — silently fetch every 5min
     ============================================================ */
  useEffect(() => {
    try { localStorage.setItem("br:autoRefresh", autoRefresh ? "1" : "0"); } catch {}
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    let alive = true;
    const tick = async () => {
      try {
        const [r, c] = await Promise.all([fetchByType("returns"), fetchByType("returns_changes")]);
        if (!alive) return;
        const normalized = normalizeReturns(r);
        const currentTotal = returnsData.reduce((s, rep) => s + (rep.items?.length || 0), 0);
        const fetchedTotal = normalized.reduce((s, rep) => s + (rep.items?.length || 0), 0);
        const currentDates = new Set(returnsData.map((rep) => rep.reportDate));
        const newDates = normalized.filter((rep) => !currentDates.has(rep.reportDate)).length;
        const delta = fetchedTotal - currentTotal;
        if (delta > 0 || newDates > 0) {
          setNewCount(Math.max(delta, newDates));
          setPendingFetch({ returns: normalized, changes: c });
        }
      } catch {}
    };
    // بدل poll كل 5 دقائق (يمنع Neon من النوم) — نفحص لحظة فتح/الرجوع للتاب فقط
    const onFocus = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener("focus", onFocus);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener("focus", onFocus);
    };
  }, [autoRefresh, returnsData]);

  function applyPendingFetch() {
    if (!pendingFetch) { reload(); return; }
    setReturnsData(pendingFetch.returns);
    setChangesData(pendingFetch.changes);
    setPendingFetch(null);
    setNewCount(0);
    toast("Updated", "ok");
  }

  /* ============================================================
     Keyboard shortcut: "/" focuses search
     ============================================================ */
  const searchInputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ============================================================
     Changes map
     ============================================================ */
  const changeMapByDate = useMemo(() => {
    const map = new Map();
    for (const rec of changesData) {
      const d = rec?.payload?.reportDate || rec?.reportDate || "";
      if (!d) continue;
      const items = Array.isArray(rec?.payload?.items) ? rec.payload.items : [];
      if (!map.has(d)) map.set(d, new Map());
      const inner = map.get(d);
      for (const ch of items) {
        const k = ch?.key;
        if (!k) continue;
        const ts = toTs(ch?.at) || 0;
        const prev = inner.get(k);
        if (!prev || ts > prev.ts) inner.set(k, { from: ch.from, to: ch.to, at: ch.at, ts });
      }
    }
    return map;
  }, [changesData]);

  /* Full audit trail per item key — across all dates */
  const auditTrailByKey = useMemo(() => {
    const map = new Map();
    for (const rec of changesData) {
      const d = rec?.payload?.reportDate || rec?.reportDate || "";
      if (!d) continue;
      const items = Array.isArray(rec?.payload?.items) ? rec.payload.items : [];
      for (const ch of items) {
        const k = ch?.key;
        if (!k) continue;
        const ts = toTs(ch?.at) || 0;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ date: d, from: ch.from, to: ch.to, at: ch.at, ts });
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }
    return map;
  }, [changesData]);

  /* ============================================================
     Filtered (date-range) reports
     ============================================================ */
  const filteredReportsAsc = useMemo(() => {
    const arr = returnsData.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      if (asOfDate && d > asOfDate) return false;
      return true;
    });
    arr.sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
    return arr;
  }, [returnsData, filterFrom, filterTo, asOfDate]);

  /* Min/max report dates for time machine slider */
  const dateBounds = useMemo(() => {
    if (returnsData.length === 0) return { min: "", max: "" };
    const dates = returnsData.map((r) => r.reportDate).filter(Boolean).sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [returnsData]);

  /* Time machine playback */
  useEffect(() => {
    if (!tmPlaying) return;
    if (!asOfDate || asOfDate >= dateBounds.max) { setTmPlaying(false); return; }
    const dates = returnsData.map((r) => r.reportDate).filter(Boolean).sort();
    const i = dates.indexOf(asOfDate);
    const next = i >= 0 ? dates[Math.min(i + 1, dates.length - 1)] : dates[0];
    const id = setTimeout(() => {
      if (next === asOfDate) setTmPlaying(false);
      else setAsOfDate(next);
    }, 400);
    return () => clearTimeout(id);
  }, [tmPlaying, asOfDate, dateBounds.max, returnsData]);

  useEffect(() => {
    if (!filteredReportsAsc.length) { setSelectedDate(""); return; }
    const still = filteredReportsAsc.some((r) => r.reportDate === selectedDate);
    if (!still) {
      const targetDate = latestReportDate(filteredReportsAsc);
      setSelectedDate(targetDate);
      const y = targetDate.slice(0, 4);
      const m = targetDate.slice(5, 7);
      setOpenYears((p) => ({ ...p, [y]: true }));
      setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    }
  }, [filteredReportsAsc, selectedDate]);

  const selectedReport = filteredReportsAsc.find((r) => r.reportDate === selectedDate) || null;

  /* Fire the deferred ?email=1 open — but only once the *requested* report is
     the selected one, so we never open the composer on the wrong day. */
  useEffect(() => {
    if (!pendingEmailDate) return;
    const target = filteredReportsAsc.find((r) => r.reportDate === pendingEmailDate);
    if (!target) return;                       // still loading, or filtered out
    if (selectedDate !== pendingEmailDate) {   // reclaim the selection first
      setSelectedDate(pendingEmailDate);
      return;
    }
    setPendingEmailDate("");
    setEmailOpen(true);
  }, [pendingEmailDate, selectedDate, filteredReportsAsc]);

  /* Months that actually contain line items, newest first, with the item count.
     A report row can exist for a date and carry zero items — anchoring the
     report on such a month produces an empty PDF, so those are excluded. */
  const monthCounts = useMemo(() => {
    const m = new Map();
    for (const rep of returnsData) {
      const mk = (rep.reportDate || "").slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(mk)) continue;
      m.set(mk, (m.get(mk) || 0) + (rep.items || []).length);
    }
    return m;
  }, [returnsData]);

  const availableMonths = useMemo(
    () => Array.from(monthCounts.entries())
      .filter(([, n]) => n > 0)
      .map(([mk]) => mk)
      .sort((a, b) => b.localeCompare(a)),
    [monthCounts]
  );

  /* Distinct scope values across the whole dataset, each with how many line
     items carry it — so the builder can show "POS 11 (312)" and sort by weight
     of evidence rather than alphabetically. */
  const reportFacets = useMemo(() => {
    const b = new Map(), p = new Map(), o = new Map(), a = new Map();
    const bump = (m, k) => { if (k) m.set(k, (m.get(k) || 0) + 1); };
    for (const rep of returnsData) {
      for (const it of (rep.items || [])) {
        bump(b, safeButchery(it) || "—");
        bump(p, (it.productName || "").trim() || "—");
        bump(o, it.origin || "—");
        bump(a, actionText(it) || "");
      }
    }
    const sorted = (m) => Array.from(m.entries())
      .map(([label, n]) => ({ label, n }))
      .sort((x, y) => y.n - x.n || x.label.localeCompare(y.label));
    return { branches: sorted(b), products: sorted(p), origins: sorted(o), actions: sorted(a) };
  }, [returnsData]);

  /* How many line items the current scope actually selects — shown live so the
     user never generates an empty report by accident. */
  const scopePreview = useMemo(() => {
    const empty = { items: 0, reports: 0, periodItems: 0, state: "nodata", blockers: [] };
    if (!monthlyOpen || !/^\d{4}-\d{2}$/.test(monthlyMonth)) return empty;
    const period = REPORT_PERIODS.find((x) => x.key === periodType) || REPORT_PERIODS[0];
    const fromKey = addMonthKey(monthlyMonth, -(period.months - 1));
    const keep = makeItemFilter(reportOpts);
    const o = reportOpts;
    const minQ = o.minQty === "" || o.minQty == null ? null : Number(o.minQty);

    /* Each ACTIVE filter dimension tested on its own, so we can name the one
       that is actually emptying the report instead of blaming "the filters". */
    const dims = [];
    if (o.branches.length) dims.push({ key: "fBranches", pass: (it) => o.branches.includes(safeButchery(it) || "—") });
    if (o.products.length) dims.push({ key: "fProducts", pass: (it) => o.products.includes((it.productName || "").trim() || "—") });
    if (o.origins.length)  dims.push({ key: "fOrigins",  pass: (it) => o.origins.includes(it.origin || "—") });
    if (o.actions.length)  dims.push({ key: "fActions",  pass: (it) => o.actions.includes(actionText(it) || "") });
    if (o.qtyType === "kg")  dims.push({ key: "unit", pass: (it) => isKgType(it.qtyType) });
    if (o.qtyType === "pcs") dims.push({ key: "unit", pass: (it) => isPcsType(it.qtyType) });
    if (o.condemnedOnly)   dims.push({ key: "condOnly", pass: (it) => isCondemnation(actionText(it)) });
    if (minQ != null && Number.isFinite(minQ)) dims.push({ key: "minQty", pass: (it) => (Number(it.quantity) || 0) >= minQ });
    const dimHits = dims.map(() => 0);

    let items = 0, reps = 0, periodItems = 0;
    for (const rep of returnsData) {
      const mk = (rep.reportDate || "").slice(0, 7);
      if (!(/^\d{4}-\d{2}$/.test(mk) && mk >= fromKey && mk <= monthlyMonth)) continue;
      const rows = rep.items || [];
      periodItems += rows.length;
      /* call keep() explicitly — Array.filter would pass the index as the
         second argument, which keep() reads as the resolved disposition. */
      let n = 0;
      for (const it of rows) {
        if (keep(it)) n++;
        dims.forEach((d, i) => { if (d.pass(it)) dimHits[i] += 1; });
      }
      if (n) { items += n; reps++; }
    }
    /* Three distinct states so the footer can say what is actually wrong:
       the period is empty, or a specific filter emptied it. */
    const state = periodItems === 0 ? "nodata" : items === 0 ? "filtered" : "ok";
    const blockers = dims
      .map((d, i) => ({ key: d.key, hits: dimHits[i] }))
      .filter((d) => d.hits === 0)
      .map((d) => d.key);
    return { items, reports: reps, periodItems, state, blockers, activeDims: dims.length };
  }, [monthlyOpen, monthlyMonth, periodType, reportOpts, returnsData]);

  /* How far the anchor month actually goes. The builder shows this BEFORE the
     report is generated, so an unfinished month is never mistaken for a crash
     in volume. */
  const anchorCoverage = useMemo(() => {
    if (!/^\d{4}-\d{2}$/.test(monthlyMonth)) return null;
    let last = "";
    for (const rep of returnsData) {
      const d = rep.reportDate || "";
      if (d.slice(0, 7) === monthlyMonth && (rep.items || []).length && d > last) last = d;
    }
    if (!last) return null;
    const [y, m] = monthlyMonth.split("-").map(Number);
    const days = new Date(y, m, 0).getDate();
    const lastDay = Number(last.slice(8, 10));
    return { last, days, lastDay, partial: lastDay < days };
  }, [monthlyMonth, returnsData]);

  /* Ranked condemnation list for the chosen period, using the LATEST disposition
     exactly like the generator does. Every active scope filter applies EXCEPT
     `products` — filtering by the current picks would collapse the list to the
     picks themselves and there would be no way to add another product. */
  const condLeaderboard = useMemo(() => {
    if (!monthlyOpen || !/^\d{4}-\d{2}$/.test(monthlyMonth)) return [];
    const period = REPORT_PERIODS.find((x) => x.key === periodType) || REPORT_PERIODS[0];
    const fromKey = addMonthKey(monthlyMonth, -(period.months - 1));
    const keep = makeItemFilter({ ...reportOpts, products: [] });
    const condM = new Map(), kgM = new Map(), nM = new Map();
    let condTotal = 0;
    for (const rep of returnsData) {
      const mk = (rep.reportDate || "").slice(0, 7);
      if (!(/^\d{4}-\d{2}$/.test(mk) && mk >= fromKey && mk <= monthlyMonth)) continue;
      const inner = changeMapByDate.get(rep.reportDate);
      for (const it of (rep.items || [])) {
        const act = (inner?.get(itemKey(it))?.to ?? actionText(it)) || "";
        if (!keep(it, act)) continue;
        const label = (it.productName || "").trim() || "—";
        nM.set(label, (nM.get(label) || 0) + 1);
        if (!isCondemnation(act)) continue;
        condM.set(label, (condM.get(label) || 0) + 1);
        condTotal++;
        if (isKgType(it.qtyType)) kgM.set(label, (kgM.get(label) || 0) + (Number(it.quantity) || 0));
      }
    }
    return Array.from(condM.entries())
      .map(([label, cond]) => {
        const n = nM.get(label) || 0;
        return {
          label, cond, n,
          kg: kgM.get(label) || 0,
          share: condTotal ? (cond * 100) / condTotal : 0,
          rate: n ? (cond * 100) / n : 0,
        };
      })
      .sort((a, b) => b.cond - a.cond || b.kg - a.kg || a.label.localeCompare(b.label));
  }, [monthlyOpen, monthlyMonth, periodType, reportOpts, returnsData, changeMapByDate]);

  /* ---- Saved report templates (server-backed; localStorage is never the store) ---- */
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [tplName, setTplName] = useState("");
  const [tplBusy, setTplBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(REPORT_TPL_TYPE)}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      setSavedTemplates(
        arr
          .map((rec) => ({ recordId: rec.id, ...(rec?.payload || {}) }))
          .filter((t) => t.name)
          .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      );
    } catch { /* templates are a convenience — never block the builder */ }
  }, []);

  async function saveTemplate() {
    const name = tplName.trim();
    if (!name) { toast(L("tplNeedName"), "err"); return; }
    setTplBusy(true);
    try {
      const payload = { name, periodType, opts: reportOpts, savedAt: Date.now() };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "returns", type: REPORT_TPL_TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTplName("");
      await loadTemplates();
      toast(L("tplSaved"), "ok");
    } catch (e) {
      console.error("[saveTemplate]", e);
      toast(L("tplFailed"), "err");
    } finally { setTplBusy(false); }
  }

  function applyTemplate(tpl) {
    /* Merge over defaults so a template saved before a new option existed
       still yields a complete, valid options object. */
    setReportOpts({
      ...DEFAULT_REPORT_OPTS,
      ...(tpl.opts || {}),
      sections: { ...DEFAULT_REPORT_OPTS.sections, ...(tpl.opts?.sections || {}) },
    });
    if (tpl.periodType && REPORT_PERIODS.some((p) => p.key === tpl.periodType)) setPeriodType(tpl.periodType);
    toast(L("tplApplied"), "ok");
  }

  async function deleteTemplate(tpl) {
    if (!tpl.recordId) return;
    if (!window.confirm(L("tplDeleteAsk"))) return;
    setTplBusy(true);
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(tpl.recordId)}`, { method: "DELETE" });
      await loadTemplates();
    } catch (e) {
      console.error("[deleteTemplate]", e);
    } finally { setTplBusy(false); }
  }

  /* ---- Delivery: e-mail + per-branch bursting ---- */
  const [mailTo, setMailTo] = useState("");
  const [mailCc, setMailCc] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailNote, setMailNote] = useState("");
  const [burstBusy, setBurstBusy] = useState(false);
  const [burstProgress, setBurstProgress] = useState("");
  const [burstRecipients, setBurstRecipients] = useState({}); // branch -> email

  /* Fire-and-forget compliance record. Written as a normal report row so the
     server's existing audit layer logs the creation with account + IP. */
  function logReportRun(info) {
    try {
      fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "returns",
          type: REPORT_LOG_TYPE,
          payload: {
            ...info,
            generatedAt: new Date().toISOString(),
            reportDate: new Date().toISOString().slice(0, 10),
          },
        }),
      }).catch(() => {});
    } catch { /* never let logging break a report */ }
  }

  const splitEmails = (s) => String(s || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

  /** POST one already-rendered PDF to the server mailer. */
  async function mailPdf({ to, cc, subject, note, filename, base64 }) {
    const res = await fetch(`${API_BASE}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to, cc, subject,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;line-height:1.7">
          ${note ? `<p>${String(note).replace(/[<>&]/g, "")}</p>` : ""}
          <p>Attached: <strong>${filename}</strong></p>
          <p style="color:#64748b;font-size:12px">Generated by the Al Mawashi returns system.</p>
        </div>`,
        attachments: [{ filename, base64, contentType: "application/pdf" }],
      }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.ok === false) {
      /* The server answers a failed send with 502 + { error, detail }, where
         `error` is a fixed code ("smtp_send_failed") and `detail` is the line
         the mail server actually said — wrong password, TLS refused, relay
         denied. Reporting the code alone turned every mail problem into the
         same unactionable message, so the detail leads and the code backs it up. */
      const code = json?.error || `HTTP ${res.status}`;
      const detail = String(json?.detail || "").trim();
      throw new Error(detail ? `${detail} (${code})` : code);
    }
    return json;
  }

  /** Generate the current report and e-mail it to the typed recipients. */
  async function emailCurrentReport() {
    const to = splitEmails(mailTo);
    if (!to.length) { toast(L("mailNeedTo"), "err"); return; }
    setBurstBusy(true);
    setBurstProgress(L("mailSending"));
    try {
      const out = await generatePeriodReport({ deliver: "blob", quiet: true });
      if (!out) { setBurstProgress(""); return; }
      await mailPdf({
        to, cc: splitEmails(mailCc),
        subject: (mailSubject.trim() || `${(reportOpts.titleOverride || "").trim() || "Returns Report"} — ${out.label}`),
        note: mailNote, filename: out.filename, base64: out.base64,
      });
      logReportRun({ filename: out.filename, delivery: "email", recipients: to, items: out.items });
      toast(L("mailSent"), "ok");
      setBurstProgress("");
    } catch (e) {
      console.error("[emailCurrentReport]", e);
      toast(`${L("mailFailed")}: ${e?.message || e}`, "err");
      setBurstProgress("");
    } finally { setBurstBusy(false); }
  }

  /**
   * Bursting — one report per branch. Each branch gets its own PDF built through
   * the same pipeline with a scope override, then either downloaded or e-mailed
   * to that branch's address.
   */
  async function runBurst(mode /* "download" | "email" */) {
    const targets = reportOpts.branches.length
      ? reportOpts.branches
      : reportFacets.branches.map((b) => b.label);
    if (!targets.length) { toast(L("burstNoBranches"), "err"); return; }

    setBurstBusy(true);
    let done = 0, skipped = 0, failed = 0;
    try {
      for (const branch of targets) {
        setBurstProgress(`${branch} — ${done + 1}/${targets.length}`);
        // eslint-disable-next-line no-await-in-loop
        const out = await generatePeriodReport({
          scopeOverride: { branches: [branch] },
          deliver: mode === "email" ? "blob" : "download",
          quiet: true,
        });
        if (!out) { skipped++; continue; }          // branch had nothing in scope
        if (mode === "email") {
          const addr = splitEmails(burstRecipients[branch] || "");
          if (!addr.length) { skipped++; continue; }
          try {
            // eslint-disable-next-line no-await-in-loop
            await mailPdf({
              to: addr, cc: splitEmails(mailCc),
              subject: `${(reportOpts.titleOverride || "").trim() || "Returns Report"} — ${branch} — ${out.label}`,
              note: mailNote, filename: out.filename, base64: out.base64,
            });
          } catch (e) { console.error("[burst mail]", branch, e); failed++; continue; }
        }
        done++;
      }
      toast(L("burstDone", { d: done, s: skipped, f: failed }), failed ? "err" : "ok");
    } finally {
      setBurstBusy(false);
      setBurstProgress("");
    }
  }

  /* Sections in render order — drives the live outline panel. */
  const activeSections = useMemo(
    () => REPORT_SECTIONS.filter((s) => reportOpts.sections[s.key]),
    [reportOpts.sections]
  );
  const activeSectionCount = activeSections.length;
  const activeScopeCount = useMemo(() => (
    reportOpts.branches.length + reportOpts.products.length +
    reportOpts.origins.length + reportOpts.actions.length +
    (reportOpts.qtyType !== "all" ? 1 : 0) +
    (reportOpts.condemnedOnly ? 1 : 0) +
    (reportOpts.minQty !== "" ? 1 : 0)
  ), [reportOpts]);

  function openMonthlyModal() {
    const fallback = availableMonths[0] || new Date().toISOString().slice(0, 7);
    const fromSel = /^\d{4}-\d{2}/.test(selectedDate) ? selectedDate.slice(0, 7) : "";
    setMonthlyMonth(fromSel && availableMonths.includes(fromSel) ? fromSel : fallback);
    setPeriodType("monthly");
    setReportTab("scope");
    setReportOpts({ ...DEFAULT_REPORT_OPTS, sections: { ...DEFAULT_REPORT_OPTS.sections } });
    setTplName("");
    loadTemplates();
    setMonthlyOpen(true);
  }

  /* ============================================================
     Hierarchy (tree)
     ============================================================ */
  const hierarchyAsc = useMemo(() => {
    const years = new Map();
    filteredReportsAsc.forEach((rep) => {
      const d = rep.reportDate;
      const y = d.slice(0, 4), m = d.slice(5, 7);
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(d);
    });
    years.forEach((months) => months.forEach((days) => days.sort((a, b) => a.localeCompare(b))));
    return Array.from(years.keys()).sort((a, b) => a.localeCompare(b)).map((y) => {
      const months = years.get(y);
      return {
        year: y,
        months: Array.from(months.keys()).sort((a, b) => a.localeCompare(b))
          .map((m) => ({ month: m, days: months.get(m) })),
      };
    });
  }, [filteredReportsAsc]);

  /* --- Date tree folding --- */
  useEffect(() => {
    try { localStorage.setItem(TREE_HIDDEN_KEY, treeHidden ? "1" : "0"); } catch {}
  }, [treeHidden]);

  const treeDayCount = useMemo(
    () => hierarchyAsc.reduce((a, y) => a + y.months.reduce((b, mo) => b + mo.days.length, 0), 0),
    [hierarchyAsc]
  );

  const allTreeOpen = useMemo(() => {
    if (!hierarchyAsc.length) return false;
    return hierarchyAsc.every(({ year, months }) =>
      openYears[year] && months.every(({ month }) => openMonths[`${year}-${month}`]));
  }, [hierarchyAsc, openYears, openMonths]);

  function collapseTreeNodes() {
    setOpenYears({});
    setOpenMonths({});
  }
  function expandTreeNodes() {
    const ys = {}, ms = {};
    hierarchyAsc.forEach(({ year, months }) => {
      ys[year] = true;
      months.forEach(({ month }) => { ms[`${year}-${month}`] = true; });
    });
    setOpenYears(ys);
    setOpenMonths(ms);
  }

  /* ============================================================
     Filter options
     ============================================================ */
  const { posOpts, originOpts, actionOpts } = useMemo(() => {
    const posSet = new Set(), originSet = new Set(), actionSet = new Set();
    for (const rep of filteredReportsAsc)
      for (const it of (rep.items || [])) {
        posSet.add(safeButchery(it) || "—");
        originSet.add(it.origin || "—");
        actionSet.add(actionText(it) || "—");
      }
    const sortFn = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
    return {
      posOpts: Array.from(posSet).sort(sortFn),
      originOpts: Array.from(originSet).sort(sortFn),
      actionOpts: Array.from(actionSet).sort(sortFn),
    };
  }, [filteredReportsAsc]);

  function rowPassesAdvanced(row) {
    const pos = safeButchery(row) || "—";
    const origin = row.origin || "—";
    const action = actionText(row) || "—";
    if (posSel.length && !posSel.includes(pos)) return false;
    if (originSel.length && !originSel.includes(origin)) return false;
    if (actionSel.length && !actionSel.includes(action)) return false;
    if (qtySel !== "any" && qtyKind(row) !== qtySel) return false;
    if (hasImages !== "any") {
      const has = Array.isArray(row.images) && row.images.length > 0;
      if (hasImages === "yes" && !has) return false;
      if (hasImages === "no" && has) return false;
    }
    const rem = (row.remarks ?? "").toString().trim();
    if (remarksState === "empty" && rem.length !== 0) return false;
    if (remarksState === "nonempty" && rem.length === 0) return false;
    return true;
  }

  function clearAllFilters() {
    setPosSel([]); setOriginSel([]); setActionSel([]);
    setQtySel("any"); setHasImages("any"); setRemarksState("any");
  }

  function clearAll() {
    clearAllFilters();
    setFilterFrom(""); setFilterTo("");
    setSearch(""); setSort({ key: null, dir: null });
  }

  function setQuickDays(days) {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromD = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setFilterFrom(fromD.toISOString().slice(0, 10));
    setFilterTo(to);
  }

  /* ============================================================
     KPI computation
     ============================================================ */
  const kpi = useMemo(() => {
    let totalItems = 0, totalQtyKg = 0, totalQtyPcs = 0;
    const posCountItems = {}, posKg = {}, posPcs = {}, byActionLatest = {};
    const condemnationNames = {}, originCountItems = {};
    let condemnationCount = 0, condemnationKg = 0, useProdCount = 0, sepExpiredCount = 0;
    let marketKg = 0, disposedCount = 0, disposedKg = 0;

    const latestActionFor = (date, row) => {
      const inner = changeMapByDate.get(date) || new Map();
      const ch = inner.get(itemKey(row));
      return ch?.to ?? actionText(row);
    };

    filteredReportsAsc.forEach((rep) => {
      const date = rep.reportDate;
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        totalItems += 1;
        const q = Number(it.quantity || 0);
        const pos = safeButchery(it) || "—";
        const origin = it.origin || "—";
        posCountItems[pos] = (posCountItems[pos] || 0) + 1;
        originCountItems[origin] = (originCountItems[origin] || 0) + 1;
        if (isKgType(it.qtyType)) { posKg[pos] = (posKg[pos] || 0) + q; totalQtyKg += q; }
        else if (isPcsType(it.qtyType)) { posPcs[pos] = (posPcs[pos] || 0) + q; totalQtyPcs += q; }

        const act = latestActionFor(date, it);
        if (act) byActionLatest[act] = (byActionLatest[act] || 0) + 1;
        if (isCondemnation(act)) {
          condemnationCount += 1;
          if (isKgType(it.qtyType)) condemnationKg += q;
          condemnationNames[(it.productName || "—").trim()] = (condemnationNames[(it.productName || "—").trim()] || 0) + 1;
        }
        if ((act || "").toLowerCase() === "use in production") useProdCount += 1;
        if ((act || "").toLowerCase() === "separated expired shelf") sepExpiredCount += 1;
        if (isSendToMarket(act) && isKgType(it.qtyType)) marketKg += q;
        if (isDisposed(act)) { disposedCount += 1; if (isKgType(it.qtyType)) disposedKg += q; }
      });
    });

    const pickMax = (obj) => {
      let bestK = "—", bestV = -Infinity;
      for (const [k, v] of Object.entries(obj)) if (v > bestV) { bestV = v; bestK = k; }
      return { key: bestK, value: bestV > 0 ? bestV : 0 };
    };
    const topKg = pickMax(posKg);
    const actionTotal = Object.values(byActionLatest).reduce((a, b) => a + b, 0) || 1;

    const topPosByItems = Object.entries(posCountItems).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    const topPosByKg = Object.entries(posKg).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
    const topOrigins = Object.entries(originCountItems).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    const topActions = Object.entries(byActionLatest).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value, percent: Math.round(value * 100 / actionTotal) }));
    const topCondemn = Object.entries(condemnationNames).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));

    return {
      totalReports: filteredReportsAsc.length, totalItems, totalQtyKg, totalQtyPcs,
      topPos: pickMax(posCountItems),
      topPosByKg: { key: topKg.key, kg: Math.round(topKg.value * 100) / 100, percent: Math.round(topKg.value * 100 / (totalQtyKg || 1)) },
      condemnation: { count: condemnationCount, percent: Math.round(condemnationCount * 100 / actionTotal), kg: Math.round(condemnationKg * 100) / 100 },
      useProd: { count: useProdCount, percent: Math.round(useProdCount * 100 / actionTotal) },
      sepExpired: { count: sepExpiredCount, percent: Math.round(sepExpiredCount * 100 / actionTotal) },
      disposed: { count: disposedCount, percent: Math.round(disposedCount * 100 / actionTotal), kg: Math.round(disposedKg * 100) / 100 },
      marketKg: Math.round(marketKg * 100) / 100,
      actionTotal,
      topPosByItems, topPosByKg2: topPosByKg, topOrigins, topActions, topCondemn,
    };
    // eslint-disable-next-line
  }, [filteredReportsAsc, changeMapByDate, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Daily metrics — items + condemnation per day (used by heatmap, sparkline, anomalies)
     ============================================================ */
  const dailyMetrics = useMemo(() => {
    return filteredReportsAsc.map((rep) => {
      const date = rep.reportDate;
      const inner = changeMapByDate.get(date) || new Map();
      let items = 0, condCount = 0, condKg = 0, kg = 0, pcs = 0;
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        items += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) kg += q;
        else if (isPcsType(it.qtyType)) pcs += q;
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        if (isCondemnation(act)) {
          condCount += 1;
          if (isKgType(it.qtyType)) condKg += q;
        }
      });
      return { date, items, condCount, condKg: Math.round(condKg * 100) / 100, kg: Math.round(kg * 100) / 100, pcs };
    });
    // eslint-disable-next-line
  }, [filteredReportsAsc, changeMapByDate, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  const timeSeries = useMemo(() => {
    return dailyMetrics.map((d) => ({
      label: d.date, value: d.items,
      condCount: d.condCount, condKg: d.condKg,
      kg: d.kg, pcs: d.pcs,
    }));
  }, [dailyMetrics]);

  /* ============================================================
     Pareto data — by Product / by POS / by Origin
     ============================================================ */
  const paretoData = useMemo(() => {
    const productMap = new Map();
    const posMap = new Map();
    filteredReportsAsc.forEach((rep) => {
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        const name = (it.productName || "—").trim();
        productMap.set(name, (productMap.get(name) || 0) + 1);
        const pos = safeButchery(it) || "—";
        posMap.set(pos, (posMap.get(pos) || 0) + 1);
      });
    });
    const toSorted = (m) => Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    return { byProduct: toSorted(productMap), byPos: toSorted(posMap) };
    // eslint-disable-next-line
  }, [filteredReportsAsc, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Sankey flows — Origin → POS → Action triplets
     ============================================================ */
  const sankeyFlows = useMemo(() => {
    const m = new Map();
    filteredReportsAsc.forEach((rep) => {
      const date = rep.reportDate;
      const inner = changeMapByDate.get(date) || new Map();
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        const origin = it.origin || "—";
        const pos = safeButchery(it) || "—";
        const ch = inner.get(itemKey(it));
        const action = ch?.to ?? actionText(it) ?? "—";
        const key = `${origin}|||${pos}|||${action}`;
        m.set(key, (m.get(key) || 0) + 1);
      });
    });
    return Array.from(m.entries()).map(([k, count]) => {
      const [origin, pos, action] = k.split("|||");
      return { origin, pos, action: action || "—", count };
    });
    // eslint-disable-next-line
  }, [filteredReportsAsc, changeMapByDate, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Auto data-quality issues — detects suspicious rows
     ============================================================ */
  const dataQualityIssues = useMemo(() => {
    const issues = {
      missingExpiry: [],
      missingProduct: [],
      qtyOutlier: [],
      qtyZero: [],
      duplicates: [],
      condemnNoQty: [],
      otherActionEmpty: [],
    };
    const dupKeyMap = new Map(); // date|key -> count
    filteredReportsAsc.forEach((rep) => {
      const date = rep.reportDate;
      const seenInDay = new Map();
      (rep.items || []).forEach((it, i) => {
        const ref = { date, idx: i, row: it };
        const q = Number(it.quantity || 0);
        if (!it.expiry || !it.expiry.trim()) issues.missingExpiry.push(ref);
        if (!it.productName || !it.productName.trim()) issues.missingProduct.push(ref);
        if (q <= 0) issues.qtyZero.push(ref);
        else if (isKgType(it.qtyType) && q > 500) issues.qtyOutlier.push({ ...ref, reason: `${q} kg` });
        else if (isPcsType(it.qtyType) && q > 1000) issues.qtyOutlier.push({ ...ref, reason: `${q} pcs` });
        const k = itemKey(it);
        const seen = seenInDay.get(k);
        if (seen) issues.duplicates.push({ ...ref, original: seen });
        else seenInDay.set(k, ref);
        const act = actionText(it);
        if (isCondemnation(act) && q === 0) issues.condemnNoQty.push(ref);
        if ((it.action === "إجراء آخر..." || it.action === "Other...") && (!it.customAction || !it.customAction.trim()))
          issues.otherActionEmpty.push(ref);
      });
    });
    const total = Object.values(issues).reduce((s, a) => s + a.length, 0);
    return { ...issues, total };
  }, [filteredReportsAsc]);

  /* ============================================================
     Anomaly detection — flag days where items or condemnation > μ + 2σ
     ============================================================ */
  const anomalies = useMemo(() => {
    const n = dailyMetrics.length;
    if (n < 4) return { dates: new Set(), top: [], stats: null };
    const stat = (vals) => {
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
      const sd = Math.sqrt(variance);
      return { mean, sd, threshold: mean + 2 * sd };
    };
    const itemsStat = stat(dailyMetrics.map((d) => d.items));
    const condStat = stat(dailyMetrics.map((d) => d.condCount));
    const flagged = [];
    const dates = new Set();
    for (const d of dailyMetrics) {
      const reasons = [];
      if (itemsStat.sd > 0 && d.items > itemsStat.threshold) {
        reasons.push({ kind: "items", value: d.items, mean: itemsStat.mean, sigma: ((d.items - itemsStat.mean) / itemsStat.sd) });
      }
      if (condStat.sd > 0 && d.condCount > condStat.threshold && d.condCount > 0) {
        reasons.push({ kind: "condemn", value: d.condCount, mean: condStat.mean, sigma: ((d.condCount - condStat.mean) / condStat.sd) });
      }
      if (reasons.length) {
        dates.add(d.date);
        flagged.push({ date: d.date, items: d.items, condCount: d.condCount, condKg: d.condKg, reasons });
      }
    }
    flagged.sort((a, b) => {
      const sa = Math.max(...a.reasons.map((r) => r.sigma));
      const sb = Math.max(...b.reasons.map((r) => r.sigma));
      return sb - sa;
    });
    return {
      dates,
      top: flagged.slice(0, 6),
      stats: {
        itemsMean: Math.round(itemsStat.mean * 10) / 10,
        itemsThreshold: Math.round(itemsStat.threshold * 10) / 10,
        condMean: Math.round(condStat.mean * 10) / 10,
        condThreshold: Math.round(condStat.threshold * 10) / 10,
      },
    };
  }, [dailyMetrics]);

  /* ============================================================
     Day search summary
     ============================================================ */
  const SEARCH_FIELDS = [
    "itemCode","productName","origin","butchery","customButchery",
    "quantity","qtyType","customQtyType","expiry","remarks","action","customAction",
    "refNo"
  ];
  function normalizeField(row, key) {
    if (key === "butchery") return safeButchery(row);
    if (key === "qtyType")
      return (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
    if (key === "action") return actionText(row);
    return row?.[key];
  }
  function isPowerQuery(q) {
    return /(\w+):/i.test((q || "").trim());
  }
  function scoreRow(row, q) {
    const trimmed = (q || "").trim();
    if (!trimmed) return { score: 0, hits: [] };
    if (isPowerQuery(trimmed)) {
      const parsed = parseSearchQuery(trimmed);
      if (!rowMatchesPower(row, parsed)) return { score: 0, hits: [] };
      const hits = [...new Set([...parsed.filters.map((f) => f.key), ...parsed.terms.map(() => "term")])];
      return { score: 1 + parsed.filters.length * 2, hits };
    }
    const needle = trimmed.toLowerCase();
    let score = 0;
    const hits = [];
    for (const f of SEARCH_FIELDS) {
      const val = (normalizeField(row, f) ?? "").toString().toLowerCase();
      if (!val) continue;
      if (val === needle) { score += 3; hits.push(f); }
      else if (val.startsWith(needle)) { score += 2; hits.push(f); }
      else if (val.includes(needle)) { score += 1; hits.push(f); }
    }
    return { score, hits: Array.from(new Set(hits)) };
  }
  function rowMatchesSearch(row, qRaw) {
    const q = (qRaw || "").trim();
    if (!q) return true;
    if (isPowerQuery(q)) {
      return rowMatchesPower(row, parseSearchQuery(q));
    }
    const needle = q.toLowerCase();
    return [
      row.itemCode, row.productName, row.origin, safeButchery(row),
      String(row.quantity ?? ""),
      (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || ""),
      row.expiry, row.remarks, actionText(row), row.transferNo,
    ].some((v) => (v ?? "").toString().toLowerCase().includes(needle));
  }

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }
  function getCellValue(row, key) {
    switch (key) {
      case "itemCode":    return row.itemCode || "";
      case "productName": return row.productName || "";
      case "origin":      return row.origin || "";
      case "pos":         return safeButchery(row) || "";
      case "transferNo":  return row.transferNo || "";
      case "quantity":    return Number(row.quantity || 0);
      case "qtyType":     return (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
      case "expiry":      return row.expiry || "";
      case "remarks":     return row.remarks || "";
      case "action":      return actionText(row) || "";
      default:            return "";
    }
  }

  const sortedRows = useMemo(() => {
    if (!selectedReport) return [];
    let rows = (selectedReport.items || []).map((r, i) => ({ ...r, __i: i }));
    if (searchScope === "day") rows = rows.filter((r) => rowMatchesSearch(r, search));
    rows = rows.filter((r) => rowPassesAdvanced(r));
    if (!sort.key || !sort.dir) return rows;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    rows.sort((a, b) => {
      const va = getCellValue(a, sort.key), vb = getCellValue(b, sort.key);
      let cmp = sort.key === "quantity" ? (va ?? 0) - (vb ?? 0) : collator.compare(String(va ?? ""), String(vb ?? ""));
      if (cmp === 0) cmp = a.__i - b.__i;
      return sort.dir === "desc" ? -cmp : cmp;
    });
    return rows;
    // eslint-disable-next-line
  }, [selectedReport, sort, search, searchScope, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Selected day summary
     ============================================================ */
  const selectedSummary = useMemo(() => {
    if (!selectedReport) return null;
    const rows = sortedRows;
    /* Through qtyKind(), not the raw qtyType. Two things were wrong here:
       PLATE had no bucket, so a day of salad plates reported "54 other" and
       left the reader guessing at the unit; and a row whose type is "Other"
       carries its real unit in customQtyType, which the raw field never shows,
       so an Other/KG row was counted as neither kg nor plate. qtyKind reads
       both, and it is the same helper the Qty filter already uses - so the
       pills and the filter can no longer disagree about what a row is. */
    let kg = 0, pcs = 0, plate = 0, other = 0;
    rows.forEach((it) => {
      const qty = Number(it.quantity || 0);
      const kind = qtyKind(it);
      if (kind === "kg") kg += qty;
      else if (kind === "pcs") pcs += qty;
      else if (kind === "plate") plate += qty;
      else other += qty;
    });
    return { count: rows.length, total: (selectedReport.items || []).length, kg, pcs, plate, other };
  }, [selectedReport, sortedRows]);

  /* ============================================================
     Group-by data
     ============================================================ */
  const groupedRows = useMemo(() => {
    if (groupBy === "none" || !selectedReport) return null;
    const groups = new Map();
    sortedRows.forEach((row) => {
      let key;
      if (groupBy === "pos") key = safeButchery(row) || "—";
      else if (groupBy === "origin") key = row.origin || "—";
      else if (groupBy === "action") key = actionText(row) || "—";
      else key = "—";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, rows]) => {
        let kg = 0, pcs = 0, plate = 0;
        rows.forEach((r) => {
          const q = Number(r.quantity || 0);
          const kind = qtyKind(r);
          if (kind === "kg") kg += q;
          else if (kind === "pcs") pcs += q;
          else if (kind === "plate") plate += q;
        });
        // a group that is all plates used to show no total at all
        return { key: k, rows, kg: Math.round(kg * 100) / 100, pcs, plate };
      });
  }, [groupBy, sortedRows, selectedReport]);

  /* ============================================================
     Global search across reports
     ============================================================ */
  const globalIndex = useMemo(() => {
    const out = [];
    for (const rep of filteredReportsAsc)
      (rep.items || []).forEach((row, i) => out.push({ date: rep.reportDate, row, idx: i }));
    return out;
  }, [filteredReportsAsc]);

  const globalResults = useMemo(() => {
    const q = search.trim();
    if (!q || searchScope !== "all") return [];
    const scored = globalIndex
      .filter((r) => rowPassesAdvanced(r.row))
      .map((r) => { const s = scoreRow(r.row, q); return { ...r, score: s.score, hits: s.hits }; })
      .filter((r) => r.score > 0);
    scored.sort((a, b) => b.score !== a.score ? b.score - a.score : (b.date || "").localeCompare(a.date || ""));
    return scored;
    // eslint-disable-next-line
  }, [search, searchScope, globalIndex, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  const totalPages = Math.max(1, Math.ceil(globalResults.length / RES_PAGE_SIZE));
  const pagedResults = useMemo(() => {
    const start = (resPage - 1) * RES_PAGE_SIZE;
    return globalResults.slice(start, start + RES_PAGE_SIZE);
  }, [globalResults, resPage]);

  /* ============================================================
     Compare data — period A vs B
     ============================================================ */
  function statsForRange(from, to) {
    let items = 0, kg = 0, pcs = 0, condCount = 0, condKg = 0, days = 0;
    const posMap = {}, actMap = {};
    const dailyArr = [];
    returnsData.forEach((rep) => {
      const d = rep.reportDate || "";
      if (from && d < from) return;
      if (to && d > to) return;
      days += 1;
      let dayCount = 0;
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        items += 1; dayCount += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) kg += q;
        else if (isPcsType(it.qtyType)) pcs += q;
        const pos = safeButchery(it) || "—";
        const inner = changeMapByDate.get(d) || new Map();
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        posMap[pos] = (posMap[pos] || 0) + 1;
        if (act) actMap[act] = (actMap[act] || 0) + 1;
        if (isCondemnation(act)) {
          condCount += 1;
          if (isKgType(it.qtyType)) condKg += q;
        }
      });
      dailyArr.push({ label: d, value: dayCount });
    });
    return {
      items, kg: Math.round(kg * 100) / 100, pcs, condCount,
      condKg: Math.round(condKg * 100) / 100, days,
      avgPerDay: days ? Math.round((items / days) * 10) / 10 : 0,
      topPos: Object.entries(posMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })),
      topAct: Object.entries(actMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })),
      daily: dailyArr,
    };
  }
  const cmpA = useMemo(() => statsForRange(cmpAFrom, cmpATo),
    // eslint-disable-next-line
    [returnsData, changeMapByDate, cmpAFrom, cmpATo, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);
  const cmpB = useMemo(() => statsForRange(cmpBFrom, cmpBTo),
    // eslint-disable-next-line
    [returnsData, changeMapByDate, cmpBFrom, cmpBTo, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Highlight helper
     ============================================================ */
  function highlight(text, q) {
    if (!q || !q.trim()) return String(text ?? "");
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    const parts = String(text ?? "").split(re);
    return (
      <span>
        {parts.map((p, i) =>
          re.test(p)
            ? <mark key={i} style={{ background: "#fef3c7", color: "#78350f", borderRadius: 3, padding: "0 2px" }}>{p}</mark>
            : <span key={i}>{p}</span>
        )}
      </span>
    );
  }

  /* ============================================================
     PDF / XLSX / CSV export
     ============================================================ */
  async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }
  async function ensureAutoTable() {
    if (window.jspdf?.jsPDF?.API?.autoTable) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF-AutoTable"));
      document.head.appendChild(s);
    });
  }
  async function ensureXLSX() {
    if (window.XLSX?.utils) return window.XLSX;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load XLSX"));
      document.head.appendChild(s);
    });
    return window.XLSX;
  }

  /* ===== Email helpers (Returns) ===== */
  const collectReportImages = useCallback((rep) => {
    const items = rep?.items || [];
    const urls = [];
    for (const it of items) {
      if (Array.isArray(it.images)) {
        for (const u of it.images) if (u && typeof u === "string") urls.push(u);
      }
    }
    return urls;
  }, []);

  const buildReturnsHtml = useCallback((rep, opts = {}) => {
    const date = rep?.reportDate || "—";
    /* Greeting line wants DD/MM/YYYY; reportDate is stored as YYYY-MM-DD. */
    const dateDMY = /^\d{4}-\d{2}-\d{2}$/.test(String(rep?.reportDate || ""))
      ? String(rep.reportDate).split("-").reverse().join("/")
      : date;
    const note = opts.note;
    const attCount = opts.attachmentsCount;
    const includeTable = !!opts.includeTable;
    const sortBy  = opts.sortBy  || "default";
    const groupBy = opts.groupBy || "none";

    /* Sort + group the items per the user's choice in the modal */
    const { groups, totalCount } = arrangeItems(rep?.items || [], { sortBy, groupBy });
    const isGrouped = groupBy !== "none";
    const items = rep?.items || [];

    /* Categorize action by keyword to colorize the cell — looks modern in Outlook */
    const actionColor = (a) => {
      const s = String(a || "").toLowerCase();
      if (!s) return { bg: "#f1f5f9", fg: "#64748b" };
      if (s.includes("condemn") || s.includes("إتلاف") || s.includes("اتلاف")) return { bg: "#fee2e2", fg: "#991b1b" };
      if (s.includes("production") || s.includes("إنتاج") || s.includes("انتاج")) return { bg: "#dcfce7", fg: "#166534" };
      if (s.includes("supplier") || s.includes("مورد"))                          return { bg: "#fef3c7", fg: "#92400e" };
      if (s.includes("separat") || s.includes("فصل"))                            return { bg: "#dbeafe", fg: "#1e40af" };
      return { bg: "#ede9fe", fg: "#5b21b6" };
    };

    /* Build a single row of <tr> HTML — used for both grouped and flat layouts.
       Outlook (Word engine) ignores linear-gradient / border-radius on spans, so
       rows use solid colors + the `bgcolor` attribute, and the Action pill is
       painted on the <td> itself rather than an inner <span>. */
    const cellBase = "padding:9px 12px;border-bottom:1px solid #e6ebf2;border-right:1px solid #eef2f6;font-size:12px;line-height:1.4;";
    const renderRow = (row, i) => {
      const pos = safeButchery(row) || row.pos || "";
      const qtyType = row.qtyType || "";
      const action = row.action || row.customAction || "";
      const stripe = i % 2 === 0 ? "#ffffff" : "#f6f8fb";
      const ac = actionColor(action);
      return `<tr bgcolor="${stripe}" style="background:${stripe};">
        <td align="center" bgcolor="${stripe}" style="${cellBase}font-weight:700;color:#94a3b8;">${i + 1}</td>
        <td bgcolor="${stripe}" style="${cellBase}font-weight:700;color:#0f172a;">${escapeHtml(row.productName || "—")}</td>
        <td bgcolor="${stripe}" style="${cellBase}color:#475569;">${escapeHtml(row.origin || "—")}</td>
        <td bgcolor="${stripe}" style="${cellBase}color:#0f172a;font-weight:600;">${escapeHtml(pos)}</td>
        <td align="right" bgcolor="${stripe}" style="${cellBase}font-weight:700;color:#0f172a;">${escapeHtml(row.quantity ?? "")}</td>
        <td bgcolor="${stripe}" style="${cellBase}color:#64748b;">${escapeHtml(qtyType)}</td>
        <td bgcolor="${stripe}" style="${cellBase}color:#475569;">${escapeHtml(row.expiry || "—")}</td>
        <td bgcolor="${stripe}" style="${cellBase}color:#475569;">${escapeHtml(row.remarks || "")}</td>
        <td align="center" bgcolor="${ac.bg}" style="padding:9px 12px;border-bottom:1px solid #e6ebf2;font-size:11px;font-weight:800;background:${ac.bg};color:${ac.fg};white-space:nowrap;">${escapeHtml(action) || "—"}</td>
      </tr>`;
    };

    let runningIdx = 0;
    const bodyHtml = isGrouped
      ? groups.map((g) => {
          const groupHeader = `<tr bgcolor="#1e40af" style="background:#1e40af;color:#ffffff;">
            <td colspan="9" bgcolor="#1e40af" style="padding:9px 14px;font-size:12px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#ffffff;background:#1e40af;">
              ${escapeHtml(g.label)} &nbsp;<span style="background:#3b5bdb;padding:1px 8px;font-size:11px;color:#ffffff;border-radius:8px;">${g.items.length}</span>
            </td>
          </tr>`;
          const groupRows = g.items.map((row) => renderRow(row, runningIdx++)).join("");
          return groupHeader + groupRows;
        }).join("")
      : groups[0].items.map((row, i) => renderRow(row, i)).join("");

    const noteHtml = note && String(note).trim()
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px;border-collapse:collapse;"><tr>
          <td bgcolor="#fff8e6" style="padding:14px 16px;background:#fff8e6;border-left:4px solid #f59e0b;color:#78350f;">
            <div style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Note from Inspector</div>
            <div style="font-size:14px;line-height:1.6;">${escapeHtml(note).replace(/\n/g, "<br/>")}</div>
          </td>
        </tr></table>`
      : "";

    /* Opening text: whatever the send modal resolved (template + variables),
       falling back to the built-in greeting. First line stays bold. */
    const introRaw = String(opts.intro ?? "").trim() || DEFAULT_INTRO.replace("{date}", dateDMY);
    const introLines = introRaw.split("\n");
    const introHtml = introLines
      .map((line, i) => {
        if (!line.trim()) return `<div style="height:8px;"></div>`;
        const weight = i === 0 ? "font-weight:700;" : "margin-top:2px;";
        return `<div style="${weight}">${escapeHtml(line)}</div>`;
      })
      .join("");

    const attInfo = attCount
      ? `<span style="display:inline-block;padding:8px 16px;background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;font-size:13px;color:#1e3a8a;font-weight:700;">📎 ${attCount} file(s) attached</span>`
      : "";

    /* thead cells share one solid-dark style so the header never vanishes in
       Outlook the way a gradient background does. */
    const thBase = "padding:11px 12px;font-size:11px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;color:#ffffff;background:#1e293b;border-right:1px solid #334155;";

    return `
      <div style="font-family:'Segoe UI',Inter,Roboto,Arial,sans-serif;background:#eef2f7;padding:24px 16px;color:#0f172a;">
        <div style="max-width:980px;margin:auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header band with logo (solid bg so Outlook keeps it dark) -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f172a" style="background:#0f172a;border-collapse:collapse;">
            <tr>
              <td style="padding:22px 28px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="vertical-align:middle;width:84px;">
                      <div style="background:#ffffff;border-radius:12px;padding:8px;display:inline-block;">
                        <img src="${MAWASHI_LOGO_B64}" alt="Al Mawashi" width="64" height="64" style="display:block;border-radius:6px;width:64px;height:64px;object-fit:cover;" />
                      </div>
                    </td>
                    <td style="vertical-align:middle;padding-inline-start:18px;">
                      <div style="font-size:11px;font-weight:800;letter-spacing:3px;color:#94a3b8;text-transform:uppercase;">Quality Control System</div>
                      <div style="font-size:23px;font-weight:900;margin-top:4px;letter-spacing:.5px;color:#ffffff;">Returns Report</div>
                      <div style="font-size:12px;color:#cbd5e1;margin-top:4px;">Trans Emirates Livestock Trading L.L.C.</div>
                    </td>
                    <td style="vertical-align:middle;text-align:right;">
                      <table cellpadding="0" cellspacing="0" border="0" align="right"><tr>
                        <td bgcolor="#1e293b" style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:8px 14px;text-align:center;">
                          <div style="font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Report Date</div>
                          <div style="font-size:16px;font-weight:900;margin-top:2px;color:#ffffff;">${escapeHtml(date)}</div>
                        </td>
                      </tr></table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Greeting: custom opening text from the template, else the default -->
          <div style="padding:22px 28px 6px;font-size:14px;line-height:1.7;color:#0f172a;">
            ${introHtml}
          </div>

          <!-- Metrics strip (solid bg) -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f8fb" style="background:#f6f8fb;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;border-collapse:collapse;">
            <tr>
              <td style="padding:16px 28px;vertical-align:middle;">
                <table cellpadding="0" cellspacing="0" border="0"><tr>
                  <td bgcolor="#1e40af" style="background:#1e40af;color:#ffffff;border-radius:10px;padding:8px 15px;font-weight:900;font-size:18px;">${totalCount}</td>
                  <td style="padding-inline-start:12px;vertical-align:middle;">
                    <div style="font-size:11px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Total Items</div>
                    <div style="font-size:13px;color:#0f172a;font-weight:700;margin-top:1px;">Returned for review</div>
                  </td>
                  ${isGrouped ? `<td style="padding-inline-start:12px;vertical-align:middle;"><span style="display:inline-block;padding:5px 12px;background:#ede9fe;color:#5b21b6;border:1px solid #c4b5fd;border-radius:8px;font-size:11px;font-weight:800;">Grouped by ${escapeHtml(GROUP_LABEL[groupBy]?.en || groupBy)} · ${groups.length} groups</span></td>` : ""}
                  ${sortBy !== "default" ? `<td style="padding-inline-start:8px;vertical-align:middle;"><span style="display:inline-block;padding:5px 12px;background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;border-radius:8px;font-size:11px;font-weight:800;">Sorted by ${escapeHtml(sortBy)}</span></td>` : ""}
                </tr></table>
              </td>
              <td style="padding:16px 28px;text-align:right;vertical-align:middle;">${attInfo}</td>
            </tr>
          </table>

          <!-- Body -->
          <div style="padding:22px 28px;">
            ${noteHtml}

            ${includeTable ? `
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-collapse:collapse;border:1px solid #cbd5e1;border-radius:12px;overflow:hidden;font-size:12px;margin-top:${noteHtml ? 0 : 4}px;">
                <thead>
                  <tr bgcolor="#1e293b" style="background:#1e293b;">
                    <th align="center" style="${thBase}">#</th>
                    <th align="left" style="${thBase}">Product</th>
                    <th align="left" style="${thBase}">Origin</th>
                    <th align="left" style="${thBase}">POS</th>
                    <th align="right" style="${thBase}">Qty</th>
                    <th align="left" style="${thBase}">Unit</th>
                    <th align="left" style="${thBase}">Expiry</th>
                    <th align="left" style="${thBase}">Remarks</th>
                    <th align="center" style="${thBase}border-right:none;">Action</th>
                  </tr>
                </thead>
                <tbody>${bodyHtml}</tbody>
            </table>` : `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border-collapse:collapse;"><tr>
              <td bgcolor="#f6f8fb" align="center" style="padding:24px;background:#f6f8fb;border:2px dashed #cbd5e1;border-radius:12px;">
                <div style="font-size:32px;line-height:1;">📄</div>
                <div style="margin-top:10px;color:#334155;font-weight:800;font-size:14px;">جدول المرتجعات الكامل في ملف الـ PDF المرفق</div>
                <div style="margin-top:4px;color:#64748b;font-size:12px;">${totalCount} item(s) · Full details enclosed</div>
              </td>
            </tr></table>`}
          </div>

          <!-- Footer (solid bg) -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f6f8fb" style="background:#f6f8fb;border-top:1px solid #e2e8f0;border-collapse:collapse;">
            <tr>
              <td style="padding:14px 28px;vertical-align:middle;font-size:11px;color:#64748b;font-weight:700;">Generated by Al Mawashi QCS System</td>
              <td style="padding:14px 28px;vertical-align:middle;text-align:right;font-size:10px;color:#94a3b8;letter-spacing:.5px;">Quality · Safety · Trust</td>
            </tr>
          </table>
        </div>
      </div>`;
  }, []);

  const buildReturnsText = useCallback((rep, opts = {}) => {
    const date = rep?.reportDate || "—";
    const includeTable = !!opts.includeTable;
    const sortBy  = opts.sortBy  || "default";
    const groupBy = opts.groupBy || "none";
    const { groups, totalCount } = arrangeItems(rep?.items || [], { sortBy, groupBy });
    const isGrouped = groupBy !== "none";
    const dateDMY = /^\d{4}-\d{2}-\d{2}$/.test(String(rep?.reportDate || ""))
      ? String(rep.reportDate).split("-").reverse().join("/")
      : date;
    const lines = [];
    const introRaw = String(opts.intro ?? "").trim() || DEFAULT_INTRO.replace("{date}", dateDMY);
    lines.push(...introRaw.split("\n"));
    lines.push("");
    lines.push("AL MAWASHI — RETURNS REPORT");
    lines.push("═══════════════════════════");
    lines.push(`Date: ${date}    Items: ${totalCount}`);
    if (sortBy !== "default") lines.push(`Sorted by: ${sortBy}`);
    if (isGrouped) lines.push(`Grouped by: ${groupBy}`);
    lines.push("");
    if (includeTable) {
      let n = 0;
      groups.forEach((g) => {
        if (isGrouped) {
          lines.push(`📂 ${g.label} (${g.items.length})`);
          lines.push("─".repeat(40));
        }
        g.items.forEach((row) => {
          n++;
          lines.push(`${n}. ${row.productName || "—"}`);
          lines.push(`   Origin: ${row.origin || "—"}  |  POS: ${safeButchery(row) || row.pos || "—"}`);
          lines.push(`   Qty: ${row.quantity ?? "—"} ${row.qtyType || ""}  |  Expiry: ${row.expiry || "—"}`);
          if (row.remarks) lines.push(`   Remarks: ${row.remarks}`);
          if (row.action) lines.push(`   Action: ${row.action}`);
          lines.push("");
        });
      });
    } else {
      lines.push(`📄 جدول المرتجعات الكامل (${totalCount} صنف) في ملف الـ PDF المرفق.`);
      lines.push("");
    }
    if (opts.note) {
      lines.push("Note from inspector:");
      lines.push(String(opts.note).trim());
      lines.push("");
    }
    if (opts.pdfUrl) {
      lines.push("📎 Full PDF:");
      lines.push(opts.pdfUrl);
    }
    lines.push("");
    lines.push("Generated by Al Mawashi QCS System");
    return lines.join("\n");
  }, []);

  /* NOT memoized on purpose — generatePdf must see the latest handleExportPDF
     (which closes over the current selectedReport). Memoizing this object
     froze it to the first render where selectedReport was null, so
     generatePdf returned undefined and EmailSendModal crashed on destructure. */
  const emailConfig = {
    reportTitle: "Returns Report",
    reportType:  "returns",
    /* Direct server-side SMTP send — see BrowseCustomerReturns for the pilot. */
    allowServerSend: true,
    getSubject: (rep) =>
      `[Returns] ${rep?.refNo ? `${rep.refNo} — ` : ""}Report — ${rep?.reportDate || "—"}`,
    /* Editable in the modal's Content tab; {date} fills itself in on send. */
    getDefaultIntro: () => DEFAULT_INTRO,
    generatePdf: async (rep, pdfOpts = {}) => {
      const target = rep || selectedReport;
      if (!target) throw new Error("No report selected to email");
      const result = await handleExportPDF({
        returnBlob: true,
        reportOverride: target,
        sortBy:  pdfOpts.sortBy  || "default",
        groupBy: pdfOpts.groupBy || "none",
        classification: pdfOpts.classification || "",
      });
      if (!result || !result.blob) throw new Error("PDF generation produced no blob");
      return result;
    },
    buildHtml: buildReturnsHtml,
    buildText: buildReturnsText,
    getImages: collectReportImages,
    getCertificate: () => null,
    getSummary: (rep) => ({
      fields: [
        { label: "Date", value: rep?.reportDate || "—" },
        { label: "Items", value: String(rep?.items?.length || 0) },
      ],
    }),
  };

  const handleExportPDF = async (opts = {}) => {
    /* opts.reportOverride lets the email path explicitly pass the report,
       so we never rely on the possibly-stale `selectedReport` closure. */
    const report = opts.reportOverride || selectedReport;
    if (!report) {
      console.warn("[handleExportPDF] no report available", { opts, hasSelected: !!selectedReport });
      if (opts.returnBlob) throw new Error("No report to export");
      return;
    }
    try {
      const JsPDF = await ensureJsPDF();
      await ensureAutoTable();
      const isOther = (v) => v === "إجراء آخر..." || v === "Other...";
      const actionTextSafe = (row) => isOther(row?.action) ? row?.customAction || "" : row?.action || "";
      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const marginL = 20, marginR = 20, marginTop = 80;
      const pageWidth = doc.internal.pageSize.getWidth();
      const avail = pageWidth - marginL - marginR;
      const drawHeader = () => {
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text("Returns Report", marginL, 36);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11);
        doc.text(
          `Date: ${report.reportDate}${report.refNo ? `        Ref: ${report.refNo}` : ""}`,
          marginL,
          54
        );
        const rightX = pageWidth - marginR;
        doc.setFont("helvetica", "bold"); doc.setTextColor(180, 0, 0); doc.setFontSize(18);
        doc.text("AL MAWASHI", rightX, 30, { align: "right" });
        doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text("Trans Emirates Livestock Trading L.L.C.", rightX, 46, { align: "right" });
      };
      /* Watermark for Confidential / Highly Confidential — drawn diagonal under content */
      const drawWatermark = () => {
        if (!opts.classification || opts.classification === "public" || opts.classification === "internal") return;
        const txt = opts.classification === "highly" ? "HIGHLY CONFIDENTIAL" : "CONFIDENTIAL";
        const isRed = opts.classification === "highly";
        doc.saveGraphicsState && doc.saveGraphicsState();
        try {
          doc.setGState && doc.setGState(new doc.GState({ opacity: 0.10 }));
        } catch {}
        doc.setFont("helvetica", "bold");
        doc.setFontSize(72);
        doc.setTextColor(isRed ? 220 : 180, isRed ? 38 : 120, isRed ? 38 : 30);
        const w = doc.internal.pageSize.getWidth();
        const h = doc.internal.pageSize.getHeight();
        doc.text(txt, w / 2, h / 2, { align: "center", angle: -30 });
        doc.setTextColor(0, 0, 0);
        try { doc.setGState && doc.setGState(new doc.GState({ opacity: 1 })); } catch {}
        doc.restoreGraphicsState && doc.restoreGraphicsState();
      };
      drawHeader();
      drawWatermark();
      const changeMap = changeMapByDate.get(report?.reportDate || "") || new Map();
      /* For the email path: prefer the report's full item list rather than sortedRows
         (which may be empty if the email is triggered without the view being mounted). */
      const rowsForPdf = opts.reportOverride
        ? (Array.isArray(report.items) ? report.items : [])
        : sortedRows;

      /* Apply email-modal sort + group choices (no-op when sortBy=default & groupBy=none) */
      const { groups: pdfGroups } = arrangeItems(rowsForPdf, {
        sortBy:  opts.sortBy  || "default",
        groupBy: opts.groupBy || "none",
      });
      const isGroupedPdf = (opts.groupBy || "none") !== "none";

      const buildBody = (rows, startIdx = 0) => rows.map((row, i) => {
        const pos = safeButchery(row);
        const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType || "" : row.qtyType || "";
        const curr = actionTextSafe(row);
        let actionCell = curr || "";
        const k = itemKey(row);
        const ch = changeMap.get(k);
        if (ch && (ch.to ?? "") === (curr ?? "")) {
          const dateTxt = formatChangeDatePDF(ch);
          actionCell = `${(ch.from || "").trim()} to ${(ch.to || "").trim()}${dateTxt ? `\n${dateTxt}` : ""}`;
        }
        return [String(startIdx + i + 1), row.productName || "", row.origin || "", pos || "", row.transferNo || "", String(row.quantity ?? ""), qtyType, row.expiry || "", row.remarks || "", actionCell];
      });
      const frac = [0.05, 0.16, 0.08, 0.08, 0.07, 0.06, 0.07, 0.07, 0.16, 0.19];
      const columnStyles = {};
      frac.forEach((f, idx) => (columnStyles[idx] = { cellWidth: Math.floor(avail * f) }));
      columnStyles[0].halign = "center"; columnStyles[4].halign = "center"; columnStyles[5].halign = "center"; columnStyles[6].halign = "center"; columnStyles[7].halign = "center";

      const baseTableOpts = {
        margin: { top: marginTop, left: marginL, right: marginR },
        tableWidth: avail,
        styles: { font: "helvetica", fontSize: 10, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5, halign: "left", valign: "middle", overflow: "linebreak", wordBreak: "break-word", minCellHeight: 16 },
        headStyles: { fillColor: [238, 242, 255], textColor: [15, 23, 42], fontStyle: "bold", halign: "center" },
        columnStyles,
        didDrawPage: () => { drawHeader(); drawWatermark(); },
      };

      if (isGroupedPdf) {
        /* Render one autoTable per group with a coloured banner row as a header.
           autoTable lays out sequentially, so subsequent tables continue down the page. */
        let runningStart = 0;
        pdfGroups.forEach((g, gIdx) => {
          doc.autoTable({
            ...baseTableOpts,
            head: [
              [{
                content: `📂 ${g.label}  (${g.items.length})`,
                colSpan: 10,
                styles: { fillColor: [49, 46, 129], textColor: 255, halign: "left", fontStyle: "bold", fontSize: 11 },
              }],
              ["SL", "PRODUCT", "ORIGIN", "POS", "TRN NO", "QTY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION"],
            ],
            body: buildBody(g.items, runningStart),
            startY: gIdx === 0 ? undefined : (doc.lastAutoTable?.finalY || 0) + 8,
          });
          runningStart += g.items.length;
        });
      } else {
        doc.autoTable({
          ...baseTableOpts,
          head: [["SL", "PRODUCT", "ORIGIN", "POS", "TRN NO", "QTY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION"]],
          body: buildBody(pdfGroups[0]?.items || rowsForPdf),
        });
      }
      const filename = `returns_${report.reportDate}.pdf`;
      if (opts.returnBlob) {
        const blob = doc.output("blob");
        const dataUri = doc.output("datauristring");
        const base64 = dataUri.split(",")[1] || "";
        return { blob, base64, filename };
      }
      doc.save(filename);
      toast("PDF exported", "ok");
    } catch (e) {
      console.error("[handleExportPDF] failed:", e);
      if (opts.returnBlob) throw e;
      toast("Failed to generate PDF", "err");
    }
  };

  const PDF_XLSX_COLS = ["SL.NO", "ITEM CODE", "PRODUCT NAME", "ORIGIN", "POS", "TRANSFER NO", "QUANTITY", "QTY TYPE", "EXPIRY DATE", "REMARKS", "ACTION"];

  function buildRowsForReport(rep, useFiltered = false) {
    const changeMap = changeMapByDate.get(rep?.reportDate || "") || new Map();
    const isOther = (v) => v === "إجراء آخر..." || v === "Other...";
    const actionTextSafe = (row) => isOther(row?.action) ? row?.customAction || "" : row?.action || "";
    const items = useFiltered ? sortedRows : (rep.items || []).filter(rowPassesAdvanced);
    return items.map((row, i) => {
      const pos = safeButchery(row);
      const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType || "" : row.qtyType || "";
      const curr = actionTextSafe(row);
      const k = itemKey(row);
      const ch = changeMap.get(k);
      let actionCell = curr || "";
      if (ch && (ch.to ?? "") === (curr ?? "")) {
        const dateTxt = formatChangeDatePDF(ch);
        actionCell = `${(ch.from || "").trim()} to ${(ch.to || "").trim()}${dateTxt ? ` (${dateTxt})` : ""}`;
      }
      return [i + 1, row.itemCode || "", row.productName || "", row.origin || "", pos || "", row.transferNo || "", Number(row.quantity ?? 0), qtyType || "", row.expiry || "", row.remarks || "", actionCell];
    });
  }

  function autosizeColumns(ws, data) {
    const colWidths = (data[0] || []).map((_, colIdx) => {
      let maxLen = 10;
      for (let r = 0; r < data.length; r++) {
        const len = (data[r][colIdx] == null ? 0 : String(data[r][colIdx])).length;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });
    ws["!cols"] = colWidths;
    ws["!freeze"] = { xSplit: 1, ySplit: 1 };
  }

  const handleExportXLSXSelected = async () => {
    if (!selectedReport) { toast("Select a date first", "err"); return; }
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const data = [PDF_XLSX_COLS, ...buildRowsForReport(selectedReport, true)];
      const ws = XLSX.utils.aoa_to_sheet(data);
      autosizeColumns(ws, data);
      const label = (search || posSel.length || actionSel.length || originSel.length) ? "Filtered" : selectedReport.reportDate;
      XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
      XLSX.writeFile(wb, `returns_${selectedReport.reportDate}${search ? "_filtered" : ""}.xlsx`);
      toast("XLSX exported", "ok");
    } catch (e) { console.error(e); toast("Failed to export XLSX", "err"); }
  };

  const handleExportXLSXAllLocked = () => setPwModal(true);

  const handlePasswordSubmit = async (code, setErr) => {
    if (code !== "0585446473") { setErr("Incorrect password."); return; }
    setPwModal(false);
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const all = [...returnsData].sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
      if (!all.length) { toast("No reports to export", "err"); return; }
      for (const rep of all) {
        const data = [PDF_XLSX_COLS, ...buildRowsForReport(rep, false)];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autosizeColumns(ws, data);
        XLSX.utils.book_append_sheet(wb, ws, (rep.reportDate || "DAY").slice(0, 31));
      }
      XLSX.writeFile(wb, `returns_ALL_days.xlsx`);
      toast("All reports exported", "ok");
    } catch (e) { console.error(e); toast("Failed to export ALL", "err"); }
  };

  function csvEscape(v) {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  const handleExportCSV = () => {
    if (!selectedReport) { toast("Select a date first", "err"); return; }
    const rows = [PDF_XLSX_COLS, ...buildRowsForReport(selectedReport, true)];
    const csv = "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`returns_${selectedReport.reportDate}${search ? "_filtered" : ""}.csv`, csv);
    toast("CSV exported", "ok");
  };
  const handleExportSearchCSV = () => {
    if (!globalResults.length) { toast("No results to export", "err"); return; }
    const head = ["SL.NO", "DATE", "ITEM CODE", "PRODUCT NAME", "ORIGIN", "POS", "TRANSFER NO", "QUANTITY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION", "SCORE", "MATCH IN"];
    const rows = globalResults.map((r, i) => {
      const row = r.row;
      const pos = safeButchery(row);
      const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
      return [i + 1, r.date, row.itemCode || "", row.productName || "", row.origin || "", pos || "", row.transferNo || "", Number(row.quantity ?? 0), qtyType || "", row.expiry || "", row.remarks || "", actionText(row) || "", r.score, r.hits.join(", ")];
    });
    const csv = "﻿" + [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`returns_search.csv`, csv);
    toast("Search CSV exported", "ok");
  };

  function exportSearchResultsXLSX() {
    if (!globalResults.length) { toast("No results to export", "err"); return; }
    (async () => {
      try {
        const XLSX = await ensureXLSX();
        const wb = XLSX.utils.book_new();
        const head = ["SL.NO", "DATE", "ITEM CODE", "PRODUCT NAME", "ORIGIN", "POS", "TRANSFER NO", "QUANTITY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION", "SCORE", "MATCH IN"];
        const rows = globalResults.map((r, i) => {
          const row = r.row;
          const pos = safeButchery(row);
          const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
          return [i + 1, r.date, row.itemCode || "", row.productName || "", row.origin || "", pos || "", row.transferNo || "", Number(row.quantity ?? 0), qtyType || "", row.expiry || "", row.remarks || "", actionText(row) || "", r.score, r.hits.join(", ")];
        });
        const data = [head, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autosizeColumns(ws, data);
        ws["!freeze"] = { xSplit: 1, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws, "Search_Results");
        XLSX.writeFile(wb, `returns_search_results.xlsx`);
        toast("Search XLSX exported", "ok");
      } catch (e) { console.error(e); toast("Failed to export search", "err"); }
    })();
  }

  /* ============================================================
     Print
     ============================================================ */
  const handlePrint = () => { window.print(); };

  /* ============================================================
     Periodic Report — a polished, multi-page executive PDF over a
     monthly / quarterly / half-year / 9-month / annual window that ENDS at the
     chosen anchor month. Aggregates the whole window (ignores on-screen filters):
       • Cover with hero KPIs + highlights
       • Executive summary metrics + disposition-mix donut
       • Activity bar chart (per-day for 1 month, per-month otherwise) + register
       • vs-previous-period comparison + condemnation-rate hotspots
       • Rankings: top products / POS / origins / condemned items
     ============================================================ */
  /**
   * @param {object} [run]
   * @param {object} [run.scopeOverride] extra scope merged over reportOpts — used by
   *        per-branch bursting so one branch's report reuses this whole pipeline.
   * @param {"download"|"blob"} [run.deliver] "blob" returns {filename, base64}
   *        instead of triggering a download, so the caller can e-mail it.
   * @param {boolean} [run.quiet] suppress toasts (bursting reports once at the end).
   */
  async function generatePeriodReport(run = {}) {
    const { scopeOverride = null, deliver = "download", quiet = false } = run;
    const say = (msg, kind) => { if (!quiet) toast(msg, kind); };
    const anchor = monthlyMonth;
    if (!/^\d{4}-\d{2}$/.test(anchor)) { say("Pick a month first", "err"); return null; }
    const period = REPORT_PERIODS.find((p) => p.key === periodType) || REPORT_PERIODS[0];
    const months = period.months;
    const fromKey = addMonthKey(anchor, -(months - 1));
    const toKey = anchor;
    const inRange = (mk) => /^\d{4}-\d{2}$/.test(mk) && mk >= fromKey && mk <= toKey; // YYYY-MM lexical == chronological
    const reports = returnsData
      .filter((r) => inRange((r.reportDate || "").slice(0, 7)))
      .sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
    if (!reports.length) { say("No data in the selected period", "err"); return null; }

    /* ---------- Is the anchor month still running? ----------
       A report that ends on the current month covers only part of it, and its
       last bar / its comparison against a FULL baseline both read as a collapse
       in volume. Detect the real cut-off from the data and declare it. */
    const lastDataDate = reports.reduce((mx, r) => ((r.reportDate || "") > mx ? r.reportDate : mx), "");
    const [anchorY, anchorM] = toKey.split("-").map(Number);
    const monthDays = new Date(anchorY, anchorM, 0).getDate();          // 0 = last day of anchorM
    const lastDay = lastDataDate.slice(0, 7) === toKey ? Number(lastDataDate.slice(8, 10)) : 0;
    const isPartial = lastDay > 0 && lastDay < monthDays;
    const coverageNote = isPartial
      ? `PARTIAL PERIOD — data to ${fmtDayLong(lastDataDate)} (day ${lastDay} of ${monthDays} in ${monthLabel(toKey)}); the month is not finished.`
      : "";

    /* Builder options: scope filter, section switches, sign-off details.
       A scopeOverride (bursting) narrows the scope without touching UI state. */
    const O = scopeOverride ? { ...reportOpts, ...scopeOverride } : reportOpts;
    const S = O.sections || {};
    if (!REPORT_SECTIONS.some((s) => S[s.key])) {
      say("Pick at least one section to include", "err");
      return null;
    }
    const keepItem = makeItemFilter(O);
    const scopeBits = [
      O.branches.length ? `Branch: ${O.branches.join(", ")}` : "",
      O.products.length ? `Product: ${O.products.join(", ")}` : "",
      O.origins.length ? `Origin: ${O.origins.join(", ")}` : "",
      O.actions.length ? `Disposition: ${O.actions.map((a) => a || "(blank)").join(", ")}` : "",
      O.qtyType !== "all" ? `Unit: ${O.qtyType}` : "",
      O.condemnedOnly ? "Condemned items only" : "",
      O.minQty !== "" ? `Qty >= ${O.minQty}` : "",
    ].filter(Boolean);
    const isFiltered = scopeBits.length > 0;
    /* Titles are needed by both the PDF and the Excel branch, so they live
       above the renderer rather than inside it. */
    const RTITLE = (O.titleOverride || "").trim() || period.reportTitle;
    const COVER_TITLE = (O.titleOverride || "").trim()
      ? O.titleOverride.trim().toUpperCase()
      : period.cover;

    setMonthlyBusy(true);
    try {
      const JsPDF = await ensureJsPDF();
      await ensureAutoTable();

      /* ---------- Aggregate ---------- */
      const latestActionFor = (date, row) => {
        const inner = changeMapByDate.get(date) || new Map();
        const ch = inner.get(itemKey(row));
        return ch?.to ?? actionText(row);
      };
      /* Every matching line item, kept for the optional detail annex. */
      const lineItems = [];
      let totalItems = 0, totalKg = 0, totalPcs = 0;
      let condCount = 0, condKg = 0, marketKg = 0, disposedCount = 0, disposedKg = 0, useProdCount = 0, sepExpiredCount = 0;
      const posCount = new Map(), originCount = new Map(), productCount = new Map(), condProduct = new Map(), actionCount = new Map();
      const posCond = new Map(), originCond = new Map(); // condemned counts per branch/origin (for quality-rate hotspots)
      /* Condemnation-only aggregates powering the Top Condemnation section:
         weight, which days it happened on, and which branch / origin each
         condemned product mostly came from. */
      const condProductKg = new Map(), condProductDays = new Map();
      const condProdPos = new Map(), condProdOrigin = new Map(); // product -> Map(label -> count)
      /* Extra aggregates powering the analysis sections. */
      const posKg = new Map(), originKg = new Map(), productKg = new Map();
      const weekdayCount = [0, 0, 0, 0, 0, 0, 0];        // 0 = Sunday
      const productDays = new Map();                      // product -> Set(date)
      const bump = (m, k, v) => m.set(k, (m.get(k) || 0) + v);
      /* outer Map of Maps: outer[k1][k2] += 1 */
      const bumpIn = (outer, k1, k2) => {
        let inner = outer.get(k1);
        if (!inner) { inner = new Map(); outer.set(k1, inner); }
        inner.set(k2, (inner.get(k2) || 0) + 1);
      };
      const topOf = (m) => {
        if (!m || !m.size) return "—";
        let best = "—", bv = -1;
        for (const [k, v] of m) if (v > bv) { best = k; bv = v; }
        return best;
      };
      const daily = [];
      for (const rep of reports) {
        const date = rep.reportDate;
        let dItems = 0, dKg = 0, dCond = 0;
        for (const it of (rep.items || [])) {
          /* Scope filter first — everything downstream counts only what passes. */
          const resolved = latestActionFor(date, it) || "";
          if (!keepItem(it, resolved)) continue;
          totalItems++; dItems++;
          const q = Number(it.quantity) || 0; // guard against non-numeric quantity → 0 (never NaN-poison the total)
          const pos = safeButchery(it) || "—";
          const origin = it.origin || "—";
          const prod = (it.productName || "—").trim();
          /* Collected for BOTH outputs: the PDF annex slices this to the user's
             cap, while the Excel sheet takes the lot. */
          if (lineItems.length < 50000) {
            lineItems.push([
              date, it.itemCode || "", prod, origin, pos,
              `${fmtNum(q)} ${isKgType(it.qtyType) ? "kg" : isPcsType(it.qtyType) ? "pcs" : ""}`.trim(),
              it.expiry || "", resolved || "—",
            ]);
          }
          posCount.set(pos, (posCount.get(pos) || 0) + 1);
          originCount.set(origin, (originCount.get(origin) || 0) + 1);
          productCount.set(prod, (productCount.get(prod) || 0) + 1);
          if (!productDays.has(prod)) productDays.set(prod, new Set());
          productDays.get(prod).add(date);
          const wd = new Date(`${date}T00:00:00`).getDay();
          if (Number.isFinite(wd)) weekdayCount[wd] += 1;
          if (isKgType(it.qtyType)) {
            totalKg += q; dKg += q;
            bump(posKg, pos, q); bump(originKg, origin, q); bump(productKg, prod, q);
          } else if (isPcsType(it.qtyType)) { totalPcs += q; }
          /* Only bucket items that actually carry a disposition. This mirrors the
             Overview KPI (byActionLatest), so Condemnation% here == what the user
             sees on screen. Items with a blank action are NOT in the denominator. */
          const act = resolved;
          if (act) actionCount.set(act, (actionCount.get(act) || 0) + 1);
          if (isCondemnation(act)) {
            condCount++; dCond++;
            if (isKgType(it.qtyType)) { condKg += q; bump(condProductKg, prod, q); }
            condProduct.set(prod, (condProduct.get(prod) || 0) + 1);
            posCond.set(pos, (posCond.get(pos) || 0) + 1);
            originCond.set(origin, (originCond.get(origin) || 0) + 1);
            if (!condProductDays.has(prod)) condProductDays.set(prod, new Set());
            condProductDays.get(prod).add(date);
            bumpIn(condProdPos, prod, pos);
            bumpIn(condProdOrigin, prod, origin);
          }
          if ((act || "").toLowerCase() === "use in production") useProdCount++;
          if ((act || "").toLowerCase() === "separated expired shelf") sepExpiredCount++;
          if (isSendToMarket(act) && isKgType(it.qtyType)) marketKg += q;
          if (isDisposed(act)) { disposedCount++; if (isKgType(it.qtyType)) disposedKg += q; }
        }
        /* store raw dKg — the table foot uses totalKg (= Σ dKg exactly), so the
           weight column reconciles to its total (display rounds each cell only).
           Days where the scope filter matched nothing are dropped entirely. */
        if (dItems > 0) daily.push({ date, items: dItems, kg: dKg, cond: dCond });
      }
      if (!totalItems) {
        say("No line items match the selected scope", "err");
        return null;
      }
      const actionTotal = Array.from(actionCount.values()).reduce((a, b) => a + b, 0) || 1;
      const topN = (m, n) => Array.from(m.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value).slice(0, n);
      const RANK_N = Math.max(3, Math.min(20, Number(O.topN) || 8));
      /* Rankings can be ordered by volume, by weight or by condemned count —
         "top product" means something different to ops than to finance. */
      const metric = O.rankMetric || "count";
      const metricLabel = (RANK_METRICS.find((m) => m.key === metric) || RANK_METRICS[0]).label;
      const metricFmt = metric === "kg" ? (v) => `${fmtNum(v)} kg` : (v) => String(v);
      const pickMap = (countM, kgM, condM) => (metric === "kg" ? kgM : metric === "cond" ? condM : countM);
      const topProducts = topN(pickMap(productCount, productKg, condProduct), RANK_N);
      const topPos = topN(pickMap(posCount, posKg, posCond), RANK_N);
      const topOrigins = topN(pickMap(originCount, originKg, originCond), RANK_N);
      const topCond = topN(condProduct, RANK_N);

      /* ----- Branch / origin scorecards ----- */
      const scorecard = (countM, kgM, condM) => Array.from(countM.entries())
        .map(([label, n]) => {
          const cond = condM.get(label) || 0;
          const rate = n ? (cond * 100) / n : 0;
          return {
            label, n, kg: kgM.get(label) || 0, cond,
            rate, share: totalItems ? (n * 100) / totalItems : 0,
            grade: rate >= 25 ? "D" : rate >= 15 ? "C" : rate >= 7 ? "B" : "A",
          };
        })
        .sort((a, b) => b.n - a.n);
      const branchCard = scorecard(posCount, posKg, posCond);
      const originCard = scorecard(originCount, originKg, originCond);

      /* ----- Pareto: how few products account for 80% of returns ----- */
      const paretoRows = Array.from(productCount.entries())
        .map(([label, n]) => ({ label, n }))
        .sort((a, b) => b.n - a.n);
      let running = 0;
      const paretoData = paretoRows.map((r) => {
        running += r.n;
        return { ...r, cum: totalItems ? (running * 100) / totalItems : 0 };
      });
      const vitalFew = paretoData.findIndex((r) => r.cum >= 80) + 1;

      /* ----- Repeat offenders: same product back on N or more separate days ----- */
      const minDays = Math.max(2, Number(O.minRepeatDays) || 3);
      const repeatRows = Array.from(productDays.entries())
        .map(([label, set]) => ({ label, days: set.size, n: productCount.get(label) || 0, cond: condProduct.get(label) || 0 }))
        .filter((r) => r.days >= minDays)
        .sort((a, b) => b.days - a.days || b.n - a.n)
        .slice(0, 25);

      /* ----- Day-of-week load ----- */
      const WD_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const weekdayRows = weekdayCount.map((v, i) => ({ label: WD_NAMES[i], value: v }));

      /* ----- Spike days: mean + 1.5σ over the active days ----- */
      const dayVals = daily.map((d) => d.items);
      const mean = dayVals.length ? dayVals.reduce((a, b) => a + b, 0) / dayVals.length : 0;
      const sd = dayVals.length
        ? Math.sqrt(dayVals.reduce((s, v) => s + (v - mean) ** 2, 0) / dayVals.length)
        : 0;
      const spikeCut = mean + 1.5 * sd;
      const spikeRows = daily
        .filter((d) => sd > 0 && d.items > spikeCut)
        .sort((a, b) => b.items - a.items)
        .map((d) => ({ ...d, over: mean ? Math.round(((d.items - mean) / mean) * 100) : 0 }));
      const actionsSorted = Array.from(actionCount.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
      /* Days that contain MATCHING items — `reports` is date-filtered only, so
         using it here would count days the scope filter emptied and understate
         the daily average. `daily` only receives days with dItems > 0. */
      const activeDays = daily.length;
      const avgPerDay = activeDays ? totalItems / activeDays : 0;
      const peakDay = daily.reduce((mx, d) => (d.items > mx.items ? d : mx), { items: -1, date: "" });
      /* Kept UNROUNDED — every display runs it through fmtRate, and the
         period-over-period delta is computed on the exact value. Rounding here
         printed 1018/1019 as a flat "100%". */
      const condPct = (condCount * 100) / actionTotal;
      const rangeLbl = rangeLabel(fromKey, toKey);
      const mLabel = rangeLbl; // header/footer/pill label reused across pages
      const genStamp = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai" });

      /* ---------- Activity buckets: per-day for a single month, per-month otherwise ---------- */
      const spanYears = fromKey.slice(0, 4) !== toKey.slice(0, 4);
      const shortMonth = (mk) => {
        const [yy, mm] = mk.split("-").map(Number);
        const s = new Date(yy, mm - 1, 1).toLocaleDateString("en-GB", { month: "short" });
        return spanYears ? `${s} ${String(yy).slice(2)}` : s;
      };
      let buckets, bucketKind;
      if (months === 1) {
        bucketKind = "day";
        buckets = daily.map((d) => ({ label: String(Number(d.date.slice(8, 10))), full: d.date, items: d.items, kg: d.kg, cond: d.cond }));
      } else {
        bucketKind = "month";
        const mMap = new Map();
        for (const d of daily) {
          const mk = d.date.slice(0, 7);
          const b = mMap.get(mk) || { items: 0, kg: 0, cond: 0 };
          b.items += d.items; b.kg += d.kg; b.cond += d.cond;
          mMap.set(mk, b);
        }
        buckets = Array.from(mMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))
          .map(([mk, b]) => ({
            label: shortMonth(mk),
            /* The anchor month's row is a part-month figure — label it, or the
               register reads as a sudden collapse in the last month. */
            full: mk === toKey && isPartial ? `${monthLabel(mk)} (partial, to day ${lastDay})` : monthLabel(mk),
            items: b.items, kg: b.kg, cond: b.cond,
          }));
      }
      const peakBucket = buckets.reduce((mx, b) => (b.items > mx.items ? b : mx), { items: -1 });

      /* ---------- Period-over-period (vs the equally-long window immediately before) ---------- */
      const quickAgg = (reps) => {
        let items = 0, kg = 0, cond = 0, decided = 0;
        for (const rep of reps) {
          for (const it of (rep.items || [])) {
            const a = latestActionFor(rep.reportDate, it) || "";
            if (!keepItem(it, a)) continue;  // baseline must use the SAME scope
            items++;
            if (isKgType(it.qtyType)) kg += Number(it.quantity) || 0;
            if (a) decided++;               // same denominator rule as the current period
            if (isCondemnation(a)) cond++;
          }
        }
        return { items, kg: Math.round(kg * 100) / 100, cond, condPct: (cond * 100) / (decided || 1) };
      };
      /* Baseline: the window immediately before, or the same window last year. */
      const yoy = O.baseline === "yoy";
      const prevToKey = yoy ? addMonthKey(toKey, -12) : addMonthKey(fromKey, -1);
      const prevFromKey = addMonthKey(prevToKey, -(months - 1));
      /* Like-for-like: when the current window stops mid-month, the baseline is
         cut at the SAME day of ITS last month. Comparing 8 days against a full
         month is what made a normal month look like a -60% collapse. */
      const prevCutoff = isPartial ? `${prevToKey}-${String(lastDay).padStart(2, "0")}` : "";
      const prevRangeLbl = isPartial
        ? `${rangeLabel(prevFromKey, prevToKey)} (to day ${lastDay})`
        : rangeLabel(prevFromKey, prevToKey);
      const prevReports = returnsData.filter((r) => {
        const d = r.reportDate || "";
        const mk = d.slice(0, 7);
        if (!(/^\d{4}-\d{2}$/.test(mk) && mk >= prevFromKey && mk <= prevToKey)) return false;
        return prevCutoff ? d <= prevCutoff : true;
      });
      const prevAgg = prevReports.length ? quickAgg(prevReports) : null;
      const curAgg = { items: totalItems, kg: Math.round(totalKg * 100) / 100, cond: condCount, condPct };
      /* pctChange returns { txt, dir } — dir drives arrow + colour */
      const pctChange = (cur, prev) => {
        if (prev == null || prev === 0) return { txt: "—", dir: "flat" };
        const ch = (cur - prev) / prev * 100;
        const dir = ch > 0.5 ? "up" : ch < -0.5 ? "down" : "flat";
        return { txt: `${ch > 0 ? "+" : ""}${Math.round(ch)}%`, dir };
      };

      /* ---------- Quality hotspots — condemnation RATE by branch / origin ---------- */
      const MIN_SAMPLE = 5; // ignore tiny samples so a 1/1 = 100% doesn't top the list
      /* Rates stay UNROUNDED here: rounding first made 1010/1011 rank as a clean
         100% and made a 99.5% branch look identical to a true 100% one. */
      const buildRates = (countMap, condMap) => Array.from(countMap.entries())
        .map(([label, total]) => {
          const cond = condMap.get(label) || 0;
          return { label, total, cond, rate: (cond * 100) / total };
        })
        .filter((r) => r.total >= MIN_SAMPLE)
        /* Volume breaks a rate tie — when a dozen branches sit at 100%, the one
           condemning the most units is the one to act on first. */
        .sort((a, b) => b.rate - a.rate || b.cond - a.cond || b.total - a.total);
      /* Capped at 12: the bars are 27pt tall and share the page with the
         comparison tiles, so a Top-N of 20 would run into the page footer. */
      const RATE_N = Math.max(7, Math.min(RANK_N, 12));
      const branchRatesAll = buildRates(posCount, posCond);
      const originRatesAll = buildRates(originCount, originCond);
      const branchRates = branchRatesAll.slice(0, RATE_N);
      const originRates = originRatesAll.slice(0, RATE_N);
      /* The volume leader can rank low on RATE and vanish from this page — a
         branch with 197/198 sits below every 159/159. Name it explicitly instead
         of leaving the reader to wonder why the biggest branch is missing. */
      const volLeaderLabel = Array.from(posCond.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
      const volLeaderRank = volLeaderLabel ? branchRatesAll.findIndex((r) => r.label === volLeaderLabel) : -1;
      const volLeaderNote = volLeaderLabel && !branchRates.some((r) => r.label === volLeaderLabel)
        ? `Highest condemnation VOLUME: ${volLeaderLabel} — ${posCond.get(volLeaderLabel)} of ${posCount.get(volLeaderLabel)} returns (${fmtRate((posCond.get(volLeaderLabel) * 100) / (posCount.get(volLeaderLabel) || 1))})`
          + (volLeaderRank >= 0 ? `, ranked #${volLeaderRank + 1} by rate — below the cut-off above.` : ", under the minimum sample above.")
        : "";

      /* ---------- Top Condemnation — every condemned product, worst first ----------
         `share` is the product's share of ALL condemned items (so the column sums
         to 100%), while `rate` is condemned / that product's own returns — the two
         answer different questions and are both wanted in the meeting. */
      let condRun = 0;
      const condRows = Array.from(condProduct.entries())
        .map(([label, cond]) => {
          const n = productCount.get(label) || 0;
          return {
            label, cond,
            kg: condProductKg.get(label) || 0,
            n,
            rate: n ? (cond * 100) / n : 0,
            share: condCount ? (cond * 100) / condCount : 0,
            days: (condProductDays.get(label) || new Set()).size,
            pos: topOf(condProdPos.get(label)),
            origin: topOf(condProdOrigin.get(label)),
          };
        })
        .sort((a, b) => b.cond - a.cond || b.kg - a.kg || a.label.localeCompare(b.label))
        .map((r) => { condRun += r.share; return { ...r, cum: condRun }; });

      /* ---------- Excel delivery: same model, spreadsheet shape ---------- */
      if (deliver === "xlsx") {
        const ExcelJS = (await import("exceljs")).default || (await import("exceljs"));
        const wb = new ExcelJS.Workbook();
        const BD = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } }, left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } }, right: { style: "thin", color: { argb: "FFCBD5E1" } },
        };
        const sheet = (name, headers, rows, widths) => {
          const ws = wb.addWorksheet(name);
          if (widths) ws.columns = widths.map((w) => ({ width: w }));
          const hr = ws.addRow(headers);
          hr.eachCell((c) => {
            c.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
            c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F4D" } };
            c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            c.border = BD;
          });
          hr.height = 22;
          rows.forEach((r) => {
            const row = ws.addRow(r);
            row.eachCell((c) => { c.border = BD; c.font = { size: 10 }; c.alignment = { vertical: "top" }; });
          });
          ws.views = [{ state: "frozen", ySplit: 1 }];
          ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: headers.length } };
          return ws;
        };

        /* 1 — Summary (metrics + the exact scope this workbook covers) */
        const sum = wb.addWorksheet("Summary");
        sum.columns = [{ width: 34 }, { width: 46 }];
        const put = (k, v, bold) => {
          const r = sum.addRow([k, v]);
          r.getCell(1).font = { bold: true, size: 11 };
          r.getCell(2).font = { bold: !!bold, size: 11 };
          r.getCell(1).border = BD; r.getCell(2).border = BD;
        };
        put("Report", RTITLE);
        put("Period", mLabel, true);
        put("Data coverage", isPartial
          ? `Partial — to ${fmtDayLong(lastDataDate)} (day ${lastDay} of ${monthDays} in ${monthLabel(toKey)})`
          : `Complete — to ${fmtDayLong(lastDataDate)}`, isPartial);
        put("Reference no.", (O.refNo || "").trim() || "—");
        put("Classification", O.classification || "—");
        put("Scope", isFiltered ? scopeBits.join("  |  ") : "All branches, products and origins");
        put("Generated", genStamp);
        sum.addRow([]);
        put("Total entries", totalItems, true);
        put("Total weight (kg)", Math.round(totalKg * 100) / 100, true);
        put("Total pieces", totalPcs);
        put("Condemned items", condCount, true);
        put("Condemnation rate (of all returns)", `${totalItems ? ((condCount * 100) / totalItems).toFixed(1) : "0.0"}%`);
        put("Condemnation rate (of decided items)", fmtRate(condPct));
        put("Condemned weight (kg)", Math.round(condKg * 100) / 100);
        put("Sent to market (kg)", Math.round(marketKg * 100) / 100);
        put("Disposed items", disposedCount);
        put("Use in production", useProdCount);
        put("Active days", activeDays);
        put("Average per active day", Math.round(avgPerDay * 10) / 10);
        put("Busiest day", peakDay.date ? `${peakDay.date} (${peakDay.items})` : "—");

        /* 2..7 — the analysis, one sheet each */
        sheet("Daily", ["Date", "Entries", "Weight (kg)", "Condemned"],
          daily.map((d) => [d.date, d.items, Math.round(d.kg * 100) / 100, d.cond]), [14, 12, 14, 12]);

        const cardRows = (rows) => rows.map((r) => [
          r.label, r.n, Number((r.share).toFixed(1)), Math.round(r.kg * 100) / 100,
          r.cond, Number(r.rate.toFixed(1)), r.grade,
        ]);
        sheet("By Branch", ["Branch", "Returns", "Share %", "Weight (kg)", "Condemned", "Cond. rate %", "Grade"],
          cardRows(branchCard), [26, 11, 10, 13, 12, 13, 8]);
        sheet("By Origin", ["Origin", "Returns", "Share %", "Weight (kg)", "Condemned", "Cond. rate %", "Grade"],
          cardRows(originCard), [26, 11, 10, 13, 12, 13, 8]);

        sheet("By Product",
          ["Product", "Returns", "Weight (kg)", "Condemned", "Days seen", "Cumulative %"],
          paretoData.map((p) => [
            p.label, p.n, Math.round((productKg.get(p.label) || 0) * 100) / 100,
            condProduct.get(p.label) || 0, (productDays.get(p.label) || new Set()).size,
            Number(p.cum.toFixed(1)),
          ]), [34, 11, 13, 12, 11, 13]);

        /* Top Condemnation — the whole ranked list, not just the PDF's top N */
        sheet("Top Condemnation",
          ["Rank", "Product", "Condemned", "Condemned kg", "Share of condemned %", "Cumulative %",
           "Total returns", "Cond. rate %", "Days condemned", "Top branch", "Top origin"],
          condRows.map((r, i) => [
            i + 1, r.label, r.cond, Math.round(r.kg * 100) / 100,
            Number(r.share.toFixed(1)), Number(r.cum.toFixed(1)),
            r.n, Number(r.rate.toFixed(1)), r.days, r.pos, r.origin,
          ]), [7, 34, 12, 14, 19, 13, 13, 12, 15, 20, 20]);

        sheet("Dispositions", ["Disposition", "Items", "Share %"],
          actionsSorted.map((a) => [a.label || "(blank)", a.value, Number(((a.value * 100) / actionTotal).toFixed(1))]),
          [30, 11, 10]);

        sheet("Weekday", ["Weekday", "Returns"], weekdayRows.map((r) => [r.label, r.value]), [16, 11]);

        if (spikeRows.length) {
          sheet("Spike Days", ["Date", "Entries", "vs average %", "Weight (kg)", "Condemned"],
            spikeRows.map((d) => [d.date, d.items, d.over, Math.round(d.kg * 100) / 100, d.cond]),
            [14, 11, 14, 13, 12]);
        }

        /* 8 — every matching line item (no cap: this is the analysable sheet) */
        sheet("Line Items", ["Date", "Code", "Product", "Origin", "Branch", "Qty", "Expiry", "Disposition"],
          lineItems, [13, 14, 34, 18, 20, 14, 13, 22]);

        const scopeTagX = scopeOverride?.branches?.length
          ? `_${String(scopeOverride.branches[0]).replace(/[^A-Za-z0-9]+/g, "")}`
          : isFiltered ? "_Filtered" : "";
        const xname = months === 1
          ? `Al_Mawashi_${period.fileTag}_Returns${scopeTagX}_${toKey}.xlsx`
          : `Al_Mawashi_${period.fileTag}_Returns${scopeTagX}_${fromKey}_to_${toKey}.xlsx`;
        const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([buf], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }));
        a.download = xname;
        a.click();
        URL.revokeObjectURL(a.href);

        logReportRun({
          filename: xname, periodType, from: fromKey, to: toKey,
          scope: scopeBits, items: totalItems, kg: Math.round(totalKg * 100) / 100,
          condemned: condCount, delivery: "xlsx",
        });
        say("Excel workbook exported", "ok");
        return { filename: xname, items: totalItems, label: mLabel };
      }

      /* ---------- Palette + primitives ---------- */
      const NAVY = [11, 31, 77], NAVY2 = [30, 58, 95], RED = [176, 0, 0];
      const SLATE = [71, 85, 105], MUTE = [148, 163, 184], LINE = [226, 232, 240], LIGHT = [241, 245, 249];
      const GREEN = [5, 150, 105], AMBER = [217, 119, 6], CYAN = [8, 145, 178], PURPLE = [124, 58, 237], BLUE = [37, 99, 235];
      const PALETTE = [NAVY, BLUE, GREEN, AMBER, RED, PURPLE, CYAN, [100, 116, 139]];
      const ACTION_COLORS = {
        "condemnation": RED, "send to market": GREEN, "disposed": AMBER, "desposed": AMBER,
        "use in production": CYAN, "separated expired shelf": PURPLE,
      };
      const colorForAction = (name, i) => ACTION_COLORS[(name || "").toLowerCase()] || PALETTE[i % PALETTE.length];
      const trunc = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      /* Sections are optional, so pages can't blindly addPage() — the first one
         drawn must reuse the document's initial blank page. */
      let pageOpened = false;
      const startPage = () => { if (pageOpened) doc.addPage(); pageOpened = true; };
      const M = 40;
      const CW = PW - M * 2;
      const setFill = (c) => doc.setFillColor(c[0], c[1], c[2]);
      const setText = (c) => doc.setTextColor(c[0], c[1], c[2]);
      const setDraw = (c) => doc.setDrawColor(c[0], c[1], c[2]);

      const footer = () => {
        const p = doc.getNumberOfPages();
        setDraw(LINE); doc.setLineWidth(0.5); doc.line(M, PH - 34, PW - M, PH - 34);
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setText(MUTE);
        const center = `${mLabel}  ·  Generated ${genStamp}`;
        /* The three footer blocks used to be drawn blind, so a long company name
           + classification + "FILTERED SCOPE" ran straight through the centred
           stamp. Measure first, then clamp the left block to the gap. */
        const centerStart = PW / 2 - doc.getTextWidth(center) / 2;
        const left = ["Al Mawashi",
          O.classification, (O.refNo || "").trim(),
          /* A filtered report must declare it on EVERY page — the cover band is
             not enough because the cover itself is an optional section. */
          isFiltered ? "FILTERED SCOPE" : ""].filter(Boolean).join("  ·  ");
        const leftMax = Math.max(60, centerStart - M - 12);
        doc.text(doc.splitTextToSize(left, leftMax)[0] || "", M, PH - 22);
        doc.text(center, PW / 2, PH - 22, { align: "center" });
        doc.text(`Page ${p}`, PW - M, PH - 22, { align: "right" });
      };
      const contentHeader = (title, sub) => {
        setFill(NAVY); doc.rect(0, 0, PW, 60, "F");
        setFill(RED); doc.rect(0, 60, PW, 3, "F");
        try { doc.addImage(MAWASHI_LOGO_B64, "PNG", M, 12, 36, 36); } catch {}
        setText([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
        doc.text(title, M + 46, 28);
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText([200, 210, 230]);
        doc.text(sub, M + 46, 44);
        setText([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
        doc.text("AL MAWASHI", PW - M, 26, { align: "right" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); setText([200, 210, 230]);
        doc.text(RTITLE, PW - M, 40, { align: "right" });
      };
      const sectionTitle = (y, text) => {
        setFill(NAVY); doc.roundedRect(M, y - 11, 4, 15, 2, 2, "F");
        setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
        doc.text(text, M + 12, y);
        return y + 20;
      };
      const kpiCard = (x, y, w, h, label, value, sub, accent) => {
        setFill([255, 255, 255]); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(x, y, w, h, 7, 7, "FD");
        setFill(accent); doc.roundedRect(x, y, 4, h, 2, 2, "F");
        setText(SLATE); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
        doc.text(String(label).toUpperCase(), x + 14, y + 18);
        setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
        doc.text(String(value), x + 14, y + 43);
        if (sub) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); setText(MUTE); doc.text(String(sub), x + 14, y + 58); }
      };
      const hbars = (x, y, w, items, accent, fmt) => {
        const max = Math.max(...items.map((i) => i.value), 1);
        let yy = y; const rowH = 24;
        for (const it of items) {
          setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
          doc.text(trunc(it.label || "—", 30), x, yy);
          setText(SLATE); doc.setFont("helvetica", "normal");
          doc.text(fmt ? fmt(it.value) : String(it.value), x + w, yy, { align: "right" });
          setFill(LIGHT); doc.roundedRect(x, yy + 4, w, 6, 3, 3, "F");
          const bw = Math.max(2, (it.value / max) * w);
          setFill(accent); doc.roundedRect(x, yy + 4, bw, 6, 3, 3, "F");
          yy += rowH;
        }
        return yy;
      };
      const donut = (cx, cy, rOut, rIn, segs) => {
        const total = segs.reduce((s, x) => s + x.value, 0) || 1;
        let start = -Math.PI / 2;
        segs.forEach((seg) => {
          const ang = (seg.value / total) * Math.PI * 2;
          const steps = Math.max(2, Math.ceil(ang / 0.15));
          setFill(seg.color);
          for (let s = 0; s < steps; s++) {
            const a1 = start + (ang * s / steps), a2 = start + (ang * (s + 1) / steps);
            doc.triangle(cx, cy, cx + Math.cos(a1) * rOut, cy + Math.sin(a1) * rOut, cx + Math.cos(a2) * rOut, cy + Math.sin(a2) * rOut, "F");
          }
          start += ang;
        });
        setFill([255, 255, 255]); doc.circle(cx, cy, rIn, "F");
      };
      /* MoM comparison tile: current value big, a coloured delta badge, and prev value.
         `semantic` = "cond" flips colours (rising condemnation is bad → red). */
      const compareTile = (x, y, w, h, label, curStr, deltaObj, prevStr, semantic) => {
        setFill([255, 255, 255]); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(x, y, w, h, 7, 7, "FD");
        setText(SLATE); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
        doc.text(String(label).toUpperCase(), x + 14, y + 18);
        setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(19);
        doc.text(String(curStr), x + 14, y + 42);
        /* delta badge — arrow drawn as a triangle (WinAnsi core fonts lack ▲▼) */
        const up = deltaObj.dir === "up", down = deltaObj.dir === "down";
        let badge = MUTE;
        if (up) badge = semantic === "cond" ? RED : SLATE;
        if (down) badge = semantic === "cond" ? GREEN : SLATE;
        const ax = x + 14, ay = y + 59;
        setFill(badge);
        if (up) doc.triangle(ax, ay, ax + 8, ay, ax + 4, ay - 9, "F");
        else if (down) doc.triangle(ax, ay - 9, ax + 8, ay - 9, ax + 4, ay, "F");
        else doc.rect(ax, ay - 5, 8, 2, "F");
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); setText(badge);
        doc.text(deltaObj.txt, ax + 14, y + 60);
        setText(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(`prev: ${prevStr}`, x + w - 12, y + 60, { align: "right" });
      };
      /* Condemnation-rate hotspot bars: label, cond/total, rate% and a red bar (0-100%). */
      const rateBars = (x, y, w, rows) => {
        let yy = y; const rowH = 27;
        if (!rows.length) {
          setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(9);
          doc.text("Not enough data", x, yy + 4);
          return yy + rowH;
        }
        for (const r of rows) {
          setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
          doc.text(trunc(r.label || "—", 26), x, yy);
          setText(SLATE); doc.setFont("helvetica", "normal");
          doc.text(`${r.cond}/${r.total}  ·  ${fmtRate(r.rate)}`, x + w, yy, { align: "right" });
          setFill(LIGHT); doc.roundedRect(x, yy + 4, w, 6, 3, 3, "F");
          const bw = Math.max(2, (r.rate / 100) * w);
          setFill(RED); doc.roundedRect(x, yy + 4, bw, 6, 3, 3, "F");
          yy += rowH;
        }
        return yy;
      };

      /* ---------- PAGE 1 — Cover ---------- */
      if (S.cover) {
      startPage();
      setFill(NAVY); doc.rect(0, 0, PW, 300, "F");
      setFill(NAVY2); doc.rect(0, 250, PW, 50, "F");
      setFill(RED); doc.rect(0, 300, PW, 5, "F");
      try { doc.addImage(MAWASHI_LOGO_B64, "PNG", PW / 2 - 31, 46, 62, 62); } catch {}
      setText([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
      doc.text("AL MAWASHI", PW / 2, 130, { align: "center" });
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); setText([200, 210, 230]);
      doc.text("Trans Emirates Livestock Trading L.L.C.", PW / 2, 145, { align: "center" });
      setText([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(29);
      doc.setFontSize(COVER_TITLE.length > 22 ? 20 : 29);
      doc.text(COVER_TITLE, PW / 2, 196, { align: "center" });
      doc.setFontSize(29);
      doc.text("REPORT", PW / 2, 226, { align: "center" });
      const pillW = 240, pillH = 34, pillX = PW / 2 - pillW / 2, pillY = 258;
      setFill(RED); doc.roundedRect(pillX, pillY, pillW, pillH, 17, 17, "F");
      setText([255, 255, 255]); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
      doc.text(mLabel.toUpperCase(), PW / 2, pillY + 22, { align: "center" });
      /* An unfinished month must say so on the face of the document — every
         volume figure below is a part-month figure. */
      if (isPartial) {
        setText([176, 0, 0]); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text(coverageNote, PW / 2, 322, { align: "center" });
      }

      /* Hero KPI cards (2×2) */
      const gx = M, gw = (CW - 15) / 2, gh = 92, gy = 340;
      kpiCard(gx, gy, gw, gh, "Active Days", String(activeDays), "days with returns filed", BLUE);
      kpiCard(gx + gw + 15, gy, gw, gh, "Total Entries", fmtNum(totalItems, 0), "returned line items", NAVY);
      kpiCard(gx, gy + gh + 15, gw, gh, "Total Weight", `${fmtKg(totalKg)} kg`, `+ ${fmtNum(totalPcs, 0)} pcs`, GREEN);
      kpiCard(gx + gw + 15, gy + gh + 15, gw, gh, "Condemnation", fmtRate(condPct), `${fmtNum(condCount, 0)} items · ${fmtKg(condKg)} kg`, RED);

      /* Highlights strip */
      const hy = gy + gh * 2 + 44;
      setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
      doc.roundedRect(M, hy, CW, 96, 8, 8, "FD");
      setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.text("AT A GLANCE", M + 16, hy + 22);
      const facts = [
        ["Busiest day", peakDay.date ? `${peakDay.date}  (${peakDay.items} items)` : "—"],
        ["Avg per active day", `${fmtNum(avgPerDay, 1)} items`],
        /* values carry the ranking metric's unit — a bare number would read as a
           count even when the ranking is by weight. */
        ["Top branch (POS)", topPos[0] ? `${trunc(topPos[0].label, 22)}  (${metricFmt(topPos[0].value)})` : "—"],
        ["Top product", topProducts[0] ? `${trunc(topProducts[0].label, 24)}  (${metricFmt(topProducts[0].value)})` : "—"],
      ];
      let fy = hy + 42;
      facts.forEach((f, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const fx = M + 16 + col * (CW / 2);
        const yy = fy + row * 26;
        setFill(RED); doc.circle(fx + 2, yy - 3, 2, "F");
        setText(SLATE); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
        doc.text(`${f[0]}:`, fx + 10, yy);
        setText(NAVY); doc.setFont("helvetica", "bold");
        doc.text(String(f[1]), fx + 10 + doc.getTextWidth(`${f[0]}:  `), yy);
      });

      /* Scope band — a filtered report must say so on its face, or a reader
         will mistake a slice for the whole business. */
      if (isFiltered) {
        const sy = hy + 108;
        setFill([255, 247, 237]); setDraw([251, 191, 36]); doc.setLineWidth(1);
        const scopeText = scopeBits.join("   ·   ");
        const wrapped = doc.splitTextToSize(scopeText, CW - 32);
        const bh = 26 + wrapped.length * 11;
        doc.roundedRect(M, sy, CW, bh, 8, 8, "FD");
        setText([146, 64, 14]); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
        doc.text("FILTERED SCOPE — this report covers a subset of returns", M + 16, sy + 17);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.text(wrapped, M + 16, sy + 30);
      }
      footer();
      }

      /* ---------- PAGE 2 — Executive Summary + Disposition Mix ---------- */
      let y = 90;
      if (S.summary || S.mix) {
      startPage();
      contentHeader(S.summary ? "Executive Summary" : "Disposition Mix", mLabel);
      }
      if (S.summary) {
      y = sectionTitle(90, "Key Metrics");
      const metrics = [
        ["Total Entries", fmtNum(totalItems, 0), "line items", NAVY],
        ["Total Weight", `${fmtKg(totalKg)} kg`, "kilogram total", GREEN],
        ["Total Pieces", fmtNum(totalPcs, 0), "pcs total", BLUE],
        ["Sent to Market", `${fmtKg(marketKg)} kg`, "recovered value", CYAN],
        ["Disposed", fmtNum(disposedCount, 0), `${fmtKg(disposedKg)} kg`, AMBER],
        ["Use in Production", fmtNum(useProdCount, 0), "re-processed", PURPLE],
      ];
      const mcW = (CW - 24) / 3, mcH = 74;
      metrics.forEach((mt, i) => {
        const col = i % 3, row = Math.floor(i / 3);
        kpiCard(M + col * (mcW + 12), y + row * (mcH + 12), mcW, mcH, mt[0], mt[1], mt[2], mt[3]);
      });
      y += mcH * 2 + 12 + 34;

      /* Executive commentary — free text from the builder, wrapped to width. */
      if ((O.notes || "").trim()) {
        y = sectionTitle(y, "Commentary");
        const nw = doc.splitTextToSize(O.notes.trim(), CW - 32);
        const nh = 20 + nw.length * 12;
        setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(M, y - 2, CW, nh, 8, 8, "FD");
        setText(SLATE); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
        doc.text(nw, M + 16, y + 16);
        y += nh + 22;
      }
      }

      if (S.mix) {
      y = sectionTitle(y, "Disposition Mix");
      const segs = actionsSorted.slice(0, 7).map((a, i) => ({ ...a, color: colorForAction(a.label, i) }));
      /* centre count = items that carry a disposition (Σ slices), so the donut
         reconciles with its own legend. Equals total entries when none are blank. */
      const decidedItems = actionsSorted.reduce((s, a) => s + a.value, 0);
      const cx = M + 90, cy = y + 78;
      donut(cx, cy, 74, 42, segs);
      setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(16);
      doc.text(fmtNum(decidedItems, 0), cx, cy - 2, { align: "center" });
      setText(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text("ITEMS", cx, cy + 10, { align: "center" });
      /* Legend */
      let ly = y + 14; const lx = M + 200;
      segs.forEach((s) => {
        setFill(s.color); doc.roundedRect(lx, ly - 7, 10, 10, 2, 2, "F");
        setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
        doc.text(trunc(s.label || "—", 26), lx + 16, ly);
        setText(SLATE); doc.setFont("helvetica", "normal");
        /* fmtRate, not Math.round: the legend used to print 1018/1019 as "100%"
           and the single other disposition as "0%" — two lies in one line. */
        doc.text(`${s.value}  ·  ${fmtRate((s.value * 100) / actionTotal)}`, PW - M, ly, { align: "right" });
        ly += 21;
      });
      }
      if (S.summary || S.mix) footer();

      /* ---------- PAGE 3 — Trends & Quality (MoM + condemnation hotspots) ---------- */
      let ty = 90;
      if (S.comparison || S.hotspots) {
      startPage();
      contentHeader("Trends & Quality", mLabel);
      }
      const baseLbl = yoy ? "vs Same Period Last Year" : "vs Previous Period";
      if (S.comparison) {
      ty = sectionTitle(90, prevAgg ? `${baseLbl}  ·  ${prevRangeLbl}` : baseLbl);
      if (!prevAgg) {
        setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(M, ty + 4, CW, 40, 8, 8, "FD");
        setText(SLATE); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text(`No data for ${prevRangeLbl} — comparison unavailable.`, M + 16, ty + 28);
        ty += 60;
      } else {
        const ctW = (CW - 24) / 3, ctH = 74;
        compareTile(M, ty + 4, ctW, ctH, "Total Entries", fmtNum(curAgg.items, 0),
          pctChange(curAgg.items, prevAgg.items), fmtNum(prevAgg.items, 0), "vol");
        compareTile(M + ctW + 12, ty + 4, ctW, ctH, "Total Weight", `${fmtKg(curAgg.kg)} kg`,
          pctChange(curAgg.kg, prevAgg.kg), `${fmtKg(prevAgg.kg)} kg`, "vol");
        compareTile(M + (ctW + 12) * 2, ty + 4, ctW, ctH, "Condemnation %", fmtRate(curAgg.condPct),
          pctChange(curAgg.condPct, prevAgg.condPct), fmtRate(prevAgg.condPct), "cond");
        ty += ctH + 34;
        if (isPartial) {
          setText([176, 0, 0]); doc.setFont("helvetica", "italic"); doc.setFontSize(8);
          doc.text(
            `Like-for-like: this period stops on day ${lastDay}, so the baseline is cut at day ${lastDay} of ${monthLabel(prevToKey)} too.`,
            M, ty - 20
          );
        }
      }
      }

      /* Quality hotspots — two columns: by branch (left), by origin (right) */
      if (S.hotspots) {
      const qcW = (CW - 30) / 2;
      const qTitleY = ty + 8;
      sectionTitle(qTitleY, "Condemnation Rate — Branch");
      setFill(RED); doc.roundedRect(M + qcW + 30, qTitleY - 11, 4, 15, 2, 2, "F");
      setText(RED); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
      doc.text("Condemnation Rate — Origin", M + qcW + 42, qTitleY);
      rateBars(M, qTitleY + 24, qcW, branchRates);
      rateBars(M + qcW + 30, qTitleY + 24, qcW, originRates);
      /* This page ranks by RATE, the Rankings page ranks by VOLUME — without
         saying so, a branch topping one and missing from the other reads as a
         bug. Both facts are spelled out here. */
      setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
      const hotNotes = [
        `Rate = condemned / total returns, ranked by rate then volume — NOT by number of returns (that is the Rankings page).`,
        `Only branches/origins with >= ${MIN_SAMPLE} returns qualify; top ${RATE_N} of each shown (${branchRatesAll.length} branches, ${originRatesAll.length} origins qualify).`,
        volLeaderNote,
      ].filter(Boolean);
      const hotLines = doc.splitTextToSize(hotNotes.join("  "), CW);
      doc.text(hotLines, M, PH - 48 - (hotLines.length - 1) * 9);
      }
      if (S.comparison || S.hotspots) footer();

      /* ---------- PAGE 4 — Activity (per-day for 1 month, per-month otherwise) ---------- */
      const isDaily = bucketKind === "day";
      const activityTitle = isDaily ? "Daily Activity" : "Monthly Activity";
      const axisLabel = isDaily ? "Day of month" : "Month";
      const firstColHead = isDaily ? "Date" : "Month";
      if (S.activity) {
      startPage();
      contentHeader(activityTitle, mLabel);
      y = sectionTitle(90, isDaily ? "Returns per day" : "Returns per month");
      const chX = M, chY = y + 6, chW = CW, chH = 170;
      const dMax = Math.max(...buckets.map((b) => b.items), 1);
      const n = buckets.length;
      const gap = n > 1 ? Math.min(10, (chW * 0.2) / n) : 0;
      // cap bar width so a 3-bar quarter chart doesn't stretch into slabs; centre the cluster
      const bw = Math.min(64, Math.max(3, (chW - gap * (n - 1)) / n));
      const clusterW = n * bw + (n - 1) * gap;
      const startX = chX + Math.max(0, (chW - clusterW) / 2);
      /* gridlines */
      setDraw(LINE); doc.setLineWidth(0.5); setText(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      [0, 0.25, 0.5, 0.75, 1].forEach((p) => {
        const yy = chY + chH - p * chH;
        doc.line(chX, yy, chX + chW, yy);
        doc.text(String(Math.round(dMax * p)), chX - 6, yy + 2, { align: "right" });
      });
      buckets.forEach((b, i) => {
        const bh = (b.items / dMax) * chH;
        const bx = startX + i * (bw + gap);
        const isPeak = b.items === peakBucket.items && b.items > 0;
        setFill(isPeak ? RED : NAVY2);
        doc.roundedRect(bx, chY + chH - bh, bw, bh, 1.5, 1.5, "F");
        // day charts get crowded → label every other; month charts always label
        if (!isDaily || n <= 20 || i % 2 === 0) {
          setText(MUTE); doc.setFontSize(isDaily ? 6.5 : 7);
          doc.text(b.label, bx + bw / 2, chY + chH + 10, { align: "center" });
        }
      });
      setText(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.text(axisLabel, chX + chW / 2, chY + chH + 24, { align: "center" });
      setFill(RED); doc.roundedRect(chX + chW - 96, chY + 2, 8, 8, 2, 2, "F");
      setText(SLATE); doc.setFontSize(7.5); doc.text(isDaily ? "Peak day" : "Peak month", chX + chW - 84, chY + 9);

      /* Register table (one row per bucket) */
      doc.autoTable({
        startY: chY + chH + 40,
        margin: { left: M, right: M, bottom: 62 },
        head: [[firstColHead, "Entries", "Weight (kg)", "Condemned"]],
        body: buckets.map((b) => [b.full, String(b.items), fmtKg(b.kg), String(b.cond)]),
        foot: [["TOTAL", String(totalItems), fmtKg(totalKg), String(condCount)]],
        styles: { font: "helvetica", fontSize: 9, cellPadding: 5, lineColor: LINE, lineWidth: 0.5, textColor: [30, 41, 59] },
        headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
        footStyles: { fillColor: LIGHT, textColor: NAVY, fontStyle: "bold", halign: "center" },
        columnStyles: { 0: { halign: "left" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
        didDrawPage: () => { contentHeader(activityTitle, mLabel); footer(); },
      });
      /* The TOTAL is the exact sum of unrounded weights, so it can sit 0.01 away
         from adding up the rounded cells above it — say so before a reader
         calls it an error. */
      setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
      const actNotes = [
        coverageNote,
        "Weights are rounded to 2 decimals; TOTAL is the exact sum and may differ from adding the rounded rows by ±0.01 kg.",
      ].filter(Boolean);
      const actLines = doc.splitTextToSize(actNotes.join("  "), CW);
      doc.text(actLines, M, PH - 48 - (actLines.length - 1) * 9);
      footer();
      }

      /* ---------- PAGE 5 — Rankings ---------- */
      if (S.rankings) {
      startPage();
      contentHeader("Rankings & Hotspots", mLabel);
      const colW = (CW - 30) / 2;
      setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(8);
      doc.text(`Ranked by: ${metricLabel}`, PW - M, 78, { align: "right" });
      const yL = sectionTitle(90, "Top Returned Products");
      hbars(M, yL + 8, colW, topProducts.length ? topProducts : [{ label: "—", value: 0 }], NAVY, metricFmt);
      /* Right-column title drawn manually so it aligns on the same row as the left. */
      setFill(BLUE); doc.roundedRect(M + colW + 30, 90 - 11, 4, 15, 2, 2, "F");
      setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
      doc.text("Top Branches (POS)", M + colW + 42, 90);
      hbars(M + colW + 30, yL + 8, colW, topPos.length ? topPos : [{ label: "—", value: 0 }], BLUE, metricFmt);

      /* second row starts below whatever the first row actually consumed —
         RANK_N is user-configurable, so this can't be a fixed offset. */
      const rowY = 90 + 28 + 24 * Math.max(topProducts.length, topPos.length, 1) + 46;
      const yB = sectionTitle(rowY, "Top Origins");
      hbars(M, yB + 8, colW, topOrigins.length ? topOrigins : [{ label: "—", value: 0 }], GREEN, metricFmt);
      /* Right-column title drawn manually so it aligns on the same row as the left. */
      setFill(RED); doc.roundedRect(M + colW + 30, rowY - 11, 4, 15, 2, 2, "F");
      setText(RED); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5);
      doc.text("Most Condemned Items", M + colW + 42, rowY);
      hbars(M + colW + 30, yB + 8, colW, topCond.length ? topCond : [{ label: "None", value: 0 }], RED, (v) => String(v));
      footer();
      }

      /* ---------- Top Condemnation — the dedicated condemnation page ---------- */
      if (S.topCondemn) {
        startPage();
        contentHeader("Top Condemnation", mLabel);
        if (!condCount) {
          const ny = sectionTitle(90, "Most-condemned products");
          setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
          doc.roundedRect(M, ny, CW, 44, 8, 8, "FD");
          setText(SLATE); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
          doc.text("No condemned items in this period and scope.", M + 16, ny + 27);
          footer();
        } else {
          const kW = (CW - 24) / 3;
          /* Both denominators are quoted because the cover KPI uses "of decided"
             while the scorecards use "of all returns" — showing one alone here
             would look like it contradicts the other page. */
          kpiCard(M, 84, kW, 74, "Condemned Items", fmtNum(condCount, 0),
            `${fmtRate(totalItems ? (condCount * 100) / totalItems : 0)} of all · ${fmtRate(condPct)} of decided`, RED);
          kpiCard(M + kW + 12, 84, kW, 74, "Condemned Weight", `${fmtKg(condKg)} kg`, "destroyed stock", AMBER);
          kpiCard(M + (kW + 12) * 2, 84, kW, 74, "Products Affected", fmtNum(condRows.length, 0),
            `worst: ${trunc(condRows[0].label || "—", 18)}`, NAVY);

          /* Chart stays at 8 bars max so the ranked table still fits underneath;
             the table itself honours the builder's Top-N. */
          const chartRows = condRows.slice(0, Math.min(RANK_N, 8));
          const cTitleY = sectionTitle(194, `Top ${chartRows.length} condemned products`);
          const chEnd = hbars(M, cTitleY + 8, CW,
            chartRows.map((r) => ({ label: r.label, value: r.cond })), RED, (v) => String(v));

          const tableRows = condRows.slice(0, RANK_N);
          doc.autoTable({
            startY: chEnd + 22,
            /* bottom margin keeps the last row clear of the explanatory note
               that is printed at PH-48 once the table is done. */
            margin: { left: M, right: M, top: 78, bottom: 68 },
            head: [["Product", "Cond.", "Kg", "Share", "Cum.", "Returns", "Rate", "Top branch", "Top origin"]],
            body: tableRows.map((r) => [
              r.label, String(r.cond), fmtKg(r.kg), `${r.share.toFixed(1)}%`, `${r.cum.toFixed(0)}%`,
              String(r.n), `${r.rate.toFixed(0)}%`, trunc(r.pos, 18), trunc(r.origin, 18),
            ]),
            /* TOTAL uses the same denominator as the scorecards (all returns), so
               the rate column reconciles with the rest of the document. */
            foot: [["TOTAL (all condemned)", String(condCount), fmtKg(condKg), "100%", "",
                    String(totalItems), `${totalItems ? ((condCount * 100) / totalItems).toFixed(0) : "0"}%`, "", ""]],
            styles: { font: "helvetica", fontSize: 8, cellPadding: 4, lineColor: LINE, lineWidth: 0.5, textColor: [30, 41, 59] },
            headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
            footStyles: { fillColor: LIGHT, textColor: NAVY, fontStyle: "bold", halign: "center" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
              0: { halign: "left", cellWidth: 116 }, 1: { halign: "center", cellWidth: 34 },
              2: { halign: "center", cellWidth: 44 }, 3: { halign: "center", cellWidth: 40 },
              4: { halign: "center", cellWidth: 34 }, 5: { halign: "center", cellWidth: 44 },
              6: { halign: "center", cellWidth: 34 }, 7: { halign: "left" }, 8: { halign: "left" },
            },
            didParseCell: (d) => {
              if (d.section === "body" && d.column.index === 1) {
                d.cell.styles.textColor = RED; d.cell.styles.fontStyle = "bold";
              }
            },
            didDrawPage: () => { contentHeader("Top Condemnation", mLabel); footer(); },
          });
          setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
          const notes = [
            "Share = of all condemned items inside this report's scope",
            "Rate = condemned / that product's own returns",
            "Top branch / origin = where most of its condemnations occurred",
          ];
          if (condRows.length > tableRows.length) {
            notes.push(`Showing top ${tableRows.length} of ${condRows.length} condemned products`);
          }
          /* Without this the Returns and Rate columns read as a data error: a
             condemned-only scope makes every product 100% by construction. */
          if (O.condemnedOnly) notes.push("Scope is condemned-only, so Returns = Cond. and every Rate is 100%");
          const noteLines = doc.splitTextToSize(notes.join("  ·  "), CW);
          doc.text(noteLines, M, PH - 48 - (noteLines.length - 1) * 9);
          footer();
        }
      }

      /* ---------- Branch scorecard ---------- */
      const GRADE_FILL = { A: [220, 252, 231], B: [254, 249, 195], C: [255, 237, 213], D: [254, 226, 226] };
      const GRADE_TEXT = { A: [22, 101, 52], B: [133, 77, 14], C: [154, 52, 18], D: [153, 27, 27] };
      const scorecardPage = (title, rows, firstCol) => {
        startPage();
        contentHeader(title, mLabel);
        doc.autoTable({
          startY: 84,
          margin: { left: M, right: M, top: 78 },
          head: [[firstCol, "Returns", "Share", "Weight (kg)", "Condemned", "Cond. rate", "Grade"]],
          body: rows.map((r) => [
            r.label, String(r.n), `${r.share.toFixed(1)}%`, fmtKg(r.kg),
            String(r.cond), `${r.rate.toFixed(1)}%`, r.grade,
          ]),
          /* The TOTAL rate must use the SAME denominator as the rows above it
             (all returns, not just those carrying a disposition), otherwise the
             column does not reconcile with its own total. */
          foot: [["TOTAL", String(totalItems), "100%", fmtKg(totalKg), String(condCount),
                  `${totalItems ? ((condCount * 100) / totalItems).toFixed(1) : "0.0"}%`, ""]],
          styles: { font: "helvetica", fontSize: 9, cellPadding: 5, lineColor: LINE, lineWidth: 0.5, textColor: [30, 41, 59] },
          headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
          footStyles: { fillColor: LIGHT, textColor: NAVY, fontStyle: "bold", halign: "center" },
          columnStyles: {
            0: { halign: "left", cellWidth: 150 }, 1: { halign: "center" }, 2: { halign: "center" },
            3: { halign: "center" }, 4: { halign: "center" }, 5: { halign: "center" },
            6: { halign: "center", fontStyle: "bold" },
          },
          /* Grade cell colour-coded so a weak performer is visible at a glance. */
          didParseCell: (d) => {
            if (d.section === "body" && d.column.index === 6) {
              const g = d.cell.raw;
              if (GRADE_FILL[g]) { d.cell.styles.fillColor = GRADE_FILL[g]; d.cell.styles.textColor = GRADE_TEXT[g]; }
            }
          },
          didDrawPage: () => { contentHeader(title, mLabel); footer(); },
        });
        setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
        doc.text("Grade by condemnation rate:  A < 7%   ·   B 7-15%   ·   C 15-25%   ·   D >= 25%", M, PH - 48);
        footer();
      };
      if (S.branchScorecard) scorecardPage("Branch Scorecard", branchCard, "Branch (POS)");
      if (S.originQuality) scorecardPage("Origin Quality", originCard, "Origin");

      /* ---------- Pareto (80/20) ---------- */
      if (S.pareto) {
        startPage();
        contentHeader("Pareto Analysis", mLabel);
        let py = sectionTitle(90, "The vital few — products driving most returns");
        setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(M, py, CW, 44, 8, 8, "FD");
        setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
        const vf = vitalFew > 0 ? vitalFew : paretoData.length;
        const vfPct = paretoData.length ? Math.round((vf * 100) / paretoData.length) : 0;
        doc.text(
          `${vf} of ${paretoData.length} products (${vfPct}%) account for 80% of all returns.`,
          M + 16, py + 27
        );
        py += 64;

        const top = paretoData.slice(0, Math.max(RANK_N, 10));
        const pMax = Math.max(...top.map((r) => r.n), 1);
        const rowH = 22;
        top.forEach((r, i) => {
          const yy = py + i * rowH;
          const inVital = i < vf;
          setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
          doc.text(`${i + 1}. ${trunc(r.label || "—", 34)}`, M, yy);
          const barX = M + 260, barW = CW - 320;
          setFill(LIGHT); doc.roundedRect(barX, yy - 6, barW, 8, 4, 4, "F");
          setFill(inVital ? RED : NAVY2);
          doc.roundedRect(barX, yy - 6, Math.max(2, (r.n / pMax) * barW), 8, 4, 4, "F");
          setText(SLATE); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
          doc.text(`${r.n}`, barX - 8, yy, { align: "right" });
          setText(inVital ? RED : MUTE); doc.setFont("helvetica", "bold");
          doc.text(`${r.cum.toFixed(0)}%`, PW - M, yy, { align: "right" });
        });
        setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
        doc.text("Red bars are inside the 80% cumulative band — fix these first. Right column is the running cumulative share.", M, PH - 48);
        footer();
      }

      /* ---------- Repeat offenders ---------- */
      if (S.repeat) {
        startPage();
        contentHeader("Repeat Offenders", mLabel);
        const rTitle = `Products returned on ${minDays}+ separate days`;
        doc.autoTable({
          startY: 84,
          margin: { left: M, right: M, top: 78 },
          head: [["Product", "Days seen", "Total returns", "Condemned"]],
          body: repeatRows.length
            ? repeatRows.map((r) => [r.label, String(r.days), String(r.n), String(r.cond)])
            : [["No product recurred on that many days in this period.", "", "", ""]],
          styles: { font: "helvetica", fontSize: 9, cellPadding: 5, lineColor: LINE, lineWidth: 0.5, textColor: [30, 41, 59] },
          headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center" },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
          didDrawPage: () => { contentHeader("Repeat Offenders", mLabel); footer(); },
        });
        setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
        doc.text(`${rTitle}. A high day count means a chronic issue, not a one-off incident.`, M, PH - 48);
        footer();
      }

      /* ---------- Day-of-week pattern ---------- */
      if (S.weekday) {
        startPage();
        contentHeader("Day-of-Week Pattern", mLabel);
        let wy = sectionTitle(90, "Returns by weekday");
        const wMax = Math.max(...weekdayRows.map((r) => r.value), 1);
        const busiest = weekdayRows.reduce((mx, r) => (r.value > mx.value ? r : mx), { value: -1, label: "—" });
        weekdayRows.forEach((r, i) => {
          const yy = wy + 16 + i * 30;
          setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
          doc.text(r.label, M, yy);
          const barX = M + 92, barW = CW - 160;
          setFill(LIGHT); doc.roundedRect(barX, yy - 8, barW, 12, 6, 6, "F");
          setFill(r.label === busiest.label && r.value > 0 ? RED : BLUE);
          doc.roundedRect(barX, yy - 8, Math.max(2, (r.value / wMax) * barW), 12, 6, 6, "F");
          setText(SLATE); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
          doc.text(String(r.value), PW - M, yy, { align: "right" });
        });
        wy += 16 + 7 * 30 + 20;
        setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(M, wy, CW, 40, 8, 8, "FD");
        setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(10);
        doc.text(`Heaviest weekday: ${busiest.label} (${busiest.value} returns)`, M + 16, wy + 25);
        footer();
      }

      /* ---------- Spike days ---------- */
      if (S.anomalies) {
        startPage();
        contentHeader("Spike Days", mLabel);
        let ay = sectionTitle(90, "Days statistically above normal");
        setFill(LIGHT); setDraw(LINE); doc.setLineWidth(1);
        doc.roundedRect(M, ay, CW, 44, 8, 8, "FD");
        setText(SLATE); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
        doc.text(
          `Baseline: ${fmtNum(mean, 1)} returns/day (sigma ${fmtNum(sd, 1)}). Flagged above ${fmtNum(spikeCut, 1)}.`,
          M + 16, ay + 27
        );
        ay += 62;
        doc.autoTable({
          startY: ay,
          margin: { left: M, right: M, top: 78 },
          head: [["Date", "Returns", "vs average", "Weight (kg)", "Condemned"]],
          body: spikeRows.length
            ? spikeRows.map((d) => [d.date, String(d.items), `+${d.over}%`, fmtKg(d.kg), String(d.cond)])
            : [["No day exceeded the threshold — activity was statistically steady.", "", "", "", ""]],
          styles: { font: "helvetica", fontSize: 9, cellPadding: 5, lineColor: LINE, lineWidth: 0.5, textColor: [30, 41, 59] },
          headStyles: { fillColor: RED, textColor: 255, fontStyle: "bold", halign: "center" },
          alternateRowStyles: { fillColor: [254, 242, 242] },
          columnStyles: { 0: { halign: "left" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" } },
          didDrawPage: () => { contentHeader("Spike Days", mLabel); footer(); },
        });
        footer();
      }

      /* ---------- Detailed line-item register (audit annex) ---------- */
      if (S.lineItems) {
        startPage();
        contentHeader("Line-Item Register", mLabel);
        const cap = Math.max(1, Number(O.lineItemLimit) || 400);
        const annexRows = lineItems.slice(0, cap);
        const capped = lineItems.length > annexRows.length;
        doc.autoTable({
          startY: 82,
          margin: { left: M, right: M, top: 78 },
          head: [["Date", "Code", "Product", "Origin", "Branch", "Qty", "Expiry", "Disposition"]],
          body: annexRows,
          styles: { font: "helvetica", fontSize: 7.5, cellPadding: 3, lineColor: LINE, lineWidth: 0.4, textColor: [30, 41, 59], overflow: "linebreak" },
          headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold", halign: "center", fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 52 }, 1: { cellWidth: 48 }, 2: { cellWidth: 118 },
            3: { cellWidth: 60 }, 4: { cellWidth: 62 }, 5: { cellWidth: 48, halign: "right" },
            6: { cellWidth: 50 }, 7: { cellWidth: "auto" },
          },
          didDrawPage: () => { contentHeader("Line-Item Register", mLabel); footer(); },
        });
        if (capped) {
          setText(MUTE); doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
          doc.text(`Showing the first ${annexRows.length} of ${fmtNum(totalItems, 0)} matching items — raise the limit in the report builder, or use the Excel export which includes them all.`, M, PH - 48);
        }
        footer();
      }

      /* ---------- Sign-off ---------- */
      if (S.signoff) {
        startPage();
        contentHeader("Review & Approval", mLabel);
        let sy = sectionTitle(90, "Document Control");
        const ctrl = [
          ["Report title", RTITLE],
          ["Period covered", mLabel],
          ["Reference no.", (O.refNo || "").trim() || "—"],
          ["Classification", O.classification || "—"],
          ["Scope", isFiltered ? scopeBits.join("  ·  ") : "All branches, products and origins"],
          ["Line items included", fmtNum(totalItems, 0)],
          ["Generated", genStamp],
        ];
        doc.autoTable({
          startY: sy,
          margin: { left: M, right: M },
          body: ctrl,
          theme: "grid",
          styles: { font: "helvetica", fontSize: 9, cellPadding: 6, lineColor: LINE, lineWidth: 0.5, textColor: [30, 41, 59], overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: 130, fontStyle: "bold", fillColor: LIGHT, textColor: NAVY }, 1: { cellWidth: "auto" } },
        });

        let by = (doc.lastAutoTable?.finalY || sy) + 36;
        by = sectionTitle(by, "Signatures");
        const roles = [
          ["Prepared by", (O.preparedBy || "").trim()],
          ["Reviewed by", (O.reviewedBy || "").trim()],
          ["Approved by", (O.approvedBy || "").trim()],
        ];
        const sbW = (CW - 24) / 3, sbH = 108;
        roles.forEach(([role, name], i) => {
          const x = M + i * (sbW + 12);
          setFill([255, 255, 255]); setDraw(LINE); doc.setLineWidth(1);
          doc.roundedRect(x, by, sbW, sbH, 7, 7, "FD");
          setFill(NAVY); doc.roundedRect(x, by, sbW, 3, 2, 2, "F");
          setText(SLATE); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
          doc.text(role.toUpperCase(), x + 12, by + 22);
          setText(NAVY); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
          doc.text(name || "—", x + 12, by + 42);
          setDraw(LINE); doc.setLineWidth(0.6);
          doc.line(x + 12, by + 68, x + sbW - 12, by + 68);
          setText(MUTE); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
          doc.text("Signature", x + 12, by + 78);
          setDraw(LINE);
          doc.line(x + 12, by + 94, x + sbW - 12, by + 94);
          doc.text("Date", x + 12, by + 104);
        });
        footer();
      }

      /* ---------- Page numbers already drawn via footer() ---------- */
      const scopeTag = scopeOverride?.branches?.length
        ? `_${String(scopeOverride.branches[0]).replace(/[^A-Za-z0-9]+/g, "")}`
        : isFiltered ? "_Filtered" : "";
      const filename = months === 1
        ? `Al_Mawashi_${period.fileTag}_Returns${scopeTag}_${toKey}.pdf`
        : `Al_Mawashi_${period.fileTag}_Returns${scopeTag}_${fromKey}_to_${toKey}.pdf`;

      /* Compliance trail: who produced which report, over what scope, when.
         Stored as a normal record so the server's audit layer logs the create. */
      logReportRun({
        filename, periodType, from: fromKey, to: toKey,
        scope: scopeBits, sections: REPORT_SECTIONS.filter((s) => S[s.key]).map((s) => s.key),
        items: totalItems, kg: Math.round(totalKg * 100) / 100, condemned: condCount,
        delivery: deliver,
      });

      if (deliver === "blob") {
        /* datauristring → strip the "data:...;base64," prefix for the mailer. */
        const b64 = String(doc.output("datauristring")).replace(/^data:[^;]+;base64,/, "");
        return { filename, base64: b64, items: totalItems, label: mLabel };
      }

      doc.save(filename);
      say(`${period.fileTag} report generated`, "ok");
      setMonthlyOpen(false);
      return { filename, items: totalItems, label: mLabel };
    } catch (e) {
      console.error("[generatePeriodReport] failed:", e);
      say("Failed to generate report", "err");
      return null;
    } finally {
      setMonthlyBusy(false);
    }
  }

  /* ============================================================
     Image viewer
     ============================================================ */
  function openViewer(row) {
    const imgs = Array.isArray(row.images) ? row.images : [];
    if (!imgs.length) return;
    setViewerData({ title: row.productName || "Images", images: imgs });
    setViewerOpen(true);
  }

  /* ============================================================
     Presets
     ============================================================ */
  const currentSnapshot = {
    from: filterFrom, to: filterTo,
    posSel, originSel, actionSel, qtySel, hasImages, remarksState,
  };
  function applyPreset(p) {
    setFilterFrom(p.from || ""); setFilterTo(p.to || "");
    setPosSel(p.posSel || []); setOriginSel(p.originSel || []); setActionSel(p.actionSel || []);
    setQtySel(p.qtySel || "any"); setHasImages(p.hasImages || "any"); setRemarksState(p.remarksState || "any");
    toast(`Applied: ${p.name}`, "info");
  }
  function savePreset(name, snap) {
    const next = [...presets, { name, ...snap }];
    setPresets(next); savePresetsAll(next);
    toast(`Saved: ${name}`, "ok");
  }
  function deletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next); savePresetsAll(next);
  }

  /* ============================================================
     Active filter pills
     ============================================================ */
  const activeFilters = [];
  if (filterFrom) activeFilters.push({ label: "From", value: filterFrom, remove: () => setFilterFrom("") });
  if (filterTo) activeFilters.push({ label: "To", value: filterTo, remove: () => setFilterTo("") });
  posSel.forEach((p) => activeFilters.push({ label: "POS", value: p, remove: () => setPosSel(posSel.filter((x) => x !== p)) }));
  originSel.forEach((p) => activeFilters.push({ label: "Origin", value: p, remove: () => setOriginSel(originSel.filter((x) => x !== p)) }));
  actionSel.forEach((p) => activeFilters.push({ label: "Action", value: p, remove: () => setActionSel(actionSel.filter((x) => x !== p)) }));
  if (qtySel !== "any") activeFilters.push({ label: "Qty", value: qtySel.toUpperCase(), remove: () => setQtySel("any") });
  if (hasImages !== "any") activeFilters.push({ label: "Images", value: hasImages, remove: () => setHasImages("any") });
  if (remarksState !== "any") activeFilters.push({ label: "Remarks", value: remarksState, remove: () => setRemarksState("any") });

  /* ============================================================
     Compare metric helper
     ============================================================ */
  function diffPill(aVal, bVal, suffix = "") {
    if (!aVal && !bVal) return null;
    const diff = bVal - aVal;
    const pct = aVal ? Math.round((diff / aVal) * 100) : null;
    const up = diff > 0;
    const same = diff === 0;
    const color = same ? T.textM : up ? T.danger : T.success;
    const bg = same ? T.bgAlt : up ? T.dangerS : T.successS;
    return (
      <span style={{ ...sx.pill, background: bg, color, borderColor: bg }}>
        {same ? "—" : up ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
        {same ? "No change" : `${diff > 0 ? "+" : ""}${fmtNum(diff)}${suffix}${pct != null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""}`}
      </span>
    );
  }

  const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();

  /* ============================================================
     Render
     ============================================================ */
  function jumpToDay(d) {
    setSelectedDate(d);
    setSearchScope("day");
    const y = d.slice(0, 4), m = d.slice(5, 7);
    setOpenYears((p) => ({ ...p, [y]: true }));
    setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    setTab("browse");
  }

  const rowPad = density === "compact" ? "6px 8px" : "10px 10px";
  const visibleColumns = ALL_COLUMNS.filter((c) => c.always || visibleCols.has(c.key));

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, .6); } 50% { box-shadow: 0 0 0 6px rgba(5, 150, 105, 0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media print {
          body { background: #fff !important; }
          .br-noprint { display: none !important; }
          .br-print-only { display: block !important; }
          .br-page { padding: 0 !important; background: #fff !important; }
          .br-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
        .br-print-only { display: none; }
        .br-tbl-row:hover { background: ${T.cardAlt}; }
        .br-tree-day:hover { background: ${T.primaryS}; }
      `}</style>

      <div className="br-page" style={sx.page}>
        {/* Header */}
        <div className="br-noprint" style={{
          ...sx.card, padding: "16px 20px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: T.primaryS,
                color: T.primary, display: "grid", placeItems: "center",
              }}><FiPackage size={18} /></div>
              <div>
                <h1 style={sx.h1}>Returns Browser</h1>
                <div style={sx.muted}>
                  Quick KPIs · charts · advanced filters · global search across reports
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: T.danger, letterSpacing: ".5px" }}>AL MAWASHI</div>
              <div style={{ fontSize: 10, color: T.textM }}>Trans Emirates Livestock Trading L.L.C.</div>
            </div>
            {newCount > 0 && (
              <button onClick={applyPendingFetch} title="Apply pending updates" style={{
                ...sx.btn, background: T.success, color: "#fff", borderColor: T.success,
                fontWeight: 800, animation: "pulse 1.5s infinite",
              }}>
                <FiTrendingUp size={13} /> +{newCount} new
              </button>
            )}
            <button
              onClick={openMonthlyModal}
              title="Generate an executive returns report (monthly / quarterly / half-year / 9-month / annual PDF)"
              style={{
                ...sx.btn,
                background: `linear-gradient(135deg, ${T.primary} 0%, ${T.purple} 100%)`,
                color: "#fff", borderColor: T.primary, fontWeight: 800,
                boxShadow: "0 6px 16px rgba(79,70,229,.30)",
              }}
            >
              <FiFileText size={14} /> Reports
            </button>
            <IconBtn icon={FiPackage} onClick={() => { setProductInit({ code: "", name: "" }); setProductOpen(true); }} title="Open product insights">
              Product
            </IconBtn>
            <IconBtn icon={FiZap} onClick={() => setAutoRefresh((a) => !a)} active={autoRefresh}
              title={autoRefresh ? "Auto-refresh: ON (5 min)" : "Auto-refresh: OFF"}>
              Auto
            </IconBtn>
            <IconBtn icon={FiCopy} onClick={copyShareLink} title="Copy current view URL">Share</IconBtn>
            <IconBtn icon={FiRefreshCw} onClick={reload} disabled={loadingServer}>
              {loadingServer ? "Loading…" : "Refresh"}
            </IconBtn>
          </div>
        </div>

        {/* Server messages */}
        {serverErr && (
          <div className="br-noprint" style={{
            ...sx.card, padding: "10px 14px", marginBottom: 12, borderColor: "#fecaca",
            background: T.dangerS, color: T.danger, fontWeight: 600, fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <FiAlertTriangle size={16} /> {serverErr}
          </div>
        )}

        {/* Filter bar */}
        <div className="br-noprint" style={{ ...sx.card, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FiCalendar size={14} color={T.textM} />
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
              <span style={{ color: T.textS }}>→</span>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
            </div>
            <IconBtn onClick={() => setQuickDays(7)}>7d</IconBtn>
            <IconBtn onClick={() => setQuickDays(30)}>30d</IconBtn>
            <IconBtn onClick={() => setQuickDays(90)}>90d</IconBtn>
            <div style={{ flex: 1, minWidth: 0 }} />
            <MultiSelect label="POS" options={posOpts} selected={posSel} onChange={setPosSel} icon={FiLayers} />
            <MultiSelect label="Origin" options={originOpts} selected={originSel} onChange={setOriginSel} />
            <MultiSelect label="Action" options={actionOpts} selected={actionSel} onChange={setActionSel} />
            <select value={qtySel} onChange={(e) => setQtySel(e.target.value)} style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
              <option value="any">Qty: Any</option>
              <option value="kg">Qty: KG</option>
              <option value="pcs">Qty: PCS</option>
              <option value="plate">Qty: PLATE</option>
              <option value="other">Qty: Other</option>
            </select>
            <select value={hasImages} onChange={(e) => setHasImages(e.target.value)} style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
              <option value="any">Images: Any</option>
              <option value="yes">With images</option>
              <option value="no">No images</option>
            </select>
            <select value={remarksState} onChange={(e) => setRemarksState(e.target.value)} style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
              <option value="any">Remarks: Any</option>
              <option value="empty">Empty</option>
              <option value="nonempty">Non-empty</option>
            </select>
            <IconBtn icon={FiBookmark} onClick={() => setPresetsModal(true)}>Presets</IconBtn>
            {(activeFilters.length > 0 || search) && (
              <IconBtn icon={FiX} onClick={clearAll} danger>Clear all</IconBtn>
            )}
          </div>

          {/* Active filter pills */}
          {activeFilters.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
              <span style={{ ...sx.mutedS, alignSelf: "center", marginRight: 4 }}>Active:</span>
              {activeFilters.map((f, i) => (
                <FilterPill key={i} label={f.label} value={f.value} onRemove={f.remove} />
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="br-noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: "Overview", icon: FiBarChart2 },
              { value: "browse", label: "Browse", icon: FiList, badge: filteredReportsAsc.length },
              { value: "compare", label: "Compare", icon: FiActivity },
              { value: "reviews", label: "Reviews", icon: FiBookmark, badge: reviewsPending > 0 ? reviewsPending : undefined },
            ]}
          />
          <div style={{ ...sx.muted, display: "flex", alignItems: "center", gap: 6 }}>
            <FiInfo size={12} /> Press <kbd style={{
              background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 4,
              padding: "1px 6px", fontSize: 11, fontFamily: "monospace",
            }}>/</kbd> to focus search
          </div>
        </div>

        {/* Time machine slider */}
        {dateBounds.min && dateBounds.max && dateBounds.min !== dateBounds.max && (
          <div className="br-noprint" style={{
            ...sx.card, padding: "10px 14px", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            background: asOfDate ? T.warningS : T.card,
            borderColor: asOfDate ? "#fde68a" : T.border,
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.textM, fontWeight: 700, fontSize: 12 }}>
              <FiClock size={13} /> Time machine:
            </div>
            <span style={{ ...sx.mutedS, fontWeight: 700 }}>{dateBounds.min}</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, returnsData.length - 1)}
              value={(() => {
                if (!asOfDate) return Math.max(0, returnsData.length - 1);
                const dates = returnsData.map((r) => r.reportDate).filter(Boolean).sort();
                const i = dates.indexOf(asOfDate);
                return i < 0 ? dates.length - 1 : i;
              })()}
              onChange={(e) => {
                const dates = returnsData.map((r) => r.reportDate).filter(Boolean).sort();
                const i = parseInt(e.target.value);
                const d = dates[i];
                if (d) setAsOfDate(d === dateBounds.max ? "" : d);
              }}
              style={{ flex: 1, minWidth: 200, accentColor: T.warning, cursor: "pointer" }}
            />
            <span style={{ ...sx.mutedS, fontWeight: 700 }}>{dateBounds.max}</span>
            <span style={{
              ...sx.pill, fontWeight: 800,
              background: asOfDate ? T.warning : T.bgAlt,
              color: asOfDate ? "#fff" : T.textM,
              borderColor: asOfDate ? T.warning : T.border,
            }}>
              {asOfDate ? `As of ${asOfDate}` : "Today"}
            </span>
            {asOfDate && (
              <button
                onClick={() => setTmPlaying((p) => !p)}
                title={tmPlaying ? "Pause" : "Play forward"}
                style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}
              >{tmPlaying ? "⏸ Pause" : "▶ Play"}</button>
            )}
            {asOfDate && (
              <button
                onClick={() => { setAsOfDate(""); setTmPlaying(false); }}
                style={{ ...sx.btn, padding: "6px 10px", fontSize: 12, background: T.dangerS, color: T.danger, borderColor: "#fecaca" }}
              ><FiX size={11} /> Reset</button>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loadingServer && returnsData.length === 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ ...sx.card, padding: 14 }}>
                <Skeleton height={12} width="60%" />
                <Skeleton height={24} width="40%" style={{ marginTop: 10 }} />
                <Skeleton height={12} width="80%" style={{ marginTop: 8 }} />
              </div>
            ))}
          </div>
        )}

        {/* ====== OVERVIEW TAB ====== */}
        {tab === "overview" && (
          <div>
            {/* Stat strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
              <StatChip icon={FiFileText} label="Reports" value={kpi.totalReports}
                sub={filterFrom || filterTo ? `${filterFrom || "…"} → ${filterTo || "…"}` : "All time"} />
              <StatChip icon={FiPackage} label="Total items" value={fmtNum(kpi.totalItems, 0)}
                sub={`${fmtNum(kpi.totalQtyKg)} kg · ${fmtNum(kpi.totalQtyPcs, 0)} pcs`} color={T.info} bg={T.infoS} />
              <StatChip icon={FiAlertTriangle} label="Condemnation" value={`${kpi.condemnation.count} (${fmtPct(kpi.condemnation.percent)})`}
                sub={`${fmtNum(kpi.condemnation.kg)} kg`} color={T.danger} bg={T.dangerS} />
              <StatChip icon={FiZap} label="Use in production" value={`${kpi.useProd.count} (${fmtPct(kpi.useProd.percent)})`}
                sub="Latest action" color={T.purple} bg={T.purpleS} />
              <StatChip icon={FiLayers} label="Top POS" value={kpi.topPos.key || "—"}
                sub={`${kpi.topPos.value} items · ${kpi.topPosByKg.kg} kg`} color={T.warning} bg={T.warningS} />
            </div>

            {/* Heatmap + Anomalies */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FiCalendar size={16} color={T.primary} />
                    <h2 style={sx.h2}>Activity heatmap</h2>
                  </div>
                  <div style={{ display: "inline-flex", padding: 3, background: T.bgAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <button onClick={() => setHeatmapMode("items")} style={{
                      border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: heatmapMode === "items" ? T.card : "transparent",
                      color: heatmapMode === "items" ? T.primary : T.textM,
                    }}>By items</button>
                    <button onClick={() => setHeatmapMode("condemn")} style={{
                      border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: heatmapMode === "condemn" ? T.card : "transparent",
                      color: heatmapMode === "condemn" ? T.danger : T.textM,
                    }}>By condemnation</button>
                  </div>
                </div>
                <CalendarHeatmap
                  daily={dailyMetrics}
                  mode={heatmapMode}
                  anomalies={anomalies.dates}
                  selectedDate={selectedDate}
                  onPickDay={(d) => { setSelectedDate(d); setTab("browse"); const y=d.slice(0,4),m=d.slice(5,7); setOpenYears(p=>({...p,[y]:true})); setOpenMonths(p=>({...p,[`${y}-${m}`]:true})); }}
                />
              </div>

              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <FiTarget size={16} color={T.danger} />
                  <h2 style={sx.h2}>Anomalies</h2>
                  {anomalies.top.length > 0 && (
                    <span style={{ ...sx.pill, background: T.dangerS, color: T.danger, borderColor: "#fecaca", marginLeft: "auto" }}>
                      {anomalies.top.length} flagged
                    </span>
                  )}
                </div>
                {anomalies.stats && (
                  <div style={{ ...sx.mutedS, marginBottom: 8 }}>
                    Items μ {anomalies.stats.itemsMean} · threshold {anomalies.stats.itemsThreshold}
                    {" · "}Cond μ {anomalies.stats.condMean} · threshold {anomalies.stats.condThreshold}
                  </div>
                )}
                {anomalies.top.length === 0 ? (
                  <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>
                    {dailyMetrics.length < 4 ? "Need ≥4 days of data." : "No anomalies — within 2σ."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
                    {anomalies.top.map((a, i) => {
                      const reasonLabels = a.reasons.map((r) =>
                        r.kind === "items"
                          ? `${r.value} items (${r.sigma.toFixed(1)}σ)`
                          : `${r.value} cond (${r.sigma.toFixed(1)}σ)`
                      ).join(" · ");
                      return (
                        <button key={i} onClick={() => { setSelectedDate(a.date); setTab("browse"); const y=a.date.slice(0,4),m=a.date.slice(5,7); setOpenYears(p=>({...p,[y]:true})); setOpenMonths(p=>({...p,[`${y}-${m}`]:true})); }} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
                          background: T.cardAlt, cursor: "pointer", textAlign: "left",
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{a.date}</div>
                            <div style={{ ...sx.mutedS }}>{reasonLabels}</div>
                          </div>
                          <FiArrowRight size={14} color={T.textM} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Data quality flags */}
            {dataQualityIssues.total > 0 && (
              <div style={{ ...sx.card, padding: 16, marginBottom: 12, borderLeft: `4px solid ${T.warning}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FiAlertTriangle size={16} color={T.warning} />
                  <h2 style={sx.h2}>Needs attention</h2>
                  <span style={{ ...sx.pill, background: T.warningS, color: T.warning, borderColor: "#fde68a" }}>
                    {dataQualityIssues.total} issue{dataQualityIssues.total !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                  {[
                    { key: "missingExpiry", label: "Missing expiry", color: T.warning, bg: T.warningS, arr: dataQualityIssues.missingExpiry },
                    { key: "missingProduct", label: "Missing product name", color: T.danger, bg: T.dangerS, arr: dataQualityIssues.missingProduct },
                    { key: "qtyOutlier", label: "Quantity outliers", color: T.danger, bg: T.dangerS, arr: dataQualityIssues.qtyOutlier },
                    { key: "qtyZero", label: "Quantity is zero", color: T.warning, bg: T.warningS, arr: dataQualityIssues.qtyZero },
                    { key: "duplicates", label: "Duplicate rows", color: T.purple, bg: T.purpleS, arr: dataQualityIssues.duplicates },
                    { key: "condemnNoQty", label: "Condemnation w/ qty 0", color: T.danger, bg: T.dangerS, arr: dataQualityIssues.condemnNoQty },
                    { key: "otherActionEmpty", label: "Action 'Other' empty", color: T.warning, bg: T.warningS, arr: dataQualityIssues.otherActionEmpty },
                  ].filter((g) => g.arr.length > 0).map((g) => (
                    <div key={g.key} style={{
                      border: `1px solid ${T.border}`, borderRadius: 10, padding: 10, background: T.cardAlt,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{g.label}</span>
                        <span style={{ ...sx.badge, background: g.bg, color: g.color }}>{g.arr.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 130, overflow: "auto" }}>
                        {g.arr.slice(0, 5).map((it, i) => (
                          <button key={i} onClick={() => {
                            setSelectedDate(it.date); setTab("browse");
                            const y = it.date.slice(0, 4), m = it.date.slice(5, 7);
                            setOpenYears((p) => ({ ...p, [y]: true }));
                            setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
                          }} style={{
                            ...sx.btnGhost, textAlign: "left", padding: "4px 6px", fontSize: 11,
                            color: T.text, cursor: "pointer", borderRadius: 4,
                            display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center",
                          }}>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              <strong>{it.row.itemCode || it.row.productName || "—"}</strong>
                              {it.reason ? ` · ${it.reason}` : ""}
                            </span>
                            <span style={sx.mutedS}>{it.date}</span>
                          </button>
                        ))}
                        {g.arr.length > 5 && (
                          <span style={{ ...sx.mutedS, textAlign: "center" }}>+ {g.arr.length - 5} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
              {/* Time series */}
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={sx.h2}>Items over time</h2>
                  <span style={sx.mutedS}>{timeSeries.length} day(s)</span>
                </div>
                {timeSeries.length === 0 ? (
                  <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data in range.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <Sparkline
                      data={timeSeries}
                      width={Math.max(560, timeSeries.length * 28)}
                      height={140}
                      color={T.primary}
                      fill={T.primaryS}
                      interactive
                      renderTooltip={(d) => {
                        const isAnom = anomalies.dates.has(d.label);
                        return (
                          <>
                            <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                              <FiCalendar size={11} /> {d.label}
                              {isAnom && (
                                <span style={{ background: T.danger, color: "#fff", padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 800 }}>
                                  ⚠ anomaly
                                </span>
                              )}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontSize: 12 }}>
                              <span style={{ opacity: 0.7 }}>Items</span>
                              <span style={{ fontWeight: 700, textAlign: "right" }}>{d.value}</span>
                              {d.kg > 0 && <>
                                <span style={{ opacity: 0.7 }}>Weight</span>
                                <span style={{ fontWeight: 700, textAlign: "right" }}>{fmtNum(d.kg)} kg</span>
                              </>}
                              {d.pcs > 0 && <>
                                <span style={{ opacity: 0.7 }}>Pieces</span>
                                <span style={{ fontWeight: 700, textAlign: "right" }}>{fmtNum(d.pcs, 0)}</span>
                              </>}
                              {d.condCount > 0 && <>
                                <span style={{ color: "#fca5a5" }}>Condemned</span>
                                <span style={{ fontWeight: 700, textAlign: "right", color: "#fca5a5" }}>
                                  {d.condCount}{d.condKg > 0 ? ` · ${fmtNum(d.condKg)} kg` : ""}
                                </span>
                              </>}
                            </div>
                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,.15)", fontSize: 10, opacity: 0.7 }}>
                              Click on the heatmap or anomaly list to open this day
                            </div>
                          </>
                        );
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, ...sx.mutedS }}>
                      <span>{timeSeries[0]?.label}</span>
                      <span>{timeSeries[timeSeries.length - 1]?.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Top condemnation */}
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FiAlertTriangle size={16} color={T.danger} />
                  <h2 style={sx.h2}>Top Condemnation</h2>
                </div>
                <HBarList
                  items={kpi.topCondemn}
                  color={T.danger}
                  bg={T.dangerS}
                  formatValue={(v) => `${v}`}
                />
              </div>
            </div>

            {/* Bars row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FiCalendar size={14} color={T.primary} />
                  <h2 style={sx.h2}>Day-of-week</h2>
                </div>
                <DayOfWeekBars daily={dailyMetrics} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <h2 style={{ ...sx.h2, marginBottom: 12 }}>Top POS by items</h2>
                <HBarList items={kpi.topPosByItems} color={T.primary} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <h2 style={{ ...sx.h2, marginBottom: 12 }}>Top POS by KG</h2>
                <HBarList items={kpi.topPosByKg2} color={T.info} formatValue={(v) => `${fmtNum(v)} kg`} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <h2 style={{ ...sx.h2, marginBottom: 12 }}>Top Origins</h2>
                <HBarList items={kpi.topOrigins} color={T.success} />
              </div>
            </div>

            {/* Sankey flow */}
            <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <FiActivity size={16} color={T.primary} />
                <h2 style={sx.h2}>Flow: Origin → POS → Action</h2>
                <span style={sx.mutedS}>Hover any node to highlight its paths</span>
              </div>
              {sankeyFlows.length === 0 ? (
                <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data.</div>
              ) : (
                <SankeyChart flows={sankeyFlows} width={Math.max(900, 1100)} height={420} />
              )}
            </div>

            {/* Pareto */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={sx.h2}>Pareto — by Product</h2>
                  <span style={{ ...sx.pill, fontSize: 11 }}>80/20 rule</span>
                </div>
                <ParetoChart items={paretoData.byProduct} color={T.primary} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={sx.h2}>Pareto — by POS</h2>
                  <span style={{ ...sx.pill, fontSize: 11 }}>80/20 rule</span>
                </div>
                <ParetoChart items={paretoData.byPos} color={T.warning} />
              </div>
            </div>

            {/* Action breakdown */}
            <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
              <h2 style={{ ...sx.h2, marginBottom: 12 }}>Action breakdown (latest)</h2>
              {kpi.topActions.length === 0 ? (
                <div style={{ ...sx.muted, textAlign: "center", padding: 20 }}>No action data.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  {kpi.topActions.map((a, i) => {
                    const palette = [T.primary, T.danger, T.warning, T.success, T.info, T.purple];
                    const color = palette[i % palette.length];
                    return (
                      <MiniDonut
                        key={a.label}
                        percent={a.percent}
                        label={a.label || "—"}
                        color={color}
                        count={`${a.value} items`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== BROWSE TAB ====== */}
        {tab === "browse" && (
          <>
            {/* Search bar */}
            <div className="br-noprint" style={{ ...sx.card, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  position: "relative", flex: 1, minWidth: 280,
                }}>
                  <FiSearch size={14} color={T.textS} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    ref={searchInputRef}
                    type="text" value={search} onChange={(e) => { setSearch(e.target.value); setResPage(1); }}
                    list="returns-search-suggestions"
                    placeholder={searchScope === "day" ? "Search this day, e.g. pos:Abu action:condemnation qty:>10" : "Search all days, e.g. pos:X action:Y qty:>5"}
                    style={{ ...sx.input, paddingLeft: 36, paddingRight: 60, width: "100%", fontSize: 14 }}
                  />
                  <datalist id="returns-search-suggestions">
                    {SEARCH_QUICK_ACTIONS.map((item) => (
                      <option key={item.query} value={item.query}>{item.label}</option>
                    ))}
                    <option value='name:"ground beef"'>Exact product phrase</option>
                    <option value="remarks:nonempty">Rows with remarks</option>
                    <option value="expiry:nonempty">Rows with expiry</option>
                  </datalist>
                  {search && (
                    <button onClick={() => setSearch("")} style={{
                      position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)",
                      ...sx.btnGhost, padding: 4, color: T.textM, cursor: "pointer",
                    }}><FiX size={14} /></button>
                  )}
                  <details style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
                    <summary style={{ listStyle: "none", cursor: "pointer", padding: 4, color: isPowerQuery(search) ? T.primary : T.textM }} title="Power search syntax">
                      <FiHelpCircle size={16} />
                    </summary>
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
                      ...sx.card, padding: 14, minWidth: 320,
                      boxShadow: "0 12px 28px rgba(15,23,42,.18)",
                    }}>
                      <div style={{ ...sx.h3, marginBottom: 8 }}>Power search</div>
                      <div style={{ ...sx.mutedS, marginBottom: 10 }}>
                        Combine free text with key:value tokens.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", fontSize: 12 }}>
                        {[
                          ["code:1234", "Item code substring"],
                          ["name:beef", "Product name (also: product:)"],
                          ["pos:abu", "POS / butchery"],
                          ["origin:uae", "Origin"],
                          ["ref:000087", "Report reference number"],
                          ["action:condemn", "Action"],
                          ["qty:>10", "Quantity (>, <, >=, <=, =)"],
                          ["type:kg", "kg | pcs"],
                          ["expiry:empty", "Missing expiry (also: nonempty or 2026)"],
                          ["remarks:nonempty", "empty | nonempty | text"],
                          ["images:yes", "yes | no"],
                          [`name:"ground beef"`, "Use quotes for spaces"],
                        ].map(([k, v], i) => (
                          <React.Fragment key={i}>
                            <code style={{ background: T.bgAlt, padding: "2px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace", color: T.primary, fontSize: 11 }}>{k}</code>
                            <span style={{ color: T.textM }}>{v}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
                <div style={{ display: "inline-flex", padding: 3, background: T.bgAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <button onClick={() => setSearchScope("day")} style={{
                    border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: searchScope === "day" ? T.card : "transparent",
                    color: searchScope === "day" ? T.primary : T.textM,
                  }}>This day</button>
                  <button onClick={() => setSearchScope("all")} style={{
                    border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: searchScope === "all" ? T.card : "transparent",
                    color: searchScope === "all" ? T.primary : T.textM,
                  }}>All days</button>
                </div>
                {isPowerQuery(search) && (
                  <span style={{ ...sx.pill, background: T.primaryS, color: T.primary, borderColor: "#c7d2fe" }}>
                    <FiZap size={11} /> power
                  </span>
                )}
                {searchScope === "day" && search && selectedReport && (
                  <span style={{ ...sx.mutedS, fontWeight: 700 }}>
                    {sortedRows.length} / {(selectedReport.items || []).length} rows
                  </span>
                )}
                {searchScope === "all" && search && (
                  <span style={{ ...sx.mutedS, fontWeight: 700 }}>
                    {globalResults.length} match(es)
                  </span>
                )}
              </div>
              <div style={{
                display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
                marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}`,
              }}>
                <span style={{ ...sx.mutedS, fontWeight: 700, marginRight: 2 }}>Quick search:</span>
                {SEARCH_QUICK_ACTIONS.map((item) => (
                  <button
                    key={item.query}
                    type="button"
                    onClick={() => applySearchQuick(item.query)}
                    title={`Search ${searchScope === "all" ? "all days" : "this day"} for ${item.query}`}
                    style={{
                      ...sx.btn,
                      padding: "4px 9px",
                      fontSize: 12,
                      background: search === item.query ? T.primaryS : T.cardAlt,
                      color: search === item.query ? T.primary : T.textM,
                      borderColor: search === item.query ? "#c7d2fe" : T.border,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Global search results */}
            {searchScope === "all" && search.trim() && (
              <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                  <h2 style={sx.h2}>Search results · {globalResults.length}</h2>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {totalPages > 1 && (
                      <>
                        <IconBtn onClick={() => setResPage((p) => Math.max(1, p - 1))} disabled={resPage <= 1}>Prev</IconBtn>
                        <span style={sx.mutedS}>Page {resPage}/{totalPages}</span>
                        <IconBtn onClick={() => setResPage((p) => Math.min(totalPages, p + 1))} disabled={resPage >= totalPages}>Next</IconBtn>
                      </>
                    )}
                    <IconBtn icon={FiDownload} onClick={exportSearchResultsXLSX}>XLSX</IconBtn>
                    <IconBtn icon={FiDownload} onClick={handleExportSearchCSV}>CSV</IconBtn>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: T.bgAlt }}>
                        {["#", "Date", "Code", "Product", "Origin", "POS", "Qty", "Type", "Expiry", "Action", "Match", "Score", ""].map((h) => (
                          <th key={h} style={{
                            padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700,
                            color: T.textM, textTransform: "uppercase", letterSpacing: ".04em",
                            borderBottom: `1px solid ${T.border}`,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedResults.length === 0 ? (
                        <tr><td colSpan={12} style={{ padding: 30, textAlign: "center", color: T.textM }}>No results.</td></tr>
                      ) : pagedResults.map((r, i) => {
                        const row = r.row;
                        const pos = safeButchery(row);
                        const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
                        return (
                          <tr key={`${r.date}-${r.idx}-${i}`} className="br-tbl-row">
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, color: T.textS }}>{(resPage - 1) * RES_PAGE_SIZE + i + 1}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 600 }}>{r.date}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(row.itemCode || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>
                              {highlight(row.productName || "", search)}
                              {Array.isArray(row.images) && row.images.length > 0 && (
                                <button onClick={() => openViewer(row)} style={{
                                  ...sx.btn, marginLeft: 6, padding: "2px 8px", fontSize: 11,
                                  background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                                }}><FiEye size={11} /> {row.images.length}</button>
                              )}
                            </td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(row.origin || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(pos || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, textAlign: "right" }}>{row.quantity ?? ""}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{qtyType}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{row.expiry || ""}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(actionText(row) || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, ...sx.mutedS }}>{r.hits.join(", ") || "—"}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 700, color: T.primary }}>{r.score}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>
                              <IconBtn icon={FiArrowRight} onClick={() => jumpToDay(r.date)}>Open</IconBtn>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tree + Detail panel */}
            <div style={{
              display: "grid",
              gridTemplateColumns: treeHidden ? "44px 1fr" : "minmax(260px, 300px) 1fr",
              gap: 12,
            }}>
              {/* Left tree - folds away to a thin rail */}
              {treeHidden ? (
              <div
                className="br-noprint"
                title="Show the date tree"
                onClick={() => setTreeHidden(false)}
                style={{
                  ...sx.card, alignSelf: "start", padding: "8px 4px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                }}
              >
                <FiChevronRight size={16} color={T.primary} />
                <div style={{
                  writingMode: "vertical-rl", transform: "rotate(180deg)",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 12, fontWeight: 700, color: T.textM, letterSpacing: "0.04em",
                }}>
                  <FiCalendar size={13} />
                  Date tree
                </div>
                <span style={{ ...sx.pill, fontSize: 11, padding: "3px 7px" }}>{treeDayCount}</span>
              </div>
              ) : (
              <div className="br-noprint" style={{
                ...sx.card, maxHeight: "75vh", overflow: "auto", padding: 4,
              }}>
                <div style={{
                  position: "sticky", top: 0, zIndex: 2, background: T.card,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                  padding: "6px 6px 8px", borderBottom: `1px solid ${T.border}`,
                }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: T.textM }}>
                    <FiCalendar size={13} /> Date tree
                    <span style={sx.mutedS}>({treeDayCount})</span>
                  </span>
                  <span style={{ display: "inline-flex", gap: 4 }}>
                    <IconBtn
                      icon={allTreeOpen ? FiChevronsUp : FiChevronsDown}
                      title={allTreeOpen ? "Collapse all years and months" : "Expand all years and months"}
                      onClick={() => (allTreeOpen ? collapseTreeNodes() : expandTreeNodes())}
                      disabled={hierarchyAsc.length === 0}
                      style={{ padding: "5px 7px" }}
                    />
                    <IconBtn
                      icon={FiChevronLeft}
                      title="Hide the date tree"
                      onClick={() => setTreeHidden(true)}
                      style={{ padding: "5px 7px" }}
                    />
                  </span>
                </div>
                {hierarchyAsc.length === 0 ? (
                  <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>
                    No reports for the selected period.
                  </div>
                ) : hierarchyAsc.map(({ year, months }) => {
                  const yOpen = !!openYears[year];
                  const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
                  return (
                    <div key={year}>
                      <div onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", cursor: "pointer", fontWeight: 700, color: T.text, fontSize: 13,
                        background: yOpen ? T.cardAlt : "transparent",
                      }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {yOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                          Year {year}
                        </span>
                        <span style={{ ...sx.pill, fontSize: 11 }}>{yearCount}</span>
                      </div>
                      {yOpen && months.map(({ month, days }) => {
                        const key = `${year}-${month}`;
                        const mOpen = !!openMonths[key];
                        return (
                          <div key={key}>
                            <div onClick={() => setOpenMonths((p) => ({ ...p, [key]: !p[key] }))} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "8px 12px 8px 28px", cursor: "pointer", color: T.textM, fontSize: 13,
                            }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                {mOpen ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                                Month {month}
                              </span>
                              <span style={sx.mutedS}>{days.length}</span>
                            </div>
                            {mOpen && days.map((d) => {
                              const isSelected = selectedDate === d;
                              const rep = filteredReportsAsc.find((r) => r.reportDate === d);
                              const cnt = rep?.items?.filter(rowPassesAdvanced).length || 0;
                              const isAnom = anomalies.dates.has(d);
                              return (
                                <div key={d} className="br-tree-day" onClick={() => setSelectedDate(d)} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "8px 12px 8px 44px", cursor: "pointer",
                                  background: isSelected ? T.primaryS : "transparent",
                                  borderLeft: isSelected ? `3px solid ${T.primary}` : "3px solid transparent",
                                  fontSize: 13, color: isSelected ? T.primaryD : T.text,
                                  fontWeight: isSelected ? 700 : 500,
                                }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {d}
                                    {isAnom && (
                                      <span title="Anomaly day" style={{
                                        width: 6, height: 6, borderRadius: 999, background: T.danger,
                                        display: "inline-block", flexShrink: 0,
                                      }} />
                                    )}
                                  </span>
                                  <span style={{ ...sx.mutedS, fontWeight: 700, color: isSelected ? T.primary : T.textS }}>{cnt}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              )}

              {/* Right detail panel */}
              <div className="br-card" style={{ ...sx.card }}>
                {!selectedReport ? (
                  <div style={{ textAlign: "center", padding: 80, color: T.textM, fontSize: 14 }}>
                    <FiCalendar size={32} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 10 }}>Pick a date from the list to view its details.</div>
                  </div>
                ) : (
                  <>
                    {/* Detail header */}
                    <div className="br-noprint" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px", borderBottom: `1px solid ${T.border}`, gap: 10, flexWrap: "wrap",
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>
                            {selectedReport.reportDate}
                          </div>
                          {selectedReport.refNo && (
                            <span
                              title={
                                isPendingRef(selectedReport.refNo)
                                  ? "Placeholder — run the reference backfill in Settings to assign a permanent number"
                                  : "Reference number"
                              }
                              style={{
                                ...sx.pill,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                letterSpacing: ".3px",
                                background: isPendingRef(selectedReport.refNo) ? T.warningS : T.bgAlt,
                                color: isPendingRef(selectedReport.refNo) ? T.warning : T.text,
                                borderColor: isPendingRef(selectedReport.refNo) ? "#fde68a" : T.border,
                              }}
                            >
                              {selectedReport.refNo}
                            </span>
                          )}
                        </div>
                        {selectedSummary && (
                          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe" }}>
                              {selectedSummary.count}{selectedSummary.count !== selectedSummary.total ? ` / ${selectedSummary.total}` : ""} items
                            </span>
                            {selectedSummary.kg > 0 && (
                              <span style={{ ...sx.pill, background: T.infoS, color: T.info, borderColor: "#a5f3fc" }}>
                                {fmtNum(selectedSummary.kg)} kg
                              </span>
                            )}
                            {selectedSummary.pcs > 0 && (
                              <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0" }}>
                                {fmtNum(selectedSummary.pcs, 0)} pcs
                              </span>
                            )}
                            {selectedSummary.plate > 0 && (
                              <span style={{ ...sx.pill, background: "#f5f3ff", color: "#5b21b6", borderColor: "#ddd6fe" }}>
                                {fmtNum(selectedSummary.plate, 0)} plate
                              </span>
                            )}
                            {selectedSummary.other > 0 && (
                              <span style={{ ...sx.pill, background: T.warningS, color: T.warning, borderColor: "#fde68a" }}>
                                {fmtNum(selectedSummary.other)} other
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {/* Group by */}
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                          style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
                          <option value="none">Group: None</option>
                          <option value="pos">Group by POS</option>
                          <option value="origin">Group by Origin</option>
                          <option value="action">Group by Action</option>
                        </select>
                        {/* Density */}
                        <IconBtn icon={density === "compact" ? FiList : FiGrid}
                          onClick={() => setDensity((d) => d === "compact" ? "comfy" : "compact")}
                          title={`Density: ${density}`}>
                          {density === "compact" ? "Compact" : "Comfy"}
                        </IconBtn>
                        {/* Columns toggle */}
                        <div style={{ position: "relative" }}>
                          <IconBtn icon={FiColumns} onClick={() => setColsOpen((o) => !o)} active={colsOpen}>Columns</IconBtn>
                          {colsOpen && (
                            <div style={{
                              position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
                              ...sx.card, padding: 8, minWidth: 180,
                              boxShadow: "0 10px 24px rgba(15,23,42,.12)",
                            }}>
                              {ALL_COLUMNS.filter((c) => !c.always).map((c) => {
                                const checked = visibleCols.has(c.key);
                                return (
                                  <label key={c.key} style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                                    borderRadius: 6, cursor: "pointer", fontSize: 13,
                                  }}>
                                    <input type="checkbox" checked={checked} onChange={() => {
                                      const next = new Set(visibleCols);
                                      if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                                      setVisibleCols(next);
                                    }} style={{ accentColor: T.primary }} />
                                    {c.label}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Exports */}
                        <IconBtn icon={FiPrinter} onClick={handlePrint}>Print</IconBtn>
                        <IconBtn icon={FiDownload} onClick={handleExportPDF}>PDF</IconBtn>
                        <IconBtn icon={FiMail} onClick={() => setEmailOpen(true)}>Email</IconBtn>
                        <IconBtn icon={FiDownload} onClick={handleExportXLSXSelected}>XLSX</IconBtn>
                        <IconBtn icon={FiDownload} onClick={handleExportCSV}>CSV</IconBtn>
                        <IconBtn icon={FiLock} onClick={handleExportXLSXAllLocked}>XLSX (ALL)</IconBtn>
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflow: "auto", maxHeight: "65vh" }}>
                      {groupBy !== "none" && groupedRows ? (
                        groupedRows.map((g) => (
                          <div key={g.key} style={{ borderBottom: `2px solid ${T.border}` }}>
                            <div style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "10px 16px", background: T.cardAlt, position: "sticky", top: 0, zIndex: 5,
                              borderBottom: `1px solid ${T.border}`,
                            }}>
                              <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{g.key}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe" }}>{g.rows.length} items</span>
                                {g.kg > 0 && <span style={{ ...sx.pill, background: T.infoS, color: T.info, borderColor: "#a5f3fc" }}>{fmtNum(g.kg)} kg</span>}
                                {g.pcs > 0 && <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0" }}>{g.pcs} pcs</span>}
                                {g.plate > 0 && <span style={{ ...sx.pill, background: "#f5f3ff", color: "#5b21b6", borderColor: "#ddd6fe" }}>{g.plate} plate</span>}
                              </div>
                            </div>
                            <DataTable
                              rows={g.rows}
                              columns={visibleColumns}
                              changeMap={changeMap}
                              search={searchScope === "day" ? search : ""}
                              highlight={highlight}
                              openViewer={openViewer}
                              rowPad={rowPad}
                              sort={sort}
                              toggleSort={toggleSort}
                              showHeader={false}
                              auditTrailByKey={auditTrailByKey}
                              onOpenAudit={(row, t) => { setAuditItem({ row, trail: t }); setAuditOpen(true); }}
                              selectedRows={selectedRows}
                              onToggleSelect={toggleRowSelect}
                              onToggleAll={toggleAllVisible}
                              onRangeSelect={rangeSelect}
                              onOpenProduct={(code, name) => { setProductInit({ code, name }); setProductOpen(true); }}
                              onMarkReview={(row) => addReview(selectedReport.reportDate, row)}
                              reviewedSet={new Set(Object.keys(reviews))}
                              currentDate={selectedReport?.reportDate}
                            />
                          </div>
                        ))
                      ) : (
                        <DataTable
                          rows={sortedRows}
                          columns={visibleColumns}
                          changeMap={changeMap}
                          search={searchScope === "day" ? search : ""}
                          highlight={highlight}
                          openViewer={openViewer}
                          rowPad={rowPad}
                          sort={sort}
                          toggleSort={toggleSort}
                          showHeader={true}
                          auditTrailByKey={auditTrailByKey}
                          onOpenAudit={(row, t) => { setAuditItem({ row, trail: t }); setAuditOpen(true); }}
                          selectedRows={selectedRows}
                          onToggleSelect={toggleRowSelect}
                          onToggleAll={toggleAllVisible}
                          onRangeSelect={rangeSelect}
                          onOpenProduct={(code, name) => { setProductInit({ code, name }); setProductOpen(true); }}
                          onMarkReview={(row) => addReview(selectedReport.reportDate, row)}
                          reviewedSet={new Set(Object.keys(reviews))}
                          currentDate={selectedReport?.reportDate}
                        />
                      )}
                      {sortedRows.length === 0 && (
                        <div style={{ ...sx.muted, textAlign: "center", padding: 40 }}>
                          No rows match current filters.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ====== COMPARE TAB ====== */}
        {tab === "compare" && (
          <div>
            <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
              <h2 style={{ ...sx.h2, marginBottom: 12 }}>Compare two periods</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ ...sx.h3, marginBottom: 8, color: T.primary }}>Period A</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="date" value={cmpAFrom} onChange={(e) => setCmpAFrom(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                    <span style={{ color: T.textS }}>→</span>
                    <input type="date" value={cmpATo} onChange={(e) => setCmpATo(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                  </div>
                </div>
                <div>
                  <div style={{ ...sx.h3, marginBottom: 8, color: T.success }}>Period B</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="date" value={cmpBFrom} onChange={(e) => setCmpBFrom(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                    <span style={{ color: T.textS }}>→</span>
                    <input type="date" value={cmpBTo} onChange={(e) => setCmpBTo(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                  </div>
                </div>
              </div>
            </div>

            {(!cmpAFrom && !cmpATo && !cmpBFrom && !cmpBTo) ? (
              <div style={{ ...sx.card, padding: 40, textAlign: "center" }}>
                <FiActivity size={32} color={T.textS} />
                <div style={{ ...sx.muted, marginTop: 10 }}>Pick two date ranges to compare.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[{ key: "A", data: cmpA, color: T.primary, bg: T.primaryS },
                    { key: "B", data: cmpB, color: T.success, bg: T.successS }].map((p) => (
                    <div key={p.key} style={{ ...sx.card, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h2 style={sx.h2}>Period {p.key}</h2>
                        <span style={{ ...sx.pill, background: p.bg, color: p.color, borderColor: p.bg }}>
                          {p.data.days} day(s)
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><div style={sx.mutedS}>Items</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmtNum(p.data.items, 0)}</div></div>
                        <div><div style={sx.mutedS}>Avg/day</div><div style={{ fontSize: 22, fontWeight: 800 }}>{p.data.avgPerDay}</div></div>
                        <div><div style={sx.mutedS}>Total KG</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmtNum(p.data.kg)}</div></div>
                        <div><div style={sx.mutedS}>Condemnation</div><div style={{ fontSize: 22, fontWeight: 800, color: T.danger }}>{p.data.condCount}</div></div>
                      </div>
                      {p.data.daily.length > 0 && (
                        <div style={{ marginTop: 12, overflowX: "auto" }}>
                          <Sparkline data={p.data.daily} width={Math.max(360, p.data.daily.length * 22)} height={70} color={p.color} fill={p.bg} showDots={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Diff strip */}
                <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
                  <h2 style={{ ...sx.h2, marginBottom: 10 }}>B vs A — Δ</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    <div><div style={sx.mutedS}>Items</div>{diffPill(cmpA.items, cmpB.items)}</div>
                    <div><div style={sx.mutedS}>Avg / day</div>{diffPill(cmpA.avgPerDay, cmpB.avgPerDay)}</div>
                    <div><div style={sx.mutedS}>KG</div>{diffPill(cmpA.kg, cmpB.kg, " kg")}</div>
                    <div><div style={sx.mutedS}>PCS</div>{diffPill(cmpA.pcs, cmpB.pcs)}</div>
                    <div><div style={sx.mutedS}>Condemnation</div>{diffPill(cmpA.condCount, cmpB.condCount)}</div>
                    <div><div style={sx.mutedS}>Condemnation KG</div>{diffPill(cmpA.condKg, cmpB.condKg, " kg")}</div>
                  </div>
                </div>

                {/* Top breakdowns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ ...sx.card, padding: 16 }}>
                    <h2 style={{ ...sx.h2, marginBottom: 10 }}>Top POS — A vs B</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.primary }}>A</div><HBarList items={cmpA.topPos} color={T.primary} /></div>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.success }}>B</div><HBarList items={cmpB.topPos} color={T.success} /></div>
                    </div>
                  </div>
                  <div style={{ ...sx.card, padding: 16 }}>
                    <h2 style={{ ...sx.h2, marginBottom: 10 }}>Top Action — A vs B</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.primary }}>A</div><HBarList items={cmpA.topAct} color={T.primary} /></div>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.success }}>B</div><HBarList items={cmpB.topAct} color={T.success} /></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ====== REVIEWS TAB ====== */}
        {tab === "reviews" && (
          <div>
            <div style={{ ...sx.card, padding: 14, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ ...sx.h2 }}>Review queue</h2>
                <div style={{ ...sx.mutedS, marginTop: 4 }}>
                  Items flagged by QC for follow-up · {reviewsArr.length} total · {reviewsPending} pending
                </div>
              </div>
              {reviewsArr.length > 0 && (
                <button onClick={() => {
                  if (window.confirm("Clear all reviews?")) { setReviews({}); persistReviews({}); }
                }} style={{ ...sx.btn, color: T.danger, borderColor: "#fecaca", background: T.dangerS }}>
                  <FiTrash2 size={13} /> Clear all
                </button>
              )}
            </div>

            {reviewsArr.length === 0 ? (
              <div style={{ ...sx.card, padding: 60, textAlign: "center" }}>
                <FiBookmark size={36} style={{ opacity: 0.25, color: T.textM }} />
                <div style={{ marginTop: 10, fontWeight: 700, color: T.text }}>No reviews yet</div>
                <div style={{ ...sx.mutedS, marginTop: 4 }}>
                  Click "Flag" on any row in Browse to add it here.
                </div>
              </div>
            ) : (
              <div style={{ ...sx.card, padding: 0, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: T.bgAlt }}>
                      {["Status", "Date", "Item", "POS · Origin", "Qty", "Action", "Notes", ""].map((h) => (
                        <th key={h} style={{
                          padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700,
                          color: T.textM, textTransform: "uppercase", letterSpacing: ".04em",
                          borderBottom: `1px solid ${T.border}`,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewsArr.map((r) => {
                      const qtyType = (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? "" : (r.qtyType || "");
                      return (
                        <tr key={r.key} style={{ background: r.status === "done" ? T.successS : "transparent", opacity: r.status === "done" ? 0.7 : 1 }}>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top" }}>
                            <button onClick={() => updateReview(r.key, { status: r.status === "pending" ? "done" : "pending" })} style={{
                              ...sx.pill, cursor: "pointer", padding: "4px 10px", fontSize: 11,
                              background: r.status === "done" ? T.success : T.warningS,
                              color: r.status === "done" ? "#fff" : T.warning,
                              borderColor: r.status === "done" ? T.success : "#fde68a",
                            }}>
                              {r.status === "done" ? <><FiCheck size={11} /> Done</> : <>⏳ Pending</>}
                            </button>
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top", fontWeight: 700, fontSize: 12 }}>
                            <button onClick={() => {
                              setSelectedDate(r.date); setTab("browse");
                              const y = r.date.slice(0, 4), m = r.date.slice(5, 7);
                              setOpenYears((p) => ({ ...p, [y]: true }));
                              setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
                            }} style={{
                              ...sx.btnGhost, padding: 0, color: T.primary, cursor: "pointer",
                              textDecoration: "underline", textUnderlineOffset: 2,
                              fontWeight: 700, fontSize: 12,
                            }}>{r.date}</button>
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top" }}>
                            <button onClick={() => { setProductInit({ code: r.itemCode, name: r.productName }); setProductOpen(true); }} style={{
                              ...sx.btnGhost, padding: 0, color: T.text, cursor: "pointer", textAlign: "left",
                              fontWeight: 700, textDecoration: "underline", textDecorationStyle: "dotted",
                              textUnderlineOffset: 2, textDecorationColor: T.textS,
                            }}>{r.productName || "—"}</button>
                            {r.itemCode && <div style={{ ...sx.mutedS, fontFamily: "ui-monospace, monospace", marginTop: 2 }}>{r.itemCode}</div>}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top", fontSize: 12, color: T.textM }}>
                            {r.pos || "—"}
                            <div style={{ ...sx.mutedS }}>{r.origin || "—"}</div>
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top", textAlign: "right", fontWeight: 700 }}>
                            {r.quantity ?? "—"} <span style={{ ...sx.mutedS }}>{qtyType}</span>
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top", fontSize: 12 }}>
                            {r.action || "—"}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top", minWidth: 220 }}>
                            <textarea
                              value={r.notes || ""}
                              onChange={(e) => updateReview(r.key, { notes: e.target.value })}
                              placeholder="Add notes…"
                              rows={2}
                              style={{
                                ...sx.input, width: "100%", fontSize: 12, padding: "6px 8px",
                                resize: "vertical", fontFamily: "inherit",
                              }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${T.borderS}`, verticalAlign: "top" }}>
                            <button onClick={() => removeReview(r.key)} title="Remove" style={{
                              ...sx.btn, padding: "4px 8px", fontSize: 11,
                              color: T.danger, background: T.dangerS, borderColor: "#fecaca",
                            }}><FiX size={12} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <ImageViewerModal open={viewerOpen} images={viewerData.images} title={viewerData.title} onClose={() => setViewerOpen(false)} />
        <PasswordModal show={pwModal} title="Password required" onSubmit={handlePasswordSubmit} onCancel={() => setPwModal(false)} />
        <PresetsModal
          open={presetsModal}
          onClose={() => setPresetsModal(false)}
          presets={presets}
          onApply={applyPreset}
          onSave={savePreset}
          onDelete={deletePreset}
          currentSnapshot={currentSnapshot}
        />
        <AuditTrailModalInner
          open={auditOpen}
          onClose={() => setAuditOpen(false)}
          item={auditItem?.row}
          trail={auditItem?.trail || []}
        />
        <ProductInsightsModalInner
          open={productOpen}
          onClose={() => setProductOpen(false)}
          returnsData={returnsData}
          changeMapByDate={changeMapByDate}
          auditTrailByKey={auditTrailByKey}
          initialCode={productInit.code}
          initialName={productInit.name}
        />
        <EmailSendModal
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          payload={selectedReport}
          config={emailConfig}
        />

        {/* Monthly Report modal */}
        {monthlyOpen && (
          <div
            className="br-noprint"
            onClick={() => !monthlyBusy && setMonthlyOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 1200,
              background: "rgba(15,23,42,.55)", backdropFilter: "blur(2px)",
              display: "grid", placeItems: "center", padding: 16,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{
              ...sx.card, width: "min(1080px, 97vw)", maxHeight: "92vh",
              overflow: "hidden", padding: 0, display: "flex", flexDirection: "column",
              boxShadow: "0 24px 60px rgba(15,23,42,.35)",
              direction: isAr ? "rtl" : "ltr",
              textAlign: isAr ? "right" : "left",
            }}>
              {/* Header band */}
              <div style={{
                background: `linear-gradient(135deg, ${T.primary} 0%, ${T.purple} 100%)`,
                color: "#fff", padding: "18px 20px",
                display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center",
                }}><FiFileText size={20} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{L("title")}</div>
                  <div style={{ fontSize: 12, opacity: .9 }}>{L("subtitle")}</div>
                </div>
                {/* Popup language — the generated PDF stays English either way. */}
                <button
                  onClick={() => setRbLang(isAr ? "en" : "ar")}
                  title={isAr ? "Switch to English" : "التبديل إلى العربية"}
                  style={{
                    background: "rgba(255,255,255,.18)", color: "#fff",
                    border: "1px solid rgba(255,255,255,.35)", borderRadius: 999,
                    padding: "6px 14px", cursor: "pointer", fontFamily: "inherit",
                    fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap",
                  }}
                >{isAr ? "🇬🇧 EN" : "🇸🇦 عربي"}</button>
                <button onClick={() => !monthlyBusy && setMonthlyOpen(false)} style={{
                  ...sx.btnGhost, color: "#fff", cursor: "pointer", padding: 4,
                }}><FiX size={18} /></button>
              </div>

              <style>{`
                @media (max-width: 900px) {
                  .rb-grid { grid-template-columns: 1fr !important; }
                  .rb-rail { flex-direction: row !important; overflow-x: auto; border-right: none !important;
                             border-bottom: 1px solid ${T.border} !important; }
                  .rb-outline { display: none !important; }
                }
              `}</style>

              {/* Body: nav rail · panel · live outline */}
              <div className="rb-grid" style={{
                display: "grid", gridTemplateColumns: "186px minmax(0,1fr) 224px",
                flex: 1, minHeight: 0, overflow: "hidden",
              }}>
                {/* ── Left rail ── */}
                <div className="rb-rail" style={{
                  display: "flex", flexDirection: "column", gap: 4, padding: 12,
                  borderRight: `1px solid ${T.border}`, background: T.bgAlt, overflowY: "auto",
                }}>
                  {[
                    { k: "preset",   icon: "⚡", label: L("navPreset"),   sub: L("navPresetSub") },
                    { k: "scope",    icon: "🎯", label: L("navScope"),    sub: L("navScopeSub") },
                    { k: "content",  icon: "🧩", label: L("navSections"), sub: `${activeSectionCount}/${REPORT_SECTIONS.length} ${L("on")}` },
                    { k: "analysis", icon: "🧠", label: L("navAnalysis"), sub: L("navAnalysisSub") },
                    { k: "details",  icon: "🏷️", label: L("navDoc"),      sub: L("navDocSub") },
                    { k: "delivery", icon: "📤", label: L("navDelivery"), sub: L("navDeliverySub") },
                  ].map((t) => {
                    const on = reportTab === t.k;
                    return (
                      <button
                        key={t.k}
                        onClick={() => setReportTab(t.k)}
                        disabled={monthlyBusy}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                          padding: "10px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                          border: `1px solid ${on ? T.primary : "transparent"}`,
                          background: on ? "#fff" : "transparent",
                          boxShadow: on ? "0 2px 8px rgba(15,23,42,.08)" : "none",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{t.icon}</span>
                        <span style={{ minWidth: 0, textAlign: isAr ? "right" : "left" }}>
                          <span style={{
                            display: "block", fontSize: 13, fontWeight: 800,
                            color: on ? T.primaryD : T.text,
                          }}>{t.label}</span>
                          <span style={{ display: "block", fontSize: 11, color: T.textM, whiteSpace: "nowrap" }}>{t.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── Panel ── */}
                <div style={{ padding: 20, overflowY: "auto", minHeight: 0 }}>

                {/* ── PRESETS ── */}
                {reportTab === "preset" && (
                  <>
                    {/* ── Saved templates ── */}
                    <div style={{ ...sx.h3, marginBottom: 4 }}>{L("myTemplates")}</div>
                    <div style={{ ...sx.muted, marginBottom: 10 }}>{L("tplScopeNote")}</div>

                    {savedTemplates.length === 0 ? (
                      <div style={{
                        ...sx.muted, fontSize: 12.5, padding: "12px 14px",
                        border: `1px dashed ${T.border}`, borderRadius: 10, marginBottom: 12,
                      }}>{L("tplNone")}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                        {savedTemplates.map((tpl) => {
                          const nSec = REPORT_SECTIONS.filter((s) => tpl.opts?.sections?.[s.key]).length;
                          const nFil = (tpl.opts?.branches?.length || 0) + (tpl.opts?.products?.length || 0)
                            + (tpl.opts?.origins?.length || 0) + (tpl.opts?.actions?.length || 0)
                            + (tpl.opts?.qtyType && tpl.opts.qtyType !== "all" ? 1 : 0)
                            + (tpl.opts?.condemnedOnly ? 1 : 0)
                            + (tpl.opts?.minQty ? 1 : 0);
                          return (
                            <div key={tpl.recordId} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "11px 14px", borderRadius: 12,
                              border: `1px solid ${T.border}`, background: "#fff",
                            }}>
                              <span style={{ fontSize: 19 }}>💾</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{
                                  fontSize: 13.5, fontWeight: 800, color: T.text,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{tpl.name}</div>
                                <div style={{ fontSize: 11.5, color: T.textM, marginTop: 2 }}>
                                  {nSec} {L("sectionsWord")}
                                  {nFil > 0 ? ` · ${nFil} ${L("scopeActive")}` : ""}
                                </div>
                              </div>
                              <button
                                onClick={() => applyTemplate(tpl)} disabled={monthlyBusy || tplBusy}
                                style={{ ...sx.btn, padding: "6px 14px", fontSize: 12.5, fontWeight: 800,
                                         borderColor: T.primary, color: T.primaryD }}
                              >{L("tplApply")}</button>
                              <button
                                onClick={() => deleteTemplate(tpl)} disabled={monthlyBusy || tplBusy}
                                data-delete-action="true"
                                style={{ ...sx.btn, padding: "6px 12px", fontSize: 12.5,
                                         borderColor: "#fecaca", color: T.danger }}
                              >{L("tplDelete")}</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                      <input
                        value={tplName} onChange={(e) => setTplName(e.target.value)}
                        placeholder={L("tplNamePh")} disabled={monthlyBusy || tplBusy}
                        onKeyDown={(e) => { if (e.key === "Enter") saveTemplate(); }}
                        style={{ ...sx.input, flex: "1 1 220px", minWidth: 180 }}
                      />
                      <button
                        onClick={saveTemplate} disabled={monthlyBusy || tplBusy || !tplName.trim()}
                        style={{
                          ...sx.btn, padding: "9px 16px", fontWeight: 800, whiteSpace: "nowrap",
                          borderColor: T.success, color: T.success,
                          opacity: tplName.trim() ? 1 : .5,
                        }}
                      >💾 {tplBusy ? L("tplSaving") : L("tplSave")}</button>
                    </div>

                    {/* ── Built-in presets ── */}
                    <div style={{ ...sx.h3, marginBottom: 4 }}>{L("tplBuiltIn")}</div>
                    <div style={{ ...sx.muted, marginBottom: 14 }}>{L("presetNote")}</div>
                    <div style={{ display: "grid", gap: 10 }}>
                      {REPORT_PRESETS.map((p) => {
                        const match = REPORT_SECTIONS.every((s) => !!reportOpts.sections[s.key] === p.sections.includes(s.key));
                        return (
                          <button
                            key={p.key}
                            onClick={() => setReportOpts((o) => ({
                              ...o,
                              sections: REPORT_SECTIONS.reduce((a, s) => ({ ...a, [s.key]: p.sections.includes(s.key) }), {}),
                            }))}
                            disabled={monthlyBusy}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left",
                              padding: "14px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "inherit",
                              border: `1px solid ${match ? T.primary : T.border}`,
                              background: match ? T.primaryS : "#fff",
                            }}
                          >
                            <span style={{ fontSize: 22 }}>{p.icon}</span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: match ? T.primaryD : T.text }}>
                                {LA(p, "label")}
                              </span>
                              <span style={{ display: "block", fontSize: 12.5, color: T.textM, marginTop: 3 }}>{LA(p, "desc")}</span>
                              <span style={{ display: "block", fontSize: 11.5, color: T.textM, marginTop: 5, fontWeight: 700 }}>
                                {p.sections.length} {L("sectionsWord")}
                              </span>
                            </span>
                            {match && <span style={{ color: T.primary, fontWeight: 900, fontSize: 18 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* ── TAB 1 · PERIOD & SCOPE ── */}
                {reportTab === "scope" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 8 }}>{L("reportType")}</label>
                        <select
                          value={periodType}
                          onChange={(e) => setPeriodType(e.target.value)}
                          disabled={monthlyBusy}
                          style={{ ...sx.input, width: "100%", fontSize: 15, cursor: "pointer" }}
                        >
                          {REPORT_PERIODS.map((p) => <option key={p.key} value={p.key}>{isAr ? p.ar : p.en}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 8 }}>
                          {periodType === "monthly" ? L("month") : L("endingMonth")}
                        </label>
                        {availableMonths.length === 0 ? (
                          <div style={{ ...sx.muted, padding: "10px 0" }}>{L("noData")}</div>
                        ) : (
                          <select
                            value={monthlyMonth}
                            onChange={(e) => setMonthlyMonth(e.target.value)}
                            disabled={monthlyBusy}
                            style={{ ...sx.input, width: "100%", fontSize: 15, cursor: "pointer" }}
                          >
                            {availableMonths.map((m) => (
                              <option key={m} value={m}>
                                {monthLabel(m)} — {fmtNum(monthCounts.get(m) || 0, 0)} {L("itemsWord")}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>

                    {monthlyMonth && availableMonths.length > 0 && (() => {
                      const p = REPORT_PERIODS.find((x) => x.key === periodType) || REPORT_PERIODS[0];
                      const from = addMonthKey(monthlyMonth, -(p.months - 1));
                      return (
                        <div style={{ marginBottom: 18, fontSize: 13, color: T.textM }}>
                          {L("covers")} <strong style={{ color: T.text }}>{rangeLabel(from, monthlyMonth)}</strong>
                          {" · "}{p.months} {p.months > 1 ? L("monthsWord") : L("monthWord")}
                          {/* An unfinished anchor month is flagged here, before a
                              single page is generated. */}
                          {anchorCoverage && (
                            <div style={{
                              marginTop: 8, padding: "8px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 700,
                              lineHeight: 1.6,
                              background: anchorCoverage.partial ? T.warningS : T.successS,
                              border: `1px solid ${anchorCoverage.partial ? "#fde68a" : "#a7f3d0"}`,
                              color: anchorCoverage.partial ? T.warning : T.success,
                            }}>
                              {anchorCoverage.partial ? "⚠️ " : "✓ "}
                              {anchorCoverage.partial
                                ? L("cvPartial", {
                                    d: fmtDayLong(anchorCoverage.last), a: anchorCoverage.lastDay,
                                    b: anchorCoverage.days, m: monthLabel(monthlyMonth),
                                  })
                                : L("cvFull", { d: fmtDayLong(anchorCoverage.last) })}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <ReportFacetPicker
                      title={L("fBranches")} icon="🏪" sx={sx} T={T} L={L}
                      options={reportFacets.branches} selected={reportOpts.branches}
                      onToggle={(v) => toggleIn("branches", v)}
                      onClear={() => setOpt("branches", [])} disabled={monthlyBusy}
                    />
                    <ReportFacetPicker
                      title={L("fProducts")} icon="🥩" sx={sx} T={T} L={L}
                      options={reportFacets.products} selected={reportOpts.products}
                      onToggle={(v) => toggleIn("products", v)}
                      onClear={() => setOpt("products", [])} disabled={monthlyBusy} searchable
                    />
                    <CondemnLeaderboard
                      rows={condLeaderboard} selected={reportOpts.products}
                      onToggle={(v) => toggleIn("products", v)}
                      onTopN={(n) => setOpt("products", condLeaderboard.slice(0, n).map((r) => r.label))}
                      onClear={() => setOpt("products", [])}
                      disabled={monthlyBusy} sx={sx} T={T} L={L}
                    />
                    <ReportFacetPicker
                      title={L("fOrigins")} icon="🌍" sx={sx} T={T} L={L}
                      options={reportFacets.origins} selected={reportOpts.origins}
                      onToggle={(v) => toggleIn("origins", v)}
                      onClear={() => setOpt("origins", [])} disabled={monthlyBusy}
                    />
                    <ReportFacetPicker
                      title={L("fActions")} icon="⚖️" sx={sx} T={T} L={L}
                      options={reportFacets.actions} selected={reportOpts.actions}
                      onToggle={(v) => toggleIn("actions", v)}
                      onClear={() => setOpt("actions", [])} disabled={monthlyBusy}
                    />

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginTop: 4 }}>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("unit")}</label>
                        <select
                          value={reportOpts.qtyType} onChange={(e) => setOpt("qtyType", e.target.value)}
                          disabled={monthlyBusy} style={{ ...sx.input, cursor: "pointer" }}
                        >
                          <option value="all">{L("unitAll")}</option>
                          <option value="kg">{L("unitKg")}</option>
                          <option value="pcs">{L("unitPcs")}</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("minQty")}</label>
                        <input
                          type="number" min="0" step="any" placeholder={L("anyPh")}
                          value={reportOpts.minQty} onChange={(e) => setOpt("minQty", e.target.value)}
                          disabled={monthlyBusy} style={{ ...sx.input, width: 120 }}
                        />
                      </div>
                      <label style={{
                        display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                        fontSize: 13.5, fontWeight: 700, color: T.text, paddingBottom: 10,
                      }}>
                        <input
                          type="checkbox" checked={reportOpts.condemnedOnly}
                          onChange={(e) => setOpt("condemnedOnly", e.target.checked)}
                          disabled={monthlyBusy}
                        />
                        {L("condOnly")}
                      </label>
                    </div>
                  </>
                )}

                {/* ── SECTIONS ── */}
                {reportTab === "content" && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                      <div style={{ ...sx.h3 }}>{L("sectionsTitle")}</div>
                      <div style={{ marginInlineStart: "auto", display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setReportOpts((o) => ({
                            ...o, sections: REPORT_SECTIONS.reduce((a, s) => ({ ...a, [s.key]: true }), {}),
                          }))}
                          disabled={monthlyBusy} style={{ ...sx.btn, padding: "5px 12px", fontSize: 12 }}
                        >{L("selectAll")}</button>
                        <button
                          onClick={() => setReportOpts((o) => ({
                            ...o, sections: REPORT_SECTIONS.reduce((a, s) => ({ ...a, [s.key]: false }), {}),
                          }))}
                          disabled={monthlyBusy} style={{ ...sx.btn, padding: "5px 12px", fontSize: 12 }}
                        >{L("clearAll")}</button>
                      </div>
                    </div>

                    {SECTION_GROUPS.map((g) => {
                      const items = REPORT_SECTIONS.filter((s) => s.group === g);
                      const onCount = items.filter((s) => reportOpts.sections[s.key]).length;
                      return (
                        <div key={g} style={{ marginBottom: 18 }}>
                          <div style={{
                            display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
                            fontSize: 11.5, fontWeight: 900, color: T.textM,
                            textTransform: "uppercase", letterSpacing: ".06em",
                          }}>
                            <span>{L(`grp${g}`)}</span>
                            <span style={{
                              background: T.bgAlt, borderRadius: 999, padding: "1px 8px",
                              fontSize: 11, color: T.text,
                            }}>{onCount}/{items.length}</span>
                            <span style={{ flex: 1, height: 1, background: T.border }} />
                          </div>
                          <div style={{ display: "grid", gap: 6 }}>
                            {items.map((s) => {
                              const on = !!reportOpts.sections[s.key];
                              const toggle = () => setReportOpts((o) => ({
                                ...o, sections: { ...o.sections, [s.key]: !o.sections[s.key] },
                              }));
                              return (
                                <div key={s.key} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "10px 14px", borderRadius: 10,
                                  border: `1px solid ${on ? T.primary : T.border}`,
                                  background: on ? T.primaryS : "#fff",
                                }}>
                                  <span style={{ fontSize: 17 }}>{s.icon}</span>
                                  <div style={{ minWidth: 0, flex: 1, cursor: "pointer" }} onClick={monthlyBusy ? undefined : toggle}>
                                    <div style={{ fontSize: 13.5, fontWeight: 800, color: on ? T.primaryD : T.text }}>{LA(s, "label")}</div>
                                    <div style={{ fontSize: 12, color: T.textM, marginTop: 2 }}>{LA(s, "hint")}</div>
                                  </div>
                                  <BuilderSwitch on={on} onChange={toggle} disabled={monthlyBusy} T={T} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* ── ANALYSIS ── */}
                {reportTab === "analysis" && (
                  <>
                    <div style={{ ...sx.h3, marginBottom: 4 }}>{L("analysisTitle")}</div>
                    <div style={{ ...sx.muted, marginBottom: 16 }}>{L("analysisNote")}</div>

                    <div style={{ display: "grid", gap: 14 }}>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("rankBy")}</label>
                        <select
                          value={reportOpts.rankMetric} onChange={(e) => setOpt("rankMetric", e.target.value)}
                          disabled={monthlyBusy} style={{ ...sx.input, width: "100%", cursor: "pointer" }}
                        >
                          {RANK_METRICS.map((m) => <option key={m.key} value={m.key}>{LA(m, "label")}</option>)}
                        </select>
                        <div style={{ ...sx.muted, fontSize: 12, marginTop: 5 }}>{L("rankByNote")}</div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                          <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("rankDepth")}</label>
                          <select
                            value={reportOpts.topN} onChange={(e) => setOpt("topN", Number(e.target.value))}
                            disabled={monthlyBusy} style={{ ...sx.input, width: "100%", cursor: "pointer" }}
                          >
                            {[5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{L("topWord")} {n}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("baseline")}</label>
                          <select
                            value={reportOpts.baseline} onChange={(e) => setOpt("baseline", e.target.value)}
                            disabled={monthlyBusy} style={{ ...sx.input, width: "100%", cursor: "pointer" }}
                          >
                            <option value="prev">{L("basePrev")}</option>
                            <option value="yoy">{L("baseYoy")}</option>
                          </select>
                        </div>
                      </div>

                      {reportOpts.sections.repeat && (
                        <div>
                          <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("repeatThr")}</label>
                          <select
                            value={reportOpts.minRepeatDays} onChange={(e) => setOpt("minRepeatDays", Number(e.target.value))}
                            disabled={monthlyBusy} style={{ ...sx.input, width: "100%", cursor: "pointer" }}
                          >
                            {[2, 3, 4, 5, 7, 10].map((n) => (
                              <option key={n} value={n}>{L("repeatOpt", { n })}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {reportOpts.sections.lineItems && (
                        <div>
                          <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("annexCap")}</label>
                          <select
                            value={reportOpts.lineItemLimit} onChange={(e) => setOpt("lineItemLimit", Number(e.target.value))}
                            disabled={monthlyBusy} style={{ ...sx.input, width: "100%", cursor: "pointer" }}
                          >
                            {[100, 250, 400, 1000, 3000].map((n) => <option key={n} value={n}>{n} {L("rowsWord")}</option>)}
                          </select>
                          <div style={{ ...sx.muted, fontSize: 12, marginTop: 5 }}>
                            {scopePreview.items > reportOpts.lineItemLimit
                              ? L("capCut", {
                                  a: fmtNum(scopePreview.items, 0),
                                  b: fmtNum(scopePreview.items - reportOpts.lineItemLimit, 0),
                                })
                              : L("capFits")}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── TAB 3 · DOCUMENT DETAILS ── */}
                {reportTab === "details" && (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("docTitle")}</label>
                        <input
                          value={reportOpts.titleOverride} disabled={monthlyBusy}
                          onChange={(e) => setOpt("titleOverride", e.target.value)}
                          placeholder={(REPORT_PERIODS.find((p) => p.key === periodType) || REPORT_PERIODS[0]).reportTitle}
                          style={{ ...sx.input, width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("docRef")}</label>
                        <input
                          value={reportOpts.refNo} disabled={monthlyBusy}
                          onChange={(e) => setOpt("refNo", e.target.value)}
                          placeholder="e.g. AM-RET-RPT-2026-08"
                          style={{ ...sx.input, width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("docClass")}</label>
                        <select
                          value={reportOpts.classification} onChange={(e) => setOpt("classification", e.target.value)}
                          disabled={monthlyBusy} style={{ ...sx.input, width: "100%", cursor: "pointer" }}
                        >
                          {CLASSIFICATIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("docPrep")}</label>
                        <input value={reportOpts.preparedBy} disabled={monthlyBusy}
                          onChange={(e) => setOpt("preparedBy", e.target.value)}
                          style={{ ...sx.input, width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("docRev")}</label>
                        <input value={reportOpts.reviewedBy} disabled={monthlyBusy}
                          onChange={(e) => setOpt("reviewedBy", e.target.value)}
                          style={{ ...sx.input, width: "100%" }} />
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("docApp")}</label>
                        <input value={reportOpts.approvedBy} disabled={monthlyBusy}
                          onChange={(e) => setOpt("approvedBy", e.target.value)}
                          style={{ ...sx.input, width: "100%" }} />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>
                          {L("docNotes")} <span style={{ fontWeight: 500, color: T.textM }}>{L("docNotesSub")}</span>
                        </label>
                        <textarea
                          value={reportOpts.notes} disabled={monthlyBusy}
                          onChange={(e) => setOpt("notes", e.target.value)}
                          rows={4}
                          placeholder={L("docNotesPh")}
                          style={{ ...sx.input, width: "100%", fontFamily: "inherit", resize: "vertical" }}
                        />
                      </div>
                    </div>
                    <div style={{ ...sx.muted, fontSize: 12, marginTop: 10 }}>{L("docFoot")}</div>
                    <div style={{
                      marginTop: 10, padding: "10px 14px", borderRadius: 10,
                      background: T.warningS, border: "1px solid #fde68a",
                      fontSize: 12, color: T.warning, fontWeight: 700,
                    }}>ℹ️ {L("pdfEnNote")}</div>
                  </>
                )}

                {/* ── DELIVERY ── */}
                {reportTab === "delivery" && (
                  <>
                    {/* Excel */}
                    <div style={{ ...sx.h3, marginBottom: 4 }}>{L("xlsxTitle")}</div>
                    <div style={{ ...sx.muted, marginBottom: 10 }}>{L("xlsxNote")}</div>
                    <button
                      onClick={() => generatePeriodReport({ deliver: "xlsx" })}
                      disabled={monthlyBusy || burstBusy || scopePreview.items === 0}
                      style={{
                        ...sx.btn, padding: "9px 16px", fontWeight: 800, marginBottom: 22,
                        borderColor: T.success, color: T.success,
                      }}
                    >📊 {L("xlsxBtn")}</button>

                    {/* E-mail this report */}
                    <div style={{ ...sx.h3, marginBottom: 4 }}>{L("mailTitle")}</div>
                    <div style={{ ...sx.muted, marginBottom: 12 }}>{L("mailNote2")}</div>
                    <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("mailTo")}</label>
                          <input
                            value={mailTo} onChange={(e) => setMailTo(e.target.value)}
                            disabled={burstBusy} placeholder="a@x.com, b@x.com"
                            style={{ ...sx.input, width: "100%" }}
                          />
                        </div>
                        <div>
                          <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("mailCc")}</label>
                          <input
                            value={mailCc} onChange={(e) => setMailCc(e.target.value)}
                            disabled={burstBusy} style={{ ...sx.input, width: "100%" }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("mailSubj")}</label>
                        <input
                          value={mailSubject} onChange={(e) => setMailSubject(e.target.value)}
                          disabled={burstBusy} placeholder={L("mailSubjPh")}
                          style={{ ...sx.input, width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ ...sx.h3, display: "block", marginBottom: 6 }}>{L("mailBody")}</label>
                        <textarea
                          value={mailNote} onChange={(e) => setMailNote(e.target.value)}
                          disabled={burstBusy} rows={3}
                          style={{ ...sx.input, width: "100%", fontFamily: "inherit", resize: "vertical" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 26 }}>
                      <PrimaryBtn
                        icon={FiFileText}
                        onClick={emailCurrentReport}
                        disabled={burstBusy || monthlyBusy || scopePreview.items === 0 || !mailTo.trim()}
                        style={{ justifyContent: "center", padding: "10px 18px" }}
                      >{burstBusy ? L("mailSending") : L("mailSend")}</PrimaryBtn>
                      <span style={{ ...sx.muted, fontSize: 12 }}>{L("mailMulti")}</span>
                    </div>

                    {/* Bursting */}
                    <div style={{ ...sx.h3, marginBottom: 4 }}>{L("burstTitle")}</div>
                    <div style={{ ...sx.muted, marginBottom: 10 }}>{L("burstNote")}</div>
                    {(() => {
                      const targets = reportOpts.branches.length
                        ? reportOpts.branches
                        : reportFacets.branches.map((b) => b.label);
                      return (
                        <>
                          <div style={{
                            padding: "10px 14px", borderRadius: 10, marginBottom: 12,
                            background: T.primaryS, border: `1px solid #c7d2fe`,
                            fontSize: 12.5, color: T.primaryD, lineHeight: 1.6,
                          }}>
                            <strong>{L("burstScope")}:</strong> {targets.length} — {targets.join(" · ")}
                            {reportOpts.branches.length === 0 && (
                              <div style={{ marginTop: 4 }}>{L("burstAllNote")}</div>
                            )}
                          </div>

                          <div style={{ ...sx.h3, marginBottom: 4 }}>{L("burstAddr")}</div>
                          <div style={{ ...sx.muted, marginBottom: 8, fontSize: 12 }}>{L("burstAddrNote")}</div>
                          <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
                            {targets.map((b) => (
                              <div key={b} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{
                                  fontSize: 12.5, fontWeight: 800, color: T.text,
                                  minWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>{b}</span>
                                <input
                                  value={burstRecipients[b] || ""}
                                  onChange={(e) => setBurstRecipients((m) => ({ ...m, [b]: e.target.value }))}
                                  disabled={burstBusy} placeholder="branch@almawashi.ae"
                                  style={{ ...sx.input, flex: 1, fontSize: 13 }}
                                />
                              </div>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                            <button
                              onClick={() => runBurst("download")}
                              disabled={burstBusy || monthlyBusy || targets.length === 0}
                              style={{ ...sx.btn, padding: "9px 16px", fontWeight: 800 }}
                            >⬇️ {L("burstDl")} ({targets.length})</button>
                            <button
                              onClick={() => runBurst("email")}
                              disabled={burstBusy || monthlyBusy || targets.length === 0}
                              style={{
                                ...sx.btn, padding: "9px 16px", fontWeight: 800,
                                borderColor: T.primary, color: T.primaryD,
                              }}
                            >📧 {L("burstMail")}</button>
                            {burstProgress && (
                              <span style={{ fontSize: 12.5, fontWeight: 800, color: T.primaryD }}>
                                ⏳ {burstProgress}
                              </span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
                </div>

                {/* ── Live document outline ── */}
                <div className="rb-outline" style={{
                  borderLeft: `1px solid ${T.border}`, background: T.bgAlt,
                  padding: 14, overflowY: "auto", minHeight: 0,
                }}>
                  <div style={{
                    fontSize: 11.5, fontWeight: 900, color: T.textM,
                    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10,
                  }}>{L("outline")}</div>

                  {activeSections.length === 0 ? (
                    <div style={{ ...sx.muted, fontSize: 12.5 }}>{L("outlineEmpty")}</div>
                  ) : (
                    <div style={{ display: "grid", gap: 5 }}>
                      {activeSections.map((s, i) => (
                        <div key={s.key} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          background: "#fff", border: `1px solid ${T.border}`,
                          borderRadius: 8, padding: "7px 9px",
                        }}>
                          <span style={{
                            width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                            background: T.primary, color: "#fff", fontSize: 10, fontWeight: 900,
                            display: "grid", placeItems: "center",
                          }}>{i + 1}</span>
                          <span style={{ fontSize: 12 }}>{s.icon}</span>
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: T.text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{LA(s, "label")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{
                    marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.border}`,
                    fontSize: 11.5, color: T.textM, lineHeight: 1.7,
                  }}>
                    <div><strong style={{ color: T.text }}>{activeSections.length}</strong> {L("sectionsWord")}</div>
                    <div>{L("rankedBy")} <strong style={{ color: T.text }}>
                      {LA(RANK_METRICS.find((m) => m.key === reportOpts.rankMetric) || RANK_METRICS[0], "label")}
                    </strong></div>
                    <div>{L("baselineWord")}: <strong style={{ color: T.text }}>
                      {reportOpts.baseline === "yoy" ? L("baseYoy") : L("basePrev")}
                    </strong></div>
                    {activeScopeCount > 0 && (
                      <div style={{ color: T.warning, fontWeight: 700 }}>
                        {activeScopeCount} {L("scopeActive")}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sticky footer: live scope preview + actions */}
              <div style={{
                padding: "14px 20px", borderTop: `1px solid ${T.border}`,
                background: T.bgAlt, flexShrink: 0,
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              }}>
                <div style={{ fontSize: 12.5, color: T.textM, flex: 1, minWidth: 200 }}>
                  {scopePreview.state === "ok" && (
                    <>
                      <strong style={{ color: T.text }}>{fmtNum(scopePreview.items, 0)}</strong> {L("fLineItems")}
                      {" "}{L("across")}{" "}<strong style={{ color: T.text }}>{scopePreview.reports}</strong> {L("daysWord")}
                      {" · "}{activeSectionCount} {L("sectionsWord")}
                    </>
                  )}
                  {scopePreview.state === "nodata" && (
                    <span style={{ color: T.danger, fontWeight: 700 }}>{L("msgNoData")}</span>
                  )}
                  {scopePreview.state === "filtered" && (
                    <span style={{ color: T.danger, fontWeight: 700 }}>
                      {scopePreview.blockers.length > 0
                        ? L("msgBlocker", {
                            n: fmtNum(scopePreview.periodItems, 0),
                            f: scopePreview.blockers.map((k) => L(k)).join(" + "),
                          })
                        : scopePreview.activeDims > 0
                        ? L("msgCombo", { n: fmtNum(scopePreview.periodItems, 0) })
                        : L("msgFiltered", { n: fmtNum(scopePreview.periodItems, 0) })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setReportOpts({ ...DEFAULT_REPORT_OPTS, sections: { ...DEFAULT_REPORT_OPTS.sections } })}
                  disabled={monthlyBusy}
                  style={{ ...sx.btn, flex: "0 0 auto" }}
                >{L("reset")}</button>
                {activeScopeCount > 0 && (
                  <button
                    onClick={() => setReportOpts((o) => ({
                      ...o, branches: [], products: [], origins: [], actions: [],
                      qtyType: "all", condemnedOnly: false, minQty: "",
                    }))}
                    disabled={monthlyBusy}
                    style={{
                      ...sx.btn, flex: "0 0 auto",
                      borderColor: T.warning, color: T.warning, fontWeight: 800,
                    }}
                  >{L("clearFilters")} ({activeScopeCount})</button>
                )}
                <button
                  onClick={() => !monthlyBusy && setMonthlyOpen(false)}
                  disabled={monthlyBusy}
                  style={{ ...sx.btn, flex: "0 0 auto" }}
                >{L("cancel")}</button>
                <PrimaryBtn
                  icon={FiDownload}
                  onClick={generatePeriodReport}
                  disabled={monthlyBusy || availableMonths.length === 0 || scopePreview.items === 0}
                  style={{ flex: "0 0 auto", justifyContent: "center", padding: "10px 18px" }}
                >
                  {monthlyBusy ? L("generating") : L("generate")}
                </PrimaryBtn>
              </div>
            </div>
          </div>
        )}

        {/* Floating bulk action bar */}
        {selectedRows.size > 0 && tab === "browse" && (
          <div className="br-noprint" style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000, animation: "slideUp .2s ease-out",
            background: T.text, color: "#fff",
            border: `1px solid ${T.text}`, borderRadius: 14,
            boxShadow: "0 12px 32px rgba(15,23,42,.3)",
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            maxWidth: "calc(100vw - 32px)",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "4px 10px", background: "rgba(255,255,255,.15)", borderRadius: 8,
              fontSize: 13, fontWeight: 700,
            }}>
              <FiCheck size={14} /> {selectedRows.size} selected
            </div>
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,.2)" }} />
            <button onClick={selectAllVisibleRows} style={{
              background: "transparent", border: "none", color: "#fff",
              padding: "6px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>Select all visible ({sortedRows.length})</button>
            <button onClick={copySelectionTSV} style={{
              background: T.primary, border: "none", color: "#fff",
              padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><FiCopy size={13} /> Copy TSV</button>
            <button onClick={exportSelectionCSV} style={{
              background: "rgba(255,255,255,.15)", border: "none", color: "#fff",
              padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><FiDownload size={13} /> CSV</button>
            <button onClick={clearSelection} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "#fff",
              padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><FiX size={13} /> Clear</button>
          </div>
        )}

        {Toaster}
      </div>
    </>
  );
}

/* ============================================================
   DataTable — used by Browse tab
   ============================================================ */
function DataTable({ rows, columns, changeMap, search, highlight, openViewer, rowPad, sort, toggleSort, showHeader, auditTrailByKey, onOpenAudit, selectedRows, onToggleSelect, onToggleAll, onRangeSelect, onOpenProduct, onMarkReview, reviewedSet, currentDate }) {
  const allChecked = showHeader && rows.length > 0 && rows.every((r) => selectedRows?.has(r.__i));
  const someChecked = showHeader && !allChecked && rows.some((r) => selectedRows?.has(r.__i));
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      {showHeader && (
        <thead>
          <tr style={{ background: T.bgAlt }}>
            {selectedRows && (
              <th style={{
                padding: "10px 8px", textAlign: "center", width: 36,
                borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.bgAlt, zIndex: 5,
              }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={() => onToggleAll && onToggleAll(rows.map((r) => r.__i), allChecked)}
                  style={{ accentColor: T.primary, cursor: "pointer" }}
                  title={allChecked ? "Deselect all visible" : "Select all visible"}
                />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} style={{
                padding: "10px 8px", textAlign: c.key === "quantity" ? "right" : "left",
                fontSize: 11, fontWeight: 700, color: T.textM,
                textTransform: "uppercase", letterSpacing: ".04em",
                borderBottom: `1px solid ${T.border}`,
                position: "sticky", top: 0, background: T.bgAlt, zIndex: 5,
                minWidth: c.width,
              }}>
                {c.sortable ? (
                  <button onClick={() => toggleSort(c.key)} style={{
                    ...sx.btnGhost, padding: 0, fontSize: 11, fontWeight: 700,
                    color: sort.key === c.key ? T.primary : T.textM, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: ".04em",
                  }}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === "asc" ? "▲" : "▼")}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, i) => {
          const curr = actionText(row);
          const k = itemKey(row);
          const ch = changeMap.get(k);
          const showChange = ch && ch.to === curr;
          const trail = auditTrailByKey?.get(k) || [];
          const hasTrail = trail.length > 0;
          const isChecked = selectedRows?.has(row.__i);
          return (
            <tr key={row.__i ?? i} className="br-tbl-row" style={{ background: isChecked ? T.primaryS : undefined }}>
              {selectedRows && (
                <td style={{
                  padding: rowPad, borderBottom: `1px solid ${T.borderS}`, textAlign: "center", verticalAlign: "top",
                }}>
                  <input
                    type="checkbox"
                    checked={!!isChecked}
                    onClick={(e) => {
                      if (e.shiftKey && onRangeSelect) {
                        e.preventDefault();
                        onRangeSelect(row.__i);
                      } else if (onToggleSelect) {
                        onToggleSelect(row.__i);
                      }
                    }}
                    onChange={() => {}}
                    style={{ accentColor: T.primary, cursor: "pointer" }}
                  />
                </td>
              )}
              {columns.map((c) => {
                const tdStyle = {
                  padding: rowPad, borderBottom: `1px solid ${T.borderS}`,
                  textAlign: c.key === "quantity" ? "right" : "left",
                  color: T.text, verticalAlign: "top",
                };
                if (c.key === "sl") return <td key={c.key} style={{ ...tdStyle, color: T.textS, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>;
                if (c.key === "itemCode") return <td key={c.key} style={{ ...tdStyle, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{search ? highlight(row.itemCode || "", search) : (row.itemCode || "")}</td>;
                if (c.key === "productName") return (
                  <td key={c.key} style={tdStyle}>
                    {onOpenProduct ? (
                      <button onClick={() => onOpenProduct(row.itemCode || "", row.productName || "")} title="Open product insights" style={{
                        background: "transparent", border: "none", padding: 0, cursor: "pointer",
                        textAlign: "left", color: T.text, fontWeight: 600, fontSize: "inherit", fontFamily: "inherit",
                        textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2, textDecorationColor: T.textS,
                      }}>
                        {search ? highlight(row.productName || "", search) : row.productName}
                      </button>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{search ? highlight(row.productName || "", search) : row.productName}</span>
                    )}
                    {Array.isArray(row.images) && row.images.length > 0 && (
                      <button onClick={() => openViewer(row)} style={{
                        ...sx.btn, marginLeft: 6, padding: "2px 8px", fontSize: 11,
                        background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                      }}><FiEye size={11} /> {row.images.length}</button>
                    )}
                  </td>
                );
                if (c.key === "origin") return <td key={c.key} style={tdStyle}>{search ? highlight(row.origin || "", search) : row.origin}</td>;
                if (c.key === "pos") return <td key={c.key} style={tdStyle}>{search ? highlight(safeButchery(row) || "", search) : safeButchery(row)}</td>;
                if (c.key === "transferNo") return <td key={c.key} style={{ ...tdStyle, fontVariantNumeric: "tabular-nums" }}>{search ? highlight(row.transferNo || "", search) : row.transferNo}</td>;
                if (c.key === "quantity") return <td key={c.key} style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{row.quantity}</td>;
                if (c.key === "qtyType") return <td key={c.key} style={tdStyle}>
                  <span style={{ ...sx.pill, fontSize: 11 }}>{(row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType : row.qtyType || ""}</span>
                </td>;
                if (c.key === "expiry") return <td key={c.key} style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", color: T.textM }}>{row.expiry}</td>;
                if (c.key === "remarks") return <td key={c.key} style={{ ...tdStyle, color: T.textM, fontSize: 12 }}>{search ? highlight(row.remarks || "", search) : row.remarks}</td>;
                if (c.key === "action") {
                  const reviewed = reviewedSet?.has(`${currentDate}__${k}`);
                  const ReviewBtn = onMarkReview ? (
                    <button onClick={() => onMarkReview(row)} title={reviewed ? "Already in review queue" : "Mark for review"} style={{
                      ...sx.btn, padding: "1px 6px", fontSize: 10,
                      background: reviewed ? T.warningS : T.cardAlt,
                      color: reviewed ? T.warning : T.textM,
                      borderColor: reviewed ? "#fde68a" : T.border,
                    }}>
                      <FiBookmark size={10} /> {reviewed ? "Review" : "Flag"}
                    </button>
                  ) : null;
                  return (
                  <td key={c.key} style={{ ...tdStyle, background: showChange ? T.successS : "transparent" }}>
                    {showChange ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: T.textM, textDecoration: "line-through" }}>{ch.from}</span>
                          <span style={{ margin: "0 6px", color: T.textS }}>→</span>
                          <span style={{ fontWeight: 700, color: T.text }}>{ch.to}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ ...sx.pill, fontSize: 10, padding: "2px 8px", background: T.success, color: "#fff", borderColor: T.success }}>Changed</span>
                          {formatChangeDate(ch) && <span style={sx.mutedS}>{formatChangeDate(ch)}</span>}
                          {hasTrail && onOpenAudit && (
                            <button onClick={() => onOpenAudit(row, trail)} title={`${trail.length} change(s) total`} style={{
                              ...sx.btn, padding: "1px 6px", fontSize: 10,
                              background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                            }}><FiClock size={10} /> {trail.length}</button>
                          )}
                          {ReviewBtn}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{search ? highlight(curr || "", search) : curr}</span>
                        {hasTrail && onOpenAudit && (
                          <button onClick={() => onOpenAudit(row, trail)} title={`${trail.length} change(s)`} style={{
                            ...sx.btn, padding: "1px 6px", fontSize: 10,
                            background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                          }}><FiClock size={10} /> {trail.length}</button>
                        )}
                        {ReviewBtn}
                      </div>
                    )}
                  </td>
                  );
                }
                return <td key={c.key} style={tdStyle}></td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
