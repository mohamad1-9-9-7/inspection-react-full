// src/pages/haccp and iso/CCPMonitoring/i18n.js
// قاموس ثنائي اللغة لـ CCP Monitoring + قائمة CCPs الافتراضية

import { useEffect, useState } from "react";

const STORAGE_KEY = "ccp_lang_v1";

export const STRINGS = {
  ar: {
    /* ===== Headers ===== */
    docTitle: "سجل مراقبة نقاط التحكم الحرجة",
    docNo: "رقم الوثيقة",
    issueDate: "تاريخ الإصدار",
    revisionNo: "رقم المراجعة",
    brandStrip: "🎯 CCP — مراقبة نقاط التحكم الحرجة",

    /* ===== Sections ===== */
    ccpInfo: "🎯 معلومات نقطة التحكم",
    productInfo: "📦 معلومات المنتج / الدفعة",
    reading: "📊 القراءة",
    deviation: "⚠️ الانحراف والإجراء التصحيحي",
    signoff: "✍️ التوقيع",
    attachments: "📎 المرفقات",

    /* ===== CCP Info Fields ===== */
    selectCCP: "اختر نقطة التحكم *",
    selectCCPHint: "اختر من القائمة المعرّفة في الإعدادات",
    ccpHazard: "الخطر",
    criticalLimit: "الحد الحرج",
    monitoringMethod: "طريقة المراقبة",
    frequency: "التكرار",
    reportDate: "تاريخ التقرير",
    timeRecorded: "وقت القراءة",

    /* ===== Product ===== */
    productName: "اسم المنتج / الدفعة",
    batchNo: "رقم الدفعة",
    branch: "الفرع / المصنع",

    /* ===== Reading ===== */
    readingValue: "القراءة الفعلية *",
    unit: "الوحدة",
    withinLimit: "✅ ضمن الحد المسموح",
    outOfLimit: "🔴 خارج الحد — مطلوب إجراء تصحيحي",
    notEvaluated: "⏳ لم تُقيَّم بعد",

    /* ===== Deviation ===== */
    correctiveAction: "الإجراء التصحيحي *",
    correctiveActionPlaceholder: "مثلاً: أُعيد الطبخ لمدة 5 دقائق إضافية...",
    productStatus: "حالة المنتج",
    statusCorrected: "✅ تم تصحيحه",
    statusQuarantined: "🚧 معزول",
    statusDiscarded: "🗑️ متلف",
    statusReleased: "🚚 أُفرج عنه",
    finalReading: "القراءة بعد التصحيح",

    /* ===== Sign-off ===== */
    monitoredBy: "نفّذ المراقبة *",
    verifiedBy: "تحقّق منها",
    monitorSig: "✍️ توقيع المراقب",
    verifierSig: "✍️ توقيع المُحقّق",

    /* ===== Buttons ===== */
    save: "💾 حفظ السجل",
    update: "💾 حفظ التعديلات",
    saving: "⏳ جاري الحفظ…",
    viewPast: "📋 عرض السجلات السابقة",
    settings: "⚙️ الإعدادات",
    cancel: "✖ إلغاء",
    edit: "✏️ تعديل",
    deleteAction: "🗑️ حذف",
    close: "إغلاق",

    /* ===== Modal ===== */
    saved: "✅ تم حفظ السجل",
    updated: "✅ تم تحديث السجل",
    saveFailed: "❌ فشل الحفظ",
    confirmDelete: "هل تريد حذف هذا السجل نهائياً؟",
    deleted: "✅ تم الحذف",
    requireCorrective: "⚠️ القراءة خارج الحد — الإجراء التصحيحي إلزامي",
    requireMonitor: "⚠️ اسم المراقب إلزامي",
    requireCCP: "⚠️ اختر نقطة التحكم",
    requireReading: "⚠️ القراءة الفعلية مطلوبة",
    editingMode: "✏️ وضع التعديل — تعدّل سجلاً محفوظاً",
    drillNotFound: "❌ السجل المطلوب غير موجود",
    loadingExisting: "⏳ جارٍ تحميل السجل...",

    /* ===== View ===== */
    viewTitle: "🎯 سجلات مراقبة CCP",
    viewSubtitle: "نقاط التحكم الحرجة + الانحرافات + الإجراءات التصحيحية",
    refresh: "🔄 تحديث",
    refreshing: "⏳ جارٍ التحميل...",
    newRecord: "➕ سجل جديد",
    back: "← رجوع",

    /* ===== KPI ===== */
    totalRecords: "إجمالي السجلات",
    complianceRate: "نسبة الالتزام",
    deviations: "الانحرافات",
    deviationsThisMonth: "انحرافات الشهر",
    avgCorrectionTime: "متوسط زمن التصحيح",
    pendingActions: "إجراءات معلّقة",

    /* ===== Filters ===== */
    allCCPs: "كل CCPs",
    allYears: "كل السنوات",
    allStatus: "كل الحالات",
    onlyDeviations: "🔴 الانحرافات فقط",
    onlyCompliant: "✅ الملتزم فقط",
    records: "سجل",

    /* ===== List ===== */
    noResults: "🎯 لا توجد سجلات مطابقة",
    noResultsHint: "اضغط '➕ سجل جديد' لتسجيل أول قراءة",
    pending: "PENDING",
    compliant: "COMPLIANT",
    deviation_: "DEVIATION",

    /* ===== Settings ===== */
    settingsTitle: "⚙️ إعدادات CCP — قائمة نقاط التحكم",
    settingsSubtitle: "عرّف نقاط التحكم الحرجة في عمليتك (الحد، الطريقة، التكرار، الإجراء)",
    addCCP: "＋ إضافة CCP",
    ccpName: "الاسم (إنكليزي)",
    ccpNameAr: "الاسم (عربي)",
    ccpHazardEn: "الخطر (إنكليزي)",
    ccpHazardAr: "الخطر (عربي)",
    limitType: "نوع الحد",
    limitMax: "حد أقصى (≤)",
    limitMin: "حد أدنى (≥)",
    limitRange: "نطاق (بين)",
    monitorMethod: "طريقة المراقبة",
    defaultAction: "الإجراء التصحيحي الافتراضي",
    minValue: "أقل قيمة",
    maxValue: "أعلى قيمة",
    saveCatalog: "💾 حفظ القائمة",
    catalogSaved: "✅ تم حفظ القائمة على السيرفر",
    deleteCCPConfirm: "حذف هذه النقطة من القائمة؟",
    resetToDefaults: "↺ استعادة CCPs الافتراضية",

    /* ===== Common ===== */
    notSelected: "—",
    dir: "rtl",
  },

  en: {
    docTitle: "Critical Control Points Monitoring Log",
    docNo: "Document No",
    issueDate: "Issue Date",
    revisionNo: "Revision No",
    brandStrip: "🎯 CCP — Critical Control Point Monitoring",

    ccpInfo: "🎯 CCP Information",
    productInfo: "📦 Product / Batch",
    reading: "📊 Reading",
    deviation: "⚠️ Deviation & Corrective Action",
    signoff: "✍️ Sign-off",
    attachments: "📎 Attachments",

    selectCCP: "Select CCP *",
    selectCCPHint: "Choose from the list defined in Settings",
    ccpHazard: "Hazard",
    criticalLimit: "Critical Limit",
    monitoringMethod: "Monitoring Method",
    frequency: "Frequency",
    reportDate: "Report Date",
    timeRecorded: "Time Recorded",

    productName: "Product / Batch Name",
    batchNo: "Batch / Lot No.",
    branch: "Branch / Plant",

    readingValue: "Actual Reading *",
    unit: "Unit",
    withinLimit: "✅ Within limit",
    outOfLimit: "🔴 Out of limit — Corrective action required",
    notEvaluated: "⏳ Not evaluated yet",

    correctiveAction: "Corrective Action *",
    correctiveActionPlaceholder: "e.g. Re-cooked for additional 5 minutes...",
    productStatus: "Product Status",
    statusCorrected: "✅ Corrected",
    statusQuarantined: "🚧 Quarantined",
    statusDiscarded: "🗑️ Discarded",
    statusReleased: "🚚 Released",
    finalReading: "Reading After Correction",

    monitoredBy: "Monitored By *",
    verifiedBy: "Verified By",
    monitorSig: "✍️ Monitor Signature",
    verifierSig: "✍️ Verifier Signature",

    save: "💾 Save Record",
    update: "💾 Save Changes",
    saving: "⏳ Saving…",
    viewPast: "📋 View Past Records",
    settings: "⚙️ Settings",
    cancel: "✖ Cancel",
    edit: "✏️ Edit",
    deleteAction: "🗑️ Delete",
    close: "Close",

    saved: "✅ Record saved",
    updated: "✅ Record updated",
    saveFailed: "❌ Save failed",
    confirmDelete: "Permanently delete this record?",
    deleted: "✅ Deleted",
    requireCorrective: "⚠️ Reading is out of limit — corrective action is required",
    requireMonitor: "⚠️ Monitor name is required",
    requireCCP: "⚠️ Select a CCP",
    requireReading: "⚠️ Actual reading is required",
    editingMode: "✏️ Edit mode — editing existing record",
    drillNotFound: "❌ Record not found",
    loadingExisting: "⏳ Loading record...",

    viewTitle: "🎯 CCP Monitoring Records",
    viewSubtitle: "Critical control points + deviations + corrective actions",
    refresh: "🔄 Refresh",
    refreshing: "⏳ Loading...",
    newRecord: "➕ New Record",
    back: "← Back",

    totalRecords: "Total Records",
    complianceRate: "Compliance Rate",
    deviations: "Deviations",
    deviationsThisMonth: "Deviations (this month)",
    avgCorrectionTime: "Avg Correction Time",
    pendingActions: "Pending Actions",

    allCCPs: "All CCPs",
    allYears: "All Years",
    allStatus: "All Status",
    onlyDeviations: "🔴 Deviations only",
    onlyCompliant: "✅ Compliant only",
    records: "record(s)",

    noResults: "🎯 No matching records",
    noResultsHint: "Press '➕ New Record' to log first reading",
    pending: "PENDING",
    compliant: "COMPLIANT",
    deviation_: "DEVIATION",

    settingsTitle: "⚙️ CCP Settings — Catalog",
    settingsSubtitle: "Define critical control points (limit, method, frequency, action)",
    addCCP: "＋ Add CCP",
    ccpName: "Name (English)",
    ccpNameAr: "Name (Arabic)",
    ccpHazardEn: "Hazard (English)",
    ccpHazardAr: "Hazard (Arabic)",
    limitType: "Limit Type",
    limitMax: "Maximum (≤)",
    limitMin: "Minimum (≥)",
    limitRange: "Range (between)",
    monitorMethod: "Monitoring Method",
    defaultAction: "Default Corrective Action",
    minValue: "Min value",
    maxValue: "Max value",
    saveCatalog: "💾 Save Catalog",
    catalogSaved: "✅ Catalog saved on server",
    deleteCCPConfirm: "Delete this CCP from catalog?",
    resetToDefaults: "↺ Reset to default CCPs",

    notSelected: "—",
    dir: "ltr",
  },
};

/* ===== Default CCPs (للقطاع الغذائي / لحوم) ===== */
export const DEFAULT_CCPS = [
  {
    id: "raw_receiving",
    nameEn: "Raw Meat Receiving",
    nameAr: "استلام اللحم الخام",
    hazardEn: "Pathogen growth (bacteria multiplication)",
    hazardAr: "نمو الميكروبات الممرضة",
    criticalLimit: { type: "max", min: null, max: 4, unit: "°C", descEn: "≤ 4°C", descAr: "≤ 4°C" },
    monitoringMethodEn: "Calibrated probe thermometer at delivery",
    monitoringMethodAr: "ميزان حرارة معاير عند الاستلام",
    frequencyEn: "Each delivery",
    frequencyAr: "كل عملية استلام",
    defaultActionEn: "Reject delivery, document, notify supplier",
    defaultActionAr: "رفض الشحنة، توثيق، إبلاغ المورّد",
  },
  {
    id: "cold_storage",
    nameEn: "Cold Storage (Cooler)",
    nameAr: "تخزين بارد (برّاد)",
    hazardEn: "Bacterial growth in danger zone",
    hazardAr: "نمو البكتيريا في النطاق الخطر",
    criticalLimit: { type: "range", min: 0, max: 5, unit: "°C", descEn: "0–5°C", descAr: "0 إلى 5°C" },
    monitoringMethodEn: "Cooler thermometer / data logger",
    monitoringMethodAr: "ميزان البرّاد / مسجّل بيانات",
    frequencyEn: "Every 4 hours",
    frequencyAr: "كل 4 ساعات",
    defaultActionEn: "Adjust cooler, transfer products, isolate batch",
    defaultActionAr: "تعديل البرّاد، نقل المنتجات، عزل الدفعة",
  },
  {
    id: "frozen_storage",
    nameEn: "Frozen Storage",
    nameAr: "التخزين المجمّد",
    hazardEn: "Insufficient freezing → bacterial survival",
    hazardAr: "تجميد غير كافٍ → بقاء البكتيريا حية",
    criticalLimit: { type: "max", min: null, max: -18, unit: "°C", descEn: "≤ -18°C", descAr: "≤ -18°C" },
    monitoringMethodEn: "Freezer thermometer",
    monitoringMethodAr: "ميزان الفريزر",
    frequencyEn: "Every 6 hours",
    frequencyAr: "كل 6 ساعات",
    defaultActionEn: "Repair freezer, evaluate product safety",
    defaultActionAr: "إصلاح الفريزر، تقييم سلامة المنتج",
  },
  {
    id: "cooking",
    nameEn: "Cooking Temperature",
    nameAr: "حرارة الطبخ",
    hazardEn: "Salmonella, E.coli, Listeria",
    hazardAr: "السالمونيلا، E.coli، الليستيريا",
    criticalLimit: { type: "min", min: 75, max: null, unit: "°C", descEn: "≥ 75°C internal for ≥ 2 min", descAr: "≥ 75°C داخلية لمدة ≥ 2 دقيقة" },
    monitoringMethodEn: "Probe thermometer in product center",
    monitoringMethodAr: "ميزان داخل قلب المنتج",
    frequencyEn: "Each cooking batch",
    frequencyAr: "كل دفعة طبخ",
    defaultActionEn: "Continue cooking until limit reached, re-test",
    defaultActionAr: "متابعة الطبخ حتى الوصول للحد، إعادة الفحص",
  },
  {
    id: "cooling",
    nameEn: "Post-Cooking Cooling",
    nameAr: "التبريد بعد الطبخ",
    hazardEn: "Bacterial growth in danger zone (60→4°C)",
    hazardAr: "نمو البكتيريا في النطاق الخطر (60→4°C)",
    criticalLimit: { type: "max", min: null, max: 4, unit: "°C", descEn: "From 60°C to 4°C within 4h", descAr: "من 60°C إلى 4°C خلال 4 ساعات" },
    monitoringMethodEn: "Probe thermometer",
    monitoringMethodAr: "ميزان داخلي",
    frequencyEn: "Each cooked batch",
    frequencyAr: "كل دفعة مطبوخة",
    defaultActionEn: "Discard if cooled too slowly",
    defaultActionAr: "إتلاف إذا التبريد بطيء",
  },
  {
    id: "hot_holding",
    nameEn: "Hot Holding",
    nameAr: "الحفظ الساخن",
    hazardEn: "Bacterial growth at low temperatures",
    hazardAr: "نمو البكتيريا عند درجات حرارة منخفضة",
    criticalLimit: { type: "min", min: 63, max: null, unit: "°C", descEn: "≥ 63°C continuous", descAr: "≥ 63°C باستمرار" },
    monitoringMethodEn: "Hot holding unit thermometer",
    monitoringMethodAr: "ميزان وحدة الحفظ الساخن",
    frequencyEn: "Every 2 hours",
    frequencyAr: "كل ساعتين",
    defaultActionEn: "Reheat to ≥75°C or discard if held > 2h below limit",
    defaultActionAr: "إعادة تسخين لـ ≥75°C أو إتلاف لو حُفظ > 2 ساعة تحت الحد",
  },
];

/* ===== Hook اللغة ===== */
export function useLang() {
  const [lang, setLang] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "en" || v === "ar" ? v : "ar";
    } catch { return "ar"; }
  });
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, lang); } catch {} }, [lang]);
  function t(key, vars) {
    const dict = STRINGS[lang] || STRINGS.ar;
    let s = dict[key] ?? STRINGS.ar[key] ?? key;
    if (vars && typeof s === "string") {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v ?? ""));
      }
    }
    return s;
  }
  function toggle() { setLang((l) => (l === "ar" ? "en" : "ar")); }
  return { lang, setLang, toggle, t, isRTL: lang === "ar", dir: lang === "ar" ? "rtl" : "ltr" };
}

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
    >
      {lang === "ar" ? "🇬🇧 EN" : "🇸🇦 AR"}
    </button>
  );
}

/* ===== مساعدات الأسماء ===== */
export function ccpName(ccp, lang) {
  if (!ccp) return "";
  return lang === "ar" ? (ccp.nameAr || ccp.nameEn) : (ccp.nameEn || ccp.nameAr);
}
export function ccpHazard(ccp, lang) {
  if (!ccp) return "";
  return lang === "ar" ? (ccp.hazardAr || ccp.hazardEn) : (ccp.hazardEn || ccp.hazardAr);
}
export function ccpLimitDesc(ccp, lang) {
  const cl = ccp?.criticalLimit;
  if (!cl) return "";
  return lang === "ar" ? (cl.descAr || cl.descEn) : (cl.descEn || cl.descAr);
}
export function ccpMethod(ccp, lang) {
  if (!ccp) return "";
  return lang === "ar" ? (ccp.monitoringMethodAr || ccp.monitoringMethodEn) : (ccp.monitoringMethodEn || ccp.monitoringMethodAr);
}
export function ccpFrequency(ccp, lang) {
  if (!ccp) return "";
  return lang === "ar" ? (ccp.frequencyAr || ccp.frequencyEn) : (ccp.frequencyEn || ccp.frequencyAr);
}
export function ccpAction(ccp, lang) {
  if (!ccp) return "";
  return lang === "ar" ? (ccp.defaultActionAr || ccp.defaultActionEn) : (ccp.defaultActionEn || ccp.defaultActionAr);
}

/* ===== تقييم القراءة مقابل الحد ===== */
export function evaluateReading(value, criticalLimit) {
  if (!criticalLimit) return null;
  const n = Number(value);
  if (value === "" || value === null || value === undefined || isNaN(n)) return null;
  const { type, min, max } = criticalLimit;
  if (type === "max") return n <= max;
  if (type === "min") return n >= min;
  if (type === "range") return n >= min && n <= max;
  return null;
}
