// src/pages/monitor/branches/pos6/POS6ReportsView.jsx
// POS 6 — daily viewer hub, opened from the Admin branch tile.
// Column specs live here; POS6ReportView does the fetching and drawing.

import React from "react";
import BranchDailyView from "../_shared/BranchDailyView";
import BranchDashboard from "../_shared/BranchDashboard";
import POS6ReportView, { Reading } from "./POS6ReportView";
import { DOCS, EQUIPMENT_SLOTS, TYPES, equipmentSlotLabel } from "./pos6Api";
import { RANGES, isOutOfRange, readingVerdict } from "./pos6CoolerRanges";

/* Every sheet shows the document number its paper form carries, so a record in
   the archive names the controlled document it belongs to — the same way the
   input screen's header does. `payload.documentNo` is what the record itself
   was filed under; DOCS is the fallback for the sheets saved before the number
   travelled with the payload, and `formRef` is the branch's own edit of it on
   the two sheets that allow one. */
const docMeta = (p, isAr, type) => ({
  label: isAr ? "رقم الوثيقة" : "Document no.",
  value: p.documentNo || p.formRef || DOCS[type]?.documentNo || "",
});

/* Columns of the personal-hygiene sheet, in the order they are filled. */
const HYGIENE_COLUMNS = [
  // Filled from Settings → Staff Directory, so the number is the record — older
  // sheets predate the column and simply show a dash.
  { key: "empNo", label: "Emp. No", labelAr: "الرقم الوظيفي" },
  { key: "name", label: "Name", labelAr: "الاسم" },
  { key: "job", label: "Job title", labelAr: "المسمى الوظيفي" },
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

/* The marks each sheet actually writes, so an edited cell can only be set to
   a value its own input screen offers. */
const YES_NO = ["Yes", "No"];
const TICK_CROSS = ["√", "✗"];

const EQUIPMENT_COLUMNS = [
  { key: "equipment", label: "Equipment / utensils", labelAr: "المعدات والأدوات" },
  { key: "freeFromDamage", label: "Free from damage", labelAr: "خالية من التلف", kind: "verdict", options: YES_NO },
  { key: "freeFromBrokenPieces", label: "Free from broken pieces", labelAr: "خالية من الكسر", kind: "verdict", options: YES_NO },
  ...EQUIPMENT_SLOTS.map((s) => ({ key: s.key, label: s.label, kind: "verdict", options: TICK_CROSS })),
  { key: "correctiveAction", label: "Corrective action", labelAr: "الإجراء التصحيحي" },
  { key: "checkedByRow", label: "Checked by", labelAr: "فحص بواسطة" },
];

/* The sheet stores the rounds it was filled with, so the table is built from
   the record rather than from today's list: a record filed when POS 6 ran four
   rounds keeps showing four, and a round added later does not appear as an
   empty column on every old sheet. Records saved before `slots` travelled fall
   back to the standard five. */
const equipmentColumns = (payload) => {
  const slots = Array.isArray(payload.slots) && payload.slots.length
    ? payload.slots
    : EQUIPMENT_SLOTS.map((s) => s.key);
  const head = EQUIPMENT_COLUMNS.slice(0, 3); // equipment + the two condition columns
  const tail = EQUIPMENT_COLUMNS.slice(-2);   // corrective action + checked by
  return [
    ...head,
    ...slots.map((k) => ({ key: k, label: equipmentSlotLabel(k), kind: "verdict", options: TICK_CROSS })),
    ...tail,
  ];
};

const RECEIVING_COLUMNS = [
  { key: "itemCode", label: "Item code", labelAr: "كود الصنف" },
  { key: "foodItem", label: "Food item", labelAr: "الصنف" },
  { key: "netWeight", label: "Net weight", labelAr: "الوزن الصافي" },
  { key: "foodTemp", label: "Food °C", labelAr: "حرارة المنتج" },
  { key: "vehicleClean", label: "Vehicle clean", labelAr: "نظافة السيارة", kind: "verdict" },
  { key: "handlerHygiene", label: "Handler hygiene", labelAr: "نظافة المناول", kind: "verdict" },
  { key: "appearanceOK", label: "Appearance", labelAr: "المظهر", kind: "verdict" },
  { key: "firmnessOK", label: "Firmness", labelAr: "القوام", kind: "verdict" },
  { key: "smellOK", label: "Smell", labelAr: "الرائحة", kind: "verdict" },
  { key: "packagingGood", label: "Packaging", labelAr: "التغليف", kind: "verdict" },
  { key: "countryOfOrigin", label: "Origin", labelAr: "المنشأ" },
  { key: "productionDate", label: "Production", labelAr: "الإنتاج", kind: "date" },
  { key: "expiryDate", label: "Expiry", labelAr: "الصلاحية", kind: "date" },
  { key: "remarks", label: "Remarks", labelAr: "ملاحظات" },
];

/* Supplier, invoice, receiver and vehicle temperature are one per delivery, so
   the input asks them once and they show as meta cards above the table. Sheets
   filed before that change carry them on every row — those columns are put back
   only for the records that actually hold them, so an old backup still reads
   exactly as it was entered. */
const RECEIVING_ROW_LEVEL_LEGACY = [
  { key: "supplier", label: "Supplier", labelAr: "المورّد" },
  { key: "vehicleTemp", label: "Vehicle °C", labelAr: "حرارة السيارة" },
  { key: "invoiceNo", label: "Invoice no.", labelAr: "رقم الفاتورة" },
  { key: "receivedBy", label: "Received by", labelAr: "استلمها" },
];

const receivingColumns = (payload) => {
  const rows = payload.entries || [];
  const legacy = RECEIVING_ROW_LEVEL_LEGACY.filter((c) =>
    rows.some((r) => String(r?.[c.key] ?? "").trim() !== "")
  );
  // Remarks stays the last column, so the legacy ones slot in just before it.
  const head = RECEIVING_COLUMNS.slice(0, -1);
  const tail = RECEIVING_COLUMNS[RECEIVING_COLUMNS.length - 1];
  return [...head, ...legacy, tail];
};

const receivingMeta = (p, isAr) => {
  const cards = [docMeta(p, isAr, TYPES.receivingLog)];
  const delivery = [
    { label: isAr ? "المورّد" : "Supplier", value: p.supplier },
    { label: isAr ? "رقم الفاتورة" : "Invoice no.", value: p.invoiceNo },
    { label: isAr ? "استلمها" : "Received by", value: p.receivedBy },
    { label: isAr ? "حرارة السيارة" : "Vehicle °C", value: p.vehicleTemp },
  ].filter((m) => String(m.value ?? "").trim() !== "");
  return [...cards, ...delivery];
};

/* The coolers sheet has a column per time slot, and the branch chooses those,
   so the shape is read back off the record rather than declared up front. */
const coolerColumns = (payload) => [
  // Derived from the unit's `kind`, not stored — editing it would write a
  // label nothing reads back, so it stays out of edit mode.
  { key: "kindLabel", label: "Type", labelAr: "النوع", readOnly: true },
  { key: "name", label: "Unit", labelAr: "الوحدة" },
  // Each reading is judged against its own unit's range, so the viewer shows
  // the same red the branch saw while filling the sheet.
  ...(payload.slots || []).map((s) => ({
    key: `slot_${s}`,
    label: s,
    render: (v, row) => <Reading value={v} ok={readingVerdict(row.kind, v)} />,
  })),
  { key: "remarks", label: "Remarks", labelAr: "ملاحظات" },
];

const coolerRows = (payload) =>
  (payload.units || []).map((u) => {
    const row = {
      kind: u.kind,
      kindLabel: u.kind === "freezer" ? "Freezer" : "Chiller",
      name: u.name,
      remarks: u.remarks,
    };
    (payload.slots || []).forEach((s) => { row[`slot_${s}`] = u.temps?.[s] ?? ""; });
    return row;
  });

/* A cooler row is assembled from a unit and its temps map, so a corrected cell
   has to be taken apart again to land where the sheet actually keeps it. The
   summary is recomputed from the edited readings — leaving the stored one would
   have the meta cards claim an out-of-range count the table no longer shows. */
const coolerWriteBack = (payload, rowIndex, key, value) => {
  const units = [...(payload.units || [])];
  const unit = { ...units[rowIndex] };
  if (key.startsWith("slot_")) {
    unit.temps = { ...(unit.temps || {}), [key.slice(5)]: value };
  } else if (key === "name" || key === "remarks") {
    unit[key] = value;
  } else {
    return payload;
  }
  units[rowIndex] = unit;

  let readings = 0, out = 0, sum = 0;
  units.forEach((u) => {
    (payload.slots || []).forEach((s) => {
      const raw = u.temps?.[s];
      const n = Number(raw);
      if (raw === "" || raw === undefined || raw === null || Number.isNaN(n)) return;
      readings += 1;
      sum += n;
      if (isOutOfRange(u.kind, raw)) out += 1;
    });
  });

  return {
    ...payload,
    units,
    summary: { readings, out, avg: readings ? (sum / readings).toFixed(1) : "—" },
  };
};

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
      columns={HYGIENE_COLUMNS}
      meta={(p, isAr) => [docMeta(p, isAr, TYPES.personalHygiene)]} />
  },
  { key: "cleaning", icon: "🧹", label: "Cleaning Checklist",
    element: <POS6ReportView type={TYPES.cleaningChecklist} icon="🧹"
      title="Cleaning Checklist" titleAr="قائمة فحص النظافة"
      columns={CLEANING_COLUMNS}
      meta={(p, isAr) => [docMeta(p, isAr, TYPES.cleaningChecklist)]} />
  },
  { key: "equipment", icon: "🧪", label: "Equipment Inspection",
    element: <POS6ReportView type={TYPES.equipmentInspection} icon="🧪"
      title="Equipment Inspection & Sanitizing" titleAr="فحص وتعقيم المعدات"
      columnsOf={equipmentColumns}
      meta={(p, isAr) => [
        docMeta(p, isAr, TYPES.equipmentInspection),
        { label: isAr ? "القسم" : "Section", value: p.section },
      ]} />
  },
  { key: "receiving", icon: "📥", label: "Receiving Log",
    element: <POS6ReportView type={TYPES.receivingLog} icon="📥"
      title="Receiving Log" titleAr="سجل استلام البضائع"
      columnsOf={receivingColumns}
      meta={receivingMeta} />
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
      writeBack={coolerWriteBack}
      meta={(p, isAr) => [
        docMeta(p, isAr, TYPES.coolers),
        { label: isAr ? "القراءات" : "Readings", value: p.summary?.readings },
        { label: isAr ? "خارج المدى" : "Out of range", value: p.summary?.out },
        { label: isAr ? "المتوسط °م" : "Average °C", value: p.summary?.avg },
        { label: isAr ? "براد" : "Chiller", value: RANGES.chiller.label },
        { label: isAr ? "مجمّد" : "Freezer", value: RANGES.freezer.label },
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
      // Each panel prints the record on screen, with its own date and
      // document number — the generic header button would print the page with
      // neither.
      showPrint={false}
      defaultTabKey="overview"
    />
  );
}
