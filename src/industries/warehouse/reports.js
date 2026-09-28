// src/industries/warehouse/reports.js
// Input reports only a STORAGE / DISTRIBUTION WAREHOUSE keeps (on top of the
// shared ones in _kit/commonReports.js). Every type is `warehouse_*`.
//
// Limits: dry store ≤ 25 °C and ≤ 60 % RH; chilled load ≤ 5 °C, frozen load
// ≤ −18 °C; expiry order FEFO (first expiry, first out).

import {
  num, daysBetween, warn, fail, firstIssue, withAction, failOnNo, sheet,
  YES_NO, YES_NO_NA, PASS_FAIL, UNITS,
} from "../_kit/schemaKit";

const NS = "warehouse";

const storageConditions = sheet(NS, "storage_conditions", {
  group: "operations",
  icon: "🌡️",
  label: "Dry Store Temperature & Humidity",
  desc: "Ambient zones ≤ 25 °C and ≤ 60 % RH",
  title: "Dry Store Temperature & Humidity Log",
  tables: [{
    key: "rows",
    title: "Zones (≤ 25 °C · ≤ 60 % RH)",
    defaultRows: 4,
    carry: ["zone"],
    columns: [
      { key: "zone", label: "Zone / Aisle", width: 140 },
      { key: "amT", label: "°C Morning", type: "number", width: 85 },
      { key: "amH", label: "RH % Morning", type: "number", width: 90 },
      { key: "pmT", label: "°C Evening", type: "number", width: 85 },
      { key: "pmH", label: "RH % Evening", type: "number", width: 90 },
      { key: "sunlight", label: "No Direct Sun / Leaks", type: "select", options: YES_NO, width: 110 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      [["amT", "Morning"], ["pmT", "Evening"]].forEach(([k, w]) => { const t = num(r[k]); if (t !== null && t > 25) issues.push(fail(`${w} ${t}°C (> 25)`)); });
      [["amH", "Morning"], ["pmH", "Evening"]].forEach(([k, w]) => { const h = num(r[k]); if (h !== null && h > 60) issues.push(fail(`${w} RH ${h}% (> 60)`)); });
      issues.push(...failOnNo(r, [["sunlight", "Sunlight / leak in store"]]));
      if (["amT", "pmT"].every((k) => num(r[k]) === null)) issues.push(warn("No readings"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const dispatch = sheet(NS, "dispatch", {
  group: "operations",
  icon: "🚚",
  label: "Loading & Dispatch",
  desc: "Vehicle pre-cooling, cleanliness, product temperature and seal",
  title: "Loading & Dispatch Vehicle Check",
  tables: [{
    key: "rows",
    title: "Vehicles loaded (chilled ≤ 5 °C · frozen ≤ −18 °C)",
    defaultRows: 4,
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "vehicle", label: "Vehicle No.", width: 110 },
      { key: "driver", label: "Driver", width: 130 },
      { key: "load", label: "Load Type", type: "select", options: ["Dry", "Chilled", "Frozen"], width: 95 },
      { key: "boxTemp", label: "Box Pre-cool °C", type: "number", width: 100 },
      { key: "productTemp", label: "Product °C", type: "number", width: 90 },
      { key: "clean", label: "Vehicle Clean", type: "select", options: YES_NO, width: 90 },
      { key: "sealNo", label: "Seal No.", width: 110 },
      { key: "destination", label: "Destination", width: 150 },
    ],
    check(r) {
      const issues = [];
      const max = r.load === "Frozen" ? -18 : r.load === "Chilled" ? 5 : null;
      if (max !== null) {
        const b = num(r.boxTemp);
        const p = num(r.productTemp);
        if (b !== null && b > max) issues.push(fail(`Box ${b}°C (> ${max})`));
        if (p !== null && p > max) issues.push(fail(`Product ${p}°C (> ${max})`));
        if (p === null) issues.push(warn("Product temp missing"));
      }
      issues.push(...failOnNo(r, [["clean", "Vehicle not clean"]]));
      if (!r.sealNo && r.load !== "Dry") issues.push(warn("Seal no. missing"));
      return firstIssue(issues);
    },
  }],
});

const fefo = sheet(NS, "fefo", {
  group: "operations",
  icon: "🔄",
  label: "Stock Rotation (FEFO)",
  desc: "Expiry order, damage and short-dated stock by location",
  title: "Stock Rotation (FEFO) Check",
  tables: [{
    key: "rows",
    title: "Locations checked (short-dated = 30 days or less)",
    defaultRows: 6,
    columns: [
      { key: "location", label: "Location (aisle / rack / level)", width: 150 },
      { key: "product", label: "Product", width: 170 },
      { key: "batch", label: "Batch / Lot No.", width: 110 },
      { key: "expDate", label: "Expiry Date", type: "date", width: 130 },
      { key: "qty", label: "Qty", type: "number", width: 70 },
      { key: "unit", label: "Unit", type: "select", options: UNITS, width: 85 },
      { key: "fefo", label: "FEFO Followed", type: "select", options: YES_NO, width: 90 },
      { key: "damaged", label: "Damaged Packs", type: "select", options: ["None", "Found"], width: 95 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r, h) {
      const issues = [];
      const left = daysBetween(h.reportDate, r.expDate);
      if (left !== null && left < 0) issues.push(fail(`Expired ${-left} day(s) ago`));
      else if (left !== null && left <= 30) issues.push(warn(`Short-dated: ${left} day(s) left`));
      issues.push(...failOnNo(r, [["fefo", "FEFO not followed"]]));
      if (r.damaged === "Found") issues.push(fail("Damaged packs"));
      if (left === null) issues.push(warn("Expiry missing"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const racking = sheet(NS, "racking", {
  group: "safety",
  icon: "🏗️",
  label: "Pallet & Racking Inspection",
  desc: "Rack damage, overloading, labels and pallet condition",
  title: "Pallet & Racking Inspection",
  tables: [{
    key: "rows",
    title: "Racks inspected",
    defaultRows: 5,
    carry: ["rack"],
    columns: [
      { key: "rack", label: "Rack / Bay", width: 120 },
      { key: "uprights", label: "Uprights & Beams Undamaged", type: "select", options: YES_NO, width: 130 },
      { key: "load", label: "Within Load Limit", type: "select", options: YES_NO, width: 100 },
      { key: "labels", label: "Location Labels OK", type: "select", options: YES_NO, width: 100 },
      { key: "pallets", label: "Pallets Sound & Clean", type: "select", options: YES_NO, width: 110 },
      { key: "offFloor", label: "Stock Off Floor / Off Wall", type: "select", options: YES_NO, width: 120 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = failOnNo(r, [
        ["uprights", "Rack damaged"], ["load", "Overloaded"], ["pallets", "Broken / dirty pallets"], ["offFloor", "Stock on floor / against wall"],
      ]);
      if (r.labels === "No") issues.push(warn("Labels missing"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const forklift = sheet(NS, "forklift", {
  group: "safety",
  icon: "🚜",
  label: "Forklift / MHE Daily Check",
  desc: "Pre-use check of forklifts and pallet jacks",
  title: "Forklift & MHE Pre-use Check",
  tables: [{
    key: "rows",
    title: "Equipment",
    defaultRows: 3,
    carry: ["equipment"],
    columns: [
      { key: "equipment", label: "Equipment ID", width: 120 },
      { key: "operator", label: "Operator", width: 130 },
      { key: "brakes", label: "Brakes", type: "select", options: PASS_FAIL, width: 80 },
      { key: "horn", label: "Horn & Lights", type: "select", options: PASS_FAIL, width: 90 },
      { key: "forks", label: "Forks & Chains", type: "select", options: PASS_FAIL, width: 90 },
      { key: "leaks", label: "No Oil / Gas Leaks", type: "select", options: PASS_FAIL, width: 100 },
      { key: "battery", label: "Battery / Fuel", type: "select", options: PASS_FAIL, width: 90 },
      { key: "result", label: "Fit for Use", type: "select", options: YES_NO, width: 90 },
    ],
    check(r) {
      const failed = ["brakes", "horn", "forks", "leaks", "battery"].filter((k) => r[k] === "Fail");
      if (failed.length && r.result === "Yes") return fail(`${failed.length} item(s) failed — but used`);
      if (failed.length) return warn(`${failed.length} item(s) failed — taken out of use`);
      if (r.result === "No") return warn("Not fit for use");
      return firstIssue(r.result ? [] : [warn("Result missing")]);
    },
  }],
});

const quarantine = sheet(NS, "quarantine", {
  group: "quality",
  icon: "🔒",
  label: "Quarantine & Returns",
  desc: "Held, returned and rejected stock until a decision",
  title: "Quarantine & Returns Register",
  tables: [{
    key: "rows",
    title: "Stock on hold",
    defaultRows: 3,
    openItems: {
      days: 14,
      isOpen: (r) => r.status === "On Hold",
      label: (r) => `${r.product || "Product"}${r.batch ? ` · ${r.batch}` : ""} — on hold`,
    },
    columns: [
      { key: "product", label: "Product", width: 170 },
      { key: "batch", label: "Batch / Lot No.", width: 120 },
      { key: "qty", label: "Qty", type: "number", width: 70 },
      { key: "unit", label: "Unit", type: "select", options: UNITS, width: 85 },
      { key: "source", label: "Source", type: "select", options: ["Customer return", "Receiving reject", "Damaged in store", "Temperature abuse", "Recall"], width: 150 },
      { key: "location", label: "Quarantine Location", width: 130 },
      { key: "tagged", label: "Tagged HOLD", type: "select", options: YES_NO, width: 90 },
      { key: "status", label: "Status", type: "select", options: ["On Hold", "Released", "Returned to supplier", "Destroyed"], width: 150 },
      { key: "decisionBy", label: "Decision By", width: 120 },
    ],
    check(r) {
      const issues = failOnNo(r, [["tagged", "Not tagged HOLD"]]);
      if (r.status === "On Hold") issues.push(warn("Awaiting decision"));
      if (r.status && r.status !== "On Hold" && !r.decisionBy) issues.push(warn("Decision not signed"));
      if (!r.status) issues.push(warn("Status missing"));
      return firstIssue(issues);
    },
  }],
});

const coldRoom = sheet(NS, "cold_room", {
  group: "operations",
  icon: "🧊",
  label: "Cold Room Inspection",
  desc: "Doors, curtains, ice build-up and stacking",
  title: "Cold Room & Freezer Room Inspection",
  tables: [{
    key: "rows",
    title: "Rooms",
    defaultRows: 3,
    carry: ["room"],
    columns: [
      { key: "room", label: "Room", width: 130 },
      { key: "doors", label: "Doors Close & Seal", type: "select", options: YES_NO, width: 100 },
      { key: "curtain", label: "Strip Curtain OK", type: "select", options: YES_NO_NA, width: 100 },
      { key: "ice", label: "No Ice Build-up", type: "select", options: YES_NO, width: 100 },
      { key: "airflow", label: "Airflow Not Blocked", type: "select", options: YES_NO, width: 110 },
      { key: "alarm", label: "Alarm Tested", type: "select", options: YES_NO_NA, width: 95 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = failOnNo(r, [["doors", "Door not sealing"], ["ice", "Ice build-up"], ["airflow", "Airflow blocked"]]);
      if (r.curtain === "No") issues.push(warn("Strip curtain damaged"));
      if (r.alarm === "No") issues.push(warn("Alarm not tested"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

export const WAREHOUSE_REPORTS = [storageConditions, coldRoom, dispatch, fefo, quarantine, racking, forklift];
