// src/pages/haccp and iso/FSMSManual/fsmsContent.js
// FSMS Manual — Static (hard-coded) content
// Source: TELT-FSMS-MN-01 Rev. 02 / 01-04-2026
// All content is FIXED. Edits made via UI are stored on the server as overrides.

export const FSMS_META = {
  title: "FOOD SAFETY MANAGEMENT SYSTEM MANUAL",
  titleAr: "دليل نظام إدارة سلامة الغذاء",
  standard: "ISO 22000:2018",
  company: "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
  brand: "AL MAWASHI",
  referenceNumber: "TELT-FSMS-MN-01",
  revision: "02",
  date: "01-04-2026",
  prepared: { name: "Jaseem P", role: "Quality Controller" },
  reviewed: { name: "Mohamed", role: "Quality In Charge" },
  approved: { name: "Hussam. O. Sarhan", role: "Executive Manager" },
};

/* ============================================================
   CHAPTERS — Sidebar groups
   ============================================================ */
export const FSMS_CHAPTERS = [
  { id: "doc-control", icon: "📋", title: "Document Control", titleAr: "إدارة الوثيقة" },
  { id: "intro",       icon: "🏢", title: "Introduction & Company Profile", titleAr: "المقدمة وملف الشركة" },
  { id: "clause-1-3",  icon: "📖", title: "1–3. Scope, References & Definitions", titleAr: "1-3. النطاق والمراجع والتعاريف" },
  { id: "clause-4",    icon: "🌐", title: "4. Context of the Organization", titleAr: "4. سياق المنظمة" },
  { id: "clause-5",    icon: "👔", title: "5. Leadership", titleAr: "5. القيادة" },
  { id: "clause-6",    icon: "🎯", title: "6. Planning", titleAr: "6. التخطيط" },
  { id: "clause-7",    icon: "🤝", title: "7. Support", titleAr: "7. الدعم" },
  { id: "clause-8",    icon: "⚙️", title: "8. Operation", titleAr: "8. التشغيل" },
  { id: "clause-9",    icon: "📊", title: "9. Performance Evaluation", titleAr: "9. تقييم الأداء" },
  { id: "clause-10",   icon: "📈", title: "10. Improvement", titleAr: "10. التحسين" },
  { id: "products",    icon: "🥩", title: "Product Description", titleAr: "وصف المنتجات" },
  { id: "flow",        icon: "🔄", title: "Process Flow Diagrams", titleAr: "مخططات تدفق العمليات" },
  { id: "hazard",      icon: "⚠️", title: "Hazard Analysis", titleAr: "تحليل المخاطر" },
  { id: "ccp",         icon: "🎯", title: "CCP Summary", titleAr: "ملخص نقاط التحكم الحرجة" },
  { id: "haccp-plan",  icon: "📕", title: "HACCP Plan", titleAr: "خطة HACCP" },
];

/* ============================================================
   LINKS — Map each clause to the related app module
   ============================================================ */
export const FSMS_MODULE_LINKS = {
  "0.5": { route: "/haccp-iso/fsms-manual?section=0.5", label: "Amendment Sheet" },
  "4.2": { route: "/haccp-iso/supplier-evaluation", label: "Supplier Evaluation" },
  "4.4": { route: "/haccp-iso/licenses-contracts/view", label: "Licenses & Contracts" },
  "5.2": { route: "/haccp-iso/fsms-manual?section=5.2", label: "Org Chart" },
  "7.2": { route: "/training", label: "Training Module" },
  "7.3": { route: "/training", label: "Awareness / Training" },
  "7.5": { route: "/haccp-iso/sop-ssop", label: "SOP & sSOP" },
  "8.2": { route: "/haccp-iso/sop-ssop", label: "PRPs (SOPs)" },
  "8.3": { route: "/haccp-iso/mock-recall/view", label: "Traceability — Mock Recall" },
  "8.5": { route: "/haccp-iso/ccp-monitoring/view", label: "CCP Monitoring" },
  "8.7": { route: "/haccp-iso/fsms-manual?section=8.7", label: "Calibration" },
  "8.9.5": { route: "/haccp-iso/mock-recall/view", label: "Withdrawal / Recall" },
  "9.2": { route: "/internal-audit-reports", label: "Internal Audit Reports" },
  "products": { route: "/haccp-iso/product-details/view", label: "Product Details" },
  "ccp": { route: "/haccp-iso/ccp-monitoring/view", label: "CCP Monitoring" },
  "haccp-plan": { route: "/haccp-iso/ccp-monitoring/view", label: "CCP Monitoring" },
  "dm-inspection": { route: "/haccp-iso/dm-inspection/view", label: "DM Inspection" },
};

/* ============================================================
   SECTIONS — All FSMS Manual content
   ============================================================ */
export const FSMS_SECTIONS = [
  /* ─────────── DOCUMENT CONTROL ─────────── */
  {
    id: "0.1", clause: "0.1", chapter: "doc-control",
    title: "Approval",
    titleAr: "الاعتماد",
    type: "approval",
    body:
      "The signature below certifies that this ISO 22000:2018 manual has been reviewed and accepted; and demonstrates that the signatories are aware of all the requirements contained herein and are committed to ensuring their provision.",
    bodyAr:
      "التوقيع أدناه يشهد بأن هذا الدليل الخاص بـ ISO 22000:2018 قد تم مراجعته وقبوله، ويُظهر أن الموقّعين على دراية بجميع المتطلبات الواردة فيه وملتزمون بضمان تطبيقها.",
    table: {
      headers: ["Role", "Name", "Position", "Signature", "Date"],
      rows: [
        ["Prepared by", "Jaseem P", "Quality Controller", "—", "01-04-2026"],
        ["Reviewed by", "Mohamed", "Quality In Charge", "—", "01-04-2026"],
        ["Approved by", "Hussam. O. Sarhan", "Executive Manager", "—", "01-04-2026"],
      ],
    },
    tableAr: {
      headers: ["الدور", "الاسم", "المنصب", "التوقيع", "التاريخ"],
      rows: [
        ["أعدّه",   "جاسم ب",          "مراقب جودة",      "—", "01-04-2026"],
        ["راجعه",   "محمد",            "مسؤول الجودة",    "—", "01-04-2026"],
        ["اعتمده",  "حسام عمر سرحان", "المدير التنفيذي", "—", "01-04-2026"],
      ],
    },
  },
  {
    id: "0.2", clause: "0.2", chapter: "doc-control",
    title: "Document Distribution & Control",
    titleAr: "توزيع وضبط الوثيقة",
    type: "table",
    body: "",
    table: {
      headers: ["Copy Number", "Type", "Department/Holder", "Control Status"],
      rows: [
        ["01", "Master Copy", "FSMS Team Leader", "Controlled"],
        ["02", "Control Copy", "QA Department", "Controlled"],
        ["03", "Control Copy", "Certification Body", "Controlled"],
      ],
    },
    tableAr: {
      headers: ["رقم النسخة", "النوع", "القسم/الجهة المُمسِكة", "حالة الضبط"],
      rows: [
        ["01", "النسخة الأم",  "قائد فريق FSMS",   "مضبوطة"],
        ["02", "نسخة مضبوطة", "قسم ضمان الجودة",   "مضبوطة"],
        ["03", "نسخة مضبوطة", "جهة اعتماد الشهادات", "مضبوطة"],
      ],
    },
  },
  {
    id: "0.3", clause: "0.3", chapter: "doc-control",
    title: "Authentication Statement",
    titleAr: "بيان التوثيق",
    type: "text",
    body:
      "The Top Management states that this FSMS Manual is the original authenticated one. The procedures and activities detailed in this manual are true and correct to the best of our knowledge. Stating that this manual follows the code mentioned in the LLC Standard of ISO 22000:2018 in accordance with FSMS (Hazard Analysis Critical Control Points). This manual consists of references to SOPs (Standard Operating Procedures), procedures, DM guidelines, formats/records and FSMS plans.",
    bodyAr:
      "تُقرّ الإدارة العليا بأن هذا الدليل الخاص بنظام إدارة سلامة الغذاء (FSMS) هو الدليل الأصلي المعتمد. الإجراءات والأنشطة المفصّلة في هذا الدليل صحيحة وحقيقية وفقاً لأفضل ما نعلم. ويتبع هذا الدليل المعيار ISO 22000:2018 وفق نظام FSMS (تحليل المخاطر ونقاط التحكم الحرجة). يتضمن الدليل مراجع لإجراءات التشغيل الموحّدة (SOPs)، والإجراءات، وتعليمات بلدية دبي، والنماذج/السجلات، وخطط FSMS.",
  },
  {
    id: "0.4", clause: "0.4", chapter: "doc-control",
    title: "Company Proprietary Information",
    titleAr: "معلومات ملكية الشركة",
    type: "text",
    body:
      "This document is the property of Trans Emirates Livestock Trading LLC and contains confidential information related to the Food Safety Management System (FSMS).\n\nThe electronic version of this document is considered the latest and controlled version. It is the responsibility of all users to ensure they are referring to the current version before use.\n\nAny printed copy of this document is considered an uncontrolled copy, unless it is specifically issued as a controlled copy with an authorized reference number and revision status. The control, distribution, and updating of this document are the responsibility of the FSMS Team Leader.\n\nUnauthorized copying, distribution, or use of this document is strictly prohibited.",
    bodyAr:
      "هذه الوثيقة ملك لشركة Trans Emirates Livestock Trading LLC وتحتوي على معلومات سرية متعلقة بنظام إدارة سلامة الغذاء (FSMS).\n\nالنسخة الإلكترونية من هذه الوثيقة تُعتبر النسخة الأحدث والمضبوطة. ومسؤولية جميع المستخدمين التأكد من رجوعهم للنسخة الحالية قبل الاستخدام.\n\nأي نسخة مطبوعة من هذه الوثيقة تُعتبر نسخة غير مضبوطة، إلا إذا تم إصدارها بصورة محددة كنسخة مضبوطة برقم مرجعي معتمد وحالة مراجعة. ضبط وتوزيع وتحديث هذه الوثيقة من مسؤولية قائد فريق FSMS.\n\nالنسخ أو التوزيع أو الاستخدام غير المرخّص لهذه الوثيقة ممنوع منعاً باتاً.",
    table: {
      headers: ["Reference Number", "Revision Number", "Date", "Uncontrolled Copy", "Controlled Copy"],
      rows: [["TELT-FSMS-MN-01", "02", "01-04-2026", "—", "Yes"]],
    },
    tableAr: {
      headers: ["الرقم المرجعي", "رقم المراجعة", "التاريخ", "نسخة غير مضبوطة", "نسخة مضبوطة"],
      rows: [["TELT-FSMS-MN-01", "02", "01-04-2026", "—", "نعم"]],
    },
  },
  {
    id: "0.5", clause: "0.5", chapter: "doc-control",
    title: "Amendment Sheet",
    titleAr: "صفحة التعديلات",
    type: "table",
    body:
      "This FSMS Manual is reviewed to ensure its continuing relevance to the systems and processes that it describes. A record of contextual additions or omissions is given below.",
    bodyAr:
      "تتم مراجعة دليل FSMS هذا لضمان استمرار ملاءمته للأنظمة والعمليات التي يصفها. يُورَد أدناه سجلٌ بالإضافات أو الحذف السياقية.",
    table: {
      headers: ["Clause/Section", "Description Of Change", "Rev. No.", "Date", "Reason for Amendment", "Prepared by", "Approved by"],
      rows: [
        ["Clause 4.1 & 4.2", "Updated context of organization including internal & external issues and interested parties", "2", "01-04-2026", "System improvement & compliance with ISO 22000:2018 requirements", "FSMS Team", "Top Management"],
        ["Clause 5.3", "Updated organizational chart including all branches (Abu Dhabi, Al Ain, etc.)", "2", "01-04-2026", "Organizational structure update", "FSMS Team", "Top Management"],
        ["Clause 6.1", "Added new document FSMS-RA-01 – FSMS Planning and Risk Management Procedure", "2", "01-04-2026", "Risk-based thinking implementation", "FSMS Team", "Top Management"],
        ["Clause 8.5.1", "Updated product description and process flow diagrams for all product categories", "2", "01-04-2026", "Process update & product scope revision", "FSMS Team", "Top Management"],
        ["Clause 8.5.2", "Updated hazard analysis including biological, chemical, and physical hazards", "2", "01-04-2026", "HACCP review and improvement", "FSMS Team", "Top Management"],
        ["Clause 8.5.3", "Updated CCP validation details and supporting records", "2", "01-04-2026", "Validation improvement & compliance", "FSMS Team", "Top Management"],
        ["Clause 8.5", "HACCP Plan reviewed and updated based on latest hazard analysis and process changes", "2", "01-04-2026", "Annual review & system improvement", "FSMS Team", "Top Management"],
      ],
    },
    tableAr: {
      headers: ["البند/القسم", "وصف التغيير", "رقم المراجعة", "التاريخ", "سبب التعديل", "أعدّه", "اعتمده"],
      rows: [
        ["البند 4.1 و 4.2", "تحديث سياق المنظمة شاملاً المسائل الداخلية والخارجية والأطراف المعنية", "2", "01-04-2026", "تحسين النظام والامتثال لمتطلبات ISO 22000:2018", "فريق FSMS", "الإدارة العليا"],
        ["البند 5.3",       "تحديث المخطط التنظيمي شاملاً جميع الفروع (أبوظبي، العين، إلخ)",         "2", "01-04-2026", "تحديث الهيكل التنظيمي",                     "فريق FSMS", "الإدارة العليا"],
        ["البند 6.1",       "إضافة وثيقة جديدة FSMS-RA-01 — إجراء تخطيط FSMS وإدارة المخاطر",       "2", "01-04-2026", "تطبيق التفكير القائم على المخاطر",         "فريق FSMS", "الإدارة العليا"],
        ["البند 8.5.1",     "تحديث وصف المنتج ومخططات تدفق العمليات لجميع فئات المنتجات",         "2", "01-04-2026", "تحديث العملية ومراجعة نطاق المنتج",        "فريق FSMS", "الإدارة العليا"],
        ["البند 8.5.2",     "تحديث تحليل المخاطر شاملاً المخاطر البيولوجية والكيميائية والفيزيائية", "2", "01-04-2026", "مراجعة وتحسين HACCP",                       "فريق FSMS", "الإدارة العليا"],
        ["البند 8.5.3",     "تحديث تفاصيل التحقق من CCP والسجلات الداعمة",                          "2", "01-04-2026", "تحسين التحقق والامتثال",                    "فريق FSMS", "الإدارة العليا"],
        ["البند 8.5",       "مراجعة وتحديث خطة HACCP بناءً على آخر تحليل مخاطر وتغييرات العمليات", "2", "01-04-2026", "المراجعة السنوية وتحسين النظام",            "فريق FSMS", "الإدارة العليا"],
      ],
    },
  },
  {
    id: "0.6", clause: "0.6", chapter: "doc-control",
    title: "List of Abbreviations",
    titleAr: "قائمة الاختصارات",
    type: "table",
    body: "",
    table: {
      headers: ["#", "Acronym", "Details"],
      rows: [
        ["1",  "FSMS TL", "Food Safety Management System Team Leader"],
        ["2",  "MRM",     "Management Review Meeting"],
        ["3",  "ISO",     "International Organization for Standardization"],
        ["4",  "R & A",   "Responsibility and Authority"],
        ["5",  "Doc.",    "Document"],
        ["6",  "No.",     "Number"],
        ["7",  "Ref",     "Reference"],
        ["8",  "NC",      "Non-Conformity"],
        ["9",  "CAR",     "Corrective Action Request"],
        ["10", "HOD",     "Head of Department"],
        ["11", "PO's",    "Process Owners"],
        ["12", "FSMS",    "Food Safety Management System"],
        ["13", "HACCP",   "Hazard Analysis Critical Control Point"],
        ["14", "CCP",     "Critical Control Point"],
        ["15", "OPRP",    "Operational Pre-Requisite Programme"],
        ["16", "PRP",     "Pre-Requisite Programme"],
        ["17", "SOP",     "Standard Operating Procedure"],
        ["18", "SSOP",    "Sanitation Standard Operating Procedure"],
        ["19", "GHP",     "Good Hygiene Practice"],
        ["20", "GMP",     "Good Manufacturing Practice"],
        ["21", "DM",      "Dubai Municipality"],
        ["22", "ADAFSA",  "Abu Dhabi Agriculture & Food Safety Authority"],
        ["23", "QA/QC",   "Quality Assurance / Quality Control"],
        ["24", "COA",     "Certificate of Analysis"],
        ["25", "PPE",     "Personal Protective Equipment"],
      ],
    },
    tableAr: {
      headers: ["#", "الاختصار", "التفاصيل"],
      rows: [
        ["1",  "FSMS TL", "قائد فريق نظام إدارة سلامة الغذاء"],
        ["2",  "MRM",     "اجتماع مراجعة الإدارة"],
        ["3",  "ISO",     "المنظمة الدولية للتقييس"],
        ["4",  "R & A",   "المسؤولية والصلاحية"],
        ["5",  "Doc.",    "وثيقة"],
        ["6",  "No.",     "رقم"],
        ["7",  "Ref",     "مرجع"],
        ["8",  "NC",      "عدم مطابقة"],
        ["9",  "CAR",     "طلب إجراء تصحيحي"],
        ["10", "HOD",     "رئيس القسم"],
        ["11", "PO's",    "أصحاب العمليات"],
        ["12", "FSMS",    "نظام إدارة سلامة الغذاء"],
        ["13", "HACCP",   "تحليل المخاطر ونقاط التحكم الحرجة"],
        ["14", "CCP",     "نقطة تحكم حرجة"],
        ["15", "OPRP",    "برنامج مسبق تشغيلي"],
        ["16", "PRP",     "برنامج مسبق"],
        ["17", "SOP",     "إجراء تشغيل موحّد"],
        ["18", "SSOP",    "إجراء صرف صحي موحّد"],
        ["19", "GHP",     "ممارسات النظافة الجيدة"],
        ["20", "GMP",     "ممارسات التصنيع الجيدة"],
        ["21", "DM",      "بلدية دبي"],
        ["22", "ADAFSA",  "هيئة أبوظبي للزراعة والسلامة الغذائية"],
        ["23", "QA/QC",   "ضمان الجودة / مراقبة الجودة"],
        ["24", "COA",     "شهادة تحليل"],
        ["25", "PPE",     "معدات الوقاية الشخصية"],
      ],
    },
  },

  /* ─────────── INTRODUCTION & COMPANY PROFILE ─────────── */
  {
    id: "0.7", clause: "0.7", chapter: "intro",
    title: "0.7 Introduction",
    titleAr: "0.7 المقدمة",
    type: "text",
    body:
      "TELT LLC has developed and implemented FSMS to improve its overall performance in food safety for all processes of receiving, storage, and trading of meat & offals etc.\n\nThe implementation of FSMS based on this document includes:\n• The ability to consistently provide safe food, products and services that meet customer applicable and statutory and regulatory requirements;\n• Addressing risks associated with our objectives;\n• The ability to demonstrate conformity to specified FSMS requirements.\n\nFSMS Manual reflects ISO 22000:2018 in accordance with FSMS, which is strictly adhered to in TELT LLC and is in accordance with the applicable clauses of FSMS. This manual is a controlled document with a specified trading list. Uncontrolled copies, although, may be provided at the discretion of Top Management.\n\nThe purpose of this manual is to:\n• Define the scope of Food Safety Management System;\n• Address the risks associated with the process(es);\n• Describe the interactions between the processes of Food Safety Management System;\n• Define the authorities and responsibilities of the Manager personnel;\n• Provide general procedures (or reference to them) for all activities comprising the Food Safety Management System;\n• Present our FSMS Manual to our customer(s) or other interested parties in order to inform them what specific controls are in place and implemented for effective quality assurance.",
    bodyAr:
      "قامت شركة TELT LLC بتطوير وتطبيق نظام إدارة سلامة الغذاء (FSMS) لتحسين أدائها العام في سلامة الغذاء لجميع عمليات الاستلام والتخزين وتجارة اللحوم والأحشاء وغيرها.\n\nيتضمن تطبيق FSMS بناءً على هذه الوثيقة ما يلي:\n• القدرة على توفير غذاء ومنتجات وخدمات آمنة بشكل مستمر تلبي متطلبات العميل والمتطلبات القانونية والتنظيمية المعمول بها؛\n• معالجة المخاطر المرتبطة بأهدافنا؛\n• القدرة على إثبات المطابقة لمتطلبات FSMS المحددة.\n\nيعكس دليل FSMS معيار ISO 22000:2018 وفقاً لـ FSMS، والذي يُلتزم به بصرامة في TELT LLC ويتوافق مع البنود المعمول بها. هذا الدليل وثيقة مضبوطة بقائمة توزيع محددة. ومع ذلك، قد يتم توفير نسخ غير مضبوطة وفقاً لتقدير الإدارة العليا.\n\nالغرض من هذا الدليل هو:\n• تحديد نطاق نظام إدارة سلامة الغذاء؛\n• معالجة المخاطر المرتبطة بالعمليات؛\n• وصف التفاعلات بين عمليات نظام إدارة سلامة الغذاء؛\n• تحديد صلاحيات ومسؤوليات الموظفين الإداريين؛\n• توفير إجراءات عامة (أو مراجع لها) لجميع الأنشطة المكوّنة لنظام إدارة سلامة الغذاء؛\n• تقديم دليل FSMS لعملائنا أو الأطراف المعنية الأخرى لإطلاعهم على الضوابط المحددة المعمول بها لضمان الجودة الفعّال.",
  },
  {
    id: "0.7A", clause: "0.7 (A)", chapter: "intro",
    title: "Company Profile",
    titleAr: "ملف الشركة",
    type: "table-and-text",
    body:
      "Trans Emirates Livestock Trading L.L.C. is a subsidiary of Livestock Transport & Trading Co. P.S.C. (Al Mawashi), established in the United Arab Emirates in 1982, for the purpose of trading in livestock and meat products. Al Mawashi was established in Kuwait in 1973, as a public shareholding company for the purpose of production process of all types of meat, transporting and trading in them all over the State of Kuwait and abroad.\n\nIn the United Arab Emirates, Al Mawashi owns and runs the best covered feedlot facility in the MENA region — recognized by MLA — located at Jebel Ali Free Zone, with the capacity of receiving 100,000 sheep at once. Al Mawashi imports to the UAE livestock and fresh meat products from Australia to supply it to the local market.\n\nAl Mawashi operates main head office in Kuwait and their branches in UAE, Australia and South Africa. There are 3 sales outlets in UAE: Al Qusais, Sharjah and Abu Dhabi.",
    bodyAr:
      "Trans Emirates Livestock Trading L.L.C. هي شركة تابعة لشركة Livestock Transport & Trading Co. P.S.C. (المواشي)، تأسست في الإمارات العربية المتحدة عام 1982 لغرض تجارة الماشية ومنتجات اللحوم. تأسست المواشي في الكويت عام 1973 كشركة مساهمة عامة لغرض إنتاج جميع أنواع اللحوم ونقلها وتجارتها في جميع أنحاء دولة الكويت والخارج.\n\nفي الإمارات العربية المتحدة، تمتلك المواشي وتدير أفضل منشأة تسمين مغطّاة في منطقة الشرق الأوسط وشمال إفريقيا — معترف بها من MLA — وتقع في المنطقة الحرة بجبل علي، بطاقة استيعابية 100,000 رأس غنم في وقت واحد. تستورد المواشي إلى الإمارات الماشية ومنتجات اللحوم الطازجة من أستراليا لتوريدها للسوق المحلية.\n\nتُدير المواشي مكتبها الرئيسي في الكويت وفروعها في الإمارات وأستراليا وجنوب إفريقيا. هناك 3 منافذ بيع في الإمارات: القصيص، الشارقة، أبوظبي.",
    table: {
      headers: ["Field", "Value"],
      rows: [
        ["Name", "TRANS EMIRATES LIVESTOCK TRADING LLC"],
        ["Factory Address", "Opposite Zulaikha Hospital, Near Al Kabeer, Warehouse 2 & 3"],
        ["Telephone No", "+971 4 880 1118"],
        ["Email", "supportuae@kltt.com.kw"],
        ["Website", "www.almawashi.com.kw"],
        ["Head of Business", "Mr. Hussam. O. Sarhan"],
        ["Trade License No", "204208"],
      ],
    },
    tableAr: {
      headers: ["البيان", "القيمة"],
      rows: [
        ["الاسم", "TRANS EMIRATES LIVESTOCK TRADING LLC"],
        ["عنوان المصنع", "مقابل مستشفى زليخة، بالقرب من الكبير، المستودع 2 و 3"],
        ["رقم الهاتف", "+971 4 880 1118"],
        ["البريد الإلكتروني", "supportuae@kltt.com.kw"],
        ["الموقع الإلكتروني", "www.almawashi.com.kw"],
        ["رئيس الأعمال", "السيد حسام عمر سرحان"],
        ["رقم الرخصة التجارية", "204208"],
      ],
    },
  },
  {
    id: "0.7B", clause: "0.7 (B)", chapter: "intro",
    title: "Vision, Mission & Legal Identity",
    titleAr: "الرؤية والرسالة والهوية القانونية",
    type: "text",
    body:
      "Vision:\nTo be recognized as a world-class, competitive and premier distributor of meat.\n\nMission:\nTo exceed clients' expectations and to become a benchmark in terms of services in the competitive market.\n\nLegal Identity:\nTELT LLC Head Quarters — Deira-Muraqabat, Dubai.",
    bodyAr:
      "الرؤية:\nأن يتم الاعتراف بنا كموزّع رائد للحوم ذو مستوى عالمي وقدرة تنافسية.\n\nالرسالة:\nتجاوز توقعات العملاء وأن نصبح مرجعاً في الخدمات في السوق التنافسية.\n\nالهوية القانونية:\nمكتب TELT LLC الرئيسي — ديرة-المراقبات، دبي.",
  },
  {
    id: "0.7C", clause: "0.7 (C)", chapter: "intro",
    title: "Process Approach & PDCA Cycle",
    titleAr: "نهج العملية ودورة PDCA",
    type: "text",
    images: [
      { src: "/haccp-manual-images/image5.jpeg", caption: "Figure: Illustration of Plan-Do-Check-Act (PDCA) Cycle", captionAr: "شكل: توضيح دورة التخطيط-التنفيذ-الفحص-العمل (PDCA)" },
    ],
    body:
      "This document adopts a process approach when developing and implementing FSMS and improving its effectiveness to enhance production of safe products and services while meeting applicable requirements. Understanding and managing inter-related processes as a system contributes to our organization's effectiveness and efficiency in achieving its intended results.\n\nManagement of processes and the system is achieved by using the PDCA cycle, with an overall focus on risk-based thinking aimed at taking advantage of opportunities and preventing undesirable results.\n\nPDCA Cycle:\n• Plan — Establish the objectives of the system and its processes, provide the resources needed to deliver the results, and identify and address risks and opportunities.\n• Do — Implement what was planned.\n• Check — Monitor and (where relevant) measure processes and the resulting products and services, analyze and evaluate information and data from monitoring, measuring and verification activities; and report the results.\n• Act — Take actions to improve performance, as necessary.",
    bodyAr:
      "تعتمد هذه الوثيقة نهج العملية عند تطوير وتطبيق FSMS وتحسين فعاليته لتعزيز إنتاج منتجات وخدمات آمنة مع تلبية المتطلبات المعمول بها. فهم وإدارة العمليات المترابطة كنظام يُسهم في فعالية وكفاءة منظمتنا في تحقيق النتائج المرجوّة.\n\nيتم إدارة العمليات والنظام باستخدام دورة PDCA، مع التركيز العام على التفكير القائم على المخاطر بهدف الاستفادة من الفرص ومنع النتائج غير المرغوب فيها.\n\nدورة PDCA:\n• التخطيط (Plan) — تحديد أهداف النظام وعملياته، توفير الموارد اللازمة لتحقيق النتائج، وتحديد ومعالجة المخاطر والفرص.\n• التنفيذ (Do) — تنفيذ ما تم التخطيط له.\n• الفحص (Check) — مراقبة وقياس العمليات والمنتجات والخدمات الناتجة (حيثما كان ذلك مناسباً)، تحليل وتقييم المعلومات والبيانات من أنشطة المراقبة والقياس والتحقق؛ والإبلاغ عن النتائج.\n• العمل (Act) — اتخاذ الإجراءات اللازمة لتحسين الأداء حسب الحاجة.",
  },

  /* ─────────── CLAUSE 1–3 ─────────── */
  {
    id: "1.1", clause: "1.1", chapter: "clause-1-3",
    title: "1.1 General & Scope",
    titleAr: "1.1 عام والنطاق",
    type: "text",
    body:
      "TELT has developed and implemented FSMS to consistently satisfy the needs of its customers and improve the product safety management of the company. The FSMS complies with ISO 22000:2018 and covers product-safety-related activities of the concerned departments of the company. This also aims to enhance customer satisfaction through the effective application of the system, for continual improvement of the system and the assurance of conformity to customer and applicable regulatory requirements.\n\nQuality and safety are strictly monitored from steps which include raw material receiving, storage, preparation, and delivery of food items.\n\nScope of FSMS: \"Receiving, storage, trading of livestock, meat & offals.\"",
    bodyAr:
      "قامت TELT بتطوير وتطبيق FSMS لتلبية احتياجات عملائها بشكل مستمر وتحسين إدارة سلامة المنتج في الشركة. يتوافق FSMS مع ISO 22000:2018 ويغطي الأنشطة المتعلقة بسلامة المنتج للأقسام المعنية في الشركة. كما يهدف إلى تعزيز رضا العملاء من خلال التطبيق الفعّال للنظام، للتحسين المستمر للنظام وضمان المطابقة لمتطلبات العميل والمتطلبات التنظيمية المعمول بها.\n\nتتم مراقبة الجودة والسلامة بصرامة من خطوات تشمل استلام المواد الخام والتخزين والتحضير وتسليم الأصناف الغذائية.\n\nنطاق FSMS: \"الاستلام، التخزين، تجارة الماشية واللحوم والأحشاء.\"",
  },
  {
    id: "1.2", clause: "1.2", chapter: "clause-1-3",
    title: "1.2 Application",
    titleAr: "1.2 التطبيق",
    type: "text",
    body:
      "TELT's Food Safety Management System is relevant to the nature of its organization and services and to customer and regulatory requirements.\n\nThe FSMS study covers products from the moment they are registered in TELT database of qualified products to the time they are served to the customers. All potential hazards to customer safety have been identified and appropriate control measures are established to minimize/reduce their risk to acceptable levels.\n\nThe hazards considered include microbiological, chemical, allergen and physical, including foreign matter and defects in packaging.",
    bodyAr:
      "نظام إدارة سلامة الغذاء في TELT يتلاءم مع طبيعة المنظمة وخدماتها ومع متطلبات العملاء والمتطلبات التنظيمية.\n\nتشمل دراسة FSMS المنتجات من لحظة تسجيلها في قاعدة بيانات المنتجات المؤهلة لدى TELT إلى لحظة تقديمها للعملاء. تم تحديد جميع المخاطر المحتملة على سلامة العميل، وتم وضع تدابير تحكم مناسبة لتقليل/تخفيض مخاطرها إلى مستويات مقبولة.\n\nتشمل المخاطر التي تم النظر فيها: المخاطر الميكروبيولوجية والكيميائية والمواد المسببة للحساسية والمخاطر الفيزيائية، بما في ذلك الأجسام الغريبة وعيوب التغليف.",
  },
  {
    id: "2.0", clause: "2.0", chapter: "clause-1-3",
    title: "2.0 Normative References",
    titleAr: "2.0 المراجع المعيارية",
    type: "text",
    body:
      "The following referenced documents are indispensable for the application of this document:\n• ISO 22000:2018 — Food safety management systems\n• Quality Management System (ISO 2018)\n• Dubai Municipality Food Code\n• ADAFSA regulatory requirements (where applicable)",
    bodyAr:
      "الوثائق المرجعية التالية لا غنى عنها لتطبيق هذه الوثيقة:\n• ISO 22000:2018 — أنظمة إدارة سلامة الغذاء\n• نظام إدارة الجودة (ISO 2018)\n• كود الغذاء لبلدية دبي\n• متطلبات هيئة أبوظبي للزراعة والسلامة الغذائية ADAFSA (حيثما ينطبق)",
  },
  {
    id: "3.0", clause: "3.0", chapter: "clause-1-3",
    title: "3.0 Definitions",
    titleAr: "3.0 التعاريف",
    type: "definitions",
    body: "For the purpose of this FSMS standard, the terms and definitions given in ISO 22000:2018 apply.",
    bodyAr: "لأغراض معيار FSMS هذا، تنطبق المصطلحات والتعاريف الواردة في ISO 22000:2018.",
    items: [
      ["Acceptable Level", "Level of a food safety hazard not to be exceeded in end-product provided by the organization."],
      ["Action Criterion", "Measurable or observable specification for the monitoring of an OPRP."],
      ["Audit", "Systematic, independent and documented process for obtaining audit evidence and evaluating it objectively."],
      ["Competence", "Ability to apply knowledge and skills to achieve intended results."],
      ["Conformity", "Fulfillment of a requirement."],
      ["Contamination", "Introduction or occurrence of a contaminant including a food safety hazard in a product or processing environment."],
      ["Continual Improvement", "Recurring activity to enhance performance."],
      ["Control Measure", "Action or activity that is essential to prevent a significant food safety hazard or reduce it to an acceptable level."],
      ["Correction", "Action to eliminate a detected non-conformity."],
      ["Corrective Action", "Action to eliminate the cause of a non-conformity and to prevent recurrence."],
      ["Critical Control Point (CCP)", "Step at which control measure(s) are applied to prevent or reduce a significant food safety hazard to an acceptable level, with defined critical limits."],
      ["Documented Information", "Information required to be controlled and maintained by an organization and the medium on which it is contained."],
      ["Flow Diagram", "Schematic and systematic presentation of the sequence and interactions of steps in the process."],
      ["Food Safety", "Assurance that food will not cause an adverse health effect for the consumer when prepared and/or consumed in accordance with its intended use."],
      ["Food Safety Hazard", "Biological, chemical or physical agent in food with the potential to cause an adverse health effect."],
      ["Monitoring", "Determining the status of a system, process or activity."],
      ["Non-conformity", "Non-fulfilment of a requirement."],
      ["Outsource", "Arrangement where an external organization performs part of an organization's function or process."],
      ["Significant Food Safety Hazard", "Food safety hazard, identified through hazard assessment, which needs to be controlled by control measures."],
      ["Top Management", "Person or group of people that directs and controls an organization at the highest level."],
      ["Traceability", "Ability to follow the history, application, movement and location of an object through specified stage(s) of production, processing and trading."],
      ["Verification", "Confirmation, through provision of objective evidence, that specified requirements have been fulfilled."],
    ],
  },

  /* ─────────── CLAUSE 4 ─────────── */
  {
    id: "4.1", clause: "4.1", chapter: "clause-4",
    title: "4.1 Understanding the Organization and its Context",
    titleAr: "4.1 فهم المنظمة وسياقها",
    type: "text",
    body:
      "TELT's industry provides livestock trading and meat (Mutton, Beef, Veal) and Offals to the following group of customers: Multinational chains / brands, restaurants and outlets, retail market.\n\nThe organization operates in the handling, processing, storage, and distribution of meat and meat products. In order to ensure food safety and compliance with applicable requirements, the organization determines internal and external issues that are relevant to its purpose and that may affect its ability to achieve the intended outcomes of the Food Safety Management System.\n\nAll internal and external issues are reviewed annually during Management Review Meeting and updated based on changes in business, regulatory, or operational conditions.",
    bodyAr:
      "تقدم TELT خدمات تجارة الماشية واللحوم (الضأن، البقر، العجل) والأحشاء لمجموعة العملاء التالية: السلاسل/العلامات التجارية متعددة الجنسيات، المطاعم والمنافذ، أسواق التجزئة.\n\nتعمل المنظمة في تداول ومعالجة وتخزين وتوزيع اللحوم ومنتجات اللحوم. ولضمان سلامة الغذاء والامتثال للمتطلبات المعمول بها، تحدد المنظمة المسائل الداخلية والخارجية ذات الصلة بهدفها والتي قد تؤثر على قدرتها على تحقيق النتائج المرجوّة من نظام إدارة سلامة الغذاء.\n\nيتم مراجعة جميع المسائل الداخلية والخارجية سنوياً خلال اجتماع مراجعة الإدارة وتحديثها بناءً على التغييرات في ظروف العمل أو التنظيمية أو التشغيلية.",
  },
  {
    id: "4.1A", clause: "4.1 (Internal Issues)", chapter: "clause-4",
    title: "Internal Issues",
    titleAr: "المسائل الداخلية",
    type: "table",
    body: "",
    table: {
      headers: ["Category", "Description", "Potential Impact on FSMS", "Control Measures"],
      rows: [
        ["Temperature Control", "Chiller temperature failure", "Growth of pathogenic bacteria, spoilage of meat products", "Daily temperature monitoring, calibration, alarm system, corrective action procedure"],
        ["Facility Change", "Facility recently moved to a new location", "Risk of non-compliance and improper layout", "Risk assessment, layout validation, management review"],
        ["Training & Competence", "Lack of trained staff", "Improper handling and contamination", "Training program, induction, competency evaluation"],
        ["Communication", "Lack of communication between QC, production, and logistics", "Delays and food safety risks", "Defined communication system, meetings"],
        ["Storage Capacity", "Lack of space for dry store and packaging materials", "Improper storage and contamination", "Proper layout, segregation, 5S"],
        ["Documentation", "Poor documentation and record keeping", "Lack of traceability", "Document control system and records"],
        ["Material Handling", "Poor material handling", "Physical contamination and damage", "Handling SOP and supervision"],
        ["Management Involvement", "Insufficient management involvement", "Weak FSMS implementation", "Management review and defined responsibilities"],
        ["Infrastructure & Hygiene", "Poor infrastructure hygiene", "Contamination and pest attraction", "Cleaning schedule and maintenance"],
        ["Preventive Maintenance", "Lack of maintenance, floor damage", "Contamination and safety hazards", "Preventive maintenance plan"],
      ],
    },
    tableAr: {
      headers: ["الفئة", "الوصف", "التأثير المحتمل على FSMS", "تدابير التحكم"],
      rows: [
        ["التحكم في الحرارة",     "تعطّل درجة حرارة الثلاجة",                            "نمو البكتيريا المُمرضة، تلف منتجات اللحوم",      "مراقبة الحرارة يومياً، معايرة، نظام إنذار، إجراء تصحيحي"],
        ["تغيير المنشأة",         "انتقال المنشأة حديثاً إلى موقع جديد",                  "خطر عدم المطابقة وسوء التخطيط",                "تقييم المخاطر، التحقق من التخطيط، مراجعة الإدارة"],
        ["التدريب والكفاءة",       "نقص في الموظفين المدرَّبين",                            "تداول غير سليم وتلوث",                          "برنامج تدريب، توجيه، تقييم الكفاءة"],
        ["التواصل",                 "نقص التواصل بين QC والإنتاج واللوجستيات",             "تأخيرات ومخاطر سلامة غذاء",                     "نظام تواصل محدد، اجتماعات"],
        ["سعة التخزين",             "نقص المساحة للمخازن الجافة ومواد التعبئة",            "تخزين غير سليم وتلوث",                          "تخطيط مناسب، فصل، 5S"],
        ["التوثيق",                "ضعف التوثيق وحفظ السجلات",                              "قلّة التتبع",                                    "نظام ضبط الوثائق والسجلات"],
        ["تداول المواد",            "تداول سيء للمواد",                                      "تلوث فيزيائي وضرر",                              "إجراء تشغيل موحّد للتداول وإشراف"],
        ["مشاركة الإدارة",          "مشاركة إدارية غير كافية",                              "تطبيق ضعيف لـ FSMS",                            "مراجعة الإدارة ومسؤوليات محددة"],
        ["البنية التحتية والنظافة", "نظافة بنية تحتية سيئة",                                "تلوث وجذب للآفات",                              "جدول تنظيف وصيانة"],
        ["الصيانة الوقائية",        "نقص الصيانة، تلف الأرضيات",                            "تلوث ومخاطر سلامة",                              "خطة صيانة وقائية"],
      ],
    },
  },
  {
    id: "4.1B", clause: "4.1 (External Issues)", chapter: "clause-4",
    title: "External Issues",
    titleAr: "المسائل الخارجية",
    type: "table",
    body: "",
    table: {
      headers: ["Category", "Description", "Potential Impact on FSMS", "Control Measures"],
      rows: [
        ["Regulatory Requirements", "Changes in UAE food safety laws and municipality requirements", "Non-compliance, audit failure", "Regular updates, compliance monitoring, audits"],
        ["Supplier Quality", "Variation in quality of meat from suppliers", "Receiving unsafe or non-conforming products", "Approved supplier list, supplier evaluation, COA verification"],
        ["Environmental Conditions", "High ambient temperature in UAE", "Cold chain failure, rapid microbial growth", "Temperature-controlled transport, monitoring, insulated vehicles"],
        ["Transportation & Logistics", "Delays or improper handling during delivery", "Product spoilage, temperature abuse", "Proper logistics planning, temperature monitoring, SOPs"],
        ["Customer Requirements", "Specific requirements for quality and delivery", "Customer dissatisfaction, complaints", "Clear communication, customer specifications, QA checks"],
        ["Market Competition", "Pressure to reduce costs or increase speed", "Risk of compromising food safety", "Maintain strict FSMS controls"],
        ["Pest Activity (External)", "Pest presence in surrounding area", "Risk of contamination entering facility", "Pest control program, sealing, monitoring"],
        ["Utility Services", "Power failure or water supply issues", "Chiller failure, hygiene issues", "Backup generators, contingency plan"],
        ["External Contractors", "Maintenance or pest control services", "Risk of improper work affecting hygiene", "Contractor approval, supervision, service agreements"],
        ["Legal & Compliance", "New food safety or export/import regulations", "Legal penalties, loss of certification", "Compliance tracking, management review"],
        ["Waste Management", "External waste handling and disposal system", "Cross-contamination, pest attraction, non-compliance", "Waste SOPs, proper segregation, licensed waste contractors"],
        ["Natural Disasters (Flood)", "Heavy rain or flooding affecting facility, transport, or suppliers", "Disruption of operations, transport delays, product shortage", "Emergency preparedness plan, insurance, alternative transport, backup storage"],
        ["Political / Security Risks", "Conflict or instability affecting supply chain or market", "Delayed shipments, reduced demand, price surge", "Business continuity plan, alternative suppliers, stock management"],
      ],
    },
    tableAr: {
      headers: ["الفئة", "الوصف", "التأثير المحتمل على FSMS", "تدابير التحكم"],
      rows: [
        ["المتطلبات التنظيمية",      "تغييرات في قوانين سلامة الغذاء الإماراتية ومتطلبات البلدية",     "عدم مطابقة، فشل في التدقيق",          "تحديثات منتظمة، مراقبة الامتثال، تدقيقات"],
        ["جودة المورد",               "اختلاف في جودة اللحوم من الموردين",                                  "استلام منتجات غير آمنة أو غير مطابقة", "قائمة موردين معتمدين، تقييم الموردين، التحقق من COA"],
        ["الظروف البيئية",             "درجة حرارة محيطة عالية في الإمارات",                                  "فشل سلسلة التبريد، نمو ميكروبي سريع",  "نقل بدرجة حرارة مضبوطة، مراقبة، مركبات معزولة"],
        ["النقل واللوجستيات",          "تأخيرات أو تداول غير سليم أثناء التسليم",                            "تلف المنتج، إساءة استخدام درجة الحرارة", "تخطيط لوجستي مناسب، مراقبة الحرارة، إجراءات تشغيل"],
        ["متطلبات العملاء",            "متطلبات محددة للجودة والتسليم",                                      "عدم رضا العميل، شكاوى",                "تواصل واضح، مواصفات العميل، فحوص ضمان الجودة"],
        ["المنافسة في السوق",          "ضغط لتقليل التكاليف أو زيادة السرعة",                                "خطر المساس بسلامة الغذاء",            "الحفاظ على ضوابط FSMS الصارمة"],
        ["نشاط الآفات (الخارجي)",      "وجود آفات في المنطقة المحيطة",                                       "خطر دخول التلوث إلى المنشأة",         "برنامج مكافحة الآفات، الإحكام، المراقبة"],
        ["خدمات المرافق",              "انقطاع التيار الكهربائي أو مشاكل في إمداد المياه",                  "تعطّل الثلاجات، مشاكل النظافة",        "مولّدات احتياطية، خطة طوارئ"],
        ["المقاولون الخارجيون",        "خدمات الصيانة أو مكافحة الآفات",                                     "خطر عمل غير سليم يؤثر على النظافة",  "اعتماد المقاولين، إشراف، اتفاقيات خدمة"],
        ["القانوني والامتثال",         "لوائح جديدة لسلامة الغذاء أو الاستيراد/التصدير",                    "عقوبات قانونية، فقدان الشهادة",       "تتبع الامتثال، مراجعة الإدارة"],
        ["إدارة النفايات",             "نظام تداول النفايات والتخلص الخارجي",                                "تلوث متبادل، جذب الآفات، عدم مطابقة",  "إجراءات تشغيل للنفايات، فصل سليم، مقاولو نفايات مرخّصون"],
        ["الكوارث الطبيعية (فيضان)",   "أمطار غزيرة أو فيضانات تؤثر على المنشأة أو النقل أو الموردين",      "تعطل العمليات، تأخر النقل، نقص المنتج", "خطة تأهب للطوارئ، تأمين، نقل بديل، تخزين احتياطي"],
        ["مخاطر سياسية / أمنية",       "صراع أو عدم استقرار يؤثر على سلسلة التوريد أو السوق",              "تأخر الشحنات، انخفاض الطلب، ارتفاع الأسعار", "خطة استمرارية الأعمال، موردون بدلاء، إدارة المخزون"],
      ],
    },
  },
  {
    id: "4.2", clause: "4.2", chapter: "clause-4",
    title: "4.2 Understanding the Needs and Expectations of Interested Parties",
    titleAr: "4.2 فهم احتياجات وتوقعات الأطراف المعنية",
    type: "table",
    body:
      "The purpose is to identify all relevant interested parties that can affect or be affected by the FSMS, and to determine their requirements to ensure consistent delivery of safe and high-quality meat products.",
    bodyAr:
      "الغرض هو تحديد جميع الأطراف المعنية ذات الصلة التي يمكن أن تؤثر على FSMS أو تتأثر به، وتحديد متطلباتها لضمان التسليم المستمر لمنتجات لحوم آمنة وعالية الجودة.",
    table: {
      headers: ["Interested Party", "Type", "Needs / Expectations", "Compliance / Communication Method"],
      rows: [
        ["Dubai Municipality / ADAFSA", "External", "Compliance with food safety, hygiene, and halal regulations; periodic inspections; temperature and traceability records.", "Maintain valid permits, inspection reports, and corrective actions."],
        ["Customers / Retailers / Distributors", "External", "Safe, hygienic, properly labeled, and halal-certified meat products; on-time delivery; product traceability.", "Customer feedback, complaint handling, and specification compliance."],
        ["Suppliers / Transporters", "External", "Clear product specifications, approved supplier list, temperature control during transport.", "Supplier audits, delivery checks, and agreements."],
        ["Employees / Workers", "Internal", "Safe working environment, hygiene facilities, training, PPE availability.", "Training records, feedback, and safety meetings."],
        ["Top Management / Owners", "Internal", "Compliance with ISO 22000, legal requirements, customer satisfaction, business continuity.", "FSMS review meetings, performance reports."],
        ["Certification Body / Auditors", "External", "Evidence of FSMS implementation and continual improvement.", "Audit reports, documented procedures, corrective actions."],
        ["Consumers / End Users", "External", "Safe, fresh, and halal meat products; correct labeling and expiry information.", "Complaint records, labeling checks, customer surveys."],
        ["Maintenance & Pest Control Contractors", "External", "Clear hygiene and safety requirements for working inside food zones.", "Contractor training, work permits, and monitoring reports."],
        ["Health & Safety Authority", "External", "Compliance with occupational health and safety standards.", "Staff medical fitness, health card validity, and inspection compliance."],
      ],
    },
    tableAr: {
      headers: ["الطرف المعني", "النوع", "الاحتياجات / التوقعات", "طريقة الامتثال / التواصل"],
      rows: [
        ["بلدية دبي / ADAFSA",                  "خارجي", "الامتثال للوائح سلامة الغذاء والنظافة والحلال؛ التفتيشات الدورية؛ سجلات الحرارة والتتبع.", "الحفاظ على تصاريح سارية، تقارير التفتيش، الإجراءات التصحيحية."],
        ["العملاء / تجار التجزئة / الموزعون",  "خارجي", "منتجات لحوم آمنة وصحية ومُلصقة بشكل صحيح وحلال؛ تسليم في الوقت؛ تتبع المنتج.",            "ملاحظات العملاء، التعامل مع الشكاوى، الامتثال للمواصفات."],
        ["الموردون / الناقلون",                  "خارجي", "مواصفات منتجات واضحة، قائمة موردين معتمدين، التحكم في الحرارة أثناء النقل.",                 "تدقيقات الموردين، فحوص التسليم، اتفاقيات."],
        ["الموظفون / العمال",                    "داخلي", "بيئة عمل آمنة، مرافق نظافة، تدريب، توفر معدات الوقاية الشخصية.",                              "سجلات التدريب، الملاحظات، اجتماعات السلامة."],
        ["الإدارة العليا / المُلّاك",             "داخلي", "الامتثال لـ ISO 22000، المتطلبات القانونية، رضا العميل، استمرارية الأعمال.",                  "اجتماعات مراجعة FSMS، تقارير الأداء."],
        ["جهة الاعتماد / المُدقّقون",             "خارجي", "دليل على تطبيق FSMS والتحسين المستمر.",                                                     "تقارير التدقيق، إجراءات موثّقة، إجراءات تصحيحية."],
        ["المستهلكون / المستخدمون النهائيون",     "خارجي", "منتجات لحوم آمنة وطازجة وحلال؛ ملصقات صحيحة ومعلومات انتهاء صحيحة.",                       "سجلات الشكاوى، فحوص الملصقات، استبيانات العملاء."],
        ["مقاولو الصيانة ومكافحة الآفات",         "خارجي", "متطلبات نظافة وسلامة واضحة للعمل داخل مناطق الأغذية.",                                       "تدريب المقاولين، تصاريح عمل، تقارير المراقبة."],
        ["هيئة الصحة والسلامة",                    "خارجي", "الامتثال لمعايير الصحة والسلامة المهنية.",                                                  "اللياقة الطبية للموظفين، صحة بطاقة الصحة، الامتثال للتفتيش."],
      ],
    },
  },
  {
    id: "4.3", clause: "4.3", chapter: "clause-4",
    title: "4.3 Monitoring and Review of Interested Parties",
    titleAr: "4.3 مراقبة ومراجعة الأطراف المعنية",
    type: "text",
    body:
      "TELT ensures that:\n• Interested parties and their requirements are reviewed annually\n• Changes (legal, market, supplier issues) are updated regularly\n• Feedback from customers and authorities is analyzed and recorded\n\nThe identified needs and expectations are integrated into the FSMS through:\n• HACCP Plan (food safety hazards control)\n• PRPs (cleaning, hygiene, pest control, maintenance)\n• Supplier Approval Program\n• Training Programs\n• Traceability and Recall System\n• Internal Audit and Management Review",
    bodyAr:
      "تضمن TELT ما يلي:\n• مراجعة الأطراف المعنية ومتطلباتها سنوياً\n• تحديث التغييرات (قانونية، سوقية، قضايا الموردين) بانتظام\n• تحليل وتسجيل ملاحظات العملاء والجهات الرسمية\n\nيتم دمج الاحتياجات والتوقعات المحددة في FSMS من خلال:\n• خطة HACCP (التحكم في مخاطر سلامة الغذاء)\n• البرامج المسبقة PRPs (التنظيف، النظافة، مكافحة الآفات، الصيانة)\n• برنامج اعتماد الموردين\n• برامج التدريب\n• نظام التتبع والاسترجاع\n• التدقيق الداخلي ومراجعة الإدارة",
  },
  {
    id: "4.4", clause: "4.4", chapter: "clause-4",
    title: "4.4 Determine the Scope of FSMS",
    titleAr: "4.4 تحديد نطاق نظام إدارة سلامة الغذاء",
    type: "text",
    body:
      "TELT has developed and implemented a Food Safety Management System to consistently satisfy the needs of its customers and improve the product safety management of the company. The FSMS complies with ISO 22000:2018 and covers all activities related to the handling of meat and meat products, including receiving, storage, processing, cutting, packaging, and distribution.\n\nThe system is implemented at the facility located opposite Zulaikha Hospital, Near Al Kabeer, Warehouse 2 & 3, and applies to all departments involved in food handling operations.\n\nThe FSMS applies to the following products:\n• Fresh chilled meat\n• Frozen meat\n• Meat cuts and portioned products\n• Sausages\n• Dry meat\n• Poultry, etc.\n\nThe following processes are included within the scope:\n• Receiving of raw materials (meat, poultry, and dry items)\n• Chilled and frozen storage\n• Cutting and processing\n• Packaging and labeling\n• Dispatch and distribution",
    bodyAr:
      "قامت TELT بتطوير وتطبيق نظام إدارة سلامة الغذاء لتلبية احتياجات عملائها بشكل مستمر وتحسين إدارة سلامة المنتج في الشركة. يتوافق FSMS مع ISO 22000:2018 ويغطي جميع الأنشطة المتعلقة بتداول اللحوم ومنتجات اللحوم، بما في ذلك الاستلام والتخزين والمعالجة والتقطيع والتعبئة والتوزيع.\n\nيتم تطبيق النظام في المنشأة الواقعة مقابل مستشفى زليخة، بالقرب من الكبير، المستودع 2 و 3، ويُطبق على جميع الأقسام المشاركة في عمليات تداول الغذاء.\n\nيُطبق FSMS على المنتجات التالية:\n• اللحم المبرد الطازج\n• اللحم المجمد\n• قطع اللحم والمنتجات المقسّمة\n• النقانق\n• اللحم المجفّف\n• الدواجن، إلخ.\n\nالعمليات التالية مشمولة في النطاق:\n• استلام المواد الخام (اللحوم، الدواجن، الأصناف الجافة)\n• التخزين المبرد والمجمد\n• التقطيع والمعالجة\n• التعبئة ووضع الملصقات\n• الإرسال والتوزيع",
  },
  {
    id: "4.5", clause: "4.5", chapter: "clause-4",
    title: "4.5 Food Safety Management System",
    titleAr: "4.5 نظام إدارة سلامة الغذاء",
    type: "text",
    body:
      "TELT LLC has established, implemented and maintained an FSMS and continually updates and improves its effectiveness in accordance with the requirements of ISO 22000:2018. TELT LLC has defined the scope of FSMS. The scope specifies the products or product categories that are addressed by the FSMS.",
    bodyAr:
      "قامت TELT LLC بإنشاء وتطبيق وصيانة نظام FSMS وتحديثه وتحسين فعاليته بشكل مستمر وفقاً لمتطلبات ISO 22000:2018. حددت TELT LLC نطاق FSMS. يحدد النطاق المنتجات أو فئات المنتجات التي يتناولها FSMS.",
  },

  /* ─────────── CLAUSE 5 ─────────── */
  {
    id: "5.1", clause: "5.1", chapter: "clause-5",
    title: "5.1 Leadership and Commitment",
    titleAr: "5.1 القيادة والالتزام",
    type: "text",
    body:
      "Top management demonstrates leadership and commitment with respect to the Food Safety Management System by:\n• Ensuring the food safety policy and objectives are established and compatible with the strategic direction of the organization\n• Integrating FSMS requirements into the organization's business processes\n• Providing necessary resources (human, infrastructure, and environment)\n• Communicating the importance of effective food safety management and compliance with FSMS requirements\n• Ensuring that the FSMS achieves its intended outcomes\n• Directing and supporting persons to contribute to the effectiveness of the FSMS\n• Promoting continual improvement\n• Supporting other relevant management roles to demonstrate their leadership.\n\nFood Safety Culture:\nTop management shall establish, promote, and maintain a positive food safety culture throughout the organization. This is achieved by promoting awareness, leading by example, ensuring compliance with applicable legal requirements (including Dubai Municipality Food Safety Department), providing adequate resources, and ensuring all employees understand their roles in food safety.\n\nFood safety culture is measured using internal audit results, hygiene inspection scores, training effectiveness, and the number of reported food safety incidents.",
    bodyAr:
      "تُظهر الإدارة العليا القيادة والالتزام تجاه نظام إدارة سلامة الغذاء من خلال:\n• ضمان وضع سياسة وأهداف سلامة الغذاء وتوافقها مع التوجه الاستراتيجي للمنظمة\n• دمج متطلبات FSMS في عمليات أعمال المنظمة\n• توفير الموارد اللازمة (البشرية والبنية التحتية والبيئية)\n• إيصال أهمية الإدارة الفعّالة لسلامة الغذاء والامتثال لمتطلبات FSMS\n• ضمان تحقيق FSMS للنتائج المرجوّة\n• توجيه ودعم الأشخاص للمساهمة في فعالية FSMS\n• تعزيز التحسين المستمر\n• دعم الأدوار الإدارية الأخرى ذات الصلة لإظهار قيادتهم.\n\nثقافة سلامة الغذاء:\nيجب على الإدارة العليا إنشاء وتعزيز والحفاظ على ثقافة إيجابية لسلامة الغذاء في جميع أنحاء المنظمة. يتحقق ذلك من خلال تعزيز الوعي، والقيادة بالقدوة، وضمان الامتثال للمتطلبات القانونية المعمول بها (بما في ذلك إدارة سلامة الغذاء في بلدية دبي)، وتوفير الموارد الكافية، وضمان فهم جميع الموظفين لأدوارهم في سلامة الغذاء.\n\nيُقاس ثقافة سلامة الغذاء باستخدام نتائج التدقيق الداخلي، ودرجات التفتيش الصحي، وفعالية التدريب، وعدد حوادث سلامة الغذاء المبلَّغ عنها.",
  },
  {
    id: "5.2", clause: "5.2", chapter: "clause-5",
    title: "5.2 Food Safety Policy",
    titleAr: "5.2 سياسة سلامة الغذاء",
    type: "text",
    body:
      "TELT is committed to providing safe, hygienic, and high-quality meat and meat products that meet customer requirements and applicable legal and regulatory standards.\n\nWe implement and maintain a Food Safety Management System based on ISO 22000:2018 and HACCP principles.\n\nWe ensure continuous improvement, prevention of food safety hazards, and strict adherence to hygiene and quality standards.\n\nThis policy is communicated, understood, and implemented at all levels of the organization and is reviewed periodically for suitability and effectiveness.\n\nThe food safety policy is communicated to all employees, displayed within the workplace, explained during training sessions and reviewed during management meetings.\n\nThe Food Safety Policy is maintained as a separate controlled document (FS-QM/ANX-01) and is communicated to all employees.",
    bodyAr:
      "تلتزم TELT بتوفير لحوم ومنتجات لحوم آمنة وصحية وعالية الجودة تلبي متطلبات العملاء والمعايير القانونية والتنظيمية المعمول بها.\n\nنطبّق ونحافظ على نظام إدارة سلامة الغذاء بناءً على مبادئ ISO 22000:2018 و HACCP.\n\nنضمن التحسين المستمر، ومنع مخاطر سلامة الغذاء، والالتزام الصارم بمعايير النظافة والجودة.\n\nيتم إيصال هذه السياسة وفهمها وتطبيقها على جميع مستويات المنظمة، ومراجعتها دورياً للتأكد من ملاءمتها وفعاليتها.\n\nيتم إيصال سياسة سلامة الغذاء لجميع الموظفين، وعرضها داخل مكان العمل، وشرحها أثناء جلسات التدريب، ومراجعتها خلال الاجتماعات الإدارية.\n\nيتم الاحتفاظ بسياسة سلامة الغذاء كوثيقة مضبوطة منفصلة (FS-QM/ANX-01) ويتم إيصالها لجميع الموظفين.",
  },
  {
    id: "5.3", clause: "5.3", chapter: "clause-5",
    title: "5.3 Organizational Roles, Responsibilities and Authorities",
    titleAr: "5.3 الأدوار والمسؤوليات والصلاحيات التنظيمية",
    type: "table",
    body:
      "Top management ensures that roles, responsibilities, and authorities related to the FSMS are defined, documented, and communicated within the organization to ensure effective implementation of ISO 22000:2018 requirements.",
    bodyAr:
      "تضمن الإدارة العليا تعريف وتوثيق وإيصال الأدوار والمسؤوليات والصلاحيات المتعلقة بـ FSMS داخل المنظمة لضمان التنفيذ الفعّال لمتطلبات ISO 22000:2018.",
    table: {
      headers: ["Position", "Responsibilities"],
      rows: [
        ["Top Management", "Provide resources, approve policies, ensure FSMS effectiveness"],
        ["HACCP Team Leader (QA/QC Manager)", "Lead HACCP implementation, monitoring, verification, reporting"],
        ["HACCP Team", "Conduct hazard analysis, identify CCPs, implement HACCP plan"],
        ["Production Supervisor", "Ensure safe processing, follow SOPs, control operations"],
        ["Warehouse In-Charge", "Control storage conditions, monitor temperature, prevent contamination"],
        ["Maintenance Team", "Ensure proper functioning of equipment, preventive maintenance"],
        ["QA/QC Department", "Monitoring, inspection, verification, record control"],
        ["Logistics Coordinator", "Control transportation, ensure temperature control during delivery, manage vehicle hygiene"],
        ["All Employees", "Follow hygiene practices, SOPs, and food safety requirements"],
      ],
    },
    tableAr: {
      headers: ["المنصب", "المسؤوليات"],
      rows: [
        ["الإدارة العليا",                          "توفير الموارد، اعتماد السياسات، ضمان فعالية FSMS"],
        ["قائد فريق HACCP (مدير QA/QC)",            "قيادة تطبيق HACCP، المراقبة، التحقق، الإبلاغ"],
        ["فريق HACCP",                              "إجراء تحليل المخاطر، تحديد CCPs، تطبيق خطة HACCP"],
        ["مشرف الإنتاج",                            "ضمان معالجة آمنة، اتباع SOPs، ضبط العمليات"],
        ["مسؤول المستودع",                          "ضبط ظروف التخزين، مراقبة الحرارة، منع التلوث"],
        ["فريق الصيانة",                            "ضمان عمل المعدات بشكل سليم، الصيانة الوقائية"],
        ["قسم QA/QC",                                "المراقبة، التفتيش، التحقق، ضبط السجلات"],
        ["منسّق اللوجستيات",                         "ضبط النقل، ضمان التحكم في الحرارة أثناء التسليم، إدارة نظافة المركبات"],
        ["جميع الموظفين",                           "اتباع ممارسات النظافة وSOPs ومتطلبات سلامة الغذاء"],
      ],
    },
  },
  {
    id: "5.3B", clause: "5.3 (Branches)", chapter: "clause-5",
    title: "Organizational Charts (Branches)",
    titleAr: "المخططات التنظيمية (الفروع)",
    type: "text",
    images: [
      { src: "/haccp-manual-images/image9.png",  caption: "Main Organizational Chart",                         captionAr: "المخطط التنظيمي الرئيسي" },
      { src: "/haccp-manual-images/image10.png", caption: "Abu Dhabi Butchery & Al Ain Butchery — Org Chart",  captionAr: "ملحمة أبوظبي وملحمة العين — المخطط التنظيمي" },
      { src: "/haccp-manual-images/image11.png", caption: "Mushrif Park & Mamzar Food Trucks — Org Chart",     captionAr: "شاحنات الطعام مشرف بارك والممزر — المخطط التنظيمي" },
    ],
    body:
      "Branches covered:\n• Abu Dhabi Butchery\n• Al Ain Butchery\n• Mushrif Park Food Truck\n• Mamzar Food Truck\n\nGeneral Responsibilities of the Food Safety Team:\n• Developing ISO 22000:2018 FSMS plan\n• Developing SSOP\n• Implementation and verification of ISO 22000:2018\n• Revalidation of ISO 22000:2018\n\nKey Roles & Qualifications:\n• Executive Director: Coordinates purchase, production and trading. Organizes meetings of ISO/22000/HACCP assurance team. Acts as moderator. Communication link between the company and customer. In charge of R&D and product developments.\n• Head of Operation: Coordinates overall operations of main facility and retail branches. Coordinates with quality, production, sales and logistics for smooth operation.\n• Production In-charge: Responsible for the production process as per customer specification. In charge of workers and operators. Reports to Executive Director.\n• Quality Officer (Food Safety Team Leader): Coordinates outcomes of food safety team discussions and initial development of ISO plan. Responsible for editing the ISO 22000:2018 manual. Conducts internal GMP audits. Carries out organoleptic, sanitation, microbiological and chemical analysis.\n• Feedlot Manager: Responsible for all livestock farm management, mortality control and SOP implementation.\n• Maintenance In-charge: Responsible for working of all machines and maintenance of all areas.\n• Online Quality Control: Checks quality parameters of products and hygiene standards of the factory.\n• Head of Logistics: Coordinates and monitors supply chain operations.\n• Procurement Officer: Procurement of local/international shipments (chilled/frozen/vacuum).\n• Store Keeper: Physical stock taking; receives shipments and verifies receipts.\n• Helpers and Drivers: Daily cleaning of warehouse and vehicles; safe deliveries.",
    bodyAr:
      "الفروع المشمولة:\n• ملحمة أبوظبي\n• ملحمة العين\n• شاحنة الطعام مشرف بارك\n• شاحنة الطعام الممزر\n\nالمسؤوليات العامة لفريق سلامة الغذاء:\n• تطوير خطة FSMS وفق ISO 22000:2018\n• تطوير SSOP\n• تطبيق والتحقق من ISO 22000:2018\n• إعادة التحقق من ISO 22000:2018\n\nالأدوار الرئيسية والمؤهلات:\n• المدير التنفيذي: ينسّق الشراء والإنتاج والتجارة. ينظّم اجتماعات فريق ضمان ISO/22000/HACCP. يعمل كوسيط. حلقة اتصال بين الشركة والعميل. مسؤول عن البحث والتطوير وتطوير المنتجات.\n• رئيس العمليات: ينسّق العمليات الإجمالية للمنشأة الرئيسية وفروع التجزئة. ينسّق مع الجودة والإنتاج والمبيعات واللوجستيات للتشغيل السلس.\n• مسؤول الإنتاج: مسؤول عن عملية الإنتاج وفقاً لمواصفات العميل. مسؤول عن العمال والمشغّلين. يرفع تقاريره للمدير التنفيذي.\n• مسؤول الجودة (قائد فريق سلامة الغذاء): ينسّق نتائج مناقشات فريق سلامة الغذاء والتطوير الأولي لخطة ISO. مسؤول عن تحرير دليل ISO 22000:2018. يُجري تدقيقات GMP الداخلية. يقوم بالتحليلات الحسية والصحية والميكروبيولوجية والكيميائية.\n• مدير حظيرة التسمين: مسؤول عن جميع أعمال إدارة مزرعة الماشية، والتحكم في معدل الوفيات، وتطبيق SOP.\n• مسؤول الصيانة: مسؤول عن عمل جميع الآلات وصيانة جميع المناطق.\n• مراقبة الجودة المباشرة: يفحص معايير جودة المنتجات ومعايير النظافة في المصنع.\n• رئيس اللوجستيات: ينسّق ويراقب عمليات سلسلة التوريد.\n• مسؤول المشتريات: مشتريات الشحنات المحلية/الدولية (مبردة/مجمدة/فراغية).\n• أمين المستودع: الجرد المادي للمخزون؛ استلام الشحنات والتحقق من الإيصالات.\n• المساعدون والسائقون: التنظيف اليومي للمستودع والمركبات؛ التسليم الآمن.",
  },

  /* ─────────── CLAUSE 6 ─────────── */
  {
    id: "6.1", clause: "6.1", chapter: "clause-6",
    title: "6.1 Actions to Address Risks and Opportunities",
    titleAr: "6.1 إجراءات معالجة المخاطر والفرص",
    type: "text",
    body:
      "6.1.1 General\nThe organization determines risks and opportunities that need to be addressed to ensure that the FSMS:\n• Achieves its intended outcomes\n• Prevents or reduces undesired effects\n• Achieves continual improvement\n\nRisks and opportunities are identified considering internal issues, external issues, and requirements of interested parties.\n\n6.1.2 Risk Assessment\nA documented procedure has been established to identify, evaluate, and control risks that may impact food safety and operational performance. Risk assessment is conducted based on:\n• Likelihood of occurrence\n• Severity of impact\n\nA risk rating system is applied to prioritize actions. Risks considered include, but are not limited to:\n• Improper carcass handling and overloading\n• Inadequate waste management\n• Lack of supervision during critical operations\n• Equipment failure and lack of preventive maintenance\n• Supply chain disruptions (e.g., flood, geopolitical issues, transport delays)\n• Economic and external factors (e.g., fuel price increase, traffic delays)\n\nRisk assessment is conducted and maintained in a separate controlled document titled FSMS-RA-01 — FSMS Planning and Risk Management Procedure.",
    bodyAr:
      "6.1.1 عام\nتحدد المنظمة المخاطر والفرص التي يلزم معالجتها لضمان أن FSMS:\n• يحقق النتائج المرجوّة منه\n• يمنع أو يقلّل الآثار غير المرغوب فيها\n• يحقق التحسين المستمر\n\nيتم تحديد المخاطر والفرص بأخذ المسائل الداخلية والخارجية ومتطلبات الأطراف المعنية في الاعتبار.\n\n6.1.2 تقييم المخاطر\nتم إنشاء إجراء موثّق لتحديد وتقييم وضبط المخاطر التي قد تؤثر على سلامة الغذاء والأداء التشغيلي. يُجرى تقييم المخاطر بناءً على:\n• احتمال الحدوث\n• شدّة التأثير\n\nيتم تطبيق نظام تصنيف المخاطر لتحديد أولويات الإجراءات. تشمل المخاطر التي تم اعتبارها، على سبيل المثال لا الحصر:\n• التداول غير السليم للذبائح والتحميل الزائد\n• إدارة النفايات غير الكافية\n• قلّة الإشراف خلال العمليات الحرجة\n• تعطّل المعدات وقلّة الصيانة الوقائية\n• اضطرابات سلسلة التوريد (مثلاً، الفيضانات، القضايا الجيوسياسية، تأخّر النقل)\n• العوامل الاقتصادية والخارجية (مثلاً، زيادة سعر الوقود، تأخر حركة المرور)\n\nيتم إجراء تقييم المخاطر وصيانته في وثيقة مضبوطة منفصلة بعنوان FSMS-RA-01 — إجراء تخطيط FSMS وإدارة المخاطر.",
  },
  {
    id: "6.2", clause: "6.2", chapter: "clause-6",
    title: "6.2 Objectives of FSMS and Planning to Achieve Them",
    titleAr: "6.2 أهداف نظام إدارة سلامة الغذاء وتخطيط تحقيقها",
    type: "text",
    body:
      "TELT LLC has established food safety objectives at relevant functions, levels and processes needed for the FSMS. The food safety objectives are:\n• Consistent with the food safety policy\n• Measurable\n• Considerate of all applicable requirements\n• Relevant to conformity of services and to enhancement of customer satisfaction\n• Monitored, communicated and updated as appropriate\n\nTELT LLC maintains documented information on the food safety objectives.",
    bodyAr:
      "وضعت TELT LLC أهداف سلامة الغذاء على مستوى الوظائف والمستويات والعمليات ذات الصلة اللازمة لـ FSMS. أهداف سلامة الغذاء:\n• متوافقة مع سياسة سلامة الغذاء\n• قابلة للقياس\n• تأخذ بعين الاعتبار جميع المتطلبات المعمول بها\n• ذات صلة بمطابقة الخدمات وتعزيز رضا العميل\n• تتم مراقبتها وإيصالها وتحديثها حسب الاقتضاء\n\nتحتفظ TELT LLC بمعلومات موثّقة عن أهداف سلامة الغذاء.",
  },
  {
    id: "6.3", clause: "6.3", chapter: "clause-6",
    title: "6.3 Planning of Changes",
    titleAr: "6.3 تخطيط التغييرات",
    type: "text",
    body:
      "The integrity of FSMS is maintained when changes are planned and implemented by conducting Audits and Management Review Meetings.\n\nTELT LLC considers the following details during planning:\n• The purpose of the changes and their potential consequences\n• The integrity of FSMS\n• The availability of resources\n• The allocation or reallocation of responsibilities and authorities\n\nFSMS Clause 6 (Planning) is implemented through the document: FSMS-RA-01 — FSMS Planning and Risk Management Procedure.",
    bodyAr:
      "يتم الحفاظ على سلامة FSMS عند التخطيط وتنفيذ التغييرات من خلال إجراء التدقيقات واجتماعات مراجعة الإدارة.\n\nتنظر TELT LLC في التفاصيل التالية أثناء التخطيط:\n• الغرض من التغييرات وعواقبها المحتملة\n• سلامة FSMS\n• توفر الموارد\n• تخصيص أو إعادة تخصيص المسؤوليات والصلاحيات\n\nيتم تطبيق البند 6 (التخطيط) من FSMS من خلال الوثيقة: FSMS-RA-01 — إجراء تخطيط FSMS وإدارة المخاطر.",
  },

  /* ─────────── CLAUSE 7 ─────────── */
  {
    id: "7.1", clause: "7.1", chapter: "clause-7",
    title: "7.1 Resources",
    titleAr: "7.1 الموارد",
    type: "text",
    body:
      "The organization ensures that adequate resources are provided to establish, implement, maintain, and continually improve the FSMS.\n\nResources include:\n• Adequate manpower with defined responsibilities\n• Suitable infrastructure (cold storage, chillers, cutting and packaging equipment)\n• Suitable work environment (temperature control, hygiene conditions)\n• Monitoring and measuring equipment with proper calibration\n• Maintenance of equipment and facilities\n\nThe details are maintained in separate procedures and records:\n• Maintenance Plan\n• Calibration Records\n• Infrastructure Management Records",
    bodyAr:
      "تضمن المنظمة توفير الموارد الكافية لإنشاء وتنفيذ وصيانة وتحسين FSMS باستمرار.\n\nتشمل الموارد:\n• قوّة عاملة كافية بمسؤوليات محددة\n• بنية تحتية مناسبة (مخازن باردة، ثلاجات، معدات تقطيع وتعبئة)\n• بيئة عمل مناسبة (التحكم في درجة الحرارة، ظروف صحية)\n• أجهزة المراقبة والقياس ذات المعايرة السليمة\n• صيانة المعدات والمرافق\n\nيتم الاحتفاظ بالتفاصيل في إجراءات وسجلات منفصلة:\n• خطة الصيانة\n• سجلات المعايرة\n• سجلات إدارة البنية التحتية",
  },
  {
    id: "7.2", clause: "7.2", chapter: "clause-7",
    title: "7.2 Competence",
    titleAr: "7.2 الكفاءة",
    type: "text",
    body:
      "TELT LLC shall:\n• Determine the necessary competence of person(s) including external providers, doing work under its control that affect its food safety performance and effectiveness of FSMS;\n• Ensure that these persons including FSMS Team and those responsible for the operation of hazard control plan are competent via appropriate education, training and/or experience;\n• Ensure that FSMS team has a combination of multi-disciplinary knowledge and experience in developing and implementing FSMS, including the organization's products, processes, equipment and food safety hazards within the scope of FSMS;\n• Where applicable, take appropriate actions to acquire the necessary competence and evaluate the effectiveness of the actions taken;\n• Retain appropriate documented information as evidence of competence.",
    bodyAr:
      "يجب على TELT LLC:\n• تحديد الكفاءة اللازمة للأشخاص بما في ذلك مقدّمي الخدمات الخارجيين، الذين يقومون بعمل تحت سيطرتها يؤثر على أدائها في سلامة الغذاء وفعالية FSMS؛\n• ضمان أن هؤلاء الأشخاص بما فيهم فريق FSMS والمسؤولون عن تشغيل خطة التحكم في المخاطر يتمتعون بالكفاءة من خلال التعليم والتدريب و/أو الخبرة المناسبة؛\n• ضمان أن فريق FSMS يمتلك مزيجاً من المعرفة والخبرة متعددة التخصصات في تطوير وتطبيق FSMS، بما في ذلك منتجات المنظمة وعملياتها ومعداتها ومخاطر سلامة الغذاء ضمن نطاق FSMS؛\n• اتخاذ الإجراءات المناسبة، حيثما أمكن، لاكتساب الكفاءة اللازمة وتقييم فعالية الإجراءات المتخذة؛\n• الاحتفاظ بمعلومات موثّقة مناسبة كدليل على الكفاءة.",
  },
  {
    id: "7.3", clause: "7.3", chapter: "clause-7",
    title: "7.3 Awareness & Training of Food Handlers",
    titleAr: "7.3 الوعي وتدريب متداولي الأغذية",
    type: "text",
    body:
      "TELT LLC ensures that all relevant persons doing work under the organization's control are aware of:\n• Their individual contribution to the effectiveness of the FSMS, including the benefits of improved food safety performance;\n• The implications of not conforming to the FSMS requirements;\n• The vision and mission for the future of the organization;\n• Organizational changes and developments;\n• Introductory programs for new personnel;\n• Periodic refresher training programs for all personnel already working in the organization.\n\nTraining of Food Handlers:\nBasic Food Hygiene for all food handlers will be done as per DM Guidelines within 3 months of joining. Required training for the Food Safety Team and Team Leader is also conducted according to requirements.\n\nTraining plan covers food safety training, personnel hygiene, hygiene and sanitation, pest control, operation of equipment, temperature control, emergency preparedness and receiving from approved suppliers.\n\nAll technical personnel have been trained on the principles of ISO 22000:2018. Training Plan is mentioned in the yearly Training Calendar. Effectiveness of training is assessed and records maintained.",
    bodyAr:
      "تضمن TELT LLC أن جميع الأشخاص ذوي الصلة الذين يقومون بعمل تحت سيطرة المنظمة على دراية بـ:\n• مساهمتهم الفردية في فعالية FSMS، بما في ذلك فوائد تحسين أداء سلامة الغذاء؛\n• عواقب عدم المطابقة لمتطلبات FSMS؛\n• الرؤية والرسالة لمستقبل المنظمة؛\n• التغييرات والتطورات التنظيمية؛\n• البرامج التعريفية للموظفين الجدد؛\n• برامج التدريب التنشيطية الدورية لجميع الموظفين العاملين بالفعل في المنظمة.\n\nتدريب متداولي الأغذية:\nيتم إجراء تدريب \"النظافة الأساسية للأغذية\" لجميع متداولي الأغذية وفق إرشادات بلدية دبي خلال 3 أشهر من الالتحاق. يُجرى التدريب المطلوب لفريق سلامة الغذاء وقائد الفريق وفقاً للمتطلبات.\n\nتغطي خطة التدريب: تدريب سلامة الغذاء، النظافة الشخصية، النظافة والصرف الصحي، مكافحة الآفات، تشغيل المعدات، التحكم في درجة الحرارة، التأهب للطوارئ، والاستلام من الموردين المعتمدين.\n\nتم تدريب جميع الموظفين التقنيين على مبادئ ISO 22000:2018. خطة التدريب مذكورة في تقويم التدريب السنوي. يتم تقييم فعالية التدريب والاحتفاظ بالسجلات.",
  },
  {
    id: "7.4", clause: "7.4", chapter: "clause-7",
    title: "7.4 Communication",
    titleAr: "7.4 التواصل",
    type: "text",
    body:
      "TELT LLC determines internal and external communications relevant to the FSMS including: what to communicate, when to communicate, with whom to communicate, how to communicate, and who shall communicate.\n\n7.3.2 Operational Communication:\nCompany establishes, implements and maintains effective communication with:\n• External providers and contractors\n• Customers in relation to product information related to food safety\n• Identified food safety hazards that need to be controlled by other organizations in the food chain\n\nCustomer comments and complaints are based on Customer Complaint Records that are filled upon receiving any complaint. Bi-yearly statistical analysis of customer complaint reports is performed. Investigations are done by FSMS Team and an Action Plan is sent to the customer if required.\n\nInternal Communication channels:\n• Posted policies\n• Management Review Meeting minutes\n• Memos\n• Trainings (Annual Training Calendar)\n• FSMS Team meetings (monthly)\n• Intranet / emails\n• Posters, stickers and visual aids",
    bodyAr:
      "تحدد TELT LLC الاتصالات الداخلية والخارجية ذات الصلة بـ FSMS بما في ذلك: ما يتم الاتصال به، ومتى يتم الاتصال، ومع من، وكيف، ومن سيقوم بالاتصال.\n\n7.3.2 الاتصالات التشغيلية:\nتقوم الشركة بإنشاء وتطبيق وصيانة اتصال فعّال مع:\n• مقدّمي الخدمات الخارجيين والمقاولين\n• العملاء فيما يتعلق بمعلومات المنتج المتصلة بسلامة الغذاء\n• مخاطر سلامة الغذاء المحددة التي تحتاج إلى التحكم من قبل منظمات أخرى في السلسلة الغذائية\n\nتعتمد ملاحظات وشكاوى العملاء على سجلات شكاوى العملاء التي تُملأ عند تلقي أي شكوى. يُجرى تحليل إحصائي نصف سنوي لتقارير شكاوى العملاء. يقوم فريق FSMS بالتحقيقات ويتم إرسال خطة عمل للعميل إذا لزم الأمر.\n\nقنوات الاتصال الداخلية:\n• السياسات المعلّقة\n• محاضر اجتماع مراجعة الإدارة\n• المذكرات\n• التدريبات (تقويم التدريب السنوي)\n• اجتماعات فريق FSMS (شهرية)\n• الإنترانت / الإيميلات\n• الملصقات والإعلانات والوسائل البصرية",
  },
  {
    id: "7.5", clause: "7.5", chapter: "clause-7",
    title: "7.5 Documented Information",
    titleAr: "7.5 المعلومات الموثقة",
    type: "text",
    body:
      "7.5.1 General:\nTELT LLC FSMS includes:\n• Documented information required by this document\n• Documented information determined by the organization as being necessary for the effectiveness of FSMS\n• Documented information and food safety requirements required by Statutory, regulatory authorities and Customers\n\n7.5.2 Creating and Updating:\nDocuments created by TELT LLC ensure appropriate:\n• Identification and Description (Title, Date, Reference Number)\n• Form (Language, Graphics) and media (Paper, Electronic)\n• Review and approval for suitability and adequacy",
    bodyAr:
      "7.5.1 عام:\nيتضمن FSMS الخاص بـ TELT LLC:\n• المعلومات الموثّقة المطلوبة بموجب هذه الوثيقة\n• المعلومات الموثّقة التي تحددها المنظمة على أنها ضرورية لفعالية FSMS\n• المعلومات الموثّقة ومتطلبات سلامة الغذاء التي تتطلبها الجهات القانونية والتنظيمية والعملاء\n\n7.5.2 الإنشاء والتحديث:\nالوثائق التي تنشئها TELT LLC تضمن المناسب من:\n• التعريف والوصف (العنوان، التاريخ، الرقم المرجعي)\n• الشكل (اللغة، الرسومات) والوسائط (ورقي، إلكتروني)\n• المراجعة والموافقة على الملاءمة والكفاية",
  },

  /* ─────────── CLAUSE 8 ─────────── */
  {
    id: "8.1", clause: "8.1", chapter: "clause-8",
    title: "8.1 Operation Planning and Control",
    titleAr: "8.1 تخطيط العمليات والتحكم",
    type: "text",
    body:
      "TELT LLC plans, implements, controls, maintains and updates the processes needed to meet the requirements for the realization of safe products and to implement the actions determined in Clause 6.1 by:\n• Establishing criteria for the processes\n• Implementing control of processes in accordance with the criteria\n• Keeping documented information to the extent necessary to demonstrate that the processes have been carried out as planned\n\nTELT LLC controls planned changes and reviews the consequences of unintended changes, taking action to mitigate any adverse effects as necessary. The organization ensures that outsourced processes are controlled.",
    bodyAr:
      "تخطّط TELT LLC وتطبّق وتضبط وتحافظ وتحدّث العمليات اللازمة لتلبية متطلبات تحقيق المنتجات الآمنة ولتنفيذ الإجراءات المحددة في البند 6.1 من خلال:\n• وضع معايير للعمليات\n• تطبيق ضبط العمليات وفقاً للمعايير\n• الاحتفاظ بمعلومات موثّقة بالقدر اللازم لإثبات أن العمليات تمت كما هو مخطط\n\nتضبط TELT LLC التغييرات المخططة وتراجع عواقب التغييرات غير المقصودة، وتتخذ إجراءات للتخفيف من أي آثار سلبية حسب الحاجة. تضمن المنظمة ضبط العمليات المُسنَدة لمصادر خارجية.",
  },
  {
    id: "8.2", clause: "8.2", chapter: "clause-8",
    title: "8.2 Prerequisite Programs (PRPs)",
    titleAr: "8.2 البرامج المسبقة",
    type: "text",
    body:
      "The organization establishes, implements, and maintains PRPs to control:\n• Personnel hygiene\n• Cleaning and sanitation\n• Pest control\n• Waste management\n• Equipment maintenance\n• Temperature control\n• Cross-contamination prevention\n\nAll PRPs are documented, implemented, and regularly monitored. PRP procedures are maintained as separate controlled documents.",
    bodyAr:
      "تنشئ المنظمة وتطبّق وتحافظ على البرامج المسبقة (PRPs) لضبط:\n• النظافة الشخصية للموظفين\n• التنظيف والصرف الصحي\n• مكافحة الآفات\n• إدارة النفايات\n• صيانة المعدات\n• التحكم في درجة الحرارة\n• منع التلوث المتبادل\n\nجميع البرامج المسبقة موثّقة ومطبّقة ومراقَبة بانتظام. يتم الاحتفاظ بإجراءات PRP كوثائق مضبوطة منفصلة.",
  },
  {
    id: "8.3", clause: "8.3", chapter: "clause-8",
    title: "8.3 Traceability System",
    titleAr: "8.3 نظام التتبع",
    type: "text",
    body:
      "TELT LLC has established and applied a traceability system that enables the identification of product lots and their relation to batches of received products, storage and delivery records.\n\nTraceability records shall be maintained for a defined period for system assessment to enable the handling of potentially unsafe products and in the event of product withdrawal. The organization ensures that applicable statutory, regulatory and customer requirements are identified.\n\nDocumented information as evidence of the traceability system is retained for a defined period including, as a minimum, the shelf life of the product. TELT LLC verifies and tests the effectiveness of the traceability system.",
    bodyAr:
      "أنشأت TELT LLC وطبّقت نظام تتبّع يُمكّن من تحديد دفعات المنتج وعلاقتها بدفعات المنتجات المستلمة وسجلات التخزين والتسليم.\n\nيتم الاحتفاظ بسجلات التتبع لفترة محددة لتقييم النظام لتمكين التعامل مع المنتجات غير الآمنة المحتملة وفي حال سحب المنتج. تضمن المنظمة تحديد المتطلبات القانونية والتنظيمية ومتطلبات العملاء المعمول بها.\n\nيتم الاحتفاظ بالمعلومات الموثّقة كدليل على نظام التتبع لفترة محددة تشمل كحد أدنى مدة صلاحية المنتج. تتحقق TELT LLC وتختبر فعالية نظام التتبع.",
  },
  {
    id: "8.4", clause: "8.4", chapter: "clause-8",
    title: "8.4 Emergency Preparedness and Response",
    titleAr: "8.4 التأهب للطوارئ والاستجابة",
    type: "text",
    body:
      "Top Management ensures procedures are in place to respond to potential emergency situations or incidents that can have an impact on food safety. Documented information has been established and maintained to manage emergency situations and incidents.\n\nIdentified emergency situations:\n• Power failure affecting cold storage\n• Chiller / freezer breakdown\n• Transport delay or cold chain failure\n• Supplier non-conforming product\n• Product contamination (biological, chemical, physical)\n• Equipment failure during processing\n• Pest infestation\n• Flood, heavy rain, or environmental hazards\n• Communication failure between departments\n\nEmergency Response Actions for each identified emergency:\n• Immediate control of the situation\n• Isolation of affected product\n• Evaluation of product safety\n• Prevention of further contamination\n• Communication with relevant personnel\n\nAll actions are carried out as per defined procedures and recorded.",
    bodyAr:
      "تضمن الإدارة العليا وجود إجراءات للاستجابة لحالات الطوارئ أو الحوادث المحتملة التي قد تؤثر على سلامة الغذاء. تم إنشاء وصيانة معلومات موثّقة لإدارة حالات الطوارئ والحوادث.\n\nحالات الطوارئ المحددة:\n• انقطاع التيار الكهربائي مما يؤثر على التخزين البارد\n• تعطّل الثلاجة / الفريزر\n• تأخّر النقل أو فشل سلسلة التبريد\n• منتج غير مطابق من المورد\n• تلوث المنتج (بيولوجي، كيميائي، فيزيائي)\n• تعطّل المعدات أثناء المعالجة\n• تفشّي الآفات\n• الفيضان أو الأمطار الغزيرة أو المخاطر البيئية\n• فشل الاتصال بين الأقسام\n\nإجراءات الاستجابة لكل طارئ محدد:\n• ضبط فوري للوضع\n• عزل المنتج المتضرر\n• تقييم سلامة المنتج\n• منع المزيد من التلوث\n• التواصل مع الموظفين المعنيين\n\nيتم تنفيذ جميع الإجراءات وفقاً للإجراءات المحددة ويتم تسجيلها.",
  },
  {
    id: "8.5", clause: "8.5", chapter: "clause-8",
    title: "8.5 Hazard Control",
    titleAr: "8.5 التحكم في المخاطر",
    type: "text",
    body:
      "TELT LLC maintains documented information concerning all raw materials, ingredients and product contact materials including:\n• Biological, chemical, physical and allergen characteristics\n• Composition of formulated components, including processing aids\n• Source / Place of Origin\n• Method of Production / Packaging / Delivery\n• Storage Conditions and Shelf Life\n• Preparation and/or handling before use or processing\n• Acceptance criteria related to food safety\n\nFlow Diagrams: Process flow diagrams are accurate, clear and sufficiently detailed, including the sequence and interaction of all steps, outsourced processes, raw material entry points, recycling/reworking, and end-product/by-product/waste removal.\n\nHazard Analysis: All potential biological, chemical, physical and allergen hazards are identified and registered. Acceptable levels are defined per statutory and regulatory requirements.\n\nControl Measures: Selected and categorized as Operational PRPs and/or CCPs (Critical Control Points). Validation is performed prior to implementation.\n\nCritical Limits at CCPs are measurable. Action criteria for OPRPs are measurable or observable.\n\nMonitoring systems are established at each CCP and OPRP. Corrections and corrective actions are specified when limits or criteria are not met to ensure unsafe products are not released, the cause of non-conformity is identified, the parameter is returned within limits, and recurrence is prevented.",
    bodyAr:
      "تحتفظ TELT LLC بمعلومات موثّقة تخصّ جميع المواد الخام والمكونات والمواد الملامسة للمنتج بما في ذلك:\n• الخصائص البيولوجية والكيميائية والفيزيائية ومسببات الحساسية\n• تركيب المكونات المركّبة، بما في ذلك مساعدات المعالجة\n• المصدر / مكان المنشأ\n• طريقة الإنتاج / التعبئة / التسليم\n• ظروف التخزين ومدة الصلاحية\n• التحضير و/أو التداول قبل الاستخدام أو المعالجة\n• معايير القبول المتعلقة بسلامة الغذاء\n\nمخططات التدفق: مخططات تدفق العمليات دقيقة وواضحة ومفصّلة بما يكفي، بما في ذلك تسلسل وتفاعل جميع الخطوات، والعمليات المُسنَدة لمصادر خارجية، ونقاط دخول المواد الخام، وإعادة التدوير/المعالجة، وإزالة المنتج النهائي/المنتجات الثانوية/النفايات.\n\nتحليل المخاطر: يتم تحديد وتسجيل جميع المخاطر البيولوجية والكيميائية والفيزيائية ومسببات الحساسية المحتملة. يتم تعريف المستويات المقبولة وفقاً للمتطلبات القانونية والتنظيمية.\n\nتدابير التحكم: تم اختيارها وتصنيفها كبرامج مسبقة تشغيلية (OPRPs) و/أو نقاط تحكم حرجة (CCPs). يُجرى التحقق من الصلاحية قبل التنفيذ.\n\nالحدود الحرجة في CCPs قابلة للقياس. معايير الإجراء للـ OPRPs قابلة للقياس أو الملاحظة.\n\nيتم إنشاء أنظمة مراقبة في كل CCP و OPRP. يتم تحديد التصحيحات والإجراءات التصحيحية عندما لا يتم تلبية الحدود أو المعايير لضمان عدم إطلاق المنتجات غير الآمنة، وتحديد سبب عدم المطابقة، وإعادة المعامل ضمن الحدود، ومنع التكرار.",
  },
  {
    id: "8.6", clause: "8.6", chapter: "clause-8",
    title: "8.6 Updating Information / HACCP Plan",
    titleAr: "8.6 تحديث المعلومات / خطة HACCP",
    type: "text",
    body:
      "TELT LLC implements and maintains the hazard control plan and retains the evidence of the implementation as documented information. The HACCP Plan is maintained as document FS-QM/ANX-8.5.3 and forms part of Clause 8.5 — Flow Diagrams.",
    bodyAr:
      "تطبّق TELT LLC وتحافظ على خطة التحكم في المخاطر وتحتفظ بدليل التنفيذ كمعلومات موثّقة. يتم الاحتفاظ بخطة HACCP كوثيقة FS-QM/ANX-8.5.3 وتشكّل جزءاً من البند 8.5 — مخططات التدفق.",
  },
  {
    id: "8.7", clause: "8.7", chapter: "clause-8",
    title: "8.7 Control of Monitoring and Measuring (Calibration)",
    titleAr: "8.7 ضبط المراقبة والقياس (المعايرة)",
    type: "text",
    body:
      "TELT LLC provides evidence that monitoring and measuring methods and equipment in use are adequate for the activities related to PRPs and the Hazard Control Plan.\n\nThe monitoring and measuring equipment used are:\n• Calibrated or verified at specified intervals prior to use\n• Adjusted or readjusted as necessary\n• Identified to enable calibration status to be determined\n• Safeguarded from adjustments that would invalidate measurement results\n• Protected from damage and deterioration\n\nThe results of calibration and verification are retained as documented information. Calibration of all equipment is traceable to LLC or national measurement standards.\n\nWhen equipment or process environment is found not to conform to requirements, TELT LLC assesses the validity of previous measurement results and takes appropriate action.",
    bodyAr:
      "تقدّم TELT LLC الدليل على أن طرق المراقبة والقياس والمعدات المستخدمة كافية للأنشطة المتعلقة بـ PRPs وخطة التحكم في المخاطر.\n\nمعدات المراقبة والقياس المستخدمة:\n• تتم معايرتها أو التحقق منها على فترات محددة قبل الاستخدام\n• يتم ضبطها أو إعادة ضبطها حسب الضرورة\n• يتم تحديدها لتمكين تحديد حالة المعايرة\n• محمية من التعديلات التي قد تُبطل نتائج القياس\n• محمية من التلف والتدهور\n\nيتم الاحتفاظ بنتائج المعايرة والتحقق كمعلومات موثّقة. معايرة جميع المعدات قابلة للتتبع إلى معايير القياس الدولية أو الوطنية.\n\nعندما يتبيّن أن المعدات أو بيئة العملية لا تتطابق مع المتطلبات، تقوم TELT LLC بتقييم صلاحية نتائج القياس السابقة واتخاذ الإجراء المناسب.",
  },
  {
    id: "8.8", clause: "8.8", chapter: "clause-8",
    title: "8.8 Verification",
    titleAr: "8.8 التحقق",
    type: "text",
    body:
      "TELT LLC establishes, implements and maintains verification activities. Verification planning defines purpose, methods, frequencies and responsibilities.\n\nVerification activities confirm that:\n• PRPs are implemented and effective\n• Hazard control plan is implemented and effective\n• Hazard levels are within identified acceptable levels\n• Input to the hazard analysis is updated\n• Any other actions determined by TELT LLC are implemented and effective\n\nVerification activities are not carried out by the person responsible for monitoring the same activities. Verification results are retained as documented information and communicated.\n\nWhere verification is based on testing of end-product samples and such tests show non-conformity, the affected lot(s) are handled as potentially unsafe and corrective actions are applied.\n\nCorrective Actions: Reviewing non-conformities (customer complaints / regulatory inspection reports), reviewing trends in monitoring results, determining causes, implementing actions to prevent recurrence, documenting results, and verifying effectiveness.",
    bodyAr:
      "تنشئ TELT LLC وتطبّق وتحافظ على أنشطة التحقق. يحدد تخطيط التحقق الغرض والأساليب والتكرار والمسؤوليات.\n\nتؤكد أنشطة التحقق ما يلي:\n• البرامج المسبقة (PRPs) مطبّقة وفعّالة\n• خطة التحكم في المخاطر مطبّقة وفعّالة\n• مستويات المخاطر ضمن المستويات المقبولة المحددة\n• المدخلات لتحليل المخاطر محدّثة\n• أي إجراءات أخرى تحددها TELT LLC مطبّقة وفعّالة\n\nأنشطة التحقق لا يقوم بها الشخص المسؤول عن مراقبة نفس الأنشطة. يتم الاحتفاظ بنتائج التحقق كمعلومات موثّقة ويتم إيصالها.\n\nحيث يستند التحقق على اختبار عينات المنتج النهائي وتُظهر هذه الاختبارات عدم المطابقة، يتم التعامل مع الدفعة (الدفعات) المتأثرة على أنها غير آمنة محتملة ويتم تطبيق الإجراءات التصحيحية.\n\nالإجراءات التصحيحية: مراجعة عدم المطابقات (شكاوى العملاء / تقارير التفتيش التنظيمي)، مراجعة الاتجاهات في نتائج المراقبة، تحديد الأسباب، تنفيذ الإجراءات لمنع التكرار، توثيق النتائج، والتحقق من الفعالية.",
  },
  {
    id: "8.9", clause: "8.9", chapter: "clause-8",
    title: "8.9 Handling of Potentially Unsafe Products",
    titleAr: "8.9 التعامل مع المنتجات غير الآمنة المحتملة",
    type: "text",
    body:
      "TELT LLC takes action(s) to prevent potentially unsafe products from entering the process unless it can demonstrate that:\n• The food safety hazard(s) are reduced to defined acceptable levels;\n• The hazards will be reduced to acceptable levels prior to entering the process;\n• The food still meets defined acceptable levels despite the non-conformity.\n\nProducts identified as potentially unsafe are retained under control until evaluated and disposition determined. If unsafe products leave TELT LLC, relevant interested parties are notified and a withdrawal/recall is initiated.\n\nEvaluation for Release: Each lot affected by non-conformity is evaluated. Products affected by failure to remain within critical limits at CCPs are not released.\n\nDisposition of Non-conforming Products:\n• Reprocessed or further processed (within or outside the organization) to reduce hazard to acceptable levels; OR\n• Redirected for other use if food safety is not affected; OR\n• Destroyed and/or disposed as waste\n\nWithdrawal/Recall: TELT LLC ensures timely withdrawal/recall of lots identified as potentially unsafe by appointing competent persons with the authority to initiate and carry out the withdrawal/recall. Effectiveness is verified using Mock Withdrawal/Recall exercises.",
    bodyAr:
      "تتخذ TELT LLC إجراءات لمنع المنتجات غير الآمنة المحتملة من دخول العملية ما لم يمكنها إثبات أن:\n• مخاطر سلامة الغذاء تم تخفيضها إلى المستويات المقبولة المحددة؛\n• سيتم تخفيض المخاطر إلى المستويات المقبولة قبل دخول العملية؛\n• لا يزال الغذاء يلبي المستويات المقبولة المحددة رغم عدم المطابقة.\n\nيتم الاحتفاظ بالمنتجات المحددة على أنها غير آمنة محتملة تحت السيطرة حتى يتم تقييمها وتحديد التصرف. إذا خرجت منتجات غير آمنة من TELT LLC، يتم إبلاغ الأطراف المعنية ذات الصلة وبدء عملية سحب/استرجاع.\n\nالتقييم للإفراج: يتم تقييم كل دفعة متأثرة بعدم المطابقة. لا يتم الإفراج عن المنتجات المتأثرة بفشل البقاء ضمن الحدود الحرجة في CCPs.\n\nالتصرف في المنتجات غير المطابقة:\n• إعادة المعالجة أو المعالجة الإضافية (داخل أو خارج المنظمة) لتقليل المخاطر إلى مستويات مقبولة؛ أو\n• إعادة التوجيه لاستخدام آخر إذا لم تتأثر سلامة الغذاء؛ أو\n• الإتلاف و/أو التخلص كنفايات\n\nالسحب/الاسترجاع: تضمن TELT LLC السحب/الاسترجاع في الوقت المناسب للدفعات المحددة على أنها غير آمنة محتملة من خلال تعيين أشخاص أكفّاء بصلاحية بدء وتنفيذ السحب/الاسترجاع. يتم التحقق من الفعالية باستخدام تمارين السحب/الاسترجاع الوهمية.",
  },

  /* ─────────── CLAUSE 9 ─────────── */
  {
    id: "9.1", clause: "9.1", chapter: "clause-9",
    title: "9.1 Monitoring, Measurement, Analysis & Evaluation",
    titleAr: "9.1 المراقبة والقياس والتحليل والتقييم",
    type: "text",
    body:
      "TELT LLC determines:\n• What needs to be monitored and measured\n• Methods of monitoring, measurement, analysis and evaluation to ensure valid results\n• When monitoring and measuring needs to be performed\n• When results will be analyzed and evaluated\n• Who will analyze and evaluate the results\n\nAppropriate documented information is retained as evidence. TELT LLC evaluates the performance and effectiveness of the FSMS.\n\nAnalysis is carried out:\n• To control that overall performance meets planned arrangements and FSMS requirements\n• To identify the need for updating or improving the FSMS\n• To identify trends indicating higher incidence of unsafe products or process failures\n• To establish information for planning of Internal Audit program\n• To provide evidence that corrections and corrective actions are effective\n\nResults are reported to top management and used as input to Management Review.",
    bodyAr:
      "تحدد TELT LLC:\n• ما يلزم مراقبته وقياسه\n• طرق المراقبة والقياس والتحليل والتقييم لضمان نتائج صحيحة\n• متى يلزم إجراء المراقبة والقياس\n• متى سيتم تحليل النتائج وتقييمها\n• من سيقوم بتحليل النتائج وتقييمها\n\nيتم الاحتفاظ بمعلومات موثّقة مناسبة كدليل. تقيّم TELT LLC أداء وفعالية FSMS.\n\nيتم إجراء التحليل من أجل:\n• ضبط أن الأداء العام يلبي الترتيبات المخطط لها ومتطلبات FSMS\n• تحديد الحاجة لتحديث أو تحسين FSMS\n• تحديد الاتجاهات التي تشير إلى زيادة حدوث منتجات غير آمنة أو فشل في العمليات\n• إنشاء معلومات لتخطيط برنامج التدقيق الداخلي\n• توفير دليل على أن التصحيحات والإجراءات التصحيحية فعّالة\n\nيتم الإبلاغ عن النتائج للإدارة العليا واستخدامها كمدخل لمراجعة الإدارة.",
  },
  {
    id: "9.2", clause: "9.2", chapter: "clause-9",
    title: "9.2 Internal Audit",
    titleAr: "9.2 التدقيق الداخلي",
    type: "text",
    body:
      "TELT LLC conducts Internal Audits at planned intervals to provide information on whether the FSMS:\n• Conforms to TELT LLC's own FSMS requirements\n• Conforms to the requirements of this document\n• Is effectively implemented and maintained\n\nTELT LLC:\n• Plans, establishes, implements and maintains an Audit program(s) including frequency, methods, responsibilities, planning requirements and reporting\n• Defines audit criteria and scope for each audit\n• Selects competent auditors and conducts audits to ensure objectivity and impartiality\n• Ensures audit results are reported to the FSMS team and relevant management\n• Retains documented information as evidence of audit program implementation and audit results\n• Makes necessary corrections and takes corrective action within agreed timeframe\n\nFollow-up activities include verification of actions taken and reporting of verification results.",
    bodyAr:
      "تجري TELT LLC تدقيقات داخلية على فترات مخططة لتوفير معلومات حول ما إذا كان FSMS:\n• يتوافق مع متطلبات FSMS الخاصة بـ TELT LLC\n• يتوافق مع متطلبات هذه الوثيقة\n• مطبّق ومُصان بشكل فعّال\n\nتقوم TELT LLC بـ:\n• التخطيط وإنشاء وتطبيق وصيانة برنامج (برامج) التدقيق بما في ذلك التكرار والأساليب والمسؤوليات ومتطلبات التخطيط والإبلاغ\n• تحديد معايير ونطاق التدقيق لكل تدقيق\n• اختيار المدقّقين الأكفّاء وإجراء التدقيقات لضمان الموضوعية والحياد\n• ضمان الإبلاغ عن نتائج التدقيق لفريق FSMS والإدارة المعنية\n• الاحتفاظ بمعلومات موثّقة كدليل على تطبيق برنامج التدقيق ونتائجه\n• إجراء التصحيحات اللازمة واتخاذ الإجراءات التصحيحية ضمن الإطار الزمني المتفق عليه\n\nتشمل أنشطة المتابعة التحقق من الإجراءات المتخذة والإبلاغ عن نتائج التحقق.",
  },
  {
    id: "9.3", clause: "9.3", chapter: "clause-9",
    title: "9.3 Management Review",
    titleAr: "9.3 مراجعة الإدارة",
    type: "text",
    body:
      "Top management reviews TELT LLC's FSMS at planned intervals to ensure its continuing suitability, adequacy and effectiveness.\n\nManagement Review Inputs:\n• Status of actions from previous management reviews\n• Changes in external/internal issues relevant to FSMS\n• Information on FSMS performance and effectiveness (NCs, monitoring/measurement results, audit results, customer satisfaction)\n• Adequacy of resources\n• Emergency situations or incidents\n• Updating of food safety policy and objectives\n\nManagement Review Outputs:\n• Decisions and actions related to continual improvement opportunities\n• Any need for updates and changes to the FSMS, including resource needs and revision of food safety policy and objectives\n\nDocumented information is retained as evidence of the results of management reviews.",
    bodyAr:
      "تراجع الإدارة العليا FSMS الخاص بـ TELT LLC على فترات مخططة لضمان استمرار ملاءمته وكفايته وفعاليته.\n\nمدخلات مراجعة الإدارة:\n• حالة الإجراءات من مراجعات الإدارة السابقة\n• التغييرات في المسائل الخارجية/الداخلية ذات الصلة بـ FSMS\n• المعلومات عن أداء وفعالية FSMS (عدم المطابقات، نتائج المراقبة/القياس، نتائج التدقيق، رضا العملاء)\n• كفاية الموارد\n• حالات الطوارئ أو الحوادث\n• تحديث سياسة وأهداف سلامة الغذاء\n\nمخرجات مراجعة الإدارة:\n• القرارات والإجراءات المتعلقة بفرص التحسين المستمر\n• أي حاجة للتحديثات والتغييرات في FSMS، بما في ذلك احتياجات الموارد ومراجعة سياسة وأهداف سلامة الغذاء\n\nيتم الاحتفاظ بمعلومات موثّقة كدليل على نتائج مراجعات الإدارة.",
  },

  /* ─────────── CLAUSE 10 ─────────── */
  {
    id: "10.1", clause: "10.1", chapter: "clause-10",
    title: "10.1 Non-conformity and Corrective Action",
    titleAr: "10.1 عدم المطابقة والإجراء التصحيحي",
    type: "text",
    body:
      "TELT LLC takes the following actions whenever a non-conformity occurs:\n• React to the non-conformity:\n  - Take actions to control and correct it\n  - Deal with the consequences\n• Evaluate the need for action to eliminate the cause(s) of the non-conformity, by:\n  - Reviewing the non-conformity\n  - Determining the causes\n  - Determining if similar non-conformities exist or could potentially occur\n• Implement any action needed\n• Review the effectiveness of corrective action taken\n• Make changes to the FSMS, if necessary\n\nCorrective actions are appropriate to the effects of non-conformities encountered.\n\nDocumented information is retained as evidence of:\n• The nature of non-conformities and any subsequent actions taken\n• The results of any corrective action",
    bodyAr:
      "تتخذ TELT LLC الإجراءات التالية كلما حدث عدم مطابقة:\n• الاستجابة لعدم المطابقة:\n  - اتخاذ إجراءات لضبطه وتصحيحه\n  - التعامل مع العواقب\n• تقييم الحاجة لإجراء للقضاء على سبب (أسباب) عدم المطابقة، من خلال:\n  - مراجعة عدم المطابقة\n  - تحديد الأسباب\n  - تحديد ما إذا كانت عدم مطابقات مماثلة موجودة أو يمكن أن تحدث\n• تنفيذ أي إجراء لازم\n• مراجعة فعالية الإجراء التصحيحي المتخذ\n• إجراء تغييرات على FSMS، إذا لزم الأمر\n\nالإجراءات التصحيحية مناسبة لآثار عدم المطابقات التي تمت مواجهتها.\n\nيتم الاحتفاظ بمعلومات موثّقة كدليل على:\n• طبيعة عدم المطابقات وأي إجراءات لاحقة متخذة\n• نتائج أي إجراء تصحيحي",
  },
  {
    id: "10.2", clause: "10.2", chapter: "clause-10",
    title: "10.2 Continual Improvement",
    titleAr: "10.2 التحسين المستمر",
    type: "text",
    body:
      "TELT LLC continually improves the suitability, adequacy and effectiveness of the FSMS.\n\nTop Management ensures that TELT LLC continually improves the effectiveness of the FSMS through the use of communication, management review, internal audit, analysis of results, validation of control measures, corrective action, and updating of the FSMS.",
    bodyAr:
      "تحسّن TELT LLC باستمرار ملاءمة وكفاية وفعالية FSMS.\n\nتضمن الإدارة العليا أن TELT LLC تحسّن باستمرار فعالية FSMS من خلال استخدام الاتصالات ومراجعة الإدارة والتدقيق الداخلي وتحليل النتائج والتحقق من تدابير التحكم والإجراءات التصحيحية وتحديث FSMS.",
  },
  {
    id: "10.3", clause: "10.3", chapter: "clause-10",
    title: "10.3 Update of the FSMS",
    titleAr: "10.3 تحديث نظام إدارة سلامة الغذاء",
    type: "text",
    body:
      "Top Management ensures that the FSMS is continually updated. The FSMS Team evaluates the FSMS at planned intervals, considering whether to review the HACCP analysis.\n\nUpdating activities are based on:\n• Input from communication, external as well as internal\n• Input from other information concerning suitability, adequacy and effectiveness of FSMS\n• Output from the analysis of results of verification activities\n• Output from Management Review\n\nSystem updating activities are retained as documented information and reported as input to the management review.",
    bodyAr:
      "تضمن الإدارة العليا أن FSMS يتم تحديثه باستمرار. يقيّم فريق FSMS النظام على فترات مخططة، مع النظر فيما إذا كان يجب مراجعة تحليل HACCP.\n\nتستند أنشطة التحديث على:\n• المدخلات من الاتصالات الداخلية والخارجية\n• المدخلات من معلومات أخرى تخصّ ملاءمة وكفاية وفعالية FSMS\n• المخرجات من تحليل نتائج أنشطة التحقق\n• المخرجات من مراجعة الإدارة\n\nيتم الاحتفاظ بأنشطة تحديث النظام كمعلومات موثّقة ويتم الإبلاغ عنها كمدخل لمراجعة الإدارة.",
  },
];
