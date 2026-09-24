// Attachment-only fields from SupplierEvaluationPublic.  This intentionally
// excludes free-text answers, product rows and the general upload area: the
// missing-documents request must only refer to a named upload control in the
// supplier questionnaire.

const ALL = ["food", "cleaning_chemicals", "packaging", "services", "other"];

export const SUPPLIER_ATTACHMENT_FIELDS = [
  {
    key: "att_certificates",
    types: ALL,
    label: "Certificates copy",
    labelAr: "نسخ الشهادات",
  },
  {
    key: "att_hygiene_training",
    types: ALL,
    label: "Training certificates (if available)",
    labelAr: "شهادات التدريب (إن وُجدت)",
  },
  {
    key: "att_lab_tests",
    types: ["food"],
    label: "Laboratory test reports (if any)",
    labelAr: "تقارير الفحوصات المخبرية (إن وُجدت)",
  },
  {
    key: "att_haccp",
    types: ["food"],
    label: "HACCP plans copy",
    labelAr: "نسخة من خطط الهاسب HACCP",
  },
  {
    key: "att_sds",
    types: ["cleaning_chemicals"],
    label: "Safety Data Sheets (SDS/MSDS) for all products supplied",
    labelAr: "صحائف بيانات السلامة SDS/MSDS لجميع المنتجات الموردة",
  },
  {
    key: "att_labels",
    types: ["cleaning_chemicals"],
    label: "Sample product labels (optional)",
    labelAr: "نماذج ملصقات المنتجات (اختياري)",
  },
  {
    key: "att_coa",
    types: ["cleaning_chemicals"],
    label: "Sample Certificate of Analysis (COA)",
    labelAr: "نموذج شهادة تحليل COA",
  },
  {
    key: "att_doc",
    types: ["packaging"],
    label: "Declaration of Compliance (DOC)",
    labelAr: "إقرار المطابقة DOC",
  },
  {
    key: "att_migration",
    types: ["packaging"],
    label: "Migration test reports (if available)",
    labelAr: "تقارير اختبار الهجرة (إن وُجدت)",
  },
  {
    key: "att_srv_license",
    types: ["services"],
    label: "Trade license / municipal permit / professional registration",
    labelAr: "الرخصة التجارية / تصريح البلدية / التسجيل المهني",
  },
  {
    key: "att_srv_insurance",
    types: ["services"],
    label: "Liability insurance certificate (optional)",
    labelAr: "شهادة تأمين المسؤولية (اختياري)",
  },
  {
    key: "att_srv_report",
    types: ["services"],
    label: "Sample service report / certificate (optional)",
    labelAr: "نموذج تقرير / شهادة خدمة (اختياري)",
  },
  {
    key: "att_srv_sds",
    types: ["services"],
    label: "SDS for chemicals used (if applicable)",
    labelAr: "صحائف SDS للمواد الكيميائية المستخدمة (إن انطبق)",
  },
  {
    key: "att_oth_specs",
    types: ["other"],
    label: "Product specifications / datasheets",
    labelAr: "مواصفات المنتجات / البطاقات الفنية",
  },
  {
    key: "att_trade_license",
    types: ALL,
    label: "Trade / Company License (Commercial Registration)",
    labelAr: "الرخصة التجارية / رخصة الشركة (السجل التجاري)",
  },
  {
    key: "att_vehicle_dm_card",
    types: ALL,
    label: "Vehicle Registration / Dubai Municipality (DM) Card — if you deliver by your own vehicle",
    labelAr: "تسجيل المركبة / بطاقة بلدية دبي — عند التوصيل بمركباتكم",
  },
  {
    key: "att_msds",
    types: ALL,
    label: "MSDS / Safety Data Sheets — if products contain chemicals / hazardous substances",
    labelAr: "صحائف MSDS / بيانات السلامة — إذا احتوت المنتجات على مواد كيميائية أو خطرة",
  },
  {
    key: "att_coc_packaging",
    types: ALL,
    label: "Certificate of Conformity — Packaging Materials (food-contact)",
    labelAr: "شهادة مطابقة لمواد التعبئة والتغليف الملامسة للغذاء",
  },
];

export function attachmentFieldsForSupplierType(type) {
  const normalized = String(type || "other").toLowerCase();
  return SUPPLIER_ATTACHMENT_FIELDS.filter((field) => field.types.includes(normalized));
}

export function readFieldAttachments(payload) {
  const p = payload || {};
  const candidates = [
    p.fieldAttachments,
    p.submission?.fieldAttachments,
    p.public?.submission?.fieldAttachments,
  ];
  return candidates.find((value) => value && typeof value === "object" && !Array.isArray(value)) || {};
}
