// src/industries/warehouse/guides.js
// Fill-in guides of the warehouse-only reports (see _kit/guides.js for the
// format and the shared steps). Limits mirror warehouse/reports.js.

import { t, L, START, COPY, ACTION, END } from "../_kit/guideKit";

export const WAREHOUSE_GUIDES = {
  storage_conditions: {
    purpose: t("Keep dry goods cool and dry so they do not spoil or attract pests.", "إبقاء المواد الجافة باردة وجافة كي لا تتلف أو تجذب الآفات."),
    when: t("Morning and evening, every zone — store keeper.", "صباحاً ومساءً لكل منطقة — أمين المخزن."),
    steps: [START, COPY, t("Read the thermo-hygrometer of each zone and write °C and RH %.", "اقرأ جهاز الحرارة والرطوبة لكل منطقة واكتب °م والرطوبة %."), ACTION, END],
    limits: [
      L(t("Temperature", "الحرارة"), t("≤ 25 °C", "≤ 25 °م"), t("> 25 °C", "> 25 °م"), t("Check the AC / ventilation, move sensitive stock", "فحص التكييف أو التهوية ونقل المواد الحساسة")),
      L(t("Humidity", "الرطوبة"), t("≤ 60 % RH", "≤ 60 %"), t("> 60 % RH", "> 60 %"), t("Ventilate / dehumidify, check for leaks", "التهوية أو إزالة الرطوبة وفحص التسريبات")),
      L(t("Direct sun / leaks", "الشمس المباشرة / التسريبات"), t("None", "لا يوجد"), t("Present", "موجودة"), t("Protect the stock and report for maintenance", "حماية البضاعة وإبلاغ الصيانة")),
    ],
    notes: [],
  },

  dispatch: {
    purpose: t("Load only into clean, pre-cooled vehicles and keep the cold chain.", "التحميل فقط في مركبات نظيفة ومبردة مسبقاً والحفاظ على سلسلة التبريد."),
    when: t("Every vehicle loaded — dispatch supervisor.", "كل مركبة تُحمَّل — مشرف الشحن."),
    steps: [START, t("Write the vehicle, driver and load type; check the box is clean and pre-cooled.", "اكتب المركبة والسائق ونوع الحمولة؛ تأكد أن الصندوق نظيف ومبرد مسبقاً."), t("Probe the product, then write the seal number and destination.", "قِس حرارة المنتج ثم اكتب رقم الختم والوجهة."), ACTION, END],
    limits: [
      L(t("Chilled load (box and product)", "حمولة مبردة (الصندوق والمنتج)"), t("≤ 5 °C", "≤ 5 °م"), t("> 5 °C", "> 5 °م"), t("Do not load; pre-cool the box / return product to the chiller", "عدم التحميل؛ تبريد الصندوق أو إعادة المنتج للثلاجة")),
      L(t("Frozen load (box and product)", "حمولة مجمدة (الصندوق والمنتج)"), t("≤ −18 °C", "≤ −18 °م"), t("> −18 °C", "> −18 °م"), t("Do not load", "عدم التحميل")),
      L(t("Vehicle", "المركبة"), t("Clean, sealed", "نظيفة ومختومة"), t("Not clean", "غير نظيفة"), t("Clean before loading", "التنظيف قبل التحميل")),
    ],
    notes: [],
  },

  fefo: {
    purpose: t("Ship what expires first, first — and find expired or damaged stock.", "شحن ما ينتهي أولاً أولاً — واكتشاف البضاعة المنتهية أو التالفة."),
    when: t("Weekly per aisle — inventory controller.", "أسبوعياً لكل ممر — مراقب المخزون."),
    steps: [START, t("One row per location checked: product, batch, expiry and quantity.", "سطر لكل موقع مفحوص: المنتج والتشغيلة والانتهاء والكمية."), t("Answer FEFO followed and damaged packs.", "أجب عن تطبيق FEFO والعبوات التالفة."), ACTION, END],
    limits: [
      L(t("Expiry", "الانتهاء"), t("More than 30 days left", "أكثر من 30 يوماً متبقية"), t("Expired (≤ 30 days = short-dated, to review)", "منتهٍ (≤ 30 يوماً = قريب الانتهاء، للمراجعة)"), t("Move to quarantine; short-dated goes out first", "النقل للحجر؛ القريب من الانتهاء يُشحن أولاً")),
      L(t("FEFO / damaged packs", "FEFO / العبوات التالفة"), t("Followed / none", "مطبق / لا يوجد"), t("Not followed / found", "غير مطبق / موجودة"), t("Re-arrange the location; quarantine damaged packs", "إعادة ترتيب الموقع وحجر التالف")),
    ],
    notes: [],
  },

  racking: {
    purpose: t("Prevent collapses and keep stock off the floor and away from walls.", "منع انهيار الرفوف وإبعاد البضاعة عن الأرض والجدران."),
    when: t("Weekly — warehouse supervisor.", "أسبوعياً — مشرف المستودع."),
    steps: [START, COPY, t("Walk each rack and answer every item.", "امشِ على كل رف وأجب عن كل بند."), ACTION, END],
    limits: [
      L(t("Uprights / beams", "القوائم / العوارض"), t("Undamaged", "سليمة"), t("Bent / damaged", "منحنية أو تالفة"), t("Unload the bay and tag it out of use", "تفريغ الخانة ووضع علامة عدم الاستخدام")),
      L(t("Load / pallets", "الحمولة / الطبليات"), t("Within the rated load; sound, clean pallets", "ضمن الحمولة المقررة؛ طبليات سليمة ونظيفة"), t("Overloaded / broken", "زائدة / مكسورة"), t("Reduce the load, replace pallets", "تخفيف الحمولة واستبدال الطبليات")),
      L(t("Stock position", "موضع البضاعة"), t("Off the floor, away from walls", "مرفوعة عن الأرض وبعيدة عن الجدران"), t("On the floor / against the wall", "على الأرض أو ملاصقة للجدار"), t("Move it", "نقلها")),
    ],
    notes: [],
  },

  forklift: {
    purpose: t("Use only forklifts / MHE that passed the daily safety check.", "استخدام الرافعات والمعدات التي اجتازت الفحص اليومي فقط."),
    when: t("Before first use every shift — the operator.", "قبل أول استخدام في كل وردية — المشغّل."),
    steps: [START, COPY, t("Test brakes, horn and lights, forks and chains, leaks, battery / fuel.", "افحص الفرامل والبوق والأضواء والشوكة والسلاسل والتسريبات والبطارية أو الوقود."), t("Decide «Fit for use».", "قرّر «صالحة للاستخدام»."), END],
    limits: [
      L(t("Any check item", "أي بند فحص"), t("Pass", "مطابق"), t("Fail but marked fit for use", "مخالف ومسجلة صالحة"), t("Take out of use and report", "الإيقاف عن الاستخدام والإبلاغ")),
    ],
    notes: [t("A failed item with the forklift taken out of use is «to review», not ✕.", "البند المخالف مع إيقاف الرافعة يكون «للمراجعة» وليس ✕.")],
  },

  quarantine: {
    purpose: t("Keep suspect stock apart until someone decides what happens to it.", "عزل البضاعة المشتبه بها حتى يُتخذ قرار بشأنها."),
    when: t("Whenever stock is put on hold, and when it is released or disposed of — QA.", "عند حجز البضاعة وعند الإفراج عنها أو إتلافها — الجودة."),
    steps: [START, t("Write the product, batch, quantity, source and the quarantine location.", "اكتب المنتج والتشغيلة والكمية والمصدر وموقع الحجر."), t("Tag it HOLD. When decided, set the status and sign «Decision By».", "ضع ملصق «محجوز». عند القرار حدّد الحالة ووقّع «صاحب القرار»."), END],
    limits: [
      L(t("HOLD tag", "ملصق الحجز"), t("Tagged", "موجود"), t("Not tagged", "غير موجود"), t("Tag now", "وضع الملصق فوراً")),
      L(t("Decision", "القرار"), t("Released / returned / destroyed and signed", "مُفرج / مُرجع / مُتلف وموقّع"), t("On hold with no decision", "محجوز بلا قرار"), t("Decide within the agreed days", "اتخاذ القرار ضمن المدة المتفق عليها")),
    ],
    notes: [t("Stock still on hold appears on the next 14 days' sheets.", "البضاعة المحجوزة تظهر في أوراق الـ14 يوماً التالية.")],
  },

  cold_room: {
    purpose: t("Keep cold rooms able to hold temperature: doors, curtains, ice, airflow, alarm.", "إبقاء غرف التبريد قادرة على حفظ الحرارة: الأبواب، الستائر، الثلج، التهوية، الإنذار."),
    when: t("Daily — cold-store supervisor.", "يومياً — مشرف التبريد."),
    steps: [START, COPY, t("Inspect each room and answer every item.", "افحص كل غرفة وأجب عن كل بند."), ACTION, END],
    limits: [
      L(t("Doors, ice, airflow", "الأبواب، الثلج، التهوية"), t("Doors seal, no ice build-up, airflow clear", "الأبواب محكمة، بلا تراكم ثلج، التهوية غير معاقة"), t("Any «No»", "أي «لا»"), t("Report for maintenance; re-arrange stock away from the coils", "إبلاغ الصيانة وإبعاد البضاعة عن المبخّر")),
      L(t("Strip curtain / alarm", "الستارة / الإنذار"), t("OK / tested", "سليمة / مُختبر"), t("Damaged / not tested (to review)", "تالفة / غير مُختبر (للمراجعة)"), t("Repair / test the alarm", "الإصلاح أو اختبار الإنذار")),
    ],
    notes: [t("Temperatures of the rooms are recorded on the Chiller & Freezer Temperatures sheet.", "حرارة الغرف تُسجَّل في ورقة حرارة الثلاجات والفريزرات.")],
  },
};
