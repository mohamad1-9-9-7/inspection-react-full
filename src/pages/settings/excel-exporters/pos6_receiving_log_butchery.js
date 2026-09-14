// POS 6 receiving log — every incoming delivery, in the viewer's column order.
//
// Supplier, invoice number, receiver and vehicle temperature belong to the
// delivery, not to the line, so the input asks them once and they are printed
// once, on the information line under the title — the same place the viewer
// shows them. Sheets filed before that change carry them on every row; those
// columns are added back only for such records, so an old backup still reads
// exactly as it was entered.
import { buildPos6Sheet, numbered, verdictWarn, S_NO } from "./_pos6";
import { formatDMY, rowsOf } from "./_lib";

const columns = [
  S_NO,
  { key: "itemCode",        label: "Item Code",        width: 12, align: "left" },
  { key: "foodItem",        label: "Food Item",        width: 22, align: "left" },
  { key: "netWeight",       label: "Net Weight (kg)",  width: 13 },
  { key: "foodTemp",        label: "Food °C",          width: 11 },
  { key: "vehicleClean",    label: "Vehicle clean",    width: 12 },
  { key: "handlerHygiene",  label: "Handler hygiene",  width: 13 },
  { key: "appearanceOK",    label: "Appearance",       width: 11 },
  { key: "firmnessOK",      label: "Firmness",         width: 11 },
  { key: "smellOK",         label: "Smell",            width: 10 },
  { key: "packagingGood",   label: "Packaging intact", width: 13 },
  { key: "countryOfOrigin", label: "Country of Origin", width: 16, align: "left" },
  // Stored ISO, read DD/MM/YYYY — same as the viewer and the input.
  { key: "productionDate",  label: "Production Date",  width: 13, get: (r) => formatDMY(r.productionDate) },
  { key: "expiryDate",      label: "Expiry Date",      width: 13, get: (r) => formatDMY(r.expiryDate) },
  { key: "remarks",         label: "Remarks",          width: 26, align: "left" },
];

/* Only for records that still hold these per row. */
const LEGACY_ROW_COLUMNS = [
  { key: "supplier",    label: "Supplier",    width: 22, align: "left" },
  { key: "vehicleTemp", label: "Vehicle °C",  width: 11 },
  { key: "invoiceNo",   label: "Invoice No.", width: 14 },
  { key: "receivedBy",  label: "Received by", width: 16, align: "left" },
];

const columnsFor = (p) => {
  const rows = p.entries || [];
  const legacy = LEGACY_ROW_COLUMNS.filter((c) =>
    rows.some((r) => String(r?.[c.key] ?? "").trim() !== "")
  );
  // The remarks column stays last, so the legacy ones slot in just before it.
  return [...columns.slice(0, -1), ...legacy, columns[columns.length - 1]];
};

const deliveryLine = (p) => {
  const parts = [
    p.supplier && `Supplier: ${p.supplier}`,
    p.invoiceNo && `Invoice no.: ${p.invoiceNo}`,
    p.receivedBy && `Received by: ${p.receivedBy}`,
    String(p.vehicleTemp ?? "").trim() !== "" && `Vehicle: ${p.vehicleTemp} °C`,
  ].filter(Boolean);
  return parts.join("   ·   ");
};

export default async function build(wb, record, ctx) {
  const p = record?.payload || {};

  return buildPos6Sheet(wb, record, ctx, {
    title: "Receiving Log",
    formRef: "FSMS/BR/F01A",
    // A string, not a function: an empty one must leave the row out entirely
    // rather than print a blank band under the title.
    subtitle: deliveryLine(p) || undefined,
    columns: columnsFor(p),
    getRows: (payload) => numbered(rowsOf(payload.entries)),
    cellWarn: verdictWarn,
  });
}
