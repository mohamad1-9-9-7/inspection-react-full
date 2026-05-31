import React from "react";

/* ===================== API base ===================== */
export const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

export const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

export const REPORTS_URL = `${API_BASE}/api/reports`;
export const TYPE = "training_session";
export const PASS_MARK = 80;

/* ===================== ✅ Unified language ===================== */
export const LANG_STORAGE_KEY = "qcs_training_lang";

export function getStoredLang() {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === "ar" || v === "AR") return "ar";
    if (v === "en" || v === "EN") return "en";
  } catch {}
  return "en";
}

export function setStoredLang(lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang === "ar" || lang === "AR" ? "ar" : "en");
  } catch {}
}

export function useGlobalLang() {
  const [lang, setLangState] = React.useState(getStoredLang);

  React.useEffect(() => {
    function onStorage(e) {
      if (e.key === LANG_STORAGE_KEY && e.newValue) {
        setLangState(e.newValue === "ar" ? "ar" : "en");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setLang = React.useCallback((next) => {
    const norm = next === "ar" || next === "AR" ? "ar" : "en";
    setStoredLang(norm);
    setLangState(norm);
    // notify other tabs/components
    try {
      window.dispatchEvent(new StorageEvent("storage", { key: LANG_STORAGE_KEY, newValue: norm }));
    } catch {}
  }, []);

  return [lang, setLang];
}

/* ===================== ✅ Module names AR translations ===================== */
export const MODULES_AR = {
  "Personnel Hygiene": "النظافة الشخصية",
  "GHP / Cleaning & Sanitation": "GHP / التنظيف والتعقيم",
  "Receiving": "الاستلام",
  "Storage": "التخزين",
  "Time & Temperature / CCP": "الوقت والحرارة / نقطة التحكم الحرجة",
  "HACCP Basics": "أساسيات HACCP",
  "Allergen Control": "التحكم بمسببات الحساسية",
  "Cross Contamination Control": "التحكم بالتلوث المتبادل",
  "Chemical Safety (Food + OHS)": "سلامة المواد الكيميائية",
  "Pest Control Awareness": "الوعي بمكافحة الآفات",
  "Waste Management": "إدارة النفايات",
  "OHS: PPE & Safe Work": "السلامة المهنية: معدات الوقاية والعمل الآمن",
  "OHS: Knife Safety": "السلامة المهنية: سلامة السكاكين",
  "OHS: Manual Handling": "السلامة المهنية: المناولة اليدوية",
  "OHS: Fire Safety & Emergency": "السلامة المهنية: الحرائق والطوارئ",
  "OHS: First Aid & Incident Reporting": "السلامة المهنية: الإسعافات الأولية والإبلاغ",
  "TESTO OIL — Oil Quality Test": "اختبار جودة الزيت TESTO",
  "Quality System Usage": "استخدام نظام الجودة",
};

export const MODULES_AR_SHORT = {
  "Personnel Hygiene": "النظافة",
  "GHP / Cleaning & Sanitation": "GHP",
  "Receiving": "الاستلام",
  "Storage": "التخزين",
  "Time & Temperature / CCP": "الحرارة/CCP",
  "HACCP Basics": "HACCP",
  "Allergen Control": "الحساسية",
  "Cross Contamination Control": "التلوث المتبادل",
  "Chemical Safety (Food + OHS)": "الكيميائيات",
  "Pest Control Awareness": "الآفات",
  "Waste Management": "النفايات",
  "OHS: PPE & Safe Work": "PPE",
  "OHS: Knife Safety": "السكاكين",
  "OHS: Manual Handling": "المناولة",
  "OHS: Fire Safety & Emergency": "الحرائق",
  "OHS: First Aid & Incident Reporting": "الإسعافات",
  "TESTO OIL — Oil Quality Test": "TESTO",
  "Quality System Usage": "نظام الجودة",
};

/** Returns module name in the requested language. Falls back to English. */
export function getModuleName(name, lang = "en") {
  if (!name) return "";
  const l = lang === "ar" || lang === "AR" ? "ar" : "en";
  if (l === "ar") return MODULES_AR[name] || name;
  return name;
}

export function getModuleNameShort(name, lang = "en") {
  if (!name) return "";
  const l = lang === "ar" || lang === "AR" ? "ar" : "en";
  if (l === "ar") return MODULES_AR_SHORT[name] || MODULES_AR[name] || name;
  return name;
}

/* ===================== ✅ PUBLIC ORIGIN (Netlify/Vite/CRA) ===================== */
/**
 * الهدف: أي رابط يتولد يكون أونلاين حتى لو أنت فاتح محلي.
 * Netlify/Vite:  import.meta.env.VITE_PUBLIC_ORIGIN
 * CRA:           process.env.REACT_APP_PUBLIC_ORIGIN
 * Window override (اختياري): window.__QCS_PUBLIC_ORIGIN__
 */
let VITE_PUBLIC_ORIGIN;
try {
  VITE_PUBLIC_ORIGIN = import.meta.env?.VITE_PUBLIC_ORIGIN;
} catch {
  VITE_PUBLIC_ORIGIN = undefined;
}

export const PUBLIC_ORIGIN = String(
  (typeof window !== "undefined" && window.__QCS_PUBLIC_ORIGIN__) ||
    VITE_PUBLIC_ORIGIN ||
    (typeof process !== "undefined" && process.env?.REACT_APP_PUBLIC_ORIGIN) ||
    (typeof window !== "undefined" && window.location ? window.location.origin : "")
).replace(/\/$/, "");

export function buildPublicUrl(pathname = "") {
  const p = String(pathname || "");
  if (!p) return PUBLIC_ORIGIN;
  return `${PUBLIC_ORIGIN}${p.startsWith("/") ? "" : "/"}${p}`;
}

/* ===================== QUIZ BANK (AR/EN) ===================== */
export const QUIZ_BANK = {
  "Personnel Hygiene": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "PPE stands for:", q_ar: "معنى PPE هو:", options_en: ["Personal Protective Equipment", "Ready-to-eat product", "Storage procedure"], options_ar: ["معدات الوقاية الشخصية", "منتج جاهز للأكل", "إجراء تخزين"], correct: 0 },
    { difficulty: "Easy", q_en: "When must hands be washed?", q_ar: "متى يجب غسل اليدين؟", options_en: ["Before & after handling food", "Once per day", "Only when visibly dirty"], options_ar: ["قبل وبعد التعامل مع الطعام", "مرة واحدة يوميًا", "فقط عند الاتساخ"], correct: 0 },
    { difficulty: "Easy", q_en: "Are jewelry and watches allowed while handling food?", q_ar: "هل يسمح بارتداء المجوهرات/الساعة أثناء العمل؟", options_en: ["Yes, always", "No", "Only a ring"], options_ar: ["نعم دائمًا", "لا", "فقط الخاتم"], correct: 1 },
    { difficulty: "Easy", q_en: "Minimum handwashing time with soap is about:", q_ar: "أقل مدة لغسل اليدين بالصابون حوالي:", options_en: ["20 seconds", "2 seconds", "Just a quick rinse"], options_ar: ["20 ثانية", "ثانيتان", "شطفة سريعة فقط"], correct: 0 },
    { difficulty: "Easy", q_en: "Long hair in a production area must be:", q_ar: "الشعر الطويل في منطقة الإنتاج يجب:", options_en: ["Left loose", "Tied back and covered with a hair net", "Covered only in summer"], options_ar: ["تركه مرسلاً", "ربطه وتغطيته بغطاء شعر", "تغطيته في الصيف فقط"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "What should you do if you have a cut on your hand?", q_ar: "ماذا نفعل عند وجود جرح باليد؟", options_en: ["Continue normally", "Cover with waterproof dressing + glove", "Rinse with water only"], options_ar: ["نستمر بدون شيء", "نغطيه بضماد مقاوم للماء + قفاز", "نغسله بالماء فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "A food handler with vomiting/diarrhea should:", q_ar: "متداول الغذاء المصاب بالقيء/الإسهال يجب أن:", options_en: ["Keep working with gloves", "Report to supervisor and stop handling food", "Only avoid ready-to-eat food"], options_ar: ["يكمل العمل بالقفازات", "يبلّغ المشرف ويتوقف عن مناولة الغذاء", "يتجنب الأطعمة الجاهزة فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "Nail polish and false nails for food handlers are:", q_ar: "طلاء الأظافر والأظافر الصناعية لمتداولي الغذاء:", options_en: ["Allowed", "Not allowed (physical + contamination hazard)", "Allowed with gloves"], options_ar: ["مسموحة", "ممنوعة (خطر فيزيائي وتلوث)", "مسموحة مع القفازات"], correct: 1 },
    { difficulty: "Medium", q_en: "After using the toilet you must:", q_ar: "بعد استخدام الحمام يجب:", options_en: ["Just wipe hands", "Wash hands thoroughly with soap", "Use sanitizer only"], options_ar: ["مسح اليدين فقط", "غسل اليدين جيداً بالصابون", "استخدام المعقم فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "Eating, drinking and smoking in production areas is:", q_ar: "الأكل والشرب والتدخين في مناطق الإنتاج:", options_en: ["Allowed in a corner", "Strictly forbidden", "Allowed during breaks at the line"], options_ar: ["مسموح في زاوية", "ممنوع تماماً", "مسموح وقت الاستراحة عند الخط"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "After gastrointestinal illness, return to food handling is allowed:", q_ar: "بعد مرض معوي، العودة لمناولة الغذاء تكون:", options_en: ["Immediately when feeling better", "At least 48 hours symptom-free", "After 6 hours"], options_ar: ["فوراً عند الشعور بتحسن", "بعد 48 ساعة على الأقل بدون أعراض", "بعد 6 ساعات"], correct: 1 },
    { difficulty: "Hard", q_en: "Hand sanitizer in a food operation:", q_ar: "معقم اليدين في منشأة غذائية:", options_en: ["Replaces handwashing", "Is used after proper handwashing, not instead of it", "Is only for visitors"], options_ar: ["يغني عن غسل اليدين", "يُستخدم بعد الغسل الصحيح وليس بدلاً عنه", "للزوار فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "Best method to prevent cross contamination is:", q_ar: "أفضل طريقة لمنع التلوث المتبادل؟", options_en: ["Use the same tools for everything", "Separate tools/surfaces and sanitize", "Leave food uncovered"], options_ar: ["استخدام نفس الأدوات دائمًا", "فصل الأدوات/الأسطح وتعقيمها", "ترك الطعام مكشوف"], correct: 1 },
    { difficulty: "Hard", q_en: "Single-use gloves must be changed:", q_ar: "القفازات أحادية الاستخدام يجب تغييرها:", options_en: ["Only at end of shift", "When torn, soiled, or when changing task — with handwash", "Once a day"], options_ar: ["في نهاية الشفت فقط", "عند التلف أو الاتساخ أو تغيير المهمة — مع غسل اليدين", "مرة باليوم"], correct: 1 },
    { difficulty: "Hard", q_en: "A visible illness sign requiring exclusion from food handling:", q_ar: "علامة مرض ظاهرة تستوجب الاستبعاد من مناولة الغذاء:", options_en: ["Mild tiredness", "Diarrhea, vomiting, jaundice, or infected skin lesions", "A small headache"], options_ar: ["تعب خفيف", "إسهال أو قيء أو يرقان أو جروح جلدية ملتهبة", "صداع بسيط"], correct: 1 },
  ],

  "GHP / Cleaning & Sanitation": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "What is the correct order for cleaning?", q_ar: "ما هو التسلسل الصحيح للتنظيف؟", options_en: ["Rinse → detergent → scrub → rinse → sanitize", "Sanitize first", "Only rinse with water"], options_ar: ["شطف→منظف→فرك→شطف→تعقيم", "تعقيم أولاً", "شطف بالماء فقط"], correct: 0 },
    { difficulty: "Easy", q_en: "Why is color coding used for tools?", q_ar: "لماذا نستخدم نظام الألوان للأدوات؟", options_en: ["Decoration", "Reduce cross contamination", "Save money"], options_ar: ["للزينة", "لتقليل التلوث المتبادل", "لتقليل التكلفة"], correct: 1 },
    { difficulty: "Easy", q_en: "Tools must be stored:", q_ar: "يجب حفظ الأدوات:", options_en: ["On the floor", "Clean, dry, and off the floor", "Inside the chemical cabinet"], options_ar: ["على الأرض", "نظيفة وجافة وبعيدة عن الأرض", "داخل خزانة المواد الكيميائية"], correct: 1 },
    { difficulty: "Easy", q_en: "Sanitizing a surface means:", q_ar: "تعقيم السطح يعني:", options_en: ["Making it look shiny", "Reducing microbes to a safe level", "Drying it"], options_ar: ["جعله لامعاً", "تقليل الميكروبات لمستوى آمن", "تجفيفه"], correct: 1 },
    { difficulty: "Easy", q_en: "Cleaning chemicals must be:", q_ar: "مواد التنظيف يجب أن تكون:", options_en: ["Unlabeled", "Labeled and stored away from food", "Mixed together"], options_ar: ["بدون ملصق", "موسومة ومخزّنة بعيداً عن الغذاء", "مخلوطة مع بعضها"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Sanitizer contact (dwell) time means:", q_ar: "زمن التماس للمعقم يعني:", options_en: ["Time needed on surface to work", "Time to dry hands", "Time to store the chemical"], options_ar: ["الوقت اللازم ليعمل المعقم على السطح", "وقت تجفيف اليد", "وقت تخزين الكيميائي"], correct: 0 },
    { difficulty: "Medium", q_en: "What should be done after a spill of raw meat juices?", q_ar: "ماذا نفعل بعد انسكاب عصارة لحم نيء؟", options_en: ["Ignore", "Clean + sanitize immediately", "Cover with paper only"], options_ar: ["لا شيء", "تنظيف وتعقيم فوراً", "تغطية بورق فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "Chemical dilution/dosage should follow:", q_ar: "تخفيف/جرعة الكيميائي يجب أن تتبع:", options_en: ["Your own guess", "The manufacturer label / SOP", "The strongest possible mix"], options_ar: ["تقديرك الشخصي", "ملصق المُصنّع / إجراء العمل", "أقوى خلطة ممكنة"], correct: 1 },
    { difficulty: "Medium", q_en: "Cleaning activities should be:", q_ar: "أنشطة التنظيف يجب أن تكون:", options_en: ["Done only when dirty", "Scheduled and recorded (cleaning schedule)", "Left to memory"], options_ar: ["عند الاتساخ فقط", "مجدولة وموثقة (جدول تنظيف)", "متروكة للذاكرة"], correct: 1 },
    { difficulty: "Medium", q_en: "The difference between cleaning and sanitizing is:", q_ar: "الفرق بين التنظيف والتعقيم:", options_en: ["They are the same", "Cleaning removes dirt; sanitizing reduces microbes", "Sanitizing removes dirt only"], options_ar: ["هما نفس الشيء", "التنظيف يزيل الأوساخ؛ التعقيم يقلل الميكروبات", "التعقيم يزيل الأوساخ فقط"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "Why must a surface be cleaned before it is sanitized?", q_ar: "لماذا يجب تنظيف السطح قبل تعقيمه؟", options_en: ["To save sanitizer", "Organic matter/soil inactivates the sanitizer", "It is not required"], options_ar: ["لتوفير المعقم", "بقايا الأوساخ تُبطل مفعول المعقم", "غير مطلوب"], correct: 1 },
    { difficulty: "Hard", q_en: "How is sanitizer concentration best verified?", q_ar: "كيف يُتحقق من تركيز المعقم؟", options_en: ["By smell", "Using test strips / titration", "By color only"], options_ar: ["بالرائحة", "باستخدام شرائط اختبار / المعايرة", "باللون فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "The 5 stages of manual cleaning are, in order:", q_ar: "مراحل التنظيف اليدوي الخمس بالترتيب:", options_en: ["Pre-clean → main clean → rinse → disinfect → final rinse/dry", "Disinfect → rinse → dry", "Rinse → dry only"], options_ar: ["تنظيف أولي → تنظيف رئيسي → شطف → تطهير → شطف/تجفيف نهائي", "تطهير → شطف → تجفيف", "شطف → تجفيف فقط"], correct: 0 },
    { difficulty: "Hard", q_en: "Cleaning effectiveness in a HACCP system is verified by:", q_ar: "يتم التحقق من فعالية التنظيف في نظام الهاسب عبر:", options_en: ["Assuming it is clean", "Visual checks + ATP/swab testing", "Asking staff"], options_ar: ["افتراض أنه نظيف", "فحص بصري + مسحات/اختبار ATP", "سؤال الموظفين"], correct: 1 },
    { difficulty: "Hard", q_en: "Equipment that cannot be dismantled is best cleaned by:", q_ar: "المعدات التي لا تُفكّك تُنظّف أفضل عبر:", options_en: ["Soaking in water overnight", "Clean-In-Place (CIP) procedure", "Wiping the outside only"], options_ar: ["النقع في الماء طوال الليل", "إجراء التنظيف في الموقع (CIP)", "مسح الخارج فقط"], correct: 1 },
  ],

  Receiving: [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Most important checks during receiving:", q_ar: "أهم شيء عند الاستلام:", options_en: ["Color only", "Temperature + dates + condition", "Packaging only"], options_ar: ["اللون فقط", "الحرارة + الصلاحية + الحالة", "التغليف فقط"], correct: 1 },
    { difficulty: "Easy", q_en: "Product label verification is:", q_ar: "التحقق من الملصق (اللابل):", options_en: ["Optional", "Mandatory", "Monthly only"], options_ar: ["اختياري", "ضروري", "مرة بالشهر"], correct: 1 },
    { difficulty: "Easy", q_en: "FEFO means:", q_ar: "معنى FEFO:", options_en: ["First Expire First Out", "First Enter First Out", "Freeze Everything For Output"], options_ar: ["الأقرب انتهاء يُستخدم أولاً", "الأقدم دخولًا يُستخدم أولاً", "جمّد كل شيء"], correct: 0 },
    { difficulty: "Easy", q_en: "Chilled meat should be received at about:", q_ar: "اللحم المبرّد يُستلم عند حرارة حوالي:", options_en: ["0–5°C", "15°C", "Room temperature"], options_ar: ["0–5°C", "15°C", "حرارة الغرفة"], correct: 0 },
    { difficulty: "Easy", q_en: "Frozen products should be received at or below:", q_ar: "المنتجات المجمدة تُستلم عند أو أقل من:", options_en: ["-18°C", "0°C", "5°C"], options_ar: ["-18°C", "0°C", "5°C"], correct: 0 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "If delivery temperature is out of spec:", q_ar: "إذا كانت حرارة التوصيل غير مطابقة:", options_en: ["Accept it", "Reject/hold and inform QA", "Sell it quickly"], options_ar: ["نقبلها", "نرفض/نعزل ونبلغ QA", "نبيع بسرعة"], correct: 1 },
    { difficulty: "Medium", q_en: "If packaging is damaged on arrival:", q_ar: "عند وجود تلف في التغليف عند الوصول:", options_en: ["Accept normally", "Hold/reject depending on risk", "Open and smell it"], options_ar: ["نستلم عادي", "نعزل/نرفض حسب الخطورة", "نفتح ونشم"], correct: 1 },
    { difficulty: "Medium", q_en: "A delivery vehicle for chilled food must be:", q_ar: "سيارة توصيل الغذاء المبرّد يجب أن تكون:", options_en: ["Any clean van", "Refrigerated and clean", "Open-top truck"], options_ar: ["أي سيارة نظيفة", "مبرّدة ونظيفة", "شاحنة مكشوفة"], correct: 1 },
    { difficulty: "Medium", q_en: "On receiving, raw and ready-to-eat items should be:", q_ar: "عند الاستلام، النيء والجاهز للأكل يجب:", options_en: ["Stored together", "Separated immediately", "Mixed to save space"], options_ar: ["تخزينهما معاً", "فصلهما فوراً", "خلطهما لتوفير المساحة"], correct: 1 },
    { difficulty: "Medium", q_en: "Receiving records (temperature, supplier, date) should be:", q_ar: "سجلات الاستلام (الحرارة، المورد، التاريخ) يجب:", options_en: ["Optional", "Completed and kept for traceability", "Filled monthly"], options_ar: ["اختيارية", "تعبئتها وحفظها للتتبّع", "تعبئتها شهرياً"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "A supplier delivering meat must primarily be:", q_ar: "المورد الذي يسلّم اللحوم يجب أن يكون أساساً:", options_en: ["The cheapest", "Approved/evaluated with valid health certificates", "Any nearby shop"], options_ar: ["الأرخص", "معتمد/مُقيَّم مع شهادات صحية سارية", "أي محل قريب"], correct: 1 },
    { difficulty: "Hard", q_en: "Core temperature on receiving is best checked by:", q_ar: "حرارة القلب عند الاستلام يُفضّل قياسها بـ:", options_en: ["Touching the box", "A calibrated probe thermometer between packs", "Reading the label"], options_ar: ["لمس الصندوق", "ميزان مسبار معاير بين العبوات", "قراءة الملصق"], correct: 1 },
    { difficulty: "Hard", q_en: "Best reason to reject a chilled meat delivery:", q_ar: "أفضل سبب لرفض شحنة لحم مبرّد:", options_en: ["The driver was late", "Core temp above limit, off odor, or broken seal", "The box color"], options_ar: ["تأخر السائق", "حرارة أعلى من الحد، رائحة غير طبيعية، أو ختم مكسور", "لون الصندوق"], correct: 1 },
    { difficulty: "Hard", q_en: "FEFO vs FIFO — the key difference is FEFO uses:", q_ar: "الفرق بين FEFO و FIFO أن FEFO يعتمد على:", options_en: ["Date received", "Expiry/best-before date", "Box size"], options_ar: ["تاريخ الاستلام", "تاريخ الانتهاء/أفضل قبل", "حجم الصندوق"], correct: 1 },
    { difficulty: "Hard", q_en: "Allergen-containing raw materials on receipt should be:", q_ar: "المواد الخام المحتوية على مسببات حساسية عند الاستلام يجب:", options_en: ["Stored anywhere", "Identified and segregated to prevent cross-contact", "Mixed with normal stock"], options_ar: ["تخزينها بأي مكان", "تحديدها وعزلها لمنع التلامس", "خلطها مع المخزون العادي"], correct: 1 },
  ],

  Storage: [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "FEFO system means:", q_ar: "ما هو نظام FEFO؟", options_en: ["Nearest expiry used first", "Oldest production used last", "No order"], options_ar: ["الأقرب انتهاء يُستخدم أولاً", "الأقدم إنتاجًا يُستخدم أخيراً", "لا يوجد ترتيب"], correct: 0 },
    { difficulty: "Easy", q_en: "Typical chilled storage temperature:", q_ar: "درجة حرارة التخزين البارد عادة:", options_en: ["0–5°C", "10–15°C", "25°C"], options_ar: ["0-5°C", "10-15°C", "25°C"], correct: 0 },
    { difficulty: "Easy", q_en: "Frozen storage temperature should be:", q_ar: "درجة حرارة التخزين المجمّد يجب أن تكون:", options_en: ["-18°C or below", "0°C", "5°C"], options_ar: ["-18°C أو أقل", "0°C", "5°C"], correct: 0 },
    { difficulty: "Easy", q_en: "Products inside a chiller should be:", q_ar: "المنتجات داخل البراد يجب أن تكون:", options_en: ["Uncovered", "Covered/protected and labeled", "Only covered in summer"], options_ar: ["مكشوفة", "مغطّاة/محمية وموسومة", "مغطاة في الصيف فقط"], correct: 1 },
    { difficulty: "Easy", q_en: "Food must be stored off the floor on:", q_ar: "يجب تخزين الغذاء بعيداً عن الأرض على:", options_en: ["The floor directly", "Shelves/pallets", "Cardboard on the floor"], options_ar: ["الأرض مباشرة", "رفوف/منصات", "كرتون على الأرض"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Expired products must be:", q_ar: "المنتجات المنتهية يجب أن:", options_en: ["Kept on display", "Segregated/identified then disposed", "Moved to the freezer"], options_ar: ["تبقى بالعرض", "تعزل وتحدد ثم تُعدم", "تنقل للتجميد"], correct: 1 },
    { difficulty: "Medium", q_en: "Can chemicals be stored with food?", q_ar: "هل يجوز تخزين الكيميائيات مع الأغذية؟", options_en: ["Yes", "No — store separately", "Depends on quantity"], options_ar: ["نعم", "لا — تُخزّن منفصلة", "حسب الكمية"], correct: 1 },
    { difficulty: "Medium", q_en: "In a chiller, raw meat should be placed:", q_ar: "في البراد، اللحم النيء يوضع:", options_en: ["Above ready-to-eat food", "Below/away from ready-to-eat food", "Anywhere"], options_ar: ["فوق الطعام الجاهز", "أسفل/بعيداً عن الطعام الجاهز", "بأي مكان"], correct: 1 },
    { difficulty: "Medium", q_en: "Opened/decanted products should be:", q_ar: "المنتجات المفتوحة/المنقولة يجب أن تكون:", options_en: ["Left as is", "Covered, labeled with name and date", "Thrown immediately"], options_ar: ["تُترك كما هي", "مغطّاة وموسومة بالاسم والتاريخ", "ترمى فوراً"], correct: 1 },
    { difficulty: "Medium", q_en: "Chiller/freezer temperatures should be:", q_ar: "حرارة البرادات/المجمدات يجب:", options_en: ["Never checked", "Monitored and recorded regularly", "Checked once a year"], options_ar: ["عدم فحصها", "مراقبتها وتسجيلها بانتظام", "فحصها مرة بالسنة"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "Raw meat is stored below ready-to-eat food mainly to:", q_ar: "يُخزّن اللحم النيء أسفل الطعام الجاهز أساساً لـ:", options_en: ["Save space", "Prevent drip cross-contamination", "Keep it colder"], options_ar: ["توفير المساحة", "منع تلوث التنقيط المتبادل", "إبقائه أبرد"], correct: 1 },
    { difficulty: "Hard", q_en: "If a chiller reads 10°C for several hours, you should:", q_ar: "إذا أظهر البراد 10°C لعدة ساعات، يجب:", options_en: ["Ignore it", "Assess product safety, record, take corrective action", "Lower the thermostat only"], options_ar: ["تجاهله", "تقييم سلامة المنتج والتوثيق واتخاذ إجراء تصحيحي", "خفض الثرموستات فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "Stock rotation is best controlled by:", q_ar: "أفضل ضبط لتدوير المخزون عبر:", options_en: ["Storing newest at the front", "Placing nearest-expiry stock to be used first (FEFO)", "Random placement"], options_ar: ["وضع الأحدث في الأمام", "وضع الأقرب انتهاءً ليُستخدم أولاً (FEFO)", "وضع عشوائي"], correct: 1 },
    { difficulty: "Hard", q_en: "Allergen-containing ingredients in storage should be:", q_ar: "المكونات المحتوية على مسببات حساسية أثناء التخزين يجب:", options_en: ["Stored above other foods", "Clearly labeled and segregated/sealed", "Left open"], options_ar: ["تخزينها فوق الأغذية الأخرى", "وسمها بوضوح وعزلها/إغلاقها", "تركها مفتوحة"], correct: 1 },
    { difficulty: "Hard", q_en: "Correct chiller loading practice is to:", q_ar: "الممارسة الصحيحة لتحميل البراد:", options_en: ["Overfill to use space", "Avoid overloading so air can circulate", "Block the fan"], options_ar: ["ملؤه بالكامل لاستغلال المساحة", "تجنّب الإفراط ليدور الهواء", "سد المروحة"], correct: 1 },
  ],

  "Time & Temperature / CCP": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "The temperature Danger Zone is approximately:", q_ar: "منطقة الخطر (Danger Zone) تقريباً:", options_en: ["5–60°C", "0–2°C", "70–90°C"], options_ar: ["5-60°C", "0-2°C", "70-90°C"], correct: 0 },
    { difficulty: "Easy", q_en: "Hot holding of food should be kept:", q_ar: "حفظ الطعام الساخن يجب أن يكون:", options_en: ["Below 40°C", "At or above 60°C", "At room temperature"], options_ar: ["أقل من 40°C", "عند أو أعلى من 60°C", "حرارة الغرفة"], correct: 1 },
    { difficulty: "Easy", q_en: "Chiller temperature must be monitored:", q_ar: "مراقبة حرارة البراد تكون:", options_en: ["Only when a complaint happens", "On schedule (daily/shift)", "Once per month"], options_ar: ["فقط عند الشكوى", "حسب الجدول (يومي/شفت)", "مرة بالشهر"], correct: 1 },
    { difficulty: "Easy", q_en: "What does CCP stand for?", q_ar: "ماذا يعني CCP؟", options_en: ["Critical Control Point", "Cold Chain Process", "Clean Closing Procedure"], options_ar: ["نقطة تحكم حرجة", "عملية سلسلة التبريد", "إجراء إغلاق نظيف"], correct: 0 },
    { difficulty: "Easy", q_en: "Bacteria grow fastest:", q_ar: "تتكاثر البكتيريا أسرع:", options_en: ["When frozen", "In the danger zone (5–60°C)", "Above 90°C"], options_ar: ["عند التجميد", "في منطقة الخطر (5–60°C)", "فوق 90°C"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "If CCP monitoring shows a deviation, you must:", q_ar: "عند وجود انحراف في مراقبة الـ CCP يجب:", options_en: ["Ignore it", "Take corrective action and record it", "Hide the record"], options_ar: ["تجاهله", "اتخاذ إجراء تصحيحي وتوثيقه", "إخفاء التسجيل"], correct: 1 },
    { difficulty: "Medium", q_en: "Thermometer calibration is:", q_ar: "معايرة الترمومتر:", options_en: ["Not needed", "Required and documented", "Optional"], options_ar: ["غير ضرورية", "ضرورية وموثقة", "اختيارية"], correct: 1 },
    { difficulty: "Medium", q_en: "Safe core cooking temperature is commonly:", q_ar: "حرارة الطهي المركزية الآمنة شائعاً:", options_en: ["75°C for 30 seconds", "40°C", "50°C"], options_ar: ["75°C لمدة 30 ثانية", "40°C", "50°C"], correct: 0 },
    { difficulty: "Medium", q_en: "Maximum time food should stay in the danger zone (≈22°C):", q_ar: "أقصى وقت لبقاء الغذاء في منطقة الخطر (حوالي 22°C):", options_en: ["About 2 hours", "8 hours", "A full day"], options_ar: ["حوالي ساعتين", "8 ساعات", "يوم كامل"], correct: 0 },
    { difficulty: "Medium", q_en: "Best way to check if food is cooked safely:", q_ar: "أفضل طريقة للتأكد من نضج الطعام بأمان:", options_en: ["By color", "Measure core temperature with a probe", "By smell"], options_ar: ["باللون", "قياس الحرارة المركزية بمسبار", "بالرائحة"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "A critical limit at a cooking CCP is best expressed as:", q_ar: "الحد الحرج عند نقطة طهي حرجة يُعبَّر عنه أفضل بـ:", options_en: ["“Cook well”", "A measurable value, e.g. core ≥75°C", "“Looks done”"], options_ar: ["«اطبخ جيداً»", "قيمة قابلة للقياس مثل القلب ≥75°C", "«يبدو ناضجاً»"], correct: 1 },
    { difficulty: "Hard", q_en: "Two-stage cooling guidance is roughly:", q_ar: "إرشاد التبريد على مرحلتين تقريباً:", options_en: ["60→20°C in 2h then 20→5°C in 4h", "60→5°C in 12h", "No time limit"], options_ar: ["60→20°C خلال ساعتين ثم 20→5°C خلال 4 ساعات", "60→5°C خلال 12 ساعة", "بدون حد زمني"], correct: 0 },
    { difficulty: "Hard", q_en: "Probe thermometers should be calibrated using:", q_ar: "تُعاير موازين المسبار باستخدام:", options_en: ["Boiling oil", "Ice point (0°C) and/or boiling point (100°C)", "Body temperature"], options_ar: ["زيت يغلي", "نقطة الثلج (0°C) و/أو الغليان (100°C)", "حرارة الجسم"], correct: 1 },
    { difficulty: "Hard", q_en: "When a critical limit is breached, affected product should be:", q_ar: "عند تجاوز الحد الحرج، المنتج المتأثر يجب:", options_en: ["Sold quickly", "Held/isolated and assessed before any use", "Mixed with good stock"], options_ar: ["بيعه بسرعة", "عزله/حجزه وتقييمه قبل أي استخدام", "خلطه مع المخزون السليم"], correct: 1 },
    { difficulty: "Hard", q_en: "A probe must be cleaned and sanitized between uses to:", q_ar: "يجب تنظيف وتعقيم المسبار بين الاستخدامات لـ:", options_en: ["Make it shiny", "Prevent cross-contamination between foods", "Save time"], options_ar: ["جعله لامعاً", "منع التلوث المتبادل بين الأطعمة", "توفير الوقت"], correct: 1 },
  ],

  "HACCP Basics": [
    /* ===== Easy / سهل (5) ===== */
    {
      difficulty: "Easy",
      q_ar: "الهاسب يركز على:",
      q_en: "HACCP is mainly about:",
      options_ar: ["ردة فعل بعد الحوادث", "الوقاية من المخاطر مسبقاً", "أوراق فقط"],
      options_en: ["Reacting after incidents", "Preventing hazards proactively", "Only paperwork"],
      correct: 1,
    },
    {
      difficulty: "Easy",
      q_ar: "معنى CCP:",
      q_en: "CCP stands for:",
      options_ar: ["نقطة تحكم حرجة", "إجراء سلسلة تبريد", "سياسة شكاوى"],
      options_en: ["Critical Control Point", "Cold Chain Procedure", "Customer Complaint Policy"],
      correct: 0,
    },
    {
      difficulty: "Easy",
      q_ar: "السجلات مهمة لأنها:",
      q_en: "Records are important because:",
      options_ar: ["غير مهمة", "دليل على التحكم والالتزام", "لتعبئة الملفات"],
      options_en: ["No reason", "Evidence of control & compliance", "To fill storage"],
      correct: 1,
    },
    {
      difficulty: "Easy",
      q_ar: "أنواع مخاطر الغذاء هي:",
      q_en: "Food safety hazards are mainly:",
      options_ar: ["بيولوجية وكيميائية وفيزيائية", "الغبار فقط", "الرائحة فقط"],
      options_en: ["Biological, chemical, physical", "Only dirt", "Only smell"],
      correct: 0,
    },
    {
      difficulty: "Easy",
      q_ar: "من المسؤول عن سلامة الغذاء؟",
      q_en: "Who is responsible for food safety?",
      options_ar: ["المدير فقط", "كل متداول غذاء", "قسم الجودة فقط"],
      options_en: ["Only the manager", "Every food handler", "Only QA"],
      correct: 1,
    },

    /* ===== Medium / متوسط (5) ===== */
    {
      difficulty: "Medium",
      q_ar: "الإجراء التصحيحي يُتخذ عندما:",
      q_en: "Corrective action is taken when:",
      options_ar: ["الحد محقق", "تم تجاوز الحد الحرج", "لا يوجد مراقبة"],
      options_en: ["Limit is met", "Critical limit is exceeded", "No monitoring exists"],
      correct: 1,
    },
    {
      difficulty: "Medium",
      q_ar: "التحقق (Verification) يعني:",
      q_en: "Verification means:",
      options_ar: ["تأكيد أن النظام يعمل", "تجاهل السجلات", "فقط تدريب"],
      options_en: ["Checking the system works", "Skipping records", "Only training"],
      correct: 0,
    },
    {
      difficulty: "Medium",
      q_ar: "الحد الحرج (Critical Limit) هو:",
      q_en: "A critical limit is:",
      options_ar: ["حد قابل للقياس يفصل الآمن عن غير الآمن", "جدول تنظيف", "وقت استراحة الموظفين"],
      options_en: ["A measurable safe/unsafe boundary", "A cleaning schedule", "A staff break time"],
      correct: 0,
    },
    {
      difficulty: "Medium",
      q_ar: "مراقبة نقطة التحكم الحرجة (CCP) تعني:",
      q_en: "Monitoring a CCP means:",
      options_ar: ["فحوصات مجدولة للتأكد من تحقق الحدود", "تنظيف الأرضية", "عدّ الموظفين"],
      options_en: ["Scheduled checks that limits are met", "Cleaning the floor", "Counting staff"],
      correct: 0,
    },
    {
      difficulty: "Medium",
      q_ar: "مثال على نقطة تحكم حرجة (CCP):",
      q_en: "An example of a CCP is:",
      options_ar: ["موقف استلام السيارات", "الطهي حتى درجة الحرارة المركزية المطلوبة", "أرشفة المكتب"],
      options_en: ["Reception parking", "Cooking to required core temperature", "Office filing"],
      correct: 1,
    },

    /* ===== Hard / صعب (5) ===== */
    {
      difficulty: "Hard",
      q_ar: "المبدأ الأول في الهاسب هو:",
      q_en: "The first HACCP principle is:",
      options_ar: ["إجراء تحليل المخاطر", "حفظ السجلات", "تدريب الموظفين"],
      options_en: ["Conduct a hazard analysis", "Keep records", "Train staff"],
      correct: 0,
    },
    {
      difficulty: "Hard",
      q_ar: "الفرق أن الـ Validation (الإثبات):",
      q_en: "Validation differs from verification because validation:",
      options_ar: ["يثبت أن الخطة قادرة على التحكم بالخطر", "مجرد أوراق", "يعني التنظيف"],
      options_en: ["Proves the plan can control the hazard", "Is just paperwork", "Means cleaning"],
      correct: 0,
    },
    {
      difficulty: "Hard",
      q_ar: "عند تجاوز الحد الحرج أول خطوة:",
      q_en: "When a critical limit is breached you first:",
      options_ar: ["تتجاهله إن كان بسيطاً", "تعزل المنتج المتأثر وتتخذ إجراءً تصحيحياً", "تنتظر التدقيق"],
      options_en: ["Ignore it if small", "Isolate affected product & take corrective action", "Wait for the audit"],
      correct: 1,
    },
    {
      difficulty: "Hard",
      q_ar: "يتحول إجراء التحكم إلى نقطة تحكم حرجة عندما:",
      q_en: "A control measure becomes a CCP when:",
      options_ar: ["يكون اختيارياً", "يكون التحكم عنده ضرورياً لمنع/إزالة الخطر", "يكون سهلاً"],
      options_en: ["It is optional", "Control there is essential to prevent/eliminate a hazard", "It is easy"],
      correct: 1,
    },
    {
      difficulty: "Hard",
      q_ar: "الهدف الأساسي من سجلات الهاسب:",
      q_en: "Main purpose of HACCP records is to:",
      options_ar: ["ملء الخزائن", "إثبات بذل العناية الواجبة والتتبّع", "الزينة"],
      options_en: ["Fill cabinets", "Demonstrate due diligence & traceability", "Decoration"],
      correct: 1,
    },
  ],

  "Allergen Control": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Allergens must be:", q_ar: "المسببات التحسسية يجب أن:", options_en: ["Ignored", "Identified, labeled, and controlled", "Mixed with all foods"], options_ar: ["تُهمل", "تُحدد وتُوسم ويتم التحكم بها", "تُخلط مع كل الطعام"], correct: 1 },
    { difficulty: "Easy", q_en: "Which is a common food allergen?", q_ar: "أي مما يلي مسبب حساسية شائع؟", options_en: ["Peanuts/nuts", "Salt", "Water"], options_ar: ["الفول السوداني/المكسرات", "الملح", "الماء"], correct: 0 },
    { difficulty: "Easy", q_en: "Milk and eggs are:", q_ar: "الحليب والبيض هما:", options_en: ["Not allergens", "Common allergens", "Only allergens for children"], options_ar: ["ليسا مسببات حساسية", "مسببات حساسية شائعة", "مسببات للأطفال فقط"], correct: 1 },
    { difficulty: "Easy", q_en: "Cleaning between allergen and non-allergen runs is:", q_ar: "التنظيف بين منتجات فيها حساسية وبدونها:", options_en: ["Not needed", "Mandatory", "Optional"], options_ar: ["غير ضروري", "ضروري", "اختياري"], correct: 1 },
    { difficulty: "Easy", q_en: "Allergen information for a product is found on:", q_ar: "معلومات الحساسية للمنتج توجد على:", options_en: ["The product label", "The floor", "Nowhere"], options_ar: ["ملصق المنتج", "الأرض", "لا مكان"], correct: 0 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Best way to prevent allergen cross-contact:", q_ar: "أفضل طريقة لمنع تلامس مسببات الحساسية:", options_en: ["Same utensils for all", "Dedicated tools + thorough cleaning", "Gloves only"], options_ar: ["نفس الأدوات للجميع", "أدوات مخصصة + تنظيف شامل", "قفازات فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "If a label is missing allergen info, you should:", q_ar: "إذا كان الملصق ناقص معلومات الحساسية يجب:", options_en: ["Sell anyway", "Hold the product and inform QA", "Write it by pen and continue"], options_ar: ["نبيع", "نعزل المنتج ونبلغ QA", "نكتب بالقلم ونكمل"], correct: 1 },
    { difficulty: "Medium", q_en: "Allergen training mainly helps to prevent:", q_ar: "تدريب الحساسية يساعد أساساً على منع:", options_en: ["Only complaints", "Severe consumer reactions", "Temperature deviation"], options_ar: ["الشكاوى فقط", "تفاعلات خطيرة للمستهلك", "انحراف الحرارة"], correct: 1 },
    { difficulty: "Medium", q_en: "When changing from an allergen to a non-allergen batch you should:", q_ar: "عند الانتقال من دفعة فيها حساسية إلى أخرى بدون يجب:", options_en: ["Continue directly", "Do a full clean-down first", "Just wipe quickly"], options_ar: ["المتابعة مباشرة", "إجراء تنظيف كامل أولاً", "مسح سريع فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "If a customer asks about allergens, staff should:", q_ar: "إذا سأل زبون عن مسببات الحساسية يجب على الموظف:", options_en: ["Guess", "Give accurate info from the label/recipe or refer to supervisor", "Say there are none"], options_ar: ["التخمين", "إعطاء معلومة دقيقة من الملصق/الوصفة أو الرجوع للمشرف", "القول لا يوجد"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "Roughly how many allergens are legally regulated (EU/GSO)?", q_ar: "كم عدد مسببات الحساسية المنظّمة قانونياً تقريباً (EU/GSO)؟", options_en: ["14", "3", "50"], options_ar: ["14", "3", "50"], correct: 0 },
    { difficulty: "Hard", q_en: "“May contain” precautionary labeling should be:", q_ar: "ملصق التحذير «قد يحتوي» يجب أن يكون:", options_en: ["Used to replace cleaning", "Based on a risk assessment, not a substitute for GMP", "Put on everything"], options_ar: ["بديلاً عن التنظيف", "مبنياً على تقييم مخاطر وليس بديلاً عن ممارسات التصنيع الجيدة", "يوضع على كل شيء"], correct: 1 },
    { difficulty: "Hard", q_en: "To control allergens in production, scheduling should:", q_ar: "للتحكم بالحساسية في الإنتاج، الجدولة يجب أن:", options_en: ["Run allergen products last and clean down after", "Run them first thing then ignore", "Not matter"], options_ar: ["تشغّل منتجات الحساسية آخراً مع تنظيف بعدها", "تشغّلها أولاً ثم تتجاهل", "لا تهم"], correct: 0 },
    { difficulty: "Hard", q_en: "A hidden allergen risk often comes from:", q_ar: "خطر الحساسية الخفي غالباً يأتي من:", options_en: ["Plain water", "Compound ingredients (sauces, spice mixes)", "Clean tables"], options_ar: ["الماء العادي", "المكونات المركبة (الصلصات، خلطات التوابل)", "الطاولات النظيفة"], correct: 1 },
    { difficulty: "Hard", q_en: "Verifying allergen clean-down is best done by:", q_ar: "التحقق من التنظيف ضد الحساسية يُفضّل بـ:", options_en: ["Assuming it's fine", "Visual + allergen-specific swab/test kits", "Smell only"], options_ar: ["افتراض أنه سليم", "فحص بصري + مسحات/كواشف خاصة بالحساسية", "الرائحة فقط"], correct: 1 },
  ],

  "Cross Contamination Control": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Cross contamination means:", q_ar: "التلوث المتبادل يعني:", options_en: ["Food going cold", "Transfer of harmful microbes/allergens from one item to another", "Food drying out"], options_ar: ["برودة الطعام", "انتقال الميكروبات/مسببات الحساسية الضارة من شيء لآخر", "جفاف الطعام"], correct: 1 },
    { difficulty: "Easy", q_en: "Best action to prevent cross contamination is:", q_ar: "أفضل إجراء لمنع التلوث المتبادل هو:", options_en: ["Mix raw with ready-to-eat", "Separate raw vs RTE and use dedicated tools", "Leave food uncovered"], options_ar: ["خلط النيء مع الجاهز", "فصل النيء عن الجاهز واستخدام أدوات مخصصة", "ترك الطعام مكشوف"], correct: 1 },
    { difficulty: "Easy", q_en: "Color coding of boards/tools helps to:", q_ar: "ترميز الألوان للألواح/الأدوات يساعد على:", options_en: ["Increase speed only", "Reduce cross contamination", "Save electricity"], options_ar: ["زيادة السرعة فقط", "تقليل التلوث المتبادل", "توفير كهرباء"], correct: 1 },
    { difficulty: "Easy", q_en: "After handling phone or money you should:", q_ar: "بعد لمس الهاتف أو المال يجب:", options_en: ["Continue working", "Wash hands / change gloves", "Sanitize the product"], options_ar: ["نكمل العمل", "غسل اليدين / تغيير القفازات", "تعقيم المنتج"], correct: 1 },
    { difficulty: "Easy", q_en: "Raw and cooked foods should be:", q_ar: "الأطعمة النيئة والمطبوخة يجب:", options_en: ["Kept together", "Kept separate", "Touching is fine"], options_ar: ["إبقاؤها معاً", "إبقاؤها منفصلة", "تلامسها مقبول"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "In a chiller, drip contamination is prevented by:", q_ar: "داخل البراد يُمنع تلوث التنقيط عبر:", options_en: ["Raw above ready-to-eat", "Raw below ready-to-eat (top-to-bottom rule)", "No order"], options_ar: ["النيء فوق الجاهز", "النيء أسفل الجاهز (قاعدة الأعلى للأسفل)", "بدون ترتيب"], correct: 1 },
    { difficulty: "Medium", q_en: "When sharing a work surface between tasks you must:", q_ar: "عند مشاركة سطح عمل بين مهام مختلفة يجب:", options_en: ["Leave it as is", "Clean and sanitize before next use", "Only cover it"], options_ar: ["تركه كما هو", "تنظيفه وتعقيمه قبل الاستخدام التالي", "تغطيته فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "The 3 main types of contamination are:", q_ar: "الأنواع الثلاثة الرئيسية للتلوث هي:", options_en: ["Hot, cold, warm", "Biological, chemical, physical", "Red, green, blue"], options_ar: ["ساخن، بارد، دافئ", "بيولوجي، كيميائي، فيزيائي", "أحمر، أخضر، أزرق"], correct: 1 },
    { difficulty: "Medium", q_en: "A cloth used to wipe raw meat then ready-to-eat food is:", q_ar: "قطعة قماش تمسح اللحم النيء ثم الطعام الجاهز هي:", options_en: ["Fine if it looks clean", "A cross-contamination risk — use separate/color-coded cloths", "Better than paper"], options_ar: ["جيدة إن بدت نظيفة", "خطر تلوث متبادل — استخدم قماش منفصل/ملون", "أفضل من الورق"], correct: 1 },
    { difficulty: "Medium", q_en: "Physical contamination examples include:", q_ar: "أمثلة التلوث الفيزيائي تشمل:", options_en: ["Bacteria", "Glass, metal, hair, plastic pieces", "Cleaning chemicals"], options_ar: ["البكتيريا", "الزجاج، المعدن، الشعر، قطع البلاستيك", "مواد التنظيف"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "The highest-risk cross-contamination route in a butchery is:", q_ar: "أعلى مسار خطر للتلوث المتبادل في الملحمة هو:", options_en: ["Clean packaging", "Raw meat juices contacting ready-to-eat food/surfaces", "Cold water"], options_ar: ["التغليف النظيف", "ملامسة عصارة اللحم النيء للطعام/الأسطح الجاهزة", "الماء البارد"], correct: 1 },
    { difficulty: "Hard", q_en: "Best engineering control to separate raw and RTE flow is:", q_ar: "أفضل ضابط هندسي لفصل مسار النيء والجاهز هو:", options_en: ["One bench for all", "Separate areas/equipment and one-directional workflow", "Working faster"], options_ar: ["طاولة واحدة للكل", "مناطق/معدات منفصلة ومسار عمل أحادي الاتجاه", "العمل أسرع"], correct: 1 },
    { difficulty: "Hard", q_en: "Allergen cross-contact differs from microbial because it:", q_ar: "تلامس الحساسية يختلف عن الميكروبي لأنه:", options_en: ["Is killed by cooking", "Is NOT removed by cooking — needs physical separation/cleaning", "Is harmless"], options_ar: ["يُقتل بالطهي", "لا يُزال بالطهي — يحتاج فصلاً/تنظيفاً فيزيائياً", "غير ضار"], correct: 1 },
    { difficulty: "Hard", q_en: "Hand contact surfaces (handles, taps) should be cleaned:", q_ar: "أسطح ملامسة اليد (المقابض، الصنابير) تُنظّف:", options_en: ["Yearly", "Frequently — they are high-touch contamination points", "Never"], options_ar: ["سنوياً", "بشكل متكرر — نقاط تلامس عالية الخطورة", "أبداً"], correct: 1 },
    { difficulty: "Hard", q_en: "Verifying separation controls work is done by:", q_ar: "التحقق من فعالية ضوابط الفصل يتم عبر:", options_en: ["Assuming staff comply", "Audits, swabbing, and monitoring records", "Asking once a year"], options_ar: ["افتراض التزام الموظفين", "التدقيق والمسحات وسجلات المراقبة", "السؤال مرة بالسنة"], correct: 1 },
  ],

  "Chemical Safety (Food + OHS)": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Chemical containers must be:", q_ar: "يجب أن تكون عبوات المواد الكيميائية:", options_en: ["Unlabeled", "Labeled and stored in a designated area", "Stored above food"], options_ar: ["بدون ملصق", "موسومة ومخزّنة بمكان مخصص", "فوق الغذاء"], correct: 1 },
    { difficulty: "Easy", q_en: "SDS stands for:", q_ar: "SDS تعني:", options_en: ["Safety Data Sheet", "Storage Daily System", "Sanitation Design Standard"], options_ar: ["نشرة بيانات السلامة", "نظام تخزين يومي", "معيار تصميم"], correct: 0 },
    { difficulty: "Easy", q_en: "PPE when handling chemicals:", q_ar: "معدات الوقاية عند التعامل مع الكيميائيات:", options_en: ["Not needed", "Gloves/eye protection as per SDS", "Apron only"], options_ar: ["غير ضروري", "قفازات/نظارات حسب SDS", "مريول فقط"], correct: 1 },
    { difficulty: "Easy", q_en: "Chemicals must be stored:", q_ar: "المواد الكيميائية تُخزّن:", options_en: ["Next to food", "Away from food, in a locked/designated store", "On the prep table"], options_ar: ["جنب الطعام", "بعيداً عن الطعام، في مخزن مخصص/مغلق", "على طاولة التحضير"], correct: 1 },
    { difficulty: "Easy", q_en: "Never put a chemical into:", q_ar: "لا تضع أبداً مادة كيميائية في:", options_en: ["Its labeled container", "An unlabeled food/drink bottle", "A storage cabinet"], options_ar: ["عبوتها الموسومة", "زجاجة طعام/شراب غير موسومة", "خزانة تخزين"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Mixing chemicals is:", q_ar: "خلط المواد الكيميائية:", options_en: ["Allowed anytime", "Not allowed unless instructed by SOP", "Recommended"], options_ar: ["مسموح دائماً", "ممنوع إلا حسب إجراء العمل", "مفضّل"], correct: 1 },
    { difficulty: "Medium", q_en: "Chemical dilution/dosage must be:", q_ar: "تخفيف/جرعة المواد الكيميائية يجب أن تكون:", options_en: ["Random", "As per SOP with correct measurement", "Always the highest dose"], options_ar: ["عشوائية", "حسب الإجراء بالقياس الصحيح", "أعلى جرعة دائماً"], correct: 1 },
    { difficulty: "Medium", q_en: "Mixing bleach with acid descaler can release:", q_ar: "خلط الكلور مع مزيل الترسبات الحمضي قد يطلق:", options_en: ["Clean steam", "Toxic chlorine gas", "Harmless foam"], options_ar: ["بخار نظيف", "غاز كلور سام", "رغوة غير ضارة"], correct: 1 },
    { difficulty: "Medium", q_en: "Where do you find safe-use and first-aid info for a chemical?", q_ar: "أين تجد معلومات الاستخدام الآمن والإسعافات لمادة كيميائية؟", options_en: ["On the SDS", "On the calendar", "Ask a colleague only"], options_ar: ["في نشرة بيانات السلامة SDS", "على التقويم", "اسأل زميلاً فقط"], correct: 0 },
    { difficulty: "Medium", q_en: "After sanitizing a food-contact surface with chemical, you often need to:", q_ar: "بعد تعقيم سطح ملامس للغذاء بمادة كيميائية غالباً يجب:", options_en: ["Leave residue", "Rinse if required by the product, observe contact time", "Use more chemical"], options_ar: ["ترك البقايا", "الشطف إن تطلب المنتج، مع مراعاة زمن التماس", "استخدام كمية أكثر"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "On an SDS, exposure first-aid measures are found in the section on:", q_ar: "في نشرة SDS تُوجد إجراءات الإسعاف عند التعرض في قسم:", options_en: ["First-aid measures", "Disposal", "Company logo"], options_ar: ["تدابير الإسعافات الأولية", "التخلص", "شعار الشركة"], correct: 0 },
    { difficulty: "Hard", q_en: "A chemical splash to the eye should be treated by:", q_ar: "رذاذ كيميائي في العين يُعالج بـ:", options_en: ["Rubbing the eye", "Rinsing with water 15+ min and seeking medical help", "Closing it and waiting"], options_ar: ["فرك العين", "الشطف بالماء 15 دقيقة+ وطلب المساعدة الطبية", "إغلاقها والانتظار"], correct: 1 },
    { difficulty: "Hard", q_en: "The main reason food-grade lubricants/chemicals are used near the line:", q_ar: "السبب الرئيسي لاستخدام مواد/مزلّقات صالحة للغذاء قرب الخط:", options_en: ["They are cheaper", "To avoid toxic chemical contamination of food", "They smell nice"], options_ar: ["أرخص", "لتجنب تلوث الغذاء بمواد سامة", "رائحتها جميلة"], correct: 1 },
    { difficulty: "Hard", q_en: "Decanted chemical solutions must always be:", q_ar: "المحاليل الكيميائية المنقولة يجب دائماً أن:", options_en: ["Left unlabeled", "Labeled with name, concentration and hazard", "Mixed with water randomly"], options_ar: ["تُترك بدون وسم", "تُوسم بالاسم والتركيز والخطر", "تُخلط بالماء عشوائياً"], correct: 1 },
    { difficulty: "Hard", q_en: "Chemical spill response should follow:", q_ar: "الاستجابة لانسكاب كيميائي يجب أن تتبع:", options_en: ["No plan", "The SDS + site spill procedure with correct PPE", "Pour water on everything"], options_ar: ["بدون خطة", "نشرة SDS + إجراء الانسكاب بالموقع مع معدات الوقاية", "صب الماء على كل شيء"], correct: 1 },
  ],

  "Pest Control Awareness": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Signs of pests include:", q_ar: "من علامات وجود آفات:", options_en: ["Droppings/insects", "Nice smell", "Wall color"], options_ar: ["فضلات/حشرات", "رائحة طيبة", "لون الجدار"], correct: 0 },
    { difficulty: "Easy", q_en: "If you see a pest you should:", q_ar: "عند رؤية آفة يجب:", options_en: ["Ignore it", "Report immediately and record", "Spray pesticide yourself"], options_ar: ["تجاهل", "الإبلاغ فوراً والتوثيق", "رش مبيد بنفسك"], correct: 1 },
    { difficulty: "Easy", q_en: "Pesticides should be applied by:", q_ar: "مبيدات الآفات تُطبّق بواسطة:", options_en: ["Any staff", "An approved pest control vendor only", "The customer"], options_ar: ["أي موظف", "شركة مكافحة آفات معتمدة فقط", "الزبون"], correct: 1 },
    { difficulty: "Easy", q_en: "External doors should be kept:", q_ar: "الأبواب الخارجية يجب أن تبقى:", options_en: ["Open for air", "Closed / fitted with screens or strip curtains", "Propped open all day"], options_ar: ["مفتوحة للتهوية", "مغلقة / مزوّدة بشبك أو ستائر شرائحية", "مفتوحة طوال اليوم"], correct: 1 },
    { difficulty: "Easy", q_en: "Good waste management helps to:", q_ar: "إدارة النفايات الجيدة تساعد على:", options_en: ["Attract pests", "Reduce pest attraction", "No relation"], options_ar: ["جذب الآفات", "تقليل جذب الآفات", "لا علاقة"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Bait stations/traps should be:", q_ar: "محطات الطعوم/المصائد يجب:", options_en: ["Moved around", "Not touched or relocated by staff", "Cleaned with food"], options_ar: ["تحريكها", "عدم لمسها أو نقلها من قبل الموظفين", "تنظيفها بالطعام"], correct: 1 },
    { difficulty: "Medium", q_en: "The 3 main pest groups in food premises are:", q_ar: "المجموعات الرئيسية الثلاث للآفات في المنشآت الغذائية:", options_en: ["Rodents, insects, birds", "Cats, dogs, fish", "Plants, dust, mold"], options_ar: ["القوارض، الحشرات، الطيور", "القطط، الكلاب، الأسماك", "النباتات، الغبار، العفن"], correct: 0 },
    { difficulty: "Medium", q_en: "Best way to deny pests food and harborage is:", q_ar: "أفضل طريقة لحرمان الآفات من الغذاء والمأوى:", options_en: ["Leave crumbs", "Good housekeeping, sealed bins, no clutter", "Keep doors open"], options_ar: ["ترك الفتات", "نظافة جيدة، سلال مغلقة، بلا فوضى", "إبقاء الأبواب مفتوحة"], correct: 1 },
    { difficulty: "Medium", q_en: "Gaps around pipes/walls should be:", q_ar: "الفجوات حول الأنابيب/الجدران يجب:", options_en: ["Left open", "Proofed/sealed to deny entry", "Widened"], options_ar: ["تُترك مفتوحة", "إغلاقها/سدّها لمنع الدخول", "توسيعها"], correct: 1 },
    { difficulty: "Medium", q_en: "Pest sightings should be recorded in:", q_ar: "مشاهدات الآفات تُسجّل في:", options_en: ["Nowhere", "A pest sighting/log report for the contractor", "A personal note"], options_ar: ["لا مكان", "سجل مشاهدات الآفات للمتعهد", "ملاحظة شخصية"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "IPM (Integrated Pest Management) relies mainly on:", q_ar: "الإدارة المتكاملة للآفات (IPM) تعتمد أساساً على:", options_en: ["Spraying pesticide everywhere", "Prevention, monitoring and targeted control", "Ignoring small pests"], options_ar: ["رش المبيد بكل مكان", "الوقاية والمراقبة والمكافحة المستهدفة", "تجاهل الآفات الصغيرة"], correct: 1 },
    { difficulty: "Hard", q_en: "Why are insect-electrocutor (EFK) units placed away from open food?", q_ar: "لماذا تُوضع أجهزة صعق الحشرات بعيداً عن الغذاء المكشوف؟", options_en: ["For looks", "To avoid shattered insect parts contaminating food", "To save power"], options_ar: ["للمظهر", "لتجنب تلوث الغذاء بأجزاء الحشرات المتطايرة", "لتوفير الطاقة"], correct: 1 },
    { difficulty: "Hard", q_en: "The pest control contractor's report should be:", q_ar: "تقرير متعهد مكافحة الآفات يجب أن:", options_en: ["Thrown away", "Reviewed and actions closed out by the site", "Filed unread"], options_ar: ["يُرمى", "يُراجع وتُغلق الإجراءات من قبل الموقع", "يُحفظ دون قراءة"], correct: 1 },
    { difficulty: "Hard", q_en: "A bait station map/plan is kept mainly to:", q_ar: "تُحفظ خريطة/خطة محطات الطعوم أساساً لـ:", options_en: ["Decoration", "Verify all stations are present and checked", "Confuse auditors"], options_ar: ["الزينة", "التحقق من وجود كل المحطات وفحصها", "إرباك المدققين"], correct: 1 },
    { difficulty: "Hard", q_en: "Rodent gnaw marks and smear marks indicate:", q_ar: "آثار قضم القوارض وعلامات التلطّخ تشير إلى:", options_en: ["Old damage only", "An active infestation needing urgent action", "Nothing important"], options_ar: ["ضرر قديم فقط", "إصابة نشطة تحتاج إجراءً عاجلاً", "لا شيء مهم"], correct: 1 },
  ],

  "Waste Management": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Waste bins should be:", q_ar: "سلال النفايات يجب أن تكون:", options_en: ["Always open", "Covered, with liners, foot-operated", "Inside the processing line"], options_ar: ["مفتوحة دائماً", "مغطّاة، مع بطانات، تُفتح بالقدم", "داخل خط الإنتاج"], correct: 1 },
    { difficulty: "Easy", q_en: "Waste should be segregated into:", q_ar: "يجب فصل النفايات إلى:", options_en: ["One type only", "Food/general/hazardous (if any)", "Depends on mood"], options_ar: ["نوع واحد", "غذائية/عامة/خطرة (إن وجدت)", "حسب المزاج"], correct: 1 },
    { difficulty: "Easy", q_en: "Cleaning/disinfecting bins is:", q_ar: "تنظيف وتعقيم سلال النفايات:", options_en: ["Not needed", "Required regularly", "Once a year"], options_ar: ["غير ضروري", "ضروري وبشكل دوري", "مرة بالسنة"], correct: 1 },
    { difficulty: "Easy", q_en: "Waste in production areas should be removed:", q_ar: "النفايات في مناطق الإنتاج تُزال:", options_en: ["At end of week", "Regularly/before overflowing", "Never"], options_ar: ["نهاية الأسبوع", "بانتظام/قبل الامتلاء", "أبداً"], correct: 1 },
    { difficulty: "Easy", q_en: "Overflowing waste mainly attracts:", q_ar: "النفايات الفائضة تجذب أساساً:", options_en: ["Customers", "Pests", "Cold air"], options_ar: ["الزبائن", "الآفات", "الهواء البارد"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Condemned/expired items should be:", q_ar: "المنتجات المعدمة/المنتهية يتم:", options_en: ["Returned to display", "Isolated and safely disposed", "Stored with good stock"], options_ar: ["إعادتها للعرض", "عزلها والتخلص الآمن منها", "تخزينها مع السليم"], correct: 1 },
    { difficulty: "Medium", q_en: "Prevent contamination during waste handling by:", q_ar: "منع التلوث أثناء نقل النفايات يكون عبر:", options_en: ["Carrying it over food", "Using PPE and the correct route", "Leaving it on the floor"], options_ar: ["نقلها فوق الطعام", "استخدام معدات الوقاية والمسار الصحيح", "تركها على الأرض"], correct: 1 },
    { difficulty: "Medium", q_en: "After handling waste, a food handler must:", q_ar: "بعد التعامل مع النفايات، يجب على متداول الغذاء:", options_en: ["Continue directly", "Wash hands / change gloves before food", "Just wipe gloves"], options_ar: ["المتابعة مباشرة", "غسل اليدين / تغيير القفازات قبل الطعام", "مسح القفازات فقط"], correct: 1 },
    { difficulty: "Medium", q_en: "External waste storage area should be:", q_ar: "منطقة تخزين النفايات الخارجية يجب أن تكون:", options_en: ["Next to raw material intake", "Away from food areas, clean, pest-proof", "Inside the chiller"], options_ar: ["جنب استلام المواد الخام", "بعيدة عن مناطق الغذاء، نظيفة، مقاومة للآفات", "داخل البراد"], correct: 1 },
    { difficulty: "Medium", q_en: "Used cooking oil waste should be:", q_ar: "نفايات زيت الطهي المستعمل يجب:", options_en: ["Poured down the drain", "Collected in sealed containers for approved disposal", "Mixed with general waste"], options_ar: ["صبّه في المجاري", "جمعه في عبوات مغلقة للتخلص المعتمد", "خلطه مع النفايات العامة"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "Waste flow should never cross the path of:", q_ar: "مسار النفايات يجب ألا يتقاطع أبداً مع مسار:", options_en: ["Empty corridors", "Incoming raw materials / clean product", "The car park"], options_ar: ["الممرات الفارغة", "المواد الخام الواردة / المنتج النظيف", "موقف السيارات"], correct: 1 },
    { difficulty: "Hard", q_en: "Why keep waste-disposal records and contractor receipts?", q_ar: "لماذا نحتفظ بسجلات التخلص وإيصالات المتعهد؟", options_en: ["No reason", "Traceability and legal/due-diligence compliance", "To fill files"], options_ar: ["بدون سبب", "للتتبّع والامتثال القانوني/بذل العناية", "لملء الملفات"], correct: 1 },
    { difficulty: "Hard", q_en: "Animal by-product / condemned meat waste typically needs:", q_ar: "نفايات المنتجات الحيوانية الثانوية/اللحم المُعدَم تحتاج عادةً:", options_en: ["Normal bin", "Segregation and licensed/specialized disposal", "Compost at home"], options_ar: ["سلة عادية", "فصلاً وتخلصاً مرخّصاً/متخصصاً", "تسميداً بالمنزل"], correct: 1 },
    { difficulty: "Hard", q_en: "Internal waste bins are best when they are:", q_ar: "سلال النفايات الداخلية تكون أفضل عندما تكون:", options_en: ["Hand-opened lids", "Hands-free (foot pedal) and lidded", "No lid for speed"], options_ar: ["تُفتح باليد", "بلا لمس (دواسة قدم) وبغطاء", "بلا غطاء للسرعة"], correct: 1 },
    { difficulty: "Hard", q_en: "Segregating recyclable/cardboard waste mainly helps:", q_ar: "فصل النفايات القابلة للتدوير/الكرتون يساعد أساساً:", options_en: ["Nothing", "Reduce pests/clutter and support environmental compliance", "Slow the work"], options_ar: ["لا شيء", "تقليل الآفات/الفوضى ودعم الامتثال البيئي", "إبطاء العمل"], correct: 1 },
  ],

  "OHS: PPE & Safe Work": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "PPE should be:", q_ar: "معدات الوقاية الشخصية يجب أن:", options_en: ["Optional", "Worn as required and kept clean", "Shared without cleaning"], options_ar: ["اختيارية", "تُلبس حسب المطلوب وتبقى نظيفة", "تُشارك بدون تنظيف"], correct: 1 },
    { difficulty: "Easy", q_en: "Emergency exits must be:", q_ar: "مخارج الطوارئ يجب أن تكون:", options_en: ["Blocked", "Clear at all times", "Used for storage"], options_ar: ["مغلقة", "خالية دائماً", "تستخدم للتخزين"], correct: 1 },
    { difficulty: "Easy", q_en: "A near-miss must be:", q_ar: "الحادث القريب (Near-miss) يجب أن:", options_en: ["Ignored", "Reported", "Hidden"], options_ar: ["يُهمل", "يُبلّغ عنه", "يُخفى"], correct: 1 },
    { difficulty: "Easy", q_en: "Slips and trips are prevented by:", q_ar: "منع الانزلاق/التعثر يكون عبر:", options_en: ["Wet floors", "Good housekeeping and dry floors", "Running"], options_ar: ["أرضية مبللة", "ترتيب المكان وتجفيف الأرضية", "الركض"], correct: 1 },
    { difficulty: "Easy", q_en: "A wet floor should have:", q_ar: "الأرضية المبللة يجب أن يوضع لها:", options_en: ["Nothing", "A warning/wet-floor sign", "More water"], options_ar: ["لا شيء", "لافتة تحذير أرضية مبللة", "مزيد من الماء"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Safe behavior includes:", q_ar: "السلوك الآمن يشمل:", options_en: ["Running", "Awareness and communication", "Ignoring signs"], options_ar: ["الركض", "الانتباه والتواصل", "تجاهل الإشارات"], correct: 1 },
    { difficulty: "Medium", q_en: "Damaged PPE should be:", q_ar: "معدات الوقاية التالفة يجب:", options_en: ["Used until shift end", "Replaced before use", "Repaired with tape"], options_ar: ["استخدامها حتى نهاية الشفت", "استبدالها قبل الاستخدام", "إصلاحها بالشريط"], correct: 1 },
    { difficulty: "Medium", q_en: "Cut-resistant gloves are mainly used for:", q_ar: "القفازات المقاومة للقطع تُستخدم أساساً لـ:", options_en: ["Hot pans", "Knife/blade tasks (boning, slicing)", "Writing"], options_ar: ["الأواني الساخنة", "مهام السكاكين/الشفرات (التعظيم، التقطيع)", "الكتابة"], correct: 1 },
    { difficulty: "Medium", q_en: "Before cleaning/clearing a jam in machinery you must:", q_ar: "قبل تنظيف/إزالة انحشار في آلة يجب:", options_en: ["Leave it running", "Isolate/lockout the power first", "Use bare hands fast"], options_ar: ["تركها تعمل", "عزل/فصل الطاقة أولاً", "استخدام اليد بسرعة"], correct: 1 },
    { difficulty: "Medium", q_en: "If you spot an unsafe condition you should:", q_ar: "إذا لاحظت حالة غير آمنة يجب:", options_en: ["Ignore it", "Report it and make the area safe", "Wait for an accident"], options_ar: ["تجاهلها", "الإبلاغ عنها وتأمين المكان", "انتظار وقوع حادث"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "The aim of a risk assessment is to:", q_ar: "هدف تقييم المخاطر هو:", options_en: ["Blame staff", "Identify hazards and put controls before harm occurs", "Fill paperwork"], options_ar: ["لوم الموظفين", "تحديد المخاطر ووضع ضوابط قبل وقوع الضرر", "ملء الأوراق"], correct: 1 },
    { difficulty: "Hard", q_en: "In the hierarchy of controls, PPE is:", q_ar: "في تسلسل الضوابط، معدات الوقاية الشخصية هي:", options_en: ["The first choice", "The last line of defense", "Never used"], options_ar: ["الخيار الأول", "خط الدفاع الأخير", "لا تُستخدم أبداً"], correct: 1 },
    { difficulty: "Hard", q_en: "Lockout/Tagout (LOTO) is used to:", q_ar: "نظام العزل والتعليم (LOTO) يُستخدم لـ:", options_en: ["Lock the store", "Isolate energy so machines can't start during maintenance", "Tag products"], options_ar: ["إغلاق المخزن", "عزل الطاقة لمنع تشغيل الآلات أثناء الصيانة", "وسم المنتجات"], correct: 1 },
    { difficulty: "Hard", q_en: "Reporting near-misses is important because they:", q_ar: "الإبلاغ عن الحوادث القريبة مهم لأنها:", options_en: ["Are funny", "Warn of conditions that could cause a real injury", "Don't matter"], options_ar: ["مضحكة", "تنذر بظروف قد تسبب إصابة حقيقية", "لا تهم"], correct: 1 },
    { difficulty: "Hard", q_en: "A permit-to-work is typically required for:", q_ar: "تصريح العمل يُطلب عادةً لـ:", options_en: ["Routine cleaning", "High-risk work (hot work, confined space, work at height)", "Answering phones"], options_ar: ["التنظيف الروتيني", "الأعمال عالية الخطورة (عمل ساخن، أماكن مغلقة، عمل بارتفاع)", "الرد على الهاتف"], correct: 1 },
  ],

  "OHS: Manual Handling": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Correct lifting technique includes:", q_ar: "الطريقة الصحيحة للرفع تشمل:", options_en: ["Bending the back", "Bending the knees and keeping the load close", "Twisting quickly"], options_ar: ["ثني الظهر", "ثني الركب وحمل الحمولة قريبة", "اللف بسرعة"], correct: 1 },
    { difficulty: "Easy", q_en: "If a load is too heavy you should:", q_ar: "إذا كانت الحمولة ثقيلة جداً يجب:", options_en: ["Lift alone", "Ask for help or use equipment", "Throw it"], options_ar: ["الرفع لوحدك", "طلب مساعدة أو استخدام معدات", "رميها"], correct: 1 },
    { difficulty: "Easy", q_en: "Manual handling injuries often affect the:", q_ar: "إصابات المناولة اليدوية غالباً تصيب:", options_en: ["Hair", "Back and shoulders", "Eyes"], options_ar: ["الشعر", "الظهر والكتفين", "العينين"], correct: 1 },
    { difficulty: "Easy", q_en: "Before lifting, you should first:", q_ar: "قبل الرفع يجب أولاً:", options_en: ["Check the path and plan the lift", "Close your eyes", "Run"], options_ar: ["فحص المسار والتخطيط للرفع", "إغماض العينين", "الركض"], correct: 0 },
    { difficulty: "Easy", q_en: "When carrying a load you should hold it:", q_ar: "عند حمل حمولة يجب الإمساك بها:", options_en: ["Far from the body", "Close to the body", "On one finger"], options_ar: ["بعيداً عن الجسم", "قريبة من الجسم", "على إصبع واحد"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Repetitive lifting risk can be reduced by:", q_ar: "تقليل مخاطر الرفع المتكرر يكون عبر:", options_en: ["No breaks", "Job rotation and breaks", "More speed"], options_ar: ["بدون استراحة", "تدوير المهام والاستراحات", "زيادة السرعة"], correct: 1 },
    { difficulty: "Medium", q_en: "To change direction while carrying a load you should:", q_ar: "لتغيير الاتجاه أثناء حمل حمولة يجب:", options_en: ["Twist the spine", "Move your feet to turn", "Jump"], options_ar: ["لف العمود الفقري", "تحريك القدمين للدوران", "القفز"], correct: 1 },
    { difficulty: "Medium", q_en: "For very heavy or bulky loads, the best option is:", q_ar: "للأحمال الثقيلة أو الكبيرة جداً، الخيار الأفضل:", options_en: ["Lift quickly", "Use a trolley/aid or team lift", "Drag on the floor"], options_ar: ["الرفع بسرعة", "استخدام عربة/مساعد أو رفع جماعي", "السحب على الأرض"], correct: 1 },
    { difficulty: "Medium", q_en: "When lifting, your feet should be:", q_ar: "عند الرفع، يجب أن تكون القدمان:", options_en: ["Together", "Shoulder-width apart for a stable base", "Crossed"], options_ar: ["متلاصقتين", "بعرض الكتفين لقاعدة ثابتة", "متقاطعتين"], correct: 1 },
    { difficulty: "Medium", q_en: "In cold-store/freezer work, manual handling risk increases due to:", q_ar: "في العمل بالمجمدات، يزيد خطر المناولة بسبب:", options_en: ["Warm air", "Slippery/icy floors and bulky PPE", "Bright lights"], options_ar: ["الهواء الدافئ", "الأرضيات الزلقة/الجليدية ومعدات الوقاية الضخمة", "الإضاءة الساطعة"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "TILE in manual handling assessment stands for:", q_ar: "اختصار TILE في تقييم المناولة يعني:", options_en: ["Task, Individual, Load, Environment", "Time, Item, Lift, Energy", "Tool, Index, Level, Edge"], options_ar: ["المهمة، الفرد، الحمولة، البيئة", "الوقت، العنصر، الرفع، الطاقة", "الأداة، المؤشر، المستوى، الحافة"], correct: 0 },
    { difficulty: "Hard", q_en: "The first step in controlling manual handling risk is to:", q_ar: "الخطوة الأولى للتحكم بخطر المناولة هي:", options_en: ["Buy back belts", "Avoid the manual handling where reasonably possible", "Lift faster"], options_ar: ["شراء أحزمة ظهر", "تجنّب المناولة اليدوية حيثما أمكن", "الرفع أسرع"], correct: 1 },
    { difficulty: "Hard", q_en: "Holding a load away from the body increases:", q_ar: "حمل الحمولة بعيداً عن الجسم يزيد:", options_en: ["Comfort", "The load/stress on the lower back", "Lifting speed safely"], options_ar: ["الراحة", "الحمل/الإجهاد على أسفل الظهر", "سرعة الرفع بأمان"], correct: 1 },
    { difficulty: "Hard", q_en: "A team lift requires:", q_ar: "الرفع الجماعي يتطلب:", options_en: ["Everyone lifting randomly", "One person to coordinate and a planned route", "The strongest to do it all"], options_ar: ["رفع الجميع عشوائياً", "شخصاً واحداً للتنسيق ومساراً مخططاً", "أن يقوم الأقوى بكل شيء"], correct: 1 },
    { difficulty: "Hard", q_en: "Pushing a loaded trolley is generally preferred over pulling because:", q_ar: "دفع العربة المحمّلة يُفضّل عموماً على سحبها لأن:", options_en: ["It's slower", "It puts less strain on the back", "It looks better"], options_ar: ["أبطأ", "يضع إجهاداً أقل على الظهر", "يبدو أفضل"], correct: 1 },
  ],

  "OHS: Knife Safety": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "A safer knife to work with is:", q_ar: "السكين الأكثر أماناً للعمل هي:", options_en: ["A blunt knife", "A sharp, well-maintained knife", "Any rusty knife"], options_ar: ["سكين غير حادة", "سكين حادة وبحالة جيدة", "أي سكين صدئة"], correct: 1 },
    { difficulty: "Easy", q_en: "When carrying a knife you should:", q_ar: "عند حمل السكين يجب:", options_en: ["Wave it around", "Hold it point down, blade back, close to your side", "Run with it"], options_ar: ["تحريكها في الهواء", "إمساكها والطرف للأسفل والنصل للخلف قرب الجسم", "الركض بها"], correct: 1 },
    { difficulty: "Easy", q_en: "Cut-resistant (chain-mail) gloves are used for:", q_ar: "القفازات المقاومة للقطع تُستخدم في:", options_en: ["Hot work", "Cutting/boning tasks", "Cleaning floors"], options_ar: ["العمل الساخن", "مهام التقطيع/التعظيم", "تنظيف الأرضيات"], correct: 1 },
    { difficulty: "Easy", q_en: "Knives should be cut on:", q_ar: "يجب القطع بالسكين على:", options_en: ["Your hand", "A stable cutting board", "A metal table edge"], options_ar: ["يدك", "لوح تقطيع ثابت", "حافة طاولة معدنية"], correct: 1 },
    { difficulty: "Easy", q_en: "A knife should be cut in a direction:", q_ar: "يجب القطع بالسكين في اتجاه:", options_en: ["Toward your body", "Away from your body", "Toward a colleague"], options_ar: ["نحو جسمك", "بعيداً عن جسمك", "نحو زميل"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "A dropped knife should be:", q_ar: "السكين الساقطة يجب:", options_en: ["Caught in mid-air", "Let fall, stepped back, then picked up by the handle", "Kicked aside"], options_ar: ["إمساكها في الهواء", "تركها تسقط والتراجع ثم رفعها من المقبض", "ركلها جانباً"], correct: 1 },
    { difficulty: "Medium", q_en: "To pass a knife to someone, you should:", q_ar: "لتمرير سكين لشخص آخر يجب:", options_en: ["Throw it", "Put it down and let them pick it up, or pass handle-first", "Hand over the blade"], options_ar: ["رميها", "وضعها ليأخذها، أو تمريرها من المقبض أولاً", "تسليم النصل"], correct: 1 },
    { difficulty: "Medium", q_en: "When not in use, knives should be:", q_ar: "عند عدم الاستخدام، يجب أن تكون السكاكين:", options_en: ["Left in the sink water", "Stored in a rack/sheath, visible and dry", "Left on the edge of the table"], options_ar: ["تُترك في ماء الحوض", "محفوظة في حامل/غمد، ظاهرة وجافة", "تُترك على حافة الطاولة"], correct: 1 },
    { difficulty: "Medium", q_en: "Knives left in a sink full of water are dangerous because:", q_ar: "السكاكين في حوض مملوء بالماء خطرة لأن:", options_en: ["They rust slowly", "They are hidden and can cut someone reaching in", "They get cold"], options_ar: ["تصدأ ببطء", "مخفية وقد تجرح من يمد يده", "تبرد"], correct: 1 },
    { difficulty: "Medium", q_en: "A focused, non-distracted work area for knife use helps to:", q_ar: "منطقة عمل مركّزة بلا تشتيت لاستخدام السكين تساعد على:", options_en: ["Look professional", "Reduce the chance of cuts", "Cut faster only"], options_ar: ["المظهر المهني", "تقليل فرصة الجروح", "القطع أسرع فقط"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "A blunt knife is more dangerous because:", q_ar: "السكين غير الحادة أخطر لأنها:", options_en: ["It looks scary", "It needs more force and slips more easily", "It is heavier"], options_ar: ["مظهرها مخيف", "تحتاج قوة أكبر وتنزلق أسهل", "أثقل وزناً"], correct: 1 },
    { difficulty: "Hard", q_en: "Knives are color-coded in a butchery mainly to:", q_ar: "تُرمّز السكاكين بالألوان في الملحمة أساساً لـ:", options_en: ["Look nice", "Prevent cross-contamination between food types", "Show seniority"], options_ar: ["المظهر الجميل", "منع التلوث المتبادل بين أنواع الطعام", "إظهار الأقدمية"], correct: 1 },
    { difficulty: "Hard", q_en: "After a knife cut injury, the first food-safety action is to:", q_ar: "بعد إصابة قطع بالسكين، أول إجراء لسلامة الغذاء:", options_en: ["Keep working", "Stop, give first aid, cover wound + blue dressing/glove, isolate affected food", "Wash the knife only"], options_ar: ["متابعة العمل", "التوقف، الإسعاف، تغطية الجرح بضماد أزرق/قفاز، عزل الطعام المتأثر", "غسل السكين فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "Knife sharpening/steeling should be done:", q_ar: "شحذ/سن السكين يجب أن يتم:", options_en: ["Toward your palm", "Away from the body with controlled strokes", "Quickly toward others"], options_ar: ["نحو راحة يدك", "بعيداً عن الجسم بحركات متحكّم بها", "بسرعة نحو الآخرين"], correct: 1 },
    { difficulty: "Hard", q_en: "The biggest cause of knife injuries is usually:", q_ar: "السبب الأكبر لإصابات السكاكين عادةً:", options_en: ["Sharp knives", "Loss of concentration / poor technique / blunt blades", "Wearing gloves"], options_ar: ["السكاكين الحادة", "فقدان التركيز / أسلوب خاطئ / نصال غير حادة", "ارتداء القفازات"], correct: 1 },
  ],

  "OHS: Fire Safety & Emergency": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "On discovering a fire, your first action is usually to:", q_ar: "عند اكتشاف حريق، أول إجراء عادةً:", options_en: ["Finish your task", "Raise the alarm", "Take a photo"], options_ar: ["إنهاء مهمتك", "إطلاق الإنذار", "التقاط صورة"], correct: 1 },
    { difficulty: "Easy", q_en: "Fire needs three things (the fire triangle):", q_ar: "يحتاج الحريق ثلاثة أشياء (مثلث الحريق):", options_en: ["Heat, fuel, oxygen", "Water, ice, air", "Light, sound, dust"], options_ar: ["حرارة، وقود، أكسجين", "ماء، ثلج، هواء", "ضوء، صوت، غبار"], correct: 0 },
    { difficulty: "Easy", q_en: "Emergency exits and routes must be:", q_ar: "مخارج وطرق الطوارئ يجب أن تكون:", options_en: ["Blocked with stock", "Clear and unobstructed", "Locked during work"], options_ar: ["مسدودة بالبضائع", "خالية وغير معاقة", "مغلقة أثناء العمل"], correct: 1 },
    { difficulty: "Easy", q_en: "When the fire alarm sounds you should:", q_ar: "عند سماع إنذار الحريق يجب:", options_en: ["Keep working", "Evacuate to the assembly point", "Hide"], options_ar: ["متابعة العمل", "الإخلاء إلى نقطة التجمع", "الاختباء"], correct: 1 },
    { difficulty: "Easy", q_en: "During evacuation you should:", q_ar: "أثناء الإخلاء يجب:", options_en: ["Run and push", "Walk calmly, don't stop for belongings", "Use the lift"], options_ar: ["الركض والدفع", "المشي بهدوء وعدم التوقف للأغراض", "استخدام المصعد"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "A CO₂ or Class K extinguisher is suitable for:", q_ar: "طفاية CO₂ أو من الفئة K مناسبة لـ:", options_en: ["Paper bins", "Electrical / cooking-oil fires", "Anything"], options_ar: ["سلال الورق", "حرائق الكهرباء / زيت الطهي", "أي شيء"], correct: 1 },
    { difficulty: "Medium", q_en: "Never use water on a fire involving:", q_ar: "لا تستخدم الماء أبداً على حريق يشمل:", options_en: ["Paper", "Electrical equipment or hot oil", "Wood"], options_ar: ["الورق", "أجهزة كهربائية أو زيت ساخن", "الخشب"], correct: 1 },
    { difficulty: "Medium", q_en: "The acronym PASS for using an extinguisher means:", q_ar: "اختصار PASS لاستخدام الطفاية يعني:", options_en: ["Pull, Aim, Squeeze, Sweep", "Push, Add, Stop, Stay", "Point, Ask, Shout, Spray"], options_ar: ["اسحب، صوّب، اضغط، امسح", "ادفع، أضف، توقف، ابقَ", "أشر، اسأل، اصرخ، رش"], correct: 0 },
    { difficulty: "Medium", q_en: "You should only fight a fire yourself if:", q_ar: "تكافح الحريق بنفسك فقط إذا:", options_en: ["It is large", "It is small, you're trained, and exit is behind you", "Nobody is watching"], options_ar: ["كان كبيراً", "كان صغيراً وأنت مدرّب والمخرج خلفك", "لا أحد يراقب"], correct: 1 },
    { difficulty: "Medium", q_en: "At the assembly point, the priority is to:", q_ar: "عند نقطة التجمع، الأولوية هي:", options_en: ["Take photos", "Account for all people (roll call)", "Go back for bags"], options_ar: ["التقاط صور", "حصر جميع الأشخاص (نداء الأسماء)", "العودة للحقائب"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "An ABC dry-powder extinguisher works on:", q_ar: "طفاية المسحوق الجاف ABC تعمل على:", options_en: ["Only paper", "Class A (solids), B (liquids) and C (gases)", "Metal fires only"], options_ar: ["الورق فقط", "الفئة A (مواد صلبة) وB (سوائل) وC (غازات)", "حرائق المعادن فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "A deep-fat fryer oil fire (Class K/F) is best tackled with:", q_ar: "حريق زيت المقلاة (الفئة K/F) يُعالج أفضل بـ:", options_en: ["Water", "A wet-chemical (Class K) extinguisher / fire blanket", "Dry sand only"], options_ar: ["الماء", "طفاية كيميائية رطبة (فئة K) / بطانية حريق", "رمل جاف فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "Fire doors must be kept closed because they:", q_ar: "أبواب الحريق تبقى مغلقة لأنها:", options_en: ["Look tidy", "Slow the spread of fire and smoke", "Save energy"], options_ar: ["تبدو مرتبة", "تبطئ انتشار النار والدخان", "توفر الطاقة"], correct: 1 },
    { difficulty: "Hard", q_en: "Why avoid lifts (elevators) during a fire?", q_ar: "لماذا نتجنّب المصاعد أثناء الحريق؟", options_en: ["They are slow", "They can fail/trap you and open onto the fire floor", "They are crowded"], options_ar: ["بطيئة", "قد تتعطل/تحبسك وتفتح على طابق الحريق", "مزدحمة"], correct: 1 },
    { difficulty: "Hard", q_en: "The main purpose of regular fire drills is to:", q_ar: "الغرض الرئيسي من تمارين الحريق الدورية:", options_en: ["Waste time", "Ensure everyone knows routes and can evacuate quickly", "Test the alarm volume only"], options_ar: ["إضاعة الوقت", "ضمان معرفة الجميع للطرق والإخلاء بسرعة", "اختبار صوت الإنذار فقط"], correct: 1 },
  ],

  "OHS: First Aid & Incident Reporting": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "A minor burn should first be:", q_ar: "الحرق البسيط يجب أولاً:", options_en: ["Covered with butter", "Cooled under cool running water", "Rubbed with ice salt"], options_ar: ["تغطيته بالزبدة", "تبريده تحت ماء جارٍ بارد", "فركه بملح الثلج"], correct: 1 },
    { difficulty: "Easy", q_en: "All workplace injuries should be:", q_ar: "جميع إصابات العمل يجب:", options_en: ["Hidden", "Reported and recorded", "Ignored if small"], options_ar: ["إخفاؤها", "الإبلاغ عنها وتسجيلها", "تجاهلها إن كانت بسيطة"], correct: 1 },
    { difficulty: "Easy", q_en: "First aid should be given by:", q_ar: "الإسعافات الأولية يجب أن يقدّمها:", options_en: ["Anyone guessing", "A trained first aider", "Nobody"], options_ar: ["أي شخص يخمّن", "مسعف مدرّب", "لا أحد"], correct: 1 },
    { difficulty: "Easy", q_en: "For a small bleeding cut you should:", q_ar: "لجرح نازف بسيط يجب:", options_en: ["Leave it open", "Apply pressure and a clean (blue) dressing", "Lick it"], options_ar: ["تركه مكشوفاً", "الضغط عليه ووضع ضماد نظيف (أزرق)", "لعقه"], correct: 1 },
    { difficulty: "Easy", q_en: "A food handler's wound dressing should be:", q_ar: "ضماد جرح متداول الغذاء يجب أن يكون:", options_en: ["Skin-colored", "Blue and detectable", "Any color"], options_ar: ["بلون الجلد", "أزرق وقابل للكشف", "أي لون"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "A burn should be cooled with running water for about:", q_ar: "يُبرّد الحرق بالماء الجاري لمدة حوالي:", options_en: ["A few seconds", "10–15 minutes", "1 hour with ice"], options_ar: ["بضع ثوانٍ", "10–15 دقيقة", "ساعة مع الثلج"], correct: 1 },
    { difficulty: "Medium", q_en: "You should NOT put on a burn:", q_ar: "يجب عدم وضع التالي على الحرق:", options_en: ["Cool water", "Ice, butter, or toothpaste", "A clean dressing"], options_ar: ["ماء بارد", "ثلج أو زبدة أو معجون أسنان", "ضماد نظيف"], correct: 1 },
    { difficulty: "Medium", q_en: "A near-miss (no injury) should be:", q_ar: "الحادث القريب (بلا إصابة) يجب:", options_en: ["Forgotten", "Still reported to prevent future injury", "Reported only if serious"], options_ar: ["نسيانه", "الإبلاغ عنه أيضاً لمنع إصابة مستقبلية", "الإبلاغ فقط إن كان خطيراً"], correct: 1 },
    { difficulty: "Medium", q_en: "Items in a first aid kit must be:", q_ar: "محتويات حقيبة الإسعاف يجب أن تكون:", options_en: ["Expired but cheap", "Stocked, in-date, and checked regularly", "Locked away from staff"], options_ar: ["منتهية لكن رخيصة", "متوفّرة وسارية ويتم فحصها بانتظام", "مقفلة بعيداً عن الموظفين"], correct: 1 },
    { difficulty: "Medium", q_en: "Why must accidents be recorded (e.g., in an accident book)?", q_ar: "لماذا تُسجّل الحوادث (مثلاً في سجل الحوادث)؟", options_en: ["To blame people", "For investigation, trends and legal compliance", "No reason"], options_ar: ["للوم الأشخاص", "للتحقيق ورصد الاتجاهات والامتثال القانوني", "بدون سبب"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "For severe bleeding the priority action is to:", q_ar: "للنزيف الشديد، الإجراء ذو الأولوية:", options_en: ["Wash for 15 min", "Apply firm direct pressure and call for help", "Apply a burn cream"], options_ar: ["الغسل 15 دقيقة", "ضغط مباشر قوي وطلب المساعدة", "وضع كريم حروق"], correct: 1 },
    { difficulty: "Hard", q_en: "If a colleague is unconscious but breathing, place them:", q_ar: "إذا كان زميل فاقداً للوعي لكنه يتنفس، ضعه في:", options_en: ["On their back", "In the recovery position and call emergency services", "Sitting up"], options_ar: ["على ظهره", "وضع الإفاقة واستدعاء الطوارئ", "جالساً"], correct: 1 },
    { difficulty: "Hard", q_en: "After first aid for a cut, the food-safety step is to:", q_ar: "بعد إسعاف جرح، خطوة سلامة الغذاء هي:", options_en: ["Keep working", "Assess and isolate any food that may be contaminated", "Throw the kit away"], options_ar: ["متابعة العمل", "تقييم وعزل أي طعام قد يكون تلوّث", "رمي حقيبة الإسعاف"], correct: 1 },
    { difficulty: "Hard", q_en: "Reportable (serious) incidents should be:", q_ar: "الحوادث الواجب الإبلاغ عنها (الخطيرة) يجب:", options_en: ["Handled quietly", "Escalated to management/authorities per procedure", "Recorded next month"], options_ar: ["معالجتها بهدوء", "تصعيدها للإدارة/الجهات حسب الإجراء", "تسجيلها الشهر القادم"], correct: 1 },
    { difficulty: "Hard", q_en: "The main goal of incident investigation is to:", q_ar: "الهدف الرئيسي من التحقيق في الحوادث:", options_en: ["Punish someone", "Find the root cause and prevent recurrence", "Close the file fast"], options_ar: ["معاقبة أحد", "إيجاد السبب الجذري ومنع التكرار", "إغلاق الملف بسرعة"], correct: 1 },
  ],

  "TESTO OIL — Oil Quality Test": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "TPM stands for:", q_ar: "TPM تعني:", options_en: ["Total Polar Material", "Temperature Per Minute", "Testo Product Manual"], options_ar: ["إجمالي المواد القطبية", "درجة حرارة في الدقيقة", "دليل منتج Testo"], correct: 0 },
    { difficulty: "Easy", q_en: "The TESTO 270 device is used to measure:", q_ar: "يُستخدم جهاز TESTO 270 لقياس:", options_en: ["Oil quality (TPM%)", "Room humidity", "Knife sharpness"], options_ar: ["جودة الزيت (TPM%)", "رطوبة الغرفة", "حدة السكين"], correct: 0 },
    { difficulty: "Easy", q_en: "A RED reading on the TESTO 270 means:", q_ar: "القراءة الحمراء على TESTO 270 تعني:", options_en: ["Oil is perfect", "Discard the oil immediately", "Add more oil"], options_ar: ["الزيت ممتاز", "أعدم الزيت فوراً", "أضف زيتاً أكثر"], correct: 1 },
    { difficulty: "Easy", q_en: "A GREEN reading on the TESTO 270 means:", q_ar: "القراءة الخضراء على TESTO 270 تعني:", options_en: ["Oil is still good to use", "Discard now", "Device is broken"], options_ar: ["الزيت لا يزال صالحاً", "أعدمه الآن", "الجهاز معطل"], correct: 0 },
    { difficulty: "Easy", q_en: "After using the probe you must:", q_ar: "بعد استخدام المجس يجب:", options_en: ["Leave it in the fryer", "Wipe it dry and store in its case", "Rinse and leave it wet"], options_ar: ["تركه في المقلاة", "تجفيفه وحفظه في حقيبته", "شطفه وتركه مبللاً"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "When should you test frying oil quality?", q_ar: "متى تختبر جودة زيت القلي؟", options_en: ["Once a week", "Before service and every 2–3 hrs during frying", "Only when it looks dark"], options_ar: ["مرة بالأسبوع", "قبل الخدمة وكل 2–3 ساعات أثناء القلي", "فقط عندما يبدو داكناً"], correct: 1 },
    { difficulty: "Medium", q_en: "Oil should be tested when it is:", q_ar: "يجب اختبار الزيت عندما يكون:", options_en: ["Cold", "At frying temperature (per the device range)", "Frozen"], options_ar: ["بارداً", "بحرارة القلي (ضمن نطاق الجهاز)", "مجمداً"], correct: 1 },
    { difficulty: "Medium", q_en: "Higher TPM% generally means the oil is:", q_ar: "ارتفاع TPM% يعني عموماً أن الزيت:", options_en: ["Fresher", "More degraded", "Colder"], options_ar: ["أطزج", "أكثر تدهوراً", "أبرد"], correct: 1 },
    { difficulty: "Medium", q_en: "Results of the oil test should be:", q_ar: "نتائج اختبار الزيت يجب:", options_en: ["Kept in your head", "Recorded in the oil monitoring log", "Ignored"], options_ar: ["حفظها في الذاكرة", "تسجيلها في سجل مراقبة الزيت", "تجاهلها"], correct: 1 },
    { difficulty: "Medium", q_en: "Topping up with fresh oil regularly helps to:", q_ar: "إضافة زيت طازج بانتظام تساعد على:", options_en: ["Raise TPM faster", "Slow oil degradation / lower TPM", "Damage the fryer"], options_ar: ["رفع TPM أسرع", "إبطاء تدهور الزيت / خفض TPM", "إتلاف المقلاة"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "A common TPM% limit at which oil must be discarded is around:", q_ar: "حد TPM% الشائع الذي يجب عنده إعدام الزيت حوالي:", options_en: [">5%", ">24–27%", ">2%"], options_ar: [">5%", ">24–27%", ">2%"], correct: 1 },
    { difficulty: "Hard", q_en: "The TESTO probe must NOT be cleaned with:", q_ar: "يجب عدم تنظيف مجس TESTO بـ:", options_en: ["A soft dry cloth", "Abrasive scourers or harsh chemicals", "Its protective case"], options_ar: ["قماش ناعم جاف", "مواد كاشطة أو كيميائيات قاسية", "حقيبته الواقية"], correct: 1 },
    { difficulty: "Hard", q_en: "Besides TPM, signs that oil should be changed include:", q_ar: "بجانب TPM، علامات وجوب تغيير الزيت تشمل:", options_en: ["Light color, no smell", "Dark color, foaming, off-odor, excessive smoke", "Staying clear"], options_ar: ["لون فاتح بلا رائحة", "لون داكن، رغوة، رائحة غير طبيعية، دخان زائد", "بقاؤه صافياً"], correct: 1 },
    { difficulty: "Hard", q_en: "Using oil above the TPM limit is a hazard because it:", q_ar: "استخدام زيت فوق حد TPM خطر لأنه:", options_en: ["Tastes better", "Produces harmful polar compounds (food safety risk)", "Saves money safely"], options_ar: ["طعمه أفضل", "ينتج مركبات قطبية ضارة (خطر على سلامة الغذاء)", "يوفر المال بأمان"], correct: 1 },
    { difficulty: "Hard", q_en: "To get an accurate TESTO reading you should:", q_ar: "للحصول على قراءة TESTO دقيقة يجب:", options_en: ["Dip the tip only briefly cold", "Immerse the sensor fully within the marked range at frying temp", "Touch the fryer wall"], options_ar: ["غمس الطرف بسرعة وهو بارد", "غمر الحساس بالكامل ضمن العلامة بحرارة القلي", "لمس جدار المقلاة"], correct: 1 },
  ],

  "Quality System Usage": [
    /* ===== Easy / سهل ===== */
    { difficulty: "Easy", q_en: "Before leaving a data-entry page you must:", q_ar: "قبل مغادرة صفحة إدخال البيانات يجب:", options_en: ["Close the browser", "Save the data", "Print the page"], options_ar: ["إغلاق المتصفح", "حفظ البيانات", "طباعة الصفحة"], correct: 1 },
    { difficulty: "Easy", q_en: "A RED alert in the system means:", q_ar: "التنبيه الأحمر في النظام يعني:", options_en: ["Everything is fine", "Immediate action required", "Monthly check due"], options_ar: ["كل شيء بخير", "إجراء فوري مطلوب", "فحص شهري مطلوب"], correct: 1 },
    { difficulty: "Easy", q_en: "Health certificates are viewed in:", q_ar: "تُعرض الشهادات الصحية في:", options_en: ["Returns module", "The Health Certificates section", "The Meat Status page"], options_ar: ["وحدة المرتجعات", "قسم الشهادات الصحية", "صفحة حالة اللحم"], correct: 1 },
    { difficulty: "Easy", q_en: "Each record you enter should include:", q_ar: "كل سجل تُدخله يجب أن يتضمن:", options_en: ["Only a name", "Correct date and required fields", "Nothing"], options_ar: ["الاسم فقط", "التاريخ الصحيح والحقول المطلوبة", "لا شيء"], correct: 1 },
    { difficulty: "Easy", q_en: "If you see a system error you should:", q_ar: "عند ظهور خطأ في النظام يجب:", options_en: ["Fix the database manually", "Screenshot and contact QA/IT", "Ignore and continue"], options_ar: ["تعديل قاعدة البيانات يدوياً", "أخذ لقطة شاشة والتواصل مع QA/IT", "تجاهله والمتابعة"], correct: 1 },
    /* ===== Medium / متوسط ===== */
    { difficulty: "Medium", q_en: "Stock, hold items and near-expiry alerts are found in:", q_ar: "المخزون والمعزول وتنبيهات قرب الانتهاء توجد في:", options_en: ["The Meat Status section", "The Certificates section", "The Returns section"], options_ar: ["قسم حالة اللحم", "قسم الشهادات", "قسم المرتجعات"], correct: 0 },
    { difficulty: "Medium", q_en: "You should log in with:", q_ar: "يجب تسجيل الدخول بـ:", options_en: ["A shared/anonymous account", "Your own named account", "No login"], options_ar: ["حساب مشترك/مجهول", "حسابك المسمّى الخاص", "بدون تسجيل دخول"], correct: 1 },
    { difficulty: "Medium", q_en: "Photos/attachments uploaded should be:", q_ar: "الصور/المرفقات المرفوعة يجب أن تكون:", options_en: ["Blurry", "Clear and relevant to the record", "Random"], options_ar: ["غير واضحة", "واضحة وذات صلة بالسجل", "عشوائية"], correct: 1 },
    { difficulty: "Medium", q_en: "If a required field is missing, the system will usually:", q_ar: "إذا كان حقل مطلوب ناقصاً، فالنظام عادةً:", options_en: ["Save anyway", "Warn you / block saving until completed", "Delete the record"], options_ar: ["يحفظ بأي حال", "ينبّهك / يمنع الحفظ حتى الإكمال", "يحذف السجل"], correct: 1 },
    { difficulty: "Medium", q_en: "Entering accurate data on time matters because:", q_ar: "إدخال بيانات دقيقة في وقتها مهم لأن:", options_en: ["It looks busy", "Reports, KPIs and traceability depend on it", "It fills the screen"], options_ar: ["يبدو مشغولاً", "التقارير والمؤشرات والتتبّع تعتمد عليه", "يملأ الشاشة"], correct: 1 },
    /* ===== Hard / صعب ===== */
    { difficulty: "Hard", q_en: "You realize you entered a wrong value yesterday. You should:", q_ar: "اكتشفت أنك أدخلت قيمة خاطئة أمس، يجب:", options_en: ["Leave it", "Correct it through the system (keeping the audit trail) / inform QA", "Delete all records"], options_ar: ["تركها", "تصحيحها عبر النظام (مع الإبقاء على أثر التدقيق) / إبلاغ QA", "حذف كل السجلات"], correct: 1 },
    { difficulty: "Hard", q_en: "Why must each user have their own login (no sharing)?", q_ar: "لماذا يجب أن يكون لكل مستخدم تسجيل دخول خاص (بلا مشاركة)؟", options_en: ["To look formal", "For accountability and a correct audit trail", "To slow people down"], options_ar: ["للشكليات", "للمساءلة وأثر تدقيق صحيح", "لإبطاء الناس"], correct: 1 },
    { difficulty: "Hard", q_en: "Backups/records in the QMS mainly provide:", q_ar: "النسخ/السجلات في نظام الجودة توفّر أساساً:", options_en: ["Decoration", "Evidence for audits and recovery of data", "More storage cost only"], options_ar: ["زينة", "دليلاً للتدقيق واستعادة البيانات", "تكلفة تخزين فقط"], correct: 1 },
    { difficulty: "Hard", q_en: "A record's date should reflect:", q_ar: "تاريخ السجل يجب أن يعكس:", options_en: ["Any date you like", "The actual date the activity happened", "Always today"], options_ar: ["أي تاريخ تريده", "التاريخ الفعلي لحدوث النشاط", "اليوم دائماً"], correct: 1 },
    { difficulty: "Hard", q_en: "Recurring RED alerts that are ignored will likely cause:", q_ar: "التنبيهات الحمراء المتكررة المهمَلة ستؤدي غالباً إلى:", options_en: ["Nothing", "Non-conformities, expired stock or audit findings", "Faster system"], options_ar: ["لا شيء", "حالات عدم مطابقة أو مخزون منتهٍ أو ملاحظات تدقيق", "نظام أسرع"], correct: 1 },
  ],
};

/* ===================== Helpers ===================== */
export async function fetchJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to load");
  }
  return await res.json();
}

export async function updateReportOnServer(id, updatedReportBody) {
  let res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updatedReportBody),
  });

  if (!res.ok) {
    res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedReportBody),
    });
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to update report");
  }
  return await res.json();
}

/* ✅ delete training session (report) */
export async function deleteReportOnServer(id) {
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to delete report");
  }
  try {
    return await res.json();
  } catch {
    return { ok: true };
  }
}

export function normalizeToArray(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.items, data?.reports, data?.data, data?.result, data?.rows];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

export function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id || r?.clientId;
}

export function safeDate(r) {
  const d = r?.payload?.date || r?.payload?.reportDate || r?.created_at || r?.createdAt || r?.created || r?.timestamp;
  return d ? String(d).slice(0, 10) : "";
}
export function safeBranch(r) {
  return r?.branch || r?.payload?.branch || r?.payload?.BRANCH || "";
}
export function safeModule(r) {
  return r?.payload?.moduleName || r?.payload?.module || "";
}
export function safeTitle(r) {
  return r?.title || r?.payload?.title || r?.payload?.documentTitle || "";
}
export function sortByNewest(a, b) {
  const da = new Date(a?.created_at || a?.createdAt || a?.payload?.date || 0).getTime();
  const db = new Date(b?.created_at || b?.createdAt || b?.payload?.date || 0).getTime();
  return db - da;
}

export function makeBlankParticipant() {
  return {
    slNo: "",
    name: "",
    designation: "",
    result: "",
    score: "",
    lastQuizAt: "",
    quizAttempt: null,
  };
}
export function renumberParticipants(list) {
  return (Array.isArray(list) ? list : []).map((p, idx) => ({
    ...p,
    slNo: p?.slNo ? String(p.slNo) : String(idx + 1),
  }));
}
export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ===== UI atoms ===== */
export function Badge({ text, tone = "gray" }) {
  const map = {
    gray: { bg: "#f3f4f6", fg: "#111827", bd: "#e5e7eb" },
    blue: { bg: "#eff6ff", fg: "#1d4ed8", bd: "#bfdbfe" },
    green: { bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
    red: { bg: "#fff1f2", fg: "#be123c", bd: "#fecdd3" },
    violet: { bg: "#f5f3ff", fg: "#6d28d9", bd: "#ddd6fe" },
    amber: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  };
  const c = map[tone] || map.gray;
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${c.bd}`,
        background: c.bg,
        color: c.fg,
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

export function KPI({ label, value, tone = "gray" }) {
  const colors = {
    gray: { bg: "linear-gradient(135deg,#ffffff,#f8fafc)", bd: "#e5e7eb", fg: "#111827", sub: "#6b7280" },
    blue: { bg: "linear-gradient(135deg,#eff6ff,#ffffff)", bd: "#bfdbfe", fg: "#1d4ed8", sub: "#64748b" },
    green: { bg: "linear-gradient(135deg,#ecfdf5,#ffffff)", bd: "#a7f3d0", fg: "#047857", sub: "#64748b" },
    red: { bg: "linear-gradient(135deg,#fff1f2,#ffffff)", bd: "#fecdd3", fg: "#be123c", sub: "#64748b" },
    violet: { bg: "linear-gradient(135deg,#f5f3ff,#ffffff)", bd: "#ddd6fe", fg: "#6d28d9", sub: "#64748b" },
  };
  const c = colors[tone] || colors.gray;
  return (
    <div
      style={{
        border: `1px solid ${c.bd}`,
        background: c.bg,
        borderRadius: 16,
        padding: 14,
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
        minHeight: 78,
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: c.sub }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000, color: c.fg }}>{value}</div>
    </div>
  );
}

export function Modal({ show, title, onClose, children, footer }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.45)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
      onMouseDown={onClose}
    >
      <div
        style={{
          width: "min(1100px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.7)",
          borderRadius: 18,
          boxShadow: "0 30px 80px rgba(0,0,0,0.25)",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 1000, color: "#0f172a" }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 12,
              padding: "8px 10px",
              cursor: "pointer",
              fontWeight: 900,
            }}
          >
            ✖
          </button>
        </div>

        <div style={{ padding: 16 }}>{children}</div>

        {footer && (
          <div
            style={{
              padding: 16,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
