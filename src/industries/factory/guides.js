// src/industries/factory/guides.js
// Fill-in guides of the manufacturing-only reports (see _kit/guides.js for
// the format and the shared steps). Limits mirror factory/reports.js.

import { t, L, START, COPY, ACTION, END } from "../_kit/guideKit";

export const FACTORY_GUIDES = {
  production_batch: {
    purpose: t("Link every finished batch to the raw-material lots it was made from — the base of any recall.", "ربط كل تشغيلة منتجة بدفعات المواد الخام المستخدمة — أساس أي استدعاء."),
    when: t("Every batch produced — line supervisor; release by QA.", "كل تشغيلة منتجة — مشرف الخط؛ والإفراج من الجودة."),
    steps: [START, t("Write the product, batch number and line; the start time is stamped.", "اكتب المنتج ورقم التشغيلة والخط؛ وقت البدء يُسجَّل تلقائياً."), t("Add one line per raw-material lot used, then the quantity produced.", "أضف سطراً لكل دفعة مادة خام مستخدمة، ثم الكمية المنتجة."), t("QA sets the release status and signs.", "الجودة تحدد حالة الإفراج وتوقّع."), END],
    limits: [
      L(t("Raw material lots", "دفعات المواد الخام"), t("Every lot recorded", "كل الدفعات مسجلة"), t("No lots (traceability incomplete)", "بلا دفعات (التتبع ناقص)"), t("Complete before release", "الاستكمال قبل الإفراج")),
      L(t("Release", "الإفراج"), t("Released and signed by QA", "مُفرج وموقّع من الجودة"), t("Rejected", "مرفوض"), t("Quarantine and investigate", "الحجر والتحقيق")),
    ],
    notes: [t("A batch without a release status stays «to review».", "التشغيلة بلا حالة إفراج تبقى «للمراجعة».")],
  },

  ccp_monitoring: {
    purpose: t("Prove each critical control point stayed within its critical limits.", "إثبات أن كل نقطة تحكم حرجة بقيت ضمن حدودها الحرجة."),
    when: t("At the frequency set in the HACCP plan — CCP operator; verified by QA.", "بالتكرار المحدد في خطة الهاسب — مشغّل النقطة؛ وتتحقق الجودة."),
    steps: [START, COPY, t("Each row carries its own critical min / max from the HACCP plan — check them once.", "كل سطر يحمل حده الأدنى والأعلى من خطة الهاسب — راجعهما مرة واحدة."), t("Write the measured value; QA signs «Verified By».", "اكتب القيمة المقاسة؛ والجودة توقّع «تم التحقق»."), ACTION, END],
    limits: [
      L(t("Measured value", "القيمة المقاسة"), t("Between critical min and max", "بين الحد الأدنى والأعلى"), t("Below min / above max", "أقل من الأدنى / أعلى من الأعلى"), t("Hold the product since the last good check; fix the process", "حجز المنتج منذ آخر فحص سليم وتصحيح العملية")),
      L(t("Critical limits", "الحدود الحرجة"), t("Set on the row", "محددة في السطر"), t("Not set", "غير محددة"), t("Enter them from the HACCP plan", "إدخالها من خطة الهاسب")),
    ],
    notes: [],
  },

  metal_detector: {
    purpose: t("Prove the metal detector finds and rejects metal before product leaves.", "إثبات أن كاشف المعادن يكتشف المعدن ويرفضه قبل خروج المنتج."),
    when: t("At start-up, every hour and at the end of production — line operator.", "عند التشغيل وكل ساعة وفي نهاية الإنتاج — مشغّل الخط."),
    steps: [START, COPY, t("Pass each test piece (Fe, non-Fe, stainless) through with the product.", "مرّر كل قطعة اختبار (حديد، غير حديدي، ستانلس) مع المنتج."), t("Confirm the reject system removed it.", "تأكد أن نظام الرفض أزالها."), ACTION, END],
    limits: [
      L(t("Test pieces", "قطع الاختبار"), t("All detected", "كلها مكتشفة"), t("Any not detected", "أي قطعة غير مكتشفة"), t("Stop the line; hold everything since the last good check; re-check it all", "إيقاف الخط وحجز كل المنتج منذ آخر فحص سليم وإعادة فحصه")),
      L(t("Reject system", "نظام الرفض"), t("Works", "يعمل"), t("Failed", "معطل"), t("Stop the line and call maintenance", "إيقاف الخط واستدعاء الصيانة")),
    ],
    notes: [],
  },

  pre_op: {
    purpose: t("Release a line for production only when it is truly clean.", "الإفراج عن الخط للإنتاج فقط عندما يكون نظيفاً فعلاً."),
    when: t("Before every production start — QA.", "قبل كل بدء إنتاج — الجودة."),
    steps: [START, COPY, t("Check each line visually, then swab and read the ATP.", "افحص كل خط بصرياً، ثم خذ مسحة واقرأ ATP."), t("Release the line only when every item passes.", "أفرج عن الخط فقط عند مطابقة كل البنود."), ACTION, END],
    limits: [
      L(t("ATP", "ATP"), t("≤ 150 RLU", "≤ 150 RLU"), t("> 300 RLU (151–300 = review)", "> 300 RLU (151–300 = للمراجعة)"), t("Clean again, re-swab, do not release", "إعادة التنظيف وأخذ مسحة جديدة وعدم الإفراج")),
      L(t("Clean, sanitised, no loose parts", "نظيف، معقّم، بلا قطع سائبة"), t("Yes", "نعم"), t("Any «No»", "أي «لا»"), t("Correct before release", "التصحيح قبل الإفراج")),
    ],
    notes: [t("Releasing a failed line keeps the row ✕ even with an action written.", "الإفراج عن خط مخالف يُبقي السطر ✕ حتى مع كتابة إجراء.")],
  },

  glass_brittle: {
    purpose: t("Make sure no glass or brittle plastic can break into the product.", "التأكد أن لا زجاج أو بلاستيك هش يمكن أن ينكسر داخل المنتج."),
    when: t("Weekly, against the register — QA.", "أسبوعياً مقابل السجل — الجودة."),
    steps: [START, COPY, t("Find each item on the register and record its condition.", "ابحث عن كل بند في السجل وسجّل حالته."), ACTION, END],
    limits: [
      L(t("Condition", "الحالة"), t("Intact", "سليم"), t("Damaged / missing", "تالف / مفقود"), t("Stop the area, search for fragments, hold exposed product", "إيقاف المنطقة والبحث عن الشظايا وحجز المنتج المكشوف")),
    ],
    notes: [],
  },

  packaging_label: {
    purpose: t("Catch wrong labels, dates, allergens, seals and weights before dispatch.", "اكتشاف أخطاء الملصق والتواريخ والحساسية والإغلاق والوزن قبل الشحن."),
    when: t("At the start of each batch and every hour — packing supervisor.", "في بداية كل تشغيلة وكل ساعة — مشرف التعبئة."),
    steps: [START, t("Take a pack from the line and check every item.", "خذ عبوة من الخط وافحص كل بند."), ACTION, END],
    limits: [
      L(t("Label, dates, allergens", "الملصق، التواريخ، الحساسية"), t("Correct", "صحيحة"), t("Wrong / missing", "خاطئة / ناقصة"), t("Stop packing; hold and relabel since the last good check", "إيقاف التعبئة وحجز وإعادة وضع الملصقات منذ آخر فحص سليم")),
      L(t("Seal / net weight", "الإغلاق / الوزن الصافي"), t("Pass / OK", "مطابق"), t("Fail / under weight", "مخالف / ناقص الوزن"), t("Adjust the machine and re-check", "ضبط الآلة وإعادة الفحص")),
    ],
    notes: [],
  },

  water_quality: {
    purpose: t("Keep the water used in production safe to drink.", "إبقاء المياه المستخدمة في الإنتاج صالحة للشرب."),
    when: t("Daily at every sampling point — QA.", "يومياً عند كل نقطة أخذ عينات — الجودة."),
    steps: [START, COPY, t("Run the tap for a minute, then test free chlorine and pH.", "افتح الصنبور دقيقة ثم افحص الكلور الحر والحموضة."), ACTION, END],
    limits: [
      L(t("Free chlorine", "الكلور الحر"), t("0.2 – 0.5 ppm", "0.2 – 0.5 جزء بالمليون"), t("< 0.2 ppm (> 0.5 = review)", "< 0.2 (> 0.5 = للمراجعة)"), t("Stop use; check the dosing system", "إيقاف الاستخدام وفحص نظام الحقن")),
      L(t("pH", "الحموضة"), t("6.5 – 8.5", "6.5 – 8.5"), t("Outside the range", "خارج النطاق"), t("Stop use and investigate", "إيقاف الاستخدام والتحقيق")),
      L(t("Appearance", "المظهر"), t("Clear, no odour", "صافية بلا رائحة"), t("Cloudy / odour", "عكرة / ذات رائحة"), t("Stop use and investigate", "إيقاف الاستخدام والتحقيق")),
    ],
    notes: [],
  },
};
