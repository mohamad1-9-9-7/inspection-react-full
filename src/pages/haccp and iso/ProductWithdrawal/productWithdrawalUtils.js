// src/pages/haccp and iso/ProductWithdrawal/productWithdrawalUtils.js
// Shared maths for the Product Withdrawal module (ISO 22000 §8.9.5).
// Kept in its own file so the list view, the trend report and the Excel
// exporter all compute the same numbers without pulling in the input form.

export const TYPE = "product_withdrawal";

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/**
 * Totals and stock-secured rate across every location row of a withdrawal.
 * Secured = held on site + returned to warehouse. Target rate is 100%.
 */
export function summarizeLocations(locations) {
  const rows = Array.isArray(locations) ? locations : [];
  const totals = rows.reduce(
    (acc, l) => ({
      dispatched: acc.dispatched + num(l.dispatched),
      held: acc.held + num(l.held),
      returned: acc.returned + num(l.returned),
      sold: acc.sold + num(l.sold),
    }),
    { dispatched: 0, held: 0, returned: 0, sold: 0 }
  );
  const secured = totals.held + totals.returned;
  const accountedRate = totals.dispatched > 0
    ? Math.min(100, (secured / totals.dispatched) * 100)
    : null;
  const confirmedCount = rows.filter((l) => l.confirmed).length;
  return { ...totals, secured, accountedRate, confirmedCount, locationCount: rows.length };
}

/** Hours between withdrawal initiation and the moment stock was fully secured. */
export function computeSecureHours(initDate, initTime, holdCompleted) {
  if (!initDate || !holdCompleted) return null;
  const start = new Date(`${initDate}T${initTime || "00:00"}`).getTime();
  const end = new Date(holdCompleted).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  const hours = (end - start) / 3600000;
  return hours < 0 ? null : hours;
}

/**
 * A withdrawal stops being a withdrawal once product reached the consumer.
 * The sold column reveals it even when the header answer still says "no".
 */
export function needsRecallEscalation(payload) {
  const p = payload || {};
  if (p.consumerReached === "yes") return true;
  const rows = Array.isArray(p.locations) ? p.locations : [];
  return rows.some((l) => num(l.sold) > 0);
}
