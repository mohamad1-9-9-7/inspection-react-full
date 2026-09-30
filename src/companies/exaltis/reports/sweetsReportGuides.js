// src/pages/monitor/branches/sweets/sweetsReportGuides.js
// "How to fill this report" guides for every sweets INPUT report — purpose,
// when / who, creation steps, allowed vs critical limits with the action to
// take, and practical notes. Bilingual by request: every line carries an
// English and an Arabic twin that render together (ReportGuide.jsx).
//
// Keyed by report type; industries/sweets/index.js attaches guide objects to
// REPORTS, and the company-app shell shows them above the input page and
// (limits + notes only) above the matching view page, so both read the same
// rules. Limits mirror dailyLogSchemas.js / coolerDefs.js — change them
// together.

const t = (en, ar) => ({ en, ar });
const L = (param, allowed, critical, action) => ({ param, allowed, critical, action });

export const SWEETS_GUIDES = {
  /* ───────────── Personal hygiene ───────────── */
  "sweets-ph": {
    purpose: t("Confirm every food handler is fit and correctly dressed before touching food.",
      "التأكد أن كل عامل أغذية لائق صحياً وملتزم باللباس قبل ملامسة الغذاء."),
    when: t("Daily, at the start of every shift — by the shift supervisor / QA.",
      "يومياً في بداية كل وردية — مشرف الوردية أو الجودة."),
    steps: [
      t("Pick the date; the staff list loads from the staff directory.", "اختر التاريخ؛ تُحمَّل قائمة العمال من دليل الموظفين."),
      t("Check each person and mark every column C (compliant) or NC.", "افحص كل عامل وضع C (مطابق) أو NC (غير مطابق) لكل عمود."),
      t("For any NC write the action in Remarks.", "لأي NC اكتب الإجراء في الملاحظات."),
      t("Fill Checked By / Verified By, then Save.", "عبّئ اسم الفاحص والمعتمِد ثم احفظ."),
    ],
    limits: [
      L(t("Nails", "الأظافر"), t("Short, clean, no polish", "قصيرة ونظيفة بدون طلاء"), t("Long / polish / false nails", "طويلة أو مطلية أو صناعية"), t("Stop work until corrected", "إيقاف العمل حتى التصحيح")),
      L(t("Jewellery", "المجوهرات"), t("None", "لا شيء"), t("Rings, watches, bracelets", "خواتم، ساعات، أساور"), t("Remove before entry", "خلعها قبل الدخول")),
      L(t("Uniform & PPE", "الزي والوقاية"), t("Clean uniform, hair net, mask, gloves, shoes", "زي نظيف، غطاء شعر، كمامة، قفازات، حذاء"), t("Missing / dirty", "ناقص أو متسخ"), t("Change / complete PPE", "استبدال أو استكمال")),
      L(t("Illness symptoms", "أعراض مرضية"), t("None", "لا توجد"), t("Diarrhoea, vomiting, fever, jaundice", "إسهال، تقيؤ، حرارة، يرقان"), t("Exclude from food handling + Sick Employee form", "إبعاد عن الغذاء + نموذج الموظف المريض")),
      L(t("Cuts / wounds", "الجروح"), t("None or covered with blue waterproof plaster + glove", "لا يوجد أو مغطى بلاصق أزرق مقاوم للماء + قفاز"), t("Open / infected wound", "جرح مكشوف أو ملتهب"), t("No handling of open food", "منع التعامل مع الغذاء المكشوف")),
    ],
    notes: [
      t("Nuts and cream products are high-risk: gloves are changed between tasks.", "منتجات المكسرات والكريمة عالية الخطورة: تُبدَّل القفازات بين المهام."),
    ],
  },

  /* ───────────── Daily cleanliness ───────────── */
  "sweets-clean": {
    purpose: t("Verify every area and machine is clean before production.", "التحقق من نظافة كل منطقة وجهاز قبل الإنتاج."),
    when: t("Daily — after cleaning and before the first batch.", "يومياً — بعد التنظيف وقبل أول دفعة إنتاج."),
    steps: [
      t("Pick the date; all items start as C (compliant).", "اختر التاريخ؛ كل البنود تبدأ C (مطابق)."),
      t("Walk the areas in order and change any failing item to NC.", "مرّ على المناطق بالترتيب وغيّر أي بند غير نظيف إلى NC."),
      t("For NC fill Informed To + Remarks (what was done).", "لأي NC عبّئ «أُبلغ إلى» والملاحظات (ما الذي تم)."),
      t("Sign Checked By / Verified By and Save.", "وقّع الفاحص والمعتمِد ثم احفظ."),
    ],
    limits: [
      L(t("Food-contact surfaces", "الأسطح الملامسة للغذاء"), t("Visibly clean, sanitized, dry", "نظيفة ومعقمة وجافة"), t("Residue, dough, cream, grease", "بقايا عجين أو كريمة أو دهون"), t("Re-clean + re-sanitize before use", "إعادة التنظيف والتعقيم قبل الاستخدام")),
      L(t("Allergen storage", "تخزين مسببات الحساسية"), t("Nuts sealed, labelled, separate", "المكسرات مغلقة ومعلَّمة ومنفصلة"), t("Open / mixed with other items", "مفتوحة أو مختلطة"), t("Separate, relabel, check cross-contact", "فصل وإعادة تعليم وفحص التلوث العرضي")),
      L(t("Pest signs", "آثار الحشرات"), t("None", "لا يوجد"), t("Droppings, insects, gnawing", "فضلات أو حشرات أو قرض"), t("Stop area + call pest control + NCR", "إيقاف المنطقة + شركة المكافحة + تقرير عدم مطابقة")),
    ],
    notes: [
      t("Sanitizer strength is recorded in the Sanitizers & Chemicals log.", "تركيز المعقم يُسجَّل في سجل المعقمات والكيماويات."),
    ],
  },

  /* ───────────── Coolers ───────────── */
  "sweets-coolers": {
    purpose: t("Critical control point: keep cream, dairy and cakes cold.", "نقطة تحكم حرجة: حفظ الكريمة والألبان والكيك باردة."),
    when: t("Every 2 hours (4 AM – 8 PM) + at least 2 product checks per day.", "كل ساعتين (4 ص – 8 م) + فحص حرارة منتجَين على الأقل يومياً."),
    steps: [
      t("First time only: set the units (name, type, limits) in Cooler Setup.", "أول مرة فقط: عرّف الوحدات (الاسم والنوع والحدود) من إعدادات البرادات."),
      t("Pick the date and enter each unit's temperature at every time slot.", "اختر التاريخ وأدخل حرارة كل وحدة في كل وقت."),
      t("Add at least 2 product temperature checks (product + °C).", "أضف فحصَين على الأقل لحرارة منتج (المنتج + الدرجة)."),
      t("Write the corrective action for any out-of-range reading, then Save.", "اكتب الإجراء لأي قراءة خارج الحد ثم احفظ."),
    ],
    limits: [
      L(t("Chiller", "البراد"), t("0 – 5 °C", "0 – 5 °م"), t("> 5 °C", "أعلى من 5 °م"), t("Probe the product; move to another chiller; call maintenance", "قِس حرارة المنتج؛ انقله لبراد آخر؛ أبلغ الصيانة")),
      L(t("Freezer", "الفريزر"), t("≤ −18 °C", "−18 °م أو أقل"), t("> −15 °C", "أعلى من −15 °م"), t("Check product is still frozen; transfer; maintenance", "تأكد أن المنتج ما زال مجمداً؛ انقله؛ الصيانة")),
      L(t("Preparation area", "منطقة التحضير"), t("≤ 10 °C (cream room)", "10 °م أو أقل (غرفة الكريمة)"), t("> 10 °C", "أعلى من 10 °م"), t("Limit time out of chiller; fix A/C", "قلّل وقت خروج المنتج؛ إصلاح التكييف")),
      L(t("Loading area", "منطقة التحميل"), t("≤ 16 °C", "16 °م أو أقل"), t("> 16 °C", "أعلى من 16 °م"), t("Load quickly; keep doors closed", "تحميل سريع وإغلاق الأبواب")),
    ],
    notes: [
      t("A cream product above 5 °C for more than 2 hours must be discarded.", "منتج الكريمة الذي بقي فوق 5 °م أكثر من ساعتين يُتلف."),
    ],
  },

  /* ───────────── Visitors ───────────── */
  sweets_visitor_checklist: {
    purpose: t("Screen visitors and contractors before they enter production.", "فحص الزوار والمقاولين قبل دخول منطقة الإنتاج."),
    when: t("Every visit, before entry.", "في كل زيارة وقبل الدخول."),
    steps: [
      t("Enter the visitor's name, company and purpose.", "أدخل اسم الزائر وجهته وسبب الزيارة."),
      t("Ask the health questions (Q1–Q3) and tick the answers.", "اسأل الأسئلة الصحية (Q1–Q3) وسجّل الإجابات."),
      t("Visitor signs the declaration; give PPE; Save.", "يوقّع الزائر الإقرار؛ سلّمه أدوات الوقاية؛ احفظ."),
    ],
    limits: [
      L(t("Q1 illness (diarrhoea, fever, hepatitis, typhoid)", "Q1 مرض (إسهال، حرارة، التهاب كبد، تيفوئيد)"), t("All No", "كلها لا"), t("Any Yes", "أي «نعم»"), t("Refuse entry to production", "منع الدخول للإنتاج")),
      L(t("Q2/Q3 wounds or skin disease", "Q2/Q3 جروح أو مرض جلدي"), t("No", "لا"), t("Yes, uncovered", "نعم ومكشوف"), t("Cover + gloves, or refuse entry", "تغطية + قفازات أو منع الدخول")),
    ],
    notes: [
      t("No jewellery, phones or food inside production areas.", "ممنوع المجوهرات والهواتف والطعام داخل الإنتاج."),
    ],
  },

  /* ───────────── NCR ───────────── */
  sweets_non_conformance: {
    purpose: t("Record any deviation, its root cause and the corrective action until closed.", "تسجيل أي انحراف وسببه والإجراء التصحيحي حتى الإغلاق."),
    when: t("As soon as a deviation is found (any report showing ✕).", "فور اكتشاف انحراف (أي تقرير فيه ✕)."),
    steps: [
      t("Pick the date and the area; write what happened.", "اختر التاريخ والمنطقة؛ اكتب ما حدث."),
      t("Tick the source (in-house QC, audit, complaint, DM inspection…).", "حدّد المصدر (فحص داخلي، تدقيق، شكوى، تفتيش البلدية…)."),
      t("Add photos as evidence.", "أرفق صوراً كدليل."),
      t("Write corrective action, responsible person and target date.", "اكتب الإجراء والمسؤول والتاريخ المستهدف."),
      t("QA verifies and closes when the action is proven effective.", "الجودة تتحقق وتغلق عند ثبوت فعالية الإجراء."),
    ],
    limits: [
      L(t("Food-safety impact", "التأثير على سلامة الغذاء"), t("None — quality only", "لا — جودة فقط"), t("Product may be unsafe", "قد يكون المنتج غير آمن"), t("Hold the product immediately; decide release / destroy", "حجز المنتج فوراً؛ قرار إفراج أو إتلاف")),
      L(t("Closure time", "مدة الإغلاق"), t("Within target date", "ضمن التاريخ المستهدف"), t("Overdue / repeated", "متأخر أو متكرر"), t("Escalate to management; root-cause review", "تصعيد للإدارة؛ مراجعة السبب الجذري")),
    ],
    notes: [
      t("Fix the cause, not just the symptom — ask «why» until the real cause appears.", "عالج السبب لا العَرَض — اسأل «لماذا» حتى يظهر السبب الحقيقي."),
    ],
  },

  /* ───────────── Product rejection ───────────── */
  sweets_product_rejection: {
    purpose: t("Document every rejected raw material or product and its disposal.", "توثيق كل مادة خام أو منتج مرفوض وطريقة التصرف به."),
    when: t("At receiving or whenever a product is rejected in production / storage.", "عند الاستلام أو عند رفض أي منتج في الإنتاج أو التخزين."),
    steps: [
      t("Choose category, product, supplier and lot.", "اختر الفئة والمنتج والمورد ورقم الدفعة."),
      t("Select the rejection reason and quantity.", "اختر سبب الرفض والكمية."),
      t("Take photos; set the disposition (return / destroy / hold).", "صوّر؛ حدّد التصرف (إرجاع، إتلاف، حجز)."),
      t("Inform the supplier and Save.", "أبلغ المورد ثم احفظ."),
    ],
    limits: [
      L(t("Nuts", "المكسرات"), t("Dry, no rancid smell, COA with aflatoxin result", "جافة، بدون زناخة، مع شهادة تحليل أفلاتوكسين"), t("Mould, insects, rancid, no COA", "عفن، حشرات، زناخة، بدون شهادة"), t("Reject — do not store with accepted stock", "رفض — لا تُخزَّن مع المقبول")),
      L(t("Chilled (cream, dairy, eggs)", "المبرّد (كريمة، ألبان، بيض)"), t("≤ 5 °C", "5 °م أو أقل"), t("> 5 °C", "أعلى من 5 °م"), t("Reject", "رفض")),
      L(t("Dry goods (sugar, flour)", "المواد الجافة (سكر، طحين)"), t("Sealed, dry, free-flowing", "مغلقة وجافة وغير متكتلة"), t("Wet, caked, torn, pests", "رطبة، متكتلة، ممزقة، حشرات"), t("Reject", "رفض")),
    ],
    notes: [
      t("Rejected goods are tagged «REJECTED» and kept apart until collected or destroyed.", "المرفوض يُعلَّم «مرفوض» ويُعزل حتى الاستلام أو الإتلاف."),
    ],
  },

  /* ───────────── Pest control ───────────── */
  sweets_pest_control: {
    purpose: t("Record every pest control visit, bait-station check and finding.", "تسجيل كل زيارة مكافحة وفحص محطات الطُعم والملاحظات."),
    when: t("Each contractor visit (at least monthly) + after any sighting.", "كل زيارة للشركة (شهرياً على الأقل) + بعد أي مشاهدة."),
    steps: [
      t("Enter the date, area, visit type and the company / technician.", "أدخل التاريخ والمنطقة ونوع الزيارة والشركة والفني."),
      t("Add each bait station and its status.", "أضف كل محطة طُعم وحالتها."),
      t("Record chemicals used and attach the service report / photos.", "سجّل المواد المستخدمة وأرفق تقرير الخدمة والصور."),
      t("Save; open an NCR if activity was found.", "احفظ؛ افتح تقرير عدم مطابقة إذا وُجد نشاط."),
    ],
    limits: [
      L(t("Pest activity", "نشاط الآفات"), t("None", "لا يوجد"), t("Any activity inside production", "أي نشاط داخل الإنتاج"), t("Stop the area, inspect product, NCR, extra treatment", "إيقاف المنطقة وفحص المنتج وتقرير عدم مطابقة ومعالجة إضافية")),
      L(t("Pest control company", "شركة المكافحة"), t("DM-approved, valid contract", "معتمدة من البلدية بعقد ساري"), t("Not approved / expired", "غير معتمدة أو منتهي"), t("Renew before the next visit", "تجديد قبل الزيارة القادمة")),
    ],
    notes: [
      t("No bait stations inside production — only outside and at entrances; insect killers (EFK) inside.", "لا طُعم داخل الإنتاج — في الخارج وعند المداخل فقط؛ وصاعق الحشرات في الداخل."),
    ],
  },

  /* ───────────── Staff sickness ───────────── */
  sweets_staff_sickness: {
    purpose: t("Record sick or injured staff, the action taken and fitness to return.", "تسجيل العامل المريض أو المصاب والإجراء وعودته للعمل."),
    when: t("Whenever a worker reports illness or is found unwell.", "عند إبلاغ العامل عن مرض أو ملاحظة ذلك عليه."),
    steps: [
      t("Enter the employee number and name.", "أدخل رقم الموظف واسمه."),
      t("Write the symptoms and the action (sent home / clinic).", "اكتب الأعراض والإجراء (إرسال للمنزل أو العيادة)."),
      t("Fill Date From; add Date Returned when back.", "عبّئ تاريخ البداية؛ وتاريخ العودة عند رجوعه."),
      t("Sign and Save.", "وقّع ثم احفظ."),
    ],
    limits: [
      L(t("Diarrhoea / vomiting", "إسهال أو تقيؤ"), t("—", "—"), t("Any episode", "أي حالة"), t("Off food handling until 48 h symptom-free", "إبعاد عن الغذاء حتى 48 ساعة بدون أعراض")),
      L(t("Jaundice, typhoid, infected skin", "يرقان، تيفوئيد، التهاب جلدي"), t("—", "—"), t("Any case", "أي حالة"), t("Medical clearance required to return", "العودة بشهادة طبية فقط")),
    ],
    notes: [
      t("Notifiable diseases must be reported to Dubai Municipality / DHA.", "الأمراض المُبلَّغ عنها تُبلَّغ لبلدية دبي أو هيئة الصحة."),
    ],
  },

  /* ───────────── Raw material receiving ───────────── */
  sweets_raw_receiving: {
    purpose: t("Accept only safe raw materials and record their lot for traceability.", "قبول المواد الخام الآمنة فقط وتسجيل دفعتها للتتبع."),
    when: t("Every delivery, before goods enter the store.", "كل توريد وقبل دخول البضاعة المخزن."),
    steps: [
      t("Open today's sheet — one sheet per day, add a row per item.", "افتح ورقة اليوم — ورقة واحدة يومياً وسطر لكل صنف."),
      t("Choose supplier, material and storage type (dry / chilled / frozen).", "اختر المورد والمادة ونوع التخزين (جاف، مبرد، مجمد)."),
      t("Copy the Lot No. and dates from the label; probe chilled / frozen items.", "انسخ رقم الدفعة والتواريخ من الملصق؛ قِس حرارة المبرّد والمجمّد."),
      t("Check vehicle, packaging, appearance, pests; COA for nuts.", "افحص السيارة والتغليف والشكل والحشرات؛ وشهادة التحليل للمكسرات."),
      t("Choose the decision; the Status column shows ✓ / ! / ✕ live.", "اختر القرار؛ عمود الحالة يعرض ✓ / ! / ✕ مباشرة."),
    ],
    limits: [
      L(t("Chilled (cream, milk, butter, eggs)", "المبرّد (كريمة، حليب، زبدة، بيض)"), t("≤ 5 °C", "5 °م أو أقل"), t("> 5 °C", "أعلى من 5 °م"), t("Reject", "رفض")),
      L(t("Frozen", "المجمّد"), t("≤ −18 °C", "−18 °م أو أقل"), t("> −18 °C / signs of thawing", "أعلى من −18 °م أو علامات ذوبان"), t("Reject", "رفض")),
      L(t("Shelf life", "الصلاحية"), t("Enough remaining life", "صلاحية متبقية كافية"), t("Expired / no date", "منتهية أو بدون تاريخ"), t("Reject", "رفض")),
      L(t("Nuts", "المكسرات"), t("COA + aflatoxin, dry, no smell", "شهادة تحليل وأفلاتوكسين، جافة، بدون رائحة"), t("No COA, mould, insects, rancid", "بدون شهادة، عفن، حشرات، زناخة"), t("Reject / hold until COA", "رفض أو حجز حتى وصول الشهادة")),
      L(t("Vehicle & packaging", "السيارة والتغليف"), t("Clean, intact", "نظيفة وسليم"), t("Dirty / torn / wet", "متسخة أو ممزق أو مبلول"), t("Reject + Product Rejection form", "رفض + نموذج رفض المنتج")),
    ],
    notes: [
      t("Chilled items go to the chiller within 15 minutes of arrival.", "المبرّد يدخل البراد خلال 15 دقيقة من وصوله."),
      t("Lots entered here appear in the Production log's «Add received lot» list.", "الدفعات المسجلة هنا تظهر في قائمة «إضافة دفعة مستلمة» بسجل الإنتاج."),
    ],
  },

  /* ───────────── Baking & cooking ───────────── */
  sweets_thawing: {
    purpose: t("Thaw frozen dough, butter, cream and cheese safely, and know when each thawed item must be used.",
      "إذابة العجين والزبدة والكريمة والأجبان المجمّدة بطريقة آمنة ومعرفة متى يجب استخدام كل صنف بعد إذابته."),
    when: t("Every time a frozen item is taken out to thaw — the row stays on the sheet of the day it started until it is closed.",
      "كل مرة يُخرَج فيها صنف مجمّد للإذابة — يبقى السطر على ورقة يوم البدء حتى يُغلَق."),
    steps: [
      t("Type or pick the Lot No. — frozen lots from Raw Material Receiving fill item, supplier and expiry.", "اكتب أو اختر رقم الدفعة — دفعات المجمّد من سجل الاستلام تعبّئ الصنف والمورد والانتهاء."),
      t("Choose the method and read the chiller / water temperature; probe the item's start temperature.", "اختر طريقة الإذابة وسجّل حرارة البراد أو الماء؛ وقِس حرارة الصنف عند البدء."),
      t("Start date and time fill themselves on the first entry.", "تاريخ ووقت البدء يُعبَّآن تلقائياً عند أول إدخال."),
      t("When thawing ends, enter End Time and the core temperature — the hours and Use By are calculated.", "عند انتهاء الإذابة أدخل وقت الانتهاء وحرارة اللب — تُحسب الساعات وتاريخ «يُستخدم قبل» تلقائياً."),
      t("Thaws still open from earlier days are listed at the top — open that sheet to close them.", "الإذابات المفتوحة من أيام سابقة تظهر أعلى الصفحة — افتح ورقتها لإغلاقها."),
      t("Label the item with thaw date + use by, then record where it was used.", "ضع ملصقاً بتاريخ الإذابة و«يُستخدم قبل» ثم سجّل أين استُخدم."),
    ],
    limits: [
      L(t("Chiller thawing", "الإذابة في البراد"), t("Chiller ≤ 5 °C, item core ≤ 5 °C at end", "البراد 5 °م أو أقل، ولب الصنف 5 °م أو أقل عند الانتهاء"), t("> 5 °C", "أعلى من 5 °م"), t("Move to a working chiller; assess / discard high-risk items", "النقل لبراد سليم؛ تقييم أو إتلاف الأصناف عالية الخطورة")),
      L(t("Cold running water", "الماء البارد الجاري"), t("Water ≤ 21 °C, max 4 h, sealed pack", "الماء 21 °م أو أقل، 4 ساعات كحد أقصى، عبوة مغلقة"), t("> 21 °C or > 4 h", "أعلى من 21 °م أو أكثر من 4 ساعات"), t("Use at once or discard", "الاستخدام فوراً أو الإتلاف")),
      L(t("Room temperature", "حرارة الغرفة"), t("Low-risk only (butter, dough, fruit), ≤ 4 h", "للأصناف منخفضة الخطورة فقط (زبدة، عجين، فواكه)، 4 ساعات كحد أقصى"), t("Cream, cheese, egg, fillings at room temp", "الكريمة أو الأجبان أو البيض أو الحشوات على حرارة الغرفة"), t("Discard + NCR", "إتلاف + تقرير عدم مطابقة")),
      L(t("Use after thawing", "الاستخدام بعد الإذابة"), t("Cream, cheese, egg, fillings 24 h · butter, dough, fruit 72 h", "الكريمة والأجبان والبيض والحشوات 24 ساعة · الزبدة والعجين والفواكه 72 ساعة"), t("Past use by", "تجاوز «يُستخدم قبل»"), t("Discard", "إتلاف")),
      L(t("Refreezing", "إعادة التجميد"), t("Never", "ممنوع"), t("Thawed item refrozen", "إعادة تجميد صنف مُذاب"), t("Discard", "إتلاف")),
      L(t("Storage while thawing", "التخزين أثناء الإذابة"), t("Covered, on a drip tray, bottom shelf", "مغطى، على صينية تصريف، في الرف السفلي"), t("Uncovered / dripping on other food", "مكشوف أو يقطر على أغذية أخرى"), t("Cover + move; check food below", "التغطية والنقل؛ فحص الأغذية تحته")),
    ],
    notes: [
      t("Microwave thawing or baking from frozen means the item is used at once — no Use By is given.", "الإذابة بالمايكرويف أو الخَبز مباشرة من التجميد تعني الاستخدام الفوري — بدون «يُستخدم قبل»."),
      t("The 24 h / 72 h use-by is the company rule — ask QA to change it if your SOP differs.", "مدة 24 / 72 ساعة قاعدة الشركة — اطلب من الجودة تعديلها إذا اختلف الإجراء المعتمد."),
    ],
  },

  sweets_baking_cooking: {
    purpose: t("Prove every batch was baked / cooked enough to be safe.", "إثبات أن كل دفعة خُبزت أو طُبخت بما يكفي لتكون آمنة."),
    when: t("Every batch.", "كل دفعة."),
    steps: [
      t("Add a row per batch: product, batch no., process, oven.", "سطر لكل دفعة: المنتج، رقم الدفعة، العملية، الفرن."),
      t("Start time fills itself; enter the end time — duration is calculated.", "وقت البدء يُعبّأ تلقائياً؛ أدخل وقت الانتهاء فتُحسب المدة."),
      t("Probe the core of custards, fillings and syrups; record °C.", "قِس حرارة قلب الكاسترد والحشوات والقطر وسجّلها."),
      t("Write a corrective action for any ✕, then Save.", "اكتب الإجراء لأي ✕ ثم احفظ."),
    ],
    limits: [
      L(t("Core temp — custard, cream fillings, syrup", "حرارة القلب — كاسترد، حشوات كريمة، قطر"), t("≥ 75 °C", "75 °م أو أعلى"), t("< 75 °C", "أقل من 75 °م"), t("Continue cooking and re-probe", "إكمال الطبخ وإعادة القياس")),
      L(t("Baked goods", "المخبوزات"), t("Fully baked (doneness Pass)", "مخبوزة بالكامل (اختبار النضج مطابق)"), t("Raw centre", "وسط غير ناضج"), t("Re-bake or discard", "إعادة الخبز أو الإتلاف")),
    ],
    notes: [
      t("Probe thermometers are sanitized between products and checked monthly.", "تُعقَّم مجسّات الحرارة بين المنتجات وتُعايَر شهرياً."),
    ],
  },

  /* ───────────── Cooling & display ───────────── */
  sweets_cooling_display: {
    purpose: t("Cool cooked fillings fast and keep cream cakes at ≤ 5 °C.", "تبريد الحشوات المطبوخة بسرعة وحفظ كيك الكريمة على 5 °م أو أقل."),
    when: t("Every cooked batch (cooling) + 3 times a day (display).", "كل دفعة مطبوخة (التبريد) + 3 مرات يومياً (العرض)."),
    steps: [
      t("Cooling: record start °C, then the reading at 2 h and 6 h.", "التبريد: سجّل حرارة البداية ثم القراءة بعد ساعتين وبعد 6 ساعات."),
      t("Display: one row per chiller / display, morning – noon – evening.", "العرض: سطر لكل براد أو ثلاجة عرض، صباحاً وظهراً ومساءً."),
      t("Check labels and dates on displayed cakes.", "افحص الملصقات والتواريخ على الكيك المعروض."),
    ],
    limits: [
      L(t("Cooling stage 1", "التبريد — المرحلة 1"), t("60 → 21 °C within 2 h", "من 60 إلى 21 °م خلال ساعتين"), t("> 21 °C at 2 h", "أعلى من 21 °م بعد ساعتين"), t("Reheat to 75 °C and restart, or discard", "إعادة التسخين إلى 75 °م والبدء من جديد أو الإتلاف")),
      L(t("Cooling stage 2", "التبريد — المرحلة 2"), t("≤ 5 °C within 6 h in total", "5 °م أو أقل خلال 6 ساعات إجمالاً"), t("> 5 °C at 6 h", "أعلى من 5 °م بعد 6 ساعات"), t("Discard", "إتلاف")),
      L(t("Chilled display", "العرض المبرّد"), t("≤ 5 °C", "5 °م أو أقل"), t("> 5 °C", "أعلى من 5 °م"), t("Move products; > 2 h above 5 °C → discard", "نقل المنتجات؛ أكثر من ساعتين فوق 5 °م = إتلاف")),
    ],
    notes: [
      t("Use shallow trays or the blast chiller — never leave fillings to cool on the bench overnight.", "استخدم صواني ضحلة أو المبرّد السريع — لا تترك الحشوات تبرد على الطاولة طوال الليل."),
    ],
  },

  /* ───────────── Production & batches ───────────── */
  sweets_production_batch: {
    purpose: t("Link each finished batch to the raw-material lots used — the base of any recall.", "ربط كل دفعة نهائية بدفعات المواد الخام المستخدمة — أساس أي سحب للمنتج."),
    when: t("Every production batch — dispatch lines are added as the batch is sent out.", "كل دفعة إنتاج — وأسطر التوزيع تُضاف عند إرسال الدفعة."),
    steps: [
      t("Add a row per finished batch: product, batch no., quantity.", "سطر لكل دفعة نهائية: المنتج، رقم الدفعة، الكمية."),
      t("Raw materials: «+ Add received lot» (from the receiving log), then type the quantity used of each lot.", "المواد الخام: «+ إضافة دفعة مستلمة» (من سجل الاستلام) ثم اكتب الكمية المستخدمة من كل دفعة."),
      t("Declare allergens and record whether the line was cleaned after the previous allergen run.", "صرّح بمسببات الحساسية وسجّل هل نُظّف الخط بعد تشغيلة المكسرات أو الحساسية السابقة."),
      t("Check label and dates; QA sets Release Status and signs Released By.", "افحص الملصق والتواريخ؛ الجودة تحدد حالة الإفراج وتوقّع."),
      t("After release, add a dispatch line for every branch / customer (date + qty).", "بعد الإفراج أضف سطر توزيع لكل فرع أو عميل (التاريخ + الكمية)."),
    ],
    limits: [
      L(t("Traceability (backward)", "التتبع للخلف"), t("Every lot listed with the quantity used", "كل دفعة مواد مسجلة مع الكمية المستخدمة"), t("No lots recorded", "لا توجد دفعات مسجلة"), t("Batch cannot be released", "لا يُفرج عن الدفعة")),
      L(t("Allergen changeover", "التنظيف بعد مسببات الحساسية"), t("Yes, or N/A (first run / same allergens)", "نعم، أو N/A (أول تشغيلة أو نفس المسببات)"), t("No — line not cleaned", "لا — الخط لم يُنظَّف"), t("Hold the batch; label «may contain nuts» or discard", "حجز الدفعة؛ ملصق «قد يحتوي على مكسرات» أو إتلاف")),
      L(t("Allergen label", "ملصق الحساسية"), t("Matches the recipe (nuts, gluten, milk, eggs, sesame)", "مطابق للوصفة (مكسرات، غلوتين، حليب، بيض، سمسم)"), t("Missing / wrong", "ناقص أو خاطئ"), t("Relabel before dispatch", "إعادة الملصق قبل الإرسال")),
      L(t("QA release", "إفراج الجودة"), t("Released only when every check is ✓", "إفراج فقط عندما تكون كل الفحوص ✓"), t("Released with a ✕, or dispatched before release", "إفراج مع ✕، أو توزيع قبل الإفراج"), t("Recall the dispatched quantity; NCR", "سحب الكمية الموزعة؛ تقرير عدم مطابقة")),
      L(t("Traceability (forward)", "التتبع للأمام"), t("Every dispatch recorded (where, when, how much)", "كل توزيع مسجل (أين، متى، كم)"), t("Released but no dispatch recorded", "مُفرج عنه بدون توزيع مسجل"), t("Complete the dispatch lines the same day", "إكمال أسطر التوزيع في نفس اليوم")),
    ],
    notes: [
      t("Recall: search the view page by a raw lot number — you get every batch that used it and every branch / customer it went to.", "السحب: ابحث في صفحة العرض برقم دفعة المادة الخام — تظهر كل الدفعات التي استخدمتها وكل فرع أو عميل وصلته."),
      t("Run nut-free products first, nut products last, then clean the line.", "شغّل المنتجات الخالية من المكسرات أولاً، ومنتجات المكسرات أخيراً، ثم نظّف الخط."),
    ],
  },

  /* ───────────── Sanitizers & chemicals ───────────── */
  sweets_sanitizer_chemicals: {
    purpose: t("Prove sanitizers are at the right strength and chemicals are controlled.", "إثبات أن المعقمات بالتركيز الصحيح وأن الكيماويات تحت السيطرة."),
    when: t("Each new sanitizer solution (at least every shift); register reviewed monthly.", "عند كل تحضير لمحلول (مرة كل وردية على الأقل)؛ والسجل يُراجع شهرياً."),
    steps: [
      t("Choose the sanitizer — the target range fills itself.", "اختر المعقم — يُعبّأ المدى المطلوب تلقائياً."),
      t("Dip a test strip and enter the measured ppm.", "اغمس شريط الفحص وأدخل التركيز المقاس (ppm)."),
      t("Chemicals register: «Copy from last sheet», then update what changed.", "سجل الكيماويات: «نسخ من آخر ورقة» ثم عدّل ما تغيّر."),
    ],
    limits: [
      L(t("Chlorine (food surfaces)", "الكلور (أسطح الغذاء)"), t("50 – 200 ppm", "50 – 200 جزء بالمليون"), t("< 50 or > 200 ppm", "أقل من 50 أو أعلى من 200"), t("Re-mix the solution and re-test", "إعادة تحضير المحلول والفحص")),
      L(t("Quaternary ammonium (QAC)", "الأمونيوم الرباعي"), t("200 – 400 ppm", "200 – 400 جزء بالمليون"), t("Outside range", "خارج المدى"), t("Re-mix and re-test", "إعادة التحضير والفحص")),
      L(t("Peracetic acid", "حمض البيروكسي أسيتيك"), t("150 – 300 ppm", "150 – 300 جزء بالمليون"), t("Outside range", "خارج المدى"), t("Re-mix and re-test", "إعادة التحضير والفحص")),
      L(t("Chemical storage", "تخزين الكيماويات"), t("Labelled, locked, SDS available, away from food", "معلَّمة ومقفلة ومعها نشرة السلامة وبعيدة عن الغذاء"), t("Unlabelled / near food", "بدون ملصق أو قرب الغذاء"), t("Move and label immediately", "النقل والتعليم فوراً")),
    ],
    notes: [
      t("Always follow the label's dilution; rinse if the product requires it.", "اتبع دائماً نسبة التخفيف على الملصق؛ واشطف إن تطلّب المنتج ذلك."),
    ],
  },

  /* ───────────── Preventive maintenance ───────────── */
  sweets_preventive_maintenance: {
    purpose: t("Keep equipment safe and calibrated, and return it to use clean.", "إبقاء المعدات آمنة ومعايَرة وإعادتها للعمل نظيفة."),
    when: t("On the maintenance plan dates + any breakdown or calibration.", "حسب خطة الصيانة + أي عطل أو معايرة."),
    steps: [
      t("«Copy from last sheet» to bring the equipment list.", "«نسخ من آخر ورقة» لجلب قائمة المعدات."),
      t("For each task: type, description, who did it, status.", "لكل مهمة: النوع، الوصف، المنفِّذ، الحالة."),
      t("After work near food: QA gives hygiene clearance (clean + no loose parts).", "بعد أي عمل قرب الغذاء: الجودة تعطي الإذن الصحي (نظيف وبدون قطع سائبة)."),
      t("Set the next due date and Save.", "حدّد موعد الصيانة القادمة ثم احفظ."),
    ],
    limits: [
      L(t("Hygiene clearance", "الإذن الصحي"), t("Given before restart", "يُعطى قبل التشغيل"), t("Restarted without clearance", "تشغيل بدون إذن"), t("Stop, clean, inspect product made", "إيقاف وتنظيف وفحص ما أُنتج")),
      L(t("Thermometers / scales", "موازين الحرارة والأوزان"), t("Within ±1 °C / calibrated", "ضمن ±1 °م / معايَرة"), t("Out of tolerance", "خارج السماحية"), t("Remove from use; recalibrate / replace", "إيقاف استخدامه؛ معايرة أو استبدال")),
      L(t("Due date", "موعد الصيانة"), t("On time", "في موعده"), t("Overdue", "متأخر"), t("Plan immediately", "جدولة فورية")),
    ],
    notes: [
      t("Check thermometers monthly in ice water (0 °C) and boiling water (100 °C).", "افحص موازين الحرارة شهرياً في ماء مثلج (0 °م) وماء مغلي (100 °م)."),
    ],
  },
};

/* ───────────── HACCP → Allergen Matrix ───────────── */
SWEETS_GUIDES.sweets_haccp_allergen_matrix = {
  purpose: t("One table that says which allergens every product contains or may contain — the source for labels, cleaning and run order.", "جدول واحد يبيّن مسببات الحساسية التي يحتويها أو قد يحتويها كل منتج — مرجع الملصقات والتنظيف وترتيب التشغيل."),
  when: t("Set up once; review yearly and whenever a recipe, supplier or line changes.", "يُعدّ مرة واحدة؛ ويُراجع سنوياً وعند أي تغيير في الوصفة أو المورد أو الخط."),
  steps: [
    t("Press Edit and add every finished product (name, code, category).", "اضغط تعديل وأضف كل منتج نهائي (الاسم، الرمز، الفئة)."),
    t("Click each allergen cell: C = contains, M = may contain, – = free.", "اضغط خانة كل مسبب: C = يحتوي، M = قد يحتوي، – = خالٍ."),
    t("For tree nuts write the nut type(s) — the label must name them.", "للمكسرات اكتب نوعها — يجب ذكره على الملصق."),
    t("Enter reviewer and review date; Save. Copy the Label Statement onto the product label.", "أدخل المراجِع وتاريخ المراجعة؛ احفظ. انقل «بيان الملصق» إلى ملصق المنتج."),
  ],
  limits: [
    L(t("Contains (C)", "يحتوي (C)"), t("Declared on the label by name", "مذكور على الملصق بالاسم"), t("Missing from the label", "غير مذكور على الملصق"), t("Stop dispatch; relabel or recall", "إيقاف الإرسال؛ إعادة الملصق أو سحب المنتج")),
    L(t("May contain (M)", "قد يحتوي (M)"), t("Only for a real, assessed cross-contact risk", "فقط لخطر تلوث عرضي حقيقي ومقيَّم"), t("Used instead of cleaning", "يُستخدم بدل التنظيف"), t("Fix the cleaning / segregation first", "أصلح التنظيف والفصل أولاً")),
    L(t("Review", "المراجعة"), t("Within 12 months", "خلال 12 شهراً"), t("> 12 months or after a recipe change", "أكثر من 12 شهراً أو بعد تغيير وصفة"), t("Review and re-sign the matrix", "مراجعة المصفوفة وإعادة توقيعها")),
  ],
  notes: [
    t("Follow the suggested run order: allergen-free first, nuts last, then clean the line.", "اتبع ترتيب التشغيل المقترح: الخالي من المسببات أولاً والمكسرات أخيراً ثم نظّف الخط."),
    t("Check supplier specs too — chocolate or flour can carry «may contain nuts».", "راجع مواصفات الموردين أيضاً — الشوكولاتة أو الطحين قد تحمل «قد يحتوي على مكسرات»."),
  ],
};

/* ───────────── Vehicles (Cars hub) ───────────── */
SWEETS_GUIDES.sweets_cars_loading_inspection = {
  purpose: t("Check every vehicle before products leave: temperature, hygiene and loading safety.", "فحص كل سيارة قبل خروج المنتجات: الحرارة والنظافة وسلامة التحميل."),
  when: t("Every loading, before the doors close.", "في كل تحميل وقبل إغلاق الأبواب."),
  steps: [
    t("Pick the vehicle no. and driver (add new ones once — they are remembered).", "اختر رقم السيارة والسائق (أضف الجديد مرة واحدة فيُحفظ)."),
    t("Choose the destination; enter loading start and end time.", "اختر الوجهة؛ أدخل وقت بدء التحميل وانتهائه."),
    t("Read the truck display thermometer and enter °C.", "اقرأ شاشة حرارة الشاحنة وأدخل الدرجة."),
    t("Answer each safety and hygiene check Yes / No; Save.", "أجب عن كل فحص سلامة ونظافة بنعم أو لا؛ احفظ."),
  ],
  limits: [
    L(t("Truck temperature (cream / dairy products)", "حرارة الشاحنة (منتجات الكريمة والألبان)"), t("≤ 5 °C, pre-cooled before loading", "5 °م أو أقل، ومبرَّدة قبل التحميل"), t("> 5 °C (cell turns red)", "أعلى من 5 °م (الخانة تصير حمراء)"), t("Do not load; cool the truck or use another", "لا تحمّل؛ برّد الشاحنة أو استخدم غيرها")),
    L(t("Load time", "مدة التحميل"), t("Short — doors open only while loading", "قصيرة — الأبواب مفتوحة أثناء التحميل فقط"), t("Products left out > 20 min", "المنتجات خارج التبريد أكثر من 20 دقيقة"), t("Check product temperature before dispatch", "افحص حرارة المنتج قبل الإرسال")),
    L(t("Vehicle hygiene", "نظافة السيارة"), t("Clean floor, curtain, no odour, no pests", "أرضية وستارة نظيفة، بدون رائحة أو حشرات"), t("Dirty / odour / pests", "متسخة أو رائحة أو حشرات"), t("Clean before loading; record in Truck Cleaning", "التنظيف قبل التحميل؛ وسجّله في تنظيف السيارات")),
  ],
  notes: [
    t("Cakes are loaded last and unloaded first; never with raw materials or chemicals.", "الكيك يُحمَّل آخراً ويُنزَّل أولاً؛ ولا يُنقل مع مواد خام أو كيماويات."),
  ],
};

SWEETS_GUIDES.sweets_truck_daily_cleaning = {
  purpose: t("Prove every vehicle is cleaned and sanitized daily.", "إثبات أن كل سيارة تُنظَّف وتُعقَّم يومياً."),
  when: t("Daily, after the last delivery (or before the first loading).", "يومياً بعد آخر توصيلة (أو قبل أول تحميل)."),
  steps: [
    t("Pick the date and add a row per vehicle.", "اختر التاريخ وأضف سطراً لكل سيارة."),
    t("Mark each area C (clean) or N/C.", "ضع C (نظيف) أو N/C لكل جزء."),
    t("For N/C write who was informed and the remark; Save.", "لأي N/C اكتب من أُبلغ والملاحظة؛ احفظ."),
  ],
  limits: [
    L(t("Floor, walls, door, curtain", "الأرضية والجدران والباب والستارة"), t("Clean, dry, no residue or odour", "نظيفة وجافة بدون بقايا أو رائحة"), t("Residue, cream / sugar spills, odour", "بقايا أو انسكاب كريمة وسكر أو رائحة"), t("Re-clean + sanitize; vehicle not used until C", "إعادة التنظيف والتعقيم؛ لا تُستخدم حتى تصبح C")),
    L(t("Racks, pallets, boxes", "الرفوف والطبليات والصناديق"), t("Clean, undamaged", "نظيفة وسليمة"), t("Broken / dirty", "مكسورة أو متسخة"), t("Replace or clean", "استبدال أو تنظيف")),
  ],
  notes: [
    t("Sugar and cream spills attract ants and pests — clean them the same day.", "انسكاب السكر والكريمة يجذب النمل والحشرات — نظّفه في نفس اليوم."),
  ],
};

export const guideFor = (type) => SWEETS_GUIDES[type] || null;
