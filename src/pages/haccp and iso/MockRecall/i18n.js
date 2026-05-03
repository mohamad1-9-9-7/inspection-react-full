// src/pages/haccp and iso/MockRecall/i18n.js
// قاموس ثنائي اللغة (عربي/إنكليزي) لـ Mock Recall

import { useEffect, useState } from "react";

const STORAGE_KEY = "mr_lang_v1";

export const STRINGS = {
  ar: {
    /* ===== Header / Brand ===== */
    docTitle: "تمرين السحب الوهمي / تتبّع",
    docNo: "رقم الوثيقة",
    issueDate: "تاريخ الإصدار",
    revisionNo: "رقم المراجعة",
    drillDate: "تاريخ التمرين",
    reference: "المرجع",
    auto: "تلقائي",
    brandStrip: "🔄 تمرين السحب الوهمي — تتبّع",

    /* ===== KPI ===== */
    duration: "المدّة",
    durLimit: "الحد: 4 ساعات (240 دقيقة)",
    tracedPct: "نسبة التتبّع",
    pctLimit: "الحد: ≥ 99%",
    result: "النتيجة",
    resultLimit: "≥ 99% خلال 4 ساعات",
    pass: "PASS",
    fail: "FAIL",

    /* ===== Linked Reports ===== */
    linkedReports: "🔗 ربط بتقارير موجودة",
    linkedReportsHint: "اختر منتج من تقارير الاستلام أو المنتج النهائي، وسيارة من تقرير التحميل — يتعبّى تلقائياً.",
    shipmentTitle: "استلام شحنة",
    shipmentHint: "رقم فاتورة / مورّد / تاريخ",
    loadingTitle: "تحميل السيارات",
    loadingHint: "سيارة / سائق / تاريخ",
    finishedTitle: "المنتج النهائي",
    finishedHint: "منتج / زبون / تاريخ",
    pickHere: "🔍 اضغط للبحث والاختيار",
    linked: "مرتبط",
    unlink: "إلغاء الربط",

    /* ===== Sections ===== */
    drillInfo: "📋 معلومات التمرين",
    selectedProduct: "📦 المنتج المختار",
    backwardTrace: "⬅️ التتبّع للخلف — المواد الخام",
    forwardTrace: "➡️ التتبّع للأمام — التوزيع للزبائن",
    timingResults: "⏱️ النتائج",
    signoff: "✍️ التوقيع",

    /* ===== Drill Info Fields ===== */
    drillType: "سبب التمرين",
    drillRef: "المرجع (اختياري)",
    triggeredBy: "المُحفِّز (اختياري)",
    drillTypeScheduled: "مجدول (ربعي)",
    drillTypeAudit: "بطلب من المُدقِّق",
    drillTypeComplaint: "بسبب شكوى",
    drillTypeRegulatory: "بطلب من جهة رقابية",
    triggeredByPlaceholder: "مُدقِّق / زبون / مجدول",
    drillName: "تسمية التمرين",
    drillNameMockRecall: "🔄 سحب وهمي (Mock Recall)",
    drillNameTraceability: "🧬 تمرين تتبّع (Traceability Drill)",
    drillNameMockRecallShort: "سحب وهمي",
    drillNameTraceabilityShort: "تمرين تتبّع",

    /* ===== Product Fields ===== */
    productName: "اسم المنتج *",
    batchNo: "رقم الدفعة *",
    branch: "الفرع / المصنع",
    productionDate: "تاريخ الإنتاج",
    expiryDate: "تاريخ الانتهاء",
    qtyProduced: "الكمية المنتَجة",
    productTemp: "درجة حرارة المنتج",

    /* ===== Backward Table ===== */
    rawMaterial: "المادة الخام",
    supplier: "المورّد",
    supplierLot: "دفعة المورّد",
    dateReceived: "تاريخ الاستلام",
    qtyUsed: "الكمية المستخدمة",
    grnRef: "GRN / الفاتورة",
    addMaterial: "＋ إضافة مادة",

    /* ===== Forward Table ===== */
    customer: "الزبون / الفرع",
    dateDispatched: "تاريخ الإرسال",
    qtyShipped: "الكمية المُرسلة",
    vehicle: "السيارة",
    driver: "السائق",
    pod: "تأكيد التسليم",
    addDistribution: "＋ إضافة توزيع",

    /* ===== Timing & Results ===== */
    startTime: "وقت البدء",
    endTime: "وقت الانتهاء",
    qtyTraced: "الكمية المتعقَّبة",
    qtyTracedPlaceholder: "من {qty} {unit}",
    gaps: "الثغرات / الملاحظات",
    gapsPlaceholder: "أي ثغرات اكتُشفت أثناء التتبّع...",
    correctiveActions: "الإجراءات التصحيحية",
    correctiveActionsPlaceholder: "الإجراءات التصحيحية المتخذة...",

    /* ===== Sign-off ===== */
    conductedBy: "نفّذه *",
    verifiedBy: "تحقّق منه",
    conductedSig: "✍️ توقيع المُنفِّذ",
    verifiedSig: "✍️ توقيع المُحقِّق",

    /* ===== Buttons ===== */
    save: "💾 حفظ التمرين",
    saving: "⏳ جاري الحفظ…",
    viewPast: "📋 عرض التمارين السابقة",
    close: "إغلاق",
    edit: "✏️ تعديل",
    deleteAction: "🗑️ حذف",
    update: "💾 حفظ التعديلات",
    cancelEdit: "✖ إلغاء التعديل",
    editingMode: "✏️ وضع التعديل — تعدّل تمرين محفوظ",
    loadingDrill: "⏳ جارٍ تحميل التمرين...",
    drillNotFound: "❌ التمرين المطلوب غير موجود.",
    confirmDelete: "هل تريد حذف هذا التمرين نهائياً؟",
    deleted: "✅ تم الحذف",
    deleteFailed: "❌ فشل الحذف",
    updated: "✅ تم تحديث التمرين",

    /* ===== Modal ===== */
    saved: "✅ تم حفظ التمرين",
    savedPass: "النتيجة: PASS",
    savedFail: "النتيجة: FAIL",
    saveFailed: "❌ فشل الحفظ",

    /* ===== View Page ===== */
    viewTitle: "🔄 تمارين السحب الوهمي / التتبّع",
    viewSubtitle: "تمارين السحب الوهمي للتحقق من قدرة التتبّع",
    refresh: "🔄 تحديث",
    refreshing: "⏳ جارٍ التحميل...",
    newDrill: "➕ تمرين جديد",
    back: "← رجوع",

    /* ===== View KPIs ===== */
    totalDrills: "إجمالي التمارين",
    allYears: "كل السنوات",
    successRate: "نسبة النجاح",
    avgDuration: "متوسط المدّة",
    avgTrace: "متوسط التتبّع",
    sinceLastDrill: "منذ آخر تمرين",
    days: "يوم",

    /* ===== Filters ===== */
    allResults: "كل النتائج",
    onlyPass: "✅ Pass فقط",
    onlyFail: "❌ Fail فقط",
    onlyPending: "⏳ غير مكتمل",
    drills: "تمرين",

    /* ===== List ===== */
    pending: "PENDING",
    noResults: "🎯 لا توجد تمارين مطابقة.",
    noResultsHint: "اضغط \"➕ تمرين جديد\" لتسجيل أول تمرين.",
    loading: "⏳ جارٍ التحميل...",

    /* ===== Card details ===== */
    linkedSourceTitle: "🔗 التقارير المرتبطة (مصدر البيانات)",
    openSource: "🔗 افتح المصدر",
    qtyLabel: "المدّة",
    traceLabel: "تتبّع",

    /* ===== Popup viewer ===== */
    popupShipment: "📦 تقرير استلام الشحنة",
    popupLoading: "🚚 تقرير تحميل السيارات",
    popupFinished: "🏷️ تقرير المنتج النهائي",
    loadingSource: "⏳ جارٍ تحميل التقرير المصدر...",
    sourceMissing: "التقرير المصدر لم يعد متوفراً (ربما حُذف).",
    savedAtDrill: "البيانات المحفوظة وقت التمرين:",
    shipmentInfo: "📋 معلومات الشحنة العامة",
    items: "📦 العناصر",
    signatures: "✍️ التوقيعات",
    dayInfo: "📋 معلومات اليوم",
    vehiclesOfDay: "🚚 السيارات في تقرير اليوم",
    productsOfDay: "🏷️ منتجات اليوم",
    selectedVehicle: "السيارة المختارة",
    selectedProductLabel: "المنتج المختار",
    highlighted: "— مظلّلة",
    noVehicles: "لا يوجد سيارات في هذا التقرير.",
    noProducts: "لا يوجد منتجات في هذا التقرير.",

    /* ===== Common ===== */
    notSelected: "—",
    yes: "نعم",
    no: "لا",

    /* ===== 📎 Attachments ===== */
    attachments: "📎 المرفقات والصور",
    attachmentsHint: "ارفع صور الفواتير، تحويلات الزبائن، فواتير الاسترجاع، أو أي وثيقة داعمة",
    addAttachment: "＋ إضافة مرفق",
    attachmentCategory: "نوع المرفق",
    attachmentLabel: "الوصف (اختياري)",
    attachmentLabelPlaceholder: "مثلاً: فاتورة Carrefour 2026-04-28",
    catInvoice: "🧾 فاتورة بيع",
    catTransfer: "🚚 سند تحويل",
    catReturnInvoice: "↩️ فاتورة استرجاع",
    catGRN: "📦 إيصال استلام (GRN)",
    catPhoto: "📷 صورة منتج",
    catOther: "📄 أخرى",
    chooseFile: "اختر ملف",
    chooseFiles: "اختر ملفات (متعدّدة)",
    dragDropHint: "أو اسحب الصور هنا",
    imagesOnly: "الصور فقط (JPG/PNG/WEBP)",
    compressing: "⏳ جاري ضغط الصورة...",
    fileTooLarge: "❌ الملف كبير جداً (أكثر من 10MB)",
    invalidFileType: "❌ نوع الملف غير مدعوم (الصور فقط)",
    deleteAttachment: "حذف هذا المرفق؟",
    noAttachments: "لا توجد مرفقات",
    attachmentsCount: "مرفق",
    download: "⬇️ تحميل",
    fullSize: "🔍 عرض بحجم كامل",

    /* ===== ⚙️ Settings ===== */
    settings: "⚙️ الإعدادات",
    settingsTitle: "⚙️ إعدادات تمرين السحب الوهمي",
    settingsSubtitle: "حدّد عتبات النجاح حسب سياسة الشركة أو متطلبات المُدقِّق",
    minTracePct: "الحد الأدنى لنسبة الاسترجاع (%)",
    maxDurationMin: "الحد الأقصى للمدّة (بالدقائق)",
    minTracePctHint: "النسبة المطلوبة لاعتبار التتبّع ناجحاً (مثلاً 99%)",
    maxDurationMinHint: "الوقت المسموح للتمرين كحد أقصى (240 = 4 ساعات)",
    saveSettings: "💾 حفظ الإعدادات",
    settingsSaved: "✅ تم حفظ الإعدادات على السيرفر — تنطبق على الجميع",
    settingsSaveFailed: "❌ فشل حفظ الإعدادات",
    resetDefaults: "↺ القيم الافتراضية (99% / 4h)",
    notesAboutStandards: "ملاحظة: لا يوجد رقم رسمي إجباري في ISO/HACCP — العتبات تُحدَّد بالاتفاق مع المُدقِّق وسياسة الشركة.",

    /* ===== 🆕 Coolers / Branch Temp / Truck Cleaning ===== */
    coolersTitle: "حرارة البرّادات (QCS)",
    coolersHint: "تاريخ سجل حرارة البرّادات",
    branchTempTitle: "حرارة الفرع",
    branchTempHint: "سجل حرارة فرع الإنتاج",
    truckCleaningTitle: "تنظيف السيارة",
    truckCleaningHint: "نفس رقم السيارة المرتبطة",
    pickBranchFirst: "⚠️ اختر فرع المنتج أولاً",
    pickLoadingFirst: "⚠️ اربط تقرير التحميل أولاً (لمعرفة رقم السيارة)",
    branchTempUnsupported: "هذا الفرع لا يحتوي على سجل حرارة منفصل",
    popupCoolers: "🧊 سجل حرارة البرّادات",
    popupBranchTemp: "🌡️ سجل حرارة الفرع",
    popupTruckCleaning: "🧼 تقرير تنظيف السيارة",
    coolerName: "اسم البرّاد",
    minTemp: "الحد الأدنى",
    maxTemp: "الحد الأعلى",
    actualTemp: "القراءة الفعلية",
    truckNo: "رقم السيارة",
    cleaningStatus: "الحالة",

    /* ===== Direction ===== */
    dir: "rtl",
    /* ===== Lang toggle ===== */
    switchToEn: "🇬🇧 EN",
    switchToAr: "🇸🇦 AR",
  },

  en: {
    /* ===== Header / Brand ===== */
    docTitle: "Mock Recall / Traceability Drill",
    docNo: "Document No",
    issueDate: "Issue Date",
    revisionNo: "Revision No",
    drillDate: "Drill Date",
    reference: "Reference",
    auto: "AUTO",
    brandStrip: "🔄 MOCK RECALL — TRACEABILITY DRILL",

    duration: "Duration",
    durLimit: "Limit: 4h (240 min)",
    tracedPct: "Traced %",
    pctLimit: "Limit: ≥ 99%",
    result: "Result",
    resultLimit: "≥ 99% within 4 hours",
    pass: "PASS",
    fail: "FAIL",

    linkedReports: "🔗 Link Existing Reports",
    linkedReportsHint: "Pick a product from receiving / final-product reports, a vehicle from the loading report — fields auto-fill.",
    shipmentTitle: "Shipment Receiving",
    shipmentHint: "Invoice No / Supplier / Date",
    loadingTitle: "Vehicle Loading",
    loadingHint: "Vehicle / Driver / Date",
    finishedTitle: "Final Product",
    finishedHint: "Product / Customer / Date",
    pickHere: "🔍 Click to search & select",
    linked: "Linked",
    unlink: "Unlink",

    drillInfo: "📋 Drill Info",
    selectedProduct: "📦 Selected Product",
    backwardTrace: "⬅️ Backward Trace — Raw Materials",
    forwardTrace: "➡️ Forward Trace — Distribution",
    timingResults: "⏱️ Timing & Results",
    signoff: "✍️ Sign-off",

    drillType: "Trigger Type",
    drillRef: "Reference (optional)",
    triggeredBy: "Triggered By (optional)",
    drillTypeScheduled: "Scheduled (Quarterly)",
    drillTypeAudit: "Audit-Triggered",
    drillTypeComplaint: "Complaint-Triggered",
    drillTypeRegulatory: "Regulatory Request",
    triggeredByPlaceholder: "auditor / customer / scheduled",
    drillName: "Drill Name",
    drillNameMockRecall: "🔄 Mock Recall",
    drillNameTraceability: "🧬 Traceability Drill",
    drillNameMockRecallShort: "Mock Recall",
    drillNameTraceabilityShort: "Traceability Drill",

    productName: "Product Name *",
    batchNo: "Batch / Lot No. *",
    branch: "Branch / Plant",
    productionDate: "Production Date",
    expiryDate: "Expiry Date",
    qtyProduced: "Quantity Produced",
    productTemp: "Product Temperature",

    rawMaterial: "Raw Material",
    supplier: "Supplier",
    supplierLot: "Supplier Lot",
    dateReceived: "Date Received",
    qtyUsed: "Qty Used",
    grnRef: "GRN / Invoice",
    addMaterial: "＋ Add Material",

    customer: "Customer / Branch",
    dateDispatched: "Date Dispatched",
    qtyShipped: "Qty Shipped",
    vehicle: "Vehicle",
    driver: "Driver",
    pod: "POD",
    addDistribution: "＋ Add Distribution",

    startTime: "Start Time",
    endTime: "End Time",
    qtyTraced: "Quantity Traced",
    qtyTracedPlaceholder: "out of {qty} {unit}",
    gaps: "Gaps / Findings",
    gapsPlaceholder: "Any gaps discovered during the trace...",
    correctiveActions: "Corrective Actions",
    correctiveActionsPlaceholder: "Corrective actions taken...",

    conductedBy: "Conducted By *",
    verifiedBy: "Verified By",
    conductedSig: "✍️ Conducted By Signature",
    verifiedSig: "✍️ Verified By Signature",

    save: "💾 Save Drill",
    saving: "⏳ Saving…",
    viewPast: "📋 View Past Drills",
    close: "Close",
    edit: "✏️ Edit",
    deleteAction: "🗑️ Delete",
    update: "💾 Save Changes",
    cancelEdit: "✖ Cancel Edit",
    editingMode: "✏️ Edit Mode — editing an existing drill",
    loadingDrill: "⏳ Loading drill...",
    drillNotFound: "❌ Drill not found.",
    confirmDelete: "Permanently delete this drill?",
    deleted: "✅ Deleted",
    deleteFailed: "❌ Delete failed",
    updated: "✅ Drill updated",

    saved: "✅ Drill saved",
    savedPass: "Result: PASS",
    savedFail: "Result: FAIL",
    saveFailed: "❌ Save failed",

    viewTitle: "🔄 Mock Recall — Traceability Drills",
    viewSubtitle: "Mock recall drills to verify traceability capability",
    refresh: "🔄 Refresh",
    refreshing: "⏳ Loading...",
    newDrill: "➕ New Drill",
    back: "← Back",

    totalDrills: "Total Drills",
    allYears: "All Years",
    successRate: "Pass Rate",
    avgDuration: "Avg Duration",
    avgTrace: "Avg Trace %",
    sinceLastDrill: "Since Last Drill",
    days: "days",

    allResults: "All Results",
    onlyPass: "✅ Pass Only",
    onlyFail: "❌ Fail Only",
    onlyPending: "⏳ Pending",
    drills: "drill(s)",

    pending: "PENDING",
    noResults: "🎯 No drills match the filters.",
    noResultsHint: "Press \"➕ New Drill\" to log the first one.",
    loading: "⏳ Loading...",

    linkedSourceTitle: "🔗 Linked Source Reports",
    openSource: "🔗 Open Source",
    qtyLabel: "Duration",
    traceLabel: "Trace",

    popupShipment: "📦 Shipment Receiving Report",
    popupLoading: "🚚 Vehicle Loading Report",
    popupFinished: "🏷️ Final Product Report",
    loadingSource: "⏳ Loading source report...",
    sourceMissing: "Source report no longer available (may be deleted).",
    savedAtDrill: "Data saved at drill time:",
    shipmentInfo: "📋 Shipment General Info",
    items: "📦 Items",
    signatures: "✍️ Signatures",
    dayInfo: "📋 Day Info",
    vehiclesOfDay: "🚚 Vehicles in Day's Report",
    productsOfDay: "🏷️ Products in Day's Report",
    selectedVehicle: "Selected vehicle",
    selectedProductLabel: "Selected product",
    highlighted: "— highlighted",
    noVehicles: "No vehicles in this report.",
    noProducts: "No products in this report.",

    notSelected: "—",
    yes: "Yes",
    no: "No",

    /* ===== 📎 Attachments ===== */
    attachments: "📎 Attachments & Photos",
    attachmentsHint: "Upload invoices, customer transfers, return invoices, or any supporting docs",
    addAttachment: "＋ Add Attachment",
    attachmentCategory: "Type",
    attachmentLabel: "Description (optional)",
    attachmentLabelPlaceholder: "e.g. Carrefour Invoice 2026-04-28",
    catInvoice: "🧾 Sales Invoice",
    catTransfer: "🚚 Transfer Note",
    catReturnInvoice: "↩️ Return Invoice",
    catGRN: "📦 GRN (Goods Receipt)",
    catPhoto: "📷 Product Photo",
    catOther: "📄 Other",
    chooseFile: "Choose file",
    chooseFiles: "Choose files (multiple)",
    dragDropHint: "or drag images here",
    imagesOnly: "Images only (JPG/PNG/WEBP)",
    compressing: "⏳ Compressing image...",
    fileTooLarge: "❌ File too large (over 10MB)",
    invalidFileType: "❌ Unsupported file type (images only)",
    deleteAttachment: "Delete this attachment?",
    noAttachments: "No attachments",
    attachmentsCount: "attachment(s)",
    download: "⬇️ Download",
    fullSize: "🔍 View Full Size",

    /* ===== ⚙️ Settings ===== */
    settings: "⚙️ Settings",
    settingsTitle: "⚙️ Mock Recall Settings",
    settingsSubtitle: "Set pass thresholds per company policy or auditor requirements",
    minTracePct: "Minimum Trace Recovery (%)",
    maxDurationMin: "Maximum Duration (minutes)",
    minTracePctHint: "Trace % required to pass (e.g. 99%)",
    maxDurationMinHint: "Maximum allowed drill time (240 = 4 hours)",
    saveSettings: "💾 Save Settings",
    settingsSaved: "✅ Settings saved on server — applies to everyone",
    settingsSaveFailed: "❌ Failed to save settings",
    resetDefaults: "↺ Restore Defaults (99% / 4h)",
    notesAboutStandards: "Note: ISO/HACCP do not mandate exact numbers — thresholds are set by company policy & auditor agreement.",

    /* ===== 🆕 Coolers / Branch Temp / Truck Cleaning ===== */
    coolersTitle: "Coolers Temp (QCS)",
    coolersHint: "Pick a coolers log day",
    branchTempTitle: "Branch Temperature",
    branchTempHint: "Production branch temperature log",
    truckCleaningTitle: "Truck Cleaning",
    truckCleaningHint: "Same vehicle as loading",
    pickBranchFirst: "⚠️ Select product branch first",
    pickLoadingFirst: "⚠️ Link a loading report first (to know vehicle no.)",
    branchTempUnsupported: "This branch has no separate temperature log",
    popupCoolers: "🧊 Coolers Temperature Log",
    popupBranchTemp: "🌡️ Branch Temperature Log",
    popupTruckCleaning: "🧼 Truck Cleaning Report",
    coolerName: "Cooler Name",
    minTemp: "Min Temp",
    maxTemp: "Max Temp",
    actualTemp: "Actual Temp",
    truckNo: "Truck No.",
    cleaningStatus: "Status",

    dir: "ltr",
    switchToEn: "🇬🇧 EN",
    switchToAr: "🇸🇦 AR",
  },
};

/* ===== خريطة الفرع → نوع تقرير الحرارة ===== */
// ملاحظة: Al Qusais و Production يستخدمان qcs-coolers لأن البرّادات هي سجل حرارتهم
// ملاحظة: POS 19 يستخدم pos19_temperature_monitoring (تسمية مختلفة عن POS 10/11/15)
export const BRANCH_TEMP_TYPE_MAP = {
  "Al Qusais (QCS)": "qcs-coolers",
  "Production": "qcs-coolers",
  "POS 10 — Abu Dhabi Butchery": "pos10_temperature",
  "POS 11 — Al Ain Butchery": "pos11_temperature",
  "POS 15 — Al Barsha Butchery": "pos15_temperature",
  "POS 19 — Al Warqa Kitchen (مطبخ الورقاء)": "pos19_temperature_monitoring",
  "FTR 1 — Mushrif Park": "ftr1_temperature",
  "FTR 2 — Mamzar Park": "ftr2_temperature",
};

// قائمة كل أنواع تقارير الحرارة في النظام (تشمل QCS Coolers)
export const ALL_TEMP_TYPES = [
  "qcs-coolers",
  "pos10_temperature",
  "pos11_temperature",
  "pos15_temperature",
  "pos19_temperature_monitoring",
  "ftr1_temperature",
  "ftr2_temperature",
];

// 🆕 أنواع تقارير حرارة الفروع فقط — بدون QCS Coolers
// تُستخدم في Branch Temperature lookup (لأن Coolers Temp له بطاقة مستقلة)
export const BRANCH_ONLY_TEMP_TYPES = [
  "pos10_temperature",
  "pos11_temperature",
  "pos15_temperature",
  "pos19_temperature_monitoring",
  "ftr1_temperature",
  "ftr2_temperature",
];

// خريطة عكسية: type → اسم الفرع للعرض
export const TYPE_TO_BRANCH_LABEL = {
  "qcs-coolers": "QCS / Production",
  "pos10_temperature": "POS 10",
  "pos11_temperature": "POS 11",
  "pos15_temperature": "POS 15",
  "pos19_temperature_monitoring": "POS 19 (Al Warqa)",
  "ftr1_temperature": "FTR 1",
  "ftr2_temperature": "FTR 2",
};

export function branchTempTypeFor(branch) {
  return BRANCH_TEMP_TYPE_MAP[branch] || null;
}

export function branchLabelForType(type) {
  return TYPE_TO_BRANCH_LABEL[type] || type;
}

/* ===== مساعد: عنوان التمرين الكامل حسب التسمية المختارة ===== */
export function getDrillFullTitle(drillName, lang) {
  if (drillName === "traceability") {
    return lang === "ar" ? "🧬 تمرين تتبّع" : "🧬 Traceability Drill";
  }
  return lang === "ar" ? "🔄 سحب وهمي" : "🔄 Mock Recall";
}

export function getDrillShortLabel(drillName, lang) {
  if (drillName === "traceability") {
    return lang === "ar" ? "تمرين تتبّع" : "Traceability Drill";
  }
  return lang === "ar" ? "سحب وهمي" : "Mock Recall";
}

/* ===== مساعدة: استخراج مصفوفة الصفوف بغض النظر عن اسم الحقل ===== */
// كل صفحة تستخدم اسم مختلف: rows / entries / coolers / products / vehicles ...
export function pickRowsArray(payload) {
  if (!payload) return [];
  const candidates = [
    payload.rows,
    payload.entries,
    payload.coolers,
    payload.products,
    payload.vehicles,
    payload.items,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

/* ===== Hook ===== */
export function useLang() {
  const [lang, setLang] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "en" || v === "ar" ? v : "ar";
    } catch {
      return "ar";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  function t(key, vars) {
    const dict = STRINGS[lang] || STRINGS.ar;
    let str = dict[key];
    if (str === undefined) str = STRINGS.ar[key] ?? key;
    if (vars && typeof str === "string") {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? ""));
      }
    }
    return str;
  }

  function toggle() { setLang((l) => (l === "ar" ? "en" : "ar")); }

  return {
    lang,
    setLang,
    toggle,
    t,
    isRTL: lang === "ar",
    dir: lang === "ar" ? "rtl" : "ltr",
  };
}

/* ===== زر تبديل اللغة ===== */
export function LangToggle({ lang, toggle, style }) {
  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        background: "rgba(255,255,255,0.95)",
        color: "#0b1f4d",
        border: "1.5px solid #e2e8f0",
        padding: "7px 14px",
        borderRadius: 999,
        cursor: "pointer",
        fontWeight: 800,
        fontSize: "0.9rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        ...style,
      }}
      title={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {lang === "ar" ? "🇬🇧 EN" : "🇸🇦 AR"}
    </button>
  );
}
