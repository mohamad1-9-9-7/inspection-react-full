import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",             label: "Date",             width: 12 },
  { key: "rawName",          label: "Raw Name",         width: 22 },
  { key: "supplier",         label: "Supplier",         width: 18 },
  { key: "productionDate",   label: "Production Date",  width: 14 },
  { key: "expiryDate",       label: "Expiry Date",      width: 14 },
  { key: "finalProduct",     label: "Final Product",    width: 22 },
  { key: "finalProdDate",    label: "Final Prod. Date", width: 14 },
  { key: "finalExpDate",     label: "Final Exp. Date",  width: 14 },
  { key: "storageLocation",  label: "Storage Location", width: 16 },
  { key: "disposalReason",   label: "Disposal Reason",  width: 18 },
  { key: "checkedBy",        label: "Checked by",       width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Traceability Log",
    formRef: "FS-HACCP/POS19/TRC/13",
    columns,
  });
}
