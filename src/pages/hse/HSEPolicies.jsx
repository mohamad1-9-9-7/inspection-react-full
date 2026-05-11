// src/pages/hse/HSEPolicies.jsx
// السياسات الأساسية (17 سياسة) — ثنائية اللغة

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiUpdate, useHSELang, HSELangToggle,
} from "./hseShared";

const T = {
  pageTitle:    { ar: "📜 السياسات الأساسية — HSE Policies", en: "📜 Core Policies — HSE Policies" },
  pageSubtitle: { ar: "17 سياسة إلزامية يجب اعتمادها خلال أول 90 يوماً من تأسيس القسم",
                  en: "17 mandatory policies to be approved within the first 90 days of department setup" },
  pageIntro: {
    ar: "تُعدّ السياسات الوثائق المرجعية التي تحدد موقف الشركة من كل جانب من جوانب HSE. كل سياسة هنا تتضمن: الغرض، النطاق، المبادئ الأساسية، المسؤول، ودورة المراجعة. يجب أن تكون معتمدة من الإدارة العليا، ومنشورة في أماكن بارزة، ومفهومة لجميع الموظفين. القائمة التالية تشمل السياسات الإلزامية التي ينبغي إعدادها خلال أول 90 يوماً من تأسيس القسم.",
    en: "Policies are reference documents that define the company's stance on each HSE aspect. Every policy here includes: Purpose, Scope, Core Principles, Owner, and Review Cycle. They must be approved by top management, posted in visible places, and understood by all employees. The following list contains the mandatory policies to be prepared within the first 90 days of department establishment.",
  },
  back:         { ar: "← HSE", en: "← HSE" },
  search:       { ar: "🔍 بحث في السياسات…", en: "🔍 Search policies…" },
  total:        { ar: "📋 الإجمالي:", en: "📋 Total:" },
  active:       { ar: "✅ معتمدة:", en: "✅ Active:" },
  draft:        { ar: "🟡 مسودة:", en: "🟡 Draft:" },
  review:       { ar: "🔵 قيد المراجعة:", en: "🔵 Under Review:" },
  expired:      { ar: "🔴 منتهية:", en: "🔴 Expired:" },
  expand:       { ar: "▼ التفاصيل الكاملة", en: "▼ Full details" },
  collapse:     { ar: "▲ إخفاء", en: "▲ Hide" },
  purpose:      { ar: "🎯 الغرض", en: "🎯 Purpose" },
  scope:        { ar: "📍 النطاق", en: "📍 Scope" },
  principles:   { ar: "📋 المبادئ الأساسية", en: "📋 Core Principles" },
  owner:        { ar: "👤 المسؤول", en: "👤 Owner" },
  reviewCycle:  { ar: "🔁 دورة المراجعة", en: "🔁 Review Cycle" },
  approve:      { ar: "اعتماد", en: "Approve" },
  edit:         { ar: "تعديل", en: "Edit" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  save:         { ar: "💾 حفظ", en: "💾 Save" },
  status:       { ar: "الحالة", en: "Status" },
  approvedDate: { ar: "تاريخ الاعتماد", en: "Approval Date" },
  reviewDate:   { ar: "تاريخ المراجعة القادمة", en: "Next Review Date" },
  approvedBy:   { ar: "اعتُمدت من", en: "Approved By" },
  notes:        { ar: "ملاحظات", en: "Notes" },
  approvedByPh: { ar: "اسم المعتمد", en: "Name of approver" },
  badgeActive:  { ar: "✅ معتمدة", en: "✅ Active" },
  badgeDraft:   { ar: "🟡 مسودة", en: "🟡 Draft" },
  badgeReview:  { ar: "🔵 قيد المراجعة", en: "🔵 Under Review" },
  badgeExpired: { ar: "🔴 منتهية", en: "🔴 Expired" },
  approvedOn:   { ar: "📅 اعتُمدت:", en: "📅 Approved:" },
  reviewOn:     { ar: "🔁 مراجعة قادمة:", en: "🔁 Next review:" },
  by:           { ar: "✍️ بواسطة:", en: "✍️ By:" },
  optDraft:     { ar: "🟡 مسودة", en: "🟡 Draft" },
  optReview:    { ar: "🔵 قيد المراجعة", en: "🔵 Under Review" },
  optActive:    { ar: "✅ معتمدة", en: "✅ Active" },
  optExpired:   { ar: "🔴 منتهية", en: "🔴 Expired" },
};

const POLICIES = [
  {
    id: 1, code: "POL-HSE-01",
    title: { ar: "السياسة العامة للـ HSE", en: "Overall HSE Policy" },
    purpose: { ar: "إعلان رسمي من الإدارة العليا بالتزام الشركة الكامل بحماية صحة وسلامة العاملين، سلامة المنتج الغذائي، والبيئة المحيطة، وذلك كقيمة جوهرية تسبق أي اعتبار تشغيلي أو مالي.",
                en: "A formal declaration from top management of the company's full commitment to protecting employee health and safety, food product safety, and the surrounding environment as a core value that precedes any operational or financial consideration." },
    scope: { ar: "تشمل جميع المواقع، الموظفين، المقاولين، الزوار، والأنشطة المرتبطة بالشركة بدون استثناء.",
             en: "Covers all sites, employees, contractors, visitors, and company-related activities without exception." },
    principles: { ar: "1) صفر تسامح مع المخاطر القابلة للوقاية. 2) الامتثال الكامل للتشريعات. 3) التحسين المستمر. 4) التواصل الشفاف. 5) الموارد الكافية لتطبيق النظام.",
                  en: "1) Zero tolerance for preventable risks. 2) Full legal compliance. 3) Continuous improvement. 4) Transparent communication. 5) Sufficient resources for system implementation." },
    owner: { ar: "الرئيس التنفيذي / مدير HSE", en: "CEO / HSE Manager" },
    review: { ar: "تُراجَع سنوياً وتُوقّع من الرئيس التنفيذي شخصياً، وتُنشر في كل المواقع بإطار زجاجي.",
              en: "Reviewed annually, personally signed by the CEO, and posted in framed display at every site." },
    desc: { ar: "التزام الإدارة العليا، القيم الأساسية، التوقيع من الرئيس التنفيذي. تُراجَع سنوياً.",
            en: "Top management commitment, core values, signed by CEO. Reviewed annually." }
  },
  {
    id: 2, code: "POL-FS-01",
    title: { ar: "سياسة سلامة الغذاء", en: "Food Safety Policy" },
    purpose: { ar: "ضمان أن جميع منتجات اللحوم التي تستوردها وتُصنّعها وتوزّعها الشركة آمنة للاستهلاك البشري ومطابقة لمتطلبات HACCP والحلال وقوانين بلدية دبي وESMA.",
                en: "Ensure all meat products imported, processed, and distributed by the company are safe for human consumption and compliant with HACCP, Halal, Dubai Municipality, and ESMA requirements." },
    scope: { ar: "من نقطة الاستلام (المطار/الميناء) إلى التسليم النهائي للعميل، شاملةً التخزين، التصنيع، التغليف، النقل.",
             en: "From receipt point (airport/port) to final customer delivery — including storage, processing, packaging, transport." },
    principles: { ar: "تطبيق HACCP، تتبّع المنتج، فصل النيئ/المجهّز، النظافة الشخصية الإلزامية، استرجاع المنتج (Recall) عند الحاجة.",
                  en: "Apply HACCP, product traceability, raw/processed segregation, mandatory personal hygiene, product recall when needed." },
    owner: { ar: "مسؤول سلامة الغذاء + مدير HSE", en: "Food Safety Officer + HSE Manager" },
    review: { ar: "تُراجَع سنوياً + بعد أي حادثة سلامة غذاء.", en: "Reviewed annually + after any food safety incident." },
    desc: { ar: "الالتزام بـ HACCP، شهادة الحلال، سلامة سلسلة التبريد، استرجاع المنتج.",
            en: "HACCP commitment, Halal certification, cold-chain integrity, product recall." }
  },
  {
    id: 3, code: "POL-CC-01",
    title: { ar: "سياسة إدارة سلسلة التبريد", en: "Cold Chain Management Policy" },
    purpose: { ar: "الحفاظ على درجات حرارة اللحوم المبردة (0 إلى +4°م) واللحوم المجمدة (-18°م أو أقل) من لحظة الاستلام وحتى التسليم لمنع نمو البكتيريا الممرضة وضمان جودة المنتج.",
                en: "Maintain chilled meat temperatures (0 to +4°C) and frozen meat temperatures (-18°C or lower) from receipt to delivery — to prevent pathogenic bacteria growth and ensure product quality." },
    scope: { ar: "غرف التبريد والتجميد، شاحنات النقل، مناطق الاستلام والشحن، أجهزة قياس الحرارة، خطط الطوارئ عند انقطاع الكهرباء.",
             en: "Chiller and freezer rooms, transport trucks, receiving and dispatch zones, temperature measurement devices, contingency plans for power outage." },
    principles: { ar: "قياس الحرارة كل 4 ساعات، إنذار آلي عند الانحراف، Data Loggers مُعايَرة، مولّد كهرباء احتياطي، حد الإنذار قبل الحد الحرج بدرجتين.",
                  en: "Temperature reading every 4 hours, automatic alarm on deviation, calibrated data loggers, backup generator, alarm threshold 2°C before critical limit." },
    owner: { ar: "مدير العمليات + مسؤول سلامة الغذاء", en: "Operations Manager + Food Safety Officer" },
    review: { ar: "نصف سنوي + اختبار خطة الطوارئ سنوياً.", en: "Half-yearly + annual contingency plan test." },
    desc: { ar: "درجات الحرارة المستهدفة (-18°م تجميد، 0 إلى +4°م تبريد)، حدود الإنذار، خطط الطوارئ.",
            en: "Target temperatures (-18°C frozen, 0 to +4°C chilled), alarm limits, contingency plans." }
  },
  {
    id: 4, code: "POL-PPE-01",
    title: { ar: "سياسة معدات الوقاية الشخصية (PPE)", en: "PPE Policy" },
    purpose: { ar: "حماية العاملين من المخاطر الفيزيائية، الكيميائية، والبيولوجية المتعلقة بطبيعة عملهم في غرف التبريد، خط التصنيع، والمستودع.",
                en: "Protect workers from physical, chemical, and biological hazards related to their work in cold rooms, processing line, and warehouse." },
    scope: { ar: "كل العاملين، المقاولين، الزوار، حسب المنطقة الداخلة فيها (لكل منطقة قائمة PPE خاصة).",
             en: "All workers, contractors, visitors — based on the area entered (each area has its own PPE list)." },
    principles: { ar: "غرف التبريد: معطف معزول + قفازات حرارية + قبعة. خط التصنيع: قفازات مقاومة للقطع + صدرية + شبكة شعر + أحذية بيضاء. المستودع: خوذة + أحذية أمان + صدرية عاكسة. الكيماويات: قناع + نظارات.",
                  en: "Cold rooms: insulated coat + thermal gloves + cap. Processing line: cut-resistant gloves + apron + hair net + white boots. Warehouse: helmet + safety boots + hi-vis vest. Chemicals: respirator + goggles." },
    owner: { ar: "ضابط HSE الموقع", en: "HSE Site Officer" },
    review: { ar: "سنوي + استبدال PPE التالف فوراً.", en: "Annual + immediate replacement of damaged PPE." },
    desc: { ar: "المعدات الإلزامية لكل منطقة: معاطف مبردة، قفازات مقاومة للقطع، أحذية غير قابلة للانزلاق، أقنعة.",
            en: "Mandatory PPE per area: insulated coats, cut-resistant gloves, anti-slip boots, masks." }
  },
  {
    id: 5, code: "POL-CW-01",
    title: { ar: "سياسة العمل في البيئات الباردة", en: "Cold Environment Work Policy" },
    purpose: { ar: "حماية العاملين من مخاطر التعرض المطوّل للبرودة الشديدة في غرف التجميد (-18°م) والتبريد (0 إلى +4°م) لمنع انخفاض حرارة الجسم وقضمة الصقيع.",
                en: "Protect workers from prolonged exposure to extreme cold in freezer (-18°C) and chiller rooms (0 to +4°C) to prevent hypothermia and frostbite." },
    scope: { ar: "أي عامل يدخل غرف التبريد أو التجميد لأي مدة (حتى لو لدقائق)، شاملاً الزوار والمقاولين.",
             en: "Any worker entering chiller or freezer rooms for any duration (even minutes) — including visitors and contractors." },
    principles: { ar: "حد أقصى للدخول: 45 دقيقة في غرفة التجميد ثم 15 دقيقة استراحة. زر طوارئ داخلي. نظام فتح من الداخل. لاسلكي إجباري. تدوير بين العمال. فحص طبي نصف سنوي.",
                  en: "Max entry: 45 min in freezer + 15 min break. Internal emergency button. Inside-release door system. Mandatory two-way radio. Worker rotation. Half-yearly medical check." },
    owner: { ar: "ضابط HSE الموقع + المشرف المباشر", en: "HSE Site Officer + Direct Supervisor" },
    review: { ar: "سنوي + بعد أي بلاغ شبه حادث متعلق بالبرودة.", en: "Annual + after any cold-related near-miss." },
    desc: { ar: "مدة التعرض القصوى، فترات التدفئة الإلزامية، التدوير بين الموظفين، الفحص الطبي الدوري.",
            en: "Maximum exposure duration, mandatory warm-up breaks, worker rotation, periodic medical checks." }
  },
  {
    id: 6, code: "POL-IR-01",
    title: { ar: "سياسة التعامل مع الحوادث والإبلاغ", en: "Incident Reporting Policy" },
    purpose: { ar: "ضمان الإبلاغ الفوري والشفاف عن جميع الحوادث وشبه الحوادث لتمكين التحقيق ومنع التكرار، مع حماية المُبلِّغين من أي شكل من أشكال الانتقام.",
                en: "Ensure immediate and transparent reporting of all incidents and near-misses to enable investigation and prevent recurrence — while protecting reporters from any form of retaliation." },
    scope: { ar: "كل الحوادث: إصابات، حرائق، تسربات، تلوث غذائي، تلف ممتلكات، حوادث مرورية للأسطول، شبه حوادث.",
             en: "All incidents: injuries, fires, leaks, food contamination, property damage, fleet road incidents, near-misses." },
    principles: { ar: "إبلاغ HSE خلال ساعة. إيقاف الأنشطة الخطرة فوراً. حفظ مكان الحادث. تحقيق متعدد المستويات. تحليل الأسباب الجذرية (5 Whys / Fishbone). إجراءات تصحيحية بإطار زمني محدد.",
                  en: "Report HSE within 1 hour. Immediately stop hazardous activities. Preserve the incident scene. Multi-level investigation. Root-cause analysis (5 Whys / Fishbone). Corrective actions with defined timelines." },
    owner: { ar: "مدير HSE", en: "HSE Manager" },
    review: { ar: "سنوي + بعد كل حادث رئيسي.", en: "Annual + after each major incident." },
    desc: { ar: "إجراءات الإبلاغ الفوري، سلّم التصعيد، التحقيق، الإجراءات التصحيحية.",
            en: "Immediate reporting procedures, escalation ladder, investigation, corrective actions." }
  },
  {
    id: 7, code: "POL-EM-01",
    title: { ar: "سياسة الاستجابة للطوارئ والإخلاء", en: "Emergency Response & Evacuation Policy" },
    purpose: { ar: "تجهيز الشركة للاستجابة الفعّالة لسيناريوهات الطوارئ المحتملة بطريقة منظّمة لحماية الأرواح والممتلكات والمنتج وتقليل وقت التوقف.",
                en: "Prepare the company for effective response to potential emergency scenarios in an organized way — protecting lives, property, product, and minimizing downtime." },
    scope: { ar: "الحرائق، تسرب الأمونيا/الفريون، انقطاع الكهرباء المطوّل (>4 ساعات)، الإصابات الجماعية، الفيضانات، الزلازل، احتجاز شخص في غرفة التجميد.",
             en: "Fires, ammonia/freon leaks, extended power outages (>4 hours), mass casualties, floods, earthquakes, person trapped in freezer." },
    principles: { ar: "خطة إخلاء معتمدة لكل موقع. نقاط تجمع محددة. فريق طوارئ داخلي مدرّب. أرقام طوارئ معلّقة. تدريب إخلاء ربع سنوي. تقييم بعد كل تجربة.",
                  en: "Approved evacuation plan per site. Defined assembly points. Trained internal emergency team. Posted emergency numbers. Quarterly evacuation drill. Post-drill evaluation." },
    owner: { ar: "مدير HSE + الدفاع المدني (تنسيق خارجي)", en: "HSE Manager + Civil Defence (external coordination)" },
    review: { ar: "ربع سنوي بعد كل تجربة إخلاء.", en: "Quarterly after each evacuation drill." },
    desc: { ar: "سيناريوهات الحرائق، تسرب الأمونيا، انقطاع الكهرباء، إصابات جماعية، تدريب الإخلاء ربع سنوي.",
            en: "Fire scenarios, ammonia leak, power outage, mass casualties, quarterly evacuation drills." }
  },
  {
    id: 8, code: "POL-TR-01",
    title: { ar: "سياسة التدريب والكفاءة", en: "Training & Competence Policy" },
    purpose: { ar: "ضمان أن كل موظف لديه المعرفة والمهارات اللازمة لأداء عمله بأمان ومطابقة لمعايير سلامة الغذاء، وأن لا أحد يبدأ مهامه قبل اكتمال تدريبه التعريفي.",
                en: "Ensure every employee has the knowledge and skills required to do their job safely and in compliance with food safety standards — and that no one starts work before completing induction training." },
    scope: { ar: "كل موظف جديد، الموظفون الحاليون (تنشيطي سنوي)، تدريب على معدات جديدة، تدريب بعد تغيير دور أو موقع.",
             en: "Every new employee, existing employees (annual refresher), training on new equipment, training after role or location change." },
    principles: { ar: "التدريب التعريفي قبل بدء العمل. حد أدنى من الساعات لكل دور (16 دورة في مصفوفة التدريب). تقييم الفهم قبل التصديق. تجديد الشهادات حسب المتطلب. ميزانية 1,200-1,800 درهم/موظف سنوياً.",
                  en: "Induction before starting work. Minimum hours per role (16 courses in training matrix). Knowledge assessment before certification. Certificate renewal as required. Budget 1,200-1,800 AED/employee/year." },
    owner: { ar: "منسق HSE + المسؤول المباشر", en: "HSE Coordinator + Direct Supervisor" },
    review: { ar: "سنوي + تحديث المصفوفة عند تغيير العمليات.", en: "Annual + matrix update when operations change." },
    desc: { ar: "الحد الأدنى من ساعات التدريب لكل وظيفة، التدريب التعريفي، التدريب التنشيطي السنوي.",
            en: "Minimum training hours per role, induction training, annual refresher training." }
  },
  {
    id: 9, code: "POL-CHEM-01",
    title: { ar: "سياسة إدارة المواد الكيميائية", en: "Chemical Management Policy" },
    purpose: { ar: "ضمان التعامل والتخزين والتخلص الآمن من المواد الكيميائية المستخدمة في الشركة (مواد التنظيف والتعقيم، غازات التبريد، المبيدات) لحماية العاملين والمنتج والبيئة.",
                en: "Ensure safe handling, storage, and disposal of chemicals used in the company (cleaning/sanitizing agents, refrigerant gases, pesticides) to protect workers, product, and the environment." },
    scope: { ar: "مواد التنظيف، المعقّمات، المبيدات، الأمونيا والفريون، الزيوت والشحوم. شامل المخازن، خطوط التصنيع، غرف الماكينات.",
             en: "Cleaning agents, sanitizers, pesticides, ammonia and freon, oils and greases. Including stores, processing lines, plant rooms." },
    principles: { ar: "MSDS متاحة لكل مادة بلغتين. تخزين منفصل وموصوم. ممنوع خلط الكيماويات. تهوية كافية. PPE حسب MSDS. تدريب من المورّد. خطة استجابة للانسكاب (Spill Kit).",
                  en: "MSDS available for each substance in 2 languages. Segregated, labeled storage. No chemical mixing. Adequate ventilation. PPE per MSDS. Supplier training. Spill response plan (Spill Kit)." },
    owner: { ar: "ضابط HSE + رئيس الصيانة", en: "HSE Officer + Maintenance Lead" },
    review: { ar: "سنوي + عند إدخال أي مادة جديدة.", en: "Annual + when introducing any new substance." },
    desc: { ar: "تخزين مواد التنظيف والتعقيم، تداول غازات التبريد، أوراق بيانات السلامة (SDS).",
            en: "Storage of cleaning/sanitizing chemicals, refrigerant gas handling, Safety Data Sheets (SDS)." }
  },
  {
    id: 10, code: "POL-WST-01",
    title: { ar: "سياسة إدارة النفايات", en: "Waste Management Policy" },
    purpose: { ar: "ضمان فصل النفايات وجمعها ونقلها والتخلص منها بطريقة قانونية وبيئية لتجنّب التلوث، الروائح، الحشرات، وغرامات بلدية دبي.",
                en: "Ensure waste segregation, collection, transport, and disposal in a legal and environmental manner — to avoid contamination, odors, pests, and Dubai Municipality fines." },
    scope: { ar: "النفايات العضوية (مخلفات لحوم، دماء)، الكرتون والبلاستيك، الزيوت، الكيماويات، PPE الملوث، غازات التبريد، مياه الصرف.",
             en: "Organic waste (meat scraps, blood), cardboard and plastic, oils, chemicals, contaminated PPE, refrigerant gases, wastewater." },
    principles: { ar: "فصل من المصدر. حاويات مغطاة موسومة بألوان مختلفة. إخلاء يومي للنفايات العضوية. شركات نقل معتمدة من البلدية فقط. سجل Manifest لكل نقل. شهادة تخلص آمن.",
                  en: "Source segregation. Covered, color-coded containers. Daily organic waste removal. DM-approved waste carriers only. Manifest record for every transport. Safe disposal certificate." },
    owner: { ar: "منسق HSE + إدارة المرافق", en: "HSE Coordinator + Facilities Management" },
    review: { ar: "سنوي + عند تغيير المتعهد.", en: "Annual + when changing the contractor." },
    desc: { ar: "فصل النفايات العضوية، نقل اللحوم الفاسدة، التعاقد مع شركات معتمدة من البلدية.",
            en: "Organic waste segregation, spoiled meat transport, contracts with DM-approved companies." }
  },
  {
    id: 11, code: "POL-HYG-01",
    title: { ar: "سياسة النظافة الشخصية والصحة", en: "Personal Hygiene & Health Policy" },
    purpose: { ar: "منع تلوث المنتج الغذائي عبر العاملين أنفسهم، وضمان أن جميع متعاملي الغذاء بحالة صحية تسمح لهم بأداء أعمالهم.",
                en: "Prevent food contamination via workers themselves, and ensure all food handlers are in a health condition allowing them to perform their work." },
    scope: { ar: "كل عامل يدخل خط التصنيع أو يلامس المنتج، شاملاً المشرفين والمدققين والزوار.",
             en: "Every worker entering processing line or touching product — including supervisors, auditors, visitors." },
    principles: { ar: "بطاقة صحية سارية إلزامية. غسل اليدين كل ساعة وعند تغيير المهمة. ممنوع الأكل/الشرب/التدخين/المضغ في مناطق الإنتاج. ممنوع المجوهرات. شعر مغطى بالكامل. تبليغ فوري عن أي مرض معدٍ. فحص طبي سنوي.",
                  en: "Valid health card mandatory. Hand-washing every hour and when changing tasks. No eating/drinking/smoking/chewing in production areas. No jewelry. Hair fully covered. Immediate report of any infectious disease. Annual medical check." },
    owner: { ar: "مسؤول سلامة الغذاء", en: "Food Safety Officer" },
    review: { ar: "نصف سنوي.", en: "Half-yearly." },
    desc: { ar: "البطاقة الصحية، غسل اليدين، منع التدخين والأكل، الأمراض المعدية، الفحص الطبي السنوي.",
            en: "Health card, hand-washing, no smoking/eating, infectious diseases, annual medical check." }
  },
  {
    id: 12, code: "POL-FLT-01",
    title: { ar: "سياسة تشغيل الرافعات الشوكية", en: "Forklift Operation Policy" },
    purpose: { ar: "منع حوادث الرافعات الشوكية في المستودع التي قد تؤدي لإصابات بليغة أو وفاة أو تلف للمنتج والمنشآت.",
                en: "Prevent forklift accidents in the warehouse that may lead to severe injuries, fatalities, or damage to product and facilities." },
    scope: { ar: "كل سائقي الرافعات، الفنيين، والصيانة. شامل ممرات المستودع، منطقة الاستلام، منطقة الشحن.",
             en: "All forklift operators, technicians, and maintenance staff. Including warehouse aisles, receiving and dispatch areas." },
    principles: { ar: "رخصة سائق معتمدة فقط. فحص يومي قبل التشغيل. سرعة قصوى 10 كم/س داخل المستودع. ممرات مشاة محددة. حزام أمان وخوذة. منع الركاب. تجديد الرخصة كل 3 سنوات. تدريب إنعاش للسائقين.",
                  en: "Certified license only. Daily pre-operation inspection. Max speed 10 km/h inside warehouse. Defined pedestrian aisles. Seat belt and helmet. No passengers. License renewal every 3 years. Refresher training for drivers." },
    owner: { ar: "مدير المستودع + ضابط HSE", en: "Warehouse Manager + HSE Officer" },
    review: { ar: "سنوي + بعد أي حادثة رافعة.", en: "Annual + after any forklift incident." },
    desc: { ar: "ترخيص السائقين، الفحص اليومي، السرعة القصوى، إلزامية الحزام والخوذة.",
            en: "Driver licensing, daily inspection, max speed, mandatory seat-belt and helmet." }
  },
  {
    id: 13, code: "POL-LIFT-01",
    title: { ar: "سياسة الرفع اليدوي والحركات المتكررة", en: "Manual Handling & Ergonomics Policy" },
    purpose: { ar: "منع الإصابات الإرغونومية (آلام الظهر، فتق، إصابات الكتف) الناتجة عن الرفع المتكرر للأحمال الثقيلة في منطقة الاستلام والتصنيع.",
                en: "Prevent ergonomic injuries (back pain, hernia, shoulder injuries) caused by repetitive heavy lifting in receiving and processing areas." },
    scope: { ar: "كل العاملين الذين يقومون بمهام رفع يدوي، التحميل، التفريغ، نقل بضائع.",
             en: "All workers performing manual lifting, loading, unloading, goods movement." },
    principles: { ar: "حد أقصى 25 كجم لكل رفعة فردية. تدريب التقنية الصحيحة. استخدام العربات والرافعات للأحمال الثقيلة. تدوير المهام لتجنّب الحركات المتكررة. أرضيات غير زلقة. فحص طبي للظهر.",
                  en: "Max 25 kg per single lift. Correct technique training. Use trolleys and lifts for heavy loads. Task rotation to avoid repetitive motion. Non-slip flooring. Back medical check." },
    owner: { ar: "ضابط HSE + المشرف المباشر", en: "HSE Officer + Direct Supervisor" },
    review: { ar: "سنوي.", en: "Annual." },
    desc: { ar: "حدود الأوزان (25 كجم)، تقنيات الرفع الصحيحة، استخدام العربات والرافعات.",
            en: "Weight limits (25 kg), proper lifting techniques, use of trolleys and lifts." }
  },
  {
    id: 14, code: "POL-PEST-01",
    title: { ar: "سياسة مكافحة الحشرات", en: "Pest Control Policy" },
    purpose: { ar: "منع تواجد الحشرات والقوارض في مرافق الشركة لتجنّب تلوث المنتج، الإغلاق من بلدية دبي، وفقدان شهادة HACCP.",
                en: "Prevent presence of pests and rodents in company facilities — to avoid product contamination, DM closure, and loss of HACCP certification." },
    scope: { ar: "كل المرافق: المستودعات، خط التصنيع، المكاتب، السكن المُلحق، محيط المنشآت.",
             en: "All facilities: warehouses, processing line, offices, attached accommodation, facility perimeter." },
    principles: { ar: "عقد مع شركة معتمدة من بلدية دبي. زيارة شهرية على الأقل + زيارات طارئة عند الحاجة. خرائط مصائد محدّثة. سدّ الفتحات الخارجية. منع تخزين البضائع على الأرض مباشرة. تسجيل وتحقيق فوري لأي رؤية لحشرة/قارض.",
                  en: "Contract with DM-approved company. At least monthly visits + emergency visits when needed. Updated trap maps. Seal external openings. No goods stored directly on floor. Immediate logging and investigation of any pest sighting." },
    owner: { ar: "مسؤول سلامة الغذاء", en: "Food Safety Officer" },
    review: { ar: "سنوي + بعد كل تقرير زيارة.", en: "Annual + after every visit report." },
    desc: { ar: "عقد مع شركة معتمدة من البلدية، زيارات شهرية على الأقل، سجلات المصائد.",
            en: "Contract with DM-approved company, at least monthly visits, trap records." }
  },
  {
    id: 15, code: "POL-VIS-01",
    title: { ar: "سياسة المقاولين والزوار", en: "Contractors & Visitors Policy" },
    purpose: { ar: "ضمان أن كل من يدخل مرافق الشركة من خارج كادر الموظفين الدائمين يخضع لنفس متطلبات السلامة وسلامة الغذاء، ولا يُشكل خطراً على المنتج أو العاملين.",
                en: "Ensure that anyone entering company facilities from outside the permanent staff is subject to the same safety and food safety requirements, and poses no risk to product or workers." },
    scope: { ar: "كل المقاولين، فنيي الصيانة، المدققين، شركة المكافحة، الموردين، الزوار، العملاء.",
             en: "All contractors, maintenance technicians, auditors, pest control company, suppliers, visitors, customers." },
    principles: { ar: "تسجيل الدخول والخروج. تدريب تعريفي قصير قبل الدخول. PPE إلزامي حسب المنطقة. مرافق من الشركة. ممنوع التصوير دون إذن. توقيع NDA إذا لزم. فحص بطاقة صحية لمن يلمس المنتج.",
                  en: "Sign-in/sign-out. Brief induction before entry. Mandatory PPE per area. Company escort. No photos without permission. NDA signing if needed. Health card check for anyone touching product." },
    owner: { ar: "ضابط HSE + الأمن", en: "HSE Officer + Security" },
    review: { ar: "سنوي.", en: "Annual." },
    desc: { ar: "تدريب تعريفي قبل الدخول، معدات الوقاية، مراقبة الدخول والخروج.",
            en: "Pre-entry induction, PPE, entry/exit monitoring." }
  },
  {
    id: 16, code: "POL-MOC-01",
    title: { ar: "سياسة إدارة التغيير (Management of Change)", en: "Management of Change Policy" },
    purpose: { ar: "ضمان أن أي تغيير في المعدات، العمليات، المواد الخام، أو هيكل الموظفين يخضع لتقييم مخاطر مسبق قبل التنفيذ لمنع إدخال مخاطر جديدة دون قصد.",
                en: "Ensure any change in equipment, processes, raw materials, or staff structure undergoes prior risk assessment before implementation — to prevent unintentionally introducing new risks." },
    scope: { ar: "تغيير معدات، خطوط إنتاج، موردين، مواد كيميائية، تخطيط المستودع، تغييرات تنظيمية، تغيير سياسات.",
             en: "Changes to equipment, production lines, suppliers, chemicals, warehouse layout, organizational changes, policy changes." },
    principles: { ar: "نموذج طلب تغيير رسمي. تقييم مخاطر إلزامي قبل الموافقة. اعتماد من مدير HSE. تدريب على التغيير. تحديث الوثائق المتأثرة. مراجعة بعد 30 يوم من التطبيق.",
                  en: "Formal change request form. Mandatory risk assessment before approval. HSE Manager approval. Change training. Update affected documents. Review 30 days after implementation." },
    owner: { ar: "مدير HSE", en: "HSE Manager" },
    review: { ar: "بعد كل تغيير + سنوي.", en: "After every change + annual." },
    desc: { ar: "أي تغيير في المعدات، العمليات، أو المواد يتطلب تقييم مخاطر قبل التطبيق.",
            en: "Any change in equipment, processes, or materials requires risk assessment before implementation." }
  },
  {
    id: 17, code: "POL-WP-01",
    title: { ar: "سياسة تصاريح العمل (Work Permits)", en: "Work Permit System Policy" },
    purpose: { ar: "ضمان أن الأعمال الخطرة (الأعمال الساخنة، الأماكن المغلقة، الارتفاعات، الكهرباء، الكيماويات) لا تبدأ إلا بعد تقييم رسمي للمخاطر، اتخاذ احتياطات محددة، واعتماد من مدير HSE.",
                en: "Ensure hazardous work (hot work, confined spaces, heights, electrical, chemicals) does not start until after formal risk assessment, defined precautions, and HSE Manager approval." },
    scope: { ar: "أعمال اللحام/القطع/الطحن، الدخول لخزانات أو مساحات ضيقة، العمل بارتفاع >1.8م، الصيانة الكهربائية، تداول كيماويات خطرة، الحفريات، الرفع الثقيل بكرين.",
             en: "Welding/cutting/grinding, entry into tanks or confined spaces, working at heights >1.8m, electrical maintenance, hazardous chemical handling, excavations, crane lifting." },
    principles: { ar: "تصريح ساري قبل بدء العمل. قائمة فحوصات أمنية حسب نوع العمل. مراقب حريق/مراقب خارجي حسب الحالة. PPE خاص. خطة طوارئ. إغلاق التصريح بعد انتهاء العمل.",
                  en: "Valid permit before starting work. Safety checklist per work type. Fire watch / outside watchman as required. Special PPE. Emergency plan. Close permit after work completion." },
    owner: { ar: "مدير HSE (يوقّع كل تصريح)", en: "HSE Manager (signs every permit)" },
    review: { ar: "سنوي + بعد أي حادثة عمل خطر.", en: "Annual + after any hazardous-work incident." },
    desc: { ar: "أعمال ساخنة، العمل في الأماكن المغلقة، الارتفاعات، الصيانة الكهربائية.",
            en: "Hot work, confined spaces, working at heights, electrical maintenance." }
  },
];

const TYPE = "policies_status";

export default function HSEPolicies() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [statuses, setStatuses] = useState({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState({ approvedDate: "", reviewDate: "", approvedBy: "", status: "draft", notes: "" });
  const [saving, setSaving] = useState(false);

  async function reload() {
    const arr = await apiList(TYPE);
    const map = {};
    arr.forEach((s) => { if (s.policyId) map[s.policyId] = s; });
    setStatuses(map);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(p) {
    setEditingId(p.id);
    const existing = statuses[p.id] || {};
    setDraft({
      approvedDate: existing.approvedDate || todayISO(),
      reviewDate: existing.reviewDate || "",
      approvedBy: existing.approvedBy || "",
      status: existing.status || "active",
      notes: existing.notes || "",
    });
  }

  async function saveStatus(p) {
    setSaving(true);
    try {
      const existing = statuses[p.id];
      const payload = { ...draft, policyId: p.id, code: p.code, titleAr: p.title.ar, titleEn: p.title.en };
      if (existing && existing.id) {
        await apiUpdate(TYPE, existing.id, payload, draft.approvedBy || "HSE");
      } else {
        await apiSave(TYPE, payload, draft.approvedBy || "HSE");
      }
      await reload();
      setEditingId(null);
    } catch (e) {
      alert((lang === "ar" ? "❌ خطأ بالحفظ: " : "❌ Save error: ") + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  const filtered = POLICIES.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.title.ar.includes(search) || p.title.en.toLowerCase().includes(s) || p.code.toLowerCase().includes(s);
  });

  const statBg = (st) => ({ active: "#dcfce7", draft: "#fef9c3", review: "#dbeafe", expired: "#fee2e2" }[st] || "#f1f5f9");
  const statColor = (st) => ({ active: "#166534", draft: "#854d0e", review: "#1e40af", expired: "#7f1d1d" }[st] || "#475569");
  const badgeText = (st) => st === "active" ? pick(T.badgeActive) : st === "draft" ? pick(T.badgeDraft) : st === "review" ? pick(T.badgeReview) : pick(T.badgeExpired);

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

        <div style={{ ...cardStyle, marginBottom: 14 }}>
          <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, fontWeight: 700, color: HSE_COLORS.primaryDark, flexWrap: "wrap" }}>
            <span>{pick(T.total)} {POLICIES.length}</span>
            <span>{pick(T.active)} {Object.values(statuses).filter((s) => s.status === "active").length}</span>
            <span>{pick(T.draft)} {Object.values(statuses).filter((s) => s.status === "draft").length}</span>
            <span>{pick(T.review)} {Object.values(statuses).filter((s) => s.status === "review").length}</span>
            <span>{pick(T.expired)} {Object.values(statuses).filter((s) => s.status === "expired").length}</span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((p) => {
            const st = statuses[p.id];
            const isEdit = editingId === p.id;
            return (
              <div key={p.id} style={{ ...cardStyle, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 900, padding: "3px 8px", borderRadius: 8, background: "rgba(254, 215, 170, 0.80)", color: HSE_COLORS.primaryDark }}>{p.code}</span>
                      <span style={{ fontWeight: 950, fontSize: 15 }}>{pick(p.title)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.6 }}>{pick(p.desc)}</div>
                    <button
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      style={{ marginTop: 10, padding: "5px 12px", borderRadius: 8, background: "#fff7ed", color: HSE_COLORS.primaryDark, border: "1px solid rgba(120,53,15,0.18)", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
                    >
                      {expandedId === p.id ? pick(T.collapse) : pick(T.expand)}
                    </button>
                  </div>

                  <div style={{ minWidth: 140, textAlign: dir === "rtl" ? "left" : "right" }}>
                    {st?.status && (
                      <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: statBg(st.status), color: statColor(st.status), fontSize: 12, fontWeight: 900, marginBottom: 6 }}>
                        {badgeText(st.status)}
                      </span>
                    )}
                    <div>
                      {!isEdit && (
                        <button style={buttonGhost} onClick={() => startEdit(p)}>
                          {st ? pick(T.edit) : pick(T.approve)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded full details */}
                {expandedId === p.id && (
                  <div style={{ marginTop: 14, padding: 14, background: "#fff7ed", borderRadius: 10, border: "1px solid rgba(120,53,15,0.18)" }}>
                    {p.purpose && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#1e40af", marginBottom: 4 }}>{pick(T.purpose)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#1f0f00" }}>{pick(p.purpose)}</div>
                      </div>
                    )}
                    {p.scope && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#9a3412", marginBottom: 4 }}>{pick(T.scope)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#1f0f00" }}>{pick(p.scope)}</div>
                      </div>
                    )}
                    {p.principles && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 13, fontWeight: 950, color: "#166534", marginBottom: 4 }}>{pick(T.principles)}</div>
                        <div style={{ fontSize: 13, lineHeight: 1.8, color: "#1f0f00" }}>{pick(p.principles)}</div>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 6 }}>
                      {p.owner && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 950, color: "#7c3aed", marginBottom: 2 }}>{pick(T.owner)}</div>
                          <div style={{ fontSize: 12, color: "#1f0f00" }}>{pick(p.owner)}</div>
                        </div>
                      )}
                      {p.review && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 950, color: "#7c3aed", marginBottom: 2 }}>{pick(T.reviewCycle)}</div>
                          <div style={{ fontSize: 12, color: "#1f0f00" }}>{pick(p.review)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!isEdit && st && (
                  <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, background: "#fff7ed", border: "1px dashed rgba(120,53,15,0.18)", fontSize: 12, color: "#7c2d12", display: "flex", gap: 14, flexWrap: "wrap" }}>
                    <span>{pick(T.approvedOn)} <b>{st.approvedDate || "—"}</b></span>
                    <span>{pick(T.reviewOn)} <b>{st.reviewDate || "—"}</b></span>
                    <span>{pick(T.by)} <b>{st.approvedBy || "—"}</b></span>
                    {st.notes && <span>📝 {st.notes}</span>}
                  </div>
                )}

                {isEdit && (
                  <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "#fff7ed", border: "1px solid rgba(120,53,15,0.18)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                      <div>
                        <label style={labelStyle}>{pick(T.status)}</label>
                        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={inputStyle}>
                          <option value="draft">{pick(T.optDraft)}</option>
                          <option value="review">{pick(T.optReview)}</option>
                          <option value="active">{pick(T.optActive)}</option>
                          <option value="expired">{pick(T.optExpired)}</option>
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
                        <label style={labelStyle}>{pick(T.approvedBy)}</label>
                        <input type="text" placeholder={pick(T.approvedByPh)} value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>{pick(T.notes)}</label>
                      <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button style={{ ...buttonPrimary, opacity: saving ? 0.6 : 1 }} onClick={() => saveStatus(p)} disabled={saving}>
                        {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.save)}
                      </button>
                      <button style={buttonGhost} onClick={() => setEditingId(null)} disabled={saving}>{pick(T.cancel)}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
