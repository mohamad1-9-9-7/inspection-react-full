// POS 6 receiving log — every incoming delivery, in the viewer's column order.
import { buildPos6Sheet, numbered, verdictWarn, S_NO } from "./_pos6";

const columns = [
  S_NO,
  { key: "time",            label: "Time",             width: 10 },
  { key: "supplier",        label: "Supplier",         width: 22, align: "left" },
  { key: "foodItem",        label: "Food Item",        width: 22, align: "left" },
  { key: "netWeight",       label: "Net Weight (kg)",  width: 13 },
  { key: "vehicleTemp",     label: "Vehicle °C",       width: 11 },
  { key: "foodTemp",        label: "Food °C",          width: 11 },
  { key: "vehicleClean",    label: "Vehicle clean",    width: 12 },
  { key: "handlerHygiene",  label: "Handler hygiene",  width: 13 },
  { key: "appearanceOK",    label: "Appearance",       width: 11 },
  { key: "firmnessOK",      label: "Firmness",         width: 11 },
  { key: "smellOK",         label: "Smell",            width: 10 },
  { key: "packagingGood",   label: "Packaging intact", width: 13 },
  { key: "countryOfOrigin", label: "Country of Origin", width: 16, align: "left" },
  { key: "productionDate",  label: "Production Date",  width: 13 },
  { key: "expiryDate",      label: "Expiry Date",      width: 13 },
  { key: "invoiceNo",       label: "Invoice No.",      width: 14 },
  { key: "receivedBy",      label: "Received by",      width: 16, align: "left" },
  { key: "remarks",         label: "Remarks",          width: 26, align: "left" },
];

export default async function build(wb, record, ctx) {
  return buildPos6Sheet(wb, record, ctx, {
    title: "Receiving Log",
    formRef: "FSMS/BR/F01A",
    columns,
    getRows: (p) => numbered(p.entries || []),
    cellWarn: verdictWarn,
  });
}
