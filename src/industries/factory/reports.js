// src/industries/factory/reports.js
// Input reports only a FOOD MANUFACTURING PLANT keeps (on top of the shared
// ones in _kit/commonReports.js). Every type is `factory_*`.
//
// Limits: each CCP carries its own critical limits on the row; metal detector
// must reject all three test pieces; ATP ≤ 150 RLU pass, ≤ 300 review, above
// fail; potable water free chlorine 0.2 – 0.5 ppm and pH 6.5 – 8.5.

import {
  num, warn, fail, firstIssue, withAction, failOnNo, sheet,
  YES_NO, YES_NO_NA, PASS_FAIL, UNITS,
} from "../_kit/schemaKit";

const NS = "factory";

const productionBatch = sheet(NS, "production_batch", {
  group: "operations",
  icon: "🏭",
  label: "Production Batch Record",
  desc: "Batch, raw lots used, quantity and QA release",
  title: "Production Batch Record",
  tables: [{
    key: "rows",
    title: "Batches produced",
    defaultRows: 4,
    columns: [
      { key: "product", label: "Product", width: 170 },
      { key: "batch", label: "Batch No.", width: 110 },
      { key: "line", label: "Line", width: 90 },
      { key: "start", label: "Start", type: "time", autoNow: true, width: 90 },
      { key: "end", label: "End", type: "time", width: 90 },
      {
        key: "lots", label: "Raw Material Lots Used", type: "list", width: 300, addLabel: "+ Add line",
        fields: [
          { key: "material", label: "Material", width: 120 },
          { key: "lot", label: "Lot No.", width: 90 },
          { key: "qty", label: "Qty", type: "number", width: 60 },
          { key: "unit", label: "Unit", type: "select", options: UNITS, width: 70 },
        ],
      },
      { key: "qty", label: "Qty Produced", type: "number", width: 90 },
      { key: "unit", label: "Unit", type: "select", options: UNITS, width: 85 },
      { key: "release", label: "Release Status", type: "select", options: ["Released", "On Hold", "Rejected"], width: 110 },
      { key: "releasedBy", label: "Released By (QA)", width: 120 },
    ],
    check(r) {
      const issues = [];
      const hasLots = Array.isArray(r.lots) && r.lots.some((x) => String(x?.lot ?? "").trim());
      if (!r.batch) issues.push(warn("Batch no. missing"));
      if (!hasLots) issues.push(warn("No raw lots — traceability incomplete"));
      if (r.release === "Rejected") return fail("Batch rejected");
      if (r.release === "Released" && !r.releasedBy) issues.push(warn("Release not signed"));
      if (r.release === "On Hold") issues.push(warn("On hold"));
      if (!r.release) issues.push(warn("Not released yet"));
      return firstIssue(issues);
    },
  }],
});

const ccp = sheet(NS, "ccp_monitoring", {
  group: "quality",
  icon: "🎯",
  label: "CCP Monitoring",
  desc: "Critical control points against their critical limits",
  title: "CCP Monitoring Record",
  tables: [{
    key: "rows",
    title: "Critical control points",
    defaultRows: 4,
    carry: ["ccp", "step", "parameter", "min", "max"],
    columns: [
      { key: "ccp", label: "CCP No.", width: 80 },
      { key: "step", label: "Process Step", width: 150 },
      { key: "parameter", label: "Parameter", options: ["Core temperature °C", "Cooking time (min)", "Chiller temperature °C", "pH", "Water activity (aw)", "Metal detection"], width: 160 },
      { key: "min", label: "Critical Min", type: "number", width: 90 },
      { key: "max", label: "Critical Max", type: "number", width: 90 },
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "value", label: "Measured", type: "number", width: 90 },
      { key: "action", label: "Corrective Action", width: 190 },
      { key: "verifiedBy", label: "Verified By", width: 120 },
    ],
    check(r) {
      const v = num(r.value);
      const lo = num(r.min);
      const hi = num(r.max);
      const issues = [];
      if (lo === null && hi === null) issues.push(warn("Critical limits not set"));
      if (v === null) issues.push(warn("No reading"));
      else {
        if (lo !== null && v < lo) issues.push(fail(`${v} below critical min ${lo}`));
        if (hi !== null && v > hi) issues.push(fail(`${v} above critical max ${hi}`));
      }
      if (!r.verifiedBy) issues.push(warn("Not verified"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const metalDetector = sheet(NS, "metal_detector", {
  group: "quality",
  icon: "🧲",
  label: "Metal Detector Check",
  desc: "Fe / non-Fe / stainless test pieces and reject system",
  title: "Metal Detector Verification",
  tables: [{
    key: "rows",
    title: "Checks (all test pieces must be detected and rejected)",
    defaultRows: 4,
    carry: ["line"],
    columns: [
      { key: "line", label: "Line / Detector", width: 130 },
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "fe", label: "Fe 1.5 mm", type: "select", options: ["Detected", "Not detected"], width: 110 },
      { key: "nfe", label: "Non-Fe 2.0 mm", type: "select", options: ["Detected", "Not detected"], width: 110 },
      { key: "ss", label: "Stainless 2.5 mm", type: "select", options: ["Detected", "Not detected"], width: 115 },
      { key: "reject", label: "Reject System Works", type: "select", options: YES_NO, width: 110 },
      { key: "action", label: "Corrective Action", width: 190 },
    ],
    check(r) {
      const issues = [];
      [["fe", "Fe"], ["nfe", "Non-Fe"], ["ss", "Stainless"]].forEach(([k, n]) => { if (r[k] === "Not detected") issues.push(fail(`${n} test piece not detected`)); });
      issues.push(...failOnNo(r, [["reject", "Reject system failed"]]));
      if (!r.fe || !r.nfe || !r.ss) issues.push(warn("Test incomplete"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const preOp = sheet(NS, "pre_op", {
  group: "hygiene",
  icon: "✨",
  label: "Pre-operational Hygiene",
  desc: "Line clean, sanitised and ATP-tested before start-up",
  title: "Pre-operational Hygiene Inspection",
  tables: [{
    key: "rows",
    title: "Lines & equipment (ATP ≤ 150 RLU pass · ≤ 300 review)",
    defaultRows: 5,
    carry: ["equipment"],
    columns: [
      { key: "equipment", label: "Line / Equipment", width: 160 },
      { key: "clean", label: "Visually Clean", type: "select", options: YES_NO, width: 90 },
      { key: "sanitised", label: "Sanitised", type: "select", options: YES_NO, width: 90 },
      { key: "atp", label: "ATP (RLU)", type: "number", width: 90 },
      { key: "foreign", label: "No Loose Parts / Tools", type: "select", options: YES_NO, width: 110 },
      { key: "released", label: "Released for Production", type: "select", options: YES_NO, width: 120 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = failOnNo(r, [["clean", "Not clean"], ["sanitised", "Not sanitised"], ["foreign", "Loose parts / tools on line"]]);
      const atp = num(r.atp);
      if (atp !== null && atp > 300) issues.push(fail(`ATP ${atp} RLU (> 300)`));
      else if (atp !== null && atp > 150) issues.push(warn(`ATP ${atp} RLU (> 150)`));
      const worst = firstIssue(issues);
      if (worst.level === "fail" && r.released === "Yes") return fail(`${worst.text} — but released`);
      return withAction(worst, r.action);
    },
  }],
});

const glass = sheet(NS, "glass_brittle", {
  group: "hygiene",
  icon: "🔍",
  label: "Glass & Brittle Plastic",
  desc: "Register check of glass, perspex and hard plastics",
  title: "Glass & Brittle Plastic Register Check",
  tables: [{
    key: "rows",
    title: "Items on the register",
    defaultRows: 6,
    carry: ["item", "location", "qty"],
    columns: [
      { key: "item", label: "Item", width: 160 },
      { key: "location", label: "Location", width: 140 },
      { key: "qty", label: "Qty", type: "number", width: 70 },
      { key: "condition", label: "Condition", type: "select", options: ["Intact", "Damaged", "Missing"], width: 100 },
      { key: "action", label: "Corrective Action", width: 190 },
    ],
    check(r) {
      if (r.condition === "Damaged" || r.condition === "Missing") {
        return withAction(fail(`${r.condition} — product at risk`), r.action);
      }
      return firstIssue(r.condition ? [] : [warn("Condition missing")]);
    },
  }],
});

const packaging = sheet(NS, "packaging_label", {
  group: "operations",
  icon: "🏷️",
  label: "Packaging & Label Verification",
  desc: "Label, dates, allergens, seal and net weight per batch",
  title: "Packaging & Label Verification",
  tables: [{
    key: "rows",
    title: "Batches checked",
    defaultRows: 4,
    columns: [
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "product", label: "Product", width: 170 },
      { key: "batch", label: "Batch No.", width: 110 },
      { key: "label", label: "Correct Label", type: "select", options: YES_NO, width: 90 },
      { key: "dates", label: "Production & Expiry Dates", type: "select", options: YES_NO, width: 110 },
      { key: "allergens", label: "Allergen Statement", type: "select", options: YES_NO_NA, width: 100 },
      { key: "seal", label: "Seal Integrity", type: "select", options: PASS_FAIL, width: 90 },
      { key: "weight", label: "Net Weight OK", type: "select", options: YES_NO, width: 90 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = failOnNo(r, [["label", "Wrong label"], ["dates", "Dates wrong / missing"], ["allergens", "Allergen statement missing"], ["weight", "Under weight"]]);
      if (r.seal === "Fail") issues.push(fail("Seal failed"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

const water = sheet(NS, "water_quality", {
  group: "quality",
  icon: "💧",
  label: "Water Quality",
  desc: "Free chlorine and pH at the sampling points",
  title: "Potable Water Quality Check",
  tables: [{
    key: "rows",
    title: "Sampling points (free chlorine 0.2 – 0.5 ppm · pH 6.5 – 8.5)",
    defaultRows: 3,
    carry: ["point"],
    columns: [
      { key: "point", label: "Sampling Point", width: 150 },
      { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
      { key: "chlorine", label: "Free Chlorine ppm", type: "number", width: 110 },
      { key: "ph", label: "pH", type: "number", width: 70 },
      { key: "appearance", label: "Clear / No Odour", type: "select", options: YES_NO, width: 100 },
      { key: "action", label: "Corrective Action", width: 170 },
    ],
    check(r) {
      const issues = [];
      const cl = num(r.chlorine);
      const ph = num(r.ph);
      if (cl !== null && cl < 0.2) issues.push(fail(`Chlorine ${cl} ppm (< 0.2)`));
      else if (cl !== null && cl > 0.5) issues.push(warn(`Chlorine ${cl} ppm (> 0.5)`));
      if (ph !== null && (ph < 6.5 || ph > 8.5)) issues.push(fail(`pH ${ph} (outside 6.5 – 8.5)`));
      issues.push(...failOnNo(r, [["appearance", "Cloudy / odour"]]));
      if (cl === null && ph === null) issues.push(warn("No readings"));
      return withAction(firstIssue(issues), r.action);
    },
  }],
});

export const FACTORY_REPORTS = [productionBatch, packaging, ccp, metalDetector, water, preOp, glass];
