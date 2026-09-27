// src/pages/readiness/readinessQuestions.js
// The public inspection-readiness check (/readiness): ten questions, 10 points
// each, so the total is a score out of 100. Shared by the page itself and by
// Platform Center → Demo Requests, which reads a lead's saved answers
// ({ questionId: optionIndex }) back through this same list — so never
// reorder or delete options of a live question; add a new id instead.
//
// `fix` says how the app closes that gap. Keep it to features that exist.

export const READINESS_QUESTIONS = [
  {
    id: "temp",
    area: { en: "Temperature records", ar: "سجلات الحرارة" },
    q: {
      en: "How do your branches record chiller, freezer and cooking temperatures?",
      ar: "كيف تسجّل فروعك درجات حرارة الثلاجات والمجمِّدات والطهي؟",
    },
    options: [
      { en: "On a digital system that flags out-of-range readings", ar: "على نظام إلكتروني ينبّه عند خروج القراءة عن الحدود المسموحة", pts: 10 },
      { en: "In Excel, or photos sent on WhatsApp", ar: "في ملفات Excel، أو بصور تُرسل عبر واتساب", pts: 5 },
      { en: "On paper forms", ar: "على نماذج ورقية", pts: 3 },
      { en: "Not recorded every day", ar: "لا نسجّلها يوميًا", pts: 0 },
    ],
    fix: {
      en: "Cooler and temperature logs are filled on a phone or tablet, each unit has its own min / max limits, and head office reads them the same day.",
      ar: "تُعبّأ سجلات الثلاجات ودرجات الحرارة من الجوال أو الجهاز اللوحي، ولكل وحدة تبريد حدّ أدنى وأعلى، وتطّلع عليها الإدارة في اليوم نفسه.",
    },
  },
  {
    id: "retrieve",
    area: { en: "Records on demand", ar: "تقديم السجلات عند التفتيش" },
    q: {
      en: "An inspector asks for the last 3 months of records for one branch. How long until you hand them over?",
      ar: "طلب المفتش سجلات آخر 3 أشهر لأحد الفروع. كم تحتاج من الوقت لتسليمها إليه؟",
    },
    options: [
      { en: "A few minutes", ar: "بضع دقائق", pts: 10 },
      { en: "Within an hour", ar: "خلال ساعة", pts: 6 },
      { en: "A day or more", ar: "يومًا أو أكثر", pts: 2 },
      { en: "We might not find all of them", ar: "قد لا نعثر عليها كلها", pts: 0 },
    ],
    fix: {
      en: "Every record is searchable by branch and date, and opens as a ready PDF or Excel file in one click.",
      ar: "يمكن البحث عن أي سجل بالفرع والتاريخ، واستخراجه ملفَّ PDF أو Excel جاهزًا بنقرة واحدة.",
    },
  },
  {
    id: "trace",
    area: { en: "Traceability", ar: "التتبّع" },
    q: {
      en: "A customer complains about a product. Can you trace it back to its supplier, batch and receiving date?",
      ar: "تقدّم عميل بشكوى على منتج. هل يمكنك تتبّعه إلى المورّد ورقم الدفعة وتاريخ الاستلام؟",
    },
    options: [
      { en: "Yes, in minutes", ar: "نعم، خلال دقائق", pts: 10 },
      { en: "Yes, but it takes hours of going through paper", ar: "نعم، لكن ذلك يستغرق ساعات من البحث في الأوراق", pts: 5 },
      { en: "Only partly", ar: "جزئيًا فقط", pts: 2 },
      { en: "No", ar: "لا", pts: 0 },
    ],
    fix: {
      en: "Item codes link shipment, receiving and traceability records, so one search shows a product's path from supplier to branch.",
      ar: "يربط رمز الصنف بين سجلات الشحن والاستلام والتتبّع، فيُظهر بحثٌ واحد مسار المنتج من المورّد إلى الفرع.",
    },
  },
  {
    id: "ncr",
    area: { en: "Corrective actions", ar: "الإجراءات التصحيحية" },
    q: {
      en: "When something goes wrong, how is it followed up?",
      ar: "عند وقوع خطأ أو مخالفة، كيف تتم متابعتها؟",
    },
    options: [
      { en: "Logged with an owner and a deadline, and tracked until closed", ar: "تُسجَّل مع تحديد مسؤول وموعد نهائي، وتُتابَع حتى إغلاقها", pts: 10 },
      { en: "Logged, but rarely followed up", ar: "تُسجَّل، لكن نادرًا ما تُتابَع", pts: 5 },
      { en: "Handled by phone or word of mouth", ar: "بالهاتف أو شفهيًا", pts: 2 },
      { en: "Not recorded", ar: "لا تُسجَّل", pts: 0 },
    ],
    fix: {
      en: "Non-conformance and corrective-action (NCR / CAPA) reports carry their own reference number and stay open until someone closes them.",
      ar: "لكل تقرير عدم مطابقة وإجراء تصحيحي (NCR / CAPA) رقم مرجعي خاص، ويبقى مفتوحًا حتى يُغلق رسميًا.",
    },
  },
  {
    id: "supplier",
    area: { en: "Supplier approval", ar: "اعتماد الموردين" },
    q: {
      en: "How do you approve suppliers and keep their certificates current?",
      ar: "كيف تعتمد الموردين وتتابع صلاحية شهاداتهم؟",
    },
    options: [
      { en: "Documented evaluation, and certificate expiry dates are tracked", ar: "تقييم موثّق، مع متابعة تواريخ انتهاء الشهادات", pts: 10 },
      { en: "We keep files, but don't track expiry", ar: "لدينا ملفات، لكننا لا نتابع تواريخ الانتهاء", pts: 5 },
      { en: "Informally, by experience", ar: "بصورة غير رسمية، بحسب الخبرة", pts: 2 },
      { en: "No approval process", ar: "لا توجد آلية اعتماد", pts: 0 },
    ],
    fix: {
      en: "Suppliers fill their self-assessment through a link you send, and their evaluation score sits next to their name on every receiving record.",
      ar: "يعبّئ المورّد تقييمه الذاتي عبر رابط تُرسله إليه، وتظهر نتيجة تقييمه بجانب اسمه في كل سجل استلام.",
    },
  },
  {
    id: "training",
    area: { en: "Staff training & health cards", ar: "تدريب الموظفين والبطاقات الصحية" },
    q: {
      en: "How do you track staff food-safety training and health cards?",
      ar: "كيف تتابع تدريب الموظفين على سلامة الغذاء وبطاقاتهم الصحية؟",
    },
    options: [
      { en: "Tracked centrally, with expiry dates visible", ar: "تُتابَع مركزيًا، وتواريخ الانتهاء واضحة", pts: 10 },
      { en: "Copies kept in files", ar: "نُسخ محفوظة في الملفات", pts: 5 },
      { en: "Each branch handles its own", ar: "يتولّاها كل فرع على حدة", pts: 2 },
      { en: "Not tracked", ar: "لا نتابعها", pts: 0 },
    ],
    fix: {
      en: "Training sessions, quizzes and attendance are recorded per employee, and health-card records are uploaded once and read everywhere.",
      ar: "تُسجَّل جلسات التدريب والاختبارات والحضور لكل موظف، وتُرفع بيانات البطاقات الصحية مرة واحدة لتُستخدم في كل مكان.",
    },
  },
  {
    id: "hygiene",
    area: { en: "Cleaning & pest control", ar: "النظافة ومكافحة الآفات" },
    q: {
      en: "Cleaning and pest-control checks at your branches are…",
      ar: "فحوصات النظافة ومكافحة الآفات في فروعك…",
    },
    options: [
      { en: "Filled daily, signed and reviewed by QA", ar: "تُعبّأ يوميًا، وتُوقَّع، ويراجعها قسم الجودة", pts: 10 },
      { en: "Filled, but rarely reviewed", ar: "تُعبّأ، لكن نادرًا ما تُراجَع", pts: 5 },
      { en: "Done, but without checklists", ar: "تُنفَّذ، لكن دون قوائم فحص", pts: 2 },
      { en: "Not done regularly", ar: "لا تُنفَّذ بانتظام", pts: 0 },
    ],
    fix: {
      en: "Daily hygiene and pest-control checklists are filled per branch, and QA sees what was filled and what is missing.",
      ar: "تُعبّأ قوائم النظافة ومكافحة الآفات اليومية لكل فرع، ويرى قسم الجودة ما اكتمل منها وما هو ناقص.",
    },
  },
  {
    id: "visibility",
    area: { en: "Branch oversight", ar: "الرقابة على الفروع" },
    q: {
      en: "Can head office see today which branches have completed their checks?",
      ar: "هل تستطيع الإدارة أن ترى اليوم أيّ الفروع أنجزت فحوصاتها؟",
    },
    options: [
      { en: "Yes, live", ar: "نعم، بشكل مباشر", pts: 10 },
      { en: "Only at the end of the week or month", ar: "في نهاية الأسبوع أو الشهر فقط", pts: 5 },
      { en: "Only when we visit the branch", ar: "عند زيارة الفرع فقط", pts: 2 },
      { en: "No", ar: "لا", pts: 0 },
    ],
    fix: {
      en: "Every branch reports to one dashboard, so head office sees today's records without visiting.",
      ar: "تسجّل جميع الفروع على لوحة واحدة، فتطّلع الإدارة على سجلات اليوم دون الحاجة إلى زيارة.",
    },
  },
  {
    id: "returns",
    area: { en: "Returns & condemnation", ar: "المرتجعات والإتلاف" },
    q: {
      en: "Returned, expired or condemned products are recorded with…",
      ar: "تُسجَّل المنتجات المرتجعة أو منتهية الصلاحية أو المُتلَفة مع…",
    },
    options: [
      { en: "Reason, quantity, action taken and photos", ar: "السبب والكمية والإجراء المتّخذ والصور", pts: 10 },
      { en: "Quantity only", ar: "الكمية فقط", pts: 5 },
      { en: "They are not recorded systematically", ar: "لا تُسجَّل بشكل منتظم", pts: 0 },
    ],
    fix: {
      en: "Each return is logged with reason, action and photos, and a photo of the transfer note can fill the item codes for you.",
      ar: "يُسجَّل كل مرتجع مع السبب والإجراء والصور، ويمكن لصورة إشعار التحويل أن تعبّئ رموز الأصناف تلقائيًا.",
    },
  },
  {
    id: "audit",
    area: { en: "Internal audits", ar: "التدقيق الداخلي" },
    q: {
      en: "Do you run internal audits of your branches?",
      ar: "هل تُجرون تدقيقًا داخليًا على فروعكم؟",
    },
    options: [
      { en: "On a schedule, and findings are closed with evidence", ar: "وفق جدول منتظم، وتُغلق الملاحظات بأدلة موثّقة", pts: 10 },
      { en: "From time to time", ar: "من حين إلى آخر", pts: 5 },
      { en: "Only just before an external inspection", ar: "قبل التفتيش الخارجي فقط", pts: 2 },
      { en: "Never", ar: "لا نُجريه", pts: 0 },
    ],
    fix: {
      en: "Internal audits are done on a phone at the branch; each finding gets a link the branch uses to send its evidence, until it is closed.",
      ar: "يُنفَّذ التدقيق الداخلي من الجوال داخل الفرع، ولكل ملاحظة رابط يرسل الفرع من خلاله الدليل حتى تُغلق.",
    },
  },
];

export const READINESS_LEVELS = [
  { min: 85, color: "#059669", bg: "#d1fae5", en: "Inspection-ready", ar: "جاهز للتفتيش",
    sumEn: "Your records are in good shape. The gaps below are the last few points to close.",
    sumAr: "سجلاتك في وضع جيد، والنقاط أدناه هي آخر الثغرات التي ينبغي معالجتها." },
  { min: 65, color: "#0891b2", bg: "#cffafe", en: "Good, with gaps", ar: "جيد، مع وجود ثغرات",
    sumEn: "The basics are there, but an inspector would find a few weak points.",
    sumAr: "الأساسيات متوفرة، لكن المفتش قد يلاحظ بعض نقاط الضعف." },
  { min: 40, color: "#d97706", bg: "#fef3c7", en: "At risk", ar: "معرّض لملاحظات التفتيش",
    sumEn: "Several areas depend on paper or memory, which is where inspection findings usually come from.",
    sumAr: "عدة جوانب تعتمد على الورق أو على الذاكرة، ومن هنا تنشأ ملاحظات التفتيش عادةً." },
  { min: 0, color: "#dc2626", bg: "#fee2e2", en: "High risk", ar: "مخاطر مرتفعة",
    sumEn: "Most records would be hard to show on the day of an inspection.",
    sumAr: "سيصعب تقديم معظم السجلات يوم التفتيش." },
];

export const levelOf = (score) => READINESS_LEVELS.find((l) => score >= l.min) || READINESS_LEVELS[READINESS_LEVELS.length - 1];

/** answers: { questionId: optionIndex } → per-question rows + total score. */
export function scoreAnswers(answers = {}) {
  const rows = READINESS_QUESTIONS.map((q) => {
    const idx = answers[q.id];
    const opt = Number.isInteger(idx) ? q.options[idx] : null;
    return { q, idx, opt, pts: opt ? opt.pts : 0, answered: !!opt };
  });
  const score = rows.reduce((a, r) => a + r.pts, 0);
  return { rows, score, gaps: rows.filter((r) => r.answered && r.pts < 10).sort((a, b) => a.pts - b.pts) };
}
