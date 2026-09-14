// src/pages/hse/hseRiskSeeds.js
// قوائم المخاطر الجاهزة لسجل المخاطر — مصدر واحد للبذور وللإصلاح/إزالة التكرار.

export const SEED_RISKS = [
  { id: "seed-1", area: "Frozen Room (-18°C)", hazard: { ar: "انخفاض حرارة الجسم / قضمة الصقيع", en: "Hypothermia / frostbite" }, consequence: { ar: "إصابات جلدية، فقدان وعي، نوبات قلبية", en: "Skin injuries, loss of consciousness, heart attacks" }, likelihood: 4, severity: 4, controls: { ar: "حد أقصى للدخول 45 دقيقة، ملابس معزولة معتمدة، نظام تدوير للعمال، زر طوارئ داخل الغرفة", en: "Max 45 min entry, certified insulated clothing, worker rotation system, emergency button inside room" }, category: "cold" },
  { id: "seed-2", area: "Frozen Room (-18°C)", hazard: { ar: "انحصار العامل داخل الغرفة", en: "Worker trapped inside the room" }, consequence: { ar: "وفاة اختناقاً أو بالبرودة", en: "Death by suffocation or hypothermia" }, likelihood: 3, severity: 5, controls: { ar: "نظام فتح من الداخل، نظام إنذار، اتصال لاسلكي، تفقّد قبل الإغلاق", en: "Inside-release system, alarm, two-way radio, pre-close inspection" }, category: "cold" },
  { id: "seed-3", area: "Chiller Room (0 to +4°C)", hazard: { ar: "تسرب غاز الأمونيا (NH3)", en: "Ammonia (NH3) gas leak" }, consequence: { ar: "تسمم، حرق الجهاز التنفسي، الوفاة عند تركيز عالٍ", en: "Poisoning, respiratory burns, death at high concentration" }, likelihood: 4, severity: 5, controls: { ar: "كواشف غاز ذات إنذار، تهوية طارئة، أقنعة واقية، خطة إخلاء، تدريب ربع سنوي", en: "Alarmed gas detectors, emergency ventilation, respirators, evacuation plan, quarterly drill" }, category: "chemical" },
  { id: "seed-4", area: "Chiller Room (0 to +4°C)", hazard: { ar: "تسرب غاز الفريون", en: "Freon gas leak" }, consequence: { ar: "اختناق، تلف بيئي", en: "Asphyxiation, environmental damage" }, likelihood: 3, severity: 4, controls: { ar: "كواشف، صيانة دورية، شهادة فنيي التبريد", en: "Detectors, periodic maintenance, certified refrigeration technicians" }, category: "chemical" },
  { id: "seed-5", area: "Production / Processing Line", hazard: { ar: "قطوع من السكاكين والمناشير", en: "Cuts from knives & saws" }, consequence: { ar: "جروح عميقة، قطع أصابع", en: "Deep wounds, finger amputation" }, likelihood: 4, severity: 4, controls: { ar: "قفازات مقاومة للقطع، صدرية واقية، تدريب استخدام الآلات، أغطية واقية للشفرات", en: "Cut-resistant gloves, protective apron, machine training, blade guards" }, category: "physical" },
  { id: "seed-6", area: "Production / Processing Line", hazard: { ar: "التعامل مع آلات التقطيع الكهربائية", en: "Electric slicing machines" }, consequence: { ar: "بتر، صعق كهربائي", en: "Amputation, electric shock" }, likelihood: 4, severity: 5, controls: { ar: "إيقاف طارئ، حساسات أمان، قفل وسم (LOTO) عند الصيانة، تدريب مكثف", en: "E-stop, safety sensors, LOTO during maintenance, intensive training" }, category: "fire" },
  { id: "seed-7", area: "Production / Processing Line", hazard: { ar: "التلوث المتبادل (Cross-contamination)", en: "Cross-contamination" }, consequence: { ar: "سحب منتج، تسمم عملاء، غرامات", en: "Product recall, customer poisoning, fines" }, likelihood: 3, severity: 5, controls: { ar: "فصل لحوم نيئة/مجهزة، ألوان أدوات، غسل يدين إلزامي، برنامج تعقيم", en: "Raw/processed segregation, color-coded tools, mandatory hand wash, sanitation program" }, category: "cross" },
  { id: "seed-8", area: "QCS — Al Qusais Cold Storage", hazard: { ar: "حوادث الرافعات الشوكية", en: "Forklift accidents" }, consequence: { ar: "وفاة، إصابات بليغة، تلف منشآت", en: "Fatality, severe injuries, facility damage" }, likelihood: 3, severity: 5, controls: { ar: "رخصة سائق معتمدة، فحص يومي، سرعة قصوى 10 كم/س، ممرات محددة للمشاة", en: "Certified driver license, daily inspection, max 10 km/h, defined pedestrian lanes" }, category: "physical" },
  { id: "seed-9", area: "QCS — Al Qusais Cold Storage", hazard: { ar: "سقوط بضائع من الرفوف", en: "Goods falling from racks" }, consequence: { ar: "إصابات رأس، كسور", en: "Head injuries, fractures" }, likelihood: 3, severity: 3, controls: { ar: "فحص رفوف ربع سنوي، حدود وزن، توزيع صحيح، خوذات إلزامية", en: "Quarterly rack inspection, weight limits, proper distribution, mandatory helmets" }, category: "physical" },
  { id: "seed-10", area: "QCS — Al Qusais Cold Storage", hazard: { ar: "انزلاق على الأرضيات الرطبة", en: "Slip on wet floors" }, consequence: { ar: "كسور، إصابات ظهر", en: "Fractures, back injuries" }, likelihood: 4, severity: 3, controls: { ar: "أحذية مضادة للانزلاق، لافتات تحذيرية، تجفيف فوري، برنامج نظافة منظم", en: "Anti-slip footwear, warning signs, immediate drying, organized cleaning program" }, category: "physical" },
  { id: "seed-11", area: "Receiving Bay — Air Cargo Reception", hazard: { ar: "الرفع اليدوي للأحمال الثقيلة", en: "Manual lifting of heavy loads" }, consequence: { ar: "إصابات ظهر، فتق", en: "Back injuries, hernia" }, likelihood: 4, severity: 3, controls: { ar: "حد أقصى 25 كجم، تدريب الرفع الصحيح، استخدام العربات والرافعات", en: "Max 25 kg, lifting technique training, use of trolleys and lifts" }, category: "ergonomic" },
  { id: "seed-12", area: "Receiving Bay — Air Cargo Reception", hazard: { ar: "استقبال بضائع خارج نطاق درجة الحرارة", en: "Receiving goods outside temperature range" }, consequence: { ar: "فساد، سحب منتج", en: "Spoilage, product recall" }, likelihood: 3, severity: 5, controls: { ar: "فحص حرارة إلزامي، رفض البضائع المخالفة، سجلات استلام", en: "Mandatory temperature check, reject non-conforming goods, receiving logs" }, category: "coldchain" },
  { id: "seed-13", area: "All sites", hazard: { ar: "حرائق (كهربائية / مواد تغليف)", en: "Fire (electrical / packaging materials)" }, consequence: { ar: "خسائر بشرية ومادية ضخمة", en: "Massive human and material losses" }, likelihood: 4, severity: 4, controls: { ar: "أنظمة رش آلية، طفايات كل 15م، إنذار متصل بالدفاع المدني، تدريب إخلاء", en: "Automatic sprinklers, extinguishers every 15m, alarm linked to Civil Defence, evacuation training" }, category: "fire" },
  { id: "seed-14", area: "All sites", hazard: { ar: "صعق كهربائي", en: "Electric shock" }, consequence: { ar: "وفاة، حروق", en: "Death, burns" }, likelihood: 3, severity: 5, controls: { ar: "قفل/وسم (LOTO)، فنيون معتمدون فقط، قواطع تيار، فحص دوري", en: "LOTO, certified technicians only, circuit breakers, periodic inspection" }, category: "fire" },
  { id: "seed-15", area: "All sites", hazard: { ar: "تلوث بكتيري (Salmonella, E. coli, Listeria)", en: "Bacterial contamination (Salmonella, E. coli, Listeria)" }, consequence: { ar: "تسمم غذائي جماعي، دعاوى قضائية", en: "Mass food poisoning, lawsuits" }, likelihood: 4, severity: 4, controls: { ar: "مسحات أسبوعية، تعقيم، تحكم بدرجة الحرارة، فحص طبي للعمال", en: "Weekly swabs, sanitation, temperature control, employee medical checks" }, category: "biological" },
  { id: "seed-16", area: "All sites", hazard: { ar: "الإصابة بالحشرات والقوارض", en: "Pest / rodent infestation" }, consequence: { ar: "تلوث، إغلاق من البلدية", en: "Contamination, DM closure" }, likelihood: 3, severity: 4, controls: { ar: "عقد مع شركة معتمدة، فحص شهري، مصائد حول المحيط، سدّ الفتحات", en: "Approved company contract, monthly inspection, perimeter traps, seal openings" }, category: "pest" },
  { id: "seed-17", area: "Distribution Fleet (Refrigerated trucks)", hazard: { ar: "عطل التبريد أثناء النقل", en: "Refrigeration failure during transport" }, consequence: { ar: "فساد الشحنة، خسائر مالية", en: "Shipment spoilage, financial loss" }, likelihood: 3, severity: 4, controls: { ar: "أجهزة تسجيل حرارة (Data loggers)، صيانة دورية، خطة بديلة", en: "Data loggers, periodic maintenance, contingency plan" }, category: "coldchain" },
  { id: "seed-18", area: "Distribution Fleet (Refrigerated trucks)", hazard: { ar: "حوادث مرورية", en: "Road traffic accidents" }, consequence: { ar: "إصابات، خسائر", en: "Injuries, losses" }, likelihood: 3, severity: 3, controls: { ar: "تتبع GPS، قيود سرعة، راحة السائق، فحص دوري للمركبات", en: "GPS tracking, speed limits, driver rest, periodic vehicle inspection" }, category: "physical" },
  { id: "seed-19", area: "All sites", hazard: { ar: "تصريف مياه ملوثة للصرف", en: "Discharge of contaminated water" }, consequence: { ar: "غرامات بيئية من البلدية", en: "Environmental fines from DM" }, likelihood: 3, severity: 3, controls: { ar: "مصائد دهون، معالجة أولية، سجلات صيانة، التعاقد مع شركة معتمدة", en: "Grease traps, primary treatment, maintenance logs, approved-company contract" }, category: "env" },
  { id: "seed-20", area: "All sites", hazard: { ar: "سوء إدارة النفايات العضوية", en: "Mismanagement of organic waste" }, consequence: { ar: "روائح، حشرات، غرامات", en: "Odors, pests, fines" }, likelihood: 4, severity: 3, controls: { ar: "حاويات مغطاة، إخلاء يومي، شركة نقل معتمدة من البلدية", en: "Covered containers, daily emptying, DM-approved waste carrier" }, category: "env" },
];

/* ══════════════════════════════════════════════════════════════════
   مخاطر التحميل والتفريغ — تُضاف تلقائياً لمن لا يملكها في سجله.
   مصدرها ملاحظة التدقيق على تقييم مخاطر تحميل وتفريغ المركبات:
   كل خطر يحمل ضابطاً محدداً بالاسم، ونوع الضبط، والخطر المتبقي،
   والإجراء المرتبط — بدل عبارات عامة تعتمد على الوعي.
   ══════════════════════════════════════════════════════════════════ */
const LOADING_AREA = "Loading & Unloading Bay";
const LOADING_OWNER = "HSE Officer / Warehouse Supervisor";

export const LOADING_RISKS = [
  {
    seedKey: "load-1",
    area: LOADING_AREA, category: "ergonomic", owner: LOADING_OWNER,
    hazard: {
      ar: "الرفع والمناولة اليدوية للأحمال أثناء التحميل والتفريغ",
      en: "Manual lifting and handling of loads during loading and unloading",
    },
    consequence: {
      ar: "إصابات عضلية هيكلية، إصابات وآلام الظهر، فتق، إجهاد متكرر",
      en: "Musculoskeletal injuries, back injuries, hernia, repetitive strain",
    },
    likelihood: 4, severity: 3,
    controls: {
      ar: "حد أقصى 25 كجم للفرد الواحد ورفع ثنائي لما فوق ذلك؛ توفير عربات ومكابس بالتات ومنحدر تحميل؛ تدريب إلزامي على المناولة اليدوية قبل التكليف بالعمل؛ تعليم الوزن على الأصناف الثقيلة؛ إشراف مباشر من مشرف المناوبة على كل عملية تفريغ.",
      en: "25 kg single-person limit with two-person lift above it; trolleys, pallet trucks and a dock ramp provided; mandatory manual-handling training before assignment; weight marking on heavy items; direct shift-supervisor oversight of every unloading operation.",
    },
    controlType: "administrative",
    residualLikelihood: 2, residualSeverity: 3,
    linkedSop: "SOP-OHS-06",
  },
  {
    seedKey: "load-2",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "اصطدام المركبات وتداخل حركتها مع المشاة داخل منطقة التحميل",
      en: "Vehicle collisions and vehicle-pedestrian interaction in the loading bay",
    },
    consequence: {
      ar: "دهس العاملين، إصابات بليغة أو وفاة، تلف المنشأة والبضاعة",
      en: "Workers struck by vehicles, severe injury or fatality, damage to facility and goods",
    },
    likelihood: 3, severity: 5,
    controls: {
      ar: "خطة إدارة حركة مرورية معتمدة للموقع؛ ممر مشاة مدهون ومفصول بحواجز عن مسار المركبات؛ اتجاه سير واحد وسرعة قصوى 10 كم/س؛ مرايا محدبة عند الزوايا العمياء؛ وجود مراقب (Banksman) إلزامي عند كل مناورة رجوع للخلف.",
      en: "Approved site traffic-management plan; painted pedestrian walkway physically separated from the vehicle route; one-way flow and a 10 km/h speed limit; convex mirrors at blind corners; a banksman mandatory for every reversing manoeuvre.",
    },
    controlType: "engineering",
    residualLikelihood: 2, residualSeverity: 5,
    linkedSop: "SOP-OHS-04",
  },
  {
    seedKey: "load-3",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "السقوط من صندوق المركبة أو المقطورة أو من حافة رصيف التحميل",
      en: "Fall from a vehicle bed, trailer or the edge of the loading dock",
    },
    consequence: {
      ar: "كسور، إصابات في الرأس والعمود الفقري، عجز دائم",
      en: "Fractures, head and spinal injuries, permanent disability",
    },
    likelihood: 3, severity: 4,
    controls: {
      ar: "حاجز واقٍ على حافة الرصيف وسلسلة أمان عند فتحة التحميل؛ سلالم ثابتة ومنصات وصول معتمدة بدل القفز من الشاحنة؛ منع الصعود فوق الأحمال المستيفة؛ حزام أمان عند أي عمل يتجاوز 1.8 متر؛ لافتات تحذير من الحافة وشريط أرضي.",
      en: "Guardrail at the dock edge and a safety chain across the loading opening; fixed steps and approved access platforms instead of jumping down from the truck; climbing on stacked loads prohibited; a harness for any work above 1.8 m; edge-warning signage and floor marking.",
    },
    controlType: "engineering",
    residualLikelihood: 2, residualSeverity: 4,
    linkedSop: "SOP-OHS-07",
  },
  {
    seedKey: "load-4",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "الانحشار أو السحق بين المركبة والرصيف أو الرفوف أو الأجسام الثابتة",
      en: "Crush injury between the vehicle and the dock, racking or a fixed object",
    },
    consequence: {
      ar: "سحق الأطراف، إصابات داخلية، وفاة",
      en: "Crushed limbs, internal injuries, fatality",
    },
    likelihood: 3, severity: 5,
    controls: {
      ar: "أوتاد عجلات وقفل فرامل المركبة قبل بدء أي مناولة؛ تسليم مفاتيح المركبة للمشرف طوال العملية (Key Control)؛ منطقة استبعاد محددة بالدهان يُمنع الوقوف داخلها أثناء المناورة؛ صادّات مطاطية على الرصيف؛ إشارة ضوئية أحمر/أخضر بين السائق ومنطقة الرصيف.",
      en: "Wheel chocks and vehicle brake lock applied before any handling starts; vehicle keys held by the supervisor for the duration (key control); a painted exclusion zone that must stay clear during manoeuvring; rubber dock bumpers; a red/green light signal between driver and dock.",
    },
    controlType: "engineering",
    residualLikelihood: 1, residualSeverity: 5,
    linkedSop: "SOP-OHS-04",
  },
  {
    seedKey: "load-5",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "ضعف الرؤية أثناء التحميل والتفريغ (ليلاً أو داخل الشاحنات المظلمة)",
      en: "Poor visibility during loading and unloading (at night or inside dark trailers)",
    },
    consequence: {
      ar: "اصطدام ودهس، سقوط، أخطاء في المناولة وتلف البضاعة",
      en: "Collisions and pedestrian strikes, falls, handling errors and product damage",
    },
    likelihood: 4, severity: 4,
    controls: {
      ar: "إضاءة لا تقل عن 200 لكس في منطقة التحميل مع فحص شهري موثّق؛ سترات عاكسة إلزامية لكل من يدخل المنطقة؛ مصابيح رصيف موجّهة إلى داخل الشاحنة؛ إنذار رجوع صوتي وضوئي على كل مركبة ورافعة؛ مراقب عند نقاط الرؤية العمياء.",
      en: "Minimum 200 lux in the loading area with a documented monthly check; high-visibility vests mandatory for anyone entering the area; dock lights directed into the trailer; audible and visual reversing alarms on every vehicle and forklift; a spotter at blind spots.",
    },
    controlType: "combined",
    residualLikelihood: 2, residualSeverity: 4,
    linkedSop: "SOP-OHS-02",
  },
  {
    seedKey: "load-6",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "عدم تثبيت الحمولة بشكل صحيح وسقوط الأحمال",
      en: "Inadequate load securement and falling loads",
    },
    consequence: {
      ar: "سقوط بضائع على العاملين، تلف الشحنة، حوادث أثناء النقل على الطريق",
      en: "Goods falling onto workers, damaged consignment, in-transit road accidents",
    },
    likelihood: 3, severity: 4,
    controls: {
      ar: "قائمة فحص تثبيت الحمولة قبل المغادرة يوقّعها السائق والمشرف؛ استخدام أحزمة وقضبان تثبيت معتمدة فقط مع فحصها قبل كل استخدام وسحب التالف فوراً؛ حد أقصى لارتفاع التستيف وتوزيع متوازن للوزن؛ فحص عشوائي أسبوعي من قسم HSE.",
      en: "Pre-departure load-securement checklist signed by driver and supervisor; only approved straps and load bars, inspected before each use with damaged items withdrawn immediately; a maximum stacking height and balanced weight distribution; a weekly random HSE spot-check.",
    },
    controlType: "administrative",
    residualLikelihood: 2, residualSeverity: 4,
    linkedSop: "SOP-OHS-11",
  },
  {
    seedKey: "load-7",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "الظروف الجوية — الأمطار والأسطح المبللة أو المتجمّدة عند أبواب الغرف الباردة",
      en: "Adverse weather — rain and wet or iced surfaces at cold-room doorways",
    },
    consequence: {
      ar: "انزلاق وسقوط العاملين، فقدان السيطرة على المركبة، تلف الشحنة",
      en: "Slips and falls, loss of vehicle control, damaged consignment",
    },
    likelihood: 3, severity: 3,
    controls: {
      ar: "سطح مانع للانزلاق ومظلة فوق رصيف التحميل؛ تصريف مياه وتجفيف فوري مع لافتات أرضية مبللة؛ صلاحية معلنة للمشرف بإيقاف العمل مؤقتاً عند الأمطار الغزيرة؛ أحذية مضادة للانزلاق إلزامية؛ إزالة الجليد المتراكم عند أبواب الغرف الباردة قبل بدء المناولة.",
      en: "Anti-slip surfacing and a canopy over the dock; drainage, immediate drying and wet-floor signage; a stated supervisor authority to suspend work in heavy rain; anti-slip footwear mandatory; ice build-up cleared at cold-room doorways before handling starts.",
    },
    controlType: "combined",
    residualLikelihood: 2, residualSeverity: 3,
    linkedSop: "SOP-OHS-11",
  },
  {
    seedKey: "load-8",
    area: LOADING_AREA, category: "physical", owner: LOADING_OWNER,
    hazard: {
      ar: "تنفيذ التحميل والتفريغ دون إجراء مكتوب أو تحقق من الكفاءة (اعتماد على الوعي العام)",
      en: "Loading and unloading performed without a written procedure or competence check (reliance on general awareness)",
    },
    consequence: {
      ar: "تطبيق غير متسق للضوابط، تكرار الحوادث، عدم مطابقة في التدقيق وغرامات تنظيمية",
      en: "Inconsistent application of controls, recurring incidents, audit non-conformance and regulatory fines",
    },
    likelihood: 4, severity: 4,
    controls: {
      ar: "إصدار واعتماد إجراء تشغيلي قياسي للتحميل والتفريغ؛ اجتماع Toolbox قبل كل مناوبة تحميل مع توقيع الحضور؛ مصفوفة كفاءة لكل عامل ولا يُكلَّف بالعمل إلا المعتمد فيها؛ فحص دوري موثّق لمنطقة التحميل؛ مراجعة تقييم المخاطر سنوياً وبعد أي حادث أو تغيير في العملية.",
      en: "Issue and approve a standard operating procedure for loading and unloading; a toolbox talk before every loading shift with signed attendance; a competence matrix per worker with only assessed workers assigned; a documented periodic loading-bay inspection; risk-assessment review annually and after any incident or process change.",
    },
    controlType: "administrative",
    residualLikelihood: 2, residualSeverity: 4,
    linkedSop: "SOP-OHS-11",
  },
];

/** كل المخاطر الجاهزة معاً — تُستخدم في مطابقة السجلات القديمة */
export const SEED_CATALOG = [...SEED_RISKS, ...LOADING_RISKS];
