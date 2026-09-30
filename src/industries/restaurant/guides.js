// src/industries/restaurant/guides.js
// Fill-in guides of the restaurant-only reports (see _kit/guides.js for the
// format and the shared steps). Limits mirror restaurant/reports.js.

import { t, L, START, COPY, ACTION, END } from "../_kit/guideKit";

export const RESTAURANT_GUIDES = {
  cooking: {
    purpose: t("Prove every cooked or reheated dish reached a safe core temperature.", "إثبات أن كل طبق مطبوخ أو مُعاد تسخينه وصل لحرارة داخلية آمنة."),
    when: t("Every batch, at the end of cooking / reheating — the chef.", "كل دفعة في نهاية الطبخ أو إعادة التسخين — الطاهي."),
    steps: [START, t("Probe the thickest part of the food and write the core temperature.", "ضع المجس في أسمك جزء من الطعام واكتب الحرارة الداخلية."), t("Write the thermometer ID so the reading can be traced.", "اكتب رقم الميزان لتتبع القراءة."), ACTION, END],
    limits: [
      L(t("Core temperature", "الحرارة الداخلية"), t("≥ 75 °C", "≥ 75 °م"), t("< 75 °C", "< 75 °م"), t("Keep cooking / reheating and probe again", "مواصلة الطبخ أو التسخين وإعادة القياس")),
    ],
    notes: [t("Food is reheated only once. Clean and sanitise the probe between foods.", "يُعاد تسخين الطعام مرة واحدة فقط. نظّف وعقّم المجس بين الأطعمة.")],
  },

  hot_holding: {
    purpose: t("Keep hot food above 60 °C for as long as it is on display.", "إبقاء الطعام الساخن فوق 60 °م طوال فترة عرضه."),
    when: t("Every 2 hours while the food is held — the section chef.", "كل ساعتين أثناء الحفظ — طاهي القسم."),
    steps: [START, COPY, t("Write one reading per check (1st … 4th).", "اكتب قراءة لكل فحص (الأول … الرابع)."), ACTION, END],
    limits: [
      L(t("Hot-held food", "الطعام المحفوظ ساخناً"), t("≥ 60 °C", "≥ 60 °م"), t("< 60 °C", "< 60 °م"), t("Reheat to ≥ 75 °C once, or discard if held below 60 °C for over 2 h", "إعادة التسخين لـ 75 °م مرة واحدة، أو الإتلاف إن بقي تحت 60 °م أكثر من ساعتين")),
    ],
    notes: [t("Choosing «Reheated» or «Discarded» turns the ✕ into «to review».", "اختيار «أُعيد تسخينه» أو «أُتلف» يحوّل ✕ إلى «للمراجعة».")],
  },

  cooling: {
    purpose: t("Cool cooked food fast enough that bacteria cannot grow.", "تبريد الطعام المطبوخ بسرعة كافية لمنع نمو البكتيريا."),
    when: t("Every batch cooled for later use — the chef.", "كل دفعة تُبرّد للاستخدام لاحقاً — الطاهي."),
    steps: [START, t("Write the dish and the start time (stamped when you start the row).", "اكتب الطبق ووقت البدء (يُسجَّل عند بدء السطر)."), t("At 2 h write the time and temperature (stage 1), then again at 6 h (stage 2).", "بعد ساعتين اكتب الوقت والحرارة (المرحلة 1)، ثم بعد 6 ساعات (المرحلة 2)."), ACTION, END],
    limits: [
      L(t("Stage 1", "المرحلة 1"), t("60 → 21 °C within 2 h", "من 60 إلى 21 °م خلال ساعتين"), t("> 21 °C or over 120 min", "> 21 °م أو أكثر من 120 دقيقة"), t("Reheat to 75 °C and cool again once, or discard", "إعادة التسخين لـ 75 °م والتبريد مرة واحدة، أو الإتلاف")),
      L(t("Stage 2", "المرحلة 2"), t("≤ 5 °C within 6 h in total", "≤ 5 °م خلال 6 ساعات إجمالاً"), t("> 5 °C or over 360 min", "> 5 °م أو أكثر من 360 دقيقة"), t("Discard", "الإتلاف")),
    ],
    notes: [t("Shallow trays, ice baths and blast chillers help — never cool large pots at room temperature.", "الصواني الضحلة وحمامات الثلج والمبرد السريع تساعد — لا تُبرّد القدور الكبيرة بحرارة الغرفة.")],
  },

  thawing: {
    purpose: t("Thaw frozen food safely and never refreeze it.", "إذابة الأغذية المجمدة بأمان وعدم إعادة تجميدها."),
    when: t("Every item taken out to thaw — the chef.", "كل صنف يُخرج للإذابة — الطاهي."),
    steps: [START, t("Write the item, quantity and method; start time and date are stamped.", "اكتب الصنف والكمية والطريقة؛ وقت وتاريخ البدء يُسجَّلان تلقائياً."), t("Label it with the thaw date. Update the status until Used or Discarded.", "ضع ملصق تاريخ الإذابة. حدّث الحالة حتى «استُخدم» أو «أُتلف»."), ACTION, END],
    limits: [
      L(t("Chiller thawing", "الإذابة في الثلاجة"), t("End core ≤ 5 °C", "الحرارة النهائية ≤ 5 °م"), t("> 5 °C", "> 5 °م"), t("Use at once or discard", "الاستخدام فوراً أو الإتلاف")),
      L(t("Refreezing", "إعادة التجميد"), t("Never", "ممنوعة"), t("Refrozen", "أُعيد تجميده"), t("Discard", "الإتلاف")),
      L(t("Thaw label", "ملصق الإذابة"), t("Labelled", "ملصق موجود"), t("Not labelled", "بلا ملصق"), t("Label now", "وضع الملصق فوراً")),
    ],
    notes: [t("Items still «Thawing» appear on the next days' sheets until you close them.", "الأصناف «قيد الإذابة» تظهر في أوراق الأيام التالية حتى تُغلقها.")],
  },

  frying_oil: {
    purpose: t("Change frying oil before it becomes harmful.", "تغيير زيت القلي قبل أن يصبح ضاراً."),
    when: t("Daily before service, for every fryer — the chef.", "يومياً قبل الخدمة لكل قلاية — الطاهي."),
    steps: [START, COPY, t("Measure TPM with the oil tester and judge colour and smell.", "قِس نسبة المواد القطبية بجهاز الفحص وقيّم اللون والرائحة."), ACTION, END],
    limits: [
      L(t("TPM (total polar material)", "المواد القطبية الكلية"), t("< 22 %", "< 22 %"), t("≥ 25 %", "≥ 25 %"), t("Change the oil now (22–24 %: change soon)", "تغيير الزيت فوراً (22–24 %: التغيير قريباً)")),
      L(t("Colour / smell", "اللون / الرائحة"), t("Pass", "مطابق"), t("Dark / rancid", "داكن أو متزنخ"), t("Change the oil", "تغيير الزيت")),
    ],
    notes: [t("Filter the oil daily and never top up old oil with new.", "صفِّ الزيت يومياً ولا تخلط الزيت القديم بالجديد.")],
  },

  dishwasher: {
    purpose: t("Make sure dishes are washed and rinsed hot enough to be sanitised.", "التأكد أن الأطباق تُغسل وتُشطف بحرارة كافية للتعقيم."),
    when: t("At the start of every shift — kitchen steward.", "في بداية كل وردية — مسؤول المطبخ."),
    steps: [START, COPY, t("Read the wash and final-rinse temperatures on the machine display.", "اقرأ حرارة الغسيل والشطف النهائي من شاشة الجهاز."), t("Check the detergent and rinse-aid levels.", "افحص مستوى المنظف ومساعد الشطف."), ACTION, END],
    limits: [
      L(t("Wash", "الغسيل"), t("≥ 60 °C", "≥ 60 °م"), t("< 60 °C", "< 60 °م"), t("Stop using the machine; call maintenance", "إيقاف الجهاز واستدعاء الصيانة")),
      L(t("Final rinse", "الشطف النهائي"), t("≥ 82 °C", "≥ 82 °م"), t("< 82 °C", "< 82 °م"), t("Sanitise dishes by hand until fixed", "تعقيم الأطباق يدوياً حتى الإصلاح")),
      L(t("Detergent / rinse aid", "المنظف / مساعد الشطف"), t("Filled", "ممتلئ"), t("Empty", "فارغ"), t("Refill", "إعادة التعبئة")),
    ],
    notes: [],
  },
};
