// src/pages/settings/excel-exporters/fsms_change_management_log_item.js
// FSMS Change Management Log (ISO 22000:2018 §6.3 / 7.x) — one sheet, all changes.
// Mirrors ChangeManagementLogView columns.

import { makeRegisterExporter, txtEN } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "FSMS Change Management Log",
  sort: (a, b) => new Date(b.date || 0) - new Date(a.date || 0),
  cols: [
    { label: "#",             width: 8,  get: (it) => it.logNo || "" },
    { label: "Date",          width: 13, get: (it) => formatDMY(it.date) },
    { label: "Description",   width: 40, align: "left", get: (it) => txtEN(it.description) },
    { label: "Reason",        width: 30, align: "left", get: (it) => txtEN(it.reason) },
    { label: "Impact",        width: 28, align: "left", get: (it) => txtEN(it.impact) },
    { label: "Approved By",   width: 20, align: "left", get: (it) => it.approvedBy || "" },
    { label: "Impl. Date",    width: 13, get: (it) => formatDMY(it.implementationDate) },
    { label: "Verification",  width: 26, align: "left", get: (it) => txtEN(it.verification) },
    { label: "Status",        width: 13, get: (it) => prettifyKey(it.status || "") },
  ],
});
