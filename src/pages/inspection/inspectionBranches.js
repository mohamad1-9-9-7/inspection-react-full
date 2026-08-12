// src/pages/inspection/inspectionBranches.js
// Master branch list for the Inspection (Internal Audit) module.
// Codes + aliases match the ones used by InternalAuditReportsView so a report
// saved from the entry form always lands on the right row of the annual plan.

export const INSPECTION_BRANCHES = [
  // QCS is the Al Qusais WAREHOUSE only. The production area next to it is a
  // branch of its own (see PRODUCTION below) and is audited separately.
  { code: "QCS",        labelEn: "QCS — Al Qusais Warehouse",      labelAr: "QCS — مستودع القصيص",        icon: "🏢", aliases: ["QCS","QUSAIS WAREHOUSE","AL QUSAIS","ALQUSAIS","QUSAIS","قصيص","مستودع القصيص","المستودع"] },
  // Production hall. The code matches the "PRODUCTION" branch key the rest of
  // the app already uses (monitor/branches/production, DailyReportsTab, …).
  // "QCS PRODUCTION" is listed here on purpose: it is longer than the plain
  // "QCS" alias, so legacy reports written that way land on this row and not
  // on the warehouse.
  { code: "PRODUCTION", labelEn: "Production — Al Qusais",         labelAr: "الإنتاج — القصيص",           icon: "🏭", aliases: ["PRODUCTION","PROD","QCS PRODUCTION","PRODUCTION AREA","الإنتاج","الانتاج","انتاج","قسم الإنتاج","صالة الإنتاج","فرع الإنتاج"] },
  { code: "POS 6",      labelEn: "POS 6 — Sharjah Butchery",       labelAr: "POS 6 — ملحمة الشارقة",      icon: "🥩", aliases: ["POS 6","POS6","SHARJAH BUTCHERY","ملحمة الشارقة","الشارقة"] },
  { code: "POS 7",      labelEn: "POS 7 — Abu Dhabi Store",        labelAr: "POS 7 — مخزن أبوظبي",        icon: "🏬", aliases: ["POS 7","POS7"] },
  { code: "POS 10",     labelEn: "POS 10 — Abu Dhabi Butchery",    labelAr: "POS 10 — ملحمة أبوظبي",      icon: "🥩", aliases: ["POS 10","POS10","ABU DHABI BUTCHERY","ملحمة أبوظبي","ملحمة ابوظبي","ABU DHABI","ABUDHABI","أبوظبي","ابوظبي","ABU DAHBI","ABUDAHBI"] },
  { code: "POS 11",     labelEn: "POS 11 — Al Ain Butchery",       labelAr: "POS 11 — ملحمة العين",       icon: "🥩", aliases: ["POS 11","POS11","AL AIN BUTCHERY","ملحمة العين","AL AIN","العين"] },
  { code: "POS 14",     labelEn: "POS 14 — Al Ain Market",         labelAr: "POS 14 — سوق العين",         icon: "🏬", aliases: ["POS 14","POS14","AL AIN MARKET","سوق العين"] },
  { code: "POS 15",     labelEn: "POS 15 — Al Barsha Butchery",    labelAr: "POS 15 — ملحمة البرشا",      icon: "🥩", aliases: ["POS 15","POS15","ALBARSHA","AL BARSHA","ملحمة البرشا","البرشا","BARSHA"] },
  { code: "POS 16",     labelEn: "POS 16 — AFCOP Maqta Mall",      labelAr: "POS 16 — AFCOP مول المقطع",  icon: "🏬", aliases: ["POS 16","POS16","AFCOP","MAQTA MALL","المقطع"] },
  { code: "POS 17",     labelEn: "POS 17 — Mushrif Coop",          labelAr: "POS 17 — تعاونية المشرف",    icon: "🏬", aliases: ["POS 17","POS17","MUSHRIF COOP","تعاونية المشرف"] },
  { code: "POS 18",     labelEn: "POS 18",                         labelAr: "POS 18",                     icon: "🏬", aliases: ["POS 18","POS18"] },
  { code: "POS 19",     labelEn: "POS 19 — Motor City",            labelAr: "POS 19 — موتور سيتي",        icon: "🏬", aliases: ["POS 19","POS19","MOTOR CITY"] },
  { code: "POS 21",     labelEn: "POS 21",                         labelAr: "POS 21",                     icon: "🏬", aliases: ["POS 21","POS21"] },
  { code: "POS 24",     labelEn: "POS 24",                         labelAr: "POS 24",                     icon: "🏬", aliases: ["POS 24","POS24"] },
  { code: "POS 25",     labelEn: "POS 25",                         labelAr: "POS 25",                     icon: "🏬", aliases: ["POS 25","POS25"] },
  { code: "POS 26",     labelEn: "POS 26",                         labelAr: "POS 26",                     icon: "🏬", aliases: ["POS 26","POS26"] },
  { code: "POS 31",     labelEn: "POS 31",                         labelAr: "POS 31",                     icon: "🏬", aliases: ["POS 31","POS31"] },
  { code: "POS 34",     labelEn: "POS 34",                         labelAr: "POS 34",                     icon: "🏬", aliases: ["POS 34","POS34"] },
  { code: "POS 35",     labelEn: "POS 35",                         labelAr: "POS 35",                     icon: "🏬", aliases: ["POS 35","POS35"] },
  { code: "POS 36",     labelEn: "POS 36",                         labelAr: "POS 36",                     icon: "🏬", aliases: ["POS 36","POS36"] },
  { code: "POS 37",     labelEn: "POS 37 — Safeer Musafah",        labelAr: "POS 37 — سفير مصفح",         icon: "🏬", aliases: ["POS 37","POS37","SAFEER MUSAFAH","سفير مصفح"] },
  { code: "POS 38",     labelEn: "POS 38 — Safeer Khalifa A",      labelAr: "POS 38 — سفير خليفة A",      icon: "🏬", aliases: ["POS 38","POS38","SAFEER KHALIFA","سفير خليفة"] },
  { code: "POS 41",     labelEn: "POS 41",                         labelAr: "POS 41",                     icon: "🏬", aliases: ["POS 41","POS41"] },
  { code: "POS 42",     labelEn: "POS 42",                         labelAr: "POS 42",                     icon: "🏬", aliases: ["POS 42","POS42"] },
  { code: "POS 43",     labelEn: "POS 43 — Fazaa Shamkha",         labelAr: "POS 43 — فزعة الشامخة",      icon: "🏬", aliases: ["POS 43","POS43","FAZAA","الشامخة"] },
  { code: "POS 44",     labelEn: "POS 44",                         labelAr: "POS 44",                     icon: "🏬", aliases: ["POS 44","POS44"] },
  { code: "POS 45",     labelEn: "POS 45",                         labelAr: "POS 45",                     icon: "🏬", aliases: ["POS 45","POS45"] },
  { code: "FTR 1",      labelEn: "FTR 1 — Al Mushrif Park",        labelAr: "FTR 1 — حديقة المشرف",       icon: "🚚", aliases: ["FTR1","FTR 1","AL MUSHRIF","MUSHRIF PARK","المشرف","حديقة المشرف"] },
  { code: "FTR 2",      labelEn: "FTR 2 — Al Mamzar",              labelAr: "FTR 2 — الممزر",             icon: "🚚", aliases: ["FTR2","FTR 2","MAMZAR","AL MAMZAR","الممزر","حديقة الممزر","شاطئ الممزر"] },
  { code: "AL WARQA KITCHEN", labelEn: "Al Warqa Kitchen",         labelAr: "مطبخ الورقاء",               icon: "🍳", aliases: ["AL WARQA KITCHEN","WARQA KITCHEN","AL WARQA","WARQA","الورقاء","مطبخ الورقاء"] },
];

/* ===================== Matching =====================
 * The entry form now writes a canonical code into payload.branch and
 * payload.header.branch. LEGACY reports (saved before the Location field was
 * removed) only carry free text in header.location, and the top-level `branch`
 * column is empty on most of them — so the matcher still has to survive
 * mixed case, missing spaces, em-dashes, Arabic spelling variants and typos:
 *   "AL MUSHRIF PARK"  "FTR 1Mushrif Park"  "POS 6 SHARJHA BUTCHERY"
 *   "ABU DAHBI"        "POS 26 BARSHA SOUTH"  "QUSAIS-WAREHOUSE"
 */

/** Case/space/dash/diacritic-insensitive key used for comparisons. */
function normalizeText(s) {
  return String(s || "")
    .replace(/[ً-ْـ]/g, "")     // Arabic diacritics + tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/[ةه]/g, "ه")
    .replace(/[ؤئ]/g, "و")
    .toUpperCase()
    .replace(/[‐-―]/g, "")           // – — ‒ ― …
    .replace(/[\s\-_.،,;:()[\]{}/\\'"“”`]+/g, "");
}

/* Aliases, longest first — used only AFTER the POS/FTR code pass below,
   otherwise a generic name ("BARSHA") outranks an explicit code ("POS 26"). */
const ALIAS_TABLE = INSPECTION_BRANCHES
  .flatMap((b) => b.aliases.map((a) => ({ code: b.code, norm: normalizeText(a) })))
  .filter((x) => x.norm)
  .sort((a, b) => b.norm.length - a.norm.length);

const CODE_SET = new Set(INSPECTION_BRANCHES.map((b) => b.code));

/** Pull an explicit "POS 26" / "FTR1" / "POS26" code out of free text. */
function codeFromText(str) {
  const upper = String(str || "")
    .replace(/[‐-―]/g, " ")
    .toUpperCase();
  const re = /\b(POS|FTR)\s*[-_]?\s*0*(\d{1,2})\b/g;
  let m;
  while ((m = re.exec(upper)) !== null) {
    const candidate = `${m[1]} ${Number(m[2])}`;
    if (CODE_SET.has(candidate)) return candidate;
  }
  // "FTR 1Mushrif" — no word boundary after the digit
  const loose = /(POS|FTR)\s*[-_]?\s*0*(\d{1,2})/g;
  while ((m = loose.exec(upper)) !== null) {
    const candidate = `${m[1]} ${Number(m[2])}`;
    if (CODE_SET.has(candidate)) return candidate;
  }
  return "";
}

/**
 * Map any free-text branch/location string onto a canonical branch code.
 * An explicit POS/FTR number always wins over a name alias.
 * Returns the trimmed input when nothing matches, so bad data stays visible.
 */
export function canonicalInspectionBranch(str) {
  if (!str) return "";
  const byCode = codeFromText(str);
  if (byCode) return byCode;

  const norm = normalizeText(str);
  if (!norm) return "";
  for (const entry of ALIAS_TABLE) {
    if (norm === entry.norm || norm.includes(entry.norm)) return entry.code;
  }
  return String(str).trim(); // unknown — keep as-is so it still shows up
}

/** True when the value is one of the official branch codes. */
export function isKnownInspectionBranch(code) {
  return CODE_SET.has(code);
}

/**
 * Resolve a saved report's branch. Sources are tried newest-format first:
 * `payload.branch` → `header.branch` → the top-level column → `header.location`
 * (legacy only) → the title. The first one that maps to a REAL branch wins, so
 * a blank/garbage branch column can't hide a good value further down the list.
 */
export function resolveReportBranch(report) {
  const header = report?.payload?.header || {};
  const candidates = [
    report?.payload?.branch,
    header.branch,
    report?.branch,
    header.location, // legacy reports kept the branch here
    report?.payload?.title,
    report?.title,
  ].filter((v) => String(v || "").trim());

  for (const c of candidates) {
    const code = canonicalInspectionBranch(c);
    if (isKnownInspectionBranch(code)) return { code, raw: String(c).trim(), known: true };
  }
  const first = candidates[0];
  if (!first) return { code: "", raw: "", known: false };
  return { code: canonicalInspectionBranch(first), raw: String(first).trim(), known: false };
}

/**
 * Parse a report date WITHOUT timezone drift.
 * "2026-02-01" via new Date() is UTC midnight, which is 31 Jan in any
 * negative-offset browser — that silently moves a report to the wrong month.
 * Supports YYYY-MM-DD, DD/MM/YYYY and DD-MM-YYYY (day-first, UAE convention).
 */
export function parseReportDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

  const s = String(raw).trim();
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) {
    const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(s);
  if (isNaN(iso.getTime())) return null;
  // ISO timestamps (created_at) — read the UTC parts as the calendar date.
  return new Date(iso.getUTCFullYear(), iso.getUTCMonth(), iso.getUTCDate());
}

export function getInspectionBranch(code) {
  return INSPECTION_BRANCHES.find((b) => b.code === code) || null;
}

export function getInspectionBranchLabel(code, lang = "en") {
  const b = getInspectionBranch(code);
  if (!b) return code;
  return lang === "ar" ? b.labelAr : b.labelEn;
}

export function inspectionBranchIcon(code) {
  const b = getInspectionBranch(code);
  if (b) return b.icon;
  const n = normalizeText(code);
  if (n.startsWith("FTR")) return "🚚";
  if (n.includes("KITCHEN")) return "🍳";
  if (n.startsWith("POS")) return "🏬";
  if (n.includes("PROD")) return "🏭";
  return "🏢";
}

export const MONTHS = [
  { i: 1,  short: "Jan", full: "January",   ar: "يناير" },
  { i: 2,  short: "Feb", full: "February",  ar: "فبراير" },
  { i: 3,  short: "Mar", full: "March",     ar: "مارس" },
  { i: 4,  short: "Apr", full: "April",     ar: "أبريل" },
  { i: 5,  short: "May", full: "May",       ar: "مايو" },
  { i: 6,  short: "Jun", full: "June",      ar: "يونيو" },
  { i: 7,  short: "Jul", full: "July",      ar: "يوليو" },
  { i: 8,  short: "Aug", full: "August",    ar: "أغسطس" },
  { i: 9,  short: "Sep", full: "September", ar: "سبتمبر" },
  { i: 10, short: "Oct", full: "October",   ar: "أكتوبر" },
  { i: 11, short: "Nov", full: "November",  ar: "نوفمبر" },
  { i: 12, short: "Dec", full: "December",  ar: "ديسمبر" },
];
