// src/pages/monitor/branches/pos6/pos6I18n.js
//
// POS 6 reuses the Production section's language state (same toggle, same
// localStorage key) so switching language anywhere keeps the whole monitor
// consistent. The dictionary layers POS 6 strings on top of Production's, so
// the shared header keys (hdr_*, sig_*, btn_*) keep working unchanged.

import { useCallback } from "react";
import { STR as PRD_STR, useLang as usePrdLang } from "../production/_shared/i18n";

export const POS6_STR = {
  hub_title:          { en: "POS 6",                   ar: "POS 6" },
  hub_subtitle:       { en: "Daily Inputs",            ar: "الإدخالات اليومية" },
  breadcrumb_branch:  { en: "POS 6",                   ar: "POS 6" },
  breadcrumb_inputs:  { en: "Inputs",                  ar: "الإدخالات" },

  tab_hygiene:        { en: "Personal Hygiene",        ar: "النظافة الشخصية" },
  tab_hygiene_sub:    { en: "Employee checklist",      ar: "قائمة فحص الموظفين" },
  tab_cleaning:       { en: "Cleaning Checklist",      ar: "قائمة النظافة" },
  tab_cleaning_sub:   { en: "Daily cleaning records",  ar: "سجلات النظافة اليومية" },
  tab_equipment:      { en: "Equipment Inspection",    ar: "فحص المعدات" },
  tab_equipment_sub:  { en: "Condition & sanitizing log", ar: "سجل الحالة والتعقيم" },
  tab_receiving:      { en: "Receiving Log",           ar: "سجل الاستلام" },
  tab_receiving_sub:  { en: "Incoming goods inspection", ar: "فحص البضائع الواردة" },
  tab_coolers:        { en: "Coolers Temperatures",    ar: "درجات حرارة البرادات" },
  tab_coolers_sub:    { en: "Chillers & freezers log", ar: "سجل البرادات والمجمدات" },

  // Coolers screen
  cl_subtitle:        { en: "Add as many chillers and freezers as this branch has", ar: "أضف ما تحتاجه من برادات ومجمدات حسب الفرع" },
  cl_unit:            { en: "Unit",                    ar: "الوحدة" },
  cl_add_chiller:     { en: "Add chiller",             ar: "إضافة براد" },
  cl_add_freezer:     { en: "Add freezer",             ar: "إضافة مجمّد" },
  cl_add_slot:        { en: "Add time slot",           ar: "إضافة وقت" },
  cl_remove_slot:     { en: "Remove this time slot",   ar: "حذف هذا الوقت" },
  cl_no_units:        { en: "No units yet — add a chiller or a freezer to start.", ar: "لا توجد وحدات — أضف براداً أو مجمّداً للبدء." },
  cl_chiller:         { en: "Chiller",                 ar: "براد" },
  cl_freezer:         { en: "Freezer",                 ar: "مجمّد" },
  cl_range:           { en: "Accepted range",          ar: "المدى المقبول" },
  cl_out_of_range:    { en: "out of range",            ar: "خارج المدى" },
  cl_readings:        { en: "readings",                ar: "قراءة" },
  cl_avg:             { en: "Average",                 ar: "المتوسط" },
  cl_remarks:         { en: "Remarks / corrective action", ar: "ملاحظات / إجراء تصحيحي" },
  cl_req_unit:        { en: "Add at least one unit with a reading.", ar: "أضف وحدة واحدة على الأقل مع قراءة." },

  // Receiving screen
  rc_subtitle:        { en: "Inspection of every incoming delivery", ar: "فحص كل شحنة واردة" },
  rc_add_row:         { en: "Add delivery",            ar: "إضافة شحنة" },
  rc_req_row:         { en: "Enter at least one delivery.", ar: "أدخل شحنة واحدة على الأقل." },
  rc_bad_dates:       { en: "Expiry date must be later than the production date.", ar: "تاريخ الصلاحية يجب أن يكون بعد تاريخ الإنتاج." },

  // Equipment inspection screen
  eq_section:         { en: "Section",                 ar: "القسم" },
  eq_col_equipment:   { en: "Equipment / utensils",    ar: "المعدات والأدوات" },
  eq_col_action:      { en: "Corrective action",       ar: "الإجراء التصحيحي" },
  eq_done:            { en: "Sanitized",               ar: "تم التعقيم" },
  eq_not_done:        { en: "Not done",                ar: "لم يتم" },
  eq_req_row:         { en: "Enter at least one piece of equipment.", ar: "أدخل معدة واحدة على الأقل." },
  eq_req_action:      { en: "A corrective action is required on this line.", ar: "هذا السطر يحتاج إجراءً تصحيحياً." },

  // Local draft (coolers)
  dr_saved:           { en: "Draft kept on this device", ar: "مسودة محفوظة على هذا الجهاز" },
  dr_restored:        { en: "Draft restored",            ar: "تمت استعادة المسودة" },
  dr_discard:         { en: "Discard draft",             ar: "حذف المسودة" },
  dr_note:            { en: "Only the server copy counts as the record — the draft just stops a long day being lost.", ar: "النسخة على السيرفر وحدها هي السجل — المسودة فقط تمنع ضياع يوم طويل." },

  // Shared bits POS 6 adds
  hdr_branch:         { en: "Branch",                  ar: "الفرع" },
  msg_saved:          { en: "Saved successfully",      ar: "تم الحفظ بنجاح" },
  msg_failed:         { en: "Save failed",             ar: "فشل الحفظ" },
  msg_saving:         { en: "Saving…",                 ar: "جارٍ الحفظ…" },
};

const DICT = { ...PRD_STR, ...POS6_STR };

export function useLang() {
  const base = usePrdLang();
  const t = useCallback(
    (key) => DICT[key]?.[base.lang] ?? DICT[key]?.en ?? key,
    [base.lang]
  );
  return { ...base, t };
}
