// src/pages/AIAssistant.jsx
// 🤖 AI Assistant — full-page standalone view (accessible from the main dashboard).
//   UI shell + local rule-based summaries built from live server data.
//   When you're ready to plug in a real LLM API key, the chat panel + actions
//   are already wired and just need a backend call to swap the local fallback.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";

/* Detect Arabic in user input — used to pick response language */
function isArabicText(s) {
  return /[؀-ۿ]/.test(String(s || ""));
}

const QUICK_ACTIONS = [
  // 📝 Reports help
  { id: "daily-report",   icon: "📅",
    titleEn: "Daily Report Help",         titleAr: "مساعدة التقرير اليومي",
    promptEn: "How do I create a daily inspection report?",
    promptAr: "كيف أنشئ تقرير الفحص اليومي؟" },
  { id: "monthly-report", icon: "📊",
    titleEn: "Monthly Report Help",       titleAr: "مساعدة التقرير الشهري",
    promptEn: "How do I create a monthly safety/quality report?",
    promptAr: "كيف أنشئ التقرير الشهري؟" },
  { id: "write-finding",  icon: "✍️",
    titleEn: "Write a Finding",            titleAr: "كتابة ملاحظة عدم مطابقة",
    promptEn: "Help me write a non-conformance finding.",
    promptAr: "ساعدني بكتابة ملاحظة عدم مطابقة." },
  { id: "root-cause",     icon: "🔎",
    titleEn: "Root Cause Analysis",        titleAr: "تحليل السبب الجذري",
    promptEn: "Suggest a root cause analysis.",
    promptAr: "اقترح تحليل السبب الجذري." },
  { id: "corrective",     icon: "🛠️",
    titleEn: "Corrective Action (CAPA)",   titleAr: "إجراء تصحيحي ووقائي",
    promptEn: "Suggest a corrective and preventive action.",
    promptAr: "اقترح إجراء تصحيحي ووقائي." },
  // 🏭 Operations & SOPs
  { id: "new-product",    icon: "🆕",
    titleEn: "Add New Product",            titleAr: "إضافة منتج جديد",
    promptEn: "How do I add a new product to the FSMS?",
    promptAr: "كيف أضيف منتج جديد للنظام؟" },
  { id: "new-department", icon: "🏢",
    titleEn: "Add New Department",         titleAr: "إضافة قسم جديد",
    promptEn: "How do I onboard a new department or section?",
    promptAr: "كيف أضيف قسم جديد؟" },
  { id: "new-kitchen",    icon: "👨‍🍳",
    titleEn: "Add New Kitchen",            titleAr: "إضافة مطبخ جديد",
    promptEn: "How do I set up a new kitchen / production area?",
    promptAr: "كيف أنشئ مطبخ جديد؟" },
  { id: "manufacture",    icon: "🏭",
    titleEn: "Manufacture New Product",    titleAr: "تصنيع منتج جديد",
    promptEn: "What is the workflow to manufacture a new product?",
    promptAr: "ما خطوات تصنيع منتج جديد؟" },
  { id: "sop-overview",   icon: "📚",
    titleEn: "All SOPs Overview",          titleAr: "نظرة عامة على كل الـ SOPs",
    promptEn: "Give me an overview of all SOPs.",
    promptAr: "اعطني نظرة شاملة على كل إجراءات التشغيل." },
  { id: "audit-prep",     icon: "✅",
    titleEn: "Audit Readiness",            titleAr: "جاهزية التدقيق",
    promptEn: "What should I prepare before an external audit?",
    promptAr: "ما الذي يجب تحضيره قبل تدقيق خارجي؟" },
  // 📊 Live data
  { id: "expiring",       icon: "⏰",
    titleEn: "Upcoming Expiries",          titleAr: "تراخيص تنتهي قريباً",
    promptEn: "List licenses or certificates expiring soon.",
    promptAr: "اعرض التراخيص اللي ستنتهي قريباً." },
  { id: "incidents",      icon: "🚨",
    titleEn: "Recent Incidents",           titleAr: "الحوادث الأخيرة",
    promptEn: "What incidents happened in the last 30 days?",
    promptAr: "ما الحوادث اللي حدثت آخر 30 يوم؟" },
  { id: "kpis",           icon: "📈",
    titleEn: "Key KPIs",                   titleAr: "المؤشرات الرئيسية",
    promptEn: "Where do I find the KPIs?",
    promptAr: "وين أجد المؤشرات الرئيسية؟" },
  // 🌐 Translation
  { id: "translate-en",   icon: "🇬🇧",
    titleEn: "AR → EN Translation",         titleAr: "ترجمة عربي → إنجليزي",
    promptEn: "Translate this Arabic to English: ",
    promptAr: "ترجم هذا للإنجليزية: " },
  { id: "translate-ar",   icon: "🇸🇦",
    titleEn: "EN → AR Translation",         titleAr: "ترجمة إنجليزي → عربي",
    promptEn: "Translate this English to Arabic: ",
    promptAr: "ترجم هذا للعربية: " },
];

/* ===== Bilingual knowledge base (no LLM key required) ===== */

const KB = {
  /* Daily report */
  daily: {
    en: [
      "📅 DAILY INSPECTION REPORT — how to create it",
      "",
      "1) WHERE: Open  Inspector → New Audit  (or /inspection)",
      "",
      "2) HEADER FIELDS (required):",
      "   • Date (today)",
      "   • Report No (format: DDMMYY/POSxx)",
      "   • Branch (auto-suggests friendly name)",
      "   • Location (specific room/area)",
      "   • Audit Conducted By (your name)",
      "",
      "3) ROWS — for each finding add:",
      "   • Non-Conformance — what is wrong",
      "   • Root Cause — why it happened (5 Whys)",
      "   • Corrective Action — what will be done",
      "   • Evidence images (max 5, uploaded to Cloudinary)",
      "   • Closed Evidence (when fixed)",
      "   • Risk: Low / Medium / High (colour-coded)",
      "   • Status: Open / In Progress / Closed",
      "",
      "4) FOOTER:",
      "   • Comment for next audit",
      "   • Next audit date",
      "   • Reviewed & verified by",
      "",
      "5) SAVE → records go to /api/reports with type=internal_multi_audit",
      "",
      "💡 Tip: Auto-save runs every 1.5s — your draft is safe if browser closes.",
    ].join("\n"),
    ar: [
      "📅 التقرير اليومي للفحص — خطوات الإنشاء",
      "",
      "1) الموقع: المفتش ← New Audit  (أو /inspection)",
      "",
      "2) حقول الترويسة (إلزامية):",
      "   • التاريخ (اليوم)",
      "   • رقم التقرير (الصيغة: DDMMYY/POSxx)",
      "   • الفرع (اختر من قائمة الأسماء الذكية)",
      "   • الموقع (الغرفة/المنطقة المحددة)",
      "   • أجرى التدقيق (اسمك)",
      "",
      "3) السطور — لكل ملاحظة أضف:",
      "   • عدم المطابقة — ما هو الخطأ",
      "   • السبب الجذري — لماذا حدث (الـ 5 لماذات)",
      "   • الإجراء التصحيحي — ما الذي سيُعمل",
      "   • صور الدليل (5 كحد أقصى — تُرفع إلى Cloudinary)",
      "   • دليل الإغلاق (عند التصحيح)",
      "   • المخاطر: منخفض / متوسط / عالي (ملوّن)",
      "   • الحالة: مفتوح / قيد التنفيذ / مغلق",
      "",
      "4) الذيل:",
      "   • ملاحظات للتدقيق القادم",
      "   • تاريخ التدقيق القادم",
      "   • تمت المراجعة والتصديق من قِبَل",
      "",
      "5) الحفظ → تُسجَّل على /api/reports بنوع internal_multi_audit",
      "",
      "💡 الحفظ التلقائي يعمل كل 1.5 ثانية — مسوّدتك آمنة لو أغلقت المتصفح.",
    ].join("\n"),
  },

  /* Monthly report */
  monthly: {
    en: [
      "📊 MONTHLY SAFETY/QUALITY REPORT — how to create it",
      "",
      "1) WHERE: HSE → F-21 · Monthly Safety Report  (or /hse/monthly-safety-report)",
      "",
      "2) PERIOD: select the month + year — KPIs pull automatically from incidents.",
      "",
      "3) AUTO-PULLED KPIs (no manual entry needed):",
      "   • Near-miss count, First-aid, LTI, Major, Fatal incidents",
      "   • Closure rate %",
      "   • Days without injury",
      "",
      "4) MANUAL KPIs to enter:",
      "   • Man-hours worked (this period + cumulative)",
      "   • Training hours delivered",
      "   • Audits completed",
      "   • Inspections completed",
      "   • Toolbox talks",
      "",
      "5) NARRATIVE SECTIONS:",
      "   • Highlights & achievements",
      "   • Lessons learned",
      "   • Plan for next month",
      "",
      "6) SAVE → goes to server as hse_monthly_safety_report",
      "",
      "💡 Print the report to PDF for the Management Review Meeting (MRM).",
    ].join("\n"),
    ar: [
      "📊 التقرير الشهري للسلامة/الجودة — خطوات الإنشاء",
      "",
      "1) الموقع: HSE ← F-21 · التقرير الشهري للسلامة  (أو /hse/monthly-safety-report)",
      "",
      "2) الفترة: اختر الشهر + السنة — المؤشرات تُسحب تلقائياً من سجلات الحوادث.",
      "",
      "3) المؤشرات التي تُسحب تلقائياً (لا تحتاج إدخال يدوي):",
      "   • شبه الحوادث، الإسعاف الأولي، LTI، الكبير، الحوادث المميتة",
      "   • نسبة الإغلاق %",
      "   • الأيام بلا إصابات",
      "",
      "4) المؤشرات اليدوية المطلوب إدخالها:",
      "   • ساعات العمل (هذه الفترة + التراكمي)",
      "   • ساعات التدريب المُنفَّذة",
      "   • التدقيقات المنجزة",
      "   • التفتيشات المنجزة",
      "   • اجتماعات Toolbox",
      "",
      "5) الأقسام السردية:",
      "   • الإنجازات والنجاحات",
      "   • الدروس المستفادة",
      "   • خطة الشهر القادم",
      "",
      "6) الحفظ → يُسجَّل على السيرفر كـ hse_monthly_safety_report",
      "",
      "💡 اطبع التقرير PDF لاجتماع مراجعة الإدارة (MRM).",
    ].join("\n"),
  },

  /* Write finding */
  finding: {
    en: [
      "✍️ How to write a strong non-conformance finding:",
      "",
      "1) WHAT — state the deviation factually:",
      '   "Cold-room temperature was 6 °C at 10:30 vs. the limit of ≤4 °C."',
      "",
      "2) WHERE — location + equipment ID:",
      '   "Chiller #C-2 in QCS warehouse."',
      "",
      "3) WHEN — date and time.",
      "",
      "4) REFERENCE — procedure / standard / clause:",
      '   "ISO 22000:2018 §8.5.1 / SOP-07 §3.2"',
      "",
      "5) EVIDENCE — attach photos, sensor logs, sign-offs.",
      "",
      "✅ Tip: one sentence — verb + object + against what standard.",
    ].join("\n"),
    ar: [
      "✍️ كيف تكتب ملاحظة عدم مطابقة قوية:",
      "",
      "1) ماذا — اذكر الانحراف بشكل واقعي:",
      '   "كانت درجة حرارة غرفة التبريد 6°م الساعة 10:30 بينما الحد ≤4°م."',
      "",
      "2) أين — الموقع + معرّف المعدة:",
      '   "الثلاجة C-2 في مستودع QCS."',
      "",
      "3) متى — التاريخ والوقت.",
      "",
      "4) المرجع — الإجراء / المعيار / البند:",
      '   "ISO 22000:2018 §8.5.1 / SOP-07 §3.2"',
      "",
      "5) الدليل — أرفق صور، سجلات حساسات، توقيعات.",
      "",
      "✅ نصيحة: جملة واحدة — فعل + مفعول + المعيار المخالف.",
    ].join("\n"),
  },

  /* Root cause */
  rootCause: {
    en: [
      "🔎 Root cause analysis — 5 Whys template:",
      "",
      "Problem: <restate the finding in 1 line>",
      "",
      "Why 1: Why did this happen?",
      "Why 2: Why did THAT happen?",
      "Why 3: Why did THAT happen?",
      "Why 4: Why did THAT happen?",
      "Why 5: Why did THAT happen? ← this is usually the systemic root.",
      "",
      "Categories to consider (Ishikawa / 6M):",
      "• Man (training, awareness, fatigue)",
      "• Method (procedure missing/unclear)",
      "• Machine (failure, calibration)",
      "• Material (supplier quality, expiry)",
      "• Measurement (sensor/gauge accuracy)",
      "• Environment (temp, lighting, hygiene)",
      "",
      "🎯 Stop at the cause that, if fixed, prevents recurrence.",
    ].join("\n"),
    ar: [
      "🔎 تحليل السبب الجذري — قالب الـ 5 لماذات:",
      "",
      "المشكلة: <أعد صياغة الملاحظة بسطر واحد>",
      "",
      "لماذا 1: لماذا حدث هذا؟",
      "لماذا 2: لماذا حدث ذلك؟",
      "لماذا 3: لماذا حدث ذلك؟",
      "لماذا 4: لماذا حدث ذلك؟",
      "لماذا 5: لماذا حدث ذلك؟ ← غالباً هو الجذر النظامي.",
      "",
      "الفئات المرجعية (إيشيكاوا / 6M):",
      "• الإنسان (تدريب، وعي، إرهاق)",
      "• الطريقة (إجراء مفقود/غير واضح)",
      "• الآلة (عطل، معايرة)",
      "• المواد (جودة المورد، الانتهاء)",
      "• القياس (دقة الحساس/العداد)",
      "• البيئة (حرارة، إضاءة، نظافة)",
      "",
      "🎯 توقّف عند السبب الذي يمنع التكرار عند إصلاحه.",
    ].join("\n"),
  },

  /* Corrective + preventive */
  capa: {
    en: [
      "🛠️ CAPA — Corrective + Preventive Action template:",
      "",
      "🔧 CORRECTIVE (fix the current case):",
      "• Action: <physical/process change>",
      "• Owner: <responsible person/role>",
      "• Deadline: <specific date>",
      "• Evidence required: photos / log / signoff",
      "",
      "🛡️ PREVENTIVE (stop recurrence):",
      "• Action: <update procedure / re-training / preventive maintenance>",
      "• Owner + Deadline",
      "• Effectiveness check: after 30/60/90 days, re-audit",
      "",
      "✅ Close the loop:",
      "• Verify effectiveness (re-inspect after deadline)",
      "• Update related SOPs/policies",
      "• Communicate to all relevant staff",
    ].join("\n"),
    ar: [
      "🛠️ CAPA — قالب الإجراء التصحيحي والوقائي:",
      "",
      "🔧 تصحيحي (إصلاح الحالة الحالية):",
      "• الإجراء: <تغيير فيزيائي/إجرائي>",
      "• المسؤول: <الشخص/الدور>",
      "• الموعد النهائي: <تاريخ محدد>",
      "• الدليل المطلوب: صور / سجل / توقيع",
      "",
      "🛡️ وقائي (منع التكرار):",
      "• الإجراء: <تحديث الإجراء / إعادة تدريب / صيانة وقائية>",
      "• المسؤول + الموعد",
      "• فحص الفاعلية: بعد 30/60/90 يوماً، إعادة تدقيق",
      "",
      "✅ إغلاق الحلقة:",
      "• تحقق من الفاعلية (إعادة فحص بعد الموعد)",
      "• حدّث الـ SOPs / السياسات",
      "• أخطر كل الموظفين المعنيين",
    ].join("\n"),
  },

  /* Add new product */
  newProduct: {
    en: [
      "🆕 ADDING A NEW PRODUCT — full FSMS workflow:",
      "",
      "PHASE 1 — Documentation:",
      "1. Add to Product Master Register (FSMS § 8.5.1.1)",
      "2. Define: ingredients, allergens, packaging, shelf life, storage",
      "3. Country of origin + HALAL certificate (for meat)",
      "4. Nutritional label (ESMA / GSO compliance)",
      "",
      "PHASE 2 — Hazard Analysis (HACCP):",
      "5. Update hazard analysis table — biological / chemical / physical / allergen",
      "6. Determine CCPs using Codex Decision Tree",
      "7. Set Critical Limits (e.g., chilled ≤5 °C, frozen ≤−18 °C)",
      "",
      "PHASE 3 — Operations:",
      "8. Update Cold-chain SOP (receiving, storage, transport)",
      "9. Update Cleaning & Sanitation SOP (if new equipment)",
      "10. Train production + QC staff on the new product",
      "",
      "PHASE 4 — Records:",
      "11. Update CCP monitoring forms",
      "12. Add to Traceability + Recall procedure",
      "13. Verify with Mock Recall drill",
      "",
      "✅ Get sign-off from: Food Safety Team Leader → HSE Manager → Top Management",
    ].join("\n"),
    ar: [
      "🆕 إضافة منتج جديد — سير عمل FSMS الكامل:",
      "",
      "المرحلة 1 — التوثيق:",
      "1. أضف للسجل الرئيسي للمنتجات (FSMS § 8.5.1.1)",
      "2. حدّد: المكونات، مسببات الحساسية، التعبئة، فترة الصلاحية، التخزين",
      "3. بلد المنشأ + شهادة الحلال (للحوم)",
      "4. ملصق المعلومات الغذائية (مطابق ESMA / GSO)",
      "",
      "المرحلة 2 — تحليل المخاطر (HACCP):",
      "5. حدّث جدول تحليل المخاطر — بيولوجي / كيميائي / فيزيائي / مسببات حساسية",
      "6. حدّد CCPs باستخدام شجرة قرار Codex",
      "7. ضع الحدود الحرجة (مثل: مبرّد ≤5°م، مجمّد ≤−18°م)",
      "",
      "المرحلة 3 — التشغيل:",
      "8. حدّث SOP سلسلة التبريد (الاستلام، التخزين، النقل)",
      "9. حدّث SOP التنظيف والتعقيم (إذا في معدات جديدة)",
      "10. درّب موظفي الإنتاج وضبط الجودة على المنتج الجديد",
      "",
      "المرحلة 4 — السجلات:",
      "11. حدّث نماذج مراقبة الـ CCP",
      "12. أضِف للتتبع وإجراء السحب",
      "13. تحقق بتمرين سحب وهمي (Mock Recall)",
      "",
      "✅ اعتمد من: قائد فريق سلامة الغذاء ← مدير HSE ← الإدارة العليا",
    ].join("\n"),
  },

  /* New department */
  newDept: {
    en: [
      "🏢 ONBOARDING A NEW DEPARTMENT / SECTION:",
      "",
      "1. Define scope (which activities, products, hazards apply)",
      "2. Update Organizational Chart (HSE Org Structure)",
      "3. Assign roles & responsibilities:",
      "   • Department Manager",
      "   • Food Safety Team Member (if applicable)",
      "   • HSE Coordinator",
      "4. Update FSMS Manual scope statement (§4.3 Scope)",
      "5. Add to Risk Register (operational + safety risks)",
      "6. Create department-specific SOPs (or reference existing ones)",
      "7. Update Training Matrix — required courses per role",
      "8. Add to PPE issue log (new department workers)",
      "9. Conduct opening internal audit within 90 days",
      "10. Add to Mock Recall scope (if it handles product)",
      "",
      "✅ Register the new department code in the system (Login routes, branch dropdown).",
    ].join("\n"),
    ar: [
      "🏢 إضافة قسم / إدارة جديدة:",
      "",
      "1. حدّد النطاق (أي أنشطة، منتجات، مخاطر تنطبق)",
      "2. حدّث الهيكل التنظيمي (HSE Org Structure)",
      "3. عيّن الأدوار والمسؤوليات:",
      "   • مدير القسم",
      "   • عضو فريق سلامة الغذاء (إن لزم)",
      "   • منسّق HSE",
      "4. حدّث بيان نطاق دليل FSMS (§4.3 Scope)",
      "5. أضِف لسجل المخاطر (تشغيلية + سلامة)",
      "6. أنشئ SOPs خاصة بالقسم (أو ارجع لـ SOPs القائمة)",
      "7. حدّث مصفوفة التدريب — الدورات المطلوبة لكل دور",
      "8. أضِف لسجل صرف PPE",
      "9. أجرِ تدقيقاً داخلياً افتتاحياً خلال 90 يوماً",
      "10. أضِف لنطاق Mock Recall (إذا يتعامل مع منتجات)",
      "",
      "✅ سجّل كود القسم بالنظام (Login routes, branch dropdown).",
    ].join("\n"),
  },

  /* New kitchen */
  newKitchen: {
    en: [
      "👨‍🍳 SETTING UP A NEW KITCHEN / PRODUCTION AREA:",
      "",
      "REGULATORY (before opening):",
      "1. Dubai Municipality (DM) food establishment license",
      "2. Civil Defence safety approval",
      "3. Layout approval (one-way flow: raw → cooked → packed)",
      "4. Pre-operational inspection",
      "",
      "INFRASTRUCTURE:",
      "5. Hand-wash stations near every workstation",
      "6. Separate raw / cooked / RTE zones (colour-coded utensils)",
      "7. Pest-proofing (door seals, air curtains, mesh)",
      "8. Calibrated thermometers, probes, scales",
      "9. Adequate ventilation + hood fire-suppression",
      "10. Floor drains with traps + sloped to drain",
      "",
      "DOCUMENTATION:",
      "11. Kitchen-specific HACCP plan",
      "12. Pre-operational cleaning checklist (daily)",
      "13. Temperature monitoring logs (cooking, hot-holding, cooling)",
      "14. Allergen management procedure",
      "15. Cleaning schedule + chemical concentrations",
      "",
      "STAFF:",
      "16. Health cards (PIC) for all food handlers",
      "17. Initial training: HACCP, hygiene, allergens",
      "18. Uniforms, PPE, hair nets",
      "",
      "✅ Issue an opening audit certificate after first internal audit.",
    ].join("\n"),
    ar: [
      "👨‍🍳 إنشاء مطبخ / منطقة إنتاج جديدة:",
      "",
      "التنظيمي (قبل الافتتاح):",
      "1. ترخيص منشأة غذائية من بلدية دبي (DM)",
      "2. موافقة سلامة من الدفاع المدني",
      "3. اعتماد التصميم (مسار أحادي: خام ← مطبوخ ← معبّأ)",
      "4. تفتيش ما قبل التشغيل",
      "",
      "البنية التحتية:",
      "5. مغاسل أيدي قرب كل محطة عمل",
      "6. مناطق منفصلة: خام / مطبوخ / جاهز للأكل (أدوات مرمّزة بألوان)",
      "7. حماية من الحشرات (أبواب مُحكَمة، ستائر هوائية، شبك)",
      "8. موازين وحساسات حرارة معايرة",
      "9. تهوية كافية + إخماد حريق للشفّاطات",
      "10. مصارف أرضية بمصائد ومائلة للتصريف",
      "",
      "التوثيق:",
      "11. خطة HACCP خاصة بالمطبخ",
      "12. قائمة تنظيف ما قبل التشغيل (يومية)",
      "13. سجلات الحرارة (طبخ، حفظ ساخن، تبريد)",
      "14. إجراء إدارة مسببات الحساسية",
      "15. جدول التنظيف + تركيزات المواد الكيميائية",
      "",
      "الموظفون:",
      "16. بطاقات صحية (PIC) لكل متعاملي الأغذية",
      "17. تدريب أولي: HACCP، نظافة، مسببات حساسية",
      "18. الزي الموحد، PPE، شبكات الشعر",
      "",
      "✅ أصدر شهادة تدقيق افتتاحي بعد أول تدقيق داخلي.",
    ].join("\n"),
  },

  /* Manufacture new product */
  manufacture: {
    en: [
      "🏭 MANUFACTURING A NEW PRODUCT — workflow:",
      "",
      "STEP 1 — Validation (before mass production):",
      "• Trial batch (3-5 small batches)",
      "• Sensory evaluation, shelf-life challenge test, microbial tests",
      "• Allergen cross-contamination check",
      "",
      "STEP 2 — HACCP plan:",
      "• Identify hazards at each process step",
      "• Set CCPs and Critical Limits",
      "• Define monitoring (who, what, when, how, action)",
      "",
      "STEP 3 — Process Flow Diagram (PFD):",
      "• Receiving → Storage → Prep → Cooking → Cooling → Packing → Storage → Dispatch",
      "• Mark each step's hazards + controls",
      "",
      "STEP 4 — SOPs needed:",
      "• Cold-chain receiving (SOP-FS-01)",
      "• Cleaning & sanitation (SOP-FS-02)",
      "• Cooking & hot-holding (if applicable)",
      "• Packaging & labelling",
      "• Traceability",
      "",
      "STEP 5 — Records:",
      "• Production batch log",
      "• CCP monitoring sheet",
      "• Cleaning log",
      "• Temperature logs (cooking + cooling + storage)",
      "",
      "STEP 6 — Release:",
      "• QC sign-off on each batch (sensory + temp + microbial if pending)",
      "• COA (Certificate of Analysis) for first 5 batches",
      "",
      "✅ Continuous verification — monthly audit of the line for first 3 months.",
    ].join("\n"),
    ar: [
      "🏭 تصنيع منتج جديد — سير العمل:",
      "",
      "الخطوة 1 — التحقق (قبل الإنتاج الكبير):",
      "• دفعة تجريبية (3-5 دفعات صغيرة)",
      "• تقييم حسي، اختبار تحدّي الصلاحية، اختبارات ميكروبية",
      "• فحص تلوث متبادل لمسببات الحساسية",
      "",
      "الخطوة 2 — خطة HACCP:",
      "• حدّد المخاطر في كل خطوة عملية",
      "• ضع CCPs والحدود الحرجة",
      "• حدّد المراقبة (من، ماذا، متى، كيف، الإجراء)",
      "",
      "الخطوة 3 — مخطط تدفق العملية (PFD):",
      "• الاستلام ← التخزين ← التحضير ← الطبخ ← التبريد ← التعبئة ← التخزين ← الشحن",
      "• ضع علامة على مخاطر وضوابط كل خطوة",
      "",
      "الخطوة 4 — الـ SOPs المطلوبة:",
      "• استلام سلسلة التبريد (SOP-FS-01)",
      "• التنظيف والتعقيم (SOP-FS-02)",
      "• الطبخ والحفظ الساخن (إن وجد)",
      "• التعبئة والتوسيم",
      "• التتبع",
      "",
      "الخطوة 5 — السجلات:",
      "• سجل دفعة الإنتاج",
      "• ورقة مراقبة الـ CCP",
      "• سجل التنظيف",
      "• سجلات الحرارة (طبخ + تبريد + تخزين)",
      "",
      "الخطوة 6 — الإفراج:",
      "• توقيع QC على كل دفعة (حسي + حرارة + ميكروبي إن وجد)",
      "• شهادة تحليل (COA) لأول 5 دفعات",
      "",
      "✅ التحقق المستمر — تدقيق شهري للخط لأول 3 أشهر.",
    ].join("\n"),
  },

  /* SOP overview */
  sopOverview: {
    en: [
      "📚 SOPs — Standard Operating Procedures (28 total):",
      "",
      "🥩 FOOD SAFETY (9):",
      "• SOP-FS-01: Cold-chain receiving",
      "• SOP-FS-02: Cleaning & sanitation",
      "• SOP-FS-03: Personal hygiene",
      "• SOP-FS-04: Pest control",
      "• SOP-FS-05: Allergen management",
      "• SOP-FS-06: Storage (chilled/frozen/dry)",
      "• SOP-FS-07: Temperature monitoring",
      "• SOP-FS-08: Traceability & recall",
      "• SOP-FS-09: Cross-contamination prevention",
      "",
      "🦺 OCCUPATIONAL HEALTH & SAFETY (10):",
      "• SOP-OHS-01: PPE issue & use",
      "• SOP-OHS-02: Manual lifting",
      "• SOP-OHS-03: Forklift operations",
      "• SOP-OHS-04: Cold-room safety",
      "• SOP-OHS-05: Slicer & cutting equipment",
      "• SOP-OHS-06: Chemical handling",
      "• SOP-OHS-07: Work permits (hot work, heights, etc.)",
      "• SOP-OHS-08: Lockout-tagout (LOTO)",
      "• SOP-OHS-09: First aid response",
      "• SOP-OHS-10: Incident reporting",
      "",
      "🚨 EMERGENCY (4):",
      "• SOP-EM-01: Fire emergency",
      "• SOP-EM-02: Ammonia/refrigerant leak",
      "• SOP-EM-03: Power outage",
      "• SOP-EM-04: Evacuation drill",
      "",
      "🌱 ENVIRONMENT (4):",
      "• SOP-ENV-01: Waste segregation",
      "• SOP-ENV-02: Wastewater management",
      "• SOP-ENV-03: Refrigerant gas tracking",
      "• SOP-ENV-04: Energy efficiency",
      "",
      "📋 ADMIN (5):",
      "• SOP-AD-01: Document control",
      "• SOP-AD-02: Training records",
      "• SOP-AD-03: Internal audits",
      "• SOP-AD-04: Management review",
      "• SOP-AD-05: Supplier approval",
      "",
      "📂 All SOPs are at: HSE → SOPs (or /hse/sops)",
    ].join("\n"),
    ar: [
      "📚 الـ SOPs — إجراءات التشغيل القياسية (28 إجراء):",
      "",
      "🥩 سلامة الغذاء (9):",
      "• SOP-FS-01: استلام سلسلة التبريد",
      "• SOP-FS-02: التنظيف والتعقيم",
      "• SOP-FS-03: النظافة الشخصية",
      "• SOP-FS-04: مكافحة الحشرات",
      "• SOP-FS-05: إدارة مسببات الحساسية",
      "• SOP-FS-06: التخزين (مبرّد/مجمّد/جاف)",
      "• SOP-FS-07: مراقبة الحرارة",
      "• SOP-FS-08: التتبع والسحب",
      "• SOP-FS-09: منع التلوث المتبادل",
      "",
      "🦺 السلامة المهنية (10):",
      "• SOP-OHS-01: صرف واستخدام PPE",
      "• SOP-OHS-02: الرفع اليدوي",
      "• SOP-OHS-03: تشغيل الرافعات الشوكية",
      "• SOP-OHS-04: سلامة غرف التبريد",
      "• SOP-OHS-05: آلات التقطيع",
      "• SOP-OHS-06: تداول الكيماويات",
      "• SOP-OHS-07: تصاريح العمل (ساخن، ارتفاعات، إلخ)",
      "• SOP-OHS-08: قفل ووسم (LOTO)",
      "• SOP-OHS-09: استجابة الإسعاف الأولي",
      "• SOP-OHS-10: الإبلاغ عن الحوادث",
      "",
      "🚨 الطوارئ (4):",
      "• SOP-EM-01: حريق",
      "• SOP-EM-02: تسرّب أمونيا/فريون",
      "• SOP-EM-03: انقطاع الكهرباء",
      "• SOP-EM-04: تجربة إخلاء",
      "",
      "🌱 البيئة (4):",
      "• SOP-ENV-01: فصل النفايات",
      "• SOP-ENV-02: إدارة مياه الصرف",
      "• SOP-ENV-03: تتبع غازات التبريد",
      "• SOP-ENV-04: كفاءة الطاقة",
      "",
      "📋 الإدارة (5):",
      "• SOP-AD-01: ضبط الوثائق",
      "• SOP-AD-02: سجلات التدريب",
      "• SOP-AD-03: التدقيقات الداخلية",
      "• SOP-AD-04: مراجعة الإدارة",
      "• SOP-AD-05: اعتماد الموردين",
      "",
      "📂 كل الـ SOPs موجودة في: HSE ← SOPs (أو /hse/sops)",
    ].join("\n"),
  },

  /* Audit prep */
  auditPrep: {
    en: [
      "✅ AUDIT READINESS CHECKLIST:",
      "",
      "📋 DOCUMENTATION (must be current):",
      "• FSMS Manual + latest revision",
      "• All 17 Policies (signed by Top Management)",
      "• All 28 SOPs (with current revision dates)",
      "• Master Document Register",
      "• Risk Register (reviewed within last 6 months)",
      "",
      "📊 RECORDS (last 12 months):",
      "• Internal Audit reports + closure of findings",
      "• CCP monitoring records (no gaps)",
      "• Calibration records (no overdue)",
      "• Training records (all employees current)",
      "• Pest control reports (monthly)",
      "• Cleaning logs (daily)",
      "• Customer complaints + closure",
      "",
      "🪪 LICENSES (none expired):",
      "• Food establishment license (DM)",
      "• Civil Defence safety cert",
      "• Halal certificate",
      "• Health cards (PIC) for all food handlers",
      "• ISO 22000 / FSSC certificate (if applicable)",
      "",
      "🚨 INCIDENT MANAGEMENT:",
      "• All incidents reported within timeframe",
      "• CAPA closed with evidence",
      "• Effectiveness verified after 30/60/90 days",
      "",
      "🎯 PERFORMANCE:",
      "• Latest MRM minutes available",
      "• KPI trend data (last 12 months)",
      "• Mock recall test (within last 12 months)",
      "",
      "💡 1 week before audit: run a pre-audit walk-through with the team.",
    ].join("\n"),
    ar: [
      "✅ قائمة جاهزية التدقيق:",
      "",
      "📋 التوثيق (حديث):",
      "• دليل FSMS + آخر مراجعة",
      "• كل الـ 17 سياسة (موقّعة من الإدارة العليا)",
      "• كل الـ 28 SOP (بتواريخ المراجعة الحالية)",
      "• السجل الرئيسي للوثائق",
      "• سجل المخاطر (مراجَع خلال آخر 6 أشهر)",
      "",
      "📊 السجلات (آخر 12 شهر):",
      "• تقارير التدقيق الداخلي + إغلاق الملاحظات",
      "• سجلات مراقبة CCP (بدون فجوات)",
      "• سجلات المعايرة (بدون متأخرات)",
      "• سجلات التدريب (كل الموظفين حديث)",
      "• تقارير مكافحة الحشرات (شهرية)",
      "• سجلات التنظيف (يومية)",
      "• شكاوى العملاء + إغلاقها",
      "",
      "🪪 التراخيص (ولا منتهية):",
      "• ترخيص منشأة غذائية (DM)",
      "• شهادة سلامة الدفاع المدني",
      "• شهادة الحلال",
      "• البطاقات الصحية (PIC) لكل متعاملي الأغذية",
      "• ISO 22000 / FSSC (إن وجد)",
      "",
      "🚨 إدارة الحوادث:",
      "• كل الحوادث مُبلَّغ عنها في الوقت",
      "• CAPA مغلقة بدليل",
      "• الفاعلية مُتحقَّق منها بعد 30/60/90 يوماً",
      "",
      "🎯 الأداء:",
      "• محضر MRM الأخير متوفر",
      "• اتجاه KPIs (آخر 12 شهر)",
      "• تمرين سحب وهمي (خلال آخر 12 شهر)",
      "",
      "💡 قبل أسبوع: اعمل جولة ما قبل التدقيق مع الفريق.",
    ].join("\n"),
  },

  /* KPIs */
  kpis: {
    en: [
      "📈 KPIs — where to find them:",
      "",
      "🚚 Fleet KPIs:  /car/fleet-kpi",
      "• Total vehicles, active permits, expiring soon",
      "• Loading hours, cleaning pass rate",
      "",
      "🦺 HSE KPIs:  /hse/monthly-safety-report",
      "• LTIFR, TRIR, near-miss count, closure rate",
      "• Days without injury, training hours",
      "",
      "📋 Audit KPIs:  /monitor/internal-audit",
      "• Closure rate %, open findings, branches covered",
      "• Last audit dates",
      "",
      "📊 Data inventory:  Settings → Data Tools → Data Inventory",
      "• Counts and sizes per record type",
      "",
      "⏰ Expiry tracker:  /admin/expiry-center",
      "• All upcoming expirations across the system",
    ].join("\n"),
    ar: [
      "📈 المؤشرات — وين تلاقيها:",
      "",
      "🚚 مؤشرات الأسطول:  /car/fleet-kpi",
      "• إجمالي المركبات، التراخيص السارية، اللي ستنتهي قريباً",
      "• ساعات التحميل، نسبة نجاح التنظيف",
      "",
      "🦺 مؤشرات HSE:  /hse/monthly-safety-report",
      "• LTIFR، TRIR، شبه الحوادث، نسبة الإغلاق",
      "• أيام بلا إصابات، ساعات التدريب",
      "",
      "📋 مؤشرات التدقيق:  /monitor/internal-audit",
      "• نسبة الإغلاق %، الملاحظات المفتوحة، الفروع المُغطّاة",
      "• تواريخ آخر التدقيقات",
      "",
      "📊 جرد البيانات:  Settings ← Data Tools ← Data Inventory",
      "• أعداد وأحجام كل نوع سجل",
      "",
      "⏰ متتبّع الانتهاء:  /admin/expiry-center",
      "• كل تواريخ الانتهاء القادمة",
    ].join("\n"),
  },

  /* Translation phrases */
  translate: {
    en: [
      "🌐 Common audit phrases — EN ↔ AR:",
      "",
      "• Non-conformance ↔ عدم مطابقة",
      "• Corrective action ↔ إجراء تصحيحي",
      "• Preventive action ↔ إجراء وقائي",
      "• Root cause ↔ سبب جذري",
      "• Critical Control Point (CCP) ↔ نقطة تحكم حرجة",
      "• Critical Limit ↔ الحد الحرج",
      "• Cold chain ↔ سلسلة التبريد",
      "• Evidence ↔ دليل / إثبات",
      "• Closure rate ↔ نسبة الإغلاق",
      "• Hazard analysis ↔ تحليل المخاطر",
      "• Prerequisite Programme (PRP) ↔ البرامج المسبقة",
      "• Operational PRP (OPRP) ↔ برنامج مسبق تشغيلي",
      "• Traceability ↔ التتبع",
      "• Recall ↔ سحب المنتج",
      "• Allergen ↔ مسبب الحساسية",
      "• Cross-contamination ↔ تلوث متبادل",
      "• Sanitation ↔ تعقيم",
      "",
      "💡 For accurate sentence-level translation, plug in an LLM API key.",
    ].join("\n"),
    ar: [
      "🌐 عبارات تدقيق شائعة — عربي ↔ إنجليزي:",
      "",
      "• عدم مطابقة ↔ Non-conformance",
      "• إجراء تصحيحي ↔ Corrective action",
      "• إجراء وقائي ↔ Preventive action",
      "• سبب جذري ↔ Root cause",
      "• نقطة تحكم حرجة (CCP) ↔ Critical Control Point",
      "• الحد الحرج ↔ Critical Limit",
      "• سلسلة التبريد ↔ Cold chain",
      "• دليل / إثبات ↔ Evidence",
      "• نسبة الإغلاق ↔ Closure rate",
      "• تحليل المخاطر ↔ Hazard analysis",
      "• البرامج المسبقة (PRP) ↔ Prerequisite Programme",
      "• برنامج مسبق تشغيلي (OPRP) ↔ Operational PRP",
      "• التتبع ↔ Traceability",
      "• سحب المنتج ↔ Recall",
      "• مسبب الحساسية ↔ Allergen",
      "• تلوث متبادل ↔ Cross-contamination",
      "• تعقيم ↔ Sanitation",
      "",
      "💡 لترجمة جملة دقيقة، يتم توصيل LLM API key.",
    ].join("\n"),
  },

  /* Generic fallback */
  fallback: {
    en: [
      "🤖 I'm a local assistant (no LLM key configured yet).",
      "",
      "I can help with:",
      "📅 Daily and Monthly reports",
      "✍️ Findings, root cause, CAPA",
      "🆕 Adding new products / departments / kitchens",
      "🏭 Manufacturing workflows",
      "📚 All SOPs overview",
      "✅ Audit readiness",
      "📊 Data summaries (expiry, incidents, KPIs)",
      "🌐 Translation phrases",
      "",
      "Use the Quick Actions below 👇 or type a keyword like:",
      '"daily report", "finding", "root cause", "new product", "kitchen", "audit", "SOPs".',
    ].join("\n"),
    ar: [
      "🤖 أنا مساعد محلي (لا يوجد مفتاح LLM حالياً).",
      "",
      "أقدر أساعدك في:",
      "📅 التقارير اليومية والشهرية",
      "✍️ الملاحظات والسبب الجذري وCAPA",
      "🆕 إضافة منتجات / أقسام / مطابخ جديدة",
      "🏭 سير عمل التصنيع",
      "📚 نظرة عامة على كل الـ SOPs",
      "✅ جاهزية التدقيق",
      "📊 ملخصات البيانات (الانتهاء، الحوادث، المؤشرات)",
      "🌐 ترجمة المصطلحات",
      "",
      "استخدم الـ Quick Actions أدناه 👇 أو اكتب كلمة مثل:",
      '"تقرير يومي"، "ملاحظة"، "سبب جذري"، "منتج جديد"، "مطبخ"، "تدقيق"، "SOPs".',
    ].join("\n"),
  },
};

/** Pick EN or AR response based on input language. */
function pick(entry, lang) {
  return entry[lang] || entry.en;
}

/** Local fallback "AI" — rule-based summaries built from server data.
 *  Used until the user configures a real LLM key. */
async function localFallbackAnswer(prompt) {
  const p = prompt.toLowerCase();
  const lang = isArabicText(prompt) ? "ar" : "en";

  // ===== Report-writing helpers =====
  // Daily report
  if (/daily.*(report|inspection)|تقرير.*يومي|الفحص.*اليومي/i.test(p)) {
    return pick(KB.daily, lang);
  }
  // Monthly report
  if (/monthly.*(report|safety|quality)|تقرير.*شهري|الشهري/i.test(p)) {
    return pick(KB.monthly, lang);
  }
  // Finding write-up
  if (/finding|non.?conform|عدم مطابقة|ملاحظة/i.test(p)) {
    return pick(KB.finding, lang);
  }
  // Root cause
  if (/root.?cause|سبب جذري|الأسباب الجذرية|5 whys|الـ ?5 ?لماذات/i.test(p)) {
    return pick(KB.rootCause, lang);
  }
  // Corrective / preventive (CAPA)
  if (/correct|preventive|capa|إجراء تصحيحي|إجراء وقائي|وقائي/i.test(p)) {
    return pick(KB.capa, lang);
  }

  // ===== Operations & SOPs =====
  // New product (FSMS workflow)
  if (/new.*product|add.*product|منتج جديد|إضافة منتج|أضيف منتج/i.test(p)) {
    return pick(KB.newProduct, lang);
  }
  // New department / section
  if (/new.*(department|section|division)|onboard.*department|قسم جديد|إدارة جديدة|إضافة قسم/i.test(p)) {
    return pick(KB.newDept, lang);
  }
  // New kitchen / production area
  if (/new.*kitchen|set.?up.*kitchen|production area|مطبخ جديد|إنشاء مطبخ|إضافة مطبخ|منطقة إنتاج/i.test(p)) {
    return pick(KB.newKitchen, lang);
  }
  // Manufacture a new product
  if (/manufactur|production workflow|تصنيع|سير العمل|خطوات التصنيع/i.test(p)) {
    return pick(KB.manufacture, lang);
  }
  // SOPs overview
  if (/sop|standard operating|إجراءات التشغيل|إجراء تشغيلي|الإجراءات القياسية/i.test(p)) {
    return pick(KB.sopOverview, lang);
  }

  // ===== Translation & audit =====
  if (/translate|ترجم|ترجمة/i.test(p)) {
    return pick(KB.translate, lang);
  }
  if (/audit|تدقيق|جاهزية/i.test(p)) {
    return pick(KB.auditPrep, lang);
  }

  // ===== Data summaries (server-backed) =====
  if (/expir|انتهاء|ينتهي|تنتهي/i.test(p)) {
    return await summarizeExpiring(lang);
  }
  if (/incident|حادث|الحوادث/i.test(p)) {
    return await summarizeIncidents(lang);
  }
  if (/kpi|مؤشر|مؤشرات/i.test(p)) {
    return pick(KB.kpis, lang);
  }

  // ===== Fallback =====
  return pick(KB.fallback, lang);
}

async function summarizeExpiring(lang = "en") {
  const t = (en, ar) => (lang === "ar" ? ar : en);
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=hse_licenses_certs`, { cache: "no-store" });
    if (!res.ok) return t(`❌ Couldn't reach the server (HTTP ${res.status}).`, `❌ تعذّر الوصول للسيرفر (HTTP ${res.status}).`);
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data) ? data : data?.data || data?.items || [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const items = arr
      .map((r) => {
        const p = r?.payload || {};
        const exp = p.expiryDate ? new Date(p.expiryDate) : null;
        if (!exp || isNaN(exp)) return null;
        const days = Math.round((exp - today) / 86400000);
        return { name: p.name?.en || p.name?.ar || p.name || t("(no name)", "(بدون اسم)"), days };
      })
      .filter(Boolean)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
    if (!items.length) return t("✅ No expiry data available for licenses.", "✅ لا توجد بيانات انتهاء للتراخيص.");
    const header = t("⏰ Next 5 to expire:", "⏰ أقرب 5 تنتهي:");
    return header + "\n" + items.map((x) => {
      const label = x.days < 0
        ? t(`expired ${Math.abs(x.days)} days ago`, `منتهي منذ ${Math.abs(x.days)} يوم`)
        : t(`in ${x.days} days`, `خلال ${x.days} يوم`);
      return `• ${x.name} — ${label}`;
    }).join("\n");
  } catch (e) {
    return "❌ " + (e?.message || e);
  }
}

async function summarizeIncidents(lang = "en") {
  const t = (en, ar) => (lang === "ar" ? ar : en);
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=hse_incident_reports`, { cache: "no-store" });
    if (!res.ok) return t("❌ Couldn't reach the server.", "❌ تعذّر الوصول للسيرفر.");
    const data = await res.json().catch(() => ({}));
    const arr = Array.isArray(data) ? data : data?.data || data?.items || [];
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const recent = arr.filter((r) => {
      const d = new Date(r?.payload?.reportDate || r?.createdAt || 0);
      return !isNaN(d) && d >= cutoff;
    });
    if (!recent.length) return t("✅ No incidents recorded in the last 30 days.", "✅ لا حوادث مسجّلة في آخر 30 يوم.");
    const counts = recent.reduce((acc, r) => {
      const sev = r?.payload?.severity || "—";
      acc[sev] = (acc[sev] || 0) + 1;
      return acc;
    }, {});
    const header = t(`🚨 ${recent.length} incident(s) in the last 30 days:`, `🚨 ${recent.length} حادث في آخر 30 يوم:`);
    return header + "\n" + Object.entries(counts).map(([sev, n]) => `• ${sev}: ${n}`).join("\n");
  } catch (e) {
    return "❌ " + (e?.message || e);
  }
}

export default function AIAssistant() {
  const navigate = useNavigate();

  /* Language toggle — synced with the rest of the app via localStorage. */
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("ai_assistant_lang")
        || localStorage.getItem("internal_audit_lang")
        || "en";
    } catch { return "en"; }
  });
  const isAr = lang === "ar";
  const T = (en, ar) => (isAr ? ar : en);

  useEffect(() => { try { localStorage.setItem("ai_assistant_lang", lang); } catch {} }, [lang]);

  const [messages, setMessages] = useState(() => ([{
    role: "assistant",
    text: pick(KB.fallback, lang),
  }]));
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* When language changes and the chat is still untouched (only the intro), refresh the intro. */
  useEffect(() => {
    setMessages((m) => {
      if (m.length === 1 && m[0].role === "assistant") {
        return [{ role: "assistant", text: pick(KB.fallback, lang) }];
      }
      return m;
    });
  }, [lang]);

  async function send(prompt) {
    const text = (prompt ?? input).trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const answer = await localFallbackAnswer(text);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "❌ " + (e?.message || e) }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={s.shell} dir={isAr ? "rtl" : "ltr"}>
      <div style={s.aurora} aria-hidden="true" />
      <div style={s.layout}>
        <div style={s.topbar}>
          <button type="button" onClick={() => navigate(-1)} style={s.backBtn}>
            {T("← Back", "→ رجوع")}
          </button>
          <div style={{ flex: 1 }} />
          {/* Language toggle */}
          <div style={s.langGroup}>
            <button
              type="button"
              onClick={() => setLang("en")}
              style={{ ...s.langBtn, ...(lang === "en" ? s.langBtnActive : {}) }}
            >EN</button>
            <button
              type="button"
              onClick={() => setLang("ar")}
              style={{ ...s.langBtn, ...(lang === "ar" ? s.langBtnActive : {}) }}
            >AR</button>
          </div>
          <div style={s.brand}>
            <div style={s.brandIco}>🤖</div>
            <div>
              <div style={s.brandTop}>AL MAWASHI</div>
              <div style={s.brandSub}>{T("AI Assistant", "المساعد الذكي")}</div>
            </div>
          </div>
        </div>

      <div style={s.header}>
        <div>
          <h2 style={s.h2}>
            🤖 {T("AI Assistant", "المساعد الذكي")}{" "}
            <span style={s.preview}>{T("(Preview)", "(تجريبي)")}</span>
          </h2>
          <p style={s.intro}>
            {T(
              "Bilingual local assistant — answers about reports, SOPs, HACCP, new products/kitchens/departments, audit prep, and live data from your server.",
              "مساعد محلي ثنائي اللغة — يجيب عن التقارير وإجراءات التشغيل وHACCP وإضافة المنتجات/المطابخ/الأقسام وجاهزية التدقيق وبيانات السيرفر الحيّة."
            )}
          </p>
        </div>
      </div>

      <div style={s.banner}>
        {T(
          "💡 Tip: type in Arabic or English — the assistant detects your language automatically and replies in the same one. Click any Quick Action card below to jump start.",
          "💡 ملاحظة: اكتب بالعربي أو الإنجليزي — المساعد يكتشف اللغة تلقائياً ويرد بنفسها. اضغط على أي بطاقة Quick Action في الأسفل للبدء."
        )}
      </div>

      {/* Quick actions */}
      <div style={s.quickGrid}>
        {QUICK_ACTIONS.map((a) => {
          const title  = isAr ? a.titleAr  : a.titleEn;
          const prompt = isAr ? a.promptAr : a.promptEn;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => send(prompt)}
              disabled={busy}
              style={s.quickCard}
            >
              <div style={{ fontSize: 26, marginBottom: 6 }}>{a.icon}</div>
              <div style={{ fontWeight: 1000, fontSize: 13, color: "#0f172a" }}>{title}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4, fontWeight: 700, lineHeight: 1.4 }}>
                {prompt.length > 60 ? prompt.slice(0, 60) + "…" : prompt}
              </div>
            </button>
          );
        })}
      </div>

      {/* Chat */}
      <div style={s.chatCard}>
        <div style={s.chatTitle}>💬 {T("Chat", "المحادثة")}</div>
        <div style={s.chatBody}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                ...s.bubble,
                background: m.role === "user" ? "linear-gradient(135deg,#2563eb,#1d4ed8)" : "#f1f5f9",
                color: m.role === "user" ? "#fff" : "#0f172a",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              }}>
                <pre style={{ margin: 0, fontFamily: "inherit", whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6 }}>{m.text}</pre>
              </div>
            </div>
          ))}
          {busy && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ ...s.bubble, background: "#f1f5f9", color: "#64748b" }}>
                {T("⏳ Thinking…", "⏳ جاري التفكير…")}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div style={s.chatInputRow}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={T("Ask anything about your data…", "اسأل أي شيء عن بياناتك…")}
            disabled={busy}
            style={s.chatInput}
          />
          <button type="button" onClick={() => send()} disabled={busy || !input.trim()} style={s.sendBtn}>
            {busy ? "…" : T("Send", "إرسال")}
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

const s = {
  shell: {
    position: "relative",
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)",
    fontFamily: 'ui-sans-serif, system-ui, "Segoe UI", Cairo, sans-serif',
    color: "#0f172a",
    paddingBottom: 40,
    overflowX: "hidden",
  },
  aurora: {
    position: "fixed", inset: "-20vmax", zIndex: 0, pointerEvents: "none",
    background:
      "radial-gradient(40vmax 40vmax at 12% 18%, rgba(124,58,237,.18), transparent 60%)," +
      "radial-gradient(45vmax 35vmax at 85% 12%, rgba(37,99,235,.18), transparent 60%)," +
      "radial-gradient(40vmax 35vmax at 50% 90%, rgba(16,185,129,.14), transparent 60%)",
  },
  layout: {
    position: "relative", zIndex: 1,
    maxWidth: 1080, margin: "0 auto",
    padding: "18px 18px 0",
  },
  topbar: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 14px", background: "rgba(255,255,255,.85)",
    border: "1px solid rgba(226,232,240,.95)",
    borderRadius: 16, marginBottom: 18,
    boxShadow: "0 10px 30px rgba(2,6,23,.08)",
    backdropFilter: "blur(10px)",
  },
  backBtn: {
    padding: "8px 14px", borderRadius: 999,
    background: "#fff", color: "#0f172a",
    border: "1px solid #cbd5e1", fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  langGroup: {
    display: "inline-flex", gap: 4, padding: 4,
    background: "#f1f5f9", borderRadius: 999, border: "1px solid #e2e8f0",
  },
  langBtn: {
    padding: "5px 12px", borderRadius: 999,
    background: "transparent", color: "#475569",
    border: "none", fontWeight: 1000, fontSize: 12,
    cursor: "pointer", fontFamily: "inherit",
  },
  langBtnActive: {
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", boxShadow: "0 4px 10px rgba(37,99,235,.30)",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandIco: {
    width: 38, height: 38, borderRadius: 10,
    background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "#fff",
    display: "grid", placeItems: "center", fontSize: 20,
    boxShadow: "0 8px 18px rgba(37,99,235,.30)",
  },
  brandTop: { fontWeight: 1000, fontSize: 13, lineHeight: 1.1 },
  brandSub: { fontWeight: 800, fontSize: 11, color: "#64748b", marginTop: 2 },
  header: { marginBottom: 16 },
  h2: { fontSize: 20, fontWeight: 1000, color: "#0f172a", margin: 0 },
  preview: { fontSize: 11, padding: "3px 8px", borderRadius: 999, background: "linear-gradient(135deg,#fef3c7,#fff7ed)", color: "#92400e", marginInlineStart: 8 },
  intro: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4, maxWidth: 560, lineHeight: 1.6 },
  banner: {
    background: "linear-gradient(135deg,#dbeafe,#eff6ff)", border: "1px solid #bfdbfe",
    padding: "12px 16px", borderRadius: 12,
    fontSize: 13, color: "#1e40af", fontWeight: 700, lineHeight: 1.6,
    marginBottom: 18,
  },
  quickGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 10, marginBottom: 18,
  },
  quickCard: {
    padding: "14px 14px", borderRadius: 14,
    background: "#fff", border: "1px solid #e2e8f0",
    textAlign: "start", cursor: "pointer", fontFamily: "inherit",
    transition: "all .15s",
    boxShadow: "0 4px 10px rgba(2,6,23,.04)",
  },
  chatCard: {
    background: "#fff", borderRadius: 14, padding: 16,
    border: "1px solid #e2e8f0", boxShadow: "0 8px 18px rgba(2,6,23,.06)",
  },
  chatTitle: { fontSize: 14, fontWeight: 1000, color: "#0f172a", marginBottom: 10 },
  chatBody: {
    display: "flex", flexDirection: "column", gap: 10,
    minHeight: 280, maxHeight: 420, overflow: "auto",
    padding: 12, background: "#f8fafc", borderRadius: 10,
    marginBottom: 12,
  },
  bubble: {
    maxWidth: "80%", padding: "10px 14px",
    fontWeight: 700, fontSize: 13,
    boxShadow: "0 2px 6px rgba(2,6,23,.06)",
  },
  chatInputRow: { display: "flex", gap: 8 },
  chatInput: {
    flex: 1, padding: "10px 14px", borderRadius: 10,
    border: "1px solid #cbd5e1", fontWeight: 700, fontSize: 13,
    color: "#0f172a", outline: "none",
  },
  sendBtn: {
    padding: "10px 18px", borderRadius: 10,
    background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "#fff",
    border: "none", fontWeight: 1000, fontSize: 13, cursor: "pointer",
  },
};
