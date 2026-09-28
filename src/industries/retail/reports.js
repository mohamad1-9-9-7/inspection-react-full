// src/industries/retail/reports.js
// Input reports only a SUPERMARKET / food retailer keeps (on top of the shared
// ones in _kit/commonReports.js). Every type is `retail_*`.
//
// Limits: hot counter ≥ 60 °C, cold counter ≤ 5 °C; nothing on the shelf past
// its expiry date; near-expiry = 3 days or less.

import {
  num, daysBetween, warn, fail, firstIssue, withAction, failOnNo, sheet,
  YES_NO, YES_NO_NA, OPEN_CLOSED, UNITS,
} from "../_kit/schemaKit";

const NS = "retail";
const SECTIONS = ["Grocery", "Dairy & chilled", "Frozen", "Butchery", "Fish", "Bakery", "Deli & hot food", "Fruits & vegetables", "Beverages"];

const dateCheck = sheet(NS, "date_check", {
  group: "operations",
  icon: "📆",
  label: "Expiry & Near-Expiry Check",
  desc: "Shelf walk for expired and short-dated products",
  title: "Expiry & Near-Expiry Shelf Check",
  tables: [{
    key: "rows",
    title: "Products found (expired = remove · ≤ 3 days = near expiry)",
    defaultRows: 6,
    columns: [
      { key: "section", label: "Section", options: SECTIONS, width: 140 },
      { key: "product", label: "Product", width: 180 },
      { key: "barcode", label: "Barcode", width: 120 },
      { key: "batch", label: "Batch / Lot No.", width: 110 },
      { key: "expDate", label: "Expiry Date", type: "date", width: 130 },
      { key: "qty", label: "Qty", type: "number", width: 70 },
      { key: "action", label: "Action", type: "select", options: ["Removed from shelf", "Marked down", "Returned to supplier", "Moved to front (FEFO)", "None"], width: 170 },
    ],
    check(r, h) {
      const left = daysBetween(h.reportDate, r.expDate);
      if (left === null) return warn("Expiry date missing");
      if (left < 0) return r.action === "Removed from shelf" || r.action === "Returned to supplier"
        ? warn(`Expired ${-left} day(s) ago — removed`)
        : fail(`Expired ${-left} day(s) ago — still on shelf`);
      if (left <= 3) return r.action && r.action !== "None" ? warn(`${left} day(s) left — ${r.action.toLowerCase()}`) : warn(`${left} day(s) left`);
      return { level: "ok", text: `${left} day(s) left` };
    },
  }],
});

const labelCheck = sheet(NS, "label_check", {
  group: "operations",
  icon: "🏷️",
  label: "Product Label Check",
  desc: "Arabic label, dates, origin, allergens and price",
  title: "Product Labelling Compliance Check",
  tables: [{
    key: "rows",
    title: "Products checked",
    defaultRows: 5,
    columns: [
      { key: "section", label: "Section", options: SECTIONS, width: 140 },
      { key: "product", label: "Product", width: 180 },
      { key: "arabic", label: "Arabic Label", type: "select", options: YES_NO, width: 90 },
      { key: "dates", label: "Production & Expiry Dates", type: "select", options: YES_NO, width: 110 },
      { key: "origin", label: "Country of Origin", type: "select", options: YES_NO, width: 100 },
      { key: "allergens", label: "Ingredients & Allergens", type: "select", options: YES_NO_NA, width: 110 },
      { key: "storage", label: "Storage Instructions", type: "select", options: YES_NO_NA, width: 100 },
      { key: "price", label: "Shelf Price Matches", type: "select", options: YES_NO, width: 100 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = failOnNo(r, [
        ["arabic", "No Arabic label"], ["dates", "Dates missing"], ["origin", "Origin missing"],
        ["allergens", "Allergens not declared"], ["storage", "Storage instructions missing"],
      ]);
      if (r.price === "No") issues.push(warn("Shelf price mismatch"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const freshProduce = sheet(NS, "fresh_produce", {
  group: "operations",
  icon: "🥬",
  label: "Fresh Produce Quality",
  desc: "Condition of fruits and vegetables on display",
  title: "Fresh Produce Quality Check",
  tables: [{
    key: "rows",
    title: "Items checked",
    defaultRows: 6,
    carry: ["item"],
    columns: [
      { key: "item", label: "Item", width: 160 },
      { key: "supplier", label: "Supplier", width: 140 },
      { key: "condition", label: "Condition", type: "select", options: ["Good", "Fair", "Poor"], width: 95 },
      { key: "defects", label: "Rotten / Damaged %", type: "number", width: 100, hint: "≤ 5" },
      { key: "misting", label: "Display Clean / Misting OK", type: "select", options: YES_NO_NA, width: 120 },
      { key: "action", label: "Action", type: "select", options: ["None", "Sorted & culled", "Removed", "Returned to supplier"], width: 150 },
    ],
    check(r) {
      const issues = [];
      const d = num(r.defects);
      if (d !== null && d > 5) issues.push(fail(`${d}% rotten / damaged (> 5)`));
      if (r.condition === "Poor") issues.push(fail("Poor condition"));
      if (r.condition === "Fair") issues.push(warn("Fair condition"));
      if (r.misting === "No") issues.push(warn("Display not clean"));
      const worst = firstIssue(issues);
      return worst.level === "fail" && r.action && r.action !== "None" ? warn(`${worst.text} — ${r.action.toLowerCase()}`) : worst;
    },
  }],
});

const deliCounter = sheet(NS, "deli_counter", {
  group: "operations",
  icon: "🥪",
  label: "Deli & Hot Food Counter",
  desc: "Hot ≥ 60 °C and cold ≤ 5 °C counter readings",
  title: "Deli & Hot Food Counter Temperature Log",
  tables: [{
    key: "rows",
    title: "Counter items",
    defaultRows: 5,
    carry: ["item", "counter"],
    columns: [
      { key: "item", label: "Item", width: 170 },
      { key: "counter", label: "Counter", type: "select", options: ["Hot (≥ 60 °C)", "Cold (≤ 5 °C)"], width: 130 },
      { key: "am", label: "°C Morning", type: "number", width: 85 },
      { key: "noon", label: "°C Noon", type: "number", width: 85 },
      { key: "pm", label: "°C Evening", type: "number", width: 85 },
      { key: "covered", label: "Covered / Sneeze Guard", type: "select", options: YES_NO, width: 110 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      const hot = /Hot/.test(r.counter || "");
      ["am", "noon", "pm"].forEach((k, i) => {
        const t = num(r[k]);
        if (t === null) return;
        const when = ["Morning", "Noon", "Evening"][i];
        if (hot && t < 60) issues.push(fail(`${when} ${t}°C (< 60)`));
        if (!hot && r.counter && t > 5) issues.push(fail(`${when} ${t}°C (> 5)`));
      });
      if (!r.counter) issues.push(warn("Counter type missing"));
      issues.push(...failOnNo(r, [["covered", "Food not protected"]]));
      if (["am", "noon", "pm"].every((k) => num(r[k]) === null)) issues.push(warn("No readings"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const recall = sheet(NS, "recall", {
  group: "quality",
  icon: "🚨",
  label: "Product Withdrawal & Recall",
  desc: "Products pulled from sale and who was informed",
  title: "Product Withdrawal & Recall Register",
  tables: [{
    key: "rows",
    title: "Withdrawals",
    defaultRows: 2,
    openItems: {
      days: 14,
      isOpen: (r) => r.status && r.status !== "Closed",
      label: (r) => `${r.product || "Product"}${r.batch ? ` · ${r.batch}` : ""} — ${r.status}`,
    },
    columns: [
      { key: "product", label: "Product", width: 170 },
      { key: "batch", label: "Batch / Lot No.", width: 120 },
      { key: "reason", label: "Reason", type: "select", options: ["Supplier recall", "Authority recall", "Quality defect", "Foreign body", "Undeclared allergen", "Labelling error"], width: 160 },
      { key: "qty", label: "Qty Removed", type: "number", width: 90 },
      { key: "unit", label: "Unit", type: "select", options: UNITS, width: 85 },
      { key: "supplier", label: "Supplier Informed", type: "select", options: YES_NO, width: 100 },
      { key: "authority", label: "Authority Notified", type: "select", options: YES_NO_NA, width: 100 },
      { key: "status", label: "Status", type: "select", options: OPEN_CLOSED, width: 110 },
    ],
    check(r) {
      const issues = failOnNo(r, [["supplier", "Supplier not informed"]]);
      if (r.authority === "No" && /Authority|allergen|Foreign/.test(r.reason || "")) issues.push(fail("Authority not notified"));
      if (r.status !== "Closed") issues.push(warn(r.status || "Status missing"));
      return firstIssue(issues);
    },
  }],
});

const complaints = sheet(NS, "customer_complaints", {
  group: "quality",
  icon: "📣",
  label: "Customer Complaints",
  desc: "Complaints, investigation and response",
  title: "Customer Complaints Log",
  tables: [{
    key: "rows",
    title: "Complaints",
    defaultRows: 2,
    openItems: {
      days: 14,
      isOpen: (r) => r.status && r.status !== "Closed",
      label: (r) => `${r.customer || "Customer"} — ${r.product || r.complaint || "complaint"}`,
    },
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "customer", label: "Customer", width: 140 },
      { key: "phone", label: "Phone", width: 110 },
      { key: "product", label: "Product", width: 150 },
      { key: "batch", label: "Batch / Lot No.", width: 110 },
      { key: "complaint", label: "Complaint", type: "select", options: ["Expired product", "Spoiled / off smell", "Foreign body", "Illness reported", "Labelling", "Price", "Service"], width: 150 },
      { key: "action", label: "Action / Response", width: 190 },
      { key: "status", label: "Status", type: "select", options: OPEN_CLOSED, width: 110 },
    ],
    check(r) {
      const issues = [];
      if (/Foreign|Illness/.test(r.complaint || "") && r.status !== "Closed") issues.push(fail(`${r.complaint} — still open`));
      if (!r.action) issues.push(warn("No response recorded"));
      if (r.status !== "Closed") issues.push(warn(r.status || "Status missing"));
      return firstIssue(issues);
    },
  }],
});

export const RETAIL_REPORTS = [dateCheck, labelCheck, freshProduce, deliCounter, recall, complaints];
