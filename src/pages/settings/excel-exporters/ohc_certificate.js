// src/pages/settings/excel-exporters/ohc_certificate.js
// Occupational Health Card (OHC) register — one sheet, all certificates.
// Mirrors src/pages/ohc/OHCView.jsx (list of health cards, each record = one card).

import { makeRegisterExporter } from "./_register";
import { formatDMY } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "Occupational Health Card (OHC) Register",
  sort: (a, b) => new Date(a.expiryDate || "9999-12-31") - new Date(b.expiryDate || "9999-12-31"),
  cols: [
    { label: "Employee No.", width: 14, get: (it) => it.appNo || "" },
    { label: "Name",         width: 26, align: "left", get: (it) => it.name || "" },
    { label: "Nationality",  width: 16, get: (it) => it.nationality || "" },
    { label: "Job",          width: 18, align: "left", get: (it) => it.job || "" },
    { label: "Branch",       width: 18, get: (it) => it.branch || "" },
    { label: "Result",       width: 10, get: (it) => it.result || "" },
    { label: "Expiry Date",  width: 14, get: (it) => formatDMY(it.expiryDate) },
  ],
});
