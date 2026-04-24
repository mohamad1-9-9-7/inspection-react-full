// src/pages/monitor/branches/production/_shared/i18n.js
// Lightweight bilingual (EN/AR) system for the Production section.
// Usage:
//   import { useLang, t } from "./_shared/i18n";
//   const { lang, toggle, dir } = useLang();
//   t("save", lang)  →  "Save" or "حفظ"

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "prd_lang";

/* ─── Dictionary ─── */
export const STR = {
  // Hub chrome
  hub_title:          { en: "Production",              ar: "الإنتاج" },
  hub_subtitle:       { en: "Daily Inputs",            ar: "الإدخالات اليومية" },
  nav_forms:          { en: "FORMS",                   ar: "النماذج" },
  breadcrumb_prod:    { en: "Production",              ar: "الإنتاج" },
  breadcrumb_inputs:  { en: "Inputs",                  ar: "الإدخالات" },
  sidebar_footer:     { en: "TRANS EMIRATES",          ar: "ترانس إميرتس" },
  sidebar_footer_sub: { en: "Livestock Trading LLC",   ar: "لتجارة المواشي" },
  lang_toggle:        { en: "العربية",                  ar: "English" },

  // Tab names
  tab_hygiene:        { en: "Personal Hygiene",        ar: "النظافة الشخصية" },
  tab_hygiene_sub:    { en: "Employee checklist",      ar: "قائمة فحص الموظفين" },
  tab_cleaning:       { en: "Cleaning Checklist",      ar: "قائمة النظافة" },
  tab_cleaning_sub:   { en: "Daily cleaning records",  ar: "سجلات النظافة اليومية" },
  tab_defrost:        { en: "Defrosting Record",       ar: "سجل إذابة التجميد" },
  tab_defrost_sub:    { en: "Multi-day temperature log",ar: "سجل حرارة متعدد الأيام" },
  tab_trace:          { en: "Traceability Log",        ar: "سجل التتبع" },
  tab_trace_sub:      { en: "Raw → final product",     ar: "المواد الخام → المنتج النهائي" },
  tab_cutting:        { en: "Online Cutting Record",   ar: "سجل التقطيع المباشر" },
  tab_cutting_sub:    { en: "Marinated / Non-marinated",ar: "متبّل / غير متبّل" },
  tab_dried:          { en: "Dried Meat Process",       ar: "تصنيع اللحم المجفف" },
  tab_dried_sub:      { en: "Curing → Drying → Packaging",ar: "تمليح ← تجفيف ← تعبئة" },
  tab_dashboard:      { en: "Overview",                  ar: "نظرة عامة" },
  tab_dashboard_sub:  { en: "Daily status across reports",ar: "الحالة اليومية لكل التقارير" },

  // Dashboard
  db_title:           { en: "Production Dashboard",      ar: "لوحة الإنتاج" },
  db_subtitle:        { en: "Today's status & recent activity across all reports", ar: "الحالة اليومية والنشاط الأخير لكل التقارير" },
  db_today:           { en: "Today",                     ar: "اليوم" },
  db_this_week:       { en: "This Week",                 ar: "هذا الأسبوع" },
  db_this_month:      { en: "This Month",                ar: "هذا الشهر" },
  db_last_submission: { en: "Last Submission",           ar: "آخر إدخال" },
  db_not_submitted:   { en: "Not submitted today",       ar: "لم يُسجّل اليوم" },
  db_submitted:       { en: "Submitted today",           ar: "تم التسجيل اليوم" },
  db_no_data:         { en: "No reports yet",            ar: "لا توجد تقارير بعد" },
  db_view_report:     { en: "View",                      ar: "عرض" },
  db_total_reports:   { en: "Total Reports",             ar: "مجموع التقارير" },
  db_summary_title:   { en: "Week Summary",              ar: "ملخص الأسبوع" },
  db_refresh:         { en: "Refresh",                   ar: "تحديث" },

  // Report header (common fields)
  hdr_document_title: { en: "Document Title",          ar: "عنوان المستند" },
  hdr_document_no:    { en: "Document No",             ar: "رقم المستند" },
  hdr_issue_date:     { en: "Issue Date",              ar: "تاريخ الإصدار" },
  hdr_revision_no:    { en: "Revision No",             ar: "رقم المراجعة" },
  hdr_area:           { en: "Area",                    ar: "المنطقة" },
  hdr_issued_by:      { en: "Issued By",               ar: "صادر عن" },
  hdr_controlling:    { en: "Controlling Officer",     ar: "مسؤول المراقبة" },
  hdr_approved_by:    { en: "Approved By",             ar: "اعتمده" },
  hdr_report_date:    { en: "Report Date",             ar: "تاريخ التقرير" },
  hdr_section:        { en: "Section",                 ar: "القسم" },
  hdr_branch:         { en: "Branch",                  ar: "الفرع" },

  // Common actions
  btn_save:           { en: "Save Report",             ar: "حفظ التقرير" },
  btn_saving:         { en: "Saving…",                 ar: "جارٍ الحفظ…" },
  btn_update:         { en: "Update Report",           ar: "تحديث التقرير" },
  btn_add_row:        { en: "Add Row",                 ar: "إضافة سطر" },
  btn_remove:         { en: "Remove",                  ar: "حذف" },
  btn_new:            { en: "New",                     ar: "جديد" },

  // Status
  status_loading:     { en: "Loading…",                ar: "جارٍ التحميل…" },
  status_saved:       { en: "Saved successfully",      ar: "تم الحفظ بنجاح" },
  status_updated:     { en: "Report updated",          ar: "تم تحديث التقرير" },
  status_fail:        { en: "Failed to save",          ar: "فشل الحفظ" },
  status_loaded_edit: { en: "Saved report loaded — directly editable", ar: "تم تحميل تقرير محفوظ — التعديل مباشر" },
  status_new_report:  { en: "New report for this date",ar: "تقرير جديد لهذا التاريخ" },

  // Signatures
  sig_checked_by:     { en: "Checked By",              ar: "فحص بواسطة" },
  sig_verified_by:    { en: "Verified By",             ar: "اعتمد بواسطة" },
  sig_name_sig:       { en: "Name & signature",        ar: "الاسم والتوقيع" },

  // Personal Hygiene
  ph_subtitle:        { en: "PRD — Production Area • Daily employee hygiene inspection", ar: "الإنتاج — فحص يومي للنظافة الشخصية" },
  ph_col_no:          { en: "#",                       ar: "#" },
  ph_col_name:        { en: "Employee Name",           ar: "اسم الموظف" },
  ph_col_nails:       { en: "Nails",                   ar: "الأظافر" },
  ph_col_hair:        { en: "Hair",                    ar: "الشعر" },
  ph_col_jewelry:     { en: "No Jewelry",              ar: "بدون مجوهرات" },
  ph_col_ppe:         { en: "PPE / Clothing",          ar: "الملابس / الوقاية" },
  ph_col_disease:     { en: "Disease",                 ar: "الأمراض" },
  ph_col_wounds:      { en: "Wounds",                  ar: "الجروح" },
  ph_col_remarks:     { en: "Remarks / Corrective Actions", ar: "ملاحظات / إجراءات تصحيحية" },
  ph_conform:         { en: "Conform",                 ar: "مطابق" },
  ph_nonconform:      { en: "Non-conform",             ar: "غير مطابق" },
  ph_req_name:        { en: "Employee name…",          ar: "اسم الموظف…" },
  ph_req_nc:          { en: "Required if NC",          ar: "مطلوب عند NC" },
  ph_optional:        { en: "Optional…",               ar: "اختياري…" },

  // Cleaning Checklist
  cc_subtitle:        { en: "Production — Daily cleaning verification", ar: "الإنتاج — التحقق اليومي من النظافة" },
  cc_stat_progress:   { en: "Progress",                ar: "التقدم" },
  cc_stat_conform:    { en: "Conform",                 ar: "مطابق" },
  cc_stat_noncnf:     { en: "Non-Conform",             ar: "غير مطابق" },
  cc_stat_pending:    { en: "Pending",                 ar: "معلّق" },
  cc_col_general:     { en: "General Cleaning",        ar: "النظافة العامة" },
  cc_col_chemical:    { en: "Chemical & Concentration",ar: "المواد الكيميائية والتركيز" },
  cc_col_status:      { en: "Status",                  ar: "الحالة" },
  cc_col_doneby:      { en: "Done By",                 ar: "نُفّذ بواسطة" },
  cc_col_remarks:     { en: "Remarks & CA",            ar: "الملاحظات والإجراء" },
  cc_note_daily:      { en: "Frequency — Daily",       ar: "التكرار — يومي" },
  cc_req_nc:          { en: "⚠️ Required",              ar: "⚠️ مطلوب" },

  // Defrosting
  df_subtitle:        { en: "Production — Multi-day defrosting temperature log", ar: "الإنتاج — سجل حرارة إذابة التجميد متعدد الأيام" },
  df_critical:        { en: "Critical Limit",          ar: "الحد الحرج" },
  df_critical_text:   {
    en: "Should be defrosted under refrigerated condition — product temp should not exceed 5°C. Foods should be cooked within 72 hours from the time of start thawing.",
    ar: "يجب إذابة التجميد في ظروف التبريد — يجب ألا تتجاوز حرارة المنتج 5°م. يجب طهي الأغذية خلال 72 ساعة من بداية الإذابة.",
  },
  df_grp_material:    { en: "Raw Material",            ar: "المادة الخام" },
  df_grp_start:       { en: "Defrost Start",           ar: "بداية الإذابة" },
  df_grp_end:         { en: "Defrost End",             ar: "نهاية الإذابة" },
  df_grp_result:      { en: "Result",                  ar: "النتيجة" },
  df_col_item:        { en: "Item",                    ar: "المنتج" },
  df_col_qty:         { en: "Qty",                     ar: "الكمية" },
  df_col_brand:       { en: "Brand",                   ar: "الماركة" },
  df_col_prod_date:   { en: "PROD Date",               ar: "تاريخ الإنتاج" },
  df_col_exp_date:    { en: "EXP Date",                ar: "تاريخ الانتهاء" },
  df_col_date:        { en: "Date",                    ar: "التاريخ" },
  df_col_time:        { en: "Time",                    ar: "الوقت" },
  df_col_temp:        { en: "Temp °C",                 ar: "الحرارة °م" },
  df_col_defrost_t:   { en: "Defrost Temp (≤ 5°C)",    ar: "حرارة الإذابة (≤ 5°م)" },
  df_col_remarks:     { en: "Remarks",                 ar: "ملاحظات" },

  // Traceability
  tr_subtitle:        { en: "Raw materials to final products traceability", ar: "تتبع من المواد الخام إلى المنتج النهائي" },

  // Online Cutting Record
  oc_subtitle:        { en: "On-line cutting record — Marinated / Non-Marinated product for retail branches", ar: "سجل التقطيع المباشر — منتجات متبّلة / غير متبّلة لفروع التجزئة" },
  oc_customer:        { en: "Customer Name",              ar: "اسم العميل" },
  oc_batch_code:      { en: "Batch Code",                 ar: "رمز الدفعة" },
  oc_product:         { en: "Product",                    ar: "المنتج" },
  oc_add_product:     { en: "Add Product",                ar: "إضافة منتج" },
  oc_product_name:    { en: "Product Name & Size/Grade",  ar: "اسم المنتج والحجم/الدرجة" },
  oc_rm_details:      { en: "R/M Details",                ar: "تفاصيل المادة الخام" },
  oc_brand:           { en: "Brand Name (R/M)",           ar: "اسم العلامة (مادة خام)" },
  oc_prod_date:       { en: "Pro Date (R/M)",             ar: "تاريخ الإنتاج (مادة خام)" },
  oc_exp_date:        { en: "Exp Date (R/M)",             ar: "تاريخ الانتهاء (مادة خام)" },
  oc_batch_no:        { en: "Batch No / Lot No / SIF No", ar: "رقم الدفعة / اللوت / SIF" },
  oc_pdt_temp:        { en: "Pdt Temp °C (< 10 °C)",      ar: "حرارة المنتج °م (< 10)" },
  oc_piece_weight:    { en: "Piece Weight (g)",           ar: "وزن القطعة (غ)" },
  oc_cutting_weight:  { en: "Cutting Piece Weight",        ar: "وزن القطعة (بدون تتبيل)" },
  oc_marinated_weight:{ en: "Marinated Piece Weight",      ar: "وزن القطعة المتبّلة" },
  oc_weight_spec:     { en: "Target Range (g)",            ar: "النطاق المطلوب (غ)" },
  oc_measurements:    { en: "Measurements",                ar: "القياسات" },
  oc_measurement:     { en: "Measurement",                 ar: "القياس" },
  oc_samples:         { en: "Samples",                    ar: "العينات" },
  oc_sample_no:       { en: "Sample No",                  ar: "رقم العينة" },
  oc_time:            { en: "Time",                       ar: "الوقت" },
  oc_quality:         { en: "Quality Assessment",         ar: "تقييم الجودة" },
  oc_q_shape:         { en: "Shape",                      ar: "الشكل" },
  oc_q_color:         { en: "Color & Texture",            ar: "اللون والقوام" },
  oc_q_fat:           { en: "Fat Removed",                ar: "إزالة الدهن" },
  oc_q_blood:         { en: "Blood Spot",                 ar: "بقع الدم" },
  oc_q_white:         { en: "White Patches",              ar: "بقع بيضاء" },
  oc_q_odor:          { en: "Bad Odor",                   ar: "رائحة سيئة" },
  oc_q_foreign:       { en: "Foreign Object",             ar: "أجسام غريبة" },
  oc_q_cartilage:     { en: "Cartilage / Bone / Feather / Skin", ar: "غضروف / عظم / ريش / جلد" },
  oc_q_overall:       { en: "Over All Quality",           ar: "الجودة العامة" },
  oc_remarks:         { en: "Remarks / Corrective Actions", ar: "ملاحظات / إجراءات تصحيحية" },
  oc_recorded_by:     { en: "Recorded By",                ar: "سجّل بواسطة" },
  oc_verified_by:     { en: "Verified By",                ar: "اعتمد بواسطة" },
  oc_remove_product:  { en: "Remove this product",        ar: "إزالة هذا المنتج" },

  // Dried Meat Process
  dm_subtitle:        { en: "Dried Meat Process Record — Curing, Drying & Packaging (HACCP)", ar: "سجل تصنيع اللحم المجفف — التمليح والتجفيف والتعبئة (HACCP)" },

  // Batch section
  dm_batch_section:   { en: "Batch Information",          ar: "معلومات الدفعة" },
  dm_batch_id:        { en: "Batch / Lot ID",             ar: "رقم الدفعة" },
  dm_product_type:    { en: "Product Type",               ar: "نوع المنتج" },
  dm_product_name:    { en: "Product Name",               ar: "اسم المنتج" },
  dm_raw_type:        { en: "Raw Meat Type",              ar: "نوع اللحم الخام" },
  dm_raw_source:      { en: "Source / Supplier",          ar: "المصدر / المورد" },
  dm_raw_lot:         { en: "RM Lot No",                  ar: "رقم دفعة المادة الخام" },
  dm_raw_prod_date:   { en: "RM Production Date",         ar: "تاريخ إنتاج اللحم الخام" },
  dm_raw_exp_date:    { en: "RM Expiry Date",             ar: "تاريخ انتهاء اللحم الخام" },
  dm_initial_weight:  { en: "Initial Weight (kg)",        ar: "الوزن الابتدائي (كغ)" },
  dm_received_date:   { en: "RM Received Date",           ar: "تاريخ استلام المادة الخام" },
  dm_start_date:      { en: "Process Start Date",         ar: "تاريخ بدء العملية" },
  dm_expected_end:    { en: "Expected End Date",          ar: "تاريخ الانتهاء المتوقع" },

  // Curing section
  dm_curing_section:  { en: "Curing / Marination (CCP)",  ar: "التمليح / التتبيل (نقطة تحكم)" },
  dm_salt_pct:        { en: "Salt % (by weight)",         ar: "نسبة الملح (%)" },
  dm_nitrite_ppm:     { en: "Nitrite/Nitrate (ppm)",      ar: "النيتريت/النيترات (ppm)" },
  dm_curing_temp:     { en: "Curing Temp (°C, ≤ 5)",      ar: "حرارة التمليح (°م، ≤ 5)" },
  dm_curing_hours:    { en: "Curing Duration (hrs)",      ar: "مدة التمليح (ساعة)" },
  dm_curing_start:    { en: "Curing Start",               ar: "بداية التمليح" },
  dm_curing_end:      { en: "Curing End",                 ar: "نهاية التمليح" },
  dm_spices:          { en: "Spices / Additives",         ar: "التوابل / الإضافات" },
  dm_curing_notes:    { en: "Curing Notes",               ar: "ملاحظات التمليح" },

  // Drying log
  dm_drying_section:  { en: "Drying Process Log (CCP)",   ar: "سجل عملية التجفيف (نقطة تحكم)" },
  dm_add_drying:      { en: "Add Reading",                ar: "إضافة قراءة" },
  dm_drying_date:     { en: "Date",                       ar: "التاريخ" },
  dm_drying_time:     { en: "Time",                       ar: "الوقت" },
  dm_temp:            { en: "Temp (°C)",                  ar: "الحرارة (°م)" },
  dm_humidity:        { en: "RH (%)",                     ar: "الرطوبة (%)" },
  dm_airflow:         { en: "Airflow",                    ar: "تدفق الهواء" },
  dm_current_weight:  { en: "Weight (kg)",                ar: "الوزن (كغ)" },
  dm_loss_pct:        { en: "Loss %",                     ar: "نسبة الفقد %" },
  dm_reading_notes:   { en: "Notes",                      ar: "ملاحظات" },

  // Final critical parameters
  dm_final_section:   { en: "Final Critical Parameters",  ar: "المعايير الحرجة النهائية" },
  dm_aw:              { en: "Water Activity (aw ≤ 0.85)", ar: "نشاط الماء (aw ≤ 0.85)" },
  dm_ph:              { en: "pH (≤ 5.2)",                 ar: "الحموضة (≤ 5.2)" },
  dm_final_moisture:  { en: "Final Moisture (%)",         ar: "الرطوبة النهائية (%)" },
  dm_salt_content:    { en: "Salt Content (%)",           ar: "نسبة الملح النهائية (%)" },
  dm_final_weight:    { en: "Final Weight (kg)",          ar: "الوزن النهائي (كغ)" },
  dm_yield:           { en: "Yield (%)",                  ar: "نسبة الإنتاج (%)" },
  dm_weight_loss:     { en: "Weight Loss (%)",            ar: "نسبة فقد الوزن (%)" },

  // Sensory
  dm_sensory_section: { en: "Sensory Evaluation",         ar: "التقييم الحسي" },
  dm_color:           { en: "Color",                      ar: "اللون" },
  dm_texture:         { en: "Texture",                    ar: "القوام" },
  dm_odor:            { en: "Odor / Aroma",               ar: "الرائحة" },
  dm_appearance:      { en: "Appearance",                 ar: "المظهر" },

  // Packaging
  dm_pkg_section:     { en: "Packaging & Storage",        ar: "التعبئة والتخزين" },
  dm_pkg_type:        { en: "Packaging Type",             ar: "نوع التعبئة" },
  dm_pkg_vacuum:      { en: "Vacuum",                     ar: "فراغي" },
  dm_pkg_map:         { en: "MAP (Modified Atmosphere)",  ar: "غلاف جوي معدّل" },
  dm_pkg_regular:     { en: "Regular",                    ar: "عادي" },
  dm_storage_temp:    { en: "Storage Temp (°C)",          ar: "حرارة التخزين (°م)" },
  dm_best_before:     { en: "Best Before",                ar: "صالح حتى" },
  dm_output_count:    { en: "Output (packets/pieces)",    ar: "الإنتاج (قطعة/عبوة)" },

  // Signatures
  dm_checked:         { en: "Checked By",                 ar: "فحص بواسطة" },
  dm_verified:        { en: "Verified By",                ar: "اعتمد بواسطة" },
  dm_approved:        { en: "Approved By (QA)",           ar: "المعتمد (ضمان الجودة)" },

  // Dehydrator machine setup
  dm_machine_section: { en: "Dehydrator Setup (Vertical Hanging)", ar: "إعداد ماكينة التجفيف (تعليق عمودي)" },
  dm_batch_capacity:  { en: "Batch Capacity (kg)",        ar: "سعة الدفعة (كغ)" },
  dm_hanging_pieces:  { en: "Hanging Pieces Count",       ar: "عدد القطع المعلّقة" },
  dm_hanging_levels:  { en: "Vertical Levels / Rows",     ar: "عدد المستويات العمودية" },
  dm_target_temp:     { en: "Target Temp (°C)",           ar: "الحرارة المستهدفة (°م)" },
  dm_target_humidity: { en: "Target Humidity (%)",        ar: "الرطوبة المستهدفة (%)" },
  dm_fan_speed:       { en: "Fan Speed",                  ar: "سرعة المروحة" },
  dm_fan_low:         { en: "Low",                        ar: "منخفضة" },
  dm_fan_medium:      { en: "Medium",                     ar: "متوسطة" },
  dm_fan_high:        { en: "High",                       ar: "عالية" },
  dm_program_mode:    { en: "Program / Mode",             ar: "البرنامج / الوضع" },
  dm_cycle_hours:     { en: "Planned Cycle (hrs)",        ar: "مدة الدورة المخططة (ساعة)" },

  // Drying log additions
  dm_elapsed_time:    { en: "Elapsed (hrs)",              ar: "الوقت المنقضي (ساعة)" },
  dm_position:        { en: "Position",                   ar: "الموقع" },
  dm_pos_top:         { en: "Top",                        ar: "علوي" },
  dm_pos_middle:      { en: "Middle",                     ar: "وسط" },
  dm_pos_bottom:      { en: "Bottom",                     ar: "سفلي" },

  // Post-drying
  dm_post_section:    { en: "Post-Drying & Cooling",      ar: "ما بعد التجفيف والتبريد" },
  dm_cooling_time:    { en: "Cooling Duration (min)",     ar: "مدة التبريد (دقيقة)" },
  dm_cooling_temp:    { en: "Cooling Temp (°C)",          ar: "حرارة التبريد (°م)" },
  dm_rotation_count:  { en: "Rotations Done",             ar: "عدد مرات التدوير" },
  dm_rotation_note:   { en: "Rotation / Cooling Notes",   ar: "ملاحظات التدوير والتبريد" },
};

/* ─── Translate helper ─── */
export function t(key, lang = "en") {
  const entry = STR[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

/* ─── React hook ─── */
export function useLang() {
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  // Listen for language change events from other tabs/components
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== lang) {
        setLang(e.newValue);
      }
    };
    const onCustom = (e) => {
      const v = e?.detail;
      if (v && v !== lang) setLang(v);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("prd:lang-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("prd:lang-change", onCustom);
    };
  }, [lang]);

  const setLanguage = useCallback((v) => {
    const next = v === "ar" ? "ar" : "en";
    setLang(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    try {
      window.dispatchEvent(new CustomEvent("prd:lang-change", { detail: next }));
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setLanguage(lang === "ar" ? "en" : "ar");
  }, [lang, setLanguage]);

  // Helper bound to current language
  const tr = useCallback((key) => t(key, lang), [lang]);

  return {
    lang,
    setLanguage,
    toggle,
    dir: lang === "ar" ? "rtl" : "ltr",
    isAr: lang === "ar",
    t: tr,
  };
}
