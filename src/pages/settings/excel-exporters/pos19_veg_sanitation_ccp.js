import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "date",             label: "Date",                    width: 12 },
  { key: "time",             label: "Time",                    width: 10 },
  { key: "productDetails",   label: "RM / Product Details",    width: 24 },
  { key: "quantitySanitized", label: "Quantity Sanitized",     width: 15 },
  { key: "contactTime",      label: "Contact Time",            width: 13 },
  { key: "peratekConc",      label: "Conc. Peratek (ppm)",     width: 16 },
  { key: "remarks",          label: "Remarks / CA",            width: 22 },
  { key: "verifiedBy",       label: "Verified By / Signature", width: 18 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Sanitation Record (CCP) — Vegetables / Fruits",
    formRef: "TELT/CK/QA/SR/1",
    subtitle: "Required Peratek concentration: 60–80 ppm",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "peratekConc") return;
      const n = parseFloat(value);
      if (isNaN(n)) return;
      return n < 60 || n > 80 ? "red" : "green";
    },
  });
}
