import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "cycleType",        label: "Cycle Type",        width: 14 },
  { key: "productName",      label: "Product",           width: 20 },
  { key: "batchNo",          label: "Batch No",          width: 12 },
  { key: "quantity",         label: "Qty",               width: 9 },
  { key: "startTime",        label: "Start",             width: 10 },
  { key: "startTemp",        label: "Start °C",          width: 10 },
  { key: "endTime",          label: "End",               width: 10 },
  { key: "endTemp",          label: "End °C",            width: 10 },
  { key: "totalMinutes",     label: "Min",               width: 9 },
  { key: "cabinetTemp",      label: "Cab °C",            width: 10 },
  { key: "equipmentId",      label: "Equip ID",          width: 12 },
  { key: "ccpMet",           label: "CCP",               width: 8 },
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
  { key: "operator",         label: "Operator",          width: 14 },
  { key: "verifiedBy",       label: "Verified By",       width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Blast Freezer / Chiller Monitoring Log (CCP)",
    formRef: "TELT/CK/QA/BF/1",
    subtitle: "HACCP-compliant rapid chilling / freezing record",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "ccpMet") return;
      const v = String(value || "").trim().toLowerCase();
      if (v === "no") return "red";
      if (v === "yes") return "green";
    },
  });
}
