// src/pages/settings/_shared/companyBilling.js
// One rule set for "what state is this company in" and "what is it worth a
// month", shared by the Billing tabs. Before this, Overview / Plans /
// Companies each had their own copy and showed three different MRRs.

import { currencyOf, netPriceOf, priceOf } from "../invoices/invoiceCore";

export { currencyOf, netPriceOf, priceOf };

/* Whole days from today to the end date (negative = passed); null = none. */
export function daysLeft(endDate) {
  if (!endDate) return null;
  const end = new Date(String(endDate).slice(0, 10));
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((end - today) / 86400000);
}

/* What the company really is today — the login lock's rule:
   disabled wins over everything; a stored active/trial whose end date has
   passed counts as expired. "suspended" is a legacy stored value (new
   companies are switched off with Disable instead). */
export function companyStatus(c) {
  if (c?.disabled_at) return "disabled";
  const s = String(c?.status || "active").toLowerCase();
  if (s === "expired" || s === "suspended") return s;
  const d = daysLeft(c?.end_date);
  return d !== null && d < 0 ? "expired" : s;
}

/* Monthly recurring revenue per currency — paying (active) companies only,
   each at its own custom price, else its plan's, less its promo code while
   that runs (first year). Never adds AED to USD. */
export function mrrByCurrency(companies) {
  const out = {};
  for (const c of companies || []) {
    if (companyStatus(c) !== "active") continue;
    const p = netPriceOf(c);
    if (!p) continue;
    const cur = currencyOf(c);
    out[cur] = (out[cur] || 0) + p;
  }
  return out;
}

/* Does company `c` sit on plan `plan`? (by id, or by name for old rows) */
export const onPlan = (c, plan) =>
  (c?.plan_id != null && String(c.plan_id) === String(plan?.id)) ||
  (!c?.plan_id && !!c?.plan_name && String(c.plan_name).toLowerCase() === String(plan?.name || "").toLowerCase());
