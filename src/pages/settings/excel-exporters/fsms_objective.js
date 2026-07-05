// src/pages/settings/excel-exporters/fsms_objective.js
// FSMS Objectives (ISO 22000:2018 §6.2) — one sheet, all objectives with progress.
// Mirrors ObjectivesView fields; sorted by start date descending like the view.

import { makeRegisterExporter, txtEN } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

/* Same progress formula as ObjectivesView.calcProgress */
function progressPct(target, current, direction) {
  const t = parseFloat(target);
  const c = parseFloat(current);
  if (isNaN(t) || isNaN(c) || t === 0) return "";
  if (direction === "lower") return c <= t ? "100%" : `${Math.max(0, 100 - ((c - t) / t) * 100).toFixed(0)}%`;
  return `${Math.min(150, (c / t) * 100).toFixed(0)}%`;
}

export default makeRegisterExporter({
  documentTitle: "FSMS Objectives",
  sort: (a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0),
  cols: [
    { label: "Objective",     width: 34, align: "left", get: (it) => txtEN(it.name) },
    { label: "Category",      width: 16, get: (it) => prettifyKey(it.category || "") },
    { label: "Owner",         width: 18, align: "left", get: (it) => it.owner || "" },
    { label: "Frequency",     width: 12, get: (it) => it.frequency || "" },
    { label: "Linked Clause", width: 14, get: (it) => it.linkedClause || "" },
    { label: "Target",        width: 14, get: (it) => it.target ?? "" },
    { label: "Current",       width: 12, get: (it) => it.currentValue ?? "" },
    { label: "Unit",          width: 10, get: (it) => it.unit || "" },
    { label: "Direction",     width: 10, get: (it) => prettifyKey(it.direction || "") },
    { label: "Progress",      width: 10, get: (it) => progressPct(it.target, it.currentValue, it.direction) },
    { label: "Status",        width: 12, get: (it) => prettifyKey(it.status || "") },
    { label: "Start",         width: 12, get: (it) => formatDMY(it.startDate) },
    { label: "End",           width: 12, get: (it) => formatDMY(it.endDate) },
    { label: "Method",        width: 28, align: "left", get: (it) => txtEN(it.method) },
    { label: "Notes",         width: 28, align: "left", get: (it) => txtEN(it.notes) },
  ],
});
