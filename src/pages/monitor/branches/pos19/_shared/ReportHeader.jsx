// src/pages/monitor/branches/pos19/_shared/ReportHeader.jsx
// Shared header component for POS 19 input forms
// Usage: <ReportHeader title="..." subtitle="..." titleAr="..." fields={[...]} />

import React, { useEffect, useRef } from "react";

/**
 * ReportHeader — shared gradient banner + grid of fields
 *
 * Props:
 *  - title       (string)          — main English title
 *  - subtitle    (string, opt)     — smaller text under title (e.g. Restaurant)
 *  - titleAr     (string, opt)     — Arabic subtitle shown on the right
 *  - fields      (array, required) — list of header fields to render in grid
 *
 * Each field in `fields` is an object:
 *  - label   (string)   — label shown above the cell
 *  - value   (any)      — current value
 *  - onChange(fn, opt)  — if provided, renders an input; if omitted, renders read-only
 *  - type    (string, opt) — "date" | "text" (default "text")
 *  - placeholder (string, opt)
 *  - note    (object, opt) — { text, tone } status line under the cell.
 *                            tone: "ok" | "blocked" | "edit" | "warn" | "muted"
 *
 * Layout: auto 5 columns on desktop, responsive below.
 */

const NOTE_TONES = {
  ok:      { color: "#166534", background: "#dcfce7", border: "#bbf7d0" },
  blocked: { color: "#991b1b", background: "#fee2e2", border: "#fecaca" },
  edit:    { color: "#92400e", background: "#fef3c7", border: "#fde68a" },
  warn:    { color: "#9a3412", background: "#ffedd5", border: "#fed7aa" },
  muted:   { color: "#475569", background: "#f1f5f9", border: "#e2e8f0" },
};

const FIELD_AR = {
  "Document Title": "عنوان المستند",
  "Document No": "رقم المستند",
  "Issue Date": "تاريخ الإصدار",
  "Revision No": "رقم المراجعة",
  Branch: "الفرع",
  Area: "المنطقة",
  "Issued By": "أصدر بواسطة",
  "Controlling Officer": "المسؤول الرقابي",
  "Approved By": "اعتماد",
  "Report Date": "تاريخ التقرير",
  "Form Ref": "مرجع النموذج",
  Classification: "التصنيف",
  Section: "القسم",
  "Checked By": "تم الفحص بواسطة",
  "Verified By": "تحقق بواسطة",
  "Prepared By": "أعد بواسطة",
};

const TITLE_AR = {
  "Blast Freezer / Chiller Monitoring Log (CCP)": "سجل مراقبة التجميد / التبريد السريع (نقطة تحكم حرجة)",
  "Blast Freezer / Chiller Log (CCP)": "سجل التجميد / التبريد السريع (نقطة تحكم حرجة)",
  "Cleaning Programme Schedule": "جدول برنامج التنظيف",
  "Thermometer Calibration Log": "سجل معايرة موازين الحرارة",
  "Cooking Record — Cooking Temperature Monitoring Record": "سجل الطبخ - سجل مراقبة درجة حرارة الطبخ",
  "Cooking Temperature Monitoring Record": "سجل مراقبة درجة حرارة الطبخ",
  "Cooling Temperature Log": "سجل تبريد الطعام المطهي",
  "Daily Cleaning Checklist (Butchery)": "قائمة التحقق من التنظيف اليومي (الملحمة)",
  "Defrosting Record": "سجل إذابة التجميد",
  "Dry Store — Temp & Humidity Monitoring Record": "سجل مراقبة درجة حرارة ورطوبة المخزن الجاف",
  "Dry Store Temp & Humidity": "سجل درجة حرارة ورطوبة المخزن الجاف",
  "Equipment Inspection & Sanitizing Log": "سجل فحص وتعقيم المعدات",
  "Equipment Inspection and Sanitizing Log": "سجل فحص وتعقيم المعدات",
  "Finished Product Monitoring Checklist": "قائمة متابعة المنتج النهائي",
  "Food Temperature Verification Log": "سجل التحقق من درجات حرارة الطعام",
  "Glass Items Condition Monitoring Checklist (Weekly)": "قائمة مراقبة حالة الأدوات الزجاجية (أسبوعي)",
  "Glass Items Condition Monitoring Checklist": "قائمة مراقبة حالة الأدوات الزجاجية",
  "Hot Holding Temperature Monitoring Log Sheet": "سجل مراقبة حرارة الحفظ الساخن",
  "Oil Quality Monitoring Form": "نموذج مراقبة جودة الزيت",
  "Personal Hygiene Checklist": "قائمة التحقق من النظافة الشخصية",
  "Non-Conformance Report": "تقرير عدم المطابقة",
  "Receiving Log": "سجل الاستلام",
  "Receiving Log (Butchery)": "سجل الاستلام (الملحمة)",
  "Reheating Temperature Log": "سجل إعادة تسخين الطعام",
  "Sanitizer Concentration Verification Log": "سجل التحقق من تركيز المطهر",
  "Temperature Monitoring Log": "سجل مراقبة درجات الحرارة",
  "Traceability Log": "سجل التتبع",
  "Wooden Items Condition Monitoring Checklist": "قائمة مراقبة حالة الأدوات الخشبية",
  "Wooden Items Condition Monitoring Checklist (Weekly)": "قائمة مراقبة حالة الأدوات الخشبية (أسبوعي)",
  "Sanitation Record (CCP)": "سجل التعقيم (نقطة تحكم حرجة)",
  "Sanitation Record (CCP) – Veg/Fruits": "سجل تعقيم الخضروات والفواكه (نقطة تحكم حرجة)",
};

const TERM_AR = {
  "#": "رقم",
  Action: "إجراء",
  Actions: "إجراءات",
  SL: "رقم",
  "SL NO": "رقم",
  Date: "التاريخ",
  Time: "الوقت",
  "Temp (°C)": "درجة الحرارة (°م)",
  "Temp °C": "درجة الحرارة °م",
  "Start Temp (°C)": "حرارة البداية (°م)",
  "End Temp (°C)": "حرارة النهاية (°م)",
  "Cabinet Temp (°C)": "حرارة الجهاز (°م)",
  "Vehicle Temp (°C)": "حرارة المركبة (°م)",
  "Food Temp (°C)": "حرارة الطعام (°م)",
  "Actual Temp (°C)": "الحرارة الفعلية (°م)",
  "Humidity (%)": "الرطوبة (%)",
  "°C": "درجة مئوية",
  "Product Name": "اسم المنتج",
  "Customer Name": "اسم العميل",
  Product: "المنتج",
  "Food Item": "الصنف الغذائي",
  "Process Type": "نوع العملية",
  "Batch No": "رقم التشغيلة",
  "Batch / Lot ID": "رقم التشغيلة / الدفعة",
  "Cycle Type": "نوع الدورة",
  Quantity: "الكمية",
  "Total (min)": "الإجمالي (دقيقة)",
  "Equipment ID": "رقم المعدة",
  "CCP Met": "تم تحقيق الحد الحرج",
  Operator: "المشغل",
  "Item/Area\nto Clean": "العنصر / المنطقة للتنظيف",
  "Item/Area to Clean": "العنصر / المنطقة للتنظيف",
  "Equipment / Chemical": "المعدة / المادة الكيميائية",
  "Cleaning Method": "طريقة التنظيف",
  "Frequency &\nProposed Date\nW1 • W2 • W3 • W4": "التكرار والتاريخ المقترح",
  "Frequency & Proposed Date W1 • W2 • W3 • W4": "التكرار والتاريخ المقترح",
  "Date of\nCleaning": "تاريخ التنظيف",
  "Date of Cleaning": "تاريخ التنظيف",
  "Cleaned\nBy": "تم التنظيف بواسطة",
  "Cleaned By": "تم التنظيف بواسطة",
  "Monitored\nBy": "تمت المراقبة بواسطة",
  "Monitored By": "تمت المراقبة بواسطة",
  Comment: "تعليق",
  "Corrective Action": "الإجراء التصحيحي",
  "Corrective\nAction": "الإجراء التصحيحي",
  "Corrective Action\n(if any)": "الإجراء التصحيحي إن وجد",
  "Corrective Action (if any)": "الإجراء التصحيحي إن وجد",
  "Checked\nby": "تم الفحص بواسطة",
  "Checked by": "تم الفحص بواسطة",
  "Checked by:": "تم الفحص بواسطة",
  "Verified By": "تحقق بواسطة",
  "Verified By / Signature": "تحقق بواسطة / التوقيع",
  "Verified by": "تحقق بواسطة",
  Remarks: "ملاحظات",
  "Remarks (if any)": "ملاحظات إن وجدت",
  "Remarks / CA": "ملاحظات / إجراء تصحيحي",
  "Received by": "تم الاستلام بواسطة",
  Supplier: "المورد",
  "Supplier Name": "اسم المورد",
  "Name of the Supplier": "اسم المورد",
  Item: "الصنف",
  "Item Name": "اسم الصنف",
  "Raw Material Details": "تفاصيل المادة الخام",
  "Inputs (Raw Materials)": "المدخلات (مواد خام)",
  "Outputs (Final Products)": "المخرجات (منتجات نهائية)",
  "Final Product": "المنتج النهائي",
  "RM / Product Details": "تفاصيل المادة الخام / المنتج",
  "Quantity Sanitized": "الكمية المعقمة",
  "Contact Time": "زمن التلامس",
  "Conc. of Peratek (ppm)": "تركيز بيراتيك (جزء بالمليون)",
  "Sanitizer\nType": "نوع المطهر",
  "Sanitizer Type": "نوع المطهر",
  "Location /\nArea": "الموقع / المنطقة",
  "Location / Area": "الموقع / المنطقة",
  "Target\nConc. (ppm)": "التركيز المستهدف (ppm)",
  "Target Conc. (ppm)": "التركيز المستهدف (ppm)",
  "Actual\nConc. (ppm)": "التركيز الفعلي (ppm)",
  "Actual Conc. (ppm)": "التركيز الفعلي (ppm)",
  "Result\n(Pass/Fail)": "النتيجة (نجاح/فشل)",
  "Result (Pass/Fail)": "النتيجة (نجاح/فشل)",
  Result: "النتيجة",
  "Equipment /\nLocation": "المعدة / الموقع",
  "Equipment / Location": "المعدة / الموقع",
  "Equipment's": "المعدات",
  Equipment: "المعدات",
  "Unit\nType": "نوع الوحدة",
  "Unit Type": "نوع الوحدة",
  "Target\nTemp": "درجة الحرارة المستهدفة",
  "Target Temp": "درجة الحرارة المستهدفة",
  "Wooden Item": "الأداة الخشبية",
  "Glass Item": "الأداة الزجاجية",
  "Staff Name": "اسم الموظف",
  Section: "القسم",
  Appearance: "المظهر",
  Firmness: "القوام",
  Smell: "الرائحة",
  "Vehicle clean": "نظافة المركبة",
  "Food handler hygiene": "نظافة متداول الغذاء",
  "Packaging of food is good and undamaged, clean and no signs of pest infestation": "تغليف الغذاء جيد وغير تالف ونظيف ولا توجد علامات آفات",
  "Country of origin": "بلد المنشأ",
  "Production Date": "تاريخ الإنتاج",
  "Expiry Date": "تاريخ الانتهاء",
  "Exp Date": "تاريخ الانتهاء",
  "Invoice No:": "رقم الفاتورة",
  "Thermometer ID": "رقم ميزان الحرارة",
  Type: "النوع",
  "Test Method": "طريقة الاختبار",
  "Ref. °C": "درجة المرجع °م",
  "Reading °C": "القراءة °م",
  Status: "الحالة",
  "Calibrated by": "تمت المعايرة بواسطة",
  "Next Due": "موعد المعايرة القادم",
  "Start Time": "وقت البداية",
  "Initial °C": "درجة البداية °م",
  "End Time": "وقت النهاية",
  "Final °C": "درجة النهاية °م",
  Destination: "الوجهة",
  Method: "الطريقة",
  "Reading 1": "القراءة 1",
  "Reading 2": "القراءة 2",
  "Reading 3": "القراءة 3",
  "Reading 4": "القراءة 4",
  Morning: "الصباح",
  Midday: "منتصف اليوم",
  Evening: "المساء",
  "8:00 AM": "8:00 صباحًا",
  "2:00 PM": "2:00 مساءً",
  "Cooked (≥60°C)": "بعد الطبخ (≥60°م)",
  "2h Check (≤21°C)": "فحص ساعتين (≤21°م)",
  "6h Check (≤5°C)": "فحص 6 ساعات (≤5°م)",
  "Defrost START": "بداية إذابة التجميد",
  "Defrost END": "نهاية إذابة التجميد",
  Qty: "الكمية",
  Brand: "العلامة",
  "Prod. Date": "تاريخ الإنتاج",
  "Exp. Date": "تاريخ الانتهاء",
  "Chiller °C": "حرارة الثلاجة °م",
  "Items Stacked on Shelves": "الأصناف مرتبة على الرفوف",
  "Proper Labelling": "بطاقات تعريف صحيحة",
  Clean: "نظيف",
  "Overall Condition": "الحالة العامة",
  "Evaluation Results": "نتائج التقييم",
  "Free from damage (yes/no)": "خالٍ من التلف (نعم/لا)",
  "Free from broken metal/plastic (yes/no)": "خالٍ من معدن/بلاستيك مكسور (نعم/لا)",
  "Free from broken metal / plastic (yes/no)": "خالٍ من معدن/بلاستيك مكسور (نعم/لا)",
  "Free from splinters / cracks": "خالٍ من الشظايا / الشقوق",
  "No discolouration / mould": "لا يوجد تغير لون / عفن",
  "Visibly clean and dry": "نظيف وجاف ظاهريًا",
  "Structurally sound": "سليم من الناحية الهيكلية",
  "In good repair and condition": "بحالة جيدة وسليم",
  "No signs of glass breakage": "لا توجد علامات كسر زجاج",
  "Clean Uniform": "زي نظيف",
  "Clean Shoes": "أحذية نظيفة",
  "Hand washing and wearing disposable gloves when handling high risk food": "غسل اليدين وارتداء قفازات عند التعامل مع غذاء عالي الخطورة",
  "Hair is short and clean covered": "الشعر قصير ونظيف ومغطى",
  "Fingernail is clean and short": "الأظافر نظيفة وقصيرة",
  "Mustache/ beard properly shaved": "الشارب/اللحية محلوقة أو مرتبة بشكل صحيح",
  "Mustache / beard properly shaved": "الشارب/اللحية محلوقة أو مرتبة بشكل صحيح",
  "No Jewelry": "بدون مجوهرات",
  "No Illness, No Septic Cuts, No Skin Infection": "لا يوجد مرض أو جروح ملتهبة أو عدوى جلدية",
};

const GUIDANCE = {
  "Blast Freezer / Chiller Monitoring Log (CCP)": [
    ["Cool hot food rapidly: use shallow pans and do not overload the blast chiller.", "برّد الطعام الساخن بسرعة باستخدام أوعية قليلة العمق وتجنب تحميل جهاز التبريد أكثر من اللازم."],
    ["Target: reduce cooked food to ≤5°C within 6 hours unless the site procedure is stricter.", "الهدف: خفض الطعام المطهي إلى ≤5°م خلال 6 ساعات ما لم يكن إجراء الموقع أشد."],
    ["If the limit fails, re-blast, segregate, or discard the lot and record the corrective action.", "إذا فشل الحد، أعد التبريد السريع أو اعزل الدفعة أو أتلفها وسجل الإجراء التصحيحي."],
  ],
  "Cleaning Programme Schedule": [
    ["Complete cleaning on the proposed week/date and record the actual cleaning date.", "نفّذ التنظيف حسب الأسبوع/التاريخ المقترح وسجل تاريخ التنظيف الفعلي."],
    ["Use only approved chemicals at the approved dilution and contact time.", "استخدم فقط المواد الكيميائية المعتمدة وبنسبة التخفيف وزمن التلامس المعتمدين."],
    ["Any missed or unsatisfactory cleaning must be repeated and monitored again.", "أي تنظيف فائت أو غير مرضي يجب إعادته ومراقبته مرة أخرى."],
  ],
  "Thermometer Calibration Log": [
    ["Ice-point target is 0°C and boiling-point target is about 100°C, adjusted for site procedure.", "هدف نقطة الثلج 0°م وهدف الغليان حوالي 100°م حسب إجراء الموقع."],
    ["Accept only readings within the approved tolerance, normally ±1°C unless your SOP says otherwise.", "اقبل القراءات ضمن السماحية المعتمدة، عادة ±1°م ما لم ينص الإجراء على غير ذلك."],
    ["Tag, repair, or replace any failed thermometer before use.", "ضع علامة على أي ميزان حرارة فاشل أو أصلحه أو استبدله قبل الاستخدام."],
  ],
  "Cooking Record — Cooking Temperature Monitoring Record": [
    ["Critical limit: core temperature ≥75°C for at least 15 seconds; poultry/minced meat may require ≥82°C by site SOP.", "الحد الحرج: حرارة القلب ≥75°م لمدة 15 ثانية على الأقل؛ وقد تتطلب الدواجن/اللحم المفروم ≥82°م حسب إجراء الموقع."],
    ["Measure at the thickest part with a cleaned and calibrated probe thermometer.", "قس في أسمك جزء باستخدام مسبار نظيف ومعاير."],
    ["If below limit, continue cooking and re-check before release.", "إذا كانت القراءة أقل من الحد، استمر في الطبخ وأعد الفحص قبل السماح بالتداول."],
  ],
  "Cooling Temperature Log": [
    ["Cool cooked food from ≥60°C to ≤21°C within 2 hours, then to ≤5°C within 6 hours.", "برّد الطعام المطهي من ≥60°م إلى ≤21°م خلال ساعتين، ثم إلى ≤5°م خلال 6 ساعات."],
    ["Use shallow containers, leave space for air flow, and label the batch.", "استخدم أوعية قليلة العمق واترك مساحة لحركة الهواء وضع بطاقة تعريف للدفعة."],
    ["If a checkpoint fails, reheat/re-cool only if allowed by SOP or discard and record action.", "إذا فشل أحد الفحوص، أعد التسخين/التبريد فقط إذا سمح الإجراء أو أتلف الدفعة وسجل الإجراء."],
  ],
  "Daily Cleaning Checklist (Butchery)": [
    ["Use √ only when the area is visibly clean, sanitized, dry, and ready for use.", "استخدم √ فقط عندما تكون المنطقة نظيفة ظاهريًا ومعقمة وجافة وجاهزة للاستخدام."],
    ["Use ✗ for any residue, odor, pest sign, damaged surface, or missing chemical step.", "استخدم ✗ عند وجود بقايا أو رائحة أو أثر آفات أو سطح تالف أو خطوة كيميائية ناقصة."],
    ["Any ✗ requires immediate corrective action and re-check.", "أي ✗ يتطلب إجراء تصحيحي فوري وإعادة فحص."],
  ],
  "Defrosting Record": [
    ["Defrost under refrigeration at ≤5°C, never at room temperature.", "تتم إذابة التجميد داخل الثلاجة عند ≤5°م وليس في درجة حرارة الغرفة."],
    ["Keep raw food covered, segregated, and below ready-to-eat food.", "احفظ الطعام الخام مغطى ومعزولًا وأسفل الأطعمة الجاهزة للأكل."],
    ["If product temperature exceeds the limit or time is uncontrolled, escalate and record disposition.", "إذا تجاوزت حرارة المنتج الحد أو كان الوقت غير مضبوط، صعّد الحالة وسجل مصير الدفعة."],
  ],
  "Dry Store — Temp & Humidity Monitoring Record": [
    ["Typical dry store target: 18-25°C and ≤60% RH unless the product label/SOP requires otherwise.", "الهدف المعتاد للمخزن الجاف: 18-25°م ورطوبة ≤60% ما لم يطلب ملصق المنتج/الإجراء غير ذلك."],
    ["Keep food off the floor, sealed, labelled, and away from chemicals.", "احفظ الغذاء بعيدًا عن الأرض، مغلقًا، معلّمًا، وبعيدًا عن المواد الكيميائية."],
    ["Record corrective action for high humidity, pest signs, leakage, or damaged packaging.", "سجل الإجراء التصحيحي عند ارتفاع الرطوبة أو وجود آفات أو تسريب أو تلف عبوات."],
  ],
  "Equipment Inspection & Sanitizing Log": [
    ["Equipment must be clean, sanitized, assembled correctly, and free from damage before use.", "يجب أن تكون المعدات نظيفة ومعقمة ومركبة بشكل صحيح وخالية من التلف قبل الاستخدام."],
    ["Use approved sanitizer at the approved concentration and contact time.", "استخدم المطهر المعتمد بالتركيز وزمن التلامس المعتمدين."],
    ["Any No/✗ requires corrective action before production starts.", "أي No/✗ يتطلب إجراء تصحيحي قبل بدء الإنتاج."],
  ],
  "Finished Product Monitoring Checklist": [
    ["Check product appearance, odor, temperature, label, packing integrity, and expiry before release.", "افحص المظهر والرائحة والحرارة والبطاقة وسلامة التغليف والصلاحية قبل الإفراج."],
    ["Hold chilled products at ≤5°C and hot products at ≥60°C.", "احفظ المنتجات المبردة عند ≤5°م والساخنة عند ≥60°م."],
    ["Any nonconforming product must be held and disposition recorded.", "أي منتج غير مطابق يجب حجزه وتسجيل الإجراء المتخذ."],
  ],
  "Food Temperature Verification Log": [
    ["Cold food must be ≤5°C and hot food must be ≥60°C at verification.", "يجب أن يكون الطعام البارد ≤5°م والطعام الساخن ≥60°م عند التحقق."],
    ["Use a sanitized calibrated probe and avoid cross-contamination.", "استخدم مسبارًا نظيفًا ومعايرًا وتجنب التلوث التبادلي."],
    ["Out-of-limit food requires immediate correction and a recorded action.", "أي طعام خارج الحد يتطلب تصحيحًا فوريًا وتسجيل الإجراء."],
  ],
  "Glass Items Condition Monitoring Checklist (Weekly)": [
    ["Check for cracks, chips, loose parts, and missing glass before use.", "افحص وجود شروخ أو كسور أو أجزاء مفكوكة أو زجاج مفقود قبل الاستخدام."],
    ["Remove damaged glass items immediately from production areas.", "أزل الأدوات الزجاجية التالفة فورًا من مناطق الإنتاج."],
    ["If breakage occurs, stop work, segregate product, clean, and document corrective action.", "عند حدوث كسر، أوقف العمل واعزل المنتج ونظف وسجل الإجراء التصحيحي."],
  ],
  "Hot Holding Temperature Monitoring Log Sheet": [
    ["Hot held food must be maintained at ≥60°C at all times.", "يجب الحفاظ على الطعام في الحفظ الساخن عند ≥60°م طوال الوقت."],
    ["Check temperature at least once per shift or as required by SOP.", "افحص الحرارة مرة واحدة على الأقل في كل وردية أو حسب إجراء الموقع."],
    ["If below 60°C, reheat to ≥75°C if safe and allowed, or discard.", "إذا انخفضت عن 60°م، أعد التسخين إلى ≥75°م إذا كان آمنًا ومسموحًا أو أتلف المنتج."],
  ],
  "Oil Quality Monitoring Form": [
    ["Check oil color, odor, foaming, debris, and TPM/FFA reading where applicable.", "افحص لون الزيت ورائحته والرغوة والشوائب وقراءة TPM/FFA عند التطبيق."],
    ["Change oil when the reading reaches the site limit or quality is unacceptable.", "غيّر الزيت عند بلوغ حد الموقع أو عندما تكون الجودة غير مقبولة."],
    ["Filter oil and remove food debris regularly to prevent quality deterioration.", "رشح الزيت وأزل بقايا الطعام بانتظام لمنع تدهور الجودة."],
  ],
  "Personal Hygiene Checklist": [
    ["Food handlers must have clean uniform, hair restraint, short nails, and no jewelry.", "يجب أن يرتدي العاملون زيًا نظيفًا وغطاء شعر وأظافر قصيرة وبدون مجوهرات."],
    ["Exclude or report staff with vomiting, diarrhea, fever, open wounds, or infection symptoms.", "استبعد أو بلّغ عن أي موظف لديه قيء أو إسهال أو حمى أو جروح مفتوحة أو أعراض عدوى."],
    ["Any ✗ requires immediate correction before handling food.", "أي ✗ يتطلب تصحيحًا فوريًا قبل التعامل مع الطعام."],
  ],
  "Receiving Log (Butchery)": [
    ["Reject chilled meat above ≤5°C, frozen items warmer than -18°C, damaged packs, or expired items.", "ارفض اللحوم المبردة فوق ≤5°م، والمجمدات الأعلى من -18°م، والعبوات التالفة أو المنتهية."],
    ["Verify supplier, invoice, country of origin, production date, and expiry date.", "تحقق من المورد والفاتورة وبلد المنشأ وتاريخ الإنتاج والانتهاء."],
    ["Record all deviations and corrective actions before accepting the delivery.", "سجل كل الانحرافات والإجراءات التصحيحية قبل قبول الاستلام."],
  ],
  "Reheating Temperature Log": [
    ["Reheat food rapidly to core temperature ≥75°C within 2 hours.", "أعد تسخين الطعام بسرعة إلى حرارة قلب ≥75°م خلال ساعتين."],
    ["Do not reheat food more than once unless the approved SOP allows it.", "لا تعيد تسخين الطعام أكثر من مرة إلا إذا سمح الإجراء المعتمد."],
    ["Move reheated food immediately to service or hot holding at ≥60°C.", "انقل الطعام المعاد تسخينه فورًا إلى الخدمة أو الحفظ الساخن عند ≥60°م."],
  ],
  "Sanitizer Concentration Verification Log": [
    ["Verify sanitizer concentration before use and whenever solution is changed.", "تحقق من تركيز المطهر قبل الاستخدام وعند تغيير المحلول."],
    ["Follow the chemical label/SOP target ppm and contact time; record actual ppm.", "اتبع تركيز ppm وزمن التلامس حسب ملصق المادة/إجراء الموقع وسجل القراءة الفعلية."],
    ["Fail results require replacing or correcting the solution and re-testing.", "نتيجة الفشل تتطلب تغيير المحلول أو تصحيحه وإعادة الفحص."],
  ],
  "Temperature Monitoring Log": [
    ["Chillers should be ≤5°C and freezers should be ≤-18°C unless product/SOP requires otherwise.", "الثلاجات يجب أن تكون ≤5°م والمجمدات ≤-18°م ما لم يتطلب المنتج/الإجراء غير ذلك."],
    ["Record time and temperature for every scheduled check.", "سجل الوقت ودرجة الحرارة لكل فحص مجدول."],
    ["Out-of-limit equipment requires corrective action and product assessment.", "أي جهاز خارج الحد يتطلب إجراء تصحيحي وتقييم المنتج."],
  ],
  "Wooden Items Condition Monitoring Checklist (Weekly)": [
    ["Wooden items must be smooth, intact, clean, dry, and free from splinters.", "يجب أن تكون الأدوات الخشبية ملساء وسليمة ونظيفة وجافة وخالية من الشظايا."],
    ["Remove cracked, moldy, or damaged wooden items from food areas.", "أزل الأدوات الخشبية المشققة أو المتعفنة أو التالفة من مناطق الغذاء."],
    ["Record corrective action for any unacceptable condition.", "سجل الإجراء التصحيحي لأي حالة غير مقبولة."],
  ],
  "Sanitation Record (CCP)": [
    ["Use the approved sanitizer concentration and contact time for fruits and vegetables.", "استخدم تركيز المطهر وزمن التلامس المعتمدين للخضار والفواكه."],
    ["Rinse/drain according to SOP and prevent re-contamination after sanitation.", "اشطف/صفِّ حسب الإجراء وامنع إعادة التلوث بعد التعقيم."],
    ["Any deviation requires re-sanitizing and a recorded corrective action.", "أي انحراف يتطلب إعادة التعقيم وتسجيل الإجراء التصحيحي."],
  ],
  "Traceability Log": [
    ["Record one clear Batch / Lot ID that links every raw material input to each final product output.", "سجل رقم تشغيلة / دفعة واضح يربط كل مادة خام بكل منتج نهائي."],
    ["Verify production, opening, best-before, and expiry dates before saving the batch.", "تحقق من تواريخ الإنتاج والفتح والأفضل قبل والانتهاء قبل حفظ الدفعة."],
    ["If any traceability link is missing, hold the product until the link is confirmed or disposition is recorded.", "إذا كان أي رابط تتبع مفقودًا، احجز المنتج حتى يتم تأكيد الرابط أو تسجيل مصير المنتج."],
  ],
};

const normalizeTerm = (value) =>
  String(value || "")
    .replace(/\s*ⓘ/g, "")
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ")
    .trim();

function getArabicTerm(value) {
  const raw = String(value || "").trim();
  if (!raw || /[\u0600-\u06FF]/.test(raw)) return "";
  return TERM_AR[raw] || TERM_AR[normalizeTerm(raw)] || "";
}

function BilingualGuidance({ title }) {
  const notes = GUIDANCE[title] || [];
  if (!notes.length) return null;
  return (
    <div style={{
      display: "grid", gap: 6, margin: "-2px 0 14px",
      padding: "10px 12px", borderRadius: 8,
      border: "1px solid #fed7aa", background: "#fff7ed",
      color: "#7c2d12", fontSize: 12, lineHeight: 1.45,
    }}>
      <div style={{ fontWeight: 800 }}>Operational guidance / ملاحظات تشغيلية</div>
      {notes.map(([en, ar], i) => (
        <div key={i} style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "4px 18px",
          paddingTop: i ? 6 : 2,
          borderTop: i ? "1px solid #fed7aa" : "none",
        }}>
          <div>{en}</div>
          <div style={{ direction: "rtl", textAlign: "right", fontWeight: 700 }}>{ar}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReportHeader({
  title,
  subtitle,
  titleAr,
  fields = [],
}) {
  const rootRef = useRef(null);
  const resolvedTitleAr = titleAr || TITLE_AR[title] || "";

  useEffect(() => {
    const root = rootRef.current?.parentElement;
    if (!root) return;
    root.classList.add("pos19-bilingual-scope");
    const cells = root.querySelectorAll("th, label, strong");
    cells.forEach((el) => {
      const ar = getArabicTerm(el.textContent);
      if (ar) el.setAttribute("data-ar", ar);
    });
  });

  const headerCell = {
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 8, padding: "8px 10px",
    display: "flex", flexDirection: "column", gap: 4,
  };
  const headerLabel = {
    fontSize: 10, fontWeight: 700, color: "#2563eb",
    textTransform: "uppercase", letterSpacing: ".05em",
  };
  const headerValueStatic = {
    fontSize: 13, fontWeight: 700, color: "#0b1f4d",
    background: "#fff", border: "1px solid #1f3b70",
    borderRadius: 4, padding: "4px 6px", minHeight: 24,
  };
  const headerInput = {
    fontSize: 13, fontWeight: 600, color: "#0b1f4d",
    background: "#fff", border: "1px solid #1f3b70",
    borderRadius: 4, padding: "4px 6px", width: "100%",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <>
      <style>{`
        .pos19-bilingual-scope th[data-ar]::after,
        .pos19-bilingual-scope label[data-ar]::after,
        .pos19-bilingual-scope strong[data-ar]::after {
          content: attr(data-ar);
          display: block;
          margin-top: 2px;
          direction: rtl;
          font-size: 11px;
          line-height: 1.25;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0;
          text-transform: none;
          white-space: normal;
        }
      `}</style>
      {/* Gradient banner */}
      <div ref={rootRef} style={{
        marginBottom: 14, padding: "12px 14px",
        background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
        borderRadius: 10, color: "#fff",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 8,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
            {subtitle ? (
              <div style={{ fontSize: 12, color: "#cbd5e1", marginTop: 3 }}>{subtitle}</div>
            ) : null}
          </div>
          {resolvedTitleAr ? (
            <div style={{
              fontSize: 13, color: "#fef3c7",
              direction: "rtl", fontWeight: 600,
            }}>
              {resolvedTitleAr}
            </div>
          ) : null}
        </div>
      </div>

      {/* Fields grid */}
      {fields.length ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 10, marginBottom: 14, fontSize: 12,
        }}>
          {fields.map((f, i) => {
            const tone = f.note ? NOTE_TONES[f.note.tone] || NOTE_TONES.muted : null;
            const fieldAr = f.labelAr || FIELD_AR[f.label] || "";
            return (
              <div key={i} style={headerCell}>
                <div style={headerLabel}>
                  <div>{f.label}</div>
                  {fieldAr ? (
                    <div style={{ direction: "rtl", textTransform: "none", letterSpacing: 0, color: "#1d4ed8" }}>
                      {fieldAr}
                    </div>
                  ) : null}
                </div>
                {typeof f.onChange === "function" ? (
                  <input
                    type={f.type || "text"}
                    value={f.value ?? ""}
                    onChange={(e) => f.onChange(e.target.value)}
                    placeholder={f.placeholder || ""}
                    style={headerInput}
                  />
                ) : (
                  <div style={headerValueStatic}>{f.value || "—"}</div>
                )}
                {f.note ? (
                  <div
                    style={{
                      marginTop: 2, padding: "3px 6px", borderRadius: 4,
                      fontSize: 10.5, fontWeight: 700, lineHeight: 1.4,
                      direction: "rtl", textAlign: "right",
                      color: tone.color, background: tone.background,
                      border: `1px solid ${tone.border}`,
                    }}
                  >
                    {f.note.text}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      <BilingualGuidance title={title} />
    </>
  );
}

export { BilingualGuidance, FIELD_AR, TITLE_AR, TERM_AR };
