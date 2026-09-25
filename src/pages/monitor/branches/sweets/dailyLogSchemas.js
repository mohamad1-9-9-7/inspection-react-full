// src/pages/monitor/branches/sweets/dailyLogSchemas.js
// Field definitions for the sweets factory's daily log sheets. One schema =
// one report type = one sheet per day (the server keeps a single record per
// type + reportDate, so a day's sheet is re-opened and extended, never
// duplicated). SweetsDailyLog.jsx renders the entry form, the saved-sheet view,
// Excel/PDF/Print and the per-row compliance status from these objects alone —
// adding a log means adding one object here and one entry in
// industries/sweets/index.js.
//
// Column types: text · number · time · date · select · computed · list
//   options    — select choices (or datalist suggestions for text)
//   autoNow    — time column filled with the current time when the row starts
//   compute    — computed column: (row) => display value (stored on save)
//   list       — a mini-table inside the cell (value = array of objects):
//                fields[], addLabel, optional lotsFrom (pick "Material · Lot"
//                from that log type) and parseText (legacy plain-text value)
//   hint       — the limit, printed under the column title
//   fill       — (value, row) => patch applied when the cell changes (auto-fill)
//   matrix     — "<key>": suggest Allergen Matrix products; a match fills <key>
// table.carry — keys copied by «Copy from last sheet» (lists that repeat daily)
// check(row, header) → null | { level: "ok" | "warn" | "fail", text }
//
// Limits follow the Dubai Municipality Food Code / Codex HACCP defaults:
// chilled ≤ 5 °C, frozen ≤ −18 °C, hot-cooked core ≥ 75 °C, two-stage
// cooling 60 → 21 °C within 2 h and → 5 °C within 6 h in total.

const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const minutesBetween = (a, b) => {
  if (!a || !b) return null;
  const [ah, am] = String(a).split(":").map(Number);
  const [bh, bm] = String(b).split(":").map(Number);
  if ([ah, am, bh, bm].some((x) => !Number.isFinite(x))) return null;
  let d = bh * 60 + bm - (ah * 60 + am);
  if (d < 0) d += 24 * 60; // crossed midnight
  return d;
};
const ok = (text = "OK") => ({ level: "ok", text });
const warn = (text) => ({ level: "warn", text });
const fail = (text) => ({ level: "fail", text });
const firstIssue = (issues) =>
  issues.find((i) => i.level === "fail") || issues.find((i) => i.level === "warn") || ok();

export const RAW_MATERIALS = [
  "Walnuts", "Almonds", "Pistachios", "Cashews", "Hazelnuts", "Peanuts", "Coconut (desiccated)",
  "Sugar (white)", "Brown sugar", "Icing sugar", "Glucose syrup", "Honey",
  "Flour", "Semolina", "Corn starch", "Baking powder", "Yeast",
  "Butter", "Ghee", "Vegetable oil", "Margarine",
  "Fresh cream", "Whipping cream", "Milk", "Milk powder", "Cream cheese", "Eggs",
  "Chocolate", "Cocoa powder", "Dates", "Dates paste", "Gelatin", "Vanilla",
  "Food colour", "Rose water", "Orange blossom water", "Sesame", "Packaging material",
];

export const ALLERGENS = ["Tree nuts", "Peanuts", "Gluten", "Milk", "Eggs", "Sesame", "Soy"];

/* Target ppm per sanitizer (label dilution for food-contact surfaces).
   Mirrors the Sanitizers guide in sweetsReportGuides.js. */
export const SANITIZER_RANGES = {
  "Chlorine (hypochlorite)": [50, 200],
  "Quaternary ammonium (QAC)": [200, 400],
  "Peracetic acid": [150, 300],
};

const YES_NO = ["Yes", "No"];
const YES_NO_NA = ["Yes", "No", "N/A"];
const PASS_FAIL = ["Pass", "Fail"];

const COMMON_HEADER = [
  { key: "shift", label: "Shift", type: "select", options: ["Morning", "Evening", "Night"] },
  { key: "checkedBy", label: "Checked By" },
  { key: "verifiedBy", label: "Verified By (QA)" },
];

/* ───────────────────────── 1. Raw material receiving ───────────────────────── */
const rawReceiving = {
  type: "sweets_raw_receiving",
  icon: "📦",
  label: "Raw Material Receiving",
  desc: "Supplier, lot, expiry, temperature, visual check",
  title: "Raw Material Receiving Log",
  header: COMMON_HEADER,
  tables: [
    {
      key: "rows",
      title: "Deliveries",
      defaultRows: 5,
      columns: [
        { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
        { key: "supplier", label: "Supplier", width: 150 },
        { key: "material", label: "Material", options: RAW_MATERIALS, width: 150 },
        { key: "storage", label: "Storage", type: "select", options: ["Dry", "Chilled", "Frozen"], width: 95 },
        { key: "lot", label: "Batch / Lot No.", width: 120 },
        { key: "expDate", label: "Expiry Date", type: "date", width: 130, hint: "not expired" },
        { key: "qty", label: "Qty", type: "number", width: 75 },
        { key: "unit", label: "Unit", type: "select", options: ["kg", "g", "L", "pcs", "box", "tray", "carton"], width: 85 },
        { key: "temp", label: "Temp °C", type: "number", width: 80, hint: "chilled ≤5 · frozen ≤−18" },
        { key: "vehicle", label: "Vehicle Clean", type: "select", options: YES_NO, width: 90 },
        { key: "packaging", label: "Packaging Intact", type: "select", options: YES_NO, width: 95 },
        { key: "visual", label: "Appearance / Odour", type: "select", options: PASS_FAIL, width: 100 },
        { key: "pests", label: "Pest / Mould Signs", type: "select", options: ["None", "Found"], width: 100 },
        { key: "coa", label: "COA / Aflatoxin Cert.", type: "select", options: YES_NO_NA, width: 100, hint: "required for nuts" },
        { key: "decision", label: "Decision", type: "select", options: ["Accepted", "Rejected", "On Hold"], width: 110 },
        { key: "remarks", label: "Remarks", width: 160 },
      ],
      check(r, h) {
        const issues = [];
        const t = num(r.temp);
        if (r.storage === "Chilled" && t !== null && t > 5) issues.push(fail(`Chilled at ${t}°C (> 5)`));
        if (r.storage === "Frozen" && t !== null && t > -18) issues.push(fail(`Frozen at ${t}°C (> −18)`));
        if ((r.storage === "Chilled" || r.storage === "Frozen") && t === null) issues.push(warn("Temperature missing"));
        const day = h.reportDate;
        if (r.expDate && day && r.expDate < day) issues.push(fail("Expired on arrival"));
        if (r.vehicle === "No") issues.push(fail("Vehicle not clean"));
        if (r.packaging === "No") issues.push(fail("Damaged packaging"));
        if (r.visual === "Fail") issues.push(fail("Appearance / odour failed"));
        if (r.pests === "Found") issues.push(fail("Pest / mould signs"));
        if (/nut|almond|walnut|pistach|cashew|hazel|peanut/i.test(r.material || "") && r.coa === "No")
          issues.push(fail("Nuts without COA / aflatoxin cert."));
        if (!r.lot) issues.push(warn("Lot no. missing"));
        if (!r.expDate) issues.push(warn("Expiry missing"));
        if (r.decision === "Rejected") return fail("Rejected");
        const worst = firstIssue(issues);
        if (worst.level !== "ok" && r.decision === "Accepted" && worst.level === "fail")
          return fail(`${worst.text} — but accepted`);
        return worst;
      },
    },
  ],
};

/* ───────────────────────── 2. Baking & cooking ───────────────────────── */
const bakingCooking = {
  type: "sweets_baking_cooking",
  icon: "🔥",
  label: "Baking & Cooking",
  desc: "Oven temperature, baking time, core temperature",
  title: "Baking & Cooking Temperature Log",
  header: COMMON_HEADER,
  tables: [
    {
      key: "rows",
      title: "Batches",
      defaultRows: 6,
      columns: [
        { key: "product", label: "Product", width: 170 },
        { key: "batch", label: "Batch No.", width: 110 },
        { key: "process", label: "Process", type: "select", options: ["Baking", "Cooking (syrup / custard / filling)", "Frying", "Roasting (nuts)"], width: 150 },
        { key: "oven", label: "Oven / Equipment", width: 110 },
        { key: "setTemp", label: "Set Temp °C", type: "number", width: 90 },
        { key: "start", label: "Start", type: "time", autoNow: true, width: 90 },
        { key: "end", label: "End", type: "time", width: 90 },
        {
          key: "duration", label: "Duration (min)", type: "computed", width: 90,
          compute: (r) => { const m = minutesBetween(r.start, r.end); return m === null ? "" : String(m); },
        },
        { key: "coreTemp", label: "Core Temp °C", type: "number", width: 90, hint: "≥ 75" },
        { key: "doneness", label: "Doneness Check", type: "select", options: PASS_FAIL, width: 100 },
        { key: "action", label: "Corrective Action", width: 170 },
      ],
      check(r) {
        const issues = [];
        const core = num(r.coreTemp);
        const needsCore = /Cooking|Frying/.test(r.process || "");
        if (core !== null && core < 75) issues.push(fail(`Core ${core}°C (< 75)`));
        if (needsCore && core === null) issues.push(warn("Core temp missing"));
        if (r.doneness === "Fail") issues.push(fail("Doneness failed"));
        if (r.start && !r.end) issues.push(warn("End time missing"));
        const worst = firstIssue(issues);
        if (worst.level === "fail" && r.action) return warn(`${worst.text} — action taken`);
        return worst;
      },
    },
  ],
};

/* ───────────────────────── 3. Cooling & display ───────────────────────── */
const coolingDisplay = {
  type: "sweets_cooling_display",
  icon: "❄️",
  label: "Cooling & Display",
  desc: "Cream & cake cooling, display at ≤ 5 °C",
  title: "Cooling & Chilled Display Log",
  header: COMMON_HEADER,
  tables: [
    {
      key: "rows",
      title: "Cooling after preparation (60 → 21 °C in 2 h, → 5 °C within 6 h)",
      defaultRows: 5,
      columns: [
        { key: "product", label: "Product", width: 170 },
        { key: "batch", label: "Batch No.", width: 110 },
        { key: "startTime", label: "Start Time", type: "time", autoNow: true, width: 90 },
        { key: "startTemp", label: "Start °C", type: "number", width: 80 },
        { key: "t2Time", label: "Time @ 2 h", type: "time", width: 90 },
        { key: "t2Temp", label: "°C @ 2 h", type: "number", width: 80, hint: "≤ 21" },
        { key: "t6Time", label: "Time @ 6 h", type: "time", width: 90 },
        { key: "t6Temp", label: "°C @ 6 h", type: "number", width: 80, hint: "≤ 5" },
        { key: "method", label: "Method", type: "select", options: ["Blast chiller", "Walk-in chiller", "Ice bath", "Ambient then chiller"], width: 140 },
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
        const worst = firstIssue(issues);
        if (worst.level === "fail" && r.action) return warn(`${worst.text} — action taken`);
        return worst;
      },
    },
    {
      key: "display",
      title: "Chilled display & storage (≤ 5 °C)",
      defaultRows: 4,
      carry: ["unit", "products"],
      columns: [
        { key: "unit", label: "Display / Chiller", width: 150 },
        { key: "products", label: "Products (cream / cakes)", width: 190 },
        { key: "am", label: "°C Morning", type: "number", width: 85, hint: "≤ 5" },
        { key: "noon", label: "°C Noon", type: "number", width: 85, hint: "≤ 5" },
        { key: "pm", label: "°C Evening", type: "number", width: 85, hint: "≤ 5" },
        { key: "labels", label: "Labels / Dates OK", type: "select", options: YES_NO, width: 100 },
        { key: "action", label: "Corrective Action", width: 170 },
      ],
      check(r) {
        const issues = [];
        ["am", "noon", "pm"].forEach((k, i) => {
          const t = num(r[k]);
          if (t !== null && t > 5) issues.push(fail(`${["Morning", "Noon", "Evening"][i]} ${t}°C (> 5)`));
        });
        if (r.labels === "No") issues.push(fail("Labels / dates not OK"));
        if (["am", "noon", "pm"].every((k) => num(r[k]) === null)) issues.push(warn("No readings"));
        const worst = firstIssue(issues);
        if (worst.level === "fail" && r.action) return warn(`${worst.text} — action taken`);
        return worst;
      },
    },
  ],
};

/* ───────────────────────── 4. Production & batches ───────────────────────── */
// Backward + forward traceability in one row: which raw lots went in (and how
// much of each), whether the line was cleaned after an allergen run, whether
// QA released the batch, and where every quantity was sent. A recall starts
// from any lot number and walks both ways through the view page's search.
const hasLine = (list, key) => Array.isArray(list) && list.some((x) => String(x?.[key] ?? "").trim());
const productionBatches = {
  type: "sweets_production_batch",
  icon: "🏭",
  label: "Production & Batches",
  desc: "Raw lots in → QA release → dispatch out (recall-ready)",
  title: "Production & Batch Traceability Log",
  header: COMMON_HEADER,
  tables: [
    {
      key: "rows",
      title: "Finished product batches",
      defaultRows: 3,
      columns: [
        // Picking a product from the Allergen Matrix fills its allergens.
        { key: "product", label: "Finished Product", width: 170, matrix: "allergens", hint: "from Allergen Matrix" },
        { key: "batch", label: "Batch No.", width: 110 },
        { key: "qty", label: "Qty", type: "number", width: 75 },
        { key: "unit", label: "Unit", type: "select", options: ["pcs", "kg", "tray", "box", "cake"], width: 80 },
        {
          key: "lots", label: "Raw Material Lots Used", type: "list", width: 430, hint: "lot + quantity used",
          lotsFrom: "sweets_raw_receiving", addLabel: "+ Manual lot",
          fields: [
            { key: "material", label: "Material", width: 120 },
            { key: "lot", label: "Lot No.", width: 95 },
            { key: "qty", label: "Qty", type: "number", width: 65 },
            { key: "unit", label: "Unit", type: "select", options: ["kg", "g", "L", "pcs"], width: 70 },
          ],
          // Sheets saved before the mini-table kept "Walnuts · L-1; Flour · F-8".
          parseText: (txt) => String(txt).split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
            const [a, b] = p.split("·").map((x) => x.trim());
            return { material: b ? a : "", lot: b || a, qty: "", unit: "kg" };
          }),
        },
        { key: "allergens", label: "Allergens", options: ALLERGENS, width: 140 },
        {
          key: "changeover", label: "Line Cleaned After Allergen Run", type: "select", options: YES_NO_NA, width: 125,
          hint: "N/A = first run / same allergens",
        },
        { key: "prodDate", label: "Prod. Date", type: "date", width: 130 },
        { key: "expDate", label: "Expiry Date", type: "date", width: 130 },
        { key: "label", label: "Label Checked", type: "select", options: YES_NO, width: 90 },
        { key: "release", label: "Release Status", type: "select", options: ["Released", "On Hold", "Rejected"], width: 110, hint: "QA decision" },
        { key: "releasedBy", label: "Released By (QA)", width: 120 },
        {
          key: "dispatch", label: "Dispatched To", type: "list", width: 370, hint: "where every quantity went",
          addLabel: "+ Add dispatch",
          fields: [
            { key: "to", label: "Branch / Customer", width: 150 },
            { key: "date", label: "Date", type: "date", width: 130 },
            { key: "qty", label: "Qty", type: "number", width: 65 },
          ],
        },
      ],
      check(r) {
        const issues = [];
        const lots = Array.isArray(r.lots) ? r.lots : [];
        const traceable = hasLine(lots, "lot") || (typeof r.lots === "string" && r.lots.trim());
        if (!r.batch) issues.push(warn("Batch no. missing"));
        if (!traceable) issues.push(fail("No raw-material lots — not traceable"));
        else if (lots.some((x) => String(x?.lot ?? "").trim() && !String(x?.qty ?? "").trim())) issues.push(warn("Lot quantity missing"));
        if (r.changeover === "No") issues.push(fail("Line not cleaned after allergen run"));
        if (!r.changeover) issues.push(warn("Allergen changeover not recorded"));
        if (!r.allergens) issues.push(warn("Allergens not declared"));
        if (r.label === "No") issues.push(fail("Label not checked"));
        if (r.prodDate && r.expDate && r.expDate <= r.prodDate) issues.push(fail("Expiry not after production"));
        if (!r.expDate) issues.push(warn("Expiry missing"));

        // QA release gates the dispatch: a failed check blocks it, and nothing
        // may leave the factory before the batch is released.
        const blocker = issues.find((i) => i.level === "fail");
        const dispatched = hasLine(r.dispatch, "to");
        if (r.release === "Rejected") return fail("Batch rejected");
        if (dispatched && r.release !== "Released") return fail("Dispatched without QA release");
        if (r.release === "Released") {
          if (blocker) return fail(`Released despite: ${blocker.text}`);
          if (!String(r.releasedBy || "").trim()) issues.push(warn("Releaser name missing"));
          if (!dispatched) issues.push(warn("Dispatch not recorded yet"));
        } else if (r.release === "On Hold") {
          issues.push(warn("On hold — not released"));
        } else {
          issues.push(warn("Awaiting QA release"));
        }
        return firstIssue(issues);
      },
    },
  ],
};

/* ───────────────────────── 5. Sanitizers & chemicals ───────────────────────── */
const sanitizerChemicals = {
  type: "sweets_sanitizer_chemicals",
  icon: "🧪",
  label: "Sanitizers & Chemicals",
  desc: "Sanitizer concentration checks + chemical register",
  title: "Sanitizer Concentration & Chemicals Log",
  header: COMMON_HEADER,
  tables: [
    {
      key: "rows",
      title: "Sanitizer concentration checks",
      defaultRows: 5,
      columns: [
        { key: "time", label: "Time", type: "time", autoNow: true, width: 90 },
        { key: "area", label: "Area / Equipment", width: 160 },
        {
          key: "chemical", label: "Sanitizer", options: Object.keys(SANITIZER_RANGES), width: 170, hint: "sets the target range",
          fill: (v) => (SANITIZER_RANGES[v] ? { minPpm: String(SANITIZER_RANGES[v][0]), maxPpm: String(SANITIZER_RANGES[v][1]) } : {}),
        },
        { key: "minPpm", label: "Target Min ppm", type: "number", width: 90 },
        { key: "maxPpm", label: "Target Max ppm", type: "number", width: 90 },
        { key: "ppm", label: "Measured ppm", type: "number", width: 90 },
        { key: "method", label: "Test Method", type: "select", options: ["Test strip", "Test kit", "Meter"], width: 110 },
        { key: "contact", label: "Contact Time (min)", type: "number", width: 90 },
        { key: "action", label: "Corrective Action", width: 170 },
      ],
      check(r) {
        const v = num(r.ppm);
        const lo = num(r.minPpm);
        const hi = num(r.maxPpm);
        if (v === null) return warn("Reading missing");
        let res = ok();
        if (lo !== null && v < lo) res = fail(`${v} ppm (< ${lo})`);
        else if (hi !== null && v > hi) res = fail(`${v} ppm (> ${hi})`);
        else if (lo === null && hi === null) res = warn("No target range");
        if (res.level === "fail" && r.action) return warn(`${res.text} — action taken`);
        return res;
      },
    },
    {
      key: "register",
      title: "Chemicals register",
      defaultRows: 4,
      carry: ["name", "supplier", "use", "foodGrade", "sds", "location", "qty", "expDate", "labelled"],
      columns: [
        { key: "name", label: "Chemical", width: 170 },
        { key: "supplier", label: "Supplier", width: 140 },
        { key: "use", label: "Use", options: ["Sanitizer", "Detergent", "Degreaser", "Hand wash", "Pest control"], width: 130 },
        { key: "foodGrade", label: "Food-Grade Approved", type: "select", options: YES_NO, width: 100 },
        { key: "sds", label: "SDS Available", type: "select", options: YES_NO, width: 90 },
        { key: "location", label: "Storage Location", width: 140 },
        { key: "qty", label: "Qty in Stock", width: 90 },
        { key: "expDate", label: "Expiry Date", type: "date", width: 130 },
        { key: "labelled", label: "Labelled / Locked", type: "select", options: YES_NO, width: 100 },
      ],
      check(r, h) {
        const issues = [];
        if (r.sds === "No") issues.push(fail("No SDS"));
        if (r.foodGrade === "No" && /Sanitizer|Detergent/.test(r.use || "")) issues.push(fail("Not food-grade"));
        if (r.labelled === "No") issues.push(fail("Not labelled / stored away from food"));
        if (r.expDate && h.reportDate && r.expDate < h.reportDate) issues.push(fail("Expired"));
        return firstIssue(issues);
      },
    },
  ],
};

/* ───────────────────────── 6. Preventive maintenance ───────────────────────── */
const preventiveMaintenance = {
  type: "sweets_preventive_maintenance",
  icon: "🛠️",
  label: "Preventive Maintenance",
  desc: "Equipment maintenance, calibration, hygiene clearance",
  title: "Preventive Maintenance Log",
  header: COMMON_HEADER,
  tables: [
    {
      key: "rows",
      title: "Maintenance tasks",
      defaultRows: 5,
      carry: ["equipment", "area", "kind", "task", "freq", "nextDue"],
      columns: [
        { key: "equipment", label: "Equipment", options: ["Oven", "Mixer", "Blast chiller", "Walk-in chiller", "Display chiller", "Freezer", "Sheeter", "Proofer", "Weighing scale", "Thermometer", "Sieve", "Air curtain", "Insect killer (EFK)"], width: 160 },
        { key: "area", label: "Area", width: 120 },
        { key: "kind", label: "Type", type: "select", options: ["Preventive", "Corrective", "Calibration", "Inspection"], width: 110 },
        { key: "task", label: "Task Description", width: 220 },
        { key: "freq", label: "Frequency", type: "select", options: ["Daily", "Weekly", "Monthly", "Quarterly", "Semi-annual", "Annual", "One-off"], width: 110 },
        { key: "doneBy", label: "Done By", width: 130 },
        { key: "status", label: "Status", type: "select", options: ["Done", "Pending", "Not OK"], width: 95 },
        { key: "clearance", label: "Hygiene Clearance", type: "select", options: YES_NO_NA, width: 100, hint: "before restart" },
        { key: "nextDue", label: "Next Due", type: "date", width: 130 },
        { key: "remarks", label: "Remarks", width: 160 },
      ],
      check(r, h) {
        const issues = [];
        if (r.status === "Not OK") issues.push(fail("Equipment not OK"));
        if (r.status === "Pending") issues.push(warn("Pending"));
        if (r.status === "Done" && r.clearance === "No") issues.push(fail("Returned to use without hygiene clearance"));
        if (r.status === "Done" && !r.clearance) issues.push(warn("Clearance not recorded"));
        if (r.nextDue && h.reportDate && r.nextDue < h.reportDate) issues.push(warn("Next due date already passed"));
        return firstIssue(issues);
      },
    },
  ],
};

export const DAILY_LOG_SCHEMAS = [
  rawReceiving,
  bakingCooking,
  coolingDisplay,
  productionBatches,
  sanitizerChemicals,
  preventiveMaintenance,
];

export const schemaByType = (type) => DAILY_LOG_SCHEMAS.find((s) => s.type === type) || null;
