// src/pages/monitor/branches/pos6/pos6Guidance.js
//
// The guidance panel each POS 6 sheet shows above its table. Written per report
// from its own subject rather than one generic block: what the checker must not
// miss, and what has to happen when a line fails.
//
//   kind: "warn" — a rule that fails an audit or spoils product if ignored
//   kind: "tip"  — how to fill the sheet so it is actually usable later

import { RECEIVING_GUIDANCE } from "../_shared/receivingGuidance";

export const GUIDANCE = {
  personalHygiene: [
    { kind: "warn",
      en: "A handler with symptoms of a communicable disease — diarrhoea, vomiting, fever, sore throat with fever, jaundice, or an infected skin lesion — must be kept away from food and reported to the supervisor the same shift.",
      ar: "أي موظف عليه أعراض مرض معدٍ — إسهال، قيء، حرارة، التهاب حلق مع حرارة، يرقان، أو التهاب جلدي — يُمنع من ملامسة الغذاء ويُبلَّغ المشرف بنفس الوردية." },
    { kind: "warn",
      en: "Cuts and wounds must be covered with a coloured waterproof dressing, with a glove over it. An uncovered wound is an automatic NC.",
      ar: "الجروح والقطوع تُغطّى بضماد مقاوم للماء وبلون ظاهر، وفوقه قفاز. الجرح المكشوف = NC مباشرة." },
    { kind: "tip",
      en: "No jewellery except a plain wedding band. Nails short, clean and unvarnished — no false nails.",
      ar: "ممنوع أي مجوهرات باستثناء خاتم زواج سادة. الأظافر قصيرة ونظيفة وبلا طلاء ولا أظافر صناعية." },
    { kind: "tip",
      en: "The hair net must cover all hair including the fringe; the mask must cover nose and mouth, not sit under the chin.",
      ar: "شبكة الشعر تغطي كل الشعر بما فيه المقدمة؛ والكمامة تغطي الأنف والفم، مو تحت الذقن." },
    { kind: "warn",
      en: "Every NC needs a remark and a corrective action. An unexplained NC row is what an auditor writes up first.",
      ar: "كل NC لازم معه ملاحظة وإجراء تصحيحي. الصف اللي فيه NC بلا تفسير هو أول شي بيمسكه المدقّق." },
    { kind: "tip",
      en: "Run this check at the start of every shift, before anyone enters the cutting area.",
      ar: "الفحص يتم ببداية كل وردية، قبل ما يدخل أي حدا منطقة التقطيع." },
  ],

  cleaning: [
    { kind: "warn",
      en: "Never mix a detergent with a sanitizer or with any other chemical — mixing can release toxic gas.",
      ar: "لا تخلط المنظّف مع المعقّم ولا مع أي كيماوي تاني — الخلط ممكن يطلّع غازات سامة." },
    { kind: "tip",
      en: "Clean before you sanitize, always: remove debris → wash → rinse → sanitize. Sanitizer on a dirty surface does nothing.",
      ar: "التنظيف قبل التعقيم دائماً: إزالة البقايا ← غسل ← شطف ← تعقيم. المعقّم على سطح متّسخ ما بيعمل شي." },
    { kind: "warn",
      en: "Respect the contact time and dilution printed on the product. bh-30 is for food-contact surfaces; bh-20 is a general-purpose cleaner and is not a substitute.",
      ar: "التزم بزمن التلامس ونسبة التخفيف المكتوبة على المنتج. bh-30 للأسطح الملامسة للغذاء، وbh-20 منظّف عام ومو بديل عنه." },
    { kind: "warn",
      en: "Any NC means the area is re-cleaned and re-checked before it is used again — do not close the sheet on an open NC.",
      ar: "أي NC يعني إعادة تنظيف المنطقة وإعادة فحصها قبل استخدامها — ما تسكّر التقرير وفيه NC مفتوح." },
    { kind: "tip",
      en: "Store chemicals away from food, in their original labelled containers. Never decant into a water or food bottle.",
      ar: "الكيماويات تُخزَّن بعيداً عن الغذاء وبعبواتها الأصلية الموسومة. ممنوع تفريغها بقنينة مي أو عبوة غذاء." },
    { kind: "tip",
      en: "Fill the sheet as each area is finished, and sign the line yourself — a sheet completed at closing time from memory is not a record.",
      ar: "عبّي كل منطقة أول ما تخلص منها ووقّع سطرك بنفسك — تقرير بينتعبّى آخر الدوام من الذاكرة مو سجل." },
  ],

  equipment: [
    { kind: "warn",
      en: "Equipment with a crack, a chip or a missing piece goes out of service immediately — that is a foreign-body hazard, and it must be tagged so nobody puts it back.",
      ar: "أي معدة فيها شق أو كسر أو ناقصها قطعة تُسحب من الخدمة فوراً — هاد خطر جسم غريب، ولازم توسم حتى ما يرجّعها حدا." },
    { kind: "warn",
      en: "Every ✗ or a \"No\" must be matched by a written corrective action on the same line. The form will not save without it.",
      ar: "كل ✗ أو \"No\" لازم يقابله إجراء تصحيحي مكتوب بنفس السطر. النموذج ما بينحفظ بدونه." },
    { kind: "tip",
      en: "Sanitize knives and boards between meat types — beef, mutton, chicken — to stop cross-contamination.",
      ar: "عقّم السكاكين والألواح بين كل نوع لحم والتاني — بقر، غنم، دجاج — لمنع التلوث المتبادل." },
    { kind: "warn",
      en: "Isolate the bone saw and the mincer from power before dismantling them for cleaning.",
      ar: "افصل منشار العظم والمفرمة عن الكهرباء قبل فكّهم للتنظيف." },
    { kind: "tip",
      en: "Log each sanitizing round at the time it happens. Filling all five slots at once at the end of the day is the classic audit finding.",
      ar: "سجّل كل جولة تعقيم بوقتها. تعبئة الخمس خانات دفعة وحدة بآخر اليوم هي الملاحظة الكلاسيكية بالتدقيق." },
  ],

  // Same rules at every branch — see _shared/receivingGuidance.js.
  receiving: RECEIVING_GUIDANCE,

  coolers: [
    { kind: "warn",
      en: "Chillers run 0 to +5 °C; freezers at −18 °C or colder. A reading outside its range is highlighted here and needs a corrective action, not just a note.",
      ar: "البرادات من ٠ إلى +٥°م، والمجمّدات −١٨°م أو أبرد. القراءة خارج المدى بتتلوّن هون وبدها إجراء تصحيحي، مو مجرد ملاحظة." },
    { kind: "tip",
      en: "Read from a probe inside the unit or a calibrated thermometer — the door display alone drifts and is not evidence.",
      ar: "خذ القراءة من مجس داخل الوحدة أو ترمومتر معاير — شاشة الباب لحالها بتنحرف وما بتصلح كدليل." },
    { kind: "warn",
      en: "Out of range: move the product to a sound unit, check the door seal and the condenser, re-measure within 30 minutes, and write both the action and the re-check in the remarks.",
      ar: "خارج المدى: انقل المنتج لوحدة سليمة، افحص جلدة الباب والمكثّف، أعد القياس خلال ٣٠ دقيقة، واكتب الإجراء ونتيجة إعادة القياس بالملاحظات." },
    { kind: "tip",
      en: "Add one row per chiller and freezer the branch actually has, named exactly as the unit is labelled on the floor — so a reading can always be traced to a machine.",
      ar: "أضف سطر لكل براد ومجمّد موجود فعلياً بالفرع، وسمّيه بنفس الاسم المكتوب على الوحدة — حتى تقدر ترجّع أي قراءة لجهازها." },
    { kind: "warn",
      en: "Do not leave a past time slot blank. To an auditor a blank means the check was never done.",
      ar: "لا تترك خانة وقت مضى فاضية. عند المدقّق الخانة الفاضية معناها الفحص ما صار." },
    { kind: "tip",
      en: "This sheet is filled across the whole day, so it keeps a local draft as you type and clears it once the day is saved to the server.",
      ar: "هالتقرير بينتعبّى على مدار اليوم، فبيحفظ مسودة محلية أول بأول وبيمسحها لما ينحفظ اليوم على السيرفر." },
  ],
};

export default GUIDANCE;
