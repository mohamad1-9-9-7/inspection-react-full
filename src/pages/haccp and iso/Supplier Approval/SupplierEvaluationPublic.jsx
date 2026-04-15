import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

function getInfoEndpoint(token) {
  return `${API_BASE}/api/reports/public/${encodeURIComponent(token)}`;
}
function getSubmitEndpoint(token) {
  return `${API_BASE}/api/reports/public/${encodeURIComponent(token)}/submit`;
}

/* ===================== helpers ===================== */
async function fetchJson(url, options) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...options,
  });

  const txt = await res.text().catch(() => "");
  let data;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt;
  }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ===== Upload via your server images endpoint (same as other pages) ===== */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

/* ===================== Helpers (FORM init) ===================== */
function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/* ===================== PDF-LITERAL CONTENT (Same as SupplierApproval.jsx) ===================== */
/* ✅ Removed "-----------" readonly line from UI (we still keep keys safe by not needing it at all) */
const FORM = [
  {
    pageTitle: "PAGE 1 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: [
          "Document Reference Supplier Self-Assessment Form",
          "Issue Date",
          "Owned by:QA",
          "Authorised By: DIRECTOR",
          "",
          "Please answer all questions and provide any additional information that you feel is pertinent.",
        ],
      },
      {
        title: "Company Details",
        type: "fields",
        items: [
          { key: "company_name", label: "Company Name:", kind: "text" },
          { key: "company_address", label: "Address:", kind: "textarea_short" },
          {
            key: "company_head_office_address",
            label: "Please provide Head Office address if different\nfrom above:",
            kind: "textarea_short",
          },
        ],
      },
      {
        title: "Technical or Quality Manager Contact Details",
        type: "fields",
        items: [
          { key: "tqm_contact_name", label: "Name of Contact:", kind: "text" },
          { key: "tqm_position_held", label: "Position Held:", kind: "text" },
          { key: "tqm_telephone", label: "Telephone No:", kind: "text" },
          { key: "total_employees", label: "What is the total number of employees in your\ncompany?", kind: "text" },
        ],
      },
      {
        title: "Products to be Supplied",
        type: "fields",
        items: [
          { key: "products_to_be_supplied", label: "Product Name", kind: "textarea" },
          {
            key: "product_specs_note",
            label: "Please provide a full product specification with each product supplied",
            kind: "readonly",
          },
          { key: "att_product_specs", label: "Attach product specification / spec sheet (PDF, image, etc.)", kind: "attachment" },
        ],
      },
      {
        title: "Certification",
        type: "fields",
        items: [
          {
            key: "certified_question",
            label: "Are your facilities and products certified to any\nrecognized food safety or quality schemes?",
            kind: "text",
          },
          { key: "certified_if_yes", label: "If yes which?", kind: "text" },
          { key: "certificates_copy", label: "Please provide a copy of your certificates", kind: "textarea_short" },
          { key: "att_certificates", label: "Attach certificates copy", kind: "attachment" },
        ],
      },
      {
        title: "Hygiene",
        type: "fields",
        items: [
          {
            key: "hygiene_training_question",
            label: "Have your staffs received any Food Hygiene &\nSafety Training to date & certificate copies are\navailable?",
            kind: "text",
          },
          { key: "att_hygiene_training", label: "Attach training certificates (if available)", kind: "attachment" },
        ],
      },
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },
  {
    pageTitle: "PAGE 2 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },
      {
        title: "Personal Hygiene (YES/NO)",
        type: "yesno",
        items: [
          { key: "ph_01", q: "Do you have documented Personal Hygiene standards & monitoring procedure?" },
          { key: "ph_02", q: "Do all food handlers have valid health cards?" },
          { key: "ph_03", q: "Is there an Illness reporting procedure available?" },
          { key: "ph_04", q: "Do the staffs have separate changing facility & toilet away from the food handling area?" },
        ],
      },
      {
        title: "Foreign Body Control",
        type: "yesno",
        items: [
          { key: "fbc_01", q: "Is there a policy for the control of glass and\nexclusion of glass from production areas?" },
          { key: "fbc_02", q: "Is there a glass/brittle material breakage\nprocedure?" },
          { key: "fbc_03", q: "Is there a policy for the control of wood and\nexclusion of wood from production areas?" },
          { key: "fbc_04", q: "Is there a policy for the control of metal and\nexclusion of potential metal contaminants from\nproduction areas?" },
          { key: "fbc_05", q: "Is there a policy for the control of knives and\nexclusion of unauthorized knives from the\nproduction area?" },
        ],
      },
      {
        title: "Cleaning",
        type: "yesno",
        items: [
          {
            key: "cln_01",
            q: "Do you have documented cleaning schedules that\ninclude frequency of clean, chemicals used step\nby step instructions and the standard required?",
          },
          { key: "cln_02", q: "Do you monitor cleaning standards?" },
          { key: "cln_03", q: "Is there a separate area away from food\npreparation & storage available for cleaning\nchemicals & equipment storage?" },
          {
            key: "cln_04",
            q: "Do you use Sanitizing Chemicals specifically for\nSanitizing or Disinfecting all food contact\nsurfaces?",
          },
          { key: "cln_05", q: "Do you have effective waste disposal system?" },
        ],
      },
      {
        title: "Pest Control",
        type: "yesno",
        items: [
          { key: "pst_01", q: "Do you have a Contract with Approved Pest\nControl Company?" },
          {
            key: "pst_02",
            q: "Are raw materials, packaging and finished\nproducts stored so as to minimize the risk of\ninfestation?",
          },
          { key: "pst_03", q: "Are all buildings adequately proofed?" },
        ],
      },
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },
  {
    pageTitle: "PAGE 3 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },
      {
        title: "Pest Control (continued)",
        type: "yesno",
        items: [
          {
            key: "pst_04",
            q: "Is there a complete inventory of pesticides\ndetailing the location and safe use and\napplication of baits and other materials such as\ninsecticide sprays or fumigants?",
          },
          { key: "pst_05", q: "Are flying insect controls in place?" },
        ],
      },
      {
        title: "Food Safety & Quality Systems",
        type: "yesno",
        items: [
          {
            key: "fsq_01",
            q: "Do you have a documented Quality and Food\nSafety Policy & Objectives (eg. HACCP,\nISO, HALAL, GMP)?",
          },
          {
            key: "fsq_02",
            q: "Do you have a documented food safety & quality\nassurance manual that includes procedures for:",
          },
          { key: "fsq_02a", q: "Resources and Training?" },
          { key: "fsq_02b", q: "Purchasing and Verification of Purchased\nMaterials?" },
          { key: "fsq_02c", q: "Identification and Traceability?" },
          { key: "fsq_02d", q: "Internal Audit?" },
          { key: "fsq_02e", q: "food complaint reporting procedure with\ncorrective action plan?" },
          { key: "fsq_02f", q: "Corrective Action and Preventive Action?" },
          { key: "fsq_02g", q: "Product Recall?" },
          { key: "fsq_03", q: "Are there maintenance programs for equipment\nand buildings?" },
          {
            key: "fsq_04",
            q: "Is there a system for staff training such that all\nkey personnel are trained and have training\nrecords?",
          },
          {
            key: "fsq_05",
            q: "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?",
          },
          { key: "fsq_06", q: "Do you have laboratory facilities on site and are\nthey accredited?" },
        ],
      },
      {
        title: "If yes, please list any tests carried out on the products supplied",
        type: "fields",
        items: [
          { key: "lab_tests_list", label: "If yes, please list any tests carried out on the\nproducts supplied", kind: "textarea_short" },
          { key: "att_lab_tests", label: "Attach lab test reports (if any)", kind: "attachment" },
        ],
      },
      {
        title: "Do you use outside/contract facilities for any product testing? If yes give details",
        type: "fields",
        items: [
          {
            key: "outside_testing_details",
            label: "Do you use outside/contract facilities for any\nproduct testing? If yes give details",
            kind: "textarea_short",
          },
        ],
      },
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },
  {
    pageTitle: "PAGE 4 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },
      {
        title: "Food Safety & Quality Controls (Raw materials / specs / non-conforming)",
        type: "yesno",
        items: [
          {
            key: "rm_01",
            q: "Do you monitor the quality/safety of your raw\nmaterials and request certificates of\nanalysis/conformity from your suppliers?",
          },
          { key: "rm_02", q: "Do you have a traceability system and maintain\nrecords of batch codes of materials used?" },
          { key: "rm_03", q: "Do you hold specifications for all your raw\nmaterials?" },
          {
            key: "rm_04",
            q: "Do you have procedure for dealing with out of\nspecification/non-conforming raw materials and\nfinished products?",
          },
          { key: "rm_05", q: "Do you have specifications for your finished\nproducts?" },
          { key: "rm_06", q: "Do you test all finished product against your\nspecification?" },
          { key: "rm_07", q: "Do you have a procedure for dealing with non-conforming raw materials and finished products?" },
        ],
      },
      {
        title: "Food Safety & Quality Controls",
        type: "fields",
        items: [
          {
            key: "haccp_copy_note",
            label: "Please provide a copy of your HACCP plans for each product supplied",
            kind: "textarea_short",
          },
          { key: "att_haccp", label: "Attach HACCP plans copy", kind: "attachment" },
        ],
      },
      {
        title: "Food Safety & Quality Controls (process controls)",
        type: "yesno",
        items: [
          { key: "proc_01", q: "Have your critical control points (safety and\nquality) been identified for your production\nprocess?" },
          { key: "proc_02", q: "Is there a temperature monitoring system in\nplace during chilled or frozen storage, heat\nprocessing, cold processing etc.?" },
        ],
      },
      {
        title: "Transportation",
        type: "yesno",
        items: [
          { key: "trn_01", q: "Is the vehicle temperature monitored during\ntransportation?" },
          { key: "trn_02", q: "Is there a cleaning schedule for the vehicles &\nverification system available?" },
          { key: "trn_03", q: "Are all the vehicles holding valid food control\nregulatory approval?" },
        ],
      },
      {
        title: "Production Area Controls",
        type: "yesno",
        items: [
          { key: "prd_01", q: "Are your production methods documented and\navailable on the factory floor?" },
          { key: "prd_02", q: "Are critical measurement devices calibrated to a\nNational Standard?" },
          { key: "prd_03", q: "Do you metal detect your finished product?" },
          {
            key: "prd_04",
            q: "Are all points of entry and ventilation protected\nfrom access by birds, insects, rodents, dust and\ndebris?",
          },
          { key: "prd_05", q: "Do you operate a planned maintenance\nprogramme?" },
        ],
      },
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by: QA", "Authorised By: DIRECTOR"],
      },
    ],
  },
  {
    pageTitle: "PAGE 5 / 5 (نص حرفي)",
    blocks: [
      {
        title: "Supplier Evaluation Form",
        type: "info",
        lines: ["Document Reference Supplier Self-Assessment Form", "Issue Date", "Owned by:QA", "Authorised By: DIRECTOR"],
      },
      {
        title: "Production Area Controls (continued)",
        type: "yesno",
        items: [{ key: "eqp_01", q: "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?" }],
      },
      {
        title: "Declaration",
        type: "fields",
        items: [
          {
            key: "declaration_text",
            label:
              "All products supplied to Trans Emirates livestock Trading LLC comply with all relevant local and\ninternational legislation. The information supplied in this self-audit questionnaire is a true and\naccurate reflection of the production and control systems applied.",
            kind: "readonly",
          },
          { key: "decl_name", label: "Name: .......................................................................", kind: "text" },
          { key: "decl_position", label: "Position Held: ................. ........................................................", kind: "text" },
          { key: "decl_signed", label: "Signed: ...........................................................................", kind: "text" },
          { key: "decl_date", label: "Date: ................................................", kind: "date" },
          { key: "decl_company_seal", label: "Company seal", kind: "text" },
          { key: "att_declaration", label: "Attach signed declaration / company seal scan (optional)", kind: "attachment" },
        ],
      },
    ],
  },
];

/* ===================== UI helpers ===================== */
const THEME = {
  bg:
    "radial-gradient(circle at 12% 10%, rgba(14,165,233,0.14) 0, rgba(255,255,255,1) 46%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 10%, rgba(34,197,94,0.12) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.10) 0, rgba(255,255,255,0) 58%)",
  cardBg: "rgba(255,255,255,0.94)",
  border: "rgba(2,6,23,0.12)",
  text: "#0f172a",
  muted: "#64748b",
  soft: "rgba(2,6,23,0.03)",
};

const UI = {
  en: {
    title: "Supplier Evaluation Form",
    token: "Token",
    link: "Link",
    loading: "Loading...",
    attach: "Attachments",
    uploadDone: "✅ Files uploaded",
    submit: "✅ Submit",
    submitting: "Submitting...",
    selected: "Selected",
    yes: "YES",
    no: "NO",
    na: "N/A",
    thankTitle: "Thank you ✅",
    thankSub: "Your submission has been received.",
    closeNote: "You can close this page now.",
    lang: "Language",
    attachHint: "Attach (optional)",
    addFiles: "Add files",
    upload: "Upload",
    clear: "Clear",
    remove: "Remove",
    saving: "Saving...",
  },
  ar: {
    title: "نموذج تقييم المورد",
    token: "الرمز",
    link: "الرابط",
    loading: "جاري التحميل...",
    attach: "المرفقات",
    uploadDone: "✅ تم رفع الملفات",
    submit: "✅ إرسال",
    submitting: "جاري الإرسال...",
    selected: "المحدد",
    yes: "نعم",
    no: "لا",
    na: "غير متاح",
    thankTitle: "شكرًا ✅",
    thankSub: "تم استلام إجابتك بنجاح.",
    closeNote: "يمكنك إغلاق الصفحة الآن.",
    lang: "اللغة",
    attachHint: "إرفاق (اختياري)",
    addFiles: "إضافة ملفات",
    upload: "رفع",
    clear: "مسح",
    remove: "إزالة",
    saving: "جاري الحفظ...",
  },
};

/* ===================== AR translations for labels/questions/titles ===================== */
const AR_TRANSLATIONS = {
  "PAGE 1 / 5 (نص حرفي)": "الصفحة 1 / 5",
  "PAGE 2 / 5 (نص حرفي)": "الصفحة 2 / 5",
  "PAGE 3 / 5 (نص حرفي)": "الصفحة 3 / 5",
  "PAGE 4 / 5 (نص حرفي)": "الصفحة 4 / 5",
  "PAGE 5 / 5 (نص حرفي)": "الصفحة 5 / 5",

  "Supplier Evaluation Form": "نموذج تقييم المورد",
  "Company Details": "بيانات الشركة",
  "Technical or Quality Manager Contact Details": "بيانات مسؤول الجودة/الفني",
  "Products to be Supplied": "المنتجات المراد توريدها",
  "Certification": "الشهادات",
  "Hygiene": "النظافة",
  "Personal Hygiene (YES/NO)": "النظافة الشخصية (نعم/لا)",
  "Foreign Body Control": "التحكم بالأجسام الغريبة",
  "Cleaning": "التنظيف",
  "Pest Control": "مكافحة الآفات",
  "Pest Control (continued)": "مكافحة الآفات (تكملة)",
  "Food Safety & Quality Systems": "أنظمة سلامة الغذاء والجودة",
  "If yes, please list any tests carried out on the products supplied": "إذا نعم، يرجى ذكر أي فحوصات تُجرى على المنتجات المورّدة",
  "Do you use outside/contract facilities for any product testing? If yes give details":
    "هل تستخدمون مختبرات/جهات خارجية لفحص المنتجات؟ إذا نعم اذكر التفاصيل",
  "Food Safety & Quality Controls (Raw materials / specs / non-conforming)":
    "ضوابط سلامة الغذاء والجودة (مواد خام/مواصفات/غير مطابق)",
  "Food Safety & Quality Controls": "ضوابط سلامة الغذاء والجودة",
  "Food Safety & Quality Controls (process controls)": "ضوابط سلامة الغذاء والجودة (ضوابط العمليات)",
  "Transportation": "النقل",
  "Production Area Controls": "ضوابط مناطق الإنتاج",
  "Production Area Controls (continued)": "ضوابط مناطق الإنتاج (تكملة)",
  "Declaration": "الإقرار",

  "Company Name:": "اسم الشركة:",
  "Address:": "العنوان:",
  "Please provide Head Office address if different\nfrom above:": "يرجى إدخال عنوان المكتب الرئيسي إذا كان مختلفاً عن المذكور أعلاه:",
  "Name of Contact:": "اسم جهة الاتصال:",
  "Position Held:": "المنصب:",
  "Telephone No:": "رقم الهاتف:",
  "What is the total number of employees in your\ncompany?": "كم عدد الموظفين الإجمالي في شركتكم؟",
  "Product Name": "اسم المنتج",
  "Please provide a full product specification with each product supplied": "يرجى توفير المواصفات الكاملة للمنتج مع كل منتج يتم توريده",
  "Attach product specification / spec sheet (PDF, image, etc.)": "إرفاق مواصفات المنتج/ورقة المواصفات (PDF/صورة…)",
  "Are your facilities and products certified to any\nrecognized food safety or quality schemes?":
    "هل مرافقكم ومنتجاتكم معتمدة ضمن أي أنظمة معترف بها لسلامة الغذاء أو الجودة؟",
  "If yes which?": "إذا نعم، ما هي؟",
  "Please provide a copy of your certificates": "يرجى إرفاق/ذكر نسخة من الشهادات",
  "Attach certificates copy": "إرفاق نسخة الشهادات",
  "Have your staffs received any Food Hygiene &\nSafety Training to date & certificate copies are\navailable?":
    "هل تلقى الموظفون تدريباً على نظافة وسلامة الغذاء وهل تتوفر نسخ من الشهادات؟",
  "Attach training certificates (if available)": "إرفاق شهادات التدريب (إن وجدت)",
  "If yes, please list any tests carried out on the\nproducts supplied": "إذا نعم، يرجى ذكر أي فحوصات تُجرى على المنتجات الموردة",
  "Attach lab test reports (if any)": "إرفاق تقارير الفحوصات المخبرية (إن وجدت)",
  "Do you use outside/contract facilities for any\nproduct testing? If yes give details":
    "هل تستخدمون مختبرات/جهات خارجية لفحص المنتجات؟ إذا نعم اذكر التفاصيل",
  "Please provide a copy of your HACCP plans for each product supplied": "يرجى إرفاق نسخة من خطط الهاسب (HACCP) لكل منتج يتم توريده",
  "Attach HACCP plans copy": "إرفاق نسخة خطط HACCP",
  "Name: .......................................................................": "الاسم: .......................................................................",
  "Position Held: ................. ........................................................": "المنصب: ................. ........................................................",
  "Signed: ...........................................................................": "التوقيع: ...........................................................................",
  "Date: ................................................": "التاريخ: ................................................",
  "Company seal": "ختم الشركة",
  "Attach signed declaration / company seal scan (optional)": "إرفاق الإقرار الموقّع/ختم الشركة (اختياري)",

  "Document Reference Supplier Self-Assessment Form": "مرجع الوثيقة: نموذج التقييم الذاتي للمورد",
  "Issue Date": "تاريخ الإصدار",
  "Owned by:QA": "الجهة المالكة: QA",
  "Owned by: QA": "الجهة المالكة: QA",
  "Authorised By: DIRECTOR": "المعتمد من: المدير",
  "Please answer all questions and provide any additional information that you feel is pertinent.":
    "يرجى الإجابة على جميع الأسئلة وإضافة أي معلومات إضافية تراها مناسبة.",

  "Do you have documented Personal Hygiene standards & monitoring procedure?":
    "هل لديكم معايير موثّقة للنظافة الشخصية وإجراءات متابعة/مراقبة؟",
  "Do all food handlers have valid health cards?": "هل جميع العاملين في تداول الغذاء لديهم بطاقات صحية سارية؟",
  "Is there an Illness reporting procedure available?": "هل توجد إجراءات للإبلاغ عن المرض؟",
  "Do the staffs have separate changing facility & toilet away from the food handling area?":
    "هل يوجد للموظفين غرفة تبديل ودورات مياه منفصلة وبعيدة عن منطقة تداول الغذاء؟",

  "Is there a policy for the control of glass and\nexclusion of glass from production areas?":
    "هل توجد سياسة للتحكم بالزجاج واستبعاد الزجاج من مناطق الإنتاج؟",
  "Is there a glass/brittle material breakage\nprocedure?": "هل توجد إجراءات لكسر الزجاج/المواد الهشة؟",
  "Is there a policy for the control of wood and\nexclusion of wood from production areas?":
    "هل توجد سياسة للتحكم بالخشب واستبعاد الخشب من مناطق الإنتاج؟",
  "Is there a policy for the control of metal and\nexclusion of potential metal contaminants from\nproduction areas?":
    "هل توجد سياسة للتحكم بالمعادن واستبعاد الملوثات المعدنية المحتملة من مناطق الإنتاج؟",
  "Is there a policy for the control of knives and\nexclusion of unauthorized knives from the\nproduction area?":
    "هل توجد سياسة للتحكم بالسكاكين ومنع السكاكين غير المصرح بها في منطقة الإنتاج؟",

  "Do you have documented cleaning schedules that\ninclude frequency of clean, chemicals used step\nby step instructions and the standard required?":
    "هل لديكم جداول تنظيف موثّقة تشمل التكرار والمواد الكيميائية وخطوات العمل والمعيار المطلوب؟",
  "Do you monitor cleaning standards?": "هل تراقبون معايير/نتائج التنظيف؟",
  "Is there a separate area away from food\npreparation & storage available for cleaning\nchemicals & equipment storage?":
    "هل توجد منطقة منفصلة بعيداً عن تحضير/تخزين الغذاء لتخزين مواد ومعدات التنظيف؟",
  "Do you use Sanitizing Chemicals specifically for\nSanitizing or Disinfecting all food contact\nsurfaces?":
    "هل تستخدمون مواد تعقيم مخصصة لتعقيم/تطهير جميع الأسطح الملامسة للغذاء؟",
  "Do you have effective waste disposal system?": "هل لديكم نظام فعّال للتخلص من النفايات؟",

  "Do you have a Contract with Approved Pest\nControl Company?": "هل لديكم عقد مع شركة مكافحة آفات معتمدة؟",
  "Are raw materials, packaging and finished\nproducts stored so as to minimize the risk of\ninfestation?":
    "هل يتم تخزين المواد الخام ومواد التعبئة والمنتجات النهائية بطريقة تقلل خطر الإصابة بالآفات؟",
  "Are all buildings adequately proofed?": "هل جميع المباني محكمة لمنع دخول الآفات؟",

  "Is there a complete inventory of pesticides\ndetailing the location and safe use and\napplication of baits and other materials such as\ninsecticide sprays or fumigants?":
    "هل يوجد سجل/جرد كامل للمبيدات يوضح المواقع والاستخدام الآمن وتطبيق الطعوم ومواد مثل الرش أو التبخير؟",
  "Are flying insect controls in place?": "هل توجد وسائل للتحكم بالحشرات الطائرة؟",

  "Do you have a documented Quality and Food\nSafety Policy & Objectives (eg. HACCP,\nISO, HALAL, GMP)?":
    "هل لديكم سياسة وأهداف موثّقة للجودة وسلامة الغذاء (مثل HACCP/ISO/HALAL/GMP)؟",
  "Do you have a documented food safety & quality\nassurance manual that includes procedures for:":
    "هل لديكم دليل موثّق لضمان الجودة وسلامة الغذاء يتضمن إجراءات لـ:",
  "Resources and Training?": "الموارد والتدريب؟",
  "Purchasing and Verification of Purchased\nMaterials?": "الشراء والتحقق من المواد المشتراة؟",
  "Identification and Traceability?": "التعريف والتتبع؟",
  "Internal Audit?": "التدقيق الداخلي؟",
  "food complaint reporting procedure with\ncorrective action plan?": "إجراءات شكاوى الغذاء مع خطة إجراءات تصحيحية؟",
  "Corrective Action and Preventive Action?": "الإجراءات التصحيحية والوقائية؟",
  "Product Recall?": "استدعاء المنتج؟",
  "Are there maintenance programs for equipment\nand buildings?": "هل توجد برامج صيانة للمعدات والمباني؟",
  "Is there a system for staff training such that all\nkey personnel are trained and have training\nrecords?":
    "هل يوجد نظام تدريب للموظفين بحيث يتم تدريب جميع الأشخاص الرئيسيين وتتوفر سجلات تدريب؟",
  "Do you have facilities and systems for the\ntransportation that protects products and prevent\ncontamination?":
    "هل لديكم مرافق وأنظمة للنقل تحمي المنتجات وتمنع التلوث؟",
  "Do you have laboratory facilities on site and are\nthey accredited?": "هل لديكم مختبرات في الموقع وهل هي معتمدة؟",

  "Do you monitor the quality/safety of your raw\nmaterials and request certificates of\nanalysis/conformity from your suppliers?":
    "هل تراقبون جودة/سلامة المواد الخام وتطلبون شهادات تحليل/مطابقة من الموردين؟",
  "Do you have a traceability system and maintain\nrecords of batch codes of materials used?":
    "هل لديكم نظام تتبع وتحتفظون بسجلات أكواد الدُفعات للمواد المستخدمة؟",
  "Do you hold specifications for all your raw\nmaterials?": "هل لديكم مواصفات لجميع المواد الخام؟",
  "Do you have procedure for dealing with out of\nspecification/non-conforming raw materials and\nfinished products?":
    "هل لديكم إجراءات للتعامل مع المواد الخام/المنتجات غير المطابقة للمواصفات؟",
  "Do you have specifications for your finished\nproducts?": "هل لديكم مواصفات للمنتجات النهائية؟",
  "Do you test all finished product against your\nspecification?": "هل تفحصون جميع المنتجات النهائية مقابل المواصفات؟",
  "Do you have a procedure for dealing with non-conforming raw materials and finished products?":
    "هل لديكم إجراءات للتعامل مع المواد الخام والمنتجات غير المطابقة؟",

  "Have your critical control points (safety and\nquality) been identified for your production\nprocess?":
    "هل تم تحديد نقاط التحكم الحرجة (السلامة والجودة) لعملية الإنتاج؟",
  "Is there a temperature monitoring system in\nplace during chilled or frozen storage, heat\nprocessing, cold processing etc.?":
    "هل يوجد نظام مراقبة درجات الحرارة أثناء التخزين المبرد/المجمد أو المعالجة الحرارية/الباردة…؟",

  "Is the vehicle temperature monitored during\ntransportation?": "هل يتم مراقبة درجة حرارة المركبة أثناء النقل؟",
  "Is there a cleaning schedule for the vehicles &\nverification system available?":
    "هل توجد جداول تنظيف للمركبات ونظام تحقق متاح؟",
  "Are all the vehicles holding valid food control\nregulatory approval?": "هل جميع المركبات لديها موافقات رقابية سارية لنقل الغذاء؟",

  "Are your production methods documented and\navailable on the factory floor?":
    "هل طرق الإنتاج موثّقة ومتاحة على أرض المصنع؟",
  "Are critical measurement devices calibrated to a\nNational Standard?":
    "هل تتم معايرة أجهزة القياس الحرجة وفق معيار وطني؟",
  "Do you metal detect your finished product?": "هل تستخدمون جهاز كشف المعادن للمنتج النهائي؟",
  "Are all points of entry and ventilation protected\nfrom access by birds, insects, rodents, dust and\ndebris?":
    "هل جميع نقاط الدخول والتهوية محمية لمنع دخول الطيور/الحشرات/القوارض/الغبار/المخلفات؟",
  "Do you operate a planned maintenance\nprogramme?": "هل تطبقون برنامج صيانة مخطط؟",

  "Is the equipment used in production fit for\npurpose, easy to clean and in a good state of\nrepair?":
    "هل معدات الإنتاج مناسبة للغرض وسهلة التنظيف وبحالة جيدة؟",

  "All products supplied to Trans Emirates livestock Trading LLC comply with all relevant local and\ninternational legislation. The information supplied in this self-audit questionnaire is a true and\naccurate reflection of the production and control systems applied.":
    "جميع المنتجات المورّدة إلى Trans Emirates livestock Trading LLC مطابقة للتشريعات المحلية والدولية ذات الصلة. المعلومات الواردة في هذا الاستبيان هي انعكاس صحيح ودقيق لأنظمة الإنتاج والتحكم المطبقة.",
};

/* ===== translate helper ===== */
function tr(lang, text) {
  if (lang !== "ar") return text;
  const s = String(text ?? "");
  return AR_TRANSLATIONS[s] || s;
}

/* ===================== Component ===================== */
export default function SupplierEvaluationPublic() {
  const { token } = useParams();

  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem("qcs_public_lang");
      if (saved === "ar" || saved === "en") return saved;
    } catch {}
    const navLang = (typeof navigator !== "undefined" && navigator.language) || "en";
    return String(navLang).toLowerCase().startsWith("ar") ? "ar" : "en";
  });

  const t = UI[lang] || UI.en;
  const isRTL = lang === "ar";

  const submittedKey = useMemo(() => `supplier_public_submitted_${String(token || "")}`, [token]);
  const [done, setDone] = useState(() => {
    try {
      return localStorage.getItem(submittedKey) === "1";
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [fields, setFields] = useState(() => {
    const init = {};
    FORM.forEach((p) =>
      p.blocks.forEach((b) => {
        if (b.type === "fields") (b.items || []).forEach((it) => (init[it.key] = ""));
      })
    );
    return init;
  });

  const [answers, setAnswers] = useState(() => {
    const init = {};
    FORM.forEach((p) =>
      p.blocks.forEach((b) => {
        if (b.type === "yesno") (b.items || []).forEach((it) => (init[it.key] = null));
      })
    );
    return init;
  });

  // ✅ per-field attachments stored in map: { [fieldKey]: [{name,url}] }
  const [fieldAttachments, setFieldAttachments] = useState(() => ({}));

  // global attachments (kept)
  const [attachments, setAttachments] = useState([]); // [{name,url}]

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const u = new URL(window.location.href);
      return `${u.origin}${u.pathname}`;
    } catch {
      return window.location.href;
    }
  }, [token]);

  useEffect(() => {
    try {
      localStorage.setItem("qcs_public_lang", lang);
    } catch {}
  }, [lang]);

  // ✅ block back after done
  useEffect(() => {
    if (!done) return;
    try {
      window.history.replaceState(null, "", window.location.href);
      const block = () => window.history.pushState(null, "", window.location.href);
      window.history.pushState(null, "", window.location.href);
      window.addEventListener("popstate", block);
      return () => window.removeEventListener("popstate", block);
    } catch {}
  }, [done]);

  const load = async () => {
    setLoading(true);
    setMsg("");
    try {
      const data = await fetchJson(getInfoEndpoint(token), { method: "GET" });

      const report = data?.report || data?.item || data?.data || data;
      setInfo(report);

      const p = report?.payload || report?.payload_json || report?.data?.payload || report?.item?.payload || {};

      const preFields = p?.fields && typeof p.fields === "object" ? p.fields : {};
      const preAnswers = p?.answers && typeof p.answers === "object" ? p.answers : {};
      const preAttachments = Array.isArray(p?.attachments) ? p.attachments : [];

      // ✅ restore per-field attachments if present
      const preFieldAttachments =
        p?.fieldAttachments && typeof p.fieldAttachments === "object" && !Array.isArray(p.fieldAttachments) ? p.fieldAttachments : {};

      setFields((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(preFields, k)) out[k] = preFields[k];
        });
        Object.keys(preFields).forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = preFields[k];
        });
        return out;
      });

      setAnswers((prev) => {
        const out = { ...prev };
        Object.keys(out).forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(preAnswers, k)) out[k] = preAnswers[k];
        });
        Object.keys(preAnswers).forEach((k) => {
          if (!Object.prototype.hasOwnProperty.call(out, k)) out[k] = preAnswers[k];
        });
        return out;
      });

      setFieldAttachments(preFieldAttachments);
      setAttachments(preAttachments);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Failed to load"} (token: ${token})`);
      setInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!done) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, done]);

  const onField = (key, value) => setFields((p) => ({ ...p, [key]: value }));
  const onToggle = (key, value) => setAnswers((p) => ({ ...p, [key]: value }));

  const pickFilesGlobal = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || done) return;

    setMsg("");
    setSaving(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      setMsg(t.uploadDone);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeGlobalAttachment = (idx) => {
    if (done) return;
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const pickFilesForField = async (fieldKey, fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length || done) return;

    setMsg("");
    setSaving(true);
    try {
      const uploaded = [];
      for (const f of files) {
        const url = await uploadViaServer(f);
        uploaded.push({ name: f.name, url });
      }
      setFieldAttachments((prev) => {
        const cur = Array.isArray(prev?.[fieldKey]) ? prev[fieldKey] : [];
        return { ...prev, [fieldKey]: [...cur, ...uploaded] };
      });
      setMsg(t.uploadDone);
    } catch (e) {
      setMsg(`❌ ${e?.message || "Upload failed"}`);
    } finally {
      setSaving(false);
    }
  };

  const removeFieldAttachment = (fieldKey, idx) => {
    if (done) return;
    setFieldAttachments((prev) => {
      const cur = Array.isArray(prev?.[fieldKey]) ? prev[fieldKey] : [];
      return { ...prev, [fieldKey]: cur.filter((_, i) => i !== idx) };
    });
  };

  const clearFieldAttachments = (fieldKey) => {
    if (done) return;
    setFieldAttachments((prev) => ({ ...prev, [fieldKey]: [] }));
  };

  const submit = async () => {
    if (done) return;
    setMsg("");
    setSaving(true);
    try {
      await fetchJson(getSubmitEndpoint(token), {
        method: "POST",
        body: JSON.stringify({
          // ✅ FIX: add recordDate so Results page can show it reliably
          recordDate: todayISO(),
          fields,
          answers,
          attachments,
          fieldAttachments,
        }),
      });

      try {
        localStorage.setItem(submittedKey, "1");
      } catch {}
      setDone(true);
      setMsg("✅ Submitted successfully");
    } catch (e) {
      setMsg(`❌ ${e?.message || "Submit failed"}`);
    } finally {
      setSaving(false);
    }
  };

  /* ===================== styles (magic touch) ===================== */
  const page = {
    minHeight: "100vh",
    padding: 18,
    direction: isRTL ? "rtl" : "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Arial",
    background: THEME.bg,
    color: THEME.text,
    boxSizing: "border-box",
  };

  const card = {
    width: "100%",
    maxWidth: 980,
    margin: "0 auto",
    background: THEME.cardBg,
    border: `1px solid ${THEME.border}`,
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 16px 38px rgba(2,6,23,0.10)",
    backdropFilter: "blur(10px)",
    boxSizing: "border-box",
  };

  const topbar = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  };

  const pill = {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${THEME.border}`,
    background: "rgba(255,255,255,0.92)",
    fontWeight: 900,
    fontSize: 13,
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  };

  const section = {
    marginTop: 16,
    borderTop: `1px solid ${THEME.border}`,
    paddingTop: 14,
  };

  const input = {
    width: "100%",
    borderRadius: 14,
    border: `1px solid ${THEME.border}`,
    padding: "12px 14px",
    outline: "none",
    background: "#fff",
    fontFamily: "inherit",
    fontSize: 18,
    fontWeight: 800,
    boxSizing: "border-box",
    boxShadow: "0 1px 0 rgba(2,6,23,0.04) inset",
  };

  const textarea = {
    ...input,
    minHeight: 96,
    resize: "vertical",
    lineHeight: 1.5,
  };

  const btn = {
    border: `1px solid ${THEME.border}`,
    background: "#fff",
    borderRadius: 12,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
  };

  const btnSoft = {
    ...btn,
    background: "rgba(2,6,23,0.03)",
  };

  const btnPrimary = (disabled) => ({
    ...btn,
    padding: "12px 14px",
    fontSize: 15,
    background: disabled ? "#f1f5f9" : "linear-gradient(135deg, rgba(14,165,233,0.18), rgba(34,197,94,0.16))",
    border: disabled ? `1px solid ${THEME.border}` : "1px solid rgba(34,197,94,0.28)",
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const toggleBtn = (active, kind) => {
    const base = { ...btn, minWidth: 96, padding: "10px 14px" };
    if (!active) return base;
    if (kind === "yes") return { ...base, background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.30)" };
    if (kind === "no") return { ...base, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)" };
    return { ...base, background: "rgba(148,163,184,0.14)", border: "1px solid rgba(148,163,184,0.30)" };
  };

  const badge = (text) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${THEME.border}`,
    background: "rgba(2,6,23,0.03)",
    color: THEME.muted,
    fontWeight: 900,
    fontSize: 12,
  });

  const fieldWrap = {
    display: "grid",
    gap: 8,
  };

  const labelStyle = {
    fontSize: 13,
    fontWeight: 900,
    color: "#334155",
    whiteSpace: "pre-wrap",
  };

  const box = (bg) => ({
    padding: 14,
    borderRadius: 16,
    border: `1px solid ${THEME.border}`,
    background: bg || "#fff",
  });

  const panel = (tone) => {
    const tones = {
      blue: "rgba(59,130,246,0.06)",
      green: "rgba(34,197,94,0.06)",
      purple: "rgba(168,85,247,0.06)",
      orange: "rgba(249,115,22,0.06)",
      gray: "rgba(2,6,23,0.02)",
    };
    return {
      ...box(tones[tone] || tones.gray),
    };
  };

  const renderField = (it) => {
    if (it.kind === "readonly") {
      return (
        <div style={{ padding: 12, borderRadius: 14, border: `1px dashed ${THEME.border}`, background: THEME.soft }}>
          <div style={{ whiteSpace: "pre-wrap", fontWeight: 900, color: THEME.text, lineHeight: 1.7, fontSize: 14 }}>
            {tr(lang, it.label)}
          </div>
        </div>
      );
    }

    if (it.kind === "attachment") {
      const list = Array.isArray(fieldAttachments?.[it.key]) ? fieldAttachments[it.key] : [];
      const inputId = `att_${it.key}`;
      return (
        <div style={{ ...box("rgba(255,255,255,0.85)"), padding: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <span style={badge(t.attachHint)}>{t.attachHint}</span>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <label htmlFor={inputId} style={{ ...btn, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
                📎 {t.addFiles}
              </label>
              <input
                id={inputId}
                type="file"
                multiple
                onChange={(e) => pickFilesForField(it.key, e.target.files)}
                disabled={saving || done}
                style={{ display: "none" }}
              />

              <button type="button" style={btnSoft} onClick={() => clearFieldAttachments(it.key)} disabled={saving || done || !list.length}>
                {t.clear}
              </button>
            </div>
          </div>

          {list.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {list.map((f, i) => (
                <div
                  key={`${f.url}-${i}`}
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    border: `1px solid ${THEME.border}`,
                    background: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontWeight: 900,
                      color: THEME.text,
                      textDecoration: "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "78%",
                      fontSize: 14,
                    }}
                  >
                    📄 {f.name || `File ${i + 1}`}
                  </a>
                  <button
                    type="button"
                    style={{ ...btn, borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" }}
                    onClick={() => removeFieldAttachment(it.key, i)}
                    disabled={saving || done}
                  >
                    {t.remove}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8, color: THEME.muted, fontWeight: 900, fontSize: 12 }}>{isRTL ? "لا توجد ملفات مرفوعة." : "No files uploaded."}</div>
          )}
        </div>
      );
    }

    if (it.kind === "date") {
      return <input type="date" value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
    }
    if (it.kind === "textarea") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={{ ...textarea, minHeight: 150 }} />;
    }
    if (it.kind === "textarea_short") {
      return <textarea value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={textarea} />;
    }
    return <input value={fields[it.key] || ""} onChange={(e) => onField(it.key, e.target.value)} style={input} />;
  };

  if (loading) {
    return (
      <div style={page}>
        <div style={card}>{t.loading}</div>
      </div>
    );
  }

  if (done) {
    return (
      <div style={page}>
        <div style={card}>
          <div style={topbar}>
            <div style={{ fontWeight: 900, fontSize: 22 }}>{t.thankTitle}</div>

            <span style={pill}>
              {t.lang}:
              <button
                onClick={() => setLang("en")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "en" ? 1 : 0.55 }}
              >
                EN
              </button>
              <span style={{ opacity: 0.35 }}>•</span>
              <button
                onClick={() => setLang("ar")}
                style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "ar" ? 1 : 0.55 }}
              >
                AR
              </button>
            </span>
          </div>

          <div style={{ marginTop: 10, color: THEME.muted, fontWeight: 900 }}>{t.thankSub}</div>
          <div style={{ marginTop: 6, color: THEME.muted, fontWeight: 900, fontSize: 13 }}>{t.closeNote}</div>

          <div style={{ marginTop: 14, padding: 12, borderRadius: 14, border: `1px solid ${THEME.border}`, background: "#fff" }}>
            <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
              {t.token}: <b style={{ color: THEME.text }}>{token}</b>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: THEME.muted, fontWeight: 900 }}>
              {t.link}: <span style={{ wordBreak: "break-word" }}>{shareUrl}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toneByTitle = (title) => {
    const s = String(title || "").toLowerCase();
    if (s.includes("company") || s.includes("details")) return "blue";
    if (s.includes("cert") || s.includes("hygiene")) return "green";
    if (s.includes("food safety") || s.includes("quality")) return "purple";
    if (s.includes("transport") || s.includes("production")) return "orange";
    return "gray";
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={topbar}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, color: THEME.text }}>{t.title}</div>
            <div style={{ marginTop: 6, color: THEME.muted, fontSize: 12, fontWeight: 900 }}>
              {t.token}: <b>{token}</b> • {t.link}: <span style={{ wordBreak: "break-word" }}>{shareUrl}</span>
            </div>
          </div>

          <span style={pill}>
            {t.lang}:
            <button
              onClick={() => setLang("en")}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "en" ? 1 : 0.55 }}
            >
              EN
            </button>
            <span style={{ opacity: 0.35 }}>•</span>
            <button
              onClick={() => setLang("ar")}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, opacity: lang === "ar" ? 1 : 0.55 }}
            >
              AR
            </button>
          </span>
        </div>

        {msg ? (
          <div style={{ marginTop: 12, fontWeight: 900, color: msg.startsWith("✅") ? "#065f46" : "#991b1b" }}>{msg}</div>
        ) : null}

        <div style={section}>
          {FORM.map((p, pIdx) => (
            <div key={pIdx} style={{ marginTop: 14, ...box("#fff") }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ fontWeight: 900, color: THEME.text, fontSize: 14 }}>{tr(lang, p.pageTitle)}</div>
                <div style={badge("Page")}>{String(pIdx + 1)}/5</div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {p.blocks.map((b, bIdx) => (
                  <div key={bIdx} style={panel(toneByTitle(b.title))}>
                    <div style={{ fontWeight: 900, color: THEME.text, fontSize: 15 }}>{tr(lang, b.title)}</div>

                    {b.type === "info" ? (
                      <div style={{ marginTop: 10, whiteSpace: "pre-wrap", color: THEME.text, fontWeight: 900, lineHeight: 1.7, fontSize: 14 }}>
                        {(b.lines || []).map((ln, i) => (
                          <div key={i}>{tr(lang, ln)}</div>
                        ))}
                      </div>
                    ) : null}

                    {b.type === "fields" ? (
                      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 12 }}>
                        {(b.items || [])
                          .filter((it) => it.kind !== "readonly" || String(it.label || "").trim() !== "-----------")
                          .map((it) => (
                            <div key={it.key} style={fieldWrap}>
                              <div style={labelStyle}>{tr(lang, it.label)}</div>
                              {renderField(it)}
                            </div>
                          ))}
                      </div>
                    ) : null}

                    {b.type === "yesno" ? (
                      <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                        {(b.items || []).map((it) => {
                          const v = answers[it.key];
                          return (
                            <div
                              key={it.key}
                              style={{
                                paddingTop: 12,
                                borderTop: `1px dashed ${THEME.border}`,
                              }}
                            >
                              <div style={{ fontWeight: 900, color: THEME.text, whiteSpace: "pre-wrap", fontSize: 15 }}>{tr(lang, it.q)}</div>

                              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <button type="button" style={toggleBtn(v === true, "yes")} onClick={() => onToggle(it.key, true)}>
                                  {t.yes}
                                </button>
                                <button type="button" style={toggleBtn(v === false, "no")} onClick={() => onToggle(it.key, false)}>
                                  {t.no}
                                </button>
                                <button type="button" style={toggleBtn(v === null, "na")} onClick={() => onToggle(it.key, null)}>
                                  {t.na}
                                </button>

                                <div
                                  style={{
                                    marginLeft: isRTL ? 0 : 6,
                                    marginRight: isRTL ? 6 : 0,
                                    fontSize: 12,
                                    fontWeight: 900,
                                    color: THEME.muted,
                                  }}
                                >
                                  {t.selected}:{" "}
                                  <b style={{ color: v === true ? "#065f46" : v === false ? "#991b1b" : THEME.muted }}>
                                    {v === true ? (lang === "ar" ? "نعم" : "YES") : v === false ? (lang === "ar" ? "لا" : "NO") : lang === "ar" ? "غير متاح" : "N/A"}
                                  </b>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Global Attachments (kept) */}
        <div style={section}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 900, color: THEME.text, marginBottom: 2 }}>{t.attach}</div>
            <span style={badge("General")}>{isRTL ? "مرفقات عامة" : "General files"}</span>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label htmlFor="global_files" style={{ ...btn, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
              📎 {t.addFiles}
            </label>
            <input id="global_files" type="file" multiple onChange={(e) => pickFilesGlobal(e.target.files)} disabled={saving || done} style={{ display: "none" }} />
            <span style={{ color: THEME.muted, fontWeight: 900, fontSize: 12 }}>{saving ? t.saving : ""}</span>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {attachments.map((f, i) => (
              <div
                key={`${f.url}-${i}`}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  border: `1px solid ${THEME.border}`,
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 900,
                    color: THEME.text,
                    textDecoration: "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "78%",
                    fontSize: 14,
                  }}
                >
                  📎 {f.name || `File ${i + 1}`}
                </a>
                <button
                  type="button"
                  style={{ ...btn, borderColor: "rgba(239,68,68,0.35)", color: "#991b1b" }}
                  onClick={() => removeGlobalAttachment(i)}
                  disabled={saving || done}
                >
                  {t.remove}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: THEME.muted, fontWeight: 900, fontSize: 12 }}>{info?.created_at ? `${isRTL ? "تم الإنشاء:" : "Created:"} ${String(info.created_at)}` : ""}</div>

          <button style={btnPrimary(saving)} onClick={submit} disabled={saving || done}>
            {saving ? t.submitting : t.submit}
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px){
          div[style*="gridTemplateColumns: repeat(auto-fit, minmax(360px, 1fr))"]{
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
