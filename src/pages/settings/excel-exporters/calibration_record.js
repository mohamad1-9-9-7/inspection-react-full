// src/pages/settings/excel-exporters/calibration_record.js
// External / Equipment Calibration Register — one sheet, all equipment records.
// Mirrors CalibrationView table; sorted by next-due ascending like the view.

import { makeRegisterExporter } from "./_register";
import { formatDMY } from "./_lib";

/* Derived status from next-due date (mirrors statusOfRec logic) */
function statusOf(it) {
  const next = it.nextDueDate;
  if (!next) return "";
  const days = Math.ceil((new Date(next) - new Date()) / 86400000);
  if (isNaN(days)) return "";
  if (days < 0) return "Overdue";
  if (days <= 30) return "Due Soon";
  return "OK";
}

export default makeRegisterExporter({
  documentTitle: "Equipment Calibration Register",
  sort: (a, b) =>
    new Date(a.nextDueDate || "9999-12-31") - new Date(b.nextDueDate || "9999-12-31"),
  cols: [
    { label: "Branch",           width: 14, get: (it) => it.branch || "" },
    { label: "Equipment ID",     width: 14, get: (it) => it.equipmentId || "" },
    { label: "Equipment Name",   width: 24, align: "left", get: (it) => it.equipmentName || "" },
    { label: "Type",             width: 14, get: (it) => it.equipmentType || "" },
    { label: "Serial",           width: 14, get: (it) => it.serialNumber || "" },
    { label: "Location",         width: 16, align: "left", get: (it) => it.location || "" },
    { label: "Manufacturer",     width: 16, get: (it) => it.manufacturer || "" },
    { label: "Range",            width: 12, get: (it) => it.range || "" },
    { label: "Accuracy",         width: 12, get: (it) => it.accuracy || "" },
    { label: "Last Calibration", width: 14, get: (it) => formatDMY(it.lastCalibrationDate) },
    { label: "Next Due",         width: 14, get: (it) => formatDMY(it.nextDueDate) },
    { label: "Interval (mo)",    width: 10, get: (it) => it.intervalMonths ?? "" },
    { label: "Method",           width: 18, align: "left", get: (it) => it.calibrationMethod || "" },
    { label: "Calibrated By",    width: 16, get: (it) => it.calibratedBy || "" },
    { label: "Cert No",          width: 14, get: (it) => it.calibrationCertNo || "" },
    { label: "Result",           width: 10, get: (it) => it.result || "" },
    { label: "Status",           width: 10, get: (it) => statusOf(it) },
    { label: "Notes",            width: 26, align: "left", get: (it) => it.notes || "" },
  ],
});
