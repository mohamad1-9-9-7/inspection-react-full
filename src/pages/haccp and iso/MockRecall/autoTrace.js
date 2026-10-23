// src/pages/haccp and iso/MockRecall/autoTrace.js
//
// 🧬 Automatic trace for a Mock Recall drill.
//
// Reads the same records as the Product Traceability screen (productTraceApi)
// and applies the same shipment rules (traceability/shipmentTrace), then turns
// one shipment into what the drill form needs: the product block, the backward
// trace (the supplier side), the forward trace (each of our branches + the
// outside customers as one line), the traced quantity and the gaps found.
//
// The form stays editable — this only fills it, the QA officer still checks
// and signs.

import { traceArrivals, traceDownstream, mergeTrace } from "../../traceability/productTraceApi";
import {
  ymd, nextShipmentDateOf, windowUntil, splitAll, distributionOf, receivedByBranchOf, returnsOf,
} from "../../traceability/shipmentTrace";
import { fetchLabelJobs, summarizeLabelJobs } from "../../labels/labelLog";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const dmy = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(String(iso || "")) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

/** Read everything for one product code: arrivals first, then downstream. */
export async function readProductTrace({ code, name, from, to, signal, onProgress }) {
  const who = { code, name, from, to, signal };
  const arrivals = await traceArrivals({ ...who, onProgress: (d, t) => onProgress?.("arrivals", d, t) });
  const downstream = await traceDownstream({ ...who, onProgress: (d, t) => onProgress?.("downstream", d, t) });
  const full = mergeTrace(arrivals, downstream);
  // the labels printed for this code (/inventory/labels) — which lots and sites were labelled
  try {
    full.labels = await fetchLabelJobs({ code, from, to, signal });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    full.labels = [];
    full.failed = [...(full.failed || []), "label_print_log"];
  }
  full.shipments.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return full;
}

/** One shipment followed to the end of its window. */
export function traceShipment(full, shipmentId, { graceDays = 0 } = {}) {
  const anchor = (full?.shipments || []).find((sh) => String(sh.id) === String(shipmentId));
  if (!anchor) return null;
  const until = windowUntil(anchor, { graceDays });
  const split = splitAll(full, anchor, { until, nextShipmentDate: nextShipmentDateOf(full.shipments, anchor) });
  const distribution = distributionOf(split);
  const received = receivedByBranchOf(split);
  const returns = returnsOf(split);
  const inKg = r2(anchor.weight);
  const sentOur = r2(distribution.ourQty);
  const sentCustomers = r2(distribution.customers.qty);
  const sent = r2(sentOur + sentCustomers);
  const loggedByBranch = new Map(received.map((b) => [b.id, b.qty]));
  const branches = distribution.branches.map((b) => {
    const logged = r2(loggedByBranch.get(b.id) || 0);
    return { id: b.id, label: b.label, qty: r2(b.qty), lines: b.lines, lastDate: b.lastDate, logged, diff: r2(b.qty - logged) };
  });
  return {
    anchor,
    until,
    inKg,
    sentOur,
    sentCustomers,
    customers: distribution.customers,
    unit: distribution.unit,
    sent,
    branches,
    received,
    returnsQty: r2(returns.qty),
    returnsCount: returns.rows.length,
    returnsBefore: returns.before.length,
    unaccounted: r2(inKg - sent),
    pct: inKg > 0 ? Math.min(100, (sent / inKg) * 100) : null,
    labels: summarizeLabelJobs(full.labels, { from: ymd(anchor.date), until }),
    failed: full.failed || [],
  };
}

/** The drill form, filled from one traced shipment. `prev` = the current form. */
export function drillFill(prev, res, { code, name, endTime }) {
  const a = res.anchor;
  const unit = String(res.unit || "KG").toLowerCase() === "kg" ? "kg" : "units";
  const productName = name || a.matchedName || code;

  const forward = res.branches.map((b) => ({
    customer: `${b.label}${b.label !== b.id ? ` (${b.id})` : ""}`,
    dateDispatched: ymd(b.lastDate),
    qtyShipped: String(b.qty),
    qtyUnit: unit,
    vehicle: "",
    driver: "",
    // the branch's own receiving log accounts for (almost) all of it
    podConfirmed: b.qty > 0 && b.logged >= b.qty * 0.98,
  }));
  if (res.customers.lines > 0) {
    forward.push({
      customer: `External customers (${res.customers.names})`,
      dateDispatched: ymd(res.customers.lastDate),
      qtyShipped: String(r2(res.customers.qty)),
      qtyUnit: unit,
      vehicle: "",
      driver: "",
      podConfirmed: false,
    });
  }

  const gaps = [];
  if (res.unaccounted > 0) gaps.push(`${res.unaccounted} kg of ${res.inKg} kg not found in any dispatch (stock still on hand, waste, or not recorded).`);
  if (res.unaccounted < 0) gaps.push(`Dispatched ${-res.unaccounted} kg MORE than the shipment brought in — another lot is mixed into this window.`);
  res.branches.forEach((b) => {
    if (Math.abs(b.diff) >= 0.5) gaps.push(`${b.label}: sent ${b.qty} kg, its receiving log shows ${b.logged} kg (difference ${b.diff} kg).`);
  });
  if (res.returnsBefore > 0) gaps.push(`${res.returnsBefore} return(s) dated before the shipment was received.`);
  if (res.failed.length) gaps.push(`Could not read: ${res.failed.join(", ")} — the trace may be incomplete.`);

  return {
    ...prev,
    product: {
      ...prev.product,
      name: code ? `${productName} [${code}]` : productName,
      batch: a.refNo || a.invoiceNo || (a.expiryDate ? `EXP ${dmy(a.expiryDate)}` : prev.product.batch),
      productionDate: ymd(a.prodDate) || prev.product.productionDate,
      expiryDate: ymd(a.expiryDate) || prev.product.expiryDate,
      qtyProduced: String(res.inKg || prev.product.qtyProduced || ""),
      qtyUnit: "kg",
      temp: a.temperature || prev.product.temp,
      branch: "Al Qusais (QCS)",
    },
    backwardTrace: [{
      material: productName,
      supplier: a.supplier || "",
      supplierLot: a.invoiceNo || "",
      dateReceived: ymd(a.date),
      qtyUsed: String(res.inKg || ""),
      qtyUnit: "kg",
      grnRef: a.refNo || a.invoiceNo || "",
    }],
    forwardTrace: forward.length ? forward : prev.forwardTrace,
    timing: { ...prev.timing, endTime: endTime || prev.timing.endTime },
    results: {
      ...prev.results,
      qtyTraced: String(res.sent),
      gaps: gaps.join("\n") || prev.results.gaps,
    },
    linked: {
      ...prev.linked,
      // compact and self-contained: the drill stays readable if the sources change later
      autoTrace: {
        code,
        product: productName,
        shipmentId: a.id,
        shipmentDate: ymd(a.date),
        invoiceNo: a.invoiceNo || "",
        supplier: a.supplier || "",
        windowUntil: res.until || "",
        inKg: res.inKg,
        sentOur: res.sentOur,
        sentCustomers: res.sentCustomers,
        returnsQty: res.returnsQty,
        unaccounted: res.unaccounted,
        branches: res.branches.map(({ id, qty, logged }) => ({ id, qty, logged })),
        labels: res.labels ? { count: res.labels.count, copies: res.labels.copies, lots: res.labels.lots, sites: res.labels.sites } : null,
        tracedAt: new Date().toISOString(),
      },
    },
  };
}
