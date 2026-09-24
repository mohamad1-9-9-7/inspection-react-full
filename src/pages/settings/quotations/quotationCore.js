// src/pages/settings/quotations/quotationCore.js
// -----------------------------------------------------------------------------
// Quotations (عروض الأسعار) — data model, storage, maths and the module
// catalogue that feeds "add cards from a company".
//
// Storage: the generic /api/reports store, type "billing_quotation". Every call
// pins company_id=1 (the platform owner) so a super-admin who is currently
// "inside" another company still reads and writes the one shared quotation
// book — authFetch leaves a URL alone once it already carries company_id.
// -----------------------------------------------------------------------------

import API_BASE from "../../../config/api";
import { getIndustryTemplate } from "../../../industries";
import { activeCards, branchesOfCard } from "../reportTypeCatalog";

export const QUOTE_TYPE = "billing_quotation";
const OWNER_COMPANY_ID = 1;

export const CURRENCIES = ["AED", "USD", "SAR", "EUR", "GBP"];

export const BILLING_CYCLES = [
  { id: "monthly",  en: "Monthly",  ar: "شهري",       perEn: "/ month", perAr: "/ شهرياً", months: 1 },
  { id: "yearly",   en: "Yearly",   ar: "سنوي",       perEn: "/ year",  perAr: "/ سنوياً", months: 12 },
  { id: "one_time", en: "One-time", ar: "مرة واحدة",  perEn: "",        perAr: "",         months: 0 },
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
  { id: "item",    en: "Item",    ar: "بند" },
];
export const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[UNITS.length - 1];

/* Line kinds: "recurring" lines are billed every cycle; "one_time" lines
   (setup, training, data migration…) are billed once on top. */
export const LINE_KINDS = [
  { id: "recurring", en: "Recurring", ar: "متكرر" },
  { id: "one_time",  en: "One-time",  ar: "مرة واحدة" },
];

export const DEFAULT_TERMS = [
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

export function fmtMoney(n, currency) {
  const v = round2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${v} ${currency}` : v;
}

let _lineSeq = 0;
export const newLineId = () => `L${Date.now().toString(36)}${(++_lineSeq).toString(36)}`;

export const emptyLine = (patch = {}) => ({
  id: newLineId(),
  kind: "recurring",
  titleEn: "",
  titleAr: "",
  details: "",
  qty: 1,
  unit: "item",
  unitPrice: "",
  discountPct: "",
  source: "",       // e.g. "card:daily" / "report:sweets-ph" / "plan:3" — for de-duplication
  ...patch,
});

export const emptyQuote = () => ({
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
  // body
  title: "Food Safety & Quality Management System",
  intro: "",
  lines: [],
  discountPct: 0,
  vatPct: 5,
  terms: DEFAULT_TERMS,
  notes: "",
  showArabic: true,
});

/* ═══════════════════════════ Maths ═══════════════════════════
   One function, used by the editor, the preview, the PDF and the list, so
   every screen shows the same numbers. Excel re-derives them with live
   formulas from the same inputs. */

export function lineTotal(l) {
  const gross = num(l.qty) * num(l.unitPrice);
  return round2(gross * (1 - num(l.discountPct) / 100));
}

export function computeTotals(q) {
  const lines = q?.lines || [];
  const recurring = round2(lines.filter((l) => l.kind !== "one_time").reduce((s, l) => s + lineTotal(l), 0));
  const oneTime = round2(lines.filter((l) => l.kind === "one_time").reduce((s, l) => s + lineTotal(l), 0));
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

  return {
    recurring, recurringDiscount, recurringNet, recurringVat, recurringTotal,
    oneTime, oneTimeDiscount, oneTimeNet, oneTimeVat, oneTimeTotal,
    periods, contractValue,
    firstInvoice: round2(recurringTotal + oneTimeTotal),
  };
}

export const validUntil = (q) => addDaysISO(q?.issueDate, q?.validDays);

export function isExpired(q) {
  const vu = validUntil(q);
  return !!vu && vu < todayISO() && !["accepted", "rejected"].includes(q?.status);
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

/* ═══════════════════════════ Storage ═══════════════════════════ */

const scoped = (path) => `${API_BASE}${path}${path.includes("?") ? "&" : "?"}company_id=${OWNER_COMPANY_ID}`;

function unwrapRows(data) {
  if (Array.isArray(data)) return data;
  return data?.data || data?.reports || data?.rows || data?.items || [];
}

export function quoteFromRecord(rec) {
  const p = rec?.payload || {};
  const base = emptyQuote();
  const q = { ...base, ...p };
  q.id = rec?.id ?? null;
  q.lines = Array.isArray(p.lines) ? p.lines.map((l) => ({ ...emptyLine(), ...l, id: l.id || newLineId() })) : [];
  q.createdAt = rec?.created_at || rec?.createdAt || null;
  q.updatedAt = p._clientSavedAt || rec?.updated_at || null;
  return q;
}

function toPayload(q) {
  const { id, createdAt, updatedAt, ...rest } = q; // eslint-disable-line no-unused-vars
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
  { key: "svc:branch",   kind: "recurring", unit: "branch",  titleEn: "Platform subscription — per branch / site", titleAr: "اشتراك المنصة — لكل فرع / موقع" },
  { key: "svc:users",    kind: "recurring", unit: "user",    titleEn: "Additional user accounts",                  titleAr: "حسابات مستخدمين إضافية" },
  { key: "svc:hosting",  kind: "recurring", unit: "service", titleEn: "Cloud hosting, daily backups & e-mail sending", titleAr: "الاستضافة السحابية والنسخ الاحتياطي اليومي وإرسال الإيميلات" },
  { key: "svc:support",  kind: "recurring", unit: "service", titleEn: "Technical support & maintenance",           titleAr: "الدعم الفني والصيانة" },
  { key: "svc:setup",    kind: "one_time",  unit: "service", titleEn: "Setup, configuration & data migration",     titleAr: "التجهيز والإعداد وترحيل البيانات" },
  { key: "svc:training", kind: "one_time",  unit: "hour",    titleEn: "On-site / online staff training",           titleAr: "تدريب الموظفين (حضوري / عن بعد)" },
  { key: "svc:custom",   kind: "one_time",  unit: "item",    titleEn: "Custom report / form development",          titleAr: "تطوير تقرير / نموذج مخصص" },
];
