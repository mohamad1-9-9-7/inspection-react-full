// src/pages/monitor/branches/sweets/bilingual.jsx
//
// Combined English + Arabic labels for every sweets INPUT page.
//
//   <Bi en="Date" />            → "Date  التاريخ"  (Arabic smaller, muted, RTL-isolated)
//   <Bi en="Date" stack />      → English over Arabic — for table headers, so a
//                                 column never gets wider than its English label
//   bi("Yes")                   → "Yes · نعم"  — plain string for <option>,
//                                 placeholder, title, alert
//
// Only the LABEL is bilingual. Stored values (select values, report fields)
// stay exactly as they were, so old records, checks and exports are untouched.
//
// The Arabic comes from the AR dictionary below (keyed by the English text), so
// one entry serves every page; pass `ar` to override a single place. A label
// with no entry renders English only — nothing breaks, it just isn't twinned.
//
// globals.css forces `#root * { font-size:14px !important }` (12px in tables);
// the Arabic line escapes it with a doubled class (see project memory).

import React from "react";

export const AR = {
  /* ── common form words ── */
  "Date": "التاريخ", "Date *": "التاريخ *", "Time": "الوقت", "Day": "اليوم", "Shift": "الوردية",
  "Morning": "صباحي", "Evening": "مسائي", "Night": "ليلي", "Noon": "الظهر",
  "Checked By": "فحص بواسطة", "Verified By": "اعتمد بواسطة", "Verified By (QA)": "اعتمد بواسطة (الجودة)",
  "Reviewed By": "راجع بواسطة", "Approved By": "اعتمد بواسطة", "Prepared By": "أعدّ بواسطة", "Inspected By": "فحص بواسطة",
  "Remarks": "ملاحظات", "Notes": "ملاحظات", "Comments": "تعليقات", "Comment": "تعليق", "Description": "الوصف",
  "Name": "الاسم", "Employee": "الموظف", "Employee Name": "اسم الموظف", "Employee No.": "الرقم الوظيفي", "Emp. No.": "الرقم الوظيفي",
  "Position": "الوظيفة", "Designation": "المسمى الوظيفي", "Department": "القسم", "Company": "الشركة", "Nationality": "الجنسية",
  "Signature": "التوقيع", "Sign": "التوقيع", "Status": "الحالة", "Action": "الإجراء", "Actions": "الإجراءات",
  "Corrective Action": "الإجراء التصحيحي", "Corrective Action Taken": "الإجراء التصحيحي المتخذ", "Preventive Action": "الإجراء الوقائي",
  "Root Cause": "السبب الجذري", "Responsible": "المسؤول", "Responsible Person": "الشخص المسؤول", "Target Date": "التاريخ المستهدف",
  "Area": "المنطقة", "Location": "الموقع", "Section": "القسم", "Branch": "الفرع", "Category": "الفئة", "Type": "النوع",
  "Reference": "المرجع", "Reference No.": "الرقم المرجعي", "Report No.": "رقم التقرير", "Document No.": "رقم الوثيقة",
  "Issue Date": "تاريخ الإصدار", "Revision No.": "رقم المراجعة", "Revision": "المراجعة", "Page": "الصفحة",
  "Yes": "نعم", "No": "لا", "N/A": "لا ينطبق", "OK": "سليم", "Not OK": "غير سليم", "Pass": "ناجح", "Fail": "راسب",
  "C": "مطابق", "NC": "غير مطابق", "N/C": "غير مطابق", "N\\C": "غير مطابق", "Compliant": "مطابق", "Non-Compliant": "غير مطابق", "Done": "تم", "Pending": "قيد الانتظار",
  "Open": "مفتوح", "Closed": "مغلق", "In Progress": "قيد التنفيذ", "Accepted": "مقبول", "Rejected": "مرفوض", "On Hold": "محجوز",
  "Other": "أخرى", "None": "لا يوجد", "Found": "موجود", "Total": "المجموع", "Qty": "الكمية", "Quantity": "الكمية", "Unit": "الوحدة",
  "Temp °C": "الحرارة °م", "Temperature": "درجة الحرارة", "Temperature (°C)": "درجة الحرارة (°م)",
  "Product": "المنتج", "Product Name": "اسم المنتج", "Item": "الصنف", "Items": "الأصناف", "Batch No.": "رقم التشغيلة", "Batch": "التشغيلة",
  "Lot No.": "رقم الدفعة", "Supplier": "المورد", "Supplier / Brand": "المورد / الماركة", "Brand": "الماركة", "Origin": "المنشأ",
  "Expiry Date": "تاريخ الانتهاء", "Production Date": "تاريخ الإنتاج", "Prod. Date": "تاريخ الإنتاج", "Weight": "الوزن",
  "Photo": "صورة", "Photos": "الصور", "Images": "الصور", "Attachments": "المرفقات", "Attachment": "مرفق", "Evidence": "الدليل",
  "Upload": "رفع", "Upload Photo": "رفع صورة", "Add Photo": "إضافة صورة", "Take Photo": "التقاط صورة",
  "Phone": "الهاتف", "Mobile": "الجوال", "Email": "البريد الإلكتروني", "Purpose": "الغرض", "Purpose of Visit": "الغرض من الزيارة",
  "From": "من", "To": "إلى", "Start": "البداية", "End": "النهاية", "Duration": "المدة", "Duration (min)": "المدة (دقيقة)",
  "Frequency": "التكرار", "Daily": "يومي", "Weekly": "أسبوعي", "Monthly": "شهري", "Quarterly": "ربع سنوي", "Annual": "سنوي",
  "Low": "منخفض", "Medium": "متوسط", "High": "مرتفع", "Critical": "حرج", "Major": "رئيسي", "Minor": "ثانوي", "Severity": "الخطورة",
  "Score": "الدرجة", "Result": "النتيجة", "Results": "النتائج", "Findings": "الملاحظات", "Finding": "الملاحظة", "Observation": "الملاحظة",
  "Details": "التفاصيل", "General Information": "المعلومات العامة", "Summary": "الملخص", "Title": "العنوان", "Topic": "الموضوع",

  /* ── buttons & states ── */
  "Save": "حفظ", "Save Report": "حفظ التقرير", "Save Sheet": "حفظ الورقة", "Update Sheet": "تحديث الورقة", "Update": "تحديث",
  "Saving…": "جارٍ الحفظ…", "Saving...": "جارٍ الحفظ…", "Submit": "إرسال", "Cancel": "إلغاء", "Back": "رجوع", "Clear": "مسح",
  "Reset": "إعادة تعيين", "Delete": "حذف", "Remove": "إزالة", "Edit": "تعديل", "Add": "إضافة", "Add Row": "إضافة سطر",
  "+ Add Row": "+ إضافة سطر", "Add Line": "إضافة سطر", "+ Add line": "+ إضافة سطر", "New": "جديد", "New Report": "تقرير جديد",
  "Print": "طباعة", "Export": "تصدير", "Close": "إغلاق", "Refresh": "تحديث", "Search": "بحث", "Loading…": "جارٍ التحميل…",
  "Select": "اختر", "Select…": "اختر…", "Choose": "اختر", "Manage": "إدارة", "Manage Staff": "إدارة الموظفين",
  "Copy from last sheet": "نسخ من آخر ورقة", "Open that sheet →": "فتح تلك الورقة ←",

  /* ── daily log engine (dailyLogSchemas.js) ── */
  "Raw Material Receiving": "استلام المواد الخام", "Baking & Cooking": "الخَبز والطبخ", "Cooling & Display": "التبريد والعرض",
  "Production & Batches": "الإنتاج والتشغيلات", "Sanitizers & Chemicals": "المعقمات والكيماويات",
  "Preventive Maintenance": "الصيانة الوقائية", "Thawing (Defrosting)": "إذابة التجميد",
  "Raw Material Receiving Log": "سجل استلام المواد الخام", "Baking & Cooking Temperature Log": "سجل حرارة الخَبز والطبخ",
  "Cooling & Display Log": "سجل التبريد والعرض", "Cooling & Chilled Display Log": "سجل التبريد والعرض المبرّد",
  "Cooling after preparation (60 → 21 °C in 2 h, → 5 °C within 6 h)": "التبريد بعد التحضير (60 ← 21 °م خلال ساعتين، ← 5 °م خلال 6 ساعات)",
  "Remove photo": "حذف الصورة", "Production & Batch Traceability Log": "سجل الإنتاج وتتبع التشغيلات",
  "Sanitizer Concentration & Chemicals Log": "سجل تركيز المعقمات والكيماويات", "Preventive Maintenance Log": "سجل الصيانة الوقائية",
  "Thawing (Defrosting) Record": "سجل إذابة التجميد",
  "Deliveries": "التوريدات", "Batches": "التشغيلات", "Finished product batches": "تشغيلات المنتج النهائي",
  "Sanitizer concentration checks": "فحوصات تركيز المعقم", "Chemicals register": "سجل الكيماويات", "Maintenance tasks": "مهام الصيانة",
  "Items thawed": "الأصناف المُذابة", "Chilled display & storage (≤ 5 °C)": "العرض والتخزين المبرّد (≤ 5 °م)",
  "Material": "المادة", "Storage": "التخزين", "Dry": "جاف", "Chilled": "مبرّد", "Frozen": "مجمّد", "Batch / Lot No.": "رقم التشغيلة / الدفعة",
  "Vehicle Clean": "نظافة السيارة", "Packaging Intact": "سلامة التغليف", "Appearance / Odour": "الشكل / الرائحة",
  "Pest / Mould Signs": "آثار حشرات / عفن", "COA / Aflatoxin Cert.": "شهادة التحليل / الأفلاتوكسين", "Decision": "القرار",
  "Process": "العملية", "Baking": "خَبز", "Cooking (syrup / custard / filling)": "طبخ (قطر / كاسترد / حشوة)", "Frying": "قلي", "Roasting (nuts)": "تحميص (مكسرات)",
  "Oven / Equipment": "الفرن / المعدة", "Set Temp °C": "الحرارة المضبوطة °م", "Core Temp °C": "حرارة اللب °م", "Doneness Check": "فحص النضج",
  "Start Time": "وقت البدء", "Start °C": "البدء °م", "Time @ 2 h": "الوقت بعد ساعتين", "°C @ 2 h": "°م بعد ساعتين",
  "Time @ 6 h": "الوقت بعد 6 ساعات", "°C @ 6 h": "°م بعد 6 ساعات", "Method": "الطريقة", "Blast chiller": "مبرد سريع",
  "Walk-in chiller": "غرفة تبريد", "Ice bath": "حوض ثلج", "Ambient then chiller": "حرارة الغرفة ثم البراد",
  "Display / Chiller": "العرض / البراد", "Products (cream / cakes)": "المنتجات (كريمة / كيك)", "°C Morning": "°م صباحاً",
  "°C Noon": "°م ظهراً", "°C Evening": "°م مساءً", "Labels / Dates OK": "الملصقات / التواريخ سليمة",
  "Finished Product": "المنتج النهائي", "Raw Material Lots Used": "دفعات المواد الخام المستخدمة", "Allergens": "مسببات الحساسية",
  "Line Cleaned After Allergen Run": "تنظيف الخط بعد تشغيلة مسببات الحساسية", "Label Checked": "فحص الملصق",
  "Release Status": "حالة الإفراج", "Released": "مُفرج عنه", "Released By (QA)": "أفرج بواسطة (الجودة)", "Dispatched To": "أُرسل إلى",
  "Branch / Customer": "الفرع / العميل", "+ Manual lot": "+ دفعة يدوية", "+ Add dispatch": "+ إضافة إرسال", "+ Add received lot…": "+ إضافة دفعة مستلمة…",
  "Area / Equipment": "المنطقة / المعدة", "Sanitizer": "المعقم", "Target Min ppm": "الحد الأدنى ppm", "Target Max ppm": "الحد الأعلى ppm",
  "Measured ppm": "القراءة ppm", "Test Method": "طريقة الفحص", "Test strip": "شريط فحص", "Test kit": "عدة فحص", "Meter": "جهاز قياس",
  "Contact Time (min)": "زمن التلامس (دقيقة)", "Chemical": "المادة الكيميائية", "Use": "الاستخدام", "Detergent": "منظف", "Degreaser": "مزيل دهون",
  "Hand wash": "غسول يدين", "Pest control": "مكافحة الحشرات", "Food-Grade Approved": "معتمد للغذاء", "SDS Available": "صحيفة السلامة متوفرة",
  "Storage Location": "مكان التخزين", "Qty in Stock": "الكمية بالمخزون", "Labelled / Locked": "معلَّم / مقفل",
  "Equipment": "المعدة", "Preventive": "وقائية", "Corrective": "تصحيحية", "Calibration": "معايرة", "Inspection": "تفتيش",
  "Task Description": "وصف المهمة", "Done By": "نفّذ بواسطة", "Hygiene Clearance": "تصريح النظافة", "Next Due": "الموعد القادم",
  "Semi-annual": "نصف سنوي", "One-off": "مرة واحدة",
  "Thaw Method": "طريقة الإذابة", "Chiller / Place": "البراد / المكان", "Chiller / Water °C": "البراد / الماء °م",
  "Start Date": "تاريخ البدء", "End Time": "وقت الانتهاء", "End Date": "تاريخ الانتهاء", "End Core °C": "حرارة اللب عند الانتهاء °م",
  "Thaw Time (h)": "مدة الإذابة (ساعة)", "Use By": "يُستخدم قبل", "Covered / Drip Tray": "مغطى / صينية تصريف",
  "Labelled (thaw date)": "ملصق (تاريخ الإذابة)", "Refrozen?": "أُعيد تجميده؟", "Used In (product / batch)": "استُخدم في (منتج / تشغيلة)",
  "Thawing": "قيد الإذابة", "Used": "مُستخدم", "In chiller (thawed)": "في البراد (مُذاب)", "Discarded": "مُتلف",
  "Chiller (≤ 5 °C)": "البراد (≤ 5 °م)", "Cold running water (≤ 21 °C)": "ماء بارد جارٍ (≤ 21 °م)", "Microwave — use at once": "مايكرويف — استخدام فوري",
  "Cooked / baked from frozen": "طبخ / خَبز من التجميد مباشرة", "Room temperature": "حرارة الغرفة",
  "Rows": "الأسطر", "Non-compliant": "غير مطابق", "To review": "للمراجعة",

  /* ── company shell: cards, reports, sidebar (industries/sweets/index.js) ── */
  "Confectionery": "الحلويات", "Main Branch": "الفرع الرئيسي",
  "Daily Reports": "التقارير اليومية", "Fill in the daily operation reports": "تعبئة تقارير التشغيل اليومية",
  "View Reports": "عرض التقارير", "Browse all saved reports": "تصفح كل التقارير المحفوظة",
  "OHC Certificates": "الشهادات الصحية", "Occupational Health Cards": "بطاقات الصحة المهنية",
  "Add Certificate": "إضافة شهادة", "Upload a new OHC certificate": "رفع شهادة صحية جديدة", "View Certificates": "عرض الشهادات",
  "Browse saved OHC certificates": "تصفح الشهادات الصحية المحفوظة", "Internal audit & inspection": "التدقيق والتفتيش الداخلي",
  "New Audit": "تدقيق جديد", "Fill a new internal audit": "تعبئة تدقيق داخلي جديد", "View Audits": "عرض التدقيقات", "Browse saved audits": "تصفح التدقيقات المحفوظة",
  "Training Certificates": "شهادات التدريب", "BFS / PIC / EFST / HACCP certificates": "شهادات BFS / PIC / EFST / HACCP",
  "Upload a training certificate": "رفع شهادة تدريب", "Browse training certificates": "تصفح شهادات التدريب",
  "Internal Training": "التدريب الداخلي", "Training sessions & attendance": "جلسات التدريب والحضور", "New Training": "تدريب جديد",
  "Record a training session": "تسجيل جلسة تدريب", "View Trainings": "عرض التدريبات", "Browse training records": "تصفح سجلات التدريب",
  "Vehicles": "المركبات", "Loading checks & truck cleaning": "فحص التحميل وتنظيف الشاحنات", "HACCP": "الهاسب", "Food safety modules": "وحدات سلامة الغذاء",
  "Personal Hygiene": "النظافة الشخصية", "Personal hygiene checklist": "قائمة فحص النظافة الشخصية",
  "Daily Cleanliness": "النظافة اليومية", "Daily cleaning checklist": "قائمة فحص التنظيف اليومي",
  "Cooler Temperatures": "حرارة البرادات", "5 coolers + freezer temperature log": "سجل حرارة 5 برادات + فريزر",
  "Visitor Checklist": "قائمة الزوار", "Visitor log & hygiene compliance": "سجل الزوار والتزامهم بالنظافة",
  "Non-Conformance": "عدم المطابقة", "Non-conformance reports (NCR)": "تقارير عدم المطابقة (NCR)",
  "Product Rejection": "رفض المنتج", "Rejected products & decisions": "المنتجات المرفوضة والقرارات",
  "Pest Control": "مكافحة الحشرات", "Pest control visits & findings": "زيارات مكافحة الحشرات والملاحظات",
  "Sick Employee": "الموظف المريض", "Staff sickness / fitness to work": "مرض الموظفين / اللياقة للعمل",
  "Supplier, lot, expiry, temperature, visual check": "المورد، الدفعة، الانتهاء، الحرارة، الفحص الظاهري",
  "Cream & cake cooling, display at ≤ 5 °C": "تبريد الكريمة والكيك، والعرض على ≤ 5 °م",
  "Oven temperature, baking time, core temperature": "حرارة الفرن، زمن الخَبز، حرارة اللب",
  "Raw lots in → QA release → dispatch out (recall-ready)": "دفعات خام ← إفراج الجودة ← إرسال (جاهز للاستدعاء)",
  "Sanitizer concentration checks + chemical register": "فحص تركيز المعقمات + سجل الكيماويات",
  "Equipment maintenance, calibration, hygiene clearance": "صيانة المعدات، المعايرة، تصريح النظافة",
  "Frozen dough, butter, cream & cheese — method, time, temperatures": "العجين والزبدة والكريمة والأجبان المجمّدة — الطريقة والوقت والحرارة",
  "Hygiene & Cleaning": "النظافة والتعقيم", "Receiving & Storage": "الاستلام والتخزين", "Production": "الإنتاج",
  "People": "الأشخاص", "Quality & Maintenance": "الجودة والصيانة",
  "Home": "الرئيسية", "Switch": "تبديل", "Switch Company": "تبديل الشركة", "Logout": "خروج", "Data entry": "إدخال البيانات",
  "View mode": "وضع العرض", "Entry": "إدخال", "View": "عرض", "Search reports…": "ابحث في التقارير…", "Reports": "التقارير",
  "No report matches.": "لا يوجد تقرير مطابق.", "Open the view of this report": "فتح عرض هذا التقرير",
  "Open the entry of this report": "فتح إدخال هذا التقرير", "Collapse": "طيّ", "Expand": "توسيع", "Browse": "تصفح",
  "Select a report from the list.": "اختر تقريراً من القائمة.",

  /* ── document control header ── */
  "Document Title": "عنوان الوثيقة", "Document No": "رقم الوثيقة", "Revision No": "رقم المراجعة", "Issued By": "أصدر بواسطة",
  "Controlling Officer": "المسؤول المراقب", "Covering Officer": "المسؤول المراقب", "S.No": "م", "Employee No": "الرقم الوظيفي",

  /* ── personal hygiene ── */
  "Nails": "الأظافر", "Hair": "الشعر", "Not wearing Jewelry": "عدم ارتداء المجوهرات",
  "Wearing Clean Cloth / Hair Net / Hand Glove / Face masks / Shoe": "ملابس نظيفة / غطاء شعر / قفازات / كمامة / حذاء",
  "Communicable Disease": "الأمراض المعدية", "Open wounds/sores & cut": "الجروح والتقرحات المفتوحة",

  /* ── daily cleanliness checklist (section + item texts are stored data; only the twin is added) ── */
  "Hand Washing Station": "محطة غسل اليدين", "Soap & sanitizer available": "الصابون والمعقم متوفران", "Paper towels available": "المناديل الورقية متوفرة",
  "Hair nets / masks / gloves available": "أغطية الشعر / الكمامات / القفازات متوفرة", "Hot & cold water": "ماء ساخن وبارد",
  "Raw Material & Dry Store": "مخزن المواد الخام والجافة", "Floors / shelves clean": "الأرضيات / الرفوف نظيفة",
  "Items off the floor (on pallets)": "المواد مرفوعة عن الأرض (على طبليات)", "Nuts & allergens stored separately and labelled": "المكسرات ومسببات الحساسية مخزنة منفصلة ومعلَّمة",
  "Opened bags sealed and dated": "الأكياس المفتوحة مغلقة ومؤرخة", "No spillage / pest signs": "لا انسكابات / لا آثار حشرات",
  "Chillers & Freezer": "البرادات والفريزر", "Floors / walls clean": "الأرضيات / الجدران نظيفة", "Door gaskets clean": "جوانات الأبواب نظيفة",
  "Cream & dairy covered and dated": "الكريمة والألبان مغطاة ومؤرخة", "Raw and finished products separated": "الخام والمنتج النهائي منفصلان",
  "Mixing & Preparation Area": "منطقة الخلط والتحضير", "Work tables": "طاولات العمل", "Walls / floors": "الجدران / الأرضيات", "Mixers & bowls": "الخلاطات والأوعية",
  "Utensils & spatulas": "الأدوات والملاعق", "Sieves": "المناخل", "Weighing scale": "الميزان", "Drainage": "التصريف",
  "Baking Area": "منطقة الخَبز", "Ovens (inside / outside)": "الأفران (داخل / خارج)", "Baking trays & moulds": "صواني وقوالب الخَبز", "Proofer": "غرفة التخمير",
  "Cooling racks": "رفوف التبريد", "Floor / walls": "الأرضية / الجدران", "Cream & Decoration Room": "غرفة الكريمة والتزيين",
  "Tables & turntables": "الطاولات والقواعد الدوارة", "Piping bags / nozzles": "أكياس ورؤوس التزيين", "Cream machines": "آلات الكريمة",
  "Room temperature controlled": "حرارة الغرفة مضبوطة", "Machine Cleanliness": "نظافة الآلات", "Planetary mixers": "الخلاطات الكوكبية",
  "Dough sheeter": "فرادة العجين", "Depositor / filling machine": "آلة التعبئة / الحشو", "Nut grinder / roaster": "مطحنة / محمصة المكسرات",
  "Packing / sealing machine": "آلة التغليف / الإغلاق", "Packaging & Finished Goods": "التغليف والمنتجات النهائية", "Packing tables": "طاولات التغليف",
  "Packaging material covered": "مواد التغليف مغطاة", "Labels / dates correct": "الملصقات / التواريخ صحيحة", "Finished products protected": "المنتجات النهائية محمية",
  "Waste Disposal": "التخلص من النفايات", "Bins covered with lids": "الحاويات مغطاة", "Waste removed on time": "النفايات تُزال في وقتها",
  "Waste area clean": "منطقة النفايات نظيفة", "Working Conditions": "ظروف العمل", "Lights covered / working": "الإنارة مغطاة / تعمل",
  "Insect killers (EFK) working": "صواعق الحشرات تعمل", "Floor / wall / ceiling condition": "حالة الأرضية / الجدران / السقف",
  "No glass / brittle plastic hazard": "لا خطر زجاج / بلاستيك هش", "Toilets & changing room clean": "دورات المياه وغرف التبديل نظيفة",

  /* ── product rejection ── */
  "Product Name *": "اسم المنتج *", "Qty Rejected *": "الكمية المرفوضة *", "Rejection Reason *": "سبب الرفض *", "Disposition *": "التصرف *",
  "Inspected By *": "فحص بواسطة *", "Disposition": "التصرف", "Rejection Reason": "سبب الرفض", "Qty Rejected": "الكمية المرفوضة",
  "Nuts": "مكسرات", "Sugar & Sweeteners": "السكر والمحليات", "Flour & Dry Goods": "الطحين والمواد الجافة", "Dairy & Cream": "الألبان والكريمة",
  "Eggs": "البيض", "Butter, Ghee & Oils": "الزبدة والسمن والزيوت", "Chocolate & Cocoa": "الشوكولاتة والكاكاو", "Fillings & Dates": "الحشوات والتمور",
  "Flavours & Colours": "النكهات والألوان", "Packaging Material": "مواد التغليف",
  "Expired": "منتهي الصلاحية", "Near Expiry": "قريب الانتهاء", "Temperature Abuse": "سوء حفظ الحرارة", "Physical Damage": "تلف مادي",
  "Contamination": "تلوث", "Wrong Specification": "مواصفات خاطئة", "Label Missing": "الملصق مفقود", "Pest Damage": "تلف بسبب الحشرات",
  "Off Odour": "رائحة غير طبيعية", "Abnormal Colour": "لون غير طبيعي", "Improper Packaging": "تغليف غير سليم", "Short Weight": "نقص الوزن",
  "Rancid (nuts / fats)": "زناخة (مكسرات / دهون)", "Moisture / Caking": "رطوبة / تكتل", "No COA / Aflatoxin Certificate": "بدون شهادة تحليل / أفلاتوكسين",
  "Foreign Matter": "جسم غريب", "Returned to Supplier": "أُعيد للمورد", "Destroyed": "أُتلف", "Quarantine": "حجر", "Downgraded": "خُفّضت درجته",
  "bag": "كيس", "litre": "لتر",

  /* ── pest control ── */
  "Raw Material Store": "مخزن المواد الخام", "Production Area": "منطقة الإنتاج", "Packaging Area": "منطقة التغليف", "Finished Goods Store": "مخزن المنتج النهائي",
  "Chillers & Freezers": "البرادات والفريزرات", "Loading Bay": "منطقة التحميل", "Staff Area & Toilets": "منطقة الموظفين ودورات المياه", "Outside Perimeter": "المحيط الخارجي",
  "Rodents": "القوارض", "Flies": "الذباب", "Cockroaches": "الصراصير", "Ants": "النمل", "Birds": "الطيور", "Mosquitoes": "البعوض", "Stored Product Pests": "آفات المواد المخزنة",
  "Spray": "رش", "Bait Station": "محطة طُعم", "Glue Trap": "مصيدة لاصقة", "Snap Trap": "مصيدة زنبركية", "ULV Fogging": "تضبيب ULV", "Gel Application": "جل",
  "Inspection Only": "فحص فقط", "Routine": "دورية", "Ad-hoc": "طارئة", "Re-treatment": "إعادة معالجة", "Initial Setup": "إعداد أولي",
  "Active": "نشطة", "Empty": "فارغة", "Captured": "صيد", "Damaged": "تالفة", "Missing": "مفقودة",
  "Visit Type": "نوع الزيارة", "Pest Control Company": "شركة مكافحة الحشرات", "Company Name *": "اسم الشركة *", "Service Report No.": "رقم تقرير الخدمة",
  "License No.": "رقم الترخيص", "Technician Name *": "اسم الفني *", "Next Visit Date": "موعد الزيارة القادمة", "Treatment": "المعالجة",
  "Pests Targeted": "الحشرات المستهدفة", "Treatment Methods": "طرق المعالجة", "Chemicals Used": "المواد الكيميائية المستخدمة", "Areas Treated": "المناطق المعالجة",
  "Bait Stations": "محطات الطُعم", "Code": "الرمز", "Captures / Activity": "الصيد / النشاط", "Findings & Actions": "الملاحظات والإجراءات",
  "Corrective Actions": "الإجراءات التصحيحية", "Recommendations for the next visit": "توصيات للزيارة القادمة", "Sign-off": "الاعتماد",
  "Inspector *": "المفتش *", "Supervisor": "المشرف", "Service Report Photo": "صورة تقرير الخدمة", "Extra Photos (optional)": "صور إضافية (اختياري)",

  /* ── internal training ── */
  "Training Title *": "عنوان التدريب *", "Trainer": "المدرب", "Duration (hours)": "المدة (ساعات)", "Objective": "الهدف",
  "Induction": "تعريف وظيفي", "Food Safety": "سلامة الغذاء", "Health & Safety": "الصحة والسلامة",

  /* ── HACCP manual record ── */
  "Title / Reference": "العنوان / المرجع", "Status (optional)": "الحالة (اختياري)", "Remarks / Notes": "الملاحظات",

  /* ── HACCP hub ── */
  "Allergen Matrix": "مصفوفة مسببات الحساسية", "Every product × nuts, gluten, milk, eggs, sesame — label line & production run order": "كل منتج × المكسرات، الغلوتين، الحليب، البيض، السمسم — عبارة الملصق وترتيب التشغيل",
  "Supplier Evaluation": "تقييم الموردين", "Approved suppliers, evaluation scores, renewals & performance tracking": "الموردون المعتمدون، درجات التقييم، التجديد ومتابعة الأداء",
  "SOP": "إجراءات التشغيل القياسية", "Standard Operating Procedures — documents, versions & records": "إجراءات التشغيل القياسية — الوثائق والإصدارات والسجلات",
  "CCP Monitoring": "مراقبة نقاط التحكم الحرجة", "Critical Control Points monitoring — readings, deviations, corrective actions": "مراقبة نقاط التحكم الحرجة — القراءات والانحرافات والإجراءات التصحيحية",
  "Dubai Municipality Inspection": "تفتيش بلدية دبي", "DM inspection reports — uploaded manually, with findings & attachments": "تقارير تفتيش البلدية — تُرفع يدوياً مع الملاحظات والمرفقات",
  "Mock Recall / Traceability Drill": "الاستدعاء التجريبي / تمرين التتبع", "Quarterly traceability drills — backward + forward trace, KPI & audit-ready logs": "تمارين تتبع ربع سنوية — تتبع للخلف وللأمام، مؤشرات وسجلات جاهزة للتدقيق",
  "Pending Review": "بانتظار المراجعة",

  /* ── allergen matrix + staff list ── */
  "Reviewed By (HACCP team leader)": "راجعه (قائد فريق الهاسب)", "Review Date": "تاريخ المراجعة", "Nut Type(s)": "نوع المكسرات",
  "Label Statement": "عبارة الملصق", "Suggested production run order": "ترتيب التشغيل المقترح", "+ Add Product": "+ إضافة منتج",
  "All products": "كل المنتجات", "Nut-free only": "الخالية من المكسرات فقط", "Staff List": "قائمة الموظفين",
  "Job": "الوظيفة", "Job title": "المسمى الوظيفي", "Full name": "الاسم الكامل",

  /* ── certificates (training + OHC) ── */
  "Employee Number": "الرقم الوظيفي", "Job Title": "المسمى الوظيفي", "Course Type": "نوع الدورة", "Custom Course Name": "اسم الدورة المخصص",
  "Expiry Date (auto)": "تاريخ الانتهاء (تلقائي)", "Occupation": "المهنة", "Certificate Expiry Date": "تاريخ انتهاء الشهادة",

  /* ── vehicles ── */
  "Chemical used": "المادة الكيميائية المستخدمة",
  "Cleaning Procedure": "طريقة التنظيف", "Remark": "ملاحظة", "Select...": "اختر…",

  /* ── units ── */
  "kg": "كغ", "g": "غ", "L": "لتر", "pcs": "قطعة", "box": "علبة", "tray": "صينية", "carton": "كرتونة", "cake": "كيكة",
};

/** Arabic twin of an English label, or "" when the dictionary has none. */
let LC = null; // lower-cased index, rebuilt when addArabic() grows the table
const lookup = (k) => {
  if (AR[k]) return AR[k];
  if (!LC) LC = Object.fromEntries(Object.entries(AR).map(([a, b]) => [a.toLowerCase(), b]));
  return LC[k.toLowerCase()] || "";
};
export function arOf(en) {
  if (en === null || en === undefined || typeof en !== "string") return "";
  const k = en.trim();
  if (!k) return "";
  const direct = lookup(k);
  if (direct) return direct;
  // "Date:" / "Date *" / "Date:*" → twin of "Date" with the same mark.
  const m = k.match(/^(.*?)\s*(:?\s*\*|:)$/);
  if (m && m[1]) {
    const base = lookup(m[1]);
    if (base) return `${base}${m[2].replace(/\s+/g, " ")}`;
  }
  return "";
}

/** "English · عربي" as ONE string — for <option>, placeholder, title. */
export function bi(en, ar) {
  const a = ar ?? arOf(en);
  return a && a !== en ? `${en} · ${a}` : String(en ?? "");
}

const CSS = `
.bi{display:inline-flex;flex-wrap:wrap;align-items:baseline;column-gap:.45em;row-gap:0;max-width:100%;vertical-align:baseline}
.bi-ar{font-family:var(--font-arabic,'Cairo','Tajawal',sans-serif);font-weight:700;opacity:.7;unicode-bidi:isolate;direction:rtl;white-space:nowrap}
.bi-stack{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1.2;row-gap:1px}
.bi-stack .bi-ar{white-space:normal}
.bi-center.bi-stack{align-items:center;text-align:center}
.bi-nowrap{flex-wrap:nowrap;overflow:hidden;text-overflow:ellipsis}
.bi-nowrap>.bi-en{overflow:hidden;text-overflow:ellipsis}
#root .bi-ar.bi-ar{font-size:12px !important}
#root table .bi-ar.bi-ar,#root th .bi-ar.bi-ar{font-size:10.5px !important}
`;
let injected = false;
function ensureCss() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const el = document.createElement("style");
  el.setAttribute("data-sweets-bilingual", "");
  el.textContent = CSS;
  document.head.appendChild(el);
}

/**
 * English label with its Arabic twin.
 * @param {string} en        English text (dictionary key)
 * @param {string} [ar]      explicit Arabic (overrides the dictionary)
 * @param {boolean} [stack]  Arabic under the English (table headers)
 * @param {boolean} [center] centre a stacked label
 * @param {boolean} [nowrap] keep both on one line (fixed-width cells)
 */
export function Bi({ en, ar, stack = false, center = false, nowrap = false, style }) {
  ensureCss();
  const a = ar ?? arOf(en);
  if (!a || a === en) return <>{en}</>;
  return (
    <span className={`bi${stack ? " bi-stack" : ""}${center ? " bi-center" : ""}${nowrap ? " bi-nowrap" : ""}`} style={style}>
      <span className="bi-en">{en}</span>
      <span className="bi-ar" lang="ar" dir="rtl">{a}</span>
    </span>
  );
}

/** Adds dictionary entries from a page-local table (keeps each page's own words next to it). */
export function addArabic(entries) {
  Object.entries(entries || {}).forEach(([k, v]) => { if (!AR[k]) AR[k] = v; });
  LC = null;
}
