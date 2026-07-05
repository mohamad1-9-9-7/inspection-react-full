// src/pages/settings/excel-exporters/training_certificate.js
// External training certificates register (BFS / PIC / EFST) — one sheet, all certs.
// Mirrors src/pages/BFS PIC EFST/TrainingCertificatesView.jsx (each record = one cert).

import { makeRegisterExporter } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "Training Certificates Register (BFS / PIC / EFST)",
  sort: (a, b) => new Date(b.issueDate || 0) - new Date(a.issueDate || 0),
  cols: [
    { label: "Employee No.", width: 14, get: (it) => it.employeeNo || "" },
    { label: "Name",         width: 24, align: "left", get: (it) => it.name || "" },
    { label: "Nationality",  width: 14, get: (it) => it.nationality || "" },
    { label: "Job",          width: 18, align: "left", get: (it) => it.job || "" },
    { label: "Branch",       width: 16, get: (it) => it.branch || "" },
    { label: "Course",       width: 22, align: "left", get: (it) => it.customCourseName || prettifyKey(it.courseType || "") },
    { label: "Issue Date",   width: 14, get: (it) => formatDMY(it.issueDate) },
    { label: "Expiry Date",  width: 14, get: (it) => formatDMY(it.expiryDate) },
  ],
});
