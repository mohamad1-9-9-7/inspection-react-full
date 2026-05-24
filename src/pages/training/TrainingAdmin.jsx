// src/pages/training/TrainingAdmin.jsx
// 🛠️ Training Administration Console — bilingual EN/AR
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, getModuleName, useGlobalLang } from "./TrainingSessionsList.helpers";
import { MODULES as CANON_MODULES, QUESTION_BANK as CANON_QB } from "./TrainingSessionCreate";
import { MODULE_DETAILS_BI, DEFAULT_DETAILS_BI } from "./TrainingReferenceModal";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const REPORTS_URL = `${API_BASE}/api/reports`;

/* ===================== i18n ===================== */
const I18N = {
  en: {
    app_title: "Training Admin",
    app_sub: "Console v2.0",
    nav_overview: "Overview",
    nav_modules: "Modules",
    nav_questions: "Questions",
    nav_references: "References",
    nav_settings: "Settings",
    nav_backup: "Backup",
    nav_activity: "Activity",
    nav_sessions: "Sessions",
    search_anything: "Search anything…",
    search_modules_qs: "Search modules, questions, references…",
    search_questions: "Search questions…",
    search_references: "Search references…",
    cmd_k_hint: "⌘+K — Search",
    page_subtitle: "Training Administration Console — manage everything that powers internal training.",
    btn_back: "↩ Back",
    btn_add: "➕ Add",
    btn_save: "✓ Save",
    btn_cancel: "Cancel",
    btn_delete: "🗑️",
    btn_edit: "✏️",
    btn_refresh: "🔄",
    btn_export: "📤 Export",
    btn_defaults: "📥 Defaults",
    btn_duplicate: "⎘",
    btn_add_module: "➕ Add module",
    btn_add_question: "➕ Add question",
    btn_add_reference: "➕ Add reference",
    new_module: "New module",
    new_question: "New question",
    new_reference: "New reference",
    module_name: "Module name *",
    icon: "Icon",
    color: "Color",
    description_optional: "Description (optional)",
    description_placeholder: "Brief description shown on the module card…",
    questions_count: "questions",
    refs_count: "refs",
    default_tag: "📥 Default",
    btn_questions: "❓ Questions",
    no_modules: "No modules. Add one above.",
    pick_module_above: "👆 Pick a module above to manage its questions.",
    no_questions_yet: "No questions yet. Add one or import defaults.",
    no_questions_match: "No questions match the filters.",
    no_refs_yet: "No references yet — add your first above.",
    no_refs_match: "No references match the filters.",
    no_activity: "No activity yet — start making changes to see them here.",
    no_activity_full: "No activity yet — start making changes to see them logged here.",
    activity_note: "(In-memory log — resets on page reload)",
    all_difficulties: "All difficulties",
    all_modules: "All modules",
    all_types: "All types",
    any_module: "— Any module —",
    sort_newest: "Newest first",
    sort_oldest: "Oldest first",
    sort_title: "By title",
    selected_n: "selected",
    select_all: "Select all",
    deselect_all: "Deselect all",
    bulk_delete: "🗑️ Bulk delete",
    incomplete: "⚠ Incomplete",
    move_up: "Move up",
    move_down: "Move down",
    duplicate_tip: "Duplicate",
    question_en: "Question (English)",
    question_ar: "السؤال (Arabic)",
    options_label: "Options (✓ select the correct answer)",
    difficulty: "Difficulty",
    tags_label: "Tags (comma-separated)",
    tags_placeholder: "e.g. ccp, critical, basic",
    title_required: "Title *",
    module_label: "Module",
    type_label: "Type",
    url_label: "URL / Link",
    description_label: "Description",
    quiz_settings: "🎯 Quiz Settings",
    certificate: "🎓 Certificate",
    notes_trainers: "📝 Notes for trainers",
    pass_mark: "Pass mark (%)",
    pass_mark_hint: "Minimum score to pass",
    default_language: "Default language",
    time_limit: "Time limit per quiz (minutes)",
    time_limit_hint: "0 = no limit",
    max_retakes: "Max retake attempts",
    randomize_order: "Randomize question order",
    show_answer_after: "Show correct answer after each question",
    allow_retake: "Allow retake on failure",
    org_name: "Organization name",
    signatory: "Signatory name",
    validity_months: "Validity (months)",
    notes_placeholder: "General notes / instructions visible to trainers…",
    btn_save_settings: "💾 Save settings",
    btn_seed_refs: "📥 Import Built-in",
    seed_refs_title: "Import Built-in Module References",
    seed_refs_desc: "Create one reference card per training module using the built-in content. Existing records are kept.",
    seed_refs_confirm: "Import {0} module references?\nThis adds new records without deleting existing ones.",
    seed_refs_done: "✓ Imported {0} references",
    content_label: "Reference Content (training key points)",
    content_placeholder: "Paste or type the full training reference content here…",
    ref_builtin_badge: "📥 Built-in",
    ref_preview: "Preview",
    ref_char_count: "{0} chars",
    backup_title: "💾 Download full backup",
    backup_desc: "Export a single JSON file containing all modules, questions, references, and settings. Keep it as your safety net.",
    btn_download_backup: "⬇️ Download backup file",
    restore_title: "📥 Restore from backup",
    restore_desc1: "Upload a previously downloaded JSON file to restore modules, questions, and settings.",
    restore_warning: "⚠️ This will REPLACE current data.",
    btn_choose_file: "📁 Choose backup file…",
    overview_top_modules: "📊 Top modules by question count",
    overview_quick_actions: "⚡ Quick actions",
    overview_recent_activity: "📊 Recent activity",
    qa_add_module: "➕ Add new module",
    qa_add_question: "❓ Add a question",
    qa_add_reference: "📎 Add a reference",
    qa_backup_data: "💾 Backup data",
    view_all: "View all →",
    modules_count_subtitle: "module(s) — click a card to manage its questions",
    en_lang: "English",
    ar_lang: "Arabic",
    type_module: "Module",
    type_question: "Question",
    type_reference: "Reference",
    no_matches: "No matches",
    cmd_k_help: "Start typing to search across modules, questions, and references.",
    cmd_k_esc: "Press ESC to close.",
    built_by: "Built by Eng. Mohammed Abdullah",
    // toasts / confirms
    toast_modules_saved: "Modules saved ✓",
    toast_saved: "Saved ✓",
    toast_ref_added: "Reference added ✓",
    toast_ref_updated: "Reference updated ✓",
    toast_settings_saved: "Settings saved ✓",
    toast_deleted: "Deleted ✓",
    toast_backup_done: "Backup downloaded ✓",
    toast_restored: "Restored ✓ — reload to see all changes",
    toast_module_required: "Module name required",
    toast_module_exists: "Module already exists",
    toast_select_module: "Select a module first",
    toast_question_required: "Question text required",
    toast_title_required: "Title is required",
    toast_no_defaults: "No built-in questions for this module",
    toast_load_failed: "Load failed",
    confirm_delete_module: 'Delete module "{0}"?',
    confirm_delete_question: "Delete this question?",
    confirm_delete_ref: 'Delete reference "{0}"?',
    confirm_bulk_delete_refs: "Delete {0} selected references?",
    confirm_import_defaults: 'Import {0} default questions for "{1}"?\nThis OVERWRITES current questions.',
    confirm_restore: "⚠️ Restore will REPLACE current data. Continue?",
    // log
    log_added_module: "Added module",
    log_edited_module: "Edited module",
    log_deleted_module: "Deleted module",
    log_added_question: "Added question",
    log_edited_question: "Edited question",
    log_deleted_question: "Deleted question",
    log_duplicated_question: "Duplicated question",
    log_imported_defaults: "Imported defaults",
    log_added_reference: "Added reference",
    log_edited_reference: "Edited reference",
    log_deleted_reference: "Deleted reference",
    log_updated_settings: "Updated settings",
    log_restored: "Restored from backup",
  },
  ar: {
    app_title: "إدارة التدريب",
    app_sub: "الإصدار 2.0",
    nav_overview: "نظرة عامة",
    nav_modules: "الوحدات",
    nav_questions: "الأسئلة",
    nav_references: "المراجع",
    nav_settings: "الإعدادات",
    nav_backup: "النسخ الاحتياطي",
    nav_activity: "سجل النشاط",
    nav_sessions: "جلسات تدريب",
    search_anything: "ابحث عن أي شيء…",
    search_modules_qs: "ابحث في الوحدات، الأسئلة، المراجع…",
    search_questions: "ابحث في الأسئلة…",
    search_references: "ابحث في المراجع…",
    cmd_k_hint: "⌘+K — للبحث",
    page_subtitle: "وحدة تحكم إدارة التدريب — تحكم بكل ما يدير منظومة التدريب الداخلي.",
    btn_back: "↩ رجوع",
    btn_add: "➕ إضافة",
    btn_save: "✓ حفظ",
    btn_cancel: "إلغاء",
    btn_delete: "🗑️",
    btn_edit: "✏️",
    btn_refresh: "🔄",
    btn_export: "📤 تصدير",
    btn_defaults: "📥 افتراضي",
    btn_duplicate: "⎘",
    btn_add_module: "➕ إضافة وحدة",
    btn_add_question: "➕ إضافة سؤال",
    btn_add_reference: "➕ إضافة مرجع",
    new_module: "وحدة جديدة",
    new_question: "سؤال جديد",
    new_reference: "مرجع جديد",
    module_name: "اسم الوحدة *",
    icon: "الأيقونة",
    color: "اللون",
    description_optional: "الوصف (اختياري)",
    description_placeholder: "وصف مختصر يظهر على بطاقة الوحدة…",
    questions_count: "سؤال",
    refs_count: "مراجع",
    default_tag: "📥 افتراضي",
    btn_questions: "❓ الأسئلة",
    no_modules: "لا توجد وحدات. أضف واحدة أعلاه.",
    pick_module_above: "👆 اختر وحدة من الأعلى لإدارة أسئلتها.",
    no_questions_yet: "لا توجد أسئلة بعد. أضف سؤالاً أو استورد الافتراضي.",
    no_questions_match: "لا توجد أسئلة مطابقة للفلاتر.",
    no_refs_yet: "لا توجد مراجع — أضف الأول من الأعلى.",
    no_refs_match: "لا توجد مراجع مطابقة للفلاتر.",
    no_activity: "لا يوجد نشاط بعد — ابدأ بإجراء تعديلات لتظهر هنا.",
    no_activity_full: "لا يوجد نشاط مسجل بعد — ستظهر التعديلات هنا.",
    activity_note: "(سجل مؤقت — يُمسح عند إعادة تحميل الصفحة)",
    all_difficulties: "كل المستويات",
    all_modules: "كل الوحدات",
    all_types: "كل الأنواع",
    any_module: "— أي وحدة —",
    sort_newest: "الأحدث أولاً",
    sort_oldest: "الأقدم أولاً",
    sort_title: "حسب العنوان",
    selected_n: "محدد",
    select_all: "تحديد الكل",
    deselect_all: "إلغاء التحديد",
    bulk_delete: "🗑️ حذف جماعي",
    incomplete: "⚠ ناقص",
    move_up: "أعلى",
    move_down: "أسفل",
    duplicate_tip: "نسخ",
    question_en: "السؤال (إنكليزي)",
    question_ar: "السؤال (عربي)",
    options_label: "الخيارات (✓ اختر الإجابة الصحيحة)",
    difficulty: "المستوى",
    tags_label: "الوسوم (مفصولة بفاصلة)",
    tags_placeholder: "مثلاً: ccp, حرج, أساسي",
    title_required: "العنوان *",
    module_label: "الوحدة",
    type_label: "النوع",
    url_label: "الرابط / URL",
    description_label: "الوصف",
    quiz_settings: "🎯 إعدادات الاختبار",
    certificate: "🎓 الشهادة",
    notes_trainers: "📝 ملاحظات للمدربين",
    pass_mark: "نسبة النجاح (%)",
    pass_mark_hint: "أقل درجة للنجاح",
    default_language: "اللغة الافتراضية",
    time_limit: "الوقت لكل اختبار (دقيقة)",
    time_limit_hint: "0 = بدون حد",
    max_retakes: "أقصى عدد محاولات إعادة",
    randomize_order: "ترتيب الأسئلة عشوائي",
    show_answer_after: "إظهار الإجابة الصحيحة بعد كل سؤال",
    allow_retake: "السماح بإعادة الاختبار عند الرسوب",
    org_name: "اسم المنشأة",
    signatory: "اسم الموقّع",
    validity_months: "الصلاحية (أشهر)",
    notes_placeholder: "ملاحظات عامة / تعليمات تظهر للمدربين…",
    btn_save_settings: "💾 حفظ الإعدادات",
    btn_seed_refs: "📥 استيراد المدمجة",
    seed_refs_title: "استيراد مراجع الوحدات المدمجة",
    seed_refs_desc: "إنشاء بطاقة مرجعية لكل وحدة تدريبية باستخدام المحتوى المدمج. السجلات الموجودة تُحفظ.",
    seed_refs_confirm: "استيراد {0} مراجع وحدة؟\nسيضيف سجلات جديدة دون حذف الموجودة.",
    seed_refs_done: "✓ تم استيراد {0} مرجعاً",
    content_label: "محتوى المرجع (النقاط التدريبية الأساسية)",
    content_placeholder: "الصق أو اكتب المحتوى الكامل للمرجع التدريبي هنا…",
    ref_builtin_badge: "📥 مدمج",
    ref_preview: "معاينة",
    ref_char_count: "{0} حرف",
    backup_title: "💾 تنزيل نسخة احتياطية كاملة",
    backup_desc: "تصدير ملف JSON يحتوي على كل الوحدات والأسئلة والمراجع والإعدادات. احتفظ به كأمان لبياناتك.",
    btn_download_backup: "⬇️ تنزيل ملف النسخة",
    restore_title: "📥 الاستعادة من نسخة",
    restore_desc1: "ارفع ملف JSON نُزِّل سابقاً لاستعادة الوحدات والأسئلة والإعدادات.",
    restore_warning: "⚠️ سيتم استبدال البيانات الحالية.",
    btn_choose_file: "📁 اختر ملف النسخة…",
    overview_top_modules: "📊 أعلى الوحدات بعدد الأسئلة",
    overview_quick_actions: "⚡ إجراءات سريعة",
    overview_recent_activity: "📊 آخر النشاطات",
    qa_add_module: "➕ إضافة وحدة جديدة",
    qa_add_question: "❓ إضافة سؤال",
    qa_add_reference: "📎 إضافة مرجع",
    qa_backup_data: "💾 نسخ احتياطي",
    view_all: "عرض الكل ←",
    modules_count_subtitle: "وحدة — انقر على بطاقة لإدارة أسئلتها",
    en_lang: "إنكليزي",
    ar_lang: "عربي",
    type_module: "وحدة",
    type_question: "سؤال",
    type_reference: "مرجع",
    no_matches: "لا توجد نتائج",
    cmd_k_help: "ابدأ الكتابة للبحث في الوحدات والأسئلة والمراجع.",
    cmd_k_esc: "اضغط ESC للإغلاق.",
    built_by: "تطوير: م. محمد عبدالله",
    toast_modules_saved: "تم حفظ الوحدات ✓",
    toast_saved: "تم الحفظ ✓",
    toast_ref_added: "تمت إضافة المرجع ✓",
    toast_ref_updated: "تم تحديث المرجع ✓",
    toast_settings_saved: "تم حفظ الإعدادات ✓",
    toast_deleted: "تم الحذف ✓",
    toast_backup_done: "تم تنزيل النسخة ✓",
    toast_restored: "تمت الاستعادة ✓ — أعد التحميل لرؤية كل التغييرات",
    toast_module_required: "اسم الوحدة مطلوب",
    toast_module_exists: "الوحدة موجودة مسبقاً",
    toast_select_module: "اختر وحدة أولاً",
    toast_question_required: "نص السؤال مطلوب",
    toast_title_required: "العنوان مطلوب",
    toast_no_defaults: "لا توجد أسئلة افتراضية لهذه الوحدة",
    toast_load_failed: "فشل التحميل",
    confirm_delete_module: 'حذف الوحدة "{0}"؟',
    confirm_delete_question: "حذف هذا السؤال؟",
    confirm_delete_ref: 'حذف المرجع "{0}"؟',
    confirm_bulk_delete_refs: "حذف {0} مرجعاً محدداً؟",
    confirm_import_defaults: 'استيراد {0} سؤالاً افتراضياً للوحدة "{1}"؟\nسيستبدل الأسئلة الحالية.',
    confirm_restore: "⚠️ سيتم استبدال البيانات الحالية. هل تريد المتابعة؟",
    log_added_module: "إضافة وحدة",
    log_edited_module: "تعديل وحدة",
    log_deleted_module: "حذف وحدة",
    log_added_question: "إضافة سؤال",
    log_edited_question: "تعديل سؤال",
    log_deleted_question: "حذف سؤال",
    log_duplicated_question: "نسخ سؤال",
    log_imported_defaults: "استيراد الافتراضي",
    log_added_reference: "إضافة مرجع",
    log_edited_reference: "تعديل مرجع",
    log_deleted_reference: "حذف مرجع",
    log_updated_settings: "تعديل الإعدادات",
    log_restored: "استعادة من نسخة احتياطية",
  },
};

function t(lang, key, ...args) {
  let s = I18N[lang]?.[key] ?? I18N.en[key] ?? key;
  args.forEach((a, i) => { s = s.replace(new RegExp(`\\{${i}\\}`, "g"), String(a)); });
  return s;
}

/* ===================== API helpers ===================== */
async function apiGet(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}&limit=500`, { cache: "no-store" });
  if (!res.ok) return [];
  const d = await res.json().catch(() => []);
  if (Array.isArray(d)) return d;
  return d?.data ?? d?.items ?? d?.rows ?? [];
}
async function apiPost(type, payload) {
  const res = await fetch(REPORTS_URL, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type, payload }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}
async function apiPut(id, type, payload) {
  const res = await fetch(`${REPORTS_URL}/${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type, payload }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}
async function apiDel(id) {
  const res = await fetch(`${REPORTS_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `HTTP ${res.status}`);
  return res.json().catch(() => ({ ok: true }));
}

/* ===================== Normalizer ===================== */
function normalizeCanonQuestions(mod) {
  const pack = CANON_QB[mod];
  if (!pack) return [];
  const en = pack.en || [], ar = pack.ar || [];
  const max = Math.max(en.length, ar.length);
  const out = [];
  for (let i = 0; i < max; i++) {
    const e = en[i] || {}, a = ar[i] || {};
    out.push({
      q_en: e.q || "", q_ar: a.q || "",
      options_en: e.options || ["", "", ""], options_ar: a.options || ["", "", ""],
      correct: typeof e.correct === "number" ? e.correct : (typeof a.correct === "number" ? a.correct : 0),
    });
  }
  return out;
}
function blankQuestion() {
  return { q_en: "", q_ar: "", options_en: ["", "", ""], options_ar: ["", "", ""], correct: 0, difficulty: "Medium", tags: [] };
}
function blankRef() {
  return { title: "", module: "", refType: "Link", url: "", description: "", content: "", tags: [], isBuiltIn: false };
}
function blankModuleMeta() {
  return { icon: "📋", color: "indigo", description: "", createdAt: new Date().toISOString().slice(0, 10) };
}

/* ===================== Themes ===================== */
const THEMES = {
  light: {
    pageBg: "linear-gradient(135deg,#eef2ff 0%,#f0f9ff 45%,#fdf4ff 100%)",
    sidebarBg: "linear-gradient(180deg,#1e293b,#0f172a)",
    sidebarText: "#e2e8f0", sidebarTextActive: "#fff",
    sidebarItemActive: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    cardBg: "#ffffff", cardBorder: "#e5e7eb", cardShadow: "0 4px 16px rgba(15,23,42,0.06)",
    text: "#0f172a", textMuted: "#64748b", textSubtle: "#94a3b8",
    accent: "#6366f1", success: "#059669", danger: "#dc2626", warning: "#d97706",
    inputBg: "#ffffff", inputBorder: "#d1d5db", sectionBg: "#f8fafc", chip: "#f1f5f9",
  },
  dark: {
    pageBg: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",
    sidebarBg: "linear-gradient(180deg,#020617,#0f172a)",
    sidebarText: "#cbd5e1", sidebarTextActive: "#fff",
    sidebarItemActive: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    cardBg: "#1e293b", cardBorder: "#334155", cardShadow: "0 4px 20px rgba(0,0,0,0.4)",
    text: "#f1f5f9", textMuted: "#94a3b8", textSubtle: "#64748b",
    accent: "#818cf8", success: "#10b981", danger: "#f87171", warning: "#fbbf24",
    inputBg: "#0f172a", inputBorder: "#334155", sectionBg: "#0f172a", chip: "#334155",
  },
};

const ICONS = ["📋","🧼","📦","🥩","🌡️","🎯","🚨","🚷","⚗️","🐛","🗑️","🦺","🔪","🏋️","🔥","🚑","🛢️","💻","📊","📈","📝","🎓","⚙️","🔬","🧪","🧯","💧","🍳","🧊","☕"];
const COLORS = {
  indigo:{bg:"#eef2ff",fg:"#4338ca",border:"#c7d2fe",solid:"#6366f1"},
  violet:{bg:"#f5f3ff",fg:"#6d28d9",border:"#ddd6fe",solid:"#8b5cf6"},
  pink:{bg:"#fdf2f8",fg:"#be185d",border:"#fbcfe8",solid:"#ec4899"},
  rose:{bg:"#fff1f2",fg:"#be123c",border:"#fecdd3",solid:"#f43f5e"},
  red:{bg:"#fef2f2",fg:"#b91c1c",border:"#fecaca",solid:"#ef4444"},
  orange:{bg:"#fff7ed",fg:"#c2410c",border:"#fed7aa",solid:"#f97316"},
  amber:{bg:"#fffbeb",fg:"#b45309",border:"#fde68a",solid:"#f59e0b"},
  lime:{bg:"#f7fee7",fg:"#4d7c0f",border:"#d9f99d",solid:"#84cc16"},
  emerald:{bg:"#ecfdf5",fg:"#047857",border:"#a7f3d0",solid:"#10b981"},
  teal:{bg:"#f0fdfa",fg:"#0f766e",border:"#99f6e4",solid:"#14b8a6"},
  cyan:{bg:"#ecfeff",fg:"#0e7490",border:"#a5f3fc",solid:"#06b6d4"},
  sky:{bg:"#f0f9ff",fg:"#0369a1",border:"#bae6fd",solid:"#0ea5e9"},
  blue:{bg:"#eff6ff",fg:"#1d4ed8",border:"#bfdbfe",solid:"#3b82f6"},
};
const COLOR_KEYS = Object.keys(COLORS);
const REF_TYPES = ["Link", "PDF", "Video", "SOP", "Policy", "Standard", "Document", "Other"];
const REF_TYPE_ICONS = { Link:"🔗", PDF:"📄", Video:"🎬", SOP:"📘", Policy:"📜", Standard:"📐", Document:"📑", Other:"📌" };
const DIFFICULTY = ["Easy", "Medium", "Hard"];
const DIFF_COLORS = { Easy:"emerald", Medium:"amber", Hard:"rose" };
const DIFFICULTY_LABEL = {
  en: { Easy: "Easy", Medium: "Medium", Hard: "Hard" },
  ar: { Easy: "سهل", Medium: "متوسط", Hard: "صعب" },
};

/* ===================== Style helpers ===================== */
function btnStyle(theme, variant = "default") {
  const T = THEMES[theme];
  const base = { padding: "9px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, border: "none", fontFamily: "inherit", lineHeight: 1.3, transition: "all 0.15s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 };
  if (variant === "primary") return { ...base, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", boxShadow: "0 4px 12px rgba(99,102,241,0.35)" };
  if (variant === "success") return { ...base, background: T.success, color: "#fff", boxShadow: `0 4px 12px ${T.success}40` };
  if (variant === "danger")  return { ...base, background: T.danger, color: "#fff", boxShadow: `0 4px 12px ${T.danger}40` };
  if (variant === "warning") return { ...base, background: T.warning, color: "#fff", boxShadow: `0 4px 12px ${T.warning}40` };
  if (variant === "ghost")   return { ...base, background: "transparent", color: T.text, border: `1px solid ${T.cardBorder}` };
  if (variant === "subtle")  return { ...base, background: T.chip, color: T.text };
  return { ...base, background: T.cardBg, color: T.text, border: `1px solid ${T.cardBorder}` };
}
function inputStyle(theme, multiline = false) {
  const T = THEMES[theme];
  const base = { width: "100%", borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.text, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none", transition: "border-color 0.15s" };
  return multiline ? { ...base, minHeight: 72, resize: "vertical" } : base;
}
function chipStyle(color = "indigo", small = false) {
  const c = COLORS[color] || COLORS.indigo;
  return { background: c.bg, color: c.fg, border: `1px solid ${c.border}`, padding: small ? "2px 8px" : "4px 10px", borderRadius: 99, fontSize: small ? 11 : 12, fontWeight: 800, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 };
}
function cardStyle(theme, hover = false) {
  const T = THEMES[theme];
  return { background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, boxShadow: T.cardShadow, transition: "transform 0.15s, box-shadow 0.15s", ...(hover ? { cursor: "pointer" } : {}) };
}

function countQuestions(rec) { return rec?.payload?.questions?.length || 0; }
function isQuestionComplete(q) {
  return Boolean((q.q_en || q.q_ar) && (q.options_en || []).filter(Boolean).length >= 2 && typeof q.correct === "number");
}

/* ===================== MAIN ===================== */
export default function TrainingAdmin() {
  const navigate = useNavigate();

  const [lang, setLang] = useGlobalLang();
  const [theme, setTheme] = useState(() => localStorage.getItem("training_admin_theme") || "light");
  const [section, setSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showCmdK, setShowCmdK] = useState(false);

  const [modulesRecord, setModulesRecord] = useState(null);
  const [modulesMeta, setModulesMeta] = useState({});
  const [modules, setModules] = useState(CANON_MODULES);
  const [editingModule, setEditingModule] = useState(null);
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModule, setNewModule] = useState({ name: "", ...blankModuleMeta() });

  const [qModule, setQModule] = useState("");
  const [questionsRecords, setQuestionsRecords] = useState([]);
  const [showAddQ, setShowAddQ] = useState(false);
  const [newQ, setNewQ] = useState(blankQuestion());
  const [editingQIdx, setEditingQIdx] = useState(null);
  const [editingQData, setEditingQData] = useState(null);
  const [qSearch, setQSearch] = useState("");
  const [qDifficulty, setQDifficulty] = useState("");

  const [references, setReferences] = useState([]);
  const [refFilter, setRefFilter] = useState("");
  const [refModuleFilter, setRefModuleFilter] = useState("");
  const [refTypeFilter, setRefTypeFilter] = useState("");
  const [refSort, setRefSort] = useState("newest");
  const [showAddRef, setShowAddRef] = useState(false);
  const [editingRef, setEditingRef] = useState(null);
  const [newRef, setNewRef] = useState(blankRef());
  const [selectedRefs, setSelectedRefs] = useState(new Set());

  const [settingsRecord, setSettingsRecord] = useState(null);
  const [settings, setSettings] = useState({
    passMark: 80, defaultLang: "en", certValidity: 12,
    quizTimeLimit: 0, randomizeOrder: false, showAnswerAfter: true,
    allowRetake: true, maxRetakes: 2,
    orgName: "QCS", signatory: "QA Manager", notes: "",
  });

  const [activity, setActivity] = useState([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const importFileRef = useRef(null);

  const T = THEMES[theme];
  const tt = (k, ...a) => t(lang, k, ...a);
  const isAr = lang === "ar";

  function toast(text, kind = "success") {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, text, kind }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
  }
  function logActivity(action, target) {
    setActivity((p) => [{ id: Date.now(), at: new Date().toISOString(), action, target }, ...p].slice(0, 50));
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [modRecs, qRecs, refRecs, setRecs, sessRecs] = await Promise.all([
        apiGet("training_config"), apiGet("training_questions"),
        apiGet("training_reference"), apiGet("training_settings"),
        apiGet("training_session"),
      ]);
      const modRec = modRecs[0] || null;
      setModulesRecord(modRec);
      if (modRec?.payload?.modules?.length) setModules(modRec.payload.modules);
      if (modRec?.payload?.meta) setModulesMeta(modRec.payload.meta);
      setQuestionsRecords(qRecs); setReferences(refRecs);
      const setRec = setRecs[0] || null;
      setSettingsRecord(setRec);
      if (setRec?.payload) setSettings((p) => ({ ...p, ...setRec.payload }));
      setSessionsCount(sessRecs.length);
    } catch (e) {
      toast(`${tt("toast_load_failed")}: ${e.message}`, "error");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { localStorage.setItem("training_admin_theme", theme); }, [theme]);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setShowCmdK(true); }
      if (e.key === "Escape") setShowCmdK(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* MODULES */
  async function saveModulesList(list, meta = modulesMeta) {
    try {
      const payload = { modules: list, meta };
      const saved = modulesRecord?.id
        ? await apiPut(modulesRecord.id, "training_config", payload)
        : await apiPost("training_config", payload);
      setModules(list); setModulesMeta(meta);
      setModulesRecord(saved?.id ? { id: saved.id, payload } : modulesRecord);
      toast(tt("toast_modules_saved"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleAddModule() {
    const name = newModule.name.trim();
    if (!name) { toast(tt("toast_module_required"), "error"); return; }
    if (modules.includes(name)) { toast(tt("toast_module_exists"), "error"); return; }
    const meta = { ...modulesMeta, [name]: { icon: newModule.icon, color: newModule.color, description: newModule.description, createdAt: new Date().toISOString().slice(0, 10) } };
    await saveModulesList([...modules, name], meta);
    logActivity(tt("log_added_module"), name);
    setNewModule({ name: "", ...blankModuleMeta() }); setShowAddModule(false);
  }
  async function handleSaveModuleEdit() {
    if (!editingModule) return;
    const { originalName, name, icon, color, description } = editingModule;
    const trimmed = name.trim(); if (!trimmed) return;
    const updatedModules = modules.map((m) => (m === originalName ? trimmed : m));
    const meta = { ...modulesMeta };
    if (originalName !== trimmed) { meta[trimmed] = { ...(meta[originalName] || {}), icon, color, description }; delete meta[originalName]; }
    else meta[trimmed] = { ...(meta[trimmed] || {}), icon, color, description };
    await saveModulesList(updatedModules, meta);
    logActivity(tt("log_edited_module"), trimmed);
    setEditingModule(null);
  }
  async function handleDeleteModule(name) {
    if (!window.confirm(tt("confirm_delete_module", name))) return;
    const meta = { ...modulesMeta }; delete meta[name];
    await saveModulesList(modules.filter((m) => m !== name), meta);
    logActivity(tt("log_deleted_module"), name);
  }
  async function handleMoveModule(idx, dir) {
    const ni = idx + dir; if (ni < 0 || ni >= modules.length) return;
    const u = [...modules]; [u[idx], u[ni]] = [u[ni], u[idx]];
    await saveModulesList(u);
  }
  function moduleMetaFor(name) {
    const m = modulesMeta[name];
    if (m) return { icon: m.icon || "📋", color: m.color || "indigo", description: m.description || "", createdAt: m.createdAt || "" };
    return blankModuleMeta();
  }

  /* QUESTIONS */
  function getQuestionsForModule(mod) {
    const rec = questionsRecords.find((r) => r?.payload?.module === mod);
    if (rec?.payload?.questions?.length) return { id: rec.id, questions: rec.payload.questions };
    return { id: null, questions: normalizeCanonQuestions(mod) };
  }
  async function persistQuestions(mod, questions, existingId) {
    try {
      const saved = existingId
        ? await apiPut(existingId, "training_questions", { module: mod, questions })
        : await apiPost("training_questions", { module: mod, questions });
      setQuestionsRecords((prev) => {
        const idx = prev.findIndex((r) => r?.payload?.module === mod);
        const rec = { id: saved?.id ?? existingId, payload: { module: mod, questions } };
        if (idx >= 0) { const c = [...prev]; c[idx] = rec; return c; }
        return [...prev, rec];
      });
      toast(tt("toast_saved"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleAddQuestion() {
    if (!qModule) { toast(tt("toast_select_module"), "error"); return; }
    if (!newQ.q_en.trim() && !newQ.q_ar.trim()) { toast(tt("toast_question_required"), "error"); return; }
    const { id, questions } = getQuestionsForModule(qModule);
    await persistQuestions(qModule, [...questions, { ...newQ }], id);
    logActivity(tt("log_added_question"), qModule);
    setNewQ(blankQuestion()); setShowAddQ(false);
  }
  async function handleDeleteQuestion(idx) {
    if (!qModule || !window.confirm(tt("confirm_delete_question"))) return;
    const { id, questions } = getQuestionsForModule(qModule);
    await persistQuestions(qModule, questions.filter((_, i) => i !== idx), id);
    logActivity(tt("log_deleted_question"), qModule);
  }
  async function handleMoveQuestion(idx, dir) {
    if (!qModule) return;
    const { id, questions } = getQuestionsForModule(qModule);
    const ni = idx + dir; if (ni < 0 || ni >= questions.length) return;
    const a = [...questions]; [a[idx], a[ni]] = [a[ni], a[idx]];
    await persistQuestions(qModule, a, id);
  }
  async function handleDuplicateQuestion(idx) {
    if (!qModule) return;
    const { id, questions } = getQuestionsForModule(qModule);
    const dup = { ...questions[idx] };
    const a = [...questions.slice(0, idx + 1), dup, ...questions.slice(idx + 1)];
    await persistQuestions(qModule, a, id);
    logActivity(tt("log_duplicated_question"), qModule);
  }
  async function handleSaveEditQuestion() {
    if (editingQIdx === null || !qModule) return;
    const { id, questions } = getQuestionsForModule(qModule);
    const c = [...questions]; c[editingQIdx] = { ...editingQData };
    await persistQuestions(qModule, c, id);
    logActivity(tt("log_edited_question"), qModule);
    setEditingQIdx(null); setEditingQData(null);
  }
  async function handleImportDefaults() {
    if (!qModule) { toast(tt("toast_select_module"), "error"); return; }
    const defaults = normalizeCanonQuestions(qModule);
    if (!defaults.length) { toast(tt("toast_no_defaults"), "error"); return; }
    if (!window.confirm(tt("confirm_import_defaults", defaults.length, qModule))) return;
    const { id } = getQuestionsForModule(qModule);
    await persistQuestions(qModule, defaults, id);
    logActivity(tt("log_imported_defaults"), qModule);
  }
  function handleExportQuestions(mod = qModule) {
    if (!mod) return;
    const { questions } = getQuestionsForModule(mod);
    const blob = new Blob([JSON.stringify({ module: mod, questions }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `questions_${mod.replace(/\s+/g, "_")}.json`; a.click();
  }

  /* REFERENCES */
  async function handleAddReference() {
    const r = { ...newRef, addedAt: new Date().toISOString().slice(0, 10) };
    if (!r.title.trim()) { toast(tt("toast_title_required"), "error"); return; }
    try {
      const saved = await apiPost("training_reference", r);
      setReferences((p) => [{ id: saved?.id, payload: r, created_at: new Date().toISOString() }, ...p]);
      logActivity(tt("log_added_reference"), r.title);
      setNewRef(blankRef()); setShowAddRef(false);
      toast(tt("toast_ref_added"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleUpdateReference() {
    if (!editingRef) return;
    try {
      await apiPut(editingRef.id, "training_reference", editingRef.payload);
      setReferences((p) => p.map((r) => (r.id === editingRef.id ? { ...r, payload: editingRef.payload } : r)));
      logActivity(tt("log_edited_reference"), editingRef.payload.title);
      setEditingRef(null); toast(tt("toast_ref_updated"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleDeleteReference(id) {
    const r = references.find((x) => x.id === id);
    if (!window.confirm(tt("confirm_delete_ref", r?.payload?.title || id))) return;
    try {
      await apiDel(id);
      setReferences((p) => p.filter((x) => x.id !== id));
      setSelectedRefs((p) => { const n = new Set(p); n.delete(id); return n; });
      logActivity(tt("log_deleted_reference"), r?.payload?.title || String(id));
      toast(tt("toast_deleted"));
    } catch (e) { toast(e.message, "error"); }
  }
  async function handleBulkDeleteRefs() {
    if (selectedRefs.size === 0) return;
    if (!window.confirm(tt("confirm_bulk_delete_refs", selectedRefs.size))) return;
    for (const id of selectedRefs) { try { await apiDel(id); } catch {} }
    setReferences((p) => p.filter((r) => !selectedRefs.has(r.id)));
    setSelectedRefs(new Set());
    toast(tt("toast_deleted"));
  }
  async function handleSeedBuiltInRefs() {
    const today = new Date().toISOString().slice(0, 10);
    const existingModules = new Set(references.map((r) => r?.payload?.module));
    const toImport = modules.filter((m) => !existingModules.has(m) || !references.some((r) => r?.payload?.module === m && r?.payload?.isBuiltIn));
    if (!toImport.length) { toast(lang === "ar" ? "كل المراجع المدمجة موجودة مسبقاً" : "All built-in refs already exist"); return; }
    if (!window.confirm(tt("seed_refs_confirm", toImport.length))) return;
    let count = 0;
    for (const mod of toImport) {
      try {
        const content = MODULE_DETAILS_BI[mod] || DEFAULT_DETAILS_BI;
        const firstLine = content.split("\n")[0].trim().slice(0, 120);
        const payload = {
          title: `${mod} — Reference`,
          module: mod,
          refType: "Document",
          url: "",
          description: firstLine,
          content,
          tags: ["built-in"],
          isBuiltIn: true,
          addedAt: today,
        };
        const saved = await apiPost("training_reference", payload);
        setReferences((p) => [{ id: saved?.id, payload, created_at: new Date().toISOString() }, ...p]);
        count++;
      } catch {}
    }
    logActivity(lang === "ar" ? "استيراد مراجع مدمجة" : "Seeded built-in refs", `${count} modules`);
    toast(tt("seed_refs_done", count));
  }

  function handleExportReferences(items = filteredRefs) {
    const data = items.map((r) => r.payload);
    const csv = [
      "title,module,type,url,description,addedAt",
      ...data.map((r) => [r.title, r.module, r.refType, r.url, r.description, r.addedAt].map((v) => `"${String(v || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "training_references.csv"; a.click();
  }

  /* SETTINGS */
  async function handleSaveSettings() {
    try {
      if (settingsRecord?.id) await apiPut(settingsRecord.id, "training_settings", settings);
      else { const saved = await apiPost("training_settings", settings); setSettingsRecord({ id: saved?.id }); }
      logActivity(tt("log_updated_settings"), "");
      toast(tt("toast_settings_saved"));
    } catch (e) { toast(e.message, "error"); }
  }

  /* BACKUP / RESTORE */
  function handleFullBackup() {
    const backup = {
      version: 1, generatedAt: new Date().toISOString(),
      modules, modulesMeta,
      questions: questionsRecords.map((r) => r.payload),
      references: references.map((r) => r.payload),
      settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `training_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
    toast(tt("toast_backup_done"));
  }
  async function handleRestoreFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== "object") throw new Error("Invalid file");
      if (!window.confirm(tt("confirm_restore"))) return;
      if (Array.isArray(data.modules)) await saveModulesList(data.modules, data.modulesMeta || {});
      if (Array.isArray(data.questions)) {
        for (const q of data.questions) {
          if (q?.module) {
            const existing = questionsRecords.find((r) => r?.payload?.module === q.module);
            await persistQuestions(q.module, q.questions || [], existing?.id || null);
          }
        }
      }
      if (data.settings && typeof data.settings === "object") setSettings((p) => ({ ...p, ...data.settings }));
      toast(tt("toast_restored"));
      logActivity(tt("log_restored"), "");
      setTimeout(() => loadAll(), 600);
    } catch (e) { toast(`${tt("toast_load_failed")}: ${e.message}`, "error"); }
  }

  /* DERIVED */
  const totalQuestions = useMemo(() => questionsRecords.reduce((s, r) => s + countQuestions(r), 0), [questionsRecords]);
  const modulesWithStats = useMemo(() => modules.map((name) => {
    const rec = questionsRecords.find((r) => r?.payload?.module === name);
    const meta = moduleMetaFor(name);
    const qCount = rec?.payload?.questions?.length || normalizeCanonQuestions(name).length;
    const refCount = references.filter((r) => r?.payload?.module === name).length;
    return { name, ...meta, qCount, refCount, hasServerQuestions: Boolean(rec) };
  }), [modules, modulesMeta, questionsRecords, references]);

  const filteredRefs = useMemo(() => {
    let arr = references.filter((r) => {
      const p = r.payload || {};
      if (refModuleFilter && p.module !== refModuleFilter) return false;
      if (refTypeFilter && p.refType !== refTypeFilter) return false;
      if (refFilter) {
        const tx = refFilter.toLowerCase();
        const hay = [p.title, p.module, p.refType, p.description, p.url].join(" ").toLowerCase();
        if (!hay.includes(tx)) return false;
      }
      return true;
    });
    if (refSort === "newest") arr.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (refSort === "oldest") arr.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    if (refSort === "title")  arr.sort((a, b) => (a.payload?.title || "").localeCompare(b.payload?.title || ""));
    return arr;
  }, [references, refFilter, refModuleFilter, refTypeFilter, refSort]);

  const currentQData = qModule ? getQuestionsForModule(qModule) : { id: null, questions: [] };
  const filteredQuestions = useMemo(() => {
    let arr = currentQData.questions.map((q, idx) => ({ ...q, _idx: idx }));
    if (qSearch) {
      const tx = qSearch.toLowerCase();
      arr = arr.filter((q) => [q.q_en, q.q_ar, ...(q.options_en || []), ...(q.options_ar || [])].join(" ").toLowerCase().includes(tx));
    }
    if (qDifficulty) arr = arr.filter((q) => (q.difficulty || "Medium") === qDifficulty);
    return arr;
  }, [currentQData, qSearch, qDifficulty]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const tx = globalSearch.toLowerCase();
    const out = [];
    modules.forEach((m) => { if (m.toLowerCase().includes(tx)) out.push({ type: tt("type_module"), name: m, action: () => { setSection("modules"); setShowCmdK(false); } }); });
    questionsRecords.forEach((rec) => {
      (rec?.payload?.questions || []).forEach((q, idx) => {
        if ([q.q_en, q.q_ar].join(" ").toLowerCase().includes(tx)) {
          out.push({ type: tt("type_question"), name: `${rec.payload.module} — Q${idx + 1}: ${q.q_en || q.q_ar}`, action: () => { setSection("questions"); setQModule(rec.payload.module); setShowCmdK(false); } });
        }
      });
    });
    references.forEach((r) => {
      const p = r.payload || {};
      if ([p.title, p.description].join(" ").toLowerCase().includes(tx)) {
        out.push({ type: tt("type_reference"), name: p.title, action: () => { setSection("references"); setRefFilter(p.title); setShowCmdK(false); } });
      }
    });
    return out.slice(0, 30);
  }, [globalSearch, modules, questionsRecords, references, lang]);

  const NAV = [
    { key: "overview",   icon: "🏠", label: tt("nav_overview") },
    { key: "modules",    icon: "📋", label: tt("nav_modules"),    badge: modules.length },
    { key: "questions",  icon: "❓", label: tt("nav_questions"),  badge: totalQuestions },
    { key: "references", icon: "📎", label: tt("nav_references"), badge: references.length },
    { key: "settings",   icon: "⚙️", label: tt("nav_settings") },
    { key: "backup",     icon: "💾", label: tt("nav_backup") },
    { key: "activity",   icon: "📊", label: tt("nav_activity") },
  ];

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      style={{ minHeight: "100vh", background: T.pageBg, color: T.text, fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, sans-serif", display: "flex" }}
    >
      {/* ===== Sidebar ===== */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 64,
          background: T.sidebarBg, color: T.sidebarText,
          minHeight: "100vh", padding: "16px 10px", boxSizing: "border-box",
          transition: "width 0.2s", display: "flex", flexDirection: "column",
          position: "sticky", top: 0, maxHeight: "100vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 1000, fontSize: 15, color: T.sidebarTextActive }}>🛠️ {tt("app_title")}</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{tt("app_sub")}</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "transparent", color: T.sidebarText, border: "none", cursor: "pointer", padding: 6, fontSize: 16 }}>
            {isAr ? (sidebarOpen ? "⇥" : "⇤") : (sidebarOpen ? "⇤" : "⇥")}
          </button>
        </div>

        <nav style={{ display: "grid", gap: 4, flex: 1 }}>
          {NAV.map((n) => {
            const active = section === n.key;
            return (
              <button
                key={n.key}
                onClick={() => setSection(n.key)}
                style={{
                  background: active ? T.sidebarItemActive : "transparent",
                  color: active ? T.sidebarTextActive : T.sidebarText,
                  border: "none", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  fontWeight: active ? 1000 : 800, fontSize: 13,
                  display: "flex", alignItems: "center", gap: 10,
                  textAlign: isAr ? "right" : "left", fontFamily: "inherit",
                  boxShadow: active ? "0 4px 12px rgba(99,102,241,0.4)" : "none",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 16 }}>{n.icon}</span>
                {sidebarOpen && <span style={{ flex: 1 }}>{n.label}</span>}
                {sidebarOpen && typeof n.badge === "number" && (
                  <span style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", padding: "2px 7px", borderRadius: 99, fontSize: 11, fontWeight: 1000 }}>{n.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div style={{ marginTop: 12, padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, opacity: 0.7 }}>
            <div>{tt("cmd_k_hint")}</div>
            <div style={{ marginTop: 4 }}>{tt("built_by")}</div>
          </div>
        )}
      </aside>

      {/* ===== Main ===== */}
      <main style={{ flex: 1, padding: "18px 22px", boxSizing: "border-box", minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 1000, color: T.text }}>
              {NAV.find((n) => n.key === section)?.icon} {NAV.find((n) => n.key === section)?.label}
            </div>
            <div style={{ color: T.textMuted, fontSize: 12, fontWeight: 700, marginTop: 2 }}>
              {tt("page_subtitle")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setShowCmdK(true)} style={{ ...btnStyle(theme, "ghost"), padding: "8px 14px", minWidth: 220, justifyContent: "space-between" }}>
              <span style={{ color: T.textMuted }}>🔍 {tt("search_anything")}</span>
              <span style={{ fontSize: 10, padding: "2px 6px", border: `1px solid ${T.cardBorder}`, borderRadius: 4, color: T.textMuted }}>⌘K</span>
            </button>
            <button onClick={() => setLang(isAr ? "en" : "ar")} style={btnStyle(theme)} title={isAr ? "Switch to English" : "بدّل إلى العربية"}>
              🌐 {isAr ? "EN" : "ع"}
            </button>
            <button onClick={loadAll} style={btnStyle(theme)} title={tt("btn_refresh")}>{loading ? "⏳" : "🔄"}</button>
            <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} style={btnStyle(theme)}>
              {theme === "light" ? "🌙" : "☀️"}
            </button>
            <button onClick={() => navigate("/training")} style={btnStyle(theme, "ghost")}>{tt("btn_back")}</button>
          </div>
        </div>

        {section === "overview" && <OverviewSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modules={modules} modulesWithStats={modulesWithStats} totalQuestions={totalQuestions} references={references} sessionsCount={sessionsCount} activity={activity} onJump={(s) => setSection(s)} />}
        {section === "modules" && <ModulesSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modulesWithStats={modulesWithStats} showAddModule={showAddModule} setShowAddModule={setShowAddModule} newModule={newModule} setNewModule={setNewModule} editingModule={editingModule} setEditingModule={setEditingModule} onAdd={handleAddModule} onSaveEdit={handleSaveModuleEdit} onDelete={handleDeleteModule} onMove={handleMoveModule} onJumpToQuestions={(mod) => { setSection("questions"); setQModule(mod); }} />}
        {section === "questions" && <QuestionsSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modulesWithStats={modulesWithStats} qModule={qModule} setQModule={setQModule} currentQData={currentQData} filteredQuestions={filteredQuestions} qSearch={qSearch} setQSearch={setQSearch} qDifficulty={qDifficulty} setQDifficulty={setQDifficulty} showAddQ={showAddQ} setShowAddQ={setShowAddQ} newQ={newQ} setNewQ={setNewQ} editingQIdx={editingQIdx} setEditingQIdx={setEditingQIdx} editingQData={editingQData} setEditingQData={setEditingQData} onAdd={handleAddQuestion} onSaveEdit={handleSaveEditQuestion} onDelete={handleDeleteQuestion} onMove={handleMoveQuestion} onDuplicate={handleDuplicateQuestion} onImportDefaults={handleImportDefaults} onExport={handleExportQuestions} />}
        {section === "references" && <ReferencesSection T={T} theme={theme} tt={tt} isAr={isAr} lang={lang} modules={modules} references={references} filteredRefs={filteredRefs} refFilter={refFilter} setRefFilter={setRefFilter} refModuleFilter={refModuleFilter} setRefModuleFilter={setRefModuleFilter} refTypeFilter={refTypeFilter} setRefTypeFilter={setRefTypeFilter} refSort={refSort} setRefSort={setRefSort} showAddRef={showAddRef} setShowAddRef={setShowAddRef} newRef={newRef} setNewRef={setNewRef} editingRef={editingRef} setEditingRef={setEditingRef} selectedRefs={selectedRefs} setSelectedRefs={setSelectedRefs} onAdd={handleAddReference} onUpdate={handleUpdateReference} onDelete={handleDeleteReference} onBulkDelete={handleBulkDeleteRefs} onExport={handleExportReferences} onSeedBuiltIn={handleSeedBuiltInRefs} />}
        {section === "settings" && <SettingsSection T={T} theme={theme} tt={tt} settings={settings} setSettings={setSettings} onSave={handleSaveSettings} />}
        {section === "backup" && <BackupSection T={T} theme={theme} tt={tt} stats={{ modules: modules.length, questions: totalQuestions, references: references.length }} onBackup={handleFullBackup} onRestoreClick={() => importFileRef.current?.click()} />}
        {section === "activity" && <ActivitySection T={T} tt={tt} activity={activity} />}

        <input ref={importFileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestoreFile(f); e.target.value = ""; }} />
      </main>

      {showCmdK && <CmdKModal T={T} theme={theme} tt={tt} search={globalSearch} setSearch={setGlobalSearch} results={globalSearchResults} onClose={() => setShowCmdK(false)} />}

      <div style={{ position: "fixed", [isAr ? "left" : "right"]: 18, bottom: 18, display: "flex", flexDirection: "column", gap: 8, zIndex: 10000 }}>
        {toasts.map((tx) => (
          <div key={tx.id} style={{ background: tx.kind === "error" ? "#fef2f2" : "#ecfdf5", color: tx.kind === "error" ? "#b91c1c" : "#047857", border: `1px solid ${tx.kind === "error" ? "#fecaca" : "#a7f3d0"}`, padding: "10px 16px", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", fontWeight: 900, fontSize: 13, minWidth: 240 }}>
            {tx.kind === "error" ? "❌" : "✅"} {tx.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== OVERVIEW ===================== */
function OverviewSection({ T, theme, tt, isAr, lang, modules, modulesWithStats, totalQuestions, references, sessionsCount, activity, onJump }) {
  const top5 = [...modulesWithStats].sort((a, b) => b.qCount - a.qCount).slice(0, 6);
  const maxQ = Math.max(...modulesWithStats.map((m) => m.qCount), 1);
  const kpis = [
    { key: "modules", value: modules.length, icon: "📋", color: "indigo", label: tt("nav_modules"), onClick: () => onJump("modules") },
    { key: "questions", value: totalQuestions, icon: "❓", color: "violet", label: tt("nav_questions"), onClick: () => onJump("questions") },
    { key: "references", value: references.length, icon: "📎", color: "emerald", label: tt("nav_references"), onClick: () => onJump("references") },
    { key: "sessions", value: sessionsCount, icon: "🎓", color: "amber", label: tt("nav_sessions"), onClick: () => {} },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {kpis.map((k) => {
          const c = COLORS[k.color];
          return (
            <div key={k.key} onClick={k.onClick} style={{ ...cardStyle(theme, true), padding: 18, background: `linear-gradient(135deg, ${c.bg}, ${T.cardBg})`, borderColor: c.border, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 900 }}>{k.label}</div>
                  <div style={{ fontSize: 36, fontWeight: 1000, color: c.fg, lineHeight: 1.1, marginTop: 4 }}>{k.value}</div>
                </div>
                <div style={{ fontSize: 32 }}>{k.icon}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <div style={{ ...cardStyle(theme), padding: 18 }}>
          <div style={{ fontWeight: 1000, marginBottom: 14, fontSize: 15 }}>{tt("overview_top_modules")}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {top5.map((m) => {
              const c = COLORS[m.color] || COLORS.indigo;
              const pct = (m.qCount / maxQ) * 100;
              return (
                <div key={m.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900, marginBottom: 4 }}>
                    <span>{m.icon} {getModuleName(m.name, lang)}</span>
                    <span style={{ color: c.fg }}>{m.qCount}</span>
                  </div>
                  <div style={{ background: T.chip, borderRadius: 99, height: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, ${c.solid}, ${c.solid}cc)`, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ ...cardStyle(theme), padding: 18 }}>
          <div style={{ fontWeight: 1000, marginBottom: 14, fontSize: 15 }}>{tt("overview_quick_actions")}</div>
          <div style={{ display: "grid", gap: 8 }}>
            <button onClick={() => onJump("modules")} style={{ ...btnStyle(theme, "primary"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_add_module")}</button>
            <button onClick={() => onJump("questions")} style={{ ...btnStyle(theme, "ghost"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_add_question")}</button>
            <button onClick={() => onJump("references")} style={{ ...btnStyle(theme, "ghost"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_add_reference")}</button>
            <button onClick={() => onJump("backup")} style={{ ...btnStyle(theme, "ghost"), justifyContent: isAr ? "flex-end" : "flex-start", padding: "12px 14px" }}>{tt("qa_backup_data")}</button>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 1000, fontSize: 15 }}>{tt("overview_recent_activity")}</div>
          {activity.length > 0 && <button onClick={() => onJump("activity")} style={btnStyle(theme, "subtle")}>{tt("view_all")}</button>}
        </div>
        {activity.length === 0 ? (
          <div style={{ color: T.textSubtle, textAlign: "center", padding: 20, fontWeight: 800 }}>{tt("no_activity")}</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {activity.slice(0, 6).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: T.sectionBg, borderRadius: 8, fontSize: 12 }}>
                <span style={{ fontWeight: 900 }}>{a.action} <span style={{ color: T.textMuted }}>{a.target}</span></span>
                <span style={{ color: T.textSubtle }}>{new Date(a.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== MODULES ===================== */
function ModulesSection({ T, theme, tt, isAr, lang, modulesWithStats, showAddModule, setShowAddModule, newModule, setNewModule, editingModule, setEditingModule, onAdd, onSaveEdit, onDelete, onMove, onJumpToQuestions }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ color: T.textMuted, fontWeight: 800, fontSize: 13 }}>
          {modulesWithStats.length} {tt("modules_count_subtitle")}
        </div>
        <button onClick={() => setShowAddModule((v) => !v)} style={btnStyle(theme, "primary")}>{tt("btn_add_module")}</button>
      </div>

      {showAddModule && (
        <div style={{ ...cardStyle(theme), padding: 18, borderColor: T.accent, borderWidth: 2 }}>
          <div style={{ fontWeight: 1000, marginBottom: 12, color: T.accent }}>{tt("new_module")}</div>
          <ModuleMetaForm theme={theme} T={T} tt={tt} data={newModule} onChange={setNewModule} showName />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onAdd} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
            <button onClick={() => setShowAddModule(false)} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {modulesWithStats.map((m, idx) => {
          const c = COLORS[m.color] || COLORS.indigo;
          const isEditing = editingModule?.originalName === m.name;
          return (
            <div key={m.name} style={{ ...cardStyle(theme), padding: 0, overflow: "hidden" }}>
              <div style={{ background: `linear-gradient(135deg, ${c.solid}, ${c.solid}aa)`, padding: "14px 16px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 28 }}>{m.icon}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => onMove(idx, -1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 900 }}>↑</button>
                  <button onClick={() => onMove(idx, 1)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontWeight: 900 }}>↓</button>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                {isEditing ? (
                  <>
                    <ModuleMetaForm theme={theme} T={T} tt={tt} data={editingModule} onChange={setEditingModule} showName />
                    <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                      <button onClick={onSaveEdit} style={btnStyle(theme, "success")}>{tt("btn_save")}</button>
                      <button onClick={() => setEditingModule(null)} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 1000, color: T.text, marginBottom: 4 }}>{getModuleName(m.name, lang)}</div>
                    {m.description && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{m.description}</div>}
                    <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                      <span style={chipStyle(m.color, true)}>❓ {m.qCount} {tt("questions_count")}</span>
                      <span style={chipStyle("sky", true)}>📎 {m.refCount} {tt("refs_count")}</span>
                      {!m.hasServerQuestions && <span style={chipStyle("amber", true)}>{tt("default_tag")}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => onJumpToQuestions(m.name)} style={btnStyle(theme, "primary")}>{tt("btn_questions")}</button>
                      <button onClick={() => setEditingModule({ originalName: m.name, name: m.name, icon: m.icon, color: m.color, description: m.description })} style={btnStyle(theme, "ghost")}>{tt("btn_edit")}</button>
                      <button onClick={() => onDelete(m.name)} style={btnStyle(theme, "danger")}>{tt("btn_delete")}</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleMetaForm({ theme, T, tt, data, onChange, showName }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {showName && (
        <div>
          <Label T={T}>{tt("module_name")}</Label>
          <input style={inputStyle(theme)} value={data.name} onChange={(e) => onChange({ ...data, name: e.target.value })} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label T={T}>{tt("icon")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflow: "auto", padding: 6, border: `1px solid ${T.inputBorder}`, borderRadius: 10, background: T.inputBg }}>
            {ICONS.map((ic) => (
              <button key={ic} type="button" onClick={() => onChange({ ...data, icon: ic })} style={{ width: 32, height: 32, fontSize: 18, background: data.icon === ic ? T.accent : "transparent", color: data.icon === ic ? "#fff" : T.text, border: `1px solid ${data.icon === ic ? T.accent : T.cardBorder}`, borderRadius: 6, cursor: "pointer" }}>{ic}</button>
            ))}
          </div>
        </div>
        <div>
          <Label T={T}>{tt("color")}</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: 6, border: `1px solid ${T.inputBorder}`, borderRadius: 10, background: T.inputBg }}>
            {COLOR_KEYS.map((ck) => {
              const c = COLORS[ck];
              return <button key={ck} type="button" onClick={() => onChange({ ...data, color: ck })} style={{ width: 26, height: 26, background: c.solid, border: data.color === ck ? "3px solid #0f172a" : "2px solid #fff", borderRadius: "50%", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }} />;
            })}
          </div>
        </div>
      </div>
      <div>
        <Label T={T}>{tt("description_optional")}</Label>
        <textarea style={inputStyle(theme, true)} value={data.description} onChange={(e) => onChange({ ...data, description: e.target.value })} placeholder={tt("description_placeholder")} />
      </div>
    </div>
  );
}

/* ===================== QUESTIONS ===================== */
function QuestionsSection({ T, theme, tt, isAr, lang, modulesWithStats, qModule, setQModule, currentQData, filteredQuestions, qSearch, setQSearch, qDifficulty, setQDifficulty, showAddQ, setShowAddQ, newQ, setNewQ, editingQIdx, setEditingQIdx, editingQData, setEditingQData, onAdd, onSaveEdit, onDelete, onMove, onDuplicate, onImportDefaults, onExport }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...cardStyle(theme), padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {modulesWithStats.map((m) => {
            const c = COLORS[m.color] || COLORS.indigo;
            const active = m.name === qModule;
            return (
              <button key={m.name} onClick={() => setQModule(m.name)}
                style={{ padding: "8px 14px", borderRadius: 99, border: active ? `2px solid ${c.solid}` : `1px solid ${T.cardBorder}`, background: active ? c.bg : T.cardBg, color: active ? c.fg : T.text, fontWeight: active ? 1000 : 800, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                <span>{m.icon}</span>
                <span>{getModuleName(m.name, lang)}</span>
                <span style={{ background: active ? c.solid : T.chip, color: active ? "#fff" : T.textMuted, padding: "1px 6px", borderRadius: 99, fontSize: 10, fontWeight: 1000 }}>{m.qCount}</span>
              </button>
            );
          })}
        </div>
      </div>

      {qModule ? (
        <>
          <div style={{ ...cardStyle(theme), padding: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...inputStyle(theme), maxWidth: 260 }} placeholder={`🔍 ${tt("search_questions")}`} value={qSearch} onChange={(e) => setQSearch(e.target.value)} />
            <select style={{ ...inputStyle(theme), maxWidth: 160 }} value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
              <option value="">{tt("all_difficulties")}</option>
              {DIFFICULTY.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[lang]?.[d] || d}</option>)}
            </select>
            <div style={{ flex: 1 }} />
            <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 800 }}>{filteredQuestions.length} / {currentQData.questions.length}</span>
            <button onClick={() => setShowAddQ((v) => !v)} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
            <button onClick={onImportDefaults} style={btnStyle(theme, "warning")}>{tt("btn_defaults")}</button>
            <button onClick={() => onExport()} style={btnStyle(theme, "ghost")}>{tt("btn_export")}</button>
          </div>

          {showAddQ && (
            <div style={{ ...cardStyle(theme), padding: 18, borderColor: T.accent, borderWidth: 2 }}>
              <div style={{ fontWeight: 1000, marginBottom: 12, color: T.accent }}>{tt("new_question")}</div>
              <QuestionForm theme={theme} T={T} tt={tt} lang={lang} data={newQ} onChange={setNewQ} />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={onAdd} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
                <button onClick={() => { setShowAddQ(false); setNewQ(blankQuestion()); }} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
              </div>
            </div>
          )}

          <div style={{ display: "grid", gap: 10 }}>
            {filteredQuestions.length === 0 && (
              <div style={{ ...cardStyle(theme), padding: 30, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
                {currentQData.questions.length === 0 ? tt("no_questions_yet") : tt("no_questions_match")}
              </div>
            )}
            {filteredQuestions.map((q) => {
              const idx = q._idx;
              const isEditing = editingQIdx === idx && editingQData;
              return (
                <div key={idx} style={{ ...cardStyle(theme), padding: 14 }}>
                  {isEditing ? (
                    <>
                      <QuestionForm theme={theme} T={T} tt={tt} lang={lang} data={editingQData} onChange={setEditingQData} />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button onClick={onSaveEdit} style={btnStyle(theme, "success")}>{tt("btn_save")}</button>
                        <button onClick={() => { setEditingQIdx(null); setEditingQData(null); }} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                          <span style={chipStyle("indigo", true)}>Q{idx + 1}</span>
                          <span style={chipStyle(DIFF_COLORS[q.difficulty || "Medium"], true)}>{DIFFICULTY_LABEL[lang]?.[q.difficulty || "Medium"] || (q.difficulty || "Medium")}</span>
                          {!isQuestionComplete(q) && <span style={chipStyle("rose", true)}>{tt("incomplete")}</span>}
                        </div>
                        {(() => {
                          const qText = lang === "ar" ? (q.q_ar || q.q_en) : (q.q_en || q.q_ar);
                          const opts = lang === "ar" ? (q.options_ar?.length ? q.options_ar : q.options_en || []) : (q.options_en?.length ? q.options_en : q.options_ar || []);
                          return (
                            <>
                              <div style={{ fontWeight: 1000, color: T.text, fontSize: 14, direction: lang === "ar" ? "rtl" : "ltr" }}>{qText}</div>
                              <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                                {opts.map((opt, oi) => {
                                  const correct = oi === q.correct;
                                  return (
                                    <div key={oi} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 8, background: correct ? COLORS.emerald.bg : T.sectionBg, color: correct ? COLORS.emerald.fg : T.text, fontWeight: correct ? 1000 : 700, border: correct ? `1px solid ${COLORS.emerald.border}` : `1px solid ${T.cardBorder}`, direction: lang === "ar" ? "rtl" : "ltr" }}>
                                      {correct ? "✅" : "○"} {opt}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button onClick={() => onMove(idx, -1)} style={btnStyle(theme, "ghost")} title={tt("move_up")}>↑</button>
                        <button onClick={() => onMove(idx, 1)} style={btnStyle(theme, "ghost")} title={tt("move_down")}>↓</button>
                        <button onClick={() => onDuplicate(idx)} style={btnStyle(theme, "ghost")} title={tt("duplicate_tip")}>{tt("btn_duplicate")}</button>
                        <button onClick={() => { setEditingQIdx(idx); setEditingQData({ ...q, options_en: [...(q.options_en || ["","",""])], options_ar: [...(q.options_ar || ["","",""])] }); }} style={btnStyle(theme, "ghost")}>{tt("btn_edit")}</button>
                        <button onClick={() => onDelete(idx)} style={btnStyle(theme, "danger")}>{tt("btn_delete")}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ ...cardStyle(theme), padding: 40, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
          {tt("pick_module_above")}
        </div>
      )}
    </div>
  );
}

function QuestionForm({ theme, T, tt, lang, data, onChange }) {
  function setField(f, v) { onChange({ ...data, [f]: v }); }
  function setOption(L, idx, v) {
    const key = L === "en" ? "options_en" : "options_ar";
    const arr = [...(data[key] || ["", "", ""])];
    arr[idx] = v; onChange({ ...data, [key]: arr });
  }
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <Label T={T}>{tt("question_en")}</Label>
          <textarea style={inputStyle(theme, true)} value={data.q_en} onChange={(e) => setField("q_en", e.target.value)} />
        </div>
        <div>
          <Label T={T}>{tt("question_ar")}</Label>
          <textarea style={{ ...inputStyle(theme, true), direction: "rtl" }} value={data.q_ar} onChange={(e) => setField("q_ar", e.target.value)} />
        </div>
      </div>
      <div>
        <Label T={T}>{tt("options_label")}</Label>
        <div style={{ display: "grid", gap: 8 }}>
          {[0, 1, 2].map((i) => {
            const correct = data.correct === i;
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, borderRadius: 10, background: correct ? COLORS.emerald.bg : T.sectionBg, border: `1px solid ${correct ? COLORS.emerald.border : T.cardBorder}` }}>
                <button type="button" onClick={() => setField("correct", i)} style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${correct ? COLORS.emerald.solid : T.cardBorder}`, background: correct ? COLORS.emerald.solid : "transparent", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 1000, flexShrink: 0 }}>
                  {correct ? "✓" : ""}
                </button>
                <input style={{ ...inputStyle(theme), flex: 1 }} value={(data.options_en || [])[i] || ""} onChange={(e) => setOption("en", i, e.target.value)} placeholder={`EN ${i + 1}`} />
                <input style={{ ...inputStyle(theme), flex: 1, direction: "rtl" }} value={(data.options_ar || [])[i] || ""} onChange={(e) => setOption("ar", i, e.target.value)} placeholder={`AR ${i + 1}`} />
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <div>
          <Label T={T}>{tt("difficulty")}</Label>
          <select style={inputStyle(theme)} value={data.difficulty || "Medium"} onChange={(e) => setField("difficulty", e.target.value)}>
            {DIFFICULTY.map((d) => <option key={d} value={d}>{DIFFICULTY_LABEL[lang]?.[d] || d}</option>)}
          </select>
        </div>
        <div>
          <Label T={T}>{tt("tags_label")}</Label>
          <input style={inputStyle(theme)} value={(data.tags || []).join(", ")} onChange={(e) => setField("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder={tt("tags_placeholder")} />
        </div>
      </div>
    </div>
  );
}

/* ===================== REFERENCES ===================== */
function ReferencesSection({ T, theme, tt, isAr, lang, modules, references, filteredRefs, refFilter, setRefFilter, refModuleFilter, setRefModuleFilter, refTypeFilter, setRefTypeFilter, refSort, setRefSort, showAddRef, setShowAddRef, newRef, setNewRef, editingRef, setEditingRef, selectedRefs, setSelectedRefs, onAdd, onUpdate, onDelete, onBulkDelete, onExport, onSeedBuiltIn }) {
  const [previewRef, setPreviewRef] = React.useState(null); // { id, payload } of ref being previewed

  function toggleSelect(id) { setSelectedRefs((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function selectAll() {
    if (selectedRefs.size === filteredRefs.length) setSelectedRefs(new Set());
    else setSelectedRefs(new Set(filteredRefs.map((r) => r.id)));
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>

      {/* ── Preview Modal ── */}
      {previewRef && (
        <RefPreviewModal
          refData={previewRef}
          lang={lang}
          onClose={() => setPreviewRef(null)}
          onEdit={() => { setEditingRef({ id: previewRef.id, payload: { ...previewRef.payload } }); setPreviewRef(null); }}
        />
      )}

      {/* ── Toolbar ── */}
      <div style={{ ...cardStyle(theme), padding: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inputStyle(theme), maxWidth: 280 }} placeholder={`🔍 ${tt("search_references")}`} value={refFilter} onChange={(e) => setRefFilter(e.target.value)} />
          <select style={{ ...inputStyle(theme), maxWidth: 200 }} value={refModuleFilter} onChange={(e) => setRefModuleFilter(e.target.value)}>
            <option value="">{tt("all_modules")}</option>
            {modules.map((m) => <option key={m} value={m}>{getModuleName(m, lang)}</option>)}
          </select>
          <select style={{ ...inputStyle(theme), maxWidth: 160 }} value={refTypeFilter} onChange={(e) => setRefTypeFilter(e.target.value)}>
            <option value="">{tt("all_types")}</option>
            {REF_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
          </select>
          <select style={{ ...inputStyle(theme), maxWidth: 160 }} value={refSort} onChange={(e) => setRefSort(e.target.value)}>
            <option value="newest">{tt("sort_newest")}</option>
            <option value="oldest">{tt("sort_oldest")}</option>
            <option value="title">{tt("sort_title")}</option>
          </select>
          <div style={{ flex: 1 }} />
          <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 800 }}>{filteredRefs.length} / {references.length}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => setShowAddRef((v) => !v)} style={btnStyle(theme, "primary")}>{tt("btn_add_reference")}</button>
          <button onClick={onSeedBuiltIn} style={btnStyle(theme, "warning")} title={tt("seed_refs_title")}>{tt("btn_seed_refs")}</button>
          <button onClick={() => onExport()} style={btnStyle(theme, "ghost")}>{tt("btn_export")}</button>
          {selectedRefs.size > 0 && (
            <>
              <button onClick={selectAll} style={btnStyle(theme, "ghost")}>
                {selectedRefs.size === filteredRefs.length ? tt("deselect_all") : tt("select_all")}
              </button>
              <button onClick={onBulkDelete} style={btnStyle(theme, "danger")}>{tt("bulk_delete")} ({selectedRefs.size})</button>
            </>
          )}
        </div>
        {references.length === 0 && (
          <div style={{ padding: "12px 16px", background: COLORS.amber.bg, border: `1px solid ${COLORS.amber.border}`, borderRadius: 10, fontSize: 13, color: COLORS.amber.fg, fontWeight: 800 }}>
            📋 {tt("seed_refs_desc")}
          </div>
        )}
      </div>

      {/* ── Add form ── */}
      {showAddRef && (
        <div style={{ ...cardStyle(theme), padding: 18, borderColor: T.accent, borderWidth: 2 }}>
          <div style={{ fontWeight: 1000, marginBottom: 12, color: T.accent }}>{tt("new_reference")}</div>
          <ReferenceForm theme={theme} T={T} tt={tt} lang={lang} data={newRef} onChange={setNewRef} modules={modules} />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={onAdd} style={btnStyle(theme, "primary")}>{tt("btn_add")}</button>
            <button onClick={() => { setShowAddRef(false); setNewRef(blankRef()); }} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
          </div>
        </div>
      )}

      {/* ── Cards grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: 12 }}>
        {filteredRefs.length === 0 && (
          <div style={{ gridColumn: "1/-1", ...cardStyle(theme), padding: 40, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📎</div>
            <div>{references.length === 0 ? tt("no_refs_yet") : tt("no_refs_match")}</div>
            {references.length === 0 && (
              <button onClick={onSeedBuiltIn} style={{ ...btnStyle(theme, "warning"), marginTop: 16 }}>{tt("btn_seed_refs")}</button>
            )}
          </div>
        )}
        {filteredRefs.map((r) => {
          const p = r.payload || {};
          const isEditing = editingRef?.id === r.id;
          const isSelected = selectedRefs.has(r.id);
          const typeIcon = REF_TYPE_ICONS[p.refType] || "📌";
          const hasContent = Boolean(p.content);
          const moduleColor = COLORS[modules.indexOf(p.module) % COLOR_KEYS.length] || COLORS.indigo;

          return (
            <div key={r.id} style={{
              ...cardStyle(theme), padding: 0, overflow: "hidden",
              borderColor: isSelected ? T.accent : (p.isBuiltIn ? COLORS.violet.border : T.cardBorder),
              borderWidth: isSelected ? 2 : 1,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {/* Colour top bar */}
              <div style={{ height: 4, background: p.isBuiltIn ? "linear-gradient(90deg,#4338ca,#8b5cf6)" : "linear-gradient(90deg,#94a3b8,#cbd5e1)" }} />

              {/* Header */}
              <div style={{ padding: "12px 14px 8px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(r.id)} style={{ accentColor: T.accent, marginTop: 3, flexShrink: 0 }} />
                <div style={{ width: 40, height: 40, borderRadius: 10, background: p.isBuiltIn ? "linear-gradient(135deg,#4338ca,#7c3aed)" : T.chip, display: "grid", placeItems: "center", fontSize: 20, flexShrink: 0 }}>
                  {typeIcon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 13.5, color: T.text, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                    {p.refType && <span style={chipStyle("violet", true)}>{p.refType}</span>}
                    {p.module && <span style={chipStyle("sky", true)}>{getModuleName(p.module, lang)}</span>}
                    {p.isBuiltIn && <span style={chipStyle("indigo", true)}>📥</span>}
                    {hasContent && <span style={chipStyle("emerald", true)}>📝 {(p.content.length / 1000).toFixed(1)}k</span>}
                  </div>
                </div>
              </div>

              {isEditing ? (
                <div style={{ padding: "0 14px 14px" }}>
                  <ReferenceForm theme={theme} T={T} tt={tt} lang={lang} data={editingRef.payload} onChange={(u) => setEditingRef((prev) => ({ ...prev, payload: u }))} modules={modules} />
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={onUpdate} style={btnStyle(theme, "success")}>{tt("btn_save")}</button>
                    <button onClick={() => setEditingRef(null)} style={btnStyle(theme, "ghost")}>{tt("btn_cancel")}</button>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "0 14px 14px" }}>
                  {p.description && (
                    <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{p.description.slice(0, 120)}{p.description.length > 120 ? "…" : ""}</div>
                  )}
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: T.accent, textDecoration: "none", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4, marginBottom: 8, padding: "4px 8px", background: T.sectionBg, borderRadius: 6, border: `1px solid ${T.cardBorder}` }}>
                      🔗 <span style={{ textDecoration: "underline" }}>{p.url.slice(0, 50)}{p.url.length > 50 ? "…" : ""}</span>
                    </a>
                  )}
                  <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${T.cardBorder}` }}>
                    <span style={{ fontSize: 11, color: T.textSubtle }}>{p.addedAt}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {hasContent && (
                        <button
                          onClick={() => setPreviewRef({ id: r.id, payload: p })}
                          style={{ ...btnStyle(theme, "primary"), padding: "6px 12px", fontSize: 12 }}
                        >
                          👁 {lang === "ar" ? "معاينة" : "Preview"}
                        </button>
                      )}
                      <button onClick={() => setEditingRef({ id: r.id, payload: { ...p } })} style={btnStyle(theme, "ghost")}>{tt("btn_edit")}</button>
                      <button onClick={() => onDelete(r.id)} style={btnStyle(theme, "danger")}>{tt("btn_delete")}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== REF PREVIEW MODAL ===================== */
function RefPreviewModal({ refData, lang, onClose, onEdit }) {
  const { payload: p } = refData;
  const contentRef = useRef(null);
  const [viewLang, setViewLang] = React.useState("both"); // "en" | "ar" | "both"
  const [exporting, setExporting] = React.useState(false);

  const isAr = (t) => /[؀-ۿ]/.test(t);
  const isEnLabel = (t) => /^[A-Za-z]\)/.test(t.trim());
  const isArLabel = (t) => /^[؀-ۿ].{0,8}[):]/u.test(t.trim());

  const rawLines = (p.content || "").split("\n").map((l) => l.trim()).filter(Boolean);

  // Group lines into sections (each EN label A) starts a new section)
  const sections = React.useMemo(() => {
    const out = [];
    let current = null;
    for (const line of rawLines) {
      if (isEnLabel(line)) {
        if (current) out.push(current);
        current = { label: line, lines: [] };
      } else if (current) {
        current.lines.push(line);
      } else {
        out.push({ label: null, lines: [line] });
      }
    }
    if (current) out.push(current);
    return out;
  }, [rawLines]);

  // Filter sections by language
  const visible = React.useMemo(() => {
    if (viewLang === "both") return sections;
    return sections.map((s) => ({
      ...s,
      label: viewLang === "en" && !isAr(s.label || "") ? s.label : viewLang === "ar" && isAr(s.label || "") ? s.label : s.label,
      lines: s.lines.filter((l) => viewLang === "ar" ? isAr(l) : !isAr(l)),
    })).filter((s) => s.lines.length > 0 || (viewLang === "en" && !isAr(s.label || "")) || (viewLang === "ar" && isAr(s.label || "")));
  }, [sections, viewLang]);

  const SECTION_COLORS = [
    { bg: "#eff6ff", border: "#3b82f6", label: "#1d4ed8" },
    { bg: "#f0fdf4", border: "#22c55e", label: "#15803d" },
    { bg: "#fdf4ff", border: "#a855f7", label: "#7e22ce" },
    { bg: "#fff7ed", border: "#f97316", label: "#c2410c" },
    { bg: "#f0fdfa", border: "#14b8a6", label: "#0f766e" },
    { bg: "#fef2f2", border: "#ef4444", label: "#b91c1c" },
    { bg: "#fffbeb", border: "#f59e0b", label: "#b45309" },
    { bg: "#ecfdf5", border: "#10b981", label: "#047857" },
  ];

  async function exportPDF() {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const el = contentRef.current;
      const canvas = await html2canvas(el, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true,
        scrollY: -window.scrollY, windowWidth: el.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pdfW - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;
      let y = margin;
      let remaining = imgH;
      let srcY = 0;
      while (remaining > 0) {
        const pageH = Math.min(remaining, pdfH - margin * 2);
        const srcH = (pageH / imgH) * canvas.height;
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const pageImg = pageCanvas.toDataURL("image/png");
        if (srcY > 0) pdf.addPage();
        pdf.addImage(pageImg, "PNG", margin, margin, usableW, pageH);
        y += pageH;
        srcY += srcH;
        remaining -= pageH;
      }
      const safeName = (p.title || "reference").replace(/[^a-zA-Z0-9؀-ۿ]/g, "_").slice(0, 50);
      pdf.save(`${safeName}.pdf`);
    } catch (e) {
      alert("PDF export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  // Close on ESC
  React.useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const typeColor = { Document: "#4338ca", SOP: "#0369a1", PDF: "#dc2626", Video: "#7c3aed", Link: "#059669", Policy: "#b45309" };
  const headerColor = typeColor[p.refType] || "#4338ca";

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 30000,
        background: "rgba(2,6,23,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "24px 16px", overflowY: "auto",
        fontFamily: "Cairo, 'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 860,
        background: "#fff", borderRadius: 20,
        boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
        overflow: "hidden",
        animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${headerColor}ee 0%, ${headerColor}99 100%)`,
          padding: "22px 28px",
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 60, bottom: -60, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
            {/* Icon box */}
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", fontSize: 26, flexShrink: 0, border: "1px solid rgba(255,255,255,0.3)" }}>
              {REF_TYPE_ICONS[p.refType] || "📌"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 }}>
                Al Mawashi — Training Reference
              </div>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{p.title}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {p.module && (
                  <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, backdropFilter: "blur(4px)" }}>
                    📚 {getModuleName(p.module, lang)}
                  </span>
                )}
                {p.refType && (
                  <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {REF_TYPE_ICONS[p.refType]} {p.refType}
                  </span>
                )}
                {p.addedAt && (
                  <span style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", padding: "3px 10px", borderRadius: 999, fontSize: 11 }}>
                    📅 {p.addedAt}
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>

          {/* Language toggle */}
          <div style={{ display: "flex", gap: 6, marginTop: 14, position: "relative" }}>
            {[["both", lang === "ar" ? "EN + AR" : "EN + AR"], ["en", "English"], ["ar", "عربي"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setViewLang(val)} style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", border: "none",
                background: viewLang === val ? "#fff" : "rgba(255,255,255,0.2)",
                color: viewLang === val ? headerColor : "#fff",
                transition: "all 0.15s",
              }}>{lbl}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, alignSelf: "center" }}>
              {rawLines.length} lines · {(p.content || "").length} chars
            </div>
          </div>
        </div>

        {/* ── URL bar ── */}
        {p.url && (
          <div style={{ padding: "10px 28px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔗</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline", wordBreak: "break-all" }}>{p.url}</a>
          </div>
        )}

        {/* ── Content body ── */}
        <div ref={contentRef} style={{ padding: "24px 28px", background: "#fafbfc", maxHeight: "55vh", overflowY: "auto" }}>
          {/* PDF header (hidden from view, shows in export) */}
          <div style={{ display: "none" }} className="pdf-header">
            <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #4338ca", paddingBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{p.title}</div>
              {p.module && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{getModuleName(p.module, lang)} — Al Mawashi Training Reference</div>}
            </div>
          </div>

          {visible.length === 0 && (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 14 }}>
              {lang === "ar" ? "لا يوجد محتوى في هذه اللغة" : "No content for this language"}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {visible.map((section, si) => {
              const sc = SECTION_COLORS[si % SECTION_COLORS.length];
              const hasLabel = Boolean(section.label);
              return (
                <div key={si} style={{
                  background: sc.bg,
                  border: `1px solid ${sc.border}44`,
                  borderLeft: `4px solid ${sc.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  transition: "box-shadow 0.15s",
                }}>
                  {hasLabel && (
                    <div style={{
                      fontSize: 13.5, fontWeight: 900, color: sc.label,
                      marginBottom: section.lines.length > 0 ? 10 : 0,
                      direction: isAr(section.label) ? "rtl" : "ltr",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}>
                      <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: sc.border, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginTop: 1 }}>
                        {String.fromCharCode(65 + si)}
                      </span>
                      <span>{section.label.replace(/^[A-Za-z]\)\s*/, "").replace(/^[أ-ي]\)\s*/, "")}</span>
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 4 }}>
                    {section.lines.map((line, li) => {
                      const arabic = isAr(line);
                      const isSubLabel = isEnLabel(line) || isArLabel(line);
                      return (
                        <div key={li} style={{
                          fontSize: isSubLabel ? 12.5 : 12,
                          lineHeight: 1.65,
                          color: isSubLabel ? sc.label : "#374151",
                          fontWeight: isSubLabel ? 800 : 500,
                          direction: arabic ? "rtl" : "ltr",
                          paddingLeft: (!arabic && !isSubLabel) ? 8 : 0,
                          paddingRight: (arabic && !isSubLabel) ? 8 : 0,
                          borderLeft: (!arabic && !isSubLabel) ? `2px solid ${sc.border}44` : "none",
                          borderRight: (arabic && !isSubLabel) ? `2px solid ${sc.border}44` : "none",
                        }}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div style={{
          padding: "16px 28px",
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={exportPDF}
              disabled={exporting}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "none", cursor: exporting ? "not-allowed" : "pointer",
                background: exporting ? "#94a3b8" : "linear-gradient(135deg,#dc2626,#b91c1c)",
                color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                boxShadow: exporting ? "none" : "0 4px 14px rgba(220,38,38,0.4)",
                transition: "all 0.15s",
              }}
            >
              {exporting ? "⏳" : "📄"} {lang === "ar" ? (exporting ? "جارٍ التصدير…" : "تصدير PDF") : (exporting ? "Exporting…" : "Export PDF")}
            </button>
            <button
              onClick={() => {
                const w = window.open("", "_blank");
                if (!w) return;
                const lines = rawLines.map((l) => `<p dir="${isAr(l) ? "rtl" : "ltr"}" style="margin:4px 0;font-size:13px">${l}</p>`).join("");
                w.document.write(`<html><head><title>${p.title}</title><meta charset="utf-8"><style>@media print{@page{margin:15mm}}body{font-family:Cairo,Inter,system-ui,sans-serif;padding:20px;max-width:800px;margin:0 auto}h1{font-size:18px;color:#1e3a8a}h2{font-size:13px;color:#64748b}</style></head><body><h1>${p.title}</h1><h2>${p.module ? getModuleName(p.module, lang) : ""} — Al Mawashi Training Reference</h2><hr/>${lines}<script>window.onload=()=>window.print()</script></body></html>`);
                w.document.close();
              }}
              style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              🖨️ {lang === "ar" ? "طباعة" : "Print"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onEdit} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f8fafc", color: "#374151", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              ✏️ {lang === "ar" ? "تعديل" : "Edit"}
            </button>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {lang === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReferenceForm({ theme, T, tt, lang, data, onChange, modules }) {
  function set(f, v) { onChange({ ...data, [f]: v }); }
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
        <div>
          <Label T={T}>{tt("title_required")}</Label>
          <input style={inputStyle(theme)} value={data.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <Label T={T}>{tt("module_label")}</Label>
          <select style={inputStyle(theme)} value={data.module} onChange={(e) => set("module", e.target.value)}>
            <option value="">{tt("any_module")}</option>
            {modules.map((m) => <option key={m} value={m}>{getModuleName(m, lang)}</option>)}
          </select>
        </div>
        <div>
          <Label T={T}>{tt("type_label")}</Label>
          <select style={inputStyle(theme)} value={data.refType} onChange={(e) => set("refType", e.target.value)}>
            {REF_TYPES.map((tp) => <option key={tp} value={tp}>{REF_TYPE_ICONS[tp]} {tp}</option>)}
          </select>
        </div>
      </div>
      <div>
        <Label T={T}>{tt("url_label")}</Label>
        <input style={inputStyle(theme)} value={data.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…" type="url" />
      </div>
      <div>
        <Label T={T}>{tt("description_label")}</Label>
        <textarea style={{ ...inputStyle(theme, true), minHeight: 56 }} value={data.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <Label T={T}>{tt("content_label")}</Label>
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700 }}>
            {tt("ref_char_count", (data.content || "").length)}
          </span>
        </div>
        <textarea
          style={{ ...inputStyle(theme, true), minHeight: 200, fontFamily: "monospace", fontSize: 12, lineHeight: 1.6 }}
          value={data.content || ""}
          onChange={(e) => set("content", e.target.value)}
          placeholder={tt("content_placeholder")}
          dir="auto"
        />
        <div style={{ marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
          {data.content ? `${data.content.split("\n").filter(Boolean).length} ${lang === "ar" ? "سطر" : "lines"}` : ""}
        </div>
      </div>
    </div>
  );
}

/* ===================== SETTINGS ===================== */
function SettingsSection({ T, theme, tt, settings, setSettings, onSave }) {
  function set(f, v) { setSettings((p) => ({ ...p, [f]: v })); }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 14 }}>{tt("quiz_settings")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <Field T={T} label={tt("pass_mark")} hint={tt("pass_mark_hint")}>
            <input type="number" min={0} max={100} style={inputStyle(theme)} value={settings.passMark} onChange={(e) => set("passMark", Number(e.target.value))} />
          </Field>
          <Field T={T} label={tt("default_language")}>
            <select style={inputStyle(theme)} value={settings.defaultLang} onChange={(e) => set("defaultLang", e.target.value)}>
              <option value="en">{tt("en_lang")}</option>
              <option value="ar">{tt("ar_lang")}</option>
            </select>
          </Field>
          <Field T={T} label={tt("time_limit")} hint={tt("time_limit_hint")}>
            <input type="number" min={0} style={inputStyle(theme)} value={settings.quizTimeLimit} onChange={(e) => set("quizTimeLimit", Number(e.target.value))} />
          </Field>
          <Field T={T} label={tt("max_retakes")}>
            <input type="number" min={0} max={10} style={inputStyle(theme)} value={settings.maxRetakes} onChange={(e) => set("maxRetakes", Number(e.target.value))} />
          </Field>
        </div>
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <Toggle T={T} label={tt("randomize_order")} value={settings.randomizeOrder} onChange={(v) => set("randomizeOrder", v)} />
          <Toggle T={T} label={tt("show_answer_after")} value={settings.showAnswerAfter} onChange={(v) => set("showAnswerAfter", v)} />
          <Toggle T={T} label={tt("allow_retake")} value={settings.allowRetake} onChange={(v) => set("allowRetake", v)} />
        </div>
      </div>

      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 14 }}>{tt("certificate")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          <Field T={T} label={tt("org_name")}>
            <input style={inputStyle(theme)} value={settings.orgName} onChange={(e) => set("orgName", e.target.value)} />
          </Field>
          <Field T={T} label={tt("signatory")}>
            <input style={inputStyle(theme)} value={settings.signatory} onChange={(e) => set("signatory", e.target.value)} />
          </Field>
          <Field T={T} label={tt("validity_months")}>
            <input type="number" min={1} max={60} style={inputStyle(theme)} value={settings.certValidity} onChange={(e) => set("certValidity", Number(e.target.value))} />
          </Field>
        </div>
      </div>

      <div style={{ ...cardStyle(theme), padding: 18 }}>
        <div style={{ fontWeight: 1000, fontSize: 15, marginBottom: 14 }}>{tt("notes_trainers")}</div>
        <textarea style={inputStyle(theme, true)} value={settings.notes} onChange={(e) => set("notes", e.target.value)} placeholder={tt("notes_placeholder")} />
      </div>

      <div>
        <button onClick={onSave} style={btnStyle(theme, "primary")}>{tt("btn_save_settings")}</button>
      </div>
    </div>
  );
}

/* ===================== BACKUP ===================== */
function BackupSection({ T, theme, tt, stats, onBackup, onRestoreClick }) {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ ...cardStyle(theme), padding: 22 }}>
        <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 6 }}>{tt("backup_title")}</div>
        <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>{tt("backup_desc")}</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          <Stat T={T} label={tt("nav_modules")} value={stats.modules} icon="📋" />
          <Stat T={T} label={tt("nav_questions")} value={stats.questions} icon="❓" />
          <Stat T={T} label={tt("nav_references")} value={stats.references} icon="📎" />
        </div>
        <button onClick={onBackup} style={{ ...btnStyle(theme, "primary"), padding: "12px 20px", fontSize: 14 }}>{tt("btn_download_backup")}</button>
      </div>

      <div style={{ ...cardStyle(theme), padding: 22 }}>
        <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 6 }}>{tt("restore_title")}</div>
        <div style={{ color: T.textMuted, fontSize: 13, marginBottom: 16 }}>
          {tt("restore_desc1")}<br />
          <b style={{ color: T.warning }}>{tt("restore_warning")}</b>
        </div>
        <button onClick={onRestoreClick} style={{ ...btnStyle(theme, "warning"), padding: "12px 20px", fontSize: 14 }}>{tt("btn_choose_file")}</button>
      </div>
    </div>
  );
}

function Stat({ T, label, value, icon }) {
  return (
    <div style={{ flex: "1 0 140px", padding: 14, background: T.sectionBg, borderRadius: 12, border: `1px solid ${T.cardBorder}` }}>
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 900 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
        <div style={{ fontSize: 26, fontWeight: 1000, color: T.text }}>{value}</div>
        <div style={{ fontSize: 18 }}>{icon}</div>
      </div>
    </div>
  );
}

/* ===================== ACTIVITY ===================== */
function ActivitySection({ T, tt, activity }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {activity.length === 0 && (
        <div style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 14, padding: 40, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>
          {tt("no_activity_full")}
          <div style={{ fontSize: 11, marginTop: 8 }}>{tt("activity_note")}</div>
        </div>
      )}
      {activity.map((a) => (
        <div key={a.id} style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 1000, fontSize: 13, color: T.text }}>{a.action}</div>
            {a.target && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{a.target}</div>}
          </div>
          <div style={{ fontSize: 11, color: T.textSubtle, whiteSpace: "nowrap" }}>{new Date(a.at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

/* ===================== CMD+K ===================== */
function CmdKModal({ T, theme, tt, search, setSearch, results, onClose }) {
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 20000, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "10vh" }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ background: T.cardBg, borderRadius: 14, boxShadow: "0 30px 80px rgba(0,0,0,0.4)", width: "min(640px,90%)", overflow: "hidden", border: `1px solid ${T.cardBorder}` }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${T.cardBorder}` }}>
          <input autoFocus style={{ ...inputStyle(theme), fontSize: 16, padding: "12px 14px" }} placeholder={`🔍 ${tt("search_modules_qs")}`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {results.length === 0 && search && <div style={{ padding: 30, textAlign: "center", color: T.textSubtle, fontWeight: 800 }}>{tt("no_matches")}</div>}
          {!search && (
            <div style={{ padding: 20, color: T.textSubtle, fontSize: 12, fontWeight: 800 }}>
              {tt("cmd_k_help")}<br />{tt("cmd_k_esc")}
            </div>
          )}
          {results.map((r, i) => (
            <button key={i} onClick={r.action} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${T.cardBorder}`, width: "100%", textAlign: "left", cursor: "pointer", color: T.text, fontFamily: "inherit" }}>
              <span style={chipStyle("indigo", true)}>{r.type}</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 13 }}>{r.name}</span>
              <span style={{ color: T.textSubtle }}>↵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== Atoms ===================== */
function Label({ children, T }) {
  return <div style={{ fontWeight: 900, fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{children}</div>;
}
function Field({ T, label, hint, children }) {
  return (
    <div>
      <Label T={T}>{label}</Label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.textSubtle, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
function Toggle({ T, label, value, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: T.sectionBg, borderRadius: 10, border: `1px solid ${T.cardBorder}`, cursor: "pointer" }}>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#6366f1", width: 16, height: 16 }} />
      <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>{label}</span>
    </label>
  );
}
