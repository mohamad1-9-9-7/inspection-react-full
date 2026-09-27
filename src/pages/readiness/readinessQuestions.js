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
      ar: "كيف بتسجّل فروعك درجات حرارة البرادات والفريزرات والطبخ؟",
    },
    options: [
      { en: "On a digital system that flags out-of-range readings", ar: "على نظام إلكتروني بينبّه إذا القراءة طلعت برّا الحد", pts: 10 },
      { en: "In Excel, or photos sent on WhatsApp", ar: "إكسل، أو صور منبعتها عالواتساب", pts: 5 },
      { en: "On paper forms", ar: "على نماذج ورقية", pts: 3 },
      { en: "Not recorded every day", ar: "ما منسجّلها كل يوم", pts: 0 },
    ],
    fix: {
      en: "Cooler and temperature logs are filled on a phone or tablet, each unit has its own min / max limits, and head office reads them the same day.",
      ar: "سجلات البرادات والحرارة بتنعبّى من الموبايل أو التابلت، ولكل برّاد حد أدنى وأعلى، والإدارة بتقراها بنفس اليوم.",
    },
  },
  {
    id: "retrieve",
    area: { en: "Records on demand", ar: "إحضار السجلات وقت التفتيش" },
    q: {
      en: "An inspector asks for the last 3 months of records for one branch. How long until you hand them over?",
      ar: "المفتش طلب سجلات آخر 3 شهور لفرع واحد. قديش بدك وقت لتسلّمه ياها؟",
    },
    options: [
      { en: "A few minutes", ar: "كم دقيقة", pts: 10 },
      { en: "Within an hour", ar: "خلال ساعة", pts: 6 },
      { en: "A day or more", ar: "يوم أو أكتر", pts: 2 },
      { en: "We might not find all of them", ar: "يمكن ما نلاقيها كلها", pts: 0 },
    ],
    fix: {
      en: "Every record is searchable by branch and date, and opens as a ready PDF or Excel file in one click.",
      ar: "كل سجل بينبحث عنه بالفرع والتاريخ، وبيطلع PDF أو Excel جاهز بكبسة زر.",
    },
  },
  {
    id: "trace",
    area: { en: "Traceability", ar: "التتبّع" },
    q: {
      en: "A customer complains about a product. Can you trace it back to its supplier, batch and receiving date?",
      ar: "زبون اشتكى على منتج. بتقدر ترجع لمورّده ورقم الدفعة وتاريخ استلامه؟",
    },
    options: [
      { en: "Yes, in minutes", ar: "إيه، بدقايق", pts: 10 },
      { en: "Yes, but it takes hours of going through paper", ar: "إيه، بس بياخد ساعات بين الأوراق", pts: 5 },
      { en: "Only partly", ar: "جزئياً بس", pts: 2 },
      { en: "No", ar: "لا", pts: 0 },
    ],
    fix: {
      en: "Item codes link shipment, receiving and traceability records, so one search shows a product's path from supplier to branch.",
      ar: "كود الصنف بيربط سجلات الشحن والاستلام والتتبّع، فبحث واحد بيوريك طريق المنتج من المورّد للفرع.",
    },
  },
  {
    id: "ncr",
    area: { en: "Corrective actions", ar: "الإجراءات التصحيحية" },
    q: {
      en: "When something goes wrong, how is it followed up?",
      ar: "لما يصير خطأ أو مخالفة، كيف بتنتابع؟",
    },
    options: [
      { en: "Logged with an owner and a deadline, and tracked until closed", ar: "بتنسجّل مع مسؤول وموعد، ومنتابعها لتنسكّر", pts: 10 },
      { en: "Logged, but rarely followed up", ar: "بتنسجّل، بس نادراً منتابعها", pts: 5 },
      { en: "Handled by phone or word of mouth", ar: "بالتلفون أو بالحكي", pts: 2 },
      { en: "Not recorded", ar: "ما بتنسجّل", pts: 0 },
    ],
    fix: {
      en: "Non-conformance and corrective-action (NCR / CAPA) reports carry their own reference number and stay open until someone closes them.",
      ar: "تقارير عدم المطابقة والإجراءات التصحيحية (NCR / CAPA) إلها رقم مرجعي خاص، وبتضل مفتوحة لحتى حدا يسكّرها.",
    },
  },
  {
    id: "supplier",
    area: { en: "Supplier approval", ar: "اعتماد الموردين" },
    q: {
      en: "How do you approve suppliers and keep their certificates current?",
      ar: "كيف بتعتمد الموردين وبتتابع شهاداتهم؟",
    },
    options: [
      { en: "Documented evaluation, and certificate expiry dates are tracked", ar: "تقييم موثّق، ومنتابع تواريخ انتهاء الشهادات", pts: 10 },
      { en: "We keep files, but don't track expiry", ar: "عنا ملفات، بس ما منتابع الانتهاء", pts: 5 },
      { en: "Informally, by experience", ar: "بشكل غير رسمي، بالخبرة", pts: 2 },
      { en: "No approval process", ar: "ما في آلية اعتماد", pts: 0 },
    ],
    fix: {
      en: "Suppliers fill their self-assessment through a link you send, and their evaluation score sits next to their name on every receiving record.",
      ar: "المورّد بيعبّي تقييمه الذاتي من رابط بتبعتله ياه، ونتيجة تقييمه بتطلع جنب اسمه بكل سجل استلام.",
    },
  },
  {
    id: "training",
    area: { en: "Staff training & health cards", ar: "تدريب الموظفين والبطاقات الصحية" },
    q: {
      en: "How do you track staff food-safety training and health cards?",
      ar: "كيف بتتابع تدريب الموظفين على سلامة الغذاء وبطاقاتهم الصحية؟",
    },
    options: [
      { en: "Tracked centrally, with expiry dates visible", ar: "متابَعة بمكان واحد، والتواريخ واضحة", pts: 10 },
      { en: "Copies kept in files", ar: "نسخ محفوظة بالملفات", pts: 5 },
      { en: "Each branch handles its own", ar: "كل فرع لحاله", pts: 2 },
      { en: "Not tracked", ar: "ما منتابعها", pts: 0 },
    ],
    fix: {
      en: "Training sessions, quizzes and attendance are recorded per employee, and health-card records are uploaded once and read everywhere.",
      ar: "جلسات التدريب والاختبارات والحضور بتنسجّل لكل موظف، وبيانات البطاقات الصحية بتنرفع مرة وحدة وبتنقرا بكل مكان.",
    },
  },
  {
    id: "hygiene",
    area: { en: "Cleaning & pest control", ar: "النظافة ومكافحة الحشرات" },
    q: {
      en: "Cleaning and pest-control checks at your branches are…",
      ar: "فحوصات النظافة ومكافحة الحشرات بفروعك…",
    },
    options: [
      { en: "Filled daily, signed and reviewed by QA", ar: "بتنعبّى يومياً، موقّعة وبيراجعها قسم الجودة", pts: 10 },
      { en: "Filled, but rarely reviewed", ar: "بتنعبّى، بس نادراً حدا بيراجعها", pts: 5 },
      { en: "Done, but without checklists", ar: "بتنعمل، بس بدون قوائم فحص", pts: 2 },
      { en: "Not done regularly", ar: "ما بتنعمل بانتظام", pts: 0 },
    ],
    fix: {
      en: "Daily hygiene and pest-control checklists are filled per branch, and QA sees what was filled and what is missing.",
      ar: "قوائم النظافة ومكافحة الحشرات اليومية بتنعبّى لكل فرع، والجودة بتشوف شو انعبّى وشو ناقص.",
    },
  },
  {
    id: "visibility",
    area: { en: "Branch oversight", ar: "الرقابة على الفروع" },
    q: {
      en: "Can head office see today which branches have completed their checks?",
      ar: "بتقدر الإدارة تشوف اليوم أي فروع خلّصت فحوصاتها؟",
    },
    options: [
      { en: "Yes, live", ar: "إيه، مباشرة", pts: 10 },
      { en: "Only at the end of the week or month", ar: "بس بآخر الأسبوع أو الشهر", pts: 5 },
      { en: "Only when we visit the branch", ar: "بس لما نزور الفرع", pts: 2 },
      { en: "No", ar: "لا", pts: 0 },
    ],
    fix: {
      en: "Every branch reports to one dashboard, so head office sees today's records without visiting.",
      ar: "كل الفروع بتسجّل على لوحة وحدة، فالإدارة بتشوف سجلات اليوم بدون ما تزور.",
    },
  },
  {
    id: "returns",
    area: { en: "Returns & condemnation", ar: "المرتجعات والإتلاف" },
    q: {
      en: "Returned, expired or condemned products are recorded with…",
      ar: "المنتجات المرتجعة أو المنتهية أو المتلفة بتنسجّل مع…",
    },
    options: [
      { en: "Reason, quantity, action taken and photos", ar: "السبب والكمية والإجراء والصور", pts: 10 },
      { en: "Quantity only", ar: "الكمية بس", pts: 5 },
      { en: "They are not recorded systematically", ar: "ما بتنسجّل بشكل منتظم", pts: 0 },
    ],
    fix: {
      en: "Each return is logged with reason, action and photos, and a photo of the transfer note can fill the item codes for you.",
      ar: "كل مرتجع بينسجّل مع السبب والإجراء والصور، وصورة إشعار التحويل بتعبّي أكواد الأصناف عنك.",
    },
  },
  {
    id: "audit",
    area: { en: "Internal audits", ar: "التدقيق الداخلي" },
    q: {
      en: "Do you run internal audits of your branches?",
      ar: "بتعملوا تدقيق داخلي على فروعكم؟",
    },
    options: [
      { en: "On a schedule, and findings are closed with evidence", ar: "بجدول ثابت، والملاحظات بتنسكّر بإثبات", pts: 10 },
      { en: "From time to time", ar: "من وقت لوقت", pts: 5 },
      { en: "Only just before an external inspection", ar: "بس قبل التفتيش الخارجي", pts: 2 },
      { en: "Never", ar: "أبداً", pts: 0 },
    ],
    fix: {
      en: "Internal audits are done on a phone at the branch; each finding gets a link the branch uses to send its evidence, until it is closed.",
      ar: "التدقيق الداخلي بينعمل من الموبايل بالفرع، وكل ملاحظة إلها رابط بيبعت فيه الفرع إثباته لحتى تنسكّر.",
    },
  },
];

export const READINESS_LEVELS = [
  { min: 85, color: "#059669", bg: "#d1fae5", en: "Inspection-ready", ar: "جاهز للتفتيش",
    sumEn: "Your records are in good shape. The gaps below are the last few points to close.",
    sumAr: "سجلاتك بوضع منيح. النقاط تحت هي آخر الثغرات اللي لازم تنسكّر." },
  { min: 65, color: "#0891b2", bg: "#cffafe", en: "Good, with gaps", ar: "جيد، بس في ثغرات",
    sumEn: "The basics are there, but an inspector would find a few weak points.",
    sumAr: "الأساسيات موجودة، بس المفتش ممكن يلاقي كم نقطة ضعف." },
  { min: 40, color: "#d97706", bg: "#fef3c7", en: "At risk", ar: "معرّض لملاحظات التفتيش",
    sumEn: "Several areas depend on paper or memory, which is where inspection findings usually come from.",
    sumAr: "في كذا جانب معتمد عالورق أو عالذاكرة، ومن هون عادةً بتطلع ملاحظات التفتيش." },
  { min: 0, color: "#dc2626", bg: "#fee2e2", en: "High risk", ar: "خطر عالي",
    sumEn: "Most records would be hard to show on the day of an inspection.",
    sumAr: "أغلب السجلات رح يكون صعب تطلعها يوم التفتيش." },
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
