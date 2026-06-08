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
  secAllowDeleteD:    { en: "Master switch — the default for every branch and for non-branch pages. Individual branches can override it below. Off by default — keeps data safe.", ar: "المفتاح الرئيسي — الافتراضي لكل فرع وللصفحات غير المرتبطة بفرع. كل فرع يمكنه تجاوزه بالأسفل. مُعطّل افتراضياً — يحافظ على البيانات." },
  secReqConfirm:      { en: "Require Confirmation on Delete", ar: "طلب تأكيد قبل الحذف" },
  secReqConfirmD:     { en: "Show a confirmation dialog before any record is permanently removed.", ar: "إظهار نافذة تأكيد قبل حذف أي سجل نهائياً." },

  // ── Per-branch delete customization ──
  secBranchDelete:    { en: "Per-branch Delete Control", ar: "التحكم بالحذف لكل فرع" },
  secBranchDeleteD:   { en: "Fine-tune which branches show the delete button. Each branch can inherit the master switch above, or be forced to show / hide.", ar: "تحكّم تفصيلي بأي فرع يُظهر زر الحذف. كل فرع يمكن أن يتبع المفتاح الرئيسي أعلاه، أو يُجبر على الإظهار / الإخفاء." },
  secBranchCustomize: { en: "Customize",            ar: "تخصيص" },
  secBranchHide:      { en: "Collapse",             ar: "إخفاء القائمة" },
  secBranchOverrides: { en: "overridden",           ar: "مُخصّص" },
  secBranchSearch:    { en: "Search branch…",       ar: "بحث عن فرع…" },
  secBranchShowAll:   { en: "Show all",             ar: "إظهار الكل" },
  secBranchHideAll:   { en: "Hide all",             ar: "إخفاء الكل" },
  secBranchResetAll:  { en: "Reset all to default", ar: "إرجاع الكل للافتراضي" },
  secBranchHint:      { en: "Inherit = follow the master switch • Show = always visible • Hide = always hidden. The dot shows the effective state.", ar: "يتبع = حسب المفتاح الرئيسي • إظهار = ظاهر دائماً • إخفاء = مخفي دائماً. النقطة تُظهر الحالة الفعلية." },
  secBranchInherit:   { en: "Inherit",              ar: "يتبع" },
  secBranchShow:      { en: "Show",                 ar: "إظهار" },
  secBranchHide2:     { en: "Hide",                 ar: "إخفاء" },
  secBranchNoResults: { en: "No branches match your search.", ar: "لا توجد فروع مطابقة للبحث." },
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
  subPerMonth:     { en: "/ month", ar: "/ شهرياً" },
  subRetry:        { en: "Retry", ar: "إعادة المحاولة" },
  subCustom:       { en: "custom", ar: "مخصص" },
  dayWord:         { en: "days", ar: "يوم" },

  // ── Subscription Expired page (full-screen block) ──
  subExpTitle:          { en: "Subscription Expired", ar: "انتهى الاشتراك" },
  subExpEnded:          { en: "Your system subscription has ended.", ar: "انتهى اشتراك النظام." },
  subExpRenew:          { en: "Please contact the administrator to renew access.", ar: "يرجى التواصل مع المسؤول لتجديد الوصول." },
  subExpContactSupport: { en: "Contact Support", ar: "تواصل مع الدعم" },
  subExpMention:        { en: "Mention your company name and current plan", ar: "اذكر اسم شركتك وخطتك الحالية" },
  subExpGoAdmin:        { en: "Go to Admin — Activate Subscription", ar: "الذهاب للوحة المدير — تفعيل الاشتراك" },
  subExpSignDifferent:  { en: "Sign in with a different account", ar: "الدخول بحساب آخر" },

  subBackendBody:  { en: "The subscription table doesn't exist on the server yet. Please deploy the updated index.cjs to Render, then come back here.", ar: "جدول الاشتراك غير موجود على الخادم بعد. يرجى نشر نسخة index.cjs المحدّثة على Render ثم العودة إلى هنا." },

  /* ═══ Account Management tab ═══ */
  // Section / module names
  amSecAdmin:            { en: "Admin",             ar: "مدير" },
  amSecInspector:        { en: "Inspector",         ar: "مفتّش" },
  amSecSupervisor:       { en: "Supervisor",        ar: "مشرف" },
  amSecDaily:            { en: "Daily Monitor",     ar: "المراقبة اليومية" },
  amSecOhc:              { en: "OHC",               ar: "الصحة المهنية" },
  amSecReturns:          { en: "Returns",           ar: "المرتجعات" },
  amSecFinalProduct:     { en: "Final Product",     ar: "المنتج النهائي" },
  amSecCars:             { en: "Cars",              ar: "السيارات" },
  amSecMaintenance:      { en: "Maintenance",       ar: "الصيانة" },
  amSecQcsView:          { en: "QCS Shipments",     ar: "شحنات QCS" },
  amSecTraining:         { en: "Training Certs",    ar: "شهادات التدريب" },
  amSecInternalTraining: { en: "Internal Training", ar: "التدريب الداخلي" },
  amSecIso:              { en: "ISO & HACCP",       ar: "ISO و HACCP" },
  amSecHalalAudit:       { en: "HALAL Audit",       ar: "تدقيق الحلال" },
  amSecHse:              { en: "HSE",               ar: "السلامة والصحة المهنية" },
  amSecSettings:         { en: "Settings",          ar: "الإعدادات" },

  // CRUD operations
  amView:   { en: "View",   ar: "عرض" },
  amWrite:  { en: "Write",  ar: "إضافة" },
  amEditOp: { en: "Edit",   ar: "تعديل" },
  amDelOp:  { en: "Delete", ar: "حذف" },

  // Permissions table
  amPermissions:      { en: "Permissions", ar: "الصلاحيات" },
  amFullAccess:       { en: "Full Access (all sections + all operations)", ar: "صلاحية كاملة (كل الأقسام + كل العمليات)" },
  amAllViewOnly:      { en: "All View-Only", ar: "الكل عرض فقط" },
  amAllFullAccess:    { en: "All Full Access", ar: "الكل صلاحية كاملة" },
  amFullAccessBanner: { en: "This account has unrestricted access to all sections and operations.", ar: "هذا الحساب لديه وصول غير مقيّد لكل الأقسام والعمليات." },
  amColSection:       { en: "Section", ar: "القسم" },
  amColAccess:        { en: "Access", ar: "الوصول" },
  amColAllOps:        { en: "All Ops", ar: "كل العمليات" },
  amToggleAllOps:     { en: "Toggle all operations", ar: "تبديل كل العمليات" },

  // Employees
  amEmployees:      { en: "Employees", ar: "الموظفون" },
  amEmployeesHint:  { en: "(appear in the operator picker after login)", ar: "(يظهرون في قائمة المشغّل بعد الدخول)" },
  amNoEmployees:    { en: "No employees added yet", ar: "لا يوجد موظفون بعد" },
  amEmployeeNamePh: { en: "Employee name…", ar: "اسم الموظف…" },
  amAdd:            { en: "Add", ar: "إضافة" },

  // Branch / page selector
  amPageAccess:         { en: "Page Access", ar: "الوصول للصفحات" },
  amBranchAccess:       { en: "Branch Access", ar: "الوصول للفروع" },
  amSelectAll:          { en: "Select All", ar: "تحديد الكل" },
  amClear:              { en: "Clear", ar: "مسح" },
  amAccessHelpBranches: { en: "Branches this account can access in", ar: "الفروع التي يمكن لهذا الحساب الوصول إليها في" },
  amAccessHelpPages:    { en: "Pages this account can access in", ar: "الصفحات التي يمكن لهذا الحساب الوصول إليها في" },
  amAccessHelpTail:     { en: "Leave all unchecked for full access.", ar: "اترك الكل دون تحديد للوصول الكامل." },
  amAllBranches:        { en: "All Branches (no restriction)", ar: "كل الفروع (بدون قيود)" },
  amAllPages:           { en: "All Pages (no restriction)", ar: "كل الصفحات (بدون قيود)" },
  amRestrictedTo:       { en: "Restricted to", ar: "مقيّد بـ" },
  amBranchWord:         { en: "branch", ar: "فرع" },
  amBranchesWord:       { en: "branches", ar: "فروع" },
  amPageWord:           { en: "page", ar: "صفحة" },
  amPagesWord:          { en: "pages", ar: "صفحات" },

  // Account form
  amEditAccount:      { en: "Edit Account", ar: "تعديل الحساب" },
  amAddAccount:       { en: "Add New Account", ar: "إضافة حساب جديد" },
  amUsername:         { en: "Username", ar: "اسم المستخدم" },
  amUsernameReq:      { en: "Username is required", ar: "اسم المستخدم مطلوب" },
  amDisplayName:      { en: "Display Name", ar: "الاسم الظاهر" },
  amUsernamePh:       { en: "e.g. mohamad", ar: "مثال: mohamad" },
  amDisplayNamePh:    { en: "e.g. Mohammed Abdullah", ar: "مثال: محمد عبدالله" },
  amNewPassword:      { en: "New Password (blank = no change)", ar: "كلمة مرور جديدة (فارغ = بدون تغيير)" },
  amPassword:         { en: "Password", ar: "كلمة المرور" },
  amPasswordReq:      { en: "Password is required", ar: "كلمة المرور مطلوبة" },
  amPasswordKeepPh:   { en: "Leave blank to keep", ar: "اتركها فارغة للإبقاء عليها" },
  amPasswordEnterPh:  { en: "Enter password", ar: "أدخل كلمة المرور" },
  amPasswordRule:     { en: "Min 8 chars · must have a letter and a number", ar: "8 أحرف على الأقل · يجب أن تحتوي حرفًا ورقمًا" },
  amConfirmPassword:  { en: "Confirm Password", ar: "تأكيد كلمة المرور" },
  amConfirmPasswordPh:{ en: "Repeat password", ar: "أعد كتابة كلمة المرور" },
  amPasswordsMatch:   { en: "Passwords match", ar: "كلمتا المرور متطابقتان" },
  amPasswordsNoMatch: { en: "Passwords don't match", ar: "كلمتا المرور غير متطابقتين" },
  amPasswordTooWeak:  { en: "Password is too weak — needs", ar: "كلمة المرور ضعيفة جدًا — تحتاج" },
  amGrantOne:         { en: "Grant at least one section or enable Full Access", ar: "امنح قسمًا واحدًا على الأقل أو فعّل الصلاحية الكاملة" },
  amAdminCheckbox:    { en: "Admin — can manage accounts in Settings", ar: "مدير — يمكنه إدارة الحسابات في الإعدادات" },
  amSectionAccessControl: { en: "Section Access Control", ar: "التحكم بالوصول للأقسام" },
  amSectionAccessHint:    { en: "(configured independently per section)", ar: "(يُضبط لكل قسم على حدة)" },
  amSectionAccessDesc:    { en: "For every section, choose which branches or pages are visible. Leave all unchecked = full access.", ar: "لكل قسم، اختر الفروع أو الصفحات الظاهرة. اترك الكل دون تحديد = وصول كامل." },
  amSaveChanges:      { en: "Save Changes", ar: "حفظ التغييرات" },
  amCreateAccount:    { en: "Create Account", ar: "إنشاء الحساب" },

  // Password strength
  amPwAtLeast8: { en: "at least 8 characters", ar: "8 أحرف على الأقل" },
  amPwLetter:   { en: "a letter", ar: "حرفًا" },
  amPwNumber:   { en: "a number", ar: "رقمًا" },
  amPwStrong:   { en: "Strong", ar: "قوية" },
  amPwFair:     { en: "Fair — needs", ar: "متوسطة — تحتاج" },
  amPwWeak:     { en: "Weak — needs", ar: "ضعيفة — تحتاج" },

  // Account card
  amFullAccessShort: { en: "Full Access", ar: "صلاحية كاملة" },
  amSectionWord:     { en: "section", ar: "قسم" },
  amSectionsWord:    { en: "sections", ar: "أقسام" },
  amNeverLoggedIn:   { en: "Never logged in", ar: "لم يسجّل الدخول أبدًا" },
  amToday:           { en: "Today", ar: "اليوم" },
  amDaysAgo:         { en: "days ago", ar: "يوم مضى" },
  amActive:          { en: "Active", ar: "نشط" },
  amOff:             { en: "Off", ar: "متوقف" },
  amEditAccountTip:  { en: "Edit account", ar: "تعديل الحساب" },
  amCantDisableSelf: { en: "You can't disable your own account", ar: "لا يمكنك تعطيل حسابك" },
  amCantDisableLastAdmin: { en: "Can't disable the last admin", ar: "لا يمكن تعطيل آخر مدير" },
  amDisableAccount:  { en: "Disable account", ar: "تعطيل الحساب" },
  amEnableAccount:   { en: "Enable account", ar: "تفعيل الحساب" },
  amDeleteAccountTip:{ en: "Delete account", ar: "حذف الحساب" },
  amLastLogin:       { en: "Last login", ar: "آخر دخول" },

  // Reset password
  amResetPwTip:      { en: "Reset password", ar: "إعادة تعيين كلمة المرور" },
  amResetPwTitle:    { en: "Reset password", ar: "إعادة تعيين كلمة المرور" },
  amResetPwFor:      { en: "Set a new password for", ar: "تعيين كلمة مرور جديدة للحساب" },
  amResetPwNew:      { en: "New password", ar: "كلمة المرور الجديدة" },
  amResetPwGenerate: { en: "Generate strong password", ar: "توليد كلمة مرور قوية" },
  amResetPwCopy:     { en: "Copy", ar: "نسخ" },
  amResetPwCopied:   { en: "Copied!", ar: "تم النسخ!" },
  amResetPwShow:     { en: "Show", ar: "إظهار" },
  amResetPwHide:     { en: "Hide", ar: "إخفاء" },
  amResetPwSave:     { en: "Save new password", ar: "حفظ كلمة المرور" },
  amResetPwHint:     { en: "Give this password to the user. It is hashed on save and cannot be viewed again.", ar: "أعطِ هذه الكلمة للمستخدم. تُشفَّر عند الحفظ ولا يمكن عرضها لاحقاً." },
  amResetPwDone:     { en: "Password updated", ar: "تم تحديث كلمة المرور" },
  amResetPwFailed:   { en: "Failed to reset password", ar: "فشل في إعادة تعيين كلمة المرور" },

  // Dormant tab
  amNeverHelp:     { en: "Created but never used", ar: "أُنشئ ولم يُستخدم" },
  amDormant90:     { en: "Dormant 90+ days", ar: "خامل 90+ يوم" },
  amDormant90Help: { en: "Strong candidate to disable", ar: "مرشّح قوي للتعطيل" },
  amDormant60:     { en: "Dormant 60–89 days", ar: "خامل 60–89 يوم" },
  amDormant60Help: { en: "Likely abandoned account", ar: "حساب مهجور على الأرجح" },
  amDormant30:     { en: "Dormant 30–59 days", ar: "خامل 30–59 يوم" },
  amDormant30Help: { en: "Review — possible inactive user", ar: "مراجعة — مستخدم غير نشط محتمل" },
  amDormantAllGood:{ en: "All active accounts logged in recently — no cleanup needed.", ar: "كل الحسابات النشطة سجّلت الدخول مؤخرًا — لا حاجة للتنظيف." },
  amDormantFound1: { en: "Found", ar: "وُجد" },
  amDormantFound2: { en: "dormant accounts that haven't been used recently. Review and disable any that belong to former employees.", ar: "حساب خامل لم تُستخدم مؤخرًا. راجعها وعطّل ما يخص موظفين سابقين." },

  // Failed logins
  amFailedNotFound:{ en: "Server endpoint /api/security/failed-logins not found — push the latest index.cjs to Render and refresh.", ar: "لم يُعثر على نقطة الخادم /api/security/failed-logins — انشر أحدث index.cjs على Render ثم حدّث." },
  amFailedTitle:   { en: "Failed Login Attempts", ar: "محاولات الدخول الفاشلة" },
  amRefresh:       { en: "Refresh", ar: "تحديث" },
  amSuspicious:    { en: "Suspicious activity — possible brute force", ar: "نشاط مشبوه — هجوم تخمين محتمل" },
  amAttempts:      { en: "attempts", ar: "محاولة" },
  amTried:         { en: "tried", ar: "جُرّب" },
  amLast:          { en: "last", ar: "آخر" },
  amTotalRecent:   { en: "Total recent", ar: "الإجمالي الأخير" },
  amLastHour:      { en: "Last hour", ar: "آخر ساعة" },
  amUniqueIps:     { en: "Unique IPs (1h)", ar: "عناوين IP فريدة (ساعة)" },
  amNoFailed:      { en: "No failed login attempts recorded.", ar: "لا توجد محاولات دخول فاشلة مسجّلة." },
  amColTime:       { en: "Time", ar: "الوقت" },
  amColReason:     { en: "Reason", ar: "السبب" },
  amColIp:         { en: "IP", ar: "IP" },
  amReasonUnknownUser:  { en: "Unknown user", ar: "مستخدم غير معروف" },
  amReasonWrongPassword:{ en: "Wrong password", ar: "كلمة مرور خاطئة" },
  amReasonDisabled:     { en: "Disabled account", ar: "حساب معطّل" },

  // Activity log
  amFilterByAccount:{ en: "Filter by account name…", ar: "تصفية باسم الحساب…" },
  amExpandAll:      { en: "Expand All", ar: "توسيع الكل" },
  amCollapseAll:    { en: "Collapse All", ar: "طيّ الكل" },
  amShowing:        { en: "Showing", ar: "عرض" },
  amAccountsWord:   { en: "accounts", ar: "حساب" },
  amTotalEvents:    { en: "total events", ar: "إجمالي الأحداث" },
  amFilteredBy:     { en: "filtered by", ar: "مُصفّى بـ" },
  amLoadingActivity:{ en: "Loading activity…", ar: "جارٍ تحميل النشاط…" },
  amNoMatchAccounts:{ en: "No accounts match", ar: "لا توجد حسابات تطابق" },
  amNoActivity:     { en: "No activity recorded yet.", ar: "لا يوجد نشاط مسجّل بعد." },
  amColOperator:    { en: "Operator", ar: "المشغّل" },
  amColAction:      { en: "Action", ar: "الإجراء" },
  amActionLogin:    { en: "login", ar: "دخول" },
  amActionLogout:   { en: "logout", ar: "خروج" },
  amActionFailed:   { en: "failed", ar: "فشل" },

  // Main — messages & chrome
  amServerNotDeployed: { en: "Server not deployed yet", ar: "الخادم غير منشور بعد" },
  amUsernameTaken:     { en: "Username already taken.", ar: "اسم المستخدم مستخدم بالفعل." },
  amServerError:       { en: "Server error", ar: "خطأ في الخادم" },
  amAccountUpdated:    { en: "Account updated", ar: "تم تحديث الحساب" },
  amAccountCreated:    { en: "Account created", ar: "تم إنشاء الحساب" },
  amNetworkError:      { en: "Network error — please try again", ar: "خطأ في الشبكة — يرجى المحاولة مجددًا" },
  amCantDisableSelfLoggedIn:    { en: "You can't disable your own account while logged in", ar: "لا يمكنك تعطيل حسابك أثناء تسجيل الدخول" },
  amCantDisableLastActiveAdmin: { en: "Can't disable the last active admin", ar: "لا يمكن تعطيل آخر مدير نشط" },
  amAccountDisabled:   { en: "Account disabled", ar: "تم تعطيل الحساب" },
  amAccountEnabled:    { en: "Account enabled", ar: "تم تفعيل الحساب" },
  amOperationRejected: { en: "Operation rejected by server", ar: "رُفضت العملية من الخادم" },
  amToggleFailed:      { en: "Toggle failed", ar: "فشل التبديل" },
  amCantDeleteSelf:    { en: "You can't delete your own account", ar: "لا يمكنك حذف حسابك" },
  amRootProtected:     { en: "The root admin account is protected", ar: "حساب المدير الجذر محمي" },
  amCantDeleteLastAdmin:{ en: "Can't delete the last active admin", ar: "لا يمكن حذف آخر مدير نشط" },
  amDeleted:           { en: "Deleted", ar: "تم حذف" },
  amDeleteFailed:      { en: "Delete failed", ar: "فشل الحذف" },
  amServerNotFound:    { en: "Server endpoint not found — push index.cjs to Render, then refresh.", ar: "لم يُعثر على نقطة الخادم — انشر index.cjs على Render ثم حدّث." },
  amStatTotal:    { en: "Total", ar: "الإجمالي" },
  amStatActive:   { en: "Active", ar: "نشط" },
  amStatDisabled: { en: "Disabled", ar: "معطّل" },
  amStatAdmins:   { en: "Admins", ar: "المدراء" },
  amNavAll:       { en: "All Accounts", ar: "كل الحسابات" },
  amNavAdd:       { en: "Add Account", ar: "إضافة حساب" },
  amNavDormant:   { en: "Dormant", ar: "الخاملة" },
  amNavFailed:    { en: "Failed Logins", ar: "محاولات فاشلة" },
  amNavActivity:  { en: "Activity Log", ar: "سجل النشاط" },
  amSearchPlaceholder: { en: "Search by name or username…", ar: "ابحث بالاسم أو اسم المستخدم…" },
  amLoadingAccounts:{ en: "Loading accounts…", ar: "جارٍ تحميل الحسابات…" },
  amNoAccounts:   { en: "No accounts yet — click Add Account", ar: "لا توجد حسابات بعد — اضغط إضافة حساب" },
  amEditing:      { en: "Editing", ar: "تعديل" },
  amExportCsvTip: { en: "Export all accounts as CSV", ar: "تصدير كل الحسابات بصيغة CSV" },
  amDeleteAccountTitle: { en: "Delete Account", ar: "حذف الحساب" },
  amDeleteConfirm1: { en: "Delete account", ar: "حذف الحساب" },
  amDeleteConfirm2: { en: "This action cannot be undone.", ar: "لا يمكن التراجع عن هذا الإجراء." },
  amDismiss:        { en: "Dismiss", ar: "إغلاق" },

  /* ═══ Invoices section (inside SubscriptionTab) ═══ */
  // Section header
  invSectionTitle:   { en: "Invoices", ar: "الفواتير" },
  invSectionDesc:    { en: "Issue invoices and view past billing history.", ar: "أصدر الفواتير واستعرض سجل الفوترة السابق." },
  invIssueNew:       { en: "Issue New Invoice", ar: "إصدار فاتورة جديدة" },
  invBillingSettings:{ en: "Billing Settings", ar: "إعدادات الفوترة" },
  invHistory:        { en: "Invoice History", ar: "سجل الفواتير" },
  invEmpty:          { en: "No invoices issued yet — click \"Issue New Invoice\" to create one.", ar: "لم تُصدر أي فاتورة بعد — اضغط \"إصدار فاتورة جديدة\" للبدء." },
  invLoading:        { en: "Loading invoices…", ar: "جارٍ تحميل الفواتير…" },

  // List columns
  invColNumber:  { en: "Invoice #",   ar: "رقم الفاتورة" },
  invColDate:    { en: "Issue Date",  ar: "تاريخ الإصدار" },
  invColPeriod:  { en: "Period",      ar: "الفترة" },
  invColPlan:    { en: "Plan",        ar: "الخطة" },
  invColAmount:  { en: "Amount",      ar: "المبلغ" },
  invColCompany: { en: "Company",     ar: "الشركة" },

  // Billing settings modal
  invBpTitle:        { en: "Billing Settings", ar: "إعدادات الفوترة" },
  invBpDesc:         { en: "These details appear on every invoice issued.", ar: "تظهر هذه التفاصيل على كل فاتورة تُصدر." },
  invBpCompanyName:  { en: "Company Name", ar: "اسم الشركة" },
  invBpAddress:      { en: "Address",      ar: "العنوان" },
  invBpTaxId:        { en: "Tax ID / VAT", ar: "الرقم الضريبي" },
  invBpEmail:        { en: "Contact Email", ar: "البريد الإلكتروني" },
  invBpPhone:        { en: "Contact Phone", ar: "الهاتف" },
  invBpNotes:        { en: "Default Notes (optional)", ar: "ملاحظات افتراضية (اختياري)" },
  invBpSaved:        { en: "Billing settings saved", ar: "تم حفظ إعدادات الفوترة" },
  invBpSaveFail:     { en: "Failed to save billing settings", ar: "فشل حفظ إعدادات الفوترة" },

  // Issue invoice modal
  invIssueTitle:     { en: "Issue New Invoice", ar: "إصدار فاتورة جديدة" },
  invIssueIntro:     { en: "Details are pre-filled from the current subscription and account counts. Adjust if needed before issuing.", ar: "البيانات معبّأة تلقائياً من الاشتراك الحالي وعدد الحسابات. عدّلها إذا لزم قبل الإصدار." },
  invFieldIssueDate: { en: "Issue Date",   ar: "تاريخ الإصدار" },
  invFieldPeriodStart:{ en: "Period Start", ar: "بداية الفترة" },
  invFieldPeriodEnd: { en: "Period End",   ar: "نهاية الفترة" },
  invFieldPlan:      { en: "Plan",         ar: "الخطة" },
  invFieldAccounts:  { en: "Accounts Count", ar: "عدد الحسابات" },
  invFieldBranches:  { en: "Branches Count", ar: "عدد الفروع" },
  invFieldAmount:    { en: "Amount",        ar: "المبلغ" },
  invFieldCurrency:  { en: "Currency",      ar: "العملة" },
  invFieldNotes:     { en: "Notes",         ar: "ملاحظات" },
  invIssueBtn:       { en: "Issue Invoice", ar: "إصدار الفاتورة" },
  invIssuing:        { en: "Issuing…",      ar: "جارٍ الإصدار…" },
  invIssuedOk:       { en: "Invoice issued successfully", ar: "تم إصدار الفاتورة بنجاح" },
  invIssueFail:      { en: "Failed to issue invoice", ar: "فشل إصدار الفاتورة" },
  invCompanyNameReq: { en: "Set the company name in Billing Settings first.", ar: "اضبط اسم الشركة في إعدادات الفوترة أولاً." },

  // Invoice viewer
  invViewerTitle:    { en: "Invoice",      ar: "فاتورة" },
  invBilledTo:       { en: "Billed To",    ar: "فُوتر إلى" },
  invIssuedBy:       { en: "Issued By",    ar: "أصدرها" },
  invDate:           { en: "Date",         ar: "التاريخ" },
  invPeriod:         { en: "Period",       ar: "الفترة" },
  invSubscription:   { en: "Subscription", ar: "الاشتراك" },
  invDetails:        { en: "Details",      ar: "التفاصيل" },
  invDescription:    { en: "Description",  ar: "الوصف" },
  invQty:            { en: "Qty",          ar: "الكمية" },
  invLineSub:        { en: "Subscription — {plan} plan", ar: "اشتراك — خطة {plan}" },
  invLineAccounts:   { en: "Active accounts", ar: "حسابات نشطة" },
  invLineBranches:   { en: "Active branches", ar: "فروع نشطة" },
  invTotal:          { en: "Total",        ar: "الإجمالي" },
  invThanks:         { en: "Thank you for your business.", ar: "شكراً لتعاملكم معنا." },
  invPrint:          { en: "Print",        ar: "طباعة" },
  invDownloadPdf:    { en: "Download PDF", ar: "تنزيل PDF" },
  invClose:          { en: "Close",        ar: "إغلاق" },
  invPdfNoteAr:      { en: "PDF is generated in English. Use Print for the bilingual on-screen layout.", ar: "ملف PDF يُولَّد بالإنجليزية. استخدم زر الطباعة للحصول على التنسيق ثنائي اللغة المعروض." },
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
