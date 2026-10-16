// src/utils/reportPerms.js
//
// 🔐 Per-report permissions inside a branch — input and view, separately.
//
// The section + branch grants (perms.js / sectionItems.js) decide WHICH
// branch a user can open. Opening QCS used to mean every QCS form and every
// QCS report. This narrows it: an account can be given, say, only the
// "Coolers Temperatures" input, and nothing else of QCS.
//
// ── Storage ────────────────────────────────────────────────────────────────
// One flat list on the account, next to the other per-section lists:
//   allowedBranches.reports = ["QCS:coolers:input", "QCS:coolers:view", …]
// The server stores allowedBranches as given (routes/admin.cjs), so no
// server change.
//
// ── Rule ───────────────────────────────────────────────────────────────────
// • admin / super-admin / full access → everything.
// • NO entry for a branch ("QCS:…") → that branch is not restricted at the
//   report level: every report, as before. Existing accounts keep working.
// • At least one entry for the branch → only the listed report+mode pairs.
//
// Report ids are the VIEW tab keys of the branch's reports hub (the same as
// its ?rtab= links). `input` / `view` = the tab key on each hub; null = that
// report has no tab on that side.

import { getPerms } from "./perms";

export const REPORT_PERMS_KEY = "reports";

export const BRANCH_REPORTS = {
  QCS: [
    { id: "raw_material",      label: "Raw Material Receipt",    input: "shipment",              view: "raw_material" },
    { id: "coolers",           label: "Coolers Temperatures",    input: "coolers",               view: "coolers" },
    { id: "stock_rotation",    label: "Stock Rotation",          input: "stockRotation",         view: "stock_rotation" },
    { id: "ph",                label: "Personal Hygiene",        input: "personalHygiene",       view: "ph" },
    { id: "clean",             label: "Daily Cleanliness",       input: "dailyCleanliness",      view: "clean" },
    { id: "visitor",           label: "Visitor Checklist",       input: "visitorChecklist",      view: "visitor" },
    { id: "fresh",             label: "Fresh Chicken",           input: "qusaisFreshChicken",    view: "fresh" },
    { id: "ftr2_preload",      label: "Meat Inspection FTR 2",   input: "meatInspectionMamzar",  view: "ftr2_preload" },
    { id: "ftr1_preload",      label: "Meat Inspection FTR 1",   input: "meatInspectionMushrif", view: "ftr1_preload" },
    { id: "rm_ing",            label: "Physical — Ingredients",  input: "physical_ing",          view: "rm_ing" },
    { id: "rm_pack",           label: "Physical — Packaging",    input: "physical_pack",         view: "rm_pack" },
    { id: "nc_reports",        label: "Non-Conformance",         input: "nonConformance",        view: "nc_reports" },
    { id: "car_reports",       label: "Corrective Action",       input: "car",                   view: "car_reports" },
    { id: "internal_audit",    label: "Internal Audit",          input: "internalAudit",         view: "internal_audit" },
    { id: "product_rejection", label: "Product Rejection",       input: "productRejection",      view: "product_rejection" },
    { id: "employee_warning",  label: "Employee Warning",        input: "employeeWarning",       view: "employee_warning" },
    { id: "garbage",           label: "Garbage Disposal",        input: "garbageDisposal",       view: "garbage" },
    { id: "meat_waste",        label: "Meat Waste Disposal",     input: "meatWasteDisposal",     view: "meat_waste" },
    { id: "pest_control",      label: "Pest Control",            input: "pestControl",           view: "pest_control" },
    { id: "staff_sickness",    label: "Staff Sickness",          input: "staffSickness",         view: "staff_sickness" },
    { id: "return_to_work",    label: "Return to Work",          input: "returnToWork",          view: "return_to_work" },
    { id: "overview",          label: "Overview (all reports at a glance)", input: null,         view: "overview" },
    { id: "certificates",      label: "Certificates",            input: null,                    view: "certificates" },
  ],
};

/* ── The other branches ───────────────────────────────────────────────────
   Their input hubs (BranchInputLayout / POS6Hub / ProductionHub / POS19Layout)
   and view hubs (BranchDailyView) use different keys for the same report, so
   each row pairs them by hand. `r(id, label, input, view)`; the id is the
   view key when there is one. Keep a row in step when a tab is added. */
const r = (id, label, input, view) => ({ id, label, input, view });
const OVERVIEW = r("overview", "Overview (all reports at a glance)", null, "overview");
const CERTS = r("certificates", "Certificates", null, "certificates");

/* POS 10 and POS 11 share the same forms and keys. */
const POS_10_11 = [
  r("hygiene",      "Personal Hygiene",                  "personal",     "hygiene"),
  r("cleanliness",  "Daily Cleaning",                    "daily",        "cleanliness"),
  r("temperature",  "Temperature",                       "temperature",  "temperature"),
  r("traceability", "Traceability Log",                  "traceability", "traceability"),
  r("receiving",    "Receiving Log",                     "receiving",    "receiving"),
  r("pest",         "Pest Control",                      "pest",         "pest"),
  r("sanitizer",    "Sanitizer Concentration",           "sanitizer",    "sanitizer"),
  r("equipment",    "Equipment Inspection & Sanitizing", "equipment",    "equipment"),
  OVERVIEW, CERTS,
];

const POS19_KEYS = [
  ["receivingLog", "Receiving Log"], ["traceability", "Traceability Log"],
  ["finishedProduct", "Finished Product Monitoring"], ["temperatureMonitoring", "Temperature Monitoring Log"],
  ["foodTempVerification", "Food Temperature Verification"], ["cookingTemperature", "Cooking Temperature Record"],
  ["hotHoldingTemp", "Hot Holding Temperature Log"], ["reheating", "Reheating Temperature Log"],
  ["cooling", "Cooling Temperature Log"], ["defrosting", "Defrosting Record"],
  ["blastFreezer", "Blast Freezer / Chiller Log"], ["dryStore", "Dry Store Temp & Humidity"],
  ["calibration", "Thermometer Calibration Log"], ["cleaningProgramme", "Cleaning Programme Schedule"],
  ["dailyCleaningButchery", "Daily Cleaning — Butchery"], ["equipmentInspection", "Equipment Inspection & Sanitizing"],
  ["sanitizerConcentration", "Sanitizer Concentration"], ["vegSanitation", "Sanitation Record — Veg / Fruits"],
  ["personalHygiene", "Personal Hygiene Checklist"], ["oilQuality", "Oil Quality Monitoring"],
  ["glassItemsCondition", "Glass Items Condition"], ["woodenItemsCondition", "Wooden Items Condition"],
  ["nonConformance", "Non-Conformance Report"], ["staffSickness", "Staff Sickness / Injury"],
  ["employeeReturnToWork", "Employee Return to Work"],
];

/* FTR 1 and FTR 2: same forms; only the cooking-log input key differs. */
const ftr = (cookInput) => [
  r("hygiene",     "Personal Hygiene",    "personal",  "hygiene"),
  r("cleanliness", "Daily Cleanliness",   "daily",     "cleanliness"),
  r("temperature", "Temperature",         "temp",      "temperature"),
  r("oil",         "Oil Calibration",     "oil",       "oil"),
  r("receiving",   "Receiving Log",       "receiving", "receiving"),
  r("cook",        "Cooking Temperature", cookInput,   "cook"),
  OVERVIEW, CERTS,
];

/* POS 24 / POS 26: input forms not built yet, no reports page. */
const PLACEHOLDER_BRANCH = [
  r("personal",  "Personal Hygiene",      "personal",  null),
  r("daily",     "Daily Cleaning",        "daily",     null),
  r("oil",       "Oil Calibration",       "oil",       null),
  r("detergent", "Detergent Calibration", "detergent", null),
];

Object.assign(BRANCH_REPORTS, {
  "POS 6": [
    r("hygiene",   "Personal Hygiene",      "personal",  "hygiene"),
    r("cleaning",  "Cleaning Checklist",    "cleaning",  "cleaning"),
    r("equipment", "Equipment Inspection",  "equipment", "equipment"),
    r("receiving", "Receiving Log",         "receiving", "receiving"),
    r("coolers",   "Coolers Temperatures",  "coolers",   "coolers"),
    OVERVIEW, CERTS,
  ],
  "POS 10": POS_10_11,
  "POS 11": POS_10_11,
  "POS 15": [
    r("hygiene",      "Personal Hygiene",                  "personal",     "hygiene"),
    r("cleanliness",  "Daily Cleaning",                    "daily",        "cleanliness"),
    r("temperature",  "Temperature",                       "temperature",  "temperature"),
    r("receiving",    "Receiving Log",                     "receiving",    "receiving"),
    r("traceability", "Traceability Log",                  "traceability", "traceability"),
    r("equip_sanit",  "Equipment Inspection & Sanitizing", "equip_sanit",  "equip_sanit"),
    r("pest",         "Pest Control",                      "pest",         "pest"),
    r("sanitizer",    "Sanitizer Concentration",           "sanitizer",    "sanitizer"),
    OVERVIEW, CERTS,
  ],
  "POS 19": [...POS19_KEYS.map(([k, label]) => r(k, label, k, k)), OVERVIEW, CERTS],
  "POS 24": PLACEHOLDER_BRANCH,
  "POS 26": PLACEHOLDER_BRANCH,
  "FTR 1": ftr("cook"),
  "FTR 2": ftr("cooklog"),
  PRODUCTION: [
    r("hygiene",       "Personal Hygiene",                  "personal",      "hygiene"),
    r("cleaning",      "Cleaning Checklist",                "cleaning",      "cleaning"),
    r("defrost",       "Defrosting Record",                 "defrost",       "defrost"),
    r("trace",         "Traceability Log",                  "traceability",  "trace"),
    r("cutting",       "Online Cutting Record",             "cutting",       "cutting"),
    r("dried",         "Dried Meat Process",                "dried",         "dried"),
    r("vegSanitation", "Sanitation Record — Veg / Fruits",  "vegSanitation", "vegSanitation"),
    r("sanitizer",     "Sanitizer Concentration",           "sanitizer",     "sanitizer"),
    r("equipment",     "Equipment Inspection & Sanitizing", "equipment",     "equipment"),
    OVERVIEW, CERTS,
  ],
});

/** View hubs name a branch by code ("POS-10", "FTR-1", "PRD"); permissions use the branch id. */
export function permBranchOf(code) {
  const id = String(code || "").replace(/-/g, " ").trim().toUpperCase();
  return id === "PRD" ? "PRODUCTION" : id;
}

export const reportGrantKey = (branch, reportId, mode) => `${branch}:${reportId}:${mode}`;

function grantList() {
  const list = getPerms().allowedBranches?.[REPORT_PERMS_KEY];
  return Array.isArray(list) ? list : [];
}

/** Is this branch restricted at the report level for the current user? */
export function isBranchReportRestricted(branch, list = grantList()) {
  const prefix = `${branch}:`;
  return list.some((k) => String(k).startsWith(prefix));
}

/** May the current user use `mode` ("input" | "view") of report `reportId` in `branch`? */
export function canReport(branch, reportId, mode) {
  const p = getPerms();
  if (p.isAdmin || p.isFullAccess) return true;
  const list = grantList();
  if (!isBranchReportRestricted(branch, list)) return true;
  return list.includes(reportGrantKey(branch, reportId, mode));
}

/** A tab filter for a branch hub: (tabKey) => allowed. `mode` = which hub. */
export function reportTabFilter(branch, mode) {
  const reg = BRANCH_REPORTS[branch] || [];
  const byTab = new Map(reg.filter((r) => r[mode]).map((r) => [r[mode], r.id]));
  return (tabKey) => {
    const id = byTab.get(tabKey);
    // A tab the registry doesn't know is only shown while the branch is unrestricted.
    if (!id) return !isBranchReportRestricted(branch) || getPerms().isAdmin || getPerms().isFullAccess;
    return canReport(branch, id, mode);
  };
}
