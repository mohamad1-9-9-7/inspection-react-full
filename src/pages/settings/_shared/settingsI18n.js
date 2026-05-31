// src/pages/settings/_shared/settingsI18n.js
// Shared bilingual (EN/AR) helper for the whole Settings area.
// One localStorage key drives every Settings tab so the toggle is consistent.
//
// Usage:
//   import { useSettingsLang, LangToggle, ST } from "../_shared/settingsI18n";
//   const { lang, dir, isAr, t, toggle } = useSettingsLang();
//   <LangToggle lang={lang} toggle={toggle} />
//   <h1>{t("accountManagement")}</h1>   // or t({en:"Save", ar:"حفظ"})

import { useState, useEffect, useCallback } from "react";

export const SETTINGS_LANG_KEY = "settings_lang";

/* Broadcast so multiple Settings tabs mounted at once stay in sync. */
const EVT = "settings_lang_changed";

export function getSettingsLang() {
  try { return localStorage.getItem(SETTINGS_LANG_KEY) || "en"; } catch { return "en"; }
}

/* ── Central dictionary — add keys here, every tab can use them ── */
export const ST = {
  // Hub
  settingsTitle:      { en: "Settings & Tools",            ar: "الإعدادات والأدوات" },
  settingsSub:        { en: "tool",                        ar: "أداة" },
  settingsSubPlural:  { en: "tools",                       ar: "أدوات" },
  clickToOpen:        { en: "click any card to open",      ar: "اضغط أي بطاقة لفتحها" },
  back:               { en: "Back",                        ar: "رجوع" },
  allTools:           { en: "All Tools",                   ar: "كل الأدوات" },
  adminTag:           { en: "Admin",                       ar: "مدير" },

  // Section group labels
  secGeneral:   { en: "General",        ar: "عام" },
  secData:      { en: "Data Tools",     ar: "أدوات البيانات" },
  secAccounts:  { en: "Accounts",       ar: "الحسابات" },
  secBilling:   { en: "Billing & Plans", ar: "الاشتراكات والخطط" },
  secSecurity:  { en: "Security",       ar: "الأمان" },
  secAdmin:     { en: "Admin Tools",    ar: "أدوات المدير" },

  // Tiles — title + desc
  tAppearance:      { en: "Appearance & Language", ar: "المظهر واللغة" },
  tAppearanceD:     { en: "Theme, AR/EN preferences", ar: "السمة، تفضيلات العربية/الإنجليزية" },
  tNotifications:   { en: "Notifications",          ar: "الإشعارات" },
  tNotificationsD:  { en: "Daily reminders, alerts", ar: "تذكيرات يومية وتنبيهات" },
  tInventory:       { en: "Data Inventory",        ar: "جرد البيانات" },
  tInventoryD:      { en: "Count + size per record type", ar: "العدد والحجم لكل نوع سجل" },
  tDateTree:        { en: "Date Tree Explorer",    ar: "مستكشف شجرة التواريخ" },
  tDateTreeD:       { en: "Browse by Year / Month / Day", ar: "تصفح حسب السنة / الشهر / اليوم" },
  tExport:          { en: "Bulk Export",           ar: "تصدير شامل" },
  tExportD:         { en: "Download as JSON / CSV", ar: "تنزيل بصيغة JSON / CSV" },
  tBackup:          { en: "Backup & Restore",      ar: "نسخ احتياطي واستعادة" },
  tBackupD:         { en: "Full local backup",     ar: "نسخة احتياطية محلية كاملة" },
  tExcelBackup:     { en: "Excel Backup",          ar: "نسخة Excel" },
  tExcelBackupD:    { en: "All branches → ZIP + Excel", ar: "كل الفروع → ZIP + Excel" },
  tAccounts:        { en: "Account Management",    ar: "إدارة الحسابات" },
  tAccountsD:       { en: "Users · permissions · activity log", ar: "المستخدمون · الصلاحيات · سجل النشاط" },
  tSubscription:    { en: "Subscription",          ar: "الاشتراك" },
  tSubscriptionD:   { en: "Current plan · activation · expiry", ar: "الخطة الحالية · التفعيل · الانتهاء" },
  tPlans:           { en: "Plans",                 ar: "الخطط" },
  tPlansD:          { en: "Create · edit · price · limits", ar: "إنشاء · تعديل · السعر · الحدود" },
  tCompanies:       { en: "Companies",             ar: "الشركات" },
  tCompaniesD:      { en: "Clients · assign plans · track", ar: "العملاء · تعيين الخطط · المتابعة" },
  tSecurity:        { en: "Security Controls",     ar: "ضوابط الأمان" },
  tSecurityD:       { en: "Delete permissions · read-only mode · session timeout", ar: "صلاحيات الحذف · وضع القراءة فقط · مهلة الجلسة" },
  tImageMigration:  { en: "Image Cleanup",         ar: "تنظيف الصور" },
  tImageMigrationD: { en: "Convert base64 → Cloudinary URLs", ar: "تحويل base64 → روابط Cloudinary" },
  tComplaintNumbers:  { en: "Complaint Numbers",   ar: "أرقام الشكاوى" },
  tComplaintNumbersD: { en: "Backfill missing complaint No.", ar: "تعبئة أرقام الشكاوى الناقصة" },
  tServerHealth:    { en: "Server Health",         ar: "حالة الخادم" },
  tServerHealthD:   { en: "Ping + latency monitor", ar: "مراقبة الاتصال والاستجابة" },

  // Greeting
  goodMorning:   { en: "Good morning",   ar: "صباح الخير" },
  goodAfternoon: { en: "Good afternoon", ar: "مساء الخير" },
  goodEvening:   { en: "Good evening",   ar: "مساء الخير" },

  // ── Security Controls tab ──
  secGrpRecords:      { en: "🗂️  Record Management", ar: "🗂️  إدارة السجلات" },
  secGrpAccess:       { en: "🔐  Access Control",     ar: "🔐  التحكم بالوصول" },
  secGrpSession:      { en: "⏱️  Session & Timeout",  ar: "⏱️  الجلسة والمهلة" },
  secAllowDelete:     { en: "Allow Delete Records",   ar: "السماح بحذف السجلات" },
  secAllowDeleteD:    { en: "Shows ALL delete buttons across the entire system. Off by default — keeps data safe.", ar: "يُظهر كل أزرار الحذف في النظام بالكامل. مُعطّل افتراضياً — يحافظ على البيانات." },
  secReqConfirm:      { en: "Require Confirmation on Delete", ar: "طلب تأكيد قبل الحذف" },
  secReqConfirmD:     { en: "Show a confirmation dialog before any record is permanently removed.", ar: "إظهار نافذة تأكيد قبل حذف أي سجل نهائياً." },
  secReadOnly:        { en: "Read-only Mode",         ar: "وضع القراءة فقط" },
  secReadOnlyD:       { en: "Disable all create / edit forms app-wide. Useful for audits or demos. Admins are exempt.", ar: "تعطيل كل نماذج الإضافة/التعديل في التطبيق. مفيد للتدقيق أو العروض. المدراء مستثنون." },
  secAdminOnly:       { en: "Admin-only Settings",    ar: "الإعدادات للمدراء فقط" },
  secAdminOnlyD:      { en: "Only accounts with the Admin role can open the Settings panel.", ar: "الحسابات ذات دور المدير فقط يمكنها فتح لوحة الإعدادات." },
  secTimeout:         { en: "Session Timeout",        ar: "مهلة الجلسة" },
  secTimeoutD:        { en: "Auto-logout after this many hours of inactivity.", ar: "تسجيل خروج تلقائي بعد هذا العدد من ساعات الخمول." },
  secLockIdle:        { en: "Lock Screen After Idle", ar: "قفل الشاشة عند الخمول" },
  secLockIdleD:       { en: "Automatically lock the screen after N minutes of no activity. Set 0 to disable.", ar: "قفل الشاشة تلقائياً بعد عدد دقائق من عدم النشاط. اضبط 0 للتعطيل." },
  secCurrentState:    { en: "Current State",          ar: "الحالة الحالية" },
  secDeleteEnabled:   { en: "Delete Enabled",         ar: "الحذف مُفعّل" },
  secDeleteLocked:    { en: "Delete Locked",          ar: "الحذف مقفل" },
  secReadOnlyOn:      { en: "Read-only ON",           ar: "القراءة فقط مُفعّلة" },
  secAdminOnlyChip:   { en: "Admin-only Settings",    ar: "الإعدادات للمدراء فقط" },
  secTimeoutChip:     { en: "Timeout",                ar: "المهلة" },
  secLockChip:        { en: "Lock",                   ar: "القفل" },
  secDisabled:        { en: "Disabled",               ar: "مُعطّل" },
  secMin:             { en: "min",                    ar: "دقيقة" },
  secResetDefaults:   { en: "Reset to Defaults",      ar: "إعادة للافتراضي" },
  secSave:            { en: "Save Settings",          ar: "حفظ الإعدادات" },
  secSaved:           { en: "Saved!",                 ar: "تم الحفظ!" },
  secResetConfirm:    { en: "Reset all security settings to defaults?", ar: "إعادة ضبط كل إعدادات الأمان للافتراضي؟" },

  // shared
  save:   { en: "Save",   ar: "حفظ" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  edit:   { en: "Edit",   ar: "تعديل" },
  delete: { en: "Delete", ar: "حذف" },
  loading:{ en: "Loading…", ar: "جارٍ التحميل…" },
  saving: { en: "Saving…",  ar: "جارٍ الحفظ…" },
  connError: { en: "Connection error", ar: "خطأ في الاتصال" },

  // ── Plans tab ──
  plansTitle:    { en: "Plans Management", ar: "إدارة الخطط" },
  newPlan:       { en: "New Plan",  ar: "خطة جديدة" },
  editPlan:      { en: "Edit",      ar: "تعديل" },
  planName:      { en: "Plan Name", ar: "اسم الخطة" },
  price:         { en: "Price",     ar: "السعر" },
  maxBranches:   { en: "Max Branches (blank = unlimited)", ar: "أقصى عدد فروع (فارغ = غير محدود)" },
  maxUsers:      { en: "Max Users (blank = unlimited)",    ar: "أقصى عدد مستخدمين (فارغ = غير محدود)" },
  description:   { en: "Description", ar: "الوصف" },
  planActive:    { en: "Active (visible to companies)", ar: "مُفعّلة (ظاهرة للشركات)" },
  savePlan:      { en: "Save Plan", ar: "حفظ الخطة" },
  deletePlanQ:   { en: "Delete Plan?", ar: "حذف الخطة؟" },
  deletePlanD:   { en: "Companies using this plan will have their plan unassigned.", ar: "الشركات التي تستخدم هذه الخطة سيُلغى تعيين خطتها." },
  planNameReq:   { en: "Plan name is required", ar: "اسم الخطة مطلوب" },
  planNameTaken: { en: "Plan name already exists", ar: "اسم الخطة موجود مسبقاً" },
  planSaved:     { en: "saved", ar: "تم الحفظ" },
  planDeleted:   { en: "Plan deleted", ar: "تم حذف الخطة" },
  failSave:      { en: "Failed to save", ar: "فشل الحفظ" },
  failDelete:    { en: "Failed to delete", ar: "فشل الحذف" },
  noPlans:       { en: "No plans yet. Click \"New Plan\" to create one.", ar: "لا توجد خطط بعد. اضغط \"خطة جديدة\" للإنشاء." },
  branches:      { en: "Branches", ar: "الفروع" },
  users:         { en: "Users",    ar: "المستخدمون" },
  active:        { en: "Active",   ar: "مُفعّلة" },
  inactive:      { en: "Inactive", ar: "غير مُفعّلة" },
  free:          { en: "Free",     ar: "مجاني" },

  // ── Companies tab ──
  companiesTitle:  { en: "Companies Management", ar: "إدارة الشركات" },
  newCompany:      { en: "New Company", ar: "شركة جديدة" },
  companyName:     { en: "Company Name", ar: "اسم الشركة" },
  plan:            { en: "Plan", ar: "الخطة" },
  noPlan:          { en: "— No plan —", ar: "— بدون خطة —" },
  contactName:     { en: "Contact Name", ar: "اسم جهة الاتصال" },
  contactEmail:    { en: "Contact Email", ar: "البريد الإلكتروني" },
  contactPhone:    { en: "Contact Phone", ar: "رقم الهاتف" },
  status:          { en: "Status", ar: "الحالة" },
  startDate:       { en: "Start Date", ar: "تاريخ البدء" },
  endDate:         { en: "End Date", ar: "تاريخ الانتهاء" },
  notes:           { en: "Notes", ar: "ملاحظات" },
  saveCompany:     { en: "Save Company", ar: "حفظ الشركة" },
  deleteCompanyQ:  { en: "Delete Company?", ar: "حذف الشركة؟" },
  deleteCompanyD:  { en: "This will remove the company record. Their data and accounts will remain.", ar: "سيُحذف سجل الشركة. بياناتها وحساباتها ستبقى." },
  companyNameReq:  { en: "Company name is required", ar: "اسم الشركة مطلوب" },
  companySaved:    { en: "saved", ar: "تم الحفظ" },
  companyDeleted:  { en: "Company deleted", ar: "تم حذف الشركة" },
  noCompanies:     { en: "No companies yet. Click \"New Company\" to add one.", ar: "لا توجد شركات بعد. اضغط \"شركة جديدة\" للإضافة." },
  stActive:        { en: "Active", ar: "نشطة" },
  stTrial:         { en: "Trial", ar: "تجريبية" },
  stExpired:       { en: "Expired", ar: "منتهية" },
  stSuspended:     { en: "Suspended", ar: "موقوفة" },
  daysRemaining:   { en: "days remaining", ar: "يوم متبقٍ" },
  expiredAgo:      { en: "expired", ar: "انتهت منذ" },
  daysAgo:         { en: "d ago", ar: "يوم" },

  // ── Subscription tab ──
  subTitle:        { en: "Subscription Management", ar: "إدارة الاشتراك" },
  subExpiresIn:    { en: "Subscription expires in", ar: "ينتهي الاشتراك خلال" },
  subRenewSoon:    { en: "Please renew soon.", ar: "يرجى التجديد قريباً." },
  subExpiredBlock: { en: "Subscription has expired — users are currently blocked from the system.", ar: "انتهى الاشتراك — المستخدمون محظورون حالياً من النظام." },
  subUpdated:      { en: "Subscription updated successfully", ar: "تم تحديث الاشتراك بنجاح" },
  subBackendMissing:{ en: "Backend not updated yet", ar: "الخادم لم يُحدّث بعد" },
  subDays:         { en: "days remaining", ar: "يوم متبقٍ" },
  subExpired:      { en: "Expired", ar: "منتهي" },
  subPlanLimits:   { en: "Plan Limits", ar: "حدود الخطة" },
  subLastUpdated:  { en: "Last Updated", ar: "آخر تحديث" },
  subEdit:         { en: "Edit Subscription", ar: "تعديل الاشتراك" },
  subContactSuper: { en: "Contact your super-admin to modify subscription details.", ar: "تواصل مع المدير الأعلى لتعديل تفاصيل الاشتراك." },
  subSaveChanges:  { en: "Save Changes", ar: "حفظ التغييرات" },
  subAvailPlans:   { en: "Available Plans", ar: "الخطط المتاحة" },
  subCurrentPlan:  { en: "Current Plan", ar: "الخطة الحالية" },
  subNoPlans:      { en: "No plans defined yet. Create plans in the Plans tab first.", ar: "لا توجد خطط بعد. أنشئ الخطط في تبويب الخطط أولاً." },
};

/* Resolve a key (string into ST) or an inline {en,ar} object, for a given lang. */
export function translate(lang, key) {
  const entry = typeof key === "string" ? ST[key] : key;
  if (!entry) return typeof key === "string" ? key : "";
  return entry[lang] ?? entry.en ?? "";
}

export function useSettingsLang() {
  const [lang, setLangState] = useState(getSettingsLang);

  const setLang = useCallback((next) => {
    setLangState(next);
    try { localStorage.setItem(SETTINGS_LANG_KEY, next); } catch {}
    try { window.dispatchEvent(new CustomEvent(EVT, { detail: next })); } catch {}
  }, []);

  const toggle = useCallback(() => {
    setLang(getSettingsLang() === "ar" ? "en" : "ar");
  }, [setLang]);

  useEffect(() => {
    const onChange = (e) => { if (e?.detail) setLangState(e.detail); };
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);

  const t = useCallback((key) => translate(lang, key), [lang]);

  return { lang, setLang, toggle, t, isAr: lang === "ar", dir: lang === "ar" ? "rtl" : "ltr" };
}

/* Small EN/AR pill toggle, reusable across Settings tabs. */
export function LangToggle({ lang, toggle, style }) {
  return (
    <button
      type="button"
      onClick={toggle}
      title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", borderRadius: 999,
        background: "rgba(255,255,255,.12)",
        border: "1px solid rgba(255,255,255,.22)",
        color: "#fff", fontWeight: 900, fontSize: 13,
        cursor: "pointer", fontFamily: "inherit",
        backdropFilter: "blur(8px)",
        ...style,
      }}
    >
      🌐 {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
