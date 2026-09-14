// src/pages/settings/reportTypeCatalog.js
// Single source of truth mapping a raw report `type` slug → where it lives in
// the system and what it is called.
//
// Three levels, and they deliberately mirror what the user sees on screen:
//
//   CARD    → a tile on the dashboard  ("Daily Monitor", "ISO & HACCP", "HSE")
//   BRANCH  → a site or a module inside that card  ("POS 19", "QCS", "MRP")
//   GROUP   → the heading a report sits under inside that branch (optional)
//
// The Excel backup turns exactly these three levels into ZIP folders, so a
// person who unzips the backup walks the same tree they navigate in the app.
// Everything else (Data Inventory, Bulk Export, Date Tree, Audit Trail) reads
// the same list, so a type added here shows up everywhere at once.
//
// A `type` slug missing from this file is invisible to EVERY backup and
// inventory screen. When a new report type is introduced, add it here in the
// same commit.

/* ═══════════════════════════════════════════════════════════════
   CARDS — the dashboard tiles, in dashboard order.
   `order` drives the numeric prefix on the ZIP folder so a plain
   folder listing sorts the way the dashboard does.
   ═══════════════════════════════════════════════════════════════ */
export const CARDS = [
  { id: "inspector",        label: "Inspection",        emoji: "🔍", order: 1 },
  { id: "daily",            label: "Daily Monitor",     emoji: "📅", order: 2 },
  { id: "qcsView",          label: "QCS Shipments",     emoji: "📦", order: 3 },
  { id: "ohc",              label: "OHC",               emoji: "🩺", order: 4 },
  { id: "returns",          label: "Returns",           emoji: "♻️", order: 5 },
  { id: "finalProduct",     label: "Final Product",     emoji: "🏷️", order: 6 },
  { id: "cars",             label: "Cars",              emoji: "🚗", order: 7 },
  { id: "maintenance",      label: "Maintenance",       emoji: "🔧", order: 8 },
  { id: "training",         label: "Training Certs",    emoji: "🎓", order: 9 },
  { id: "internalTraining", label: "Internal Training", emoji: "📚", order: 10 },
  { id: "iso",              label: "ISO & HACCP",       emoji: "📘", order: 11 },
  { id: "hse",              label: "HSE",               emoji: "🦺", order: 12 },
  { id: "inventory",        label: "Inventory",         emoji: "📦", order: 13 },
  { id: "emailCenter",      label: "Email Center",      emoji: "📨", order: 14 },
  { id: "settings",         label: "Settings",          emoji: "⚙️", order: 15 },
];

const CARD_BY_ID = new Map(CARDS.map((c) => [c.id, c]));

/** Card descriptor for an id — never null, so callers do not have to branch. */
export function cardById(id) {
  return CARD_BY_ID.get(id) || { id: id || "other", label: "Other", emoji: "📄", order: 99 };
}

/* ═══════════════════════════════════════════════════════════════
   BRANCHES — each one belongs to a card.

   `types` entries are [slug, label] or [slug, label, group].
   The third element is optional on purpose: only branches big enough
   to need an extra shelf (QCS, POS 19, ISO, HSE, Returns) carry groups,
   and the two-element form keeps every existing `([k, lbl]) => …` caller
   working untouched.
   ═══════════════════════════════════════════════════════════════ */
export const BRANCHES = [
  /* ─────────────── Inspection ─────────────── */
  {
    id: "INSPECTION", card: "inspector", label: "Inspection", emoji: "🔎", accent: "#ea580c",
    types: [
      ["municipality_inspection",       "Municipality Inspection"],
      ["inspection_annual_plan",        "Annual Inspection Plan"],
      ["internal_multi_audit",          "Internal Multi-Branch Audit"],
      ["supervisor_corrective_action",  "Supervisor Corrective Action"],
    ],
  },

  /* ─────────────── Daily Monitor ─────────────── */
  {
    id: "QCS", card: "daily", label: "QCS", emoji: "🏭", accent: "#1e3a5f",
    types: [
      ["qcs_raw_material",                       "Raw Material Receipt",         "Receiving & Raw Material"],
      ["pos_al_qusais_fresh_chicken_receiving",  "Fresh Chicken Receiving",      "Receiving & Raw Material"],
      ["qcs_rm_packaging",                       "RM Packaging",                 "Receiving & Raw Material"],
      ["qcs_rm_ingredients",                     "RM Ingredients",               "Receiving & Raw Material"],
      ["qcs-coolers",                            "Coolers Temperature",          "Monitoring"],
      ["qcs_stock_rotation",                     "Stock Rotation",               "Monitoring"],
      ["qcs-ph",                                 "Personal Hygiene",             "Hygiene & Cleaning"],
      ["qcs-clean",                              "Daily Cleaning",               "Hygiene & Cleaning"],
      ["qcs_garbage_disposal",                   "Garbage Disposal",             "Waste & Pest"],
      ["qcs_meat_waste_disposal",                "Meat Waste Disposal",          "Waste & Pest"],
      ["qcs_pest_control",                       "Pest Control",                 "Waste & Pest"],
      ["qcs_internal_audit",                     "Internal Audit",               "Quality & Audit"],
      ["qcs_non_conformance",                    "Non Conformance",              "Quality & Audit"],
      ["qcs_corrective_action",                  "Corrective Action",            "Quality & Audit"],
      ["qcs_product_rejection",                  "Product Rejection",            "Quality & Audit"],
      ["qcs_visitor_checklist",                  "Visitor Checklist",            "People & Visitors"],
      ["qcs_staff_sickness",                     "Staff Sickness",               "People & Visitors"],
      ["qcs_employee_return_to_work",            "Employee Return to Work",      "People & Visitors"],
      ["ftr1_preloading_inspection",             "FTR 1 - Preloading",           "Food Truck Preloading"],
      ["ftr2_preloading_inspection",             "FTR 2 - Preloading",           "Food Truck Preloading"],
      ["qcs_coolers_config",                     "Cooler Definitions (config)",  "Settings"],
    ],
  },
  {
    id: "FTR1", card: "daily", label: "FTR 1", emoji: "🍗", accent: "#7c3aed",
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
    id: "FTR2", card: "daily", label: "FTR 2", emoji: "🍗", accent: "#5b21b6",
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
    id: "POS6", card: "daily", label: "POS 6", emoji: "🏪", accent: "#0284c7",
    types: [
      ["pos6_coolers_temperature",    "Coolers Temperatures"],
      ["pos6_personal_hygiene",       "Personal Hygiene"],
      ["pos6_cleaning_checklist",     "Cleaning Checklist"],
      ["pos6_equipment_inspection",   "Equipment Inspection"],
      ["pos6_receiving_log_butchery", "Receiving Log"],
    ],
  },
  {
    id: "POS10", card: "daily", label: "POS 10", emoji: "🏪", accent: "#059669",
    types: [
      ["pos10_temperature",             "Temperature"],
      ["pos10_daily_cleanliness",       "Daily Cleanliness"],
      ["pos10_personal_hygiene",        "Personal Hygiene"],
      ["pos10_calibration_log",         "Calibration (archive)"],
      ["pos10_pest_control",            "Pest Control"],
      ["pos10_receiving_log_butchery",  "Receiving Log"],
      ["pos10_traceability_log",        "Traceability"],
      ["pos10_equipment_inspection",    "Equipment Inspection & Sanitizing"],
      ["pos10_sanitizer_concentration", "Sanitizer Concentration"],
    ],
  },
  {
    id: "POS11", card: "daily", label: "POS 11", emoji: "🏪", accent: "#0891b2",
    types: [
      ["pos11_temperature",             "Temperature"],
      ["pos11_daily_cleanliness",       "Daily Cleanliness"],
      ["pos11_personal_hygiene",        "Personal Hygiene"],
      ["pos11_calibration_log",         "Calibration"],
      ["pos11_pest_control",            "Pest Control"],
      ["pos11_receiving_log_butchery",  "Receiving Log"],
      ["pos11_traceability_log",        "Traceability"],
      ["pos11_equipment_inspection",    "Equipment Inspection & Sanitizing"],
      ["pos11_sanitizer_concentration", "Sanitizer Concentration"],
    ],
  },
  {
    id: "POS15", card: "daily", label: "POS 15", emoji: "🏪", accent: "#d97706",
    types: [
      ["pos15_temperature",             "Temperature"],
      ["pos15_daily_cleanliness",       "Daily Cleanliness"],
      ["pos15_personal_hygiene",        "Personal Hygiene"],
      ["pos15_pest_control",            "Pest Control"],
      ["pos15_receiving_log_butchery",  "Receiving Log"],
      ["pos15_traceability_log",        "Traceability"],
      ["pos15_equipment_inspection",    "Equipment Inspection"],
      ["pos15_sanitizer_concentration", "Sanitizer Concentration"],
    ],
  },
  {
    id: "POS19", card: "daily", label: "POS 19", emoji: "🏪", accent: "#be185d",
    types: [
      ["pos19_temperature_monitoring",        "Temperature Monitoring Log",            "Temperature & CCP"],
      ["pos19_food_temperature_verification", "Food Temperature Verification",         "Temperature & CCP"],
      ["pos19_cooking_temperature",           "Cooking Temperature Record",            "Temperature & CCP"],
      ["pos19_cooling_log",                   "Cooling Temperature Log",               "Temperature & CCP"],
      ["pos19_reheating_log",                 "Reheating Temperature Log",             "Temperature & CCP"],
      ["pos19_hot_holding_temperature",       "Hot Holding Temperature Log",           "Temperature & CCP"],
      ["pos19_blast_freezer_ccp",             "Blast Freezer - Chiller Log (CCP)",     "Temperature & CCP"],
      ["pos19_veg_sanitation_ccp",            "Sanitation Record (CCP) - Veg & Fruits", "Temperature & CCP"],
      ["pos19_dry_store_temp_humidity",       "Dry Store Temp & Humidity",             "Temperature & CCP"],
      ["pos19_defrosting_record",             "Defrosting Record",                     "Temperature & CCP"],
      ["pos19_cleaning_programme_schedule",   "Cleaning Programme Schedule",           "Cleaning & Hygiene"],
      ["pos19_daily_cleaning",                "Daily Cleaning - Butchery",             "Cleaning & Hygiene"],
      ["pos19_personal_hygiene",              "Personal Hygiene Checklist",            "Cleaning & Hygiene"],
      ["pos19_sanitizer_concentration",       "Sanitizer Concentration Log",           "Cleaning & Hygiene"],
      ["pos19_receiving_log_butchery",        "Receiving Log",                         "Receiving & Traceability"],
      ["pos19_traceability_log",              "Traceability Log",                      "Receiving & Traceability"],
      ["pos19_finished_product_monitoring",   "Finished Product Monitoring",           "Receiving & Traceability"],
      ["pos19_equipment_inspection",          "Equipment Inspection & Sanitizing",     "Equipment & Materials"],
      ["pos19_calibration_log",               "Thermometer Calibration Log",           "Equipment & Materials"],
      ["pos19_glass_items_condition",         "Glass Items Condition Monitoring",      "Equipment & Materials"],
      ["pos19_wooden_items_condition",        "Wooden Items Condition Monitoring",     "Equipment & Materials"],
      ["pos19_oil_quality_monitoring",        "Oil Quality Monitoring",                "Equipment & Materials"],
      ["pos19_non_conformance",               "Non-Conformance Report",                "People & Incidents"],
      ["pos19_staff_sickness",                "Staff Sickness - Occupational Injury",  "People & Incidents"],
      ["pos19_employee_return_to_work",       "Employee Return to Work",               "People & Incidents"],
    ],
  },
  {
    id: "PRODUCTION", card: "daily", label: "Production", emoji: "⚙️", accent: "#dc2626",
    types: [
      ["prod_cleaning_checklist",      "Cleaning Checklist"],
      ["prod_personal_hygiene",        "Personal Hygiene"],
      ["prod_defrosting_record",       "Defrosting Record"],
      ["prd_traceability_log",         "Traceability Log"],
      ["prod_online_cutting",          "Online Cutting Record"],
      ["prod_dried_meat",              "Dried Meat Process"],
      ["prod_equipment_inspection",    "Equipment Inspection & Sanitizing"],
      ["prod_sanitizer_concentration", "Sanitizer Concentration"],
      ["prod_veg_sanitation_ccp",      "Sanitation Record (CCP) - Veg & Fruits"],
    ],
  },

  /* ─────────────── QCS Shipments ─────────────── */
  {
    id: "SHIPMENTS", card: "qcsView", label: "QCS Shipments", emoji: "📦", accent: "#4338ca",
    types: [
      ["qcs_raw_material",      "Raw Material Inspection (Shipments)"],
      ["qcs_supplier",          "Suppliers Master List"],
      ["qcs_shipment_types_v1", "Shipment Types (config)"],
    ],
  },

  /* ─────────────── OHC ─────────────── */
  {
    id: "OHC", card: "ohc", label: "OHC", emoji: "🩺", accent: "#0d9488",
    types: [
      ["ohc_certificate", "OHC Certificates"],
    ],
  },

  /* ─────────────── Returns ─────────────── */
  {
    id: "RETURNS", card: "returns", label: "Returns", emoji: "↩️", accent: "#9333ea",
    types: [
      ["returns",                   "Branch Returns Reports",       "Branch Returns"],
      ["returns_changes",           "Branch Returns - Change Log",  "Branch Returns"],
      ["meat_daily",                "Meat Daily Inspection",        "Branch Returns"],
      ["returns_customers",         "Customer Returns",             "Customer Returns"],
      ["returns_customers_changes", "Customer Returns - Change Log", "Customer Returns"],
      ["inventory_daily_grouped",   "Inventory Daily (Grouped)",    "Inventory & ENOC"],
      ["enoc_returns",              "ENOC Returns",                 "Inventory & ENOC"],
      ["destruction_record",        "Condemnation & Disposal",      "Condemnation & Disposal"],
      ["odoo_disposal_log",         "Odoo Disposal Log (Monthly)",  "Condemnation & Disposal"],
      ["disposal_compare_config",   "Disposal Compare Settings (config)", "Condemnation & Disposal"],
      ["returns_report_template",   "Returns Report Template (config)",   "Settings"],
      ["returns_report_log",        "Returns Report Send Log",            "Settings"],
    ],
  },

  /* ─────────────── Final Product ─────────────── */
  {
    id: "FINAL_PRODUCT", card: "finalProduct", label: "Final Product", emoji: "🏷️", accent: "#be185d",
    types: [
      ["finished_products_report", "Finished Products Report"],
    ],
  },

  /* ─────────────── Cars ─────────────── */
  {
    id: "FLEET", card: "cars", label: "Fleet (Cars)", emoji: "🚚", accent: "#0369a1",
    types: [
      ["car_approvals",           "Car Approvals",        "Forms"],
      ["cars_loading_inspection", "Loading Inspection",   "Forms"],
      ["truck_daily_cleaning",    "Truck Daily Cleaning", "Forms"],
      ["cars_loading_lookup_driver_names",          "Driver Names (lookup)",    "Lookups"],
      ["cars_loading_lookup_vehicle_numbers",       "Vehicle Numbers (lookup)", "Lookups"],
      ["truck_daily_cleaning_lookup_truck_numbers", "Truck Numbers (lookup)",   "Lookups"],
    ],
  },

  /* ─────────────── Maintenance ─────────────── */
  {
    id: "MAINTENANCE", card: "maintenance", label: "Maintenance", emoji: "🔧", accent: "#b91c1c",
    types: [
      ["maintenance", "Maintenance Requests"],
    ],
  },

  /* ─────────────── Training Certificates ─────────────── */
  {
    id: "TRAINING_CERTS", card: "training", label: "Training Certificates", emoji: "🎓", accent: "#9333ea",
    types: [
      ["training_certificate", "Training Certificates"],
    ],
  },

  /* ─────────────── Internal Training ─────────────── */
  {
    id: "INTERNAL_TRAINING", card: "internalTraining", label: "Internal Training", emoji: "📚", accent: "#7e22ce",
    types: [
      ["training_session",     "Training Sessions",    "Records"],
      ["training_quiz",        "Training Quizzes",     "Records"],
      ["training_annual_plan", "Training Annual Plan", "Records"],
      ["training_questions",   "Question Banks (config)",    "Settings"],
      ["training_reference",   "Reference Library (config)", "Settings"],
      ["training_settings",    "Training Settings (config)", "Settings"],
      ["training_config",      "Training Config (legacy)",   "Settings"],
    ],
  },

  /* ─────────────── ISO & HACCP ───────────────
     Groups follow the order of the tiles on HaccpIsoMenu.jsx. */
  {
    id: "HACCP_ISO", card: "iso", label: "HACCP & ISO", emoji: "📋", accent: "#0f172a",
    types: [
      ["haccp_manual_overrides",          "FSMS Manual Overrides",              "Manual & Policy"],
      ["haccp_manual_bookmarks",          "FSMS Manual Bookmarks",              "Manual & Policy"],
      ["policy_acknowledgment",           "Food Safety Policy Acknowledgments", "Manual & Policy"],
      ["fsms_risk_register_item",         "FSMS Risk Register",                 "Risk & Opportunity"],
      ["fsms_opportunity_register_item",  "FSMS Opportunity Register",          "Risk & Opportunity"],
      ["fsms_change_management_log_item", "Change Management Log",              "Risk & Opportunity"],
      ["fsms_food_defense_item",          "Food Defense Plan (TACCP-VACCP)",    "Risk & Opportunity"],
      ["product_details",                 "Product Details & Specifications",   "Product & Kitchen"],
      ["kitchen_menu_nutrition_item",     "Kitchen Menu Calories & Nutrition",  "Product & Kitchen"],
      ["licenses_contracts",              "Licenses & Contracts",               "Licenses & Legal"],
      ["legal_register",                  "Legal Register",                     "Licenses & Legal"],
      ["municipality_inspection",         "Dubai Municipality Inspection",      "Licenses & Legal"],
      ["qcs_supplier",                    "Approved Suppliers List",            "Suppliers"],
      ["supplier_self_assessment_form",   "Supplier Self-Assessment",           "Suppliers"],
      ["supplier_performance",            "Supplier Performance Criteria",      "Suppliers"],
      ["service_provider_performance",    "Service Provider Performance",       "Suppliers"],
      ["sop_employee_acknowledgement",    "SOP Employee Acknowledgements",      "Documents"],
      ["sop_training_evidence",           "SOP Training Evidence",              "Documents"],
      ["sop_implementation_evidence",     "SOP Implementation Evidence",        "Documents"],
      ["document_metadata",               "Document Register Metadata",         "Documents"],
      ["glass_register_item",             "Glass & Brittle Plastic Register",   "Glass & Brittle"],
      ["mock_recall_drill",               "Mock Recall Drill",                  "Recall & Withdrawal"],
      ["real_recall",                     "Real Product Recall",                "Recall & Withdrawal"],
      ["product_withdrawal",              "Product Withdrawal",                 "Recall & Withdrawal"],
      ["mock_recall_config",              "Mock Recall Settings (config)",      "Recall & Withdrawal"],
      ["water_testing_log",               "Water & Ice Testing Log",            "Monitoring & CCP"],
      ["ccp_monitoring_record",           "CCP Monitoring Record",              "Monitoring & CCP"],
      ["ccp_catalog_config",              "CCP Catalog (config)",               "Monitoring & CCP"],
      ["fsms_objective",                  "FSMS Objectives",                    "Objectives & Improvement"],
      ["customer_complaint",              "Customer Complaints",                "Objectives & Improvement"],
      ["fsms_communication_log",          "FSMS Communication Log",             "Objectives & Improvement"],
      ["continual_improvement",           "Continual Improvement",              "Objectives & Improvement"],
      ["mrm_record",                      "Management Review (MRM)",            "Reviews & Audits"],
      ["internal_audit_record",           "Internal Audit",                     "Reviews & Audits"],
      ["calibration_record",              "Calibration Record",                 "Calibration"],
      ["internal_calibration_record",     "Internal Calibration",               "Calibration"],
    ],
  },

  /* ─────────────── HSE ───────────────
     Groups follow the group headings on HSEMenu.jsx. */
  {
    id: "HSE", card: "hse", label: "HSE", emoji: "🦺", accent: "#ea580c",
    types: [
      ["hse_policies_status",            "Policies Status",                       "Policies & Procedures"],
      ["hse_sops_status",                "SOPs Status",                           "Policies & Procedures"],
      ["hse_risk_register",              "F-02 Risk Register",                    "Policies & Procedures"],
      ["hse_risk_register_doc",          "F-02 Risk Register (document header)",  "Policies & Procedures"],
      ["hse_incident_reports",           "F-01 Incident - Near-Miss",             "Operational Forms"],
      ["hse_ncr_reports",                "F-26 NCR Reports",                      "Operational Forms"],
      ["hse_welfare_checks",             "Worker Welfare Checks",                 "Operational Forms"],
      ["hse_work_permits",               "F-07 Work Permits",                     "Operational Forms"],
      ["hse_cleaning_log",               "F-10 Cleaning & Sanitation",            "Operational Forms"],
      ["hse_microbiological_swabs",      "F-11 Microbiological Swabs",            "Operational Forms"],
      ["hse_pest_control_log",           "F-12 Pest Control",                     "Operational Forms"],
      ["hse_equipment_maintenance",      "F-13 & F-18 Equipment Maintenance",     "Operational Forms"],
      ["hse_evacuation_drills",          "F-17 Evacuation Drills",                "Operational Forms"],
      ["hse_ppe_issue_log",              "PPE Issue Log",                         "Operational Forms"],
      ["hse_waste_disposal_log",         "F-19 Waste Disposal",                   "Operational Forms"],
      ["hse_capa_tracker",               "F-20 CAPA Tracker",                     "Operational Forms"],
      ["hse_fire_equipment_inspections", "F-14 Fire Equipment",                   "Fire Safety"],
      ["hse_emergency_contacts",         "Emergency Contacts",                    "Fire Safety"],
      ["hse_forklift_inspections",       "F-15 Forklift Inspections",             "Equipment"],
      ["hse_toolbox_meetings",           "F-16 Toolbox Meetings",                 "Training & Compliance"],
      ["hse_training_records",           "Training Records",                      "Training & Compliance"],
      ["hse_licenses_certs",             "Licenses & Certificates",               "Training & Compliance"],
      ["hse_monthly_safety_reports",     "F-21 Monthly Safety Reports",           "Periodic Reports"],
    ],
  },

  /* ─────────────── Inventory (Butcher / MRP / Workforce) ─────────────── */
  {
    id: "BUTCHER", card: "inventory", label: "Butcher", emoji: "🔪", accent: "#b45309",
    types: [
      ["butcher_cut_log",  "Cutting Log"],
      ["butcher_day_plan", "Daily Cutting Plan"],
      ["butcher_config",   "Butcher Settings (config)"],
    ],
  },
  {
    id: "MRP", card: "inventory", label: "MRP (Items & BOMs)", emoji: "🏭", accent: "#92400e",
    types: [
      ["mrp_work_order", "Work Orders"],
      ["mrp_stock_move", "Stock Moves"],
      ["mrp_audit_log",  "MRP Change Log"],
      ["mrp_config",     "Item Master & BOMs (config)"],
    ],
  },
  {
    id: "WORKFORCE", card: "inventory", label: "Workforce", emoji: "👥", accent: "#7c3aed",
    types: [
      ["workforce_config", "Workforce (config)"],
    ],
  },
  {
    id: "PRODUCTS", card: "inventory", label: "Products Catalog", emoji: "🏷️", accent: "#0d9488",
    types: [
      ["products_list", "Products Catalog (config)"],
    ],
  },

  /* ─────────────── Email Center ─────────────── */
  {
    id: "EMAIL", card: "emailCenter", label: "Email Center", emoji: "📨", accent: "#1d4ed8",
    types: [
      ["qcs_email_contact",  "Mail Contacts (config)"],
      ["qcs_email_settings", "Mail Settings (config)"],
      ["qcs_email_template", "Mail Templates (config)"],
    ],
  },

  /* ─────────────── Settings ─────────────── */
  {
    id: "SYSTEM", card: "settings", label: "System Configuration", emoji: "⚙️", accent: "#475569",
    types: [
      ["staff_directory",           "Staff Directory (config)"],
      ["shelf_life_config",         "Shelf Life Rules (config)"],
      ["account_groups",            "Account Groups (config)"],
      ["admin_notification_config", "Notification Settings (config)"],
      ["settings_audit_log",        "Settings Change Log"],
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════
   DERIVED LOOKUPS
   ═══════════════════════════════════════════════════════════════ */

/* type slug → descriptor. First match wins — a handful of types are listed
   under two cards on purpose (the FTR pre-loading sheets are entered at QCS
   and reviewed at the truck; the DM inspection appears under Inspection and
   under ISO), exactly as the screens present them. */
const BY_TYPE = new Map();
for (const b of BRANCHES) {
  for (const [type, label, group] of b.types) {
    if (!BY_TYPE.has(type)) {
      BY_TYPE.set(type, {
        label,
        branch: b.label,
        branchId: b.id,
        card: b.card,
        cardLabel: cardById(b.card).label,
        group: group || "",
        emoji: b.emoji,
        accent: b.accent,
      });
    }
  }
}

/** Every distinct slug in the catalog, de-duplicated. */
export const ALL_TYPES = [...BY_TYPE.keys()];

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
    branchId: "",
    card: "",
    cardLabel: "",
    group: "",
    emoji: "📄",
    accent: "#64748b",
    type,
    known: false,
  };
}

/** True when the slug has a home in the catalog. */
export function isKnownType(type) {
  return BY_TYPE.has(type);
}

/* ═══════════════════════════════════════════════════════════════
   TREE — the shape the backup ZIP mirrors.
   ═══════════════════════════════════════════════════════════════ */

/** Branches of one card, in catalog order. */
export function branchesOfCard(cardId) {
  return BRANCHES.filter((b) => b.card === cardId);
}

/** Cards that actually own at least one branch, in dashboard order. */
export function activeCards() {
  return CARDS
    .filter((c) => BRANCHES.some((b) => b.card === c.id))
    .sort((a, b) => a.order - b.order);
}

const pad2 = (n) => String(n).padStart(2, "0");

/** Group names of a branch, in first-appearance order. */
export function groupsOfBranch(branch) {
  const out = [];
  for (const [, , g] of branch.types) {
    if (g && !out.includes(g)) out.push(g);
  }
  return out;
}

/**
 * The folder path a report type lands on inside the backup ZIP, as an array of
 * segments. Numeric prefixes keep the on-disk order identical to the on-screen
 * order — a plain alphabetical listing would file "POS 6" after "POS 19" and
 * bury "Temperature & CCP" under "Cleaning".
 *
 *   ["02 Daily Monitor", "08 POS 19", "1 Temperature & CCP"]
 *
 * The branch segment is dropped when its card owns exactly one branch, so
 * single-module cards do not get a pointless "OHC / OHC" nesting.
 */
export function folderSegmentsFor(branch, typeKey) {
  const card = cardById(branch.card);
  const siblings = branchesOfCard(branch.card);
  const out = [`${pad2(card.order)} ${card.label}`];

  if (siblings.length > 1) {
    const idx = siblings.findIndex((b) => b.id === branch.id);
    out.push(`${pad2(idx + 1)} ${branch.label}`);
  }

  const entry = branch.types.find(([t]) => t === typeKey);
  const group = entry && entry[2];
  if (group) out.push(`${pad2(groupsOfBranch(branch).indexOf(group) + 1)} ${group}`);

  return out;
}

/**
 * Position of a type inside its own folder — drives the numeric prefix on the
 * file name so reports read in the order the screen lists them.
 */
export function fileIndexFor(branch, typeKey) {
  const entry = branch.types.find(([t]) => t === typeKey);
  const group = (entry && entry[2]) || "";
  const peers = branch.types.filter(([, , g]) => (g || "") === group);
  return peers.findIndex(([t]) => t === typeKey) + 1;
}
