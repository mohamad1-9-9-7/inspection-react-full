// src/industries/restaurant/reports.js
// Input reports only a RESTAURANT / kitchen keeps (on top of the shared ones in
// _kit/commonReports.js). Every type is `restaurant_*`.
//
// Limits (Dubai Municipality Food Code): cooking & reheating core ≥ 75 °C,
// hot holding ≥ 60 °C, two-stage cooling 60 → 21 °C in 2 h and → 5 °C within
// 6 h in total, frying oil discarded at ≥ 25 % total polar material.

import {
  num, minutesBetween, warn, fail, firstIssue, withAction, failOnNo, sheet,
  YES_NO, PASS_FAIL,
} from "../_kit/schemaKit";

const NS = "restaurant";

const cooking = sheet(NS, "cooking", {
  group: "operations",
  icon: "🔥",
  label: "Cooking & Reheating",
  desc: "Core temperature of every cooked or reheated dish",
  title: "Cooking & Reheating Temperature Log",
  tables: [{
    key: "rows",
    title: "Dishes (core ≥ 75 °C)",
    defaultRows: 6,
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "dish", label: "Dish", width: 170 },
      { key: "process", label: "Process", type: "select", options: ["Cooking", "Reheating"], width: 110 },
      { key: "core", label: "Core Temp °C", type: "number", width: 95, hint: "≥ 75" },
      { key: "probe", label: "Thermometer ID", width: 110 },
      { key: "chef", label: "Chef", width: 120 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      const t = num(r.core);
      if (t !== null && t < 75) issues.push(fail(`Core ${t}°C (< 75)`));
      if (t === null) issues.push(warn("Core temp missing"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const hotHolding = sheet(NS, "hot_holding", {
  group: "operations",
  icon: "♨️",
  label: "Hot Holding",
  desc: "Bain-marie / buffet readings every 2 hours",
  title: "Hot Holding Temperature Log",
  tables: [{
    key: "rows",
    title: "Hot-held food (≥ 60 °C, checked every 2 h)",
    defaultRows: 5,
    carry: ["unit", "dish"],
    columns: [
      { key: "unit", label: "Bain-marie / Counter", width: 140 },
      { key: "dish", label: "Dish", width: 160 },
      { key: "t1", label: "°C 1st check", type: "number", width: 85 },
      { key: "t2", label: "°C 2nd check", type: "number", width: 85 },
      { key: "t3", label: "°C 3rd check", type: "number", width: 85 },
      { key: "t4", label: "°C 4th check", type: "number", width: 85 },
      { key: "action", label: "Corrective Action", type: "select", options: ["None", "Reheated to ≥ 75 °C", "Discarded"], width: 150 },
    ],
    check(r) {
      const issues = [];
      ["t1", "t2", "t3", "t4"].forEach((k, i) => {
        const t = num(r[k]);
        if (t !== null && t < 60) issues.push(fail(`Check ${i + 1}: ${t}°C (< 60)`));
      });
      if (["t1", "t2", "t3", "t4"].every((k) => num(r[k]) === null)) issues.push(warn("No readings"));
      const worst = firstIssue(issues);
      return worst.level === "fail" && r.action && r.action !== "None" ? warn(`${worst.text} — ${r.action.toLowerCase()}`) : worst;
    },
  }],
});

const cooling = sheet(NS, "cooling", {
  group: "operations",
  icon: "❄️",
  label: "Cooling of Cooked Food",
  desc: "Two-stage cooling 60 → 21 °C → 5 °C",
  title: "Cooling of Cooked Food Log",
  tables: [{
    key: "rows",
    title: "Cooling (60 → 21 °C in 2 h, → 5 °C within 6 h)",
    defaultRows: 4,
    columns: [
      { key: "dish", label: "Dish", width: 170 },
      { key: "startTime", label: "Start Time", type: "time", autoNow: true, width: 90 },
      { key: "startTemp", label: "Start °C", type: "number", width: 80 },
      { key: "t2Time", label: "Time @ 2 h", type: "time", width: 90 },
      { key: "t2Temp", label: "°C @ 2 h", type: "number", width: 80, hint: "≤ 21" },
      { key: "t6Time", label: "Time @ 6 h", type: "time", width: 90 },
      { key: "t6Temp", label: "°C @ 6 h", type: "number", width: 80, hint: "≤ 5" },
      { key: "method", label: "Method", type: "select", options: ["Blast chiller", "Walk-in chiller", "Ice bath", "Shallow trays"], width: 140 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      const t2 = num(r.t2Temp);
      const t6 = num(r.t6Temp);
      const m2 = minutesBetween(r.startTime, r.t2Time);
      const m6 = minutesBetween(r.startTime, r.t6Time);
      if (t2 !== null && t2 > 21) issues.push(fail(`${t2}°C at stage 1 (> 21)`));
      if (m2 !== null && m2 > 120) issues.push(fail(`Stage 1 took ${m2} min (> 120)`));
      if (t6 !== null && t6 > 5) issues.push(fail(`${t6}°C at stage 2 (> 5)`));
      if (m6 !== null && m6 > 360) issues.push(fail(`Cooling took ${m6} min (> 360)`));
      if (t2 === null) issues.push(warn("2 h reading missing"));
      else if (t6 === null) issues.push(warn("6 h reading missing"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const thawing = sheet(NS, "thawing", {
  group: "operations",
  icon: "🧊",
  label: "Thawing",
  desc: "Frozen food thawed safely, labelled and used on time",
  title: "Thawing Record",
  tables: [{
    key: "rows",
    title: "Items thawed",
    defaultRows: 4,
    openItems: {
      days: 3,
      isOpen: (r) => r.status === "Thawing",
      label: (r) => `${r.item || "Item"} — still thawing`,
    },
    columns: [
      { key: "item", label: "Item", width: 170 },
      { key: "qty", label: "Qty (kg)", type: "number", width: 80 },
      { key: "method", label: "Thaw Method", type: "select", options: ["Chiller (≤ 5 °C)", "Cold running water (≤ 21 °C)", "Microwave — use at once"], width: 190 },
      { key: "start", label: "Start Time", type: "time", autoNow: true, width: 90 },
      { key: "startDate", label: "Start Date", type: "date", autoDate: true, width: 130 },
      { key: "endCore", label: "End Core °C", type: "number", width: 90, hint: "≤ 5" },
      { key: "labelled", label: "Labelled (thaw date)", type: "select", options: YES_NO, width: 100 },
      { key: "refrozen", label: "Refrozen?", type: "select", options: YES_NO, width: 90 },
      { key: "status", label: "Status", type: "select", options: ["Thawing", "In chiller (thawed)", "Used", "Discarded"], width: 150 },
    ],
    check(r) {
      const issues = [];
      const t = num(r.endCore);
      if (r.method === "Chiller (≤ 5 °C)" && t !== null && t > 5) issues.push(fail(`Thawed at ${t}°C (> 5)`));
      if (r.refrozen === "Yes") issues.push(fail("Refrozen after thawing"));
      issues.push(...failOnNo(r, [["labelled", "Not labelled"]]));
      if (!r.status) issues.push(warn("Status missing"));
      return firstIssue(issues);
    },
  }],
});

const fryingOil = sheet(NS, "frying_oil", {
  group: "operations",
  icon: "🍟",
  label: "Frying Oil Quality",
  desc: "Total polar material (TPM) and oil change",
  title: "Frying Oil Quality Log",
  tables: [{
    key: "rows",
    title: "Fryers (discard at TPM ≥ 25 %)",
    defaultRows: 3,
    carry: ["fryer"],
    columns: [
      { key: "fryer", label: "Fryer", width: 120 },
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "tpm", label: "TPM %", type: "number", width: 80, hint: "< 25 (review ≥ 22)" },
      { key: "colour", label: "Colour / Smell", type: "select", options: PASS_FAIL, width: 100 },
      { key: "changed", label: "Oil Changed", type: "select", options: YES_NO, width: 90 },
      { key: "checkedBy", label: "Checked By", width: 120 },
    ],
    check(r) {
      const tpm = num(r.tpm);
      const changed = r.changed === "Yes";
      if (tpm !== null && tpm >= 25) return changed ? warn(`TPM ${tpm}% — oil changed`) : fail(`TPM ${tpm}% (≥ 25) — change the oil`);
      if (r.colour === "Fail") return changed ? warn("Dark / rancid — oil changed") : fail("Dark / rancid oil");
      if (tpm !== null && tpm >= 22) return warn(`TPM ${tpm}% — change soon`);
      return firstIssue(tpm === null ? [warn("TPM missing")] : []);
    },
  }],
});

const dishwasher = sheet(NS, "dishwasher", {
  group: "hygiene",
  icon: "🍽️",
  label: "Dishwashing Machine",
  desc: "Wash and final-rinse temperatures",
  title: "Dishwashing Machine Temperature Log",
  tables: [{
    key: "rows",
    title: "Readings (wash ≥ 60 °C · final rinse ≥ 82 °C)",
    defaultRows: 3,
    carry: ["machine"],
    columns: [
      { key: "machine", label: "Machine", width: 130 },
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "wash", label: "Wash °C", type: "number", width: 85, hint: "≥ 60" },
      { key: "rinse", label: "Final Rinse °C", type: "number", width: 95, hint: "≥ 82" },
      { key: "detergent", label: "Detergent / Rinse Aid OK", type: "select", options: YES_NO, width: 120 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      const w = num(r.wash);
      const rn = num(r.rinse);
      if (w !== null && w < 60) issues.push(fail(`Wash ${w}°C (< 60)`));
      if (rn !== null && rn < 82) issues.push(fail(`Rinse ${rn}°C (< 82)`));
      issues.push(...failOnNo(r, [["detergent", "Detergent / rinse aid empty"]]));
      if (w === null && rn === null) issues.push(warn("No readings"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

export const RESTAURANT_REPORTS = [cooking, hotHolding, cooling, thawing, fryingOil, dishwasher];
