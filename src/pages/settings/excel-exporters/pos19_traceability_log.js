import { buildPos19Sheet } from "./_pos19_base";

/* "22000 · NAME" — the item code glued to its product name. */
const codedName = (code, name) => {
  const c = String(code ?? "").trim();
  const n = String(name ?? "").trim();
  return c && n ? `${c} · ${n}` : c || n || "";
};

const columns = [
  { key: "date",             label: "Date",             width: 12 },
  { key: "batchId",          label: "Batch / Lot",      width: 18 },
  // The item code travels glued to its name, matching the branch view.
  { key: "rawName",          label: "Raw Name",         width: 28, get: (r) => codedName(r.rawCode, r.rawName) },
  { key: "supplier",         label: "Supplier",         width: 18 },
  { key: "productionDate",   label: "Production Date",  width: 14, get: (r) => r.productionDate ?? r.origProdDate },
  { key: "expiryDate",       label: "Expiry Date",      width: 14, get: (r) => r.expiryDate ?? r.origExpDate },
  { key: "finalProduct",     label: "Final Product",    width: 28, get: (r) => codedName(r.finalCode, r.finalProduct ?? r.finalName) },
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
