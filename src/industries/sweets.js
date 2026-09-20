// src/industries/sweets.js
// نموذج قالب لنشاط "الحلويات" (تجريبي).
//
// هذا الملف هو كل ما يلزم لتعريف نظام شركة حلويات: أقسام (كروت) وتحت كل قسم
// أنواع تقارير، وكل تقرير حقوله. المحرّك العام (pages/generic) يبني الداشبورد
// وصفحات الإدخال والعرض من هذا الوصف — بلا صفحات مكتوبة يدوياً ولا أي تعديل
// على السيرفر (جدول reports عام: type + payload + company_id).
//
// لإضافة تقرير جديد: أضف كائناً في reports داخل القسم المناسب. خلص.
//
// ملاحظة مهمة عن التواريخ: نستعمل مفتاح `entryDate` (وليس `reportDate`) عمداً،
// حتى لا تخضع تقارير السجل لقيد "تقرير واحد باليوم" (ux_reports_type_reportdate
// يفهرس payload->>'reportDate' فقط). هيك ينفع تسجّل أكثر من تشغيلة/سجل باليوم.

const FIELD = {
  date:     (key, label, opts = {}) => ({ key, label, type: "date", ...opts }),
  text:     (key, label, opts = {}) => ({ key, label, type: "text", ...opts }),
  number:   (key, label, opts = {}) => ({ key, label, type: "number", ...opts }),
  textarea: (key, label, opts = {}) => ({ key, label, type: "textarea", ...opts }),
  select:   (key, label, options, opts = {}) => ({ key, label, type: "select", options, ...opts }),
  checkbox: (key, label, opts = {}) => ({ key, label, type: "checkbox", ...opts }),
};

const sweets = {
  id: "sweets",
  label: "الحلويات",
  labelEn: "Confectionery",
  icon: "🍰",
  sections: [
    {
      id: "production",
      label: "الإنتاج",
      icon: "🏭",
      grad: "linear-gradient(135deg,#ec4899,#be185d)",
      reports: [
        {
          type: "sweets_production_log",
          label: "سجل الإنتاج اليومي",
          desc: "تشغيلات الإنتاج، الكميات، والدفعات",
          fields: [
            FIELD.date("entryDate", "التاريخ", { required: true }),
            FIELD.text("product", "المنتج", { required: true }),
            FIELD.text("batchNo", "رقم التشغيلة"),
            FIELD.number("qtyKg", "الكمية (كغ)"),
            FIELD.text("producedBy", "المسؤول"),
            FIELD.textarea("notes", "ملاحظات"),
          ],
        },
        {
          type: "sweets_oven_log",
          label: "سجل حرارة الأفران",
          desc: "متابعة حرارة ومدة الخبز",
          fields: [
            FIELD.date("entryDate", "التاريخ", { required: true }),
            FIELD.text("ovenNo", "رقم الفرن"),
            FIELD.number("tempC", "الحرارة (°م)"),
            FIELD.number("minutes", "المدة (دقيقة)"),
            FIELD.text("checkedBy", "الفاحص"),
          ],
        },
      ],
    },
    {
      id: "quality",
      label: "الجودة",
      icon: "🔬",
      grad: "linear-gradient(135deg,#0891b2,#0e7490)",
      reports: [
        {
          type: "sweets_qc_check",
          label: "فحص جودة المنتج",
          desc: "المظهر، الطعم، والمطابقة",
          fields: [
            FIELD.date("entryDate", "التاريخ", { required: true }),
            FIELD.text("product", "المنتج", { required: true }),
            FIELD.select("result", "النتيجة", ["مطابق", "غير مطابق"], { required: true }),
            FIELD.textarea("remarks", "الملاحظات"),
            FIELD.text("inspector", "المفتّش"),
          ],
        },
      ],
    },
    {
      id: "hygiene",
      label: "النظافة",
      icon: "🧼",
      grad: "linear-gradient(135deg,#16a34a,#15803d)",
      reports: [
        {
          type: "sweets_cleaning_log",
          label: "سجل التنظيف",
          desc: "تنظيف المعدّات والأسطح",
          fields: [
            FIELD.date("entryDate", "التاريخ", { required: true }),
            FIELD.text("area", "المنطقة/المعدّة", { required: true }),
            FIELD.select("done", "الحالة", ["تم", "لم يتم"]),
            FIELD.text("by", "المنفّذ"),
            FIELD.textarea("notes", "ملاحظات"),
          ],
        },
      ],
    },
  ],
};

export default sweets;
