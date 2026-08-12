// src/pages/haccp and iso/FoodDefense/foodDefenseData.js
// Food Defense Plan (TACCP / VACCP) — bilingual content + seed vulnerability assessment.
// ISO 22000:2018 §8.5.1.5.2 (food defence, biovigilance & bioterrorism) + PAS 96:2017
// + FSMA Intentional Adulteration rule (21 CFR Part 121) + BRCGS Food Issue 9 §4.2
// + Dubai Municipality Food Code. Data-only module — no JSX here.

export const DOC_NO = "FSMS-FD-01";
export const DOC_REV = "01";
export const DOC_DATE = "2026-01-01";

/* ─────────────────────────────────────────────────────────────
   1) Threat categories (TACCP + VACCP)
   ───────────────────────────────────────────────────────────── */
export const THREAT_CATEGORIES = [
  { v: "insider",     icon: "🧑‍🏭", ar: "تهديد داخلي (موظف ساخط / متعاقد)",        en: "Insider threat (disgruntled employee / contractor)" },
  { v: "intrusion",   icon: "🚪", ar: "اقتحام / دخول غير مصرح به",                  en: "Intrusion / unauthorized access" },
  { v: "supplychain", icon: "🚚", ar: "تلاعب بسلسلة التوريد أو أثناء النقل",        en: "Supply chain / in-transit tampering" },
  { v: "ema",         icon: "💰", ar: "غش اقتصادي (VACCP) — استبدال/تخفيف/وسم كاذب", en: "Economically motivated adulteration (VACCP)" },
  { v: "cyber",       icon: "💻", ar: "هجوم سيبراني على أنظمة التحكم والسجلات",      en: "Cyber attack on control systems & records" },
  { v: "ideological", icon: "☣️", ar: "تخريب أيديولوجي / إرهاب غذائي",               en: "Ideological sabotage / food terrorism" },
  { v: "extortion",   icon: "📞", ar: "ابتزاز أو تهديد بالتلويث",                    en: "Extortion / contamination threat" },
  { v: "counterfeit", icon: "🏷️", ar: "تقليد المنتج أو إساءة استخدام العلامة",       en: "Counterfeiting / brand misuse" },
  { v: "espionage",   icon: "🕵️", ar: "تجسس صناعي وسرقة معلومات",                    en: "Industrial espionage / information theft" },
  { v: "utilities",   icon: "⚡", ar: "استهداف المرافق (ماء، كهرباء، تبريد)",        en: "Attack on utilities (water, power, refrigeration)" },
];

/* ─────────────────────────────────────────────────────────────
   2) Site zones / process steps assessed
   ───────────────────────────────────────────────────────────── */
export const FD_AREAS = [
  { v: "perimeter",   ar: "المحيط الخارجي والبوابات",        en: "Outer perimeter & gates" },
  { v: "receiving",   ar: "رصيف الاستلام",                    en: "Receiving dock" },
  { v: "coldstore",   ar: "غرف التبريد والتجميد",             en: "Chillers & freezers" },
  { v: "cutting",     ar: "صالة التقطيع والتجهيز",            en: "Cutting & processing hall" },
  { v: "packaging",   ar: "التعبئة والوسم",                   en: "Packaging & labelling" },
  { v: "chemicals",   ar: "مخزن المواد الكيميائية",           en: "Chemical store" },
  { v: "water",       ar: "خزان المياه ومكينة الثلج",         en: "Water tank & ice machine" },
  { v: "finished",    ar: "مخزن المنتج النهائي",              en: "Finished goods store" },
  { v: "loading",     ar: "رصيف التحميل",                     en: "Loading bay" },
  { v: "transport",   ar: "أسطول النقل المبرد",               en: "Refrigerated transport fleet" },
  { v: "waste",       ar: "منطقة النفايات والمرتجعات",        en: "Waste & returns area" },
  { v: "utilities",   ar: "غرف المرافق والمولدات",            en: "Utility & generator rooms" },
  { v: "it",          ar: "غرفة الخوادم وأنظمة المعلومات",    en: "Server room & IT systems" },
  { v: "admin",       ar: "المكاتب الإدارية والزوار",         en: "Admin offices & visitors" },
  { v: "pos",         ar: "منافذ البيع (POS) والمحلات",       en: "POS outlets & retail shops" },
  { v: "kitchen",     ar: "المطبخ المركزي",                   en: "Central kitchen" },
  { v: "trucks",      ar: "عربات الطعام المتنقلة",            en: "Mobile food trucks" },
  { v: "supplier",    ar: "الموردون والمواد الواردة",         en: "Suppliers & incoming materials" },
  { v: "staff",       ar: "الموارد البشرية والعاملون",        en: "HR & workforce" },
];

/* ─────────────────────────────────────────────────────────────
   3) Status values
   ───────────────────────────────────────────────────────────── */
export const FD_STATUS = [
  { v: "open",       ar: "مفتوح",        en: "Open",        bg: "#fee2e2", color: "#7f1d1d" },
  { v: "inprogress", ar: "قيد التنفيذ",  en: "In progress", bg: "#fef9c3", color: "#854d0e" },
  { v: "controlled", ar: "تحت السيطرة",  en: "Controlled",  bg: "#dcfce7", color: "#166534" },
];

/* ─────────────────────────────────────────────────────────────
   4) Food Defense Team (TACCP team) — ISO 22000 §5.3 / §7.2
   ───────────────────────────────────────────────────────────── */
export const FD_TEAM = [
  {
    role: { ar: "قائد فريق الدفاع الغذائي", en: "Food Defense Team Leader" },
    who: { ar: "مدير الجودة / قائد فريق سلامة الغذاء", en: "Quality Manager / FSMS Team Leader" },
    resp: {
      ar: "اعتماد الخطة، إدارة تقييم التهديدات، التحقق السنوي، التواصل مع الجهات الرقابية عند وقوع حادث.",
      en: "Owns the plan, runs the threat assessment, annual verification, liaises with authorities during an incident.",
    },
  },
  {
    role: { ar: "نائب القائد", en: "Deputy Team Leader" },
    who: { ar: "مسؤول ضمان الجودة", en: "QA Officer" },
    resp: {
      ar: "متابعة الإجراءات التصحيحية، تحديث السجل، حفظ الأدلة والسجلات.",
      en: "Follows up corrective actions, maintains the register, keeps evidence & records.",
    },
  },
  {
    role: { ar: "مسؤول الأمن", en: "Security Officer" },
    who: { ar: "مشرف الأمن / شركة الحراسة المتعاقدة", en: "Security Supervisor / contracted guarding company" },
    resp: {
      ar: "ضبط الدخول، سجلات الزوار، مراقبة كاميرات CCTV، جولات التفتيش الأمني، إبلاغ الاختراقات فوراً.",
      en: "Access control, visitor logs, CCTV monitoring, security patrols, immediate breach reporting.",
    },
  },
  {
    role: { ar: "ممثل الموارد البشرية", en: "HR Representative" },
    who: { ar: "مدير الموارد البشرية", en: "HR Manager" },
    resp: {
      ar: "فحص خلفية الموظفين قبل التعيين، إدارة بطاقات الهوية، سحب الصلاحيات فوراً عند إنهاء الخدمة، رصد مؤشرات عدم الرضا.",
      en: "Pre-employment background screening, ID badge control, immediate access revocation on termination, monitoring signs of disaffection.",
    },
  },
  {
    role: { ar: "ممثل الإنتاج", en: "Production Representative" },
    who: { ar: "مدير الإنتاج", en: "Production Manager" },
    resp: {
      ar: "الإشراف على المناطق المقيدة أثناء التشغيل، منع تواجد الأفراد بمفردهم في المراحل الحرجة.",
      en: "Supervises restricted zones during operation, prevents lone working at critical steps.",
    },
  },
  {
    role: { ar: "ممثل الصيانة والهندسة", en: "Maintenance & Engineering" },
    who: { ar: "مدير الصيانة", en: "Maintenance Manager" },
    resp: {
      ar: "سلامة الأقفال والأبواب والأسوار والإضاءة، تأمين غرف المرافق، مرافقة المتعاقدين الفنيين.",
      en: "Integrity of locks, doors, fencing & lighting, securing utility rooms, escorting technical contractors.",
    },
  },
  {
    role: { ar: "مدير تقنية المعلومات", en: "IT Manager" },
    who: { ar: "مسؤول تقنية المعلومات", en: "IT Officer" },
    resp: {
      ar: "حماية أنظمة التتبع والسجلات الإلكترونية، MFA، النسخ الاحتياطي، سجل التعديلات (Audit Trail).",
      en: "Protects traceability systems & e-records, MFA, backups, system Audit Trail.",
    },
  },
  {
    role: { ar: "مدير المشتريات", en: "Procurement Manager" },
    who: { ar: "مسؤول المشتريات", en: "Procurement Officer" },
    resp: {
      ar: "تقييم ضعف الموردين (VACCP)، شراء من مصادر معتمدة فقط، التحقق من الشهادات وسلامة الأختام.",
      en: "Supplier vulnerability assessment (VACCP), approved sources only, verification of certificates & seal integrity.",
    },
  },
  {
    role: { ar: "مدير النقل واللوجستيات", en: "Logistics & Transport Manager" },
    who: { ar: "مشرف الأسطول", en: "Fleet Supervisor" },
    resp: {
      ar: "أختام الشاحنات، تتبع GPS، منع التوقف غير المخطط، فحص المركبات قبل التحميل.",
      en: "Truck seals, GPS tracking, no unplanned stops, pre-loading vehicle checks.",
    },
  },
];

/* ─────────────────────────────────────────────────────────────
   5) Site security control checklist (documented programme)
   ───────────────────────────────────────────────────────────── */
export const SECURITY_CONTROLS = [
  {
    zone: { ar: "الأمن الخارجي (المحيط)", en: "Outer security (perimeter)" },
    controls: {
      ar: [
        "سور محيطي كامل بارتفاع لا يقل عن 2.4 م وبوابة واحدة رئيسية للدخول والخروج.",
        "حارس أمن 24/7 على البوابة مع سجل دخول/خروج لكل مركبة وشخص.",
        "إضاءة خارجية كافية ليلاً على كل نقاط الدخول وأرصفة التحميل والاستلام.",
        "كاميرات CCTV تغطي البوابة، الأسوار، رصيف الاستلام، رصيف التحميل، ومنطقة النفايات — تسجيل محفوظ 30 يوماً على الأقل.",
        "إغلاق كل الأبواب الجانبية والطوارئ من الخارج مع إمكانية الفتح من الداخل (Panic bars) وتنبيه صوتي عند الفتح.",
      ],
      en: [
        "Complete perimeter fence ≥ 2.4 m with a single controlled main gate for entry and exit.",
        "24/7 gate guard with an in/out log for every vehicle and person.",
        "Adequate external night lighting at all entry points, loading and receiving docks.",
        "CCTV covering gate, fence line, receiving dock, loading bay and waste area — footage retained ≥ 30 days.",
        "All side and emergency doors locked from outside, openable from inside (panic bars), with audible alarm on opening.",
      ],
    },
    resp: { ar: "مسؤول الأمن + الصيانة", en: "Security Officer + Maintenance" },
    freq: { ar: "يومي / جولة أسبوعية موثقة", en: "Daily / documented weekly patrol" },
  },
  {
    zone: { ar: "الأمن الداخلي (المناطق المقيدة)", en: "Inner security (restricted zones)" },
    controls: {
      ar: [
        "تحديد المناطق المقيدة بلافتات: التقطيع، التعبئة والوسم، مخزن الكيماويات، خزان المياه ومكينة الثلج، غرفة الخوادم.",
        "الدخول للمناطق المقيدة ببطاقة/رمز شخصي فقط، والصلاحيات محددة حسب الوظيفة ومراجعة كل 6 أشهر.",
        "منع العمل الفردي (Lone working) في مراحل التعبئة والوسم — لا يقل عن شخصين أو تغطية كاميرا مباشرة.",
        "خزائن الموظفين خارج مناطق الإنتاج، ويمنع إدخال الحقائب والأدوية الشخصية والمواد الغريبة.",
        "مخزن الكيماويات مقفل دائماً بمفتاح لدى شخصين معينين فقط مع سجل صرف موقّع.",
      ],
      en: [
        "Restricted zones signposted: cutting, packaging & labelling, chemical store, water tank & ice machine, server room.",
        "Restricted-zone entry by personal badge/code only; rights are role-based and reviewed every 6 months.",
        "No lone working at packing & labelling steps — minimum two persons or live camera coverage.",
        "Staff lockers outside production; personal bags, medication and foreign materials are not permitted inside.",
        "Chemical store permanently locked, keys held by two named persons only, with a signed issue log.",
      ],
    },
    resp: { ar: "مدير الإنتاج + ضمان الجودة", en: "Production Manager + QA" },
    freq: { ar: "مستمر / تحقق شهري", en: "Continuous / monthly verification" },
  },
  {
    zone: { ar: "أمن العاملين", en: "Personnel security" },
    controls: {
      ar: [
        "فحص خلفية وتحقق من الهوية والمرجعيات لكل موظف جديد قبل الالتحاق (وفق قانون العمل الإماراتي).",
        "بطاقة تعريف مصورة بألوان مختلفة: موظف دائم / مؤقت / متعاقد / زائر.",
        "سحب البطاقة والصلاحيات الإلكترونية في نفس يوم إنهاء الخدمة وتوثيق ذلك في نموذج إخلاء الطرف.",
        "تدريب سنوي على الدفاع الغذائي لكل العاملين + تدريب تعريفي للموظف الجديد قبل دخول الإنتاج.",
        "خط إبلاغ سري (Whistleblower) عن أي سلوك مريب مع ضمان عدم الانتقام.",
      ],
      en: [
        "Background, identity and reference checks for every new hire before joining (per UAE labour law).",
        "Photo ID badge colour-coded: permanent / temporary / contractor / visitor.",
        "Badge and system access revoked on the same day as termination and recorded on the clearance form.",
        "Annual food defense training for all staff + induction training before a new employee enters production.",
        "Confidential whistleblower line for suspicious behaviour with a no-retaliation guarantee.",
      ],
    },
    resp: { ar: "الموارد البشرية + قائد الفريق", en: "HR + Team Leader" },
    freq: { ar: "عند التعيين / سنوي", en: "On hiring / annually" },
  },
  {
    zone: { ar: "أمن الزوار والمتعاقدين", en: "Visitor & contractor security" },
    controls: {
      ar: [
        "لا يُسمح بأي زائر دون موعد مسبق واعتماد من مدير القسم.",
        "تسجيل الزائر (الاسم، الجهة، الهوية، وقت الدخول والخروج، الشخص المضيف) في سجل الزوار.",
        "مرافقة الزائر أو المتعاقد طوال الوقت داخل مناطق الإنتاج دون استثناء.",
        "منع التصوير داخل مناطق الإنتاج إلا بإذن كتابي من الإدارة.",
        "فحص عدة المتعاقدين وأدواته عند الدخول والخروج وتسجيل ما يُدخل من مواد كيميائية أو قطع غيار.",
      ],
      en: [
        "No visitor admitted without a prior appointment approved by the department manager.",
        "Visitor log records name, company, ID, in/out time and host.",
        "Visitors and contractors escorted at all times inside production areas — no exceptions.",
        "Photography inside production prohibited without written management approval.",
        "Contractor tool kits checked in and out; any chemicals or spare parts brought in are logged.",
      ],
    },
    resp: { ar: "الأمن + المضيف", en: "Security + host" },
    freq: { ar: "كل زيارة", en: "Every visit" },
  },
  {
    zone: { ar: "أمن العمليات والمواد", en: "Operational & material security" },
    controls: {
      ar: [
        "فحص سلامة الأختام (Seal integrity) لكل شاحنة واردة وتسجيل رقم الختم في سجل الاستلام؛ رفض أي شحنة بختم مكسور أو مفقود.",
        "استلام المواد من موردين معتمدين فقط ووفق قائمة الموردين المعتمدة الحالية.",
        "منع ترك أي مادة أو منتج بدون إشراف على رصيف الاستلام أو التحميل.",
        "التحكم في الملصقات والمواد المطبوعة: تخزين مقفل، صرف بالعدد، وإتلاف موثق للفائض والمعيب.",
        "تأمين خزان المياه ومكينة الثلج بغطاء مقفل، وفحص الكلور والاختبارات المخبرية وفق سجل فحص المياه.",
        "تختيم الشاحنات الصادرة برقم ختم مسجل في وثيقة الشحن، وتتبع GPS مع منع التوقف غير المخطط.",
      ],
      en: [
        "Seal integrity check on every inbound truck with the seal number recorded on the receiving log; reject any load with a broken or missing seal.",
        "Materials accepted only from approved suppliers on the current approved supplier list.",
        "No material or product left unattended on the receiving or loading dock.",
        "Label and printed material control: locked storage, issue by count, documented destruction of surplus and defective labels.",
        "Water tank and ice machine secured with a locked cover; chlorine and laboratory testing per the Water & Ice Testing Log.",
        "Outbound trucks sealed with the seal number recorded on the delivery document; GPS tracked with no unplanned stops.",
      ],
    },
    resp: { ar: "الاستلام + اللوجستيات + الجودة", en: "Receiving + Logistics + QA" },
    freq: { ar: "كل شحنة", en: "Every consignment" },
  },
  {
    zone: { ar: "أمن المعلومات والأنظمة", en: "Information & systems security" },
    controls: {
      ar: [
        "حسابات مسماة لكل مستخدم (لا حسابات مشتركة) وصلاحيات حسب الدور.",
        "المصادقة الثنائية (MFA) على الأنظمة الحساسة وسجلات التتبع.",
        "سجل تعديلات (Audit Trail) يوثق كل تعديل وحذف: من، متى، القيمة قبل وبعد.",
        "نسخ احتياطي يومي، ونسخة خارج الموقع، واختبار استرجاع كل 6 أشهر.",
        "غرفة الخوادم مقفلة ومقيدة الدخول لتقنية المعلومات فقط.",
      ],
      en: [
        "Named user accounts (no shared logins) with role-based permissions.",
        "Multi-factor authentication on sensitive systems and traceability records.",
        "Audit Trail recording every edit and delete: who, when, old value → new value.",
        "Daily backup plus an off-site copy, with a restore test every 6 months.",
        "Server room locked with access restricted to IT only.",
      ],
    },
    resp: { ar: "تقنية المعلومات", en: "IT" },
    freq: { ar: "مستمر / مراجعة نصف سنوية", en: "Continuous / semi-annual review" },
  },
];

/* ─────────────────────────────────────────────────────────────
   6) Incident response steps
   ───────────────────────────────────────────────────────────── */
export const RESPONSE_STEPS = [
  {
    n: 1,
    title: { ar: "الاكتشاف والإبلاغ الفوري", en: "Detection & immediate reporting" },
    body: {
      ar: "أي موظف يلاحظ سلوكاً مريباً أو عبثاً بمنتج أو ختماً مكسوراً أو دخولاً غير مصرح به يبلّغ مشرفه وقائد فريق الدفاع الغذائي فوراً (خلال 15 دقيقة) — لا يُطلب من الموظف التحقق بنفسه.",
      en: "Any employee noticing suspicious behaviour, product tampering, a broken seal or unauthorized entry reports to their supervisor and the Food Defense Team Leader immediately (within 15 minutes) — the employee is not expected to investigate.",
    },
  },
  {
    n: 2,
    title: { ar: "العزل والتأمين", en: "Isolate & secure" },
    body: {
      ar: "عزل المنتج/الدفعة المشتبه بها فوراً ووضع بطاقة «محجوز — لا يُستخدم»، تأمين الموقع وعدم المساس بالأدلة، وحفظ تسجيلات الكاميرات لتلك الفترة قبل أن تُستبدل.",
      en: "Immediately quarantine the suspect product/batch with a 'HOLD — DO NOT USE' tag, secure the scene without disturbing evidence, and preserve CCTV footage for that period before it is overwritten.",
    },
  },
  {
    n: 3,
    title: { ar: "تفعيل فريق الأزمة", en: "Activate the crisis team" },
    body: {
      ar: "قائد الفريق يفعّل فريق الأزمة (الإدارة العليا، الجودة، الأمن، الموارد البشرية، اللوجستيات، القانوني) ويبدأ سجل زمني موثق لكل قرار.",
      en: "The Team Leader activates the crisis team (top management, QA, security, HR, logistics, legal) and opens a documented timeline log of every decision.",
    },
  },
  {
    n: 4,
    title: { ar: "التقييم وتحديد المدى", en: "Assess & determine scope" },
    body: {
      ar: "تتبع أمامي وخلفي كامل لتحديد الدفعات المتأثرة والعملاء المستلمين، مع تقدير الخطر على الصحة العامة بالتشاور مع مختبر معتمد عند الحاجة.",
      en: "Full forward and backward trace to identify affected batches and receiving customers, with a public-health risk assessment supported by an accredited laboratory when needed.",
    },
  },
  {
    n: 5,
    title: { ar: "الإبلاغ الرسمي", en: "Official notification" },
    body: {
      ar: "إبلاغ بلدية دبي / الجهة الرقابية المختصة والشرطة خلال المدة النظامية عند تأكيد التلوث المتعمد، وعدم الإدلاء بأي تصريح إعلامي إلا عبر المتحدث المعتمد.",
      en: "Notify Dubai Municipality / the competent authority and the police within the statutory period once intentional contamination is confirmed; no media statement except through the designated spokesperson.",
    },
  },
  {
    n: 6,
    title: { ar: "السحب أو الاستدعاء", en: "Withdrawal or recall" },
    body: {
      ar: "تفعيل إجراء السحب الفعلي (Real Product Recall) وتصنيف الحالة Class I عند وجود خطر صحي جسيم، مع الاستفادة من نتائج آخر تجربة تتبع (Mock Recall).",
      en: "Trigger the Real Product Recall procedure and classify as Class I where a serious health risk exists, using the results of the latest Mock Recall drill.",
    },
  },
  {
    n: 7,
    title: { ar: "التحقيق في السبب الجذري", en: "Root cause investigation" },
    body: {
      ar: "تحقيق كامل (5 Whys) لتحديد كيف تم اختراق الدفاعات، وفتح إجراء تصحيحي (CAPA) بمهلة زمنية ومسؤول محدد.",
      en: "Full 5-Whys investigation of how the defences were breached, and a CAPA raised with a named owner and due date.",
    },
  },
  {
    n: 8,
    title: { ar: "المراجعة وتحديث الخطة", en: "Review & update the plan" },
    body: {
      ar: "مراجعة تقييم التهديدات بالكامل خلال 30 يوماً من الحادث، تحديث الضوابط، إعادة التدريب، ورفع النتائج لاجتماع مراجعة الإدارة.",
      en: "Re-run the full threat assessment within 30 days of the incident, update controls, re-train, and report the outcome to the Management Review Meeting.",
    },
  },
];

/* ─────────────────────────────────────────────────────────────
   7) Seed vulnerability assessment (TACCP / VACCP)
   likelihood & severity on 1–5; score = L × S
   ───────────────────────────────────────────────────────────── */
export const SEED_THREATS = [
  {
    id: "fd-1", area: "cutting", category: "insider",
    threat: { ar: "موظف ساخط يضيف مادة كيميائية أو أجساماً غريبة إلى اللحم أثناء التقطيع", en: "Disgruntled employee adds a chemical or foreign objects to meat during cutting" },
    actor: { ar: "موظف إنتاج داخلي", en: "Internal production employee" },
    likelihood: 2, severity: 5,
    existing: { ar: "كاميرات CCTV على خطوط التقطيع، إشراف مباشر، منع إدخال الأدوية والمواد الشخصية، مخزن كيماويات مقفل", en: "CCTV on cutting lines, direct supervision, no personal medication/materials allowed inside, locked chemical store" },
    action: { ar: "منع العمل الفردي في الورديات المسائية، مراجعة تسجيلات الكاميرات أسبوعياً، تفعيل خط الإبلاغ السري", en: "Ban lone working on evening shifts, weekly CCTV review, activate the confidential reporting line" },
    owner: "Production Manager + Security", status: "inprogress",
  },
  {
    id: "fd-2", area: "supplier", category: "ema",
    threat: { ar: "استبدال نوع اللحم من المورد (لحم أرخص أو غير حلال) لتحقيق ربح", en: "Species substitution by supplier (cheaper or non-halal meat) for profit" },
    actor: { ar: "مورد أو وسيط", en: "Supplier or broker" },
    likelihood: 3, severity: 5,
    existing: { ar: "شراء من مسالخ معتمدة فقط، شهادة حلال وCOA لكل شحنة، تدقيق موردين كل 6 أشهر", en: "Purchase from approved abattoirs only, halal certificate + COA per consignment, supplier audit every 6 months" },
    action: { ar: "فحص DNA عشوائي سنوي لعينتين على الأقل، والتحقق من صحة الشهادات مباشرة مع الجهة المصدرة", en: "Annual random DNA testing on at least two samples, and certificate verification directly with the issuing body" },
    owner: "QA Manager + Procurement", status: "inprogress",
  },
  {
    id: "fd-3", area: "transport", category: "supplychain",
    threat: { ar: "العبث بالشحنة أثناء النقل خلال توقف غير مخطط للسائق", en: "Load tampering in transit during an unplanned driver stop" },
    actor: { ar: "سائق أو طرف خارجي", en: "Driver or external party" },
    likelihood: 3, severity: 4,
    existing: { ar: "تختيم الشاحنات برقم ختم مسجل، تتبع GPS، فحص الختم عند التسليم", en: "Numbered truck seals recorded, GPS tracking, seal check at delivery" },
    action: { ar: "تنبيه آلي عند التوقف أكثر من 15 دقيقة خارج المسار، وتدريب السائقين على بروتوكول التوقف", en: "Automatic alert on stops >15 min off-route, driver training on the stop protocol" },
    owner: "Logistics Manager", status: "open",
  },
  {
    id: "fd-4", area: "receiving", category: "supplychain",
    threat: { ar: "قبول شحنة بختم مكسور أو مفقود دون تحقيق", en: "Accepting a consignment with a broken or missing seal without investigation" },
    actor: { ar: "خطأ/تهاون داخلي", en: "Internal lapse" },
    likelihood: 2, severity: 4,
    existing: { ar: "سجل الاستلام يتضمن رقم الختم إلزامياً، تعليمات رفض الشحنة عند كسر الختم", en: "Receiving log mandates the seal number; instruction to reject on broken seal" },
    action: { ar: "تدريب موظفي الاستلام سنوياً + تدقيق داخلي ربع سنوي على سجلات الأختام", en: "Annual receiving-staff training + quarterly internal audit of seal records" },
    owner: "Receiving Supervisor + QA", status: "controlled",
  },
  {
    id: "fd-5", area: "water", category: "utilities",
    threat: { ar: "إضافة مادة سامة إلى خزان المياه أو مكينة الثلج", en: "Toxic substance added to the water tank or ice machine" },
    actor: { ar: "متسلل أو موظف", en: "Intruder or employee" },
    likelihood: 2, severity: 5,
    existing: { ar: "غطاء خزان مقفل، غرفة المضخات مقيدة الدخول، فحص كلور يومي وتحاليل مخبرية دورية", en: "Locked tank cover, restricted pump room, daily chlorine check and periodic laboratory analysis" },
    action: { ar: "تركيب قفل بختم قابل للكسر (Tamper-evident) + كاميرا على منطقة الخزان", en: "Fit a tamper-evident seal lock + a camera covering the tank area" },
    owner: "Maintenance Manager", status: "inprogress",
  },
  {
    id: "fd-6", area: "chemicals", category: "insider",
    threat: { ar: "سرقة مواد كيميائية للتنظيف أو التعقيم واستخدامها للتلويث المتعمد", en: "Theft of cleaning or sanitizing chemicals for deliberate contamination" },
    actor: { ar: "موظف أو متعاقد نظافة", en: "Employee or cleaning contractor" },
    likelihood: 2, severity: 5,
    existing: { ar: "مخزن مقفل، سجل صرف موقّع، مفاتيح لدى شخصين معينين", en: "Locked store, signed issue log, keys with two named persons" },
    action: { ar: "جرد شهري موثق للكميات ومطابقتها مع سجل الصرف", en: "Documented monthly stock count reconciled against the issue log" },
    owner: "QA Officer", status: "controlled",
  },
  {
    id: "fd-7", area: "packaging", category: "ema",
    threat: { ar: "تغيير تاريخ الإنتاج أو الصلاحية على المنتج لإخفاء منتج قديم", en: "Altering production or expiry dates to disguise old product" },
    actor: { ar: "موظف أو مشرف تحت ضغط الأهداف", en: "Employee or supervisor under target pressure" },
    likelihood: 2, severity: 5,
    existing: { ar: "تحكم في الملصقات وصرف بالعدد، سجل طباعة، مراجعة الجودة قبل الشحن", en: "Label control with issue-by-count, print log, QA check before dispatch" },
    action: { ar: "مطابقة عدد الملصقات المصروفة مع عدد الوحدات المنتجة يومياً، وإتلاف الفائض بشهادة موقعة", en: "Daily reconciliation of labels issued vs. units produced, surplus destroyed with a signed certificate" },
    owner: "Packaging Supervisor + QA", status: "inprogress",
  },
  {
    id: "fd-8", area: "it", category: "cyber",
    threat: { ar: "هجوم فدية (Ransomware) يشفّر سجلات التتبع وسجلات CCP", en: "Ransomware attack encrypting traceability and CCP records" },
    actor: { ar: "مهاجم سيبراني خارجي", en: "External cyber attacker" },
    likelihood: 3, severity: 5,
    existing: { ar: "نسخ احتياطي يومي، MFA، حسابات مسماة، سجل تعديلات (Audit Trail)", en: "Daily backup, MFA, named accounts, Audit Trail" },
    action: { ar: "نسخة احتياطية خارج الشبكة (offline) واختبار استرجاع كل 6 أشهر + تدريب التصيّد الاحتيالي", en: "Offline backup copy plus a restore test every 6 months + phishing awareness training" },
    owner: "IT Manager", status: "inprogress",
  },
  {
    id: "fd-9", area: "it", category: "insider",
    threat: { ar: "تعديل أو حذف سجلات المراقبة لإخفاء انحراف في CCP", en: "Editing or deleting monitoring records to hide a CCP deviation" },
    actor: { ar: "مستخدم داخلي بصلاحيات", en: "Privileged internal user" },
    likelihood: 3, severity: 4,
    existing: { ar: "سجل تعديلات كامل (من/متى/القيمة قبل وبعد)، صلاحيات حسب الدور، لا حسابات مشتركة", en: "Full Audit Trail (who/when/before→after), role-based permissions, no shared accounts" },
    action: { ar: "مراجعة شهرية لسجل التعديلات من قبل مدير الجودة وتوثيق المراجعة", en: "Monthly Audit Trail review by the Quality Manager, documented" },
    owner: "QA Manager + IT", status: "controlled",
  },
  {
    id: "fd-10", area: "perimeter", category: "intrusion",
    threat: { ar: "دخول غير مصرح به من بوابة أو باب جانبي خارج ساعات العمل", en: "Unauthorized entry through a gate or side door outside working hours" },
    actor: { ar: "طرف خارجي", en: "External party" },
    likelihood: 3, severity: 4,
    existing: { ar: "حارس 24/7، سجل دخول، كاميرات على البوابة والأسوار، إضاءة ليلية", en: "24/7 guard, entry log, CCTV on gate and fence line, night lighting" },
    action: { ar: "إنذار صوتي على أبواب الطوارئ + جولة أمنية موثقة كل 4 ساعات ليلاً", en: "Audible alarms on emergency doors + documented security patrol every 4 hours at night" },
    owner: "Security Officer", status: "inprogress",
  },
  {
    id: "fd-11", area: "staff", category: "insider",
    threat: { ar: "توظيف شخص بهوية أو مؤهلات مزوّرة في موقع حساس", en: "Hiring a person with forged identity or credentials into a sensitive role" },
    actor: { ar: "متقدم للوظيفة", en: "Job applicant" },
    likelihood: 2, severity: 4,
    existing: { ar: "التحقق من الهوية والإقامة، طلب مرجعيات، فحص طبي قبل التعيين", en: "Identity and residency verification, references requested, pre-employment medical" },
    action: { ar: "التحقق من المرجعيات كتابياً لكل وظيفة حساسة (جودة، أمن، تقنية معلومات، صيانة)", en: "Written reference verification for every sensitive role (QA, security, IT, maintenance)" },
    owner: "HR Manager", status: "open",
  },
  {
    id: "fd-12", area: "admin", category: "intrusion",
    threat: { ar: "زائر أو متعاقد غير مرافَق يصل إلى منطقة إنتاج مقيدة", en: "Unescorted visitor or contractor reaching a restricted production area" },
    actor: { ar: "زائر / متعاقد", en: "Visitor / contractor" },
    likelihood: 3, severity: 4,
    existing: { ar: "سجل زوار، بطاقة زائر ملونة، سياسة المرافقة الدائمة", en: "Visitor log, colour-coded visitor badge, permanent escort policy" },
    action: { ar: "تدريب موظفي الاستقبال والأمن على رفض الدخول بدون موعد معتمد، وتدقيق سجل الزوار شهرياً", en: "Train reception and security to refuse entry without an approved appointment; monthly visitor-log audit" },
    owner: "Security Officer + HR", status: "inprogress",
  },
  {
    id: "fd-13", area: "finished", category: "ideological",
    threat: { ar: "حقن مادة ضارة في عبوات المنتج النهائي بغرض إحداث أذى جماعي", en: "Injection of a harmful substance into finished product packs to cause mass harm" },
    actor: { ar: "متطرف / إرهاب غذائي", en: "Extremist / food terrorism" },
    likelihood: 1, severity: 5,
    existing: { ar: "مخزن منتج نهائي مقيد الدخول، عبوات محكمة بدليل عبث (Tamper-evident)، كاميرات", en: "Restricted finished-goods store, tamper-evident packaging, CCTV" },
    action: { ar: "التحقق من فعالية دليل العبث على العبوة سنوياً وتوثيق الاختبار", en: "Annually verify and document the effectiveness of the tamper-evident feature" },
    owner: "QA Manager", status: "controlled",
  },
  {
    id: "fd-14", area: "pos", category: "intrusion",
    threat: { ar: "عبث بالمنتج المعروض في ثلاجات منافذ البيع من قبل عميل", en: "Tampering with displayed product in POS chillers by a customer" },
    actor: { ar: "عميل / زائر للمنفذ", en: "Customer / outlet visitor" },
    likelihood: 3, severity: 3,
    existing: { ar: "عبوات مغلقة، وجود موظف دائم في صالة العرض، كاميرات داخل المنفذ", en: "Sealed packs, permanent staff presence on the shop floor, in-store CCTV" },
    action: { ar: "تعليمات فحص بصري للمعروض عند بداية ونهاية كل وردية وتسجيلها", en: "Visual check of displayed stock at the start and end of every shift, recorded" },
    owner: "Outlet Supervisors", status: "open",
  },
  {
    id: "fd-15", area: "trucks", category: "intrusion",
    threat: { ar: "دخول غير مصرح به لعربة الطعام المتنقلة أثناء توقفها ليلاً", en: "Unauthorized access to a mobile food truck while parked overnight" },
    actor: { ar: "طرف خارجي", en: "External party" },
    likelihood: 3, severity: 3,
    existing: { ar: "إغلاق العربة وتأمينها في موقف مخصص، تفريغ المواد سريعة التلف يومياً", en: "Truck locked and parked in a designated yard, perishables offloaded daily" },
    action: { ar: "قفل بختم يومي + فحص موثق قبل بدء التشغيل صباحاً", en: "Daily tamper-evident lock + documented pre-operation check each morning" },
    owner: "Food Truck Supervisor", status: "open",
  },
  {
    id: "fd-16", area: "waste", category: "counterfeit",
    threat: { ar: "استرجاع منتجات أو ملصقات من النفايات وإعادة استخدامها أو بيعها", en: "Recovering product or labels from waste for reuse or resale" },
    actor: { ar: "متعاقد نفايات / طرف خارجي", en: "Waste contractor / external party" },
    likelihood: 2, severity: 4,
    existing: { ar: "حاويات نفايات مقفلة، إتلاف المنتج المرفوض بحضور الجودة، شهادة إتلاف", en: "Locked waste bins, rejected product destroyed in QA presence, destruction certificate" },
    action: { ar: "تشويه الملصقات والعبوات قبل التخلص منها + توثيق بالصور", en: "Deface labels and packaging before disposal + photographic documentation" },
    owner: "QA Officer + Housekeeping", status: "controlled",
  },
  {
    id: "fd-17", area: "coldstore", category: "insider",
    threat: { ar: "إيقاف أو تغيير إعداد التبريد عمداً لإتلاف المخزون", en: "Deliberately switching off or altering refrigeration settings to spoil stock" },
    actor: { ar: "موظف ساخط", en: "Disgruntled employee" },
    likelihood: 2, severity: 4,
    existing: { ar: "لوحات تحكم مقفلة، إنذارات حرارة، مراقبة مستمرة وسجلات درجات الحرارة", en: "Locked control panels, temperature alarms, continuous monitoring and temperature logs" },
    action: { ar: "تقييد صلاحية تغيير الإعدادات بكلمة مرور للصيانة فقط وتسجيل كل تغيير", en: "Restrict setpoint changes to a maintenance password and log every change" },
    owner: "Maintenance Manager", status: "inprogress",
  },
  {
    id: "fd-18", area: "utilities", category: "utilities",
    threat: { ar: "تخريب المولد أو لوحة الكهرباء الرئيسية لتعطيل سلسلة التبريد", en: "Sabotage of the generator or main electrical panel to break the cold chain" },
    actor: { ar: "طرف خارجي أو داخلي", en: "External or internal party" },
    likelihood: 2, severity: 4,
    existing: { ar: "غرف مرافق مقفلة، مولد احتياطي، إنذارات انقطاع التيار، خطة الطوارئ", en: "Locked utility rooms, standby generator, power-failure alarms, emergency plan" },
    action: { ar: "إدراج السيناريو ضمن تجارب الطوارئ السنوية وتوثيق زمن الاستجابة", en: "Include the scenario in the annual emergency drill and record response time" },
    owner: "Maintenance + QA", status: "controlled",
  },
  {
    id: "fd-19", area: "supplier", category: "ema",
    threat: { ar: "تخفيف المنتج بإضافة مياه أو بروتين نباتي أو مواد حافظة غير معلنة", en: "Dilution with water, vegetable protein or undeclared preservatives" },
    actor: { ar: "مورد", en: "Supplier" },
    likelihood: 2, severity: 4,
    existing: { ar: "مواصفات شراء موثقة، تحاليل دورية، فحص استلام حسي ووزني", en: "Documented purchase specifications, periodic analysis, sensory and weight checks at receiving" },
    action: { ar: "إدراج اختبار مختبر خارجي سنوي للمكونات عالية الخطورة ضمن خطة التحقق", en: "Add an annual third-party laboratory test for high-risk ingredients to the verification plan" },
    owner: "QA Manager", status: "open",
  },
  {
    id: "fd-20", area: "admin", category: "extortion",
    threat: { ar: "تهديد بالابتزاز بادعاء تلويث منتج مقابل مبلغ مالي", en: "Extortion threat claiming product contamination in exchange for money" },
    actor: { ar: "طرف خارجي", en: "External party" },
    likelihood: 1, severity: 4,
    existing: { ar: "خطة الاستجابة للأزمات، متحدث إعلامي معتمد، تنسيق مع الشرطة", en: "Crisis response plan, designated spokesperson, police coordination" },
    action: { ar: "تحديد نقطة اتصال واحدة لاستقبال التهديدات وتوثيق نص التهديد فوراً", en: "Designate a single contact point for receiving threats and record the wording immediately" },
    owner: "General Manager + QA", status: "inprogress",
  },
  {
    id: "fd-21", area: "it", category: "espionage",
    threat: { ar: "تسريب مواصفات المنتج أو قوائم العملاء إلى منافس", en: "Leak of product specifications or customer lists to a competitor" },
    actor: { ar: "موظف / متعاقد", en: "Employee / contractor" },
    likelihood: 2, severity: 3,
    existing: { ar: "اتفاقيات سرية، صلاحيات حسب الدور، منع التصوير في الإنتاج", en: "Confidentiality agreements, role-based permissions, no photography in production" },
    action: { ar: "تقييد تصدير البيانات وتسجيل عمليات التصدير في سجل التعديلات", en: "Restrict data export and log export actions in the Audit Trail" },
    owner: "IT Manager + HR", status: "open",
  },
  {
    id: "fd-22", area: "loading", category: "supplychain",
    threat: { ar: "تحميل منتج على مركبة غير معتمدة أو تسليم لجهة غير مصرح لها", en: "Loading product onto an unapproved vehicle or releasing to an unauthorized party" },
    actor: { ar: "طرف خارجي منتحل", en: "Impersonating external party" },
    likelihood: 2, severity: 4,
    existing: { ar: "قائمة مركبات وسائقين معتمدة، التحقق من هوية السائق، مستند شحن موقّع", en: "Approved vehicle and driver list, driver identity verification, signed delivery document" },
    action: { ar: "التحقق من رقم المركبة مقابل أمر التحميل قبل الفتح، ورفض أي تغيير غير مسبق الإخطار", en: "Verify plate number against the loading order before opening; reject any un-notified change" },
    owner: "Logistics Supervisor", status: "inprogress",
  },
  {
    id: "fd-23", area: "kitchen", category: "insider",
    threat: { ar: "إضافة مادة غريبة إلى الوجبات الجاهزة في المطبخ المركزي", en: "Foreign substance added to ready meals in the central kitchen" },
    actor: { ar: "موظف مطبخ", en: "Kitchen employee" },
    likelihood: 2, severity: 5,
    existing: { ar: "إشراف الشيف، كاميرات المطبخ، منع الأمتعة الشخصية، تخزين التوابل مقفل", en: "Chef supervision, kitchen CCTV, no personal belongings, locked spice storage" },
    action: { ar: "فحص عشوائي للوجبات قبل الإرسال وتوثيق العينة المحتفظ بها (Retention sample)", en: "Random pre-dispatch meal check with a documented retention sample" },
    owner: "Head Chef + QA", status: "inprogress",
  },
  {
    id: "fd-24", area: "packaging", category: "counterfeit",
    threat: { ar: "طباعة ملصقات تحمل العلامة التجارية خارج الشركة واستخدامها على منتج مجهول", en: "Off-site printing of branded labels used on unknown product" },
    actor: { ar: "طرف خارجي / مطبعة", en: "External party / printer" },
    likelihood: 2, severity: 4,
    existing: { ar: "مطبعة واحدة معتمدة بعقد سرية، استلام بالعدد، تخزين مقفل", en: "Single approved printer under a confidentiality contract, receipt by count, locked storage" },
    action: { ar: "إضافة عنصر أمني على الملصق (رمز QR فريد لكل دفعة) ومراقبة السوق دورياً", en: "Add a security feature to the label (unique per-batch QR) and monitor the market periodically" },
    owner: "QA Manager + Marketing", status: "open",
  },
];

/* Convenience lookups */
export const areaLabel = (v, lang) => FD_AREAS.find((a) => a.v === v)?.[lang] || v || "";
export const categoryLabel = (v, lang) => THREAT_CATEGORIES.find((c) => c.v === v)?.[lang] || v || "";
export const categoryIcon = (v) => THREAT_CATEGORIES.find((c) => c.v === v)?.icon || "•";
export const statusMeta = (v) => FD_STATUS.find((s) => s.v === v) || FD_STATUS[0];
