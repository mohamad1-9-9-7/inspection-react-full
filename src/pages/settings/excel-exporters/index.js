// src/pages/settings/excel-exporters/index.js
// Registry mapping report type-key → exporter function.
// Each exporter takes (wb: ExcelJS.Workbook, record, ctx) and adds ONE worksheet.
// Types without a custom exporter fall back to _generic which captures
// every field faithfully without summarizing.

import buildGeneric from "./_generic";

/* ─── QCS (20) ─── */
import qcs_coolers           from "./qcs_coolers";
import qcs_ph                from "./qcs_ph";
import qcs_clean             from "./qcs_clean";
import qcs_raw_material      from "./qcs_raw_material";
import qcs_fresh_chicken     from "./qcs_fresh_chicken";
import qcs_internal_audit    from "./qcs_internal_audit";
import qcs_non_conformance   from "./qcs_non_conformance";
import qcs_corrective_action from "./qcs_corrective_action";
import qcs_rm_packaging      from "./qcs_rm_packaging";
import qcs_rm_ingredients    from "./qcs_rm_ingredients";
import qcs_garbage_disposal  from "./qcs_garbage_disposal";
import qcs_meat_waste_disposal from "./qcs_meat_waste_disposal";
import qcs_pest_control      from "./qcs_pest_control";
import qcs_stock_rotation    from "./qcs_stock_rotation";
import qcs_visitor_checklist from "./qcs_visitor_checklist";
import qcs_staff_sickness    from "./qcs_staff_sickness";
import qcs_employee_return_to_work from "./qcs_employee_return_to_work";
import qcs_product_rejection from "./qcs_product_rejection";
import ftr1_preloading       from "./ftr1_preloading";
import ftr2_preloading       from "./ftr2_preloading";

/* ─── FTR 1 + FTR 2 (14) ─── */
import ftr1_temperature            from "./ftr1_temperature";
import ftr1_personal_hygiene       from "./ftr1_personal_hygiene";
import ftr1_oil_calibration        from "./ftr1_oil_calibration";
import ftr1_daily_cleanliness      from "./ftr1_daily_cleanliness";
import ftr1_cooking_temperature_log from "./ftr1_cooking_temperature_log";
import ftr1_receiving_log_butchery from "./ftr1_receiving_log_butchery";
import ftr2_temperature            from "./ftr2_temperature";
import ftr2_personal_hygiene       from "./ftr2_personal_hygiene";
import ftr2_oil_calibration        from "./ftr2_oil_calibration";
import ftr2_daily_cleanliness      from "./ftr2_daily_cleanliness";
import ftr2_cooking_temperature_log from "./ftr2_cooking_temperature_log";
import ftr2_receiving_log_butchery from "./ftr2_receiving_log_butchery";

/* ─── POS 10 / 11 / 15 (20) ─── */
import pos10_temperature           from "./pos10_temperature";
import pos10_daily_cleanliness     from "./pos10_daily_cleanliness";
import pos10_personal_hygiene      from "./pos10_personal_hygiene";
import pos10_calibration_log       from "./pos10_calibration_log";
import pos10_pest_control          from "./pos10_pest_control";
import pos10_receiving_log_butchery from "./pos10_receiving_log_butchery";
import pos10_traceability_log      from "./pos10_traceability_log";

import pos11_temperature           from "./pos11_temperature";
import pos11_daily_cleanliness     from "./pos11_daily_cleanliness";
import pos11_personal_hygiene      from "./pos11_personal_hygiene";
import pos11_calibration_log       from "./pos11_calibration_log";
import pos11_pest_control          from "./pos11_pest_control";
import pos11_receiving_log_butchery from "./pos11_receiving_log_butchery";

import pos15_temperature           from "./pos15_temperature";
import pos15_daily_cleanliness     from "./pos15_daily_cleanliness";
import pos15_personal_hygiene      from "./pos15_personal_hygiene";
import pos15_pest_control          from "./pos15_pest_control";
import pos15_receiving_log_butchery from "./pos15_receiving_log_butchery";
import pos15_traceability_log      from "./pos15_traceability_log";
import pos15_equipment_inspection  from "./pos15_equipment_inspection";

/* ─── POS 19 (23) ─── */
import pos19_cleaning_programme_schedule   from "./pos19_cleaning_programme_schedule";
import pos19_blast_freezer_ccp             from "./pos19_blast_freezer_ccp";
import pos19_veg_sanitation_ccp            from "./pos19_veg_sanitation_ccp";
import pos19_dry_store_temp_humidity       from "./pos19_dry_store_temp_humidity";
import pos19_finished_product_monitoring   from "./pos19_finished_product_monitoring";
import pos19_daily_cleaning                from "./pos19_daily_cleaning";
import pos19_equipment_inspection          from "./pos19_equipment_inspection";
import pos19_food_temperature_verification from "./pos19_food_temperature_verification";
import pos19_glass_items_condition         from "./pos19_glass_items_condition";
import pos19_hot_holding_temperature       from "./pos19_hot_holding_temperature";
import pos19_oil_quality_monitoring        from "./pos19_oil_quality_monitoring";
import pos19_personal_hygiene              from "./pos19_personal_hygiene";
import pos19_receiving_log_butchery        from "./pos19_receiving_log_butchery";
import pos19_sanitizer_concentration       from "./pos19_sanitizer_concentration";
import pos19_temperature_monitoring        from "./pos19_temperature_monitoring";
import pos19_traceability_log              from "./pos19_traceability_log";
import pos19_wooden_items_condition        from "./pos19_wooden_items_condition";
import pos19_cooking_temperature           from "./pos19_cooking_temperature";
import pos19_defrosting_record             from "./pos19_defrosting_record";
import pos19_cooling_log                   from "./pos19_cooling_log";
import pos19_reheating_log                 from "./pos19_reheating_log";
import pos19_calibration_log               from "./pos19_calibration_log";

/* ─── Production (4 custom + 2 generic) ─── */
import prod_cleaning_checklist  from "./prod_cleaning_checklist";
import prod_personal_hygiene    from "./prod_personal_hygiene";
import prod_defrosting_record   from "./prod_defrosting_record";
import prd_traceability_log     from "./prd_traceability_log";
import prod_online_cutting      from "./prod_online_cutting";
import prod_dried_meat          from "./prod_dried_meat";

/* ─── HACCP & ISO (2 forms + 5 register collections + 7 generic) ─── */
import ccp_monitoring_record    from "./ccp_monitoring_record";
import customer_complaint       from "./customer_complaint";
import fsms_risk_register_item        from "./fsms_risk_register_item";
import fsms_opportunity_register_item from "./fsms_opportunity_register_item";
import fsms_change_management_log_item from "./fsms_change_management_log_item";
import fsms_food_defense_item          from "./fsms_food_defense_item";
import fsms_objective                 from "./fsms_objective";
import glass_register_item            from "./glass_register_item";
import calibration_record             from "./calibration_record";
import internal_calibration_record    from "./internal_calibration_record";
import fsms_communication_log         from "./fsms_communication_log";
import continual_improvement          from "./continual_improvement";
import mrm_record                     from "./mrm_record";
import internal_audit_record          from "./internal_audit_record";
import real_recall                    from "./real_recall";
import product_withdrawal             from "./product_withdrawal";
import mock_recall_drill              from "./mock_recall_drill";

/* ─── OHC + Training ─── */
import ohc_certificate               from "./ohc_certificate";
import training_certificate          from "./training_certificate";
import training_session              from "./training_session";

/* ─── Inspection + Fleet ─── */
import municipality_inspection       from "./municipality_inspection";
import car_approvals                 from "./car_approvals";
import cars_loading_inspection       from "./cars_loading_inspection";
import truck_daily_cleaning          from "./truck_daily_cleaning";
import maintenance                   from "./maintenance";

/* ─── Returns branch (5) ─── */
import returns               from "./returns";
import meat_daily            from "./meat_daily";
import returns_customers     from "./returns_customers";
import inventory_daily       from "./inventory_daily";
import enoc_returns          from "./enoc_returns";
import destruction_record    from "./destruction_record";
import odoo_disposal_log     from "./odoo_disposal_log";

// Fresh-chicken key uses the legacy long form
const CUSTOM = {
  /* QCS */
  "qcs-coolers":                            qcs_coolers,
  "qcs-ph":                                 qcs_ph,
  "qcs-clean":                              qcs_clean,
  "qcs_raw_material":                       qcs_raw_material,
  "pos_al_qusais_fresh_chicken_receiving":  qcs_fresh_chicken,
  "qcs_internal_audit":                     qcs_internal_audit,
  "qcs_non_conformance":                    qcs_non_conformance,
  "qcs_corrective_action":                  qcs_corrective_action,
  "qcs_rm_packaging":                       qcs_rm_packaging,
  "qcs_rm_ingredients":                     qcs_rm_ingredients,
  "qcs_garbage_disposal":                   qcs_garbage_disposal,
  "qcs_meat_waste_disposal":                qcs_meat_waste_disposal,
  "qcs_pest_control":                       qcs_pest_control,
  "qcs_stock_rotation":                     qcs_stock_rotation,
  "qcs_visitor_checklist":                  qcs_visitor_checklist,
  "qcs_staff_sickness":                     qcs_staff_sickness,
  "qcs_employee_return_to_work":            qcs_employee_return_to_work,
  "qcs_product_rejection":                  qcs_product_rejection,

  /* FTR 1 / FTR 2 */
  "ftr1_temperature":                       ftr1_temperature,
  "ftr1_personal_hygiene":                  ftr1_personal_hygiene,
  "ftr1_oil_calibration":                   ftr1_oil_calibration,
  "ftr1_daily_cleanliness":                 ftr1_daily_cleanliness,
  "ftr1_cooking_temperature_log":           ftr1_cooking_temperature_log,
  "ftr1_receiving_log_butchery":            ftr1_receiving_log_butchery,
  "ftr1_preloading_inspection":             ftr1_preloading,
  "ftr2_temperature":                       ftr2_temperature,
  "ftr2_personal_hygiene":                  ftr2_personal_hygiene,
  "ftr2_oil_calibration":                   ftr2_oil_calibration,
  "ftr2_daily_cleanliness":                 ftr2_daily_cleanliness,
  "ftr2_cooking_temperature_log":           ftr2_cooking_temperature_log,
  "ftr2_receiving_log_butchery":            ftr2_receiving_log_butchery,
  "ftr2_preloading_inspection":             ftr2_preloading,

  /* POS 10 / 11 / 15 */
  "pos10_temperature":                      pos10_temperature,
  "pos10_daily_cleanliness":                pos10_daily_cleanliness,
  "pos10_personal_hygiene":                 pos10_personal_hygiene,
  "pos10_calibration_log":                  pos10_calibration_log,
  "pos10_pest_control":                     pos10_pest_control,
  "pos10_receiving_log_butchery":           pos10_receiving_log_butchery,
  "pos10_traceability_log":                 pos10_traceability_log,
  "pos11_temperature":                      pos11_temperature,
  "pos11_daily_cleanliness":                pos11_daily_cleanliness,
  "pos11_personal_hygiene":                 pos11_personal_hygiene,
  "pos11_calibration_log":                  pos11_calibration_log,
  "pos11_pest_control":                     pos11_pest_control,
  "pos11_receiving_log_butchery":           pos11_receiving_log_butchery,
  "pos15_temperature":                      pos15_temperature,
  "pos15_daily_cleanliness":                pos15_daily_cleanliness,
  "pos15_personal_hygiene":                 pos15_personal_hygiene,
  "pos15_pest_control":                     pos15_pest_control,
  "pos15_receiving_log_butchery":           pos15_receiving_log_butchery,
  "pos15_traceability_log":                 pos15_traceability_log,
  "pos15_equipment_inspection":             pos15_equipment_inspection,

  /* POS 19 */
  "pos19_cleaning_programme_schedule":      pos19_cleaning_programme_schedule,
  "pos19_daily_cleaning":                   pos19_daily_cleaning,
  "pos19_equipment_inspection":             pos19_equipment_inspection,
  "pos19_food_temperature_verification":    pos19_food_temperature_verification,
  "pos19_glass_items_condition":            pos19_glass_items_condition,
  "pos19_hot_holding_temperature":          pos19_hot_holding_temperature,
  "pos19_oil_quality_monitoring":           pos19_oil_quality_monitoring,
  "pos19_personal_hygiene":                 pos19_personal_hygiene,
  "pos19_receiving_log_butchery":           pos19_receiving_log_butchery,
  "pos19_sanitizer_concentration":          pos19_sanitizer_concentration,
  "pos19_temperature_monitoring":           pos19_temperature_monitoring,
  "pos19_traceability_log":                 pos19_traceability_log,
  "pos19_wooden_items_condition":           pos19_wooden_items_condition,
  "pos19_cooking_temperature":              pos19_cooking_temperature,
  "pos19_defrosting_record":                pos19_defrosting_record,
  "pos19_cooling_log":                      pos19_cooling_log,
  "pos19_reheating_log":                    pos19_reheating_log,
  "pos19_calibration_log":                  pos19_calibration_log,
  "pos19_blast_freezer_ccp":                pos19_blast_freezer_ccp,
  "pos19_veg_sanitation_ccp":               pos19_veg_sanitation_ccp,
  "pos19_dry_store_temp_humidity":          pos19_dry_store_temp_humidity,
  "pos19_finished_product_monitoring":      pos19_finished_product_monitoring,
  // Same payload shape as the QCS form it wraps — reuse its sheet builder.
  "pos19_non_conformance":                  qcs_non_conformance,
  // POS 19 reuses the QCS Staff Sickness / Return-to-Work forms verbatim,
  // only the type key + reporter differ — reuse the same sheet builders.
  "pos19_staff_sickness":                   qcs_staff_sickness,
  "pos19_employee_return_to_work":          qcs_employee_return_to_work,

  /* Production */
  "prod_cleaning_checklist":                prod_cleaning_checklist,
  "prod_personal_hygiene":                  prod_personal_hygiene,
  "prod_defrosting_record":                 prod_defrosting_record,
  "prd_traceability_log":                   prd_traceability_log,
  "prod_online_cutting":                    prod_online_cutting,
  "prod_dried_meat":                        prod_dried_meat,

  /* HACCP & ISO */
  "ccp_monitoring_record":                  ccp_monitoring_record,
  "customer_complaint":                     customer_complaint,
  // Register collections — one sheet aggregating all records (see _register.js)
  "fsms_risk_register_item":                fsms_risk_register_item,
  "fsms_opportunity_register_item":         fsms_opportunity_register_item,
  "fsms_change_management_log_item":        fsms_change_management_log_item,
  "fsms_food_defense_item":                 fsms_food_defense_item,
  "fsms_objective":                         fsms_objective,
  "glass_register_item":                    glass_register_item,
  "calibration_record":                     calibration_record,
  "internal_calibration_record":            internal_calibration_record,
  "fsms_communication_log":                 fsms_communication_log,
  "continual_improvement":                  continual_improvement,
  // Single-record document forms (each report = one detailed sheet)
  "mrm_record":                             mrm_record,
  "internal_audit_record":                  internal_audit_record,
  "real_recall":                            real_recall,
  "product_withdrawal":                     product_withdrawal,
  "mock_recall_drill":                      mock_recall_drill,

  /* OHC + Training */
  "ohc_certificate":                        ohc_certificate,
  "training_certificate":                   training_certificate,
  "training_session":                       training_session,
  // training_quiz → no producer in the app (quiz data is embedded in
  // training_session.questionsBank/participants); left on generic.

  /* Inspection + Fleet */
  "municipality_inspection":                municipality_inspection,
  "car_approvals":                          car_approvals,
  "cars_loading_inspection":                cars_loading_inspection,
  "truck_daily_cleaning":                   truck_daily_cleaning,
  "maintenance":                            maintenance,

  /* Returns branch */
  "returns":                                returns,
  "meat_daily":                             meat_daily,
  "returns_customers":                      returns_customers,
  "inventory_daily_grouped":                inventory_daily,
  "enoc_returns":                           enoc_returns,
  "destruction_record":                     destruction_record,
  "odoo_disposal_log":                      odoo_disposal_log,
};

/**
 * Get the exporter for a given report type. Falls back to the generic exporter
 * if no custom one is registered. The fallback still produces a properly styled
 * sheet matching the Al Mawashi document layout and contains every payload field.
 */
export function getExporter(typeKey) {
  return CUSTOM[typeKey] || buildGeneric;
}

export { buildGeneric };
