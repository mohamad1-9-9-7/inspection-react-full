import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "productName",      label: "Product Name",      width: 22 },
  { key: "customerName",     label: "Customer Name",     width: 20 },
  { key: "time",             label: "Time",              width: 10 },
  { key: "productionDate",   label: "Production Date",   width: 14 },
  { key: "expDate",          label: "Exp Date",          width: 14 },
  { key: "temp",             label: "Temp (°C)",         width: 11 },
  { key: "quantity",         label: "Quantity",          width: 11 },
  { key: "overallCondition", label: "Overall Condition", width: 17 },
  { key: "remarks",          label: "Remarks",           width: 24 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Finished Product Monitoring Checklist",
    formRef: "TELT/QA/FP/1",
    subtitle: "Al Mawashi Braai",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "overallCondition") return;
      const v = String(value || "").trim().toLowerCase();
      if (v === "not acceptable") return "red";
      if (v === "acceptable") return "green";
    },
  });
}
