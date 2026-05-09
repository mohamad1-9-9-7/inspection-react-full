// src/pages/haccp and iso/RiskRegister/RiskRegisterView.jsx
// FSMS Risk Register — ISO 22000:2018 Clause 6.1
// Closes Major NC #2 from SGS Stage 2 audit (FSMS-RA-01 reference document materialized)
// Based on the HSE Risk Register pattern but scoped to FSMS organizational risks (not BPC food hazards — those are in HACCP Plan 8.5).

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import { calcRiskScore, riskLevelLabel } from "../../hse/hseShared";

const TYPE = "fsms_risk_register_item";

/* ─────────────────────────────────────────────────────────────
   Strategic FSMS areas (NOT operational areas — those are in HSE)
   ───────────────────────────────────────────────────────────── */
const FSMS_AREAS = [
  { v: "HQ — Top Management", ar: "الإدارة العليا — المقر الرئيسي", en: "HQ — Top Management" },
  { v: "FSMS / QA Department", ar: "قسم FSMS / ضمان الجودة", en: "FSMS / QA Department" },
  { v: "Supply Chain — International Suppliers", ar: "سلسلة التوريد — موردون دوليون", en: "Supply Chain — International Suppliers" },
  { v: "Supply Chain — Local Suppliers", ar: "سلسلة التوريد — موردون محليون", en: "Supply Chain — Local Suppliers" },
  { v: "Production Operations", ar: "العمليات الإنتاجية", en: "Production Operations" },
  { v: "Cold Chain — Storage & Transport", ar: "سلسلة التبريد — التخزين والنقل", en: "Cold Chain — Storage & Transport" },
  { v: "IT / Cybersecurity", ar: "تقنية المعلومات / الأمن السيبراني", en: "IT / Cybersecurity" },
  { v: "Regulatory — DM / ADAFSA / MoCCAE", ar: "تنظيمي — البلدية / أدافسا / MoCCAE", en: "Regulatory — DM / ADAFSA / MoCCAE" },
  { v: "Halal / ESMA", ar: "الحلال / ESMA", en: "Halal / ESMA" },
  { v: "Customers & Reputation", ar: "العملاء والسمعة", en: "Customers & Reputation" },
  { v: "Workforce / HR", ar: "القوى العاملة / الموارد البشرية", en: "Workforce / HR" },
  { v: "Financial", ar: "المالية", en: "Financial" },
  { v: "All Sites", ar: "جميع المواقع", en: "All Sites" },
  // Operational areas — added from FSMS-RA-01 internal/external risk assessment
  { v: "Receiving & Carcass Handling", ar: "الاستلام ومناولة الذبائح", en: "Receiving & Carcass Handling" },
  { v: "Cutting & Processing", ar: "التقطيع والمعالجة", en: "Cutting & Processing" },
  { v: "Packaging & Labeling", ar: "التعبئة والوسم", en: "Packaging & Labeling" },
  { v: "Maintenance & Engineering", ar: "الصيانة والهندسة", en: "Maintenance & Engineering" },
  { v: "Waste Management", ar: "إدارة النفايات", en: "Waste Management" },
  { v: "Transport — Road Logistics", ar: "النقل — اللوجستيات البرية", en: "Transport — Road Logistics" },
  { v: "Market & Demand", ar: "السوق والطلب", en: "Market & Demand" },
];

/* ─────────────────────────────────────────────────────────────
   FSMS Risk Categories (strategic, not BPC-only)
   ───────────────────────────────────────────────────────────── */
const FSMS_RISK_CATEGORIES = [
  { v: "regulatory",   ar: "تنظيمي / امتثال (تشريعات جديدة، DM/ADAFSA)", en: "Regulatory / Compliance (new laws, DM/ADAFSA)" },
  { v: "supply",       ar: "سلسلة التوريد (فشل مورد، تأخير استيراد)",     en: "Supply Chain (supplier failure, import delays)" },
  { v: "cyber",        ar: "أمن سيبراني / IT (هجوم، تعطل ERP)",            en: "Cybersecurity / IT (attack, ERP outage)" },
  { v: "fooddefense",  ar: "دفاع غذائي (تخريب، تلوث متعمد)",                en: "Food Defense (sabotage, intentional contamination)" },
  { v: "foodfraud",    ar: "غش غذائي (استبدال نوع، وسم خاطئ)",              en: "Food Fraud (species substitution, mislabeling)" },
  { v: "climate",      ar: "بيئي / مناخي (موجة حر، فيضان)",                  en: "Environmental / Climate (heatwave, flood)" },
  { v: "workforce",    ar: "قوى عاملة (استقالة موظف رئيسي، فجوة مهارات)", en: "Workforce (key staff loss, skills gap)" },
  { v: "financial",    ar: "مالي (تكاليف، عملات، تكلفة سحب)",                en: "Financial (costs, currency, recall cost)" },
  { v: "reputation",   ar: "سمعة (Social media، شكاوى عميل)",                en: "Reputational (social media, customer crises)" },
  { v: "operational",  ar: "تشغيلي (تعطّل معدات، فشل CCP)",                en: "Operational (equipment failure, CCP failure trend)" },
  { v: "customer",     ar: "عميل (فقدان عميل رئيسي، نزاع تعاقدي)",          en: "Customer (major customer loss, contract dispute)" },
  { v: "halal",        ar: "حلال (سحب اعتماد ESMA، تغيير جهة شهادة)",      en: "Halal (ESMA decert., certifier change)" },
  { v: "geopolitical", ar: "جيوسياسي (نزاعات، عقوبات)",                       en: "Geopolitical (conflicts, sanctions)" },
  { v: "allergen",     ar: "مسببات الحساسية (allergen غير معلن)",            en: "Allergen Control (undeclared allergen)" },
  { v: "emerging",     ar: "ناشئ (مرض جديد، مقاومة مضادات)",                en: "Emerging Hazard (new pathogen, AMR)" },
];

/* ─────────────────────────────────────────────────────────────
   20 FSMS-specific seed risks for TELT/Al Mawashi (UAE meat industry)
   ───────────────────────────────────────────────────────────── */
const SEED_RISKS = [
  {
    id: "fsms-r1", area: "Regulatory — DM / ADAFSA / MoCCAE", category: "regulatory",
    hazard: { ar: "تغيير في قانون بلدية دبي/ADAFSA يستوجب تحديث FSMS بالكامل", en: "Change in Dubai Municipality / ADAFSA law requiring full FSMS update" },
    consequence: { ar: "عدم مطابقة، غرامات، تعليق رخصة، تأخير شهادة ISO", en: "Non-compliance, fines, license suspension, ISO certification delay" },
    likelihood: 4, severity: 4,
    controls: { ar: "اشتراك في تحديثات DM/ADAFSA الرسمية، مراجعة ربع سنوية للامتثال، عضوية في جمعية الصناعات الغذائية الإماراتية، استشاري قانوني متخصص", en: "Subscribe to DM/ADAFSA official updates, quarterly compliance review, UAE Food Industry Association membership, specialized legal consultant" },
    owner: "QA Manager + Legal Advisor",
  },
  {
    id: "fsms-r2", area: "Supply Chain — International Suppliers", category: "supply",
    hazard: { ar: "فشل مورد رئيسي للحوم (مثلاً مسلخ أسترالي/برازيلي معتمد)", en: "Failure of key meat supplier (e.g., approved Australian/Brazilian abattoir)" },
    consequence: { ar: "نقص في الإمداد، توقف الإنتاج لأسابيع، فقدان ثقة العملاء", en: "Supply shortage, production halt for weeks, loss of customer trust" },
    likelihood: 3, severity: 5,
    controls: { ar: "تنويع قائمة الموردين المعتمدين (≥3 موردين لكل صنف)، عقود طويلة الأجل، مخزون آمن 4 أسابيع، تقييم مالي ربع سنوي للموردين الرئيسيين", en: "Diversify approved supplier list (≥3 per item), long-term contracts, 4-week safety stock, quarterly financial assessment of key suppliers" },
    owner: "Procurement Manager",
  },
  {
    id: "fsms-r3", area: "IT / Cybersecurity", category: "cyber",
    hazard: { ar: "هجوم Ransomware يعطّل ERP/FSMS لأكثر من 48 ساعة", en: "Ransomware attack disabling ERP/FSMS for >48 hours" },
    consequence: { ar: "فقدان سجلات تتبع، فشل تدقيق ISO، انقطاع تشغيلي، فدية", en: "Loss of traceability records, ISO audit failure, operational outage, ransom" },
    likelihood: 3, severity: 5,
    controls: { ar: "نسخ احتياطي يومي offline، MFA للأنظمة الحساسة، اختبار اختراق سنوي، خطة استرداد كوارث (DRP)، تأمين سيبراني، تدريب الموظفين على Phishing", en: "Daily offline backup, MFA on critical systems, annual penetration testing, Disaster Recovery Plan, cyber insurance, anti-phishing training" },
    owner: "IT Manager + FSMS Team Leader",
  },
  {
    id: "fsms-r4", area: "FSMS / QA Department", category: "fooddefense",
    hazard: { ar: "تلوث متعمد للمنتج من موظف ساخط أو طرف خارجي (Sabotage)", en: "Intentional product contamination by disgruntled employee or external actor" },
    consequence: { ar: "أزمة صحية جماعية، سحب فوري، انهيار العلامة التجارية، ملاحقة قضائية", en: "Mass health crisis, immediate recall, brand collapse, legal prosecution" },
    likelihood: 2, severity: 5,
    controls: { ar: "SOP 23 — Food Defense Procedure، CCTV على المراحل الحرجة، تحكم وصول مناطق الإنتاج، فحص خلفية الموظفين، Whistleblower hotline", en: "SOP 23 — Food Defense Procedure, CCTV on critical stages, restricted production access, employee background checks, whistleblower hotline" },
    owner: "Security Officer + QA Manager",
  },
  {
    id: "fsms-r5", area: "Supply Chain — International Suppliers", category: "foodfraud",
    hazard: { ar: "غش غذائي — استبدال نوع لحم (مثلاً ضأن مكان عجل) من المورد", en: "Food fraud — meat species substitution (e.g., lamb labeled as veal) from supplier" },
    consequence: { ar: "خسارة ثقة العميل، سحب من السوق، سحب شهادة حلال، غرامات", en: "Customer trust loss, market recall, halal certification withdrawal, fines" },
    likelihood: 3, severity: 5,
    controls: { ar: "SOP 22 — Food Fraud Prevention، DNA testing سنوي للحوم عشوائياً، COA verification لكل شحنة، audit للموردين كل 6 شهور، VACCP (Vulnerability Assessment)", en: "SOP 22 — Food Fraud Prevention, annual DNA testing on random samples, COA verification per shipment, supplier audit every 6 months, VACCP" },
    owner: "QA Manager + Procurement",
  },
  {
    id: "fsms-r6", area: "Cold Chain — Storage & Transport", category: "climate",
    hazard: { ar: "موجة حر شديدة (>50°م) تؤثر على cold chain خلال النقل", en: "Severe heatwave (>50°C) affecting cold chain during transport" },
    consequence: { ar: "انحراف حرارة، فساد المنتج، خسائر مالية، إعادة شحن", en: "Temperature deviation, product spoilage, financial loss, re-shipment" },
    likelihood: 4, severity: 4,
    controls: { ar: "Data loggers في كل شاحنة مع SMS alerts، نقل ليلي بالصيف، فحص الـ insulation سنوياً، شاحنات احتياطية، تأمين شحنات", en: "Data loggers per truck with SMS alerts, summer night-time delivery, annual insulation check, backup trucks, shipment insurance" },
    owner: "Logistics Manager",
  },
  {
    id: "fsms-r7", area: "Workforce / HR", category: "workforce",
    hazard: { ar: "استقالة Quality Manager (Mohamed) بدون خلافة جاهزة", en: "Quality Manager (Mohamed) resignation without succession plan" },
    consequence: { ar: "فجوة في التحقق من CCPs، تأخر MRM، فشل تدقيق ISO، عدم استمرارية النظام", en: "Gap in CCP verification, MRM delays, ISO audit failure, system discontinuity" },
    likelihood: 3, severity: 4,
    controls: { ar: "خطة خلافة موثقة لكل دور رئيسي، تدريب نائب QA، توثيق المعرفة (knowledge management)، Cross-training، عقد ارتباط لمدة 12 شهر", en: "Documented succession plan per key role, deputy QA training, knowledge management, cross-training, 12-month retention contract" },
    owner: "HR + GM",
  },
  {
    id: "fsms-r8", area: "Financial", category: "financial",
    hazard: { ar: "ارتفاع تكلفة الكهرباء/الديزل بأكثر من 30% يؤثر على cold storage", en: "Electricity/diesel cost spike >30% affecting cold storage" },
    consequence: { ar: "ضغط على الهامش الربحي، تأخير صيانة، خفض جودة المعدات", en: "Margin pressure, deferred maintenance, equipment quality reduction" },
    likelihood: 3, severity: 3,
    controls: { ar: "مراقبة أسعار الطاقة شهرياً، عقود ثابتة، استثمار في solar/efficiency، Pass-through clause مع العملاء", en: "Monthly energy price monitoring, fixed contracts, solar/efficiency investment, customer pass-through clauses" },
    owner: "CFO + Operations",
  },
  {
    id: "fsms-r9", area: "Customers & Reputation", category: "reputation",
    hazard: { ar: "شكوى عميل تنتشر على Social Media (TikTok / Instagram)", en: "Customer complaint going viral on Social Media (TikTok / Instagram)" },
    consequence: { ar: "ضرر سمعة دائم، انخفاض المبيعات، إلغاء عقود، تكلفة PR", en: "Lasting reputational damage, sales drop, contract cancellations, PR cost" },
    likelihood: 4, severity: 4,
    controls: { ar: "SOP — Customer Complaints مع SLA 24h، Social Media monitoring، خطة إعلامية للأزمات، تدريب فريق الاستجابة", en: "SOP — Customer Complaints with 24h SLA, social media monitoring, crisis communication plan, response team training" },
    owner: "Marketing + QA",
  },
  {
    id: "fsms-r10", area: "Production Operations", category: "operational",
    hazard: { ar: "فشل calibration للمعدات الحرجة بسبب فقدان شركة المعايرة المعتمدة", en: "Critical equipment calibration failure due to loss of accredited calibration company" },
    consequence: { ar: "بطلان قراءات CCP، عدم مطابقة 8.7، Hold للمنتج", en: "Invalid CCP readings, non-conformance to 8.7, product hold" },
    likelihood: 2, severity: 4,
    controls: { ar: "≥2 شركات معايرة معتمدة، شهادات Master probes داخلية، calibration log، spare probes معتمدة", en: "≥2 accredited calibration companies, internal master probe certificates, calibration log, spare accredited probes" },
    owner: "QA + Maintenance",
  },
  {
    id: "fsms-r11", area: "Customers & Reputation", category: "customer",
    hazard: { ar: "فقدان عميل رئيسي (فندق/سلسلة سوبرماركت كبرى) يمثل >25% من المبيعات", en: "Loss of major customer (hotel chain / large supermarket) representing >25% of sales" },
    consequence: { ar: "ضغط نقدي، تخفيض موظفين، تأجيل استثمار FSMS", en: "Cash pressure, staff reduction, FSMS investment delays" },
    likelihood: 2, severity: 5,
    controls: { ar: "Diversification (لا عميل >20% من المبيعات)، CRM لرضا العملاء، عقود طويلة الأجل، خدمة استثنائية", en: "Diversification (no customer >20% of sales), customer satisfaction CRM, long-term contracts, exceptional service" },
    owner: "Sales + GM",
  },
  {
    id: "fsms-r12", area: "Halal / ESMA", category: "halal",
    hazard: { ar: "سحب شهادة الحلال من ESMA بسبب عدم مطابقة في تدقيق", en: "Halal certification withdrawal by ESMA due to audit non-conformance" },
    consequence: { ar: "فقدان السوق المحلي والإسلامي، إغلاق فروع، ضرر سمعة عميق", en: "Loss of local and Islamic market, branch closures, deep reputational damage" },
    likelihood: 2, severity: 5,
    controls: { ar: "SOP 30 — Halal Assurance System، Halal Coordinator رسمي، تدقيق داخلي ربع سنوي للحلال، COA من جهة معتمدة لكل شحنة، تدريب سنوي", en: "SOP 30 — Halal Assurance System, official Halal Coordinator, quarterly internal Halal audit, COA from accredited body per shipment, annual training" },
    owner: "Halal Coordinator + QA Manager",
  },
  {
    id: "fsms-r13", area: "Cold Chain — Storage & Transport", category: "operational",
    hazard: { ar: "انقطاع كهرباء طويل (>4 ساعات) في cold storage", en: "Extended power outage (>4 hours) in cold storage" },
    consequence: { ar: "فقدان شحنة كاملة، خرق CCP-2، سحب من السوق", en: "Total shipment loss, CCP-2 breach, market withdrawal" },
    likelihood: 2, severity: 5,
    controls: { ar: "مولّد احتياطي ديزل (auto-start)، اختبار شهري، تعاقد مع DEWA للأولوية، خطة إخلاء طارئ للمنتج إلى cold storage بديل", en: "Diesel backup generator (auto-start), monthly test, DEWA priority contract, emergency product evacuation plan to alternate cold storage" },
    owner: "Maintenance + Operations",
  },
  {
    id: "fsms-r14", area: "FSMS / QA Department", category: "operational",
    hazard: { ar: "فشل Mock Recall (نسبة الاسترداد <99% خلال 4 ساعات)", en: "Mock Recall failure (recovery <99% within 4 hours)" },
    consequence: { ar: "عدم مطابقة ISO 8.3، إنذار من المدقق، فقدان ثقة الإدارة بالنظام", en: "ISO 8.3 non-conformance, auditor finding, loss of management trust" },
    likelihood: 3, severity: 4,
    controls: { ar: "تمرين Mock Recall ربع سنوي، ERP traceability موحد، Lot coding واضح على كل منتج، تدريب فريق الاسترداد", en: "Quarterly mock recall drill, unified ERP traceability, clear lot coding on every product, recall team training" },
    owner: "QA + Distribution",
  },
  {
    id: "fsms-r15", area: "Supply Chain — International Suppliers", category: "emerging",
    hazard: { ar: "ظهور mutation جديدة من Salmonella مقاومة للأنتيبيوتيك (AMR)", en: "Emergence of new antibiotic-resistant Salmonella mutation (AMR)" },
    consequence: { ar: "خرق سلامة الغذاء، أزمة صحية، sanctions على الموردين، تدخل تنظيمي", en: "Food safety breach, health crisis, supplier sanctions, regulatory intervention" },
    likelihood: 2, severity: 5,
    controls: { ar: "اشتراك في تنبيهات WHO/FAO، COA يشمل antibiotic residues testing، اختبار microbiological سنوي للمنتجات، تدريب على المخاطر الناشئة", en: "WHO/FAO alerts subscription, COA includes antibiotic residue testing, annual product microbiological testing, emerging risks training" },
    owner: "QA Manager",
  },
  {
    id: "fsms-r16", area: "Regulatory — DM / ADAFSA / MoCCAE", category: "regulatory",
    hazard: { ar: "تغيير في GSO 9 / GSO 2233 (متطلبات الوسم) يستوجب إعادة طباعة كل الملصقات", en: "Change in GSO 9 / GSO 2233 (labeling requirements) requiring full label reprint" },
    consequence: { ar: "تكلفة إعادة الطباعة، تأخير شحن، عدم مطابقة مؤقتة، شكاوى عملاء", en: "Reprint cost, shipping delay, temporary non-compliance, customer complaints" },
    likelihood: 3, severity: 3,
    controls: { ar: "اشتراك في تنبيهات GSO، مراجعة سنوية للملصقات، صلاحيات digital labeling، احتياطي ملصقات لـ 30 يوم فقط", en: "GSO alerts subscription, annual label review, digital labeling capability, 30-day label inventory only" },
    owner: "QA + Marketing",
  },
  {
    id: "fsms-r17", area: "Regulatory — DM / ADAFSA / MoCCAE", category: "regulatory",
    hazard: { ar: "توقف بلدية دبي عن قبول COA من مختبر معتمد كانت تعتمده TELT", en: "Dubai Municipality stops accepting COA from a lab TELT was using" },
    consequence: { ar: "رفض شحنات، تأخير clearance، تكلفة إضافية لاختبار في مختبر آخر", en: "Shipment rejection, clearance delays, additional cost for re-testing in another lab" },
    likelihood: 3, severity: 3,
    controls: { ar: "≥2 مختبرات معتمدة من DM، مراقبة قائمة المعتمدين شهرياً، عقود مرنة", en: "≥2 DM-accredited labs, monthly monitoring of accredited list, flexible contracts" },
    owner: "QA + Procurement",
  },
  {
    id: "fsms-r18", area: "Supply Chain — International Suppliers", category: "geopolitical",
    hazard: { ar: "حدث جيوسياسي (نزاع، عقوبات، إغلاق ميناء) يؤثر على imports", en: "Geopolitical event (conflict, sanctions, port closure) affecting imports" },
    consequence: { ar: "تأخير شحنات بأسابيع، نقص مخزون، رفع أسعار", en: "Weeks of shipment delay, stock shortage, price hikes" },
    likelihood: 3, severity: 4,
    controls: { ar: "تنويع بلد المنشأ (≥3 دول)، مخزون آمن 6 أسابيع، مراقبة أخبار الشحن، شركاء logistics متعددون", en: "Country-of-origin diversification (≥3 countries), 6-week safety stock, shipping news monitoring, multiple logistics partners" },
    owner: "Procurement + Logistics",
  },
  {
    id: "fsms-r19", area: "Production Operations", category: "allergen",
    hazard: { ar: "اكتشاف allergen غير معلن في وصفة منتج (مثل soy في تتبيلة دجاج)", en: "Discovery of undeclared allergen in product recipe (e.g., soy in chicken marinade)" },
    consequence: { ar: "سحب فوري Class II، إعادة وسم، شكاوى مستهلكين، غرامات DM", en: "Immediate Class II recall, re-labeling, consumer complaints, DM fines" },
    likelihood: 3, severity: 4,
    controls: { ar: "SOP 12 (Allergen Control) Rev 02، Allergen Master List لكل وصفة، اختبار ELISA دوري، تدريب الإنتاج، تحقق المورد", en: "SOP 12 (Allergen Control) Rev 02, Allergen Master List per recipe, periodic ELISA testing, production training, supplier verification" },
    owner: "QA Manager",
  },
  {
    id: "fsms-r20", area: "All Sites", category: "operational",
    hazard: { ar: "Outbreak من E. coli O157:H7 مرتبطة بالمنتج (تأكد عن طريق MoH)", en: "E. coli O157:H7 outbreak linked to product (confirmed by MoH)" },
    consequence: { ar: "أزمة صحية وطنية، سحب جماعي، إغلاق مؤقت، ملاحقات قضائية", en: "National health crisis, mass recall, temporary closure, legal prosecution" },
    likelihood: 1, severity: 5,
    controls: { ar: "Real Recall module جاهز، خطة استجابة 24h، تأمين Product Liability، تواصل مع DM/MoH/ADAFSA، COA يشمل E.coli pathogenic لكل شحنة", en: "Real Recall module ready, 24h response plan, Product Liability insurance, DM/MoH/ADAFSA communication, COA includes pathogenic E.coli per shipment" },
    owner: "GM + QA + Legal",
  },

  /* ─────────────────────────────────────────────────────────────
     Operational risks — sourced verbatim from FSMS-RA-01 controlled
     document (TELT internal/external risk assessment table).
     Strategic risks above (r1–r20) cover system-level threats;
     these (r21–r35) cover day-to-day operational risks.
     ───────────────────────────────────────────────────────────── */
  {
    id: "fsms-r21", area: "Supply Chain — International Suppliers", category: "geopolitical",
    hazard: { ar: "تأخير الشحنات بسبب الحرب", en: "Shipment delays due to war" },
    consequence: { ar: "نقص في الإمداد وارتفاع الأسعار", en: "Shortage & price increase" },
    likelihood: 3, severity: 5,
    controls: { ar: "موردون بدلاء، مخزون احتياطي", en: "Alternate suppliers, buffer stock" },
    owner: "Procurement Manager",
  },
  {
    id: "fsms-r22", area: "Transport — Road Logistics", category: "climate",
    hazard: { ar: "أثر الفيضانات على النقل", en: "Flood impact on transport" },
    consequence: { ar: "تأخير وخطر تلوث", en: "Delay & contamination risk" },
    likelihood: 4, severity: 5,
    controls: { ar: "طرق بديلة، شاحنات معزولة", en: "Alternative routes, insulated trucks" },
    owner: "Logistics Manager",
  },
  {
    id: "fsms-r23", area: "Transport — Road Logistics", category: "operational",
    hazard: { ar: "إغلاق حركة المرور", en: "Traffic block" },
    consequence: { ar: "تأخير وتجاوز درجة الحرارة", en: "Delay & temperature abuse" },
    likelihood: 4, severity: 5,
    controls: { ar: "تتبع GPS، تخطيط المسار", en: "GPS tracking, route planning" },
    owner: "Logistics Manager",
  },
  {
    id: "fsms-r24", area: "Financial", category: "financial",
    hazard: { ar: "زيادة سعر الوقود", en: "Fuel price increase" },
    consequence: { ar: "زيادة التكلفة", en: "Increased cost" },
    likelihood: 3, severity: 4,
    controls: { ar: "تحسين المسارات، عقود أسعار ثابتة", en: "Route optimization, fixed-price contracts" },
    owner: "CFO + Logistics",
  },
  {
    id: "fsms-r25", area: "Transport — Road Logistics", category: "operational",
    hazard: { ar: "نقص الوقود", en: "Fuel shortage" },
    consequence: { ar: "انقطاع التوصيل", en: "Delivery interruption" },
    likelihood: 3, severity: 5,
    controls: { ar: "تخطيط احتياطي للوقود", en: "Backup fuel planning" },
    owner: "Logistics Manager",
  },
  {
    id: "fsms-r26", area: "Market & Demand", category: "customer",
    hazard: { ar: "ارتفاع الطلب الموسمي", en: "High seasonal demand" },
    consequence: { ar: "نقص المخزون", en: "Stock shortage" },
    likelihood: 4, severity: 3,
    controls: { ar: "تخطيط الإنتاج، التنبؤ بالطلب", en: "Production planning, demand forecasting" },
    owner: "Production + Sales",
  },
  {
    id: "fsms-r27", area: "All Sites", category: "climate",
    hazard: { ar: "تلوث ناتج عن الفيضانات", en: "Flood contamination" },
    consequence: { ar: "خطر النظافة", en: "Hygiene risk" },
    likelihood: 3, severity: 5,
    controls: { ar: "ضبط النظافة والتصريف", en: "Sanitation & drainage control" },
    owner: "QA + Facilities",
  },
  {
    id: "fsms-r28", area: "Receiving & Carcass Handling", category: "operational",
    hazard: { ar: "تعليق الذبيحة بشكل غير سليم", en: "Improper carcass hanging" },
    consequence: { ar: "تلوث المنتج", en: "Contamination" },
    likelihood: 4, severity: 5,
    controls: { ar: "تدريب صحيح، SOP", en: "Proper training, SOP" },
    owner: "QA + Receiving Supervisor",
  },
  {
    id: "fsms-r29", area: "Waste Management", category: "operational",
    hazard: { ar: "التخلص غير السليم من النفايات", en: "Improper waste disposal" },
    consequence: { ar: "آفات وتلوث", en: "Pest & contamination" },
    likelihood: 4, severity: 5,
    controls: { ar: "SOP للنفايات، حاويات مرمّزة", en: "Waste SOP, labeled bins" },
    owner: "QA + Housekeeping",
  },
  {
    id: "fsms-r30", area: "Production Operations", category: "operational",
    hazard: { ar: "نقص الإشراف", en: "Lack of supervision" },
    consequence: { ar: "أخطاء في العملية", en: "Process errors" },
    likelihood: 4, severity: 5,
    controls: { ar: "تعيين مشرفين", en: "Assign supervisors" },
    owner: "Production Manager",
  },
  {
    id: "fsms-r31", area: "Cold Chain — Storage & Transport", category: "operational",
    hazard: { ar: "تعطّل الـ Chiller", en: "Chiller failure" },
    consequence: { ar: "فساد المنتج", en: "Product spoilage" },
    likelihood: 4, severity: 5,
    controls: { ar: "صيانة وقائية", en: "Preventive maintenance" },
    owner: "Maintenance + Cold Storage Supervisor",
  },
  {
    id: "fsms-r32", area: "Cutting & Processing", category: "operational",
    hazard: { ar: "تلوث متبادل في التقطيع", en: "Cross contamination during cutting" },
    consequence: { ar: "خطر سلامة الغذاء", en: "Food safety risk" },
    likelihood: 4, severity: 5,
    controls: { ar: "SOP للنظافة", en: "Sanitation SOP" },
    owner: "QA + Production",
  },
  {
    id: "fsms-r33", area: "Packaging & Labeling", category: "regulatory",
    hazard: { ar: "وسم غير صحيح", en: "Incorrect labeling" },
    consequence: { ar: "عدم مطابقة قانونية", en: "Legal non-compliance" },
    likelihood: 3, severity: 5,
    controls: { ar: "التحقق من الملصق", en: "Label verification" },
    owner: "QA + Packaging Supervisor",
  },
  {
    id: "fsms-r34", area: "Maintenance & Engineering", category: "operational",
    hazard: { ar: "تعطل المعدات", en: "Equipment failure" },
    consequence: { ar: "توقف الإنتاج", en: "Production stop" },
    likelihood: 3, severity: 4,
    controls: { ar: "صيانة وقائية", en: "Preventive maintenance" },
    owner: "Maintenance Manager",
  },
  {
    id: "fsms-r35", area: "Workforce / HR", category: "workforce",
    hazard: { ar: "نقص التدريب", en: "Lack of training" },
    consequence: { ar: "أخطاء", en: "Errors" },
    likelihood: 4, severity: 4,
    controls: { ar: "برنامج تدريب", en: "Training program" },
    owner: "HR + QA",
  },
];

/* ─────────────────────────────────────────────────────────────
   UI strings (bilingual)
   ───────────────────────────────────────────────────────────── */
const T = {
  pageTitle:    { ar: "🎯 سجل مخاطر FSMS — FSMS-RA-01", en: "🎯 FSMS Risk Register — FSMS-RA-01" },
  pageSubtitle: { ar: "ISO 22000:2018 §6.1 — مخاطر مستوى تنظيمي للنظام والشركة (مختلف عن CCP/HACCP)",
                  en: "ISO 22000:2018 §6.1 — Organizational-level risks to FSMS (distinct from CCP/HACCP hazards)" },
  pageIntro: {
    ar: "هذا السجل يُغطي المخاطر التي قد تؤثر على قدرة نظام FSMS على تحقيق نواتجه المقصودة، وفقاً لمتطلب البند 6.1 من ISO 22000:2018. السجل يجمع طبقتين من المخاطر: **20 خطراً استراتيجياً** على مستوى المنظمة (التشريعات، سلسلة التوريد الدولية، الأمن السيبراني، الدفاع الغذائي، التغير المناخي، استمرارية الأعمال، الحلال، السمعة) **و15 خطراً تشغيلياً** يومياً مأخوذة حرفياً من الوثيقة المضبوطة FSMS-RA-01 (الاستلام، التقطيع، التخزين البارد، التعبئة، الصيانة، النفايات، النقل…). هذه ليست مخاطر BPC على المنتج (وهي مغطاة في خطة HACCP — البند 8.5). يُراجَع السجل سنوياً خلال MRM. كل تحديث يُسجّل تلقائياً مع التاريخ والمراجع.",
    en: "This register covers risks that may affect the FSMS's ability to achieve its intended outcomes, per ISO 22000:2018 Clause 6.1. It combines two layers: **20 strategic risks** at the organizational level (regulatory, international supply chain, cybersecurity, food defense, climate change, business continuity, halal, reputation) **and 15 operational risks** sourced verbatim from the controlled document FSMS-RA-01 (receiving, cutting, cold storage, packaging, maintenance, waste, transport…). These are NOT BPC product hazards (those are in the HACCP Plan — Clause 8.5). Reviewed annually during MRM. Every update is recorded with date and references.",
  },
  methodologyTitle: { ar: "🧮 منهجية التقييم", en: "🧮 Assessment Methodology" },
  methodologyExplain: {
    ar: "يُحسب مستوى الخطر = الاحتمالية (1-5) × الشدة (1-5)، ويتراوح من 1 إلى 25. الاحتمالية: 1 = نادر جداً، 5 = شبه مؤكد. الشدة: 1 = أثر تشغيلي محدود، 5 = أزمة وجودية / قانونية. النتيجة تُحدّد الإجراء.",
    en: "Risk Score = Likelihood (1–5) × Severity (1–5), ranging 1 to 25. Likelihood: 1 = very rare, 5 = almost certain. Severity: 1 = limited operational impact, 5 = existential/legal crisis. The result determines the required action.",
  },
  methCols: {
    score:  { ar: "النتيجة", en: "Score" },
    level:  { ar: "المستوى", en: "Level" },
    action: { ar: "الإجراء المطلوب", en: "Required Action" },
  },
  methLow:      { ar: "منخفض",     en: "Low" },
  methMed:      { ar: "متوسط",      en: "Medium" },
  methHigh:     { ar: "عالٍ",       en: "High" },
  methCrit:     { ar: "حرج",        en: "Critical" },
  methActLow:   { ar: "قبول مع مراجعة سنوية", en: "Accept with annual review" },
  methActMed:   { ar: "إجراءات تحكم خلال 60 يوم", en: "Control actions within 60 days" },
  methActHigh:  { ar: "إجراء فوري خلال 30 يوم + مراجعة من FSMS Team Leader", en: "Immediate action within 30 days + FSMS TL review" },
  methActCrit:  { ar: "إيقاف النشاط فوراً، تصعيد للإدارة العليا، MRM طارئ", en: "Immediate activity stop, top management escalation, emergency MRM" },
  back:         { ar: "← الرئيسية", en: "← Hub" },
  add:          { ar: "+ إضافة خطر", en: "+ Add Risk" },
  newTitle:     { ar: "➕ إضافة خطر جديد", en: "➕ Add new risk" },
  editTitle:    { ar: "✏️ تعديل الخطر", en: "✏️ Edit risk" },
  search:       { ar: "🔍 بحث…", en: "🔍 Search…" },
  shown:        { ar: "المعروض:", en: "Showing:" },
  fAll:         { ar: "كل المستويات", en: "All levels" },
  fCritical:    { ar: "حرج فقط", en: "Critical only" },
  fHigh:        { ar: "عالٍ فقط", en: "High only" },
  fMedium:      { ar: "متوسط فقط", en: "Medium only" },
  fLow:         { ar: "منخفض فقط", en: "Low only" },
  total:        { ar: "الإجمالي", en: "Total" },
  critical:     { ar: "حرج", en: "Critical" },
  high:         { ar: "عالٍ", en: "High" },
  medium:       { ar: "متوسط", en: "Medium" },
  low:          { ar: "منخفض", en: "Low" },
  area:         { ar: "المجال", en: "Area" },
  category:     { ar: "الفئة", en: "Category" },
  owner:        { ar: "المسؤول", en: "Owner" },
  ownerPh:      { ar: "FSMS TL / QA Manager...", en: "FSMS TL / QA Manager..." },
  likelihood:   { ar: "الاحتمالية (1-5)", en: "Likelihood (1–5)" },
  severity:     { ar: "الشدة (1-5)", en: "Severity (1–5)" },
  reviewDate:   { ar: "تاريخ المراجعة القادمة", en: "Next review date" },
  hazard:       { ar: "الخطر", en: "Hazard" },
  hazardPh:     { ar: "وصف الخطر…", en: "Risk description..." },
  consequence:  { ar: "العواقب المحتملة", en: "Potential consequences" },
  controls:     { ar: "إجراءات التحكم", en: "Controls" },
  currentScore: { ar: "التقييم الحالي:", en: "Current score:" },
  save:         { ar: "💾 حفظ", en: "💾 Save" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  cols: {
    area:    { ar: "المجال", en: "Area" },
    hazard:  { ar: "الخطر", en: "Risk" },
    score:   { ar: "L × S", en: "L × S" },
    level:   { ar: "المستوى", en: "Level" },
    controls:{ ar: "التحكم", en: "Controls" },
    owner:   { ar: "المسؤول", en: "Owner" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  edit:        { ar: "تعديل", en: "Edit" },
  del:         { ar: "حذف", en: "Delete" },
  noResults:   { ar: "لا توجد مخاطر مطابقة", en: "No risks match" },
  enterHazard: { ar: "اكتب وصف الخطر أولاً", en: "Enter the hazard description first" },
  confirmDel:  { ar: "حذف هذا الخطر؟", en: "Delete this risk?" },
  resetSeed:   { ar: "🔄 استعادة المخاطر الافتراضية (35)", en: "🔄 Reset to 35 seed risks" },
  resetConfirm:{ ar: "سيتم استبدال السجل الحالي بـ35 خطراً افتراضياً (20 استراتيجي + 15 تشغيلي). متابعة؟", en: "This will replace the current register with 35 seed risks (20 strategic + 15 operational). Continue?" },
  /* Filter & sort labels */
  fAllAreas:    { ar: "كل المجالات", en: "All areas" },
  fAllCats:     { ar: "كل الفئات",   en: "All categories" },
  ownerSearch:  { ar: "🔎 المسؤول…",  en: "🔎 Owner…" },
  sortBy:       { ar: "ترتيب حسب",     en: "Sort by" },
  sortScore:    { ar: "النتيجة",      en: "Score" },
  sortLikelihood:{ ar: "الاحتمالية",  en: "Likelihood" },
  sortSeverity: { ar: "الشدة",         en: "Severity" },
  sortArea:     { ar: "المجال",        en: "Area" },
  sortOwner:    { ar: "المسؤول",       en: "Owner" },
  sortCategory: { ar: "الفئة",         en: "Category" },
  sortAsc:      { ar: "↑ تصاعدي",      en: "↑ Asc" },
  sortDesc:     { ar: "↓ تنازلي",      en: "↓ Desc" },
  reset:        { ar: "↺ مسح الفلاتر", en: "↺ Clear filters" },
  exportCsv:    { ar: "📊 تصدير CSV",   en: "📊 Export CSV" },
};

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function todayISO() { return new Date().toISOString().slice(0, 10); }

function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v[lang] ?? v.ar ?? v.en ?? "";
  return String(v);
}

function blank() {
  return {
    area: FSMS_AREAS[0].v,
    hazard: "",
    consequence: "",
    likelihood: 3,
    severity: 3,
    controls: "",
    category: FSMS_RISK_CATEGORIES[0].v,
    owner: "",
    status: "active",
    reviewDate: todayISO(),
  };
}

/* ─────────────────────────────────────────────────────────────
   Styles
   ───────────────────────────────────────────────────────────── */
const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #ecfeff 0%, #f0fdfa 60%, #f8fafc 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #a5f3fc",
    boxShadow: "0 8px 24px rgba(8,145,178,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#155e75", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#0e7490", marginTop: 4, fontWeight: 700 },

  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #a5f3fc", boxShadow: "0 6px 16px rgba(8,145,178,0.06)" },
  intro: { background: "linear-gradient(135deg,#cffafe,#fff)", borderRadius: 14, padding: 16, marginBottom: 14, borderInlineStart: "5px solid #06b6d4", fontSize: 14, lineHeight: 1.85, color: "#0f172a" },
  sectionTitle: { fontSize: 16, fontWeight: 950, color: "#155e75", marginBottom: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 12px", textAlign: "start", background: "#155e75", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #ecfeff", verticalAlign: "top" },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #a5f3fc", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#155e75", marginBottom: 4, marginTop: 8 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (bg, color) => ({
    padding: "12px 14px", borderRadius: 12,
    background: bg, color,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 12px rgba(8,145,178,0.06)",
  }),

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #06b6d4, #0891b2)", color: "#fff", border: "#0e7490" },
      secondary: { bg: "#fff", color: "#155e75", border: "#a5f3fc" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "transparent", color: "#155e75", border: "#06b6d4" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 14px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap",
    };
  },
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function RiskRegisterView() {
  const navigate = useNavigate();
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const pick = (obj) => (obj?.[lang] ?? obj?.ar ?? obj?.en ?? "");

  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [sortBy, setSortBy] = useState("score");   // score | likelihood | severity | area | owner | category
  const [sortDir, setSortDir] = useState("desc");  // desc | asc
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);

  const [dupCount, setDupCount] = useState(0);

  /* Load from API; if empty, seed with the default risks. Deduplicate by `id` (keep most recent). */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const allItems = arr
        .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
        .filter((x) => x.id);

      /* Dedup by `id` — keep the most recent (highest savedAt or last seen). */
      const byId = new Map();
      for (const it of allItems) {
        const existing = byId.get(it.id);
        if (!existing) { byId.set(it.id, it); continue; }
        const a = Number(existing.savedAt) || 0;
        const b = Number(it.savedAt) || 0;
        if (b >= a) byId.set(it.id, it);
      }
      const items = Array.from(byId.values());
      setDupCount(allItems.length - items.length);

      if (items.length === 0) {
        setRisks(SEED_RISKS);
      } else {
        setRisks(items);
      }
    } catch {
      setRisks(SEED_RISKS);
      setDupCount(0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  /* Delete duplicate API records — keeps the most recent per `id`, deletes the rest. */
  async function cleanDuplicates() {
    const confirmMsg = lang === "ar"
      ? `سيتم حذف ${dupCount} نسخة مكررة من قاعدة البيانات (يبقى أحدث نسخة لكل خطر). متابعة؟`
      : `This will delete ${dupCount} duplicate records from the database (keeping the most recent per risk). Continue?`;
    if (!window.confirm(confirmMsg)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const allItems = arr
        .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
        .filter((x) => x.id);

      /* For each id, find the record to keep (most recent) and mark the rest for deletion */
      const groups = new Map();
      for (const it of allItems) {
        if (!groups.has(it.id)) groups.set(it.id, []);
        groups.get(it.id).push(it);
      }
      const toDelete = [];
      for (const [, group] of groups) {
        if (group.length <= 1) continue;
        group.sort((a, b) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0));
        for (let i = 1; i < group.length; i++) {
          if (group[i]._recordId) toDelete.push(group[i]._recordId);
        }
      }
      for (const recId of toDelete) {
        try { await deleteRisk(recId); } catch {}
      }
      await load();
      alert((lang === "ar" ? "تم حذف " : "Deleted ") + toDelete.length + (lang === "ar" ? " نسخة مكررة." : " duplicate records."));
    } catch (e) {
      alert("Cleanup error: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  async function persistRisk(risk) {
    const url = risk._recordId
      ? `${API_BASE}/api/reports/${encodeURIComponent(risk._recordId)}`
      : `${API_BASE}/api/reports`;
    const method = risk._recordId ? "PUT" : "POST";
    const { _recordId, ...payload } = risk;
    payload.savedAt = Date.now();
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reporter: payload.owner || "admin", type: TYPE, payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  async function deleteRisk(recordId) {
    if (!recordId) return; // seed-only (not persisted); just remove from state
    await fetch(`${API_BASE}/api/reports/${encodeURIComponent(recordId)}`, { method: "DELETE" });
  }

  function startNew() { setDraft(blank()); setEditingId("__new__"); setShowForm(true); }
  function startEdit(r) {
    setDraft({
      ...r,
      hazard: typeof r.hazard === "object" ? (r.hazard[lang] ?? r.hazard.ar ?? "") : r.hazard,
      consequence: typeof r.consequence === "object" ? (r.consequence[lang] ?? r.consequence.ar ?? "") : r.consequence,
      controls: typeof r.controls === "object" ? (r.controls[lang] ?? r.controls.ar ?? "") : r.controls,
    });
    setEditingId(r.id);
    setShowForm(true);
  }

  async function save() {
    if (!String(draft.hazard).trim()) { alert(pick(T.enterHazard)); return; }
    try {
      if (editingId === "__new__") {
        const id = `risk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newRisk = { ...draft, id };
        await persistRisk(newRisk);
        await load();
      } else {
        const existing = risks.find((r) => r.id === editingId);
        const merged = { ...existing, ...draft, id: editingId };
        await persistRisk(merged);
        await load();
      }
      setShowForm(false);
      setEditingId(null);
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    }
  }

  async function remove(r) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await deleteRisk(r._recordId);
      setRisks((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      alert("Delete error: " + (e?.message || e));
    }
  }

  async function resetToSeed() {
    if (!window.confirm(pick(T.resetConfirm))) return;
    try {
      // Delete existing API records
      for (const r of risks) {
        if (r._recordId) await deleteRisk(r._recordId);
      }
      // Persist all seeds
      for (const seed of SEED_RISKS) {
        await persistRisk({ ...seed });
      }
      await load();
    } catch (e) {
      alert("Reset error: " + (e?.message || e));
    }
  }

  const filtered = useMemo(() => {
    const list = risks.filter((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      if (filter === "critical" && score < 20) return false;
      if (filter === "high" && (score < 13 || score >= 20)) return false;
      if (filter === "medium" && (score < 6 || score >= 13)) return false;
      if (filter === "low" && score >= 6) return false;
      if (areaFilter !== "all" && r.area !== areaFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (ownerQuery.trim()) {
        const oq = ownerQuery.trim().toLowerCase();
        if (!String(r.owner || "").toLowerCase().includes(oq)) return false;
      }
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = `${txt(r.hazard, lang)} ${txt(r.consequence, lang)} ${r.area} ${txt(r.controls, lang)} ${r.owner || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    /* Sort */
    const dir = sortDir === "asc" ? 1 : -1;
    const cmp = (a, b) => {
      let av, bv;
      switch (sortBy) {
        case "likelihood": av = Number(a.likelihood) || 0; bv = Number(b.likelihood) || 0; break;
        case "severity":   av = Number(a.severity)   || 0; bv = Number(b.severity)   || 0; break;
        case "area":       av = String(a.area || ""); bv = String(b.area || ""); break;
        case "owner":      av = String(a.owner || ""); bv = String(b.owner || ""); break;
        case "category":   av = String(a.category || ""); bv = String(b.category || ""); break;
        case "score":
        default:
          av = calcRiskScore(a.likelihood, a.severity);
          bv = calcRiskScore(b.likelihood, b.severity);
      }
      if (typeof av === "string") return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    };
    return [...list].sort(cmp);
  }, [risks, filter, search, areaFilter, categoryFilter, ownerQuery, sortBy, sortDir, lang]);

  function clearFilters() {
    setFilter("all");
    setSearch("");
    setAreaFilter("all");
    setCategoryFilter("all");
    setOwnerQuery("");
    setSortBy("score");
    setSortDir("desc");
  }

  /* Export filtered list as CSV */
  function exportCSV() {
    const escapeCSV = (v) => {
      const s = v == null ? "" : String(v);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = filtered.map((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      const lvl = riskLevelLabel(score, "en").level;
      return [
        r.id, localizeArea(r.area), localizeCategory(r.category),
        txt(r.hazard, lang), txt(r.consequence, lang),
        r.likelihood, r.severity, score, lvl,
        txt(r.controls, lang), r.owner, r.reviewDate || "",
      ].map(escapeCSV).join(",");
    });
    const headers = [
      "ID", "Area", "Category", "Hazard", "Consequence",
      "Likelihood", "Severity", "Score", "Level",
      "Controls", "Owner", "Next Review",
    ].map(escapeCSV).join(",");
    const csv = "﻿" + headers + "\n" + rows.join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fsms-risk-register_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      alert("Export failed: " + (e?.message || e));
    }
  }

  const stats = useMemo(() => {
    const out = { total: risks.length, critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      if (score >= 20) out.critical++;
      else if (score >= 13) out.high++;
      else if (score >= 6) out.medium++;
      else out.low++;
    });
    return out;
  }, [risks]);

  const localizeArea = (val) => {
    const item = FSMS_AREAS.find((a) => a.v === val);
    return item ? item[lang] : val;
  };
  const localizeCategory = (val) => {
    const item = FSMS_RISK_CATEGORIES.find((c) => c.v === val);
    return item ? item[lang] : val;
  };

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        {/* Top bar */}
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{pick(T.pageTitle)}</div>
            <div style={S.subtitle}>{pick(T.pageSubtitle)}</div>
            <HaccpLinkBadge clauses={["6.1"]} label={isAr ? "إدارة المخاطر التنظيمية" : "Organizational Risk Management"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            {dupCount > 0 && (
              <button
                style={{ ...S.btn("danger"), background: "linear-gradient(180deg, #f59e0b, #d97706)", borderColor: "#b45309" }}
                onClick={cleanDuplicates}
                title={lang === "ar"
                  ? `حذف ${dupCount} نسخة مكررة من قاعدة البيانات`
                  : `Delete ${dupCount} duplicate records from database`}
              >
                🧹 {lang === "ar" ? `تنظيف ${dupCount} مكرر` : `Clean ${dupCount} duplicates`}
              </button>
            )}
            <button style={S.btn("ghost")} onClick={resetToSeed} title={pick(T.resetSeed)}>{pick(T.resetSeed)}</button>
            <button style={S.btn("primary")} onClick={startNew}>{pick(T.add)}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Intro */}
        <div style={S.intro}>{pick(T.pageIntro)}</div>

        {/* Methodology */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.methodologyTitle)}</div>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 12px" }}>{pick(T.methodologyExplain)}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{pick(T.methCols.score)}</th>
                  <th style={S.th}>{pick(T.methCols.level)}</th>
                  <th style={S.th}>{pick(T.methCols.action)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#dcfce7", color: "#166534" }}>1 – 5</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#166534" }}>{pick(T.methLow)}</td>
                  <td style={S.td}>{pick(T.methActLow)}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#fef9c3", color: "#854d0e" }}>6 – 12</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#854d0e" }}>{pick(T.methMed)}</td>
                  <td style={S.td}>{pick(T.methActMed)}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#fed7aa", color: "#9a3412" }}>13 – 19</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#9a3412" }}>{pick(T.methHigh)}</td>
                  <td style={S.td}>{pick(T.methActHigh)}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#fee2e2", color: "#7f1d1d" }}>20 – 25</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.methCrit)}</td>
                  <td style={S.td}>{pick(T.methActCrit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#e0e7ff", "#3730a3")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{pick(T.total)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.total}</div>
          </div>
          <div style={S.kpi("#fee2e2", "#7f1d1d")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🔴 {pick(T.critical)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.critical}</div>
          </div>
          <div style={S.kpi("#fed7aa", "#9a3412")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🟠 {pick(T.high)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.high}</div>
          </div>
          <div style={S.kpi("#fef9c3", "#854d0e")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🟡 {pick(T.medium)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.medium}</div>
          </div>
          <div style={S.kpi("#dcfce7", "#166534")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🟢 {pick(T.low)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.low}</div>
          </div>
        </div>

        {/* Toolbar — filters, sort, export */}
        <div style={{ ...S.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Free-text search */}
          <input
            type="text"
            placeholder={pick(T.search)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.input, flex: "1 1 200px", minWidth: 180, maxWidth: 280 }}
          />

          {/* Severity level filter */}
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...S.input, maxWidth: 180 }}>
            <option value="all">{pick(T.fAll)}</option>
            <option value="critical">{pick(T.fCritical)}</option>
            <option value="high">{pick(T.fHigh)}</option>
            <option value="medium">{pick(T.fMedium)}</option>
            <option value="low">{pick(T.fLow)}</option>
          </select>

          {/* Area filter */}
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={{ ...S.input, maxWidth: 220 }}>
            <option value="all">{pick(T.fAllAreas)}</option>
            {FSMS_AREAS.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
          </select>

          {/* Category filter */}
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ ...S.input, maxWidth: 240 }}>
            <option value="all">{pick(T.fAllCats)}</option>
            {FSMS_RISK_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
          </select>

          {/* Owner search */}
          <input
            type="text"
            placeholder={pick(T.ownerSearch)}
            value={ownerQuery}
            onChange={(e) => setOwnerQuery(e.target.value)}
            style={{ ...S.input, flex: "0 1 180px", minWidth: 140, maxWidth: 200 }}
          />

          {/* Sort by */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...S.input, maxWidth: 160 }} title={pick(T.sortBy)}>
            <option value="score">      {pick(T.sortBy)}: {pick(T.sortScore)}</option>
            <option value="likelihood"> {pick(T.sortBy)}: {pick(T.sortLikelihood)}</option>
            <option value="severity">   {pick(T.sortBy)}: {pick(T.sortSeverity)}</option>
            <option value="area">       {pick(T.sortBy)}: {pick(T.sortArea)}</option>
            <option value="category">   {pick(T.sortBy)}: {pick(T.sortCategory)}</option>
            <option value="owner">      {pick(T.sortBy)}: {pick(T.sortOwner)}</option>
          </select>

          {/* Sort direction toggle */}
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            style={{ ...S.btn("ghost"), padding: "8px 12px" }}
            title={sortDir === "asc" ? pick(T.sortAsc) : pick(T.sortDesc)}
          >
            {sortDir === "asc" ? pick(T.sortAsc) : pick(T.sortDesc)}
          </button>

          {/* Reset filters */}
          <button type="button" style={S.btn("secondary")} onClick={clearFilters}>
            {pick(T.reset)}
          </button>

          {/* Export CSV */}
          <button type="button" style={S.btn("ghost")} onClick={exportCSV} disabled={!filtered.length}>
            {pick(T.exportCsv)}
          </button>

          {/* Result count */}
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginInlineStart: "auto" }}>
            {pick(T.shown)} <strong style={{ color: "#155e75" }}>{filtered.length}</strong> / {risks.length}
          </span>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ ...S.card, border: "2px solid #06b6d4" }}>
            <div style={{ ...S.sectionTitle, color: "#155e75" }}>
              {editingId === "__new__" ? pick(T.newTitle) : pick(T.editTitle)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div>
                <label style={S.label}>{pick(T.area)}</label>
                <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={S.input}>
                  {FSMS_AREAS.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.category)}</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={S.input}>
                  {FSMS_RISK_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.owner)}</label>
                <input type="text" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder={pick(T.ownerPh)} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.likelihood)}</label>
                <input type="number" min="1" max="5" value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: Number(e.target.value) || 1 })} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.severity)}</label>
                <input type="number" min="1" max="5" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: Number(e.target.value) || 1 })} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.reviewDate)}</label>
                <input type="date" value={draft.reviewDate} onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })} style={S.input} />
              </div>
            </div>

            <label style={S.label}>{pick(T.hazard)}</label>
            <input type="text" value={draft.hazard} onChange={(e) => setDraft({ ...draft, hazard: e.target.value })} placeholder={pick(T.hazardPh)} style={S.input} />

            <label style={S.label}>{pick(T.consequence)}</label>
            <textarea value={draft.consequence} onChange={(e) => setDraft({ ...draft, consequence: e.target.value })} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.controls)}</label>
            <textarea value={draft.controls} onChange={(e) => setDraft({ ...draft, controls: e.target.value })} style={{ ...S.input, minHeight: 80 }} />

            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#cffafe", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#155e75" }}>{pick(T.currentScore)}</span>
              <span style={{ padding: "4px 10px", borderRadius: 999, background: riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).bg, color: riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).color, fontWeight: 900 }}>
                {calcRiskScore(draft.likelihood, draft.severity)} — {riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).level}
              </span>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={S.btn("success")} onClick={save}>{pick(T.save)}</button>
              <button style={S.btn("secondary")} onClick={() => { setShowForm(false); setEditingId(null); }}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{pick(T.cols.area)}</th>
                  <th style={S.th}>{pick(T.cols.hazard)}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{pick(T.cols.score)}</th>
                  <th style={S.th}>{pick(T.cols.level)}</th>
                  <th style={S.th}>{pick(T.cols.controls)}</th>
                  <th style={S.th}>{pick(T.cols.owner)}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="7" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>⏳</td></tr>
                )}
                {!loading && filtered.map((r, idx) => {
                  const score = calcRiskScore(r.likelihood, r.severity);
                  const lvl = riskLevelLabel(score, lang);
                  return (
                    <tr key={r._recordId || `${r.id}-${idx}`}>
                      <td style={{ ...S.td, fontSize: 12 }}>
                        <div style={{ fontWeight: 800 }}>{localizeArea(r.area)}</div>
                        <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{localizeCategory(r.category)}</div>
                      </td>
                      <td style={{ ...S.td, fontWeight: 700, maxWidth: 280 }}>
                        {txt(r.hazard, lang)}
                        {r.consequence && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>↳ {txt(r.consequence, lang)}</div>}
                      </td>
                      <td style={{ ...S.td, textAlign: "center", fontWeight: 800 }}>{r.likelihood} × {r.severity} = <strong>{score}</strong></td>
                      <td style={S.td}>
                        <span style={{ padding: "3px 8px", borderRadius: 8, background: lvl.bg, color: lvl.color, fontWeight: 900, fontSize: 12 }}>
                          {lvl.level}
                        </span>
                      </td>
                      <td style={{ ...S.td, fontSize: 11, maxWidth: 280, color: "#475569" }}>{txt(r.controls, lang)}</td>
                      <td style={{ ...S.td, fontSize: 12 }}>{r.owner || "—"}</td>
                      <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                        <button style={{ ...S.btn("secondary"), padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(r)}>{pick(T.edit)}</button>
                        <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11, marginInlineStart: 4 }} onClick={() => remove(r)}>{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="7" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noResults)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 700 }}>
          ISO 22000:2018 §6.1 · Closes SGS Stage 2 Major NC #2 · Reviewed annually during MRM
        </div>
      </div>
    </main>
  );
}
