// src/utils/kpi.js

// =====================
// ----- التفتيش -----
// =====================
export function getInspectionReportCount() {
  const arr = JSON.parse(localStorage.getItem("reports") || "[]");
  return arr.length;
}

export function getInspectionAvgPercentage() {
  const arr = JSON.parse(localStorage.getItem("reports") || "[]");
  if (arr.length === 0) return 0;
  return (
    arr.reduce((sum, rep) => sum + (parseFloat(rep.percentage) || 0), 0) / arr.length
  ).toFixed(1);
}

// ===============================
// ----- تقارير QCS اليومية -----
// ===============================
export function getQcsDailyReportCount() {
  const arr = JSON.parse(localStorage.getItem("qcs_reports") || "[]");
  return arr.length;
}

export function getQcsCoolersAvgTemp() {
  const arr = JSON.parse(localStorage.getItem("qcs_reports") || "[]");
  let temps = [];
  arr.forEach(report => {
    report.coolers?.forEach(cooler => {
      temps.push(...Object.values(cooler.temps).filter(v => v !== ""));
    });
  });
  temps = temps.map(Number).filter(x => !isNaN(x));
  if (temps.length === 0) return 0;
  return (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1);
}

// =====================================
// ----- تقارير الشحنات QCS (Shipments)
// =====================================
export function getQcsShipmentsCount() {
  const arr = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
  return arr.length;
}

// عدد الشحنات حسب الحالة
export function getQcsShipmentsByStatus(status) {
  const arr = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
  return arr.filter(r => r.status === status).length;
}

// جلب أنواع الشحنات المختلفة مع عدد كل نوع
export function getQcsShipmentTypesCounts() {
  const arr = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
  return arr.reduce((acc, r) => {
    const type = r.shipmentType || "غير محدد";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
}

// ==================================
// ====== مؤشرات المرتجعات (Returns)
// ==================================

// عدد تقارير المرتجعات
export function getReturnsReportCount() {
  const arr = JSON.parse(localStorage.getItem("returns_reports") || "[]");
  return arr.length;
}

// إجمالي عدد العناصر في جميع تقارير المرتجعات
export function getReturnsItemsCount() {
  const arr = JSON.parse(localStorage.getItem("returns_reports") || "[]");
  return arr.reduce((total, rep) => total + (rep.items?.length || 0), 0);
}

// إجمالي الكمية لجميع العناصر في المرتجعات
export function getReturnsTotalQty() {
  const arr = JSON.parse(localStorage.getItem("returns_reports") || "[]");
  let totalQty = 0;
  arr.forEach(rep => {
    rep.items?.forEach(item => {
      totalQty += Number(item.quantity || 0);
    });
  });
  return totalQty;
}

// أكثر الفروع تكراراً في المرتجعات
export function getTopReturnBranches(topN = 3) {
  const arr = JSON.parse(localStorage.getItem("returns_reports") || "[]");
  const byBranch = {};
  arr.forEach(rep => {
    rep.items?.forEach(item => {
      const b = item.butchery === "فرع آخر..." ? item.customButchery : item.butchery;
      if (b) byBranch[b] = (byBranch[b] || 0) + 1;
    });
  });
  return Object.entries(byBranch).sort((a, b) => b[1] - a[1]).slice(0, topN);
}

// أكثر الإجراءات تكراراً في المرتجعات
export function getTopReturnActions(topN = 3) {
  const arr = JSON.parse(localStorage.getItem("returns_reports") || "[]");
  const byAction = {};
  arr.forEach(rep => {
    rep.items?.forEach(item => {
      const a = item.action === "إجراء آخر..." ? item.customAction : item.action;
      if (a) byAction[a] = (byAction[a] || 0) + 1;
    });
  });
  return Object.entries(byAction).sort((a, b) => b[1] - a[1]).slice(0, topN);
}

// يمكنك إضافة مؤشرات وتحاليل أخرى بنفس النمط لأي بيانات جديدة مستقبلاً!
