import React, { useState, useEffect } from "react";

export default function Inspection() {
  const [language, setLanguage] = useState("ar"); // "ar" أو "en"

  // دالة ترجمة النصوص حسب اللغة
  const t = (arText, enText) => (language === "ar" ? arText : enText);

  const [answers, setAnswers] = useState({});
  const [images, setImages] = useState({});
  const [comments, setComments] = useState({});
  const [risks, setRisks] = useState({});
  const [questions, setQuestions] = useState([]);

  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("ISO 22000");
  const [newQuestionSection, setNewQuestionSection] = useState("");

  const [selectedTypes, setSelectedTypes] = useState([]);
  const [branchName, setBranchName] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [supervisorName, setSupervisorName] = useState("");
  const [finalComment, setFinalComment] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);

  const allTypes = [
    "ISO 22000",
    "HACCP",
    t("حلال", "Halal"),
    t("التفتيش الداخلي", "Internal Inspection"),
  ];

  const branchOptions = [
    "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
    "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
    "POS 42", "POS 44", "POS 45"
  ];

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("allQuestions") || "[]");
    const baseQuestions = [
      // كل الأسئلة مترجمة مع القسم والنص
      { type: "ISO 22000", section: t("📖 نطاق النظام", "📖 Scope"), text: t("هل تم تعريف نطاق نظام سلامة الغذاء ليشمل جميع عمليات اللحوم من الاستلام إلى التخزين والتوزيع؟", "Is the food safety system scope defined to include all meat operations from receipt to storage and distribution?") },
      { type: "ISO 22000", section: t("📖 قيادة الإدارة", "📖 Management Leadership"), text: t("هل يدعم الإدارة العليا تطبيق نظام سلامة الغذاء بشكل كامل في جميع وحدات اللحوم؟", "Does top management fully support the implementation of the food safety system in all meat units?") },
      { type: "ISO 22000", section: t("🌡️ مراقبة درجات الحرارة", "🌡️ Temperature Control"), text: t("هل تتم مراقبة درجات حرارة تخزين اللحوم (تبريد أو تجميد) بشكل مستمر؟", "Is the temperature of meat storage (refrigeration or freezing) continuously monitored?") },
      { type: "ISO 22000", section: t("🌡️ مراقبة درجات الحرارة", "🌡️ Temperature Control"), text: t("هل توجد سجلات دقيقة لتسجيل درجات الحرارة؟", "Are there accurate records for temperature logging?") },
      { type: "ISO 22000", section: t("🥩 معالجة اللحوم", "🥩 Meat Processing"), text: t("هل يتم فصل اللحوم النيئة عن المطهية لمنع التلوث المتبادل؟", "Is raw meat separated from cooked meat to prevent cross-contamination?") },
      { type: "ISO 22000", section: t("🥩 معالجة اللحوم", "🥩 Meat Processing"), text: t("هل تُستخدم معدات مخصصة أو يتم تعقيمها بفعالية بين استخدامات اللحوم النيئة والمطهية؟", "Are dedicated equipment used or effectively sanitized between raw and cooked meat processing?") },
      { type: "ISO 22000", section: t("👷 النظافة الشخصية للعاملين", "👷 Personal Hygiene"), text: t("هل يلتزم العمال بإجراءات النظافة الشخصية (غسل اليدين، ارتداء ملابس واقية)؟", "Do workers comply with personal hygiene practices (hand washing, protective clothing)?") },
      { type: "ISO 22000", section: t("👷 النظافة الشخصية للعاملين", "👷 Personal Hygiene"), text: t("هل يتم تدريب العاملين على ممارسات السلامة الصحية المتعلقة بمعالجة اللحوم؟", "Are workers trained on health safety practices related to meat processing?") },
      { type: "ISO 22000", section: t("🧼 نظافة المعدات والمرافق", "🧼 Equipment & Facility Cleanliness"), text: t("هل يتم تنظيف وتعقيم المعدات بشكل دوري وموثق؟", "Are equipment regularly cleaned and sanitized with documented procedures?") },
      { type: "ISO 22000", section: t("🧼 نظافة المعدات والمرافق", "🧼 Equipment & Facility Cleanliness"), text: t("هل مرافق التخزين والمعالجة نظيفة وخالية من التلوث؟", "Are storage and processing facilities clean and free of contamination?") },
      { type: "ISO 22000", section: t("🐜 مكافحة الآفات", "🐜 Pest Control"), text: t("هل توجد برامج فعالة لمنع ومكافحة الحشرات والقوارض داخل مواقع الإنتاج والتخزين؟", "Are there effective pest control programs for insects and rodents in production and storage areas?") },
      { type: "ISO 22000", section: t("📦 استلام المواد الأولية", "📦 Raw Material Receiving"), text: t("هل يتم فحص جودة وسلامة اللحوم المستلمة من الموردين؟", "Is the quality and safety of received meat from suppliers inspected?") },
      { type: "ISO 22000", section: t("📦 استلام المواد الأولية", "📦 Raw Material Receiving"), text: t("هل الموردون معتمدون ومراقبون وفق معايير سلامة الغذاء؟", "Are suppliers certified and monitored according to food safety standards?") },
      { type: "ISO 22000", section: t("🚮 التخلص من المخلفات", "🚮 Waste Disposal"), text: t("هل يتم التخلص من نفايات اللحوم بطريقة صحية وآمنة لمنع التلوث البيئي؟", "Is meat waste disposed of in a sanitary and safe manner to prevent environmental contamination?") },
      { type: "ISO 22000", section: t("📋 توثيق العمليات", "📋 Documentation"), text: t("هل توجد سجلات كاملة لجميع العمليات والفحوصات المتعلقة بسلامة اللحوم؟", "Are complete records kept for all operations and inspections related to meat safety?") },
      { type: "ISO 22000", section: t("📋 توثيق العمليات", "📋 Documentation"), text: t("هل تتم مراجعة هذه السجلات بانتظام؟", "Are these records reviewed regularly?") },
      { type: "ISO 22000", section: t("🚨 استجابة الطوارئ", "🚨 Emergency Response"), text: t("هل توجد خطة طوارئ للتعامل مع حالات التلوث أو الحوادث الغذائية؟", "Is there an emergency plan for contamination or food incidents?") },

      { type: "HACCP", section: t("🔍 تحليل المخاطر", "🔍 Hazard Analysis"), text: t("هل تم إجراء تحليل شامل لجميع مخاطر السلامة الغذائية المحتملة في عمليات اللحوم؟", "Has a thorough hazard analysis been conducted for all potential food safety risks in meat operations?") },
      { type: "HACCP", section: t("🔍 تحليل المخاطر", "🔍 Hazard Analysis"), text: t("هل تم تحديد المخاطر البيولوجية (مثل البكتيريا والطفيليات) في جميع مراحل المعالجة؟", "Are biological hazards (e.g., bacteria, parasites) identified at all processing stages?") },
      { type: "HACCP", section: t("⚠️ نقاط التحكم الحرجة (CCPs)", "⚠️ Critical Control Points (CCPs)"), text: t("هل تم تحديد نقاط التحكم الحرجة (CCPs) لكل خطر تم تحليله؟", "Have Critical Control Points (CCPs) been identified for each analyzed hazard?") },
      { type: "HACCP", section: t("⚠️ نقاط التحكم الحرجة (CCPs)", "⚠️ Critical Control Points (CCPs)"), text: t("هل توجد إجراءات واضحة لمراقبة نقاط التحكم الحرجة بانتظام؟", "Are clear procedures in place for regular monitoring of CCPs?") },
      { type: "HACCP", section: t("🌡️ مراقبة درجات الحرارة", "🌡️ Temperature Monitoring"), text: t("هل تتم مراقبة درجات حرارة اللحوم خلال الاستلام، التخزين، المعالجة، والتوزيع؟", "Are meat temperatures monitored during receipt, storage, processing, and distribution?") },
      { type: "HACCP", section: t("🌡️ مراقبة درجات الحرارة", "🌡️ Temperature Monitoring"), text: t("هل توجد سجلات دورية لمراقبة درجات الحرارة وتوثيقها؟", "Are temperature monitoring records maintained regularly?") },
      { type: "HACCP", section: t("🔄 الإجراءات التصحيحية", "🔄 Corrective Actions"), text: t("هل توجد إجراءات تصحيحية واضحة للتعامل مع أي انحراف في نقاط التحكم الحرجة؟", "Are clear corrective actions in place to handle CCP deviations?") },
      { type: "HACCP", section: t("🔄 الإجراءات التصحيحية", "🔄 Corrective Actions"), text: t("هل يتم تسجيل جميع إجراءات التصحيح بشكل دقيق؟", "Are all corrective actions accurately documented?") },
      { type: "HACCP", section: t("✅ التحقق والتوثيق", "✅ Verification and Documentation"), text: t("هل يتم إجراء تحقق دوري لضمان فعالية خطة HACCP؟", "Is regular verification conducted to ensure HACCP effectiveness?") },
      { type: "HACCP", section: t("✅ التحقق والتوثيق", "✅ Verification and Documentation"), text: t("هل توجد سجلات كاملة ومحدثة لجميع عمليات المراقبة والتحقق والتدقيق؟", "Are complete and up-to-date records maintained for all monitoring, verification, and auditing?") },
      { type: "HACCP", section: t("👷 تدريب العاملين", "👷 Worker Training"), text: t("هل تم تدريب العاملين على متطلبات HACCP وكيفية تطبيقها؟", "Are workers trained on HACCP requirements and implementation?") },
      { type: "HACCP", section: t("👷 تدريب العاملين", "👷 Worker Training"), text: t("هل توجد توعية مستمرة للعاملين حول أهمية مراقبة نقاط التحكم الحرجة؟", "Is there ongoing awareness among workers about CCP monitoring importance?") },

      { type: t("حلال", "Halal"), section: t("📦 المواد الخام والمكونات", "📦 Raw Materials and Ingredients"), text: t("هل جميع المواد الخام والمكونات المستخدمة حلال وخالية من المواد المحرمة مثل الخنزير والكحول؟", "Are all raw materials and ingredients halal and free from prohibited substances like pork and alcohol?") },
      { type: t("حلال", "Halal"), section: t("📦 المواد الخام والمكونات", "📦 Raw Materials and Ingredients"), text: t("هل الموردون موثوقون ويوجد لديهم شهادات حلال معتمدة؟", "Are suppliers reliable and have valid halal certificates?") },
      { type: t("حلال", "Halal"), section: t("🏭 عمليات الإنتاج والتصنيع", "🏭 Production and Manufacturing Processes"), text: t("هل يتم منع التلوث المتبادل بين منتجات الحلال وغير الحلال أثناء التصنيع؟", "Is cross-contamination prevented between halal and non-halal products during manufacturing?") },
      { type: t("حلال", "Halal"), section: t("🏭 عمليات الإنتاج والتصنيع", "🏭 Production and Manufacturing Processes"), text: t("هل يتم الالتزام بالمعايير الشرعية في جميع مراحل التصنيع؟", "Are Sharia standards complied with at all manufacturing stages?") },
      { type: t("حلال", "Halal"), section: t("⚙️ معدات الإنتاج", "⚙️ Production Equipment"), text: t("هل تم تخصيص معدات الإنتاج لمنتجات الحلال أو تنظيفها بصرامة حسب المعايير الشرعية؟", "Is production equipment dedicated or strictly cleaned according to Sharia standards for halal products?") },
      { type: t("حلال", "Halal"), section: t("⚙️ معدات الإنتاج", "⚙️ Production Equipment"), text: t("هل تمنع المعدات من التلوث بمواد غير حلال؟", "Does equipment prevent contamination with non-halal substances?") },
      { type: t("حلال", "Halal"), section: t("📦 التغليف والوسم", "📦 Packaging and Labeling"), text: t("هل تستخدم مواد تعبئة وتغليف حلال ولا تحتوي على مواد محرمة؟", "Are halal packaging materials used without prohibited substances?") },
      { type: t("حلال", "Halal"), section: t("📦 التغليف والوسم", "📦 Packaging and Labeling"), text: t("هل توجد علامات واضحة وشهادات حلال على المنتجات؟", "Are clear halal marks and certificates on the products?") },
      { type: t("حلال", "Halal"), section: t("👥 الموارد البشرية والتدريب", "👥 HR and Training"), text: t("هل تم تدريب العاملين على متطلبات شهادة الحلال وكيفية التعامل مع المواد والمعدات؟", "Are workers trained on halal certification requirements and handling materials and equipment?") },
      { type: t("حلال", "Halal"), section: t("👥 الموارد البشرية والتدريب", "👥 HR and Training"), text: t("هل توجد مراقبة مستمرة لضمان الالتزام بمعايير الحلال؟", "Is continuous monitoring in place to ensure halal compliance?") },
      { type: t("حلال", "Halal"), section: t("🧼 النظافة ومكافحة التلوث", "🧼 Cleanliness and Cross-Contamination Control"), text: t("هل يتم الالتزام بمعايير النظافة الصارمة لمنع التلوث؟", "Are strict cleanliness standards followed to prevent contamination?") },
      { type: t("حلال", "Halal"), section: t("🧼 النظافة ومكافحة التلوث", "🧼 Cleanliness and Cross-Contamination Control"), text: t("هل توجد إجراءات فعالة لمنع التلوث المتبادل بين الحلال وغير الحلال؟", "Are effective procedures in place to prevent cross-contamination between halal and non-halal?") },
      { type: t("حلال", "Halal"), section: t("📋 التوثيق والسجلات", "📋 Documentation and Records"), text: t("هل توجد سجلات دقيقة لجميع عمليات الشراء والتصنيع والتوزيع المتعلقة بمنتجات الحلال؟", "Are accurate records kept for all purchasing, manufacturing, and distribution of halal products?") },
      { type: t("حلال", "Halal"), section: t("📋 التوثيق والسجلات", "📋 Documentation and Records"), text: t("هل يتم توثيق عمليات التنظيف والفحوصات والتدقيق بشكل دوري؟", "Are cleaning, inspection, and auditing processes documented regularly?") },
      { type: t("حلال", "Halal"), section: t("🔍 التدقيق الداخلي والمراجعة", "🔍 Internal Audit and Review"), text: t("هل يتم إجراء تفتيش ومراجعة دورية لضمان استمرار التوافق مع متطلبات شهادة الحلال؟", "Are regular inspections and reviews conducted to ensure continued halal certification compliance?") },
      { type: t("حلال", "Halal"), section: t("🔍 التدقيق الداخلي والمراجعة", "🔍 Internal Audit and Review"), text: t("هل يتم التعاون مع جهات التدقيق والمراقبة الخارجية؟", "Is cooperation maintained with external audit and control bodies?") },

      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🧼 النظافة العامة", "🧼 General Cleanliness"), text: t("هل الأرضيات، الجدران، الأسقف، والمعدات نظيفة؟", "Are floors, walls, ceilings, and equipment clean?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🧼 النظافة العامة", "🧼 General Cleanliness"), text: t("هل يوجد نظام فعال للتنظيف والتعقيم؟", "Is there an effective cleaning and sanitizing system?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🧼 النظافة العامة", "🧼 General Cleanliness"), text: t("هل نظافة الملابس وأدوات العمل للعاملين مناسبة؟", "Is clothing and work tools cleanliness appropriate for workers?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🥩 معالجة اللحوم وتخزينها", "🥩 Meat Processing and Storage"), text: t("هل تخزن اللحوم في درجات حرارة مناسبة (تبريد أو تجميد)؟", "Is meat stored at appropriate temperatures (refrigeration or freezing)?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🥩 معالجة اللحوم وتخزينها", "🥩 Meat Processing and Storage"), text: t("هل يتم الفصل بين اللحوم النيئة والمطهوة لتجنب التلوث المتبادل؟", "Is raw meat separated from cooked meat to avoid cross-contamination?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🥩 معالجة اللحوم وتخزينها", "🥩 Meat Processing and Storage"), text: t("هل تراقب صلاحية اللحوم وتدوين تاريخ الاستلام والصلاحية؟", "Is meat expiration monitored and receipt/expiry dates recorded?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🌡️ مراقبة درجة الحرارة", "🌡️ Temperature Monitoring"), text: t("هل توجد أجهزة قياس ومراقبة مستمرة لدرجات حرارة الثلاجات والتجميد؟", "Are there devices for continuous monitoring of refrigeration and freezing temperatures?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🌡️ مراقبة درجة الحرارة", "🌡️ Temperature Monitoring"), text: t("هل يتم توثيق تسجيل درجات الحرارة بشكل دوري؟", "Is temperature logging regularly documented?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🐜 مكافحة الآفات", "🐜 Pest Control"), text: t("هل توجد خطة فعالة لمكافحة الحشرات والقوارض؟", "Is there an effective plan for pest control?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🐜 مكافحة الآفات", "🐜 Pest Control"), text: t("هل يتم الحفاظ على نظافة المخازن والأماكن المحيطة؟", "Is cleanliness of warehouses and surroundings maintained?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("👷 إجراءات السلامة الصحية للعاملين", "👷 Worker Health & Safety Procedures"), text: t("هل يلتزم العمال بغسل اليدين وارتداء معدات الوقاية (قفازات، قبعات، كمامات)؟", "Do workers comply with hand washing and wear protective equipment (gloves, hats, masks)?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("👷 إجراءات السلامة الصحية للعاملين", "👷 Worker Health & Safety Procedures"), text: t("هل يتم تدريب العاملين على ممارسات السلامة الغذائية؟", "Are workers trained on food safety practices?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🚮 التخلص من النفايات", "🚮 Waste Disposal"), text: t("هل يوجد نظام آمن وفعّال للتخلص من مخلفات اللحوم؟", "Is there a safe and effective system for meat waste disposal?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🚮 التخلص من النفايات", "🚮 Waste Disposal"), text: t("هل يتم منع تراكم النفايات داخل أماكن العمل؟", "Is waste accumulation prevented inside workplaces?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🔧 المعدات والأدوات", "🔧 Equipment and Tools"), text: t("هل المعدات المستخدمة (السكاكين، الماكينات) آمنة ومُصانة؟", "Are equipment used (knives, machines) safe and maintained?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🔧 المعدات والأدوات", "🔧 Equipment and Tools"), text: t("هل يتم تعقيم الأدوات بشكل منتظم؟", "Are tools regularly sanitized?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("📋 توثيق ومراجعة العمليات", "📋 Documentation and Review"), text: t("هل توجد سجلات واضحة لجميع عمليات الفحص والتنظيف والمراقبة؟", "Are clear records maintained for all inspection, cleaning, and monitoring?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("📋 توثيق ومراجعة العمليات", "📋 Documentation and Review"), text: t("هل يتم مراجعة تنفيذ خطة HACCP إذا كانت مطبقة؟", "Is HACCP plan implementation reviewed if applied?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("🚚 مراقبة الموردين", "🚚 Supplier Monitoring"), text: t("هل اللحوم تأتي من موردين معتمدين ومرخصين؟", "Is meat sourced from certified and licensed suppliers?") },
      { type: t("التفتيش الداخلي", "Internal Inspection"), section: t("✅ الامتثال للوائح والأنظمة", "✅ Compliance with Regulations"), text: t("هل الشركة ملتزمة بالمعايير المحلية والدولية (مثل ISO، HACCP، شهادة الحلال)؟", "Is the company compliant with local and international standards (ISO, HACCP, Halal Certification)?") }
    ];
    setQuestions([...baseQuestions, ...stored]);
  }, [language]);

  // تصفية الأسئلة حسب النوع المختار
  const filteredQuestions = questions.filter(q => selectedTypes.includes(q.type));

  // باقي دوال التعامل مع الحالات كما هي (handleChange, handleRiskChange, handleCommentChange, handleImageUpload, handleRemoveImage)

  const handleChange = (key, value) => {
    setAnswers({ ...answers, [key]: value });
    if (value === "yes") {
      const newRisks = { ...risks };
      delete newRisks[key];
      setRisks(newRisks);
    }
  };

  const handleRiskChange = (key, value) => {
    setRisks({ ...risks, [key]: value });
  };

  const handleCommentChange = (key, value) => {
    setComments({ ...comments, [key]: value });
  };

  const handleImageUpload = (key, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const currentImages = images[key] || [];
      setImages({ ...images, [key]: [...currentImages, reader.result] });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (key, index) => {
    const currentImages = images[key] || [];
    const updatedImages = currentImages.filter((_, i) => i !== index);
    setImages({ ...images, [key]: updatedImages });
  };

  const getFinalRating = (percentage) => {
    if (percentage >= 85) return t("مرضي ✅", "Satisfactory ✅");
    if (percentage >= 60) return t("بحاجة لتحسين ⚠️", "Needs Improvement ⚠️");
    return t("غير مرضي ❌", "Unsatisfactory ❌");
  };

  const confirmSave = () => {
    const total = filteredQuestions.length;
    const yesCount = Object.values(answers).filter(ans => ans === "yes").length;
    const percentage = total > 0 ? Math.round((yesCount / total) * 100) : 0;

    const report = {
      date: new Date().toLocaleString(),
      types: selectedTypes,
      branchName,
      visitDate,
      supervisorName,
      finalComment,
      finalRating: getFinalRating(percentage),
      answers,
      comments,
      images,
      risks,
      percentage
    };

    const saved = JSON.parse(localStorage.getItem("reports") || "[]");
    localStorage.setItem("reports", JSON.stringify([...saved, report]));
    alert(t("✅ تم حفظ التقرير بنجاح", "✅ Report saved successfully"));

    setAnswers({});
    setImages({});
    setComments({});
    setRisks({});
    setBranchName("");
    setVisitDate("");
    setSupervisorName("");
    setFinalComment("");
    setSelectedTypes([]);
    setShowConfirm(false);
  };

  const handleSubmit = () => {
    if (filteredQuestions.length === 0) {
      alert(t("يرجى اختيار نوع تفتيش والإجابة على الأسئلة", "Please select inspection type and answer questions"));
      return;
    }
    setShowConfirm(true);
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim() || !newQuestionSection.trim()) {
      alert(t("يرجى كتابة السؤال وتحديد القسم", "Please enter the question and section"));
      return;
    }

    const newQ = {
      type: newQuestionType,
      section: newQuestionSection,
      text: newQuestionText
    };

    const updated = [...(JSON.parse(localStorage.getItem("allQuestions") || "[]")), newQ];
    localStorage.setItem("allQuestions", JSON.stringify(updated));
    setQuestions([...questions, newQ]);
    setNewQuestionText("");
    setNewQuestionSection("");
    setNewQuestionType("ISO 22000");
    alert(t("تمت إضافة السؤال ✅", "Question added ✅"));
  };

  const percentage = filteredQuestions.length > 0
    ? Math.round((Object.values(answers).filter(a => a === "yes").length / filteredQuestions.length) * 100)
    : 0;

  return (
    <div
      style={{
        padding: "2rem",
        direction: language === "ar" ? "rtl" : "ltr",
        fontFamily: language === "ar" ? "Segoe UI, Cairo" : "Arial, sans-serif",
        backgroundColor: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      <div style={{ marginBottom: "1rem", textAlign: language === "ar" ? "left" : "right" }}>
        <label>
          {t("اختر اللغة: ", "Select Language: ")}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            style={{ padding: "4px 8px", fontSize: "1rem" }}
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
      </div>

      <h2>{t("📝 نموذج التفتيش", "📝 Inspection Form")}</h2>

      <div style={{ marginBottom: "2rem" }}>
        {t("🏢 اسم الفرع:", "🏢 Branch Name:")}
        <select
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
          style={inputStyle}
        >
          <option value="">{t("-- اختر الفرع --", "-- Select Branch --")}</option>
          {branchOptions.map((b, i) => (
            <option key={i} value={b}>
              {b}
            </option>
          ))}
        </select>

        {t("📅 تاريخ الزيارة:", "📅 Visit Date:")}
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          style={inputStyle}
        />

        {t("👨‍💼 اسم مشرف الفرع:", "👨‍💼 Supervisor Name:")}
        <input
          value={supervisorName}
          onChange={(e) => setSupervisorName(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ marginBottom: "2rem" }}>
        {t("🗂️ اختر نوع/أنواع التفتيش:", "🗂️ Select Inspection Type(s):")}
        {allTypes.map((type, idx) => (
          <label key={idx} style={{ marginRight: language === "ar" ? "1rem" : "0", marginLeft: language === "en" ? "1rem" : "0" }}>
            <input
              type="checkbox"
              checked={selectedTypes.includes(type)}
              onChange={(e) => {
                const updated = e.target.checked
                  ? [...selectedTypes, type]
                  : selectedTypes.filter((t) => t !== type);
                setSelectedTypes(updated);
              }}
            />{" "}
            {type}
          </label>
        ))}
      </div>

      {filteredQuestions.map((q, idx) => {
        const key = q.text;
        const questionImages = images[key] || [];

        return (
          <div
            key={key}
            style={{
              marginBottom: "1.5rem",
              borderBottom: "1px solid #ccc",
              background: "#fff",
              borderRadius: "8px",
              padding: "1.5rem",
            }}
          >
            <strong>{q.section}</strong>
            <p>{q.text}</p>

            <label>
              <input
                type="radio"
                name={`q${idx}`}
                checked={answers[key] === "yes"}
                onChange={() => handleChange(key, "yes")}
              />{" "}
              {t("نعم", "Yes")}
            </label>

            <label style={{ marginRight: language === "ar" ? "1rem" : "0", marginLeft: language === "en" ? "1rem" : "0" }}>
              <input
                type="radio"
                name={`q${idx}`}
                checked={answers[key] === "no"}
                onChange={() => handleChange(key, "no")}
              />{" "}
              {t("لا", "No")}
            </label>

            <br />

            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(key, e.target.files[0])}
              multiple={false}
              style={{ marginTop: "0.5rem" }}
            />

            <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
              {questionImages.map((imgSrc, i) => (
                <div
                  key={i}
                  style={{
                    position: "relative",
                    width: "80px",
                    height: "80px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={`upload-${i}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <button
                    onClick={() => handleRemoveImage(key, i)}
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      background: "rgba(255,0,0,0.7)",
                      border: "none",
                      borderRadius: "50%",
                      color: "white",
                      width: "20px",
                      height: "20px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      lineHeight: "18px",
                      padding: 0,
                    }}
                    title={t("حذف الصورة", "Remove Image")}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <br />

            <textarea
              placeholder={t("✏️ تعليق (اختياري)", "✏️ Comment (Optional)")}
              value={comments[key] || ""}
              onChange={(e) => handleCommentChange(key, e.target.value)}
              style={inputStyle}
            />

            {answers[key] === "no" && (
              <label style={{ display: "block", marginTop: "10px" }}>
                {t("الخطورة:", "Risk:")}
                <select
                  value={risks[key] || ""}
                  onChange={(e) => handleRiskChange(key, e.target.value)}
                  style={{ ...inputStyle, marginTop: "4px" }}
                >
                  <option value="">{t("-- اختر مستوى الخطورة --", "-- Select risk level --")}</option>
                  <option value={t("قليل", "Low")}>{t("قليل", "Low")}</option>
                  <option value={t("متوسط", "Medium")}>{t("متوسط", "Medium")}</option>
                  <option value={t("عالي", "High")}>{t("عالي", "High")}</option>
                </select>
              </label>
            )}
          </div>
        );
      })}

      {filteredQuestions.length > 0 && (
        <div
          style={{
            background: "#fff",
            padding: "1.5rem",
            marginTop: "2rem",
            borderRadius: "8px",
          }}
        >
          <h4>{t("📉 التقييم النهائي:", "📉 Final Rating:")}</h4>
          <p>
            <strong>{t("النسبة المئوية:", "Percentage:")}</strong> {percentage}%
          </p>
          <p>
            <strong>{t("النتيجة:", "Result:")}</strong> {getFinalRating(percentage)}
          </p>

          <textarea
            placeholder={t("💬 تعليق على التقييم النهائي (اختياري)", "💬 Final rating comment (Optional)")}
            value={finalComment}
            onChange={(e) => setFinalComment(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      <button onClick={handleSubmit} style={submitButtonStyle}>
        {t("💾 حفظ التقرير", "💾 Save Report")}
      </button>

      <hr style={{ margin: "3rem 0" }} />

      <h3>{t("➕ إضافة سؤال جديد", "➕ Add New Question")}</h3>
      <input
        placeholder={t("📝 نص السؤال", "📝 Question Text")}
        value={newQuestionText}
        onChange={(e) => setNewQuestionText(e.target.value)}
        style={inputStyle}
      />
      <input
        placeholder={t("📌 اسم القسم (مثلاً: البنية التحتية)", "📌 Section Name (e.g., Infrastructure)")}
        value={newQuestionSection}
        onChange={(e) => setNewQuestionSection(e.target.value)}
        style={inputStyle}
      />
      <select
        value={newQuestionType}
        onChange={(e) => setNewQuestionType(e.target.value)}
        style={inputStyle}
      >
        {allTypes.map((type, idx) => (
          <option key={idx} value={type}>
            {type}
          </option>
        ))}
      </select>
      <button onClick={handleAddQuestion} style={addButtonStyle}>
        {t("➕ إضافة السؤال", "➕ Add Question")}
      </button>

      {showConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "10px",
              maxWidth: "500px",
              width: "90%",
              textAlign: language === "ar" ? "right" : "left",
              direction: language === "ar" ? "rtl" : "ltr",
            }}
          >
            <h3>{t("تأكيد حفظ التقرير", "Confirm Save Report")}</h3>
            <p>
              <strong>{t("الفرع:", "Branch:")}</strong> {branchName || "-"} <br />
              <strong>{t("تاريخ الزيارة:", "Visit Date:")}</strong> {visitDate || "-"} <br />
              <strong>{t("المشرف:", "Supervisor:")}</strong> {supervisorName || "-"} <br />
              <strong>{t("أنواع التفتيش:", "Inspection Types:")}</strong> {selectedTypes.join(", ") || "-"} <br />
              <strong>{t("عدد الأسئلة:", "Number of Questions:")}</strong> {filteredQuestions.length} <br />
              <strong>{t('نسبة الإجابات "نعم":', 'Percentage of "Yes" Answers:')}</strong> {percentage}% <br />
              <strong>{t("النتيجة النهائية:", "Final Result:")}</strong> {getFinalRating(percentage)}
            </p>
            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#ccc",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {t("إلغاء", "Cancel")}
              </button>
              <button
                onClick={confirmSave}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                {t("تأكيد الحفظ", "Confirm Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "6px",
  border: "1px solid #ccc",
};

const submitButtonStyle = {
  marginTop: "2rem",
  background: "#28a745",
  color: "white",
  padding: "12px 24px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

const addButtonStyle = {
  background: "#007bff",
  color: "white",
  padding: "12px 24px",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};
