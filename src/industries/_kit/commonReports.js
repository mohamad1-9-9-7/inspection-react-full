// src/industries/_kit/commonReports.js
// The input reports EVERY kit industry shares (restaurant, supermarket,
// warehouse, manufacturing). Each industry gets its OWN copy of each type —
// commonReports("retail") stores `retail_personal_hygiene`, never a slug that
// another industry also writes — so "shared" means shared design, not shared
// data.
//
// `group` places a report under a heading in the company-app sidebar
// (see GROUPS in buildTemplate.js).

import {
  num, warn, fail, firstIssue, withAction, failOnNo, sheet,
  YES_NO, YES_NO_NA, PASS_FAIL, OPEN_CLOSED, UNITS,
} from "./schemaKit";

/* ───────── 1. Personal hygiene ───────── */
const personalHygiene = (ns) => sheet(ns, "personal_hygiene", {
  group: "hygiene",
  icon: "🧼",
  label: "Personal Hygiene",
  desc: "Staff hygiene & fitness check before the shift",
  title: "Personal Hygiene Checklist",
  tables: [{
    key: "rows",
    title: "Staff checked",
    defaultRows: 6,
    carry: ["name", "empNo", "position"],
    columns: [
      { key: "name", label: "Employee Name", width: 160 },
      { key: "empNo", label: "Employee No.", width: 100 },
      { key: "position", label: "Position", width: 120 },
      { key: "uniform", label: "Clean Uniform", type: "select", options: YES_NO, width: 90 },
      { key: "hair", label: "Hair / Beard Covered", type: "select", options: YES_NO_NA, width: 100 },
      { key: "nails", label: "Nails Short & Clean", type: "select", options: YES_NO, width: 100 },
      { key: "jewellery", label: "No Jewellery / Watch", type: "select", options: YES_NO, width: 100 },
      { key: "wounds", label: "Wounds Covered (blue plaster)", type: "select", options: YES_NO_NA, width: 120 },
      { key: "illness", label: "Illness Symptoms", type: "select", options: ["None", "Reported"], width: 100 },
      { key: "handwash", label: "Hand Washing Correct", type: "select", options: YES_NO, width: 100 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = failOnNo(r, [
        ["uniform", "Uniform not clean"], ["hair", "Hair not covered"], ["nails", "Nails not OK"],
        ["jewellery", "Jewellery worn"], ["wounds", "Wound not covered"], ["handwash", "Hand washing not correct"],
      ]);
      if (r.illness === "Reported") issues.push(fail("Illness symptoms — not fit to handle food"));
      if (!r.name) issues.push(warn("Name missing"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

/* ───────── 2. Cleaning & sanitation ───────── */
const cleaning = (ns) => sheet(ns, "cleaning", {
  group: "hygiene",
  icon: "🧽",
  label: "Cleaning & Sanitation",
  desc: "Cleaning schedule, chemical and visual result",
  title: "Cleaning & Sanitation Record",
  tables: [{
    key: "rows",
    title: "Areas & equipment cleaned",
    defaultRows: 6,
    carry: ["area", "task", "chemical"],
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "area", label: "Area / Equipment", width: 170 },
      { key: "task", label: "Task", width: 160 },
      { key: "chemical", label: "Chemical Used", width: 140 },
      { key: "dilution", label: "Dilution / ppm", width: 100 },
      { key: "doneBy", label: "Done By", width: 120 },
      { key: "visual", label: "Visual Check", type: "select", options: PASS_FAIL, width: 95 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      if (r.visual === "Fail") issues.push(fail("Visual check failed"));
      if (!r.visual) issues.push(warn("Visual check missing"));
      if (!r.chemical) issues.push(warn("Chemical not recorded"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

/* ───────── 3. Chiller / freezer temperatures ───────── */
const UNIT_TYPES = ["Chiller (≤ 5 °C)", "Freezer (≤ −18 °C)", "Display chiller (≤ 5 °C)", "Display freezer (≤ −18 °C)"];
const limitOf = (type) => (/Freezer|freezer/.test(type || "") ? { max: -18, name: "−18" } : { max: 5, name: "5" });
const temperatures = (ns) => sheet(ns, "temperature", {
  group: "storage",
  icon: "🌡️",
  label: "Chiller & Freezer Temperatures",
  desc: "Morning / noon / evening readings of every cold unit",
  title: "Chiller & Freezer Temperature Log",
  tables: [{
    key: "rows",
    title: "Cold units (chilled ≤ 5 °C · frozen ≤ −18 °C)",
    defaultRows: 5,
    carry: ["unit", "unitType"],
    columns: [
      { key: "unit", label: "Unit Name / No.", width: 150 },
      { key: "unitType", label: "Unit Type", type: "select", options: UNIT_TYPES, width: 160 },
      { key: "am", label: "°C Morning", type: "number", width: 85 },
      { key: "noon", label: "°C Noon", type: "number", width: 85 },
      { key: "pm", label: "°C Evening", type: "number", width: 85 },
      { key: "door", label: "Door Seal / Defrost OK", type: "select", options: YES_NO, width: 110 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      const lim = limitOf(r.unitType);
      ["am", "noon", "pm"].forEach((k, i) => {
        const t = num(r[k]);
        if (t !== null && t > lim.max) issues.push(fail(`${["Morning", "Noon", "Evening"][i]} ${t}°C (> ${lim.name})`));
      });
      if (!r.unitType) issues.push(warn("Unit type missing"));
      if (r.door === "No") issues.push(fail("Door seal / defrost problem"));
      if (["am", "noon", "pm"].every((k) => num(r[k]) === null)) issues.push(warn("No readings"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

/* ───────── 4. Goods receiving ───────── */
const receiving = (ns) => sheet(ns, "receiving", {
  group: "storage",
  icon: "📥",
  label: "Goods Receiving",
  desc: "Supplier, batch, expiry, temperature and decision",
  title: "Goods Receiving Log",
  tables: [{
    key: "rows",
    title: "Deliveries",
    defaultRows: 5,
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "supplier", label: "Supplier", width: 150 },
      { key: "product", label: "Product", width: 160 },
      { key: "storage", label: "Storage", type: "select", options: ["Dry", "Chilled", "Frozen"], width: 95 },
      { key: "batch", label: "Batch / Lot No.", width: 120 },
      { key: "expDate", label: "Expiry Date", type: "date", width: 130, hint: "not expired" },
      { key: "qty", label: "Qty", type: "number", width: 75 },
      { key: "unit", label: "Unit", type: "select", options: UNITS, width: 85 },
      { key: "temp", label: "Temp °C", type: "number", width: 80, hint: "chilled ≤5 · frozen ≤−18" },
      { key: "vehicle", label: "Vehicle Clean", type: "select", options: YES_NO, width: 90 },
      { key: "packaging", label: "Packaging Intact", type: "select", options: YES_NO, width: 95 },
      { key: "label", label: "Label (Arabic / dates) OK", type: "select", options: YES_NO, width: 110 },
      { key: "decision", label: "Decision", type: "select", options: ["Accepted", "Rejected", "On Hold"], width: 110 },
      { key: "remarks", label: "Remarks", width: 160 },
    ],
    check(r, h) {
      const issues = [];
      const t = num(r.temp);
      if (r.storage === "Chilled" && t !== null && t > 5) issues.push(fail(`Chilled at ${t}°C (> 5)`));
      if (r.storage === "Frozen" && t !== null && t > -18) issues.push(fail(`Frozen at ${t}°C (> −18)`));
      if ((r.storage === "Chilled" || r.storage === "Frozen") && t === null) issues.push(warn("Temperature missing"));
      if (r.expDate && h.reportDate && r.expDate < h.reportDate) issues.push(fail("Expired on arrival"));
      issues.push(...failOnNo(r, [["vehicle", "Vehicle not clean"], ["packaging", "Damaged packaging"], ["label", "Label not compliant"]]));
      if (!r.batch) issues.push(warn("Batch no. missing"));
      if (!r.expDate) issues.push(warn("Expiry missing"));
      if (r.decision === "Rejected") return fail("Rejected");
      const worst = firstIssue(issues);
      if (worst.level === "fail" && r.decision === "Accepted") return fail(`${worst.text} — but accepted`);
      return worst;
    },
  }],
});

/* ───────── 5. Pest control check ───────── */
const pestControl = (ns) => sheet(ns, "pest_control", {
  group: "hygiene",
  icon: "🐜",
  label: "Pest Control Check",
  desc: "Bait / trap stations and signs of pest activity",
  title: "Pest Activity Check",
  tables: [{
    key: "rows",
    title: "Stations & areas checked",
    defaultRows: 6,
    carry: ["station", "area"],
    columns: [
      { key: "station", label: "Station No.", width: 90 },
      { key: "area", label: "Area", width: 150 },
      { key: "stationType", label: "Station Type", type: "select", options: ["Bait station", "Glue trap", "Insect-o-cutor", "Visual check"], width: 130 },
      { key: "intact", label: "Station Intact", type: "select", options: YES_NO_NA, width: 95 },
      { key: "activity", label: "Pest Activity", type: "select", options: ["None", "Found"], width: 95 },
      { key: "pest", label: "Pest Type", options: ["Rodent", "Cockroach", "Flies", "Ants", "Stored-product insects", "Birds"], width: 130 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      if (r.activity === "Found") issues.push(fail(`Pest activity${r.pest ? ` — ${r.pest}` : ""}`));
      if (r.intact === "No") issues.push(fail("Station damaged / missing"));
      if (!r.activity) issues.push(warn("Result missing"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

/* ───────── 6. Visitors & contractors ───────── */
const visitors = (ns) => sheet(ns, "visitors", {
  group: "people",
  icon: "🚶",
  label: "Visitors & Contractors",
  desc: "Who entered, health declaration and PPE",
  title: "Visitors & Contractors Log",
  tables: [{
    key: "rows",
    title: "Visitors",
    defaultRows: 4,
    columns: [
      { key: "timeIn", label: "Time In", type: "time", autoNow: true, width: 90 },
      { key: "name", label: "Name", width: 150 },
      { key: "company", label: "Company", width: 140 },
      { key: "purpose", label: "Purpose of Visit", width: 160 },
      { key: "health", label: "Health Declaration Signed", type: "select", options: YES_NO, width: 110 },
      { key: "ppe", label: "PPE Provided", type: "select", options: YES_NO, width: 90 },
      { key: "escort", label: "Escorted By", width: 120 },
      { key: "timeOut", label: "Time Out", type: "time", width: 90 },
    ],
    check(r) {
      const issues = failOnNo(r, [["health", "No health declaration"], ["ppe", "No PPE"]]);
      if (!r.timeOut) issues.push(warn("Time out missing"));
      return firstIssue(issues);
    },
  }],
});

/* ───────── 7. Staff fitness to work ───────── */
const staffHealth = (ns) => sheet(ns, "staff_health", {
  group: "people",
  icon: "🤒",
  label: "Staff Fitness to Work",
  desc: "Sickness reports, OHC validity and return to work",
  title: "Staff Sickness & Fitness to Work Record",
  tables: [{
    key: "rows",
    title: "Cases",
    defaultRows: 3,
    columns: [
      { key: "name", label: "Employee Name", width: 160 },
      { key: "empNo", label: "Employee No.", width: 100 },
      { key: "symptoms", label: "Symptoms", options: ["Diarrhoea", "Vomiting", "Fever", "Sore throat with fever", "Jaundice", "Skin infection", "Discharge from eye / ear / nose"], width: 170 },
      { key: "ohc", label: "OHC Valid", type: "select", options: YES_NO, width: 85 },
      { key: "decision", label: "Decision", type: "select", options: ["Fit to work", "Excluded from food handling", "Sent home", "Referred to doctor"], width: 170 },
      { key: "returnDate", label: "Return Date", type: "date", width: 130 },
      { key: "clearance", label: "Medical Clearance", type: "select", options: YES_NO_NA, width: 100 },
      { key: "remarks", label: "Remarks", width: 160 },
    ],
    check(r) {
      const issues = [];
      if (r.ohc === "No") issues.push(fail("OHC not valid"));
      if (r.symptoms && r.decision === "Fit to work") issues.push(fail("Symptoms reported but marked fit"));
      if (r.returnDate && r.clearance === "No") issues.push(warn("Returned without medical clearance"));
      if (!r.decision) issues.push(warn("Decision missing"));
      return firstIssue(issues);
    },
  }],
});

/* ───────── 8. Non-conformance & corrective action ───────── */
const nonConformance = (ns) => sheet(ns, "non_conformance", {
  group: "quality",
  icon: "⚠️",
  label: "Non-Conformance & CAPA",
  desc: "Non-conformities, root cause and corrective action",
  title: "Non-Conformance & Corrective Action Log",
  tables: [{
    key: "rows",
    title: "Non-conformities",
    defaultRows: 3,
    openItems: {
      days: 14,
      isOpen: (r) => r.status && r.status !== "Closed",
      label: (r) => [r.area, r.description].filter(Boolean).join(" — ") || "Open non-conformity",
    },
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "area", label: "Area", width: 130 },
      { key: "description", label: "Description", width: 220 },
      { key: "severity", label: "Severity", type: "select", options: ["Minor", "Major", "Critical"], width: 95 },
      { key: "rootCause", label: "Root Cause", width: 170 },
      { key: "action", label: "Corrective Action", width: 190 },
      { key: "responsible", label: "Responsible", width: 120 },
      { key: "due", label: "Target Date", type: "date", width: 130 },
      { key: "status", label: "Status", type: "select", options: OPEN_CLOSED, width: 110 },
    ],
    check(r, h) {
      const issues = [];
      if (r.severity === "Critical" && r.status !== "Closed") issues.push(fail("Critical — still open"));
      if (r.status !== "Closed" && r.due && h.reportDate && r.due < h.reportDate) issues.push(fail("Past target date"));
      if (!r.action) issues.push(warn("Corrective action missing"));
      if (!r.status || r.status !== "Closed") issues.push(warn(r.status || "Status missing"));
      return firstIssue(issues);
    },
  }],
});

/* ───────── 9. Waste & disposal ───────── */
const waste = (ns) => sheet(ns, "waste", {
  group: "quality",
  icon: "🗑️",
  label: "Waste & Disposal",
  desc: "Expired, damaged or rejected food taken out of use",
  title: "Waste & Disposal Record",
  tables: [{
    key: "rows",
    title: "Items disposed",
    defaultRows: 4,
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "product", label: "Product", width: 170 },
      { key: "batch", label: "Batch / Lot No.", width: 120 },
      { key: "reason", label: "Reason", type: "select", options: ["Expired", "Damaged", "Temperature abuse", "Quality defect", "Customer return", "Recall"], width: 140 },
      { key: "qty", label: "Qty", type: "number", width: 75 },
      { key: "unit", label: "Unit", type: "select", options: UNITS, width: 85 },
      { key: "method", label: "Disposal Method", type: "select", options: ["Approved waste contractor", "Denatured & binned", "Returned to supplier", "Animal feed (approved)"], width: 170 },
      { key: "witness", label: "Witnessed By", width: 120 },
    ],
    check(r) {
      const issues = [];
      if (!r.method) issues.push(warn("Disposal method missing"));
      if (!r.witness) issues.push(warn("No witness"));
      if (num(r.qty) === null) issues.push(warn("Quantity missing"));
      return firstIssue(issues);
    },
  }],
});

/* ───────── 10. Thermometer verification ───────── */
const calibration = (ns) => sheet(ns, "thermometer_check", {
  group: "quality",
  icon: "🎯",
  label: "Thermometer Verification",
  desc: "Ice-point and boiling-point check of every probe",
  title: "Thermometer Verification Record",
  tables: [{
    key: "rows",
    title: "Probes (ice point 0 ± 1 °C · boiling point 100 ± 1 °C)",
    defaultRows: 3,
    carry: ["probe", "location"],
    columns: [
      { key: "probe", label: "Thermometer ID", width: 120 },
      { key: "location", label: "Location", width: 140 },
      { key: "ice", label: "Ice Point °C", type: "number", width: 90, hint: "−1 … 1" },
      { key: "boil", label: "Boiling Point °C", type: "number", width: 100, hint: "99 … 101" },
      { key: "action", label: "Corrective Action", type: "select", options: ["None", "Recalibrated", "Replaced", "Withdrawn"], width: 130 },
    ],
    check(r) {
      const issues = [];
      const ice = num(r.ice);
      const boil = num(r.boil);
      if (ice !== null && Math.abs(ice) > 1) issues.push(fail(`Ice point ${ice}°C (outside ±1)`));
      if (boil !== null && Math.abs(boil - 100) > 1) issues.push(fail(`Boiling point ${boil}°C (outside 100 ± 1)`));
      if (ice === null && boil === null) issues.push(warn("No reading"));
      const worst = firstIssue(issues);
      return worst.level === "fail" && r.action && r.action !== "None" ? warn(`${worst.text} — ${r.action.toLowerCase()}`) : worst;
    },
  }],
});

/** Every shared report, as the given industry's own types. */
export function commonReports(ns) {
  return [
    personalHygiene(ns), cleaning(ns), pestControl(ns),
    receiving(ns), temperatures(ns),
    visitors(ns), staffHealth(ns),
    nonConformance(ns), waste(ns), calibration(ns),
  ];
}
