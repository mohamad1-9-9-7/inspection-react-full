// src/pages/settings/excel-exporters/fsms_risk_register_item.js
// FSMS Risk Register (ISO 22000:2018 §6.1) — one sheet, all risks as a table.
// Mirrors RiskRegisterView columns; sorted by score (L×S) descending like the view default.

import { makeRegisterExporter, txtEN } from "./_register";
import { formatDMY, prettifyKey } from "./_lib";

const score = (it) => (Number(it.likelihood) || 0) * (Number(it.severity) || 0);
const level = (s) => (s >= 20 ? "Critical" : s >= 13 ? "High" : s >= 6 ? "Medium" : "Low");

export default makeRegisterExporter({
  documentTitle: "FSMS Risk Register — FSMS-RA-01",
  documentNo: "FSMS-RA-01",
  sort: (a, b) => score(b) - score(a),
  cols: [
    { label: "Area",         width: 22, align: "left", get: (it) => it.area || "" },
    { label: "Category",     width: 16, get: (it) => prettifyKey(it.category || "") },
    { label: "Hazard / Risk", width: 34, align: "left", get: (it) => txtEN(it.hazard) },
    { label: "Consequence",  width: 30, align: "left", get: (it) => txtEN(it.consequence) },
    { label: "L",            width: 5,  get: (it) => it.likelihood ?? "" },
    { label: "S",            width: 5,  get: (it) => it.severity ?? "" },
    { label: "Score",        width: 7,  get: (it) => score(it) || "" },
    { label: "Level",        width: 10, get: (it) => level(score(it)) },
    { label: "Controls",     width: 40, align: "left", get: (it) => txtEN(it.controls) },
    { label: "Owner",        width: 20, align: "left", get: (it) => it.owner || "" },
    { label: "Next Review",  width: 13, get: (it) => formatDMY(it.reviewDate) },
  ],
});
