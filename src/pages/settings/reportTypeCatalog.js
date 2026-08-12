// src/pages/settings/reportTypeCatalog.js
// Single source of truth mapping a raw report `type` slug → the branch it
// belongs to and its human-readable name.
//
// Extracted verbatim from ExcelBackupTab so other screens (Audit Trail,
// inventories) can name a report without pulling in the Excel exporter
// bundle. ExcelBackupTab still drives its checkboxes from BRANCHES here.

export const BRANCHES = [
  {
    id: "QCS", label: "QCS", emoji: "🏭", accent: "#1e3a5f",
    types: [
      ["qcs-coolers",                            "Coolers"],
      ["qcs-ph",                                 "Personal Hygiene"],
      ["qcs-clean",                              "Daily Cleaning"],
      ["qcs_raw_material",                       "Raw Material"],
      ["pos_al_qusais_fresh_chicken_receiving",  "Fresh Chicken"],
      ["qcs_internal_audit",                     "Internal Audit"],
      ["qcs_non_conformance",                    "Non Conformance"],
      ["qcs_corrective_action",                  "Corrective Action"],
      ["qcs_rm_packaging",                       "RM Packaging"],
      ["qcs_rm_ingredients",                     "RM Ingredients"],
      ["qcs_garbage_disposal",                   "Garbage Disposal"],
      ["qcs_meat_waste_disposal",                "Meat Waste Disposal"],
      ["qcs_pest_control",                       "Pest Control"],
      ["qcs_stock_rotation",                     "Stock Rotation"],
      ["qcs_visitor_checklist",                  "Visitor Checklist"],
      ["qcs_staff_sickness",                     "Staff Sickness"],
      ["qcs_employee_return_to_work",            "Employee Return to Work"],
      ["qcs_product_rejection",                  "Product Rejection"],
      ["ftr1_preloading_inspection",             "FTR 1 – Preloading"],
      ["ftr2_preloading_inspection",             "FTR 2 – Preloading"],
    ],
  },
  {
    id: "FTR1", label: "FTR 1", emoji: "🍗", accent: "#7c3aed",
    types: [
      ["ftr1_temperature",             "Temperature"],
      ["ftr1_personal_hygiene",        "Personal Hygiene"],
      ["ftr1_oil_calibration",         "Oil Calibration"],
      ["ftr1_daily_cleanliness",       "Daily Cleanliness"],
      ["ftr1_cooking_temperature_log", "Cooking Temperature Log"],
      ["ftr1_receiving_log_butchery",  "Receiving Log"],
      ["ftr1_preloading_inspection",   "Preloading Inspection"],
    ],
  },
  {
    id: "FTR2", label: "FTR 2", emoji: "🍗", accent: "#5b21b6",
    types: [
      ["ftr2_temperature",             "Temperature"],
      ["ftr2_personal_hygiene",        "Personal Hygiene"],
      ["ftr2_oil_calibration",         "Oil Calibration"],
      ["ftr2_daily_cleanliness",       "Daily Cleanliness"],
      ["ftr2_cooking_temperature_log", "Cooking Temperature Log"],
      ["ftr2_receiving_log_butchery",  "Receiving Log"],
      ["ftr2_preloading_inspection",   "Preloading Inspection"],
    ],
  },
  {
    id: "POS10", label: "POS 10", emoji: "🏪", accent: "#059669",
    types: [
      ["pos10_temperature",            "Temperature"],
      ["pos10_daily_cleanliness",      "Daily Cleanliness"],
      ["pos10_personal_hygiene",       "Personal Hygiene"],
      ["pos10_calibration_log",        "Calibration"],
      ["pos10_pest_control",           "Pest Control"],
      ["pos10_receiving_log_butchery", "Receiving Log"],
      ["pos10_traceability_log",       "Traceability"],
    ],
  },
  {
    id: "POS11", label: "POS 11", emoji: "🏪", accent: "#0891b2",
    types: [
      ["pos11_temperature",            "Temperature"],
      ["pos11_daily_cleanliness",      "Daily Cleanliness"],
      ["pos11_personal_hygiene",       "Personal Hygiene"],
      ["pos11_calibration_log",        "Calibration"],
      ["pos11_pest_control",           "Pest Control"],
      ["pos11_receiving_log_butchery", "Receiving Log"],
    ],
  },
  {
    id: "POS15", label: "POS 15", emoji: "🏪", accent: "#d97706",
    types: [
      ["pos15_temperature",                "Temperature"],
      ["pos15_daily_cleanliness",          "Daily Cleanliness"],
      ["pos15_personal_hygiene",           "Personal Hygiene"],
      ["pos15_pest_control",               "Pest Control"],
      ["pos15_receiving_log_butchery",     "Receiving Log"],
      ["pos15_traceability_log",           "Traceability"],
      ["pos15_equipment_inspection",       "Equipment Inspection"],
    ],
  },
  {
    id: "POS19", label: "POS 19", emoji: "🏪", accent: "#be185d",
    types: [
      ["pos19_cleaning_programme_schedule",   "Cleaning Programme Schedule"],
      ["pos19_daily_cleaning",                "Daily Cleaning – Butchery"],
      ["pos19_equipment_inspection",          "Equipment Inspection & Sanitizing"],
      ["pos19_food_temperature_verification", "Food Temperature Verification"],
      ["pos19_glass_items_condition",         "Glass Items Condition Monitoring"],
      ["pos19_hot_holding_temperature",       "Hot Holding Temperature Log"],
      ["pos19_oil_quality_monitoring",        "Oil Quality Monitoring"],
      ["pos19_personal_hygiene",              "Personal Hygiene Checklist"],
      ["pos19_receiving_log_butchery",        "Receiving Log"],
      ["pos19_sanitizer_concentration",       "Sanitizer Concentration Log"],
      ["pos19_temperature_monitoring",        "Temperature Monitoring Log"],
      ["pos19_traceability_log",              "Traceability Log"],
      ["pos19_wooden_items_condition",        "Wooden Items Condition Monitoring"],
      ["pos19_cooking_temperature",           "Cooking Temperature Record"],
      ["pos19_defrosting_record",             "Defrosting Record"],
      ["pos19_cooling_log",                   "Cooling Temperature Log"],
      ["pos19_reheating_log",                 "Reheating Temperature Log"],
      ["pos19_calibration_log",               "Thermometer Calibration Log"],
      ["pos19_blast_freezer_ccp",             "Blast Freezer / Chiller Log (CCP)"],
      ["pos19_veg_sanitation_ccp",            "Sanitation Record (CCP) – Veg/Fruits"],
      ["pos19_dry_store_temp_humidity",       "Dry Store Temp & Humidity"],
      ["pos19_finished_product_monitoring",   "Finished Product Monitoring"],
      ["pos19_non_conformance",               "Non-Conformance Report"],
      ["pos19_staff_sickness",                "Staff Sickness / Occupational Injury"],
      ["pos19_employee_return_to_work",       "Employee Return to Work"],
    ],
  },
  {
    id: "PRODUCTION", label: "Production", emoji: "⚙️", accent: "#dc2626",
    types: [
      ["prod_cleaning_checklist", "Cleaning Checklist"],
      ["prod_personal_hygiene",   "Personal Hygiene"],
      ["prod_defrosting_record",  "Defrosting Record"],
      ["prd_traceability_log",    "Traceability Log"],
      ["prod_online_cutting",     "Online Cutting Record"],
      ["prod_dried_meat",         "Dried Meat Process"],
    ],
  },
  {
    id: "HACCP_ISO", label: "HACCP & ISO", emoji: "📋", accent: "#0f172a",
    types: [
      ["ccp_monitoring_record",            "CCP Monitoring Record"],
      ["calibration_record",               "Calibration Record"],
      ["internal_calibration_record",      "Internal Calibration"],
      ["mock_recall_drill",                "Mock Recall Drill"],
      ["real_recall",                      "Real Recall"],
      ["product_withdrawal",               "Product Withdrawal"],
      ["mrm_record",                       "MRM Record"],
      ["fsms_communication_log",           "FSMS Communication Log"],
      ["customer_complaint",               "Customer Complaint"],
      ["internal_audit_record",            "Internal Audit"],
      ["continual_improvement",            "Continual Improvement"],
      ["glass_register_item",              "Glass Register"],
      ["fsms_risk_register_item",          "FSMS Risk Register"],
      ["fsms_opportunity_register_item",   "FSMS Opportunities"],
      ["fsms_change_management_log_item",  "Change Management Log"],
      ["fsms_food_defense_item",           "Food Defense Plan (TACCP/VACCP)"],
      ["fsms_objective",                   "FSMS Objectives"],
    ],
  },
  {
    id: "HSE", label: "HSE", emoji: "HSE", accent: "#ea580c",
    types: [
      ["hse_incident_reports",             "F-01 Incident / Near-Miss"],
      ["hse_risk_register",                "F-02 Risk Register"],
      ["hse_work_permits",                 "F-07 Work Permits"],
      ["hse_cleaning_log",                 "F-10 Cleaning & Sanitation"],
      ["hse_microbiological_swabs",        "F-11 Microbiological Swabs"],
      ["hse_pest_control_log",             "F-12 Pest Control"],
      ["hse_equipment_maintenance",        "F-13/F-18 Equipment Maintenance"],
      ["hse_fire_equipment_inspections",   "F-14 Fire Equipment"],
      ["hse_forklift_inspections",         "F-15 Forklift Inspections"],
      ["hse_toolbox_meetings",             "F-16 Toolbox Meetings"],
      ["hse_evacuation_drills",            "F-17 Evacuation Drills"],
      ["hse_waste_disposal_log",           "F-19 Waste Disposal"],
      ["hse_capa_tracker",                 "F-20 CAPA Tracker"],
      ["hse_monthly_safety_reports",       "F-21 Monthly Safety Reports"],
      ["hse_ncr_reports",                  "F-26 NCR Reports"],
      ["hse_licenses_certs",               "Licenses & Certificates"],
      ["hse_policies_status",              "Policies Status"],
      ["hse_sops_status",                  "SOPs Status"],
      ["hse_training_records",             "Training Records"],
      ["hse_ppe_issue_log",                "PPE Issue Log"],
      ["hse_emergency_contacts",           "Emergency Contacts"],
      ["hse_welfare_checks",               "Worker Welfare Checks"],
    ],
  },
  {
    id: "OHC", label: "OHC", emoji: "🩺", accent: "#0d9488",
    types: [
      ["ohc_certificate",            "OHC Certificates"],
    ],
  },
  {
    id: "TRAINING", label: "Training", emoji: "🎓", accent: "#9333ea",
    types: [
      ["training_certificate",       "Training Certificates"],
      ["training_session",           "Training Sessions"],
      ["training_quiz",              "Training Quizzes"],
    ],
  },
  {
    id: "INSPECTION", label: "Inspection", emoji: "🔎", accent: "#ea580c",
    types: [
      ["municipality_inspection",    "Municipality Inspection"],
    ],
  },
  {
    id: "FLEET", label: "Fleet (Cars)", emoji: "🚚", accent: "#0369a1",
    types: [
      ["car_approvals",              "Car Approvals"],
      ["cars_loading_inspection",    "Loading Inspection"],
      ["truck_daily_cleaning",       "Truck Daily Cleaning"],
      ["maintenance",                "Maintenance Requests"],
    ],
  },
  {
    id: "RETURNS", label: "المرتجعات", emoji: "↩️", accent: "#9333ea",
    types: [
      ["returns",                    "Branch Returns Reports"],
      ["meat_daily",                 "Meat Daily Inspection"],
      ["returns_customers",          "Customer Returns"],
      ["inventory_daily_grouped",    "Inventory Daily (Grouped)"],
      ["enoc_returns",               "ENOC Returns"],
      ["destruction_record",         "Condemnation & Disposal"],
    ],
  },
];


/* type slug → { label, branch, emoji, accent }. First match wins — a few
   types (e.g. ftr*_preloading_inspection) are listed under two branches. */
const BY_TYPE = new Map();
for (const b of BRANCHES) {
  for (const [type, label] of b.types) {
    if (!BY_TYPE.has(type)) {
      BY_TYPE.set(type, { label, branch: b.label, emoji: b.emoji, accent: b.accent });
    }
  }
}

/** Turn a raw slug into a readable fallback: "pos19_cooking_temperature"
    → "Pos19 Cooking Temperature". */
function prettifySlug(type) {
  return String(type || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Describe a report type for display.
 * Always returns an object — unknown types fall back to a prettified slug
 * so the UI never shows a bare database identifier on its own.
 */
export function describeReportType(type) {
  const hit = BY_TYPE.get(type);
  if (hit) return { ...hit, type, known: true };
  return {
    label: prettifySlug(type) || "Unknown report",
    branch: "",
    emoji: "📄",
    accent: "#64748b",
    type,
    known: false,
  };
}
