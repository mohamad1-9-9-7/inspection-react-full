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
    {
      q_ar: "متى يجب غسل اليدين؟",
      q_en: "When must hands be washed?",
      options_ar: ["قبل وبعد التعامل مع الطعام", "مرة واحدة يوميًا", "فقط عند الاتساخ"],
      options_en: ["Before & after handling food", "Once per day", "Only when visibly dirty"],
      correct: 0,
    },
    {
      q_ar: "هل يسمح بارتداء المجوهرات/الساعة أثناء العمل؟",
      q_en: "Are jewelry and watches allowed while handling food?",
      options_ar: ["نعم دائمًا", "لا", "فقط الخاتم"],
      options_en: ["Yes, always", "No", "Only a ring"],
      correct: 1,
    },
    {
      q_ar: "ماذا نفعل عند وجود جرح باليد؟",
      q_en: "What should you do if you have a cut on your hand?",
      options_ar: ["نستمر بدون شيء", "نغطيه بضماد مقاوم للماء + قفاز", "نغسله بالماء فقط"],
      options_en: ["Continue normally", "Cover with waterproof dressing + glove", "Rinse with water only"],
      correct: 1,
    },
    {
      q_ar: "أفضل طريقة لمنع التلوث المتبادل؟",
      q_en: "Best method to prevent cross contamination is:",
      options_ar: ["استخدام نفس الأدوات دائمًا", "فصل الأدوات/الأسطح وتعقيمها", "ترك الطعام مكشوف"],
      options_en: ["Use the same tools for everything", "Separate tools/surfaces and sanitize", "Leave food uncovered"],
      correct: 1,
    },
    {
      q_ar: "معنى PPE هو:",
      q_en: "PPE stands for:",
      options_ar: ["معدات الوقاية الشخصية", "منتج جاهز للأكل", "إجراء تخزين"],
      options_en: ["Personal Protective Equipment", "Ready-to-eat product", "Storage procedure"],
      correct: 0,
    },
  ],

  "GHP / Cleaning & Sanitation": [
    {
      q_ar: "ما هو التسلسل الصحيح للتنظيف؟",
      q_en: "What is the correct order for cleaning?",
      options_ar: ["شطف→منظف→فرك→شطف→تعقيم", "تعقيم أولاً", "شطف بالماء فقط"],
      options_en: ["Rinse → detergent → scrub → rinse → sanitize", "Sanitize first", "Only rinse with water"],
      correct: 0,
    },
    {
      q_ar: "زمن التماس للمعقم يعني:",
      q_en: "Sanitizer contact time means:",
      options_ar: ["الوقت اللازم ليعمل المعقم على السطح", "وقت تجفيف اليد", "وقت تخزين الكيميائي"],
      options_en: ["Time needed on surface to work", "Time to dry hands", "Time to store chemical"],
      correct: 0,
    },
    {
      q_ar: "لماذا نستخدم نظام الألوان للأدوات؟",
      q_en: "Why is color coding used?",
      options_ar: ["للزينة", "لتقليل التلوث المتبادل", "لتقليل التكلفة"],
      options_en: ["Decoration", "Reduce cross contamination", "Save money"],
      correct: 1,
    },
    {
      q_ar: "ماذا نفعل بعد انسكاب عصارة لحم نيء؟",
      q_en: "What should be done after a spill of raw meat juices?",
      options_ar: ["لا شيء", "تنظيف وتعقيم فوراً", "تغطية بورق فقط"],
      options_en: ["Ignore", "Clean + sanitize immediately", "Cover with paper only"],
      correct: 1,
    },
    {
      q_ar: "يجب حفظ الأدوات:",
      q_en: "Tools must be stored:",
      options_ar: ["على الأرض", "نظيفة وجافة وبعيدة عن الأرض", "داخل خزانة المواد الكيميائية"],
      options_en: ["On the floor", "Clean, dry, and off the floor", "Inside chemical cabinet"],
      correct: 1,
    },
  ],

  Receiving: [
    {
      q_ar: "أهم شيء عند الاستلام:",
      q_en: "Most important checks during receiving:",
      options_ar: ["اللون فقط", "الحرارة + الصلاحية + الحالة", "التغليف فقط"],
      options_en: ["Color only", "Temperature + dates + condition", "Packaging only"],
      correct: 1,
    },
    {
      q_ar: "إذا كانت الحرارة غير مطابقة:",
      q_en: "If temperature is out of spec:",
      options_ar: ["نقبلها", "نرفض/نعزل ونبلغ QA", "نبيع بسرعة"],
      options_en: ["Accept", "Reject/hold & inform QA", "Sell quickly"],
      correct: 1,
    },
    {
      q_ar: "التحقق من اللابل:",
      q_en: "Product label verification is:",
      options_ar: ["اختياري", "ضروري", "مرة بالشهر"],
      options_en: ["Optional", "Mandatory", "Monthly only"],
      correct: 1,
    },
    {
      q_ar: "عند وجود تلف في التغليف:",
      q_en: "If packaging is damaged:",
      options_ar: ["نستلم عادي", "نعزل/نرفض حسب الخطورة", "نفتح ونشم"],
      options_en: ["Accept normally", "Hold/reject depending on risk", "Open and smell"],
      correct: 1,
    },
    {
      q_ar: "معنى FEFO:",
      q_en: "FEFO means:",
      options_ar: ["الأقرب انتهاء يُستخدم أولاً", "الأقدم دخولًا يُستخدم أولاً", "جمّد كل شيء"],
      options_en: ["First Expire First Out", "First Enter First Out", "Freeze Everything For Output"],
      correct: 0,
    },
  ],

  Storage: [
    {
      q_ar: "ما هو نظام FEFO؟",
      q_en: "FEFO system means:",
      options_ar: ["الأقرب انتهاء يُستخدم أولاً", "الأقدم إنتاجًا يُستخدم أخيراً", "لا يوجد ترتيب"],
      options_en: ["Nearest expiry used first", "Oldest production used last", "No order"],
      correct: 0,
    },
    {
      q_ar: "المنتجات المنتهية يجب أن:",
      q_en: "Expired products must be:",
      options_ar: ["تبقى بالعرض", "تعزل وتحدد ثم إعدام", "تنقل للتجميد"],
      options_en: ["Kept on display", "Segregated/identified then disposed", "Moved to freezer"],
      correct: 1,
    },
    {
      q_ar: "هل يجوز تخزين الكيميائيات مع الأغذية؟",
      q_en: "Chemicals can be stored with food:",
      options_ar: ["نعم", "لا", "حسب الكمية"],
      options_en: ["Yes", "No", "Depends on quantity"],
      correct: 1,
    },
    {
      q_ar: "يجب تغطية المنتجات داخل البراد:",
      q_en: "Products inside chiller should be:",
      options_ar: ["لا داعي", "نعم لتجنب التلوث", "فقط في الصيف"],
      options_en: ["Uncovered", "Covered/protected", "Only covered in summer"],
      correct: 1,
    },
    {
      q_ar: "درجة حرارة التخزين البارد عادة:",
      q_en: "Typical chilled storage temperature:",
      options_ar: ["0-5°C", "10-15°C", "25°C"],
      options_en: ["0–5°C", "10–15°C", "25°C"],
      correct: 0,
    },
  ],

  "Time & Temperature / CCP": [
    {
      q_ar: "منطقة الخطر (Danger Zone) تقريبا:",
      q_en: "Danger Zone is approximately:",
      options_ar: ["5-60°C", "0-2°C", "70-90°C"],
      options_en: ["5–60°C", "0–2°C", "70–90°C"],
      correct: 0,
    },
    {
      q_ar: "مراقبة حرارة الثلاجة تكون:",
      q_en: "Chiller temperature must be monitored:",
      options_ar: ["فقط عند الشكوى", "حسب الجدول (يومي/شفت)", "مرة بالشهر"],
      options_en: ["Only when complaint happens", "As per schedule (daily/shift)", "Once per month"],
      correct: 1,
    },
    {
      q_ar: "حفظ الطعام الساخن يجب أن يكون:",
      q_en: "Hot holding should be kept:",
      options_ar: ["أقل من 40°C", "أعلى من 60°C", "حرارة الغرفة"],
      options_en: ["Below 40°C", "Above 60°C", "At room temperature"],
      correct: 1,
    },
    {
      q_ar: "عند وجود انحراف في CCP:",
      q_en: "If CCP monitoring shows deviation:",
      options_ar: ["لا شيء", "تصحيح + توثيق", "إخفاء التسجيل"],
      options_en: ["Ignore", "Take corrective action + record", "Hide the record"],
      correct: 1,
    },
    {
      q_ar: "معايرة الترمومتر:",
      q_en: "Calibration of thermometer is:",
      options_ar: ["غير ضرورية", "ضرورية وموثقة", "اختيارية"],
      options_en: ["Not needed", "Required & documented", "Optional"],
      correct: 1,
    },
  ],

  "HACCP Basics": [
    {
      q_ar: "الهاسب يركز على:",
      q_en: "HACCP is mainly about:",
      options_ar: ["ردة فعل بعد الحوادث", "الوقاية من المخاطر مسبقاً", "أوراق فقط"],
      options_en: ["Reacting after incidents", "Preventing hazards proactively", "Only paperwork"],
      correct: 1,
    },
    {
      q_ar: "معنى CCP:",
      q_en: "CCP stands for:",
      options_ar: ["نقطة تحكم حرجة", "إجراء سلسلة تبريد", "سياسة شكاوى"],
      options_en: ["Critical Control Point", "Cold Chain Procedure", "Customer Complaint Policy"],
      correct: 0,
    },
    {
      q_ar: "الإجراء التصحيحي يُتخذ عندما:",
      q_en: "Corrective action is taken when:",
      options_ar: ["الحد محقق", "تم تجاوز الحد الحرج", "لا يوجد مراقبة"],
      options_en: ["Limit is met", "Critical limit is exceeded", "No monitoring exists"],
      correct: 1,
    },
    {
      q_ar: "التحقق (Verification) يعني:",
      q_en: "Verification means:",
      options_ar: ["تأكيد أن النظام يعمل", "تجاهل السجلات", "فقط تدريب"],
      options_en: ["Checking the system works", "Skipping records", "Only training"],
      correct: 0,
    },
    {
      q_ar: "السجلات مهمة لأنها:",
      q_en: "Records are important because:",
      options_ar: ["غير مهمة", "دليل على التحكم والالتزام", "لتعبئة الملفات"],
      options_en: ["No reason", "Evidence of control & compliance", "To fill storage"],
      correct: 1,
    },
  ],

  "Allergen Control": [
    {
      q_ar: "المسببات التحسسية يجب أن:",
      q_en: "Allergens must be:",
      options_ar: ["تُهمل", "تُحدد وتُوضع على لابل ويتم التحكم بها", "تُخلط مع كل الطعام"],
      options_en: ["Ignored", "Identified, labeled, and controlled", "Mixed with all foods"],
      correct: 1,
    },
    {
      q_ar: "أفضل طريقة لمنع تلامس مسببات الحساسية:",
      q_en: "Best way to prevent allergen cross-contact:",
      options_ar: ["نفس الأدوات", "أدوات مخصصة + تنظيف", "قفازات فقط"],
      options_en: ["Same utensils", "Dedicated tools + cleaning", "Only gloves"],
      correct: 1,
    },
    {
      q_ar: "إذا كان اللابل ناقص معلومات الحساسية:",
      q_en: "If label is missing allergen info:",
      options_ar: ["نبيع", "نعزل ونبلغ QA", "نكتب بالقلم ونكمل"],
      options_en: ["Sell anyway", "Hold product & inform QA", "Write by pen and continue"],
      correct: 1,
    },
    {
      q_ar: "التنظيف بين منتجات فيها حساسية وبدون:",
      q_en: "Cleaning between allergen/non-allergen runs is:",
      options_ar: ["غير ضروري", "ضروري", "اختياري"],
      options_en: ["Not needed", "Mandatory", "Optional"],
      correct: 1,
    },
    {
      q_ar: "تدريب الحساسية يمنع:",
      q_en: "Allergen training helps to prevent:",
      options_ar: ["فقط الشكاوى", "تفاعلات خطيرة للمستهلك", "انحراف الحرارة"],
      options_en: ["Only complaints", "Severe consumer reactions", "Temperature deviation"],
      correct: 1,
    },
  ],

  "Cross Contamination Control": [
    {
      q_ar: "أفضل إجراء لمنع التلوث المتبادل هو:",
      q_en: "Best action to prevent cross contamination is:",
      options_ar: ["خلط النيء مع الجاهز", "فصل النيء عن الجاهز واستخدام أدوات مخصصة", "ترك الطعام مكشوف"],
      options_en: ["Mix raw with RTE", "Separate raw vs RTE and use dedicated tools", "Leave food uncovered"],
      correct: 1,
    },
    {
      q_ar: "بعد لمس الهاتف/المال يجب:",
      q_en: "After handling phone/money you should:",
      options_ar: ["نكمل العمل", "غسل اليدين/تغيير القفازات", "تعقيم المنتج"],
      options_en: ["Continue working", "Wash hands/change gloves", "Sanitize the product"],
      correct: 1,
    },
    {
      q_ar: "ترميز الألوان للأدوات يساعد على:",
      q_en: "Color coding helps to:",
      options_ar: ["زيادة السرعة فقط", "تقليل التلوث المتبادل", "توفير كهرباء"],
      options_en: ["Increase speed only", "Reduce cross contamination", "Save electricity"],
      correct: 1,
    },
    {
      q_ar: "داخل البراد يجب منع تلوث التنقيط عبر:",
      q_en: "In chiller, drip contamination is prevented by:",
      options_ar: ["الأسفل للأعلى", "الأعلى للأسفل", "بدون ترتيب"],
      options_en: ["Bottom-to-top", "Top-to-bottom rule", "No order"],
      correct: 1,
    },
    {
      q_ar: "عند مشاركة سطح عمل بين مهام مختلفة يجب:",
      q_en: "When sharing a work surface between tasks you must:",
      options_ar: ["تركه كما هو", "تنظيفه وتعقيمه قبل الاستخدام التالي", "تغطيته فقط"],
      options_en: ["Leave it as is", "Clean and sanitize before next use", "Only cover it"],
      correct: 1,
    },
  ],

  "Chemical Safety (Food + OHS)": [
    {
      q_ar: "يجب أن تكون عبوات المواد الكيميائية:",
      q_en: "Chemical containers must be:",
      options_ar: ["بدون لابل", "موسومة ومخزنة بمكان مخصص", "فوق الغذاء"],
      options_en: ["Unlabeled", "Labeled and stored in designated area", "Stored above food"],
      correct: 1,
    },
    {
      q_ar: "خلط المواد الكيميائية:",
      q_en: "Mixing chemicals is:",
      options_ar: ["مسموح دائمًا", "ممنوع إلا حسب SOP", "مفضل"],
      options_en: ["Allowed anytime", "Not allowed unless instructed by SOP", "Recommended"],
      correct: 1,
    },
    {
      q_ar: "SDS يعني:",
      q_en: "SDS stands for:",
      options_ar: ["نشرة بيانات السلامة", "نظام تخزين يومي", "معيار تصميم"],
      options_en: ["Safety Data Sheet", "Storage Daily System", "Sanitation Design Standard"],
      correct: 0,
    },
    {
      q_ar: "معدات الوقاية عند التعامل مع الكيميائيات:",
      q_en: "PPE when handling chemicals:",
      options_ar: ["غير ضروري", "قفازات/نظارات حسب SDS", "مريول فقط"],
      options_en: ["Not needed", "Gloves/eye protection as per SDS", "Apron only"],
      correct: 1,
    },
    {
      q_ar: "تخفيف/جرعة المواد الكيميائية يجب أن تكون:",
      q_en: "Chemical dilution/dosage must be:",
      options_ar: ["عشوائية", "حسب SOP/القياس الصحيح", "أعلى جرعة دائمًا"],
      options_en: ["Random", "As per SOP with correct measurement", "Always highest dose"],
      correct: 1,
    },
  ],

  "Pest Control Awareness": [
    {
      q_ar: "من علامات وجود آفات:",
      q_en: "Signs of pests include:",
      options_ar: ["فضلات/حشرات", "رائحة طيبة", "لون الجدار"],
      options_en: ["Droppings/insects", "Nice smell", "Wall color"],
      correct: 0,
    },
    {
      q_ar: "عند رؤية آفة يجب:",
      q_en: "If you see a pest you should:",
      options_ar: ["تجاهل", "إبلاغ فورًا وتوثيق", "رش مبيد بنفسك"],
      options_en: ["Ignore", "Report immediately and record", "Spray pesticide yourself"],
      correct: 1,
    },
    {
      q_ar: "مصائد/طعوم الآفات:",
      q_en: "Bait stations/traps:",
      options_ar: ["نعبث بها", "لا نلمسها", "ننقلها لمكان آخر"],
      options_en: ["Can be moved", "Must not be touched", "Should be relocated"],
      correct: 1,
    },
    {
      q_ar: "إدارة النفايات تساعد على:",
      q_en: "Good waste management helps to:",
      options_ar: ["جذب الآفات", "تقليل جذب الآفات", "لا علاقة"],
      options_en: ["Attract pests", "Reduce pest attraction", "No relation"],
      correct: 1,
    },
    {
      q_ar: "مبيدات الآفات تُطبق بواسطة:",
      q_en: "Pesticides should be applied by:",
      options_ar: ["أي موظف", "شركة مكافحة آفات معتمدة فقط", "الزبون"],
      options_en: ["Any staff", "Approved pest control vendor only", "Customer"],
      correct: 1,
    },
  ],

  "Waste Management": [
    {
      q_ar: "يجب فصل النفايات إلى:",
      q_en: "Waste should be segregated into:",
      options_ar: ["نوع واحد", "غذائية/عامة/خطرة (إن وجدت)", "حسب المزاج"],
      options_en: ["One type only", "Food/general/hazardous (if any)", "Depends on mood"],
      correct: 1,
    },
    {
      q_ar: "سلال النفايات يجب أن تكون:",
      q_en: "Waste bins should be:",
      options_ar: ["مفتوحة دائمًا", "مغطاة مع بطانات", "داخل منطقة الإنتاج"],
      options_en: ["Always open", "Covered with liners", "Inside processing line"],
      correct: 1,
    },
    {
      q_ar: "المنتجات المعدمة/المنتهية يتم:",
      q_en: "Condemned/expired items should be:",
      options_ar: ["إعادتها للعرض", "عزلها والتخلص الآمن", "تخزينها مع السليم"],
      options_en: ["Returned to display", "Isolated and safely disposed", "Stored with good stock"],
      correct: 1,
    },
    {
      q_ar: "منع التلوث أثناء نقل النفايات يكون عبر:",
      q_en: "Prevent contamination during waste handling by:",
      options_ar: ["نقلها فوق الطعام", "استخدام PPE والمسار الصحيح", "تركها على الأرض"],
      options_en: ["Carrying over food", "Using PPE and correct route", "Leaving on the floor"],
      correct: 1,
    },
    {
      q_ar: "تنظيف وتعقيم سلال النفايات:",
      q_en: "Cleaning/disinfecting bins is:",
      options_ar: ["غير ضروري", "ضروري وبشكل دوري", "مرة بالسنة"],
      options_en: ["Not needed", "Required regularly", "Once a year"],
      correct: 1,
    },
  ],

  "OHS: PPE & Safe Work": [
    {
      q_ar: "معدات الوقاية الشخصية يجب أن:",
      q_en: "PPE should be:",
      options_ar: ["اختيارية", "تُلبس حسب المطلوب وتبقى نظيفة", "تُشارك بدون تنظيف"],
      options_en: ["Optional", "Worn as required and kept clean", "Shared without cleaning"],
      correct: 1,
    },
    {
      q_ar: "منع الانزلاق/التعثر يكون عبر:",
      q_en: "Slips and trips are prevented by:",
      options_ar: ["أرضية مبللة", "ترتيب المكان وتجفيف الأرضية", "الركض"],
      options_en: ["Wet floors", "Good housekeeping and dry floors", "Running"],
      correct: 1,
    },
    {
      q_ar: "الحوادث القريبة (Near-miss):",
      q_en: "Near-miss must be:",
      options_ar: ["تُهمل", "تُبلّغ", "تُخفى"],
      options_en: ["Ignored", "Reported", "Hidden"],
      correct: 1,
    },
    {
      q_ar: "مخارج الطوارئ يجب أن تكون:",
      q_en: "Emergency exits must be:",
      options_ar: ["مغلقة", "خالية دائمًا", "تستخدم للتخزين"],
      options_en: ["Blocked", "Clear at all times", "Used for storage"],
      correct: 1,
    },
    {
      q_ar: "السلوك الآمن يشمل:",
      q_en: "Safe behavior includes:",
      options_ar: ["الركض", "الانتباه والتواصل", "تجاهل الإشارات"],
      options_en: ["Running", "Awareness and communication", "Ignoring signs"],
      correct: 1,
    },
  ],

  "Food Safety": [
    {
      q_ar: "منطقة الخطر (Danger Zone) تقريبا:",
      q_en: "Danger Zone is approximately:",
      options_ar: ["5-60°C", "0-2°C", "70-90°C"],
      options_en: ["5–60°C", "0–2°C", "70–90°C"],
      correct: 0,
    },
    {
      q_ar: "الحد الأدنى للنجاح:",
      q_en: "Minimum passing score:",
      options_ar: ["50%", "80%", "100%"],
      options_en: ["50%", "80%", "100%"],
      correct: 1,
    },
    {
      q_ar: "التلوث يحدث بسبب:",
      q_en: "Contamination occurs due to:",
      options_ar: ["ممارسات غير صحيحة", "الهواء فقط", "الماء فقط"],
      options_en: ["Incorrect practices", "Air only", "Water only"],
      correct: 0,
    },
    {
      q_ar: "الطعام لا يُترك بدرجة حرارة الغرفة:",
      q_en: "Food should not be left at room temperature:",
      options_ar: ["صحيح", "خطأ", "حسب المنتج"],
      options_en: ["True", "False", "Depends on product"],
      correct: 0,
    },
    {
      q_ar: "مراقبة حرارة الثلاجة تعتبر:",
      q_en: "Chiller temperature monitoring is considered:",
      options_ar: ["مهم", "غير مهم", "للزينة"],
      options_en: ["Important", "Not important", "Decoration"],
      correct: 0,
    },
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
