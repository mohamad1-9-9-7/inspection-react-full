/* /demo "What's your business?" picker.
   Picking a sector swaps the hero, the dashboard mock-up and the "what we solve"
   cards for that sector — one page, no extra links. `?sector=<v>` opens a sector
   directly (for ads / Facebook posts). Keys match DEMO_ACTIVITIES in DemoRequest.jsx,
   so the form's business type is pre-filled from the same pick.
   Only claim what the platform really does. */

export const SECTOR_ORDER = ["meat", "restaurant", "kitchen", "sweets", "factory", "retail", "distribution"];

export const SECTOR_UI = {
  en: { ask: "What's your business?", all: "Show all", painEyebrow: "Made for your business", painTitle: (s) => `What InspectPro solves for ${s}` },
  ar: { ask: "ما نشاطك؟", all: "عرض الكل", painEyebrow: "مصمَّم لنشاطك", painTitle: (s) => `كيف يخدم InspectPro ${s}` },
};

export const SECTORS = {
  meat: {
    en: {
      chip: "Meat & butchery", who: "meat shops & butcheries",
      h1a: "Every carcass. Every cut.", h1b: "Traced and inspection‑ready.",
      lead: "Receiving with slaughter and expiry dates, chiller temperatures, cutting yields and returns — every branch on one live screen, ready for the municipality inspector.",
      mock: { chart: "Meat chiller temperatures", range: "Limit 0–4 °C", r1: "Carcass receiving — Branch 01", r2: "Chiller check — Branch 02", r3: "Returns & condemnation — Branch 03", f1: "Chiller 02 · 1.8 °C" },
      pains: [
        ["🥩", "Receiving with full origin", "Supplier, origin, slaughter and expiry dates recorded per delivery — expiry worked out from the shelf life."],
        ["🔪", "Cutting yields you can see", "Every cutting operation numbered, with weights in and out, so loss and waste show per butcher and branch."],
        ["↩️", "Returns and condemnations", "Branch returns and condemned stock logged with the reason, ready to reconcile against your disposal records."],
      ],
    },
    ar: {
      chip: "اللحوم والملاحم", who: "الملاحم ومحلات اللحوم",
      h1a: "كل ذبيحة، وكل قطعية،", h1b: "متتبَّعة وجاهزة للتفتيش.",
      lead: "استلام بتاريخ الذبح والانتهاء، وحرارة البرادات، ونِسب التقطيع والمرتجعات — كل الفروع على شاشة واحدة مباشرة، جاهزة لمفتش البلدية.",
      mock: { chart: "حرارة برادات اللحوم", range: "الحد 0–4 °م", r1: "استلام الذبائح — فرع 01", r2: "فحص البراد — فرع 02", r3: "المرتجعات والإتلاف — فرع 03", f1: "براد 02 · 1.8 °م" },
      pains: [
        ["🥩", "استلام بمنشأ كامل", "المورّد والمنشأ وتاريخ الذبح والانتهاء لكل شحنة — ويُحسب تاريخ الانتهاء من مدة الصلاحية تلقائيًا."],
        ["🔪", "نِسب تقطيع واضحة", "لكل عملية تقطيع رقم، مع الوزن الداخل والخارج، فيظهر الهدر لكل قصّاب وفرع."],
        ["↩️", "المرتجعات والإتلاف", "مرتجعات الفروع والكميات المُتلفة مسجّلة مع السبب، جاهزة للمطابقة مع سجلات الإتلاف."],
      ],
    },
  },
  restaurant: {
    en: {
      chip: "Restaurants & cafés", who: "restaurants & cafés",
      h1a: "Every kitchen. Every shift.", h1b: "Ready for the inspector.",
      lead: "Cooking and cooling temperatures, cleaning, staff health and receiving — filled on the phone during the shift, so you walk into any inspection with complete records.",
      mock: { chart: "Fridge temperatures", range: "Limit 0–5 °C", r1: "Opening checklist — Branch 01", r2: "Cooking temperatures — Branch 02", r3: "Deep cleaning — Branch 03", f1: "Fridge 01 · 3.1 °C" },
      pains: [
        ["🌡️", "Temperatures without the clipboard", "Fridges, freezers, cooking and cooling checks on the phone — each unit with its own limits, readings outside them stand out."],
        ["🧽", "Cleaning and hygiene, signed off", "Daily and deep-cleaning checklists with who did it and when, for every branch."],
        ["📋", "Inspection day without panic", "Any record for any date, branch or shift found in seconds and printed in your own form layout."],
      ],
    },
    ar: {
      chip: "المطاعم والمقاهي", who: "المطاعم والمقاهي",
      h1a: "كل مطبخ، وكل وردية،", h1b: "جاهزٌ للمفتش.",
      lead: "حرارة الطهي والتبريد، والنظافة، وصحة الموظفين، والاستلام — تُعبّأ من الجوال خلال الوردية، فتدخل أي تفتيش بسجلات كاملة.",
      mock: { chart: "حرارة الثلاجات", range: "الحد 0–5 °م", r1: "قائمة الافتتاح — فرع 01", r2: "حرارة الطهي — فرع 02", r3: "التنظيف العميق — فرع 03", f1: "ثلاجة 01 · 3.1 °م" },
      pains: [
        ["🌡️", "الحرارة بدون دفاتر", "فحوصات الثلاجات والمجمِّدات والطهي والتبريد من الجوال — ولكل وحدة حدودها، وتبرز القراءات الخارجة عنها."],
        ["🧽", "نظافة موقَّعة وموثّقة", "قوائم التنظيف اليومي والعميق مع من نفّذها ومتى، لكل فرع."],
        ["📋", "يوم التفتيش بدون توتر", "أي سجل لأي تاريخ أو فرع أو وردية خلال ثوانٍ، ويُطبع بتصميم نماذجكم نفسه."],
      ],
    },
  },
  kitchen: {
    en: {
      chip: "Central kitchens & catering", who: "central kitchens & caterers",
      h1a: "One kitchen. Many sites.", h1b: "Every batch on record.",
      lead: "Critical control points, cooking and dispatch temperatures, menu labelling and branch deliveries — one live record from your kitchen to every site you serve.",
      mock: { chart: "Blast chiller temperatures", range: "Limit 0–5 °C", r1: "CCP — cooking core temperature", r2: "Dispatch to Branch 04", r3: "Menu calorie labels — update", f1: "Blast chiller · 2.9 °C" },
      pains: [
        ["🎯", "Critical control points monitored", "Each CCP checked against its limit, with a separate verifier — as HACCP asks."],
        ["🚚", "Dispatch you can prove", "Temperatures and quantities recorded when food leaves the kitchen and when each site receives it."],
        ["🍽️", "Menus with calorie labels", "Recipes and calorie labelling kept in one place for every menu you serve."],
      ],
    },
    ar: {
      chip: "المطابخ المركزية والتموين", who: "المطابخ المركزية وشركات التموين",
      h1a: "مطبخ واحد، ومواقع كثيرة،", h1b: "وكل دفعة موثّقة.",
      lead: "نقاط التحكم الحرجة، وحرارة الطهي والإرسال، وملصقات القوائم، وتوريد الفروع — سجل واحد مباشر من مطبخكم إلى كل موقع تخدمونه.",
      mock: { chart: "حرارة المبرّد السريع", range: "الحد 0–5 °م", r1: "CCP — حرارة مركز الطهي", r2: "إرسال إلى فرع 04", r3: "ملصقات السعرات — تحديث", f1: "المبرّد السريع · 2.9 °م" },
      pains: [
        ["🎯", "مراقبة نقاط التحكم الحرجة", "كل CCP يُفحص مقابل حدّه، مع متحقق مستقل عن المراقب — كما يطلب HACCP."],
        ["🚚", "إرسال موثّق", "الحرارة والكميات تُسجّل عند خروج الطعام من المطبخ وعند استلام كل موقع."],
        ["🍽️", "قوائم بملصقات السعرات", "الوصفات وملصقات السعرات الحرارية في مكان واحد لكل قائمة تقدّمونها."],
      ],
    },
  },
  sweets: {
    en: {
      chip: "Sweets & bakery", who: "sweets shops & bakeries",
      h1a: "Every batch. Every branch.", h1b: "Fresh, safe and on record.",
      lead: "Production, shelf life, display and storage temperatures and cleaning — recorded on the phone in every branch and visible to head office the same day.",
      mock: { chart: "Display chiller temperatures", range: "Limit 0–5 °C", r1: "Production batch — Kitchen", r2: "Display chiller — Branch 02", r3: "Cleaning checklist — Branch 03", f1: "Display 02 · 3.4 °C" },
      pains: [
        ["🧁", "Shelf life worked out for you", "Set the shelf life once per product; expiry dates follow from the production date."],
        ["❄️", "Display and storage temperatures", "Display chillers, cold rooms and freezers checked on the phone, each with its own limits."],
        ["🏪", "Every branch, same standard", "The same checklists in every shop, and head office sees which branch is behind."],
      ],
    },
    ar: {
      chip: "الحلويات والمخابز", who: "محلات الحلويات والمخابز",
      h1a: "كل دفعة، وكل فرع،", h1b: "طازج وآمن وموثّق.",
      lead: "الإنتاج، ومدة الصلاحية، وحرارة العرض والتخزين، والنظافة — تُسجّل من الجوال في كل فرع، وتراها الإدارة في اليوم نفسه.",
      mock: { chart: "حرارة ثلاجات العرض", range: "الحد 0–5 °م", r1: "دفعة إنتاج — المطبخ", r2: "ثلاجة العرض — فرع 02", r3: "قائمة النظافة — فرع 03", f1: "عرض 02 · 3.4 °م" },
      pains: [
        ["🧁", "الصلاحية محسوبة تلقائيًا", "حدّد مدة الصلاحية مرة لكل منتج، ويُحسب تاريخ الانتهاء من تاريخ الإنتاج."],
        ["❄️", "حرارة العرض والتخزين", "ثلاجات العرض وغرف التبريد والمجمِّدات تُفحص من الجوال، ولكل منها حدودها."],
        ["🏪", "كل الفروع بالمعيار نفسه", "القوائم نفسها في كل محل، وترى الإدارة أي فرع متأخر."],
      ],
    },
  },
  factory: {
    en: {
      chip: "Food factories", who: "food factories",
      h1a: "HACCP and ISO 22000.", h1b: "Live, not in a binder.",
      lead: "CCP monitoring, non-conformances and corrective actions, supplier approval and traceability — your food safety system working every day, ready for any audit.",
      mock: { chart: "Cold room temperatures", range: "Limit 0–4 °C", r1: "CCP — metal detector check", r2: "NCR-0031 — corrective action", r3: "Supplier audit — due", f1: "Cold room 1 · 2.2 °C" },
      pains: [
        ["🎯", "CCPs monitored and verified", "Every critical control point checked against its limit, with independent verification."],
        ["⚠️", "NCR & CAPA that close", "Each non-conformance gets a reference and stays open until closed with evidence."],
        ["🔗", "Traceability in one search", "Item codes link supplier, receiving and production records for a fast recall."],
      ],
    },
    ar: {
      chip: "مصانع الأغذية", who: "مصانع الأغذية",
      h1a: "HACCP و ISO 22000،", h1b: "نظام حيّ، لا ملفات على الرف.",
      lead: "مراقبة نقاط التحكم الحرجة، وعدم المطابقة والإجراءات التصحيحية، واعتماد الموردين والتتبّع — نظام سلامة غذاء يعمل كل يوم، وجاهز لأي تدقيق.",
      mock: { chart: "حرارة غرف التبريد", range: "الحد 0–4 °م", r1: "CCP — فحص كاشف المعادن", r2: "NCR-0031 — إجراء تصحيحي", r3: "تدقيق مورّد — مستحق", f1: "غرفة تبريد 1 · 2.2 °م" },
      pains: [
        ["🎯", "نقاط تحكم مراقَبة ومتحقَّق منها", "كل نقطة تحكم حرجة تُفحص مقابل حدّها، مع تحقق مستقل."],
        ["⚠️", "عدم مطابقة تُغلق فعلًا", "لكل حالة رقم مرجعي، وتبقى مفتوحة حتى تُغلق بدليل."],
        ["🔗", "التتبّع ببحث واحد", "رمز الصنف يربط سجلات المورّد والاستلام والإنتاج لسحب سريع عند الحاجة."],
      ],
    },
  },
  retail: {
    en: {
      chip: "Supermarkets & retail", who: "supermarkets & retailers",
      h1a: "Every store. Every chiller.", h1b: "Checked and on record.",
      lead: "Receiving, chiller and freezer temperatures, expiry and returns, and customer complaints — every store on one live screen.",
      mock: { chart: "Chiller temperatures", range: "Limit 0–5 °C", r1: "Receiving check — Store 01", r2: "Freezer aisle — Store 02", r3: "Near-expiry check — Store 03", f1: "Chiller 07 · 2.6 °C" },
      pains: [
        ["🛒", "All stores, one screen", "Chillers, freezers and receiving checks from every store, with the ones out of limit highlighted."],
        ["📅", "Expiry and returns under control", "Returns logged with the reason and action, so stock and disposal records match."],
        ["💬", "Complaints followed up", "Customer complaints sent to the branch or the supplier and tracked until they are answered."],
      ],
    },
    ar: {
      chip: "السوبرماركت والتجزئة", who: "السوبرماركت ومحلات التجزئة",
      h1a: "كل متجر، وكل ثلاجة،", h1b: "مفحوصة وموثّقة.",
      lead: "الاستلام، وحرارة الثلاجات والمجمِّدات، والصلاحية والمرتجعات، وشكاوى العملاء — كل المتاجر على شاشة واحدة مباشرة.",
      mock: { chart: "حرارة الثلاجات", range: "الحد 0–5 °م", r1: "فحص الاستلام — متجر 01", r2: "ممر المجمِّدات — متجر 02", r3: "فحص قرب الانتهاء — متجر 03", f1: "ثلاجة 07 · 2.6 °م" },
      pains: [
        ["🛒", "كل المتاجر على شاشة واحدة", "فحوصات الثلاجات والمجمِّدات والاستلام من كل متجر، مع إبراز الخارج عن الحدود."],
        ["📅", "الصلاحية والمرتجعات تحت السيطرة", "المرتجعات مسجّلة مع السبب والإجراء، فتتطابق سجلات المخزون والإتلاف."],
        ["💬", "متابعة الشكاوى", "شكاوى العملاء تُرسل إلى الفرع أو المورّد وتُتابع حتى يأتي الرد."],
      ],
    },
  },
  distribution: {
    en: {
      chip: "Distribution & cold stores", who: "distributors & cold stores",
      h1a: "Every shipment. Every pallet.", h1b: "Cold chain on record.",
      lead: "Shipment receiving, cold store temperatures, supplier approval and item traceability — from the port to every customer, in one live record.",
      mock: { chart: "Cold store temperatures", range: "Limit −18 °C or below", r1: "Shipment receiving — Container 12", r2: "Cold store B — check", r3: "Supplier evaluation — due", f1: "Cold store B · −19.5 °C" },
      pains: [
        ["🚢", "Shipments received properly", "Each shipment checked on arrival — temperature, condition and dates."],
        ["🧊", "Cold chain you can show", "Cold rooms and freezers logged with their own limits; any break stands out."],
        ["✅", "Approved suppliers only", "Suppliers self-assess through a link, and their score shows on every receiving record."],
      ],
    },
    ar: {
      chip: "التوزيع والتخزين المبرّد", who: "شركات التوزيع والتخزين المبرّد",
      h1a: "كل شحنة، وكل منصّة،", h1b: "سلسلة تبريد موثّقة.",
      lead: "استلام الشحنات، وحرارة المخازن المبرّدة، واعتماد الموردين، وتتبّع الأصناف — من الميناء إلى كل عميل، في سجل واحد مباشر.",
      mock: { chart: "حرارة المخزن المبرّد", range: "الحد −18 °م أو أقل", r1: "استلام شحنة — حاوية 12", r2: "المخزن B — فحص", r3: "تقييم مورّد — مستحق", f1: "المخزن B · −19.5 °م" },
      pains: [
        ["🚢", "استلام شحنات صحيح", "كل شحنة تُفحص عند الوصول — الحرارة والحالة والتواريخ."],
        ["🧊", "سلسلة تبريد تثبتها", "غرف التبريد والمجمِّدات مسجّلة بحدودها، وأي انقطاع يبرز فورًا."],
        ["✅", "موردون معتمدون فقط", "يقيّم المورّد نفسه عبر رابط، وتظهر درجته على كل سجل استلام."],
      ],
    },
  },
};

/** The page text for `lang`, with the chosen sector's lines laid over it. */
export function withSector(base, sector, lang) {
  const s = SECTORS[sector]?.[lang];
  if (!s) return base;
  return { ...base, h1a: s.h1a, h1b: s.h1b, lead: s.lead, mock: { ...base.mock, ...s.mock } };
}
