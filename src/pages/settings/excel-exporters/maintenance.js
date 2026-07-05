// src/pages/settings/excel-exporters/maintenance.js
// Maintenance Requests register — one sheet, all requests.
// Mirrors the Maintenance module list (each record = one request).

import { makeRegisterExporter } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

/* problems[] is a list of issue objects/strings — join to a readable summary */
function problemsText(it) {
  const arr = Array.isArray(it.problems) ? it.problems : [];
  if (arr.length) {
    return arr
      .map((x) => (typeof x === "string" ? x : (x?.description || x?.title || x?.issueType || "")))
      .filter(Boolean)
      .join("\n");
  }
  return it.description || it.title || "";
}

export default makeRegisterExporter({
  documentTitle: "Maintenance Requests Register",
  sort: (a, b) => new Date(b.reportDate || b.requestDate || 0) - new Date(a.reportDate || a.requestDate || 0),
  cols: [
    { label: "Request No.",  width: 14, get: (it) => it.requestNo || "" },
    { label: "Date",         width: 13, get: (it) => formatDMY(it.reportDate || it.requestDate) },
    { label: "Branch",       width: 16, get: (it) => it.branch || "" },
    { label: "Applicant",    width: 18, align: "left", get: (it) => it.applicant || it.reporter || "" },
    { label: "Priority",     width: 11, get: (it) => prettifyKey(it.priority || "") },
    { label: "Problem / Description", width: 36, align: "left", get: problemsText },
    { label: "Issue Type",   width: 14, get: (it) => it.issueType || "" },
    { label: "Status",       width: 14, get: (it) => it.status || "" },
    { label: "Technician",   width: 16, align: "left", get: (it) => it.technician || "" },
    { label: "Workshop",     width: 16, align: "left", get: (it) => it.workshop || "" },
    { label: "Total Cost",   width: 12, get: (it) => it.totalCost || "" },
    { label: "Completion Note", width: 26, align: "left", get: (it) => it.completionNote || "" },
  ],
});
