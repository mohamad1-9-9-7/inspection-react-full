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
    requireVerifier: "⚠️ اسم المتحقق (Verifier) إلزامي — مبدأ HACCP رقم 6",
    verifierSameAsMonitor: "⚠️ المتحقق لا يمكن أن يكون نفس المراقب — يجب الاستقلالية بين المراقبة والتحقق (HACCP Principle 6)",
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
    requireVerifier: "⚠️ Verifier name is required — HACCP Principle 6",
    verifierSameAsMonitor: "⚠️ Verifier cannot be the same as the Monitor — independence is required between monitoring and verification (HACCP Principle 6)",
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

/* ===== Default CCPs — synchronized with FSMS Manual HACCP Plan =====
   The FSMS Manual (fsmsHaccp.js → FSMS_HACCP_PLAN) defines 4 logical CCPs:
     • CCP1 — Receiving (Chilled/Frozen Meat)
     • CCP2 — Cold Storage (Chilled/Frozen)
     • CCP3 — Display Chiller (Retail/Service Counter)
     • CCP4 — Delivery / Transport
   Each CCP that handles BOTH chilled and frozen products is split into two
   catalog entries (chilled / frozen) so that each reading is evaluated against
   the correct critical limit, while the CCP number stays consistent with the
   manual. Cooking / Cooling / Hot-Holding are NOT in scope (kitchen excluded
   from FSMS — see Manual §4.4 Exclusions).                                    */
export const DEFAULT_CCPS = [
  /* ─────────── CCP1 — Receiving ─────────── */
  {
    id: "ccp1_receiving_chilled",
    nameEn: "CCP1 — Receiving (Chilled Meat)",
    nameAr: "CCP1 — الاستلام (لحم مبرّد)",
    hazardEn: "Pathogen growth; cross-contamination; non-Halal source; foreign matter",
    hazardAr: "نمو الكائنات المُمرضة؛ التلوث المتبادل؛ مصدر غير حلال؛ مادة غريبة",
    criticalLimit: { type: "max", min: null, max: 5, unit: "°C", descEn: "≤ 5°C", descAr: "≤ 5°C" },
    monitoringMethodEn: "Calibrated probe; visual check; checklist vs PO/COA/Halal",
    monitoringMethodAr: "مسبار مُعاير؛ فحص بصري؛ قائمة فحص مقابل PO/COA/الحلال",
    frequencyEn: "Each receipt, per lot",
    frequencyAr: "كل استلام، لكل دفعة",
    defaultActionEn: "Reject/segregate; rapid chill if safe; hold for QA; notify supplier",
    defaultActionAr: "رفض/فصل؛ تبريد سريع إذا آمن؛ احتجاز للـ QA؛ إبلاغ المورد",
  },
  {
    id: "ccp1_receiving_frozen",
    nameEn: "CCP1 — Receiving (Frozen Meat)",
    nameAr: "CCP1 — الاستلام (لحم مجمّد)",
    hazardEn: "Pathogen survival; cross-contamination; non-Halal source",
    hazardAr: "بقاء الكائنات المُمرضة؛ التلوث المتبادل؛ مصدر غير حلال",
    criticalLimit: { type: "max", min: null, max: -18, unit: "°C", descEn: "≤ -18°C", descAr: "≤ -18°C" },
    monitoringMethodEn: "Calibrated probe; visual check; checklist vs PO/COA/Halal",
    monitoringMethodAr: "مسبار مُعاير؛ فحص بصري؛ قائمة فحص مقابل PO/COA/الحلال",
    frequencyEn: "Each receipt, per lot",
    frequencyAr: "كل استلام، لكل دفعة",
    defaultActionEn: "Reject/segregate; hold for QA; notify supplier",
    defaultActionAr: "رفض/فصل؛ احتجاز للـ QA؛ إبلاغ المورد",
  },
  /* ─────────── CCP2 — Cold Storage ─────────── */
  {
    id: "ccp2_cold_storage_chilled",
    nameEn: "CCP2 — Cold Storage (Chiller)",
    nameAr: "CCP2 — التخزين البارد (برّاد)",
    hazardEn: "Pathogen growth; temperature abuse; cross-contamination",
    hazardAr: "نمو الكائنات المُمرضة؛ إساءة استخدام الحرارة؛ التلوث المتبادل",
    criticalLimit: { type: "range", min: 0, max: 5, unit: "°C", descEn: "0–5°C", descAr: "0 إلى 5°C" },
    monitoringMethodEn: "Display reading + manual probe; door discipline check",
    monitoringMethodAr: "قراءة العرض + مسبار يدوي؛ فحص الانضباط بالباب",
    frequencyEn: "At least twice daily",
    frequencyAr: "مرتين على الأقل يومياً",
    defaultActionEn: "Restore setpoint; move to backup room; assess exposure; hold or dispose if unsafe",
    defaultActionAr: "إعادة تعيين الإعداد؛ نقل إلى غرفة احتياطية؛ تقييم التعرّض؛ احتجاز أو إتلاف إذا غير آمن",
  },
  {
    id: "ccp2_cold_storage_frozen",
    nameEn: "CCP2 — Cold Storage (Freezer)",
    nameAr: "CCP2 — التخزين البارد (فريزر)",
    hazardEn: "Insufficient freezing → bacterial survival",
    hazardAr: "تجميد غير كافٍ → بقاء البكتيريا حية",
    criticalLimit: { type: "max", min: null, max: -18, unit: "°C", descEn: "≤ -18°C", descAr: "≤ -18°C" },
    monitoringMethodEn: "Display reading + manual probe; door discipline check",
    monitoringMethodAr: "قراءة العرض + مسبار يدوي؛ فحص الانضباط بالباب",
    frequencyEn: "At least twice daily",
    frequencyAr: "مرتين على الأقل يومياً",
    defaultActionEn: "Restore setpoint; move to backup freezer; assess product safety",
    defaultActionAr: "إعادة تعيين الإعداد؛ نقل إلى فريزر احتياطي؛ تقييم سلامة المنتج",
  },
  /* ─────────── CCP3 — Display Chiller (Retail) ─────────── */
  {
    id: "ccp3_display_chiller",
    nameEn: "CCP3 — Display Chiller (Retail Counter)",
    nameAr: "CCP3 — ثلاجة العرض (منفذ التجزئة)",
    hazardEn: "Temperature abuse; cross-contamination; expired items",
    hazardAr: "إساءة استخدام الحرارة؛ التلوث المتبادل؛ أصناف منتهية",
    criticalLimit: { type: "max", min: null, max: 5, unit: "°C", descEn: "Display air ≤5°C (product ≤7°C)", descAr: "هواء العرض ≤5°م (المنتج ≤7°م)" },
    monitoringMethodEn: "Display thermometer + spot probe; visual checks; rotation sheet",
    monitoringMethodAr: "ميزان حرارة العرض + مسبار فحص؛ فحوص بصرية؛ ورقة التدوير",
    frequencyEn: "Hourly temperature; rotation per shift",
    frequencyAr: "حرارة كل ساعة؛ تدوير لكل وردية",
    defaultActionEn: "Adjust/repair unit; move product to backup chiller; discard out-of-temp; correct label/price; clean & sanitize",
    defaultActionAr: "ضبط/إصلاح الوحدة؛ نقل المنتج إلى ثلاجة احتياطية؛ إتلاف ما خرج عن الحرارة؛ تصحيح الملصق/السعر؛ تنظيف وتعقيم",
  },
  /* ─────────── CCP4 — Delivery / Transport ─────────── */
  {
    id: "ccp4_transport_chilled",
    nameEn: "CCP4 — Delivery / Transport (Chilled)",
    nameAr: "CCP4 — التوصيل / النقل (مبرّد)",
    hazardEn: "Temperature abuse; vehicle contamination; tampering; Halal integrity loss",
    hazardAr: "إساءة استخدام الحرارة؛ تلوث المركبة؛ العبث؛ فقدان سلامة الحلال",
    criticalLimit: { type: "max", min: null, max: 5, unit: "°C", descEn: "≤ 5°C during transport", descAr: "≤ 5°C أثناء النقل" },
    monitoringMethodEn: "Data logger or display reading + spot probe; visual check of cleanliness/seals; POD",
    monitoringMethodAr: "مُسجّل بيانات أو قراءة العرض + مسبار فحص؛ فحص بصري للنظافة/الأختام؛ إثبات تسليم",
    frequencyEn: "Each delivery drop",
    frequencyAr: "كل توصيل",
    defaultActionEn: "Return or quarantine affected goods; add ice/cold packs; replace vehicle; report incident; CAPA for route/time",
    defaultActionAr: "إرجاع أو احتجاز البضائع المتأثرة؛ إضافة ثلج/برودة؛ استبدال المركبة؛ تقرير حادث؛ CAPA للمسار/الوقت",
  },
  {
    id: "ccp4_transport_frozen",
    nameEn: "CCP4 — Delivery / Transport (Frozen)",
    nameAr: "CCP4 — التوصيل / النقل (مجمّد)",
    hazardEn: "Temperature abuse; vehicle contamination; partial thawing; Halal integrity loss",
    hazardAr: "إساءة استخدام الحرارة؛ تلوث المركبة؛ ذوبان جزئي؛ فقدان سلامة الحلال",
    criticalLimit: { type: "max", min: null, max: -18, unit: "°C", descEn: "≤ -18°C during transport", descAr: "≤ -18°C أثناء النقل" },
    monitoringMethodEn: "Data logger or display reading + spot probe; visual check of cleanliness/seals; POD",
    monitoringMethodAr: "مُسجّل بيانات أو قراءة العرض + مسبار فحص؛ فحص بصري للنظافة/الأختام؛ إثبات تسليم",
    frequencyEn: "Each delivery drop",
    frequencyAr: "كل توصيل",
    defaultActionEn: "Return or quarantine affected goods; replace vehicle; report incident; CAPA for route/time",
    defaultActionAr: "إرجاع أو احتجاز البضائع المتأثرة؛ استبدال المركبة؛ تقرير حادث؛ CAPA للمسار/الوقت",
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
