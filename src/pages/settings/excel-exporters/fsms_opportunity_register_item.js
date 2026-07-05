// src/pages/settings/excel-exporters/fsms_opportunity_register_item.js
// FSMS Opportunity Register (ISO 22000:2018 §6.1) — one sheet, all opportunities.
// Mirrors OpportunityRegisterView columns.

import { makeRegisterExporter, txtEN } from "./_register";
import { prettifyKey } from "./_lib";

export default makeRegisterExporter({
  documentTitle: "FSMS Opportunity Register",
  cols: [
    { label: "Type",           width: 12, get: (it) => prettifyKey(it.source || "") },
    { label: "Factor",         width: 28, align: "left", get: (it) => txtEN(it.factor) },
    { label: "Impact",         width: 30, align: "left", get: (it) => txtEN(it.impact) },
    { label: "Opportunity",    width: 34, align: "left", get: (it) => txtEN(it.opportunity) },
    { label: "Actions",        width: 30, align: "left", get: (it) => txtEN(it.actions) },
    { label: "Responsibility", width: 20, align: "left", get: (it) => txtEN(it.responsibility) },
    { label: "Monitoring",     width: 26, align: "left", get: (it) => txtEN(it.monitoring) },
    { label: "Status",         width: 12, get: (it) => prettifyKey(it.status || "") },
  ],
});
