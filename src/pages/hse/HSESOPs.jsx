// src/pages/hse/HSESOPs.jsx
// قائمة SOPs — ثنائية اللغة

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  pageTitle:    { ar: "📘 الإجراءات التشغيلية القياسية — SOPs", en: "📘 Standard Operating Procedures — SOPs" },
  pageSubtitle: { ar: "28 إجراءً مقسّمة على 5 مجموعات", en: "28 procedures across 5 groups" },
  pageIntro: {
    ar: "تُترجم السياسات إلى خطوات عملية عبر الإجراءات التشغيلية القياسية (Standard Operating Procedures). كل إجراء يجب أن يتضمّن: الهدف، النطاق، المسؤوليات، الخطوات التفصيلية، السجلات المطلوبة، والمراجعات الدورية. الإجراءات هنا مرقّمة بنظام موحّد (SOP-FS / SOP-OHS / SOP-EM / SOP-EN / SOP-AD) ومرتّبة حسب الأولوية التشغيلية. يجب توقيع كل إجراء من مدير HSE قبل تطبيقه، ومراجعته سنوياً أو بعد أي تغيير جوهري.",
    en: "Policies are translated into practical steps via Standard Operating Procedures. Each SOP must include: Objective, Scope, Responsibilities, Detailed Steps, Required Records, and Periodic Review. Procedures here are numbered with a unified scheme (SOP-FS / SOP-OHS / SOP-EM / SOP-EN / SOP-AD) and ordered by operational priority. Each SOP must be signed by the HSE Manager before implementation, and reviewed annually or after any significant change.",
  },
  back:         { ar: "← HSE", en: "← HSE" },
  expand:       { ar: "▼ التفاصيل", en: "▼ Details" },
  collapse:     { ar: "▲ إخفاء", en: "▲ Hide" },
  objective:    { ar: "🎯 الهدف", en: "🎯 Objective" },
  scope:        { ar: "📍 النطاق", en: "📍 Scope" },
  steps:        { ar: "🔢 الخطوات الرئيسية", en: "🔢 Key Steps" },
  records:      { ar: "📁 السجلات المطلوبة", en: "📁 Required Records" },
  freq:         { ar: "⏰ التكرار", en: "⏰ Frequency" },
  activate:     { ar: "تفعيل", en: "Activate" },
  edit:         { ar: "تعديل", en: "Edit" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  save:         { ar: "💾 حفظ", en: "💾 Save" },
  version:      { ar: "الإصدار", en: "Version" },
  status:       { ar: "الحالة", en: "Status" },
  approvedDate: { ar: "تاريخ الاعتماد", en: "Approval Date" },
  reviewDate:   { ar: "المراجعة القادمة", en: "Next Review" },
  owner:        { ar: "المسؤول", en: "Owner" },
  optDraft:     { ar: "🟡 مسودة", en: "🟡 Draft" },
  optReview:    { ar: "🔵 قيد المراجعة", en: "🔵 Under Review" },
  optActive:    { ar: "✅ معتمدة", en: "✅ Approved" },
  badgeActive:  { ar: "✅ معتمدة", en: "✅ Approved" },
  badgeReview:  { ar: "🔵 مراجعة", en: "🔵 Review" },
  badgeDraft:   { ar: "🟡 مسودة", en: "🟡 Draft" },
};

const SOP_GROUPS = [
  {
    id: "fs", title: { ar: "Food Safety & Cold Chain — سلامة الغذاء وسلسلة التبريد", en: "Food Safety & Cold Chain" },
    color: "#0369a1", bg: "#dbeafe",
    items: [
      {
        code: "SOP-FS-01",
        title: { ar: "استلام الشحنات المستوردة", en: "Receiving imported shipments" },
        desc: { ar: "فحص درجة الحرارة، الشهادات الصحية، المطابقة", en: "Temperature check, health certificates, conformity" },
        objective: { ar: "ضمان أن كل شحنة لحوم تصل للشركة (جوي/بحري) مطابقة للمواصفات قبل قبولها وتخزينها لمنع إدخال مخاطر سلامة غذاء.",
                     en: "Ensure every meat shipment arriving (air/sea) conforms to specifications before acceptance and storage — preventing the introduction of food-safety risks." },
        scope: { ar: "كل الشحنات المستوردة، من نقطة الاستلام (Cargo Village / Jebel Ali) إلى الإيداع في غرف التبريد/التجميد.",
                 en: "All imported shipments — from receipt point (Cargo Village / Jebel Ali) to placement in chiller/freezer rooms." },
        steps: { ar: "1) فحص بصري للشاحنة وحاوية التبريد. 2) قياس حرارة الشاحنة + قلب المنتج + سطحه (3 قراءات). 3) التحقق من الشهادة الصحية البيطرية والحلال وCOO. 4) فحص بصري للتغليف والرائحة وأي تلوث. 5) قرار: قبول/رفض/قبول جزئي/حجر صحي. 6) تسجيل في نموذج F-09. 7) إيداع في الغرفة المناسبة.",
                 en: "1) Visual inspection of truck and refrigerated container. 2) Measure truck temperature + product core + surface (3 readings). 3) Verify veterinary health certificate, Halal, COO. 4) Visual check for packaging, smell, any contamination. 5) Decision: accept/reject/partial/quarantine. 6) Record in form F-09. 7) Place in appropriate room." },
        records: { ar: "F-09 (سجل استلام الشحنات)، نسخ الشهادات، صور الشحنة عند الاستلام.",
                   en: "F-09 (Shipment Receiving Log), certificate copies, shipment photos at receipt." },
        freq: { ar: "عند كل شحنة (CCP حرج)", en: "On every shipment (Critical CCP)" },
      },
      {
        code: "SOP-FS-02",
        title: { ar: "مراقبة ومعايرة درجات الحرارة", en: "Temperature monitoring & calibration" },
        desc: { ar: "في الغرف المبردة والمجمدة", en: "Chiller and freezer rooms" },
        objective: { ar: "ضمان الحفاظ على سلسلة التبريد ضمن الحدود المستهدفة وتسجيل القراءات بشكل موثق لتلبية متطلبات HACCP وبلدية دبي.",
                     en: "Maintain the cold chain within target limits and log readings in a documented way to meet HACCP and Dubai Municipality requirements." },
        scope: { ar: "كل غرف التبريد (0 إلى +4°م) والتجميد (-18°م)، مناطق الاستلام والشحن، شاحنات النقل.",
                 en: "All chiller (0 to +4°C) and freezer (-18°C) rooms, receiving and dispatch areas, transport trucks." },
        steps: { ar: "1) قياس الحرارة كل 4 ساعات في كل غرفة. 2) تسجيل القراءة في نموذج F-08. 3) عند انحراف >2°م → بدء SOP-FS-03. 4) معايرة أجهزة القياس كل 6 أشهر بمختبر معتمد. 5) فحص أجهزة Data Loggers يومياً. 6) مقارنة قراءات يدوية مع قراءات Data Logger أسبوعياً.",
                 en: "1) Read temperatures every 4 hours in each room. 2) Log reading in form F-08. 3) On deviation >2°C → trigger SOP-FS-03. 4) Calibrate devices every 6 months at an accredited lab. 5) Check data loggers daily. 6) Cross-check manual vs data-logger readings weekly." },
        records: { ar: "F-08 (سجل درجات الحرارة)، شهادات معايرة، تقارير Data Loggers.",
                   en: "F-08 (Temperature Log), calibration certificates, data-logger reports." },
        freq: { ar: "كل 4 ساعات (24/7)", en: "Every 4 hours (24/7)" },
      },
      {
        code: "SOP-FS-03",
        title: { ar: "التعامل مع انحرافات درجة الحرارة", en: "Temperature deviation response" },
        desc: { ar: "Temperature Deviation Response", en: "Triggers, escalation, product hold/release" },
        objective: { ar: "الاستجابة الفورية لأي انحراف في حرارة سلسلة التبريد لمنع فساد المنتج وتقييم سلامته قبل الإفراج عنه.",
                     en: "Immediately respond to any cold-chain temperature deviation — to prevent product spoilage and assess safety before release." },
        scope: { ar: "كل انحراف يتجاوز الحد المسموح (>4°م في التبريد، >-15°م في التجميد) لأكثر من 30 دقيقة.",
                 en: "Any deviation exceeding the allowed limit (>4°C chilled, >-15°C frozen) for more than 30 minutes." },
        steps: { ar: "1) إنذار فوري + إبلاغ مسؤول سلامة الغذاء. 2) عزل المنتج المتأثر (Hold). 3) تقييم درجة الانحراف ومدته. 4) قياس حرارة قلب المنتج. 5) قرار: إفراج/إعادة معالجة/إتلاف. 6) تحقيق في السبب الجذري. 7) إجراء تصحيحي.",
                 en: "1) Immediate alarm + notify Food Safety Officer. 2) Hold affected product. 3) Assess severity and duration of deviation. 4) Measure product core temperature. 5) Decision: release / re-process / destroy. 6) Root-cause investigation. 7) Corrective action." },
        records: { ar: "تقرير الانحراف، قرار الإفراج/الإتلاف، CAPA (F-20).",
                   en: "Deviation report, release/destroy decision, CAPA (F-20)." },
        freq: { ar: "عند كل انحراف", en: "On every deviation" },
      },
      {
        code: "SOP-FS-04",
        title: { ar: "إجراء التنظيف والتعقيم", en: "Cleaning & sanitation procedure" },
        desc: { ar: "اليومي والأسبوعي والشهري", en: "Daily / weekly / monthly" },
        objective: { ar: "الحفاظ على بيئة إنتاج خالية من البكتيريا الممرضة والملوثات الفيزيائية والكيميائية.",
                     en: "Maintain a production environment free of pathogenic bacteria and physical/chemical contaminants." },
        scope: { ar: "خط التصنيع، الغرف الباردة، الأدوات والمعدات، الأرضيات، أحواض غسل اليدين، دورات المياه.",
                 en: "Processing line, cold rooms, tools and equipment, floors, hand-wash sinks, toilets." },
        steps: { ar: "1) إزالة المخلفات الخشنة. 2) شطف بالماء. 3) تطبيق المنظف. 4) فرك ميكانيكي. 5) شطف. 6) تطبيق المعقّم بالتركيز الصحيح. 7) ترك زمن التلامس. 8) شطف نهائي. 9) فحص بصري + ATP. 10) تسجيل في F-10.",
                 en: "1) Remove gross debris. 2) Rinse with water. 3) Apply detergent. 4) Mechanical scrubbing. 5) Rinse. 6) Apply sanitizer at correct concentration. 7) Allow contact time. 8) Final rinse. 9) Visual + ATP check. 10) Log in F-10." },
        records: { ar: "F-10 (سجل التنظيف)، شهادات تركيز المعقّمات، نتائج ATP.",
                   en: "F-10 (Cleaning Log), sanitizer concentration certs, ATP results." },
        freq: { ar: "يومي + أسبوعي + شهري عميق", en: "Daily + Weekly + Monthly deep clean" },
      },
      {
        code: "SOP-FS-05",
        title: { ar: "برنامج المسحات الميكروبية", en: "Microbiological swabbing program" },
        desc: { ar: "Microbiological Swabbing", en: "Surfaces + hand swabs + lab tests" },
        objective: { ar: "التحقق العلمي من فعالية برنامج التنظيف والتعقيم وكشف أي تلوث ميكروبي مبكراً.",
                     en: "Scientifically verify the effectiveness of the cleaning/sanitation program and detect any microbial contamination early." },
        scope: { ar: "أسطح التلامس مع الغذاء، أيدي العاملين، أدوات التقطيع، الأرضيات، مياه الشطف.",
                 en: "Food-contact surfaces, workers' hands, cutting tools, floors, rinse water." },
        steps: { ar: "1) خطة شهرية تحدد النقاط ونوع الفحص. 2) أخذ المسحات بأدوات معقمة. 3) إرسال لمختبر معتمد. 4) تحليل النتائج وفق الحدود المسموحة. 5) عند الفشل: تعقيم فوري + إعادة الفحص + تحقيق. 6) رصد الاتجاهات شهرياً.",
                 en: "1) Monthly plan defining points and test types. 2) Take swabs with sterile tools. 3) Send to accredited lab. 4) Analyze results per allowed limits. 5) On failure: immediate re-sanitation + re-test + investigation. 6) Trend monitoring monthly." },
        records: { ar: "F-11 (سجل المسحات)، تقارير المختبر، تقارير الاتجاه الشهرية.",
                   en: "F-11 (Swabs Log), lab reports, monthly trend reports." },
        freq: { ar: "أسبوعي للأسطح الحرجة، شهري للعينات الأخرى", en: "Weekly for critical surfaces, monthly for others" },
      },
      {
        code: "SOP-FS-06",
        title: { ar: "إجراء استرجاع المنتج من السوق", en: "Product recall procedure" },
        desc: { ar: "Product Recall", en: "Backward + forward trace" },
        objective: { ar: "الاستجابة السريعة لسحب أي منتج غير آمن من السوق لحماية المستهلك وسمعة الشركة وتلبية متطلبات الجهات الرقابية.",
                     en: "Rapidly recall any unsafe product from market — to protect the consumer, company reputation, and meet regulatory requirements." },
        scope: { ar: "أي منتج غادر بوابة الشركة وتبيّن لاحقاً عدم سلامته (نتيجة فحص، شكوى، انحراف، خبر خارجي).",
                 en: "Any product that has left the company gate and is later identified as unsafe (test result, complaint, deviation, external news)." },
        steps: { ar: "1) تشكيل فريق استرجاع طارئ. 2) تحديد دفعة المنتج وكميته. 3) تتبع كل العملاء الذين استلموا. 4) إخطار البلدية وسحب البضاعة. 5) تأكيد الاستلام من كل عميل. 6) إتلاف موثق. 7) تحقيق وسبب جذري. 8) تقرير نهائي للإدارة والبلدية.",
                 en: "1) Form emergency recall team. 2) Identify batch and quantity. 3) Trace all customers who received it. 4) Notify the municipality and retrieve goods. 5) Confirm receipt from each customer. 6) Documented destruction. 7) Investigation + root cause. 8) Final report to management and municipality." },
        records: { ar: "نموذج Mock Recall، سجل تتبع، شهادات إتلاف، تقرير نهائي.",
                   en: "Mock recall form, traceability log, destruction certificates, final report." },
        freq: { ar: "عند الحاجة + تجربة وهمية ربع سنوية", en: "When needed + Quarterly mock drill" },
      },
      {
        code: "SOP-FS-07",
        title: { ar: "التتبع العكسي والأمامي للمنتجات", en: "Product traceability" },
        desc: { ar: "Traceability", en: "Backward and forward tracing" },
        objective: { ar: "إمكانية تتبع أي قطعة لحم بأقل من ساعة من المورّد الأصلي إلى العميل النهائي والعكس.",
                     en: "Ability to trace any meat piece in less than 1 hour from the original supplier to the final customer and vice-versa." },
        scope: { ar: "كل المنتجات من لحظة الاستلام حتى التسليم النهائي، شامل المنتجات المُجهّزة في خط التصنيع.",
                 en: "All products from receipt until final delivery — including products processed on the production line." },
        steps: { ar: "1) تسجيل رقم الدفعة (Batch) عند الاستلام. 2) ربط الدفعات بمكان التخزين. 3) تسجيل التحويلات الداخلية. 4) ربط الدفعة بالعميل عند الشحن. 5) اختبار التتبع شهرياً (عينة عشوائية).",
                 en: "1) Log batch number on receipt. 2) Link batches to storage location. 3) Record internal transfers. 4) Link batch to customer on dispatch. 5) Monthly traceability test (random sample)." },
        records: { ar: "نظام تتبع رقمي، سجلات الدخول والخروج، تقارير الاختبار الشهري.",
                   en: "Digital traceability system, in/out logs, monthly test reports." },
        freq: { ar: "مستمر + اختبار شهري", en: "Continuous + monthly test" },
      },
      {
        code: "SOP-FS-08",
        title: { ar: "فصل اللحوم الحلال وغير الحلال", en: "Halal/Non-Halal segregation" },
        desc: { ar: "Halal segregation", en: "Color-coded zones, separate equipment" },
        objective: { ar: "ضمان عدم اختلاط اللحوم الحلال بأي مصدر غير حلال في أي مرحلة من مراحل التشغيل، تلبية للمتطلبات الإلزامية لـ ESMA و UAE.S 2055-1.",
                     en: "Ensure no mixing of Halal meat with non-Halal sources at any operational stage — fulfilling mandatory ESMA and UAE.S 2055-1 requirements." },
        scope: { ar: "كل المراحل: الاستلام، التخزين، التصنيع، التغليف، التوزيع.",
                 en: "All stages: receipt, storage, processing, packaging, distribution." },
        steps: { ar: "1) كل اللحوم المستوردة بشهادة حلال معتمدة. 2) لا توجد منتجات غير حلال في المنشأة. 3) أدوات وملابس مخصصة. 4) تدقيق سنوي من جهة حلال خارجية. 5) تدريب العاملين على المتطلبات الشرعية.",
                 en: "1) All imported meat with certified Halal cert. 2) No non-Halal products in the facility. 3) Dedicated tools and apparel. 4) Annual external Halal audit. 5) Worker training on Halal requirements." },
        records: { ar: "شهادات الحلال، تقارير التدقيق السنوي، سجلات التدريب.",
                   en: "Halal certificates, annual audit reports, training records." },
        freq: { ar: "مستمر + تدقيق سنوي", en: "Continuous + annual audit" },
      },
      {
        code: "SOP-FS-09",
        title: { ar: "إدارة المنتجات منتهية أو قريبة الانتهاء", en: "Expiry management" },
        desc: { ar: "Expiry Management", en: "FIFO/FEFO + early-warning system" },
        objective: { ar: "منع تواجد منتجات منتهية الصلاحية في المخزون أو السوق، وتقليل الخسائر من خلال إدارة المخزون بنظام FIFO/FEFO.",
                     en: "Prevent expired products from being in stock or market, and minimize losses through FIFO/FEFO inventory management." },
        scope: { ar: "كل المنتجات في غرف التبريد والتجميد ومخازن المنتج النهائي.",
                 en: "All products in chillers, freezers, and finished-product stores." },
        steps: { ar: "1) تطبيق FIFO (الأقدم يخرج أولاً) للأقل عمراً. 2) FEFO (الأقرب انتهاءً يخرج أولاً) لمنتجات بتواريخ متفاوتة. 3) تنبيه آلي قبل الانتهاء بـ 60 يوم. 4) إخطار قسم المبيعات للتسعير الترويجي. 5) إتلاف موثق للمنتهي. 6) تحديث المخزون.",
                 en: "1) Apply FIFO (oldest out first) for younger stock. 2) FEFO (closest expiry out first) for varied dates. 3) Auto-alert 60 days before expiry. 4) Notify sales for promotional pricing. 5) Documented destruction of expired. 6) Update inventory." },
        records: { ar: "تقارير المخزون، سجل الإتلاف، تنبيهات النظام.",
                   en: "Inventory reports, destruction log, system alerts." },
        freq: { ar: "يومي + تقرير أسبوعي للإدارة", en: "Daily + weekly management report" },
      },
    ],
  },
  {
    id: "ohs", title: { ar: "Occupational Health & Safety — السلامة المهنية", en: "Occupational Health & Safety" },
    color: "#9a3412", bg: "#fed7aa",
    items: [
      { code: "SOP-OHS-01", title: { ar: "التدريب التعريفي للموظفين الجدد", en: "New employee induction" }, desc: { ar: "Induction Training", en: "Day-1 onboarding training" } },
      { code: "SOP-OHS-02", title: { ar: "استخدام معدات الوقاية الشخصية", en: "PPE usage" }, desc: { ar: "PPE — لكل منطقة", en: "PPE per area" } },
      { code: "SOP-OHS-03", title: { ar: "العمل الآمن في الغرف المجمدة", en: "Safe work in frozen rooms" }, desc: { ar: "Cold Storage Safety", en: "Cold storage safety" } },
      { code: "SOP-OHS-04", title: { ar: "تشغيل الرافعات الشوكية", en: "Forklift operation" }, desc: { ar: "Forklift Operation", en: "License, daily check, max speed" } },
      { code: "SOP-OHS-05", title: { ar: "التعامل الآمن مع السكاكين وآلات التقطيع", en: "Safe knife & slicer handling" }, desc: { ar: "Knife & Cutting Machine Safety", en: "Cut-resistant gloves, blade guards" } },
      { code: "SOP-OHS-06", title: { ar: "الرفع اليدوي الآمن للأحمال", en: "Safe manual lifting" }, desc: { ar: "Manual Lifting", en: "Max 25 kg, technique, trolleys" } },
      { code: "SOP-OHS-07", title: { ar: "نظام تصاريح العمل", en: "Work permit system" }, desc: { ar: "Work Permit System", en: "Hot work, confined space, heights, electrical" } },
      { code: "SOP-OHS-08", title: { ar: "قفل ووسم المعدات أثناء الصيانة", en: "Lockout / Tagout (LOTO)" }, desc: { ar: "LOTO", en: "Energy isolation during maintenance" } },
      { code: "SOP-OHS-09", title: { ar: "الإبلاغ عن الحوادث وشبه الحوادث والتحقيق", en: "Incident & near-miss reporting + investigation" }, desc: { ar: "Incident & Near-miss", en: "Incident & near-miss" } },
      { code: "SOP-OHS-10", title: { ar: "الفحص الطبي الدوري للعاملين", en: "Periodic medical check" }, desc: { ar: "Periodic Medical Check", en: "Annual + role-specific" } },
    ],
  },
  {
    id: "em", title: { ar: "Emergency — الطوارئ", en: "Emergency" }, color: "#7f1d1d", bg: "#fee2e2",
    items: [
      { code: "SOP-EM-01", title: { ar: "خطة الاستجابة للحرائق والإخلاء", en: "Fire & evacuation response plan" }, desc: { ar: "Fire & Evacuation", en: "Fire & evacuation" } },
      { code: "SOP-EM-02", title: { ar: "الاستجابة لتسرب الأمونيا أو غازات التبريد", en: "Ammonia / refrigerant leak response" }, desc: { ar: "Ammonia / Refrigerant Leak", en: "Detection, evacuation, isolation" } },
      { code: "SOP-EM-03", title: { ar: "الاستجابة لانقطاع الكهرباء المطوّل", en: "Extended power outage response" }, desc: { ar: "Cold Storage Power Outage", en: "Cold storage power outage" } },
      { code: "SOP-EM-04", title: { ar: "الاستجابة للإصابات الجسيمة والإسعافات الأولية", en: "Major injury & first aid response" }, desc: { ar: "First Aid & Major Injuries", en: "First aid + ambulance call" } },
    ],
  },
  {
    id: "en", title: { ar: "Environment — البيئة", en: "Environment" }, color: "#166534", bg: "#dcfce7",
    items: [
      { code: "SOP-EN-01", title: { ar: "إدارة النفايات العضوية والصلبة", en: "Organic & solid waste management" }, desc: { ar: "Organic & Solid Waste", en: "Organic & solid waste" } },
      { code: "SOP-EN-02", title: { ar: "إدارة المياه العادمة ومصائد الدهون", en: "Wastewater & grease trap management" }, desc: { ar: "Wastewater & Grease Traps", en: "Wastewater & grease traps" } },
      { code: "SOP-EN-03", title: { ar: "إدارة غازات التبريد والتخلص منها", en: "Refrigerant gas management & disposal" }, desc: { ar: "Refrigerant Gas Management", en: "Refrigerant gas management" } },
      { code: "SOP-EN-04", title: { ar: "مراقبة استهلاك الطاقة والمياه", en: "Energy & water consumption monitoring" }, desc: { ar: "Energy & Water Monitoring", en: "Energy & water monitoring" } },
    ],
  },
  {
    id: "ad", title: { ar: "Administrative — الإدارية المساندة", en: "Administrative" }, color: "#7c3aed", bg: "#e9d5ff",
    items: [
      { code: "SOP-AD-01", title: { ar: "مراجعة وثائق HSE السنوية", en: "Annual HSE document review" }, desc: { ar: "Annual Documentation Review", en: "Annual documentation review" } },
      { code: "SOP-AD-02", title: { ar: "التدقيق الداخلي", en: "Internal audit" }, desc: { ar: "Internal Audit", en: "Internal audit" } },
      { code: "SOP-AD-03", title: { ar: "استقبال مفتشي الجهات الحكومية", en: "Government inspector reception" }, desc: { ar: "Govt Inspection Reception", en: "Govt inspection reception" } },
      { code: "SOP-AD-04", title: { ar: "إدارة المقاولين والموردين", en: "Contractor & supplier management" }, desc: { ar: "Contractors & Suppliers", en: "Contractors & suppliers" } },
      { code: "SOP-AD-05", title: { ar: "إدارة التغيير", en: "Management of Change" }, desc: { ar: "Management of Change", en: "Management of change" } },
    ],
  },
];

const TYPE = "sops_status";

export default function HSESOPs() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [statuses, setStatuses] = useState({});
  const [editingCode, setEditingCode] = useState(null);
  const [expandedCode, setExpandedCode] = useState(null);
  const [draft, setDraft] = useState({ version: "1.0", approvedDate: "", reviewDate: "", owner: "", status: "draft" });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    const map = {};
    arr.forEach((s) => { if (s.code) map[s.code] = s; });
    setStatuses(map);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(item) {
    setEditingCode(item.code);
    const ex = statuses[item.code] || {};
    setDraft({
      version: ex.version || "1.0",
      approvedDate: ex.approvedDate || todayISO(),
      reviewDate: ex.reviewDate || "",
      owner: ex.owner || "",
      status: ex.status || "draft",
    });
  }

  async function saveStatus(item) {
    setSaving(true);
    try {
      const existing = statuses[item.code];
      const payload = { ...draft, code: item.code, titleAr: item.title.ar, titleEn: item.title.en };
      if (existing && existing.id) {
        await apiUpdate(TYPE, existing.id, payload, draft.owner || "HSE");
      } else {
        await apiSave(TYPE, payload, draft.owner || "HSE");
      }
      await reload();
      setEditingCode(null);
    } catch (e) {
      alert((lang === "ar" ? "❌ خطأ بالحفظ: " : "❌ Save error: ") + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>{pick(T.pageSubtitle)}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: 14, background: "linear-gradient(135deg, #f3f4f6, #ffffff)", borderInlineStart: "5px solid #1f2937" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, color: "#1f0f00", margin: 0 }}>{pick(T.pageIntro)}</p>
        </div>

        {SOP_GROUPS.map((g) => (
          <div key={g.id} style={{ ...cardStyle, marginBottom: 16 }}>
            <div style={{ padding: "8px 14px", borderRadius: 10, marginBottom: 12, background: g.bg, color: g.color, fontWeight: 950, fontSize: 16, display: "inline-block" }}>
              {pick(g.title)}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {g.items.map((it) => {
                const st = statuses[it.code];
                const isEdit = editingCode === it.code;
                const hasDetails = !!(it.objective || it.scope || it.steps || it.records || it.freq);
                const isExpanded = expandedCode === it.code;
                return (
                  <div key={it.code} style={{ padding: "12px 14px", borderRadius: 10, background: "#fff7ed", border: "1px solid rgba(120,53,15,0.18)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 900, background: g.bg, color: g.color }}>{it.code}</span>
                          <span style={{ fontWeight: 900, fontSize: 14 }}>{pick(it.title)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{pick(it.desc)}</div>
                        {hasDetails && (
                          <button
                            onClick={() => setExpandedCode(isExpanded ? null : it.code)}
                            style={{ marginTop: 8, padding: "4px 10px", borderRadius: 8, background: g.bg, color: g.color, border: `1px solid ${g.color}33`, fontSize: 11, fontWeight: 900, cursor: "pointer" }}
                          >
                            {isExpanded ? pick(T.collapse) : pick(T.expand)}
                          </button>
                        )}
                      </div>
                      <div style={{ minWidth: 160, textAlign: dir === "rtl" ? "left" : "right" }}>
                        {st && !isEdit && (
                          <div style={{ fontSize: 11, color: HSE_COLORS.primaryDark, marginBottom: 4 }}>
                            v{st.version} • {st.status === "active" ? pick(T.badgeActive) : st.status === "review" ? pick(T.badgeReview) : pick(T.badgeDraft)}
                          </div>
                        )}
                        {!isEdit && (
                          <button style={{ ...buttonGhost, fontSize: 12 }} onClick={() => startEdit(it)}>{st ? pick(T.edit) : pick(T.activate)}</button>
                        )}
                      </div>
                    </div>

                    {isExpanded && hasDetails && (
                      <div style={{ marginTop: 12, padding: 12, background: "#fff", borderRadius: 8, border: `1px dashed ${g.color}55` }}>
                        {it.objective && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: g.color, marginBottom: 3 }}>{pick(T.objective)}</div>
                            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#1f0f00" }}>{pick(it.objective)}</div>
                          </div>
                        )}
                        {it.scope && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: g.color, marginBottom: 3 }}>{pick(T.scope)}</div>
                            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#1f0f00" }}>{pick(it.scope)}</div>
                          </div>
                        )}
                        {it.steps && (
                          <div style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 12, fontWeight: 900, color: g.color, marginBottom: 3 }}>{pick(T.steps)}</div>
                            <div style={{ fontSize: 13, lineHeight: 1.7, color: "#1f0f00" }}>{pick(it.steps)}</div>
                          </div>
                        )}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8, marginTop: 6 }}>
                          {it.records && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 900, color: "#7c3aed", marginBottom: 2 }}>{pick(T.records)}</div>
                              <div style={{ fontSize: 12, color: "#1f0f00" }}>{pick(it.records)}</div>
                            </div>
                          )}
                          {it.freq && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 900, color: "#7c3aed", marginBottom: 2 }}>{pick(T.freq)}</div>
                              <div style={{ fontSize: 12, color: "#1f0f00" }}>{pick(it.freq)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {isEdit && (
                      <div style={{ marginTop: 10, padding: 10, background: "#fff", borderRadius: 8, border: "1px solid rgba(120,53,15,0.18)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                          <div>
                            <label style={labelStyle}>{pick(T.version)}</label>
                            <input type="text" value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>{pick(T.status)}</label>
                            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={inputStyle}>
                              <option value="draft">{pick(T.optDraft)}</option>
                              <option value="review">{pick(T.optReview)}</option>
                              <option value="active">{pick(T.optActive)}</option>
                            </select>
                          </div>
                          <div>
                            <label style={labelStyle}>{pick(T.approvedDate)}</label>
                            <input type="date" value={draft.approvedDate} onChange={(e) => setDraft({ ...draft, approvedDate: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>{pick(T.reviewDate)}</label>
                            <input type="date" value={draft.reviewDate} onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })} style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>{pick(T.owner)}</label>
                            <input type="text" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} style={inputStyle} />
                          </div>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                          <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => saveStatus(it)} disabled={saving}>
                            {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.save)}
                          </button>
                          <button style={buttonGhost} onClick={() => setEditingCode(null)} disabled={saving}>{pick(T.cancel)}</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
