// src/pages/settings/quotations/quotationCore.js
// -----------------------------------------------------------------------------
// Quotations (عروض الأسعار) — data model, storage, maths, smart helpers and
// the module catalogue that feeds "add cards from a company".
//
// Storage: the generic /api/reports store — type "billing_quotation" for the
// quotations, "billing_quotation_config" for the single settings row (price
// book, default terms; the logo now lives in the INSPECT PRO profile). Every call pins company_id=1 (the platform
// owner) so a super-admin who is currently "inside" another company still
// reads and writes the one shared quotation book — authFetch leaves a URL
// alone once it already carries company_id.
// -----------------------------------------------------------------------------

import API_BASE from "../../../config/api";
import { getIndustryTemplate } from "../../../industries";
import { activeCards, branchesOfCard } from "../reportTypeCatalog";

export const QUOTE_TYPE = "billing_quotation";
export const CONFIG_TYPE = "billing_quotation_config";
const CONFIG_KEY = "billing_quotation_config";
const OWNER_COMPANY_ID = 1;

export const CURRENCIES = ["AED", "USD", "SAR", "EUR", "GBP"];

export const BILLING_CYCLES = [
  { id: "monthly",   en: "Monthly",   ar: "شهري",       perEn: "/ month",   perAr: "/ شهرياً",   months: 1 },
  { id: "quarterly", en: "Quarterly", ar: "ربع سنوي",   perEn: "/ quarter", perAr: "/ كل 3 أشهر", months: 3 },
  { id: "yearly",    en: "Yearly",    ar: "سنوي",       perEn: "/ year",    perAr: "/ سنوياً",   months: 12 },
  { id: "one_time",  en: "One-time",  ar: "مرة واحدة",  perEn: "",          perAr: "",           months: 0 },
];
export const cycleById = (id) => BILLING_CYCLES.find((c) => c.id === id) || BILLING_CYCLES[0];

export const STATUSES = [
  { id: "draft",    en: "Draft",    ar: "مسودّة",   tone: "#64748b", bg: "#f1f5f9" },
  { id: "sent",     en: "Sent",     ar: "أُرسل",    tone: "#1d4ed8", bg: "#dbeafe" },
  { id: "accepted", en: "Accepted", ar: "مقبول",    tone: "#047857", bg: "#d1fae5" },
  { id: "rejected", en: "Rejected", ar: "مرفوض",    tone: "#b91c1c", bg: "#fee2e2" },
  { id: "expired",  en: "Expired",  ar: "منتهي",    tone: "#92400e", bg: "#fef3c7" },
];
export const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

export const UNITS = [
  { id: "branch",  en: "Branch",  ar: "فرع" },
  { id: "user",    en: "User",    ar: "مستخدم" },
  { id: "module",  en: "Module",  ar: "وحدة" },
  { id: "service", en: "Service", ar: "خدمة" },
  { id: "hour",    en: "Hour",    ar: "ساعة" },
  { id: "day",     en: "Day",     ar: "يوم" },
  { id: "item",    en: "Item",    ar: "بند" },
];
export const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[UNITS.length - 1];

/* Line kinds: "recurring" lines are billed every cycle; "one_time" lines
   (setup, training, data migration…) are billed once on top. A line flagged
   `optional` is shown as an add-on and kept OUT of every total. */
export const LINE_KINDS = [
  { id: "recurring", en: "Recurring", ar: "متكرر" },
  { id: "one_time",  en: "One-time",  ar: "مرة واحدة" },
];

/* Document colour themes — `a` is the main colour, `b` the accent. */
export const THEMES = [
  { id: "teal",     en: "Teal",     ar: "فيروزي",  a: "#0f766e", b: "#0891b2", soft: "#f0fdfa", line: "#99f6e4" },
  { id: "navy",     en: "Navy",     ar: "كحلي",    a: "#1e3a8a", b: "#2563eb", soft: "#eff6ff", line: "#bfdbfe" },
  { id: "violet",   en: "Violet",   ar: "بنفسجي",  a: "#5b21b6", b: "#db2777", soft: "#f5f3ff", line: "#ddd6fe" },
  { id: "graphite", en: "Graphite & gold", ar: "فحمي وذهبي", a: "#111827", b: "#b45309", soft: "#fafaf9", line: "#e7e5e4" },
  { id: "emerald",  en: "Emerald",  ar: "زمردي",   a: "#047857", b: "#65a30d", soft: "#f0fdf4", line: "#bbf7d0" },
  { id: "crimson",  en: "Crimson",  ar: "قرمزي",   a: "#9f1239", b: "#ea580c", soft: "#fff1f2", line: "#fecdd3" },
];
export const themeById = (id) => THEMES.find((t) => t.id === id) || THEMES[0];

/* ═══════════════════════════ Terms library ═══════════════════════════
   Each term is a sentence with {placeholders}. Numbers the user can tune
   live in `params`; {vat}, {cycle}/{cycleAr} and {validUntil} come from the
   quotation itself so they never drift from the numbers above them. */

export const TERM_GROUPS = [
  { id: "payment",  en: "Payment",            ar: "الدفع" },
  { id: "contract", en: "Contract & renewal", ar: "العقد والتجديد" },
  { id: "service",  en: "Service & support",  ar: "الخدمة والدعم" },
  { id: "data",     en: "Data & legal",       ar: "البيانات والقانون" },
];

export const TERM_LIBRARY = [
  { key: "vat", group: "payment", on: true,
    en: "Prices exclude VAT; VAT at {vat}% is added to every invoice.",
    ar: "الأسعار لا تشمل الضريبة، وتُضاف ضريبة القيمة المضافة بنسبة {vat}% على كل فاتورة." },
  { key: "billing", group: "payment", on: true,
    en: "The subscription is invoiced in advance at the start of each {cycle} period.",
    ar: "يُفوتر الاشتراك مقدّماً في بداية كل فترة ({cycleAr})." },
  { key: "payment_days", group: "payment", on: true, params: [{ k: "days", v: 15, en: "days", ar: "يوم" }],
    en: "Payment is due within {days} days of the invoice date.",
    ar: "يُستحق الدفع خلال {days} يوماً من تاريخ الفاتورة." },
  { key: "deposit", group: "payment", on: false, params: [{ k: "pct", v: 50, en: "%", ar: "%" }],
    en: "{pct}% of the one-time fees is payable on signing and the balance on go-live.",
    ar: "تُدفع {pct}% من الرسوم لمرة واحدة عند التوقيع، والباقي عند التشغيل." },
  { key: "late_fee", group: "payment", on: false, params: [{ k: "pct", v: 2, en: "%", ar: "%" }, { k: "days", v: 30, en: "days", ar: "يوم" }],
    en: "Late payments may incur {pct}% per month, and the service may be suspended after {days} days overdue.",
    ar: "قد تُفرض غرامة تأخير {pct}% شهرياً، ويجوز إيقاف الخدمة بعد تأخّر {days} يوماً." },
  { key: "min_term", group: "contract", on: true, params: [{ k: "months", v: 3, en: "months", ar: "شهر" }],
    en: "The minimum subscription period is {months} months.",
    ar: "الحد الأدنى لمدة الاشتراك {months} أشهر." },
  { key: "notice", group: "contract", on: true, params: [{ k: "days", v: 30, en: "days", ar: "يوم" }],
    en: "After the minimum period the subscription renews automatically and can be cancelled with {days} days' written notice.",
    ar: "بعد الحد الأدنى يتجدد الاشتراك تلقائياً، ويمكن إلغاؤه بإشعار خطي قبل {days} يوماً." },
  { key: "price_lock", group: "contract", on: false, params: [{ k: "months", v: 12, en: "months", ar: "شهر" }, { k: "pct", v: 5, en: "%", ar: "%" }],
    en: "Prices are fixed for {months} months; any later increase will not exceed {pct}% per year.",
    ar: "الأسعار ثابتة لمدة {months} شهراً، وأي زيادة لاحقة لا تتجاوز {pct}% سنوياً." },
  { key: "onboarding", group: "service", on: false, params: [{ k: "days", v: 10, en: "working days", ar: "يوم عمل" }],
    en: "Go-live within {days} working days from signing and receipt of the required data.",
    ar: "التشغيل خلال {days} يوم عمل من التوقيع واستلام البيانات المطلوبة." },
  { key: "training", group: "service", on: false, params: [{ k: "hours", v: 4, en: "hours", ar: "ساعة" }],
    en: "Includes {hours} hours of staff training (online or on-site).",
    ar: "يشمل {hours} ساعات تدريب للموظفين (عن بُعد أو حضورياً)." },
  { key: "support", group: "service", on: true, params: [{ k: "days", v: 6, en: "days / week", ar: "أيام / أسبوع" }, { k: "hours", v: 4, en: "hours", ar: "ساعة" }],
    en: "Technical support is available {days} days a week, with a first response within {hours} working hours.",
    ar: "الدعم الفني متاح {days} أيام في الأسبوع، مع استجابة أولى خلال {hours} ساعات عمل." },
  { key: "uptime", group: "service", on: false, params: [{ k: "pct", v: 99.5, en: "%", ar: "%" }],
    en: "Target platform availability is {pct}% per month, excluding planned maintenance.",
    ar: "نسبة توفّر المنصة المستهدفة {pct}% شهرياً، باستثناء الصيانة المجدولة." },
  { key: "updates", group: "service", on: false,
    en: "All platform updates and new standard features are included at no extra cost.",
    ar: "جميع تحديثات المنصة والميزات القياسية الجديدة مشمولة بدون تكلفة إضافية." },
  { key: "data", group: "data", on: true, params: [{ k: "days", v: 30, en: "days", ar: "يوم" }],
    en: "Company data is isolated per company and remains the client's property; a full export is provided within {days} days of termination.",
    ar: "بيانات كل شركة معزولة وتبقى ملكاً للعميل، وتُسلَّم نسخة كاملة منها خلال {days} يوماً من انتهاء العقد." },
  { key: "backup", group: "data", on: false, params: [{ k: "days", v: 30, en: "days", ar: "يوم" }],
    en: "Data is backed up automatically every day and backups are kept for {days} days.",
    ar: "تُؤخذ نسخة احتياطية من البيانات يومياً وتُحفظ لمدة {days} يوماً." },
  { key: "scope", group: "data", on: true,
    en: "Any report or feature outside the listed scope is quoted separately.",
    ar: "أي تقرير أو ميزة خارج النطاق المذكور تُسعَّر بشكل منفصل." },
  { key: "confidential", group: "data", on: false,
    en: "Both parties keep this offer and all shared information confidential.",
    ar: "يلتزم الطرفان بسرية هذا العرض وجميع المعلومات المتبادلة." },
  { key: "law", group: "data", on: false,
    en: "This agreement is governed by the laws of the United Arab Emirates.",
    ar: "تخضع هذه الاتفاقية لقوانين دولة الإمارات العربية المتحدة." },
];
export const termTemplate = (key) => TERM_LIBRARY.find((t) => t.key === key) || null;

let _seq = 0;
const uid = (p) => `${p}${Date.now().toString(36)}${(++_seq).toString(36)}`;

export function makeTerm(key, patch = {}) {
  const tpl = termTemplate(key);
  const params = {};
  (tpl?.params || []).forEach((p) => { params[p.k] = p.v; });
  return { id: uid("T"), key, on: tpl ? tpl.on : true, params, en: "", ar: "", ...patch };
}

export const makeCustomTerm = (en = "", ar = "") => ({ id: uid("T"), key: null, on: true, params: {}, en, ar });

export const defaultTermsList = () => TERM_LIBRARY.map((t) => makeTerm(t.key));

/* Sentence for one term, in one language, with every placeholder filled. */
export function termText(term, q, lang = "en") {
  const tpl = term.key ? termTemplate(term.key) : null;
  const raw = (lang === "ar" ? term.ar : term.en) || (tpl ? tpl[lang] : "") || "";
  const cyc = cycleById(q?.cycle);
  const vars = {
    vat: fmtNum(q?.vatPct),
    cycle: cyc.en.toLowerCase(),
    cycleAr: cyc.ar,
    validUntil: dmy(validUntil(q)),
    currency: q?.currency || "",
    ...Object.fromEntries(Object.entries(term.params || {}).map(([k, v]) => [k, fmtNum(v)])),
  };
  return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/* Old quotations stored terms as one text block — turn it into a list. */
export function termsListOf(q) {
  if (Array.isArray(q?.termsList)) return q.termsList;
  const text = String(q?.terms || "").trim();
  if (!text || text === LEGACY_DEFAULT_TERMS) return defaultTermsList();
  return text.split(/\n+/).map((s) => s.trim()).filter(Boolean).map((line) => {
    const i = line.search(/\s\/\s(?=[^/]*[؀-ۿ])/);
    return i > 0 ? makeCustomTerm(line.slice(0, i), line.slice(i + 3)) : makeCustomTerm(line, "");
  });
}

const LEGACY_DEFAULT_TERMS = [
  "Prices are exclusive of VAT unless stated; VAT is added at the rate shown. / الأسعار لا تشمل الضريبة إلا إذا ذُكر ذلك، وتُضاف الضريبة بالنسبة الموضّحة.",
  "Subscription is billed in advance for each billing period; payment is due within 15 days of the invoice. / يُفوتر الاشتراك مقدّماً عن كل فترة، والدفع خلال 15 يوماً من تاريخ الفاتورة.",
  "Minimum subscription period is 3 months, then renews automatically until cancelled with 30 days' written notice. / الحد الأدنى للاشتراك 3 أشهر، ويتجدد تلقائياً حتى الإلغاء بإشعار خطي قبل 30 يوماً.",
  "Company data is isolated per company and remains the client's property; a full export is available on request. / بيانات كل شركة معزولة وتبقى ملكاً للعميل، ويمكن تصديرها كاملة عند الطلب.",
  "Any report or feature outside the listed scope is quoted separately. / أي تقرير أو ميزة خارج النطاق المذكور تُسعَّر بشكل منفصل.",
].join("\n");

/* ═══════════════════════════ Helpers ═══════════════════════════ */

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDaysISO(iso, days) {
  const d = new Date(`${iso || todayISO()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + (Number(days) || 0));
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dmy(iso) {
  return /^\d{4}-\d{2}-\d{2}/.test(String(iso || ""))
    ? String(iso).slice(0, 10).split("-").reverse().join("/")
    : "—";
}

export const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (n) => Math.round((num(n) + Number.EPSILON) * 100) / 100;

const fmtNum = (v) => String(round2(v)).replace(/\.0+$/, "");

export function fmtMoney(n, currency) {
  const v = round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${v} ${currency}` : v;
}

export const newLineId = () => uid("L");

export const emptyLine = (patch = {}) => ({
  id: newLineId(),
  kind: "recurring",
  optional: false,
  titleEn: "",
  titleAr: "",
  details: "",
  qty: 1,
  unit: "item",
  unitPrice: "",
  discountPct: "",
  source: "",       // e.g. "card:daily" / "report:sweets-ph" / "svc:setup" — de-dupe + price book key
  ...patch,
});

export const emptyQuote = (defaults = {}) => ({
  id: null,
  number: "",
  status: "draft",
  issueDate: todayISO(),
  validDays: 30,
  currency: "AED",
  cycle: "monthly",
  contractMonths: 12,
  // client
  companyId: null,
  clientName: "",
  clientContact: "",
  clientEmail: "",
  clientPhone: "",
  clientAddress: "",
  industry: "",
  // issuer (pre-filled from the billing profile)
  issuerName: "",
  issuerAddress: "",
  issuerTaxId: "",
  issuerEmail: "",
  issuerPhone: "",
  preparedBy: "",
  // body
  title: "Food Safety & Quality Management System",
  titleAr: "نظام إدارة سلامة الغذاء والجودة",
  intro: "",
  lines: [],
  discountPct: 0,
  vatPct: 5,
  termsList: defaultTermsList(),
  notes: "",
  showArabic: true,
  theme: "teal",
  showLogo: true,
  ...defaults,
});

/* ═══════════════════════════ Maths ═══════════════════════════
   One function, used by the editor, the preview, the PDF and the list, so
   every screen shows the same numbers. Excel re-derives them with live
   formulas from the same inputs. Optional lines never count. */

export function lineTotal(l) {
  const gross = num(l.qty) * num(l.unitPrice);
  return round2(gross * (1 - num(l.discountPct) / 100));
}

export function computeTotals(q) {
  const all = q?.lines || [];
  const lines = all.filter((l) => !l.optional);
  const recurring = round2(lines.filter((l) => l.kind !== "one_time").reduce((s, l) => s + lineTotal(l), 0));
  const oneTime = round2(lines.filter((l) => l.kind === "one_time").reduce((s, l) => s + lineTotal(l), 0));
  const optional = round2(all.filter((l) => l.optional).reduce((s, l) => s + lineTotal(l), 0));
  const dPct = num(q?.discountPct) / 100;
  const vPct = num(q?.vatPct) / 100;

  const recurringDiscount = round2(recurring * dPct);
  const recurringNet = round2(recurring - recurringDiscount);
  const recurringVat = round2(recurringNet * vPct);
  const recurringTotal = round2(recurringNet + recurringVat);

  const oneTimeDiscount = round2(oneTime * dPct);
  const oneTimeNet = round2(oneTime - oneTimeDiscount);
  const oneTimeVat = round2(oneTimeNet * vPct);
  const oneTimeTotal = round2(oneTimeNet + oneTimeVat);

  const cyc = cycleById(q?.cycle);
  const months = Math.max(0, Math.round(num(q?.contractMonths)));
  const periods = cyc.months > 0 ? months / cyc.months : 0;
  const contractValue = round2(recurringTotal * periods + oneTimeTotal);
  const monthlyEquivalent = cyc.months > 0 ? round2(recurringTotal / cyc.months) : 0;
  const savings = round2((recurring + oneTime) * dPct + all.reduce((s, l) => s + (l.optional ? 0 : num(l.qty) * num(l.unitPrice) - lineTotal(l)), 0));

  return {
    recurring, recurringDiscount, recurringNet, recurringVat, recurringTotal,
    oneTime, oneTimeDiscount, oneTimeNet, oneTimeVat, oneTimeTotal,
    optional, periods, contractValue, monthlyEquivalent, savings,
    firstInvoice: round2(recurringTotal + oneTimeTotal),
  };
}

export const validUntil = (q) => addDaysISO(q?.issueDate, q?.validDays);

export function isExpired(q) {
  const vu = validUntil(q);
  return !!vu && vu < todayISO() && !["accepted", "rejected"].includes(q?.status);
}

export function daysLeft(q) {
  const vu = validUntil(q);
  if (!vu) return null;
  const a = new Date(`${todayISO()}T00:00:00`), b = new Date(`${vu}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

/* Next number in the Q-YYYY-NNN series, based on what is already stored. */
export function nextQuoteNumber(existing = [], issueDate = todayISO()) {
  const year = String(issueDate || todayISO()).slice(0, 4);
  const re = new RegExp(`^Q-${year}-(\\d+)$`);
  const max = existing.reduce((m, q) => {
    const mt = re.exec(String(q?.number || ""));
    return mt ? Math.max(m, Number(mt[1])) : m;
  }, 0);
  return `Q-${year}-${String(max + 1).padStart(3, "0")}`;
}

/* ═══════════════════════════ Smart checks ═══════════════════════════
   Plain-language hints shown next to the editor. level: err | warn | tip. */

export function quoteInsights(q, seller) {
  const out = [];
  const add = (level, en, ar) => out.push({ level, en, ar });
  /* VAT is a legal matter, not a preference: only a registered seller may
     charge it, and a registered one must show its TRN. */
  if (seller && !seller.vatRegistered && num(q?.vatPct) > 0) {
    add("err", "INSPECT PRO is not VAT registered — set VAT to 0 %.", "INSPECT PRO غير مسجّل بالضريبة — خلّي الضريبة 0٪.");
  }
  if (seller?.vatRegistered && num(q?.vatPct) > 0 && !String(q?.issuerTaxId || "").trim()) {
    add("warn", "VAT is charged but no TRN is shown on the quotation.", "في ضريبة بس الرقم الضريبي مش ظاهر على العرض.");
  }
  const lines = q?.lines || [];
  const t = computeTotals(q);

  if (!String(q?.clientName || "").trim()) add("err", "Client name is missing.", "اسم العميل ناقص.");
  if (!lines.length) add("err", "No items yet — add the company's cards or use Smart build.", "لا توجد بنود — أضف كروت الشركة أو استخدم البناء الذكي.");
  const zero = lines.filter((l) => !num(l.unitPrice));
  if (zero.length) add("warn", `${zero.length} line(s) have no price.`, `${zero.length} بند بدون سعر.`);
  const noTitle = lines.filter((l) => !String(l.titleEn || l.titleAr).trim());
  if (noTitle.length) add("err", `${noTitle.length} line(s) have no description.`, `${noTitle.length} بند بدون وصف.`);
  if (!String(q?.clientEmail || "").trim()) add("tip", "Add the client's e-mail so the quotation can be sent.", "أضف إيميل العميل لإرسال العرض.");
  if (isExpired(q)) add("warn", "The validity date has passed — extend it before sending.", "انتهت صلاحية العرض — مدّدها قبل الإرسال.");
  const dl = daysLeft(q);
  if (dl != null && dl >= 0 && dl <= 3 && q?.status !== "accepted") add("tip", `Valid for only ${dl} more day(s).`, `صالح لـ ${dl} يوم فقط.`);
  if (num(q?.discountPct) > 25) add("warn", `Overall discount is ${num(q.discountPct)}% — double-check it.`, `الخصم الإجمالي ${num(q.discountPct)}% — تأكد منه.`);
  const bigLineDisc = lines.filter((l) => num(l.discountPct) > 40);
  if (bigLineDisc.length) add("warn", `${bigLineDisc.length} line(s) discounted over 40%.`, `${bigLineDisc.length} بند خصمه أكثر من 40%.`);
  const terms = termsListOf(q);
  const minTerm = terms.find((x) => x.on && x.key === "min_term");
  const cyc = cycleById(q?.cycle);
  if (minTerm && cyc.months > 0 && num(minTerm.params?.months) > num(q?.contractMonths)) {
    add("warn", "Minimum period in the terms is longer than the contract term.", "الحد الأدنى بالشروط أطول من مدة العقد.");
  }
  if (!terms.some((x) => x.on)) add("tip", "No terms are enabled.", "لا توجد شروط مفعّلة.");
  const seen = new Set();
  const dupes = lines.filter((l) => { const k = (l.source || l.titleEn || "").toLowerCase(); if (!k) return false; if (seen.has(k)) return true; seen.add(k); return false; });
  if (dupes.length) add("tip", `${dupes.length} duplicated line(s).`, `${dupes.length} بند مكرر.`);
  if (t.recurring > 0 && cyc.id === "monthly" && num(q?.contractMonths) >= 12 && !num(q?.discountPct)) {
    add("tip", "12+ month contract — consider a small loyalty discount or yearly billing.", "عقد 12 شهر أو أكثر — فكّر بخصم بسيط أو فوترة سنوية.");
  }
  if (!out.some((x) => x.level !== "tip")) add("ok", "Ready to send.", "جاهز للإرسال.");
  return out;
}

/* Short text version — for WhatsApp / e-mail body / clipboard. */
export function quoteSummaryText(q, lang = "en") {
  const t = computeTotals(q);
  const cyc = cycleById(q.cycle);
  const ar = lang === "ar";
  const rows = (q.lines || []).filter((l) => !l.optional).map((l, i) =>
    `${i + 1}. ${(ar && l.titleAr) || l.titleEn} — ${fmtNum(l.qty)} × ${fmtMoney(l.unitPrice)} = ${fmtMoney(lineTotal(l), q.currency)}`);
  return [
    `${ar ? "عرض سعر" : "Quotation"} ${q.number} — ${q.clientName}`,
    `${ar ? "التاريخ" : "Date"}: ${dmy(q.issueDate)} · ${ar ? "صالح حتى" : "Valid until"}: ${dmy(validUntil(q))}`,
    "",
    ...rows,
    "",
    t.recurring ? `${ar ? "الإجمالي" : "Total"} ${ar ? cyc.perAr : cyc.perEn}: ${fmtMoney(t.recurringTotal, q.currency)}` : "",
    t.oneTime ? `${ar ? "رسوم لمرة واحدة" : "One-time"}: ${fmtMoney(t.oneTimeTotal, q.currency)}` : "",
    t.recurring && cyc.months ? `${ar ? "قيمة العقد" : "Contract value"} (${fmtNum(q.contractMonths)} ${ar ? "شهر" : "months"}): ${fmtMoney(t.contractValue, q.currency)}` : "",
    num(q.vatPct) ? (ar ? `(شامل ضريبة ${fmtNum(q.vatPct)}%)` : `(incl. ${fmtNum(q.vatPct)}% VAT)`) : "",
    "",
    q.issuerName || "",
  ].filter((x, i, a) => x !== "" || (a[i - 1] !== "" && i > 0)).join("\n").trim();
}

/* ═══════════════════════════ Storage ═══════════════════════════ */

const scoped = (path) => `${API_BASE}${path}${path.includes("?") ? "&" : "?"}company_id=${OWNER_COMPANY_ID}`;

function unwrapRows(data) {
  if (Array.isArray(data)) return data;
  return data?.data || data?.reports || data?.rows || data?.items || [];
}

export function quoteFromRecord(rec) {
  const p = rec?.payload || {};
  const q = { ...emptyQuote(), ...p };
  q.id = rec?.id ?? null;
  q.lines = Array.isArray(p.lines) ? p.lines.map((l) => ({ ...emptyLine(), ...l, id: l.id || newLineId() })) : [];
  q.termsList = termsListOf(p);
  q.createdAt = rec?.created_at || rec?.createdAt || null;
  q.updatedAt = p._clientSavedAt || rec?.updated_at || null;
  return q;
}

function toPayload(q) {
  const { id, createdAt, updatedAt, terms, ...rest } = q; // eslint-disable-line no-unused-vars
  return {
    ...rest,
    // unique per row: the reports table is unique on (company, type, reportDate)
    reportDate: q.reportDate || `QUOTE-${q.number || "X"}-${Date.now().toString(36)}`,
    totals: computeTotals(q),
    _clientSavedAt: Date.now(),
  };
}

async function readJson(res, fallback) {
  const j = await res.json().catch(() => null);
  if (!res.ok || (j && j.ok === false)) throw new Error(j?.error || j?.message || `${fallback} (${res.status})`);
  return j;
}

export async function apiListQuotes() {
  const res = await fetch(scoped(`/api/reports?type=${QUOTE_TYPE}&limit=5000`), { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = unwrapRows(await res.json());
  return rows.map(quoteFromRecord).sort((a, b) =>
    String(b.issueDate).localeCompare(String(a.issueDate)) || String(b.number).localeCompare(String(a.number)));
}

export async function apiSaveQuote(q) {
  const payload = toPayload(q);
  const body = JSON.stringify({ reporter: "billing", type: QUOTE_TYPE, payload, companyId: OWNER_COMPANY_ID });
  const res = q.id
    ? await fetch(scoped(`/api/reports/${Number(q.id)}`), { method: "PUT", headers: { "Content-Type": "application/json" }, body })
    : await fetch(scoped(`/api/reports`), { method: "POST", headers: { "Content-Type": "application/json" }, body });
  const j = await readJson(res, "Save failed");
  return quoteFromRecord(j?.report || j?.data || { id: q.id, payload });
}

export async function apiDeleteQuote(id) {
  const res = await fetch(scoped(`/api/reports/${Number(id)}`), { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
  return true;
}

/* ─────────── Settings row: price book, logo, defaults ─────────── */

export const emptyConfig = () => ({ priceBook: {}, logo: "", defaults: {} });

export async function apiLoadConfig() {
  try {
    const res = await fetch(scoped(`/api/reports?type=${CONFIG_TYPE}&limit=20`), { cache: "no-store" });
    if (!res.ok) return emptyConfig();
    const rows = unwrapRows(await res.json());
    const rec = rows.find((r) => r?.payload && (r.payload.priceBook || r.payload.defaults || r.payload.logo));
    return rec ? { ...emptyConfig(), ...rec.payload } : emptyConfig();
  } catch {
    return emptyConfig();
  }
}

export async function apiSaveConfig(cfg) {
  const payload = { ...emptyConfig(), ...cfg, reportDate: CONFIG_KEY, _clientSavedAt: Date.now() };
  const res = await fetch(scoped(`/api/reports`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "billing", type: CONFIG_TYPE, payload, companyId: OWNER_COMPANY_ID }),
  });
  await readJson(res, "Save failed");
  return payload;
}

/* The key a line's price is remembered under. */
export const priceKey = (l) => l?.source || (l?.titleEn ? `title:${String(l.titleEn).trim().toLowerCase()}` : "");

export const priceFor = (priceBook, key) => {
  const v = priceBook?.[key];
  const n = typeof v === "object" ? v?.price : v;
  return n === undefined || n === null || n === "" ? "" : num(n);
};

/* ═══════════════════════════ Module catalogue ═══════════════════════════
   What a company actually runs, turned into quotation lines:
     • Generic industries (e.g. sweets): every report of the template.
     • Meat (Al Mawashi system): every dashboard card with its reports.
   Each entry: { key, group, icon, titleEn, titleAr, details, count }. */

const CARD_AR = {
  inspector: "التفتيش", daily: "المراقبة اليومية", qcsView: "شحنات QCS", ohc: "الشهادات الصحية",
  returns: "المرتجعات", finalProduct: "المنتج النهائي", cars: "السيارات", maintenance: "الصيانة",
  training: "شهادات التدريب", internalTraining: "التدريب الداخلي", iso: "الأيزو والهاسب",
  hse: "الصحة والسلامة والبيئة", inventory: "المخزون", emailCenter: "مركز الإيميلات", settings: "الإعدادات",
};

const REPORT_AR = {
  "Personal Hygiene": "النظافة الشخصية",
  "Daily Cleanliness": "النظافة اليومية",
  "Cooler Temperatures": "درجات حرارة البرادات",
  "Visitor Checklist": "سجل الزوار",
  "Non-Conformance": "تقارير عدم المطابقة",
  "Product Rejection": "رفض المنتجات",
  "Pest Control": "مكافحة الحشرات",
  "Sick Employee": "الموظف المريض",
};

export function moduleCatalog(industry) {
  const tpl = getIndustryTemplate(industry);
  if (tpl) {
    const seen = new Set();
    const out = [];
    for (const card of tpl.cards || []) {
      for (const r of card.reports || []) {
        if (seen.has(r.type)) continue;
        seen.add(r.type);
        out.push({
          key: `report:${r.type}`,
          group: tpl.labelEn || tpl.label || industry,
          icon: r.icon || "📄",
          titleEn: r.label,
          titleAr: REPORT_AR[r.label] || "",
          details: r.desc || "",
          count: 1,
        });
      }
    }
    return out;
  }

  // meat / default: the dashboard cards
  return activeCards()
    .filter((c) => c.id !== "settings")
    .map((c) => {
      const branches = branchesOfCard(c.id);
      const reports = [];
      for (const b of branches) for (const [, label] of b.types) if (!reports.includes(label)) reports.push(label);
      const sample = reports.slice(0, 6).join(", ");
      return {
        key: `card:${c.id}`,
        group: "Al Mawashi system",
        icon: c.emoji,
        titleEn: c.label,
        titleAr: CARD_AR[c.id] || "",
        details: `${reports.length} report${reports.length === 1 ? "" : "s"}: ${sample}${reports.length > 6 ? "…" : ""}`,
        count: reports.length,
      };
    });
}

/* Extra platform services that are not tied to a card. */
export const SERVICE_PRESETS = [
  { key: "svc:branch",    kind: "recurring", unit: "branch",  icon: "🏬", titleEn: "Platform subscription — per branch / site", titleAr: "اشتراك المنصة — لكل فرع / موقع" },
  { key: "svc:users",     kind: "recurring", unit: "user",    icon: "👥", titleEn: "Additional user accounts",                  titleAr: "حسابات مستخدمين إضافية" },
  { key: "svc:hosting",   kind: "recurring", unit: "service", icon: "☁️", titleEn: "Cloud hosting, daily backups & e-mail sending", titleAr: "الاستضافة السحابية والنسخ الاحتياطي اليومي وإرسال الإيميلات" },
  { key: "svc:support",   kind: "recurring", unit: "service", icon: "🛟", titleEn: "Technical support & maintenance",           titleAr: "الدعم الفني والصيانة" },
  { key: "svc:whatsapp",  kind: "recurring", unit: "service", icon: "💬", titleEn: "Automatic e-mail / WhatsApp alerts",        titleAr: "تنبيهات تلقائية بالإيميل / واتساب" },
  { key: "svc:setup",     kind: "one_time",  unit: "service", icon: "🧰", titleEn: "Setup, configuration & data migration",     titleAr: "التجهيز والإعداد وترحيل البيانات" },
  { key: "svc:training",  kind: "one_time",  unit: "hour",    icon: "🎓", titleEn: "On-site / online staff training",           titleAr: "تدريب الموظفين (حضوري / عن بعد)" },
  { key: "svc:custom",    kind: "one_time",  unit: "item",    icon: "🧩", titleEn: "Custom report / form development",          titleAr: "تطوير تقرير / نموذج مخصص" },
  { key: "svc:branding",  kind: "one_time",  unit: "service", icon: "🎨", titleEn: "Company branding (logo, colours, PDF headers)", titleAr: "هوية الشركة (الشعار والألوان وترويسة التقارير)" },
  { key: "svc:tablet",    kind: "one_time",  unit: "item",    icon: "📱", titleEn: "Tablet device for data entry",             titleAr: "جهاز تابلت لإدخال البيانات" },
];

/* ═══════════════════════════ Smart build ═══════════════════════════
   One form → a complete, priced set of lines. Prices come from the price
   book; anything without a remembered price is left blank (yellow in the
   editor) rather than guessed. */

export function smartBuildLines({ industry, branches = 1, users = 0, modules = "lines", hosting = true, support = true, setup = true, trainingHours = 0, priceBook = {} }) {
  const out = [];
  const pb = (key) => priceFor(priceBook, key);
  const preset = (key, patch = {}) => {
    const p = SERVICE_PRESETS.find((x) => x.key === key);
    return emptyLine({ kind: p.kind, unit: p.unit, titleEn: p.titleEn, titleAr: p.titleAr, source: p.key, unitPrice: pb(p.key), ...patch });
  };

  if (num(branches) > 0) out.push(preset("svc:branch", { qty: num(branches) }));

  const cat = moduleCatalog(industry || "meat");
  if (modules === "lines") {
    cat.forEach((m) => out.push(emptyLine({
      kind: "recurring", unit: "module", titleEn: m.titleEn, titleAr: m.titleAr, details: m.details,
      source: m.key, unitPrice: pb(m.key),
    })));
  } else if (modules === "bundle" && cat.length) {
    const key = `bundle:${industry || "meat"}`;
    out.push(emptyLine({
      kind: "recurring", unit: "service", titleEn: `System modules package (${cat.length} modules)`, titleAr: `باقة وحدات النظام (${cat.length} وحدة)`,
      details: cat.map((m) => m.titleEn).join(" · "), source: key, unitPrice: pb(key),
    }));
  }

  if (num(users) > 0) out.push(preset("svc:users", { qty: num(users) }));
  if (hosting) out.push(preset("svc:hosting"));
  if (support) out.push(preset("svc:support"));
  if (setup) out.push(preset("svc:setup"));
  if (num(trainingHours) > 0) out.push(preset("svc:training", { qty: num(trainingHours) }));
  return out;
}
