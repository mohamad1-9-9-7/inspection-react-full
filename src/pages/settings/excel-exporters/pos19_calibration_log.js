import { buildPos19Sheet } from "./_pos19_base";

const columns = [
  { key: "thermometerId",     label: "Thermometer ID",   width: 16 },
  { key: "type",              label: "Type",             width: 14 },
  { key: "testMethod",        label: "Test Method",      width: 16 },
  { key: "refTemp",           label: "Ref. °C",          width: 10 },
  { key: "readingTemp",       label: "Reading °C",       width: 12 },
  { key: "status",            label: "Status",           width: 10 },
  { key: "correctiveAction",  label: "Corrective Action", width: 22 },
  { key: "calibratedBy",      label: "Calibrated by",    width: 16 },
  { key: "nextDue",           label: "Next Due",         width: 14 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Thermometer Calibration Log",
    formRef: "FS-HACCP/POS19/CAL/12",
    columns,
    cellWarn: ({ value, key }) => {
      if (key !== "status") return;
      const s = String(value || "").toLowerCase();
      if (/pass|ok|good/i.test(s))  return "green";
      if (/fail|bad|reject/i.test(s)) return "red";
    },
  });
}
