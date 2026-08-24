// src/pages/monitor/branches/pos6/POS6ReportsView.jsx
// POS 6 — daily viewer hub, opened from the Admin branch tile.
// Column specs live here; POS6ReportView does the fetching and drawing.

import React from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";
import POS6ReportView from "./POS6ReportView";
import { TYPES } from "./pos6Api";

/* Columns of the personal-hygiene sheet, in the order they are filled. */
const HYGIENE_COLUMNS = [
  { key: "name", label: "Name", labelAr: "الاسم" },
  { key: "Nails", label: "Nails", labelAr: "الأظافر", kind: "verdict" },
  { key: "Hair", label: "Hair", labelAr: "الشعر", kind: "verdict" },
  { key: "Not wearing Jewelry", label: "No jewellery", labelAr: "بلا مجوهرات", kind: "verdict" },
  { key: "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe", label: "PPE", labelAr: "ملابس ومعدات الوقاية", kind: "verdict" },
  { key: "Communicable Disease", label: "Communicable disease", labelAr: "مرض معدٍ", kind: "verdict" },
  { key: "Open wounds/sores & cut", label: "Open wounds", labelAr: "جروح مكشوفة", kind: "verdict" },
  { key: "remarks", label: "Remarks", labelAr: "ملاحظات" },
];

const CLEANING_COLUMNS = [
  { key: "general", label: "General cleanliness", labelAr: "بند النظافة" },
  { key: "chemical", label: "Chemical used", labelAr: "المادة المستخدمة" },
  { key: "cnc", label: "C / NC", labelAr: "مطابق / غير مطابق", kind: "verdict" },
  { key: "doneBy", label: "Done by", labelAr: "نُفّذ بواسطة" },
  { key: "remarks", label: "Remarks", labelAr: "ملاحظات" },
];

const EQUIPMENT_COLUMNS = [
  { key: "equipment", label: "Equipment / utensils", labelAr: "المعدات والأدوات" },
  { key: "freeFromDamage", label: "Free from damage", labelAr: "خالية من التلف", kind: "verdict" },
  { key: "freeFromBrokenPieces", label: "Free from broken pieces", labelAr: "خالية من الكسر", kind: "verdict" },
  { key: "s_8_9_AM", label: "8–9 AM", kind: "verdict" },
  { key: "s_12_1_PM", label: "12–1 PM", kind: "verdict" },
  { key: "s_4_5_PM", label: "4–5 PM", kind: "verdict" },
  { key: "s_8_9_PM", label: "8–9 PM", kind: "verdict" },
  { key: "s_12_1_AM", label: "12–1 AM", kind: "verdict" },
  { key: "correctiveAction", label: "Corrective action", labelAr: "الإجراء التصحيحي" },
  { key: "checkedByRow", label: "Checked by", labelAr: "فحص بواسطة" },
];

const RECEIVING_COLUMNS = [
  { key: "itemCode", label: "Item code", labelAr: "كود الصنف" },
  { key: "foodItem", label: "Food item", labelAr: "الصنف" },
  { key: "supplier", label: "Supplier", labelAr: "المورّد" },
  { key: "netWeight", label: "Net weight", labelAr: "الوزن الصافي" },
  { key: "vehicleTemp", label: "Vehicle °C", labelAr: "حرارة السيارة" },
  { key: "foodTemp", label: "Food °C", labelAr: "حرارة المنتج" },
  { key: "vehicleClean", label: "Vehicle clean", labelAr: "نظافة السيارة", kind: "verdict" },
  { key: "handlerHygiene", label: "Handler hygiene", labelAr: "نظافة المناول", kind: "verdict" },
  { key: "appearanceOK", label: "Appearance", labelAr: "المظهر", kind: "verdict" },
  { key: "firmnessOK", label: "Firmness", labelAr: "القوام", kind: "verdict" },
  { key: "smellOK", label: "Smell", labelAr: "الرائحة", kind: "verdict" },
  { key: "packagingGood", label: "Packaging", labelAr: "التغليف", kind: "verdict" },
  { key: "countryOfOrigin", label: "Origin", labelAr: "المنشأ" },
  { key: "productionDate", label: "Production", labelAr: "الإنتاج" },
  { key: "expiryDate", label: "Expiry", labelAr: "الصلاحية" },
  { key: "invoiceNo", label: "Invoice no.", labelAr: "رقم الفاتورة" },
  { key: "receivedBy", label: "Received by", labelAr: "استلمها" },
  { key: "remarks", label: "Remarks", labelAr: "ملاحظات" },
];

/* The coolers sheet has a column per time slot, and the branch chooses those,
   so the shape is read back off the record rather than declared up front. */
const coolerColumns = (payload) => [
  { key: "kindLabel", label: "Type", labelAr: "النوع" },
  { key: "name", label: "Unit", labelAr: "الوحدة" },
  ...(payload.slots || []).map((s) => ({ key: `slot_${s}`, label: s })),
  { key: "remarks", label: "Remarks", labelAr: "ملاحظات" },
];

const coolerRows = (payload) =>
  (payload.units || []).map((u) => {
    const row = {
      kindLabel: u.kind === "freezer" ? "Freezer" : "Chiller",
      name: u.name,
      remarks: u.remarks,
    };
    (payload.slots || []).forEach((s) => { row[`slot_${s}`] = u.temps?.[s] ?? ""; });
    return row;
  });

const DASH_TYPES = [
  { type: TYPES.personalHygiene,     key: "hygiene",   icon: "🧑‍🔬", titleEn: "Personal Hygiene",     titleAr: "النظافة الشخصية",        accent: "#0ea5e9" },
  { type: TYPES.cleaningChecklist,   key: "cleaning",  icon: "🧹",     titleEn: "Cleaning Checklist",   titleAr: "قائمة النظافة",          accent: "#22c55e" },
  { type: TYPES.equipmentInspection, key: "equipment", icon: "🧪",     titleEn: "Equipment Inspection", titleAr: "فحص المعدات",            accent: "#f59e0b" },
  { type: TYPES.receivingLog,        key: "receiving", icon: "📥",     titleEn: "Receiving Log",        titleAr: "سجل الاستلام",           accent: "#f97316" },
  { type: TYPES.coolers,             key: "coolers",   icon: "🌡️",    titleEn: "Coolers Temperatures", titleAr: "درجات حرارة البرادات",   accent: "#0284c7" },
];

const TABS = [
  { key: "overview", icon: "📊", label: "Overview",
    element: <BranchDashboard branchName="POS 6" branchNameAr="فرع POS 6" reportTypes={DASH_TYPES} accent="#0284c7" />
  },
  { key: "hygiene", icon: "🧑‍🔬", label: "Personal Hygiene",
    element: <POS6ReportView type={TYPES.personalHygiene} icon="🧑‍🔬"
      title="Personal Hygiene Checklist" titleAr="قائمة فحص النظافة الشخصية"
      columns={HYGIENE_COLUMNS} />
  },
  { key: "cleaning", icon: "🧹", label: "Cleaning Checklist",
    element: <POS6ReportView type={TYPES.cleaningChecklist} icon="🧹"
      title="Cleaning Checklist" titleAr="قائمة فحص النظافة"
      columns={CLEANING_COLUMNS} />
  },
  { key: "equipment", icon: "🧪", label: "Equipment Inspection",
    element: <POS6ReportView type={TYPES.equipmentInspection} icon="🧪"
      title="Equipment Inspection & Sanitizing" titleAr="فحص وتعقيم المعدات"
      columns={EQUIPMENT_COLUMNS}
      meta={(p) => [{ label: "Section", value: p.section }, { label: "Form ref.", value: p.formRef }]} />
  },
  { key: "receiving", icon: "📥", label: "Receiving Log",
    element: <POS6ReportView type={TYPES.receivingLog} icon="📥"
      title="Receiving Log" titleAr="سجل استلام البضائع"
      columns={RECEIVING_COLUMNS}
      meta={(p) => [{ label: "Form ref.", value: p.formRef }]} />
  },
  { key: "coolers", icon: "🌡️", label: "Coolers Temperatures",
    element: <POS6CoolersView />
  },
];

/* Its own component because the columns depend on the record being shown. */
function POS6CoolersView() {
  return (
    <POS6ReportView
      type={TYPES.coolers}
      icon="🌡️"
      title="Coolers Temperatures"
      titleAr="سجل درجات حرارة البرادات"
      columnsOf={coolerColumns}
      rows={coolerRows}
      meta={(p) => [
        { label: "Readings", value: p.summary?.readings },
        { label: "Out of range", value: p.summary?.out },
        { label: "Average °C", value: p.summary?.avg },
      ]}
    />
  );
}

export default function POS6ReportsView() {
  return (
    <BranchDailyView
      branchCode="POS-6"
      title="عرض تقارير<br/>الفرع"
      subtitle="Daily Viewer Hub"
      tabs={TABS}
      defaultTabKey="overview"
    />
  );
}
