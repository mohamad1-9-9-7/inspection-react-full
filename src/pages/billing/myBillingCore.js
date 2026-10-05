// src/pages/billing/myBillingCore.js
// -----------------------------------------------------------------------------
// A company's own billing (/my-billing) — API calls and the receipt reader.
// The server (routes/myBilling.cjs) is the authority on money, dates and who
// may see what; this file only fetches, and reads a bank receipt photo so the
// form can be pre-filled and the owner can compare.
// -----------------------------------------------------------------------------

import API_BASE from "../../config/api";

const ERRORS = {
  company_account_required: { en: "This page is for company accounts.", ar: "هذه الصفحة لحسابات الشركات." },
  admin_required: { en: "Only your company's admin can see billing.", ar: "الفوترة متاحة لمدير الشركة فقط." },
  invoice_required: { en: "Choose the invoice you paid.", ar: "اختر الفاتورة اللي دفعتها." },
  image_required: { en: "Attach the receipt picture.", ar: "أرفق صورة الإيصال." },
  amount_required: { en: "Enter the amount you transferred.", ar: "اكتب المبلغ اللي حوّلته." },
  date_in_future: { en: "The payment date is in the future.", ar: "تاريخ الدفع بالمستقبل." },
  invoice_not_found: { en: "That invoice was not found.", ar: "الفاتورة غير موجودة." },
  invoice_not_unpaid: { en: "This invoice is no longer waiting for payment.", ar: "هالفاتورة ما عادت بانتظار الدفع." },
  too_many_pending: { en: "This invoice already has receipts waiting for review.", ar: "في إيصالات لهالفاتورة لسا قيد المراجعة." },
  not_found_or_reviewed: { en: "This receipt was already reviewed.", ar: "هالإيصال انراجع خلص." },
  rate_lock_too_early: { en: "The offer is not open yet.", ar: "العرض لسا ما انفتح." },
  rate_lock_promo_ended: { en: "Your promo year has ended.", ar: "سنة الخصم انتهت." },
  rate_lock_no_promo: { en: "Your subscription has no promo code.", ar: "اشتراكك ما عليه كود خصم." },
  auth_required: { en: "Please sign in again.", ar: "سجّل دخول من جديد." },
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

export const apiMyBilling = (lang) => call("GET", "/api/my-billing", null, lang);
export const apiSendProof = (body, lang) => call("POST", "/api/my-billing/proofs", body, lang).then((j) => j.proof);
export const apiWithdrawProof = (id, lang) => call("DELETE", `/api/my-billing/proofs/${Number(id)}`, null, lang);
export const apiRateLock = (lang) => call("POST", "/api/my-billing/rate-lock", null, lang).then((j) => j.invoice);

/* ─────────── who sees billing ─────────── */

export function currentAccount() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}") || {}; } catch { return {}; }
}

/* A company admin — not the platform owner, not a trial visitor. */
export const isBillingAdmin = (u = currentAccount()) =>
  !!u && !!u.isAdmin && !u.isSuperAdmin && !u.companyTrial && Number(u.companyId) > 0;

/* ─────────── receipt reader ───────────
   Bank receipts (UAE banks, exchange houses, mobile banking screenshots) say
   the same few things in many layouts: an amount, a reference, a date. The
   reader collects every candidate and lets the form pick the one matching the
   invoice — it never decides alone; the customer confirms what is sent. */

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");
const validIso = (y, m, d) => (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${y}-${pad(m)}-${pad(d)}` : null);

export function parseReceipt(raw, invoiceNumbers = []) {
  const text = String(raw || "").replace(/\r/g, "");
  const flat = text.replace(/\s+/g, " ");

  // Amounts: 2,520.00 · 2520.00 · AED 2,520 · 2.520,00 is not a UAE format and is ignored.
  const amounts = [];
  const add = (v) => { const n = Number(String(v).replace(/,/g, "")); if (n > 0 && n < 1e8 && !amounts.includes(n)) amounts.push(n); };
  for (const m of flat.matchAll(/(?:AED|DHS?|درهم)\s*[:.]?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/gi)) add(m[1]);
  for (const m of flat.matchAll(/(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})(?:\s*(?:AED|DHS?))?/gi)) add(m[1]);
  amounts.sort((a, b) => b - a);

  // References: after a "ref / transaction / UTR" label, or a bank's FT/TT number.
  const references = [];
  const addRef = (v) => { const r = String(v || "").toUpperCase(); if (r.length >= 6 && /\d/.test(r) && !references.includes(r)) references.push(r); };
  for (const m of flat.matchAll(/(?:ref(?:erence)?|transaction|txn|utr|trx|رقم\s*(?:المرجع|العملية))\s*(?:no\.?|number|id|#)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{5,29})/gi)) addRef(m[1]);
  for (const m of flat.matchAll(/\b((?:FT|TT|IPI|AANI)[A-Z0-9]{6,24})\b/gi)) addRef(m[1]);

  // Dates: 05/10/2026 (day first, UAE) · 2026-10-05 · 05 Oct 2026 · 05-Oct-2026.
  const dates = [];
  const addDate = (d) => { if (d && !dates.includes(d)) dates.push(d); };
  for (const m of flat.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) addDate(validIso(+m[1], +m[2], +m[3]));
  for (const m of flat.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g)) addDate(validIso(+m[3], +m[2], +m[1]));
  for (const m of flat.matchAll(/\b(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-,]*(\d{4})\b/g)) {
    const mm = MONTHS[m[2].toLowerCase()];
    if (mm) addDate(validIso(+m[3], mm, +m[1]));
  }

  const squash = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const flatSquash = squash(flat);
  const invoiceNumberSeen = invoiceNumbers.some((n) => n && flatSquash.includes(squash(n)));

  return { amounts: amounts.slice(0, 8), references: references.slice(0, 8), dates: dates.slice(0, 4), invoiceNumberSeen, text: text.slice(0, 2000) };
}

/* How a reading compares with the invoice being paid. */
export function matchReceipt(reading, invoice) {
  const due = Number(invoice?.amount) || 0;
  const amountMatch = !!reading && due > 0 && reading.amounts.some((a) => Math.abs(a - due) < 0.01);
  return { amountMatch, invoiceNumberSeen: !!reading?.invoiceNumberSeen };
}

/* ─────────── dates ─────────── */

export const todayISO = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

export function daysUntil(iso, now = new Date()) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  if (!y) return null;
  const end = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((end - today) / 86400000);
}

/* The dunning banner: from DUE_SOON_DAYS before the end date. */
export const DUE_SOON_DAYS = 10;
