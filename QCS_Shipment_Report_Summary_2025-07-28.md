
# 📦 تقرير استلام الشحنات - فرع QCS (القيصص)

## ✅ 1. إنشاء تقرير استلام شحنات خام

**المسار:**
```
pages/monitor/branches/shipment_recc/QCSRawMaterialInspection.jsx
```

**الإضافات التي تمت:**
- إدخال بيانات عامة عن الشحنة:  
  - `REPORT ON`, `SAMPLE RECEIVED ON`, `INSPECTION DATE`, `TEMPERATURE`, `BRAND`, `INVOICE NO`, `PH`, `ORIGIN`, `AIR WAY BILL NO`, `LOCAL LOGGER`, `INTERNATIONAL LOGGER`
- إمكانية تحديد **حالة الشحنة** (مرضي، وسط، تحت الوسط)
- إمكانية إدخال **عدة عينات** لكل شحنة
- حفظ كل تقرير على حدة مع عنوان وتاريخ

**التخزين:**  
```js
localStorage.setItem("qcs_raw_material_reports", JSON.stringify([...]));
```

---

## ✅ 2. عرض التقارير المحفوظة

**المسار:**
```
pages/monitor/branches/shipment_recc/QCSRawMaterialView.jsx
```

**الإضافات:**
- عرض قائمة بجميع التقارير المحفوظة
- عرض بيانات كل تقرير بما في ذلك:
  - المعلومات العامة
  - حالة الشحنة
  - جدول العينات الكاملة
- إمكانية **طباعة التقرير** مباشرة من المتصفح

---

## ✅ 3. تعديل واجهة التقارير اليومية

**المسار:**
```
components/admin/DailyReportsTab.jsx
```

**المميزات:**
- إضافة زر خاص لـ **تقرير استلام الشحنات - QCS**
- تمرير دالة `onOpenQCSShipmentReport` لفتح الصفحة الخاصة بالتقرير

---

## 📌 ملاحظات إضافية

- جميع التقارير محفوظة في `localStorage` تحت المفتاح:
  ```
  qcs_raw_material_reports
  ```
- تم الالتزام بتنسيق احترافي في التصميم (أزرار، جداول، حدود، ألوان موحدة).
- لا يوجد حذف لأي من الحقول أو الوظائف السابقة.
- كل تقرير مستقل، ويمكن إضافة تقرير جديد في نفس اليوم بعدة عينات.
