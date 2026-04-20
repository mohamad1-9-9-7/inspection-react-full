// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierEvaluationResults.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SupplierApproval.css";

/* ===================== API base (NORMALIZED) ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
  s = s.replace(/\/api\/reports.*$/i, "");
  s = s.replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}

const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "supplier_self_assessment_form";

/* ===================== i18n ===================== */
const UI = {
  en: {
    title: "Submitted Supplier Results",
    sub: "Suppliers who opened the public link and submitted the self-assessment form.",
    back: "↩ Back to Hub",
    refresh: "↻ Refresh",
    refreshing: "Refreshing...",
    search: "Search",
    searchPh: "Search by supplier name / date / token...",
    total: "Total submitted",
    supplier: "Supplier",
    recordDate: "Record Date",
    submittedAt: "Submitted At",
    lastUpdate: "Last Update",
    yesNoNa: "YES / NO / N/A",
    action: "Action",
    view: "View Answers",
    del: "Delete",
    deleting: "Deleting...",
    none: "No submitted results yet.",
    loading: "Loading...",
    token: "Token",
    copy: "Copy",
    copied: "Copied ✅",
    copyFail: "Copy failed",
    detailsTitle: "Answers",
    close: "✖ Close",
    copyLink: "Copy Public Link",
    openLink: "Open Public Link",
    summary: "Summary",
    yes: "Yes",
    no: "No",
    na: "N/A",
    totalQ: "Total",
    supplierDetails: "Supplier Details (from PDF fields)",
    attachments: "Attachments",
    attachmentsGeneral: "General Attachments",
    attachmentsByField: "Attachments (by field)",
    noAttachments: "No attachments found for this submission.",
    preview: "Preview",
    qList: "YES/NO Questions (PDF order)",
    answer: "Answer",
    internalNotes: "Internal Notes",
    deleteConfirmTitle: "Delete this submitted result?",
    deleteWarn: "This cannot be undone.",
    deleted: "Deleted ✅",
    lang: "Language",
    enBtn: "EN",
    arBtn: "AR",
    modalDownload: "⬇ Download",
    modalClose: "✖ Close",
    modalNoUrl: "No file URL found.",
    modalUnsupported: "Preview is not supported for this file type inside the app.",
    modalDownloadFile: "⬇ Download File",
    type: "Type",
    ext: "Ext",
    supplierType: "Supplier Type",
    filterType: "Filter by Type",
    allTypes: "All Types",
    allergenDeclaration: "Allergens declared",
    serviceScope: "Service Scope",
  },
  ar: {
    title: "نتائج تقييم الموردين (المرسلة)",
    sub: "الموردون الذين فتحوا الرابط العام وأرسلوا نموذج التقييم الذاتي.",
    back: "↩ رجوع للصفحة الرئيسية",
    refresh: "↻ تحديث",
    refreshing: "جاري التحديث...",
    search: "بحث",
    searchPh: "ابحث باسم المورد / التاريخ / التوكن...",
    total: "إجمالي المرسَل",
    supplier: "المورد",
    recordDate: "تاريخ السجل",
    submittedAt: "تاريخ الإرسال",
    lastUpdate: "آخر تعديل",
    yesNoNa: "نعم / لا / غير متاح",
    action: "إجراء",
    view: "عرض الإجابات",
    del: "حذف",
    deleting: "جاري الحذف...",
    none: "لا توجد نتائج مرسلة بعد.",
    loading: "جاري التحميل...",
    token: "التوكن",
    copy: "نسخ",
    copied: "تم النسخ ✅",
    copyFail: "فشل النسخ",
    detailsTitle: "الإجابات",
    close: "✖ إغلاق",
    copyLink: "نسخ الرابط العام",
    openLink: "فتح الرابط العام",
    summary: "الملخص",
    yes: "نعم",
    no: "لا",
    na: "غير متاح",
    totalQ: "الإجمالي",
    supplierDetails: "بيانات المورد (من خانات النموذج)",
    attachments: "المرفقات",
    attachmentsGeneral: "مرفقات عامة",
    attachmentsByField: "مرفقات حسب الحقل",
    noAttachments: "لا يوجد مرفقات لهذه النتيجة.",
    preview: "معاينة",
    qList: "أسئلة نعم/لا (حسب ترتيب الـPDF)",
    answer: "الإجابة",
    internalNotes: "ملاحظات داخلية",
    deleteConfirmTitle: "هل تريد حذف هذه النتيجة المرسلة؟",
    deleteWarn: "لا يمكن التراجع عن هذا الإجراء.",
    deleted: "تم الحذف ✅",
    lang: "اللغة",
    enBtn: "EN",
    arBtn: "AR",
    modalDownload: "⬇ تنزيل",
    modalClose: "✖ إغلاق",
    modalNoUrl: "لم يتم العثور على رابط الملف.",
    modalUnsupported: "المعاينة غير مدعومة لهذا النوع داخل النظام.",
    modalDownloadFile: "⬇ تنزيل الملف",
    type: "النوع",
    ext: "الامتداد",
    supplierType: "نوع المورد",
    filterType: "تصفية حسب النوع",
    allTypes: "جميع الأنواع",
    allergenDeclaration: "مسببات الحساسية المصرَّح بها",
    serviceScope: "نطاق الخدمة",
  },
};

/* ===================== Supplier Type Labels ===================== */
const SUPPLIER_TYPE_LABELS = {
  food: { en: "Food / Raw Materials", ar: "مواد غذائية / مواد خام" },
  cleaning_chemicals: { en: "Cleaning Materials / Chemicals", ar: "مواد تنظيف / كيماويات" },
  packaging: { en: "Packaging Materials", ar: "مواد تعبئة وتغليف" },
  services: { en: "Services (Pest Control / Calibration / Transport / Waste)", ar: "خدمات (مكافحة آفات / معايرة / نقل / نفايات)" },
  other: { en: "Other / Equipment / Uniforms", ar: "أخرى / معدات / ملابس" },
};

function getSupplierType(payload) {
  const p = payload || {};
  return String(
    p?.public?.supplierType ||
      p?.meta?.supplierType ||
      p?.supplierType ||
      p?.fields?.supplier_type ||
      p?.public?.submission?.fields?.supplier_type ||
      ""
  ).toLowerCase();
}

function getSupplierTypeLabel(type, lang) {
  const norm = String(type || "").toLowerCase();
  const m = SUPPLIER_TYPE_LABELS[norm];
  if (!m) return lang === "ar" ? "—" : "—";
  return lang === "ar" ? m.ar : m.en;
}

function getSupplierTypeBadgeColor(type) {
  switch (String(type || "").toLowerCase()) {
    case "food":
      return { bg: "rgba(34,197,94,0.12)", fg: "#14532d", border: "rgba(34,197,94,0.35)" };
    case "cleaning_chemicals":
      return { bg: "rgba(14,165,233,0.12)", fg: "#0c4a6e", border: "rgba(14,165,233,0.35)" };
    case "packaging":
      return { bg: "rgba(168,85,247,0.12)", fg: "#581c87", border: "rgba(168,85,247,0.35)" };
    case "services":
      return { bg: "rgba(249,115,22,0.12)", fg: "#7c2d12", border: "rgba(249,115,22,0.35)" };
    case "other":
      return { bg: "rgba(148,163,184,0.14)", fg: "#334155", border: "rgba(148,163,184,0.35)" };
    default:
      return { bg: "rgba(148,163,184,0.10)", fg: "#64748b", border: "rgba(148,163,184,0.25)" };
  }
}

const AR_QUESTIONS = {
  ph_01: "هل لديكم معايير موثّقة للنظافة الشخصية وإجراءات متابعة/مراقبة؟",
  ph_02: "هل جميع العاملين في تداول الغذاء لديهم بطاقات صحية سارية؟",
  ph_03: "هل توجد إجراءات للإبلاغ عن المرض؟",
  ph_04: "هل يوجد للموظفين غرفة تبديل ودورات مياه منفصلة وبعيدة عن منطقة تداول الغذاء؟",

  fbc_01: "هل توجد سياسة للتحكم بالزجاج واستبعاد الزجاج من مناطق الإنتاج؟",
  fbc_02: "هل توجد إجراءات لكسر الزجاج/المواد الهشة؟",
  fbc_03: "هل توجد سياسة للتحكم بالخشب واستبعاد الخشب من مناطق الإنتاج؟",
  fbc_04: "هل توجد سياسة للتحكم بالمعادن واستبعاد الملوثات المعدنية المحتملة من مناطق الإنتاج؟",
  fbc_05: "هل توجد سياسة للتحكم بالسكاكين ومنع السكاكين غير المصرح بها في منطقة الإنتاج؟",

  cln_01: "هل لديكم جداول تنظيف موثّقة تشمل التكرار والمواد الكيميائية وخطوات العمل والمعيار المطلوب؟",
  cln_02: "هل تراقبون معايير/نتائج التنظيف؟",
  cln_03: "هل توجد منطقة منفصلة بعيداً عن تحضير/تخزين الغذاء لتخزين مواد ومعدات التنظيف؟",
  cln_04: "هل تستخدمون مواد تعقيم مخصصة لتعقيم/تطهير جميع الأسطح الملامسة للغذاء؟",
  cln_05: "هل لديكم نظام فعّال للتخلص من النفايات؟",

  pst_01: "هل لديكم عقد مع شركة مكافحة آفات معتمدة؟",
  pst_02: "هل يتم تخزين المواد الخام ومواد التعبئة والمنتجات النهائية بطريقة تقلل خطر الإصابة بالآفات؟",
  pst_03: "هل جميع المباني محكمة لمنع دخول الآفات؟",
  pst_04: "هل يوجد سجل/جرد كامل للمبيدات يوضح المواقع والاستخدام الآمن وتطبيق الطعوم ومواد مثل الرش أو التبخير؟",
  pst_05: "هل توجد وسائل للتحكم بالحشرات الطائرة؟",

  fsq_01: "هل لديكم سياسة وأهداف موثّقة للجودة وسلامة الغذاء (مثل HACCP/ISO/HALAL/GMP)؟",
  fsq_02: "هل لديكم دليل موثّق لضمان الجودة وسلامة الغذاء يتضمن إجراءات لـ:",
  fsq_02a: "الموارد والتدريب؟",
  fsq_02b: "الشراء والتحقق من المواد المشتراة؟",
  fsq_02c: "التعريف والتتبع؟",
  fsq_02d: "التدقيق الداخلي؟",
  fsq_02e: "إجراءات شكاوى الغذاء مع خطة إجراءات تصحيحية؟",
  fsq_02f: "الإجراءات التصحيحية والوقائية؟",
  fsq_02g: "استدعاء المنتج؟",
  fsq_03: "هل توجد برامج صيانة للمعدات والمباني؟",
  fsq_04: "هل يوجد نظام تدريب للموظفين بحيث يتم تدريب جميع الأشخاص الرئيسيين وتتوفر سجلات تدريب؟",
  fsq_05: "هل لديكم مرافق وأنظمة للنقل تحمي المنتجات وتمنع التلوث؟",
  fsq_06: "هل لديكم مختبرات في الموقع وهل هي معتمدة؟",

  rm_01: "هل تراقبون جودة/سلامة المواد الخام وتطلبون شهادات تحليل/مطابقة من الموردين؟",
  rm_02: "هل لديكم نظام تتبع وتحتفظون بسجلات أكواد الدُفعات للمواد المستخدمة؟",
  rm_03: "هل لديكم مواصفات لجميع المواد الخام؟",
  rm_04: "هل لديكم إجراءات للتعامل مع المواد الخام/المنتجات غير المطابقة للمواصفات؟",
  rm_05: "هل لديكم مواصفات للمنتجات النهائية؟",
  rm_06: "هل تفحصون جميع المنتجات النهائية مقابل المواصفات؟",
  rm_07: "هل لديكم إجراءات للتعامل مع المواد الخام والمنتجات غير المطابقة؟",

  proc_01: "هل تم تحديد نقاط التحكم الحرجة (السلامة والجودة) لعملية الإنتاج؟",
  proc_02: "هل يوجد نظام مراقبة درجات الحرارة أثناء التخزين المبرد/المجمد أو المعالجة الحرارية/الباردة…؟",

  trn_01: "هل يتم مراقبة درجة حرارة المركبة أثناء النقل؟",
  trn_02: "هل توجد جداول تنظيف للمركبات ونظام تحقق متاح؟",
  trn_03: "هل جميع المركبات لديها موافقات رقابية سارية لنقل الغذاء؟",

  prd_01: "هل طرق الإنتاج موثّقة ومتاحة على أرض المصنع؟",
  prd_02: "هل تتم معايرة أجهزة القياس الحرجة وفق معيار وطني؟",
  prd_03: "هل تستخدمون جهاز كشف المعادن للمنتج النهائي؟",
  prd_04: "هل جميع نقاط الدخول والتهوية محمية لمنع دخول الطيور/الحشرات/القوارض/الغبار/المخلفات؟",
  prd_05: "هل تطبقون برنامج صيانة مخطط؟",

  eqp_01: "هل معدات الإنتاج مناسبة للغرض وسهلة التنظيف وبحالة جيدة؟",

  /* ─── Allergens ─── */
  alg_01: "هل تحتفظون بسجل لمسببات الحساسية لجميع المواد الخام والمنتجات النهائية؟",
  alg_02: "هل يتم الفصل المادي للمنتجات المحتوية على مسببات الحساسية أثناء التخزين والإنتاج؟",
  alg_03: "هل لديكم إجراءات تنظيف مُتحقق منها لمنع التلوث المتبادل لمسببات الحساسية بين المنتجات؟",
  alg_04: "هل يتم تصريح جميع مسببات الحساسية بوضوح على ملصقات المنتجات وفق لوائح الدولة المحلية/المستوردة؟",
  alg_05: "هل لديكم سياسة موثّقة لإدارة التلامس المتبادل لمسببات الحساسية وتدريب الموظفين عليها؟",

  /* ─── Chemicals ─── */
  chem_01: "هل تقدمون بطاقات السلامة (SDS / MSDS) بالعربية/الإنجليزية لكل منتج يتم توريده؟",
  chem_02: "هل ملصقات المنتجات متوافقة مع نظام GHS العالمي للتصنيف والوسم وتوصيل الأخطار؟",
  chem_03: "هل رموز الخطر وكلمات الإنذار وبيانات H/P مطبوعة على العبوة الأساسية؟",
  chem_04: "هل فترة الصلاحية / تاريخ الانتهاء مطبوعة بوضوح على كل عبوة؟",
  chem_05: "هل تُصدرون شهادة تحليل (COA) لكل دُفعة عند الطلب؟",
  chem_06: "هل تحتفظون بنظام تتبع للدُفعات من المادة الخام حتى المنتج النهائي المسلَّم؟",
  chem_07: "هل تعملون وفق نظام إدارة جودة موثّق (مثل ISO 9001)؟",
  chem_08: "هل لديكم إجراء لاستدعاء المنتج؟",
  chem_09: "هل مواد التعقيم/التطهير لديكم معتمدة للأسطح الملامسة للغذاء (EPA / ECHA / FDA / ESMA)؟",
  chem_10: "هل تقدمون نسب التخفيف ومدة التلامس ومتطلبات الشطف مكتوبة؟",
  chem_11: "هل منتجاتكم متوافقة مع متطلبات الحلال عند الاستخدام في قطاع الأغذية؟",
  chem_12: "هل يتم تخزين الكيماويات بمعزل عن المواد الغذائية والخام في المستودع؟",
  chem_13: "هل سائقو النقل مدربون على التعامل مع المواد الخطرة (ADR) أثناء توصيل الكيماويات؟",
  chem_14: "هل يوجد إجراء موثّق للاستجابة للطوارئ / الانسكابات؟",

  /* ─── Packaging ─── */
  pkg_01: "هل جميع المواد المورّدة مطابقة للوائح ملامسة الغذاء (EU 10/2011 / FDA 21 CFR / GSO / ESMA)؟",
  pkg_02: "هل ترفقون بيان المطابقة (DOC) مع كل شحنة؟",
  pkg_03: "هل تم إجراء اختبارات الهجرة (العامة والنوعية) وهل التقارير متاحة؟",
  pkg_04: "هل الأحبار والمواد اللاصقة والطلاءات المستخدمة معتمدة للاستخدام الغذائي؟",
  pkg_05: "هل منشأة الإنتاج معتمدة BRC Packaging / ISO 22000 / 15378 أو ما يعادلها؟",
  pkg_06: "هل مناطق الإنتاج معزولة عن مصادر التلوث (خشب/زجاج/كيماويات)؟",
  pkg_07: "هل تحتفظون بتتبع الدُفعات للمواد الخام والإنتاج والشحن؟",
  pkg_08: "هل لديكم إجراءات موثّقة لمكافحة الآفات والنظافة العامة؟",
  pkg_09: "هل لديكم إجراء لعدم المطابقة / الاستدعاء؟",
  pkg_10: "هل يتم تخزين التعبئة النهائية بعيداً عن الأرض في بيئة نظيفة جافة خالية من الآفات؟",
  pkg_11: "هل يتم حماية التعبئة بالتغليف الانكماشي / البليت أثناء النقل؟",

  /* ─── Services ─── */
  srv_01: "هل تمتلكون جميع التراخيص / التصاريح التنظيمية للعمل (البلدية / الدفاع المدني / PCO بلدية دبي)؟",
  srv_02: "هل جميع الفنيين/المشغّلين مدربون ومعتمدون للخدمات التي يقدمونها؟",
  srv_03: "هل لديكم تأمين مسؤولية عامة ساري لتغطية عمليات الخدمة؟",
  srv_04: "هل الموظفون لائقون طبياً (بطاقات صحية سارية حيثما يتطلب الأمر)؟",
  srv_05: "هل تُصدرون تقرير/شهادة خدمة بعد كل زيارة موقعة من الفني والعميل؟",
  srv_06: "هل تحتفظون بسجلات الخدمة والتتبع ومعايرة المعدات لمدة سنتين على الأقل؟",
  srv_07: "هل تتبعون نطاق عمل وبيان طريقة موثّق لكل خدمة؟",
  srv_08: "هل جميع الكيماويات/المواد المستخدمة معتمدة للاستخدام الغذائي ومرفقة ببطاقات SDS؟",
  srv_09: "هل المعدات والأدوات المستخدمة تخضع للصيانة والمعايرة وبحالة جيدة؟",

  /* ─── Other ─── */
  oth_01: "هل تعملون وفق نظام إدارة جودة موثّق (ISO 9001 أو ما يعادله)؟",
  oth_02: "هل المنتجات مطابقة للوائح المحلية/الخليجية ذات الصلة (SASO / ESMA / هيئة الإمارات)؟",
  oth_03: "هل تزوّدون بمواصفات/بطاقات بيانات المنتج مع كل شحنة؟",
  oth_04: "هل تقدمون ضماناً/دعماً لما بعد البيع للمنتجات المورّدة؟",
  oth_05: "هل تحتفظون بنظام تتبع للدُفعات؟",
  oth_06: "هل لديكم إجراء موثّق لعدم المطابقة والإرجاع؟",
};

/* ===================== helpers ===================== */
async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

async function listReportsByType(type) {
  const url = `${REPORTS_URL}?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || data?.error || `Failed to list reports (${res.status})`);
  }
  const data = await safeJson(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* ✅ DELETE report */
async function deleteReportById(id) {
  if (!id) throw new Error("Missing report id");
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.message || data?.error || `Failed to delete report (${res.status})`);
  }
  const data = await safeJson(res);
  return data;
}

/* ✅ JSON parsing helpers (fix payload_json / fieldAttachments stored as string JSON) */
function tryParseJSON(v) {
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return v;
  try {
    return JSON.parse(s);
  } catch {
    return v;
  }
}
function asObject(v) {
  const x = tryParseJSON(v);
  return x && typeof x === "object" && !Array.isArray(x) ? x : null;
}
function asArray(v) {
  const x = tryParseJSON(v);
  return Array.isArray(x) ? x : null;
}

function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function calcCounts(answers) {
  const a = answers || {};
  const keys = Object.keys(a);
  const yesCount = keys.filter((k) => a[k] === true).length;
  const noCount = keys.filter((k) => a[k] === false).length;
  const naCount = keys.filter((k) => a[k] === null || typeof a[k] === "undefined").length;
  return { total: keys.length, yesCount, noCount, naCount };
}

/* ===================== Questions Map (EN from PDF-literal form) ===================== */
const QUESTIONS = {
  ph_01: "Do you have documented Personal Hygiene standards & monitoring procedure?",
  ph_02: "Do all food handlers have valid health cards?",
  ph_03: "Is there an Illness reporting procedure available?",
  ph_04: "Do the staffs have separate changing facility & toilet away from the food handling area?",

  fbc_01: "Is there a policy for the control of glass and\nexclusion of glass from production areas?",
  fbc_02: "Is there a glass/brittle material breakage\nprocedure?",
  fbc_03: "Is there a policy for the control of wood and\nexclusion of wood from production areas?",
  fbc_04: "Is there a policy for the control of metal and\nexclusion of potential metal contaminants from\nproduction areas?",
  fbc_05: "Is there a policy for the control of knives and\nexclusion of unauthorized knives from the\nproduction area?",

  cln_01:
    "Do you have documented cleaning schedules that\ninclude frequency of clean, chemicals used step\nby step instructions and the standard required?",
  cln_02: "Do you monitor cleaning standards?",
  cln_03: "Is there a separate area away from food\npreparation & storage available for cleaning\nchemicals & equipment storage?",
  cln_04: "Do you use Sanitizing Chemicals specifically for\nSanitizing or Disinfecting all food contact\nsurfaces?",
  cln_05: "Do you have effective waste disposal system?",

  pst_01: "Do you have a Contract with Approved Pest\nControl Company?",
  pst_02:
    "Are raw materials, packaging and finished\nproducts stored so as to minimize the risk of\ninfestation?",
  pst_03: "Are all buildings adequately proofed?",
  pst_04:
    "Is there a complete inventory of pesticides\ndetailing the location and safe use and\napplication of baits and other materials such as\ninsecticide sprays or fumigants?",
  pst_05: "Are flying insect controls in place?",

  fsq_01:
    "Do you have a documented Quality and Food\nSafety Policy & Objectives (eg. HACCP,\nISO, HALAL, GMP)?",
  fsq_02: "Do you have a documented food safety & quality\nassurance manual that includes procedures for:",
  fsq_02a: "Resources and Training?",
  fsq_02b: "Purchasing and Verification of Purchased\nMaterials?",
  fsq_02c: "Identification and Traceability?",
  fsq_02d: "Internal Audit?",
  fsq_02e: "food complaint reporting procedure with\ncorrective action plan?",
  fsq_02f: "Corrective Action and Preventive Action?",
  fsq_02g: "Product Recall?",
  fsq_03: "Are there maintenance programs for equipment\nand buildings?",
  fsq_04:
    "Is there a system for staff training such that all\nkey personnel are trained and have training\nrecords?",
  fsq_05:
    "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?",
  fsq_06: "Do you have laboratory facilities on site and are\nthey accredited?",

  rm_01:
    "Do you monitor the quality/safety of your raw\nmaterials and request certificates of\nanalysis/conformity from your suppliers?",
  rm_02: "Do you have a traceability system and maintain\nrecords of batch codes of materials used?",
  rm_03: "Do you hold specifications for all your raw\nmaterials?",
  rm_04:
    "Do you have procedure for dealing with out of\nspecification/non-conforming raw materials and\nfinished products?",
  rm_05: "Do you have specifications for your finished\nproducts?",
  rm_06: "Do you test all finished product against your\nspecification?",
  rm_07: "Do you have a procedure for dealing with non-conforming raw materials and finished products?",

  proc_01:
    "Have your critical control points (safety and\nquality) been identified for your production\nprocess?",
  proc_02:
    "Is there a temperature monitoring system in\nplace during chilled or frozen storage, heat\nprocessing, cold processing etc.?",

  trn_01: "Is the vehicle temperature monitored during\ntransportation?",
  trn_02: "Is there a cleaning schedule for the vehicles &\nverification system available?",
  trn_03: "Are all the vehicles holding valid food control\nregulatory approval?",

  prd_01: "Are your production methods documented and\navailable on the factory floor?",
  prd_02: "Are critical measurement devices calibrated to a\nNational Standard?",
  prd_03: "Do you metal detect your finished product?",
  prd_04:
    "Are all points of entry and ventilation protected\nfrom access by birds, insects, rodents, dust and\ndebris?",
  prd_05: "Do you operate a planned maintenance\nprogramme?",

  eqp_01:
    "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?",

  /* ─── Allergens (food) ─── */
  alg_01: "Do you maintain an allergen register for all raw\nmaterials and finished products?",
  alg_02: "Are allergen-containing products physically\nsegregated during storage and production?",
  alg_03: "Do you have validated cleaning procedures to\nprevent allergen cross-contamination between\nproducts?",
  alg_04: "Are all allergens clearly declared on product\nlabels per local / destination country regulation?",
  alg_05: "Do you have a documented policy to manage\nallergen cross-contact and staff training?",

  /* ─── Chemicals ─── */
  chem_01: "Do you provide Safety Data Sheets (SDS / MSDS)\nin English/Arabic for every product supplied?",
  chem_02: "Are your product labels compliant with GHS\n(Globally Harmonized System) hazard\ncommunication?",
  chem_03: "Are hazard pictograms, signal words, H- and\nP-statements shown on primary packaging?",
  chem_04: "Is product shelf life / expiry date clearly printed\non every container?",
  chem_05: "Do you issue a Certificate of Analysis (COA) per\nbatch upon request?",
  chem_06: "Do you maintain batch traceability from raw\nchemical to finished product delivered?",
  chem_07: "Do you operate under a documented Quality\nManagement System (e.g. ISO 9001)?",
  chem_08: "Do you have a product recall procedure in place?",
  chem_09: "Are your sanitizers / disinfectants approved for\nfood-contact surfaces (e.g. EPA / ECHA / FDA /\nESMA approval)?",
  chem_10: "Do you provide recommended dilution rates,\ncontact time and rinse requirements in writing?",
  chem_11: "Are your products halal-compliant where required\nfor food industry use?",
  chem_12: "Are chemicals stored separately from food and\nraw materials in your warehouse?",
  chem_13: "Are transport drivers trained on ADR / hazardous\nmaterial handling for chemical deliveries?",
  chem_14: "Is there a documented emergency / spillage\nresponse procedure available?",

  /* ─── Packaging ─── */
  pkg_01: "Are all materials supplied compliant with\nfood-contact regulations (e.g. EU 10/2011, FDA\n21 CFR, GSO / ESMA)?",
  pkg_02: "Do you provide a Declaration of Compliance (DOC)\nwith every consignment?",
  pkg_03: "Have migration tests (overall & specific) been\nperformed and are reports available?",
  pkg_04: "Are inks, adhesives and coatings used certified\nfor food-contact use?",
  pkg_05: "Is your production facility certified to BRC\nPackaging, ISO 22000 / 15378 or equivalent?",
  pkg_06: "Are production areas segregated from sources of\ncontamination (wood, glass, chemicals)?",
  pkg_07: "Do you maintain batch traceability for raw\nmaterials, production and dispatch?",
  pkg_08: "Do you have documented pest control and\nhousekeeping procedures?",
  pkg_09: "Do you have a non-conformance / recall\nprocedure in place?",
  pkg_10: "Is finished packaging stored off the floor in a\nclean, dry, pest-free environment?",
  pkg_11: "Is packaging shrink-wrapped / pallet-protected\nduring transport?",

  /* ─── Services ─── */
  srv_01: "Do you hold all relevant regulatory licenses /\npermits to operate (e.g. municipality, civil\ndefense, Dubai Municipality PCO)?",
  srv_02: "Are all technicians/operators trained and\ncertified for the services they deliver?",
  srv_03: "Do you maintain valid public liability insurance\ncoverage for service operations?",
  srv_04: "Are staff medically fit (valid health cards where\nrequired)?",
  srv_05: "Do you issue a service report / certificate after\nevery visit, signed by the technician and client?",
  srv_06: "Do you maintain service records, traceability and\nequipment calibration for at least 2 years?",
  srv_07: "Do you follow a documented scope-of-work and\nmethod statement for each service?",
  srv_08: "Are all chemicals / materials used approved for\nfood-industry use and accompanied by SDS?",
  srv_09: "Are equipment and tools used maintained,\ncalibrated and in a good state of repair?",

  /* ─── Other ─── */
  oth_01: "Do you operate under a documented Quality\nManagement System (ISO 9001 or equivalent)?",
  oth_02: "Do products comply with relevant local / GCC\nregulations (SASO, ESMA, Emirates Authority)?",
  oth_03: "Do you provide product specifications / datasheets\nwith every shipment?",
  oth_04: "Do you offer warranty / after-sales support on\nproducts supplied?",
  oth_05: "Do you maintain batch / lot traceability?",
  oth_06: "Do you have a documented non-conformance and\nreturn procedure?",
};

/* ✅ PDF order (important) */
const QUESTION_ORDER = [
  "ph_01",
  "ph_02",
  "ph_03",
  "ph_04",
  "fbc_01",
  "fbc_02",
  "fbc_03",
  "fbc_04",
  "fbc_05",
  "cln_01",
  "cln_02",
  "cln_03",
  "cln_04",
  "cln_05",
  "pst_01",
  "pst_02",
  "pst_03",
  "pst_04",
  "pst_05",
  "fsq_01",
  "fsq_02",
  "fsq_02a",
  "fsq_02b",
  "fsq_02c",
  "fsq_02d",
  "fsq_02e",
  "fsq_02f",
  "fsq_02g",
  "fsq_03",
  "fsq_04",
  "fsq_05",
  "fsq_06",
  "rm_01",
  "rm_02",
  "rm_03",
  "rm_04",
  "rm_05",
  "rm_06",
  "rm_07",
  "proc_01",
  "proc_02",
  "trn_01",
  "trn_02",
  "trn_03",
  "prd_01",
  "prd_02",
  "prd_03",
  "prd_04",
  "prd_05",
  "eqp_01",
  "alg_01",
  "alg_02",
  "alg_03",
  "alg_04",
  "alg_05",

  /* Chemicals */
  "chem_01",
  "chem_02",
  "chem_03",
  "chem_04",
  "chem_05",
  "chem_06",
  "chem_07",
  "chem_08",
  "chem_09",
  "chem_10",
  "chem_11",
  "chem_12",
  "chem_13",
  "chem_14",

  /* Packaging */
  "pkg_01",
  "pkg_02",
  "pkg_03",
  "pkg_04",
  "pkg_05",
  "pkg_06",
  "pkg_07",
  "pkg_08",
  "pkg_09",
  "pkg_10",
  "pkg_11",

  /* Services */
  "srv_01",
  "srv_02",
  "srv_03",
  "srv_04",
  "srv_05",
  "srv_06",
  "srv_07",
  "srv_08",
  "srv_09",

  /* Other */
  "oth_01",
  "oth_02",
  "oth_03",
  "oth_04",
  "oth_05",
  "oth_06",
];

function answerLabel(v, lang) {
  if (v === true) return lang === "ar" ? "نعم" : "YES";
  if (v === false) return lang === "ar" ? "لا" : "NO";
  return lang === "ar" ? "غير متاح" : "N/A";
}

/* ✅ robust report/payload getters (support payload_json as string) */
function getReportObj(r) {
  return r?.report || r?.item || r?.data || r;
}
function getPayloadObj(r) {
  const x = getReportObj(r);
  const raw = x?.payload || x?.payload_json || x?.data?.payload || x?.item?.payload || {};
  return asObject(raw) || raw || {};
}
function getLastUpdateIso(r) {
  const x = getReportObj(r) || {};
  const p = getPayloadObj(r) || {};
  return (
    p?.meta?.updatedAt ||
    p?.meta?.modifiedAt ||
    p?.public?.submittedAt ||
    p?.meta?.savedAt ||
    p?.public?.savedAt ||
    p?.public?.submission?.submittedAt ||
    p?.public?.submission?.savedAt ||
    x?.updated_at ||
    x?.updatedAt ||
    x?.modified_at ||
    x?.modifiedAt ||
    x?.created_at ||
    x?.createdAt ||
    ""
  );
}
function getSubmittedAtIso(r) {
  const x = getReportObj(r) || {};
  const p = getPayloadObj(r) || {};
  return p?.public?.submittedAt || p?.meta?.submittedAt || p?.public?.submission?.submittedAt || x?.submittedAt || "";
}
function getRecordDate(r) {
  const p = getPayloadObj(r) || {};
  return p?.recordDate || p?.meta?.recordDate || p?.public?.recordDate || p?.public?.submission?.recordDate || "—";
}

/* ✅ attachments getter (robust + parse if arrays stored as string) */
function getAttachmentsFromAny(where) {
  const candidates = [
    where?.attachments,
    where?.payload?.attachments,

    where?.meta?.attachments,
    where?.public?.attachments,

    // ✅ common submit nesting
    where?.public?.submission?.attachments,
    where?.submission?.attachments,

    // legacy weird nesting
    where?.fields?.attachments,
  ];

  for (const c of candidates) {
    const arr = asArray(c) || (Array.isArray(c) ? c : null);
    if (arr && arr.length) return arr;
  }
  return [];
}
function getAttachmentsFromReport(r) {
  const x = getReportObj(r) || {};
  const p = getPayloadObj(r) || {};
  const fromPayload = getAttachmentsFromAny(p);
  if (fromPayload.length) return fromPayload;
  const fromReport = getAttachmentsFromAny(x);
  if (fromReport.length) return fromReport;
  const fromLegacy = getAttachmentsFromAny(x?.data);
  if (fromLegacy.length) return fromLegacy;
  return [];
}

/* ✅ fieldAttachments getter (robust) — supports object OR stringified object */
function getFieldAttachmentsFromAny(where) {
  const candidates = [
    where?.fieldAttachments,
    where?.payload?.fieldAttachments,

    where?.meta?.fieldAttachments,
    where?.public?.fieldAttachments,

    // ✅ common submit nesting
    where?.public?.submission?.fieldAttachments,
    where?.submission?.fieldAttachments,
  ];

  for (const c of candidates) {
    const obj = asObject(c) || (c && typeof c === "object" && !Array.isArray(c) ? c : null);
    if (obj && Object.keys(obj).length) return obj;
  }
  return {};
}
function getFieldAttachmentsFromReport(r) {
  const x = getReportObj(r) || {};
  const p = getPayloadObj(r) || {};
  const fromPayload = getFieldAttachmentsFromAny(p);
  if (fromPayload && Object.keys(fromPayload).length) return fromPayload;
  const fromReport = getFieldAttachmentsFromAny(x);
  if (fromReport && Object.keys(fromReport).length) return fromReport;
  const fromLegacy = getFieldAttachmentsFromAny(x?.data);
  if (fromLegacy && Object.keys(fromLegacy).length) return fromLegacy;
  return {};
}

/* ✅ attachment helpers */
function normalizeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  return s;
}
function getFileExtFromUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname || "";
    const seg = path.split("/").pop() || "";
    const clean = seg.split("?")[0].split("#")[0];
    const parts = clean.split(".");
    if (parts.length >= 2) return parts.pop().toLowerCase();
    return "";
  } catch {
    const clean = String(url || "").split("?")[0].split("#")[0];
    const parts = clean.split(".");
    if (parts.length >= 2) return parts.pop().toLowerCase();
    return "";
  }
}
function guessType(file) {
  const ct = String(file?.contentType || file?.mimetype || file?.type || "").toLowerCase();
  const url = normalizeUrl(file?.url || file?.optimized_url || file?.secure_url || "");
  const ext = getFileExtFromUrl(url);

  const isPdf = ct.includes("pdf") || ext === "pdf";
  const isImage = ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext);
  const isText = ct.startsWith("text/") || ["txt", "csv", "log"].includes(ext);

  // office docs
  const isDoc =
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext) ||
    ct.includes("officedocument") ||
    ct.includes("msword") ||
    ct.includes("excel") ||
    ct.includes("powerpoint");

  return { isPdf, isImage, isText, isDoc, ext, ct, url };
}

/* ✅ Field attachment labels (keys used in SupplierEvaluationPublic) */
const FIELD_ATTACHMENT_LABELS = {
  att_product_specs: { en: "Product specification / spec sheet", ar: "مواصفات المنتج / ورقة المواصفات" },
  att_certificates: { en: "Certificates copy", ar: "نسخة الشهادات" },
  att_hygiene_training: { en: "Hygiene training certificates", ar: "شهادات تدريب النظافة" },
  att_lab_tests: { en: "Lab test reports", ar: "تقارير الفحوصات المخبرية" },
  att_haccp: { en: "HACCP plans", ar: "خطط HACCP" },
  att_declaration: { en: "Signed declaration / company seal", ar: "الإقرار الموقّع / ختم الشركة" },

  /* Chemicals */
  att_sds: { en: "Safety Data Sheets (SDS / MSDS)", ar: "بطاقات السلامة (SDS / MSDS)" },
  att_labels: { en: "Sample product labels", ar: "عينة من ملصقات المنتجات" },
  att_coa: { en: "Certificate of Analysis (COA) sample", ar: "عينة من شهادة التحليل (COA)" },

  /* Packaging */
  att_doc: { en: "Declaration of Compliance (DOC)", ar: "بيان المطابقة (DOC)" },
  att_migration: { en: "Migration test reports", ar: "تقارير اختبارات الهجرة" },

  /* Services */
  att_srv_license: { en: "Trade license / municipal permit", ar: "الرخصة التجارية / تصريح البلدية" },
  att_srv_insurance: { en: "Liability insurance certificate", ar: "شهادة تأمين المسؤولية" },
  att_srv_report: { en: "Service report / certificate sample", ar: "عينة تقرير/شهادة خدمة" },
  att_srv_sds: { en: "SDS for chemicals used in services", ar: "بطاقات SDS للكيماويات المستخدمة" },

  /* Other */
  att_oth_specs: { en: "Product specifications / datasheets", ar: "مواصفات / بطاقات بيانات المنتج" },
};

/* ✅ EXTRA: build fieldAttachments from fields if server stored attachments inside fields.att_* */
function coerceFileObject(x, fallbackName) {
  // Accept {name,url} OR {url} OR url string
  if (!x) return null;
  if (typeof x === "string") {
    const url = normalizeUrl(x);
    if (!url) return null;
    return { name: fallbackName || "Attachment", url };
  }
  if (typeof x === "object") {
    const url = normalizeUrl(x.url || x.optimized_url || x.secure_url || x.href);
    if (!url) return null;
    return {
      name: x.name || x.filename || fallbackName || "Attachment",
      url,
      contentType: x.contentType || x.mimetype || x.type || "",
    };
  }
  return null;
}

function buildFieldAttachmentsFallbackFromFields(fieldsObj) {
  const f = fieldsObj && typeof fieldsObj === "object" ? fieldsObj : {};
  const out = {};
  for (const key of Object.keys(f)) {
    if (!/^att_/i.test(key)) continue;

    const raw = f[key];
    // array?
    const arr = asArray(raw) || (Array.isArray(raw) ? raw : null);
    if (arr && arr.length) {
      const files = arr
        .map((it, idx) => coerceFileObject(it, `${key} file ${idx + 1}`))
        .filter(Boolean);
      if (files.length) out[key] = files;
      continue;
    }

    // object?
    const obj = asObject(raw) || (raw && typeof raw === "object" ? raw : null);
    if (obj) {
      const file = coerceFileObject(obj, key);
      if (file) out[key] = [file];
      continue;
    }

    // string url?
    const file = coerceFileObject(raw, key);
    if (file) out[key] = [file];
  }
  return out;
}

/* ===================== Styles ===================== */
const shell = {
  minHeight: "100vh",
  padding: "28px 24px",
  background:
    "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#071b2d",
  boxSizing: "border-box",
};
const wrap = { maxWidth: "100%", width: "100%", margin: "0 auto" };
const panel = {
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15, 23, 42, 0.14)",
  borderRadius: 18,
  boxShadow: "0 12px 30px rgba(2, 132, 199, 0.10)",
  padding: 20,
};
const btn = {
  padding: "11px 16px",
  borderRadius: 14,
  border: "1px solid rgba(15,23,42,0.16)",
  background: "rgba(255,255,255,0.95)",
  cursor: "pointer",
  fontWeight: 950,
  fontSize: 15,
};
const btnPrimary = {
  ...btn,
  background: "linear-gradient(135deg, #0ea5e9, #22c55e)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.85)",
};
const btnDanger = {
  ...btn,
  background: "rgba(239,68,68,0.10)",
  border: "1px solid rgba(239,68,68,0.28)",
  color: "#7f1d1d",
};
const input = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 12,
  border: "1px solid rgba(2,6,23,0.14)",
  outline: "none",
  background: "rgba(255,255,255,0.98)",
  fontWeight: 900,
  fontSize: 16,
};
const table = { width: "100%", borderCollapse: "separate", borderSpacing: "0 10px" };
const th = { textAlign: "left", fontSize: 14, color: "#64748b", fontWeight: 950, padding: "0 12px 8px" };
const rowCard = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(15, 23, 42, 0.14)",
  borderRadius: 16,
  boxShadow: "0 10px 22px rgba(2, 132, 199, 0.08)",
};
const td = { padding: "14px 12px", verticalAlign: "top", fontWeight: 850, color: "#0f172a", fontSize: 15 };
const muted = { color: "#64748b", fontWeight: 850, fontSize: 14 };

function FieldLine({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ fontSize: 14, fontWeight: 950, color: "#64748b" }}>{label}</div>
      <div style={{ fontWeight: 900, color: "#0f172a", whiteSpace: "pre-wrap", fontSize: 16 }}>{String(value)}</div>
    </div>
  );
}

/* ✅ Attachment Preview Modal */
function AttachmentModal({ file, onClose, t }) {
  if (!file) return null;

  const url = normalizeUrl(file?.url || file?.optimized_url || file?.secure_url || "");
  const name = file?.name || file?.filename || "Attachment";
  const info = guessType(file);

  const headerBtn = {
    ...btn,
    padding: "8px 12px",
    borderRadius: 12,
    fontWeight: 950,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.62)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 18,
        overflowY: "auto",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(1400px, 100%)",
          marginTop: 20,
          background: "rgba(255,255,255,0.98)",
          border: "1px solid rgba(15,23,42,0.18)",
          borderRadius: 18,
          boxShadow: "0 24px 70px rgba(2,6,23,0.35)",
          padding: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 200 }}>
            <div style={{ fontSize: 16, fontWeight: 990, color: "#0f172a" }}>📎 {name}</div>
            <div style={{ marginTop: 4, color: "#64748b", fontWeight: 850, fontSize: 12 }}>
              {info.ct ? `${t.type}: ${info.ct}` : info.ext ? `${t.ext}: .${info.ext}` : `${t.type}: —`}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                <span style={headerBtn}>{t.modalDownload}</span>
              </a>
            ) : null}
            <button style={btn} onClick={onClose}>
              {t.modalClose}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
          {!url ? (
            <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13 }}>{t.modalNoUrl}</div>
          ) : info.isImage ? (
            <div style={{ display: "grid", placeItems: "center" }}>
              <img
                src={url}
                alt={name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "75vh",
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.12)",
                  boxShadow: "0 12px 26px rgba(2, 132, 199, 0.10)",
                }}
              />
            </div>
          ) : info.isPdf || info.isText ? (
            <iframe
              title={name}
              src={url}
              style={{
                width: "100%",
                height: "75vh",
                border: "1px solid rgba(15,23,42,0.12)",
                borderRadius: 14,
                background: "#fff",
              }}
            />
          ) : (
            <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13, lineHeight: 1.7 }}>
              {t.modalUnsupported}
              <div style={{ marginTop: 10 }}>
                <a href={url} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <span style={btnPrimary}>{t.modalDownloadFile}</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupplierEvaluationResults() {
  const nav = useNavigate();

  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem("qcs_results_lang");
      if (saved === "ar" || saved === "en") return saved;
    } catch {}
    const navLang = (typeof navigator !== "undefined" && navigator.language) || "en";
    return String(navLang).toLowerCase().startsWith("ar") ? "ar" : "en";
  });

  useEffect(() => {
    try {
      localStorage.setItem("qcs_results_lang", lang);
    } catch {}
  }, [lang]);

  const t = UI[lang] || UI.en;
  const isRTL = lang === "ar";

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [openAttachment, setOpenAttachment] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const list = await listReportsByType(TYPE);

      // ✅ only public + submitted
      const onlySubmitted = (list || []).filter((r) => {
        const p = getPayloadObj(r) || {};
        const isPublic = !!p?.public?.token || p?.public?.mode === "PUBLIC";
        const isSubmitted = p?.meta?.submitted === true || !!p?.public?.submittedAt || !!p?.public?.submission?.submittedAt;
        return isPublic && isSubmitted;
      });

      // ✅ sort by "last update" (latest change first)
      const sorted = [...onlySubmitted].sort((a, b) => {
        const da = getLastUpdateIso(a);
        const db = getLastUpdateIso(b);
        return String(db).localeCompare(String(da));
      });

      setItems(sorted);
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = String(query || "").trim().toLowerCase();
    const tf = String(typeFilter || "all").toLowerCase();

    return (items || []).filter((r) => {
      const p = getPayloadObj(r) || {};

      // Type filter
      if (tf !== "all") {
        const st = getSupplierType(p);
        if (tf === "unspecified") {
          if (st) return false;
        } else if (st !== tf) {
          return false;
        }
      }

      // Text query
      if (q) {
        const company = String(p?.fields?.company_name || "").toLowerCase();
        const recDate = String(getRecordDate(r) || "").toLowerCase();
        const token = String(p?.public?.token || "").toLowerCase();
        const lastUpd = String(getLastUpdateIso(r) || "").toLowerCase();
        const st = getSupplierType(p);
        const typeLabelEn = (SUPPLIER_TYPE_LABELS[st]?.en || "").toLowerCase();
        const typeLabelAr = (SUPPLIER_TYPE_LABELS[st]?.ar || "").toLowerCase();
        return (
          company.includes(q) ||
          recDate.includes(q) ||
          token.includes(q) ||
          lastUpd.includes(q) ||
          typeLabelEn.includes(q) ||
          typeLabelAr.includes(q)
        );
      }

      return true;
    });
  }, [items, query, typeFilter]);

  const opened = useMemo(() => {
    return (items || []).find((x) => String(getReportObj(x)?.id ?? x?.id) === String(openId)) || null;
  }, [items, openId]);

  const openedPayload = getPayloadObj(opened);
  const openedAnswers = openedPayload?.answers || openedPayload?.public?.submission?.answers || openedPayload?.public?.answers || {};
  const openedFields = openedPayload?.fields || openedPayload?.public?.submission?.fields || openedPayload?.public?.fields || {};
  const openedCounts = calcCounts(openedAnswers);

  // ✅ dynamic products list
  const openedProductsList = useMemo(() => {
    const raw =
      openedPayload?.productsList ||
      openedPayload?.public?.submission?.productsList ||
      openedPayload?.public?.productsList ||
      null;
    if (Array.isArray(raw) && raw.length) return raw;
    // fallback: old string field
    const oldStr = openedFields?.products_to_be_supplied;
    if (typeof oldStr === "string" && oldStr.trim()) {
      return oldStr
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name, i) => ({ id: `p${i}`, name, files: [] }));
    }
    return [];
  }, [openedPayload, openedFields]);

  // ✅ declaration
  const openedDeclaration = useMemo(() => {
    const d =
      openedPayload?.declaration ||
      openedPayload?.public?.submission?.declaration ||
      null;
    return d && typeof d === "object" ? d : null;
  }, [openedPayload]);

  // ✅ general attachments
  const openedAttachments = useMemo(() => getAttachmentsFromReport(opened), [opened]);

  // ✅ field attachments (with fallback from fields.att_*)
  const openedFieldAttachments = useMemo(() => {
    const fa = getFieldAttachmentsFromReport(opened);
    if (fa && Object.keys(fa).length) return fa;

    // fallback: server stored attachments inside fields (att_*)
    const fb = buildFieldAttachmentsFallbackFromFields(openedFields);
    return fb;
  }, [opened, openedFields]);

  const hasAnyAttachments = useMemo(() => {
    const generalOk = Array.isArray(openedAttachments) && openedAttachments.length > 0;
    const fa = openedFieldAttachments && typeof openedFieldAttachments === "object" ? openedFieldAttachments : {};
    const fieldOk = Object.values(fa).some((v) => Array.isArray(v) && v.length > 0);
    return generalOk || fieldOk;
  }, [openedAttachments, openedFieldAttachments]);

  const openedAnswerPairs = useMemo(() => {
    const ans = openedAnswers || {};
    const keys = Object.keys(ans);
    const ordered = QUESTION_ORDER.filter((k) => keys.includes(k));
    const unknown = keys.filter((k) => !QUESTION_ORDER.includes(k)).sort();
    const all = [...ordered, ...unknown];

    return all.map((k) => {
      const enQ = QUESTIONS[k] || k;
      const arQ = AR_QUESTIONS[k] || enQ;
      return { key: k, q: lang === "ar" ? arQ : enQ, v: ans[k] };
    });
  }, [openedAnswers, lang]);

  const copyText = async (txt) => {
    try {
      if (!txt) return;
      await navigator.clipboard.writeText(String(txt));
      alert(t.copied);
    } catch {
      alert(t.copyFail);
    }
  };

  const buildPublicUrl = (token) => {
    if (!token) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/supplier-approval/t/${encodeURIComponent(String(token))}`;
  };

  const handleDelete = async (report) => {
    const rep = getReportObj(report);
    const id = rep?.id ?? report?.id;
    const p = getPayloadObj(report) || {};
    const supplier = p?.fields?.company_name || "Supplier";
    const recDate = getRecordDate(report) || "";

    const ok = window.confirm(`${t.deleteConfirmTitle}\n\n${t.supplier}: ${supplier}\n${t.recordDate}: ${recDate || "—"}\n\n${t.deleteWarn}`);
    if (!ok) return;

    setDeletingId(String(id));
    try {
      await deleteReportById(id);
      setOpenId((prev) => (String(prev) === String(id) ? null : prev));
      await fetchData();
      alert(t.deleted);
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setDeletingId(null);
    }
  };

  const pageStyle = useMemo(
    () => ({
      ...shell,
      direction: isRTL ? "rtl" : "ltr",
    }),
    [isRTL]
  );

  const thAlign = useMemo(() => ({ ...th, textAlign: isRTL ? "right" : "left" }), [isRTL]);
  const tdAlign = useMemo(() => ({ ...td, textAlign: isRTL ? "right" : "left" }), [isRTL]);

  const fieldAttEntries = useMemo(() => {
    const fa = openedFieldAttachments && typeof openedFieldAttachments === "object" ? openedFieldAttachments : {};
    const keys = Object.keys(fa || {}).sort();
    return keys
      .map((k) => ({ key: k, files: Array.isArray(fa[k]) ? fa[k] : asArray(fa[k]) || [] }))
      .filter((x) => x.files.length > 0);
  }, [openedFieldAttachments]);

  const getFieldAttachmentLabel = (fieldKey) => {
    const m = FIELD_ATTACHMENT_LABELS[fieldKey];
    if (!m) return fieldKey;
    return lang === "ar" ? m.ar : m.en;
  };

  return (
    <main style={pageStyle}>
      <div style={wrap}>
        {/* Top header */}
        <div style={{ ...panel, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 980 }}>{t.title}</div>
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 850, fontSize: 15 }}>{t.sub}</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Language toggle */}
            <span
              style={{
                padding: "9px 14px",
                borderRadius: 999,
                border: "1px solid rgba(15,23,42,0.14)",
                background: "rgba(255,255,255,0.95)",
                fontWeight: 950,
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontSize: 15,
              }}
            >
              {t.lang}:
              <button
                onClick={() => setLang("en")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 950, opacity: lang === "en" ? 1 : 0.55 }}
              >
                {t.enBtn}
              </button>
              <span style={{ opacity: 0.35 }}>•</span>
              <button
                onClick={() => setLang("ar")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 950, opacity: lang === "ar" ? 1 : 0.55 }}
              >
                {t.arBtn}
              </button>
            </span>

            <button style={btn} onClick={() => nav("/haccp-iso/supplier-evaluation")}>
              {t.back}
            </button>
            <button style={btn} disabled={loading} onClick={fetchData}>
              {loading ? t.refreshing : t.refresh}
            </button>
          </div>
        </div>

        {/* Search + Type filter */}
        <div style={{ ...panel, marginTop: 14, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <div style={{ fontWeight: 950, color: "#0f172a", fontSize: 16 }}>{t.search}</div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} style={input} placeholder={t.searchPh} />

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ ...muted, whiteSpace: "nowrap" }}>{t.filterType}:</span>
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              style={{
                ...btn,
                padding: "7px 11px",
                fontSize: 12,
                background: typeFilter === "all" ? "linear-gradient(135deg, #0ea5e9, #22c55e)" : "rgba(255,255,255,0.95)",
                color: typeFilter === "all" ? "#fff" : "#0f172a",
                borderColor: typeFilter === "all" ? "rgba(14,165,233,0.4)" : "rgba(15,23,42,0.16)",
              }}
            >
              {t.allTypes}
            </button>
            {Object.entries(SUPPLIER_TYPE_LABELS).map(([key, v]) => {
              const active = typeFilter === key;
              const c = getSupplierTypeBadgeColor(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTypeFilter(key)}
                  style={{
                    ...btn,
                    padding: "7px 11px",
                    fontSize: 12,
                    background: active ? c.bg : "rgba(255,255,255,0.95)",
                    borderColor: active ? c.border : "rgba(15,23,42,0.16)",
                    color: active ? c.fg : "#0f172a",
                  }}
                >
                  {lang === "ar" ? v.ar : v.en}
                </button>
              );
            })}
          </div>

          <div style={muted}>
            {t.total}: {filtered.length}
          </div>
        </div>

        {/* List */}
        <div style={{ ...panel, marginTop: 14 }}>
          {filtered.length === 0 ? (
            <div style={{ fontWeight: 900, color: "#64748b" }}>{loading ? t.loading : t.none}</div>
          ) : (
            <div className="sa-table-wrap">
            <table className="sa-table" style={table}>
              <thead>
                <tr>
                  <th style={thAlign}>{t.supplier}</th>
                  <th style={thAlign}>{t.supplierType}</th>
                  <th style={thAlign}>{t.recordDate}</th>
                  <th style={thAlign}>{t.submittedAt}</th>
                  <th style={thAlign}>{t.lastUpdate}</th>
                  <th style={thAlign}>{t.yesNoNa}</th>
                  <th style={thAlign}>{t.action}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const rep = getReportObj(r);
                  const p = getPayloadObj(r) || {};
                  const supplier = p?.fields?.company_name || p?.public?.submission?.fields?.company_name || "—";
                  const recDate = getRecordDate(r) || "—";
                  const submittedAt = getSubmittedAtIso(r) || p?.meta?.savedAt || p?.public?.savedAt || p?.public?.submission?.savedAt || "";
                  const lastUpd = getLastUpdateIso(r) || "";
                  const answers = p?.answers || p?.public?.submission?.answers || {};
                  const c = p?.meta?.counts || calcCounts(answers);
                  const token = String(p?.public?.token || "");
                  const isDeleting = String(deletingId) === String(rep?.id ?? r?.id);
                  const supType = getSupplierType(p);
                  const supTypeLabel = supType ? getSupplierTypeLabel(supType, lang) : (lang === "ar" ? "غير محدَّد" : "Unspecified");
                  const supTypeColor = getSupplierTypeBadgeColor(supType);

                  return (
                    <tr key={String(rep?.id ?? r?.id)} style={rowCard}>
                      <td style={tdAlign}>
                        <div style={{ fontWeight: 980 }}>{supplier}</div>
                        <div style={muted}>
                          {t.token}: {token || "—"}{" "}
                          {token ? (
                            <button
                              style={{
                                ...btn,
                                padding: "6px 10px",
                                marginLeft: isRTL ? 0 : 8,
                                marginRight: isRTL ? 8 : 0,
                              }}
                              onClick={() => copyText(token)}
                            >
                              {t.copy}
                            </button>
                          ) : null}
                        </div>
                      </td>

                      <td style={tdAlign}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 10px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 900,
                            background: supTypeColor.bg,
                            color: supTypeColor.fg,
                            border: `1px solid ${supTypeColor.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {supTypeLabel}
                        </span>
                      </td>

                      <td style={tdAlign}>{recDate}</td>
                      <td style={tdAlign}>{fmtDateTime(submittedAt)}</td>
                      <td style={tdAlign}>{fmtDateTime(lastUpd)}</td>

                      <td style={tdAlign}>
                        <div style={{ fontWeight: 980 }}>
                          {t.yes}: {c?.yesCount ?? 0} &nbsp;•&nbsp; {t.no}: {c?.noCount ?? 0} &nbsp;•&nbsp; {t.na}: {c?.naCount ?? 0}
                        </div>
                        <div style={muted}>
                          {t.totalQ}: {c?.total ?? 0}
                        </div>
                      </td>

                      <td style={tdAlign}>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-start" }}>
                          <button style={btnPrimary} onClick={() => setOpenId(String(rep?.id ?? r?.id))} disabled={isDeleting}>
                            {t.view}
                          </button>
                          <button style={btnDanger} onClick={() => handleDelete(r)} disabled={isDeleting}>
                            {isDeleting ? t.deleting : t.del}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Details modal */}
        {opened ? (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.62)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: 18,
              overflowY: "auto",
              zIndex: 9999,
              direction: isRTL ? "rtl" : "ltr",
            }}
            onClick={() => setOpenId(null)}
          >
            <div
              style={{
                width: "min(1600px, 100%)",
                marginTop: 20,
                background: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(15,23,42,0.18)",
                borderRadius: 18,
                boxShadow: "0 24px 70px rgba(2,6,23,0.35)",
                padding: 20,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 990 }}>
                    {openedFields.company_name || (lang === "ar" ? "مورد" : "Supplier")} — {t.detailsTitle}
                  </div>
                  {(() => {
                    const st = getSupplierType(openedPayload);
                    const color = getSupplierTypeBadgeColor(st);
                    const label = st ? getSupplierTypeLabel(st, lang) : (lang === "ar" ? "غير محدَّد" : "Unspecified");
                    return (
                      <div style={{ marginTop: 6 }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 900,
                            background: color.bg,
                            color: color.fg,
                            border: `1px solid ${color.border}`,
                          }}
                        >
                          🏷 {t.supplierType}: {label}
                        </span>
                      </div>
                    );
                  })()}
                  <div style={{ marginTop: 6, color: "#64748b", fontWeight: 850, fontSize: 15 }}>
                    {t.recordDate}: <b>{getRecordDate(opened) || "—"}</b> • {t.submittedAt}:{" "}
                    <b>{fmtDateTime(getSubmittedAtIso(opened) || openedPayload?.meta?.savedAt || openedPayload?.public?.submission?.savedAt)}</b> •{" "}
                    {t.lastUpdate}: <b>{fmtDateTime(getLastUpdateIso(opened))}</b>
                  </div>
                  <div style={{ marginTop: 6, color: "#64748b", fontWeight: 850, fontSize: 15 }}>
                    {t.summary} — {t.yes}: <b>{openedCounts.yesCount}</b> • {t.no}: <b>{openedCounts.noCount}</b> • {t.na}:{" "}
                    <b>{openedCounts.naCount}</b>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {openedPayload?.public?.token ? (
                    <>
                      <button style={btn} onClick={() => copyText(buildPublicUrl(openedPayload.public.token))}>
                        {t.copyLink}
                      </button>
                      <button
                        style={btnPrimary}
                        onClick={() => {
                          const u = buildPublicUrl(openedPayload.public.token);
                          if (u) window.open(u, "_blank", "noopener,noreferrer");
                        }}
                      >
                        {t.openLink}
                      </button>
                    </>
                  ) : null}

                  <button
                    style={btnDanger}
                    disabled={String(deletingId) === String(getReportObj(opened)?.id ?? opened?.id)}
                    onClick={() => handleDelete(opened)}
                  >
                    {String(deletingId) === String(getReportObj(opened)?.id ?? opened?.id) ? t.deleting : t.del}
                  </button>

                  <button style={btn} onClick={() => setOpenId(null)}>
                    {t.close}
                  </button>
                </div>
              </div>

              {/* Supplier fields summary */}
              <div style={{ marginTop: 12, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                <div style={{ fontWeight: 980, marginBottom: 10, fontSize: 17 }}>{t.supplierDetails}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                  <FieldLine label={lang === "ar" ? "اسم الشركة" : "Company Name"} value={openedFields.company_name} />
                  <FieldLine label={lang === "ar" ? "العنوان" : "Address"} value={openedFields.company_address} />
                  <FieldLine label={lang === "ar" ? "عنوان المكتب الرئيسي (إن وُجد)" : "Head Office (if different)"} value={openedFields.company_head_office_address} />
                  <FieldLine label={lang === "ar" ? "اسم مسؤول الجودة/الفني" : "Technical/Quality Manager - Name"} value={openedFields.tqm_contact_name} />
                  <FieldLine label={lang === "ar" ? "المنصب" : "Position Held"} value={openedFields.tqm_position_held} />
                  <FieldLine label={lang === "ar" ? "رقم الهاتف" : "Telephone No"} value={openedFields.tqm_telephone} />
                  <FieldLine label={lang === "ar" ? "عدد الموظفين" : "Total employees"} value={openedFields.total_employees} />
                  <FieldLine label={lang === "ar" ? "ملاحظات/نسخ الشهادات" : "Certificates copy / notes"} value={openedFields.certificates_copy} />
                  <FieldLine label={lang === "ar" ? "نسخ خطط الهاسب" : "HACCP plans copy note"} value={openedFields.haccp_copy_note} />
                  <FieldLine label={lang === "ar" ? "قائمة الفحوصات" : "Lab tests list"} value={openedFields.lab_tests_list} />
                  <FieldLine label={lang === "ar" ? "تفاصيل فحص خارجي" : "Outside testing details"} value={openedFields.outside_testing_details} />
                  <FieldLine label={t.allergenDeclaration} value={openedFields.allergen_declaration} />
                  <FieldLine label={t.serviceScope} value={openedFields.service_scope} />
                </div>
              </div>

              {/* Products List */}
              {openedProductsList.length > 0 && (
                <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                  <div style={{ fontWeight: 980, marginBottom: 10, fontSize: 17 }}>
                    {lang === "ar" ? "المنتجات المراد توريدها" : "Products to be Supplied"}
                  </div>
                  <div style={{ display: "grid", gap: 10 }}>
                    {openedProductsList.map((prod, idx) => (
                      <div
                        key={prod.id || idx}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: "1px solid rgba(15,23,42,0.12)",
                          background: "rgba(255,255,255,0.97)",
                          display: "grid",
                          gap: 8,
                        }}
                      >
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", minWidth: 70 }}>
                            {lang === "ar" ? `منتج ${idx + 1}` : `Product ${idx + 1}`}
                          </span>
                          <span style={{ fontWeight: 900, color: "#0f172a", fontSize: 14 }}>
                            {prod.name || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>—</span>}
                          </span>
                        </div>
                        {Array.isArray(prod.files) && prod.files.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 6, borderTop: "1px dashed rgba(15,23,42,0.10)" }}>
                            {prod.files.map((f, fi) => {
                              const url = normalizeUrl(f?.url || f?.optimized_url || "");
                              const name = f?.name || `File ${fi + 1}`;
                              return url ? (
                                <div key={fi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: 12, fontWeight: 700, color: "#0369a1", textDecoration: "none" }}
                                  >
                                    📄 {name}
                                  </a>
                                  <button
                                    style={{ ...btn, padding: "3px 8px", fontSize: 11 }}
                                    onClick={() => setOpenAttachment({ name, url })}
                                  >
                                    {t.preview}
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Declaration */}
              {openedDeclaration && (
                <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                  <div style={{ fontWeight: 980, marginBottom: 10, fontSize: 17 }}>
                    {lang === "ar" ? "الإقرار" : "Declaration"}
                  </div>
                  <div style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: openedDeclaration.agreed
                      ? "1px solid rgba(34,197,94,0.40)"
                      : "1px solid rgba(239,68,68,0.30)",
                    background: openedDeclaration.agreed
                      ? "rgba(34,197,94,0.07)"
                      : "rgba(239,68,68,0.04)",
                    display: "grid",
                    gap: 8,
                  }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ fontSize: 18 }}>{openedDeclaration.agreed ? "✅" : "❌"}</span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: openedDeclaration.agreed ? "#14532d" : "#991b1b" }}>
                        {openedDeclaration.agreed
                          ? (lang === "ar" ? "تم الإقرار والموافقة" : "Declaration confirmed")
                          : (lang === "ar" ? "لم يتم تأكيد الإقرار" : "Declaration not confirmed")}
                      </span>
                    </div>
                    {openedDeclaration.agreed && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "#334155", fontWeight: 700 }}>
                        {openedDeclaration.name && (
                          <span>{lang === "ar" ? "الاسم: " : "Name: "}<b>{openedDeclaration.name}</b></span>
                        )}
                        {openedDeclaration.position && (
                          <span>{lang === "ar" ? "المنصب: " : "Position: "}<b>{openedDeclaration.position}</b></span>
                        )}
                        {openedDeclaration.agreedAt && (
                          <span>{lang === "ar" ? "وقت الإقرار: " : "Agreed at: "}<b>{fmtDateTime(openedDeclaration.agreedAt)}</b></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments */}
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                <div style={{ fontWeight: 980, marginBottom: 10, fontSize: 17 }}>{t.attachments}</div>

                {!hasAnyAttachments ? (
                  <div style={{ color: "#64748b", fontWeight: 850, fontSize: 13 }}>{t.noAttachments}</div>
                ) : (
                  <div style={{ display: "grid", gap: 14 }}>
                    {/* General attachments */}
                    {openedAttachments.length ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>{t.attachmentsGeneral}</div>
                        {openedAttachments.map((f, i) => {
                          const url = normalizeUrl(f?.url || f?.optimized_url || f?.secure_url || "");
                          const name = f?.name || f?.filename || `File ${i + 1}`;
                          return (
                            <button
                              key={`g-${url}-${i}`}
                              type="button"
                              onClick={() => setOpenAttachment({ ...f, url, name })}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                alignItems: "center",
                                padding: 12,
                                borderRadius: 14,
                                border: "1px solid rgba(15,23,42,0.12)",
                                background: "rgba(255,255,255,0.96)",
                                color: "#0f172a",
                                fontWeight: 900,
                                cursor: "pointer",
                                textAlign: isRTL ? "right" : "left",
                              }}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {name}</span>
                              <span style={{ color: "#64748b", fontWeight: 850, fontSize: 12 }}>{t.preview}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Field attachments */}
                    {fieldAttEntries.length ? (
                      <div style={{ display: "grid", gap: 12 }}>
                        <div style={{ fontWeight: 950, color: "#0f172a" }}>{t.attachmentsByField}</div>

                        {fieldAttEntries.map((grp) => (
                          <div
                            key={grp.key}
                            style={{
                              border: "1px solid rgba(15,23,42,0.12)",
                              borderRadius: 14,
                              background: "rgba(248,250,252,0.85)",
                              padding: 12,
                            }}
                          >
                            <div style={{ fontWeight: 980, color: "#0f172a", marginBottom: 10 }}>
                              • {getFieldAttachmentLabel(grp.key)}
                              <span style={{ color: "#64748b", fontWeight: 850, fontSize: 12 }}> ({grp.key})</span>
                            </div>

                            <div style={{ display: "grid", gap: 10 }}>
                              {grp.files.map((f, i) => {
                                const url = normalizeUrl(f?.url || f?.optimized_url || f?.secure_url || "");
                                const name = f?.name || f?.filename || `File ${i + 1}`;
                                return (
                                  <button
                                    key={`f-${grp.key}-${url}-${i}`}
                                    type="button"
                                    onClick={() => setOpenAttachment({ ...f, url, name })}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      gap: 10,
                                      alignItems: "center",
                                      padding: 12,
                                      borderRadius: 14,
                                      border: "1px solid rgba(15,23,42,0.12)",
                                      background: "rgba(255,255,255,0.96)",
                                      color: "#0f172a",
                                      fontWeight: 900,
                                      cursor: "pointer",
                                      textAlign: isRTL ? "right" : "left",
                                    }}
                                  >
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {name}</span>
                                    <span style={{ color: "#64748b", fontWeight: 850, fontSize: 12 }}>{t.preview}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* YES/NO questions */}
              <div style={{ marginTop: 14, borderTop: "1px solid rgba(15,23,42,0.12)", paddingTop: 12 }}>
                <div style={{ fontWeight: 980, marginBottom: 10, fontSize: 17 }}>{t.qList}</div>

                <div style={{ display: "grid", gap: 10 }}>
                  {openedAnswerPairs.map((x) => (
                    <div
                      key={x.key}
                      style={{
                        border: "1px solid rgba(15,23,42,0.12)",
                        borderRadius: 14,
                        padding: 12,
                        background: "rgba(248,250,252,0.9)",
                      }}
                    >
                      <div style={{ whiteSpace: "pre-wrap", fontWeight: 950, color: "#0f172a", lineHeight: 1.6, fontSize: 16 }}>{x.q}</div>
                      <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 980, fontSize: 15 }}>{t.answer}:</span>
                        <span
                          style={{
                            padding: "7px 12px",
                            borderRadius: 999,
                            fontWeight: 980,
                            fontSize: 14,
                            border: "1px solid rgba(15,23,42,0.14)",
                            background: x.v === true ? "rgba(34,197,94,0.14)" : x.v === false ? "rgba(239,68,68,0.12)" : "rgba(148,163,184,0.16)",
                            color: x.v === true ? "#14532d" : x.v === false ? "#7f1d1d" : "#334155",
                          }}
                        >
                          {answerLabel(x.v, lang)}
                        </span>
                        <span style={muted}>({x.key})</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Optional notes */}
                {openedPayload?.notes ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 980, marginBottom: 8 }}>{t.internalNotes}</div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        border: "1px solid rgba(15,23,42,0.12)",
                        borderRadius: 14,
                        padding: 12,
                        background: "rgba(255,255,255,0.92)",
                        fontWeight: 850,
                        color: "#0f172a",
                        lineHeight: 1.7,
                      }}
                    >
                      {openedPayload.notes}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* attachment popup */}
        {openAttachment ? <AttachmentModal file={openAttachment} onClose={() => setOpenAttachment(null)} t={t} /> : null}

        <div style={{ marginTop: 18, fontSize: 12, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          © Al Mawashi — Supplier Evaluation Results
        </div>
      </div>
    </main>
  );
}