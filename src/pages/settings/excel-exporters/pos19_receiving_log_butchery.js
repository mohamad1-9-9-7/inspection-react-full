import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",            label: "Date",            width: 12 },
  { key: "supplier",        label: "Supplier",        width: 22 },
  { key: "product",         label: "Product",         width: 22 },
  { key: "quantity",        label: "Qty",             width: 10 },
  { key: "unit",            label: "Unit",            width: 8  },
  { key: "brand",           label: "Brand",           width: 14 },
  { key: "invoiceNo",       label: "Invoice No",      width: 12 },
  { key: "productionDate",  label: "Prod. Date",      width: 12 },
  { key: "expiryDate",      label: "Exp. Date",       width: 12 },
  { key: "temperature",     label: "Temp °C",         width: 10 },
  { key: "vehicleCondition",label: "Vehicle Cond.",   width: 14 },
  { key: "result",          label: "Result",          width: 12 },
  { key: "remarks",         label: "Remarks",         width: 22 },
  { key: "checkedBy",       label: "Checked by",      width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Receiving Log — Butchery",
    formRef: "FS-HACCP/POS19/RL/03",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "result") return;
      const s = String(value || "").toLowerCase();
      if (/pass|accept|ok/.test(s)) return "green";
      if (/reject|fail/.test(s))     return "red";
    },
  });
}
