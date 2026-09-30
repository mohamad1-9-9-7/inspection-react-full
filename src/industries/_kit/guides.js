// src/industries/_kit/guides.js
// "How to fill this report" guides of the kit reports — purpose, when / who,
// steps, allowed vs critical limits with the action to take, and notes.
// Rendered by pages/generic/ReportGuide.jsx above the input page (full) and
// above the view page (limits + notes only), EN + AR line by line — the same
// deliberate exception to "one language per screen" the sweets guides have.
//
// Keyed by the schema KEY (not the type), so the ten shared reports carry one
// guide for all four industries. The limits written here mirror the check()
// of each schema (commonReports.js, <industry>/reports.js) — change them
// together.

import { RESTAURANT_GUIDES } from "../restaurant/guides";
import { RETAIL_GUIDES } from "../retail/guides";
import { WAREHOUSE_GUIDES } from "../warehouse/guides";
import { FACTORY_GUIDES } from "../factory/guides";

import { t, L, START, COPY, ACTION, END } from "./guideKit";

const COMMON_GUIDES = {
  personal_hygiene: {
    purpose: t("Confirm every food handler is fit and correctly dressed before touching food.", "التأكد أن كل عامل لائق صحياً وملتزم باللباس قبل ملامسة الغذاء."),
    when: t("Daily, at the start of every shift — shift supervisor / QA.", "يومياً في بداية كل وردية — مشرف الوردية أو الجودة."),
    steps: [START, COPY, t("Check each person and answer every column.", "افحص كل عامل وأجب عن كل عمود."), ACTION, END],
    limits: [
      L(t("Uniform, hair, nails, jewellery", "الزي، الشعر، الأظافر، المجوهرات"), t("Clean uniform, hair covered, short clean nails, no jewellery", "زي نظيف، شعر مغطى، أظافر قصيرة ونظيفة، بلا مجوهرات"), t("Any answer «No»", "أي إجابة «لا»"), t("Correct before starting work", "التصحيح قبل بدء العمل")),
      L(t("Wounds", "الجروح"), t("None, or covered with a blue waterproof plaster", "لا يوجد أو مغطى بلاصق أزرق مقاوم للماء"), t("Open / uncovered wound", "جرح مكشوف"), t("Cover it, or keep away from open food", "تغطيته أو الإبعاد عن الغذاء المكشوف")),
      L(t("Illness symptoms", "أعراض مرضية"), t("None", "لا توجد"), t("Reported (diarrhoea, vomiting, fever, jaundice…)", "مُبلَّغ عنها (إسهال، تقيؤ، حرارة، يرقان…)"), t("Exclude from food handling + record in Staff Sickness", "الإبعاد عن الغذاء + التسجيل في سجل المرض")),
    ],
    notes: [t("A row with a written corrective action turns from ✕ to «to review».", "السطر الذي كُتب له إجراء تصحيحي يتحول من ✕ إلى «للمراجعة».")],
  },

  cleaning: {
    purpose: t("Prove every area and piece of equipment was cleaned and sanitised as planned.", "إثبات أن كل منطقة ومعدة نُظّفت وعُقّمت حسب الخطة."),
    when: t("After each cleaning task — by the cleaner, checked by the supervisor.", "بعد كل عملية تنظيف — عامل النظافة، ويفحصها المشرف."),
    steps: [START, COPY, t("Write the area, the chemical and its dilution, then do the visual check.", "اكتب المنطقة والمادة الكيميائية وتخفيفها، ثم افحص بالنظر."), ACTION, END],
    limits: [
      L(t("Visual check", "الفحص البصري"), t("Pass — no visible dirt, residue or odour", "مطابق — بلا أوساخ أو بقايا أو روائح"), t("Fail", "غير مطابق"), t("Clean again and re-check", "إعادة التنظيف والفحص")),
      L(t("Chemical", "المادة الكيميائية"), t("Approved food-safe chemical recorded", "مادة معتمدة وآمنة للغذاء ومسجلة"), t("Not recorded", "غير مسجلة"), t("Record it before signing", "تسجيلها قبل التوقيع")),
    ],
    notes: [t("Follow the dilution on the chemical label — stronger is not safer.", "اتبع التخفيف المكتوب على الملصق — التركيز الأعلى ليس أكثر أماناً.")],
  },

  temperature: {
    purpose: t("Keep chilled and frozen food out of the danger zone.", "إبقاء الأغذية المبردة والمجمدة خارج منطقة الخطر."),
    when: t("Three times a day (morning, noon, evening) — shift supervisor.", "ثلاث مرات يومياً (صباحاً، ظهراً، مساءً) — مشرف الوردية."),
    steps: [START, COPY, t("Read each unit's display and write the temperature for the time of day.", "اقرأ شاشة كل وحدة واكتب الحرارة حسب وقت القراءة."), ACTION, END],
    limits: [
      L(t("Chiller / display chiller", "ثلاجة / ثلاجة عرض"), t("≤ 5 °C", "≤ 5 °م"), t("> 5 °C", "> 5 °م"), t("Check the door and setting, move food to another unit, re-check in 30 min", "فحص الباب والضبط، نقل الغذاء لوحدة أخرى، إعادة القياس بعد 30 دقيقة")),
      L(t("Freezer / display freezer", "فريزر / فريزر عرض"), t("≤ −18 °C", "≤ −18 °م"), t("> −18 °C", "> −18 °م"), t("Same as above; thawed food is not refrozen", "كما سبق؛ الغذاء الذائب لا يُعاد تجميده")),
      L(t("Door seal / defrost", "إحكام الباب / إذابة الثلج"), t("OK", "سليم"), t("No", "لا"), t("Report for maintenance", "إبلاغ الصيانة")),
    ],
    notes: [t("Pick the right Unit Type — the limit (5 or −18) follows it.", "اختر نوع الوحدة الصحيح — الحد (5 أو −18) يتبعه.")],
  },

  receiving: {
    purpose: t("Accept only safe, in-date deliveries at the right temperature.", "قبول التوريدات السليمة والصالحة وبالحرارة الصحيحة فقط."),
    when: t("At every delivery, before the goods are stored — receiving staff / QA.", "عند كل توريد وقبل التخزين — موظف الاستلام أو الجودة."),
    steps: [START, t("One row per product: supplier, batch, expiry, storage and the probe temperature.", "سطر لكل منتج: المورد، التشغيلة، الانتهاء، التخزين وحرارة المجس."), t("Choose the decision: Accepted, Rejected or On Hold.", "اختر القرار: مقبول، مرفوض أو معلّق."), ACTION, END],
    limits: [
      L(t("Chilled goods", "المبردات"), t("≤ 5 °C", "≤ 5 °م"), t("> 5 °C", "> 5 °م"), t("Reject", "الرفض")),
      L(t("Frozen goods", "المجمدات"), t("≤ −18 °C, no signs of thawing", "≤ −18 °م بلا علامات ذوبان"), t("> −18 °C", "> −18 °م"), t("Reject", "الرفض")),
      L(t("Expiry date", "تاريخ الانتهاء"), t("Not expired", "غير منتهٍ"), t("Expired on arrival", "منتهٍ عند الوصول"), t("Reject and inform the supplier", "الرفض وإبلاغ المورد")),
    ],
    notes: [t("A failed row marked «Accepted» stays ✕ — accepting a failed delivery must be justified.", "السطر المخالف المُسجّل «مقبول» يبقى ✕ — قبول توريد مخالف يحتاج تبريراً.")],
  },

  pest_control: {
    purpose: t("Catch pest activity early and keep every station working.", "اكتشاف نشاط الآفات مبكراً والتأكد من عمل كل محطة."),
    when: t("Daily walk-round — supervisor; plus every visit of the pest-control contractor.", "جولة يومية — المشرف؛ وعند كل زيارة لشركة المكافحة."),
    steps: [START, COPY, t("Check each station: intact? any activity? what pest?", "افحص كل محطة: سليمة؟ هل يوجد نشاط؟ ما نوع الآفة؟"), ACTION, END],
    limits: [
      L(t("Pest activity", "نشاط الآفات"), t("None", "لا يوجد"), t("Found (droppings, insects, gnawing…)", "موجود (فضلات، حشرات، قرض…)"), t("Protect / discard exposed food, call the contractor, deep clean", "حماية أو إتلاف الغذاء المكشوف، استدعاء الشركة، تنظيف عميق")),
      L(t("Station", "المحطة"), t("Intact and in place", "سليمة وفي مكانها"), t("Damaged / missing", "تالفة أو مفقودة"), t("Replace", "الاستبدال")),
    ],
    notes: [t("Never move bait stations inside food areas yourself — the contractor places them.", "لا تنقل محطات الطُعم داخل مناطق الغذاء بنفسك — الشركة هي من يضعها.")],
  },

  visitors: {
    purpose: t("Keep visitors and contractors from bringing illness or hazards into food areas.", "منع الزوار والمقاولين من إدخال الأمراض أو المخاطر لمناطق الغذاء."),
    when: t("Every entry — reception / supervisor.", "عند كل دخول — الاستقبال أو المشرف."),
    steps: [START, t("Record the visitor on arrival; the time in is stamped automatically.", "سجّل الزائر عند وصوله؛ وقت الدخول يُسجَّل تلقائياً."), t("Health declaration and PPE before entering; write the time out when they leave.", "إقرار صحي ووسائل وقاية قبل الدخول؛ اكتب وقت الخروج عند المغادرة."), END],
    limits: [
      L(t("Health declaration", "الإقرار الصحي"), t("Signed", "موقّع"), t("Not signed", "غير موقّع"), t("No entry to food areas", "منع الدخول لمناطق الغذاء")),
      L(t("PPE", "وسائل الوقاية"), t("Coat, hair net, shoe covers provided", "معطف، غطاء شعر، أغطية أحذية"), t("Not provided", "غير مقدّمة"), t("Provide before entry", "تقديمها قبل الدخول")),
    ],
    notes: [t("A row without time out stays «to review» until the visitor has left.", "السطر بلا وقت خروج يبقى «للمراجعة» حتى يغادر الزائر.")],
  },

  staff_health: {
    purpose: t("Record every sick employee and make sure no one unfit handles food.", "تسجيل كل موظف مريض والتأكد أن لا أحد غير لائق يتعامل مع الغذاء."),
    when: t("Whenever an employee reports symptoms, and when they return — supervisor / HR.", "عند إبلاغ الموظف بأعراض وعند عودته — المشرف أو الموارد البشرية."),
    steps: [START, t("Write the employee, the symptoms and whether the OHC is valid.", "اكتب الموظف والأعراض وصلاحية البطاقة الصحية."), t("Choose the decision; on return, write the date and the medical clearance.", "اختر القرار؛ وعند العودة اكتب التاريخ والتصريح الطبي."), END],
    limits: [
      L(t("Symptoms", "الأعراض"), t("None → fit to work", "لا توجد ← لائق للعمل"), t("Any symptom but «Fit to work»", "أي عرض مع قرار «لائق»"), t("Exclude from food handling", "الإبعاد عن التعامل مع الغذاء")),
      L(t("OHC", "البطاقة الصحية"), t("Valid", "سارية"), t("Not valid", "غير سارية"), t("No food handling until renewed", "منع التعامل مع الغذاء حتى التجديد")),
      L(t("Return to work", "العودة للعمل"), t("With medical clearance", "بتصريح طبي"), t("Without clearance", "بلا تصريح"), t("Ask for clearance", "طلب التصريح")),
    ],
    notes: [t("Diarrhoea / vomiting: back to food only 48 hours after the last symptom.", "الإسهال أو التقيؤ: العودة للغذاء بعد 48 ساعة من آخر عرض.")],
  },

  non_conformance: {
    purpose: t("Track every problem to a corrective action and close it on time.", "متابعة كل مخالفة حتى إجراء تصحيحي وإغلاقها في الوقت."),
    when: t("As soon as a problem is found — anyone; QA follows up to closure.", "فور اكتشاف المخالفة — أي شخص؛ والجودة تتابع حتى الإغلاق."),
    steps: [START, t("Describe the problem, its severity, the owner and the target date.", "صف المخالفة وخطورتها والمسؤول والتاريخ المستهدف."), t("Write the corrective action and update the status until Closed.", "اكتب الإجراء التصحيحي وحدّث الحالة حتى «مغلقة»."), END],
    limits: [
      L(t("Critical severity", "خطورة حرجة"), t("Closed", "مغلقة"), t("Still open", "ما زالت مفتوحة"), t("Escalate to the manager today", "التصعيد للمدير اليوم")),
      L(t("Target date", "التاريخ المستهدف"), t("Closed before it", "أُغلقت قبله"), t("Passed and not closed", "تجاوزته ولم تُغلق"), t("Re-plan and escalate", "إعادة التخطيط والتصعيد")),
    ],
    notes: [t("Open items are closed on the sheet of the day they were opened.", "البنود المفتوحة تُغلق في ورقة اليوم الذي فُتحت فيه.")],
  },

  waste: {
    purpose: t("Record what was disposed of, why, and how — for cost and traceability.", "تسجيل ما أُتلف ولماذا وكيف — للتكلفة والتتبع."),
    when: t("Every disposal — supervisor with a witness.", "عند كل إتلاف — المشرف بحضور شاهد."),
    steps: [START, t("One row per item: quantity, reason and disposal method.", "سطر لكل صنف: الكمية والسبب وطريقة الإتلاف."), t("The witness writes their name.", "يكتب الشاهد اسمه."), END],
    limits: [
      L(t("Disposal method", "طريقة الإتلاف"), t("Approved contractor / denatured / returned", "شركة معتمدة / إفساد / إرجاع"), t("Not recorded", "غير مسجلة"), t("Record before signing", "تسجيلها قبل التوقيع")),
      L(t("Witness", "الشاهد"), t("Named", "مذكور"), t("None", "لا يوجد"), t("Dispose again only with a witness", "الإتلاف بحضور شاهد فقط")),
    ],
    notes: [t("Recalled products are kept apart and disposed of only on the supplier's / authority's instruction.", "المنتجات المسحوبة تُعزل ولا تُتلف إلا بتعليمات المورد أو الجهة الرقابية.")],
  },

  thermometer_check: {
    purpose: t("Make sure every thermometer reads right — every other record depends on it.", "التأكد أن كل ميزان حرارة دقيق — فكل السجلات الأخرى تعتمد عليه."),
    when: t("Weekly for each probe, and after a probe is dropped — QA.", "أسبوعياً لكل مجس وبعد سقوطه — الجودة."),
    steps: [START, COPY, t("Ice point: probe in crushed ice + water for 1 min. Boiling point: in boiling water.", "نقطة الجليد: المجس في ثلج مجروش وماء دقيقة. نقطة الغليان: في ماء يغلي."), ACTION, END],
    limits: [
      L(t("Ice point", "نقطة الجليد"), t("−1 … +1 °C", "−1 … +1 °م"), t("Outside ±1 °C", "خارج ±1 °م"), t("Recalibrate or withdraw the probe", "إعادة المعايرة أو سحب المجس")),
      L(t("Boiling point", "نقطة الغليان"), t("99 … 101 °C", "99 … 101 °م"), t("Outside 100 ± 1 °C", "خارج 100 ± 1 °م"), t("Recalibrate or withdraw the probe", "إعادة المعايرة أو سحب المجس")),
    ],
    notes: [t("Readings taken with a failed probe since its last good check must be reviewed.", "القراءات المأخوذة بمجس مخالف منذ آخر فحص سليم يجب مراجعتها.")],
  },
};

const SPECIFIC_GUIDES = {
  restaurant: RESTAURANT_GUIDES,
  retail: RETAIL_GUIDES,
  warehouse: WAREHOUSE_GUIDES,
  factory: FACTORY_GUIDES,
};

/** The guide of one report of one kit industry, or null. */
export function guideFor(industry, key) {
  return SPECIFIC_GUIDES[industry]?.[key] || COMMON_GUIDES[key] || null;
}
