import { buildPos19Sheet } from "./_pos19_base";

// Limits mirrored from the view (LIMITS in DryStoreTempHumidityView.jsx).
const TEMP_MAX_C = 25;
const HUMIDITY_MAX_PCT = 60;

const columns = [
  { key: "date",             label: "Date",              width: 12 },
  { key: "tempAM",           label: "8:00 AM — Temp °C", width: 14 },
  { key: "humidityAM",       label: "8:00 AM — Hum %",   width: 14 },
  { key: "tempPM",           label: "2:00 PM — Temp °C", width: 14 },
  { key: "humidityPM",       label: "2:00 PM — Hum %",   width: 14 },
  { key: "stacked",          label: "Stacked",           width: 10 },
  { key: "properLabel",      label: "Labelled",          width: 10 },
  { key: "clean",            label: "Clean",             width: 10 },
  { key: "correctiveAction", label: "Corrective Action", width: 22 },
  { key: "monitoredBy",      label: "Monitored By",      width: 16 },
];

export default async function build(wb, record, ctx) {
  return buildPos19Sheet(wb, record, ctx, {
    title: "Dry Store — Temp & Humidity Monitoring Record",
    formRef: "TELT/CK/QA/DR/1",
    subtitle: `Central Kitchen — Dry Storage Area  ·  Limits: ≤ ${TEMP_MAX_C}°C, ≤ ${HUMIDITY_MAX_PCT}% RH`,
    columns,
    cellWarn: ({ value, key }) => {
      const n = parseFloat(value);
      if (isNaN(n)) return;
      if ((key === "tempAM" || key === "tempPM") && n > TEMP_MAX_C) return "red";
      if ((key === "humidityAM" || key === "humidityPM") && n > HUMIDITY_MAX_PCT) return "red";
    },
  });
}
