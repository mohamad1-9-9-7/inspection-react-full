// src/pages/settings/excel-exporters/fsms_food_defense_item.js
// Food Defense Plan — threat & vulnerability assessment register (FSMS-FD-01).
// Mirrors FoodDefenseView's register table; sorted by score (L×S) descending
// like the view default.

import { makeRegisterExporter, txtEN } from "./_register";
import { formatDMY } from "./_lib";
import { FD_AREAS, THREAT_CATEGORIES, FD_STATUS } from "../../haccp and iso/FoodDefense/foodDefenseData";

const score = (it) => (Number(it.likelihood) || 0) * (Number(it.severity) || 0);
const level = (s) => (s >= 20 ? "Critical" : s >= 13 ? "High" : s >= 6 ? "Medium" : "Low");
const areaEN = (v) => FD_AREAS.find((a) => a.v === v)?.en || v || "";
const catEN = (v) => THREAT_CATEGORIES.find((c) => c.v === v)?.en || v || "";
const statusEN = (v) => FD_STATUS.find((s) => s.v === v)?.en || v || "";

export default makeRegisterExporter({
  documentTitle: "Food Defense Plan — Threat & Vulnerability Assessment (TACCP/VACCP)",
  documentNo: "FSMS-FD-01",
  sort: (a, b) => score(b) - score(a),
  cols: [
    { label: "Area",              width: 24, align: "left", get: (it) => areaEN(it.area) },
    { label: "Threat Type",       width: 22, align: "left", get: (it) => catEN(it.category) },
    { label: "Threat",            width: 40, align: "left", get: (it) => txtEN(it.threat) },
    { label: "Likely Actor",      width: 22, align: "left", get: (it) => txtEN(it.actor) },
    { label: "L",                 width: 5,  get: (it) => it.likelihood ?? "" },
    { label: "S",                 width: 5,  get: (it) => it.severity ?? "" },
    { label: "Score",             width: 7,  get: (it) => score(it) || "" },
    { label: "Level",             width: 10, get: (it) => level(score(it)) },
    { label: "Existing Controls", width: 42, align: "left", get: (it) => txtEN(it.existing) },
    { label: "Additional Action", width: 38, align: "left", get: (it) => txtEN(it.action) },
    { label: "Owner",             width: 22, align: "left", get: (it) => it.owner || "" },
    { label: "Status",            width: 13, get: (it) => statusEN(it.status) },
    { label: "Next Review",       width: 13, get: (it) => formatDMY(it.reviewDate) },
  ],
});
