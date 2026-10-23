// src/pages/traceability/shipmentTrace.js
//
// One shipment, followed downstream — the two rules of the Product
// Traceability screen as plain functions, so the trace page and the Mock
// Recall drill (haccp and iso/MockRecall) count exactly the same rows:
//
//   RULE 1 — the window: from the day the shipment was received to its
//            expiry (+ grace). Rows before the receipt are separated out.
//   RULE 2 — dates are a confidence mark ("lot" / "near" / "other" / "date"),
//            never a filter (unless `strict`).
//
// Input is a merged trace (productTraceApi.mergeTrace) and one shipment hit.

import { OUR_BRANCHES, resolveOurBranch, isCustomerReturn } from "./productTraceApi";

/* ===== The two rules ===== */

export const ymd = (v) => String(v || "").slice(0, 10);

/** Add days to a YYYY-MM-DD date. */
export function addDays(date, days) {
  const t = ymd(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return "";
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate()
  ).padStart(2, "0")}`;
}

export const dayDiff = (a, b) => {
  const x = Date.parse(ymd(a));
  const y = Date.parse(ymd(b));
  return Number.isFinite(x) && Number.isFinite(y) ? Math.round((x - y) / 86400000) : null;
};

/**
 * RULE 2 — how well does this row's own production / expiry agree with the
 * shipment? This is a CONFIDENCE MARK, not a filter: the window decides what
 * is counted, the dates only say how sure we are.
 *
 * That distinction was learned the hard way — a shipment expiring 16/09 had
 * its returns written as 15/09 (one day off, the branch rounding shelf life),
 * and treating the mismatch as an exclusion emptied every step of a trace
 * whose records plainly existed.
 *
 *   "lot"   — the date matches exactly: proven.
 *   "near"  — within NEAR_DAYS: almost certainly the same goods, written by a
 *             different hand.
 *   "other" — a clearly different date: probably another lot, still counted
 *             inside the window but flagged.
 *   "date"  — the row carries no date: matched on code + window only.
 */
export const NEAR_DAYS = 3;

export function lotVerdict(rowProd, rowExp, anchor) {
  const re = ymd(rowExp);
  const rp = ymd(rowProd);
  const ae = ymd(anchor.expiryDate);
  const ap = ymd(anchor.prodDate);

  const grade = (rowDate, anchorDate) => {
    if (rowDate === anchorDate) return { verdict: "lot", off: 0 };
    const off = dayDiff(rowDate, anchorDate);
    if (off != null && Math.abs(off) <= NEAR_DAYS) return { verdict: "near", off };
    return { verdict: "other", off };
  };

  if (ae && re) return grade(re, ae);
  if (ap && rp) return grade(rp, ap);
  // Only one side carries a date — it proves nothing either way.
  return { verdict: "date", off: null };
}

/**
 * Split one family against the chosen shipment.
 *
 * RULE 1 decides membership and nothing else: a record belongs to this
 * shipment when its date falls between the day the goods arrived and the day
 * they expire. Rows outside that window are separated (and reported); rows
 * inside it are all kept, each carrying its own confidence mark.
 *
 * `strict` re-imposes the old exact-lot filter for the rare case where a
 * product really does have two live lots at once.
 */
export function splitByShipment(hits, anchor, { until, nextShipmentDate, datesOf, strict }) {
  const kept = [];
  const before = [];
  const other = [];
  const after = [];

  (hits || []).forEach((h) => {
    const d = ymd(h.date);
    // RULE 1 — nothing that happened before the goods arrived.
    if (d && anchor.date && d < anchor.date) {
      before.push(h);
      return;
    }
    if (until && d && d > until) {
      after.push(h);
      return;
    }
    const { prodDate, expiryDate } = datesOf(h);
    const { verdict, off } = lotVerdict(prodDate, expiryDate, anchor);
    const row = {
      ...h,
      prodDate,
      expiryDate,
      verdict,
      off,
      late: verdict === "date" && !!nextShipmentDate && d >= nextShipmentDate,
    };
    if (strict && verdict === "other") {
      other.push(row);
      return;
    }
    kept.push(row);
  });

  return { kept, before, other, after };
}

/* Which pair of dates each family carries. Kept next to the split so the two
   are read together. */
export const datesOfDispatch = (h) => ({ prodDate: h.prodDate, expiryDate: h.expiryDate });
export const datesOfReceiving = (h) => ({ prodDate: h.prodDate, expiryDate: h.expiryDate });
export const datesOfReturn = (h) => ({ prodDate: "", expiryDate: h.expiryDate });
export const datesOfCondition = (h) => ({ prodDate: "", expiryDate: h.expiryDate });
export const datesOfBatch = (h) => ({
  prodDate: h.role === "output" ? h.finalProdDate : h.origProdDate || h.finalProdDate,
  expiryDate: h.role === "output" ? h.finalExpDate : h.origExpDate || h.finalExpDate,
});


/* ===== One shipment, end to end ===== */

/** The next shipment of the same code — the moment a date-only row downstream
    stops being certainly ours. */
export function nextShipmentDateOf(shipments, anchor) {
  if (!anchor) return "";
  const later = (shipments || [])
    .filter((sh) => ymd(sh.date) > ymd(anchor.date))
    .map((sh) => ymd(sh.date))
    .sort();
  return later[0] || "";
}

/** The window's end: the shipment's expiry + grace. No expiry (or an open
    window) = no end — closing it at a guessed date would quietly delete real
    movements. */
export function windowUntil(anchor, { graceDays = 0, openWindow = false } = {}) {
  if (!anchor || openWindow) return "";
  const base = ymd(anchor.expiryDate);
  if (!base) return "";
  return addDays(base, Number(graceDays) || 0) || "";
}

/** Every downstream family split against the shipment. */
export function splitAll(scoped, anchor, { until, nextShipmentDate, strict = false }) {
  if (!scoped || !anchor) return null;
  const opts = { until, nextShipmentDate, strict };
  return {
    receiving: splitByShipment(scoped.receiving, anchor, { ...opts, datesOf: datesOfReceiving }),
    batches: splitByShipment(scoped.batches, anchor, { ...opts, datesOf: datesOfBatch }),
    dispatch: splitByShipment(scoped.dispatch, anchor, { ...opts, datesOf: datesOfDispatch }),
    conditions: splitByShipment(scoped.conditions, anchor, { ...opts, datesOf: datesOfCondition }),
    returns: splitByShipment(scoped.returns, anchor, { ...opts, datesOf: datesOfReturn }),
  };
}

/** Where it went: our branches one by one, customers as ONE group. */
export function distributionOf(split) {
  if (!split) return null;
  const byId = new Map(OUR_BRANCHES.map((b) => [b.id, { ...b, qty: 0, lines: 0, lastDate: "", rows: [] }]));
  const customers = { qty: 0, lines: 0, names: new Set(), lastDate: "" };

  split.dispatch.kept.forEach((d) => {
    const br = resolveOurBranch(d.customer);
    if (!br) {
      customers.qty += d.qty || 0;
      customers.lines += 1;
      if (d.customer) customers.names.add(d.customer);
      if (ymd(d.date) > customers.lastDate) customers.lastDate = ymd(d.date);
      return;
    }
    const b = byId.get(br.id);
    b.qty += d.qty || 0;
    b.lines += 1;
    b.rows.push(d);
    if (ymd(d.date) > b.lastDate) b.lastDate = ymd(d.date);
  });

  const branches = Array.from(byId.values()).filter((b) => b.lines > 0).sort((a, b) => b.qty - a.qty);
  return {
    branches,
    customers: { ...customers, names: customers.names.size },
    ourQty: branches.reduce((a, b) => a + b.qty, 0),
    unit: split.dispatch.kept[0]?.unit || "KG",
  };
}

/** What each branch's own receiving log says. */
export function receivedByBranchOf(split) {
  if (!split) return [];
  const map = new Map();
  split.receiving.kept.forEach((r) => {
    const id = r.branch || "—";
    const cur = map.get(id) || { id, qty: 0, lines: 0, lastDate: "", proven: 0, rows: [] };
    cur.qty += r.amount || 0;
    cur.lines += 1;
    cur.rows.push(r);
    if (r.verdict === "lot" || r.verdict === "near") cur.proven += 1;
    if (ymd(r.date) > cur.lastDate) cur.lastDate = ymd(r.date);
    map.set(id, cur);
  });
  return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
}

/** Returns inside the window, and the ones that predate the shipment. */
export function returnsOf(split) {
  if (!split) return null;
  const kept = [...split.returns.kept].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const qty = kept.reduce((a, r) => a + (r.qty || 0), 0);
  const proven = kept.filter((r) => r.verdict === "lot" || r.verdict === "near");
  return {
    rows: kept,
    qty,
    provenQty: proven.reduce((a, r) => a + (r.qty || 0), 0),
    provenCount: proven.length,
    customerCount: kept.filter(isCustomerReturn).length,
    before: split.returns.before,
    beforeQty: split.returns.before.reduce((a, r) => a + (r.qty || 0), 0),
    other: split.returns.other,
    after: split.returns.after,
  };
}
