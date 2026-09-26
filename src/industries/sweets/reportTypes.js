// src/industries/sweets/reportTypes.js
//
// Every report `type` slug the Confectionery (sweets) company writes — in one
// place, grouped the way the company-app shows them.
//
// Why it exists: settings/reportTypeCatalog.js is what the backup ZIP, Data
// Inventory, Bulk Export and Date Tree read. A slug missing there is invisible
// to all of them, and the sweets slugs were never added. The catalog now pulls
// its "Confectionery" card from this list, so a new sweets report is covered
// by adding ONE line here (daily logs are picked up from dailyLogSchemas.js on
// their own).
//
// Pure data — no React, no pages — so the catalog can import it freely.

import { DAILY_LOG_SCHEMAS } from "../../pages/monitor/branches/sweets/dailyLogSchemas";

/** [slug, label, group] per module; the module becomes a backup folder. */
export const SWEETS_REPORT_MODULES = [
  {
    id: "SWEETS_DAILY",
    label: "Daily Reports",
    emoji: "📋",
    types: [
      ["sweets-ph", "Personal Hygiene", "Hygiene & Cleaning"],
      ["sweets-clean", "Daily Cleanliness", "Hygiene & Cleaning"],
      ["sweets-coolers", "Cooler Temperatures", "Monitoring"],
      ...DAILY_LOG_SCHEMAS.map((s) => [s.type, s.label, "Monitoring"]),
      ["sweets_visitor_checklist", "Visitor Checklist", "People"],
      ["sweets_staff_sickness", "Sick Employee", "People"],
      ["sweets_non_conformance", "Non-Conformance", "Quality"],
      ["sweets_product_rejection", "Product Rejection", "Quality"],
      ["sweets_pest_control", "Pest Control", "Quality"],
    ],
  },
  {
    id: "SWEETS_HACCP",
    label: "HACCP",
    emoji: "🛡️",
    types: [
      ["sweets_haccp_allergen_matrix", "Allergen Matrix"],
      ["sweets_haccp_supplier_eval", "Supplier Evaluation"],
      ["sweets_haccp_sop", "SOP"],
      ["sweets_haccp_ccp_monitoring", "CCP Monitoring"],
      ["sweets_haccp_dm_inspection", "Dubai Municipality Inspection"],
      ["sweets_haccp_mock_recall", "Mock Recall"],
    ],
  },
  {
    id: "SWEETS_PEOPLE",
    label: "Inspection, Training & Certificates",
    emoji: "🎓",
    types: [
      ["sweets_internal_audit", "Internal Audit"],
      ["sweets_training_record", "Internal Training (legacy single records)"],
      ["sweets_training_session", "Training Sessions"],
      ["sweets_training_annual_plan", "Annual Training Plan"],
      ["sweets_training_questions", "Training Question Bank"],
      ["sweets_training_reference", "Training References"],
      ["sweets_training_config", "Training Modules Config"],
      ["sweets_training_settings", "Training Settings"],
      ["sweets_training_certificate", "Training Certificates"],
      ["sweets_ohc_certificate", "OHC Certificates"],
    ],
  },
  {
    id: "SWEETS_VEHICLES",
    label: "Vehicles",
    emoji: "🚚",
    types: [
      ["sweets_cars_loading_inspection", "Loading Inspection"],
      ["sweets_truck_daily_cleaning", "Truck Daily Cleaning"],
      ["sweets_cars_loading_lookup_vehicle_numbers", "Vehicle Numbers (lookup)"],
      ["sweets_cars_loading_lookup_driver_names", "Driver Names (lookup)"],
      ["sweets_truck_daily_cleaning_lookup_truck_numbers", "Truck Numbers (lookup)"],
    ],
  },
  {
    id: "SWEETS_CONFIG",
    label: "Configuration",
    emoji: "⚙️",
    types: [
      ["sweets_coolers_config", "Storage Units (config)"],
      ["sweets_staff_directory", "Staff List (config)"],
    ],
  },
];

export const SWEETS_REPORT_TYPES = SWEETS_REPORT_MODULES.flatMap((m) => m.types.map(([t]) => t));
