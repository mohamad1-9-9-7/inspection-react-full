// src/pages/industry-kit/i18n/arCommon.js
// Arabic twins of the GENERAL words of every kit page: form words, buttons,
// the company-app shell (cards, groups) and the OHC / external-certificate
// pages. Report-specific labels live in arReports.js. Keyed by the English.

export const AR_COMMON = {
  /* ── form words ── */
  "Date": "التاريخ", "Date *": "التاريخ *", "Time": "الوقت", "Shift": "الوردية",
  "Morning": "صباحي", "Evening": "مسائي", "Night": "ليلي", "Noon": "الظهر",
  "Checked By": "فحص بواسطة", "Verified By": "اعتمد بواسطة", "Verified By (QA)": "اعتمد بواسطة (الجودة)",
  "Remarks": "ملاحظات", "Notes": "ملاحظات", "Description": "الوصف", "Name": "الاسم",
  "Employee Name": "اسم الموظف", "Employee No.": "الرقم الوظيفي", "Employee Number": "الرقم الوظيفي",
  "Position": "الوظيفة", "Job Title": "المسمى الوظيفي", "Company": "الشركة", "Nationality": "الجنسية",
  "Status": "الحالة", "Action": "الإجراء", "Corrective Action": "الإجراء التصحيحي",
  "Root Cause": "السبب الجذري", "Responsible": "المسؤول", "Target Date": "التاريخ المستهدف",
  "Area": "المنطقة", "Location": "الموقع", "Section": "القسم", "Branch": "الفرع", "Type": "النوع",
  "Yes": "نعم", "No": "لا", "N/A": "لا ينطبق", "Pass": "ناجح", "Fail": "راسب",
  "Open": "مفتوح", "Closed": "مغلق", "In Progress": "قيد التنفيذ", "Accepted": "مقبول", "Rejected": "مرفوض", "On Hold": "محجوز",
  "None": "لا يوجد", "Found": "موجود", "Qty": "الكمية", "Unit": "الوحدة", "Temp °C": "الحرارة °م",
  "Product": "المنتج", "Item": "الصنف", "Batch No.": "رقم التشغيلة", "Batch / Lot No.": "رقم التشغيلة / الدفعة", "Lot No.": "رقم الدفعة",
  "Supplier": "المورد", "Expiry Date": "تاريخ الانتهاء", "Issue Date": "تاريخ الإصدار", "Result": "النتيجة",
  "Minor": "ثانوي", "Major": "رئيسي", "Critical": "حرج", "Severity": "الخطورة",
  "Start": "البداية", "End": "النهاية", "Start Time": "وقت البدء", "Start Date": "تاريخ البدء",
  "Phone": "الهاتف", "Purpose of Visit": "الغرض من الزيارة", "Material": "المادة", "Method": "الطريقة",

  /* ── buttons & states ── */
  "Save": "حفظ", "Save Sheet": "حفظ الورقة", "Update Sheet": "تحديث الورقة", "Saving…": "جارٍ الحفظ…", "Saving...": "جارٍ الحفظ…",
  "Back": "رجوع", "Remove": "إزالة", "Delete": "حذف", "Edit": "تعديل", "Add": "إضافة",
  "+ Add Row": "+ إضافة سطر", "+ Add line": "+ إضافة سطر", "Copy from last sheet": "نسخ من آخر ورقة",
  "Open that sheet →": "فتح تلك الورقة ←", "Loading the sheet…": "جارٍ تحميل الورقة…", "Uploading…": "جارٍ الرفع…",
  "One sheet per day — rows are checked against the limits as you type.": "ورقة واحدة يومياً — تُفحص الأسطر مقابل الحدود أثناء الكتابة.",
  "Cannot remove last": "لا يمكن حذف الأخيرة",

  /* ── company-app shell ── */
  "Main Branch": "الفرع الرئيسي",
  "Daily Reports": "التقارير اليومية", "Fill in the daily operation reports": "تعبئة تقارير التشغيل اليومية",
  "View Reports": "عرض التقارير", "Browse all saved reports": "تصفح كل التقارير المحفوظة",
  "OHC Certificates": "الشهادات الصحية", "Occupational Health Cards": "بطاقات الصحة المهنية",
  "Add Certificate": "إضافة شهادة", "Upload a new OHC certificate": "رفع شهادة صحية جديدة",
  "View Certificates": "عرض الشهادات", "Browse saved OHC certificates": "تصفح الشهادات الصحية المحفوظة",
  "External Certificates": "الشهادات الخارجية",
  "BFS / PIC / EFST / HACCP and other external certificates": "شهادات BFS / PIC / EFST / HACCP وغيرها من الشهادات الخارجية",
  "Upload an external certificate": "رفع شهادة خارجية", "Browse external certificates": "تصفح الشهادات الخارجية",

  /* ── OHC page ── */
  "OHC Register": "سجل الشهادات الصحية", "OHC Certificate Entry": "إدخال شهادة صحية",
  "Server-based record for employee OHC certificates with image attachment and expiry tracking.": "سجل على السيرفر للشهادات الصحية للموظفين مع صورة الشهادة ومتابعة الانتهاء.",
  "Mode:": "الوضع:", "Server Save Only": "حفظ على السيرفر فقط", "Duplicates blocked by Employee Number.": "التكرار ممنوع حسب الرقم الوظيفي.",
  "Employee Details": "بيانات الموظف", "Certificate & Branch": "الشهادة والفرع", "Attachment (Optional)": "المرفق (اختياري)",
  "Certificate Image (Optional)": "صورة الشهادة (اختياري)", "Remove Image": "حذف الصورة",
  "View All Certificates": "عرض كل الشهادات", "Save to Server": "حفظ على السيرفر",
  "Occupation": "المهنة", "Certificate Expiry Date": "تاريخ انتهاء الشهادة",

  /* ── external certificates page ── */
  "BFS / PIC / EFST / HACCP Certificates": "شهادات BFS / PIC / EFST / HACCP",
  "Server Save Only (Multi-certificate per employee)": "حفظ على السيرفر فقط (عدة شهادات لكل موظف)",
  "Save Certificates": "حفظ الشهادات", "Course Type": "نوع الدورة", "Custom Course Name": "اسم الدورة المخصص",
  "Expiry Date (auto)": "تاريخ الانتهاء (تلقائي)",

  /* ── units ── */
  "kg": "كغ", "g": "غ", "L": "لتر", "pcs": "قطعة", "box": "علبة", "tray": "صينية", "carton": "كرتونة", "pallet": "طبلية",
};
