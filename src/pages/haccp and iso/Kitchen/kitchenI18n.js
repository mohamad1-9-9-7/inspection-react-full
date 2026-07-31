// src/pages/haccp and iso/Kitchen/kitchenI18n.js
// Shared bilingual dictionary for the Kitchen (المطبخ) modules.
// Uses the same language storage key as the other HACCP modules so the
// EN/AR toggle stays in sync across the whole ISO hub.

import { useEffect, useState } from "react";

const STORAGE_KEY = "haccp_modules_lang_v1";

export const KT = {
  ar: {
    /* ===== Common ===== */
    back: "← رجوع",
    backToHub: "← رجوع للمطبخ",
    backToIso: "← HACCP / ISO",
    save: "💾 حفظ",
    saving: "⏳ جاري الحفظ...",
    saved: "✅ تم الحفظ",
    cancel: "إلغاء",
    del: "🗑️ حذف",
    refresh: "🔄 تحديث",
    loading: "⏳ جاري التحميل...",
    print: "🖨️ طباعة",
    search: "بحث...",
    confirmDelete: "هل تريد فعلاً حذف هذا الصنف؟",
    saveError: "❌ خطأ بالحفظ",
    deleteError: "❌ خطأ بالحذف",
    required: "مطلوب",
    noPermission: "لا تملك صلاحية لهذه العملية",

    /* ===== Kitchen hub ===== */
    kitchenTitle: "المطبخ",
    kitchenEyebrow: "قسم المطبخ",
    kitchenSubtitle: "وسم القيم الغذائية، الوصفات، وسجلات المطبخ",
    openModule: "فتح",
    soon: "قريباً",

    /* ===== Menu nutrition module ===== */
    mnTitle: "وسم السعرات والقيم الغذائية للمنيو",
    mnSubtitle: "لائحة أبوظبي ADG 10/2026 — السعرات لكل حصة + 9 عناصر غذائية",
    mnEntry: "إدخال البيانات الغذائية",
    mnEntrySub: "الأصناف، القيم لكل 100 غرام، والتوثيق",
    mnView: "مخرجات المنيو",
    mnViewSub: "منيو للطباعة + كتيّب غذائي + QR + حالة الامتثال",

    /* ===== Module hub (input vs. view) ===== */
    mnHubTitle: "سعرات وقيم المنيو الغذائية",
    mnHubKicker: "اختر الوجهة",
    mnEntryLong: "إضافة وتعديل الأصناف، إدخال القيم لكل 100 غرام، والتوثيق المطلوب للتفتيش.",
    mnViewLong: "سجل الأصناف، منيو للطباعة، الكتيّب الغذائي، رمز QR، وحالة الامتثال.",
    countItems: "{n} صنف",
    countComplete: "{n} مكتمل",
    countIssues: "{n} بحاجة معالجة",

    /* ===== Register (view) ===== */
    tabRegister: "سجل الأصناف",
    registerHeading: "سجل أصناف المنيو",
    registerNote:
      "بيانات ثابتة (Master Data) — تتغيّر فقط عند تعديل وصفة أو وزن أو إضافة صنف، وليست سجلاً يومياً.",
    edit: "✏️ تعديل",
    exportExcel: "⬇️ تصدير Excel",
    exporting: "⏳ جاري التصدير...",
    exported: "✅ تم تنزيل الملف",
    exportError: "❌ فشل التصدير",
    nothingToExport: "لا يوجد أصناف للتصدير",
    actionsCol: "إجراءات",
    statusCol: "الحالة",
    sortBy: "ترتيب",
    sortSection: "القسم / اليوم",
    sortNameEn: "الاسم (إنجليزي)",
    sortNameAr: "الاسم (عربي)",
    sortKcal: "السعرات (تنازلي)",
    sortWeight: "الوزن (تنازلي)",
    sortStatus: "الحالة",
    filterStatus: "الحالة",
    allStatuses: "كل الحالات",
    clearFilters: "مسح الفلاتر",
    resultCount: "{n} من {total}",
    groupByDay: "تجميع حسب القسم/اليوم",
    flatList: "جدول واحد",
    deleting: "⏳ جاري الحذف...",
    deleted: "✅ تم الحذف",
    addNew: "+ صنف جديد",

    /* ===== Sections ===== */
    secDay: "منيو اليوم",
    secSalads: "السلطات",
    secCold: "المقبلات الباردة",
    secHot: "المقبلات الساخنة",
    allSections: "كل الأقسام",

    /* ===== Days ===== */
    Saturday: "السبت",
    Sunday: "الأحد",
    Monday: "الإثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
    Thursday: "الخميس",
    Friday: "الجمعة",

    /* ===== Item fields ===== */
    fldSection: "القسم",
    fldDay: "اليوم",
    fldNameEn: "اسم الصنف (إنجليزي)",
    fldNameAr: "اسم الصنف (عربي)",
    fldServedWith: "يُقدّم مع",
    fldWeight: "الوزن",
    fldWeightHint: "أمثلة: 700 · 350/300 (طبق + أرز) · 5x50 (5 قطع) · 300",
    fldIngredients: "المكوّنات",
    fldIngredientsHint:
      "اكتب المكوّنات مفصولة بفاصلة. أي تعديل عليها بعد آخر حساب يعلّم الصنف تلقائياً بأنه يحتاج إعادة حساب (شرط اللائحة).",
    ingredientsLabel: "المكوّنات",
    fldNotes: "ملاحظات",
    totalPortion: "وزن الحصة الكلي",
    weightParts: "مجموع {n} أجزاء تُقدَّم معاً",
    weightPieces: "{n} قطعة × {each} غ",
    weightMissing: "⚠️ الوزن غير محدد — لازم تدخله قبل الحساب",

    /* ===== Nutrition ===== */
    per100: "القيم لكل 100 غرام (من مصدر معتمد)",
    per100Hint: "أدخل القيم من مختبر معتمد من QCC أو من برنامج تحليل غذائي معتمد. التطبيق يحسب الحصة فقط.",
    perPortion: "القيم لكل حصة (محسوبة تلقائياً)",
    perPortionFormula: "القيمة للحصة = القيمة لكل 100غ × الوزن الكلي ÷ 100 — تقريب لأقرب رقم صحيح للسعرات والصوديوم",

    /* ===== Atwater ===== */
    atwater: "تحقّق Atwater",
    atwaterOk: "✅ السعرات المُدخلة متوافقة مع حساب Atwater (فرق {pct}%)",
    atwaterWarn: "⚠️ السعرات المُدخلة تختلف {pct}% عن حساب Atwater ({calc} kcal/100غ) — راجع الإدخال",
    atwaterNa: "أدخل الكربوهيدرات والبروتين والدهون لعرض تحقّق Atwater",
    atwaterNote: "Atwater أداة تدقيق فقط، وليست بديلاً عن المصدر المعتمد. تُحسب: (كربوهيدرات متاحة×4) + (بروتين×4) + (دهون×9) + (ألياف×2).",

    /* ===== Consistency validation ===== */
    vTitle: "تدقيق منطقي للقيم",
    vOk: "✅ كل القيم متسقة منطقياً",
    vIntro: "أخطاء الإدخال التالية تمنع اعتماد الصنف:",
    vNegative: "في قيمة سالبة — غير مسموح.",
    vKcalMax: "السعرات {v} kcal لكل 100غ تتجاوز السقف الفيزيائي {max} (الدهن الصافي).",
    vSodiumMax: "الصوديوم {v} ملغ لكل 100غ يتجاوز {max} (الملح الصافي).",
    vFatSubset:
      "المشبعة + المتحولة = {sum}غ، أكبر من إجمالي الدهون {total}غ — وهي جزء منه لا إضافة عليه.",
    vFiberSubset:
      "الألياف {v}غ أكبر من إجمالي الكربوهيدرات {total}غ — والألياف جزء من الكربوهيدرات.",
    vSugarSubset:
      "السكريات {v}غ أكبر من إجمالي الكربوهيدرات {total}غ — والسكريات جزء من الكربوهيدرات.",
    vCarbSubset:
      "الألياف + السكريات = {sum}غ، أكبر من إجمالي الكربوهيدرات {total}غ — وكلاهما جزء منها.",
    vMacroSum: "دهون + كربوهيدرات + بروتين = {sum}غ لكل 100غ — مستحيل يتجاوز 100غ.",
    statusInvalid: "قيم غير متسقة",
    cmpInvalid: "قيم غير متسقة",

    /* ===== Font scale ===== */
    fontSize: "حجم الخط",
    fontSmaller: "تصغير الخط",
    fontBigger: "تكبير الخط",
    fontReset: "إرجاع الحجم الأساسي",

    /* ===== Documentation ===== */
    docTitle: "التوثيق (إلزامي للتفتيش)",
    docMethod: "طريقة الحساب",
    docMethodLab: "مختبر معتمد من QCC",
    docMethodSoftware: "برنامج / قاعدة بيانات معتمدة",
    docSource: "اسم المصدر / المختبر / البرنامج",
    docSourceHint: "مثال: تقرير مختبر رقم LAB-2026-114، أو اسم البرنامج والإصدار",
    docRef: "رقم التقرير / المرجع",
    docDate: "تاريخ الحساب",
    docBy: "أعدّها",

    /* ===== Status ===== */
    statusComplete: "مكتمل",
    statusPartial: "ناقص",
    statusEmpty: "بدون بيانات",
    statusRecalc: "يحتاج إعادة حساب",
    recalcReasonWeight: "الوزن تغيّر من {old} إلى {now} غرام بعد آخر حساب",
    recalcReasonNoDate: "ما في تاريخ حساب مسجّل",
    recalcReasonIngredients: "المكوّنات تعدّلت بعد آخر حساب",

    /* ===== Item list ===== */
    items: "الأصناف",
    newItem: "+ صنف جديد",
    /* ===== Sync with the master menu table ===== */
    syncBtn: "🔄 مزامنة مع جدول المنيو",
    syncBtnHint:
      "يقارن قاعدة البيانات بجدول المنيو الأساسي: يضيف الناقص، يحدّث الأصناف القديمة، ويعرض الزائد للحذف.",
    syncTitle: "مزامنة مع جدول المنيو الأساسي",
    syncIntro:
      "هذا ما سيحدث. القيم الغذائية والتوثيق والمكوّنات والملاحظات لن تُلمس — التحديث يشمل فقط: القسم، اليوم، الأسماء، يُقدّم مع، والوزن.",
    syncMatched: "مطابق",
    syncToAdd: "➕ سيُضاف",
    syncToUpdate: "🔄 سيُحدَّث",
    syncExtra: "⚠️ غير موجود في جدول المنيو",
    syncExtraHint:
      "أصناف موجودة بقاعدة البيانات وغير موجودة بجدول المنيو — عادةً بقايا من نسخة قديمة. الأصناف اللي فيها قيم غذائية مُدخلة غير مُحدَّدة تلقائياً حمايةً لها.",
    syncHasData: "فيها قيم مُدخلة",
    syncApply: "تطبيق المزامنة",
    syncApplying: "⏳ جاري التطبيق... {done}/{total}",
    syncInSync: "✅ قاعدة البيانات مطابقة لجدول المنيو الأساسي",
    syncDone: "✅ تمت المزامنة: {added} إضافة · {updated} تحديث · {removed} حذف",
    syncNothingSelected: "ما في شي محدَّد للتطبيق",
    fldOrder: "الترتيب",
    importPaste: "📋 استيراد من Excel",
    importTitle: "استيراد أصناف من Excel (لصق)",
    importHint:
      "انسخ الصفوف من ورقة Menu Data والصقها هنا. الأعمدة بالترتيب مفصولة بـ Tab: القسم/اليوم ← الاسم إنجليزي ← الاسم عربي ← يُقدّم مع ← الوزن",
    importDo: "استيراد",
    importedN: "تم استيراد {n} صنف",
    noItems: "لا يوجد أصناف بعد — اضغط \"تحميل قائمة الأصناف الأساسية\" أو \"صنف جديد\".",
    selectItem: "اختر صنف من القائمة لتعبئة بياناته",

    /* ===== View page ===== */
    tabMenu: "منيو للطباعة",
    tabBooklet: "الكتيّب الغذائي",
    tabQr: "QR",
    tabCompliance: "حالة الامتثال",
    menuHeading: "المنيو — السعرات لكل حصة",
    bookletHeading: "الكتيّب الغذائي — القيم لكل حصة",
    dailyIntakeLabel: "المرجع اليومي للسعرات",
    itemCol: "الصنف",
    weightCol: "الوزن",
    kcalCol: "السعرات (kcal)",
    servedWithCol: "يُقدّم مع",
    noData: "—",
    complianceHeading: "جاهزية الامتثال",
    cmpTotal: "إجمالي الأصناف",
    cmpComplete: "مكتملة",
    cmpMissing: "ناقصة بيانات",
    cmpRecalc: "تحتاج إعادة حساب",
    cmpNoWeight: "بدون وزن",
    cmpIssue: "الملاحظة",
    qrHint:
      "اطبع رمز QR وضعه على المنيو الورقي. الرمز يفتح صفحة الكتيّب الغذائي ثنائي اللغة.",
    qrUrlLabel: "الرابط المستهدف",
    langBoth: "عربي + إنجليزي",
  },

  en: {
    /* ===== Common ===== */
    back: "← Back",
    backToHub: "← Back to Kitchen",
    backToIso: "← HACCP / ISO",
    save: "💾 Save",
    saving: "⏳ Saving...",
    saved: "✅ Saved",
    cancel: "Cancel",
    del: "🗑️ Delete",
    refresh: "🔄 Refresh",
    loading: "⏳ Loading...",
    print: "🖨️ Print",
    search: "Search...",
    confirmDelete: "Really delete this item?",
    saveError: "❌ Save failed",
    deleteError: "❌ Delete failed",
    required: "required",
    noPermission: "You do not have permission for this action",

    /* ===== Kitchen hub ===== */
    kitchenTitle: "Kitchen",
    kitchenEyebrow: "Kitchen Section",
    kitchenSubtitle: "Menu nutrition labelling, recipes and kitchen records",
    openModule: "Open",
    soon: "Coming soon",

    /* ===== Menu nutrition module ===== */
    mnTitle: "Menu Calorie & Nutrition Labelling",
    mnSubtitle: "Abu Dhabi ADG 10/2026 — calories per portion + 9 nutrients",
    mnEntry: "Nutrition Data Entry",
    mnEntrySub: "Items, per-100g values and documentation",
    mnView: "Menu Outputs",
    mnViewSub: "Printable menu + nutrient booklet + QR + compliance status",

    /* ===== Module hub (input vs. view) ===== */
    mnHubTitle: "Menu Calories & Nutrition",
    mnHubKicker: "Choose a destination",
    mnEntryLong:
      "Add and edit items, enter per-100 g values, and record the documentation required for inspection.",
    mnViewLong:
      "Item register, printable menu, nutrient booklet, QR code and compliance status.",
    countItems: "{n} items",
    countComplete: "{n} complete",
    countIssues: "{n} need attention",

    /* ===== Register (view) ===== */
    tabRegister: "Item register",
    registerHeading: "Menu item register",
    registerNote:
      "Master data — it changes only when a recipe, a weight or the item list changes. This is not a daily log.",
    edit: "✏️ Edit",
    exportExcel: "⬇️ Export Excel",
    exporting: "⏳ Exporting...",
    exported: "✅ File downloaded",
    exportError: "❌ Export failed",
    nothingToExport: "No items to export",
    actionsCol: "Actions",
    statusCol: "Status",
    sortBy: "Sort",
    sortSection: "Section / day",
    sortNameEn: "Name (English)",
    sortNameAr: "Name (Arabic)",
    sortKcal: "Calories (high → low)",
    sortWeight: "Weight (high → low)",
    sortStatus: "Status",
    filterStatus: "Status",
    allStatuses: "All statuses",
    clearFilters: "Clear filters",
    resultCount: "{n} of {total}",
    groupByDay: "Group by section / day",
    flatList: "Single table",
    deleting: "⏳ Deleting...",
    deleted: "✅ Deleted",
    addNew: "+ New item",

    /* ===== Sections ===== */
    secDay: "Daily Menu",
    secSalads: "Salads",
    secCold: "Cold Appetizers",
    secHot: "Hot Appetizers",
    allSections: "All sections",

    /* ===== Days ===== */
    Saturday: "Saturday",
    Sunday: "Sunday",
    Monday: "Monday",
    Tuesday: "Tuesday",
    Wednesday: "Wednesday",
    Thursday: "Thursday",
    Friday: "Friday",

    /* ===== Item fields ===== */
    fldSection: "Section",
    fldDay: "Day",
    fldNameEn: "Item name (English)",
    fldNameAr: "Item name (Arabic)",
    fldServedWith: "Served with",
    fldWeight: "Weight",
    fldWeightHint: "Examples: 700 · 350/300 (dish + rice) · 5x50 (5 pieces) · 300",
    fldIngredients: "Ingredients",
    fldIngredientsHint:
      "List the ingredients, comma separated. Editing them after the last calculation automatically flags the item for recalculation, as the regulation requires.",
    ingredientsLabel: "Ingredients",
    fldNotes: "Notes",
    totalPortion: "Total portion weight",
    weightParts: "Sum of {n} parts served together",
    weightPieces: "{n} pieces × {each} g",
    weightMissing: "⚠️ Weight not set — required before portion values can be used",

    /* ===== Nutrition ===== */
    per100: "Values per 100 g (from an approved source)",
    per100Hint:
      "Enter values from a QCC-accredited lab or an approved nutritional-analysis software. This tool only scales them to the portion.",
    perPortion: "Values per portion (auto-calculated)",
    perPortionFormula:
      "portion = per-100g × total weight ÷ 100 — calories and sodium rounded to the nearest whole number",

    /* ===== Atwater ===== */
    atwater: "Atwater cross-check",
    atwaterOk: "✅ Entered calories agree with the Atwater calculation ({pct}% difference)",
    atwaterWarn:
      "⚠️ Entered calories differ by {pct}% from the Atwater calculation ({calc} kcal/100 g) — please review",
    atwaterNa: "Enter carbohydrates, protein and fat to see the Atwater cross-check",
    atwaterNote:
      "Atwater is a validation aid, not a substitute for the approved source. Computed as (available carbs×4) + (protein×4) + (fat×9) + (fiber×2).",

    /* ===== Consistency validation ===== */
    vTitle: "Consistency checks",
    vOk: "✅ All values are internally consistent",
    vIntro: "These data-entry errors block the item from being approved:",
    vNegative: "A value is negative — not allowed.",
    vKcalMax: "{v} kcal per 100 g exceeds the physical ceiling of {max} (pure fat).",
    vSodiumMax: "{v} mg sodium per 100 g exceeds {max} (pure salt).",
    vFatSubset:
      "Saturated + trans = {sum} g, more than total fat {total} g — they are part of it, not additional to it.",
    vFiberSubset:
      "Dietary fiber {v} g exceeds total carbohydrates {total} g — fiber is part of the carbohydrates.",
    vSugarSubset:
      "Total sugars {v} g exceeds total carbohydrates {total} g — sugars are part of the carbohydrates.",
    vCarbSubset:
      "Fiber + sugars = {sum} g, more than total carbohydrates {total} g — both are part of it.",
    vMacroSum: "Fat + carbohydrates + protein = {sum} g per 100 g — cannot exceed 100 g.",
    statusInvalid: "Inconsistent values",
    cmpInvalid: "Inconsistent values",

    /* ===== Font scale ===== */
    fontSize: "Text size",
    fontSmaller: "Smaller text",
    fontBigger: "Larger text",
    fontReset: "Reset to default size",

    /* ===== Documentation ===== */
    docTitle: "Documentation (mandatory for inspection)",
    docMethod: "Calculation method",
    docMethodLab: "QCC-accredited laboratory",
    docMethodSoftware: "Approved software / database",
    docSource: "Source / lab / software name",
    docSourceHint: "e.g. Lab report LAB-2026-114, or software name + version",
    docRef: "Report / reference no.",
    docDate: "Calculation date",
    docBy: "Prepared by",

    /* ===== Status ===== */
    statusComplete: "Complete",
    statusPartial: "Incomplete",
    statusEmpty: "No data",
    statusRecalc: "Needs recalculation",
    recalcReasonWeight: "Weight changed from {old} g to {now} g after the last calculation",
    recalcReasonNoDate: "No calculation date recorded",
    recalcReasonIngredients: "Ingredients changed after the last calculation",

    /* ===== Item list ===== */
    items: "Items",
    newItem: "+ New item",
    /* ===== Sync with the master menu table ===== */
    syncBtn: "🔄 Sync with menu table",
    syncBtnHint:
      "Compares the database with the master menu table: adds what is missing, updates stale items, and lists extras for removal.",
    syncTitle: "Sync with the master menu table",
    syncIntro:
      "Here is what will happen. Nutrition values, documentation, ingredients and notes are never touched — an update only rewrites section, day, names, served-with and weight.",
    syncMatched: "In sync",
    syncToAdd: "➕ Will be added",
    syncToUpdate: "🔄 Will be updated",
    syncExtra: "⚠️ Not in the menu table",
    syncExtraHint:
      "Items in the database that the menu table no longer contains — usually leftovers from an older version. Items that already hold nutrition values are left unchecked to protect them.",
    syncHasData: "has values",
    syncApply: "Apply sync",
    syncApplying: "⏳ Applying... {done}/{total}",
    syncInSync: "✅ The database matches the master menu table",
    syncDone: "✅ Synced: {added} added · {updated} updated · {removed} removed",
    syncNothingSelected: "Nothing selected to apply",
    fldOrder: "Order",
    importPaste: "📋 Import from Excel",
    importTitle: "Import items from Excel (paste)",
    importHint:
      "Copy the rows from your Menu Data sheet and paste them here. Tab-separated columns in this order: Section/Day → Name EN → Name AR → Served with → Weight",
    importDo: "Import",
    importedN: "{n} items imported",
    noItems: 'No items yet — click "Load starter catalogue" or "New item".',
    selectItem: "Select an item from the list to fill in its data",

    /* ===== View page ===== */
    tabMenu: "Printable menu",
    tabBooklet: "Nutrient booklet",
    tabQr: "QR",
    tabCompliance: "Compliance status",
    menuHeading: "Menu — calories per portion",
    bookletHeading: "Nutrient booklet — values per portion",
    dailyIntakeLabel: "Daily calorie reference",
    itemCol: "Item",
    weightCol: "Weight",
    kcalCol: "Calories (kcal)",
    servedWithCol: "Served with",
    noData: "—",
    complianceHeading: "Compliance readiness",
    cmpTotal: "Total items",
    cmpComplete: "Complete",
    cmpMissing: "Missing data",
    cmpRecalc: "Need recalculation",
    cmpNoWeight: "No weight",
    cmpIssue: "Issue",
    qrHint:
      "Print this QR code on the physical menu. It opens the bilingual nutrient booklet page.",
    qrUrlLabel: "Target URL",
    langBoth: "Arabic + English",
  },
};

export function useKitchenLang() {
  const [lang, setLang] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "en" || v === "ar" ? v : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  function t(key, vars) {
    const dict = KT[lang] || KT.en;
    let str = dict[key];
    if (str === undefined) str = KT.en[key] ?? key;
    if (vars && typeof str === "string") {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? ""));
      }
    }
    return str;
  }

  function toggle() {
    setLang((l) => (l === "ar" ? "en" : "ar"));
  }

  return {
    lang,
    setLang,
    toggle,
    t,
    isAr: lang === "ar",
    dir: lang === "ar" ? "rtl" : "ltr",
  };
}
