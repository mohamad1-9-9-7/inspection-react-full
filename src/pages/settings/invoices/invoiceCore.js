// src/pages/settings/invoices/invoiceCore.js
// -----------------------------------------------------------------------------
// Invoices issued by INSPECT PRO to a company — data access and the small
// amount of logic the screen needs. The server is the authority on money,
// VAT and numbering (routes/billing.cjs); nothing here re-computes a total
// that the server has already fixed on an issued invoice.
// -----------------------------------------------------------------------------

import API_BASE from "../../../config/api";

export const STATUS = {
  unpaid:  { en: "Unpaid",  ar: "غير مدفوعة", fg: "#92400e", bg: "#fffbeb", bd: "#fcd34d" },
  overdue: { en: "Overdue", ar: "متأخرة",     fg: "#991b1b", bg: "#fef2f2", bd: "#fca5a5" },
  paid:    { en: "Paid",    ar: "مدفوعة",     fg: "#166534", bg: "#f0fdf4", bd: "#86efac" },
  void:    { en: "Void",    ar: "ملغاة",      fg: "#475569", bg: "#f1f5f9", bd: "#cbd5e1" },
};

/* The status to show: the server's display_status (it knows "overdue"). */
export const statusOf = (inv) => inv?.display_status || inv?.status || "unpaid";

/* DATE columns arrive as ISO timestamps; the calendar day is the first 10. */
export const day = (v) => (v ? String(v).slice(0, 10) : "");

export function fmtDate(v) {
  const d = day(v);
  if (!d) return "—";
  const [y, m, dd] = d.split("-").map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const fmtMoney = (n, cur = "AED") =>
  `${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur || "AED"}`;

/* "UAE Dirhams Three Thousand Two Hundred and Fifty Fils Only" — the amount
   in words customary on a UAE invoice. Whole units up to the billions. */
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const CURRENCY_WORDS = {
  AED: ["UAE Dirhams", "Fils"], USD: ["US Dollars", "Cents"], SAR: ["Saudi Riyals", "Halalas"],
  EUR: ["Euros", "Cents"], GBP: ["Pounds Sterling", "Pence"],
};
function under1000(n) {
  const h = Math.floor(n / 100), r = n % 100;
  const rest = r < 20 ? ONES[r] : [TENS[Math.floor(r / 10)], ONES[r % 10]].filter(Boolean).join("-");
  return [h ? `${ONES[h]} Hundred` : "", rest].filter(Boolean).join(" ");
}
function intWords(n) {
  if (n === 0) return "Zero";
  const parts = [];
  [[1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"], [1, ""]].forEach(([size, name]) => {
    const chunk = Math.floor(n / size) % 1000;
    if (chunk) parts.push([under1000(chunk), name].filter(Boolean).join(" "));
  });
  return parts.join(" ");
}
export function amountInWords(amount, cur = "AED") {
  const cents = Math.round(Math.abs(Number(amount) || 0) * 100);
  const [major, minor] = CURRENCY_WORDS[cur] || [cur, "Cents"];
  const whole = Math.floor(cents / 100), frac = cents % 100;
  return `${major} ${intWords(whole)}${frac ? ` and ${intWords(frac)} ${minor}` : ""} Only`;
}

export const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

function addMonthsISO(iso, months) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d));
  // 31 Jan + 1 month would roll into March — clamp to the month's last day.
  if (dt.getUTCDate() !== d) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}
const addDaysISO = (iso, days) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/* The period the NEXT invoice for a company should cover: the day after
   its latest non-void invoice ends, for one month; with none yet, from the
   company's start date (or today). */
export function nextPeriod(company, invoices, today = todayISO()) {
  const mine = (invoices || [])
    .filter((i) => Number(i.company_id) === Number(company?.id) && statusOf(i) !== "void" && day(i.period_end))
    .sort((a, b) => day(b.period_end).localeCompare(day(a.period_end)));
  const start = mine.length ? addDaysISO(day(mine[0].period_end), 1) : day(company?.start_date) || today;
  return { start, end: addDaysISO(addMonthsISO(start, 1), -1) };
}

/* A company's monthly price: its own custom price, else its plan's. */
export const priceOf = (c) => Number(c?.price ?? c?.plan_price ?? 0);
export const currencyOf = (c) => c?.currency || c?.plan_currency || "AED";

/* The company's promo code (Companies → Promo code) — frozen on the company
   when attached, and only for its first year: it applies to a period that
   STARTS on or before promo_until. */
export const promoRunsOn = (c, iso = todayISO()) =>
  !!(c?.promo_code && c?.promo_until && Number(c?.promo_amount) > 0 && iso && day(iso) <= day(c.promo_until));

/* What the promo takes off one month: a percentage of the monthly price, or
   AED per billed branch — never more than the price itself. */
export function promoMonthlyOff(c) {
  const price = priceOf(c);
  const amount = Number(c?.promo_amount) || 0;
  if (!(price > 0) || !(amount > 0)) return 0;
  const off = c.promo_kind === "aed" ? amount * Math.max(1, Number(c.branches) || 1) : (price * amount) / 100;
  return Math.min(price, Math.round((off + Number.EPSILON) * 100) / 100);
}

/* What the company pays a month on `iso` (the promo while it runs). */
export const netPriceOf = (c, iso = todayISO()) => priceOf(c) - (promoRunsOn(c, iso) ? promoMonthlyOff(c) : 0);

/* The invoice line for the promo, or null: one month's discount as its own
   negative line, so the invoice shows the list price and what came off. */
export function promoLineFor(c, periodStart) {
  if (!promoRunsOn(c, periodStart)) return null;
  const off = promoMonthlyOff(c);
  if (!off) return null;
  const what = c.promo_kind === "aed" ? `AED ${Number(c.promo_amount)} off per branch` : `${Number(c.promo_amount)}% off`;
  return { description: `Promo code ${c.promo_code} — ${what} (first year, until ${fmtDate(c.promo_until)})`, qty: 1, unit_price: -off };
}

/* Headline numbers, per currency (never add AED to USD). */
export function invoiceKpis(invoices, today = todayISO()) {
  const month = today.slice(0, 7);
  const year = today.slice(0, 4);
  const add = (acc, cur, n) => ({ ...acc, [cur]: (acc[cur] || 0) + Number(n || 0) });
  let outstanding = {}, overdue = {}, collected = {};
  let overdueCount = 0, issuedThisYear = 0;
  for (const i of invoices || []) {
    const s = statusOf(i);
    const cur = i.currency || "AED";
    if (s === "unpaid" || s === "overdue") outstanding = add(outstanding, cur, i.amount);
    if (s === "overdue") { overdue = add(overdue, cur, i.amount); overdueCount += 1; }
    if (s === "paid" && day(i.paid_at).startsWith(month)) collected = add(collected, cur, i.amount);
    if (s !== "void" && day(i.issue_date).startsWith(year)) issuedThisYear += 1;
  }
  return { outstanding, overdue, collected, overdueCount, issuedThisYear };
}

/* `zeroCur`: the currency to show "0.00" in when the map is empty, so an
   empty KPI matches the cards beside it instead of defaulting to AED. */
export const moneyMap = (m, zeroCur) =>
  Object.keys(m).length ? Object.entries(m).map(([c, v]) => fmtMoney(v, c)).join(" · ") : fmtMoney(0, zeroCur);

/* ─────────── API ─────────── */

const ERRORS = {
  company_required:  { en: "Choose a company.", ar: "اختار شركة." },
  company_not_found: { en: "That company no longer exists.", ar: "الشركة غير موجودة." },
  lines_invalid:     { en: "Every line needs a description and a quantity above 0, and the total can't go below zero.", ar: "كل بند بحاجة وصف وكمية أكبر من 0، والمجموع ما بينزل تحت الصفر." },
  period_invalid:    { en: "The period ends before it starts.", ar: "الفترة بتنتهي قبل ما تبلّش." },
  not_unpaid:        { en: "Only an unpaid invoice can be marked paid.", ar: "بس الفاتورة غير المدفوعة بتنعلّم مدفوعة." },
  not_paid:          { en: "This invoice is not marked paid.", ar: "الفاتورة مش معلّمة مدفوعة." },
  only_unpaid_can_be_voided: { en: "A paid invoice cannot be voided — mark it unpaid first if it was a mistake.", ar: "ما بتنلغى فاتورة مدفوعة — رجّعها غير مدفوعة أولاً إذا كان في غلط." },
  reason_required:   { en: "Write why it is being voided.", ar: "اكتب سبب الإلغاء." },
  super_admin_required: { en: "Only the platform owner can do this.", ar: "مالك المنصّة وحده بيقدر." },
};

async function call(method, path, body, lang) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) {
    const m = ERRORS[j.error];
    throw new Error(m ? m[lang === "ar" ? "ar" : "en"] : j.error || `HTTP ${res.status}`);
  }
  return j;
}

export const apiListInvoices = (lang) => call("GET", "/api/invoices", null, lang).then((j) => j.invoices || []);
export const apiIssueInvoice = (body, lang) => call("POST", "/api/invoices", body, lang).then((j) => j.invoice);
export const apiInvoiceAction = (id, body, lang) => call("PATCH", `/api/invoices/${Number(id)}`, body, lang).then((j) => j.invoice);
