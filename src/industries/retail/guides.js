// src/industries/retail/guides.js
// Fill-in guides of the supermarket-only reports (see _kit/guides.js for the
// format and the shared steps). Limits mirror retail/reports.js.

import { t, L, START, COPY, ACTION, END } from "../_kit/guideKit";

export const RETAIL_GUIDES = {
  date_check: {
    purpose: t("Make sure nothing expired is on sale and short-dated stock is handled.", "التأكد أن لا شيء منتهي الصلاحية معروض للبيع ومعالجة القريب من الانتهاء."),
    when: t("Daily shelf walk before opening — section supervisor.", "جولة يومية على الرفوف قبل الافتتاح — مشرف القسم."),
    steps: [START, t("Write only the products you FOUND expired or near expiry — one row each.", "اكتب فقط المنتجات التي وجدتها منتهية أو قريبة الانتهاء — سطر لكل منتج."), t("Choose the action you took.", "اختر الإجراء الذي اتخذته."), END],
    limits: [
      L(t("Expired", "منتهي الصلاحية"), t("None on the shelf", "لا يوجد على الرف"), t("Expired and still on shelf", "منتهٍ وما زال على الرف"), t("Remove at once and record as waste / return", "الإزالة فوراً والتسجيل كإتلاف أو إرجاع")),
      L(t("Near expiry", "قريب الانتهاء"), t("More than 3 days left", "أكثر من 3 أيام متبقية"), t("3 days or less", "3 أيام أو أقل"), t("Mark down, move to front (FEFO) or return", "تخفيض السعر، التقديم للأمام أو الإرجاع")),
    ],
    notes: [t("The days left are counted from the sheet date — date the sheet the day of the walk.", "الأيام المتبقية تُحسب من تاريخ الورقة — أرّخ الورقة بيوم الجولة.")],
  },

  label_check: {
    purpose: t("Check that products on sale carry a complete, legal label.", "التحقق أن المنتجات المعروضة تحمل ملصقاً كاملاً ونظامياً."),
    when: t("Weekly per section, and for every new product — QA.", "أسبوعياً لكل قسم ولكل منتج جديد — الجودة."),
    steps: [START, t("One row per product checked; answer each label item.", "سطر لكل منتج مفحوص؛ أجب عن كل بند في الملصق."), ACTION, END],
    limits: [
      L(t("Arabic label, dates, origin", "ملصق عربي، التواريخ، المنشأ"), t("Present and readable", "موجودة ومقروءة"), t("Missing", "ناقصة"), t("Remove from sale until relabelled by the supplier", "السحب من البيع حتى يعيد المورد وضع الملصق")),
      L(t("Allergens / storage instructions", "مسببات الحساسية / طريقة الحفظ"), t("Declared", "مذكورة"), t("Not declared", "غير مذكورة"), t("Remove from sale", "السحب من البيع")),
      L(t("Shelf price", "سعر الرف"), t("Matches the product", "مطابق للمنتج"), t("Mismatch", "غير مطابق"), t("Correct the shelf label", "تصحيح ملصق الرف")),
    ],
    notes: [],
  },

  fresh_produce: {
    purpose: t("Keep fruit and vegetables on display fresh and sound.", "إبقاء الخضار والفواكه المعروضة طازجة وسليمة."),
    when: t("Every morning and after each delivery — produce supervisor.", "كل صباح وبعد كل توريد — مشرف الخضار."),
    steps: [START, COPY, t("Estimate the rotten / damaged share and judge the condition.", "قدّر نسبة التالف وقيّم الحالة."), ACTION, END],
    limits: [
      L(t("Rotten / damaged", "التالف"), t("≤ 5 %", "≤ 5 %"), t("> 5 %", "> 5 %"), t("Sort, remove the damaged part, record as waste", "الفرز وإزالة التالف وتسجيله إتلافاً")),
      L(t("Condition", "الحالة"), t("Good", "جيدة"), t("Poor (Fair = to review)", "سيئة («مقبولة» = للمراجعة)"), t("Remove from display", "الإزالة من العرض")),
    ],
    notes: [],
  },

  deli_counter: {
    purpose: t("Keep ready-to-eat food on the counter out of the danger zone.", "إبقاء الأطعمة الجاهزة على الكاونتر خارج منطقة الخطر."),
    when: t("Three times a day — counter supervisor.", "ثلاث مرات يومياً — مشرف الكاونتر."),
    steps: [START, COPY, t("Probe each item and write the reading for the time of day.", "قِس كل صنف واكتب القراءة حسب وقتها."), ACTION, END],
    limits: [
      L(t("Hot counter", "الكاونتر الساخن"), t("≥ 60 °C", "≥ 60 °م"), t("< 60 °C", "< 60 °م"), t("Reheat to 75 °C once or discard", "إعادة التسخين لـ 75 °م مرة واحدة أو الإتلاف")),
      L(t("Cold counter", "الكاونتر البارد"), t("≤ 5 °C", "≤ 5 °م"), t("> 5 °C", "> 5 °م"), t("Move to a working chiller; discard if over 2 h", "النقل لثلاجة سليمة؛ الإتلاف إن زاد عن ساعتين")),
      L(t("Covered / sneeze guard", "مغطى / واقي العطس"), t("Yes", "نعم"), t("No", "لا"), t("Cover the food", "تغطية الطعام")),
    ],
    notes: [],
  },

  recall: {
    purpose: t("Pull unsafe products off sale fast and keep the evidence.", "سحب المنتجات غير الآمنة من البيع بسرعة والاحتفاظ بالدليل."),
    when: t("The moment a recall or a serious defect is known — store manager / QA.", "فور العلم بالاستدعاء أو بعيب خطير — مدير الفرع أو الجودة."),
    steps: [START, t("Write the product, batch, reason and the quantity removed.", "اكتب المنتج والتشغيلة والسبب والكمية المسحوبة."), t("Inform the supplier (and the authority when required); follow the status to Closed.", "أبلغ المورد (والجهة الرقابية عند اللزوم)؛ تابع الحالة حتى «مغلقة»."), END],
    limits: [
      L(t("Supplier informed", "إبلاغ المورد"), t("Yes", "نعم"), t("No", "لا"), t("Inform today", "الإبلاغ اليوم")),
      L(t("Authority notified", "إبلاغ الجهة الرقابية"), t("Yes for authority recalls, allergens, foreign bodies", "نعم لاستدعاء الجهة، الحساسية، الأجسام الغريبة"), t("No in those cases", "لا في هذه الحالات"), t("Notify the municipality", "إبلاغ البلدية")),
    ],
    notes: [t("Open withdrawals appear on the next 14 days' sheets until closed.", "السحوبات المفتوحة تظهر في أوراق الـ14 يوماً التالية حتى تُغلق.")],
  },

  customer_complaints: {
    purpose: t("Answer every complaint and catch food-safety problems early.", "الرد على كل شكوى واكتشاف مشاكل سلامة الغذاء مبكراً."),
    when: t("When the complaint is received — customer service / QA.", "عند استلام الشكوى — خدمة العملاء أو الجودة."),
    steps: [START, t("Write the customer, the product and batch, and the type of complaint.", "اكتب العميل والمنتج والتشغيلة ونوع الشكوى."), t("Record the investigation / response and follow the status to Closed.", "سجّل التحقيق أو الرد وتابع الحالة حتى «مغلقة»."), END],
    limits: [
      L(t("Foreign body / illness", "جسم غريب / مرض"), t("Closed after investigation", "مغلقة بعد التحقيق"), t("Still open", "ما زالت مفتوحة"), t("Keep the sample, check the batch on the shelf, inform QA", "الاحتفاظ بالعينة وفحص التشغيلة على الرف وإبلاغ الجودة")),
      L(t("Response", "الرد"), t("Recorded", "مسجل"), t("None", "لا يوجد"), t("Contact the customer", "التواصل مع العميل")),
    ],
    notes: [],
  },
};
