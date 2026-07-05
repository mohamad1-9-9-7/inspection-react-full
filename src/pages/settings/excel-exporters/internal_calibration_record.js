// src/pages/settings/excel-exporters/internal_calibration_record.js
// Internal Calibration Log (ice-point / boiling / master-probe) — one sheet.
// Mirrors InternalCalibrationView CSV columns.

import { makeRegisterExporter } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "Internal Calibration Log",
  sort: (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
  cols: [
    { label: "Date",           width: 13, get: (it) => formatDMY(it.date) },
    { label: "Time",           width: 9,  get: (it) => it.time || "" },
    { label: "Branch",         width: 14, get: (it) => it.branch || "" },
    { label: "Equipment ID",   width: 14, get: (it) => it.equipmentId || "" },
    { label: "Equipment Name", width: 22, align: "left", get: (it) => it.equipmentName || "" },
    { label: "Type",           width: 14, get: (it) => it.equipmentType || "" },
    { label: "Serial",         width: 14, get: (it) => it.serialNumber || "" },
    { label: "Method",         width: 16, get: (it) => prettifyKey(it.method || "") },
    { label: "Reference",      width: 11, get: (it) => it.referenceValue ?? "" },
    { label: "Reading",        width: 11, get: (it) => it.actualReading ?? "" },
    { label: "Tolerance",      width: 11, get: (it) => it.tolerance ?? "" },
    { label: "Unit",           width: 8,  get: (it) => it.unit || "" },
    { label: "Result",         width: 10, get: (it) => it.result || "" },
    { label: "Action Taken",   width: 22, align: "left", get: (it) => it.actionTaken || "" },
    { label: "Performed By",   width: 16, get: (it) => it.performedBy || "" },
    { label: "Notes",          width: 24, align: "left", get: (it) => it.notes || "" },
  ],
});
